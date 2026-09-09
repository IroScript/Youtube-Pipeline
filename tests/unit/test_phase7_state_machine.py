"""
Unit Tests for Phase 7: Workflow Engine Foundation & State Machine (REQ-052 to REQ-060)
======================================================================================
Tests:
- REQ-052: StepStateMachine deterministic transitions & terminal checks
- REQ-053: ExecutionStateMachine lifecycle transitions & replay checks
- REQ-054: StepRegistry canonical specifications & lookups
- REQ-055: DAGResolver topological sort, cycle detection & ready step resolution
- REQ-056: BranchEvaluator predicate conditions & dot-notation paths
- REQ-057: ParallelOrchestrator wave partitioning & concurrency throttling
- REQ-058: CheckpointEngine state snapshot, verification & tampering guards
- REQ-059: ConfigEngine template variable interpolation
- REQ-060: Pluggable Step Type Handlers (12 Types) execution & registry lookup
"""

import pytest
import asyncio
from services.workflow.step_state_machine import (
    StepStateMachine,
    StepState,
    InvalidStepStateTransitionError,
)
from services.workflow.exec_state_machine import (
    ExecutionStateMachine,
    ExecutionState,
    InvalidExecutionStateTransitionError,
)
from domain.workflows.step_registry import StepRegistry, StepSpecification
from services.workflow.dag_resolver import (
    DAGResolver,
    CycleDetectedException,
    MissingDependencyException,
)
from services.workflow.branch_evaluator import BranchEvaluator
from services.workflow.parallel_orchestrator import ParallelOrchestrator
from services.workflow.checkpoint_engine import CheckpointEngine
from domain.workflows.config_engine import ConfigEngine
from domain.workflows.step_types import get_step_handler, list_supported_step_types


# --- REQ-052: Step State Machine ---
def test_req_052_step_state_machine_valid_transitions():
    assert StepStateMachine.transition(StepState.PENDING, StepState.READY) == StepState.READY
    assert StepStateMachine.transition(StepState.READY, StepState.RUNNING) == StepState.RUNNING
    assert StepStateMachine.transition(StepState.RUNNING, StepState.RETRY_WAIT) == StepState.RETRY_WAIT
    assert StepStateMachine.transition(StepState.RETRY_WAIT, StepState.READY) == StepState.READY
    assert StepStateMachine.transition(StepState.RUNNING, StepState.SUCCESS) == StepState.SUCCESS
    assert StepStateMachine.is_terminal(StepState.SUCCESS) is True


def test_req_052_step_state_machine_invalid_transition():
    with pytest.raises(InvalidStepStateTransitionError):
        StepStateMachine.transition(StepState.SUCCESS, StepState.PENDING)

    with pytest.raises(InvalidStepStateTransitionError):
        StepStateMachine.transition(StepState.PENDING, StepState.SUCCESS)


# --- REQ-053: Execution State Machine ---
def test_req_053_exec_state_machine_lifecycle():
    assert ExecutionStateMachine.transition(ExecutionState.CREATED, ExecutionState.QUEUED) == ExecutionState.QUEUED
    assert ExecutionStateMachine.transition(ExecutionState.QUEUED, ExecutionState.RUNNING) == ExecutionState.RUNNING
    assert ExecutionStateMachine.transition(ExecutionState.RUNNING, ExecutionState.PAUSED) == ExecutionState.PAUSED
    assert ExecutionStateMachine.transition(ExecutionState.PAUSED, ExecutionState.RUNNING) == ExecutionState.RUNNING
    assert ExecutionStateMachine.transition(ExecutionState.RUNNING, ExecutionState.COMPLETED) == ExecutionState.COMPLETED
    assert ExecutionStateMachine.is_terminal(ExecutionState.COMPLETED) is True


def test_req_053_exec_state_machine_dlq_replay():
    assert ExecutionStateMachine.transition(ExecutionState.RUNNING, ExecutionState.DEAD_LETTER) == ExecutionState.DEAD_LETTER
    assert ExecutionStateMachine.transition(ExecutionState.DEAD_LETTER, ExecutionState.QUEUED) == ExecutionState.QUEUED


def test_req_053_exec_state_machine_invalid():
    with pytest.raises(InvalidExecutionStateTransitionError):
        ExecutionStateMachine.transition(ExecutionState.COMPLETED, ExecutionState.RUNNING)


# --- REQ-054: Step Registry ---
def test_req_054_step_registry():
    keys = StepRegistry.list_keys()
    assert "research" in keys
    assert "script" in keys
    assert "seo" in keys
    assert "audio" in keys
    assert "video" in keys
    assert "upload" in keys

    spec = StepRegistry.get("video")
    assert spec is not None
    assert spec.default_step_type == "browser"
    assert spec.default_timeout == 600

    # Custom registration
    custom = StepSpecification(
        step_key="custom_benchmark",
        display_name="Benchmark Step",
        default_step_type="python",
        default_timeout=60,
        description="Custom load test"
    )
    StepRegistry.register_custom(custom)
    assert StepRegistry.is_valid_key("custom_benchmark") is True


# --- REQ-055: DAG Resolver ---
def test_req_055_dag_resolver_topological_sort():
    steps = [
        {"step_key": "upload", "depends_on": ["video"]},
        {"step_key": "video", "depends_on": ["script"]},
        {"step_key": "script", "depends_on": ["research"]},
        {"step_key": "research", "depends_on": []},
    ]
    order = DAGResolver.resolve_execution_order(steps)
    assert order == ["research", "script", "video", "upload"]


def test_req_055_dag_resolver_cycle_detection():
    cyclic_steps = [
        {"step_key": "A", "depends_on": ["B"]},
        {"step_key": "B", "depends_on": ["C"]},
        {"step_key": "C", "depends_on": ["A"]},
    ]
    with pytest.raises(CycleDetectedException):
        DAGResolver.resolve_execution_order(cyclic_steps)


def test_req_055_dag_resolver_missing_dependency():
    invalid_steps = [
        {"step_key": "A", "depends_on": ["non_existent"]},
    ]
    with pytest.raises(MissingDependencyException):
        DAGResolver.resolve_execution_order(invalid_steps)


def test_req_055_dag_resolver_ready_steps():
    steps = [
        {"step_key": "research", "depends_on": [], "enabled": True},
        {"step_key": "script", "depends_on": ["research"], "enabled": True},
        {"step_key": "seo", "depends_on": ["script"], "enabled": True},
        {"step_key": "audio", "depends_on": ["script"], "enabled": True},
        {"step_key": "video", "depends_on": ["seo", "audio"], "enabled": True},
    ]
    # Initially only research is ready
    ready = DAGResolver.get_ready_steps(steps, completed_step_keys=set())
    assert [s["step_key"] for s in ready] == ["research"]

    # After research done, script is ready
    ready = DAGResolver.get_ready_steps(steps, completed_step_keys={"research"})
    assert [s["step_key"] for s in ready] == ["script"]

    # After script done, seo and audio are ready in parallel
    ready = DAGResolver.get_ready_steps(steps, completed_step_keys={"research", "script"})
    assert set(s["step_key"] for s in ready) == {"seo", "audio"}


# --- REQ-056: Branch Evaluator ---
def test_req_056_branch_evaluator():
    context = {
        "content": {"audio_required": True, "category": "tech"},
        "metrics": {"target_duration": 60}
    }
    # Equals
    cond1 = {"field": "content.audio_required", "equals": True}
    assert BranchEvaluator.evaluate(cond1, context) is True

    cond2 = {"field": "content.audio_required", "equals": False}
    assert BranchEvaluator.evaluate(cond2, context) is False

    # In / Not In
    cond3 = {"field": "content.category", "in": ["tech", "science"]}
    assert BranchEvaluator.evaluate(cond3, context) is True

    # Comparisons
    cond4 = {"field": "metrics.target_duration", "greater_than": 30}
    assert BranchEvaluator.evaluate(cond4, context) is True

    # Exists
    cond5 = {"field": "content.category", "exists": True}
    assert BranchEvaluator.evaluate(cond5, context) is True

    # Unconditional
    assert BranchEvaluator.evaluate(None, context) is True


# --- REQ-057: Parallel Orchestrator ---
def test_req_057_parallel_waves():
    steps = [
        {"step_key": "research", "depends_on": []},
        {"step_key": "script", "depends_on": ["research"]},
        {"step_key": "seo", "depends_on": ["script"]},
        {"step_key": "thumbnail", "depends_on": ["script"]},
        {"step_key": "audio", "depends_on": ["script"]},
        {"step_key": "video", "depends_on": ["seo", "thumbnail", "audio"]},
    ]
    waves = ParallelOrchestrator.partition_into_waves(steps)
    assert len(waves) == 4
    assert [s["step_key"] for s in waves[0]] == ["research"]
    assert [s["step_key"] for s in waves[1]] == ["script"]
    assert set(s["step_key"] for s in waves[2]) == {"seo", "thumbnail", "audio"}
    assert [s["step_key"] for s in waves[3]] == ["video"]


def test_req_057_concurrency_slots():
    ready = [
        {"step_key": "b1", "step_type": "browser"},
        {"step_key": "b2", "step_type": "browser"},
        {"step_key": "l1", "step_type": "llm"},
    ]
    running = [
        {"step_key": "b0", "step_type": "browser"}
    ]
    # Browser limit is 1, so b0 is already occupying slot, neither b1 nor b2 should run
    selected = ParallelOrchestrator.filter_concurrency_slots(ready, running)
    assert len(selected) == 1
    assert selected[0]["step_key"] == "l1"


# --- REQ-058: Checkpoint Engine ---
def test_req_058_checkpoint_engine():
    context = {"idea_id": 42, "title": "Quantum Computing"}
    outputs = {
        "research": {"summary": "Superconducting qubits"},
        "script": {"narration": "Welcome to quantum realm"}
    }
    checkpoint = CheckpointEngine.create_checkpoint("exec_123", "script", context, outputs)
    assert checkpoint["execution_id"] == "exec_123"
    assert checkpoint["checkpoint_step"] == "script"
    assert "state_hash" in checkpoint

    restored = CheckpointEngine.verify_and_restore(checkpoint)
    assert restored["restored_context"]["idea_id"] == 42
    assert restored["completed_step_keys"] == {"research", "script"}

    # Tampering test
    tampered = dict(checkpoint)
    tampered["context_snapshot"] = {"idea_id": 999}
    with pytest.raises(ValueError):
        CheckpointEngine.verify_and_restore(tampered)


# --- REQ-059: Config Engine ---
def test_req_059_config_engine_interpolation():
    raw_config = {
        "model": "gemini-2.5",
        "prompt": "Create a script about {{ context.topic }} focusing on {{ outputs.research.hook }}",
        "nested": {
            "retry_id": "{{ context.retry_count }}",
            "fixed": "unchanged"
        },
        "tags": ["{{ context.niche }}", "educational"]
    }
    context = {"topic": "Black Holes", "retry_count": 2, "niche": "Astronomy"}
    outputs = {"research": {"hook": "Event Horizon Collapse"}}

    resolved = ConfigEngine.resolve_step_config(raw_config, context, outputs)
    assert resolved["prompt"] == "Create a script about Black Holes focusing on Event Horizon Collapse"
    assert resolved["nested"]["retry_id"] == 2
    assert resolved["nested"]["fixed"] == "unchanged"
    assert resolved["tags"] == ["Astronomy", "educational"]


# --- REQ-060: Pluggable Step Type Handlers (12 Types) ---
@pytest.mark.asyncio
async def test_req_060_all_12_step_type_handlers():
    expected_types = [
        "llm", "browser", "media", "youtube", "python", "qc",
        "gate", "audio", "export", "notification", "storage", "custom"
    ]
    supported = list_supported_step_types()
    assert set(expected_types).issubset(set(supported))
    assert len(supported) == 12

    for stype in expected_types:
        handler = get_step_handler(stype)
        assert handler.handler_type == stype
        result = await handler.execute("test_step", config={}, context={"test": True})
        assert result.success is True
        assert result.output_data["step_type"] == stype

    with pytest.raises(ValueError):
        get_step_handler("non_existent_type")
