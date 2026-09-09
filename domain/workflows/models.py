"""
REQ-043: Workflow Definitions Model (workflows)
==============================================
Defines the canonical root entity for content production workflows.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Workflow(SQLModel, table=True):
    __tablename__ = "workflows"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique UUIDv4 primary key string",
    )
    name: str = Field(
        index=True,
        unique=True,
        nullable=False,
        description="Logical workflow identifier name",
    )
    description: Optional[str] = Field(
        default=None,
        description="Detailed description of the workflow purpose",
    )
    channel_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Channel ID associated with this workflow",
    )
    content_type: str = Field(
        default="shorts",
        index=True,
        description="Type of content, e.g. 'shorts', 'longform'",
    )
    active_version_id: Optional[str] = Field(
        default=None,
        description="Points to currently active published workflow version",
    )
    is_active: bool = Field(
        default=True,
        index=True,
        description="Soft-activation flag for workflow",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
