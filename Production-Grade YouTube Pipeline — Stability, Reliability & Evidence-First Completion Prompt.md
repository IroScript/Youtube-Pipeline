# PRODUCTION-GRADE YOUTUBE PIPELINE
## Stability + Reliability + Recovery + Sequential Execution + Evidence-First Completion

তুমি এখন একটি existing YouTube Pipeline codebase-এ কাজ করবে।

তোমার একমাত্র লক্ষ্য:

> **Production-ready stable pipeline + stable retry + stable pause/resume + duplicate prevention + crash recovery + zero-blank + strict sequential execution + এবং প্রতিটির বাস্তব executable proof।**

---

# 0. ABSOLUTE RULE — READ FIRST

এই কাজের ক্ষেত্রে:

> **CLAIM ≠ PROOF**

শুধু code লেখা, function থাকা, unit test pass করা বা dry-run সফল হওয়া মানেই কোনো requirement PROVEN নয়।

কোনো requirement-কে:

- IMPLEMENTED
- VERIFIED
- PROVEN
- PRODUCTION READY
- COMPLETE

বলবে না, যতক্ষণ না তার corresponding বাস্তব evidence আছে।

প্রতিটি critical requirement-এর জন্য অবশ্যই দেখাতে হবে:

1. Requirement ID
2. Exact implementation file
3. Exact class/function
4. Exact behavior
5. Test scenario
6. Exact command
7. Actual command output
8. PASS/FAIL verdict
9. Remaining limitation, যদি থাকে

---

# 1. DO NOT BREAK EXISTING WORKING SYSTEM

বর্তমান system-এর:

- existing business logic
- existing architecture
- existing API
- existing workflow
- existing naming convention
- existing fallback
- existing integration
- existing database structure
- existing successful behavior

অকারণে rewrite, remove বা replace করবে না।

তোমার কাজ নতুন architecture বানানো নয়।

তোমার কাজ:

> **Existing working system-কে stability, consistency, reliability, resumability এবং failure-prevention level-এ upgrade করা।**

কোনো existing behavior পরিবর্তনের আগে:

1. inspect করবে
2. dependency বুঝবে
3. কেন পরিবর্তন দরকার তা identify করবে
4. regression risk দেখবে
5. তারপর minimum safe change করবে

---

# 2. SOURCE OF TRUTH

Pipeline-এর logical state-এর source of truth হবে:

> **Database + REST API**

নিচের কোনো কিছুকে source of truth হিসেবে ব্যবহার করবে না:

- WebSocket state
- frontend-only state
- local UI state
- stale CSV
- manually cached state
- filename-only detection

Filesystem শুধুমাত্র actual file existence/validity যাচাইয়ের জন্য ব্যবহার করা যাবে।

Logical pipeline state database/API থেকে নির্ধারিত হবে।

---

# 3. PRIMARY PIPELINE DEPENDENCY

Strict dependency chain:

```text
PROMPT
   ↓
SEO
   ↓
VIDEO GENERATION
   ↓
VIDEO FILE VERIFICATION
   ↓
UPLOAD
   ↓
UPLOAD VERIFICATION
   ↓
SCHEDULE / FINAL STATE
```

Rule:

> আগের required dependency VERIFIED না হলে পরবর্তী stage execute করা যাবে না।

উদাহরণ:

```text
Prompt = VERIFIED
SEO = MISSING
Video = MISSING
```

Expected:

```text
Prompt generation = SKIPPED
SEO generation = REQUIRED
Video generation = BLOCKED
```

SEO VERIFIED হওয়ার পরে:

```text
Prompt = VERIFIED
SEO = VERIFIED
Video = MISSING
```

Expected:

```text
Video generation = ALLOWED
```

---

# 4. STRICT ROW-BY-ROW EXECUTION

Pipeline strictly sequential হবে।

ধরো:

```text
Row 1 = incomplete
Row 2 = complete
Row 3 = incomplete
```

System:

```text
Row 1
 ↓
repair missing data
 ↓
full validation
 ↓
VERIFIED
 ↓
Row 2
```

Row 1 incomplete থাকা অবস্থায়:

```text
Row 2 MUST NOT START
```

একটি row complete না হওয়া পর্যন্ত next row processing করা যাবে না।

---

# 5. ZERO-BLANK RULE

Required field-এর ক্ষেত্রে একটি মাত্র blank থাকলেও row complete নয়।

উদাহরণ:

```text
Required fields = 500
Valid = 499
Missing = 1
```

Expected:

```text
ROW = INCOMPLETE
NEXT STAGE = BLOCKED
NEXT ROW = BLOCKED
MISSING FIELD = IDENTIFIED
```

Optional / nullable field-কে ভুলভাবে required হিসেবে গণ্য করবে না।

প্রথমে schema-aware classification তৈরি করবে:

```text
required
optional
nullable
derived
system-generated
```

তারপর validation করবে।

---

# 6. ZERO-BLANK TESTS

অবশ্যই বাস্তব runtime test তৈরি করবে।

## ZB-01 — One Missing Required Field

একটি test row তৈরি/ব্যবহার করো যেখানে:

```text
required fields = N
missing = exactly 1
```

Expected:

```text
row incomplete
missing field identified
next stage blocked
next row blocked
```

---

## ZB-02 — Many Missing Required Fields

একটি test row-তে:

```text
missing = 30
```

Expected:

```text
all 30 detected
all missing fields individually identified
repair performed
full row revalidated
only after full validation row becomes eligible
```

---

## ZB-03 — Sequential Blank Blocking

বাস্তব test:

```text
Row N = incomplete
Row N+1 = complete
```

Row N incomplete অবস্থায় Row N+1 processing trigger করার চেষ্টা করবে।

Expected:

```text
Row N+1 MUST NOT START
```

তারপর Row N repair করবে।

Expected:

```text
Row N = VERIFIED
Row N+1 = NOW ELIGIBLE
```

---

# 7. NEXT TARGET SWITCHING

System অবশ্যই database-এর fresh state ব্যবহার করে next incomplete target discover করবে।

উদাহরণ:

```text
1.2 = Prompt ✓
      SEO ✓
      Video ✓
      Package ✓

1.3 = Prompt ✓
      SEO ✓
      Video ✗
      Package ✗
```

Expected:

```text
CURRENT COMPLETE = 1.2
NEXT TARGET = 1.3
```

Filename দিয়ে শুধু সিদ্ধান্ত নেবে না।

Database + filesystem consistency যাচাই করবে।

---

# 8. DUPLICATE GENERATION PREVENTION

একই logical video-এর জন্য duplicate generation চলতে পারবে না।

এই protection থাকতে হবে:

```text
prompt generation
SEO generation
video generation
upload
schedule
retry
database insertion
```

সব critical action-এর আগে:

```text
active job?
pending job?
running job?
completed?
failed?
retry allowed?
existing valid output?
same logical entity?
same UUID?
```

check করবে।

---

# 9. CONCURRENCY PROOF — MANDATORY

Sequential double-call গ্রহণযোগ্য নয়।

বাস্তব concurrent test করতে হবে।

Example:

```text
10 concurrent requests
same idea
same logical action
```

Expected:

```text
Thread 1 = LOCK WON
Thread 2 = BLOCKED
Thread 3 = BLOCKED
...
Thread 10 = BLOCKED

Lock winners = 1
```

অথবা equivalent:

```text
Request A = ACCEPTED
Request B = REJECTED
Generated jobs = EXACTLY 1
```

Test অবশ্যই real database-এর বিরুদ্ধে concurrent execution দিয়ে করতে হবে।

---

# 10. ATOMICITY

যদি generation guard থাকে, সেটি race-condition-safe হতে হবে।

এই pattern গ্রহণযোগ্য নয়:

```text
if no_active_job:
    create_job()
```

যদি দুই process একই সময়ে check করতে পারে।

Atomic DB-level protection / CAS / unique constraint / transaction-safe mechanism ব্যবহার করবে।

তারপর concurrency test দিয়ে প্রমাণ করবে।

---

# 11. STABLE RETRY

Retry logic deterministic হতে হবে।

Example:

```text
MAX_RETRIES = 3
```

Expected:

```text
retry_count = 0 → retry allowed
retry_count = 1 → retry allowed
retry_count = 2 → retry allowed
retry_count = 3 → retry blocked
```

Permanent error:

```text
ERROR → retry blocked
```

Retry-এর সময়:

- duplicate job তৈরি করা যাবে না
- previous state নষ্ট করা যাবে না
- retry count ভুলভাবে reset করা যাবে না
- successful output থাকলে পুনরায় generation করা যাবে না
- correct stage থেকে resume করতে হবে

---

# 12. RETRY FAILURE-INJECTION TEST

ইচ্ছাকৃতভাবে generation failure তৈরি করবে।

Example:

```text
PROMPT_GENERATING
→ injected failure
```

Expected:

```text
PROMPT_FAILED
retry_count incremented
next stage blocked
```

Retry করলে:

```text
PROMPT_FAILED
→ retry
→ PROMPT_GENERATING
→ success
→ PROMPT_COMPLETE
```

তারপর verify করবে:

```text
SEO may proceed
```

---

# 13. PAUSE / RESUME

Pause শুধুমাত্র UI flag হওয়া যাবে না।

Database state persist করতে হবে।

Pause অবস্থায় pipeline execution attempt করলে:

```text
no new stage
no new generation job
no duplicate job
state remains persisted
```

Expected result clearly report করবে:

```text
PAUSED
```

Resume করলে:

```text
resume
→ recover previous safe state
→ continue from correct dependency
```

---

# 14. REAL PAUSE TEST

শুধু dry-run pause test যথেষ্ট নয়।

একটি actual running pipeline test করো:

```text
Stage starts
↓
job running
↓
PAUSE
↓
verify persisted state
↓
attempt next stage
```

Expected:

```text
no new stage starts
no duplicate generation
current job/state handled safely
pause persists
```

তারপর:

```text
RESUME
```

Expected:

```text
pipeline continues from correct safe state
```

---

# 15. CRASH RECOVERY

Crash recovery-এর ক্ষেত্রে শুধু database state manually পরিবর্তন করে test করা যাবে না।

বাস্তব process termination test করতে হবে।

Minimum critical stages:

```text
PROMPT_GENERATING
SEO_GENERATING
VIDEO_GENERATING
UPLOADING
```

প্রতিটির জন্য:

```text
start process
↓
enter stage
↓
process terminate/kill
↓
restart system
↓
CrashRecoveryEngine
↓
inspect state
```

Expected:

```text
state recovered
active job handled
no duplicate generation
correct next action identified
```

---

# 16. CRASH RECOVERY RULE

উদাহরণ:

```text
PROMPT_GENERATING
→ PROCESS KILLED
→ RESTART
```

System অবশ্যই determine করবে:

```text
Was output actually committed?
Was database insertion successful?
Was file generated?
Was remote action completed?
```

তারপর safe state নির্ধারণ করবে।

Blindly:

```text
GENERATING → COMPLETE
```

করবে না।

Evidence অনুযায়ী state recover করবে।

---

# 17. STALE FILE / PATH PROOF

এই test অবশ্যই করতে হবে:

```text
Database:
video = COMPLETE

Filesystem:
video file = DELETED
```

Expected:

```text
REAL VIDEO STATE = MISSING
STALE COMPLETE STATE = NOT TRUSTED
REGENERATION ELIGIBILITY = DETECTED
```

তারপর নতুন valid video তৈরি হলে:

```text
new path discovered
database updated
file verified
```

Hardcoded stale path ব্যবহার করা যাবে না।

---

# 18. UUID / IDENTITY

Logical identity filename-এর উপর নির্ভর করবে না।

যেখানে architecture অনুযায়ী applicable:

```text
immutable UUID
```

ব্যবহার করবে।

একটি logical video-এর সঙ্গে traceable relationship থাকতে হবে:

```text
UUID
 ↓
Prompt
 ↓
SEO
 ↓
Generation Job
 ↓
Generated File
 ↓
Upload Attempt
 ↓
Upload Result
 ↓
Schedule
```

Filename পরিবর্তন হলেও logical identity যেন নষ্ট না হয়।

---

# 19. INSERTION PROOF

External AI/browser generated data database-এ insert করার পর শুধু:

```text
INSERT SUCCESS
```

ধরে নেবে না।

Mandatory sequence:

```text
GENERATE
 ↓
PARSE
 ↓
VALIDATE
 ↓
INSERT
 ↓
READ BACK
 ↓
COMPARE
 ↓
VERIFY
```

Read-back mismatch হলে:

```text
STAGE != COMPLETE
NEXT STAGE = BLOCKED
```

---

# 20. VIDEO GENERATION GATE

Video generation trigger হওয়ার ঠিক আগে machine-verifiable gate তৈরি/verify করবে:

```text
Prompt verified = TRUE
SEO verified = TRUE
Duplicate job = FALSE
Target UUID verified = TRUE
Target row complete = TRUE
Existing valid video = FALSE
Not paused = TRUE
Retry allowed = TRUE
```

যেকোনো একটি FALSE হলে:

```text
VIDEO GENERATION MUST NOT EXECUTE
```

Failure-injection test দিয়ে এটি প্রমাণ করবে।

---

# 21. UPLOAD VERIFICATION

Upload API response পেলেই:

```text
UPLOAD_COMPLETE
```

লিখবে না।

Mandatory sequence:

```text
UPLOAD REQUEST
 ↓
REMOTE ACTION
 ↓
REMOTE RESPONSE
 ↓
REMOTE STATE CHECK
 ↓
DATABASE UPDATE
 ↓
READ-BACK
 ↓
VERIFY
```

Remote state verification fail করলে:

```text
UPLOAD_COMPLETE = FALSE
NEXT STAGE = BLOCKED
```

---

# 22. API-FIRST ORCHESTRATION

Pipeline control, state checking, dependency checking, generation triggering, validation, switching, upload triggering এবং control operations REST API-এর মাধ্যমে হবে।

Frontend বা local cached state pipeline-এর authority হবে না।

Existing API থাকলে সেটিই reuse করবে।

অকারণে নতুন API তৈরি করবে না।

---

# 23. REGRESSION SAFETY

প্রতিটি modification-এর পরে:

### Static

```text
imports
syntax
references
route registration
```

### Unit

Relevant existing unit tests

### Integration

Relevant DB/API/service tests

তারপর runtime evidence।

Existing unrelated test failure দেখলে সেটিকে নিজের fix-এর ফল বলে ধরে নেবে না।

প্রতিটি failure classify করবে:

```text
introduced by current change
pre-existing
environment/dependency issue
unrelated
```

---

# 24. DO NOT HIDE FAILURES

কোনো test fail করলে:

```text
PASS
```

দেখানোর জন্য test modify করবে না।

Expected behavior পরিবর্তন করে test pass করাবে না।

Real failure হলে:

```text
FAIL
```

দেখাবে।

তারপর root cause fix করবে।

---

# 25. NO FAKE EVIDENCE

কখনো:

- output বানিয়ে লিখবে না
- test না চালিয়ে PASS বলবে না
- dry-run-কে real execution proof বলবে না
- mocked browser-কে real browser proof বলবে না
- simulated crash-কে process-kill recovery proof বলবে না
- sequential test-কে concurrency proof বলবে না
- code inspection-কে runtime proof বলবে না

---

# 26. REQUIRED TEST MATRIX

শেষে এই matrix অবশ্যই তৈরি করবে:

| ID | Requirement | Implementation | Test | Exact Command | Actual Evidence | Verdict |
|---|---|---|---|---|---|---|
| R01 | Sequential execution | file/function | test | command | output | PASS/FAIL |
| R02 | Zero-blank | file/function | ZB-01 | command | output | PASS/FAIL |
| R03 | Many blanks | file/function | ZB-02 | command | output | PASS/FAIL |
| R04 | Row blocking | file/function | ZB-03 | command | output | PASS/FAIL |
| R05 | Dependency gate | file/function | dependency test | command | output | PASS/FAIL |
| R06 | Duplicate prevention | file/function | concurrency | command | output | PASS/FAIL |
| R07 | Retry stability | file/function | failure/retry | command | output | PASS/FAIL |
| R08 | Pause | file/function | real pause | command | output | PASS/FAIL |
| R09 | Resume | file/function | resume | command | output | PASS/FAIL |
| R10 | Crash recovery | file/function | process kill | command | output | PASS/FAIL |
| R11 | Stale file detection | file/function | stale-path test | command | output | PASS/FAIL |
| R12 | Video gate | file/function | failure injection | command | output | PASS/FAIL |
| R13 | Upload verification | file/function | upload proof | command | output | PASS/FAIL |
| R14 | E2E | file/function | real pipeline | command | output | PASS/FAIL |

---

# 27. EXECUTION ORDER

কাজ randomভাবে করবে না।

এই order অনুসরণ করবে:

## Phase A — Current State Audit

প্রথমে inspect করবে:

```text
repository structure
pipeline services
state machine
generation guard
failure handler
pause/resume
crash recovery
row validator
production orchestrator
API routes
database models
existing tests
existing evidence
```

কী already works এবং কী actually missing তা বের করবে।

---

## Phase B — Stability Fixes

শুধু প্রয়োজনীয় bug/fix:

```text
state transitions
dependency gates
retry
generation guard
pause/resume
crash recovery
row validation
sequential orchestration
```

---

## Phase C — Static + Unit Verification

চালাবে:

```text
imports
syntax
existing relevant unit tests
new unit tests
```

---

## Phase D — Integration

বাস্তব:

```text
Database
+
API
+
Service
+
Orchestrator
```

chain test করবে।

---

## Phase E — Failure Injection

ইচ্ছাকৃতভাবে failure:

```text
prompt
SEO
video
upload
database insertion
```

stage-এ তৈরি করবে।

System কীভাবে থামে এবং state কী রাখে verify করবে।

---

## Phase F — Recovery

বাস্তব process kill/restart:

```text
prompt
SEO
video
upload
```

stage-এ পরীক্ষা করবে।

---

## Phase G — Concurrency

কমপক্ষে:

```text
10 concurrent requests
```

same logical target-এর জন্য চালাবে।

Expected:

```text
exactly 1 accepted
remaining blocked
```

---

## Phase H — Zero-Blank

চালাবে:

```text
ZB-01
ZB-02
ZB-03
```

---

## Phase I — Row-by-Row

বাস্তব test dataset:

```text
Row 1 incomplete
Row 2 complete
Row 3 incomplete
```

দিয়ে sequential behavior প্রমাণ করবে।

---

## Phase J — Real E2E

শেষে একটি বাস্তব test item নিয়ে:

```text
Discover
 ↓
Prompt verification/generation
 ↓
DB verification
 ↓
SEO verification/generation
 ↓
DB verification
 ↓
Video gate
 ↓
Video generation
 ↓
File verification
 ↓
Package verification
 ↓
Upload
 ↓
Remote verification
 ↓
Database read-back
 ↓
Final state
```

সম্পূর্ণ sequence চালাবে।

Dry-run নয়।

যেখানে external browser/AI interaction প্রয়োজন সেখানে বাস্তব integration ব্যবহার করবে।

---

# 28. EVIDENCE COLLECTION

প্রতিটি test-এর:

```text
command
stdout
stderr
exit code
timestamp
test data / target ID
expected result
actual result
```

সংরক্ষণ করবে।

Evidence আলাদা report-এ রাখবে।

---

# 29. FINAL VERDICT RULE

শেষে তিনটির একটিই verdict:

### PROVEN

শুধুমাত্র যখন required evidence সম্পূর্ণ।

### PARTIALLY PROVEN

কিছু requirement proven, কিছু evidence missing।

### NOT PROVEN

Critical evidence অনুপস্থিত বা failure রয়েছে।

কখনো evidence incomplete থাকা অবস্থায়:

```text
PRODUCTION READY
```

বলবে না।

---

# 30. FINAL REPORT FORMAT

শেষে এই format-এ report দেবে:

```text
==================================================
PRODUCTION PIPELINE VERIFICATION REPORT
==================================================

STATIC VERIFICATION:
PASS = X
FAIL = X

UNIT VERIFICATION:
PASS = X
FAIL = X

INTEGRATION:
PASS = X
FAIL = X

FAILURE INJECTION:
PASS = X
FAIL = X

CRASH RECOVERY:
PASS = X
FAIL = X

CONCURRENCY:
PASS = X
FAIL = X

ZERO-BLANK:
PASS = X
FAIL = X

ROW-BY-ROW:
PASS = X
FAIL = X

END-TO-END:
PASS = X
FAIL = X

==================================================
TRACEABILITY MATRIX
==================================================

R01 ...
R02 ...
R03 ...
...

==================================================
FINAL VERDICT
==================================================

PROVEN / PARTIALLY PROVEN / NOT PROVEN

==================================================
REMAINING RISKS
==================================================

...
```

---

# 31. MOST IMPORTANT FINAL INSTRUCTION

তুমি এখন থেকে feature count দেখে কাজ শেষ ঘোষণা করবে না।

তোমার success criterion হলো:

> **“System works” নয়।**

বরং:

> **“System-এর required production behavior বাস্তব executable evidence দিয়ে proven।”**

যদি কোনো test fail করে:

1. fail report করবে
2. root cause identify করবে
3. minimum safe fix করবে
4. regression চালাবে
5. test আবার চালাবে
6. actual output capture করবে

যতক্ষণ সম্ভব, কাজটি শেষ করবে।

কিন্তু evidence না থাকলে কখনো মিথ্যা PASS বা PRODUCTION READY ঘোষণা করবে না।

**Existing working functionality untouched রাখবে।**

**Unrelated architecture migration করবে না।**

**PostgreSQL migration বা নতুন database architecture শুরু করবে না যদি current task-এর কোনো requirement-এর জন্য তা সরাসরি প্রয়োজন না হয়।**

**শুধু এই target-এর মধ্যে থাকবে:**

> **Production-ready stable pipeline + stable retry + stable pause/resume + duplicate prevention + crash recovery + zero-blank + strict sequential execution + বাস্তব evidence-based proof।**