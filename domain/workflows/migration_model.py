"""
REQ-051: Workflow Migration Log (workflow_migrations)
====================================================
Maintains audit trail when an active or suspended execution is migrated
from Workflow Version A to Workflow Version B.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WorkflowMigration(SQLModel, table=True):
    __tablename__ = "workflow_migrations"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique migration log UUIDv4 primary key",
    )
    execution_id: str = Field(
        foreign_key="workflow_executions.id",
        index=True,
        nullable=False,
        description="Execution ID being migrated",
    )
    from_version_id: str = Field(
        nullable=False,
        index=True,
        description="Source workflow version ID",
    )
    to_version_id: str = Field(
        nullable=False,
        index=True,
        description="Target workflow version ID",
    )
    reused_step_keys: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
        description="List of step keys successfully reused from prior checkpoints",
    )
    rerun_step_keys: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
        description="List of step keys requiring re-execution under new version",
    )
    skipped_step_keys: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
        description="List of step keys omitted in new version",
    )
    status: str = Field(
        default="STARTED",
        index=True,
        nullable=False,
        description="STARTED, COMPLETED, FAILED",
    )
    migration_notes: Optional[str] = Field(
        default=None,
        description="Diagnostic notes or failure details",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    completed_at: Optional[datetime] = Field(default=None)
