"""
REQ-082: Dynamic Step Insertion & Bypass Engine
===============================================
Enables live DAG reconfiguration: inserting intermediate inspection gates
or bypassing deprecated processing stages in draft/child workflow versions.
"""

from __future__ import annotations

from typing import Any, Dict, List


class GraphMutator:
    """
    Mutates workflow step definitions to insert or bypass steps.
    """

    @classmethod
    def insert_step_after(
        cls,
        steps: List[Dict[str, Any]],
        after_step_key: str,
        new_step: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Inserts new_step after after_step_key and adjusts dependencies of downstream steps.
        """
        mutated = [dict(s) for s in steps]
        new_key = new_step["step_key"]

        # 1. new_step depends on after_step_key
        new_step["depends_on"] = [after_step_key]

        # 2. Find steps that directly depended on after_step_key and re-route them to depend on new_key
        for s in mutated:
            if after_step_key in s.get("depends_on", []):
                s["depends_on"] = [
                    new_key if dep == after_step_key else dep for dep in s["depends_on"]
                ]

        mutated.append(new_step)
        return mutated

    @classmethod
    def bypass_step(cls, steps: List[Dict[str, Any]], step_to_bypass: str) -> List[Dict[str, Any]]:
        """
        Disables step_to_bypass and routes its downstream dependencies directly to its upstream parents.
        """
        mutated = [dict(s) for s in steps]
        target_step = next((s for s in mutated if s["step_key"] == step_to_bypass), None)
        if not target_step:
            return mutated

        upstream_deps = target_step.get("depends_on", [])
        target_step["enabled"] = False

        # Re-route children of target_step to its parents
        for s in mutated:
            if step_to_bypass in s.get("depends_on", []):
                new_deps = [d for d in s["depends_on"] if d != step_to_bypass] + upstream_deps
                s["depends_on"] = list(dict.fromkeys(new_deps))  # remove duplicates while preserving order

        return mutated
