"""
REQ-048: Step Attempt History Model (step_attempts)
==================================================
Records physical execution attempts of a step run, including failures,
worker IDs, latency, and error classification.
Statuses: STARTED, SUCCESS, FAILED, TIMEOUT, CANCELLED, UNKNOWN
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StepAttempt(SQLModel, table=True):
    __tablename__ = "step_attempts"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique attempt UUIDv4 primary key",
    )
    step_run_id: str = Field(
        foreign_key="step_runs.id",
        index=True,
        nullable=False,
        description="Parent step run foreign key",
    )
    attempt_number: int = Field(nullable=False, index=True)
    worker_id: Optional[str] = Field(default=None, index=True)
    status: str = Field(
        default="STARTED",
        index=True,
        nullable=False,
        description="STARTED, SUCCESS, FAILED, TIMEOUT, CANCELLED, UNKNOWN",
    )
    error_class: Optional[str] = Field(
        default=None,
        index=True,
        description="Granular category: NETWORK_TRANSIENT, TIMEOUT, RATE_LIMIT, BROWSER_CRASH, INVALID_INPUT, BUG",
    )
    error_message: Optional[str] = Field(default=None)
    stack_trace: Optional[str] = Field(default=None)
    execution_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Diagnostics payload (memory, latency, retry count, etc.)",
    )
    started_at: datetime = Field(default_factory=_utcnow, nullable=False)
    completed_at: Optional[datetime] = Field(default=None)
