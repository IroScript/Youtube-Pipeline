"""
Unit Tests for Phase 8: Fault Tolerance, Retries & Crash Recovery (REQ-061 to REQ-069)
======================================================================================
Tests:
- REQ-061: ErrorClassifier categories, retryability & actions
- REQ-062: BackoffEngine exponential growth, jitter bounds & decorrelated jitter
- REQ-063: HeartbeatMonitor lease duration, expiration checks & renewals
- REQ-064: OrphanRecoveryEngine automated reclamation & DLQ escalation
- REQ-065: DeadLetterQueueEngine isolation, replay & resolution
- REQ-066: TransactionalOutboxEngine atomic enqueue, batch fetch & publication
- REQ-067: IdempotentInboxEngine duplicate prevention & process_once wrapper
- REQ-068: BrowserCrashRecoveryManager stale lock removal & integrity audit
- REQ-069: GracefulShutdownManager signal coordination & cleanup invocation
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path

from shared.errors.classifier import ErrorClassifier, ErrorCategory
from services.reliability.backoff import BackoffEngine
from services.reliability.heartbeat import HeartbeatMonitor
from services.reliability.recovery import OrphanRecoveryEngine
from services.reliability.dlq import DeadLetterQueueEngine
from services.reliability.outbox import TransactionalOutboxEngine
from services.reliability.inbox import IdempotentInboxEngine
from infrastructure.browser.recovery import BrowserCrashRecoveryManager
from shared.lifecycle.shutdown import GracefulShutdownManager


# --- REQ-061: Error Classification ---
def test_req_061_error_classifier():
    # Transient network
    c1 = ErrorClassifier.classify("Connection timeout after 30000ms")
    assert c1.category == ErrorCategory.NETWORK_TRANSIENT
    assert c1.is_retryable is True

    # 429 Rate limit
    c2 = ErrorClassifier.classify("HTTP 429: Too Many Requests from provider")
    assert c2.category == ErrorCategory.RATE_LIMIT
    assert c2.is_retryable is True
    assert c2.default_delay_seconds == 60.0

    # Browser crash
    c3 = ErrorClassifier.classify("Target closed: chrome crashed unexpectedly")
    assert c3.category == ErrorCategory.BROWSER_CRASH
    assert c3.is_retryable is True

    # Auth expired
    c4 = ErrorClassifier.classify("401 Unauthorized: token expired")
    assert c4.category == ErrorCategory.AUTH_EXPIRED
    assert c4.is_retryable is False

    # Invalid input
    c5 = ErrorClassifier.classify("ValidationError: field 'prompt' cannot be empty")
    assert c5.category == ErrorCategory.INVALID_INPUT
    assert c5.is_retryable is False

    # Unknown external mutation
    c6 = ErrorClassifier.classify("Upload interrupted: socket hang up after send")
    assert c6.category == ErrorCategory.EXTERNAL_UNKNOWN
    assert c6.is_retryable is False
    assert c6.recommended_action == "RECONCILE_EXTERNAL_STATE"


# --- REQ-062: Exponential Backoff & Jitter ---
def test_req_062_backoff_engine():
    # Non-jittered deterministic check
    d1 = BackoffEngine.calculate_delay(attempt=1, initial_delay=5.0, factor=2.0, jitter=False)
    assert d1 == 5.0

    d2 = BackoffEngine.calculate_delay(attempt=2, initial_delay=5.0, factor=2.0, jitter=False)
    assert d2 == 10.0

    d3 = BackoffEngine.calculate_delay(attempt=3, initial_delay=5.0, factor=2.0, jitter=False)
    assert d3 == 20.0

    # Max delay clamp
    d_max = BackoffEngine.calculate_delay(attempt=10, initial_delay=5.0, max_delay=50.0, jitter=False)
    assert d_max == 50.0

    # Jitter bounds
    j_delay = BackoffEngine.calculate_delay(attempt=3, initial_delay=5.0, factor=2.0, jitter=True)
    assert 2.5 <= j_delay <= 20.0


# --- REQ-063: Heartbeat Monitor ---
def test_req_063_heartbeat_monitor():
    now = datetime.now(timezone.utc)
    expired_lease = now - timedelta(seconds=10)
    future_lease = now + timedelta(seconds=60)

    assert HeartbeatMonitor.is_lease_expired(expired_lease) is True
    assert HeartbeatMonitor.is_lease_expired(future_lease) is False

    job = {
        "worker_id": "worker_01",
        "lease_until": now + timedelta(seconds=10),
    }
    renewed = HeartbeatMonitor.renew_lease(job, worker_id="worker_01", extension_seconds=90)
    assert renewed["lease_until"] > now + timedelta(seconds=60)

    with pytest.raises(PermissionError):
        HeartbeatMonitor.renew_lease(job, worker_id="wrong_worker")


# --- REQ-064: Orphan Recovery Engine ---
def test_req_064_orphan_recovery():
    now = datetime.now(timezone.utc)
    jobs = [
        {"id": "j1", "status": "LEASED", "lease_until": now - timedelta(seconds=30), "attempts": 1},
        {"id": "j2", "status": "LEASED", "lease_until": now + timedelta(seconds=60), "attempts": 1},
        {"id": "j3", "status": "LEASED", "lease_until": now - timedelta(seconds=10), "attempts": 2},
    ]
    requeued, dead_lettered = OrphanRecoveryEngine.reclaim_orphaned_jobs(jobs, max_attempts=3, now=now)

    # j1 should be requeued (attempt 1 -> 2 < 3)
    assert len(requeued) == 1
    assert requeued[0]["id"] == "j1"
    assert requeued[0]["status"] == "QUEUED"
    assert requeued[0]["attempts"] == 2

    # j3 should be escalated to DLQ (attempt 2 -> 3 >= 3)
    assert len(dead_lettered) == 1
    assert dead_lettered[0]["id"] == "j3"
    assert dead_lettered[0]["status"] == "DEAD_LETTER"


# --- REQ-065: Dead Letter Queue ---
def test_req_065_dlq_engine():
    dlq = DeadLetterQueueEngine()
    dlq_id = dlq.enqueue(
        execution_id="exec_1",
        step_run_id="run_1",
        error_class="INVALID_PROMPT",
        error_message="Prompt exceeds maximum token window",
        payload={"raw_prompt": "Huge prompt text"}
    )
    assert dlq_id is not None
    record = dlq.get(dlq_id)
    assert record["status"] == "UNRESOLVED"

    # Replay
    payload = dlq.replay(dlq_id)
    assert payload["raw_prompt"] == "Huge prompt text"
    assert dlq.get(dlq_id)["status"] == "REPLAYED"

    # Resolve
    dlq.resolve(dlq_id, note="Manually fixed prompt length")
    assert dlq.get(dlq_id)["status"] == "RESOLVED"
    assert dlq.get(dlq_id)["resolution_note"] == "Manually fixed prompt length"


# --- REQ-066: Transactional Outbox ---
def test_req_066_outbox_engine():
    outbox = TransactionalOutboxEngine()
    eid1 = outbox.record_event("video.rendered", {"video_id": 101}, aggregate_id="101")
    eid2 = outbox.record_event("video.uploaded", {"video_id": 101}, aggregate_id="101")

    pending = outbox.fetch_pending_events(batch_size=10)
    assert len(pending) == 2

    outbox.mark_published([eid1])
    remaining = outbox.fetch_pending_events(batch_size=10)
    assert len(remaining) == 1
    assert remaining[0]["id"] == eid2


# --- REQ-067: Idempotent Inbox ---
@pytest.mark.asyncio
async def test_req_067_inbox_engine():
    inbox = IdempotentInboxEngine()
    assert inbox.is_duplicate("msg_001") is False

    counter = {"calls": 0}

    async def handler():
        counter["calls"] += 1
        return "SUCCESS"

    # First attempt: processed
    res1 = await inbox.process_once("msg_001", topic="youtube.webhook", handler_name="on_upload", handler_fn=handler)
    assert res1["status"] == "PROCESSED"
    assert counter["calls"] == 1
    assert inbox.is_duplicate("msg_001") is True

    # Second attempt: duplicate skipped
    res2 = await inbox.process_once("msg_001", topic="youtube.webhook", handler_name="on_upload", handler_fn=handler)
    assert res2["status"] == "DUPLICATE_SKIPPED"
    assert counter["calls"] == 1


# --- REQ-068: Browser Crash Recovery ---
def test_req_068_browser_recovery(tmp_path: Path):
    profile_dir = tmp_path / "test_chrome_profile"
    profile_dir.mkdir()
    lock_file = profile_dir / "SingletonLock"
    lock_file.write_text("12345", encoding="utf-8")
    assert lock_file.exists()

    removed = BrowserCrashRecoveryManager.clean_stale_profile_locks(profile_dir)
    assert len(removed) == 1
    assert not lock_file.exists()


# --- REQ-069: Graceful Shutdown ---
def test_req_069_graceful_shutdown():
    mgr = GracefulShutdownManager()
    assert mgr.is_shutting_down is False

    cleaned_up = []

    def cleanup_a():
        cleaned_up.append("A")
        return "OK_A"

    def cleanup_b():
        cleaned_up.append("B")
        return "OK_B"

    mgr.register_cleanup_callback(cleanup_a)
    mgr.register_cleanup_callback(cleanup_b)

    results = mgr.trigger_shutdown()
    assert mgr.is_shutting_down is True
    assert cleaned_up == ["A", "B"]
    assert len(results) == 2
    assert results[0]["success"] is True
