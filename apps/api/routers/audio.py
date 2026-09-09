"""
Audio & Voice Synthesis Router
==============================
Endpoints for inspecting voiceover readiness and generating speech synthesis.
"""

from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_audio_service, get_idea_service
from services.audio.audio_service import AudioService
from services.research.idea_service import IdeaService
from shared.contracts.schemas import AudioStatusResponse, GenerateAudioRequest, GenerateAudioResponse

router = APIRouter(prefix="/audio", tags=["Audio & Speech"])


@router.get("/{idea_id}/status", response_model=AudioStatusResponse)
def get_audio_status(
    idea_id: int,
    service: AudioService = Depends(get_audio_service)
):
    audio_path = Path(f"PromptDatabase/output_packaged/Idea_{idea_id:03d}/voiceover.mp3")
    exists = audio_path.exists()
    return AudioStatusResponse(
        idea_id=idea_id,
        enabled=service.is_enabled(),
        has_voiceover=exists,
        file_path=str(audio_path.resolve()) if exists else None
    )


@router.post("/{idea_id}/generate", response_model=GenerateAudioResponse)
def generate_voiceover(
    idea_id: int,
    payload: GenerateAudioRequest = GenerateAudioRequest(),
    audio_svc: AudioService = Depends(get_audio_service),
    idea_svc: IdeaService = Depends(get_idea_service)
):
    if not audio_svc.is_enabled():
        return GenerateAudioResponse(
            status="disabled",
            voice_id=payload.voice_id,
            message="Audio capability is currently disabled."
        )

    idea = idea_svc.get_idea(idea_id)
    if not idea:
        raise HTTPException(status_code=404, detail=f"Idea #{idea_id} not found")

    text = payload.text or idea.description or idea.title
    output_path = Path(f"PromptDatabase/output_packaged/Idea_{idea_id:03d}/voiceover.mp3")
    res = audio_svc.generate_voiceover(text=text, output_path=output_path, voice_id=payload.voice_id)
    return GenerateAudioResponse(
        status=res.get("status", "success"),
        voice_id=payload.voice_id,
        file_path=res.get("file_path"),
        message=res.get("message")
    )
