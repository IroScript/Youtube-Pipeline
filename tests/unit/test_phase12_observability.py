"""
Unit Tests for Phase 12: Observability & Audit Trail (REQ-091 & REQ-092)
========================================================================
Tests:
- REQ-091: AuditLog model, append-only persistence & cryptographic record hashing
- REQ-092: TelemetryTracer OpenTelemetry-compatible tracing, spans & context tags
"""

import pytest
from datetime import datetime, timezone
from sqlmodel import SQLModel, create_engine, Session

from domain.audit.audit_model import AuditLog
from shared.telemetry.tracer import TelemetryTracer


# --- REQ-091: Immutable Audit Log Ledger ---
def test_req_091_audit_log_model():
    engine = create_engine("sqlite:///:memory:", echo=False)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        now = datetime.now(timezone.utc)
        record_hash = AuditLog.compute_record_hash(
            actor="admin_user",
            action="MIGRATE",
            entity_type="execution",
            entity_id="exec_999",
            before_state={"version": 1},
            after_state={"version": 2},
            created_at=now
        )
        audit = AuditLog(
            actor="admin_user",
            action="MIGRATE",
            entity_type="execution",
            entity_id="exec_999",
            before_state={"version": 1},
            after_state={"version": 2},
            reason="Upgraded to Version 2 with Fact Check",
            record_hash=record_hash,
            created_at=now
        )
        session.add(audit)
        session.commit()
        session.refresh(audit)

        assert audit.id is not None
        assert audit.action == "MIGRATE"
        assert audit.record_hash == record_hash
        assert len(audit.record_hash) == 64


# --- REQ-092: Structured Telemetry Tracer ---
def test_req_092_telemetry_tracer():
    tracer = TelemetryTracer(service_name="youtube_pipeline_test")
    trace_id = tracer.new_trace_id()
    assert len(trace_id) == 32

    with tracer.start_span("generate_script_span", trace_id=trace_id) as span:
        span.set_attribute("llm.model", "gemini-2.5")
        span.add_event("prompt_dispatched", {"tokens": 150})
        span.add_event("response_received", {"tokens": 850})

    buffered = tracer.get_buffered_spans()
    assert len(buffered) == 1
    root_span = buffered[0]
    assert root_span["name"] == "generate_script_span"
    assert root_span["trace_id"] == trace_id
    assert root_span["attributes"]["llm.model"] == "gemini-2.5"
    assert root_span["status"] == "OK"
    assert len(root_span["events"]) == 2
    assert root_span["duration_ms"] >= 0
