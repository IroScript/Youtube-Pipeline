"""
Videos & Generation Router
==========================
Endpoints for checking generated video records and triggering renders.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_video_service, get_media_stitcher_service
from services.video.video_service import VideoService
from services.video.media_stitcher_service import MediaStitcherService
from shared.contracts.schemas import VideoRecordSchema, AssembleVideoRequest, AssembleVideoResponse

router = APIRouter(prefix="/videos", tags=["Videos"])


@router.get("/{idea_id}/status")
def get_video_status(idea_id: int, service: VideoService = Depends(get_video_service)):
    rec = service.get_video_record(idea_id)
    return {
        "idea_id": idea_id,
        "exists": rec is not None,
        "title": rec.title if rec else None,
        "file_path": rec.file_path if rec else None,
        "duration_seconds": rec.duration_seconds if rec else None,
        "status": rec.status if rec else "not_generated",
    }


@router.post("/{idea_id}/assemble", response_model=AssembleVideoResponse)
def assemble_video_shots(
    idea_id: int,
    payload: AssembleVideoRequest,
    stitcher: MediaStitcherService = Depends(get_media_stitcher_service),
    service: VideoService = Depends(get_video_service)
):
    output_path = payload.output_path or f"PromptDatabase/output_packaged/Idea_{idea_id:03d}_video.mp4"
    res = stitcher.stitch_shots(shot_paths=payload.shot_paths, output_path=output_path)
    if res.get("status") == "success" and res.get("output_path"):
        service.register_rendered_video(idea_id, res["output_path"])
    return AssembleVideoResponse(
        status=res.get("status", "failed"),
        output_path=res.get("output_path"),
        total_shots=res.get("total_shots", 0),
        error=res.get("error")
    )


@router.get("/{idea_id}", response_model=VideoRecordSchema)
def get_video_record(idea_id: int, service: VideoService = Depends(get_video_service)):
    rec = service.get_video_record(idea_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"No video found for idea #{idea_id}")
    return rec


@router.get("/{idea_id}/render-payload")
def get_render_payload(idea_id: int, service: VideoService = Depends(get_video_service)):

    try:
        return service.build_render_payload(idea_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{idea_id}/generate")
def generate_video(idea_id: int, dry_run: bool = True, service: VideoService = Depends(get_video_service)):
    """
    Triggers 10-second video generation for an idea.
    If dry_run=True, validates prompt and builds payload without launching browser.
    """
    try:
        payload = service.build_render_payload(idea_id)
        if dry_run:
            return {
                "status": "dry_run_validated",
                "idea_id": idea_id,
                "target_duration": payload.get("target_duration"),
                "prompt_length": len(payload.get("full_combined_prompt", "")),
                "model": payload.get("model"),
            }
        rendered_path = service.trigger_render(idea_id)
        return {
            "status": "success" if rendered_path else "failed",
            "idea_id": idea_id,
            "rendered_video_path": rendered_path,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
