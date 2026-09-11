"""Quick test: atomic CAS guard + pause gate"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "PromptDatabase"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from infrastructure.database.engine import create_db_engine, init_database
from sqlmodel import Session
init_database()
engine = create_db_engine()

print("=== TEST: Atomic CAS Guard ===")
with Session(engine) as session:
    from services.pipeline.production_orchestrator import ProductionOrchestrator
    from services.pipeline.generation_guard import GenerationGuard
    orch = ProductionOrchestrator(session)
    guard = GenerationGuard(session)
    orch._ensure_state(20)

    r1 = guard.register_active_job(20, "test", "job_001")
    print(f"  register #1: {r1} (expected True)")

    r2 = guard.register_active_job(20, "test", "job_002")
    print(f"  register #2: {r2} (expected False)")

    has = guard.has_active_job(20)
    print(f"  has_active_job: {has} (expected True)")

    guard.clear_active_job(20)
    r3 = guard.register_active_job(20, "test", "job_003")
    print(f"  register after clear: {r3} (expected True)")
    guard.clear_active_job(20)

    ok = r1 is True and r2 is False and has is True and r3 is True
    print(f"  Verdict: {'PASS' if ok else 'FAIL'}")

print()
print("=== TEST: Pause Gate in Orchestrator ===")
with Session(engine) as session:
    from services.pipeline.production_orchestrator import ProductionOrchestrator
    from services.pipeline.pause_resume import PauseResumeController
    orch = ProductionOrchestrator(session)
    ctrl = PauseResumeController(session)
    orch._ensure_state(21)

    ctrl.pause_idea(21, reason="Test pause gate")
    result = orch.run_full_pipeline_for_idea(21, dry_run=True)
    print(f"  Pipeline on paused idea:")
    print(f"    error: {result.error}")
    print(f"    stages_completed: {result.stages_completed}")
    print(f"    stages_failed: {result.stages_failed}")
    blocked = "PAUSED" in (result.error or "")
    print(f"  Verdict: {'PASS' if blocked else 'FAIL'} (pipeline blocked by pause)")

    ctrl.resume_idea(21)
    result2 = orch.run_full_pipeline_for_idea(21, dry_run=True)
    print(f"  Pipeline after resume:")
    print(f"    error: {result2.error}")
    ran = result2.error is None or "PAUSED" not in (result2.error or "")
    print(f"  Verdict: {'PASS' if ran else 'FAIL'} (pipeline runs after resume)")
