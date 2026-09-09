"""
Ideas & Categories Router
=========================
Endpoints for querying categories, elements, and ideas.
"""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from apps.api.dependencies import get_idea_service
from services.research.idea_service import IdeaService
from shared.contracts.schemas import (
    CategorySchema,
    ElementSchema,
    IdeaSchema,
    CreateIdeaRequest,
    GenerateElementIdeasRequest,
    GenerateElementIdeasResponse,
    GenerateElementRequest,
    GenerateElementResponse,
)

router = APIRouter(prefix="/ideas", tags=["Ideas & Taxonomy"])


@router.get("/categories", response_model=List[CategorySchema])
def list_categories(service: IdeaService = Depends(get_idea_service)):
    return service.list_categories()


@router.get("/elements", response_model=List[ElementSchema])
def list_elements(skip: int = 0, limit: int = 100, service: IdeaService = Depends(get_idea_service)):
    return service.list_elements(skip=skip, limit=limit)


@router.get("/elements/{element_id}/ideas", response_model=List[IdeaSchema])
def list_ideas_for_element(element_id: int, service: IdeaService = Depends(get_idea_service)):
    ideas = service.list_ideas_for_element(element_id)
    return ideas


@router.get("/gates/summary")
def get_gates_summary(service: IdeaService = Depends(get_idea_service)):
    return service.get_gates_summary()


@router.get("/{idea_id}/gates")
def get_idea_gates(idea_id: int, service: IdeaService = Depends(get_idea_service)):
    rep = service.get_stage_report(idea_id)
    if "error" in rep:
        raise HTTPException(status_code=404, detail=rep["error"])
    return rep


@router.get("/{idea_id}")
def get_idea_details(idea_id: int, service: IdeaService = Depends(get_idea_service)):
    summary = service.get_idea_summary(idea_id)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Idea #{idea_id} not found")
    return summary


@router.post("", response_model=IdeaSchema, status_code=201)
def create_idea(
    payload: CreateIdeaRequest,
    service: IdeaService = Depends(get_idea_service)
):
    try:
        new_idea = service.create_custom_idea(
            title=payload.title,
            topic=payload.topic,
            category_id=payload.category_id,
            category=payload.category or "Impossible Giant Machine",
            description=payload.description,
            element_id=payload.element_id
        )
        return new_idea
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/elements/{element_id}/generate", response_model=GenerateElementIdeasResponse)
def generate_ideas_for_element(
    element_id: int,
    payload: GenerateElementIdeasRequest = GenerateElementIdeasRequest(),
    service: IdeaService = Depends(get_idea_service)
):
    try:
        elem = service.get_element_by_id(element_id)
        if not elem:
            raise HTTPException(status_code=404, detail=f"Element #{element_id} not found")

        ideas = service.generate_ideas_for_element(
            element_id=element_id,
            skip_browser=payload.skip_browser,
            target_total=payload.target_total
        )
        return GenerateElementIdeasResponse(
            element_id=element_id,
            element_name=elem.name,
            generated_count=len(ideas),
            ideas=ideas
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/categories/{category_id}/elements/generate", response_model=GenerateElementResponse)
def generate_element_from_category(
    category_id: int,
    payload: GenerateElementRequest = GenerateElementRequest(),
    service: IdeaService = Depends(get_idea_service)
):
    try:
        new_elem = service.generate_new_element_from_category(
            category_id=category_id,
            skip_browser=payload.skip_browser
        )
        return GenerateElementResponse(category_id=category_id, element=new_elem)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

