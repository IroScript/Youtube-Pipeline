"""
SEO Engine — BrowserLLM Gateway (Keyless "Brain")
=================================================
A universal LLM adapter that drives a real browser tab (chatgpt.com / gemini)
via CloakBrowser stealth automation — NO API key required. This is the exact
mechanism the project already uses to generate prompts
(prompt_chain_engine.call_chatgpt_playwright); this module generalises it into a
reusable `BrowserLLM.generate(prompt)` gateway with:

  * persistent Chrome profile (login survives between runs),
  * robust stream-completion detection (same DOM heuristics as the proven engine),
  * JSON extraction/repair for structured SEO responses,
  * exponential-backoff retry,
  * polite jittered rate limiting,
  * a SQLite response cache keyed by prompt hash (never pay for the same prompt twice).

Design note: we do NOT modify prompt_chain_engine.py. This is a parallel,
self-contained adapter so the existing prompt pipeline keeps working byte-for-byte.
"""

from __future__ import annotations

import json
import re
import sqlite3
import time
import hashlib
from pathlib import Path
from typing import Optional

from . import config

# Deterministic jitter without Math.random / os.urandom surprises:
# a simple counter-seeded LCG keeps delays varied but reproducible in logs.
_jitter_state = 0x2545F491


def _next_jitter() -> float:
    global _jitter_state
    _jitter_state = (1103515245 * _jitter_state + 12345) & 0x7FFFFFFF
    return _jitter_state / 0x7FFFFFFF  # 0..1


# ---------------------------------------------------------------------------
# Response cache
# ---------------------------------------------------------------------------
_CACHE_DB = config.CACHE_DIR / "llm_cache.sqlite"


def _cache_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(_CACHE_DB)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS llm_cache (
               prompt_hash TEXT PRIMARY KEY,
               provider    TEXT,
               prompt      TEXT,
               response    TEXT,
               created_at  TEXT
           )"""
    )
    return conn


def _prompt_hash(provider: str, prompt: str) -> str:
    return hashlib.sha256(f"{provider}\n{prompt}".encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# JSON extraction
# ---------------------------------------------------------------------------
def extract_json(text: str) -> Optional[dict | list]:
    """
    Pull the first well-formed JSON object/array out of a browser response that
    is usually wrapped in markdown fences and prose. Tries progressively looser
    strategies; returns None if nothing parses.
    """
    if not text:
        return None

    # 1. fenced ```json ... ``` block
    fence = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    candidates = []
    if fence:
        candidates.append(fence.group(1))

    # 2. first balanced object, then first balanced array
    for opener, closer in (("{", "}"), ("[", "]")):
        start = text.find(opener)
        if start != -1:
            depth = 0
            for i in range(start, len(text)):
                if text[i] == opener:
                    depth += 1
                elif text[i] == closer:
                    depth -= 1
                    if depth == 0:
                        candidates.append(text[start : i + 1])
                        break

    for cand in candidates:
        for attempt in (cand, _repair_json(cand)):
            try:
                return json.loads(attempt)
            except Exception:
                continue
    return None


def _repair_json(text: str) -> str:
    """Best-effort fixes for the usual browser-copy artefacts."""
    fixed = text
    fixed = fixed.replace("“", '"').replace("”", '"').replace("’", "'")
    fixed = re.sub(r",\s*([}\]])", r"\1", fixed)   # trailing commas
    return fixed


# ---------------------------------------------------------------------------
# The gateway
# ---------------------------------------------------------------------------
class BrowserLLM:
    """
    Keyless LLM via a persistent browser tab.

        llm = BrowserLLM(provider="chatgpt")
        text = llm.generate("Write me ...")
        data = llm.generate_json("Return JSON ...")
        llm.close()

    Or as a context manager:

        with BrowserLLM() as llm:
            ...
    """

    def __init__(
        self,
        provider: str = None,
        headless: bool = None,
        persistent: bool = None,
        use_cache: bool = True,
    ):
        self.provider = (provider or config.LLM_PROVIDER).lower()
        self.url = config.PROVIDER_URLS.get(self.provider, config.PROVIDER_URLS["chatgpt"])
        self.headless = config.BROWSER_HEADLESS if headless is None else headless
        self.persistent = config.BROWSER_PERSISTENT if persistent is None else persistent
        self.use_cache = use_cache

        self._context = None
        self._playwright = None
        self._browser = None
        self._page = None
        self._prompts_this_session = 0
        self._last_call_ts = 0.0

    # -- lifecycle ----------------------------------------------------------
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()

    def _ensure_browser(self):
        if self._context is not None:
            return
        config.log(f"[BrowserLLM] Launching CloakBrowser stealth window ({self.provider})...")
        try:
            import cloakbrowser
            if self.persistent:
                config.BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)
                self._context = cloakbrowser.launch_persistent_context(
                    user_data_dir=str(config.BROWSER_PROFILE_DIR),
                    headless=self.headless,
                    no_viewport=True,
                    args=["--start-maximized"],
                )
            else:
                self._context = cloakbrowser.launch_context(
                    headless=self.headless, no_viewport=True, args=["--start-maximized"]
                )
        except Exception as e:
            config.log(f"[BrowserLLM] CloakBrowser unavailable ({e}); using stock Playwright.")
            from playwright.sync_api import sync_playwright
            self._playwright = sync_playwright().start()
            if self.persistent:
                config.BROWSER_PROFILE_DIR.mkdir(parents=True, exist_ok=True)
                self._context = self._playwright.chromium.launch_persistent_context(
                    user_data_dir=str(config.BROWSER_PROFILE_DIR),
                    headless=self.headless,
                    no_viewport=True,
                    args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
                )
            else:
                self._browser = self._playwright.chromium.launch(
                    headless=self.headless,
                    args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
                )
                self._context = self._browser.new_context(no_viewport=True)

    def close(self):
        for closer in (self._context, self._browser, self._playwright):
            if closer is None:
                continue
            try:
                if closer is self._playwright:
                    closer.stop()
                else:
                    closer.close()
            except Exception:
                pass
        self._context = self._browser = self._playwright = self._page = None

    # -- rate limiting ------------------------------------------------------
    def _respect_rate_limit(self):
        if self._prompts_this_session >= config.LLM_MAX_PROMPTS_PER_SESSION:
            raise RuntimeError(
                f"[BrowserLLM] Session prompt cap ({config.LLM_MAX_PROMPTS_PER_SESSION}) reached; "
                "restart the session to continue (protects the browser account)."
            )
        min_gap = config.LLM_MIN_DELAY_SECONDS + _next_jitter() * (
            config.LLM_MAX_DELAY_SECONDS - config.LLM_MIN_DELAY_SECONDS
        )
        wait = self._last_call_ts + min_gap - time.time()
        if wait > 0:
            config.log(f"[BrowserLLM] Rate-limit pause {wait:.1f}s...")
            time.sleep(wait)

    # -- core generate ------------------------------------------------------
    def generate(self, prompt: str, wait_seconds: int = None, use_cache: bool = None) -> str:
        wait_seconds = wait_seconds or config.LLM_MAX_WAIT_SECONDS
        use_cache = self.use_cache if use_cache is None else use_cache
        h = _prompt_hash(self.provider, prompt)

        if use_cache:
            conn = _cache_conn()
            row = conn.execute(
                "SELECT response FROM llm_cache WHERE prompt_hash=?", (h,)
            ).fetchone()
            conn.close()
            if row and row[0]:
                config.log("[BrowserLLM] Cache hit — reusing stored response.")
                return row[0]

        last_err = None
        for attempt in range(1, config.LLM_MAX_RETRIES + 1):
            try:
                self._respect_rate_limit()
                text = self._run_once(prompt, wait_seconds)
                self._last_call_ts = time.time()
                self._prompts_this_session += 1
                if text and text.strip():
                    if use_cache:
                        conn = _cache_conn()
                        conn.execute(
                            "INSERT OR REPLACE INTO llm_cache VALUES (?,?,?,?,datetime('now'))",
                            (h, self.provider, prompt, text),
                        )
                        conn.commit()
                        conn.close()
                    return text
                last_err = "empty response"
            except Exception as e:
                last_err = str(e)
                config.log(f"[BrowserLLM] Attempt {attempt} failed: {e}")
            backoff = min(30, 2 ** attempt + _next_jitter() * 3)
            config.log(f"[BrowserLLM] Backing off {backoff:.1f}s before retry...")
            time.sleep(backoff)

        config.log(f"[BrowserLLM] All {config.LLM_MAX_RETRIES} attempts failed: {last_err}")
        return ""

    def generate_json(self, prompt: str, wait_seconds: int = None) -> Optional[dict | list]:
        """Generate and parse a JSON response; returns None if unparseable."""
        text = self.generate(prompt, wait_seconds=wait_seconds)
        return extract_json(text)

    # -- browser driving (mirrors the proven prompt_chain_engine logic) -----
    def _run_once(self, prompt_text: str, wait_seconds: int) -> str:
        self._ensure_browser()
        page = self._context.new_page()
        output_text = ""
        try:
            page.goto(self.url, wait_until="domcontentloaded", timeout=45000)
            time.sleep(3)

            dismiss = [
                "button:has-text('Stay logged out')",
                "button:has-text('Dismiss')",
                "button[aria-label='Close']",
            ]
            for sel in dismiss:
                try:
                    loc = page.locator(sel)
                    if loc.count() > 0 and loc.first.is_visible():
                        loc.first.click()
                        time.sleep(0.5)
                except Exception:
                    pass

            input_box = None
            for i in range(30):
                if i % 5 == 0:
                    for sel in dismiss:
                        try:
                            loc = page.locator(sel)
                            if loc.count() > 0 and loc.first.is_visible():
                                loc.first.click()
                                time.sleep(0.4)
                        except Exception:
                            pass
                cand = page.locator(
                    'textarea.wm-composer-textarea:visible, '
                    'textarea:visible:not(.wcDTda_fallbackTextarea), '
                    '#prompt-textarea:visible, '
                    'div[contenteditable="true"]:visible, '
                    'textarea#mobile-composer-prompt:visible, '
                    'rich-textarea textarea:visible, '
                    '[role="textbox"]:visible'
                )
                if cand.count() > 0:
                    input_box = cand.first
                    break
                time.sleep(1)
            if not input_box:
                raise RuntimeError("No visible input element found on provider page.")

            input_box.click()
            time.sleep(0.3)
            input_box.fill(prompt_text)
            time.sleep(0.5)

            send_selector = (
                'button.wm-composer-submitButton:visible, '
                'button[aria-label*="Send" i]:visible, '
                'button[data-testid="send-button"]:visible, '
                'button[aria-label*="Send message" i]:visible'
            )
            send_btn = page.locator(send_selector).first
            clicked = False
            for _ in range(6):
                if send_btn.count() > 0 and not send_btn.is_disabled():
                    send_btn.click()
                    clicked = True
                    break
                time.sleep(0.5)
            if not clicked:
                input_box.press("Control+Enter")

            # Wait for stream to START
            started = False
            for sec in range(30):
                time.sleep(1.5)
                res = page.evaluate(
                    """() => {
                        const stopBtn = document.querySelector('button[aria-label*="Stop" i], button[data-testid*="stop" i], button.wm-composer-stopButton');
                        const isStop = stopBtn !== null && stopBtn.offsetParent !== null;
                        const turns = document.querySelectorAll('div[data-message-author-role="assistant"], message-content, .model-response-text');
                        const last = turns.length ? turns[turns.length-1] : null;
                        const text = last ? (last.innerText || '') : '';
                        return {length: text.length, isStop, turns: turns.length};
                    }"""
                )
                if res["length"] > 0 or (res["turns"] > 0 and res["isStop"]):
                    started = True
                    break
                if sec == 10:
                    try:
                        sb = page.locator(send_selector).first
                        if sb.count() > 0 and not sb.is_disabled():
                            sb.click()
                        else:
                            input_box.press("Control+Enter")
                    except Exception:
                        pass
            if not started:
                return ""

            # Wait for stream to COMPLETE (stable + stop button gone)
            last_len, stable, elapsed = 0, 0, 0
            curr_len, curr_text = 0, ""
            while elapsed < wait_seconds:
                time.sleep(2)
                elapsed += 2
                snap = page.evaluate(
                    """() => {
                        const stopBtn = document.querySelector('button[aria-label*="Stop" i], button[data-testid*="stop" i], button.wm-composer-stopButton');
                        const isStop = stopBtn !== null && stopBtn.offsetParent !== null;
                        const turns = document.querySelectorAll('div[data-message-author-role="assistant"], message-content, .model-response-text');
                        const last = turns.length ? turns[turns.length-1] : null;
                        const text = last ? (last.innerText || '') : '';
                        return {isStop, length: text.length, text};
                    }"""
                )
                curr_len, curr_text, is_stop = snap["length"], snap["text"], snap["isStop"]
                if curr_len > last_len:
                    stable = 0
                    last_len = curr_len
                elif curr_len > 80:
                    stable += 1

                looks_complete_json = ("}" in curr_text and curr_len > 200)
                if (not is_stop and stable >= 2 and looks_complete_json) \
                   or (not is_stop and stable >= 3 and curr_len > 300) \
                   or (curr_len > 25000):
                    output_text = curr_text
                    break
            if not output_text and curr_len > 0:
                output_text = curr_text
        finally:
            try:
                page.close()
            except Exception:
                pass
        return output_text


# Convenience one-shot (opens+closes a browser). Prefer reusing a BrowserLLM
# instance across a batch to keep the login/session warm.
def quick_generate(prompt: str, provider: str = None) -> str:
    with BrowserLLM(provider=provider) as llm:
        return llm.generate(prompt)
