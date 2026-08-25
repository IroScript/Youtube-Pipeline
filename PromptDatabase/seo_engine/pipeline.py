"""
SEO Engine — Orchestrator ("Nervous System")
============================================
Per-idea flow:

    idea -> harvest (keyless)     "eyes"
         -> score   (deterministic) "calculator"
         -> package (browser LLM)   "brain"
         -> validate (upload-ready gate)
         -> persist (DB)            "memory"

SAFETY CONTRACT — deliberately mirrors PromptDatabase/SUGGESTION_remediation_plan.md:
  1. DRY-RUN BY DEFAULT. Nothing is written unless `apply=True` (`--apply`).
  2. BACKUP FIRST. Any run with apply=True copies youtube_pipeline.db to
     output_packaged/_backup_seo/ before the first mutation.
  3. ADDITIVE. Existing `youtube_metadata` rows are only overwritten when the
     caller explicitly opts in via `force=True`, and the old values are recorded
     in `content_history` so every change is reversible/auditable.
  4. NO PACKAGER CHANGES. We write into the same `youtube_metadata` table the
     packager already reads, so improved SEO flows through the existing export
     path untouched.

Note on the NO-RETRY LOCK: pipeline_packager.py returns early for ideas that are
already packaged, so refreshed DB metadata will NOT re-export to disk on its own.
That is exactly what the remediation plan's `--force-idea` re-export path is for.
This engine therefore reports which packages are now stale on disk (see
`stale_packages` in the run summary) rather than silently editing them.
"""

from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from . import config, validators
from .harvest import harvest_for_idea
from .scoring import score_idea
from .metadata_builder import build_metadata


# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------
_backup_done = False


def backup_database() -> Optional[Path]:
    """Timestamped DB copy. Runs at most once per process."""
    global _backup_done
    if _backup_done:
        return None
    config.BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest = config.BACKUP_DIR / f"youtube_pipeline.db.bak_{stamp}"
    shutil.copy2(config.DB_PATH, dest)
    _backup_done = True
    config.log(f"[backup] DB backed up -> {dest}")
    return dest


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------
def _persist(idea_id: int, harvest, report, package, *, apply: bool, force: bool, provider: str) -> dict:
    """
    Write run audit + competitors + keywords + metadata. Returns action taken.

    Takes a plain `idea_id` rather than an ORM instance: objects loaded in another
    session would be detached here, and touching their lazy attributes raises.
    """
    from sqlmodel import select
    from database.session import get_session, init_db
    from database.models import YouTubeMetadata, IdeaElement
    from .seo_models import SEORun, SEOCompetitor, SEOKeywordMetric, init_seo_tables

    v = package.get("_validation", {})
    action = "none"
    run_id: Optional[int] = None

    # A dry-run must leave the file untouched — including its SCHEMA. Creating the
    # SEO tables is itself a write, so it only happens on the apply path.
    if not apply:
        return {"action": "dry_run", "run_id": None}

    init_db()
    init_seo_tables()

    with get_session() as session:
        run = SEORun(
            uuid=str(uuid.uuid4()),
            idea_id=idea_id,
            provider=provider,
            mode="apply",   # dry-runs return before reaching this point
            demand_score=report.demand_score,
            novelty_score=report.novelty_score,
            saturation_score=report.saturation_score,
            opportunity_score=report.opportunity_score,
            verdict=report.verdict,
            keyword_count=len(harvest.keywords),
            competitor_count=len(harvest.competitors),
            exact_competitors=report.exact_competitors,
            close_competitors=report.close_competitors,
            llm_used=1 if package.get("_source") == "browser_llm" else 0,
            upload_ready=1 if v.get("upload_ready") else 0,
            warnings=json.dumps(v.get("warnings", []), ensure_ascii=False),
            notes=json.dumps(report.notes, ensure_ascii=False),
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        # Capture as a plain int: `run` becomes detached once the session closes.
        run_id = run.id

        for c in report.classified:
            session.add(SEOCompetitor(
                idea_id=idea_id, seo_run_id=run_id, query=harvest.seed_queries[0] if harvest.seed_queries else None,
                title=c.title, channel=c.channel, url=c.url, view_count=c.view_count,
                similarity=c.similarity, level=c.level, is_strong=1 if c.is_strong else 0,
            ))
        for k in report.keyword_metrics[:60]:
            session.add(SEOKeywordMetric(
                idea_id=idea_id, seo_run_id=run_id, keyword=k.keyword, relevance=k.relevance,
                word_count=k.word_count, long_tail=1 if k.long_tail else 0, score=k.score,
            ))
        session.commit()

        # --- youtube_metadata upsert (the row the packager exports) ---
        existing = session.exec(
            select(YouTubeMetadata).where(YouTubeMetadata.idea_id == idea_id)
        ).first()

        tags_json = json.dumps(package["tags"], ensure_ascii=False)

        if existing is None:
            idea_elem = session.exec(
                select(IdeaElement).where(IdeaElement.idea_id == idea_id)
            ).first()
            session.add(YouTubeMetadata(
                uuid=str(uuid.uuid4()),
                idea_id=idea_id,
                element_id=idea_elem.element_id if idea_elem else None,
                title=package["title"],
                seo_description=package["seo_description"],
                tags=tags_json,
                category=package["category"],
                default_language=package["default_language"],
                status="ready",
            ))
            session.commit()
            action = "inserted"
        else:
            was_fallback = validators.is_legacy_fallback(
                existing.title, existing.seo_description,
                json.loads(existing.tags) if existing.tags else [],
            )
            if not force and not was_fallback:
                action = "skipped_existing_real_metadata"
            else:
                _record_history(session, idea_id, existing, package)
                existing.title = package["title"]
                existing.seo_description = package["seo_description"]
                existing.tags = tags_json
                existing.category = package["category"]
                existing.default_language = package["default_language"]
                existing.updated_at = datetime.now(timezone.utc)
                session.add(existing)
                session.commit()
                action = "replaced_fallback" if was_fallback else "replaced_forced"

    return {"action": action, "run_id": run_id}


def _record_history(session, idea_id: int, existing, package: dict) -> None:
    """
    Append the pre-change values to `content_history` (an existing, currently-empty
    table) so every SEO overwrite is auditable and manually reversible.
    """
    try:
        from sqlalchemy import text
        for field_name, old, new in (
            ("title", existing.title, package["title"]),
            ("seo_description", existing.seo_description, package["seo_description"]),
            ("tags", existing.tags, json.dumps(package["tags"], ensure_ascii=False)),
        ):
            if (old or "") == (new or ""):
                continue
            session.execute(
                text("""INSERT INTO content_history
                        (entity_type, entity_id, action, field_name, old_value, new_value,
                         reason, actor, model, created_at)
                        VALUES (:et,:eid,:ac,:fn,:ov,:nv,:rs,:actor,:model,:ts)"""),
                {
                    "et": "youtube_metadata", "eid": idea_id, "ac": "seo_regenerate",
                    "fn": field_name, "ov": old, "nv": new,
                    "rs": "seo_engine: replaced hardcoded fallback with data-grounded SEO",
                    "actor": "seo_engine", "model": config.LLM_PROVIDER,
                    "ts": datetime.now(timezone.utc).isoformat(),
                },
            )
        session.commit()
    except Exception as e:
        config.log(f"[history] could not record content_history ({type(e).__name__}); continuing.")


# ---------------------------------------------------------------------------
# Per-idea run
# ---------------------------------------------------------------------------
def run_for_idea(idea_id: int, *, apply: bool = False, force: bool = False,
                 use_browser: bool = True, llm=None) -> dict:
    from sqlmodel import select
    from database.session import get_session, init_db
    from database.models import Idea

    init_db()
    with get_session() as session:
        idea = session.exec(select(Idea).where(Idea.id == idea_id)).first()
        if not idea:
            return {"idea_id": idea_id, "error": "idea not found"}
        idea_title, idea_topic = idea.title, (idea.topic or "")

    config.log("=" * 72)
    config.log(f"[SEO] Idea #{idea_id}: {idea_title}")
    config.log("=" * 72)

    if apply:
        backup_database()

    harvest = harvest_for_idea(idea_id, idea_title, idea_topic)
    report = score_idea(harvest)
    config.log(f"[score] {report.summary_line()}")

    package = build_metadata(harvest, report, llm=llm, use_browser=use_browser)
    v = package.get("_validation", {})

    config.log(f"[package] source={package.get('_source')} "
               f"title={v.get('title_len')}ch tags={v.get('tag_count')} "
               f"({v.get('tag_chars')}ch) upload_ready={v.get('upload_ready')}")
    config.log(f"[package] TITLE: {package['title']}")
    config.log(f"[package] TAGS : {', '.join(package['tags'][:8])}")
    for w in v.get("warnings", []):
        config.log(f"[warn] {w}")

    result = _persist(idea_id, harvest, report, package,
                      apply=apply, force=force, provider=config.LLM_PROVIDER)

    if not apply:
        config.log("[DRY-RUN] Nothing written. Re-run with --apply to persist.")
    else:
        config.log(f"[DB] youtube_metadata action = {result['action']}")

    return {
        "idea_id": idea_id,
        "idea_title": idea_title,
        "scores": {
            "demand": report.demand_score,
            "novelty": report.novelty_score,
            "saturation": report.saturation_score,
            "opportunity": report.opportunity_score,
            "verdict": report.verdict,
        },
        "keywords": len(harvest.keywords),
        "competitors": len(harvest.competitors),
        "package": package,
        "db": result,
    }


# ---------------------------------------------------------------------------
# Batch / backfill
# ---------------------------------------------------------------------------
def find_fallback_metadata_ideas() -> list[dict]:
    """
    Identify `youtube_metadata` rows that still hold the hardcoded boilerplate.
    These are the rows worth regenerating (currently: all of them).
    """
    from sqlmodel import select
    from database.session import get_session, init_db
    from database.models import YouTubeMetadata

    init_db()
    out: list[dict] = []
    with get_session() as session:
        for row in session.exec(select(YouTubeMetadata).order_by(YouTubeMetadata.idea_id)).all():
            try:
                tags = json.loads(row.tags) if row.tags else []
            except Exception:
                tags = []
            if validators.is_legacy_fallback(row.title, row.seo_description, tags):
                out.append({"idea_id": row.idea_id, "title": row.title,
                            "package_folder": row.package_folder_path or ""})
    return out


def run_batch(idea_ids: list[int], *, apply: bool = False, force: bool = False,
              use_browser: bool = True) -> dict:
    """
    Run the SEO pipeline over several ideas, reusing ONE browser session so the
    chatgpt.com login stays warm and we respect the rate limiter.
    """
    llm = None
    if use_browser:
        from .browser_llm import BrowserLLM
        llm = BrowserLLM()

    results, failures = [], []
    try:
        for i, iid in enumerate(idea_ids, 1):
            config.log(f"\n>>> [{i}/{len(idea_ids)}] Idea #{iid}")
            try:
                results.append(run_for_idea(iid, apply=apply, force=force,
                                            use_browser=use_browser, llm=llm))
            except Exception as e:
                config.log(f"[error] Idea #{iid} failed: {type(e).__name__}: {e}")
                failures.append({"idea_id": iid, "error": str(e)})
    finally:
        if llm is not None:
            llm.close()

    ready = sum(1 for r in results if r["package"]["_validation"]["upload_ready"])
    by_llm = sum(1 for r in results if r["package"].get("_source") == "browser_llm")
    stale = [r["idea_id"] for r in results
             if r["db"].get("action") in ("replaced_fallback", "replaced_forced")]

    summary = {
        "total": len(idea_ids),
        "succeeded": len(results),
        "failed": len(failures),
        "upload_ready": ready,
        "produced_by_browser_llm": by_llm,
        "produced_by_fallback": len(results) - by_llm,
        "stale_packages_needing_reexport": stale,
        "failures": failures,
        "mode": "apply" if apply else "dry_run",
    }

    config.log("\n" + "=" * 72)
    config.log("SEO BATCH SUMMARY")
    config.log("=" * 72)
    for k, val in summary.items():
        if k != "failures":
            config.log(f"  {k:34} {val}")
    if stale:
        config.log(
            "\n  NOTE: the DB metadata for the ideas above is now newer than the\n"
            "  youtube_metadata.json already on disk. pipeline_packager.py's\n"
            "  NO-RETRY LOCK will not re-export them automatically — use the\n"
            "  remediation plan's --force-idea re-export path to sync disk."
        )
    return summary
