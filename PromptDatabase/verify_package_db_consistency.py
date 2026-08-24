"""
Read-only consistency auditor: output_packaged/ folders  <->  youtube_pipeline.db

Checks (nothing is written or modified anywhere):
  A. Folder naming     : folder == <elem_id>.<idea_idx>.Level_10_<sanitized(idea.title)>
  B. File completeness : mp4 + prompt_info.json + youtube_metadata.json + both hierarchical copies
  C. Prompt fidelity   : prompt_info.json.primary_video_prompt_used == prompts(level10,video).prompt_text
                         prompt_info.json.reference_image_prompt    == prompts(level10,image).prompt_text
  D. Metadata fidelity : youtube_metadata.json == youtube_metadata table row for that idea
  E. Cross-contamination: is idea X's prompt text actually another idea's prompt? (both on disk and in DB)
  F. Video linkage     : generated_videos.file_path / youtube_metadata.video_file_path resolve to the real mp4
  G. Ambiguity         : >1 level-10 video/image prompt per idea (packager uses .first() -> nondeterministic)
  H. Subject drift     : does the prompt / metadata text actually mention the idea's own title keywords?
"""

import json
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent
DB = BASE / "database" / "youtube_pipeline.db"
PKG = BASE / "output_packaged"

problems = []   # (severity, folder/scope, check, detail)


def add(sev, scope, check, detail):
    problems.append((sev, scope, check, detail))


def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[^a-zA-Z0-9_\-]', '_', name)
    return re.sub(r'_+', '_', clean).strip('_')


def norm(s):
    """Whitespace-insensitive comparison key."""
    if s is None:
        return ""
    return re.sub(r'\s+', ' ', str(s)).strip()


con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
con.row_factory = sqlite3.Row

# ---------------------------------------------------------------- load DB side
ideas = {r["id"]: dict(r) for r in con.execute("SELECT * FROM ideas")}
elems_of_idea = defaultdict(list)
for r in con.execute("SELECT idea_id, element_id FROM idea_elements"):
    elems_of_idea[r["idea_id"]].append(r["element_id"])

# replicate packager's idea_idx: ideas joined to element, ordered by idea.id
ideas_in_elem = defaultdict(list)
for r in con.execute(
    "SELECT ie.element_id AS eid, i.id AS iid FROM ideas i "
    "JOIN idea_elements ie ON ie.idea_id = i.id ORDER BY i.id"
):
    ideas_in_elem[r["eid"]].append(r["iid"])

l10 = defaultdict(lambda: {"video": [], "image": []})
for r in con.execute(
    "SELECT id, idea_id, generation_type, prompt_text, title, level, level_name, status "
    "FROM prompts WHERE level = 10 ORDER BY id"
):
    gt = (r["generation_type"] or "").lower()
    if gt in ("video", "image"):
        l10[r["idea_id"]][gt].append(dict(r))

ytm = {}
for r in con.execute("SELECT * FROM youtube_metadata"):
    ytm.setdefault(r["idea_id"], []).append(dict(r))

gvids = defaultdict(list)
for r in con.execute("SELECT * FROM generated_videos"):
    gvids[r["idea_id"]].append(dict(r))

tasks = defaultdict(list)
for r in con.execute("SELECT * FROM tasks"):
    tasks[r["idea_id"]].append(dict(r))

# ------------------------------------------- E/G: DB-internal contamination map
# same prompt_text used by >1 idea == a prompt was copied into the wrong idea
text_owners = defaultdict(set)
for r in con.execute("SELECT idea_id, prompt_text, generation_type, level FROM prompts"):
    if r["prompt_text"] and len(r["prompt_text"]) > 120:
        text_owners[norm(r["prompt_text"])].add(r["idea_id"])

shared_text = {t: o for t, o in text_owners.items() if len(o) > 1}

# ------------------------------------------------------------- expected folders
expected_folder = {}
for iid, idea in ideas.items():
    eids = elems_of_idea.get(iid) or [1]
    eid = eids[0]
    lst = ideas_in_elem.get(eid, [])
    idx = lst.index(iid) + 1 if iid in lst else 1
    expected_folder[iid] = (f"{eid}.{idx}.Level_10_{sanitize_filename(idea['title'])}", eid, idx)

folder_to_idea = {}
for iid, (fn, _e, _x) in expected_folder.items():
    folder_to_idea.setdefault(fn, []).append(iid)

# --------------------------------------------------------------- walk the disk
disk_folders = sorted([p for p in PKG.iterdir() if p.is_dir()]) if PKG.exists() else []
print(f"Packages on disk: {len(disk_folders)}   Ideas in DB: {len(ideas)}   "
      f"level10 video prompts: {sum(1 for k in l10 if l10[k]['video'])}   "
      f"youtube_metadata rows: {sum(len(v) for v in ytm.values())}   "
      f"generated_videos: {sum(len(v) for v in gvids.values())}")
print("=" * 100)

matched_ideas = set()
disk_prompt_text = {}   # folder -> video prompt text on disk

for folder in disk_folders:
    name = folder.name
    scope = name

    # ---- A. resolve folder back to an idea
    iid_candidates = folder_to_idea.get(name, [])
    m = re.match(r'^(\d+)\.(\d+)\.Level_10_(.+)$', name)
    prefix = f"{m.group(1)}.{m.group(2)}" if m else None

    pinfo_p = folder / "prompt_info.json"
    ymeta_p = folder / "youtube_metadata.json"
    pinfo = ymeta = None
    if pinfo_p.exists():
        try:
            pinfo = json.loads(pinfo_p.read_text(encoding="utf-8"))
        except Exception as e:
            add("ERROR", scope, "prompt_info.json unreadable", str(e))
    else:
        add("ERROR", scope, "missing file", "prompt_info.json absent")
    if ymeta_p.exists():
        try:
            ymeta = json.loads(ymeta_p.read_text(encoding="utf-8"))
        except Exception as e:
            add("ERROR", scope, "youtube_metadata.json unreadable", str(e))
    else:
        add("ERROR", scope, "missing file", "youtube_metadata.json absent")

    json_iid = pinfo.get("idea_id") if pinfo else None

    if iid_candidates:
        iid = iid_candidates[0]
        if len(iid_candidates) > 1:
            add("ERROR", scope, "folder name collision",
                f"DB derives this same folder name for ideas {iid_candidates}")
    else:
        iid = json_iid
        add("ERROR", scope, "folder not derivable from DB",
            f"no idea in DB produces folder name '{name}'; "
            f"falling back to prompt_info.idea_id={json_iid} "
            f"(DB says idea {json_iid} -> '{expected_folder.get(json_iid, ('?',))[0]}')"
            if json_iid in expected_folder else f"no idea in DB produces '{name}'")

    if iid is None or iid not in ideas:
        add("ERROR", scope, "unresolvable package", "cannot map folder to any idea row")
        continue
    matched_ideas.add(iid)
    idea = ideas[iid]

    # ---- prompt_info.idea_id must agree with the folder identity
    if json_iid is not None and json_iid != iid:
        add("ERROR", scope, "idea_id mismatch",
            f"folder maps to idea #{iid} '{idea['title']}' but prompt_info.json says "
            f"idea_id={json_iid} '{ideas.get(json_iid, {}).get('title', '?')}'")

    if pinfo:
        if norm(pinfo.get("idea_title")) != norm(idea["title"]):
            add("ERROR", scope, "idea_title mismatch",
                f"json='{pinfo.get('idea_title')}' vs db='{idea['title']}'")
        if norm(pinfo.get("idea_topic")) != norm(idea.get("topic")):
            add("WARN", scope, "idea_topic mismatch",
                f"json='{pinfo.get('idea_topic')}' vs db='{idea.get('topic')}'")
        exp_e, exp_x = expected_folder[iid][1], expected_folder[iid][2]
        if pinfo.get("element_id") != exp_e:
            add("WARN", scope, "element_id mismatch",
                f"json={pinfo.get('element_id')} vs db-derived={exp_e}")
        if pinfo.get("idea_index_in_element") != exp_x:
            add("WARN", scope, "idea_index mismatch",
                f"json={pinfo.get('idea_index_in_element')} vs db-derived={exp_x}")

    # ---- B. file completeness
    mp4s = list(folder.glob("*.mp4"))
    exp_mp4 = folder / f"{name}.mp4"
    if not exp_mp4.exists():
        add("ERROR", scope, "video missing/misnamed",
            f"expected '{name}.mp4'; found {[p.name for p in mp4s]}")
    elif exp_mp4.stat().st_size <= 10240:
        add("ERROR", scope, "video too small",
            f"{exp_mp4.name} is {exp_mp4.stat().st_size} bytes (<=10KB, packager treats as fake)")
    if len(mp4s) > 1:
        add("WARN", scope, "multiple videos", f"{[p.name for p in mp4s]}")

    if prefix:
        for suffix, twin in (("Prompt.json", pinfo_p), ("YouTube_Metadata.json", ymeta_p)):
            hier = folder / f"{prefix}.Level_10_{suffix}"
            if not hier.exists():
                add("WARN", scope, "hierarchical copy missing", hier.name)
            elif twin.exists():
                try:
                    if json.loads(hier.read_text(encoding="utf-8")) != json.loads(twin.read_text(encoding="utf-8")):
                        add("ERROR", scope, "duplicate copies differ",
                            f"{hier.name} != {twin.name} (same data exported twice, contents diverge)")
                except Exception:
                    pass

    # ---- C. prompt fidelity vs DB
    vids, imgs = l10[iid]["video"], l10[iid]["image"]
    if not vids:
        add("ERROR", scope, "no level-10 video prompt in DB", f"idea #{iid} has none")
    if not imgs:
        add("ERROR", scope, "no level-10 image prompt in DB", f"idea #{iid} has none")
    if len(vids) > 1:
        add("WARN", scope, "ambiguous video prompt",
            f"idea #{iid} has {len(vids)} level-10 video prompts (ids {[v['id'] for v in vids]}); "
            f"packager .first() picks id={vids[0]['id']} nondeterministically")
    if len(imgs) > 1:
        add("WARN", scope, "ambiguous image prompt",
            f"idea #{iid} has {len(imgs)} level-10 image prompts (ids {[v['id'] for v in imgs]})")

    if pinfo:
        jv = norm(pinfo.get("primary_video_prompt_used"))
        ji = norm(pinfo.get("reference_image_prompt"))
        disk_prompt_text[name] = (iid, jv, ji)

        if vids:
            if not any(norm(v["prompt_text"]) == jv for v in vids):
                owners = shared_text.get(jv) or text_owners.get(jv)
                extra = ""
                if owners:
                    extra = f" -- that exact text belongs to idea(s) {sorted(owners)}"
                add("ERROR", scope, "video prompt mismatch",
                    f"prompt_info video text != any DB level-10 video prompt for idea #{iid}{extra}")
            if not jv:
                add("ERROR", scope, "video prompt empty", "primary_video_prompt_used is blank")
        if imgs:
            if not any(norm(v["prompt_text"]) == ji for v in imgs):
                owners = shared_text.get(ji) or text_owners.get(ji)
                extra = f" -- that exact text belongs to idea(s) {sorted(owners)}" if owners else ""
                add("ERROR", scope, "image prompt mismatch",
                    f"prompt_info reference_image_prompt != any DB level-10 image prompt for idea #{iid}{extra}")
            if not ji:
                add("ERROR", scope, "image prompt empty", "reference_image_prompt is blank")

        if vids and norm(pinfo.get("level_name")) and norm(vids[0]["level_name"]) and \
           norm(pinfo.get("level_name")) != norm(vids[0]["level_name"]):
            add("WARN", scope, "level_name mismatch",
                f"json='{pinfo.get('level_name')}' vs db='{vids[0]['level_name']}'")
        if vids and norm(pinfo.get("video_prompt_title")) != norm(vids[0]["title"]):
            add("WARN", scope, "video_prompt_title mismatch",
                f"json='{str(pinfo.get('video_prompt_title'))[:70]}' vs db='{str(vids[0]['title'])[:70]}'")

    # ---- D. metadata fidelity vs DB
    rows = ytm.get(iid, [])
    if not rows:
        add("ERROR", scope, "no youtube_metadata row", f"idea #{iid} missing from youtube_metadata table")
    elif ymeta:
        if len(rows) > 1:
            add("WARN", scope, "duplicate youtube_metadata rows",
                f"idea #{iid} has {len(rows)} rows (ids {[r['id'] for r in rows]}); export uses .first()")
        r = rows[0]
        try:
            db_tags = json.loads(r["tags"]) if r["tags"] else []
        except Exception:
            db_tags = [t.strip() for t in (r["tags"] or "").split(",") if t.strip()]
        for key, dbval, jsonval in (
            ("title", r["title"], ymeta.get("title")),
            ("seo_description", r["seo_description"], ymeta.get("seo_description")),
            ("category", r["category"], ymeta.get("category")),
            ("default_language", r["default_language"], ymeta.get("default_language")),
        ):
            if norm(dbval) != norm(jsonval):
                add("ERROR", scope, f"metadata '{key}' mismatch",
                    f"json='{str(jsonval)[:80]}' vs db='{str(dbval)[:80]}'")
        if db_tags != ymeta.get("tags"):
            add("ERROR", scope, "metadata tags mismatch",
                f"json={ymeta.get('tags')} vs db={db_tags}")

        # metadata row's cached prompt copies should match the real prompts
        if vids and r["video_prompt_used"] and norm(r["video_prompt_used"]) != norm(vids[0]["prompt_text"]):
            owners = text_owners.get(norm(r["video_prompt_used"]), set()) - {iid}
            add("ERROR", scope, "ytm.video_prompt_used stale/wrong",
                f"youtube_metadata.video_prompt_used != prompts level-10 video text"
                + (f" -- text belongs to idea(s) {sorted(owners)}" if owners else ""))
        if imgs and r["image_prompt_used"] and norm(r["image_prompt_used"]) != norm(imgs[0]["prompt_text"]):
            owners = text_owners.get(norm(r["image_prompt_used"]), set()) - {iid}
            add("ERROR", scope, "ytm.image_prompt_used stale/wrong",
                f"youtube_metadata.image_prompt_used != prompts level-10 image text"
                + (f" -- text belongs to idea(s) {sorted(owners)}" if owners else ""))

        # ---- F. path linkage
        for col in ("video_file_path", "package_folder_path"):
            v = r[col]
            if not v:
                add("WARN", scope, f"ytm.{col} empty", "packager never recorded it")
            elif Path(v).name != (f"{name}.mp4" if col == "video_file_path" else name):
                add("ERROR", scope, f"ytm.{col} points elsewhere", f"{v}")
            elif not Path(v).exists():
                add("WARN", scope, f"ytm.{col} does not exist on disk", f"{v}")

    # ---- H. subject drift: does the prompt talk about this idea's subject?
    if pinfo:
        words = [w.lower() for w in re.findall(r'[A-Za-z]{5,}', idea["title"])]
        stop = {"level", "the", "and"}
        words = [w for w in words if w not in stop]
        if words:
            body = (norm(pinfo.get("primary_video_prompt_used")) + " " +
                    norm(pinfo.get("reference_image_prompt"))).lower()
            if body and not any(w in body for w in words):
                add("WARN", scope, "subject drift (prompt)",
                    f"none of {words} appear in the prompt text for '{idea['title']}'")
        if ymeta and words:
            mbody = (norm(ymeta.get("title")) + " " + norm(ymeta.get("seo_description")) + " " +
                     " ".join(ymeta.get("tags") or [])).lower()
            if mbody and not any(w in mbody for w in words):
                add("WARN", scope, "subject drift (metadata)",
                    f"none of {words} appear in the YouTube metadata for '{idea['title']}'")

    # ---- generated_videos linkage
    gv = gvids.get(iid, [])
    if not gv:
        add("WARN", scope, "no generated_videos row", f"idea #{iid} packaged on disk but absent from generated_videos")
    else:
        ok = [g for g in gv if g["file_path"] and Path(g["file_path"]).name == f"{name}.mp4"]
        if not ok:
            add("ERROR", scope, "generated_videos.file_path wrong",
                f"rows point to {[Path(g['file_path']).name if g['file_path'] else None for g in gv]}, expected '{name}.mp4'")
        else:
            for g in ok:
                if not Path(g["file_path"]).exists():
                    add("WARN", scope, "generated_videos.file_path missing on disk", g["file_path"])
                elif g["file_size_bytes"] and abs(g["file_size_bytes"] - Path(g["file_path"]).stat().st_size) > 0:
                    add("WARN", scope, "generated_videos.file_size_bytes stale",
                        f"db={g['file_size_bytes']} disk={Path(g['file_path']).stat().st_size}")

# --------------------------------------------- cross-folder duplicate detection
by_video_text = defaultdict(list)
by_image_text = defaultdict(list)
for fname, (iid, jv, ji) in disk_prompt_text.items():
    if jv:
        by_video_text[jv].append((fname, iid))
    if ji:
        by_image_text[ji].append((fname, iid))
for label, mapping in (("video", by_video_text), ("image", by_image_text)):
    for text, lst in mapping.items():
        if len(lst) > 1:
            add("ERROR", "CROSS-PACKAGE", f"identical {label} prompt in multiple packages",
                f"{[f'{f} (idea #{i})' for f, i in lst]} share byte-identical {label} prompt text")

# ------------------------------------------------- DB-side contamination report
for text, owners in shared_text.items():
    add("ERROR", "DB-PROMPTS", "same prompt_text on multiple ideas",
        f"ideas {sorted(owners)} share identical prompt text: \"{text[:90]}...\"")

# ---------------------------------------- DB rows claiming a package that isn't there
for iid, rows in ytm.items():
    for r in rows:
        p = r["package_folder_path"]
        if p and not Path(p).exists():
            add("ERROR", "DB-ORPHAN", "youtube_metadata.package_folder_path missing on disk",
                f"idea #{iid} '{ideas.get(iid, {}).get('title')}' -> {p}")
for iid, rows in gvids.items():
    for r in rows:
        if r["file_path"] and not Path(r["file_path"]).exists():
            add("ERROR", "DB-ORPHAN", "generated_videos.file_path missing on disk",
                f"idea #{iid} '{ideas.get(iid, {}).get('title')}' -> {r['file_path']}")
for iid, rows in tasks.items():
    for r in rows:
        if r["status"] == "success":
            f = r["output_folder_path"]
            if f and not Path(f).exists():
                add("ERROR", "DB-ORPHAN", "task status=success but folder missing",
                    f"task #{r['id']} idea #{iid} -> {f}")

# ------------------------------------------------------------------- print report
sev_order = {"ERROR": 0, "WARN": 1}
problems.sort(key=lambda t: (sev_order.get(t[0], 9), t[1], t[2]))

grouped = defaultdict(list)
for sev, scope, check, detail in problems:
    grouped[(sev, check)].append((scope, detail))

errors = sum(1 for p in problems if p[0] == "ERROR")
warns = sum(1 for p in problems if p[0] == "WARN")

for (sev, check), items in sorted(grouped.items(), key=lambda kv: (sev_order.get(kv[0][0], 9), -len(kv[1]))):
    print(f"\n[{sev}] {check}  ({len(items)})")
    for scope, detail in items[:40]:
        print(f"   - {scope}: {detail}")
    if len(items) > 40:
        print(f"   ... and {len(items) - 40} more")

print("\n" + "=" * 100)
print(f"TOTAL: {errors} ERROR, {warns} WARN across {len(disk_folders)} packages")
print(f"Ideas with a package on disk: {len(matched_ideas)} / {len(ideas)}")
con.close()
