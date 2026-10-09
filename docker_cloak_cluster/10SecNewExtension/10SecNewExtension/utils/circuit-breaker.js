/**
 * Circuit Breaker Pattern Implementation for FlowCraft AI Studio
 * Protects system against cascading failures, blocking repeated doomed requests when protection signals trip.
 */

export const CIRCUIT_STATES = Object.freeze({
  CLOSED: 'CLOSED',       // Normal operation
  OPEN: 'OPEN',           // Tripped, no action allowed
  HALF_OPEN: 'HALF_OPEN'  // Testing recovery with single probe
});

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownPeriodMs = options.cooldownPeriodMs || 120000; // 2 minutes
    this.state = CIRCUIT_STATES.CLOSED;
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
    this.nextAllowedTime = 0;
    this.lastTrippedReason = '';
    this.storageKey = 'flowcraft_circuit_breaker_state';
  }

  async initFromStorage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get([this.storageKey]);
        const saved = data[this.storageKey];
        if (saved) {
          this.state = saved.state || CIRCUIT_STATES.CLOSED;
          this.consecutiveFailures = saved.consecutiveFailures || 0;
          this.lastFailureTime = saved.lastFailureTime || 0;
          this.nextAllowedTime = saved.nextAllowedTime || 0;
          this.lastTrippedReason = saved.lastTrippedReason || '';
          this.recheckState();
        }
      }
    } catch {}
  }

  async persistState() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          [this.storageKey]: {
            state: this.state,
            consecutiveFailures: this.consecutiveFailures,
            lastFailureTime: this.lastFailureTime,
            nextAllowedTime: this.nextAllowedTime,
            lastTrippedReason: this.lastTrippedReason,
            updatedAt: Date.now()
          }
        });
      }
    } catch {}
  }

  recheckState() {
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (Date.now() >= this.nextAllowedTime) {
        this.state = CIRCUIT_STATES.HALF_OPEN;
        this.persistState();
      }
    }
  }

  canExecute() {
    this.recheckState();
    if (this.state === CIRCUIT_STATES.OPEN) {
      const waitSec = Math.ceil((this.nextAllowedTime - Date.now()) / 1000);
      return {
        allowed: false,
        state: this.state,
        waitSec: Math.max(0, waitSec),
        reason: `Circuit Breaker is OPEN due to: ${this.lastTrippedReason}. Wait ${waitSec}s`
      };
    }
    return {
      allowed: true,
      state: this.state,
      isProbe: this.state === CIRCUIT_STATES.HALF_OPEN
    };
  }

  recordSuccess() {
    const wasHalfOpen = this.state === CIRCUIT_STATES.HALF_OPEN;
    this.consecutiveFailures = 0;
    this.state = CIRCUIT_STATES.CLOSED;
    this.lastTrippedReason = '';
    this.persistState();
    return { recovered: wasHalfOpen, state: this.state };
  }

  recordFailure(category, reason = '') {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.lastTrippedReason = reason || `Failure category: ${category}`;

    if (category === 'PROTECTION' || this.state === CIRCUIT_STATES.HALF_OPEN || this.consecutiveFailures >= this.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAllowedTime = Date.now() + this.cooldownPeriodMs;
      this.persistState();
      return {
        tripped: true,
        state: this.state,
        cooldownSec: Math.ceil(this.cooldownPeriodMs / 1000),
        reason: this.lastTrippedReason
      };
    }

    this.persistState();
    return {
      tripped: false,
      state: this.state,
      failuresRemaining: this.failureThreshold - this.consecutiveFailures
    };
  }

  forceReset() {
    this.consecutiveFailures = 0;
    this.state = CIRCUIT_STATES.CLOSED;
    this.nextAllowedTime = 0;
    this.lastTrippedReason = '';
    this.persistState();
  }

  reset() {
    this.forceReset();
  }

  getStatus() {
    this.recheckState();
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      threshold: this.failureThreshold,
      nextAllowedTime: this.nextAllowedTime,
      waitSec: Math.max(0, Math.ceil((this.nextAllowedTime - Date.now()) / 1000)),
      lastTrippedReason: this.lastTrippedReason
    };
  }

  getState() {
    this.recheckState();
    return this.state;
  }

  getConsecutiveFailures() {
    return this.consecutiveFailures;
  }
}

export const circuitBreaker = new CircuitBreaker();
