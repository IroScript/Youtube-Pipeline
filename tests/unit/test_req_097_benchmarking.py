"""
REQ-097: Performance Benchmarking & Optimization
================================================
Dedicated automated test suite proving:
1. Live execution of micro-benchmarks across critical workflow components.
2. DAG Topological Sort latency satisfies SLA (< 5.0 ms).
3. Parallel Wave Partitioning latency satisfies SLA (< 5.0 ms).
4. Checkpoint SHA256 integrity generation satisfies SLA (< 5.0 ms).
5. docs/benchmarking_report.md exists and contains verified performance metrics.
"""

import sys
import time
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from services.workflow.dag_resolver import DAGResolver
from services.workflow.parallel_orchestrator import ParallelOrchestrator
from services.workflow.checkpoint_engine import CheckpointEngine

BENCHMARK_REPORT = REPO_ROOT / "docs" / "benchmarking_report.md"


def test_req_097_benchmark_report_presence():
    """Verify benchmarking documentation exists with SLA definitions."""
    assert BENCHMARK_REPORT.is_file(), f"Missing benchmark report: {BENCHMARK_REPORT}"
    content = BENCHMARK_REPORT.read_text(encoding="utf-8")
    assert "DAG Topological Resolver" in content
    assert "Parallel Wave Partitioning" in content
    assert "Checkpoint SHA256 Hashing" in content


def test_req_097_dag_resolver_benchmark():
    """Measure DAGResolver execution order sort latency over 100 iterations."""
    steps = [
        {"step_key": "research", "depends_on": []},
        {"step_key": "script", "depends_on": ["research"]},
        {"step_key": "seo", "depends_on": ["script"]},
        {"step_key": "thumbnail", "depends_on": ["script"]},
        {"step_key": "audio", "depends_on": ["script"]},
        {"step_key": "video", "depends_on": ["seo", "thumbnail", "audio"]},
    ]

    iterations = 100
    start = time.perf_counter()
    for _ in range(iterations):
        order = DAGResolver.resolve_execution_order(steps)
    total_time_ms = (time.perf_counter() - start) * 1000
    avg_latency_ms = total_time_ms / iterations

    assert len(order) == 6
    assert avg_latency_ms < 5.0, f"DAG sort average latency too high: {avg_latency_ms:.4f} ms"


def test_req_097_parallel_wave_partitioning_benchmark():
    """Measure ParallelOrchestrator wave partitioning latency over 100 iterations."""
    steps = [
        {"step_key": "s1", "depends_on": []},
        {"step_key": "s2", "depends_on": ["s1"]},
        {"step_key": "s3a", "depends_on": ["s2"]},
        {"step_key": "s3b", "depends_on": ["s2"]},
        {"step_key": "s3c", "depends_on": ["s2"]},
        {"step_key": "s4", "depends_on": ["s3a", "s3b", "s3c"]},
    ]

    iterations = 100
    start = time.perf_counter()
    for _ in range(iterations):
        waves = ParallelOrchestrator.partition_into_waves(steps)
    total_time_ms = (time.perf_counter() - start) * 1000
    avg_latency_ms = total_time_ms / iterations

    assert len(waves) == 4
    assert avg_latency_ms < 5.0, f"Wave partitioning latency too high: {avg_latency_ms:.4f} ms"


def test_req_097_checkpoint_hashing_benchmark():
    """Measure CheckpointEngine SHA256 snapshot latency over 100 iterations."""
    context = {"idea_id": 99, "title": "Quantum Battery Supergrid"}
    outputs = {
        "step1": {"result": "ok", "value": [1, 2, 3]},
        "step2": {"analysis": "complete", "score": 99.8},
    }

    iterations = 100
    start = time.perf_counter()
    for i in range(iterations):
        chk = CheckpointEngine.create_checkpoint(f"exec_{i}", "step2", context, outputs)
    total_time_ms = (time.perf_counter() - start) * 1000
    avg_latency_ms = total_time_ms / iterations

    assert "state_hash" in chk
    assert avg_latency_ms < 5.0, f"Checkpoint hashing latency too high: {avg_latency_ms:.4f} ms"
