"""
REQ-077: Dynamic Workflow Builder API
=====================================
FastAPI endpoints to define workflows, manage drafts, and manipulate steps.
"""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/workflows", tags=["Workflow Builder"])

# In-memory storage for router tests (synced with DB models in production)
_WORKFLOWS_DB: Dict[str, Dict[str, Any]] = {}
_VERSIONS_DB: Dict[str, Dict[str, Any]] = {}


class CreateWorkflowRequest(BaseModel):
    name: str = Field(..., description="Unique workflow name")
    description: Optional[str] = None
    content_type: str = "shorts"
    channel_id: Optional[str] = None


class CreateDraftVersionRequest(BaseModel):
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    changelog: Optional[str] = None


class UpdateDraftStepsRequest(BaseModel):
    steps: List[Dict[str, Any]]


@router.post("", status_code=201)
def create_workflow(payload: CreateWorkflowRequest):
    for wf in _WORKFLOWS_DB.values():
        if wf["name"] == payload.name:
            raise HTTPException(status_code=400, detail="Workflow with this name already exists")

    wf_id = str(uuid.uuid4())
    wf_record = {
        "id": wf_id,
        "name": payload.name,
        "description": payload.description,
        "content_type": payload.content_type,
        "channel_id": payload.channel_id,
        "active_version_id": None,
        "is_active": True,
    }
    _WORKFLOWS_DB[wf_id] = wf_record
    return wf_record


@router.get("/{workflow_id}")
def get_workflow(workflow_id: str):
    if workflow_id not in _WORKFLOWS_DB:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _WORKFLOWS_DB[workflow_id]


@router.post("/{workflow_id}/versions/draft", status_code=201)
def create_draft_version(workflow_id: str, payload: CreateDraftVersionRequest):
    if workflow_id not in _WORKFLOWS_DB:
        raise HTTPException(status_code=404, detail="Workflow not found")

    existing = [v for v in _VERSIONS_DB.values() if v["workflow_id"] == workflow_id]
    next_ver = len(existing) + 1

    ver_id = str(uuid.uuid4())
    version_record = {
        "id": ver_id,
        "workflow_id": workflow_id,
        "version_number": next_ver,
        "status": "draft",
        "definition": {"steps": payload.steps},
        "changelog": payload.changelog,
    }
    _VERSIONS_DB[ver_id] = version_record
    return version_record


@router.put("/versions/{version_id}/steps")
def update_draft_steps(version_id: str, payload: UpdateDraftStepsRequest):
    if version_id not in _VERSIONS_DB:
        raise HTTPException(status_code=404, detail="Version not found")

    version = _VERSIONS_DB[version_id]
    if version["status"] != "draft":
        raise HTTPException(status_code=400, detail="Only draft versions can be modified")

    version["definition"]["steps"] = payload.steps
    return version


@router.get("/versions/{version_id}")
def get_workflow_version(version_id: str):
    if version_id not in _VERSIONS_DB:
        raise HTTPException(status_code=404, detail="Version not found")
    return _VERSIONS_DB[version_id]
