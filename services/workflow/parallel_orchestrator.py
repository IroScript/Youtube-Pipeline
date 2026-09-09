"""
REQ-057: Parallel Step Orchestrator
===================================
Identifies concurrent execution waves, manages fan-out and fan-in DAG structures,
and enforces resource/worker concurrency limits.
"""

from __future__ import annotations

from typing import Dict, List, Set, Any


class ParallelOrchestrator:
    """
    Schedules and batches ready workflow steps for concurrent execution.
    """

    DEFAULT_CONCURRENCY_LIMITS: Dict[str, int] = {
        "browser": 1,  # Strict single browser profile access
        "media": 2,    # CPU/RAM intensive FFmpeg
        "llm": 4,      # LLM API rate limits
        "youtube": 1,  # Single upload slot per channel
        "python": 4,
        "qc": 2,
    }

    @classmethod
    def partition_into_waves(cls, steps: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Groups steps into execution waves where all steps in a wave can run concurrently
        given completion of prior waves.
        """
        step_map = {s["step_key"]: s for s in steps}
        in_degree: Dict[str, int] = {s["step_key"]: len(s.get("depends_on", [])) for s in steps}
        completed: Set[str] = set()
        waves: List[List[Dict[str, Any]]] = []

        while len(completed) < len(steps):
            current_wave = []
            for k, s in step_map.items():
                if k not in completed:
                    deps = set(s.get("depends_on", []))
                    if deps.issubset(completed):
                        current_wave.append(s)

            if not current_wave:
                # Cycle or unscheduled steps remain
                break

            waves.append(current_wave)
            for s in current_wave:
                completed.add(s["step_key"])

        return waves

    @classmethod
    def filter_concurrency_slots(
        cls,
        ready_steps: List[Dict[str, Any]],
        currently_running: List[Dict[str, Any]],
        concurrency_limits: Dict[str, int] | None = None
    ) -> List[Dict[str, Any]]:
        """
        Filters ready steps against type-specific concurrency quotas.
        """
        limits = concurrency_limits or cls.DEFAULT_CONCURRENCY_LIMITS
        active_counts: Dict[str, int] = {}
        for r in currently_running:
            stype = r.get("step_type", "default")
            active_counts[stype] = active_counts.get(stype, 0) + 1

        selected: List[Dict[str, Any]] = []
        for step in ready_steps:
            stype = step.get("step_type", "default")
            limit = limits.get(stype, 4)
            current = active_counts.get(stype, 0)
            if current < limit:
                selected.append(step)
                active_counts[stype] = current + 1

        return selected
