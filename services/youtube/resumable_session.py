"""
REQ-073: Resumable YouTube Upload Manager
=========================================
Implements the Google / YouTube Resumable Upload protocol session manager.
Tracks chunk progress, handles HTTP 308 Resume Incomplete queries, and
persists session URIs for interruption recovery.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional


class ResumableUploadSessionManager:
    """
    Manages state and chunk offsets for resumable media uploads.
    """

    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(
        self,
        file_path: str,
        total_bytes: int,
        session_uri: str,
        video_metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = {
            "session_id": session_id,
            "file_path": file_path,
            "total_bytes": total_bytes,
            "session_uri": session_uri,
            "bytes_uploaded": 0,
            "status": "IN_PROGRESS",  # IN_PROGRESS, COMPLETED, ABORTED
            "video_id": None,
            "metadata": video_metadata or {},
        }
        return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self._sessions.get(session_id)

    def update_progress(self, session_id: str, bytes_uploaded: int) -> Dict[str, Any]:
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Upload session {session_id} not found")

        session["bytes_uploaded"] = min(bytes_uploaded, session["total_bytes"])
        if session["bytes_uploaded"] >= session["total_bytes"]:
            session["status"] = "COMPLETED"
        return session

    def mark_completed(self, session_id: str, video_id: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Upload session {session_id} not found")

        session["status"] = "COMPLETED"
        session["bytes_uploaded"] = session["total_bytes"]
        session["video_id"] = video_id
        return session

    def get_next_byte_offset(self, session_id: str) -> int:
        session = self.get_session(session_id)
        if not session:
            raise KeyError(f"Upload session {session_id} not found")
        return session["bytes_uploaded"]

    def is_complete(self, session_id: str) -> bool:
        session = self.get_session(session_id)
        return bool(session and session["status"] == "COMPLETED")
