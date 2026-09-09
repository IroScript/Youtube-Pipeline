"""
Video Render & Generation Service
=================================
Manages Veo video render requests, Extension Bridge dispatch, and video asset registration.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, Dict, Any
from sqlmodel import Session

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
video_module_path = str(REPO_ROOT / "video" / "1Video10Sec")
for p in (prompt_db_path, video_module_path):
    if p not in sys.path:
        sys.path.insert(0, p)

from repositories.video_repository import VideoRepository
from repositories.idea_repository import IdeaRepository
from repositories.prompt_repository import PromptRepository
from database.models import GeneratedVideo


class VideoService:
    def __init__(self, session: Session):
        self.session = session
        self.repo = VideoRepository(session)
        self.idea_repo = IdeaRepository(session)
        self.prompt_repo = PromptRepository(session)

    def get_video_record(self, idea_id: int) -> Optional[GeneratedVideo]:
        rec = self.repo.get_by_idea_id(idea_id)
        if not rec:
            rec = self.repo.get_by_id(idea_id)
        return rec

    def build_render_payload(self, idea_id: int) -> Dict[str, Any]:
        """
        Builds the prompt payload that ExtensionVideoBridge expects for a specific idea.
        """
        idea = self.idea_repo.get_by_id(idea_id)
        if not idea:
            raise ValueError(f"Idea #{idea_id} not found")

        vid_prompt = self.prompt_repo.get_level10_video_prompt(idea_id)
        if not vid_prompt or not (vid_prompt.prompt_text or "").strip():
            raise ValueError(f"Idea #{idea_id} has no usable Level 10 video prompt")

        text = vid_prompt.prompt_text
        for i in range(1, 11):
            for form in (f"{i:02d}", str(i)):
                text = text.replace(f"Use IMAGE {form} as the first frame and reference image. ", "")
                text = text.replace(f"Use IMAGE {form} as the first frame and reference image.", "")
        text = " ".join(text.split()).strip()

        topic = idea.topic or "Paddy Titan Machine"
        lvl_name = vid_prompt.level_name or "ALIEN LEVEL / MAXIMUM"
        selected = {
            "id": idea.id,
            "title": idea.title,
            "concept": f"Level 10 ({lvl_name}) Impossible Colossal Machine with 5-Step HUD Popups",
            "level": 10,
            "level_name": lvl_name,
            "style": "Alien Level Maximum Escalation",
        }
        return {
            "category": f"Element {topic} - Level 10",
            "all_5_ideas": [selected],
            "selected_idea_number": 1,
            "selected_idea": selected,
            "target_duration": 8,
            "duration": "8s",
            "aspect_ratio": "9:16",
            "model": "Veo 3.1 Lower Priority",
            "full_combined_prompt": text,
        }

    def register_rendered_video(self, idea_id: int, mp4_path: Path | str) -> GeneratedVideo:
        idea = self.idea_repo.get_by_id(idea_id)
        title = idea.title if idea else Path(mp4_path).stem
        return self.repo.register_or_update_video(idea_id, title, mp4_path)

    def trigger_render(self, idea_id: int) -> Optional[str]:
        """
        Dispatches video generation request to the ExtensionVideoBridge.
        """
        payload = self.build_render_payload(idea_id)
        from extension_bridge import ExtensionVideoBridge
        cfg = REPO_ROOT / "video" / "1Video10Sec" / "config.json"
        bridge = ExtensionVideoBridge(config_path=str(cfg))
        out_mp4 = bridge.generate_single_video(payload)
        if out_mp4 and Path(out_mp4).exists():
            self.register_rendered_video(idea_id, Path(out_mp4))
            return str(out_mp4)
        return None
