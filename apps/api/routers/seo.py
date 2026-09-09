"""
SEO Management Router
=====================
Endpoints for inspecting SEO metadata and triggering SEO optimization.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_seo_service
from services.seo.seo_service import SEOService

from shared.contracts.schemas import (
    SEOMetadataSchema,
    SEOHarvestSuggestRequest,
    SEOHarvestSuggestResponse,
    SEOHarvestCompetitorsRequest,
    SEOHarvestCompetitorsResponse,
    CompetitorItemSchema,
    SEOGenerateRequest,
    SEOGenerateResponse,
)

router = APIRouter(prefix="/seo", tags=["SEO & Keywords"])


from shared.logging import ExecutionLogger
import uuid

@router.post("/generate", response_model=SEOGenerateResponse)
def generate_seo(
    payload: SEOGenerateRequest,
    service: SEOService = Depends(get_seo_service),
):
    """
    Triggers data-grounded SEO generation (harvesting, scoring, and metadata building)
    for an idea.
    Follows: Router -> Service Layer -> Repository Layer -> Database.
    """
    exec_id = f"seo_gen_{payload.idea_id}_{uuid.uuid4().hex[:8]}"
    ExecutionLogger.log_seo_generation(
        execution_id=exec_id,
        idea_id=payload.idea_id,
        attempt_number=1,
        status="SEO_GENERATION_STARTED",
        details={"apply": payload.apply, "force": payload.force},
    )
    try:
        res = service.generate_seo(
            idea_id=payload.idea_id,
            apply=payload.apply,
            force=payload.force,
            use_browser=payload.use_browser,
        )
        scores = res.get("scores") or {}
        pkg = res.get("package") or {}
        db_res = res.get("db") or {}
        action = db_res.get("action", res.get("action", "generated"))
        
        ExecutionLogger.log_seo_generation(
            execution_id=exec_id,
            idea_id=payload.idea_id,
            attempt_number=1,
            status="SEO_GENERATION_SUCCESS",
            details={
                "action": action,
                "verdict": scores.get("verdict"),
                "opportunity_score": scores.get("opportunity"),
            },
        )
        return SEOGenerateResponse(
            status="success" if res.get("status") != "error" else "failed",
            idea_id=payload.idea_id,
            action=action,
            title=pkg.get("title", res.get("title")),
            tags_count=len(pkg.get("tags") or res.get("tags") or []),
            scores={
                "demand": scores.get("demand"),
                "novelty": scores.get("novelty"),
                "saturation": scores.get("saturation"),
                "opportunity": scores.get("opportunity"),
                "verdict": scores.get("verdict"),
            },
            upload_ready=bool(pkg.get("_validation", {}).get("upload_ready", True)),
        )
    except Exception as e:
        ExecutionLogger.log_seo_generation(
            execution_id=exec_id,
            idea_id=payload.idea_id,
            attempt_number=1,
            status="SEO_GENERATION_ERROR",
            details={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/harvest/suggest", response_model=SEOHarvestSuggestResponse)
def harvest_youtube_suggestions(
    payload: SEOHarvestSuggestRequest,
    service: SEOService = Depends(get_seo_service)
):
    res = service.harvest_suggestions(query=payload.query, lang=payload.lang)
    return SEOHarvestSuggestResponse(**res)


@router.post("/harvest/competitors", response_model=SEOHarvestCompetitorsResponse)
def harvest_youtube_competitors(
    payload: SEOHarvestCompetitorsRequest,
    service: SEOService = Depends(get_seo_service)
):
    res = service.harvest_competitors(query=payload.query, limit=payload.limit)
    return SEOHarvestCompetitorsResponse(
        query=res["query"],
        ran=res["ran"],
        competitors=[CompetitorItemSchema(**c) for c in res["competitors"]],
        count=res["count"]
    )


@router.get("/{idea_id}/status")
def get_seo_status(idea_id: int, service: SEOService = Depends(get_seo_service)):
    return service.get_seo_status(idea_id)


@router.get("/{idea_id}", response_model=SEOMetadataSchema)
def get_full_seo_metadata(idea_id: int, service: SEOService = Depends(get_seo_service)):
    meta = service.get_full_metadata(idea_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"SEO metadata for Idea #{idea_id} not found")
    return SEOMetadataSchema(**meta)


@router.post("/{idea_id}/generate")
def generate_seo_metadata(
    idea_id: int,
    apply: bool = True,
    force: bool = False,
    use_browser: bool = True,
    service: SEOService = Depends(get_seo_service),
):
    try:
        res = service.generate_seo(idea_id, apply=apply, force=force, use_browser=use_browser)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

