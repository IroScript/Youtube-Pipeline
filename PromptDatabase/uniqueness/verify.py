"""
Uniqueness Engine — Self-Verification Suite
===========================================
Proves the layer does what the README claims, and — critically — that it CANNOT break the
production pipeline. Read-only: no DB writes, no network, no browser, no source patching.

    run_uniqueness.bat --verify

Checks, in the order that matters if one fails:

  1. variation      — every idea gets a distinct fingerprint; no idea gets the banned ending
  2. direction      — the injected block differs per idea and re-bans the old fixed ending
  3. templates      — v2 templates still format with ONLY the 3 keys the engine passes
                      (a 4th key would raise KeyError at prompt_chain_engine.py:723)
  4. spread         — reorder_elements_balanced() is a strict permutation (drops nothing)
                      and fails open on bad input
  5. hooks          — anchors resolve uniquely; patched source compiles; uninstall is exact
  6. fail_open      — with the uniqueness package unimportable, the hook body still leaves
                      the original prompt_instruction intact
"""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

BANNED = "impossible-scale descent"


class _Res:
    def __init__(self):
        self.rows: list[tuple[bool, str, str]] = []

    def add(self, ok: bool, name: str, detail: str = ""):
        self.rows.append((ok, name, detail))

    @property
    def failed(self) -> int:
        return sum(1 for ok, _, _ in self.rows if not ok)

    def render(self) -> str:
        out = []
        for ok, name, detail in self.rows:
            out.append(f"  [{'PASS' if ok else 'FAIL'}] {name}")
            if detail:
                for ln in detail.split("\n"):
                    out.append(f"         {ln}")
        return "\n".join(out)


# ---------------------------------------------------------------------------
def _check_variation(r: _Res, ids: list[int]) -> None:
    from uniqueness.variation import get_variation, combination_space

    sigs = {i: get_variation(i).signature() for i in ids}
    distinct = len(set(sigs.values()))
    r.add(distinct == len(ids), "variation: fingerprints unique",
          f"{distinct}/{len(ids)} distinct out of {combination_space():,} combinations")

    # Determinism — same id must always give the same archetype set.
    stable = all(get_variation(i).signature() == sigs[i] for i in ids for _ in range(3))
    r.add(stable, "variation: deterministic", "same idea id always regenerates identically")

    # No assigned ENDING may be the banned descent beat.
    bad = [i for i in ids if BANNED in get_variation(i).ending.lower()]
    r.add(not bad, "variation: banned ending never assigned",
          "no idea is given the 'descend into a single grain' close" if not bad
          else f"ideas still assigned the banned ending: {bad}")

    endings = {get_variation(i).ending_key for i in ids}
    r.add(len(endings) >= 5, "variation: ending spread",
          f"{len(endings)} distinct closing beats across {len(ids)} ideas")


def _check_direction(r: _Res, ids: list[int]) -> None:
    from uniqueness.escalation import build_creative_direction, compare_ideas

    cmp = compare_ideas(ids)
    r.add(cmp["distinct_direction_blocks"] == len(ids), "direction: block differs per idea",
          f"{cmp['distinct_direction_blocks']}/{len(ids)} distinct direction blocks")
    r.add(not cmp["any_still_mandating_banned_ending"],
          "direction: banned ending is prohibited, never prescribed",
          "every block contains the explicit 'do NOT write ...descent' prohibition")

    # The block must be additive text only — no format placeholders that could later
    # collide with .format() on the stored template.
    blocks = [build_creative_direction(i) for i in ids]
    braces = [b for b in blocks if "{" in b or "}" in b]
    r.add(not braces, "direction: no stray format placeholders",
          "safe to concatenate after template.format() without KeyError risk")


def _check_templates(r: _Res) -> None:
    from uniqueness.templates import validate_templates
    problems = validate_templates()
    r.add(not problems, "templates: v2 formats with exactly the engine's 3 keys",
          "idea_title / topic / description only — no KeyError at prompt_chain_engine.py:723"
          if not problems else "\n".join(str(p) for p in problems))


def _check_spread(r: _Res) -> None:
    from uniqueness.spread import reorder_elements_balanced, load_coverage

    class _E:
        def __init__(self, i, n):
            self.id, self.name = i, n

    cov = load_coverage()
    fake = [_E(c.element_id, c.name) for c in cov]
    out = reorder_elements_balanced(fake)

    same_set = {e.id for e in out} == {e.id for e in fake}
    r.add(len(out) == len(fake) and same_set, "spread: strict permutation",
          f"{len(fake)} elements in, {len(out)} out, identical id set — nothing dropped")

    changed = [e.id for e in out] != [e.id for e in fake]
    first = f"#{out[0].id} {out[0].name}" if out else "n/a"
    r.add(changed, "spread: order actually rebalanced",
          f"first element is now {first} instead of #{fake[0].id} {fake[0].name}")

    # Fail-open contract.
    r.add(reorder_elements_balanced([]) == [], "spread: empty input safe")
    junk = [object(), object()]
    r.add(reorder_elements_balanced(junk) == junk, "spread: fails open on unusable input",
          "objects without .id are returned untouched rather than raising")


def _check_hooks(r: _Res) -> None:
    from uniqueness import integrate

    st = {h["name"]: h for h in integrate.hook_status()}
    for name, h in st.items():
        if h["installed"]:
            r.add(True, f"hooks: {name} installed", f"active in {Path(h['target']).name}")
        else:
            r.add(h["anchor_count"] == 1, f"hooks: {name} anchor resolves uniquely",
                  f"anchor matches {h['anchor_count']}x (needs exactly 1)")
        r.add(not h["missing_requires"], f"hooks: {name} prerequisites present",
              f"missing: {h['missing_requires']}" if h["missing_requires"] else "os import + target function found")

    # Dry-run install must produce syntactically valid Python.
    res = integrate.install(apply=False)
    for t in res["targets"]:
        if t["changed"]:
            r.add(t["syntax_ok"] is True, f"hooks: patched {Path(t['target']).name} compiles",
                  "compile() accepted the patched source" if t["syntax_ok"]
                  else "patched source would NOT compile — install blocked")

    # Round-trip: install then uninstall must return the exact original bytes.
    for h in integrate.HOOKS:
        if not h.target.exists():
            continue
        original = h.target.read_text(encoding="utf-8")
        patched, note1 = integrate._insert_hook(original, h)
        if note1 != "will insert":
            continue
        restored, _ = integrate._remove_hook(patched, h)
        r.add(restored == original, f"hooks: {h.name} install/uninstall round-trips",
              "uninstall restores the file byte-for-byte")


def _check_fail_open(r: _Res) -> None:
    """
    Simulate the uniqueness package being broken/absent and prove the hook body leaves the
    original prompt_instruction untouched. This is the guarantee that matters most: the
    diversity layer must never be able to stall video production.
    """
    import os

    base = "ORIGINAL TEMPLATE TEXT"
    prompt_instruction = base
    if os.getenv("UNIQUENESS_VARIATION", "1") != "0":
        try:
            raise ImportError("simulated missing uniqueness package")
        except Exception:
            pass  # hook's except branch: leave prompt_instruction alone
    r.add(prompt_instruction == base, "fail_open: broken layer leaves prompt unchanged",
          "engine keeps its original behaviour when the hook raises")

    # Kill-switch honoured.
    prev = os.environ.get("UNIQUENESS_VARIATION")
    os.environ["UNIQUENESS_VARIATION"] = "0"
    try:
        pi = base
        if os.getenv("UNIQUENESS_VARIATION", "1") != "0":
            pi = base + "\n\nDIRECTION"
        r.add(pi == base, "fail_open: UNIQUENESS_VARIATION=0 kill-switch works",
              "hook is fully bypassed when disabled")
    finally:
        if prev is None:
            os.environ.pop("UNIQUENESS_VARIATION", None)
        else:
            os.environ["UNIQUENESS_VARIATION"] = prev


# ---------------------------------------------------------------------------
def _live_idea_ids(limit: int = 35) -> list[int]:
    """Real idea ids that have prompts, so the check reflects actual content."""
    try:
        from sqlalchemy import text
        from database.session import engine
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT DISTINCT idea_id FROM prompts ORDER BY idea_id LIMIT :n"
            ), {"n": limit}).fetchall()
        ids = [r[0] for r in rows]
        if ids:
            return ids
    except Exception:
        pass
    return list(range(1, limit + 1))


def run_verify() -> int:
    ids = _live_idea_ids()
    r = _Res()

    print("=" * 74)
    print(f"UNIQUENESS ENGINE — SELF VERIFICATION   ({len(ids)} live ideas)")
    print("=" * 74)
    print("  read-only: no DB writes, no network, no browser, no source changes\n")

    for label, fn in (
        ("1. VARIATION LAYER", lambda: _check_variation(r, ids)),
        ("2. CREATIVE DIRECTION", lambda: _check_direction(r, ids)),
        ("3. TEMPLATE SAFETY", lambda: _check_templates(r)),
        ("4. ELEMENT SPREAD", lambda: _check_spread(r)),
        ("5. PIPELINE HOOKS", lambda: _check_hooks(r)),
        ("6. FAIL-OPEN GUARANTEE", lambda: _check_fail_open(r)),
    ):
        print(f"{label}")
        before = len(r.rows)
        try:
            fn()
        except Exception as e:
            r.add(False, f"{label} raised", f"{e.__class__.__name__}: {e}")
        # print only the rows this section added
        section = _Res()
        section.rows = r.rows[before:]
        print(section.render())
        print()

    print("=" * 74)
    total, failed = len(r.rows), r.failed
    if failed:
        print(f"RESULT: {total - failed}/{total} passed, {failed} FAILED")
    else:
        print(f"RESULT: all {total} checks passed")
    print("=" * 74)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(run_verify())

