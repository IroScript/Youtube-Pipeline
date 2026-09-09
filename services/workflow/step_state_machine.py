"""
REQ-052: Step State Machine Implementation
==========================================
Manages deterministic state transitions for step runs.
Valid States:
    PENDING, READY, RUNNING, RETRY_WAIT, SUCCESS, FAILED, SKIPPED, CANCELLED
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, Set
from datetime import datetime, timezone


class StepState(str, Enum):
    PENDING = "PENDING"
    READY = "READY"
    RUNNING = "RUNNING"
    RETRY_WAIT = "RETRY_WAIT"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"


class InvalidStepStateTransitionError(Exception):
    """Raised when an invalid step state transition is attempted."""
    pass


class StepStateMachine:
    """
    Deterministic finite state machine for workflow step executions.
    """

    ALLOWED_TRANSITIONS: Dict[StepState, Set[StepState]] = {
        StepState.PENDING: {StepState.READY, StepState.SKIPPED, StepState.CANCELLED},
        StepState.READY: {StepState.RUNNING, StepState.CANCELLED},
        StepState.RUNNING: {StepState.SUCCESS, StepState.FAILED, StepState.RETRY_WAIT, StepState.CANCELLED},
        StepState.RETRY_WAIT: {StepState.READY, StepState.FAILED, StepState.CANCELLED},
        StepState.SUCCESS: set(),   # Terminal
        StepState.FAILED: set(),    # Terminal
        StepState.SKIPPED: set(),   # Terminal
        StepState.CANCELLED: set(), # Terminal
    }

    TERMINAL_STATES = {StepState.SUCCESS, StepState.FAILED, StepState.SKIPPED, StepState.CANCELLED}

    @classmethod
    def can_transition(cls, from_state: StepState | str, to_state: StepState | str) -> bool:
        src = StepState(from_state)
        dst = StepState(to_state)
        return dst in cls.ALLOWED_TRANSITIONS.get(src, set())

    @classmethod
    def transition(cls, from_state: StepState | str, to_state: StepState | str) -> StepState:
        src = StepState(from_state)
        dst = StepState(to_state)
        if not cls.can_transition(src, dst):
            raise InvalidStepStateTransitionError(
                f"Invalid step transition from {src.value} to {dst.value}. "
                f"Allowed destinations: {[s.value for s in cls.ALLOWED_TRANSITIONS.get(src, set())]}"
            )
        return dst

    @classmethod
    def is_terminal(cls, state: StepState | str) -> bool:
        return StepState(state) in cls.TERMINAL_STATES
