"""
REQ-059: Dynamic Step Configuration Engine
==========================================
Resolves and interpolates dynamic template variables in step configuration
dictionaries using values from the execution context and predecessor outputs.
"""

from __future__ import annotations

import re
from typing import Any, Dict


class ConfigEngine:
    """
    Template interpolation engine resolving placeholders like {{ context.topic }} or {{ outputs.script.title }}.
    """

    VAR_PATTERN = re.compile(r"\{\{\s*([\w\.\_]+)\s*\}\}")

    @classmethod
    def resolve_path(cls, data_pool: Dict[str, Any], path: str) -> Any:
        parts = path.split(".")
        curr: Any = data_pool
        for part in parts:
            if isinstance(curr, dict) and part in curr:
                curr = curr[part]
            else:
                return None
        return curr

    @classmethod
    def interpolate_string(cls, template_str: str, data_pool: Dict[str, Any]) -> str:
        def replacer(match):
            key_path = match.group(1)
            val = cls.resolve_path(data_pool, key_path)
            return str(val) if val is not None else match.group(0)

        return cls.VAR_PATTERN.sub(replacer, template_str)

    @classmethod
    def resolve_value(cls, value: Any, data_pool: Dict[str, Any]) -> Any:
        if isinstance(value, str):
            # Check if entire string is an exact single placeholder e.g. "{{ context.number }}"
            match = cls.VAR_PATTERN.fullmatch(value.strip())
            if match:
                resolved = cls.resolve_path(data_pool, match.group(1))
                return resolved if resolved is not None else value
            return cls.interpolate_string(value, data_pool)

        elif isinstance(value, dict):
            return {k: cls.resolve_value(v, data_pool) for k, v in value.items()}

        elif isinstance(value, list):
            return [cls.resolve_value(item, data_pool) for item in value]

        return value

    @classmethod
    def resolve_step_config(
        cls,
        raw_config: Dict[str, Any],
        context_data: Dict[str, Any],
        completed_outputs: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """
        Builds evaluation data pool containing 'context' and 'outputs' and returns fully resolved config.
        """
        data_pool = {
            "context": context_data,
            "outputs": completed_outputs or {},
        }
        return cls.resolve_value(raw_config, data_pool)
