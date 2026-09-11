"""
Pipeline Row State — Domain Model
===================================
Database model for tracking per-idea pipeline state.
Belongs in domain layer to respect architectural boundaries.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional
from datetime import datetime
from sqlmodel import Field

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from database.models import YouTubeBaseModel, _utcnow


class PipelineRowState(YouTubeBaseModel, table=True):
    __tablename__ = "pipeline_row_state"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True, unique=True)
    current_state: str = Field(default="DISCOVERED", index=True)
    previous_state: Optional[str] = None
    prompt_verified: bool = False
    seo_verified: bool = False
    video_verified: bool = False
    upload_verified: bool = False
    package_verified: bool = False
    all_fields_validated: bool = False
    missing_fields: Optional[str] = None  # JSON array
    active_job_id: Optional[str] = None
    active_job_type: Optional[str] = None
    failure_reason: Optional[str] = None
    retry_count: int = 0
    is_paused: bool = False
    last_verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
