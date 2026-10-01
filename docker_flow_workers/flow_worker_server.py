"""
Hardened Google Flow (Veo 3.1) Docker Worker Server
===================================================
Redesigned for Enterprise Reliability & Resilience:
- All 30 Hard-Locks Verified and Enforced
- Zero fake human behaviour, zero random delays, zero stealth spoofing
- Strict State Machine, Atomic DB Queue, Circuit Breaker, 4-Tier Video Verification
- Native Integration with 10SecNewExtension on Port 8102
"""

import os
import sys
import time
import glob
import json
import shutil
import logging
import asyncio
import urllib.request
from typing import Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, Field

from flow_queue_manager import FlowQueueManager, JobState
from browser_supervisor import BrowserSupervisor

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("HardenedFlowWorker")

# Configuration from Environment
WORKER_ID = os.environ.get("WORKER_ID", "flow_worker_1")
PORT = int(os.environ.get("PORT", "8102"))
DB_PATH = os.environ.get("DB_PATH", "/app/database/youtube_pipeline.db")
DOWNLOADS_DIR = os.environ.get("DOWNLOADS_DIR", "/app/downloads")
TEMP_DIR = os.environ.get("TEMP_DIR", "/app/temp")
PROFILE_DIR = os.environ.get("PROFILE_DIR", "/app/profile")
EXTENSION_DIR = os.environ.get("EXTENSION_DIR", "/app/10SecNewExtension")
FLOW_URL = os.environ.get("FLOW_URL", "https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d")

# Initialize directories
os.makedirs(DOWNLOADS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(PROFILE_DIR, exist_ok=True)

# Initialize Manager & Supervisor
queue_mgr = FlowQueueManager(db_path=DB_PATH, worker_id=WORKER_ID)
browser_sup = BrowserSupervisor(
    display=os.environ.get("DISPLAY", ":99"),
    user_data_dir=PROFILE_DIR,
    extension_dir=EXTENSION_DIR,
    flow_url=FLOW_URL
)

app = FastAPI(title=f"Hardened Veo 3.1 Worker - {WORKER_ID}")

# Worker Live State
runtime_state = {
    "is_busy": False,
    "active_job": None,
    "last_tab_ping": 0.0,
    "tab_info": {},
    "is_paused": False,
    "pause_info": {},
    "direct_video_url": None,
    "direct_video_filename": None,
    "last_progress": {},
    "consecutive_failures": 0
}


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Prompt for Veo 3.1 video generation")
    idea_id: Optional[int] = None
    prompt_id: Optional[int] = None
    element_id: Optional[int] = None
    title: Optional[str] = "Generated Video"
    model: str = "Veo 3.1 Lower Priority"
    duration: int = 8
    aspect_ratio: str = "9:16"
    timeout_seconds: int = 420


class VideoGenerateResponse(BaseModel):
    success: bool
    worker_id: str
    job_id: Optional[int] = None
    video_path: Optional[str] = None
    video_url: Optional[str] = None
    file_size_bytes: int = 0
    file_sha256: Optional[str] = None
    elapsed_seconds: float = 0.0
    error: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 [Startup] Initializing Hardened Worker [{WORKER_ID}] on internal port {PORT}...")
    
    # Lock 24 & 25: Orphan job sweep & crash recovery on startup
    reclaimed = queue_mgr.reclaim_orphaned_jobs()
    if reclaimed > 0:
        logger.info(f"🧹 [Crash Recovery] Reclaimed {reclaimed} orphaned jobs from prior session.")

    # Lock 3: Launch persistent browser instance
    if os.environ.get("DISABLE_BROWSER_AUTOSPAWN", "0") != "1":
        browser_sup.launch_browser()

    # Start background maintenance loop
    asyncio.create_task(background_maintenance_loop())


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 [Shutdown] Cleaning up worker resources...")
    browser_sup.shutdown()


async def background_maintenance_loop():
    """Background loop for health probing, orphan reclaiming, and lease heartbeats."""
    while True:
        try:
            await asyncio.sleep(15)

            # 1. Heartbeat on active job (Lock 23)
            if runtime_state["active_job"]:
                job_id = runtime_state["active_job"].get("id")
                if job_id:
                    queue_mgr.send_heartbeat(job_id)

            # 2. Browser health check (Lock 18)
            if os.environ.get("DISABLE_BROWSER_AUTOSPAWN", "0") != "1":
                if not browser_sup.is_browser_healthy() and not runtime_state["is_busy"]:
                    logger.warning("⚠️ Browser process dead. Triggering controlled restart...")
                    browser_sup.restart_browser("unresponsive_process")

            # 3. Sweep orphans (Lock 24)
            queue_mgr.reclaim_orphaned_jobs()

        except Exception as e:
            logger.error(f"Maintenance loop error: {e}")


# ============================================================================
# EXTENSION BRIDGE ENDPOINTS (Standard 10SecNewExtension API on Port 8102)
# ============================================================================

@app.get("/api/pending_prompt")
async def get_pending_prompt():
    """Polled by 10SecNewExtension to receive the next active job."""
    if runtime_state["active_job"] and runtime_state["active_job"].get("status") in [JobState.CLAIMED, JobState.SUBMITTING]:
        job = runtime_state["active_job"]
        logger.info(f"📤 [Bridge] Handing off job #{job.get('id')} to 10SecNewExtension.")
        return {
            "status": "pending",
            "job_id": job.get("id"),
            "prompt": job.get("prompt_text"),
            "model": job.get("model_target"),
            "duration": f"{job.get('duration_seconds', 8)}s",
            "aspect_ratio": job.get("aspect_ratio", "9:16")
        }
    return {"status": "idle"}


@app.post("/api/tab_ping")
async def tab_ping(req: Request):
    """Extension content script pings every 2s."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    runtime_state["last_tab_ping"] = time.time()
    runtime_state["tab_info"] = data
    return {"success": True, "pong": True}


@app.post("/api/status")
async def update_status(req: Request):
    """Extension status update."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    job_id = data.get("job_id")
    status = data.get("status")
    logger.info(f"📡 [Bridge Status] Job #{job_id} -> {status}")
    if runtime_state["active_job"] and str(runtime_state["active_job"].get("id")) == str(job_id):
        if status == "started":
            queue_mgr.transition_state(int(job_id), JobState.SUBMITTING)
        elif status == "generating":
            queue_mgr.transition_state(int(job_id), JobState.GENERATING)
    return {"success": True}


@app.post("/api/progress")
async def update_progress(req: Request):
    """Extension progress update."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    job_id = data.get("promptIndex") or "active"
    runtime_state["last_progress"][str(job_id)] = data
    return {"success": True}


@app.post("/api/video_ready")
async def video_ready(req: Request):
    """Extension reports direct video URL & filename ready for download."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    video_url = data.get("video_url")
    filename = data.get("filename")
    if video_url:
        runtime_state["direct_video_url"] = video_url
        logger.info(f"📥 [Bridge] Direct Video URL: {video_url[:60]}...")
    if filename:
        runtime_state["direct_video_filename"] = filename
        logger.info(f"🏷️ [Bridge] Filename: {filename}")
    return {"success": True}


@app.post("/api/completed")
async def job_completed(req: Request):
    """Extension confirms job completion."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    job_id = data.get("job_id")
    logger.info(f"🎉 [Bridge] Extension marked Job #{job_id} as completed.")
    if runtime_state["active_job"] and str(runtime_state["active_job"].get("id")) == str(job_id):
        runtime_state["active_job"]["extension_completed"] = True
    return {"success": True}


@app.post("/api/failure_report")
async def failure_report(req: Request):
    """Extension reports a failure."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    logger.warning(f"⚠️ [Bridge] Extension Failure Report: {data}")
    if runtime_state["active_job"]:
        job_id = runtime_state["active_job"].get("id")
        cat = data.get("category", "EXTENSION_ERROR")
        err = data.get("reason", "Unknown failure reported by extension")
        queue_mgr.fail_job(job_id, cat, err)
    return {"success": True}


@app.post("/api/pause")
async def pause_handler(req: Request):
    runtime_state["is_paused"] = True
    return {"success": True, "paused": True}


@app.post("/api/resume")
async def resume_handler(req: Request):
    runtime_state["is_paused"] = False
    return {"success": True, "resumed": True}


@app.get("/api/checkpoint")
@app.get("/api/checkpoint/active")
@app.post("/api/checkpoint")
async def checkpoint_handler():
    return {"checkpoint": None}


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint enforcing locks 18, 19, 26, 27."""
    res_ok, res_msg = queue_mgr.check_preflight_resources(DOWNLOADS_DIR)
    is_tab_alive = (time.time() - runtime_state["last_tab_ping"]) < 20.0
    is_browser_ok = browser_sup.is_browser_healthy() if os.environ.get("DISABLE_BROWSER_AUTOSPAWN", "0") != "1" else True
    is_quarantined, remaining_q = queue_mgr.is_worker_quarantined()
    cb_ok, cb_state = queue_mgr.check_circuit_breaker()

    return {
        "status": "ok" if (res_ok and not is_quarantined and cb_ok) else "degraded",
        "worker_id": WORKER_ID,
        "is_busy": runtime_state["is_busy"],
        "browser_healthy": is_browser_ok,
        "tab_connected": is_tab_alive,
        "is_quarantined": is_quarantined,
        "quarantine_remaining_sec": remaining_q,
        "circuit_breaker": cb_state,
        "resource_status": res_msg
    }


# ============================================================================
# MASTER GENERATION API (Called by Orchestrator / Pipeline)
# ============================================================================

@app.post("/generate_video", response_model=VideoGenerateResponse)
async def generate_video(req: VideoGenerateRequest):
    """
    Submits and processes a video generation job with 30 Hard-Locks:
    - Preflight checks (RAM, Disk) (Locks 26, 27)
    - Single Job per Session Lock (Lock 4)
    - Idempotency Lock (Lock 9)
    - Global Concurrency & Rate Control (Locks 5, 15)
    - 4-Tier Download Verification (Lock 20)
    - Output Atomicity (Lock 21)
    - Atomic DB Commit & E2E Verification (Locks 22, 30)
    """
    start_time = time.time()

    # 1. Single-Job-Per-Session Lock (Lock 4)
    if runtime_state["is_busy"]:
        raise HTTPException(
            status_code=429,
            detail=f"Worker {WORKER_ID} is currently busy processing job #{runtime_state['active_job'].get('id') if runtime_state['active_job'] else 'unknown'}"
        )

    # 2. Resource & Disk Preflight Checks (Locks 26, 27)
    res_ok, res_msg = queue_mgr.check_preflight_resources(DOWNLOADS_DIR)
    if not res_ok:
        raise HTTPException(status_code=507, detail=res_msg)

    # 3. Circuit Breaker Check (Lock 17)
    cb_ok, cb_msg = queue_mgr.check_circuit_breaker()
    if not cb_ok:
        raise HTTPException(status_code=503, detail=cb_msg)

    # 4. Worker Quarantine Check (Lock 14)
    is_q, q_rem = queue_mgr.is_worker_quarantined()
    if is_q:
        raise HTTPException(status_code=503, detail=f"Worker is quarantined for {int(q_rem)}s due to repeated failures.")

    # 5. Idempotency Check & Enqueue (Lock 9)
    job, is_new = queue_mgr.enqueue_job(
        prompt_text=req.prompt,
        idea_id=req.idea_id,
        prompt_id=req.prompt_id,
        element_id=req.element_id,
        model=req.model,
        duration=req.duration,
        aspect_ratio=req.aspect_ratio
    )
    job_id = job["id"]

    # If job already completed, verify output and return immediately (Lock 9)
    if job["status"] == JobState.COMPLETED and job.get("final_file_path") and os.path.exists(job["final_file_path"]):
        logger.info(f"♻️ [Idempotency] Returning existing verified output for Job #{job_id}")
        return VideoGenerateResponse(
            success=True,
            worker_id=WORKER_ID,
            job_id=job_id,
            video_path=job["final_file_path"],
            file_size_bytes=job["file_size_bytes"],
            file_sha256=job["file_sha256"],
            elapsed_seconds=0.05
        )

    # 6. Atomic Claim (Locks 7, 8)
    claimed_job = queue_mgr.claim_next_job()
    if not claimed_job or claimed_job["id"] != job_id:
        # Check global concurrency or rate gate
        active_count = queue_mgr.get_global_active_count()
        if active_count >= queue_mgr.global_concurrency_limit:
            raise HTTPException(status_code=429, detail=f"Global concurrency limit reached ({active_count}/{queue_mgr.global_concurrency_limit}). Job #{job_id} queued.")
        # If another worker claimed it or rate gate locked, acknowledge queue
        return VideoGenerateResponse(
            success=False,
            worker_id=WORKER_ID,
            job_id=job_id,
            error=f"Job #{job_id} enqueued in database but waiting for queue claim."
        )

    # 7. Lock state & prepare for execution
    runtime_state["is_busy"] = True
    runtime_state["active_job"] = claimed_job
    runtime_state["direct_video_url"] = None
    runtime_state["direct_video_filename"] = None

    temp_filename = f"job_{job_id}_{int(time.time())}.tmp.{WORKER_ID}"
    temp_file_path = os.path.join(TEMP_DIR, temp_filename)
    final_filename = f"veo_video_job_{job_id}.mp4"
    final_file_path = os.path.join(DOWNLOADS_DIR, final_filename)

    logger.info(f"🎬 [Executing] Job #{job_id} on {WORKER_ID} (Idea #{req.idea_id}, Attempt #{claimed_job['attempt_count']})")
    queue_mgr.transition_state(job_id, JobState.SUBMITTING)

    try:
        # Await completion through extension bridge
        max_iterations = int(req.timeout_seconds / 2)
        found_temp_path = None
        found_video_url = None

        for attempt in range(max_iterations):
            await asyncio.sleep(2)

            # Extension-Health Check (Lock 19)
            if (time.time() - runtime_state["last_tab_ping"]) > 35.0 and attempt > 5:
                logger.warning("⚠️ [Extension Health] No tab ping received for > 35s during active generation!")

            # Check if direct URL is available for streaming
            if runtime_state["direct_video_url"] and not found_video_url:
                found_video_url = runtime_state["direct_video_url"]
                logger.info(f"⬇️ [Download Staging] Streaming direct MP4 to temporary path: {temp_file_path}...")
                queue_mgr.transition_state(job_id, JobState.DOWNLOADING)
                try:
                    urllib.request.urlretrieve(found_video_url, temp_file_path)
                    if os.path.exists(temp_file_path) and os.path.getsize(temp_file_path) > 100000:
                        found_temp_path = temp_file_path
                        break
                except Exception as dl_err:
                    logger.warning(f"⚠️ Direct stream download exception: {dl_err}")

            # Check downloads folder for files downloaded directly by browser
            mp4_candidates = sorted(
                glob.glob(os.path.join(DOWNLOADS_DIR, "*.mp4")),
                key=os.path.getmtime,
                reverse=True
            )
            for cand in mp4_candidates:
                if os.path.getmtime(cand) >= start_time - 5 and os.path.getsize(cand) > 100000:
                    # Move to temp path for verification (Lock 21)
                    queue_mgr.transition_state(job_id, JobState.DOWNLOADING)
                    shutil.move(cand, temp_file_path)
                    found_temp_path = temp_file_path
                    break

            if found_temp_path:
                break

            if runtime_state["active_job"].get("extension_completed"):
                # Await file to be fully flushed
                await asyncio.sleep(2)

        if not found_temp_path:
            raise TimeoutError(f"Job #{job_id} timed out after {req.timeout_seconds} seconds waiting for video download.")

        # 8. 4-Tier Verification on Temp File -> Atomic Rename -> DB Commit (Locks 20, 21, 30)
        queue_mgr.transition_state(job_id, JobState.VERIFYING)
        is_verified, v_msg, v_data = queue_mgr.verify_and_commit_video(
            job_id=job_id,
            temp_file_path=found_temp_path,
            final_file_path=final_file_path,
            video_url=found_video_url
        )

        if not is_verified:
            # Verification failed - corrupted or incomplete output (Lock 20)
            if os.path.exists(found_temp_path):
                os.remove(found_temp_path)
            queue_mgr.fail_job(job_id, "INTEGRITY_VERIFICATION_FAILED", v_msg)
            raise ValueError(f"Download integrity verification failed: {v_msg}")

        elapsed = time.time() - start_time
        logger.info(f"🏆 [SUCCESS] Job #{job_id} 100% verified & committed in {elapsed:.2f}s!")

        return VideoGenerateResponse(
            success=True,
            worker_id=WORKER_ID,
            job_id=job_id,
            video_path=final_file_path,
            video_url=found_video_url,
            file_size_bytes=v_data["file_size_bytes"],
            file_sha256=v_data["file_sha256"],
            elapsed_seconds=elapsed
        )

    except Exception as e:
        logger.error(f"❌ Job #{job_id} encountered failure: {e}")
        elapsed = time.time() - start_time
        # Clean up dangling temp file if any
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass

        queue_mgr.fail_job(job_id, "EXECUTION_FAILURE", str(e))

        return VideoGenerateResponse(
            success=False,
            worker_id=WORKER_ID,
            job_id=job_id,
            elapsed_seconds=elapsed,
            error=str(e)
        )

    finally:
        runtime_state["is_busy"] = False
        runtime_state["active_job"] = None
