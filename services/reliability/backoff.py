"""
REQ-062: Exponential Backoff & Jitter Engine
============================================
Calculates retry delays using randomized full jitter and decorrelated jitter
to avoid synchronization thundering herds across distributed workers.
"""

from __future__ import annotations

import random
from typing import Optional


class BackoffEngine:
    """
    Computes backoff delay seconds with exponential growth and random jitter.
    """

    @classmethod
    def calculate_delay(
        cls,
        attempt: int,
        initial_delay: float = 5.0,
        max_delay: float = 300.0,
        factor: float = 2.0,
        jitter: bool = True
    ) -> float:
        """
        Calculates delay using Full Jitter algorithm:
            ceiling = min(max_delay, initial_delay * (factor ** (attempt - 1)))
            delay = uniform(0, ceiling) if jitter else ceiling
        """
        if attempt <= 0:
            attempt = 1

        ceiling = min(max_delay, initial_delay * (factor ** (attempt - 1)))

        if not jitter:
            return round(ceiling, 3)

        # Full jitter: uniformly random between 0 and calculated ceiling
        delay = random.uniform(0.5 * initial_delay, ceiling)
        return round(delay, 3)

    @classmethod
    def calculate_decorrelated_jitter(
        cls,
        previous_delay: float,
        initial_delay: float = 5.0,
        max_delay: float = 300.0
    ) -> float:
        """
        Decorrelated jitter algorithm:
            delay = min(max_delay, uniform(initial_delay, previous_delay * 3))
        """
        low = initial_delay
        high = max(initial_delay, previous_delay * 3.0)
        delay = min(max_delay, random.uniform(low, high))
        return round(delay, 3)
