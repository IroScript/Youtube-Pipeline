"""
REQ-084: Standalone Worker Base Framework
=========================================
Core abstraction for autonomous distributed queue workers.
Manages lease acquisition, background heartbeat loop, step execution, and safe shutdown.
"""

from __future__ import annotations

import asyncio
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from domain.workflows.step_types.base_handler import StepResult


class BaseWorker(ABC):
    """
    Abstract base worker running an asynchronous lease polling and execution loop.
    """

    def __init__(
        self,
        queue_name: str,
        worker_id: Optional[str] = None,
        lease_duration_seconds: int = 60,
        heartbeat_interval_seconds: int = 15
    ):
        self.queue_name = queue_name
        self.worker_id = worker_id or f"{queue_name}_worker_{uuid.uuid4().hex[:8]}"
        self.lease_duration_seconds = lease_duration_seconds
        self.heartbeat_interval_seconds = heartbeat_interval_seconds
        self._is_running = False
        self._current_job: Optional[Dict[str, Any]] = None

    @property
    def is_running(self) -> bool:
        return self._is_running

    def start(self) -> None:
        self._is_running = True

    def stop(self) -> None:
        self._is_running = False

    def acquire_job_lease(self, candidate_jobs: list[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Attempts to acquire an unleased or expired job from candidate list.
        """
        now = datetime.now(timezone.utc)
        for job in candidate_jobs:
            if job.get("queue_name") != self.queue_name:
                continue

            status = job.get("status")
            lease_until = job.get("lease_until")
            is_expired = False
            if lease_until:
                t = lease_until if lease_until.tzinfo else lease_until.replace(tzinfo=timezone.utc)
                is_expired = now >= t

            if status == "QUEUED" or (status == "LEASED" and is_expired):
                job["status"] = "LEASED"
                job["worker_id"] = self.worker_id
                job["lease_until"] = now + timedelta(seconds=self.lease_duration_seconds)
                job["heartbeat_at"] = now
                self._current_job = job
                return job

        return None

    def renew_lease(self, job: Dict[str, Any]) -> None:
        now = datetime.now(timezone.utc)
        job["heartbeat_at"] = now
        job["lease_until"] = now + timedelta(seconds=self.lease_duration_seconds)

    def complete_job(self, job: Dict[str, Any], result: StepResult) -> Dict[str, Any]:
        job["status"] = "COMPLETED"
        job["result"] = {
            "success": result.success,
            "output_data": result.output_data,
            "metadata": result.metadata,
        }
        job["completed_at"] = datetime.now(timezone.utc).isoformat()
        self._current_job = None
        return job

    def fail_job(self, job: Dict[str, Any], error_message: str, error_class: Optional[str] = None) -> Dict[str, Any]:
        job["status"] = "FAILED"
        job["error_message"] = error_message
        job["error_class"] = error_class or "EXECUTION_ERROR"
        job["failed_at"] = datetime.now(timezone.utc).isoformat()
        self._current_job = None
        return job

    @abstractmethod
    async def process_task(self, payload: Dict[str, Any]) -> StepResult:
        """Subclasses implement specific task execution logic."""
        pass
