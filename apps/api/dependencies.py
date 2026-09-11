"""
FastAPI Route Dependencies
==========================
Injects request-scoped database sessions and services into route handlers.
"""

from __future__ import annotations

from typing import Generator
from fastapi import Depends
from sqlmodel import Session
from infrastructure.database.session import get_db_session

from services.research.idea_service import IdeaService
from services.scripting.prompt_service import PromptService
from services.seo.seo_service import SEOService
from services.video.video_service import VideoService
from services.packaging.package_service import PackageService
from services.export_service import ExportService


def get_idea_service(session: Session = Depends(get_db_session)) -> IdeaService:
    return IdeaService(session)


def get_prompt_service(session: Session = Depends(get_db_session)) -> PromptService:
    return PromptService(session)


def get_seo_service(session: Session = Depends(get_db_session)) -> SEOService:
    return SEOService(session)


def get_video_service(session: Session = Depends(get_db_session)) -> VideoService:
    return VideoService(session)


def get_package_service(session: Session = Depends(get_db_session)) -> PackageService:
    return PackageService(session)


def get_export_service() -> ExportService:
    return ExportService()


def get_youtube_service(session: Session = Depends(get_db_session)):
    from services.youtube.youtube_service import YouTubeService
    return YouTubeService(session)


def get_audio_service():
    from services.audio.audio_service import AudioService
    return AudioService(enabled=True)


def get_media_stitcher_service():
    from services.video.media_stitcher_service import MediaStitcherService
    return MediaStitcherService()


_GLOBAL_DLQ_ENGINE = None

def get_dlq_engine():
    global _GLOBAL_DLQ_ENGINE
    if _GLOBAL_DLQ_ENGINE is None:
        from services.reliability.dlq import DeadLetterQueueEngine
        _GLOBAL_DLQ_ENGINE = DeadLetterQueueEngine()
    return _GLOBAL_DLQ_ENGINE


def get_job_dispatcher():
    from services.workflow.job_dispatcher import JobDispatcher
    return JobDispatcher


def get_execution_service(session: Session = Depends(get_db_session)):
    from services.workflow.execution_service import ExecutionService
    return ExecutionService(session)


def get_retry_engine():
    from services.reliability.retry_engine import RetryEngine
    return RetryEngine



def get_production_orchestrator(session: Session = Depends(get_db_session)):
    from services.pipeline.production_orchestrator import ProductionOrchestrator
    return ProductionOrchestrator(session)
