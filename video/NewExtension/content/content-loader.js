/**
 * FlowCraft Content Loader (MV3 ES Module Loader)
 */
(async () => {
  try {
    const entryUrl = chrome.runtime.getURL('content/content-main.js');
    await import(entryUrl);
  } catch (err) {
    console.error('[FlowCraft Loader Error] Failed to load content script module:', err);
  }
})();
