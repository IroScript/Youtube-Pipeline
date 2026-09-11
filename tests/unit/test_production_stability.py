"""
Permanent Regression Tests — Production Pipeline Stability
============================================================
These tests cover Level 3-7 verified behaviors:
- Concurrency safety (atomic CAS guard)
- Pause gate enforcement
- Retry limit enforcement
- Crash recovery
- Sequential row processing
- Zero-blank validation
- Failure injection / dependency gates

Run with: python -m pytest tests/unit/test_production_stability.py -v
"""

import sys
import uuid
import concurrent.futures
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "PromptDatabase"))
sys.path.insert(0, str(REPO_ROOT))

from sqlmodel import Session, create_engine, select
from services.pipeline.pipeline_row_model import PipelineRowState
from services.pipeline.generation_guard import GenerationGuard, GuardResult
from services.pipeline.crash_recovery import CrashRecoveryEngine
from services.pipeline.failure_handler import FailureHandler, MAX_RETRIES
from services.pipeline.pause_resume import PauseResumeController
from services.pipeline.row_validator import RowValidator
from services.pipeline.production_orchestrator import ProductionOrchestrator
from services.pipeline.pipeline_state import PipelineState, FAILURE_STATES

DB_URL = f"sqlite:///{REPO_ROOT / 'PromptDatabase' / 'database' / 'youtube_pipeline.db'}"


def _engine():
    return create_engine(DB_URL, connect_args={"check_same_thread": False})


def _ensure_state(session: Session, idea_id: int, **overrides) -> PipelineRowState:
    state = session.exec(
        select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)
    ).first()
    if not state:
        state = PipelineRowState(
            uuid=str(uuid.uuid4()),
            idea_id=idea_id,
            current_state=overrides.get("current_state", PipelineState.DISCOVERED.value),
        )
        session.add(state)
    for k, v in overrides.items():
        setattr(state, k, v)
    session.commit()
    session.refresh(state)
    return state


# ── Concurrency Tests ────────────────────────────────────────────────

class TestConcurrencySafety:
    """Level 5: Concurrent duplicate execution must be prevented."""

    IDEA_ID = 200  # use high ID to avoid collision

    def setup_method(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID, active_job_id=None, active_job_type=None)

    def teardown_method(self):
        engine = _engine()
        with Session(engine) as session:
            guard = GenerationGuard(session)
            guard.clear_active_job(self.IDEA_ID)

    def test_atomic_cas_exactly_one_winner(self):
        """5 concurrent threads → exactly 1 acquires the lock."""
        def worker(tid):
            e = _engine()
            with Session(e) as s:
                g = GenerationGuard(s)
                return g.register_active_job(self.IDEA_ID, "TEST", f"t_{tid}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
            futures = [ex.submit(worker, i) for i in range(5)]
            results = [f.result() for f in futures]

        assert sum(results) == 1, f"Expected 1 winner, got {sum(results)}"

    def test_register_returns_bool(self):
        """register_active_job returns True on success, False if blocked."""
        engine = _engine()
        with Session(engine) as session:
            guard = GenerationGuard(session)
            r1 = guard.register_active_job(self.IDEA_ID, "T", "j1")
            r2 = guard.register_active_job(self.IDEA_ID, "T", "j2")
            assert r1 is True
            assert r2 is False

    def test_clear_allows_re_register(self):
        """After clearing, a new job can be registered."""
        engine = _engine()
        with Session(engine) as session:
            guard = GenerationGuard(session)
            guard.register_active_job(self.IDEA_ID, "T", "j1")
            guard.clear_active_job(self.IDEA_ID)
            r = guard.register_active_job(self.IDEA_ID, "T", "j2")
            assert r is True


# ── Pause Gate Tests ─────────────────────────────────────────────────

class TestPauseGate:
    """Level 5: Paused ideas must not execute any stages."""

    IDEA_ID = 9  # must be a real idea in the database

    def setup_method(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID, is_paused=False,
                          current_state=PipelineState.DISCOVERED.value)

    def teardown_method(self):
        engine = _engine()
        with Session(engine) as session:
            ctrl = PauseResumeController(session)
            try:
                ctrl.resume_idea(self.IDEA_ID)
            except Exception:
                pass

    def test_paused_idea_returns_error(self):
        """Pipeline execution on paused idea returns PAUSED error."""
        engine = _engine()
        with Session(engine) as session:
            ctrl = PauseResumeController(session)
            orch = ProductionOrchestrator(session)
            ctrl.pause_idea(self.IDEA_ID)
            result = orch.run_full_pipeline_for_idea(self.IDEA_ID, dry_run=True)
            assert "PAUSED" in (result.error or "")
            assert result.stages_completed == []
            assert result.stages_failed == []

    def test_resumed_idea_executes(self):
        """After resume, pipeline execution proceeds."""
        engine = _engine()
        with Session(engine) as session:
            ctrl = PauseResumeController(session)
            orch = ProductionOrchestrator(session)
            ctrl.pause_idea(self.IDEA_ID)
            ctrl.resume_idea(self.IDEA_ID)
            result = orch.run_full_pipeline_for_idea(self.IDEA_ID, dry_run=True)
            assert result.error is None or "PAUSED" not in (result.error or "")


# ── Retry Limit Tests ────────────────────────────────────────────────

class TestRetryLimits:
    """Level 4: Retry must respect MAX_RETRIES and terminal states."""

    IDEA_ID = 202

    def test_retry_allowed_under_limit(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID,
                          current_state=PipelineState.PROMPT_FAILED.value, retry_count=0)
            handler = FailureHandler(session)
            assert handler.can_proceed_after_failure(self.IDEA_ID) is True

    def test_retry_blocked_at_limit(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID,
                          current_state=PipelineState.PROMPT_FAILED.value,
                          retry_count=MAX_RETRIES)
            handler = FailureHandler(session)
            assert handler.can_proceed_after_failure(self.IDEA_ID) is False

    def test_error_state_no_retry(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID,
                          current_state=PipelineState.ERROR.value, retry_count=0)
            handler = FailureHandler(session)
            assert handler.can_proceed_after_failure(self.IDEA_ID) is False

    def test_all_failure_states_retryable(self):
        """Every FAILURE_STATE (except ERROR) is retryable at retry_count=0."""
        engine = _engine()
        with Session(engine) as session:
            handler = FailureHandler(session)
            for fs in FAILURE_STATES:
                if fs == PipelineState.ERROR:
                    continue
                _ensure_state(session, self.IDEA_ID,
                              current_state=fs.value, retry_count=0)
                assert handler.can_proceed_after_failure(self.IDEA_ID) is True, \
                    f"{fs.value} should be retryable at count=0"


# ── Crash Recovery Tests ─────────────────────────────────────────────

class TestCrashRecovery:
    """Level 5: In-flight states must be recovered to safe states."""

    IDEA_ID = 203

    def test_generating_state_recovered(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID,
                          current_state=PipelineState.PROMPT_GENERATING.value,
                          active_job_id="crashed_job")
            recovery = CrashRecoveryEngine(session)
            result = recovery.scan_and_recover()
            state = session.exec(
                select(PipelineRowState).where(PipelineRowState.idea_id == self.IDEA_ID)
            ).first()
            assert state.current_state != PipelineState.PROMPT_GENERATING.value
            assert state.active_job_id is None

    def test_recovery_is_idempotent(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID,
                          current_state=PipelineState.SEO_GENERATING.value,
                          active_job_id="crashed_seo")
            recovery = CrashRecoveryEngine(session)
            r1 = recovery.scan_and_recover()
            state1 = session.exec(
                select(PipelineRowState).where(PipelineRowState.idea_id == self.IDEA_ID)
            ).first()
            s1 = state1.current_state
            r2 = recovery.scan_and_recover()
            state2 = session.exec(
                select(PipelineRowState).where(PipelineRowState.idea_id == self.IDEA_ID)
            ).first()
            assert state2.current_state == s1  # same state = idempotent


# ── Zero-Blank Validation Tests ──────────────────────────────────────

class TestZeroBlankValidation:
    """Level 4: No incomplete row may reach COMPLETE."""

    def test_complete_idea_has_zero_missing(self):
        """Ideas #1 and #2 are known-complete — must have 0 missing fields."""
        validator = RowValidator()
        for iid in [1, 2]:
            result = validator.validate_all(iid)
            assert result.is_complete, f"Idea #{iid} should be complete"
            assert len(result.missing_fields) == 0, f"Idea #{iid} has missing: {result.missing_fields}"

    def test_incomplete_idea_blocked(self):
        """Idea #4 has prompt but no SEO — must NOT be complete."""
        validator = RowValidator()
        result = validator.validate_all(4)
        assert not result.is_complete
        assert len(result.missing_fields) > 0


# ── Dependency Gate Tests ────────────────────────────────────────────

class TestDependencyGates:
    """Level 3-4: Dependency chain enforcement."""

    def test_no_prompt_blocks_seo(self):
        """Idea without prompt → SEO generation blocked."""
        engine = _engine()
        with Session(engine) as session:
            guard = GenerationGuard(session)
            # Find idea without prompt (idea #60+)
            import stage_gates as sg
            for iid in range(60, 132):
                if not sg.has_escalation(iid):
                    result = guard.can_generate_seo(iid)
                    assert not result.allowed, f"SEO should be blocked for idea #{iid} (no prompt)"
                    return
            pytest.skip("All ideas have prompts — cannot test this gate")

    def test_no_seo_blocks_video(self):
        """Idea with prompt but no SEO → video generation blocked."""
        engine = _engine()
        with Session(engine) as session:
            guard = GenerationGuard(session)
            result = guard.can_generate_video(4)  # has prompt, no SEO
            assert not result.allowed
            assert "SEO" in result.reason

    def test_prompt_seo_allows_video(self):
        """Idea with both prompt and SEO → video generation allowed."""
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, 3, active_job_id=None, active_job_type=None)
            guard = GenerationGuard(session)
            result = guard.can_generate_video(3)  # has prompt + SEO, no video
            assert result.allowed


# ── Sequential Processing Tests ──────────────────────────────────────

class TestSequentialProcessing:
    """Level 3: Row-by-row processing verified."""

    def test_discover_next_skips_complete(self):
        """discover_next_target skips complete ideas #1, #2 → returns #3."""
        engine = _engine()
        with Session(engine) as session:
            orch = ProductionOrchestrator(session)
            nxt = orch.discover_next_target()
            assert nxt == 3, f"Expected 3, got {nxt}"

    def test_sequential_stops_on_incomplete(self):
        """run_sequential_pipeline stops when a row is not complete."""
        engine = _engine()
        with Session(engine) as session:
            orch = ProductionOrchestrator(session)
            results = orch.run_sequential_pipeline(max_ideas=5, dry_run=True)
            assert len(results) >= 1
            # Should have processed #3 first
            assert results[0].idea_id == 3


# ── Failure Injection Tests ──────────────────────────────────────────

class TestFailureInjection:
    """Level 4: Controlled failure → correct state + gate behavior."""

    IDEA_ID = 204

    def test_seo_failure_blocks_video(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID,
                          current_state=PipelineState.SEO_FAILED.value,
                          failure_reason="Injected test failure")
            guard = GenerationGuard(session)
            result = guard.can_generate_video(self.IDEA_ID)
            assert not result.allowed

    def test_failure_info_recorded(self):
        engine = _engine()
        with Session(engine) as session:
            _ensure_state(session, self.IDEA_ID,
                          current_state=PipelineState.PROMPT_FAILED.value,
                          failure_reason="Test failure reason",
                          retry_count=1)
            handler = FailureHandler(session)
            info = handler.get_failure_info(self.IDEA_ID)
            assert info["current_state"] == PipelineState.PROMPT_FAILED.value
            assert info["failure_reason"] == "Test failure reason"
            assert info["retry_count"] == 1
            assert info["can_retry"] is True
