"""
Retry & Resilience Engine
=========================
Manages exponential backoff retries, attempt accounting, failure tracking,
and state transitions for workflow executions.
Supports the required lifecycle:
    Attempt 1 (fail) -> wait backoff -> Attempt 2 (fail) -> wait backoff -> Attempt 3 (success)
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Optional, Callable, Any, Dict
from sqlmodel import Session

from domain.workflows.execution_model import WorkflowExecution
from services.workflow.exec_state_machine import ExecutionState
from services.reliability.backoff import BackoffEngine
from repositories.execution_repository import ExecutionRepository


@dataclass
class RetryDecision:
    should_retry: bool
    attempt_count: int
    max_attempts: int
    backoff_delay: float
    next_retry_time: Optional[datetime]
    error_message: Optional[str]


class RetryEngine:
    """
    Stateful retry coordinator managing execution attempts, backoff calculation,
    and durable database state transitions.
    """

    @classmethod
    def calculate_backoff(
        cls,
        attempt: int,
        initial_delay: float = 1.0,
        factor: float = 2.0,
        max_delay: float = 300.0,
        jitter: bool = False,
    ) -> float:
        """Calculates deterministic or jittered exponential backoff delay."""
        return BackoffEngine.calculate_delay(
            attempt=attempt,
            initial_delay=initial_delay,
            factor=factor,
            max_delay=max_delay,
            jitter=jitter,
        )

    @classmethod
    def evaluate_retry(
        cls,
        execution: WorkflowExecution,
        error: Exception | str,
        initial_delay: float = 1.0,
        factor: float = 2.0,
        max_delay: float = 300.0,
    ) -> RetryDecision:
        """
        Evaluates retry feasibility for an execution given an error.
        Increments attempt count and calculates the next retry schedule.
        """
        err_msg = str(error)
        next_attempt = execution.attempt_count + 1
        should_retry = next_attempt < execution.max_attempts

        now = datetime.now(timezone.utc)
        if should_retry:
            delay = cls.calculate_backoff(
                attempt=next_attempt,
                initial_delay=initial_delay,
                factor=factor,
                max_delay=max_delay,
                jitter=False,
            )
            next_retry_time = now + timedelta(seconds=delay)
        else:
            delay = 0.0
            next_retry_time = None

        return RetryDecision(
            should_retry=should_retry,
            attempt_count=next_attempt,
            max_attempts=execution.max_attempts,
            backoff_delay=delay,
            next_retry_time=next_retry_time,
            error_message=err_msg,
        )

    @classmethod
    def handle_failure(
        cls,
        execution_id: str,
        error: Exception | str,
        session: Session,
        initial_delay: float = 1.0,
        factor: float = 2.0,
    ) -> WorkflowExecution:
        """
        Records an execution failure and updates the execution status in the database.
        Transitions to RETRY_WAIT if attempts remain, or FAILED if max attempts reached.
        """
        repo = ExecutionRepository(session)
        execution = repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution #{execution_id} not found")

        decision = cls.evaluate_retry(execution, error, initial_delay=initial_delay, factor=factor)
        updated = repo.record_failure(
            execution_id=execution_id,
            error_message=decision.error_message or "Unknown error",
            next_retry_time=decision.next_retry_time,
        )
        from shared.logging import ExecutionLogger
        ExecutionLogger.log_retry_attempt(
            execution_id=execution_id,
            idea_id=getattr(execution, "idea_id", None) or getattr(execution, "video_id", "workflow"),
            step_key=getattr(execution, "current_step_key", "execute_step") or "execute_step",
            attempt_number=decision.attempt_count,
            max_attempts=decision.max_attempts,
            status="RETRY_SCHEDULED" if decision.should_retry else "RETRY_EXHAUSTED",
            details={
                "delay_seconds": decision.backoff_delay,
                "error": decision.error_message,
                "next_retry_time": decision.next_retry_time.isoformat() if decision.next_retry_time else None,
            },
        )
        return updated

    @classmethod
    def execute_with_retry(
        cls,
        operation: Callable[[], Any],
        execution_id: str,
        session: Session,
        initial_delay: float = 0.1,
        factor: float = 2.0,
        sleep_fn: Callable[[float], None] = time.sleep,
    ) -> Any:
        """
        Executes a callable with automated retry loops and persistent DB tracking.
        Demonstrates: Attempt 1 fail -> wait -> Attempt 2 fail -> wait -> Attempt 3 success.
        """
        repo = ExecutionRepository(session)
        execution = repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution #{execution_id} not found")

        if execution.status == ExecutionState.CREATED.value:
            repo.update_status(execution_id, ExecutionState.RUNNING.value)

        last_err: Optional[Exception] = None

        while execution.attempt_count < execution.max_attempts:
            try:
                # Mark as running on attempt
                if execution.status in (ExecutionState.RETRY_WAIT.value, ExecutionState.QUEUED.value):
                    repo.record_retry(execution_id)

                result = operation()
                # On success: persist SUCCESS
                output_data = result if isinstance(result, dict) else {"result": str(result)}
                repo.record_success(execution_id, output_context=output_data)
                return result
            except Exception as e:
                last_err = e
                updated = cls.handle_failure(
                    execution_id=execution_id,
                    error=e,
                    session=session,
                    initial_delay=initial_delay,
                    factor=factor,
                )
                execution = updated

                if updated.status == ExecutionState.RETRY_WAIT.value:
                    delay = cls.calculate_backoff(
                        attempt=updated.attempt_count,
                        initial_delay=initial_delay,
                        factor=factor,
                    )
                    sleep_fn(delay)
                else:
                    # Max attempts exceeded, status is FAILED
                    break

        if last_err:
            raise last_err
        raise RuntimeError(f"Execution #{execution_id} exhausted all {execution.max_attempts} attempts without success.")
