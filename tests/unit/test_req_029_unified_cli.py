"""
REQ-029: Unified CLI-to-Service Layer Invocation
================================================
Dedicated automated test suite proving:
1. CLI invocation with --status prints stage gate summary from IdeaService.
2. CLI invocation with --plan <id> prints missing stage diagnosis for Idea #1.
3. CLI invocation with --export triggers ExportService CSV refresh.
4. CLI invocation with --help prints usage guide.
"""

import sys
import subprocess
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PYTHON_EXE = REPO_ROOT / "PromptDatabase" / ".venv" / "Scripts" / "python.exe"


def test_req_029_cli_help():
    """Verify CLI --help displays argument options."""
    cmd = [str(PYTHON_EXE), "-m", "apps.cli.unified_runner", "--help"]
    res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, check=True)
    assert "Unified Service-Layer CLI Runner" in res.stdout
    assert "--status" in res.stdout
    assert "--plan" in res.stdout
    assert "--export" in res.stdout


def test_req_029_cli_status():
    """Verify CLI --status executes IdeaService gates summary and outputs table."""
    cmd = [str(PYTHON_EXE), "-m", "apps.cli.unified_runner", "--status"]
    res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, check=True)
    assert "UNIFIED PIPELINE STATUS" in res.stdout
    assert "IDEAS" in res.stdout


def test_req_029_cli_plan():
    """Verify CLI --plan 1 inspects Idea #1 and outputs stages."""
    cmd = [str(PYTHON_EXE), "-m", "apps.cli.unified_runner", "--plan", "1"]
    res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, check=True)
    assert "PLAN — Idea #1" in res.stdout
    assert "Next missing stage" in res.stdout


def test_req_029_cli_export():
    """Verify CLI --export invokes ExportService and reports success."""
    cmd = [str(PYTHON_EXE), "-m", "apps.cli.unified_runner", "--export"]
    res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, check=True)
    assert "Master CSVs refreshed successfully" in res.stdout
    assert "Export dir:" in res.stdout
