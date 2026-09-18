"""
Stage Gates — one place that answers "does this stage already exist?"
====================================================================
The pipeline's resume rule, stated once:

    category exists?   -> skip   | else generate from CloakBrowser
    element exists?    -> skip   | else generate from CloakBrowser
    ideas exist?       -> skip   | else generate from CloakBrowser
    escalation exists? -> skip   | else generate from CloakBrowser
    SEO exists?        -> skip   | else generate from CloakBrowser
    package exists?    -> skip   | else copy from SQLite (NO regeneration)

Every stage answers the same shape of question, so the pipeline can be killed at
any point and resume at exactly the stage that is missing.

WHY THIS MODULE IS READ-ONLY
----------------------------
These are predicates, not actions. Nothing here writes to the DB, touches the
network, opens a browser or creates a folder. That keeps the "what is missing?"
question free of side effects, so it is safe to call from a report, a CSV export,
a loop condition, or a test.

    from stage_gates import stage_report, next_missing_stage
    stage_report(34)          # -> full per-stage dict for idea 34
    next_missing_stage(34)    # -> "seo"  (the stage a worker should do next)

THE ONE BEHAVIOUR CHANGE THAT MATTERS
-------------------------------------
`has_seo()` treats the hardcoded boilerplate as **MISSING**. Before this module,
`sync_and_get_youtube_metadata_from_sqlite()` returned any existing row, so all 35
boilerplate rows looked "done" forever and real SEO could never be generated. The
boilerplate test is not re-implemented here — it reuses
`seo_engine.validators.is_legacy_fallback()`, which is already the detector
`seo_engine.pipeline.find_fallback_metadata_ideas()` relies on.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

OUTPUT_PACKAGED_DIR = BASE_DIR / "output_packaged"

# The 3 files a finished package folder must hold.
#
# BOTH naming conventions are accepted. pipeline_packager.py has always written
# `prompt_info.json` + `youtube_metadata.json` (plus two prefixed duplicates named
# `<elem>.<idx>.Level_10_Prompt.json` / `..._YouTube_Metadata.json`). The shorter
# `prompt.json` / `youtube_seo.json` names are the preferred forward-looking spelling.
# Accepting both means this gate reports the truth about the 34 folders already on
# disk without requiring pipeline_packager.py to be touched or those folders renamed.
PACKAGE_PROMPT_JSON = "prompt.json"          # preferred spelling (kept for callers)
PACKAGE_SEO_JSON = "youtube_seo.json"        # preferred spelling (kept for callers)

PROMPT_JSON_NAMES = ("prompt.json", "prompt_info.json")
SEO_JSON_NAMES = ("youtube_seo.json", "youtube_metadata.json")

# The prefixed duplicates the packager also writes. Recognised so they are not
# reported as unexpected junk in `extra_files`.
_LEGACY_PREFIXED_SUFFIXES = (".Level_10_Prompt.json", ".Level_10_YouTube_Metadata.json")


def _first_present(folder: Path, names: tuple) -> Path | None:
    """First of `names` that exists in `folder` with non-zero size, else None."""
    for n in names:
        f = folder / n
        if f.exists() and f.stat().st_size > 0:
            return f
    return None
MIN_REAL_VIDEO_BYTES = 10240        # same threshold the packager uses for "real mp4"

# A prompt shorter than this is treated as blank/placeholder, matching the existing
# check inside get_or_create_next_production_ready_prompt().
MIN_PROMPT_CHARS = 50
REQUIRED_PROMPT_COUNT = 10          # 10 video prompts (or legacy 20 with 10 img + 10 vid)

STAGE_ORDER = ["category", "element", "ideas", "escalation", "seo", "video", "package"]


# ---------------------------------------------------------------------------
# Stage 1-3: category / element / ideas
# ---------------------------------------------------------------------------
def has_category() -> bool:
    """True if at least one category row exists."""
    from sqlmodel import select
    from database.session import get_session
    from database.models import Category
    with get_session() as session:
        return session.exec(select(Category)).first() is not None


def has_element(element_id: int) -> bool:
    from sqlmodel import select
    from database.session import get_session
    from database.models import Element
    with get_session() as session:
        return session.exec(select(Element).where(Element.id == element_id)).first() is not None


def has_ideas(element_id: int, target: int = 10) -> bool:
    """True if this element already has its full complement of linked ideas."""
    from sqlmodel import select
    from database.session import get_session
    from database.models import IdeaElement
    with get_session() as session:
        links = session.exec(select(IdeaElement).where(IdeaElement.element_id == element_id)).all()
        return len(links) >= target


def idea_count(element_id: int) -> int:
    from sqlmodel import select
    from database.session import get_session
    from database.models import IdeaElement
    with get_session() as session:
        return len(session.exec(select(IdeaElement).where(IdeaElement.element_id == element_id)).all())


# ---------------------------------------------------------------------------
# Stage 4: escalation (the 10-level video prompt set)
# ---------------------------------------------------------------------------
def escalation_detail(idea_id: int) -> dict:
    """
    Full picture of an idea's escalation, so callers can log *why* a gate failed
    instead of just seeing False.
    """
    from sqlmodel import select
    from database.session import get_session
    from database.models import Prompt

    with get_session() as session:
        prompts = session.exec(select(Prompt).where(Prompt.idea_id == idea_id)).all()

        filled = [p for p in prompts
                  if p.prompt_text and len(p.prompt_text.strip()) > MIN_PROMPT_CHARS]
        levels_present = sorted({p.level for p in filled if p.level})
        video_levels = sorted({p.level for p in filled if p.level and p.generation_type == "video"})

        lvl10_vid = next((p for p in filled
                          if p.level == 10 and p.generation_type == "video"), None)
        lvl10_img = next((p for p in filled
                          if p.level == 10 and p.generation_type == "image"), None)

        missing_video_levels = [n for n in range(1, 11) if n not in video_levels]

        return {
            "total": len(prompts),
            "filled": len(filled),
            "required": REQUIRED_PROMPT_COUNT,
            "levels_present": levels_present,
            "video_levels": video_levels,
            "missing_levels": missing_video_levels,
            "has_level_10_video": lvl10_vid is not None,
            "has_level_10_image": lvl10_img is not None,
            "level_10_video_id": lvl10_vid.id if lvl10_vid else None,
        }


def has_escalation(idea_id: int) -> bool:
    """
    True only if the idea holds a complete, genuinely filled 10-level video escalation.
    Deliberately validates all 10 video levels (1-10) and a usable level-10 video prompt.
    100% backward-compatible with legacy 20-prompt sets and new 10-video prompt sets.
    """
    d = escalation_detail(idea_id)
    return len(d["missing_levels"]) == 0 and d["has_level_10_video"]


# ---------------------------------------------------------------------------
# Stage 5: SEO
# ---------------------------------------------------------------------------
def seo_detail(idea_id: int) -> dict:
    """
    Report the SEO row's real usability. `is_fallback=True` means the row exists but
    holds the hardcoded boilerplate — which counts as MISSING, not done.
    """
    from sqlmodel import select
    from database.session import get_session
    from database.models import YouTubeMetadata
    from seo_engine import validators

    with get_session() as session:
        row = session.exec(
            select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)
        ).first()

        if not row:
            return {"exists": False, "is_fallback": False, "usable": False,
                    "title": "", "tag_count": 0, "reason": "no youtube_metadata row"}

        try:
            tags = json.loads(row.tags) if row.tags else []
        except Exception:
            tags = [t.strip() for t in (row.tags or "").split(",") if t.strip()]

        is_fb = validators.is_legacy_fallback(row.title, row.seo_description, tags)
        has_body = bool((row.seo_description or "").strip())

        return {
            "exists": True,
            "is_fallback": is_fb,
            "usable": (not is_fb) and has_body,
            "title": row.title or "",
            "tag_count": len(tags),
            "reason": ("hardcoded boilerplate — needs real SEO" if is_fb
                       else "empty description" if not has_body
                       else "ok"),
        }


def has_seo(idea_id: int) -> bool:
    """True only for real SEO. Boilerplate rows return False so they get regenerated."""
    return seo_detail(idea_id)["usable"]


# ---------------------------------------------------------------------------
# Stage 6-7: video + package folder
# ---------------------------------------------------------------------------
def package_folder_for(idea_id: int) -> Path | None:
    """
    Resolve an idea's package folder without creating anything. Reuses the
    packager's own naming function so there is exactly one naming rule.
    """
    try:
        from database.session import get_session
        from pipeline_packager import get_idea_package_folder_name
        with get_session() as session:
            name = get_idea_package_folder_name(idea_id, session)
        return OUTPUT_PACKAGED_DIR / name
    except Exception:
        return None


def has_video(idea_id: int) -> bool:
    """True if a real (>10KB) mp4 exists for this idea on disk, or video is marked completed in DB."""
    from sqlmodel import select
    from database.session import get_session
    from database.models import GeneratedVideo, YouTubeMetadata, Idea

    with get_session() as session:
        # DB Ground Truth check
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        if idea and idea.status in ("completed", "uploaded", "published"):
            return True

        yt_meta = session.exec(select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)).first()
        if yt_meta and (yt_meta.status == "uploaded" or yt_meta.youtube_video_id):
            return True

        rec = session.exec(
            select(GeneratedVideo).where(GeneratedVideo.idea_id == idea_id)
        ).first()
        if rec and rec.status == "completed":
            return True

    folder = package_folder_for(idea_id)
    if folder and folder.is_dir():
        if any(f.stat().st_size > MIN_REAL_VIDEO_BYTES for f in folder.glob("*.mp4")):
            return True

    with get_session() as session:
        rec = session.exec(
            select(GeneratedVideo).where(GeneratedVideo.idea_id == idea_id)
        ).first()
        if rec and rec.file_path:
            p = Path(rec.file_path)
            if p.exists() and p.stat().st_size > MIN_REAL_VIDEO_BYTES:
                return True
    return False


def package_detail(idea_id: int) -> dict:
    """Which of the 3 required package files are present."""
    folder = package_folder_for(idea_id)
    if not folder or not folder.is_dir():
        return {"exists": False, "folder": str(folder) if folder else "",
                "has_video": False, "has_prompt_json": False, "has_seo_json": False,
                "complete": False, "extra_files": []}

    mp4s = [f for f in folder.glob("*.mp4") if f.stat().st_size > MIN_REAL_VIDEO_BYTES]

    # Either spelling counts as present -- see PROMPT_JSON_NAMES / SEO_JSON_NAMES above.
    pj = _first_present(folder, PROMPT_JSON_NAMES)
    sj = _first_present(folder, SEO_JSON_NAMES)
    has_pj = pj is not None
    has_sj = sj is not None

    expected = set(PROMPT_JSON_NAMES) | set(SEO_JSON_NAMES) | {f.name for f in mp4s}
    extra = sorted(
        f.name for f in folder.iterdir()
        if f.is_file()
        and f.name not in expected
        and not f.name.endswith(_LEGACY_PREFIXED_SUFFIXES)
    )

    return {
        "exists": True,
        "folder": str(folder),
        "has_video": bool(mp4s),
        "has_prompt_json": has_pj,
        "has_seo_json": has_sj,
        "prompt_json_name": pj.name if pj else "",
        "seo_json_name": sj.name if sj else "",
        "complete": bool(mp4s) and has_pj and has_sj,
        "extra_files": extra,
    }


def has_package(idea_id: int) -> bool:
    """True when the folder holds all 3 canonical files."""
    return package_detail(idea_id)["complete"]


# ---------------------------------------------------------------------------
# Combined report
# ---------------------------------------------------------------------------
def stage_report(idea_id: int) -> dict:
    """
    Per-idea state of every gate. Used by the backfill loop, the CSV export and
    the verification tests, so all three agree on what "done" means.
    """
    from sqlmodel import select
    from database.session import get_session
    from database.models import Idea, IdeaElement

    with get_session() as session:
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        if not idea:
            return {"idea_id": idea_id, "error": "idea not found"}
        link = session.exec(select(IdeaElement).where(IdeaElement.idea_id == idea_id)).first()
        element_id = link.element_id if link else None
        title = idea.title

    esc = escalation_detail(idea_id)
    seo = seo_detail(idea_id)
    pkg = package_detail(idea_id)

    stages = {
        "category": has_category(),
        "element": has_element(element_id) if element_id else False,
        "ideas": has_ideas(element_id) if element_id else False,
        "escalation": esc["filled"] >= esc["required"] and esc["has_level_10_video"],
        "seo": seo["usable"],
        "video": has_video(idea_id),
        "package": pkg["complete"],
    }

    return {
        "idea_id": idea_id,
        "title": title,
        "element_id": element_id,
        "stages": stages,
        "next_missing": next((s for s in STAGE_ORDER if not stages[s]), None),
        "escalation_detail": esc,
        "seo_detail": seo,
        "package_detail": pkg,
    }


def next_missing_stage(idea_id: int) -> str | None:
    """The stage a worker should do next, or None when the idea is fully complete."""
    rep = stage_report(idea_id)
    return rep.get("next_missing") if "error" not in rep else None


def all_idea_ids() -> list[int]:
    from sqlmodel import select
    from database.session import get_session
    from database.models import Idea
    with get_session() as session:
        return [i.id for i in session.exec(select(Idea).order_by(Idea.id)).all()]


def summarize_all() -> dict:
    """Counts per stage across every idea — the fast 'where is the pipeline?' answer."""
    ids = all_idea_ids()
    counts = {s: 0 for s in STAGE_ORDER}
    pending: dict[str, list[int]] = {s: [] for s in STAGE_ORDER}

    for i in ids:
        rep = stage_report(i)
        if "error" in rep:
            continue
        for s in STAGE_ORDER:
            if rep["stages"][s]:
                counts[s] += 1
        nm = rep["next_missing"]
        if nm:
            pending[nm].append(i)

    return {"total_ideas": len(ids), "counts": counts, "pending_by_stage": pending}
