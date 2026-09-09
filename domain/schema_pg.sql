-- =============================================================================
-- PostgreSQL Target Production Schema: YouTube Content Automation ERP
-- =============================================================================
-- Version: 1.0.0
-- Compliant with PostgreSQL 15+, UUIDv4, TIMESTAMPTZ, JSONB, and Cascading Constraints.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Channels Table
CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    channel_name VARCHAR(255) NOT NULL UNIQUE,
    channel_id_yt VARCHAR(100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Elements Table (100 Elements)
CREATE TABLE IF NOT EXISTS elements (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    name VARCHAR(255) NOT NULL UNIQUE,
    symbol VARCHAR(50),
    group_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Ideas Table
CREATE TABLE IF NOT EXISTS ideas (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    title VARCHAR(500) NOT NULL,
    short_title VARCHAR(255),
    raw_idea TEXT NOT NULL,
    refined_idea TEXT,
    description TEXT,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    category VARCHAR(255),
    subcategory VARCHAR(255),
    topic VARCHAR(255),
    niche VARCHAR(255),
    content_type VARCHAR(100),
    format VARCHAR(100),
    target_audience VARCHAR(255),
    language VARCHAR(50) NOT NULL DEFAULT 'en',
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    priority INT NOT NULL DEFAULT 0,
    source VARCHAR(255),
    source_reference VARCHAR(255),
    parent_idea_id INT REFERENCES ideas(id) ON DELETE SET NULL,
    root_idea_id INT REFERENCES ideas(id) ON DELETE SET NULL,
    version INT NOT NULL DEFAULT 1,
    idea_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_for TIMESTAMPTZ,
    generated_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    is_deleted INT NOT NULL DEFAULT 0
);

-- 5. IdeaElements Link Table
CREATE TABLE IF NOT EXISTS idea_elements (
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    element_id INT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (idea_id, element_id)
);

-- 6. Prompting Style Master
CREATE TABLE IF NOT EXISTS prompting_style_master (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    stage_name VARCHAR(100) NOT NULL,
    target_hierarchy_level VARCHAR(100) NOT NULL,
    style_title VARCHAR(255) NOT NULL,
    system_role TEXT NOT NULL,
    system_instruction TEXT NOT NULL,
    prompt_template TEXT NOT NULL,
    output_format VARCHAR(50) NOT NULL,
    model_target VARCHAR(100) NOT NULL,
    rules_and_constraints TEXT NOT NULL,
    is_active INT NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Prompts Table (10-Level Escalation)
CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    prompt_type VARCHAR(50),
    title VARCHAR(255),
    prompt_text TEXT NOT NULL,
    negative_prompt TEXT,
    system_instruction TEXT,
    model_target VARCHAR(100),
    generation_type VARCHAR(50), -- 'image' or 'video'
    aspect_ratio VARCHAR(50),
    duration_seconds FLOAT,
    language VARCHAR(50) DEFAULT 'en',
    status VARCHAR(50) NOT NULL DEFAULT 'ready',
    version INT NOT NULL DEFAULT 1,
    prompt_hash VARCHAR(64),
    level INT,
    level_name VARCHAR(255),
    structure_type VARCHAR(255),
    reference_image_prompt_id INT REFERENCES prompts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Generated Videos Table
CREATE TABLE IF NOT EXISTS generated_videos (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    generation_job_id INT,
    title VARCHAR(500),
    file_path TEXT,
    file_name VARCHAR(255),
    duration_seconds FLOAT DEFAULT 8.0,
    width INT DEFAULT 1080,
    height INT DEFAULT 1920,
    fps FLOAT DEFAULT 24.0,
    file_size_bytes BIGINT,
    format VARCHAR(50) DEFAULT 'mp4',
    codec VARCHAR(50) DEFAULT 'h264',
    resolution VARCHAR(50) DEFAULT '1080x1920',
    thumbnail_path TEXT,
    subtitle_path TEXT,
    audio_path TEXT,
    quality_score FLOAT,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. YouTube Metadata Table (SEO)
CREATE TABLE IF NOT EXISTS youtube_metadata (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    element_id INT REFERENCES elements(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    seo_description TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    pinned_comment TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'Science & Technology',
    default_language VARCHAR(50) NOT NULL DEFAULT 'en',
    video_prompt_used TEXT,
    image_prompt_used TEXT,
    video_file_path TEXT,
    package_folder_path TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ready',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Tasks & Attempts Tables
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    prompt_id INT REFERENCES prompts(id) ON DELETE SET NULL,
    video_title VARCHAR(500) NOT NULL,
    task_type VARCHAR(100) NOT NULL DEFAULT 'veo_level10_package',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    output_folder_path TEXT,
    video_path TEXT,
    metadata_json_path TEXT,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attempts (
    id SERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- 11. SEO Analytics Tables
CREATE TABLE IF NOT EXISTS seo_runs (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    provider VARCHAR(100),
    mode VARCHAR(50) NOT NULL,
    demand_score FLOAT,
    novelty_score FLOAT,
    saturation_score FLOAT,
    opportunity_score FLOAT,
    verdict VARCHAR(50),
    keyword_count INT NOT NULL DEFAULT 0,
    competitor_count INT NOT NULL DEFAULT 0,
    exact_competitors INT NOT NULL DEFAULT 0,
    close_competitors INT NOT NULL DEFAULT 0,
    llm_used INT NOT NULL DEFAULT 0,
    upload_ready INT NOT NULL DEFAULT 0,
    warnings TEXT,
    notes TEXT,
    prompt_sent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_keyword_metrics (
    id SERIAL PRIMARY KEY,
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    seo_run_id INT REFERENCES seo_runs(id) ON DELETE SET NULL,
    keyword VARCHAR(255) NOT NULL,
    relevance FLOAT,
    word_count INT,
    long_tail INT NOT NULL DEFAULT 0,
    score FLOAT,
    source VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_competitors (
    id SERIAL PRIMARY KEY,
    idea_id INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    seo_run_id INT REFERENCES seo_runs(id) ON DELETE SET NULL,
    query VARCHAR(255),
    video_id VARCHAR(100),
    title VARCHAR(500),
    channel VARCHAR(255),
    url TEXT,
    view_count BIGINT,
    duration_seconds INT,
    similarity FLOAT,
    level VARCHAR(50),
    is_strong INT NOT NULL DEFAULT 0,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Content History
CREATE TABLE IF NOT EXISTS content_history (
    id SERIAL PRIMARY KEY,
    idea_id INT REFERENCES ideas(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing Strategy
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_idea_level ON prompts(idea_id, level);
CREATE INDEX IF NOT EXISTS idx_generated_videos_idea ON generated_videos(idea_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_youtube_metadata_idea ON youtube_metadata(idea_id);

-- =============================================================================
-- Phase 6: Durable Workflow Data Model (REQ-043 to REQ-051)
-- =============================================================================

-- 13. Workflows Table (REQ-043)
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    channel_id VARCHAR(100),
    content_type VARCHAR(50) NOT NULL DEFAULT 'shorts',
    active_version_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Workflow Versions Table (REQ-044)
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated')),
    definition JSONB NOT NULL DEFAULT '{}',
    definition_hash VARCHAR(64),
    changelog TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    UNIQUE(workflow_id, version_number)
);

-- 15. Workflow Steps Table (REQ-045)
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
    step_key VARCHAR(100) NOT NULL,
    step_type VARCHAR(50) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    depends_on JSONB NOT NULL DEFAULT '[]',
    condition JSONB,
    config JSONB NOT NULL DEFAULT '{}',
    retry_policy JSONB NOT NULL DEFAULT '{"max_attempts": 3, "initial_delay_seconds": 5, "max_delay_seconds": 300, "backoff": "exponential", "jitter": true}',
    timeout_seconds INT NOT NULL DEFAULT 300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_version_id, step_key)
);

-- 16. Workflow Executions Table (REQ-046)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE RESTRICT,
    idea_id INT REFERENCES ideas(id) ON DELETE SET NULL,
    video_id INT REFERENCES video_metadata(id) ON DELETE SET NULL,
    channel_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'QUEUED', 'RUNNING', 'PAUSED', 'MIGRATING', 'COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED')),
    definition_snapshot JSONB NOT NULL DEFAULT '{}',
    context_data JSONB NOT NULL DEFAULT '{}',
    idempotency_key VARCHAR(255) UNIQUE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Step Runs Table (REQ-047)
CREATE TABLE IF NOT EXISTS step_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_key VARCHAR(100) NOT NULL,
    step_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READY', 'RUNNING', 'RETRY_WAIT', 'SUCCESS', 'FAILED', 'SKIPPED', 'CANCELLED')),
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB NOT NULL DEFAULT '{}',
    input_hash VARCHAR(64),
    config_hash VARCHAR(64),
    output_hash VARCHAR(64),
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Step Attempts Table (REQ-048)
CREATE TABLE IF NOT EXISTS step_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_run_id UUID NOT NULL REFERENCES step_runs(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    worker_id VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'STARTED' CHECK (status IN ('STARTED', 'SUCCESS', 'FAILED', 'TIMEOUT', 'CANCELLED', 'UNKNOWN')),
    error_class VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    execution_metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 19. Jobs Table (REQ-049)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_run_id UUID NOT NULL REFERENCES step_runs(id) ON DELETE CASCADE,
    queue_name VARCHAR(100) NOT NULL DEFAULT 'queue.default',
    priority INT NOT NULL DEFAULT 50,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'LEASED', 'COMPLETED', 'EXPIRED', 'DEAD_LETTER')),
    worker_id VARCHAR(100),
    lease_until TIMESTAMPTZ,
    heartbeat_at TIMESTAMPTZ,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Execution Events Journal Table (REQ-050)
CREATE TABLE IF NOT EXISTS execution_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_run_id UUID,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Workflow Migrations Table (REQ-051)
CREATE TABLE IF NOT EXISTS workflow_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    from_version_id UUID NOT NULL,
    to_version_id UUID NOT NULL,
    reused_step_keys JSONB NOT NULL DEFAULT '[]',
    rerun_step_keys JSONB NOT NULL DEFAULT '[]',
    skipped_step_keys JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'STARTED' CHECK (status IN ('STARTED', 'COMPLETED', 'FAILED')),
    migration_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Phase 6 Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_versions_lookup ON workflow_versions(workflow_id, version_number);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_version ON workflow_steps(workflow_version_id, position);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_step_runs_execution ON step_runs(execution_id, status);
CREATE INDEX IF NOT EXISTS idx_step_attempts_run ON step_attempts(step_run_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_priority ON jobs(queue_name, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_lease ON jobs(status, lease_until);
CREATE INDEX IF NOT EXISTS idx_execution_events_exec ON execution_events(execution_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_migrations_exec ON workflow_migrations(execution_id);

