r"""
SEO CSV Generator - SEO / YouTube-Metadata tables joined per idea
=================================================================
The unified master CSV (generate_master_joined_csv.py) joins the PROMPT
hierarchy only - categories/elements/ideas/prompts/tasks/generated_videos.
It never touches the SEO tables, which is why no SEO columns appear there.

This script is ADDITIVE and standalone. It does not modify, import from, or
interfere with generate_master_joined_csv.py or any pipeline stage. It opens
the database read-only.

Emits three CSVs into exports/:
  - seo_master.csv      one row per idea  (title, tags, description, scores)
  - seo_keywords.csv    one row per harvested keyword
  - seo_competitors.csv one row per discovered competitor video

Joins:
  - ideas
  - youtube_metadata     (title / seo_description / tags / prompt used)
  - seo_runs             (demand / novelty / saturation / opportunity / verdict)
  - seo_keyword_metrics  (harvested keywords + scores)
  - seo_competitors      (competitor videos found on YouTube)

Join key for merging with unified_master_pipeline.csv: Idea_ID
"""

import csv
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database" / "youtube_pipeline.db"
EXPORT_DIR = BASE_DIR / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)

SEO_MASTER_CSV = EXPORT_DIR / "seo_master.csv"
SEO_KEYWORDS_CSV = EXPORT_DIR / "seo_keywords.csv"
SEO_COMPETITORS_CSV = EXPORT_DIR / "seo_competitors.csv"

# Titles produced by the old fallback template, before the real SEO engine ran.
BOILERPLATE_MARKERS = ("INSANE:", "\U0001f6a8")

TOP_KEYWORDS_IN_MASTER = 15


def _is_boilerplate(title):
    if not title:
        return True
    return any(m in title for m in BOILERPLATE_MARKERS)


def _connect():
    if not DB_PATH.exists():
        raise SystemExit("Database not found: %s" % DB_PATH)
    con = sqlite3.connect("file:%s?mode=ro" % DB_PATH.as_posix(), uri=True)
    con.row_factory = sqlite3.Row
    return con


def _table_exists(con, name):
    row = con.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None


def generate_seo_csvs():
    con = _connect()

    for required in ("ideas", "youtube_metadata"):
        if not _table_exists(con, required):
            raise SystemExit("Required table missing: %s" % required)

    has_runs = _table_exists(con, "seo_runs")
    has_kw = _table_exists(con, "seo_keyword_metrics")
    has_comp = _table_exists(con, "seo_competitors")

    ideas = {}
    for r in con.execute(
        "SELECT id, title, topic, niche, status FROM ideas ORDER BY id ASC"
    ):
        ideas[r["id"]] = r

    meta_by_idea = {}
    for r in con.execute(
        "SELECT idea_id, title, seo_description, tags, category, status, "
        "       video_prompt_used, video_file_path, package_folder_path, updated_at "
        "FROM youtube_metadata ORDER BY idea_id ASC, id ASC"
    ):
        if r["idea_id"] is not None:
            meta_by_idea[r["idea_id"]] = r

    # Latest SEO run wins, so a re-harvest supersedes an older one.
    run_by_idea = {}
    if has_runs:
        for r in con.execute("SELECT * FROM seo_runs ORDER BY id ASC"):
            if r["idea_id"] is not None:
                run_by_idea[r["idea_id"]] = r

    kw_by_idea = {}
    if has_kw:
        for r in con.execute(
            "SELECT idea_id, seo_run_id, keyword, relevance, word_count, "
            "       long_tail, score, source, created_at "
            "FROM seo_keyword_metrics ORDER BY idea_id ASC, score DESC"
        ):
            kw_by_idea.setdefault(r["idea_id"], []).append(r)

    comp_by_idea = {}
    if has_comp:
        for r in con.execute(
            "SELECT idea_id, seo_run_id, query, video_id, title, channel, url, "
            "       view_count, duration_seconds, similarity, level, is_strong, discovered_at "
            "FROM seo_competitors ORDER BY idea_id ASC, similarity DESC"
        ):
            comp_by_idea.setdefault(r["idea_id"], []).append(r)

    con.close()

    # ---------------- seo_master.csv : one row per idea ----------------
    master_rows = []
    for idea_id, idea in ideas.items():
        meta = meta_by_idea.get(idea_id)
        run = run_by_idea.get(idea_id)
        kws = kw_by_idea.get(idea_id, [])
        comps = comp_by_idea.get(idea_id, [])

        title = (meta["title"] if meta else "") or ""
        tags = (meta["tags"] if meta else "") or ""
        desc = (meta["seo_description"] if meta else "") or ""

        if not meta:
            source = "NO_METADATA_ROW"
        elif run:
            source = "REAL_HARVEST"
        elif _is_boilerplate(title):
            source = "FALLBACK_BOILERPLATE"
        else:
            source = "MANUAL_OR_UNKNOWN"

        top_kw = [k["keyword"] for k in kws[:TOP_KEYWORDS_IN_MASTER]]
        strong = [c for c in comps if c["is_strong"]]

        _tag_cnt = 0
        if tags:
            try:
                import json as _json
                _parsed = _json.loads(tags)
                if isinstance(_parsed, list):
                    _tag_cnt = len(_parsed)
                else:
                    _tag_cnt = len([t for t in str(_parsed).split(",") if t.strip()])
            except Exception:
                _tag_cnt = len([t for t in tags.split(",") if t.strip()])

        master_rows.append({
            "Idea_ID": idea_id,
            "Idea_Title": idea["title"] or "",
            "Idea_Topic": idea["topic"] or "",
            "Idea_Status": idea["status"] or "",
            "SEO_Source": source,
            "SEO_Title": title,
            "SEO_Title_Length": len(title),
            "SEO_Description": desc,
            "SEO_Description_Length": len(desc),
            "SEO_Tags": tags,
            "SEO_Tags_Length": len(tags),
            "SEO_Tag_Count": _tag_cnt,
            "SEO_Category": (meta["category"] if meta else "") or "",
            "SEO_Metadata_Status": (meta["status"] if meta else "") or "",
            "SEO_Run_ID": run["id"] if run else "",
            "SEO_Provider": (run["provider"] if run else "") or "",
            "SEO_Mode": (run["mode"] if run else "") or "",
            "SEO_Demand_Score": run["demand_score"] if run else "",
            "SEO_Novelty_Score": run["novelty_score"] if run else "",
            "SEO_Saturation_Score": run["saturation_score"] if run else "",
            "SEO_Opportunity_Score": run["opportunity_score"] if run else "",
            "SEO_Verdict": (run["verdict"] if run else "") or "",
            "SEO_Keyword_Count": run["keyword_count"] if run else len(kws),
            "SEO_Competitor_Count": run["competitor_count"] if run else len(comps),
            "SEO_Exact_Competitors": run["exact_competitors"] if run else "",
            "SEO_Close_Competitors": run["close_competitors"] if run else "",
            "SEO_Strong_Competitors_Found": len(strong),
            "SEO_LLM_Used": run["llm_used"] if run else "",
            "SEO_Upload_Ready": run["upload_ready"] if run else "",
            "SEO_Warnings": (run["warnings"] if run else "") or "",
            "SEO_Run_At": (run["created_at"] if run else "") or "",
            "SEO_Top_Keywords": " | ".join(top_kw),
            "Video_Prompt_Used": (meta["video_prompt_used"] if meta else "") or "",
            "Video_File_Path": (meta["video_file_path"] if meta else "") or "",
            "Package_Folder_Path": (meta["package_folder_path"] if meta else "") or "",
            "SEO_Updated_At": (meta["updated_at"] if meta else "") or "",
        })

    _write(SEO_MASTER_CSV, master_rows)

    # ---------------- seo_keywords.csv : one row per keyword ----------------
    kw_rows = []
    for idea_id, kws in kw_by_idea.items():
        idea = ideas.get(idea_id)
        for rank, k in enumerate(kws, start=1):
            kw_rows.append({
                "Idea_ID": idea_id,
                "Idea_Title": (idea["title"] if idea else "") or "",
                "SEO_Run_ID": k["seo_run_id"],
                "Rank_By_Score": rank,
                "Keyword": k["keyword"],
                "Score": k["score"],
                "Relevance": k["relevance"],
                "Word_Count": k["word_count"],
                "Long_Tail": k["long_tail"],
                "Source": k["source"],
                "Harvested_At": k["created_at"],
            })
    _write(SEO_KEYWORDS_CSV, kw_rows)

    # ---------------- seo_competitors.csv : one row per competitor ----------------
    comp_rows = []
    for idea_id, comps in comp_by_idea.items():
        idea = ideas.get(idea_id)
        for c in comps:
            comp_rows.append({
                "Idea_ID": idea_id,
                "Idea_Title": (idea["title"] if idea else "") or "",
                "SEO_Run_ID": c["seo_run_id"],
                "Search_Query": c["query"],
                "Competitor_Title": c["title"],
                "Channel": c["channel"],
                "Video_ID": c["video_id"],
                "URL": c["url"],
                "View_Count": c["view_count"],
                "Duration_Seconds": c["duration_seconds"],
                "Similarity": c["similarity"],
                "Level": c["level"],
                "Is_Strong": c["is_strong"],
                "Discovered_At": c["discovered_at"],
            })
    _write(SEO_COMPETITORS_CSV, comp_rows)

    return master_rows, kw_rows, comp_rows


def _write(path, rows):
    if not rows:
        # Still create the file so a downstream reader gets an empty table,
        # not a missing-file crash.
        path.write_text("", encoding="utf-8-sig")
        print("  (no rows)  %s" % path.name)
        return
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print("  %5d rows x %2d cols  ->  %s" % (len(rows), len(rows[0]), path.name))


if __name__ == "__main__":
    print("=" * 70)
    print(" SEO CSV EXPORT  (read-only on database)")
    print("=" * 70)
    print(" DB: %s" % DB_PATH)
    m, k, c = generate_seo_csvs()
    print("-" * 70)
    real = sum(1 for r in m if r["SEO_Source"] == "REAL_HARVEST")
    boiler = sum(1 for r in m if r["SEO_Source"] == "FALLBACK_BOILERPLATE")
    nometa = sum(1 for r in m if r["SEO_Source"] == "NO_METADATA_ROW")
    print(" ideas total           : %d" % len(m))
    print("   REAL_HARVEST        : %d" % real)
    print("   FALLBACK_BOILERPLATE: %d" % boiler)
    print("   NO_METADATA_ROW     : %d" % nometa)
    print(" exports -> %s" % EXPORT_DIR)
    print("=" * 70)
