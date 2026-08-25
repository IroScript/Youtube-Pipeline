"""
SEO Engine — Keyless Data Harvesters ("Eyes")
=============================================
Per SEO_Discussion.txt: *"Data সংগ্রহ = API / scraper. LLM নিজে magically YouTube-এর
live competition জানে না।"* So we do NOT ask the LLM for competition data — we
collect real signals first, then feed them to the brain.

Every source here is KEYLESS (no YouTube Data API key, no paid SEO SaaS):

  1. YouTube autocomplete  — the public suggest endpoint (stdlib urllib only).
  2. Competitor SERP        — yt-dlp flat search: real titles, view counts, channels.
  3. Google Trends          — optional, only if `pytrends` is installed AND enabled.

Each harvester degrades gracefully: a failure returns an empty/partial result
with a note, never an exception that kills the run.
"""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass, field, asdict
from typing import Optional

from . import config


# ---------------------------------------------------------------------------
# 1. YouTube autocomplete (audience demand signal)
# ---------------------------------------------------------------------------
def youtube_suggest(query: str, lang: str = "en") -> list[str]:
    """Return YouTube's autocomplete expansions for `query`. Empty list on failure."""
    params = urllib.parse.urlencode(
        {"client": "firefox", "ds": "yt", "hl": lang, "q": query}
    )
    url = f"{config.YT_SUGGEST_URL}?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": config.HTTP_USER_AGENT})
        with urllib.request.urlopen(req, timeout=config.HARVEST_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8", "ignore"))
        if isinstance(data, list) and len(data) >= 2 and isinstance(data[1], list):
            return [s for s in data[1] if isinstance(s, str)]
    except Exception as e:
        config.log(f"[harvest] youtube_suggest('{query[:30]}') failed: {type(e).__name__}")
    return []


_NON_LATIN = re.compile(r"[^\x00-\x7F]")


def _is_clean_english(phrase: str) -> bool:
    """
    Keep keywords usable for an English channel: reject phrases with non-Latin
    script (Bengali/CJK autocomplete leakage) or that are mostly punctuation.
    """
    if not phrase:
        return False
    if _NON_LATIN.search(phrase):
        return False
    letters = sum(ch.isalpha() for ch in phrase)
    return letters >= max(3, len(phrase) // 3)


def expand_keywords(seed: str, depth: int = 2, latin_only: bool = True) -> list[str]:
    """
    Expand a seed phrase into a deduped keyword universe using autocomplete,
    including a→z prefixing to surface long-tail queries (a classic keyword-mining
    trick that needs no paid tool). By default filters to clean English phrases so
    localized autocomplete leakage does not pollute the SEO tag set.
    """
    universe: list[str] = []
    seen: set[str] = set()

    def _add(items):
        for it in items:
            k = it.strip().lower()
            if not k or k in seen:
                continue
            if latin_only and not _is_clean_english(it):
                continue
            seen.add(k)
            universe.append(it.strip())

    _add(youtube_suggest(seed))
    if depth >= 2:
        # alphabet expansion, but bounded so we stay polite
        for ch in "abcdefghijklmnopqrstuvwxyz"[: config.HARVEST_SUGGEST_SEEDS * 4]:
            if len(universe) >= 60:
                break
            _add(youtube_suggest(f"{seed} {ch}"))
    return universe


# ---------------------------------------------------------------------------
# 2. Competitor SERP via yt-dlp (competition + saturation signal)
# ---------------------------------------------------------------------------
@dataclass
class Competitor:
    title: str
    channel: str = ""
    video_id: str = ""
    url: str = ""
    view_count: Optional[int] = None
    duration: Optional[int] = None
    query: str = ""


def youtube_search_checked(query: str, limit: int = None) -> tuple[list[Competitor], bool]:
    """
    Keyless YouTube search via yt-dlp flat extraction.

    Returns (competitors, search_ran). `search_ran` distinguishes the two very
    different meanings of an empty list:
       True  -> the search executed and genuinely found nothing (content white space)
       False -> yt-dlp is missing or the request failed (result is UNKNOWN, not empty)
    Scoring depends on this: unknown must never be scored as "no competition".
    """
    limit = limit or config.HARVEST_COMPETITORS_PER_IDEA
    try:
        import yt_dlp
    except Exception:
        config.log("[harvest] yt-dlp not installed; competitor discovery skipped.")
        return [], False

    opts = {
        "quiet": True,
        "skip_download": True,
        "extract_flat": True,
        "no_warnings": True,
        "default_search": "ytsearch",
        "socket_timeout": config.HARVEST_TIMEOUT,
    }
    out: list[Competitor] = []
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
        for e in (info or {}).get("entries", []) or []:
            if not e:
                continue
            out.append(
                Competitor(
                    title=e.get("title") or "",
                    channel=e.get("channel") or e.get("uploader") or "",
                    video_id=e.get("id") or "",
                    url=e.get("url") or f"https://youtu.be/{e.get('id','')}",
                    view_count=e.get("view_count"),
                    duration=e.get("duration"),
                    query=query,
                )
            )
    except Exception as e:
        config.log(f"[harvest] youtube_search('{query[:30]}') failed: {type(e).__name__}")
        return out, False
    return out, True


def youtube_search(query: str, limit: int = None) -> list[Competitor]:
    """Convenience wrapper that discards the search-ran flag."""
    return youtube_search_checked(query, limit)[0]


# ---------------------------------------------------------------------------
# 3. Google Trends (optional demand-over-time signal)
# ---------------------------------------------------------------------------
def google_trends_interest(keywords: list[str]) -> dict:
    """Optional. Returns {} unless pytrends is installed and SEO_ENABLE_TRENDS=1."""
    if not config.HARVEST_ENABLE_TRENDS:
        return {}
    try:
        from pytrends.request import TrendReq
    except Exception:
        config.log("[harvest] pytrends not installed; trends skipped.")
        return {}
    try:
        pt = TrendReq(hl="en-US", tz=0)
        pt.build_payload(keywords[:5], timeframe="today 12-m")
        df = pt.interest_over_time()
        if df is None or df.empty:
            return {}
        return {k: int(df[k].mean()) for k in keywords[:5] if k in df.columns}
    except Exception as e:
        config.log(f"[harvest] google_trends failed: {type(e).__name__}")
        return {}


# ---------------------------------------------------------------------------
# Aggregate harvest for one idea
# ---------------------------------------------------------------------------
@dataclass
class HarvestResult:
    idea_id: int
    idea_title: str
    topic: str
    seed_queries: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    competitors: list[Competitor] = field(default_factory=list)
    trends: dict = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    # True only if a competitor search actually executed. Distinguishes
    # "genuinely no competition" from "we could not look". See scoring.score_idea.
    competitor_search_ran: bool = False
    keyword_search_ran: bool = False

    def to_dict(self) -> dict:
        d = asdict(self)
        d["competitors"] = [asdict(c) for c in self.competitors]
        return d


def _clean_seed(text: str) -> str:
    """Turn an idea title into a searchable seed (drop emoji/boilerplate)."""
    t = re.sub(r"[^\w\s\-]", " ", text or "")
    t = re.sub(r"\b(?:INSANE|Level\s*10|Impossible|Megastructure)\b", " ", t, flags=re.I)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def harvest_for_idea(idea_id: int, idea_title: str, topic: str = "") -> HarvestResult:
    """Collect the full keyless signal set for a single idea."""
    result = HarvestResult(idea_id=idea_id, idea_title=idea_title, topic=topic or "")

    base = _clean_seed(idea_title)
    seeds = [s for s in {base, topic.strip() if topic else "", f"{topic} machine".strip()} if s]
    if not seeds:
        seeds = [idea_title]
    result.seed_queries = seeds
    config.log(f"[harvest] Idea #{idea_id}: seeds={seeds}")

    # Keywords
    for s in seeds[: config.HARVEST_SUGGEST_SEEDS]:
        result.keywords.extend(expand_keywords(s, depth=2))
    # dedupe preserving order
    seen = set()
    result.keywords = [k for k in result.keywords if not (k.lower() in seen or seen.add(k.lower()))]
    # A single probe tells us whether the suggest endpoint is reachable at all.
    result.keyword_search_ran = bool(result.keywords) or bool(youtube_suggest(seeds[0]))
    if not result.keywords:
        result.notes.append("no keyword suggestions returned (offline or throttled)")

    # Competitors — search the strongest seed + top 2 keywords
    search_queries = seeds[:1] + result.keywords[:2]
    seen_ids = set()
    any_search_ran = False
    for q in search_queries:
        comps, ran = youtube_search_checked(q)
        any_search_ran = any_search_ran or ran
        for c in comps:
            if c.video_id and c.video_id in seen_ids:
                continue
            seen_ids.add(c.video_id)
            result.competitors.append(c)
    result.competitor_search_ran = any_search_ran
    if not result.competitors:
        if any_search_ran:
            result.notes.append("competitor search ran and found nothing -> genuine white space")
        else:
            result.notes.append("competitor search could NOT run (yt-dlp offline) -> novelty unknown")

    # Trends (optional)
    result.trends = google_trends_interest(result.keywords[:5])

    config.log(
        f"[harvest] Idea #{idea_id}: {len(result.keywords)} keywords, "
        f"{len(result.competitors)} competitors, trends={'yes' if result.trends else 'no'}"
    )
    return result
