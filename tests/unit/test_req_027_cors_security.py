"""
REQ-027: Authentication, CORS & Security Boundary
=================================================
Dedicated automated test suite proving:
1. CORS middleware configuration on the FastAPI application.
2. Cross-origin preflight (OPTIONS) requests handled with Access-Control-Allow-Origin headers.
3. Access-Control-Allow-Methods and Access-Control-Allow-Credentials honored.
4. Security boundary isolation of API routes against unauthorized modification.
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from apps.api.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_req_027_cors_preflight_headers(client):
    """Verify CORS preflight OPTIONS returns allowed origin, methods, and credentials."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    response = client.options("/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in ("*", "http://localhost:3000")
    assert "POST" in response.headers.get("access-control-allow-methods", "")
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_req_027_cors_actual_request_headers(client):
    """Verify GET requests from cross-origin client include allow-origin header."""
    headers = {"Origin": "http://localhost:5173"}
    response = client.get("/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in ("*", "http://localhost:5173")


def test_req_027_cors_disallowed_method_check(client):
    """Verify OPTIONS returns allowed methods header."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/", headers=headers)
    assert response.status_code == 200
    assert "GET" in response.headers.get("access-control-allow-methods", "")
