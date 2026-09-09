"""
Generic Base Repository Pattern
===============================
Provides type-safe CRUD operations and query building on top of SQLModel / SQLAlchemy.
"""

from __future__ import annotations

from typing import Generic, TypeVar, Type, Optional, List, Any
from sqlmodel import Session, SQLModel, select, func

T = TypeVar("T", bound=SQLModel)


class BaseRepository(Generic[T]):
    """
    Abstract base repository handling standard data persistence operations.
    """
    def __init__(self, model_cls: Type[T], session: Session):
        self.model_cls = model_cls
        self.session = session

    def get_by_id(self, entity_id: int) -> Optional[T]:
        """Fetch a single entity by its primary key."""
        return self.session.get(self.model_cls, entity_id)

    def get_by_uuid(self, uuid_str: str) -> Optional[T]:
        """Fetch a single entity by its unique UUID string if supported."""
        if hasattr(self.model_cls, "uuid"):
            statement = select(self.model_cls).where(getattr(self.model_cls, "uuid") == uuid_str)
            return self.session.exec(statement).first()
        return None

    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Fetch multiple entities with pagination."""
        statement = select(self.model_cls).offset(skip).limit(limit)
        return list(self.session.exec(statement).all())

    def count(self) -> int:
        """Count total entities in the table."""
        statement = select(func.count()).select_from(self.model_cls)
        return self.session.exec(statement).one()

    def create(self, entity: T) -> T:
        """Persist a new entity."""
        self.session.add(entity)
        self.session.flush()
        self.session.refresh(entity)
        return entity

    def update(self, entity: T) -> T:
        """Update an existing entity."""
        self.session.add(entity)
        self.session.flush()
        self.session.refresh(entity)
        return entity

    def delete(self, entity: T) -> bool:
        """Delete an entity from the database."""
        self.session.delete(entity)
        self.session.flush()
        return True

    def delete_by_id(self, entity_id: int) -> bool:
        """Delete an entity by its primary key."""
        entity = self.get_by_id(entity_id)
        if entity:
            return self.delete(entity)
        return False
