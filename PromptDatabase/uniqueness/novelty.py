"""
Uniqueness Engine — Idea Novelty / Near-Duplicate Scanner
=========================================================
Catches "the ideas themselves were almost the same" BEFORE anything is rendered.

Reuses the deterministic token-overlap scorer already written for the SEO engine
(`seo_engine.scoring._tokens` / `_jaccard`) rather than introducing a second, slightly
different similarity metric — one definition of "similar" across the project.

Two comparison modes:
  * title/description similarity — catches "Rice Titan Harvester" vs "Rice Moon Harvester"
  * prompt-text similarity       — catches ideas whose generated prompts collapsed together
                                   (e.g. ideas 35 & 36 share byte-identical L2-5 video prompts)

Writes are optional and gated: with --apply it records results into the existing (empty)
`duplicate_checks` and `idea_features` tables rather than inventing new ones.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from seo_engine.scoring import _tokens, _jaccard   # single shared similarity definition


@dataclass
class SimilarPair:
    idea_a: int
    title_a: str
    idea_b: int
    title_b: str
    title_score: float
    text_score: float
    prompt_identical_levels: list[int]

    @property
    def worst(self) -> float:
        return max(self.title_score, self.text_score)

    def verdict(self) -> str:
        if self.prompt_identical_levels:
            return "IDENTICAL_PROMPTS"
        if self.worst >= 0.60:
            return "NEAR_DUPLICATE"
        if self.worst >= 0.40:
            return "SIMILAR"
        return "OK"


def _load_ideas() -> list[dict]:
    import sqlite3
    p = BASE_DIR / "database" / "youtube_pipeline.db"
    c = sqlite3.connect(str(p))
    c.row_factory = sqlite3.Row
    rows = c.execute("""
        SELECT i.id, i.title, COALESCE(i.description, i.raw_idea, '') AS body,
               COALESCE(e.name,'') AS element, COALESCE(e.group_type,'') AS grp
        FROM ideas i
        LEFT JOIN idea_elements ie ON ie.idea_id = i.id
        LEFT JOIN elements e ON e.id = ie.element_id
        ORDER BY i.id
    """).fetchall()
    out = [dict(r) for r in rows]
    for o in out:
        o["prompts"] = {}
    for r in c.execute("""SELECT idea_id, level, generation_type, prompt_text
                          FROM prompts WHERE prompt_text IS NOT NULL"""):
        for o in out:
            if o["id"] == r["idea_id"]:
                o["prompts"][(r["level"], r["generation_type"])] = r["prompt_text"]
                break
    c.close()
    return out


def scan(threshold: float = 0.40, only_with_prompts: bool = False) -> list[SimilarPair]:
    """Pairwise scan. Returns pairs at or above `threshold`, worst first."""
    ideas = _load_ideas()
    if only_with_prompts:
        ideas = [i for i in ideas if i["prompts"]]

    prepared = []
    for i in ideas:
        prepared.append({
            **i,
            "_title_tok": _tokens(i["title"]),
            "_body_tok": _tokens(i["title"] + " " + i["body"]),
        })

    pairs: list[SimilarPair] = []
    for a_i in range(len(prepared)):
        a = prepared[a_i]
        for b_i in range(a_i + 1, len(prepared)):
            b = prepared[b_i]
            ts = _jaccard(a["_title_tok"], b["_title_tok"])
            bs = _jaccard(a["_body_tok"], b["_body_tok"])

            identical: list[int] = []
            for key, text in a["prompts"].items():
                if b["prompts"].get(key) == text:
                    identical.append(key[0])

            if max(ts, bs) >= threshold or identical:
                pairs.append(SimilarPair(
                    idea_a=a["id"], title_a=a["title"],
                    idea_b=b["id"], title_b=b["title"],
                    title_score=round(ts, 3), text_score=round(bs, 3),
                    prompt_identical_levels=sorted(set(identical)),
                ))
    pairs.sort(key=lambda p: (bool(p.prompt_identical_levels), p.worst), reverse=True)
    return pairs


def persist(pairs: list[SimilarPair], apply: bool = False) -> dict:
    """Record findings into the existing `duplicate_checks` table (opt-in)."""
    if not apply:
        return {"applied": False, "would_write": len(pairs)}

    from sqlalchemy import text
    from database.session import engine
    from datetime import datetime, timezone

    written = 0
    with engine.begin() as conn:
        for p in pairs:
            conn.execute(text("""
                INSERT INTO duplicate_checks
                    (new_idea_id, compared_idea_id, exact_match, hash_match,
                     semantic_score, topic_score, concept_score, final_score,
                     decision, checked_by, model_name, created_at)
                VALUES (:a,:b,:exact,0,:sem,:topic,:concept,:final,:dec,'uniqueness.novelty','deterministic_jaccard',:ts)
            """), {
                "a": p.idea_a, "b": p.idea_b,
                "exact": 1 if p.prompt_identical_levels else 0,
                "sem": p.text_score, "topic": p.title_score,
                "concept": p.worst, "final": p.worst,
                "dec": p.verdict(),
                "ts": datetime.now(timezone.utc).isoformat(),
            })
            written += 1
    return {"applied": True, "written": written}


def format_report(pairs: list[SimilarPair], limit: int = 25) -> str:
    if not pairs:
        return "  No similar idea pairs above threshold — idea set looks diverse."
    lines = [f"  {'verdict':18} {'score':>6}  ideas",
             f"  {'-'*18} {'-'*6}  {'-'*44}"]
    for p in pairs[:limit]:
        extra = f"  [identical prompts @ levels {p.prompt_identical_levels}]" if p.prompt_identical_levels else ""
        lines.append(f"  {p.verdict():18} {p.worst:6.2f}  #{p.idea_a} {p.title_a[:24]} "
                     f"<-> #{p.idea_b} {p.title_b[:24]}{extra}")
    if len(pairs) > limit:
        lines.append(f"  ... and {len(pairs)-limit} more")
    return "\n".join(lines)
