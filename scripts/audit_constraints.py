"""
Foreign Key, Index & Constraint Audit Tool (REQ-037)
===================================================
Audits SQLite database integrity, checking for orphan foreign keys, index coverage,
and unique constraint violations before migrating to PostgreSQL.
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path
from typing import Dict, List, Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "PromptDatabase" / "database" / "youtube_pipeline.db"


def audit_foreign_keys(con: sqlite3.Connection) -> Dict[str, Any]:
    cur = con.cursor()
    cur.execute("PRAGMA foreign_key_check;")
    violations = cur.fetchall()
    
    # Check specific business table relations:
    # 1. IdeaElements -> Ideas
    cur.execute("""
        SELECT ie.idea_id FROM idea_elements ie
        LEFT JOIN ideas i ON ie.idea_id = i.id
        WHERE i.id IS NULL
    """)
    orphan_idea_elements = cur.fetchall()

    # 2. IdeaElements -> Elements
    cur.execute("""
        SELECT ie.element_id FROM idea_elements ie
        LEFT JOIN elements e ON ie.element_id = e.id
        WHERE e.id IS NULL
    """)
    orphan_element_links = cur.fetchall()

    # 3. Prompts -> Ideas
    cur.execute("""
        SELECT p.id, p.idea_id FROM prompts p
        LEFT JOIN ideas i ON p.idea_id = i.id
        WHERE i.id IS NULL
    """)
    orphan_prompts = cur.fetchall()

    # 4. GeneratedVideos -> Ideas
    cur.execute("""
        SELECT gv.id, gv.idea_id FROM generated_videos gv
        LEFT JOIN ideas i ON gv.idea_id = i.id
        WHERE i.id IS NULL
    """)
    orphan_videos = cur.fetchall()

    # 5. YouTubeMetadata -> Ideas
    cur.execute("""
        SELECT ym.id, ym.idea_id FROM youtube_metadata ym
        LEFT JOIN ideas i ON ym.idea_id = i.id
        WHERE i.id IS NULL
    """)
    orphan_metadata = cur.fetchall()

    return {
        "raw_pragma_violations": len(violations),
        "orphan_idea_elements": len(orphan_idea_elements),
        "orphan_element_links": len(orphan_element_links),
        "orphan_prompts": len(orphan_prompts),
        "orphan_videos": len(orphan_videos),
        "orphan_metadata": len(orphan_metadata),
        "is_consistent": (
            len(orphan_idea_elements) == 0
            and len(orphan_element_links) == 0
            and len(orphan_prompts) == 0
            and len(orphan_videos) == 0
            and len(orphan_metadata) == 0
        ),
    }


def audit_unique_constraints(con: sqlite3.Connection) -> Dict[str, Any]:
    cur = con.cursor()
    # Check duplicate UUIDs in ideas
    cur.execute("SELECT uuid, count(*) FROM ideas GROUP BY uuid HAVING count(*) > 1;")
    dup_idea_uuids = cur.fetchall()

    # Check duplicate UUIDs in prompts
    cur.execute("SELECT uuid, count(*) FROM prompts GROUP BY uuid HAVING count(*) > 1;")
    dup_prompt_uuids = cur.fetchall()

    # Check duplicate names in elements
    cur.execute("SELECT name, count(*) FROM elements GROUP BY name HAVING count(*) > 1;")
    dup_element_names = cur.fetchall()

    return {
        "duplicate_idea_uuids": len(dup_idea_uuids),
        "duplicate_prompt_uuids": len(dup_prompt_uuids),
        "duplicate_element_names": len(dup_element_names),
        "is_unique": (
            len(dup_idea_uuids) == 0
            and len(dup_prompt_uuids) == 0
            and len(dup_element_names) == 0
        ),
    }


def audit_indexes(con: sqlite3.Connection) -> List[str]:
    cur = con.cursor()
    cur.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index';")
    indexes = [f"{row[0]} ON {row[1]}" for row in cur.fetchall()]
    return indexes


def run_full_audit() -> Dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}")

    con = sqlite3.connect(DB_PATH)
    fk_res = audit_foreign_keys(con)
    unique_res = audit_unique_constraints(con)
    indexes = audit_indexes(con)
    con.close()

    return {
        "foreign_keys": fk_res,
        "unique_constraints": unique_res,
        "total_indexes": len(indexes),
        "indexes_sample": indexes[:10],
        "database_ready_for_postgres": fk_res["is_consistent"] and unique_res["is_unique"],
    }


if __name__ == "__main__":
    report = run_full_audit()
    print("=" * 60)
    print("DATABASE CONSTRAINT & INTEGRITY AUDIT REPORT")
    print("=" * 60)
    print(f"Foreign Key Consistency: {'PASS' if report['foreign_keys']['is_consistent'] else 'FAIL'}")
    print(f"Unique Constraints:      {'PASS' if report['unique_constraints']['is_unique'] else 'FAIL'}")
    print(f"Total Indexes Found:     {report['total_indexes']}")
    print(f"PostgreSQL Readiness:    {'READY' if report['database_ready_for_postgres'] else 'BLOCKED'}")
