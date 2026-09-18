"""
Google Flow Veo 3.1 Single Video Generator & Packager
====================================================
1. Fetches Level 10 Prompt & SEO metadata from youtube_pipeline.db for given idea_id.
2. Automates Google Flow (Ultra Tier, Profile 5) over Playwright CDP on port 9222.
3. Submits prompt and monitors generation until complete.
4. Downloads original 720p 8s Veo 3.1 MP4 video.
5. Packages into PromptDatabase/output_packaged/1.<idea_id>.Level_10_<Slug>/
6. Extracts thumbnail and generates prompt_info.json & youtube_metadata.json.
7. Updates SQLite database (generated_videos + youtube_metadata).
"""

import os
import sys
import time
import json
import sqlite3
import subprocess
import shutil
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

DB_PATH = "/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/PromptDatabase/database/youtube_pipeline.db"
PACKAGED_DIR = "/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/PromptDatabase/output_packaged"
PROJECT_URL = "https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d"
USER_DATA_DIR = "/home/mdkamruzzamanirak_gmail_com/.config/google-chrome"
PROFILE_DIR = "Profile 5"
CHROME_HOME = "/home/mdkamruzzamanirak_gmail_com/.chrome_home"
DOWNLOADS_DIR = os.path.expanduser("~/Downloads")


def cleanup_chrome_locks():
    for lock in Path(USER_DATA_DIR).glob("Singleton*"):
        try:
            lock.unlink()
        except Exception:
            pass


def get_idea_data(idea_id: int):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    idea = cur.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,)).fetchone()
    if not idea:
        raise ValueError(f"Idea #{idea_id} not found in database!")

    prompt_row = cur.execute(
        "SELECT * FROM prompts WHERE idea_id = ? AND title LIKE '%Level 10%Video%'",
        (idea_id,),
    ).fetchone()
    if not prompt_row:
        raise ValueError(f"Level 10 Video prompt for Idea #{idea_id} not found!")

    meta_row = cur.execute(
        "SELECT * FROM youtube_metadata WHERE idea_id = ?",
        (idea_id,),
    ).fetchone()

    conn.close()
    return dict(idea), dict(prompt_row), dict(meta_row) if meta_row else {}


def sanitize_slug(title: str) -> str:
    cleaned = re.sub(r"[^\w\s-]", "", title)
    return re.sub(r"[-\s]+", "_", cleaned).strip("_")


def launch_chrome_cdp():
    cleanup_chrome_locks()
    env = os.environ.copy()
    env["HOME"] = CHROME_HOME
    env["DISPLAY"] = ":99"

    cmd = [
        "/usr/bin/google-chrome",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--remote-debugging-port=9222",
        f"--user-data-dir={USER_DATA_DIR}",
        f"--profile-directory={PROFILE_DIR}",
        PROJECT_URL,
    ]
    proc = subprocess.Popen(cmd, env=env)
    time.sleep(5)
    return proc


def generate_video(idea_id: int):
    idea, prompt_info, meta = get_idea_data(idea_id)
    raw_title = idea["title"]
    slug = sanitize_slug(raw_title)
    folder_name = f"1.{idea_id}.Level_10_{slug}"
    package_dir = os.path.join(PACKAGED_DIR, folder_name)
    os.makedirs(package_dir, exist_ok=True)
    os.makedirs(DOWNLOADS_DIR, exist_ok=True)

    prompt_text = prompt_info["prompt_text"]
    video_target_path = os.path.join(package_dir, f"{folder_name}.mp4")

    print(f"\n=======================================================")
    print(f"🎬 Starting Generation for Idea #{idea_id}: {raw_title}")
    print(f"📁 Package Target: {package_dir}")
    print(f"=======================================================")

    proc = launch_chrome_cdp()
    downloaded_path = None

    try:
        with sync_playwright() as p:
            print("🔗 Connecting to Chrome over CDP on port 9222...")
            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
            context = browser.contexts[0]
            page = context.pages[0] if context.pages else context.new_page()

            print("🌐 Waiting for Google Flow project canvas to settle...")
            page.wait_for_load_state("networkidle")
            time.sleep(3)

            initial_vids = page.locator("video").all()
            initial_count = len(initial_vids)
            print(f"📊 Initial video elements on canvas: {initial_count}")

            # Focus ProseMirror editor
            tb = page.locator("div.ProseMirror").first
            tb.click()
            time.sleep(0.5)

            # Fill prompt
            print(f"✍️ Injecting prompt ({len(prompt_text)} chars)...")
            tb.fill(prompt_text)
            time.sleep(1.5)

            # Submit
            submit_btn = page.locator('button[aria-label="Start generation"], button[type="submit"]').first
            dis = submit_btn.get_attribute("disabled")
            if dis is not None and dis != "false":
                print("⚠️ Submit button disabled, sending keystroke...")
                tb.focus()
                page.keyboard.press("End")
                page.keyboard.type(" ")
                time.sleep(1)

            print("🚀 Clicking Start Generation button (->)...")
            submit_btn.click()
            submission_time = time.time()
            time.sleep(5)

            # Monitor generation
            print("⏳ Monitoring generation (expect ~60-120 seconds)...")
            completed = False
            for elapsed in range(5, 300, 5):
                time.sleep(5)
                cur_vids = page.locator("video").all()
                if len(cur_vids) > initial_count:
                    print(f"🎥 New video element detected on canvas! (Total: {len(cur_vids)})")
                    completed = True
                    time.sleep(3)
                    break
                if elapsed % 20 == 0:
                    print(f"   Generating... {elapsed}s elapsed")

            if not completed:
                raise TimeoutError("Generation timed out after 300 seconds!")

            # Download the newly generated video
            print("📥 Extracting newly generated video...")
            newest_card = page.locator("div[role='article'], div:has(video)").all()[-1]
            newest_card.hover()
            time.sleep(1)

            # Find more_options button (three dots)
            dots = newest_card.locator("button:has(svg), button[aria-label*='more'], button[aria-label*='options']").all()
            if dots:
                dots[-1].click(force=True)
            else:
                newest_card.click(button="right")
            time.sleep(1.5)

            # Hover Download
            dl_menu = page.locator("div[role='menuitem']:has-text('Download'), div:has-text('Download')").first
            if dl_menu.is_visible():
                dl_menu.hover()
                time.sleep(1)

                # Click Original size
                orig_btn = page.locator("div[role='menuitem']:has-text('Original size'), div:has-text('720p'), div:has-text('Original')").first
                if orig_btn.is_visible():
                    print("💾 Clicking 'Original size' to initiate download...")
                    orig_btn.click(force=True)
                    time.sleep(5)

            # Check ~/Downloads for newest mp4
            time.sleep(4)
            for f in sorted(Path(DOWNLOADS_DIR).glob("*.mp4"), key=lambda x: x.stat().st_mtime, reverse=True):
                if f.stat().st_mtime >= submission_time and f.stat().st_size > 1000000:
                    downloaded_path = str(f)
                    print(f"🎉 Found downloaded video: {f} ({f.stat().st_size:,} bytes)")
                    shutil.copy2(downloaded_path, video_target_path)
                    break

            # If not in downloads, extract src attribute from video tag
            if not os.path.exists(video_target_path) or os.path.getsize(video_target_path) < 1000000:
                print("🔍 Extracting video stream directly via src attribute...")
                vid_el = page.locator("video").all()[-1]
                src = vid_el.get_attribute("src")
                if src and src.startswith("http"):
                    req = context.request.get(src)
                    if req.status == 200:
                        Path(video_target_path).write_bytes(req.body())
                        print(f"🎉 Successfully downloaded via direct stream: {video_target_path} ({os.path.getsize(video_target_path):,} bytes)")

            browser.close()
    finally:
        proc.terminate()
        cleanup_chrome_locks()

    if not os.path.exists(video_target_path) or os.path.getsize(video_target_path) < 1000000:
        raise RuntimeError(f"Failed to generate or download video for Idea #{idea_id}!")

    # Packaging: Extract thumbnail
    thumb_path = os.path.join(package_dir, "thumbnail.png")
    print("🖼️ Extracting thumbnail from video frame...")
    subprocess.run(
        ["ffmpeg", "-y", "-ss", "00:00:00.5", "-i", video_target_path, "-vframes", "1", thumb_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Write prompt JSON
    prompt_file = os.path.join(package_dir, "prompt_info.json")
    prompt_file_prefixed = os.path.join(package_dir, f"1.{idea_id}.Level_10_Prompt.json")
    with open(prompt_file, "w", encoding="utf-8") as f:
        json.dump(prompt_info, f, indent=2, ensure_ascii=False)
    shutil.copy2(prompt_file, prompt_file_prefixed)

    # Write metadata JSON
    meta_file = os.path.join(package_dir, "youtube_metadata.json")
    meta_file_prefixed = os.path.join(package_dir, f"1.{idea_id}.Level_10_YouTube_Metadata.json")
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    shutil.copy2(meta_file, meta_file_prefixed)

    # Update SQLite database
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    vid_size = os.path.getsize(video_target_path)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    cur.execute(
        """INSERT INTO generated_videos (
            uuid, idea_id, title, file_path, file_name,
            duration_seconds, width, height, fps, file_size_bytes,
            format, resolution, thumbnail_path, status, created_at
        ) VALUES (hex(randomblob(16)), ?, ?, ?, ?, 8.0, 720, 1280, 24, ?, 'mp4', '720x1280', ?, 'completed', ?)""",
        (idea_id, raw_title, video_target_path, os.path.basename(video_target_path), vid_size, thumb_path, now_iso),
    )

    cur.execute(
        """UPDATE youtube_metadata
           SET status = 'ready',
               package_folder_path = ?,
               video_file_path = ?,
               updated_at = ?
           WHERE idea_id = ?""",
        (package_dir, video_target_path, now_iso, idea_id),
    )

    conn.commit()
    conn.close()

    print(f"✅ Idea #{idea_id} successfully generated, packaged, and synced to SQLite!")
    return video_target_path


if __name__ == "__main__":
    target_id = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    generate_video(target_id)
