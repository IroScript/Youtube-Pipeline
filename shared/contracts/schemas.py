"""
Pydantic v2 Data Contracts & Schemas
====================================
Strongly-typed DTO schemas for API request validation and structured responses.
"""

from __future__ import annotations

from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database_connected: bool
    database_url_masked: str
    timestamp: datetime


class CategorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    name: str
    description: Optional[str] = None


class ElementSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    name: str
    symbol: Optional[str] = None
    group_type: Optional[str] = None


class IdeaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    title: str
    raw_idea: str
    topic: Optional[str] = None
    status: str
    element_id: Optional[int] = None
    element_name: Optional[str] = None


class PromptSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uuid: str
    idea_id: int
    level: Optional[int] = None
    level_name: Optional[str] = None
    prompt_type: Optional[str] = None
    generation_type: Optional[str] = None
    prompt_text: str
    status: str


class EscalationStatusResponse(BaseModel):
    idea_id: int
    total_prompts: int
    filled_prompts: int
    required_prompts: int
    has_level_10_video: bool
    is_complete: bool


class SEOMetadataSchema(BaseModel):
    idea_id: int
    title: str
    seo_description: str
    tags: List[str]
    pinned_comment: Optional[str] = None
    status: str
    is_real_seo: bool


class VideoRecordSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    idea_id: int
    title: Optional[str] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    duration_seconds: Optional[float] = None
    status: str


class PackageManifestSchema(BaseModel):
    idea_id: int
    exists: bool
    folder_path: Optional[str] = None
    folder_name: Optional[str] = None
    has_video: bool
    video_path: Optional[str] = None
    has_prompt_json: bool
    has_seo_json: bool
    complete: bool


# ============================================================================
# API-COMPLETE EXPANDED DTO CONTRACTS
# ============================================================================

class CreateIdeaRequest(BaseModel):
    title: str
    topic: Optional[str] = None
    category_id: int = 1
    category: Optional[str] = "Impossible Giant Machine"
    description: Optional[str] = None
    element_id: Optional[int] = None


class GenerateElementIdeasRequest(BaseModel):
    skip_browser: bool = False
    target_total: int = 10


class GenerateElementIdeasResponse(BaseModel):
    element_id: int
    element_name: str
    generated_count: int
    ideas: List[IdeaSchema]


class GenerateElementRequest(BaseModel):
    skip_browser: bool = False


class GenerateElementResponse(BaseModel):
    category_id: int
    element: ElementSchema


class JITPromptResponse(BaseModel):
    idea_id: int
    title: str
    level: int
    prompt_text: str
    status: str


class SEOHarvestSuggestRequest(BaseModel):
    query: str
    lang: str = "en"


class SEOHarvestSuggestResponse(BaseModel):
    query: str
    suggestions: List[str]
    count: int


class SEOHarvestCompetitorsRequest(BaseModel):
    query: str
    limit: int = 5


class CompetitorItemSchema(BaseModel):
    title: str
    channel: str = ""
    video_id: str = ""
    url: str = ""
    view_count: Optional[int] = None


class SEOHarvestCompetitorsResponse(BaseModel):
    query: str
    ran: bool
    competitors: List[CompetitorItemSchema]
    count: int


class AssembleVideoRequest(BaseModel):
    shot_paths: List[str]
    output_path: Optional[str] = None


class AssembleVideoResponse(BaseModel):
    status: str
    output_path: Optional[str] = None
    total_shots: int
    error: Optional[str] = None


class AudioStatusResponse(BaseModel):
    idea_id: int
    enabled: bool
    has_voiceover: bool
    file_path: Optional[str] = None


class GenerateAudioRequest(BaseModel):
    text: Optional[str] = None
    voice_id: str = "male_narrator"


class GenerateAudioResponse(BaseModel):
    status: str
    voice_id: str
    file_path: Optional[str] = None
    message: Optional[str] = None


class YouTubeStatusResponse(BaseModel):
    idea_id: int
    is_ready: bool
    title: Optional[str] = None
    has_video: bool


class YouTubeUploadPayloadResponse(BaseModel):
    idea_id: int
    title: str
    description: str
    tags: str
    category: str


class YouTubeUploadRequest(BaseModel):
    video_path: Optional[str] = None


class YouTubeUploadResponse(BaseModel):
    status: str
    video_id: Optional[str] = None
    message: Optional[str] = None


class ExportStatusResponse(BaseModel):
    exports_directory: str
    available_files: List[str]
    count: int


class ExportTriggerResponse(BaseModel):
    status: str
    exports_directory: str
    generated_files: List[str]


class UniquenessAuditResponse(BaseModel):
    drifted_count: int
    drifted_checked: int
    shared_video_opening_count: int
    shared_image_opening_count: int
    banned_ending_count: int
    shared_prompt_groups: int
    distinct_signatures: int
    total_ideas: int


class NoveltyScanResponse(BaseModel):
    scanned_ideas: int
    similar_pairs_count: int
    pairs: List[Any]


class IdeaVariationResponse(BaseModel):
    idea_id: int
    archetype: str
    camera: str
    ending: str
    mood: str
    signature: str


class JobSchema(BaseModel):
    id: str
    step_run_id: str
    step_key: str
    step_type: str
    queue_name: str
    priority: int
    status: str
    payload: Any
    created_at: str


class JobDispatchResponse(BaseModel):
    job_id: str
    queue_name: str
    status: str
    priority: int


class DLQItemSchema(BaseModel):
    id: str
    execution_id: str
    step_run_id: str
    error_class: str
    error_message: str
    status: str
    created_at: str


class PipelineRunRequest(BaseModel):
    skip_browser: bool = True
    dry_run: bool = True


class PipelineRunResponse(BaseModel):
    job_id: str
    idea_id: int
    status: str
    stage: str
    message: str


class PipelineProgressResponse(BaseModel):
    idea_id: int
    title: str
    stages: dict
    overall_status: str


class PromptGenerateRequest(BaseModel):
    idea_id: Optional[int] = None
    skip_browser: bool = False
    fill_unfilled_only: bool = False


class PromptGenerateResponse(BaseModel):
    status: str
    idea_id: Optional[int] = None
    saved_prompts_count: int = 0
    message: Optional[str] = None
    level_10_video_prompt: Optional[str] = None


class SEOGenerateRequest(BaseModel):
    idea_id: int
    apply: bool = True
    force: bool = False
    use_browser: bool = True


class SEOGenerateResponse(BaseModel):
    status: str
    idea_id: int
    action: str
    title: Optional[str] = None
    tags_count: int = 0
    scores: Optional[Dict[str, Any]] = None
    upload_ready: bool = False


class ExecutionCreateRequest(BaseModel):
    idea_id: Optional[int] = None
    video_id: Optional[int] = None
    max_attempts: int = 3
    context_data: Optional[Dict[str, Any]] = None


class ExecutionResponse(BaseModel):
    id: str
    status: str
    idea_id: Optional[int] = None
    video_id: Optional[int] = None
    attempt_count: int = 0
    max_attempts: int = 3
    error_message: Optional[str] = None
    last_failure_time: Optional[datetime] = None
    next_retry_time: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    context_data: Dict[str, Any] = {}


class ExecutionActionResponse(BaseModel):
    status: str
    execution_id: str
    previous_status: Optional[str] = None
    new_status: str
    attempt_count: int = 0
    message: Optional[str] = None


