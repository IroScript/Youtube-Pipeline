"""
REQ-034: CLI Command Adapters Delegating to Service
===================================================
Dedicated automated test suite proving:
1. cmd_status() dispatches directly to IdeaService.get_gates_summary.
2. cmd_plan(idea_id) dispatches directly to IdeaService.get_stage_report.
3. cmd_export() dispatches directly to ExportService.refresh_all_csvs.
4. main() parses arguments and dispatches to appropriate command adapter.
"""

import sys
from pathlib import Path
import pytest
from unittest.mock import patch, MagicMock

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.cli.unified_runner import cmd_status, cmd_plan, cmd_export, main


def test_req_034_cmd_status_delegation(capsys):
    """Verify cmd_status calls IdeaService.get_gates_summary and prints formatted output."""
    with patch("apps.cli.unified_runner.IdeaService") as MockService:
        instance = MockService.return_value
        instance.get_gates_summary.return_value = {
            "total_ideas": 10,
            "counts": {"idea": 10, "prompts": 8, "seo": 5},
        }
        cmd_status()
        instance.get_gates_summary.assert_called_once()
        out = capsys.readouterr().out
        assert "UNIFIED PIPELINE STATUS — 10 IDEAS" in out


def test_req_034_cmd_plan_delegation(capsys):
    """Verify cmd_plan calls IdeaService.get_stage_report for the target idea."""
    with patch("apps.cli.unified_runner.IdeaService") as MockService:
        instance = MockService.return_value
        instance.get_stage_report.return_value = {
            "idea_id": 42,
            "title": "Quantum Compass",
            "stages": {"idea": True, "prompts": True, "seo": False},
            "next_missing": "seo",
        }
        cmd_plan(42)
        instance.get_stage_report.assert_called_once_with(42)
        out = capsys.readouterr().out
        assert "PLAN — Idea #42: Quantum Compass" in out
        assert "Next missing stage: seo" in out


def test_req_034_cmd_export_delegation(capsys):
    """Verify cmd_export calls ExportService.refresh_all_csvs."""
    with patch("apps.cli.unified_runner.ExportService") as MockService:
        instance = MockService.return_value
        instance.refresh_all_csvs.return_value = {
            "status": "success",
            "exports_directory": "C:/fake/exports",
        }
        cmd_export()
        instance.refresh_all_csvs.assert_called_once()
        out = capsys.readouterr().out
        assert "Master CSVs refreshed successfully." in out


def test_req_034_main_dispatch_status():
    """Verify main() with --status invokes cmd_status."""
    with patch("sys.argv", ["unified_runner.py", "--status"]), patch(
        "apps.cli.unified_runner.cmd_status"
    ) as mock_cmd:
        main()
        mock_cmd.assert_called_once()


def test_req_034_main_dispatch_plan():
    """Verify main() with --plan invokes cmd_plan with specified idea ID."""
    with patch("sys.argv", ["unified_runner.py", "--plan", "7"]), patch(
        "apps.cli.unified_runner.cmd_plan"
    ) as mock_cmd:
        main()
        mock_cmd.assert_called_once_with(7)


def test_req_034_main_dispatch_export():
    """Verify main() with --export invokes cmd_export."""
    with patch("sys.argv", ["unified_runner.py", "--export"]), patch(
        "apps.cli.unified_runner.cmd_export"
    ) as mock_cmd:
        main()
        mock_cmd.assert_called_once()
