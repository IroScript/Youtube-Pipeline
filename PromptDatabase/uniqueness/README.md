# Uniqueness Engine — Why Every Video Looked the Same, and What Was Fixed

**Nothing has been applied to your database.** Every change below is dry-run by default and
needs an explicit `--apply`. Your DB currently shows **zero** changes vs the committed state.

Entry point: `run_uniqueness.bat` (uses the project venv automatically).

---

## First: a correction to something I told you earlier

You said *"I saw many cases that prompt actually generated, I see it live"* — **you were right,
and I was unclear.** Verified:

- **700 prompts are saved correctly** (350 image + 350 video, avg 1,705 chars, none empty).
- My earlier "fallback" finding applied **only to `youtube_metadata`** (the SEO title /
  description / tags), never to the escalation prompts.
- Reason for the difference: your main prompt engine uses the **logged-in** CloakBrowser and
  works. Only `playwright_engine/generate_youtube_metadata.py` opened a *separate logged-out*
  browser, so that one function always fell back.

## And: `SUGGESTION_remediation_plan.md` was NOT implemented

That file is a proposal that ends with 5 decisions only you can make. This work implements the
findings that needed no decision, and **reports** the ones that do (re-render choices stay yours).

---

## The 4 measured root causes

Run `run_uniqueness.bat --audit` to reproduce all of this at any time.

### 1. You were watching 29 distinct videos, not 34
**9 of 34 packaged mp4s are byte-identical duplicates.**

| Copies | Packages sharing one identical file |
|---|---|
| 3 | Rice_Comb_Superstructure, Paddy-Gulping_Harvest_Worm, Rice_Moon_Harvester |
| 2 | Infinite_Rice_Factory, Whispering_Canopy_Harvester |
| 2 | Paddy_Ring_Megaharvester, Sky_Reaper_Rice_Fortress |
| 2 | Pollinator_Cathedral, Sun_Harvesting_Palm_Engine |

**Cause:** `extension_bridge.py` picked *"the newest .mp4 in ~/Downloads"* rather than this
idea's own file. When a render was slow or failed, a previous idea's video won and was recorded
as this idea's. Confirms remediation finding #1 (and it was wider than the 4 ideas that listed).

### 2. The identical last two seconds
**35/35 video prompts end with the same beat** — hardcoded at `prompt_chain_engine.py:591` and
echoed in the STAGE_3 template:

> *"the camera performs a continuous impossible-scale descent … maximum close-up of a single
> harvested particle/grain beside a colossal quantum mechanism"*

That is exactly the *"same last two second zooming in a small object"* you described. **35/35**
also share an identical opening sentence.

### 3. Everything is a tree
88.2% of all video came from **3 elements**. Of 100 elements, **87 have never been used** and
**12 entire groups** (Space, Tech, Biology, Physics, Weather, Vehicle…) never produced anything.

**Cause:** the selector walks `ORDER BY element.id ASC` and returns after one unit of work,
restarting at element #1 every call — so it never reached Volcano, Ocean, Glacier, DNA, Satellite.

### 4. Subject drift + duplicate prompt text
10 Level-10 prompts never mention their own subject (idea #41 "Chrono-Bark Synthesizer" contains
no "Chrono", "Bark" or "Synthesizer" — it describes a generic *"Forest Titan Megastructure"*).
Ideas **35 & 36** share byte-identical L2-L5 video prompts (confirms remediation #4).

---

## What was built

### Part 1 — `PromptDatabase/uniqueness/`

| Module | Role |
|---|---|
| `variation.py` | Deterministic per-idea archetypes: form, camera, **ending**, mood, HUD verbs, pacing |
| `templates.py` | v2 STAGE_2/STAGE_3 templates, installed as **new version rows** |
| `escalation.py` | Binds variation into the prompt without breaking the engine's `.format()` call |
| `spread.py` | Group-balanced element queue (unlocks the 87 unused elements) |
| `novelty.py` | Idea-vs-idea similarity, reusing the SEO engine's scorer |
| `audit.py` | Read-only diagnosis of all of the above |
| `integrate.py` | **The wiring.** Installs/removes the two `prompt_chain_engine.py` hooks (dry-run default) |
| `verify.py` | 21-check self-test: variation, direction, templates, spread, hooks, fail-open |

**Result — the fixed ending is gone.** Same-element ideas that used to be identical:

```
idea#33  crawler / orbit      / cross_section  / night
idea#34  bridge  / ascend     / scale_human    / golden
idea#37  bridge  / flythrough / cross_section  / golden
idea#38  hive    / flythrough / silhouette     / dust
idea#41  crawler / pullback   / interior_rest  / dust
```
35/35 ideas get a **distinct fingerprint**, zero collisions, out of 204,800 combinations —
and it's deterministic, so a given idea always regenerates the same way.

**Compatibility guard:** `prompt_chain_engine.py:723` calls
`.format(idea_title=, topic=, description=)`. A template needing any other key would raise
`KeyError` and break your pipeline, so `validate_templates()` blocks installation if that could
happen. Per-idea variation is layered in code instead.

### Part 2 — `video/1Video10Sec/` robustness

- **Duplicate-render guard** — uses the exact filename the extension *already* sends via
  `/api/video_ready` (previously discarded), plus an **md5 check** that refuses an mp4 already
  belonging to another idea. Tested: own file allowed ✓, other idea's file refused ✓, new file
  allowed ✓, **fails open if the DB is unreachable** so it can never block a good render ✓.
- **Atomic download** — writes to `.part` then renames, so an interrupted transfer can no longer
  be packaged as a finished video.
- **Interrupted ≠ complete** — `download-manager.js` no longer counts a failed download as done.
- **Timeouts are now visible** — writes `tasks.status='waiting_for_video'` + `last_error`
  instead of silently returning `None`.
- **Fixed a latent crash** — `idea_prompt_generator.py` used `re.sub` without importing `re`;
  its SQL fallback would have raised `NameError`.
- **Guarded a destructive script** — `upgrade_all_prompts_to_916_rich_standard.py` deletes all
  prompts and rebuilds them from the hardcoded skeleton. Running it would have flattened the 31
  ideas with real LLM prompts into one identical template. It now requires typed confirmation.

---

## Part 3 — the wiring (this was the missing piece)

Everything above was built but **never connected**. Verified by grep: nothing in the
production pipeline imported `uniqueness/`. So the modules ran fine from
`run_uniqueness.bat` and had **zero effect on real generation** —
`generate_escalation_for_idea()` still built its prompt from the 3-key template alone, and
the element walker still restarted at element #1 on every call.

`integrate.py` closes that gap with two **additive** insertions into
`prompt_chain_engine.py`. Check the current state any time:

```bat
run_uniqueness.bat --status
```

| Hook | Anchor | What it does | Default |
|---|---|---|---|
| `creative_direction` | after the `prompt_instruction` fallback line (~731) | **Appends** the per-idea direction block to the prompt already built | **ON** once installed (`UNIQUENESS_VARIATION=0` to disable) |
| `element_spread` | after `all_elements = session.exec(...)` (~874) | **Re-orders** the list already loaded, group-balanced | **OFF** (`UNIQUENESS_SPREAD=1` to enable) |

### Why this is safe

- **Nothing is deleted, rewritten, reordered or renamed.** Hook 1 only concatenates onto
  `prompt_instruction`; hook 2 only permutes a list. Both original statements stay
  byte-for-byte identical — proven: the base prompt is still the exact prefix (3,994 chars
  in, 5,282 out, prefix preserved).
- **Sentinel-delimited**, so removal is exact. Tested on a real file copy:
  install -> uninstall returns the **identical md5**. Re-install is idempotent.
- **Dry-run by default.** `--install-hooks` prints the unified diff and writes nothing.
- **On `--apply`:** a timestamped `.bak_<UTC>` is written first, and the patched source must
  pass `compile()` before it is allowed to land. Fails -> nothing is written.
- **Both hooks fail open.** Env-gated + `try/except`: if `uniqueness/` is missing or raises,
  the engine continues with exactly its original behaviour. The diversity layer can never
  stall video production.
- `element_spread` is a **strict permutation** — 100 elements in, 100 out, identical id set.
  No element is dropped, so the walker's coverage guarantee is unchanged; only visit order
  differs (first element becomes `#53 DNA` instead of `#1 Paddy / Rice Field`).

### Two independent switches — don't confuse them

| | What it changes | Command |
|---|---|---|
| **Templates v2** | *what is asked for* — removes the fixed skeleton/ending from the stored template | `--install-templates-v2 --apply` |
| **Hooks** | *whether per-idea variation runs at all* | `--install-hooks --apply` |

Templates v2 alone still gives every idea the same instruction. The hooks alone still help,
because the direction block explicitly re-bans the old ending. **Both** is the full fix.

## How to use it

```bat
:: diagnose (all read-only)
run_uniqueness.bat --status                       :: IS the layer wired into the engine?
run_uniqueness.bat --verify                       :: 21-check self-test
run_uniqueness.bat --audit                        :: full diagnosis (writes nothing)
run_uniqueness.bat --spread                       :: balanced element queue
run_uniqueness.bat --novelty-scan                 :: near-duplicate ideas
run_uniqueness.bat --preview-idea 33              :: creative direction for one idea

:: change what NEW prompts ask for (DB)
run_uniqueness.bat --install-templates-v2         :: dry-run template diff
run_uniqueness.bat --install-templates-v2 --apply :: install (backs up DB first)
run_uniqueness.bat --rollback-templates --apply   :: revert to previous templates

:: make the variation layer actually run (source)
run_uniqueness.bat --install-hooks                :: dry-run unified diff
run_uniqueness.bat --install-hooks --apply        :: wire it in (.bak + compile check first)
run_uniqueness.bat --uninstall-hooks --apply      :: unwire, byte-exact restore
run_uniqueness.bat --install-hooks --hook element_spread --apply   :: one hook only
```

Runtime switches (no re-patching needed):

```bat
set UNIQUENESS_VARIATION=0   :: disable per-idea direction
set UNIQUENESS_SPREAD=1      :: enable group-balanced element order
```

### Recommended order
1. `--audit` — see the numbers yourself.
2. `--verify` — confirm all 21 checks pass before changing anything.
3. `--install-templates-v2 --apply` — stops NEW prompts sharing one skeleton.
4. `--install-hooks --apply` — **without this, steps 1-3 change nothing about real
   generation.** This is what makes per-idea variation actually run.
5. `set UNIQUENESS_SPREAD=1` — take the next ideas from DNA / Satellite / Volcano instead
   of more trees. (Or leave it off to keep the strict ascending-element order.)
6. Existing 35 ideas keep their current prompts. Regenerating them is your call — and note the
   **NO-RETRY LOCK** means already-packaged folders won't re-export without the remediation
   plan's `--force-idea` path.

## Still your decision (not done automatically)
- **Re-rendering the 9 duplicate videos** — needs real Veo renders.
- **Regenerating the 10 subject-drift prompts** (ideas 33, 34, 37, 40, 41 …).
- **Which of ideas 35/36 keeps its L2-5 prompts.**
- **No git push** — restricted.
