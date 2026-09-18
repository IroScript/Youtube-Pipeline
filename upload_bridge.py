"""
YouTube Pipeline → youtube-uploader Bridge Script
===================================================
1. output_packaged/ ফোল্ডার scan করে নতুন video খোঁজে
2. youtube_metadata.json থেকে SEO data (title, description, tags) পড়ে
3. uploader queue add দিয়ে video queue করে
4. uploader run দিয়ে YouTube-এ upload করে
5. SQLite DB-তে status update করে (ready → uploaded)
6. Duplicate prevention: আগে upload হওয়া video আবার queue হবে না

Usage:
    python upload_bridge.py                  # scan + queue + upload all
    python upload_bridge.py --scan-only      # শুধু scan, upload না
    python upload_bridge.py --dry-run        # কী হবে দেখায়, কিছু করে না
    python upload_bridge.py --limit 3        # সর্বোচ্চ 3টা upload
"""

from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────
_default_root    = Path(__file__).resolve().parent
_win_root        = Path(r"C:\Users\Irak\Desktop\Youtube Pipeline")
PIPELINE_ROOT    = _win_root if _win_root.exists() else _default_root
PACKAGES_DIR     = PIPELINE_ROOT / "PromptDatabase" / "output_packaged"
DB_PATH          = PIPELINE_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db"
UPLOADER_DIR     = PIPELINE_ROOT / "youtube-uploader-eval"
CHANNEL_SLUG     = "astrosparksai"

# video_file minimum size (10 KB) to consider a real video
MIN_VIDEO_SIZE   = 10 * 1024

# Folders to skip (backups, empty, etc.)
SKIP_PREFIXES    = ("_backup", "Idea_")


def log(msg: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_uploaded_packages(conn: sqlite3.Connection) -> set[str]:
    """DB-তে status='uploaded' যেসব package_folder_path আছে সেগুলো return করে।"""
    cursor = conn.execute(
        "SELECT package_folder_path FROM youtube_metadata WHERE status = 'uploaded'"
    )
    return {row["package_folder_path"] for row in cursor if row["package_folder_path"]}


def get_queued_job_ids() -> set[str]:
    """youtube-uploader registry-তে যেসব job pending/uploading আছে।"""
    registry_path = UPLOADER_DIR / "state" / CHANNEL_SLUG / "upload_registry.txt"
    if not registry_path.exists():
        return set()
    ids = set()
    for line in registry_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            if entry.get("status") in ("pending", "uploading"):
                ids.add(entry.get("id", ""))
        except json.JSONDecodeError:
            continue
    return ids


def scan_packages() -> list[dict]:
    """output_packaged/ scan করে upload-ready packages খোঁজে।"""
    packages = []

    if not PACKAGES_DIR.exists():
        log(f"❌ output_packaged/ পাওয়া যায়নি: {PACKAGES_DIR}")
        return packages

    for folder in sorted(PACKAGES_DIR.iterdir()):
        if not folder.is_dir():
            continue

        # Skip backup/empty folders
        if any(folder.name.startswith(p) for p in SKIP_PREFIXES):
            continue

        # Find video file (.mp4)
        mp4_files = list(folder.glob("*.mp4"))
        if not mp4_files:
            continue

        video_file = mp4_files[0]
        if video_file.stat().st_size < MIN_VIDEO_SIZE:
            log(f"  ⏭️  {folder.name}: video খুব ছোট ({video_file.stat().st_size} bytes)")
            continue

        # Find metadata file
        meta_path = folder / "youtube_metadata.json"
        if not meta_path.exists():
            # Try prefixed name
            prefixed = list(folder.glob("*YouTube_Metadata.json"))
            if prefixed:
                meta_path = prefixed[0]
            else:
                log(f"  ⏭️  {folder.name}: youtube_metadata.json নেই")
                continue

        # Read metadata
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            log(f"  ⏭️  {folder.name}: metadata পড়তে সমস্যা: {e}")
            continue

        tracking_token = meta.get("tracking_token", "")
        idea_id = meta.get("idea_id")
        if not tracking_token and idea_id:
            tracking_token = f"[Ref: AGY-IDEA-{int(idea_id):03d}]"

        packages.append({
            "folder_name": folder.name,
            "folder_path": str(folder),
            "video_path": str(video_file),
            "video_size_mb": round(video_file.stat().st_size / (1024 * 1024), 2),
            "idea_id": idea_id,
            "tracking_token": tracking_token,
            "title": meta.get("title", folder.name),
            "description": meta.get("seo_description", ""),
            "tags": meta.get("tags", []),
            "pinned_comment": meta.get("pinned_comment", ""),
            "category": meta.get("category", "Science & Technology"),
        })

    return packages


def queue_video(pkg: dict, dry_run: bool = False) -> str | None:
    """uploader queue add দিয়ে video queue করে। Returns job_id or None."""
    # Build job_id from folder name (unique, idempotent)
    job_id = pkg["folder_name"].replace(" ", "_").replace(".", "_")

    tags_str = ",".join(pkg["tags"]) if isinstance(pkg["tags"], list) else str(pkg["tags"])

    # Ensure machine tracking token is appended to description
    desc = pkg.get("description", "")
    token = pkg.get("tracking_token", "")
    if token and token not in desc:
        desc = f"{desc}\n\n{token}".strip()

    cmd = [
        "uploader", "queue", "add",
        "--channel", CHANNEL_SLUG,
        "--video", pkg["video_path"],
        "--title", pkg["title"],
        "--description", desc,
        "--id", job_id,
        "--privacy", "public",
        "--short",
    ]

    if tags_str:
        cmd.extend(["--tags", tags_str])

    if dry_run:
        log(f"  🔍 DRY RUN: {pkg['title'][:60]}...")
        log(f"     Video: {pkg['video_path']}")
        log(f"     Job ID: {job_id}")
        return job_id

    log(f"  📤 Queuing: {pkg['title'][:60]}...")
    try:
        result = subprocess.run(
            cmd,
            cwd=str(UPLOADER_DIR),
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode == 0:
            log(f"  ✅ Queued: {job_id}")
            return job_id
        else:
            log(f"  ❌ Queue failed: {result.stderr or result.stdout}")
            return None
    except subprocess.TimeoutExpired:
        log(f"  ❌ Queue timeout for {job_id}")
        return None


def run_upload(limit: int | None = None, dry_run: bool = False) -> dict:
    """uploader run দিয়ে pending jobs upload করে।"""
    if dry_run:
        log("🔍 DRY RUN: upload skip করা হচ্ছে")
        return {"uploaded": 0, "skipped": True}

    cmd = ["uploader", "run", "--channel", CHANNEL_SLUG, "--upload-retries", "5"]
    if limit:
        cmd.extend(["--limit", str(limit)])

    log(f"🚀 YouTube-এ upload শুরু হচ্ছে...")
    try:
        result = subprocess.run(
            cmd,
            cwd=str(UPLOADER_DIR),
            capture_output=True,
            text=True,
            timeout=600,  # 10 min per video max
        )
        log(f"  Upload output: {result.stdout[:500] if result.stdout else 'empty'}")
        if result.returncode != 0:
            log(f"  ⚠️ Upload stderr: {result.stderr[:300] if result.stderr else 'none'}")
        return {"uploaded": 1 if result.returncode == 0 else 0, "output": result.stdout}
    except subprocess.TimeoutExpired:
        log("  ❌ Upload timeout (10 min)")
        return {"uploaded": 0, "error": "timeout"}


def update_db_status(conn: sqlite3.Connection, folder_path: str, youtube_id: str = "") -> None:
    """SQLite youtube_metadata, ideas, and publishing tables-এ dual-entry ডেটা আপডেট করে।"""
    now = datetime.now(timezone.utc).isoformat()
    folder_name = Path(folder_path).name
    yt_url = f"https://youtube.com/shorts/{youtube_id}" if youtube_id else None

    # First try exact path match
    cursor = conn.execute(
        """UPDATE youtube_metadata 
           SET status = 'uploaded', 
               upload_status = 'uploaded',
               youtube_video_id = COALESCE(?, youtube_video_id),
               youtube_url = COALESCE(?, youtube_url),
               published_at = COALESCE(published_at, ?),
               updated_at = ? 
           WHERE package_folder_path = ?""",
        (youtube_id or None, yt_url, now, now, folder_path),
    )

    idea_id = None
    if cursor.rowcount > 0:
        row = conn.execute("SELECT idea_id FROM youtube_metadata WHERE package_folder_path = ?", (folder_path,)).fetchone()
        if row:
            idea_id = row["idea_id"]
    else:
        # Try matching by folder name pattern
        parts = folder_name.split(".")
        if len(parts) >= 2:
            try:
                element_id = int(parts[0])
                idea_idx = int(parts[1])
                conn.execute(
                    """UPDATE youtube_metadata 
                       SET status = 'uploaded', 
                           upload_status = 'uploaded',
                           youtube_video_id = COALESCE(?, youtube_video_id),
                           youtube_url = COALESCE(?, youtube_url),
                           package_folder_path = COALESCE(package_folder_path, ?),
                           video_file_path = COALESCE(video_file_path, ?),
                           published_at = COALESCE(published_at, ?),
                           updated_at = ?
                       WHERE idea_id = ?""",
                    (youtube_id or None, yt_url, folder_path,
                     str(Path(folder_path) / (folder_name + ".mp4")),
                     now, now, idea_idx),
                )
                idea_id = idea_idx
            except (ValueError, IndexError):
                pass

    if idea_id:
        # Update ideas table to completed
        conn.execute(
            "UPDATE ideas SET status = 'completed', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?",
            (now, now, idea_id)
        )
        # Update publishing table if youtube_id present
        if youtube_id:
            gv = conn.execute("SELECT id FROM generated_videos WHERE idea_id = ?", (idea_id,)).fetchone()
            video_id = gv["id"] if gv else None
            if video_id:
                existing = conn.execute("SELECT id FROM publishing WHERE platform_video_id = ?", (youtube_id,)).fetchone()
                if existing:
                    conn.execute(
                        "UPDATE publishing SET url = ?, status = 'published', published_at = ? WHERE id = ?",
                        (yt_url, now, existing["id"]),
                    )
                else:
                    conn.execute(
                        """INSERT INTO publishing (
                               video_id, platform, channel_name, platform_video_id,
                               title, url, status, published_at, views, likes, comments,
                               watch_time, retention_pct, ctr_pct, subscribers_gained, created_at
                            ) VALUES (?, 'youtube', '@AstroSparksAI', ?, ?, ?, 'published', ?, 0, 0, 0, 0.0, 0.0, 0.0, 0, ?)""",
                        (video_id, youtube_id, folder_name, yt_url, now, now),
                    )
        # Update pipeline_row_state
        conn.execute(
            """UPDATE pipeline_row_state 
               SET current_state = 'LOCKED_UPLOADED', upload_verified = 1, last_verified_at = ?, updated_at = ?
               WHERE idea_id = ?""",
            (now, now, idea_id)
        )

    conn.commit()
    log(f"  📝 DB status updated → uploaded: {folder_name} (YouTube ID: {youtube_id or 'none'})")


def parse_uploaded_results() -> dict[str, str]:
    """Upload registry থেকে uploaded job_id → youtube_id mapping পড়ে।"""
    registry_path = UPLOADER_DIR / "state" / CHANNEL_SLUG / "upload_registry.txt"
    if not registry_path.exists():
        return {}
    mapping = {}
    for line in registry_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            if entry.get("status") == "uploaded" and entry.get("youtube_id"):
                # Registry lowercases job IDs, so normalize
                mapping[entry["id"].lower()] = entry["youtube_id"]
        except json.JSONDecodeError:
            continue
    return mapping


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="YouTube Pipeline Bridge — scan → queue → upload")
    parser.add_argument("--scan-only", action="store_true", help="শুধু scan, upload না")
    parser.add_argument("--dry-run", action="store_true", help="কী হবে দেখায়, কিছু করে না")
    parser.add_argument("--limit", type=int, default=None, help="সর্বোচ্চ কতগুলো upload")
    args = parser.parse_args()

    log("=" * 60)
    log("YouTube Pipeline → youtube-uploader Bridge")
    log("=" * 60)

    # Step 1: Scan packages
    log("\n📁 Step 1: output_packaged/ scan করছি...")
    all_packages = scan_packages()
    log(f"  পাওয়া গেছে: {len(all_packages)} টা package")

    if not all_packages:
        log("❌ কোনো upload-ready package নেই!")
        return

    # Step 2: Filter — already uploaded বাদ দাও
    log("\n🔍 Step 2: Duplicate check...")
    conn = get_db_connection()
    uploaded_paths = get_uploaded_packages(conn)
    queued_ids = get_queued_job_ids()

    new_packages = []
    for pkg in all_packages:
        job_id = pkg["folder_name"].replace(" ", "_").replace(".", "_")

        if pkg["folder_path"] in uploaded_paths:
            log(f"  ⏭️  SKIP (already uploaded in DB): {pkg['folder_name']}")
            continue

        if job_id in queued_ids:
            log(f"  ⏭️  SKIP (already in queue): {pkg['folder_name']}")
            continue

        new_packages.append(pkg)

    log(f"  নতুন package: {len(new_packages)} টা")

    if not new_packages:
        log("✅ সব video ইতিমধ্যে uploaded বা queued!")
        conn.close()
        return

    # Apply limit
    if args.limit and len(new_packages) > args.limit:
        new_packages = new_packages[:args.limit]
        log(f"  Limit applied: {args.limit} টা")

    # Step 3: Queue videos
    log(f"\n📤 Step 3: {len(new_packages)} টা video queue করছি...")
    queued_jobs = []
    for pkg in new_packages:
        job_id = queue_video(pkg, dry_run=args.dry_run)
        if job_id:
            queued_jobs.append({"job_id": job_id, "pkg": pkg})

    log(f"  Queued: {len(queued_jobs)} টা")

    if args.scan_only:
        log("\n⏸️  --scan-only: upload skip করা হলো")
        conn.close()
        return

    # Step 4: Upload to YouTube
    if queued_jobs and not args.dry_run:
        log(f"\n🚀 Step 4: YouTube-এ upload করছি...")
        upload_result = run_upload(limit=len(queued_jobs), dry_run=args.dry_run)

        # Parse results and update DB
        uploaded_mapping = parse_uploaded_results()
        for qj in queued_jobs:
            youtube_id = uploaded_mapping.get(qj["job_id"].lower(), "")
            if youtube_id:
                update_db_status(conn, qj["pkg"]["folder_path"], youtube_id)
                log(f"  🎬 {qj['pkg']['title'][:50]}... → https://youtu.be/{youtube_id}")
            else:
                log(f"  ⏳ {qj['pkg']['title'][:50]}... → upload pending/failed")

    conn.close()

    log("\n" + "=" * 60)
    log("✅ Bridge script সম্পন্ন!")
    log("=" * 60)


if __name__ == "__main__":
    main()
