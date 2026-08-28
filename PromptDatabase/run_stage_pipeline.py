"""
Stage Pipeline Driver - the ignition for stage_gates.py
======================================================
`stage_gates.py` answers "what is missing?" but is deliberately read-only, so nothing
was ever driving it. This module is that driver, and nothing more: it asks the gates
which stage an idea needs next, then calls the EXISTING function that fills that stage.

    category / element / ideas  -> informational here; the existing resolver in
                                   prompt_chain_engine owns bootstrapping these
    escalation                  -> prompt_chain_engine.generate_escalation_for_idea()
    seo                         -> seo_engine.pipeline.run_for_idea()
    video                       -> extension_bridge.ExtensionVideoBridge
                                     .generate_single_video()
    package                     -> pipeline_packager.process_idea_level10_package()

WHY A NEW FILE INSTEAD OF EDITING run_video_pipeline.py
-------------------------------------------------------
`run_video_pipeline.py` -> `run_next_level10_package()` -> the resolver, which in video
mode returns the FIRST idea holding 20 prompts. That is idea #1 every single time, so
once idea #1 was packaged the NO-RETRY lock reported "already_completed" and the runner
became a no-op - it had no way to advance to the next incomplete idea. Rather than
change that resolver (old logic), this driver selects the target itself from the gates
and leaves every existing entry point untouched.

WHAT THIS DELIBERATELY DOES NOT DO
----------------------------------
No YouTube upload. The render is driven through ExtensionVideoBridge directly instead of
run_single_video_pipeline.run_single_cycle(), whose step 4 calls
social_uploader.upload_video() and would publish with config.json's
privacy_status="public". Upload settings are never read here and config.json is never
modified.

SAFETY
------
Dry-run by default; every write needs --apply. One idea and one stage per invocation
unless --chain is given.

    python run_stage_pipeline.py --status
    python run_stage_pipeline.py --plan --idea-id 1
    python run_stage_pipeline.py --run --idea-id 1 --apply
    python run_stage_pipeline.py --chain --idea-id 1 --apply
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
for _p in (str(BASE_DIR), str(REPO_ROOT / "video" / "1Video10Sec")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import stage_gates as sg

RUNNABLE_STAGES = ["escalation", "seo", "video", "package"]


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------
def cmd_status() -> None:
    s = sg.summarize_all()
    total = s["total_ideas"]
    print("=" * 72)
    print(f"STAGE GATE STATUS - {total} ideas")
    print("=" * 72)
    for stage in sg.STAGE_ORDER:
        done = s["counts"][stage]
        pend = len(s["pending_by_stage"][stage])
        bar = "#" * int(30 * done / total) if total else ""
        print(f"  {stage:11s} {done:4d}/{total:<4d} {bar:<30s}  blocked-here: {pend}")
    print()
    for stage in sg.STAGE_ORDER:
        ids = s["pending_by_stage"][stage]
        if ids:
            shown = ", ".join(str(i) for i in ids[:12])
            more = f" ... (+{len(ids) - 12} more)" if len(ids) > 12 else ""
            print(f"  next={stage:11s} -> {len(ids):3d} ideas: {shown}{more}")


def pick_target(idea_id):
    """Explicit id if given, else the lowest-id idea that still has a missing stage."""
    if idea_id is not None:
        return idea_id, sg.stage_report(idea_id)
    for i in sg.all_idea_ids():
        rep = sg.stage_report(i)
        if "error" not in rep and rep["next_missing"]:
            return i, rep
    return None, {}


def cmd_plan(idea_id) -> None:
    tid, rep = pick_target(idea_id)
    if tid is None:
        print("Nothing pending - every idea passes every gate.")
        return
    if "error" in rep:
        print(f"Idea #{tid}: {rep['error']}")
        return
    print("=" * 72)
    print(f"PLAN - idea #{tid}: {rep['title']}")
    print("=" * 72)
    for stage in sg.STAGE_ORDER:
        ok = rep["stages"][stage]
        mark = "OK  " if ok else "MISS"
        note = ""
        if stage == "seo" and not ok:
            note = "   (" + rep["seo_detail"]["reason"] + ")"
        if stage == "escalation" and not ok:
            e = rep["escalation_detail"]
            note = f"   (filled {e['filled']}/{e['required']}, lvl10_video={e['has_level_10_video']})"
        if stage == "package" and not ok:
            p = rep["package_detail"]
            note = (f"   (folder_exists={p['exists']} video={p['has_video']} "
                    f"prompt_json={p['has_prompt_json']} seo_json={p['has_seo_json']})")
        print(f"  [{mark}] {stage}{note}")
    print()
    print(f"  -> next action: {rep['next_missing']}")


# ---------------------------------------------------------------------------
# Stage executors - each calls the EXISTING implementation, nothing reimplemented
# ---------------------------------------------------------------------------
def do_escalation(idea_id: int, *, apply: bool, no_browser: bool) -> bool:
    from sqlmodel import select
    from database.session import get_session
    from database.models import Idea
    from prompt_chain_engine import generate_escalation_for_idea

    with get_session() as session:
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        if not idea:
            print(f"  idea #{idea_id} not found")
            return False
        title = idea.title

    if not apply:
        how = " (offline placeholder)" if no_browser else " via CloakBrowser -> chatgpt.com"
        print(f"  [DRY-RUN] would generate a 10-level escalation for #{idea_id} '{title}'{how}")
        return False

    if no_browser:
        # The env gate added to generate_escalation_for_idea() blocks the hardcoded
        # offline builder unless this is set. Only an explicit --no-browser opts in.
        os.environ["ALLOW_OFFLINE_ESCALATION"] = "1"

    with get_session() as session:
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        saved = generate_escalation_for_idea(idea, skip_browser=no_browser)
    print(f"  escalation prompts saved: {len(saved) if saved else 0}")
    return bool(saved)


def do_seo(idea_id: int, *, apply: bool, no_browser: bool) -> bool:
    from seo_engine import pipeline as seo_pipeline

    res = seo_pipeline.run_for_idea(
        idea_id, apply=apply, force=False, use_browser=not no_browser
    )
    if "error" in res:
        print(f"  seo error: {res['error']}")
        return False
    pkg = res.get("package", {})
    print(f"  title  : {pkg.get('title', '')}")
    print(f"  tags   : {len(pkg.get('tags', []))}")
    print(f"  source : {pkg.get('_source')}")
    print(f"  db     : {(res.get('db') or {}).get('action')}")
    return apply


def build_prompt_info(idea_id: int) -> dict:
    """
    Assemble the dict ExtensionVideoBridge.generate_single_video() expects, for a
    SPECIFIC idea.

    idea_prompt_generator.fetch_sqlite_escalation_prompt() builds the same shape but
    always resolves its own target, so it cannot be pointed at a chosen idea. The
    IMAGE-reference stripping and whitespace normalisation below intentionally mirror
    idea_prompt_generator.py:225-233 so the prompt text handed to Veo is identical to
    what the existing path would send.
    """
    from sqlmodel import select
    from database.session import get_session
    from database.models import Idea, Prompt

    with get_session() as session:
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        if not idea:
            raise ValueError(f"idea #{idea_id} not found")
        vid = session.exec(select(Prompt).where(
            Prompt.idea_id == idea_id,
            Prompt.level == 10,
            Prompt.generation_type == "video",
        )).first()
        if not vid or not (vid.prompt_text or "").strip():
            raise ValueError(f"idea #{idea_id} has no usable level-10 video prompt")
        title = idea.title
        topic = idea.topic or "Paddy Titan Machine"
        lvl_name = vid.level_name or "ALIEN LEVEL / MAXIMUM"
        text = vid.prompt_text

    for i in range(1, 11):
        for form in (f"{i:02d}", str(i)):
            text = text.replace(f"Use IMAGE {form} as the first frame and reference image. ", "")
            text = text.replace(f"Use IMAGE {form} as the first frame and reference image.", "")
    text = " ".join(text.split()).strip()

    selected = {
        "id": idea_id,
        "title": title,
        "concept": f"Level 10 ({lvl_name}) Impossible Colossal Machine with 5-Step HUD Popups",
        "level": 10,
        "level_name": lvl_name,
        "style": "Alien Level Maximum Escalation",
    }
    return {
        "category": f"Element {topic} - Level 10",
        "all_5_ideas": [selected],
        "selected_idea_number": 1,
        "selected_idea": selected,
        "target_duration": 8,
        "duration": "8s",
        "aspect_ratio": "9:16",
        "model": "Veo 3.1 Lower Priority",
        "full_combined_prompt": text,
    }


def register_rendered_video(idea_id: int, mp4: Path) -> None:
    """
    Point GeneratedVideo at the freshly rendered mp4.

    THE GAP THIS FILLS: pipeline_packager locates the video ONLY through
    GeneratedVideo.file_path (status == "completed"). extension_bridge never writes that
    table, and the one writer that normally fills it is
    run_single_video_pipeline.run_single_cycle() - the upload-bearing path this driver
    deliberately avoids. Without this, a real render lands on disk and the packager still
    reports "waiting_for_video".

    Mirrors run_single_video_pipeline.py:115-134 (insert when absent, else update
    file_path / size / status). Additive: no existing file is changed to make this work.
    """
    import uuid
    from sqlmodel import select
    from database.session import get_session
    from database.models import GeneratedVideo, Idea

    size = mp4.stat().st_size
    with get_session() as session:
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        rec = session.exec(
            select(GeneratedVideo).where(GeneratedVideo.idea_id == idea_id)
        ).first()
        if not rec:
            rec = GeneratedVideo(
                uuid=str(uuid.uuid4()),
                idea_id=idea_id,
                title=idea.title if idea else mp4.stem,
                file_path=str(mp4),
                file_name=mp4.name,
                file_size_bytes=size,
                duration_seconds=8.0,
                resolution="1080x1920",
                status="completed",
            )
            session.add(rec)
            action = "inserted"
        else:
            was = rec.file_path
            rec.file_path = str(mp4)
            rec.file_name = mp4.name
            rec.file_size_bytes = size
            rec.status = "completed"
            session.add(rec)
            action = "updated (was: %s)" % was
        session.commit()
    print(f"  GeneratedVideo {action}")
    print(f"  GeneratedVideo.file_path -> {mp4}")


def do_video(idea_id: int, *, apply: bool, no_browser: bool) -> bool:
    info = build_prompt_info(idea_id)
    prompt = info["full_combined_prompt"]
    print(f"  prompt ({len(prompt)} chars): {prompt[:180]}...")

    if not apply:
        print("  [DRY-RUN] would render via ExtensionVideoBridge (Chrome + Google Flow / Veo).")
        print("  [DRY-RUN] NO YouTube upload is part of this path.")
        return False
    if no_browser:
        print("  --no-browser given: a real render needs Chrome. Skipping video stage.")
        return False

    from extension_bridge import ExtensionVideoBridge
    cfg = REPO_ROOT / "video" / "1Video10Sec" / "config.json"
    bridge = ExtensionVideoBridge(config_path=str(cfg))
    out = bridge.generate_single_video(info)
    if out and Path(out).exists() and Path(out).stat().st_size > sg.MIN_REAL_VIDEO_BYTES:
        size_mb = Path(out).stat().st_size / 1048576
        print(f"  rendered: {out} ({size_mb:.1f} MB)")
        register_rendered_video(idea_id, Path(out))
        return True
    print(f"  render did not produce a usable mp4 (got: {out!r})")
    return False


def do_package(idea_id: int, *, apply: bool, no_browser: bool) -> bool:
    if not apply:
        print("  [DRY-RUN] would export prompt_info.json + youtube_metadata.json from SQLite "
              "and copy the mp4 into output_packaged/.")
        return False

    # Route the packager's metadata step through seo_engine instead of the broken
    # logged-out playwright generator. Default-off env gate; see the REAL-SEO WRAP
    # comment in pipeline_packager.sync_and_get_youtube_metadata_from_sqlite().
    os.environ["PACKAGER_REAL_SEO"] = "1"
    from pipeline_packager import process_idea_level10_package
    res = process_idea_level10_package(idea_id, skip_browser=no_browser)
    print(f"  packager status: {res.get('status')}")
    if res.get("folder"):
        print(f"  folder: {res['folder']}")
    return res.get("status") in ("success", "already_completed", "completed")


EXECUTORS = {
    "escalation": do_escalation,
    "seo": do_seo,
    "video": do_video,
    "package": do_package,
}


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
def run_one_stage(idea_id: int, *, apply: bool, no_browser: bool, allowed: list):
    rep = sg.stage_report(idea_id)
    if "error" in rep:
        print(f"idea #{idea_id}: {rep['error']}")
        return None, False

    stage = rep["next_missing"]
    if stage is None:
        print(f"idea #{idea_id} '{rep['title']}' - all gates pass, nothing to do.")
        return None, False
    if stage not in EXECUTORS:
        print(f"idea #{idea_id}: next missing stage is '{stage}', which the existing "
              f"resolver owns (bootstrapping categories/elements/ideas). Not handled here.")
        return stage, False
    if stage not in allowed:
        print(f"idea #{idea_id}: next missing stage is '{stage}' but it is not in --stages. Stopping.")
        return stage, False

    print("-" * 72)
    tag = "" if apply else "  [DRY-RUN]"
    print(f"idea #{idea_id} '{rep['title']}' -> stage '{stage}'{tag}")
    print("-" * 72)
    ok = EXECUTORS[stage](idea_id, apply=apply, no_browser=no_browser)
    print(f"  stage '{stage}' -> {'DONE' if ok else 'not advanced'}")
    return stage, ok


def main() -> None:
    ap = argparse.ArgumentParser(description="Stage-gated pipeline driver")
    ap.add_argument("--status", action="store_true", help="gate counts across all ideas (read-only)")
    ap.add_argument("--plan", action="store_true", help="show the next missing stage (read-only)")
    ap.add_argument("--run", action="store_true", help="execute the next missing stage (one stage)")
    ap.add_argument("--chain", action="store_true", help="keep advancing this idea until blocked or complete")
    ap.add_argument("--idea-id", type=int, default=None, help="target a specific idea")
    ap.add_argument("--apply", action="store_true", help="REQUIRED to write anything")
    ap.add_argument("--no-browser", action="store_true", help="deterministic/offline only, no Chrome")
    ap.add_argument("--stages", default=",".join(RUNNABLE_STAGES),
                    help="comma list of stages allowed to run (default: " + ",".join(RUNNABLE_STAGES) + ")")
    args = ap.parse_args()

    if not any((args.status, args.plan, args.run, args.chain)):
        ap.print_help()
        return

    allowed = [s.strip() for s in args.stages.split(",") if s.strip()]

    if args.status:
        cmd_status()
        return
    if args.plan:
        cmd_plan(args.idea_id)
        return

    tid, rep = pick_target(args.idea_id)
    if tid is None:
        print("Nothing pending - every idea passes every gate.")
        return

    if not args.apply:
        print("*** DRY-RUN - no writes. Add --apply to execute. ***\n")

    if args.run:
        run_one_stage(tid, apply=args.apply, no_browser=args.no_browser, allowed=allowed)
        return

    # --chain: advance the same idea stage by stage, stopping on the first no-progress
    seen = set()
    while True:
        stage, ok = run_one_stage(tid, apply=args.apply, no_browser=args.no_browser, allowed=allowed)
        if stage is None or not ok:
            break
        if stage in seen:
            print(f"  stage '{stage}' repeated without clearing its gate - stopping to avoid a loop.")
            break
        seen.add(stage)
    print()
    cmd_plan(tid)


if __name__ == "__main__":
    main()
