"""
REQ-068: Browser Crash Recovery & Profile Manager
=================================================
Manages Chrome browser profile locks, stale Singleton lock file cleanup,
profile backup/recovery, and graceful session re-initialization.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Optional


class BrowserCrashRecoveryManager:
    """
    Cleans up stale browser profile locks and resets crashed sessions.
    """

    CHROME_LOCK_FILES = [
        "SingletonLock",
        "SingletonCookie",
        "SingletonSocket",
        "parent.lock",
        "lockfile"
    ]

    @classmethod
    def clean_stale_profile_locks(cls, profile_dir: Path | str) -> List[str]:
        """
        Removes dangling Chrome singleton locks that prevent new browser instances from opening.
        """
        pdir = Path(profile_dir)
        removed_locks = []
        if not pdir.exists():
            return removed_locks

        for lock_name in cls.CHROME_LOCK_FILES:
            lock_path = pdir / lock_name
            if lock_path.exists():
                try:
                    if lock_path.is_file() or lock_path.is_symlink():
                        lock_path.unlink()
                        removed_locks.append(str(lock_path))
                except OSError:
                    # Stale or permission lock
                    pass

        return removed_locks

    @classmethod
    def verify_profile_integrity(cls, profile_dir: Path | str) -> Dict[str, bool]:
        """
        Verifies essential Chrome profile structures exist.
        """
        pdir = Path(profile_dir)
        return {
            "directory_exists": pdir.is_dir(),
            "default_dir_exists": (pdir / "Default").is_dir(),
            "preferences_exist": (pdir / "Default" / "Preferences").is_file(),
        }
