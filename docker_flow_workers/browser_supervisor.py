"""
Google Flow Browser Process Lifecycle Supervisor
=================================================
Implements:
- Lock 3: Browser Lifecycle Lock (Persistent instance, controlled lifecycle)
- Lock 18: Browser Health Lock (PID inspection, crash detection, controlled restart)
- Lock 26: Memory leak monitoring & safe restart
"""

import os
import sys
import time
import glob
import signal
import logging
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger("BrowserSupervisor")


class BrowserSupervisor:
    def __init__(
        self,
        display: str = ":99",
        user_data_dir: str = "/app/profile",
        extension_dir: str = "/app/10SecNewExtension",
        flow_url: str = "https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d",
        max_rss_mb: int = 1200
    ):
        self.display = display
        self.user_data_dir = user_data_dir
        self.extension_dir = extension_dir
        self.flow_url = flow_url
        self.max_rss_mb = max_rss_mb

        self.chrome_process: Optional[subprocess.Popen] = None
        self.xvfb_process: Optional[subprocess.Popen] = None
        self.is_running = False

    def ensure_xvfb(self):
        """Starts Xvfb virtual display if not running."""
        # Clean stale lock
        lock_file = f"/tmp/.X{self.display.replace(':', '')}-lock"
        if os.path.exists(lock_file):
            try:
                os.remove(lock_file)
            except Exception:
                pass

        env = os.environ.copy()
        env["DISPLAY"] = self.display
        try:
            res = subprocess.run(["xdpyinfo"], env=env, capture_output=True, text=True, check=False)
            if res.returncode == 0:
                logger.info(f"🖥️ Virtual display {self.display} is already active.")
                return
        except Exception:
            pass

        logger.info(f"🖥️ Starting Xvfb on display {self.display}...")
        self.xvfb_process = subprocess.Popen(
            ["Xvfb", self.display, "-screen", "0", "1920x1080x24", "-ac", "+extension", "GLX", "+render", "-noreset"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(1.5)

    def clean_stale_locks(self):
        """Removes Chrome Singleton locks to prevent profile contention on restart."""
        profile_path = Path(self.user_data_dir)
        profile_path.mkdir(parents=True, exist_ok=True)
        for lock_name in ["SingletonLock", "SingletonCookie", "SingletonSocket"]:
            lock_file = profile_path / lock_name
            if lock_file.exists() or lock_file.is_symlink():
                try:
                    lock_file.unlink()
                    logger.info(f"🧹 Cleaned stale Chrome lock: {lock_name}")
                except Exception as e:
                    logger.warning(f"⚠️ Could not remove {lock_name}: {e}")

        # Ensure First Run sentinel exists
        first_run = profile_path / "First Run"
        if not first_run.exists():
            try:
                first_run.touch()
            except Exception:
                pass

    def launch_browser(self) -> bool:
        """Launches persistent Chrome instance with 10SecNewExtension loaded."""
        self.ensure_xvfb()
        self.clean_stale_locks()

        env = os.environ.copy()
        env["DISPLAY"] = self.display

        chrome_cmd = [
            "/usr/bin/google-chrome-stable",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            f"--load-extension={self.extension_dir}",
            f"--user-data-dir={self.user_data_dir}",
            "--window-size=1920,1080",
            self.flow_url
        ]

        logger.info(f"🚀 Launching persistent Google Chrome on {self.display} with extension...")
        try:
            self.chrome_process = subprocess.Popen(
                chrome_cmd,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(3.0)
            if self.chrome_process.poll() is not None:
                logger.error(f"❌ Chrome failed to launch! Exit code: {self.chrome_process.returncode}")
                return False
            logger.info(f"✅ Chrome active (PID: {self.chrome_process.pid})")
            return True
        except Exception as e:
            logger.error(f"❌ Exception launching Chrome: {e}")
            return False

    def is_browser_healthy(self) -> bool:
        """Checks if Chrome process is alive."""
        if not self.chrome_process:
            return False
        return self.chrome_process.poll() is None

    def get_chrome_rss_mb(self) -> int:
        """Calculates total resident memory used by Chrome process tree."""
        if not self.chrome_process or self.chrome_process.poll() is not None:
            return 0
        try:
            res = subprocess.run(["ps", "-o", "rss=", "--ppid", str(self.chrome_process.pid)], capture_output=True, text=True, check=False)
            total_kb = sum(int(x.strip()) for x in res.stdout.splitlines() if x.strip().isdigit())
            return int(total_kb / 1024)
        except Exception:
            return 0

    def restart_browser(self, reason: str = "health_check"):
        """Cleanly terminates and restarts the browser instance."""
        logger.warning(f"🔄 Controlled restart of Chrome initiated. Reason: {reason}")
        if self.chrome_process and self.chrome_process.poll() is None:
            try:
                self.chrome_process.terminate()
                self.chrome_process.wait(timeout=5)
            except Exception:
                try:
                    self.chrome_process.kill()
                except Exception:
                    pass
        time.sleep(1.0)
        self.clean_stale_locks()
        return self.launch_browser()

    def shutdown(self):
        """Gracefully terminates Chrome and Xvfb."""
        logger.info("🛑 Shutting down browser supervisor...")
        if self.chrome_process and self.chrome_process.poll() is None:
            try:
                self.chrome_process.terminate()
                self.chrome_process.wait(timeout=5)
            except Exception:
                try:
                    self.chrome_process.kill()
                except Exception:
                    pass
        if self.xvfb_process and self.xvfb_process.poll() is None:
            try:
                self.xvfb_process.terminate()
            except Exception:
                pass
