দেখো, বর্তমানে system কাজ করছে এবং existing functionality ঠিক আছে। **Existing working functionality, architecture, API, workflow, fallback, integration, naming convention বা successful behavior অকারণে rewrite/remove/change করবে না।** তোমার কাজ হলো existing system-কে **production-grade stability, verification, consistency, resumability এবং failure-prevention level-এ upgrade করা**, মূল business logic নষ্ট না করে।

## 1. CORE ARCHITECTURE RULE

**STRICT RULE: সব orchestration, state checking, status checking, dependency checking, generation triggering, validation, switching, upload triggering এবং pipeline control REST API-এর মাধ্যমে হবে।**

WebSocket, frontend-only state, stale CSV state, local UI state বা manually cached state-কে source of truth হিসেবে ব্যবহার করা যাবে না।

Database হবে **single source of truth**।

যে কোনো video/file/path বর্তমানে filesystem-এ আছে কি না, সেটা প্রয়োজন হলে filesystem দিয়ে verify করা যাবে; কিন্তু pipeline-এর logical state অবশ্যই database/API state থেকে নির্ধারিত হবে।

---

# 2. PRIMARY PIPELINE LOGIC

একটি row/video শুধুমাত্র তখনই পরবর্তী stage-এ যাবে যখন তার আগের সব required dependency **verified complete**।

মূল dependency chain:

**Prompt Data → SEO Data → Video Generation → Video Exists/Verified → Upload → Upload Verified → Schedule/Final State**

কোনো dependency missing থাকলে পরবর্তী stage কখনো trigger করা যাবে না।

উদাহরণ:

### Video 1.2

যদি:

- Prompt 1.2 = EXISTS + VALID
- SEO 1.2 = EXISTS + VALID
- Video 1.2 = EXISTS + VALID

তাহলে 1.2 complete।

এরপর system automatically **next required video = 1.3** খুঁজবে।

---

# 3. NEXT VIDEO SWITCHING RULE

ধরো:

`1.2.Level_10_The_Paddy_Ocean_Vacuum`

ভিডিওটি already exists।

তাহলে system অবশ্যই database এবং filesystem উভয় দিক verify করে determine করবে:

**1.2 complete → NEXT TARGET = 1.3**

তারপর:

### Step A
1.3 record/data আছে কি না check করবে।

### Step B
1.3 prompt data আছে কি না check করবে।

### Step C
Prompt missing হলে আগে prompt generation/repair process চালাবে।

### Step D
Prompt generation complete হওয়ার পর database insertion verify করবে।

### Step E
Insertion successful এবং data valid হলে আবার verification করবে।

### Step F
তারপর SEO data check করবে।

### Step G
SEO missing হলে আগে SEO generation করবে।

### Step H
SEO database-এ successfully inserted হয়েছে কি না verify করবে।

### Step I
Prompt + SEO উভয়ই valid verified হলে তবেই video generation request trigger করবে।

### Step J
Video generation request successfully accepted হয়েছে কি না verify করবে।

### Step K
Generated video সত্যিই filesystem/database state-এ available হয়েছে কি না verify করবে।

### Step L
তারপরই upload stage trigger হবে।

**কোনো stage missing থাকলে পরবর্তী stage-এ jump করা যাবে না।**

---

# 4. ZERO-BLANK RULE — ABSOLUTE

এটি সবচেয়ে কঠোর rule।

**কোথাও blank/null/missing/incomplete required data থাকা অবস্থায় system কখনো next stage-এ যাবে না।**

যদি একটি row-তে 500টি cell/field থাকে এবং:

- 499টি filled
- মাত্র 1টি blank

তবুও সেই row **COMPLETE নয়**।

System আগে ওই missing cell-এর dependency resolve করবে।

তারপর পুনরায় পুরো row validate করবে।

শুধুমাত্র:

**500/500 required fields VALID**

হলে row complete হিসেবে ধরা হবে।

এই rule:

- prompt data
- SEO data
- metadata
- file path
- UUID
- generation state
- upload state
- schedule state
- validation state
- timestamps
- references
- foreign keys
- required configuration

সবকিছুর ক্ষেত্রে প্রযোজ্য।

---

# 5. ROW-BY-ROW EXECUTION RULE

**STRICTLY SEQUENTIAL ROW PROCESSING.**

Row 1 incomplete হলে Row 2-এ যাওয়া যাবে না।

উদাহরণ:

### Row 1
500 fields-এর মধ্যে 1টি missing।

→ আগে সেই 1টি fill করবে  
→ তারপর Row 1-এর সম্পূর্ণ 500 fields আবার validate করবে  
→ Row 1 = VERIFIED COMPLETE  
→ তারপর Row 2

### Row 2
30টি field missing।

→ আগে সব 30টি resolve করবে  
→ Row 2-এর পুরো dataset আবার validate করবে  
→ Row 2 = VERIFIED COMPLETE  
→ তারপর Row 3

**একটি row incomplete অবস্থায় কখনো next row-এ switch করা যাবে না।**

---

# 6. ALL DATABASE TABLES RULE

Database-এ যদি 300টি table থাকে, relevant pipeline processing-এর সময় system প্রতিটি applicable table-এর consistency/dependency check করবে।

কিন্তু validation করার সময় random jumping করবে না।

প্রতিটি applicable dataset/table-এর মধ্যে:

**Row-by-row → dependency-by-dependency → validation → completion → next row**

এই sequence অনুসরণ করবে।

যেখানে relational dependency রয়েছে সেখানে UUID/primary key/foreign key ব্যবহার করে data identity নিশ্চিত করবে।

একই logical record-এর identity কখনো filename-এর উপর নির্ভর করবে না।

---

# 7. UUID / IDENTITY RULE

যেখানে possible এবং architecture অনুযায়ী appropriate, logical entity tracking-এর জন্য:

**UUID / immutable unique ID**

ব্যবহার করবে।

Filename পরিবর্তন হলেও logical identity যেন নষ্ট না হয়।

Example:

`video_uuid = X`

এর সঙ্গে:

- prompt
- SEO
- generation request
- generated file
- upload attempt
- upload result
- schedule state

সব relationship traceable হতে হবে।

Filename/path পরিবর্তন হলেও UUID দিয়ে record trace করা সম্ভব হতে হবে।

---

# 8. VIDEO PATH RULE

বর্তমান naming pattern যেমন:

`1.2.Level_10_The_Paddy_Ocean_Vacuum`

বর্তমান working naming convention অকারণে পরিবর্তন করবে না।

REST API implementation যেন existing naming convention break না করে।

কিন্তু logical state detection শুধুমাত্র filename-এর উপর নির্ভর করবে না।

System verify করবে:

1. Database record আছে কি না
2. UUID match করছে কি না
3. Expected video version/sequence match করছে কি না
4. Expected prompt/SEO dependency complete কি না
5. Expected file path resolve করছে কি না
6. File বাস্তবে exist করছে কি না
7. File valid/usable কি না
8. Database state এবং filesystem state একে অপরের সঙ্গে consistent কি না

---

# 9. LIVE STATE / STALE STATE PREVENTION

বর্তমান CSV বা কোনো stale snapshot থেকে pipeline state নির্ধারণ করা যাবে না।

যদি video delete করা হয়:

System পুনরায় API/database/filesystem check করে বুঝবে:

`video exists = FALSE`

এবং সেই অনুযায়ী state recalculate করবে।

পুরনো cached path/state ধরে রাখতে পারবে না।

প্রয়োজনে status endpoint/database query দিয়ে fresh state fetch করবে।

**Every important transition must be based on fresh state verification.**

---

# 10. GENERATION GUARD

একই video-এর জন্য duplicate generation request চলতে পারবে না।

ধরো:

1.3 generation ইতিমধ্যে processing অবস্থায় আছে।

তাহলে second request পাঠানো যাবে না।

System আগে check করবে:

- existing generation job আছে কি না
- status = pending/running/completed/failed কি না
- existing request ID/job ID আছে কি না
- video ইতিমধ্যে generated হয়েছে কি না
- retry করা বৈধ কি না

তারপর সিদ্ধান্ত নেবে।

---

# 11. NO DUPLICATE EXECUTION RULE

**একই logical action একই সময়ে একাধিকবার execute করা যাবে না।**

বিশেষ করে:

- prompt generation
- SEO generation
- video generation
- upload
- schedule
- retry
- database insertion

সবকিছুর আগে idempotency/state check থাকবে।

একই request accidental double-click, duplicate API call, refresh, timeout retry বা parallel process-এর কারণে duplicate হলে system সেটি prevent করবে।

---

# 12. INSERTION VALIDATION

ChatGPT/Claude/Browser automation থেকে generated data পাওয়ার পর শুধু database-এ insert করলেই success ধরা যাবে না।

Sequence হবে:

**Generate → Receive → Parse → Validate → Insert/Update → Read Back → Validate Again → Mark VERIFIED**

Database read-back validation ছাড়া stage complete হিসেবে mark করা যাবে না।

---

# 13. PROMPT.JSON / SEO.JSON RULE

প্রতিটি video folder-এর ক্ষেত্রে database থেকে required data query করে:

`prompt.json`

এবং

`seo.json`

generate/refresh করা হবে।

কিন্তু file generate হয়েছে বলেই data valid ধরে নেওয়া যাবে না।

প্রতিটি file-এর জন্য:

**DB data → JSON generation → JSON validation → DB consistency check**

করতে হবে।

Required field missing থাকলে JSON valid হিসেবে গণ্য হবে না।

---

# 14. VIDEO GENERATION GATE

Video generation-এর আগে hard gate থাকবে।

Video generate request শুধুমাত্র তখনই allowed হবে যখন:

```text
Prompt = PRESENT
Prompt = VALID
Prompt = DATABASE VERIFIED

SEO = PRESENT
SEO = VALID
SEO = DATABASE VERIFIED

Target Row = COMPLETE
Target UUID = VERIFIED
Duplicate Job = FALSE
Existing Valid Video = FALSE
```

উপরের যেকোনো একটি false হলে:

**DO NOT GENERATE VIDEO**

আগে missing dependency repair করবে।

---

# 15. EXACT EXAMPLE

ধরো:

### 1.2
Prompt = YES  
SEO = YES  
Video = YES

→ COMPLETE

তারপর:

### 1.3
Prompt = YES  
SEO = NO  
Video = NO

System:

**Prompt skip করবে।**

কারণ prompt already verified।

তারপর:

**SEO generation trigger করবে।**

SEO successfully generated হলে:

**Database insertion → read-back → validation**

তারপর SEO = VERIFIED হলে:

**Video generation request trigger করবে।**

Video generation complete হলে:

**filesystem + database verification**

তারপর:

**Upload trigger**

Upload complete হলে:

**Upload status verification**

তারপরই 1.4-এ switch করবে।

---

# 16. FAILURE HANDLING

কোনো stage fail করলে system silently next stage-এ যাবে না।

Example:

Prompt generation failed:

`PROMPT_FAILED`

তাহলে SEO বা video generation trigger করা যাবে না।

SEO failed:

`SEO_FAILED`

তাহলে video generation trigger করা যাবে না।

Video generation failed:

`VIDEO_FAILED`

তাহলে upload trigger করা যাবে না।

Upload failed:

`UPLOAD_FAILED`

তাহলে next logical state-এ এগোনো যাবে না।

---

# 17. SAFE PAUSE SYSTEM

System-এ **safe pause** থাকতে হবে।

Pause হলে নতুন কাজ initiate করবে না।

কিন্তু বর্তমানে running operation-এর state safely record করবে।

System restart হলে:

**resume from verified state**

করবে।

যা already complete হয়েছে সেটা আবার generate করবে না।

যা incomplete সেটা detect করে সেখান থেকেই resume করবে।

---

# 18. CRASH RECOVERY

যে কোনো মুহূর্তে:

- application crash
- browser crash
- API timeout
- computer restart
- network failure
- process termination
- Antigravity interruption

হলেও system যেন state হারিয়ে না ফেলে।

Restart করার পর:

**Database → current state → dependency scan → filesystem verification → resume**

করবে।

---

# 19. STATE MACHINE

প্রতিটি video/row-এর lifecycle explicit state হিসেবে track করবে।

Example:

```text
DISCOVERED
PROMPT_MISSING
PROMPT_GENERATING
PROMPT_VERIFYING
PROMPT_COMPLETE

SEO_MISSING
SEO_GENERATING
SEO_VERIFYING
SEO_COMPLETE

READY_FOR_VIDEO
VIDEO_GENERATING
VIDEO_VERIFYING
VIDEO_COMPLETE

READY_FOR_UPLOAD
UPLOADING
UPLOAD_VERIFYING
UPLOAD_COMPLETE

READY_FOR_SCHEDULE
SCHEDULED
COMPLETE
```

Failure state আলাদাভাবে থাকবে।

এক state থেকে অন্য state-এ transition-এর জন্য explicit validation condition থাকবে।

---

# 20. NO SILENT FALLBACK

কোনো verification fail করলে system নিজের মতো করে ধরে নেবে না যে কাজটি complete।

Example:

API timeout ≠ success

HTTP response পাওয়া ≠ business success

Database insert command execute হওয়া ≠ insertion verified

File path পাওয়া ≠ file exists verified

Upload request পাঠানো ≠ upload completed

সব ক্ষেত্রে **post-action verification বাধ্যতামূলক।**

---

# 21. EVERY ACTION = VERIFY

প্রতিটি গুরুত্বপূর্ণ action-এর pattern হবে:

```text
CHECK
→ ACT
→ VERIFY
→ RE-CHECK
→ COMMIT STATE
→ MOVE NEXT
```

Verification fail হলে:

```text
DO NOT MOVE NEXT
```

---

# 22. NEXT TARGET DISCOVERY

System manually hardcoded “next video” ধরে নেবে না।

Database + sequence + completion status দেখে determine করবে:

**current completed item → first incomplete valid next item**

এবং তার dependency scan করবে।

অর্থাৎ 1.2 complete হলেও যদি 1.3-এর কোনো required prerequisite incomplete থাকে, system 1.3-এর missing dependency resolve করবে।

---

# 23. ONE-CLICK FULL PIPELINE

Final objective:

একটি valid initial trigger থেকে system নিজেই:

```text
Discover
→ Verify Row
→ Fill Missing Prompt
→ Verify Prompt
→ Fill Missing SEO
→ Verify SEO
→ Generate Video
→ Verify Video
→ Upload
→ Verify Upload
→ Move Next
→ Repeat
```

করবে।

তবে কোনো stage-এর dependency incomplete থাকলে automatic progression বন্ধ হবে এবং প্রথমে সেই dependency repair হবে।

---

# 24. NEVER BREAK WORKING SYSTEM

Existing system বর্তমানে যেগুলো successfully করে:

- Cloak Browser
- browser-based ChatGPT
- prompt generation
- 10-level escalation system
- Level 10 video-generation input
- SEO generation
- Veo extension
- database
- filesystem
- existing naming
- existing working integrations
- upload process

এসব **remove/rewrite/refactor-for-no-reason করা যাবে না।**

প্রথমে existing behavior preserve করবে।

তারপর stability/control/verification layer improve করবে।

---

# 25. TESTING REQUIREMENT

শুধু code review করে শেষ করবে না।

প্রতিটি critical path বাস্তবে test করবে।

বিশেষ করে test করবে:

### Test A
1.2 exists → 1.3 correctly selected?

### Test B
1.3 prompt missing → prompt generated?

### Test C
1.3 SEO missing → SEO generated?

### Test D
Prompt missing রেখে video generation আটকানো হয়?

### Test E
SEO missing রেখে video generation আটকানো হয়?

### Test F
Video deleted → stale path detect হয়?

### Test G
Video missing → regeneration required detect হয়?

### Test H
Duplicate generation request আটকায়?

### Test I
Database insert-এর পর read-back verification হয়?

### Test J
Upload request-এর পর upload সত্যিই complete হয়েছে কি না verify হয়?

### Test K
Pause করলে নতুন duplicate process শুরু হয় না?

### Test L
Restart-এর পর correct state থেকে resume হয়?

### Test M
একটি row-তে 1টি blank থাকলে next row-তে যাওয়া বন্ধ থাকে?

### Test N
একটি row-তে 30টি blank থাকলে সব 30টি resolve না হওয়া পর্যন্ত next row-এ যায় না?

### Test O
Multiple tables-এর applicable records sequentially process হয়?

---

# 26. TEST → VERIFY → TEST AGAIN LOOP

এখানেই বিশেষ গুরুত্ব।

একবার test করে “works” বলবে না।

Critical issue পাওয়া গেলে:

**Fix → Re-test → Verify → Regression Test → Re-verify**

চলবে।

একটি change অন্য working function ভেঙে দিয়েছে কি না সেটাও test করবে।

---

# 27. REGRESSION PROTECTION

নতুন stability layer implement করার পরে পুরনো successful behavior verify করবে।

বিশেষ করে:

- existing prompt generation
- existing SEO generation
- Level 10 escalation flow
- video generation trigger
- output path
- database insertion
- upload
- next-item switching

কোনোটিই regression করেছে কি না verify করবে।

---

# 28. PRODUCTION-GRADE DEFINITION OF DONE

কাজ complete বলা যাবে না যতক্ষণ না:

```text
[✓] No required blank
[✓] No duplicate execution
[✓] No stale state dependency
[✓] Fresh state verification
[✓] Row-by-row processing
[✓] Dependency-aware progression
[✓] UUID/identity consistency
[✓] Database/filesystem consistency
[✓] Prompt verification
[✓] SEO verification
[✓] Video existence verification
[✓] Upload verification
[✓] Safe pause
[✓] Crash recovery
[✓] Resume capability
[✓] Idempotent execution
[✓] Regression testing
[✓] Next-video switching verified
```

---

# 29. VERY IMPORTANT OPERATING INSTRUCTION

**কোনো বিষয় skip করবে না।**

একটি সম্ভাব্য ছোট inconsistency-ও investigate করবে।

“Probably works”, “looks fine”, “should work”, “likely okay” ধরনের assumption দিয়ে validation শেষ করবে না।

যেখানে verify করা সম্ভব, সেখানে বাস্তবে verify করবে।

যেখানে state mismatch পাওয়া যায়, root cause খুঁজবে।

---

# 30. SESSION INSTRUCTION

এই পুরো কাজকে একটি **continuous engineering validation session** হিসেবে চালাও।

প্রায় **১ ঘণ্টার equivalent deep test-and-verify session** চালাবে।

এই সময়:

**Inspect → Test → Verify → Fix → Retest → Regression Test → Re-verify**

loop চালিয়ে যাবে।

বিশেষ গুরুত্ব:

**blank prevention  
duplicate prevention  
state consistency  
next-video switching  
row-by-row execution  
dependency enforcement  
safe pause  
crash recovery  
REST API control**

প্রতিটি critical path multiple times verify করবে।

শুধু code modify করে থেমে যাবে না।

---

# FINAL RULE

সবচেয়ে গুরুত্বপূর্ণ execution rule:

```text
NO BLANK
NO DUPLICATE
NO SKIP
NO PREMATURE NEXT STEP
NO UNVERIFIED SUCCESS
NO STALE STATE
NO ROW JUMP
NO NEXT ROW BEFORE CURRENT ROW COMPLETE
NO VIDEO GENERATION BEFORE PROMPT + SEO VERIFIED
NO UPLOAD BEFORE VIDEO VERIFIED
NO NEXT VIDEO BEFORE CURRENT VIDEO STATE VERIFIED
```

এবং সব orchestration/control **REST API-driven** হবে।

**Existing working system preserve করে এটিকে production-grade deterministic pipeline হিসেবে implement, test, verify এবং harden করো।**