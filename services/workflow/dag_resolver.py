"""
REQ-055: Execution DAG Dependency Resolver
==========================================
Topological sorting, cycle detection, and ready-step resolution for workflow DAGs.
Uses Kahn's algorithm for deterministic dependency ordering.
"""

from __future__ import annotations

from typing import Dict, List, Set, Any
from collections import deque


class CycleDetectedException(Exception):
    """Raised when a circular dependency cycle is detected in the workflow DAG."""
    pass


class MissingDependencyException(Exception):
    """Raised when a step depends on an undefined step key."""
    pass


class DAGResolver:
    """
    Validates and resolves dependency graphs for workflow execution.
    """

    @classmethod
    def resolve_execution_order(cls, steps: List[Dict[str, Any]]) -> List[str]:
        """
        Returns a list of step_keys sorted in valid topological execution order.
        Raises CycleDetectedException if a cycle exists.
        Raises MissingDependencyException if an unknown dependency is referenced.
        """
        step_keys = {s["step_key"] for s in steps}
        adj_list: Dict[str, List[str]] = {k: [] for k in step_keys}
        in_degree: Dict[str, int] = {k: 0 for k in step_keys}

        for step in steps:
            curr_key = step["step_key"]
            depends_on = step.get("depends_on", [])
            for dep in depends_on:
                if dep not in step_keys:
                    raise MissingDependencyException(
                        f"Step '{curr_key}' depends on non-existent step '{dep}'"
                    )
                adj_list[dep].append(curr_key)
                in_degree[curr_key] += 1

        queue = deque([k for k, deg in in_degree.items() if deg == 0])
        sorted_order: List[str] = []

        while queue:
            node = queue.popleft()
            sorted_order.append(node)
            for neighbor in adj_list[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(sorted_order) != len(step_keys):
            unresolved = [k for k, deg in in_degree.items() if deg > 0]
            raise CycleDetectedException(
                f"Circular dependency detected involving steps: {unresolved}"
            )

        return sorted_order

    @classmethod
    def get_ready_steps(
        cls,
        steps: List[Dict[str, Any]],
        completed_step_keys: Set[str],
        active_step_keys: Set[str] | None = None
    ) -> List[Dict[str, Any]]:
        """
        Identifies all steps ready for immediate execution:
        - Must be enabled
        - Not already completed
        - Not currently active/running
        - All dependencies in `depends_on` are satisfied in `completed_step_keys`
        """
        active = active_step_keys or set()
        ready = []

        for step in steps:
            key = step["step_key"]
            if not step.get("enabled", True):
                continue
            if key in completed_step_keys or key in active:
                continue

            deps = set(step.get("depends_on", []))
            if deps.issubset(completed_step_keys):
                ready.append(step)

        return ready
