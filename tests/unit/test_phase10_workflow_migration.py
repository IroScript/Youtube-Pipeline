"""
Unit Tests for Phase 10: Dynamic Workflow Evolution & Execution Migration (REQ-077 to REQ-083)
==============================================================================================
Tests:
- REQ-077: Dynamic Workflow Builder API endpoints (create, draft, steps update)
- REQ-078: ImmutableVersionPublisher DAG validation, hashing & immutability locking
- REQ-079: ExecutionCompatibilityValidator step categorization (reusable, modified, added, removed)
- REQ-080: ExecutionMigrationEngine checkpoint preservation & selective re-execution
- REQ-081: StepOutputCache hash-addressed output reuse & invalidation
- REQ-082: GraphMutator dynamic step insertion & bypass routing
- REQ-083: WorkflowRollbackEngine reversion to prior version & checkpoint restoration
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.routers.workflow_builder import router as builder_router
from services.workflow.publisher import ImmutableVersionPublisher
from services.workflow.compatibility import ExecutionCompatibilityValidator
from services.workflow.migration_engine import ExecutionMigrationEngine
from services.workflow.output_cache import StepOutputCache
from services.workflow.graph_mutator import GraphMutator
from services.workflow.rollback_engine import WorkflowRollbackEngine


# --- REQ-077: Workflow Builder API ---
def test_req_077_workflow_builder_api():
    client = TestClient(app)
    # Register router if not already registered
    if not any(r.path.startswith("/workflows") for r in app.routes):
        app.include_router(builder_router)

    # 1. Create workflow
    res_wf = client.post("/workflows", json={"name": "test_builder_wf", "content_type": "shorts"})
    assert res_wf.status_code == 201
    wf_data = res_wf.json()
    wf_id = wf_data["id"]

    # 2. Create draft version
    res_draft = client.post(
        f"/workflows/{wf_id}/versions/draft",
        json={"steps": [{"step_key": "step1", "depends_on": []}], "changelog": "Initial draft"}
    )
    assert res_draft.status_code == 201
    draft_data = res_draft.json()
    ver_id = draft_data["id"]
    assert draft_data["status"] == "draft"

    # 3. Update draft steps
    res_update = client.put(
        f"/workflows/versions/{ver_id}/steps",
        json={"steps": [{"step_key": "step1", "depends_on": []}, {"step_key": "step2", "depends_on": ["step1"]}]}
    )
    assert res_update.status_code == 200
    assert len(res_update.json()["definition"]["steps"]) == 2


# --- REQ-078: Immutable Version Publisher ---
def test_req_078_immutable_publisher():
    version_data = {
        "status": "draft",
        "definition": {
            "steps": [
                {"step_key": "research", "depends_on": []},
                {"step_key": "script", "depends_on": ["research"]}
            ]
        }
    }
    published = ImmutableVersionPublisher.publish_version(version_data)
    assert published["status"] == "published"
    assert "definition_hash" in published
    assert len(published["definition_hash"]) == 64
    assert published["published_at"] is not None

    # Attempting to publish again raises error
    with pytest.raises(ValueError, match="already published"):
        ImmutableVersionPublisher.publish_version(published)


# --- REQ-079: Compatibility Validator ---
def test_req_079_compatibility_validator():
    src_steps = [
        {"step_key": "research", "step_type": "llm", "config": {"model": "v1"}, "depends_on": []},
        {"step_key": "script", "step_type": "llm", "config": {"model": "v1"}, "depends_on": ["research"]},
        {"step_key": "legacy_audio", "step_type": "audio", "config": {}, "depends_on": ["script"]},
    ]
    tgt_steps = [
        {"step_key": "research", "step_type": "llm", "config": {"model": "v1"}, "depends_on": []}, # Reusable
        {"step_key": "script", "step_type": "llm", "config": {"model": "v2"}, "depends_on": ["research"]}, # Modified config
        {"step_key": "fact_check", "step_type": "python", "config": {}, "depends_on": ["script"]}, # Added
    ]
    diff = ExecutionCompatibilityValidator.compare_versions(src_steps, tgt_steps)

    assert diff.reusable_step_keys == ["research"]
    assert diff.modified_step_keys == ["script"]
    assert diff.added_step_keys == ["fact_check"]
    assert diff.removed_step_keys == ["legacy_audio"]


# --- REQ-080: Execution Migration Engine ---
def test_req_080_migration_engine():
    execution = {
        "id": "exec_100",
        "workflow_version_id": "ver_v1",
        "status": "RUNNING",
        "context_data": {"idea_id": 42}
    }
    src_steps = [
        {"step_key": "research", "step_type": "llm", "config": {"m": 1}, "depends_on": []},
        {"step_key": "script", "step_type": "llm", "config": {"m": 1}, "depends_on": ["research"]},
    ]
    tgt_steps = [
        {"step_key": "research", "step_type": "llm", "config": {"m": 1}, "depends_on": []}, # same
        {"step_key": "script", "step_type": "llm", "config": {"m": 2}, "depends_on": ["research"]}, # modified
        {"step_key": "seo", "step_type": "llm", "config": {}, "depends_on": ["script"]}, # new
    ]
    completed_runs = {
        "research": {"status": "SUCCESS", "output_data": {"angle": "Quantum Physics"}}
    }

    result = ExecutionMigrationEngine.migrate_execution(
        execution, src_steps, tgt_steps, "ver_v2", completed_runs
    )
    assert result["status"] == "COMPLETED"
    assert result["target_version_id"] == "ver_v2"
    assert result["reused_step_keys"] == ["research"]
    assert "script" in result["rerun_step_keys"]
    assert "seo" in result["added_step_keys"]
    assert execution["context_data"]["outputs"]["research"]["angle"] == "Quantum Physics"


# --- REQ-081: Step Output Cache ---
def test_req_081_output_cache():
    cache = StepOutputCache()
    assert cache.can_reuse("script", "in_1", "cfg_1") is False

    cache.store("script", "in_1", "cfg_1", {"script_body": "Hello world"})
    assert cache.can_reuse("script", "in_1", "cfg_1") is True
    assert cache.get("script", "in_1", "cfg_1")["script_body"] == "Hello world"

    # Changed config hash
    assert cache.can_reuse("script", "in_1", "cfg_2") is False


# --- REQ-082: Graph Mutator ---
def test_req_082_graph_mutator():
    steps = [
        {"step_key": "research", "depends_on": []},
        {"step_key": "script", "depends_on": ["research"]},
        {"step_key": "video", "depends_on": ["script"]},
    ]
    # 1. Insert step after script
    new_step = {"step_key": "fact_check"}
    mutated = GraphMutator.insert_step_after(steps, "script", new_step)
    video_step = next(s for s in mutated if s["step_key"] == "video")
    fact_step = next(s for s in mutated if s["step_key"] == "fact_check")
    assert fact_step["depends_on"] == ["script"]
    assert video_step["depends_on"] == ["fact_check"]

    # 2. Bypass script
    bypassed = GraphMutator.bypass_step(steps, "script")
    video_bypassed = next(s for s in bypassed if s["step_key"] == "video")
    script_bypassed = next(s for s in bypassed if s["step_key"] == "script")
    assert script_bypassed["enabled"] is False
    assert video_bypassed["depends_on"] == ["research"]


# --- REQ-083: Rollback Engine ---
def test_req_083_rollback_engine():
    execution = {
        "id": "exec_500",
        "workflow_version_id": "ver_v2",
        "status": "FAILED",
        "context_data": {"corrupted": True}
    }
    checkpoint = {
        "context_snapshot": {"restored": True, "idea_id": 42}
    }
    result = WorkflowRollbackEngine.rollback_execution(
        execution, "ver_v1", checkpoint, reason="V2 pipeline crashed in fact-check stage"
    )
    assert result["status"] == "ROLLED_BACK"
    assert result["rolled_back_to_version"] == "ver_v1"
    assert execution["workflow_version_id"] == "ver_v1"
    assert execution["context_data"]["restored"] is True
