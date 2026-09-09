"""
Video & Task Execution Repository
=================================
Encapsulates all database operations related to GeneratedVideo, Task, and TaskAttempt.
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Optional, List
from sqlmodel import Session, select

REPO_ROOT = Path(__file__).resolve().parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from database.models import GeneratedVideo, Task, TaskAttempt
from repositories.base_repository import BaseRepository

MIN_REAL_VIDEO_BYTES = 10240


class VideoRepository(BaseRepository[GeneratedVideo]):
    def __init__(self, session: Session):
        super().__init__(GeneratedVideo, session)

    def get_by_idea_id(self, idea_id: int) -> Optional[GeneratedVideo]:
        """Fetch generated video record for a specific idea."""
        statement = select(GeneratedVideo).where(GeneratedVideo.idea_id == idea_id)
        return self.session.exec(statement).first()

    def get_completed_videos(self) -> List[GeneratedVideo]:
        """Fetch all successfully completed videos."""
        statement = select(GeneratedVideo).where(GeneratedVideo.status == "completed")
        return list(self.session.exec(statement).all())

    def register_or_update_video(
        self,
        idea_id: int,
        title: str,
        file_path: Path | str,
        duration_seconds: float = 8.0,
        resolution: str = "1080x1920",
    ) -> GeneratedVideo:
        """
        Inserts or updates the GeneratedVideo row for an idea.
        """
        path_obj = Path(file_path)
        size = path_obj.stat().st_size if path_obj.exists() else 0
        existing = self.get_by_idea_id(idea_id)

        if not existing:
            video_rec = GeneratedVideo(
                uuid=str(uuid.uuid4()),
                idea_id=idea_id,
                title=title,
                file_path=str(path_obj.resolve()),
                file_name=path_obj.name,
                file_size_bytes=size,
                duration_seconds=duration_seconds,
                resolution=resolution,
                status="completed",
            )
            return self.create(video_rec)
        else:
            existing.file_path = str(path_obj.resolve())
            existing.file_name = path_obj.name
            existing.file_size_bytes = size
            existing.status = "completed"
            return self.update(existing)

    def get_task_for_idea(self, idea_id: int) -> Optional[Task]:
        """Fetch active packaging/render task for an idea."""
        statement = select(Task).where(Task.idea_id == idea_id)
        return self.session.exec(statement).first()

    def update_task_status(
        self,
        idea_id: int,
        status: str,
        output_folder: Optional[str] = None,
        video_path: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Task]:
        """Update or initialize task status record."""
        task = self.get_task_for_idea(idea_id)
        if task:
            task.status = status
            if output_folder:
                task.output_folder_path = output_folder
            if video_path:
                task.video_path = video_path
            if error_message:
                task.last_error = error_message
            self.session.add(task)
            self.session.flush()
        return task
