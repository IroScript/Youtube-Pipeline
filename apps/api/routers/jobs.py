"""
Distributed Jobs & Dead Letter Queue (DLQ) Router
=================================================
Endpoints for creating distributed jobs, dispatching worker tasks, and managing the Dead Letter Queue.
"""

from __future__ import annotations

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_dlq_engine, get_job_dispatcher
from services.reliability.dlq import DeadLetterQueueEngine
from services.workflow.job_dispatcher import JobDispatcher
from shared.contracts.schemas import JobSchema, JobDispatchResponse, DLQItemSchema

router = APIRouter(prefix="/jobs", tags=["Distributed Jobs & DLQ"])

_IN_MEMORY_JOBS: Dict[str, Dict[str, Any]] = {}


@router.get("", response_model=List[JobSchema])
def list_jobs(status: Optional[str] = None):
    jobs = list(_IN_MEMORY_JOBS.values())
    if status:
        jobs = [j for j in jobs if j.get("status") == status.upper()]
    return [JobSchema(**j) for j in jobs]


@router.get("/dlq", response_model=List[DLQItemSchema])
def list_dead_letters(
    status: Optional[str] = None,
    dlq: DeadLetterQueueEngine = Depends(get_dlq_engine)
):
    records = dlq.list_all(status=status)
    return [
        DLQItemSchema(
            id=r["id"],
            execution_id=r["execution_id"],
            step_run_id=r["step_run_id"],
            error_class=r["error_class"],
            error_message=r["error_message"],
            status=r["status"],
            created_at=r["created_at"]
        )
        for r in records
    ]


@router.post("/dlq/{dlq_id}/retry")
def retry_dead_letter(
    dlq_id: str,
    dlq: DeadLetterQueueEngine = Depends(get_dlq_engine)
):
    try:
        payload = dlq.replay(dlq_id)
        return {"status": "replayed", "dlq_id": dlq_id, "payload": payload}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Dead letter record #{dlq_id} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dlq/{dlq_id}/resolve")
def resolve_dead_letter(
    dlq_id: str,
    note: str = "Resolved via API",
    dlq: DeadLetterQueueEngine = Depends(get_dlq_engine)
):
    try:
        rec = dlq.resolve(dlq_id, note=note)
        return {"status": "resolved", "dlq_id": dlq_id, "record": rec}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Dead letter record #{dlq_id} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dispatch", response_model=JobDispatchResponse)
def dispatch_job(
    step_key: str,
    step_type: str = "python",
    payload: Dict[str, Any] = {},
    priority: str = "normal",
    dispatcher: type[JobDispatcher] = Depends(get_job_dispatcher)
):
    job = dispatcher.create_job(
        step_run_id="manual_api_dispatch",
        step_key=step_key,
        step_type=step_type,
        payload=payload,
        priority_level=priority
    )
    _IN_MEMORY_JOBS[job["id"]] = job
    return JobDispatchResponse(
        job_id=job["id"],
        queue_name=job["queue_name"],
        status=job["status"],
        priority=job["priority"]
    )


@router.get("/{job_id}", response_model=JobSchema)
def get_job(job_id: str):
    job = _IN_MEMORY_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job #{job_id} not found")
    return JobSchema(**job)
