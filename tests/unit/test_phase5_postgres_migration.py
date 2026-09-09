"""
Unit Tests for Phase 5: PostgreSQL Migration Architecture (REQ-035 to REQ-042)
==============================================================================
Verifies schema definitions, dual-engine connection switching, constraint audit,
data migration validation, and database safety backup protocols.
"""

import sys
import sqlite3
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from infrastructure.database.engine import create_db_engine, get_database_url
from infrastructure.database.session import get_session
from repositories.idea_repository import IdeaRepository
from scripts.audit_constraints import audit_foreign_keys, audit_unique_constraints
from scripts.migrate_sqlite_to_pg import run_migration_validation
from scripts.db_safety import create_backup, verify_latest_backup, compute_sha256


def test_dual_engine_switcher():
    # SQLite URL test
    sqlite_engine = create_db_engine("sqlite:///:memory:")
    assert sqlite_engine.dialect.name == "sqlite"

    # PostgreSQL URL test (syntactic configuration with pooling)
    pg_url = "postgresql+psycopg://test_user:test_pass@localhost:5432/test_db"
    pg_engine = create_db_engine(pg_url)
    assert pg_engine.dialect.name == "postgresql"


def test_uuid_and_integer_id_dual_support():
    with get_session() as session:
        repo = IdeaRepository(session)
        idea1 = repo.get_by_id(1)
        assert idea1 is not None
        assert idea1.id == 1
        assert idea1.uuid is not None and len(idea1.uuid) > 0

        # Query by UUID
        idea_by_uuid = repo.get_by_uuid(idea1.uuid)
        assert idea_by_uuid is not None
        assert idea_by_uuid.id == 1


def test_schema_pg_ddl_file_exists():
    ddl_file = REPO_ROOT / "domain" / "schema_pg.sql"
    assert ddl_file.exists(), "schema_pg.sql must exist"
    content = ddl_file.read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS ideas" in content
    assert "JSONB" in content
    assert "TIMESTAMPTZ" in content
    assert "gen_random_uuid()" in content


def test_alembic_setup_and_revision_exists():
    alembic_ini = REPO_ROOT / "alembic.ini"
    assert alembic_ini.exists(), "alembic.ini must exist"

    versions_dir = REPO_ROOT / "infrastructure" / "database" / "alembic" / "versions"
    assert versions_dir.is_dir(), "Alembic versions dir must exist"
    revisions = list(versions_dir.glob("*.py"))
    assert len(revisions) >= 1, "At least one initial revision must be generated"


def test_constraint_audit_execution():
    db_path = REPO_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db"
    con = sqlite3.connect(db_path)
    fk_res = audit_foreign_keys(con)
    unique_res = audit_unique_constraints(con)
    con.close()

    assert fk_res["is_consistent"] is True, f"Foreign key violations found: {fk_res}"
    assert unique_res["is_unique"] is True, f"Unique constraint violations found: {unique_res}"


def test_migration_data_validation():
    report = run_migration_validation()
    assert report["status"] == "VALIDATED", f"Migration validation failed: {report}"
    assert report["total_tables"] == 14
    assert report["total_records"] >= 1700


def test_database_safety_backup_protocol(tmp_path):
    backup_rec = create_backup(tag="pytest_test")
    assert "filename" in backup_rec
    assert "sha256" in backup_rec
    b_file = Path(backup_rec["path"])
    assert b_file.exists()

    # Verify integrity
    verify_res = verify_latest_backup()
    assert verify_res["status"] == "valid"
    assert verify_res["verified_hash"] == backup_rec["sha256"]
