import os
import shutil
import struct
import tempfile
import time
from unittest.mock import patch, MagicMock
import pytest
from flow_guards import (
    format_bytes_human,
    check_preflight_resources,
    evaluate_circuit_breaker,
    evaluate_worker_quarantine,
    validate_mp4_box_structure,
    detect_security_challenge_and_halt,
    evaluate_lease_reclaim
)
from flow_queue_manager import FlowQueueManager, JobState

def test_format_bytes_human():
    assert format_bytes_human(0) == "0 B"
    assert format_bytes_human(500) == "500 B"
    assert format_bytes_human(1023) == "1023 B"
    assert format_bytes_human(1024) == "1.0 KB"
    assert format_bytes_human(15360) == "15.0 KB"
    assert format_bytes_human(1048575) == "1024.0 KB"
    assert format_bytes_human(1048576) == "1.0 MB"
    assert format_bytes_human(15728640) == "15.0 MB"
    assert format_bytes_human(1073741824) == "1.00 GB"
    assert format_bytes_human(2147483648) == "2.00 GB"
    assert format_bytes_human(10 * 1024 * 1024 * 1024) == "10.00 GB"
    assert format_bytes_human(15 * 1024 * 1024 * 1024) == "15.00 GB"

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

def test_check_preflight_resources_mock_disk_boundaries(monkeypatch):
    threshold = 100 * 1024 * 1024 # 100 MB
    
    # Exact boundary: free == threshold -> PASS
    monkeypatch.setattr(shutil, "disk_usage", lambda path: (10**9, 10**8, threshold))
    ok, msg = check_preflight_resources("/mock/dir", min_disk_free_bytes=threshold, min_ram_free_mb=0)
    assert ok is True
    assert msg == "OK"

    # Below boundary: free == threshold - 1 -> FAIL
    monkeypatch.setattr(shutil, "disk_usage", lambda path: (10**9, 10**8, threshold - 1))
    ok, msg = check_preflight_resources("/mock/dir", min_disk_free_bytes=threshold, min_ram_free_mb=0)
    assert ok is False
    expected_msg = f"Insufficient disk space in /mock/dir: {format_bytes_human(threshold - 1)} free (required: {format_bytes_human(threshold)})"
    assert msg == expected_msg

    # Above boundary: free == threshold + 1 -> PASS
    monkeypatch.setattr(shutil, "disk_usage", lambda path: (10**9, 10**8, threshold + 1))
    ok, msg = check_preflight_resources("/mock/dir", min_disk_free_bytes=threshold, min_ram_free_mb=0)
    assert ok is True
    assert msg == "OK"

def test_check_preflight_resources_ram_check(monkeypatch):
    # Mock /proc/meminfo reading
    monkeypatch.setattr(shutil, "disk_usage", lambda path: (10**9, 10**8, 10**9))
    
    import io
    mem_low = "MemTotal:       16000000 kB\nMemAvailable:     102400 kB\n" # 100 MB available
    monkeypatch.setattr("builtins.open", lambda fname, *args, **kwargs: io.StringIO(mem_low) if "meminfo" in str(fname) else open(fname, *args, **kwargs))
    ok, msg = check_preflight_resources("/tmp", min_disk_free_bytes=1000, min_ram_free_mb=200)
    assert ok is False
    assert "Insufficient available RAM: 100.0 MB available (required: 200 MB)" == msg

    mem_high = "MemTotal:       16000000 kB\nMemAvailable:     512000 kB\n" # 500 MB available
    monkeypatch.setattr("builtins.open", lambda fname, *args, **kwargs: io.StringIO(mem_high) if "meminfo" in str(fname) else open(fname, *args, **kwargs))
    ok, msg = check_preflight_resources("/tmp", min_disk_free_bytes=1000, min_ram_free_mb=200)
    assert ok is True
    assert msg == "OK"

def test_evaluate_circuit_breaker_closed():
    ok, state = evaluate_circuit_breaker("CLOSED", 100.0, 60.0, 120.0)
    assert ok is True
    assert state == "CLOSED"

def test_evaluate_circuit_breaker_half_open():
    ok, state = evaluate_circuit_breaker("HALF_OPEN", 100.0, 60.0, 120.0)
    assert ok is True
    assert state == "HALF_OPEN"

def test_evaluate_circuit_breaker_open_cooldown_active():
    # Boundary: exactly at cooldown_sec (100.0 + 60.0 = 160.0) -> remaining = 0s
    ok, msg = evaluate_circuit_breaker("OPEN", 100.0, 60.0, 160.0)
    assert ok is False
    assert msg == "Circuit breaker OPEN. Cool down remaining: 0s"

    # Midway during cooldown (elapsed = 30s)
    ok, msg = evaluate_circuit_breaker("OPEN", 100.0, 60.0, 130.0)
    assert ok is False
    assert msg == "Circuit breaker OPEN. Cool down remaining: 30s"

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

def test_evaluate_lease_reclaim():
    active_states = ["claimed", "submitting", "generating", "downloading", "verifying"]
    now = 100.0

    for st in active_states:
        # Expired: lease_until < now
        reclaim, reason = evaluate_lease_reclaim(st, 99.9, now)
        assert reclaim is True
        assert reason == "LEASE_EXPIRED"

        # Boundary: lease_until == now -> NOT expired
        reclaim, reason = evaluate_lease_reclaim(st, 100.0, now)
        assert reclaim is False
        assert reason == "LEASE_ACTIVE"

        # Active: lease_until > now
        reclaim, reason = evaluate_lease_reclaim(st, 100.1, now)
        assert reclaim is False
        assert reason == "LEASE_ACTIVE"

        # None lease
        reclaim, reason = evaluate_lease_reclaim(st, None, now)
        assert reclaim is False
        assert reason == "LEASE_ACTIVE"

    # Inactive states should never be reclaimed
    inactive_states = ["pending", "completed", "failed", "quarantined", "paused"]
    for st in inactive_states:
        reclaim, reason = evaluate_lease_reclaim(st, 50.0, now)
        assert reclaim is False
        assert reason == "LEASE_ACTIVE"

class MockQueueManager:
    def __init__(self):
        self.halted = False
        self.halt_worker = None
        self.halt_reason = None
        self.paused = False
        self.pause_worker = None
        self.pause_reason = None

    def halt_for_bot_detection(self, worker_id, reason):
        self.halted = True
        self.halt_worker = worker_id
        self.halt_reason = reason

    def pause_for_unauthenticated_session(self, worker_id, job_id, message):
        self.paused = True
        self.pause_worker = worker_id
        self.pause_reason = message

def test_detect_security_challenge_and_halt():
    # 1. 401 Unauthorized
    qm = MockQueueManager()
    triggered, reason = detect_security_challenge_and_halt("any content", 401, qm, "w1")
    assert triggered is True
    assert reason == "AUTH_PAUSE_TRIGGERED"
    assert qm.paused is True
    assert qm.pause_worker == "w1"
    assert qm.pause_reason == "HTTP 401 Unauthorized / Cookies expired"

    # 401 without queue manager
    triggered, reason = detect_security_challenge_and_halt("any content", 401, None, "w1")
    assert triggered is True
    assert reason == "AUTH_PAUSE_TRIGGERED"

    # 2. Cloudflare Turnstile patterns
    cf_patterns = [
        '<div id="challenge-stage">box</div>',
        '<span class="ctp-checkbox">check</span>',
        '<html><title>Just a moment...</title></html>'
    ]
    for pattern in cf_patterns:
        qm = MockQueueManager()
        triggered, reason = detect_security_challenge_and_halt(pattern, 200, qm, "w2")
        assert triggered is True
        assert reason == "Cloudflare Turnstile security challenge detected on page"
        assert qm.halted is True
        assert qm.halt_worker == "w2"
        assert qm.halt_reason == "Cloudflare Turnstile security challenge detected on page"

    # 3. Google Flow warning patterns
    flow_patterns = [
        '<p>We detected unusual activity from your computer network</p>',
        '<div class="bot-warning-banner">Warning</div>'
    ]
    for pattern in flow_patterns:
        qm = MockQueueManager()
        triggered, reason = detect_security_challenge_and_halt(pattern, 200, qm, "w3")
        assert triggered is True
        assert reason == "Google Flow automated traffic warning detected on page"
        assert qm.halted is True
        assert qm.halt_worker == "w3"
        assert qm.halt_reason == "Google Flow automated traffic warning detected on page"

    # 4. Clean content
    qm = MockQueueManager()
    triggered, reason = detect_security_challenge_and_halt("<html><body>Normal flow page</body></html>", 200, qm, "w4")
    assert triggered is False
    assert reason == "CLEAN"
    assert qm.halted is False
    assert qm.paused is False

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
    ok, msg, meta = validate_mp4_box_structure("/nonexistent/file.mp4")
    assert ok is False
    assert msg == "File /nonexistent/file.mp4 does not exist"
    assert meta == {}

def test_validate_mp4_too_small(tmp_path):
    f = tmp_path / "small.mp4"
    f.write_bytes(b"ftyp" * 10)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert msg == "File size too small (40 bytes < 100KB minimum threshold)"
    assert meta == {}

def test_validate_mp4_content_length_mismatch(tmp_path):
    f = tmp_path / "valid.mp4"
    data = _make_mp4_bytes()
    f.write_bytes(data)
    expected_len = len(data) + 100
    ok, msg, meta = validate_mp4_box_structure(str(f), expected_content_length=expected_len)
    assert ok is False
    assert msg == f"Content-Length mismatch: expected {expected_len} bytes, got {len(data)} bytes"
    assert meta["expected"] == expected_len
    assert meta["actual"] == len(data)
    assert "expected" in meta
    assert "actual" in meta

def test_validate_mp4_valid(tmp_path):
    f = tmp_path / "valid.mp4"
    data = _make_mp4_bytes()
    f.write_bytes(data)
    ok, msg, meta = validate_mp4_box_structure(str(f), expected_content_length=len(data))
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"
    assert meta["boxes"] == ["ftyp", "mdat", "moov"]
    assert meta["file_size"] == len(data)
    assert meta["moov_size"] > 0
    assert "boxes" in meta
    assert "file_size" in meta
    assert "moov_size" in meta

def test_validate_mp4_missing_ftyp(tmp_path):
    f = tmp_path / "no_ftyp.mp4"
    data = _make_mp4_bytes(include_ftyp=False)
    f.write_bytes(data)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert msg == "Invalid MP4: missing 'ftyp' box"
    assert meta["boxes"] == ["mdat", "moov"]
    assert "boxes" in meta

def test_validate_mp4_missing_moov(tmp_path):
    f = tmp_path / "no_moov.mp4"
    data = _make_mp4_bytes(include_moov=False)
    f.write_bytes(data)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert msg == "Incomplete or truncated MP4: missing 'moov' atom (video cannot be decoded or played)"
    assert meta["boxes"] == ["ftyp", "mdat"]
    assert meta["file_size"] == len(data)
    assert "boxes" in meta
    assert "file_size" in meta

def test_validate_mp4_truncated_box(tmp_path):
    f = tmp_path / "truncated.mp4"
    data = _make_mp4_bytes(truncate_box=True)
    f.write_bytes(data)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "Truncated MP4 box: 'mdat' box claims 550000 bytes at 28 (exceeds file size 110060)" == msg
    assert meta == {}

def test_validate_mp4_invalid_box_size(tmp_path):
    f = tmp_path / "bad_size.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # Header with invalid size 3 (< 8)
    bad_box = struct.pack(">I4s", 3, b"junk") + b"\x00" * 120000
    f.write_bytes(ftyp + bad_box)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "Corrupted MP4: invalid box size 3 for 'junk'" in msg
    assert meta == {}

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
    assert meta["boxes"] == ["ftyp", "mdat", "moov"]

def test_validate_mp4_size_boundary(tmp_path):
    f_under = tmp_path / "under.mp4"
    f_under.write_bytes(b"a" * 99999)
    ok1, msg1, meta1 = validate_mp4_box_structure(str(f_under))
    assert ok1 is False
    assert msg1 == "File size too small (99999 bytes < 100KB minimum threshold)"
    assert meta1 == {}

    # Exactly 100,000 bytes with invalid box structure should pass the size check and fail on box parsing
    f_exact = tmp_path / "exact.mp4"
    f_exact.write_bytes(b"a" * 100000)
    ok2, msg2, meta2 = validate_mp4_box_structure(str(f_exact))
    assert ok2 is False
    assert "too small" not in msg2
    assert "Truncated" in msg2 or "Corrupted" in msg2 or "ftyp" in msg2

def test_validate_mp4_expected_content_length_zero(tmp_path):
    f = tmp_path / "valid.mp4"
    data = _make_mp4_bytes()
    f.write_bytes(data)
    # expected_content_length = 0 should be treated as unset
    ok, msg, meta = validate_mp4_box_structure(str(f), expected_content_length=0)
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"

def test_validate_mp4_64bit_box_truncated_header(tmp_path):
    f = tmp_path / "trunc_64.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # size 1 indicates 64-bit size, but provide only 4 bytes of 64-bit size and NO trailing bytes so file ends
    broken_box = struct.pack(">I4s", 1, b"mdat") + b"\x00" * 4
    # Pad before broken_box so file exceeds 100KB threshold
    padding = b"\x00" * 105000
    free_box = struct.pack(">I4s", len(padding) + 8, b"free") + padding
    f.write_bytes(ftyp + free_box + broken_box)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "Corrupted MP4: truncated 64-bit box header for 'mdat'" in msg
    assert meta == {}

def test_validate_mp4_64bit_box_size_too_small(tmp_path):
    f = tmp_path / "small_64.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # 64-bit header with size < 16 (e.g. 15)
    broken_box = struct.pack(">I4sQ", 1, b"mdat", 15) + b"\x00" * 110000
    f.write_bytes(ftyp + broken_box)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "invalid 64-bit box size 15 for 'mdat'" in msg
    assert meta == {}

def test_validate_mp4_64bit_box_claims_past_eof(tmp_path):
    f = tmp_path / "past_eof_64.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # 64-bit header claims 500,000 bytes but file is 110,000 bytes
    broken_box = struct.pack(">I4sQ", 1, b"mdat", 500000) + b"\x00" * 110000
    f.write_bytes(ftyp + broken_box)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "Truncated MP4 box: 'mdat' box claims 500000 bytes" in msg
    assert meta == {}

def test_validate_mp4_box_extends_to_eof(tmp_path):
    f = tmp_path / "eof_box.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    moov_payload = struct.pack(">I4s", 16, b"mvhd") + b"\x00" * 8
    moov = struct.pack(">I4s", len(moov_payload) + 8, b"moov") + moov_payload
    # Box with size 0 extends to EOF
    eof_box = struct.pack(">I4s", 0, b"free") + b"\x00" * 110000
    f.write_bytes(ftyp + moov + eof_box)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"
    assert "free" in meta["boxes"]

def test_validate_mp4_parsing_exception(monkeypatch):
    # Trigger exception inside open() during box parsing
    import builtins
    real_open = builtins.open
    def bad_open(fname, *args, **kwargs):
        if "bad_open_test" in str(fname) and "rb" in args:
            raise PermissionError("Access denied by mock")
        return real_open(fname, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", bad_open)
    with tempfile.NamedTemporaryFile(suffix=".mp4", prefix="bad_open_test_") as tf:
        tf.write(b"x" * 105000)
        tf.flush()
        ok, msg, meta = validate_mp4_box_structure(tf.name)
        assert ok is False
        assert "Exception while parsing MP4 box structure: Access denied by mock" == msg
        assert meta == {}

def test_evaluate_worker_quarantine_fractional_remaining():
    # Test remaining between 0.0 and 1.0 (e.g. 0.5s) to kill remaining > 1.0 mutant
    is_q, rem = evaluate_worker_quarantine("quarantined", 100.5, 100.0)
    assert is_q is True
    assert rem == 0.5

def test_check_preflight_resources_ram_exact_boundary(monkeypatch):
    import io, shutil
    monkeypatch.setattr(shutil, "disk_usage", lambda path: (10**9, 10**8, 10**9))
    # Exactly 200 MB available with min_ram_free_mb=200 -> should PASS (ok is True)
    mem_exact = "MemTotal:       16000000 kB\nMemAvailable:     204800 kB\n"
    monkeypatch.setattr("builtins.open", lambda fname, *args, **kwargs: io.StringIO(mem_exact) if "meminfo" in str(fname) else open(fname, *args, **kwargs))
    ok, msg = check_preflight_resources("/tmp", min_disk_free_bytes=1000, min_ram_free_mb=200)
    assert ok is True
    assert msg == "OK"

def test_validate_mp4_box_size_exact_8_and_16(tmp_path):
    f = tmp_path / "exact_sizes.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # Box with size exactly 8 (just header, 0 payload bytes)
    free_8 = struct.pack(">I4s", 8, b"free")
    # 64-bit box with size exactly 16 (just 16-byte header, 0 payload bytes)
    free_16 = struct.pack(">I4sQ", 1, b"free", 16)
    # moov box
    moov_payload = struct.pack(">I4s", 16, b"mvhd") + b"\x00" * 8
    moov = struct.pack(">I4s", len(moov_payload) + 8, b"moov") + moov_payload
    # Padding box to exceed 100KB
    padding = b"\x00" * 110000
    mdat = struct.pack(">I4s", len(padding) + 8, b"mdat") + padding
    f.write_bytes(ftyp + free_8 + free_16 + moov + mdat)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"
    assert "free" in meta["boxes"]

def test_validate_mp4_unexpected_eof_before_moov(tmp_path):
    f = tmp_path / "eof_before_moov.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    padding = b"\x00" * 105000
    mdat = struct.pack(">I4s", len(padding) + 8, b"mdat") + padding
    # Truncated trailing header: 4 bytes instead of 8 bytes, without having encountered moov
    truncated_tail = b"\x00\x00\x00\x20"
    f.write_bytes(ftyp + mdat + truncated_tail)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "unexpected EOF before finding 'moov' atom" in msg
    assert meta == {}

def test_check_preflight_resources_meminfo_failure_fails_closed(monkeypatch):
    import builtins
    real_open = builtins.open
    def broken_meminfo(fname, *args, **kwargs):
        if "meminfo" in str(fname):
            raise FileNotFoundError("Mock /proc/meminfo missing")
        return real_open(fname, *args, **kwargs)

    monkeypatch.setattr(builtins, "open", broken_meminfo)
    ok, msg = check_preflight_resources("/tmp", min_disk_free_bytes=1000, min_ram_free_mb=200)
    assert ok is False
    assert "Could not determine available RAM: Mock /proc/meminfo missing" == msg

def test_validate_mp4_box_size_over_2gb(tmp_path):
    f = tmp_path / "large_32bit.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    # 32-bit unsigned size exceeding 2GB: 2,500,000,000 (0x9502F900)
    large_box = struct.pack(">I4s", 2500000000, b"mdat") + b"\x00" * 105000
    f.write_bytes(ftyp + large_box)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is False
    assert "claims 2500000000 bytes" in msg
    assert "invalid box size" not in msg

def test_validate_mp4_64bit_box_exact_eof_boundary(tmp_path):
    f = tmp_path / "exact_64bit_eof.mp4"
    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    moov_payload = struct.pack(">I4s", 16, b"mvhd") + b"\x00" * 8
    moov = struct.pack(">I4s", len(moov_payload) + 8, b"moov") + moov_payload
    # 64-bit box where pos + size exactly equals total file size
    payload = b"\x00" * 110000
    header_64 = struct.pack(">I4sQ", 1, b"mdat", len(payload) + 16) + payload
    f.write_bytes(ftyp + moov + header_64)
    ok, msg, meta = validate_mp4_box_structure(str(f))
    assert ok is True
    assert msg == "VALID_MP4_STRUCTURE"

def test_flow_queue_claim_and_reclaim(tmp_path):
    import time
    db_path = str(tmp_path / "queue_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="test_worker_1", lease_duration_sec=0.2)
    job, created = mgr.enqueue_job("Prompt 1", idea_id=1, prompt_id=1)
    assert created is True
    assert job["id"] == 1
    assert job["status"] == "pending"

    claimed = mgr.claim_next_job()
    assert claimed is not None
    assert claimed["id"] == 1
    assert claimed["status"] == "claimed"
    assert claimed["worker_id"] == "test_worker_1"

    # Active lease cannot be claimed by another worker
    mgr2 = FlowQueueManager(db_path=db_path, worker_id="test_worker_2", lease_duration_sec=0.2)
    claimed2 = mgr2.claim_next_job()
    assert claimed2 is None

    # Wait for lease expiration
    time.sleep(0.3)
    reclaimed_count = mgr.reclaim_orphaned_jobs()
    assert reclaimed_count == 1

    with mgr.get_connection() as conn:
        row = conn.execute("SELECT status, worker_id FROM flow_video_jobs WHERE id = 1").fetchone()
        assert row["status"] == "pending"
        assert row["worker_id"] is None

def test_flow_queue_circuit_breaker(tmp_path):
    import time
    db_path = str(tmp_path / "cb_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="cb_worker")
    with mgr.get_connection() as conn:
        conn.execute("UPDATE flow_circuit_breaker SET cooldown_sec = 0.2 WHERE id = 1")

    ok, state = mgr.check_circuit_breaker()
    assert ok is True
    assert state == "CLOSED"

    # Record failure 1 & 2
    mgr.record_circuit_failure()
    mgr.record_circuit_failure()
    ok, state = mgr.check_circuit_breaker()
    assert ok is True

    # Record failure 3 -> trips to OPEN
    mgr.record_circuit_failure()
    ok, msg = mgr.check_circuit_breaker()
    assert ok is False
    assert "OPEN" in msg

    # Cooldown
    time.sleep(0.25)
    ok, state = mgr.check_circuit_breaker()
    assert ok is True
    assert state == "HALF_OPEN"

    # Success resets to CLOSED
    mgr.record_circuit_success()
    ok, state = mgr.check_circuit_breaker()
    assert ok is True
    assert state == "CLOSED"

def test_flow_queue_bot_halt_and_resume(tmp_path):
    db_path = str(tmp_path / "halt_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="halt_worker")

    # Trigger halt
    mgr.halt_for_bot_detection("halt_worker", "Turnstile challenge detected")
    with mgr.get_connection() as conn:
        lock = conn.execute("SELECT lock_name, locked_by FROM flow_cluster_locks WHERE lock_name = 'BOT_DETECT_HALT'").fetchone()
        assert lock is not None
        assert lock["locked_by"] == "halt_worker"
        cb = conn.execute("SELECT state FROM flow_circuit_breaker WHERE id = 1").fetchone()
        assert cb["state"] == "OPEN"

    # Resume with valid token
    resumed = mgr.resume_from_bot_halt("admin_verified_unhalt_token")
    assert resumed is True
    with mgr.get_connection() as conn:
        lock_after = conn.execute("SELECT lock_name FROM flow_cluster_locks WHERE lock_name = 'BOT_DETECT_HALT'").fetchone()
        assert lock_after is None
        cb_after = conn.execute("SELECT state FROM flow_circuit_breaker WHERE id = 1").fetchone()
        assert cb_after["state"] == "CLOSED"

def test_check_preflight_resources_cgroup_v2_sufficient_ram(tmp_path):
    cgroup_dir = tmp_path / "cgroup"
    cgroup_dir.mkdir()
    max_file = cgroup_dir / "memory.max"
    cur_file = cgroup_dir / "memory.current"
    # 2GB limit, 500MB used -> ~1500MB available (> 200MB threshold)
    max_file.write_text("2147483648\n")
    cur_file.write_text("524288000\n")

    ok, msg = check_preflight_resources(
        str(tmp_path),
        min_disk_free_bytes=1000,
        min_ram_free_mb=200,
        cgroup_memory_max_path=str(max_file),
        cgroup_memory_current_path=str(cur_file)
    )
    assert ok is True
    assert msg == "OK"

def test_check_preflight_resources_cgroup_v2_insufficient_ram(tmp_path):
    cgroup_dir = tmp_path / "cgroup"
    cgroup_dir.mkdir()
    max_file = cgroup_dir / "memory.max"
    cur_file = cgroup_dir / "memory.current"
    # 1GB limit, 950MB used -> ~50MB available (< 200MB threshold)
    max_file.write_text("1073741824\n")
    cur_file.write_text("996147200\n")

    ok, msg = check_preflight_resources(
        str(tmp_path),
        min_disk_free_bytes=1000,
        min_ram_free_mb=200,
        cgroup_memory_max_path=str(max_file),
        cgroup_memory_current_path=str(cur_file)
    )
    assert ok is False
    assert "Insufficient available cgroup memory" in msg

def test_check_preflight_resources_cgroup_v2_unlimited_falls_back_to_meminfo(tmp_path):
    cgroup_dir = tmp_path / "cgroup"
    cgroup_dir.mkdir()
    max_file = cgroup_dir / "memory.max"
    cur_file = cgroup_dir / "memory.current"
    max_file.write_text("max\n")
    cur_file.write_text("1000000\n")

    ok, msg = check_preflight_resources(
        str(tmp_path),
        min_disk_free_bytes=1000,
        min_ram_free_mb=10,
        cgroup_memory_max_path=str(max_file),
        cgroup_memory_current_path=str(cur_file)
    )
    assert ok is True
    assert msg == "OK"

def test_check_preflight_resources_cgroup_v2_missing_current_fails_closed(tmp_path):
    cgroup_dir = tmp_path / "cgroup"
    cgroup_dir.mkdir()
    max_file = cgroup_dir / "memory.max"
    cur_file = cgroup_dir / "memory.current" # Not created
    max_file.write_text("2147483648\n")

    ok, msg = check_preflight_resources(
        str(tmp_path),
        min_disk_free_bytes=1000,
        min_ram_free_mb=200,
        cgroup_memory_max_path=str(max_file),
        cgroup_memory_current_path=str(cur_file)
    )
    assert ok is False
    assert "memory.current missing" in msg

def test_check_preflight_resources_cgroup_v2_corrupted_int_fails_closed(tmp_path):
    cgroup_dir = tmp_path / "cgroup"
    cgroup_dir.mkdir()
    max_file = cgroup_dir / "memory.max"
    cur_file = cgroup_dir / "memory.current"
    max_file.write_text("not_a_valid_number\n")
    cur_file.write_text("500000\n")

    ok, msg = check_preflight_resources(
        str(tmp_path),
        min_disk_free_bytes=1000,
        min_ram_free_mb=200,
        cgroup_memory_max_path=str(max_file),
        cgroup_memory_current_path=str(cur_file)
    )
    assert ok is False
    assert "Could not determine cgroup memory" in msg

def test_flow_queue_state_transitions(tmp_path):
    db_path = str(tmp_path / "trans_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="w_trans")
    job, _ = mgr.enqueue_job("State transition prompt", idea_id=10, prompt_id=20)
    job_id = job["id"]

    # Illegal transition: pending -> completed
    assert mgr.transition_state(job_id, JobState.COMPLETED) is False

    # Valid transitions: pending -> claimed -> submitting -> generating -> downloading -> verifying -> completed
    claimed = mgr.claim_next_job()
    assert claimed["id"] == job_id
    assert mgr.transition_state(job_id, JobState.SUBMITTING) is True
    assert mgr.transition_state(job_id, JobState.GENERATING, extra_fields={"video_url": "https://flow.google.com/v/1"}) is True
    assert mgr.transition_state(job_id, JobState.DOWNLOADING) is True
    assert mgr.transition_state(job_id, JobState.VERIFYING) is True
    assert mgr.transition_state(job_id, JobState.COMPLETED) is True

    # Transition non-existent job
    assert mgr.transition_state(99999, JobState.FAILED) is False

def test_flow_queue_fail_job_retry_and_exhaustion(tmp_path):
    db_path = str(tmp_path / "fail_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="w_fail", max_attempts=2)
    job, _ = mgr.enqueue_job("Retry prompt", idea_id=1, prompt_id=1)
    job_id = job["id"]

    # Claim job (attempt 1)
    claimed = mgr.claim_next_job()
    assert claimed["attempt_count"] == 1

    # Attempt 1 failure -> retry backoff -> reset to pending
    st1 = mgr.fail_job(job_id, "NETWORK_ERR", "Transient drop")
    assert st1 == "pending"
    with mgr.get_connection() as conn:
        row1 = conn.execute("SELECT status, attempt_count, lease_until FROM flow_video_jobs WHERE id = ?", (job_id,)).fetchone()
        assert row1["status"] == "pending"
        assert row1["lease_until"] > time.time()
        # Reset lease_until for immediate re-claim in test
        conn.execute("UPDATE flow_video_jobs SET lease_until = 0 WHERE id = ?", (job_id,))

    # Claim job (attempt 2)
    claimed2 = mgr.claim_next_job()
    assert claimed2["attempt_count"] == 2

    # Attempt 2 failure -> budget exhausted -> mark failed
    st2 = mgr.fail_job(job_id, "PERMANENT_ERR", "Exceeded max attempts")
    assert st2 == "failed"
    with mgr.get_connection() as conn:
        row2 = conn.execute("SELECT status, error_category FROM flow_video_jobs WHERE id = ?", (job_id,)).fetchone()
        assert row2["status"] == "failed"
        assert row2["error_category"] == "RETRY_BUDGET_EXHAUSTED"

    # Fail non-existent job
    assert mgr.fail_job(88888, "ERR", "None") == "failed"

def test_flow_queue_heartbeat(tmp_path):
    db_path = str(tmp_path / "hb_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="w_hb")
    job, _ = mgr.enqueue_job("HB prompt")
    job_id = job["id"]

    # Heartbeat before claim returns False
    assert mgr.send_heartbeat(job_id) is False

    mgr.claim_next_job()
    assert mgr.send_heartbeat(job_id) is True

    with mgr.get_connection() as conn:
        row = conn.execute("SELECT lease_until FROM flow_video_jobs WHERE id = ?", (job_id,)).fetchone()
        assert row["lease_until"] > time.time()

def test_flow_queue_worker_quarantine_and_recovery(tmp_path):
    db_path = str(tmp_path / "q_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="w_q")

    # Record 2 failures -> worker still active
    mgr.record_worker_failure()
    mgr.record_worker_failure()
    is_q, _ = mgr.is_worker_quarantined()
    assert is_q is False

    # 3rd failure -> quarantined
    mgr.record_worker_failure()
    is_q2, rem = mgr.is_worker_quarantined()
    assert is_q2 is True
    assert rem > 0

    # Worker success resets status
    mgr.record_worker_success()
    is_q3, _ = mgr.is_worker_quarantined()
    assert is_q3 is False

def test_flow_queue_enforce_rate_control(tmp_path):
    db_path = str(tmp_path / "rate_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="w_rate", min_submission_interval_sec=5.0)

    # First call permits submission
    ok1, wait1 = mgr.enforce_rate_control()
    assert ok1 is True
    assert wait1 == 0.0

    # Immediate second call throttles
    ok2, wait2 = mgr.enforce_rate_control()
    assert ok2 is False
    assert wait2 > 0.0

def test_flow_queue_auth_pause_and_resume(tmp_path):
    db_path = str(tmp_path / "auth_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="w_auth")

    # Pause worker due to auth error
    mgr.pause_for_unauthenticated_session("w_auth", job_id=5, message="Missing auth cookie")
    with mgr.get_connection() as conn:
        reg = conn.execute("SELECT status FROM flow_worker_registry WHERE worker_id = 'w_auth'").fetchone()
        assert reg["status"] == "paused_auth_required"
        alert = conn.execute("SELECT alert_type, message FROM flow_system_alerts WHERE worker_id = 'w_auth'").fetchone()
        assert alert["alert_type"] == "SESSION_UNAUTHENTICATED"
        assert "auth cookie" in alert["message"]

    # Resume worker after auth restored
    assert mgr.resume_after_auth_restoration("w_auth") is True
    with mgr.get_connection() as conn:
        reg_after = conn.execute("SELECT status FROM flow_worker_registry WHERE worker_id = 'w_auth'").fetchone()
        assert reg_after["status"] == "active"

def test_flow_queue_verify_and_commit_video(tmp_path):
    db_path = str(tmp_path / "commit_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="w_commit")
    job, _ = mgr.enqueue_job("Video commit prompt", idea_id=42, prompt_id=99)
    job_id = job["id"]
    mgr.claim_next_job()
    mgr.transition_state(job_id, JobState.SUBMITTING)
    mgr.transition_state(job_id, JobState.GENERATING)
    mgr.transition_state(job_id, JobState.DOWNLOADING)
    mgr.transition_state(job_id, JobState.VERIFYING)

    # Create valid synthetic MP4 file
    temp_dir = tmp_path / "temp"
    temp_dir.mkdir()
    temp_file = temp_dir / "downloaded.mp4"

    ftyp_payload = b"isom\x00\x00\x02\x00isomiso2mp41"
    ftyp = struct.pack(">I4s", len(ftyp_payload) + 8, b"ftyp") + ftyp_payload
    moov_payload = struct.pack(">I4s", 16, b"mvhd") + b"\x00" * 8
    moov = struct.pack(">I4s", len(moov_payload) + 8, b"moov") + moov_payload
    mdat_payload = b"\x00" * 110000
    mdat = struct.pack(">I4s", len(mdat_payload) + 8, b"mdat") + mdat_payload
    temp_file.write_bytes(ftyp + moov + mdat)

    final_dir = tmp_path / "final"
    final_path = str(final_dir / "output.mp4")

    # Commit video
    ok, msg, meta = mgr.verify_and_commit_video(
        job_id=job_id,
        temp_file_path=str(temp_file),
        final_file_path=final_path,
        video_url="https://flow.google.com/video/42",
        stability_check_sec=0.0
    )
    assert ok is True
    assert msg == "SUCCESS"
    assert meta["job_id"] == job_id

    # Verify DB records
    with mgr.get_connection() as conn:
        job_row = conn.execute("SELECT status, video_url, file_sha256 FROM flow_video_jobs WHERE id = ?", (job_id,)).fetchone()
        assert job_row["status"] == "completed"
        assert job_row["video_url"] == "https://flow.google.com/video/42"
        assert len(job_row["file_sha256"]) == 64

        vid_row = conn.execute("SELECT idea_id, generation_job_id, format, status FROM generated_videos WHERE generation_job_id = ?", (job_id,)).fetchone()
        assert vid_row is not None
        assert vid_row["idea_id"] == 42
        assert vid_row["format"] == "mp4"
        assert vid_row["status"] == "ready"

def test_flow_queue_check_preflight_resources(tmp_path):
    db_path = str(tmp_path / "preflight_test.db")
    mgr = FlowQueueManager(db_path=db_path, worker_id="preflight_worker", min_disk_free_bytes=1000, min_ram_free_mb=10)
    
    # Passing preflight
    ok, msg = mgr.check_preflight_resources(str(tmp_path))
    assert ok is True
    assert msg == "OK"

    # Failing preflight on disk
    with patch("flow_queue_manager.guard_check_preflight", return_value=(False, "Insufficient disk space in /tmp")):
        ok_fail, msg_fail = mgr.check_preflight_resources(str(tmp_path))
        assert ok_fail is False
        assert "disk space" in msg_fail
        with mgr.get_connection() as conn:
            row = conn.execute("SELECT event_type, details FROM flow_audit_events WHERE event_type = 'RESOURCE_CHECK_FAILED' ORDER BY id DESC LIMIT 1").fetchone()
            assert row is not None
            assert "disk_space" in row["details"]

    # Failing preflight on RAM
    with patch("flow_queue_manager.guard_check_preflight", return_value=(False, "Insufficient available RAM")):
        ok_ram_fail, msg_ram_fail = mgr.check_preflight_resources(str(tmp_path))
        assert ok_ram_fail is False
        with mgr.get_connection() as conn:
            row = conn.execute("SELECT event_type, details FROM flow_audit_events WHERE event_type = 'RESOURCE_CHECK_FAILED' ORDER BY id DESC LIMIT 1").fetchone()
            assert row is not None
            assert "ram_exhaustion" in row["details"]



