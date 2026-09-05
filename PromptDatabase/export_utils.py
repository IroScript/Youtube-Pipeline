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
