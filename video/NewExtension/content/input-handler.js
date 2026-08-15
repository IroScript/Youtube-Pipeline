/**
 * FlowCraft Input Handler Module
 * Dispatches CDP Trusted Input events to guarantee isTrusted=true native user input
 */
import { Logger } from '../utils/logger.js';
import { ACTIONS } from '../utils/constants.js';

export class InputHandler {
  static findPromptElement(preferredEl) {
    if (preferredEl && (preferredEl.offsetParent !== null || preferredEl.getClientRects().length > 0)) {
      const inner = preferredEl.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
      return inner || preferredEl;
    }

    const selectors = [
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="Generate" i]',
      'textarea',
      '[data-slate-editor="true"]',
      '[data-lexical-editor="true"]',
      'div[contenteditable="true"]',
      'div[contenteditable="plaintext-only"]',
      'div[role="textbox"]',
      'p[data-placeholder]',
      '[contenteditable]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
        const inner = el.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
        return inner || el;
      }
    }

    const all = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"]'));
    return all.find(el => el.offsetParent !== null || el.getClientRects().length > 0) || null;
  }

  static async typePromptText(textareaEl, promptText) {
    try {
      const cleanText = (promptText || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
      const box = this.findPromptElement(textareaEl);

      if (box) {
        box.focus();
      }

      // Execute CDP Trusted Native Text Insertion via background service worker
      Logger.info('⚡ Sending Native Trusted Input via Chrome CDP (isTrusted=true)...');
      const response = await chrome.runtime.sendMessage({
        type: ACTIONS.TYPE_TEXT_MAIN,
        text: cleanText
      });

      return response || { success: true };
    } catch (err) {
      Logger.error('Error typing prompt text via CDP:', err);
      return { success: false, error: err.message };
    }
  }

  static async submitFormCDP() {
    try {
      return await chrome.runtime.sendMessage({ type: ACTIONS.CLICK_SUBMIT_CDP }).catch(() => {});
    } catch {}
  }
}
