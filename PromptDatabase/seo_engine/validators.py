"""
SEO Engine — Upload-Ready Validators / Normalizers
==================================================
The user requirement is "SEO data that is UPLOAD READY". An LLM will happily
return a 130-character title or 40 tags; YouTube will then reject or silently
truncate the upload. This module is the deterministic gate that guarantees every
package we store in `youtube_metadata` can be uploaded verbatim.

Every function is pure (no DB, no network) so it is trivially testable.
Nothing raises on bad input — it repairs and reports, so a single sloppy LLM
response never kills a pipeline run.
"""

from __future__ import annotations

import re
from typing import Any

from . import config


# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------
_WS = re.compile(r"[ \t ]+")
_MULTINL = re.compile(r"\n{3,}")


def clean_text(value: Any) -> str:
    """Collapse whitespace, strip control chars, keep newlines meaningful."""
    if value is None:
        return ""
    text = str(value).replace("\r\n", "\n").replace("\r", "\n")
    text = "".join(ch for ch in text if ch == "\n" or ch >= " ")
    text = _WS.sub(" ", text)
    text = _MULTINL.sub("\n\n", text)
    return text.strip()


def _truncate_on_word(text: str, limit: int) -> str:
    """Trim to `limit` chars without slicing a word in half."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    if " " in cut:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip(" -–—|:,")


# ---------------------------------------------------------------------------
# Field-level validators
# ---------------------------------------------------------------------------
def normalize_title(title: Any, fallback: str = "") -> tuple[str, list[str]]:
    """Return an upload-safe title plus any warnings raised while repairing it."""
    warnings: list[str] = []
    text = clean_text(title) or clean_text(fallback)
    if not text:
        return "", ["title: empty and no fallback available"]

    # Strip markdown/quote wrappers the browser LLM often adds.
    text = text.strip('"\'` ')
    text = re.sub(r"^(?:#+\s*|\*\*|title\s*[:\-]\s*)", "", text, flags=re.I).strip()
    text = text.replace("**", "")

    if len(text) > config.YT_TITLE_MAX:
        warnings.append(
            f"title: {len(text)} chars exceeded YouTube max {config.YT_TITLE_MAX} -> truncated"
        )
        text = _truncate_on_word(text, config.YT_TITLE_MAX)
    elif len(text) > config.YT_TITLE_SOFT:
        warnings.append(
            f"title: {len(text)} chars exceeds soft target {config.YT_TITLE_SOFT} "
            "(may clip in search results)"
        )

    # YouTube rejects titles containing < or >
    if "<" in text or ">" in text:
        text = text.replace("<", "").replace(">", "")
        warnings.append("title: stripped angle brackets (rejected by YouTube)")

    return text.strip(), warnings


def normalize_description(desc: Any, fallback: str = "") -> tuple[str, list[str]]:
    warnings: list[str] = []
    text = clean_text(desc) or clean_text(fallback)
    if not text:
        return "", ["description: empty and no fallback available"]

    if len(text) > config.YT_DESC_MAX:
        warnings.append(
            f"description: {len(text)} chars exceeded max {config.YT_DESC_MAX} -> truncated"
        )
        text = _truncate_on_word(text, config.YT_DESC_MAX)

    if "<" in text or ">" in text:
        text = text.replace("<", "").replace(">", "")
        warnings.append("description: stripped angle brackets (rejected by YouTube)")

    return text.strip(), warnings


def normalize_tags(tags: Any) -> tuple[list[str], list[str]]:
    """
    Dedupe (case-insensitive), drop junk, enforce per-tag length, then enforce
    YouTube's *total character budget* across all tags — the limit people most
    often trip over, because it is invisible until the upload fails.
    """
    warnings: list[str] = []

    raw: list[str] = []
    if isinstance(tags, str):
        raw = [t for t in re.split(r"[,\n]", tags)]
    elif isinstance(tags, (list, tuple)):
        raw = [str(t) for t in tags]
    elif tags:
        raw = [str(tags)]

    seen: set[str] = set()
    cleaned: list[str] = []
    for tag in raw:
        t = clean_text(tag).strip('"\'`#').strip()
        t = re.sub(r"^[-*\d.)\s]+", "", t).strip()   # strip list bullets "1. " / "- "
        if not t:
            continue
        if len(t) > config.YT_TAG_MAX_LEN:
            warnings.append(f"tags: dropped over-long tag ({len(t)} chars): {t[:40]}...")
            continue
        key = t.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(t)

    if len(cleaned) > config.YT_TAGS_MAX_COUNT:
        warnings.append(
            f"tags: {len(cleaned)} tags trimmed to {config.YT_TAGS_MAX_COUNT}"
        )
        cleaned = cleaned[: config.YT_TAGS_MAX_COUNT]

    # Total-character budget: YouTube counts the joined length.
    budget = config.YT_TAGS_TOTAL_CHARS_MAX
    kept: list[str] = []
    running = 0
    for t in cleaned:
        cost = len(t) + (1 if kept else 0)   # comma separator
        if running + cost > budget:
            warnings.append(
                f"tags: hit {budget}-char total budget; dropped {len(cleaned) - len(kept)} trailing tag(s)"
            )
            break
        kept.append(t)
        running += cost

    if not kept:
        warnings.append("tags: no valid tags survived normalization")

    return kept, warnings


def extract_hashtags(description: str, limit: int = 5) -> list[str]:
    """Pull hashtags out of a description, preserving order, deduped."""
    found: list[str] = []
    seen: set[str] = set()
    for m in re.finditer(r"#(\w{2,40})", description or ""):
        tag = "#" + m.group(1)
        if tag.lower() not in seen:
            seen.add(tag.lower())
            found.append(tag)
        if len(found) >= limit:
            break
    return found


# ---------------------------------------------------------------------------
# Package-level validation
# ---------------------------------------------------------------------------
def validate_metadata_package(
    package: dict, *, fallback_title: str = "", fallback_desc: str = ""
) -> dict:
    """
    Normalize an LLM-produced metadata dict into a guaranteed-uploadable package.

    Returns the package with an added `_validation` block:
        {"ok": bool, "warnings": [...], "upload_ready": bool}

    `ok` means "nothing was structurally missing".
    `upload_ready` means "this can be pushed to YouTube verbatim".
    """
    pkg = dict(package or {})
    warnings: list[str] = []

    title, w = normalize_title(pkg.get("title"), fallback=fallback_title)
    warnings += w
    desc, w = normalize_description(pkg.get("seo_description") or pkg.get("description"),
                                   fallback=fallback_desc)
    warnings += w
    tags, w = normalize_tags(pkg.get("tags"))
    warnings += w

    category = clean_text(pkg.get("category")) or config.YT_DEFAULT_CATEGORY
    language = clean_text(pkg.get("default_language")) or config.YT_DEFAULT_LANGUAGE

    hashtags = pkg.get("hashtags")
    if isinstance(hashtags, (list, tuple)) and hashtags:
        hashtags = [h if str(h).startswith("#") else f"#{h}" for h in hashtags][:5]
    else:
        hashtags = extract_hashtags(desc)

    out = {
        "title": title,
        "seo_description": desc,
        "tags": tags,
        "hashtags": hashtags,
        "category": category,
        "default_language": language,
    }
    # Preserve any richer fields the SEO brain produced, without letting them
    # overwrite the validated core.
    for extra in ("hook", "thumbnail_prompt", "pinned_comment", "target_keyword",
                  "chapters", "shorts_title"):
        if pkg.get(extra):
            out[extra] = clean_text(pkg[extra]) if isinstance(pkg[extra], str) else pkg[extra]

    upload_ready = bool(title and desc and tags)
    out["_validation"] = {
        "ok": upload_ready,
        "upload_ready": upload_ready,
        "warnings": warnings,
        "title_len": len(title),
        "desc_len": len(desc),
        "tag_count": len(tags),
        "tag_chars": sum(len(t) for t in tags) + max(0, len(tags) - 1),
    }
    return out


def is_legacy_fallback(title: str, description: str = "", tags: Any = None) -> bool:
    """
    Detect the hardcoded boilerplate that currently fills ALL 35 rows of
    `youtube_metadata` (see generate_youtube_metadata.py's fallback block).
    Used by pipeline.py to decide which rows are worth regenerating.
    """
    t = (title or "")
    if re.match(r"^\s*🚨\s*INSANE:.*Level 10 Impossible Megastructure", t):
        return True
    if "Witness the ultimate Level 10 Alien-Scale" in (description or ""):
        return True
    boiler = {"impossible engineering", "ai video", "veo", "megastructure",
              "titan harvester", "scifi concept", "future technology",
              "colossal machines"}
    if isinstance(tags, (list, tuple)) and tags:
        lowered = {str(x).strip().lower() for x in tags}
        if boiler.issubset(lowered):
            return True
    return False
