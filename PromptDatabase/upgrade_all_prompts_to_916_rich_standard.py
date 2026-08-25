"""
Upgrade All Prompts to 9:16 Rich 10-Level Escalation Standard
=============================================================
Iterates through all ideas in `ideas` table and ensures every single prompt
in `prompts` table is 100% compliant with the new 9:16 vertical ratio and
deep 5-layer image + second-by-second 8s 5-step HUD video prompt architecture.

!!! DESTRUCTIVE — READ BEFORE RUNNING !!!
-----------------------------------------
For every idea it deems non-compliant this script DELETES all existing prompts and
regenerates them from `build_rich_escalation_system()`, which is the HARDCODED offline
skeleton. Consequences measured on the current database:

  * 31 of 35 ideas currently hold richer prompts produced by the live LLM. Running this
    would overwrite them with the fixed template, making every video share the identical
    opening sentence and the identical "descend into a single grain" ending.
  * That is precisely the "all videos look the same / prompts have no uniqueness" problem
    the uniqueness engine exists to fix.

If your goal is prompt VARIETY, do NOT run this. Use instead:
    run_uniqueness.bat --audit
    run_uniqueness.bat --install-templates-v2 --apply

This script now requires explicit confirmation so it cannot flatten the library by
accident. Its original behaviour is unchanged once confirmed.
"""

import sys
from pathlib import Path
from sqlmodel import select

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from database.session import init_db, get_session
from database.models import Idea, Prompt
from prompt_chain_engine import build_rich_escalation_system
from database.seed_prompting_styles import seed_prompting_styles
from generate_progress_csv import run as run_csv_export


def _confirm_destructive() -> bool:
    """
    Require an explicit opt-in before mass-deleting prompts.

    Pass --yes-flatten-all-prompts to proceed non-interactively; otherwise the user is
    asked to type the confirmation phrase.
    """
    if "--yes-flatten-all-prompts" in sys.argv:
        return True

    print("=" * 74)
    print("WARNING: this will DELETE and regenerate prompts from the hardcoded skeleton.")
    print("Ideas whose prompts came from the live LLM will lose their unique text and")
    print("all videos will share the same opening and the same closing beat.")
    print("For variety instead, run:  run_uniqueness.bat --install-templates-v2 --apply")
    print("=" * 74)
    try:
        answer = input("Type 'FLATTEN' to proceed, anything else to abort: ").strip()
    except EOFError:
        print("Aborted (no interactive console).")
        return False
    if answer != "FLATTEN":
        print("Aborted — no prompts were changed.")
        return False
    return True


def upgrade_all_prompts():
    init_db()
    seed_prompting_styles()

    with get_session() as session:
        all_ideas = session.exec(select(Idea).order_by(Idea.id.asc())).all()
        print(f"Found {len(all_ideas)} ideas in SQLite database.")

        upgraded_ideas_count = 0
        total_prompts_written = 0

        for idea in all_ideas:
            # Check existing prompts
            existing_prompts = session.exec(select(Prompt).where(Prompt.idea_id == idea.id)).all()
            
            # If any prompt has Use IMAGE or is short (< 300 chars) or aspect_ratio != "9:16" or count != 20
            needs_upgrade = (
                len(existing_prompts) != 20 or
                any(p.aspect_ratio != "9:16" for p in existing_prompts) or
                any(len(p.prompt_text) < 300 for p in existing_prompts) or
                any("Use IMAGE" in p.prompt_text for p in existing_prompts if p.prompt_type == "video_prompt") or
                any("STEP 1:" not in p.prompt_text for p in existing_prompts if p.prompt_type == "video_prompt")
            )

            if needs_upgrade:
                # Delete old prompts
                for op in existing_prompts:
                    session.delete(op)
                session.commit()

                # Generate rich 10-level escalation system
                rich_levels = build_rich_escalation_system(idea.title, idea.topic or "", idea.description or idea.raw_idea or "")
                
                import uuid
                for item in rich_levels:
                    lvl = item["level"]
                    lvl_name = item["level_name"]

                    img_prompt = Prompt(
                        uuid=str(uuid.uuid4()),
                        idea_id=idea.id,
                        prompt_type="image_prompt",
                        title=f"{idea.title} - {lvl_name} (Image)",
                        prompt_text=item["image_prompt"],
                        generation_type="image",
                        aspect_ratio="9:16",
                        level=lvl,
                        level_name=lvl_name,
                        structure_type="5_layer_montage",
                        status="ready"
                    )
                    session.add(img_prompt)
                    session.commit()
                    session.refresh(img_prompt)

                    vid_prompt = Prompt(
                        uuid=str(uuid.uuid4()),
                        idea_id=idea.id,
                        prompt_type="video_prompt",
                        title=f"{idea.title} - {lvl_name} (Video 8s)",
                        prompt_text=item["video_prompt"],
                        generation_type="video",
                        aspect_ratio="9:16",
                        duration_seconds=8.0,
                        level=lvl,
                        level_name=lvl_name,
                        structure_type="8s_5_step_hud_popup",
                        reference_image_prompt_id=img_prompt.id,
                        status="ready"
                    )
                    session.add(vid_prompt)
                    session.commit()
                    session.refresh(vid_prompt)
                    total_prompts_written += 2

                upgraded_ideas_count += 1
                if upgraded_ideas_count % 10 == 0 or upgraded_ideas_count == len(all_ideas):
                    print(f"  [Progress] Upgraded {upgraded_ideas_count}/{len(all_ideas)} ideas ({total_prompts_written} prompts updated)...")

        print(f"\n[Complete] Successfully upgraded {upgraded_ideas_count} ideas in SQLite database ({total_prompts_written} prompts).")

    # Refresh CSV Exports
    print("\n[Auto-Sync] Regenerating all CSV exports and Master table...")
    run_csv_export()
    print("[Success] All SQLite tables and CSV exports are now 100% updated with 9:16 rich escalation prompts!")


if __name__ == "__main__":
    if _confirm_destructive():
        upgrade_all_prompts()
