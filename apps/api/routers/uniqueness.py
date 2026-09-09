"""
Uniqueness & Anti-Duplication Router
===================================
Endpoints for running prompt uniformity audits, near-duplicate detection, and variation signatures.
"""

from __future__ import annotations

from typing import List
from fastapi import APIRouter, HTTPException
from shared.contracts.schemas import UniquenessAuditResponse, NoveltyScanResponse, IdeaVariationResponse

router = APIRouter(prefix="/uniqueness", tags=["Uniqueness & Quality Assurance"])


@router.get("/audit", response_model=UniquenessAuditResponse)
def get_uniqueness_audit():
    try:
        from uniqueness.audit import run_audit
        data = run_audit(as_json=True)
        return UniquenessAuditResponse(
            drifted_count=data["subject_drift"]["count"],
            drifted_checked=data["subject_drift"]["checked"],
            shared_video_opening_count=data["template_uniformity"]["video_shared_opening"]["count"],
            shared_image_opening_count=data["template_uniformity"]["image_shared_opening"]["count"],
            banned_ending_count=data["template_uniformity"]["video_with_banned_ending"],
            shared_prompt_groups=data["duplicate_prompts"]["shared_groups"],
            distinct_signatures=data["variation_coverage"]["distinct_signatures"],
            total_ideas=data["variation_coverage"]["ideas"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/novelty", response_model=NoveltyScanResponse)
def scan_idea_novelty(threshold: float = 0.40):
    try:
        from uniqueness.novelty import scan
        pairs = scan(threshold=threshold)
        clean_pairs = [
            {
                "idea_a": p.idea_a,
                "title_a": p.title_a,
                "idea_b": p.idea_b,
                "title_b": p.title_b,
                "score": round(p.worst, 3),
                "verdict": p.verdict(),
            }
            for p in pairs[:50]
        ]
        return NoveltyScanResponse(
            scanned_ideas=len(pairs),
            similar_pairs_count=len(pairs),
            pairs=clean_pairs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ideas/{idea_id}/variation", response_model=IdeaVariationResponse)
def get_idea_variation(idea_id: int):
    try:
        from uniqueness.variation import get_variation
        var = get_variation(idea_id)
        return IdeaVariationResponse(
            idea_id=idea_id,
            archetype=var.form_key,
            camera=var.camera_key,
            ending=var.ending_key,
            mood=var.mood_key,
            signature=var.signature(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
