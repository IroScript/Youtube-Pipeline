"""
REQ-069: Graceful Process Shutdown & Signal Hooks
=================================================
Coordinates process lifecycle, signal interceptors (SIGINT, SIGTERM),
lease draining, and orderly component termination without data loss.
"""

from __future__ import annotations

import signal
import sys
from typing import Any, Callable, List


class GracefulShutdownManager:
    """
    Registers and executes termination callbacks when shutdown signals are caught.
    """

    def __init__(self):
        self._is_shutting_down = False
        self._cleanup_callbacks: List[Callable[[], Any]] = []

    @property
    def is_shutting_down(self) -> bool:
        return self._is_shutting_down

    def register_cleanup_callback(self, callback: Callable[[], Any]) -> None:
        self._cleanup_callbacks.append(callback)

    def trigger_shutdown(self) -> List[Any]:
        """
        Executes all registered cleanup hooks in sequence.
        """
        self._is_shutting_down = True
        results = []
        for cb in self._cleanup_callbacks:
            try:
                res = cb()
                results.append({"callback": getattr(cb, "__name__", str(cb)), "success": True, "result": res})
            except Exception as exc:
                results.append({"callback": getattr(cb, "__name__", str(cb)), "success": False, "error": str(exc)})
        return results

    def install_signal_handlers(self) -> None:
        """
        Installs system signal interceptors for SIGINT and SIGTERM.
        """
        def _handler(signum, frame):
            self.trigger_shutdown()
            sys.exit(0)

        signal.signal(signal.SIGINT, _handler)
        signal.signal(signal.SIGTERM, _handler)
