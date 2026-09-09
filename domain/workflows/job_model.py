"""
REQ-049: Distributed Job Leases (jobs, job_leases)
=================================================
Manages distributed worker queue leases, heartbeats, and queue priorities.
Statuses: QUEUED, LEASED, COMPLETED, EXPIRED, DEAD_LETTER
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique job UUIDv4 primary key",
    )
    step_run_id: str = Field(
        foreign_key="step_runs.id",
        index=True,
        nullable=False,
        description="Associated step run",
    )
    queue_name: str = Field(
        default="queue.default",
        index=True,
        nullable=False,
        description="Worker queue name, e.g. 'queue.llm', 'queue.browser', 'queue.media', 'queue.youtube'",
    )
    priority: int = Field(
        default=50,
        index=True,
        nullable=False,
        description="Scheduling priority (higher value = higher priority)",
    )
    status: str = Field(
        default="QUEUED",
        index=True,
        nullable=False,
        description="QUEUED, LEASED, COMPLETED, EXPIRED, DEAD_LETTER",
    )
    worker_id: Optional[str] = Field(
        default=None,
        index=True,
        description="ID of worker currently holding the lease",
    )
    lease_until: Optional[datetime] = Field(
        default=None,
        index=True,
        description="Lease expiration timestamp; expired leases can be claimed by other workers",
    )
    heartbeat_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp of last worker heartbeat",
    )
    payload: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Task payload passed to the distributed worker",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
