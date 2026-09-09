"""
REQ-075: Veo 3.1 Render Deduplicator & Tracker
==============================================
Tracks video render prompts and cached outputs.
Deduplicates render jobs across ideas, avoiding expensive redundant GPU generation.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, Optional


class RenderDeduplicator:
    """
    Computes render signature and tracks active/completed video rendering jobs.
    """

    def __init__(self):
        self._render_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def compute_render_signature(
        cls,
        prompt: str,
        negative_prompt: Optional[str] = None,
        aspect_ratio: str = "9:16",
        duration_seconds: float = 10.0,
        model: str = "veo-3.1"
    ) -> str:
        payload = {
            "prompt": prompt.strip(),
            "negative_prompt": (negative_prompt or "").strip(),
            "aspect_ratio": aspect_ratio,
            "duration": duration_seconds,
            "model": model,
        }
        serialized = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get_cached_render(self, render_signature: str) -> Optional[Dict[str, Any]]:
        return self._render_cache.get(render_signature)

    def register_completed_render(
        self,
        render_signature: str,
        asset_uri: str,
        asset_sha256: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        record = {
            "render_signature": render_signature,
            "asset_uri": asset_uri,
            "asset_sha256": asset_sha256,
            "metadata": metadata or {},
        }
        self._render_cache[render_signature] = record
        return record
