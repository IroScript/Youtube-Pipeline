"""
REQ-070: Deterministic Idempotency Key Generator
================================================
Generates deterministic SHA256 hashes to identify business operations
and prevent duplicate executions or redundant external side-effects.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, Optional


class IdempotencyKeyGenerator:
    """
    Produces collision-resistant deterministic operation and execution keys.
    """

    @classmethod
    def generate(
        cls,
        scope: str,
        entity_id: str | int,
        step_key: Optional[str] = None,
        version: Optional[int | str] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generates deterministic SHA256 string from scope and input parameters.
        """
        norm_payload = ""
        if payload is not None:
            norm_payload = json.dumps(payload, sort_keys=True, default=str)

        composite = (
            f"scope={scope}|entity={entity_id}|step={step_key or ''}|"
            f"version={version or ''}|payload={norm_payload}"
        )
        return hashlib.sha256(composite.encode("utf-8")).hexdigest()

    @classmethod
    def generate_asset_hash(cls, file_bytes: bytes) -> str:
        """
        Calculates SHA256 content hash of raw binary data.
        """
        return hashlib.sha256(file_bytes).hexdigest()
