"""Deep-dive: for every mismatch, identify WHICH idea the on-disk text actually belongs to."""
import json, re, sqlite3, difflib
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent
con = sqlite3.connect(f"file:{BASE/'database'/'youtube_pipeline.db'}?mode=ro", uri=True)
con.row_factory = sqlite3.Row
norm = lambda s: re.sub(r'\s+', ' ', str(s or '')).strip()

ideas = {r["id"]: dict(r) for r in con.execute("SELECT id,title,topic,status FROM ideas")}
allp = [dict(r) for r in con.execute(
    "SELECT id,idea_id,generation_type,level,level_name,title,prompt_text,status,created_at FROM prompts")]

def best_owner(text, gt=None):
    """Which prompt row in the whole DB is closest to this text?"""
    t = norm(text)
    if not t:
        return None
    exact = [p for p in allp if norm(p["prompt_text"]) == t]
    if exact:
        return ("EXACT", exact)
    pool = [p for p in allp if not gt or (p["generation_type"] or "").lower() == gt]
    scored = sorted(pool, key=lambda p: difflib.SequenceMatcher(
        None, t[:1500], norm(p["prompt_text"])[:1500]).ratio(), reverse=True)[:3]
    return ("FUZZY", [(p, round(difflib.SequenceMatcher(
        None, t[:1500], norm(p["prompt_text"])[:1500]).ratio(), 3)) for p in scored])

print("#" * 100)
print("PART 1 — Ideas 1,2,3: does prompt_info.json hold ANOTHER idea's prompt, or an older version of its own?")
print("#" * 100)
for folder, iid in [("1.1.Level_10_Rice_Titan_Harvester", 1),
                    ("1.2.Level_10_The_Paddy_Ocean_Vacuum", 2),
                    ("1.3.Level_10_Rice-Field_Spider_Colossus", 3)]:
    pi = json.loads((BASE / "output_packaged" / folder / "prompt_info.json").read_text(encoding="utf-8"))
    print(f"\n=== {folder}  (idea #{iid} '{ideas[iid]['title']}')")
    for key, gt in (("primary_video_prompt_used", "video"), ("reference_image_prompt", "image")):
        kind, res = best_owner(pi.get(key), gt)
        print(f"  [{key}] -> {kind}")
        if kind == "EXACT":
            for p in res:
                print(f"      DB prompt id={p['id']} idea_id={p['idea_id']} "
                      f"('{ideas.get(p['idea_id'],{}).get('title')}') level={p['level']} type={p['generation_type']}")
        else:
            for p, sc in res:
                print(f"      {sc:.3f} similar -> id={p['id']} idea_id={p['idea_id']} "
                      f"('{ideas.get(p['idea_id'],{}).get('title')}') level={p['level']} type={p['generation_type']}")
        # show DB's own level-10 prompt for this idea
        own = [p for p in allp if p["idea_id"] == iid and p["level"] == 10
               and (p["generation_type"] or "").lower() == gt]
        for p in own:
            r = difflib.SequenceMatcher(None, norm(pi.get(key))[:1500], norm(p["prompt_text"])[:1500]).ratio()
            print(f"      own DB level10 {gt}: id={p['id']} similarity={r:.3f} created={p['created_at']}")

print("\n" + "#" * 100)
print("PART 2 — Ideas 35 & 36: identical prompt text (real cross-contamination?)")
print("#" * 100)
for iid in (35, 36):
    print(f"\nidea #{iid} '{ideas[iid]['title']}' topic='{ideas[iid]['topic']}' status={ideas[iid]['status']}")
    for p in [x for x in allp if x["idea_id"] == iid]:
        print(f"   prompt id={p['id']} L{p['level']} {p['generation_type']:6} "
              f"hash={hash(norm(p['prompt_text'])) & 0xffffff:06x} len={len(p['prompt_text'] or '')} "
              f"title='{str(p['title'])[:55]}'")
dup = defaultdict(list)
for p in allp:
    if p["prompt_text"] and len(p["prompt_text"]) > 120:
        dup[norm(p["prompt_text"])].append(p)
print("\n  shared-text groups:")
for t, ps in dup.items():
    owners = {p["idea_id"] for p in ps}
    if len(owners) > 1:
        print(f"   ideas {sorted(owners)} | prompt ids {[p['id'] for p in ps]} | "
              f"types {[p['generation_type'] for p in ps]} | levels {[p['level'] for p in ps]}")
        print(f"      \"{t[:150]}...\"")

print("\n" + "#" * 100)
print("PART 3 — 11.10.Solar_Bloom_Clock (idea #112): folder exists but DB has no level-10 prompt")
print("#" * 100)
f = BASE / "output_packaged" / "11.10.Level_10_Solar_Bloom_Clock"
pi = json.loads((f / "prompt_info.json").read_text(encoding="utf-8"))
print(f"json idea_id={pi.get('idea_id')} idea_title='{pi.get('idea_title')}' "
      f"element_id={pi.get('element_id')} idx={pi.get('idea_index_in_element')}")
print(f"DB idea #{pi.get('idea_id')} = '{ideas.get(pi.get('idea_id'),{}).get('title')}'")
print("DB prompts for that idea:")
for p in [x for x in allp if x["idea_id"] == pi.get("idea_id")]:
    print(f"   id={p['id']} L{p['level']} {p['generation_type']} '{str(p['title'])[:60]}'")
for key, gt in (("primary_video_prompt_used", "video"), ("reference_image_prompt", "image")):
    kind, res = best_owner(pi.get(key), gt)
    print(f"  [{key}] {kind}:")
    items = res if kind == "EXACT" else [p for p, _ in res]
    scores = [None] * len(items) if kind == "EXACT" else [s for _, s in res]
    for p, sc in zip(items, scores):
        print(f"      {'exact' if sc is None else f'{sc:.3f}'} -> id={p['id']} idea_id={p['idea_id']} "
              f"('{ideas.get(p['idea_id'],{}).get('title')}') L{p['level']} {p['generation_type']}")
print("element 11 ideas:")
for r in con.execute("SELECT i.id,i.title FROM ideas i JOIN idea_elements ie ON ie.idea_id=i.id "
                     "WHERE ie.element_id=11 ORDER BY i.id"):
    print(f"   #{r['id']} {r['title']}")
print("elements 11 / and which element idea 112 links to:")
for r in con.execute("SELECT element_id FROM idea_elements WHERE idea_id=112"):
    print("   idea 112 -> element", r["element_id"])
print("   element rows:", [(r["id"], r["name"]) for r in con.execute("SELECT id,name FROM elements WHERE id IN (11,12)")])

print("\n" + "#" * 100)
print("PART 4 — subject drift group 2.x: whose prompt is in there?")
print("#" * 100)
for folder in ["2.1.Level_10_The_Whispering_Canopy_Harvester", "2.2.Level_10_The_Timberland_Root_Walker",
               "2.5.Level_10_The_Ancient_Grove_Siphon", "2.6.Level_10_Ironwood_Deep-Root_Excavator",
               "2.8.Level_10_The_Evergreen_Core_Furnace", "2.9.Level_10_Chrono-Bark_Synthesizer"]:
    pi = json.loads((BASE / "output_packaged" / folder / "prompt_info.json").read_text(encoding="utf-8"))
    iid = pi.get("idea_id")
    print(f"\n=== {folder} (json idea_id={iid} '{ideas.get(iid,{}).get('title')}')")
    vt = norm(pi.get("primary_video_prompt_used"))
    kind, res = best_owner(vt, "video")
    if kind == "EXACT":
        for p in res:
            print(f"   video prompt EXACT match -> DB id={p['id']} idea_id={p['idea_id']} "
                  f"('{ideas.get(p['idea_id'],{}).get('title')}')")
    print(f"   video text opens: \"{vt[:220]}\"")
    it = norm(pi.get("reference_image_prompt"))
    print(f"   image text Layer1: \"{it[:260]}\"")

print("\n" + "#" * 100)
print("PART 5 — youtube_metadata rows vs idea titles (which side is stale?)")
print("#" * 100)
for r in con.execute("SELECT id,idea_id,title,created_at,updated_at,status FROM youtube_metadata ORDER BY idea_id"):
    it = ideas.get(r["idea_id"], {}).get("title", "?")
    m = re.match(r'^🚨 INSANE: (.+?) - Level 10', r["title"] or "")
    embedded = m.group(1) if m else r["title"]
    flag = "  <== MISMATCH" if norm(embedded) != norm(it) else ""
    print(f"  ytm#{r['id']:3} idea#{r['idea_id']:3} db_title_subject='{embedded[:45]}' "
          f"idea.title='{it[:45]}'{flag}")
dupes = [r for r in con.execute(
    "SELECT idea_id, COUNT(*) c FROM youtube_metadata GROUP BY idea_id HAVING c>1")]
print("  duplicate ytm rows per idea:", [(r["idea_id"], r["c"]) for r in dupes])
print("  ytm rows with NO package folder on disk:")
pkgs = {p.name for p in (BASE / 'output_packaged').iterdir() if p.is_dir()}
import re as _re
for r in con.execute("SELECT id,idea_id FROM youtube_metadata"):
    t = ideas.get(r["idea_id"], {}).get("title", "")
    safe = _re.sub(r'_+', '_', _re.sub(r'[^a-zA-Z0-9_\-]', '_', t)).strip('_')
    if not any(p.endswith(f"Level_10_{safe}") for p in pkgs):
        print(f"     ytm#{r['id']} idea#{r['idea_id']} '{t}' -> no folder")
con.close()
