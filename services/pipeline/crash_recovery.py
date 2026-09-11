"""
Crash Recovery Engine
======================
Recovers pipeline state after unexpected shutdowns.
Scans DB for interrupted states, verifies filesystem, and resets to safe states.

Rule enforced: 18
"""

from __future__ import annotations

import sys
import logging
from pathlib import Path
from datetime import datetime, timezone

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
for _p in (str(REPO_ROOT / "PromptDatabase"),):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from sqlmodel import Session, select
from services.pipeline.pipeline_row_model import PipelineRowState
from services.pipeline.pipeline_state import PipelineState
import stage_gates as sg

logger = logging.getLogger(__name__)

# States that indicate an operation was in-progress when crash happened
IN_FLIGHT_STATES = {
    PipelineState.PROMPT_GENERATING.value,
    PipelineState.PROMPT_VERIFYING.value,
    PipelineState.SEO_GENERATING.value,
    PipelineState.SEO_VERIFYING.value,
    PipelineState.VIDEO_GENERATING.value,
    PipelineState.VIDEO_VERIFYING.value,
    PipelineState.UPLOADING.value,
    PipelineState.UPLOAD_VERIFYING.value,
}


class CrashRecoveryEngine:
    """
    Rule 18: Crash Recovery — scans for interrupted pipeline states and
    resets them to the last safely verified state.

    Recovery logic:
    1. Find all rows in IN_FLIGHT states (GENERATING, VERIFYING)
    2. For each, verify actual state via stage_gates (filesystem + DB)
    3. If the operation actually completed → advance to COMPLETE state
    4. If the operation did NOT complete → reset to MISSING state for retry
    5. Clear any stale active_job_id
    """

    def __init__(self, session: Session):
        self.session = session

    def scan_and_recover(self) -> dict:
        """
        Main recovery entry point. Called at startup or after crash detection.
        Returns summary of recovered rows.
        """
        recovered: list[dict] = []
        stale_jobs_cleared = 0

        # Find all in-flight rows
        all_states = self.session.exec(select(PipelineRowState)).all()

        for state in all_states:
            # Clear stale active jobs
            if state.active_job_id:
                state.active_job_id = None
                state.active_job_type = None
                stale_jobs_cleared += 1

            if state.current_state not in IN_FLIGHT_STATES:
                continue

            idea_id = state.idea_id
            old_state = state.current_state
            new_state = self._determine_recovery_state(idea_id, old_state)

            if new_state != old_state:
                state.previous_state = old_state
                state.current_state = new_state
                state.failure_reason = f"Crash recovery: {old_state} → {new_state}"
                state.updated_at = datetime.now(timezone.utc)

                # Update verification flags based on actual state
                state.prompt_verified = sg.has_escalation(idea_id)
                state.seo_verified = sg.has_seo(idea_id)
                state.video_verified = sg.has_video(idea_id)
                state.package_verified = sg.has_package(idea_id)

                self.session.add(state)
                recovered.append({
                    "idea_id": idea_id,
                    "from_state": old_state,
                    "to_state": new_state,
                })
                logger.info(f"Crash recovery: idea #{idea_id} {old_state} → {new_state}")

        if recovered or stale_jobs_cleared:
            self.session.commit()

        return {
            "recovered_count": len(recovered),
            "stale_jobs_cleared": stale_jobs_cleared,
            "details": recovered,
        }

    def _determine_recovery_state(self, idea_id: int, crashed_state: str) -> str:
        """
        Check actual completion via stage_gates and decide where to recover to.
        """
        if crashed_state in (
            PipelineState.PROMPT_GENERATING.value,
            PipelineState.PROMPT_VERIFYING.value,
        ):
            if sg.has_escalation(idea_id):
                return PipelineState.PROMPT_COMPLETE.value
            return PipelineState.PROMPT_MISSING.value

        if crashed_state in (
            PipelineState.SEO_GENERATING.value,
            PipelineState.SEO_VERIFYING.value,
        ):
            if sg.has_seo(idea_id):
                return PipelineState.SEO_COMPLETE.value
            return PipelineState.SEO_MISSING.value

        if crashed_state in (
            PipelineState.VIDEO_GENERATING.value,
            PipelineState.VIDEO_VERIFYING.value,
        ):
            if sg.has_video(idea_id):
                return PipelineState.VIDEO_COMPLETE.value
            return PipelineState.READY_FOR_VIDEO.value

        if crashed_state in (
            PipelineState.UPLOADING.value,
            PipelineState.UPLOAD_VERIFYING.value,
        ):
            # Check if upload actually completed — conservative, reset to READY
            return PipelineState.READY_FOR_UPLOAD.value

        return crashed_state

    def verify_all_states(self) -> dict:
        """
        Verify all pipeline_row_state rows against actual stage_gates results.
        Useful for periodic consistency checks.
        """
        mismatches: list[dict] = []
        all_states = self.session.exec(select(PipelineRowState)).all()

        for state in all_states:
            idea_id = state.idea_id
            actual_prompt = sg.has_escalation(idea_id)
            actual_seo = sg.has_seo(idea_id)
            actual_video = sg.has_video(idea_id)
            actual_package = sg.has_package(idea_id)

            if (
                state.prompt_verified != actual_prompt
                or state.seo_verified != actual_seo
                or state.video_verified != actual_video
                or state.package_verified != actual_package
            ):
                mismatches.append({
                    "idea_id": idea_id,
                    "db_state": {
                        "prompt": state.prompt_verified,
                        "seo": state.seo_verified,
                        "video": state.video_verified,
                        "package": state.package_verified,
                    },
                    "actual_state": {
                        "prompt": actual_prompt,
                        "seo": actual_seo,
                        "video": actual_video,
                        "package": actual_package,
                    },
                })

        return {
            "total_checked": len(all_states),
            "mismatches": len(mismatches),
            "details": mismatches,
        }
