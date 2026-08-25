"""
SEO Engine — Central Configuration
==================================
Single source of truth for paths, feature flags, YouTube upload constraints,
browser behaviour, and provider selection. No secrets live here; the whole point
of this engine is that it needs NO LLM API key (browser-driven) and NO YouTube API
key (keyless scrapers).
"""

from __future__ import annotations

import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths — resolved relative to PromptDatabase/ so the engine is portable.
# ---------------------------------------------------------------------------
SEO_DIR = Path(__file__).resolve().parent
BASE_DIR = SEO_DIR.parent                      # .../PromptDatabase
DB_PATH = BASE_DIR / "database" / "youtube_pipeline.db"
CACHE_DIR = SEO_DIR / "_cache"
BACKUP_DIR = BASE_DIR / "output_packaged" / "_backup_seo"
LOG_DIR = SEO_DIR / "_logs"

for _d in (CACHE_DIR, LOG_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# Persistent Chrome profile for the browser LLM. Reusing a persistent profile
# keeps the chatgpt.com login/cookies alive between runs (no repeated sign-in).
# Kept separate from the video pipeline's "Profile 5" so SEO automation never
# collides with the Veo generation tab.
BROWSER_PROFILE_DIR = SEO_DIR / "_chrome_profile_seo"

# ---------------------------------------------------------------------------
# Provider selection — the "brain" is a browser tab, not an API.
# ---------------------------------------------------------------------------
LLM_PROVIDER = os.environ.get("SEO_LLM_PROVIDER", "chatgpt")   # chatgpt | gemini
PROVIDER_URLS = {
    "chatgpt": "https://chatgpt.com",
    "gemini": "https://gemini.google.com/app",
}

# Browser behaviour
BROWSER_HEADLESS = os.environ.get("SEO_HEADLESS", "0") == "1"
BROWSER_PERSISTENT = os.environ.get("SEO_PERSISTENT", "1") == "1"  # reuse login
LLM_MAX_WAIT_SECONDS = 240        # max stream time per prompt
LLM_MIN_DELAY_SECONDS = 8         # polite floor between prompts (anti-spam)
LLM_MAX_DELAY_SECONDS = 22        # jittered ceiling between prompts
LLM_MAX_RETRIES = 3
LLM_MAX_PROMPTS_PER_SESSION = 40  # safety cap per SEO_Discussion rate policy

# ---------------------------------------------------------------------------
# Keyless data sources (harvest.py). Every source degrades gracefully.
# ---------------------------------------------------------------------------
YT_SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
HARVEST_COMPETITORS_PER_IDEA = 12   # yt-dlp SERP depth
HARVEST_SUGGEST_SEEDS = 6           # how many seed queries to expand
HARVEST_TIMEOUT = 25
HARVEST_ENABLE_TRENDS = os.environ.get("SEO_ENABLE_TRENDS", "0") == "1"
HTTP_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# YouTube upload-ready constraints — validators.py enforces these HARD limits.
# Numbers are YouTube's documented ceilings; we stay safely inside them.
# ---------------------------------------------------------------------------
YT_TITLE_MAX = 100          # hard YouTube limit
YT_TITLE_SOFT = 70          # keep the CTR-critical part visible in search
YT_DESC_MAX = 5000          # hard YouTube limit
YT_TAGS_TOTAL_CHARS_MAX = 460   # YouTube caps total tag chars ~500; stay under
YT_TAGS_MAX_COUNT = 15
YT_TAG_MAX_LEN = 60         # single tag with spaces > ~30 chars is rejected-ish
YT_DEFAULT_CATEGORY = "Science & Technology"
YT_DEFAULT_LANGUAGE = "en"

# ---------------------------------------------------------------------------
# Scoring weights (scoring.py). Tunable, deterministic — never hallucinated.
# ---------------------------------------------------------------------------
OPPORTUNITY_WEIGHTS = {
    "demand": 0.35,       # search-suggest breadth => audience wants this
    "novelty": 0.35,      # few exact competitors => content white space
    "low_saturation": 0.30,  # competitors are weak/old => room to rank
}
NOVELTY_EXACT_PENALTY = 12    # points removed per exact-match competitor
SATURATION_STRONG_VIEWS = 100_000  # a competitor above this is "strong"

# ---------------------------------------------------------------------------
# Engine-wide toggles
# ---------------------------------------------------------------------------
DRY_RUN_DEFAULT = True    # never mutate the DB unless explicitly --apply
VERBOSE = os.environ.get("SEO_VERBOSE", "1") == "1"


def log(msg: str) -> None:
    if VERBOSE:
        print(msg, flush=True)
