/**
 * Central Failure Classifier for FlowCraft AI Studio
 * Classifies runtime errors, network signals, and protective warnings into typed categories with deterministic recovery policies.
 */

import { JOB_STATES } from './state-machine.js';

export const ERROR_CATEGORIES = Object.freeze({
  NETWORK: 'NETWORK',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  PROTECTION: 'PROTECTION',
  AUTH: 'AUTH',
  UI_CHANGED: 'UI_CHANGED',
  BROWSER: 'BROWSER',
  EXTENSION: 'EXTENSION',
  DOWNLOAD: 'DOWNLOAD',
  GENERATION: 'GENERATION',
  UNKNOWN: 'UNKNOWN'
});

export const RECOVERY_POLICIES = Object.freeze({
  [ERROR_CATEGORIES.NETWORK]: {
    targetState: JOB_STATES.NETWORK_ERROR,
    pauseReason: 'PAUSE_NETWORK',
    retryable: true,
    maxRetries: 5,
    backoffStrategy: 'exponential',
    baseDelayMs: 4000,
    maxDelayMs: 60000,
    requiresRecheck: true
  },
  [ERROR_CATEGORIES.TIMEOUT]: {
    targetState: JOB_STATES.GENERATION_TIMEOUT,
    pauseReason: 'PAUSE_UI_UNSTABLE',
    retryable: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    baseDelayMs: 10000,
    maxDelayMs: 30000,
    requiresRecheck: true
  },
  [ERROR_CATEGORIES.RATE_LIMIT]: {
    targetState: JOB_STATES.RATE_LIMITED,
    pauseReason: 'PAUSE_RATE_LIMITED',
    retryable: true,
    maxRetries: 3,
    backoffStrategy: 'cooldown',
    baseDelayMs: 60000,
    maxDelayMs: 180000,
    requiresRecheck: true
  },
  [ERROR_CATEGORIES.PROTECTION]: {
    targetState: JOB_STATES.PROTECTION_DETECTED,
    pauseReason: 'PAUSE_PROTECTION',
    retryable: true,
    maxRetries: 3,
    backoffStrategy: 'cooldown',
    baseDelayMs: 90000,
    maxDelayMs: 300000,
    requiresRecheck: true
  },
  [ERROR_CATEGORIES.AUTH]: {
    targetState: JOB_STATES.AUTH_REQUIRED,
    pauseReason: 'PAUSE_AUTH',
    retryable: false,
    maxRetries: 0,
    backoffStrategy: 'none',
    baseDelayMs: 0,
    maxDelayMs: 0,
    requiresManualIntervention: true
  },
  [ERROR_CATEGORIES.UI_CHANGED]: {
    targetState: JOB_STATES.UI_CHANGED,
    pauseReason: 'PAUSE_UI_UNSTABLE',
    retryable: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    baseDelayMs: 5000,
    maxDelayMs: 15000,
    requiresDiagnostics: true
  },
  [ERROR_CATEGORIES.BROWSER]: {
    targetState: JOB_STATES.PAUSED,
    pauseReason: 'PAUSE_BROWSER',
    retryable: true,
    maxRetries: 3,
    backoffStrategy: 'linear',
    baseDelayMs: 5000,
    maxDelayMs: 20000,
    requiresRecheck: true
  },
  [ERROR_CATEGORIES.EXTENSION]: {
    targetState: JOB_STATES.NEEDS_RECOVERY,
    pauseReason: 'PAUSE_SYSTEM',
    retryable: true,
    maxRetries: 3,
    backoffStrategy: 'linear',
    baseDelayMs: 3000,
    maxDelayMs: 10000,
    requiresRecheck: true
  },
  [ERROR_CATEGORIES.DOWNLOAD]: {
    targetState: JOB_STATES.DOWNLOAD_FAILED,
    pauseReason: 'PAUSE_SYSTEM',
    retryable: true,
    maxRetries: 4,
    backoffStrategy: 'exponential',
    baseDelayMs: 3000,
    maxDelayMs: 30000,
    requiresRecheck: false // Don't re-generate, just re-download!
  },
  [ERROR_CATEGORIES.GENERATION]: {
    targetState: JOB_STATES.RETRY_WAIT,
    pauseReason: 'PAUSE_SYSTEM',
    retryable: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    baseDelayMs: 10000,
    maxDelayMs: 30000,
    requiresRecheck: true
  },
  [ERROR_CATEGORIES.UNKNOWN]: {
    targetState: JOB_STATES.UNKNOWN_ERROR,
    pauseReason: 'PAUSE_SYSTEM',
    retryable: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    baseDelayMs: 5000,
    maxDelayMs: 20000,
    requiresDiagnostics: true
  }
});

export class FailureClassifier {
  /**
   * Classify any error object, HTTP status, or DOM indicator into an ERROR_CATEGORY.
   */
  static classify(errorOrEvent) {
    if (!errorOrEvent) {
      return {
        category: ERROR_CATEGORIES.UNKNOWN,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.UNKNOWN],
        reason: 'Empty error event'
      };
    }

    const message = typeof errorOrEvent === 'string'
      ? errorOrEvent
      : (errorOrEvent.message || errorOrEvent.error || errorOrEvent.statusText || JSON.stringify(errorOrEvent)).toLowerCase();

    const status = errorOrEvent.status || errorOrEvent.statusCode || 0;

    // 1. Authentication failures
    if (
      status === 401 ||
      status === 403 ||
      message.includes('accounts.google.com') ||
      message.includes('sign in') ||
      message.includes('unauthorized') ||
      message.includes('login required') ||
      message.includes('auth expired')
    ) {
      return {
        category: ERROR_CATEGORIES.AUTH,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.AUTH],
        reason: 'Authentication session expired or login required'
      };
    }

    // 2. Protective / Abuse / Bot Signals
    if (
      message.includes('bot detection') ||
      message.includes('unusual activity') ||
      message.includes('recaptcha') ||
      message.includes('captcha') ||
      message.includes('protective signal') ||
      message.includes('security check') ||
      message.includes('submit button blocked') ||
      message.includes('orange warning') ||
      message.includes('suspicious traffic')
    ) {
      return {
        category: ERROR_CATEGORIES.PROTECTION,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.PROTECTION],
        reason: 'Protective warning or unusual activity signal detected'
      };
    }

    // 3. Rate limiting / Quota (HTTP 429)
    if (
      status === 429 ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('resource exhausted') ||
      message.includes('quota exceeded')
    ) {
      return {
        category: ERROR_CATEGORIES.RATE_LIMIT,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.RATE_LIMIT],
        reason: 'HTTP 429 or generation rate limit encountered'
      };
    }

    // 4. Network failures (HTTP 500/502/503/504, fetch failures, offline)
    if (
      status >= 500 ||
      message.includes('failed to fetch') ||
      message.includes('fetcherror') ||
      message.includes('network') ||
      message.includes('net::err') ||
      message.includes('connection refused') ||
      message.includes('offline') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket') ||
      message.includes('disconnected')
    ) {
      return {
        category: ERROR_CATEGORIES.NETWORK,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.NETWORK],
        reason: `Network disconnection or server error (status: ${status || 'offline'})`
      };
    }

    // 5. Download failures
    if (
      message.includes('download failed') ||
      message.includes('file too small') ||
      message.includes('download timeout') ||
      message.includes('invalid video stream') ||
      message.includes('download error')
    ) {
      return {
        category: ERROR_CATEGORIES.DOWNLOAD,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.DOWNLOAD],
        reason: 'Media stream download interrupted or file integrity check failed'
      };
    }

    // 6. Timeouts
    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('generation poll exceeded')
    ) {
      return {
        category: ERROR_CATEGORIES.TIMEOUT,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.TIMEOUT],
        reason: 'Operation exceeded maximum allowed duration'
      };
    }

    // 7. UI / DOM changes
    if (
      message.includes('selector') ||
      message.includes('element not found') ||
      message.includes('prompt editor input not found') ||
      message.includes('dom query failed') ||
      message.includes('submit button missing')
    ) {
      return {
        category: ERROR_CATEGORIES.UI_CHANGED,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.UI_CHANGED],
        reason: 'Target UI DOM structure modified or element selector missing'
      };
    }

    // 8. Browser / Tab / CDP failures
    if (
      message.includes('target closed') ||
      message.includes('tab crashed') ||
      message.includes('session closed') ||
      message.includes('no tab with id') ||
      message.includes('debugger detached')
    ) {
      return {
        category: ERROR_CATEGORIES.BROWSER,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.BROWSER],
        reason: 'Browser tab crashed, reloaded, or CDP debugger detached'
      };
    }

    // 9. Extension internal errors
    if (
      message.includes('service worker restart') ||
      message.includes('context invalidated') ||
      message.includes('port closed') ||
      message.includes('extension invalidated')
    ) {
      return {
        category: ERROR_CATEGORIES.EXTENSION,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.EXTENSION],
        reason: 'Extension service worker recycled or context invalidated'
      };
    }

    // 10. Generation internal errors
    if (
      message.includes('generation failed') ||
      message.includes('red tile') ||
      message.includes('flow internal error')
    ) {
      return {
        category: ERROR_CATEGORIES.GENERATION,
        policy: RECOVERY_POLICIES[ERROR_CATEGORIES.GENERATION],
        reason: 'Google Flow internal media generation failure'
      };
    }

    // Fallback: Unknown
    return {
      category: ERROR_CATEGORIES.UNKNOWN,
      policy: RECOVERY_POLICIES[ERROR_CATEGORIES.UNKNOWN],
      reason: message || 'Unclassified error condition'
    };
  }

  /**
   * Calculates backoff delay based on policy and attempt number.
   */
  static calculateDelay(policy, attempt) {
    if (!policy || policy.backoffStrategy === 'none') return 0;
    const base = policy.baseDelayMs || 5000;
    const max = policy.maxDelayMs || 60000;

    if (policy.backoffStrategy === 'cooldown') {
      return Math.min(base * Math.max(1, attempt), max);
    }
    if (policy.backoffStrategy === 'exponential') {
      const delay = base * Math.pow(2, Math.max(0, attempt - 1));
      // Add +/- 15% human jitter
      const jitter = delay * (0.85 + Math.random() * 0.3);
      return Math.min(jitter, max);
    }
    // Linear
    return Math.min(base * Math.max(1, attempt), max);
  }
}
