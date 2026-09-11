"""
Failure Handler — Pipeline Failure State Management
=====================================================
Handles failure recording, retry eligibility, and failure info.

Rules enforced: 16, 20
"""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
for _p in (str(REPO_ROOT / "PromptDatabase"),):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from sqlmodel import select, Session
from services.pipeline.pipeline_row_model import PipelineRowState
from services.pipeline.pipeline_state import PipelineState, FAILURE_STATES

MAX_RETRIES = 3


class FailureHandler:
    def __init__(self, session: Session):
        self.session = session

    def _update_failure(self, idea_id: int, error: str, state: PipelineState) -> None:
        row = self.session.exec(
            select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
        ).first()
        if row:
            row.previous_state = row.current_state
            row.current_state = state.value
            row.failure_reason = error
            row.retry_count += 1
            row.updated_at = datetime.now(timezone.utc)
            self.session.add(row)
            self.session.commit()

    def handle_prompt_failure(self, idea_id: int, error: str) -> None:
        self._update_failure(idea_id, error, PipelineState.PROMPT_FAILED)

    def handle_seo_failure(self, idea_id: int, error: str) -> None:
        self._update_failure(idea_id, error, PipelineState.SEO_FAILED)

    def handle_video_failure(self, idea_id: int, error: str) -> None:
        self._update_failure(idea_id, error, PipelineState.VIDEO_FAILED)

    def handle_upload_failure(self, idea_id: int, error: str) -> None:
        self._update_failure(idea_id, error, PipelineState.UPLOAD_FAILED)

    def handle_package_failure(self, idea_id: int, error: str) -> None:
        self._update_failure(idea_id, error, PipelineState.ERROR)

    def can_proceed_after_failure(self, idea_id: int) -> bool:
        """Check if the idea can be retried (not exceeded max retries, not in ERROR terminal state)."""
        row = self.session.exec(
            select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
        ).first()
        if not row:
            return False
        # ERROR is terminal - no retry. Individual *_FAILED states allow retry.
        if row.current_state == PipelineState.ERROR.value:
            return False
        if row.retry_count >= MAX_RETRIES:
            return False
        return row.current_state in [s.value for s in FAILURE_STATES]

    def get_failure_info(self, idea_id: int) -> dict:
        row = self.session.exec(
            select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
        ).first()
        if not row:
            return {}
        return {
            "current_state": row.current_state,
            "failure_reason": row.failure_reason,
            "retry_count": row.retry_count,
            "max_retries": MAX_RETRIES,
            "can_retry": self.can_proceed_after_failure(idea_id),
            "is_paused": row.is_paused,
        }
