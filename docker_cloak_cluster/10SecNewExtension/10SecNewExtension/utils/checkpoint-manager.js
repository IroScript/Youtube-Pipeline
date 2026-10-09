/**
 * Durable Checkpoint Manager for FlowCraft AI Studio
 * Dual-persists state checkpoints to chrome.storage.local and Python Bridge SQLite database.
 */

export const STATE_RANK = Object.freeze({
  QUEUED: 1,
  PREPARING: 2,
  READY: 3,
  SUBMITTING: 4,
  SUBMITTED: 5,
  GENERATING: 6,
  GENERATED: 7,
  DOWNLOADING: 8,
  VERIFYING: 9,
  COMPLETED: 10
});

export class CheckpointManager {
  static activeLocks = new Set();
  static pendingDbQueue = [];

  /**
   * Acquires exclusive lock for a job to prevent race conditions during execution.
   */
  static async acquireLock(jobId) {
    if (!jobId) return true;
    if (this.activeLocks.has(jobId)) {
      return false; // Locked by another concurrent runner
    }
    this.activeLocks.add(jobId);
    return true;
  }

  /**
   * Releases exclusive lock for a job.
   */
  static releaseLock(jobId) {
    if (jobId) {
      this.activeLocks.delete(jobId);
    }
  }

  static getStorageKey(jobId) {
    return `flowcraft_checkpoint_${jobId || 'active'}`;
  }

  static hashPrompt(prompt) {
    if (!prompt) return 'empty_prompt';
    const clean = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      const char = clean.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return 'h_' + Math.abs(hash).toString(16);
  }

  /**
   * Creates a structured, standardized checkpoint object with monotonic versioning.
   */
  static createCheckpoint(data, prevVersion = 0) {
    return {
      job_id: data.job_id || data.id || `job_${Date.now()}`,
      idea_id: data.idea_id ?? null,
      version: (data.version || prevVersion || 0) + 1,
      state: data.state || JOB_STATES.QUEUED,
      tile_id: data.tile_id || null,
      prompt_hash: data.prompt_hash || this.hashPrompt(data.prompt),
      prompt: data.prompt || '',
      mode: data.mode || 'textToVideo',
      aspectRatio: data.aspectRatio || '9:16',
      model: data.model || 'Veo 3.1 Lower Priority',
      duration: data.duration || '8s',
      attempt: data.attempt || 1,
      timestamp: Date.now(),
      last_verified_action: data.last_verified_action || 'Checkpoint initialized',
      download_status: data.download_status || 'not_started',
      video_url: data.video_url || null,
      filename: data.filename || null,
      retry_count: data.retry_count || 0,
      pause_metadata: data.pause_metadata || null,
      error: data.error || null
    };
  }

  /**
   * Dual-persists checkpoint to chrome.storage.local and remote Bridge API with stale state fencing.
   */
  static async saveCheckpoint(checkpointData) {
    const key = this.getStorageKey(checkpointData.job_id);

    // 0. State Fencing: Check existing state before saving to prevent stale overwrites
    let existing = await this.loadCheckpoint(checkpointData.job_id);
    if (existing) {
      const existRank = STATE_RANK[existing.state] || 0;
      const incomingRank = STATE_RANK[checkpointData.state] || 0;

      // Reject downgrade if incoming state has lower operational rank than existing state
      if (existRank > 0 && incomingRank > 0 && incomingRank < existRank) {
        console.warn(`🛡️ [Checkpoint Fencing] Stale state rejection: Cannot downgrade job "${checkpointData.job_id}" from ${existing.state} (rank ${existRank}) to ${checkpointData.state} (rank ${incomingRank})`);
        return existing;
      }
    }

    const prevVersion = existing?.version || 0;
    const cp = this.createCheckpoint(checkpointData, prevVersion);

    // 1. Local Storage persistence (survives tab crash / browser restart)
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          [key]: cp,
          'flowcraft_last_active_job_id': cp.job_id
        });
      }
    } catch (e) {
      console.warn('[Checkpoint] Failed writing to chrome.storage.local:', e);
    }

    // 2. Python Bridge SQLite persistence with offline queue fallback
    try {
      const res = await fetch('http://127.0.0.1:8102/api/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cp)
      }).catch(err => {
        this.pendingDbQueue.push(cp);
      });
      if (res && !res.ok) {
        this.pendingDbQueue.push(cp);
      }
    } catch {
      this.pendingDbQueue.push(cp);
    }

    return cp;
  }

  /**
   * Flushes any pending checkpoints when database connection recovers.
   */
  static async flushPendingDbQueue() {
    if (this.pendingDbQueue.length === 0) return 0;
    const queue = [...this.pendingDbQueue];
    this.pendingDbQueue = [];
    let flushed = 0;
    for (const item of queue) {
      try {
        const res = await fetch('http://127.0.0.1:8102/api/checkpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (res.ok) flushed++;
        else this.pendingDbQueue.push(item);
      } catch {
        this.pendingDbQueue.push(item);
      }
    }
    return flushed;
  }

  /**
   * Loads checkpoint from local storage or falls back to Python Bridge SQLite.
   */
  static async loadCheckpoint(jobId) {
    const key = this.getStorageKey(jobId);

    // Try local storage first
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get([key]);
        if (data[key]) {
          return data[key];
        }
      }
    } catch {}

    // Try Bridge fallback
    try {
      const res = await fetch(`http://127.0.0.1:8102/api/checkpoint?job_id=${encodeURIComponent(jobId || '')}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.checkpoint) {
          return json.checkpoint;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Retrieves the last active job checkpoint across browser restarts.
   */
  static async getActiveJobCheckpoint() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const ptr = await chrome.storage.local.get(['flowcraft_last_active_job_id']);
        const lastId = ptr.flowcraft_last_active_job_id;
        if (lastId) {
          return await this.loadCheckpoint(lastId);
        }
      }
    } catch {}

    try {
      const res = await fetch('http://127.0.0.1:8102/api/checkpoint/active', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.checkpoint) {
          return json.checkpoint;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Archives or clears completed checkpoint so it doesn't collide with future runs.
   */
  static async archiveCheckpoint(jobId) {
    const key = this.getStorageKey(jobId);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove([key]);
        const ptr = await chrome.storage.local.get(['flowcraft_last_active_job_id']);
        if (ptr.flowcraft_last_active_job_id === jobId) {
          await chrome.storage.local.remove(['flowcraft_last_active_job_id']);
        }
      }
    } catch {}

    try {
      fetch('http://127.0.0.1:8102/api/checkpoint/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      }).catch(() => {});
    } catch {}
  }
}
