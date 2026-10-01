/**
 * Recovery Supervisor & Self-Healing Engine for FlowCraft AI Studio
 * Oversees failure detection, protective signal handling, circuit breaker integration, and automated startup reconciliation.
 */

import { FailureClassifier, ERROR_CATEGORIES } from '../utils/failure-classifier.js';
import { circuitBreaker, CIRCUIT_STATES } from '../utils/circuit-breaker.js';
import { pauseManager, PAUSE_REASONS } from '../utils/pause-manager.js';
import { CheckpointManager } from '../utils/checkpoint-manager.js';
import { JOB_STATES } from '../utils/state-machine.js';
import { Reconciler } from './reconciler.js';
import { Logger } from '../utils/logger.js';

export class RecoverySupervisor {
  constructor() {
    this.activeJob = null;
    this.activeCheckpoint = null;
    this.watchdogInterval = null;
    this.lastObservedProgress = 0;
    this.lastProgressChangeTime = Date.now();
    this.isInitialized = false;
  }

  /**
   * Initializes supervisor listeners and runs startup self-healing.
   */
  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    Logger.info('🛡️ [Recovery Supervisor] Initializing watchdogs & recovery listeners...');

    // 1. Initialize Circuit Breaker & Pause Manager from storage
    await circuitBreaker.initFromStorage();
    await pauseManager.initFromStorage();

    // 2. Network Online/Offline Listeners
    window.addEventListener('offline', () => {
      Logger.warn('📡 [Supervisor] Network connectivity dropped (browser offline)');
      this.handleFailure(new Error('Browser went offline (net::ERR_INTERNET_DISCONNECTED)'), 'NETWORK');
    });

    window.addEventListener('online', async () => {
      Logger.info('🌐 [Supervisor] Network connectivity restored');
      if (pauseManager.isPaused() && pauseManager.getPauseInfo()?.reason === PAUSE_REASONS.PAUSE_NETWORK) {
        Logger.info('🔄 [Supervisor] Automatically resuming from network pause...');
        pauseManager.clearPause('network_restored');
      }
    });

    // 3. Listen to Network Interceptor Messages
    window.addEventListener('message', (event) => {
      if (event.data && event.data.source === 'flowcraft-automator' && event.data.type === 'FLOW_GENERATION_NETWORK_FAILURE') {
        Logger.warn(`🚨 [Supervisor] Network Interceptor caught API failure: ${event.data.status} on ${event.data.url}`);
        this.handleFailure({
          status: event.data.status,
          statusText: event.data.statusText,
          message: `Flow Media API error ${event.data.status}: ${event.data.body || ''}`,
          url: event.data.url
        });
      }
    });

    // 4. Start Watchdog loop (runs every 5 seconds)
    this.startWatchdog();

    // 5. Run Startup Self-Healing Sequence
    await this.runStartupSelfHealing();
  }

  /**
   * Startup Self-Healing Sequence:
   * BOOT -> LOAD CONFIG -> CONNECT BRIDGE -> LOAD ACTIVE JOB -> RECONCILE UI -> RESTORE STATE -> HEALTH CHECK -> RESUME
   */
  async runStartupSelfHealing() {
    Logger.info('🔄 [Startup Self-Healing] Initiating self-healing sequence...');

    // Load active checkpoint if any
    const cp = await CheckpointManager.getActiveJobCheckpoint();
    if (!cp) {
      Logger.info('✅ [Startup Self-Healing] No pending active job checkpoint found. Ready for new jobs.');
      return { status: 'idle' };
    }

    Logger.info(`📂 [Startup Self-Healing] Recovered active checkpoint for job: ${cp.job_id} in state: ${cp.state}`);
    this.activeCheckpoint = cp;

    // Check circuit breaker status
    const cbCheck = circuitBreaker.canExecute();
    if (!cbCheck.allowed) {
      Logger.warn(`⏸️ [Startup Self-Healing] Circuit breaker is OPEN. Pausing execution (${cbCheck.waitSec}s remaining).`);
      pauseManager.requestPause(PAUSE_REASONS.PAUSE_PROTECTION, cp.job_id, cp.state, {
        cooldownMs: cbCheck.waitSec * 1000,
        details: cbCheck.reason
      });
      return { status: 'paused', reason: cbCheck.reason };
    }

    // Run reconciliation against live DOM
    const verdict = await Reconciler.reconcile(cp, cp);
    Logger.info(`🎯 [Startup Self-Healing] Reconcile verdict: ${verdict.action} (${verdict.reason})`);

    return {
      status: 'reconciled',
      checkpoint: cp,
      verdict: verdict
    };
  }

  /**
   * Central failure handler: DETECT -> CLASSIFY -> CHECKPOINT -> PAUSE / BACKOFF
   */
  async handleFailure(errorOrEvent, forcedCategory = null) {
    const classification = forcedCategory
      ? { category: forcedCategory, policy: FailureClassifier.RECOVERY_POLICIES[forcedCategory] }
      : FailureClassifier.classify(errorOrEvent);

    const category = classification.category;
    const policy = classification.policy;
    const reason = classification.reason || errorOrEvent.message || 'Unknown failure';

    Logger.warn(`⚠️ [Supervisor Failure Detected] Category: [${category}] | Reason: ${reason}`);

    // Update active checkpoint
    if (this.activeCheckpoint) {
      this.activeCheckpoint.state = policy.targetState || JOB_STATES.PAUSED;
      this.activeCheckpoint.retry_count = (this.activeCheckpoint.retry_count || 0) + 1;
      this.activeCheckpoint.last_verified_action = `Failure caught: ${category}`;
      this.activeCheckpoint.error = { category, reason, at: Date.now() };
      await CheckpointManager.saveCheckpoint(this.activeCheckpoint);
    }

    // Log structured failure report for observability
    this.reportObservability({
      job_id: this.activeCheckpoint?.job_id || 'unknown',
      category: category,
      reason: reason,
      attempt: this.activeCheckpoint?.retry_count || 1,
      policy: policy.pauseReason
    });

    // Check if Protection or Rate Limit -> Record in Circuit Breaker
    if (category === ERROR_CATEGORIES.PROTECTION || category === ERROR_CATEGORIES.RATE_LIMIT) {
      const cbResult = circuitBreaker.recordFailure(category, reason);
      if (cbResult.tripped) {
        Logger.error(`🛑 [Circuit Breaker Tripped] ${cbResult.reason}. Cooling down for ${cbResult.cooldownSec}s.`);
      }
    }

    // Calculate delay and determine whether to Pause
    const delay = FailureClassifier.calculateDelay(policy, this.activeCheckpoint?.retry_count || 1);

    if (category === ERROR_CATEGORIES.AUTH) {
      pauseManager.requestPause(PAUSE_REASONS.PAUSE_AUTH, this.activeCheckpoint?.job_id, policy.targetState, {
        requiresManualIntervention: true,
        details: reason
      });
      return { action: 'PAUSE_AUTH', requiresManual: true };
    }

    if (!policy.retryable || (this.activeCheckpoint && this.activeCheckpoint.retry_count >= policy.maxRetries)) {
      Logger.error(`🛑 [Supervisor] Max retries (${policy.maxRetries}) reached for ${category}. Transitioning to durable PAUSED / NEEDS_RECOVERY.`);
      pauseManager.requestPause(policy.pauseReason, this.activeCheckpoint?.job_id, JOB_STATES.NEEDS_RECOVERY, {
        cooldownMs: delay,
        details: `Max retries exceeded: ${reason}`
      });
      return { action: 'PAUSED', maxRetriesExceeded: true };
    }

    // Safe pause with cooldown
    pauseManager.requestPause(policy.pauseReason, this.activeCheckpoint?.job_id, policy.targetState, {
      cooldownMs: delay,
      retryCount: this.activeCheckpoint?.retry_count || 1,
      details: reason
    });

    return { action: 'PAUSED_COOLDOWN', delayMs: delay, category };
  }

  /**
   * Watchdog timer monitoring DOM stalls, modal popups, and timeouts
   */
  startWatchdog() {
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
    this.watchdogInterval = setInterval(() => {
      this.checkWatchdog();
    }, 5000);
  }

  checkWatchdog() {
    // 1. Check for visible protective modal dialogs or error banners
    const dialog = document.querySelector('[role="dialog"][data-state="open"], .error-banner, [role="alert"]');
    if (dialog) {
      const text = (dialog.innerText || dialog.textContent || '').toLowerCase();
      if (text.includes('unusual activity') || text.includes('bot') || text.includes('captcha')) {
        this.handleFailure(new Error('Unusual activity dialog detected on screen'), ERROR_CATEGORIES.PROTECTION);
        return;
      }
      if (text.includes('too many requests') || text.includes('rate limit')) {
        this.handleFailure(new Error('Rate limit dialog detected on screen'), ERROR_CATEGORIES.RATE_LIMIT);
        return;
      }
      if (text.includes('sign in') || text.includes('session expired')) {
        this.handleFailure(new Error('Session expired dialog detected on screen'), ERROR_CATEGORIES.AUTH);
        return;
      }
    }

    // 2. Check for orange warning icon replacing submit button (bot detection signal)
    const warningBtn = document.querySelector('button[aria-label*="warning" i], button i:contains("warning"), button span:contains("warning")');
    if (warningBtn && warningBtn.offsetParent !== null) {
      this.handleFailure(new Error('Submit button replaced by warning indicator (bot protection signal)'), ERROR_CATEGORIES.PROTECTION);
    }
  }

  reportObservability(reportData) {
    try {
      fetch('http://127.0.0.1:8102/api/failure_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reportData,
          timestamp: Date.now(),
          url: window.location.href
        })
      }).catch(() => {});
    } catch {}
  }
}

export const recoverySupervisor = new RecoverySupervisor();
