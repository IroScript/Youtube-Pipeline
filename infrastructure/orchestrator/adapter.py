"""
REQ-089: Workflow Engine Adapter (Windmill / Temporal / DBOS / Local)
====================================================================
Vendor-neutral orchestration adapter. Translates canonical workflow JSON definitions
into specific engine representations (Windmill flow / Temporal DAG / Local engine)
preventing vendor lock-in.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseOrchestratorAdapter(ABC):
    """
    Abstract adapter translating canonical workflow definitions to execution engine formats.
    """

    @property
    @abstractmethod
    def engine_name(self) -> str:
        pass

    @abstractmethod
    def compile_workflow(self, canonical_definition: Dict[str, Any]) -> Dict[str, Any]:
        """Compiles canonical JSON DAG into engine-specific format."""
        pass

    @abstractmethod
    def submit_execution(self, compiled_flow: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Submits compiled flow to the orchestrator engine and returns execution ID."""
        pass


class LocalOrchestratorAdapter(BaseOrchestratorAdapter):
    @property
    def engine_name(self) -> str:
        return "local_engine"

    def compile_workflow(self, canonical_definition: Dict[str, Any]) -> Dict[str, Any]:
        steps = canonical_definition.get("steps", [])
        return {
            "engine": self.engine_name,
            "flow_id": canonical_definition.get("id", "local_flow"),
            "step_count": len(steps),
            "dag": steps,
        }

    def submit_execution(self, compiled_flow: Dict[str, Any], context: Dict[str, Any]) -> str:
        import uuid
        return f"local_run_{uuid.uuid4().hex[:8]}"


class WindmillOrchestratorAdapter(BaseOrchestratorAdapter):
    @property
    def engine_name(self) -> str:
        return "windmill"

    def compile_workflow(self, canonical_definition: Dict[str, Any]) -> Dict[str, Any]:
        """Compiles canonical DAG to Windmill Flow JSON format."""
        steps = canonical_definition.get("steps", [])
        wm_modules = []
        for s in steps:
            wm_modules.append({
                "id": s["step_key"],
                "summary": s.get("display_name", s["step_key"]),
                "value": {
                    "type": "script",
                    "path": f"u/admin/workers/{s.get('step_type', 'python')}",
                    "input_transforms": s.get("config", {})
                }
            })
        return {
            "schema_version": "windmill/v1",
            "summary": canonical_definition.get("name", "YouTube Automation"),
            "value": {"modules": wm_modules}
        }

    def submit_execution(self, compiled_flow: Dict[str, Any], context: Dict[str, Any]) -> str:
        import uuid
        return f"wm_job_{uuid.uuid4().hex[:8]}"


class TemporalOrchestratorAdapter(BaseOrchestratorAdapter):
    @property
    def engine_name(self) -> str:
        return "temporal"

    def compile_workflow(self, canonical_definition: Dict[str, Any]) -> Dict[str, Any]:
        """Compiles canonical DAG into Temporal Workflow description with Activity steps."""
        steps = canonical_definition.get("steps", [])
        activities = [
            {"activity_type": s.get("step_type"), "activity_id": s["step_key"], "timeout": s.get("timeout_seconds", 300)}
            for s in steps
        ]
        return {
            "temporal_workflow_type": "YouTubeContentWorkflow",
            "task_queue": "YOUTUBE_TASK_QUEUE",
            "activities": activities,
        }

    def submit_execution(self, compiled_flow: Dict[str, Any], context: Dict[str, Any]) -> str:
        import uuid
        return f"temporal_wf_{uuid.uuid4().hex[:8]}"
