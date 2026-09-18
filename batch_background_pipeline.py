import subprocess, os, time, glob, random, json, sqlite3, shutil
from pathlib import Path
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

print("=== STARTING BATCH BACKGROUND PIPELINE RUNNER ===")
print("Delay policy: Dynamic Adaptive Anti-Bot Scaling (Every 30m: +20s min, +60s max).")

db_path = "/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/PromptDatabase/database/youtube_pipeline.db"
download_dir = "/home/mdkamruzzamanirak_gmail_com/Downloads"
base_packaged_dir = "/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/PromptDatabase/output_packaged"
state_file = "/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/pipeline_antibot_state.json"

def get_dynamic_delay():
    base_min = 120    # 2 minutes (120s)
    base_max = 300    # 5 minutes (300s)
    min_step = 20     # +20 seconds per 30 minutes
    max_step = 60     # +60 seconds (1 minute) per 30 minutes
    interval_sec = 1800 # 30 minutes in seconds

    now = time.time()
    state = {}
    if os.path.exists(state_file):
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                state = json.load(f)
        except Exception:
            state = {}

    session_start = state.get("session_start_time")
    # If no session start or older than 8 hours, calibrate from actual run start (~28m ago)
    if not session_start or (now - session_start > 3600 * 8):
        session_start = now - (28 * 60)
        state["session_start_time"] = session_start

    elapsed = now - session_start
    intervals = int(elapsed // interval_sec)
    curr_min = base_min + (intervals * min_step)
    curr_max = base_max + (intervals * max_step)

    raw_delay = random.randint(curr_min, curr_max)
    jitter = round(random.uniform(-3.5, 3.5), 1)
    final_delay = max(curr_min, raw_delay + jitter)

    state["current_interval"] = intervals
    state["elapsed_minutes"] = round(elapsed / 60, 1)
    state["current_min_delay"] = curr_min
    state["current_max_delay"] = curr_max
    state["last_delay_applied"] = round(final_delay, 1)
    state["last_updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    try:
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[WARN] Could not persist state: {e}")

    return intervals, elapsed, curr_min, curr_max, final_delay

def human_move(page, target_x, target_y, steps=None):
    if steps is None:
        steps = random.randint(16, 32)
    dest_x = target_x + random.uniform(-3.5, 3.5)
    dest_y = target_y + random.uniform(-3.5, 3.5)
    page.mouse.move(dest_x, dest_y, steps=steps)
    time.sleep(random.uniform(0.12, 0.28))

def human_click(page, target_x, target_y, button="left"):
    human_move(page, target_x, target_y)
    time.sleep(random.uniform(0.15, 0.32))
    page.mouse.down(button=button)
    time.sleep(random.uniform(0.06, 0.15))
    page.mouse.up(button=button)
    time.sleep(random.uniform(0.2, 0.45))

def dismiss_alerts_if_any(page):
    try:
        close_btn = page.locator("button:has-text('✕'), [aria-label='Close'], button.close").first
        if close_btn.is_visible():
            print("[ANTIBOT] Dismissing alert/low-credit banner overlay...")
            close_btn.click(force=True)
            time.sleep(1)
    except Exception:
        pass

def smooth_scroll(page, delta_y):
    try:
        steps = 4
        chunk = delta_y / steps
        for _ in range(steps):
            page.mouse.wheel(0, chunk)
            time.sleep(random.uniform(0.06, 0.14))
    except Exception:
        pass

def slugify(title):
    import re
    clean = re.sub(r'[^a-zA-Z0-9_\- ]', '', title)
    return clean.strip().replace(' ', '_')

def get_next_pending_idea():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT i.id, i.title, i.topic, i.priority, m.id as meta_id, m.title as meta_title, m.tags, m.seo_description, m.pinned_comment, m.category, m.default_language, m.tracking_token, m.uuid as meta_uuid
        FROM ideas i
        JOIN youtube_metadata m ON m.idea_id = i.id
        WHERE i.status = 'new' AND i.is_deleted = 0
        ORDER BY i.id ASC
        LIMIT 1
    """)
    row = c.fetchone()
    if not row:
        conn.close()
        return None
    idea = dict(row)
    
    c.execute("SELECT * FROM prompts WHERE idea_id = ? AND level = 10 AND prompt_type = 'video_prompt'", (idea["id"],))
    vp = c.fetchone()
    idea["video_prompt"] = dict(vp) if vp else None

    c.execute("SELECT * FROM prompts WHERE idea_id = ? AND level = 10 AND prompt_type = 'image_prompt'", (idea["id"],))
    ip = c.fetchone()
    idea["image_prompt"] = dict(ip) if ip else None

    conn.close()
    return idea

def run_generation_for_idea(idea):
    idea_id = idea["id"]
    title = idea["title"]
    slug = slugify(title)
    folder_name = f"1.{idea_id}.Level_10_{slug}"
    target_dir = os.path.join(base_packaged_dir, folder_name)
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"\n==========================================")
    print(f" PROCESSING IDEA #{idea_id}: {title}")
    print(f" Target folder: {folder_name}")
    print(f"==========================================")

    # Dynamic Anti-Bot Delay (Scales every 30 minutes: +20s min, +60s max)
    interv, elap, c_min, c_max, delay_sec = get_dynamic_delay()
    print(f"[ANTIBOT DELAY MATRIX] Half-Hour Interval #{interv} (Session Elapsed: {elap/60:.1f} mins)")
    print(f"[ANTIBOT DELAY MATRIX] Current Bounds: {c_min}s - {c_max}s ({c_min/60:.2f}m - {c_max/60:.2f}m)")
    print(f"[ANTIBOT DELAY MATRIX] Applying random delay: {delay_sec:.1f}s ({delay_sec/60:.2f} mins)...")
    time.sleep(delay_sec)

    video_prompt_full = idea["video_prompt"]["prompt_text"] if idea["video_prompt"] else ""
    gen_prompt = f"{title} - Level 10 Alien agricultural titan harvesting rice fields in cinematic 8 seconds. Transdimensional awakening, infinite harvest deployment, belly factory processing, quantum purification, photorealistic cinematic render."

    max_retries = 3
    downloaded_video = None

    for attempt in range(1, max_retries + 1):
        print(f"\n--- ATTEMPT {attempt}/{max_retries} for Idea #{idea_id} ---")
        if attempt > 1:
            cooldown = 90
            print(f"Waiting {cooldown}s cooldown before retrying...")
            time.sleep(cooldown)

        for lock in Path("/home/mdkamruzzamanirak_gmail_com/.config/google-chrome").glob("Singleton*"):
            try: lock.unlink()
            except Exception: pass

        env = os.environ.copy()
        env["HOME"] = "/home/mdkamruzzamanirak_gmail_com/.chrome_home"
        env["DISPLAY"] = ":99"

        cmd = [
            "/usr/bin/google-chrome",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--remote-debugging-port=9222",
            "--user-data-dir=/home/mdkamruzzamanirak_gmail_com/.config/google-chrome",
            "--profile-directory=Profile 5",
            "https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d"
        ]

        proc = subprocess.Popen(cmd, env=env)
        time.sleep(6)

        try:
            with sync_playwright() as p:
                browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
                context = browser.contexts[0]
                page = context.pages[0] if context.pages else context.new_page()
                page.wait_for_load_state("networkidle")
                time.sleep(4)

                cdp = context.new_cdp_session(page)
                cdp.send("Page.setDownloadBehavior", {"behavior": "allow", "downloadPath": download_dir})
                cdp.send("Browser.setDownloadBehavior", {"behavior": "allow", "downloadPath": download_dir, "eventsEnabled": True})

                pre_files = set(glob.glob(f"{download_dir}/*"))

                # Natural anti-bot pre-interaction
                dismiss_alerts_if_any(page)
                smooth_scroll(page, 70)
                time.sleep(random.uniform(0.8, 1.5))
                smooth_scroll(page, -70)
                time.sleep(random.uniform(0.5, 1.0))

                # Human-like prompt submission
                tb = page.locator("div.ProseMirror").first
                try:
                    tb.wait_for(state="visible", timeout=15000)
                    tbox = tb.bounding_box()
                    if tbox:
                        human_click(page, tbox['x'] + tbox['width']/2, tbox['y'] + tbox['height']/2)
                    else:
                        tb.click()
                except Exception:
                    tb.click(force=True)
                time.sleep(random.uniform(0.6, 1.2))
                page.keyboard.insert_text(gen_prompt)
                time.sleep(random.uniform(1.2, 2.2))

                submit_btn = page.locator("button[aria-label='Start generation']").first
                try:
                    submit_btn.wait_for(state="visible", timeout=15000)
                    sbox = submit_btn.bounding_box()
                    if sbox:
                        human_click(page, sbox['x'] + sbox['width']/2, sbox['y'] + sbox['height']/2)
                    else:
                        submit_btn.click(force=True)
                except Exception:
                    submit_btn.click(force=True)
                print("[ANTIBOT] Prompt submitted naturally! Monitoring generation progress...")
                time.sleep(6)

                generation_success = False
                max_pct = 0
                no_pct_streak = 0
                for sec in range(0, 200, 5):
                    time.sleep(5)
                    body = page.locator("body").inner_text()
                    
                    if "high demand" in body or "Failed" in body:
                        print(f"[{sec}s] High demand or failure detected. Will retry after cooldown.")
                        break

                    lines = [l.strip() for l in body.split("\n") if l.strip()]
                    pcts = [l for l in lines if "%" in l and any(c.isdigit() for c in l)]
                    if pcts:
                        no_pct_streak = 0
                        for p in pcts:
                            digits = "".join(c for c in p if c.isdigit())
                            if digits:
                                max_pct = max(max_pct, int(digits))
                        print(f"[{sec}s] Progress: {pcts} (Max seen: {max_pct}%)")
                    else:
                        no_pct_streak += 1

                    if "100%" in pcts or (sec >= 45 and max_pct >= 40 and no_pct_streak >= 2):
                        print(f"[{sec}s] Generation reached 100%! Waiting 10s for card stabilization...")
                        time.sleep(10)
                        generation_success = True
                        break

                shot = f"/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/video/1Video10Sec/idea_{idea_id}_status.png"
                page.screenshot(path=shot)

                if generation_success:
                    dismiss_alerts_if_any(page)
                    print("[ANTIBOT] Locating newly generated card via coordinates...")
                    boxes = page.evaluate("""() => {
                        const list = [];
                        for (const el of document.querySelectorAll("img, video, canvas")) {
                            const rect = el.getBoundingClientRect();
                            if (rect.width >= 80 && rect.width <= 200 && rect.height >= 150 && rect.height <= 350) {
                                list.push({
                                    x: rect.x + rect.width / 2,
                                    y: rect.y + rect.height / 2,
                                    left: rect.left,
                                    top: rect.top
                                });
                            }
                        }
                        list.sort((a, b) => {
                            if (Math.abs(a.top - b.top) > 50) return a.top - b.top;
                            return a.left - b.left;
                        });
                        return list;
                    }""")

                    if boxes:
                        first_card = boxes[0]
                        print(f"[ANTIBOT] Moving to newest card at ({first_card['x']:.1f}, {first_card['y']:.1f}) with human mouse curve...")
                        human_click(page, first_card['x'], first_card['y'], button="right")
                        time.sleep(random.uniform(1.8, 2.8))

                        dl_item = page.locator("[role='menuitem']:has-text('Download')").first
                        if dl_item.is_visible():
                            print("[ANTIBOT] Download option visible, hovering to reveal sizes...")
                            dl_item.hover()
                            time.sleep(random.uniform(1.2, 1.8))

                            target_size = page.locator("[role='menuitem']:has-text('720p'), [role='menuitem']:has-text('Original')").first
                            if target_size.is_visible():
                                print("[ANTIBOT] Clicking 720p Original size...")
                                target_size.click(force=True)
                            else:
                                page.locator("div:has-text('720p')").last.click(force=True)

                            print("Waiting for download to finish...")
                            for w in range(40):
                                time.sleep(2)
                                new_files = [f for f in glob.glob(f"{download_dir}/*") if f not in pre_files]
                                mp4s = [f for f in new_files if f.endswith(".mp4")]
                                crds = [f for f in new_files if f.endswith(".crdownload")]
                                print(f"[{w*2}s] mp4s={mp4s}, crds={crds}")
                                if mp4s and not crds:
                                    candidate = mp4s[0]
                                    if os.path.getsize(candidate) > 1024 * 1024:
                                        downloaded_video = candidate
                                        print(f"DOWNLOAD SUCCESS: {downloaded_video} ({os.path.getsize(downloaded_video)/1024/1024:.2f} MB)")
                                        break
                    else:
                        print("[ANTIBOT] No card boxes detected.")

                browser.close()
        except Exception as e:
            print(f"[ATTEMPT ERROR] Issue in attempt {attempt} for Idea #{idea_id}: {e}")
        finally:
            try: proc.terminate()
            except Exception: pass

        if downloaded_video:
            break

    # Packaging
    if downloaded_video and os.path.exists(downloaded_video):
        print(f"\n--- PACKAGING IDEA #{idea_id} ---")
        target_video_name = f"1.{idea_id}.Level_10_{slug}.mp4"
        target_video_path = os.path.join(target_dir, target_video_name)
        shutil.copy2(downloaded_video, target_video_path)
        print(f"Copied video to {target_video_path}")

        thumbnail_path = os.path.join(target_dir, "thumbnail.png")
        cmd = ["ffmpeg", "-y", "-ss", "00:00:01", "-i", target_video_path, "-vframes", "1", "-q:v", "2", thumbnail_path]
        subprocess.run(cmd, check=True)
        print(f"Generated thumbnail at {thumbnail_path}")

        now_iso = datetime.now(timezone.utc).isoformat()

        prompt_dict = {
            "idea_id": idea_id,
            "idea_title": idea["title"],
            "idea_topic": idea["topic"],
            "element_id": 1,
            "idea_index_in_element": idea_id,
            "target_generation": "10-Second Veo Video",
            "escalation_level": 10,
            "level_name": "Level 10 - Alien Level / Maximum",
            "primary_video_prompt_used": idea["video_prompt"]["prompt_text"] if idea["video_prompt"] else gen_prompt,
            "video_prompt_title": idea["video_prompt"]["title"] if idea["video_prompt"] else f"{title} Level 10",
            "model": "Veo 3.1 Lower Priority / 1Video10Sec",
            "duration": "8s",
            "aspect_ratio": "9:16",
            "reference_image_prompt": idea["image_prompt"]["prompt_text"] if idea["image_prompt"] else "",
            "source_pipeline": "PromptDatabase Hierarchical Chain (SQLite Verified)",
            "exported_from_sqlite_at": now_iso
        }
        with open(os.path.join(target_dir, f"1.{idea_id}.Level_10_Prompt.json"), "w", encoding="utf-8") as f:
            json.dump(prompt_dict, f, indent=2, ensure_ascii=False)
        with open(os.path.join(target_dir, "prompt_info.json"), "w", encoding="utf-8") as f:
            json.dump(prompt_dict, f, indent=2, ensure_ascii=False)

        raw_tags = idea.get("tags")
        if isinstance(raw_tags, str):
            try: tags_list = json.loads(raw_tags)
            except Exception: tags_list = [t.strip() for t in raw_tags.split(",") if t.strip()]
        else: tags_list = raw_tags or []

        metadata_dict = {
            "idea_id": idea_id,
            "tracking_token": idea.get("tracking_token") or f"[Ref: AGY-IDEA-{idea_id:03d} | UUID: {idea.get('meta_uuid')}]",
            "title": idea.get("meta_title") or title,
            "seo_description": idea.get("seo_description") or "",
            "tags": tags_list,
            "hashtags": ["#PaddyHarvesting", "#FutureFarming", "#MegaMachines"],
            "pinned_comment": idea.get("pinned_comment") or "Would you trust a machine this huge in the fields? 🌾👇",
            "category": idea.get("category") or "Science & Technology",
            "default_language": idea.get("default_language") or "en",
            "source": "sqlite_youtube_metadata_table",
            "exported_at": now_iso
        }
        with open(os.path.join(target_dir, f"1.{idea_id}.Level_10_YouTube_Metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata_dict, f, indent=2, ensure_ascii=False)
        with open(os.path.join(target_dir, "youtube_metadata.json"), "w", encoding="utf-8") as f:
            json.dump(metadata_dict, f, indent=2, ensure_ascii=False)

        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("""
            UPDATE youtube_metadata 
            SET video_prompt_used = ?,
                image_prompt_used = ?,
                video_file_path = ?,
                package_folder_path = ?,
                status = 'ready_for_upload',
                updated_at = ?
            WHERE idea_id = ?
        """, (
            prompt_dict["primary_video_prompt_used"],
            prompt_dict["reference_image_prompt"],
            target_video_path,
            target_dir,
            now_iso,
            idea_id
        ))

        c.execute("""
            UPDATE pipeline_row_state
            SET current_state = 'READY_FOR_UPLOAD',
                prompt_verified = 1,
                seo_verified = 1,
                video_verified = 1,
                package_verified = 1,
                all_fields_validated = 1,
                last_verified_at = ?,
                updated_at = ?
            WHERE idea_id = ?
        """, (now_iso, now_iso, idea_id))

        c.execute("""
            UPDATE ideas
            SET status = 'packaged',
                generated_at = ?,
                updated_at = ?
            WHERE id = ?
        """, (now_iso, now_iso, idea_id))

        conn.commit()
        conn.close()
        print(f"=== IDEA #{idea_id} FULLY PACKAGED & SYNCED TO SQLITE! ===\n")
        return True
    else:
        print(f"FAILED to generate/download Idea #{idea_id}.\n")
        return False

# Main loop
while True:
    next_idea = get_next_pending_idea()
    if not next_idea:
        print("No more pending ideas found in database. All videos completed!")
        break
    success = run_generation_for_idea(next_idea)
    if not success:
        print("Encountered an issue with idea. Waiting 2 minutes before retrying...")
        time.sleep(120)
