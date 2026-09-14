import sys, time, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_SECRETS = "/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/client_secrets.json"
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube"
]

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
proc = subprocess.Popen(cmd, env=env)
time.sleep(4)

flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
print(f"Generated Auth URL:\n{auth_url}", flush=True)

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    context = browser.contexts[0]
    page = context.new_page()
    page.goto(auth_url)
    page.wait_for_timeout(4000)
    
    screenshot_path = "/home/mdkamruzzamanirak_gmail_com/.gemini/antigravity-cli/brain/eaae5e71-bf3e-4d3c-b33f-0a546c23255e/oauth_screen.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to: {screenshot_path}", flush=True)
    print("Page Title:", page.title(), flush=True)
    print("Page URL:", page.url, flush=True)
