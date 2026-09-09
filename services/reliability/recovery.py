"""
REQ-064: Orphaned Job Recovery Engine
=====================================
Scans distributed queues for dead worker leases, automatically recovers
orphaned jobs, and re-queues them or escalates to the Dead Letter Queue.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple
from services.reliability.heartbeat import HeartbeatMonitor


class OrphanRecoveryEngine:
    """
    Detects expired worker leases and safely redistributes work.
    """

    @classmethod
    def reclaim_orphaned_jobs(
        cls,
        jobs: List[Dict[str, Any]],
        max_attempts: int = 3,
        now: datetime | None = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Processes list of jobs, identifying expired leases.
        Returns:
            (requeued_jobs, dead_lettered_jobs)
        """
        current_time = now or datetime.now(timezone.utc)
        requeued = []
        dead_lettered = []

        for job in jobs:
            if job.get("status") != "LEASED":
                continue

            lease_until = job.get("lease_until")
            if HeartbeatMonitor.is_lease_expired(lease_until, current_time):
                attempts = job.get("attempts", 0) + 1
                job["attempts"] = attempts

                if attempts >= max_attempts:
                    job["status"] = "DEAD_LETTER"
                    job["worker_id"] = None
                    job["recovery_note"] = f"Exceeded max attempts ({max_attempts}) after worker timeout"
                    dead_lettered.append(job)
                else:
                    job["status"] = "QUEUED"
                    job["worker_id"] = None
                    job["lease_until"] = None
                    job["recovery_note"] = f"Orphaned lease reclaimed on attempt {attempts}"
                    requeued.append(job)

        return requeued, dead_lettered
