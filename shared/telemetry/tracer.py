"""
REQ-092: Structured JSON Telemetry & Observability
==================================================
Lightweight OpenTelemetry-compatible tracing and structured JSON logging.
Tracks trace_id and span_id across distributed worker boundaries.
"""

from __future__ import annotations

import json
import time
import uuid
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional


class Span:
    def __init__(
        self,
        name: str,
        trace_id: str,
        span_id: str,
        parent_span_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.trace_id = trace_id
        self.span_id = span_id
        self.parent_span_id = parent_span_id
        self.attributes = attributes or {}
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.duration_ms: Optional[float] = None
        self.status = "OK"
        self.events: List[Dict[str, Any]] = []

    def set_attribute(self, key: str, value: Any) -> None:
        self.attributes[key] = value

    def add_event(self, event_name: str, payload: Optional[Dict[str, Any]] = None) -> None:
        self.events.append({
            "name": event_name,
            "timestamp": time.time(),
            "payload": payload or {}
        })

    def finish(self, status: str = "OK") -> Dict[str, Any]:
        self.end_time = time.time()
        self.duration_ms = round((self.end_time - self.start_time) * 1000, 2)
        self.status = status
        return self.to_dict()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "duration_ms": self.duration_ms,
            "status": self.status,
            "attributes": self.attributes,
            "events": self.events,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)


class TelemetryTracer:
    """
    Structured telemetry manager recording trace trees and performance spans.
    """

    def __init__(self, service_name: str = "youtube_erp"):
        self.service_name = service_name
        self._spans_buffer: List[Dict[str, Any]] = []

    def new_trace_id(self) -> str:
        return uuid.uuid4().hex

    def new_span_id(self) -> str:
        return uuid.uuid4().hex[:16]

    @contextmanager
    def start_span(
        self,
        name: str,
        trace_id: Optional[str] = None,
        parent_span_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None
    ) -> Generator[Span, None, None]:
        tid = trace_id or self.new_trace_id()
        sid = self.new_span_id()
        span = Span(name=name, trace_id=tid, span_id=sid, parent_span_id=parent_span_id, attributes=attributes)
        span.set_attribute("service.name", self.service_name)
        try:
            yield span
            span_dict = span.finish(status="OK")
            self._spans_buffer.append(span_dict)
        except Exception as exc:
            span.set_attribute("error.message", str(exc))
            span_dict = span.finish(status="ERROR")
            self._spans_buffer.append(span_dict)
            raise

    def get_buffered_spans(self) -> List[Dict[str, Any]]:
        return list(self._spans_buffer)
