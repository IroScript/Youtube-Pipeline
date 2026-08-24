/**
 * FlowCraft CDP Controller - Handles low-level CDP input events via chrome.debugger
 * Provides 100% Native Trusted Keyboard & Mouse Events to bypass React/Slate synthetic event blocking
 */

export class CDPController {
  static async clickSubmitButton(tabId) {
    if (tabId === undefined) {
      return { success: false, error: 'No active tab ID provided' };
    }

    try {
      // Find element coordinates in main world context
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const isVisible = (el) => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          };

          const editorSelectors = [
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

          const findActiveBox = () => {
            let candidates = [];
            for (const sel of editorSelectors) {
              const found = Array.from(document.querySelectorAll(sel)).filter(isVisible);
              if (found.length > 0) candidates.push(...found);
            }
            if (candidates.length > 0) {
              const last = candidates[candidates.length - 1];
              const inner = last.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
              return inner || last;
            }
            return document.querySelector('textarea, [contenteditable="true"], [role="textbox"]');
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

          const findSubmit = () => {
            const box = findActiveBox();

            // 1. Search upwards in parent containers of active prompt box
            if (box) {
              let curr = box.parentElement;
              for (let depth = 0; depth < 8 && curr && curr !== document.body; depth++) {
                const btns = Array.from(curr.querySelectorAll('button, div[role="button"], span[role="button"]'))
                  .filter(isVisible)
                  .filter(b => !isIgnoredButton(b));

                const matched = btns.find(isSubmitCandidate);
                if (matched) return matched;

                if (btns.length > 0 && (curr.getAttribute('data-testid')?.includes('prompt') || curr.getAttribute('data-testid')?.includes('composer') || curr.querySelector('textarea, [contenteditable="true"], [role="textbox"]'))) {
                  const lastBtn = btns[btns.length - 1];
                  if (!isIgnoredButton(lastBtn) && isSubmitCandidate(lastBtn)) {
                    return lastBtn;
                  }
                }

                curr = curr.parentElement;
              }
            }

            // 2. Global search in page for all candidate buttons
            const allBtns = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'))
              .filter(isVisible)
              .filter(b => !isIgnoredButton(b));

            const matchedGlobal = allBtns.filter(isSubmitCandidate);
            if (matchedGlobal.length > 0) {
              return matchedGlobal[matchedGlobal.length - 1];
            }

            // 3. Fallback: Search all buttons containing arrow / send icons
            for (let i = allBtns.length - 1; i >= 0; i--) {
              const b = allBtns[i];
              const raw = (b.innerHTML || '').toLowerCase();
              if (submitIconNames.some(name => raw.includes(name))) {
                return b;
              }
            }

            return null;
          };

          const btn = findSubmit();
          if (!btn) return null;

          const rect = btn.getBoundingClientRect();
          const cx = Math.round(rect.left + rect.width / 2);
          const cy = Math.round(rect.top + rect.height / 2);
          const mx = window.__lastMouseX ?? 0;
          const my = window.__lastMouseY ?? 0;

          return { cx, cy, mx, my };
        }
      });

      if (!result) {
        return { success: false, error: 'Submit button not found' };
      }

      const { cx, cy, mx, my } = result;

      // CDP Mouse Event Dispatch
      try {
        try {
          await chrome.debugger.attach({ tabId }, '1.3');
        } catch (attachErr) {
          if (!String(attachErr).includes('already attached') && !String(attachErr).includes('Already attached')) {
            throw attachErr;
          }
        }

        const sendCmd = (method, params) => chrome.debugger.sendCommand({ tabId }, method, params);

        await sendCmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, button: 'none', modifiers: 0 });
        await sendCmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1, modifiers: 0 });
        await sendCmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1, modifiers: 0 });
        await sendCmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my, button: 'none', modifiers: 0 });

        try { await chrome.debugger.detach({ tabId }); } catch {}
        return { success: true, strategy: 'cdp-mouse' };
      } catch (cdpErr) {
        try { await chrome.debugger.detach({ tabId }); } catch {}

        // Fallback to React Fiber props & native click execution in MAIN world
        await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            const isVisible = (e) => {
              if (!e) return false;
              const rect = e.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && window.getComputedStyle(e).display !== 'none';
            };

            const submitKeywords = ['generate', 'submit', 'run', 'create', 'send', 'start', 'arrow', 'forward'];
            const submitIconNames = ['arrow_forward', 'arrow_right', 'arrow_right_alt', 'arrow_upward', 'east', 'north', 'send', 'publish', 'play_arrow', 'auto_awesome'];

            const btns = Array.from(document.querySelectorAll('button, div[role="button"]')).filter(isVisible);
            let btn = btns.find(b => {
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              const text = (b.textContent || '').trim().toLowerCase();
              if (b.getAttribute('type') === 'submit') return true;
              if (submitKeywords.some(kw => aria.includes(kw) || text.includes(kw))) return true;
              const icons = Array.from(b.querySelectorAll('i, span, svg, mat-icon')).map(i => (i.textContent || '').trim().toLowerCase());
              return icons.some(i => submitIconNames.includes(i));
            });

            if (!btn && btns.length > 0) btn = btns[btns.length - 1];
            if (!btn) return;

            // DOM Pointer & Mouse Events
            try {
              btn.focus();
              btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }));
              btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true, buttons: 1 }));
              btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }));
              btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true, buttons: 1 }));
              btn.click();
            } catch {}
          }
        });

        return { success: true, strategy: 'dom-fallback', warning: String(cdpErr) };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async sendEnterKey(tabId) {
    if (tabId === undefined) {
      return { success: false, error: 'No active tab ID provided' };
    }
    try {
      try {
        await chrome.debugger.attach({ tabId }, '1.3');
      } catch (attachErr) {
        if (!String(attachErr).includes('already attached') && !String(attachErr).includes('Already attached')) {
          throw attachErr;
        }
      }

      const sendCmd = (method, params) => chrome.debugger.sendCommand({ tabId }, method, params);

      // Dispatch Enter key events
      await sendCmd('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13,
        unmodifiedText: '\r',
        text: '\r'
      });
      await sendCmd('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13
      });

      try { await chrome.debugger.detach({ tabId }); } catch {}
      return { success: true };
    } catch (err) {
      try { await chrome.debugger.detach({ tabId }); } catch {}
      return { success: false, error: err.message };
    }
  }

  /**
   * Universal Trusted CDP Text Input Engine
   * Uses chrome.debugger to dispatch native isTrusted=true keyboard events into Slate/React
   */
  static async typeTextMainWorld(tabId, text) {
    if (tabId === undefined) {
      return { success: false, error: 'No tab ID provided' };
    }

    const cleanStr = (text || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();

    try {
      // 1. Locate active editor element and focus it
      const [{ result: targetInfo }] = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const isVisible = (e) => {
            if (!e) return false;
            const r = e.getBoundingClientRect();
            const s = window.getComputedStyle(e);
            return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
          };

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

          let candidates = [];
          for (const sel of selectors) {
            const found = Array.from(document.querySelectorAll(sel)).filter(isVisible);
            if (found.length > 0) {
              candidates.push(...found);
            }
          }

          let box = candidates.length > 0 ? candidates[candidates.length - 1] : document.querySelector('[data-slate-editor="true"], textarea, div[role="textbox"]');
          if (!box) return null;

          const inner = box.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
          box = inner || box;

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

          const rect = box.getBoundingClientRect();
          return {
            cx: Math.round(rect.left + Math.min(30, Math.max(10, rect.width / 2))),
            cy: Math.round(rect.top + Math.min(20, Math.max(10, rect.height / 2))),
            isTextarea: box.tagName === 'TEXTAREA' || box.tagName === 'INPUT'
          };
        }
      });

      // 2. CDP Native Trusted Key/Text Injection
      let cdpSuccess = false;
      try {
        try {
          await chrome.debugger.attach({ tabId }, '1.3');
        } catch (attachErr) {
          if (!String(attachErr).includes('already attached') && !String(attachErr).includes('Already attached')) {
            throw attachErr;
          }
        }

        const sendCmd = (method, params) => chrome.debugger.sendCommand({ tabId }, method, params);

        if (targetInfo) {
          await sendCmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: targetInfo.cx, y: targetInfo.cy, button: 'left', clickCount: 1 });
          await sendCmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: targetInfo.cx, y: targetInfo.cy, button: 'left', clickCount: 1 });
          await new Promise(r => setTimeout(r, 60));
        }

        // Native Select All (Ctrl+A) and Backspace
        await sendCmd('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
        await sendCmd('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
        await sendCmd('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await sendCmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await new Promise(r => setTimeout(r, 60));

        // 100% Native Trusted Text Insertion via CDP
        await sendCmd('Input.insertText', { text: cleanStr });
        await new Promise(r => setTimeout(r, 100));

        try { await chrome.debugger.detach({ tabId }); } catch {}
        cdpSuccess = true;
      } catch (cdpErr) {
        try { await chrome.debugger.detach({ tabId }); } catch {}
      }

      // 3. Fallback / Sync in MAIN world with Paste & BeforeInput events
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (str) => {
          const isVisible = (e) => {
            if (!e) return false;
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && window.getComputedStyle(e).display !== 'none';
          };

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

          let candidates = [];
          for (const sel of selectors) {
            const found = Array.from(document.querySelectorAll(sel)).filter(isVisible);
            if (found.length > 0) candidates.push(...found);
          }

          let box = candidates.length > 0 ? candidates[candidates.length - 1] : document.querySelector('textarea, [contenteditable="true"], [role="textbox"]');
          if (!box) return;

          const inner = box.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
          box = inner || box;

          box.focus();

          const current = (box.value || box.innerText || box.textContent || '').trim();

          // Dispatch Clipboard Paste Event (React & Lexical/Slate native paste handler)
          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', str);
            box.dispatchEvent(new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              composed: true,
              clipboardData: dt
            }));
          } catch {}

          // Dispatch InputEvent beforeinput & input
          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', str);
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
              data: str
            }));
            box.dispatchEvent(new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              composed: true
            }));
          } catch {}

          // Slate Fiber direct editor insertion
          try {
            const slateRoot = box.getAttribute('data-slate-editor') === 'true' ? box : box.closest('[data-slate-editor="true"]') || box;
            const fiberKey = Object.keys(slateRoot).find(k => k.startsWith('__reactFiber'));
            if (fiberKey) {
              let fiber = slateRoot[fiberKey];
              while (fiber) {
                const state = fiber.memoizedState?.memoizedState;
                if (state?.editor && typeof state.editor.insertText === 'function') {
                  if (!current.includes(str.slice(0, 30))) {
                    state.editor.insertText(str);
                  }
                  break;
                }
                const props = fiber.memoizedProps;
                if (props?.editor && typeof props.editor.insertText === 'function') {
                  if (!current.includes(str.slice(0, 30))) {
                    props.editor.insertText(str);
                  }
                  break;
                }
                fiber = fiber.return;
              }
            }
          } catch {}

          // Textarea prototype setter
          if (box.tagName === 'TEXTAREA' || box.tagName === 'INPUT') {
            const proto = box.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement?.prototype : window.HTMLInputElement?.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (nativeSetter) {
              nativeSetter.call(box, str);
            } else {
              box.value = str;
            }
            box.dispatchEvent(new Event('input', { bubbles: true, cancelable: true, composed: true }));
            box.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true }));
          }
        },
        args: [cleanStr]
      });

      return { success: true, strategy: cdpSuccess ? 'cdp-trusted-insert' : 'fiber-sync' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

