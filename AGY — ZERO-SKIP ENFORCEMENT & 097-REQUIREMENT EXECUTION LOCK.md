# 🔴 AGY — ZERO-SKIP ENFORCEMENT PATCH
## READ THIS BEFORE DOING ANY MORE IMPLEMENTATION

তোমার সর্বশেষ response আমি পর্যালোচনা করেছি।

তুমি Phase 0 audit সম্পন্ন করেছো এবং 001–097 requirement tracking শুরু করেছো।

কিন্তু তোমার implementation plan-এ একটি গুরুতর সমস্যা আছে:

তুমি 097টি requirement-এর মধ্যে বর্তমানে শুধুমাত্র Phase 1–3/4-কে actionable implementation হিসেবে ধরেছো এবং বাকি requirements-কে long-term/not-started হিসেবে রেখে দিয়েছো।

এটি আমার requirement নয়।

---

# 🔴 RULE 1 — 097 REQUIREMENTS ARE ONE COMPLETE PROJECT

এই project-এর scope হলো:

**001 → 097**

সবগুলো requirement।

এগুলো optional roadmap নয়।

এগুলো future ideas নয়।

এগুলো “nice to have” নয়।

এগুলো backlog নয়।

এগুলো complete implementation specification-এর অংশ।

তবে এগুলো **একসাথে implement করতে হবে না**।

সঠিক execution model:

```text
001
 ↓
002
 ↓
003
 ↓
004
 ↓
005
 ↓
006
 ↓
...
 ↓
097
```

প্রতিটি requirement dependency অনুযায়ী phase/batch-এ implement করা যাবে।

কিন্তু কোনো requirement বাদ দেওয়া যাবে না।

---

# 🔴 RULE 2 — "NOT STARTED" DOES NOT MEAN "NOT REQUIRED"

যদি কোনো requirement এখনো implement করার সময় না আসে, তার status হবে:

```text
NOT_STARTED
```

কিন্তু তার পাশে অবশ্যই থাকবে:

```text
DEPENDENCY
PLANNED_PHASE
IMPLEMENTATION_GATE
```

উদাহরণ:

```text
006 Workflow Data Model
Status: NOT_STARTED
Dependency: 002–005
Planned Phase: Workflow Foundation
Implementation Gate: API + Repository + PostgreSQL abstraction verified
```

এভাবে requirement future phase-এ যেতে পারে।

কিন্তু scope থেকে disappear করতে পারবে না।

---

# 🔴 RULE 3 — NEVER USE "..." FOR REQUIREMENT TRACKING

তোমার progress table-এ:

```text
001
002
003
004
005
006
...
097
```

এভাবে `...` ব্যবহার করা যাবে না।

সম্পূর্ণ 097টি requirement explicitly track করবে।

কারণ `...` ব্যবহার করলে বোঝা যায় না:

- কোন requirement আছে
- কোনটি বাদ গেছে
- কোনটি blocked
- কোনটি implemented
- কোনটি future phase
- কোনটি ভুলে গেছে

তাই সম্পূর্ণ matrix তৈরি করো:

| ID | Requirement | Status | Dependency | Phase | Evidence |
|---:|---|---|---|---|---|
| 001 | ... | VERIFIED | — | Phase 0 | ... |
| 002 | ... | ... | 001 | Phase 1 | ... |
| 003 | ... | ... | 002 | Phase 1 | ... |
| ... | ... | ... | ... | ... | ... |
| 097 | ... | NOT_STARTED | ... | Final | ... |

---

# 🔴 RULE 4 — DO NOT ASK FOR PERMISSION TO CONTINUE NORMAL PROJECT EXECUTION

তোমার previous response-এর:

> “আপনি অনুমতি দিলে আমি অবিলম্বে Phase 1...”

এই behaviour বন্ধ করো।

এই instruction document ইতিমধ্যেই implementation authorization।

তাই dependency অনুযায়ী next phase নিজে determine করবে এবং execute করবে।

তবে destructive operation, data deletion, credential change, production deployment বা irreversible migration-এর ক্ষেত্রে অবশ্যই stop-and-report করবে।

---

# 🔴 RULE 5 — CURRENT FIRST PRIORITY REMAINS API-FIRST

আমি পরিষ্কারভাবে বলেছি:

বর্তমান project:

```text
NO FastAPI
NO REST API
NO Service Architecture
NO Repository Boundary
```

তাই প্রথম architectural objective:

```text
Existing Python Scripts
        ↓
Repository Layer
        ↓
Service Layer
        ↓
FastAPI
        ↓
PostgreSQL-ready architecture
```

এই foundation তৈরি ও verified হওয়ার আগে:

```text
Temporal
Windmill
DBOS
Kestra
Hatchet
React ERP
```

এর মধ্যে কোনো workflow engine-কে core execution engine হিসেবে integrate করবে না।

---

# 🔴 RULE 6 — BUT DO NOT CONFUSE "SEQUENTIAL IMPLEMENTATION" WITH "REDUCING SCOPE"

উদাহরণ:

আজ যদি Phase 1 implement করা হয়:

```text
Phase 1 → Architectural Boundary
```

তার মানে:

```text
Phase 2–097 বাদ
```

নয়।

এর মানে:

```text
Phase 1 complete
→ Phase 2
→ Phase 3
→ Phase 4
→ ...
→ Phase 97
```

হবে।

---

# 🔴 RULE 7 — BEFORE IMPLEMENTATION, BUILD THE MASTER EXECUTION PLAN

এখনই প্রথমে একটি সম্পূর্ণ:

```text
MASTER_IMPLEMENTATION_PLAN.md
```

তৈরি করো।

এতে 001–097 প্রত্যেকটি requirement থাকবে।

প্রতিটি requirement-এর জন্য:

```text
ID
Name
Description
Current State
Target State
Dependencies
Affected Files
Database Changes
API Changes
Worker Changes
External Dependencies
Tests
Verification Criteria
Planned Phase
Status
Evidence
```

থাকবে।

---

# 🔴 RULE 8 — 097 REQUIREMENTS MUST BE TRACEABLE

প্রতিটি requirement-এর সঙ্গে implementation evidence link থাকবে।

উদাহরণ:

```text
REQ-006
↓
workflow_models.py
↓
migration_004.py
↓
test_workflow_repository.py
↓
verification result
```

অর্থাৎ:

```text
Requirement
    ↓
Code
    ↓
Test
    ↓
Evidence
```

এই chain ছাড়া requirement `VERIFIED` করা যাবে না।

---

# 🔴 RULE 9 — "IMPLEMENTED" AND "VERIFIED" ARE DIFFERENT

এই status:

```text
IMPLEMENTED
```

মানে শুধু code লেখা হয়েছে।

এটি completion নয়।

Final status:

```text
VERIFIED
```

হবে যখন:

```text
Code
+
Unit Test
+
Integration Test
+
Failure Test যেখানে প্রযোজ্য
+
Manual/Automated Verification
```

সম্পন্ন।

---

# 🔴 RULE 10 — BLOCKED IS ALLOWED, SKIPPED IS NOT

Valid:

```text
BLOCKED
```

Invalid:

```text
SKIPPED
```

যদি কোনো requirement implement করতে না পারো:

```text
REQ:
...

BLOCKED BECAUSE:
...

DEPENDENCY:
...

WHAT WAS ATTEMPTED:
...

PROPOSED SOLUTION:
...

NEXT IMPLEMENTATION STEP:
...
```

report করবে।

কিন্তু requirement বাদ দেবে না।

---

# 🔴 RULE 11 — NOT APPLICABLE ALSO REQUIRES PROOF

কোনো requirement যদি মনে হয়:

```text
NOT_APPLICABLE
```

তাহলেও নিজে থেকে সেটি declare করবে না।

প্রথমে দেখাবে:

```text
Why it is not applicable
Which requirement it belongs to
What architecture capability replaces it
What would break if removed
```

তারপর explicit approval প্রয়োজন।

---

# 🔴 RULE 12 — DO NOT REDUCE THE 097 REQUIREMENTS INTO ONLY 4 PHASES

তোমার current report-এ:

```text
Phase 1
Phase 2
Phase 3
Phase 4
```

দিয়ে initial implementation roadmap করা হয়েছে।

এটা acceptable শুধুমাত্র যদি এগুলো **high-level batches** হয়।

কিন্তু:

```text
097 requirements
≠
4 requirements
```

হতে পারবে না।

Correct:

```text
PHASE 0
    REQ 001

PHASE 1
    REQ 002–005

PHASE 2
    REQ 006–015

PHASE 3
    REQ 016–025

...

FINAL PHASE
    REQ 090–097
```

Exact grouping তুমি dependency analysis করে নির্ধারণ করবে।

---

# 🔴 RULE 13 — DO NOT IMPLEMENT ONLY WHAT IS EASY

কোনো requirement কঠিন হলে সহজ requirement দিয়ে replace করবে না।

বিশেষ করে এগুলোকে কখনো বাদ দেবে না:

```text
Dynamic workflow
Workflow versioning
Running execution migration
Step identity
Retry
Backoff
Timeout
Lease
Heartbeat
Crash recovery
Idempotency
External side-effect reconciliation
Outbox
Inbox/deduplication
DLQ
Artifact tracking
Browser recovery
YouTube resumable upload
YouTube reconciliation
Audit log
Execution history
Conditional branches
Parallel execution
Workflow UI
Workflow versioning
Workflow migration
Chaos testing
```

এসবই architecture-এর core reliability requirement।

---

# 🔴 RULE 14 — 97-STEP PIPELINE ≠ 97 HARD-CODED FUNCTIONS

আমার 97টি stage requirement-এর অর্থ এই নয় যে 97টি আলাদা Python file বানাতে হবে।

Architecture এমন হবে যাতে:

```text
97 logical capabilities
```

একটি configurable workflow system-এর মাধ্যমে execute হতে পারে।

যেমন:

```text
workflow
 ├── research
 ├── validation
 ├── script
 ├── prompt_01
 ├── prompt_02
 ├── ...
 ├── video
 ├── QC
 └── YouTube
```

প্রয়োজনে একটি reusable service একাধিক workflow step হিসেবে ব্যবহার করতে পারে।

---

# 🔴 RULE 15 — USER MAY DISABLE A STEP; AGY MAY NOT DELETE A REQUIREMENT

উদাহরণ:

বর্তমানে Audio দরকার নেই।

তাহলে:

```text
audio.enabled = false
```

হতে পারে।

কিন্তু architecture থেকে:

```text
audio capability
```

চিরতরে delete করা যাবে না, যদি specification-এ সেটি required capability হয়।

একইভাবে:

```text
disable ≠ delete
```

---

# 🔴 RULE 16 — CURRENT PROJECT MUST REMAIN WORKING DURING MIGRATION

Migration:

```text
OLD SYSTEM
   ↓
NEW LAYER
   ↓
TEST
   ↓
SWITCH
   ↓
DEPRECATE OLD PATH
```

হবে।

একসাথে সব পুরনো code rewrite করবে না।

---

# 🔴 RULE 17 — DATA SAFETY

বর্তমান:

```text
youtube_pipeline.db
```

এর data কোনো migration experiment-এর কারণে:

```text
DELETE
TRUNCATE
OVERWRITE
RESET
```

করবে না।

প্রথমে backup।

তারপর migration।

তারপর validation।

তারপর cutover।

---

# 🔴 RULE 18 — API FIRST MEANS THE PIPELINE MUST EVENTUALLY BE INVOKABLE THROUGH API

শেষে শুধু:

```text
GET /health
```

বানিয়ে “API migration complete” বলা যাবে না।

Core operations API-accessible হতে হবে।

যেমন:

```text
POST /ideas
POST /prompts/generate
POST /seo/generate
POST /videos/generate
POST /workflows
POST /executions
POST /executions/{id}/retry
POST /executions/{id}/cancel
GET  /executions/{id}
GET  /executions/{id}/steps
```

Exact endpoint design implementation-এর সময় domain অনুযায়ী refine করবে।

---

# 🔴 RULE 19 — API MUST NOT CONTAIN BUSINESS LOGIC

ভুল:

```text
FastAPI Router
   ↓
1000 lines business logic
```

সঠিক:

```text
FastAPI
 ↓
Service
 ↓
Repository / Infrastructure
```

CLI এবং API একই service ব্যবহার করবে।

---

# 🔴 RULE 20 — FINAL ARCHITECTURE MUST SUPPORT FUTURE WORKFLOW CHANGES

Architecture অবশ্যই support করবে:

```text
V1
 ↓
V2
 ├── add step
 ├── remove step
 ├── disable step
 ├── reorder
 ├── duplicate
 └── modify retry
```

Existing execution V1-এর সঙ্গে bound থাকবে।

New execution V2-তে যাবে।

Migration চাইলে explicit migration mechanism ব্যবহার হবে।

---

# 🔴 RULE 21 — NO FALSE "ZERO RISK" CLAIM

তোমার previous report-এ:

> “Risk: শূন্য ঝুঁকি”

এটি ব্যবহার করবে না।

Migration-এর বাস্তব risk আছে:

```text
database compatibility
dependency conflicts
import cycles
concurrent access
filesystem race
browser state
external API state
data migration
duplicate side effects
```

Risk লিখবে বাস্তবভাবে:

```text
LOW / MEDIUM / HIGH
```

এবং mitigation দেবে।

---

# 🔴 RULE 22 — EVERY PHASE MUST HAVE AN EXIT GATE

Example:

```text
PHASE 1 EXIT GATE

[ ] Repository layer implemented
[ ] Existing DB reads preserved
[ ] Existing DB writes preserved
[ ] Tests passing
[ ] No direct DB access from migrated services
[ ] Legacy pipeline still works
[ ] API can access repository
[ ] Evidence recorded
```

সব checked না হলে Phase 1 complete নয়।

---

# 🔴 RULE 23 — AFTER EACH PHASE, AUTOMATICALLY SELECT NEXT UNBLOCKED PHASE

Process:

```text
Complete current phase
        ↓
Run tests
        ↓
Verify
        ↓
Update master matrix
        ↓
Find next unblocked requirements
        ↓
Create implementation plan
        ↓
Implement
```

এভাবে 097 পর্যন্ত এগোবে।

---

# 🔴 RULE 24 — DO NOT STOP AT ARCHITECTURE DOCUMENTATION

শুধু:

```text
architecture.md
design.md
audit.md
plan.md
```

তৈরি করাকে implementation হিসেবে গণ্য করবে না।

যেখানে requirement implementation দাবি করে সেখানে:

```text
actual code
actual migration
actual API
actual test
actual verification
```

দরকার।

---

# 🔴 RULE 25 — CURRENT TASK

এখন নতুন feature implement করার আগে এই corrective sequence execute করো:

### STEP A

সম্পূর্ণ 001–097 requirement matrix তৈরি করো।

### STEP B

প্রতিটি requirement-এর dependency graph তৈরি করো।

### STEP C

Requirement-গুলোকে implementation phase-এ group করো।

### STEP D

কোনো requirement যেন phase grouping-এর বাইরে না থাকে তা verify করো।

### STEP E

বর্তমান Phase 0 audit-এর evidence সংযুক্ত করো।

### STEP F

তারপর প্রথম unblocked implementation phase শুরু করো।

---

# 🔴 FINAL ENFORCEMENT RULE

এই project-এর জন্য তোমার mental model হবে:

```text
NOT:

"User asked for 97 things,
I'll implement the first 4 and leave the rest for later."

BUT:

"User has a 97-requirement system.
I must build it sequentially.
I may postpone a requirement only because of a real dependency,
never because it is difficult, inconvenient, or considered optional."
```

সবশেষে:

```text
097 REQUIREMENTS
        ↓
100% TRACKED
        ↓
100% IMPLEMENTATION PLANNED
        ↓
100% DEPENDENCY MAPPED
        ↓
100% VERIFIED EVENTUALLY
```

**কোনো requirement silently disappear করবে না।**

**কোনো requirement নিজের সিদ্ধান্তে downgrade করবে না।**

**কোনো requirement “future enhancement” বলে scope-এর বাইরে পাঠাবে না।**

**বর্তমান কাজ API-first migration দিয়ে শুরু হবে, কিন্তু project completion 005-এ শেষ হবে না; dependency অনুযায়ী 097 পর্যন্ত চলবে।**