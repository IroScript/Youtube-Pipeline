"""
Unified Pipeline Orchestrator Router
====================================
High-level control plane to trigger, orchestrate, and observe complete video content lifecycle.
"""

from __future__ import annotations

import uuid
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import (
    get_idea_service,
    get_prompt_service,
    get_seo_service,
    get_video_service,
    get_package_service
)
from services.research.idea_service import IdeaService
from services.scripting.prompt_service import PromptService
from services.seo.seo_service import SEOService
from services.video.video_service import VideoService
from services.packaging.package_service import PackageService
from shared.contracts.schemas import PipelineRunRequest, PipelineRunResponse, PipelineProgressResponse

router = APIRouter(prefix="/pipeline", tags=["Pipeline Orchestrator"])


@router.get("/ideas/{idea_id}/progress", response_model=PipelineProgressResponse)
def get_idea_pipeline_progress(
    idea_id: int,
    idea_svc: IdeaService = Depends(get_idea_service),
    prompt_svc: PromptService = Depends(get_prompt_service),
    seo_svc: SEOService = Depends(get_seo_service),
    vid_svc: VideoService = Depends(get_video_service),
    pkg_svc: PackageService = Depends(get_package_service)
):
    idea = idea_svc.get_idea(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail=f"Idea #{idea_id} not found")

    prompts_st = prompt_svc.get_escalation_status(idea_id)
    seo_st = seo_svc.get_seo_status(idea_id)
    vid_rec = vid_svc.get_video_record(idea_id)
    pkg_st = pkg_svc.get_package_manifest_by_idea(idea_id)

    stages = {
        "idea": {"status": "completed", "title": idea.title},
        "prompts": {
            "status": "completed" if prompts_st["is_complete"] else "pending",
            "filled": prompts_st["filled_prompts"],
            "required": prompts_st["required_prompts"],
        },
        "seo": {
            "status": "completed" if seo_st.get("exists") else "pending",
            "is_real_seo": seo_st.get("is_real_seo", False),
            "tag_count": seo_st.get("tag_count", 0),
        },
        "video": {
            "status": "completed" if (vid_rec and vid_rec.file_path) else "pending",
            "file_path": vid_rec.file_path if vid_rec else None,
        },
        "packaging": {
            "status": "completed" if pkg_st.get("complete") else "pending",
            "folder_name": pkg_st.get("folder_name"),
        }
    }

    all_done = (
        prompts_st["is_complete"] and
        seo_st.get("exists") and
        (vid_rec and vid_rec.file_path) and
        pkg_st.get("complete")
    )

    return PipelineProgressResponse(
        idea_id=idea_id,
        title=idea.title,
        stages=stages,
        overall_status="ready_for_upload" if all_done else "in_progress"
    )


@router.post("/ideas/{idea_id}/run", response_model=PipelineRunResponse, status_code=202)
def run_full_pipeline_for_idea(
    idea_id: int,
    payload: PipelineRunRequest = PipelineRunRequest(),
    idea_svc: IdeaService = Depends(get_idea_service),
    prompt_svc: PromptService = Depends(get_prompt_service),
    seo_svc: SEOService = Depends(get_seo_service),
    vid_svc: VideoService = Depends(get_video_service),
    pkg_svc: PackageService = Depends(get_package_service)
):
    idea = idea_svc.get_idea(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail=f"Idea #{idea_id} not found")

    job_id = f"job_pipeline_{uuid.uuid4().hex[:8]}"

    if payload.dry_run:
        return PipelineRunResponse(
            job_id=job_id,
            idea_id=idea_id,
            status="dry_run_validated",
            stage="orchestration_plan_ready",
            message=f"Pipeline sequence validated for Idea #{idea_id} ('{idea.title}')"
        )

    # Step 1: Prompts
    prompt_svc.generate_escalation(idea_id, skip_browser=payload.skip_browser)

    # Step 2: SEO
    seo_svc.generate_seo(idea_id, apply=True, force=False, use_browser=not payload.skip_browser)

    # Step 3: Video payload check
    vid_svc.build_render_payload(idea_id)

    # Step 4: Package bundle
    pkg_svc.package_idea(idea_id, skip_browser=payload.skip_browser)

    return PipelineRunResponse(
        job_id=job_id,
        idea_id=idea_id,
        status="completed",
        stage="pipeline_finished",
        message=f"Full pipeline successfully orchestrated for Idea #{idea_id}"
    )

# === Production Pipeline Endpoints (Phase 3-4) ===
from shared.contracts.schemas import ProductionPipelineResponse, PipelineRowStateResponse, GuardCheckResponse, ProductionPipelineRequest
from apps.api.dependencies import get_production_orchestrator
from typing import List

@router.post("/production/run", response_model=ProductionPipelineResponse, status_code=202)
def run_production_pipeline(
    payload: ProductionPipelineRequest,
    orchestrator = Depends(get_production_orchestrator)
):
    """One-click full pipeline with verification at every stage."""
    import uuid
    job_id = f"prod_job_{uuid.uuid4().hex[:8]}"
    if payload.idea_id:
        result = orchestrator.run_full_pipeline_for_idea(payload.idea_id, dry_run=payload.dry_run, skip_browser=payload.skip_browser)
    else:
        # Discover next
        next_id = orchestrator.discover_next_target()
        if not next_id:
            raise HTTPException(status_code=404, detail="No incomplete ideas found")
        result = orchestrator.run_full_pipeline_for_idea(next_id, dry_run=payload.dry_run, skip_browser=payload.skip_browser)
        
    return ProductionPipelineResponse(
        job_id=job_id,
        idea_id=result.idea_id,
        title=result.title,
        initial_state=result.initial_state,
        final_state=result.final_state,
        stages_completed=result.stages_completed,
        stages_failed=result.stages_failed,
        stages_skipped=result.stages_skipped,
        verification_results=result.verification_results,
        is_complete=result.is_complete,
        error=result.error,
        dry_run=result.dry_run
    )

@router.get("/production/ideas/{idea_id}/state", response_model=PipelineRowStateResponse)
def get_idea_pipeline_state(
    idea_id: int,
    orchestrator = Depends(get_production_orchestrator)
):
    """Get current pipeline state for an idea."""
    from sqlmodel import select
    from services.pipeline.pipeline_row_model import PipelineRowState
    state = orchestrator.session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)).first()
    if not state:
        raise HTTPException(status_code=404, detail=f"Pipeline state for Idea #{idea_id} not found")
    
    return PipelineRowStateResponse(
        idea_id=state.idea_id,
        current_state=state.current_state,
        previous_state=state.previous_state,
        prompt_verified=state.prompt_verified,
        seo_verified=state.seo_verified,
        video_verified=state.video_verified,
        upload_verified=state.upload_verified,
        package_verified=state.package_verified,
        all_fields_validated=False,
        missing_fields=[],
        is_paused=state.is_paused,
        failure_reason=state.failure_reason
    )

@router.get("/production/ideas/{idea_id}/guard/{stage}", response_model=GuardCheckResponse)
def check_generation_guard(
    idea_id: int, 
    stage: str,
    orchestrator = Depends(get_production_orchestrator)
):
    """Check if a generation stage is allowed."""
    if stage == "prompt":
        res = orchestrator.guard.can_generate_prompt(idea_id)
    elif stage == "seo":
        res = orchestrator.guard.can_generate_seo(idea_id)
    elif stage == "video":
        res = orchestrator.guard.can_generate_video(idea_id)
    elif stage == "upload":
        res = orchestrator.guard.can_upload(idea_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid stage")
        
    return GuardCheckResponse(
        allowed=res.allowed,
        reason=res.reason,
        existing_job_id=res.existing_job_id
    )

@router.post("/production/sequential", response_model=List[ProductionPipelineResponse], status_code=202)
def run_sequential_pipeline(
    payload: ProductionPipelineRequest,
    orchestrator = Depends(get_production_orchestrator)
):
    """Process ideas sequentially, row by row."""
    results = orchestrator.run_sequential_pipeline(
        max_ideas=payload.max_ideas, 
        dry_run=payload.dry_run, 
        skip_browser=payload.skip_browser
    )
    
    import uuid
    response_list = []
    for r in results:
        response_list.append(ProductionPipelineResponse(
            job_id=f"seq_job_{uuid.uuid4().hex[:8]}",
            idea_id=r.idea_id,
            title=r.title,
            initial_state=r.initial_state,
            final_state=r.final_state,
            stages_completed=r.stages_completed,
            stages_failed=r.stages_failed,
            stages_skipped=r.stages_skipped,
            verification_results=r.verification_results,
            is_complete=r.is_complete,
            error=r.error,
            dry_run=r.dry_run
        ))
    return response_list


# === Phase 5: Pause, Resume & Crash Recovery Endpoints ===

@router.post("/production/ideas/{idea_id}/pause")
def pause_idea_pipeline(
    idea_id: int,
    orchestrator=Depends(get_production_orchestrator),
):
    """Safely pause pipeline execution for an idea."""
    from services.pipeline.pause_resume import PauseResumeController
    ctrl = PauseResumeController(orchestrator.session)
    return ctrl.pause_idea(idea_id)


@router.post("/production/ideas/{idea_id}/resume")
def resume_idea_pipeline(
    idea_id: int,
    orchestrator=Depends(get_production_orchestrator),
):
    """Resume paused pipeline execution from last verified state."""
    from services.pipeline.pause_resume import PauseResumeController
    ctrl = PauseResumeController(orchestrator.session)
    return ctrl.resume_idea(idea_id)


@router.post("/production/pause-all")
def pause_all_pipelines(orchestrator=Depends(get_production_orchestrator)):
    """Pause all non-complete pipelines."""
    from services.pipeline.pause_resume import PauseResumeController
    ctrl = PauseResumeController(orchestrator.session)
    return ctrl.pause_all()


@router.get("/production/paused")
def list_paused_ideas(orchestrator=Depends(get_production_orchestrator)):
    """List all paused ideas."""
    from services.pipeline.pause_resume import PauseResumeController
    ctrl = PauseResumeController(orchestrator.session)
    return ctrl.get_paused_ideas()


@router.post("/production/recovery/scan")
def run_crash_recovery(orchestrator=Depends(get_production_orchestrator)):
    """Scan for interrupted pipeline states and recover to safe states."""
    from services.pipeline.crash_recovery import CrashRecoveryEngine
    engine = CrashRecoveryEngine(orchestrator.session)
    return engine.scan_and_recover()


@router.get("/production/recovery/verify")
def verify_all_states(orchestrator=Depends(get_production_orchestrator)):
    """Verify all pipeline states against actual stage_gates results."""
    from services.pipeline.crash_recovery import CrashRecoveryEngine
    engine = CrashRecoveryEngine(orchestrator.session)
    return engine.verify_all_states()


@router.get("/production/ideas/{idea_id}/validate")
def validate_idea_fields(
    idea_id: int,
    orchestrator=Depends(get_production_orchestrator),
):
    """Run zero-blank field validation for an idea across all stages."""
    from services.pipeline.row_validator import RowValidator
    validator = RowValidator()
    full_result = validator.validate_all(idea_id)
    return {
        "idea_id": full_result.idea_id,
        "total_fields": full_result.total_fields,
        "valid_fields": full_result.valid_fields,
        "missing_count": len(full_result.missing_fields),
        "missing_fields": full_result.missing_fields,
        "is_complete": full_result.is_complete,
        "stages": {
            name: {
                "valid": r.valid,
                "missing_fields": r.missing_fields,
                "details": r.details,
            }
            for name, r in full_result.stage_results.items()
        },
    }
