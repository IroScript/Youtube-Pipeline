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
          const findSubmit = () => {
            const editorSelectors = [
              '[data-slate-editor="true"]',
              'div[role="textbox"]',
              'div[contenteditable="true"]',
              'textarea[placeholder*="Describe" i]',
              'textarea[placeholder*="prompt" i]',
              'textarea'
            ];
            let box = null;
            for (const sel of editorSelectors) {
              const el = document.querySelector(sel);
              if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
                box = el;
                break;
              }
            }

            // 1. Search strictly inside or adjacent to the prompt composer container
            const composerArea = box?.closest('form, section, div[data-testid*="prompt"], div:has(button)') || document;
            const composerBtns = Array.from(composerArea.querySelectorAll('button')).filter(b => {
              if (b.closest('header, nav, [role="navigation"], [data-testid*="header"], [data-testid*="sidebar"]')) return false;
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              if (aria.includes('back') || aria.includes('close') || aria.includes('menu') || aria.includes('settings') || aria.includes('account') || aria.includes('home')) return false;
              return true;
            });

            let targetBtn = composerBtns.find(b => {
              const icons = Array.from(b.querySelectorAll('i, svg, span')).map(i => (i.textContent ?? '').trim().toLowerCase());
              return icons.includes('arrow_forward') || icons.includes('arrow_upward') || icons.includes('send') || icons.includes('publish');
            });
            if (targetBtn) return targetBtn;

            targetBtn = composerBtns.find(b => {
              const aria = (b.getAttribute('aria-label') ?? '').toLowerCase();
              return aria.includes('generate') || aria.includes('submit') || aria.includes('send');
            });
            if (targetBtn) return targetBtn;

            // 2. Global search strictly excluding headers, navigation, and back buttons
            const allBtns = Array.from(document.querySelectorAll('button')).filter(b => {
              if (b.closest('header, nav, [role="navigation"], [data-testid*="header"], [data-testid*="sidebar"]')) return false;
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              if (aria.includes('back') || aria.includes('close') || aria.includes('menu') || aria.includes('create project') || aria.includes('home')) return false;
              return true;
            });

            return allBtns.find(b => {
              const icons = Array.from(b.querySelectorAll('i, svg, span')).map(i => (i.textContent ?? '').trim().toLowerCase());
              return icons.includes('arrow_forward') || icons.includes('arrow_upward');
            }) || null;
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
        return { success: false, error: 'Submit button not found or disabled' };
      }

      const { cx, cy, mx, my } = result;

      try {
        await chrome.debugger.attach({ tabId }, '1.3');
        const sendCmd = (method, params) => chrome.debugger.sendCommand({ tabId }, method, params);

        await sendCmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy, button: 'none', modifiers: 0 });
        await sendCmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1, modifiers: 0 });
        await sendCmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1, modifiers: 0 });
        await sendCmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mx, y: my, button: 'none', modifiers: 0 });

        await chrome.debugger.detach({ tabId });
        return { success: true, strategy: 'cdp' };
      } catch (cdpErr) {
        try { await chrome.debugger.detach({ tabId }); } catch {}

        // Fallback to React Fiber props & native click execution in MAIN world
        await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            const findSubmit = () => {
              const editorSelectors = [
                '[data-slate-editor="true"]',
                'div[role="textbox"]',
                'div[contenteditable="true"]',
                'textarea[placeholder*="Describe" i]',
                'textarea[placeholder*="prompt" i]',
                'textarea'
              ];
              let box = null;
              for (const sel of editorSelectors) {
                const el = document.querySelector(sel);
                if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
                  box = el;
                  break;
                }
              }

              const composerArea = box?.closest('form, section, div[data-testid*="prompt"], div:has(button)') || document;
              const composerBtns = Array.from(composerArea.querySelectorAll('button')).filter(b => {
                if (b.closest('header, nav, [role="navigation"], [data-testid*="header"], [data-testid*="sidebar"]')) return false;
                const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                if (aria.includes('back') || aria.includes('close') || aria.includes('menu') || aria.includes('home')) return false;
                return true;
              });

              let targetBtn = composerBtns.find(b => {
                const icons = Array.from(b.querySelectorAll('i, svg, span')).map(i => (i.textContent ?? '').trim().toLowerCase());
                return icons.includes('arrow_forward') || icons.includes('arrow_upward') || icons.includes('send') || icons.includes('publish');
              });
              if (targetBtn) return targetBtn;

              const allBtns = Array.from(document.querySelectorAll('button')).filter(b => {
                if (b.closest('header, nav, [role="navigation"], [data-testid*="header"], [data-testid*="sidebar"]')) return false;
                const aria = (b.getAttribute('aria-label') || '').toLowerCase();
                if (aria.includes('back') || aria.includes('close') || aria.includes('menu') || aria.includes('home')) return false;
                return true;
              });

              return allBtns.find(b => {
                const icons = Array.from(b.querySelectorAll('i, svg, span')).map(i => (i.textContent ?? '').trim().toLowerCase());
                return icons.includes('arrow_forward') || icons.includes('arrow_upward');
              }) || null;
            };

            const btn = findSubmit();
            if (!btn) return;

            const fiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            if (fiberKey) {
              let node = btn[fiberKey];
              let depth = 0;
              while (node && depth++ < 50) {
                const props = node.memoizedProps;
                if (props?.onClick) {
                  try {
                    props.onClick({
                      target: btn,
                      currentTarget: btn,
                      type: 'click',
                      bubbles: true,
                      cancelable: true,
                      preventDefault: () => {},
                      stopPropagation: () => {},
                      isPropagationStopped: () => false,
                      persist: () => {},
                      nativeEvent: new MouseEvent('click', { bubbles: true })
                    });
                    return;
                  } catch {}
                }
                node = node.return;
              }
            }
            btn.click();
          }
        });

        return { success: true, strategy: 'fiber-fallback', warning: String(cdpErr) };
      }
    } catch (err) {
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
      // 1. Locate editor element and focus it
      const [{ result: targetInfo }] = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
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

          let box = null;
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
              const inner = el.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
              box = inner || el;
              break;
            }
          }

          if (!box) {
            box = document.querySelector('textarea, div[contenteditable="true"], [role="textbox"]');
          }

          if (!box) return null;

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
        await chrome.debugger.attach({ tabId }, '1.3');
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

        await chrome.debugger.detach({ tabId });
        cdpSuccess = true;
      } catch (cdpErr) {
        try { await chrome.debugger.detach({ tabId }); } catch {}
      }

      // 3. Fallback / Sync in MAIN world
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (str) => {
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

          let box = null;
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && (el.offsetParent !== null || el.getClientRects().length > 0)) {
              const inner = el.querySelector('textarea, [contenteditable="true"], [role="textbox"], [data-slate-editor="true"], [data-lexical-editor="true"]');
              box = inner || el;
              break;
            }
          }
          if (!box) return;

          const current = (box.value || box.innerText || box.textContent || '').trim();

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
