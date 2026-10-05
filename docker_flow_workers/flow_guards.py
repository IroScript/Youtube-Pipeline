"""
Independent Hardened Pipeline Guards Module
===========================================
Defines the authoritative guard evaluations for:
1. ISO/IEC 14496-12 MP4 Box & Atom Structural Validation
2. Disk & RAM Preflight Resource Sanity Checking
3. Circuit Breaker Tripping & Half-Open Cooldown Logic
4. Worker Quarantine Status & Cooldown Logic
"""

import os
import struct
from typing import Tuple, Dict, Any, Optional, List

def format_bytes_human(num_bytes: int) -> str:
    """Accurately formats byte counts into human-readable units."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    elif num_bytes < 1024 * 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{num_bytes / (1024 * 1024 * 1024):.2f} GB"

def check_preflight_resources(
    download_dir: str,
    min_disk_free_bytes: int = 1024 * 1024 * 1024, # 1 GB default
    min_ram_free_mb: int = 200
) -> Tuple[bool, str]:
    """Validates RAM and disk space before claiming or processing a job."""
    import shutil

    # 1. Disk space check
    try:
        total, used, free = shutil.disk_usage(download_dir)
        if free < min_disk_free_bytes:
            free_str = format_bytes_human(free)
            req_str = format_bytes_human(min_disk_free_bytes)
            return False, f"Insufficient disk space in {download_dir}: {free_str} free (required: {req_str})"
    except Exception as e:
        return False, f"Could not determine disk usage: {e}"

    # 2. RAM check
    if min_ram_free_mb > 0:
        try:
            mem_avail_kb = 0
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemAvailable:"):
                        mem_avail_kb = int(line.split()[1])
                        break
            mem_avail_mb = mem_avail_kb / 1024
            if mem_avail_mb < min_ram_free_mb:
                return False, f"Insufficient available RAM: {mem_avail_mb:.1f} MB available (required: {min_ram_free_mb} MB)"
        except Exception as e:
            return False, f"Could not determine available RAM: {e}"

    return True, "OK"

def evaluate_circuit_breaker(
    state: str,
    tripped_at: float,
    cooldown_sec: float,
    now: float
) -> Tuple[bool, str]:
    """
    Evaluates whether the circuit breaker permits operations.
    Returns: (is_permitted, current_or_next_state)
    """
    if state != "OPEN":
        return True, state

    elapsed = now - tripped_at
    if elapsed > cooldown_sec:
        return True, "HALF_OPEN"
    
    remaining = int(cooldown_sec - elapsed)
    return False, f"Circuit breaker OPEN. Cool down remaining: {remaining}s"

def evaluate_worker_quarantine(
    status: str,
    quarantine_until: float,
    now: float
) -> Tuple[bool, float]:
    """
    Evaluates whether worker quarantine is currently active.
    Returns: (is_quarantined, remaining_seconds)
    """
    if status != "quarantined":
        return False, 0.0

    remaining = quarantine_until - now
    if remaining > 0.0:
        return True, remaining
    return False, 0.0

def validate_mp4_box_structure(
    file_path: str,
    expected_content_length: Optional[int] = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates ISO/IEC 14496-12 MP4 Box structure:
    - Confirms Content-Length matches expected_content_length (if provided)
    - Confirms ftyp box is present at root
    - Confirms moov box (movie metadata atom) is present and structurally intact
    - Detects truncated downloads where box headers exceed file boundaries
    """
    if not os.path.exists(file_path):
        return False, f"File {file_path} does not exist", {}

    file_size = os.path.getsize(file_path)
    if file_size < 100000:
        return False, f"File size too small ({file_size} bytes < 100KB minimum threshold)", {}

    if expected_content_length is not None and expected_content_length > 0:
        if file_size != expected_content_length:
            return False, f"Content-Length mismatch: expected {expected_content_length} bytes, got {file_size} bytes", {
                "expected": expected_content_length,
                "actual": file_size
            }

    boxes: List[Tuple[str, int, int]] = []
    has_ftyp = False
    has_moov = False
    moov_size = 0

    try:
        with open(file_path, "rb") as f:
            pos = 0
            while pos < file_size:
                header = f.read(8)
                if len(header) < 8:
                    if not has_moov:
                        return False, f"Corrupted or truncated MP4: unexpected EOF before finding 'moov' atom at offset {pos}", {}
                    break

                size, btype = struct.unpack(">I4s", header)
                btype_str = btype.decode("latin-1", errors="replace")
                boxes.append((btype_str, size, pos))

                if btype_str == "ftyp":
                    has_ftyp = True
                elif btype_str == "moov":
                    has_moov = True
                    moov_size = size

                if size == 1:
                    # 64-bit extended box size
                    ext_header = f.read(8)
                    if len(ext_header) < 8:
                        return False, f"Corrupted MP4: truncated 64-bit box header for '{btype_str}' at {pos}", {}
                    size = struct.unpack(">Q", ext_header)[0]
                    if size < 16:
                        return False, f"Corrupted MP4: invalid 64-bit box size {size} for '{btype_str}' at {pos}", {}
                    if pos + size > file_size:
                        return False, f"Truncated MP4 box: '{btype_str}' box claims {size} bytes but file ends at {file_size}", {}
                    pos += size
                    f.seek(pos)
                elif size == 0:
                    # Box extends to EOF
                    pos = file_size
                    break
                else:
                    if size < 8:
                        return False, f"Corrupted MP4: invalid box size {size} for '{btype_str}' at {pos}", {}
                    if pos + size > file_size:
                        return False, f"Truncated MP4 box: '{btype_str}' box claims {size} bytes at {pos} (exceeds file size {file_size})", {}
                    pos += size
                    f.seek(pos)

    except Exception as e:
        return False, f"Exception while parsing MP4 box structure: {e}", {}

    if not has_ftyp:
        return False, "Invalid MP4: missing 'ftyp' box", {"boxes": [b[0] for b in boxes]}

    if not has_moov:
        return False, "Incomplete or truncated MP4: missing 'moov' atom (video cannot be decoded or played)", {
            "boxes": [b[0] for b in boxes],
            "file_size": file_size
        }

    return True, "VALID_MP4_STRUCTURE", {
        "boxes": [b[0] for b in boxes],
        "file_size": file_size,
        "moov_size": moov_size
    }

def detect_security_challenge_and_halt(
    html_content: str,
    status_code: int,
    queue_mgr: Any,
    worker_id: str
) -> Tuple[bool, str]:
    """
    Evaluates response content and headers. Triggers queue manager halts autonomously
    if Cloudflare Turnstile, Google Flow bot warning, or HTTP 401 unauthenticated session is detected.
    """
    if status_code == 401:
        if queue_mgr:
            queue_mgr.pause_for_unauthenticated_session(worker_id=worker_id, job_id=None, message="HTTP 401 Unauthorized / Cookies expired")
        return True, "AUTH_PAUSE_TRIGGERED"

    lower = html_content.lower()
    if "challenge-stage" in html_content or "ctp-checkbox" in html_content or "just a moment..." in lower:
        reason = "Cloudflare Turnstile security challenge detected on page"
        if queue_mgr:
            queue_mgr.halt_for_bot_detection(worker_id=worker_id, reason=reason)
        return True, reason

    if "unusual activity" in lower or "bot-warning-banner" in html_content:
        reason = "Google Flow automated traffic warning detected on page"
        if queue_mgr:
            queue_mgr.halt_for_bot_detection(worker_id=worker_id, reason=reason)
        return True, reason

    return False, "CLEAN"

def evaluate_lease_reclaim(status: str, lease_until: Optional[float], now: float) -> Tuple[bool, str]:
    """
    Evaluates whether a claimed job lease has expired and must be reclaimed.
    Boundary rule: lease_until < now triggers reclaim.
    """
    if status in ("claimed", "submitting", "generating", "downloading", "verifying"):
        if lease_until is not None and lease_until < now:
            return True, "LEASE_EXPIRED"
    return False, "LEASE_ACTIVE"

