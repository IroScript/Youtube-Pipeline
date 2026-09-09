"""
Exports & Reporting Router
==========================
Endpoints for triggering and inspecting CSV exports and reports.
"""

from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_export_service
from services.export_service import ExportService
from shared.contracts.schemas import ExportStatusResponse, ExportTriggerResponse

router = APIRouter(prefix="/exports", tags=["Exports & Reports"])


@router.get("/status", response_model=ExportStatusResponse)
def get_export_status(service: ExportService = Depends(get_export_service)):
    exp_dir = Path(service.exports_dir)
    files = [f.name for f in exp_dir.glob("*.csv")] if exp_dir.exists() else []
    return ExportStatusResponse(
        exports_directory=str(exp_dir.resolve()),
        available_files=files,
        count=len(files)
    )


@router.post("/csv", response_model=ExportTriggerResponse)
def export_all_csvs(service: ExportService = Depends(get_export_service)):
    try:
        res = service.refresh_all_csvs()
        exp_dir = Path(service.exports_dir)
        files = [f.name for f in exp_dir.glob("*.csv")] if exp_dir.exists() else []
        return ExportTriggerResponse(
            status="success",
            exports_directory=str(exp_dir.resolve()),
            generated_files=files
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/csv/prompts")
def export_prompts_csv(service: ExportService = Depends(get_export_service)):
    try:
        out_file = service.export_master_prompts()
        return {"status": "success", "file_path": out_file}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/csv/seo")
def export_seo_csvs(service: ExportService = Depends(get_export_service)):
    try:
        res = service.export_seo_csvs()
        return {"status": "success", "files": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
