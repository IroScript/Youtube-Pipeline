from contextlib import contextmanager
from pathlib import Path
import os
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

from flowboard.config import STORAGE_DIR

YOUTUBE_DB_PATH = Path(os.getenv("YOUTUBE_DB", STORAGE_DIR / "youtube_pipeline.db"))

youtube_engine = create_engine(
    f"sqlite:///{YOUTUBE_DB_PATH}",
    echo=False,
    connect_args={"check_same_thread": False},
)


@event.listens_for(youtube_engine, "connect")
def _enable_sqlite_fk(dbapi_conn, _connection_record) -> None:
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


def init_youtube_db() -> None:
    from sqlalchemy import inspect
    from flowboard.db import youtube_models

    with youtube_engine.connect() as conn:
        insp = inspect(conn)
        if insp.has_table("ideas"):
            idea_cols = {c["name"] for c in insp.get_columns("ideas")}
            if "category_id" not in idea_cols:
                conn.exec_driver_sql("ALTER TABLE ideas ADD COLUMN category_id INTEGER")
                conn.commit()
        if insp.has_table("prompts"):
            prompt_cols = {c["name"] for c in insp.get_columns("prompts")}
            if "level" not in prompt_cols:
                conn.exec_driver_sql("ALTER TABLE prompts ADD COLUMN level INTEGER")
            if "level_name" not in prompt_cols:
                conn.exec_driver_sql("ALTER TABLE prompts ADD COLUMN level_name TEXT")
            if "structure_type" not in prompt_cols:
                conn.exec_driver_sql("ALTER TABLE prompts ADD COLUMN structure_type TEXT")
            if "reference_image_prompt_id" not in prompt_cols:
                conn.exec_driver_sql("ALTER TABLE prompts ADD COLUMN reference_image_prompt_id INTEGER")
            conn.commit()

    youtube_tables = [
        youtube_models.Idea.__table__,
        youtube_models.IdeaVersion.__table__,
        youtube_models.IdeaFeature.__table__,
        youtube_models.IdeaEmbedding.__table__,
        youtube_models.DuplicateCheck.__table__,
        youtube_models.Prompt.__table__,
        youtube_models.PromptVersion.__table__,
        youtube_models.GenerationJob.__table__,
        youtube_models.GeneratedVideo.__table__,
        youtube_models.IdeaAsset.__table__,
        youtube_models.Schedule.__table__,
        youtube_models.Publishing.__table__,
        youtube_models.Tag.__table__,
        youtube_models.IdeaTag.__table__,
        youtube_models.ContentHistory.__table__,
        youtube_models.Collection.__table__,
        youtube_models.CollectionIdea.__table__,
        youtube_models.ModelRef.__table__,
        youtube_models.Setting.__table__,
        youtube_models.Category.__table__,
        youtube_models.Element.__table__,
        youtube_models.IdeaElement.__table__,
        youtube_models.Channel.__table__,
        youtube_models.ChannelPrompt.__table__,
        youtube_models.PipelineRun.__table__,
        youtube_models.PipelineStageAudit.__table__,
        youtube_models.Channel2ShotAudit.__table__,
        youtube_models.Task.__table__,
        youtube_models.TaskAttempt.__table__,
    ]
    SQLModel.metadata.create_all(youtube_engine, tables=youtube_tables)


@contextmanager
def get_youtube_session():
    with Session(youtube_engine) as session:
        yield session
