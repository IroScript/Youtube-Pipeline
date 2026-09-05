"""
SEO Engine — Metadata Builder (the data-grounded "Brain" call)
=============================================================
This is where the harvested signals meet the browser LLM.

The key difference from the legacy generator
(playwright_engine/generate_youtube_metadata.py) is the PROMPT CONTEXT:

  legacy : title + topic + "Level 10"        -> LLM invents everything
  here   : title + topic + REAL top keywords + REAL competitor titles/views
           + computed novelty/saturation/opportunity scores
           -> LLM packages facts it was given, instead of hallucinating SEO data

It also honours the project's own prompt registry: the base instruction is read
from `prompting_style_master` (stage STAGE_6_YOUTUBE_METADATA) when available, so
the SEO voice stays configurable in the DB exactly like every other stage —
something the legacy generator ignored by hardcoding its prompt inline.

A deterministic, data-grounded fallback builder is included for when the browser
is unavailable — but unlike the legacy fallback it uses the REAL mined keywords,
so it is never identical across ideas.
"""

from __future__ import annotations

import json
from typing import Optional

from . import config, validators
from .harvest import HarvestResult
from .scoring import OpportunityReport


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------
def _load_stage6_template() -> Optional[str]:
    """Read the active SEO prompt template from the DB registry."""
    try:
        from sqlmodel import select
        from database.session import get_session, init_db
        from database.models import PromptingStyleMaster

        init_db()
        with get_session() as session:
            style = session.exec(
                select(PromptingStyleMaster).where(
                    PromptingStyleMaster.stage_name == "STAGE_6_YOUTUBE_METADATA",
                    PromptingStyleMaster.is_active == 1,
                )
            ).first()
            if style and style.prompt_template:
                return style.prompt_template
    except Exception as e:
        config.log(f"[metadata] could not read STAGE_6 template from DB: {type(e).__name__}")
    return None


def build_seo_prompt(harvest: HarvestResult, report: OpportunityReport) -> str:
    """Compose the data-grounded SEO prompt sent to the browser LLM using the DB template."""
    template = _load_stage6_template()

    # 1. Fetch video description / story and level 10 prompt if available
    video_story = ""
    try:
        from sqlmodel import select
        from database.session import get_session
        from database.models import Idea, Prompt
        with get_session() as session:
            idea_obj = session.exec(select(Idea).where(Idea.id == harvest.idea_id)).first()
            if idea_obj:
                video_story = getattr(idea_obj, "description", "") or getattr(idea_obj, "story", "") or ""
            lvl10 = session.exec(
                select(Prompt).where(
                    Prompt.idea_id == harvest.idea_id,
                    Prompt.level == 10,
                    Prompt.generation_type == "video"
                )
            ).first()
            if lvl10 and lvl10.prompt_text:
                if video_story:
                    video_story += f"\n\nLevel 10 Video Script/Action:\n{lvl10.prompt_text[:300]}..."
                else:
                    video_story = lvl10.prompt_text
    except Exception:
        pass
    if not video_story:
        video_story = f"A colossal {harvest.idea_title} operating on {harvest.topic or 'the landscape'} in an 8-second cinematic vertical short."

    # 2. Format measured SEO signals
    signals = (
        f"Demand Score: {report.demand_score:.0f}/100\n"
        f"Novelty Score: {report.novelty_score:.0f}/100\n"
        f"Saturation Score: {report.saturation_score:.0f}/100  (higher = more crowded)\n"
        f"Opportunity Score: {report.opportunity_score:.0f}/100 -> verdict: {report.verdict}\n"
        f"Competitor Breakdown: {report.exact_competitors} exact, {report.close_competitors} close, {report.substitute_competitors} substitute\n"
        f"Harvested Keywords Count: {len(harvest.keywords)}\n"
        f"Discovered Competitors Count: {len(harvest.competitors)}"
    )

    # 3. Format real keywords & competitors
    top_kw = report.top_keywords[:15]
    kw_lines = "\n".join(f"- {k}" for k in top_kw) if top_kw else "- (no keyword data available)"

    rivals = [c for c in report.classified if c.level in ("EXACT", "CLOSE", "SUBSTITUTE")][:10]
    rival_lines = "\n".join(
        f"- [{c.level}] {c.title[:80]} ({c.view_count:,} views, channel: {c.channel[:28]})"
        for c in rivals
    ) if rivals else "- (no close competitors found — this is likely content white space)"

    replacements = {
        "idea_id": str(harvest.idea_id),
        "idea_title": harvest.idea_title,
        "topic": harvest.topic or "General",
        "format": "8-second vertical (9:16) AI-generated cinematic short",
        "video_story": video_story,
        "escalation_level": "Level 10 (Alien / Maximum Megastructure)",
        "target_audience": "Viewers interested in agriculture, futuristic engineering, colossal machines, satisfying videos",
        "video_duration": "8 seconds",
        "default_language": config.YT_DEFAULT_LANGUAGE,
        "category": config.YT_DEFAULT_CATEGORY,
        "seo_signals": signals,
        "harvested_keywords": kw_lines,
        "competitor_videos": rival_lines,
    }

    if template:
        res = template
        for k, val in replacements.items():
            res = res.replace(f"{{{{{k}}}}}", str(val)).replace(f"{{{k}}}", str(val))
        return res

    # Fallback to default inline template if DB template is missing
    return f"""You are the final YouTube SEO Packaging Engine.

VIDEO SUBJECT : {harvest.idea_title}
TOPIC/ELEMENT : {harvest.topic or 'General'}
FORMAT        : 8-second vertical (9:16) AI-generated cinematic short

MEASURED SEO SIGNALS:
{signals}

REAL KEYWORDS:
{kw_lines}

REAL COMPETING VIDEOS:
{rival_lines}

Return ONLY a raw JSON object with keys: title, seo_description, tags, hashtags, target_keyword, pinned_comment, category, default_language.""".strip()


# ---------------------------------------------------------------------------
# Data-grounded deterministic fallback (no browser needed)
# ---------------------------------------------------------------------------
def build_fallback_package(harvest: HarvestResult, report: OpportunityReport) -> dict:
    """
    Build a real, per-idea metadata package WITHOUT the LLM, using mined keywords.

    Contrast with the legacy fallback, which emitted a byte-identical boilerplate
    for every idea (all 35 rows currently in the DB). This one is keyword-driven,
    so two different ideas can never produce the same package.
    """
    title_base = harvest.idea_title.strip()
    target = (report.top_keywords[0] if report.top_keywords else harvest.topic or title_base)

    title = f"{title_base} — The {harvest.topic or 'Impossible'} Machine You've Never Seen"
    if len(title) > config.YT_TITLE_SOFT:
        title = f"{title_base} — Impossible {harvest.topic or 'Machine'}"

    kw_line = ", ".join(report.top_keywords[:6]) if report.top_keywords else target
    rivals = [c.title for c in report.classified if c.level in ("EXACT", "CLOSE")][:3]
    gap = (
        "Unlike existing videos on this subject, this is a fully AI-generated "
        "cinematic concept render."
        if rivals
        else "No comparable video currently exists for this exact concept."
    )

    desc = (
        f"{title_base}: an impossible {harvest.topic or 'megastructure'} machine rendered as an "
        f"8-second cinematic concept. {gap}\n\n"
        f"This concept explores {target}. {kw_line}.\n\n"
        "TIMESTAMPS\n"
        "0:00 - Core startup\n"
        "0:02 - Mechanical deployment\n"
        "0:04 - Full-scale operation\n"
        "0:06 - Final stabilization\n\n"
        "#Shorts #AI #ImpossibleEngineering #Megastructure #SciFi"
    )

    tags: list[str] = []
    for k in report.top_keywords[:10]:
        tags.append(k)
    tags = [title_base] + tags + [f"{harvest.topic} machine".strip(), "impossible engineering",
                                  "AI generated video", "megastructure"]

    return {
        "title": title,
        "seo_description": desc,
        "tags": tags,
        "hashtags": ["#Shorts", "#AI", "#ImpossibleEngineering", "#Megastructure", "#SciFi"],
        "hook": f"What if {title_base} was real?",
        "pinned_comment": f"Would this {title_base} actually work in real life? Tell us in the comments! 👇",
        "thumbnail_prompt": (
            f"Ultra-detailed cinematic render of {title_base}, colossal scale, "
            "dramatic rim lighting, awe-struck human silhouette for scale, 9:16 vertical"
        ),
        "target_keyword": target,
        "category": config.YT_DEFAULT_CATEGORY,
        "default_language": config.YT_DEFAULT_LANGUAGE,
        "_source": "deterministic_fallback_keyword_grounded",
    }


# ---------------------------------------------------------------------------
# Public entry
# ---------------------------------------------------------------------------
def build_metadata(
    harvest: HarvestResult,
    report: OpportunityReport,
    llm=None,
    use_browser: bool = True,
) -> dict:
    """
    Produce a validated, upload-ready metadata package for one idea.

    `llm` is an optional shared BrowserLLM instance (reuse it across a batch to
    keep the chatgpt.com session warm). If `use_browser` is False, or the browser
    call fails, we fall back to the keyword-grounded deterministic builder.

    Returns the validated package; `_validation` carries warnings and
    `_source` records whether the brain or the fallback produced it.
    """
    package: Optional[dict] = None
    source = "browser_llm"
    prompt = build_seo_prompt(harvest, report)

    if use_browser:
        try:
            own_llm = False
            if llm is None:
                from .browser_llm import BrowserLLM
                llm = BrowserLLM()
                own_llm = True
            raw = llm.generate_json(prompt)
            if own_llm:
                llm.close()
            if isinstance(raw, dict) and raw.get("title"):
                package = raw
            else:
                config.log("[metadata] browser LLM returned no usable JSON; using data-grounded fallback.")
        except Exception as e:
            config.log(f"[metadata] browser LLM failed ({type(e).__name__}: {e}); using fallback.")

    if package is None:
        package = build_fallback_package(harvest, report)
        source = package.pop("_source", "deterministic_fallback")

    fb = build_fallback_package(harvest, report)
    validated = validators.validate_metadata_package(
        package, fallback_title=fb["title"], fallback_desc=fb["seo_description"]
    )
    validated["_source"] = source
    validated["_prompt_sent"] = prompt
    return validated
