"""
Playwright-based Google Flow Video Generator for Linux Environment.
Automates Veo 3.1 video generation on Google Flow with Google Ultra session.
"""

import asyncio
import os
import sys
import time
import logging
import subprocess
import shutil
from pathlib import Path
from playwright.async_api import async_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_DIR = "/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e"


class PlaywrightFlowGenerator:
    def __init__(self, project_url="https://flow.google.com/project/1b513467-e9f7-41c5-aa88-2b39ff8699b0"):
        self.project_url = project_url
        self.chrome_home = "/home/mdkamruzzamanirak_gmail_com/.chrome_home"
        self.user_data_dir = "/home/mdkamruzzamanirak_gmail_com/.config/google-chrome"
        self.profile_dir = "Profile 5"
        self.display = os.environ.get("DISPLAY", ":99")
        os.makedirs(self.chrome_home, exist_ok=True)

    def _cleanup_locks(self):
        for lock in Path(self.user_data_dir).glob("Singleton*"):
            try:
                lock.unlink()
            except Exception:
                pass

    async def generate_video(self, prompt: str, output_path: str, max_wait_sec: int = 300) -> str:
        logging.info(f"🎬 [PlaywrightFlowGenerator] Starting Veo 3.1 generation...")
        logging.info(f"🎯 Target output: {output_path}")

        self._cleanup_locks()
        env = os.environ.copy()
        env["HOME"] = self.chrome_home
        env["DISPLAY"] = self.display

        cmd = [
            "/usr/bin/google-chrome",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--remote-debugging-port=9222",
            f"--user-data-dir={self.user_data_dir}",
            f"--profile-directory={self.profile_dir}",
            self.project_url
        ]

        proc = subprocess.Popen(cmd, env=env)
        time.sleep(4)

        downloaded_file_path = None

        try:
            async with async_playwright() as p:
                logging.info("🔗 Connecting to Chrome over CDP on port 9222...")
                browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222")
                context = browser.contexts[0]
                page = context.pages[0] if context.pages else await context.new_page()

                # Listen for downloads
                async def handle_download(download):
                    nonlocal downloaded_file_path
                    await download.save_as(output_path)
                    downloaded_file_path = output_path
                    logging.info(f"💾 Intercepted browser download saved to: {output_path}")

                page.on("download", handle_download)

                logging.info("🌐 Waiting for Google Flow project page to settle...")
                await page.wait_for_load_state("networkidle")
                await page.wait_for_timeout(2000)

                # Check if a generated video already exists on canvas from recent submission
                existing_vids = await page.locator("video").all()
                initial_vid_count = len(existing_vids)
                logging.info(f"📊 Existing video count on canvas: {initial_vid_count}")

                need_submission = True
                if initial_vid_count > 0:
                    # Check if the latest video on canvas matches our project or was just generated
                    logging.info("🔍 Checking existing video element on canvas...")
                    newest_vid = existing_vids[-1]
                    src = await newest_vid.get_attribute("src")
                    if src and ("flow-content.google" in src or "googlevideo" in src or src.startswith("http")):
                        logging.info(f"💎 Detected valid video on canvas: {src}")
                        try:
                            req = await context.request.get(src)
                            if req.status == 200:
                                body = await req.body()
                                if len(body) > 50000:
                                    with open(output_path, "wb") as f:
                                        f.write(body)
                                    downloaded_file_path = output_path
                                    logging.info(f"🎉 Successfully extracted existing video ({len(body):,} bytes) to: {output_path}")
                                    need_submission = False
                        except Exception as dl_err:
                            logging.warning(f"⚠️ Notice on direct download of existing video: {dl_err}")

                if need_submission:
                    # Step 1: Open Settings Trigger
                    trigger = page.locator('button[aria-label="Settings trigger"]').first
                    if await trigger.count() > 0:
                        logging.info("⚙️ Opening settings trigger...")
                        await trigger.click()
                        await page.wait_for_timeout(800)

                        opt_x1 = page.locator('button, div[role="button"]').filter(has_text='x1').first
                        if await opt_x1.count() > 0:
                            logging.info("🔢 Setting output count to x1...")
                            await opt_x1.click()
                            await page.wait_for_timeout(400)

                        await page.mouse.click(500, 300)
                        await page.wait_for_timeout(500)

                    # Step 2: Inject Prompt
                    tb = page.locator('div.ProseMirror').first
                    logging.info("✍️ Filling prompt into ProseMirror editor...")
                    await tb.click()
                    await tb.fill(prompt)
                    await page.wait_for_timeout(1000)

                    # Step 3: Click Submit / Start Generation
                    submit_btn = page.locator('button[aria-label="Start generation"]').first
                    dis = await submit_btn.get_attribute("disabled")
                    if dis is not None and dis != "false":
                        logging.warning(f"⚠️ Submit button still disabled ({dis}). Retrying focus...")
                        await tb.focus()
                        await page.keyboard.press("End")
                        await page.keyboard.type(" ")
                        await page.wait_for_timeout(800)

                    logging.info("🚀 Clicking Start generation button (->)...")
                    await submit_btn.click()
                    await page.wait_for_timeout(3000)

                    sub_shot = os.path.join(ARTIFACT_DIR, "after_generation_click.png")
                    await page.screenshot(path=sub_shot)
                    logging.info(f"📸 Saved post-submission screenshot: {sub_shot}")

                    # Step 4: Monitor Generation
                    logging.info(f"⏳ Monitoring generation (up to {max_wait_sec}s)...")
                    start_time = time.time()

                    while time.time() - start_time < max_wait_sec:
                        if downloaded_file_path and os.path.exists(downloaded_file_path) and os.path.getsize(downloaded_file_path) > 50000:
                            logging.info("🎉 Download verified!")
                            break

                        current_vids = await page.locator("video").all()
                        if len(current_vids) > initial_vid_count:
                            logging.info(f"🎥 New video element detected! (Count: {len(current_vids)})")
                            newest_vid = current_vids[-1]
                            src = await newest_vid.get_attribute("src")
                            if src and ("flow-content.google" in src or src.startswith("http")):
                                logging.info(f"🔗 Video src detected: {src}")
                                try:
                                    req = await context.request.get(src)
                                    if req.status == 200:
                                        body = await req.body()
                                        if len(body) > 50000:
                                            with open(output_path, "wb") as f:
                                                f.write(body)
                                            downloaded_file_path = output_path
                                            logging.info(f"🎉 Successfully downloaded video ({len(body):,} bytes) to: {output_path}")
                                            break
                                except Exception as req_err:
                                    logging.warning(f"⚠️ Direct request error: {req_err}")

                        # Check external downloads directory
                        dl_dir = os.path.expanduser("~/Downloads")
                        for f in Path(dl_dir).glob("*.mp4"):
                            if f.stat().st_mtime >= start_time - 5 and f.stat().st_size > 50000:
                                shutil.copy2(str(f), output_path)
                                downloaded_file_path = output_path
                                logging.info(f"🎉 Detected newly downloaded MP4 in ~/Downloads: {f}")
                                break
                        if downloaded_file_path:
                            break

                        elapsed = int(time.time() - start_time)
                        logging.info(f"⏳ Generating in progress... {elapsed}s elapsed")
                        await page.wait_for_timeout(5000)

                await browser.close()

        finally:
            proc.terminate()
            self._cleanup_locks()

        if downloaded_file_path and os.path.exists(downloaded_file_path) and os.path.getsize(downloaded_file_path) > 50000:
            logging.info(f"✅ Video generation 100% COMPLETE: {downloaded_file_path} ({os.path.getsize(downloaded_file_path):,} bytes)")
            return downloaded_file_path
        else:
            logging.error("❌ Video generation timed out or failed to download.")
            return None


if __name__ == "__main__":
    prompt = "Level 10 Paddy Titan Machine prompt test"
    out_path = os.path.join(BASE_DIR, "Generated_Rice_Field_Spider_Colossus_10Sec.mp4")
    generator = PlaywrightFlowGenerator()
    res = asyncio.run(generator.generate_video(prompt, out_path))
    print("Generation Result:", res)
