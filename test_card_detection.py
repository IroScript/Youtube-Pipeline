import os
import sys
import time
import glob
import subprocess
from playwright.sync_api import sync_playwright

flow_url = "https://flow.google.com/project/b1798769-23be-4a97-9a59-4e6d979f6b3d"
download_dir = "/home/mdkamruzzamanirak_gmail_com/Downloads"
chrome_user_data = "/home/mdkamruzzamanirak_gmail_com/.config/google-chrome"
chrome_profile = "Profile 5"

env = os.environ.copy()
env["HOME"] = "/home/mdkamruzzamanirak_gmail_com/.chrome_home"
env["DISPLAY"] = ":99"

cmd = [
    "/usr/bin/google-chrome",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--remote-debugging-port=9222",
    f"--user-data-dir={chrome_user_data}",
    f"--profile-directory={chrome_profile}",
    flow_url
]

print("Launching Chrome for download verification...")
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

        # Locate cards using resilient query:
        cards = page.evaluate("""() => {
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
            // Sort by top row first, then left to right
            list.sort((a, b) => {
                if (Math.abs(a.top - b.top) > 50) return a.top - b.top;
                return a.left - b.left;
            });
            return list;
        }""")

        print(f"Detected {len(cards)} valid cards. First card at ({cards[0]['x']}, {cards[0]['y']})")
        first_card = cards[0]

        print(f"Right-clicking card at ({first_card['x']}, {first_card['y']})...")
        page.mouse.click(first_card['x'], first_card['y'], button="right")
        time.sleep(2)

        dl_item = page.locator("[role='menuitem']:has-text('Download')").first
        if dl_item.is_visible():
            print("Download option visible, hovering...")
            dl_item.hover()
            time.sleep(1.5)

            target_size = page.locator("[role='menuitem']:has-text('720p'), [role='menuitem']:has-text('Original')").first
            if target_size.is_visible():
                print("Clicking 720p / Original size...")
                target_size.click(force=True)
            else:
                page.locator("div:has-text('720p')").last.click(force=True)

            print("Waiting for download to finish...")
            for w in range(20):
                time.sleep(2)
                new_files = [f for f in glob.glob(f"{download_dir}/*") if f not in pre_files]
                mp4s = [f for f in new_files if f.endswith(".mp4")]
                crds = [f for f in new_files if f.endswith(".crdownload")]
                print(f"[{w*2}s] mp4s={mp4s}, crds={crds}")
                if mp4s and not crds:
                    print(f"SUCCESSFULLY DOWNLOADED: {mp4s[0]}")
                    break
        else:
            print("Download menu item not found.")

        browser.close()
finally:
    proc.terminate()
    print("Chrome terminated.")
