"""
Workflow Execution Service
==========================
Coordinates execution lifecycles, state machine transitions, pausing, resuming,
and automated retry resilience via the ExecutionRepository and RetryEngine.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Dict, Any, Callable
from sqlmodel import Session

from domain.workflows.execution_model import WorkflowExecution
from services.workflow.exec_state_machine import ExecutionStateMachine, ExecutionState
from services.reliability.retry_engine import RetryEngine
from repositories.execution_repository import ExecutionRepository


class ExecutionService:
    def __init__(self, session: Session):
        self.session = session
        self.repo = ExecutionRepository(session)

    def create_execution(
        self,
        idea_id: Optional[int] = None,
        video_id: Optional[int] = None,
        max_attempts: int = 3,
        context_data: Optional[Dict[str, Any]] = None,
        workflow_version_id: Optional[str] = None,
    ) -> WorkflowExecution:
        """Creates a new durable execution record."""
        return self.repo.create_execution(
            idea_id=idea_id,
            video_id=video_id,
            context_data=context_data,
            max_attempts=max_attempts,
            workflow_version_id=workflow_version_id,
        )

    def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Fetches execution by ID."""
        return self.repo.get_by_id(execution_id)

    def pause_execution(self, execution_id: str) -> WorkflowExecution:
        """Pauses a running or queued execution."""
        return self.repo.pause_execution(execution_id)

    def resume_execution(self, execution_id: str) -> WorkflowExecution:
        """Resumes a paused execution."""
        return self.repo.resume_execution(execution_id)

    def retry_execution(
        self,
        execution_id: str,
        operation: Optional[Callable[[], Any]] = None,
    ) -> WorkflowExecution:
        """
        Manually triggers a retry for an execution in RETRY_WAIT, PAUSED, or FAILED state.
        If an operation callable is passed, executes it using the RetryEngine.
        """
        execution = self.repo.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution #{execution_id} not found")

        # Prepare for retry
        retried = self.repo.record_retry(execution_id)

        if operation:
            RetryEngine.execute_with_retry(
                operation=operation,
                execution_id=execution_id,
                session=self.session,
            )
            retried = self.repo.get_by_id(execution_id)

        return retried

    def run_with_retry(
        self,
        execution_id: str,
        operation: Callable[[], Any],
        initial_delay: float = 0.1,
    ) -> Any:
        """Runs a callable within this execution using full retry loop."""
        return RetryEngine.execute_with_retry(
            operation=operation,
            execution_id=execution_id,
            session=self.session,
            initial_delay=initial_delay,
        )
