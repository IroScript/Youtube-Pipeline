"""
REQ-080: Execution Migration Engine (V1 -> V2)
==============================================
Transfers in-flight executions to updated workflow versions while preserving
all verified intermediate checkpoints and completed step outputs.
"""

from __future__ import annotations

from typing import Any, Dict, List
from services.workflow.compatibility import ExecutionCompatibilityValidator, VersionDiff


class ExecutionMigrationEngine:
    """
    Executes live workflow version migration without re-running verified steps.
    """

    @classmethod
    def migrate_execution(
        cls,
        execution: Dict[str, Any],
        source_steps: List[Dict[str, Any]],
        target_steps: List[Dict[str, Any]],
        target_version_id: str,
        completed_step_runs: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Migrates execution to target_version_id.
        Reuses successful outputs for steps classified as reusable.
        Schedules modified and added steps for execution.
        """
        diff: VersionDiff = ExecutionCompatibilityValidator.compare_versions(source_steps, target_steps)

        reused_outputs = {}
        for key in diff.reusable_step_keys:
            if key in completed_step_runs and completed_step_runs[key].get("status") == "SUCCESS":
                reused_outputs[key] = completed_step_runs[key].get("output_data", {})

        # Update execution state
        execution["workflow_version_id"] = target_version_id
        execution["status"] = "RUNNING"
        execution["context_data"].setdefault("outputs", {}).update(reused_outputs)

        return {
            "execution_id": execution.get("id"),
            "target_version_id": target_version_id,
            "reused_step_keys": list(reused_outputs.keys()),
            "rerun_step_keys": diff.modified_step_keys + [k for k in diff.reusable_step_keys if k not in reused_outputs],
            "added_step_keys": diff.added_step_keys,
            "skipped_step_keys": diff.removed_step_keys,
            "status": "COMPLETED",
        }
