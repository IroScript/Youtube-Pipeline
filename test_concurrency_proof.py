"""10-thread concurrency proof for generation guard"""
import sys, uuid, concurrent.futures
sys.path.insert(0, "PromptDatabase")
sys.path.insert(0, ".")
from sqlmodel import Session, create_engine, select
from services.pipeline.pipeline_row_model import PipelineRowState
from services.pipeline.generation_guard import GenerationGuard

DB = "sqlite:///PromptDatabase/database/youtube_pipeline.db"
idea_id = 99

# Pre-clean
engine = create_engine(DB, connect_args={"check_same_thread": False})
with Session(engine) as s:
    st = s.exec(select(PipelineRowState).where(PipelineRowState.idea_id == idea_id)).first()
    if not st:
        st = PipelineRowState(uuid=str(uuid.uuid4()), idea_id=idea_id, current_state="PROMPT_MISSING")
        s.add(st)
    else:
        st.active_job_id = None
        st.active_job_type = None
    s.commit()

def worker(tid):
    e = create_engine(DB, connect_args={"check_same_thread": False})
    with Session(e) as s:
        g = GenerationGuard(s)
        r = g.register_active_job(idea_id, "TEST", f"thread_{tid}")
        return (tid, r)

# Run 10 threads simultaneously
print("=" * 60)
print("CONCURRENCY PROOF: 10 threads, 1 idea, atomic CAS guard")
print("=" * 60)
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
    futures = [ex.submit(worker, i) for i in range(10)]
    outs = [f.result() for f in futures]

wins = 0
for tid, got in sorted(outs):
    tag = "WON LOCK" if got else "BLOCKED"
    if got:
        wins += 1
    print(f"  Thread {tid:2d}: {tag}")
print()
print(f"Lock winners: {wins}")
print(f"Expected: exactly 1")
verdict = "PASS" if wins == 1 else "FAIL"
print(f"Verdict: {verdict}")

# Clean up
with Session(engine) as s:
    g = GenerationGuard(s)
    g.clear_active_job(idea_id)
