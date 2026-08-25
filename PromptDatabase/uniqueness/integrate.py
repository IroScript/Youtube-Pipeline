"""
Uniqueness Engine — Live Pipeline Integration ("the wiring")
============================================================
WHY THIS MODULE EXISTS
----------------------
Everything else in `uniqueness/` was reachable ONLY from run_uniqueness.py. Verified by
grep: nothing in the production pipeline imported it. So the variation layer had zero
effect on real generation — `prompt_chain_engine.generate_escalation_for_idea()` still
built its prompt from the 3-key template alone, and the element walker still restarted at
element #1 on every call. The diagnosis was correct and the fix was written, but it was
never connected. This module connects it.

HOW IT RESPECTS THE PROJECT'S CODE-PRESERVATION RULES
-----------------------------------------------------
The two touch points live inside prompt_chain_engine.py, which the rules protect. So:

  * Nothing existing is deleted, rewritten, reordered or renamed. Each hook is an
    INSERTION of a self-contained block immediately AFTER an existing anchor line. The
    original statements stay byte-for-byte identical — hook 1 only *appends* to the
    already-built `prompt_instruction`; hook 2 only *re-orders* an already-loaded list.
  * Every block is delimited by unique BEGIN/END sentinel comments, so
    `--uninstall-hooks` removes it exactly and restores the file to its previous state.
  * DRY-RUN BY DEFAULT. `install(apply=False)` prints the unified diff and writes nothing
    — the same contract as run_seo.py, run_uniqueness.py and SUGGESTION_remediation_plan.md.
  * On `--apply`: a timestamped `.bak_<UTC>` copy of the target is written FIRST, then the
    patched source is syntax-checked with compile() before it is allowed to land. If the
    check fails, the write is abandoned and the file is left untouched.
  * Both hooks are wrapped in try/except and gated on an env var, so they FAIL OPEN: if
    the uniqueness package is missing or raises, the engine continues with exactly its
    original behaviour.

THE TWO HOOKS
-------------
  creative_direction  (default ON once installed, kill-switch UNIQUENESS_VARIATION=0)
      Appends the deterministic per-idea creative direction (form / camera / ENDING /
      mood / HUD verbs) to the escalation instruction. This is what stops 35/35 prompts
      sharing one opening and one "descend into a single grain" ending.

  element_spread      (default OFF, opt in with UNIQUENESS_SPREAD=1)
      Re-orders the element list group-balanced so the walker stops draining element #1.
      Default OFF because the ascending-id walk is documented as intentional in
      get_or_create_next_production_ready_prompt()'s own docstring ("Strict Sequential
      Element-by-Element"), and changing which content gets produced next is a product
      decision, not a bug fix.
"""

from __future__ import annotations

import difflib
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent          # ...\PromptDatabase
ENGINE = BASE_DIR / "prompt_chain_engine.py"


def _begin(name: str) -> str:
    return f"# >>> UNIQUENESS-HOOK:{name} BEGIN (added by uniqueness/integrate.py) <<<"


def _end(name: str) -> str:
    return f"# >>> UNIQUENESS-HOOK:{name} END <<<"


@dataclass
class Hook:
    name: str
    target: Path
    anchor: str                 # exact existing line; block is inserted AFTER it
    body: list[str]             # block lines WITHOUT indentation
    indent: str                 # indentation to apply to every block line
    env_var: str
    default_on: bool
    summary: str
    requires: list[str] = field(default_factory=list)   # names that must appear in target

    def block_lines(self) -> list[str]:
        out = [self.indent + _begin(self.name)]
        for ln in self.body:
            out.append((self.indent + ln) if ln.strip() else "")
        out.append(self.indent + _end(self.name))
        return out


# ---------------------------------------------------------------------------
# Hook 1 — per-idea creative direction
# ---------------------------------------------------------------------------
_HOOK_CREATIVE = Hook(
    name="creative_direction",
    target=ENGINE,
    anchor='        prompt_instruction = f"Given {idea.title}, build 10-level escalation (10 image + 10 video prompts in 9:16 ratio)."',
    indent="    ",
    env_var="UNIQUENESS_VARIATION",
    default_on=True,
    summary="append deterministic per-idea creative direction to the escalation prompt",
    requires=["def generate_escalation_for_idea(", "import os"],
    body=[
        "# ADDITIVE: the prompt_instruction built above is preserved verbatim as the prefix;",
        "# this only APPENDS a deterministic per-idea creative direction block (form / camera /",
        "# ENDING / mood / HUD verbs) so two ideas from the same element can no longer collapse",
        "# onto one skeleton. The stored DB template is not modified.",
        "# Kill-switch: set UNIQUENESS_VARIATION=0. Fails open — on any error the original",
        "# prompt_instruction is used unchanged.",
        'if os.getenv("UNIQUENESS_VARIATION", "1") != "0":',
        "    try:",
        "        from uniqueness.escalation import build_creative_direction",
        "        from uniqueness.variation import get_variation",
        '        prompt_instruction = prompt_instruction + "\\n\\n" + build_creative_direction(idea.id)',
        '        print(f"  -> [uniqueness] creative direction applied: {get_variation(idea.id).signature()}")',
        "    except Exception as _uq_err:",
        '        print(f"  [Notice] uniqueness variation layer skipped ({_uq_err}); using base template.")',
    ],
)

# ---------------------------------------------------------------------------
# Hook 2 — group-balanced element visit order
# ---------------------------------------------------------------------------
_HOOK_SPREAD = Hook(
    name="element_spread",
    target=ENGINE,
    anchor="        all_elements = session.exec(select(Element).order_by(Element.id.asc())).all()",
    indent="        ",
    env_var="UNIQUENESS_SPREAD",
    default_on=False,
    summary="optional group-balanced element visit order (default OFF)",
    requires=["def get_or_create_next_production_ready_prompt(", "import os"],
    body=[
        "# ADDITIVE, DEFAULT OFF: re-orders the SAME list loaded above so the walker stops",
        "# draining element #1 (3 elements produced 88.2% of all video while 87 stayed unused).",
        "# reorder_elements_balanced() is a pure permutation — no element is dropped, so the",
        "# walker's coverage is unchanged and only the visit order differs.",
        "# Opt in with UNIQUENESS_SPREAD=1. Fails open to the original ascending-id order.",
        'if os.getenv("UNIQUENESS_SPREAD", "0") == "1":',
        "    try:",
        "        from uniqueness.spread import reorder_elements_balanced",
        "        all_elements = reorder_elements_balanced(all_elements)",
        "        if all_elements:",
        '            print(f"[uniqueness] element visit order: group-balanced "',
        '                  f"(first: #{all_elements[0].id} {all_elements[0].name})")',
        "    except Exception as _uq_err:",
        '        print(f"[Notice] uniqueness spread skipped ({_uq_err}); using ascending element id.")',
    ],
)

HOOKS: list[Hook] = [_HOOK_CREATIVE, _HOOK_SPREAD]


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def hook_status() -> list[dict]:
    """Report, per hook: installed / anchor found / anchor unique / prerequisites present."""
    out = []
    for h in HOOKS:
        if not h.target.exists():
            out.append({"name": h.name, "target": str(h.target), "target_exists": False,
                        "installed": False, "anchor_count": 0, "missing_requires": h.requires,
                        "env_var": h.env_var, "default_on": h.default_on, "summary": h.summary})
            continue
        src = _read(h.target)
        out.append({
            "name": h.name,
            "target": str(h.target),
            "target_exists": True,
            "installed": _begin(h.name) in src,
            "anchor_count": src.count(h.anchor),
            "missing_requires": [r for r in h.requires if r not in src],
            "env_var": h.env_var,
            "default_on": h.default_on,
            "summary": h.summary,
        })
    return out


# ---------------------------------------------------------------------------
# Patch construction
# ---------------------------------------------------------------------------
def _insert_hook(src: str, h: Hook) -> tuple[str, str]:
    """Return (new_src, note). Idempotent: an installed hook is left alone."""
    if _begin(h.name) in src:
        return src, "already installed — skipped"

    n = src.count(h.anchor)
    if n == 0:
        return src, "ANCHOR NOT FOUND — refusing to guess (file changed?)"
    if n > 1:
        return src, f"anchor appears {n}x — ambiguous, refusing to patch"

    missing = [r for r in h.requires if r not in src]
    if missing:
        return src, f"prerequisite missing in target: {missing}"

    lines = src.split("\n")
    try:
        idx = lines.index(h.anchor)
    except ValueError:
        return src, "anchor not found as a whole line — refusing to patch"

    block = h.block_lines()
    # Insert directly after the anchor line, plus one blank separator line for readability.
    new_lines = lines[: idx + 1] + [""] + block + lines[idx + 1:]
    return "\n".join(new_lines), "will insert"


def _remove_hook(src: str, h: Hook) -> tuple[str, str]:
    b, e = _begin(h.name), _end(h.name)
    if b not in src:
        return src, "not installed — nothing to remove"

    lines = src.split("\n")
    start = next((i for i, ln in enumerate(lines) if b in ln), None)
    stop = next((i for i, ln in enumerate(lines) if e in ln), None)
    if start is None or stop is None or stop < start:
        return src, "sentinels malformed — remove manually"

    # Also swallow the single blank separator line we added before the block.
    first = start - 1 if start > 0 and lines[start - 1].strip() == "" else start
    new_lines = lines[:first] + lines[stop + 1:]
    return "\n".join(new_lines), "will remove"


def _diff(old: str, new: str, name: str) -> str:
    return "\n".join(difflib.unified_diff(
        old.split("\n"), new.split("\n"),
        fromfile=f"{name} (current)", tofile=f"{name} (patched)",
        lineterm="", n=3,
    ))


def _syntax_ok(src: str, filename: str) -> tuple[bool, str]:
    try:
        compile(src, filename, "exec")
        return True, ""
    except SyntaxError as e:
        return False, f"{e.__class__.__name__}: {e.msg} (line {e.lineno})"


def _backup(path: Path) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest = path.with_suffix(path.suffix + f".bak_{stamp}")
    shutil.copy2(path, dest)
    return dest


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def _apply_transform(transform, only: str | None, apply: bool) -> dict:
    """Shared install/uninstall driver. Groups hooks per target file."""
    per_target: dict[Path, list[Hook]] = {}
    for h in HOOKS:
        if only and h.name != only:
            continue
        per_target.setdefault(h.target, []).append(h)

    result = {"applied": apply, "targets": [], "notes": [], "ok": True}

    for target, hooks in per_target.items():
        entry = {"target": str(target), "hooks": [], "diff": "", "backup": None,
                 "changed": False, "syntax_ok": None}
        if not target.exists():
            entry["hooks"].append({"name": "*", "note": "target file not found"})
            result["ok"] = False
            result["targets"].append(entry)
            continue

        original = _read(target)
        src = original
        for h in hooks:
            src, note = transform(src, h)
            entry["hooks"].append({"name": h.name, "note": note,
                                   "env_var": h.env_var, "default_on": h.default_on})
            if note.startswith(("ANCHOR", "anchor", "prerequisite", "sentinels")):
                result["ok"] = False

        entry["changed"] = src != original
        if entry["changed"]:
            entry["diff"] = _diff(original, src, target.name)
            ok, err = _syntax_ok(src, str(target))
            entry["syntax_ok"] = ok
            if not ok:
                entry["hooks"].append({"name": "*", "note": f"SYNTAX CHECK FAILED — {err}"})
                result["ok"] = False
            elif apply:
                entry["backup"] = str(_backup(target))
                target.write_text(src, encoding="utf-8", newline="\n")

        result["targets"].append(entry)

    return result


def install(apply: bool = False, only: str | None = None) -> dict:
    """Insert the hook blocks. Dry-run unless apply=True."""
    return _apply_transform(_insert_hook, only, apply)


def uninstall(apply: bool = False, only: str | None = None) -> dict:
    """Remove the hook blocks, restoring the original flow exactly."""
    return _apply_transform(_remove_hook, only, apply)


def format_status() -> str:
    rows = hook_status()
    lines = []
    for r in rows:
        state = "INSTALLED" if r["installed"] else "not installed"
        default = "ON by default" if r["default_on"] else "OFF by default"
        lines.append(f"  [{state:^13}] {r['name']}")
        lines.append(f"                  {r['summary']}")
        lines.append(f"                  target : {Path(r['target']).name}")
        lines.append(f"                  env    : {r['env_var']} ({default})")
        if not r["target_exists"]:
            lines.append("                  !! target file not found")
        elif not r["installed"]:
            if r["anchor_count"] == 1:
                lines.append("                  anchor : found (ready to install)")
            elif r["anchor_count"] == 0:
                lines.append("                  anchor : NOT FOUND — file changed since this hook was written")
            else:
                lines.append(f"                  anchor : ambiguous ({r['anchor_count']} matches)")
            if r["missing_requires"]:
                lines.append(f"                  !! missing prerequisite: {r['missing_requires']}")
        lines.append("")
    return "\n".join(lines)
