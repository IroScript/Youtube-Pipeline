"""
Unit Tests for Business Services (Phase 2 Exit Gate)
====================================================
Verifies IdeaService, PromptService, SEOService, VideoService, PackageService, AudioService.
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
from services.research.idea_service import IdeaService
from services.scripting.prompt_service import PromptService
from services.seo.seo_service import SEOService
from services.video.video_service import VideoService
from services.packaging.package_service import PackageService
from services.audio.audio_service import AudioService


def test_idea_service():
    with get_session() as session:
        service = IdeaService(session)
        cats = service.list_categories()
        assert len(cats) >= 1
        
        summary = service.get_idea_summary(1)
        assert summary is not None
        assert summary["id"] == 1
        assert summary["element_id"] == 1


def test_prompt_service():
    with get_session() as session:
        service = PromptService(session)
        status = service.get_escalation_status(1)
        assert status["idea_id"] == 1
        assert status["total_prompts"] >= 20
        assert status["has_level_10_video"] is True


def test_seo_service():
    with get_session() as session:
        service = SEOService(session)
        status = service.get_seo_status(1)
        assert status["idea_id"] == 1
        assert status["exists"] is True


def test_video_service_payload():
    with get_session() as session:
        service = VideoService(session)
        payload = service.build_render_payload(1)
        assert payload["target_duration"] == 8
        assert "full_combined_prompt" in payload
        assert len(payload["full_combined_prompt"]) > 50


def test_audio_service():
    service = AudioService(enabled=False)
    assert service.is_enabled() is False
    res = service.generate_voiceover("Hello", "out.wav")
    assert res["status"] == "disabled"

    active_service = AudioService(enabled=True)
    assert active_service.is_enabled() is True


def test_package_service():
    with get_session() as session:
        service = PackageService(session)
        manifest = service.get_package_manifest_by_idea(1)
        assert "complete" in manifest
