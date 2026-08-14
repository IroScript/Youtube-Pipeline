// GenFlow — MAIN-world hook.
// Flow's 2K upscale (POST .../v1/flow/upsampleImage) returns the 2K JPEG as base64 in
// the response. We intercept that response and hand the bytes to the extension, which
// saves them reliably (no dependence on Flow's flaky blob download).
//
// EXACT attribution: the content script, while holding the menu lock, announces
// "the next upsampleImage belongs to prompt X" (a "claim") right before clicking 2K.
// We consume that claim AT REQUEST TIME (the menu lock serializes clicks, so claim
// order == request order). This avoids guessing by media-id or response order.
(function () {
  if (window.__genflowUpsampleHook) return;
  window.__genflowUpsampleHook = true;

  var claimQueue = [];
  var seq = 0;

  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    var d = ev.data;
    if (d && d.__gfClaim === true) {
      claimQueue.push({ promptId: d.promptId, promptNumber: d.promptNumber });
    }
  });

  function findJpegBase64(o, depth) {
    if (depth > 6 || o == null) return null;
    if (typeof o === "string") {
      if (o.length > 5000 && /^\/9j\//.test(o)) return o;
      if (o.length > 20000 && /^[A-Za-z0-9+/=]+$/.test(o)) return o;
      return null;
    }
    if (typeof o === "object") {
      for (var k in o) {
        try { var r = findJpegBase64(o[k], depth + 1); if (r) return r; } catch (e) {}
      }
    }
    return null;
  }

  function emit(claim, b64) {
    var id = "ups_" + (Date.now()) + "_" + (++seq);
    window.postMessage({
      __genflowUpsample: true,
      upscaleId: id,
      promptId: claim ? claim.promptId : null,
      promptNumber: claim ? claim.promptNumber : null,
      dataUrl: b64 ? ("data:image/jpeg;base64," + b64) : null,
      error: b64 ? null : "no-base64"
    }, "*");
  }

  // --- fetch ---
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function () {
      var args = arguments;
      var url = (typeof args[0] === "string") ? args[0] : (args[0] && args[0].url) || "";
      var claim = null;
      if (/upsampleImage/i.test(url)) {
        claim = claimQueue.shift() || null; // attribute at REQUEST time
      }
      var p = origFetch.apply(this, args);
      if (/upsampleImage/i.test(url)) {
        p.then(function (resp) {
          try { resp.clone().json().then(function (j) { emit(claim, findJpegBase64(j, 0)); }).catch(function () {}); } catch (e) {}
        }).catch(function () {});
      }
      return p;
    };
  }

  // --- XMLHttpRequest ---
  var OrigXHR = window.XMLHttpRequest;
  if (OrigXHR && OrigXHR.prototype) {
    var open = OrigXHR.prototype.open;
    var send = OrigXHR.prototype.send;
    OrigXHR.prototype.open = function (m, url) { try { this.__gfUrl = url; } catch (e) {} return open.apply(this, arguments); };
    OrigXHR.prototype.send = function () {
      try {
        if (/upsampleImage/i.test(this.__gfUrl || "")) {
          var claim = claimQueue.shift() || null;
          this.addEventListener("load", function () {
            try { emit(claim, findJpegBase64(JSON.parse(this.responseText), 0)); } catch (e) {}
          });
        }
      } catch (e) {}
      return send.apply(this, arguments);
    };
  }

  console.log("[GenFlow] upsample hook installed (MAIN world, claim-based)");
})();
