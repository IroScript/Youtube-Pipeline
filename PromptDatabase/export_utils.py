"""
Export Utilities for YouTube Pipeline CSV Generation
====================================================
Handles human-readable timestamping and non-overwriting path resolution.
"""
from __future__ import annotations
from datetime import datetime
from pathlib import Path
from typing import Optional


def get_timestamp_suffix(dt: Optional[datetime] = None) -> str:
    """
    Returns timestamp suffix in the exact user-specified format:
    e.g. '5_sept_9.16_am', '5_sept_12.05_pm'
    """
    if dt is None:
        dt = datetime.now()
    month_abbrs = {
        1: "jan", 2: "feb", 3: "mar", 4: "apr", 5: "may", 6: "jun",
        7: "jul", 8: "aug", 9: "sept", 10: "oct", 11: "nov", 12: "dec"
    }
    day = dt.day
    month = month_abbrs.get(dt.month, dt.strftime("%b").lower())
    hour = dt.strftime("%I").lstrip("0") or "12"
    minute = dt.strftime("%M")
    ampm = dt.strftime("%p").lower()
    return f"{day}_{month}_{hour}.{minute}_{ampm}"


def resolve_unique_path(base_path: Path) -> Path:
    """
    Ensures existing files are NEVER overwritten or replaced.
    If 'base_path' exists, appends '_1', '_2', etc.
    """
    if not base_path.exists():
        return base_path
    stem = base_path.stem
    suffix = base_path.suffix
    counter = 1
    while True:
        candidate = base_path.with_name(f"{stem}_{counter}{suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


# ---------------------------------------------------------------------------
# CSV version retention — keep only the last N files per CSV type
# ---------------------------------------------------------------------------
import re

# Known CSV prefixes (the base name before the timestamp part)
_CSV_PREFIXES = [
    "unified_master_pipeline",
    "master_dashboard",
    "seo_master",
    "seo_keywords",
    "seo_competitors",
    "master_prompts_from_db",
    "pipeline_hierarchy_progress",
    "table_fillup_summary",
    "prompting_style_master",
]

# Regex: prefix + _ + timestamp (e.g. 9_sept_11.18_pm) + optional _1/_2 + .csv
_TS_PATTERN = re.compile(
    r"^(?P<prefix>.+?)_\d{1,2}_(?:jan|feb|mar|apr|may|jun|jul|aug|sept|oct|nov|dec)_\d{1,2}\.\d{2}_(?:am|pm)(?:_\d+)?\.csv$",
    re.IGNORECASE,
)


def cleanup_old_exports(export_dir: Path, keep: int = 3) -> list[Path]:
    """Delete old timestamped CSV exports, keeping only the last `keep` per type.

    Groups CSV files in *export_dir* by their base prefix (e.g. 'seo_master'),
    sorts each group by file modification time (newest first), and removes
    everything beyond the *keep* newest files.

    Returns the list of deleted file paths.
    """
    if not export_dir.is_dir():
        return []

    # Bucket every timestamped CSV by its prefix
    buckets: dict[str, list[Path]] = {p: [] for p in _CSV_PREFIXES}

    for f in export_dir.iterdir():
        if not f.is_file() or f.suffix.lower() != ".csv":
            continue
        m = _TS_PATTERN.match(f.name)
        if not m:
            continue
        prefix = m.group("prefix")
        if prefix in buckets:
            buckets[prefix].append(f)

    deleted: list[Path] = []
    for prefix, files in buckets.items():
        if len(files) <= keep:
            continue
        # Sort newest first by modification time
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        for old_file in files[keep:]:
            try:
                old_file.unlink()
                deleted.append(old_file)
            except Exception as e:
                print(f"  [cleanup] Could not delete {old_file.name}: {e}")

    return deleted

