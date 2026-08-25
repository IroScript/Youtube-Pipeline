"""
Uniqueness Engine — Prompt / Idea Diversity Layer
=================================================
Fixes the "every video looks the same" problem, diagnosed as four root causes:

  A. All 35 packaged ideas came from 5 tree/field elements. The walker in
     prompt_chain_engine.get_or_create_next_production_ready_prompt() restarts at
     element #1 every call and returns after one unit of work, so elements 14-100
     (Volcano, Ocean, Glacier, Space, Tech, Biology...) have ZERO ideas.  -> spread.py
  B. The prompt templates mandate one rigid skeleton: all 35 video prompts share an
     identical opening sentence, the same STEP1-AWAKEN -> STEP5-PURIFICATION arc, and
     an identical "descend into a single grain" ending (hardcoded at
     prompt_chain_engine.py:591).                          -> variation.py + templates.py
  C. Subject drift: 7 Forest ideas' Level-10 image prompt describes a generic
     "Forest Titan Megastructure" instead of their own subject. -> templates.py
  D. 9 of 34 packaged mp4s are byte-identical duplicates (a 1Video10Sec linkage
     bug, fixed separately in video/1Video10Sec).                    -> audit.py

Design rules (per project code-preservation policy):
  * Nothing in prompt_chain_engine.py is rewritten or deleted.
  * New prompt templates are added as NEW prompting_style_master version rows;
    the old rows are only deactivated (is_active=0), never dropped -> full rollback.
  * Every DB write is behind --apply and preceded by a timestamped backup.
  * The layer only affects real generation once its hooks are installed into
    prompt_chain_engine.py -- see integrate.py and `run_uniqueness.bat --status`.
    Until then every module here is inert and reachable only from run_uniqueness.py.
"""

__all__ = [
    "variation",    # deterministic per-idea archetypes (form/camera/ending/mood/HUD)
    "templates",    # v2 STAGE_2/STAGE_3 templates, installed as new version rows
    "escalation",   # binds variation into the escalation prompt (3-key safe)
    "spread",       # group-balanced element queue + live-engine reorder helper
    "novelty",      # idea-vs-idea similarity scan
    "audit",        # read-only diagnosis
    "integrate",    # installs/removes the prompt_chain_engine hooks (dry-run default)
    "verify",       # self-verification suite
]
