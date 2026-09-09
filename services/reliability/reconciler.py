"""
REQ-072: External Side-Effect Reconciler
========================================
Inspects UNKNOWN or interrupted external mutation operations before retrying
to prevent duplicate side-effects on remote APIs (e.g. duplicate YouTube uploads).
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional


class ExternalSideEffectReconciler:
    """
    Reconciles external entity state before authorizing retries.
    """

    @classmethod
    async def reconcile_operation(
        cls,
        operation: Dict[str, Any],
        query_provider_fn: Callable[[str], Any]
    ) -> Dict[str, Any]:
        """
        Executes query_provider_fn to check if the target mutation actually succeeded remotely.
        If found: returns COMPLETED with remote entity metadata.
        If not found: clears UNKNOWN status and authorizes clean retry.
        """
        op_key = operation.get("operation_key")
        remote_entity = await query_provider_fn(op_key) if query_provider_fn else None

        if remote_entity:
            # Operation was successfully executed by remote provider despite lost response
            operation["status"] = "COMPLETED"
            operation["external_id"] = remote_entity.get("id") or remote_entity.get("external_id")
            operation["external_url"] = remote_entity.get("url") or remote_entity.get("external_url")
            operation["reconciliation_result"] = "RECONCILED_SUCCESS"
        else:
            # Remote provider has no record; safe to retry
            operation["status"] = "READY_FOR_RETRY"
            operation["reconciliation_result"] = "NOT_FOUND_SAFE_TO_RETRY"

        return operation
