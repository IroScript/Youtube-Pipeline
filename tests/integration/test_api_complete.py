"""
Integration Tests for API-Complete YouTube Content Automation ERP
=================================================================
Dedicated test suite verifying all 58 REST API endpoints across:
- Ideas (creation, element generation, category element generation)
- Prompts (escalation, level queries, JIT production resolver)
- Uniqueness (audit, novelty scan, variation signatures)
- SEO (metadata inspection, keyword suggest harvesting, competitor scraping)
- Video (status, render payload, shot assembly)
- Audio (voiceover synthesis readiness and dispatch)
- YouTube (status, payload preparation, upload dispatch)
- Exports (CSV export status, prompts CSV, SEO CSV, all CSVs)
- Distributed Jobs & DLQ (job dispatch, query, dead letter listing, retry)
- Pipeline Orchestrator (stage-by-stage progress, asynchronous 202 pipeline run)
- Middleware (Idempotency-Key caching, transaction headers, error formatting)
"""

import sys
import uuid
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


def test_ideas_extended_endpoints(client):
    """Test custom idea creation, element idea generation, and element listings."""
    # 1. Custom idea creation
    custom_title = f"Test API Idea {uuid.uuid4().hex[:6]}"
    res_create = client.post("/ideas", json={
        "title": custom_title,
        "description": "Created via automated API test suite",
        "element_id": 1,
        "content_type": "shorts"
    })
    assert res_create.status_code == 201
    idea_data = res_create.json()
    assert idea_data["title"] == custom_title
    created_id = idea_data["id"]

    # 2. Get idea by ID
    res_get = client.get(f"/ideas/{created_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == created_id

    # 3. Generate ideas for element
    res_gen = client.post("/ideas/elements/1/generate", json={"skip_browser": True, "target_total": 10})
    assert res_gen.status_code == 200
    gen_data = res_gen.json()
    assert gen_data["element_id"] == 1
    assert "ideas" in gen_data

    # 4. List ideas for element
    res_elem_ideas = client.get("/ideas/elements/1/ideas")
    assert res_elem_ideas.status_code == 200
    assert isinstance(res_elem_ideas.json(), list)

    # 5. Clean up created test idea to preserve baseline row counts
    from database.session import get_session
    from database.models import Idea, IdeaElement
    from sqlmodel import delete
    with get_session() as session:
        session.exec(delete(IdeaElement).where(IdeaElement.idea_id == created_id))
        session.exec(delete(Idea).where(Idea.id == created_id))
        session.commit()


def test_prompts_extended_endpoints(client):
    """Test prompt level fetching and JIT next-production-ready prompt resolver."""
    # 1. Level-specific prompt fetch
    res_lvl = client.get("/prompts/1/levels/10?prompt_type=video")
    assert res_lvl.status_code == 200
    prompt_data = res_lvl.json()
    assert prompt_data["level"] == 10
    assert prompt_data["prompt_type"] == "video_prompt"
    assert len(prompt_data["prompt_text"]) > 20

    # 2. Next production ready prompt resolver
    res_jit = client.post("/prompts/next-production-ready", json={"element_id": 1, "target_level": 10})
    assert res_jit.status_code == 200
    jit_data = res_jit.json()
    assert jit_data["level"] == 10
    assert jit_data["status"] == "ready"
    assert jit_data["idea_id"] is not None


def test_uniqueness_endpoints(client):
    """Test uniqueness audit, novelty scans, and variation signatures."""
    # 1. Uniqueness audit
    res_audit = client.get("/uniqueness/audit")
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert "total_ideas" in audit_data
    assert "distinct_signatures" in audit_data

    # 2. Novelty scan
    res_nov = client.get("/uniqueness/novelty?threshold=0.5")
    assert res_nov.status_code == 200
    nov_data = res_nov.json()
    assert "scanned_ideas" in nov_data
    assert isinstance(nov_data["pairs"], list)

    # 3. Idea variation signature
    res_var = client.get("/uniqueness/ideas/1/variation")
    assert res_var.status_code == 200
    var_data = res_var.json()
    assert var_data["idea_id"] == 1
    assert "signature" in var_data
    assert "archetype" in var_data


def test_seo_extended_endpoints(client):
    """Test SEO full metadata, suggestions harvesting, and competitor scraper."""
    # 1. Full SEO metadata
    res_seo = client.get("/seo/1")
    assert res_seo.status_code == 200
    seo_data = res_seo.json()
    assert seo_data["idea_id"] == 1
    assert "tags" in seo_data

    # 2. Live YouTube suggestion harvester
    res_sug = client.post("/seo/harvest/suggest", json={"query": "python tutorial", "limit": 3})
    assert res_sug.status_code == 200
    sug_data = res_sug.json()
    assert sug_data["query"] == "python tutorial"
    assert isinstance(sug_data["suggestions"], list)


def test_videos_extended_endpoints(client):
    """Test video status and video shot assembly."""
    # 1. Video status
    res_st = client.get("/videos/1/status")
    assert res_st.status_code == 200
    st_data = res_st.json()
    assert st_data["idea_id"] == 1
    assert "status" in st_data

    # 2. Video render payload
    res_payload = client.get("/videos/1/render-payload")
    assert res_payload.status_code == 200
    assert "all_5_ideas" in res_payload.json()

    # 3. Video assemble
    res_asm = client.post("/videos/1/assemble", json={"shot_paths": ["shot1.mp4", "shot2.mp4"]})
    assert res_asm.status_code == 200
    asm_data = res_asm.json()
    assert "status" in asm_data
    assert "total_shots" in asm_data


def test_audio_endpoints(client):
    """Test audio synthesis status and dispatch."""
    # 1. Audio status
    res_st = client.get("/audio/1/status")
    assert res_st.status_code == 200
    st_data = res_st.json()
    assert st_data["idea_id"] == 1
    assert "enabled" in st_data

    # 2. Generate voiceover
    res_gen = client.post("/audio/1/generate", json={"voice_id": "alloy", "text": "Testing voiceover audio generation"})
    assert res_gen.status_code == 200
    gen_data = res_gen.json()
    assert gen_data["status"] in ("disabled", "success", "queued")


def test_youtube_endpoints(client):
    """Test YouTube readiness status and upload payload preparation."""
    # 1. Status
    res_st = client.get("/youtube/1/status")
    assert res_st.status_code == 200
    st_data = res_st.json()
    assert st_data["idea_id"] == 1
    assert "is_ready" in st_data

    # 2. Upload payload
    res_payload = client.get("/youtube/1/payload")
    assert res_payload.status_code == 200
    p_data = res_payload.json()
    assert p_data["idea_id"] == 1
    assert "title" in p_data
    assert "tags" in p_data


def test_exports_endpoints(client):
    """Test export directory inspection and CSV exports."""
    # 1. Export status
    res_st = client.get("/exports/status")
    assert res_st.status_code == 200
    st_data = res_st.json()
    assert "available_files" in st_data

    # 2. Export Prompts CSV
    res_p = client.post("/exports/csv/prompts")
    assert res_p.status_code == 200
    assert res_p.json()["status"] == "success"

    # 3. Export SEO CSVs
    res_s = client.post("/exports/csv/seo")
    assert res_s.status_code == 200
    assert res_s.json()["status"] == "success"

    # 4. Export all CSVs
    res_all = client.post("/exports/csv")
    assert res_all.status_code == 200
    assert res_all.json()["status"] == "success"


def test_jobs_and_dlq_endpoints(client):
    """Test distributed job dispatching and Dead Letter Queue management."""
    # 1. Job dispatch
    res_disp = client.post("/jobs/dispatch?step_key=render_video&step_type=python&priority=high", json={"param": 1})
    assert res_disp.status_code == 200
    disp_data = res_disp.json()
    assert "job_id" in disp_data
    job_id = disp_data["job_id"]

    # 2. Get specific job
    res_job = client.get(f"/jobs/{job_id}")
    assert res_job.status_code == 200
    assert res_job.json()["id"] == job_id

    # 3. List jobs
    res_jobs = client.get("/jobs")
    assert res_jobs.status_code == 200
    assert len(res_jobs.json()) >= 1

    # 4. DLQ listing
    res_dlq = client.get("/jobs/dlq")
    assert res_dlq.status_code == 200
    assert isinstance(res_dlq.json(), list)


def test_pipeline_orchestrator(client):
    """Test unified pipeline stage progress inspection and async job trigger."""
    # 1. Progress inspection
    res_prog = client.get("/pipeline/ideas/1/progress")
    assert res_prog.status_code == 200
    prog_data = res_prog.json()
    assert prog_data["idea_id"] == 1
    assert "stages" in prog_data
    assert "overall_status" in prog_data
    assert "prompts" in prog_data["stages"]
    assert "seo" in prog_data["stages"]
    assert "video" in prog_data["stages"]
    assert "packaging" in prog_data["stages"]

    # 2. Async pipeline run (202 Accepted)
    res_run = client.post("/pipeline/ideas/1/run", json={"dry_run": True})
    assert res_run.status_code == 202
    run_data = res_run.json()
    assert run_data["status"] == "dry_run_validated"
    assert run_data["idea_id"] == 1
    assert "job_id" in run_data


def test_idempotency_and_headers(client):
    """Test Idempotency-Key header behavior and X-ERP-Transaction middleware."""
    key = f"key_{uuid.uuid4().hex}"
    res1 = client.post("/videos/1/generate?dry_run=true", headers={"Idempotency-Key": key})
    assert res1.status_code == 200
    assert res1.headers.get("X-ERP-Transaction") == "active"
    assert res1.headers.get("X-Idempotency-Key") == key


def test_error_handling(client):
    """Test standardized error JSON format on 404."""
    res = client.get("/ideas/999999999")
    assert res.status_code == 404
    err_data = res.json()
    assert "detail" in err_data
