"""
Generation Guard — Duplicate Prevention & Pre-condition Enforcement
===================================================================
Ensures no duplicate generation requests, enforces dependency chains,
and tracks active jobs per idea. Rule 10, 11, 14 compliant.
"""

from __future__ import annotations

import sys
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
for _p in (str(REPO_ROOT / "PromptDatabase"),):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from database.models import Idea, Prompt, YouTubeMetadata, GeneratedVideo
from services.pipeline.pipeline_row_model import PipelineRowState
import stage_gates as sg
from sqlmodel import select, Session


@dataclass
class GuardResult:
    allowed: bool
    reason: str
    existing_job_id: Optional[str] = None


class GenerationGuard:
    def __init__(self, session: Session):
        self.session = session

    def _get_state(self, idea_id: int) -> PipelineRowState | None:
        return self.session.exec(
            select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
        ).first()

    def has_active_job(self, idea_id: int) -> bool:
        state = self._get_state(idea_id)
        if not state:
            return False
        return bool(state.active_job_id)

    def register_active_job(self, idea_id: int, job_type: str, job_id: str) -> bool:
        """Atomic compare-and-swap: only registers if no active job exists.
        Returns True if lock acquired, False if another job already active."""
        from sqlalchemy import text
        # Atomic UPDATE: only sets job if currently NULL (prevents TOCTOU race)
        result = self.session.exec(
            text(
                "UPDATE pipeline_row_state "
                "SET active_job_id = :job_id, active_job_type = :job_type "
                "WHERE idea_id = :idea_id AND (active_job_id IS NULL OR active_job_id = '')"
            ),
            params={"job_id": job_id, "job_type": job_type, "idea_id": idea_id},
        )
        self.session.commit()
        # rowcount == 1 means we got the lock; 0 means someone else already has it
        return result.rowcount == 1

    def clear_active_job(self, idea_id: int) -> None:
        state = self._get_state(idea_id)
        if state:
            state.active_job_id = None
            state.active_job_type = None
            self.session.add(state)
            self.session.commit()

    def can_generate_prompt(self, idea_id: int) -> GuardResult:
        if self.has_active_job(idea_id):
            state = self._get_state(idea_id)
            return GuardResult(False, "Active job exists", state.active_job_id if state else None)

        # Check if escalation is already complete via stage_gates
        if sg.has_escalation(idea_id):
            return GuardResult(False, "Prompt escalation already complete (verified)")

        return GuardResult(True, "Prompt generation allowed")

    def can_generate_seo(self, idea_id: int) -> GuardResult:
        if self.has_active_job(idea_id):
            state = self._get_state(idea_id)
            return GuardResult(False, "Active job exists", state.active_job_id if state else None)

        # Prompt must be verified first
        if not sg.has_escalation(idea_id):
            return GuardResult(False, "Cannot generate SEO: prompt escalation not complete")

        # Check if real SEO already exists via stage_gates
        if sg.has_seo(idea_id):
            return GuardResult(False, "Real SEO already exists and verified")

        return GuardResult(True, "SEO generation allowed")

    def can_generate_video(self, idea_id: int) -> GuardResult:
        """
        Hard gate (Rule 14): Video generation requires ALL preconditions:
        - Prompt = PRESENT + VALID + DATABASE VERIFIED
        - SEO = PRESENT + VALID + DATABASE VERIFIED
        - Duplicate Job = FALSE
        - Existing Valid Video = FALSE
        """
        if self.has_active_job(idea_id):
            state = self._get_state(idea_id)
            return GuardResult(False, "Active job exists", state.active_job_id if state else None)

        # Hard gate: prompt must be verified
        if not sg.has_escalation(idea_id):
            return GuardResult(False, "DO NOT GENERATE VIDEO: Prompt not verified")

        # Hard gate: SEO must be verified
        if not sg.has_seo(idea_id):
            return GuardResult(False, "DO NOT GENERATE VIDEO: SEO not verified")

        # Check if valid video already exists
        if sg.has_video(idea_id):
            return GuardResult(False, "Existing Valid Video = TRUE")

        return GuardResult(True, "Video generation allowed — all preconditions met")

    def can_upload(self, idea_id: int) -> GuardResult:
        if self.has_active_job(idea_id):
            state = self._get_state(idea_id)
            return GuardResult(False, "Active job exists", state.active_job_id if state else None)

        # Video must be verified
        if not sg.has_video(idea_id):
            return GuardResult(False, "Cannot upload: video not verified")

        # Check if already uploaded
        meta = self.session.exec(
            select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)
        ).first()
        if meta and meta.status == "uploaded":
            return GuardResult(False, "Already uploaded")

        return GuardResult(True, "Upload allowed")
