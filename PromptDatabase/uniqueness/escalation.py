"""
Uniqueness Engine — Variation-Aware Escalation Prompt Builder
=============================================================
Binds `variation.py` (deterministic per-idea archetypes) to the v2 STAGE_3 template.

Why this is a separate layer rather than baked into the DB template:
`prompt_chain_engine.py:723` formats the stored template with exactly
`.format(idea_title=, topic=, description=)`. Putting archetype placeholders into the
stored template would raise KeyError there and break the pipeline. So the stored
template stays 3-key compatible, and the per-idea creative direction is appended here
as an extra block — additive, and harmless if this module is never called.

Result: two ideas from the same element can no longer collapse onto the same skeleton,
because each is handed a different form, camera, ending, mood and HUD verb set.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from .variation import get_variation


def build_creative_direction(idea_id: int) -> str:
    """
    The per-idea block appended to the escalation prompt. Phrased as binding
    direction, and it explicitly re-bans the overused ending so the model cannot
    fall back into the house style even if it has seen it before.
    """
    v = get_variation(idea_id)
    verbs = " / ".join(v.hud_verbs)
    return f"""
=== CREATIVE DIRECTION FOR THIS SPECIFIC IDEA (binding — id {idea_id}) ===
This idea has been assigned a distinct visual identity so it cannot look like the other
videos in the library. Follow it:

  STRUCTURAL FORM : {v.form}
  CAMERA LANGUAGE : {v.camera_move}
  CLOSING BEAT    : {v.ending}
  LIGHT / MOOD    : {v.mood}
  PACING          : {v.pacing_desc}
  HUD STEP VERBS  : use these verbs (in this order) for the step labels: {verbs}

Hard constraints for this idea:
  - The closing beat above REPLACES any descent-into-a-small-object ending. Do NOT write
    "continuous impossible-scale descent", and do NOT close on a single grain or particle
    beside a quantum mechanism.
  - Build the machine around the STRUCTURAL FORM above, not a generic humanoid titan.
  - Keep the assigned mood consistent across all 10 levels; escalate scale, not lighting.
""".strip()


def build_escalation_prompt(idea_id: int, idea_title: str, topic: str,
                            description: str) -> Optional[str]:
    """
    Full escalation prompt = active STAGE_3 template (v2 if installed) + creative direction.
    Returns None if no active template row exists.
    """
    from sqlmodel import select
    from database.session import get_session, init_db
    from database.models import PromptingStyleMaster

    init_db()
    with get_session() as session:
        style = session.exec(select(PromptingStyleMaster).where(
            PromptingStyleMaster.stage_name == "STAGE_3_PROMPT_ESCALATION_MASTER",
            PromptingStyleMaster.is_active == 1,
        )).first()
        if not style or not style.prompt_template:
            return None
        template = style.prompt_template

    try:
        base = template.format(idea_title=idea_title, topic=topic or "General",
                               description=description or "")
    except KeyError as e:
        # An active template needing keys we don't have — report rather than crash.
        return f"[uniqueness] active STAGE_3 template requires unknown key {e}"

    return base + "\n\n" + build_creative_direction(idea_id)


def preview_prompt(idea_id: int) -> Optional[str]:
    """Build the prompt for a real idea straight from the DB (read-only)."""
    from sqlmodel import select
    from database.session import get_session, init_db
    from database.models import Idea

    init_db()
    with get_session() as session:
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        if not idea:
            return None
        title, topic = idea.title, idea.topic or ""
        desc = idea.description or idea.raw_idea or ""
    return build_escalation_prompt(idea_id, title, topic, desc)


def compare_ideas(idea_ids: list[int]) -> dict:
    """
    Prove the layer works: show that the creative direction differs across ideas.
    Used by the verification step.
    """
    blocks = {i: build_creative_direction(i) for i in idea_ids}
    sigs = {i: get_variation(i).signature() for i in idea_ids}

    # The banned phrase legitimately appears inside the prohibition sentence
    # ('Do NOT write "continuous impossible-scale descent"'). We only want to flag a
    # block that PRESCRIBES it. Compare case-insensitively — an earlier version missed
    # the capitalised "Do NOT write" and reported a false positive.
    def _prescribes_banned(block: str) -> bool:
        low = block.lower()
        if "impossible-scale descent" not in low:
            return False
        return "do not write" not in low

    return {
        "ideas": idea_ids,
        "distinct_direction_blocks": len(set(blocks.values())),
        "distinct_signatures": len(set(sigs.values())),
        "signatures": sigs,
        "any_still_mandating_banned_ending": any(_prescribes_banned(b) for b in blocks.values()),
        "distinct_endings": len({get_variation(i).ending_key for i in idea_ids}),
    }
