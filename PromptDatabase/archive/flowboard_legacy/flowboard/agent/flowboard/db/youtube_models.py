"""YouTube Content Pipeline Database Schema (Independent Database Models)."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel, Column, JSON


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class YouTubeBaseModel(SQLModel):
    """Base SQLModel for YouTube Pipeline tables."""
    pass


class Idea(YouTubeBaseModel, table=True):
    __tablename__ = "ideas"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    title: str
    short_title: Optional[str] = None
    raw_idea: str
    refined_idea: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = Field(default=None, foreign_key="categories.id", index=True)
    category: Optional[str] = None
    subcategory: Optional[str] = None
    topic: Optional[str] = None
    niche: Optional[str] = None
    content_type: Optional[str] = None
    format: Optional[str] = None
    target_audience: Optional[str] = None
    language: str = "en"
    status: str = "new"  # new, scheduled, generating, completed, published, archived
    priority: int = 0
    source: Optional[str] = None
    source_reference: Optional[str] = None
    parent_idea_id: Optional[int] = Field(default=None, foreign_key="ideas.id")
    root_idea_id: Optional[int] = Field(default=None, foreign_key="ideas.id")
    version: int = 1
    idea_hash: Optional[str] = Field(default=None, unique=True, index=True)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
    scheduled_for: Optional[datetime] = None
    generated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    is_deleted: int = 0


class IdeaVersion(YouTubeBaseModel, table=True):
    __tablename__ = "idea_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    version: int
    title: Optional[str] = None
    raw_idea: Optional[str] = None
    refined_idea: Optional[str] = None
    change_reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class IdeaFeature(YouTubeBaseModel, table=True):
    __tablename__ = "idea_features"

    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: int = Field(foreign_key="ideas.id", unique=True, index=True)
    subject: Optional[str] = None
    main_topic: Optional[str] = None
    core_concept: Optional[str] = None
    core_mechanism: Optional[str] = None
    problem: Optional[str] = None
    conflict: Optional[str] = None
    solution: Optional[str] = None
    setting: Optional[str] = None
    environment: Optional[str] = None
    time_period: Optional[str] = None
    protagonist: Optional[str] = None
    antagonist: Optional[str] = None
    visual_hook: Optional[str] = None
    emotional_hook: Optional[str] = None
    curiosity_hook: Optional[str] = None
    opening_hook: Optional[str] = None
    climax: Optional[str] = None
    ending: Optional[str] = None
    transformation: Optional[str] = None
    novelty_score: Optional[float] = None
    creativity_score: Optional[float] = None
    originality_score: Optional[float] = None
    extracted_by: Optional[str] = None
    extracted_at: Optional[datetime] = None


class IdeaEmbedding(YouTubeBaseModel, table=True):
    __tablename__ = "idea_embeddings"

    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    embedding_model: str
    embedding_version: Optional[str] = None
    vector_dimension: Optional[int] = None
    vector_data: Optional[bytes] = None
    content_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class DuplicateCheck(YouTubeBaseModel, table=True):
    __tablename__ = "duplicate_checks"

    id: Optional[int] = Field(default=None, primary_key=True)
    new_idea_id: int = Field(foreign_key="ideas.id", index=True)
    compared_idea_id: int = Field(foreign_key="ideas.id", index=True)
    exact_match: int = 0
    hash_match: int = 0
    semantic_score: Optional[float] = None
    topic_score: Optional[float] = None
    concept_score: Optional[float] = None
    mechanism_score: Optional[float] = None
    visual_score: Optional[float] = None
    story_score: Optional[float] = None
    final_score: Optional[float] = None
    decision: Optional[str] = None  # unique, near_duplicate, duplicate
    confidence: Optional[float] = None
    ai_judgement: Optional[str] = None
    checked_by: Optional[str] = None
    model_name: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class Prompt(YouTubeBaseModel, table=True):
    __tablename__ = "prompts"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    prompt_type: Optional[str] = None
    title: Optional[str] = None
    prompt_text: str
    negative_prompt: Optional[str] = None
    system_instruction: Optional[str] = None
    model_target: Optional[str] = None
    generation_type: Optional[str] = None
    aspect_ratio: Optional[str] = None
    duration_seconds: Optional[float] = None
    level: Optional[int] = Field(default=None, index=True)
    level_name: Optional[str] = None
    structure_type: Optional[str] = None
    reference_image_prompt_id: Optional[int] = Field(default=None, foreign_key="prompts.id")
    language: Optional[str] = None
    status: str = "draft"
    version: int = 1
    prompt_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class PromptVersion(YouTubeBaseModel, table=True):
    __tablename__ = "prompt_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    prompt_id: int = Field(foreign_key="prompts.id", index=True)
    version: int
    prompt_text: Optional[str] = None
    negative_prompt: Optional[str] = None
    change_reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class GenerationJob(YouTubeBaseModel, table=True):
    __tablename__ = "generation_jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    idea_id: Optional[int] = Field(default=None, foreign_key="ideas.id", index=True)
    prompt_id: Optional[int] = Field(default=None, foreign_key="prompts.id", index=True)
    job_type: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    status: str = "queued"
    priority: int = 0
    attempt_count: int = 0
    max_attempts: int = 3
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    request_data: Optional[dict] = Field(default_factory=dict, sa_column=Column(JSON))
    response_data: Optional[dict] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_utcnow)


class GeneratedVideo(YouTubeBaseModel, table=True):
    __tablename__ = "generated_videos"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    generation_job_id: Optional[int] = Field(default=None, foreign_key="generation_jobs.id", index=True)
    title: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    file_size_bytes: Optional[int] = None
    format: Optional[str] = None
    codec: Optional[str] = None
    resolution: Optional[str] = None
    thumbnail_path: Optional[str] = None
    subtitle_path: Optional[str] = None
    audio_path: Optional[str] = None
    quality_score: Optional[float] = None
    status: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class IdeaAsset(YouTubeBaseModel, table=True):
    __tablename__ = "idea_assets"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    idea_id: Optional[int] = Field(default=None, foreign_key="ideas.id", index=True)
    video_id: Optional[int] = Field(default=None, foreign_key="generated_videos.id", index=True)
    asset_type: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None
    checksum: Optional[str] = None
    source: Optional[str] = None
    model: Optional[str] = None
    version: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class Schedule(YouTubeBaseModel, table=True):
    __tablename__ = "schedules"

    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: Optional[int] = Field(default=None, foreign_key="ideas.id", index=True)
    prompt_id: Optional[int] = Field(default=None, foreign_key="prompts.id", index=True)
    job_id: Optional[int] = Field(default=None, foreign_key="generation_jobs.id", index=True)
    scheduled_date: str
    scheduled_time: Optional[str] = None
    timezone: Optional[str] = None
    action: Optional[str] = None
    status: str = "pending"
    priority: int = 0
    retry_count: int = 0
    executed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)


class Publishing(YouTubeBaseModel, table=True):
    __tablename__ = "publishing"

    id: Optional[int] = Field(default=None, primary_key=True)
    video_id: int = Field(foreign_key="generated_videos.id", index=True)
    platform: Optional[str] = None
    channel_name: Optional[str] = None
    platform_video_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    category: Optional[str] = None
    privacy_status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    url: Optional[str] = None
    status: Optional[str] = None
    views: int = 0
    likes: int = 0
    comments: int = 0
    watch_time: float = 0.0
    retention_pct: float = 0.0
    ctr_pct: float = 0.0
    subscribers_gained: int = 0
    created_at: datetime = Field(default_factory=_utcnow)


class Tag(YouTubeBaseModel, table=True):
    __tablename__ = "tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    category: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class IdeaTag(YouTubeBaseModel, table=True):
    __tablename__ = "idea_tags"

    idea_id: int = Field(foreign_key="ideas.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)


class ContentHistory(YouTubeBaseModel, table=True):
    __tablename__ = "content_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)
    entity_id: int = Field(index=True)
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    actor: Optional[str] = None
    model: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class Collection(YouTubeBaseModel, table=True):
    __tablename__ = "collections"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class CollectionIdea(YouTubeBaseModel, table=True):
    __tablename__ = "collection_ideas"

    collection_id: int = Field(foreign_key="collections.id", primary_key=True)
    idea_id: int = Field(foreign_key="ideas.id", primary_key=True)
    position: Optional[int] = None


class ModelRef(YouTubeBaseModel, table=True):
    __tablename__ = "models"

    id: Optional[int] = Field(default=None, primary_key=True)
    provider: Optional[str] = None
    model_name: str
    model_version: Optional[str] = None
    purpose: Optional[str] = None
    active: int = 1
    created_at: datetime = Field(default_factory=_utcnow)


class Setting(YouTubeBaseModel, table=True):
    __tablename__ = "settings"

    key: str = Field(primary_key=True)
    value: Optional[str] = None
    value_type: Optional[str] = None
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=_utcnow)


class Category(YouTubeBaseModel, table=True):
    __tablename__ = "categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class Element(YouTubeBaseModel, table=True):
    __tablename__ = "elements"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    name: str = Field(index=True, unique=True)
    symbol: Optional[str] = None
    group_type: Optional[str] = None  # Nature, Tech, Machine, Infrastructure, etc.
    created_at: datetime = Field(default_factory=_utcnow)


class IdeaElement(YouTubeBaseModel, table=True):
    """Junction table mapping Many-to-Many relationship between Ideas and Elements."""
    __tablename__ = "idea_elements"

    idea_id: int = Field(foreign_key="ideas.id", primary_key=True)
    element_id: int = Field(foreign_key="elements.id", primary_key=True)
    is_primary: bool = False


class Channel(YouTubeBaseModel, table=True):
    __tablename__ = "channels"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    name: str = Field(index=True, unique=True)
    channel_type: str = "longform"  # shorts, longform, documentary
    target_duration_seconds: int = 300  # 5 minutes
    clip_duration_seconds: float = 8.0
    effective_clip_seconds: float = 6.0
    created_at: datetime = Field(default_factory=_utcnow)


class ChannelPrompt(YouTubeBaseModel, table=True):
    """Stores 38 sequential shot prompts for long-form video channels."""
    __tablename__ = "channel_prompts"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    channel_id: int = Field(foreign_key="channels.id", index=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    shot_number: int = Field(index=True)
    time_start_sec: int
    time_end_sec: int
    image_prompt: str
    video_prompt: str
    aspect_ratio: str = "16:9"
    duration_seconds: float = 8.0
    status: str = "ready"
    created_at: datetime = Field(default_factory=_utcnow)


class PipelineRun(YouTubeBaseModel, table=True):
    """Tracks a complete pipeline execution run from Element Selection to YouTube Publishing."""
    __tablename__ = "pipeline_runs"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    channel_id: int = Field(foreign_key="channels.id", index=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    current_stage_number: int = 1
    overall_status: str = "IN_PROGRESS"  # TICK (✅), CROSS (❌), IN_PROGRESS (⏳), RETRYING (🔄)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class PipelineStageAudit(YouTubeBaseModel, table=True):
    """Tracks the 20-Stage Tick/Cross audit matrix and automated retry engine state."""
    __tablename__ = "pipeline_stage_audits"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    pipeline_run_id: int = Field(foreign_key="pipeline_runs.id", index=True)
    channel_id: int = Field(foreign_key="channels.id", index=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    stage_number: int = Field(index=True)
    stage_name: str = Field(index=True)
    status: str = "PENDING"  # TICK (✅), CROSS (❌), PENDING (⏳), RETRYING (🔄)
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class Channel2ShotAudit(YouTubeBaseModel, table=True):
    """Dedicated horizontal YES/NO checkpoint tracking table for Channel 2's 38 shots."""
    __tablename__ = "channel2_shot_audits"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    channel_id: int = Field(foreign_key="channels.id", index=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    shot_number: int = Field(index=True)
    shot_title: str
    time_start_sec: int
    time_end_sec: int
    chk_01_element: str = "YES"
    chk_02_idea: str = "YES"
    chk_03_image_prompt: str = "YES"
    chk_04_image_gen: str = "YES"
    chk_05_video_prompt: str = "YES"
    chk_06_video_gen: str = "YES"
    chk_07_audio_gen: str = "YES"
    chk_08_hud_render: str = "YES"
    chk_09_stitch: str = "YES"
    chk_10_upload: str = "YES"
    failed_checkpoint: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    overall_status: str = "TICK_ALL_OK"  # TICK_ALL_OK (✅), RETRY_NEEDED (🔄), FAILED (❌)
    updated_at: datetime = Field(default_factory=_utcnow)


class Task(YouTubeBaseModel, table=True):
    """Tracks atomic multi-stage tasks for video generation and packaging."""
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(index=True, unique=True)
    idea_id: int = Field(foreign_key="ideas.id", index=True)
    prompt_id: Optional[int] = Field(default=None, foreign_key="prompts.id", index=True)
    video_title: str
    task_type: str = "veo_level10_package"  # 'prompt_gen', 'veo_level10_package', 'yt_metadata', 'packaging'
    status: str = "pending"  # 'pending', 'running', 'success', 'failed', 'permanent_failure'
    attempt_count: int = 0
    max_attempts: int = 3
    output_folder_path: Optional[str] = None
    video_path: Optional[str] = None
    metadata_json_path: Optional[str] = None
    last_error: Optional[str] = None
    next_retry_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class TaskAttempt(YouTubeBaseModel, table=True):
    """Immutable audit trail of every execution attempt for a task."""
    __tablename__ = "task_attempts"

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    attempt_number: int
    status: str  # 'running', 'success', 'failed'
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=_utcnow)
    finished_at: Optional[datetime] = None
