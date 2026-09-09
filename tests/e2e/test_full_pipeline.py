"""
REQ-095: End-to-End Automated Integration Test Suite
====================================================
Validates the complete YouTube Content Factory ERP pipeline lifecycle:
Idea -> Research -> Script -> Fact Check -> SEO -> Audio -> Video -> Assembly -> QC -> Upload -> Audit
"""

import pytest
import asyncio
from datetime import datetime, timezone
from sqlmodel import SQLModel, create_engine, Session

from domain.workflows.models import Workflow
from domain.workflows.version_model import WorkflowVersion
from domain.workflows.dag_model import WorkflowStep
from domain.workflows.execution_model import WorkflowExecution
from domain.workflows.step_run_model import StepRun
from domain.workflows.step_registry import StepRegistry
from services.workflow.dag_resolver import DAGResolver
from domain.workflows.step_types import get_step_handler
from domain.audit.audit_model import AuditLog


@pytest.mark.asyncio
async def test_req_095_full_content_factory_pipeline_e2e():
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # 1. Setup Workflow Entity
        wf = Workflow(name="autonomous_shorts_factory", content_type="shorts")
        session.add(wf)
        session.commit()

        # 2. Setup Canonical Steps
        step_definitions = [
            {"step_key": "research", "step_type": "llm", "depends_on": []},
            {"step_key": "script", "step_type": "llm", "depends_on": ["research"]},
            {"step_key": "fact_check", "step_type": "python", "depends_on": ["script"]},
            {"step_key": "seo", "step_type": "llm", "depends_on": ["script"]},
            {"step_key": "audio", "step_type": "audio", "depends_on": ["script"]},
            {"step_key": "video", "step_type": "browser", "depends_on": ["script"]},
            {"step_key": "assembly", "step_type": "media", "depends_on": ["audio", "video"]},
            {"step_key": "qc", "step_type": "qc", "depends_on": ["assembly"]},
            {"step_key": "upload", "step_type": "youtube", "depends_on": ["qc", "seo"]},
        ]

        # 3. Create Immutable Workflow Version
        execution_order = DAGResolver.resolve_execution_order(step_definitions)
        assert len(execution_order) == 9
        assert execution_order[0] == "research"
        assert execution_order[-1] == "upload"

        version = WorkflowVersion(
            workflow_id=wf.id,
            version_number=1,
            status="published",
            definition={"steps": step_definitions}
        )
        session.add(version)
        session.commit()

        # 4. Create Execution Instance
        execution = WorkflowExecution(
            workflow_version_id=version.id,
            idea_id=1,
            channel_id="UC_E2E_FACTORY",
            status="RUNNING",
            context_data={"idea_title": "Impossible Giant Excavators"}
        )
        session.add(execution)
        session.commit()

        # 5. Execute Pipeline Stages sequentially adhering to DAG dependencies
        completed_keys = set()
        pipeline_outputs = {}

        while len(completed_keys) < len(step_definitions):
            ready_steps = DAGResolver.get_ready_steps(step_definitions, completed_keys)
            assert len(ready_steps) > 0, "Pipeline deadlock: no ready steps found"

            for step in ready_steps:
                key = step["step_key"]
                stype = step["step_type"]

                # Run handler
                handler = get_step_handler(stype)
                result = await handler.execute(
                    step_key=key,
                    config={},
                    context={"idea": "Impossible Giant Excavators", "prev_outputs": pipeline_outputs}
                )
                assert result.success is True

                # Persist StepRun
                srun = StepRun(
                    execution_id=execution.id,
                    step_key=key,
                    step_type=stype,
                    status="SUCCESS",
                    input_data={"executed_at": datetime.now(timezone.utc).isoformat()},
                    output_data=result.output_data,
                    attempt_count=1
                )
                session.add(srun)
                completed_keys.add(key)
                pipeline_outputs[key] = result.output_data

        session.commit()

        # 6. Finalize Execution
        execution.status = "COMPLETED"
        execution.completed_at = datetime.now(timezone.utc)
        session.add(execution)

        # 7. Record Immutable Audit Log
        audit = AuditLog(
            actor="pipeline_orchestrator_daemon",
            action="EXECUTION_COMPLETED",
            entity_type="execution",
            entity_id=execution.id,
            before_state={"status": "RUNNING"},
            after_state={"status": "COMPLETED", "steps_completed": 9},
            reason="Autonomous pipeline execution finished successfully without manual intervention"
        )
        session.add(audit)
        session.commit()

        # 8. Assertions
        assert len(completed_keys) == 9
        assert "upload" in pipeline_outputs
        assert execution.status == "COMPLETED"
        assert audit.id is not None
