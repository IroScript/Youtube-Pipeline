/**
 * Durable Batch Generation Controller for FlowCraft AI Studio
 * Executes batch queues with per-job state isolation, fault-tolerant pause/resume, and queue durability.
 */

import { JOB_STATES } from '../utils/state-machine.js';
import { CheckpointManager } from '../utils/checkpoint-manager.js';
import { pauseManager, PAUSE_REASONS } from '../utils/pause-manager.js';
import { circuitBreaker } from '../utils/circuit-breaker.js';
import { ExecutionEngine } from './execution-engine.js';
import { Logger } from '../utils/logger.js';
import { ACTIONS } from '../utils/constants.js';

export class BatchController {
  constructor(groupData = {}) {
    this.id = groupData.id || `batch_${Date.now()}`;
    this.payloads = groupData.payloads || [];
    this.completedJobIds = new Set(groupData.completedJobIds || []);
    this.currentJobIndex = groupData.currentJobIndex || 0;
    this.status = 'idle';
    this.isCancelling = false;
    this.results = groupData.results || [];
    this.previousOutput = null; // Video Chainer state
    this.storageKey = `flowcraft_batch_${this.id}`;
  }

  async persistBatchState() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          [this.storageKey]: {
            id: this.id,
            payloads: this.payloads,
            completedJobIds: Array.from(this.completedJobIds),
            currentJobIndex: this.currentJobIndex,
            status: this.status,
            results: this.results,
            updatedAt: Date.now()
          },
          'flowcraft_active_batch_id': this.id
        });
      }
    } catch {}
  }

  static async loadActiveBatch() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const ptr = await chrome.storage.local.get(['flowcraft_active_batch_id']);
        const batchId = ptr.flowcraft_active_batch_id;
        if (batchId) {
          const data = await chrome.storage.local.get([`flowcraft_batch_${batchId}`]);
          const saved = data[`flowcraft_batch_${batchId}`];
          if (saved && saved.status !== 'completed' && saved.status !== 'cancelled') {
            const controller = new BatchController(saved);
            return controller;
          }
        }
      }
    } catch {}
    return null;
  }

  async run(selectors) {
    this.status = 'running';
    Logger.info(`🚀 [Batch Controller] Executing batch [ID: ${this.id}] with ${this.payloads.length} independent job(s)...`);
    await this.persistBatchState();

    for (let i = this.currentJobIndex; i < this.payloads.length; i++) {
      if (this.isCancelling) {
        this.status = 'cancelled';
        Logger.info('🛑 [Batch Controller] Batch task cancelled by user');
        break;
      }

      const item = this.payloads[i];
      const jobId = item.job_id || `${this.id}_job_${i + 1}`;
      item.job_id = jobId;
      item.promptIndex = item.promptIndex ?? (i + 1);
      this.currentJobIndex = i;

      if (this.completedJobIds.has(jobId)) {
        Logger.info(`⏭️ [Batch Controller] Job ${jobId} already completed — skipping`);
        continue;
      }

      // Check circuit breaker before each job
      const cbCheck = circuitBreaker.canExecute();
      if (!cbCheck.allowed) {
        Logger.warn(`⏸️ [Batch Controller] Circuit Breaker OPEN before Job ${jobId}. Pausing queue (${cbCheck.waitSec}s)...`);
        pauseManager.requestPause(PAUSE_REASONS.PAUSE_PROTECTION, jobId, JOB_STATES.PAUSED, {
          cooldownMs: cbCheck.waitSec * 1000,
          details: cbCheck.reason
        });
      }

      // Cooldown & Pause gating loop: wait gracefully until unpaused
      while (pauseManager.isPaused() && !this.isCancelling) {
        const check = pauseManager.canResume();
        if (check.allowed) {
          Logger.info('▶️ [Batch Controller] Cooldown expired — resuming queue execution');
          pauseManager.clearPause('cooldown_expired');
          break;
        }
        this.status = 'paused';
        this.sendStatusUpdate();
        await new Promise(r => setTimeout(r, 1000));
      }

      if (this.isCancelling) break;

      this.status = 'running';
      this.sendStatusUpdate();

      // Video Chainer end-frame injection
      if (this.previousOutput && item.fallbackLevel !== 2) {
        item.outputPreviousPrompt = this.previousOutput;
      } else if (item.fallbackLevel === 2) {
        item.outputPreviousPrompt = undefined;
        item.images = [];
      }

      // Save initial job checkpoint: QUEUED / PREPARING
      await CheckpointManager.saveCheckpoint({
        job_id: jobId,
        prompt: item.prompt,
        state: JOB_STATES.PREPARING,
        attempt: 1,
        last_verified_action: 'Batch controller picked up job'
      });

      // Execute single job via ExecutionEngine with fault tolerance
      const result = await ExecutionEngine.executePromptItem(
        item,
        selectors,
        () => this.isCancelling,
        () => pauseManager.isPaused()
      );

      if (result.success) {
        this.completedJobIds.add(jobId);
        this.results.push({ jobId, promptIndex: item.promptIndex, success: true });
        circuitBreaker.recordSuccess();

        // Archive completed checkpoint
        await CheckpointManager.archiveCheckpoint(jobId);

        // Update Video Chainer state
        if (result.outputPreviousPrompt) {
          this.previousOutput = result.outputPreviousPrompt;
        } else {
          this.previousOutput = null;
        }

        Logger.info(`✅ [Batch Controller] Job ${item.promptIndex}/${this.payloads.length} (${jobId}) completed successfully!`);

        // Pacing delay between jobs
        if (i < this.payloads.length - 1 && !this.isCancelling) {
          const minDelay = item.promptDelaySecondsMin ?? 5;
          const maxDelay = item.promptDelaySecondsMax ?? 10;
          const delaySec = Math.floor(minDelay + Math.random() * (maxDelay - minDelay + 1));
          Logger.info(`⏳ [Human Pacing] Waiting ${delaySec}s before next queued job...`);
          await new Promise(r => setTimeout(r, delaySec * 1000));
        }
      } else {
        Logger.warn(`⚠️ [Batch Controller] Job ${jobId} failed or paused: ${result.error || 'Unknown'}`);
        this.results.push({ jobId, promptIndex: item.promptIndex, success: false, error: result.error });

        // If job failed due to rate limit or protection, circuit breaker handles pause and queue remains safe!
      }

      await this.persistBatchState();
      this.sendStatusUpdate();
    }

    if (this.isCancelling) {
      this.status = 'cancelled';
    } else if (this.completedJobIds.size === this.payloads.length) {
      this.status = 'completed';
    } else if (this.completedJobIds.size > 0) {
      this.status = 'partially_completed';
    } else {
      this.status = 'paused_or_failed';
    }

    await this.persistBatchState();
    this.sendStatusUpdate();
    return { status: this.status, completedCount: this.completedJobIds.size, totalCount: this.payloads.length };
  }

  sendStatusUpdate() {
    try {
      chrome.runtime.sendMessage({
        type: ACTIONS.BATCH_STATUS,
        data: {
          id: this.id,
          status: this.status,
          currentJobIndex: this.currentJobIndex,
          totalCount: this.payloads.length,
          completedCount: this.completedJobIds.size,
          isPaused: pauseManager.isPaused(),
          isCancelling: this.isCancelling,
          results: this.results
        }
      }).catch(() => {});

      fetch('http://127.0.0.1:8102/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: this.id,
          status: this.status,
          completedCount: this.completedJobIds.size,
          totalCount: this.payloads.length
        })
      }).catch(() => {});
    } catch {}
  }
}
