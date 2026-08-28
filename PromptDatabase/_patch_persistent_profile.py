"""One-shot patcher: give prompt_chain_engine.call_chatgpt_playwright a persistent
Chrome profile so the chatgpt.com login survives between runs.

Old logic is preserved: both original launch paths stay in the file and remain
reachable via PROMPT_BROWSER_PERSISTENT=0. Nothing is deleted.
"""
import pathlib
import sys

p = pathlib.Path("prompt_chain_engine.py")
src = p.read_text(encoding="utf-8")
orig = src


def patch(old, new, label):
    global src
    n = src.count(old)
    if n != 1:
        print(f"FAIL [{label}]: expected 1 match, found {n}")
        sys.exit(1)
    src = src.replace(old, new, 1)
    print(f"  ok [{label}]")


# ---------------------------------------------------------------- 1. constants
patch(
    '''CHATGPT_URL = "https://chatgpt.com"
OUTPUT_DIR = BASE_DIR / "output_packaged"
''',
    '''CHATGPT_URL = "https://chatgpt.com"
OUTPUT_DIR = BASE_DIR / "output_packaged"

# ----------------------------------------------------------------------------
# PERSISTENT BROWSER PROFILE (fix 2026-08-27)
# ----------------------------------------------------------------------------
# call_chatgpt_playwright() used to launch a NON-persistent context, i.e. a brand
# new empty Chrome profile on every single call. No cookie ever survived, so
# chatgpt.com was always logged out, always answered with an empty response, and
# generate_escalation_for_idea() always returned [] -- which is why 97 of 132
# ideas were frozen at the escalation stage. Logging in by hand did not help,
# because the profile was thrown away when the window closed.
#
# The correct pattern already existed in this repo at
# seo_engine/browser_llm.py:170 (launch_persistent_context + user_data_dir);
# this mirrors it. Point PROMPT_BROWSER_PROFILE_DIR at
# seo_engine/_chrome_profile_seo if you would rather share one login with the
# SEO engine (only safe when the two never run at the same time -- a Chrome
# profile cannot be opened by two processes at once).
#
# Escape hatch: PROMPT_BROWSER_PERSISTENT=0 restores the exact old behaviour.
PROMPT_BROWSER_PROFILE_DIR = Path(
    os.getenv("PROMPT_BROWSER_PROFILE_DIR", str(BASE_DIR / "_chrome_profile_prompts"))
)
PROMPT_BROWSER_PERSISTENT = os.getenv("PROMPT_BROWSER_PERSISTENT", "1") == "1"
''',
    "constants",
)

# ---------------------------------------------------------------- 2. signature
patch(
    '''def call_chatgpt_playwright(prompt_text: str, wait_seconds: int = 240, headless: bool = False) -> str:
    """Executes prompt on ChatGPT via CloakBrowser / Playwright anti-detect stealth automation."""''',
    '''def call_chatgpt_playwright(prompt_text: str, wait_seconds: int = 240, headless: bool = False,
                            persistent: bool = None) -> str:
    """Executes prompt on ChatGPT via CloakBrowser / Playwright anti-detect stealth automation.

    persistent=None (default) follows PROMPT_BROWSER_PERSISTENT (on unless set to 0), which
    reuses PROMPT_BROWSER_PROFILE_DIR so a one-time chatgpt.com login survives between runs.
    Pass persistent=False for the original throwaway-profile behaviour.
    """''',
    "signature",
)

# ------------------------------------------------------------- 3. launch block
patch(
    '''    output_text = ""
    context = None
    try:
        import cloakbrowser
        context = cloakbrowser.launch_context(
            headless=headless,
            no_viewport=True,
            args=["--start-maximized"]
        )
    except Exception as e:
        print(f"[Notice] Falling back to standard Playwright context: {e}", flush=True)
        from playwright.sync_api import sync_playwright
        p = sync_playwright().start()
        browser = p.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"]
        )
        context = browser.new_context(no_viewport=True)
''',
    '''    output_text = ""
    context = None
    playwright = None   # tracked so the persistent profile lock is released on teardown
    browser = None
    use_persistent = PROMPT_BROWSER_PERSISTENT if persistent is None else persistent
    try:
        import cloakbrowser
        if use_persistent:
            PROMPT_BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)
            print(f"[CloakBrowser] Persistent profile: {PROMPT_BROWSER_PROFILE_DIR}", flush=True)
            context = cloakbrowser.launch_persistent_context(
                user_data_dir=str(PROMPT_BROWSER_PROFILE_DIR),
                headless=headless,
                no_viewport=True,
                args=["--start-maximized"],
            )
        else:
            # ORIGINAL non-persistent path, kept intact (PROMPT_BROWSER_PERSISTENT=0).
            context = cloakbrowser.launch_context(
                headless=headless,
                no_viewport=True,
                args=["--start-maximized"]
            )
    except Exception as e:
        print(f"[Notice] Falling back to standard Playwright context: {e}", flush=True)
        from playwright.sync_api import sync_playwright
        p = sync_playwright().start()
        playwright = p
        if use_persistent:
            PROMPT_BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(PROMPT_BROWSER_PROFILE_DIR),
                headless=headless,
                no_viewport=True,
                args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
            )
        else:
            # ORIGINAL non-persistent fallback, kept intact.
            browser = p.chromium.launch(
                headless=headless,
                args=["--disable-blink-features=AutomationControlled", "--start-maximized"]
            )
            context = browser.new_context(no_viewport=True)
''',
    "launch block",
)

# ----------------------------------------------------------------- 4. teardown
patch(
    '''    finally:
        if context:
            try:
                context.close()
                print("[CloakBrowser] Browser window closed cleanly.", flush=True)
            except Exception:
                pass

    return output_text
''',
    '''    finally:
        if context:
            try:
                context.close()
                print("[CloakBrowser] Browser window closed cleanly.", flush=True)
            except Exception:
                pass
        # Release the driver/browser handles too. Required for the persistent profile:
        # a leaked playwright process keeps the profile locked and the NEXT run cannot
        # reopen it. Both are None on the original cloakbrowser path, so that teardown
        # is unchanged.
        for _handle, _stop in ((browser, "close"), (playwright, "stop")):
            if _handle is None:
                continue
            try:
                getattr(_handle, _stop)()
            except Exception:
                pass

    return output_text
''',
    "teardown",
)

# ------------------------------------------------------- 5. login helper (new)
patch(
    '''# ============================================================================
# 2. GENERATION WORKERS FOR EACH HIERARCHICAL LEVEL
# ============================================================================
''',
    '''def login_to_chatgpt(headless: bool = False, wait_minutes: int = 10) -> bool:
    """One-time interactive sign-in for the persistent prompt-chain profile.

    Opens PROMPT_BROWSER_PROFILE_DIR at chatgpt.com and waits for a human to log in,
    polling for the session cookie. Once it appears the window is closed cleanly so
    the cookie is flushed to disk, and every later call_chatgpt_playwright() run
    reuses it. Additive helper -- no existing code path calls it.
    """
    print("\\n" + "=" * 70)
    print("ONE-TIME CHATGPT LOGIN (persistent prompt-chain profile)")
    print("=" * 70)
    print(f"Profile: {PROMPT_BROWSER_PROFILE_DIR}")
    print("Sign in to chatgpt.com in the window that opens. Detection is automatic.")
    print(f"Waiting up to {wait_minutes} minutes...\\n", flush=True)

    PROMPT_BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    context = None
    playwright = None
    logged_in = False
    try:
        try:
            import cloakbrowser
            context = cloakbrowser.launch_persistent_context(
                user_data_dir=str(PROMPT_BROWSER_PROFILE_DIR),
                headless=headless,
                no_viewport=True,
                args=["--start-maximized"],
            )
        except Exception as e:
            print(f"[Notice] CloakBrowser unavailable ({e}); using stock Playwright.", flush=True)
            from playwright.sync_api import sync_playwright
            playwright = sync_playwright().start()
            context = playwright.chromium.launch_persistent_context(
                user_data_dir=str(PROMPT_BROWSER_PROFILE_DIR),
                headless=headless,
                no_viewport=True,
                args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
            )

        page = context.new_page()
        page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=60000)

        deadline = time.time() + wait_minutes * 60
        while time.time() < deadline:
            time.sleep(5)
            try:
                names = [c.get("name", "") for c in context.cookies()]
            except Exception:
                names = []
            if any("session-token" in n for n in names):
                logged_in = True
                print("\\n[OK] Session cookie detected -- login captured.", flush=True)
                break
            remaining = int(deadline - time.time())
            print(f"  ...waiting for sign-in ({remaining}s left, {len(names)} cookies so far)", flush=True)
    finally:
        if context:
            try:
                context.close()
            except Exception:
                pass
        if playwright:
            try:
                playwright.stop()
            except Exception:
                pass

    print("=" * 70)
    if logged_in:
        print("LOGIN SAVED. Escalation prompt generation can now run for real.")
    else:
        print("NOT LOGGED IN. No session cookie was found -- run --login again.")
    print("=" * 70 + "\\n", flush=True)
    return logged_in


def check_prompt_browser_login() -> bool:
    """Read-only: report whether the persistent prompt-chain profile holds a login."""
    import sqlite3
    cookie_db = PROMPT_BROWSER_PROFILE_DIR / "Default" / "Network" / "Cookies"
    if not cookie_db.exists():
        print(f"[Login] No profile yet at {PROMPT_BROWSER_PROFILE_DIR} -- run --login first.")
        return False
    try:
        con = sqlite3.connect(f"file:{cookie_db}?mode=ro&immutable=1", uri=True)
        names = [r[0] for r in con.execute("SELECT name FROM cookies")]
        con.close()
    except Exception as e:
        print(f"[Login] Could not read cookie store: {e}")
        return False
    ok = any("session-token" in n for n in names)
    print(f"[Login] Profile: {PROMPT_BROWSER_PROFILE_DIR}")
    print(f"[Login] Cookies: {len(names)} | session-token present: {ok}")
    if not ok:
        print("[Login] Anonymous cookies only -- escalation generation will return empty.")
    return ok


# ============================================================================
# 2. GENERATION WORKERS FOR EACH HIERARCHICAL LEVEL
# ============================================================================
''',
    "login helper",
)

# ---------------------------------------------------------------------- 6. CLI
patch(
    '''    parser.add_argument("--skip-browser", action="store_true", help="Skip live browser launch and test resolution logic")
    args = parser.parse_args()
''',
    '''    parser.add_argument("--skip-browser", action="store_true", help="Skip live browser launch and test resolution logic")
    parser.add_argument("--login", action="store_true", help="One-time chatgpt.com sign-in into the persistent prompt-chain profile, then exit")
    parser.add_argument("--check-login", action="store_true", help="Report whether the persistent prompt-chain profile holds a chatgpt.com login, then exit")
    args = parser.parse_args()

    if args.check_login:
        sys.exit(0 if check_prompt_browser_login() else 1)

    if args.login:
        sys.exit(0 if login_to_chatgpt() else 1)
''',
    "CLI",
)

p.write_text(src, encoding="utf-8")
print(f"\\nwritten: {len(orig)} -> {len(src)} bytes (+{len(src) - len(orig)})")
