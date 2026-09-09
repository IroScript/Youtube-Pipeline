"""
REQ-081: Completed Step Output Cache Reuser
===========================================
Caches and retrieves validated outputs from previously completed steps.
Avoids recalculating deterministic LLM outputs or re-rendering existing media.
"""

from __future__ import annotations

import hashlib
from typing import Any, Dict, Optional


class StepOutputCache:
    """
    In-memory and persisted cache mapping (step_key, input_hash, config_hash) to output data.
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def make_cache_key(cls, step_key: str, input_hash: str, config_hash: str) -> str:
        composite = f"{step_key}:{input_hash}:{config_hash}"
        return hashlib.sha256(composite.encode("utf-8")).hexdigest()

    def store(
        self,
        step_key: str,
        input_hash: str,
        config_hash: str,
        output_data: Dict[str, Any]
    ) -> str:
        key = self.make_cache_key(step_key, input_hash, config_hash)
        self._cache[key] = {
            "step_key": step_key,
            "input_hash": input_hash,
            "config_hash": config_hash,
            "output_data": output_data,
        }
        return key

    def get(self, step_key: str, input_hash: str, config_hash: str) -> Optional[Dict[str, Any]]:
        key = self.make_cache_key(step_key, input_hash, config_hash)
        record = self._cache.get(key)
        return record.get("output_data") if record else None

    def can_reuse(self, step_key: str, input_hash: str, config_hash: str) -> bool:
        return self.get(step_key, input_hash, config_hash) is not None
