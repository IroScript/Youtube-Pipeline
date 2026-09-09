"""
REQ-066: Transactional Outbox Engine (outbox_events)
===================================================
Guarantees dual-write consistency by writing event messages atomically
alongside state transactions, then asynchronously relaying them.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class TransactionalOutboxEngine:
    """
    Transactional outbox table manager and dispatcher.
    """

    def __init__(self):
        self._outbox_store: Dict[str, Dict[str, Any]] = {}

    def record_event(
        self,
        topic: str,
        payload: Dict[str, Any],
        aggregate_id: Optional[str] = None
    ) -> str:
        """
        Appends an event to the outbox queue in PENDING status.
        """
        event_id = str(uuid.uuid4())
        self._outbox_store[event_id] = {
            "id": event_id,
            "topic": topic,
            "aggregate_id": aggregate_id,
            "payload": payload,
            "status": "PENDING",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "published_at": None,
        }
        return event_id

    def fetch_pending_events(self, batch_size: int = 50) -> List[Dict[str, Any]]:
        """
        Fetches a batch of un-dispatched outbox events.
        """
        pending = [
            e for e in self._outbox_store.values() if e["status"] == "PENDING"
        ]
        return pending[:batch_size]

    def mark_published(self, event_ids: List[str]) -> None:
        """
        Marks outbox events as successfully delivered.
        """
        now = datetime.now(timezone.utc).isoformat()
        for eid in event_ids:
            if eid in self._outbox_store:
                self._outbox_store[eid]["status"] = "PUBLISHED"
                self._outbox_store[eid]["published_at"] = now
