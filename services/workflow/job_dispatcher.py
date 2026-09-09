"""
REQ-090: Distributed Job Dispatcher
===================================
Routes workflow steps to specialized worker queues and assigns scheduling priorities.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List


class JobDispatcher:
    """
    Dispatches ready step executions to their designated worker queues.
    """

    QUEUE_ROUTING_MAP = {
        "llm": "queue.llm",
        "browser": "queue.browser",
        "media": "queue.media",
        "youtube": "queue.youtube",
        "audio": "queue.media",
        "qc": "queue.default",
        "python": "queue.default",
        "gate": "queue.default",
        "export": "queue.default",
        "notification": "queue.default",
        "storage": "queue.default",
        "custom": "queue.default",
    }

    PRIORITY_MAP = {
        "urgent": 100,
        "high": 75,
        "normal": 50,
        "bulk": 10,
    }

    @classmethod
    def resolve_queue(cls, step_type: str) -> str:
        return cls.QUEUE_ROUTING_MAP.get(step_type, "queue.default")

    @classmethod
    def create_job(
        cls,
        step_run_id: str,
        step_key: str,
        step_type: str,
        payload: Dict[str, Any],
        priority_level: str = "normal"
    ) -> Dict[str, Any]:
        """
        Constructs a distributed job dictionary ready for queue ingestion.
        """
        queue_name = cls.resolve_queue(step_type)
        priority = cls.PRIORITY_MAP.get(priority_level, 50)
        job_id = str(uuid.uuid4())

        return {
            "id": job_id,
            "step_run_id": step_run_id,
            "step_key": step_key,
            "step_type": step_type,
            "queue_name": queue_name,
            "priority": priority,
            "status": "QUEUED",
            "worker_id": None,
            "lease_until": None,
            "heartbeat_at": None,
            "payload": payload,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
