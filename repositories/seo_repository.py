"""
SEO & Metadata Repository
=========================
Encapsulates all database operations related to YouTubeMetadata, SEORun, Keywords, and Competitors.
"""

from __future__ import annotations

import sys
import json
from pathlib import Path
from typing import Optional, List
from sqlmodel import Session, select

REPO_ROOT = Path(__file__).resolve().parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from database.models import YouTubeMetadata
from repositories.base_repository import BaseRepository


class SEORepository(BaseRepository[YouTubeMetadata]):
    def __init__(self, session: Session):
        super().__init__(YouTubeMetadata, session)

    def get_by_idea_id(self, idea_id: int) -> Optional[YouTubeMetadata]:
        """Fetch YouTubeMetadata record for a specific idea."""
        statement = select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)
        return self.session.exec(statement).first()

    def has_real_seo(self, idea_id: int) -> bool:
        """
        Determines whether the idea has genuine SEO or merely legacy fallback boilerplate.
        """
        rec = self.get_by_idea_id(idea_id)
        if not rec or not (rec.seo_description or "").strip():
            return False

        try:
            from seo_engine import validators
            tags = json.loads(rec.tags) if rec.tags else []
            return not validators.is_legacy_fallback(rec.title, rec.seo_description, tags)
        except Exception:
            # Fallback simple check if seo_engine is not yet initialized
            return len(rec.seo_description.strip()) > 100 and "INSANE:" not in rec.title

    def save_or_update_metadata(
        self,
        idea_id: int,
        title: str,
        description: str,
        tags: list[str] | str,
        element_id: Optional[int] = None,
        pinned_comment: Optional[str] = None,
        video_prompt_used: Optional[str] = None,
        image_prompt_used: Optional[str] = None,
    ) -> YouTubeMetadata:
        """Saves or updates the SEO metadata row for an idea."""
        existing = self.get_by_idea_id(idea_id)
        tag_str = json.dumps(tags, ensure_ascii=False) if isinstance(tags, list) else tags

        if not existing:
            import uuid
            rec = YouTubeMetadata(
                uuid=str(uuid.uuid4()),
                idea_id=idea_id,
                element_id=element_id,
                title=title,
                seo_description=description,
                tags=tag_str,
                category="Science & Technology",
                default_language="en",
                pinned_comment=pinned_comment,
                video_prompt_used=video_prompt_used,
                image_prompt_used=image_prompt_used,
                status="ready",
            )
            return self.create(rec)
        else:
            existing.title = title
            existing.seo_description = description
            existing.tags = tag_str
            if element_id:
                existing.element_id = element_id
            if pinned_comment:
                existing.pinned_comment = pinned_comment
            if video_prompt_used:
                existing.video_prompt_used = video_prompt_used
            if image_prompt_used:
                existing.image_prompt_used = image_prompt_used
            existing.status = "ready"
            return self.update(existing)
