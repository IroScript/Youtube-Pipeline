"""
Master Prompt CSV Export  (read-only)
=====================================
One row per prompt in `prompts` (youtube_pipeline.db), joined with the idea /
element it belongs to and with the live stage-gate verdict for that idea.

WHY A SEPARATE EXPORT FROM generate_master_joined_csv.py
--------------------------------------------------------
`unified_master_pipeline.csv` is task-centric: it joins prompts with tasks /
attempts / lifecycle, and emits placeholder rows for ideas that have no prompts
yet, so prompt rows sit among 184 non-prompt rows. This export is prompt-centric:
every row IS a prompt, and each carries the SEO + video + next-missing-stage
verdict from stage_gates so one file answers "which prompt is ready to render".

Nothing is written to the DB. No browser, no network. Existing exports are not
touched - this only adds exports/master_prompts_from_db.csv.

    python generate_master_prompt_csv.py
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path
from export_utils import get_timestamp_suffix, resolve_unique_path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlmodel import select

from database.session import get_session
from database.models import (
    Category, Element, Idea, IdeaElement, Prompt, YouTubeMetadata, GeneratedVideo,
)
import stage_gates as sg

EXPORT_DIR = BASE_DIR / "exports"
OUT_CSV = EXPORT_DIR / "master_prompts_from_db.csv"

COLUMNS = [
    "Idea_ID", "Idea_Title", "Idea_Topic", "Element_ID", "Element_Name",
    "Category_Name",
    "Prompt_ID", "Prompt_Level", "Prompt_Level_Name", "Prompt_Type",
    "Prompt_Generation_Type", "Prompt_Aspect_Ratio", "Prompt_Duration_Sec",
    "Prompt_Chars", "Prompt_Text",
    "Is_Level10_Video_Prompt",
    "SEO_Status", "SEO_Title", "SEO_Tag_Count",
    "Video_Exists", "Video_Path",
    "Package_Complete", "Next_Missing_Stage",
]


def main(timestamp_suffix=None) -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    if timestamp_suffix is None:
        timestamp_suffix = get_timestamp_suffix()

    if timestamp_suffix:
        target_csv = EXPORT_DIR / f"master_prompts_from_db_{timestamp_suffix}.csv"
    else:
        target_csv = OUT_CSV

    with get_session() as session:
        cat = session.exec(select(Category)).first()
        cat_name = cat.name if cat else ""

        elements = {e.id: e for e in session.exec(select(Element)).all()}
        ideas = {i.id: i for i in session.exec(select(Idea)).all()}
        links = {l.idea_id: l.element_id for l in session.exec(select(IdeaElement)).all()}
        seo_rows = {m.idea_id: m for m in session.exec(select(YouTubeMetadata)).all()}
        vids = {v.idea_id: v for v in session.exec(select(GeneratedVideo)).all()}

        prompts = session.exec(
            select(Prompt).order_by(
                Prompt.idea_id.asc(), Prompt.level.asc(), Prompt.generation_type.asc()
            )
        ).all()
        prompts = [
            {
                "id": p.id, "idea_id": p.idea_id, "level": p.level,
                "level_name": p.level_name, "prompt_type": p.prompt_type,
                "generation_type": p.generation_type,
                "aspect_ratio": getattr(p, "aspect_ratio", "") or "",
                "duration": getattr(p, "duration_seconds", "") or "",
                "text": p.prompt_text or "",
            }
            for p in prompts
        ]

    # stage_gates does several queries per idea, so resolve each idea exactly once.
    gate_cache: dict[int, dict] = {}

    def gates(idea_id: int) -> dict:
        if idea_id not in gate_cache:
            try:
                gate_cache[idea_id] = sg.stage_report(idea_id)
            except Exception as e:
                gate_cache[idea_id] = {"error": str(e)}
        return gate_cache[idea_id]

    rows = []
    for p in prompts:
        iid = p["idea_id"]
        idea = ideas.get(iid)
        eid = links.get(iid)
        elem = elements.get(eid) if eid else None
        rep = gates(iid)
        stages = rep.get("stages", {})
        seo_d = rep.get("seo_detail", {})
        seo_row = seo_rows.get(iid)
        vid = vids.get(iid)

        if not seo_d.get("exists"):
            seo_status = "MISSING"
        elif seo_d.get("is_fallback"):
            seo_status = "BOILERPLATE"
        elif seo_d.get("usable"):
            seo_status = "REAL"
        else:
            seo_status = "INCOMPLETE"

        video_exists = bool(stages.get("video"))
        video_path = ""
        if vid and vid.file_path and Path(vid.file_path).exists():
            video_path = vid.file_path

        rows.append({
            "Idea_ID": iid,
            "Idea_Title": idea.title if idea else "",
            "Idea_Topic": (idea.topic if idea else "") or "",
            "Element_ID": eid or "",
            "Element_Name": elem.name if elem else "",
            "Category_Name": cat_name,
            "Prompt_ID": p["id"],
            "Prompt_Level": p["level"],
            "Prompt_Level_Name": p["level_name"] or "",
            "Prompt_Type": p["prompt_type"] or "",
            "Prompt_Generation_Type": p["generation_type"] or "",
            "Prompt_Aspect_Ratio": p["aspect_ratio"],
            "Prompt_Duration_Sec": p["duration"],
            "Prompt_Chars": len(p["text"]),
            "Prompt_Text": p["text"],
            "Is_Level10_Video_Prompt": "YES" if (p["level"] == 10 and p["generation_type"] == "video") else "NO",
            "SEO_Status": seo_status,
            "SEO_Title": (seo_row.title if seo_row else "") or "",
            "SEO_Tag_Count": seo_d.get("tag_count", 0),
            "Video_Exists": "YES" if video_exists else "NO",
            "Video_Path": video_path,
            "Package_Complete": "YES" if stages.get("package") else "NO",
            "Next_Missing_Stage": rep.get("next_missing") or "COMPLETE",
        })

    final_csv = resolve_unique_path(target_csv)
    try:
        with open(final_csv, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=COLUMNS)
            w.writeheader()
            w.writerows(rows)
    except PermissionError:
        final_csv = resolve_unique_path(final_csv.with_name(final_csv.stem + "_alt" + final_csv.suffix))
        with open(final_csv, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=COLUMNS)
            w.writeheader()
            w.writerows(rows)

    lvl10 = sum(1 for r in rows if r["Is_Level10_Video_Prompt"] == "YES")
    real = len({r["Idea_ID"] for r in rows if r["SEO_Status"] == "REAL"})
    print("[Success] Master Prompt CSV generated")
    print(f"  Path            : {final_csv}")
    print(f"  Prompt rows     : {len(rows)}")
    print(f"  Distinct ideas  : {len({r['Idea_ID'] for r in rows})}")
    print(f"  Level-10 video  : {lvl10}")
    print(f"  Ideas REAL SEO  : {real}")
    print(f"  Columns         : {len(COLUMNS)}")


if __name__ == "__main__":
    main()
