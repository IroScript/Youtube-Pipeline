"""
REQ-056: Conditional Branching Evaluator
=======================================
Evaluates dynamic step condition predicates against runtime execution context.
Supports nested dot-path resolution and logical comparison operators.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class BranchEvaluator:
    """
    Evaluates condition dictionaries to decide whether a step should run or be SKIPPED.
    """

    @classmethod
    def resolve_field(cls, context: Dict[str, Any], path: str) -> Any:
        """
        Traverses nested dictionary keys separated by dots (e.g. 'content.audio_required').
        """
        parts = path.split(".")
        curr: Any = context
        for part in parts:
            if isinstance(curr, dict) and part in curr:
                curr = curr[part]
            else:
                return None
        return curr

    @classmethod
    def evaluate(cls, condition: Optional[Dict[str, Any]], context: Dict[str, Any]) -> bool:
        """
        Evaluates condition dictionary against context.
        If condition is None or empty, returns True (run unconditionally).
        """
        if not condition:
            return True

        field_path = condition.get("field")
        if not field_path:
            return True

        actual_value = cls.resolve_field(context, field_path)

        # Operator checks
        if "equals" in condition:
            return actual_value == condition["equals"]

        if "not_equals" in condition:
            return actual_value != condition["not_equals"]

        if "in" in condition:
            target_list = condition["in"]
            if isinstance(target_list, (list, tuple, set)):
                return actual_value in target_list
            return False

        if "not_in" in condition:
            target_list = condition["not_in"]
            if isinstance(target_list, (list, tuple, set)):
                return actual_value not in target_list
            return True

        if "greater_than" in condition:
            if actual_value is not None:
                return actual_value > condition["greater_than"]
            return False

        if "less_than" in condition:
            if actual_value is not None:
                return actual_value < condition["less_than"]
            return False

        if "exists" in condition:
            required = condition["exists"]
            is_present = actual_value is not None
            return is_present if required else not is_present

        return True
