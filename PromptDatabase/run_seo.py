"""
SEO Engine — CLI Entrypoint
===========================
Dry-run by default. Nothing touches the database unless you pass --apply.

Typical usage:

  # 1. See what the engine finds for one idea (dry-run, no writes)
  run_seo.bat --idea-id 1

  # 2. Same, but let the browser LLM (chatgpt.com via CloakBrowser) write the copy
  run_seo.bat --idea-id 1

  # 3. Audit: which youtube_metadata rows are still the hardcoded fallback?
  run_seo.bat --list-fallback

  # 4. Regenerate the fallback rows for real (backs up the DB first)
  run_seo.bat --backfill-fallback --apply

  # 5. One specific idea, overwriting even good existing metadata
  run_seo.bat --idea-id 12 --apply --force
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from seo_engine import config, pipeline   # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Keyless YouTube SEO engine (CloakBrowser LLM + keyless data sources)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    target = ap.add_mutually_exclusive_group(required=True)
    target.add_argument("--idea-id", type=int, help="Run SEO for one idea id")
    target.add_argument("--idea-ids", type=str, help="Comma-separated idea ids")
    target.add_argument("--backfill-fallback", action="store_true",
                        help="Run for ideas needing real SEO")
    target.add_argument("--all-pending", action="store_true",
                        help="Run for all ideas that do not have real SEO yet")
    target.add_argument("--list-fallback", action="store_true",
                        help="Audit only: list ideas needing real SEO")
    target.add_argument("--list-pending", action="store_true",
                        help="Audit only: list ideas needing real SEO")

    ap.add_argument("--escalation-only", action="store_true",
                    help="Only process ideas that already have 20/20 escalation prompts ready")
    ap.add_argument("--apply", action="store_true",
                    help="Actually write to the DB (default is dry-run). Backs up the DB first.")
    ap.add_argument("--force", action="store_true",
                    help="Overwrite existing metadata even when it is NOT the fallback")
    ap.add_argument("--limit", type=int, default=0,
                    help="Cap how many ideas a batch processes (0 = no cap)")
    ap.add_argument("--provider", choices=["chatgpt", "gemini"], default=None,
                    help="Browser LLM provider (default: %s)" % config.LLM_PROVIDER)
    ap.add_argument("--json", action="store_true", help="Print machine-readable JSON result")
    args = ap.parse_args()

    if args.provider:
        config.LLM_PROVIDER = args.provider

    use_browser = True

    # --- audit mode -------------------------------------------------------
    if args.list_fallback or args.list_pending:
        rows = pipeline.find_pending_seo_ideas(escalation_only=args.escalation_only)
        print("=" * 72)
        print(f"Ideas pending real SEO in database: {len(rows)}")
        ready_esc = sum(1 for r in rows if r.get("has_escalation"))
        print(f"  • With 20/20 escalation prompts ready: {ready_esc}")
        print(f"  • Awaiting prompt escalation first  : {len(rows) - ready_esc}")
        print("=" * 72)
        for r in rows:
            esc_mark = "[PROMPTS READY 20/20]" if r.get("has_escalation") else "[NEEDS PROMPTS]"
            print(f"  Idea #{r['idea_id']:>4}  {esc_mark:<22}  {r['title'][:45]}")
        if rows:
            print("\nGenerate SEO for prompt-ready ideas with:  run_seo.bat --all-pending --escalation-only --apply")
            print("Or for all pending ideas with:             run_seo.bat --all-pending --apply")
        if args.json:
            print(json.dumps(rows, indent=2, ensure_ascii=False))
        return 0

    # --- resolve targets --------------------------------------------------
    if args.idea_id:
        idea_ids = [args.idea_id]
    elif args.idea_ids:
        idea_ids = [int(x) for x in args.idea_ids.replace(" ", "").split(",") if x]
    else:
        rows = pipeline.find_pending_seo_ideas(escalation_only=args.escalation_only)
        idea_ids = [r["idea_id"] for r in rows]
        print(f"[pending] {len(idea_ids)} idea(s) pending real SEO (escalation_only={args.escalation_only}).")

    if args.limit and len(idea_ids) > args.limit:
        print(f"[limit] capping {len(idea_ids)} -> {args.limit} ideas this run.")
        idea_ids = idea_ids[: args.limit]

    if not idea_ids:
        print("Nothing to do.")
        return 0

    if not args.apply:
        print("\n*** DRY-RUN — no database writes. Add --apply to persist. ***\n")

    # --- execute ----------------------------------------------------------
    if len(idea_ids) == 1:
        llm = None
        if use_browser:
            from seo_engine.browser_llm import BrowserLLM
            llm = BrowserLLM()
        try:
            result = pipeline.run_for_idea(idea_ids[0], apply=args.apply, force=args.force,
                                          use_browser=use_browser, llm=llm)
        finally:
            if llm is not None:
                llm.close()
        if args.json:
            print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
        return 0 if "error" not in result else 1

    summary = pipeline.run_batch(idea_ids, apply=args.apply, force=args.force,
                                 use_browser=use_browser)
    if args.json:
        print(json.dumps(summary, indent=2, ensure_ascii=False, default=str))
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
