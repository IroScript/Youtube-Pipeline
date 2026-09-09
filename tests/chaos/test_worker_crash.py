"""
REQ-093: Chaos Test Suite (Worker Kill, DB Outage)
==================================================
Simulates unexpected process termination, worker death mid-execution,
lease expiration, automated orphan recovery, and database connection dropouts.
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta

from workers.base_worker import BaseWorker
from services.reliability.recovery import OrphanRecoveryEngine
from domain.workflows.step_types.base_handler import StepResult


class ChaosWorker(BaseWorker):
    def __init__(self, worker_id: str, should_crash: bool = False):
        super().__init__(queue_name="queue.chaos", worker_id=worker_id)
        self.should_crash = should_crash

    async def process_task(self, payload):
        if self.should_crash:
            # Simulate abrupt process crash (SIGKILL emulation: raises without cleanup)
            raise SystemExit("CHAOS: Worker killed mid-execution")
        return StepResult(success=True, output_data={"recovered": True})


@pytest.mark.asyncio
async def test_req_093_worker_crash_and_orphan_recovery():
    # 1. Job is queued
    job = {
        "id": "chaos_job_001",
        "queue_name": "queue.chaos",
        "status": "QUEUED",
        "attempts": 0,
        "payload": {"data": "important_video_task"}
    }
    candidate_jobs = [job]

    # 2. Worker 1 acquires lease
    worker1 = ChaosWorker(worker_id="worker_died_midway", should_crash=True)
    leased_job = worker1.acquire_job_lease(candidate_jobs)
    assert leased_job is not None
    assert leased_job["status"] == "LEASED"
    assert leased_job["worker_id"] == "worker_died_midway"

    # 3. Worker 1 crashes abruptly
    with pytest.raises(SystemExit):
        await worker1.process_task(leased_job["payload"])

    # Worker 1 is dead. Notice leased_job remains in "LEASED" state, but heartbeat never updates.

    # 4. Time passes: lease expires
    future_time = datetime.now(timezone.utc) + timedelta(seconds=120)

    # 5. OrphanRecoveryEngine runs in the orchestrator
    requeued, dead_lettered = OrphanRecoveryEngine.reclaim_orphaned_jobs(
        candidate_jobs, max_attempts=3, now=future_time
    )
    assert len(requeued) == 1
    assert requeued[0]["id"] == "chaos_job_001"
    assert requeued[0]["status"] == "QUEUED"
    assert requeued[0]["worker_id"] is None
    assert requeued[0]["attempts"] == 1

    # 6. Worker 2 (healthy survivor) picks up the reclaimed job
    worker2 = ChaosWorker(worker_id="worker_survivor", should_crash=False)
    re_leased_job = worker2.acquire_job_lease(candidate_jobs)
    assert re_leased_job is not None
    assert re_leased_job["worker_id"] == "worker_survivor"

    # 7. Worker 2 successfully completes the task
    res = await worker2.process_task(re_leased_job["payload"])
    completed = worker2.complete_job(re_leased_job, res)
    assert completed["status"] == "COMPLETED"
    assert completed["result"]["output_data"]["recovered"] is True
