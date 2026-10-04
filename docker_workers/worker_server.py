import os
import sys
import json
import time
import random
import asyncio
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from contextlib import asynccontextmanager

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
except ImportError:
    FastAPI = None
    HTTPException = None
    BaseModel = object

try:
    from playwright.async_api import async_playwright, BrowserContext, Page
    from playwright_stealth.stealth import Stealth
except ImportError:
    async_playwright = None
    BrowserContext = Any
    Page = Any
    Stealth = None

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Worker-%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(os.getenv("WORKER_ID", "1"))

# Constants & Paths
WORKER_ID = os.getenv("WORKER_ID", "worker_1")
BASE_PORT = int(os.getenv("PORT", "8000"))
COOKIE_FILE = Path(os.getenv("COOKIE_FILE", "/app/cookies/cookie.json"))
PROXY_FILE = Path(os.getenv("PROXY_FILE", "/app/cookies/proxy.txt"))
PROFILE_DIR = Path(os.getenv("PROFILE_DIR", "/app/profile"))
CHATGPT_URL = "https://chatgpt.com"

# Global State
context: Optional[BrowserContext] = None
playwright_instance = None
active_page: Optional[Page] = None
is_authenticated = False
user_display_name = "Unknown"
is_busy = False
action_counter = 0
last_session_refresh = 0.0

def get_dynamic_user_agent_and_client_hints(browser_version: Optional[str] = None) -> Tuple[str, Dict[str, str]]:
    """
    Dynamically generates matching User-Agent and sec-ch-ua client hint headers
    derived from the actual runtime Chromium version, eliminating UA/sec-ch-ua mismatch bot detection.
    """
    major_ver = browser_version.split(".")[0] if browser_version else "130"
    full_ver = browser_version if browser_version else f"{major_ver}.0.0.0"

    user_agent = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{full_ver} Safari/537.36"
    client_hints = {
        "sec-ch-ua": f'"Chromium";v="{major_ver}", "Not?A_Brand";v="99", "Google Chrome";v="{major_ver}"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"'
    }
    return user_agent, client_hints

def get_proxy_config() -> Optional[Dict[str, str]]:
    """Determine proxy configuration from environment or file."""
    proxy_url = os.getenv("PROXY_URL")
    if not proxy_url and PROXY_FILE.exists():
        try:
            content = PROXY_FILE.read_text().strip()
            if content:
                proxy_url = content
        except Exception as e:
            logger.warning(f"Failed to read proxy file: {e}")

    if proxy_url:
        logger.info(f"Using proxy: {proxy_url.split('@')[-1] if '@' in proxy_url else proxy_url}")
        return {"server": proxy_url}
    return None

def convert_cookie(c: dict) -> dict:
    """Convert browser-extension cookie format to Playwright format."""
    pw = {
        "name": c["name"],
        "value": c["value"],
        "domain": c["domain"],
        "path": c.get("path", "/"),
        "secure": c.get("secure", False),
        "httpOnly": c.get("httpOnly", False),
    }
    sm = c.get("sameSite")
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

async def setup_route_interception(ctx: BrowserContext):
    """Block media and images to cut CPU and network bandwidth."""
    async def route_handler(route):
        req = route.request
        if req.resource_type in ["image", "media"]:
            await route.abort()
            return
        await route.continue_()

    await ctx.route("**/*", route_handler)

async def handle_turnstile_if_present(page: Page):
    """Detects Cloudflare Turnstile challenge and clicks verification checkbox."""
    try:
        title = await page.title()
        if "moment" in title.lower() or "challenge" in title.lower():
            logger.info("Cloudflare Turnstile challenge detected! Attempting solve...")
            for attempt in range(12):
                for frame in page.frames:
                    if "cloudflare" in frame.url or "challenges" in frame.url:
                        for sel in ["input[type='checkbox']", "#challenge-stage input", "span.mark", "div.ctp-checkbox-label", "label.ctp-checkbox-label"]:
                            try:
                                checkbox = frame.locator(sel).first
                                if await checkbox.count() > 0:
                                    logger.info(f"Found Turnstile element ({sel}). Clicking...")
                                    await checkbox.click()
                                    await asyncio.sleep(4)
                                    return True
                            except Exception:
                                pass
                await asyncio.sleep(1)
    except Exception as e:
        logger.warning(f"Turnstile handler exception: {e}")
    return False

async def load_and_inject_cookies(ctx: BrowserContext) -> bool:
    """Load cookies from json file into Playwright context."""
    if not COOKIE_FILE.exists():
        logger.warning(f"No cookie file found at {COOKIE_FILE}")
        return False

    try:
        raw_text = COOKIE_FILE.read_text(encoding="utf-8")
        raw_cookies = json.loads(raw_text)
        pw_cookies = [convert_cookie(c) for c in raw_cookies if "name" in c and "value" in c]
        await ctx.add_cookies(pw_cookies)
        logger.info(f"Successfully injected {len(pw_cookies)} cookies into context.")
        return True
    except Exception as e:
        logger.error(f"Failed to inject cookies: {e}")
        return False

async def safe_click(locator, page: Page):
    """Safely clicks an element using humanized action, falling back to direct mouse coordinates if selector resolver errors."""
    try:
        await locator.click(timeout=3000)
        return
    except Exception as e:
        logger.debug(f"Locator click fallback triggered ({e})")
    try:
        box = await locator.bounding_box()
        if box:
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2
            if hasattr(page, "_original") and hasattr(page._original, "mouse_click"):
                await page._original.mouse_click(cx, cy)
            else:
                await page.mouse.click(cx, cy)
            return
    except Exception:
        pass
    try:
        await locator.click(force=True, timeout=2000)
    except Exception:
        pass

async def dismiss_dialogs_and_pick_account(page: Page):
    """Dismisses welcome modals, stay logged out prompts, and clicks saved account if shown on login page."""
    # 1. Check for account cards under 'Welcome back' / 'Choose an account' ONLY during login / auth
    try:
        if "login" in page.url or "auth" in page.url:
            for selector in [
                "text=Md Shapon",
                "text=Drive Alco",
                "text=Gaming Dot Bangla",
                "text=Irak",
                "button:has-text('@')",
                "div[role='button']:has-text('@')"
            ]:
                elems = page.locator(selector)
                cnt = await elems.count()
                for i in range(cnt):
                    el = elems.nth(i)
                    if await el.is_visible():
                        txt = await el.text_content() or ""
                        if "Log in to another" not in txt and "Create account" not in txt:
                            logger.info(f"Clicking account selection element: {txt.strip()[:40]}")
                            await safe_click(el, page)
                            await asyncio.sleep(2)
                            break
    except Exception as e:
        logger.warning(f"Account picker error: {e}")

    # 2. General dialogs / overlays
    try:
        await page.keyboard.press("Escape")
        await asyncio.sleep(0.3)
    except Exception:
        pass

    try:
        await page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button'));
            for (const b of btns) {
                const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                if (txt === 'got it' || txt === 'stay logged out' || txt === 'dismiss' || txt === 'ok' || txt === 'continue') {
                    b.click();
                }
            }
            const closeBtns = document.querySelectorAll('button[aria-label="Close"], button[aria-label*="dismiss" i]');
            for (const b of closeBtns) {
                b.click();
            }
        }""")
        await asyncio.sleep(0.5)
    except Exception:
        pass

    for sel in [
        "button:has-text('Got it')",
        "button:has-text('Stay logged out')",
        "button:has-text('Dismiss')",
        "button:has-text('OK')",
        "button:has-text('Continue')",
        "button[aria-label='Close']",
        "text=Got it",
        "text=Stay logged out",
        "text=Dismiss"
    ]:
        try:
            btn = page.locator(sel).first
            if await btn.count() > 0 and await btn.is_visible():
                await safe_click(btn, page)
                logger.info(f"Clicked dialog element: {sel}")
                await asyncio.sleep(1)
        except Exception:
            pass

async def initialize_browser():
    """Launch persistent context with official Playwright stealth and injected cookies."""
    global context, playwright_instance, active_page, is_authenticated, user_display_name
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    playwright_instance = await async_playwright().start()

    launch_args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-gpu",
        "--js-flags=--max-old-space-size=512",
        "--disk-cache-size=10485760",
        "--start-maximized",
        "--no-first-run",
        "--no-default-browser-check"
    ]

    # Remove any stale Chrome singleton locks from prior runs
    for lock_name in ["SingletonLock", "SingletonCookie", "SingletonSocket"]:
        lock_path = PROFILE_DIR / lock_name
        if lock_path.exists() or lock_path.is_symlink():
            try:
                lock_path.unlink()
                logger.info(f"Removed stale lock: {lock_name}")
            except Exception as e:
                logger.warning(f"Could not remove {lock_name}: {e}")

    selected_ua, dynamic_client_hints = get_dynamic_user_agent_and_client_hints()
    proxy_config = get_proxy_config()

    # 1. Primary: Official CloakBrowser Stealth Engine
    try:
        import cloakbrowser
        logger.info("Launching persistent context via official CloakBrowser engine...")
        context = await cloakbrowser.launch_persistent_context_async(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            proxy=proxy_config,
            args=launch_args,
            stealth_args=True,
            user_agent=selected_ua,
            locale="en-US",
            timezone="America/New_York",
            humanize=True,
            human_preset="careful"
        )
        logger.info("✅ CloakBrowser persistent context initialized successfully.")
    except Exception as e:
        logger.warning(f"CloakBrowser launch failed ({e}), falling back to Google Chrome + Playwright Stealth...")
        chrome_bin = "/usr/bin/google-chrome" if Path("/usr/bin/google-chrome").exists() else None
        launch_kwargs = {
            "user_data_dir": str(PROFILE_DIR),
            "headless": False,
            "args": launch_args,
            "user_agent": selected_ua,
            "proxy": proxy_config,
            "viewport": {"width": 1920, "height": 1080},
            "locale": "en-US",
            "timezone_id": "America/New_York"
        }
        if chrome_bin:
            launch_kwargs["executable_path"] = chrome_bin
            logger.info(f"Using official Google Chrome executable: {chrome_bin}")

        context = await playwright_instance.chromium.launch_persistent_context(**launch_kwargs)
        stealth = Stealth()
        await stealth.apply_stealth_async(context)

    await setup_route_interception(context)

    # Inject cookies
    await load_and_inject_cookies(context)

    # Open primary page and verify login
    active_page = await context.new_page()

    logger.info(f"Navigating to {CHATGPT_URL} for session verification...")
    try:
        await active_page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(4)

        # Handle Cloudflare Turnstile if encountered
        await handle_turnstile_if_present(active_page)

        # Handle account picker or welcome dialogs
        await dismiss_dialogs_and_pick_account(active_page)

        # Check authentication state
        cookies = await context.cookies()
        has_session = any("session-token" in c.get("name", "") for c in cookies)
        page_content = await active_page.content()

        if has_session:
            is_authenticated = True
            logger.info("✅ Worker successfully authenticated to ChatGPT session!")
        else:
            is_authenticated = False
            logger.warning("⚠️ Worker not authenticated or session cookie missing.")
    except Exception as e:
        logger.error(f"Error during initial navigation: {e}")

async def session_keepalive_loop():
    """Periodic heartbeat to keep ChatGPT session token alive."""
    global last_session_refresh, is_authenticated
    while True:
        try:
            await asyncio.sleep(900)  # Every 15 minutes
            if active_page and not is_busy:
                logger.info("Running ChatGPT session keepalive check...")
                response = await active_page.request.get("https://chatgpt.com/api/auth/session")
                if response.status == 200:
                    data = await response.json()
                    user = data.get("user", {})
                    user_display_name = user.get("name") or user.get("email", "Authenticated User")
                    is_authenticated = True
                    last_session_refresh = time.time()
                    logger.info(f"Session keepalive OK. User: {user_display_name}")
                elif response.status in (401, 403):
                    is_authenticated = False
                    logger.warning("Session keepalive received 401/403. Re-auth required.")
        except Exception as e:
            logger.warning(f"Session keepalive exception: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up {WORKER_ID}...")
    await initialize_browser()
    keepalive_task = asyncio.create_task(session_keepalive_loop())
    yield
    keepalive_task.cancel()
    if context:
        await context.close()
    if playwright_instance:
        await playwright_instance.stop()
    logger.info(f"Shutdown {WORKER_ID} complete.")

if FastAPI:
    app = FastAPI(title=f"ChatGPT Worker - {WORKER_ID}", lifespan=lifespan)
else:
    class DummyApp:
        def get(self, *args, **kwargs):
            return lambda fn: fn
        def post(self, *args, **kwargs):
            return lambda fn: fn
    app = DummyApp()

class PromptRequest(BaseModel):
    prompt: str
    wait_seconds: int = 240
    action_name: str = "Generate"
    min_jitter_sec: float = 2.0
    max_jitter_sec: float = 6.0

class PromptResponse(BaseModel):
    success: bool
    worker_id: str
    output_text: str
    char_count: int
    elapsed_seconds: float
    error: Optional[str] = None

@app.get("/health")
async def health_check():
    return {
        "status": "ok" if is_authenticated else "unauthenticated",
        "worker_id": WORKER_ID,
        "is_authenticated": is_authenticated,
        "is_busy": is_busy,
        "user": user_display_name,
        "action_counter": action_counter,
        "last_session_refresh": last_session_refresh
    }

@app.get("/debug")
async def debug_page():
    if not active_page:
        return {"error": "no active page"}
    title = await active_page.title()
    url = active_page.url
    dom_info = await active_page.evaluate("""() => {
        const markdowns = Array.from(document.querySelectorAll('.markdown, [class*="markdown" i], [class*="prose" i]')).map(m => ({ tag: m.tagName, class: m.className, text: (m.innerText || '').substring(0, 150) }));
        const leafElements = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('fortress') && el.children.length === 0);
        let chain = [];
        if (leafElements.length > 0) {
            let p = leafElements[0];
            while (p && chain.length < 8) {
                chain.push({ tag: p.tagName, class: p.className, testId: p.getAttribute('data-testid'), role: p.getAttribute('role'), author: p.getAttribute('data-message-author-role') });
                p = p.parentElement;
            }
        }
        const last1500Chars = (document.body.innerText || '').slice(-1500);
        return { markdowns, chain, last1500Chars };
    }""")
    cookies = await context.cookies() if context else []
    return {
        "title": title,
        "url": url,
        "dom_info": dom_info,
        "cookies_count": len(cookies),
        "has_session_cookie": any("session-token" in c.get("name", "") for c in cookies)
    }

@app.post("/reload-cookies")
async def reload_cookies():
    global context, is_authenticated
    if not context:
        raise HTTPException(status_code=500, detail="Browser context not initialized")
    success = await load_and_inject_cookies(context)
    if success and active_page:
        await active_page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=45000)
        await asyncio.sleep(3)
        await handle_turnstile_if_present(active_page)
        cookies = await context.cookies()
        is_authenticated = any("session-token" in c.get("name", "") for c in cookies)
    return {"success": success, "is_authenticated": is_authenticated}

@app.post("/generate", response_model=PromptResponse)
async def generate_prompt(req: PromptRequest):
    global is_busy, action_counter
    if is_busy:
        raise HTTPException(status_code=429, detail="Worker is currently busy processing another request")

    start_time = time.time()
    is_busy = True
    action_counter += 1

    # Escalating delay ladder: +0.5s after each process finishes
    escalation_offset = (action_counter - 1) * 0.5
    cur_min = req.min_jitter_sec + escalation_offset
    cur_max = req.max_jitter_sec + escalation_offset
    jitter = random.uniform(cur_min, cur_max)
    logger.info(f"Applying escalating jitter delay (+0.5s/process, action #{action_counter}): {jitter:.2f}s [Range: {cur_min:.1f}s - {cur_max:.1f}s]...")
    await asyncio.sleep(jitter)

    try:
        if not active_page:
            raise HTTPException(status_code=500, detail="Active browser page unavailable")

        # Ensure clean New Chat before submitting prompt
        try:
            new_btn = active_page.locator("a[href='/'], button[aria-label='New chat'], button:has-text('New chat')").first
            if await new_btn.count() > 0 and await new_btn.is_visible():
                await safe_click(new_btn, active_page)
                await asyncio.sleep(1.5)
            elif active_page.url != CHATGPT_URL and active_page.url != f"{CHATGPT_URL}/":
                await active_page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=45000)
                await asyncio.sleep(2)
        except Exception:
            pass

        await handle_turnstile_if_present(active_page)

        # Dismiss any overlays or account pickers
        await dismiss_dialogs_and_pick_account(active_page)

        # Locate the VISIBLE input element
        input_box = None
        for attempt in range(30):
            if attempt % 5 == 0:
                await dismiss_dialogs_and_pick_account(active_page)

            # Check primary #prompt-textarea
            try:
                cand = active_page.locator("#prompt-textarea").first
                if await cand.count() > 0 and await cand.is_visible():
                    input_box = cand
                    break
            except Exception:
                pass

            # Fallback 1: contenteditable
            try:
                cand = active_page.locator("div[contenteditable='true']").first
                if await cand.count() > 0 and await cand.is_visible():
                    input_box = cand
                    break
            except Exception:
                pass

            # Fallback 2: fallback textarea
            try:
                cand = active_page.locator("textarea.wcDTda_fallbackTextarea").first
                if await cand.count() > 0 and await cand.is_visible():
                    await safe_click(cand, active_page)
                    await asyncio.sleep(0.5)
                    continue
            except Exception:
                pass

            if attempt == 15:
                try:
                    logger.info("Attempt 15: Navigating to base CHATGPT_URL to recover clean state...")
                    await active_page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=30000)
                    await asyncio.sleep(2)
                except Exception:
                    pass

            await asyncio.sleep(1)

        if not input_box:
            raise RuntimeError("No visible input element found on ChatGPT page.")

        # Record initial assistant turns count before sending prompt
        initial_turns = await active_page.evaluate("""() => {
            const turns = document.querySelectorAll('[class*="MarkdownRoot" i], [class*="markdown" i], [data-message-author-role="assistant"], article[data-testid*="conversation-turn-"]');
            return turns.length;
        }""")

        # Focus editor and clear
        await safe_click(input_box, active_page)
        await asyncio.sleep(0.3)
        await active_page.keyboard.press("Control+a")
        await asyncio.sleep(0.1)
        await active_page.keyboard.press("Backspace")
        await asyncio.sleep(0.2)

        # Insert prompt text via direct keyboard text insertion
        logger.info(f"Inserting {len(req.prompt)} chars into ChatGPT editor...")
        await active_page.keyboard.insert_text(req.prompt)
        await asyncio.sleep(0.5)

        # Trigger React synthetic input events
        try:
            await active_page.evaluate("""() => {
                const el = document.querySelector('#prompt-textarea') || document.querySelector('.ProseMirror') || document.querySelector('div[contenteditable="true"]');
                if (el) {
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }""")
        except Exception:
            pass

        # Send prompt
        send_btn = None
        for s_sel in [
            "button[data-testid='send-button']",
            "button[aria-label*='Send' i]",
            "button[data-testid*='send' i]"
        ]:
            cand = active_page.locator(s_sel).first
            if await cand.count() > 0 and await cand.is_visible():
                send_btn = cand
                break

        if not send_btn or not await send_btn.is_enabled():
            await active_page.keyboard.press("Space")
            await asyncio.sleep(0.1)
            await active_page.keyboard.press("Backspace")
            await asyncio.sleep(0.4)
            for s_sel in ["button[data-testid='send-button']", "button[aria-label*='Send' i]", "button[data-testid*='send' i]"]:
                cand = active_page.locator(s_sel).first
                if await cand.count() > 0 and await cand.is_visible():
                    send_btn = cand
                    break

        if send_btn and await send_btn.is_enabled():
            await safe_click(send_btn, active_page)
            logger.info("Clicked Send button.")
        else:
            await active_page.keyboard.press("Enter")
            logger.info("Sent prompt via Enter.")

        # Wait for streaming to start (max 60s)
        logger.info(f"Waiting for streaming response (max {req.wait_seconds}s)...")
        started = False
        for sec in range(40):
            await asyncio.sleep(1.5)
            res = await active_page.evaluate("""(initTurns) => {
                const stopBtn = document.querySelector('button[aria-label*="Stop" i], button[data-testid*="stop" i], button.wm-composer-stopButton, button[aria-label*="stop generation" i]');
                const isStop = stopBtn !== null && stopBtn.offsetParent !== null;
                const turns = document.querySelectorAll('[class*="MarkdownRoot" i], [class*="markdown" i], [data-message-author-role="assistant"], article[data-testid*="conversation-turn-"]');
                const newTurn = turns.length > initTurns || (turns.length > 0 && isStop);
                const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
                let text = '';
                if (lastTurn) {
                    text = lastTurn.innerText || '';
                }
                return { length: text.length, isStop: isStop, turnsCount: turns.length, newTurn: newTurn };
            }""", initial_turns)

            if res['newTurn'] and (res['length'] > 0 or res['isStop']):
                logger.info(f"Stream started! (chars={res['length']}, isStop={res['isStop']})")
                started = True
                break

            if sec == 12:
                try:
                    if send_btn and await send_btn.count() > 0 and not await send_btn.is_disabled():
                        await safe_click(send_btn, active_page)
                    else:
                        await active_page.keyboard.press("Enter")
                except Exception:
                    pass

        # Poll until stream ends and text stabilizes
        output_text = ""
        prev_len = 0
        stable_count = 0
        max_poll_iterations = int(req.wait_seconds / 1.5)

        for sec in range(max_poll_iterations):
            await asyncio.sleep(1.5)
            res = await active_page.evaluate("""(initTurns) => {
                const stopBtn = document.querySelector('button[aria-label*="Stop" i], button[data-testid*="stop" i]');
                const isStop = stopBtn !== null && stopBtn.offsetParent !== null;
                const turns = document.querySelectorAll('[class*="MarkdownRoot" i], [class*="markdown" i], [data-message-author-role="assistant"], article[data-testid*="conversation-turn-"]');
                if (turns.length <= initTurns && !isStop && turns.length === 0) {
                    return { text: '', length: 0, isStop: isStop };
                }
                const lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
                let text = '';
                if (lastTurn) {
                    text = lastTurn.innerText || '';
                }
                return { text: text, length: text.length, isStop: isStop };
            }""", initial_turns)

            curr_len = res['length']
            curr_text = res.get('text', '').strip()

            if curr_len > 0:
                if curr_len == prev_len:
                    stable_count += 1
                else:
                    stable_count = 0
                prev_len = curr_len

                if (stable_count >= 3 and not res['isStop']) or (stable_count >= 5 and curr_len > 200):
                    output_text = curr_text
                    logger.info(f"Stream generation completed! ({len(output_text)} chars)")
                    break

        if not output_text and prev_len > 0:
            output_text = curr_text

        if not output_text:
            raise RuntimeError("ChatGPT stream completed but no output text could be captured.")

        elapsed_total = time.time() - start_time
        return PromptResponse(
            success=True,
            worker_id=WORKER_ID,
            output_text=output_text,
            char_count=len(output_text),
            elapsed_seconds=elapsed_total
        )

    except Exception as e:
        logger.error(f"Error during prompt execution: {e}")
        elapsed_total = time.time() - start_time
        return PromptResponse(
            success=False,
            worker_id=WORKER_ID,
            output_text="",
            char_count=0,
            elapsed_seconds=elapsed_total,
            error=str(e)
        )
    finally:
        is_busy = False
