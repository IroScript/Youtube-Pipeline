"""
Multi-Database Engine Configuration (SQLite / PostgreSQL)
=========================================================
Supports dynamic switching between SQLite (local single-file database)
and PostgreSQL (production scalable cluster) via DATABASE_URL environment variable.
"""

from __future__ import annotations

import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlmodel import SQLModel

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_SQLITE_PATH = REPO_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db"


def get_database_url() -> str:
    """
    Returns the database URL from environment variable or defaults to local SQLite.
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        return f"sqlite:///{DEFAULT_SQLITE_PATH}"
    # Standardize postgres:// to postgresql:// for SQLAlchemy 2.0
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def create_db_engine(url: str | None = None) -> Engine:
    """
    Creates and configures a SQLAlchemy engine with proper connection arguments.
    """
    db_url = url or get_database_url()
    
    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            echo=False,
            connect_args={"check_same_thread": False},
        )
    else:
        # PostgreSQL / other RDBMS configuration with pooling
        return create_engine(
            db_url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_recycle=1800,
            pool_pre_ping=True,
        )


# Global Engine Instance
engine: Engine = create_db_engine()


def init_database(custom_engine: Engine | None = None) -> None:
    """
    Initializes and creates all registered tables if they do not exist.
    """
    import sys
    prompt_db_path = str(REPO_ROOT / "PromptDatabase")
    if prompt_db_path not in sys.path:
        sys.path.insert(0, prompt_db_path)
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
    
    from database import models  # noqa: F401
    import domain.workflows.execution_model  # noqa: F401
    import domain.workflows.step_run_model  # noqa: F401
    import domain.workflows.attempt_model  # noqa: F401
    import domain.pipeline.pipeline_row_model  # noqa: F401  -- production pipeline state
    active_engine = custom_engine or engine
    SQLModel.metadata.create_all(active_engine)

    # Safe additive schema migration for workflow_executions retry columns
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(active_engine)
        if "workflow_executions" in inspector.get_table_names():
            columns = {col["name"] for col in inspector.get_columns("workflow_executions")}
            with active_engine.connect() as conn:
                if "attempt_count" not in columns:
                    conn.execute(text("ALTER TABLE workflow_executions ADD COLUMN attempt_count INTEGER DEFAULT 0"))
                if "max_attempts" not in columns:
                    conn.execute(text("ALTER TABLE workflow_executions ADD COLUMN max_attempts INTEGER DEFAULT 3"))
                if "error_message" not in columns:
                    conn.execute(text("ALTER TABLE workflow_executions ADD COLUMN error_message TEXT"))
                if "last_failure_time" not in columns:
                    conn.execute(text("ALTER TABLE workflow_executions ADD COLUMN last_failure_time TIMESTAMP"))
                if "next_retry_time" not in columns:
                    conn.execute(text("ALTER TABLE workflow_executions ADD COLUMN next_retry_time TIMESTAMP"))
                conn.commit()
    except Exception as e:
        # Non-fatal if table not yet created or columns already exist
        pass
