export const FIREBASE_USER_DISABLED_ERROR = 'USER_DISABLED';

export function normalizeFirebaseAuthErrorCode(message = '') {
    const normalized = String(message || '').trim().toUpperCase();
    if (!normalized) return '';
    if (normalized.includes(FIREBASE_USER_DISABLED_ERROR)) {
        return FIREBASE_USER_DISABLED_ERROR;
    }
    return normalized.slice(0, 160);
}

export function isFirebaseUserDisabledError(message = '') {
    return normalizeFirebaseAuthErrorCode(message) === FIREBASE_USER_DISABLED_ERROR;
}

/**
 * A failed token refresh is not evidence that an account was re-enabled.
 * Preserve the last verified gate instead of replacing it with a permissive
 * local default. USER_DISABLED is treated as a hard local lock when an older
 * cache is unavailable; a later successful token + Firestore refresh is the
 * only transition that may clear it.
 */
export function preserveGateAfterAuthRefreshFailure(
    currentGate = {},
    authState = {},
    authErrorCode = ''
) {
    const next = {
        ...(currentGate && typeof currentGate === 'object' ? currentGate : {}),
        loaded: true,
        checkedAt: 0,
        source: 'auth_refresh_failed_cached'
    };

    if (!next.uid && authState?.uid) next.uid = authState.uid;

    if (isFirebaseUserDisabledError(authErrorCode)) {
        next.ssoVerified = next.ssoVerified === true || !!authState?.uid;
        next.disabled = true;
        next.disabledReason = String(next.disabledReason || 'firebase_auth_user_disabled');
    }

    return next;
}

/**
 * A missing Firestore document is not a positive reactivation signal for an
 * account that was already disabled. Keep the lock until the server returns a
 * real user document whose disabled state can be evaluated.
 */
export function preserveDisabledGateOnMissingRemoteDocument(currentGate = {}) {
    if (currentGate?.disabled !== true) return null;
    return {
        ...currentGate,
        loaded: true,
        checkedAt: 0,
        source: 'firestore_missing_disabled_preserved'
    };
}
