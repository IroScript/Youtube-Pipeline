# SEO Engine + SUGGESTION Plan — অবস্থা রিপোর্ট (বাংলা)

**তারিখ:** 2026-08-25
**কী নিয়ে:** (১) SEO কেসে কী হয়েছে, (২) `SUGGESTION_remediation_plan.md`-এর অবস্থা
**নিচের সব সংখ্যা DB থেকে live verify করা** (অনুমান নয়)

---

## এক নজরে

| জিনিস | অবস্থা |
|---|---|
| `seo_engine/` কোড | ✅ সম্পূর্ণ, tested, keyless |
| SEO আসল DB-তে apply | ❌ **না** — ৩৫/৩৫ row এখনো boilerplate |
| SEO-র pipeline wiring | ⛔ দরকার নেই (ইচ্ছাকৃত, নিচে কারণ) |
| `SUGGESTION_remediation_plan.md` | 📋 **PROPOSAL ONLY** — কোনো data fix চালানো হয়নি |
| Plan-এর prevention অংশ | ✅ কাজ করছে (duplicate guard, template v2 + hook) |
| Plan-এর ৫টা decision | ⏳ আপনার সিদ্ধান্তের অপেক্ষায় |
| Git | কিছুই commit করা হয়নি |

**মূল কথা:** দুই ফাইলের গল্প একই আকৃতির — **যন্ত্র তৈরি, switch এখনো বন্ধ।**

---

# ১) SEO কেসে কী হয়েছে

## ১.১ যে সমস্যাটা ধরা পড়েছিল

`youtube_metadata` টেবিলের **৩৫টা row-ই** একই hardcoded boilerplate ছিল:

```
🚨 INSANE: <title> - Level 10 Impossible Megastructure 🌾
```

অর্থাৎ কোনো row-তেই আসল SEO ছিল না — সবগুলোই fallback text।

**কারণ:** `playwright_engine/generate_youtube_metadata.py` metadata বানানোর জন্য **আলাদা একটা logged-out browser** খুলত। তাই LLM-এ কখনোই পৌঁছাত না, প্রতিবারই `except` branch-এ পড়ে fallback লিখে দিত।

এদিকে main prompt engine logged-in CloakBrowser ব্যবহার করে — তাই **prompt গুলো আসল** হলেও **metadata নকল** থেকে গিয়েছিল। এটাই ছিল "সব একরকম দেখাচ্ছে কেন" রহস্যের আসল উত্তর।

## ১.২ যা বানানো হয়েছে — `PromptDatabase/seo_engine/`

৯টা module, প্রায় ২,০০০ লাইন। পুরোপুরি **keyless** — কোনো API key লাগে না।

| Module | কাজ |
|---|---|
| `harvest.py` | YouTube autocomplete/suggest endpoint (শুধু stdlib `urllib`) + `yt-dlp` দিয়ে competitor SERP, view count সহ |
| `scoring.py` | deterministic keyword scoring — **এখানে কোনো LLM নেই**, পুরো হিসাব code-এ |
| `browser_llm.py` | CloakBrowser দিয়ে chatgpt.com / gemini — prompt engine যেভাবে logged-in browser ব্যবহার করে, ঠিক সেভাবেই |
| `validators.py` | upload-ready guarantee — title ≤ 100 char, tag limit, description structure |
| `metadata_builder.py` | harvest + scoring + LLM মিলিয়ে final metadata assemble |
| `pipeline.py` | পুরো flow orchestrate |
| `seo_models.py` | **শুধু নতুন টেবিল** যোগ করে; পুরোনো `youtube_metadata`-ই final destination থাকে (packager ওটাই পড়ে) |
| `config.py` | সব knob এক জায়গায় |
| `README.md` | design + কেন integrate করা হয়নি তার ব্যাখ্যা |

**Design-এর দুইটা গুরুত্বপূর্ণ সিদ্ধান্ত:**

1. **কোনো API key নেই।** YouTube Data API key লাগে না, LLM API key-ও লাগে না। Data আসে public autocomplete endpoint আর `yt-dlp` থেকে; "brain" হিসেবে browser-এ logged-in ChatGPT/Gemini। অর্থাৎ প্রকল্পের বাকি অংশ যে পদ্ধতিতে চলে, SEO engine-ও সেই একই পদ্ধতিতে চলে।
2. **Scoring-এ LLM নেই।** কোন keyword ভালো — সেটা deterministic হিসাব, LLM-এর মতামত নয়। তাই একই input-এ সবসময় একই output, আর ফলাফল audit করা যায়।

## ১.৩ Safety contract

- **dry-run default** — কিছু লিখতে হলে `--apply` স্পষ্টভাবে দিতে হবে
- লেখার আগে DB-র **timestamped backup** নিজে থেকে নেয়
- `harvest.py`-তে Latin-script filter আছে, যাতে autocomplete থেকে বাংলা/CJK শব্দ ঢুকে metadata নষ্ট না করে
- `--list-fallback` পুরোপুরি read-only — শুধু দেখায় কোন row এখনো fallback

## ১.৪ Pipeline-এ wire করা হয়নি — এবং এটা ইচ্ছাকৃত

এই জায়গাটা গুরুত্বপূর্ণ, কারণ uniqueness layer-এর সাথে গুলিয়ে যেতে পারে।

- **Uniqueness layer** — ওটা সত্যিই dead code ছিল, কেউ import করত না। **সেটাই ছিল কালকের আসল বাকি কাজ, আজ wire করা হয়েছে।**
- **SEO engine** — ওটার wiring **দরকার নেই**। কারণ `seo_engine/README.md`-তেই লেখা আছে।

**কারণটা হলো NO-RETRY LOCK** — `pipeline_packager.py:243-266`:

```
একটা idea-র mp4 + prompt_info.json + youtube_metadata.json
একবার তৈরি হয়ে গেলে → SUCCESS mark → আর কখনো re-export হয় না
```

তাই SEO engine যদি DB-তে নতুন metadata লিখেও দেয়, packager সেটা কখনো package folder-এ পৌঁছাবে না।

এই অবস্থায় **packager-এর পিঠ পিছে গিয়ে package folder rewrite করা ভুল হতো** — তাহলে DB আর disk-এর মধ্যে অদৃশ্য mismatch তৈরি হতো, আর packager-এর নিজের record মিথ্যা হয়ে যেত। তাই engine সেটা করে না। বদলে প্রতি run-এ রিপোর্ট করে:

```
stale_packages_needing_reexport: [idea ids...]
```

অর্থাৎ *"এই idea গুলোর DB updated, কিন্তু package folder পুরোনো"* — সিদ্ধান্ত আপনার হাতেই থাকে।

> `seo_engine/README.md:100` — "New package only. `pipeline_packager.py`, `prompt_chain_engine.py` and the legacy generator are **byte-for-byte untouched**."

## ১.৫ এখন যা অবস্থা — এখনো apply করা হয়নি

DB থেকে এইমাত্র verify করা:

```
youtube_metadata total rows : 35
still boilerplate fallback  : 35     <- একটাও বদলায়নি
seo_* tables in DB          : NONE (এখনো তৈরি হয়নি)
rows w/ empty package path  : 34
```

কারণ সহজ — **কোনোবার `--apply` দেওয়া হয়নি।** `seo_*` টেবিলগুলো on-demand তৈরি হয়, প্রথম আসল run-এ।

## ১.৬ চালু করতে হলে

```bat
run_seo.bat --list-fallback                 :: read-only, কোনগুলো fallback দেখাবে
run_seo.bat --backfill-fallback             :: dry-run, কী লিখবে দেখাবে (কিছু লিখবে না)
run_seo.bat --backfill-fallback --apply     :: আসল লেখা; আগে DB backup নেবে
```

**প্রথমবার:** browser-এ একবার login করতে হবে (persistent Chrome profile — এরপর মনে রাখে)।

**অন্য useful flag:**

| Flag | কাজ |
|---|---|
| `--idea-id 34` | একটা idea |
| `--idea-ids 34,35,36` | নির্দিষ্ট কয়েকটা |
| `--limit 5` | প্রথমে অল্প কয়েকটা দিয়ে পরখ করা |
| `--force` | ইতিমধ্যে ভালো metadata থাকলেও আবার লিখবে |
| `--json` | machine-readable output |

**পরামর্শ:** প্রথমে `--limit 5` দিয়ে ৫টা করে দেখুন ফলাফল পছন্দ হচ্ছে কি না, তারপর পুরোটা।

---

# ২) `SUGGESTION_remediation_plan.md` — অবস্থা

ফাইলটার নিজের হেডারেই লেখা:

> **Status: PROPOSAL ONLY — nothing here has been applied.** (তারিখ 2026-08-24)

সেই অবস্থা **এখনো একই**। Plan থেকে কোনো data fix চালানো হয়নি।

ভেতরে আছে ৭টা finding + Prereq 0 (backup + NO-RETRY lock খোলার জন্য `--force-idea` re-export path), শেষে ৫টা decision-এর টেবিল।

## ২.১ Uniqueness audit যেগুলো স্বাধীনভাবে confirm করেছে

### Finding #1 — একই video একাধিক idea-তে

- Plan-এ লেখা ছিল ৪টা idea: **6, 8, 9, 33**
- Audit দেখাল সমস্যা আরও **বড়** — packaged ৩৪টা mp4-এর মধ্যে **৯টা byte-identical duplicate**
- ✅ **upstream কারণ fix করা হয়েছে** — `video/1Video10Sec/extension_bridge.py`-তে md5 dup-guard + atomic `.part` download বসানো হয়েছে, তাই **নতুন করে আর duplicate হবে না**
- ❌ যে ৯টা mp4 ইতিমধ্যে duplicate, সেগুলো **re-render হয়নি** — এর জন্য আসল Veo render দরকার

### Finding #4 — idea 35 আর 36-এর L2–L5 video prompt হুবহু এক

- ✅ `--novelty-scan` চালিয়ে `IDENTICAL_PROMPTS` verdict দিয়ে **re-confirm** হয়েছে
- ❌ **fix হয়নি** — কোন idea-র prompt সঠিক সেটা content judgment, আপনার সিদ্ধান্ত

### Finding #6 — generic "Forest Titan" prompt drift

- ✅ Audit-এ ধরা পড়ল ৭০টা level-10 prompt-এর মধ্যে **১০টা drift** করেছে (idea **33, 34, 37, 40, 41** — প্রতিটার image + video)
- ✅ Templates v2 + আজকের hook দুটো **নতুন drift আটকাবে**
- ❌ পুরোনো prompt গুলো **regenerate করা হয়নি**

## ২.২ যেগুলো একেবারেই ছোঁয়া হয়নি

| Finding | কী | কেন আটকে আছে |
|---|---|---|
| **#2** | idea 33/34/35-এর placeholder title | SEO engine-এর `--backfill-fallback` এটা ঠিক করত — কিন্তু apply করা হয়নি |
| **#3** | idea 1, 2, 3-এর JSON-এ পুরোনো prompt রয়ে গেছে | decision দরকার: re-export (A) না রেখে দেওয়া (B) |
| **#5** | idea 112-র DB-তে কোনো prompt নেই | তিন option: backfill / quarantine / drop |
| **#7** | খালি `video_file_path` / `package_folder_path` — **৩৫টার মধ্যে ৩৪টা row-এ `package_folder_path` খালি** | backfill script লেখা হয়নি |
| **Prereq 0** | `--force-idea` re-export path (NO-RETRY lock খোলার নিয়ন্ত্রিত উপায়) | বানানো হয়নি |

> **নোট:** Plan-এ finding #7-এ ২৮টা row লেখা ছিল; এইমাত্র চেক করে পেলাম ৩৪টা। Plan লেখার পর নতুন package যোগ হওয়ায় সংখ্যা বেড়েছে।

## ২.৩ কেন ৫টা decision আমি একা নিইনি

Plan-এর শেষ টেবিলের ৫টা সিদ্ধান্ত — প্রতিটার জন্যই হয় **আসল Veo render** লাগবে, নয়তো **"কোনটা সঠিক" এই content judgment** লাগবে:

1. ৯টা duplicate mp4 re-render করা হবে কি না
2. idea 1/2/3 — re-export না রেখে দেওয়া
3. idea 35 আর 36-এর মধ্যে কোনটার L2–L5 prompt সঠিক
4. idea 112 — backfill / quarantine / drop
5. Prereq 0-র `--force-idea` path বানানো হবে কি না

এগুলো code bug নয়, **product সিদ্ধান্ত**। আপনার প্রকল্পের নিয়ম অনুযায়ীও পুরোনো data নিজে থেকে বদলানো উচিত না।

---

# ৩) পরের ধাপ (আপনার পছন্দ অনুযায়ী)

**SEO চালু করতে:**

```bat
cd "C:\Users\Irak\Desktop\Youtube Pipeline\PromptDatabase"
run_seo.bat --list-fallback                          :: আগে দেখা
run_seo.bat --backfill-fallback --limit 5            :: dry-run, ৫টা
run_seo.bat --backfill-fallback --limit 5 --apply    :: ৫টা আসল, ফলাফল দেখুন
run_seo.bat --backfill-fallback --apply              :: সন্তুষ্ট হলে পুরোটা
```

**Uniqueness layer পরখ করতে (আজ wire করা হয়েছে):**

```bat
run_uniqueness.bat --status      :: WIRED / NOT WIRED + template version
run_uniqueness.bat --verify      :: self-test, সব check
```

**Remediation plan-এর কাজ শুরু করতে:** ওই ৫টা decision-এর উত্তর দিলে আমি সেই অনুযায়ী script লিখে dry-run দেখাব, তারপর আপনার সম্মতিতে apply করব।

**Git:** এখনো কিছুই commit করা হয়নি। বললে stage + commit করে দেব (push restricted, তাই push করব না)।

---

## Backup যেগুলো আছে

| ফাইল | কী |
|---|---|
| `prompt_chain_engine.py.bak_20260825_055248` | hook বসানোর আগের অবস্থা |
| `output_packaged/_backup_uniqueness/youtube_pipeline.db.bak_20260825_055318` | template v2 বসানোর আগের DB |

Revert করতে হলে:

```bat
run_uniqueness.bat --uninstall-hooks --apply       :: source byte-exact ফিরিয়ে দেবে
run_uniqueness.bat --rollback-templates --apply    :: v1 template আবার active
```
