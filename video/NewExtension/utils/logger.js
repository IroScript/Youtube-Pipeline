/**
 * FlowCraft Logger Utility
 */
import { ACTIONS } from './constants.js';

export const Logger = {
  info(...args) {
    this._dispatch('info', args);
  },
  warn(...args) {
    this._dispatch('warn', args);
  },
  error(...args) {
    this._dispatch('error', args);
  },

  _dispatch(level, args) {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      try { return JSON.stringify(arg); } catch { return String(arg); }
    }).join(' ');

    const logEntry = {
      level,
      message,
      timestamp: Date.now()
    };

    console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](`[FlowCraft ${level.toUpperCase()}]`, message);

    try {
      chrome.runtime.sendMessage({
        type: ACTIONS.ACTION_LOG,
        data: logEntry
      }).catch(() => {});
    } catch {
      // Ignore background context disconnections
    }
  }
};
