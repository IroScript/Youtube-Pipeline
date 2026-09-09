"""
Idea, Category & Element Repository
===================================
Encapsulates all database operations related to Categories, Elements, and Ideas.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional, List
from sqlmodel import Session, select, func

REPO_ROOT = Path(__file__).resolve().parent.parent
prompt_db_path = str(REPO_ROOT / "PromptDatabase")
if prompt_db_path not in sys.path:
    sys.path.insert(0, prompt_db_path)

from database.models import Category, Element, Idea, IdeaElement
from repositories.base_repository import BaseRepository


class IdeaRepository(BaseRepository[Idea]):
    def __init__(self, session: Session):
        super().__init__(Idea, session)

    def get_all_categories(self) -> List[Category]:
        return list(self.session.exec(select(Category).order_by(Category.id)).all())

    def get_category_by_name(self, name: str) -> Optional[Category]:
        return self.session.exec(select(Category).where(Category.name == name)).first()

    def get_element_by_id(self, element_id: int) -> Optional[Element]:
        return self.session.get(Element, element_id)

    def get_element_by_name(self, name: str) -> Optional[Element]:
        return self.session.exec(select(Element).where(Element.name == name)).first()

    def get_all_elements(self, skip: int = 0, limit: int = 100) -> List[Element]:
        return list(self.session.exec(select(Element).order_by(Element.id).offset(skip).limit(limit)).all())

    def get_ideas_for_element(self, element_id: int) -> List[Idea]:
        statement = (
            select(Idea)
            .join(IdeaElement, Idea.id == IdeaElement.idea_id)
            .where(IdeaElement.element_id == element_id)
            .order_by(Idea.id)
        )
        return list(self.session.exec(statement).all())

    def get_linked_element(self, idea_id: int) -> Optional[Element]:
        link = self.session.exec(select(IdeaElement).where(IdeaElement.idea_id == idea_id)).first()
        if link:
            return self.get_element_by_id(link.element_id)
        return None

    def get_all_idea_ids(self) -> List[int]:
        statement = select(Idea.id).order_by(Idea.id)
        return list(self.session.exec(statement).all())

    def get_idea_index_in_element(self, idea_id: int) -> tuple[int, int]:
        """
        Returns (element_id, idea_index_within_element) (1-indexed).
        """
        elem = self.get_linked_element(idea_id)
        elem_id = elem.id if elem and elem.id else 1
        linked = self.get_ideas_for_element(elem_id)
        idx = 1
        for i, item in enumerate(linked, 1):
            if item.id == idea_id:
                idx = i
                break
        return elem_id, idx
