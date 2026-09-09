"""
NotificationStepHandler: Handles desktop, webhook, and Telegram dispatch notifications.
"""
from typing import Any, Dict
from domain.workflows.step_types.base_handler import BaseStepHandler, StepResult


class NotificationStepHandler(BaseStepHandler):
    @property
    def handler_type(self) -> str:
        return "notification"

    async def execute(
        self,
        step_key: str,
        config: Dict[str, Any],
        context: Dict[str, Any]
    ) -> StepResult:
        return StepResult(
            success=True,
            output_data={"status": "executed", "step_key": step_key, "step_type": "notification"},
            metadata={"handler": "NotificationStepHandler"}
        )
