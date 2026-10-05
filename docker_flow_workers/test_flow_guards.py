import os
import shutil
import struct
import tempfile
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
