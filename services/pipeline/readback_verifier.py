"""
Readback Verifier — Post-Insertion Verification
================================================
After every DB write, reads back and compares with expected state.
Rule 12: Insertion Validation with read-back verification.
"""

from __future__ import annotations

import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from database.session import get_session
from database.models import Prompt, YouTubeMetadata, GeneratedVideo
from sqlmodel import select

MIN_PROMPT_CHARS = 50


@dataclass
class VerifyResult:
    verified: bool
    entity: str
    expected: Dict[str, Any] = field(default_factory=dict)
    actual: Dict[str, Any] = field(default_factory=dict)
    mismatches: List[str] = field(default_factory=list)


class ReadbackVerifier:
    """
    Post-insertion verification. After every service call that writes to DB,
    this verifier reads back the data and confirms it matches expectations.
    """

    def verify_prompt_insertion(self, idea_id: int, expected_count: int = 20) -> VerifyResult:
        mismatches: list[str] = []
        actual: dict[str, Any] = {}
        with get_session() as session:
            prompts = session.exec(
                select(Prompt).where(Prompt.idea_id == idea_id)
            ).all()
            actual_count = len(prompts)
            actual["count"] = actual_count

            if actual_count < expected_count:
                mismatches.append(f"Expected >= {expected_count} prompts, found {actual_count}")

            # Check level 10 video prompt exists and is non-blank
            lvl10_vid = [
                p for p in prompts
                if p.level == 10 and p.generation_type == "video"
                and len((p.prompt_text or "").strip()) >= MIN_PROMPT_CHARS
            ]
            actual["has_level_10_video"] = bool(lvl10_vid)
            if not lvl10_vid:
                mismatches.append("Level 10 video prompt missing or blank")

            # Count blank prompts
            blank = [p for p in prompts if len((p.prompt_text or "").strip()) < MIN_PROMPT_CHARS]
            actual["blank_count"] = len(blank)
            if blank:
                mismatches.append(f"{len(blank)} blank prompts (< {MIN_PROMPT_CHARS} chars)")

        return VerifyResult(
            verified=len(mismatches) == 0,
            entity="prompt",
            expected={"count": expected_count, "has_level_10_video": True},
            actual=actual,
            mismatches=mismatches,
        )

    def verify_seo_insertion(self, idea_id: int) -> VerifyResult:
        mismatches: list[str] = []
        actual: dict[str, Any] = {}
        with get_session() as session:
            meta = session.exec(
                select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)
            ).first()

            if not meta:
                mismatches.append("YouTubeMetadata record not found after insertion")
                return VerifyResult(False, "seo", {"exists": True}, actual, mismatches)

            actual["id"] = meta.id
            actual["title"] = meta.title[:80] if meta.title else None
            actual["has_description"] = bool(meta.seo_description and meta.seo_description.strip())
            actual["has_tags"] = bool(meta.tags and meta.tags.strip() and meta.tags != "[]")

            if not meta.title or not meta.title.strip():
                mismatches.append("SEO title missing/blank")
            if not meta.seo_description or not meta.seo_description.strip():
                mismatches.append("SEO description missing/blank")
            if not meta.tags or meta.tags.strip() in ("", "[]"):
                mismatches.append("SEO tags missing/empty")

        return VerifyResult(
            verified=len(mismatches) == 0,
            entity="seo",
            expected={"title": True, "description": True, "tags": True},
            actual=actual,
            mismatches=mismatches,
        )

    def verify_video_registration(self, idea_id: int) -> VerifyResult:
        mismatches: list[str] = []
        actual: dict[str, Any] = {}
        with get_session() as session:
            video = session.exec(
                select(GeneratedVideo).where(GeneratedVideo.idea_id == idea_id)
            ).first()

            if not video:
                mismatches.append("GeneratedVideo record not found")
                return VerifyResult(False, "video", {"exists": True}, actual, mismatches)

            actual["id"] = video.id
            actual["file_path"] = video.file_path
            actual["status"] = video.status

            if not video.file_path:
                mismatches.append("Video file_path is NULL")
            else:
                path = Path(video.file_path)
                actual["file_exists"] = path.exists()
                if not path.exists():
                    mismatches.append(f"Video file not found on disk: {video.file_path}")
                elif path.stat().st_size < 10240:
                    mismatches.append(f"Video file too small: {path.stat().st_size} bytes")
                    actual["file_size"] = path.stat().st_size
                else:
                    actual["file_size"] = path.stat().st_size

            if video.status != "completed":
                mismatches.append(f"Video status is '{video.status}', expected 'completed'")

        return VerifyResult(
            verified=len(mismatches) == 0,
            entity="video",
            expected={"file_exists": True, "status": "completed"},
            actual=actual,
            mismatches=mismatches,
        )

    def verify_upload_status(self, idea_id: int) -> VerifyResult:
        mismatches: list[str] = []
        actual: dict[str, Any] = {}
        with get_session() as session:
            meta = session.exec(
                select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)
            ).first()

            if not meta:
                mismatches.append("YouTubeMetadata record not found")
                return VerifyResult(False, "upload", {"status": "uploaded"}, actual, mismatches)

            actual["id"] = meta.id
            actual["status"] = meta.status

            if meta.status != "uploaded":
                mismatches.append(f"Upload status is '{meta.status}', expected 'uploaded'")

        return VerifyResult(
            verified=len(mismatches) == 0,
            entity="upload",
            expected={"status": "uploaded"},
            actual=actual,
            mismatches=mismatches,
        )
