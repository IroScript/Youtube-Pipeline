"""
Uniqueness — Offline Escalation Variation
=========================================
WHY THIS MODULE EXISTS
----------------------
`uniqueness/escalation.py` varies the *instruction* sent to CloakBrowser. That works
only when the browser actually runs. But `prompt_chain_engine.build_rich_escalation_system()`
is a fully hardcoded offline fallback, and it is reached far more often than expected:

    idea_prompt_generator.fetch_sqlite_escalation_prompt()
        -> get_or_create_next_production_ready_prompt(skip_browser=True)
            -> generate_escalation_for_idea(skip_browser=True)
                -> build_rich_escalation_system()      <-- hardcoded text, no LLM

So on every real video render, any idea missing prompts was silently filled with that
one fixed template — including its level-10 closing beat, which is the literal source
of the banned ending:

    "the camera performs a continuous impossible-scale descent from the cosmic titan
     into its belly ... a single {topic} grain suspended beside a colossal quantum
     mechanism"                              (prompt_chain_engine.py, tier 10 s68_desc)

That is why 35/35 level-10 prompts shared one ending even with UNIQUENESS_VARIATION=1.

WHAT THIS DOES
--------------
Takes the ALREADY-ASSEMBLED level list and rewrites the varying parts per idea. The
250-line `tiers` table in prompt_chain_engine.py is left byte-for-byte untouched — this
is a post-processing pass, not a rewrite, so the offline builder keeps its structure,
its 5-layer image format and its second-by-second HUD video format exactly.

Two things change per idea:
  * the closing beat (seconds 6-8) becomes the idea's own assigned ENDING, which is
    never the banned descent
  * the image "Cinematic Presentation" layer picks up the idea's form, camera move
    and mood

FAILS OPEN
----------
Any error returns the input list unchanged. A diversity layer must never be able to
stop video production.
"""

from __future__ import annotations

import re

# The exact banned closing beat this module exists to eliminate. Matched loosely
# (substring, case-insensitive) because the tier text interpolates {clean_topic}.
BANNED_MARKERS = (
    "impossible-scale descent",
    "single grain",
)


def _closing_beat(var, level: int, clean_topic: str) -> str:
    """
    Build the replacement seconds 6-8 description from the idea's own variation.
    Keeps the offline format's contract: continuous motion, no cuts, exactly 8 seconds.
    """
    ending = var.ending.rstrip(". ")
    camera = var.camera_move.rstrip(". ")
    mood = var.mood.rstrip(". ")

    # Mood/form strings are long descriptive phrases, so they are attached with a
    # colon or preposition rather than an article — "a amber dust-laden ... rhythm"
    # would be both ungrammatical and confusing to the video model.
    return (
        f"HUD text completely fades; {camera}, and the sequence closes as {ending}. "
        f"The surrounding {clean_topic} machinery settles into a continuous operating "
        f"rhythm; lighting and atmosphere throughout: {mood}. "
        f"No cuts, no scene transition, exactly 8 seconds."
    )


def _cinematic_layer(var, existing: str) -> str:
    """
    Append the idea's form / camera / mood to the existing Layer 5 text rather than
    replacing it, so the original photorealistic render directives survive.
    """
    extra = (f" Overall silhouette reads as {var.form.rstrip('. ')}; "
             f"camera language: {var.camera_move.rstrip('. ')}; "
             f"atmosphere: {var.mood.rstrip('. ')}.")
    return existing.rstrip() + extra


def has_banned_ending(text: str) -> bool:
    low = (text or "").lower()
    return any(m in low for m in BANNED_MARKERS)


def apply_variation_to_levels(levels: list[dict], idea_id: int,
                              clean_topic: str = "resource") -> list[dict]:
    """
    Return a per-idea varied copy of an assembled escalation level list.

    `levels` is the exact structure build_rich_escalation_system() returns:
        [{"level": int, "level_name": str, "image_prompt": str, "video_prompt": str}, ...]

    Deterministic: the same idea_id always produces the same variation, so a rerun
    does not churn the database. Fails open — returns `levels` untouched on any error.
    """
    if not levels or idea_id is None:
        return levels

    try:
        from uniqueness.variation import get_variation
        var = get_variation(idea_id)

        out: list[dict] = []
        for item in levels:
            new = dict(item)
            level = new.get("level", 0)
            vid = new.get("video_prompt", "") or ""
            img = new.get("image_prompt", "") or ""

            # --- video: swap the closing beat -------------------------------
            # The offline format always ends with a "Seconds 6-8 [0:05-0:08]: ..." block.
            m = re.search(r"(Seconds 6-8 \[0:05-0:08\]:\s*)(.*)$", vid, flags=re.S)
            if m:
                vid = vid[:m.start(2)] + _closing_beat(var, level, clean_topic)
            new["video_prompt"] = vid

            # --- image: extend the cinematic layer --------------------------
            m2 = re.search(r"(Layer 5 — Cinematic Presentation:\s*)(.*)$", img, flags=re.S)
            if m2:
                img = img[:m2.start(2)] + _cinematic_layer(var, m2.group(2))
            new["image_prompt"] = img

            out.append(new)

        return out

    except Exception:
        return levels


def verify_no_banned(levels: list[dict]) -> dict:
    """Report which levels still carry a banned marker. Used by uniqueness/verify.py."""
    bad_video = [l.get("level") for l in levels if has_banned_ending(l.get("video_prompt", ""))]
    bad_image = [l.get("level") for l in levels if has_banned_ending(l.get("image_prompt", ""))]
    return {"clean": not bad_video and not bad_image,
            "video_levels_with_banned": bad_video,
            "image_levels_with_banned": bad_image}
