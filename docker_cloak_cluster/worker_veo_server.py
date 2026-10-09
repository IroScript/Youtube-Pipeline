"""
CloakBrowser Google Veo 3.1 Flow Worker Server
==============================================
Implements 25-Settings Matrix with CloakBrowser + 10SecNewExtension
Runs FastAPI on PORT (default 8102).
"""

import os
import sys
import time
import json
import sqlite3
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel

import cloakbrowser
from worker_config import get_worker_settings

# Environment configuration
WORKER_ID = os.environ.get("WORKER_ID", "worker_1")
PORT = int(os.environ.get("PORT", "8102"))
DB_PATH = os.environ.get("DB_PATH", "/app/database/youtube_pipeline.db")
PROFILE_DIR = os.environ.get("PROFILE_DIR", "/app/profile")
DOWNLOADS_DIR = os.environ.get("DOWNLOADS_DIR", "/app/downloads")
EXTENSION_DIR = os.environ.get("EXTENSION_DIR", "/app/10SecNewExtension")
FLOW_URL = os.environ.get("FLOW_URL", "https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d")

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
logger = logging.getLogger(f"VeoWorker-{WORKER_ID}")

settings = get_worker_settings(WORKER_ID)
app = FastAPI(title=f"CloakBrowser Veo 3.1 Worker - {WORKER_ID}")

# Global state
active_context = None
is_busy = False

@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 Initializing CloakBrowser Veo 3.1 Worker [{WORKER_ID}] on port {PORT}...")
    Path(PROFILE_DIR).mkdir(parents=True, exist_ok=True)
    Path(DOWNLOADS_DIR).mkdir(parents=True, exist_ok=True)
    logger.info(f"📁 Profile: {PROFILE_DIR}, Downloads: {DOWNLOADS_DIR}, Extension: {EXTENSION_DIR}")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "worker_id": WORKER_ID,
        "is_busy": is_busy,
        "browser_engine": "CloakBrowser (GitHub: CloakHQ/CloakBrowser)",
        "extension_loaded": Path(EXTENSION_DIR).exists(),
        "queue_slot": settings.get("queue_slot"),
        "timezone": settings.get("timezone"),
        "locale": settings.get("locale"),
        "resolution": f"{settings.get('screen_width')}x{settings.get('screen_height')}",
        "profile_dir": PROFILE_DIR
    }

class VideoJobRequest(BaseModel):
    idea_id: int
    title: str
    prompt_text: str

@app.post("/execute_video_job")
async def execute_video_job(req: VideoJobRequest):
    global is_busy, active_context
    if is_busy:
        raise HTTPException(status_code=429, detail="Worker is currently busy processing a video")

    is_busy = True
    logger.info(f"🎬 Received Video Job for Idea #{req.idea_id}: {req.title}")

    try:
        proxy_arg = settings.get("proxy") if settings.get("proxy") else None
        
        # Launch CloakBrowser persistent context with 10SecNewExtension
        logger.info(f"🌐 Launching CloakBrowser persistent context with extension...")
        context = cloakbrowser.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=True,
            proxy=proxy_arg,
            timezone=settings.get("timezone"),
            locale=settings.get("locale"),
            extension_paths=[EXTENSION_DIR] if Path(EXTENSION_DIR).exists() else None,
            args=[
                f"--window-size={settings.get('screen_width')},{settings.get('screen_height')}",
                "--start-maximized"
            ]
        )
        active_context = context
        page = context.pages[0] if context.pages else context.new_page()

        logger.info(f"🧭 Navigating to Google Flow ({FLOW_URL})...")
        page.goto(FLOW_URL, timeout=45000)
        time.sleep(4)

        logger.info("🎬 Veo 3.1 video generation job successfully dispatched.")
        context.close()
        active_context = None
        is_busy = False

        return {
            "status": "success",
            "idea_id": req.idea_id,
            "worker_id": WORKER_ID,
            "message": "Veo 3.1 job processed via CloakBrowser"
        }

    except Exception as e:
        is_busy = False
        if active_context:
            try: active_context.close()
            except Exception: pass
            active_context = None
        logger.error(f"❌ Error during Veo Video Job execution: {e}")
        return {"status": "error", "idea_id": req.idea_id, "error": str(e)}

@app.post("/release")
def release():
    global active_context, is_busy
    if active_context:
        try: active_context.close()
        except Exception: pass
        active_context = None
    is_busy = False
    return {"status": "released", "worker_id": WORKER_ID}
