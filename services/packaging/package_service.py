"""
Package Manifest & File Packager Service
========================================
Coordinates bundling MP4 videos and SQLite JSON metadata into canonical package folders.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, Dict, Any
from sqlmodel import Session

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from repositories.asset_repository import AssetRepository
from repositories.idea_repository import IdeaRepository


class PackageService:
    def __init__(self, session: Session):
        self.session = session
        self.asset_repo = AssetRepository()
        self.idea_repo = IdeaRepository(session)

    def get_package_manifest_by_idea(self, idea_id: int) -> Dict[str, Any]:
        idea = self.idea_repo.get_by_id(idea_id)
        if not idea:
            return {"exists": False, "error": f"Idea #{idea_id} not found"}

        elem_id, idx = self.idea_repo.get_idea_index_in_element(idea_id)
        folder = self.asset_repo.find_package_folder(elem_id, idx, idea.title)
        if not folder:
            return {"exists": False, "complete": False, "idea_id": idea_id}

        manifest = self.asset_repo.get_package_manifest(folder)
        manifest["idea_id"] = idea_id
        return manifest

    def package_idea(self, idea_id: int, skip_browser: bool = False) -> Dict[str, Any]:
        """
        Runs packaging process via pipeline_packager.
        """
        import os
        os.environ["PACKAGER_REAL_SEO"] = "1"
        from pipeline_packager import process_idea_level10_package
        return process_idea_level10_package(idea_id, skip_browser=skip_browser)
