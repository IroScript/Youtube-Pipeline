"""
SEO Engine — CLI Entrypoint
===========================
Dry-run by default. Nothing touches the database unless you pass --apply.

Typical usage:

  # 1. See what the engine finds for one idea (no writes, no browser)
  run_seo.bat --idea-id 1 --no-browser

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
                        help="Run for every idea whose metadata is still the hardcoded fallback")
    target.add_argument("--list-fallback", action="store_true",
                        help="Audit only: list metadata rows that are still boilerplate")

    ap.add_argument("--apply", action="store_true",
                    help="Actually write to the DB (default is dry-run). Backs up the DB first.")
    ap.add_argument("--force", action="store_true",
                    help="Overwrite existing metadata even when it is NOT the fallback")
    ap.add_argument("--no-browser", action="store_true",
                    help="Skip the browser LLM; use the keyword-grounded deterministic builder")
    ap.add_argument("--limit", type=int, default=0,
                    help="Cap how many ideas a batch processes (0 = no cap)")
    ap.add_argument("--provider", choices=["chatgpt", "gemini"], default=None,
                    help="Browser LLM provider (default: %s)" % config.LLM_PROVIDER)
    ap.add_argument("--json", action="store_true", help="Print machine-readable JSON result")
    args = ap.parse_args()

    if args.provider:
        config.LLM_PROVIDER = args.provider

    use_browser = not args.no_browser

    # --- audit mode -------------------------------------------------------
    if args.list_fallback:
        rows = pipeline.find_fallback_metadata_ideas()
        print("=" * 72)
        print(f"youtube_metadata rows still holding the HARDCODED FALLBACK: {len(rows)}")
        print("=" * 72)
        for r in rows:
            print(f"  idea #{r['idea_id']:>4}  {r['title'][:76]}")
        if rows:
            print("\nRegenerate them with:  run_seo.bat --backfill-fallback --apply")
        if args.json:
            print(json.dumps(rows, indent=2, ensure_ascii=False))
        return 0

    # --- resolve targets --------------------------------------------------
    if args.idea_id:
        idea_ids = [args.idea_id]
    elif args.idea_ids:
        idea_ids = [int(x) for x in args.idea_ids.replace(" ", "").split(",") if x]
    else:
        rows = pipeline.find_fallback_metadata_ideas()
        idea_ids = [r["idea_id"] for r in rows]
        print(f"[backfill] {len(idea_ids)} idea(s) have fallback metadata.")

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
