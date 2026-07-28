export function hasUnfinishedQueueWork(queue = []) {
    return (Array.isArray(queue) ? queue : []).some((item) =>
        item?.status === 'pending' ||
        item?.status === 'in_progress' ||
        item?.cancelBarrier === true
    );
}

// A browser start, extension reload, install, or update must never resume a
// queue merely because RUNNING was persisted — the very first worker session
// always requires an explicit Start click. Later same-session worker wakes
// (e.g. the MV3 worker getting suspended and restarted while the browser
// stays open) are not gated by this and resume automatically as normal.
export function shouldPauseOnInitialWorkerSession({ sessionInitialized = false, state = 'idle', queue = [] } = {}) {
    return sessionInitialized !== true && state === 'running' && hasUnfinishedQueueWork(queue);
}

export const UNUSUAL_ACTIVITY_FAILURE_THRESHOLD = 3;
export const UNUSUAL_ACTIVITY_COOLDOWN_MS = 5 * 60 * 1000;
export const UNUSUAL_ACTIVITY_POST_RELOAD_WAIT_MS = 30 * 1000;
// Escalating backoff before a strike reaches the threshold: 1 min after the
// 1st unusual-activity failure, 2 min after the 2nd, then the 3rd strike
// falls through to the full UNUSUAL_ACTIVITY_COOLDOWN_MS cooldown above.
export const UNUSUAL_ACTIVITY_CONTINUE_DELAY_STEP_MS = 60 * 1000;

export function getUnusualActivityFailureTransition(state = {}, now = Date.now()) {
    const phase = String(state?.phase || 'idle');
    const timestamp = Math.max(0, Number(now) || Date.now());
    if (phase === 'armed') {
        return {
            action: 'stop',
            state: { phase: 'stopped', consecutiveFailures: UNUSUAL_ACTIVITY_FAILURE_THRESHOLD }
        };
    }

    const consecutiveFailures = Math.max(0, Number(state?.consecutiveFailures) || 0) + 1;
    if (consecutiveFailures >= UNUSUAL_ACTIVITY_FAILURE_THRESHOLD) {
        return {
            action: 'cooldown',
            state: {
                phase: 'cooldown',
                consecutiveFailures: UNUSUAL_ACTIVITY_FAILURE_THRESHOLD,
                cooldownUntil: timestamp + UNUSUAL_ACTIVITY_COOLDOWN_MS
            }
        };
    }

    return {
        action: 'continue',
        state: {
            phase: 'idle',
            consecutiveFailures,
            blockUntil: timestamp + consecutiveFailures * UNUSUAL_ACTIVITY_CONTINUE_DELAY_STEP_MS
        }
    };
}
