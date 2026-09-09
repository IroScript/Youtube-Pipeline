"""
Pluggable Step Type Handlers Registry (REQ-060)
==============================================
Exports and maps 12 distinct step type handlers.
"""

from typing import Dict, List, Type
from domain.workflows.step_types.base_handler import BaseStepHandler, StepResult
from domain.workflows.step_types.llm_handler import LLMStepHandler
from domain.workflows.step_types.browser_handler import BrowserStepHandler
from domain.workflows.step_types.media_handler import MediaStepHandler
from domain.workflows.step_types.youtube_handler import YouTubeStepHandler
from domain.workflows.step_types.python_handler import PythonStepHandler
from domain.workflows.step_types.qc_handler import QCStepHandler
from domain.workflows.step_types.gate_handler import GateStepHandler
from domain.workflows.step_types.audio_handler import AudioStepHandler
from domain.workflows.step_types.export_handler import ExportStepHandler
from domain.workflows.step_types.notification_handler import NotificationStepHandler
from domain.workflows.step_types.storage_handler import StorageStepHandler
from domain.workflows.step_types.custom_handler import CustomStepHandler

_HANDLER_REGISTRY: Dict[str, Type[BaseStepHandler]] = {
    "llm": LLMStepHandler,
    "browser": BrowserStepHandler,
    "media": MediaStepHandler,
    "youtube": YouTubeStepHandler,
    "python": PythonStepHandler,
    "qc": QCStepHandler,
    "gate": GateStepHandler,
    "audio": AudioStepHandler,
    "export": ExportStepHandler,
    "notification": NotificationStepHandler,
    "storage": StorageStepHandler,
    "custom": CustomStepHandler,
}


def get_step_handler(step_type: str) -> BaseStepHandler:
    handler_cls = _HANDLER_REGISTRY.get(step_type)
    if not handler_cls:
        raise ValueError(f"Unsupported step type '{step_type}'. Available: {list(_HANDLER_REGISTRY.keys())}")
    return handler_cls()


def list_supported_step_types() -> List[str]:
    return list(_HANDLER_REGISTRY.keys())


__all__ = [
    "BaseStepHandler",
    "StepResult",
    "get_step_handler",
    "list_supported_step_types",
    "LLMStepHandler",
    "BrowserStepHandler",
    "MediaStepHandler",
    "YouTubeStepHandler",
    "PythonStepHandler",
    "QCStepHandler",
    "GateStepHandler",
    "AudioStepHandler",
    "ExportStepHandler",
    "NotificationStepHandler",
    "StorageStepHandler",
    "CustomStepHandler",
]
