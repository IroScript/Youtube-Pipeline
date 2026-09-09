"""
Unit Tests for Database Repositories (Phase 1 Exit Gate)
========================================================
Verifies BaseRepository, IdeaRepository, PromptRepository, VideoRepository, SEORepository,
and AssetRepository against SQLite database.
"""

import sys
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from infrastructure.database.session import get_session
from repositories.idea_repository import IdeaRepository
from repositories.prompt_repository import PromptRepository
from repositories.video_repository import VideoRepository
from repositories.seo_repository import SEORepository
from repositories.asset_repository import AssetRepository


def test_idea_repository_queries():
    with get_session() as session:
        repo = IdeaRepository(session)
        categories = repo.get_all_categories()
        assert len(categories) >= 1, "At least 1 category should exist"
        
        elements = repo.get_all_elements(limit=10)
        assert len(elements) == 10, "Should fetch 10 elements"
        
        idea_ids = repo.get_all_idea_ids()
        assert len(idea_ids) >= 132, "Should have at least 132 ideas"
        
        # Test specific idea #1
        idea1 = repo.get_by_id(1)
        assert idea1 is not None
        assert idea1.id == 1
        assert len(idea1.title) > 0

        # Linked element test
        elem = repo.get_linked_element(1)
        assert elem is not None
        assert elem.id == 1


def test_prompt_repository_queries():
    with get_session() as session:
        repo = PromptRepository(session)
        prompts = repo.get_prompts_for_idea(1)
        assert len(prompts) >= 20, "Idea #1 should have at least 20 prompts"
        
        # Level 10 video prompt
        lvl10_vid = repo.get_level10_video_prompt(1)
        assert lvl10_vid is not None
        assert lvl10_vid.level == 10
        assert lvl10_vid.generation_type == "video"
        assert len(lvl10_vid.prompt_text) > 50

        # Escalation predicate
        assert repo.has_complete_escalation(1) is True


def test_video_repository_queries():
    with get_session() as session:
        repo = VideoRepository(session)
        completed = repo.get_completed_videos()
        assert len(completed) >= 1, "Should have completed video records"
        
        # Video for idea #1
        v1 = repo.get_by_idea_id(1)
        assert v1 is not None
        assert v1.status == "completed"


def test_seo_repository_queries():
    with get_session() as session:
        repo = SEORepository(session)
        # Idea #1 has SEO
        meta1 = repo.get_by_idea_id(1)
        assert meta1 is not None
        assert len(meta1.title) > 0


def test_asset_repository():
    repo = AssetRepository()
    folder_name = repo.compute_package_folder_name(1, 1, "Rice Titan Harvester")
    assert "1.1.Level_10_Rice_Titan_Harvester" in folder_name
