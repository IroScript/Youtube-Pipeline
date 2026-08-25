"""
Uniqueness Engine — Element Spread Selector
===========================================
Root cause A: every packaged video looks like a tree because every packaged IDEA came
from a tree/field element.

Why that happened (audited in prompt_chain_engine.get_or_create_next_production_ready_prompt,
~line 854): the walker is a strictly ascending `ORDER BY Element.id ASC` loop that
`return`s after ONE unit of work, and every call restarts from element #1. Elements 1-13
were pre-seeded with ideas but most lacked prompts, so each cycle was consumed filling
low-id elements. Result:

    element  1 Paddy / Rice Field  -> 10 ideas with prompts
    element  2 Forest              -> 10
    element  3 Giant Tree          -> 10
    element  4 Palm Tree           ->  4
    element  6 Corn Field          ->  1
    elements 14-100 (Volcano, Ocean, Glacier, Space, DNA, AI, ...) -> ZERO ideas

So 95 diverse elements were never reached. This module provides a group-balanced
selector that round-robins across `elements.group_type` instead of draining element #1.

SAFETY: this does NOT patch or replace the existing walker. It is an additive helper —
`next_element_balanced()` is something a caller can choose to use. Existing behaviour is
untouched unless explicitly invoked, per the project's code-preservation rules.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass


@dataclass
class ElementCoverage:
    element_id: int
    name: str
    group_type: str
    idea_count: int
    ideas_with_prompts: int
    packaged_count: int

    @property
    def is_untouched(self) -> bool:
        return self.idea_count == 0

    @property
    def is_exhausted(self) -> bool:
        """10 ideas, all of which have their full 20-prompt escalation."""
        return self.idea_count >= 10 and self.ideas_with_prompts >= 10


def load_coverage() -> list[ElementCoverage]:
    """Read per-element coverage straight from SQLite (read-only)."""
    from sqlalchemy import text
    from database.session import engine

    sql = text("""
        SELECT e.id, e.name, COALESCE(e.group_type,'Unknown') AS group_type,
               COUNT(DISTINCT ie.idea_id) AS idea_count,
               COUNT(DISTINCT CASE WHEN pc.n >= 20 THEN ie.idea_id END) AS ideas_with_prompts,
               COUNT(DISTINCT gv.idea_id) AS packaged_count
        FROM elements e
        LEFT JOIN idea_elements ie ON ie.element_id = e.id
        LEFT JOIN (SELECT idea_id, COUNT(*) n FROM prompts GROUP BY idea_id) pc
               ON pc.idea_id = ie.idea_id
        LEFT JOIN generated_videos gv ON gv.idea_id = ie.idea_id
        GROUP BY e.id, e.name, e.group_type
        ORDER BY e.id
    """)
    with engine.connect() as conn:
        return [
            ElementCoverage(
                element_id=r[0], name=r[1], group_type=r[2],
                idea_count=r[3] or 0, ideas_with_prompts=r[4] or 0,
                packaged_count=r[5] or 0,
            )
            for r in conn.execute(sql)
        ]


def coverage_report() -> dict:
    """Summarise how badly content is concentrated in a few elements/groups."""
    cov = load_coverage()
    by_group: dict[str, dict] = defaultdict(lambda: {"elements": 0, "ideas": 0, "packaged": 0})
    for c in cov:
        g = by_group[c.group_type]
        g["elements"] += 1
        g["ideas"] += c.idea_count
        g["packaged"] += c.packaged_count

    touched = [c for c in cov if not c.is_untouched]
    producing = [c for c in cov if c.packaged_count > 0]
    total_packaged = sum(c.packaged_count for c in cov)

    concentration = 0.0
    if total_packaged:
        top = sorted(cov, key=lambda c: -c.packaged_count)[:3]
        concentration = sum(c.packaged_count for c in top) / total_packaged * 100

    return {
        "total_elements": len(cov),
        "elements_with_ideas": len(touched),
        "elements_never_used": len(cov) - len(touched),
        "elements_producing_video": len(producing),
        "total_packaged_videos": total_packaged,
        "top3_element_share_pct": round(concentration, 1),
        "groups": dict(sorted(by_group.items(), key=lambda kv: -kv[1]["packaged"])),
        "producing_elements": [
            f"#{c.element_id} {c.name} [{c.group_type}] -> {c.packaged_count}" for c in
            sorted(producing, key=lambda c: -c.packaged_count)
        ],
        "unused_groups": sorted(
            {c.group_type for c in cov if all(
                x.packaged_count == 0 for x in cov if x.group_type == c.group_type)}
        ),
    }


def next_element_balanced(limit: int = 10) -> list[ElementCoverage]:
    """
    Suggest the next elements to work on, balanced across groups.

    Ordering strategy — the inverse of the current ascending-id drain:
      1. Prefer groups that have produced the FEWEST videos so far (diversity first).
      2. Inside a group, prefer elements with no ideas yet (untouched).
      3. Skip exhausted elements entirely.
      4. Round-robin one element per group before taking a second from any group,
         so a single group can never monopolise the queue again.
    """
    cov = [c for c in load_coverage() if not c.is_exhausted]

    produced_by_group: dict[str, int] = defaultdict(int)
    for c in load_coverage():
        produced_by_group[c.group_type] += c.packaged_count

    per_group: dict[str, list[ElementCoverage]] = defaultdict(list)
    for c in cov:
        per_group[c.group_type].append(c)
    for g in per_group:
        # untouched first, then least-developed
        per_group[g].sort(key=lambda c: (c.idea_count, c.ideas_with_prompts, c.element_id))

    group_order = sorted(per_group.keys(), key=lambda g: (produced_by_group[g], g))

    out: list[ElementCoverage] = []
    round_idx = 0
    while len(out) < limit:
        added_this_round = False
        for g in group_order:
            if round_idx < len(per_group[g]):
                out.append(per_group[g][round_idx])
                added_this_round = True
                if len(out) >= limit:
                    break
        if not added_this_round:
            break
        round_idx += 1
    return out


def format_suggestions(limit: int = 10) -> str:
    rows = next_element_balanced(limit)
    if not rows:
        return "  (no eligible elements — all exhausted)"
    lines = []
    for i, c in enumerate(rows, 1):
        state = "untouched" if c.is_untouched else f"{c.idea_count} ideas/{c.ideas_with_prompts} filled"
        lines.append(f"  {i:>2}. element #{c.element_id:<3} {c.name[:26]:26} "
                     f"[{c.group_type:14}] {state}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Live-engine integration helper
# ---------------------------------------------------------------------------
def reorder_elements_balanced(elements: list) -> list:
    """
    Re-order the element list the production walker already loaded, group-balanced.

    Used by the optional `element_spread` hook in prompt_chain_engine (see
    uniqueness/integrate.py). Contract, deliberately conservative:

      * PURE RE-ORDER — every element handed in is handed back exactly once. Nothing is
        dropped, filtered or added, so the walker's coverage guarantee is unchanged; only
        the *visit order* differs. That is what stops element #1 being drained forever
        while 87 elements stay untouched.
      * FAILS OPEN — if coverage cannot be read (DB locked, schema drift, anything), the
        original list is returned untouched, so a broken uniqueness layer can never stall
        the production pipeline.
      * Accepts any objects exposing `.id` (SQLModel `Element` rows in practice), so it
        needs no import from database.models and stays trivially testable.

    Ordering = the group-balanced queue from next_element_balanced(), then every element
    that queue did not rank (exhausted ones) appended in their original ascending order.
    """
    if not elements:
        return elements

    try:
        by_id = {}
        for e in elements:
            eid = getattr(e, "id", None)
            if eid is not None:
                by_id[eid] = e
        if not by_id:
            return elements

        # Rank across the whole set so exhausted elements sink instead of blocking.
        ranked = next_element_balanced(limit=len(by_id))

        ordered = []
        taken = set()
        for cov in ranked:
            row = by_id.get(cov.element_id)
            if row is not None and cov.element_id not in taken:
                ordered.append(row)
                taken.add(cov.element_id)

        # Anything the balanced queue skipped (exhausted / unranked) keeps ascending order
        # at the tail — guarantees the output is a permutation of the input.
        for eid in sorted(by_id):
            if eid not in taken:
                ordered.append(by_id[eid])
                taken.add(eid)

        # Hard invariant: never hand back a shorter list than we were given.
        if len(ordered) != len(elements):
            return elements
        return ordered
    except Exception:
        return elements
