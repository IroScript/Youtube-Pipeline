# Diagnostic Report — output_packaged/ ↔ youtube_pipeline.db Consistency Audit

- **Date:** 2026-08-24
- **Scope:** `PromptDatabase/output_packaged/` (packaged videos + JSON) vs `PromptDatabase/database/youtube_pipeline.db`
- **Question audited:** Does the prompt match the JSON, does the video match the prompt/JSON, does the DB match the package (prompt + youtube_metadata), and did one idea's prompt get saved into another idea's JSON?
- **Mode:** 100% read-only. DB opened with `mode=ro`. No package, DB row, or existing script was modified.
- **Tools produced:**
  - `PromptDatabase/verify_package_db_consistency.py` — cross-layer auditor (folder naming, file completeness, prompt fidelity, metadata fidelity, cross-contamination, video linkage, ambiguity, subject drift)
  - `PromptDatabase/verify_deep_dive.py` — root-cause / direction analysis (whose prompt is it, which side is stale)

## Headline Result

**28 packages checked → 32 ERRORS, 66 WARNINGS.**

| # | Severity | Finding | Affected |
|---|----------|---------|----------|
| 1 | 🔴 Critical | Same video file reused across different ideas (byte-identical mp4) | ideas 6, 8, 9, 33 |
| 2 | 🔴 Critical | DB `youtube_metadata` has placeholder titles; JSON is correct | ideas 33, 34, 35 |
| 3 | 🔴 High | Ideas 1/2/3 JSON holds an OLD version of their own prompt (not another idea's) | ideas 1, 2, 3 |
| 4 | 🔴 High | One idea's prompt genuinely copied into another (in DB) | ideas 35 & 36 |
| 5 | 🔴 High | Idea has zero prompts in DB but a package exists on disk | idea 112 |
| 6 | 🟠 Medium | Forest prompts are generic "Forest Titan Megastructure" (disk == DB) | ideas 33,34,37,38,40,41 |
| 7 | 🟡 Low | Traceability: `video_file_path` / `package_folder_path` empty in all rows | all 28 |

---

## 🔴 1. Same video file reused across different ideas (worst problem)

MD5-hashed every mp4: **27 files, only 23 unique.** Four folders hold a byte-identical copy of another idea's video.

| Hash (md5 prefix) | Folders sharing the exact same mp4 |
|---|---|
| `cf1705782726` | `1.10.Infinite_Rice_Factory` (idea 10) **==** `2.1.Whispering_Canopy_Harvester` (idea 33) |
| `007f5f063136` | `1.5.Paddy_Ring` (idea 5) **==** `1.6.Sky_Reaper_Rice_Fortress` (idea 6) |
| `6adf9e547ec0` | `1.7.Rice_Comb` (7) **==** `1.8.Paddy-Gulping_Worm` (8) **==** `1.9.Rice_Moon` (9) |

The `2.1` case is the clearest proof: a **rice** video is sitting inside a **forest** idea's folder.

Not just a disk artifact — the DB agrees. `generated_videos.file_size_bytes` is identical for gv#6/#7, gv#8/#9/#10, gv#11/#12, so the wrong video is linked in SQLite too.

**Cause:** `pipeline_packager.py:299-332` copies whatever is at `gen_video_rec.file_path`. When a new Veo render never landed, the previous `Generated_*.mp4` in `video/1Video10Sec/` was still the newest file and got copied again for the next idea. The only guard is `size > 10240`, which a stale file passes — then the NO-RETRY LOCK (`pipeline_packager.py:243-266`) stamps it `SUCCESS` permanently.

**Impact:** ideas 6, 8, 9, 33 have the wrong video. Uploading these risks duplicate-content strikes.

## 🔴 2. DB `youtube_metadata` has placeholder titles for ideas 33, 34, 35

| Idea | DB row `title` says | `ideas.title` + JSON say |
|---|---|---|
| 33 | `The Forest Titan Megastructure #1` | The Whispering Canopy Harvester |
| 34 | `The Forest Titan Megastructure #2` | The Timberland Root Walker |
| 35 | `The Forest Titan Megastructure #3` | Bioluminescent Spore Fortress |

The placeholder leaks into `title`, `seo_description`, **and** `tags[0]`. Here the **DB is wrong and the JSON is correct.** All other 25 ideas match perfectly.

## 🔴 3. Ideas 1, 2, 3 — JSON holds an OLD version of the prompt (not another idea's)

Direct answer to "did one prompt get saved into another": **For these three, NO cross-mixing — it is stale version drift.** Verified by timeline:

- Packages exported: `2026-08-18 08:41 UTC` (= 14:41 BD)
- DB prompts created: `16:48` / `16:55` / `16:56` BD → **~2 hours AFTER the export**

Idea 1 on disk: `"Use IMAGE 10 as the first frame… STEP 1: AWAKEN THE TITAN"` (short, 5-step).
Idea 1 in DB: `"Exactly 8 seconds, 9:16… STEP 1: ALIEN HARVEST AWAKENING"` (longer, richer).

Subject is correct (rice) in both. The prompts were regenerated in the DB afterwards; the NO-RETRY LOCK blocked re-export. The `ALIEN LEVEL / MAXIMUM` vs `Alien Level / Maximum` casing difference (findings 3-warn) confirms the JSON is from the older convention.

## 🔴 4. One idea's prompt genuinely copied into another — ideas 35 & 36

The real contamination case, and it is **inside the DB**:

```
ideas [35, 36]  prompt ids [244, 284]  level 2  video  — byte-identical
ideas [35, 36]  prompt ids [246, 286]  level 3  video  — byte-identical
ideas [35, 36]  prompt ids [248, 288]  level 4  video  — byte-identical
ideas [35, 36]  prompt ids [250, 290]  level 5  video  — byte-identical
```

*Bioluminescent Spore Fortress* (35) and *Atmospheric Timber Leviathan* (36) share the exact same video prompt text at levels 2-5. **Level 10 is unaffected**, so packaging is safe — but their escalation chains are corrupted.

## 🔴 5. Idea 112 (Solar Bloom Clock) — zero prompts in the DB

`11.10.Level_10_Solar_Bloom_Clock/` has a real mp4 and both JSONs, but the `prompts` table has **no rows at all** for idea 112 (not just missing level 10). The prompt text in that JSON has no DB provenance and cannot be re-derived. Its video is 2.3 MB vs 6-12 MB for everything else, and matches a stray `video/1Video10Sec/Generated_Solar_Bloom_Clock___Level_10___10Sec - Copy.mp4` — looks like an early incomplete render.

## 🟠 6. Forest prompts are generic (content-level; disk == DB)

Ideas 33, 34, 37, 38, 40, 41: the level-10 **image** prompt describes *"The ultimate Forest Titan Megastructure"* instead of the idea's own subject. The disk text **exactly matches** the DB, so this is not an export bug — the generator wrote generic text. Words like *whispering / canopy / grove / ironwood / evergreen / chrono* appear nowhere in their own prompts. Also idea 35's `ytm.video_prompt_used` / `image_prompt_used` are stale (ideas 33 and 34 match fine).

## 🟡 7. Traceability gap — all 28 rows

`youtube_metadata.video_file_path` and `package_folder_path` are **empty for every row.** `pipeline_packager.py:367-368` fills them, but the NO-RETRY LOCK returns at line 259 first, so that code never runs for already-packaged ideas. Nothing in SQLite links a metadata row to its folder. Also `ytm#5` (idea 12, *The Solar Wheat Sifter*) has a metadata row but no folder on disk.

---

## ✅ What Is Clean

- All 28 folder names correctly derive from the DB (`element_id.idea_index.Level_10_title`) — no collisions, no wrong `idea_id`.
- All 28 have complete file sets; hierarchical copies are byte-identical to `prompt_info.json` / `youtube_metadata.json`.
- `idea_id`, `idea_title`, `element_id`, `idea_index_in_element` match the DB in all 28.
- **25 of 28** prompt JSONs exactly match the DB level-10 prompts.
- **25 of 28** metadata JSONs exactly match their DB row.
- No two packages on disk share prompt text; no duplicate `youtube_metadata` rows.

---

## Fix Priority (nothing changed yet — awaiting confirmation)

1. **#1** wrong videos for ideas 6, 8, 9, 33 — re-render/re-link, then rebuild those packages. Directly corrupts uploads.
2. **#2** placeholder titles for ideas 33-35 in `youtube_metadata` — regenerate metadata from the real `ideas.title`.
3. **#5** idea 112 has no prompt provenance — decide whether to backfill prompts or drop the package.
4. **#4** ideas 35 & 36 shared level 2-5 prompts — regenerate 35's (or 36's) escalation chain.
5. **#3 / #6 / #7** stale/generic prompts and empty traceability paths — lower urgency.

### Note on the NO-RETRY LOCK

Findings #1, #2, #3, #7 all trace back to the same mechanism: once `mp4 + both JSON` exist, `pipeline_packager.py` marks the idea `SUCCESS` and never re-exports, even after the DB is updated. Any re-sync fix must bypass or reset this lock for the affected ideas.

---

## How to Reproduce

```bash
cd PromptDatabase
python verify_package_db_consistency.py   # full ERROR/WARN report
python verify_deep_dive.py                # root-cause: whose prompt, which side is stale
```

Both scripts are read-only (`sqlite3.connect(..., mode=ro)`).
