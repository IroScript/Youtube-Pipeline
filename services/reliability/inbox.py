"""
REQ-067: Idempotent Inbox Deduplication (inbox_events)
=====================================================
Protects worker consumers from processing duplicate incoming events,
messages, and webhook callbacks.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional


class IdempotentInboxEngine:
    """
    Inbox deduplication manager maintaining processed event identities.
    """

    def __init__(self):
        self._inbox_store: Dict[str, Dict[str, Any]] = {}

    def is_duplicate(self, message_id: str) -> bool:
        return message_id in self._inbox_store

    def record_processed(
        self,
        message_id: str,
        topic: str,
        handler_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        self._inbox_store[message_id] = {
            "message_id": message_id,
            "topic": topic,
            "handler_name": handler_name,
            "metadata": metadata or {},
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

    async def process_once(
        self,
        message_id: str,
        topic: str,
        handler_name: str,
        handler_fn: Callable[[], Any]
    ) -> Any:
        """
        Executes handler_fn only if message_id has not been processed.
        Returns result or existing cached indicator.
        """
        if self.is_duplicate(message_id):
            return {"status": "DUPLICATE_SKIPPED", "message_id": message_id}

        result = await handler_fn() if callable(handler_fn) else None
        self.record_processed(message_id, topic, handler_name)
        return {"status": "PROCESSED", "result": result}
