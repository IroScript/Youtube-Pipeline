"""
Backward-Compatible Legacy Wrappers
===================================
Provides adapter functions translating legacy pipeline invocations into clean
calls to the modern decoupled business services.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from infrastructure.database.session import get_session
from services.research.idea_service import IdeaService
from services.scripting.prompt_service import PromptService
from services.seo.seo_service import SEOService
from services.video.video_service import VideoService
from services.export_service import ExportService


def legacy_get_pipeline_status() -> Dict[str, Any]:
    """Legacy wrapper delegating to IdeaService stage gate evaluator."""
    with get_session() as session:
        service = IdeaService(session)
        return service.get_gates_summary()


def legacy_check_idea_plan(idea_id: int) -> Dict[str, Any]:
    """Legacy wrapper for checking idea stage report."""
    with get_session() as session:
        service = IdeaService(session)
        return service.get_stage_report(idea_id)


def legacy_prompt_fillup(idea_id: int, dry_run: bool = True) -> Dict[str, Any]:
    """Legacy wrapper delegating to PromptService escalation status."""
    with get_session() as session:
        service = PromptService(session)
        status = service.get_escalation_status(idea_id)
        return {
            "status": "dry_run" if dry_run else "executed",
            "idea_id": idea_id,
            "escalation_complete": status.get("is_complete", False),
            "total_prompts": status.get("total_prompts", 0),
        }


def legacy_export_all_csvs() -> Dict[str, Any]:
    """Legacy wrapper delegating to ExportService refresh_all_csvs."""
    service = ExportService()
    return service.refresh_all_csvs()


def legacy_generate_video_payload(idea_id: int) -> Dict[str, Any]:
    """Legacy wrapper delegating to VideoService render payload builder."""
    with get_session() as session:
        service = VideoService(session)
        return service.build_render_payload(idea_id)
