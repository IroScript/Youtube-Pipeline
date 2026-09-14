import sys, time, os, subprocess, threading, json
from pathlib import Path
from playwright.sync_api import sync_playwright
from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_SECRETS = "/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/client_secrets.json"
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube"
]

TOKEN_SAVE_PATHS = [
    Path("/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/token.json"),
    Path("/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/youtube-uploader-eval/secrets/astrosparksai/youtube_token.json")
]

# Ensure target directories exist
for p in TOKEN_SAVE_PATHS:
    p.parent.mkdir(parents=True, exist_ok=True)

# Clean locks
for lock in Path("/home/mdkamruzzamanirak_gmail_com/.config/google-chrome").glob("Singleton*"):
    try:
        lock.unlink()
    except Exception:
        pass

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
    "about:blank"
]
chrome_proc = subprocess.Popen(cmd, env=env)
time.sleep(4)

flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)

creds_container = []
def run_server():
    try:
        print("[OAuth Server] Starting local OAuth server on port 8090...", flush=True)
        creds = flow.run_local_server(port=8090, open_browser=False)
        creds_container.append(creds)
        print("[OAuth Server] Successfully received credentials!", flush=True)
    except Exception as e:
        print(f"[OAuth Server Error]: {e}", flush=True)

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

# Wait for server to bind port and generate url
time.sleep(2)
auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
print(f"[Auth URL]: {auth_url}", flush=True)

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    context = browser.contexts[0]
    page = context.new_page()
    page.goto(auth_url)
    page.wait_for_timeout(4000)
    
    shot1 = "/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e/oauth_step1.png"
    page.screenshot(path=shot1)
    print(f"Step 1 Screenshot: {shot1} | URL: {page.url} | Title: {page.title()}", flush=True)

    # If choose account screen
    acc_locator = page.locator("div[data-identifier*='mainuddin'], div:has-text('mainuddinh297@gmail.com')").first
    if acc_locator.is_visible(timeout=3000):
        print("Clicking mainuddinh297 account...", flush=True)
        acc_locator.click()
        page.wait_for_timeout(4000)
    
    shot2 = "/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e/oauth_step2.png"
    page.screenshot(path=shot2)
    print(f"Step 2 Screenshot: {shot2} | URL: {page.url} | Title: {page.title()}", flush=True)

    # Check for Advanced button (if app is unverified)
    adv_btn = page.locator("button:has-text('Advanced'), a:has-text('Advanced')").first
    if adv_btn.is_visible(timeout=3000):
        print("Clicking Advanced...", flush=True)
        adv_btn.click()
        page.wait_for_timeout(1500)
        go_link = page.locator("a:has-text('Go to driveAutomation (unsafe)'), a:has-text('Go to')").first
        if go_link.is_visible(timeout=3000):
            print("Clicking Go to unsafe...", flush=True)
            go_link.click()
            page.wait_for_timeout(3000)

    shot3 = "/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e/oauth_step3.png"
    page.screenshot(path=shot3)
    print(f"Step 3 Screenshot: {shot3} | URL: {page.url} | Title: {page.title()}", flush=True)

    # Check for checkboxes (permissions)
    checkboxes = page.locator("input[type='checkbox']").all()
    print(f"Found {len(checkboxes)} checkboxes", flush=True)
    for cb in checkboxes:
        try:
            if not cb.is_checked():
                cb.check()
        except:
            pass

    # Click Continue / Allow
    cont_btn = page.locator("button:has-text('Continue'), button:has-text('Allow'), input[type='submit'][value='Allow']").first
    if cont_btn.is_visible(timeout=3000):
        print("Clicking Continue/Allow button...", flush=True)
        cont_btn.click()
        page.wait_for_timeout(5000)

    shot4 = "/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e/oauth_step4.png"
    page.screenshot(path=shot4)
    print(f"Step 4 Screenshot: {shot4} | URL: {page.url} | Title: {page.title()}", flush=True)

# Wait up to 10 seconds for server to finish credential exchange
server_thread.join(timeout=10)

if creds_container:
    creds = creds_container[0]
    creds_json = creds.to_json()
    for p in TOKEN_SAVE_PATHS:
        p.write_text(creds_json, encoding="utf-8")
        print(f"✅ Token successfully saved to: {p}", flush=True)
else:
    print("⚠️ Credentials not captured yet.", flush=True)
