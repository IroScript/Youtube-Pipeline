r"""
One-Stop Master Dashboard CSV — Single File, One Row Per Idea
=============================================================
Merges ALL pipeline data into a single Excel-friendly CSV where every row
is one Idea and every column tells you where that idea stands in the
complete pipeline:

  Element → Idea → Prompts → SEO → Video → Upload

Replaces the need for 7+ separate CSVs. Open in Excel, filter, sort, done.
"""

from __future__ import annotations

import csv
import json
import sqlite3
import sys
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from export_utils import get_timestamp_suffix, resolve_unique_path, cleanup_old_exports

DB_PATH = BASE_DIR / "database" / "youtube_pipeline.db"
EXPORT_DIR = BASE_DIR / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PACKAGED_DIR = BASE_DIR / "output_packaged"


def _connect():
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")
    con = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def _table_exists(con, name: str) -> bool:
    return con.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone() is not None


def _safe(val, default=""):
    """Return val if truthy, else default."""
    if val is None:
        return default
    return val


def generate_dashboard_csv(timestamp_suffix: Optional[str] = None) -> list[dict]:
    if timestamp_suffix is None:
        timestamp_suffix = get_timestamp_suffix()

    con = _connect()

    # ── 1. Ideas (core entity — one row per idea) ──────────────────────
    ideas = {}
    for r in con.execute("SELECT * FROM ideas ORDER BY id ASC"):
        ideas[r["id"]] = dict(r)

    # ── 2. Elements & Categories ───────────────────────────────────────
    elements = {}
    for r in con.execute("SELECT * FROM elements ORDER BY id ASC"):
        elements[r["id"]] = dict(r)

    categories = {}
    for r in con.execute("SELECT * FROM categories ORDER BY id ASC"):
        categories[r["id"]] = dict(r)
    default_cat = list(categories.values())[0]["name"] if categories else "N/A"

    # idea → element mapping
    idea_elem = {}
    if _table_exists(con, "idea_elements"):
        for r in con.execute("SELECT idea_id, element_id FROM idea_elements"):
            idea_elem[r["idea_id"]] = r["element_id"]

    # ── 3. Prompts — aggregate per idea ────────────────────────────────
    prompt_stats = {}  # idea_id → dict
    for r in con.execute(
        "SELECT idea_id, level, generation_type, prompt_text, aspect_ratio, "
        "       duration_seconds, status "
        "FROM prompts ORDER BY idea_id, level, generation_type"
    ):
        iid = r["idea_id"]
        if iid not in prompt_stats:
            prompt_stats[iid] = {
                "total": 0, "image": 0, "video": 0,
                "max_level": 0, "has_level10_video": False,
                "level10_video_text": "", "aspect": "", "duration": "",
                "levels_filled": set(),
            }
        s = prompt_stats[iid]
        s["total"] += 1
        gt = (r["generation_type"] or "").lower()
        if "image" in gt:
            s["image"] += 1
        elif "video" in gt:
            s["video"] += 1
        lvl = r["level"] or 0
        s["max_level"] = max(s["max_level"], lvl)
        s["levels_filled"].add(lvl)
        if lvl == 10 and "video" in gt:
            s["has_level10_video"] = True
            s["level10_video_text"] = (r["prompt_text"] or "")[:150]
        s["aspect"] = r["aspect_ratio"] or s["aspect"]
        s["duration"] = r["duration_seconds"] or s["duration"]

    # ── 4. SEO / YouTube Metadata ──────────────────────────────────────
    meta_by_idea = {}
    if _table_exists(con, "youtube_metadata"):
        for r in con.execute(
            "SELECT idea_id, title, seo_description, tags, pinned_comment, "
            "       category, status, video_prompt_used, video_file_path, "
            "       package_folder_path, updated_at "
            "FROM youtube_metadata ORDER BY idea_id, id ASC"
        ):
            if r["idea_id"] is not None:
                meta_by_idea[r["idea_id"]] = dict(r)

    # SEO Runs (scores)
    seo_by_idea = {}
    if _table_exists(con, "seo_runs"):
        for r in con.execute(
            "SELECT idea_id, provider, mode, demand_score, novelty_score, "
            "       saturation_score, opportunity_score, verdict, "
            "       keyword_count, competitor_count, created_at "
            "FROM seo_runs ORDER BY id ASC"
        ):
            if r["idea_id"] is not None:
                seo_by_idea[r["idea_id"]] = dict(r)

    # Top 5 keywords per idea
    top_kw = {}
    if _table_exists(con, "seo_keyword_metrics"):
        for r in con.execute(
            "SELECT idea_id, keyword, score FROM seo_keyword_metrics "
            "ORDER BY idea_id, score DESC"
        ):
            iid = r["idea_id"]
            if iid not in top_kw:
                top_kw[iid] = []
            if len(top_kw[iid]) < 5:
                top_kw[iid].append(r["keyword"])

    # ── 5. Tasks & Video Generation ────────────────────────────────────
    task_by_idea = {}
    if _table_exists(con, "tasks"):
        for r in con.execute("SELECT * FROM tasks ORDER BY id ASC"):
            if r["idea_id"] is not None:
                task_by_idea[r["idea_id"]] = dict(r)

    attempt_by_task = {}
    if _table_exists(con, "task_attempts"):
        for r in con.execute("SELECT * FROM task_attempts ORDER BY id ASC"):
            attempt_by_task.setdefault(r["task_id"], []).append(dict(r))

    video_by_idea = {}
    if _table_exists(con, "generated_videos"):
        for r in con.execute("SELECT * FROM generated_videos ORDER BY id ASC"):
            if r["idea_id"] is not None:
                video_by_idea[r["idea_id"]] = dict(r)

    con.close()

    # ── BUILD ROWS ─────────────────────────────────────────────────────
    COLUMNS = [
        # Identity
        "Idea_ID", "Idea_Title", "Idea_Topic",
        "Element_ID", "Element_Name", "Category",
        # Step 1: Prompts
        "Prompts_Total", "Prompts_Image", "Prompts_Video",
        "Max_Level", "Levels_Filled", "Has_Level10_Video",
        "Prompt_Step", "Aspect_Ratio", "Duration_Sec",
        "Level10_Video_Preview",
        # Step 2: SEO
        "SEO_Status", "SEO_Source", "SEO_Title", "SEO_Tags",
        "SEO_Tag_Count", "SEO_Description_Len",
        "SEO_Pinned_Comment",
        "SEO_Demand", "SEO_Novelty", "SEO_Saturation",
        "SEO_Opportunity", "SEO_Verdict",
        "SEO_Top_Keywords",
        # Step 3: Video Generation
        "Video_Generated", "Video_File_Path",
        "Task_Status", "Task_Attempts", "Task_Last_Error",
        # Step 4: Package / Upload
        "Package_Folder", "Upload_Ready",
        # Overall
        "Pipeline_Stage", "Idea_Status",
    ]

    rows = []
    for idea_id in sorted(ideas.keys()):
        idea = ideas[idea_id]
        elem_id = idea_elem.get(idea_id)
        elem = elements.get(elem_id, {}) if elem_id else {}
        cat_id = elem.get("category_id")
        cat_name = categories.get(cat_id, {}).get("name", default_cat) if cat_id else default_cat

        ps = prompt_stats.get(idea_id, {})
        meta = meta_by_idea.get(idea_id, {})
        seo = seo_by_idea.get(idea_id, {})
        task = task_by_idea.get(idea_id, {})
        video = video_by_idea.get(idea_id, {})

        # Prompt step label
        pt = ps.get("total", 0)
        if pt == 0:
            prompt_step = "❌ No Prompts"
        elif pt < 20:
            prompt_step = f"⚠️ Partial ({pt}/20)"
        elif ps.get("has_level10_video"):
            prompt_step = "✅ Complete (20/20)"
        else:
            prompt_step = f"⚠️ {pt} prompts (no L10 video)"

        # SEO status
        seo_title = _safe(meta.get("title"))
        seo_tags = _safe(meta.get("tags"))
        seo_source = _safe(seo.get("provider"))  # from seo_runs
        seo_status_val = _safe(meta.get("status"))
        if not seo_title or seo_title in ("—", "N/A", ""):
            seo_step = "❌ No SEO"
        elif seo_source in ("seo_engine", "browser_llm"):
            seo_step = "✅ Real SEO"
        elif "fallback" in (seo_source or "").lower():
            seo_step = "⚠️ Fallback"
        else:
            seo_step = f"⚠️ {seo_source or 'Unknown'}"

        # Tag count
        tag_count = 0
        if seo_tags:
            try:
                tl = json.loads(seo_tags) if seo_tags.startswith("[") else [t.strip() for t in seo_tags.split(",")]
                tag_count = len(tl)
                seo_tags_display = ", ".join(tl[:8]) + ("..." if len(tl) > 8 else "")
            except Exception:
                seo_tags_display = seo_tags[:100]
                tag_count = seo_tags.count(",") + 1
        else:
            seo_tags_display = ""

        # Video
        vid_path = _safe(video.get("file_path") or meta.get("video_file_path"))
        vid_generated = "✅ Yes" if vid_path else "❌ No"

        # Task
        task_status = _safe(task.get("status"), "—")
        task_id_val = task.get("id")
        attempts = attempt_by_task.get(task_id_val, []) if task_id_val else []
        last_error = attempts[-1].get("error_message", "") if attempts else ""

        # Package / Upload
        pkg_folder = _safe(meta.get("package_folder_path"))
        upload_ready = "✅ Yes" if (pkg_folder and vid_path and seo_title) else "❌ No"

        # Overall pipeline stage
        if not pt:
            stage = "1️⃣ Needs Prompts"
        elif not ps.get("has_level10_video"):
            stage = "2️⃣ Prompts Incomplete"
        elif seo_step == "❌ No SEO":
            stage = "3️⃣ Needs SEO"
        elif not vid_path:
            stage = "4️⃣ Needs Video"
        elif not pkg_folder:
            stage = "5️⃣ Needs Packaging"
        elif upload_ready == "✅ Yes":
            stage = "6️⃣ Upload Ready ✅"
        else:
            stage = "5️⃣ Needs Packaging"

        rows.append({
            "Idea_ID": idea_id,
            "Idea_Title": _safe(idea.get("title")),
            "Idea_Topic": _safe(idea.get("topic")),
            "Element_ID": _safe(elem_id),
            "Element_Name": _safe(elem.get("name")),
            "Category": cat_name,
            "Prompts_Total": pt,
            "Prompts_Image": ps.get("image", 0),
            "Prompts_Video": ps.get("video", 0),
            "Max_Level": ps.get("max_level", 0),
            "Levels_Filled": ",".join(str(x) for x in sorted(ps.get("levels_filled", set()))),
            "Has_Level10_Video": "Yes" if ps.get("has_level10_video") else "No",
            "Prompt_Step": prompt_step,
            "Aspect_Ratio": _safe(ps.get("aspect")),
            "Duration_Sec": _safe(ps.get("duration")),
            "Level10_Video_Preview": _safe(ps.get("level10_video_text")),
            "SEO_Status": seo_step,
            "SEO_Source": _safe(seo_source),
            "SEO_Title": seo_title,
            "SEO_Tags": seo_tags_display,
            "SEO_Tag_Count": tag_count,
            "SEO_Description_Len": len(_safe(meta.get("seo_description", ""))),
            "SEO_Pinned_Comment": _safe(meta.get("pinned_comment", ""))[:100],
            "SEO_Demand": _safe(seo.get("demand_score")),
            "SEO_Novelty": _safe(seo.get("novelty_score")),
            "SEO_Saturation": _safe(seo.get("saturation_score")),
            "SEO_Opportunity": _safe(seo.get("opportunity_score")),
            "SEO_Verdict": _safe(seo.get("verdict")),
            "SEO_Top_Keywords": ", ".join(top_kw.get(idea_id, [])),
            "Video_Generated": vid_generated,
            "Video_File_Path": vid_path,
            "Task_Status": task_status,
            "Task_Attempts": len(attempts),
            "Task_Last_Error": (last_error or "")[:100],
            "Package_Folder": pkg_folder,
            "Upload_Ready": upload_ready,
            "Pipeline_Stage": stage,
            "Idea_Status": _safe(idea.get("status")),
        })

    # ── WRITE CSV ──────────────────────────────────────────────────────
    target = resolve_unique_path(EXPORT_DIR / f"master_dashboard_{timestamp_suffix}.csv")
    with open(target, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n[Success] Master Dashboard CSV generated!")
    print(f"  Path: {target}")
    print(f"  Total Ideas: {len(rows)}")
    print(f"  Columns: {len(COLUMNS)}")

    # Stats summary
    stages = {}
    for r in rows:
        s = r["Pipeline_Stage"]
        stages[s] = stages.get(s, 0) + 1
    print(f"\n  📊 Pipeline Stage Summary:")
    for s in sorted(stages.keys()):
        print(f"     {s}: {stages[s]} ideas")

    # Cleanup old dashboard CSVs (keep 3)
    cleanup_old_exports(EXPORT_DIR, keep=3)

    return rows


if __name__ == "__main__":
    generate_dashboard_csv()
