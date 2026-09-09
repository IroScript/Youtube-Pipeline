"""
REQ-083: Workflow Rollback Engine
=================================
Rolls back execution state to an earlier workflow version or checkpoint snapshot
when a target version fails or encounters critical validation errors.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone


class WorkflowRollbackEngine:
    """
    Rolls back in-flight execution state to a prior verified version or checkpoint.
    """

    @classmethod
    def rollback_execution(
        cls,
        execution: Dict[str, Any],
        target_version_id: str,
        checkpoint_snapshot: Dict[str, Any],
        reason: str
    ) -> Dict[str, Any]:
        """
        Rolls back the execution to target_version_id and restores context/outputs
        from checkpoint_snapshot.
        """
        now = datetime.now(timezone.utc).isoformat()
        execution["workflow_version_id"] = target_version_id
        execution["status"] = "RUNNING"
        execution["context_data"] = checkpoint_snapshot.get("context_snapshot", {})
        execution["error_summary"] = f"Rolled back to {target_version_id}: {reason}"
        execution["updated_at"] = now

        return {
            "execution_id": execution.get("id"),
            "rolled_back_to_version": target_version_id,
            "status": "ROLLED_BACK",
            "reason": reason,
            "timestamp": now,
        }
