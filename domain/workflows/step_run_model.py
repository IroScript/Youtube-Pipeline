"""
REQ-047: Step Run Model (step_runs)
==================================
Represents the logical execution run of a single step within a workflow execution.
Statuses: PENDING, READY, RUNNING, RETRY_WAIT, SUCCESS, FAILED, SKIPPED, CANCELLED
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StepRun(SQLModel, table=True):
    __tablename__ = "step_runs"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique step run UUIDv4 primary key",
    )
    execution_id: str = Field(
        foreign_key="workflow_executions.id",
        index=True,
        nullable=False,
        description="Parent workflow execution ID",
    )
    step_key: str = Field(
        index=True,
        nullable=False,
        description="Canonical step key identifier",
    )
    step_type: str = Field(
        nullable=False,
        description="Step executor type",
    )
    status: str = Field(
        default="PENDING",
        index=True,
        nullable=False,
        description="PENDING, READY, RUNNING, RETRY_WAIT, SUCCESS, FAILED, SKIPPED, CANCELLED",
    )
    input_data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Resolved input data passed to this step",
    )
    output_data: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Persisted output data produced by this step upon SUCCESS",
    )
    input_hash: Optional[str] = Field(
        default=None,
        index=True,
        description="SHA256 hash of input_data for cache reuse checking",
    )
    config_hash: Optional[str] = Field(
        default=None,
        index=True,
        description="SHA256 hash of step config for cache reuse checking",
    )
    output_hash: Optional[str] = Field(
        default=None,
        index=True,
        description="SHA256 hash of output_data for artifact verification",
    )
    attempt_count: int = Field(default=0, nullable=False)
    max_attempts: int = Field(default=3, nullable=False)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
