"""
REQ-053: Execution State Machine Implementation
==============================================
Manages lifecycle transitions for overall workflow executions.
Valid States:
    CREATED, QUEUED, RUNNING, PAUSED, MIGRATING, COMPLETED, FAILED, DEAD_LETTER, CANCELLED
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, Set


class ExecutionState(str, Enum):
    CREATED = "CREATED"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    MIGRATING = "MIGRATING"
    COMPLETED = "COMPLETED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    RETRY_WAIT = "RETRY_WAIT"
    DEAD_LETTER = "DEAD_LETTER"
    CANCELLED = "CANCELLED"


class InvalidExecutionStateTransitionError(Exception):
    """Raised when an invalid execution state transition is attempted."""
    pass


class ExecutionStateMachine:
    """
    Deterministic finite state machine for workflow executions.
    """

    ALLOWED_TRANSITIONS: Dict[ExecutionState, Set[ExecutionState]] = {
        ExecutionState.CREATED: {ExecutionState.QUEUED, ExecutionState.RUNNING, ExecutionState.CANCELLED},
        ExecutionState.QUEUED: {ExecutionState.RUNNING, ExecutionState.CANCELLED},
        ExecutionState.RUNNING: {
            ExecutionState.RUNNING,
            ExecutionState.PAUSED,
            ExecutionState.MIGRATING,
            ExecutionState.COMPLETED,
            ExecutionState.SUCCESS,
            ExecutionState.FAILED,
            ExecutionState.RETRY_WAIT,
            ExecutionState.DEAD_LETTER,
            ExecutionState.CANCELLED,
        },
        ExecutionState.PAUSED: {ExecutionState.RUNNING, ExecutionState.QUEUED, ExecutionState.CANCELLED},
        ExecutionState.RETRY_WAIT: {ExecutionState.RUNNING, ExecutionState.QUEUED, ExecutionState.FAILED, ExecutionState.CANCELLED},
        ExecutionState.MIGRATING: {ExecutionState.RUNNING, ExecutionState.FAILED, ExecutionState.CANCELLED},
        ExecutionState.DEAD_LETTER: {ExecutionState.QUEUED, ExecutionState.CANCELLED},  # Replay / manual fix
        ExecutionState.COMPLETED: set(),  # Terminal
        ExecutionState.SUCCESS: set(),  # Terminal
        ExecutionState.FAILED: {ExecutionState.QUEUED, ExecutionState.RUNNING, ExecutionState.RETRY_WAIT, ExecutionState.CANCELLED},  # Re-run / retry failed execution
        ExecutionState.CANCELLED: set(),  # Terminal
    }

    TERMINAL_STATES = {ExecutionState.SUCCESS, ExecutionState.COMPLETED, ExecutionState.CANCELLED}

    @classmethod
    def can_transition(cls, from_state: ExecutionState | str, to_state: ExecutionState | str) -> bool:
        src = ExecutionState(from_state)
        dst = ExecutionState(to_state)
        return dst in cls.ALLOWED_TRANSITIONS.get(src, set())

    @classmethod
    def transition(cls, from_state: ExecutionState | str, to_state: ExecutionState | str) -> ExecutionState:
        src = ExecutionState(from_state)
        dst = ExecutionState(to_state)
        if not cls.can_transition(src, dst):
            raise InvalidExecutionStateTransitionError(
                f"Invalid execution transition from {src.value} to {dst.value}. "
                f"Allowed destinations: {[s.value for s in cls.ALLOWED_TRANSITIONS.get(src, set())]}"
            )
        return dst

    @classmethod
    def is_terminal(cls, state: ExecutionState | str) -> bool:
        return ExecutionState(state) in cls.TERMINAL_STATES
