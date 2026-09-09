"""
REQ-044: Immutable Workflow Versions Model (workflow_versions)
=============================================================
Manages versioned, immutable definitions of workflows.
Status: 'draft', 'published', 'deprecated'.
Rule: Once 'published', a version must never be altered (immutability lock).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WorkflowVersion(SQLModel, table=True):
    __tablename__ = "workflow_versions"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique UUIDv4 primary key string",
    )
    workflow_id: str = Field(
        foreign_key="workflows.id",
        index=True,
        nullable=False,
        description="Parent workflow foreign key",
    )
    version_number: int = Field(
        nullable=False,
        index=True,
        description="Sequential version number",
    )
    status: str = Field(
        default="draft",
        index=True,
        nullable=False,
        description="Status: 'draft', 'published', 'deprecated'",
    )
    definition: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Complete JSON DAG definition and steps configuration",
    )
    definition_hash: Optional[str] = Field(
        default=None,
        index=True,
        description="SHA256 hash of definition JSON for immutability check",
    )
    changelog: Optional[str] = Field(
        default=None,
        description="Human-readable changelog for this version",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    published_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when version was locked and published",
    )
