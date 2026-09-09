"""
REQ-036: Alembic Migration Setup & Initial Revision
===================================================
Dedicated automated test suite proving:
1. alembic.ini exists and correctly points to infrastructure/database/alembic.
2. Initial migration revision script (1f1c4506933d_initial_schema.py) exists and defines upgrade/downgrade hooks.
3. Offline DDL migration generation (alembic upgrade head --sql) executes cleanly without error.
"""

import sys
import subprocess
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PYTHON_EXE = REPO_ROOT / "PromptDatabase" / ".venv" / "Scripts" / "python.exe"
ALEMBIC_INI = REPO_ROOT / "alembic.ini"
VERSIONS_DIR = REPO_ROOT / "infrastructure" / "database" / "alembic" / "versions"


def test_req_036_alembic_ini_exists_and_valid():
    """Verify alembic.ini presence and configuration."""
    assert ALEMBIC_INI.is_file(), f"alembic.ini not found at {ALEMBIC_INI}"
    content = ALEMBIC_INI.read_text(encoding="utf-8")
    assert "infrastructure/database/alembic" in content


def test_req_036_revision_script_exists():
    """Verify initial migration revision script exists with valid hooks."""
    rev_file = VERSIONS_DIR / "1f1c4506933d_initial_schema.py"
    assert rev_file.is_file(), f"Initial revision file missing: {rev_file}"
    content = rev_file.read_text(encoding="utf-8")
    assert "revision: str = '1f1c4506933d'" in content
    assert "def upgrade()" in content
    assert "def downgrade()" in content


def test_req_036_offline_sql_generation():
    """Verify alembic upgrade head --sql runs and emits valid migration DDL."""
    cmd = [str(PYTHON_EXE), "-m", "alembic", "upgrade", "head", "--sql"]
    res = subprocess.run(cmd, cwd=str(REPO_ROOT), capture_output=True, text=True, check=True)
    assert res.returncode == 0
    assert "CREATE TABLE alembic_version" in res.stdout
    assert "1f1c4506933d" in res.stdout
