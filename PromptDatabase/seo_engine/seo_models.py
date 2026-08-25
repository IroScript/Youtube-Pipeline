"""
SEO Engine — Additive Database Models ("Memory")
================================================
IMPORTANT — non-destructive by design:
  * This file does NOT import from, modify, or re-declare anything in
    database/models.py. Existing tables keep their exact schema.
  * `SQLModel.metadata.create_all()` only CREATES MISSING tables, so calling
    init_seo_tables() can never alter or drop an existing table.
  * Final upload-ready metadata is still written into the EXISTING
    `youtube_metadata` table, which pipeline_packager.py already reads from.
    That means the packager needs zero changes to benefit from real SEO.

Existing empty tables we deliberately reuse instead of duplicating:
  * `idea_features`   -> novelty_score / creativity_score / originality_score
  * `tags` / `idea_tags` -> mined keyword vocabulary

New tables added here (nothing in the DB covers these):
  * `seo_runs`             -> one audit row per SEO run (traceability)
  * `seo_competitors`      -> discovered competitor SERP rows + classification
  * `seo_keyword_metrics`  -> scored keyword universe per idea
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SEORun(SQLModel, table=True):
    __tablename__ = "seo_runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    idea_id: int = Field(index=True)
    provider: Optional[str] = None            # chatgpt | gemini | none(dry-run)
    mode: str = "dry_run"                     # dry_run | apply
    demand_score: Optional[float] = None
    novelty_score: Optional[float] = None
    saturation_score: Optional[float] = None
    opportunity_score: Optional[float] = None
    verdict: Optional[str] = None             # publish | promising | crowded | insufficient_data
    keyword_count: int = 0
    competitor_count: int = 0
    exact_competitors: int = 0
    close_competitors: int = 0
    llm_used: int = 0                         # 1 if the browser LLM produced the package
    upload_ready: int = 0
    warnings: Optional[str] = None            # JSON array of validator warnings
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class SEOCompetitor(SQLModel, table=True):
    __tablename__ = "seo_competitors"

    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: int = Field(index=True)
    seo_run_id: Optional[int] = Field(default=None, index=True)
    query: Optional[str] = None
    video_id: Optional[str] = Field(default=None, index=True)
    title: Optional[str] = None
    channel: Optional[str] = None
    url: Optional[str] = None
    view_count: Optional[int] = None
    duration_seconds: Optional[int] = None
    similarity: Optional[float] = None
    level: Optional[str] = None               # EXACT | CLOSE | SUBSTITUTE | IRRELEVANT
    is_strong: int = 0
    discovered_at: datetime = Field(default_factory=_utcnow)


class SEOKeywordMetric(SQLModel, table=True):
    __tablename__ = "seo_keyword_metrics"

    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: int = Field(index=True)
    seo_run_id: Optional[int] = Field(default=None, index=True)
    keyword: str
    relevance: Optional[float] = None
    word_count: Optional[int] = None
    long_tail: int = 0
    score: Optional[float] = None
    source: str = "youtube_suggest"
    created_at: datetime = Field(default_factory=_utcnow)


def init_seo_tables() -> None:
    """
    Create ONLY the new SEO tables if they do not exist.
    Safe/idempotent: create_all never modifies or drops existing tables.
    """
    from database.session import engine
    SQLModel.metadata.create_all(
        engine,
        tables=[
            SEORun.__table__,
            SEOCompetitor.__table__,
            SEOKeywordMetric.__table__,
        ],
    )
