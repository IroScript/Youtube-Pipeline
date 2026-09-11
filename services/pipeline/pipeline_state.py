from __future__ import annotations

from enum import Enum
from typing import Optional

class PipelineState(str, Enum):
    DISCOVERED = "DISCOVERED"
    PROMPT_MISSING = "PROMPT_MISSING"
    PROMPT_GENERATING = "PROMPT_GENERATING"
    PROMPT_VERIFYING = "PROMPT_VERIFYING"
    PROMPT_COMPLETE = "PROMPT_COMPLETE"
    PROMPT_FAILED = "PROMPT_FAILED"
    SEO_MISSING = "SEO_MISSING"
    SEO_GENERATING = "SEO_GENERATING"
    SEO_VERIFYING = "SEO_VERIFYING"
    SEO_COMPLETE = "SEO_COMPLETE"
    SEO_FAILED = "SEO_FAILED"
    READY_FOR_VIDEO = "READY_FOR_VIDEO"
    VIDEO_GENERATING = "VIDEO_GENERATING"
    VIDEO_VERIFYING = "VIDEO_VERIFYING"
    VIDEO_COMPLETE = "VIDEO_COMPLETE"
    VIDEO_FAILED = "VIDEO_FAILED"
    READY_FOR_UPLOAD = "READY_FOR_UPLOAD"
    UPLOADING = "UPLOADING"
    UPLOAD_VERIFYING = "UPLOAD_VERIFYING"
    UPLOAD_COMPLETE = "UPLOAD_COMPLETE"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    READY_FOR_SCHEDULE = "READY_FOR_SCHEDULE"
    SCHEDULED = "SCHEDULED"
    COMPLETE = "COMPLETE"
    PAUSED = "PAUSED"
    ERROR = "ERROR"

ALLOWED_TRANSITIONS = {
    PipelineState.DISCOVERED: [PipelineState.PROMPT_MISSING, PipelineState.SEO_MISSING, PipelineState.READY_FOR_VIDEO, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.PROMPT_MISSING: [PipelineState.PROMPT_GENERATING, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.PROMPT_GENERATING: [PipelineState.PROMPT_VERIFYING, PipelineState.PROMPT_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.PROMPT_VERIFYING: [PipelineState.PROMPT_COMPLETE, PipelineState.PROMPT_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.PROMPT_COMPLETE: [PipelineState.SEO_MISSING, PipelineState.READY_FOR_VIDEO, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.PROMPT_FAILED: [PipelineState.PROMPT_GENERATING, PipelineState.PAUSED, PipelineState.ERROR],
    
    PipelineState.SEO_MISSING: [PipelineState.SEO_GENERATING, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.SEO_GENERATING: [PipelineState.SEO_VERIFYING, PipelineState.SEO_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.SEO_VERIFYING: [PipelineState.SEO_COMPLETE, PipelineState.SEO_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.SEO_COMPLETE: [PipelineState.READY_FOR_VIDEO, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.SEO_FAILED: [PipelineState.SEO_GENERATING, PipelineState.PAUSED, PipelineState.ERROR],
    
    PipelineState.READY_FOR_VIDEO: [PipelineState.VIDEO_GENERATING, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.VIDEO_GENERATING: [PipelineState.VIDEO_VERIFYING, PipelineState.VIDEO_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.VIDEO_VERIFYING: [PipelineState.VIDEO_COMPLETE, PipelineState.VIDEO_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.VIDEO_COMPLETE: [PipelineState.READY_FOR_UPLOAD, PipelineState.COMPLETE, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.VIDEO_FAILED: [PipelineState.VIDEO_GENERATING, PipelineState.PAUSED, PipelineState.ERROR],
    
    PipelineState.READY_FOR_UPLOAD: [PipelineState.UPLOADING, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.UPLOADING: [PipelineState.UPLOAD_VERIFYING, PipelineState.UPLOAD_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.UPLOAD_VERIFYING: [PipelineState.UPLOAD_COMPLETE, PipelineState.UPLOAD_FAILED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.UPLOAD_COMPLETE: [PipelineState.READY_FOR_SCHEDULE, PipelineState.COMPLETE, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.UPLOAD_FAILED: [PipelineState.UPLOADING, PipelineState.PAUSED, PipelineState.ERROR],
    
    PipelineState.READY_FOR_SCHEDULE: [PipelineState.SCHEDULED, PipelineState.PAUSED, PipelineState.ERROR],
    PipelineState.SCHEDULED: [PipelineState.COMPLETE, PipelineState.PAUSED, PipelineState.ERROR],
    
    PipelineState.COMPLETE: [],
    PipelineState.PAUSED: [
        PipelineState.DISCOVERED, PipelineState.PROMPT_MISSING, PipelineState.PROMPT_GENERATING, PipelineState.PROMPT_VERIFYING,
        PipelineState.PROMPT_COMPLETE, PipelineState.PROMPT_FAILED, PipelineState.SEO_MISSING, PipelineState.SEO_GENERATING,
        PipelineState.SEO_VERIFYING, PipelineState.SEO_COMPLETE, PipelineState.SEO_FAILED, PipelineState.READY_FOR_VIDEO,
        PipelineState.VIDEO_GENERATING, PipelineState.VIDEO_VERIFYING, PipelineState.VIDEO_COMPLETE, PipelineState.VIDEO_FAILED,
        PipelineState.READY_FOR_UPLOAD, PipelineState.UPLOADING, PipelineState.UPLOAD_VERIFYING, PipelineState.UPLOAD_COMPLETE,
        PipelineState.UPLOAD_FAILED, PipelineState.READY_FOR_SCHEDULE, PipelineState.SCHEDULED, PipelineState.ERROR
    ],
    PipelineState.ERROR: [
        PipelineState.DISCOVERED, PipelineState.PROMPT_MISSING, PipelineState.SEO_MISSING, PipelineState.READY_FOR_VIDEO,
        PipelineState.READY_FOR_UPLOAD, PipelineState.READY_FOR_SCHEDULE, PipelineState.PAUSED
    ]
}

TERMINAL_STATES = {PipelineState.COMPLETE}
FAILURE_STATES = {PipelineState.PROMPT_FAILED, PipelineState.SEO_FAILED, PipelineState.VIDEO_FAILED, PipelineState.UPLOAD_FAILED, PipelineState.ERROR}

class InvalidPipelineTransitionError(Exception):
    pass

class PipelineStateMachine:
    @staticmethod
    def validate_transition(from_state: PipelineState, to_state: PipelineState) -> bool:
        if from_state not in ALLOWED_TRANSITIONS:
            return False
        return to_state in ALLOWED_TRANSITIONS[from_state]

    @staticmethod
    def transition(from_state: PipelineState, to_state: PipelineState) -> PipelineState:
        if not PipelineStateMachine.validate_transition(from_state, to_state):
            raise InvalidPipelineTransitionError(f"Invalid transition from {from_state} to {to_state}")
        return to_state

    @staticmethod
    def is_terminal(state: PipelineState) -> bool:
        return state in TERMINAL_STATES

    @staticmethod
    def is_failed(state: PipelineState) -> bool:
        return state in FAILURE_STATES

    @staticmethod
    def can_retry(state: PipelineState) -> bool:
        return PipelineStateMachine.is_failed(state) and state != PipelineState.ERROR

    @staticmethod
    def get_next_required_state(current_state: PipelineState) -> Optional[PipelineState]:
        happy_path = {
            PipelineState.DISCOVERED: PipelineState.PROMPT_MISSING,
            PipelineState.PROMPT_MISSING: PipelineState.PROMPT_GENERATING,
            PipelineState.PROMPT_GENERATING: PipelineState.PROMPT_VERIFYING,
            PipelineState.PROMPT_VERIFYING: PipelineState.PROMPT_COMPLETE,
            PipelineState.PROMPT_COMPLETE: PipelineState.SEO_MISSING,
            PipelineState.SEO_MISSING: PipelineState.SEO_GENERATING,
            PipelineState.SEO_GENERATING: PipelineState.SEO_VERIFYING,
            PipelineState.SEO_VERIFYING: PipelineState.SEO_COMPLETE,
            PipelineState.SEO_COMPLETE: PipelineState.READY_FOR_VIDEO,
            PipelineState.READY_FOR_VIDEO: PipelineState.VIDEO_GENERATING,
            PipelineState.VIDEO_GENERATING: PipelineState.VIDEO_VERIFYING,
            PipelineState.VIDEO_VERIFYING: PipelineState.VIDEO_COMPLETE,
            PipelineState.VIDEO_COMPLETE: PipelineState.READY_FOR_UPLOAD,
            PipelineState.READY_FOR_UPLOAD: PipelineState.UPLOADING,
            PipelineState.UPLOADING: PipelineState.UPLOAD_VERIFYING,
            PipelineState.UPLOAD_VERIFYING: PipelineState.UPLOAD_COMPLETE,
            PipelineState.UPLOAD_COMPLETE: PipelineState.READY_FOR_SCHEDULE,
            PipelineState.READY_FOR_SCHEDULE: PipelineState.SCHEDULED,
            PipelineState.SCHEDULED: PipelineState.COMPLETE,
        }
        return happy_path.get(current_state)
