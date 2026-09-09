"""
REQ-058: Execution Checkpointing Engine
=======================================
Persists and verifies atomic state checkpoints for long-running workflows.
Enables instant crash recovery and durable execution resumption.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Set


class CheckpointEngine:
    """
    Creates and validates verifiable state snapshots for workflow executions.
    """

    @classmethod
    def compute_state_hash(cls, context_data: Dict[str, Any], completed_outputs: Dict[str, Any]) -> str:
        """
        Computes deterministic SHA256 checksum of execution state.
        """
        payload = {
            "context": context_data,
            "outputs": completed_outputs,
        }
        serialized = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    @classmethod
    def create_checkpoint(
        cls,
        execution_id: str,
        step_key: str,
        context_data: Dict[str, Any],
        completed_step_outputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates a state checkpoint packet ready for persistence in execution_events.
        """
        state_hash = cls.compute_state_hash(context_data, completed_step_outputs)
        return {
            "execution_id": execution_id,
            "checkpoint_step": step_key,
            "state_hash": state_hash,
            "completed_steps": list(completed_step_outputs.keys()),
            "context_snapshot": context_data,
            "outputs_snapshot": completed_step_outputs,
            "checkpoint_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    def verify_and_restore(
        cls,
        checkpoint: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validates the SHA256 integrity of a checkpoint and extracts restore points.
        """
        expected_hash = checkpoint.get("state_hash")
        context_data = checkpoint.get("context_snapshot", {})
        outputs = checkpoint.get("outputs_snapshot", {})

        actual_hash = cls.compute_state_hash(context_data, outputs)
        if expected_hash and actual_hash != expected_hash:
            raise ValueError(
                f"Checkpoint integrity violation! Expected {expected_hash}, calculated {actual_hash}"
            )

        return {
            "restored_context": context_data,
            "restored_outputs": outputs,
            "completed_step_keys": set(checkpoint.get("completed_steps", [])),
            "state_hash": actual_hash,
        }
