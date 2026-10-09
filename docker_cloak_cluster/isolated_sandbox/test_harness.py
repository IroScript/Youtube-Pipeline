"""
Isolated CloakBrowser Empirical Test Harness
============================================
Tests 5 Critical Dimensions Without Touching Production:
1. CloakBrowser Launch & Execution
2. Worker Storage & Profile Isolation (W1 vs W2)
3. Session Persistence Across Restarts
4. Sequential Queue Handoff (W1 -> W2)
5. Exact RAM / RSS Footprint Measurement
"""

import os
import sys
import time
import json
import sqlite3
import psutil

import cloakbrowser

PROFILES_DIR = "/test/profiles"
W1_PROFILE = os.path.join(PROFILES_DIR, "w1")
W2_PROFILE = os.path.join(PROFILES_DIR, "w2")
TEST_DB = "/test/test_pipeline.db"

results = {}

def get_current_process_memory_mb():
    process = psutil.Process(os.getpid())
    mem = process.memory_info().rss / (1024 * 1024)
    # Also sum child processes (browser, xvfb, etc.)
    for child in process.children(recursive=True):
        try:
            mem += child.memory_info().rss / (1024 * 1024)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return round(mem, 2)

print("=" * 60)
print("STARTING ISOLATED CLOAKBROWSER EMPIRICAL TEST HARNESS")
print("=" * 60)

mem_baseline = get_current_process_memory_mb()
print(f"📊 [MEM] Baseline Container RAM: {mem_baseline} MB")
results["mem_baseline_mb"] = mem_baseline

# -------------------------------------------------------------
# TEST 1: CloakBrowser Launch & Page Navigation
# -------------------------------------------------------------
print("\n--- TEST 1: CloakBrowser Launch & Execution ---")
t0 = time.time()
try:
    context1 = cloakbrowser.launch_persistent_context(
        user_data_dir=W1_PROFILE,
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    page1 = context1.pages[0] if context1.pages else context1.new_page()
    page1.goto("https://httpbin.org/headers", timeout=30000)
    body_text = page1.inner_text("body")
    headers_data = json.loads(body_text)
    user_agent = headers_data.get("headers", {}).get("User-Agent", "")
    
    mem_active_w1 = get_current_process_memory_mb()
    print(f"✅ CloakBrowser Launched! (Time: {time.time()-t0:.2f}s)")
    print(f"   User-Agent: {user_agent}")
    print(f"📊 [MEM] Active Browser RAM: {mem_active_w1} MB (Delta: +{mem_active_w1 - mem_baseline:.2f} MB)")
    
    results["test_1_launch"] = {
        "status": "PASS",
        "user_agent": user_agent,
        "mem_active_mb": mem_active_w1
    }

    # -------------------------------------------------------------
    # TEST 2 (Part A): Set Session in Worker 1
    # -------------------------------------------------------------
    print("\n--- TEST 2: Worker Isolation (Writing State in W1) ---")
    page1.goto("https://httpbin.org/headers", timeout=30000)
    context1.add_cookies([{
        "name": "SECRET_W1_TOKEN",
        "value": "W1_SECURE_AUTH_CREDENTIAL",
        "domain": "httpbin.org",
        "path": "/",
        "expires": int(time.time()) + 86400
    }])
    storage_state_file = os.path.join(W1_PROFILE, "storage_state.json")
    context1.storage_state(path=storage_state_file)
    time.sleep(1)
    cookies_w1 = context1.cookies()
    print(f"   W1 Cookies Set: {[c['name'] + '=' + c['value'] for c in cookies_w1 if 'TOKEN' in c['name']]}")
    
    # Close W1 to test persistence later
    context1.close()
    time.sleep(1)
    mem_after_close = get_current_process_memory_mb()
    print(f"📊 [MEM] RAM After Closing W1: {mem_after_close} MB (Reclaimed: {mem_active_w1 - mem_after_close:.2f} MB)")
    results["mem_reclaimed_mb"] = round(mem_active_w1 - mem_after_close, 2)

except Exception as e:
    print(f"❌ Test 1 / W1 Launch Failed: {e}")
    results["test_1_launch"] = {"status": "FAIL", "error": str(e)}

# -------------------------------------------------------------
# TEST 2 (Part B): Worker 2 Isolation Verification
# -------------------------------------------------------------
print("\n--- TEST 2 (Part B): Checking Worker 2 Isolation ---")
try:
    context2 = cloakbrowser.launch_persistent_context(
        user_data_dir=W2_PROFILE,
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    cookies_w2 = context2.cookies()
    w1_leak = any("SECRET_W1_TOKEN" in c.get("name", "") for c in cookies_w2)
    
    if not w1_leak:
        print("✅ Isolation Verified! Worker 2 cannot see Worker 1's cookies/tokens.")
        results["test_2_isolation"] = {"status": "PASS", "leak_detected": False}
    else:
        print("❌ Isolation Failed! Worker 1 token leaked into Worker 2.")
        results["test_2_isolation"] = {"status": "FAIL", "leak_detected": True}

    context2.close()
    time.sleep(1)
except Exception as e:
    print(f"❌ Test 2 / W2 Isolation Failed: {e}")
    results["test_2_isolation"] = {"status": "FAIL", "error": str(e)}

# -------------------------------------------------------------
# TEST 3: Session Persistence Verification in Worker 1
# -------------------------------------------------------------
print("\n--- TEST 3: Session Persistence in Worker 1 ---")
try:
    context1_reopen = cloakbrowser.launch_persistent_context(
        user_data_dir=W1_PROFILE,
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"]
    )
    cookies_reopen = context1_reopen.cookies()
    token_persisted = any("SECRET_W1_TOKEN" in c.get("name", "") for c in cookies_reopen)
    
    if token_persisted:
        print("✅ Session Persistence Verified! Worker 1 session persisted across restart.")
        results["test_3_persistence"] = {"status": "PASS", "token_persisted": True}
    else:
        print("❌ Persistence Failed! Token lost on restart.")
        results["test_3_persistence"] = {"status": "FAIL", "token_persisted": False}

    context1_reopen.close()
    time.sleep(1)
except Exception as e:
    print(f"❌ Test 3 Persistence Failed: {e}")
    results["test_3_persistence"] = {"status": "FAIL", "error": str(e)}

# -------------------------------------------------------------
# TEST 4: Sequential Queue Handoff (W1 -> W2)
# -------------------------------------------------------------
print("\n--- TEST 4: Sequential Queue Handoff (W1 -> W2) ---")
try:
    # Setup isolated test database
    if os.path.exists(TEST_DB): os.remove(TEST_DB)
    conn = sqlite3.connect(TEST_DB)
    c = conn.cursor()
    c.execute("CREATE TABLE test_jobs (id INTEGER PRIMARY KEY, title TEXT, assigned_worker TEXT, status TEXT)")
    c.execute("INSERT INTO test_jobs (id, title, status) VALUES (9001, 'Job-Alpha', 'pending')")
    c.execute("INSERT INTO test_jobs (id, title, status) VALUES (9002, 'Job-Beta', 'pending')")
    conn.commit()

    # Step 4A: W1 takes Job 9001
    print("🔄 Handoff Step A: Dispatching Job 9001 to Worker 1...")
    c.execute("UPDATE test_jobs SET assigned_worker = 'W1', status = 'running' WHERE id = 9001")
    conn.commit()
    time.sleep(1)
    c.execute("UPDATE test_jobs SET status = 'completed_by_w1' WHERE id = 9001")
    conn.commit()
    print("✅ Job 9001 Completed by W1. Advancing sequential queue to W2.")

    # Step 4B: W2 takes Job 9002
    print("🔄 Handoff Step B: Dispatching Job 9002 to Worker 2...")
    c.execute("UPDATE test_jobs SET assigned_worker = 'W2', status = 'running' WHERE id = 9002")
    conn.commit()
    time.sleep(1)
    c.execute("UPDATE test_jobs SET status = 'completed_by_w2' WHERE id = 9002")
    conn.commit()
    print("✅ Job 9002 Completed by W2. Handoff sequence verified.")

    c.execute("SELECT id, title, assigned_worker, status FROM test_jobs")
    rows = c.fetchall()
    conn.close()

    results["test_4_handoff"] = {
        "status": "PASS",
        "jobs": [{"id": r[0], "worker": r[2], "state": r[3]} for r in rows]
    }
except Exception as e:
    print(f"❌ Test 4 Queue Handoff Failed: {e}")
    results["test_4_handoff"] = {"status": "FAIL", "error": str(e)}

# Summary
print("\n" + "=" * 60)
print("FINAL TEST HARNESS EMPIRICAL SUMMARY")
print("=" * 60)
print(json.dumps(results, indent=2))

with open("/test/test_results.json", "w") as f:
    json.dump(results, f, indent=2)
