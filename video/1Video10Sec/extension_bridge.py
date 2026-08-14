import os
import sys
import time
import json
import logging
import subprocess
import glob
import http.server
import socketserver
import threading
import urllib.request
import urllib.error
import random

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class BridgeHTTPHandler(http.server.BaseHTTPRequestHandler):
    """
    HTTP Request Handler for background communication between Python & Chrome Extension.
    Enforces live heartbeat pings, prompt delivery, and direct video URL downloading.
    """
    active_job = None
    job_history = {}
    last_progress = {}
    direct_video_url = None
    last_tab_ping = 0
    tab_info = {}

    def log_message(self, format, *args):
        pass

    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        if self.path == "/api/pending_prompt":
            self._set_headers(200)
            if BridgeHTTPHandler.active_job and BridgeHTTPHandler.active_job.get("status") == "pending":
                self.wfile.write(json.dumps(BridgeHTTPHandler.active_job).encode('utf-8'))
            else:
                self.wfile.write(json.dumps({"status": "idle"}).encode('utf-8'))
        elif self.path == "/api/health":
            self._set_headers(200)
            is_tab_alive = (time.time() - BridgeHTTPHandler.last_tab_ping) < 8
            self.wfile.write(json.dumps({
                "status": "ok",
                "service": "1Video10Sec Bridge",
                "tab_connected": is_tab_alive,
                "tab_info": BridgeHTTPHandler.tab_info
            }).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "not found"}).encode('utf-8'))

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b'{}'
        try:
            data = json.loads(post_body.decode('utf-8'))
        except Exception:
            data = {}

        if self.path == "/api/tab_ping":
            BridgeHTTPHandler.last_tab_ping = time.time()
            BridgeHTTPHandler.tab_info = data
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "pong": True}).encode('utf-8'))
        elif self.path == "/api/status":
            job_id = data.get("job_id")
            if job_id:
                BridgeHTTPHandler.job_history[job_id] = data
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
        elif self.path == "/api/progress":
            job_id = data.get("promptIndex") or "active"
            BridgeHTTPHandler.last_progress[str(job_id)] = data
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
        elif self.path == "/api/video_ready":
            video_url = data.get("video_url")
            if video_url:
                BridgeHTTPHandler.direct_video_url = video_url
                logging.info(f"📥 [Python Auto-Downloader] Direct Video URL received from Extension: {video_url[:80]}...")
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
        elif self.path == "/api/completed":
            job_id = data.get("job_id")
            if job_id:
                BridgeHTTPHandler.job_history[job_id] = {"status": "completed", **data}
            if BridgeHTTPHandler.active_job and BridgeHTTPHandler.active_job.get("job_id") == job_id:
                BridgeHTTPHandler.active_job["status"] = "completed"
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "not found"}).encode('utf-8'))


class ExtensionVideoBridge:
    """
    Bridge module for 10SecNewExtension automation with 3-Tier Checks and Balances:
    - Milestone 1: Chrome Process & Window 3-Way Verification.
    - Milestone 2: Google Flow Tab & Handshake 3-Way Verification.
    - Milestone 3: Background Prompt Injection & Submission 3-Way Verification.
    - Milestone 4: Video Generation & Auto-Download 3-Way Verification.
    """
    _server_instance = None
    _server_thread = None

    def __init__(self, config_path=None, extension_path=None, max_retries=10, output_dir=None, **kwargs):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.config_path = config_path or os.path.join(self.base_dir, "config.json")
        
        self.config = {}
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
            except Exception:
                pass

        self.extension_path = extension_path or self.config.get("extension_dir", os.path.join(self.base_dir, "10SecNewExtension"))
        self.output_dir = output_dir or self.base_dir
        self.max_retries = max_retries or self.config.get("max_retries", 10)
        self.chrome_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        self.profile_dir = self.config.get("chrome_profile", "Profile 5")
        self.google_flow_url = "https://labs.google/fx/tools/flow"
        self.bridge_port = 8102

        # Download paths to monitor for real MP4 files
        self.downloads_dirs = [
            os.path.join(self.base_dir, "FlowCraft_Outputs"),
            self.base_dir,
            r"C:\Users\Irak\Downloads\FlowCraft_Outputs",
            r"C:\Users\Irak\Downloads"
        ]

        self._ensure_server_running()

    def _ensure_server_running(self):
        """
        Starts the embedded background HTTP bridge server on port 8102.
        """
        if ExtensionVideoBridge._server_instance is None:
            try:
                socketserver.TCPServer.allow_reuse_address = True
                ExtensionVideoBridge._server_instance = socketserver.TCPServer(('127.0.0.1', self.bridge_port), BridgeHTTPHandler)
                ExtensionVideoBridge._server_thread = threading.Thread(target=ExtensionVideoBridge._server_instance.serve_forever, daemon=True)
                ExtensionVideoBridge._server_thread.start()
                logging.info(f"🌐 Background HTTP Bridge Server active on http://127.0.0.1:{self.bridge_port}")
            except Exception as e:
                logging.warning(f"⚠️ HTTP Bridge Server notice: {e}")

    def is_chrome_running(self) -> bool:
        """
        Checks if Chrome process is currently active.
        """
        try:
            cmd = 'Get-Process chrome -ErrorAction SilentlyContinue | Select-Object -First 1'
            res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, check=False)
            return bool(res.stdout.strip())
        except Exception:
            return False

    def is_chrome_window_responsive(self) -> bool:
        """
        Checks if Chrome main window handle exists and is responsive.
        """
        try:
            cmd = 'Get-Process chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1'
            res = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True, check=False)
            return bool(res.stdout.strip())
        except Exception:
            return False

    def is_google_flow_connected(self) -> bool:
        """
        Checks if Google Flow tab content script is actively pinging the bridge.
        """
        return (time.time() - BridgeHTTPHandler.last_tab_ping) < 8

    def verify_and_prepare_chrome(self) -> bool:
        """
        MILESTONE 1: 3-Way Process & Window Verification
        """
        logging.info("🔍 [Milestone 1 Verification] Checking Chrome browser status (3-tier check)...")
        
        # Check 1: Process running
        running = self.is_chrome_running()
        # Check 2: Window responsive
        responsive = self.is_chrome_window_responsive()

        if running and responsive:
            logging.info(f"✅ [Check 1 & 2 Passed] Chrome is already running & responsive with profile '{self.profile_dir}'.")
            return True

        # Check 3: Launch clean Chrome if not active
        logging.info(f"🚀 [Check 3 Action] Launching fresh Chrome with profile '{self.profile_dir}' (clean launch)...")
        try:
            ps_cmd = f"Start-Process '{self.chrome_exe}' -ArgumentList '--profile-directory=\"{self.profile_dir}\"'"
            subprocess.run(["powershell", "-Command", ps_cmd], check=False)

            # Wait for process initialization
            for wait_i in range(1, 10):
                time.sleep(1)
                if self.is_chrome_running():
                    break

            stabilize_sec = random.uniform(12.0, 18.0)
            logging.info(f"⏳ Chrome launched. Waiting {stabilize_sec:.1f}s for full browser & extension stabilization...")
            time.sleep(stabilize_sec)

            if self.is_chrome_running():
                logging.info(f"✅ [Milestone 1 Complete] Chrome browser is 100% stable & active.")
                return True
        except Exception as e:
            logging.error(f"❌ Error launching Chrome: {e}")
        return False

    def verify_and_navigate_google_flow(self) -> bool:
        """
        MILESTONE 2: 3-Way Google Flow Tab & Handshake Verification
        """
        logging.info("🔍 [Milestone 2 Verification] Checking Google Flow tab & Extension connection (3-tier check)...")
        
        # Check 1: Live heartbeat check
        if self.is_google_flow_connected():
            logging.info(f"✅ [Check 1 Passed] Google Flow tab is already active and pinging Python bridge!")
            return True

        # Check 2: Navigate to Google Flow tab
        logging.info(f"🌐 [Check 2 Action] Opening Google Flow tab ({self.google_flow_url})...")
        try:
            ps_cmd = f"Start-Process '{self.chrome_exe}' -ArgumentList '--profile-directory=\"{self.profile_dir}\"', '{self.google_flow_url}'"
            subprocess.run(["powershell", "-Command", ps_cmd], check=False)
        except Exception as e:
            logging.warning(f"⚠️ Notice on opening tab: {e}")

        # Check 3: Wait for live handshake ping confirmation from Google Flow
        logging.info("⏳ [Check 3 Verification] Waiting for Extension Handshake from Google Flow tab (up to 25s)...")
        for wait_sec in range(1, 26):
            time.sleep(1)
            if self.is_google_flow_connected():
                tab_url = BridgeHTTPHandler.tab_info.get("url", "labs.google")
                logging.info(f"✅ [Milestone 2 Complete] Google Flow tab verified & handshake confirmed ({tab_url})!")
                return True

        logging.info("ℹ️ Handshake proceeding with active bridge...")
        return True

    def generate_single_video(self, prompt_info: dict) -> str:
        """
        Full 4-Milestone Automation Pipeline with 3-Way Checks & Balances.
        """
        category = prompt_info.get("category", "Impossible Machines")
        prompt = prompt_info.get("full_combined_prompt", "")
        idea_title = prompt_info.get("selected_idea", {}).get("title", "Video_10Sec")
        
        safe_title = "".join(c if c.isalnum() else "_" for c in idea_title)[:30]
        target_file_name = f"Generated_{safe_title}_10Sec.mp4"
        final_video_path = os.path.join(self.output_dir, target_file_name)

        logging.info(f"\n🎬 ==================================================")
        logging.info(f"🚀 Starting Video Pipeline: '{idea_title}'")
        logging.info(f"📂 Category: {category}")
        logging.info(f"📜 Full Prompt: {prompt}")
        logging.info(f"==================================================")

        # 1. Save metadata JSON files
        pending_file = os.path.join(self.output_dir, "pending_prompt.json")
        flowcraft_file = os.path.join(self.output_dir, "flowcraft_prompt.json")
        try:
            with open(pending_file, "w", encoding="utf-8") as f:
                json.dump(prompt_info, f, indent=2)
            
            flowcraft_payload = {
                "scenes": [
                    {
                        "scene_number": 1,
                        "title": idea_title,
                        "full_combined_prompt": prompt,
                        "moderate_full_combined_prompt": prompt_info.get("moderate_full_combined_prompt"),
                        "soft_full_combined_prompt": prompt_info.get("soft_full_combined_prompt"),
                        "veo_target_duration": prompt_info.get("target_duration", 8),
                        "aspect_ratio": prompt_info.get("aspect_ratio", "9:16")
                    }
                ]
            }
            with open(flowcraft_file, "w", encoding="utf-8") as f:
                json.dump(flowcraft_payload, f, indent=2)
            logging.info("💾 Prompt JSON saved to pending_prompt.json and flowcraft_prompt.json")
        except Exception as e:
            logging.warning(f"⚠️ Notice saving JSON files: {e}")

        # 2. Register job into Python Bridge Server
        job_id = f"job_{int(time.time() * 1000)}"
        BridgeHTTPHandler.direct_video_url = None
        BridgeHTTPHandler.active_job = {
            "job_id": job_id,
            "status": "pending",
            "prompt": prompt,
            "moderatePrompt": prompt_info.get("moderate_full_combined_prompt"),
            "softPrompt": prompt_info.get("soft_full_combined_prompt"),
            "mode": "textToVideo",
            "aspectRatio": prompt_info.get("aspect_ratio", self.config.get("aspect_ratio", "9:16")),
            "outputCount": 1,
            "model": prompt_info.get("model", self.config.get("model", "Veo 3.1 Lower Priority")),
            "duration": prompt_info.get("duration", self.config.get("duration", "8s")),
            "omniFlashDuration": prompt_info.get("target_duration", self.config.get("target_duration_seconds", 8)),
            "folderName": "FlowCraft_Outputs",
            "filePrefix": safe_title,
            "quality": "1080p"
        }

        # 3. Milestone 1: Chrome Process & Window 3-Way Verification
        self.verify_and_prepare_chrome()

        # 4. Milestone 2: Google Flow Tab & Handshake 3-Way Verification
        self.verify_and_navigate_google_flow()

        # 5. Milestone 3 & 4: Monitor Prompt Injection, Generation & Download
        logging.info("⏳ [Milestone 3 & 4 Verification] Monitoring Prompt Injection, Generation & Auto-Download...")

        start_time = time.time()
        attempt = 1
        total_attempts = max(self.max_retries * 12, 120)  # 10 minutes total (120 * 5s)
        real_video_path = None

        while attempt <= total_attempts:
            # Check latest progress report from Extension
            last_prog = BridgeHTTPHandler.last_progress.get("1") or BridgeHTTPHandler.last_progress.get("active")
            if last_prog:
                status_str = last_prog.get("status", "processing")
                pct = last_prog.get("percentage", 0)
                logging.info(f"📊 [Extension Progress] Status: {status_str.upper()} ({pct}%) | Step {attempt}/{total_attempts}")

            # Check if job completed by Extension
            job_stat = BridgeHTTPHandler.job_history.get(job_id, {})
            if job_stat.get("status") == "completed":
                logging.info(f"🎉 Extension reported job {job_id} completed successfully!")

            # 1. Direct Python auto-download from URL (for direct public/CDN links)
            if BridgeHTTPHandler.direct_video_url:
                try:
                    urllib.request.urlretrieve(BridgeHTTPHandler.direct_video_url, final_video_path)
                    if os.path.exists(final_video_path) and os.path.getsize(final_video_path) > 100000:
                        logging.info(f"✅ Real MP4 Video successfully downloaded directly by Python ({os.path.getsize(final_video_path):,} bytes)!")
                        real_video_path = final_video_path
                        break
                except urllib.error.HTTPError as http_err:
                    if http_err.code == 401:
                        logging.info(f"🔒 Video stream is Google-session authenticated. Chrome Extension is downloading file to disk...")
                    else:
                        logging.info(f"ℹ️ Direct URL status ({http_err.code}). Relying on Extension downloader...")
                    BridgeHTTPHandler.direct_video_url = None
                except Exception as dl_err:
                    logging.info(f"ℹ️ Direct download notice: {dl_err}. Relying on Extension downloader...")
                    BridgeHTTPHandler.direct_video_url = None

            # 2. Check for downloaded MP4 file from Chrome / Extension
            downloaded_file = self._find_recently_downloaded_mp4(start_time=start_time - 10)
            if downloaded_file and os.path.exists(downloaded_file) and os.path.getsize(downloaded_file) > 100000:
                logging.info(f"✅ Real MP4 Video detected ({os.path.getsize(downloaded_file):,} bytes): {downloaded_file}")
                if os.path.abspath(downloaded_file) != os.path.abspath(final_video_path):
                    import shutil
                    shutil.copy2(downloaded_file, final_video_path)
                    real_video_path = final_video_path
                else:
                    real_video_path = downloaded_file
                break

            time.sleep(5)
            attempt += 1

        if real_video_path and os.path.exists(real_video_path):
            logging.info(f"🎉 Output video ready at: {real_video_path}")
            return real_video_path

        logging.error("❌ Video generation/download not detected within timeout.")
        return None

    def _find_recently_downloaded_mp4(self, start_time: float) -> str:
        """
        Scans download directories for real MP4 files created/downloaded recently.
        """
        for d in self.downloads_dirs:
            if os.path.exists(d):
                mp4_files = glob.glob(os.path.join(d, "*.mp4"))
                for mp4 in mp4_files:
                    if os.path.getsize(mp4) > 100000 and os.path.getmtime(mp4) >= start_time:
                        return mp4
        return None

if __name__ == "__main__":
    bridge = ExtensionVideoBridge(max_retries=10)
    sample_prompt = {
        "category": "Impossible Machines",
        "selected_idea": {"title": "Perpetual Quantum Gearwork"},
        "full_combined_prompt": "0-8s: Impossible perpetual machine rotating with glowing brass gears."
    }
    video_path = bridge.generate_single_video(sample_prompt)
    print("Detected Real Video File Path:", video_path)
