import * as flowApi from "./flowApi.js";

// src/utils/runtimeConfig.ts
var DEFAULT_API_ORIGIN = "https://grovex.space";
function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, "");
}
var injectedOrigin = "";
var SERVER_BASE_URL = normalizeOrigin(injectedOrigin || DEFAULT_API_ORIGIN);
var API_BASE_URL = `${SERVER_BASE_URL}/api`;

// src/background/index.ts
function getRandomDelay(settings) {
  const min = settings.minWaitTime ?? settings.timingBetweenPrompts ?? 3;
  const max = settings.maxWaitTime ?? min + 5;
  const clamped = Math.max(min, 1);
  return (clamped + Math.random() * Math.max(0, max - clamped)) * 1e3;
}
function isNonRetriableGenerationError(error) {
  const s = error.toLowerCase();
  if (s.includes("generation timed out"))
    return true;
  if (s.includes("stuck in processing"))
    return true;
  if (s.includes("suspicious activity"))
    return true;
  if (s.includes("\u043F\u043E\u0434\u043E\u0437\u0440\u0438\u0442\u0435\u043B\u044C\u043D"))
    return true;
  if (s.includes("rate limit"))
    return true;
  if (s.includes("too many requests"))
    return true;
  if (s.includes("policy violation"))
    return true;
  if (s.includes("daily limit") || s.includes("limit reached") || s.includes("лимит"))
    return true;
  // An error rendered in the result card ("Ошибка / Сгенерировать повторно")
  // means Google rejected this exact prompt — regenerating it loops forever, so
  // it is non-retriable (the prompt goes to failed; user can retry manually).
  if (s.includes("card error"))
    return true;
  // Video rendered but audio track failed — regenerating the same prompt won't fix a systemic
  // audio failure; send it to Failed instead of burning a retry.
  if (s.includes("audio generation failed"))
    return true;
  // Account lacks access to the selected model — every retry hits the same 403.
  if (s.includes("model_access") || s.includes("access denied") || s.includes("access_denied"))
    return true;
  return false;
}
// Global consecutive-error circuit breaker: bump on every terminal prompt failure, reset on any
// success (updatePromptStatus "completed" / film totalDone). When the streak reaches
// settings.stopAfterErrors (>0) the whole run halts — catches systemic conditions where the
// GENERATION itself fails and wastes quota (MODEL_ACCESS_DENIED, policy, network, "something went
// wrong", audio) that otherwise keep hammering the queue. Suspicious/429 are EXCLUDED at the clicks
// call site (own per-wave backoff + suspiciousLimit breaker). DOWNLOAD-loss is INTENTIONALLY not
// counted here: the media generated fine (quota well spent) — only the local file didn't land, and
// the end-of-run CHECKLIST reroutes it to Failed(download) for a re-download (no re-generate).
function gfNoteFailStreak(errMsg) {
  if (!state.isRunning) return;
  // Throttle / bot-block failures have their OWN backoff + suspiciousLimit breaker — keep them off
  // the generic "systemic error" streak (parity with the clicks path's !_isBlock && !_is429 guard).
  if (errMsg && /suspicious|подозрительн|429|rate.?limit|too many|слишком много/i.test(String(errMsg))) return;
  state._consecFail = (state._consecFail || 0) + 1;
  const lim = Math.max(0, Number(state.settings && state.settings.stopAfterErrors != null ? state.settings.stopAfterErrors : 3) || 0);
  if (lim > 0 && state._consecFail >= lim) {
    state.stopReason = "errors";
    sendLog("error", `Остановлено: ${state._consecFail} ошибок подряд — проверь аккаунт / модель / сеть, затем «Старт».`);
    handleStopGeneration();
  }
}
// Session-stale hint: count "stall" symptoms (Veo timeout, character library didn't load) and, after
// settings.flowResetHint in a row, SUGGEST a Flow-state reset (clear labs.google cookies) in the popup.
// Different from the error breaker: these are session-fixable, not quota-wasting generation failures.
function gfNoteStall(reason) {
  const lim = Math.max(0, Number(state.settings && state.settings.flowResetHint != null ? state.settings.flowResetHint : 3) || 0);
  if (lim <= 0) return;
  state._flowStallStreak = (state._flowStallStreak || 0) + 1;
  if (state._flowStallStreak < lim) return;
  state._flowStallStreak = 0;  // re-arm from scratch after firing
  const _now = Date.now();
  if (state._flowStaleHintAt && _now - state._flowStaleHintAt < 300000) return;  // don't nag more than once / 5 min
  state._flowStaleHintAt = _now;
  try { chrome.storage.local.set({ gfFlowStaleHint: _now }); } catch (e) {}  // so a CLOSED popup catches it on open
  try { chrome.runtime.sendMessage({ type: "GF_FLOW_STALE_HINT", payload: { reason: reason || "" } }).catch(() => {}); } catch (e) {}
  sendLog("warning", "Flow, похоже, подвис (таймауты / библиотека) — предложен сброс состояния Flow.");
}
var stallWarningLoggedForSlot = /* @__PURE__ */ new Set();
var shouldPreventNextDownload = false;
var preventedUrls = new Set();
var preventTimeout = null;
function normalizeUrlForComparison(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    u.searchParams.delete("token");
    u.searchParams.delete("sig");
    u.searchParams.delete("expires");
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
var state = {
  prompts: [],
  settings: null,
  isRunning: false,
  isPaused: false,
  activeSlots: /* @__PURE__ */ new Map(),
  lastResultUrl: null,
  generationMode: "single",
  batchDownloadUrls: [],
  processedDownloadUrls: /* @__PURE__ */ new Set(),
  failedPromptsList: [],
  isDownloadingAll: false,
  photoIndex: {}
};
// MV3: this worker sleeps during long pauses (429 backoff, reCAPTCHA retries) and wakes with
// empty RAM, so every pending download name is lost — Chrome then commits its own UUID name
// plus an OS-derived extension (.jfif on Windows boxes whose registry maps image/jpeg there).
// These carriers mirror themselves into storage.session, which survives a worker restart.
class _GfPersistMap extends Map {
  set(k, v) { const r = super.set(k, v); persistDownloadNames(); return r; }
  delete(k) { const r = super.delete(k); persistDownloadNames(); return r; }
}
class _GfPersistArr extends Array {
  push(...a) { const r = super.push(...a); persistDownloadNames(); return r; }
  shift() { const r = super.shift(); persistDownloadNames(); return r; }
}
var pendingDownloadFilenames = new _GfPersistMap();
var pendingDownloadById = /* @__PURE__ */ new Map();
// FIFO of names for our own data: URL downloads (the 2K hook saves). Their data: URL is a
// multi-MB string and an unreliable Map key in onDeterminingFilename once the move-forward
// pipeline fires several downloads at once — the key misses and the file saves as "Untitled".
// data: downloads are issued only by us (UPSCALE_DOWNLOAD) and processed in creation order,
// so we name them from this queue instead of by URL.
var pendingDataDownloadNames = new _GfPersistArr();
// Every download we request already carries a filename, but Chrome can still commit its own
// bare-UUID default if the naming event finds our maps empty (worker restart). Remember what
// we asked for, with a timestamp, and use it as the last resort instead of surrendering.
var pendingRequestedNames = new _GfPersistArr();
// RAM-only selector store (commercial anti-clone): server selectors live here in memory for
// the session and are NEVER written to chrome.storage/disk. A copy without our server or
// license never receives them; content scripts fall back to bundled defaults only as a
// safety net (offline / server down).
var inMemoryFlowSelectors = null;
var downloadFilenameToPromptId = /* @__PURE__ */ new Map();
var downloadUrlToPromptId = new _GfPersistMap();
// Prompt objects registered for naming, keyed by promptId. Lets onDeterminingFilename
// name downloads whose prompt is NOT in state.prompts (e.g. Download All Media uses
// synthetic per-tile prompts).
var registeredPromptById = /* @__PURE__ */ new Map();
// FIFO queue of downloads we expect from the content script (one per upscale/menu
// download). A single variable lost the 2nd of two near-simultaneous downloads
// (e.g. 2 video generations of one prompt), so one kept Flow's own name.
var expectingDownloads = [];
var downloadReceivedForPrompt = /* @__PURE__ */ new Set();
var handledUpscaleIds = /* @__PURE__ */ new Set();
var GENFLOW_BUILD = "gf-1.0.4-names-session";
console.log("[GenFlow] background.js loaded BUILD=" + GENFLOW_BUILD);
var saveDebounceTimer = null;
function saveState() {
  if (saveDebounceTimer)
    clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    // Strip heavy data: URLs (multi-MB base64 previews / 2K images) before persisting —
    // they blew chrome.storage.session quota. They're only needed in memory, not saved.
    const _stripBig = (u) => (typeof u === "string" && u.startsWith("data:")) ? "" : u;
    const _slimP = (p) => p ? { ...p, previewUrl: _stripBig(p.previewUrl), resultUrl: _stripBig(p.resultUrl), imageUrl: _stripBig(p.imageUrl), endImageUrl: _stripBig(p.endImageUrl), referenceImageUrls: Array.isArray(p.referenceImageUrls) ? p.referenceImageUrls.map(_stripBig) : p.referenceImageUrls } : p;
    // FAILED prompts must KEEP their input frames (imageUrl/endImageUrl/referenceImageUrls) so
    // Retry can re-run image-to-video / multi / flow after a service-worker restart — otherwise
    // the retry throws "no start image attached". Strip only the regeneratable OUTPUTS here.
    // (The failed list is bounded, so keeping a few base64 frames won't blow the quota like the
    // full prompt list would.)
    const _slimFP = (p) => p ? { ...p, previewUrl: _stripBig(p.previewUrl), resultUrl: _stripBig(p.resultUrl) } : p;
    const _slimF = (f) => f ? { ...f, previewUrl: _stripBig(f.previewUrl), resultUrl: _stripBig(f.resultUrl), prompt: _slimFP(f.prompt) } : f;
    chrome.storage.session.set({
      genflowState: {
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        prompts: state.prompts.map(_slimP),
        settings: state.settings,
        generationMode: state.generationMode,
        activeSlots: Array.from(state.activeSlots.entries()),
        processedDownloadUrls: Array.from(state.processedDownloadUrls).filter((u) => !(typeof u === "string" && u.startsWith("data:"))),
        batchDownloadUrls: (state.batchDownloadUrls || []).filter((b) => !(b && typeof b.url === "string" && b.url.startsWith("data:"))),
        lastResultUrl: _stripBig(state.lastResultUrl),
        failedPromptsList: state.failedPromptsList.map(_slimF),
        photoIndex: state.photoIndex,
        cooldownUntil: state.cooldownUntil || 0,
        nextDispatchAllowedAt: state.nextDispatchAllowedAt || 0,
        cooldownReason: state.cooldownReason || "",
        stopReason: state.stopReason || "",
        // Persist download bookkeeping so a service-worker restart mid-run doesn't lose
        // "this prompt's file already landed" and false-fail/re-run completed prompts.
        downloadReceivedForPrompt: Array.from(downloadReceivedForPrompt),
        handledUpscaleIds: Array.from(handledUpscaleIds),
        // Persist the generated-media id set: it's the PRIMARY filter for "Download All"
        // (grab only this session's items). MV3 idle-kills the SW between generation and
        // the later download click; without this the Set is lost -> filter empty -> all tiles.
        generatedMediaIds: Array.from(state.generatedMediaIds || []),
        savedAt: Date.now()
      }
    }).catch((e) => console.warn("[GenFlow] Failed to save state:", e));
  }, 300);
}
async function restoreState() {
  try {
    const result = await chrome.storage.session.get("genflowState");
    const saved = result?.genflowState;
    if (!saved)
      return;
    state.isRunning = saved.isRunning ?? false;
    state.isPaused = saved.isPaused ?? false;
    state.prompts = saved.prompts ?? [];
    state.settings = saved.settings ?? null;
    state.generationMode = saved.generationMode ?? "single";
    state.activeSlots = new Map(saved.activeSlots ?? []);
    state.processedDownloadUrls = new Set(saved.processedDownloadUrls ?? []);
    state.batchDownloadUrls = saved.batchDownloadUrls ?? [];
    state.lastResultUrl = saved.lastResultUrl ?? null;
    state.failedPromptsList = saved.failedPromptsList ?? [];
    state.photoIndex = saved.photoIndex ?? {};
    state.cooldownUntil = saved.cooldownUntil ?? 0;
    state.nextDispatchAllowedAt = saved.nextDispatchAllowedAt ?? 0;
    state.cooldownReason = saved.cooldownReason ?? "";
    state.stopReason = saved.stopReason ?? "";
    downloadReceivedForPrompt = new Set(saved.downloadReceivedForPrompt ?? []);
    handledUpscaleIds = new Set(saved.handledUpscaleIds ?? []);
    state.generatedMediaIds = new Set(saved.generatedMediaIds ?? []);
    console.log(`[GenFlow] State restored: isRunning=${state.isRunning}, prompts=${state.prompts.length}, activeSlots=${state.activeSlots.size}, dlReceived=${downloadReceivedForPrompt.size}`);
  } catch (e) {
    console.warn("[GenFlow] Failed to restore state:", e);
  }
}
restoreState();
// Companion to saveState/restoreState for the download-name carriers. Kept separate and
// written immediately (not on the 300ms state debounce) because a download can fire the
// moment after a name is registered. data: URLs are never stored as keys — they are
// multi-MB strings and would blow the session quota, the same reason saveState strips them.
var _gfNamesSaveTimer = null;
function persistDownloadNames() {
  if (_gfNamesSaveTimer) return;
  _gfNamesSaveTimer = setTimeout(() => {
    _gfNamesSaveTimer = null;
    try {
      const _small = (arr) => arr.filter(([k]) => typeof k === "string" && k.length < 400 && !k.startsWith("data:")).slice(-300);
      chrome.storage.session.set({
        gfDownloadNames: {
          byUrl: _small(Array.from(pendingDownloadFilenames.entries())),
          fifo: Array.prototype.slice.call(pendingDataDownloadNames, -300),
          requested: Array.prototype.slice.call(pendingRequestedNames, -60),
          urlToPrompt: _small(Array.from(downloadUrlToPromptId.entries()))
        }
      });
    } catch (e) {}
  }, 0);
}
async function restoreDownloadNames() {
  try {
    const r = await chrome.storage.session.get("gfDownloadNames");
    const d = r && r.gfDownloadNames;
    if (!d) return;
    // Write through the prototype so restoring does not re-trigger a save loop.
    for (const [k, v] of (d.byUrl || [])) if (!pendingDownloadFilenames.has(k)) Map.prototype.set.call(pendingDownloadFilenames, k, v);
    for (const [k, v] of (d.urlToPrompt || [])) if (!downloadUrlToPromptId.has(k)) Map.prototype.set.call(downloadUrlToPromptId, k, v);
    if (!pendingDataDownloadNames.length && Array.isArray(d.fifo) && d.fifo.length) Array.prototype.push.apply(pendingDataDownloadNames, d.fifo);
    if (!pendingRequestedNames.length && Array.isArray(d.requested) && d.requested.length) Array.prototype.push.apply(pendingRequestedNames, d.requested);
  } catch (e) {}
}
restoreDownloadNames();
// Record the filename of every download we request. Chrome normally honours it, but when the
// naming event fires with wiped maps it falls back to a bare UUID from the URL — this queue is
// what lets us put the real name back. Entries are timestamped and expire, so a stale one can
// never be pinned on an unrelated download.
try {
  const _gfOrigDownload = chrome.downloads.download.bind(chrome.downloads);
  chrome.downloads.download = function (opts, cb) {
    try {
      if (opts && opts.filename) pendingRequestedNames.push({ n: opts.filename, t: Date.now() });
    } catch (e) {}
    return _gfOrigDownload(opts, cb);
  };
} catch (e) { console.warn("[GenFlow] could not wrap downloads.download:", e); }
async function trackUsageOnServer(service) {
  try {
    const { accessToken, user } = await chrome.storage.local.get(["accessToken", "user"]);
    if (!accessToken) {
      sendLog("warning", "Not logged in - usage not tracked");
      return;
    }
    const res = await fetch(`${SERVER_BASE_URL}/api/v1/usage/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({ service, prompt_count: 1 })
    });
    if (res.ok) {
      const data = await res.json();
      if (user) {
        const updatedUser = {
          ...user,
          // Use the server's authoritative `used` (not a local +1) so the UI counter reflects
          // the real per-day total — survives re-login and matches usage/status.
          daily_generations: (typeof data.used === "number" ? data.used : (user.daily_generations || 0) + 1),
          daily_limit: (typeof data.daily_limit === "number" ? data.daily_limit : user.daily_limit),
          remaining: (typeof data.remaining === "number" ? data.remaining : user.remaining)
        };
        await chrome.storage.local.set({ user: updatedUser });
        chrome.runtime.sendMessage({
          type: "USAGE_UPDATED",
          payload: {
            remaining: data.remaining,
            used: updatedUser.daily_generations
          }
        }).catch(() => {
        });
      }
      sendLog("info", `Credit used. Remaining: ${data.remaining}`);
      // Server is the source of truth for the daily limit. can_generate already accounts for
      // the plan (paid = always true; free = false at the cap). When it goes false, stop NEW
      // dispatches — in-flight generations finish & download (soft stop), and the Start button
      // greys via broadcastUpdate inside handleStopGeneration.
      if (data.can_generate === false || (typeof data.remaining === "number" && data.remaining <= 0)) {
        state.limitReached = true;
        sendLog("warning", `Daily limit reached (${data.used ?? "?"}/${data.daily_limit ?? "?"}) — stopping new generations.`);
        chrome.runtime.sendMessage({ type: "LIMIT_REACHED", payload: { used: data.used, daily_limit: data.daily_limit, plan: data.plan } }).catch(() => {});
        handleStopGeneration();
      }
    } else if (res.status === 401) {
      const _e401 = await res.json().catch(() => ({}));
      if (_e401.detail === "Account is blocked") {
        // Real ban -> flag BANNED (popup shows the badge); keep token so the state stays visible.
        await chrome.storage.local.set({ banned: true });
        sendLog("error", "Account is blocked — generation stopped.");
      } else {
        // Expired/invalid token -> NOT a ban: drop the token; the popup returns to the auth screen.
        await chrome.storage.local.remove(["accessToken", "user"]);
        sendLog("warning", "Session expired — reconnect Telegram.");
      }
      handleStopGeneration();
      broadcastUpdate();
    } else {
      const error = await res.json().catch(() => ({ detail: "Unknown error" }));
      sendLog("warning", `Usage track failed: ${error.detail || res.status}`);
    }
  } catch (e) {
    console.warn("[GenFlow] Usage track error:", e);
    sendLog("warning", `Usage track error: ${e}`);
  }
}
async function findAndPrepareServiceTab(service) {
  try {
    const activeTabs = await chrome.tabs.query({ active: true });
    for (const tab of activeTabs) {
      if (tab.id && isExpectedServiceUrl(service, tab.url)) {
        await ensureContentScriptInjected(tab.id, service);
        return tab;
      }
    }
  } catch (e) {
    console.error("[GenFlow] Error query active tabs:", e);
  }

  const tab = await getServiceTab(service);
  if (tab && tab.id) {
    await ensureContentScriptInjected(tab.id, service);
    return tab;
  }
  return null;
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "PREVENT_NEXT_DOWNLOAD": {
      const { url } = message.payload || {};
      if (url) {
        const norm = normalizeUrlForComparison(url);
        preventedUrls.add(norm);
        setTimeout(() => {
          preventedUrls.delete(norm);
        }, 10000);
      }
      shouldPreventNextDownload = true;
      if (preventTimeout) clearTimeout(preventTimeout);
      preventTimeout = setTimeout(() => {
        shouldPreventNextDownload = false;
      }, 3000);
      sendResponse({ success: true });
      break;
    }
    case "ALLOW_NEXT_DOWNLOADS": {
      shouldPreventNextDownload = false;
      if (preventTimeout) clearTimeout(preventTimeout);
      sendResponse({ success: true });
      break;
    }
    case "GF_STALL": {
      // Content-script signal of a session-stale symptom (character library / reference picker didn't load).
      gfNoteStall((message.payload && message.payload.reason) || "library");
      sendResponse({ success: true });
      break;
    }
    case "CLEAR_FLOW_COOKIES": {
      // Reset Flow's per-profile client state (cookies + site storage) for labs.google.
      // Flow occasionally serves a stale video compose bar without the reference picker;
      // wiping its site data reassigns the client and restores the picker. Then reload
      // any open Flow tab so the fresh state takes effect.
      const origins = ["https://labs.google", "https://labs.google.com"];
      try {
        chrome.browsingData.remove(
          { origins },
          { cookies: true, localStorage: true, cacheStorage: true, indexedDB: true, serviceWorkers: true },
          () => {
            const err = chrome.runtime.lastError;
            try {
              chrome.tabs.query({ url: ["https://labs.google/*", "https://labs.google.com/*"] }, (tabs) => {
                for (const t of tabs || []) { try { chrome.tabs.reload(t.id); } catch (e) {} }
              });
            } catch (e) {}
            sendResponse({ success: !err, error: err && err.message });
          }
        );
      } catch (e) {
        sendResponse({ success: false, error: (e && e.message) || String(e) });
      }
      return true; // async sendResponse
    }
    case "WRITE_SLATE_PROMPT": {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No sender tab ID" });
        break;
      }
      const { text } = message.payload;
      chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        args: [text],
        func: (textToInsert) => {
          const el = document.querySelector('[data-slate-editor="true"]');
          if (!el) return;
          const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
          if (!fiberKey) return;
          let curr = el[fiberKey];
          let editor = null;
          let depth = 0;
          while (curr && depth < 50) {
            depth++;
            if (curr.pendingProps && curr.pendingProps.editor) {
              editor = curr.pendingProps.editor;
              break;
            }
            if (curr.memoizedProps && curr.memoizedProps.editor) {
              editor = curr.memoizedProps.editor;
              break;
            }
            curr = curr.return;
          }
          if (editor) {
            const path = [0, 0];
            const oldText = editor.string(path) || "";
            if (oldText.length > 0) {
              editor.apply({
                type: 'remove_text',
                path: path,
                offset: 0,
                text: oldText
              });
            }
            editor.apply({
              type: 'insert_text',
              path: path,
              offset: 0,
              text: textToInsert
            });
            editor.select({
              anchor: { path: path, offset: textToInsert.length },
              focus: { path: path, offset: textToInsert.length }
            });
          }
        }
      }).then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.error("[GenFlow] WRITE_SLATE_PROMPT script injection failed:", err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
    case "CLICK_FLOW_CREATE": {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: "No sender tab ID" });
        break;
      }
      chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const btn = document.querySelector('[data-w3a1="true"]');
          if (!btn) return "Button not found";
          btn.removeAttribute('data-w3a1');
          const key = Object.keys(btn).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
          if (key && btn[key] && typeof btn[key].onClick === 'function') {
            btn[key].onClick({
              preventDefault: () => {},
              stopPropagation: () => {},
              nativeEvent: { isTrusted: true }
            });
            return "react-click";
          } else {
            btn.click();
            return "fallback-click";
          }
        }
      }).then((result) => sendResponse({ success: true, result }))
        .catch((err) => {
          console.error("[GenFlow] CLICK_FLOW_CREATE script injection failed:", err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
    case "START_GENERATION":
      handleStartGeneration(gfUnpackRefPool(message.payload));
      sendResponse({ success: true });
      break;
    case "PROBE_FLOW_API":
      // UI readiness check for code modes: session token + reCAPTCHA + project.
      flowApi.probe().then((r) => sendResponse(r)).catch((e) => sendResponse({ ready: false, error: String((e && e.message) || e) }));
      return true;
    case "RUN_FLOW_API_BATCH":
      // input=code path (mode 3). Self-contained; mode 1 (synthetic) untouched.
      runFlowApiBatch(gfUnpackRefPool(message.payload)).catch((e) => console.error("[GenFlow][API] runFlowApiBatch crashed:", e));
      sendResponse({ success: true });
      break;
    case "APPEND_API_PROMPTS": {
      const newPrompts = gfUnpackRefPool(message.payload).prompts || [];
      if (state._apiRunning && state.apiPrompts) {
        const added = newPrompts.map(p => Object.assign({}, p, { id: p.id || crypto.randomUUID(), status: "pending", addedAt: Date.now(), isVideo: p.isVideo !== void 0 ? p.isVideo : (state.settings?.service === "veo3" || state.settings?.service === "grok") }));
        state.apiPrompts.push(...added);
        state.prompts.push(...added);
        chrome.runtime.sendMessage({ type: "API_PREVIEW_ADD", payload: { slots: newPrompts.map((pp, ii) => ({ number: (pp && pp.number) || state.apiPrompts.length - newPrompts.length + ii + 1, prompt: typeof pp === "string" ? pp : (pp.text || pp.prompt || ""), status: "queued" })) } }).catch(() => {});
        sendLog("info", `API mode: queued ${newPrompts.length} more prompt(s).`);
        broadcastUpdate();
      }
      sendResponse({ success: true });
      break;
    }
    case "RUN_FILM_STREAMS":
      runFilmStreams(message.payload).catch((e) => console.error("[GenFlow][FilmStreams] runFilmStreams crashed:", e));
      sendResponse({ success: true });
      break;
    case "CODE_OUTPUT":
      // Hybrid (synthetic input + code output): base card generated synthetically; upscale + download by API.
      handleCodeOutput(message.payload).catch((e) => console.error("[GenFlow][hybrid] CODE_OUTPUT crashed:", e));
      sendResponse({ success: true });
      break;
    case "PAUSE_GENERATION":
      handlePauseGeneration();
      sendResponse({ success: true });
      break;
    case "RESUME_GENERATION":
      handleResumeGeneration();
      sendResponse({ success: true });
      break;
    case "STOP_GENERATION":
      handleStopGeneration();
      sendResponse({ success: true });
      break;
    case "UPDATE_PROMPT_INFO": {
      if (message.payload && message.payload.promptId) {
        const p = state.prompts.find(x => x.id === message.payload.promptId);
        if (p) updatePromptStatus(p.id, p.status, { info: message.payload.info });
      }
      sendResponse({ success: true });
      break;
    }
    case "RETRY_FAILED":
      handleRetryFailed();
      sendResponse({ success: true });
      break;
    case "RETRY_SINGLE_FAILED": {
      const { promptId, newText } = message.payload;
      handleRetrySingleFailed(promptId, newText);
      sendResponse({ success: true });
      break;
    }
    case "RETRY_UPSCALE": {
      const { promptId, newText } = message.payload;
      handleRetryUpscale(promptId, newText);
      sendResponse({ success: true });
      break;
    }
    case "RETRY_ALL_UPSCALES": {
      handleRetryAllUpscales();
      sendResponse({ success: true });
      break;
    }
    case "RETRY_ALL_GENERATIONS": {
      handleRetryAllGenerations();
      sendResponse({ success: true });
      break;
    }
    case "GET_FLOW_SELECTORS": {
      // Content scripts pull selectors from this in-memory copy (RAM-only, no disk).
      sendResponse({ selectors: inMemoryFlowSelectors });
      break;
    }
    case "SET_FLOW_SELECTORS": {
      // Popup may feed selectors it fetched (after auth) — held in memory only, never stored.
      const _sel = (message.payload && message.payload.selectors) || message.selectors;
      if (_sel) inMemoryFlowSelectors = _sel;
      sendResponse({ success: true });
      break;
    }
    case "UPDATE_FAILED_PROMPT_TEXT": {
      const { promptId, text } = message.payload;
      const prompt = state.prompts.find((p) => p.id === promptId);
      if (prompt) {
        prompt.text = text;
      }
      const failed = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
      if (failed) {
        failed.prompt.text = text;
      }
      broadcastUpdate();
      saveState();
      sendResponse({ success: true });
      break;
    }
    case "REMOVE_PROMPT": {
      const { promptId } = message.payload || {};
      if (promptId) {
        const p = state.prompts.find((x) => x.id === promptId);
        state.prompts = state.prompts.filter((x) => x.id !== promptId && (!p || x.number !== p.number || x.text !== p.text));
        state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== promptId && (!p || f.prompt.number !== p.number || f.prompt.text !== p.text));
        broadcastUpdate();
        saveState();
      }
      sendResponse({ success: true });
      break;
    }
    case "UPDATE_SETTINGS": {
      // Bug#1 fix: live-sync a settings change (e.g. the image model) from the popup so a Retry
      // uses the currently-selected model WITHOUT needing a fresh Start. Skip while a run is
      // active to avoid switching the model mid-batch (preserves prior behavior).
      const _us = (message.payload && message.payload.settings) || message.payload || {};
      if (!state.isRunning && _us && typeof _us === "object" && !Array.isArray(_us)) {
        // Whitelist only known-safe keys so a malformed/foreign payload can't corrupt state.settings.
        const _patch = {};
        if (typeof _us.imageModel === "string") _patch.imageModel = _us.imageModel;
        if (Object.keys(_patch).length) {
          state.settings = state.settings ? { ...state.settings, ..._patch } : { ..._patch };
          saveState();
        }
      }
      sendResponse({ success: true });
      break;
    }
    case "CLEAR_ALL_FAILED": {
      state.prompts = state.prompts.filter((x) => x.status !== "failed");
      state.failedPromptsList = [];
      broadcastUpdate();
      saveState();
      sendResponse({ success: true });
      break;
    }
    case "CLEAR_PENDING_PROMPTS": {
      state.prompts = state.prompts.filter((x) => x.status !== "pending");
      broadcastUpdate();
      saveState();
      sendResponse({ success: true });
      break;
    }
    case "CLEAR_ALL_PROMPTS": {
      // Trash button: wipe the WHOLE list, including stuck "processing" tasks (escape
      // hatch — otherwise hung active tasks can't be removed). Also clear slots and stop
      // scheduling, and tell content to abort, so nothing re-appears.
      state.prompts = [];
      state.activeSlots.clear();
      state.isPaused = false;
      // Fresh slate: drop the stop-reason banner, the suspicious streak, and the generated-media set
      // (so a later Download All doesn't grab last session's items).
      state.stopReason = "";
      state.consecutiveSuspicious = 0;
      if (state.generatedMediaIds) state.generatedMediaIds.clear();
      chrome.tabs.query({ url: ["*://labs.google/*", "*://labs.google.com/*"] }).then((tabs) => {
        for (const tab of tabs) { if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "ABORT_INJECTIONS" }).catch(() => {}); }
      }).catch(() => {});
      broadcastUpdate();
      saveState();
      sendResponse({ success: true });
      break;
    }

    case "CLEAR_CACHE": {
      // "Clear cache" = unstick the extension without logging out or losing the typed queue.
      // Wipes runtime/cached bookkeeping that can go stale and jam generation or downloads.
      // Keeps prompts (stuck "processing" -> back to "pending") and auth untouched.
      state.isRunning = false;
      state.isPaused = false;
      state.isDownloadingAll = false;
      state.activeSlots.clear();
      for (const p of state.prompts) { if (p.status === "processing") p.status = "pending"; }
      state.cooldownUntil = 0;
      state.nextDispatchAllowedAt = 0;
      state.cooldownReason = "";
      state.stopReason = "";
      state.consecutiveSuspicious = 0;
      state.photoIndex = {};
      state.lastResultUrl = null;
      state.batchDownloadUrls = [];
      if (state.generatedMediaIds) state.generatedMediaIds.clear();
      if (state.processedDownloadUrls) state.processedDownloadUrls.clear();
      try { downloadReceivedForPrompt.clear(); } catch (e) {}
      try { handledUpscaleIds.clear(); } catch (e) {}
      // Hard-reload the Flow tab(s) — bypassCache = same as Ctrl+Shift+R. This is the visible
      // part of "Clear cache": it drops the page's stale state/cache that jams the UI.
      chrome.tabs.query({ url: ["*://labs.google/*", "*://labs.google.com/*"] }).then((tabs) => {
        for (const tab of tabs) {
          if (!tab.id) continue;
          chrome.tabs.sendMessage(tab.id, { type: "ABORT_INJECTIONS" }).catch(() => {});
          try { chrome.tabs.reload(tab.id, { bypassCache: true }); } catch (e) {}
        }
      }).catch(() => {});
      chrome.runtime.sendMessage({ type: "API_PREVIEW_CLEAR" }).catch(() => {});
      broadcastUpdate();
      saveState();
      sendLog("success", "Cache cleared — extension reset to a clean state.");
      sendResponse({ success: true });
      break;
    }

    case "UPLOAD_OBJECTS": {
      // Plain reference objects/locations: upload each photo to the Flow library so it's
      // available by name. (Objects also auto-upload at generation time; this pre-loads them.)
      (async () => {
        try {
          const objects = (message.payload && message.payload.objects) || [];
          if (!objects.length) { sendResponse({ success: false, error: "no objects" }); return; }
          const tabId = await flowApi.getFlowTabId();
          if (!tabId) { sendResponse({ success: false, error: "no Flow tab open" }); return; }
          const projectId = await flowApi.getProjectId(tabId);
          const _sleepO = (ms) => new Promise((r) => setTimeout(r, ms));
          console.log("[GenFlow] UPLOAD_OBJECTS: " + objects.length + " object(s), tab=" + tabId + " project=" + projectId);
          let uploaded = 0, _oi = 0;
          for (const obj of objects) {
            if (!obj || !obj.imageDataUrl) continue;
            if (_oi++ > 0) await _sleepO(600);
            try {
              await flowApi.uploadImage(tabId, obj.imageDataUrl, (obj.name || "object") + ".png", projectId ? { projectId } : {});
              uploaded++;
              sendLog("info", `Object uploaded to library: ${obj.name}`);
            } catch (e) {
              console.error(`[GenFlow] object "${obj.name}" upload FAILED:`, e);
              sendLog("error", `Object "${obj.name}" upload failed: ${(e && e.message) || e}`);
            }
            try { chrome.runtime.sendMessage({ type: "OBJ_UPLOAD_PROGRESS", payload: { done: uploaded, total: objects.length } }); } catch (e2) {}
          }
          sendResponse({ success: true, uploaded });
          if (uploaded > 0 && !(message.payload && message.payload.skipReload) && !state.isRunning && !state.isPaused && !state.isDownloadingAll) {
            // SAME RACE as characters: Flow is still committing the LAST upload when the tab
            // reloads (every call runs inside that tab), so the last object silently didn't
            // land on slower links. Wait until the library actually lists them, then reload.
            if (projectId) {
              try {
                const _deadlineO = Date.now() + 6000;
                let _okO = false;
                const _wantO = objects.map((o) => String((o && o.name) || "").trim().toLowerCase()).filter(Boolean);
                while (Date.now() < _deadlineO) {
                  await _sleepO(700);
                  try {
                    const inv = await flowApi.listProjectReferences(tabId, projectId);
                    const have = new Set(((inv && inv.objects) || []).map((o) => String((o && o.name) || "").trim().toLowerCase()).filter(Boolean));
                    if (_wantO.every((n) => have.has(n))) { _okO = true; break; }
                  } catch (e2) { /* keep waiting */ }
                }
                console.log("[GenFlow] UPLOAD_OBJECTS: settle before reload — " + (_okO ? "all objects visible" : "timeout, reloading anyway"));
              } catch (e) {}
            }
            try { chrome.tabs.reload(tabId); } catch (e) {}
          }
        } catch (e) {
          sendResponse({ success: false, error: (e && e.message) || String(e) });
        }
      })();
      return true;
    }

    case "PREPARE_CHARACTERS": {
      // Native Flow characters: create-once via direct API (no reCAPTCHA), reuse by name per
      // project so a later run / "continue the story" doesn't duplicate or re-upload. Cache:
      // chrome.storage.local.gfCharacterEntities[projectId][nameLower] = {entityId,photoHash,voice}.
      (async () => {
        try {
          const chars = (message.payload && message.payload.characters) || [];
          // Visible in the service-worker console (chrome://extensions -> inspect SW). The early
          // returns below used to bail SILENTLY (no sendLog), so the Log panel stayed empty and
          // the failure was invisible — these console lines make each exit point diagnosable.
          console.log("[GenFlow] PREPARE_CHARACTERS: received " + chars.length + " character(s):", chars.map((c) => (c && c.name) + (c && c.photoDataUrl ? "(photo)" : "(NO photo)")).join(", "));
          if (!chars.length) { console.warn("[GenFlow] PREPARE_CHARACTERS: aborting — no characters in payload"); sendLog("error", "Load characters: none with a name/photo"); sendResponse({ success: false, error: "no characters" }); return; }
          const tabId = await flowApi.getFlowTabId();
          if (!tabId) { console.warn("[GenFlow] PREPARE_CHARACTERS: aborting — no Flow tab open"); sendLog("error", "Load characters: no Flow tab open — open your Flow project first"); sendResponse({ success: false, error: "no Flow tab open" }); return; }
          const projectId = await flowApi.getProjectId(tabId);
          if (!projectId) { console.warn("[GenFlow] PREPARE_CHARACTERS: aborting — Flow tab " + tabId + " has no projectId (not on a /project/ page?)"); sendLog("error", "Load characters: not on a Flow project page — open a project and retry"); sendResponse({ success: false, error: "no Flow project" }); return; }
          console.log("[GenFlow] PREPARE_CHARACTERS: tab=" + tabId + " project=" + projectId + " — starting");
          const store = await chrome.storage.local.get("gfCharacterEntities");
          const cacheAll = store.gfCharacterEntities || {};
          const cache = cacheAll[projectId] || {};
          const _hash = (s) => { let h = 2166136261; const str = String(s || ""); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + "_" + str.length; };
          const isReal = (id) => !!id && !String(id).startsWith("imported_");
          const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          let prepared = 0, reused = 0, _idx = 0;
          for (const ch of chars) {
            // Space out characters: back-to-back create+upload throttles Flow, so the 2nd
            // character often failed while the 1st succeeded. A short gap (skipped for the
            // first and for cache-reused ones) keeps the whole set landing.
            if (_idx++ > 0) await _sleep(600);
            const nameKey = String(ch.name || "").trim().toLowerCase();
            if (!nameKey) continue;
            const photoHash = ch.photoDataUrl ? _hash(ch.photoDataUrl) : "";
            const voiceKey = ch.voice || "";
            const hit = cache[nameKey];
            if (hit && isReal(hit.entityId) && hit.photoHash === photoHash && hit.voice === voiceKey) { reused++; prepared++; chrome.runtime.sendMessage({ type: "CHAR_PREP_PROGRESS", payload: { done: prepared, total: chars.length } }).catch(() => {}); continue; }
            try {
              // Order matters: create the entity FIRST, then upload the photo BOUND to that entity
              // (entityContext) so its workflowId is a valid character imageReference, then patch.
              let entityId = hit && isReal(hit.entityId) ? hit.entityId : null;
              if (!entityId) { entityId = await flowApi.createCharacterEntity(tabId, projectId); console.log(`[GenFlow] char "${ch.name}": entity created ${entityId}`); }
              let workflowId = null;
              if (ch.photoDataUrl) { console.log(`[GenFlow] char "${ch.name}": uploading photo…`); const up = await flowApi.uploadCharacterImage(tabId, ch.photoDataUrl, (ch.name || "char") + ".png", { projectId, entityId, imageReferenceIndex: 0 }); workflowId = up.workflowId; console.log(`[GenFlow] char "${ch.name}": photo uploaded, workflowId=${workflowId}`); }
              else { console.warn(`[GenFlow] char "${ch.name}": NO photoDataUrl — entity will have no image`); }
              await flowApi.patchCharacterEntity(tabId, projectId, entityId, { displayName: ch.name, voiceId: ch.voice || undefined, notes: ch.temperament || undefined, workflowId });
              console.log(`[GenFlow] char "${ch.name}": patched (name+photo bound) — OK`);
              cache[nameKey] = { entityId, displayName: ch.name, photoHash, voice: voiceKey };
              prepared++;
              sendLog("info", `Character prepared: ${ch.name}`);
            } catch (e) {
              console.error(`[GenFlow] char "${ch.name}" FAILED:`, e);
              sendLog("error", `Character "${ch.name}" failed: ${(e && e.message) || e}`);
            }
            chrome.runtime.sendMessage({ type: "CHAR_PREP_PROGRESS", payload: { done: prepared, total: chars.length } }).catch(() => {});
          }
          cacheAll[projectId] = cache;
          await chrome.storage.local.set({ gfCharacterEntities: cacheAll });
          sendResponse({ success: true, prepared, reused });
          // Flow caches the project's character list at page load and doesn't live-update it after
          // an API create — so refresh the Flow tab to surface the new characters in the picker.
          // Skip if a generation/download is in flight so we never interrupt a running process.
          if ((prepared - reused) > 0 && !(message.payload && message.payload.skipReload) && !state.isRunning && !state.isPaused && !state.isDownloadingAll) {
            // RACE: every Flow call runs INSIDE this tab, and Google still commits the LAST
            // character (photo -> entity binding) for a moment after our request resolves.
            // Reloading immediately aborted it, so the last character stayed a nameless
            // "Untitled Character" — always the last one, and only on slower connections
            // (fast links commit before the reload lands). Verify it settled, then reload.
            try {
              const _settleDeadline = Date.now() + 6000;
              let _ok = false;
              while (Date.now() < _settleDeadline) {
                await _sleep(700);
                try {
                  const inv = await flowApi.listProjectReferences(tabId, projectId);
                  const names = new Set(((inv && inv.characters) || []).map((c) => String(c.name || "").trim().toLowerCase()).filter(Boolean));
                  const wanted = chars.map((c) => String(c.name || "").trim().toLowerCase()).filter(Boolean);
                  if (wanted.every((n) => names.has(n))) { _ok = true; break; }
                } catch (e2) { /* keep waiting */ }
              }
              console.log("[GenFlow] PREPARE_CHARACTERS: settle before reload — " + (_ok ? "all characters visible" : "timeout, reloading anyway"));
            } catch (e) {}
            try { chrome.tabs.reload(tabId); } catch (e) {}
          }
        } catch (e) {
          sendResponse({ success: false, error: (e && e.message) || String(e) });
        }
      })();
      return true;
    }

    case "GET_STATUS":
      sendResponse({
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        activeSlots: state.activeSlots.size,
        pendingCount: state.prompts.filter((p) => p.status === "pending").length
      });
      break;
    case "GET_STATE":
      if (!state.isRunning && state.prompts.length === 0) {
        restoreState().then(() => {
          sendResponse({
            success: true,
            payload: {
              isRunning: state.isRunning,
              isPaused: state.isPaused,
              activeSlots: state.activeSlots.size,
              prompts: state.prompts.map(gfSlimPromptForUI),
              failedPromptsList: state.failedPromptsList.map(gfSlimFailedForUI)
            }
          });
        }).catch(() => {
          sendResponse({ success: true, payload: { isRunning: false, isPaused: false, activeSlots: 0, prompts: [], failedPromptsList: [] } });
        });
        return true;
      }
      sendResponse({
        success: true,
        payload: {
          isRunning: state.isRunning,
          isPaused: state.isPaused,
          activeSlots: state.activeSlots.size,
          prompts: state.prompts.map(gfSlimPromptForUI),
          failedPromptsList: state.failedPromptsList.map(gfSlimFailedForUI),
          isDownloadingAll: state.isDownloadingAll
        }
      });
      break;
    case "GENERATION_COMPLETE": {
      try {
        handleGenerationComplete(message.payload);
        sendResponse({ success: true });
      } catch (err) {
        console.error("[GenFlow] handleGenerationComplete error:", err);
        sendResponse({ success: false });
      }
      return true;
    }
    case "REQUEST_NEXT_PROMPT":
      processNextPrompt().then(() => sendResponse({ success: true })).catch((e) => {
        console.error("[GenFlow] processNextPrompt error:", e);
        sendResponse({ success: false });
      });
      return true;
    case "GROK_CREATE_STARTED":
      processNextPrompt().then(() => sendResponse({ success: true })).catch((e) => {
        console.error("[GenFlow] processNextPrompt error:", e);
        sendResponse({ success: false });
      });
      return true;
    case "EXTRACT_FIBER_PROMPT": {
      const { tileId, tabId: reqTabId } = message.payload || {};
      const targetTabId = reqTabId || sender?.tab?.id;
      if (!tileId || !targetTabId) {
        sendResponse({ prompt: null });
        break;
      }
      chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        world: "MAIN",
        func: (tileIdArg) => {
          try {
            const tile = document.querySelector('[data-tile-id="' + tileIdArg + '"]');
            if (!tile) return null;
            const keys = Object.keys(tile);
            const fiberKey = keys.find(k => k.indexOf('__reactFiber$') === 0 || k.indexOf('__reactInternalInstance$') === 0);
            if (!fiberKey) return null;
            const isName = (v) => v && typeof v === 'string' && v.trim().length > 1;
            let current = tile[fiberKey];
            for (let level = 0; level < 25 && current; level++) {
              // memoizedProps often holds the displayName/prompt for video tiles
              // (images keep it in memoizedState), so check both.
              const p = current.memoizedProps;
              if (p && typeof p === 'object') {
                if (isName(p.displayName)) return p.displayName;
                if (isName(p.prompt)) return p.prompt;
                if (isName(p.promptText)) return p.promptText;
              }
              let state = current.memoizedState;
              let stateIdx = 0;
              while (state && stateIdx < 25) {
                try {
                  const ms = state.memoizedState;
                  if (ms && typeof ms === 'object') {
                    if (isName(ms.displayName)) return ms.displayName;
                    if (isName(ms.prompt)) return ms.prompt;
                    if (isName(ms.promptText)) return ms.promptText;
                  }
                } catch(e) {}
                state = state.next;
                stateIdx++;
              }
              current = current.return;
            }
            return null;
          } catch(err) {
            return null;
          }
        },
        args: [tileId]
      }).then(results => {
        const prompt = results?.[0]?.result || null;
        sendResponse({ prompt });
      }).catch(err => {
        console.warn("[GenFlow] EXTRACT_FIBER_PROMPT error:", err);
        sendResponse({ prompt: null });
      });
      return true;
    }
    case "GENERATION_FAILED":
      handleGenerationFailed(message.payload);
      sendResponse({ success: true });
      break;
    case "POLICY_ERROR":
      handlePolicyError(message.payload);
      sendResponse({ success: true });
      break;
    case "DOWNLOAD_RESULT":
      handleDownload(message.payload);
      sendResponse({ success: true });
      break;
    case "DOWNLOAD_ALL":
      handleDownloadAll(true);
      sendResponse({ success: true });
      break;
    case "DOWNLOAD_ALL_PROJECT_MEDIA": {
      // Manual "Download All" carries its OWN params in payload.download and must NOT
      // overwrite generation settings (quality/imageQuality/outputMethod stay independent).
      const _dl = (message.payload && message.payload.download) || null;
      if (!_dl && message.payload && message.payload.settings) {
        state.settings = message.payload.settings;
      }
      const _dlMode = _dl ? _dl.mode : (state.settings && state.settings.outputMethod);
      const _dlScope = (_dl && _dl.scope) || (state.settings && state.settings.downloadAllFilter) || "all";
      state.isDownloadingAll = true;
      state.photoIndex = {};  // fresh per-number index for the gallery pass (Video_1/2 per group)
      broadcastUpdate();
      if (_dlMode === "code") {
        // Code "download all": upscale to the explicit download resolution (NOT generation quality).
        codeDownloadAll(_dlScope, _dl ? _dl.imageRes : null, _dl ? _dl.videoRes : null).catch((e) => console.error("[GenFlow][code-dl-all] crashed:", e));
        sendResponse({ success: true });
        break;
      }
      const service = state.settings?.service || "veo3";
      // Download every GENERATED result in the project (old + new). The content script already
      // excludes uploaded sources/references by React fiber-name, so no session-id restriction:
      // genIds stays empty (the per-session filter wrongly dropped the project's earlier work).
      const _synthSettings = Object.assign({}, state.settings, { downloadAllFilter: _dlScope, genIds: [] });
      sendLog("info", `Download all (clicks): all generated tiles (references excluded).`);
      findAndPrepareServiceTab(service).then((tab) => {
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "START_DOWNLOAD_ALL",
            payload: { settings: _synthSettings }
          });
          console.log(`[GenFlow] Sent START_DOWNLOAD_ALL to tab ${tab.id}`);
        } else {
          console.error(`[GenFlow] Could not find or prepare tab for service ${service}`);
          state.isDownloadingAll = false;
          broadcastUpdate();
        }
      }).catch((err) => {
        console.error("[GenFlow] DOWNLOAD_ALL_PROJECT_MEDIA error:", err);
        state.isDownloadingAll = false;
        broadcastUpdate();
      });
      sendResponse({ success: true });
      break;
    }
    case "CANCEL_DOWNLOAD_ALL": {
      if (message.payload && message.payload.settings) {
        state.settings = message.payload.settings;
      }
      state.isDownloadingAll = false;
      broadcastUpdate();
      const service = state.settings?.service || "veo3";
      findAndPrepareServiceTab(service).then((tab) => {
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "STOP_DOWNLOAD_ALL"
          });
          console.log(`[GenFlow] Sent STOP_DOWNLOAD_ALL to tab ${tab.id}`);
        }
      }).catch((err) => {
        console.error("[GenFlow] CANCEL_DOWNLOAD_ALL error:", err);
      });
      sendResponse({ success: true });
      break;
    }
    case "DOWNLOAD_ALL_FINISHED": {
      state.isDownloadingAll = false;
      broadcastUpdate();
      sendResponse({ success: true });
      break;
    }
    case "START_EXPECTING_DOWNLOAD": {
      const pid = message.payload.promptId;
      const entry = { promptId: pid, timeoutId: null };
      entry.timeoutId = setTimeout(() => {
        const i = expectingDownloads.indexOf(entry);
        if (i !== -1) {
          expectingDownloads.splice(i, 1);
          console.log(`[GenFlow] Expecting download timed out for promptId: ${pid}`);
        }
      }, 5 * 60 * 1000);
      expectingDownloads.push(entry);
      console.log(`[GenFlow] Started expecting download for promptId: ${pid} (queue: ${expectingDownloads.length})`);
      sendResponse({ success: true });
      break;
    }
    case "WAS_DOWNLOAD_RECEIVED": {
      const pid = message.payload && message.payload.promptId;
      sendResponse({ received: pid ? downloadReceivedForPrompt.has(pid) : false });
      break;
    }
    case "UPSCALE_DOWNLOAD": {
      // 2K base64 captured from Flow's upsampleImage response by the MAIN-world hook.
      // We save it ourselves (reliable, correctly named) instead of relying on Flow's blob.
      const pl = message.payload || {};
      // Dedup: multiple content listeners may forward the same hook response.
      if (pl.upscaleId) {
        if (handledUpscaleIds.has(pl.upscaleId)) { sendResponse({ success: true }); break; }
        handledUpscaleIds.add(pl.upscaleId);
      }
      let p = state.prompts.find((x) => x.id === pl.promptId) || registeredPromptById.get(pl.promptId);
      // Resolution label comes from settings.imageQuality (1K/2K/4K) via filenameResolutionLabel —
      // do NOT hardcode 2K, or 4K downloads would be mislabeled.
      const pf = p ? { ...p, isVideo: false, _resLabel: void 0 } : { number: pl.promptNumber, isVideo: false, _noModeTag: true };
      const idx = assignPhotoIndex(pf, pl.upscaleId || pl.dataUrl);
      const desired = generateFilename(pf, idx);
      // Chrome ignores download({filename}) for data: URLs. Register the name keyed by
      // the data: URL so onDeterminingFilename re-suggests it (else saved as "Untitled").
      pendingDownloadFilenames.set(pl.dataUrl, desired);
      // Robust name carrier for data: downloads (URL-key matching is unreliable under
      // concurrent move-forward downloads). Consumed in creation order by onDeterminingFilename.
      pendingDataDownloadNames.push(desired);
      try {
        chrome.downloads.download({ url: pl.dataUrl, filename: desired, conflictAction: "uniquify" }, (downloadId) => {
          if (chrome.runtime.lastError) { console.error("[GenFlow] UPSCALE_DOWNLOAD error:", chrome.runtime.lastError.message); return; }
          if (downloadId != null && pl.promptId) downloadReceivedForPrompt.add(pl.promptId); completeIfDownloading(pl.promptId);
          console.log(`[GenFlow] Upscale-hook 2K saved: ${desired} (id ${downloadId})`);
        });
      } catch (e) { console.error("[GenFlow] UPSCALE_DOWNLOAD failed:", e); }
      sendResponse({ success: true });
      break;
    }
    case "REGISTER_FILENAME_FOR_PROMPT": {
      try {
        let prompt = state.prompts.find((p) => p.id === message.payload.promptId);
        if (!prompt && message.payload.promptNumber != null) {
          prompt = state.prompts.find((p) => p.number === message.payload.promptNumber) || void 0;
        }
        const promptForFilename = prompt || { number: message.payload.promptNumber, text: message.payload.promptText || "" };
        if (message.payload.isVideo !== undefined) {
          promptForFilename.isVideo = message.payload.isVideo;
        }
        if (message.payload.resLabel) {
          promptForFilename._resLabel = message.payload.resLabel;
        }
        // The content script registers one name per result. Several results of the SAME prompt
        // (N videos of one prompt) arrive here with the same number, so an index-less name made
        // them all _Video_1 and Chrome deduped to "(1)"/"(2)". Key the per-prompt counter by the
        // result URL: distinct results number 1,2,3 and a re-register of the same URL keeps its.
        const filename = generateFilename(promptForFilename, assignPhotoIndex(promptForFilename, message.payload.url));

        if (message.payload.url) {
          pendingDownloadFilenames.set(message.payload.url, filename);
          const nameMatch = message.payload.url.match(/name=([a-f0-9-]+)/i);
          if (nameMatch) {
            pendingDownloadFilenames.set(nameMatch[1], filename);
          }
          const uuidMatch = message.payload.url.match(/([a-f0-9-]{36})/);
          if (uuidMatch) {
            pendingDownloadFilenames.set(uuidMatch[1], filename);
          }
          console.log(`[GenFlow] Pre-registered upscaled filename: ${message.payload.url} -> ${filename}`);
        }

        const promptId = message.payload.promptId || (prompt ? prompt.id : null);
        if (promptId) {
          // Keep the prompt object so onDeterminingFilename can name the download
          // even when it isn't in state.prompts (Download All Media tiles). Flag
          // download-all so the mode tag (unknown for the gallery) is omitted.
          registeredPromptById.set(promptId, { number: promptForFilename.number, text: promptForFilename.text, isVideo: promptForFilename.isVideo, _noModeTag: !prompt, _resLabel: promptForFilename._resLabel });
          downloadFilenameToPromptId.set(filename, promptId);
          if (message.payload.url) {
            downloadUrlToPromptId.set(message.payload.url, promptId);
            const nameMatch = message.payload.url.match(/name=([a-f0-9-]+)/i);
            if (nameMatch) {
              downloadUrlToPromptId.set(nameMatch[1], promptId);
            }
            const uuidMatch = message.payload.url.match(/([a-f0-9-]{36})/);
            if (uuidMatch) {
              downloadUrlToPromptId.set(uuidMatch[1], promptId);
            }
          }
        }
        sendResponse({ success: true, filename });
      } catch (err) {
        console.error("[GenFlow] REGISTER_FILENAME_FOR_PROMPT error:", err);
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }
    case "GET_SETTINGS":
      sendResponse({ success: true, settings: state.settings });
      break;
    case "CHECK_COOLDOWN":
      sendResponse({ cooldownUntil: state.cooldownUntil || 0, isRunning: state.isRunning });
      break;
    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
  return true;
});
function expandPromptsForGenerations(prompts, settings) {
  // Generations-per-Prompt expansion is for VIDEO only (veo3/grok). For images
  // (banana/whisk) the count is Images-per-Prompt, produced by the content script
  // in one submission — expanding here would wrongly duplicate image prompts.
  const isVideoSvc = settings.service === "veo3" || settings.service === "grok";
  // Stamp the media kind at START time: download naming must not depend on the
  // service selected when the file lands (switching the popup to image mode while
  // a video was still downloading renamed it "Photo_…_1K.mp4").
  prompts = prompts.map((p) => (p.isVideo === void 0 ? { ...p, isVideo: isVideoSvc } : p));
  const perPrompt = isVideoSvc ? (settings.generationsPerPrompt || 1) : 1;
  if (perPrompt <= 1)
    return prompts;
  const expanded = [];
  for (const prompt of prompts) {
    for (let i = 0; i < perPrompt; i++) {
      expanded.push({
        ...prompt,
        id: i === 0 ? prompt.id : crypto.randomUUID(),
        number: prompt.number
      });
    }
  }
  return expanded;
}
function handlePolicyError(payload) {
  const prompt = state.prompts.find((p) => p.id === payload.promptId);
  if (!prompt)
    return;
  const errorMsg = "Policy violation - prompt skipped";
  updatePromptStatus(payload.promptId, "failed", {
    error: errorMsg,
    errorType: "GENERATION_FAILED"
  });
  sendLog("warning", `Prompt #${prompt.number} skipped (policy violation)`);
  
  state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== prompt.id);
  state.failedPromptsList.push({
    prompt: {
      ...prompt,
      status: "failed",
      error: errorMsg,
      errorType: "GENERATION_FAILED"
    },
    error: errorMsg,
    errorType: "GENERATION_FAILED"
  });

  for (const [slotId, slot] of state.activeSlots.entries()) {
    if (slot.promptId === payload.promptId) {
      state.activeSlots.delete(slotId);
      break;
    }
  }
  const delay = state.settings ? getRandomDelay(state.settings) : 3e3;
  setTimeout(() => processNextPrompt(), delay);
}
async function fetchFlowSelectorsToMemory() {
  try {
    const hw = await new Promise((r) => chrome.storage.local.get(["hardwareId"], (x) => r(x && x.hardwareId)));
    const res = await fetch(`${SERVER_BASE_URL}/api/v1/config/flow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hardware_id: hw })
    });
    if (!res.ok) { console.log(`[GenFlow] flow selectors fetch: HTTP ${res.status} (using bundled defaults)`); return; }
    const data = await res.json();
    if (data && data.selectors) {
      inMemoryFlowSelectors = data.selectors;
      console.log("[GenFlow] flow selectors loaded into memory (RAM-only, not persisted)");
      // Push to any open Flow tab IN MEMORY (message only — never stored to disk).
      chrome.tabs.query({ url: ["https://labs.google/*", "https://labs.google.com/*"] }, (tabs) => {
        for (const t of (tabs || [])) {
          try { chrome.tabs.sendMessage(t.id, { type: "FLOW_SELECTORS_UPDATED", selectors: inMemoryFlowSelectors }, () => { void chrome.runtime.lastError; }); } catch (e) {}
        }
      });
    }
  } catch (e) { console.log("[GenFlow] flow selectors fetch failed (using bundled defaults):", e && e.message); }
}
async function checkCanGenerate() {
  // Server-authoritative pre-start gate. Returns false ONLY when the server clearly says the
  // daily limit is hit (free tier at 0). Fail-open on any error / not-logged-in / paid, so a
  // server hiccup never blocks a legit user.
  try {
    const { accessToken } = await chrome.storage.local.get(["accessToken"]);
    if (!accessToken) return true;
    const res = await fetch(`${SERVER_BASE_URL}/api/v1/usage/status`, { headers: { "Authorization": `Bearer ${accessToken}` } });
    if (!res.ok) return true;
    const d = await res.json();
    return d.can_generate !== false;
  } catch (e) { return true; }
}
async function getGateStatus() {
  // Variant A gate: authed=false => block (must connect Telegram). canGenerate=false => limit hit.
  // No token / 401 ALWAYS blocks (an unauthorized user has no token -> usage/track can't enforce
  // the limit -> would generate unlimited). Authed user on a transient server error fails OPEN
  // (don't block on hiccups), but never an unauthorized one.
  try {
    const { accessToken } = await chrome.storage.local.get(["accessToken"]);
    if (!accessToken) return { authed: false, canGenerate: false };
    const res = await fetch(`${SERVER_BASE_URL}/api/v1/usage/status`, { headers: { "Authorization": `Bearer ${accessToken}` } });
    if (res.status === 401) return { authed: false, canGenerate: false };
    if (!res.ok) return { authed: true, canGenerate: true };
    const d = await res.json();
    return { authed: true, canGenerate: d.can_generate !== false };
  } catch (e) { return { authed: true, canGenerate: true }; }
}
async function handleStartGeneration(payload) {
  // A full Start always runs the WHOLE queue: clear any leftover single-retry targeting
  // and any paused flag. Otherwise a stuck `retryOnlyIds` filters out the rest of the
  // queue and the run looks like it "won't start" (only the targeted item dispatches).
  state.retryOnlyIds = null;
  state.isPaused = false;
  state.limitReached = false; // fresh run: clear last run's daily-limit stop
  void fetchFlowSelectorsToMemory(); // RAM-only: refresh server selectors into memory each run
  const _gate = await getGateStatus();
  if (!_gate.authed) {
    // Variant A: require Telegram authorization before any generation. No token / 401 -> block
    // (an unauthorized user can't be limit-enforced via usage/track, so would generate unlimited).
    sendLog("warning", "Connect Telegram to start — not authorized.");
    chrome.runtime.sendMessage({ type: "AUTH_REQUIRED" }).catch(() => {});
    broadcastUpdate();
    return;
  }
  if (!_gate.canGenerate) {
    // Daily limit already hit — don't dispatch even one prompt.
    state.limitReached = true;
    sendLog("warning", "Daily limit reached — Start blocked.");
    chrome.runtime.sendMessage({ type: "LIMIT_REACHED", payload: {} }).catch(() => {});
    broadcastUpdate();
    return;
  }
  if (state.isRunning) {
    console.log("[GenFlow] Generation already running — merging new prompts into queue.");
    // For veo3 the per-prompt video count is produced by EXPANSION (N queue
  // entries via expandPromptsForGenerations below), so the content script must
  // set Flow's video-count to 1 — otherwise N entries x N Flow outputs = N*N
  // videos. Give the content generationsPerPrompt=1; expansion uses the real N.
  state.settings = payload.settings.service === "veo3" ? { ...payload.settings, generationsPerPrompt: 1 } : payload.settings;
    state.generationMode = payload.generationMode || state.generationMode;
    // Merge new prompts into existing queue
    if (payload.prompts && payload.prompts.length > 0) {
      const effectiveSettings = payload.settings;
      const newExpanded = expandPromptsForGenerations(payload.prompts, effectiveSettings);
      // Renumber new prompts starting after the last existing prompt number
      const maxNumber = state.prompts.reduce((max, p) => Math.max(max, p.number || 0), 0);
      for (let i = 0; i < newExpanded.length; i++) {
        newExpanded[i].number = maxNumber + i + 1;
        newExpanded[i].id = crypto.randomUUID();
        newExpanded[i].status = "pending";
      }
      state.prompts.push(...newExpanded);
      sendLog("info", `Added ${newExpanded.length} prompts to queue (total: ${state.prompts.length})`);
      processNextPrompt();
    }
    broadcastUpdate();
    saveState();
    return;
  }
  // For veo3 the per-prompt video count is produced by EXPANSION (N queue
  // entries via expandPromptsForGenerations below), so the content script must
  // set Flow's video-count to 1 — otherwise N entries x N Flow outputs = N*N
  // videos. Give the content generationsPerPrompt=1; expansion uses the real N.
  state.settings = payload.settings.service === "veo3" ? { ...payload.settings, generationsPerPrompt: 1 } : payload.settings;
  state.generationMode = payload.generationMode || "single";
  state.isRunning = true;
  state.isPaused = false;
  state.nextDispatchAllowedAt = 0;
  state.dispatchCounts = {};
  state._dlGraceTicks = 0;
  state.cooldownUntil = 0;
  state.cooldownReason = "";
  state.stopReason = "";
  state.consecutiveSuspicious = 0;
  state._consecFail = 0;
  state.retryOnlyIds = null;
  state.activeSlots.clear();
  state.lastResultUrl = null;
  state.batchDownloadUrls = [];
  state.processedDownloadUrls.clear();
  // Bug#1 fix: DON'T wipe the Failed list on a fresh Start — the user may want to retry these
  // failures on a newly-selected model (e.g. Pro hit limits -> switch to NB2 -> Retry). Keep the
  // entries; only drop the stale isRetrying flag from the previous (now-discarded) run so they
  // render as Failed again. Retry re-adds them to the queue since state.prompts is rebuilt below.
  // Use the trash / Clear-All buttons to reset the Failed list explicitly.
  if (!Array.isArray(state.failedPromptsList)) state.failedPromptsList = [];
  for (const _f of state.failedPromptsList) { if (_f) { _f.isRetrying = false; if (_f.prompt) _f.prompt.status = "failed"; } }
  state.photoIndex = {};
  stallWarningLoggedForSlot.clear();
  // Clear the previous run's download bookkeeping so a fresh run never inherits a stale
  // "tail" (which caused wrong filenames / false-fails when switching mode or service).
  // The prompt queue & statuses come fresh from the payload below — untouched here.
  downloadReceivedForPrompt.clear();
  handledUpscaleIds.clear();
  expectingDownloads.length = 0;
  try {
    const tabs = await chrome.tabs.query({ url: ["*://labs.google/*", "*://labs.google.com/*"] });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "RESET_CONTENT_STATE" }).catch(() => {
        });
      }
    }
  } catch {
  }
  const startFrom = (payload.settings.startFromPrompt || 1) - 1;
  const sliced = payload.prompts.slice(startFrom);
  const effectiveSettings = payload.settings;
  state.prompts = expandPromptsForGenerations(sliced, effectiveSettings);
  // Bug#1 note: the Failed list is preserved across this Start (above). No ghost-cleanup is needed
  // because the popup's Start payload contains only PENDING prompts (failed ones are excluded), so
  // a fresh Start never re-runs the preserved failures — they stay in the Failed panel until the
  // user retries them (Retry re-adds them to the queue) or clears them (Trash / Clear-All).
  const modeInfo = state.generationMode !== "single" ? ` (${state.generationMode} mode)` : "";
  sendLog("info", `Starting generation with ${state.prompts.length} prompts${modeInfo}`);
  await processNextPrompt();
}
// ---------------------------------------------------------------------------
// Code-path runner (input=code -> mode 3). Generates via the Flow API
// (flowApi.js) and downloads results directly. Mode 1 (synthetic) is untouched.
// Reuses the daily-limit gate + usage tracking + handleDownload so limits and
// naming stay consistent. Stop is honored via state.isRunning.
// ---------------------------------------------------------------------------
// Mirror a code-mode failure into state.failedPromptsList so it shows in the Failed panel
// (same shape the synthetic path pushes). _code + _mediaId let retry route to the code path.
function pushCodeFailure(p, errorMsg, errorType, resultUrl, mediaId) {
  if (!p || !p.id) return;
  if (!Array.isArray(state.failedPromptsList)) state.failedPromptsList = [];
  const _base = state.prompts.find((x) => x.id === p.id) || p;
  state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== p.id);
  state.failedPromptsList.push({
    prompt: { ..._base, status: "failed", error: errorMsg, errorType, resultUrl: resultUrl || null, _code: true, _mediaId: mediaId || null },
    error: errorMsg, errorType, resultUrl: resultUrl || null,
  });
  gfNoteFailStreak(errorMsg);  // CODE-path terminal failure -> bump the consecutive-error breaker (throttle self-excluded)
}
// Code-aware single-prompt retry. UPSCALE_FAILED with a known image mediaId -> re-upscale+download
// the SAME media (no regeneration, saves a generation). Otherwise -> regenerate via runFlowApiBatch.
async function handleCodeRetry(promptId, newText) {
  const entry = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
  const prompt = (entry && entry.prompt) || state.prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  const errorType = entry ? entry.errorType : prompt.errorType;
  const mediaId = prompt._mediaId;
  const resultUrl = (entry && entry.resultUrl) || prompt.resultUrl || "";
  if (newText !== undefined && newText !== null) {
    const _sp = state.prompts.find((p) => p.id === promptId);
    if (_sp) _sp.text = newText;
  }
  if (entry && entry.prompt && newText !== undefined && newText !== null) entry.prompt.text = newText;
  const text = (state.prompts.find((p) => p.id === promptId) || prompt).text;
  // Clicks-parity: KEEP the item in the Failed list while retrying — it clears ONLY on success.
  const clearFailed = () => { state.failedPromptsList = state.failedPromptsList.filter((f) => !(f.prompt && f.prompt.id === promptId)); };
  updatePromptStatus(promptId, "processing", { info: "Retrying…" });
  broadcastUpdate();
  // REUSE: image download/upscale failure with a known mediaId -> just re-upscale+download.
  if (errorType === "UPSCALE_FAILED" && mediaId) {
    try {
      const tabId = await flowApi.getFlowTabId();
      if (tabId) {
        const _q = String((state.settings && state.settings.imageQuality) || "1k").toLowerCase();
        let dataUrl = null, resLab = "1K";
        if (_q === "2k" || _q === "4k") {
          try { dataUrl = await flowApi.upscaleImage(tabId, mediaId, _q, { onRetry: (i) => sendLog("warning", `#${prompt.number}: reCAPTCHA throttle — retry ${i && i.attempt}/${i && i.max}…`) }); if (dataUrl) resLab = (_q === "4k" ? "4K" : "2K"); }
          catch (e) { if (_q === "4k") { try { dataUrl = await flowApi.upscaleImage(tabId, mediaId, "2k"); if (dataUrl) resLab = "2K"; } catch (e2) {} } }
        }
        if (!dataUrl && resultUrl) { try { dataUrl = await flowApi.fetchAsDataUrl(tabId, resultUrl); resLab = "1K"; } catch (e) {} }
        if (dataUrl) {
          // Retry path: a fixed 1 collided with the result this prompt already produced. Keyed
          // by mediaId so repeating the same retry reuses its index instead of taking a new one.
          const fname = generateFilename({ number: prompt.number, text, _resLabel: resLab }, assignPhotoIndex({ number: prompt.number }, mediaId || resultUrl));
          pendingDownloadFilenames.set(dataUrl, fname); pendingDataDownloadNames.push(fname);
          try { chrome.downloads.download({ url: dataUrl, filename: fname, conflictAction: "uniquify" }); } catch (e) {}
          updatePromptStatus(promptId, "completed", { info: null, error: null, errorType: null, resultUrl: resultUrl || null, completedAt: Date.now() });
          clearFailed();  // success -> remove from Failed
          sendLog("success", `#${prompt.number}: re-downloaded (${resLab}).`);
          broadcastUpdate();
          return;
        }
      }
    } catch (e) { console.error("[GenFlow][code-retry] reuse failed:", e); }
    // reuse failed -> revert to failed, stay in Failed, don't hang. User can retry again.
    updatePromptStatus(promptId, "failed", { info: null, errorType: "UPSCALE_FAILED" });
    pushCodeFailure(prompt, "Re-upscale/download failed", "UPSCALE_FAILED", resultUrl, mediaId);
    sendLog("error", `#${prompt.number}: retry failed — still in Failed.`);
    broadcastUpdate();
    return;
  }
  // REGEN: re-run this prompt through the code path. The worker CLEARS it from Failed on success and
  // re-adds it (pushCodeFailure) on failure, so it stays in Failed until it actually passes.
  // Bug#1 fix (code path): if a prior fresh Start/batch rebuilt the queue, this failure's id is gone
  // from state.prompts -> updatePromptStatus + runFlowApiBatch(isRetry) would both no-op. Re-add it
  // (from the preserved Failed entry) so the code-retry actually dispatches on the current model.
  if (!state.prompts.some((x) => x.id === promptId)) {
    state.prompts.push({ ...prompt, id: promptId, text, status: "failed", error: void 0, retryCount: prompt.retryCount || 0, _code: true });
  }
  updatePromptStatus(promptId, "pending", { info: "Retrying…" });
  if (state._apiRunning) {
    // A batch is live -> hand the prompt to the running workers (they loop over state.apiPrompts).
    state.apiPrompts.push(Object.assign({}, prompt, { id: promptId, text, status: "pending" }));
    sendLog("info", `#${prompt.number}: queued for retry in the running batch.`);
    broadcastUpdate();
  } else {
    state.retryOnlyIds = new Set([promptId]);
    runFlowApiBatch({ isRetry: true, settings: state.settings }).catch((e) => console.error("[GenFlow][code-retry] regen failed:", e));
  }
}
// Native characters in code-mode generation: split a prompt's text into structuredPrompt parts,
// replacing each character name with a {reference:{entity:{handle,entityId}}} part (names not found
// literally in the text are appended as references). Mirrors Flow's @-mention serialization.
function buildStructuredParts(text, chars) {
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [];
  for (const c of chars) {
    let start = -1;
    try { const m = new RegExp("(^|[^\\p{L}\\p{N}])(" + esc(c.name) + ")", "iu").exec(text); if (m) start = m.index + (m[1] ? m[1].length : 0); } catch (e) {}
    matches.push({ start, end: start >= 0 ? start + c.name.length : -1, name: c.name, entityId: c.entityId });
  }
  const inText = matches.filter((m) => m.start >= 0).sort((a, b) => a.start - b.start);
  const notInText = matches.filter((m) => m.start < 0);
  const parts = [];
  let cur = 0, lastEnd = -1;
  for (const m of inText) {
    if (m.start < lastEnd) continue;
    if (m.start > cur) { const t = text.slice(cur, m.start); if (t) parts.push({ text: t }); }
    parts.push({ reference: { entity: { handle: m.name, entityId: m.entityId } } });
    cur = m.end; lastEnd = m.end;
  }
  if (cur < text.length) { const t = text.slice(cur); if (t) parts.push({ text: t }); }
  for (const m of notInText) parts.push({ reference: { entity: { handle: m.name, entityId: m.entityId } } });
  if (!parts.length) parts.push({ text: String(text) });
  return parts;
}

// Resolve the named references on a prompt to native Flow character entities (reusing the prepared
// cache, auto-preparing any that are missing), then build structuredPrompt parts + referenceEntities.
// Returns null when the prompt has no named characters (-> caller keeps the old upload path).
function _gfNorm(s) { return String(s || "").normalize("NFC").trim().toLowerCase(); }
function _gfWordHit(name, text) {
  if (!name || !text) return false;
  try { return new RegExp("(^|[^\\p{L}\\p{N}])" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\p{L}\\p{N}]|$)", "u").test(text); }
  catch (e) { return text.indexOf(name) >= 0; }
}
async function resolveCharactersForPrompt(tabId, prompt) {
  if (state.settings && state.settings.gfApplyRefs === false) return null;
  // Gate on the Reference toggle (gfApplyRefs) only. We must NOT also require
  // prompt.gfApplyChars: that flag is set solely by the IMAGE editor's gfEnrich
  // (popup ~12979) — VIDEO prompts are built by the video editor and never carry
  // it, so requiring it blocked code-mode video references entirely. For images
  // gfApplyRefs ON already implies the prompt was tagged, so dropping the check is
  // a no-op there; for video it restores name-based references.
  if (!prompt) return null;
  const projectId = await flowApi.getProjectId(tabId);
  if (!projectId) return null;
  const store = await chrome.storage.local.get("gfCharacterEntities");
  const cacheAll = store.gfCharacterEntities || {};
  const cache = cacheAll[projectId] || {};
  // Authoritative name -> REAL entityId from the API inventory. The gfCharacterEntities cache can
  // hold "imported_<uuid>" PLACEHOLDER ids (written by the clicks-mode auto-import, which attaches
  // by NAME and never needs a real id) — those must NEVER be sent to the API for code generation.
  const isReal = (id) => !!id && !String(id).startsWith("imported_");
  const invMap = {}; let invChars = [];
  try {
    const inv = await getRefInventory(tabId);
    if (inv && inv.ok) { invChars = inv.characters || []; for (const c of invChars) { if (c.entityId) invMap[_gfNorm(c.name)] = c.entityId; } }
  } catch (e) {}
  const named = []; const seen = /* @__PURE__ */ new Set();
  // (a) Names from the popup table (referenceDisplayNames + photos) — may auto-prepare.
  const names = Array.isArray(prompt.referenceDisplayNames) ? prompt.referenceDisplayNames : [];
  const photos = Array.isArray(prompt.referenceImageUrls) ? prompt.referenceImageUrls : [];
  for (let i = 0; i < names.length; i++) { const nm = String(names[i] || "").trim(); const k = _gfNorm(nm); if (nm && !seen.has(k)) { seen.add(k); named.push({ name: nm, photo: photos[i] || null }); } }
  const _txt = _gfNorm(prompt.text || "");
  // (b) Characters from the API inventory whose name appears in the prompt — REAL entityId, no
  // prior "Prepare" needed. Authoritative, so it runs before the cache.
  for (const c of invChars) {
    const nk = _gfNorm(c.name);
    if (!nk || seen.has(nk) || !c.entityId) continue;
    if (_gfWordHit(nk, _txt)) { seen.add(nk); named.push({ name: c.name, photo: null, _entityId: c.entityId }); }
  }
  // (c) Prepared characters in the cache whose name appears in the prompt — only with a REAL id
  // (skip "imported_" placeholders so a fake id can never shadow / be sent).
  for (const k in cache) {
    const nk = _gfNorm(k);
    if (!nk || seen.has(nk) || !(cache[k] && isReal(cache[k].entityId))) continue;
    if (_gfWordHit(nk, _txt)) { seen.add(nk); named.push({ name: cache[k].displayName || k, photo: null, _entityId: cache[k].entityId }); }
  }
  if (!named.length) return null;
  const resolved = [];
  for (const c of named) {
    const key = _gfNorm(c.name);
    // Prefer the inventory's real id; never trust an "imported_" placeholder.
    let entityId = invMap[key] || (isReal(c._entityId) ? c._entityId : null) || (cache[key] && isReal(cache[key].entityId) ? cache[key].entityId : null);
    if (!entityId) {
      try {
        entityId = await flowApi.createCharacterEntity(tabId, projectId);
        let workflowId = null;
        if (c.photo) { const up = await flowApi.uploadCharacterImage(tabId, c.photo, c.name + ".png", { projectId, entityId, imageReferenceIndex: 0 }); workflowId = up.workflowId; }
        await flowApi.patchCharacterEntity(tabId, projectId, entityId, { displayName: c.name, workflowId });
        cache[key] = { entityId, displayName: c.name, photoHash: "", voice: "" };
        sendLog("info", `Auto-prepared character: ${c.name}`);
      } catch (e) { sendLog("error", `Character "${c.name}" auto-prepare failed: ${(e && e.message) || e}`); continue; }
    }
    resolved.push({ name: c.name, entityId });
  }
  cacheAll[projectId] = cache;
  try { await chrome.storage.local.set({ gfCharacterEntities: cacheAll }); } catch (e) {}
  if (!resolved.length) return null;
  return { structuredParts: buildStructuredParts(String(prompt.text || ""), resolved), referenceEntities: resolved.map((r) => ({ entityId: r.entityId })), characterNames: resolved.map((r) => r.name) };
}
// Per-batch reference inventory (objects + characters) from the Flow API — ONE GET
// (flow.projectInitialData), cached on state and refreshed once per batch. Layer-1 source
// of truth: code mode reads it here; clicks mode fetches the same endpoint in the content
// script. mediaId == metadata.primaryMediaId is a bare UUID — the same id space the proven
// DOM-scan path feeds into referenceMediaIds (extractMediaNameFromUrl), so it is a valid
// reference id for generation.
async function getRefInventory(tabId) {
  let pid = null;
  try { pid = await flowApi.getProjectId(tabId); } catch (e) {}
  // Reuse only a SUCCESSFUL cache for this project (never a poisoned empty result).
  if (state._refInventory && state._refInventory.ok && state._refInventory.projectId === pid) return state._refInventory;
  // De-dupe concurrent callers (parallel film streams call this at once) onto ONE in-flight
  // fetch, so a racing duplicate request can't fail and overwrite a good result.
  if (state._refInventoryPromise) return state._refInventoryPromise;
  state._refInventoryPromise = (async () => {
    let inv = { projectId: pid, objects: [], characters: [], ok: false };
    try {
      const r = await flowApi.listProjectReferences(tabId);
      if (r && r.ok) {
        inv = { projectId: pid, objects: r.objects || [], characters: r.characters || [], ok: true };
        sendLog("info", `Code: reference inventory via API — ${inv.objects.length} object(s), ${inv.characters.length} character(s)`);
      }
    } catch (e) { sendLog("warning", `Code: reference API failed (${(e && e.message) || e})`); }
    if (inv.ok) state._refInventory = inv;   // only cache success — a failure must not poison the batch
    state._refInventoryPromise = null;
    return inv;
  })();
  return state._refInventoryPromise;
}

// CODE-mode objects by name: match the prompt text against the project's uploaded objects
// (from the API inventory; legacy DOM scan as fallback) and return the matching mediaIds to
// pass as reference images. Gated on Apply mode like characters.
async function resolveObjectsForPrompt(tabId, prompt, excludeNames) {
  if (state.settings && state.settings.gfApplyRefs === false) return [];
  // Same reasoning as resolveCharactersForPrompt: gate on the Reference toggle only,
  // not on prompt.gfApplyChars (which video prompts never carry).
  if (!prompt) return [];
  // Prefer the API inventory (one GET, complete, no scroll). Fall back to the legacy
  // content-script DOM scan only if the API returned nothing this batch.
  const inv = await getRefInventory(tabId);
  let items = inv.objects;
  if (!inv.ok || !items.length) {
    if (!Array.isArray(state._codeLibObjects)) {
      let scanned = [];
      try {
        const resp = await chrome.tabs.sendMessage(tabId, { type: "GF_LIST_LIB_OBJECTS" });
        if (resp && resp.ok && Array.isArray(resp.items)) scanned = resp.items;
      } catch (e) { sendLog("warning", `Code: library scan failed (${(e && e.message) || e}) — objects skipped`); }
      state._codeLibObjects = scanned;
      if (scanned.length) sendLog("info", `Code: scanned ${scanned.length} library object(s) by name (DOM fallback)`);
    }
    items = state._codeLibObjects || [];
  }
  // Build exclude set from popup-table objects already uploaded via objectImageUrls
  const _excl = new Set((excludeNames || []).map(_gfNorm).filter(Boolean));
  const _txt = _gfNorm(prompt.text || "");
  const out = []; const seen = /* @__PURE__ */ new Set();
  for (const it of items) {
    const nk = _gfNorm(it && it.name);
    if (!nk || seen.has(nk) || !it.mediaId || _excl.has(nk)) continue;
    if (_gfWordHit(nk, _txt)) { seen.add(nk); out.push(it.mediaId); }
  }
  return out;
}

async function runFlowApiBatch(payload) {
  if (state._apiRunning) { console.log("[GenFlow][API] duplicate RUN ignored (already running)"); return; }
  state._apiRunning = true;
  const _myGen = (state._apiGen = (state._apiGen || 0) + 1);  // batch generation: a newer batch or a Stop invalidates this one
  state._nextDispatchAt = 0;  // reset the global dispatch gate so a slot reserved by a prior batch can't stall this one
  state._consecFail = 0;  // fresh consecutive-error streak per batch (code path enters HERE, not via handleStartGeneration)
  state._codeLibObjects = void 0;  // re-scan the library (objects by name) fresh for this run
  state._refInventory = void 0;    // refresh API reference inventory once per batch
  state._refInventoryPromise = void 0;  // drop any stale in-flight inventory fetch
  try {
  if (payload.isRetry) {
    state.apiPrompts = state.prompts.filter(p => p.status === "pending" && (state.retryOnlyIds ? state.retryOnlyIds.has(p.id) : true));
  } else {
    state.apiPrompts = ((payload && payload.prompts) || []).map(p => Object.assign({}, p, { id: p.id || crypto.randomUUID(), status: p.status || "pending", isVideo: p.isVideo !== void 0 ? p.isVideo : (((payload && payload.settings) || state.settings || {}).service === "veo3") }));
    state.prompts = [...state.apiPrompts];
  }
  const settings = (payload && payload.settings) || state.settings || {};
  const isVideo = settings.service === "veo3";
  console.log("[GenFlow][API] runFlowApiBatch START prompts=", state.apiPrompts.length, "service=", settings.service, "input=", settings.inputMethod, "output=", settings.outputMethod);

  state.retryOnlyIds = null;
  state.isPaused = false;
  state.limitReached = false;
  state.settings = settings; // generateFilename() + download logic read state.settings
  if (payload && payload.generationMode) state.generationMode = payload.generationMode; // Film needs strict sequential order (see maxConcurrency)

  const gate = await getGateStatus();
  if (!gate.authed) {
    sendLog("warning", "Connect Telegram to start — not authorized.");
    chrome.runtime.sendMessage({ type: "AUTH_REQUIRED" }).catch(() => {});
    broadcastUpdate();
    return;
  }
  if (!gate.canGenerate) {
    state.limitReached = true;
    sendLog("warning", "Daily limit reached — Start blocked.");
    chrome.runtime.sendMessage({ type: "LIMIT_REACHED", payload: {} }).catch(() => {});
    broadcastUpdate();
    return;
  }

  console.log("[GenFlow][API] gate passed:", JSON.stringify(gate));
  const tabId = await flowApi.getFlowTabId();
  console.log("[GenFlow][API] flow tabId:", tabId);
  if (!tabId) {
    sendLog("error", "No Flow tab open — open a Google Flow project tab first.");
    broadcastUpdate();
    return;
  }
  const ready = await flowApi.probe();
  console.log("[GenFlow][API] probe:", JSON.stringify(ready));
  if (!ready.ready) {
    const why = ready.reason === "no_flow_tab" ? "no Flow tab"
      : !ready.hasToken ? "no Flow session token"
      : !ready.hasRecaptcha ? "reCAPTCHA blocked — refresh the Flow page / disable VPN"
      : !ready.projectId ? "open a Flow project first"
      : "unknown";
    sendLog("error", "Flow API not ready (" + why + ").");
    broadcastUpdate();
    return;
  }

  state.isRunning = true;
  broadcastUpdate();
  chrome.runtime.sendMessage({ type: "API_PREVIEW_RESET", payload: { slots: state.apiPrompts.map((pp, ii) => ({ number: (pp && pp.number) || ii + 1, prompt: typeof pp === "string" ? pp : (pp.text || pp.prompt || ""), status: "queued" })) } }).catch(() => {});
  sendLog("info", `API mode: starting ${state.apiPrompts.length} prompt(s) as ${isVideo ? "video" : "image"}.`);

  const imageCount = isVideo ? 1 : Math.max(1, Number(settings.generationsPerPrompt || settings.imageCount || 1));
  let done = 0;
  let _filmPrevImageMediaId = null; // image-Film chain: each frame continues from the previous frame's result (banana). Sequential (maxConcurrency=1) keeps this race-free.

  const _vThreads = Math.max(1, Math.min(parseInt(settings.maxVideoThreads, 10) || 6, 6));   // video: 1-6
  const _iThreads = Math.max(1, Math.min(parseInt(settings.maxImageThreads, 10) || 2, 4));   // photo in CODE mode: capped at 4 (reCAPTCHA-sensitive)
  // Film is a SEQUENCE (chain): segments must run strictly one-at-a-time in order, like the click mode
  // does (it always dispatches only the first-not-done frame). Parallel threads would scramble the order.
  const maxConcurrency = (state.generationMode === "film" && settings.service !== "veo3") ? 1 : (isVideo ? _vThreads : _iThreads);  // else respect user's Max Threads (clamped)
  let currentIndex = 0;

  async function worker(wIdx) {
    while (currentIndex < state.apiPrompts.length) {
      if (state._apiGen !== _myGen || !state.isRunning || state.limitReached) break;
      while (state.isPaused && state._apiGen === _myGen && state.isRunning) await new Promise((res) => setTimeout(res, 400));  // Pause: hold here, don't start new prompts
      if (state._apiGen !== _myGen || !state.isRunning) break;
      while (state.isRunning && state.cooldownUntil && Date.now() < state.cooldownUntil) await new Promise((res) => setTimeout(res, 500));  // honor the global rate-limit / reCAPTCHA cooldown
      if (state._apiGen !== _myGen || !state.isRunning) break;
      // GLOBAL dispatch gate: reserve the next start slot atomically (synchronous read+write BEFORE any
      // await), so EVERY prompt-start is spaced by one interval — across all threads and regardless of
      // cooldown/backoff timing. Replaces the old per-worker re-stagger, which only fired if the worker
      // happened to sit in the cooldown wait loop (so after reCAPTCHA two cards could start at once).
      {
        const _gap = settings ? getRandomDelay(settings) : 1200;
        const _now = Date.now();
        const _slot = Math.max(_now, state._nextDispatchAt || 0);
        state._nextDispatchAt = _slot + _gap;
        if (_slot > _now) await new Promise((res) => setTimeout(res, _slot - _now));
        if (state._apiGen !== _myGen || !state.isRunning) break;
      }
      const pi = currentIndex++;
      const p = state.apiPrompts[pi];
      const text = typeof p === "string" ? p : (p.text || p.prompt || "");
      if (!text) continue;
      const number = (p && p.number) || pi + 1;
    chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "generating" } }).catch(() => {});
    if (p.id) updatePromptStatus(p.id, "processing");

    let _phase = "generation"; let _resUrl = ""; let _resMediaId = "";  // phase drives errorType in the catch (GENERATION_FAILED vs UPSCALE_FAILED)
    const _onRetry = (info) => {
      const _ps = Math.max(0, Number(state.settings?.rateLimitPauseSec ?? 10));
      const _isLimit = info && (info.recaptcha || info.status === 429);
      if (_isLimit && _ps > 0) {
        // reCAPTCHA/UNUSUAL_ACTIVITY OR 429 rate-limit -> apply the user's "Pause on limit" as a GLOBAL
        // cooldown so every worker backs off for a bit and the score/limit recovers (same lever as synthetic).
        state.cooldownUntil = Math.max(state.cooldownUntil || 0, Date.now() + _ps * 1000);
        state.cooldownReason = info.recaptcha ? "reCAPTCHA" : "Rate limit";
        broadcastUpdate();
      }
      sendLog("warning", `#${number}: ${info && info.recaptcha ? "reCAPTCHA" : "rate-limit 429"}${_isLimit && _ps > 0 ? " — pausing " + _ps + "s" : ""} — retry ${info ? info.attempt : "?"}/${info ? info.max : "?"}…`);
    };
    try {
      if (isVideo) {
        sendLog("info", `#${number}: generating video…`);
        // Real settings fields: model ("veo3.1-fast"), generationType ("text-to-video"), aspectRatio, videoDuration ("8s").
        const _vmodel = String(settings.model || "").toLowerCase();
        const _vq = _vmodel.indexOf("fast") >= 0 ? "fast" : _vmodel.indexOf("quality") >= 0 ? "quality" : _vmodel.indexOf("lite") >= 0 ? "lite" : (_vmodel.indexOf("omni") >= 0 || _vmodel.indexOf("flash") >= 0) ? "omni_flash" : "fast";
        const _vgt = String(settings.generationType || "").toLowerCase();
        let _vmode = _vgt.indexOf("reference") >= 0 ? "reference" : (_vgt.indexOf("start") >= 0 && _vgt.indexOf("end") >= 0) ? "start_end_frame" : (_vgt.indexOf("image") >= 0 || _vgt.indexOf("frame") >= 0) ? "start_frame" : "text";
        // generationType is just "image-to-video" for ALL image modes (Single/Multi/Film) — it can't
        // distinguish a single start frame from a start+end pair (Multi) or references. The frames THIS
        // prompt actually carries are the ground truth, so refine the mode from them when in an image mode.
        if (_vmode !== "text") {
          if (Array.isArray(p.referenceImageUrls) && p.referenceImageUrls.length) _vmode = "reference";
          else if (p.imageUrl && p.endImageUrl) _vmode = "start_end_frame";
          else if (p.imageUrl) _vmode = "start_frame";
        }
        const _vdur = parseInt(String(settings.videoDuration || "8"), 10) || 8;
        const _vratio = String(settings.aspectRatio || "").indexOf("9:16") >= 0 ? "portrait" : "landscape";
        console.log("[GenFlow][API] video map model=" + settings.model + " -> q=" + _vq + " mode=" + _vmode + " dur=" + _vdur + " ratio=" + _vratio);
        // image-to-video: a local start/end/reference image (sent by the popup as a data URL) must be
        // uploaded into Flow first to obtain a mediaId — the video API takes a mediaId, not raw bytes.
        let _startMediaId, _endMediaId;
        let _refMediaIds = [];   // library OBJECTS (by mediaId) + popup-uploaded reference images
        let _refEntityIds = [];  // native CHARACTERS (by entityId)
        if (_vmode === "start_frame" || _vmode === "start_end_frame") {
          if (!p.imageUrl) throw new Error("image-to-video: no start image attached to this prompt");
          sendLog("info", `#${number}: uploading start frame…`);
          _startMediaId = await flowApi.uploadImage(tabId, p.imageUrl, `start_${number}.png`, { onRetry: (i) => sendLog("warning", `#${number}: image upload retry ${i.attempt}/${i.max}…`) });
          if (_vmode === "start_end_frame" && p.endImageUrl) {
            sendLog("info", `#${number}: uploading end frame…`);
            _endMediaId = await flowApi.uploadImage(tabId, p.endImageUrl, `end_${number}.png`);
          }
        } else if (_vmode === "reference") {
          // popup-attached reference images (uploaded fresh each run)
          const _refUrls = Array.isArray(p.referenceImageUrls) ? p.referenceImageUrls : [];
          for (let _ri = 0; _ri < _refUrls.length; _ri++) {
            sendLog("info", `#${number}: uploading reference ${_ri + 1}/${_refUrls.length}…`);
            _refMediaIds.push(await flowApi.uploadImage(tabId, _refUrls[_ri], `ref_${number}_${_ri}.png`));
          }
        }
        // Native characters (entities) + library objects (by name) — gated on Apply mode inside the
        // resolvers. Characters → referenceEntities, objects → referenceImages; both force r2v mode.
        try {
          const _charRes = await resolveCharactersForPrompt(tabId, p);
          if (_charRes && Array.isArray(_charRes.referenceEntities) && _charRes.referenceEntities.length) {
            _refEntityIds = _charRes.referenceEntities.map((e) => e && e.entityId).filter(Boolean);
            if (Array.isArray(_charRes.characterNames)) p.referenceDisplayNames = _charRes.characterNames;
            sendLog("info", `#${number}: + ${_refEntityIds.length} character(s) by name`);
          }
          const _objMids = await resolveObjectsForPrompt(tabId, p, (_charRes && _charRes.characterNames) || []);
          if (_objMids && _objMids.length) {
            _refMediaIds = [..._refMediaIds, ..._objMids];
            sendLog("info", `#${number}: + ${_objMids.length} library object(s) by name`);
          }
        } catch (e) { sendLog("error", `#${number}: reference resolve failed: ${(e && e.message) || e}`); }
        // Any reference (object image or character entity) → must use the reference video method.
        if ((_refMediaIds.length || _refEntityIds.length) && _vmode === "text") _vmode = "reference";
        if (_vmode === "reference" && !_refMediaIds.length && !_refEntityIds.length)
          throw new Error("reference-to-video: no references resolved for this prompt");
        const r = await flowApi.generateVideoAndWait(tabId, text, {
          videoQuality: _vq,
          videoRatio: _vratio,
          videoMode: _vmode,
          videoDuration: _vdur,
          startFrameMediaId: _startMediaId,
          endFrameMediaId: _endMediaId,
          referenceMediaIds: _refMediaIds,
          referenceEntities: _refEntityIds,
          onTick: (n) => { if (n % 6 === 0) sendLog("info", `#${number}: rendering… ${n * 5}s`); },
          onRetry: _onRetry,
        });
        console.log("[GenFlow][API] #" + number + " video op=" + (r && r.operationName) + " downloadUrl=" + (r && r.downloadUrl ? "ok" : "NULL"));
        if (r.downloadUrl) {
          _phase = "download"; _resUrl = r.downloadUrl;
          state.generatedMediaIds = state.generatedMediaIds || new Set();
          for (const _src of [r.downloadUrl, r.operationName]) { const _vm = String(_src || "").match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); if (_vm) state.generatedMediaIds.add(_vm[1].toLowerCase()); }
          let _vurl = r.downloadUrl;
          const _vq2 = String(settings.quality || "").toLowerCase();
          const _vUpNeeded = (_vq2.indexOf("1080") >= 0 || _vq2.indexOf("4k") >= 0);
          const _vlabel = _vq2.indexOf("4k") >= 0 ? "4K" : "1080p";
          let _vUpDone = false;
          if (_vUpNeeded && r.operationName && r.workflowId) {
            try {
              chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "generating", info: _vlabel } }).catch(() => {});
              if (p.id) updatePromptStatus(p.id, "processing", { info: `Upscaling ${_vlabel}...` });
              const _upOp = await flowApi.upscaleVideo(tabId, r.operationName, r.workflowId, { projectId: r.projectId, quality: _vq2, aspectRatio: _vratio === "portrait" ? "VIDEO_ASPECT_RATIO_PORTRAIT" : "VIDEO_ASPECT_RATIO_LANDSCAPE" });
              if (_upOp) {
                const _upUrl = await flowApi.pollVideoStatus(tabId, _upOp, r.projectId);
                if (_upUrl) { _vurl = _upUrl; _vUpDone = true; }
              }
            } catch (e) { console.error("[GenFlow][API] #" + number + " video upscale failed:", e); }
          }
          // Resolution rule: 1080/4K was ordered but the upscale didn't produce it — never save
          // base 720. Throw so the outer catch records UPSCALE_FAILED (retryable, keeps the URL)
          // instead of silently downloading the wrong size.
          if (_vUpNeeded && !_vUpDone) {
            throw new Error(`Upscale to ${_vlabel} failed`);
          }
          // Honor the auto-download toggle: code-mode generates regardless, but
          // only save to disk when auto-download is on. Off = result stays in the
          // project; the user downloads it manually.
          // N videos of one prompt are expanded into N entries that all share the same number,
          // so a hardcoded index named every file Video_1 and Chrome deduped them into
          // "(1)"/"(2)". Use the same per-prompt counter the naming event uses, keyed by the
          // video URL so a retry of the same clip keeps its index instead of taking a new one.
          if (state.settings && state.settings.autoDownload !== false) await handleDownload({ url: _vurl, filename: generateFilename({ number, text }, assignPhotoIndex({ number }, _vurl)) });
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "done", url: r.downloadUrl, type: "video" } }).catch(() => {});
          if (p.id) { updatePromptStatus(p.id, "completed", { resultUrl: r.downloadUrl, info: null, completedAt: Date.now() }); state.failedPromptsList = state.failedPromptsList.filter((f) => !(f.prompt && f.prompt.id === p.id)); }
          await trackUsageOnServer("veo3");
          done++;
        } else {
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "failed" } }).catch(() => {});
          if (p.id) updatePromptStatus(p.id, "failed", { info: null, errorType: "GENERATION_FAILED" });
          pushCodeFailure(p, "Video failed or timed out", "GENERATION_FAILED", null, null);
          sendLog("error", `#${number}: video failed or timed out.`);
        }
      } else {
        // Native characters: resolve the prompt's named references to Flow entities (auto-preparing
        // any not prepared yet). When present, the character carries its own photo, so we skip
        // re-uploading reference photos and pass structuredParts + referenceEntities instead.
        let _charRes = null;
        try {
          _charRes = await resolveCharactersForPrompt(tabId, p);
          if (_charRes && Array.isArray(_charRes.characterNames)) {
            p.referenceDisplayNames = _charRes.characterNames;
          }
        } catch (e) { sendLog("error", `#${number}: character resolve failed: ${(e && e.message) || e}`); }
        let _imgRefMediaIds;
        if (!_charRes) {
          const _imgRefUrls = Array.isArray(p.referenceImageUrls) ? p.referenceImageUrls.filter(Boolean) : [];
          if (_imgRefUrls.length) {
            _imgRefMediaIds = [];
            for (let _ri = 0; _ri < _imgRefUrls.length; _ri++) {
              sendLog("info", `#${number}: uploading reference ${_ri + 1}/${_imgRefUrls.length}…`);
              _imgRefMediaIds.push(await flowApi.uploadImage(tabId, _imgRefUrls[_ri], `ref_${number}_${_ri}.png`, { onRetry: (i) => sendLog("warning", `#${number}: image upload retry ${i.attempt}/${i.max}…`) }));
            }
          }
        }
        // Object photos from the popup table: upload as plain reference images (NOT
        // character entities). These are separate from characters and must always be
        // uploaded regardless of whether characters were resolved.
        {
          const _popupObjUrls = Array.isArray(p.objectImageUrls) ? p.objectImageUrls.filter(Boolean) : [];
          const _popupObjNames = Array.isArray(p.objectDisplayNames) ? p.objectDisplayNames : [];
          if (_popupObjUrls.length) {
            _imgRefMediaIds = _imgRefMediaIds || [];
            for (let _oi = 0; _oi < _popupObjUrls.length; _oi++) {
              const _oName = _popupObjNames[_oi] || `object_${_oi}`;
              sendLog("info", `#${number}: uploading object "${_oName}" as reference…`);
              _imgRefMediaIds.push(await flowApi.uploadImage(tabId, _popupObjUrls[_oi], `${_oName}.png`, { onRetry: (i) => sendLog("warning", `#${number}: object upload retry ${i.attempt}/${i.max}…`) }));
            }
          }
        }
        // CODE-mode objects BY NAME: select uploaded library photos whose name is in
        // the prompt (cache name->mediaId). Coexists with characters (entities) in the
        // same generateImages call — objects go in as reference images.
        try {
          const _popupObjExcl = Array.isArray(p.objectDisplayNames) ? p.objectDisplayNames : [];
          const _objMids = await resolveObjectsForPrompt(tabId, p, _popupObjExcl);
          if (_objMids && _objMids.length) {
            _imgRefMediaIds = [...(_imgRefMediaIds || []), ..._objMids];
            sendLog("info", `#${number}: + ${_objMids.length} library object(s) by name`);
          }
        } catch (e) { sendLog("error", `#${number}: object resolve failed: ${(e && e.message) || e}`); }
        if (state.generationMode === "film" && _filmPrevImageMediaId) {
          // Film continuation: feed the PREVIOUS frame's result as a reference so this frame builds on it
          // (matches click mode, which sets the next prompt's input image to the previous result).
          _imgRefMediaIds = [...(_imgRefMediaIds || []), _filmPrevImageMediaId];
          sendLog("info", `#${number}: continuing from previous frame…`);
        }
        sendLog("info", `#${number}: generating ${imageCount} image(s)…` + (_charRes ? ` (${_charRes.referenceEntities.length} character(s))` : ""));
        const imgs = await flowApi.generateImages(tabId, text, { imageModel: settings.imageModel, imageCount, aspectRatio: String(settings.aspectRatio || "").indexOf("9:16") >= 0 ? "IMAGE_ASPECT_RATIO_PORTRAIT" : "IMAGE_ASPECT_RATIO_LANDSCAPE", referenceMediaIds: _imgRefMediaIds, structuredParts: _charRes ? _charRes.structuredParts : undefined, referenceEntities: _charRes ? _charRes.referenceEntities : undefined, onRetry: _onRetry, onPartial: (p) => sendLog(p.final ? "warning" : "info", p.final ? `#${number}: получено ${p.received} из ${p.requested} фото. Причина: ${p.errors[0]}` : `#${number}: получено ${p.received} из ${p.requested}, повторяю ${p.retrying} (попытка ${p.attempt}/2)… ${p.errors[0]}`) });
        console.log("[GenFlow][API] #" + number + " imgs.length=" + imgs.length + " imageCount=" + imageCount);
        if (state.generationMode === "film" && imgs && imgs[0] && imgs[0].mediaId) _filmPrevImageMediaId = imgs[0].mediaId; // remember this frame's result for the next link in the chain
        if (imgs.length === 0) {
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "failed" } }).catch(() => {});
          if (p.id) updatePromptStatus(p.id, "failed", { info: null, errorType: "GENERATION_FAILED" });
          pushCodeFailure(p, "No images returned", "GENERATION_FAILED", null, null);
          sendLog("error", `#${number}: no images returned.`);
        } else {
          _phase = "download"; _resUrl = (imgs[0] && imgs[0].fifeUrl) || ""; _resMediaId = (imgs[0] && imgs[0].mediaId) || "";
          // Track the REAL Flow mediaIds we just generated — Download All matches against these so it
          // grabs only generated items, not pre-existing page media (reset on Clear All).
          state.generatedMediaIds = state.generatedMediaIds || new Set();
          for (const _im of imgs) { if (_im && _im.mediaId) state.generatedMediaIds.add(String(_im.mediaId).toLowerCase()); }
          const _q = String(settings.imageQuality || "1k").toLowerCase();
          const _up = _q === "2k" || _q === "4k";
          // Auto-download gate: code-mode generates regardless, but only upscale +
          // save to disk when the toggle is on. Off = result stays in the project;
          // the user downloads it manually.
          if (state.settings && state.settings.autoDownload !== false) for (let k = 0; k < imgs.length; k++) {
            if (!state.isRunning) break;  // stopped mid-prompt: don't upscale/download the rest
            if (!imgs[k].fifeUrl) continue;
            let _dataUrl = null; let _resLab = "1K";  // name by what is ACTUALLY saved, not the requested quality
            if (_up && imgs[k].mediaId) {
              const _vlabel = _q.toUpperCase();
              if (p.id) updatePromptStatus(p.id, "processing", { info: `Upscaling ${_vlabel}...` });
              try { _dataUrl = await flowApi.upscaleImage(tabId, imgs[k].mediaId, _q, { onRetry: _onRetry }); if (_dataUrl) _resLab = (_q === "4k" ? "4K" : "2K"); }
              catch (e) {
                const _why = /recaptcha|unusual/i.test(String(e && e.message)) ? "reCAPTCHA" : /MODEL_ACCESS|denied/i.test(String(e && e.message)) ? "not allowed on this account" : "API error";
                console.error("[GenFlow][API] upscale failed #" + number + ":", e);
                // Strict resolution rule: NO 4K→2K downgrade. If the ordered upscale fails,
                // _dataUrl stays null and the download decision below fails it as UPSCALE_FAILED.
                sendLog("warning", `#${number}: ${_vlabel} upscale failed (${_why}).`);
              }
            }
            const _fname = generateFilename({ number, text, _resLabel: _resLab }, k + 1);
            if (_dataUrl) {
              // data: URL — handleDownload splits on commas (breaks data URLs); save directly like UPSCALE_DOWNLOAD.
              pendingDownloadFilenames.set(_dataUrl, _fname);
              pendingDataDownloadNames.push(_fname);
              try { chrome.downloads.download({ url: _dataUrl, filename: _fname, conflictAction: "uniquify" }); } catch (e) {}
            } else if (_up) {
              // Resolution rule: 2K/4K ordered but no upscale succeeded — don't save base 1K.
              // Throw so the outer catch records UPSCALE_FAILED (retryable), keeping the URL.
              throw new Error(`Upscale to ${_q.toUpperCase()} failed`);
            } else {
              await handleDownload({ url: imgs[k].fifeUrl, filename: _fname });
            }
          }
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "done", urls: imgs.map((g) => g.fifeUrl).filter(Boolean), type: "image" } }).catch(() => {});
          if (p.id) { updatePromptStatus(p.id, "completed", { resultUrl: imgs[0] && imgs[0].fifeUrl, info: null, completedAt: Date.now() }); state.failedPromptsList = state.failedPromptsList.filter((f) => !(f.prompt && f.prompt.id === p.id)); }
          await trackUsageOnServer("banana");
          done++;
        }
      }
    } catch (e) {
      const _et = _phase === "download" ? "UPSCALE_FAILED" : "GENERATION_FAILED";
      chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "failed" } }).catch(() => {});
      if (p.id) updatePromptStatus(p.id, "failed", { info: null, errorType: _et, resultUrl: _resUrl || undefined });
      pushCodeFailure(p, (e && e.message) || String(e), _et, _resUrl, _et === "UPSCALE_FAILED" ? _resMediaId : null);
      console.error("[GenFlow][API] prompt", number, `failed (${_et}):`, e);
      sendLog("error", `#${number}: ${(e && e.message) || e}`);
    }
    broadcastUpdate();
    await new Promise((res) => setTimeout(res, settings ? getRandomDelay(settings) : 1200)); // pause between prompts (per worker) — honors the user's interval setting
    }
  }

  const workers = [];
  for (let i = 0; i < maxConcurrency; i++) {
    workers.push(worker(i).catch((e) => { console.error("[GenFlow][API] worker", i, "crashed:", e); }));
  }
  await Promise.all(workers);
  // Drain prompts handed in late (e.g. retries appended while the batch was finishing).
  if (state.isRunning && currentIndex < state.apiPrompts.length) await worker().catch((e) => { console.error("[GenFlow][API] drain worker crashed:", e); });

  state.isRunning = false;
  try { await chrome.tabs.reload(tabId); } catch (e) {} // refresh Flow UI so results appear in the project grid
  broadcastUpdate();
  sendLog("success", `API mode finished: ${done}/${state.apiPrompts.length} prompt(s) completed.`);
  } finally { if (state._apiGen === _myGen) state._apiRunning = false; }
}
// ============================================================================
// FILM STREAMS: multiple parallel film chains (each sequential internally).
// payload = { streams: [ { streamId, startImageDataUrl?, frames: [{id,text},...] } ], settings }
// ============================================================================
async function runFilmStreams(payload) {
  if (state._apiRunning) { console.log("[GenFlow][FilmStreams] duplicate RUN ignored (already running)"); return; }
  state._apiRunning = true;
  const _myGen = (state._apiGen = (state._apiGen || 0) + 1);
  state._nextDispatchAt = 0;
  state._consecFail = 0;  // fresh consecutive-error streak per batch (film enters HERE, not via handleStartGeneration)
  state._codeLibObjects = void 0;
  state._refInventory = void 0;    // refresh API reference inventory once per batch
  state._refInventoryPromise = void 0;  // drop any stale in-flight inventory fetch
  try {
  const streams = (payload && payload.streams) || [];
  const settings = (payload && payload.settings) || state.settings || {};
  state.settings = settings;
  state.generationMode = "film_streams";
  const isVideo = false; // film streams is image-only

  console.log("[GenFlow][FilmStreams] START streams=", streams.length, "settings=", JSON.stringify({ service: settings.service, maxImageThreads: settings.maxImageThreads }));

  // Gate check
  const gate = await getGateStatus();
  if (!gate.authed) {
    sendLog("warning", "Connect Telegram to start — not authorized.");
    chrome.runtime.sendMessage({ type: "AUTH_REQUIRED" }).catch(() => {});
    broadcastUpdate(); return;
  }
  if (!gate.canGenerate) {
    state.limitReached = true;
    sendLog("warning", "Daily limit reached — Start blocked.");
    chrome.runtime.sendMessage({ type: "LIMIT_REACHED", payload: {} }).catch(() => {});
    broadcastUpdate(); return;
  }
  const tabId = await flowApi.getFlowTabId();
  if (!tabId) { sendLog("error", "No Flow tab open."); broadcastUpdate(); return; }
  const ready = await flowApi.probe();
  if (!ready.ready) {
    const why = !ready.hasToken ? "no Flow session token" : !ready.hasRecaptcha ? "reCAPTCHA blocked" : !ready.projectId ? "open a Flow project first" : "unknown";
    sendLog("error", "Flow API not ready (" + why + ")."); broadcastUpdate(); return;
  }

  // Build flat prompt list for state tracking (all frames across all streams)
  const allFrames = [];
  for (const s of streams) {
    for (let fi = 0; fi < s.frames.length; fi++) {
      const f = s.frames[fi];
      allFrames.push(Object.assign({}, f, {
        id: f.id || crypto.randomUUID(),
        status: "pending",
        streamId: s.streamId,
        frameIndex: fi,
        number: allFrames.length + 1,
      }));
    }
  }
  state.apiPrompts = allFrames;
  state.prompts = [...allFrames];
  state.isRunning = true;
  state.isPaused = false;
  state.limitReached = false;
  broadcastUpdate();

  // Notify popup with all slots
  chrome.runtime.sendMessage({ type: "API_PREVIEW_RESET", payload: { slots: allFrames.map(f => ({
    number: f.number, prompt: f.text || "", status: "queued", streamId: f.streamId, frameIndex: f.frameIndex
  })) } }).catch(() => {});
  sendLog("info", `Film Streams: starting ${streams.length} stream(s), ${allFrames.length} total frame(s).`);

  const imageCount = Math.max(1, Number(settings.generationsPerPrompt || settings.imageCount || 1));
  const maxConcurrency = Math.max(1, Math.min(parseInt(settings.maxImageThreads, 10) || 4, 6));
  let totalDone = 0;

  // ---- Single stream runner: processes frames sequentially ----
  async function runSingleStream(stream) {
    let prevMediaId = null;

    // Step 0: upload start image if provided
    if (stream.startImageDataUrl) {
      try {
        sendLog("info", `Stream ${stream.streamId}: uploading start image…`);
        prevMediaId = await flowApi.uploadImage(tabId, stream.startImageDataUrl, `filmstream_start_${stream.streamId}.png`, {
          onRetry: (i) => sendLog("warning", `Stream ${stream.streamId}: start image upload retry ${i.attempt}/${i.max}…`)
        });
      } catch (e) {
        sendLog("error", `Stream ${stream.streamId}: start image upload failed: ${(e && e.message) || e}`);
      }
    }

    for (let fi = 0; fi < stream.frames.length; fi++) {
      if (state._apiGen !== _myGen || !state.isRunning || state.limitReached) break;
      // Honor pause
      while (state.isPaused && state._apiGen === _myGen && state.isRunning) await new Promise(r => setTimeout(r, 400));
      if (state._apiGen !== _myGen || !state.isRunning) break;
      // Honor cooldown
      while (state.isRunning && state.cooldownUntil && Date.now() < state.cooldownUntil) await new Promise(r => setTimeout(r, 500));
      if (state._apiGen !== _myGen || !state.isRunning) break;

      const frame = stream.frames[fi];
      const text = (frame.text || "").trim();
      if (!text) continue;

      // Find matching tracked frame in allFrames
      const tracked = allFrames.find(f => f.streamId === stream.streamId && f.frameIndex === fi);
      const number = tracked ? tracked.number : fi + 1;

      // Global dispatch gate (same as runFlowApiBatch)
      {
        const _gap = settings ? getRandomDelay(settings) : 1200;
        const _now = Date.now();
        const _slot = Math.max(_now, state._nextDispatchAt || 0);
        state._nextDispatchAt = _slot + _gap;
        if (_slot > _now) await new Promise(r => setTimeout(r, _slot - _now));
        if (state._apiGen !== _myGen || !state.isRunning) break;
      }

      chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "generating", streamId: stream.streamId } }).catch(() => {});
      if (tracked) tracked.status = "processing";

      const _onRetry = (info) => {
        const _ps = Math.max(0, Number(state.settings?.rateLimitPauseSec ?? 10));
        const _isLimit = info && (info.recaptcha || info.status === 429);
        if (_isLimit && _ps > 0) {
          state.cooldownUntil = Math.max(state.cooldownUntil || 0, Date.now() + _ps * 1000);
          state.cooldownReason = info.recaptcha ? "reCAPTCHA" : "Rate limit";
          broadcastUpdate();
        }
        sendLog("warning", `S${stream.streamId}#${fi + 1}: ${info && info.recaptcha ? "reCAPTCHA" : "rate-limit 429"}${_isLimit && _ps > 0 ? " — pausing " + _ps + "s" : ""} — retry ${info ? info.attempt : "?"}/${info ? info.max : "?"}…`);
      };

      let _phase = "generation"; let _resUrl = ""; let _resMediaId = ""; let _reqInfo = "";
      try {
        // Resolve characters
        let _charRes = null;
        try {
          _charRes = await resolveCharactersForPrompt(tabId, frame);
          if (_charRes && Array.isArray(_charRes.characterNames)) {
            frame.referenceDisplayNames = _charRes.characterNames;
          }
        } catch (e) { sendLog("error", `S${stream.streamId}#${fi + 1}: char resolve: ${(e && e.message) || e}`); }

        // Resolve reference images
        let _imgRefMediaIds;
        if (!_charRes) {
          const _imgRefUrls = Array.isArray(frame.referenceImageUrls) ? frame.referenceImageUrls.filter(Boolean) : [];
          if (_imgRefUrls.length) {
            _imgRefMediaIds = [];
            for (let _ri = 0; _ri < _imgRefUrls.length; _ri++) {
              _imgRefMediaIds.push(await flowApi.uploadImage(tabId, _imgRefUrls[_ri], `ref_s${stream.streamId}_f${fi}_${_ri}.png`));
            }
          }
        }
        // Object photos from popup table (stream mode)
        {
          const _popupObjUrls = Array.isArray(frame.objectImageUrls) ? frame.objectImageUrls.filter(Boolean) : [];
          const _popupObjNames = Array.isArray(frame.objectDisplayNames) ? frame.objectDisplayNames : [];
          if (_popupObjUrls.length) {
            _imgRefMediaIds = _imgRefMediaIds || [];
            for (let _oi = 0; _oi < _popupObjUrls.length; _oi++) {
              const _oName = _popupObjNames[_oi] || `object_${_oi}`;
              _imgRefMediaIds.push(await flowApi.uploadImage(tabId, _popupObjUrls[_oi], `${_oName}.png`));
            }
          }
        }

        // Resolve objects by name
        try {
          const _strmObjExcl = Array.isArray(frame.objectDisplayNames) ? frame.objectDisplayNames : [];
          const _objMids = await resolveObjectsForPrompt(tabId, frame, _strmObjExcl);
          if (_objMids && _objMids.length) {
            _imgRefMediaIds = [...(_imgRefMediaIds || []), ..._objMids];
            sendLog("info", `S${stream.streamId}#${fi + 1}: + ${_objMids.length} library object(s)`);
          }
        } catch (e) { sendLog("error", `S${stream.streamId}#${fi + 1}: object resolve: ${(e && e.message) || e}`); }

        // Film chain: feed previous frame
        if (prevMediaId) {
          _imgRefMediaIds = [...(_imgRefMediaIds || []), prevMediaId];
          sendLog("info", `S${stream.streamId}#${fi + 1}: continuing from previous frame…`);
        }

        _reqInfo = `refs=${(_imgRefMediaIds || []).length}, chars=${_charRes && Array.isArray(_charRes.referenceEntities) ? _charRes.referenceEntities.length : 0}, model=${settings.imageModel || "default"}`;
        sendLog("info", `S${stream.streamId}#${fi + 1}: generating…` + (_charRes ? ` (${_charRes.referenceEntities.length} char(s))` : ""));
        const imgs = await flowApi.generateImages(tabId, text, {
          imageModel: settings.imageModel,
          imageCount,
          aspectRatio: String(settings.aspectRatio || "").indexOf("9:16") >= 0 ? "IMAGE_ASPECT_RATIO_PORTRAIT" : "IMAGE_ASPECT_RATIO_LANDSCAPE",
          referenceMediaIds: _imgRefMediaIds,
          structuredParts: _charRes ? _charRes.structuredParts : undefined,
          referenceEntities: _charRes ? _charRes.referenceEntities : undefined,
          onRetry: _onRetry,
        });

        if (imgs && imgs[0] && imgs[0].mediaId) prevMediaId = imgs[0].mediaId;

        if (imgs.length === 0) {
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "failed", streamId: stream.streamId } }).catch(() => {});
          if (tracked) tracked.status = "failed";
          sendLog("error", `S${stream.streamId}#${fi + 1}: no images returned.`);
          // Film-stream frames must reach the Failed panel like every other path —
          // preview-only marking left the user with no record and no retry.
          {
            const _fpr = { id: crypto.randomUUID(), number, text, status: "failed", error: "no images returned", errorType: "GENERATION_FAILED", isVideo: false, service: "banana" };
            state.failedPromptsList.push({ prompt: _fpr, error: _fpr.error, errorType: _fpr.errorType });
          }
          gfNoteFailStreak();  // film-path terminal failure -> consecutive-error breaker
        } else {
          _phase = "download"; _resUrl = (imgs[0] && imgs[0].fifeUrl) || ""; _resMediaId = (imgs[0] && imgs[0].mediaId) || "";
          state.generatedMediaIds = state.generatedMediaIds || new Set();
          for (const _im of imgs) { if (_im && _im.mediaId) state.generatedMediaIds.add(String(_im.mediaId).toLowerCase()); }

          const _q = String(settings.imageQuality || "1k").toLowerCase();
          const _up = _q === "2k" || _q === "4k";
          if (state.settings && state.settings.autoDownload !== false) for (let k = 0; k < imgs.length; k++) {
            if (!state.isRunning) break;
            if (!imgs[k].fifeUrl) continue;
            let _dataUrl = null; let _resLab = "1K";
            if (_up && imgs[k].mediaId) {
              const _vlabel = _q.toUpperCase();
              try { _dataUrl = await flowApi.upscaleImage(tabId, imgs[k].mediaId, _q, { onRetry: _onRetry }); if (_dataUrl) _resLab = (_q === "4k" ? "4K" : "2K"); }
              catch (e) {
                // Strict resolution rule: NO 4K→2K downgrade. Failed upscale -> _dataUrl stays
                // null -> fails as UPSCALE_FAILED below. The chain survives: prevMediaId is set
                // from generation (before this download phase).
                sendLog("warning", `S${stream.streamId}#${fi + 1}: ${_q.toUpperCase()} upscale failed.`);
              }
            }
            const _fname = generateFilename({ number, text, _resLabel: _resLab }, k + 1);
            if (_dataUrl) {
              pendingDownloadFilenames.set(_dataUrl, _fname);
              pendingDataDownloadNames.push(_fname);
              try { chrome.downloads.download({ url: _dataUrl, filename: _fname, conflictAction: "uniquify" }); } catch (e) {}
            } else if (_up) {
              // 2K/4K ordered but upscale didn't succeed — don't save base 1K.
              throw new Error(`Upscale to ${_q.toUpperCase()} failed`);
            } else {
              await handleDownload({ url: imgs[k].fifeUrl, filename: _fname });
            }
          }
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "done", urls: imgs.map(g => g.fifeUrl).filter(Boolean), type: "image", streamId: stream.streamId } }).catch(() => {});
          if (tracked) { tracked.status = "completed"; tracked.resultUrl = imgs[0] && imgs[0].fifeUrl; }
          await trackUsageOnServer("banana");
          totalDone++;
          state._consecFail = 0; state._flowStallStreak = 0;  // film-path success breaks both streaks
        }
      } catch (e) {
        const _et = _phase === "download" ? "UPSCALE_FAILED" : "GENERATION_FAILED";
        chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "failed", streamId: stream.streamId } }).catch(() => {});
        if (tracked) tracked.status = "failed";
        console.error("[GenFlow][FilmStreams] stream", stream.streamId, "frame", fi, `failed (${_et}):`, e, _reqInfo ? `[request: ${_reqInfo}]` : "");
        sendLog("error", `S${stream.streamId}#${fi + 1}: ${(e && e.message) || e}${_reqInfo ? ` [${_reqInfo}]` : ""}`);
        // Film-stream frames must reach the Failed panel like every other path.
        {
          const _em = (e && e.message) || String(e);
          const _fpr = { id: crypto.randomUUID(), number, text, status: "failed", error: _em, errorType: _et, isVideo: false, service: "banana", resultUrl: _resUrl || void 0, onlyUpscale: _et === "UPSCALE_FAILED" || void 0 };
          state.failedPromptsList.push({ prompt: _fpr, error: _em, errorType: _et, resultUrl: _resUrl || void 0 });
        }
        gfNoteFailStreak((e && e.message) || "");  // film-path terminal failure (catch) -> breaker (throttle self-excluded)
      }
      broadcastUpdate();
      await new Promise(r => setTimeout(r, settings ? getRandomDelay(settings) : 1200));
    }
    return { streamId: stream.streamId, done: true };
  }

  // ---- Parallel stream launcher with semaphore ----
  let streamIndex = 0;
  async function streamWorker(wIdx) {
    while (streamIndex < streams.length) {
      if (state._apiGen !== _myGen || !state.isRunning || state.limitReached) break;
      const si = streamIndex++;
      const stream = streams[si];
      if (!stream || !stream.frames || !stream.frames.length) continue;
      sendLog("info", `Stream worker ${wIdx}: starting stream "${stream.streamId}" (${stream.frames.length} frame(s))`);
      await runSingleStream(stream);
      sendLog("info", `Stream worker ${wIdx}: finished stream "${stream.streamId}"`);
    }
  }

  const streamWorkers = [];
  for (let i = 0; i < maxConcurrency; i++) {
    streamWorkers.push(streamWorker(i).catch(e => { console.error("[GenFlow][FilmStreams] stream worker", i, "crashed:", e); }));
  }
  await Promise.all(streamWorkers);

  state.isRunning = false;
  try { await chrome.tabs.reload(tabId); } catch (e) {}
  broadcastUpdate();
  sendLog("success", `Film Streams finished: ${totalDone}/${allFrames.length} frame(s) completed across ${streams.length} stream(s).`);
  } finally {
    if (state._apiGen === _myGen) state._apiRunning = false;
    // Release the film_streams flag when THIS run ends: processNextPrompt and the
    // stall watchdog are gated on it, so a stale flag would block a later single
    // retry from the Failed panel until the next full Start resets the mode.
    if (state._apiGen === _myGen && state.generationMode === "film_streams") state.generationMode = "single";
  }
}
// Hybrid (synthetic input + code output): the base card is already in the project.
// We upscale it to the chosen quality by API and download by code — no synthetic 2K-menu click.
async function handleCodeOutput(payload) {
  const resultUrl = (payload && payload.resultUrl) || "";
  const prompt = state.prompts.find((p) => p.id === payload.promptId) || { number: payload.promptNumber, text: payload.text };
  try {
    const tabId = await flowApi.getFlowTabId();
    if (!tabId) { sendLog("error", "Code output: no Flow tab open."); return; }
    const mediaId = (resultUrl.match(/\/(?:image|media)\/([a-f0-9-]{36})/i) || [])[1]
      || (resultUrl.match(/name=([a-f0-9-]{36})/i) || [])[1]
      || (resultUrl.match(/([a-f0-9-]{36})/) || [])[1] || null;
    // THIS is the default path (clicks-input + code-output). Track the generated mediaId so
    // "Download All" restricts to generated items — without it the set stays empty -> grabs all.
    if (mediaId) { state.generatedMediaIds = state.generatedMediaIds || new Set(); state.generatedMediaIds.add(String(mediaId).toLowerCase()); }
    // Auto-download off: the result is generated & tracked above — skip upscale +
    // disk save entirely, but still advance the queue so generation continues.
    if (state.settings && state.settings.autoDownload === false) {
      if (payload.promptId) { downloadReceivedForPrompt.add(payload.promptId); completeIfDownloading(payload.promptId); }
      sendLog("info", `#${prompt.number}: generated (auto-download off — not saved).`);
      return;
    }
    const isVideo = !!payload.isVideo;
    const q = String((state.settings && (isVideo ? state.settings.quality : state.settings.imageQuality)) || (isVideo ? "1080p" : "1k")).toLowerCase();
    console.log("[GenFlow][hybrid] codeOutput mediaId=" + mediaId + " q=" + q + " isVideo=" + isVideo + " resultUrl=" + String(resultUrl).slice(0, 70));
    // subIndex is sent only by the banana content script (it encodes card/image position).
    // Videos never carry one, so the old `|| 1` named every clip of a prompt _Video_1 and
    // Chrome deduped them into "(1)"/"(2)". Fall back to the per-prompt counter, keyed by the
    // result URL so distinct clips get 1,2,3 and a re-fire of the same URL keeps its number.
    const fname = generateFilename(prompt, payload.subIndex || assignPhotoIndex(prompt, resultUrl || payload.promptId));
    if (isVideo) {
      // Borrow code-code's reliability: this URL came from the clicks DOM monitor (fragile),
      // so VALIDATE it's a genuine video via the API before touching disk. A blocked/failed
      // generation makes the monitor claim stray media (a photo / old tile); getVideoInfo only
      // confirms a real video (returns a workflowId). No confirmation -> fail cleanly like
      // code-code's null downloadUrl, and NEVER download a non-video (that's how a photo got
      // saved as Prompt_2_Video_1_1080p.mp4 → .jpeg).
      let _vinfo = null;
      try { _vinfo = mediaId ? await flowApi.getVideoInfo(tabId, mediaId) : null; } catch (e) {}
      if (!_vinfo || !_vinfo.workflowId) {
        sendLog("error", `#${prompt.number}: no valid video result (generation blocked or stray media) — nothing saved.`);
        handleGenerationFailed({ promptId: payload.promptId, promptNumber: prompt.number, error: "No valid video result (blocked or stray media)", errorType: "GENERATION_FAILED", resultUrl });
        return;
      }
      let _vurl = resultUrl; // base video (media-redirect)
      const _upNeeded = (q.indexOf("1080") >= 0 || q.indexOf("4k") >= 0);
      const _vlabel = q.indexOf("4k") >= 0 ? "4K" : "1080p";
      let _upDone = false;
      if (_upNeeded) {
        try {
          if (prompt && prompt.id) updatePromptStatus(prompt.id, prompt.status, { info: `Upscaling ${_vlabel}...` });
          const _upOp = await flowApi.upscaleVideo(tabId, mediaId, _vinfo.workflowId, { quality: q });
          if (_upOp) { const _u = await flowApi.pollVideoStatus(tabId, _upOp, await flowApi.getProjectId(tabId)); if (_u) { _vurl = _u; _upDone = true; } }
          if (prompt && prompt.id) updatePromptStatus(prompt.id, prompt.status, { info: null });
        } catch (e) { console.error("[GenFlow][hybrid] video upscale failed:", e); }
      }
      // Resolution rule: never save base 720 when a higher resolution was ordered. If the
      // 1080/4K upscale didn't succeed, fail as UPSCALE_FAILED (retryable via onlyUpscale on
      // the already-generated video) instead of silently downloading the wrong size.
      if (_upNeeded && !_upDone) {
        sendLog("error", `#${prompt.number}: ${_vlabel} upscale failed — not saving 720 (${_vlabel} required).`);
        handleGenerationFailed({ promptId: payload.promptId, promptNumber: prompt.number, error: `Upscale to ${_vlabel} failed`, errorType: "UPSCALE_FAILED", resultUrl });
        return;
      }
      await handleDownload({ url: _vurl, filename: fname });
    } else {
      let dataUrl = null;
      const _imgUpNeeded = (q === "2k" || q === "4k");
      if (_imgUpNeeded && mediaId) {
        if (prompt && prompt.id) updatePromptStatus(prompt.id, prompt.status, { info: `Upscaling ${q.toUpperCase()}...` });
        try { dataUrl = await flowApi.upscaleImage(tabId, mediaId, q); }
        catch (e) { console.error("[GenFlow][hybrid] image upscale failed:", e); }
        if (prompt && prompt.id) updatePromptStatus(prompt.id, prompt.status, { info: null });
      }
      // Resolution rule: 2K/4K ordered but upscale didn't succeed — never save base 1K.
      // Fail as UPSCALE_FAILED (retryable) instead of silently downloading the wrong size.
      if (_imgUpNeeded && !dataUrl) {
        sendLog("error", `#${prompt.number}: ${q.toUpperCase()} upscale failed — not saving 1K (${q.toUpperCase()} required).`);
        handleGenerationFailed({ promptId: payload.promptId, promptNumber: prompt.number, error: `Upscale to ${q.toUpperCase()} failed`, errorType: "UPSCALE_FAILED", resultUrl });
        return;
      }
      if (!dataUrl) {
        // Base image (1k): fetch IN the page so the session/redirect works
        // (chrome.downloads can't fetch media.getMediaUrlRedirect -> SERVER_UNAUTHORIZED .htm).
        try { dataUrl = await flowApi.fetchAsDataUrl(tabId, resultUrl); }
        catch (e) { console.error("[GenFlow][hybrid] base fetch failed:", e); }
      }
      console.log("[GenFlow][hybrid] " + (dataUrl ? "data ok (" + dataUrl.length + ")" : "no data -> url fallback"));
      if (dataUrl) {
        pendingDownloadFilenames.set(dataUrl, fname);
        pendingDataDownloadNames.push(fname);
        try { chrome.downloads.download({ url: dataUrl, filename: fname, conflictAction: "uniquify" }); } catch (e) {}
      } else {
        await handleDownload({ url: resultUrl, filename: fname });
      }
    }
    if (payload.promptId) { downloadReceivedForPrompt.add(payload.promptId); completeIfDownloading(payload.promptId); }
    sendLog("success", `#${prompt.number}: downloaded by code (${q}).`);
  } catch (e) {
    console.error("[GenFlow][hybrid] handleCodeOutput error:", e);
    sendLog("error", `#${prompt.number}: code output failed — ${(e && e.message) || e}`);
  }
}
// "Download all" in code mode: list all media in the project (from the page) -> upscale each
// to the settings quality (image 2K/4K, video 1080p/4K) -> download by API. Cancellable.
async function codeDownloadAll(scope, imageRes, videoRes) {
  try {
    const tabId = await flowApi.getFlowTabId();
    if (!tabId) { sendLog("error", "Download all: no Flow tab open."); state.isDownloadingAll = false; broadcastUpdate(); return; }
    const projectId = await flowApi.getProjectId(tabId);
    const _filter = scope || (state.settings && state.settings.downloadAllFilter) || "all";
    const _allMedia = (await flowApi.listProjectMedia(tabId)).filter((m) => _filter === "all" || (_filter === "video" && m.type === "video") || (_filter === "photo" && m.type === "image"));
    // Manual "Download All" = every GENERATED result in the project (old + new). listProjectMedia
    // already drops uploaded sources/references (by React fiber-name), so we do NOT restrict by
    // generatedMediaIds here: that session-only filter wrongly excluded the project's earlier
    // generations, which is exactly what the user wants included.
    const media = _allMedia.slice();
    media.reverse();  // bottom -> top: #1 = oldest item, matching the synthetic (clicks) Download All
    if (!media.length) { sendLog("warning", "Download all: no media found on the page."); state.isDownloadingAll = false; broadcastUpdate(); return; }
    sendLog("info", `Code download all: ${media.length} generated item(s) (references excluded).`);
    chrome.runtime.sendMessage({ type: "API_PREVIEW_RESET", payload: { slots: media.map((m, i) => ({ number: i + 1, prompt: m.type, status: "queued" })) } }).catch(() => {});
    const iq = String(imageRes || state.settings.imageQuality || "1k").toLowerCase();
    const vq = String(videoRes || state.settings.quality || "1080p").toLowerCase();
    let done = 0;
    for (let i = 0; i < media.length; i++) {
      if (!state.isDownloadingAll) { sendLog("info", "Download all cancelled."); break; }
      const m = media[i]; const number = i + 1;
      chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "generating" } }).catch(() => {});
      try {
        if (m.type === "image") {
          let dataUrl = null; let resLab = "1K";  // _resLabel = what was ACTUALLY downloaded
          const _imgUpNeeded = (iq === "2k" || iq === "4k");
          if (_imgUpNeeded && m.mediaId) { try { dataUrl = await flowApi.upscaleImage(tabId, m.mediaId, iq, { projectId }); if (dataUrl) resLab = (iq === "4k" ? "4K" : "2K"); } catch (e) {} }
          // Resolution rule: 2K/4K ordered but upscale didn't succeed -> skip this item (mark
          // failed via the catch below) instead of saving the base 1K.
          if (_imgUpNeeded && !dataUrl) throw new Error(`Upscale to ${iq.toUpperCase()} failed`);
          if (!dataUrl) { try { dataUrl = await flowApi.fetchAsDataUrl(tabId, m.url); resLab = "1K"; } catch (e) {} }
          const fname = generateFilename({ number, text: "", isVideo: false, _resLabel: resLab }, 1);
          if (dataUrl) { pendingDownloadFilenames.set(dataUrl, fname); pendingDataDownloadNames.push(fname); try { chrome.downloads.download({ url: dataUrl, filename: fname, conflictAction: "uniquify" }); } catch (e) {} }
          else { await handleDownload({ url: m.url, filename: fname }); }
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "done", urls: [m.url], type: "image" } }).catch(() => {});
        } else {
          let vUrl = "https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=" + m.mediaId; let resLab = "720p";
          const _vUpNeeded = (vq.indexOf("1080") >= 0 || vq.indexOf("4k") >= 0);
          let _vUpDone = false;
          if (_vUpNeeded && m.mediaId) {
            const info = await flowApi.getVideoInfo(tabId, m.mediaId, projectId);
            if (info && info.workflowId) {
              const upOp = await flowApi.upscaleVideo(tabId, m.mediaId, info.workflowId, { quality: vq, projectId });
              if (upOp) { const u = await flowApi.pollVideoStatus(tabId, upOp, projectId); if (u) { vUrl = u; resLab = (vq.indexOf("4k") >= 0 ? "4K" : "1080p"); _vUpDone = true; } }
            }
          }
          // Resolution rule: 1080/4K ordered but upscale didn't produce it -> skip this item
          // (mark failed via the catch below) instead of saving the base 720.
          if (_vUpNeeded && !_vUpDone) throw new Error(`Upscale to ${vq.indexOf("4k") >= 0 ? "4K" : "1080p"} failed`);
          const fname = generateFilename({ number, text: "", isVideo: true, _resLabel: resLab }, 1);
          await handleDownload({ url: vUrl, filename: fname });
          chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "done", type: "video" } }).catch(() => {});
        }
        done++;
      } catch (e) {
        chrome.runtime.sendMessage({ type: "API_PREVIEW_UPDATE", payload: { number, status: "failed" } }).catch(() => {});
        console.error("[GenFlow][code-dl-all] item " + number + " failed:", e);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    state.isDownloadingAll = false;
    broadcastUpdate();
    sendLog("success", `Code download all done: ${done}/${media.length}.`);
  } catch (e) {
    console.error("[GenFlow][code-dl-all] error:", e);
    state.isDownloadingAll = false;
    broadcastUpdate();
  }
}
function sendAbortInjections() {
  // Tell content scripts to drop any prompt sitting in their submission-lock queue / cooldown
  // gate so it bails instead of placing into the wall. In-progress generations keep their
  // monitors and still finish/download. The content flag resets on the next START.
  chrome.tabs.query({ url: ["*://labs.google/*", "*://labs.google.com/*"] }).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id)
        chrome.tabs.sendMessage(tab.id, { type: "ABORT_INJECTIONS" }).catch(() => {});
    }
  }).catch(() => {});
}
function requeueActivePromptsOnStop(currentId) {
  // A hard-stop abandons the in-flight slots. Prompts that were only QUEUED/dispatched but never
  // actually generated must NOT be marked "failed" — there was no real attempt. Return them to
  // "pending" so they stay in the queue and resume on the next Start. The prompt that actually
  // reported the failure (currentId) is recorded as failed by the normal path; skip it here.
  for (const slot of Array.from(state.activeSlots.values())) {
    if (slot.promptId === currentId) continue;
    const p = state.prompts.find((x) => x.id === slot.promptId);
    if (!p || p.status === "completed" || downloadReceivedForPrompt.has(p.id)) continue;
    if (p.status === "processing") updatePromptStatus(p.id, "pending", {});
  }
  state.activeSlots.clear();
}
function handleStopGeneration() {
  state.isRunning = false;
  state.isPaused = false;
  state._apiGen = (state._apiGen || 0) + 1;  // invalidate any running code batch so its workers exit
  state._apiRunning = false;                 // clear the guard so a fresh Start isn't ignored as "duplicate"
  // Stop kills a film_streams run BEFORE its finally can release the mode flag
  // (the _apiGen===_myGen gate there no longer passes after the bump above), and a
  // stale "film_streams" would mute processNextPrompt / the stall watchdog — i.e.
  // every clicks retry from the Failed panel — until the next full Start.
  if (state.generationMode === "film_streams") state.generationMode = "single";
  // The SW already won't schedule more (processNextPrompt bails on !isRunning),
  // but prompts already handed to the content script sit in its submission-lock
  // queue and keep getting placed. Tell it to abort them now. The content flag is
  // reset on the next START (RESET_CONTENT_STATE) / INJECT_PROMPT, so no deadlock.
  chrome.tabs.query({ url: ["*://labs.google/*", "*://labs.google.com/*"] }).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id)
        chrome.tabs.sendMessage(tab.id, { type: "ABORT_INJECTIONS" }).catch(() => {});
    }
  }).catch(() => {});
  if (state.settings?.closeGrokTabsAfter && state.settings?.service === "grok") {
    closeGrokTabs();
  }
  // Soft stop (stable behavior): stop NEW/queued submissions only — in-progress generations
  // finish, download and get marked done (ABORT_INJECTIONS keeps their monitors running).
  // The hard variant (aborting in-flight monitors) lost generated-but-unclaimed work.
  state.cooldownUntil = 0;
  state.cooldownReason = "";
  // Stop = reset to a startable queue. Prompts left mid-flight ("processing", no finished/
  // downloaded result) go back to "pending" so the Start button counts them again — otherwise a
  // stopped prompt sits "active" forever and Start stays disabled (0 pending). "downloading"
  // (result already in hand) is left to finish. If an old monitor still completes a reset prompt
  // it just marks it completed; ABORT_INJECTIONS + RESET_CONTENT_STATE on the next Start keep it
  // from double-generating.
  const _toRequeue = state.prompts.filter((p) => p.status === "processing" && !downloadReceivedForPrompt.has(p.id)).map((p) => p.id);
  for (const _id of _toRequeue) updatePromptStatus(_id, "pending", { info: null });
  state.activeSlots.clear();
  sendLog("info", _toRequeue.length ? `Generation stopped — ${_toRequeue.length} prompt(s) reset to pending (press Start to re-run)` : "Generation stopped");
  broadcastUpdate();
  saveState();
}
function handlePauseGeneration() {
  // Soft pause: stop sending NEW prompts; in-progress generations keep running, finish and
  // download. Resume continues with the rest.
  state.isPaused = true;
  state.cooldownUntil = 0;
  state.cooldownReason = "";
  sendLog("info", "Generation paused");
  broadcastUpdate();
  saveState();
}
function handleResumeGeneration() {
  state.isPaused = false;
  state.retryOnlyIds = null;
  state.nextDispatchAllowedAt = 0;
  sendLog("info", "Generation resumed");
  broadcastUpdate();
  saveState();
  setTimeout(() => processNextPrompt(), 300);
}
async function closeGrokTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: "*://grok.com/*" });
    if (tabs.length > 1) {
      const toClose = tabs.slice(1).map((t) => t.id).filter((id) => id !== void 0);
      if (toClose.length > 0) {
        await chrome.tabs.remove(toClose);
        sendLog("info", `Closed ${toClose.length} Grok tab(s)`);
      }
    }
  } catch {
  }
}
function handleRetryFailed() {
  for (const _ci of state.failedPromptsList.filter((f) => f.prompt && f.prompt._code)) handleCodeRetry(_ci.prompt.id);
  const failedPrompts = state.prompts.filter((p) => p.status === "failed");
  const failedIds = state.failedPromptsList.filter((f) => f.prompt && !f.prompt._code).map((f) => f.prompt && f.prompt.id).filter(Boolean);
  if (failedIds.length === 0) return;
  state.retryOnlyIds = new Set(failedIds);
  failedIds.forEach((id) => {
    clearCompletedPromptIdInContent(id);
    let p = state.prompts.find((x) => x.id === id);
    const fItem = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === id);
    // Bug#1 fix: a prior fresh Start may have replaced the queue, dropping this id. Re-add the
    // prompt from the preserved Failed list so retry actually dispatches (else silent no-op).
    if (!p && fItem && fItem.prompt) { p = { ...fItem.prompt, status: "failed", error: void 0, retryCount: fItem.prompt.retryCount || 0 }; state.prompts.push(p); }
    const _isDl = p && (p.errorType === "UPSCALE_FAILED" || p.onlyUpscale || (fItem && (fItem.errorType === "UPSCALE_FAILED" || (fItem.prompt && fItem.prompt.errorType === "UPSCALE_FAILED"))));
    const _resultUrl = _isDl ? ((fItem && fItem.resultUrl) || (p && p.resultUrl) || null) : void 0;
    if (p) updatePromptStatus(id, "pending", { retryCount: p.retryCount + 1, error: void 0, onlyUpscale: !!_isDl, resultUrl: _resultUrl });
    if (fItem) { fItem.isRetrying = true; fItem.error = undefined; fItem.prompt.status = "pending"; fItem.prompt.error = undefined; }
    if (state.dispatchCounts) delete state.dispatchCounts[id];
    armRetryWatchdog(id);
  });
  sendLog("info", `Retrying all failed prompts (${failedIds.length})`);
  if (!state.isRunning) state.isRunning = true;
  if (state.settings && state.settings.inputMethod === "code") {
    // Code prompts were already routed through handleCodeRetry above (it appends to the
    // live batch if one is running, or starts a fresh batch if idle). Forcing a second
    // runFlowApiBatch here spawns a PARALLEL batch -> extra worker(s) + desynced timing.
    return;
  }
  void processNextPrompt();
}
function clearCompletedPromptIdInContent(promptId) {
  const service = state.settings?.service || "veo3";
  findAndPrepareServiceTab(service).then((tab) => {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "REMOVE_COMPLETED_PROMPT",
        payload: { promptId }
      }).catch(() => {});
    }
  }).catch(() => {});
}
// Watchdog for a stuck "Retrying…" flag. A retried prompt sets failedItem.isRetrying,
// which is normally cleared when it re-completes (removed from Failed) or cleanly
// re-fails (re-pushed as a fresh object). But a 2K upscale can silently MISS the
// contended download menu and emit no failure event, leaving isRetrying stuck forever
// -> the Retry button stays disabled ("retry на скачивание не работает при повторе").
// If still retrying after the window, clear it so Retry becomes clickable again.
var RETRY_WATCHDOG_MS = 60000;
function armRetryWatchdog(promptId) {
  setTimeout(() => {
    const fi = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
    if (!fi || !fi.isRetrying) return; // already resolved (completed/removed or re-failed)
    const p = state.prompts.find((x) => x.id === promptId);
    if (p && p.status === "completed") return; // actually finished; removal path will clear it
    fi.isRetrying = false;
    if (fi.prompt) fi.prompt.status = "failed";
    sendLog("warning", `Retry for prompt #${(p && p.number) || "?"} produced no result in time — re-enabling Retry`);
    broadcastUpdate();
  }, RETRY_WATCHDOG_MS);
}
function handleRetrySingleFailed(promptId, newText) {
  // A LIVE film_streams run owns the queue exclusively: a mid-run retry would either
  // kill the run (code retry bumps _apiGen -> all stream workers exit) or leave an
  // orphaned pending clone that the film_streams dispatcher gate never picks up.
  // The Failed entry stays untouched — retry works normally after the run ends
  // (runFilmStreams' finally / Stop both release the mode flag).
  if (state.generationMode === "film_streams" && (state.isRunning || state._apiRunning)) {
    sendLog("warning", "Retry: Film run in progress — retry this prompt after it finishes.");
    return;
  }
  let prompt = state.prompts.find((p) => p.id === promptId);
  // Bug#1 fix: a prior fresh Start may have replaced the queue, dropping this id. Re-add the
  // prompt from the preserved Failed list so single-retry works instead of returning early.
  if (!prompt) {
    const _rf = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
    if (_rf && _rf.prompt) { prompt = { ..._rf.prompt, status: "failed", error: void 0, retryCount: _rf.prompt.retryCount || 0 }; state.prompts.push(prompt); }
  }
  if (!prompt || prompt.status !== "failed")
    return;
  const _cfi = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
  if (_cfi && _cfi.prompt && _cfi.prompt._code) { handleCodeRetry(promptId, newText); return; }
  clearCompletedPromptIdInContent(promptId);
  const updatedText = newText !== undefined ? newText : prompt.text;
  const failedItem = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
  // If this was a DOWNLOAD failure (media already generated), re-download it (onlyUpscale +
  // keep resultUrl) instead of re-generating from scratch.
  const _isDl = prompt.errorType === "UPSCALE_FAILED" || prompt.onlyUpscale || (failedItem && (failedItem.errorType === "UPSCALE_FAILED" || (failedItem.prompt && failedItem.prompt.errorType === "UPSCALE_FAILED")));
  const _resultUrl = _isDl ? ((failedItem && failedItem.resultUrl) || prompt.resultUrl || null) : void 0;
  updatePromptStatus(promptId, "pending", {
    text: updatedText,
    retryCount: prompt.retryCount + 1,
    error: void 0,
    onlyUpscale: !!_isDl,
    resultUrl: _resultUrl
  });
  if (failedItem) {
    failedItem.isRetrying = true;
    failedItem.error = undefined;
    failedItem.prompt.status = "pending";
    failedItem.prompt.error = undefined;
  }
  if (state.dispatchCounts) delete state.dispatchCounts[promptId];
  sendLog("info", `Retrying prompt #${prompt.number}`);
  state.retryOnlyIds = state.retryOnlyIds || new Set();
  state.retryOnlyIds.add(promptId);
  if (!state.isRunning) {
    state.isRunning = true;
  }
  if (state.settings && state.settings.inputMethod === "code") {
    state._apiRunning = false;
    runFlowApiBatch({ prompts: state.prompts, settings: state.settings, isRetry: true }).catch(console.error);
    return;
  }
  void processNextPrompt();
  armRetryWatchdog(promptId);
}
function handleRetryUpscale(promptId, newText) {
  // Same guard as handleRetrySingleFailed: never mutate the queue mid-film-run.
  if (state.generationMode === "film_streams" && (state.isRunning || state._apiRunning)) {
    sendLog("warning", "Retry: Film run in progress — retry this prompt after it finishes.");
    return;
  }
  const prompt = state.prompts.find((p) => p.id === promptId);
  if (!prompt) return;
  const _cfi = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
  if (_cfi && _cfi.prompt && _cfi.prompt._code) { handleCodeRetry(promptId, newText); return; }
  clearCompletedPromptIdInContent(promptId);
  const updatedText = newText !== undefined ? newText : prompt.text;
  const failedItem = state.failedPromptsList.find((f) => f.prompt && f.prompt.id === promptId);
  const resultUrl = failedItem ? failedItem.resultUrl : (prompt.resultUrl || null);
  updatePromptStatus(promptId, "pending", {
    text: updatedText,
    retryCount: prompt.retryCount + 1,
    error: void 0,
    onlyUpscale: true,
    resultUrl: resultUrl
  });
  if (failedItem) {
    failedItem.isRetrying = true;
    failedItem.error = undefined;
    failedItem.prompt.status = "pending";
    failedItem.prompt.error = undefined;
  }
  if (state.dispatchCounts) delete state.dispatchCounts[promptId];
  sendLog("info", `Retrying upscale for prompt #${prompt.number}`);
  state.retryOnlyIds = state.retryOnlyIds || /* @__PURE__ */ new Set();
  state.retryOnlyIds.add(promptId);
  if (!state.isRunning) {
    state.isRunning = true;
  }
  void processNextPrompt();
  armRetryWatchdog(promptId);
}
function handleRetryAllUpscales() {
  for (const _ci of state.failedPromptsList.filter((f) => f.prompt && f.prompt._code && (f.errorType === "UPSCALE_FAILED" || f.prompt.errorType === "UPSCALE_FAILED"))) handleCodeRetry(_ci.prompt.id);
  const items = state.failedPromptsList.filter((f) => f.prompt && !f.prompt._code && (f.errorType === "UPSCALE_FAILED" || f.prompt.errorType === "UPSCALE_FAILED"));
  if (items.length === 0) return;
  for (const item of items) {
    const promptId = item.prompt.id;
    clearCompletedPromptIdInContent(promptId);
    if (state.dispatchCounts) delete state.dispatchCounts[promptId]; // reset attempt cap, else Retry-All hits maxAttempts and re-fails without dispatching
    const prompt = state.prompts.find((p) => p.id === promptId);
    if (prompt) {
      updatePromptStatus(promptId, "pending", {
        retryCount: prompt.retryCount + 1,
        error: void 0,
        onlyUpscale: true,
        resultUrl: item.resultUrl
      });
    }
    item.isRetrying = true;
    item.error = undefined;
    if (item.prompt) {
      item.prompt.status = "pending";
      item.prompt.error = undefined;
    }
  }
  sendLog("info", `Retrying ${items.length} upscale failures`);
  state.retryOnlyIds = null;
  if (!state.isRunning) {
    state.isRunning = true;
  }
  void processNextPrompt();
}
function handleRetryAllGenerations() {
  for (const _ci of state.failedPromptsList.filter((f) => f.prompt && f.prompt._code && (f.errorType !== "UPSCALE_FAILED" && f.prompt.errorType !== "UPSCALE_FAILED"))) handleCodeRetry(_ci.prompt.id);
  const items = state.failedPromptsList.filter((f) => f.prompt && !f.prompt._code && (f.errorType !== "UPSCALE_FAILED" && f.prompt.errorType !== "UPSCALE_FAILED"));
  if (items.length === 0) return;
  for (const item of items) {
    const promptId = item.prompt.id;
    clearCompletedPromptIdInContent(promptId);
    if (state.dispatchCounts) delete state.dispatchCounts[promptId]; // reset attempt cap, else Retry-All hits maxAttempts and re-fails without dispatching
    const prompt = state.prompts.find((p) => p.id === promptId);
    if (prompt) {
      updatePromptStatus(promptId, "pending", {
        retryCount: prompt.retryCount + 1,
        error: void 0,
        onlyUpscale: false,
        resultUrl: void 0
      });
    }
    item.isRetrying = true;
    item.error = undefined;
    if (item.prompt) {
      item.prompt.status = "pending";
      item.prompt.error = undefined;
    }
  }
  sendLog("info", `Retrying ${items.length} generation failures`);
  state.retryOnlyIds = null;
  if (!state.isRunning) {
    state.isRunning = true;
  }
  void processNextPrompt();
}
async function processNextPrompt() {
  if (!state.isRunning || state.isPaused || !state.settings)
    return;
  // Code mode is driven entirely by runFlowApiBatch (pure API). The synthetic scheduler must
  // never run here — otherwise content-script REQUEST_NEXT_PROMPT / auto-retry would convert
  // code failures into synthetic clicks ("started as code, then clicked after ~30s").
  if (state.settings.inputMethod === "code") return;
  // Film Streams frames are driven entirely by runFilmStreams (pure API, no activeSlots).
  // The synthetic scheduler must never dispatch them: the stall watchdog used to see
  // "0 slots + pending frames", launch a frame as a CLICKS prompt in parallel with the
  // stream runner, duplicate the generation and orphan the frame's status (stuck spinner).
  if (state.generationMode === "film_streams") return;
  const service = state.settings.service;
  const isFlowBased = ["veo3", "banana", "whisk"].includes(service);
  let maxSlots;
  if (service === "grok") {
    maxSlots = Math.min(state.settings.maxVideoThreads, 20);
  } else if (service === "veo3") {
    maxSlots = Math.min(
      state.settings.maxVideoThreads || 6,
      6,
      Math.max(1, state.prompts.length)
    );
  } else if (service === "whisk") {
    maxSlots = 1;
  } else if (service === "banana") {
    // 2K/4K downloads go through the single serial Flow menu — >4 threads thrashes it and
    // trips anti-bot. Cap at 4 when a hi-res image quality is selected (popup mirrors 1-4).
    const _imgHiRes = state.settings.imageQuality === "2k" || state.settings.imageQuality === "4k";
    maxSlots = Math.min(
      state.settings.maxImageThreads || 2,
      _imgHiRes ? 4 : 6,
      Math.max(1, state.prompts.length)
    );
  } else {
    maxSlots = 1;
  }
  if (state.generationMode === "film" && service !== "veo3") {
    maxSlots = 1;
  }
  if (state.activeSlots.size >= maxSlots) {
    console.log(`[GenFlow] All slots busy (${state.activeSlots.size}/${maxSlots}), waiting...`);
    return;
  }
  const activePromptIds = new Set(Array.from(state.activeSlots.values()).map((s) => s.promptId));
  let nextPrompt;
  if (state.generationMode === "film" && service !== "veo3") {
    // Film is a CHAIN: each frame is built from the previous frame's result. Run strictly
    // in order and HALT downstream if the next-in-order frame isn't ready: if it's failed
    // we hold the rest until the user retries it; if it's processing we wait. This prevents
    // generating later frames from a broken/missing source.
    const sorted = state.prompts.slice().sort((a, b) => (a.number || 0) - (b.number || 0));
    const firstNotDone = sorted.find((p) => p.status !== "completed");
    if (firstNotDone && firstNotDone.status === "pending" && !activePromptIds.has(firstNotDone.id)) {
      nextPrompt = firstNotDone;
    } else {
      if (firstNotDone) console.log(`[GenFlow] Film: chain holds at #${firstNotDone.number} (${firstNotDone.status}) — not running downstream frames`);
      nextPrompt = void 0;
    }
  } else {
    let candidates = state.prompts.filter(
      (p) => p.status === "pending" && !activePromptIds.has(p.id)
    );
    // Targeted single-retry: when the user retries ONE failed item, run only that item —
    // don't resume the rest of a stopped queue (Stop leaves halted prompts as pending).
    if (state.retryOnlyIds && state.retryOnlyIds.size > 0) {
      candidates = candidates.filter((p) => state.retryOnlyIds.has(p.id));
    }
    nextPrompt = candidates.length > 0 ? candidates.slice().sort((a, b) => a.number - b.number)[0] : void 0;
  }
  if (!nextPrompt) {
    for (const [sid, slot] of state.activeSlots.entries()) {
      const p = state.prompts.find((pp) => pp.id === slot.promptId);
      if (!p || p.status !== "processing" && p.status !== "pending") {
        console.warn(`[GenFlow] Removing orphan slot ${sid} (prompt status: ${p?.status ?? "not found"})`);
        state.activeSlots.delete(sid);
      }
    }
    if (state.activeSlots.size === 0) {
      // PIPELINE: prompts whose slot was freed after the 2K click but whose file hasn't
      // landed sit in "downloading". Don't end the run while any are in flight — wait
      // (each resolves to completed on file arrival, or to Failed via its 45s watchdog).
      const _downloadingCount = state.prompts.filter((p) => p.status === "downloading").length;
      if (_downloadingCount > 0 && state.isRunning) {
        console.log(`[GenFlow] ${_downloadingCount} prompt(s) still downloading (slot freed) — waiting before end-of-run`);
        setTimeout(() => processNextPrompt(), 2000);
        return;
      }
      const pendingCount = state.prompts.filter((p) => p.status === "pending").length;
      const processingCount = state.prompts.filter((p) => p.status === "processing").length;
      const completedCount = state.prompts.filter((p) => p.status === "completed").length;
      let failedCount = state.prompts.filter((p) => p.status === "failed").length;
      console.log(`[GenFlow] processNextPrompt: No more prompts. Status: pending=${pendingCount}, processing=${processingCount}, completed=${completedCount}, failed=${failedCount}`);
      // CHECKLIST: with exact claim attribution, downloadReceivedForPrompt is reliable.
      // Any banana prompt marked completed but with NO confirmed 2K download is routed to
      // Failed(download) as an UPSCALE failure with onlyUpscale=true — so the (auto/manual)
      // retry re-upscales the EXISTING image (no re-generate -> no duplicates), and nothing
      // is ever silently "done" without a file.
      if (state.settings && (state.settings.service === "banana" || state.settings.service === "veo3")) {
        // DOWNLOAD grace: a prompt can be "completed" a moment before its file actually
        // lands — Film banana advances the chain without blocking on the 2K bytes (hook),
        // and parallel veo3 video blob downloads (onCreated) lag behind generation-complete.
        // If the checklist runs that instant it false-flags them → needless re-generate
        // (the user sees a finished prompt "redo itself"). Give in-flight downloads a short
        // window to land/attribute before flagging. Harmless for plain banana image runs:
        // their upscale blocks until the 2K is received, so downloadReceivedForPrompt is
        // already set when status flips to completed → nothing is awaiting → no wait.
        {
          const _awaitingDl = state.prompts.filter((p) => p.status === "completed" && !downloadReceivedForPrompt.has(p.id));
          if (_awaitingDl.length > 0) {
            state._dlGraceTicks = (state._dlGraceTicks || 0) + 1;
            if (state._dlGraceTicks <= 12) {
              console.log(`[GenFlow] checklist grace: ${_awaitingDl.length} prompt(s) still awaiting download (tick ${state._dlGraceTicks}/12) — waiting before flagging`);
              setTimeout(() => processNextPrompt(), 3e3);
              return;
            }
            console.warn(`[GenFlow] checklist grace expired — flagging ${_awaitingDl.length} prompt(s) without a file`);
          }
          state._dlGraceTicks = 0;
        }
        const _isImg = state.settings.service === "banana";
        for (const p of state.prompts.slice()) {
          if (p.status === "completed" && !downloadReceivedForPrompt.has(p.id)) {
            // Both image & video: the media GENERATED (status completed) but its file
            // never downloaded → a DOWNLOAD failure, not a generation one. Route to
            // Failed(download) with onlyUpscale so a retry re-downloads the existing media
            // (find card by resultUrl, re-trigger the menu download) — never re-generate.
            const _em = _isImg ? "2K not downloaded" : "Video not downloaded";
            const _et = "UPSCALE_FAILED";
            console.warn(`[GenFlow] checklist: prompt #${p.number} completed without a file -> Failed(download)`);
            const _upd = { error: _em, errorType: _et, onlyUpscale: true, resultUrl: p.resultUrl };
            updatePromptStatus(p.id, "failed", _upd);
            const _fp = state.prompts.find((x) => x.id === p.id);
            if (_fp) {
              state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== _fp.id);
              state.failedPromptsList.push({ prompt: { ..._fp, status: "failed", error: _em, errorType: _et, onlyUpscale: true, resultUrl: _fp.resultUrl }, error: _em, errorType: _et, resultUrl: _fp.resultUrl });
            }
          }
        }
        failedCount = state.prompts.filter((p) => p.status === "failed").length;
      }
      broadcastUpdate();
      if (processingCount > 0) {
        console.warn(`[GenFlow] Force-completing ${processingCount} stuck processing prompts`);
        for (const p of state.prompts) {
          if (p.status === "processing") {
            updatePromptStatus(p.id, "failed", { error: "Stuck in processing (no active slot)" });
          }
        }
      }
      if (state.settings?.closeGrokTabsAfter && state.settings?.service === "grok") {
        closeGrokTabs();
      }
      if (failedCount > 0 && state.settings?.autoRetryFailed && state.settings?.service !== "grok") {
        const maxRetries = state.settings.maxRetries || 3;
        const retriablePrompts = state.prompts.filter(
          (p) => p.status === "failed" && p.retryCount < maxRetries && !isNonRetriableGenerationError(p.error || "")
        );
        if (retriablePrompts.length > 0) {
          sendLog("info", `Auto-retrying ${retriablePrompts.length} failed prompts...`);
          state.prompts = state.prompts.map(
            (p) => p.status === "failed" && p.retryCount < maxRetries && !isNonRetriableGenerationError(p.error || "") ? { ...p, status: "pending", retryCount: p.retryCount + 1, error: void 0 } : p
          );
          state.isRunning = true;
          setTimeout(() => processNextPrompt(), 3e3);
          broadcastUpdate();
          return;
        }
      }
      if (state.settings?.autoDownload !== false && state.settings?.downloadMode === "batch" && state.batchDownloadUrls.length > 0) {
        sendLog("info", `Batch downloading ${state.batchDownloadUrls.length} files...`);
        handleDownloadAll();
      } else {
        const allCompleted = state.prompts.filter((p) => p.status === "completed" && p.resultUrl).length;
        if (allCompleted > 0) {
          sendLog("info", `All prompts completed. ${allCompleted} videos ready for batch download.`);
        }
      }
      sendLog("success", `All prompts processed. ${failedCount > 0 ? `${failedCount} failed.` : ""}`);
      if (state.settings?.service === "grok") {
        await restoreFocusToOriginalTab();
      }
      state.isRunning = false;
      state.activeSlots.clear();
      state.retryOnlyIds = null;
      broadcastUpdate();
    }
    return;
  }
  // Throttle FIRST (so a reschedule doesn't get counted as an attempt). Honors
  // "Wait between prompts" across ALL trigger paths (REQUEST_NEXT_PROMPT had no delay).
  if (service !== "grok") {
    const _now = Date.now();
    if (state.nextDispatchAllowedAt && _now < state.nextDispatchAllowedAt) {
      setTimeout(() => processNextPrompt(), state.nextDispatchAllowedAt - _now);
      return;
    }
    // Reserve the next slot SYNCHRONOUSLY right here (before any further logic), so the first
    // wave can't fire maxSlots prompts in one burst before the gate is armed (the commit below
    // was arming it too late / could be skipped). Guaranteed > 0 even if getRandomDelay misfires.
    state.nextDispatchAllowedAt = _now + Math.max(1000, getRandomDelay(state.settings) || 5000);
  }
  // Hard safety cap: count only REAL dispatches (after the throttle gate). Breaks any
  // infinite re-generation loop. On the (maxAttempts+1)-th attempt the prompt is failed.
  state.dispatchCounts = state.dispatchCounts || {};
  const _maxAttempts = Math.min(6, Math.max(1, (state.settings && Number(state.settings.maxAttempts)) || 2));
  const _dc = state.dispatchCounts[nextPrompt.id] || 0;
  if (_dc >= _maxAttempts) {
    // Fix A: a parallel retry may have ALREADY downloaded this prompt's file. Don't let
    // the attempt cap overwrite that success with "failed" (caused completed↔failed
    // flapping + false failures at high thread counts).
    if (downloadReceivedForPrompt.has(nextPrompt.id) && !(nextPrompt.partial && nextPrompt.partial.failed > 0)) {
      console.log(`[GenFlow] prompt #${nextPrompt.number} hit attempt cap but its file already downloaded — completing (not failing)`);
      updatePromptStatus(nextPrompt.id, "completed", { completedAt: Date.now() });
      state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== nextPrompt.id);
      broadcastUpdate();
      saveState();
      setTimeout(() => processNextPrompt(), 300);
      return;
    }
    console.warn(`[GenFlow] prompt #${nextPrompt.number} reached ${_maxAttempts} attempt(s) — stopping, marking failed`);
    const _em = `Max attempts reached (${_maxAttempts})`;
    // If the prompt ALREADY generated (onlyUpscale, or it has a result URL), this is a
    // DOWNLOAD failure, not a generation one — route it to Failed(download) with
    // onlyUpscale so a retry re-downloads the existing media instead of re-generating.
    const _genned = nextPrompt.onlyUpscale || !!nextPrompt.resultUrl;
    const _et = _genned ? "UPSCALE_FAILED" : "GENERATION_FAILED";
    const _ou = _genned ? true : void 0;
    updatePromptStatus(nextPrompt.id, "failed", { error: _em, errorType: _et, onlyUpscale: _ou, resultUrl: nextPrompt.resultUrl });
    const _fp = state.prompts.find((x) => x.id === nextPrompt.id);
    if (_fp) {
      state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== _fp.id);
      state.failedPromptsList.push({ prompt: { ..._fp, status: "failed", error: _em, errorType: _et, onlyUpscale: _ou, resultUrl: _fp.resultUrl }, error: _em, errorType: _et, resultUrl: _fp.resultUrl });
      broadcastUpdate();
      saveState();
    }
    setTimeout(() => processNextPrompt(), 300);
    return;
  }
  // Commit: we are actually dispatching now — arm the throttle gate and count the attempt.
  if (service !== "grok") state.nextDispatchAllowedAt = Date.now() + getRandomDelay(state.settings);
  state.dispatchCounts[nextPrompt.id] = _dc + 1;
  console.log(`[GenFlow] Processing prompt #${nextPrompt.number}, slots: ${state.activeSlots.size}/${maxSlots}`);
  updatePromptStatus(nextPrompt.id, "processing");
  const slotId = Date.now();
  if (service === "grok") {
    state.activeSlots.set(slotId, { tabId: 0, promptId: nextPrompt.id });
    broadcastUpdate();
  }
  const tab = await getServiceTab(state.settings.service);
  if (!tab || !tab.id) {
    handleGenerationFailed({ 
      promptId: nextPrompt.id, 
      error: "Could not access service tab",
      errorType: nextPrompt.onlyUpscale ? "UPSCALE_FAILED" : "GENERATION_FAILED",
      resultUrl: nextPrompt.resultUrl,
      previewUrl: nextPrompt.previewUrl
    });
    if (service === "grok")
      state.activeSlots.delete(slotId);
    return;
  }
  state.activeSlots.set(slotId, { tabId: tab.id, promptId: nextPrompt.id });
  broadcastUpdate();
  try {
    if (service === "grok") {
      await activateTabForGrokInjection(tab.id);
    }
    await ensureContentScriptInjected(tab.id, state.settings.service);
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (service === "grok") {
      await activateTabForGrokInjection(tab.id);
    }
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "INJECT_PROMPT",
      payload: {
        prompt: nextPrompt,
        settings: state.settings,
        slotId,
        generationMode: state.generationMode
      }
    });
    sendLog("info", `Injecting prompt #${nextPrompt.number}`);
    if (!response || response.success !== false) {
      const service = state.settings?.service || "veo3";
      trackUsageOnServer(service);
    }
    if (service !== "grok" && state.activeSlots.size < maxSlots) {
      // Honor the user's "Wait between prompts" setting for every service
      // (veo3/banana previously used a hardcoded 500ms and ignored it). The
      // content script still enforces its own ~2s API floor as a safety net.
      const delay = getRandomDelay(state.settings);
      setTimeout(() => processNextPrompt(), delay);
    }
  } catch (error) {
    console.error("Failed to inject prompt:", error);
    handleGenerationFailed({
      promptId: nextPrompt.id,
      error: "Failed to inject prompt into page",
      errorType: nextPrompt.onlyUpscale ? "UPSCALE_FAILED" : "GENERATION_FAILED",
      resultUrl: nextPrompt.resultUrl,
      previewUrl: nextPrompt.previewUrl
    });
    state.activeSlots.delete(slotId);
  }
}
// ===== Download pipeline (Step 1) =====
// A prompt in "downloading" status has had its SLOT released after the 2K click but is
// still waiting for its file to land via the MAIN-world hook / Chrome download. It is
// marked "completed" ONLY when the file actually arrives (completeIfDownloading), never
// before — that is what lost files. If the file never lands, the watchdog routes it to
// Failed(download) with onlyUpscale (re-download, no re-generate).
function completeIfDownloading(promptId) {
  if (!promptId) return;
  const p = state.prompts.find((x) => x.id === promptId);
  if (!p || p.status !== "downloading") return;
  updatePromptStatus(promptId, "completed", { completedAt: Date.now() });
  state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== promptId);
  sendLog("success", `Prompt #${p.number} completed (file downloaded)`);
  broadcastUpdate();
  saveState();
}
var DOWNLOAD_PIPELINE_TIMEOUT_MS = 120000; // was 45s — code-output VIDEO 1080p/4K upscale can exceed it
function armDownloadWatchdog(promptId) {
  setTimeout(() => {
    const p = state.prompts.find((x) => x.id === promptId);
    if (!p || p.status !== "downloading") return; // already completed / removed
    if (downloadReceivedForPrompt.has(promptId)) { completeIfDownloading(promptId); return; }
    console.warn(`[GenFlow] pipeline: prompt #${p.number} file never landed (${DOWNLOAD_PIPELINE_TIMEOUT_MS / 1e3}s) -> Failed(download)`);
    const _em = "2K not downloaded", _et = "UPSCALE_FAILED";
    updatePromptStatus(promptId, "failed", { error: _em, errorType: _et, onlyUpscale: true, resultUrl: p.resultUrl });
    const _fp = state.prompts.find((x) => x.id === promptId);
    if (_fp) {
      state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== promptId);
      state.failedPromptsList.push({ prompt: { ..._fp, status: "failed", error: _em, errorType: _et, onlyUpscale: true, resultUrl: _fp.resultUrl }, error: _em, errorType: _et, resultUrl: _fp.resultUrl });
    }
    broadcastUpdate();
    saveState();
    setTimeout(() => processNextPrompt(), 300);
  }, DOWNLOAD_PIPELINE_TIMEOUT_MS);
}
function handleGenerationComplete(payload) {
  // Track the generated mediaId (synthetic / clicks-input path) so "Download All" can restrict to
  // generated items only — the code-INPUT path (runFlowApiBatch) captures its own ids separately.
  // The default is clicks-input + code-output, so WITHOUT this the set stays empty and Download All
  // falls back to grabbing the whole page.
  if (payload && payload.resultUrl) {
    state.generatedMediaIds = state.generatedMediaIds || new Set();
    for (const _u of String(payload.resultUrl).split(",")) {
      const _gm = _u.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      if (_gm) state.generatedMediaIds.add(_gm[1].toLowerCase());
    }
  }
  // PIPELINE: content released the slot right after the 2K CLICK; the file is still landing
  // via the hook. Free the slot now (next prompt generates) but DO NOT complete — keep the
  // prompt "downloading" until its file actually arrives. Guarantees "completed" never
  // appears without a real file.
  if (payload.downloadPending) {
    let _pp = state.prompts.find((p) => p.id === payload.promptId);
    if (!_pp && payload.promptNumber != null) _pp = state.prompts.find((p) => p.status === "processing" && p.number === payload.promptNumber);
    if (_pp) {
      for (const [slotId, slot] of state.activeSlots.entries()) {
        if (slot.promptId === _pp.id) { state.activeSlots.delete(slotId); break; }
      }
      if (downloadReceivedForPrompt.has(_pp.id)) {
        updatePromptStatus(_pp.id, "completed", { resultUrl: payload.resultUrl, completedAt: Date.now() });
        state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== _pp.id);
        sendLog("success", `Prompt #${_pp.number} completed`);
      } else {
        updatePromptStatus(_pp.id, "downloading", { resultUrl: payload.resultUrl, downloadStartedAt: Date.now() });
        sendLog("info", `Prompt #${_pp.number} downloading in background (slot freed)`);
        armDownloadWatchdog(_pp.id);
      }
      broadcastUpdate();
      saveState();
      setTimeout(() => processNextPrompt(), 300);
      return;
    }
  }
  if (payload.partial && payload.partial.suspicious) {
    const _susLim = Math.max(0, Number(state.settings?.suspiciousLimit ?? 2));
    const _pauseSec = Math.max(0, Number(state.settings?.rateLimitPauseSec ?? 10));
    const _nowMs = Date.now();
    if (state.cooldownUntil && state.cooldownUntil > _nowMs) {
      // A pause is already running — this is a later report from the SAME wave. Absorb it:
      // don't re-count it toward the hard-stop and don't restart the countdown.
      console.warn(`[GenFlow] Suspicious activity (partial) — cooldown already active, ${Math.ceil((state.cooldownUntil - _nowMs) / 1000)}s left (absorbed)`);
    } else {
      // Fresh wave -> count it ONCE toward the consecutive-suspicious streak (= number of pauses).
      state.consecutiveSuspicious = (state.consecutiveSuspicious || 0) + 1;
      if (_susLim > 0 && state.consecutiveSuspicious >= _susLim) {
        // Reached the user's "Stop on suspicious xN" limit -> HARD STOP, no auto-resume (otherwise
        // we'd pause-then-resume straight back into the same wall — a pointless carousel).
        state.isRunning = false;
        state.isPaused = false;
        state.cooldownUntil = 0;
        state.nextDispatchAllowedAt = 0;
        state.cooldownReason = "";
        state.stopReason = "suspicious";
        console.warn(`[GenFlow] HARD STOP — ${state.consecutiveSuspicious}x suspicious activity in a row`);
        sendLog("error", `Stopped: suspicious activity ${state.consecutiveSuspicious}x in a row — wait a bit and retry, or lower threads.`);
        sendAbortInjections();
        requeueActivePromptsOnStop(payload.promptId);
        broadcastUpdate();
      } else {
        state.cooldownUntil = _nowMs + _pauseSec * 1e3;
        state.cooldownReason = "Suspicious activity";
        state.nextDispatchAllowedAt = Math.max(state.nextDispatchAllowedAt || 0, state.cooldownUntil);
        console.warn(`[GenFlow] Suspicious activity (partial) — pausing dispatch ${_pauseSec}s (${state.consecutiveSuspicious}/${_susLim || "off"})`);
      }
      saveState();
    }
  } else if (payload.resultUrl && !(payload.partial && payload.partial.failed)) {
    state.consecutiveSuspicious = 0; // clean success breaks the suspicious streak
  }
  if (payload.partial && payload.partial.failed > 0) {
    sendLog("warning", `Prompt #${payload.promptNumber}: ${payload.partial.failed}/${payload.partial.expected} output(s) failed, kept ${(payload.partial.expected || 0) - (payload.partial.failed || 0)}`);
  }
  let prompt = state.prompts.find((p) => p.id === payload.promptId);
  if (!prompt && payload.promptNumber != null) {
    prompt = state.prompts.find(
      (p) => p.status === "processing" && p.number === payload.promptNumber
    ) ?? state.prompts.find((p) => p.number === payload.promptNumber) ?? void 0;
  }
  const targetId = payload.promptId || (prompt ? prompt.id : null);
  if (targetId) {
    state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== targetId);
  }
  let slotRemoved = false;
  for (const [slotId, slot] of state.activeSlots.entries()) {
    if (slot.promptId === payload.promptId || prompt && slot.promptId === prompt.id) {
      state.activeSlots.delete(slotId);
      slotRemoved = true;
      break;
    }
  }
  try {
    if (!prompt) {
      if (payload.promptNumber != null) {
        const byNum = state.prompts.find((p) => p.number === payload.promptNumber);
        if (byNum) {
          // Same silent-loss chokepoint as the by-id path: a banana 2K prompt matched by
          // number (id mismatch, e.g. after an SW restart) with NO real file must NOT be
          // marked completed — route to Failed(download).
          const _svc = state.settings && state.settings.service;
          const _q = ((state.settings && state.settings.imageQuality) || "").toLowerCase();
          if (_svc === "banana" && /2k|4k/.test(_q) && !payload.downloaded && !payload.downloadPending && !downloadReceivedForPrompt.has(byNum.id) && state.settings?.autoDownload !== false) {
            const _em = "2K not downloaded", _et = "UPSCALE_FAILED";
            updatePromptStatus(byNum.id, "failed", { error: _em, errorType: _et, onlyUpscale: true, resultUrl: payload.resultUrl });
            state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== byNum.id);
            state.failedPromptsList.push({ prompt: { ...byNum, status: "failed", error: _em, errorType: _et, onlyUpscale: true, resultUrl: payload.resultUrl }, error: _em, errorType: _et, resultUrl: payload.resultUrl });
            sendLog("warning", `Prompt #${payload.promptNumber} matched by number with no 2K file -> Failed(download)`);
          } else {
            updatePromptStatus(byNum.id, "completed", {
              resultUrl: payload.resultUrl,
              completedAt: Date.now()
            });
            sendLog("success", `Prompt #${payload.promptNumber} completed (matched by number)`);
          }
        }
      }
      if (state.settings?.autoDownload !== false && payload.resultUrl && payload.promptNumber != null && !state.processedDownloadUrls.has(payload.resultUrl)) {
        state.processedDownloadUrls.add(payload.resultUrl);
        if (!payload.downloaded) {
          const promptForFilename = { number: payload.promptNumber, text: "" };
          // N videos of one prompt arrive as separate results sharing the same number, so an
          // index-less name made every file _Video_1 and Chrome deduped them into "(1)"/"(2)".
          // Key the per-prompt counter by the result URL: distinct results get 1,2,3 while a
          // repeat of the same URL keeps the number it already had.
          const filename = generateFilename(promptForFilename, assignPhotoIndex(promptForFilename, payload.resultUrl));
          if (state.settings?.downloadMode === "batch") {
            state.batchDownloadUrls.push({ url: payload.resultUrl, filename, promptNumber: payload.promptNumber });
            sendLog("info", `Queued for batch download: ${filename}`);
          } else {
            handleDownload({ url: payload.resultUrl, filename });
          }
        } else {
          sendLog("info", `Download already handled by content script (matched by number)`);
        }
      }
      if (state.generationMode === "film" && payload.resultUrl) {
        const nextPromptIndex = state.prompts.findIndex((p) => p.status === "pending");
        if (nextPromptIndex !== -1) {
          state.prompts[nextPromptIndex] = {
            ...state.prompts[nextPromptIndex],
            imageUrl: payload.resultUrl
          };
          broadcastUpdate();
        }
      }
      if (!slotRemoved && state.activeSlots.size > 0) {
        const firstEntry = state.activeSlots.entries().next().value;
        if (firstEntry)
          state.activeSlots.delete(firstEntry[0]);
      }
      broadcastUpdate();
      return;
    }
    console.log(`[GenFlow] handleGenerationComplete: Processing prompt #${prompt.number} (ID: ${payload.promptId})`);
    console.log(`[GenFlow] Current status: ${prompt.status}, Active slots: ${state.activeSlots.size}`);
    if (payload.resultUrl && state.processedDownloadUrls.has(payload.resultUrl)) {
      console.log(`[GenFlow] Duplicate result URL for prompt #${prompt.number}, still marking complete`);
    }
    // SILENT-LOSS CHOKEPOINT: a banana 2K/4K prompt that reports "complete" but produced
    // NO real downloaded file (downloaded=false, not a pipeline downloadPending, and no
    // file ever arrived) is NOT done — its upscale/download block was skipped or failed.
    // Route it to Failed(download) with onlyUpscale (retry re-downloads the existing image)
    // instead of silently "completed" without a file (the recurring 6/9-style loss). Every
    // legit case is excluded: downloaded=true, pipeline downloadPending, file already
    // received, or non-2K (1K saves inline).
    {
      const _svc = state.settings && state.settings.service;
      const _q = ((state.settings && state.settings.imageQuality) || "").toLowerCase();
      if (_svc === "banana" && /2k|4k/.test(_q) && !payload.downloaded && !payload.downloadPending && !downloadReceivedForPrompt.has(prompt.id) && state.settings?.autoDownload !== false) {
        console.warn(`[GenFlow] prompt #${prompt.number} reported complete with NO 2K file -> Failed(download)`);
        const _em = "2K not downloaded", _et = "UPSCALE_FAILED";
        updatePromptStatus(prompt.id, "failed", { error: _em, errorType: _et, onlyUpscale: true, resultUrl: payload.resultUrl });
        const _fp = state.prompts.find((x) => x.id === prompt.id);
        if (_fp) {
          state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== prompt.id);
          state.failedPromptsList.push({ prompt: { ..._fp, status: "failed", error: _em, errorType: _et, onlyUpscale: true, resultUrl: _fp.resultUrl }, error: _em, errorType: _et, resultUrl: _fp.resultUrl });
        }
        broadcastUpdate();
        saveState();
        return;
      }
    }
    updatePromptStatus(prompt.id, "completed", {
      resultUrl: payload.resultUrl,
      completedAt: Date.now(),
      partial: payload.partial,
      failedTileIds: void 0
    });
    if (!slotRemoved) {
      console.warn(`[GenFlow] No active slot found for prompt #${prompt.number} (ID: ${prompt.id})`);
    }
    sendLog("success", `Prompt #${prompt.number} completed`);
    if (payload.downloaded) {
      console.log(`[GenFlow] Download already handled by content script for prompt #${prompt.number}`);
      if (payload.resultUrl) {
        state.processedDownloadUrls.add(payload.resultUrl);
      }
    } else if (state.settings?.autoDownload !== false && payload.resultUrl && !state.processedDownloadUrls.has(payload.resultUrl)) {
      state.processedDownloadUrls.add(payload.resultUrl);
      // Same per-prompt counter as above: several results of one prompt must not all be _1.
      const filename = generateFilename(prompt, assignPhotoIndex(prompt, payload.resultUrl));
      if (state.settings?.downloadMode === "batch") {
        state.batchDownloadUrls.push({ url: payload.resultUrl, filename, promptNumber: prompt.number });
        sendLog("info", `Queued for batch download: ${filename}`);
      } else {
        handleDownload({ url: payload.resultUrl, filename });
      }
    }
    if (state.generationMode === "film" && payload.resultUrl && state.settings?.service !== "veo3") {
      state.lastResultUrl = payload.resultUrl;
      console.log(`[GenFlow] Film mode: saved result for chaining`);
      const nextPromptIndex = state.prompts.findIndex((p) => p.status === "pending");
      if (nextPromptIndex !== -1) {
        state.prompts[nextPromptIndex] = {
          ...state.prompts[nextPromptIndex],
          imageUrl: payload.resultUrl
        };
        broadcastUpdate();
      }
    }
    if (payload.partial && payload.partial.failed > 0) {
      const _exp = payload.partial.expected || 0, _fail = payload.partial.failed || 0;
      // Guard: a single-image prompt (expected<=1) that DID produce an image is not a
      // "partial" failure. Under claim-collision a late/spurious "failed" signal would
      // otherwise shove an already-done prompt into Failed (generation) ("заносит в
      // Failed то, что уже сделано"). Only honor partial fails when more than one image
      // was expected, or when nothing was produced (no resultUrl + not yet downloaded).
      const _gotImage = !!payload.resultUrl || downloadReceivedForPrompt.has(prompt.id);
      if (_exp <= 1 && _gotImage) {
        sendLog("info", `Prompt #${prompt.number}: stale partial-fail ignored (image already produced)`);
      } else {
      const _err = `${_fail}/${_exp} failed: ${payload.partial.suspicious ? "suspicious activity" : "generation error"}`;
      updatePromptStatus(prompt.id, "failed", { error: _err, errorType: "GENERATION_FAILED", partial: payload.partial, failedTileIds: (payload.partial && payload.partial.tileIds) || [] });
      const _pf = state.prompts.find((p) => p.id === prompt.id);
      state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== prompt.id);
      state.failedPromptsList.push({ prompt: { ..._pf, status: "failed", error: _err, errorType: "GENERATION_FAILED", partial: payload.partial }, error: _err, errorType: "GENERATION_FAILED" });
      sendLog("warning", `Prompt #${prompt.number}: kept ${_exp - _fail}/${_exp}, ${_fail} -> Failed`);
    }
    }
    if (payload.resultUrl && state.settings?.apiDownload !== false) {
      try { if (prompt && prompt.id) downloadReceivedForPrompt.add(prompt.id); } catch (_e2) {}
      const _ep = state.settings?.editorEndpoint || "http://127.0.0.1:5050/upload";
      const _svc = state.settings?.service || "veo3";
      const _isVid = _svc === "veo3" || _svc === "grok";
      const _type = _isVid ? "video" : "photo";
      const _name = generateFilename(prompt || { number: payload.promptNumber ?? 0, text: "" });
      const _urls = String(payload.resultUrl).split(",").map((u) => u.trim()).filter(Boolean);
      (async () => {
        for (let _i = 0; _i < _urls.length; _i++) {
          try {
            const _res = await fetch(_urls[_i]);
            const _ct = _res.headers.get("content-type") || (_isVid ? "video/mp4" : "image/jpeg");
            const _by = new Uint8Array(await _res.arrayBuffer());
            let _bin = "";
            for (let _j = 0; _j < _by.length; _j += 8000) _bin += String.fromCharCode.apply(null, _by.subarray(_j, _j + 8000));
            const _dot = _name.lastIndexOf(".");
            const _nm = _urls.length > 1 ? (_dot > 0 ? _name.slice(0, _dot) + "_" + (_i + 1) + _name.slice(_dot) : _name + "_" + (_i + 1)) : _name;
            await fetch(_ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "data:" + _ct + ";base64," + btoa(_bin), name: _nm, type: _type }) });
            console.log("[GenFlow] editor bridge: sent " + _type + " " + _nm + " -> " + _ep);
            try { if (prompt && prompt.id) downloadReceivedForPrompt.add(prompt.id); } catch (_e) {}
          } catch (e) { console.warn("[GenFlow] editor bridge failed:", e && e.message); }
        }
      })();
    }
    console.log(`[GenFlow] Prompt #${prompt.number} done. Next prompt will be scheduled by listener.`);
    broadcastUpdate();
  } catch (err) {
    console.error("[GenFlow] handleGenerationComplete error:", err);
    throw err;
  }
}
function handleGenerationFailed(payload) {
  // Rate-limit / bot-detect backoff: when Google throttles (429) or flags "suspicious
  // activity", pause dispatching for the user-set window (default 10s) instead of
  // hammering (which worsens both), and surface a live countdown on the Queue panel.
  const _errStr = (payload.error || "").toLowerCase();
  const _isBlock = /suspicious|подозрительн/.test(_errStr);
  const _is429 = /429|rate.?limit|too many|слишком много/.test(_errStr);
  // Session-stale hint: a Veo timeout / stalled slot is usually a stale Flow session -> count it.
  if (/timed out|timeout|stalled/.test(_errStr)) gfNoteStall("timeout");
  if (_isBlock || _is429) {
    const _pauseSec = Math.max(0, Number(state.settings?.rateLimitPauseSec ?? 10));
    const _susLim = Math.max(0, Number(state.settings?.suspiciousLimit ?? 2));
    const _nowMs = Date.now();
    const _coolingNow = state.cooldownUntil && state.cooldownUntil > _nowMs;
    if (_coolingNow) {
      // A pause is already running — later report from the SAME wave. Don't re-count, don't restart.
      console.warn(`[GenFlow] ${_isBlock ? "Suspicious activity" : "Rate limit"} — cooldown already active, ${Math.ceil((state.cooldownUntil - _nowMs) / 1000)}s left (absorbed)`);
    } else {
      // Fresh wave. Suspicious-activity blocks count toward the user's "Stop on suspicious xN"
      // hard-stop (429 throttles don't — those just back off). Count ONCE per wave (= per pause).
      if (_isBlock) {
        state.consecutiveSuspicious = (state.consecutiveSuspicious || 0) + 1;
        if (_susLim > 0 && state.consecutiveSuspicious >= _susLim) {
          state.isRunning = false;
          state.isPaused = false;
          state.cooldownUntil = 0;
          state.nextDispatchAllowedAt = 0;
          state.cooldownReason = "";
          state.stopReason = "suspicious";
          console.warn(`[GenFlow] HARD STOP — ${state.consecutiveSuspicious}x suspicious activity in a row`);
          sendLog("error", `Stopped: suspicious activity ${state.consecutiveSuspicious}x in a row — wait a bit and retry, or lower threads.`);
          sendAbortInjections();
          requeueActivePromptsOnStop(payload.promptId);
          broadcastUpdate();
          saveState();
        }
      }
      if (state.isRunning && _pauseSec > 0) {
        state.cooldownUntil = _nowMs + _pauseSec * 1e3;
        state.cooldownReason = _isBlock ? "Suspicious activity" : "Rate limit";
        state.nextDispatchAllowedAt = Math.max(state.nextDispatchAllowedAt || 0, state.cooldownUntil);
        console.warn(`[GenFlow] ${state.cooldownReason} — pausing dispatch ${_pauseSec}s (${state.consecutiveSuspicious}/${_susLim || "off"})`);
        broadcastUpdate();
        saveState();
      }
    }
  }
  let prompt = state.prompts.find((p) => p.id === payload.promptId);
  if (!prompt) {
    prompt = {
      id: payload.promptId || crypto.randomUUID(),
      number: payload.promptNumber || 0,
      text: payload.promptText || "Project Media Item",
      status: "failed",
      error: payload.error,
      errorType: payload.errorType || "UPSCALE_FAILED",
      createdAt: Date.now(),
      onlyUpscale: true,
      resultUrl: payload.resultUrl,
      previewUrl: payload.previewUrl
    };
    state.prompts.push(prompt);
    sendLog("error", `Offline download failed: ${payload.error}`);
    state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== prompt.id);
    state.failedPromptsList.push({
      prompt: { 
        ...prompt, 
        status: "failed", 
        error: payload.error,
        errorType: payload.errorType,
        resultUrl: payload.resultUrl,
        previewUrl: payload.previewUrl
      },
      error: payload.error,
      errorType: payload.errorType,
      resultUrl: payload.resultUrl,
      previewUrl: payload.previewUrl
    });
    broadcastUpdate();
    return;
  }
  // Fix A: if this prompt's file ALREADY landed (a parallel attempt succeeded), this
  // failure signal is stale — treat it as success instead of failing/retrying. Stops the
  // completed↔failed flapping and false "Failed" when downloads race retries at high
  // thread counts.
  if (downloadReceivedForPrompt.has(prompt.id) && prompt.status !== "completed" && !(prompt.partial && prompt.partial.failed > 0)) {
    console.log(`[GenFlow] prompt #${prompt.number} reported failure but its file already downloaded — marking completed`);
    updatePromptStatus(prompt.id, "completed", { completedAt: Date.now() });
    state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== prompt.id);
    broadcastUpdate();
    return;
  }
  // Если это ошибка апскейла (или промт запущен в режиме onlyUpscale), мы НЕ игнорируем ошибку,
  // даже если промт сейчас не находится в статусе "processing" (например, он уже был "completed").
  if (prompt.status !== "processing" && !prompt.onlyUpscale && payload.errorType !== "UPSCALE_FAILED") {
    console.warn(
      "[GenFlow] GENERATION_FAILED ignored (prompt not processing):",
      payload.promptId,
      "status=",
      prompt.status
    );
    return;
  }
  const isGrok = state.settings?.service === "grok";
  const isUpscaleFail = payload.errorType === "UPSCALE_FAILED";
  const retryResultUrl = payload.resultUrl || prompt.resultUrl;
  // UPSCALE_FAILED means the video/image already generated — it may ONLY be
  // retried as onlyUpscale on the existing result, and only if we have its URL.
  // It must NEVER re-generate the whole thing (that wasted quota and spammed the
  // same prompt over and over).
  const shouldRetry = !isGrok && state.settings?.autoRetryFailed && state.settings?.inputMethod !== "code" && prompt.retryCount < (state.settings?.maxRetries || 1) && !isNonRetriableGenerationError(payload.error) && (!isUpscaleFail || !!retryResultUrl);
  if (shouldRetry) {
    updatePromptStatus(payload.promptId, "pending", {
      retryCount: prompt.retryCount + 1,
      ...(isUpscaleFail ? { onlyUpscale: true, resultUrl: retryResultUrl } : {})
    });
    sendLog("warning", `Prompt #${prompt.number} ${isUpscaleFail ? "upscale " : ""}failed, retrying... (${prompt.retryCount + 1}/${state.settings?.maxRetries})`);
  } else {
    const errorType = payload.errorType || (prompt.onlyUpscale ? "UPSCALE_FAILED" : "GENERATION_FAILED");
    const resUrl = payload.resultUrl || prompt.resultUrl;
    const prevUrl = payload.previewUrl || prompt.previewUrl;
    updatePromptStatus(payload.promptId, "failed", { 
      error: payload.error,
      errorType: errorType,
      resultUrl: resUrl,
      previewUrl: prevUrl
    });
    sendLog("error", `Prompt #${prompt.number} failed: ${payload.error}`);
    state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== prompt.id);
    state.failedPromptsList.push({
      prompt: { 
        ...prompt, 
        status: "failed", 
        error: payload.error,
        errorType: errorType,
        resultUrl: resUrl,
        previewUrl: prevUrl
      },
      error: payload.error,
      errorType: errorType,
      resultUrl: resUrl,
      previewUrl: prevUrl
    });
    // Systemic-error breaker: bump the consecutive-error streak on a genuine terminal failure.
    // Exclude suspicious/429 — those have their own per-wave backoff + suspiciousLimit hard-stop.
    if (!_isBlock && !_is429 && prompt.status !== "failed") gfNoteFailStreak(payload.error);
  }
  for (const [slotId, slot] of state.activeSlots.entries()) {
    if (slot.promptId === payload.promptId) {
      state.activeSlots.delete(slotId);
      break;
    }
  }
  // Push the new prompt status + Failed list to the popup NOW. On a hard-stop / stop, isRunning is
  // false so processNextPrompt below bails without broadcasting — without this, the Failed entry
  // wouldn't reach the UI until the next unrelated broadcast (e.g. clearing the queue).
  broadcastUpdate();
  saveState();
  const delay = state.settings ? getRandomDelay(state.settings) : 5e3;
  setTimeout(() => {
    processNextPrompt();
  }, delay);
}
// Функция handleDownload управляет загрузкой файлов через chrome.downloads API.
// Она поддерживает разделение нескольких URL-адресов, если они переданы через запятую (например, для нескольких слотов).
// Также она предотвращает перезапись файлов путем добавления числового суффикса (_1, _2 и т.д.) к имени каждого файла.
async function handleDownload(payload) {
  try {
    if (!payload.url) {
      console.error("[GenFlow] handleDownload: URL is empty");
      sendLog("error", "Загрузка отменена: пустой URL");
      return;
    }
    
    console.log("[GenFlow] handleDownload started with payload:", payload);
    // Разделяем URL-адреса, если передано несколько ссылок через запятую
    const urls = payload.url.split(",").map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      console.error("[GenFlow] handleDownload: no valid URLs found in string");
      sendLog("error", "Загрузка отменена: нет валидных ссылок");
      return;
    }

    console.log(`[GenFlow] handleDownload: found ${urls.length} URLs to download`);
    for (let i = 0; i < urls.length; i++) {
      const singleUrl = urls[i];
      let filename = payload.filename || "file";
      
      // Multiple results for one prompt: bump the unified Photo/Video index M
      // (Promt_1_Photo_1_... -> _Photo_2_...). Fall back to a legacy _N suffix
      // only if the name isn't in the unified format.
      if (urls.length > 1 && i > 0) {
        const bumped = filename.replace(/_(Photo|Video)_\d+_/, `_$1_${i + 1}_`);
        if (bumped !== filename) {
          filename = bumped;
        } else {
          const lastDot = filename.lastIndexOf(".");
          filename = lastDot !== -1 ? filename.substring(0, lastDot) + `_${i + 1}` + filename.substring(lastDot) : filename + `_${i + 1}`;
        }
      }

      console.log(`[GenFlow] Downloading item ${i+1}/${urls.length}: url=${singleUrl}, filename=${filename}`);
      // Регистрируем имя файла для перехвата в обработчике onDeterminingFilename
      pendingDownloadFilenames.set(singleUrl, filename);
      
      const nameMatch = singleUrl.match(/name=([a-f0-9-]+)/i);
      if (nameMatch) {
        pendingDownloadFilenames.set(nameMatch[1], filename);
      }
      
      const uuidMatch = singleUrl.match(/([a-f0-9-]{36})/);
      if (uuidMatch) {
        pendingDownloadFilenames.set(uuidMatch[1], filename);
      }

      const dlId = await chrome.downloads.download({
        url: singleUrl,
        filename: filename,
        saveAs: false
      });
      // Match by download id in onDeterminingFilename — stable across the media
      // redirect (the redirected URL has a different UUID, breaking URL/name
      // matching, which left i2v videos saved as a bare UUID with no extension).
      if (typeof dlId === "number") pendingDownloadById.set(dlId, filename);
      console.log(`[GenFlow] Download triggered: ${filename} (id=${dlId})`);
      sendLog("info", `Скачан файл: ${filename}`);
    }
  } catch (error) {
    console.error(`[GenFlow] Download failed for filename ${payload.filename}:`, error);
    sendLog("error", `Сбой скачивания файла ${payload.filename || "неизвестно"}: ${error.message || error}`);
  }
}
chrome.downloads.onCreated.addListener((downloadItem) => {
  // We save the 2K ourselves via the hook (UPSCALE_DOWNLOAD, a data: download). Flow's
  // OWN download is a blob: with Flow's name. Cancel it during a banana run to avoid
  // both a wrong-named file and a duplicate. Our data: downloads are never blob:.
  if (state.isRunning && state.settings && state.settings.service === "banana"
      && /^blob:/.test(downloadItem.url || "")) {
    try { chrome.downloads.cancel(downloadItem.id, () => { if (chrome.runtime.lastError) {} }); } catch (e) {}
    console.log("[GenFlow] Cancelled Flow's own blob image download (2K via hook):", downloadItem.id);
    return;
  }
  // Reserve the expecting entry for blob: downloads or unmapped URLs.
  const isBlobDownload = /^blob:/.test(downloadItem.url || "");
  const isAlreadyMapped = downloadUrlToPromptId.has(downloadItem.url);
  if (expectingDownloads.length > 0 && (isBlobDownload || !isAlreadyMapped)) {
    const entry = expectingDownloads.shift();
    if (entry.timeoutId) clearTimeout(entry.timeoutId);
    const pid = entry.promptId;
    console.log(`[GenFlow] Intercepted onCreated download for expected promptId ${pid}: url=${downloadItem.url}`);
    downloadReceivedForPrompt.add(pid); completeIfDownloading(pid);
    downloadUrlToPromptId.set(downloadItem.url, pid);
    const nameMatch = downloadItem.url.match(/name=([a-f0-9-]+)/i);
    if (nameMatch) {
      downloadUrlToPromptId.set(nameMatch[1], pid);
    }
    const uuidMatch = downloadItem.url.match(/([a-f0-9-]{36})/);
    if (uuidMatch) {
      downloadUrlToPromptId.set(uuidMatch[1], pid);
    }
  } else if (/labs\.google|^blob:/.test(downloadItem.url || "")) {
    console.log(`[GenFlow] onCreated: NO expecting entry for download url=${downloadItem.url} (id=${downloadItem.id})`);
  }
  const norm = normalizeUrlForComparison(downloadItem.url);
  let prevented = false;
  if (preventedUrls.has(norm)) {
    prevented = true;
    preventedUrls.delete(norm);
  } else if (shouldPreventNextDownload) {
    prevented = true;
    shouldPreventNextDownload = false;
    if (preventTimeout) clearTimeout(preventTimeout);
  }
  if (prevented) {
    chrome.downloads.cancel(downloadItem.id, () => {
      console.log(`[GenFlow] Cancelled duplicate default download (ID: ${downloadItem.id}, URL: ${downloadItem.url})`);
    });
  }
});
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  let associatedPromptId = downloadUrlToPromptId.get(downloadItem.url);
  if (!associatedPromptId) {
    const nameMatch = downloadItem.url.match(/name=([a-f0-9-]+)/i);
    if (nameMatch) {
      associatedPromptId = downloadUrlToPromptId.get(nameMatch[1]);
    }
  }
  if (!associatedPromptId) {
    const uuidMatch = downloadItem.url.match(/([a-f0-9-]{36})/);
    if (uuidMatch) {
      associatedPromptId = downloadUrlToPromptId.get(uuidMatch[1]);
    }
  }
  if (associatedPromptId && downloadItem.filename) {
    const rawFilename = downloadItem.filename;
    const filename = rawFilename.replace(/\\/g, "/").split("/").pop();
    const cleanFilename = filename.replace(/\s\(\d+\)(\.[^.]+)?$/, "$1");
    downloadFilenameToPromptId.set(cleanFilename, associatedPromptId);
    downloadFilenameToPromptId.set(filename, associatedPromptId);
    console.log(`[GenFlow] Mapped determining filename to promptId ${associatedPromptId}: ${filename}`);
  }
  let desired = pendingDownloadById.get(downloadItem.id);
  if (desired) pendingDownloadById.delete(downloadItem.id);
  // Our 2K saves are data: URLs whose giant URL string is an unreliable Map key when several
  // downloads fire concurrently (move-forward pipeline) — that's the "Без названия" regression.
  // They're the only data: downloads we issue and arrive in creation order, so name them FIFO.
  if (!desired && (downloadItem.url || "").startsWith("data:") && pendingDataDownloadNames.length) {
    desired = pendingDataDownloadNames.shift();
  }
  if (!desired) desired = pendingDownloadFilenames.get(downloadItem.url);
  if (!desired) {
    const nameMatch = downloadItem.url.match(/name=([a-f0-9-]+)/i);
    if (nameMatch) {
      desired = pendingDownloadFilenames.get(nameMatch[1]);
    }
  }
  if (!desired) {
    const uuidMatch = downloadItem.url.match(/([a-f0-9-]{36})/);
    if (uuidMatch) {
      desired = pendingDownloadFilenames.get(uuidMatch[1]);
    }
  }
  // Single authority for the per-prompt index M: recompute the name here for ANY
  // prompt download (overriding REGISTER's M=1 name, handleDownload's name, and
  // Flow's descriptive blob name). Keyed by download id and deduped, so each
  // result of a prompt is counted exactly once -> Photo_1, Photo_2, ...
  if (associatedPromptId) {
    downloadReceivedForPrompt.add(associatedPromptId); completeIfDownloading(associatedPromptId);
    // Fall back to the registered prompt object for downloads whose prompt isn't
    // in state.prompts (Download All Media uses synthetic per-tile prompts).
    const p = state.prompts.find((x) => x.id === associatedPromptId) || registeredPromptById.get(associatedPromptId);
    if (p) {
      desired = generateFilename(p, assignPhotoIndex(p, downloadItem.id));
      console.log(`[GenFlow] Naming download for prompt #${p.number}: ${desired}`);
    }
  }
  // Universal safety net: Flow "Download" creates a blob: download named by a bare
  // UUID with no extension (so the file won't open — even on a manual click).
  // Derive the extension from the actual MIME type for any labs.google download
  // that still lacks one, so it saves as a playable .mp4 / .jpg.
  if (!desired) {
    const dlUrl = downloadItem.url || downloadItem.finalUrl || "";
    const base = (downloadItem.filename || "").replace(/\\/g, "/").split("/").pop() || "";
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(base);
    // Flow now serves generated media from flow-content.google (a redirect target of the
    // labs.google media URL), so match it too — otherwise these downloads skip the net.
    const _dlAny = dlUrl + " " + (downloadItem.finalUrl || "");
    if (base && !hasExt && /labs\.google|googleusercontent\.com|flow-content\.google/.test(_dlAny)) {
      const mime = (downloadItem.mime || "").toLowerCase();
      let ext = "";
      if (mime.startsWith("video/")) ext = mime.includes("webm") ? "webm" : mime.includes("quicktime") ? "mov" : "mp4";
      else if (mime.startsWith("image/")) ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
      if (ext) {
        desired = `${base}.${ext}`;
        console.log(`[GenFlow] Added .${ext} from MIME (${mime}) to extensionless Flow download: ${desired}`);
      }
    }
  }
  if (desired) {
    pendingDownloadFilenames.delete(downloadItem.url);
    const nameMatch = downloadItem.url.match(/name=([a-f0-9-]+)/i);
    if (nameMatch) {
      pendingDownloadFilenames.delete(nameMatch[1]);
    }
    const uuidMatch = downloadItem.url.match(/([a-f0-9-]{36})/);
    if (uuidMatch) {
      pendingDownloadFilenames.delete(uuidMatch[1]);
    }
    suggest({ filename: desired });
    return;
  }
  // MUST always answer: a registered onDeterminingFilename listener that never calls
  // suggest() makes Chrome DISCARD the filename we passed to downloads.download() and
  // fall back to its own default — that is the "Без названия (5).jfif" the user sees.
  // We land here whenever our in-memory name maps are gone: the MV3 service worker sleeps
  // during long rate-limit/reCAPTCHA pauses (429 backoff, retry 5/5) and wakes with empty
  // RAM, so the pending-name lookups miss. Keep Chrome's own name, but at least repair the
  // extension (.jfif -> .jpg) so files stay double-clickable.
  // The lookups above missed because a service-worker restart wiped RAM. Pull the names back
  // from storage.session and answer asynchronously: returning true keeps Chrome waiting for
  // suggest() instead of committing its own UUID name. Previously we gave up here and only
  // repaired the extension, which is why users saw "<uuid>.jfif" with no prompt number.
  (async () => {
    let recovered = null;
    try {
      await restoreDownloadNames();
      const _u = downloadItem.url || "";
      recovered = pendingDownloadFilenames.get(_u);
      if (!recovered && _u.startsWith("data:") && pendingDataDownloadNames.length) recovered = pendingDataDownloadNames.shift();
      if (!recovered) { const m = _u.match(/name=([a-f0-9-]+)/i); if (m) recovered = pendingDownloadFilenames.get(m[1]); }
      if (!recovered) { const m = _u.match(/([a-f0-9-]{36})/); if (m) recovered = pendingDownloadFilenames.get(m[1]); }
      if (!recovered) {
        let pid = downloadUrlToPromptId.get(_u);
        if (!pid) { const m = _u.match(/([a-f0-9-]{36})/); if (m) pid = downloadUrlToPromptId.get(m[1]); }
        const p = pid ? (state.prompts.find((x) => x.id === pid) || registeredPromptById.get(pid)) : null;
        if (p) recovered = generateFilename(p, assignPhotoIndex(p, downloadItem.id));
      }
    } catch (e) {}
    // Last resort: Chrome fell back to its own bare-UUID name (that is exactly what the user
    // sees as "<uuid>.jpeg"). We know what WE asked for, so put that back instead. Guarded on
    // both sides: only when the proposed name really is a bare id, and only with a fresh entry.
    if (!recovered) {
      try {
        const _b = (downloadItem.filename || "").replace(/\\/g, "/").split("/").pop() || "";
        const _isChromeFallback = !_b || /^[0-9a-f][0-9a-f-]{29,}(\.[a-z0-9]{2,5})?$/i.test(_b);
        if (_isChromeFallback) {
          const _now = Date.now();
          while (pendingRequestedNames.length) {
            const _c = pendingRequestedNames.shift();
            if (_c && _c.n && (!_c.t || _now - _c.t < 120000)) { recovered = _c.n; break; }
          }
          if (recovered) console.log(`[GenFlow] Chrome dropped our filename; restored requested name: ${recovered}`);
        }
      } catch (e) {}
    }
    if (recovered) {
      console.log(`[GenFlow] Naming download as: ${recovered}`);
      suggest({ filename: recovered });
      return;
    }
    // Nothing to recover: keep Chrome's own name, but repair the extension so the file opens.
    // Windows maps image/jpeg to .jfif on many installs; .jfi/.jpe appear the same way.
    try {
      const _base = (downloadItem.filename || "").replace(/\\/g, "/").split("/").pop() || "";
      if (/\.(jfif|jfi|jpe)$/i.test(_base)) {
        suggest({ filename: _base.replace(/\.(jfif|jfi|jpe)$/i, ".jpg") });
        return;
      }
    } catch (e) {}
    suggest();
  })();
  return true;
});
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === "complete") {
    chrome.downloads.search({ id: delta.id }, (results) => {
      if (results && results[0]) {
        const item = results[0];
        const rawFilename = item.filename || "";
        const filename = rawFilename.replace(/\\/g, "/").split("/").pop();
        console.log(`[GenFlow] Download completed: ${filename}, URL: ${item.url}`);
        
        let cleanFilename = filename;
        // Strip chrome duplicate indices " (1)", " (2)", etc. before extension
        cleanFilename = filename.replace(/\s\(\d+\)(\.[^.]+)?$/, "$1");

        let promptId = downloadFilenameToPromptId.get(cleanFilename);
        if (!promptId) {
          promptId = downloadUrlToPromptId.get(item.url);
        }
        if (!promptId) {
          const nameMatch = item.url.match(/name=([a-f0-9-]+)/i);
          if (nameMatch) {
            promptId = downloadUrlToPromptId.get(nameMatch[1]);
          }
        }
        if (!promptId) {
          const uuidMatch = item.url.match(/([a-f0-9-]{36})/);
          if (uuidMatch) {
            promptId = downloadUrlToPromptId.get(uuidMatch[1]);
          }
        }
        
        if (promptId) {
          console.log(`[GenFlow] Matching completed download to promptId: ${promptId}`);
          const prompt = state.prompts.find((p) => p.id === promptId);
          const _isPartialFail = prompt && prompt.partial && prompt.partial.failed > 0;
          if (prompt && !_isPartialFail) {
            updatePromptStatus(promptId, "completed", {
              resultUrl: item.url,
              downloaded: true,
              error: undefined,
              errorType: undefined
            });
          }
          if (prompt) sendLog("success", `Успешно скачан: ${filename}`);
          if (!_isPartialFail) {
            const beforeCount = state.failedPromptsList.length;
            state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== promptId);
            if (state.failedPromptsList.length !== beforeCount) {
              console.log(`[GenFlow] Removed prompt ${promptId} from failed list because download succeeded.`);
              broadcastUpdate();
              saveState();
            }
          }
        }
      }
    });
  }
});
function handleDownloadAll(force = false) {
  if (!force && state.batchDownloadUrls.length > 0) {
    sendLog("info", `Starting batch download of ${state.batchDownloadUrls.length} files...`);
    const sorted = [...state.batchDownloadUrls].sort((a, b) => (a.promptNumber ?? 0) - (b.promptNumber ?? 0));
    sorted.forEach((item, index) => {
      setTimeout(() => {
        handleDownload({ url: item.url, filename: item.filename });
      }, index * 100);
    });
    state.batchDownloadUrls = [];
    return;
  }
  const completedPrompts = state.prompts.filter((p) => p.status === "completed" && p.resultUrl && (force || !state.processedDownloadUrls.has(p.resultUrl))).sort((a, b) => a.number - b.number);
  if (completedPrompts.length === 0) {
    sendLog("warning", "No files to download");
    return;
  }
  sendLog("info", `Starting batch download of ${completedPrompts.length} files...`);
  completedPrompts.forEach((prompt, index) => {
    if (prompt.resultUrl) {
      state.processedDownloadUrls.add(prompt.resultUrl);
      // Batch save: entries of the same prompt number must not collide on _Video_1 either.
      const filename = generateFilename(prompt, assignPhotoIndex(prompt, prompt.resultUrl));
      setTimeout(() => {
        handleDownload({ url: prompt.resultUrl, filename });
      }, index * 100);
    }
  });
}
function sanitizeDownloadBasePart(s) {
  return s.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
}
// Filename scheme (underscores everywhere, no spaces):
//   <Prefix|Promt>_<N>_<Photo|Video>_<M>[_<words>][_(<tag>)]_<RES>.<ext>
function sanitizeNamePart(s) {
  return String(s == null ? "" : s)
    .replace(/[\\/:*?"<>|\r\n\t]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function filenameResolutionLabel(isVideo, prompt) {
  if (prompt && prompt._resLabel) return prompt._resLabel;  // actual measured resolution (native download)
  const s = state.settings || {};
  if (isVideo) {
    if (s.service === "grok") return s.grokQuality || "720p";
    const q = (s.quality || "1080p").toLowerCase();
    return q === "4k" ? "4K" : q;
  }
  const q = (s.imageQuality || "1k").toLowerCase();
  return q === "1k" ? "1K" : q === "2k" ? "2K" : q === "4k" ? "4K" : q.toUpperCase();
}
function stripLeadingPromptNumber(t) {
  return String(t || "").replace(/^\s*(?:промпт|промт|prompt|promt|p)\s*[#№_\-.)\]([]*\s*\d+\s*[:\-.)_\]]*\s*/i, "").trim();
}
function filenamePromptWords(prompt) {
  if (!(state.settings && state.settings.includePromptWordsInFilename)) return "";
  const raw = prompt.text || "";
  // Don't pollute the filename with the technical fallback used when a prompt
  // couldn't be extracted (e.g. "Video Tile fe_id_..." / contains fe_id_).
  if (/^(video|image)\s+tile\b/i.test(raw) || /\bfe_id_/i.test(raw)) return "";
  const t = stripLeadingPromptNumber(raw);
  if (!t) return "";
  const words = t.split(/\s+/).filter(Boolean).slice(0, 5).join("_");
  return sanitizeNamePart(words).slice(0, 30).replace(/_+$/g, "");
}
function filenameModeTag(prompt) {
  if (prompt && prompt._noModeTag) return "";  // Download All: gallery mode unknown
  const m = state.generationMode;
  if (m === "film") return "Flow"; // video "film" mode was renamed to "Flow" in the UI
  if (m === "multi") return "Multi";
  if (m === "reference") {
    const names = (prompt.referenceDisplayNames || []).map(sanitizeNamePart).filter(Boolean);
    return names.length > 0 ? names.join("_") : "reference";
  }
  return "";
}
// Per-prompt result index M (Photo/Video 1,2,3...). Keyed by prompt NUMBER (not
// id) so it covers both delivery shapes: multiple results of one prompt (banana
// images-per-prompt) AND video generations-per-prompt that expand into separate
// prompt objects sharing a number. Persisted in state (survives SW restart);
// `key` (result uuid or download id) dedups re-fires so they reuse the index.
function assignPhotoIndex(prompt, key) {
  if (!state.photoIndex) state.photoIndex = {};
  const num = prompt && prompt.number != null ? prompt.number : "_";
  let slot = state.photoIndex[num];
  if (!slot) {
    slot = { seen: {}, max: 0 };
    state.photoIndex[num] = slot;
  }
  if (key != null && slot.seen[key] != null) return slot.seen[key];
  const next = slot.max + 1;
  slot.max = next;
  if (key != null) {
    slot.seen[key] = next;
    saveState();
  }
  return next;
}
function generateFilename(prompt, subIndex) {
  const s = state.settings || {};
  const service = s.service;
  const isVideo = prompt.isVideo !== void 0 ? prompt.isVideo : (service === "veo3" || service === "grok");
  const kind = isVideo ? "Video" : "Photo";
  const ext = isVideo ? "mp4" : (service === "banana" || service === "whisk" ? "jpg" : "png");
  let number = prompt.number;
  if (s.usePromptNumberInFilename && prompt.text) {
    const extracted = extractPromptNumber(prompt.text);
    if (extracted !== null) number = extracted;
  }
  const name = s.filenamePrefix && String(s.filenamePrefix).trim() ? sanitizeNamePart(s.filenamePrefix) : "Prompt";
  const m = subIndex || 1;
  const parts = [`${name}_${number}`, `${kind}_${m}`];
  const words = filenamePromptWords(prompt);
  if (words) parts.push(words);
  const tag = filenameModeTag(prompt);
  if (tag) parts.push(`(${tag})`);
  parts.push(filenameResolutionLabel(isVideo, prompt));
  const _fld = s.downloadFolder ? String(s.downloadFolder).replace(/[\\/:*?"<>|]+/g, "").trim() : "";
  return (_fld ? _fld + "/" : "") + parts.join("_") + "." + ext;
}
function extractPromptNumber(text) {
  const patterns = [
    /(?:промпт|промт|prompt|promt)\s*[#№_\-.)\]([]*\s*(\d+)/i,
    /^#\s*(\d+)/,
    /\[(\d+)\]/,
    /\((\d+)\)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match)
      return parseInt(match[1], 10);
  }
  return null;
}
function updatePromptStatus(id, status, updates) {
  if (status === "completed") { state._consecFail = 0; state._flowStallStreak = 0; }  // any success breaks both streaks (errors + stalls)
  state.prompts = state.prompts.map((p) => {
    if (p.id === id) {
      const pUpdates = { ...updates };
      if ((status === "failed" || status === "completed") && pUpdates.info === undefined) {
         pUpdates.info = null;
      }
      return { ...p, status, ...pUpdates };
    }
    return p;
  });
  broadcastUpdate();
}
var serviceTabCache = /* @__PURE__ */ new Map();
var originalActiveTabId = null;
function isExpectedServiceUrl(service, url) {
  if (!url)
    return false;
  const normalized = url.toLowerCase();
  const matchers = {
    veo3: /^https?:\/\/labs\.google(?:\.com)?\/fx\//,
    whisk: /^https?:\/\/labs\.google(?:\.com)?\/fx\/tools\/whisk\//,
    banana: /^https?:\/\/labs\.google(?:\.com)?\/fx\//,
    grok: /^https?:\/\/grok\.com\//
  };
  const pattern = matchers[service];
  return pattern ? pattern.test(normalized) : false;
}
async function saveCurrentTab() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id)
      originalActiveTabId = activeTab.id;
  } catch {
  }
}
async function restoreFocusToOriginalTab() {
  if (originalActiveTabId) {
    try {
      await chrome.tabs.update(originalActiveTabId, { active: true });
    } catch {
    }
  }
}
async function activateTabForGrokInjection(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.id)
      return;
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId !== chrome.windows.WINDOW_ID_NONE) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } catch (e) {
    console.warn("[GenFlow] activateTabForGrokInjection failed:", e);
  }
}
async function getServiceTab(service) {
  await saveCurrentTab();
  const flowPatterns = ["*://labs.google/fx/*", "*://labs.google.com/fx/*"];
  const whiskPatterns = ["*://labs.google/fx/tools/whisk/*", "*://labs.google.com/fx/tools/whisk/*"];
  const urlPatterns = {
    veo3: [...flowPatterns],
    whisk: whiskPatterns,
    grok: ["*://grok.com/*"],
    banana: flowPatterns
  };
  const urls = {
    veo3: "https://labs.google/fx/ru/tools/flow",
    whisk: "https://labs.google/fx/tools/whisk/project",
    grok: "https://grok.com/imagine",
    banana: "https://labs.google/fx/ru/tools/flow"
  };
  const patterns = urlPatterns[service];
  if (!patterns)
    return null;
  if (service === "grok") {
    return await createNewServiceTab(service, urls[service]);
  }
  const isFlowToolUrl = (u) => !!u && (/\/tools\/(flow|video|image)/i.test(u) || u.toLowerCase().includes("/project/"));
  const cachedTabId = serviceTabCache.get(service);
  if (cachedTabId) {
    try {
      const tab = await chrome.tabs.get(cachedTabId);
      // Only reuse a cached tab that is a real Flow tool/project page, not the
      // bare labs.google home (which loads the content script but has no project).
      if (tab && tab.id && isExpectedServiceUrl(service, tab.url) && isFlowToolUrl(tab.url)) {
        const isProjectUrl = tab.url && tab.url.toLowerCase().includes('/project/');
        if (!isProjectUrl) {
          // If we have a project page tab open, prioritize switching to it
          let hasProjectTab = false;
          for (const pattern of patterns) {
            const projectTabs = await chrome.tabs.query({ url: pattern });
            if (projectTabs.some(t => t.url && t.url.toLowerCase().includes('/project/'))) {
              hasProjectTab = true;
              break;
            }
          }
          if (hasProjectTab) {
            throw new Error("Found open project tab, invalidating cached landing page tab");
          }
        }
        console.log(`[GenFlow] Reusing cached tab ${cachedTabId} for ${service}`);
        await restoreFocusToOriginalTab();
        return tab;
      }
      serviceTabCache.delete(service);
    } catch {
      serviceTabCache.delete(service);
    }
  }
  let allMatchingTabs = [];
  for (const pattern of patterns) {
    allMatchingTabs = allMatchingTabs.concat(await chrome.tabs.query({ url: pattern }));
  }
  if (allMatchingTabs.length > 0) {
    // Prefer a project page, then the Flow tool page, and only fall back to any
    // labs.google tab — so we never inject into the bare home when the real
    // Flow tab is open.
    const projectTab = allMatchingTabs.find(t => t.url && t.url.toLowerCase().includes('/project/'));
    const flowToolTab = allMatchingTabs.find(t => isFlowToolUrl(t.url));
    const tab = projectTab || flowToolTab || allMatchingTabs[0];
    if (tab.id)
      serviceTabCache.set(service, tab.id);
    await restoreFocusToOriginalTab();
    return tab;
  }
  const url = urls[service];
  if (!url)
    return null;
  return await createNewServiceTab(service, url);
}
async function createNewServiceTab(service, url) {
  sendLog("info", `Opening ${service} tab...`);
  const tab = await chrome.tabs.create({ url, active: service === "grok" });
  if (tab.id && service !== "grok") {
    serviceTabCache.set(service, tab.id);
  }
  if (service === "grok") {
    if (tab.id)
      await activateTabForGrokInjection(tab.id);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    if (tab.id)
      await activateTabForGrokInjection(tab.id);
  } else {
    await restoreFocusToOriginalTab();
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    await restoreFocusToOriginalTab();
  }
  return tab;
}
// Reference photos used to be copied INTO EVERY prompt, so a queue of N prompts carried N
// identical multi-MB images in ONE runtime message. Past ~28 prompts (or ~20 with heavier
// photos) that blew Chrome's hard 64MiB message limit: sendMessage threw, the background
// never received anything, and the user just saw "pressed Start, nothing happened".
// The popup now sends each distinct photo ONCE in payload.refPool and puts a short key in
// the prompts; we restore the real data URLs here. No pool (older/other senders) = no-op,
// so this is backward compatible.
// Strip every heavy data: URL from a prompt before sending it to the panel. The panel only
// renders status/text — it keeps its own copies of the photos — so shipping multi-MB base64
// back was pure waste that blew the 64MiB message limit on big queues (87 prompts x 1.7MB).
// Used by BOTH broadcastUpdate and the GET_STATE replies (all three used to differ).
function gfSlimPromptForUI(p) {
  if (!p) return p;
  const s = (u) => (typeof u === "string" && u.startsWith("data:")) ? "" : u;
  return {
    ...p,
    previewUrl: s(p.previewUrl),
    resultUrl: s(p.resultUrl),
    imageUrl: s(p.imageUrl),
    endImageUrl: s(p.endImageUrl),
    referenceImageUrls: Array.isArray(p.referenceImageUrls) ? p.referenceImageUrls.map(s) : p.referenceImageUrls,
    objectImageUrls: Array.isArray(p.objectImageUrls) ? p.objectImageUrls.map(s) : p.objectImageUrls,
  };
}
function gfSlimFailedForUI(f) {
  if (!f) return f;
  const s = (u) => (typeof u === "string" && u.startsWith("data:")) ? "" : u;
  return { ...f, previewUrl: s(f.previewUrl), resultUrl: s(f.resultUrl), prompt: gfSlimPromptForUI(f.prompt) };
}
function gfUnpackRefPool(payload) {
  try {
    const pool = payload && payload.refPool;
    if (!pool || !payload.prompts || !Array.isArray(payload.prompts)) return payload;
    const un = (u) => (typeof u === "string" && Object.prototype.hasOwnProperty.call(pool, u)) ? pool[u] : u;
    payload.prompts = payload.prompts.map((p) => {
      if (!p) return p;
      const q = { ...p };
      for (const f of ["referenceImageUrls", "objectImageUrls"]) {
        if (Array.isArray(q[f])) q[f] = q[f].map(un);
      }
      for (const f of ["imageUrl", "endImageUrl", "previewUrl"]) {
        if (typeof q[f] === "string") q[f] = un(q[f]);
      }
      return q;
    });
    console.log(`[GenFlow] refPool: restored ${Object.keys(pool).length} unique reference photo(s) into ${payload.prompts.length} prompt(s)`);
    delete payload.refPool;
  } catch (e) {
    console.warn("[GenFlow] refPool unpack failed:", e);
  }
  return payload;
}
function sendLog(type, message) {
  chrome.runtime.sendMessage({
    type: "LOG_MESSAGE",
    payload: { type, message }
  }).catch(() => {
  });
}
function broadcastUpdate() {
  // Strip heavy data: URLs (multi-MB base64) before broadcasting — otherwise the message
  // can exceed runtime.sendMessage's 64MiB limit, which throws and stalls the whole queue.
  // Single source of truth for UI-bound slimming (see gfSlimPromptForUI): reference photos
  // must be stripped too, otherwise a big queue blows the 64MiB limit on the way BACK to the
  // panel and every tick dies with "Message exceeded…", stalling the queue.
  const _slimP = gfSlimPromptForUI;
  const _slimF = gfSlimFailedForUI;
  chrome.runtime.sendMessage({
    type: "STATE_UPDATE",
    payload: {
      isRunning: state.isRunning,
      isPaused: state.isPaused,
      activeSlots: state.activeSlots.size,
      prompts: state.prompts.map(_slimP),
      failedPromptsList: state.failedPromptsList.map(_slimF),
      isDownloadingAll: state.isDownloadingAll,
      cooldownUntil: state.cooldownUntil || 0,
      cooldownReason: state.cooldownReason || "",
      stopReason: state.stopReason || ""
    }
  }).catch(() => {
  });
  saveState();
}
chrome.alarms.create("checkGenerations", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  // DOWNLOAD-PIPELINE DURABILITY (survives MV3 SW restarts): a prompt left "downloading"
  // (slot freed after the 2K click, file pending via the hook) whose in-memory setTimeout
  // watchdog was lost to an SW restart would otherwise stick forever. Sweep on the
  // persistent alarm regardless of isRunning: file landed -> complete; >60s with no file
  // -> Failed(download) onlyUpscale. The alarm + session-restored state make this durable.
  if (alarm.name === "checkGenerations") {
    const _now = Date.now();
    for (const p of state.prompts.slice()) {
      if (p.status !== "downloading") continue;
      if (downloadReceivedForPrompt.has(p.id)) { completeIfDownloading(p.id); continue; }
      const _since = p.downloadStartedAt || 0;
      if (_since && _now - _since > 6e4) {
        const _em = "2K not downloaded", _et = "UPSCALE_FAILED";
        updatePromptStatus(p.id, "failed", { error: _em, errorType: _et, onlyUpscale: true, resultUrl: p.resultUrl });
        const _fp = state.prompts.find((x) => x.id === p.id);
        if (_fp) {
          state.failedPromptsList = state.failedPromptsList.filter((f) => f.prompt && f.prompt.id !== p.id);
          state.failedPromptsList.push({ prompt: { ..._fp, status: "failed", error: _em, errorType: _et, onlyUpscale: true, resultUrl: _fp.resultUrl }, error: _em, errorType: _et, resultUrl: _fp.resultUrl });
        }
        console.warn(`[GenFlow] sweep: prompt #${p.number} stuck downloading (no file) -> Failed(download)`);
        broadcastUpdate();
        saveState();
      }
    }
  }
  if (alarm.name === "checkGenerations" && state.isRunning && !state.isPaused) {
    const now = Date.now();
    const STALL_LOG_MS = 4 * 60 * 1e3;
    for (const [slotId, slot] of state.activeSlots.entries()) {
      const elapsed = now - slotId;
      if (elapsed >= STALL_LOG_MS && elapsed < 5 * 60 * 1e3) {
        const key = `${slotId}`;
        if (!stallWarningLoggedForSlot.has(key)) {
          stallWarningLoggedForSlot.add(key);
          const prompt = state.prompts.find((p) => p.id === slot.promptId);
          sendLog(
            "warning",
            `Prompt #${prompt?.number ?? "?"} still processing (~${Math.round(elapsed / 6e4)} min). Veo is taking longer than usual — it will finish or time out on its own.`
          );
        }
      }
    }
    for (const [slotId, slot] of state.activeSlots.entries()) {
      if (now - slotId > 5 * 60 * 1e3) {
        sendLog("warning", `Slot ${slotId} appears stalled, releasing`);
        state.activeSlots.delete(slotId);
        const prompt = state.prompts.find((p) => p.id === slot.promptId);
        if (prompt && prompt.status === "processing") {
          handleGenerationFailed({
            promptId: slot.promptId,
            error: "Generation timed out"
          });
        }
      }
    }
    if (state.generationMode !== "film_streams" && state.activeSlots.size === 0 && state.prompts.some((p) => p.status === "pending")) {
      console.warn("[GenFlow] checkGenerations: queue stall detected, resuming...");
      processNextPrompt().catch((e) => console.error("[GenFlow] processNextPrompt error:", e));
    }
  }
});
async function ensureContentScriptInjected(tabId, service) {
  const scriptMap = {
    veo3: "content/veo.js",
    whisk: "content/whisk.js",
    grok: "content/grok.js",
    banana: "content/banana.js"
  };
  const scriptFile = scriptMap[service];
  if (!scriptFile)
    return;
  if (service === "grok") {
    const maxWaitMs = 15e3;
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: "PING" });
        console.log(`[GenFlow] Grok content script ready`);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    console.warn(`[GenFlow] Grok PING timeout \u2014 trying executeScript fallback`);
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [scriptFile]
      });
    } catch (e) {
      console.warn("[GenFlow] Grok executeScript fallback failed:", e);
    }
    return;
  }
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: "PING", service });
    if (resp && resp.pong && resp.service === service) {
      console.log(`[GenFlow] Content script already loaded for ${service}`);
      return;
    }
  } catch (e) {
  }
  console.log(`[GenFlow] Injecting content script for ${service}`);
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [scriptFile]
  });
}
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
});
console.log("GenFlow background service worker initialized");
