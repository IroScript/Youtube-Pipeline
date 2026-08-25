"""
Uniqueness Engine — v2 Prompt Templates (versioned, reversible)
==============================================================
Installs improved `prompting_style_master` rows as NEW versions. The old rows are
only flipped to `is_active=0` — never deleted — so a rollback is one UPDATE away.

CRITICAL COMPATIBILITY CONSTRAINT
---------------------------------
prompt_chain_engine.py formats these templates with exactly three keys:

    STAGE_3: .format(idea_title=..., topic=..., description=...)   (line ~723)
    STAGE_2: .format(element_name=..., element_group=...)          (line ~297)

Because that is a plain `str.format()`, ANY extra placeholder in the stored template
would raise KeyError and break the existing pipeline. So the templates below use ONLY
those documented keys. Per-idea creative variation is layered separately by
`uniqueness.escalation`, which knows how to supply the archetype block.

Also note: every literal JSON brace must be doubled (`{{`/`}}`) to survive `.format()`.

Which stages actually matter
---------------------------
Audit finding: the engine only ever fetches STAGE_1, STAGE_2 and STAGE_3.
STAGE_4/STAGE_5 rows exist but are never read by any code path, so rewriting them
would change nothing. We therefore target STAGE_3 (escalation — the prompt that
produces the video/image text) and STAGE_2 (idea generation — more distinct ideas).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# STAGE_3 v2 — escalation master
# ---------------------------------------------------------------------------
# Fixes vs v1:
#   * v1 dictated ONE camera language and ONE ending for every idea, producing the
#     identical "descend into a single grain" close on all 35 videos. v2 forbids that.
#   * v1's layer descriptions were agricultural-harvester specific ("threshing
#     cylinders", "grain"), so a Volcano or Ocean idea still rendered as a harvester.
#     v2 derives all machinery from the idea's own subject.
#   * v1 let the model reuse a generic "Forest Titan Megastructure" subject line;
#     v2 makes naming the idea's own subject a hard requirement.
STAGE_3_V2_TEMPLATE = """Given the following Impossible Machine Idea:
Title: {idea_title}
Topic/Element: {topic}
Concept: {description}

Build a complete 10-level escalation prompting system (10 Image Prompts + 10 Video Prompts
= 20 prompts total) escalating from Level 1 (BASIC, plausible) to Level 10 (ALIEN LEVEL /
MAXIMUM, physically impossible in scale).

=== RULE 0 — SUBJECT FIDELITY (most important) ===
Every single prompt MUST describe "{idea_title}" specifically, operating on {topic}.
- Name the actual subject and its actual mechanism in Layer 1 and in Second 1.
- Derive all machinery from what "{idea_title}" actually does. If the subject has nothing
  to do with grain or harvesting, it must NOT contain threshing drums, grain silos or
  harvesting claws.
- NEVER substitute a generic placeholder subject such as "Forest Titan Megastructure",
  "Titan Harvester" or "the megastructure". A reader must be able to identify which idea
  the prompt belongs to from the prompt text alone.

=== RULE 1 — ANTI-UNIFORMITY (this is a hard requirement) ===
These prompts are one of hundreds in a library. They must NOT look like the others.
- Do NOT open the video prompt with a boilerplate specification sentence.
- Do NOT end every level with a descent/zoom into a small object. Specifically, do NOT
  use "continuous impossible-scale descent", and do NOT close on "a single grain/particle
  beside a quantum mechanism". That exact ending is already overused and is banned.
- Choose a camera language and a closing beat that suit THIS subject, and make the ten
  levels differ from each other, not just escalate in adjective strength.
- Vary the HUD step wording. Do not use the sequence AWAKEN / HARVEST / THRESH /
  PURIFICATION / RESERVOIRS.

=== IMAGE PROMPT (per level) ===
9:16 vertical, photorealistic, high detail. Cover in prose (not as labelled headings):
  Subject      — "{idea_title}" itself: its distinctive form, silhouette and scale cues.
  Environment  — the {topic} setting, with something recognisable for scale.
  Mechanism    — the parts that make THIS subject work, named concretely.
  Energy       — how it is powered and how that is visible.
  Presentation — framing, lighting and atmosphere specific to this level.

=== VIDEO PROMPT (per level) ===
Exactly 8 seconds, 9:16 vertical, one continuous shot, no cuts.
  - Open by naming the subject and the shot, not with a spec preamble.
  - Include on-screen HUD popup beats with SHORT step labels, and state their timing.
  - Close with a distinct final beat chosen for this subject (see RULE 1).
  - Escalate scale across levels: Level 1 believable machine -> Level 10 impossible,
    landscape-dominating structure.

=== OUTPUT FORMAT ===
Return ONLY a strict JSON array of exactly 10 objects, no prose, no markdown fence:
[
  {{
    "level": 1,
    "level_name": "Level 1 - BASIC",
    "image_prompt": "...",
    "video_prompt": "..."
  }}
]
Rules: exactly 10 objects, levels 1..10 in order, both prompt fields non-empty and at
least 350 characters each, all prompts 9:16 vertical, all video prompts exactly 8 seconds."""

STAGE_3_V2_RULES = (
    "1. Strict JSON array of exactly 10 level objects (levels 1-10). "
    "2. Exactly 20 prompts (10 image + 10 video), each >= 350 chars. "
    "3. All prompts 9:16 vertical; all video prompts exactly 8 seconds, single continuous shot. "
    "4. RULE 0 subject fidelity: every prompt names '{idea_title}' and its real mechanism; "
    "generic placeholder subjects are forbidden. "
    "5. RULE 1 anti-uniformity: no boilerplate opening sentence; the "
    "'continuous impossible-scale descent into a single grain/particle' ending is BANNED; "
    "camera language, closing beat and HUD verbs must vary per level and per idea."
)

STAGE_3_V2_SYSTEM_INSTRUCTION = (
    "You are a cinematic prompt architect building a large library of visually DISTINCT "
    "impossible-machine videos. Your prompts are judged on two axes: (a) fidelity to the "
    "specific subject given, and (b) visual difference from every other prompt in the "
    "library. Repeating a house style across subjects is the failure mode to avoid."
)


# ---------------------------------------------------------------------------
# STAGE_2 v2 — idea generation
# ---------------------------------------------------------------------------
# Fixes vs v1: v1 asked for 10 "giant machines" per element, which produced ten
# near-synonyms (Rice Titan Harvester / Paddy Ocean Vacuum / Rice-Field Spider
# Colossus ...). v2 forces functional and formal diversity inside the set of 10.
STAGE_2_V2_TEMPLATE = """Give me 10 impossible-machine ideas built around {element_name}
(category/group: {element_group}).

Each machine must be enormous — colossal, landscape-scale engineering.

=== DIVERSITY REQUIREMENTS (the set of 10 is graded as a whole) ===
The 10 ideas must be genuinely DIFFERENT from one another, not ten rewordings of the
same machine. Across the set:
  1. Vary the FUNCTION: do not make all ten harvest or extract. Include machines that
     build, move, protect, transform, measure, recycle, transport, or terraform.
  2. Vary the FORM: no more than two may share a body plan. Spread across forms such as
     bridge/span, tower, ring, buried burrower, walking chassis, overhead canopy,
     segmented spine, honeycomb mass, tracked crawler, suspended aerial platform.
  3. Vary the RELATIONSHIP to {element_name}: some work on it, some are made of it, some
     protect it, some replace it, some study it.
  4. Avoid near-duplicate titles. Do not produce a set where most titles share a word.
  5. Do not use the words "Titan" or "Colossus" in more than one title.

Each description must state concretely what the machine DOES and HOW it works
mechanically — 2 to 4 sentences, no vague grandeur.

Return ONLY a strict JSON array of 10 objects, no markdown, no commentary:
[
  {{
    "id": 1,
    "title": "Machine Title",
    "description": "What it does and how it mechanically operates on {element_name}."
  }}
]"""

STAGE_2_V2_RULES = (
    "1. Strict JSON array of exactly 10 objects. "
    "2. Each idea giant/colossal in scale. "
    "3. Diversity is mandatory: vary function, body form, and relationship to the element; "
    "no more than two ideas may share a body plan. "
    "4. No near-duplicate titles; 'Titan'/'Colossus' at most once each. "
    "5. Descriptions state concrete mechanism in 2-4 sentences."
)


# ---------------------------------------------------------------------------
# Install / rollback
# ---------------------------------------------------------------------------
# Unambiguous marker for rows this module installed. A prefix match on style_title is
# NOT safe: v1's title ("10-Level Escalation Master Prompt Architecture") shares its
# opening words with v2's, which produced a false "already installed" result.
V2_MARKER = "(v2"


def _is_v2(row) -> bool:
    return V2_MARKER in (row.style_title or "")


V2_STAGES = {
    "STAGE_3_PROMPT_ESCALATION_MASTER": {
        "style_title": "10-Level Escalation Master (v2 — subject-faithful, anti-uniform)",
        "system_role": "Cinematic Prompt Architect (Diversity-Enforcing)",
        "system_instruction": STAGE_3_V2_SYSTEM_INSTRUCTION,
        "prompt_template": STAGE_3_V2_TEMPLATE,
        "rules_and_constraints": STAGE_3_V2_RULES,
        "output_format": "JSON_ARRAY",
        "target_hierarchy_level": "Level 3->4",
        "model_target": "ChatGPT / Playwright CloakBrowser",
        "format_keys": ("idea_title", "topic", "description"),
    },
    "STAGE_2_IDEA_GENERATION": {
        "style_title": "10-Idea Generator (v2 — function/form diversity enforced)",
        "system_role": "Concept Designer (Diversity-Enforcing)",
        "system_instruction": (
            "You generate sets of impossible-machine concepts. A set is only good if the "
            "ten ideas are mutually distinct in function and form; ten variations on one "
            "machine is a failed answer."
        ),
        "prompt_template": STAGE_2_V2_TEMPLATE,
        "rules_and_constraints": STAGE_2_V2_RULES,
        "output_format": "JSON_ARRAY",
        "target_hierarchy_level": "Level 2->3",
        "model_target": "ChatGPT / Playwright CloakBrowser",
        "format_keys": ("element_name", "element_group"),
    },
}


def validate_templates() -> list[str]:
    """
    Guard against the KeyError class of bug: confirm each template formats cleanly
    with exactly the keys the engine will pass, and no others.
    """
    problems: list[str] = []
    probe = {
        "idea_title": "TEST TITLE", "topic": "TEST TOPIC", "description": "TEST DESC",
        "element_name": "TEST ELEMENT", "element_group": "TEST GROUP",
    }
    for stage, spec in V2_STAGES.items():
        keys = spec["format_keys"]
        args = {k: probe[k] for k in keys}
        try:
            spec["prompt_template"].format(**args)
        except KeyError as e:
            problems.append(f"{stage}: template needs key {e} which the engine does NOT pass")
        except Exception as e:
            problems.append(f"{stage}: template failed to format ({type(e).__name__}: {e})")
    return problems


def install_v2(apply: bool = False) -> dict:
    """
    Install v2 rows and deactivate the current active row for each stage.

    Non-destructive: old rows are retained with is_active=0. `rollback_v2()` restores
    them. Returns a summary describing exactly what changed (or would change).
    """
    from sqlmodel import select
    from database.session import get_session, init_db
    from database.models import PromptingStyleMaster

    problems = validate_templates()
    if problems:
        return {"ok": False, "errors": problems, "changes": []}

    init_db()
    changes: list[dict] = []

    with get_session() as session:
        for stage, spec in V2_STAGES.items():
            rows = session.exec(
                select(PromptingStyleMaster).where(PromptingStyleMaster.stage_name == stage)
            ).all()
            active = [r for r in rows if r.is_active == 1]
            max_ver = max([r.version or 1 for r in rows], default=0)
            already_v2 = any(_is_v2(r) and r.is_active == 1 for r in rows)

            changes.append({
                "stage": stage,
                "existing_rows": len(rows),
                "currently_active": [f"#{r.id} v{r.version} {r.style_title[:40]}" for r in active],
                "new_version": max_ver + 1,
                "action": "already_installed" if already_v2 else "insert_v2_and_deactivate_old",
            })

            if not apply or already_v2:
                continue

            for r in active:
                r.is_active = 0
                r.updated_at = datetime.now(timezone.utc)
                session.add(r)

            session.add(PromptingStyleMaster(
                uuid=str(uuid.uuid4()),
                stage_name=stage,
                target_hierarchy_level=spec["target_hierarchy_level"],
                style_title=spec["style_title"],
                system_role=spec["system_role"],
                system_instruction=spec["system_instruction"],
                prompt_template=spec["prompt_template"],
                output_format=spec["output_format"],
                model_target=spec["model_target"],
                rules_and_constraints=spec["rules_and_constraints"],
                is_active=1,
                version=max_ver + 1,
            ))
        if apply:
            session.commit()

    return {"ok": True, "errors": [], "applied": apply, "changes": changes}


def rollback_v2(apply: bool = False) -> dict:
    """
    Reactivate the highest-version NON-v2 row per stage and deactivate v2.
    Proves the install is reversible.
    """
    from sqlmodel import select
    from database.session import get_session, init_db
    from database.models import PromptingStyleMaster

    init_db()
    actions: list[dict] = []
    with get_session() as session:
        for stage, spec in V2_STAGES.items():
            rows = session.exec(
                select(PromptingStyleMaster).where(PromptingStyleMaster.stage_name == stage)
            ).all()
            v2_rows = [r for r in rows if _is_v2(r)]
            old_rows = [r for r in rows if not _is_v2(r)]
            if not v2_rows or not old_rows:
                actions.append({"stage": stage, "action": "nothing_to_roll_back"})
                continue
            target = sorted(old_rows, key=lambda r: r.version or 1)[-1]
            actions.append({
                "stage": stage,
                "action": f"reactivate #{target.id} v{target.version}, deactivate v2",
            })
            if apply:
                for r in v2_rows:
                    r.is_active = 0
                    session.add(r)
                target.is_active = 1
                session.add(target)
        if apply:
            session.commit()
    return {"applied": apply, "actions": actions}
