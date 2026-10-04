import os
import struct
import tempfile
import pytest
from flow_guards import (
    format_bytes_human,
    check_preflight_resources,
    evaluate_circuit_breaker,
    evaluate_worker_quarantine,
    validate_mp4_box_structure
)

def test_format_bytes_human():
    assert format_bytes_human(0) == "0 B"
    assert format_bytes_human(500) == "500 B"
    assert format_bytes_human(1023) == "1023 B"
    assert format_bytes_human(1024) == "1.0 KB"
    assert format_bytes_human(15360) == "15.0 KB"
    assert format_bytes_human(1048575) == "1024.0 KB"
    assert format_bytes_human(1048576) == "1.0 MB"
    assert format_bytes_human(15728640) == "15.0 MB"
    assert format_bytes_human(1073741823) == "1024.0 MB"
    assert format_bytes_human(1073741824) == "1.00 GB"
    assert format_bytes_human(2147483648) == "2.00 GB"

def test_check_preflight_resources_disk_pass():
    ok, msg = check_preflight_resources("/tmp", min_disk_free_bytes=1000, min_ram_free_mb=1)
    assert ok is True
    assert msg == "OK"

def test_check_preflight_resources_disk_fail():
    ok, msg = check_preflight_resources("/tmp", min_disk_free_bytes=10**15, min_ram_free_mb=1)
    assert ok is False
    assert "Insufficient disk space" in msg

def test_check_preflight_resources_invalid_dir():
    ok, msg = check_preflight_resources("/nonexistent_dir_12345", min_disk_free_bytes=1000, min_ram_free_mb=1)
    assert ok is False
    assert "Could not determine disk usage" in msg

def test_evaluate_circuit_breaker_closed():
    ok, state = evaluate_circuit_breaker("CLOSED", 100.0, 60.0, 120.0)
    assert ok is True
    assert state == "CLOSED"

def test_evaluate_circuit_breaker_half_open():
    ok, state = evaluate_circuit_breaker("HALF_OPEN", 100.0, 60.0, 120.0)
    assert ok is True
    assert state == "HALF_OPEN"

def test_evaluate_circuit_breaker_open_cooldown_active():
    # Boundary: exactly at cooldown_sec (100.0 + 60.0 = 160.0)
    ok, msg = evaluate_circuit_breaker("OPEN", 100.0, 60.0, 160.0)
    assert ok is False
    assert "0s" in msg

    # Midway during cooldown (elapsed = 30s)
    ok, msg = evaluate_circuit_breaker("OPEN", 100.0, 60.0, 130.0)
    assert ok is False
    assert "Circuit breaker OPEN" in msg
    assert "30s" in msg

def test_evaluate_circuit_breaker_open_cooldown_expired():
    ok, state = evaluate_circuit_breaker("OPEN", 100.0, 60.0, 160.1)
    assert ok is True
    assert state == "HALF_OPEN"

def test_evaluate_worker_quarantine_not_quarantined():
    is_q, rem = evaluate_worker_quarantine("active", 200.0, 100.0)
    assert is_q is False
    assert rem == 0.0

def test_evaluate_worker_quarantine_active():
    is_q, rem = evaluate_worker_quarantine("quarantined", 200.0, 150.0)
    assert is_q is True
    assert rem == 50.0

def test_evaluate_worker_quarantine_exact_boundary():
    # When now == quarantine_until (remaining == 0.0), quarantine has expired
    is_q, rem = evaluate_worker_quarantine("quarantined", 200.0, 200.0)
    assert is_q is False
    assert rem == 0.0

def test_evaluate_worker_quarantine_expired():
    is_q, rem = evaluate_worker_quarantine("quarantined", 200.0, 250.0)
    assert is_q is False
    assert rem == 0.0

def _make_mp4_bytes(include_ftyp=True, include_moov=True, mdat_size=110000, truncate_box=False):
    parts = []
    if include_ftyp:
        ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
        parts.append(struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload)
    
    if mdat_size > 0:
        claimed_size = mdat_size + 8 if not truncate_box else mdat_size * 5
        parts.append(struct.pack(">I4s", claimed_size, b"mdat") + b"\x00" * mdat_size)
    
    if include_moov:
        moov_payload = struct.pack(">I4s", 16, b"mvhd") + b"\x00" * 8
        parts.append(struct.pack(">I4s", len(moov_payload) + 8, b"moov") + moov_payload)
    
    return b"".join(parts)

def test_validate_mp4_nonexistent():
    ok, msg, _ = validate_mp4_box_structure("/nonexistent/file.mp4")
    assert ok is False
    assert "does not exist" in msg

def test_validate_mp4_too_small(tmp_path):
    f = tmp_path / "small.mp4"
    f.write_bytes(b"ftyp" * 10)
    ok, msg, _ = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "too small" in msg

def test_validate_mp4_content_length_mismatch(tmp_path):
    f = tmp_path / "valid.mp4"
    data = _make_mp4_bytes()
    f.write_bytes(data)
    ok, msg, _ = validate_mp4_box_structure(str(f), expected_content_length=len(data) + 100)
    assert ok is False
    assert "Content-Length mismatch" in msg

def test_validate_mp4_valid(tmp_path):
    f = tmp_path / "valid.mp4"
    data = _make_mp4_bytes()
    f.write_bytes(data)
    ok, msg, meta = validate_mp4_box_structure(str(f), expected_content_length=len(data))
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"
    assert "ftyp" in meta["boxes"]
    assert "moov" in meta["boxes"]

def test_validate_mp4_missing_ftyp(tmp_path):
    f = tmp_path / "no_ftyp.mp4"
    data = _make_mp4_bytes(include_ftyp=False)
    f.write_bytes(data)
    ok, msg, _ = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "missing 'ftyp' box" in msg

def test_validate_mp4_missing_moov(tmp_path):
    f = tmp_path / "no_moov.mp4"
    data = _make_mp4_bytes(include_moov=False)
    f.write_bytes(data)
    ok, msg, _ = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "missing 'moov' atom" in msg

def test_validate_mp4_truncated_box(tmp_path):
    f = tmp_path / "truncated.mp4"
    data = _make_mp4_bytes(truncate_box=True)
    f.write_bytes(data)
    ok, msg, _ = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "Truncated MP4 box" in msg

def test_validate_mp4_invalid_box_size(tmp_path):
    f = tmp_path / "bad_size.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # Header with invalid size 3 (< 8)
    bad_box = struct.pack(">I4s", 3, b"junk") + b"\x00" * 120000
    f.write_bytes(ftyp + bad_box)
    ok, msg, _ = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "invalid box size" in msg

def test_validate_mp4_64bit_box(tmp_path):
    f = tmp_path / "large_box.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    payload = b"\x00" * 110000
    # size 1 indicates 64-bit size
    header_64 = struct.pack(">I4sQ", 1, b"mdat", len(payload) + 16) + payload
    moov_payload = struct.pack(">I4s", 16, b"mvhd") + b"\x00" * 8
    moov = struct.pack(">I4s", len(moov_payload) + 8, b"moov") + moov_payload
    f.write_bytes(ftyp + header_64 + moov)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"

def test_validate_mp4_size_boundary(tmp_path):
    f_under = tmp_path / "under.mp4"
    f_under.write_bytes(b"a" * 99999)
    ok1, msg1, _ = validate_mp4_box_structure(str(f_under))
    assert ok1 is False
    assert "too small" in msg1

    # Exactly 100,000 bytes with invalid box structure should pass the size check and fail on box parsing
    f_exact = tmp_path / "exact.mp4"
    f_exact.write_bytes(b"a" * 100000)
    ok2, msg2, _ = validate_mp4_box_structure(str(f_exact))
    assert ok2 is False
    assert "too small" not in msg2
    assert "Truncated" in msg2 or "Corrupted" in msg2 or "ftyp" in msg2

def test_validate_mp4_expected_content_length_zero(tmp_path):
    f = tmp_path / "valid.mp4"
    data = _make_mp4_bytes()
    f.write_bytes(data)
    # expected_content_length = 0 should be treated as unset
    ok, msg, _ = validate_mp4_box_structure(str(f), expected_content_length=0)
    assert ok is True

def test_validate_mp4_64bit_box_truncated_header(tmp_path):
    f = tmp_path / "trunc_64.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # size 1 indicates 64-bit size, but provide only 4 bytes of 64-bit size instead of 8
    broken_box = struct.pack(">I4s", 1, b"mdat") + b"\x00" * 4
    padding = b"\x00" * (110000 - len(ftyp) - len(broken_box))
    f.write_bytes(ftyp + broken_box + padding)
    ok, msg, _ = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "invalid 64-bit box size" in msg or "truncated 64-bit box header" in msg or "Truncated" in msg

def test_validate_mp4_box_extends_to_eof(tmp_path):
    f = tmp_path / "eof_box.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    moov_payload = struct.pack(">I4s", 16, b"mvhd") + b"\x00" * 8
    moov = struct.pack(">I4s", len(moov_payload) + 8, b"moov") + moov_payload
    # Box with size 0 extends to EOF
    eof_box = struct.pack(">I4s", 0, b"free") + b"\x00" * 110000
    f.write_bytes(ftyp + moov + eof_box)
    ok, msg, _ = validate_mp4_box_structure(str(f))
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"
