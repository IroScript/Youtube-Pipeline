"""Tests for the complete YouTube Content Pipeline Database Schema."""
from __future__ import annotations

import uuid
import pytest
from sqlmodel import Session, select
from flowboard.db.youtube_session import youtube_engine, init_youtube_db
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
)


@pytest.fixture(autouse=True)
def setup_db():
    init_youtube_db()


def test_schema_creation_and_basic_crud():
    """Verify that all 16 YouTube Content Database tables are created and accept CRUD operations."""
    with Session(youtube_engine) as session:
        # 1. Create Idea
        idea_uuid = str(uuid.uuid4())
        idea = Idea(
            uuid=idea_uuid,
            title="Zero Point Energy Machine",
            raw_idea="Futuristic machine generating infinite clean energy",
            topic="Clean Energy",
            niche="Futuristic Tech",
            category="Sci-Fi",
            status="new",
        )
        session.add(idea)
        session.commit()
        session.refresh(idea)
        assert idea.id is not None

        # 2. Idea Feature (Idea DNA)
        feature = IdeaFeature(
            idea_id=idea.id,
            subject="Zero Point Energy",
            main_topic="Energy Revolution",
            core_concept="Infinite Energy Generation",
            visual_hook="Glowing blue energy core",
            novelty_score=0.95,
        )
        session.add(feature)

        # 3. Idea Embedding
        embedding = IdeaEmbedding(
            idea_id=idea.id,
            embedding_model="text-embedding-3-small",
            vector_dimension=1536,
            content_hash="hash_12345",
        )
        session.add(embedding)

        # 4. Duplicate Check
        dup_check = DuplicateCheck(
            new_idea_id=idea.id,
            compared_idea_id=idea.id,
            exact_match=1,
            final_score=1.0,
            decision="duplicate",
            ai_judgement="Exact duplicate idea",
        )
        session.add(dup_check)

        # 5. Prompt & Prompt Version
        prompt_uuid = str(uuid.uuid4())
        prompt = Prompt(
            uuid=prompt_uuid,
            idea_id=idea.id,
            prompt_type="Image Prompt",
            prompt_text="Create the ultimate zero-point energy machine",
            aspect_ratio="9:16",
        )
        session.add(prompt)
        session.commit()
        session.refresh(prompt)

        p_ver = PromptVersion(
            prompt_id=prompt.id,
            version=1,
            prompt_text=prompt.prompt_text,
            change_reason="Initial creation",
        )
        session.add(p_ver)

        # 6. Generation Job
        job_uuid = str(uuid.uuid4())
        job = GenerationJob(
            uuid=job_uuid,
            idea_id=idea.id,
            prompt_id=prompt.id,
            job_type="image_to_video",
            provider="Google Flow",
            model="VEO_3_1_LITE",
            status="completed",
        )
        session.add(job)
        session.commit()
        session.refresh(job)

        # 7. Generated Video & Asset
        video_uuid = str(uuid.uuid4())
        video = GeneratedVideo(
            uuid=video_uuid,
            idea_id=idea.id,
            generation_job_id=job.id,
            title=idea.title,
            file_path="output/mega_reactor.mp4",
            duration_seconds=8.0,
            status="done",
        )
        session.add(video)
        session.commit()
        session.refresh(video)

        asset_uuid = str(uuid.uuid4())
        asset = IdeaAsset(
            uuid=asset_uuid,
            idea_id=idea.id,
            video_id=video.id,
            asset_type="video",
            file_path=video.file_path,
        )
        session.add(asset)

        # 8. Schedule & Publishing
        sched = Schedule(
            idea_id=idea.id,
            prompt_id=prompt.id,
            job_id=job.id,
            scheduled_date="2026-08-15",
            action="publish_youtube",
            status="pending",
        )
        session.add(sched)

        pub = Publishing(
            video_id=video.id,
            platform="YouTube",
            channel_name="TechFutures",
            title=video.title,
            views=1500,
            likes=320,
            comments=45,
            status="published",
        )
        session.add(pub)

        # 9. Tag, Content History, Setting
        tag = Tag(name="SciFi", category="Niche")
        session.add(tag)
        session.commit()
        session.refresh(tag)

        idea_tag = IdeaTag(idea_id=idea.id, tag_id=tag.id)
        session.add(idea_tag)

        history = ContentHistory(
            entity_type="idea",
            entity_id=idea.id,
            action="status_change",
            old_value="new",
            new_value="scheduled",
            reason="Scheduled for auto-generation",
        )
        session.add(history)

        setting = Setting(key="duplicate_threshold", value="0.90", value_type="float")
        session.add(setting)

        session.commit()

        # Query and Assert
        saved_idea = session.exec(select(Idea).where(Idea.uuid == idea_uuid)).first()
        assert saved_idea is not None
        assert saved_idea.title == "Zero Point Energy Machine"

        saved_pub = session.exec(select(Publishing).where(Publishing.video_id == video.id)).first()
        assert saved_pub is not None
        assert saved_pub.views == 1500


def test_partial_data_and_missing_fields_support():
    """Verify SQLite handles extreme data gaps, missing optional fields, and partial inputs gracefully."""
    with Session(youtube_engine) as session:
        # 1. Idea with ONLY mandatory fields (raw_idea, title, uuid) — all other 20+ fields are None/omitted
        incomplete_idea_uuid = str(uuid.uuid4())
        partial_idea = Idea(
            uuid=incomplete_idea_uuid,
            title="Minimal Idea",
            raw_idea="Just a raw prompt string with zero metadata",
        )
        session.add(partial_idea)
        session.commit()
        session.refresh(partial_idea)

        assert partial_idea.id is not None
        assert partial_idea.niche is None
        assert partial_idea.topic is None
        assert partial_idea.category is None
        assert partial_idea.scheduled_for is None
        assert partial_idea.is_deleted == 0

        # 2. IdeaFeature with ONLY 1 field set (core_concept) — all other 20+ fields omitted
        partial_feature = IdeaFeature(
            idea_id=partial_idea.id,
            core_concept="Minimal concept",
        )
        session.add(partial_feature)

        # 3. IdeaEmbedding with minimal fields
        partial_embedding = IdeaEmbedding(
            idea_id=partial_idea.id,
            embedding_model="text-embedding-3-small",
        )
        session.add(partial_embedding)

        # 4. DuplicateCheck with minimal fields
        partial_dup = DuplicateCheck(
            new_idea_id=partial_idea.id,
            compared_idea_id=partial_idea.id,
        )
        session.add(partial_dup)

        # 5. Prompt with minimal fields
        partial_prompt = Prompt(
            uuid=str(uuid.uuid4()),
            idea_id=partial_idea.id,
            prompt_text="Minimal prompt string",
        )
        session.add(partial_prompt)
        session.commit()

        # 6. GeneratedVideo with minimal fields
        partial_video = GeneratedVideo(
            uuid=str(uuid.uuid4()),
            idea_id=partial_idea.id,
        )
        session.add(partial_video)
        session.commit()

        # 7. Publishing with missing metrics (views/likes default to 0, other fields None)
        partial_pub = Publishing(
            video_id=partial_video.id,
        )
        session.add(partial_pub)

        # 8. ContentHistory with minimal fields
        partial_history = ContentHistory(
            entity_type="idea",
            entity_id=partial_idea.id,
            action="created",
        )
        session.add(partial_history)

        session.commit()

        # Verify query retrieval of partial data
        queried = session.exec(select(Idea).where(Idea.uuid == incomplete_idea_uuid)).first()
        assert queried is not None
        assert queried.title == "Minimal Idea"
        assert queried.description is None

        queried_pub = session.exec(select(Publishing).where(Publishing.video_id == partial_video.id)).first()
        assert queried_pub is not None
        assert queried_pub.title is None
        assert queried_pub.views == 0

