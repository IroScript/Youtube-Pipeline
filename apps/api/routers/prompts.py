"""
Prompts & Escalation Router
===========================
Endpoints for inspecting and generating 10-level prompt escalations.
"""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_prompt_service
from services.scripting.prompt_service import PromptService
from shared.contracts.schemas import (
    PromptSchema,
    EscalationStatusResponse,
    JITPromptResponse,
    PromptGenerateRequest,
    PromptGenerateResponse,
)

router = APIRouter(prefix="/prompts", tags=["Prompts & Escalation"])


from shared.logging import ExecutionLogger
import uuid

@router.post("/generate", response_model=PromptGenerateResponse)
def generate_prompts(
    payload: PromptGenerateRequest = PromptGenerateRequest(),
    service: PromptService = Depends(get_prompt_service),
):
    """
    Generates 10-level image and video escalation prompts (20 prompts total)
    for a specific idea, or resolves and generates for the next production-ready idea.
    Follows: Router -> Service Layer -> Repository Layer -> Database.
    """
    exec_id = f"prompt_gen_{payload.idea_id or 'auto'}_{uuid.uuid4().hex[:8]}"
    ExecutionLogger.log_prompt_generation(
        execution_id=exec_id,
        idea_id=payload.idea_id or "auto",
        attempt_number=1,
        status="PROMPT_GENERATION_STARTED",
    )
    try:
        if payload.idea_id is not None:
            saved = service.generate_escalation(payload.idea_id, skip_browser=payload.skip_browser)
            lvl10 = service.get_prompt_by_level(payload.idea_id, level=10, generation_type="video")
            ExecutionLogger.log_prompt_generation(
                execution_id=exec_id,
                idea_id=payload.idea_id,
                attempt_number=1,
                status="PROMPT_GENERATION_SUCCESS",
                details={"saved_prompts": len(saved)},
            )
            return PromptGenerateResponse(
                status="success",
                idea_id=payload.idea_id,
                saved_prompts_count=len(saved),
                message=f"Successfully generated {len(saved)} prompts for Idea #{payload.idea_id}",
                level_10_video_prompt=lvl10.prompt_text if lvl10 else None,
            )
        else:
            res = service.resolve_next_production_prompt(skip_browser=payload.skip_browser)
            if res.get("status") != "ready":
                ExecutionLogger.log_prompt_generation(
                    execution_id=exec_id,
                    idea_id="none",
                    attempt_number=1,
                    status="PROMPT_GENERATION_NONE_AVAILABLE",
                    details={"message": res.get("message")},
                )
                return PromptGenerateResponse(
                    status="none_available",
                    message=res.get("message", "No production prompt could be generated"),
                    saved_prompts_count=0,
                )
            resolved_id = res.get("idea_id")
            ExecutionLogger.log_prompt_generation(
                execution_id=exec_id,
                idea_id=resolved_id,
                attempt_number=1,
                status="PROMPT_GENERATION_SUCCESS",
                details={"resolved_idea_id": resolved_id},
            )
            return PromptGenerateResponse(
                status="success",
                idea_id=resolved_id,
                saved_prompts_count=20,
                message=f"Resolved next production prompt for Idea #{resolved_id}: {res.get('title')}",
                level_10_video_prompt=res.get("prompt_text"),
            )
    except ValueError as e:
        ExecutionLogger.log_prompt_generation(
            execution_id=exec_id,
            idea_id=payload.idea_id or "auto",
            attempt_number=1,
            status="PROMPT_GENERATION_NOT_FOUND",
            details={"error": str(e)},
        )
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        ExecutionLogger.log_prompt_generation(
            execution_id=exec_id,
            idea_id=payload.idea_id or "auto",
            attempt_number=1,
            status="PROMPT_GENERATION_ERROR",
            details={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/next-production-ready", response_model=JITPromptResponse)
def resolve_next_production_prompt(
    skip_browser: bool = False,
    service: PromptService = Depends(get_prompt_service)
):
    res = service.resolve_next_production_prompt(skip_browser=skip_browser)
    if res.get("status") != "ready":
        raise HTTPException(status_code=404, detail=res.get("message", "No production prompt available"))
    return JITPromptResponse(
        idea_id=res["idea_id"],
        title=res["title"],
        level=res["level"],
        prompt_text=res["prompt_text"],
        status=res["status"]
    )


@router.get("/{idea_id}/levels/{level}", response_model=PromptSchema)
def get_prompt_by_level(
    idea_id: int,
    level: int,
    generation_type: str = "video",
    service: PromptService = Depends(get_prompt_service)
):
    prompt_rec = service.get_prompt_by_level(idea_id=idea_id, level=level, generation_type=generation_type)
    if not prompt_rec:
        raise HTTPException(status_code=404, detail=f"Prompt for Idea #{idea_id} Level #{level} ({generation_type}) not found")
    return prompt_rec


@router.get("/{idea_id}", response_model=List[PromptSchema])
def get_prompts_for_idea(idea_id: int, service: PromptService = Depends(get_prompt_service)):
    return service.get_prompts_for_idea(idea_id)


@router.get("/{idea_id}/status", response_model=EscalationStatusResponse)
def get_escalation_status(idea_id: int, service: PromptService = Depends(get_prompt_service)):
    return service.get_escalation_status(idea_id)



@router.post("/{idea_id}/escalate")
def trigger_escalation(idea_id: int, skip_browser: bool = False, service: PromptService = Depends(get_prompt_service)):
    try:
        saved = service.generate_escalation(idea_id, skip_browser=skip_browser)
        return {"status": "success", "idea_id": idea_id, "saved_prompts": len(saved)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{idea_id}/fillup")
def fillup_idea_prompts_and_seo(idea_id: int, dry_run: bool = True, service: PromptService = Depends(get_prompt_service)):
    """
    Unified fillup trigger: checks escalation readiness and coordinates pipeline fillup.
    """
    status = service.get_escalation_status(idea_id)
    if dry_run:
        return {
            "status": "dry_run",
            "idea_id": idea_id,
            "escalation_complete": status["is_complete"],
            "filled_prompts": status["filled_prompts"],
            "required_prompts": status["required_prompts"],
        }
    if not status["is_complete"]:
        saved = service.generate_escalation(idea_id, skip_browser=False)
        return {"status": "prompts_filled", "idea_id": idea_id, "saved": len(saved)}
    return {"status": "already_filled", "idea_id": idea_id}
