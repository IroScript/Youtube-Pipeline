"""
YouTube Content Automation ERP — FastAPI Core Application
==========================================================
Main REST API service layer orchestrating ideas, prompts, SEO, video renders, and packages.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from infrastructure.database.engine import init_database
from apps.api.routers import (
    health,
    ideas,
    prompts,
    seo,
    videos,
    packages,
    workflow_builder,
    exports,
    audio,
    youtube,
    uniqueness,
    jobs,
    pipeline,
    executions,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown hooks.
    Ensures database tables are verified on startup.
    """
    init_database()
    yield


app = FastAPI(
    title="YouTube Content Automation ERP API",
    description="Production-grade API-First Control Plane for YouTube Automation & Durable Workflows",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Policy configuration for local and dashboard frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_IDEMPOTENCY_CACHE: dict[str, Any] = {}


@app.middleware("http")
async def transaction_middleware(request: Request, call_next):
    """Request-scoped transaction tracking & idempotency header middleware."""
    idempotency_key = request.headers.get("Idempotency-Key")
    if idempotency_key and request.method == "POST" and idempotency_key in _IDEMPOTENCY_CACHE:
        cached_resp = _IDEMPOTENCY_CACHE[idempotency_key]
        return JSONResponse(status_code=200, content=cached_resp, headers={"X-Idempotency-Cached": "true"})

    response = await call_next(request)
    response.headers["X-ERP-Transaction"] = "active"
    if idempotency_key:
        response.headers["X-Idempotency-Key"] = idempotency_key
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_mapper(request: Request, exc: StarletteHTTPException):
    """Standardized HTTP exception JSON mapper."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTPException",
            "status_code": exc.status_code,
            "detail": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_mapper(request: Request, exc: Exception):
    """Standardized internal server error JSON mapper."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "status_code": 500,
            "detail": str(exc),
        },
    )

# Register API Routers (Full API-Complete Matrix)
app.include_router(health.router)
app.include_router(ideas.router)
app.include_router(prompts.router)
app.include_router(seo.router)
app.include_router(videos.router)
app.include_router(packages.router)
app.include_router(workflow_builder.router)
app.include_router(exports.router)
app.include_router(audio.router)
app.include_router(youtube.router)
app.include_router(uniqueness.router)
app.include_router(jobs.router)
app.include_router(pipeline.router)
app.include_router(executions.router)



@app.get("/")
def root_info():
    return {
        "service": "YouTube Content Automation ERP API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.main:app", host="0.0.0.0", port=8000, reload=True)
