"""
Unit Tests for Phase 6: Durable Workflow Data Model (REQ-043 to REQ-051)
=========================================================================
Tests:
- REQ-043: Workflow model definition & defaults
- REQ-044: Immutable WorkflowVersion model & hash integrity
- REQ-045: WorkflowStep model & DAG dependency mapping
- REQ-046: WorkflowExecution model & execution states
- REQ-047: StepRun model & status progression
- REQ-048: StepAttempt model & error classification
- REQ-049: Job lease model & queue prioritization
- REQ-050: ExecutionEvent model & append-only journal
- REQ-051: WorkflowMigration model & version transition tracking
"""

import hashlib
import json
import pytest
from datetime import datetime, timezone, timedelta
from sqlmodel import SQLModel, create_engine, Session, select

from domain.workflows.models import Workflow
from domain.workflows.version_model import WorkflowVersion
from domain.workflows.dag_model import WorkflowStep
from domain.workflows.execution_model import WorkflowExecution
from domain.workflows.step_run_model import StepRun
from domain.workflows.attempt_model import StepAttempt
from domain.workflows.job_model import Job
from domain.workflows.event_model import ExecutionEvent
from domain.workflows.migration_model import WorkflowMigration


@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_req_043_workflow_definition(db_session: Session):
    wf = Workflow(
        name="test_shorts_automation",
        description="Automated YouTube Shorts generation pipeline",
        content_type="shorts",
        channel_id="UC_test_123"
    )
    db_session.add(wf)
    db_session.commit()
    db_session.refresh(wf)

    assert wf.id is not None
    assert len(wf.id) == 36  # UUID length
    assert wf.name == "test_shorts_automation"
    assert wf.is_active is True
    assert wf.content_type == "shorts"


def test_req_044_immutable_workflow_version(db_session: Session):
    wf = Workflow(name="wf_versioning_test")
    db_session.add(wf)
    db_session.commit()

    definition_payload = {
        "steps": [
            {"key": "research", "type": "llm"},
            {"key": "script", "type": "llm"},
            {"key": "video", "type": "browser"}
        ]
    }
    def_hash = hashlib.sha256(json.dumps(definition_payload, sort_keys=True).encode("utf-8")).hexdigest()

    version = WorkflowVersion(
        workflow_id=wf.id,
        version_number=1,
        status="published",
        definition=definition_payload,
        definition_hash=def_hash,
        published_at=datetime.now(timezone.utc)
    )
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    assert version.id is not None
    assert version.workflow_id == wf.id
    assert version.version_number == 1
    assert version.status == "published"
    assert version.definition["steps"][0]["key"] == "research"
    assert version.definition_hash == def_hash


def test_req_045_workflow_step_dag(db_session: Session):
    wf = Workflow(name="wf_dag_test")
    db_session.add(wf)
    db_session.commit()

    version = WorkflowVersion(workflow_id=wf.id, version_number=1, status="published", definition={})
    db_session.add(version)
    db_session.commit()

    step_research = WorkflowStep(
        workflow_version_id=version.id,
        step_key="research",
        step_type="llm",
        display_name="Topic Research",
        position=1,
        config={"model": "gemini-2.5"},
        depends_on=[]
    )
    step_video = WorkflowStep(
        workflow_version_id=version.id,
        step_key="video",
        step_type="browser",
        display_name="Veo Video Render",
        position=2,
        config={"aspect_ratio": "9:16"},
        depends_on=["research"],
        condition={"field": "content.video_required", "equals": True}
    )
    db_session.add(step_research)
    db_session.add(step_video)
    db_session.commit()

    steps = db_session.exec(select(WorkflowStep).where(WorkflowStep.workflow_version_id == version.id)).all()
    assert len(steps) == 2
    step_map = {s.step_key: s for s in steps}
    assert step_map["video"].depends_on == ["research"]
    assert step_map["video"].condition["equals"] is True
    assert step_map["research"].retry_policy["max_attempts"] == 3


def test_req_046_workflow_execution_state(db_session: Session):
    wf = Workflow(name="wf_exec_test")
    db_session.add(wf)
    db_session.commit()

    version = WorkflowVersion(workflow_id=wf.id, version_number=1, status="published", definition={})
    db_session.add(version)
    db_session.commit()

    exec_inst = WorkflowExecution(
        workflow_version_id=version.id,
        idea_id=10,
        video_id=20,
        status="RUNNING",
        idempotency_key="idemp_10_20_v1",
        context_data={"topic": "Black Hole Physics"}
    )
    db_session.add(exec_inst)
    db_session.commit()
    db_session.refresh(exec_inst)

    assert exec_inst.id is not None
    assert exec_inst.status == "RUNNING"
    assert exec_inst.context_data["topic"] == "Black Hole Physics"
    assert exec_inst.idempotency_key == "idemp_10_20_v1"


def test_req_047_step_run_model(db_session: Session):
    wf = Workflow(name="wf_step_run_test")
    db_session.add(wf)
    db_session.commit()

    version = WorkflowVersion(workflow_id=wf.id, version_number=1, status="published", definition={})
    db_session.add(version)
    db_session.commit()

    execution = WorkflowExecution(workflow_version_id=version.id, status="RUNNING")
    db_session.add(execution)
    db_session.commit()

    srun = StepRun(
        execution_id=execution.id,
        step_key="script",
        step_type="llm",
        status="SUCCESS",
        input_data={"theme": "Dark Matter"},
        output_data={"script_text": "In deep space..."},
        input_hash="hash_in_123",
        output_hash="hash_out_456",
        attempt_count=1
    )
    db_session.add(srun)
    db_session.commit()
    db_session.refresh(srun)

    assert srun.id is not None
    assert srun.status == "SUCCESS"
    assert srun.input_hash == "hash_in_123"
    assert srun.output_data["script_text"] == "In deep space..."


def test_req_048_step_attempt_history(db_session: Session):
    wf = Workflow(name="wf_attempt_test")
    db_session.add(wf)
    db_session.commit()

    version = WorkflowVersion(workflow_id=wf.id, version_number=1, status="published", definition={})
    db_session.add(version)
    db_session.commit()

    execution = WorkflowExecution(workflow_version_id=version.id, status="RUNNING")
    db_session.add(execution)
    db_session.commit()

    srun = StepRun(execution_id=execution.id, step_key="video", step_type="browser", status="RETRY_WAIT")
    db_session.add(srun)
    db_session.commit()

    attempt1 = StepAttempt(
        step_run_id=srun.id,
        attempt_number=1,
        worker_id="browser_worker_01",
        status="FAILED",
        error_class="BROWSER_CRASH",
        error_message="Chrome process abruptly terminated",
        execution_metadata={"ram_mb": 4096}
    )
    db_session.add(attempt1)
    db_session.commit()
    db_session.refresh(attempt1)

    assert attempt1.id is not None
    assert attempt1.attempt_number == 1
    assert attempt1.status == "FAILED"
    assert attempt1.error_class == "BROWSER_CRASH"


def test_req_049_distributed_job_leases(db_session: Session):
    wf = Workflow(name="wf_job_test")
    db_session.add(wf)
    db_session.commit()

    version = WorkflowVersion(workflow_id=wf.id, version_number=1, status="published", definition={})
    db_session.add(version)
    db_session.commit()

    execution = WorkflowExecution(workflow_version_id=version.id, status="RUNNING")
    db_session.add(execution)
    db_session.commit()

    srun = StepRun(execution_id=execution.id, step_key="youtube", step_type="youtube", status="READY")
    db_session.add(srun)
    db_session.commit()

    lease_expiry = datetime.now(timezone.utc) + timedelta(seconds=60)
    job = Job(
        step_run_id=srun.id,
        queue_name="queue.youtube",
        priority=100,
        status="LEASED",
        worker_id="youtube_worker_main",
        lease_until=lease_expiry,
        payload={"file_path": "C:/video.mp4"}
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)

    assert job.id is not None
    assert job.queue_name == "queue.youtube"
    assert job.priority == 100
    assert job.worker_id == "youtube_worker_main"
    lease_time = job.lease_until if job.lease_until.tzinfo else job.lease_until.replace(tzinfo=timezone.utc)
    assert lease_time > datetime.now(timezone.utc)


def test_req_050_execution_event_journal(db_session: Session):
    wf = Workflow(name="wf_event_test")
    db_session.add(wf)
    db_session.commit()

    version = WorkflowVersion(workflow_id=wf.id, version_number=1, status="published", definition={})
    db_session.add(version)
    db_session.commit()

    execution = WorkflowExecution(workflow_version_id=version.id, status="RUNNING")
    db_session.add(execution)
    db_session.commit()

    event = ExecutionEvent(
        execution_id=execution.id,
        event_type="EXECUTION_STARTED",
        payload={"trigger": "manual_api"}
    )
    db_session.add(event)
    db_session.commit()
    db_session.refresh(event)

    assert event.id is not None
    assert event.event_type == "EXECUTION_STARTED"
    assert event.payload["trigger"] == "manual_api"


def test_req_051_workflow_migration_log(db_session: Session):
    wf = Workflow(name="wf_migration_test")
    db_session.add(wf)
    db_session.commit()

    v1 = WorkflowVersion(workflow_id=wf.id, version_number=1, status="published", definition={})
    v2 = WorkflowVersion(workflow_id=wf.id, version_number=2, status="published", definition={})
    db_session.add(v1)
    db_session.add(v2)
    db_session.commit()

    execution = WorkflowExecution(workflow_version_id=v1.id, status="MIGRATING")
    db_session.add(execution)
    db_session.commit()

    migration = WorkflowMigration(
        execution_id=execution.id,
        from_version_id=v1.id,
        to_version_id=v2.id,
        reused_step_keys=["research", "script", "seo"],
        rerun_step_keys=["fact_check"],
        skipped_step_keys=["legacy_audio"],
        status="COMPLETED",
        migration_notes="Upgraded execution to V2 with new Fact Check step"
    )
    db_session.add(migration)
    db_session.commit()
    db_session.refresh(migration)

    assert migration.id is not None
    assert migration.status == "COMPLETED"
    assert "fact_check" in migration.rerun_step_keys
    assert "research" in migration.reused_step_keys
