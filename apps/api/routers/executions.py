"""
Workflow Executions & Control Plane Router
==========================================
Endpoints for tracking, pausing, resuming, and retrying durable workflow executions.
States: CREATED, QUEUED, RUNNING, PAUSED, SUCCESS, FAILED, RETRY_WAIT, CANCELLED.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_execution_service
from services.workflow.execution_service import ExecutionService
from shared.contracts.schemas import (
    ExecutionCreateRequest,
    ExecutionResponse,
    ExecutionActionResponse,
)

router = APIRouter(prefix="/executions", tags=["Workflow Executions & Control Plane"])


@router.post("", response_model=ExecutionResponse)
def create_execution(
    payload: ExecutionCreateRequest,
    service: ExecutionService = Depends(get_execution_service),
):
    """Creates a new durable execution record."""
    try:
        rec = service.create_execution(
            idea_id=payload.idea_id,
            video_id=payload.video_id,
            max_attempts=payload.max_attempts,
            context_data=payload.context_data,
        )
        return ExecutionResponse(
            id=rec.id,
            status=rec.status,
            idea_id=rec.idea_id,
            video_id=rec.video_id,
            attempt_count=rec.attempt_count,
            max_attempts=rec.max_attempts,
            error_message=rec.error_message,
            last_failure_time=rec.last_failure_time,
            next_retry_time=rec.next_retry_time,
            started_at=rec.started_at,
            completed_at=rec.completed_at,
            created_at=rec.created_at,
            updated_at=rec.updated_at,
            context_data=rec.context_data or {},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{execution_id}", response_model=ExecutionResponse)
def get_execution(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
):
    """Fetches full state, attempt history, and retry schedule of an execution."""
    rec = service.get_execution(execution_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Execution #{execution_id} not found")

    return ExecutionResponse(
        id=rec.id,
        status=rec.status,
        idea_id=rec.idea_id,
        video_id=rec.video_id,
        attempt_count=rec.attempt_count,
        max_attempts=rec.max_attempts,
        error_message=rec.error_message,
        last_failure_time=rec.last_failure_time,
        next_retry_time=rec.next_retry_time,
        started_at=rec.started_at,
        completed_at=rec.completed_at,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
        context_data=rec.context_data or {},
    )


@router.post("/{execution_id}/pause", response_model=ExecutionActionResponse)
def pause_execution(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
):
    """Pauses an active or queued execution."""
    try:
        prev = service.get_execution(execution_id)
        prev_status = prev.status if prev else None
        updated = service.pause_execution(execution_id)
        from shared.logging import ExecutionLogger
        ExecutionLogger.log_state_change(
            execution_id=execution_id,
            idea_id=updated.idea_id,
            step_key="workflow_control",
            from_state=str(prev_status),
            to_state=updated.status,
            attempt_number=updated.attempt_count,
        )
        return ExecutionActionResponse(
            status="success",
            execution_id=execution_id,
            previous_status=prev_status,
            new_status=updated.status,
            attempt_count=updated.attempt_count,
            message="Execution successfully paused",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{execution_id}/resume", response_model=ExecutionActionResponse)
def resume_execution(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
):
    """Resumes a paused execution back to RUNNING state."""
    try:
        prev = service.get_execution(execution_id)
        prev_status = prev.status if prev else None
        updated = service.resume_execution(execution_id)
        from shared.logging import ExecutionLogger
        ExecutionLogger.log_state_change(
            execution_id=execution_id,
            idea_id=updated.idea_id,
            step_key="workflow_control",
            from_state=str(prev_status),
            to_state=updated.status,
            attempt_number=updated.attempt_count,
        )
        return ExecutionActionResponse(
            status="success",
            execution_id=execution_id,
            previous_status=prev_status,
            new_status=updated.status,
            attempt_count=updated.attempt_count,
            message="Execution successfully resumed",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{execution_id}/retry", response_model=ExecutionActionResponse)
def retry_execution(
    execution_id: str,
    service: ExecutionService = Depends(get_execution_service),
):
    """Retries a failed, paused, or retry_wait execution."""
    try:
        prev = service.get_execution(execution_id)
        prev_status = prev.status if prev else None
        updated = service.retry_execution(execution_id)
        from shared.logging import ExecutionLogger
        ExecutionLogger.log_state_change(
            execution_id=execution_id,
            idea_id=updated.idea_id,
            step_key="workflow_control",
            from_state=str(prev_status),
            to_state=updated.status,
            attempt_number=updated.attempt_count,
        )
        return ExecutionActionResponse(
            status="success",
            execution_id=execution_id,
            previous_status=prev_status,
            new_status=updated.status,
            attempt_count=updated.attempt_count,
            message="Execution retry initiated",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
