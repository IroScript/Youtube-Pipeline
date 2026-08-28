"""Throwaway read-only verifier: confirm every number that goes into the Bangla report."""
import csv, hashlib, os, sqlite3, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
DB = ROOT / "database" / "youtube_pipeline.db"
con = sqlite3.connect(str(DB))
c = con.cursor()

print("=== TABLE COUNTS ===")
for t in ["categories", "elements", "ideas", "idea_elements", "prompts",
          "youtube_metadata", "generated_videos", "tasks", "task_attempts",
          "content_history", "pipeline_stage_audits", "seo_runs",
          "seo_keyword_metrics", "seo_competitors"]:
    try:
        c.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"  {t:26s} {c.fetchone()[0]}")
    except Exception as e:
        print(f"  {t:26s} ERR {e}")

print("\n=== SEO RUNS ===")
c.execute("PRAGMA table_info(seo_runs)")
cols = [r[1] for r in c.fetchall()]
print("  cols:", cols)
c.execute("SELECT * FROM seo_runs")
for row in c.fetchall():
    print("  ", dict(zip(cols, row)))

print("\n=== KEYWORD METRICS per idea + source ===")
c.execute("SELECT idea_id, source, COUNT(*) FROM seo_keyword_metrics GROUP BY idea_id, source")
for r in c.fetchall():
    print("  ", r)

print("\n=== COMPETITORS per idea (sample) ===")
c.execute("SELECT idea_id, COUNT(*) FROM seo_competitors GROUP BY idea_id")
for r in c.fetchall():
    print("  idea", r[0], "->", r[1])
c.execute("PRAGMA table_info(seo_competitors)")
ccols = [r[1] for r in c.fetchall()]
print("  cols:", ccols)
c.execute("SELECT * FROM seo_competitors LIMIT 3")
for row in c.fetchall():
    print("  ", dict(zip(ccols, row)))

print("\n=== GENERATED VIDEOS alive/dead ===")
c.execute("SELECT idea_id, file_path FROM generated_videos ORDER BY idea_id")
alive, dead = [], []
for iid, fp in c.fetchall():
    p = pathlib.Path(fp) if fp else None
    if p and p.exists():
        alive.append((iid, fp, p.stat().st_size))
    else:
        dead.append(iid)
print("  alive:", alive)
print("  dead count:", len(dead), "ids:", dead)

print("\n=== SEO metadata real vs boilerplate ===")
c.execute("PRAGMA table_info(youtube_metadata)")
mcols = [r[1] for r in c.fetchall()]
print("  cols:", mcols)
c.execute("SELECT idea_id, title, tags, seo_description FROM youtube_metadata ORDER BY idea_id")
rows = c.fetchall()
boiler = [r[0] for r in rows if r[1] and ("INSANE" in r[1] or "\U0001f6a8" in r[1])]
print("  total:", len(rows), "boilerplate-looking:", len(boiler))
for r in rows:
    if r[0] in (1, 2):
        tags = (r[2] or "")
        n = len([x for x in tags.replace("|", ",").split(",") if x.strip()])
        print(f"  idea {r[0]}: title={len(r[1] or '')}ch tags={n} desc={len(r[3] or '')}ch")
        print(f"      title text: {r[1]}")

print("\n=== IDEAS TOTAL ===")
c.execute("SELECT COUNT(*) FROM ideas")
print("  ideas:", c.fetchone()[0])
con.close()

print("\n=== CSV: master_prompts_from_db.csv ===")
p = ROOT / "exports" / "master_prompts_from_db.csv"
print("  bytes:", p.stat().st_size)
with p.open(encoding="utf-8-sig", newline="") as f:
    rd = list(csv.DictReader(f))
print("  rows:", len(rd), "cols:", len(rd[0]))
for col in ["SEO_Status", "Video_Exists", "Package_Complete",
            "Next_Missing_Stage", "Is_Level10_Video_Prompt"]:
    print("  ", col, dict(collections.Counter(r[col] for r in rd)))

print("\n=== CSV: unified_master_pipeline.csv ===")
p2 = ROOT / "exports" / "unified_master_pipeline.csv"
print("  bytes:", p2.stat().st_size)
with p2.open(encoding="utf-8-sig", newline="") as f:
    rd2 = list(csv.DictReader(f))
print("  rows:", len(rd2), "cols:", len(rd2[0]))
for col in ["Pipeline_Lifecycle_State", "Output_Video_File_Exists"]:
    if col in rd2[0]:
        print("  ", col, dict(collections.Counter(r[col] for r in rd2)))

print("\n=== MP4 md5 scan ===")
base = ROOT.parent
seen = collections.defaultdict(list)
for d in ["video/1Video10Sec", "PromptDatabase/output_packaged", "archive"]:
    dd = base / d
    if not dd.exists():
        print("  MISSING DIR:", d)
        continue
    for f in dd.rglob("*.mp4"):
        h = hashlib.md5(f.read_bytes()).hexdigest()
        seen[h].append(str(f.relative_to(base)))
print("  total mp4:", sum(len(v) for v in seen.values()), "distinct md5:", len(seen))
for h, files in seen.items():
    if len(files) > 1:
        print("  DUP", h, files)
for h, files in seen.items():
    for fl in files:
        if "output_packaged" in fl:
            print("  packaged:", h, fl, os.path.getsize(base / fl))
