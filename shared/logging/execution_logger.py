"""
Structured Execution Logger
===========================
Mandatory logging component for tracking:
- prompt generation
- seo generation
- execution state changes
- retry attempts

Each log strictly contains:
- execution_id: str
- idea_id: int | str
- step_key: str
- attempt_number: int
- status: str
- timestamp: ISO 8601 UTC string
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

# Structured logger configuration
LOG_FILE_PATH = Path(
    os.getenv("EXECUTION_LOG_PATH", r"C:\Users\Irak\Desktop\Youtube Pipeline\PromptDatabase\execution_events.log")
)

_logger = logging.getLogger("youtube_pipeline.execution")
if not _logger.handlers:
    _logger.setLevel(logging.INFO)
    
    # Console handler (JSON stream)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter("%(message)s"))
    _logger.addHandler(console_handler)
    
    # File handler (JSON lines)
    try:
        LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(str(LOG_FILE_PATH), encoding="utf-8")
        file_handler.setFormatter(logging.Formatter("%(message)s"))
        _logger.addHandler(file_handler)
    except Exception as e:
        print(f"[Warning] Could not initialize execution log file: {e}", file=sys.stderr)


class ExecutionLogger:
    """Singleton structured logger guaranteeing uniform schema across pipeline events."""

    @staticmethod
    def emit(
        execution_id: str,
        idea_id: Any,
        step_key: str,
        attempt_number: int,
        status: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Emits a structured JSON execution event with mandatory schema.
        """
        now_utc = datetime.now(timezone.utc).isoformat()
        
        event = {
            "execution_id": str(execution_id),
            "idea_id": idea_id,
            "step_key": str(step_key),
            "attempt_number": int(attempt_number),
            "status": str(status),
            "timestamp": now_utc,
        }
        if details:
            event["details"] = details

        json_str = json.dumps(event, ensure_ascii=False)
        _logger.info(json_str)
        return event

    @classmethod
    def log_prompt_generation(
        cls,
        execution_id: str,
        idea_id: Any,
        attempt_number: int = 1,
        status: str = "PROMPT_GENERATING",
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return cls.emit(
            execution_id=execution_id,
            idea_id=idea_id,
            step_key="prompt_generation",
            attempt_number=attempt_number,
            status=status,
            details=details,
        )

    @classmethod
    def log_seo_generation(
        cls,
        execution_id: str,
        idea_id: Any,
        attempt_number: int = 1,
        status: str = "SEO_GENERATING",
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return cls.emit(
            execution_id=execution_id,
            idea_id=idea_id,
            step_key="seo_generation",
            attempt_number=attempt_number,
            status=status,
            details=details,
        )

    @classmethod
    def log_state_change(
        cls,
        execution_id: str,
        idea_id: Any,
        step_key: str,
        from_state: str,
        to_state: str,
        attempt_number: int = 1,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload = {"from_state": str(from_state), "to_state": str(to_state)}
        if details:
            payload.update(details)
        return cls.emit(
            execution_id=execution_id,
            idea_id=idea_id,
            step_key=step_key,
            attempt_number=attempt_number,
            status=f"STATE_CHANGED_{to_state.upper()}",
            details=payload,
        )

    @classmethod
    def log_retry_attempt(
        cls,
        execution_id: str,
        idea_id: Any,
        step_key: str,
        attempt_number: int,
        max_attempts: int,
        status: str = "RETRY_SCHEDULED",
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload = {"attempt": attempt_number, "max_attempts": max_attempts}
        if details:
            payload.update(details)
        return cls.emit(
            execution_id=execution_id,
            idea_id=idea_id,
            step_key=step_key,
            attempt_number=attempt_number,
            status=status,
            details=payload,
        )
