"""
Prompt & Escalation Repository
==============================
Encapsulates all database operations related to Prompts and PromptingStyleMaster.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, List
from sqlmodel import Session, select

REPO_ROOT = Path(__file__).resolve().parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from database.models import Prompt, PromptingStyleMaster
from repositories.base_repository import BaseRepository

MIN_PROMPT_CHARS = 50
REQUIRED_PROMPTS_PER_IDEA = 20


class PromptRepository(BaseRepository[Prompt]):
    def __init__(self, session: Session):
        super().__init__(Prompt, session)

    def get_prompts_for_idea(self, idea_id: int) -> List[Prompt]:
        """Fetch all prompts associated with a specific idea, ordered by level."""
        statement = select(Prompt).where(Prompt.idea_id == idea_id).order_by(Prompt.level, Prompt.generation_type)
        return list(self.session.exec(statement).all())

    def get_level10_video_prompt(self, idea_id: int) -> Optional[Prompt]:
        """Fetch the Level 10 video prompt for rendering."""
        statement = select(Prompt).where(
            Prompt.idea_id == idea_id,
            Prompt.level == 10,
            Prompt.generation_type == "video"
        )
        return self.session.exec(statement).first()

    def get_level10_image_prompt(self, idea_id: int) -> Optional[Prompt]:
        """Fetch the Level 10 reference image prompt."""
        statement = select(Prompt).where(
            Prompt.idea_id == idea_id,
            Prompt.level == 10,
            Prompt.generation_type == "image"
        )
        return self.session.exec(statement).first()

    def count_filled_prompts(self, idea_id: int) -> int:
        """Count valid, filled prompts for an idea."""
        prompts = self.get_prompts_for_idea(idea_id)
        return sum(1 for p in prompts if p.prompt_text and len(p.prompt_text.strip()) > MIN_PROMPT_CHARS)

    def has_complete_escalation(self, idea_id: int) -> bool:
        """Predicate checking if all 20 prompts and level 10 video prompt exist."""
        lvl10_vid = self.get_level10_video_prompt(idea_id)
        if not lvl10_vid or not (lvl10_vid.prompt_text or "").strip():
            return False
        return self.count_filled_prompts(idea_id) >= REQUIRED_PROMPTS_PER_IDEA

    def get_style_template(self, stage_name: str) -> Optional[PromptingStyleMaster]:
        """Fetch prompting style instructions from master template table."""
        statement = select(PromptingStyleMaster).where(
            PromptingStyleMaster.stage_name == stage_name,
            PromptingStyleMaster.is_active == 1
        )
        return self.session.exec(statement).first()
