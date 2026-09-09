"""
Unit & Integration Test Suite for API Foundation, Execution State Machine, and Retry Engine
============================================================================================
Verifies:
1. GET /health
2. POST /prompts/generate (with idea_id and auto-resolve)
3. POST /seo/generate (with apply=True / deterministic scoring)
4. GET /videos/{id}
5. Execution Lifecycle:
   - POST /executions (create)
   - GET /executions/{id}
   - POST /executions/{id}/pause
   - POST /executions/{id}/resume
   - POST /executions/{id}/retry
6. Retry Engine (Attempt 1 fail -> wait -> Attempt 2 fail -> wait -> Attempt 3 success)
7. YouTube Adapter (credential guard, future interface)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.api.main import app
from infrastructure.database.session import get_session
from infrastructure.database.engine import init_database
from domain.workflows.execution_model import WorkflowExecution
from services.workflow.exec_state_machine import ExecutionState, ExecutionStateMachine
from services.reliability.retry_engine import RetryEngine, RetryDecision
from services.youtube.youtube_adapter import YouTubeAdapter
from database.models import Idea, Prompt, YouTubeMetadata, Category, Element


@pytest.fixture(scope="module", autouse=True)
def ensure_db():
    init_database()


@pytest.fixture
def client():
    return TestClient(app)


def test_get_health(client: TestClient):
    """Verifies GET /health endpoint connectivity and contract."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["service"] == "YouTube Content Automation ERP API"
    assert data["database_connected"] is True


def test_post_prompts_generate(client: TestClient):
    """Verifies POST /prompts/generate endpoint generates prompts via Service/Repository."""
    # Find an idea from DB
    with get_session() as session:
        idea = session.exec(select(Idea)).first()
        assert idea is not None, "At least one idea must exist in DB"
        idea_id = idea.id

    # Call POST /prompts/generate with skip_browser=True
    resp = client.post(
        "/prompts/generate",
        json={"idea_id": idea_id, "skip_browser": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["idea_id"] == idea_id
    assert data["saved_prompts_count"] == 20
    assert data["level_10_video_prompt"] is not None

    # Verify DB persistence directly
    with get_session() as session:
        prompts = session.exec(select(Prompt).where(Prompt.idea_id == idea_id)).all()
        assert len(prompts) == 20
        # Check Level 10 video prompt exists
        lvl10 = [p for p in prompts if p.level == 10 and p.generation_type == "video"]
        assert len(lvl10) == 1
        assert len(lvl10[0].prompt_text) > 20


def test_post_seo_generate(client: TestClient):
    """Verifies POST /seo/generate endpoint computes scores and persists metadata."""
    from unittest.mock import patch
    from seo_engine.harvest import HarvestResult, Competitor

    with get_session() as session:
        idea = session.exec(select(Idea)).first()
        assert idea is not None
        idea_id = idea.id
        idea_title = idea.title
        idea_topic = idea.topic or "Giant Machines"

    mock_harvest = HarvestResult(
        idea_id=idea_id,
        idea_title=idea_title,
        topic=idea_topic,
        seed_queries=["rice harvester", "giant machine"],
        keywords=["rice paddy machine", "giant harvester", "colossal harvester", "agriculture tech", "mega farming"],
        competitors=[
            Competitor(title="World's Biggest Harvester", channel="TechWorld", video_id="abc12345", url="https://youtu.be/abc12345", view_count=500000)
        ],
        competitor_search_ran=True,
        keyword_search_ran=True,
    )

    with patch("seo_engine.pipeline.harvest_for_idea", return_value=mock_harvest):
        resp = client.post(
            "/seo/generate",
            json={"idea_id": idea_id, "apply": True, "force": True, "use_browser": False},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["idea_id"] == idea_id
    assert data["title"] is not None
    assert data["tags_count"] > 0
    assert "scores" in data
    assert data["scores"]["opportunity"] is not None


def test_get_video_by_id(client: TestClient):
    """Verifies GET /videos/{id} returns video record or 404 cleanly."""
    resp = client.get("/videos/1")
    # Idea #1 may or may not have rendered video yet
    assert resp.status_code in (200, 404)
    if resp.status_code == 200:
        data = resp.json()
        assert "idea_id" in data
        assert "status" in data


def test_execution_lifecycle_api(client: TestClient):
    """
    Verifies full execution lifecycle via API:
    POST /executions -> GET /executions/{id} -> POST /pause -> POST /resume -> POST /retry
    """
    # 1. Create execution
    create_resp = client.post(
        "/executions",
        json={"idea_id": 1, "max_attempts": 3, "context_data": {"test_key": "initial_value"}},
    )
    assert create_resp.status_code == 200
    exec_data = create_resp.json()
    exec_id = exec_data["id"]
    assert exec_data["status"] == "CREATED"
    assert exec_data["attempt_count"] == 0
    assert exec_data["max_attempts"] == 3

    # 2. Get execution
    get_resp = client.get(f"/executions/{exec_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == exec_id

    # 3. Transition to RUNNING first via state machine in service/repo
    with get_session() as session:
        from repositories.execution_repository import ExecutionRepository
        repo = ExecutionRepository(session)
        repo.update_status(exec_id, ExecutionState.RUNNING)

    # 4. Pause execution
    pause_resp = client.post(f"/executions/{exec_id}/pause")
    assert pause_resp.status_code == 200
    assert pause_resp.json()["new_status"] == "PAUSED"

    # 5. Resume execution
    resume_resp = client.post(f"/executions/{exec_id}/resume")
    assert resume_resp.status_code == 200
    assert resume_resp.json()["new_status"] == "RUNNING"

    # 6. Retry execution
    retry_resp = client.post(f"/executions/{exec_id}/retry")
    assert retry_resp.status_code == 200
    assert retry_resp.json()["new_status"] == "RUNNING"


def test_retry_engine_attempt_loop():
    """
    Verifies Retry Engine behavior:
    Attempt 1 (fail) -> wait backoff -> Attempt 2 (fail) -> wait backoff -> Attempt 3 (success).
    """
    with get_session() as session:
        from repositories.execution_repository import ExecutionRepository
        repo = ExecutionRepository(session)
        exec_rec = repo.create_execution(idea_id=1, max_attempts=3)
        exec_id = exec_rec.id

    attempts_log = []

    def faulty_operation():
        current_attempt = len(attempts_log) + 1
        attempts_log.append(current_attempt)
        if current_attempt < 3:
            raise ConnectionResetError(f"Simulated transient error on attempt {current_attempt}")
        return {"status": "success", "resolved_on_attempt": current_attempt}

    sleep_records = []

    def mock_sleep(seconds: float):
        sleep_records.append(seconds)

    with get_session() as session:
        result = RetryEngine.execute_with_retry(
            operation=faulty_operation,
            execution_id=exec_id,
            session=session,
            initial_delay=0.1,
            factor=2.0,
            sleep_fn=mock_sleep,
        )

    # Verify 3 attempts occurred
    assert attempts_log == [1, 2, 3]
    # Verify backoff delays were calculated and executed
    assert len(sleep_records) == 2  # slept after attempt 1 and attempt 2
    assert sleep_records[0] > 0
    assert result["status"] == "success"
    assert result["resolved_on_attempt"] == 3

    # Verify final persisted state in DB
    with get_session() as session:
        from repositories.execution_repository import ExecutionRepository
        repo = ExecutionRepository(session)
        final_exec = repo.get_by_id(exec_id)
        assert final_exec is not None
        assert final_exec.status == "SUCCESS"
        assert final_exec.attempt_count == 2  # 2 recorded failures before success
        assert final_exec.completed_at is not None


def test_retry_engine_exhaustion_permanent_failure():
    """Verifies that an operation failing beyond max_attempts marks execution as FAILED."""
    with get_session() as session:
        from repositories.execution_repository import ExecutionRepository
        repo = ExecutionRepository(session)
        exec_rec = repo.create_execution(idea_id=1, max_attempts=3)
        exec_id = exec_rec.id

    def always_fails():
        raise TimeoutError("Network unreachable")

    with pytest.raises(TimeoutError):
        with get_session() as session:
            RetryEngine.execute_with_retry(
                operation=always_fails,
                execution_id=exec_id,
                session=session,
                initial_delay=0.001,
                sleep_fn=lambda s: None,
            )

    with get_session() as session:
        from repositories.execution_repository import ExecutionRepository
        repo = ExecutionRepository(session)
        final_exec = repo.get_by_id(exec_id)
        assert final_exec is not None
        assert final_exec.status == "FAILED"
        assert final_exec.attempt_count == 3
        assert "Network unreachable" in final_exec.error_message


def test_youtube_adapter():
    """Verifies YouTube Adapter credential checks, error guidance, and interface."""
    # Without credentials in env
    adapter = YouTubeAdapter(client_id="", client_secret="", refresh_token="")
    assert adapter.has_credentials() is False
    auth = adapter.authenticate()
    assert auth["authenticated"] is False
    assert auth["status"] == "CREDENTIALS_REQUIRED"
    assert "YOUTUBE_CLIENT_ID" in auth["message"]

    # Upload attempt blocked
    upload_res = adapter.upload_video("dummy.mp4", {"title": "Test"})
    assert upload_res["status"] == "BLOCKED_EXTERNAL_DEPENDENCY"

    # With simulated credentials
    auth_adapter = YouTubeAdapter(
        client_id="test_client_id_12345",
        client_secret="test_secret_abc",
        refresh_token="test_refresh_token_xyz",
    )
    assert auth_adapter.has_credentials() is True
    assert auth_adapter.authenticate()["authenticated"] is True
    status_res = auth_adapter.check_status("job_999")
    assert status_res["upload_status"] == "PROCESSED"
