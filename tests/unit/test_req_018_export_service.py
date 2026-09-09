"""
REQ-018: CSV Export & Real-time Reporting Service
=================================================
Dedicated automated test suite proving:
1. ExportService initialization and export directory creation.
2. export_master_prompts generates non-empty master_prompts_from_db.csv.
3. export_seo_csvs produces seo_master.csv and seo_keywords.csv.
4. refresh_all_csvs executes the master generator pipeline cleanly.
"""

import sys
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from services.export_service import ExportService


def test_req_018_export_service_init():
    """Verify export service creates and recognizes the exports directory."""
    service = ExportService()
    assert service.exports_dir.is_dir()


def test_req_018_export_master_prompts():
    """Verify master prompts CSV is generated and contains headers/rows."""
    service = ExportService()
    csv_path_str = service.export_master_prompts()
    csv_path = Path(csv_path_str)
    assert csv_path.is_file()
    assert csv_path.stat().st_size > 500


def test_req_018_export_seo_csvs():
    """Verify SEO master and keywords CSVs are generated."""
    service = ExportService()
    res = service.export_seo_csvs()
    assert "seo_master" in res
    assert "seo_keywords" in res

    master_path = Path(res["seo_master"])
    keywords_path = Path(res["seo_keywords"])

    assert master_path.is_file()
    assert keywords_path.is_file()
    assert master_path.stat().st_size > 100
    assert keywords_path.stat().st_size > 100


def test_req_018_refresh_all_csvs():
    """Verify full CSV refresh pipeline runs successfully."""
    service = ExportService()
    result = service.refresh_all_csvs()
    assert result["status"] == "success"
    assert "exports" in result["exports_directory"]
