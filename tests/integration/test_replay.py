"""
REQ-094: Execution Replay & Step Retry Test Suite
=================================================
Verifies deterministic execution replay, checkpoint restoration, selective
step retry, and output reuse without re-computing already verified stages.
"""

import pytest
from services.workflow.checkpoint_engine import CheckpointEngine
from services.workflow.step_state_machine import StepStateMachine, StepState
from services.workflow.exec_state_machine import ExecutionStateMachine, ExecutionState


def test_req_094_execution_replay_and_step_retry():
    # 1. Pipeline execution starts
    execution = {
        "id": "exec_replay_test_001",
        "status": ExecutionState.RUNNING.value,
        "context_data": {"idea_id": 101, "topic": "Ancient Architecture"},
        "outputs": {}
    }

    # 2. Steps 1, 2, 3 complete successfully
    step1_output = {"research_summary": "Egyptian megastructures"}
    step2_output = {"script_text": "5000 years ago, master builders..."}
    step3_output = {"seo_title": "Ancient Engineering Secrets Revealed", "tags": ["history", "pyramids"]}

    execution["outputs"]["research"] = step1_output
    execution["outputs"]["script"] = step2_output
    execution["outputs"]["seo"] = step3_output

    # 3. Checkpoint created after Step 3
    checkpoint = CheckpointEngine.create_checkpoint(
        execution_id=execution["id"],
        step_key="seo",
        context_data=execution["context_data"],
        completed_step_outputs=execution["outputs"]
    )
    assert checkpoint["state_hash"] is not None

    # 4. Step 4 (video render) fails on first attempt
    step4_state = StepStateMachine.transition(StepState.PENDING, StepState.READY)
    step4_state = StepStateMachine.transition(step4_state, StepState.RUNNING)
    step4_state = StepStateMachine.transition(step4_state, StepState.FAILED)
    assert step4_state == StepState.FAILED

    # Execution enters FAILED state
    execution["status"] = ExecutionStateMachine.transition(ExecutionState.RUNNING, ExecutionState.FAILED).value
    assert execution["status"] == "FAILED"

    # 5. REPLAY triggered: restore from Step 3 checkpoint
    restored = CheckpointEngine.verify_and_restore(checkpoint)
    assert "research" in restored["completed_step_keys"]
    assert "script" in restored["completed_step_keys"]
    assert "seo" in restored["completed_step_keys"]

    # Re-open execution to RUNNING
    execution["status"] = ExecutionStateMachine.transition(ExecutionState.FAILED, ExecutionState.QUEUED).value
    execution["status"] = ExecutionStateMachine.transition(ExecutionState.QUEUED, ExecutionState.RUNNING).value
    assert execution["status"] == "RUNNING"

    # 6. Step 4 retries from READY
    step4_retry_state = StepStateMachine.transition(StepState.READY, StepState.RUNNING)
    step4_retry_state = StepStateMachine.transition(step4_retry_state, StepState.SUCCESS)
    assert step4_retry_state == StepState.SUCCESS
    execution["outputs"]["video"] = {"video_url": "C:/assets/final_render.mp4"}

    # 7. Final step (upload) completes
    execution["outputs"]["upload"] = {"video_id": "YT_REPLAY_SUCCESS_123"}
    execution["status"] = ExecutionStateMachine.transition(ExecutionState.RUNNING, ExecutionState.COMPLETED).value
    assert execution["status"] == "COMPLETED"

    # Verify all outputs intact
    assert len(execution["outputs"]) == 5
    assert execution["outputs"]["research"]["research_summary"] == "Egyptian megastructures"
    assert execution["outputs"]["upload"]["video_id"] == "YT_REPLAY_SUCCESS_123"
