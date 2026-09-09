"""
REQ-028: Transaction Middleware & Exception Mappers
===================================================
Dedicated automated test suite proving:
1. Transaction middleware attaches request-scoped transaction headers (X-ERP-Transaction).
2. HTTP 404 StarletteHTTPException is mapped to a standardized JSON error structure.
3. Unhandled general exceptions are mapped to HTTP 500 InternalServerError JSON structures.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from fastapi import APIRouter

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.api.main import app

# Add temporary test route to trigger unhandled exception
test_router = APIRouter()


@test_router.get("/test-unhandled-crash")
def crash_endpoint():
    raise RuntimeError("Deliberate unhandled crash for testing REQ-028")


app.include_router(test_router)


@pytest.fixture(scope="module")
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_req_028_transaction_middleware_header(client):
    """Verify transaction middleware sets transaction header on successful response."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-ERP-Transaction") == "active"


def test_req_028_404_exception_mapper(client):
    """Verify 404 route returns standardized JSON error response."""
    res = client.get("/non-existent-erp-route-404")
    assert res.status_code == 404
    data = res.json()
    assert data["error"] == "HTTPException"
    assert data["status_code"] == 404
    assert "Not Found" in data["detail"]


def test_req_028_500_exception_mapper(client):
    """Verify unhandled exception returns standardized 500 JSON response."""
    res = client.get("/test-unhandled-crash")
    assert res.status_code == 500
    data = res.json()
    assert data["error"] == "InternalServerError"
    assert data["status_code"] == 500
    assert "Deliberate unhandled crash" in data["detail"]
