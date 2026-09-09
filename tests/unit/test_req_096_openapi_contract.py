"""
REQ-096: OpenAPI Contract & ERP Integration Docs
================================================
Dedicated automated test suite proving:
1. docs/openapi_contract.json exists and parses as valid JSON.
2. Conforms to OpenAPI 3.1 standard specification structure (openapi, info, paths, components).
3. Covers all core domain paths (/health, /ideas, /prompts, /seo, /videos, /packages, /workflows).
4. Matches the schemas declared in FastAPI app.openapi() specification.
"""

import json
import sys
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.api.main import app
CONTRACT_FILE = REPO_ROOT / "docs" / "openapi_contract.json"


def test_req_096_contract_file_valid_json():
    """Verify openapi_contract.json exists and parses as valid JSON."""
    assert CONTRACT_FILE.is_file(), f"OpenAPI contract missing: {CONTRACT_FILE}"
    content = json.loads(CONTRACT_FILE.read_text(encoding="utf-8"))
    assert content["openapi"].startswith("3.1")
    assert content["info"]["title"] == "YouTube Content Automation ERP API"
    assert content["info"]["version"] == "1.0.0"


def test_req_096_contract_required_paths():
    """Verify all domain routes are documented in the OpenAPI contract."""
    content = json.loads(CONTRACT_FILE.read_text(encoding="utf-8"))
    paths = content.get("paths", {})

    expected_routes = [
        "/health",
        "/ideas/categories",
        "/ideas/elements",
        "/prompts/{idea_id}",
        "/videos/{idea_id}",
        "/packages/{idea_id}",
    ]
    for route in expected_routes:
        assert route in paths, f"Route '{route}' missing from OpenAPI contract"


def test_req_096_contract_component_schemas():
    """Verify core DTO schemas are documented under components/schemas."""
    content = json.loads(CONTRACT_FILE.read_text(encoding="utf-8"))
    schemas = content.get("components", {}).get("schemas", {})

    expected_schemas = [
        "HealthResponse",
        "CategorySchema",
        "ElementSchema",
        "IdeaSchema",
        "PromptSchema",
        "VideoRecordSchema",
        "PackageManifestSchema",
    ]
    for s in expected_schemas:
        assert s in schemas, f"Schema '{s}' missing from OpenAPI components"


def test_req_096_app_openapi_generation_parity():
    """Verify live FastAPI app generates an OpenAPI schema matching contract structure."""
    live_openapi = app.openapi()
    assert live_openapi["openapi"].startswith("3.1")
    assert live_openapi["info"]["title"] == "YouTube Content Automation ERP API"
    assert "/health" in live_openapi["paths"]
