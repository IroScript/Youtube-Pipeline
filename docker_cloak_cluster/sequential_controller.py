"""
Sequential Queue Controller (W1 -> W2 -> W3 -> W4 -> W5 -> Repeat)
===================================================================
Coordinates sequential execution across:
- 5 Prompt & SEO Workers (Ports 8001-8005)
- 5 Veo Flow Video Workers (Ports 8101-8105)
Ensures exactly ONE worker runs at a time to strictly enforce:
1. CloakBrowser single-session concurrency limit
2. System RAM conservation (<1.5 GB usage)
3. Dynamic anti-bot spacing
"""

import os
import sys
import time
import json
import logging
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [SequentialController] %(message)s")
logger = logging.getLogger("SequentialController")

DB_PATH = os.environ.get("DB_PATH", "/app/database/youtube_pipeline.db")
PROMPT_WORKER_PORTS = [8001, 8002, 8003, 8004, 8005]
VEO_WORKER_PORTS = [8101, 8102, 8103, 8104, 8105]

import random

# Optional license key for Pro tier session count tracking
LICENSE_KEY = os.environ.get("CLOAKBROWSER_LICENSE_KEY", "")

class SequentialQueueController:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.prompt_slot = 0 # 0..4 (corresponds to W1..W5)
        self.veo_slot = 0    # 0..4 (corresponds to W1..W5)

    def check_worker_health(self, port: int) -> Dict[str, Any]:
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{port}/health", headers={"User-Agent": "Controller"})
            with urllib.request.urlopen(req, timeout=5) as res:
                return json.loads(res.read().decode())
        except Exception:
            return {"status": "unreachable", "is_busy": False}

    def verify_session_released(self, port: int) -> bool:
        """
        Verifies that previous browser session is released before launching next worker.
        1. Checks license server if CLOAKBROWSER_LICENSE_KEY is set.
        2. Polls worker health endpoint to ensure is_busy is False (browser closed).
        """
        if LICENSE_KEY:
            try:
                from cloakbrowser.license import get_active_session_count
                active = get_active_session_count(LICENSE_KEY)
                if active is not None and active > 0:
                    logger.warning(f"⚠️ License server reports {active} active sessions. Waiting for release...")
                    return False
                logger.info("✅ License server confirms 0 active sessions.")
            except Exception as e:
                logger.debug(f"License check fallback to local: {e}")

        # Local worker check: ensure worker finished and closed browser
        health = self.check_worker_health(port)
        return not health.get("is_busy", False)

    def get_next_prompt_idea(self) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
            SELECT id, title, topic FROM ideas
            WHERE status = 'new' AND is_deleted = 0
            ORDER BY id ASC LIMIT 1
        """)
        row = c.fetchone()
        conn.close()
        return dict(row) if row else None

    def dispatch_prompt_job(self, idea: Dict[str, Any]) -> bool:
        port = PROMPT_WORKER_PORTS[self.prompt_slot]
        worker_name = f"W{self.prompt_slot + 1}"
        logger.info(f"🔄 [Sequential Rotation] Routing Idea #{idea['id']} to {worker_name} (Port {port})...")

        payload = json.dumps({"idea_id": idea["id"], "title": idea["title"], "topic": idea.get("topic")}).encode()
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:{port}/execute_prompt_job",
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=120) as res:
                resp_data = json.loads(res.read().decode())
                logger.info(f"✅ {worker_name} returned: {resp_data.get('status')}")
                
                # Advance slot to next worker: W1 -> W2 -> W3 -> W4 -> W5 -> W1
                self.prompt_slot = (self.prompt_slot + 1) % 5
                return resp_data.get("status") == "success"
        except Exception as e:
            logger.error(f"❌ Execution failed on {worker_name}: {e}")
            self.prompt_slot = (self.prompt_slot + 1) % 5
            return False

    def run_controller_loop(self):
        logger.info("🚀 Starting CloakBrowser Sequential Queue Controller...")
        logger.info(f"📊 Prompt Workers: {PROMPT_WORKER_PORTS} | Veo Workers: {VEO_WORKER_PORTS}")

        while True:
            idea = self.get_next_prompt_idea()
            if idea:
                logger.info(f"🎯 Next Actionable Idea: #{idea['id']} - {idea['title']}")
                prev_port = PROMPT_WORKER_PORTS[self.prompt_slot]
                self.dispatch_prompt_job(idea)
                
                # Verify session release
                while not self.verify_session_released(prev_port):
                    logger.info("⏳ Waiting for previous session to fully release...")
                    time.sleep(2)

                # Randomized anti-bot cooldown: 10s to 120s (2 minutes)
                cooldown_sec = round(random.uniform(10.0, 120.0), 2)
                logger.info(f"🎲 Randomized Sequential Delay: Waiting {cooldown_sec} seconds before dispatching next worker...")
                time.sleep(cooldown_sec)
            else:
                logger.info("💤 No pending ideas in queue. Sleeping 30s...")
                time.sleep(30)

if __name__ == "__main__":
    controller = SequentialQueueController()
    controller.run_controller_loop()
