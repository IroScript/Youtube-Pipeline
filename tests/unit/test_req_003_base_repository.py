"""
REQ-003: Generic Base Repository Pattern
========================================
Dedicated automated test suite proving:
1. BaseRepository generic type binding and session management.
2. Complete CRUD lifecycle (create, get_by_id, count, update, delete).
3. Dual-identifier support (integer primary key and optional UUID lookup).
4. Pagination behavior (skip, limit, offset boundaries).
5. Safe deletion semantics (delete_by_id returns True on success, False on missing).
6. Adversarial edge cases: non-existent lookups, models lacking UUID attribute, empty results.
"""

import uuid
import pytest
from typing import Optional
from sqlmodel import SQLModel, Field, Session, create_engine
from repositories.base_repository import BaseRepository


class SampleEntityWithUUID(SQLModel, table=True):
    __tablename__ = "test_req_003_with_uuid"
    id: Optional[int] = Field(default=None, primary_key=True)
    uuid: str = Field(default_factory=lambda: str(uuid.uuid4()), index=True)
    title: str
    description: Optional[str] = None


class SampleEntityNoUUID(SQLModel, table=True):
    __tablename__ = "test_req_003_no_uuid"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str


@pytest.fixture
def in_memory_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_req_003_crud_lifecycle(in_memory_session):
    """Verify create, get_by_id, update, count, and delete operations."""
    repo = BaseRepository(SampleEntityWithUUID, in_memory_session)

    assert repo.count() == 0

    # 1. Create
    item = SampleEntityWithUUID(title="Original Title", description="Test Description")
    saved = repo.create(item)
    assert saved.id is not None
    assert saved.title == "Original Title"
    assert repo.count() == 1

    # 2. Get by ID
    fetched = repo.get_by_id(saved.id)
    assert fetched is not None
    assert fetched.id == saved.id
    assert fetched.title == "Original Title"

    # 3. Update
    fetched.title = "Updated Title"
    updated = repo.update(fetched)
    assert updated.title == "Updated Title"
    refetched = repo.get_by_id(saved.id)
    assert refetched.title == "Updated Title"

    # 4. Delete
    result = repo.delete(refetched)
    assert result is True
    assert repo.count() == 0
    assert repo.get_by_id(saved.id) is None


def test_req_003_uuid_resolution(in_memory_session):
    """Verify get_by_uuid resolves when present and handles missing gracefully."""
    repo_uuid = BaseRepository(SampleEntityWithUUID, in_memory_session)
    custom_uuid = str(uuid.uuid4())
    item = SampleEntityWithUUID(uuid=custom_uuid, title="UUID Item")
    repo_uuid.create(item)

    # Resolve by UUID
    found = repo_uuid.get_by_uuid(custom_uuid)
    assert found is not None
    assert found.title == "UUID Item"
    assert found.uuid == custom_uuid

    # Non-existent UUID
    missing = repo_uuid.get_by_uuid("00000000-0000-0000-0000-000000000000")
    assert missing is None

    # Model without UUID attribute
    repo_no_uuid = BaseRepository(SampleEntityNoUUID, in_memory_session)
    item_no_uuid = SampleEntityNoUUID(name="Plain Item")
    repo_no_uuid.create(item_no_uuid)
    assert repo_no_uuid.get_by_uuid(custom_uuid) is None


def test_req_003_pagination_and_boundaries(in_memory_session):
    """Verify get_all handles pagination offsets, limits, and out-of-bounds skip."""
    repo = BaseRepository(SampleEntityWithUUID, in_memory_session)
    for i in range(15):
        repo.create(SampleEntityWithUUID(title=f"Item {i:02d}"))

    assert repo.count() == 15

    # First page
    page_1 = repo.get_all(skip=0, limit=5)
    assert len(page_1) == 5
    assert page_1[0].title == "Item 00"

    # Second page
    page_2 = repo.get_all(skip=5, limit=5)
    assert len(page_2) == 5
    assert page_2[0].title == "Item 05"

    # Out of bounds skip
    empty_page = repo.get_all(skip=100, limit=10)
    assert len(empty_page) == 0


def test_req_003_delete_by_id_semantics(in_memory_session):
    """Verify delete_by_id returns True on successful delete, False when target doesn't exist."""
    repo = BaseRepository(SampleEntityWithUUID, in_memory_session)
    item = repo.create(SampleEntityWithUUID(title="To be deleted"))
    target_id = item.id

    assert repo.delete_by_id(target_id) is True
    assert repo.get_by_id(target_id) is None

    # Deleting already deleted or non-existent ID
    assert repo.delete_by_id(target_id) is False
    assert repo.delete_by_id(99999) is False
