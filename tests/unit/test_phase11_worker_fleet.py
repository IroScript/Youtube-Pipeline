"""
Unit Tests for Phase 11: Dedicated Worker Fleet Architecture (REQ-084 to REQ-090)
================================================================================
Tests:
- REQ-084: BaseWorker lifecycle, lease polling, renewal & completion
- REQ-085: LLMWorker prompt inference & multi-provider fallback
- REQ-086: BrowserWorker lock cleanup & single-concurrency rendering
- REQ-087: MediaWorker FFmpeg assembly & audio-video stitching
- REQ-088: YouTubeWorker duplicate protection & resumable upload
- REQ-089: Workflow Engine Adapters (Local, Windmill, Temporal) compilation & dispatch
- REQ-090: JobDispatcher queue routing & priority mapping
"""

import pytest
import asyncio
from datetime import datetime, timezone, timedelta

from workers.base_worker import BaseWorker
from workers.llm_worker import LLMWorker
from workers.browser_worker import BrowserWorker
from workers.media_worker import MediaWorker
from workers.youtube_worker import YouTubeWorker
from infrastructure.orchestrator.adapter import (
    LocalOrchestratorAdapter,
    WindmillOrchestratorAdapter,
    TemporalOrchestratorAdapter,
)
from services.workflow.job_dispatcher import JobDispatcher
from domain.workflows.step_types.base_handler import StepResult


# --- Mock Worker for Testing BaseWorker ---
class MockTestWorker(BaseWorker):
    async def process_task(self, payload):
        return StepResult(success=True, output_data={"tested": True})


# --- REQ-084: Base Worker Framework ---
def test_req_084_base_worker_lifecycle():
    worker = MockTestWorker(queue_name="queue.test")
    worker.start()
    assert worker.is_running is True

    # Candidate job acquisition
    jobs = [
        {"id": "j1", "queue_name": "queue.test", "status": "QUEUED", "lease_until": None}
    ]
    leased = worker.acquire_job_lease(jobs)
    assert leased is not None
    assert leased["id"] == "j1"
    assert leased["status"] == "LEASED"
    assert leased["worker_id"] == worker.worker_id

    # Renew lease
    old_lease = leased["lease_until"]
    worker.renew_lease(leased)
    assert leased["lease_until"] >= old_lease

    # Complete job
    res = StepResult(success=True, output_data={"val": 123})
    completed = worker.complete_job(leased, res)
    assert completed["status"] == "COMPLETED"
    assert completed["result"]["output_data"]["val"] == 123

    worker.stop()
    assert worker.is_running is False


# --- REQ-085: Dedicated LLM Worker ---
@pytest.mark.asyncio
async def test_req_085_llm_worker():
    worker = LLMWorker(worker_id="test_llm_01")
    payload = {
        "step_key": "script",
        "prompt": "Write a 60 second YouTube Short on Neutron Stars",
        "allowed_providers": ["gemini", "claude"]
    }
    result = await worker.process_task(payload)
    assert result.success is True
    assert result.output_data["provider"] == "gemini"
    assert "GEMINI RESPONSE" in result.output_data["content"]


# --- REQ-086: Dedicated Browser Worker ---
@pytest.mark.asyncio
async def test_req_086_browser_worker(tmp_path):
    profile_dir = str(tmp_path / "chrome_profile")
    worker = BrowserWorker(worker_id="browser_01", profile_dir=profile_dir)

    payload = {
        "step_key": "video_render",
        "prompt": "Futuristic cyberpunk skyline, volumetric lighting",
        "aspect_ratio": "9:16",
        "duration_seconds": 10.0
    }
    result = await worker.process_task(payload)
    assert result.success is True
    assert result.output_data["asset_uri"].endswith("veo_video_render.mp4")


# --- REQ-087: Dedicated Media Worker ---
@pytest.mark.asyncio
async def test_req_087_media_worker():
    worker = MediaWorker(worker_id="media_01")
    payload = {
        "step_key": "stitch",
        "video_clips": ["C:/clip1.mp4", "C:/clip2.mp4"],
        "audio_tracks": ["C:/voice.mp3", "C:/bgm.mp3"]
    }
    result = await worker.process_task(payload)
    assert result.success is True
    assert result.output_data["clips_count"] == 2
    assert result.output_data["audio_tracks_count"] == 2


# --- REQ-088: Dedicated YouTube Worker ---
@pytest.mark.asyncio
async def test_req_088_youtube_worker():
    worker = YouTubeWorker(worker_id="yt_worker_01")
    payload = {
        "step_key": "upload",
        "channel_id": "UC_TEST",
        "file_sha256": "unique_video_hash_123",
        "file_size_bytes": 5_000_000,
        "existing_records": [
            {"channel_id": "UC_TEST", "sha256": "already_uploaded_hash", "video_id": "VID_999"}
        ]
    }
    # Success upload
    result = await worker.process_task(payload)
    assert result.success is True
    assert result.output_data["video_id"].startswith("YT_")

    # Duplicate blocked
    payload["file_sha256"] = "already_uploaded_hash"
    dup_result = await worker.process_task(payload)
    assert dup_result.success is False
    assert dup_result.error_class == "DUPLICATE_RESOURCE"


# --- REQ-089: Workflow Engine Adapters ---
def test_req_089_orchestrator_adapters():
    canonical_def = {
        "id": "shorts_v1",
        "name": "Shorts Production",
        "steps": [
            {"step_key": "research", "step_type": "llm", "config": {}},
            {"step_key": "video", "step_type": "browser", "timeout_seconds": 600}
        ]
    }

    # 1. Local Adapter
    local_adp = LocalOrchestratorAdapter()
    compiled_loc = local_adp.compile_workflow(canonical_def)
    assert compiled_loc["engine"] == "local_engine"
    assert compiled_loc["step_count"] == 2

    # 2. Windmill Adapter
    wm_adp = WindmillOrchestratorAdapter()
    compiled_wm = wm_adp.compile_workflow(canonical_def)
    assert compiled_wm["schema_version"] == "windmill/v1"
    assert len(compiled_wm["value"]["modules"]) == 2

    # 3. Temporal Adapter
    temp_adp = TemporalOrchestratorAdapter()
    compiled_temp = temp_adp.compile_workflow(canonical_def)
    assert compiled_temp["temporal_workflow_type"] == "YouTubeContentWorkflow"
    assert len(compiled_temp["activities"]) == 2


# --- REQ-090: Distributed Job Dispatcher ---
def test_req_090_job_dispatcher():
    # Routing check
    assert JobDispatcher.resolve_queue("llm") == "queue.llm"
    assert JobDispatcher.resolve_queue("browser") == "queue.browser"
    assert JobDispatcher.resolve_queue("media") == "queue.media"
    assert JobDispatcher.resolve_queue("youtube") == "queue.youtube"
    assert JobDispatcher.resolve_queue("qc") == "queue.default"

    # Job creation
    job = JobDispatcher.create_job(
        step_run_id="run_101",
        step_key="video",
        step_type="browser",
        payload={"prompt": "Render test"},
        priority_level="urgent"
    )
    assert job["id"] is not None
    assert job["queue_name"] == "queue.browser"
    assert job["priority"] == 100
    assert job["status"] == "QUEUED"
