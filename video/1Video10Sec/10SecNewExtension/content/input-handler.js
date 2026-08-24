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
      '#PINHOLE_TEXT_AREA_ELEMENT_ID',
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

    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    let all = [];
    for (const sel of selectors) {
      const found = Array.from(document.querySelectorAll(sel)).filter(isVisible);
      if (found.length > 0) {
        all.push(...found);
      }
    }

    // Always pick the LAST visible prompt element (the active composer below existing history)
    if (all.length > 0) {
      const last = all[all.length - 1];
      const inner = last.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
      return inner || last;
    }

    return null;
  }

  static async typePromptText(textareaEl, promptText) {
    try {
      const cleanText = (promptText || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
      const box = this.findPromptElement(textareaEl);

      if (box) {
        box.click();
        box.focus();
      }

      // Step 1: CDP Native Trusted Key/Text Injection via Service Worker
      Logger.info('⚡ Synchronizing Prompt via CDP Native Trusted Input & Paste Events...');
      try {
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'TYPE_TEXT',
            text: cleanText
          }, (res) => resolve(res));
        });
      } catch {}

      await new Promise(r => setTimeout(r, 200));

      // Step 2: Content script local Paste and BeforeInput event dispatch
      if (box) {
        box.focus();

        try {
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(box);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch {}

        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', cleanText);
          box.dispatchEvent(new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            composed: true,
            clipboardData: dt
          }));
        } catch {}

        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', cleanText);
          box.dispatchEvent(new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            composed: true,
            inputType: 'insertFromPaste',
            dataTransfer: dt
          }));
          box.dispatchEvent(new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            composed: true,
            inputType: 'insertText',
            data: cleanText
          }));
          box.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            composed: true
          }));
        } catch {}

        // Textarea / Input Prototype setter fallback
        if (box.tagName === 'TEXTAREA' || box.tagName === 'INPUT') {
          const proto = box.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement?.prototype : window.HTMLInputElement?.prototype;
          const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (nativeSetter) {
            nativeSetter.call(box, cleanText);
          } else {
            box.value = cleanText;
          }
          box.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
          box.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
        }
      }

      return { success: true };
    } catch (err) {
      Logger.error('Error typing prompt text:', err);
      return { success: false, error: err.message };
    }
  }

  static findSubmitButton(box) {
    const isVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    const isIgnoredButton = (b) => {
      const inTopHeader = b.closest('header, nav, [role="navigation"], [data-testid*="header"]');
      if (inTopHeader) return true;

      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const title = (b.getAttribute('title') || '').toLowerCase();
      const text = (b.textContent || '').trim().toLowerCase();
      const testId = (b.getAttribute('data-testid') || '').toLowerCase();

      const ignoreWords = [
        'close', 'help', 'account', 'profile', 'user', 'settings', 'settings_2',
        'tune', 'sliders', 'filter', 'crop', 'aspect', 'ratio',
        'copy', 'content_copy', 'duplicate',
        'clear', 'delete', 'trash', 'remove', 'cancel', '✕', 'eraser', 'ink_eraser',
        'attach', 'upload', 'add_2', 'add image', 'add media', 'add frame', 'ingredients',
        'image', 'photo', 'picture', 'frame', 'asset', 'gallery', 'library', 'insert',
        'more_vert', 'more_horiz', 'overflow', 'expand_more', 'arrow_drop_down',
        'zoom_in', 'zoom_out', 'undo', 'redo', 'fullscreen', 'theme',
        'auto_awesome', 'spark', 'sparkle', 'inspire', 'enhance'
      ];

      if (ignoreWords.some(w => aria.includes(w) || title.includes(w) || testId.includes(w))) return true;
      if (text === '+' || text === 'add' || text === 'add_2' || text === '✕' || text === 'x' || text === 'tune' || text === 'copy') {
        return true;
      }

      const iconNames = Array.from(b.querySelectorAll('i, span, svg, mat-icon, path'))
        .map(i => (i.textContent || '').trim().toLowerCase())
        .filter(Boolean);

      const ignoredIcons = ['add', 'add_2', 'image', 'photo', 'photo_library', 'collections', 'upload', 'attach_file', 'tune', 'settings', 'crop', 'aspect_ratio', 'sliders', 'filter', 'close', 'clear', 'cancel', 'delete', 'auto_awesome', 'spark', 'sparkle'];
      if (iconNames.some(t => ignoredIcons.includes(t))) return true;

      return false;
    };

    const submitIconNames = [
      'arrow_forward', 'arrow_right', 'arrow_right_alt', 'arrow_upward',
      'east', 'north', 'north_east', 'send', 'publish', 'play_arrow',
      'subdirectory_arrow_right', 'chevron_right'
    ];

    const submitKeywords = ['generate', 'submit', 'run', 'create video', 'generate video', 'send prompt', 'start'];

    const isSubmitCandidate = (b) => {
      if (!isVisible(b) || isIgnoredButton(b)) return false;

      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const title = (b.getAttribute('title') || '').toLowerCase();
      const testId = (b.getAttribute('data-testid') || '').toLowerCase();
      const type = (b.getAttribute('type') || '').toLowerCase();
      const text = (b.textContent || '').trim().toLowerCase();

      if (type === 'submit') return true;
      if (submitKeywords.some(kw => aria.includes(kw) || title.includes(kw) || testId.includes(kw) || text.includes(kw))) {
        if (!aria.includes('image') && !aria.includes('project') && !aria.includes('media')) {
          return true;
        }
      }

      const iconTexts = Array.from(b.querySelectorAll('i, span, svg, mat-icon, path'))
        .map(i => (i.textContent || '').trim().toLowerCase())
        .filter(Boolean);

      if (iconTexts.some(t => submitIconNames.includes(t))) {
        return true;
      }

      const svg = b.querySelector('svg');
      if (svg) {
        const pathD = svg.querySelector('path')?.getAttribute('d') || '';
        if (pathD.includes('M') && (aria.includes('arrow') || aria.includes('submit') || aria.includes('generate') || aria.includes('run') || aria.includes('send'))) {
          return true;
        }
      }

      return false;
    };

    // 1. Search upwards in parent containers of box
    if (box) {
      let curr = box.parentElement;
      for (let depth = 0; depth < 8 && curr && curr !== document.body; depth++) {
        const btns = Array.from(curr.querySelectorAll('button, div[role="button"], span[role="button"]'))
          .filter(isVisible)
          .filter(b => !isIgnoredButton(b));

        const matched = btns.find(isSubmitCandidate);
        if (matched) return matched;

        // In card layout: if this container is a prompt card with buttons toolbar,
        // and we have buttons, the LAST button in the card toolbar (that isn't ignored) is the submit button
        if (btns.length > 0 && (curr.getAttribute('data-testid')?.includes('prompt') || curr.getAttribute('data-testid')?.includes('composer') || curr.querySelector('textarea, [contenteditable="true"], [role="textbox"]'))) {
          const lastBtn = btns[btns.length - 1];
          if (!isIgnoredButton(lastBtn) && isSubmitCandidate(lastBtn)) {
            return lastBtn;
          }
        }

        curr = curr.parentElement;
      }
    }

    // 2. Global search in page
    const allBtns = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'))
      .filter(isVisible)
      .filter(b => !isIgnoredButton(b));

    const matchedGlobal = allBtns.filter(isSubmitCandidate);
    if (matchedGlobal.length > 0) {
      return matchedGlobal[matchedGlobal.length - 1];
    }

    // 3. Fallback: Search all buttons containing arrow icons
    for (let i = allBtns.length - 1; i >= 0; i--) {
      const b = allBtns[i];
      const raw = (b.innerHTML || '').toLowerCase();
      if (submitIconNames.some(name => raw.includes(name))) {
        return b;
      }
    }

    return null;
  }

  static async submitFormCDP() {
    try {
      return await chrome.runtime.sendMessage({ type: ACTIONS.CLICK_SUBMIT_CDP }).catch(() => {});
    } catch {}
  }

  static async submitEnterCDP() {
    try {
      return await chrome.runtime.sendMessage({ type: ACTIONS.SUBMIT_ENTER_CDP }).catch(() => {});
    } catch {}
  }
}


