"""
REQ-019: FastAPI Core Application & Lifespan Hooks
==================================================
Dedicated automated test suite proving:
1. FastAPI app instance configuration and metadata.
2. Lifespan context manager startup hook execution (init_database invocation).
3. Lifespan context manager graceful exit.
4. Router mounting verification across all core domains (health, ideas, prompts, seo, videos, packages, workflows).
5. Root info endpoint execution.
"""

import sys
from pathlib import Path
import pytest
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.api.main import app, lifespan


@pytest.mark.asyncio
async def test_req_019_lifespan_execution():
    """Verify lifespan context manager triggers init_database on startup and cleanly exits."""
    with patch("apps.api.main.init_database") as mock_init:
        dummy_app = FastAPI()
        async with lifespan(dummy_app):
            mock_init.assert_called_once()


def test_req_019_routers_mounted():
    """Verify all domain routers are registered on the application."""
    routes = [r.path for r in app.routes]
    
    assert "/" in routes
    assert "/health" in routes
    assert "/ideas/categories" in routes
    assert "/prompts/{idea_id}" in routes
    assert "/seo/{idea_id}/status" in routes
    assert "/videos/{idea_id}" in routes
    assert "/packages/{idea_id}" in routes
    assert "/workflows" in routes


def test_req_019_root_endpoint_payload():
    """Verify root endpoint returns API contract metadata."""
    with TestClient(app) as client:
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["service"] == "YouTube Content Automation ERP API"
        assert data["version"] == "1.0.0"
        assert data["docs_url"] == "/docs"
        assert data["health_url"] == "/health"
