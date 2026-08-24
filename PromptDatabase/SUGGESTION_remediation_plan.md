# Suggestion / Remediation Plan — package ↔ DB inconsistencies

- **Companion to:** `DIAGNOSTIC_REPORT_package_db_consistency.md`
- **Date:** 2026-08-24
- **Status:** PROPOSAL ONLY — nothing here has been applied. Every step below is gated on your confirmation.

## Guiding principles (per project rules)

1. **No existing logic is deleted or rewritten** — fixes are added as NEW scripts or as clearly-wrapped guard blocks around current code.
2. **Backup before any mutation** — a timestamped copy of `youtube_pipeline.db` and of any package folder is taken first.
3. **Dry-run by default** — every proposed script prints what it *would* change and writes nothing unless run with `--apply`.
4. **DB is treated as source of truth for text**, disk mp4 as source of truth for the render — except where a finding proves otherwise (called out per item).

---

## 🔑 Prerequisite 0 — Backup + the NO-RETRY LOCK

Findings #1, #2, #3, #7 all persist because of one mechanism: once `mp4 + prompt_info.json + youtube_metadata.json` exist, `pipeline_packager.py:243-266` marks the idea `SUCCESS` and never re-exports. **Any re-sync must first clear that lock for the target ideas.**

**Suggested approach (non-destructive):**
- Before touching anything: `cp youtube_pipeline.db youtube_pipeline.db.bak_2026-08-24` and zip the affected package folders into `output_packaged/_backup_2026-08-24/`.
- Add a **`--force-idea <id>` re-export path** to the packager that re-runs `export_package_files_from_sqlite()` even when the lock is set. This *extends* the current flow (new branch), it does not remove the lock logic.

---

## 🔴 1. Wrong video reused across ideas 6, 8, 9, 33

**Root cause:** the upstream step that fills `generated_videos.file_path` pointed several ideas at the *same* stale `Generated_*.mp4` (newest-file heuristic). The packager (`pipeline_packager.py:299-332`) faithfully copied what it was told; its only guard is `size > 10240`, which a stale file passes.

**Data fix (needs a real render):**
- Re-generate the missing Level-10 videos for ideas **6, 8, 9, 33**, land each as a distinct file, update its `generated_videos` row, then re-package with the `--force-idea` path from Prereq 0.
- Until re-rendered, these 4 packages should be treated as **NOT publishable**.

**Code fix (prevent recurrence) — proposed guard, added not replaced:**
Insert a content-hash check just before `shutil.copy(real_video_found, video_filepath)` (~`pipeline_packager.py:332`):

```python
# --- NEW GUARD: reject a render already linked to a DIFFERENT idea ---
import hashlib
def _md5(p): 
    return hashlib.md5(Path(p).read_bytes()).hexdigest()
incoming = _md5(real_video_found)
clash = session.exec(
    select(GeneratedVideo).where(GeneratedVideo.idea_id != idea.id)
).all()
if any(g.file_path and os.path.exists(g.file_path) and _md5(g.file_path) == incoming for g in clash):
    task.status = "waiting_for_video"
    task.last_error = "Incoming mp4 is byte-identical to another idea's video (stale render). Refusing to package."
    ... # same waiting_for_video return as the existing no-video branch
```

**Also fix upstream:** confirm the downloader (`video/1Video10Sec/extension_bridge.py`) writes a per-idea unique filename and records *that* file in `generated_videos`, instead of "latest mp4 in the folder." I have not yet audited that file — flag for review.

## 🔴 2. DB `youtube_metadata` placeholder titles for ideas 33, 34, 35

**Finding:** DB rows say `The Forest Titan Megastructure #1/2/3`; the correct name (`ideas.title` and the on-disk JSON) is the real title. Leaks into `title`, `seo_description`, `tags[0]`.

**⚠️ Investigate before overwriting:** the ytm row and the JSON were written ~35 ms apart in the same run yet differ. That means a second writer produced the placeholder. **Identify that writer first** (grep for the metadata-insert path) so the fix isn't silently undone on the next run.

**Data fix (proposed):**
- Regenerate the 3 rows from `ideas.title` via `sync_and_get_youtube_metadata_from_sqlite`'s fallback formatter, into a **new corrected value**, shown as a diff, applied only on `--apply`.
- The on-disk JSON is already correct → no package rewrite needed for these three (only the DB row).

## 🔴 3. Ideas 1, 2, 3 — JSON holds an OLD version of their own prompt

**Finding:** not cross-contamination — the DB prompt was regenerated ~2 h *after* the package was exported, and the NO-RETRY lock blocked re-export. Subject (rice) is correct on both sides.

**Decision needed — which side wins?**
- **Option A (recommended): re-export** ideas 1/2/3 packages from the current DB prompt using the `--force-idea` path. Makes disk match the richer DB text.
- **Option B: leave as-is** if the older on-disk prompt is the one actually used to render the existing mp4 (re-exporting would make the JSON describe a prompt the video was NOT made from).

→ This hinges on whether you plan to re-render #1's video anyway. Tell me and I'll pick the matching path.

## 🔴 4. Ideas 35 & 36 — shared level 2-5 video prompts (real contamination, in DB)

**Finding:** `prompts` ids 244/284, 246/286, 248/288, 250/290 are byte-identical across the two ideas. Level 10 is unaffected → packaging is safe, escalation chain is not.

**Data fix (proposed):**
- Re-run the escalation generator for **one** of the two ideas (whichever is wrong) to rewrite its Level 2-5 video prompts, leaving the other intact.
- **Decision needed:** which idea holds the correct text — 35 (*Bioluminescent Spore Fortress*) or 36 (*Atmospheric Timber Leviathan*)? I can show you both prompt sets side-by-side to decide.
- Low urgency: does not affect any packaged (Level-10) output.

## 🔴 5. Idea 112 (Solar Bloom Clock) — package exists, zero prompts in DB

**Finding:** no `prompts` rows at all for idea 112; JSON prompt text has no DB provenance; mp4 is 2.3 MB (vs 6-12 MB), matching a `- Copy.mp4` early render.

**Decision needed — pick one:**
- **Option A: backfill** — generate the full Level-1→10 prompt chain for idea 112 so the package becomes reproducible, then (optionally) re-render the undersized video.
- **Option B: quarantine** — move `11.10.Level_10_Solar_Bloom_Clock/` to `output_packaged/_orphans/` and mark the idea `blocked`, since it can't be regenerated or trusted.
- **Option C: drop** — delete the package + its `generated_videos`/`youtube_metadata` rows (backup first).

I recommend **A** if you still want this video, else **B**.

## 🟠 6. Generic "Forest Titan Megastructure" prompts (ideas 33, 34, 37, 38, 40, 41)

**Finding:** the Level-10 **image** prompt describes a generic forest titan, not the idea's own subject. Disk == DB, so this is a **generator-quality** issue, not an export/sync bug.

**Suggested fix (content, optional):**
- Re-generate the Level-10 image prompt for these 6 ideas with the idea title injected into the subject line, then re-export their packages via `--force-idea`.
- Also refresh idea 35's stale `ytm.video_prompt_used` / `image_prompt_used` copies at the same time.
- Purely a quality improvement — safe to defer.

## 🟡 7. Empty `video_file_path` / `package_folder_path` in all 28 rows

**Finding:** the code that fills these (`pipeline_packager.py:367-368`) sits *after* the NO-RETRY early-return at line 259, so it never runs for already-packaged ideas.

**Code fix (proposed, wrapping):**
- Inside the existing NO-RETRY LOCK block (before the `return` at line 259), add a back-fill: if `yt_meta_rec.package_folder_path` is empty, set it to the known folder + video path and commit. Pure addition, no behavior removed.
- One-time **`backfill_metadata_paths.py`** (dry-run/`--apply`) can populate all 28 existing rows without re-packaging.
- Also: `ytm#5` (idea 12, *The Solar Wheat Sifter*) has a metadata row but no folder — either package it or mark the row `pending`.

---

## 📋 Decisions I need from you

| # | Decision | Options |
|---|----------|---------|
| 3 | Ideas 1/2/3 — re-export JSON from new DB prompt, or keep old? | A re-export / B keep |
| 4 | Ideas 35 vs 36 — which one has the CORRECT L2-5 prompt? | 35 / 36 / show me both |
| 5 | Idea 112 — backfill prompts, quarantine, or drop? | A / B / C |
| 1 | Ideas 6/8/9/33 — will you re-render, or should I only re-link if a correct file exists? | re-render / re-link |
| 6,7 | Do the quality + traceability fixes now, or defer? | now / defer |

## ✅ Recommended execution order (once decisions are in)

1. **Prereq 0** — backup DB + folders; add `--force-idea` re-export path (reviewed by you first).
2. **#2** — fix placeholder titles (DB-only, low risk) after identifying the second writer.
3. **#7** — back-fill traceability paths (DB-only, low risk).
4. **#1** — add the hash guard; hold the 4 bad packages until re-rendered.
5. **#5**, **#4**, **#3**, **#6** — per your decisions above.

## Safety recap

- No script here runs on `--apply` without you seeing the dry-run diff first.
- Existing files touched only by **addition** (guard blocks / new branches); originals preserved via `.bak` + git.
- All existing pipeline behavior for healthy ideas (the clean 25) stays byte-for-byte unchanged.

> Tell me the 5 decisions (or even just #1 and #2 to start) and I'll produce the first dry-run script for your review.
