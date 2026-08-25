"""
Uniqueness Engine — CLI
=======================
Dry-run by default. Nothing writes to the database unless you pass --apply, and any
--apply run takes a timestamped DB backup first (same contract as the SEO engine and
SUGGESTION_remediation_plan.md).

    run_uniqueness.bat --audit                        full diagnosis, writes nothing
    run_uniqueness.bat --spread                       balanced next-element queue
    run_uniqueness.bat --novelty-scan                 find near-duplicate ideas
    run_uniqueness.bat --novelty-scan --apply         ...and record to duplicate_checks
    run_uniqueness.bat --install-templates-v2         dry-run template diff
    run_uniqueness.bat --install-templates-v2 --apply install v2 (old rows kept, reversible)
    run_uniqueness.bat --rollback-templates --apply   restore the previous templates
    run_uniqueness.bat --preview-idea 33              show the creative direction for one idea

    run_uniqueness.bat --status                       is the layer actually wired into the engine?
    run_uniqueness.bat --verify                       self-test the whole layer (read-only)
    run_uniqueness.bat --install-hooks                dry-run diff of the prompt_chain_engine patch
    run_uniqueness.bat --install-hooks --apply        wire the layer into live generation
    run_uniqueness.bat --uninstall-hooks --apply      unwire it again (exact restore)

Note: --install-templates-v2 changes what NEW prompts are asked for; --install-hooks is what
makes the per-idea variation layer run at all. Without the hooks every module in
uniqueness/ is inert -- reachable from this CLI only, never from real generation.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

DB_PATH = BASE_DIR / "database" / "youtube_pipeline.db"
BACKUP_DIR = BASE_DIR / "output_packaged" / "_backup_uniqueness"

_backed_up = False


def backup_db() -> Path | None:
    global _backed_up
    if _backed_up:
        return None
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest = BACKUP_DIR / f"youtube_pipeline.db.bak_{stamp}"
    shutil.copy2(DB_PATH, dest)
    _backed_up = True
    print(f"[backup] DB -> {dest}")
    return dest


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Prompt/idea uniqueness engine (diagnose + de-duplicate + diversify)",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--audit", action="store_true", help="Full read-only diagnosis")
    g.add_argument("--spread", action="store_true", help="Balanced next-element suggestions")
    g.add_argument("--novelty-scan", action="store_true", help="Find near-duplicate ideas")
    g.add_argument("--install-templates-v2", action="store_true", help="Install v2 prompt templates")
    g.add_argument("--rollback-templates", action="store_true", help="Revert to previous templates")
    g.add_argument("--preview-idea", type=int, help="Show creative direction for one idea id")
    g.add_argument("--status", action="store_true",
                   help="Show whether the layer is wired into prompt_chain_engine.py")
    g.add_argument("--verify", action="store_true",
                   help="Run the self-verification suite (read-only)")
    g.add_argument("--install-hooks", action="store_true",
                   help="Install the prompt_chain_engine hooks so the layer affects real generation")
    g.add_argument("--uninstall-hooks", action="store_true",
                   help="Remove the hooks and restore the original engine flow")

    ap.add_argument("--apply", action="store_true", help="Actually write (default: dry-run)")
    ap.add_argument("--threshold", type=float, default=0.40, help="Novelty similarity threshold")
    ap.add_argument("--limit", type=int, default=10, help="How many suggestions/rows to show")
    ap.add_argument("--json", action="store_true", help="Machine-readable output")
    ap.add_argument("--hook", type=str, default=None,
                    choices=["creative_direction", "element_spread"],
                    help="Limit --install-hooks/--uninstall-hooks to one hook")
    args = ap.parse_args()

    if not args.apply and (args.install_templates_v2 or args.rollback_templates
                           or args.install_hooks or args.uninstall_hooks):
        print("\n*** DRY-RUN — no database writes. Add --apply to persist. ***\n")

    # ---- status: is the layer actually connected? -------------------------
    if args.status:
        from uniqueness.integrate import hook_status, format_status
        rows = hook_status()
        if args.json:
            print(json.dumps(rows, indent=2, ensure_ascii=False))
            return 0
        print("=" * 74)
        print("PIPELINE WIRING STATUS")
        print("=" * 74)
        print(format_status())
        live = [r for r in rows if r["installed"]]
        if not live:
            print("  => NOT WIRED. Every module in uniqueness/ is currently inert: it runs from")
            print("     this CLI but has no effect on real prompt generation.")
            print("     Connect it with:  run_uniqueness.bat --install-hooks --apply")
        else:
            names = ", ".join(r["name"] for r in live)
            print(f"  => WIRED: {names} active in live generation.")
            off = [r for r in rows if not r["installed"]]
            if off:
                print(f"     still inert: {', '.join(r['name'] for r in off)}")
        # Templates are a separate, independent switch — report both so they aren't confused.
        try:
            from sqlalchemy import text
            from database.session import engine
            with engine.connect() as conn:
                vers = conn.execute(text(
                    "SELECT stage_name, version FROM prompting_style_master "
                    "WHERE is_active=1 AND stage_name IN "
                    "('STAGE_2_IDEA_GENERATION','STAGE_3_PROMPT_ESCALATION_MASTER') "
                    "ORDER BY stage_name")).fetchall()
            print("")
            print("  active prompt templates:")
            for stage, ver in vers:
                tag = "v2 (diversified)" if (ver or 1) >= 2 else "v1 (original single skeleton)"
                print(f"    {stage:38} v{ver}  {tag}")
            if vers and all((ver or 1) < 2 for _, ver in vers):
                print("    => run_uniqueness.bat --install-templates-v2 --apply  to diversify these")
        except Exception as exc:
            print(f"  (could not read template versions: {exc})")
        return 0

    # ---- verify ----------------------------------------------------------
    if args.verify:
        from uniqueness.verify import run_verify
        return run_verify()

    # ---- install / uninstall the engine hooks ----------------------------
    if args.install_hooks or args.uninstall_hooks:
        from uniqueness.integrate import install, uninstall
        from uniqueness.verify import run_verify

        verb = "INSTALL" if args.install_hooks else "UNINSTALL"
        print("=" * 74)
        print(f"{verb} PIPELINE HOOKS")
        print("=" * 74)
        if args.install_hooks:
            print("  These are ADDITIVE insertions into prompt_chain_engine.py. No existing line is")
            print("  deleted or rewritten: hook 1 only appends to the prompt string already built,")
            print("  hook 2 only re-orders a list already loaded. Both are env-gated and fail open.")
            print("  A timestamped .bak of the file is written before anything lands, and the")
            print("  patched source must pass compile() first.")
            print("")

        fn = install if args.install_hooks else uninstall
        res = fn(apply=args.apply, only=args.hook)

        for t in res["targets"]:
            print(f"  target: {t['target']}")
            for h in t["hooks"]:
                extra = ""
                if h.get("env_var"):
                    extra = f"   [{h['env_var']}={'1' if h.get('default_on') else '0'} by default]"
                print(f"    - {h['name']:20} {h['note']}{extra}")
            if t["syntax_ok"] is not None:
                print(f"    syntax check: {'PASS' if t['syntax_ok'] else 'FAIL'}")
            if t["backup"]:
                print(f"    backup: {t['backup']}")
            if t["diff"] and not args.json:
                print("")
                print("--- unified diff ---")
                print(t["diff"])
                print("--- end diff ---")
                print("")

        if not res["ok"]:
            print("")
            print("  ABORTED — one or more hooks could not be applied safely (see notes above).")
            print("  Nothing was written.")
            return 1

        if not any(t["changed"] for t in res["targets"]):
            print("")
            print("  Nothing to do — already in the requested state.")
            return 0

        if args.apply:
            print("")
            print("  Applied. Re-running verification to confirm the engine is still sound...")
            print("")
            rc = run_verify()
            if args.install_hooks:
                print("")
                print("  Live generation now uses the variation layer.")
                print("  Disable without unpatching:  set UNIQUENESS_VARIATION=0")
                print("  Enable balanced elements:    set UNIQUENESS_SPREAD=1")
                print("  Full revert:                 run_uniqueness.bat --uninstall-hooks --apply")
            return rc
        print("")
        print("  Dry-run only. Re-run with --apply to write.")
        return 0

    # ---- audit -----------------------------------------------------------
    if args.audit:
        from uniqueness.audit import run_audit
        run_audit(as_json=args.json)
        return 0

    # ---- spread ----------------------------------------------------------
    if args.spread:
        from uniqueness.spread import coverage_report, format_suggestions
        rep = coverage_report()
        if args.json:
            print(json.dumps(rep, indent=2, ensure_ascii=False))
            return 0
        print("=" * 74)
        print("ELEMENT COVERAGE")
        print("=" * 74)
        print(f"  {rep['total_elements']} elements | with ideas: {rep['elements_with_ideas']}"
              f" | never used: {rep['elements_never_used']}"
              f" | producing video: {rep['elements_producing_video']}")
        print(f"  top-3 element share of all video: {rep['top3_element_share_pct']}%")
        print(f"  groups never used: {', '.join(rep['unused_groups'])}")
        print(f"\nBALANCED NEXT {args.limit} ELEMENTS (spread across groups):")
        print(format_suggestions(args.limit))
        print("\n  These replace the ascending-id walk that never left the tree/field cluster.")
        return 0

    # ---- novelty ---------------------------------------------------------
    if args.novelty_scan:
        from uniqueness.novelty import scan, format_report, persist
        pairs = scan(threshold=args.threshold)
        print("=" * 74)
        print(f"IDEA NOVELTY SCAN  (threshold {args.threshold})")
        print("=" * 74)
        print(format_report(pairs, limit=max(args.limit, 25)))
        worst = [p for p in pairs if p.verdict() in ("IDENTICAL_PROMPTS", "NEAR_DUPLICATE")]
        print(f"\n  total flagged: {len(pairs)}   needing action: {len(worst)}")
        if args.apply:
            backup_db()
        res = persist(pairs, apply=args.apply)
        print(f"  duplicate_checks: {res}")
        if args.json:
            print(json.dumps([p.__dict__ for p in pairs], indent=2, ensure_ascii=False))
        return 0

    # ---- templates -------------------------------------------------------
    if args.install_templates_v2:
        from uniqueness.templates import install_v2, validate_templates
        problems = validate_templates()
        print("=" * 74)
        print("TEMPLATE SAFETY CHECK")
        print("=" * 74)
        if problems:
            print("  ABORT — templates would break the existing engine .format() call:")
            for p in problems:
                print(f"    {p}")
            return 1
        print("  OK: v2 templates format cleanly with exactly the keys")
        print("      prompt_chain_engine passes (no KeyError risk).")
        if args.apply:
            backup_db()
        res = install_v2(apply=args.apply)
        print("\nCHANGES:")
        for ch in res["changes"]:
            print(f"  {ch['stage']}")
            print(f"     currently active : {ch['currently_active']}")
            print(f"     new version      : v{ch['new_version']}")
            print(f"     action           : {ch['action']}")
        if args.apply:
            print("\n  Applied. Old rows kept with is_active=0 —")
            print("  revert any time with: run_uniqueness.bat --rollback-templates --apply")
        else:
            print("\n  Dry-run only. Re-run with --apply to install.")
        return 0

    if args.rollback_templates:
        from uniqueness.templates import rollback_v2
        if args.apply:
            backup_db()
        res = rollback_v2(apply=args.apply)
        print("ROLLBACK:", json.dumps(res, indent=2))
        return 0

    # ---- preview one idea ------------------------------------------------
    if args.preview_idea is not None:
        from uniqueness.variation import get_variation
        from uniqueness.escalation import build_creative_direction, preview_prompt
        v = get_variation(args.preview_idea)
        print("=" * 74)
        print(f"CREATIVE DIRECTION — idea #{args.preview_idea}")
        print("=" * 74)
        print(f"  fingerprint : {v.signature()}")
        print(f"  form        : {v.form}")
        print(f"  camera      : {v.camera_move}")
        print(f"  ENDING      : {v.ending}")
        print(f"  mood        : {v.mood}")
        print(f"  HUD verbs   : {' / '.join(v.hud_verbs)}")
        print(f"  pacing      : {v.pacing_desc}")
        print("\n--- creative direction block injected into the LLM prompt ---")
        print(build_creative_direction(args.preview_idea))
        txt = preview_prompt(args.preview_idea)
        if txt:
            print("\n--- full escalation prompt (first 900 chars) ---")
            print(txt[:900])
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
