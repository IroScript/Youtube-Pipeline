"""
REQ-024: SEO Optimization Endpoints (/seo)
==========================================
Dedicated automated test suite proving:
1. GET /seo/{idea_id}/status for an existing idea returns 200, status details, title, and tag counts.
2. GET /seo/{idea_id}/status for a non-existent idea returns exists=False cleanly without crash.
3. POST /seo/{idea_id}/generate endpoint invocation and exception mapping.
"""

import sys
from pathlib import Path
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_req_024_get_seo_status_existing_idea(client):
    """Verify GET /seo/1/status returns 200 and existing SEO metadata details."""
    res = client.get("/seo/1/status")
    assert res.status_code == 200
    data = res.json()
    assert data["idea_id"] == 1
    assert data["exists"] is True
    assert "is_real_seo" in data
    assert "tag_count" in data


def test_req_024_get_seo_status_non_existent_idea(client):
    """Verify GET /seo/99999/status returns 200 with exists=False."""
    res = client.get("/seo/99999/status")
    assert res.status_code == 200
    data = res.json()
    assert data["idea_id"] == 99999
    assert data["exists"] is False
    assert data["title"] is None


def test_req_024_post_seo_generate_mock(client):
    """Verify POST /seo/1/generate executes and returns generator response."""
    with patch("services.seo.seo_service.SEOService.generate_seo") as mock_gen:
        mock_gen.return_value = {
            "status": "success",
            "idea_id": 1,
            "title": "Optimized Mock Title",
            "tags": ["tag1", "tag2"],
        }
        res = client.post("/seo/1/generate?apply=true&force=true&use_browser=false")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["title"] == "Optimized Mock Title"


def test_req_024_post_seo_generate_error_handling(client):
    """Verify POST /seo/1/generate maps internal exception to HTTP 500."""
    with patch("services.seo.seo_service.SEOService.generate_seo", side_effect=RuntimeError("SEO engine crashed")):
        res = client.post("/seo/1/generate")
        assert res.status_code == 500
        assert "SEO engine crashed" in res.json()["detail"]
