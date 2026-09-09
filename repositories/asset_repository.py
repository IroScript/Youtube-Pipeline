"""
Asset & Package Artifact Repository
===================================
Encapsulates physical filesystem package manifest queries and validation.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional, Dict, Any

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PACKAGED_DIR = REPO_ROOT / "PromptDatabase" / "output_packaged"
MIN_REAL_VIDEO_BYTES = 10240

PROMPT_JSON_NAMES = ("prompt.json", "prompt_info.json")
SEO_JSON_NAMES = ("youtube_seo.json", "youtube_metadata.json")


def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)
    return re.sub(r'_+', '_', clean).strip('_')


class AssetRepository:
    """
    Manages filesystem assets, package manifest integrity, and video files.
    """
    def __init__(self, packaged_dir: Path | None = None):
        self.packaged_dir = packaged_dir or OUTPUT_PACKAGED_DIR

    def sanitize_name(self, title: str) -> str:
        return sanitize_filename(title)

    def compute_package_folder_name(self, elem_id: int, idea_idx: int, title: str) -> str:
        """Computes standardized folder name: <Element_ID>.<Idea_Index>.Level_10_<Title>"""
        safe_title = self.sanitize_name(title)
        return f"{elem_id}.{idea_idx}.Level_10_{safe_title}"

    def find_package_folder(self, elem_id: int, idea_idx: int, title: str) -> Optional[Path]:
        """Finds package folder by exact or sanitized pattern."""
        expected_name = self.compute_package_folder_name(elem_id, idea_idx, title)
        target = self.packaged_dir / expected_name
        if target.is_dir():
            return target
        # Fallback pattern search
        prefix = f"{elem_id}.{idea_idx}.Level_10_"
        for f in self.packaged_dir.iterdir():
            if f.is_dir() and f.name.startswith(prefix):
                return f
        return None

    def get_package_manifest(self, folder: Path) -> Dict[str, Any]:
        """
        Inspects package directory for the 3 required canonical artifacts:
        1. MP4 video (>10KB)
        2. prompt.json or prompt_info.json
        3. youtube_seo.json or youtube_metadata.json
        """
        if not folder.is_dir():
            return {"exists": False, "complete": False, "files": []}

        mp4s = [f for f in folder.glob("*.mp4") if f.stat().st_size > MIN_REAL_VIDEO_BYTES]
        pj = next((folder / n for n in PROMPT_JSON_NAMES if (folder / n).exists() and (folder / n).stat().st_size > 0), None)
        sj = next((folder / n for n in SEO_JSON_NAMES if (folder / n).exists() and (folder / n).stat().st_size > 0), None)

        is_complete = bool(mp4s) and (pj is not None) and (sj is not None)
        return {
            "exists": True,
            "folder_path": str(folder.resolve()),
            "folder_name": folder.name,
            "has_video": bool(mp4s),
            "video_path": str(mp4s[0].resolve()) if mp4s else None,
            "has_prompt_json": pj is not None,
            "prompt_json_path": str(pj.resolve()) if pj else None,
            "has_seo_json": sj is not None,
            "seo_json_path": str(sj.resolve()) if sj else None,
            "complete": is_complete,
        }
