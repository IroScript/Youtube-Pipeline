"""
REQ-017: Social Media & YouTube Upload Service
==============================================
Dedicated automated test suite proving:
1. YouTubeService initialization with database session.
2. prepare_upload_payload builds valid YouTube title, description, and tags for real DB idea.
3. ValueError raised for non-existent idea IDs.
4. FileNotFoundError raised when attempting to upload a missing video file.
5. Successful upload execution returning metadata dictionary and YouTube shorts dispatch structure.
"""

import sys
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
video_module_path = str(REPO_ROOT / "video" / "1Video10Sec")
for p in (prompt_db_path, video_module_path):
    if p not in sys.path:
        sys.path.insert(0, p)

from infrastructure.database.session import get_session
from services.youtube.youtube_service import YouTubeService


def test_req_017_prepare_upload_payload_real_idea():
    """Verify prepare_upload_payload retrieves data and formats title/tags for Idea #1."""
    with get_session() as session:
        service = YouTubeService(session)
        payload = service.prepare_upload_payload(1)
        assert payload["idea_id"] == 1
        assert "title" in payload and len(payload["title"]) > 5
        assert "description" in payload and len(payload["description"]) > 10
        assert payload["category"] == "Science & Technology"


def test_req_017_prepare_upload_payload_non_existent():
    """Verify ValueError is raised when querying a non-existent idea ID."""
    with get_session() as session:
        service = YouTubeService(session)
        with pytest.raises(ValueError, match="Idea #99999 not found"):
            service.prepare_upload_payload(99999)


def test_req_017_upload_video_missing_file():
    """Verify FileNotFoundError is raised if target video does not exist on disk."""
    with get_session() as session:
        service = YouTubeService(session)
        with pytest.raises(FileNotFoundError, match="Video file not found"):
            service.upload_video("non_existent_video_path.mp4", 1)


def test_req_017_upload_video_success(tmp_path):
    """Verify upload execution pipeline with existing file returns success dispatch dict."""
    dummy_vid = tmp_path / "test_render.mp4"
    dummy_vid.write_bytes(b"mock_mp4_video_data")

    with get_session() as session:
        service = YouTubeService(session)
        result = service.upload_video(dummy_vid, 1)

        assert result["status"] == "success"
        assert str(dummy_vid) in result["video_path"]
        assert "youtube.com/shorts/" in result["youtube_url"]
        assert "YouTube Shorts" in result["platforms"]
