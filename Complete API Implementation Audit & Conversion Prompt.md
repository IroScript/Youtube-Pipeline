# MASTER DIRECTIVE — COMPLETE API SYSTEM IMPLEMENTATION

তোমার কাজ হলো আমার সম্পূর্ণ YouTube Pipeline-কে **API-COMPLETE / API-FIRST SYSTEM** হিসেবে বাস্তবায়ন করা।

## মূল সিদ্ধান্ত

আমি শুধু যেসব requirement-এ REST API explicitly লেখা আছে সেগুলোতে API চাই না।

**আমার requirement হলো: pipeline-এর প্রতিটি meaningful capability API-এর মাধ্যমে accessible, triggerable এবং observable হতে হবে।**

অর্থাৎ কোনো গুরুত্বপূর্ণ কাজ যেন শুধুমাত্র:

- direct Python function call
- internal module call
- CLI command
- hard-coded script execution
- manual database operation

এর ওপর নির্ভরশীল না থাকে।

Internal Service/Engine থাকতে পারবে, কিন্তু তার capability-কে API layer-এর মাধ্যমে expose করতে হবে যেখানে সেই capability externally trigger/read/manage করার যৌক্তিক প্রয়োজন আছে।

---

# 1. API-COMPLETE ARCHITECTURE

Target architecture:

Client / UI / Automation / Scheduler
            ↓
        REST API
            ↓
     API Router / DTO
            ↓
      Service Layer
            ↓
 Worker / Engine / Adapter
            ↓
 Database / External Services

**IMPORTANT:**

API layer শুধু dummy wrapper হবে না।

প্রতিটি endpoint অবশ্যই বাস্তব Service/Worker/Engine capability-এর সঙ্গে connected হতে হবে।

---

# 2. FIRST TASK — COMPLETE CAPABILITY INVENTORY

প্রথমে সম্পূর্ণ codebase scan করো।

কোনো implementation পরিবর্তন করার আগে identify করো:

- সব Python modules
- সব services
- সব engines
- সব workers
- সব repositories
- সব CLI commands
- সব pipeline stages
- সব database operations
- সব external integrations
- সব important functions
- সব state transitions
- সব background jobs
- সব existing REST endpoints

তারপর একটি API Capability Matrix তৈরি করো:

| Capability | Current Implementation | Current Access | API Needed | Endpoint | HTTP Method | Status |
|---|---|---|---|---|---|---|

কোনো capability বাদ দেবে না।

---

# 3. API-FIRST RULE

প্রতিটি গুরুত্বপূর্ণ pipeline operation-এর জন্য API contract নির্ধারণ করো।

উদাহরণ:

### Idea

POST /ideas/elements/{element_id}/generate

GET /ideas/elements/{element_id}/ideas

GET /ideas/{idea_id}

### Prompt

POST /prompts/{idea_id}/escalate

POST /prompts/{idea_id}/fillup

GET /prompts/{prompt_id}

GET /prompts/{prompt_id}/status

### SEO

POST /seo/{id}/generate

GET /seo/{id}

GET /seo/{id}/status

### Video

POST /videos/{id}/generate

GET /videos/{id}

GET /videos/{id}/status

GET /videos/{id}/render-payload

### Package

POST /packages/{id}/build

GET /packages/{id}

GET /packages/{id}/status

এগুলো শুধু উদাহরণ।

**Actual endpoint list codebase + master requirements + complete capability inventory দেখে নির্ধারণ করবে।**

---

# 4. NO API GAP

Audit করার সময় শুধু existing requirements-এর endpoint খুঁজবে না।

বরং প্রশ্ন করবে:

> "এই system-এর কোনো meaningful capability কি API ছাড়া শুধুমাত্র internal function/CLI দিয়ে ব্যবহার করতে হচ্ছে?"

যদি উত্তর YES হয়:

→ API candidate হিসেবে mark করো।

তারপর endpoint implement করো।

---

# 5. API MUST CONTROL THE COMPLETE PIPELINE

আমার লক্ষ্য হলো external client যেন API ব্যবহার করে পুরো pipeline operate করতে পারে।

অর্থাৎ:

Category
→ Element
→ Ideas
→ Prompt Generation
→ Prompt Escalation
→ SEO Research
→ SEO Generation
→ Video Generation
→ Validation
→ Packaging
→ Export
→ Publishing/Output

প্রতিটি meaningful stage API-এর মাধ্যমে trigger, query এবং status-monitor করা সম্ভব হতে হবে।

---

# 6. LONG-RUNNING JOBS

দীর্ঘ-running কাজ synchronous HTTP request-এর মধ্যে আটকে রেখো না।

এই pattern ব্যবহার করো:

POST /resource/{id}/generate

Response:

202 Accepted

তারপর:

GET /jobs/{job_id}

অথবা:

GET /resource/{id}/status

Job lifecycle:

PENDING
→ QUEUED
→ RUNNING
→ SUCCEEDED

অথবা:

FAILED
CANCELLED
RETRYING

API থেকে job trigger হবে এবং worker actual execution করবে।

এতে architecture API-driven থাকবে কিন্তু HTTP request unnecessarily block করবে না।

---

# 7. INTERNAL FUNCTIONS

Internal functions delete করার দরকার নেই।

কিন্তু architecture হবে:

API
→ Service
→ Engine

না যে:

API
→ duplicated business logic

একই business logic দুই জায়গায় লিখবে না।

API শুধু orchestration/boundary layer হিসেবে কাজ করবে।

---

# 8. EVERY IMPORTANT OPERATION NEEDS OBSERVABILITY

যে operation API দিয়ে trigger করা যায় তার:

- request ID
- job ID
- entity ID
- current status
- start time
- completion time
- error
- retry count
- result

observable হতে হবে।

---

# 9. IDEMPOTENCY

Generate/create ধরনের endpoint-এ duplicate execution প্রতিরোধ করতে হবে।

বিশেষ করে:

POST /ideas/.../generate
POST /prompts/.../escalate
POST /seo/.../generate
POST /videos/.../generate
POST /packages/.../build

প্রয়োজনে:

Idempotency-Key

ব্যবহার করো।

একই request পুনরায় পাঠালে duplicate job/resource তৈরি করা যাবে না।

---

# 10. API CONTRACT

প্রতিটি endpoint-এর জন্য:

- Request schema
- Response schema
- HTTP status code
- Validation
- Error response
- Authentication requirement
- Idempotency behavior
- Async/sync behavior
- OpenAPI documentation

নির্ধারণ করো।

FastAPI + Pydantic ব্যবহার করলে typed DTO contract বজায় রাখো।

---

# 11. ERROR HANDLING

প্রতিটি API-এর consistent error format থাকতে হবে।

উদাহরণ:

{
  "error": {
    "code": "VIDEO_GENERATION_FAILED",
    "message": "...",
    "request_id": "...",
    "job_id": "...",
    "details": {}
  }
}

Internal exception সরাসরি client-এর কাছে leak করবে না।

---

# 12. API SECURITY

API system-এর জন্য:

- authentication
- authorization
- CORS
- input validation
- rate limiting যেখানে প্রয়োজন
- sensitive error protection
- request size limits
- secure configuration

implement করো।

---

# 13. DATABASE ACCESS

Client যেন direct database access করতে না পারে।

Architecture:

Client
→ API
→ Service
→ Repository
→ Database

কোনো UI/client/API consumer-এর জন্য direct SQLite/PostgreSQL query exposure গ্রহণযোগ্য নয়।

---

# 14. CLI

CLI থাকতে পারে।

কিন্তু CLI যেন system-এর একমাত্র execution interface না হয়।

যেখানে meaningful operation API দিয়ে করা সম্ভব:

CLI
→ API অথবা
CLI
→ একই Service Layer

একই business logic duplicate করবে না।

---

# 15. API TESTING

প্রতিটি endpoint-এর জন্য automated test তৈরি/চালাও:

### Contract test
Endpoint exists?

### Request validation test
Invalid request correctly rejected?

### Authentication test

### Business logic test

### Database persistence test

### Error handling test

### Idempotency test

### Async job test

### End-to-end API test

শুধু `200 OK` পেলেই endpoint PASS হিসেবে গণ্য করবে না।

বাস্তব side effect যাচাই করতে হবে।

---

# 16. API ENDPOINT COMPLETENESS AUDIT

শেষে এই প্রশ্নের উত্তর দিতে হবে:

> "আমি যদি Python internal functions, CLI এবং direct database access একদম না ব্যবহার করে শুধুমাত্র documented REST API ব্যবহার করি, তাহলে কি সম্পূর্ণ YouTube Pipeline operate করতে পারি?"

যদি উত্তর NO হয়:

→ API gap identify করো।

→ implementation করো।

→ test করো।

→ পুনরায় audit করো।

**NO GAP না পাওয়া পর্যন্ত কাজ শেষ ঘোষণা করবে না।**

---

# 17. CRITICAL RULE — DO NOT FALSELY DECLARE COMPLETE

কোনো endpoint শুধু file-এ লেখা থাকলে implemented বলবে না।

নিম্নলিখিত সব সত্য হতে হবে:

1. Route exists
2. DTO exists
3. Validation works
4. Service connected
5. Real business logic executes
6. Database state changes correctly
7. Errors handled
8. Async jobs work where required
9. Status observable
10. Automated test passes

তারপরই:

**IMPLEMENTED + VERIFIED**

বলবে।

---

# 18. EXISTING REQUIREMENTS MUST NOT BE BROKEN

API expansion করতে গিয়ে existing 97 requirements নষ্ট করা যাবে না।

প্রতিটি change-এর আগে এবং পরে regression test চালাও।

বিশেষ করে:

- existing endpoints
- services
- repositories
- database schema
- workers
- state machines
- idempotency
- retry/DLQ
- DAG execution
- export
- existing E2E pipeline

verify করো।

---

# 19. FINAL API MAP

Implementation শেষে সম্পূর্ণ API catalog তৈরি করো:

| Method | Endpoint | Purpose | Sync/Async | Auth | Service | Test | Status |
|---|---|---|---|---|---|---|---|

কোনো undocumented API রাখবে না।

---

# 20. FINAL ACCEPTANCE CRITERIA

System তখনই **API-COMPLETE** হিসেবে PASS করবে যখন:

### A
প্রতিটি meaningful externally controllable capability API-accessible।

### B
কোনো গুরুত্বপূর্ণ pipeline stage শুধুমাত্র hidden Python function দিয়ে চালাতে হচ্ছে না।

### C
API → Service → Engine/Worker architecture বজায় আছে।

### D
Long-running কাজ asynchronous job model ব্যবহার করে।

### E
প্রতিটি গুরুত্বপূর্ণ operation-এর status API দিয়ে জানা যায়।

### F
Duplicate execution প্রতিরোধ করা যায়।

### G
Authentication/authorization/security boundary আছে।

### H
OpenAPI contract সম্পূর্ণ।

### I
Automated API tests বাস্তব behavior যাচাই করে।

### J
শুধু mock/dry-run নয়—যেখানে environment available সেখানে real execution verify করতে হবে।

---

# EXECUTION PROTOCOL

**একবারে সবকিছু আন্দাজ করে implementation করবে না।**

এই sequence অনুসরণ করো:

1. পুরো repository audit
2. capability inventory
3. existing API inventory
4. API gap analysis
5. complete endpoint map
6. implementation plan
7. implementation
8. unit tests
9. integration tests
10. API contract tests
11. E2E API tests
12. regression tests
13. final API completeness audit

কোনো gap থাকলে কাজ শেষ বলবে না।

**সবচেয়ে গুরুত্বপূর্ণ: আমার system-এর architecture-কে "only the 15 explicitly required APIs" হিসেবে সীমাবদ্ধ করবে না।**

আমার নির্দেশ:

> **BUILD THE COMPLETE API ACCESS LAYER FOR THE ENTIRE SYSTEM.**

Existing business logic পুনরায় লিখবে না; প্রয়োজন অনুযায়ী সেটিকে API boundary-এর পেছনে expose/orchestrate করবে।

শেষে আমাকে শুধু "API implemented" বলবে না।

প্রমাণসহ দেখাবে:

- কতগুলো capability পেয়েছ
- কতগুলো API already ছিল
- কতগুলো API missing ছিল
- কতগুলো নতুন endpoint তৈরি হয়েছে
- কোন capability কোন endpoint দিয়ে accessible
- কতগুলো API test pass করেছে
- কোনো API gap এখনও আছে কি না
- কোনো limitation থাকলে ঠিক কী limitation

**API-COMPLETE না হওয়া পর্যন্ত final completion verdict দেবে না।**