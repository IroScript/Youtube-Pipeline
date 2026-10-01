/**
 * FlowCraft Selector Store - Dynamic DOM Selectors Repository
 */
import { DEFAULT_SELECTORS, STORAGE_KEYS } from '../utils/constants.js';

class SelectorStore {
  constructor() {
    this.cachedConfig = null;
  }

  async getSelectors() {
    if (this.cachedConfig?.selectors) {
      return this.cachedConfig;
    }

    try {
      const data = await chrome.storage.local.get([STORAGE_KEYS.SELECTOR_CACHE, 'remoteConfigUrl']);
      if (data[STORAGE_KEYS.SELECTOR_CACHE]?.selectors) {
        this.cachedConfig = data[STORAGE_KEYS.SELECTOR_CACHE];
        return this.cachedConfig;
      }

      if (data.remoteConfigUrl) {
        try {
          const resp = await fetch(data.remoteConfigUrl, { method: 'GET' });
          if (resp.ok) {
            const json = await resp.json();
            if (json?.selectors) {
              this.cachedConfig = json;
              await chrome.storage.local.set({ [STORAGE_KEYS.SELECTOR_CACHE]: json });
              return this.cachedConfig;
            }
          }
        } catch {
          // Fall back to defaults on fetch failure
        }
      }
    } catch {
      // Fallback
    }

    this.cachedConfig = DEFAULT_SELECTORS;
    return this.cachedConfig;
  }

  invalidateCache() {
    this.cachedConfig = null;
    chrome.storage.local.remove(STORAGE_KEYS.SELECTOR_CACHE).catch(() => {});
  }
}

export const selectorStore = new SelectorStore();
