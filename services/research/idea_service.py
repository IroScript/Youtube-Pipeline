"""
Idea & Research Business Service
================================
Provides domain business logic for ideas, elements, and categories.
"""

from __future__ import annotations

from typing import Optional, List, Dict, Any
from sqlmodel import Session
from repositories.idea_repository import IdeaRepository
from database.models import Idea, Category, Element


class IdeaService:
    def __init__(self, session: Session):
        self.session = session
        self.repo = IdeaRepository(session)

    def list_categories(self) -> List[Category]:
        return self.repo.get_all_categories()

    def list_elements(self, skip: int = 0, limit: int = 100) -> List[Element]:
        return self.repo.get_all_elements(skip=skip, limit=limit)

    def get_element_by_id(self, element_id: int) -> Optional[Element]:
        return self.repo.get_element_by_id(element_id)

    def list_ideas_for_element(self, element_id: int) -> List[Idea]:
        return self.repo.get_ideas_for_element(element_id)

    def get_idea(self, idea_id: int) -> Optional[Idea]:
        return self.repo.get_by_id(idea_id)

    def get_all_idea_ids(self) -> List[int]:
        return self.repo.get_all_idea_ids()

    def get_idea_summary(self, idea_id: int) -> Optional[Dict[str, Any]]:
        idea = self.get_idea(idea_id)
        if not idea:
            return None
        elem = self.repo.get_linked_element(idea_id)
        elem_id, idx = self.repo.get_idea_index_in_element(idea_id)
        return {
            "id": idea.id,
            "title": idea.title,
            "topic": idea.topic,
            "status": idea.status,
            "element_id": elem_id,
            "element_name": elem.name if elem else None,
            "idea_index": idx,
        }

    def get_stage_report(self, idea_id: int) -> Dict[str, Any]:
        import stage_gates as sg
        return sg.stage_report(idea_id)

    def get_gates_summary(self) -> Dict[str, Any]:
        import stage_gates as sg
        return sg.summarize_all()

    def create_custom_idea(
        self,
        title: str,
        topic: Optional[str] = None,
        category_id: int = 1,
        category: str = "Impossible Giant Machine",
        description: Optional[str] = None,
        element_id: Optional[int] = None
    ) -> Idea:
        import uuid
        from database.models import IdeaElement
        new_idea = Idea(
            uuid=str(uuid.uuid4()),
            title=title,
            short_title=title,
            raw_idea=f"{title}\n{description or ''}",
            description=description or "",
            category_id=category_id,
            category=category,
            topic=topic or "Custom",
            niche=f"{topic or 'Custom'} Megastructures",
            status="new",
            priority=1,
        )
        self.session.add(new_idea)
        self.session.commit()
        self.session.refresh(new_idea)

        if element_id:
            link = IdeaElement(idea_id=new_idea.id, element_id=element_id, is_primary=True)
            self.session.add(link)
            self.session.commit()
        return new_idea

    def generate_ideas_for_element(
        self,
        element_id: int,
        skip_browser: bool = False,
        target_total: int = 10
    ) -> List[Idea]:
        elem = self.repo.get_element_by_id(element_id)
        if not elem:
            raise ValueError(f"Element #{element_id} not found")

        import prompt_chain_engine as pce
        ideas = pce.generate_ideas_for_element(elem, skip_browser=skip_browser, target_total=target_total)
        return ideas or self.repo.get_ideas_for_element(element_id)

    def generate_new_element_from_category(
        self,
        category_id: int,
        skip_browser: bool = False
    ) -> Element:
        cat = self.session.get(Category, category_id)
        if not cat:
            raise ValueError(f"Category #{category_id} not found")

        import prompt_chain_engine as pce
        new_elem = pce.generate_new_element_from_category(cat.name, skip_browser=skip_browser)
        return new_elem

