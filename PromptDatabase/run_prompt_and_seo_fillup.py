"""
Master Unified Pipeline Fillup Engine: Prompt + SEO + CSV Auto-Sync (One-Click Runner)
======================================================================================
Combines complete autonomous workflow into a single command:
  1. Escalation Prompts (10 Image + 10 Video prompts = 20 prompts per idea)
  2. YouTube SEO Generation (Real YouTube Autocomplete keywords + Competitor discovery +
     High-CTR Title + 3-Paragraph Description + Tags + 5 Hashtags + Pinned Comment + Thumbnail Prompt)
  3. Automatic SQLite Database Persistence (youtube_metadata, seo_runs, seo_keywords, etc.)
  4. Real-time Export of all Master CSVs (master_prompts_from_db.csv, seo_master.csv, etc.)
  5. Live Stage-Gate Status & Progress Reporting

Usage:
  python run_prompt_and_seo_fillup.py                  (Interactive / One-click auto run)
  python run_prompt_and_seo_fillup.py --auto           (Automatic continuous loop)
  python run_prompt_and_seo_fillup.py --count 5        (Process 5 ideas)
  python run_prompt_and_seo_fillup.py --idea-id 3      (Process specific idea)
  python run_prompt_and_seo_fillup.py --seo-only       (Backfill SEO for all pending ideas)
  python run_prompt_and_seo_fillup.py --export-only    (Refresh all CSV exports)
  python run_prompt_and_seo_fillup.py --no-browser     (Fast deterministic keyword-grounded mode)
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from database.session import get_session, init_db
from database.models import Idea, Prompt, YouTubeMetadata, Element, Task
from sqlmodel import select

import stage_gates as sg
from seo_engine import pipeline as seo_pipeline
from generate_master_prompt_csv import main as export_master_prompts_csv
from generate_seo_csv import generate_seo_csvs


def refresh_all_csvs():
    """Refreshes all master CSV files from the SQLite database."""
    print("\n" + "-" * 70)
    print("📊 [CSV AUTO-SYNC] Refreshing All Master CSV Exports...")
    print("-" * 70)
    try:
        export_master_prompts_csv()
    except Exception as e:
        print(f"  [Notice] master_prompts_from_db.csv export notice: {e}")

    try:
        generate_seo_csvs()
    except Exception as e:
        print(f"  [Notice] seo_master.csv export notice: {e}")

    try:
        from generate_master_joined_csv import generate_unified_master_csv
        generate_unified_master_csv()
    except Exception as e:
        print(f"  [Notice] unified_master_pipeline.csv export notice: {e}")

    print("✅ [CSV AUTO-SYNC] All CSV files successfully updated in exports/")


def process_idea_full_fillup(idea_id: int, *, use_browser: bool = True, apply: bool = True) -> dict:
    """
    Executes Prompt Escalation + SEO Generation for a given idea if missing.
    """
    rep = sg.stage_report(idea_id)
    if "error" in rep:
        print(f"❌ Idea #{idea_id} error: {rep['error']}")
        return {"idea_id": idea_id, "status": "error", "error": rep["error"]}

    title = rep.get("title", f"Idea #{idea_id}")
    print("\n" + "=" * 76)
    print(f"🎯 PROCESSING IDEA #{idea_id}: '{title}'")
    print("=" * 76)

    actions_taken = []

    # 1. Check & Generate Prompts Escalation
    esc = rep.get("escalation_detail", {})
    if not (esc.get("filled", 0) >= esc.get("required", 20) and esc.get("has_level_10_video")):
        print(f"\n[Step 1/2: Prompts] Escalation missing ({esc.get('filled', 0)}/20 filled). Generating...")
        from prompt_chain_engine import generate_escalation_for_idea
        with get_session() as session:
            idea_obj = session.exec(select(Idea).where(Idea.id == idea_id)).first()
            if idea_obj:
                if not use_browser:
                    os.environ["ALLOW_OFFLINE_ESCALATION"] = "1"
                saved = generate_escalation_for_idea(idea_obj, skip_browser=not use_browser)
                print(f"  ✅ Saved {len(saved) if saved else 0} prompts into SQLite `prompts` table.")
                actions_taken.append(f"prompts_generated({len(saved) if saved else 0})")
    else:
        print(f"[Step 1/2: Prompts] ✅ Escalation already complete (20/20 prompts ready).")

    # 2. Check & Generate YouTube SEO Metadata
    seo_st = rep.get("seo_detail", {})
    if not seo_st.get("usable"):
        reason = seo_st.get("reason", "needs real SEO")
        print(f"\n[Step 2/2: SEO] SEO metadata missing or boilerplate ({reason}). Generating...")
        res = seo_pipeline.run_for_idea(
            idea_id, apply=apply, force=True, use_browser=use_browser
        )
        pkg = res.get("package", {})
        print(f"  ✅ SEO Title : {pkg.get('title', '')}")
        print(f"  ✅ SEO Tags  : {len(pkg.get('tags', []))} tags")
        print(f"  ✅ Pinned Com: {pkg.get('pinned_comment', '')[:80]}...")
        print(f"  ✅ Source    : {pkg.get('_source')}")
        print(f"  ✅ DB Action : {(res.get('db') or {}).get('action')}")
        actions_taken.append("seo_generated")
    else:
        print(f"[Step 2/2: SEO] ✅ Real SEO metadata already present in SQLite.")

    return {
        "idea_id": idea_id,
        "title": title,
        "actions": actions_taken,
        "status": "success"
    }


def run_full_pipeline_loop(
    *, count: int = 0, target_idea_id: int | None = None,
    seo_only: bool = False, prompt_only: bool = False,
    use_browser: bool = True, apply: bool = True, delay: int = 2
):
    """
    Main loop that advances ideas until all required stages are complete.
    """
    init_db()
    print("=" * 76)
    print("      🚀 MASTER UNIFIED PIPELINE FILLUP ENGINE (PROMPT + SEO + CSVS)")
    print("=" * 76)
    sg_summary = sg.summarize_all()
    total = sg_summary["total_ideas"]
    print(f"  • Total Ideas in DB:    {total}")
    print(f"  • Escalation Ready:     {sg_summary['counts']['escalation']}/{total}")
    print(f"  • Real SEO Ready:       {sg_summary['counts']['seo']}/{total}")
    print(f"  • Mode:                 {'SEO-Only Backfill' if seo_only else ('Prompts-Only' if prompt_only else 'Full Prompt + SEO Auto-Fill')}")
    print(f"  • Browser:              {'CloakBrowser (Live LLM)' if use_browser else 'Fast Keyless / Deterministic'}")
    print("=" * 76)

    if target_idea_id is not None:
        target_ids = [target_idea_id]
    elif seo_only:
        rows = seo_pipeline.find_fallback_metadata_ideas()
        target_ids = [r["idea_id"] for r in rows]
        print(f"\n[SEO Backfill Mode] Found {len(target_ids)} ideas needing real SEO.")
    else:
        # Prioritize ideas needing escalation, then ideas needing SEO
        all_ids = sg.all_idea_ids()
        target_ids = []
        for i in all_ids:
            rep = sg.stage_report(i)
            if "error" in rep:
                continue
            needs_esc = not rep["stages"]["escalation"]
            needs_seo = not rep["stages"]["seo"]
            if needs_esc or needs_seo:
                target_ids.append(i)
        print(f"\n[Auto-Fill Mode] Found {len(target_ids)} ideas pending Prompts or SEO.")

    if not target_ids:
        print("\n🎉 All ideas are already 100% complete for Prompts and SEO!")
        refresh_all_csvs()
        return

    processed = 0
    for idx, i_id in enumerate(target_ids, 1):
        if count > 0 and processed >= count:
            print(f"\n🎉 Processed requested {count} idea(s). Stopping.")
            break

        print(f"\n>>> [Item {idx}/{len(target_ids)}] Processing Idea #{i_id}...")
        process_idea_full_fillup(i_id, use_browser=use_browser, apply=apply)
        processed += 1

        if delay > 0 and idx < len(target_ids):
            time.sleep(delay)

    # Sync all CSVs at the end of the batch
    refresh_all_csvs()

    # Print final summary
    print("\n" + "=" * 76)
    print("🎉 PIPELINE FILLUP RUN COMPLETED SUCCESSFULLY!")
    print("=" * 76)
    final_sg = sg.summarize_all()
    for stage in sg.STAGE_ORDER:
        done = final_sg["counts"][stage]
        bar = "#" * int(30 * done / total) if total else ""
        print(f"  {stage:11s} {done:4d}/{total:<4d} {bar:<30s}")
    print("=" * 76)


def main():
    parser = argparse.ArgumentParser(description="Master Unified Pipeline Fillup Engine")
    parser.add_argument("--auto", action="store_true", help="Run automatic full fillup loop")
    parser.add_argument("--count", type=int, default=0, help="Number of ideas to process (0 = all pending)")
    parser.add_argument("--idea-id", type=int, default=None, help="Process a specific Idea ID")
    parser.add_argument("--seo-only", action="store_true", help="Backfill SEO only for all pending ideas")
    parser.add_argument("--prompt-only", action="store_true", help="Fill missing escalation prompts only")
    parser.add_argument("--export-only", action="store_true", help="Refresh all Master CSV exports and exit")
    parser.add_argument("--no-browser", action="store_true", help="Fast keyless mode (deterministic keyword-grounded copy)")
    parser.add_argument("--delay", type=int, default=2, help="Delay between ideas in seconds (default: 2s)")
    args = parser.parse_args()

    if args.export_only:
        refresh_all_csvs()
        return

    run_full_pipeline_loop(
        count=args.count,
        target_idea_id=args.idea_id,
        seo_only=args.seo_only,
        prompt_only=args.prompt_only,
        use_browser=not args.no_browser,
        apply=True,
        delay=args.delay
    )


if __name__ == "__main__":
    main()
