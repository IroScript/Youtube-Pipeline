/**
 * FlowCraft Content Loader (MV3 ES Module Loader & Main World Interceptor)
 */
(async () => {
  try {
    // Inject flow network interceptor into main world
    const interceptorScript = document.createElement('script');
    interceptorScript.src = chrome.runtime.getURL('shared/flow-interceptor.js');
    (document.head || document.documentElement).appendChild(interceptorScript);
    interceptorScript.remove();

    // Dynamically import main content script module
    const entryUrl = chrome.runtime.getURL('content/content-main.js');
    await import(entryUrl);
  } catch (err) {
    console.error('[FlowCraft Loader Error] Failed to load content script module:', err);
  }
})();
