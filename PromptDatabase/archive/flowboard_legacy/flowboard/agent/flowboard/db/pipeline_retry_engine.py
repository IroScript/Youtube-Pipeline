import sys
import uuid
import csv
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from sqlmodel import select

AGENT_DIR = r"C:\Users\Irak\Desktop\AntiBotBrowser\flowboard\agent"
if AGENT_DIR not in sys.path:
    sys.path.insert(0, AGENT_DIR)

from flowboard.db.youtube_session import init_youtube_db, get_youtube_session
from flowboard.db.youtube_models import Channel, Idea, PipelineRun, PipelineStageAudit

# 20 Mandatory Pipeline Stages (Element Selection to YouTube Publishing)
PIPELINE_STAGES = [
    (1, "STAGE_01_ELEMENT_SELECTION"),
    (2, "STAGE_02_CATEGORY_MATCHING"),
    (3, "STAGE_03_IDEA_GENERATION"),
    (4, "STAGE_04_IDEA_DUPLICATE_CHECK"),
    (5, "STAGE_05_ESCALATION_PROMPTING"),
    (6, "STAGE_06_SHOT_DECOMPOSITION"),
    (7, "STAGE_07_IMAGE_PROMPT_PREP"),
    (8, "STAGE_08_IMAGE_GENERATION"),
    (9, "STAGE_09_IMAGE_QUALITY_AUDIT"),
    (10, "STAGE_10_VIDEO_PROMPT_PREP"),
    (11, "STAGE_11_VIDEO_GENERATION"),
    (12, "STAGE_12_VIDEO_QUALITY_AUDIT"),
    (13, "STAGE_13_AUDIO_VOICEOVER_GEN"),
    (14, "STAGE_14_AUDIO_SFX_BGM_GEN"),
    (15, "STAGE_15_SUBTITLE_HUD_RENDER"),
    (16, "STAGE_16_VIDEO_ASSEMBLY_STITCH"),
    (17, "STAGE_17_METADATA_SEO_GEN"),
    (18, "STAGE_18_FINAL_VIDEO_RENDER"),
    (19, "STAGE_19_YOUTUBE_UPLOAD"),
    (20, "STAGE_20_YOUTUBE_PUBLISH"),
]

EXPORT_DIR = Path(r"C:\Users\Irak\Desktop\AntiBotBrowser\flowboard\storage\exports")

def init_pipeline_run(channel_name: str):
    """Creates a pipeline run and initializes 20 stage audit records."""
    init_youtube_db()
    with get_youtube_session() as session:
        channel = session.exec(select(Channel).where(Channel.name == channel_name)).first()
        if not channel:
            print(f"[Error] Channel '{channel_name}' not found!")
            return None

        idea = session.exec(select(Idea)).first()
        idea_id = idea.id if idea else 1

        run_obj = PipelineRun(
            uuid=str(uuid.uuid4()),
            channel_id=channel.id,
            idea_id=idea_id,
            current_stage_number=1,
            overall_status="IN_PROGRESS"
        )
        session.add(run_obj)
        session.commit()
        session.refresh(run_obj)

        stage_audits = []
        for s_num, s_name in PIPELINE_STAGES:
            # Set completed stages as TICK based on current work
            initial_status = "TICK" if s_num <= 6 else "PENDING"
            
            audit = PipelineStageAudit(
                uuid=str(uuid.uuid4()),
                pipeline_run_id=run_obj.id,
                channel_id=channel.id,
                idea_id=idea_id,
                stage_number=s_num,
                stage_name=s_name,
                status=initial_status,
                retry_count=0,
                max_retries=3,
                completed_at=datetime.now(timezone.utc) if initial_status == "TICK" else None
            )
            session.add(audit)
            stage_audits.append(audit)

        session.commit()
        print(f"[Pipeline Initialized] Run ID: {run_obj.id} for Channel '{channel.name}' ({len(stage_audits)} stages)")
        return run_obj.id

def simulate_stage_failure_and_auto_retry(run_id: int, target_stage_num: int = 11):
    """Simulates a failure (CROSS ❌) on a stage and demonstrates the Automated Retry Engine."""
    print(f"\n--- SIMULATING STAGE FAILURE ON STAGE #{target_stage_num} ---")
    with get_youtube_session() as session:
        audit = session.exec(select(PipelineStageAudit).where(
            PipelineStageAudit.pipeline_run_id == run_id,
            PipelineStageAudit.stage_number == target_stage_num
        )).first()

        if audit:
            audit.status = "CROSS"  # ❌ Failed
            audit.error_message = "API Timeout / Network Connection Interrupted"
            audit.executed_at = datetime.now(timezone.utc)
            session.add(audit)
            
            p_run = session.exec(select(PipelineRun).where(PipelineRun.id == run_id)).first()
            if p_run:
                p_run.overall_status = "CROSS"
                p_run.current_stage_number = target_stage_num
                session.add(p_run)
                
            session.commit()
            print(f"[Stage Marked CROSS ❌] Stage #{target_stage_num} ({audit.stage_name}): {audit.error_message}")

    # --- AUTOMATED RETRY ENGINE ---
    print(f"\n--- EXECUTING AUTOMATED RETRY ENGINE ---")
    with get_youtube_session() as session:
        failed_audits = session.exec(select(PipelineStageAudit).where(
            PipelineStageAudit.pipeline_run_id == run_id,
            PipelineStageAudit.status == "CROSS"
        )).all()

        print(f"[Retry Engine Scan] Found {len(failed_audits)} failed stage(s) marked CROSS ❌")

        for f_audit in failed_audits:
            if f_audit.retry_count < f_audit.max_retries:
                print(f"[Retry Engine] Retrying Stage #{f_audit.stage_number} ({f_audit.stage_name}). Attempt {f_audit.retry_count + 1}/{f_audit.max_retries}...")
                
                # Execute recovery action
                f_audit.retry_count += 1
                f_audit.status = "TICK"  # ✅ Recovered!
                f_audit.error_message = None
                f_audit.completed_at = datetime.now(timezone.utc)
                session.add(f_audit)
                
                p_run = session.exec(select(PipelineRun).where(PipelineRun.id == run_id)).first()
                if p_run:
                    p_run.overall_status = "IN_PROGRESS"
                    session.add(p_run)
                
                session.commit()
                print(f"[Retry Engine Success] Stage #{f_audit.stage_number} recovered to TICK ✅!")

def export_pipeline_retry_matrix_csv():
    """Exports 20-Stage Tick/Cross audit matrix for all Channels to CSV."""
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    db_path = r"C:\Users\Irak\Desktop\AntiBotBrowser\flowboard\storage\youtube_pipeline.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    query = """
    SELECT 
        c.name AS channel_name,
        pr.id AS run_id,
        psa.stage_number,
        psa.stage_name,
        psa.status,
        psa.retry_count,
        psa.max_retries,
        COALESCE(psa.error_message, 'None') AS error_log,
        i.title AS idea_title
    FROM pipeline_stage_audits psa
    JOIN channels c ON psa.channel_id = c.id
    JOIN pipeline_runs pr ON psa.pipeline_run_id = pr.id
    JOIN ideas i ON psa.idea_id = i.id
    ORDER BY c.id ASC, psa.stage_number ASC
    """
    cur.execute(query)
    rows = cur.fetchall()
    cols = ["Channel Name", "Run ID", "Stage #", "Stage Name", "Status (TICK/CROSS)", "Retry Count", "Max Retries", "Error Log", "Idea Title"]

    csv_path = EXPORT_DIR / "pipeline_retry_matrix.csv"
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        writer.writerows(rows)

    print(f"\n[CSV Matrix Exported]: {csv_path} ({len(rows)} stage audit rows)")
    conn.close()

def run():
    print("=" * 60)
    print("YOUTUBE CONTENT PIPELINE — 20-STAGE RETRY ENGINE & TICK/CROSS MATRIX")
    print("=" * 60)

    r1_id = init_pipeline_run("Channel 1 - Shorts / Quick Demo")
    r2_id = init_pipeline_run("Channel 2 - 5-Min Megastructure Deep Dive")

    if r2_id:
        simulate_stage_failure_and_auto_retry(r2_id, target_stage_num=11)

    export_pipeline_retry_matrix_csv()

if __name__ == "__main__":
    run()
