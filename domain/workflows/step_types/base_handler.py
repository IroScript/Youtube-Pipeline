"""
REQ-060: Base Step Type Handler Interface
=========================================
Abstract contract for all pluggable execution handlers.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class StepResult:
    success: bool
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    error_class: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseStepHandler(ABC):
    """
    Abstract interface implemented by all step type runners.
    """

    @property
    @abstractmethod
    def handler_type(self) -> str:
        """Returns canonical step type string, e.g. 'llm', 'browser'."""
        pass

    @abstractmethod
    async def execute(
        self,
        step_key: str,
        config: Dict[str, Any],
        context: Dict[str, Any]
    ) -> StepResult:
        """Executes the step action and returns StepResult."""
        pass
