"""
Google Flow (Veo 3.1) Docker Worker Server
===========================================
Dedicated Video Generation Worker with 10SecNewExtension Bridge.
Enforces:
1. Zero AI Credits in Lower Priority / Relaxed Queue.
2. Anti-Bot Detection Jitter, Delays, and Cooldowns.
3. Chrome Extension Integration via CDP Controller & Bridge API.
4. Persistent Profiles & Cookies mounting.
"""

import os
import sys
import time
import json
import logging
import asyncio
import random
import glob
from typing import Optional, Dict, Any
from pathlib import Path
import urllib.request

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("FlowWorker")

# Worker configuration
WORKER_ID = os.environ.get("WORKER_ID", "flow_worker_1")
PORT = int(os.environ.get("PORT", "8000"))
FLOW_URL = os.environ.get("FLOW_URL", "https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d")
DOWNLOADS_DIR = "/app/downloads"
COOKIES_FILE = "/app/cookies/cookies.json"
PROFILE_DIR = "/app/profile"

app = FastAPI(title=f"Google Flow Veo 3.1 Worker - {WORKER_ID}")

# In-memory Bridge State
state = {
    "is_busy": False,
    "active_job": None,
    "last_tab_ping": 0.0,
    "tab_info": {},
    "is_paused": False,
    "pause_info": {},
    "bot_detected": False,
    "action_counter": 0,
    "completed_videos": 0,
    "direct_video_url": None,
    "direct_video_filename": None,
    "job_history": {},
    "last_progress": {}
}


class VideoGenerateRequest(BaseModel):
    prompt: str = Field(..., description="Prompt for Veo 3.1 video generation")
    idea_id: Optional[int] = None
    element_id: Optional[int] = None
    title: Optional[str] = "Generated Video"
    model: str = "Veo 3.1 Lower Priority"
    duration: str = "8s"
    aspect_ratio: str = "9:16"
    timeout_seconds: int = 420


class VideoGenerateResponse(BaseModel):
    success: bool
    worker_id: str
    video_path: Optional[str] = None
    video_url: Optional[str] = None
    file_size_bytes: int = 0
    elapsed_seconds: float = 0.0
    error: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 Starting Flow Worker [{WORKER_ID}] on port {PORT}...")
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)
    os.makedirs(PROFILE_DIR, exist_ok=True)
    logger.info(f"📂 Profile dir: {PROFILE_DIR} | Downloads dir: {DOWNLOADS_DIR}")


# ============================================================================
# EXTENSION BRIDGE ENDPOINTS (Consumes requests from 10SecNewExtension)
# ============================================================================

@app.get("/api/pending_prompt")
async def get_pending_prompt():
    """Called by 10SecNewExtension to poll for next video generation prompt."""
    if state["active_job"] and state["active_job"].get("status") == "pending":
        logger.info(f"📤 Handing off pending job #{state['active_job'].get('job_id')} to extension.")
        return state["active_job"]
    return {"status": "idle"}


@app.get("/api/health")
@app.get("/health")
async def health_check():
    """Health status for cluster pipeline orchestrator and docker monitoring."""
    is_tab_alive = (time.time() - state["last_tab_ping"]) < 15
    return {
        "status": "ok",
        "worker_id": WORKER_ID,
        "service": "Google Flow Veo 3.1 Bridge",
        "is_busy": state["is_busy"],
        "tab_connected": is_tab_alive,
        "tab_info": state["tab_info"],
        "bot_detected": state["bot_detected"],
        "action_counter": state["action_counter"],
        "completed_videos": state["completed_videos"]
    }


@app.post("/api/tab_ping")
async def tab_ping(req: Request):
    """Extension content script pings when Google Flow tab is open and ready."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    state["last_tab_ping"] = time.time()
    state["tab_info"] = data
    return {"success": True, "pong": True}


@app.post("/api/status")
async def update_status(req: Request):
    """Extension status update."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    job_id = data.get("job_id")
    if job_id:
        state["job_history"][str(job_id)] = data
    return {"success": True}


@app.post("/api/progress")
async def update_progress(req: Request):
    """Extension progress update during video generation."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    job_id = data.get("promptIndex") or "active"
    state["last_progress"][str(job_id)] = data

    # Check for bot detection indicator from extension
    if data.get("bot_detection") or data.get("warning_alert"):
        logger.warning(f"⚠️ [BOT DETECTION] Extension flagged submit warning on Google Flow!")
        state["bot_detected"] = True

    return {"success": True}


@app.post("/api/video_ready")
async def video_ready(req: Request):
    """Extension reports video URL and filename ready for download."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    video_url = data.get("video_url")
    filename = data.get("filename")
    if video_url:
        state["direct_video_url"] = video_url
        logger.info(f"📥 Direct Video URL reported: {video_url[:80]}...")
    if filename:
        state["direct_video_filename"] = filename
        logger.info(f"🏷️ Exact filename reported: {filename}")
    return {"success": True}


@app.post("/api/completed")
async def job_completed(req: Request):
    """Extension confirms job completion and successful download."""
    try:
        data = await req.json()
    except Exception:
        data = {}
    job_id = data.get("job_id")
    if job_id:
        state["job_history"][str(job_id)] = {"status": "completed", **data}
    if state["active_job"] and str(state["active_job"].get("job_id")) == str(job_id):
        state["active_job"]["status"] = "completed"
        state["completed_videos"] += 1
    logger.info(f"✅ Job #{job_id} marked COMPLETED by extension.")
    return {"success": True}


@app.post("/api/checkpoint")
@app.get("/api/checkpoint/active")
async def checkpoint_handler():
    return {"checkpoint": None}


# ============================================================================
# MASTER GENERATION API (Called by Orchestrator / Pipeline)
# ============================================================================

@app.post("/generate_video", response_model=VideoGenerateResponse)
async def generate_video(req: VideoGenerateRequest):
    """
    Submits a video generation task to Google Flow Veo 3.1.
    Coordinates between Orchestrator and 10SecNewExtension.
    """
    if state["is_busy"]:
        raise HTTPException(
            status_code=429,
            detail=f"Worker {WORKER_ID} is currently busy processing another video generation request"
        )

    state["is_busy"] = True
    state["action_counter"] += 1
    start_time = time.time()
    job_id = f"{int(time.time())}_{random.randint(1000, 9999)}"

    # Reset per-job variables
    state["direct_video_url"] = None
    state["direct_video_filename"] = None
    state["bot_detected"] = False

    # Human-like delay jitter ladder (+0.5s per action)
    jitter = random.uniform(12.0, 18.0) + (state["action_counter"] % 10) * 0.5
    logger.info(f"⏳ [Anti-Bot Jitter] Applying human-like stagger delay: {jitter:.2f}s...")
    await asyncio.sleep(jitter)

    job_payload = {
        "job_id": job_id,
        "status": "pending",
        "idea_id": req.idea_id,
        "element_id": req.element_id,
        "title": req.title,
        "prompt": req.prompt,
        "model": req.model,
        "duration": req.duration,
        "aspect_ratio": req.aspect_ratio,
        "created_at": time.time()
    }
    state["active_job"] = job_payload
    logger.info(f"🎬 New Veo 3.1 Job Registered: #{job_id} (Idea #{req.idea_id}, Model: {req.model})")

    try:
        # Await completion by polling extension state and downloads directory
        max_poll_iterations = int(req.timeout_seconds / 2)
        found_video_path = None
        found_video_url = None

        for attempt in range(max_poll_iterations):
            await asyncio.sleep(2)

            # Check if extension marked completed
            if state["active_job"].get("status") == "completed":
                logger.info(f"🎉 Extension reported completion for Job #{job_id}!")
                break

            # Check if direct video URL is ready -> attempt direct background stream download
            if state["direct_video_url"] and not found_video_url:
                found_video_url = state["direct_video_url"]
                target_filename = state["direct_video_filename"] or f"veo_{job_id}.mp4"
                target_path = os.path.join(DOWNLOADS_DIR, target_filename)

                try:
                    logger.info(f"⬇️ Streaming direct MP4 to {target_path}...")
                    urllib.request.urlretrieve(found_video_url, target_path)
                    if os.path.exists(target_path) and os.path.getsize(target_path) > 100000:
                        found_video_path = target_path
                        logger.info(f"✅ Successfully downloaded video ({os.path.getsize(target_path)} bytes)!")
                        break
                except Exception as dl_err:
                    logger.warning(f"⚠️ Direct download attempt warning: {dl_err}")

            # Check downloads directory for newly created MP4 files
            mp4_candidates = sorted(
                glob.glob(os.path.join(DOWNLOADS_DIR, "*.mp4")),
                key=os.path.getmtime,
                reverse=True
            )
            for cand in mp4_candidates:
                if os.path.getmtime(cand) >= start_time - 5 and os.path.getsize(cand) > 100000:
                    found_video_path = cand
                    logger.info(f"📁 Detected generated MP4 file: {found_video_path} ({os.path.getsize(cand)} bytes)")
                    break

            if found_video_path:
                break

            # Bot detection guard
            if state["bot_detected"]:
                logger.warning(f"⚠️ Bot detection flagged. Applying 30s extended cooldown...")
                await asyncio.sleep(30)
                state["bot_detected"] = False

        if not found_video_path and not found_video_url:
            raise TimeoutError(f"Video generation timed out after {req.timeout_seconds} seconds on {WORKER_ID}")

        elapsed = time.time() - start_time
        fsize = os.path.getsize(found_video_path) if found_video_path and os.path.exists(found_video_path) else 0

        return VideoGenerateResponse(
            success=True,
            worker_id=WORKER_ID,
            video_path=found_video_path,
            video_url=found_video_url,
            file_size_bytes=fsize,
            elapsed_seconds=elapsed
        )

    except Exception as e:
        logger.error(f"❌ Error during Veo 3.1 video generation: {e}")
        elapsed = time.time() - start_time
        return VideoGenerateResponse(
            success=False,
            worker_id=WORKER_ID,
            elapsed_seconds=elapsed,
            error=str(e)
        )
    finally:
        state["is_busy"] = False
        state["active_job"] = None
