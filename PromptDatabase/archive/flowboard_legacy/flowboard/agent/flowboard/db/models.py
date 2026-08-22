from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel, Column, JSON

# Import YouTube models from dedicated module for backward-compatible imports
from flowboard.db.youtube_models import (
    Idea,
    IdeaVersion,
    IdeaFeature,
    IdeaEmbedding,
    DuplicateCheck,
    Prompt,
    PromptVersion,
    GenerationJob,
    GeneratedVideo,
    IdeaAsset,
    Schedule,
    Publishing,
    Tag,
    IdeaTag,
    ContentHistory,
    Collection,
    CollectionIdea,
    ModelRef,
    Setting,
    Task,
    TaskAttempt,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Board(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=_utcnow)


class Node(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(foreign_key="board.id", index=True)
    short_id: str = Field(index=True)
    type: str
    x: float = 0.0
    y: float = 0.0
    w: float = 240.0
    h: float = 160.0
    data: dict = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = "idle"
    created_at: datetime = Field(default_factory=_utcnow)


class Edge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(foreign_key="board.id", index=True)
    source_id: int = Field(foreign_key="node.id")
    target_id: int = Field(foreign_key="node.id")
    kind: str = "ref"
    source_variant_idx: Optional[int] = None


class Request(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    node_id: Optional[int] = Field(default=None, foreign_key="node.id", index=True)
    type: str
    params: dict = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = "queued"
    result: dict = Field(default_factory=dict, sa_column=Column(JSON))
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    finished_at: Optional[datetime] = None


class Asset(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    node_id: Optional[int] = Field(default=None, foreign_key="node.id", index=True)
    kind: str  # image | video | thumbnail
    uuid_media_id: Optional[str] = Field(default=None, index=True, unique=True)
    url: Optional[str] = None
    local_path: Optional[str] = None
    mime: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class MediaProjectMapping(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    original_media_id: str = Field(index=True)
    project_id: str = Field(index=True)
    project_local_media_id: str
    created_at: datetime = Field(default_factory=_utcnow)
    __table_args__ = (
        UniqueConstraint(
            "original_media_id", "project_id",
            name="uq_media_project_mapping",
        ),
    )


class Reference(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    media_id: str = Field(index=True, unique=True)
    url: Optional[str] = None
    label: str = ""
    kind: str  # "image" | "character" | "visual_asset" | "storyboard_shot"
    ai_brief: Optional[str] = None
    aspect_ratio: Optional[str] = None
    tags: list = Field(default_factory=list, sa_column=Column(JSON))
    pinned: bool = False
    position: int = 0
    source_board_id: Optional[int] = Field(default=None, foreign_key="board.id", index=True)
    source_node_short_id: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(foreign_key="board.id", index=True)
    role: str  # user | assistant | system
    content: str
    mentions: list = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_utcnow)


class Plan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    board_id: int = Field(foreign_key="board.id", index=True)
    spec: dict = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = "draft"  # draft | approved | running | done | failed
    created_at: datetime = Field(default_factory=_utcnow)


class PlanRevision(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plan_id: int = Field(foreign_key="plan.id", index=True)
    rev_no: int
    spec: dict = Field(default_factory=dict, sa_column=Column(JSON))
    edits: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_utcnow)


class PipelineRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plan_id: int = Field(foreign_key="plan.id", index=True)
    status: str = "pending"  # pending | running | done | failed
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error: Optional[str] = None


class BoardFlowProject(SQLModel, table=True):
    board_id: int = Field(primary_key=True, foreign_key="board.id")
    flow_project_id: str
    created_at: datetime = Field(default_factory=_utcnow)
