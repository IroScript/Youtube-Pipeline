"""
REQ-079: Execution Compatibility Validator
==========================================
Compares source and target workflow versions to classify step reusable,
modified, added, and removed statuses for seamless execution migration.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Set


@dataclass
class VersionDiff:
    reusable_step_keys: List[str]
    modified_step_keys: List[str]
    added_step_keys: List[str]
    removed_step_keys: List[str]


class ExecutionCompatibilityValidator:
    """
    Computes semantic differences between workflow versions.
    """

    @classmethod
    def _step_signature(cls, step: Dict[str, Any]) -> str:
        payload = {
            "type": step.get("step_type"),
            "config": step.get("config", {}),
            "depends_on": sorted(step.get("depends_on", [])),
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

    @classmethod
    def compare_versions(
        cls,
        source_steps: List[Dict[str, Any]],
        target_steps: List[Dict[str, Any]]
    ) -> VersionDiff:
        src_map = {s["step_key"]: s for s in source_steps}
        tgt_map = {s["step_key"]: s for s in target_steps}

        reusable = []
        modified = []
        added = []
        removed = []

        # Check target steps against source
        for key, tgt_step in tgt_map.items():
            if key not in src_map:
                added.append(key)
            else:
                src_step = src_map[key]
                if cls._step_signature(src_step) == cls._step_signature(tgt_step):
                    reusable.append(key)
                else:
                    modified.append(key)

        # Check removed steps
        for key in src_map:
            if key not in tgt_map:
                removed.append(key)

        return VersionDiff(
            reusable_step_keys=reusable,
            modified_step_keys=modified,
            added_step_keys=added,
            removed_step_keys=removed
        )
