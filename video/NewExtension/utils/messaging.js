/**
 * FlowCraft Messaging Utility
 */

export async function sendRuntimeMessage(type, payload = {}) {
  try {
    return await chrome.runtime.sendMessage({ type, ...payload });
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function sendTabMessage(tabId, type, payload = {}) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type, ...payload });
  } catch (err) {
    return { success: false, error: err.message };
  }
}
