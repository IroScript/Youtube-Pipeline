"""
Packages & Manifest Router
==========================
Endpoints for inspecting package folder manifests and triggering auto-packaging.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_package_service
from services.packaging.package_service import PackageService
from shared.contracts.schemas import PackageManifestSchema

router = APIRouter(prefix="/packages", tags=["Packages"])


@router.get("/{idea_id}", response_model=PackageManifestSchema)
def get_package_manifest(idea_id: int, service: PackageService = Depends(get_package_service)):
    manifest = service.get_package_manifest_by_idea(idea_id)
    if not manifest.get("exists"):
        return PackageManifestSchema(
            idea_id=idea_id,
            exists=False,
            complete=False,
            has_video=False,
            has_prompt_json=False,
            has_seo_json=False,
        )
    return manifest


@router.post("/{idea_id}/bundle")
def bundle_package(idea_id: int, skip_browser: bool = False, service: PackageService = Depends(get_package_service)):
    res = service.package_idea(idea_id, skip_browser=skip_browser)
    return res
