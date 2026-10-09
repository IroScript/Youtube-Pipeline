"""
CloakBrowser Worker 25-Settings Matrix Configuration
===================================================
Enforces all 25 distinct configuration settings across 10 workers:
- 5 Prompt/SEO Workers (W1 to W5)
- 5 Google Veo Flow Workers (W1 to W5)
"""

import os
from typing import Dict, Any

# Base proxy configurations (can be overridden via environment variables or proxy.txt)
DEFAULT_PROXIES = {
    "worker_1": os.environ.get("PROXY_WORKER_1", ""),
    "worker_2": os.environ.get("PROXY_WORKER_2", ""),
    "worker_3": os.environ.get("PROXY_WORKER_3", ""),
    "worker_4": os.environ.get("PROXY_WORKER_4", ""),
    "worker_5": os.environ.get("PROXY_WORKER_5", ""),
}

# The 25 Settings Matrix per worker
WORKER_SETTINGS_MATRIX: Dict[str, Dict[str, Any]] = {
    "worker_1": {
        "id": 1,
        "name": "Worker-1",
        # 1-3: IP & Proxy & Auth
        "proxy": DEFAULT_PROXIES["worker_1"],
        # 4: DNS Configuration
        "dns": ["1.1.1.1", "1.0.0.1"],
        # 5: WebRTC Network Policy
        "webrtc_policy": "disable_non_proxied_udp",
        # 6: Browser Profile Directory
        "profile_dir": "/app/profile",
        # 7-10: Isolated Storage (Cookies, LocalStorage, IndexedDB, Cache)
        "storage_isolated": True,
        # 11-12: User-Agent & Client Hints
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.26 Safari/537.36",
        # 13-14: Resolution & DPR
        "screen_width": 1920,
        "screen_height": 1080,
        "device_scale_factor": 1.0,
        # 15-17: Timezone, Locale, Accept-Language
        "timezone": "America/New_York",
        "locale": "en-US",
        "accept_language": "en-US,en;q=0.9",
        # 18: Fonts
        "fonts": ["DejaVu Sans", "Liberation Sans", "Roboto"],
        # 19-20: Canvas & WebGL Compatibility
        "canvas_fingerprint_seed": "seed_worker_1_canvas_x98",
        "webgl_vendor": "Google Inc. (Google)",
        "webgl_renderer": "ANGLE (Google, Vulkan 1.3.0, SwiftShader Device)",
        # 21: Hardware Concurrency
        "hardware_concurrency": 4,
        # 22: Memory Limits
        "max_rss_mb": 1536,
        # 23: Session Persistence
        "session_persistence": True,
        # 24: Sequential Queue Slot
        "queue_slot": 1,
        # 25: Audit Logging
        "audit_enabled": True
    },
    "worker_2": {
        "id": 2,
        "name": "Worker-2",
        "proxy": DEFAULT_PROXIES["worker_2"],
        "dns": ["8.8.8.8", "8.8.4.4"],
        "webrtc_policy": "disable_non_proxied_udp",
        "profile_dir": "/app/profile",
        "storage_isolated": True,
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.26 Safari/537.36",
        "screen_width": 1920,
        "screen_height": 1080,
        "device_scale_factor": 1.0,
        "timezone": "America/Chicago",
        "locale": "en-US",
        "accept_language": "en-US,en;q=0.9",
        "fonts": ["DejaVu Sans", "Liberation Sans", "Roboto"],
        "canvas_fingerprint_seed": "seed_worker_2_canvas_b12",
        "webgl_vendor": "Google Inc. (Google)",
        "webgl_renderer": "ANGLE (Google, Vulkan 1.3.0, SwiftShader Device)",
        "hardware_concurrency": 4,
        "max_rss_mb": 1536,
        "session_persistence": True,
        "queue_slot": 2,
        "audit_enabled": True
    },
    "worker_3": {
        "id": 3,
        "name": "Worker-3",
        "proxy": DEFAULT_PROXIES["worker_3"],
        "dns": ["9.9.9.9", "149.112.112.112"],
        "webrtc_policy": "disable_non_proxied_udp",
        "profile_dir": "/app/profile",
        "storage_isolated": True,
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.26 Safari/537.36",
        "screen_width": 1920,
        "screen_height": 1080,
        "device_scale_factor": 1.0,
        "timezone": "America/Los_Angeles",
        "locale": "en-US",
        "accept_language": "en-US,en;q=0.9",
        "fonts": ["DejaVu Sans", "Liberation Sans", "Roboto"],
        "canvas_fingerprint_seed": "seed_worker_3_canvas_f44",
        "webgl_vendor": "Google Inc. (Google)",
        "webgl_renderer": "ANGLE (Google, Vulkan 1.3.0, SwiftShader Device)",
        "hardware_concurrency": 4,
        "max_rss_mb": 1536,
        "session_persistence": True,
        "queue_slot": 3,
        "audit_enabled": True
    },
    "worker_4": {
        "id": 4,
        "name": "Worker-4",
        "proxy": DEFAULT_PROXIES["worker_4"],
        "dns": ["208.67.222.222", "208.67.220.220"],
        "webrtc_policy": "disable_non_proxied_udp",
        "profile_dir": "/app/profile",
        "storage_isolated": True,
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.26 Safari/537.36",
        "screen_width": 1920,
        "screen_height": 1080,
        "device_scale_factor": 1.0,
        "timezone": "Europe/London",
        "locale": "en-GB",
        "accept_language": "en-GB,en;q=0.9",
        "fonts": ["DejaVu Sans", "Liberation Sans", "Roboto"],
        "canvas_fingerprint_seed": "seed_worker_4_canvas_c77",
        "webgl_vendor": "Google Inc. (Google)",
        "webgl_renderer": "ANGLE (Google, Vulkan 1.3.0, SwiftShader Device)",
        "hardware_concurrency": 4,
        "max_rss_mb": 1536,
        "session_persistence": True,
        "queue_slot": 4,
        "audit_enabled": True
    },
    "worker_5": {
        "id": 5,
        "name": "Worker-5",
        "proxy": DEFAULT_PROXIES["worker_5"],
        "dns": ["1.1.1.1", "8.8.8.8"],
        "webrtc_policy": "disable_non_proxied_udp",
        "profile_dir": "/app/profile",
        "storage_isolated": True,
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.26 Safari/537.36",
        "screen_width": 1920,
        "screen_height": 1080,
        "device_scale_factor": 1.0,
        "timezone": "Europe/Berlin",
        "locale": "en-US",
        "accept_language": "en-US,en;q=0.9",
        "fonts": ["DejaVu Sans", "Liberation Sans", "Roboto"],
        "canvas_fingerprint_seed": "seed_worker_5_canvas_k91",
        "webgl_vendor": "Google Inc. (Google)",
        "webgl_renderer": "ANGLE (Google, Vulkan 1.3.0, SwiftShader Device)",
        "hardware_concurrency": 4,
        "max_rss_mb": 1536,
        "session_persistence": True,
        "queue_slot": 5,
        "audit_enabled": True
    }
}

def get_worker_settings(worker_id: str) -> Dict[str, Any]:
    return WORKER_SETTINGS_MATRIX.get(worker_id, WORKER_SETTINGS_MATRIX["worker_1"])
