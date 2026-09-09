"""
Unit Tests for Phase 9: Idempotency & External Side-Effect Safety (REQ-070 to REQ-076)
======================================================================================
Tests:
- REQ-070: IdempotencyKeyGenerator deterministic SHA256 hashing
- REQ-071: ExternalOperation SQLModel reservation ledger
- REQ-072: ExternalSideEffectReconciler remote state querying & reconciliation
- REQ-073: ResumableUploadSessionManager byte ranges & session recovery
- REQ-074: DuplicateUploadGuard SHA256 collision guard & upload blocker
- REQ-075: RenderDeduplicator signature hashing & cache reuse
- REQ-076: ContentAddressedArtifactStore CAS storage, retrieval & integrity audit
"""

import pytest
import asyncio
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

from shared.idempotency.key_gen import IdempotencyKeyGenerator
from domain.effects.ledger_model import ExternalOperation
from services.reliability.reconciler import ExternalSideEffectReconciler
from services.youtube.resumable_session import ResumableUploadSessionManager
from services.youtube.duplicate_guard import (
    DuplicateUploadGuard,
    DuplicateVideoUploadException,
)
from services.video.render_dedup import RenderDeduplicator
from services.assets.artifact_store import ContentAddressedArtifactStore


# --- REQ-070: Idempotency Key Generator ---
def test_req_070_idempotency_key_gen():
    k1 = IdempotencyKeyGenerator.generate("video_render", 101, "video", version=1, payload={"prompt": "abc"})
    k2 = IdempotencyKeyGenerator.generate("video_render", 101, "video", version=1, payload={"prompt": "abc"})
    k3 = IdempotencyKeyGenerator.generate("video_render", 101, "video", version=1, payload={"prompt": "xyz"})

    assert k1 == k2  # Deterministic
    assert k1 != k3  # Different payload produces different hash
    assert len(k1) == 64  # SHA256 hex string


# --- REQ-071: External Effect Reservation Ledger ---
def test_req_071_external_operation_model():
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        op = ExternalOperation(
            execution_id="exec_001",
            step_run_id="run_001",
            operation_key="yt_upload_101_v1",
            provider="youtube",
            operation_type="upload_video",
            request_hash="hash_123",
            status="RESERVED"
        )
        session.add(op)
        session.commit()
        session.refresh(op)

        assert op.id is not None
        assert op.status == "RESERVED"
        assert op.operation_key == "yt_upload_101_v1"


# --- REQ-072: External Side-Effect Reconciler ---
@pytest.mark.asyncio
async def test_req_072_external_reconciler():
    operation = {
        "operation_key": "yt_key_123",
        "status": "UNKNOWN",
    }

    # Case 1: Remote query finds entity
    async def mock_found_provider(op_key):
        return {"id": "YT_VIDEO_999", "url": "https://youtu.be/YT_VIDEO_999"}

    res1 = await ExternalSideEffectReconciler.reconcile_operation(dict(operation), mock_found_provider)
    assert res1["status"] == "COMPLETED"
    assert res1["external_id"] == "YT_VIDEO_999"
    assert res1["reconciliation_result"] == "RECONCILED_SUCCESS"

    # Case 2: Remote query does not find entity
    async def mock_not_found_provider(op_key):
        return None

    res2 = await ExternalSideEffectReconciler.reconcile_operation(dict(operation), mock_not_found_provider)
    assert res2["status"] == "READY_FOR_RETRY"
    assert res2["reconciliation_result"] == "NOT_FOUND_SAFE_TO_RETRY"


# --- REQ-073: Resumable Upload Manager ---
def test_req_073_resumable_session():
    mgr = ResumableUploadSessionManager()
    session_id = mgr.create_session(
        file_path="C:/videos/render.mp4",
        total_bytes=1000,
        session_uri="https://upload.youtube.com/resumable/abc"
    )
    assert mgr.get_next_byte_offset(session_id) == 0
    assert mgr.is_complete(session_id) is False

    mgr.update_progress(session_id, bytes_uploaded=500)
    assert mgr.get_next_byte_offset(session_id) == 500
    assert mgr.is_complete(session_id) is False

    mgr.mark_completed(session_id, video_id="YT_VIDEO_ABC")
    assert mgr.is_complete(session_id) is True
    assert mgr.get_session(session_id)["video_id"] == "YT_VIDEO_ABC"


# --- REQ-074: Duplicate Upload Guard ---
def test_req_074_duplicate_guard():
    existing = [
        {"channel_id": "UC_MAIN", "sha256": "hash_abc", "video_id": "VID_1"}
    ]
    # Existing duplicate check
    dup = DuplicateUploadGuard.check_duplicate("UC_MAIN", "hash_abc", existing)
    assert dup is not None
    assert dup["video_id"] == "VID_1"

    # Enforce guard blocks with exception
    with pytest.raises(DuplicateVideoUploadException):
        DuplicateUploadGuard.enforce_guard("UC_MAIN", "hash_abc", existing)

    # Non-duplicate allows through
    DuplicateUploadGuard.enforce_guard("UC_MAIN", "hash_xyz", existing)


# --- REQ-075: Veo Render Deduplicator ---
def test_req_075_render_dedup():
    dedup = RenderDeduplicator()
    sig1 = RenderDeduplicator.compute_render_signature("Gigantic excavator in futuristic mine", aspect_ratio="9:16")
    sig2 = RenderDeduplicator.compute_render_signature("Gigantic excavator in futuristic mine", aspect_ratio="9:16")
    assert sig1 == sig2

    assert dedup.get_cached_render(sig1) is None

    dedup.register_completed_render(
        render_signature=sig1,
        asset_uri="C:/assets/render1.mp4",
        asset_sha256="sha_render_1"
    )
    cached = dedup.get_cached_render(sig1)
    assert cached is not None
    assert cached["asset_uri"] == "C:/assets/render1.mp4"


# --- REQ-076: Content-Addressed Artifact Store ---
def test_req_076_artifact_store(tmp_path: Path):
    store = ContentAddressedArtifactStore(tmp_path / "cas_store")
    sample_content = b"Sample video binary payload 123456789"

    meta = store.store_bytes(sample_content, extension="mp4")
    assert meta.size_bytes == len(sample_content)
    assert store.exists(meta.sha256, extension="mp4") is True

    # Read and verify
    retrieved = store.get_bytes(meta.sha256, extension="mp4")
    assert retrieved == sample_content
    assert store.verify_integrity(meta.sha256, extension="mp4") is True
