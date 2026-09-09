"""
REQ-078: Immutable Workflow Version Publisher
=============================================
Validates, hashes, locks, and publishes workflow versions into immutable artifacts.
Enforces the Golden Rule: Published workflow versions can NEVER be modified.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict
from services.workflow.dag_resolver import DAGResolver


class ImmutableVersionPublisher:
    """
    Validates draft workflow DAGs and locks them into immutable published versions.
    """

    @classmethod
    def publish_version(cls, version_data: Dict[str, Any]) -> Dict[str, Any]:
        current_status = version_data.get("status")
        if current_status == "published":
            raise ValueError("Version is already published and immutable. Create a new draft version.")
        if current_status != "draft":
            raise ValueError(f"Cannot publish version with status '{current_status}'")

        definition = version_data.get("definition", {})
        steps = definition.get("steps", [])
        if not steps:
            raise ValueError("Cannot publish an empty workflow without steps")

        # 1. Validate DAG integrity and detect circular dependencies
        DAGResolver.resolve_execution_order(steps)

        # 2. Compute SHA256 definition hash
        serialized = json.dumps(definition, sort_keys=True)
        def_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        # 3. Lock into published status
        version_data["status"] = "published"
        version_data["definition_hash"] = def_hash
        version_data["published_at"] = datetime.now(timezone.utc).isoformat()

        return version_data
