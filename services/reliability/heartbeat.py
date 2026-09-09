"""
REQ-063: Worker Lease Heartbeat Monitor
=======================================
Monitors active worker heartbeats and extends job leases to prevent
accidental orphan reclamation during long-running tasks.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any


class HeartbeatMonitor:
    """
    Manages lease validity, heartbeat timestamps, and timeout renewals.
    """

    DEFAULT_LEASE_DURATION_SECONDS = 60
    HEARTBEAT_INTERVAL_SECONDS = 15

    @classmethod
    def create_lease_window(cls, duration_seconds: int = DEFAULT_LEASE_DURATION_SECONDS) -> datetime:
        return datetime.now(timezone.utc) + timedelta(seconds=duration_seconds)

    @classmethod
    def is_lease_expired(cls, lease_until: Optional[datetime], current_time: Optional[datetime] = None) -> bool:
        if lease_until is None:
            return True
        now = current_time or datetime.now(timezone.utc)
        target = lease_until if lease_until.tzinfo else lease_until.replace(tzinfo=timezone.utc)
        return now >= target

    @classmethod
    def renew_lease(
        cls,
        job_data: Dict[str, Any],
        worker_id: str,
        extension_seconds: int = DEFAULT_LEASE_DURATION_SECONDS
    ) -> Dict[str, Any]:
        """
        Extends lease_until and updates heartbeat_at if worker_id matches.
        """
        if job_data.get("worker_id") != worker_id:
            raise PermissionError(f"Worker {worker_id} does not hold lease for this job")

        now = datetime.now(timezone.utc)
        job_data["heartbeat_at"] = now
        job_data["lease_until"] = now + timedelta(seconds=extension_seconds)
        job_data["updated_at"] = now
        return job_data
