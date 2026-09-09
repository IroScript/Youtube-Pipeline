# 🚨 AGY — 097 REQUIREMENT ZERO-SKIP MASTER EXECUTION LOCK
## API-FIRST FOUNDATION → DURABLE WORKFLOW → PRODUCTION ERP
### STRICT SEQUENTIAL EXECUTION PROTOCOL

**WORKSPACE:**
`C:\Users\Irak\Desktop\Youtube Pipeline`

---

# 🔴 PRIMARY DIRECTIVE — READ THIS FIRST

এই নির্দেশনা একটি সাধারণ implementation prompt নয়।

এটি পুরো project-এর **MASTER EXECUTION CONTRACT**।

এই project-এর জন্য মোট **097টি numbered requirement (REQ-001 → REQ-097)** নির্ধারিত আছে।

তোমার কাজ হলো **REQ-001 থেকে REQ-097 পর্যন্ত প্রতিটি requirement individually locate → verify → implement/fix → test → prove → record করা।**

## ABSOLUTE RULE:

> **কোনো REQ নিজে থেকে SKIP, MERGE, OMIT, ASSUME, DEFER, IGNORE বা “already covered” করা যাবে না।**

একটি requirement অন্য requirement-এর মাধ্যমে আংশিকভাবে implement হয়ে থাকলেও সেটি **নিজস্ব requirement হিসেবে individually verify** করতে হবে।

---

# 🔥 MOST IMPORTANT CORRECTION TO CURRENT EXECUTION

বর্তমান `MASTER VERIFICATION & 097-REQUIREMENT EXECUTION REPORT`-এ REQ-002→009, REQ-010→018 এবং REQ-019→028-কে VERIFIED বলা হয়েছে।

কিন্তু **REPORT-কে source of truth হিসেবে গ্রহণ করবে না।**

বর্তমান বাস্তব project filesystem, source code, imports, runtime behaviour, API requests, database behaviour এবং automated tests দিয়ে প্রত্যেক requirement পুনরায় প্রমাণ করতে হবে।

বিশেষ করে:

# 🚨 API-FIRST HARD GATE

বর্তমান project-এর মূল legacy architecture historically ছিল:

`Python scripts → direct SQLite → files/browser automation`

এবং কোনো mature REST/FastAPI control plane ছাড়া pipeline পরিচালিত হয়েছে।

অতএব:

> **বর্তমান বাস্তব project-এ কার্যকর, tested এবং pipeline-integrated API-first architecture প্রমাণিত না হওয়া পর্যন্ত Durable Workflow phase-এ যাওয়া যাবে না।**

শুধু `apps/api/main.py` ফাইল তৈরি থাকা = API architecture complete নয়।

শুধু FastAPI install থাকা = API complete নয়।

শুধু `/health` endpoint থাকা = API-first complete নয়।

API-কে বাস্তব domain/service/repository/pipeline-এর control plane হিসেবে কাজ করতে হবে।

---

# 🧠 MASTER EXECUTION ORDER

এই logical dependency বজায় রাখবে:

```text
FORENSIC BASELINE
      ↓
DATABASE / REPOSITORY ABSTRACTION
      ↓
SERVICE LAYER
      ↓
FASTAPI / REST CONTROL PLANE
      ↓
LEGACY PIPELINE API INTEGRATION
      ↓
POSTGRESQL READINESS
      ↓
DURABLE WORKFLOW DATA MODEL
      ↓
WORKFLOW ENGINE / STATE MACHINE
      ↓
RETRY / CRASH RECOVERY
      ↓
IDEMPOTENCY / SIDE-EFFECT SAFETY
      ↓
DYNAMIC WORKFLOW MIGRATION
      ↓
WORKER FLEET
      ↓
OBSERVABILITY / CHAOS / OPTIMIZATION
```

**এই dependency ভেঙে কোনো পরবর্তী requirement implement করবে না।**

---

# 🔐 RULE 1 — 097 REQUIREMENT LEDGER IS THE SINGLE MASTER TRACKER

প্রথমে project root-এ একটি canonical tracker তৈরি/আপডেট করো:

```text
MASTER_097_REQUIREMENT_LEDGER.md
```

এতে অবশ্যই:

```text
REQ-001
REQ-002
REQ-003
...
REQ-097
```

সবগুলো থাকতে হবে।

প্রতিটির জন্য:

```text
Requirement ID
Requirement Name
Phase
Current Status
Implementation Location
Test Location
Runtime Verification
Dependency
Evidence
Failure/Recovery Evidence
Final Status
```

ব্যবহার করবে।

Allowed status:

```text
NOT_STARTED
IN_PROGRESS
VERIFIED
PARTIALLY_VERIFIED
BLOCKED
```

কিন্তু:

```text
SKIPPED
IGNORED
NOT_NEEDED
ALREADY_COVERED
```

এগুলো ব্যবহার করে requirement বাদ দেওয়া নিষিদ্ধ।

---

# 🔒 RULE 2 — SEQUENTIAL EXECUTION LOCK

REQ-043 দিয়ে সরাসরি শুরু করবে না শুধু এই কারণে যে report বলছে:

`Next Scheduled Execution: Phase 6 — REQ-043 → REQ-051`

বর্তমান report-এ সত্যিই REQ-043→051-কে NOT_STARTED বলা হয়েছে।

কিন্তু তার আগে:

1. REQ-001→042-এর প্রত্যেকটির বর্তমান বাস্তব অবস্থা audit করো।
2. Report-এর VERIFIED claim independently validate করো।
3. API-first prerequisite সত্যিই operational কিনা প্রমাণ করো।
4. কোনো prerequisite অসম্পূর্ণ হলে আগে সেটি ঠিক করো।
5. তারপর sequentially পরবর্তী requirement-এ যাও।

---

# 🔴 RULE 3 — “ALREADY IMPLEMENTED” IS NOT A SKIP

যদি তুমি দেখো:

```text
REQ-019 already exists
```

তাহলে:

❌ skip করবে না।

করবে:

```text
Inspect
↓
Run test
↓
Runtime verification
↓
Compare against requirement specification
↓
Fix if incomplete
↓
Record evidence
↓
Mark VERIFIED
↓
Move next
```

অর্থাৎ:

> **Already implemented ≠ automatically verified.**

---

# 🔴 RULE 4 — NEVER IMPLEMENT ONLY 3 REQUIREMENTS AND STOP

একটি phase-এ 3টি requirement থাকলে শুধু 3টি করে থামবে না যদি ওই phase-এর আরও requirement pending থাকে।

উদাহরণ:

```text
REQ-043
REQ-044
REQ-045
...
REQ-051
```

সবগুলো individually execute করতে হবে।

তারপর:

```text
REQ-052 → REQ-060
```

তারপর:

```text
REQ-061 → REQ-069
```

এভাবে:

```text
REQ-043 → REQ-097
```

শেষ পর্যন্ত যেতে হবে।

---

# 🔥 RULE 5 — NO PHASE-LEVEL SHORTCUT

“Phase 6 complete” বলার আগে:

```text
REQ-043 VERIFIED
REQ-044 VERIFIED
REQ-045 VERIFIED
REQ-046 VERIFIED
REQ-047 VERIFIED
REQ-048 VERIFIED
REQ-049 VERIFIED
REQ-050 VERIFIED
REQ-051 VERIFIED
```

প্রতিটি individually proven হতে হবে।

একইভাবে Phase 7, 8, 9, 10, 11, 12-এর প্রতিটি requirement individually proven হতে হবে।

---

# 🚨 RULE 6 — API-FIRST MUST BE REAL

API architecture-এর জন্য minimum বাস্তব chain:

```text
HTTP Request
    ↓
FastAPI Router
    ↓
Pydantic Contract
    ↓
Service
    ↓
Repository
    ↓
Database
    ↓
Domain Result
    ↓
API Response
```

কোনো endpoint যদি সরাসরি legacy script invoke করে এবং service/repository/domain boundary bypass করে, তাহলে architecture অসম্পূর্ণ হিসেবে বিবেচনা করবে যেখানে requirement তা নিষেধ করে।

---

# API HARD-GATE CHECKLIST

পরবর্তী durable workflow requirement-এ যাওয়ার আগে নিশ্চিত করবে:

### API Application

```text
apps/api/main.py
apps/api/dependencies.py
apps/api/routers/
```

বাস্তবে executable।

### Minimum control-plane routes

```text
/health
/ideas
/prompts
/seo
/videos
/packages
/workflows
/executions
/assets
```

প্রয়োজনীয় requirement অনুযায়ী implement/test করতে হবে।

### Runtime proof

FastAPI application বাস্তবে start করবে।

তারপর বাস্তব HTTP request দিয়ে verify করবে।

শুধু static source inspection গ্রহণযোগ্য নয়।

---

# 🔥 RULE 7 — LEGACY PIPELINE MUST NOT REMAIN AN ISLAND

বর্তমান legacy scripts যেমন:

```text
PromptDatabase/
video/1Video10Sec/
step1_generate_voices.py
step2_generate_bgm.py
step3_generate_sfx.py
video_assembler.py
```

এগুলোকে শুধু নতুন folder-এর পাশে রেখে দিলেই migration complete নয়।

Architecture-এর লক্ষ্য:

```text
API
 ↓
Service
 ↓
Legacy functionality / Infrastructure adapter
 ↓
Actual operation
```

অর্থাৎ API control plane থেকে pipeline operation trigger করার বাস্তব পথ থাকতে হবে যেখানে requirement তা দাবি করে।

---

# 🔥 RULE 8 — DATABASE PROTECTION

কোনো destructive database modification করার আগে:

```text
Backup
↓
SHA256/integrity verification
↓
Change
↓
Validation
↓
Rollback capability
```

বর্তমান audit-এ database backup ইতিমধ্যে documented আছে; সেটিকে বাস্তব filesystem hash/size/integrity দিয়ে পুনরায় যাচাই করবে।

কখনো:

```text
DROP DATABASE
DROP TABLE
DELETE production rows
TRUNCATE
destructive migration
```

করবে না যদি requirement অনুযায়ী তার প্রয়োজন ও নিরাপত্তা প্রমাণিত না থাকে।

---

# 🔥 RULE 9 — SQLITE DATA MUST SURVIVE

বর্তমান SQLite data authoritative legacy data হিসেবে বিবেচনা করবে।

Migration/abstraction-এর সময়:

```text
No accidental deletion
No silent mutation
No schema corruption
No record loss
```

প্রমাণ করতে হবে।

---

# 🔥 RULE 10 — POSTGRESQL ≠ “INSTALL POSTGRES”

PostgreSQL readiness requirement থাকলে শুধু PostgreSQL URL লিখে রাখা যথেষ্ট নয়।

যেখানে requirement প্রযোজ্য:

```text
Schema
Types
Constraints
Indexes
UUID
JSONB
Transactions
Connection handling
Migration scripts
Data validation
Rollback
```

সব individually verify করতে হবে।

বর্তমান report-এ REQ-038 partially verified এবং live PostgreSQL insertion deferred বলা হয়েছে—তাই “PostgreSQL ready” এবং “PostgreSQL live verified” এক জিনিস হিসেবে দেখাবে না।

---

# 🔥 RULE 11 — DURABLE WORKFLOW

REQ-043→051 এ পৌঁছালে প্রত্যেকটি independently implement করতে হবে:

```text
REQ-043 workflows
REQ-044 workflow_versions
REQ-045 DAG graph
REQ-046 workflow_executions
REQ-047 step_runs
REQ-048 step_attempts
REQ-049 jobs/job_leases
REQ-050 execution_events
REQ-051 workflow_migrations
```

বর্তমান master report-এ এই ৯টি requirement-ই Phase 6-এর scheduled components হিসেবে সংজ্ঞায়িত আছে।

---

# 🔥 RULE 12 — DURABILITY MUST BE ACTUAL

Workflow system-এর উদ্দেশ্য শুধু database table তৈরি করা নয়।

প্রমাণ করতে হবে:

```text
Process crash
↓
Restart
↓
Execution state recovered
↓
Incomplete step identified
↓
Lease/recovery logic executed
↓
Workflow continues safely
```

---

# 🔥 RULE 13 — IDEMPOTENCY IS MANDATORY

External side effects:

```text
YouTube upload
Video generation
File creation
External API call
Browser automation
```

এসব retry করলে duplicate side effect যেন না হয়।

যেখানে requirement আছে সেখানে:

```text
idempotency key
idempotency record
external operation identity
retry state
completion state
```

ব্যবহার করতে হবে।

---

# 🔥 RULE 14 — FAILURE TESTING

শুধু happy path test গ্রহণযোগ্য নয়।

যেখানে requirement applicable:

```text
Network failure
Timeout
Process crash
Browser crash
API 429
Token expiry
Duplicate request
Worker death
Database interruption
Partial file
Concurrent execution
```

simulate/test করতে হবে।

---

# 🔥 RULE 15 — TEST PASS ≠ REQUIREMENT VERIFIED

একটি test pass করলেই requirement VERIFIED হবে না।

VERIFIED করার জন্য প্রয়োজন:

```text
Implementation Evidence
+
Unit Test Evidence
+
Integration Test Evidence
+
Runtime Evidence
+
Failure/Recovery Evidence
```

যেখানে applicable।

---

# 🔥 RULE 16 — NO MOCK AS PRODUCTION PROOF

Mock/dry-run successful হলে status হবে:

```text
PARTIALLY_VERIFIED
```

যতক্ষণ real external runtime validation না হয়।

বর্তমান report-এ REQ-030, REQ-031 এবং REQ-038-এর মতো requirement-এ এই distinction ইতিমধ্যে ব্যবহৃত হয়েছে।

---

# 🔥 RULE 17 — ONE REQUIREMENT AT A TIME

প্রতিটি requirement-এর execution format:

```text
==================================================
REQ-XXX
==================================================

1. Read requirement
2. Inspect existing implementation
3. Identify missing pieces
4. Plan
5. Implement
6. Test
7. Runtime verify
8. Failure verify
9. Record evidence
10. Update MASTER_097_REQUIREMENT_LEDGER.md
11. Only then proceed to REQ-XXX+1
```

---

# 🔥 RULE 18 — DO NOT ASK FOR PERMISSION BETWEEN NORMAL STEPS

যদি requirement implement করার জন্য normal coding/testing প্রয়োজন হয়:

**নিজে execute করো।**

শুধু genuinely destructive, irreversible বা externally consequential action-এর ক্ষেত্রে stop করার প্রয়োজন হলে stop করবে।

---

# 🔥 RULE 19 — DEPENDENCY BLOCKING

যদি:

```text
REQ-052
```

এর জন্য:

```text
REQ-049
```

প্রয়োজন হয় এবং REQ-049 অসম্পূর্ণ থাকে,

তাহলে:

```text
REQ-052 = BLOCKED_BY_REQ-049
```

record করবে।

কিন্তু:

❌ REQ-052 skip করবে না।

বরং dependency fix করে আবার REQ-052-তে ফিরবে।

---

# 🔥 RULE 20 — NO FAKE COMPLETION

কখনো লিখবে না:

```text
100% complete
```

যদি কোনো requirement:

```text
Not Started
Partially Verified
Blocked
```

থাকে।

Master checksum সবসময়:

```text
VERIFIED
+
PARTIALLY_VERIFIED
+
NOT_STARTED
+
BLOCKED
=
97
```

হতে হবে।

---

# 🔥 RULE 21 — PHASE COMPLETION GATE

একটি phase complete ঘোষণা করার আগে:

```text
All requirements in phase individually verified
↓
All tests passed
↓
No hidden TODO
↓
No placeholder
↓
No skipped requirement
↓
Ledger updated
↓
Evidence recorded
```

---

# 🔥 RULE 22 — CURRENT PROJECT REALITY OVERRIDES OLD REPORT

যদি পুরোনো report বলে:

```text
FastAPI VERIFIED
```

কিন্তু বাস্তব inspection-এ দেখা যায়:

```text
API does not start
OR
routes are missing
OR
database path is wrong
OR
service layer bypassed
OR
pipeline cannot be controlled through API
```

তাহলে report-এর VERIFIED status ভুল হিসেবে চিহ্নিত করবে এবং requirement পুনরায় fix/verify করবে।

---

# 🔥 RULE 23 — DO NOT DESTROY LEGACY COMPATIBILITY

বর্তমান working legacy pipeline যেন migration-এর কারণে ভেঙে না যায়।

Target:

```text
NEW ARCHITECTURE
        +
LEGACY COMPATIBILITY
        +
SAFE MIGRATION
```

প্রয়োজনে adapter/wrapper ব্যবহার করবে।

---

# 🔥 RULE 24 — NO DUPLICATE ARCHITECTURES

একই business logic-এর:

```text
legacy version
+
new version
+
third version
```

অকারণে তৈরি করবে না।

Canonical service/domain implementation নির্ধারণ করবে এবং legacy entry points প্রয়োজন হলে সেই canonical implementation-এর দিকে route করবে।

---

# 🔥 RULE 25 — BEFORE EVERY MAJOR CHANGE

প্রতিটি major architectural modification-এর আগে সংক্ষেপে record করবে:

```text
CURRENT STATE
TARGET STATE
FILES TO CHANGE
DATABASE IMPACT
API IMPACT
RISK
ROLLBACK
TEST PLAN
```

তারপর implementation করবে।

---

# 🔥 RULE 26 — AFTER EVERY REQUIREMENT

Ledger-এ update করবে:

```text
REQ ID
STATUS
FILES
TESTS
RUNTIME RESULT
EVIDENCE
```

---

# 🔥 RULE 27 — FINAL 097 CHECKSUM

শেষে অবশ্যই:

```text
REQ-001 ... VERIFIED
REQ-002 ... VERIFIED
...
REQ-097 ... VERIFIED
```

প্রতিটি individually accounted-for হতে হবে।

Final checksum:

```text
VERIFIED = 97
PARTIALLY_VERIFIED = 0
NOT_STARTED = 0
BLOCKED = 0
SKIPPED = 0
```

**অথবা যদি external infrastructure-এর কারণে কোনো requirement genuinely live-verified করা অসম্ভব হয়, সেটি PARTIALLY_VERIFIED হিসেবে স্পষ্টভাবে রাখতে হবে—কখনো VERIFIED হিসেবে দেখানো যাবে না।**

---

# 🚨 IMMEDIATE ACTION — DO NOT JUMP TO PHASE 6 BLINDLY

এখন প্রথমে:

### STEP A
বর্তমান:

```text
MASTER_VERIFICATION_REPORT
MASTER_IMPLEMENTATION_PLAN
ZERO-SKIP PROTOCOL
097 REQUIREMENT MATRIX
```

সব পড়ো।

### STEP B
বর্তমান filesystem পুনরায় inspect করো।

### STEP C
`REQ-001 → REQ-042` status বাস্তব implementation-এর সাথে reconcile করো।

### STEP D
বিশেষভাবে API-first architecture-এর বাস্তব runtime verification করো।

### STEP E
যদি API foundation অসম্পূর্ণ হয়:

**আগে API-first foundation সম্পূর্ণ করো।**

### STEP F
তারপর:

```text
REQ-043
→
REQ-044
→
REQ-045
...
→
REQ-097
```

**strict sequential execution শুরু করো।**

---

# 🚫 ABSOLUTELY FORBIDDEN

```text
❌ “এই ৩টা requirement যথেষ্ট”
❌ “বাকিগুলো implicitly covered”
❌ “Phase complete, তাই individual check দরকার নেই”
❌ “Already implemented, তাই skip”
❌ “Not necessary”
❌ “Future scope”
❌ “Can be done later”
❌ “Equivalent implementation exists”
❌ “Report says verified”
❌ “Mock passed, therefore production verified”
❌ “Create files and call architecture complete”
❌ “FastAPI installed, therefore API-first complete”
❌ “Table exists, therefore durable workflow complete”
```

---

# 🧠 FINAL COMMAND

**DO NOT OPTIMIZE FOR SPEED.**

**OPTIMIZE FOR ZERO REQUIREMENT LOSS + PROVABLE CORRECTNESS.**

তোমার execution হবে:

```text
AUDIT
→
VERIFY
→
IMPLEMENT
→
TEST
→
PROVE
→
RECORD
→
NEXT REQUIREMENT
```

**Never:**

```text
AUDIT
→
IMPLEMENT 3 THINGS
→
ASSUME THE REST
→
MOVE ON
```

---

## START NOW

প্রথমে বর্তমান project-এর বাস্তব অবস্থা এবং `REQ-001 → REQ-097` ledger reconcile করো।

তারপর **প্রথম অসম্পূর্ণ/অপ্রমাণিত prerequisite requirement** থেকে sequential execution শুরু করো।

**একটি requirement সম্পূর্ণভাবে proven না হওয়া পর্যন্ত পরবর্তী requirement-এ advance করবে না।**

**REQ-001 থেকে REQ-097 — কোনো requirement হারানো যাবে না।**

# ZERO SKIP.
# ZERO ASSUMPTION.
# ZERO PLACEHOLDER.
# ZERO FAKE VERIFICATION.
# 097 / 097 ACCOUNTED FOR.