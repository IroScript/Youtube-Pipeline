"""
REQ-091: Immutable Audit Log Ledger (audit_logs)
================================================
Append-only tamper-resistant audit trail recording WHO, WHAT, WHEN,
BEFORE, AFTER, and WHY for all state changes across the ERP platform.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlmodel import Column, Field, JSON, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        index=True,
        description="Unique audit record UUIDv4 primary key",
    )
    actor: str = Field(
        index=True,
        nullable=False,
        description="Actor identity (username, worker_id, or system component)",
    )
    action: str = Field(
        index=True,
        nullable=False,
        description="Action type: CREATE, UPDATE, DELETE, MIGRATE, REPLAY, PAUSE, RESUME",
    )
    entity_type: str = Field(
        index=True,
        nullable=False,
        description="Target entity type: 'workflow', 'execution', 'step_run', 'video', 'asset'",
    )
    entity_id: str = Field(
        index=True,
        nullable=False,
        description="Primary key or UUID of the target entity",
    )
    before_state: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Snapshot of entity state prior to mutation",
    )
    after_state: Dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
        description="Snapshot of entity state after mutation",
    )
    reason: Optional[str] = Field(
        default=None,
        description="Business or technical justification for the change",
    )
    record_hash: Optional[str] = Field(
        default=None,
        index=True,
        description="Cryptographic checksum ensuring record immutability",
    )
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)

    @classmethod
    def compute_record_hash(
        cls,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: str,
        before_state: Dict[str, Any],
        after_state: Dict[str, Any],
        created_at: datetime
    ) -> str:
        payload = {
            "actor": actor,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "before_state": before_state,
            "after_state": after_state,
            "created_at": created_at.isoformat(),
        }
        serialized = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
