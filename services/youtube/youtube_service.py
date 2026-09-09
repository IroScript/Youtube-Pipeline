"""
Social Media & YouTube Upload Service
=====================================
Handles uploading finished video packages to YouTube Shorts and Social channels.
"""

from __future__ import annotations

import sys
import json
from pathlib import Path
from typing import Optional, Dict, Any
from sqlmodel import Session

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
video_module_path = str(REPO_ROOT / "video" / "1Video10Sec")
for p in (prompt_db_path, video_module_path):
    if p not in sys.path:
        sys.path.insert(0, p)

from repositories.idea_repository import IdeaRepository
from repositories.seo_repository import SEORepository


class YouTubeService:
    def __init__(self, session: Session):
        self.session = session
        self.idea_repo = IdeaRepository(session)
        self.seo_repo = SEORepository(session)

    def prepare_upload_payload(self, idea_id: int) -> Dict[str, Any]:
        idea = self.idea_repo.get_by_id(idea_id)
        if not idea:
            raise ValueError(f"Idea #{idea_id} not found")

        seo = self.seo_repo.get_by_id_id(idea_id) if hasattr(self.seo_repo, "get_by_id_id") else self.seo_repo.get_by_idea_id(idea_id)
        title = seo.title if seo else f"{idea.title} | 10-Sec AI Visual #Shorts"
        description = seo.seo_description if seo else f"Category: {idea.category}\nConcept: {idea.title}"

        return {
            "idea_id": idea_id,
            "title": title,
            "description": description,
            "tags": seo.tags if seo else "[]",
            "category": "Science & Technology",
        }

    def upload_video(self, video_path: str | Path, idea_id: int) -> Dict[str, Any]:
        """
        Delegates to social_uploader module.
        """
        from social_uploader import SocialMediaUploader
        payload = self.prepare_upload_payload(idea_id)
        uploader = SocialMediaUploader()
        prompt_info = {
            "selected_idea": {"title": payload["title"], "concept": payload["description"]},
            "category": "Impossible Machines",
        }
        return uploader.upload_video(str(video_path), prompt_info)
