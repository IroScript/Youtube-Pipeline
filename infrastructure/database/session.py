"""
Database Session Management & Transaction Providers
===================================================
Provides transactional sessions for services, CLI drivers, and FastAPI dependency injection.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator
from sqlmodel import Session
from infrastructure.database.engine import engine


@contextmanager
def get_session(custom_engine=None) -> Generator[Session, None, None]:
    """
    Context manager for transactional database sessions.
    Automatically commits on clean exit, rolls back on exceptions.
    """
    active_engine = custom_engine or engine
    session = Session(active_engine)
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency injection provider for HTTP request-scoped database sessions.
    """
    with get_session() as session:
        yield session
