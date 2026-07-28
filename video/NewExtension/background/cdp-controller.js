/**
 * FlowCraft CDP Controller - Handles low-level CDP input events via chrome.debugger
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
          const btn = Array.from(document.querySelectorAll('button[aria-disabled="false"]'))
            .find(b => Array.from(b.getElementsByTagName('i')).some(i => (i.textContent ?? '').trim() === 'arrow_forward'));
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

        // Fallback to React Fiber props click execution
        await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            const btn = Array.from(document.querySelectorAll('button[aria-disabled="false"]'))
              .find(b => Array.from(b.getElementsByTagName('i')).some(i => (i.textContent ?? '').trim() === 'arrow_forward'));
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

  static async typeTextMainWorld(tabId, text) {
    if (tabId === undefined) {
      return { success: false, error: 'No tab ID provided' };
    }

    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: async (str) => {
          const delay = (ms) => new Promise(res => setTimeout(res, ms));
          const box = document.querySelector('[role="textbox"]');
          if (!box) return { success: false, reason: 'textbox-not-found' };

          const getSubmitDisabled = () => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
              Array.from(b.querySelectorAll('i')).some(i => (i.textContent ?? '').trim() === 'arrow_forward')
            );
            return btn?.getAttribute('aria-disabled') ?? 'not-found';
          };

          box.focus();
          await delay(150);

          // Clear existing content
          try {
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              range.selectNodeContents(box);
              sel.removeAllRanges();
              sel.addRange(range);
            }
            document.execCommand('delete', false);
          } catch {}

          await delay(80);

          // Strategy 1: DataTransfer Clipboard Paste
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

          await delay(300);
          if (getSubmitDisabled() === 'false') {
            return { success: true, strategy: 'clipboard-paste' };
          }

          // Strategy 2: InputEvent beforeinput paste
          try {
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              range.selectNodeContents(box);
              sel.removeAllRanges();
              sel.addRange(range);
            }
            const dt = new DataTransfer();
            dt.setData('text/plain', str);
            box.dispatchEvent(new InputEvent('beforeinput', {
              bubbles: true,
              cancelable: true,
              composed: true,
              inputType: 'insertFromPaste',
              dataTransfer: dt
            }));
          } catch {}

          await delay(300);
          if (getSubmitDisabled() === 'false') {
            return { success: true, strategy: 'beforeinput-paste' };
          }

          // Strategy 3: Keystroke insertion via execCommand
          if (!box.textContent?.trim()) {
            for (const char of str) {
              const code = char.charCodeAt(0);
              box.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: char, keyCode: code, which: code }));
              document.execCommand('insertText', false, char);
              box.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: char, keyCode: code, which: code }));
              await delay(20 + Math.floor(Math.random() * 30));
            }
            await delay(300);
          }

          if (getSubmitDisabled() === 'false') {
            return { success: true, strategy: 'execCommand' };
          }

          // Strategy 4: React Fiber prop invocation
          try {
            const fiberKey = Object.keys(box).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
            if (fiberKey) {
              let node = box[fiberKey];
              let depth = 0;
              while (node && depth++ < 100) {
                const props = node.memoizedProps;
                if (props) {
                  const fn = props.onInput || props.onChange;
                  if (typeof fn === 'function') {
                    fn({
                      target: box,
                      currentTarget: box,
                      type: 'input',
                      nativeEvent: new InputEvent('input', { bubbles: true, inputType: 'insertText', data: str }),
                      preventDefault: () => {},
                      stopPropagation: () => {},
                      isPropagationStopped: () => false,
                      persist: () => {}
                    });
                    break;
                  }
                }
                node = node.return;
              }
            }
          } catch {}

          await delay(300);
          return { success: true, strategy: 'fiber-event-sync', submitDisabled: getSubmitDisabled() };
        },
        args: [text]
      });

      return result ?? { success: false, error: 'Execution returned no result' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
