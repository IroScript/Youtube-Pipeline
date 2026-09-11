import sys
import os
import concurrent.futures
import subprocess
from pathlib import Path
import uuid

REPO_ROOT = Path(__file__).resolve().parent
DB_DIR = REPO_ROOT / "PromptDatabase"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(DB_DIR) not in sys.path:
    sys.path.insert(0, str(DB_DIR))

from sqlmodel import Session, create_engine, select
from database.models import Idea, Prompt, YouTubeMetadata, GeneratedVideo
from services.pipeline.pipeline_row_model import PipelineRowState
from services.pipeline.generation_guard import GenerationGuard
from services.pipeline.crash_recovery import CrashRecoveryEngine
from services.pipeline.failure_handler import FailureHandler
from services.pipeline.pause_resume import PauseResumeController
from services.pipeline.row_validator import RowValidator
from services.pipeline.production_orchestrator import ProductionOrchestrator
from services.pipeline.failure_handler import MAX_RETRIES

DB_URL = "sqlite:///C:/Users/Irak/Desktop/Youtube Pipeline/PromptDatabase/database/youtube_pipeline.db"

results = {}

def print_test_header(test_name):
    print(f"\n{'='*50}\n{test_name}\n{'='*50}")

def report_result(test_id, precondition, action, expected, actual, passed):
    print(f"Precondition: {precondition}")
    print(f"Action:       {action}")
    print(f"Expected:     {expected}")
    print(f"Actual:       {actual}")
    verdict = "PASS" if passed else "FAIL"
    print(f"Verdict:      {verdict}")
    results[test_id] = verdict
    return passed

def thread_func(thread_id, idea_id, job_id):
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    with Session(engine) as session:
        guard = GenerationGuard(session)
        return guard.register_active_job(idea_id, "TEST_JOB", job_id)

def run_test_a():
    print_test_header("TEST A: CONCURRENT DUPLICATE EXECUTION")
    idea_id = 99
    job_ids = [str(uuid.uuid4()) for _ in range(5)]
    
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    with Session(engine) as session:
        state = session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)).first()
        if not state:
            state = PipelineRowState(uuid=str(uuid.uuid4()), idea_id=idea_id, current_state="PROMPT_MISSING")
            session.add(state)
        else:
            state.active_job_id = None
            state.active_job_type = None
        session.commit()
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(thread_func, i, idea_id, job_ids[i]) for i in range(5)]
        outcomes = [f.result() for f in futures]
    
    success_count = sum(outcomes)
    
    with Session(engine) as session:
        guard = GenerationGuard(session)
        guard.clear_active_job(idea_id)
        
    report_result(
        "TEST A",
        f"Idea #{idea_id} has no active job",
        "5 threads call register_active_job() concurrently",
        "Exactly 1 True, 4 False",
        f"{success_count} True, {5-success_count} False",
        success_count == 1
    )

def run_test_b():
    print_test_header("TEST B: REAL CRASH RECOVERY")
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    
    script_content = f"""
import sys
import uuid
sys.path.insert(0, r"C:\\\\Users\\\\Irak\\\\Desktop\\\\Youtube Pipeline")
sys.path.insert(0, r"C:\\\\Users\\\\Irak\\\\Desktop\\\\Youtube Pipeline\\\\PromptDatabase")
from sqlmodel import Session, create_engine, select
from services.pipeline.pipeline_row_model import PipelineRowState
engine = create_engine("{DB_URL}")
with Session(engine) as session:
    state = session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == 8)).first()
    if not state:
        state = PipelineRowState(uuid=str(uuid.uuid4()), idea_id=8)
        session.add(state)
    state.current_state = "PROMPT_GENERATING"
    state.active_job_id = "CRASHED_JOB_123"
    state.active_job_type = "PROMPT_JOB"
    session.commit()
"""
    subprocess.run([sys.executable, "-c", script_content], check=True)
    
    with Session(engine) as session:
        state = session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == 8)).first()
        pre_crash_state = state.current_state
        pre_crash_job = state.active_job_id
        
        recovery = CrashRecoveryEngine(session)
        recovery.scan_and_recover()
        session.refresh(state)
        post_recovery_state = state.current_state
        post_recovery_job = state.active_job_id
        
        recovery.scan_and_recover()
        
    expected_state = "PROMPT_COMPLETE" if post_recovery_state == "PROMPT_COMPLETE" else "PROMPT_MISSING"
    passed = (post_recovery_state in ["PROMPT_COMPLETE", "PROMPT_MISSING"]) and (post_recovery_job is None)
    
    report_result(
        "TEST B",
        f"Idea #8 state={pre_crash_state}, job={pre_crash_job}",
        "Run CrashRecoveryEngine.scan_and_recover()",
        f"State becomes {expected_state} or PROMPT_MISSING, job is None",
        f"State={post_recovery_state}, job={post_recovery_job}",
        passed
    )

def run_test_c():
    print_test_header("TEST C: RETRY STABILITY")
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    with Session(engine) as session:
        state = session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == 10)).first()
        if not state:
            state = PipelineRowState(uuid=str(uuid.uuid4()), idea_id=10)
            session.add(state)
        state.current_state = "PROMPT_FAILED"
        state.retry_count = 0
        session.commit()
        
        handler = FailureHandler(session)
        can_retry_0 = handler.can_proceed_after_failure(10)
        
        state.retry_count = MAX_RETRIES - 1
        session.commit()
        can_retry_2 = handler.can_proceed_after_failure(10)
        
        state.retry_count = MAX_RETRIES
        session.commit()
        can_retry_3 = handler.can_proceed_after_failure(10)
        
        state.current_state = "ERROR"
        session.commit()
        can_retry_error = handler.can_proceed_after_failure(10)
        
    passed = (can_retry_0 == True) and (can_retry_2 == True) and (can_retry_3 == False) and (can_retry_error == False)
    report_result(
        "TEST C",
        "Idea #10 state=PROMPT_FAILED, retry_count varies",
        "Check FailureHandler.can_proceed_after_failure()",
        "True at 0 and MAX-1, False at MAX and ERROR",
        f"{can_retry_0}, {can_retry_2}, {can_retry_3}, {can_retry_error}",
        passed
    )

def run_test_d():
    print_test_header("TEST D: PAUSE BLOCKS PIPELINE EXECUTION")
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    with Session(engine) as session:
        ctrl = PauseResumeController(session)
        orch = ProductionOrchestrator(session)
        
        state = session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == 9)).first()
        if not state:
            state = PipelineRowState(uuid=str(uuid.uuid4()), idea_id=9, current_state="PROMPT_MISSING")
            session.add(state)
            session.commit()
            
        ctrl.pause_idea(9)
        res_paused = orch.run_full_pipeline_for_idea(9, dry_run=True)
        
        ctrl.resume_idea(9)
        res_resumed = orch.run_full_pipeline_for_idea(9, dry_run=True)
        
    passed = (res_paused.error == "Pipeline is PAUSED — no stages will execute") and (res_resumed.error != "Pipeline is PAUSED — no stages will execute")
    report_result(
        "TEST D",
        f"Idea #9 is_paused={True}",
        "Run run_full_pipeline_for_idea(9)",
        "Paused -> Returns error 'PAUSED'; Resumed -> Executes stages (no error)",
        f"Paused error: {res_paused.error}, Resumed error: {res_resumed.error}",
        passed
    )

def run_test_e():
    print_test_header("TEST E: SEQUENTIAL MULTI-ROW EXECUTION")
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    with Session(engine) as session:
        orch = ProductionOrchestrator(session)
        results_list = orch.run_sequential_pipeline(max_ideas=5, dry_run=True)
        first_id = results_list[0].idea_id if results_list else None
        
        passed = (first_id == 3)
    report_result(
        "TEST E",
        "Database has ideas #1, #2 complete. #3 prompt+seo.",
        "Run run_sequential_pipeline(max_ideas=5, dry_run=True)",
        "First processed idea is #3",
        f"First processed idea is #{first_id}",
        passed
    )

def run_test_f():
    print_test_header("TEST F: ZERO-BLANK COMPLETION PROOF")
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    with Session(engine) as session:
        validator = RowValidator()
        val1 = validator.validate_all(1)
        val2 = validator.validate_all(2)
        val4 = validator.validate_all(4)
        
        state140 = session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == 140)).first()
        if not state140:
            state140 = PipelineRowState(uuid=str(uuid.uuid4()), idea_id=140, current_state="PROMPT_MISSING")
            session.add(state140)
            session.commit()
            session.refresh(state140)
        val140 = validator.validate_all(140)
        
    passed1 = val1.is_complete and len(val1.missing_fields) == 0
    passed2 = val2.is_complete and len(val2.missing_fields) == 0
    passed4 = not val4.is_complete
    passed140 = not val140.is_complete and len(val140.missing_fields) > 0
    
    passed = passed1 and passed2 and passed4 and passed140
    report_result(
        "TEST F",
        "Validate complete ideas #1, #2, and incomplete #4, #140",
        "Run RowValidator.validate_row()",
        "#1,#2 is_complete=True (missing=0); #4,#140 is_complete=False (missing>0)",
        f"#1 complete={val1.is_complete}, #4 complete={val4.is_complete}, #140 missing={len(val140.missing_fields)}",
        passed
    )

def run_test_g():
    print_test_header("TEST G: FAILURE INJECTION")
    engine = create_engine(DB_URL, connect_args={'check_same_thread': False})
    with Session(engine) as session:
        state = session.exec(select(PipelineRowState).where(PipelineRowState.idea_id == 11)).first()
        if not state:
            state = PipelineRowState(uuid=str(uuid.uuid4()), idea_id=11)
            session.add(state)
        state.current_state = "SEO_FAILED"
        state.failure_reason = "Injected error"
        session.commit()
        
        handler = FailureHandler(session)
        guard = GenerationGuard(session)
        
        fail_info = handler.get_failure_info(11)
        can_vid = guard.can_generate_video(11)
        
        state.current_state = "PROMPT_MISSING"
        state.failure_reason = None
        session.commit()
        
    passed = (fail_info is not None) and (fail_info.get("current_state") == "SEO_FAILED") and (can_vid.allowed == False)
    
    report_result(
        "TEST G",
        "Idea #11 state=SEO_FAILED",
        "Check FailureHandler.get_failure_info() & GenerationGuard.can_generate_video()",
        "Info returned, video generation blocked",
        f"fail_info={fail_info is not None}, can_generate_video={can_vid.allowed}",
        passed
    )

def main():
    run_test_a()
    run_test_b()
    run_test_c()
    run_test_d()
    run_test_e()
    run_test_f()
    run_test_g()
    
    print("\n\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    for k, v in results.items():
        print(f"{k}: {v}")

if __name__ == "__main__":
    main()
