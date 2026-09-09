"""
SEO Intelligence Service
========================
Provides high-CTR YouTube metadata generation, keyword research, and verification.
"""

from __future__ import annotations

import sys
import json
from pathlib import Path
from typing import Optional, Dict, Any
from sqlmodel import Session

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from repositories.seo_repository import SEORepository
from database.models import YouTubeMetadata


class SEOService:
    def __init__(self, session: Session):
        self.session = session
        self.repo = SEORepository(session)

    def get_metadata(self, idea_id: int) -> Optional[YouTubeMetadata]:
        return self.repo.get_by_idea_id(idea_id)

    def get_seo_status(self, idea_id: int) -> Dict[str, Any]:
        meta = self.get_metadata(idea_id)
        if not meta:
            return {
                "idea_id": idea_id,
                "exists": False,
                "is_real_seo": False,
                "title": None,
                "tag_count": 0,
            }
        
        is_real = self.repo.has_real_seo(idea_id)
        try:
            tags = json.loads(meta.tags) if meta.tags else []
        except Exception:
            tags = [t.strip() for t in (meta.tags or "").split(",") if t.strip()]

        return {
            "idea_id": idea_id,
            "exists": True,
            "is_real_seo": is_real,
            "title": meta.title,
            "tag_count": len(tags),
            "description_length": len(meta.seo_description) if meta.seo_description else 0,
        }

    def generate_seo(self, idea_id: int, apply: bool = True, force: bool = False, use_browser: bool = True) -> Dict[str, Any]:
        """
        Executes real SEO generation pipeline via seo_engine.
        """
        from seo_engine import pipeline as seo_pipeline
        res = seo_pipeline.run_for_idea(
            idea_id=idea_id,
            apply=apply,
            force=force,
            use_browser=use_browser
        )
        return res

    def get_full_metadata(self, idea_id: int) -> Optional[Dict[str, Any]]:
        meta = self.get_metadata(idea_id)
        if not meta:
            return None
        try:
            tags = json.loads(meta.tags) if meta.tags else []
        except Exception:
            tags = [t.strip() for t in (meta.tags or "").split(",") if t.strip()]

        return {
            "idea_id": idea_id,
            "title": meta.title,
            "seo_description": meta.seo_description,
            "tags": tags,
            "pinned_comment": getattr(meta, "pinned_comment", None),
            "status": meta.status or "completed",
            "is_real_seo": self.repo.has_real_seo(idea_id),
        }

    def harvest_suggestions(self, query: str, lang: str = "en") -> Dict[str, Any]:
        from seo_engine.harvest import youtube_suggest
        suggestions = youtube_suggest(query=query, lang=lang)
        return {
            "query": query,
            "suggestions": suggestions,
            "count": len(suggestions),
        }

    def harvest_competitors(self, query: str, limit: int = 5) -> Dict[str, Any]:
        from seo_engine.harvest import youtube_search_checked
        comps, ran = youtube_search_checked(query=query, limit=limit)
        items = [
            {
                "title": c.title,
                "channel": c.channel,
                "video_id": c.video_id,
                "url": c.url,
                "view_count": c.view_count,
            }
            for c in comps
        ]
        return {
            "query": query,
            "ran": ran,
            "competitors": items,
            "count": len(items),
        }

