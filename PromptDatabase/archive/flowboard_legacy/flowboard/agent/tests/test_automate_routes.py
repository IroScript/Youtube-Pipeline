"""Tests for the /api/automate async job routes."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from flowboard.main import app
from flowboard.routes.automate import _JOB_STORE, _update_job_status


@pytest.fixture
def client():
    return TestClient(app)


def test_submit_async_and_status_routes(client):
    """Test submit-async returns a job_id and status endpoint retrieves job status."""
    payload = {
        "image_prompt": "A futuristic city in space",
        "video_prompt": "Cinematic slow dolly forward",
        "name": "test_async_job",
    }
    resp = client.post("/api/automate/submit-async", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "job_id" in data
    assert data["status"] == "running"

    job_id = data["job_id"]
    st_resp = client.get(f"/api/automate/status/{job_id}")
    assert st_resp.status_code == 200, st_resp.text
    st_data = st_resp.json()
    assert st_data["job_id"] == job_id
    assert st_data["status"] in ("running", "completed", "failed")
    assert "progress_pct" in st_data


def test_status_404_for_unknown_job(client):
    """Test status route returns 404 for nonexistent job_id."""
    resp = client.get("/api/automate/status/nonexistent_job_12345")
    assert resp.status_code == 404
