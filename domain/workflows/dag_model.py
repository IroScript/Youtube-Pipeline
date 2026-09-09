"""
REQ-045: Workflow Graph DAG Model (workflow_steps)
=================================================
Represents individual step nodes, execution configurations, conditions,
and DAG dependencies within an immutable workflow version.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WorkflowStep(SQLModel, table=True):
    __tablename__ = "workflow_steps"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique UUIDv4 primary key string",
    )
    workflow_version_id: str = Field(
        foreign_key="workflow_versions.id",
        index=True,
        nullable=False,
        description="Foreign key to immutable workflow version",
    )
    step_key: str = Field(
        index=True,
        nullable=False,
        description="Canonical stable step identifier (e.g. 'research', 'script', 'seo', 'audio', 'video', 'qc', 'upload')",
    )
    step_type: str = Field(
        nullable=False,
        index=True,
        description="Handler type: 'llm', 'browser', 'media', 'youtube', 'python', 'qc', 'gate'",
    )
    display_name: str = Field(
        nullable=False,
        description="Human friendly label for UI/ERP",
    )
    position: int = Field(
        default=0,
        nullable=False,
        description="Sequence index for linear ordering and UI display",
    )
    enabled: bool = Field(
        default=True,
        nullable=False,
        description="Flag to dynamically enable/disable step without deletion",
    )
    depends_on: List[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
        description="List of step_keys that must successfully complete before this step",
    )
    condition: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
        description="Predicate condition expression to dynamically run or skip step",
    )
    config: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Step configuration parameters (template_id, model, prompt_level, etc.)",
    )
    retry_policy: Dict[str, Any] = Field(
        default_factory=lambda: {
            "max_attempts": 3,
            "initial_delay_seconds": 5,
            "max_delay_seconds": 300,
            "backoff": "exponential",
            "jitter": True,
        },
        sa_column=Column(JSON, nullable=False),
        description="Retry policy config: max_attempts, backoff, jitter",
    )
    timeout_seconds: int = Field(
        default=300,
        nullable=False,
        description="Maximum execution timeout in seconds",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
