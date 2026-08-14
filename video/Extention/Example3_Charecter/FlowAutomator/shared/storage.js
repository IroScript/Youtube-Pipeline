/**
 * Google Flow Prompt Automator - Storage Helper
 * Abstracts interaction with chrome.storage.local
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS, AUTOMATOR_STATE } from './model.js';

const DIAGNOSTIC_RETENTION_MS = 60 * 60 * 1000;
const MAX_DIAGNOSTIC_ERRORS = 100;

function classifyDiagnosticMessage(message = '') {
    const text = String(message || '');
    const patterns = [
        [/characters? tab not found/i, 'CHARACTER_TAB_NOT_FOUND', 'character-picker', 'The Characters control was not found.'],
        [/character skipped|character selection/i, 'CHARACTER_ASSET_SKIPPED', 'character-picker', 'The selected character could not be applied.'],
        [/video settings failed|video settings panel|video tab was not found/i, 'VIDEO_SETTINGS_FAILED', 'video-settings', 'Video settings could not be applied.'],
        [/frames to video requires a start frame|video start frame/i, 'VIDEO_START_FRAME_FAILED', 'video-assets', 'The video start frame was missing or could not be applied.'],
        [/video ingredient|video media panel|selected asset.*not found|reference images?.*not found/i, 'ASSET_SELECTION_FAILED', 'asset-picker', 'A selected asset could not be found or applied.'],
        [/handshake timeout|tab is unresponsive|no flow tab found|lost connection/i, 'FLOW_CONNECTION_FAILED', 'connection', 'The extension lost its connection to Google Flow.'],
        [/flow panel.*narrow|window.*narrow/i, 'FLOW_WINDOW_TOO_NARROW', 'layout', 'The Google Flow window was too narrow.'],
        [/daily quota|quota reached/i, 'DAILY_QUOTA_REACHED', 'membership', 'The daily usage limit was reached.'],
        [/premium feature|unlock required/i, 'FEATURE_LOCKED', 'membership', 'The requested feature was not available for this membership.'],
        [/stopped manually/i, 'STOPPED_MANUALLY', 'queue', 'The run was stopped manually.'],
        [/failed|error|not found|could not|blocked/i, 'RUNTIME_ERROR', 'runtime', 'An automation error was recorded.']
    ];
    const match = patterns.find(([pattern]) => pattern.test(text));
    return match
        ? { code: match[1], stage: match[2], summary: match[3] }
        : { code: 'RUNTIME_ERROR', stage: 'runtime', summary: 'An automation error was recorded.' };
}

function classifySafeOperationalLog(message = '', type = 'info') {
    const text = String(message || '');
    let match = text.match(/prompt delay:\s*waiting\s+(\d+)s/i);
    if (match) return {
        code: 'PROMPT_DELAY',
        stage: 'queue',
        summary: `The queue waited ${Number(match[1])} seconds before the next prompt.`,
        context: { recordType: 'activity', delaySeconds: Number(match[1]) }
    };
    match = text.match(/imported\s+(\d+)\s+external prompt/i);
    if (match) return {
        code: 'QUEUE_IMPORT',
        stage: 'queue',
        summary: `${Number(match[1])} prompt(s) were imported into the queue.`,
        context: { recordType: 'activity', promptCount: Number(match[1]) }
    };
    match = text.match(/@mention:\s*matched from library\s*\(ref=(\d+),\s*char=(\d+)\)/i);
    if (match) return {
        code: 'ASSET_MENTION_RESOLUTION',
        stage: 'assets',
        summary: 'Asset mentions were matched from the local Flow library.',
        context: {
            recordType: 'activity',
            matchedReferenceCount: Number(match[1]),
            matchedCharacterCount: Number(match[2])
        }
    };
    match = text.match(/sanitized video queue before run:\s*(\d+)\s+valid asset/i);
    if (match) return {
        code: 'VIDEO_ASSET_VALIDATION',
        stage: 'video-assets',
        summary: `${Number(match[1])} valid video asset(s) remained after validation.`,
        context: { recordType: 'activity', validAssetCount: Number(match[1]) }
    };
    match = text.match(/SSO:\s*web auth retry\s+(\d+)\/(\d+)/i);
    if (match) return {
        code: 'AUTH_EVENT',
        stage: 'authentication',
        summary: `Authentication retried (${Number(match[1])} of ${Number(match[2])}).`,
        context: { recordType: 'activity', event: 'web_auth_retry', retryAttempt: Number(match[1]), retryLimit: Number(match[2]) }
    };
    if (/SSO:.*fallback to web auth flow/i.test(text)) return {
        code: 'AUTH_EVENT',
        stage: 'authentication',
        summary: 'Authentication switched from the browser token path to the web sign-in path.',
        context: { recordType: 'activity', event: 'web_auth_fallback' }
    };
    if (/SSO:\s*sign-in button clicked/i.test(text)) return {
        code: 'AUTH_EVENT',
        stage: 'authentication',
        summary: 'The user started Google sign-in.',
        context: { recordType: 'activity', event: 'sign_in_started' }
    };
    if (/SSO Config:/i.test(text)) return {
        code: 'AUTH_EVENT',
        stage: 'authentication',
        summary: 'The extension checked its authentication configuration.',
        context: { recordType: 'activity', event: 'auth_config_checked' }
    };
    if (/SSO:|sign in with Google|oauth/i.test(text)) return {
        code: 'AUTH_EVENT',
        stage: 'authentication',
        summary: type === 'error' ? 'An authentication operation failed.' : 'An authentication operation changed state.',
        context: { recordType: type === 'error' ? 'issue' : 'activity', event: type === 'error' ? 'authentication_failed' : 'authentication_changed' }
    };
    if (/premium not unlocked: character and reference image assets were removed/i.test(text)) return {
        code: 'FEATURE_ACCESS',
        stage: 'membership',
        summary: 'Premium access was not resolved, so character and reference assets were removed before the run.',
        context: { recordType: 'activity', membershipDecision: 'premium_not_unlocked', runAdjustment: 'prompt_assets_removed' }
    };
    if (/download 2k upscaled requires premium access/i.test(text)) return {
        code: 'FEATURE_ACCESS',
        stage: 'membership',
        summary: '2K download was unavailable for the resolved membership, so the run continued with normal download.',
        context: { recordType: 'activity', membershipDecision: 'premium_not_unlocked', feature: '2k_upscale', runAdjustment: 'normal_download' }
    };
    if (/premium not unlocked|requires premium access/i.test(text)) return {
        code: 'FEATURE_ACCESS',
        stage: 'membership',
        summary: 'A Premium-only option was adjusted for the resolved membership.',
        context: { recordType: 'activity', membershipDecision: 'premium_not_unlocked' }
    };
    if (/queue run target tab/i.test(text)) return {
        code: 'FLOW_TAB_SELECTED',
        stage: 'connection',
        summary: 'A Google Flow target tab was found and selected successfully.',
        context: { recordType: 'activity', event: 'flow_tab_selected' }
    };
    if (/submit retry|retrying prompt|failed after .* retries/i.test(text)) {
        const retryMatch = text.match(/failed after\s+(\d+)\s+retries/i);
        const failureReason = /receiving end does not exist|could not establish connection/i.test(text)
            ? 'content_script_unavailable'
            : /timeout|timed out/i.test(text)
                ? 'timeout'
                : /not found/i.test(text)
                    ? 'control_not_found'
                    : 'submission_not_started';
        return {
            code: 'SUBMIT_RETRY',
            stage: 'submission',
            summary: retryMatch
                ? `Prompt submission failed after ${Number(retryMatch[1])} retries.`
                : 'The first prompt submission attempt did not start, so the extension retried.',
            context: {
                recordType: 'warning',
                failureReason,
                ...(retryMatch ? { retryAttempt: Number(retryMatch[1]) } : {})
            }
        };
    }
    const patterns = [
        [/queue restored|service worker restarted|queue restarted/i, 'QUEUE_RECOVERY', 'queue', 'The queue recovery flow ran.', 'activity'],
        [/cooldown|unusual-activity recovery/i, 'RECOVERY_COOLDOWN', 'recovery', 'The unusual-activity recovery state changed.', 'warning'],
        [/prompt submitted/i, 'PROMPT_SUBMITTED', 'submission', 'A prompt submission was detected.', 'activity'],
        [/saved generated image as reference/i, 'REFERENCE_SAVED', 'assets', 'A generated image was saved as a reference.', 'activity'],
        [/@mention:/i, 'ASSET_MENTION_RESOLUTION', 'assets', 'Asset mention resolution ran.', 'activity'],
        [/video dry run/i, 'VIDEO_DRY_RUN', 'video-settings', 'Video dry-run setup started.', 'activity'],
        [/auto-download|page download|download started/i, 'DOWNLOAD_EVENT', 'download', 'An image download operation changed state.', 'activity']
    ];
    const patternMatch = patterns.find(([pattern]) => pattern.test(text));
    if (patternMatch) return { code: patternMatch[1], stage: patternMatch[2], summary: patternMatch[3], context: { recordType: patternMatch[4] } };
    if (type === 'error') {
        const classified = classifyDiagnosticMessage(text);
        return { code: classified.code, stage: classified.stage, summary: classified.summary, context: { recordType: 'issue' } };
    }
    return null;
}

function cleanDiagnosticContext(context = {}) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) return {};
    const allowed = {
        windowWidth: 'number',
        candidateControlCount: 'number',
        characterTextMatchCount: 'number',
        detectionAttempts: 'number',
        panelFound: 'boolean',
        characterControlFound: 'boolean',
        pickerType: 'string',
        locale: 'string',
        flowType: 'string',
        videoMode: 'string',
        queueStatus: 'string',
        source: 'string',
        recordType: 'string',
        event: 'string',
        membershipDecision: 'string',
        runAdjustment: 'string',
        feature: 'string',
        failureReason: 'string',
        automatorState: 'string',
        delaySeconds: 'number',
        promptCount: 'number',
        retryAttempt: 'number',
        retryLimit: 'number',
        matchedReferenceCount: 'number',
        matchedCharacterCount: 'number',
        validAssetCount: 'number',
        queueTotal: 'number',
        queuePending: 'number',
        queueInProgress: 'number',
        queueCompleted: 'number',
        queueFailed: 'number'
    };
    const out = {};
    for (const [key, kind] of Object.entries(allowed)) {
        const value = context[key];
        if (kind === 'number' && Number.isFinite(Number(value))) {
            out[key] = Math.max(0, Math.min(100000, Number(value)));
        } else if (kind === 'boolean' && typeof value === 'boolean') {
            out[key] = value;
        } else if (kind === 'string' && typeof value === 'string') {
            out[key] = value.trim().slice(0, 80);
        }
    }
    return out;
}

export const storage = {
    async resetQueueIfStale(queue) {
        const items = Array.isArray(queue) ? queue : [];
        if (items.length === 0) return { queue: items, reset: false };
        const now = Date.now();
        const oldest = items.reduce((min, item) => {
            const t = typeof item?.addedAt === 'number' ? item.addedAt : now;
            return Math.min(min, t);
        }, now);
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if ((now - oldest) < TWENTY_FOUR_HOURS) return { queue: items, reset: false };

        const stateData = await chrome.storage.local.get(STORAGE_KEYS.STATE);
        const state = stateData[STORAGE_KEYS.STATE] || AUTOMATOR_STATE.IDLE;
        if (state === AUTOMATOR_STATE.RUNNING || state === AUTOMATOR_STATE.PAUSED) {
            return { queue: items, reset: false };
        }

        await chrome.storage.local.set({
            [STORAGE_KEYS.QUEUE]: [],
            [STORAGE_KEYS.STATE]: AUTOMATOR_STATE.IDLE,
            [STORAGE_KEYS.CURRENT_INDEX]: -1
        });
        // Best-effort log without causing circular dependency issues.
        try {
            const data = await chrome.storage.local.get(STORAGE_KEYS.LOGS);
            const logs = data[STORAGE_KEYS.LOGS] || [];
            logs.push({
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                timestamp: Date.now(),
                message: 'Queue auto-reset: items were older than 24 hours.',
                type: 'info'
            });
            const ONE_HOUR = 60 * 60 * 1000;
            const filtered = logs.filter(l => (Date.now() - l.timestamp) < ONE_HOUR).slice(-100);
            await chrome.storage.local.set({ [STORAGE_KEYS.LOGS]: filtered });
        } catch { }

        return { queue: [], reset: true };
    },

    /**
     * Get the entire queue
     * @returns {Promise<Array>}
     */
    async getQueue() {
        const data = await chrome.storage.local.get(STORAGE_KEYS.QUEUE);
        const queue = data[STORAGE_KEYS.QUEUE] || [];
        const result = await this.resetQueueIfStale(queue);
        return result.queue;
    },

    /**
     * Update the entire queue
     * @param {Array} queue 
     */
    async setQueue(queue) {
        await chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue });
    },

    /**
     * Add new item(s) to the queue
     * @param {Array|Object} items 
     */
    async addToQueue(items) {
        const queue = await this.getQueue();
        const newItems = Array.isArray(items) ? items : [items];
        const updatedQueue = [...queue, ...newItems];
        await this.setQueue(updatedQueue);
        return updatedQueue;
    },

    /**
     * Remove individual item from queue
     */
    async removeFromQueue(itemId) {
        const queue = await this.getQueue();
        const updated = queue.filter(i => i.id !== itemId);
        await this.setQueue(updated);
        return updated;
    },

    /**
     * Update an individual item in the queue
     */
    async updateQueueItem(itemId, partial) {
        const queue = await this.getQueue();
        const idx = queue.findIndex(i => i.id === itemId);
        if (idx !== -1) {
            queue[idx] = { ...queue[idx], ...partial };
            await this.setQueue(queue);
        }
        return queue;
    },

    /**
     * Clear the queue and reset state
     */
    async resetFlow() {
        await chrome.storage.local.set({
            [STORAGE_KEYS.QUEUE]: [],
            [STORAGE_KEYS.STATE]: AUTOMATOR_STATE.IDLE,
            [STORAGE_KEYS.CURRENT_INDEX]: -1
        });
    },

    /**
     * Get current state
     */
    async getState() {
        const data = await chrome.storage.local.get(STORAGE_KEYS.STATE);
        return data[STORAGE_KEYS.STATE] || AUTOMATOR_STATE.IDLE;
    },

    /**
     * Set current state
     * @param {string} state 
     */
    async setState(state) {
        await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state });
    },

    /**
     * Get settings
     */
    async getSettings() {
        const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        const saved = data[STORAGE_KEYS.SETTINGS];
        if (!saved || typeof saved !== 'object') return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...saved };
    },

    /**
     * Update settings
     * @param {Object} partialSettings 
     */
    async updateSettings(partialSettings) {
        const current = await this.getSettings();
        const updated = { ...current, ...partialSettings };
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
        return updated;
    },

    /**
     * Get Current Index
     */
    async getCurrentIndex() {
        const data = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_INDEX);
        return data[STORAGE_KEYS.CURRENT_INDEX] ?? -1;
    },

    /**
     * Update Current Index
     */
    async setCurrentIndex(index) {
        await chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_INDEX]: index });
    },

    /**
     * Add a log entry (stored for 1 day)
     */
    async addLog(message, type = 'info') {
        const data = await chrome.storage.local.get(STORAGE_KEYS.LOGS);
        const logs = data[STORAGE_KEYS.LOGS] || [];

        // Add new log with timestamp
        logs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            timestamp: Date.now(),
            message,
            type
        });

        // Cleanup: Only store for 1 hour
        const ONE_HOUR = 60 * 60 * 1000;
        const now = Date.now();
        const filteredLogs = logs.filter(log => (now - log.timestamp) < ONE_HOUR);

        // Keep at most 100 recent logs to avoid bloating
        const finalLogs = filteredLogs.slice(-100);

        await chrome.storage.local.set({ [STORAGE_KEYS.LOGS]: finalLogs });
        if (type === 'error') {
            const classified = classifyDiagnosticMessage(message);
            await this.addDiagnosticError(classified).catch(() => {});
        }
        return finalLogs;
    },

    /**
     * Get all logs
     */
    async getLogs() {
        const data = await chrome.storage.local.get(STORAGE_KEYS.LOGS);
        const logs = data[STORAGE_KEYS.LOGS] || [];

        // Final cleanup pass on read (1 hour)
        const ONE_HOUR = 60 * 60 * 1000;
        const now = Date.now();
        return logs.filter(log => (now - log.timestamp) < ONE_HOUR);
    },

    async getSafeOperationalDiagnostics({ sinceMs = 0 } = {}) {
        const logs = await this.getLogs();
        const now = Date.now();
        return logs
            .filter((log) => log && Number(log.timestamp || 0) >= Number(sinceMs || 0)
                && Number(log.timestamp || 0) <= now + 60000)
            .map((log) => {
                const safe = classifySafeOperationalLog(log.message, log.type);
                return safe ? {
                    timestamp: Number(log.timestamp || now),
                    ...safe,
                    context: cleanDiagnosticContext(safe.context)
                } : null;
            })
            .filter(Boolean)
            .slice(-50);
    },

    /**
     * Store privacy-safe error metadata for an explicit user-submitted report.
     * Prompts, image prompts, asset names/URLs and raw error strings are never
     * accepted into this buffer.
     */
    async addDiagnosticError(diagnostic = {}) {
        const data = await chrome.storage.local.get(STORAGE_KEYS.DIAGNOSTIC_ERRORS);
        const now = Date.now();
        const existing = Array.isArray(data[STORAGE_KEYS.DIAGNOSTIC_ERRORS])
            ? data[STORAGE_KEYS.DIAGNOSTIC_ERRORS]
            : [];
        const classified = diagnostic.message
            ? classifyDiagnosticMessage(diagnostic.message)
            : null;
        const code = String(diagnostic.code || classified?.code || 'RUNTIME_ERROR')
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, '_')
            .slice(0, 64) || 'RUNTIME_ERROR';
        const entry = {
            id: `diag_${now}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: now,
            code,
            stage: String(diagnostic.stage || classified?.stage || 'runtime').trim().slice(0, 64),
            summary: String(diagnostic.summary || classified?.summary || 'An automation error was recorded.').trim().slice(0, 200),
            context: cleanDiagnosticContext(diagnostic.context)
        };
        const next = existing
            .filter((item) => item && (now - Number(item.timestamp || 0)) < DIAGNOSTIC_RETENTION_MS)
            .concat(entry)
            .slice(-MAX_DIAGNOSTIC_ERRORS);
        await chrome.storage.local.set({ [STORAGE_KEYS.DIAGNOSTIC_ERRORS]: next });
        return entry;
    },

    async getDiagnosticErrors({ sinceMs = 0 } = {}) {
        const data = await chrome.storage.local.get(STORAGE_KEYS.DIAGNOSTIC_ERRORS);
        const now = Date.now();
        const cutoff = Math.max(now - DIAGNOSTIC_RETENTION_MS, Number(sinceMs) || 0);
        const entries = Array.isArray(data[STORAGE_KEYS.DIAGNOSTIC_ERRORS])
            ? data[STORAGE_KEYS.DIAGNOSTIC_ERRORS]
            : [];
        return entries
            .filter((item) => item && Number(item.timestamp || 0) >= cutoff && Number(item.timestamp || 0) <= now + 60000)
            .slice(-MAX_DIAGNOSTIC_ERRORS);
    },

    async getDownloadCounters() {
        const data = await chrome.storage.local.get(STORAGE_KEYS.DOWNLOAD_COUNTERS);
        return data[STORAGE_KEYS.DOWNLOAD_COUNTERS] || {};
    },

    async getNextDownloadNumber(projectFolder) {
        const counters = await this.getDownloadCounters();
        const nextNumber = (counters[projectFolder] || 0) + 1;
        counters[projectFolder] = nextNumber;
        await chrome.storage.local.set({ [STORAGE_KEYS.DOWNLOAD_COUNTERS]: counters });
        return nextNumber;
    }
};
