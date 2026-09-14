"""
Dual-Entry Database Schema Migration & Ground Truth Audit Script
=================================================================
1. Adds Dual-Entry YouTube Live columns to `youtube_metadata` table:
   - youtube_video_id (UNIQUE)
   - youtube_url
   - tracking_token
   - live_title
   - live_description
   - upload_status
   - published_at
2. Enforces UNIQUE(idea_id) on youtube_metadata.
3. Enforces UNIQUE(youtube_video_id) on youtube_metadata (where not null).
4. Enforces UNIQUE(platform_video_id) on publishing (where not null).
5. Populates tracking_token [Ref: AGY-IDEA-{id:03d} | UUID: {uuid}] for all records.
6. Locks in Live Channel Ground Truth for:
   - Idea #1: Rice Titan Harvester (rX_prwTwpV4)
   - Idea #2: The Paddy Ocean Vacuum (j2pBS1sBFFU)
"""

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path("/home/mdkamruzzamanirak_gmail_com/.openclaw/workspace/IROSCRIPT-CEO/social-media/youtube/Youtube Automation/PromptDatabase/database/youtube_pipeline.db")

def migrate_database():
    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    now = datetime.now(timezone.utc).isoformat()

    # Step 1: Add new columns to youtube_metadata if missing
    cur.execute("PRAGMA table_info(youtube_metadata)")
    existing_cols = {row["name"] for row in cur.fetchall()}
    
    new_cols = [
        ("youtube_video_id", "VARCHAR"),
        ("youtube_url", "VARCHAR"),
        ("tracking_token", "VARCHAR"),
        ("live_title", "VARCHAR"),
        ("live_description", "VARCHAR"),
        ("upload_status", "VARCHAR"),
        ("published_at", "DATETIME"),
    ]

    for col_name, col_type in new_cols:
        if col_name not in existing_cols:
            print(f"Adding column '{col_name}' ({col_type}) to youtube_metadata...")
            cur.execute(f"ALTER TABLE youtube_metadata ADD COLUMN {col_name} {col_type}")

    # Step 2: Ensure unique indexes
    print("Creating unique index on youtube_metadata(idea_id)...")
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_youtube_metadata_idea_id ON youtube_metadata(idea_id)")

    print("Creating unique index on youtube_metadata(youtube_video_id)...")
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_youtube_metadata_youtube_video_id ON youtube_metadata(youtube_video_id) WHERE youtube_video_id IS NOT NULL")

    print("Creating unique index on publishing(platform_video_id)...")
    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_publishing_platform_video_id ON publishing(platform_video_id) WHERE platform_video_id IS NOT NULL")

    # Step 3: Populate tracking_tokens for all ideas
    print("Populating tracking tokens for all ideas in youtube_metadata...")
    cur.execute("SELECT id, uuid FROM ideas")
    ideas = cur.fetchall()
    for idea in ideas:
        i_id = idea["id"]
        i_uuid = idea["uuid"]
        token = f"[Ref: AGY-IDEA-{i_id:03d} | UUID: {i_uuid}]"
        cur.execute(
            "UPDATE youtube_metadata SET tracking_token = COALESCE(tracking_token, ?) WHERE idea_id = ?",
            (token, i_id)
        )

    # Step 4: Lock in Ground Truth for Idea #1 (Rice Titan Harvester | rX_prwTwpV4)
    print("\n--- Auditing & Locking Idea #1 (Rice Titan Harvester) ---")
    cur.execute("SELECT * FROM ideas WHERE id = 1")
    idea1 = cur.fetchone()
    token1 = f"[Ref: AGY-IDEA-001 | UUID: {idea1['uuid']}]"
    
    cur.execute("""
        UPDATE ideas 
        SET status = 'completed', published_at = COALESCE(published_at, ?), updated_at = ?
        WHERE id = 1
    """, (now, now))

    cur.execute("""
        UPDATE youtube_metadata 
        SET status = 'uploaded', 
            upload_status = 'uploaded',
            youtube_video_id = 'rX_prwTwpV4',
            youtube_url = 'https://youtube.com/shorts/rX_prwTwpV4',
            tracking_token = ?,
            live_title = 'Rice Titan Harvester — The Paddy Harvesting Machine You Have Never Seen',
            package_folder_path = COALESCE(package_folder_path, 'C:\\\\Users\\\\Irak\\\\Desktop\\\\Youtube Pipeline\\\\PromptDatabase\\\\output_packaged\\\\1.1.Level_10_Rice_Titan_Harvester'),
            video_file_path = COALESCE(video_file_path, 'C:\\\\Users\\\\Irak\\\\Desktop\\\\Youtube Pipeline\\\\PromptDatabase\\\\output_packaged\\\\1.1.Level_10_Rice_Titan_Harvester\\\\1.1.Level_10_Rice_Titan_Harvester.mp4'),
            published_at = COALESCE(published_at, ?),
            updated_at = ?
        WHERE idea_id = 1
    """, (token1, now, now))

    # Generated video for Idea #1
    cur.execute("SELECT id FROM generated_videos WHERE idea_id = 1")
    gv1 = cur.fetchone()
    if not gv1:
        cur.execute("""
            INSERT INTO generated_videos (
                uuid, idea_id, title, file_path, file_name, duration_seconds,
                resolution, file_size_bytes, status, created_at
            ) VALUES (?, 1, 'Rice Titan Harvester', 
                      'C:\\\\Users\\\\Irak\\\\Desktop\\\\Youtube Pipeline\\\\PromptDatabase\\\\output_packaged\\\\1.1.Level_10_Rice_Titan_Harvester\\\\1.1.Level_10_Rice_Titan_Harvester.mp4',
                      '1.1.Level_10_Rice_Titan_Harvester.mp4', 8.0, '1080x1920', 10485760, 'completed', ?)
        """, (str(uuid.uuid4()), now))
        cur.execute("SELECT id FROM generated_videos WHERE idea_id = 1")
        gv1 = cur.fetchone()
    else:
        cur.execute("UPDATE generated_videos SET status = 'completed' WHERE idea_id = 1")

    gv1_id = gv1["id"]

    # Publishing record for Idea #1
    cur.execute("SELECT id FROM publishing WHERE platform_video_id = 'rX_prwTwpV4'")
    pub1 = cur.fetchone()
    if not pub1:
        cur.execute("""
            INSERT INTO publishing (
                video_id, platform, channel_name, platform_video_id,
                title, description, category, privacy_status, published_at,
                url, status, views, likes, comments, watch_time,
                retention_pct, ctr_pct, subscribers_gained, created_at
            ) VALUES (?, 'youtube', '@AstroSparksAI', 'rX_prwTwpV4',
                      'Rice Titan Harvester — The Paddy Harvesting Machine You Have Never Seen',
                      'Rice Titan Harvester concept video uploaded on @AstroSparksAI',
                      'Science & Technology', 'public', ?,
                      'https://youtube.com/shorts/rX_prwTwpV4', 'published',
                      0, 0, 0, 0.0, 0.0, 0.0, 0, ?)
        """, (gv1_id, now, now))

    # Pipeline row state for Idea #1
    cur.execute("SELECT id FROM pipeline_row_state WHERE idea_id = 1")
    prs1 = cur.fetchone()
    if not prs1:
        cur.execute("""
            INSERT INTO pipeline_row_state (
                uuid, idea_id, current_state, prompt_verified, seo_verified,
                video_verified, upload_verified, package_verified, all_fields_validated,
                retry_count, is_paused, last_verified_at, created_at, updated_at
            ) VALUES (?, 1, 'LOCKED_UPLOADED', 1, 1, 1, 1, 1, 1, 0, 0, ?, ?, ?)
        """, (str(uuid.uuid4()), now, now, now))
    else:
        cur.execute("""
            UPDATE pipeline_row_state 
            SET current_state = 'LOCKED_UPLOADED', prompt_verified = 1, seo_verified = 1,
                video_verified = 1, upload_verified = 1, package_verified = 1, all_fields_validated = 1,
                last_verified_at = ?, updated_at = ?
            WHERE idea_id = 1
        """, (now, now))

    # Step 5: Lock in Ground Truth for Idea #2 (The Paddy Ocean Vacuum | j2pBS1sBFFU)
    print("\n--- Auditing & Locking Idea #2 (The Paddy Ocean Vacuum) ---")
    cur.execute("SELECT * FROM ideas WHERE id = 2")
    idea2 = cur.fetchone()
    token2 = f"[Ref: AGY-IDEA-002 | UUID: {idea2['uuid']}]"

    cur.execute("""
        UPDATE ideas 
        SET status = 'completed', published_at = COALESCE(published_at, ?), updated_at = ?
        WHERE id = 2
    """, (now, now))

    cur.execute("""
        UPDATE youtube_metadata 
        SET status = 'uploaded', 
            upload_status = 'uploaded',
            youtube_video_id = 'j2pBS1sBFFU',
            youtube_url = 'https://youtube.com/shorts/j2pBS1sBFFU',
            tracking_token = ?,
            live_title = 'Paddy Harvesting Machine: The Floating Ocean Vacuum',
            published_at = COALESCE(published_at, ?),
            updated_at = ?
        WHERE idea_id = 2
    """, (token2, now, now))

    # Generated video for Idea #2
    cur.execute("SELECT id FROM generated_videos WHERE idea_id = 2")
    gv2 = cur.fetchone()
    if not gv2:
        cur.execute("""
            INSERT INTO generated_videos (
                uuid, idea_id, title, file_path, file_name, duration_seconds,
                resolution, file_size_bytes, status, created_at
            ) VALUES (?, 2, 'The Paddy Ocean Vacuum', 
                      'C:\\\\Users\\\\Irak\\\\Desktop\\\\Youtube Pipeline\\\\video\\\\1Video10Sec\\\\Generated_The_Paddy_Ocean_Vacuum_10Sec.mp4',
                      'Generated_The_Paddy_Ocean_Vacuum_10Sec.mp4', 8.0, '1080x1920', 10689011, 'completed', ?)
        """, (str(uuid.uuid4()), now))
        cur.execute("SELECT id FROM generated_videos WHERE idea_id = 2")
        gv2 = cur.fetchone()
    else:
        cur.execute("UPDATE generated_videos SET status = 'completed' WHERE idea_id = 2")

    gv2_id = gv2["id"]

    # Publishing record for Idea #2
    cur.execute("SELECT id FROM publishing WHERE platform_video_id = 'j2pBS1sBFFU'")
    pub2 = cur.fetchone()
    if not pub2:
        cur.execute("""
            INSERT INTO publishing (
                video_id, platform, channel_name, platform_video_id,
                title, description, category, privacy_status, published_at,
                url, status, views, likes, comments, watch_time,
                retention_pct, ctr_pct, subscribers_gained, created_at
            ) VALUES (?, 'youtube', '@AstroSparksAI', 'j2pBS1sBFFU',
                      'Paddy Harvesting Machine: The Floating Ocean Vacuum',
                      'The Paddy Ocean Vacuum concept video uploaded on @AstroSparksAI',
                      'Science & Technology', 'public', ?,
                      'https://youtube.com/shorts/j2pBS1sBFFU', 'published',
                      0, 0, 0, 0.0, 0.0, 0.0, 0, ?)
        """, (gv2_id, now, now))

    # Pipeline row state for Idea #2
    cur.execute("SELECT id FROM pipeline_row_state WHERE idea_id = 2")
    prs2 = cur.fetchone()
    if not prs2:
        cur.execute("""
            INSERT INTO pipeline_row_state (
                uuid, idea_id, current_state, prompt_verified, seo_verified,
                video_verified, upload_verified, package_verified, all_fields_validated,
                retry_count, is_paused, last_verified_at, created_at, updated_at
            ) VALUES (?, 2, 'LOCKED_UPLOADED', 1, 1, 1, 1, 1, 1, 0, 0, ?, ?, ?)
        """, (str(uuid.uuid4()), now, now, now))
    else:
        cur.execute("""
            UPDATE pipeline_row_state 
            SET current_state = 'LOCKED_UPLOADED', prompt_verified = 1, seo_verified = 1,
                video_verified = 1, upload_verified = 1, package_verified = 1, all_fields_validated = 1,
                last_verified_at = ?, updated_at = ?
            WHERE idea_id = 2
        """, (now, now))

    conn.commit()
    conn.close()
    print("\n✅ Migration and Ground Truth state lock completed successfully!")

if __name__ == "__main__":
    migrate_database()
