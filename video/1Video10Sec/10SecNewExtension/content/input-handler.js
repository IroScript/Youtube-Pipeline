/**
 * FlowCraft Input Handler Module
 */
import { Logger } from '../utils/logger.js';
import { ACTIONS } from '../utils/constants.js';

export class InputHandler {
  static async typePromptText(textareaEl, promptText) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: ACTIONS.TYPE_TEXT_MAIN,
        text: promptText
      });
      return response ?? { success: false, error: 'No response from background script' };
    } catch (err) {
      Logger.error('Failed sending TYPE_TEXT to background:', err);
      return { success: false, error: err.message };
    }
  }

  static async submitFormCDP() {
    try {
      chrome.runtime.sendMessage({ type: ACTIONS.CLICK_SUBMIT_CDP }).catch(() => {});
    } catch {}
  }
}
