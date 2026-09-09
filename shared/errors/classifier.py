"""
REQ-061: Granular Error Classification Engine
=============================================
Categorizes execution failures into deterministic error classes:
- NETWORK_TRANSIENT (retryable with backoff)
- RATE_LIMIT (retryable with retry-after)
- BROWSER_CRASH (retryable with clean profile)
- AUTH_EXPIRED (requires auth re-login or refresh)
- INVALID_INPUT (fatal, non-retryable)
- RESOURCE_EXHAUSTED (fatal/paused)
- FATAL_BUG (fatal, non-retryable)
- EXTERNAL_UNKNOWN (requires external state reconciliation before retry)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional


class ErrorCategory(str, Enum):
    NETWORK_TRANSIENT = "NETWORK_TRANSIENT"
    RATE_LIMIT = "RATE_LIMIT"
    BROWSER_CRASH = "BROWSER_CRASH"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    INVALID_INPUT = "INVALID_INPUT"
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"
    FATAL_BUG = "FATAL_BUG"
    EXTERNAL_UNKNOWN = "EXTERNAL_UNKNOWN"


@dataclass(frozen=True)
class ErrorClassification:
    category: ErrorCategory
    is_retryable: bool
    default_delay_seconds: float
    recommended_action: str
    description: str


class ErrorClassifier:
    """
    Classifies raw exceptions and error payloads into actionable failure strategies.
    """

    CLASSIFICATION_RULES = {
        ErrorCategory.NETWORK_TRANSIENT: ErrorClassification(
            category=ErrorCategory.NETWORK_TRANSIENT,
            is_retryable=True,
            default_delay_seconds=5.0,
            recommended_action="RETRY_WITH_BACKOFF",
            description="Temporary connection or network interruption",
        ),
        ErrorCategory.RATE_LIMIT: ErrorClassification(
            category=ErrorCategory.RATE_LIMIT,
            is_retryable=True,
            default_delay_seconds=60.0,
            recommended_action="WAIT_RATE_LIMIT",
            description="API provider 429 or quota limit hit",
        ),
        ErrorCategory.BROWSER_CRASH: ErrorClassification(
            category=ErrorCategory.BROWSER_CRASH,
            is_retryable=True,
            default_delay_seconds=10.0,
            recommended_action="RECYCLE_BROWSER_PROFILE",
            description="Browser crashed or disconnected abruptly",
        ),
        ErrorCategory.AUTH_EXPIRED: ErrorClassification(
            category=ErrorCategory.AUTH_EXPIRED,
            is_retryable=False,
            default_delay_seconds=0.0,
            recommended_action="REFRESH_CREDENTIALS",
            description="Expired authentication token or cookie",
        ),
        ErrorCategory.INVALID_INPUT: ErrorClassification(
            category=ErrorCategory.INVALID_INPUT,
            is_retryable=False,
            default_delay_seconds=0.0,
            recommended_action="ROUTE_TO_DLQ",
            description="Malformed prompt, invalid schema, or missing required parameter",
        ),
        ErrorCategory.RESOURCE_EXHAUSTED: ErrorClassification(
            category=ErrorCategory.RESOURCE_EXHAUSTED,
            is_retryable=True,
            default_delay_seconds=30.0,
            recommended_action="PAUSE_AND_DRAIN",
            description="Out of memory, CPU saturation, or disk capacity limit",
        ),
        ErrorCategory.FATAL_BUG: ErrorClassification(
            category=ErrorCategory.FATAL_BUG,
            is_retryable=False,
            default_delay_seconds=0.0,
            recommended_action="ROUTE_TO_DLQ",
            description="Unrecoverable application assertion or programming bug",
        ),
        ErrorCategory.EXTERNAL_UNKNOWN: ErrorClassification(
            category=ErrorCategory.EXTERNAL_UNKNOWN,
            is_retryable=False,
            default_delay_seconds=15.0,
            recommended_action="RECONCILE_EXTERNAL_STATE",
            description="Network dropped during mutation; verify external entity before retry",
        ),
    }

    @classmethod
    def classify(cls, error: Any) -> ErrorClassification:
        msg = str(error).lower()
        err_type = type(error).__name__.lower()

        # 1. Network / HTTP transient
        if any(w in msg for w in ["timeout", "connection refused", "econnreset", "broken pipe", "502", "503", "504"]):
            return cls.CLASSIFICATION_RULES[ErrorCategory.NETWORK_TRANSIENT]

        # 2. Rate limit
        if any(w in msg for w in ["429", "rate limit", "quota exceeded", "too many requests", "resource_exhausted"]):
            return cls.CLASSIFICATION_RULES[ErrorCategory.RATE_LIMIT]

        # 3. Browser crash
        if any(w in msg for w in ["chrome crashed", "target closed", "browser disconnected", "session deleted", "sigsegv"]):
            return cls.CLASSIFICATION_RULES[ErrorCategory.BROWSER_CRASH]

        # 4. Auth
        if any(w in msg for w in ["unauthorized", "401", "token expired", "auth failed", "forbidden", "403"]):
            return cls.CLASSIFICATION_RULES[ErrorCategory.AUTH_EXPIRED]

        # 5. Invalid input / validation
        if any(w in msg for w in ["validationerror", "valueerror", "invalid argument", "schema error", "bad request", "400"]):
            return cls.CLASSIFICATION_RULES[ErrorCategory.INVALID_INPUT]

        # 6. Resource exhausted
        if any(w in msg for w in ["out of memory", "disk full", "enospc", "oom"]):
            return cls.CLASSIFICATION_RULES[ErrorCategory.RESOURCE_EXHAUSTED]

        # 7. External mutation interrupted
        if any(w in msg for w in ["upload interrupted", "response lost", "socket hang up after send"]):
            return cls.CLASSIFICATION_RULES[ErrorCategory.EXTERNAL_UNKNOWN]

        # Default fallback to FATAL_BUG
        return cls.CLASSIFICATION_RULES[ErrorCategory.FATAL_BUG]
