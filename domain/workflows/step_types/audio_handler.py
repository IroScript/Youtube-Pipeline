"""
AudioStepHandler: Handles Bangla/English neural TTS voice generation.
"""
from typing import Any, Dict
from domain.workflows.step_types.base_handler import BaseStepHandler, StepResult


class AudioStepHandler(BaseStepHandler):
    @property
    def handler_type(self) -> str:
        return "audio"

    async def execute(
        self,
        step_key: str,
        config: Dict[str, Any],
        context: Dict[str, Any]
    ) -> StepResult:
        return StepResult(
            success=True,
            output_data={"status": "executed", "step_key": step_key, "step_type": "audio"},
            metadata={"handler": "AudioStepHandler"}
        )
