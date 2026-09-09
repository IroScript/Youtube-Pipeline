"""
Unified CLI Pipeline Runner (Service Layer Delegator)
=====================================================
Enforces architectural rule: Both CLI and FastAPI share the EXACT same service layer.
No business logic duplicated between CLI scripts and REST endpoints.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from infrastructure.database.session import get_session
from services.research.idea_service import IdeaService
from services.scripting.prompt_service import PromptService
from services.seo.seo_service import SEOService
from services.video.video_service import VideoService
from services.packaging.package_service import PackageService
from services.export_service import ExportService


def cmd_status() -> None:
    with get_session() as session:
        service = IdeaService(session)
        summary = service.get_gates_summary()
        total = summary.get("total_ideas", 0)
        counts = summary.get("counts", {})
        print("=" * 72)
        print(f"UNIFIED PIPELINE STATUS — {total} IDEAS")
        print("=" * 72)
        for stage, done in counts.items():
            bar = "#" * int(30 * done / total) if total else ""
            print(f"  {stage:12s} {done:4d}/{total:<4d} {bar:<30s}")


def cmd_plan(idea_id: int) -> None:
    with get_session() as session:
        service = IdeaService(session)
        rep = service.get_stage_report(idea_id)
        if "error" in rep:
            print(f"Idea #{idea_id}: {rep['error']}")
            return
        print("=" * 72)
        print(f"PLAN — Idea #{idea_id}: {rep.get('title')}")
        print("=" * 72)
        for stage, ok in rep.get("stages", {}).items():
            mark = "OK  " if ok else "MISS"
            print(f"  [{mark}] {stage}")
        print(f"\n  -> Next missing stage: {rep.get('next_missing')}")


def cmd_export() -> None:
    service = ExportService()
    res = service.refresh_all_csvs()
    print("Master CSVs refreshed successfully.")
    print(f"Export dir: {res['exports_directory']}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Unified Service-Layer CLI Runner")
    ap.add_argument("--status", action="store_true", help="Print pipeline stage gates status")
    ap.add_argument("--plan", type=int, metavar="IDEA_ID", help="Inspect missing stage for an idea")
    ap.add_argument("--export", action="store_true", help="Refresh all master CSV spreadsheets")
    args = ap.parse_args()

    if args.status:
        cmd_status()
    elif args.plan is not None:
        cmd_plan(args.plan)
    elif args.export:
        cmd_export()
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
