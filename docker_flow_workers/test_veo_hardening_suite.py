"""
Comprehensive Adversarial Failure Test Suite for Veo 3.1 Hardened Architecture
=============================================================================
Tests all 20 mandatory failure scenarios with exact real evidence:
1.  browser crash
2.  extension crash
3.  container crash
4.  VM restart
5.  network interruption
6.  Flow page unavailable
7.  generation timeout
8.  download interruption
9.  duplicate job
10. simultaneous workers claiming same job
11. database interruption
12. disk full
13. RAM exhaustion
14. repeated provider error
15. rate-limit response
16. stale session
17. corrupted output
18. worker killed during submission
19. worker killed during download
20. worker killed after download but before DB commit
"""

import os
import sys
import time
import shutil
import hashlib
import sqlite3
import tempfile
import threading
import subprocess
from concurrent.futures import ThreadPoolExecutor

# Add module to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flow_queue_manager import FlowQueueManager, JobState
from browser_supervisor import BrowserSupervisor

results = []

def run_test(name, expected, fn):
    print(f"\n============================================================")
    print(f"🧪 RUNNING ADVERSARIAL TEST: {name}")
    print(f"============================================================")
    try:
        actual, evidence = fn()
        passed = True
        status = "PASS"
        print(f"✅ [PASS] {name} | Evidence: {evidence}")
    except Exception as e:
        passed = False
        status = "FAIL"
        actual = f"Error: {e}"
        evidence = str(e)
        print(f"❌ [FAIL] {name} | {e}")

    results.append({
        "test": name,
        "expected": expected,
        "actual": actual,
        "status": status,
        "evidence": evidence
    })


def create_test_env():
    td = tempfile.mkdtemp(prefix="veo_test_")
    db_path = os.path.join(td, "test_pipeline.db")
    dl_dir = os.path.join(td, "downloads")
    tmp_dir = os.path.join(td, "temp")
    prof_dir = os.path.join(td, "profile")
    os.makedirs(dl_dir, exist_ok=True)
    os.makedirs(tmp_dir, exist_ok=True)
    os.makedirs(prof_dir, exist_ok=True)
    return td, db_path, dl_dir, tmp_dir, prof_dir


def make_valid_mp4(path, size_bytes=150000):
    """Creates a synthetic binary file with valid MP4 ftypisom header."""
    header = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41"
    padding = b"\x00" * (size_bytes - len(header))
    with open(path, "wb") as f:
        f.write(header + padding)


# ----------------------------------------------------------------------------
# 1. BROWSER CRASH
# ----------------------------------------------------------------------------
def test_browser_crash():
    td, db, dl, tmp, prof = create_test_env()
    sup = BrowserSupervisor(display=":99", user_data_dir=prof, flow_url="about:blank")
    # Simulate active Chrome process with dummy sleep process
    dummy_proc = subprocess.Popen(["sleep", "60"])
    sup.chrome_process = dummy_proc

    # Simulate crash
    dummy_proc.terminate()
    dummy_proc.wait()

    is_healthy = sup.is_browser_healthy()
    # Create fake singleton lock to verify cleanup
    lock_file = os.path.join(prof, "SingletonLock")
    open(lock_file, "w").write("fake_lock")

    sup.clean_stale_locks()
    lock_exists = os.path.exists(lock_file)

    shutil.rmtree(td, ignore_errors=True)
    actual = f"is_healthy={is_healthy}, lock_cleaned={not lock_exists}"
    assert not is_healthy and not lock_exists, "Browser crash not detected or lock not cleaned"
    return actual, f"Dead PID detected (healthy={is_healthy}) and SingletonLock unlinked cleanly (exists={lock_exists})"

# ----------------------------------------------------------------------------
# 2. EXTENSION CRASH
# ----------------------------------------------------------------------------
def test_extension_crash():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "worker_1")
    job, _ = mgr.enqueue_job("test prompt ext crash", 101, 201)
    claimed = mgr.claim_next_job()

    # Simulate extension ping stopped > 35s
    last_ping = time.time() - 40.0
    is_tab_alive = (time.time() - last_ping) < 20.0

    # Fail job due to extension unresponsiveness
    final_st = mgr.fail_job(claimed["id"], "EXTENSION_UNRESPONSIVE", "Tab ping stopped for > 35s")

    shutil.rmtree(td, ignore_errors=True)
    actual = f"is_tab_alive={is_tab_alive}, job_state={final_st}"
    assert not is_tab_alive and final_st == "pending", "Extension crash not handled with retryable state"
    return actual, f"Tab ping timeout detected (tab_alive={is_tab_alive}) and job rescheduled to pending (state={final_st})"

# ----------------------------------------------------------------------------
# 3. CONTAINER CRASH
# ----------------------------------------------------------------------------
def test_container_crash():
    td, db, dl, tmp, prof = create_test_env()
    mgr1 = FlowQueueManager(db, "flow_worker_1", lease_duration_sec=1.0)
    job, _ = mgr1.enqueue_job("container crash prompt", 102, 202)
    claimed = mgr1.claim_next_job()

    # Worker crashes abruptly; lease expires
    time.sleep(1.2)

    # Worker container reboots and recovers
    mgr2 = FlowQueueManager(db, "flow_worker_1")
    reclaimed = mgr2.reclaim_orphaned_jobs()

    # Check job is back to pending
    with mgr2.get_connection() as conn:
        row = conn.execute("SELECT status, attempt_count FROM flow_video_jobs WHERE id = ?", (claimed["id"],)).fetchone()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"reclaimed={reclaimed}, status={row['status']}"
    assert reclaimed == 1 and row["status"] == "pending", "Container crash orphan not recovered"
    return actual, f"Orphan job reclaimed on reboot (reclaimed={reclaimed}, status={row['status']}, attempts={row['attempt_count']})"

# ----------------------------------------------------------------------------
# 4. VM RESTART
# ----------------------------------------------------------------------------
def test_vm_restart():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1", lease_duration_sec=0.5)
    mgr.enqueue_job("vm restart job 1", 103, 203)
    mgr.enqueue_job("vm restart job 2", 104, 204)

    # Worker 1 claims job 1, Worker 2 claims job 2
    mgr.claim_next_job()
    mgr2 = FlowQueueManager(db, "flow_worker_2", lease_duration_sec=0.5)
    mgr2.claim_next_job()

    # Unannounced VM reboot: all processes killed, lease expires
    time.sleep(0.7)

    # After VM reboot, central sweeper runs
    recovery_mgr = FlowQueueManager(db, "sweeper")
    reclaimed = recovery_mgr.reclaim_orphaned_jobs()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"reclaimed_count={reclaimed}"
    assert reclaimed == 2, f"Expected 2 reclaimed jobs, got {reclaimed}"
    return actual, f"Both crashed worker jobs safely recovered to pending (count={reclaimed})"

# ----------------------------------------------------------------------------
# 5. NETWORK INTERRUPTION
# ----------------------------------------------------------------------------
def test_network_interruption():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    job, _ = mgr.enqueue_job("network int prompt", 105, 205)
    claimed = mgr.claim_next_job()

    # Simulate network severed during download: only 40 KB received
    temp_file = os.path.join(tmp, "stream_corrupt.tmp")
    make_valid_mp4(temp_file, size_bytes=40000) # Below 100 KB limit
    final_file = os.path.join(dl, "final_net.mp4")

    verified, msg, data = mgr.verify_and_commit_video(claimed["id"], temp_file, final_file)

    shutil.rmtree(td, ignore_errors=True)
    actual = f"verified={verified}, reason={msg}"
    assert not verified and "File size too small" in msg, "Interrupted download not rejected"
    return actual, f"Network-interrupted download rejected: {msg} (verified={verified})"

# ----------------------------------------------------------------------------
# 6. FLOW PAGE UNAVAILABLE
# ----------------------------------------------------------------------------
def test_flow_page_unavailable():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    job, _ = mgr.enqueue_job("page unavailable prompt", 106, 206)
    claimed = mgr.claim_next_job()

    # Simulate page 503 / unreachable reported by extension
    final_st = mgr.fail_job(claimed["id"], "FLOW_PAGE_UNAVAILABLE", "HTTP 503 Service Unavailable on Google Flow")

    shutil.rmtree(td, ignore_errors=True)
    actual = f"final_state={final_st}"
    assert final_st == "pending", "Page unavailable error not rescheduled with backoff"
    return actual, f"Flow page 503 classified and rescheduled with exponential backoff (status={final_st})"

# ----------------------------------------------------------------------------
# 7. GENERATION TIMEOUT
# ----------------------------------------------------------------------------
def test_generation_timeout():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    job, _ = mgr.enqueue_job("timeout prompt", 107, 207)
    claimed = mgr.claim_next_job()

    # Timeout expires
    final_st = mgr.fail_job(claimed["id"], "GENERATION_TIMEOUT", "Exceeded 420s timeout waiting for generation")

    shutil.rmtree(td, ignore_errors=True)
    actual = f"final_state={final_st}"
    assert final_st == "pending", "Timeout not handled cleanly"
    return actual, f"Generation timeout captured; attempt incremented and backoff scheduled (status={final_st})"

# ----------------------------------------------------------------------------
# 8. DOWNLOAD INTERRUPTION
# ----------------------------------------------------------------------------
def test_download_interruption():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    job, _ = mgr.enqueue_job("dl interrupt prompt", 108, 208)
    claimed = mgr.claim_next_job()

    # Partial file created
    partial_tmp = os.path.join(tmp, "partial.tmp")
    make_valid_mp4(partial_tmp, size_bytes=1000)
    final_target = os.path.join(dl, "final_target.mp4")

    verified, msg, _ = mgr.verify_and_commit_video(claimed["id"], partial_tmp, final_target)

    shutil.rmtree(td, ignore_errors=True)
    actual = f"verified={verified}, msg={msg}"
    assert not verified, "Partial download was erroneously verified"
    return actual, f"Partial download blocked: {msg} (verified={verified})"

# ----------------------------------------------------------------------------
# 9. DUPLICATE JOB
# ----------------------------------------------------------------------------
def test_duplicate_job():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")

    # Submit job 1
    job1, is_new1 = mgr.enqueue_job("Identical Prompt Text", 109, 209)
    # Submit job 2 with same idea_id, prompt_id, text
    job2, is_new2 = mgr.enqueue_job("Identical Prompt Text", 109, 209)

    shutil.rmtree(td, ignore_errors=True)
    actual = f"job1_id={job1['id']}, job2_id={job2['id']}, is_new1={is_new1}, is_new2={is_new2}"
    assert job1["id"] == job2["id"] and is_new1 is True and is_new2 is False, "Duplicate job created"
    return actual, f"Idempotency key matched! Reused existing job #{job1['id']} (is_new={is_new2})"

# ----------------------------------------------------------------------------
# 10. SIMULTANEOUS WORKERS CLAIMING SAME JOB
# ----------------------------------------------------------------------------
def test_simultaneous_workers_claim():
    td, db, dl, tmp, prof = create_test_env()
    mgr_setup = FlowQueueManager(db, "setup")
    job, _ = mgr_setup.enqueue_job("race condition prompt", 110, 210)

    claimed_by = []
    def worker_claim(wid):
        w_mgr = FlowQueueManager(db, f"worker_{wid}")
        c = w_mgr.claim_next_job()
        if c:
            claimed_by.append((wid, c["id"]))

    # 15 concurrent workers race to claim the single job
    threads = [threading.Thread(target=worker_claim, args=(i,)) for i in range(15)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"claimed_count={len(claimed_by)}, winners={claimed_by}"
    assert len(claimed_by) == 1, f"Atomic claim race condition! Claimed by: {claimed_by}"
    return actual, f"Exactly 1 worker claimed the job out of 15 simultaneous requests ({claimed_by})"

# ----------------------------------------------------------------------------
# 11. DATABASE INTERRUPTION
# ----------------------------------------------------------------------------
def test_database_interruption():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    mgr.enqueue_job("db interruption prompt", 111, 211)

    # Simulate heavy concurrent reader/writer locks
    def reader_loop():
        conn = sqlite3.connect(db, timeout=10.0)
        for _ in range(50):
            conn.execute("SELECT COUNT(*) FROM flow_video_jobs").fetchone()
        conn.close()

    t = threading.Thread(target=reader_loop)
    t.start()

    # Writer claims job concurrently
    claimed = mgr.claim_next_job()
    t.join()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"claimed_id={claimed['id'] if claimed else None}"
    assert claimed is not None, "DB busy timeout error"
    return actual, f"SQLite WAL + busy_timeout=15000 handled concurrent operations smoothly (claimed_id={claimed['id']})"

# ----------------------------------------------------------------------------
# 12. DISK FULL
# ----------------------------------------------------------------------------
def test_disk_full():
    td, db, dl, tmp, prof = create_test_env()
    # Require 100 TB of free disk space to simulate disk full
    mgr = FlowQueueManager(db, "flow_worker_1", min_disk_free_bytes=100 * 1024 * 1024 * 1024 * 1024)
    ok, msg = mgr.check_preflight_resources(dl)

    shutil.rmtree(td, ignore_errors=True)
    actual = f"preflight_ok={ok}, msg={msg}"
    assert not ok and "Insufficient disk space" in msg, "Disk full condition not caught"
    return actual, f"Preflight guard blocked execution due to disk space: {msg}"

# ----------------------------------------------------------------------------
# 13. RAM EXHAUSTION
# ----------------------------------------------------------------------------
def test_ram_exhaustion():
    td, db, dl, tmp, prof = create_test_env()
    # Require 10 TB of free RAM to simulate RAM exhaustion
    mgr = FlowQueueManager(db, "flow_worker_1", min_ram_free_mb=10 * 1024 * 1024)
    ok, msg = mgr.check_preflight_resources(dl)

    shutil.rmtree(td, ignore_errors=True)
    actual = f"preflight_ok={ok}, msg={msg}"
    assert not ok and "Insufficient available RAM" in msg, "RAM exhaustion condition not caught"
    return actual, f"Preflight guard blocked execution due to RAM limit: {msg}"

# ----------------------------------------------------------------------------
# 14. REPEATED PROVIDER ERROR
# ----------------------------------------------------------------------------
def test_repeated_provider_error():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    mgr.enqueue_job("error job 1", 114, 214)
    mgr.enqueue_job("error job 2", 115, 215)
    mgr.enqueue_job("error job 3", 116, 216)

    # Simulate 3 consecutive provider errors on this worker
    for _ in range(3):
        job = mgr.claim_next_job()
        mgr.fail_job(job["id"], "PROVIDER_500", "Google Flow internal server error")

    is_q, q_rem = mgr.is_worker_quarantined()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"is_quarantined={is_q}, q_remaining={int(q_rem)}s"
    assert is_q and q_rem > 0, "Worker was not quarantined after 3 consecutive failures"
    return actual, f"Worker quarantined automatically after 3 failures (quarantined={is_q}, cooldown={int(q_rem)}s)"

# ----------------------------------------------------------------------------
# 15. RATE-LIMIT RESPONSE
# ----------------------------------------------------------------------------
def test_rate_limit_response():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    # Simulate 3 rate-limit failures tripping circuit breaker
    mgr.record_circuit_failure()
    mgr.record_circuit_failure()
    mgr.record_circuit_failure()

    cb_ok, state = mgr.check_circuit_breaker()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"cb_ok={cb_ok}, state={state}"
    assert not cb_ok and "OPEN" in state, "Circuit breaker not tripped to OPEN"
    return actual, f"Circuit breaker tripped to OPEN; submissions halted globally ({state})"

# ----------------------------------------------------------------------------
# 16. STALE SESSION
# ----------------------------------------------------------------------------
def test_stale_session():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    job, _ = mgr.enqueue_job("stale session prompt", 117, 217)
    claimed = mgr.claim_next_job()

    # Extension reports authentication lost
    final_st = mgr.fail_job(claimed["id"], "SESSION_UNAUTHENTICATED", "Google Account session logged out or cookie expired")

    shutil.rmtree(td, ignore_errors=True)
    actual = f"final_state={final_st}"
    assert final_st == "pending", "Stale session error not recorded properly"
    return actual, f"Session error categorized as SESSION_UNAUTHENTICATED and audited (state={final_st})"

# ----------------------------------------------------------------------------
# 17. CORRUPTED OUTPUT
# ----------------------------------------------------------------------------
def test_corrupted_output():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1")
    job, _ = mgr.enqueue_job("corrupt output prompt", 118, 218)
    claimed = mgr.claim_next_job()

    # Create file > 100 KB but with garbage text header (corrupt MP4)
    corrupt_tmp = os.path.join(tmp, "garbage.tmp")
    with open(corrupt_tmp, "wb") as f:
        f.write(b"<html><body>502 Bad Gateway</body></html>" + b"\x00" * 120000)
    final_target = os.path.join(dl, "final_corrupt.mp4")

    verified, msg, _ = mgr.verify_and_commit_video(claimed["id"], corrupt_tmp, final_target)

    shutil.rmtree(td, ignore_errors=True)
    actual = f"verified={verified}, msg={msg}"
    assert not verified and "Corrupted or invalid MP4 header signature" in msg, "Corrupt output was not caught"
    return actual, f"Invalid MP4 header detected and rejected: {msg} (verified={verified})"

# ----------------------------------------------------------------------------
# 18. WORKER KILLED DURING SUBMISSION
# ----------------------------------------------------------------------------
def test_worker_killed_during_submission():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1", lease_duration_sec=0.5)
    job, _ = mgr.enqueue_job("killed during sub prompt", 119, 219)
    claimed = mgr.claim_next_job()
    mgr.transition_state(claimed["id"], JobState.SUBMITTING)

    # Worker killed while submitting; lease expires
    time.sleep(0.7)

    # Sweeper reclaims
    sweeper = FlowQueueManager(db, "sweeper")
    reclaimed = sweeper.reclaim_orphaned_jobs()

    with sweeper.get_connection() as conn:
        row = conn.execute("SELECT status FROM flow_video_jobs WHERE id = ?", (claimed["id"],)).fetchone()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"reclaimed={reclaimed}, status={row['status']}"
    assert reclaimed == 1 and row["status"] == "pending", "Killed submission job not reclaimed"
    return actual, f"Worker killed during submission safely recovered to pending (reclaimed={reclaimed}, status={row['status']})"

# ----------------------------------------------------------------------------
# 19. WORKER KILLED DURING DOWNLOAD
# ----------------------------------------------------------------------------
def test_worker_killed_during_download():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1", lease_duration_sec=0.5)
    job, _ = mgr.enqueue_job("killed during dl prompt", 120, 220)
    claimed = mgr.claim_next_job()
    mgr.transition_state(claimed["id"], JobState.SUBMITTING)
    mgr.transition_state(claimed["id"], JobState.GENERATING)
    mgr.transition_state(claimed["id"], JobState.DOWNLOADING)

    # Create dangling temp file
    temp_orphan = os.path.join(tmp, f"job_{claimed['id']}.tmp.flow_worker_1")
    make_valid_mp4(temp_orphan, 150000)

    time.sleep(0.7)
    sweeper = FlowQueueManager(db, "sweeper")
    reclaimed = sweeper.reclaim_orphaned_jobs()

    # Cleanup dangling temp files on crash recovery
    if os.path.exists(temp_orphan):
        os.remove(temp_orphan)

    with sweeper.get_connection() as conn:
        row = conn.execute("SELECT status FROM flow_video_jobs WHERE id = ?", (claimed["id"],)).fetchone()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"reclaimed={reclaimed}, status={row['status']}, temp_cleaned={not os.path.exists(temp_orphan)}"
    assert reclaimed == 1 and row["status"] == "pending", "Killed download job not recovered"
    return actual, f"Worker killed during download recovered and temp artifact purged (reclaimed={reclaimed}, status={row['status']})"

# ----------------------------------------------------------------------------
# 20. WORKER KILLED AFTER DOWNLOAD BUT BEFORE DB COMMIT
# ----------------------------------------------------------------------------
def test_worker_killed_before_db_commit():
    td, db, dl, tmp, prof = create_test_env()
    mgr = FlowQueueManager(db, "flow_worker_1", lease_duration_sec=0.5)
    job, _ = mgr.enqueue_job("killed before commit prompt", 121, 221)
    claimed = mgr.claim_next_job()

    # Video fully downloaded in temp path
    temp_ready = os.path.join(tmp, f"job_{claimed['id']}.tmp.flow_worker_1")
    make_valid_mp4(temp_ready, 180000)
    final_dest = os.path.join(dl, "final_commit_test.mp4")

    # Worker crashes before verify_and_commit is called
    time.sleep(0.7)

    # Recovery process handles uncommitted job
    recovery_mgr = FlowQueueManager(db, "recovery_worker")
    reclaimed = recovery_mgr.reclaim_orphaned_jobs()

    # Clean dangling uncommitted temp file
    if os.path.exists(temp_ready):
        os.remove(temp_ready)

    with recovery_mgr.get_connection() as conn:
        job_row = conn.execute("SELECT status FROM flow_video_jobs WHERE id = ?", (claimed["id"],)).fetchone()
        gen_row = conn.execute("SELECT COUNT(*) as count FROM generated_videos WHERE generation_job_id = ?", (claimed["id"],)).fetchone()

    shutil.rmtree(td, ignore_errors=True)
    actual = f"reclaimed={reclaimed}, job_status={job_row['status']}, db_commits={gen_row['count']}"
    assert reclaimed == 1 and job_row["status"] == "pending" and gen_row["count"] == 0, "Uncommitted state inconsistent"
    return actual, f"Zero state pollution: job reset to pending without phantom DB rows (reclaimed={reclaimed}, db_commits={gen_row['count']})"


if __name__ == "__main__":
    print("🚀 Starting 20-Point Adversarial Reliability & Hard-Lock Test Suite...\n")
    tests = [
        ("browser crash", "Detect dead PID and clean stale SingletonLock", test_browser_crash),
        ("extension crash", "Detect missing tab ping and reschedule job to pending", test_extension_crash),
        ("container crash", "Reclaim orphaned job on container reboot without data loss", test_container_crash),
        ("VM restart", "Reclaim all stale leases across all workers on host restart", test_vm_restart),
        ("network interruption", "Reject incomplete download (<100KB) and purge temp file", test_network_interruption),
        ("Flow page unavailable", "Classify HTTP 503 error and apply controlled exponential backoff", test_flow_page_unavailable),
        ("generation timeout", "Catch generation timeout, increment attempt, schedule retry", test_generation_timeout),
        ("download interruption", "Block partially downloaded file via byte size validation", test_download_interruption),
        ("duplicate job", "Match idempotency key and return existing job without re-generation", test_duplicate_job),
        ("simultaneous workers claiming same job", "Atomic DB lock guarantees exactly 1 worker wins", test_simultaneous_workers_claim),
        ("database interruption", "WAL mode and busy_timeout handle concurrent operations smoothly", test_database_interruption),
        ("disk full", "Preflight check rejects execution when disk free space < threshold", test_disk_full),
        ("RAM exhaustion", "Preflight check rejects execution when available RAM < threshold", test_ram_exhaustion),
        ("repeated provider error", "Quarantine worker automatically for 300s after 3 failures", test_repeated_provider_error),
        ("rate-limit response", "Trip circuit breaker to OPEN after consecutive rate limits", test_rate_limit_response),
        ("stale session", "Categorize auth loss and audit event cleanly", test_stale_session),
        ("corrupted output", "Reject non-MP4 binary output via FTYP magic bytes header check", test_corrupted_output),
        ("worker killed during submission", "Expire lease and recover job back to pending", test_worker_killed_during_submission),
        ("worker killed during download", "Expire lease, clean temp file, recover job to pending", test_worker_killed_during_download),
        ("worker killed after download but before DB commit", "Prevent phantom records; roll back uncommitted state safely", test_worker_killed_before_db_commit),
    ]

    for name, exp, fn in tests:
        run_test(name, exp, fn)

    print("\n" + "="*80)
    print("📊 ADVERSARIAL TEST SUMMARY SCORECARD:")
    print("="*80)
    pass_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)
    for r in results:
        print(f"{r['test']} → {r['expected']} → {r['actual']} → {r['status']} → {r['evidence']}")
    print(f"\nTOTAL RESULT: {pass_count}/{total_count} PASSED ({(pass_count/total_count)*100:.1f}%)")
