/**
 * Global Pause Manager for FlowCraft AI Studio
 * Coordinates pause triggers, persists reason metadata, controls cooldown intervals, and enforces resume gates.
 */

export const PAUSE_REASONS = Object.freeze({
  PAUSE_NETWORK: 'PAUSE_NETWORK',
  PAUSE_PROTECTION: 'PAUSE_PROTECTION',
  PAUSE_RATE_LIMITED: 'PAUSE_RATE_LIMITED',
  PAUSE_AUTH: 'PAUSE_AUTH',
  PAUSE_BROWSER: 'PAUSE_BROWSER',
  PAUSE_UI_UNSTABLE: 'PAUSE_UI_UNSTABLE',
  PAUSE_BRIDGE: 'PAUSE_BRIDGE',
  PAUSE_MANUAL: 'PAUSE_MANUAL',
  PAUSE_SYSTEM: 'PAUSE_SYSTEM'
});

export class PauseManager {
  constructor() {
    this._isPaused = false;
    this._pauseMetadata = null;
    this._listeners = new Set();
    this.storageKey = 'flowcraft_pause_state';
  }

  async initFromStorage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get([this.storageKey]);
        const saved = data[this.storageKey];
        if (saved && saved.isPaused) {
          this._isPaused = true;
          this._pauseMetadata = saved.metadata;
        }
      }
    } catch {}
  }

  async _persist() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          [this.storageKey]: {
            isPaused: this._isPaused,
            metadata: this._pauseMetadata,
            updatedAt: Date.now()
          }
        });
      }
    } catch {}

    // Forward to Python Bridge
    try {
      if (this._isPaused) {
        fetch('http://127.0.0.1:8102/api/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this._pauseMetadata || {})
        }).catch(() => {});
      } else {
        fetch('http://127.0.0.1:8102/api/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp: Date.now() })
        }).catch(() => {});
      }
    } catch {}
  }

  isPaused() {
    return this._isPaused;
  }

  getPauseInfo() {
    return this._pauseMetadata;
  }

  requestPause(reason, jobId, lastState, options = {}) {
    const cooldownMs = options.cooldownMs || 60000;
    this._isPaused = true;
    this._pauseMetadata = {
      reason: reason || PAUSE_REASONS.PAUSE_SYSTEM,
      timestamp: Date.now(),
      job_id: jobId || 'unknown',
      last_state: lastState || 'UNKNOWN',
      retry_count: options.retryCount || 0,
      cooldown_ms: cooldownMs,
      next_check_at: Date.now() + cooldownMs,
      details: options.details || '',
      requiresManualIntervention: !!options.requiresManualIntervention
    };

    this._persist();
    this._notifyListeners();
    return this._pauseMetadata;
  }

  canResume() {
    if (!this._isPaused) return { allowed: true };
    if (!this._pauseMetadata) return { allowed: true };

    if (this._pauseMetadata.requiresManualIntervention) {
      return {
        allowed: false,
        reason: 'Manual intervention required (e.g. login or captcha resolution)'
      };
    }

    if (this._pauseMetadata.next_check_at && Date.now() < this._pauseMetadata.next_check_at) {
      const waitSec = Math.ceil((this._pauseMetadata.next_check_at - Date.now()) / 1000);
      return {
        allowed: false,
        waitSec,
        reason: `Cooldown active for ${this._pauseMetadata.reason}. Wait ${waitSec}s`
      };
    }

    return { allowed: true };
  }

  clearPause(resumedBy = 'auto_recovery') {
    if (!this._isPaused) return { cleared: false };
    this._isPaused = false;
    const oldMeta = this._pauseMetadata;
    this._pauseMetadata = null;
    this._persist();
    this._notifyListeners({ event: 'resumed', resumedBy, previous: oldMeta });
    return { cleared: true, resumedBy, previous: oldMeta };
  }

  addListener(fn) {
    if (typeof fn === 'function') this._listeners.add(fn);
  }

  removeListener(fn) {
    this._listeners.delete(fn);
  }

  _notifyListeners(extra = {}) {
    for (const listener of this._listeners) {
      try {
        listener({ isPaused: this._isPaused, metadata: this._pauseMetadata, ...extra });
      } catch {}
    }
  }
}

export const pauseManager = new PauseManager();
