"""
REQ-020: Pydantic v2 Domain Contracts & DTO Schemas
===================================================
Dedicated automated test suite proving:
1. Pydantic v2 schema instantiation across all domain contracts.
2. Serialization and JSON roundtrip fidelity (model_dump, model_dump_json).
3. Adversarial negative testing: ValidationError raised on missing required fields.
4. Adversarial negative testing: ValidationError raised on invalid data types.
"""

import sys
from pathlib import Path
from datetime import datetime
import pytest
from pydantic import ValidationError

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.contracts.schemas import (
    HealthResponse,
    CategorySchema,
    ElementSchema,
    IdeaSchema,
    PromptSchema,
    EscalationStatusResponse,
    SEOMetadataSchema,
    VideoRecordSchema,
    PackageManifestSchema,
)


def test_req_020_valid_schema_instantiation():
    """Verify clean instantiation of all domain contracts."""
    health = HealthResponse(
        status="healthy",
        service="YouTube ERP",
        version="1.0.0",
        database_connected=True,
        database_url_masked="sqlite:///****",
        timestamp=datetime.now(),
    )
    assert health.status == "healthy"

    category = CategorySchema(id=1, uuid="cat-uuid", name="Machines")
    assert category.name == "Machines"

    element = ElementSchema(id=2, uuid="el-uuid", name="Gear", group_type="Component")
    assert element.group_type == "Component"

    idea = IdeaSchema(id=3, uuid="idea-uuid", title="Idea 3", raw_idea="Raw 3", status="active")
    assert idea.title == "Idea 3"

    prompt = PromptSchema(id=4, uuid="prompt-uuid", idea_id=3, prompt_text="APrompt", status="filled")
    assert prompt.prompt_text == "APrompt"

    status = EscalationStatusResponse(
        idea_id=3,
        total_prompts=20,
        filled_prompts=20,
        required_prompts=20,
        has_level_10_video=True,
        is_complete=True,
    )
    assert status.is_complete is True

    seo = SEOMetadataSchema(
        idea_id=3,
        title="SEO Title",
        seo_description="Long description",
        tags=["ai", "shorts"],
        status="ready",
        is_real_seo=True,
    )
    assert len(seo.tags) == 2

    video = VideoRecordSchema(id=5, idea_id=3, status="completed", file_size_bytes=1024)
    assert video.file_size_bytes == 1024

    pkg = PackageManifestSchema(
        idea_id=3,
        exists=True,
        has_video=True,
        has_prompt_json=True,
        has_seo_json=True,
        complete=True,
    )
    assert pkg.complete is True


def test_req_020_missing_required_fields_validation_error():
    """Verify ValidationError is raised when required schema fields are omitted."""
    with pytest.raises(ValidationError):
        HealthResponse(status="healthy")  # missing service, version, etc.

    with pytest.raises(ValidationError):
        CategorySchema(id=1)  # missing uuid, name

    with pytest.raises(ValidationError):
        IdeaSchema(id=1, uuid="test", title="Missing raw_idea and status")

    with pytest.raises(ValidationError):
        SEOMetadataSchema(idea_id=1, title="Missing tags and description")


def test_req_020_invalid_types_validation_error():
    """Verify ValidationError is raised when wrong types are passed."""
    # id must be integer, not arbitrary string
    with pytest.raises(ValidationError):
        CategorySchema(id="not_an_int", uuid="uuid", name="test")

    # tags must be a list of strings, not a raw integer or boolean
    with pytest.raises(ValidationError):
        SEOMetadataSchema(
            idea_id=1,
            title="Title",
            seo_description="Desc",
            tags=12345,  # type error
            status="ready",
            is_real_seo=True,
        )

    # timestamp must parse to datetime
    with pytest.raises(ValidationError):
        HealthResponse(
            status="healthy",
            service="YouTube ERP",
            version="1.0.0",
            database_connected=True,
            database_url_masked="sqlite:///****",
            timestamp="invalid-datetime-string-xyz",
        )


def test_req_020_json_serialization_roundtrip():
    """Verify schema model_dump and model_dump_json produce valid dictionaries and JSON."""
    pkg = PackageManifestSchema(
        idea_id=10,
        exists=True,
        has_video=True,
        has_prompt_json=True,
        has_seo_json=True,
        complete=True,
    )
    dump_dict = pkg.model_dump()
    assert dump_dict["idea_id"] == 10
    assert dump_dict["complete"] is True

    json_str = pkg.model_dump_json()
    assert '"idea_id":10' in json_str
    reconstructed = PackageManifestSchema.model_validate_json(json_str)
    assert reconstructed.idea_id == pkg.idea_id
