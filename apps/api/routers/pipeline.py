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
