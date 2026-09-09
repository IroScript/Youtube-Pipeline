"""
CSV Export & Reporting Service
==============================
Generates real-time master CSV spreadsheets directly from SQLite/PostgreSQL tables.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, Any

REPO_ROOT = Path(__file__).resolve().parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)


class ExportService:
    def __init__(self):
        self.exports_dir = REPO_ROOT / "PromptDatabase" / "exports"
        self.exports_dir.mkdir(parents=True, exist_ok=True)

    def refresh_all_csvs(self) -> Dict[str, Any]:
        """Runs generate_all_csvs.py to refresh master spreadsheets."""
        from generate_all_csvs import generate_all
        generate_all()
        return {
            "status": "success",
            "exports_directory": str(self.exports_dir.resolve()),
        }

    def export_master_prompts(self) -> str:
        from generate_master_prompt_csv import main as export_prompts
        export_prompts()
        out_file = self.exports_dir / "master_prompts_from_db.csv"
        return str(out_file.resolve())

    def export_seo_csvs(self) -> Dict[str, str]:
        from generate_seo_csv import generate_seo_csvs
        generate_seo_csvs()
        return {
            "seo_master": str((self.exports_dir / "seo_master.csv").resolve()),
            "seo_keywords": str((self.exports_dir / "seo_keywords.csv").resolve()),
        }
