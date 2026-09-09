"""
REQ-050: Execution Event Journal (execution_events)
==================================================
Append-only immutable event journal tracking all state transitions,
heartbeats, errors, and checkpoints for full auditability and replay.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ExecutionEvent(SQLModel, table=True):
    __tablename__ = "execution_events"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique event UUIDv4 primary key",
    )
    execution_id: str = Field(
        foreign_key="workflow_executions.id",
        index=True,
        nullable=False,
        description="Parent workflow execution identifier",
    )
    step_run_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Associated step run ID if event is step-scoped",
    )
    event_type: str = Field(
        index=True,
        nullable=False,
        description="EXECUTION_CREATED, EXECUTION_STARTED, STEP_SCHEDULED, STEP_STARTED, STEP_SUCCESS, STEP_FAILED, EXECUTION_COMPLETED, CHECKPOINT_SAVED",
    )
    payload: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Structured event metadata and state snapshot",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
