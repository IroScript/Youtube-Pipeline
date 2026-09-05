"""
Master Unified CSV Generator (Autonomous Timestamped Export)
============================================================
Generates and refreshes ALL CSV exports for the entire YouTube Pipeline project in one go.
Every generated CSV is stamped with date & time (e.g. seo_master_5_sept_9.16_am.csv)
and will NEVER overwrite or replace previously generated CSV files.

CSVs generated:
  1. Real SEO Master Metadata (38 cols)     -> exports/seo_master_{timestamp}.csv
  2. Real SEO Keywords & Metrics           -> exports/seo_keywords_{timestamp}.csv
  3. Real SEO Competitor Analysis           -> exports/seo_competitors_{timestamp}.csv
  4. Unified Master Pipeline Joined Table   -> exports/unified_master_pipeline_{timestamp}.csv
  5. Master Prompt Hierarchy                -> exports/master_prompts_from_db_{timestamp}.csv
  6. Lifecycle Hierarchy Progress           -> exports/pipeline_hierarchy_progress_{timestamp}.csv
  7. Table Fillup Summary                  -> exports/table_fillup_summary_{timestamp}.csv
  8. Prompting Style Master                 -> exports/prompting_style_master_{timestamp}.csv
  9. Raw SQLite Database Tables (34 tables) -> exports/csv_tables/*.csv
"""

from __future__ import annotations

import os
import shutil
import sys
import time
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from export_utils import get_timestamp_suffix, resolve_unique_path


def generate_all(timestamp_suffix: Optional[str] = None):
    if timestamp_suffix is None:
        timestamp_suffix = get_timestamp_suffix()

    ts = timestamp_suffix
    start = time.time()
    print("=" * 76)
    print(f"        📊 MASTER UNIFIED CSV EXPORT GENERATOR [{ts}]")
    print("=" * 76)

    # 1. Raw DB tables + Table Summary + Hierarchy Progress
    print("\n>>> [1/4] Generating Raw Table CSVs & Lifecycle Progress...")
    from generate_progress_csv import (
        export_raw_tables,
        generate_table_fillup_summary,
        generate_pipeline_hierarchy_progress,
        DB_PATH, CSV_TABLES_DIR, EXPORT_DIR
    )
    tbl_summaries = export_raw_tables(DB_PATH, CSV_TABLES_DIR)
    generate_table_fillup_summary(tbl_summaries, timestamp_suffix=ts)
    generate_pipeline_hierarchy_progress(timestamp_suffix=ts)

    # Copy prompting_style_master.csv to timestamped export file
    src_style = CSV_TABLES_DIR / "prompting_style_master.csv"
    if src_style.exists():
        dst_style = resolve_unique_path(EXPORT_DIR / f"prompting_style_master_{ts}.csv")
        shutil.copy(src_style, dst_style)
        print(f"  ✅ Saved: {dst_style.name}")

    print(f"  ✅ Saved {len(tbl_summaries)} raw tables into: exports/csv_tables/")
    print(f"  ✅ Saved: pipeline_hierarchy_progress_{ts}.csv")
    print(f"  ✅ Saved: table_fillup_summary_{ts}.csv")

    # 2. Master Prompts Hierarchy
    print("\n>>> [2/4] Generating Master Prompts Hierarchy CSV...")
    from generate_master_prompt_csv import main as export_master_prompts
    export_master_prompts(timestamp_suffix=ts)

    # 3. Real SEO Master + Keywords + Competitors
    print("\n>>> [3/4] Generating Real SEO Master, Keywords & Competitors CSVs...")
    from generate_seo_csv import generate_seo_csvs
    generate_seo_csvs(timestamp_suffix=ts)

    # 4. Unified Master Joined Pipeline CSV
    print("\n>>> [4/4] Generating Unified Master Pipeline Joined CSV...")
    from generate_master_joined_csv import generate_unified_master_csv
    master_rows = generate_unified_master_csv(timestamp_suffix=ts)

    elapsed = time.time() - start
    print("\n" + "=" * 76)
    print(f"🎉 ALL CSV FILES SUCCESSFULLY GENERATED IN {elapsed:.2f}s!")
    print(f"   (Timestamp Stamp: '{ts}' — Previous files preserved)")
    print("=" * 76)
    print("Generated Master CSV Exports:")
    print(f"  1. Unified Master Pipeline  : exports/unified_master_pipeline_{ts}.csv ({len(master_rows)} rows)")
    print(f"  2. SEO Master CSV           : exports/seo_master_{ts}.csv")
    print(f"  3. SEO Keywords CSV         : exports/seo_keywords_{ts}.csv")
    print(f"  4. SEO Competitors CSV      : exports/seo_competitors_{ts}.csv")
    print(f"  5. Master Prompts Hierarchy : exports/master_prompts_from_db_{ts}.csv")
    print(f"  6. Lifecycle Progress CSV   : exports/pipeline_hierarchy_progress_{ts}.csv")
    print(f"  7. Table Fillup Summary CSV : exports/table_fillup_summary_{ts}.csv")
    print(f"  8. Prompting Style Master   : exports/prompting_style_master_{ts}.csv")
    print(f"  9. Raw SQLite Tables (34)   : {CSV_TABLES_DIR}")
    print("=" * 76 + "\n")


def main():
    generate_all()


if __name__ == "__main__":
    main()
