# 🛡️ DATABASE BASELINE & FORENSIC INTEGRITY REPORT
**Workspace:** `C:\Users\Irak\Desktop\Youtube Pipeline`  
**Client:** ইরাক ভাইয়া  
**Timestamp (UTC):** `2026-09-09T10:06:23Z`  
**Protocol:** STRICT ZERO-DESTRUCTION SAFETY GATE  

---

## 1. Database Identification & Cryptographic Fingerprint
- **Absolute Path:** `C:\Users\Irak\Desktop\Youtube Pipeline\PromptDatabase\database\youtube_pipeline.db`
- **File Size (Bytes):** `5,967,872`
- **File Size (MB):** `5.69 MB`
- **SHA-256 Checksum:** `53cd6f8216d913d2c57aac6ba86e0edc644232a86d1a4ed63be70149346221dd`
- **Total Registered Tables:** `49`
- **Total Aggregate Rows:** `2,182`

---

## 2. Table Inventory & Row Counts

| Table Name | Row Count | Primary Domain Role | Integrity Status |
|:---|:---:|:---|:---:|
| `categories` | 1 | Taxonomy classification root | VERIFIED_POPULATED |
| `elements` | 100 | Visual / narrative elements mined from categories | VERIFIED_POPULATED |
| `ideas` | 132 | Core generated/curated video ideas | VERIFIED_POPULATED |
| `idea_elements` | 132 | M:N association mapping ideas to elements | VERIFIED_POPULATED |
| `prompts` | 960 | 20 prompt variations per idea (48 ideas covered) | VERIFIED_POPULATED |
| `prompting_style_master` | 9 | Style prompt directives | VERIFIED_POPULATED |
| `pipeline_stage_audits` | 160 | Stage gate audit logs | VERIFIED_POPULATED |
| `seo_competitors` | 119 | Competitive video analysis tags & titles | VERIFIED_POPULATED |
| `seo_keyword_metrics` | 290 | Harvested SEO keyword metrics & competition scores | VERIFIED_POPULATED |
| `seo_runs` | 14 | Execution runs of the SEO pipeline | VERIFIED_POPULATED |
| `youtube_metadata` | 2 | Production YouTube title, description, tags records | VERIFIED_POPULATED (Only Idea 1 & 2 applied) |
| `content_history` | 65 | Historical SEO and publish audit logs | VERIFIED_POPULATED |
| `workflow_executions` | 24 | Durable workflow execution control plane | VERIFIED_POPULATED (Non-destructive schema active) |
| `channel2_shot_audits` | 38 | Shot audit logs | VERIFIED_POPULATED |
| `channel_prompts` | 38 | Channel level prompt caches | VERIFIED_POPULATED |
| `channels` | 2 | YouTube channel configurations | VERIFIED_POPULATED |
| `generated_videos` | 34 | Historical video generation traces | VERIFIED_POPULATED |
| `generation_jobs` | 2 | Video generation queue jobs | VERIFIED_POPULATED |
| `idea_assets` | 6 | Associated static assets | VERIFIED_POPULATED |
| `pipeline_runs` | 8 | Orchestration run logs | VERIFIED_POPULATED |
| `task_attempts` | 33 | Historical task attempts | VERIFIED_POPULATED |
| `tasks` | 13 | Historical pipeline tasks | VERIFIED_POPULATED |
| `audit_logs` | 0 | Durable workflow append-only audit ledger (idle) | READY_UNPOPULATED |
| `collection_ideas` | 0 | Collection mapping (idle) | READY_UNPOPULATED |
| `collections` | 0 | Idea groupings (idle) | READY_UNPOPULATED |
| `duplicate_checks` | 0 | Idempotent duplicate check cache (idle) | READY_UNPOPULATED |
| `execution_events` | 0 | Workflow execution event stream (idle) | READY_UNPOPULATED |
| `external_operations` | 0 | Two-phase external effect reservations (idle) | READY_UNPOPULATED |
| `idea_embeddings` | 0 | Vector embeddings (idle) | READY_UNPOPULATED |
| `idea_features` | 0 | Feature extraction cache (idle) | READY_UNPOPULATED |
| `idea_tags` | 0 | Tag taxonomy (idle) | READY_UNPOPULATED |
| `idea_versions` | 0 | Version snapshots (idle) | READY_UNPOPULATED |
| `jobs` | 0 | Distributed worker job queue (idle) | READY_UNPOPULATED |
| `models` | 0 | Model registry (idle) | READY_UNPOPULATED |
| `prompt_versions` | 0 | Prompt iteration versions (idle) | READY_UNPOPULATED |
| `publishing` | 0 | Publish tracker (idle) | READY_UNPOPULATED |
| `req_009_tx_test` | 0 | Transient transaction test table (idle) | READY_UNPOPULATED |
| `schedules` | 0 | Cron schedules (idle) | READY_UNPOPULATED |
| `settings` | 0 | System configuration settings (idle) | READY_UNPOPULATED |
| `step_attempts` | 0 | Durable step attempt history (idle) | READY_UNPOPULATED |
| `step_runs` | 0 | Durable step run states (idle) | READY_UNPOPULATED |
| `tags` | 0 | Content tags (idle) | READY_UNPOPULATED |
| `test_jsonb_payloads` | 0 | SQLite JSON test harness table (idle) | READY_UNPOPULATED |
| `test_req_003_no_uuid` | 0 | Repository test table (idle) | READY_UNPOPULATED |
| `test_req_003_with_uuid` | 0 | Repository test table (idle) | READY_UNPOPULATED |
| `workflow_migrations` | 0 | Durable workflow graph version migrations (idle) | READY_UNPOPULATED |
| `workflow_steps` | 0 | Durable workflow DAG step definitions (idle) | READY_UNPOPULATED |
| `workflow_versions` | 0 | Frozen workflow versions (idle) | READY_UNPOPULATED |
| `workflows` | 0 | Workflow master catalog (idle) | READY_UNPOPULATED |

---

## 3. Database Safety Guarantee
- **Read-Only Verification:** Baseline captured without table mutation, dropping, truncating, or index modification.
- **Durable Control Plane Compatibility:** The `workflow_executions` table contains columns `[id, workflow_id, workflow_version_id, trigger_source, status, current_step_key, context_snapshot, idempotency_key, priority, started_at, completed_at, created_at, updated_at, attempt_count, max_attempts, error_message, last_failure_time, next_retry_time]`, matching production SQLModel contracts.
