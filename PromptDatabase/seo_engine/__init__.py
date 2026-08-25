"""
SEO Engine — Keyless YouTube SEO / Metadata Intelligence Layer
=============================================================
A NON-DESTRUCTIVE, additive layer that sits in front of the existing
PromptDatabase pipeline. It replaces the *hardcoded fallback* youtube_metadata
(every one of the 35 existing rows is the boilerplate "🚨 INSANE ..." template)
with real, data-grounded, upload-ready SEO packages.

Architecture (per SEO_Discussion.txt philosophy):
    API/scrapers = eyes      -> harvest.py   (keyless: YouTube Suggest + yt-dlp SERP)
    Database     = memory    -> seo_models.py (additive tables, existing DB reused)
    Python/rules = calculator-> scoring.py   (deterministic opportunity/novelty scores)
    Browser LLM  = brain     -> browser_llm.py (CloakBrowser -> chatgpt.com, NO API key)
    orchestrator = nervous   -> pipeline.py + run_seo.py

Nothing here deletes or rewrites existing logic. The only write into an existing
table is an *opt-in* (`--apply`) refresh of `youtube_metadata`, always preceded by
a full DB backup, and always shown as a dry-run diff first. This mirrors the safety
contract in PromptDatabase/SUGGESTION_remediation_plan.md.
"""

__all__ = [
    "config",
    "validators",
    "browser_llm",
    "harvest",
    "scoring",
    "seo_models",
    "metadata_builder",
    "pipeline",
]
