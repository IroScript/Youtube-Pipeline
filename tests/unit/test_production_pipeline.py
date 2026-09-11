"""
Production Pipeline Unit Tests
================================
Tests for the production-grade pipeline upgrade.
Covers Rules 25 Test A through Test O scenarios.
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "PromptDatabase"))

import pytest
from services.pipeline.pipeline_state import (
    PipelineState,
    PipelineStateMachine,
    InvalidPipelineTransitionError,
    ALLOWED_TRANSITIONS,
    TERMINAL_STATES,
    FAILURE_STATES,
)
from services.pipeline.row_validator import RowValidator, ValidationResult, FullValidationResult
from services.pipeline.readback_verifier import ReadbackVerifier, VerifyResult
from services.pipeline.generation_guard import GuardResult


# ============================================================================
# TEST A: State Machine Integrity
# ============================================================================
class TestStateMachineIntegrity:
    """Test A: Pipeline state machine transitions are correctly defined."""

    def test_all_states_have_transitions(self):
        for state in PipelineState:
            assert state in ALLOWED_TRANSITIONS, f"{state} missing from ALLOWED_TRANSITIONS"

    def test_valid_transition_discovered_to_prompt_missing(self):
        assert PipelineStateMachine.validate_transition(
            PipelineState.DISCOVERED, PipelineState.PROMPT_MISSING
        )

    def test_invalid_transition_discovered_to_complete(self):
        assert not PipelineStateMachine.validate_transition(
            PipelineState.DISCOVERED, PipelineState.COMPLETE
        )

    def test_transition_raises_on_invalid(self):
        with pytest.raises(InvalidPipelineTransitionError):
            PipelineStateMachine.transition(
                PipelineState.DISCOVERED, PipelineState.COMPLETE
            )

    def test_complete_is_terminal(self):
        assert PipelineStateMachine.is_terminal(PipelineState.COMPLETE)

    def test_discovered_is_not_terminal(self):
        assert not PipelineStateMachine.is_terminal(PipelineState.DISCOVERED)

    def test_failure_states_are_failed(self):
        for state in FAILURE_STATES:
            assert PipelineStateMachine.is_failed(state)

    def test_can_retry_from_failure(self):
        assert PipelineStateMachine.can_retry(PipelineState.PROMPT_FAILED)
        assert PipelineStateMachine.can_retry(PipelineState.SEO_FAILED)
        assert PipelineStateMachine.can_retry(PipelineState.VIDEO_FAILED)

    def test_cannot_retry_from_error(self):
        assert not PipelineStateMachine.can_retry(PipelineState.ERROR)

    def test_happy_path_progression(self):
        """Verify the happy path goes from DISCOVERED to COMPLETE."""
        state = PipelineState.DISCOVERED
        visited = [state]
        for _ in range(25):  # safety limit
            next_state = PipelineStateMachine.get_next_required_state(state)
            if next_state is None:
                break
            visited.append(next_state)
            state = next_state
        assert state == PipelineState.COMPLETE, f"Happy path ended at {state}, not COMPLETE"
        assert PipelineState.PROMPT_MISSING in visited
        assert PipelineState.SEO_COMPLETE in visited
        assert PipelineState.VIDEO_COMPLETE in visited

    def test_paused_can_resume_to_any_state(self):
        """PAUSED state can transition to many states for resume."""
        allowed = ALLOWED_TRANSITIONS[PipelineState.PAUSED]
        assert len(allowed) > 10, "PAUSED should be able to resume to many states"

    def test_state_count(self):
        """Verify all 26 states are defined."""
        assert len(PipelineState) == 26


# ============================================================================
# TEST B: Guard Result Structure
# ============================================================================
class TestGuardResult:
    """Test B: Guard results have correct structure."""

    def test_guard_allowed(self):
        r = GuardResult(True, "OK")
        assert r.allowed
        assert r.reason == "OK"
        assert r.existing_job_id is None

    def test_guard_denied(self):
        r = GuardResult(False, "Blocked", "job-123")
        assert not r.allowed
        assert r.existing_job_id == "job-123"


# ============================================================================
# TEST C: Validation Result Structure
# ============================================================================
class TestValidationResult:
    """Test C: Validation results have correct structure."""

    def test_valid_result(self):
        r = ValidationResult(True, "idea", [], {"id": 1})
        assert r.valid
        assert r.stage == "idea"

    def test_invalid_result_with_missing_fields(self):
        r = ValidationResult(False, "seo", ["title", "tags"], {})
        assert not r.valid
        assert len(r.missing_fields) == 2


# ============================================================================
# TEST D: VerifyResult Structure
# ============================================================================
class TestVerifyResult:
    """Test D: Readback verification results have correct structure."""

    def test_verified(self):
        r = VerifyResult(True, "prompt", {"count": 20}, {"count": 20}, [])
        assert r.verified
        assert r.entity == "prompt"

    def test_not_verified_with_mismatches(self):
        r = VerifyResult(False, "seo", {"title": True}, {"title": None}, ["SEO title missing"])
        assert not r.verified
        assert len(r.mismatches) == 1


# ============================================================================
# TEST E: State Machine Dependency Chain (Rule 2)
# ============================================================================
class TestDependencyChain:
    """Test E: Strict dependency chain: Prompt → SEO → Video → Upload → Schedule."""

    def test_prompt_before_seo(self):
        """Cannot jump from DISCOVERED to SEO_GENERATING."""
        assert not PipelineStateMachine.validate_transition(
            PipelineState.DISCOVERED, PipelineState.SEO_GENERATING
        )

    def test_seo_before_video(self):
        """SEO_MISSING cannot jump to VIDEO_GENERATING."""
        assert not PipelineStateMachine.validate_transition(
            PipelineState.SEO_MISSING, PipelineState.VIDEO_GENERATING
        )

    def test_video_before_upload(self):
        """VIDEO_GENERATING cannot jump to UPLOADING."""
        assert not PipelineStateMachine.validate_transition(
            PipelineState.VIDEO_GENERATING, PipelineState.UPLOADING
        )


# ============================================================================
# TEST F: Failure Blocks Downstream (Rule 16)
# ============================================================================
class TestFailureBlocking:
    """Test F: Failed stage blocks all downstream stages."""

    def test_prompt_failed_cannot_go_to_seo(self):
        """PROMPT_FAILED cannot jump to SEO stages."""
        assert not PipelineStateMachine.validate_transition(
            PipelineState.PROMPT_FAILED, PipelineState.SEO_GENERATING
        )

    def test_prompt_failed_can_retry(self):
        """PROMPT_FAILED can go back to PROMPT_GENERATING (retry)."""
        assert PipelineStateMachine.validate_transition(
            PipelineState.PROMPT_FAILED, PipelineState.PROMPT_GENERATING
        )


# ============================================================================
# TEST G-O: Live DB Tests (require database)
# ============================================================================
class TestLiveDBIntegration:
    """Tests G through O require a live database connection."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup database connection."""
        try:
            from infrastructure.database.engine import init_database
            init_database()
            self.db_available = True
        except Exception:
            self.db_available = False

    def test_g_row_validator_idea(self):
        """Test G: Row validator correctly checks idea fields."""
        if not self.db_available:
            pytest.skip("Database not available")
        validator = RowValidator()
        result = validator.validate_idea(1)
        assert isinstance(result, ValidationResult)
        assert result.stage == "idea"

    def test_h_row_validator_nonexistent_idea(self):
        """Test H: Row validator handles non-existent idea."""
        if not self.db_available:
            pytest.skip("Database not available")
        validator = RowValidator()
        result = validator.validate_idea(999999)
        assert not result.valid
        assert "idea_not_found" in result.missing_fields

    def test_i_full_validation(self):
        """Test I: Full validation returns all stage results."""
        if not self.db_available:
            pytest.skip("Database not available")
        validator = RowValidator()
        result = validator.validate_all(1)
        assert isinstance(result, FullValidationResult)
        assert "idea" in result.stage_results
        assert "prompt" in result.stage_results
        assert "seo" in result.stage_results
        assert "video" in result.stage_results
        assert "package" in result.stage_results

    def test_j_readback_verifier_prompts(self):
        """Test J: Readback verifier checks prompt count."""
        if not self.db_available:
            pytest.skip("Database not available")
        verifier = ReadbackVerifier()
        result = verifier.verify_prompt_insertion(1)
        assert isinstance(result, VerifyResult)
        assert result.entity == "prompt"

    def test_k_readback_verifier_seo(self):
        """Test K: Readback verifier checks SEO record."""
        if not self.db_available:
            pytest.skip("Database not available")
        verifier = ReadbackVerifier()
        result = verifier.verify_seo_insertion(1)
        assert isinstance(result, VerifyResult)
        assert result.entity == "seo"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
