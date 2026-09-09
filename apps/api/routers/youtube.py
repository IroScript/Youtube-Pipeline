"""
YouTube & Social Publishing Router
==================================
Endpoints for preparing upload payloads, inspecting upload readiness, and dispatching uploads.
"""

from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_youtube_service, get_video_service
from services.youtube.youtube_service import YouTubeService
from services.video.video_service import VideoService
from shared.contracts.schemas import (
    YouTubeStatusResponse,
    YouTubeUploadPayloadResponse,
    YouTubeUploadRequest,
    YouTubeUploadResponse
)

router = APIRouter(prefix="/youtube", tags=["YouTube & Publishing"])


@router.get("/{idea_id}/status", response_model=YouTubeStatusResponse)
def get_youtube_status(
    idea_id: int,
    yt_svc: YouTubeService = Depends(get_youtube_service),
    vid_svc: VideoService = Depends(get_video_service)
):
    rec = vid_svc.get_video_record(idea_id)
    has_video = rec is not None and rec.file_path is not None and Path(rec.file_path).exists()
    try:
        payload = yt_svc.prepare_upload_payload(idea_id)
        is_ready = has_video and bool(payload.get("title"))
        return YouTubeStatusResponse(
            idea_id=idea_id,
            is_ready=is_ready,
            title=payload.get("title"),
            has_video=has_video
        )
    except Exception:
        return YouTubeStatusResponse(idea_id=idea_id, is_ready=False, title=None, has_video=has_video)


@router.get("/{idea_id}/payload", response_model=YouTubeUploadPayloadResponse)
def get_upload_payload(idea_id: int, yt_svc: YouTubeService = Depends(get_youtube_service)):
    try:
        data = yt_svc.prepare_upload_payload(idea_id)
        return YouTubeUploadPayloadResponse(**data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{idea_id}/upload", response_model=YouTubeUploadResponse)
def upload_video(
    idea_id: int,
    payload: YouTubeUploadRequest = YouTubeUploadRequest(),
    yt_svc: YouTubeService = Depends(get_youtube_service),
    vid_svc: VideoService = Depends(get_video_service)
):
    rec = vid_svc.get_video_record(idea_id)
    video_path = payload.video_path or (rec.file_path if rec else None)
    if not video_path or not Path(video_path).exists():
        raise HTTPException(status_code=400, detail=f"No rendered video found for Idea #{idea_id}")

    try:
        res = yt_svc.upload_video(video_path=video_path, idea_id=idea_id)
        return YouTubeUploadResponse(
            status=res.get("status", "success"),
            video_id=res.get("video_id", "simulated_yt_id"),
            message=res.get("message", "Video dispatched for YouTube upload")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
