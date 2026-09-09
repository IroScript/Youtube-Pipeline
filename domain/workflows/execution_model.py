"""
REQ-046: Execution State Model (workflow_executions)
===================================================
Tracks the live and historical execution lifecycle of a workflow instance.
Statuses: CREATED, QUEUED, RUNNING, PAUSED, MIGRATING, COMPLETED, FAILED, DEAD_LETTER, CANCELLED
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WorkflowExecution(SQLModel, table=True):
    __tablename__ = "workflow_executions"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique execution UUIDv4 primary key",
    )
    workflow_version_id: Optional[str] = Field(
        default=None,
        foreign_key="workflow_versions.id",
        index=True,
        nullable=True,
        description="Frozen workflow version targeted by this execution",
    )
    idea_id: Optional[int] = Field(
        default=None,
        index=True,
        description="Legacy or canonical idea reference ID",
    )
    video_id: Optional[int] = Field(
        default=None,
        index=True,
        description="Associated video entity ID",
    )
    channel_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Target YouTube channel ID",
    )
    status: str = Field(
        default="CREATED",
        index=True,
        nullable=False,
        description="CREATED, QUEUED, RUNNING, PAUSED, SUCCESS, FAILED, RETRY_WAIT, CANCELLED",
    )
    attempt_count: int = Field(
        default=0,
        nullable=False,
        description="Current attempt counter for failure retries",
    )
    max_attempts: int = Field(
        default=3,
        nullable=False,
        description="Maximum attempts allowed before permanent failure",
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Last recorded failure error message",
    )
    last_failure_time: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the most recent failure",
    )
    next_retry_time: Optional[datetime] = Field(
        default=None,
        description="Timestamp when the next retry attempt is scheduled after backoff",
    )
    definition_snapshot: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Frozen immutable snapshot of workflow definition at launch time",
    )
    context_data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Shared state dictionary passing outputs between steps",
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        unique=True,
        index=True,
        description="Unique deduplication key preventing duplicate executions",
    )
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    error_summary: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
