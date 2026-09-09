"""
Integration Tests for FastAPI Core (Phase 3 Exit Gate)
======================================================
Tests /health, /ideas/categories, /ideas/elements, /prompts/1, /videos/1, /packages/1 endpoints.
"""

import sys
from pathlib import Path
import pytest
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


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "YouTube Content Automation ERP API"
    assert "version" in data


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["database_connected"] is True


def test_categories_endpoint(client):
    response = client.get("/ideas/categories")
    assert response.status_code == 200
    cats = response.json()
    assert len(cats) >= 1
    assert "name" in cats[0]


def test_elements_endpoint(client):
    response = client.get("/ideas/elements?limit=5")
    assert response.status_code == 200
    elems = response.json()
    assert len(elems) == 5


def test_prompts_endpoint(client):
    response = client.get("/prompts/1")
    assert response.status_code == 200
    prompts = response.json()
    assert len(prompts) >= 20


def test_prompts_status_endpoint(client):
    response = client.get("/prompts/1/status")
    assert response.status_code == 200
    status = response.json()
    assert status["idea_id"] == 1
    assert status["is_complete"] is True


def test_video_endpoint(client):
    response = client.get("/videos/1")
    assert response.status_code == 200
    data = response.json()
    assert data["idea_id"] == 1
    assert data["status"] == "completed"


def test_package_endpoint(client):
    response = client.get("/packages/1")
    assert response.status_code == 200
    data = response.json()
    assert data["idea_id"] == 1
    assert "complete" in data


def test_gates_endpoints(client):
    res_sum = client.get("/ideas/gates/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert sum_data["total_ideas"] >= 132
    assert "counts" in sum_data

    res_gate = client.get("/ideas/1/gates")
    assert res_gate.status_code == 200
    gate_data = res_gate.json()
    assert gate_data["idea_id"] == 1
    assert "stages" in gate_data


def test_video_generate_endpoint_dry_run(client):
    res = client.post("/videos/1/generate?dry_run=true")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "dry_run_validated"
    assert data["idea_id"] == 1
    assert data["prompt_length"] > 50


def test_prompts_fillup_endpoint_dry_run(client):
    res = client.post("/prompts/1/fillup?dry_run=true")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "dry_run"
    assert data["idea_id"] == 1
    assert data["escalation_complete"] is True
