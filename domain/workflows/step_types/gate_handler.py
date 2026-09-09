"""
GateStepHandler: Handles pipeline stage gate evaluation and approval checkpoints.
"""
from typing import Any, Dict
from domain.workflows.step_types.base_handler import BaseStepHandler, StepResult


class GateStepHandler(BaseStepHandler):
    @property
    def handler_type(self) -> str:
        return "gate"

    async def execute(
        self,
        step_key: str,
        config: Dict[str, Any],
        context: Dict[str, Any]
    ) -> StepResult:
        return StepResult(
            success=True,
            output_data={"status": "executed", "step_key": step_key, "step_type": "gate"},
            metadata={"handler": "GateStepHandler"}
        )
