"""
Database Safety, Backup & Rollback Protocol (REQ-042)
=====================================================
Automated database backup with SHA256 checksum integrity verification and rollback recovery.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db"
BACKUP_DIR = REPO_ROOT / "PromptDatabase" / "database" / "backups"
MANIFEST_PATH = BACKUP_DIR / "backup_manifest.json"


def compute_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def load_manifest() -> List[Dict[str, Any]]:
    if MANIFEST_PATH.exists():
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_manifest(manifest: List[Dict[str, Any]]) -> None:
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def create_backup(tag: str = "manual") -> Dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database file not found: {DB_PATH}")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_name = f"youtube_pipeline_{ts}_{tag}.db"
    backup_file = BACKUP_DIR / backup_name

    shutil.copy2(DB_PATH, backup_file)
    checksum = compute_sha256(backup_file)
    size_bytes = backup_file.stat().st_size

    record = {
        "filename": backup_name,
        "path": str(backup_file.resolve()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sha256": checksum,
        "size_bytes": size_bytes,
        "tag": tag,
    }

    manifest = load_manifest()
    manifest.append(record)
    save_manifest(manifest)

    return record


def verify_latest_backup() -> Dict[str, Any]:
    manifest = load_manifest()
    if not manifest:
        return {"status": "no_backups_found"}

    latest = manifest[-1]
    b_path = Path(latest["path"])
    if not b_path.exists():
        return {"status": "file_missing", "record": latest}

    current_hash = compute_sha256(b_path)
    is_valid = current_hash == latest["sha256"]
    return {
        "status": "valid" if is_valid else "corrupted",
        "record": latest,
        "verified_hash": current_hash,
    }


def rollback_to(backup_name: str) -> Dict[str, Any]:
    backup_file = BACKUP_DIR / backup_name
    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file does not exist: {backup_file}")

    # Verify backup integrity first
    manifest = load_manifest()
    expected_hash = None
    for item in manifest:
        if item["filename"] == backup_name:
            expected_hash = item["sha256"]
            break

    actual_hash = compute_sha256(backup_file)
    if expected_hash and actual_hash != expected_hash:
        raise ValueError(f"Backup checksum mismatch! Refusing to restore corrupted file.")

    # Create safety snapshot of current broken state before overwriting
    create_backup(tag="pre_rollback_snapshot")
    shutil.copy2(backup_file, DB_PATH)

    return {
        "status": "restored",
        "restored_from": backup_name,
        "sha256": actual_hash,
    }


def main():
    parser = argparse.ArgumentParser(description="Database Safety Protocol")
    parser.add_argument("--backup", action="store_true", help="Create a timestamped backup with SHA256")
    parser.add_argument("--verify", action="store_true", help="Verify the integrity of the latest backup")
    parser.add_argument("--tag", type=str, default="manual", help="Tag for backup")
    args = parser.parse_args()

    if args.backup:
        rec = create_backup(args.tag)
        print(f"Backup Created: {rec['filename']}")
        print(f"SHA256:         {rec['sha256']}")
        print(f"Size:           {rec['size_bytes'] / (1024*1024):.2f} MB")
    elif args.verify:
        v = verify_latest_backup()
        print(f"Verification Status: {v['status']}")
        if v.get("record"):
            print(f"Latest Backup:       {v['record']['filename']}")
            print(f"Verified Hash:       {v.get('verified_hash')}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
