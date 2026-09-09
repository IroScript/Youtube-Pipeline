"""
Execution State Repository
==========================
Encapsulates all database operations and status transitions for WorkflowExecution.
Supports states: CREATED, QUEUED, RUNNING, PAUSED, SUCCESS, FAILED, RETRY_WAIT, CANCELLED.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlmodel import Session, select

from domain.workflows.execution_model import WorkflowExecution
from services.workflow.exec_state_machine import ExecutionStateMachine, ExecutionState
from repositories.base_repository import BaseRepository


class ExecutionRepository(BaseRepository[WorkflowExecution]):
    def __init__(self, session: Session):
        super().__init__(WorkflowExecution, session)

    def get_by_id(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Fetch a single WorkflowExecution by its UUID string primary key."""
        return self.session.get(WorkflowExecution, str(execution_id))

    def create_execution(
        self,
        idea_id: Optional[int] = None,
        video_id: Optional[int] = None,
        context_data: Optional[Dict[str, Any]] = None,
        max_attempts: int = 3,
        workflow_version_id: Optional[str] = None,
    ) -> WorkflowExecution:
        """Creates and persists a new WorkflowExecution in CREATED state."""
        execution = WorkflowExecution(
            id=str(uuid.uuid4()),
            idea_id=idea_id,
            video_id=video_id,
            workflow_version_id=workflow_version_id or "wf_ver_default_v1",
            status=ExecutionState.CREATED.value,
            attempt_count=0,
            max_attempts=max_attempts,
            context_data=context_data or {},
            definition_snapshot={},
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(execution)
        self.session.commit()
        self.session.refresh(execution)
        return execution

    def update_status(
        self,
        execution_id: str,
        new_state: ExecutionState | str,
        error_message: Optional[str] = None,
    ) -> WorkflowExecution:
        """Transitions execution state using deterministic ExecutionStateMachine rules."""
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution #{execution_id} not found")

        target_state = new_state.value if isinstance(new_state, ExecutionState) else str(new_state)
        # Validate via state machine
        ExecutionStateMachine.transition(execution.status, target_state)

        now = datetime.now(timezone.utc)
        execution.status = target_state
        execution.updated_at = now

        if target_state == ExecutionState.RUNNING.value and not execution.started_at:
            execution.started_at = now
        elif target_state in (ExecutionState.SUCCESS.value, ExecutionState.COMPLETED.value, ExecutionState.FAILED.value, ExecutionState.CANCELLED.value):
            execution.completed_at = now

        if error_message:
            execution.error_message = error_message
            execution.error_summary = error_message

        self.session.add(execution)
        self.session.commit()
        self.session.refresh(execution)
        return execution

    def pause_execution(self, execution_id: str) -> WorkflowExecution:
        """Transitions an active or queued execution into PAUSED state."""
        return self.update_status(execution_id, ExecutionState.PAUSED)

    def resume_execution(self, execution_id: str) -> WorkflowExecution:
        """Resumes a PAUSED execution back to RUNNING state."""
        return self.update_status(execution_id, ExecutionState.RUNNING)

    def record_failure(
        self,
        execution_id: str,
        error_message: str,
        next_retry_time: Optional[datetime] = None,
    ) -> WorkflowExecution:
        """
        Records a failure event. If next_retry_time is provided, transitions
        to RETRY_WAIT; otherwise marks as permanent FAILED.
        """
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution #{execution_id} not found")

        now = datetime.now(timezone.utc)
        execution.attempt_count += 1
        execution.error_message = error_message
        execution.error_summary = error_message
        execution.last_failure_time = now
        execution.updated_at = now

        if next_retry_time and execution.attempt_count < execution.max_attempts:
            execution.next_retry_time = next_retry_time
            ExecutionStateMachine.transition(execution.status, ExecutionState.RETRY_WAIT.value)
            execution.status = ExecutionState.RETRY_WAIT.value
        else:
            execution.next_retry_time = None
            ExecutionStateMachine.transition(execution.status, ExecutionState.FAILED.value)
            execution.status = ExecutionState.FAILED.value
            execution.completed_at = now

        self.session.add(execution)
        self.session.commit()
        self.session.refresh(execution)
        return execution

    def record_success(
        self,
        execution_id: str,
        output_context: Optional[Dict[str, Any]] = None,
    ) -> WorkflowExecution:
        """Records successful execution completion."""
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution #{execution_id} not found")

        now = datetime.now(timezone.utc)
        ExecutionStateMachine.transition(execution.status, ExecutionState.SUCCESS.value)
        execution.status = ExecutionState.SUCCESS.value
        execution.completed_at = now
        execution.updated_at = now
        if output_context:
            merged = dict(execution.context_data or {})
            merged.update(output_context)
            execution.context_data = merged

        self.session.add(execution)
        self.session.commit()
        self.session.refresh(execution)
        return execution

    def record_retry(self, execution_id: str) -> WorkflowExecution:
        """Prepares an execution in RETRY_WAIT, PAUSED, or FAILED state for another attempt."""
        execution = self.get_by_id(execution_id)
        if not execution:
            raise ValueError(f"Execution #{execution_id} not found")

        ExecutionStateMachine.transition(execution.status, ExecutionState.RUNNING.value)
        now = datetime.now(timezone.utc)
        execution.status = ExecutionState.RUNNING.value
        execution.updated_at = now
        execution.next_retry_time = None

        self.session.add(execution)
        self.session.commit()
        self.session.refresh(execution)
        return execution
