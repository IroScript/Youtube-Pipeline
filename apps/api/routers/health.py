"""
Health & Telemetry Router
=========================
Reports API operational status, database connectivity, and environment info.
"""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlmodel import Session, text
from infrastructure.database.session import get_db_session
from infrastructure.database.engine import get_database_url
from shared.contracts.schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
def get_health_status(session: Session = Depends(get_db_session)) -> HealthResponse:
    db_connected = False
    try:
        session.exec(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    raw_url = get_database_url()
    # Mask password if present
    masked_url = raw_url
    if "@" in raw_url and "://" in raw_url:
        protocol_and_auth, host = raw_url.split("@", 1)
        protocol = protocol_and_auth.split("://")[0]
        masked_url = f"{protocol}://***:***@{host}"

    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        service="YouTube Content Automation ERP API",
        version="1.0.0",
        database_connected=db_connected,
        database_url_masked=masked_url,
        timestamp=datetime.now(timezone.utc),
    )
