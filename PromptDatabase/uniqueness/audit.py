"""
Uniqueness Engine — Audit Reporter (read-only)
==============================================
One command that shows every measured cause of "all my videos look the same".
Writes nothing, ever — safe to run at any time.

Checks:
  1. DUPLICATE VIDEOS   — byte-identical packaged mp4s (linkage bug in 1Video10Sec).
  2. SUBJECT DRIFT      — Level-10 prompts that don't mention their own subject.
  3. TEMPLATE UNIFORMITY— shared opening/closing sentences across prompts.
  4. ELEMENT SKEW       — content concentrated in a few elements/groups.
  5. PROMPT DUPLICATION — byte-identical prompt text shared between ideas.
  6. VARIATION COVERAGE — what the archetype layer would give these ideas.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PACKAGED_DIR = BASE_DIR / "output_packaged"

# The exact ending mandated by the v1 template / hardcoded at
# prompt_chain_engine.py:591 — the "same last two seconds" the user reported.
BANNED_ENDING_MARKERS = (
    "impossible-scale descent",
    "maximum close-up of a single",
)


def _conn():
    import sqlite3
    p = BASE_DIR / "database" / "youtube_pipeline.db"
    c = sqlite3.connect(str(p))
    c.row_factory = sqlite3.Row
    return c


# ---------------------------------------------------------------------------
# 1. Duplicate packaged videos
# ---------------------------------------------------------------------------
def duplicate_videos() -> dict:
    groups: dict[str, list[str]] = defaultdict(list)
    if PACKAGED_DIR.exists():
        for mp4 in PACKAGED_DIR.glob("*/*.mp4"):
            try:
                digest = hashlib.md5(mp4.read_bytes()).hexdigest()
            except Exception:
                continue
            groups[digest].append(mp4.parent.name)
    dupes = {k: sorted(v) for k, v in groups.items() if len(v) > 1}
    total = sum(len(v) for v in groups.values())
    affected = sum(len(v) for v in dupes.values())
    return {
        "total_packaged_videos": total,
        "unique_videos": len(groups),
        "duplicate_groups": len(dupes),
        "videos_affected": affected,
        "wasted_slots": affected - len(dupes),
        "groups": list(dupes.values()),
    }


# ---------------------------------------------------------------------------
# 2. Subject drift
# ---------------------------------------------------------------------------
_GENERIC = {"titan", "giant", "machine", "level", "megastructure", "impossible",
            "the", "of", "and", "colossus", "ultimate", "alien"}


def subject_drift() -> dict:
    out = []
    with _conn() as c:
        rows = c.execute("""
            SELECT p.idea_id, i.title, p.generation_type, p.prompt_text
            FROM prompts p JOIN ideas i ON i.id = p.idea_id
            WHERE p.level = 10 ORDER BY p.idea_id
        """).fetchall()
    for r in rows:
        words = [w for w in re.findall(r"[A-Za-z]{4,}", r["title"] or "")
                 if w.lower() not in _GENERIC]
        if not words:
            continue
        body = (r["prompt_text"] or "").lower()
        missing = [w for w in words if w.lower() not in body]
        if len(missing) == len(words):          # none of its own words appear
            out.append({
                "idea_id": r["idea_id"], "title": r["title"],
                "type": r["generation_type"], "missing": missing,
            })
    return {"drifted": out, "count": len(out), "checked": len(rows)}


# ---------------------------------------------------------------------------
# 3. Template uniformity
# ---------------------------------------------------------------------------
def template_uniformity() -> dict:
    with _conn() as c:
        vids = [r["prompt_text"] for r in c.execute(
            "SELECT prompt_text FROM prompts WHERE level=10 AND generation_type='video'")]
        imgs = [r["prompt_text"] for r in c.execute(
            "SELECT prompt_text FROM prompts WHERE level=10 AND generation_type='image'")]

    def _shared_open(texts, n=110):
        ctr = Counter((t or "")[:n] for t in texts)
        top, cnt = ctr.most_common(1)[0] if ctr else ("", 0)
        return {"count": cnt, "total": len(texts), "text": top[:90]}

    banned = sum(1 for t in vids if any(m in (t or "").lower() for m in BANNED_ENDING_MARKERS))
    return {
        "video_shared_opening": _shared_open(vids),
        "image_shared_opening": _shared_open(imgs),
        "video_with_banned_ending": banned,
        "video_total": len(vids),
    }


# ---------------------------------------------------------------------------
# 4. Element skew
# ---------------------------------------------------------------------------
def element_skew() -> dict:
    from .spread import coverage_report
    return coverage_report()


# ---------------------------------------------------------------------------
# 5. Prompt text shared between different ideas
# ---------------------------------------------------------------------------
def duplicate_prompts() -> dict:
    with _conn() as c:
        rows = c.execute("""
            SELECT idea_id, level, generation_type, prompt_text
            FROM prompts WHERE prompt_text IS NOT NULL AND LENGTH(prompt_text) > 50
        """).fetchall()
    by_hash: dict[str, list[str]] = defaultdict(list)
    for r in rows:
        h = hashlib.md5(r["prompt_text"].encode("utf-8")).hexdigest()
        by_hash[h].append(f"idea{r['idea_id']}/L{r['level']}/{r['generation_type']}")
    shared = []
    for h, refs in by_hash.items():
        ideas = {x.split("/")[0] for x in refs}
        if len(ideas) > 1:          # same text across DIFFERENT ideas
            shared.append(sorted(refs))
    return {"shared_groups": len(shared), "examples": shared[:12], "total_prompts": len(rows)}


# ---------------------------------------------------------------------------
# 6. Variation coverage
# ---------------------------------------------------------------------------
def variation_coverage() -> dict:
    from .variation import collision_report, get_variation
    with _conn() as c:
        ids = [r[0] for r in c.execute("SELECT DISTINCT idea_id FROM prompts ORDER BY idea_id")]
    rep = collision_report(ids)
    rep["sample"] = [f"idea#{i}: {get_variation(i).signature()}" for i in ids[:8]]
    return rep


# ---------------------------------------------------------------------------
# Full report
# ---------------------------------------------------------------------------
def run_audit(as_json: bool = False) -> dict:
    report = {
        "duplicate_videos": duplicate_videos(),
        "subject_drift": subject_drift(),
        "template_uniformity": template_uniformity(),
        "element_skew": element_skew(),
        "duplicate_prompts": duplicate_prompts(),
        "variation_coverage": variation_coverage(),
    }
    if as_json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return report

    W = 74
    def hdr(t): print("\n" + "=" * W + f"\n{t}\n" + "=" * W)

    hdr("1. DUPLICATE PACKAGED VIDEOS  (same file reused for different ideas)")
    d = report["duplicate_videos"]
    print(f"  packaged mp4s: {d['total_packaged_videos']}   truly unique: {d['unique_videos']}")
    print(f"  duplicate groups: {d['duplicate_groups']}   videos affected: {d['videos_affected']}")
    for g in d["groups"]:
        print(f"    [{len(g)} copies] {', '.join(x[:34] for x in g)}")
    if d["duplicate_groups"]:
        print(f"  => you are watching {d['unique_videos']} distinct videos, not {d['total_packaged_videos']}.")
        print("  => root cause: 1Video10Sec picked 'newest mp4 in Downloads' per idea.")

    hdr("2. SUBJECT DRIFT  (Level-10 prompt never names its own subject)")
    s = report["subject_drift"]
    print(f"  drifted: {s['count']} of {s['checked']} level-10 prompts")
    for x in s["drifted"][:10]:
        print(f"    idea#{x['idea_id']:>3} [{x['type']:5}] '{x['title'][:38]}' missing {x['missing']}")

    hdr("3. TEMPLATE UNIFORMITY  (shared skeleton across prompts)")
    t = report["template_uniformity"]
    vo, io = t["video_shared_opening"], t["image_shared_opening"]
    print(f"  video prompts sharing one opening: {vo['count']}/{vo['total']}")
    print(f"      \"{vo['text']}...\"")
    print(f"  image prompts sharing one opening: {io['count']}/{io['total']}")
    print(f"  video prompts using the BANNED fixed ending: {t['video_with_banned_ending']}/{t['video_total']}")
    print("      (the 'descent into a single grain' close = your 'same last 2 seconds')")

    hdr("4. ELEMENT SKEW  (why every subject is a tree)")
    e = report["element_skew"]
    print(f"  elements: {e['total_elements']}   with ideas: {e['elements_with_ideas']}   "
          f"never used: {e['elements_never_used']}")
    print(f"  elements that produced video: {e['elements_producing_video']}   "
          f"top-3 share: {e['top3_element_share_pct']}%")
    for x in e["producing_elements"]:
        print(f"    {x}")
    print(f"  groups never used: {', '.join(e['unused_groups'])}")

    hdr("5. IDENTICAL PROMPT TEXT SHARED BETWEEN IDEAS")
    p = report["duplicate_prompts"]
    print(f"  shared-text groups: {p['shared_groups']} (of {p['total_prompts']} prompts)")
    for ex in p["examples"][:8]:
        print(f"    {', '.join(ex)}")

    hdr("6. VARIATION LAYER COVERAGE  (what the fix provides)")
    v = report["variation_coverage"]
    print(f"  ideas: {v['ideas']}   distinct fingerprints: {v['distinct_signatures']}   "
          f"collisions: {v['colliding_signatures']}")
    print(f"  archetype combination space: {v['combination_space']:,}")
    for x in v["sample"]:
        print(f"    {x}")

    print("\n" + "=" * W)
    print("Fix order (highest impact first):")
    print("  1. run_uniqueness.bat --install-templates-v2 --apply   (kills fixed ending/drift)")
    print("  2. use the balanced element queue (--spread) so new ideas leave the tree cluster")
    print("  3. re-render the duplicate videos listed in section 1 (your decision)")
    print("=" * W)
    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Uniqueness and Pipeline Audit")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()
    run_audit(as_json=args.json)

