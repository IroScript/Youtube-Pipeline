# AGY — ZERO-SKIP IMPLEMENTATION PROTOCOL
## YouTube Automation ERP / Durable Workflow Migration

তুমি এই project-এ কোনো সাধারণ coding assistant হিসেবে কাজ করবে না।

তোমার কাজ হলো existing YouTube automation project-কে ধাপে ধাপে একটি production-grade, API-first, database-centric, durable workflow architecture-এ migrate করা।

## 🔴 ABSOLUTE RULE #1 — NO STEP MAY BE SKIPPED

এই specification-এর কোনো requirement, migration phase, database component, API layer, reliability mechanism, testing phase বা architectural prerequisite নিজের সিদ্ধান্তে বাদ দেওয়া যাবে না।

কোনো কাজ:

- “এখন দরকার নেই”
- “পরে করা যাবে”
- “existing code দিয়েই হবে”
- “এই abstraction unnecessary”
- “এটা optional”
- “future enhancement”
- “architecture overkill”
- “first version-এ লাগবে না”

—এই যুক্তিতে বাদ দেওয়া যাবে না।

যদি কোনো component বর্তমান phase-এ technically implement করা সম্ভব না হয়, তাহলে:

1. সেটি SKIPPED করবে না।
2. `BLOCKED` হিসেবে document করবে।
3. কেন blocked তা লিখবে।
4. কোন prerequisite দরকার তা লিখবে।
5. prerequisite implement করবে।
6. তারপর blocked component-এ ফিরে আসবে।
7. verification ছাড়া phase complete ঘোষণা করবে না।

---

# 🔴 ABSOLUTE RULE #2 — FIRST PRIORITY IS API-FIRST MIGRATION

বর্তমান project:

**কোনো FastAPI system-এর অধীনে নেই।**

বর্তমান project-এর core logic/scripts সরাসরি filesystem/database/scripts/automation code-এর মাধ্যমে কাজ করে।

তাই এখনই:

- Windmill
- Temporal
- DBOS
- ERP UI
- React dashboard
- workflow engine
- distributed workers

—এসব দিয়ে শুরু করবে না।

## প্রথম architectural milestone:

বর্তমান project-কে একটি পরিষ্কার **API + Service Layer architecture**-এ migrate করতে হবে।

Target:

```text
Current Scripts
      ↓
Service Layer
      ↓
FastAPI
      ↓
PostgreSQL
      ↓
Workers / Workflow Engine
      ↓
ERP UI
```

অর্থাৎ:

```text
ERP UI
   ↓
FastAPI REST API
   ↓
Application / Service Layer
   ↓
Domain Layer
   ↓
Repositories
   ↓
PostgreSQL
```

পরবর্তীতে:

```text
FastAPI
   ↓
Workflow Orchestrator
   ↓
Workers
```

হবে।

**FastAPI/API layer complete হওয়ার আগে workflow-engine migration শুরু করবে না।**

---

# PHASE 0 — EXISTING PROJECT FORENSIC AUDIT

প্রথমে কোনো বড় code change করবে না।

পুরো project inspect করবে।

খুঁজবে:

- সব Python files
- entry points
- CLI scripts
- database access
- SQLite connections
- SQLAlchemy models
- raw sqlite3 usage
- file-based state
- JSON state
- CSV state
- prompt generation
- research
- script generation
- SEO
- Veo/browser automation
- audio
- FFmpeg
- packaging
- YouTube upload
- scheduling
- logging
- retry mechanisms
- temporary files
- environment variables
- credentials
- configuration
- duplicate functionality
- deprecated/unused code
- circular dependencies
- hidden global state

প্রতিটি গুরুত্বপূর্ণ component-এর জন্য লিখবে:

```text
Component
Location
Current responsibility
Dependencies
Database access
Filesystem access
External services
Input
Output
Side effects
Failure modes
Current retry mechanism
Current state mechanism
Migration target
Risk
```

## গুরুত্বপূর্ণ:

তুমি source code না দেখে architecture সম্পর্কে assumption করবে না।

প্রথমে inspect করবে।

---

# PHASE 1 — DEFINE THE ARCHITECTURAL BOUNDARY

বর্তমান code-এর business logic এবং infrastructure logic আলাদা করবে।

Target:

```text
apps/
    api/

domain/
    videos/
    workflows/
    prompts/
    channels/
    assets/

services/
    research/
    scripting/
    seo/
    video/
    audio/
    youtube/

repositories/
    video_repository.py
    workflow_repository.py
    asset_repository.py

workers/
    ...

infrastructure/
    database/
    browser/
    llm/
    youtube/
    storage/

shared/
    logging/
    errors/
    contracts/
    idempotency/
```

বর্তমান script-এর logic সরাসরি:

```python
sqlite3.connect(...)
```

বা

```python
Session(...)
```

করে database access করলে ধীরে ধীরে তা repository/service layer-এর মাধ্যমে আনতে হবে।

---

# PHASE 2 — DATABASE ABSTRACTION

Database access-এর জন্য:

```text
API
 ↓
Service
 ↓
Repository
 ↓
SQLAlchemy
 ↓
PostgreSQL
```

ব্যবহার করবে।

Business logic-এর ভিতরে raw SQL/connection scattering করবে না।

Database model এবং business service আলাদা থাকবে।

---

# PHASE 3 — FASTAPI CORE

এখন FastAPI application তৈরি করবে।

Minimum structure:

```text
apps/api/
    main.py
    dependencies.py

    routers/
        videos.py
        workflows.py
        channels.py
        assets.py
        executions.py
        health.py

    services/
    schemas/
    repositories/
```

Minimum endpoints:

```text
GET  /health

GET  /videos
POST /videos
GET  /videos/{id}
PATCH /videos/{id}

GET  /workflows
POST /workflows
GET  /workflows/{id}
POST /workflows/{id}/versions

GET  /executions
GET  /executions/{id}

GET  /assets
GET  /channels
```

প্রতিটি endpoint-এর জন্য:

- request schema
- response schema
- validation
- error handling
- logging
- authentication boundary
- database transaction boundary

define করবে।

---

# PHASE 4 — EXISTING PIPELINE MUST WORK THROUGH API

এটাই সবচেয়ে গুরুত্বপূর্ণ migration gate।

বর্তমান pipeline-এর কোনো core component সরাসরি external caller-এর জন্য exposed থাকবে না।

যেমন:

```text
old_script.py
```

থেকে সরাসরি:

```text
generate_prompt()
```

call করার architecture ধীরে ধীরে বদলে:

```text
FastAPI
 ↓
Service
 ↓
generate_prompt()
```

করবে।

CLI compatibility দরকার হলে:

```text
CLI
 ↓
Service Layer
```

হবে।

অর্থাৎ CLI এবং API একই business logic ব্যবহার করবে।

```text
             ┌── FastAPI
             │
Business ────┤
Service      │
             └── CLI
```

দুই জায়গায় business logic duplicate করবে না।

---

# PHASE 5 — POSTGRESQL MIGRATION

SQLite থেকে PostgreSQL-এ migration করবে।

কিন্তু database migration করার আগে:

1. schema inventory
2. data inventory
3. foreign-key relationships
4. indexes
5. unique constraints
6. nullable fields
7. timestamps
8. existing IDs
9. orphan records
10. duplicate records

audit করবে।

তারপর:

```text
Alembic
+
SQLAlchemy
+
PostgreSQL
```

ব্যবহার করবে।

Migration reversible/validated হতে হবে যেখানে সম্ভব।

---

# PHASE 6 — WORKFLOW DATA MODEL

Workflow-কে hardcoded Python control flow হিসেবে রাখবে না।

Database model হবে:

```text
workflow_definitions
workflow_versions
workflow_steps
workflow_edges
workflow_executions
step_runs
step_attempts
execution_events
jobs
job_leases
artifacts
external_effects
idempotency_keys
outbox_events
inbox_events
workflow_migrations
audit_logs
schedules
```

---

# PHASE 7 — WORKFLOW VERSIONING

Workflow কখনো in-place destructive edit করবে না।

Example:

```text
Workflow V1
    ↓
copy
    ↓
Workflow V2
```

তারপর V2 modify করবে।

Example:

V1:

```text
research
script
prompt_1
prompt_2
audio
video
youtube
```

V2:

```text
research
script
prompt_1
prompt_2
video
youtube
```

এখানে `audio` V1 history থেকে delete করা যাবে না।

V2-তে remove হবে।

---

# 🔴 WORKFLOW EXECUTION VERSION MUST BE IMMUTABLE

যে execution শুরু হয়েছে:

```text
execution_id = 123
workflow_version_id = 7
```

তার execution V7-এর উপর চলবে।

পরে V8 তৈরি হলেও execution নিজে থেকে V8-এ switch করবে না।

---

# PHASE 8 — STABLE STEP ID

Step-এর identity কখনো numeric position হবে না।

খারাপ:

```text
step_1
step_2
step_3
```

কারণ reorder করলে identity নষ্ট হয়।

ভালো:

```text
research
script.generate
seo.title
prompt.01
prompt.02
video.generate
video.qc
youtube.upload
```

একটি step-এর stable `step_key` থাকবে।

---

# PHASE 9 — DYNAMIC WORKFLOW

User চাইবে:

- add step
- delete step
- disable step
- enable step
- reorder step
- duplicate step
- rename display name
- change configuration
- change retry
- change timeout
- change dependencies

এসব করতে।

কিন্তু existing execution-এর definition mutate করবে না।

নতুন version তৈরি করবে।

---

# PHASE 10 — RUNNING EXECUTION MIGRATION

যদি V1 execution চলতে থাকে এবং user V2-তে migrate করতে চায়:

```text
V1 execution
      ↓
MIGRATION CHECK
      ↓
compatible?
   ↙       ↘
 YES       NO
 ↓          ↓
V2       BLOCKED/DLQ
 ↓
map stable step_keys
 ↓
reuse compatible completed outputs
 ↓
skip removed steps
 ↓
insert new steps as PENDING
 ↓
resume
```

Migration automatic blind operation হবে না।

প্রথমে compatibility check করবে।

---

# PHASE 11 — STEP STATE MACHINE

প্রতিটি step-এর durable state থাকবে:

```text
PENDING
   ↓
CLAIMED
   ↓
RUNNING
   ↓
SUCCESS
```

Failure:

```text
RUNNING
   ↓
FAILED
   ↓
RETRY_WAIT
   ↓
RUNNING
```

Permanent failure:

```text
FAILED
   ↓
DEAD_LETTER
```

Disabled:

```text
SKIPPED
```

---

# PHASE 12 — EXECUTION STATE MACHINE

```text
CREATED
 ↓
QUEUED
 ↓
RUNNING
 ├── SUCCESS
 ├── WAITING_RETRY
 ├── BLOCKED
 ├── FAILED
 ├── DEAD_LETTER
 └── CANCELLED
```

State transition database transaction-এর মাধ্যমে protected হবে।

---

# PHASE 13 — RETRY ENGINE

প্রতিটি step configurable হবে:

```json
{
  "max_attempts": 5,
  "backoff": "exponential",
  "initial_delay": 5,
  "max_delay": 300
}
```

Error classification:

```text
TRANSIENT_NETWORK
RATE_LIMIT
PROVIDER_5XX
BROWSER_CRASH
AUTH_EXPIRED
RESOURCE_EXHAUSTED
INVALID_INPUT
POLICY_ERROR
EXTERNAL_SIDE_EFFECT_UNKNOWN
UNKNOWN
```

সব error retry করা যাবে না।

---

# PHASE 14 — IDEMPOTENCY

External side effect-এর আগে idempotency key তৈরি করবে।

Example:

```text
video_id
+
step_key
+
input_hash
+
operation_type
```

এর ভিত্তিতে:

```text
external_effects
```

record থাকবে।

একই operation দ্বিতীয়বার এলে প্রথমে check করবে:

```text
already completed?
already submitted?
unknown?
```

Unknown হলে blindly retry করবে না।

প্রথমে reconcile করবে।

---

# PHASE 15 — CRASH RECOVERY

Worker crash হলে:

```text
RUNNING
```

state forever আটকে থাকবে না।

প্রতিটি active job-এর:

```text
lease_until
heartbeat_at
worker_id
```

থাকবে।

Lease expire হলে recovery worker job reclaim করবে।

---

# PHASE 16 — OUTBOX / INBOX

Database transaction এবং job dispatch-এর মাঝখানে lost-job problem ঠেকাতে:

```text
outbox_events
```

ব্যবহার করবে।

Worker duplicate message ঠেকাতে:

```text
inbox_events
```

বা equivalent deduplication mechanism ব্যবহার করবে।

---

# PHASE 17 — ARTIFACT MANAGEMENT

Generated:

- scripts
- prompts
- images
- audio
- video
- subtitles
- thumbnails
- metadata

database blob হিসেবে unnecessarily রাখবে না।

Object storage:

```text
MinIO / S3-compatible storage
```

ব্যবহার করবে।

Database-এ থাকবে:

```text
artifact_id
uri
sha256
mime_type
size
created_at
owner
```

---

# PHASE 18 — BROWSER WORKER

Playwright/CloakBrowser/Veo-এর মতো browser automation আলাদা worker হবে।

একটি shared Chrome profile দিয়ে concurrent jobs চালাবে না।

প্রতি job:

```text
isolated browser context/profile
```

ব্যবহার করবে।

Browser crash হলে:

```text
detect
 ↓
restart context
 ↓
reconnect
 ↓
verify current external state
 ↓
continue
```

---

# PHASE 19 — EXTERNAL SIDE EFFECT RULE

যে action external system-এ পরিবর্তন ঘটায়:

```text
Generate
Upload
Publish
Delete
Send
Create
```

সেটা কখনো blindly retry করবে না।

Pattern:

```text
attempt
 ↓
timeout/crash
 ↓
result unknown
 ↓
RECONCILE
 ↓
already happened?
 ├── YES → record result → continue
 └── NO  → retry
```

---

# PHASE 20 — YOUTUBE WORKER

YouTube upload-এর ক্ষেত্রে:

```text
asset SHA256
+
metadata hash
+
channel
```

দিয়ে operation identity তৈরি করবে।

Upload:

```text
reserve operation
 ↓
start resumable upload
 ↓
persist upload session
 ↓
upload
 ↓
network failure?
 ↓
resume same session
 ↓
verify YouTube video ID
 ↓
poll processing status
 ↓
SUCCESS
```

YouTube upload-এর ক্ষেত্রে duplicate prevention এবং reconciliation mandatory।

---

# PHASE 21 — 97-STEP PIPELINE

বর্তমান/ভবিষ্যৎ 97টি stage-কে hardcoded chain হিসেবে লিখবে না।

প্রতিটি হবে configurable workflow step।

Example:

```text
001 research
002 topic validation
003 source collection
004 fact check
005 outline
...
097 analytics optimization
```

কিন্তু numbering শুধুমাত্র display order।

Actual identity হবে:

```text
research.collect
research.validate
script.outline
script.generate
prompt.scene_01
...
```

---

# 🔴 IMPORTANT — AGY MUST NOT SKIP THE 97 STEPS

97টি step-এর মধ্যে কোনো step বর্তমানে প্রয়োজন না হলেও implementation specification থেকে বাদ দেবে না।

বরং status দেবে:

```text
IMPLEMENTED
IN_PROGRESS
BLOCKED
DISABLED
NOT_APPLICABLE
```

কিন্তু নিজের সিদ্ধান্তে:

```text
REMOVED
```

করবে না।

যদি কোনো step user-এর workflow configuration-এ disabled থাকে, runtime সেই configuration অনুযায়ী skip করতে পারবে।

কিন্তু architecture-এর capability অবশ্যই থাকতে হবে।

---

# PHASE 22 — STEP REGISTRY

প্রতিটি step-এর metadata থাকবে:

```text
step_key
display_name
description
step_type
worker_type
enabled
timeout
max_attempts
retry_policy
input_schema
output_schema
dependency
idempotency_policy
side_effect_type
version
```

এতে ভবিষ্যতে নতুন step যোগ করা যাবে।

---

# PHASE 23 — STEP TYPES

কমপক্ষে:

```text
LLM
PYTHON
BROWSER
HTTP
MEDIA
YOUTUBE
FILE
CONDITION
TRANSFORM
WAIT
MANUAL_APPROVAL
SUBWORKFLOW
```

support করার মতো architecture রাখবে।

---

# PHASE 24 — CONDITIONAL WORKFLOW

Workflow শুধু linear হবে না।

Support:

```text
A → B → C
```

এবং:

```text
A
├── condition=true → B
└── condition=false → C
```

এবং parallel:

```text
       ┌── SEO
Research
       └── Thumbnail
```

তারপর:

```text
SEO ─────┐
         ├── Publish
Thumbnail┘
```

---

# PHASE 25 — WORKFLOW UI

API architecture stable হওয়ার পরে UI তৈরি করবে।

UI-তে:

```text
Dashboard
Videos
Workflows
Workflow Builder
Workflow Versions
Executions
Step Runs
Retries
DLQ
Channels
Assets
Schedules
Analytics
Logs
Audit
Settings
```

থাকবে।

---

# PHASE 26 — WORKFLOW BUILDER

User যেন করতে পারে:

```text
ADD STEP
DELETE STEP
DUPLICATE
DISABLE
ENABLE
REORDER
CONNECT
DISCONNECT
EDIT CONFIG
EDIT RETRY
EDIT TIMEOUT
SAVE AS VERSION
PUBLISH VERSION
```

Published version immutable থাকবে।

---

# PHASE 27 — WORKFLOW ENGINE INTEGRATION

API + DB + service layer + workers stable হওয়ার পরে workflow engine নির্বাচন/ইন্টিগ্রেশন করবে।

Candidate:

```text
Windmill
Temporal
DBOS
Kestra
Hatchet
```

Engine নির্বাচন হবে requirements-এর ভিত্তিতে।

শুধু popularity দেখে নির্বাচন করবে না।

---

# PHASE 28 — SOURCE OF TRUTH RULE

Business data-এর source of truth:

```text
PostgreSQL
```

Workflow definition:

```text
PostgreSQL workflow version
```

হবে।

Orchestrator-এর runtime state এবং ERP business state-এর boundary explicitly define করবে।

দুই জায়গায় একই data independently mutate করে inconsistency তৈরি করবে না।

---

# PHASE 29 — OBSERVABILITY

প্রতিটি execution-এর জন্য:

```text
execution_id
step_run_id
attempt_id
worker_id
started_at
completed_at
duration
status
error_type
error_message
input_hash
output_hash
```

রেকর্ড করবে।

---

# PHASE 30 — AUDIT

Audit log immutable হবে।

Record:

```text
who
what
when
old_value
new_value
workflow_version
execution_id
```

যেমন:

```text
User changed workflow V3 → V4
User disabled audio step
User changed retry 3 → 5
User migrated execution 123
```

সব traceable হতে হবে।

---

# PHASE 31 — TESTING IS NOT OPTIONAL

প্রতিটি architecture phase-এর শেষে test লিখবে।

Minimum failure tests:

```text
worker crash
machine restart
database restart
network failure
API 429
API 500
browser crash
browser timeout
duplicate job
duplicate request
duplicate external effect
lease expiration
workflow version change
step deletion
step insertion
step reorder
step disable
step duplication
migration failure
YouTube upload interruption
YouTube processing failure
```

---

# PHASE 32 — CHAOS / CRASH TEST

বিশেষভাবে test করবে:

```text
kill worker during step
kill worker immediately after external side effect
kill worker before DB commit
kill worker after DB commit
network disconnect during upload
database disconnect during execution
```

তারপর verify করবে:

```text
No lost job
No stuck job
No duplicate external side effect
No corrupted execution state
```

---

# 🔴 DEFINITION OF DONE

কোনো phase তখনই COMPLETE বলা যাবে যখন:

```text
Implementation
+
Unit Test
+
Integration Test
+
Failure Test
+
Verification
+
Documentation
```

সব complete।

শুধু code লিখে:

> “Done”

বলবে না।

---

# 🔴 MANDATORY PROGRESS REPORT

প্রতিটি কাজের আগে এই table maintain করবে:

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| 001 | Project audit | | |
| 002 | API boundary | | |
| 003 | Service layer | | |
| 004 | PostgreSQL | | |
| 005 | FastAPI | | |
| ... | ... | | |
| 097 | Analytics optimization | | |

Status শুধুমাত্র:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
IMPLEMENTED
TESTED
VERIFIED
```

হতে পারবে।

`SKIPPED` ব্যবহার করা যাবে না, যদি না user explicitly কোনো step skip করার নির্দেশ দেয়।

---

# 🔴 MANDATORY STOP-AND-REPORT RULE

যদি কোনো requirement implement করতে গিয়ে difficulty হয়:

কাজ বন্ধ করে architecture simplify করে requirement বাদ দেবে না।

বরং report করবে:

```text
BLOCKED REQUIREMENT:
...

WHY:
...

ROOT CAUSE:
...

DEPENDENCY:
...

PROPOSED SOLUTION:
...

RISK:
...

NEXT ACTION:
...
```

তারপর prerequisite implement করবে।

---

# 🔴 NO BIG-BANG REWRITE

বর্তমান project একসাথে rewrite করবে না।

Migration হবে:

```text
Existing Code
      ↓
Wrap
      ↓
Service Layer
      ↓
API
      ↓
Test
      ↓
Replace Direct Dependency
      ↓
Remove Legacy Path
```

প্রতিটি stage working থাকতে হবে।

---

# 🔴 LEGACY CODE RULE

পুরনো code দেখেই delete করবে না।

প্রথমে:

```text
identify
 ↓
replace
 ↓
test
 ↓
verify
 ↓
deprecate
 ↓
remove
```

করবে।

---

# 🔴 BEFORE EVERY MAJOR CHANGE

পরিবর্তনের আগে আমাকে/প্রজেক্টে একটি ছোট plan দেবে:

```text
Current state
Target state
Files affected
Database affected
API affected
Risk
Rollback plan
Tests
```

তারপর implementation করবে।

---

# FINAL ARCHITECTURE TARGET

শেষে architecture হবে:

```text
                    ┌───────────────┐
                    │   React ERP   │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    FastAPI    │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Service Layer │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        PostgreSQL      Object Store    Redis/Queue
              │
              ▼
       Workflow Definition
              │
              ▼
       Workflow Orchestrator
              │
       ┌──────┼─────────┬──────────┐
       ▼      ▼         ▼          ▼
      LLM   Browser    Media     YouTube
    Worker   Worker    Worker     Worker
       │      │         │          │
       └──────┴─────────┴──────────┘
                    │
                    ▼
             Execution Events
                    │
                    ▼
              Logs / Audit / DLQ
```

# FINAL COMMAND TO AGY

এই specification-এর উদ্দেশ্য হলো existing project-কে একবারে rewrite করা নয়।

প্রথম লক্ষ্য:

**CURRENT PROJECT → API-FIRST ARCHITECTURE**

তাই প্রথমে শুধুমাত্র:

1. পুরো project audit করো।
2. current architecture map করো।
3. database access map করো।
4. business logic map করো।
5. external side effects map করো।
6. migration risks identify করো।
7. FastAPI + Service Layer target architecture তৈরি করো।
8. PostgreSQL migration strategy তৈরি করো।
9. প্রথম migration phase implement করো।
10. tests চালাও।
11. evidence দেখাও।
12. তারপর পরবর্তী phase-এ যাও।

**FastAPI/API migration complete এবং verified হওয়ার আগে Workflow Engine integration শুরু করবে না।**

এবং সবচেয়ে গুরুত্বপূর্ণ:

> **কোনো requirement নিজের সিদ্ধান্তে বাদ দেওয়া যাবে না।**
>
> **Difficulty ≠ permission to skip.**
>
> **Blocked ≠ skipped.**
>
> **Disabled ≠ removed.**
>
> **Version change ≠ mutation of running execution.**
>
> **Failure ≠ workflow abandonment.**
>
> **Implementation ≠ completion; verification ছাড়া কোনো phase complete নয়।**