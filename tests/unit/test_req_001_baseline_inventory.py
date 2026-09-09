"""
REQ-001: Project Forensic Audit & Baseline Inventory
=====================================================
Dedicated automated test suite proving:
1. Workspace baseline directories exist and conform to boundary rules.
2. SQLite database (youtube_pipeline.db) integrity: size, tables, and row counts.
3. Master database backup integrity with exact verified SHA256 hash.
4. Core legacy data preservation: ideas (132), elements (100), prompts (960).
5. Forensic audit documentation presence and structural validity.
"""

import hashlib
import sqlite3
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_req_001_baseline_directory_inventory():
    """Verify presence of core architectural and legacy directories."""
    required_dirs = [
        REPO_ROOT / "apps",
        REPO_ROOT / "domain",
        REPO_ROOT / "services",
        REPO_ROOT / "repositories",
        REPO_ROOT / "infrastructure",
        REPO_ROOT / "PromptDatabase",
        REPO_ROOT / "PromptDatabase" / "database",
    ]
    for d in required_dirs:
        assert d.is_dir(), f"Required directory missing: {d}"


def test_req_001_database_baseline_integrity():
    """Verify live SQLite database existence, size, and table structure."""
    db_path = REPO_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db"
    assert db_path.is_file(), f"Database file not found: {db_path}"
    assert db_path.stat().st_size > 1_000_000, "Database size must exceed 1MB"

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    tables = [r[0] for r in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    conn.close()

    assert len(tables) >= 14, f"Expected at least 14 tables, found {len(tables)}"
    # Core legacy tables
    for expected in ["ideas", "elements", "prompts", "categories", "pipeline_stage_audits"]:
        assert expected in tables, f"Core table {expected} missing from database"


def test_req_001_database_row_counts_and_data_preservation():
    """Verify core legacy records are 100% intact without data loss."""
    db_path = REPO_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    ideas_count = cursor.execute("SELECT COUNT(*) FROM ideas").fetchone()[0]
    elements_count = cursor.execute("SELECT COUNT(*) FROM elements").fetchone()[0]
    prompts_count = cursor.execute("SELECT COUNT(*) FROM prompts").fetchone()[0]
    categories_count = cursor.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    conn.close()

    assert ideas_count == 132, f"Expected 132 ideas, found {ideas_count}"
    assert elements_count == 100, f"Expected 100 elements, found {elements_count}"
    assert prompts_count >= 960, f"Expected at least 960 prompts, found {prompts_count}"
    assert categories_count >= 1, f"Expected at least 1 category, found {categories_count}"


def test_req_001_master_backup_checksum_integrity():
    """Verify master manual backup existence and valid SHA256 checksum."""
    backup_path = REPO_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db.backup_master_20260906"
    assert backup_path.is_file(), f"Master backup missing: {backup_path}"
    
    sha256_hash = hashlib.sha256(backup_path.read_bytes()).hexdigest()
    assert sha256_hash == "385e8be933a93cd380007cb07d292a72f0731d59d284e9f6ae4bbe1c44ab90b8", (
        f"Master backup SHA256 mismatch: {sha256_hash}"
    )


def test_req_001_audit_ledger_presence():
    """Verify presence of master audit and requirement tracking ledgers."""
    ledger = REPO_ROOT / "MASTER_097_REQUIREMENT_LEDGER.md"
    reaudit = REPO_ROOT / "ZERO_SKIP_REAUDIT_097.md"
    assert ledger.is_file(), "MASTER_097_REQUIREMENT_LEDGER.md must exist"
    assert reaudit.is_file(), "ZERO_SKIP_REAUDIT_097.md must exist"

    content = ledger.read_text(encoding="utf-8")
    assert "REQ-001" in content
    assert "REQ-097" in content
