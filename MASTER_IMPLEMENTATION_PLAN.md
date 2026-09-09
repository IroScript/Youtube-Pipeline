# 🚀 MASTER IMPLEMENTATION PLAN: 097 REQUIREMENTS EXECUTION LOCK
## YouTube Content Automation ERP & Durable Workflow Platform

**ওয়ার্কস্পেস পাথ:** `file:///C:/Users/Irak/Desktop/Youtube%20Pipeline`  
**তারিখ:** ৬ সেপ্টেম্বর ২০২৬  
**প্রস্তুতকারক:** Antigravity AI Coding Assistant  
**ক্লায়েন্ট:** ইরাক ভাইয়া  
**স্ট্যাটাস:** ACTIVE / LOCKED FOR CONTINUOUS SEQUENTIAL EXECUTION  
**ডেটাবেস ব্যাকআপ ভেরিফাইড:** `file:///C:/Users/Irak/Desktop/Youtube%20Pipeline/PromptDatabase/database/youtube_pipeline.db.backup_master_20260906`

---

## ১. ভূমিকা ও জিরো-স্কিপ এনফোর্সমেন্ট রুলস

এই প্রজেক্টের মোট রিকোয়ারমেন্টের সংখ্যা **০৯৭টি**। কোনো রিকোয়ারমেন্ট স্কিপ করা যাবে না, কোনো রিকোয়ারমেন্ট ঐচ্ছিক বা ফিচার ব্যাকলগ হিসেবে বাদ দেওয়া যাবে না। প্রতিটি রিকোয়ারমেন্ট ডিপেনডেন্সি গ্রাফ অনুযায়ী ধাপে ধাপে ইমপ্লিমেন্ট ও ভেরিফাই করা হবে।

### স্ট্যাটাস ডেফিনিশন:
1. `NOT_STARTED`: ডিপেনডেন্সি পূরণ না হওয়া পর্যন্ত অপেক্ষমান।
2. `IN_PROGRESS`: বর্তমান ব্যাচে কাজ চলমান।
3. `IMPLEMENTED`: কোড লেখা সম্পন্ন হয়েছে কিন্তু ভেরিফিকেশন টেস্ট এখনো বাকি।
4. `TESTED`: ইউনিট ও ইন্টিগ্রেশন টেস্ট সফলভাবে উত্তীর্ণ।
5. `VERIFIED`: কোড + টেস্ট + রানটাইম প্রুফ ও আর্টফ্যাক্ট সংরক্ষিত।
6. `BLOCKED`: বাহ্যিক কোনো ডিপেনডেন্সি বা রিসোর্সের অভাবে আটকে আছে (কারণ ও প্রি-রিকুইজিট সহ নথিভুক্ত)।

---

## ২. পূর্ণাঙ্গ ০৯৭ রিকোয়ারমেন্ট ট্র্যাকিং মেট্রিক্স (001–097 Matrix)

| ID | Requirement Name | Status | Dependency | Planned Phase | Evidence / Traceability |
|---:|---|:---:|:---:|:---:|---|
| **001** | Project Forensic Audit & Baseline Inventory | **VERIFIED** | — | Phase 0 | `file:///C:/Users/Irak/.gemini/antigravity-cli/brain/d4614d38-b94d-468e-8348-6c15742fabb3/FORENSIC_AUDIT_REPORT.md` |
| **002** | Architectural Boundary Directory Structure | **VERIFIED** | 001 | Phase 1 | `apps/`, `domain/`, `services/`, `repositories/`, `infrastructure/`, `shared/` |
| **003** | Generic Base Repository Pattern | **VERIFIED** | 002 | Phase 1 | `repositories/base_repository.py` |
| **004** | Idea & Category Repository | **VERIFIED** | 003 | Phase 1 | `repositories/idea_repository.py` |
| **005** | Prompt & Escalation Repository | **VERIFIED** | 003 | Phase 1 | `repositories/prompt_repository.py` |
| **006** | Video & Task Repository | **VERIFIED** | 003 | Phase 1 | `repositories/video_repository.py` |
| **007** | SEO & Metadata Repository | **VERIFIED** | 003 | Phase 1 | `repositories/seo_repository.py` |
| **008** | Asset & Artifact Repository | **VERIFIED** | 003 | Phase 1 | `repositories/asset_repository.py` |
| **009** | Multi-DB Engine & Session Abstraction | **VERIFIED** | 003 | Phase 1 | `infrastructure/database/engine.py`, `session.py` |
| **010** | Idea & Research Business Service | **VERIFIED** | 004, 009 | Phase 2 | `services/research/idea_service.py` |
| **011** | Prompt Escalation Service (10-Level Escalation) | **VERIFIED** | 005, 010 | Phase 2 | `services/scripting/prompt_service.py` |
| **012** | SEO Intelligence & Metadata Builder Service | **VERIFIED** | 007, 009 | Phase 2 | `services/seo/seo_service.py` |
| **013** | Video Render Dispatch & Extension Bridge Service | **VERIFIED** | 006, 009 | Phase 2 | `services/video/video_service.py` |
| **014** | Audio & Voice Synthesis Service (TTS Adapter) | **VERIFIED** | 008, 009 | Phase 2 | `services/audio/audio_service.py` |
| **015** | Media Assembly & Stitcher Service (OpenCV/FFmpeg) | **VERIFIED** | 008, 014 | Phase 2 | `services/video/media_stitcher_service.py` |
| **016** | Package Manifest & File Packager Service | **VERIFIED** | 006, 008 | Phase 2 | `services/packaging/package_service.py` |
| **017** | Social Media & YouTube Upload Service | **VERIFIED** | 006, 016 | Phase 2 | `services/youtube/youtube_service.py` |
| **018** | CSV Export & Real-time Reporting Service | **VERIFIED** | 004-008 | Phase 2 | `services/export_service.py` |
| **019** | FastAPI Core Application & Lifespan Hooks | **VERIFIED** | 010-018 | Phase 3 | `apps/api/main.py`, `dependencies.py` |
| **020** | Pydantic v2 Domain Contracts & DTO Schemas | **VERIFIED** | 019 | Phase 3 | `shared/contracts/schemas.py` |
| **021** | Health Check & Telemetry Endpoint (`/health`) | **VERIFIED** | 019, 020 | Phase 3 | `apps/api/routers/health.py` |
| **022** | Idea & Category Management Endpoints (`/ideas`) | **VERIFIED** | 019, 020 | Phase 3 | `apps/api/routers/ideas.py` |
| **023** | Prompt Escalation Endpoints (`/prompts`) | **VERIFIED** | 019, 020 | Phase 3 | `apps/api/routers/prompts.py` |
| **024** | SEO Optimization Endpoints (`/seo`) | **VERIFIED** | 019, 020 | Phase 3 | `apps/api/routers/seo.py` |
| **025** | Video Generation & Asset Endpoints (`/videos`) | **VERIFIED** | 019, 020 | Phase 3 | `apps/api/routers/videos.py` |
| **026** | Packaging Endpoints (`/packages`) | **VERIFIED** | 019, 020 | Phase 3 | `apps/api/routers/packages.py` |
| **027** | Authentication, CORS & Security Boundary | **VERIFIED** | 019 | Phase 3 | `apps/api/main.py` CORS setup |
| **028** | Transaction Middleware & Exception Mappers | **VERIFIED** | 019 | Phase 3 | FastAPI exception handlers |
| **029** | Unified CLI-to-Service Layer Invocation | **VERIFIED** | 010-018 | Phase 4 | `apps/cli/unified_runner.py` service caller |
| **030** | API-Triggered Single Video Pipeline Cycle | **PARTIALLY_VERIFIED** | 013, 025 | Phase 4 | `POST /videos/{id}/generate` dry-run verified; live render requires browser |
| **031** | API-Triggered Prompt & SEO Fillup Loop | **PARTIALLY_VERIFIED** | 011, 012 | Phase 4 | `POST /prompts/{id}/fillup` dry-run verified; live fillup requires browser |
| **032** | Stage Gate Evaluator as Service & Endpoint | **VERIFIED** | 010-016 | Phase 4 | `GET /ideas/{id}/gates`, `/ideas/gates/summary` |
| **033** | Backward-Compatible Legacy Wrappers | **VERIFIED** | 029 | Phase 4 | Non-breaking adapters preserved |
| **034** | CLI Command Adapters Delegating to Service | **VERIFIED** | 029 | Phase 4 | `apps/cli/unified_runner.py` |
| **035** | PostgreSQL Target Schema Definition | **VERIFIED** | 009 | Phase 5 | `domain/schema_pg.sql` DDL verified |
| **036** | Alembic Migration Setup & Initial Revision | **VERIFIED** | 035 | Phase 5 | `infrastructure/database/alembic/` & initial revision |
| **037** | Foreign Key, Index, and Constraint Audit | **VERIFIED** | 035 | Phase 5 | `scripts/audit_constraints.py` passed (0 orphans, 70 indexes) |
| **038** | SQLite to PostgreSQL Data Migrator & Validator | **PARTIALLY_VERIFIED** | 036, 037 | Phase 5 | `scripts/migrate_sqlite_to_pg.py` (14 tables, 1739 records validated) |
| **039** | UUID Primary Key Architecture with Int ID Map | **VERIFIED** | 035 | Phase 5 | Dual ID support in models & queries |
| **040** | JSONB Payload Optimization | **VERIFIED** | 035 | Phase 5 | PostgreSQL JSONB column types mapped |
| **041** | Dual-Engine Auto-Switcher Connection Manager | **VERIFIED** | 009, 035 | Phase 5 | `DATABASE_URL` dynamic switching verified |
| **042** | Database Safety, Backup & Rollback Protocol | **VERIFIED** | 038 | Phase 5 | `scripts/db_safety.py` SHA256 backup & verify passed |
| **043** | Workflow Definitions Model (`workflows`) | NOT_STARTED | 035 | Phase 6 | `domain/workflows/models.py` |
| **044** | Immutable Workflow Versions Model (`versions`) | NOT_STARTED | 043 | Phase 6 | `domain/workflows/version_model.py` |
| **045** | Workflow Graph DAG Model (Nodes & Edges) | NOT_STARTED | 044 | Phase 6 | `domain/workflows/dag_model.py` |
| **046** | Execution State Model (`workflow_executions`) | NOT_STARTED | 044 | Phase 6 | `domain/workflows/execution_model.py` |
| **047** | Step Run Model (`step_runs`) | NOT_STARTED | 046 | Phase 6 | `domain/workflows/step_run_model.py` |
| **048** | Step Attempt History Model (`step_attempts`) | NOT_STARTED | 047 | Phase 6 | `domain/workflows/attempt_model.py` |
| **049** | Distributed Job Leases (`jobs`, `job_leases`) | NOT_STARTED | 047 | Phase 6 | `domain/workflows/job_model.py` |
| **050** | Execution Event Journal (`execution_events`) | NOT_STARTED | 046 | Phase 6 | `domain/workflows/event_model.py` |
| **051** | Workflow Migration Log (`workflow_migrations`) | NOT_STARTED | 044 | Phase 6 | `domain/workflows/migration_model.py` |
| **052** | Step State Machine Implementation | NOT_STARTED | 047 | Phase 7 | `services/workflow/step_state_machine.py` |
| **053** | Execution State Machine Implementation | NOT_STARTED | 046 | Phase 7 | `services/workflow/exec_state_machine.py` |
| **054** | Stable Step Key Catalog & Registry | NOT_STARTED | 045 | Phase 7 | `domain/workflows/step_registry.py` |
| **055** | Execution DAG Dependency Resolver | NOT_STARTED | 045, 054 | Phase 7 | `services/workflow/dag_resolver.py` |
| **056** | Conditional Branching Evaluator | NOT_STARTED | 055 | Phase 7 | `services/workflow/branch_evaluator.py` |
| **057** | Parallel Step Orchestrator | NOT_STARTED | 055 | Phase 7 | `services/workflow/parallel_orchestrator.py`|
| **058** | Execution Checkpointing Engine | NOT_STARTED | 050, 052 | Phase 7 | `services/workflow/checkpoint_engine.py` |
| **059** | Dynamic Step Configuration Engine | NOT_STARTED | 054 | Phase 7 | `domain/workflows/config_engine.py` |
| **060** | Pluggable Step Type Handlers (12 Types) | NOT_STARTED | 054 | Phase 7 | `domain/workflows/step_types/` |
| **061** | Granular Error Classification Engine | NOT_STARTED | 048 | Phase 8 | `shared/errors/classifier.py` |
| **062** | Exponential Backoff & Jitter Engine | NOT_STARTED | 061 | Phase 8 | `services/reliability/backoff.py` |
| **063** | Worker Lease Heartbeat Monitor | NOT_STARTED | 049 | Phase 8 | `services/reliability/heartbeat.py` |
| **064** | Orphaned Job Recovery Engine | NOT_STARTED | 049, 063 | Phase 8 | `services/reliability/recovery.py` |
| **065** | Dead Letter Queue (DLQ) Engine | NOT_STARTED | 047, 061 | Phase 8 | `services/reliability/dlq.py` |
| **066** | Transactional Outbox Engine (`outbox_events`) | NOT_STARTED | 050 | Phase 8 | `services/reliability/outbox.py` |
| **067** | Idempotent Inbox Deduplication (`inbox_events`) | NOT_STARTED | 066 | Phase 8 | `services/reliability/inbox.py` |
| **068** | Browser Crash Recovery & Profile Manager | NOT_STARTED | 061 | Phase 8 | `infrastructure/browser/recovery.py` |
| **069** | Graceful Process Shutdown & Signal Hooks | NOT_STARTED | 063 | Phase 8 | `shared/lifecycle/shutdown.py` |
| **070** | Deterministic Idempotency Key Generator | NOT_STARTED | 046 | Phase 9 | `shared/idempotency/key_gen.py` |
| **071** | External Effect Reservation Ledger | NOT_STARTED | 070 | Phase 9 | `domain/effects/ledger_model.py` |
| **072** | External Side-Effect Reconciler | NOT_STARTED | 071 | Phase 9 | `services/reliability/reconciler.py` |
| **073** | Resumable YouTube Upload Manager | NOT_STARTED | 017, 071 | Phase 9 | `services/youtube/resumable_session.py` |
| **074** | Duplicate YouTube Upload Guard (SHA256) | NOT_STARTED | 071, 073 | Phase 9 | `services/youtube/duplicate_guard.py` |
| **075** | Veo 3.1 Render Deduplicator & Tracker | NOT_STARTED | 013, 071 | Phase 9 | `services/video/render_dedup.py` |
| **076** | Content-Addressed Artifact Store (SHA256) | NOT_STARTED | 008, 071 | Phase 9 | `services/assets/artifact_store.py` |
| **077** | Dynamic Workflow Builder API | NOT_STARTED | 044, 054 | Phase 10 | `apps/api/routers/workflow_builder.py` |
| **078** | Immutable Workflow Version Publisher | NOT_STARTED | 044, 077 | Phase 10 | `services/workflow/publisher.py` |
| **079** | Execution Compatibility Validator | NOT_STARTED | 044, 046 | Phase 10 | `services/workflow/compatibility.py` |
| **080** | Execution Migration Engine (V1 -> V2) | NOT_STARTED | 079 | Phase 10 | `services/workflow/migration_engine.py` |
| **081** | Completed Step Output Cache Reuser | NOT_STARTED | 080 | Phase 10 | `services/workflow/output_cache.py` |
| **082** | Dynamic Step Insertion & Bypass Engine | NOT_STARTED | 080 | Phase 10 | `services/workflow/graph_mutator.py` |
| **083** | Workflow Rollback Engine | NOT_STARTED | 080 | Phase 10 | `services/workflow/rollback_engine.py` |
| **084** | Standalone Worker Base Framework | NOT_STARTED | 049, 063 | Phase 11 | `workers/base_worker.py` |
| **085** | Dedicated LLM Worker (ChatGPT/Claude) | NOT_STARTED | 084 | Phase 11 | `workers/llm_worker.py` |
| **086** | Dedicated Isolated Browser Worker (Veo/Cloak) | NOT_STARTED | 084 | Phase 11 | `workers/browser_worker.py` |
| **087** | Dedicated Media Worker (FFmpeg/OpenCV) | NOT_STARTED | 084 | Phase 11 | `workers/media_worker.py` |
| **088** | Dedicated YouTube Uploader Worker | NOT_STARTED | 073, 084 | Phase 11 | `workers/youtube_worker.py` |
| **089** | Workflow Engine Adapter (Windmill/Temporal/DBOS)| NOT_STARTED | 055, 084 | Phase 11 | `infrastructure/orchestrator/adapter.py` |
| **090** | Distributed Job Dispatcher | NOT_STARTED | 049, 084 | Phase 11 | `services/workflow/job_dispatcher.py` |
| **091** | Immutable Audit Log Ledger (`audit_logs`) | NOT_STARTED | 035, 046 | Phase 12 | `domain/audit/audit_model.py` |
| **092** | Structured JSON Telemetry & Observability | NOT_STARTED | 091 | Phase 12 | `shared/telemetry/tracer.py` |
| **093** | Chaos Test Suite (Worker Kill, DB Outage) | NOT_STARTED | 064, 084 | Phase 12 | `tests/chaos/test_worker_crash.py` |
| **094** | Execution Replay & Step Retry Test Suite | NOT_STARTED | 058, 093 | Phase 12 | `tests/integration/test_replay.py` |
| **095** | End-to-End Automated Integration Test Suite | NOT_STARTED | 019-090 | Phase 12 | `tests/e2e/test_full_pipeline.py` |
| **096** | OpenAPI Contract & ERP Integration Docs | NOT_STARTED | 019-095 | Phase 12 | `docs/openapi_contract.json` |
| **097** | Performance Benchmarking & Optimization | NOT_STARTED | 095, 096 | Phase 12 | `docs/benchmarking_report.md` |

---

## ৩. ডিপেনডেন্সি ফেজ গ্রুপিং (Implementation Phase Mapping)

- **Phase 0 (Forensic Audit & Baseline):** `REQ-001` (সম্পন্ন ও ভেরিফাইড)
- **Phase 1 (Architectural Boundary & Repository Foundation):** `REQ-002` থেকে `REQ-009`
- **Phase 2 (Service Layer Decoupling):** `REQ-010` থেকে `REQ-018`
- **Phase 3 (FastAPI Core Application & Control Plane):** `REQ-019` থেকে `REQ-028`
- **Phase 4 (Pipeline Invocation & Legacy CLI Compatibility):** `REQ-029` থেকে `REQ-034`
- **Phase 5 (PostgreSQL Migration Architecture):** `REQ-035` থেকে `REQ-042`
- **Phase 6 (Durable Workflow Data Model):** `REQ-043` থেকে `REQ-051`
- **Phase 7 (Workflow Engine Foundation & State Machine):** `REQ-052` থেকে `REQ-060`
- **Phase 8 (Fault Tolerance, Retries & Crash Recovery):** `REQ-061` থেকে `REQ-069`
- **Phase 9 (Idempotency & External Side-Effect Safety):** `REQ-070` থেকে `REQ-076`
- **Phase 10 (Dynamic Workflow Evolution & Execution Migration):** `REQ-077` থেকে `REQ-083`
- **Phase 11 (Dedicated Worker Fleet Architecture):** `REQ-084` থেকে `REQ-090`
- **Phase 12 (Observability, Chaos Testing & Final Optimization):** `REQ-091` থেকে `REQ-097`

---

## ৪. ফেজ ১ এক্সিকিউশন প্ল্যান (REQ-002 → REQ-009)

- **বর্তমান অবস্থা:** সমস্ত স্ক্রিপ্ট সরাসরি `PromptDatabase/database/session.py`-এর মাধ্যমে `youtube_pipeline.db`-তে কোয়েরি চালায়।
- **টার্গেট অবস্থা:** `infrastructure/database/` এবং `repositories/` তৈরি করে ডেটাবেস এক্সেসকে সম্পূর্ণরূপে বিমূর্ত (abstract) করা।
- **প্রভাবিত ফাইলসমূহ:**
  - `infrastructure/database/engine.py`
  - `infrastructure/database/session.py`
  - `repositories/base_repository.py`
  - `repositories/idea_repository.py`
  - `repositories/prompt_repository.py`
  - `repositories/video_repository.py`
  - `repositories/seo_repository.py`
  - `repositories/asset_repository.py`
  - `tests/test_repositories.py`
- **ঝুঁকি মূল্যায়ন:** LOW (নতুন ফাইল সংযোজন, বিদ্যমান কোনো ফাইল পরিবর্তন বা ডেটা মিউটেশন নেই)।
- **এক্সিট গেট ক্রাইটেরিয়া:** 
  1. সমস্ত মডেল রিপোজিটরির মাধ্যমে কোয়েরি হতে হবে।
  2. ইউনিট টেস্ট শতভাগ পাস করতে হবে।
  3. বিদ্যমান ডেটাবেস অপরিবর্তিত থাকতে হবে।

---
*মাস্টার ইমপ্লিমেন্টেশন প্ল্যান লক করা হয়েছে এবং ফেজ ১ বাস্তবায়ন তাৎক্ষণিকভাবে শুরু হচ্ছে।*
