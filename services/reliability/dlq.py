"""
REQ-065: Dead Letter Queue (DLQ) Engine
=======================================
Isolates poisoned, permanently failed, or manual-intervention tasks
without stalling other pipeline video productions.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class DeadLetterQueueEngine:
    """
    In-memory / persistence interface for Dead Letter Queue operations.
    """

    def __init__(self):
        self._dlq_store: Dict[str, Dict[str, Any]] = {}

    def enqueue(
        self,
        execution_id: str,
        step_run_id: str,
        error_class: str,
        error_message: str,
        payload: Dict[str, Any],
        stack_trace: Optional[str] = None
    ) -> str:
        dlq_id = str(uuid.uuid4())
        record = {
            "id": dlq_id,
            "execution_id": execution_id,
            "step_run_id": step_run_id,
            "error_class": error_class,
            "error_message": error_message,
            "stack_trace": stack_trace,
            "payload": payload,
            "status": "UNRESOLVED",  # UNRESOLVED, REPLAYED, RESOLVED
            "resolution_note": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._dlq_store[dlq_id] = record
        return dlq_id

    def get(self, dlq_id: str) -> Optional[Dict[str, Any]]:
        return self._dlq_store.get(dlq_id)

    def replay(self, dlq_id: str) -> Dict[str, Any]:
        """
        Prepares a dead-letter item for replay by resetting its status.
        """
        record = self.get(dlq_id)
        if not record:
            raise KeyError(f"Dead letter record {dlq_id} not found")

        record["status"] = "REPLAYED"
        record["updated_at"] = datetime.now(timezone.utc).isoformat()
        return record["payload"]

    def resolve(self, dlq_id: str, note: str) -> Dict[str, Any]:
        """
        Marks dead-letter item as manually resolved or waived.
        """
        record = self.get(dlq_id)
        if not record:
            raise KeyError(f"Dead letter record {dlq_id} not found")

        record["status"] = "RESOLVED"
        record["resolution_note"] = note
        record["updated_at"] = datetime.now(timezone.utc).isoformat()
        return record

    def list_all(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        records = list(self._dlq_store.values())
        if status:
            return [r for r in records if r["status"] == status]
        return records
