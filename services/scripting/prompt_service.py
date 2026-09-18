"""
Prompt Escalation Service
=========================
Manages 10-level prompt escalations and generation delegates.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlmodel import Session

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from repositories.prompt_repository import PromptRepository
from repositories.idea_repository import IdeaRepository
from database.models import Prompt


class PromptService:
    def __init__(self, session: Session):
        self.session = session
        self.repo = PromptRepository(session)
        self.idea_repo = IdeaRepository(session)

    def get_prompts_for_idea(self, idea_id: int) -> List[Prompt]:
        return self.repo.get_prompts_for_idea(idea_id)

    def get_escalation_status(self, idea_id: int) -> Dict[str, Any]:
        prompts = self.repo.get_prompts_for_idea(idea_id)
        filled = self.repo.count_filled_prompts(idea_id)
        complete = self.repo.has_complete_escalation(idea_id)
        lvl10_vid = self.repo.get_level10_video_prompt(idea_id)
        return {
            "idea_id": idea_id,
            "total_prompts": len(prompts),
            "filled_prompts": filled,
            "required_prompts": 10,
            "has_level_10_video": lvl10_vid is not None,
            "is_complete": complete,
        }

    def generate_escalation(self, idea_id: int, skip_browser: bool = False) -> List[Prompt]:
        """
        Executes prompt escalation generation via existing prompt_chain_engine.
        """
        idea = self.idea_repo.get_by_id(idea_id)
        if not idea:
            raise ValueError(f"Idea #{idea_id} not found")

        from prompt_chain_engine import generate_escalation_for_idea
        saved = generate_escalation_for_idea(idea, skip_browser=skip_browser)
        return saved or []

    def get_prompt_by_level(self, idea_id: int, level: int, generation_type: str = "video") -> Optional[Prompt]:
        from sqlmodel import select
        return self.session.exec(
            select(Prompt).where(
                Prompt.idea_id == idea_id,
                Prompt.level == level,
                Prompt.generation_type == generation_type
            )
        ).first()

    def resolve_next_production_prompt(self, skip_browser: bool = False) -> Dict[str, Any]:
        """
        Executes JIT backward dependency resolution to find or create the next ready Level 10 prompt.
        """
        import prompt_chain_engine as pce
        prompt_dict = pce.get_or_create_next_production_ready_prompt(skip_browser=skip_browser)
        if not prompt_dict:
            return {"status": "none_available", "message": "No production-ready prompt could be found or generated"}
        
        idea_id = prompt_dict["idea_id"]
        lvl10_prompt = prompt_dict.get("level_10_video_prompt")
        idea = self.idea_repo.get_by_id(idea_id)
        return {
            "status": "ready",
            "idea_id": idea_id,
            "title": idea.title if idea else prompt_dict.get("idea_title", "Unknown Idea"),
            "level": getattr(lvl10_prompt, "level", 10),
            "prompt_text": getattr(lvl10_prompt, "prompt_text", ""),
        }

