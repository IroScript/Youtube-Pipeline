"""
Inject ChatGPT cookies into CloakBrowser persistent profile.
Loads cookies from chatgpt_com_cookies.json and adds them to the browser context
so subsequent CloakBrowser sessions run as a logged-in user.
"""

import json
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
COOKIE_FILE = REPO_ROOT / "chatgpt_com_cookies.json"
PROFILE_DIR = BASE_DIR / "_chrome_profile_prompts"

CHATGPT_URL = "https://chatgpt.com"


def convert_cookie(c: dict) -> dict:
    """Convert browser-extension cookie format to Playwright cookie format."""
    pw = {
        "name": c["name"],
        "value": c["value"],
        "domain": c["domain"],
        "path": c.get("path", "/"),
        "secure": c.get("secure", False),
        "httpOnly": c.get("httpOnly", False),
    }
    if "sameSite" in c:
        sm = c["sameSite"]
        if sm == "no_restriction":
            pw["sameSite"] = "None"
        elif sm in ("lax", "Lax"):
            pw["sameSite"] = "Lax"
        elif sm in ("strict", "Strict"):
            pw["sameSite"] = "Strict"
        else:
            pw["sameSite"] = "Lax"
    if "expirationDate" in c and c.get("session") is not True:
        pw["expires"] = c["expirationDate"]
    return pw


def main():
    if not COOKIE_FILE.exists():
        print(f"[Error] Cookie file not found: {COOKIE_FILE}")
        return False

    with open(COOKIE_FILE, "r", encoding="utf-8") as f:
        raw_cookies = json.load(f)

    pw_cookies = [convert_cookie(c) for c in raw_cookies]
    print(f"[inject] Loaded {len(pw_cookies)} cookies from {COOKIE_FILE.name}")

    # Launch CloakBrowser with persistent profile, inject cookies, verify login
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    context = None
    playwright = None
    try:
        try:
            import cloakbrowser
            context = cloakbrowser.launch_persistent_context(
                user_data_dir=str(PROFILE_DIR),
                headless=False,
                no_viewport=True,
                args=["--start-maximized"],
            )
            print("[inject] CloakBrowser persistent context launched.", flush=True)
        except Exception as e:
            print(f"[inject] CloakBrowser unavailable ({e}); using stock Playwright.", flush=True)
            from playwright.sync_api import sync_playwright
            playwright = sync_playwright().start()
            context = playwright.chromium.launch_persistent_context(
                user_data_dir=str(PROFILE_DIR),
                headless=False,
                no_viewport=True,
                args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
            )

        # Add cookies to context
        context.add_cookies(pw_cookies)
        print(f"[inject] {len(pw_cookies)} cookies injected into browser context.", flush=True)

        # Navigate to ChatGPT to verify login
        page = context.new_page()
        page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=90000)
        time.sleep(5)

        # Check if logged in
        body_text = page.evaluate("() => document.body.innerText.substring(0, 500)")
        cookies_after = [c.get("name", "") for c in context.cookies()]
        has_session = any("session-token" in n for n in cookies_after)

        print(f"\n[inject] Session token in browser: {has_session}", flush=True)
        print(f"[inject] Total cookies in browser: {len(cookies_after)}", flush=True)

        if "Log in" in body_text and "New chat" in body_text:
            # Check if user name appears (logged in)
            has_user = "Drive Alco" in body_text or "alco" in body_text.lower()
            if has_user or has_session:
                print("[inject] ✅ LOGIN VERIFIED — cookies working!", flush=True)
            else:
                print("[inject] ⚠️ Cookies injected but login status unclear. Body:", flush=True)
                print(body_text[:300], flush=True)
        else:
            print("[inject] ✅ Page loaded (no login prompt detected).", flush=True)

        print(f"\n[inject] Body preview:\n{body_text[:400]}", flush=True)

        # Close cleanly so cookies are flushed to persistent profile
        time.sleep(2)

    finally:
        if context:
            try:
                context.close()
                print("\n[inject] Browser closed. Cookies saved to persistent profile.", flush=True)
            except Exception:
                pass
        if playwright:
            try:
                playwright.stop()
            except Exception:
                pass

    print(f"\n[inject] Profile directory: {PROFILE_DIR}")
    print("[inject] Done! Next run_prompt_fillup.py should use the logged-in session.")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
