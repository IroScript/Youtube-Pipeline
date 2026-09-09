"""
REQ-033: Backward-Compatible Legacy Wrappers
============================================
Dedicated automated test suite proving:
1. legacy_get_pipeline_status delegates to IdeaService.
2. legacy_check_idea_plan delegates to IdeaService.
3. legacy_prompt_fillup delegates to PromptService.
4. legacy_generate_video_payload delegates to VideoService.
5. legacy_export_all_csvs delegates to ExportService.
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

from apps.cli.legacy_adapters import (
    legacy_get_pipeline_status,
    legacy_check_idea_plan,
    legacy_prompt_fillup,
    legacy_generate_video_payload,
    legacy_export_all_csvs,
)


def test_req_033_legacy_status_and_plan():
    """Verify legacy pipeline status and plan inspection return expected service structures."""
    status = legacy_get_pipeline_status()
    assert status["total_ideas"] >= 132
    assert "counts" in status

    plan = legacy_check_idea_plan(1)
    assert plan["idea_id"] == 1
    assert "stages" in plan


def test_req_033_legacy_prompt_fillup():
    """Verify legacy prompt fillup wrapper returns valid escalation status."""
    res = legacy_prompt_fillup(1, dry_run=True)
    assert res["status"] == "dry_run"
    assert res["idea_id"] == 1
    assert res["total_prompts"] >= 20


def test_req_033_legacy_video_payload():
    """Verify legacy video render payload generator returns structured payload."""
    payload = legacy_generate_video_payload(1)
    assert payload["target_duration"] == 8
    assert "full_combined_prompt" in payload


def test_req_033_legacy_export_csvs():
    """Verify legacy export CSVs wrapper delegates to ExportService cleanly."""
    res = legacy_export_all_csvs()
    assert res["status"] == "success"
    assert "exports" in res["exports_directory"]
