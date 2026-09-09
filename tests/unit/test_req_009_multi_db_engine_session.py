"""
REQ-009: Multi-DB Engine & Session Abstraction
==============================================
Dedicated automated test suite proving:
1. Dynamic URL resolution and automatic conversion of postgres:// to postgresql://.
2. Engine creation with dialect-specific configurations (SQLite threading vs PG connection pooling).
3. Session transaction manager commit lifecycle on clean exit.
4. Session transaction manager rollback and re-raise on uncaught exception.
5. FastAPI dependency injection provider (get_db_session) yielding request-scoped sessions.
6. Live database engine connectivity against default pipeline SQLite database.
"""

import os
import sys
from pathlib import Path
import pytest
from typing import Optional
from sqlmodel import SQLModel, Field, Session, select, create_engine
from sqlalchemy.engine import Engine

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from infrastructure.database.engine import (
    get_database_url,
    create_db_engine,
    DEFAULT_SQLITE_PATH,
    engine as default_engine,
)
from infrastructure.database.session import get_session, get_db_session


class Req009SampleTable(SQLModel, table=True):
    __tablename__ = "req_009_tx_test"
    id: Optional[int] = Field(default=None, primary_key=True)
    val: str


def test_req_009_database_url_resolution(monkeypatch):
    """Verify DATABASE_URL resolution, default fallback, and postgres URL normalization."""
    # 1. Default fallback
    monkeypatch.delenv("DATABASE_URL", raising=False)
    default_url = get_database_url()
    assert default_url == f"sqlite:///{DEFAULT_SQLITE_PATH}"

    # 2. Legacy postgres:// converted to postgresql://
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@host:5432/dbname")
    normalized_url = get_database_url()
    assert normalized_url == "postgresql://user:pass@host:5432/dbname"

    # 3. Modern postgresql+psycopg:// preserved
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@host:5432/dbname")
    assert get_database_url() == "postgresql+psycopg://user:pass@host:5432/dbname"


def test_req_009_engine_creation_sqlite_and_pg():
    """Verify engine configuration differences for SQLite vs PostgreSQL."""
    # SQLite
    sqlite_eng = create_db_engine("sqlite:///:memory:")
    assert sqlite_eng.dialect.name == "sqlite"

    # PostgreSQL pool configuration
    pg_url = "postgresql+psycopg://user:pass@localhost:5432/testdb"
    pg_eng = create_db_engine(pg_url)
    assert pg_eng.dialect.name == "postgresql"
    assert pg_eng.pool.size() == 10


def test_req_009_session_transaction_commit():
    """Verify get_session commits automatically on successful exit."""
    mem_engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(mem_engine)

    # Insert inside transaction block
    with get_session(custom_engine=mem_engine) as session:
        item = Req009SampleTable(val="committed_val")
        session.add(item)

    # Verify persisted in separate session
    with Session(mem_engine) as verify_session:
        rows = verify_session.exec(select(Req009SampleTable)).all()
        assert len(rows) == 1
        assert rows[0].val == "committed_val"


def test_req_009_session_transaction_rollback_on_error():
    """Verify get_session rolls back uncommitted changes and re-raises on exception."""
    mem_engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(mem_engine)

    # First insert one valid row
    with get_session(custom_engine=mem_engine) as session:
        session.add(Req009SampleTable(val="initial_stable_row"))

    # Now attempt transaction that crashes
    with pytest.raises(RuntimeError, match="Simulated crash during transaction"):
        with get_session(custom_engine=mem_engine) as session:
            session.add(Req009SampleTable(val="aborted_row"))
            raise RuntimeError("Simulated crash during transaction")

    # Verify the aborted row was NOT persisted
    with Session(mem_engine) as verify_session:
        rows = verify_session.exec(select(Req009SampleTable)).all()
        assert len(rows) == 1
        assert rows[0].val == "initial_stable_row"


def test_req_009_fastapi_dependency_generator():
    """Verify get_db_session yields a usable session and cleanly finalizes."""
    gen = get_db_session()
    session = next(gen)
    assert isinstance(session, Session)
    assert session.is_active

    # Finalize generator
    with pytest.raises(StopIteration):
        next(gen)


def test_req_009_live_default_engine_connectivity():
    """Verify default engine is connected to the real project SQLite DB."""
    with get_session() as session:
        result = session.exec(select(1)).one()
        assert result == 1
