"""Humanless image-to-video automation routes.

The 8-step flow the user runs manually in the Flowboard UI:

  [1] Image node          ──→  static 9:16 reference image
  [2] Image prompt        ──→  text describing the image
  [3] Image generated     ──→  GEM_PIX_2 (9:16)
  [4] Video node          ──→  new node, linked to image
  [5] Connect edge        ──→  image → video (carries start_media_id)
  [6] Video prompt        ──→  text + camera dynamic (8s, 9:16)
  [7] Video generated     ──→  Veo 3.1 Lite, 8s MP4
  [8] Save MP4            ──→  /media/<id>

gets collapsed server-side into ONE endpoint, ``POST /api/automate/image-to-video``.
The agent owns the project (creates a fresh Google Flow project per call),
runs image-gen then video-gen sequentially, persists both as Flowboard
``Request`` rows (so the existing UI shows them too), and returns the
final MP4 URL.

Locked defaults (see ``services/pipeline_defaults.py``):

  * aspect_ratio  = "9:16"          (IMAGE_/VIDEO_ASPECT_RATIO_PORTRAIT)
  * video_model   = "VEO_3_1_LITE"  (cheapest video tier on Pro plan)
  * duration_s    = 8               (single short clip only)
  * image_model   = "GEM_PIX_2"     (Pro plan default)

A second endpoint, ``POST /api/automate/batch``, accepts up to N items and
runs them sequentially via the worker queue, so a single PowerShell call
can produce 5-10 short videos overnight.

Why endpoints (and not "just script the existing /api/requests queue"):

  * The user wants ONE call → ONE video. The existing queue accepts a
    single ``type`` per request, so the script would have to enqueue
    image-gen, poll until done, then enqueue video-gen — that's two
    round-trips + the caller has to know which media_id to thread.
  * Token freshness (``services/token_scheduler.py``) is enforced here,
    not in the queue, because we want to refresh BEFORE the image-gen
    poll starts (image rendering also burns token).
  * Aspect / model / duration validation happens here so a stray caller
    can't sneak a 16:9 or full-Veo request past the queue's "free-form
    params dict" interface.
"""
from __future__ import annotations

import asyncio
import logging
import random
import time
import uuid
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from flowboard.db import get_session
from flowboard.db.models import Node, Request
from flowboard.services.flow_client import flow_client
from flowboard.services.pipeline_defaults import (
    DEFAULT_ASPECT_RATIO,
    DEFAULT_DURATION_S,
    DEFAULT_IMAGE_MODEL,
    DEFAULT_VIDEO_MODEL,
    ESTIMATED_CREDITS_PER_VIDEO,
    PipelineConfigError,
    apply_pipeline_defaults,
)
from flowboard.services.token_scheduler import token_scheduler
from flowboard.worker.processor import (
    _handle_gen_image,
    _handle_gen_video,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/automate", tags=["automate"])


# ─── Aspect mapping ────────────────────────────────────────────────────────
# User-facing string ("9:16") → Google's image/video aspect enum. Kept
# local to this module so pipeline_defaults can stay user-friendly without
# importing Google's enum vocabulary.

_ASPECT_TO_IMAGE_ENUM = {
    "9:16": "IMAGE_ASPECT_RATIO_PORTRAIT",
    "16:9": "IMAGE_ASPECT_RATIO_LANDSCAPE",
}
_ASPECT_TO_VIDEO_ENUM = {
    "9:16": "VIDEO_ASPECT_RATIO_PORTRAIT",
    "16:9": "VIDEO_ASPECT_RATIO_LANDSCAPE",
}


def _aspect_to_image_enum(aspect: str) -> str:
    try:
        return _ASPECT_TO_IMAGE_ENUM[aspect]
    except KeyError:
        raise HTTPException(
            400,
            f"aspect {aspect!r} has no Google image enum mapping. "
            f"Known: {sorted(_ASPECT_TO_IMAGE_ENUM)}",
        )


def _aspect_to_video_enum(aspect: str) -> str:
    try:
        return _ASPECT_TO_VIDEO_ENUM[aspect]
    except KeyError:
        raise HTTPException(
            400,
            f"aspect {aspect!r} has no Google video enum mapping. "
            f"Known: {sorted(_ASPECT_TO_VIDEO_ENUM)}",
        )


# ─── Request models ────────────────────────────────────────────────────────

class AutomateOneRequest(BaseModel):
    """Input for POST /api/automate/image-to-video.

    Required:
      * image_prompt  — what the GEM_PIX_2 reference image should show
      * video_prompt  — what the Veo 3.1 Lite clip should animate

    Optional but recommended:
      * camera_dynamic — explicit motion hint (e.g. "slow dolly forward
        + tilt up"). Prepended to ``video_prompt`` when building the
        final video prompt. Keeps motion intent separate from content.

    Everything else (aspect, model, duration) is locked and cannot be
    overridden — see ``pipeline_defaults.apply_pipeline_defaults``.
    """

    image_prompt: str = Field(min_length=1, max_length=4000)
    video_prompt: str = Field(min_length=1, max_length=4000)
    camera_dynamic: Optional[str] = Field(default=None, max_length=500)
    name: Optional[str] = Field(
        default=None,
        max_length=120,
        description="Optional label for the saved MP4. Defaults to a uuid.",
    )

    # Locked fields accepted but ignored (silently coerced to defaults).
    # Putting them in the schema rather than rejecting them lets a caller
    # POST the same payload shape without exploding on extra fields —
    # pipeline_defaults will rewrite them to the locked values.
    aspect_ratio: Optional[str] = Field(default=None)
    video_model: Optional[str] = Field(default=None)
    duration_s: Optional[int] = Field(default=None)
    image_model: Optional[str] = Field(default=None)


class AutomateOneResponse(BaseModel):
    """Result of a single image-to-video run."""

    image_media_id: Optional[str] = None
    video_media_id: Optional[str] = None
    mp4_url: Optional[str] = None
    image_request_id: Optional[int] = None
    video_request_id: Optional[int] = None
    image_project_id: Optional[str] = None
    video_project_id: Optional[str] = None
    credits_remaining: Optional[int] = None
    duration_s: int
    aspect_ratio: str
    video_model: str
    elapsed_s: float
    name: str


class AutomateBatchRequest(BaseModel):
    items: list[AutomateOneRequest] = Field(min_length=1, max_length=50)


class AutomateBatchResponse(BaseModel):
    """Aggregate batch result. Per-item state lives in ``results``."""

    total: int
    succeeded: int
    failed: int
    results: list[dict[str, Any]]


# ─── Helpers ──────────────────────────────────────────────────────────────

def _ensure_extension_connected() -> None:
    """Bail loudly if the Chrome extension isn't talking to the agent.

    We refuse to enqueue requests in that state because the worker will
    just hang on the first proxy call (Google API call has to go through
    the extension). Better to fail fast with a clear hint than to spin
    in a 30-poll-attempt timeout.
    """
    if not flow_client.connected:
        raise HTTPException(
            503,
            "Chrome extension is not connected to the agent. "
            "Open Flow in Profile 4 and reload the Flowboard Bridge "
            "extension, then retry.",
        )


def _ensure_credits_available() -> int:
    """Pre-flight: refuse if the user doesn't have enough credits.

    ``ESTIMATED_CREDITS_PER_VIDEO`` (10) is a conservative upper bound for
    one Veo 3.1 Lite 8s clip. The user's stated balance was 745 — so
    ~74 videos can run before we should stop. We check BEFORE starting
    so a depleted credit state doesn't waste 60-90s of render time only
    to 4xx at the end.
    """
    if flow_client._credits is None:
        # /v1/credits not yet resolved. Don't block — extension will
        # refresh on the next WS event. Just log.
        logger.warning("Automate: credits unknown, proceeding without pre-check")
        return -1
    if flow_client._credits < ESTIMATED_CREDITS_PER_VIDEO:
        raise HTTPException(
            402,
            f"insufficient credits: have {flow_client._credits}, "
            f"need ~{ESTIMATED_CREDITS_PER_VIDEO} per video. "
            f"Buy more credits on labs.google before retrying.",
        )
    return flow_client._credits


def _build_full_video_prompt(video_prompt: str, camera_dynamic: str | None) -> str:
    """Prepend camera_dynamic to video_prompt if present.

    Kept simple — no LLM call, no template engine. The user writes the
    video_prompt knowing camera_dynamic will land at the front. We just
    glue them with a colon separator so motion intent reads clearly:

        "slow dolly forward + tilt up: a lone astronaut on Mars ..."
    """
    if camera_dynamic and camera_dynamic.strip():
        cd = camera_dynamic.strip().rstrip(":")
        vp = video_prompt.strip()
        return f"{cd}: {vp}" if vp else cd
    return video_prompt.strip()


def _make_project_id() -> str:
    """Generate a project_id that satisfies ``is_valid_project_id``.

    The SDK validates the format — easiest portable solution is to use a
    uuid4 in lowercase hex, which Flow accepts as a project handle.
    """
    return uuid.uuid4().hex


def _extract_media_id(image_resp: dict) -> Optional[str]:
    """Pull the canonical media_id out of a gen_image response.

    The SDK returns ``media_entries: [{media_id, url, mediaType, ...}, ...]``
    for image gen (and similarly for video). We grab the first non-empty
    ``media_id``. If the response shape changes in the future, this
    returns None and the caller surfaces a clear error.

    Key fallback order matches what we've actually seen in production:
      ``media_id`` (Google's flow SDK uses this) → ``uuid_media_id``
      (older alternate) → ``id`` (most-generic).
    """
    entries = image_resp.get("media_entries") or []
    for entry in entries:
        if isinstance(entry, dict):
            mid = (
                entry.get("media_id")
                or entry.get("uuid_media_id")
                or entry.get("id")
            )
            if isinstance(mid, str) and mid:
                return mid
    return None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress_pct: int
    stage: str
    stage_message: str
    elapsed_s: float
    image_media_id: Optional[str] = None
    video_media_id: Optional[str] = None
    result: Optional[AutomateOneResponse] = None
    error: Optional[str] = None


_JOB_STORE: dict[str, dict[str, Any]] = {}


def _update_job_status(job_id: Optional[str], **kwargs) -> None:
    if job_id and job_id in _JOB_STORE:
        _JOB_STORE[job_id].update(kwargs)
        _JOB_STORE[job_id]["updated_at"] = time.monotonic()


# ─── One-shot endpoint ─────────────────────────────────────────────────────

@router.post("/image-to-video", response_model=AutomateOneResponse)
async def automate_image_to_video(body: AutomateOneRequest, job_id: Optional[str] = None):
    """Run the full image → video pipeline in a single call.

    Steps:

      1. Validate + lock pipeline defaults (9:16 / Lite / 8s / GEM_PIX_2).
      2. Verify Chrome extension is connected.
      3. Verify sufficient credits (>= ESTIMATED_CREDITS_PER_VIDEO).
      4. Refresh Bearer token if older than 50 min (token_scheduler).
      5. Create a Google Flow project_id for this run.
      6. Generate image (GEM_PIX_2, 9:16) via ``_handle_gen_image``.
      7. Use image's media_id as start_media_id for video gen.
      8. Generate video (Veo 3.1 Lite, 8s, 9:16) via ``_handle_gen_video``.
      9. Return final MP4 URL via ``/media/<video_id>``.
    """
    started = time.monotonic()
    _update_job_status(
        job_id,
        status="running",
        progress_pct=10,
        stage="initializing",
        stage_message="Checking Bearer token & paygate tier...",
    )

    # ── 1. Lock defaults ────────────────────────────────────────────────
    try:
        defaults = apply_pipeline_defaults(body.model_dump(exclude_none=True))
    except PipelineConfigError as exc:
        _update_job_status(job_id, status="failed", stage="failed", stage_message=str(exc), error=str(exc))
        raise HTTPException(400, str(exc))

    aspect = defaults["aspect_ratio"]            # "9:16"
    video_model = defaults["video_model"]        # "VEO_3_1_LITE"
    duration_s = defaults["duration_s"]          # 8
    image_model = defaults["image_model"]        # "GEM_PIX_2"

    # ── 2-3. Pre-flight ─────────────────────────────────────────────────
    try:
        _ensure_extension_connected()
        credits_remaining = _ensure_credits_available()
    except HTTPException as exc:
        _update_job_status(job_id, status="failed", stage="failed", stage_message=str(exc.detail), error=str(exc.detail))
        raise

    # ── 4. Token freshness ──────────────────────────────────────────────
    try:
        await token_scheduler.ensure_fresh()
    except Exception as exc:  # noqa: BLE001
        err_msg = f"token refresh failed: {exc}"
        _update_job_status(job_id, status="failed", stage="failed", stage_message=err_msg, error=err_msg)
        raise HTTPException(503, err_msg)

    # ── 5. Project handle ───────────────────────────────────────────────
    project_id = _make_project_id()
    paygate_tier = flow_client.paygate_tier
    if paygate_tier is None:
        err_msg = (
            "paygate tier unknown — Chrome extension hasn't yet captured "
            "the user's Flow plan. Open Flow in Profile 4 once, then retry."
        )
        _update_job_status(job_id, status="failed", stage="failed", stage_message=err_msg, error=err_msg)
        raise HTTPException(503, err_msg)

    # ── 6. Image gen ────────────────────────────────────────────────────
    _update_job_status(
        job_id,
        progress_pct=20,
        stage="generating_image",
        stage_message="Preparing image generation (human-like pause)...",
    )
    # Human-like pre-action pause (3s to 8s) to prevent bot detection
    await asyncio.sleep(random.uniform(3.0, 8.0))

    image_params = {
        "prompt": body.image_prompt,
        "project_id": project_id,
        "aspect_ratio": _aspect_to_image_enum(aspect),
        "image_model": image_model,
        "paygate_tier": paygate_tier,
        "variant_count": 1,
    }

    image_resp: dict[str, Any] = {}
    image_err: Optional[str] = None
    max_gen_retries = 10  # Extended to 10 attempts for ultra-resilience
    for attempt in range(1, max_gen_retries + 1):
        _update_job_status(
            job_id,
            progress_pct=20 + (attempt - 1) * 2,
            stage="generating_image",
            stage_message=f"Generating reference image (attempt {attempt}/{max_gen_retries})...",
        )
        image_resp, image_err = await _handle_gen_image(image_params)
        if not image_err:
            break
        retry_delay = random.uniform(10.0, 30.0)
        logger.warning(
            "Automate: image gen attempt %d/%d failed (%s) — retrying in %.1fs...",
            attempt, max_gen_retries, image_err, retry_delay,
        )
        if attempt < max_gen_retries:
            await asyncio.sleep(retry_delay)

    if image_err:
        logger.warning("Automate: image gen failed after %d attempts: %s", max_gen_retries, image_err)
        err_msg = f"image generation failed: {image_err}"
        _update_job_status(job_id, status="failed", stage="failed", stage_message=err_msg, error=err_msg)
        raise HTTPException(502, err_msg)
    image_media_id = _extract_media_id(image_resp)
    if not image_media_id:
        err_msg = "image generation succeeded but no media_id returned."
        _update_job_status(job_id, status="failed", stage="failed", stage_message=err_msg, error=err_msg)
        raise HTTPException(502, err_msg)

    # Persist a Request row so the existing UI shows this generation.
    image_request_id = _record_request(
        type="gen_image",
        params=image_params,
        result=image_resp,
    )

    # Human-like session gap (20s to 50s) between image gen and video submit
    session_gap = random.uniform(20.0, 50.0)
    _update_job_status(
        job_id,
        progress_pct=40,
        stage="generating_video",
        stage_message=f"Reference image ready ({image_media_id[:8]})! Human pause ({session_gap:.1f}s) before video submit...",
        image_media_id=image_media_id,
    )
    await asyncio.sleep(session_gap)

    # ── 7-8. Video gen (image → video) ─────────────────────────────────
    full_video_prompt = _build_full_video_prompt(
        body.video_prompt,
        body.camera_dynamic,
    )
    video_params = {
        "prompt": full_video_prompt,
        "project_id": project_id,
        "start_media_id": image_media_id,
        "aspect_ratio": _aspect_to_video_enum(aspect),
        "paygate_tier": paygate_tier,
        "video_quality": video_model,
        "__job_id": job_id,
    }

    video_resp: dict[str, Any] = {}
    video_err: Optional[str] = None
    for attempt in range(1, max_gen_retries + 1):
        _update_job_status(
            job_id,
            progress_pct=45 + (attempt - 1) * 2,
            stage="generating_video",
            stage_message=f"Rendering 8s Veo 3.1 Lite video (attempt {attempt}/{max_gen_retries})...",
        )
        video_resp, video_err = await _handle_gen_video(video_params)
        if not video_err:
            break
        retry_delay = random.uniform(10.0, 30.0)
        logger.warning(
            "Automate: video gen attempt %d/%d failed (%s) — retrying in %.1fs...",
            attempt, max_gen_retries, video_err, retry_delay,
        )
        if attempt < max_gen_retries:
            await asyncio.sleep(retry_delay)

    if video_err:
        logger.warning("Automate: video gen failed after %d attempts: %s", max_gen_retries, video_err)
        err_msg = f"video generation failed: {video_err}"
        _update_job_status(job_id, status="failed", stage="failed", stage_message=err_msg, error=err_msg)
        raise HTTPException(
            502,
            f"video generation failed: {video_err}. "
            f"Image was generated successfully as {image_media_id}.",
        )

    video_media_id = _extract_media_id(video_resp)
    if not video_media_id:
        err_msg = "video generation succeeded but no media_id returned."
        _update_job_status(job_id, status="failed", stage="failed", stage_message=err_msg, error=err_msg)
        raise HTTPException(502, err_msg)

    video_request_id = _record_request(
        type="gen_video",
        params=video_params,
        result=video_resp,
    )

    elapsed = round(time.monotonic() - started, 2)
    name = body.name or uuid.uuid4().hex[:12]

    res_obj = AutomateOneResponse(
        image_media_id=image_media_id,
        video_media_id=video_media_id,
        mp4_url=f"/media/{video_media_id}",
        image_request_id=image_request_id,
        video_request_id=video_request_id,
        image_project_id=project_id,
        video_project_id=project_id,
        credits_remaining=credits_remaining if credits_remaining >= 0 else None,
        duration_s=duration_s,
        aspect_ratio=aspect,
        video_model=video_model,
        elapsed_s=elapsed,
        name=name,
    )

    _update_job_status(
        job_id,
        status="completed",
        progress_pct=100,
        stage="completed",
        stage_message=f"Video generated successfully in {elapsed}s!",
        video_media_id=video_media_id,
        result=res_obj,
    )

    logger.info(
        "Automate: OK image=%s video=%s credits_left=%s elapsed=%.1fs",
        image_media_id, video_media_id, credits_remaining, elapsed,
    )

    return res_obj


async def _run_job_background(job_id: str, body: AutomateOneRequest) -> None:
    try:
        await automate_image_to_video(body, job_id=job_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Background job %s failed", job_id)
        _update_job_status(job_id, status="failed", stage="failed", stage_message=str(exc), error=str(exc))


@router.post("/submit-async")
async def automate_submit_async(body: AutomateOneRequest):
    """Submit an image-to-video job asynchronously and return a job_id for polling status."""
    job_id = uuid.uuid4().hex
    _JOB_STORE[job_id] = {
        "job_id": job_id,
        "status": "running",
        "progress_pct": 5,
        "stage": "initializing",
        "stage_message": "Initializing image-to-video pipeline...",
        "started_at": time.monotonic(),
        "updated_at": time.monotonic(),
        "elapsed_s": 0.0,
        "image_media_id": None,
        "video_media_id": None,
        "result": None,
        "error": None,
    }
    asyncio.create_task(_run_job_background(job_id, body))
    return {"job_id": job_id, "status": "running"}


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Poll live progress for an active automate job with smooth monotonic percentage interpolation."""
    if job_id not in _JOB_STORE:
        raise HTTPException(404, f"Job {job_id!r} not found")
    data = dict(_JOB_STORE[job_id])

    if data["status"] == "running":
        started = data.get("started_at", time.monotonic())
        elapsed = round(time.monotonic() - started, 1)
        data["elapsed_s"] = elapsed

        stage = data.get("stage", "initializing")
        current_pct = data.get("progress_pct", 5)

        # Smooth interpolation based on elapsed time and stage
        if stage == "initializing":
            calc_pct = min(15, 5 + int(elapsed * 3.0))
        elif stage == "generating_image":
            # Image gen takes ~25s; map 0s..25s -> 15%..39%
            img_elapsed = max(0.0, elapsed - 3.0)
            calc_pct = min(39, 15 + int(img_elapsed * 1.0))
        elif stage == "generating_video":
            # Video gen takes ~90s; map 0s..90s -> 40%..95%
            vid_elapsed = max(0.0, elapsed - 30.0)
            calc_pct = min(95, 40 + int(vid_elapsed * 0.6))
        else:
            calc_pct = current_pct

        max_pct = max(current_pct, calc_pct, data.get("max_progress_pct", 0))
        final_pct = min(99, max_pct)
        data["progress_pct"] = final_pct
        _JOB_STORE[job_id]["max_progress_pct"] = final_pct

    return JobStatusResponse(**data)


# ─── Batch endpoint ───────────────────────────────────────────────────────

@router.post("/batch", response_model=AutomateBatchResponse)
async def automate_batch(body: AutomateBatchRequest):
    """Run N image-to-video jobs sequentially.

    Sequential (not concurrent) because:

      * Veo 3.1 Lite on Pro plan has a per-account rate-limit (~1 video
        every 30-60s). Parallel requests would hit 429 immediately.
      * Sequential credit accounting is simpler — if item 3 fails for
        lack of credits, we surface that clearly instead of starting 4
        more parallel jobs.
      * Image gen takes 10-30s, video gen takes 60-90s — so 5 items
        complete in ~8-10 min, well within the 50-min token refresh
        window.
    """
    results: list[dict[str, Any]] = []
    succeeded = 0
    failed = 0

    for idx, item in enumerate(body.items):
        try:
            # Re-use the one-shot endpoint's body schema and validator by
            # calling the function directly. Returns AutomateOneResponse
            # (FastAPI unwraps to dict automatically when we put it in a
            # list, but to be explicit we convert to dict here).
            result = await automate_image_to_video(item)
            results.append(
                {"index": idx, "status": "done", "name": result.name, **result.model_dump()}
            )
            succeeded += 1
            if idx < len(body.items) - 1:
                batch_gap = random.uniform(20.0, 50.0)
                logger.info("Automate: batch item %d completed. Pausing %.1fs before next item...", idx, batch_gap)
                await asyncio.sleep(batch_gap)
        except HTTPException as exc:
            results.append(
                {
                    "index": idx,
                    "status": "failed",
                    "name": item.name,
                    "error": str(exc.detail),
                    "http_status": exc.status_code,
                }
            )
            failed += 1
        except Exception as exc:  # noqa: BLE001
            logger.exception("Automate: batch item %d unexpected error", idx)
            results.append(
                {
                    "index": idx,
                    "status": "failed",
                    "name": item.name,
                    "error": f"unexpected: {exc}",
                }
            )
            failed += 1

    return AutomateBatchResponse(
        total=len(body.items),
        succeeded=succeeded,
        failed=failed,
        results=results,
    )


# ─── Internal helper ──────────────────────────────────────────────────────

def _record_request(type: str, params: dict, result: dict) -> int:
    """Persist a Flowboard Request row for the existing UI to show.

    We mark status='done' immediately because the handler returned
    successfully (we wouldn't reach this point otherwise). The result
    blob is stored in ``result`` so the UI's detail view can render it.
    """
    with get_session() as s:
        req = Request(
            type=type,
            params=params,
            result=result,
            status="done",
        )
        s.add(req)
        s.commit()
        s.refresh(req)
        return int(req.id)