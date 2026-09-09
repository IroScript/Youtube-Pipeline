# 🚨 ZERO-SKIP HARD LOCK — NO REQUIREMENT MAY BE SKIPPED, MERGED, DEFERRED OR SELF-EXCLUDED

তুমি এখন থেকে এই প্রজেক্টে কোনো “summary-based completion” গ্রহণ করবে না।

তোমার আগের রিপোর্টে গুরুতর contradiction পাওয়া গেছে:

- এক জায়গায় REQ-001 → REQ-097 = VERIFIED বলা হয়েছে।
- কিন্তু Master Verification Report-এ REQ-043 → REQ-097 = NOT STARTED দেখানো হয়েছে।
- ১১টি requirement-এর কোনো direct automated test ছিল না।
- কিছু requirement শুধুমাত্র file existence / mock / dry-run দিয়ে VERIFIED বলা হয়েছে।
- কিছু external integration live-tested হয়নি।

অতএব আগের কোনো “97/97 VERIFIED”, “100% COMPLETE”, “ZERO SKIP” বা “CHECKSUM 100%” claim আর evidence হিসেবে গ্রহণযোগ্য নয়।

---

# 🔴 ABSOLUTE EXECUTION RULES

## RULE 001 — 97 REQUIREMENTS ARE IMMUTABLE

REQ-001 থেকে REQ-097 পর্যন্ত **প্রতিটি requirement আলাদা entity হিসেবে বাধ্যতামূলক।**

তুমি কোনোভাবেই:

- requirement merge করতে পারবে না
- এক requirement-এর test দিয়ে অন্য requirement VERIFIED বলতে পারবে না
- phase-level completion দিয়ে individual requirement completion প্রমাণ করতে পারবে না
- file existence দিয়ে functional implementation VERIFIED বলতে পারবে না
- mock দিয়ে live integration VERIFIED বলতে পারবে না
- dry-run দিয়ে production execution VERIFIED বলতে পারবে না
- “similar requirement” বলে বাদ দিতে পারবে না
- “not necessary” বলে বাদ দিতে পারবে না
- “future enhancement” বলে বাদ দিতে পারবে না
- নিজের সিদ্ধান্তে requirement scope কমাতে পারবে না।

---

# 🔴 RULE 002 — SEQUENTIAL LOCK

REQ-001 → REQ-097 **ক্রম অনুসারে** কাজ করতে হবে।

বর্তমানে কোন requirement অসম্পূর্ণ থাকলে পরবর্তী requirement-এ চলে যাবে না।

উদাহরণ:

REQ-001 COMPLETE  
REQ-002 COMPLETE  
REQ-003 COMPLETE  
...

যতক্ষণ REQ-N সম্পূর্ণভাবে implement + test + verify না হবে, REQ-N+1 শুরু করা যাবে না।

---

# 🔴 RULE 003 — API-FIRST IS THE FIRST GATE

অত্যন্ত গুরুত্বপূর্ণ:

বর্তমান project কোনো FastAPI / REST API / API control-plane architecture-এর মধ্যে আবদ্ধ নয়।

তাই **প্রথম architectural objective হলো API foundation তৈরি করা।**

কিন্তু API বানানোর আগে existing functionality ধ্বংস করা যাবে না।

প্রথমে:

1. Current system inventory
2. Existing execution paths
3. Existing database access
4. Existing filesystem state
5. Existing browser/extension bridge
6. Existing CLI entry points
7. Existing external integrations

সম্পূর্ণ map করতে হবে।

তারপর:

8. Database abstraction
9. Repository layer
10. Service layer
11. FastAPI application
12. API routers
13. Existing pipeline → Service → API integration

এই dependency order ভাঙা যাবে না।

---

# 🔴 RULE 004 — NEVER CLAIM COMPLETION WITHOUT RUNTIME EVIDENCE

প্রতিটি requirement-এর জন্য নিচের ৫টি জিনিস বাধ্যতামূলক:

1. Implementation evidence
2. Exact file path
3. Exact function/class/module
4. Automated test
5. Runtime execution evidence

যদি live external dependency unavailable হয়, status হবে:

`BLOCKED_EXTERNAL_DEPENDENCY`

অথবা

`PARTIALLY_VERIFIED`

কখনোই:

`VERIFIED`

হবে না।

---

# 🔴 RULE 005 — MOCK ≠ VERIFIED

Mock test শুধুমাত্র internal logic পরীক্ষা করতে পারবে।

Mock দিয়ে কখনো:

LIVE VERIFIED
PRODUCTION VERIFIED
END-TO-END VERIFIED

লিখবে না।

---

# 🔴 RULE 006 — DRY RUN ≠ LIVE EXECUTION

`dry_run=true`

হলে সেটা শুধু:

`DRY_RUN_VERIFIED`

হিসেবে গণ্য হবে।

LIVE API / browser / YouTube / PostgreSQL / external service বাস্তবে execute না হলে LIVE VERIFIED লেখা নিষিদ্ধ।

---

# 🔴 RULE 007 — FILE EXISTENCE ≠ IMPLEMENTATION

কোনো `.py`, `.json`, `.md`, `.sql` file থাকা মানেই requirement implemented নয়।

উদাহরণ:

`openapi_contract.json` exists

এটি একা REQ-096 VERIFIED প্রমাণ করে না।

একইভাবে:

`benchmarking_report.md` exists

এটি একা REQ-097 VERIFIED প্রমাণ করে না।

---

# 🔴 RULE 008 — EVERY REQUIREMENT MUST HAVE A UNIQUE TEST

REQ-001 → REQ-097 পর্যন্ত প্রত্যেক requirement-এর জন্য অন্তত একটি identifiable verification method থাকতে হবে।

একটি test একাধিক requirement cover করতে পারে, কিন্তু ledger-এ প্রত্যেক requirement-এর:

- exact test name
- exact test file
- exact assertion
- expected result
- actual result

আলাদাভাবে উল্লেখ করতে হবে।

যে requirement-এর direct test নেই, সেটি VERIFIED লেখা নিষিদ্ধ।

---

# 🔴 RULE 009 — CREATE A REQUIREMENT LEDGER BEFORE IMPLEMENTATION

প্রথমে একটি immutable master ledger তৈরি করো:

`MASTER_097_REQUIREMENT_LEDGER.md`

এর মধ্যে ঠিক 97টি row থাকবে:

| ID | Requirement | Phase | Implementation | Test | Runtime Evidence | Status |
|----|-------------|-------|----------------|------|------------------|--------|
| REQ-001 | ... | ... | ... | ... | ... | ... |
...
| REQ-097 | ... | ... | ... | ... | ... | ... |

কোনো row বাদ যাবে না।

---

# 🔴 RULE 010 — STATUS ENUM IS LOCKED

শুধুমাত্র এই status ব্যবহার করতে পারবে:

- NOT_STARTED
- IN_PROGRESS
- IMPLEMENTED_UNVERIFIED
- TESTED_UNVERIFIED
- PARTIALLY_VERIFIED
- VERIFIED
- BLOCKED

`COMPLETED` বা `100% DONE` ব্যবহার করবে না যতক্ষণ না evidence threshold পূরণ হয়েছে।

---

# 🔴 RULE 011 — ZERO-SKIP CHECKSUM

প্রতিটি execution cycle-এর শেষে:

`VERIFIED + PARTIALLY_VERIFIED + IMPLEMENTED_UNVERIFIED + TESTED_UNVERIFIED + IN_PROGRESS + NOT_STARTED + BLOCKED = 97`

এই checksum অবশ্যই 97 হবে।

তারপর আলাদা করে:

`SKIPPED = 0`

প্রমাণ করতে হবে।

---

# 🔴 RULE 012 — NEVER HIDE UNVERIFIED WORK

যদি কোনো requirement:

- live dependency চায়
- API key চায়
- PostgreSQL server চায়
- browser login চায়
- YouTube quota চায়
- external network চায়
- hardware dependency চায়

তাহলে সেটিকে honest status দাও।

কিন্তু requirement বাদ দেবে না।

---

# 🔴 RULE 013 — EXISTING PROJECT MUST REMAIN FUNCTIONAL

Migration হবে:

`ADDITIVE → ADAPTER → MIGRATE → VERIFY → DEPRECATE`

হঠাৎ existing script delete/replace করা যাবে না।

বিশেষ করে:

- existing database
- existing SQLite data
- existing CLI
- existing browser bridge
- existing extension integration
- existing video generation
- existing SEO engine
- existing packaging
- existing audio pipeline

অকারণে পরিবর্তন/মুছে ফেলা নিষিদ্ধ।

---

# 🔴 RULE 014 — DATABASE SAFETY

`youtube_pipeline.db`

এর existing data কোনোভাবেই delete/truncate/reset করা যাবে না।

Migration-এর আগে:

1. Backup
2. SHA256
3. Row count
4. Table count
5. Schema snapshot

নিতে হবে।

---

# 🔴 RULE 015 — NO PHASE SKIPPING

Phase 0 → Phase 1 → Phase 2 → ... → Phase 12

কোনো phase skip করা যাবে না।

এক phase-এর মধ্যে requirement skip করাও নিষিদ্ধ।

---

# 🔴 RULE 016 — BEFORE EVERY MAJOR CHANGE

পরিবর্তনের আগে লিখবে:

### CURRENT STATE
### TARGET STATE
### FILES TO CHANGE
### FILES NOT TO CHANGE
### DATABASE IMPACT
### API IMPACT
### RISK
### ROLLBACK
### TEST PLAN
### REQUIREMENTS AFFECTED

তারপর implementation করবে।

---

# 🔴 RULE 017 — AFTER EVERY REQUIREMENT

প্রতিটি requirement শেষ করার পর:

1. implement
2. test
3. run
4. inspect output
5. verify
6. update ledger

তারপর পরবর্তী requirement-এ যাবে।

---

# 🔴 RULE 018 — NO BULK CLAIM

“REQ-043 → REQ-051 implemented”

এই ধরনের statement গ্রহণযোগ্য নয়।

প্রতিটি requirement individually report করতে হবে:

`REQ-043 — VERIFIED`
`REQ-044 — VERIFIED`
`REQ-045 — VERIFIED`

ইত্যাদি।

---

# 🔴 RULE 019 — NO SELF-AUTHORIZED DEFERMENT

তুমি নিজে থেকে কখনো বলবে না:

“এটি পরে করা হবে।”

যদি dependency না থাকে:

`BLOCKED`

যদি implementation আছে কিন্তু live proof নেই:

`PARTIALLY_VERIFIED`

কিন্তু requirement ledger থেকে সরানো যাবে না।

---

# 🔴 RULE 020 — DO NOT TRUST PREVIOUS REPORTS

আগের:

- FORENSIC_AUDIT_REPORT
- MASTER_VERIFICATION_REPORT
- MASTER_097_REQUIREMENT_LEDGER
- checksum
- “97/97”
- “89 tests passed”
- “100% verified”

কোনোটিই unquestioned truth হিসেবে গ্রহণ করবে না।

প্রতিটি claim filesystem/runtime evidence দিয়ে পুনরায় যাচাই করবে।

---

# 🔴 RULE 021 — CURRENT ARCHITECTURE PRIORITY

Final architecture:

`Client/UI`
↓
`FastAPI`
↓
`Service Layer`
↓
`Repository Layer`
↓
`Database`

External systems:

`FastAPI/Service`
↓
`Infrastructure Adapters`
↓
`Browser / Flow / Veo / YouTube / LLM / Media`

কোনো business logic সরাসরি HTTP router-এ রাখা যাবে না।

কোনো repository সরাসরি browser/API call করবে না।

কোনো domain logic CLI-এর ওপর নির্ভর করবে না।

---

# 🔴 RULE 022 — API FOUNDATION MUST NOT BE BYPASSED

যেহেতু বর্তমান project API-first নয়, তাই API layer তৈরি করাই architectural migration-এর প্রথম critical milestone।

কিন্তু শুধু empty FastAPI app তৈরি করাকে API migration বলা যাবে না।

API-কে বাস্তব existing services-এর সাথে যুক্ত করতে হবে এবং runtime-এ database ও pipeline-এর সাথে কাজ করাতে হবে।

---

# 🔴 RULE 023 — FINAL ACCEPTANCE CRITERIA

Project তখনই:

`FULLY VERIFIED`

হবে যখন:

- REQ-001 থেকে REQ-097 পর্যন্ত 97/97 individually accounted
- 0 skipped
- 0 hidden
- 0 silently deferred
- প্রত্যেক requirement-এর implementation evidence আছে
- প্রত্যেক requirement-এর verification evidence আছে
- critical integrations live-tested
- existing pipeline regression test passed
- API runtime tested
- database integrity verified
- migration safety verified
- worker crash/recovery tested
- idempotency tested
- E2E pipeline tested
- OpenAPI contract validated
- performance benchmark actually executed

তার আগে “100% complete” লেখা নিষিদ্ধ।

---

# 🔥 IMMEDIATE ACTION — DO NOT IMPLEMENT YET

এখনই নতুন code লেখা শুরু করবে না।

প্রথমে ONLY এই কাজ করো:

### STEP A
Existing 097-requirement specification পুনরায় পড়ো।

### STEP B
প্রতিটি REQ-001 → REQ-097 filesystem/code/test evidence-এর সাথে মিলাও।

### STEP C
একটি নতুন:

`ZERO_SKIP_REAUDIT_097.md`

তৈরি করো।

### STEP D
প্রতিটি requirement-এর status individually নির্ধারণ করো।

### STEP E
বিশেষভাবে identify করো:

- missing implementation
- missing test
- mock-only verification
- dry-run-only verification
- file-existence-only verification
- runtime-unverified implementation
- live-external-unverified integration
- contradictory previous claims

### STEP F
শেষে আমাকে শুধু এই format-এ report দাও:

```text
ZERO-SKIP RE-AUDIT RESULT

Total Requirements: 97
VERIFIED: X
PARTIALLY_VERIFIED: X
IMPLEMENTED_UNVERIFIED: X
TESTED_UNVERIFIED: X
IN_PROGRESS: X
NOT_STARTED: X
BLOCKED: X
SKIPPED: 0

CHECKSUM: X + X + X + X + X + X + X = 97

CONTRADICTIONS FOUND: X
MISSING TESTS: X
MOCK/DRY-RUN ONLY: X
LIVE VERIFICATION MISSING: X

NEXT REQUIREMENT:
REQ-XXX

NEXT ACTION:
...

DO NOT IMPLEMENT ANYTHING BEYOND THE NEXT REQUIREMENT.
```

### FINAL COMMAND

**এখন কোনো requirement skip করবে না। কোনো requirement merge করবে না। কোনো requirement নিজে থেকে defer করবে না। কোনো previous completion claim বিশ্বাস করবে না। প্রথমে REQ-001 → REQ-097 সম্পূর্ণ re-audit করবে। তারপর শুধুমাত্র সর্বপ্রথম অসম্পূর্ণ requirement-এ কাজ করবে।**