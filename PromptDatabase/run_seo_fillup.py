#!/usr/bin/env python3
"""
Autonomous SEO Fillup Loop Engine
=================================
Backfills missing YouTube SEO metadata for all prompt-ready ideas
strictly using live CloakBrowser / Playwright ChatGPT on DISPLAY=:99
with human-like randomized cooldown between ideas.
"""

from __future__ import annotations

import argparse
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from database.session import init_db, get_session
from database.models import Idea, YouTubeMetadata, Prompt
from sqlmodel import select

from seo_engine import config as seo_config
from seo_engine import pipeline as seo_pipeline
from generate_progress_csv import generate_pipeline_hierarchy_progress, generate_table_fillup_summary, export_raw_tables, DB_PATH, CSV_TABLES_DIR
from generate_master_joined_csv import generate_unified_master_csv


def get_pending_seo_ideas(escalation_only: bool = True) -> list[dict]:
    """Returns list of ideas needing real SEO in SQLite."""
    return seo_pipeline.find_pending_seo_ideas(escalation_only=escalation_only)


def run_single_seo_fillup(idea_info: dict, cycle_num: int = 1) -> dict:
    """Executes SEO generation for a single idea using live ChatGPT."""
    idea_id = idea_info["idea_id"]
    title = idea_info.get("title", f"Idea #{idea_id}")
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("\n" + "#" * 80, flush=True)
    print(f"▶ [SEO CYCLE #{cycle_num} | {now_str}] Processing Idea #{idea_id}: '{title}'...", flush=True)
    print("#" * 80, flush=True)

    res = seo_pipeline.run_for_idea(idea_id, apply=True, force=False, use_browser=True)
    pkg = res.get("package", {})

    print("\n" + "=" * 80, flush=True)
    print(f"✅ [SEO CYCLE #{cycle_num} COMPLETE] SEO METADATA SAVED TO SQLITE:", flush=True)
    print("=" * 80, flush=True)
    print(f"  • Idea ID:     #{idea_id}", flush=True)
    print(f"  • Title:       {pkg.get('title', '')}", flush=True)
    print(f"  • Tags:        {len(pkg.get('tags', []))} tags ({', '.join(pkg.get('tags', [])[:5])}...)", flush=True)
    print(f"  • Source:      {pkg.get('_source')}", flush=True)
    print(f"  • DB Action:   {(res.get('db') or {}).get('action')}", flush=True)
    print("=" * 80, flush=True)

    # Sync CSV exports
    try:
        print("[Auto-Sync] Refreshing progress and unified master CSV exports...", flush=True)
        table_summaries = export_raw_tables(DB_PATH, CSV_TABLES_DIR)
        generate_table_fillup_summary(table_summaries)
        generate_pipeline_hierarchy_progress()
        generate_unified_master_csv()
        print("[Auto-Sync] All CSV exports updated successfully.", flush=True)
    except Exception as e:
        print(f"[Auto-Sync Notice] CSV export notice: {e}", flush=True)

    return res


def main():
    parser = argparse.ArgumentParser(description="Autonomous SEO Fillup Loop Engine")
    parser.add_argument("--count", type=int, default=0, help="Number of ideas to process (0 = all pending)")
    parser.add_argument("--random-delay", action="store_true", default=True, help="Enable random human delay (default: True)")
    parser.add_argument("--min-delay", type=int, default=300, help="Minimum random delay in seconds (default: 300s / 5 mins)")
    parser.add_argument("--max-delay", type=int, default=900, help="Maximum random delay in seconds (default: 900s / 15 mins)")
    parser.add_argument("--delay", type=int, default=10, help="Fixed delay in seconds if random-delay disabled")
    args = parser.parse_args()

    init_db()
    pending = get_pending_seo_ideas(escalation_only=True)
    
    print("=" * 80, flush=True)
    print("       🎯 AUTONOMOUS YOUTUBE SEO FILLUP ENGINE (LIVE CHATGPT)", flush=True)
    print("=" * 80, flush=True)
    print(f"  • Pending Prompt-Ready Ideas: {len(pending)}", flush=True)
    print(f"  • Mode:                       {'Finite Count: ' + str(args.count) if args.count > 0 else 'Full Backfill Loop'}", flush=True)
    print(f"  • Browser:                    Live ChatGPT (CloakBrowser / Playwright on DISPLAY=:99)", flush=True)
    if args.random_delay:
        print(f"  • Human Delay Mode:           Randomized ({args.min_delay}s - {args.max_delay}s / {args.min_delay//60}-{args.max_delay//60} mins per idea)", flush=True)
    else:
        print(f"  • Fixed Delay Mode:           {args.delay} seconds", flush=True)
    print("=" * 80, flush=True)

    if not pending:
        print("🎉 No pending SEO ideas! All prompt-ready ideas already have real SEO in SQLite.", flush=True)
        return 0

    cycle = 1
    try:
        while True:
            current_pending = get_pending_seo_ideas(escalation_only=True)
            if not current_pending:
                print("\n🎉 ALL BLANK SEO DATA HAS BEEN FILLED! Zero pending SEO ideas remain.", flush=True)
                break

            target = current_pending[0]
            run_single_seo_fillup(target, cycle_num=cycle)

            if args.count > 0 and cycle >= args.count:
                print(f"\n🎉 Completed requested {args.count} SEO cycle(s). Stopping loop.", flush=True)
                break

            # Human delay
            if args.random_delay:
                sleep_sec = random.randint(args.min_delay, args.max_delay)
                mins = sleep_sec / 60.0
                print(f"\n⏳ [Human Interaction Cooldown] Sleeping {sleep_sec}s ({mins:.1f} mins) before starting next SEO cycle (Cycle #{cycle + 1})... (Press Ctrl+C to stop)\n", flush=True)
                time.sleep(sleep_sec)
            else:
                print(f"\n⏳ Waiting {args.delay}s before starting next SEO cycle...\n", flush=True)
                time.sleep(args.delay)

            cycle += 1

    except KeyboardInterrupt:
        print("\n\n🛑 SEO Loop gracefully stopped by user.", flush=True)
        print(f"Total SEO cycles completed in this session: {cycle - 1}", flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
