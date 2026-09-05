# SEO Engine — Keyless YouTube SEO Architecture

**Status:** built and verified in dry-run against the live DB. **Nothing has been applied to your database** — every write shown below requires an explicit `--apply`.

**Location:** `PromptDatabase/seo_engine/` + `run_seo.py` / `run_seo.bat`

---

## 1. Why this exists — the finding that drove the design

Before building anything I audited the existing SEO path. The result:

> **All 35 rows in `youtube_metadata` are the hardcoded fallback — not generated SEO.**

`playwright_engine/generate_youtube_metadata.py` launches a *fresh, logged-out* Chromium
(`p.chromium.launch()` with a brand-new context), so `chatgpt.com` never answers. Every call
lands in the `except` block and returns the boilerplate literal:

```
🚨 INSANE: {title} - Level 10 Impossible Megastructure 🌾
"Witness the ultimate Level 10 Alien-Scale ..."
tags: [..., "Impossible Engineering", "AI Video", "Veo", "Megastructure", ...]
```

Verified across all 35 rows: 35/35 match the fallback title pattern, 35/35 match the fallback
description, 35/35 carry the identical 8-tag boilerplate, and every row has exactly 10 tags.
Also note `prompting_style_master` **already** contains a proper `STAGE_6_YOUTUBE_METADATA`
prompt template that the legacy generator ignores in favour of an inline hardcoded prompt.

So the pipeline has been shipping *identical, keyword-free metadata on every video*. That is
the single highest-impact SEO problem in the project, and it is what this engine fixes.

## 2. Architecture

Built to the exact division of labour from your `SEO_Discussion.txt`:

```
   API/scrapers = eyes     ->  harvest.py          keyless data collection
   Python/rules = calculator-> scoring.py          deterministic, reproducible scores
   Browser LLM  = brain    ->  browser_llm.py      CloakBrowser -> chatgpt.com, NO API key
   Database     = memory   ->  seo_models.py       additive tables
   Scheduler    = nervous  ->  pipeline.py         orchestration + safety
```

The critical principle from your discussion — *"LLM নিজে magically YouTube-এর live competition
জানে না"* — is enforced structurally: **the LLM is never asked for data, only for wording.**
Real keywords and real competitors are collected first, then handed to the brain as facts.

| Module | Role |
|---|---|
| `config.py` | Paths, flags, YouTube limits, scoring weights. No secrets. |
| `validators.py` | Upload-ready gate: title/desc/tag limits, dedupe, repair. |
| `harvest.py` | YouTube autocomplete (stdlib urllib) + yt-dlp SERP + optional Trends. |
| `scoring.py` | Demand / novelty / saturation / opportunity + competitor classification. |
| `browser_llm.py` | Reusable keyless LLM gateway (persistent profile, cache, rate limit). |
| `metadata_builder.py` | Data-grounded prompt + keyword-grounded deterministic fallback. |
| `seo_models.py` | New tables only: `seo_runs`, `seo_competitors`, `seo_keyword_metrics`. |
| `pipeline.py` | Orchestrates, backs up, persists, reports. |

### Keyless data sources (verified working)

- **YouTube autocomplete** — `suggestqueries.google.com`, stdlib only, no key.
  Real result for idea #1: **101 keywords** mined.
- **Competitor SERP** — `yt-dlp` flat search returning real titles/channels/view counts.
  Real result for idea #1: **36 competitors** discovered and classified.
- **Google Trends** — optional, off by default (`SEO_ENABLE_TRENDS=1` + `pytrends`).

Non-Latin autocomplete leakage (Bengali/CJK) is filtered out so tags stay usable for an English channel.

### Competitor classification (your 3-level model)

`EXACT` (≥0.55 title similarity) · `CLOSE` (≥0.30) · `SUBSTITUTE` (≥0.12) · `IRRELEVANT`.
Implements the "substitute competitor" insight — no direct competitor still means competition for attention.

### Scoring — and two bugs I found while testing it

| Scenario | Saturation | Novelty | Opportunity | Verdict |
|---|---|---|---|---|
| 1 viral rival | 12.5 | 88 | 73 | publish |
| 3 viral rivals | 37.5 | 64 | 57 | promising |
| 8 viral rivals | 100 | 4 | 17 | crowded |
| 8 weak rivals | 34.1 | 4 | 37 | crowded |
| search ran, 0 found | 0 | 100 | 81 | **publish** (white space) |
| search *failed* | — | — | — | **insufficient_data** |

Two corrections made during verification, both worth knowing about:

1. **Saturation conflated strength with density.** One viral rival in an empty field pegged
   saturation at 100, mislabelling genuine white space as "crowded". Now saturation combines
   rival *strength* (log-damped views) with rival *density* (how many direct rivals exist).
2. **Missing data scored as good news.** Zero competitors returned `crowded`/novelty-0 whether
   the search found nothing or simply failed. The harvester now reports `competitor_search_ran`,
   so "genuinely empty" scores as maximum novelty while "couldn't look" returns
   `insufficient_data` instead of a confident-looking fake number.

## 3. Safety — matches `SUGGESTION_remediation_plan.md`

| Plan principle | Implementation |
|---|---|
| No existing logic deleted/rewritten | New package only. `pipeline_packager.py`, `prompt_chain_engine.py` and the legacy generator are **byte-for-byte untouched**. |
| Backup before mutation | `--apply` copies the DB to `output_packaged/_backup_seo/` before the first write. |
| Dry-run by default | `--apply` required for any write. Verified: a dry-run creates **no rows and no tables**. |
| Auditable / reversible | Pre-change values go to `content_history` (title, description, tags) for manual rollback. |
| Additive schema | Only 3 new tables. `create_all` never alters existing ones. |

Extra guard beyond the plan: existing metadata is only overwritten when it is **detected
boilerplate**. Genuine metadata is skipped unless you pass `--force`
(observed live: `skipped_existing_real_metadata`).

**Verification performed:** I ran `--apply` against the real DB to prove the write path,
then restored from snapshot and diffed **all 31 original tables** — identical row counts *and*
content hashes. Your data is exactly as it was; no `seo_*` tables remain.

### The NO-RETRY LOCK interaction (important)

`pipeline_packager.py:243` returns early for already-packaged ideas, so **refreshed DB metadata
will not re-export to disk by itself**. This engine deliberately does *not* edit packaged folders
behind the packager's back. Instead each run reports `stale_packages_needing_reexport`, to be
synced via the remediation plan's `--force-idea` path — which remains **your decision to approve**.

## 4. Usage

```bat
run_seo.bat --list-fallback                  :: audit: which rows are boilerplate (35)
run_seo.bat --idea-id 1                      :: dry-run + browser LLM writes the copy
run_seo.bat --idea-id 1 --apply              :: persist one idea (backs up first)
run_seo.bat --backfill-fallback --apply      :: regenerate all 35 boilerplate rows
run_seo.bat --backfill-fallback --apply --limit 5   :: safer staged rollout
```

## 5. Browser LLM gateway

Reuses the streaming/DOM detection already proven in `prompt_chain_engine.call_chatgpt_playwright`,
generalised into `BrowserLLM.generate(prompt)` / `.generate_json(prompt)` with:

- **persistent Chrome profile** (`_chrome_profile_seo`) so the chatgpt.com login survives runs —
  this is the fix for the logged-out failure that caused the fallback problem in the first place;
  it is kept separate from the video pipeline's "Profile 5" to avoid collisions;
- SQLite prompt cache (never re-ask the same prompt), retry with backoff,
  jittered rate limiting, and a per-session prompt cap.

Reusable beyond SEO — any project module can call it instead of an API key.

### First run needs a one-time login

The persistent profile starts empty. On the first run a Chrome window opens;
**log in to chatgpt.com once** and the session persists afterwards. Until then, runs cleanly fall
back to the keyword-grounded builder rather than failing.

## 6. Not done (deliberately)

- **No git push** — restricted, as instructed.
- **No writes to your DB** — the engine is ready; the backfill is yours to trigger.
- **Publishing/analytics layers** from the discussion (YouTube/Meta upload, CTR feedback loop)
  are out of scope here; the `seo_runs` table is the foundation a learning loop would build on.
