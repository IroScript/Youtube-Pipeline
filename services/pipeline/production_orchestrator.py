"""
Production Pipeline Orchestrator
=================================
REST API-driven one-click full pipeline with verification at every stage.
Implements CHECK → ACT → VERIFY → RE-CHECK → COMMIT → MOVE NEXT pattern.

Rules enforced: 1, 2, 3, 4, 5, 14, 15, 16, 20, 21, 22, 23
"""

from __future__ import annotations

import sys
import uuid
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
for _p in (str(REPO_ROOT / "PromptDatabase"), str(REPO_ROOT / "video" / "1Video10Sec")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from sqlmodel import Session, select
from database.models import Idea, Prompt, YouTubeMetadata, GeneratedVideo
from services.pipeline.pipeline_row_model import PipelineRowState
from services.pipeline.pipeline_state import PipelineState, PipelineStateMachine, FAILURE_STATES
from services.pipeline.failure_handler import MAX_RETRIES
from services.pipeline.generation_guard import GenerationGuard, GuardResult
import stage_gates as sg

logger = logging.getLogger(__name__)


@dataclass
class PipelineExecutionResult:
    idea_id: int
    title: str
    initial_state: str
    final_state: str
    stages_completed: list[str] = field(default_factory=list)
    stages_failed: list[str] = field(default_factory=list)
    stages_skipped: list[str] = field(default_factory=list)
    verification_results: dict[str, bool] = field(default_factory=dict)
    is_complete: bool = False
    error: str | None = None
    dry_run: bool = False


class ProductionOrchestrator:
    """
    Core pipeline orchestrator implementing:
    - Row-by-row sequential processing (Rule 5)
    - Dependency-aware progression (Rule 2)
    - CHECK → ACT → VERIFY → RE-CHECK → COMMIT pattern (Rule 21)
    - No skip, no premature next step (Rule 30)
    """

    def __init__(self, session: Session):
        self.session = session
        self.guard = GenerationGuard(session)

    # ------------------------------------------------------------------
    # State Management
    # ------------------------------------------------------------------
    def _ensure_state(self, idea_id: int) -> PipelineRowState:
        """Get or create pipeline row state for an idea."""
        state = self.session.exec(
            select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
        ).first()
        if not state:
            state = PipelineRowState(
                uuid=str(uuid.uuid4()),
                idea_id=idea_id,
                current_state=PipelineState.DISCOVERED.value,
            )
            self.session.add(state)
            self.session.commit()
            self.session.refresh(state)
        return state

    def _update_state(self, idea_id: int, new_state: str, **kwargs) -> PipelineRowState:
        """Transition pipeline row to new state with optional field updates."""
        state = self._ensure_state(idea_id)
        old_state = state.current_state

        # State machine validation (warning-only to preserve existing behavior)
        try:
            from_ps = PipelineState(old_state)
            to_ps = PipelineState(new_state)
            if not PipelineStateMachine.validate_transition(from_ps, to_ps):
                logger.warning(
                    f"Invalid state transition for idea #{idea_id}: "
                    f"{old_state} → {new_state} (not in ALLOWED_TRANSITIONS)"
                )
        except ValueError:
            pass  # Non-enum state string, skip validation

        state.previous_state = old_state
        state.current_state = new_state
        state.updated_at = datetime.now(timezone.utc)

        # Auto-increment retry_count on failure transitions (Fix BUG-6)
        failure_values = {s.value for s in FAILURE_STATES}
        if new_state in failure_values and old_state not in failure_values:
            state.retry_count += 1

        for k, v in kwargs.items():
            if hasattr(state, k):
                setattr(state, k, v)
        self.session.add(state)
        self.session.commit()
        self.session.refresh(state)
        return state

    def get_state(self, idea_id: int) -> PipelineRowState:
        """Public accessor for pipeline state."""
        return self._ensure_state(idea_id)

    # ------------------------------------------------------------------
    # Next Target Discovery (Rule 22)
    # ------------------------------------------------------------------
    def discover_next_target(self) -> int | None:
        """
        Discovers the first incomplete idea by ID order.
        Uses database + stage_gates for fresh state verification (Rule 9).
        """
        ideas = self.session.exec(select(Idea).order_by(Idea.id)).all()
        for idea in ideas:
            if idea.is_deleted:
                continue
            state = self.session.exec(
                select(PipelineRowState).where(PipelineRowState.idea_id == idea.id)
            ).first()
            # Skip paused ideas — prevent sequential pipeline deadlock (Fix BUG-2)
            if state and (state.is_paused or state.current_state == PipelineState.PAUSED.value):
                continue
            if not state or state.current_state != PipelineState.COMPLETE.value:
                # Double-verify with stage_gates fresh check
                if not sg.has_package(idea.id):
                    return idea.id
        return None

    # ------------------------------------------------------------------
    # Core Orchestration (Rule 23: One-Click Full Pipeline)
    # ------------------------------------------------------------------
    def run_full_pipeline_for_idea(
        self,
        idea_id: int,
        *,
        dry_run: bool = True,
        skip_browser: bool = False,
    ) -> PipelineExecutionResult:
        """
        Runs the full pipeline for a single idea with verification at every stage.
        Pattern: CHECK → ACT → VERIFY → RE-CHECK → COMMIT STATE → MOVE NEXT
        """
        idea = self.session.exec(select(Idea).where(Idea.id == idea_id)).first()
        if not idea:
            raise ValueError(f"Idea #{idea_id} not found")

        state = self._ensure_state(idea_id)
        initial_state = state.current_state

        # Rule 17: Paused ideas MUST NOT execute any new stages
        if state.is_paused or state.current_state == PipelineState.PAUSED.value:
            return PipelineExecutionResult(
                idea_id=idea_id,
                title=idea.title,
                initial_state=initial_state,
                final_state=initial_state,
                dry_run=dry_run,
                error="Pipeline is PAUSED — no stages will execute",
            )

        # Retry limit enforcement (Fix BUG-5): block if max retries exceeded
        failure_values = {s.value for s in FAILURE_STATES}
        if state.current_state in failure_values and state.retry_count >= MAX_RETRIES:
            return PipelineExecutionResult(
                idea_id=idea_id,
                title=idea.title,
                initial_state=initial_state,
                final_state=initial_state,
                dry_run=dry_run,
                error=f"Max retries ({MAX_RETRIES}) exceeded — retry_count={state.retry_count}",
            )

        result = PipelineExecutionResult(
            idea_id=idea_id,
            title=idea.title,
            initial_state=initial_state,
            final_state=initial_state,
            dry_run=dry_run,
        )

        try:
            # ── Stage 1: PROMPT ──────────────────────────────────────
            self._execute_prompt_stage(idea_id, result, dry_run, skip_browser)
            if result.stages_failed:
                result.final_state = self._ensure_state(idea_id).current_state
                return result  # Rule 16: failure blocks next stage

            # ── Stage 2: SEO ─────────────────────────────────────────
            self._execute_seo_stage(idea_id, result, dry_run, skip_browser)
            if result.stages_failed:
                result.final_state = self._ensure_state(idea_id).current_state
                return result

            # ── Stage 3: VIDEO ───────────────────────────────────────
            self._execute_video_stage(idea_id, result, dry_run)
            if result.stages_failed:
                result.final_state = self._ensure_state(idea_id).current_state
                return result

            # ── Stage 4: PACKAGE ─────────────────────────────────────
            self._execute_package_stage(idea_id, result, dry_run, skip_browser)

            # ── Final State ──────────────────────────────────────────
            final_state = self._ensure_state(idea_id)
            result.final_state = final_state.current_state if not dry_run else "DRY_RUN_VALIDATED"
            result.is_complete = (
                final_state.current_state == PipelineState.COMPLETE.value
                if not dry_run
                else all(result.verification_results.values())
            )

        except Exception as e:
            logger.error(f"Pipeline error for idea #{idea_id}: {e}")
            result.error = str(e)
            result.stages_failed.append("pipeline_error")
            if not dry_run:
                self._update_state(idea_id, PipelineState.ERROR.value, failure_reason=str(e))
            result.final_state = self._ensure_state(idea_id).current_state

        return result

    # ------------------------------------------------------------------
    # Stage Executors (each follows CHECK → ACT → VERIFY)
    # ------------------------------------------------------------------
    def _execute_prompt_stage(self, idea_id: int, result: PipelineExecutionResult, dry_run: bool, skip_browser: bool) -> None:
        """CHECK: is prompt complete? → ACT: generate → VERIFY: read-back."""
        # CHECK
        if sg.has_escalation(idea_id):
            result.stages_skipped.append("prompt")
            result.verification_results["prompt"] = True
            if not dry_run:
                self._update_state(idea_id, PipelineState.PROMPT_COMPLETE.value, prompt_verified=True)
            return

        # GUARD CHECK
        guard = self.guard.can_generate_prompt(idea_id)
        if not guard.allowed:
            result.stages_skipped.append("prompt")
            result.verification_results["prompt"] = False
            return

        if dry_run:
            result.stages_completed.append("prompt (dry_run)")
            result.verification_results["prompt"] = True
            return

        # LOCK REGISTRATION — atomic CAS duplicate prevention (Fix BUG-1)
        job_id = str(uuid.uuid4())
        if not self.guard.register_active_job(idea_id, "prompt", job_id):
            result.stages_skipped.append("prompt")
            result.error = "Another job already active for this idea"
            return

        # ACT
        self._update_state(idea_id, PipelineState.PROMPT_GENERATING.value)
        try:
            from services.scripting.prompt_service import PromptService
            svc = PromptService(self.session)
            saved = svc.generate_escalation(idea_id, skip_browser=skip_browser)

            # VERIFY (read-back)
            self._update_state(idea_id, PipelineState.PROMPT_VERIFYING.value)
            if sg.has_escalation(idea_id):
                self._update_state(idea_id, PipelineState.PROMPT_COMPLETE.value, prompt_verified=True)
                result.stages_completed.append("prompt")
                result.verification_results["prompt"] = True
            else:
                self._update_state(idea_id, PipelineState.PROMPT_FAILED.value,
                                   failure_reason="Read-back verification failed: escalation incomplete")
                result.stages_failed.append("prompt")
                result.verification_results["prompt"] = False
        except Exception as e:
            self._update_state(idea_id, PipelineState.PROMPT_FAILED.value, failure_reason=str(e))
            result.stages_failed.append("prompt")
            result.verification_results["prompt"] = False
            result.error = f"Prompt generation failed: {e}"
        finally:
            self.guard.clear_active_job(idea_id)

    def _execute_seo_stage(self, idea_id: int, result: PipelineExecutionResult, dry_run: bool, skip_browser: bool) -> None:
        """CHECK: is SEO complete? → ACT: generate → VERIFY: read-back."""
        # CHECK
        if sg.has_seo(idea_id):
            result.stages_skipped.append("seo")
            result.verification_results["seo"] = True
            if not dry_run:
                self._update_state(idea_id, PipelineState.SEO_COMPLETE.value, seo_verified=True)
            return

        # GUARD CHECK
        guard = self.guard.can_generate_seo(idea_id)
        if not guard.allowed:
            result.stages_skipped.append("seo")
            result.verification_results["seo"] = False
            result.error = f"SEO blocked: {guard.reason}"
            return

        if dry_run:
            result.stages_completed.append("seo (dry_run)")
            result.verification_results["seo"] = True
            return

        # LOCK REGISTRATION — atomic CAS duplicate prevention (Fix BUG-1)
        job_id = str(uuid.uuid4())
        if not self.guard.register_active_job(idea_id, "seo", job_id):
            result.stages_skipped.append("seo")
            result.error = "Another job already active for this idea"
            return

        # ACT
        self._update_state(idea_id, PipelineState.SEO_GENERATING.value)
        try:
            from services.seo.seo_service import SEOService
            svc = SEOService(self.session)
            svc.generate_seo(idea_id, apply=True, force=False, use_browser=not skip_browser)

            # VERIFY
            self._update_state(idea_id, PipelineState.SEO_VERIFYING.value)
            if sg.has_seo(idea_id):
                self._update_state(idea_id, PipelineState.SEO_COMPLETE.value, seo_verified=True)
                result.stages_completed.append("seo")
                result.verification_results["seo"] = True
            else:
                self._update_state(idea_id, PipelineState.SEO_FAILED.value,
                                   failure_reason="Read-back verification failed: SEO still fallback/missing")
                result.stages_failed.append("seo")
                result.verification_results["seo"] = False
        except Exception as e:
            self._update_state(idea_id, PipelineState.SEO_FAILED.value, failure_reason=str(e))
            result.stages_failed.append("seo")
            result.verification_results["seo"] = False
            result.error = f"SEO generation failed: {e}"
        finally:
            self.guard.clear_active_job(idea_id)

    def _execute_video_stage(self, idea_id: int, result: PipelineExecutionResult, dry_run: bool) -> None:
        """CHECK: is video complete? → HARD GATE → ACT: render → VERIFY: file exists."""
        # CHECK
        if sg.has_video(idea_id):
            result.stages_skipped.append("video")
            result.verification_results["video"] = True
            if not dry_run:
                self._update_state(idea_id, PipelineState.VIDEO_COMPLETE.value, video_verified=True)
            return

        # HARD GATE (Rule 14)
        guard = self.guard.can_generate_video(idea_id)
        if not guard.allowed:
            result.stages_skipped.append("video")
            result.verification_results["video"] = False
            result.error = f"Video blocked: {guard.reason}"
            return

        if dry_run:
            result.stages_completed.append("video (dry_run)")
            result.verification_results["video"] = True
            return

        # LOCK REGISTRATION — atomic CAS duplicate prevention (Fix BUG-1)
        job_id = str(uuid.uuid4())
        if not self.guard.register_active_job(idea_id, "video", job_id):
            result.stages_skipped.append("video")
            result.error = "Another job already active for this idea"
            return

        # ACT
        self._update_state(idea_id, PipelineState.VIDEO_GENERATING.value)
        try:
            import run_stage_pipeline
            ok = run_stage_pipeline.do_video(idea_id, apply=True)

            # VERIFY
            self._update_state(idea_id, PipelineState.VIDEO_VERIFYING.value)
            if sg.has_video(idea_id):
                self._update_state(idea_id, PipelineState.VIDEO_COMPLETE.value, video_verified=True)
                result.stages_completed.append("video")
                result.verification_results["video"] = True
            else:
                self._update_state(idea_id, PipelineState.VIDEO_FAILED.value,
                                   failure_reason="Video render verification failed: no valid MP4 on disk")
                result.stages_failed.append("video")
                result.verification_results["video"] = False
        except Exception as e:
            self._update_state(idea_id, PipelineState.VIDEO_FAILED.value, failure_reason=str(e))
            result.stages_failed.append("video")
            result.verification_results["video"] = False
            result.error = f"Video generation failed: {e}"
        finally:
            self.guard.clear_active_job(idea_id)

    def _execute_package_stage(self, idea_id: int, result: PipelineExecutionResult, dry_run: bool, skip_browser: bool) -> None:
        """CHECK: is package complete? → ACT: package → VERIFY: folder files."""
        # CHECK
        if sg.has_package(idea_id):
            result.stages_skipped.append("package")
            result.verification_results["package"] = True
            if not dry_run:
                self._update_state(idea_id, PipelineState.COMPLETE.value, package_verified=True)
            return

        if dry_run:
            result.stages_completed.append("package (dry_run)")
            result.verification_results["package"] = True
            return

        # LOCK REGISTRATION — atomic CAS duplicate prevention (Fix BUG-1)
        job_id = str(uuid.uuid4())
        if not self.guard.register_active_job(idea_id, "package", job_id):
            result.stages_skipped.append("package")
            result.error = "Another job already active for this idea"
            return

        # ACT (Fix BUG-7: no spurious state reset)
        try:
            import os
            os.environ["PACKAGER_REAL_SEO"] = "1"
            import pipeline_packager
            pipeline_packager.process_idea_level10_package(idea_id, skip_browser=skip_browser)

            # VERIFY
            if sg.has_package(idea_id):
                self._update_state(idea_id, PipelineState.COMPLETE.value, package_verified=True)
                result.stages_completed.append("package")
                result.verification_results["package"] = True
            else:
                self._update_state(idea_id, PipelineState.ERROR.value, 
                                   failure_reason="Package verification failed: incomplete package folder")
                result.stages_failed.append("package")
                result.verification_results["package"] = False
                result.error = "Package verification failed: incomplete package folder"
        except Exception as e:
            self._update_state(idea_id, PipelineState.ERROR.value, failure_reason=f"Packaging failed: {e}")
            result.stages_failed.append("package")
            result.verification_results["package"] = False
            result.error = f"Packaging failed: {e}"
        finally:
            self.guard.clear_active_job(idea_id)

    # ------------------------------------------------------------------
    # Sequential Pipeline (Rule 5: Row-by-Row)
    # ------------------------------------------------------------------
    def run_sequential_pipeline(
        self,
        *,
        max_ideas: int = 10,
        dry_run: bool = True,
        skip_browser: bool = False,
    ) -> list[PipelineExecutionResult]:
        """
        Process ideas sequentially. Row 1 must be COMPLETE before Row 2 starts.
        """
        results: list[PipelineExecutionResult] = []
        for _ in range(max_ideas):
            next_id = self.discover_next_target()
            if next_id is None:
                break  # All ideas complete
            res = self.run_full_pipeline_for_idea(
                next_id, dry_run=dry_run, skip_browser=skip_browser
            )
            results.append(res)
            # Rule 5: stop if current idea is not complete
            if not res.is_complete:
                break
        return results
