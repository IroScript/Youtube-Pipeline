"""
REQ-071: External Effect Reservation Ledger
===========================================
Tracks external side-effect operations to achieve effectively-once guarantees.
States: RESERVED, IN_FLIGHT, COMPLETED, FAILED, UNKNOWN
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ExternalOperation(SQLModel, table=True):
    __tablename__ = "external_operations"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique operation UUIDv4 primary key",
    )
    execution_id: str = Field(
        index=True,
        nullable=False,
        description="Workflow execution ID triggering this effect",
    )
    step_run_id: str = Field(
        index=True,
        nullable=False,
        description="Step run associated with this effect",
    )
    operation_key: str = Field(
        index=True,
        unique=True,
        nullable=False,
        description="Deterministic idempotency key preventing duplicate dispatch",
    )
    provider: str = Field(
        index=True,
        nullable=False,
        description="External provider: 'youtube', 'veo', 'openai', 'anthropic'",
    )
    operation_type: str = Field(
        index=True,
        nullable=False,
        description="Operation type: 'upload_video', 'render_video', 'generate_prompt'",
    )
    request_hash: str = Field(
        index=True,
        nullable=False,
        description="SHA256 of request payload",
    )
    status: str = Field(
        default="RESERVED",
        index=True,
        nullable=False,
        description="RESERVED, IN_FLIGHT, COMPLETED, FAILED, UNKNOWN",
    )
    external_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Remote resource identifier (e.g. YouTube video ID)",
    )
    external_url: Optional[str] = Field(default=None)
    provider_state: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Provider-specific session tokens, upload URIs, or chunk indices",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
