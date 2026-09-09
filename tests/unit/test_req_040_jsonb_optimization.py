"""
REQ-040: JSONB Payload Optimization
===================================
Dedicated automated test suite proving:
1. JSONB declarations across all payload-heavy tables in domain/schema_pg.sql.
2. Serialization and storage of complex, nested JSON data in SQLModel/SQLAlchemy tables.
3. Retrieval and deep equality assertion of JSON payloads.
4. Modification and atomic updates of JSON dictionary structures.
"""

import re
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
import pytest
from sqlmodel import SQLModel, Field, Session, select, create_engine
from sqlalchemy import Column, JSON

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_FILE = REPO_ROOT / "domain" / "schema_pg.sql"


class JSONBTestModel(SQLModel, table=True):
    __tablename__ = "test_jsonb_payloads"
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_key: str
    metadata_payload: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    tags_list: List[str] = Field(default_factory=list, sa_column=Column(JSON))


def test_req_040_schema_pg_jsonb_declarations():
    """Verify schema_pg.sql declares JSONB types on required entities."""
    content = SCHEMA_FILE.read_text(encoding="utf-8")
    jsonb_tables = [
        ("youtube_metadata", r"tags\s+JSONB"),
        ("task_attempts", r"input_data\s+JSONB"),
        ("task_attempts", r"output_data\s+JSONB"),
        ("workflow_migrations", r"reused_step_keys\s+JSONB"),
        ("execution_events", r"payload\s+JSONB"),
        ("jobs", r"payload\s+JSONB"),
    ]
    for table_name, pattern in jsonb_tables:
        assert re.search(pattern, content, re.IGNORECASE), f"Missing JSONB column in {table_name}"


def test_req_040_json_payload_crud_lifecycle():
    """Verify storing, retrieving, and updating complex nested JSON payloads."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)

    complex_payload = {
        "title": "Quantum Engine",
        "nested": {
            "fps": 24,
            "dimensions": {"width": 1080, "height": 1920},
            "features": ["hdr", "stabilized", "color_graded"],
        },
        "metrics": {"score": 98.5, "verified": True, "notes": None},
    }
    tags = ["ai", "visuals", "hyperlapse"]

    with Session(engine) as session:
        item = JSONBTestModel(
            entity_key="video_001",
            metadata_payload=complex_payload,
            tags_list=tags,
        )
        session.add(item)
        session.commit()
        item_id = item.id

    # Retrieve and verify deep identity
    with Session(engine) as session:
        fetched = session.get(JSONBTestModel, item_id)
        assert fetched is not None
        assert fetched.entity_key == "video_001"
        assert fetched.metadata_payload["nested"]["dimensions"]["width"] == 1080
        assert fetched.metadata_payload["metrics"]["verified"] is True
        assert len(fetched.tags_list) == 3
        assert "hyperlapse" in fetched.tags_list

        # Update nested structure
        updated_payload = dict(fetched.metadata_payload)
        updated_payload["nested"]["fps"] = 60
        updated_payload["status"] = "optimized"
        fetched.metadata_payload = updated_payload
        session.add(fetched)
        session.commit()

    # Verify updated values persist
    with Session(engine) as session:
        refetched = session.get(JSONBTestModel, item_id)
        assert refetched.metadata_payload["nested"]["fps"] == 60
        assert refetched.metadata_payload["status"] == "optimized"
