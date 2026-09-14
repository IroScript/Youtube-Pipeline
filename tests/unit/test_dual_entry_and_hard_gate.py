"""
Unit Tests for Dual-Entry Database Schema, Ground Truth Lock, and Zero-Skip Hard Gate
======================================================================================
"""

import os
import sys
import sqlite3
import pytest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROMPT_DB_DIR = REPO_ROOT / "PromptDatabase"
VIDEO_10SEC_DIR = REPO_ROOT / "video" / "1Video10Sec"
DB_PATH = PROMPT_DB_DIR / "database" / "youtube_pipeline.db"

if str(PROMPT_DB_DIR) not in sys.path:
    sys.path.insert(0, str(PROMPT_DB_DIR))
if str(VIDEO_10SEC_DIR) not in sys.path:
    sys.path.insert(0, str(VIDEO_10SEC_DIR))

import stage_gates as sg
from idea_prompt_generator import IdeaPromptGenerator


def test_ground_truth_audit_ideas_1_and_2():
    """Verify that Idea #1 and Idea #2 are locked as uploaded/completed with real YouTube IDs."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Idea 1
    cur.execute("SELECT * FROM ideas WHERE id = 1")
    idea1 = cur.fetchone()
    assert idea1 is not None
    assert idea1["status"] == "completed"

    cur.execute("SELECT * FROM youtube_metadata WHERE idea_id = 1")
    meta1 = cur.fetchone()
    assert meta1 is not None
    assert meta1["status"] == "uploaded"
    assert meta1["youtube_video_id"] == "rX_prwTwpV4"
    assert "rX_prwTwpV4" in meta1["youtube_url"]
    assert meta1["tracking_token"] == f"[Ref: AGY-IDEA-001 | UUID: {idea1['uuid']}]"

    # Publishing 1
    cur.execute("SELECT * FROM publishing WHERE platform_video_id = 'rX_prwTwpV4'")
    pub1 = cur.fetchone()
    assert pub1 is not None
    assert pub1["status"] == "published"

    # Idea 2
    cur.execute("SELECT * FROM ideas WHERE id = 2")
    idea2 = cur.fetchone()
    assert idea2 is not None
    assert idea2["status"] == "completed"

    cur.execute("SELECT * FROM youtube_metadata WHERE idea_id = 2")
    meta2 = cur.fetchone()
    assert meta2 is not None
    assert meta2["status"] == "uploaded"
    assert meta2["youtube_video_id"] == "j2pBS1sBFFU"
    assert "j2pBS1sBFFU" in meta2["youtube_url"]
    assert meta2["tracking_token"] == f"[Ref: AGY-IDEA-002 | UUID: {idea2['uuid']}]"

    # Publishing 2
    cur.execute("SELECT * FROM publishing WHERE platform_video_id = 'j2pBS1sBFFU'")
    pub2 = cur.fetchone()
    assert pub2 is not None
    assert pub2["status"] == "published"

    # Pipeline Row State locked check
    cur.execute("SELECT * FROM pipeline_row_state WHERE idea_id = 1")
    prs1 = cur.fetchone()
    assert prs1 is not None
    assert prs1["current_state"] == "LOCKED_UPLOADED"
    assert prs1["upload_verified"] == 1

    cur.execute("SELECT * FROM pipeline_row_state WHERE idea_id = 2")
    prs2 = cur.fetchone()
    assert prs2 is not None
    assert prs2["current_state"] == "LOCKED_UPLOADED"
    assert prs2["upload_verified"] == 1

    conn.close()


def test_dual_entry_schema_and_unique_constraints():
    """Verify dual-entry columns and UNIQUE constraints prevent duplicate or overwrite."""
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(youtube_metadata)")
    cols = {row[1] for row in cur.fetchall()}
    # Verify dual-entry columns exist
    required_cols = {
        "title", "seo_description", "tags", "category",
        "youtube_video_id", "youtube_url", "tracking_token",
        "live_title", "live_description", "upload_status", "published_at"
    }
    assert required_cols.issubset(cols), f"Missing cols: {required_cols - cols}"

    # Negative Test 1: Attempting to insert duplicate idea_id into youtube_metadata must fail
    with pytest.raises(sqlite3.IntegrityError):
        cur.execute("""
            INSERT INTO youtube_metadata (uuid, idea_id, title, seo_description, tags, category, default_language, status, created_at, updated_at)
            VALUES ('test-dup-uuid', 1, 'Duplicate Title', 'Desc', '[]', 'Tech', 'en', 'ready', datetime('now'), datetime('now'))
        """)

    # Negative Test 2: Attempting to insert duplicate youtube_video_id must fail
    with pytest.raises(sqlite3.IntegrityError):
        cur.execute("""
            INSERT INTO youtube_metadata (uuid, idea_id, title, seo_description, tags, category, default_language, status, youtube_video_id, created_at, updated_at)
            VALUES ('test-dup-ytid', 9999, 'Duplicate YT', 'Desc', '[]', 'Tech', 'en', 'ready', 'rX_prwTwpV4', datetime('now'), datetime('now'))
        """)

    # Negative Test 3: Attempting to insert duplicate platform_video_id into publishing must fail
    with pytest.raises(sqlite3.IntegrityError):
        cur.execute("""
            INSERT INTO publishing (video_id, platform, platform_video_id, views, likes, comments, watch_time, retention_pct, ctr_pct, subscribers_gained, created_at)
            VALUES (999, 'youtube', 'rX_prwTwpV4', 0, 0, 0, 0.0, 0.0, 0.0, 0, datetime('now'))
        """)

    conn.close()


def test_idea_3_preparation_and_hard_gate():
    """Verify Idea #3 preparation (Rice-Field Spider Colossus) satisfies Prompt and SEO Hard Gates."""
    # Check stage_gates report for Idea 3
    rep = sg.stage_report(3)
    assert rep["title"] == "Rice-Field Spider Colossus"
    assert rep["stages"]["category"] is True
    assert rep["stages"]["element"] is True
    assert rep["stages"]["ideas"] is True
    assert rep["stages"]["escalation"] is True, "Prompt Level 10 must be VERIFIED"
    assert rep["stages"]["seo"] is True, "SEO must be VERIFIED"
    assert rep["next_missing"] == "video", "Next stage must be Google Veo 3.1 video generation"

    # Verify Tracking Token
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM youtube_metadata WHERE idea_id = 3")
    meta3 = cur.fetchone()
    assert meta3 is not None
    assert meta3["tracking_token"] == "[Ref: AGY-IDEA-003 | UUID: 9b45ccbd-6e98-44f4-9dde-2972c7a1e5eb]"
    assert meta3["status"] == "ready_for_video"
    assert meta3["youtube_video_id"] is None, "Idea 3 video is not yet uploaded"

    # Verify Pipeline Row State
    cur.execute("SELECT * FROM pipeline_row_state WHERE idea_id = 3")
    prs3 = cur.fetchone()
    assert prs3 is not None
    assert prs3["current_state"] == "READY_FOR_VIDEO"
    assert prs3["prompt_verified"] == 1
    assert prs3["seo_verified"] == 1
    assert prs3["video_verified"] == 0
    assert prs3["upload_verified"] == 0
    conn.close()


def test_sequential_selection_skips_uploaded_and_picks_idea_3():
    """Verify that IdeaPromptGenerator strictly selects Idea #3 next sequentially."""
    config_file = str(VIDEO_10SEC_DIR / "config_linux.json")
    gen = IdeaPromptGenerator(config_file)
    prompt_data = gen.fetch_sqlite_escalation_prompt()

    assert prompt_data["selected_idea"]["id"] == 3, f"Expected Idea #3, got Idea #{prompt_data['selected_idea']['id']}"
    assert prompt_data["selected_idea"]["title"] == "Rice-Field Spider Colossus"
    assert prompt_data["selected_idea"]["level"] == 10
    assert len(prompt_data["full_combined_prompt"]) > 1000
    assert "HUD Popup Text" in prompt_data["full_combined_prompt"]


def test_negative_hard_gate_blocks_unverified_idea():
    """Negative test: Idea without valid Prompt or SEO must fail Hard Gate checks."""
    # Check non-existent or dummy idea ID
    rep = sg.stage_report(99999)
    assert "error" in rep, "Non-existent idea must return error"

    # Negative check on has_escalation and has_seo
    assert sg.has_escalation(99999) is False
    assert sg.has_seo(99999) is False


def test_single_click_gen_to_upload_flow_verification():
    """Verify end-to-end Single Click Gen-to-Upload contract: Prompt -> Hard Gate -> Token -> Upload Bridge -> Dual Entry."""
    import upload_bridge

    # 1. Prompt Selection & Escalation
    config_file = str(VIDEO_10SEC_DIR / "config_linux.json")
    gen = IdeaPromptGenerator(config_file)
    prompt_info = gen.fetch_sqlite_escalation_prompt()
    idea_id = prompt_info["selected_idea"]["id"]
    assert idea_id == 3

    # 2. Hard Gate Verification (Prompt and SEO must be verified before Gen)
    assert sg.has_escalation(idea_id) is True, "Prompt Escalation Gate failed"
    assert sg.has_seo(idea_id) is True, "SEO Metadata Gate failed"

    # 3. Machine Token Injection Contract
    test_pkg = {
        "folder_name": "1.3.Level_10_Rice-Field_Spider_Colossus",
        "folder_path": "/tmp/dummy_pkg_1_3",
        "video_path": "/tmp/dummy_1_3.mp4",
        "title": "Rice-Field Spider Colossus — Impossible Paddy Harvesting",
        "description": "Awesome agricultural machine.\n\n#Shorts",
        "tags": ["machine", "paddy"],
        "tracking_token": "[Ref: AGY-IDEA-003 | UUID: 9b45ccbd-6e98-44f4-9dde-2972c7a1e5eb]"
    }
    job_id = upload_bridge.queue_video(test_pkg, dry_run=True)
    assert job_id == "1_3_Level_10_Rice-Field_Spider_Colossus"

    # 4. Dual-Entry Update & State Lock Contract
    conn = upload_bridge.get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT tracking_token FROM youtube_metadata WHERE idea_id = 3")
    token_in_db = cur.fetchone()["tracking_token"]
    assert token_in_db == "[Ref: AGY-IDEA-003 | UUID: 9b45ccbd-6e98-44f4-9dde-2972c7a1e5eb]"
    conn.close()
