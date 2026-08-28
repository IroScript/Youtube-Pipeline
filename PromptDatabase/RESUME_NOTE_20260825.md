# রিজিউম নোট — ২৫ আগস্ট ২০২৬, বিকাল

PC শাটডাউনের আগে যতটুকু হয়েছে এবং পরের বার ঠিক কোথা থেকে শুরু করতে হবে।

---

## এক লাইনে অবস্থা

Idea #1 "Rice Titan Harvester" এর **SEO স্টেজ সত্যিকারের ডেটা দিয়ে সম্পন্ন (DB-তে লেখা হয়েছে)**।
পরের স্টেজ **video** — এটার জন্য আসল Veo রেন্ডার দরকার, তাই ৫ মিনিটে শেষ করা যায়নি।

```
category  OK      element  OK      ideas  OK      escalation  OK
seo       OK  <-- এই টার্নে সম্পন্ন হলো
video     MISS <-- পরের বার এখান থেকে শুরু
package   MISS
```

---

## এই টার্নে যা যা হয়েছে

### ১. SEO স্টেজ — বাস্তবে চলেছে, DB আপডেট হয়েছে

কমান্ড: `python run_stage_pipeline.py --run --idea-id 1 --apply`

```
[harvest]  101 keywords, 36 competitors  (আসল YouTube suggest + SERP থেকে)
[score]    opportunity = 81/100  (demand=70 novelty=84 saturation=11) -> PUBLISH
[DB]       youtube_metadata action = replaced_fallback
title      Rice Titan Harvester — The Paddy Harvesting Machine You've Never Seen  (69 ch)
tags       15 টা (387 ch)
source     deterministic_fallback_keyword_grounded
```

- আগের সেই বয়লারপ্লেট `🚨 INSANE:` টাইটেল + খালি ডেসক্রিপশন **রিপ্লেস হয়ে গেছে**।
- DB ব্যাকআপ অটো নেওয়া হয়েছে: `output_packaged/_backup_seo/youtube_pipeline.db.bak_20260825_104808`
- পুরোনো ভ্যালুগুলো `content_history` টেবিলে সেভ আছে (রোলব্যাক সম্ভব)।

**একটা কথা খোলাসা করে বলি:** CloakBrowser → chatgpt.com লগইন হয়নি (৩ বার চেষ্টা করে
empty response), তাই LLM ব্রেইন ব্যবহার হয়নি। যেটা ব্যবহার হয়েছে সেটা
deterministic keyword-grounded প্যাকেজ — অর্থাৎ **আসল হারভেস্ট করা ডেটার উপর ভিত্তি করে,
বয়লারপ্লেট নয়**, কিন্তু LLM-পলিশও নয়। LLM চাইলে পরে একবার লগইন করে
`--run --idea-id 1 --apply` আবার চালালেই টাইটেল/ডেসক্রিপশন আপগ্রেড হবে।

### ২. video → package হ্যান্ডঅফের ফাঁকটা বন্ধ করা হয়েছে

**সমস্যাটা ছিল:** `pipeline_packager` mp4 খুঁজে পায় **শুধু** `GeneratedVideo.file_path`
(status="completed") দিয়ে। কিন্তু `extension_bridge` ওই টেবিলে কিছু লেখে না, আর যে ফাইলটা
লেখে (`run_single_video_pipeline.run_single_cycle()`) সেটাই YouTube আপলোড করে — যেটা আমরা
ইচ্ছে করে এড়িয়ে চলেছি। ফলে রেন্ডার হলেও প্যাকেজার `waiting_for_video` বলত।

**সমাধান (শুধু নতুন ফাইলে, পুরোনো কোডে হাত পড়েনি):**
`run_stage_pipeline.py`-তে নতুন `register_rendered_video()` ফাংশন যোগ করা হয়েছে; রেন্ডার
সফল হওয়ার পরপরই এটা `GeneratedVideo` রো insert/update করে। লজিকটা
`run_single_video_pipeline.py:115-134`-এর হুবহু নকল, শুধু আপলোড অংশ ছাড়া।

- ব্যাকআপ: `run_stage_pipeline.py.bak_20260825_1712`
- `pipeline_packager.py` বা অন্য কোনো পুরোনো ফাইল **এই কাজে বদলানো হয়নি**।

---

## পরের বার — ঠিক এই কমান্ডটা

```powershell
cd "C:\Users\Irak\Desktop\Youtube Pipeline\PromptDatabase"
.venv\Scripts\python.exe run_stage_pipeline.py --chain --idea-id 1 --apply
```

এটা করবে: video (আসল Veo রেন্ডার) → GeneratedVideo রো আপডেট → package (আসল SEO সহ
JSON এক্সপোর্ট)। সময় লাগবে আন্দাজ **১০-২০ মিনিট**, Chrome উইন্ডো খুলবে, হাত দেওয়ার দরকার নেই।

**YouTube-এ কিছু যাবে না** — `generate_single_video()` ডাকা হয়, `run_single_cycle()` নয়।
`config.json` অপরিবর্তিত (`auto_upload: true` ওখানেই আছে, কিন্তু ওই কোডপথ চলে না)।

### বিকল্প (রেন্ডার ছাড়া, ২ মিনিট) — শুধু package স্টেজ টেস্ট করতে

quarantine থেকে পুরোনো mp4 ফিরিয়ে এনে শুধু প্যাকেজিং যাচাই করা যায়:

```powershell
copy "archive\output_packaged_quarantine_20260825_1430\1.1.Level_10_Rice_Titan_Harvester\1.1.Level_10_Rice_Titan_Harvester.mp4" "..\video\1Video10Sec\Generated_Rice_Titan_Harvester_10Sec.mp4"
```
তারপর `--stages package` দিয়ে চালালে দেখা যাবে JSON-এ আসল SEO যাচ্ছে কিনা।
(তবে এটা তোমার চাওয়া "full real end-to-end" নয়, প্রম্পটও নতুন হবে না।)

---

## এখনো বাকি / সিদ্ধান্ত দরকার

1. **video + package স্টেজ কখনো বাস্তবে চলেনি** — শুধু dry-run হয়েছে। উপরের chain কমান্ড
   এখনো অপরীক্ষিত।
2. **quarantine ফোল্ডার** এখনো ডিলিট করা হয়নি: `archive/output_packaged_quarantine_20260825_1430`
   (৩৪ ফোল্ডার, ৩৩৫ MB)। নতুন পাইপলাইন প্রমাণিত হওয়ার পর তুমি বললে হার্ড ডিলিট করব।
   আপাতত এটাই একমাত্র ব্যাকআপ, তাই রেখে দেওয়া হয়েছে।
3. **কিছুই git commit করা হয়নি।** আন-কমিটেড: `stage_gates.py` (নতুন),
   `run_stage_pipeline.py` (নতুন), `uniqueness/offline.py` (নতুন),
   `pipeline_packager.py` (PACKAGER_REAL_SEO র‍্যাপ), `prompt_chain_engine.py`,
   `video/1Video10Sec/idea_prompt_generator.py`।
4. বাকি ৩৩ আইডিয়ার SEO এখনো বয়লারপ্লেট — idea #1 প্রমাণিত হলে
   `python -m seo_engine.cli backfill --apply` দিয়ে একবারে করা যাবে।

---

## ব্যাকআপগুলোর তালিকা (রোলব্যাক দরকার হলে)

```
PromptDatabase/stage_gates.py.bak_20260825_1631
PromptDatabase/pipeline_packager.py.bak_20260825_1635
PromptDatabase/run_stage_pipeline.py.bak_20260825_1712
PromptDatabase/output_packaged/_backup_seo/youtube_pipeline.db.bak_20260825_104808
PromptDatabase/archive/output_packaged_quarantine_20260825_1430/   (৩৪ ফোল্ডার)
```

## নতুন env গেটগুলো (ডিফল্টে সব বন্ধ, তাই পুরোনো আচরণ অপরিবর্তিত)

| env var | কাজ |
|---|---|
| `PACKAGER_REAL_SEO=1` | প্যাকেজার ভাঙা playwright-এর বদলে seo_engine ব্যবহার করবে |
| `ALLOW_OFFLINE_ESCALATION=1` | অফলাইন হার্ডকোডেড এস্কালেশন টেম্পলেট চালু (প্রোডাকশনে দেবে না) |
| `RENDER_SKIP_BROWSER=1` | রেন্ডারে ব্রাউজার স্কিপ |
| `UNIQUENESS_SPREAD` / `UNIQUENESS_VARIATION` | ভ্যারিয়েশন লেয়ার |
