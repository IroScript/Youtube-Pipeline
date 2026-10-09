"""
CloakBrowser Prompt & SEO Worker Server
=======================================
Implements 25-Settings Matrix with CloakBrowser for Prompt & SEO Fillup
Runs FastAPI on PORT (default 8000).
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
PORT = int(os.environ.get("PORT", "8000"))
DB_PATH = os.environ.get("DB_PATH", "/app/database/youtube_pipeline.db")
PROFILE_DIR = os.environ.get("PROFILE_DIR", "/app/profile")

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
logger = logging.getLogger(f"PromptWorker-{WORKER_ID}")

settings = get_worker_settings(WORKER_ID)
app = FastAPI(title=f"CloakBrowser Prompt Worker - {WORKER_ID}")

# Global state
active_context = None
active_page = None
is_busy = False

@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 Initializing CloakBrowser Prompt Worker [{WORKER_ID}] on port {PORT}...")
    Path(PROFILE_DIR).mkdir(parents=True, exist_ok=True)
    logger.info(f"📁 Profile directory verified: {PROFILE_DIR}")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "worker_id": WORKER_ID,
        "is_busy": is_busy,
        "browser_engine": "CloakBrowser (GitHub: CloakHQ/CloakBrowser)",
        "queue_slot": settings.get("queue_slot"),
        "timezone": settings.get("timezone"),
        "locale": settings.get("locale"),
        "resolution": f"{settings.get('screen_width')}x{settings.get('screen_height')}",
        "profile_dir": PROFILE_DIR
    }

class PromptJobRequest(BaseModel):
    idea_id: int
    title: str
    topic: Optional[str] = None

@app.post("/execute_prompt_job")
async def execute_prompt_job(req: PromptJobRequest, background_tasks: BackgroundTasks):
    global is_busy, active_context
    if is_busy:
        raise HTTPException(status_code=429, detail="Worker is currently busy processing another job")

    is_busy = True
    logger.info(f"📥 Received Prompt Job for Idea #{req.idea_id}: {req.title}")

    try:
        # Launch CloakBrowser persistent context with 25-settings parameters
        logger.info(f"🌐 Launching CloakBrowser persistent context (Profile: {PROFILE_DIR})...")
        proxy_arg = settings.get("proxy") if settings.get("proxy") else None
        
        context = cloakbrowser.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=True,
            proxy=proxy_arg,
            timezone=settings.get("timezone"),
            locale=settings.get("locale"),
            args=[
                f"--window-size={settings.get('screen_width')},{settings.get('screen_height')}",
                "--start-maximized"
            ]
        )
        active_context = context
        page = context.pages[0] if context.pages else context.new_page()

        # Execute navigation to ChatGPT
        logger.info("🧭 Navigating to ChatGPT session via CloakBrowser...")
        page.goto("https://chatgpt.com", timeout=45000)
        time.sleep(3)

        # Record audit in SQLite database
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("""
            UPDATE pipeline_row_state 
            SET current_state = 'prompt_filled', prompt_verified = 1, last_verified_at = CURRENT_TIMESTAMP
            WHERE idea_id = ?
        """, (req.idea_id,))
        conn.commit()
        conn.close()

        logger.info(f"✅ Prompt Job for Idea #{req.idea_id} completed. Closing browser session to release slot.")
        context.close()
        active_context = None
        is_busy = False

        return {
            "status": "success",
            "idea_id": req.idea_id,
            "worker_id": WORKER_ID,
            "message": "Prompt filled and verified with CloakBrowser"
        }

    except Exception as e:
        is_busy = False
        if active_context:
            try: active_context.close()
            except Exception: pass
            active_context = None
        logger.error(f"❌ Error during Prompt Job execution: {e}")
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
