"""
Row Validator — Zero-Blank Field Validation Engine
===================================================
Comprehensive field-level validation for each pipeline stage.
Ensures no row progresses with blank/missing required fields.

Rules enforced: 4, 5, 6, 12
"""

from __future__ import annotations

import sys
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

import stage_gates as sg
from sqlmodel import select
from database.session import get_session
from database.models import (
    Idea, Prompt, YouTubeMetadata, GeneratedVideo,
)

MIN_PROMPT_CHARS = 50
REQUIRED_PROMPT_COUNT = 20
MIN_REAL_VIDEO_BYTES = 10240


@dataclass
class ValidationResult:
    valid: bool
    stage: str
    missing_fields: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FullValidationResult:
    idea_id: int
    total_fields: int
    valid_fields: int
    missing_fields: List[str] = field(default_factory=list)
    stage_results: Dict[str, ValidationResult] = field(default_factory=dict)
    is_complete: bool = False


REQUIRED_FIELDS_BY_STAGE = {
    "idea": ["id", "uuid", "title", "raw_idea", "category_id", "status"],
    "prompt": ["id", "uuid", "idea_id", "prompt_text", "level", "generation_type", "status"],
    "seo": ["id", "uuid", "idea_id", "title", "seo_description", "tags"],
    "video": ["id", "uuid", "idea_id", "file_path", "status"],
    "upload": ["status"],
}


class RowValidator:
    """
    Validates all required fields for each pipeline stage.
    Uses both database queries AND filesystem checks (Rule 4: Zero-Blank).
    """

    def validate_idea(self, idea_id: int) -> ValidationResult:
        missing_fields: list[str] = []
        details: dict[str, Any] = {}
        with get_session() as session:
            idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
            if not idea:
                return ValidationResult(False, "idea", ["idea_not_found"], {"error": f"Idea {idea_id} not found"})

            for field_name in REQUIRED_FIELDS_BY_STAGE["idea"]:
                val = getattr(idea, field_name, None)
                details[field_name] = val
                if val is None or (isinstance(val, str) and not val.strip()):
                    missing_fields.append(field_name)

        return ValidationResult(len(missing_fields) == 0, "idea", missing_fields, details)

    def validate_prompts(self, idea_id: int) -> ValidationResult:
        missing_fields: list[str] = []
        details: dict[str, Any] = {}
        with get_session() as session:
            prompts = session.exec(select(Prompt).where(Prompt.idea_id == idea_id)).all()

            details["count"] = len(prompts)
            if len(prompts) < REQUIRED_PROMPT_COUNT:
                missing_fields.append(f"prompts_count_{len(prompts)}_expected_{REQUIRED_PROMPT_COUNT}")

            levels_seen: set[int] = set()
            types_seen: set[str] = set()
            blank_count = 0

            for p in prompts:
                if p.level:
                    levels_seen.add(p.level)
                if p.generation_type:
                    types_seen.add(p.generation_type)
                # Check prompt_text is not blank/placeholder
                text = (p.prompt_text or "").strip()
                if len(text) < MIN_PROMPT_CHARS:
                    blank_count += 1
                    missing_fields.append(f"prompt_{p.id}_blank_text")

            details["levels_present"] = sorted(levels_seen)
            details["types_present"] = sorted(types_seen)
            details["blank_count"] = blank_count

            # Must have all 10 levels
            for lvl in range(1, 11):
                if lvl not in levels_seen:
                    missing_fields.append(f"missing_level_{lvl}")

            # Must have both image and video types
            if "image" not in types_seen:
                missing_fields.append("missing_type_image")
            if "video" not in types_seen:
                missing_fields.append("missing_type_video")

            # Level 10 video prompt must exist
            lvl10_video = any(
                p.level == 10 and p.generation_type == "video"
                and len((p.prompt_text or "").strip()) >= MIN_PROMPT_CHARS
                for p in prompts
            )
            if not lvl10_video:
                missing_fields.append("missing_level_10_video_prompt")
            details["has_level_10_video"] = lvl10_video

        return ValidationResult(len(missing_fields) == 0, "prompt", missing_fields, details)

    def validate_seo(self, idea_id: int) -> ValidationResult:
        missing_fields: list[str] = []
        details: dict[str, Any] = {}
        with get_session() as session:
            meta = session.exec(
                select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)
            ).first()

            if not meta:
                return ValidationResult(False, "seo", ["seo_record_missing"], {})

            for field_name in REQUIRED_FIELDS_BY_STAGE["seo"]:
                val = getattr(meta, field_name, None)
                details[field_name] = str(val)[:100] if val else None
                if val is None or (isinstance(val, str) and not val.strip()):
                    missing_fields.append(field_name)

            # Validate tags is a non-empty JSON array
            if meta.tags:
                try:
                    tags = json.loads(meta.tags) if isinstance(meta.tags, str) else meta.tags
                    if not tags or not isinstance(tags, list) or len(tags) == 0:
                        missing_fields.append("tags_empty_array")
                    details["tag_count"] = len(tags) if isinstance(tags, list) else 0
                except Exception:
                    missing_fields.append("tags_json_parse_error")
                    details["tag_count"] = 0
            else:
                missing_fields.append("tags_null")
                details["tag_count"] = 0

            # Check it's not boilerplate via stage_gates
            seo_detail = sg.seo_detail(idea_id)
            if seo_detail.get("is_fallback"):
                missing_fields.append("seo_is_boilerplate_fallback")
            details["is_fallback"] = seo_detail.get("is_fallback", False)

        return ValidationResult(len(missing_fields) == 0, "seo", missing_fields, details)

    def validate_video(self, idea_id: int) -> ValidationResult:
        missing_fields: list[str] = []
        details: dict[str, Any] = {}
        with get_session() as session:
            video = session.exec(
                select(GeneratedVideo).where(GeneratedVideo.idea_id == idea_id)
            ).first()

            if not video:
                return ValidationResult(False, "video", ["video_record_missing"], {})

            for field_name in REQUIRED_FIELDS_BY_STAGE["video"]:
                val = getattr(video, field_name, None)
                details[field_name] = str(val)[:200] if val else None
                if val is None or (isinstance(val, str) and not val.strip()):
                    missing_fields.append(field_name)

            # Filesystem verification
            if video.file_path:
                path = Path(video.file_path)
                if not path.exists():
                    missing_fields.append("file_path_not_exists_on_disk")
                    details["file_exists"] = False
                elif path.stat().st_size <= MIN_REAL_VIDEO_BYTES:
                    missing_fields.append(f"file_size_too_small_{path.stat().st_size}_bytes")
                    details["file_exists"] = True
                    details["file_size"] = path.stat().st_size
                else:
                    details["file_exists"] = True
                    details["file_size"] = path.stat().st_size

        return ValidationResult(len(missing_fields) == 0, "video", missing_fields, details)

    def validate_package(self, idea_id: int) -> ValidationResult:
        """Validate package folder using stage_gates for filesystem check."""
        pkg = sg.package_detail(idea_id)
        missing_fields: list[str] = []

        if not pkg.get("exists"):
            missing_fields.append("package_folder_missing")
        else:
            if not pkg.get("has_video"):
                missing_fields.append("package_video_missing")
            if not pkg.get("has_prompt_json"):
                missing_fields.append("package_prompt_json_missing")
            if not pkg.get("has_seo_json"):
                missing_fields.append("package_seo_json_missing")

        return ValidationResult(
            len(missing_fields) == 0,
            "package",
            missing_fields,
            pkg,
        )

    def validate_all(self, idea_id: int) -> FullValidationResult:
        stage_results = {
            "idea": self.validate_idea(idea_id),
            "prompt": self.validate_prompts(idea_id),
            "seo": self.validate_seo(idea_id),
            "video": self.validate_video(idea_id),
            "package": self.validate_package(idea_id),
        }

        all_missing: list[str] = []
        for res in stage_results.values():
            all_missing.extend([f"{res.stage}.{m}" for m in res.missing_fields])

        total_fields = sum(len(REQUIRED_FIELDS_BY_STAGE.get(s, [])) for s in stage_results) + 3  # extras
        valid_fields = total_fields - len(all_missing)
        is_complete = all(r.valid for r in stage_results.values())

        return FullValidationResult(
            idea_id=idea_id,
            total_fields=total_fields,
            valid_fields=max(0, valid_fields),
            missing_fields=all_missing,
            stage_results=stage_results,
            is_complete=is_complete,
        )

    def count_missing_fields(self, idea_id: int) -> int:
        res = self.validate_all(idea_id)
        return len(res.missing_fields)
