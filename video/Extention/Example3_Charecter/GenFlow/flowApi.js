// flowApi.js — Direct Google Flow API layer for GenFlow (code-input / code-output).
//
// WHY everything runs INSIDE the Flow page (MAIN world) via chrome.scripting.executeScript:
//   1) window.grecaptcha.enterprise lives only on the page;
//   2) the session access_token comes from the page's own /fx/api/auth/session (cookies);
//   3) the request must carry the labs.google Origin/Referer or Google rejects it.
//
// AUTH MODEL: the API is authenticated by the Google account already logged into Flow in
// the browser tab (the session token from /fx/api/auth/session). It does NOT use chrome.identity.
// GenFlow's own licensing stays on the TG account (grovex) — independent layer.
//
// Request/response shapes verified against a live build (competitor 2.2.8) + CDP. Models as of
// Veo 3.1 / Nano Banana ("NARWHAL"). If Google changes the API these constants are the seam to fix.
//
// Usage (from background.js, which is type:module):
//   import * as flowApi from "./flowApi.js";
//   const tabId = await flowApi.getFlowTabId();
//   const imgs  = await flowApi.generateImages(tabId, prompt, { imageCount: 4 });
//   const vid   = await flowApi.generateVideoAndWait(tabId, prompt, { videoQuality:"fast" });

const RECAPTCHA_SITE_KEY = "6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV";
const SANDBOX = "https://aisandbox-pa.googleapis.com/v1";
const MEDIA_REDIRECT = "https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=";
const SESSION_TTL_MS = 4 * 60 * 1000;          // session token cache
const VIDEO_POLL_MAX = 120;                    // 120 * 5s = 10 min
const VIDEO_POLL_INTERVAL = 5000;

// ----------------------------------------------------------------------------
// low-level helpers
// ----------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newSeed = () => Math.floor(Math.random() * 2147483647);
const newBatchId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
const newSessionId = () => ";" + Date.now();

let _tok = null, _tokAt = 0;

// Find an open Flow project tab. All page-context calls target it.
export async function getFlowTabId() {
  const tabs = await chrome.tabs.query({
    url: ["https://labs.google/fx/*/tools/flow/*", "https://labs.google/fx/tools/flow/*"],
  });
  const isProj = (t) => /\/project\/[a-f0-9-]+/.test(t.url || "");
  // Prefer the ACTIVE Flow project tab (the account the user is looking at), then any project tab.
  const active = tabs.find((t) => t.active && isProj(t));
  const proj = tabs.find(isProj);
  return (active || proj || tabs[0])?.id ?? null;
}

// Run a function in the Flow page's MAIN world and return its result.
async function inPage(tabId, func, args = []) {
  const out = await chrome.scripting.executeScript({ target: { tabId }, world: "MAIN", func, args });
  return out?.[0]?.result;
}

// 1) Flow session access_token (from the page's own session; cached).
export async function getSessionToken(tabId, force = false) {
  if (!force && _tok && Date.now() - _tokAt < SESSION_TTL_MS) return _tok;
  _tok = await inPage(tabId, async () => {
    try {
      const r = await fetch("/fx/api/auth/session", { credentials: "include" });
      return (await r.json()).access_token || null;
    } catch (e) { return null; }
  });
  _tokAt = Date.now();
  return _tok;
}

// 2) reCAPTCHA Enterprise token (minted by the page's own grecaptcha; single-use, ~2 min).
export async function getRecaptchaToken(tabId, action) {
  return inPage(tabId, async (siteKey, act) => {
    try {
      return (typeof grecaptcha !== "undefined" && grecaptcha.enterprise)
        ? await grecaptcha.enterprise.execute(siteKey, { action: act })
        : null;
    } catch (e) { return null; }
  }, [RECAPTCHA_SITE_KEY, action]);
}

// 3) Project id from the page URL.
export async function getProjectId(tabId) {
  return inPage(tabId, () => {
    const m = location.href.match(/project\/([a-f0-9-]+)/);
    return m ? m[1] : null;
  });
}

// List all generated media in the open Flow project (read from the page DOM). Used by
// "Download all" in code mode. Images carry the mediaId in the fife URL; videos in data-tile-id.
export async function listProjectMedia(tabId) {
  return inPage(tabId, async () => {
    const out = []; const seen = new Set();
    const uuid = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // Collect media tiles in VISUAL order (top->bottom). Video mediaId = UUID in <video> src;
    // image mediaId = UUID in <img> src. data-tile-id is a frontend id (fe_id_<uuid>), NOT the
    // media id. The 'img[alt="Generated image"]' branch is a fallback for out-of-tile images.
    // Tell a GENERATED result from an uploaded SOURCE/reference: generated tiles carry the
    // prompt text as their React displayName; uploaded frames carry the upload filename
    // (start_/end_<ts> or *.ext). alt is identical+localized ("Сгенерированное изображение"),
    // so it can't distinguish them — same heuristic the synthetic Download All uses (veo.js).
    const isName = (v) => v && typeof v === "string" && v.trim().length > 1;
    const fiberName = (tile) => {
      try {
        const fk = Object.keys(tile).find((k) => k.indexOf("__reactFiber$") === 0 || k.indexOf("__reactInternalInstance$") === 0);
        if (!fk) return null;
        let cur = tile[fk];
        for (let lvl = 0; lvl < 25 && cur; lvl++) {
          const p = cur.memoizedProps;
          if (p && typeof p === "object") {
            if (isName(p.displayName)) return p.displayName;
            if (isName(p.prompt)) return p.prompt;
            if (isName(p.promptText)) return p.promptText;
          }
          let st = cur.memoizedState, i = 0;
          while (st && i < 25) {
            try { const ms = st.memoizedState; if (ms && typeof ms === "object") { if (isName(ms.displayName)) return ms.displayName; if (isName(ms.prompt)) return ms.prompt; if (isName(ms.promptText)) return ms.promptText; } } catch (e) {}
            st = st.next; i++;
          }
          cur = cur.return;
        }
      } catch (e) {}
      return null;
    };
    const isSource = (nm) => !!nm && (/^(start|end)_\d{6,}/i.test(nm.trim()) || /\.(png|jpe?g|webp|gif|mp4)\b/i.test(nm.trim()));
    const collect = () => {
      document.querySelectorAll("div[data-tile-id]").forEach((card) => {
        const v = card.querySelector("video");
        const img = v ? null : card.querySelector("img");
        const el = v || img;
        if (!el) return;
        const m = (el.src || "").match(uuid); const id = m && m[1];
        if (!id || seen.has(id)) return;
        if (isSource(fiberName(card))) { seen.add(id); return; }  // uploaded source/reference -> skip
        seen.add(id);
        out.push({ mediaId: id, url: el.src || "", type: v ? "video" : "image" });
      });
      document.querySelectorAll('img[alt="Generated image"]').forEach((img) => {
        const m = (img.src || "").match(uuid); const id = m && m[1];
        if (id && !seen.has(id)) { seen.add(id); out.push({ mediaId: id, url: img.src || "", type: "image" }); }
      });
    };
    // The gallery is virtualized: scroll top->bottom so every tile materializes at least once.
    // Mirrors the synthetic Download All, which also scrolls to reach the real bottom.
    const sc = (Array.from(document.querySelectorAll("*")).find((el) => {
      const st = getComputedStyle(el); const ov = st.overflowY;
      return (ov === "auto" || ov === "scroll" || ov === "overlay") && el.scrollHeight > el.clientHeight + 40;
    })) || document.scrollingElement || document.documentElement;
    try { sc.scrollTo({ top: 0 }); } catch (e) { sc.scrollTop = 0; }
    await sleep(180);
    let prev = -1, stable = 0;
    for (let k = 0; k < 80; k++) {
      collect();
      const before = sc.scrollTop;
      try { sc.scrollBy(0, Math.max(200, sc.clientHeight * 0.8)); } catch (e) { sc.scrollTop = before + 400; }
      await sleep(140);
      const pos = sc.scrollTop;
      if (Math.abs(pos - prev) < 4 || pos === before) { stable++; if (stable >= 3) break; } else { stable = 0; }
      prev = pos;
    }
    collect();
    return out;  // visual top->bottom (newest first); caller reverses for oldest-first
  });
}

// Fetch any media URL INSIDE the Flow page (carries the session/cookies) and return a
// data: URL. Needed for media.getMediaUrlRedirect (requires the session — chrome.downloads
// can't fetch it -> SERVER_UNAUTHORIZED .htm) and for base image downloads.
export async function fetchAsDataUrl(tabId, url) {
  if (!url) return null;
  return inPage(tabId, async (u) => {
    try {
      const r = await fetch(u, { credentials: "include" });
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(blob); });
    } catch (e) { return null; }
  }, [url]);
}

// Stamp the reCAPTCHA token into every clientContext.recaptchaContext the body carries.
function injectRecaptcha(body, token) {
  const stamp = (o) => { if (o && o.clientContext && o.clientContext.recaptchaContext) o.clientContext.recaptchaContext.token = token; };
  stamp(body);
  if (Array.isArray(body.requests)) body.requests.forEach(stamp);
}

// ----------------------------------------------------------------------------
// core authenticated call (the "et" helper) — with recovery
// ----------------------------------------------------------------------------
//
// Sends `body` to `url` from inside the Flow page with Bearer + a fresh reCAPTCHA token.
// Content-Type is text/plain;charset=UTF-8 ON PURPOSE: it makes the request a "simple"
// CORS request (no preflight) — Google's API still parses the JSON body. Do not change it.
//
// Recovery: 429 -> exponential backoff; 401/403 -> refresh session token; reCAPTCHA reject
// -> re-mint. Caller may pass onRecaptchaFail to trigger a project reset between attempts.
async function apiCall(tabId, url, body, action, opts = {}) {
  const maxRetries = opts.maxRetries ?? 5;
  for (let attempt = 0; ; attempt++) {
    const token = await getSessionToken(tabId, attempt > 0 && opts.forceTokenRefresh);
    if (!token) throw new Error("No Flow session — open or refresh a Flow project tab.");

    const rc = await getRecaptchaToken(tabId, action);
    if (!rc) {
      if (attempt < 2) { await sleep(1500); continue; }
      throw new Error("reCAPTCHA blocked — refresh the Flow page or disable VPN.");
    }
    injectRecaptcha(body, rc);

    const res = await inPage(tabId, async (u, b, t) => {
      try {
        const r = await fetch(u, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8", "Authorization": "Bearer " + t },
          body: b,
        });
        const txt = await r.text();
        if (!r.ok) return { ok: false, status: r.status, err: txt.slice(0, 400) };
        try { return { ok: true, data: JSON.parse(txt) }; } catch (e) { return { ok: true, data: txt }; }
      } catch (e) { return { ok: false, status: 0, err: String((e && e.message) || e) }; }
    }, [url, JSON.stringify(body), token]);

    if (res.ok) return res.data;

    // ---- recovery ----
    // 429 OR reCAPTCHA "unusual activity" 403 -> exponential backoff. Minting a fresh
    // reCAPTCHA token immediately stays low-scored; the score recovers with time / less frequency.
    const recaptchaBlocked = res.status === 403 && /recaptcha|unusual/i.test(res.err || "");
    if ((res.status === 429 || recaptchaBlocked) && attempt < maxRetries) {
      if (recaptchaBlocked && typeof opts.onRecaptchaFail === "function") { try { await opts.onRecaptchaFail(); } catch (e) {} }
      if (typeof opts.onRetry === "function") { try { opts.onRetry({ attempt: attempt + 1, max: maxRetries, status: res.status, recaptcha: recaptchaBlocked }); } catch (e) {} }
      const delay = Math.min(30000, 1500 * Math.pow(2, attempt) + Math.random() * 1000);
      await sleep(delay);
      continue;
    }
    if (res.status === 403 && /MODEL_ACCESS_DENIED/i.test(res.err || "")) {
      // Hard model-access denial (account lacks this model) — don't retry; caller may fall back.
      throw new Error("Flow API 403: " + (res.err || "MODEL_ACCESS_DENIED"));
    }
    if ((res.status === 401 || res.status === 403) && attempt < 2) {
      await getSessionToken(tabId, true);
      continue;
    }
    throw new Error("Flow API " + res.status + ": " + (res.err || "unknown"));
  }
}

// ----------------------------------------------------------------------------
// IMAGE generation (Nano Banana). Synchronous-ish: response carries fifeUrl.
// One POST per seed; fired in parallel via Promise.allSettled.
// ----------------------------------------------------------------------------
export async function generateImages(tabId, prompt, opts = {}) {
  const projectId = await getProjectId(tabId);
  if (!projectId) throw new Error("No Flow project — open a project tab.");
  const count = Math.max(1, opts.imageCount || 1);
  const url = SANDBOX + "/projects/" + projectId + "/flowMedia:batchGenerateImages";
  const sessionId = newSessionId();
  const aspect = opts.aspectRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE";
  // Extension model value -> Flow API key. Captured live (2026-07 network):
  //   NARWHAL = Nano Banana Pro, GEM_PIX_2 = Nano Banana 2, HARBOR_SEAL = Nano Banana 2 Lite.
  // Background never passed a model before, so code-mode always sent NARWHAL (Pro), ignoring
  // the user's choice. Map the extension value; accept a raw Flow key too; default to 2.
  const IMG_MODEL_KEYS = { "nano-banana-pro": "NARWHAL", "nano-banana": "GEM_PIX_2", "nano-banana-2-lite": "HARBOR_SEAL" };
  const model = IMG_MODEL_KEYS[opts.imageModel] || opts.imageModel || "GEM_PIX_2";
  // Reference image generation: each reference is an already-uploaded Flow media id.
  const refInputs = (Array.isArray(opts.referenceMediaIds) ? opts.referenceMediaIds : [])
    .filter(Boolean).map((id) => ({ imageInputType: "IMAGE_INPUT_TYPE_REFERENCE", name: id }));

  // One generation = one independent API call. Extracted into a factory so a slot that fails
  // (throttling, reCAPTCHA) can simply be re-run instead of silently shrinking the result.
  const spawnOne = () => {
    const seed = newSeed();
    const batchId = newBatchId();
    const ctx = () => ({ recaptchaContext: { applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB", token: "" }, projectId, tool: "PINHOLE", sessionId });
    const payload = {
      clientContext: ctx(),
      mediaGenerationContext: { batchId },
      ...(refInputs.length ? { useNewMedia: true } : {}),
      requests: [{
        clientContext: ctx(),
        imageAspectRatio: aspect,
        imageInputs: refInputs,
        imageModelName: model,
        seed,
        // Native characters: opts.structuredParts interleaves {text} with {reference:{entity:{handle,entityId}}};
        // referenceEntities lists the entity ids. Falls back to a plain text prompt when no characters.
        structuredPrompt: { parts: (Array.isArray(opts.structuredParts) && opts.structuredParts.length) ? opts.structuredParts : [{ text: prompt }] },
        ...(Array.isArray(opts.referenceEntities) && opts.referenceEntities.length ? { referenceEntities: opts.referenceEntities } : {}),
      }],
    };
    return apiCall(tabId, url, payload, "IMAGE_GENERATION", opts)
      .then((data) => extractImages(data, prompt, seed))
      .catch((e) => ({ error: e.message }));
  };

  const images = [];
  const errors = [];
  const collect = (settled) => {
    for (const s of settled) {
      if (s.status === "fulfilled" && Array.isArray(s.value)) images.push(...s.value);
      else if (s.status === "fulfilled" && s.value && s.value.error) errors.push(String(s.value.error));
      else if (s.status === "rejected") errors.push(String((s.reason && s.reason.message) || s.reason));
    }
  };

  const tasks = [];
  for (let i = 0; i < count; i++) tasks.push(spawnOne());
  collect(await Promise.allSettled(tasks));

  // Partial failure: the generations are independent, so re-run only the missing ones. Until
  // now a half-failed batch returned quietly and the user got fewer images than requested with
  // nothing in the log. Two extra attempts with a growing pause — the usual cause is
  // throttling, which clears within seconds.
  for (let attempt = 1; attempt <= 2 && images.length < count && errors.length; attempt++) {
    const missing = count - images.length;
    try {
      if (typeof opts.onPartial === "function") {
        opts.onPartial({ requested: count, received: images.length, errors: errors.slice(), retrying: missing, attempt });
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 2500 * attempt));
    const retry = [];
    for (let i = 0; i < missing; i++) retry.push(spawnOne());
    collect(await Promise.allSettled(retry));
  }
  // Surface the REAL failure (HTTP 429 / 403 / reCAPTCHA "unusual activity" /
  // model-access) instead of a vague "no images returned" when every task failed.
  if (!images.length && errors.length) throw new Error(errors[0]);
  // Still short after the retries — say so plainly instead of returning quietly.
  if (images.length < count && errors.length) {
    try {
      if (typeof opts.onPartial === "function") {
        opts.onPartial({ requested: count, received: images.length, errors, final: true });
      }
    } catch (e) {}
  }
  return images; // [{ mediaId, fifeUrl, prompt, seed, type:"image" }]
}

function extractImages(data, prompt, seed) {
  // Actual response shape (verified live): { media: [ { name, workflowId,
  // image: { generatedImage: { fifeUrl, ... } } } ] }. There is no top-level
  // `workflows` array — read straight from media[].
  const out = [];
  const media = Array.isArray(data && data.media) ? data.media : [];
  for (const m of media) {
    const gi = m && m.image && m.image.generatedImage;
    const fifeUrl = gi && gi.fifeUrl;
    const mediaId = (m && m.name) || (gi && gi.mediaGenerationId) || null;
    if (fifeUrl) out.push({ mediaId, fifeUrl, prompt, seed, type: "image" });
  }
  return out;
}

// Upscale a generated image to 2K/4K. Returns a data: URL (the API returns the
// upscaled JPEG as base64 in `encodedImage`). 4K requires a paid paygate tier.
export async function upscaleImage(tabId, mediaId, quality, opts = {}) {
  if (!mediaId) return null;
  const projectId = opts.projectId || (await getProjectId(tabId));
  if (!projectId) return null;
  const is4k = String(quality).toLowerCase() === "4k";
  const body = {
    mediaId,
    targetResolution: is4k ? "UPSAMPLE_IMAGE_RESOLUTION_4K" : "UPSAMPLE_IMAGE_RESOLUTION_2K",
    clientContext: {
      projectId,
      tool: "PINHOLE",
      recaptchaContext: { applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB", token: "" },
      sessionId: newSessionId(),
      userPaygateTier: is4k ? "PAYGATE_TIER_TWO" : "PAYGATE_TIER_NOT_PAID",
    },
  };
  const data = await apiCall(tabId, SANDBOX + "/flow/upsampleImage", body, "IMAGE_GENERATION", opts);
  const b64 = data && data.encodedImage;
  return b64 ? ("data:image/jpeg;base64," + b64) : null;
}

// ----------------------------------------------------------------------------
// VIDEO generation (Veo 3.1). Async: fire -> poll status -> media redirect URL.
// ----------------------------------------------------------------------------

const VIDEO_METHOD = {
  text: "batchAsyncGenerateVideoText",
  start_frame: "batchAsyncGenerateVideoStartImage",
  start_end_frame: "batchAsyncGenerateVideoStartAndEndImage",
  reference: "batchAsyncGenerateVideoReferenceImages", // verified live (UI sends this for r2v)
};

// videoModelKey builder (mirrors competitor's Tt). duration!==8 appends _<N>s.
export function buildVideoModelKey(mode = "text", quality = "lite", duration = 8, ratio = "landscape") {
  duration = parseInt(duration, 10) || 8; // accept "8s" / "8" / 8
  const hasDur = duration !== 8;
  const dur = hasDur ? "_" + duration + "s" : "";
  const rsfx = ratio === "portrait" ? "_portrait" : "_landscape";
  // Reference-to-video (objects/characters) — handled first; r2v keys differ from t2v.
  // Captured live (tier 2): veo_3_1_r2v_fast_landscape_ultra. lite kept as the access-denied fallback.
  if (mode === "reference") {
    if (quality === "omni_flash") return "abra_r2v_" + duration + "s";
    if (quality === "lite") return "veo_3_1_r2v_lite";
    const q = quality === "quality" ? "quality" : "fast";
    return "veo_3_1_r2v_" + q + rsfx + "_ultra";
  }
  if (quality === "omni_flash") {
    const d = "_" + duration + "s";
    return ({ text: "abra_t2v" + d, start_frame: "abra_i2v" + d })[mode] || ("abra_t2v" + d);
  }
  if (quality === "fast") return "veo_3_1_t2v_fast"; // caller may append _portrait for portrait
  if (quality === "quality") return "veo_3_1_t2v_quality" + (hasDur ? dur : "");
  // lite (default)
  switch (mode) {
    case "start_frame": return hasDur ? "veo_3_1_i2v_s_lite" + dur : "veo_3_1_i2v_lite";
    case "start_end_frame": return hasDur ? "veo_3_1_i2v_s_lite" + dur + "_fl" : "veo_3_1_interpolation_lite";
    default: return "veo_3_1_t2v_lite" + dur;
  }
}

const CROP_FULL = { top: 0, left: 0, bottom: 1, right: 1 };

// Upload a user image (a data: URL) into the open Flow project and return its mediaId
// (response.media.name). REQUIRED for image-to-video: the video API's StartImage/EndImage/
// Reference methods take a mediaId, not raw bytes — a local file must become Flow media first.
// Mirrors Flow's own /v1/flow/uploadImage call (no reCAPTCHA on this endpoint).
export async function uploadImage(tabId, dataUrl, fileName, opts = {}) {
  const m = /^data:([^;,]+)(?:;base64)?,(.*)$/s.exec(dataUrl || "");
  if (!m) throw new Error("uploadImage: argument is not a data URL");
  const mimeType = m[1] || "image/png";
  const imageBytes = m[2]; // base64 payload, WITHOUT the "data:...;base64," prefix
  const ext = (mimeType.split("/")[1] || "png").replace("jpeg", "jpg");
  const maxRetries = opts.maxRetries ?? 3;
  for (let attempt = 0; ; attempt++) {
    const token = await getSessionToken(tabId, attempt > 0);
    if (!token) throw new Error("No Flow session — open or refresh a Flow project tab.");
    const projectId = await getProjectId(tabId);
    if (!projectId) throw new Error("No Flow projectId — open a Flow project tab.");
    const body = {
      clientContext: { projectId, tool: "PINHOLE" },
      fileName: fileName || ("upload_" + Date.now() + "." + ext),
      imageBytes,
      isHidden: false,
      isUserUploaded: true,
      mimeType,
    };
    const res = await inPage(tabId, async (u, b, t) => {
      try {
        const r = await fetch(u, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8", "Authorization": "Bearer " + t },
          body: b,
        });
        const txt = await r.text();
        if (!r.ok) return { ok: false, status: r.status, err: txt.slice(0, 400) };
        try { return { ok: true, data: JSON.parse(txt) }; } catch (e) { return { ok: true, data: txt }; }
      } catch (e) { return { ok: false, status: 0, err: String((e && e.message) || e) }; }
    }, [SANDBOX + "/flow/uploadImage", JSON.stringify(body), token]);
    if (res && res.ok) {
      const mediaId = res.data && res.data.media && res.data.media.name;
      if (!mediaId) throw new Error("uploadImage: no mediaId in response");
      return mediaId;
    }
    const transient = res && (res.status === 429 || res.status === 0 || res.status === 401 || res.status === 403 || res.status >= 500);
    if (attempt < maxRetries && transient) {
      if (typeof opts.onRetry === "function") { try { opts.onRetry({ attempt: attempt + 1, max: maxRetries, status: res.status }); } catch (e) {} }
      await sleep(1000 * Math.pow(2, attempt) + 500 * Math.random());
      continue;
    }
    throw new Error("uploadImage HTTP " + (res && res.status) + ": " + (res && res.err));
  }
}

// Fire a video generation. Returns { operationName, projectId } to poll.
export async function generateVideo(tabId, prompt, opts = {}) {
  const projectId = await getProjectId(tabId);
  if (!projectId) throw new Error("No Flow project — open a project tab.");
  const mode = opts.videoMode || "text";
  const quality = opts.videoQuality || "lite";
  const ratio = opts.videoRatio || "landscape";
  const method = VIDEO_METHOD[mode] || VIDEO_METHOD.text;
  const url = SANDBOX + "/video:" + method;

  const req = {
    aspectRatio: ratio === "portrait" ? "VIDEO_ASPECT_RATIO_PORTRAIT" : "VIDEO_ASPECT_RATIO_LANDSCAPE",
    seed: newSeed(),
    metadata: {},
    textInput: { structuredPrompt: { parts: [{ text: prompt }] } },
    videoModelKey: buildVideoModelKey(mode, quality, opts.videoDuration || 8, ratio),
  };
  if ((mode === "start_frame" || mode === "start_end_frame") && opts.startFrameMediaId)
    req.startImage = { mediaId: opts.startFrameMediaId, cropCoordinates: CROP_FULL };
  if (mode === "start_end_frame" && opts.endFrameMediaId)
    req.endImage = { mediaId: opts.endFrameMediaId, cropCoordinates: CROP_FULL };
  // Reference video: library OBJECTS go in referenceImages (by mediaId), native CHARACTERS in
  // referenceEntities (by entityId). Verified live — the UI sends both in one r2v request.
  if (mode === "reference" && Array.isArray(opts.referenceMediaIds) && opts.referenceMediaIds.length)
    req.referenceImages = opts.referenceMediaIds.filter(Boolean).map((id) => ({ mediaId: id, imageUsageType: "IMAGE_USAGE_TYPE_ASSET" }));
  if (mode === "reference" && Array.isArray(opts.referenceEntities) && opts.referenceEntities.length)
    req.referenceEntities = opts.referenceEntities.filter(Boolean).map((e) => (typeof e === "string" ? { entityId: e } : e));

  const body = {
    mediaGenerationContext: { batchId: newBatchId(), audioFailurePreference: "BLOCK_SILENCED_VIDEOS" },
    clientContext: {
      projectId,
      tool: "PINHOLE",
      recaptchaContext: { applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB", token: "" },
      sessionId: newSessionId(),
      userPaygateTier: opts.paygateTier || "PAYGATE_TIER_NOT_PAID",
    },
    requests: [req],
    useV2ModelConfig: true,
  };

  let data;
  try {
    data = await apiCall(tabId, url, body, "VIDEO_GENERATION", opts);
  } catch (e) {
    // Account lacks the selected model (e.g. fast/quality) — fall back to the lite model.
    const liteKey = buildVideoModelKey(mode, "lite", opts.videoDuration || 8);
    if (/MODEL_ACCESS_DENIED/i.test(String(e && e.message)) && body.requests[0].videoModelKey !== liteKey) {
      body.requests[0].videoModelKey = liteKey;
      data = await apiCall(tabId, url, body, "VIDEO_GENERATION", opts);
    } else { throw e; }
  }
  const operationName = data && data.media && data.media[0] && data.media[0].name;
  if (!operationName) throw new Error("Video gen: no media name in response.");
  const workflowId = (data.workflows && data.workflows[0] && data.workflows[0].name) || (data.media[0] && data.media[0].workflowId) || null;
  return { operationName, workflowId, projectId };
}

// Upscale a generated video to 1080p. Async (like gen): returns the upscaled
// operation name to poll. Response: operations[0].operation.name == "<mediaId>_upsampled".
export async function upscaleVideo(tabId, mediaId, workflowId, opts = {}) {
  if (!mediaId || !workflowId) return null;
  const projectId = opts.projectId || (await getProjectId(tabId));
  const body = {
    mediaGenerationContext: { batchId: newBatchId() },
    clientContext: {
      projectId,
      tool: "PINHOLE",
      recaptchaContext: { applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB", token: "" },
      sessionId: newSessionId(),
      userPaygateTier: opts.paygateTier || "PAYGATE_TIER_NOT_PAID",
    },
    requests: [{
      resolution: String(opts.quality || "1080p").toLowerCase().indexOf("4k") >= 0 ? "VIDEO_RESOLUTION_4K" : "VIDEO_RESOLUTION_1080P",
      aspectRatio: opts.aspectRatio || "VIDEO_ASPECT_RATIO_LANDSCAPE",
      seed: newSeed(),
      videoModelKey: String(opts.quality || "1080p").toLowerCase().indexOf("4k") >= 0 ? "veo_3_1_upsampler_4k" : "veo_3_1_upsampler_1080p",
      metadata: { workflowId },
      videoInput: { mediaId },
    }],
    useV2ModelConfig: true,
  };
  const data = await apiCall(tabId, SANDBOX + "/video:batchAsyncGenerateVideoUpsampleVideo", body, "VIDEO_GENERATION", opts);
  const op = (data && data.operations && data.operations[0] && data.operations[0].operation && data.operations[0].operation.name)
    || (data && data.media && data.media[0] && data.media[0].name);
  return op || null;
}

// Query an existing video's workflowId (needed to upscale a synthetically-generated video,
// where we only know the mediaId from the card's result URL).
export async function getVideoInfo(tabId, mediaId, projectId) {
  if (!mediaId) return null;
  projectId = projectId || (await getProjectId(tabId));
  const token = await getSessionToken(tabId);
  if (!token) return null;
  const res = await inPage(tabId, async (name, projId, t) => {
    try {
      const r = await fetch("https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus", {
        method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", "Authorization": "Bearer " + t },
        body: JSON.stringify({ media: [{ name, projectId: projId }] }),
      });
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }, [mediaId, projectId, token]);
  const m = res && res.media && res.media[0];
  if (!m) return null;
  return { workflowId: m.workflowId || null, status: m.mediaMetadata && m.mediaMetadata.mediaStatus && m.mediaMetadata.mediaStatus.mediaGenerationStatus };
}

// Poll a video operation until COMPLETED/FAILED/timeout. Returns the download URL or null.
export async function pollVideoStatus(tabId, operationName, projectId, onTick) {
  const url = SANDBOX + "/video:batchCheckAsyncVideoGenerationStatus";
  for (let i = 0; i < VIDEO_POLL_MAX; i++) {
    await sleep(VIDEO_POLL_INTERVAL);
    const token = await getSessionToken(tabId);
    if (!token) continue;
    const res = await inPage(tabId, async (u, name, projId, t) => {
      try {
        const r = await fetch(u, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8", "Authorization": "Bearer " + t },
          body: JSON.stringify({ media: [{ name, projectId: projId }] }),
        });
        return r.ok ? { ok: true, data: await r.json() } : { ok: false, status: r.status };
      } catch (e) { return { ok: false, err: String((e && e.message) || e) }; }
    }, [url, operationName, projectId, token]);

    if (!res || !res.ok) continue;
    const m = res.data && res.data.media && res.data.media[0];
    const status = m && m.mediaMetadata && m.mediaMetadata.mediaStatus && m.mediaMetadata.mediaStatus.mediaGenerationStatus;
    if (status === "MEDIA_GENERATION_STATUS_COMPLETED" || status === "MEDIA_GENERATION_STATUS_COMPLETE" || status === "MEDIA_GENERATION_STATUS_SUCCESSFUL")
      return MEDIA_REDIRECT + operationName;
    if (status === "MEDIA_GENERATION_STATUS_FAILED") return null;
    if (typeof onTick === "function") { try { onTick(i + 1, status); } catch (e) {} }
  }
  return null; // timed out
}

// Convenience: generate a video and wait for the final download URL.
export async function generateVideoAndWait(tabId, prompt, opts = {}) {
  const { operationName, workflowId, projectId } = await generateVideo(tabId, prompt, opts);
  const downloadUrl = await pollVideoStatus(tabId, operationName, projectId, opts.onTick);
  return { operationName, workflowId, projectId, downloadUrl, type: "video" };
}

// Download URL for a media name (video). Images already carry fifeUrl.
export function getMediaDownloadUrl(name) {
  return MEDIA_REDIRECT + name;
}

// Quick environment check — useful before enabling code modes in the UI.
// Returns { ready, tabId, hasToken, hasRecaptcha, projectId } without generating anything.
export async function probe() {
  const tabId = await getFlowTabId();
  if (!tabId) return { ready: false, reason: "no_flow_tab" };
  const [token, projectId] = await Promise.all([getSessionToken(tabId, true), getProjectId(tabId)]);
  const recaptcha = await getRecaptchaToken(tabId, "IMAGE_GENERATION");
  return {
    ready: !!(token && recaptcha && projectId),
    tabId,
    hasToken: !!token,
    hasRecaptcha: !!recaptcha,
    projectId: projectId || null,
  };
}

// ===== Native Flow Characters (entities) — direct API, no reCAPTCHA on create/upload/patch. =====
// Create an empty CHARACTER entity in the project. Returns its entityId.
export async function createCharacterEntity(tabId, projectId) {
  const pid = projectId || await getProjectId(tabId);
  if (!pid) throw new Error("createCharacterEntity: no projectId");
  const body = JSON.stringify({ json: { projectId: pid, collectionId: null }, meta: { values: { collectionId: ["undefined"] } } });
  const res = await inPage(tabId, async (b) => {
    try {
      const r = await fetch("/fx/api/trpc/flow.createEntity", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: b });
      const txt = await r.text();
      if (!r.ok) return { ok: false, status: r.status, err: txt.slice(0, 300) };
      return { ok: true, data: JSON.parse(txt) };
    } catch (e) { return { ok: false, status: 0, err: String((e && e.message) || e) }; }
  }, [body]);
  if (!res || !res.ok) throw new Error("createCharacterEntity HTTP " + (res && res.status) + ": " + (res && res.err));
  const entityId = res.data?.result?.data?.json?.entityId;
  if (!entityId) throw new Error("createCharacterEntity: no entityId in response");
  return entityId;
}

// Upload an image and return BOTH ids: { mediaId, workflowId }. Character imageReferences need
// the workflowId (media.workflowId); mediaId is media.name. No reCAPTCHA on this endpoint.
export async function uploadCharacterImage(tabId, dataUrl, fileName, opts = {}) {
  const m = /^data:([^;,]+)(?:;base64)?,(.*)$/s.exec(dataUrl || "");
  if (!m) throw new Error("uploadCharacterImage: argument is not a data URL");
  const mimeType = m[1] || "image/png";
  const imageBytes = m[2];
  const ext = (mimeType.split("/")[1] || "png").replace("jpeg", "jpg");
  const projectId = opts.projectId || await getProjectId(tabId);
  const token = await getSessionToken(tabId, true);
  if (!token) throw new Error("uploadCharacterImage: no Flow session");
  const _body = { clientContext: { projectId, tool: "PINHOLE" }, fileName: fileName || ("char_" + Date.now() + "." + ext), imageBytes, isHidden: false, isUserUploaded: true, mimeType };
  // Bind the upload to a character entity + slot — REQUIRED for the resulting workflowId to be a
  // valid character imageReference (without it the later PATCH entities returns 500). Flow does this.
  if (opts.entityId) _body.mediaGenerationContext = { entityContext: { entityId: opts.entityId, characterSlot: { imageReferenceIndex: opts.imageReferenceIndex || 0 } } };
  const body = JSON.stringify(_body);
  // RETRY: back-to-back character uploads (2nd, 3rd…) get throttled by Google — 429/403
  // ("unusual activity", low reCAPTCHA-independent score on VPN/fresh accounts) or a transient
  // 500. Without a retry the 2nd character's photo silently never lands and the entity is left
  // as a nameless "Untitled Character". Retry transient statuses with growing backoff.
  let res = null;
  const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await inPage(tabId, async (u, b, t) => {
      try {
        const r = await fetch(u, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8", "Authorization": "Bearer " + t }, body: b });
        const txt = await r.text();
        if (!r.ok) return { ok: false, status: r.status, err: txt.slice(0, 300) };
        return { ok: true, data: JSON.parse(txt) };
      } catch (e) { return { ok: false, status: 0, err: String((e && e.message) || e) }; }
    }, [SANDBOX + "/flow/uploadImage", body, token]);
    if (res && res.ok) break;
    const transient = !res || res.status === 429 || res.status === 403 || res.status === 500 || res.status === 0;
    if (!transient || attempt === 2) break;
    await _sleep(1500 * (attempt + 1)); // 1.5s, then 3s
  }
  if (!res || !res.ok) throw new Error("uploadCharacterImage HTTP " + (res && res.status) + ": " + (res && res.err));
  const media = res.data && res.data.media;
  const workflowId = media && media.workflowId;
  if (!workflowId) throw new Error("uploadCharacterImage: no workflowId in response");
  return { mediaId: media && media.name, workflowId };
}

// Set displayName / personalityNotes / voice (presetVoiceId) / photo(s) on a character entity.
export async function patchCharacterEntity(tabId, projectId, entityId, info = {}) {
  const pid = projectId || await getProjectId(tabId);
  const token = await getSessionToken(tabId, true);
  if (!token) throw new Error("patchCharacterEntity: no Flow session");
  const characterInfo = {};
  const masks = ["entityInfo.displayName"];
  if (info.notes != null) { characterInfo.personalityNotes = String(info.notes); masks.push("entityInfo.characterInfo.personalityNotes"); }
  if (info.voiceId) { characterInfo.audioReferences = [{ presetVoiceId: info.voiceId }]; masks.push("entityInfo.characterInfo.audioReferences"); }
  const wfs = Array.isArray(info.workflowIds) ? info.workflowIds : (info.workflowId ? [info.workflowId] : []);
  // Trailing {} mirrors Flow's own request (an empty second reference slot). The image only
  // resolves here if it was uploaded WITH entityContext binding it to this entity (see uploadCharacterImage).
  if (wfs.length) { characterInfo.imageReferences = wfs.map((w) => ({ workflowId: w })).concat([{}]); masks.push("entityInfo.characterInfo.imageReferences"); }
  const body = JSON.stringify({ entity: { projectId: pid, entityId, entityInfo: { displayName: info.displayName || "Character", characterInfo } }, updateMask: masks.join(",") });
  const res = await inPage(tabId, async (u, bb, tt) => {
    try {
      const r = await fetch(u, { method: "PATCH", headers: { "Content-Type": "text/plain;charset=UTF-8", "Authorization": "Bearer " + tt }, body: bb });
      const txt = await r.text();
      if (!r.ok) return { ok: false, status: r.status, err: txt.slice(0, 300) };
      return { ok: true, data: txt.slice(0, 200) };
    } catch (e) { return { ok: false, status: 0, err: String((e && e.message) || e) }; }
  }, [SANDBOX + "/flow/entities", body, token]);
  if (!res || !res.ok) throw new Error("patchCharacterEntity HTTP " + (res && res.status) + ": " + (res && res.err));
  return true;
}

// One-shot: create a native Flow character from { name, photoDataUrl, voiceId, notes }.
// Returns { entityId, name }. Wire this to the "Подготовить" button, once per character.
export async function prepareCharacter(tabId, opts = {}) {
  const projectId = await getProjectId(tabId);
  const entityId = await createCharacterEntity(tabId, projectId);
  let workflowId = null;
  if (opts.photoDataUrl) {
    const up = await uploadCharacterImage(tabId, opts.photoDataUrl, (opts.name || "char") + ".png", { projectId, entityId, imageReferenceIndex: 0 });
    workflowId = up.workflowId;
  }
  await patchCharacterEntity(tabId, projectId, entityId, { displayName: opts.name || "Character", voiceId: opts.voiceId, notes: opts.notes, workflowId });
  return { entityId, name: opts.name || "Character" };
}

// ============================================================================
// Project reference LIST (objects + characters) — ONE authenticated GET, no reCAPTCHA.
// `flow.projectInitialData` returns the whole project (cookies/session, same auth as
// flow.createEntity). We derive two clean lists from it and skip scrolling the picker
// DOM entirely. Source of truth for Layer 1; cache ONCE PER BATCH at the caller.
//   projectContents.workflows[] = every media item. Classify by metadata:
//     • metadata.batchId present        -> generated result      (NOT an object)
//     • parentEntityId present          -> a character's ref img (NOT a standalone object)
//     • displayName ends with image ext -> uploaded OBJECT (mediaId = metadata.primaryMediaId)
//   projectContents.entities[] = CHARACTER entities (entityId + entityInfo.displayName).
// ============================================================================

// "ref_сурин_1782….png" and "сурин.png" both reduce to "сурин" (mirrors content-script gfObjectBaseName).
function _refBaseName(s) {
  return String(s || "").normalize("NFC").trim().toLowerCase()
    .replace(/^ref[_-]/, "")
    .replace(/\.(png|jpe?g|webp|gif|avif)$/i, "")
    .replace(/[_-]\d{10,}(_\d+)?$/, "")
    .trim();
}

// Raw project bootstrap payload. Returns { ok, data } with data === result.data.json.
export async function fetchProjectInitialData(tabId, projectId) {
  const pid = projectId || (await getProjectId(tabId));
  if (!pid) throw new Error("fetchProjectInitialData: no projectId");
  const res = await inPage(tabId, async (p) => {
    try {
      const input = encodeURIComponent(JSON.stringify({ json: { projectId: p } }));
      const r = await fetch("/fx/api/trpc/flow.projectInitialData?input=" + input, { credentials: "include" });
      if (!r.ok) return { ok: false, status: r.status };
      const j = await r.json();
      return { ok: true, data: (j && j.result && j.result.data && j.result.data.json) || null };
    } catch (e) { return { ok: false, err: String((e && e.message) || e) }; }
  }, [pid]);
  return res || { ok: false };
}

// Pure derivation from an already-fetched payload (no network).
function _deriveReferences(data) {
  const pc = (data && data.projectContents) || {};
  const wf = Array.isArray(pc.workflows) ? pc.workflows : [];
  // name -> entry. When both an original upload ("сурин.png") and an auto-created reference copy
  // ("ref_сурин_<ts>.png") exist for the same name, prefer the ORIGINAL upload's mediaId.
  const objMap = /* @__PURE__ */ new Map();
  for (const w of wf) {
    const md = w && w.metadata; if (!md) continue;
    if (w.parentEntityId) continue;                              // character ref image, not a standalone object
    if (md.batchId) continue;                                    // generated result, not an upload
    const dn = md.displayName || "";
    if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(dn)) continue;     // uploads carry a filename
    const mediaId = md.primaryMediaId; if (!mediaId) continue;
    const name = _refBaseName(dn);
    if (!name) continue;
    const isRefCopy = /^ref[_-]/i.test(dn.normalize("NFC").trim());
    const existing = objMap.get(name);
    if (!existing || (existing._ref && !isRefCopy)) objMap.set(name, { name, mediaId, workflowId: w.name, _ref: isRefCopy });
  }
  const objects = Array.from(objMap.values(), (o) => ({ name: o.name, mediaId: o.mediaId, workflowId: o.workflowId }));
  const ents = Array.isArray(pc.entities) ? pc.entities : [];
  const characters = []; const seenChar = /* @__PURE__ */ new Set();
  for (const e of ents) {
    const info = e && e.entityInfo; if (!info) continue;
    if (info.entityType && info.entityType !== "CHARACTER") continue;
    const name = String(info.displayName || "").normalize("NFC").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seenChar.has(key)) continue;
    seenChar.add(key);
    const refs = (info.characterInfo && info.characterInfo.imageReferences) || [];
    const workflowId = (refs.find((r) => r && r.workflowId) || {}).workflowId || null;
    characters.push({ name, entityId: e.entityId, thumbnailMediaId: e.thumbnailMediaId || null, workflowId });
  }
  return { objects, characters };
}

// THE Layer-1 call → { ok, objects:[{name,mediaId,workflowId}], characters:[{name,entityId,...}] }.
// One GET for both lists; cache per batch at the caller.
export async function listProjectReferences(tabId, projectId) {
  const res = await fetchProjectInitialData(tabId, projectId);
  if (!res || !res.ok || !res.data) return { ok: false, objects: [], characters: [] };
  const { objects, characters } = _deriveReferences(res.data);
  return { ok: true, objects, characters };
}

// Convenience wrappers — each does its own GET. Prefer listProjectReferences when you need both.
export async function listLibraryObjects(tabId, projectId) {
  return (await listProjectReferences(tabId, projectId)).objects;
}
export async function listCharacters(tabId, projectId) {
  return (await listProjectReferences(tabId, projectId)).characters;
}
