"""
REQ-074: Duplicate YouTube Upload Guard (SHA256)
================================================
Prevents duplicate video uploads to YouTube channels by enforcing SHA256
content hash validation against historical upload records.
"""

from __future__ import annotations

import hashlib
from typing import Dict, List, Optional


class DuplicateVideoUploadException(Exception):
    """Raised when an identical video file has already been uploaded."""
    pass


class DuplicateUploadGuard:
    """
    Guards against uploading identical binary assets to the same channel.
    """

    @classmethod
    def compute_file_sha256(cls, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @classmethod
    def check_duplicate(
        cls,
        channel_id: str,
        file_sha256: str,
        existing_records: List[Dict[str, str]]
    ) -> Optional[Dict[str, str]]:
        """
        Checks if file_sha256 has already been published to channel_id.
        Returns the existing record if found, else None.
        """
        for record in existing_records:
            if record.get("channel_id") == channel_id and record.get("sha256") == file_sha256:
                return record
        return None

    @classmethod
    def enforce_guard(
        cls,
        channel_id: str,
        file_sha256: str,
        existing_records: List[Dict[str, str]]
    ) -> None:
        duplicate = cls.check_duplicate(channel_id, file_sha256, existing_records)
        if duplicate:
            raise DuplicateVideoUploadException(
                f"Duplicate upload blocked! Video with SHA256 '{file_sha256}' "
                f"was already uploaded as '{duplicate.get('video_id')}' to channel '{channel_id}'"
            )
