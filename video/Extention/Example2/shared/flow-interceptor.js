(function () {
    var INTERCEPTOR_VERSION = 1;
    if (window.__FLOW_AUTOMATOR_FETCH_INTERCEPTOR__ >= INTERCEPTOR_VERSION) return;
    window.__FLOW_AUTOMATOR_FETCH_INTERCEPTOR__ = INTERCEPTOR_VERSION;

    var originalFetch = window.fetch;
    if (typeof originalFetch !== 'function') return;

    function getRequestUrl(input) {
        try {
            if (typeof input === 'string') return input;
            if (input && typeof input.url === 'string') return input.url;
        } catch (e) { }
        return '';
    }

    function isFlowGenerationRequest(url) {
        return typeof url === 'string' &&
            (url.includes('/flowMedia:batchGenerateImages') ||
                url.includes('/flowMedia:batchGenerateVideos'));
    }

    function postFailure(url, response, bodyText) {
        try {
            window.postMessage({
                source: 'flow-automator',
                type: 'FLOW_GENERATION_NETWORK_FAILURE',
                url: url,
                status: response && response.status,
                statusText: response && response.statusText,
                body: String(bodyText || '').slice(0, 700),
                at: Date.now()
            }, window.location.origin);
        } catch (e) { }
    }

    window.fetch = async function flowAutomatorFetch(input, init) {
        var url = getRequestUrl(input);
        try {
            var response = await originalFetch.apply(this, arguments);
            if (isFlowGenerationRequest(url) && response && !response.ok) {
                try {
                    response.clone().text()
                        .then(function (bodyText) { postFailure(url, response, bodyText); })
                        .catch(function () { postFailure(url, response, ''); });
                } catch (e) {
                    postFailure(url, response, '');
                }
            }
            return response;
        } catch (error) {
            if (isFlowGenerationRequest(url)) {
                try {
                    window.postMessage({
                        source: 'flow-automator',
                        type: 'FLOW_GENERATION_NETWORK_FAILURE',
                        url: url,
                        status: 0,
                        statusText: error && error.message ? error.message : 'Network error',
                        body: '',
                        at: Date.now()
                    }, window.location.origin);
                } catch (e) { }
            }
            throw error;
        }
    };
})();
