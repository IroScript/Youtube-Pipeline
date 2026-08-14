/**
 * FlowCraft Flow Interceptor - Intercepts Google Flow API network requests
 * Catches HTTP 429 rate limits, 500 server errors, and posts status events to window
 */
(function () {
  const INTERCEPTOR_VERSION = 1;
  if (window.__FLOWCRAFT_FETCH_INTERCEPTOR__ >= INTERCEPTOR_VERSION) return;
  window.__FLOWCRAFT_FETCH_INTERCEPTOR__ = INTERCEPTOR_VERSION;

  const originalFetch = window.fetch;
  if (typeof originalFetch !== 'function') return;

  function getRequestUrl(input) {
    try {
      if (typeof input === 'string') return input;
      if (input && typeof input.url === 'string') return input.url;
    } catch {}
    return '';
  }

  function isFlowGenerationRequest(url) {
    return typeof url === 'string' && (
      url.includes('/flowMedia:batchGenerateImages') ||
      url.includes('/flowMedia:batchGenerateVideos') ||
      url.includes('/flowMedia:generateVideo')
    );
  }

  function postFailure(url, response, bodyText) {
    try {
      window.postMessage({
        source: 'flowcraft-automator',
        type: 'FLOW_GENERATION_NETWORK_FAILURE',
        url: url,
        status: response && response.status,
        statusText: response && response.statusText,
        body: String(bodyText || '').slice(0, 700),
        at: Date.now()
      }, window.location.origin);
    } catch {}
  }

  window.fetch = async function flowCraftFetch(input, init) {
    const url = getRequestUrl(input);
    try {
      const response = await originalFetch.apply(this, arguments);
      if (isFlowGenerationRequest(url) && response && !response.ok) {
        try {
          response.clone().text()
            .then(bodyText => postFailure(url, response, bodyText))
            .catch(() => postFailure(url, response, ''));
        } catch {
          postFailure(url, response, '');
        }
      }
      return response;
    } catch (error) {
      if (isFlowGenerationRequest(url)) {
        try {
          window.postMessage({
            source: 'flowcraft-automator',
            type: 'FLOW_GENERATION_NETWORK_FAILURE',
            url: url,
            status: 0,
            statusText: error && error.message ? error.message : 'Network error',
            body: '',
            at: Date.now()
          }, window.location.origin);
        } catch {}
      }
      throw error;
    }
  };
})();
