"""
Pause & Resume Controller
==========================
Safe pause mechanism that records running operation state,
and resume that picks up from the last verified state.

Rules enforced: 17, 18
"""

from __future__ import annotations

import sys
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
for _p in (str(REPO_ROOT / "PromptDatabase"),):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from sqlmodel import Session, select
from services.pipeline.pipeline_row_model import PipelineRowState
from services.pipeline.pipeline_state import PipelineState

logger = logging.getLogger(__name__)


class PauseResumeController:
    """
    Rule 17: Safe Pause — records the current operation state so the pipeline
    can be resumed from exactly where it was paused.
    """

    def __init__(self, session: Session):
        self.session = session

    def pause_idea(self, idea_id: int, reason: str = "Manual pause") -> dict:
        """
        Pause pipeline execution for a specific idea.
        Saves current state as previous_state so resume knows where to go.
        """
        state = self.session.exec(
            select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
        ).first()
        if not state:
            return {"paused": False, "reason": f"No pipeline state for idea #{idea_id}"}

        if state.current_state == PipelineState.COMPLETE.value:
            return {"paused": False, "reason": "Idea already complete, nothing to pause"}

        if state.is_paused:
            return {"paused": False, "reason": "Already paused"}

        state.is_paused = True
        state.previous_state = state.current_state
        state.current_state = PipelineState.PAUSED.value
        state.failure_reason = reason
        state.updated_at = datetime.now(timezone.utc)
        self.session.add(state)
        self.session.commit()

        logger.info(f"Idea #{idea_id} paused from state {state.previous_state}")
        return {
            "paused": True,
            "idea_id": idea_id,
            "paused_from_state": state.previous_state,
            "reason": reason,
        }

    def resume_idea(self, idea_id: int) -> dict:
        """
        Resume pipeline execution from the last verified state.
        Restores previous_state as current_state.
        """
        state = self.session.exec(
            select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
        ).first()
        if not state:
            return {"resumed": False, "reason": f"No pipeline state for idea #{idea_id}"}

        if not state.is_paused and state.current_state != PipelineState.PAUSED.value:
            return {"resumed": False, "reason": "Not currently paused"}

        resume_to = state.previous_state or PipelineState.DISCOVERED.value
        state.is_paused = False
        state.current_state = resume_to
        state.failure_reason = None
        state.updated_at = datetime.now(timezone.utc)
        self.session.add(state)
        self.session.commit()

        logger.info(f"Idea #{idea_id} resumed to state {resume_to}")
        return {
            "resumed": True,
            "idea_id": idea_id,
            "resumed_to_state": resume_to,
        }

    def pause_all(self, reason: str = "Global pause") -> dict:
        """Pause all non-complete, non-paused ideas."""
        states = self.session.exec(
            select(PipelineRowState).where(
                PipelineRowState.current_state != PipelineState.COMPLETE.value,
                PipelineRowState.is_paused == False,  # noqa: E712
            )
        ).all()
        paused_count = 0
        for state in states:
            state.is_paused = True
            state.previous_state = state.current_state
            state.current_state = PipelineState.PAUSED.value
            state.failure_reason = reason
            state.updated_at = datetime.now(timezone.utc)
            self.session.add(state)
            paused_count += 1
        self.session.commit()
        return {"paused_count": paused_count, "reason": reason}

    def get_paused_ideas(self) -> list[dict]:
        """List all paused ideas."""
        states = self.session.exec(
            select(PipelineRowState).where(PipelineRowState.is_paused == True)  # noqa: E712
        ).all()
        return [
            {
                "idea_id": s.idea_id,
                "paused_from_state": s.previous_state,
                "reason": s.failure_reason,
            }
            for s in states
        ]
