"use strict";
(() => {
  if (window.__bananaLoaded) { console.log("[GenFlow] Banana script already loaded, skipping re-init"); return; }
  window.__bananaLoaded = true;
  // src/utils/readiness.ts
  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && el.offsetWidth > 0 && el.offsetHeight > 0;
  }
  // Обновленная функция sleep: если вкладка неактивна (фоновая или свернута)
  // и задержка небольшая (до 2 секунд), мы используем синхронный busy-wait.
  // Это предотвращает зависание/блокировку setTimeout со стороны Chrome при фоновой работе.
  function sleep(ms) {
    // Human-like jitter: nudge each delay upward by a small random amount so the
    // automation's rhythm isn't machine-even — that even rhythm is part of what trips
    // Flow's "suspicious activity" / anti-bot (manual use, being irregular, passes).
    // Never shorter than asked; capped so menu/short waits stay close to their tuned value.
    const j = ms + Math.floor(Math.random() * Math.min(ms, 300));
    if (document.hidden && ms <= 2000) {
      const start = Date.now();
      while (Date.now() - start < j) {}
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, j));
  }
  function checkLoadingIndicators(containerEl) {
    const root = containerEl || document.body;
    const selectors = [
      '[class*="loading"]',
      '[class*="spinner"]',
      '[class*="progress"]',
      '[class*="loader"]',
      '[class*="circular"]',
      '[class*="indeterminate"]',
      '[aria-busy="true"]',
      '[class*="Loading"]',
      '[class*="Spinner"]',
      '[class*="Progress"]',
      '[class*="Loader"]'
    ];
    for (const sel of selectors) {
      const elements = root.querySelectorAll(sel);
      for (const el of elements) {
        if (isVisible(el)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 16 && rect.height > 16) {
            return true;
          }
        }
      }
    }
    return false;
  }
  function detectDOMErrors() {
    const bodyText = document.body.innerText.toLowerCase();
    const rateLimitPatterns = [
      "too many requests",
      "requesting too quickly",
      "rate limit",
      "429",
      "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432",
      "too many generations"
    ];
    for (const pattern of rateLimitPatterns) {
      if (bodyText.includes(pattern)) {
        return { type: "429", message: `Rate limited: ${pattern}` };
      }
    }
    const failedPatternsBody = [
      "failed generation",
      "couldn't generate",
      "application error",
      "app error",
      "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      "\u043E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438",
      "failed to generate"
    ];
    for (const pattern of failedPatternsBody) {
      if (bodyText.includes(pattern)) {
        return { type: "failed", message: `Generation failed: ${pattern}` };
      }
    }
    const networkPatterns = [
      "connection closed",
      "failed to fetch",
      "network error",
      "net::err_",
      "\u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0442\u0438",
      "\u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435 \u0437\u0430\u043A\u0440\u044B\u0442\u043E"
    ];
    for (const pattern of networkPatterns) {
      if (bodyText.includes(pattern)) {
        return { type: "network", message: `Network error: ${pattern}` };
      }
    }
    const failedPatternsAlert = [
      ...failedPatternsBody,
      "generation failed",
      "generation error",
      // Suspicious-activity is matched ONLY inside transient alert/status toasts,
      // NOT in the global body scan above: Google leaves a persistent site-chrome
      // banner ("Мы заметили подозрительную активность") that otherwise fails
      // every generation — including successful ones whose image already rendered.
      "suspicious activity",
      "подозрительн"
    ];
    const alertRateLimitPatterns = [...rateLimitPatterns, "403", "forbidden"];
    const alerts = document.querySelectorAll('[role="alert"], [role="status"]');
    for (const alert of alerts) {
      if (!isVisible(alert))
        continue;
      const text = (alert.textContent || "").toLowerCase();
      for (const pattern of alertRateLimitPatterns) {
        if (text.includes(pattern))
          return { type: "429", message: alert.textContent?.slice(0, 200) };
      }
      for (const pattern of failedPatternsAlert) {
        if (text.includes(pattern))
          return { type: "failed", message: alert.textContent?.slice(0, 200) };
      }
    }
    const sonnerToasts = document.querySelectorAll('[data-sonner-toast]');
    for (const toast of sonnerToasts) {
      if (!isVisible(toast))
        continue;
      const dtype = toast.getAttribute('data-type');
      if (dtype === 'error' || dtype === 'warning') {
        const msg = (toast.textContent || "").trim().slice(0, 200);
        // A "couldn't improve quality / increase resolution" toast is an UPSCALE failure,
        // NOT a generation failure — the image already exists. Reporting it as a generation
        // error made the background RE-GENERATE the prompt (the duplicate). Skip it here; the
        // upscale path raises its own UPSCALE_FAILED (re-upscale the existing image only).
        if (/улучшить качеств|увеличить разрешени|improve.{0,12}(qualit|resolution)|increase.{0,12}resolution|upscal/i.test(msg)) {
          continue;
        }
        return { type: "failed", message: msg || "Toast error detected" };
      }
      const svgIcon = toast.querySelector('svg');
      if (svgIcon) {
        const pathD = svgIcon.querySelector('path')?.getAttribute('d') || "";
        if (pathD.includes('M10.29 3.86') || pathD.includes('triangle') || pathD.includes('alert') || pathD.includes('warning')) {
          const msg = (toast.textContent || "").trim().slice(0, 200);
          return { type: "failed", message: msg || "Warning toast detected" };
        }
      }
    }
    try {
      const flowErr = findFlowErrorMessage();
      if (flowErr && !/улучшить качеств|увеличить разрешени|improve.{0,12}(qualit|resolution)|increase.{0,12}resolution|upscal/i.test(flowErr)) {
        return { type: "failed", message: flowErr };
      }
    } catch (e) {}
    return { type: null };
  }
  // Detect an error rendered INSIDE a specific generation card (Google's
  // "Ошибка ..." tile). Strongly gated to avoid the earlier false-fail loop:
  // a still-generating card shows a "%" progress and a finished one shows an
  // image/video — in both cases we bail. Error text bleeding in from a
  // neighbouring card in the same container is therefore ignored, because this
  // card itself still has progress/media.
  function getCardErrorMessage(card) {
    if (!card) return null;
    if (card.querySelector("img[src], video")) return null;          // already produced a result
    const txt = (card.textContent || "");
    if (/\d+\s*%/.test(txt)) return null;                            // generation in progress (e.g. "6%")
    const t = txt.toLowerCase();
    // Policy card ("This generation might violate our policies…") has NO "error" word —
    // detect it explicitly, else the tile is never counted failed and hangs until timeout.
    const isPolicy = t.includes("violate") || t.includes("наруш");
    if (!isPolicy && !t.includes("ошибка") && !t.includes("error")) return null;  // no error label in this card
    if (isPolicy) {
      return "Generation failed: policy violation";
    }
    if (t.includes("подозрительн") || t.includes("suspicious activity")) {
      return "Generation failed: suspicious activity";
    }
    if (t.includes("лимит") || t.includes("limit")) {
      return "Generation failed: daily limit reached";
    }
    return "Generation failed (card error): " + txt.replace(/\s+/g, " ").trim().slice(0, 140);
  }
  function querySelectorAllIncludingShadowDom(root, selector) {
    const result = [];
    function traverse(node) {
      try {
        const list = node.querySelectorAll(selector);
        list.forEach((el) => result.push(el));
        const all = node.querySelectorAll("*");
        all.forEach((el) => {
          if (el.shadowRoot)
            traverse(el.shadowRoot);
        });
      } catch (_) {
      }
    }
    traverse(root);
    return result;
  }
  function nativeClick(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const commonOpts = {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      view: window
    };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...commonOpts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent("mousedown", commonOpts));
    el.dispatchEvent(new PointerEvent("pointerup", { ...commonOpts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent("mouseup", commonOpts));
    el.dispatchEvent(new MouseEvent("click", commonOpts));
  }

  // src/content/banana.ts
  var MAX_BANANA_REFERENCE_IMAGES = 4;
  var monitoringInstances = /* @__PURE__ */ new Map();
  var claimedImageUrls = /* @__PURE__ */ new Map();
  var claimedMediaNames = /* @__PURE__ */ new Map();
  var completedPromptIds = /* @__PURE__ */ new Set();
  var globalReferenceImageUrls = /* @__PURE__ */ new Set();
  var globalReferenceMediaNames = /* @__PURE__ */ new Set();
  var referenceDisplayNameToFlowMedia = /* @__PURE__ */ new Map();
  function saveReferenceDisplayNameToFlowMedia() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const obj = {};
      for (const [k, v] of referenceDisplayNameToFlowMedia.entries()) {
        obj[k] = v;
      }
      chrome.storage.local.set({ referenceDisplayNameToFlowMedia: obj }, () => {
        console.log("[GenFlow] Saved reference mappings to chrome.storage.local", obj);
      });
    }
  }
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["referenceDisplayNameToFlowMedia"], (result) => {
      if (result && result.referenceDisplayNameToFlowMedia) {
        try {
          const obj = result.referenceDisplayNameToFlowMedia;
          for (const [k, v] of Object.entries(obj)) {
            referenceDisplayNameToFlowMedia.set(k, v);
          }
          console.log("[GenFlow] Loaded reference mappings from chrome.storage.local:", obj);
        } catch (e) {
          console.error("[GenFlow] Failed to parse reference mappings from chrome.storage.local", e);
        }
      }
    });
  }
  // GenFlow native characters: cache of prepared character entities, keyed by
  // projectId -> nameLower -> {entityId,...}. Written by the PREPARE_CHARACTERS
  // background handler. In reference mode it lets clicks-mode decide whether a
  // reference name should be attached as a NATIVE Flow character (via the
  // picker's "Characters" tab) instead of as a plain reference photo.
  var gfCharacterEntities = {};
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["gfCharacterEntities"], (result) => {
      if (result && result.gfCharacterEntities && typeof result.gfCharacterEntities === "object") {
        gfCharacterEntities = result.gfCharacterEntities;
      }
    });
    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.gfCharacterEntities && changes.gfCharacterEntities.newValue) {
          gfCharacterEntities = changes.gfCharacterEntities.newValue;
        }
      });
    }
  }
  function currentFlowProjectId() {
    const m = (location.pathname || "").match(/\/project\/([0-9a-fA-F-]{8,})/);
    return m ? m[1] : null;
  }
  function gfNormName(s) {
    return String(s || "").normalize("NFC").trim().toLowerCase();
  }
  function isPreparedCharacterName(name) {
    const want = gfNormName(name);
    if (!want) return false;
    // Normalize BOTH sides the same way (the background writes keys with varying
    // normalization: trim+lowercase in one path, lowercase-only in another), so a
    // unicode/whitespace mismatch can't cause a silent miss. The picker's
    // "Characters" tab is still the final gate.
    const pid = currentFlowProjectId();
    const buckets = [];
    if (pid && gfCharacterEntities[pid]) buckets.push(gfCharacterEntities[pid]);
    for (const p in gfCharacterEntities) {
      if (p !== pid && gfCharacterEntities[p]) buckets.push(gfCharacterEntities[p]);
    }
    for (const bucket of buckets) {
      for (const k in bucket) {
        if (gfNormName(k) === want) return true;
      }
    }
    return false;
  }
  // Prepared-character names that appear (as whole words) in the prompt text.
  // Mirrors veo.js gfCharacterNamesInText: lets clicks-mode attach native Flow
  // characters by name straight from the persisted cache — WITHOUT depending on
  // the popup's (non-persisted) Characters table or any referenceImageUrls. This
  // is what makes "анна гуляет" attach анна in image-single, same as in video.
  function gfCharacterNamesInText(text) {
    const norm = gfNormName(text);
    if (!norm) return [];
    const pid = currentFlowProjectId();
    const buckets = [];
    if (pid && gfCharacterEntities[pid]) buckets.push(gfCharacterEntities[pid]);
    for (const p in gfCharacterEntities) { if (p !== pid && gfCharacterEntities[p]) buckets.push(gfCharacterEntities[p]); }
    const found = [], seen = /* @__PURE__ */ new Set();
    for (const bucket of buckets) {
      for (const k in bucket) {
        const name = gfNormName(k);
        if (!name || seen.has(name)) continue;
        let hit = false;
        try {
          const re = new RegExp("(^|[^\\p{L}\\p{N}])" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\p{L}\\p{N}]|$)", "u");
          hit = re.test(norm);
        } catch (e) { hit = norm.includes(name); }
        if (hit) { found.push(name); seen.add(name); }
      }
    }
    return found;
  }
  var globalMediaObserver = null;
  var mediaFirstObservedAt = /* @__PURE__ */ new WeakMap();
  function recordFirstObserved(el) {
    if (!mediaFirstObservedAt.has(el)) {
      mediaFirstObservedAt.set(el, Date.now());
    }
  }
  function ensureGlobalMediaObserver() {
    if (globalMediaObserver)
      return;
    globalMediaObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE)
            continue;
          const el = node;
          recordFirstObserved(el);
          el.querySelectorAll?.("img").forEach((c) => {
            recordFirstObserved(c);
          });
          tryClaimImageFromElement(el);
          el.querySelectorAll?.("img").forEach((c) => tryClaimImageFromElement(c));
        }
        if (mutation.type === "attributes") {
          recordFirstObserved(mutation.target);
          tryClaimImageFromElement(mutation.target);
        }
      }
    });
    globalMediaObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"]
    });
  }
  const IGNORED_PROMPT_WORDS = new Set([
    "favorite", "redo", "more_vert", "play_circle", "share", "download", "delete",
    "play_circle_outline", "play_circle_filled", "play_arrow", "close", "arrow_back",
    "info", "help", "settings", "volume_up", "volume_off", "fullscreen", "fullscreen_exit",
    "refresh", "autoplay", "content_copy", "play", "pause", "preview",
    "добавить в избранное", "сгенерировать повторно", "ещё", "удалить из избранного", "удалить",
    "скачать", "поделиться", "add to favorites", "regenerate", "more", "delete"
  ]);

  function isValidPromptString(str) {
    if (!str || typeof str !== 'string') return false;
    str = str.trim();
    if (str.length < 2) return false;
    if (str.includes("fe_id_") || /^[0-9a-fA-F-]{36}$/.test(str) || /^fe_id_[0-9a-fA-F-]+$/.test(str)) {
      return false;
    }
    if (str.startsWith("Video Tile") || str.startsWith("Image Tile")) {
      return false;
    }
    const lower = str.toLowerCase();
    if (IGNORED_PROMPT_WORDS.has(lower)) return false;
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d+/i.test(lower)) return false;
    if (/^\d{1,2}\s+(янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)/i.test(lower)) return false;
    if (lower === "закрыть" || lower === "cancel" || lower === "close" || lower === "ok" || lower === "yes" || lower === "no") return false;
    return true;
  }

  // Extracts prompt text (displayName) from React fiber memoizedState on the tile DOM element.
  // Uses chrome.scripting.executeScript via background.js to run in MAIN world — 
  // the only reliable way to access React fiber properties from a content script.
  async function extractPromptFromTileFiber(tileEl) {
    if (!tileEl) return null;
    const tileId = tileEl.getAttribute('data-tile-id');
    if (!tileId) return null;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: "EXTRACT_FIBER_PROMPT",
        payload: { tileId }
      });
      if (response && response.prompt) {
        console.log("[GenFlow] Extracted displayName via background MAIN world:", response.prompt);
        return response.prompt;
      }
    } catch (err) {
      console.warn("[GenFlow] EXTRACT_FIBER_PROMPT failed:", err);
    }
    return null;
  }

  function findPromptInReactTree(mediaEl) {
    if (!mediaEl) return null;
    
    // Находим контейнер карточки (с атрибутом data-tile-id или классами card/tile)
    let cardEl = mediaEl;
    while (cardEl && cardEl.tagName.toLowerCase() !== 'body') {
      if (cardEl.hasAttribute?.('data-tile-id') || 
          (cardEl.className && typeof cardEl.className === 'string' && (cardEl.className.includes('card') || cardEl.className.includes('tile')))) {
        break;
      }
      cardEl = cardEl.parentElement;
    }
    if (!cardEl) cardEl = mediaEl;

    const visited = new Set();
    const highPriorityKeys = ["prompt", "promptText", "displayName", "currentName", "title", "subtitle", "text"];
    let bestPrompt = null;

    function search(obj, depth = 0) {
      if (depth > 12 || !obj || typeof obj !== 'object' || visited.has(obj)) return;
      visited.add(obj);
      for (const key of highPriorityKeys) {
        try {
          const val = obj[key];
          if (typeof val === 'string' && isValidPromptString(val)) {
            bestPrompt = val.trim();
            return;
          }
        } catch(e) {}
      }
      for (const k in obj) {
        try {
          // Игнорируем переходы вверх/вбок по дереву Fiber и ссылки на DOM-элементы, чтобы не загрязнять visited
          if (k === 'return' || k === 'sibling' || k === 'stateNode' || k === 'alternate') continue;
          const val = obj[k];
          if (val && typeof val === 'object') {
            search(val, depth + 1);
            if (bestPrompt) return;
          }
        } catch(e) {}
      }
    }

    const keys = Object.keys(cardEl);
    
    // 1. Сначала ищем строго в props карточки (это самый надежный и неглубокий путь)
    const propsKey = keys.find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$'));
    if (propsKey) {
      try {
        search(cardEl[propsKey]);
        if (bestPrompt) {
          console.log("[GenFlow] Extracted prompt from card props:", bestPrompt);
          return bestPrompt;
        }
      } catch(e) {}
    }

    // 2. Если не нашли, ищем по локальному Fiber-дереву карточки (только вниз)
    const fiberKey = keys.find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (fiberKey) {
      try {
        search(cardEl[fiberKey]);
        if (bestPrompt) {
          console.log("[GenFlow] Extracted prompt from card fiber:", bestPrompt);
          return bestPrompt;
        }
      } catch(e) {}
    }

    // 3. Резервный поиск по предкам элемента mediaEl (на случай другой структуры DOM)
    let node = mediaEl;
    while (node && node.tagName.toLowerCase() !== 'body') {
      const nodeKeys = Object.keys(node);
      for (const key of nodeKeys) {
        if (key.startsWith('__reactProps$') || key.startsWith('__reactFiber$')) {
          try {
            search(node[key]);
            if (bestPrompt) {
              console.log("[GenFlow] Extracted prompt from media ancestor:", bestPrompt);
              return bestPrompt;
            }
          } catch(e) {}
        }
      }
      node = node.parentElement;
    }

    return null;
  }

  function extractPromptTextFromCard(imgEl) {
    if (!imgEl) return null;
    try {
      const reactPrompt = findPromptInReactTree(imgEl);
      if (reactPrompt) {
        console.log("[GenFlow] Extracted prompt from React fiber:", reactPrompt);
        return reactPrompt;
      }
    } catch(err) {
      console.warn("[GenFlow] Error searching React tree for prompt:", err);
    }

    let tileContainer = null;
    let node = imgEl.parentElement;
    for (let depth = 0; depth < 12 && node; depth++) {
      const tagName = node.tagName.toLowerCase();
      if (tagName === "body" || tagName === "html") {
        break;
      }
      const className = typeof node.className === "string" ? node.className.toLowerCase() : "";
      if (className.includes("header") || className.includes("toolbar") || className.includes("nav")) {
        break;
      }
      if (node.hasAttribute?.("data-tile-id") || 
          (node.className && typeof node.className === "string" && (node.className.includes("card") || node.className.includes("tile")))) {
        tileContainer = node;
        break;
      }
      tileContainer = node;
      node = node.parentElement;
    }

    if (tileContainer) {
      const SKIP_TAGS = new Set(["input", "textarea", "select", "svg", "path", "script", "style"]);
      const IGNORED_TEXTS = new Set([
        "play_circle", "play_circle_outline", "play_circle_filled", 
        "play_arrow", "download", "share", "more_vert", "close", 
        "arrow_back", "info", "help", "settings", "volume_up", 
        "volume_off", "fullscreen", "fullscreen_exit", "refresh", 
        "autoplay", "content_copy", "play", "pause", "preview",
        "favorite", "redo", "добавить в избранное", "сгенерировать повторно",
        "ещё", "удалить из избранного", "удалить", "скачать", "поделиться",
        "add to favorites", "regenerate", "more", "delete"
      ]);

      function longestNonInteractiveText(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let best = "";
        let n;
        while (n = walker.nextNode()) {
          const p = n.parentElement;
          if (!p)
            continue;
          let ancestor = p;
          let skip = false;
          while (ancestor && ancestor !== root) {
            const tagName = ancestor.tagName.toLowerCase();
            const className = typeof ancestor.className === "string" ? ancestor.className.toLowerCase() : "";
            const role = ancestor.getAttribute?.("role") || "";
            
            if (SKIP_TAGS.has(tagName) || 
                className.includes("material-icons") || 
                className.includes("material-symbols") || 
                className.includes("icon") ||
                tagName === "i" ||
                role === "toolbar" ||
                role === "menu" ||
                className.includes("toolbar") ||
                className.includes("menu")) {
              skip = true;
              break;
            }
            ancestor = ancestor.parentElement;
          }
          if (skip)
            continue;
          const t = (n.textContent || "").trim();
          if (IGNORED_TEXTS.has(t.toLowerCase())) {
            continue;
          }
          if (t.length > best.length)
            best = t;
        }
        return best;
      }

      const text = longestNonInteractiveText(tileContainer);
      if (text && text.length >= 3 && !/^[\d\s:.,'"-]+$/.test(text)) {
        return text;
      }
    }
    return null;
  }
  function findInstanceByPromptText(cardText) {
    const normalise = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const normCard = normalise(cardText);
    let bestInst = null;
    let bestScore = 0;
    for (const inst of monitoringInstances.values()) {
      if (inst.claimedImageUrl)
        continue;
      const normPrompt = normalise(inst.promptText);
      if (!normPrompt)
        continue;
      let score = 0;
      if (normCard.includes(normPrompt) || normPrompt.includes(normCard)) {
        score = Math.min(normCard.length, normPrompt.length);
      } else {
        const cardWords = new Set(normCard.split(/\s+/).filter((w) => w.length > 3));
        const promptWords = normPrompt.split(/\s+/).filter((w) => w.length > 3);
        const overlap = promptWords.filter((w) => cardWords.has(w)).length;
        if (promptWords.length > 0 && overlap >= 2) {
          score = Math.round(overlap / promptWords.length * normPrompt.length);
        }
      }
      const minRequired = Math.min(normCard.length, normPrompt.length) * 0.65;
      if (score >= minRequired && score > bestScore) {
        bestScore = score;
        bestInst = inst;
      }
    }
    return bestInst;
  }
  function isInVideoResultCard(el, maxDepth = 6) {
    let node = el.parentElement;
    for (let d = 0; d < maxDepth && node; d++) {
      if (node.getAttribute("data-tile-id") !== null) {
        return true;
      }
      const className = node.className || "";
      if (typeof className === "string") {
        const lowerClass = className.toLowerCase();
        if (lowerClass.includes("card") || lowerClass.includes("tile") || lowerClass.includes("result") || lowerClass.includes("output")) {
          return true;
        }
      }
      if (node.tagName.toLowerCase() === "video") {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }
  function tryClaimImageFromElement(el) {
    if (el.tagName !== "IMG")
      return;
    if (isInVideoResultCard(el))
      return;
    const src = el.src;
    if (!src)
      return;
    const url = normalizeMediaUrl(src);
    const name = extractMediaNameFromUrl(url);
    if (name && !claimedMediaNames.has(name)) {
      claimImageToSlot(name, url, el);
    }
  }
  function claimImageToSlot(mediaName, url, imgEl) {
    if (claimedMediaNames.has(mediaName))
      return;
    if (globalReferenceImageUrls.has(url))
      return;
    if (globalReferenceMediaNames.has(mediaName))
      return;
    for (const inst of monitoringInstances.values()) {
      if (inst.preGenerationImageSrcs.has(url))
        return;
      for (const preUrl of inst.preGenerationImageSrcs) {
        const preName = extractMediaNameFromUrl(preUrl);
        if (preName && preName === mediaName)
          return;
      }
    }
    if (imgEl) {
      const firstSeen = mediaFirstObservedAt.get(imgEl);
      if (firstSeen !== void 0 && monitoringInstances.size > 0) {
        const earliestClickTime = Math.min(
          ...Array.from(monitoringInstances.values()).map((i) => i.createButtonClickTime)
        );
        if (firstSeen < earliestClickTime - 2e3) {
          console.log(`[GenFlow] Banana GlobalTracker: skipping pre-existing media (first seen ${Date.now() - firstSeen}ms ago): ${mediaName}`);
          return;
        }
      }
    }
    if (imgEl && isInVideoResultCard(imgEl))
      return;
    if (imgEl) {
      for (const inst of monitoringInstances.values()) {
        if (inst.ownCardTileIds && inst.ownCardTileIds.length > 0) {
          let containsImg = false;
          for (const tileId of inst.ownCardTileIds) {
            const card = document.querySelector(`[data-tile-id="${tileId}"]`);
            if (card && card.contains(imgEl)) {
              containsImg = true;
              break;
            }
          }
          if (containsImg) {
            const targetKey = getUniqueImageKey(url);
            let alreadyDetected = false;
            for (const existingUrl of inst.detectedImageUrls) {
              if (getUniqueImageKey(existingUrl) === targetKey) {
                alreadyDetected = true;
                break;
              }
            }
            if (alreadyDetected) {
              return;
            }
            claimedMediaNames.set(mediaName, inst.slotId);
            claimedImageUrls.set(url, inst.slotId);
            if (!inst.claimedImageUrl) {
              inst.claimedImageUrl = url;
            }
            addUniqueUrlToSet(inst.detectedImageUrls, url);
            console.log(`[GenFlow] Banana GlobalTracker: ownCard containment ➔ slot ${inst.slotId} (prompt #${inst.promptNumber}): ${mediaName}`);
            return;
          }
        }
      }
    }
    if (!imgEl)
      return;
    const cardText = extractPromptTextFromCard(imgEl);
    if (!cardText)
      return;
    const matched = findInstanceByPromptText(cardText);
    if (!matched)
      return;
    if (matched.ownCardTileIds && matched.ownCardTileIds.length > 0)
      return;
    const targetKey = getUniqueImageKey(url);
    let alreadyDetected = false;
    for (const existingUrl of matched.detectedImageUrls) {
      if (getUniqueImageKey(existingUrl) === targetKey) {
        alreadyDetected = true;
        break;
      }
    }
    if (alreadyDetected) {
      return;
    }
    claimedMediaNames.set(mediaName, matched.slotId);
    claimedImageUrls.set(url, matched.slotId);
    if (!matched.claimedImageUrl) {
      matched.claimedImageUrl = url;
    }
    addUniqueUrlToSet(matched.detectedImageUrls, url);
    console.log(`[GenFlow] Banana GlobalTracker: text-match \u2192 slot ${matched.slotId} (prompt #${matched.promptNumber}) for "${cardText.slice(0, 50)}"`);
  }
  function findResultCardForPrompt(promptText, preGenUrls) {
    if (!promptText)
      return null;
    const normalise = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const normTarget = normalise(promptText);
    if (!normTarget)
      return null;
    const targetWords = normTarget.split(/\s+/).filter((w) => w.length > 3);
    const allImgs = [
      ...querySelectorAllIncludingShadowDom(document, FLOW_IMAGE_IMG_SELECTOR),
      ...querySelectorAllIncludingShadowDom(document, FLOW_IMAGE_IMG_FALLBACK)
    ];
    for (const img of allImgs) {
      if (isInVideoResultCard(img))
        continue;
      const src = img.src;
      if (!src)
        continue;
      const url = normalizeMediaUrl(src);
      if (preGenUrls.has(url))
        continue;
      const name = extractMediaNameFromUrl(url);
      if (!name)
        continue;
      const cardText = extractPromptTextFromCard(img);
      if (!cardText)
        continue;
      const normCard = normalise(cardText);
      if (normCard.includes(normTarget) || normTarget.includes(normCard)) {
        return url;
      }
      if (targetWords.length >= 3) {
        const cardWords = new Set(normCard.split(/\s+/).filter((w) => w.length > 3));
        const overlap = targetWords.filter((w) => cardWords.has(w)).length;
        if (overlap / targetWords.length >= 0.7)
          return url;
      }
    }
    return null;
  }
  var flowSubmissionLockHeld = false;
  var flowSubmissionLockQueue = [];
  var flowInjectionAborted = false;
  // Set per-injection so the upscale step (a separate function) knows when the chain can
  // be pipelined: in Film mode the next frame only needs the *generated* previous frame's
  // card (already in the gallery), so the 4K upscale-download can run in the background
  // (bytes arrive via the MAIN-world hook) instead of blocking the chain ~15s per frame.
  var __gfCurrentGenMode = null;
  // Bridge for the MAIN-world upsample hook: maps a source image's mediaId to the
  // prompt that requested its 2K, so when the hook delivers the 2K base64 we save it
  // under the right filename via the extension (reliable; not Flow's flaky blob).
  // Singleton listener (survives multiple banana.js injections). The MAIN-world hook
  // already attributed the 2K to a prompt via the claim it consumed at request time, so
  // here we just forward the hook's promptId — no media-id / order guessing.
  if (!window.__gfUpscaleBridge) {
    window.__gfUpscaleBridge = true;
    window.addEventListener("message", (ev) => {
      if (ev.source !== window) return;
      const d = ev.data;
      if (!d || d.__genflowUpsample !== true) return;
      if (!d.dataUrl || !d.promptId) {
        console.log(`[GenFlow] upscale hook: response without claim/2K (promptId=${d.promptId}, err=${d.error})`);
        return;
      }
      console.log(`[GenFlow] upscale hook: got 2K for prompt #${d.promptNumber} (id ${d.upscaleId})`);
      chrome.runtime.sendMessage({ type: "UPSCALE_DOWNLOAD", payload: { promptId: d.promptId, promptNumber: d.promptNumber, upscaleId: d.upscaleId, dataUrl: d.dataUrl } }).catch(() => {});
    });
  }
  function abortFlowInjections() {
    flowInjectionAborted = true;
    flowSubmissionLockHeld = false;
    const waiters = flowSubmissionLockQueue.splice(0);
    // Unblock queued waiters so they proceed to the abort check and bail out
    // cleanly (releasing the lock via their finally) instead of submitting.
    for (const w of waiters) { try { w(); } catch (_) {} }
  }
  async function __gfWaitCooldown(promptNumber) {
    for (let i = 0; i < 1200; i++) {
      let st;
      try { st = await chrome.runtime.sendMessage({ type: "CHECK_COOLDOWN" }); }
      catch (e) { return; }
      if (!st || st.isRunning === false) return;
      const until = st.cooldownUntil || 0;
      const now = Date.now();
      if (!until || now >= until) return;
      if (i === 0) console.log(`[GenFlow] Banana: prompt #${promptNumber}: holding placement — cooldown active (${Math.ceil((until - now) / 1000)}s)`);
      await new Promise((r) => setTimeout(r, Math.min(1500, until - now + 50)));
    }
  }
  async function acquireFlowSubmissionLock(promptNumber) {
    if (!flowSubmissionLockHeld) {
      flowSubmissionLockHeld = true;
      return;
    }
    return new Promise((resolve, reject) => {
      console.log(`[GenFlow] Banana: Prompt #${promptNumber} queued for submission lock (queue length: ${flowSubmissionLockQueue.length + 1})`);
      const timeoutId = setTimeout(() => {
        const idx = flowSubmissionLockQueue.indexOf(entry);
        if (idx !== -1)
          flowSubmissionLockQueue.splice(idx, 1);
        reject(new Error(`Timed out waiting for Flow submission lock (prompt #${promptNumber})`));
      }, 12e4);
      const entry = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      flowSubmissionLockQueue.push(entry);
    });
  }
  function releaseFlowSubmissionLock() {
    if (flowSubmissionLockQueue.length > 0) {
      const next = flowSubmissionLockQueue.shift();
      next();
    } else {
      flowSubmissionLockHeld = false;
    }
  }
  var lastInjectedPrompt = "";
  // Mode/aspect/count/model don't change between prompts in the same run, so opening &
  // closing the settings/mode menu on EVERY prompt is pure "already selected" no-op churn
  // (and the open-close-open flicker you see on the model selector). Cache a signature of
  // the applied settings; once applied for a given signature we skip the whole menu dance.
  // Reset on RESET_CONTENT_STATE (run start) so the first prompt of every run re-verifies.
  var lastAppliedSettingsSig = null;
  var FLOW_SELECTORS = {
    createProjectButton: "button.sc-a38764c7-0, button.fXsrxE"
  };
  var FLOW_CREATE_PROJECT_TEXTS = ["\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442", "Create project", "Create Project", "New project", "\u0422\u0432\u043E\u0440\u0438\u0442\u0435 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E Flow", "Create with Flow", "プロジェクトを作成", "プロジェクトの作成", "新規プロジェクト", "作成"];
  function findElementByText(texts, tagName = "button") {
    const elements = document.querySelectorAll(tagName);
    for (const el of elements) {
      const text = (el.textContent || "").trim();
      if (texts.some((t) => text.includes(t)) && isVisible2(el))
        return el;
    }
    return null;
  }
  function findCreateProjectButton() {
    // Look for any visible button or card with a '+' / 'add' icon structurally (language independent)
    const buttons = document.querySelectorAll('button, a, div[role="button"]');
    for (const btn of buttons) {
      if (!isVisible2(btn)) continue;
      
      const icons = btn.querySelectorAll('i, span, svg');
      let hasAddIcon = false;
      for (const icon of icons) {
        const iconText = (icon.textContent || "").trim().toLowerCase();
        if (iconText === "add" || iconText === "add_2" || iconText === "add_circle" || iconText === "+") {
          hasAddIcon = true;
          break;
        }
      }
      
      const text = (btn.textContent || "").trim();
      const hasAddText = text.startsWith("add_2") || text.startsWith("add") || text.startsWith("+");
      
      if (hasAddIcon || hasAddText) {
        // Exclude common navigation panel buttons
        if (text.includes("delete") || text.includes("help") || text.includes("settings") || text.includes("close") || text.includes("more_vert")) {
          continue;
        }
        console.log("[GenFlow] Banana: Found Create Project button structurally:", btn);
        return btn;
      }
    }
    
    // Class-based fallback
    const fallbackEl = document.querySelector('button[class*="cgdjfr"]');
    if (fallbackEl && isVisible2(fallbackEl)) {
      console.log("[GenFlow] Banana: Found Create Project button by class fallback:", fallbackEl);
      return fallbackEl;
    }
    
    // Traditional fallback
    const selectors = FLOW_SELECTORS.createProjectButton.split(", ");
    for (const sel of selectors) {
      const el = document.querySelector(sel.trim());
      if (el && isVisible2(el)) {
        return el;
      }
    }
    const byText = findElementByText(FLOW_CREATE_PROJECT_TEXTS, "button") ||
                   findElementByText(FLOW_CREATE_PROJECT_TEXTS, "a") ||
                   findElementByText(FLOW_CREATE_PROJECT_TEXTS, "div") ||
                   findElementByText(FLOW_CREATE_PROJECT_TEXTS, "span");
    return byText;
  }
  var FLOW = {
    promptTextarea: [
      "#PINHOLE_TEXT_AREA_ELEMENT_ID",
      'textarea[placeholder*="\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435"]',
      'textarea[placeholder*="\u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u043C\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u0443"]',
      'textarea[placeholder*="\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435"]',
      'textarea[placeholder*="Generate"]',
      'textarea[placeholder*="text prompt"]',
      'textarea[placeholder*="prompt"]',
      "textarea"
    ],
    createButton: [
      "button.gdArnN.gdXWm",
      "button.sc-408537d4-2.gdXWm"
    ],
    createButtonByText: ["Создать", "Create", "作成", "生成", "Crear", "Créer", "Erstellen"],
    // Phase 5: "Создать изображение" is the correct image mode text
    imageModeTexts: ["Создать изображение", "Create image", "Generate image", "создать изображение", "画像を作成", "画像を生成", "画像生成", "crear imagen", "créer une image", "bild erstellen"],
    modeDropdownSelectors: ["button.sc-bd77098e-1", "button.hdOBaY", "button.hKBFUo"]
  };
  var IMAGE_MODEL_LABELS = {
    "nano-banana-pro": "Nano Banana Pro",
    "nano-banana": "Nano Banana 2",
    "nano-banana-2-lite": "Nano Banana 2 Lite",
    "imagen-4": "Imagen 4"
  };
  // Server-overridable selectors/texts. The popup fetches /api/v1/config/flow into
  // chrome.storage.local.flowSelectors; we merge it over the bundled defaults IN PLACE so
  // Flow DOM churn (renamed hashed classes, retitled buttons, model labels) can be patched
  // server-side WITHOUT republishing. Anything the server omits keeps its bundled default,
  // so the extension never breaks offline / when the server is silent (storage empty = no-op).
  function applyServerFlowSelectors(fs) {
    try {
      const b = fs && fs.banana;
      if (!b) return;
      if (typeof b.createProjectButton === "string") FLOW_SELECTORS.createProjectButton = b.createProjectButton;
      for (const k of Object.keys(FLOW)) {
        if (Array.isArray(b[k]) && b[k].length) FLOW[k] = b[k];
        else if (typeof b[k] === "string") FLOW[k] = b[k];
      }
      if (Array.isArray(b.createProjectTexts) && b.createProjectTexts.length) {
        FLOW_CREATE_PROJECT_TEXTS.length = 0;
        FLOW_CREATE_PROJECT_TEXTS.push(...b.createProjectTexts);
      }
      if (b.imageModelLabels && typeof b.imageModelLabels === "object") Object.assign(IMAGE_MODEL_LABELS, b.imageModelLabels);
      console.log("[GenFlow] Banana: applied server selector overrides");
    } catch (e) { console.warn("[GenFlow] Banana: applyServerFlowSelectors failed", e); }
  }
  // RAM-only: pull selectors from the background's in-memory copy (NEVER from disk/storage).
  // Background fetches them at run start and broadcasts FLOW_SELECTORS_UPDATED.
  try {
    chrome.runtime.sendMessage({ type: "GET_FLOW_SELECTORS" }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (resp && resp.selectors) applyServerFlowSelectors(resp.selectors);
    });
  } catch (e) {}
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "FLOW_SELECTORS_UPDATED" && msg.selectors) applyServerFlowSelectors(msg.selectors);
  });
  function extractMediaNameFromUrl(url) {
    if (!url || url.startsWith("blob:"))
      return null;
    const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = url.match(uuidPattern);
    if (match)
      return match[1];
    const nameMatch = url.match(/[?&]name=([0-9a-f-]+)(?=&|$)/i);
    if (nameMatch)
      return nameMatch[1];
    return null;
  }
  function getUniqueImageKey(url) {
    if (!url) return "";
    const name = extractMediaNameFromUrl(url);
    if (name) return name;
    if (url.includes("googleusercontent.com")) {
      return url.split("=")[0];
    }
    return url.split(/[?#]/)[0];
  }
  function addUniqueUrlToSet(set, url) {
    const key = getUniqueImageKey(url);
    for (const existingUrl of set) {
      if (getUniqueImageKey(existingUrl) === key) return;
    }
    set.add(url);
  }
  function getDownloadUrlForImage(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith("http"))
      return imageUrl || "";
    const mediaName = extractMediaNameFromUrl(imageUrl);
    if (mediaName) {
      return `${window.location.origin}/fx/api/trpc/media.getMediaUrlRedirect?name=${mediaName}`;
    }
    return imageUrl;
  }
  function normalizeMediaUrl(url) {
    if (!url)
      return url;
    if (url.startsWith("/"))
      return new URL(url, window.location.origin).toString();
    return url;
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "REMOVE_COMPLETED_PROMPT") {
      completedPromptIds.delete(message.payload?.promptId);
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "START_DOWNLOAD_ALL") {
      // Disabled: veo.js owns Download All for all services (handles video+image).
      // Running banana's own copy in parallel caused top-down order and
      // blob/Flow-named duplicate downloads.
      return false;
    }
    if (message.type === "STOP_DOWNLOAD_ALL") {
      isDownloadingAll = false;
      console.log("[GenFlow] Received STOP_DOWNLOAD_ALL signal");
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "PING") {
      if (message.service && message.service !== "banana") return false;
      sendResponse({ pong: true, service: "banana" });
      return false;
    }
    if (message.type === "GF_LIST_LIB_OBJECTS") {
      listLibraryObjectsForCode().then((items) => sendResponse({ ok: true, items })).catch(() => sendResponse({ ok: false, items: [] }));
      return true; // async response
    }
    if (message.type === "CREATE_PROJECT") {
      console.log("[GenFlow] Banana: Received CREATE_PROJECT command");
      ensureFlowProjectPage().catch(err => console.error("[GenFlow] Banana: CREATE_PROJECT error:", err));
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "INJECT_PROMPT") {
      const payload = message.payload;
      if (payload.settings?.service !== "banana")
        return false;
      // Do NOT clear flowInjectionAborted here. Stop sets it via ABORT_INJECTIONS and
      // it must STAY set so queued/in-flight injects bail — it is cleared only on the
      // next START (RESET_CONTENT_STATE). Resetting it per-inject let a late dispatch
      // wipe a Stop, so the batch kept getting placed after the user pressed Stop.
      if (flowInjectionAborted) {
        console.log("[GenFlow] Banana: INJECT_PROMPT ignored — injections aborted (Stop active)");
        sendResponse({ success: true });
        return false;
      }
      const __pid = payload.prompt?.id;
      if (!window.__bananaInjectingIds) window.__bananaInjectingIds = /* @__PURE__ */ new Set();
      if (__pid && window.__bananaInjectingIds.has(__pid)) {
        // Same prompt already injecting -> idempotent drop (guards re-sends).
        // A DIFFERENT prompt must NOT be blocked: with maxImageThreads>1 the
        // background dispatches several prompts at once; they serialize safely
        // at acquireFlowSubmissionLock. The old global __bananaInjecting flag
        // silently dropped the 2nd prompt, leaving it stuck "processing" and
        // stalling the whole queue.
        sendResponse({ success: true });
        return false;
      }
      if (__pid) window.__bananaInjectingIds.add(__pid);
      injectPrompt(payload).finally(() => { if (__pid) window.__bananaInjectingIds.delete(__pid); });
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "ABORT_INJECTIONS") {
      // Stop only NEW/queued submissions; keep monitoring so in-progress generations finish
      // and still download. Cleared on next START via RESET_CONTENT_STATE.
      abortFlowInjections();
      console.log("[GenFlow] Banana: new injections aborted (stop) — in-progress kept for download");
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "RESET_CONTENT_STATE") {
      flowInjectionAborted = false;
      // Release the submission lock too — an aborted in-flight injection can leave it
      // held, and then every new INJECT_PROMPT waits on it forever (queue stalls).
      flowSubmissionLockHeld = false;
      flowSubmissionLockQueue = [];
      if (window.__bananaInjectingIds) window.__bananaInjectingIds.clear();
      for (const inst of monitoringInstances.values()) {
        if (inst.checkInterval)
          clearInterval(inst.checkInterval);
      }
      monitoringInstances.clear();
      claimedImageUrls.clear();
      claimedMediaNames.clear();
      completedPromptIds.clear();
      lastAppliedSettingsSig = null;
      gfLibraryObjectMap = null;
      gfLibraryObjectNames = null;     // object-name session cache (scroll fallback)
      gfRefInventory = null;           // refresh API reference inventory next batch
      // referenceDisplayNameToFlowMedia.clear();
      if (globalMediaObserver) {
        globalMediaObserver.disconnect();
        globalMediaObserver = null;
      }
      console.log("[GenFlow] Banana: content state reset");
      sendResponse({ success: true });
      return false;
    }
    return false;
  });
  function isFlowHost() {
    return /labs\.google(\.com)?\/fx/i.test(window.location.href);
  }
  function findFlowErrorMessage() {
    const elements = document.querySelectorAll('[role="alert"], [role="status"], [class*="alert" i], [class*="error" i], [class*="toast" i], [class*="snackbar" i], [data-sonner-toast]');
    for (const el of elements) {
      if (el.textContent && el.offsetWidth > 0 && el.offsetHeight > 0) {
        const text = el.textContent.trim();
        const textLower = text.toLowerCase();
        
        const isExplicitError = textLower.includes("не удалось") || 
                                 textLower.includes("ошибка") || 
                                 textLower.includes("failed") || 
                                 textLower.includes("error") || 
                                 textLower.includes("could not") || 
                                 textLower.includes("unable");
        
        if (!isExplicitError) {
          if (textLower.includes("increasing") || 
              textLower.includes("upscaling") || 
              textLower.includes("улучшение") || 
              textLower.includes("разрешения") ||
              textLower.includes("progress") ||
              textLower.includes("loading") ||
              textLower.includes("generat")) {
            continue;
          }
        }
        
        const hasErrorClass = Array.from(el.classList || []).some(cls => 
          /error|fail|danger|warning|alert/i.test(cls)
        );
        
        const hasErrorIcon = el.querySelector('svg, [class*="icon" i], [class*="error" i]') !== null;
        const isSonnerError = el.hasAttribute('data-sonner-toast') && 
                              (el.getAttribute('data-type') === 'error' || el.getAttribute('data-type') === 'warning' || isExplicitError);
        
        // Only treat as an error if the TEXT actually contains an error marker,
        // or it is a genuine sonner error/warning toast. A bare role="alert" /
        // error-class / icon is NOT enough: Google Flow has a visually-hidden
        // <p role="alert"> live region holding the page title ("Google Flow: …"),
        // which previously produced a false "generation failed" → retry loop.
        void hasErrorClass; void hasErrorIcon;
        if (isExplicitError || isSonnerError) {
          let cleanText = text;
          if (cleanText.endsWith("Закрыть")) {
            cleanText = cleanText.substring(0, cleanText.length - "Закрыть".length).trim();
          } else if (cleanText.endsWith("Close")) {
            cleanText = cleanText.substring(0, cleanText.length - "Close".length).trim();
          }
          return cleanText;
        }
      }
    }
    
    const svgs = document.querySelectorAll('svg');
    for (const svg of svgs) {
      if (svg.offsetWidth > 0 && svg.offsetHeight > 0) {
        const container = svg.closest('[role="alert"], [class*="toast" i], [class*="snackbar" i], [data-sonner-toast], div');
        if (container && container.textContent) {
          const txt = container.textContent.trim();
          const txtLower = txt.toLowerCase();
          
          const isExplicitError = txtLower.includes("не удалось") || 
                                   txtLower.includes("ошибка") || 
                                   txtLower.includes("failed") || 
                                   txtLower.includes("error") || 
                                   txtLower.includes("could not") || 
                                   txtLower.includes("unable");
          
          if (!isExplicitError) {
            if (txtLower.includes("increasing") || txtLower.includes("upscaling") || txtLower.includes("progress")) {
              continue;
            }
          }
          
          const style = window.getComputedStyle(container);
          const bg = style.backgroundColor;
          if (bg && bg.startsWith("rgb")) {
            const rgb = bg.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = parseInt(rgb[0]);
              const g = parseInt(rgb[1]);
              const b = parseInt(rgb[2]);
              if ((r > 100 && r > g * 1.3 && r > b * 1.3) || isExplicitError) {
                let cleanText = txt;
                if (cleanText.endsWith("Закрыть")) {
                  cleanText = cleanText.substring(0, cleanText.length - "Закрыть".length).trim();
                } else if (cleanText.endsWith("Close")) {
                  cleanText = cleanText.substring(0, cleanText.length - "Close".length).trim();
                }
                return cleanText;
              }
            }
          }
        }
      }
    }
    return null;
  }
  function findCardByUrl(url) {
    if (!url) return null;
    const name = extractMediaNameFromUrl(url.split(",")[0]);
    if (!name) return null;
    const imgEl = document.querySelector(`img[src*="${name}"]`);
    if (imgEl) {
      return imgEl.closest('[class*="card"], [class*="tile"], [data-tile-id]') || imgEl.parentElement;
    }
    const videoEl = document.querySelector(`video[src*="${name}"], video source[src*="${name}"]`);
    if (videoEl) {
      return videoEl.closest('[class*="card"], [class*="tile"], [data-tile-id]') || videoEl.parentElement;
    }
    return null;
  }

  function findCardByPromptText(promptText) {
    if (!promptText) return null;
    const tiles = Array.from(document.querySelectorAll('[data-tile-id]')).filter(tile => {
      const parentTile = tile.parentElement?.closest('[data-tile-id]');
      return !parentTile;
    });
    
    const targetNorm = promptText.toLowerCase().replace(/\s+/g, " ").trim();
    
    for (const tile of tiles) {
      const imgEl = tile.querySelector('img');
      const videoEl = tile.querySelector('video');
      const tileText = (videoEl ? extractPromptTextFromCard(videoEl) : (imgEl ? extractPromptTextFromCard(imgEl) : null));
      if (tileText) {
        const tileNorm = tileText.toLowerCase().replace(/\s+/g, " ").trim();
        if (tileNorm.includes(targetNorm) || targetNorm.includes(tileNorm)) {
          return tile;
        }
      }
    }
    return null;
  }

  let _galleryLock = Promise.resolve();
  function acquireGallery() {
    let release;
    const prev = _galleryLock;
    _galleryLock = new Promise((r) => { release = r; });
    return prev.then(() => release);
  }
  async function locateCardForPrompt(prompt) {
    let card = findCardByUrl(prompt.resultUrl) || findCardByPromptText(prompt.text);
    if (card) return card;
    // Serialize the scroll-search: at high thread counts concurrent searches scroll the
    // same virtualized gallery to different spots and thrash, so none lands on its card.
    const releaseGallery = await acquireGallery();
    try {
    card = findCardByUrl(prompt.resultUrl) || findCardByPromptText(prompt.text);
    if (card) return card;

    // Scroll window and containers to top to reset scan
    window.scrollTo({ top: 0, behavior: 'instant' });
    const scrollContainers = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      const isScrollable = (
        style.overflow === 'auto' || style.overflow === 'scroll' || style.overflow === 'overlay' ||
        style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay'
      );
      return isScrollable && el.scrollHeight > el.clientHeight;
    });
    for (const container of scrollContainers) {
      container.scrollTop = 0;
    }
    await sleep(1200);
    
    card = findCardByUrl(prompt.resultUrl) || findCardByPromptText(prompt.text);
    if (card) return card;
    
    // Scroll down step-by-step
    const maxScrollAttempts = 12;
    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      let moved = false;
      const prevWindowScroll = window.scrollY;
      window.scrollBy(0, window.innerHeight || 600);
      if (Math.abs(window.scrollY - prevWindowScroll) > 5) {
        moved = true;
      }
      for (const container of scrollContainers) {
        const prevScrollTop = container.scrollTop;
        container.scrollTop += container.clientHeight || 400;
        if (Math.abs(container.scrollTop - prevScrollTop) > 5) {
          moved = true;
        }
      }
      await sleep(1000);
      card = findCardByUrl(prompt.resultUrl) || findCardByPromptText(prompt.text);
      if (card) return card;
      if (!moved) break;
    }
    return null;
    } finally {
      releaseGallery();
    }
  }
  function isVisible2(el) {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && el.offsetWidth > 0 && el.offsetHeight > 0;
  }
  function textContainsName(text, name) {
    const t = text.toLowerCase();
    const rawName = name.trim().toLowerCase();
    if (!rawName) return false;
    let stem = rawName;
    if (rawName.length >= 4 && (rawName.endsWith("а") || rawName.endsWith("я") || rawName.endsWith("a") || rawName.endsWith("y") || rawName.endsWith("о") || rawName.endsWith("е") || rawName.endsWith("o") || rawName.endsWith("e"))) {
      stem = rawName.slice(0, -1);
    }
    const idx = t.indexOf(stem);
    if (idx === -1) return false;
    const wordCharRegex = /[a-zа-яё0-9]/i;
    const charBefore = idx > 0 ? t[idx - 1] : "";
    if (charBefore && wordCharRegex.test(charBefore)) {
      return false;
    }
    let wordEnd = idx + stem.length;
    while (wordEnd < t.length && wordCharRegex.test(t[wordEnd])) {
      wordEnd++;
    }
    const fullWord = t.substring(idx, wordEnd);
    if (fullWord.length > rawName.length + 3) {
      return false;
    }
    return true;
  }
  window.textContainsName = textContainsName;
  function findFlowPromptTextarea() {
    for (const sel of FLOW.promptTextarea) {
      const el = document.querySelector(sel);
      if (el && el instanceof HTMLTextAreaElement && el.offsetParent !== null) {
        return el;
      }
    }
    return null;
  }
  function isInsideResultCard(el) {
    let parent = el.parentElement;
    let depth = 0;
    while (parent && depth < 8) {
      const c = (parent.className || "") + " " + (parent.getAttribute("data-testid") || "");
      if (/\b(card|result|output|media|thumbnail|preview)\b/i.test(c) || /result|card|output/i.test(parent.tagName)) {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }
    return false;
  }
  function findPromptInput() {
    const textarea = findFlowPromptTextarea();
    if (textarea)
      return textarea;
    const createBtn = findFlowCreateButton();
    const createContainer = createBtn && !isInsideResultCard(createBtn) ? findCommonPromptContainer(createBtn) : null;
    const contenteditables = document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]');
    const candidates = [];
    for (const el of contenteditables) {
      if (!isVisible2(el))
        continue;
      const htmlEl = el;
      const className = htmlEl.className || "";
      const isResultCard = isInsideResultCard(htmlEl);
      const placeholderLike = ((htmlEl.getAttribute("data-placeholder") || "") + (htmlEl.textContent || "")).toLowerCase();
      const isEditPlaceholder = placeholderLike.includes("\u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C") || placeholderLike.includes("change");
      if (!className.includes("sc-f60f777e-0") && !className.includes("sc-c70e41ad-5") && !className.includes("dmGLuZ") && !className.includes("OPdYX") && !(htmlEl.offsetWidth > 300 && htmlEl.offsetHeight > 15))
        continue;
      let score = 0;
      if (!isResultCard)
        score += 10;
      if (createContainer && createContainer.contains(htmlEl))
        score += 5;
      if (isEditPlaceholder)
        score -= 20;
      candidates.push({ el: htmlEl, score });
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      console.log("[GenFlow] Banana: Found contenteditable prompt input (score:", candidates[0].score, ")");
      return candidates[0].el;
    }
    const textboxes = document.querySelectorAll('[role="textbox"]');
    for (const tb of textboxes) {
      if (!isVisible2(tb))
        continue;
      const htmlEl = tb;
      const isResultCard = isInsideResultCard(htmlEl);
      if (isResultCard)
        continue;
      const className = htmlEl.className || "";
      if (className.includes("sc-f60f777e-0") || className.includes("sc-c70e41ad-5") || htmlEl.offsetWidth > 300) {
        console.log("[GenFlow] Banana: Found textbox prompt input:", className);
        return htmlEl;
      }
    }
    return null;
  }
  function findCommonPromptContainer(createBtn) {
    let el = createBtn;
    for (let i = 0; i < 6 && el; i++) {
      el = el.parentElement;
      if (el && (el.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]') || el.querySelector("textarea"))) {
        return el;
      }
    }
    return null;
  }
  function getSlateEditor(el) {
    if (!el) return null;
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    if (!fiberKey) return null;
    let curr = el[fiberKey];
    while (curr) {
      if (curr.pendingProps && curr.pendingProps.editor) {
        return curr.pendingProps.editor;
      }
      curr = curr.return;
    }
    return null;
  }
  async function fillPromptByPaste(input, text) {
    input.click();
    input.focus();
    await sleep(150);
    if (input.tagName === "TEXTAREA") {
      input.select();
      document.execCommand("delete", false);
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(input, text);
      } else {
        input.value = text;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: "WRITE_SLATE_PROMPT",
          payload: { text: text }
        }, (res) => {
          resolve(res);
        });
      });
    }
  }
  async function waitUntil(condition, options = {}) {
    const { pollIntervalMs = 30, maxWaitMs = 2e3 } = options;
    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      if (condition())
        return;
      await sleep(pollIntervalMs);
    }
    throw new Error(`waitUntil timed out after ${maxWaitMs}ms`);
  }
  function findFlowCreateButton() {
    const isMain = (el) => !isInsideResultCard(el);
    for (const sel of FLOW.createButton) {
      const all = document.querySelectorAll(sel);
      for (const el of all) {
        if (el instanceof HTMLElement && !el.disabled && isMain(el)) {
          if (hasArrowForward(el) && !el.getAttribute("aria-haspopup"))
            return el;
        }
      }
    }
    const buttons = document.querySelectorAll("button");
    for (const btn2 of buttons) {
      if (btn2.disabled || !isVisible2(btn2))
        continue;
      if (btn2.getAttribute("aria-haspopup") === "dialog")
        continue;
      if (isInsideResultCard(btn2))
        continue;
      const text = (btn2.textContent || "").trim();
      
      const hasArrowText = text.includes("arrow_forward") || btn2.querySelector("i")?.textContent?.trim() === "arrow_forward" || btn2.querySelector("span")?.textContent?.trim() === "arrow_forward";
      if (hasArrowText) {
        console.log("[GenFlow] Banana: Found Create button (arrow_forward icon/text):", text);
        return btn2;
      }
    }
    
    // Check by type="submit" which is highly language-independent
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn && !submitBtn.disabled && isVisible2(submitBtn) && isMain(submitBtn)) {
      return submitBtn;
    }
    
    const overlay = document.querySelector('button.gdArnN.gdXWm div[data-type="button-overlay"]');
    const btn = overlay?.closest("button");
    if (btn && !btn.disabled && hasArrowForward(btn) && isMain(btn)) {
      return btn;
    }
    return null;
  }
  function hasArrowForward(el) {
    const html = el.innerHTML || "";
    const text = (el.textContent || "").trim();
    return html.includes("arrow_forward") || text.includes("arrow_forward");
  }
  function findFlowModeMenuTrigger() {
    // 1. Structural lookup: find button with aria-haspopup inside the prompt container area
    const input = findPromptInput();
    if (input) {
      let parent = input.parentElement;
      for (let depth = 0; depth < 5 && parent; depth++) {
        const buttons = parent.querySelectorAll('button[aria-haspopup]');
        for (const btn of buttons) {
          if (isVisible2(btn)) {
            const text = (btn.textContent || "").toLowerCase();
            const hasChevron = btn.querySelector('svg') || text.includes('arrow') || text.includes('chevron') || btn.querySelector('[class*="chevron"]') || btn.querySelector('[class*="arrow"]');
            if (hasChevron || /nano|banana|imagen|veo|video|видео|фото|image|text|frame/i.test(text)) {
              console.log("[GenFlow] Banana: Found mode dropdown trigger structurally:", btn);
              return btn;
            }
          }
        }
        parent = parent.parentElement;
      }
    }
    
    // 2. Fallback: traditional query by model names
    const buttons = document.querySelectorAll('button[aria-haspopup="menu"]');
    for (const btn of buttons) {
      if (!isVisible2(btn)) continue;
      const text = (btn.textContent || "").trim().toLowerCase();
      // Settings trigger button contains model name and configuration (crop or xCount)
      const hasModel = /nano banana|banana|imagen|veo/i.test(text);
      const hasConfig = /crop|x\d|\dx/i.test(text);
      if (hasModel && hasConfig) {
        return btn;
      }
    }
    return null;
  }
  function waitForElement(selector, timeout) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }
      const obs = new MutationObserver(() => {
        const el2 = document.querySelector(selector);
        if (el2) {
          obs.disconnect();
          resolve(el2);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }
  function findTabByIconAndText(iconName, textKeywords) {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      const text = (tab.textContent || "").trim().toLowerCase();
      if (text.includes(iconName.toLowerCase())) {
        return tab;
      }
      if (textKeywords && textKeywords.some((kw) => text.includes(kw.toLowerCase()))) {
        return tab;
      }
    }
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = (btn.textContent || "").trim().toLowerCase();
      if (text.includes(iconName.toLowerCase())) {
        return btn;
      }
      if (textKeywords && textKeywords.some((kw) => text.includes(kw.toLowerCase()))) {
        return btn;
      }
    }
    return null;
  }

  async function selectImageMode() {
    console.log("[GenFlow] Banana: Selecting image generation mode...");
    let dropdownBtn = findFlowModeMenuTrigger();
    if (!dropdownBtn) {
      const allButtons = document.querySelectorAll("button");
      for (const btn of allButtons) {
        const text = (btn.textContent || "").trim();
        const textLower = text.toLowerCase();
        const isCreateOrSubmitBtn = textLower.includes("arrow_forward") || textLower.includes("arrow_back") || textLower.includes("назад") || textLower.includes("back");
        if (isCreateOrSubmitBtn) continue;

        const hasArrow = btn.querySelector("svg") || text.includes("arrow");
        const hasModeText = /видео|video|изображ|image|создат|create|動画|画像|作成/i.test(text);
        if (hasArrow && hasModeText && isVisible2(btn)) {
          dropdownBtn = btn;
          console.log(`[GenFlow] Banana: Found dropdown button (fallback): "${text.substring(0, 30)}"`);
          break;
        }
      }
    } else {
      console.log("[GenFlow] Banana: Found mode menu trigger (className match)");
    }
    if (!dropdownBtn) {
      for (const sel of FLOW.modeDropdownSelectors) {
        const el = document.querySelector(sel);
        if (el && isVisible2(el)) {
          dropdownBtn = el;
          break;
        }
      }
    }
    if (!dropdownBtn) {
      console.log("[GenFlow] Banana: Mode dropdown not found");
      return;
    }

    const isMenuOpen = () => {
      const menu = document.querySelector('[role="menu"][data-state="open"]');
      return !!menu && isVisible2(menu);
    };

    if (!isMenuOpen()) {
      console.log("[GenFlow] Banana: Opening mode dropdown...");
      dropdownBtn.scrollIntoView({ block: "center", behavior: "auto" });
      await sleep(100);
      nativeClick(dropdownBtn);
      await sleep(500);
    }

    if (!isMenuOpen()) {
      console.log("[GenFlow] Banana: Failed to open settings/mode dropdown");
      return;
    }

    // Select "Image" tab in first group if not active
    const imageTab = findTabByIconAndText("image", ["изображ", "image", "画像"]);
    if (imageTab) {
      if (imageTab.getAttribute("aria-selected") !== "true") {
        console.log("[GenFlow] Banana: Selecting Image tab...");
        nativeClick(imageTab);
        await sleep(500);
      } else {
        console.log("[GenFlow] Banana: Image tab is already active");
      }
    } else {
      console.log("[GenFlow] Banana: WARNING: Image tab not found in dropdown menu");
    }
  }
  function findFlowImageModeMenuTrigger() {
    const buttons = document.querySelectorAll('button[aria-haspopup="menu"]');
    for (const btn of buttons) {
      if (!isVisible2(btn)) continue;
      const text = (btn.textContent || "").trim().toLowerCase();
      // Settings trigger button contains model name and configuration (crop or xCount)
      const hasModel = /nano banana|banana|imagen/i.test(text);
      const hasConfig = /crop|x\d|\dx/i.test(text);
      if (hasModel && hasConfig) {
        return btn;
      }
    }
    return null;
  }
  function getOpenFlowImageMenu() {
    const menus = document.querySelectorAll('[role="menu"][data-state="open"]');
    for (const menu of menus) {
      const tablists = menu.querySelectorAll('[role="tablist"]');
      if (tablists.length >= 2 && isVisible2(menu)) {
        return menu;
      }
    }
    return null;
  }
  async function applyImageSettings(settings) {
    const trigger = findFlowImageModeMenuTrigger();
    if (!trigger) {
      console.log("[GenFlow] Banana: Image mode menu trigger not found, skipping settings");
      return;
    }
    const wasClosed = trigger.getAttribute("data-state") === "closed";
    if (wasClosed) {
      console.log("[GenFlow] Banana: Opening image mode menu to apply settings...");
      nativeClick(trigger);
      await sleep(500);
    }
    let menu = null;
    let aspectTab = null;
    let countTab = null;
    let aspectIdPart = "LANDSCAPE";
    if (settings.aspectRatio === "9:16") {
      aspectIdPart = "PORTRAIT";
    } else if (settings.aspectRatio === "3:4") {
      aspectIdPart = "PORTRAIT_3_4";
    } else if (settings.aspectRatio === "1:1") {
      aspectIdPart = "SQUARE";
    } else if (settings.aspectRatio === "4:3") {
      aspectIdPart = "LANDSCAPE_4_3";
    }
    const imagesPerPrompt = Math.min(4, Math.max(1, settings.imagesPerPrompt ?? 1));

    const pollDeadline = Date.now() + 2000;
    while (Date.now() < pollDeadline) {
      menu = getOpenFlowImageMenu();
      if (menu) {
        aspectTab = menu.querySelector(`[role="tab"][id$="-trigger-${aspectIdPart}"]`) || menu.querySelector(`[role="tab"][id*="${aspectIdPart}"]`);
        countTab = menu.querySelector(`[role="tab"][id$="-trigger-${imagesPerPrompt}"]`) || menu.querySelector(`[role="tab"][id*="-trigger-${imagesPerPrompt}"]`);
        if (aspectTab && countTab) {
          break;
        }
      }
      await sleep(100);
    }

    if (!menu) {
      console.log("[GenFlow] Banana: Image mode menu not open, skipping settings");
      if (wasClosed)
        nativeClick(trigger);
      return;
    }
    if (!aspectTab || !countTab) {
      console.log("[GenFlow] Banana: Aspect or count tabs not rendered, skipping settings");
      if (wasClosed)
        nativeClick(trigger);
      return;
    }
    const imageTab = menu.querySelector(`[role="tab"][id*="IMAGE"]`);
    if (imageTab && imageTab.getAttribute("aria-selected") !== "true") {
      console.log("[GenFlow] Banana: Selecting Image tab");
      nativeClick(imageTab);
      await sleep(300);
    } else if (imageTab) {
      console.log("[GenFlow] Banana: Image tab already selected");
    }
    if (aspectTab.getAttribute("aria-selected") !== "true") {
      console.log(`[GenFlow] Banana: Selecting ${aspectIdPart}`);
      nativeClick(aspectTab);
      await sleep(300);
    } else {
      console.log(`[GenFlow] Banana: ${aspectIdPart} already selected`);
    }
    if (countTab.getAttribute("aria-selected") !== "true") {
      console.log(`[GenFlow] Banana: Selecting x${imagesPerPrompt}`);
      nativeClick(countTab);
      await sleep(300);
    } else {
      console.log(`[GenFlow] Banana: x${imagesPerPrompt} already selected`);
    }
    const modelLabel = IMAGE_MODEL_LABELS[settings.imageModel ?? "nano-banana-pro"] ?? settings.imageModel ?? "Nano Banana Pro";
    // EXACT model match, not substring. Flow added "Nano Banana 2 Lite", and
    // "Nano Banana 2 Lite".includes("Nano Banana 2") === true — the old substring check
    // wrongly treated Lite as "already Nano Banana 2" (and could pick Lite in the submenu),
    // silently generating on Lite. Reject a longer variant (Lite/Pro/Max/…) right after the label.
    const _isModel = (text, label) => {
      const t = (text || "").replace(/\s+/g, " ").trim().toLowerCase();
      const l = (label || "").replace(/\s+/g, " ").trim().toLowerCase();
      const i = t.indexOf(l);
      if (i < 0) return false;
      // Reject a longer variant (Lite/Pro/…) right after the label. NO \b word boundary:
      // Flow's trigger text glues the icon to the name ("Nano Banana 2 Litearrow_drop_down"),
      // so a \b after "lite" would never fire and Lite would pass as "Nano Banana 2".
      return !/^\s*(lite|pro|max|ultra)/.test(t.slice(i + l.length));
    };
    const modelButton = Array.from(menu.querySelectorAll('button[aria-haspopup="menu"]')).find((b) => {
      const t = (b.textContent || "").trim();
      return /nano banana|imagen/i.test(t);
    });
    if (modelButton) {
      const currentModelText = (modelButton.textContent || "").trim();
      const alreadyMatch = _isModel(currentModelText, modelLabel);
      if (!alreadyMatch) {
        nativeClick(modelButton);
        await sleep(300);
        const submenus = document.querySelectorAll('[role="menu"][data-state="open"]');
        for (const sub of submenus) {
          if (sub === menu)
            continue;
          const items = sub.querySelectorAll('[role="menuitem"]');
          for (const item of items) {
            const text = (item.textContent || "").trim();
            if (_isModel(text, modelLabel)) {
              console.log("[GenFlow] Banana: Selecting model:", text);
              nativeClick(item);
              await sleep(300);
              break;
            }
          }
          break;
        }
      } else {
        console.log("[GenFlow] Banana: Model already set:", currentModelText);
      }
    }
    if (wasClosed) {
      nativeClick(trigger);
      await sleep(300);
    }
  }
  function closeFlowDialogIfOpen() {
    const dialog = document.querySelector('[role="dialog"], .PopoverContent[data-state="open"]');
    if (!dialog)
      return;
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape", keyCode: 27, bubbles: true }));
  }
  function isOnFlowProjectPage() {
    return /\/project\/[a-f0-9-]+/i.test(window.location.pathname);
  }
  async function waitForPageReady() {
    for (let i = 0; i < 60; i++) {
      const input = findPromptInput();
      if (input) {
        await sleep(100);
        return;
      }
      await sleep(100);
    }
  }
  async function ensureFlowProjectPage() {
    if (isOnFlowProjectPage()) {
      console.log("[GenFlow] Banana: Already on project page, checking Agentic mode...");
      await disableAgenticModeIfActive();
      await waitForPageReady();
      return;
    }
    console.log("[GenFlow] Banana: Not on project page, navigating...");
    await sleep(2e3);
    const existingProjects = document.querySelectorAll('a[href*="/project/"], [href*="/project/"]');
    if (existingProjects.length > 0) {
      console.log("[GenFlow] Banana: Found existing project, opening...");
      nativeClick(existingProjects[0]);
      for (let i = 0; i < 30; i++) {
        await sleep(500);
        if (isOnFlowProjectPage())
          break;
      }
      if (isOnFlowProjectPage()) {
        await disableAgenticModeIfActive();
        await waitForPageReady();
        return;
      }
    }
    let createProjectBtn = null;
    for (let i = 0; i < 40; i++) {
      createProjectBtn = findCreateProjectButton();
      if (createProjectBtn)
        break;
      await sleep(500);
    }
    if (!createProjectBtn) {
      throw new Error("\u041A\u043D\u043E\u043F\u043A\u0430 \xAB\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 https://labs.google/fx/ru/tools/flow \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0435\u0451 \u0432\u0440\u0443\u0447\u043D\u0443\u044E.");
    }
    console.log("[GenFlow] Banana: Clicking Create project button:", createProjectBtn.textContent.trim());
    nativeClick(createProjectBtn);
    for (let i = 0; i < 50; i++) {
      await sleep(500);
      if (isOnFlowProjectPage())
        break;
    }
    if (!isOnFlowProjectPage()) {
      throw new Error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u043F\u0440\u043E\u0435\u043A\u0442\u0430.");
    }
    await disableAgenticModeIfActive();
    await waitForPageReady();
  }
  async function closeAgentSessionPanelIfOpen() {
    const closeBtn = (() => {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        if (!isVisible2(btn)) continue;
        const hasCloseIcon = btn.textContent.includes("close") || btn.innerHTML.includes("close");
        if (hasCloseIcon) {
          const parent = btn.parentElement;
          if (parent) {
            const hasEditSquareSibling = parent.querySelector('button') && parent.innerHTML.includes("edit_square");
            if (hasEditSquareSibling) {
              return btn;
            }
          }
        }
      }
      return null;
    })();
    if (closeBtn) {
      console.log("[GenFlow] Found open Agent session side panel, closing it...");
      closeBtn.click();
      await sleep(1000);
      for (let i = 0; i < 20; i++) {
        if (!document.body.contains(closeBtn) || !isVisible2(closeBtn)) {
          console.log("[GenFlow] Agent session panel successfully closed.");
          break;
        }
        await sleep(100);
      }
    } else {
      console.log("[GenFlow] Agent session panel is not open.");
    }
  }
      async function disableAgenticModeIfActive() {
    await sleep(1500);
    await closeAgentSessionPanelIfOpen();
    const buttons = document.querySelectorAll("button");
    const agentTerms = ["agent", "агент", "エージェント", "agente", "智能体", "代理", "에이전트"];
    let agentBtn = null;
    
    // 1. Strict text lookup (matching agentTerms AND having aria-pressed/checked/toggle-class)
    for (const btn of buttons) {
      if (!isVisible2(btn)) continue;
      const text = (btn.textContent || "").trim().toLowerCase();
      if (agentTerms.some(term => text.includes(term))) {
        const hasAria = btn.getAttribute("aria-pressed") !== null || btn.getAttribute("aria-checked") !== null;
        const hasToggleClass = btn.className.includes("sc-59223abb") || btn.className.includes("dmZGYv") || btn.className.includes("bdRbOx");
        if (hasAria || hasToggleClass) {
          agentBtn = btn;
          break;
        }
      }
    }
    
    // 2. Fallback text lookup
    if (!agentBtn) {
      for (const btn of buttons) {
        if (!isVisible2(btn)) continue;
        const text = (btn.textContent || "").trim().toLowerCase();
        if (agentTerms.some(term => text.includes(term)) && !text.includes("spark") && !text.includes("tune")) {
          agentBtn = btn;
          break;
        }
      }
    }
    
    // 3. Structural lookup: find button with aria-pressed near prompt input
    if (!agentBtn) {
      const input = findPromptInput();
      if (input) {
        let parent = input.parentElement;
        for (let depth = 0; depth < 5 && parent; depth++) {
          const btns = parent.querySelectorAll('button[aria-pressed]');
          for (const btn of btns) {
            if (isVisible2(btn)) {
              agentBtn = btn;
              break;
            }
          }
          if (agentBtn) break;
          parent = parent.parentElement;
        }
      }
    }
    
    // 4. Fallback: style/class match for known Agent component hashes
    if (!agentBtn) {
      for (const btn of buttons) {
        if (!isVisible2(btn)) continue;
        const ariaPressed = btn.getAttribute("aria-pressed");
        if (ariaPressed !== null) {
          const className = btn.className || "";
          if (className.includes("59223abb") || className.includes("bdRbOx") || className.includes("dmZGYv")) {
            agentBtn = btn;
            break;
          }
        }
      }
    }
    
    if (agentBtn) {
      const state = agentBtn.getAttribute("aria-checked") || agentBtn.getAttribute("aria-pressed") || "";
      const isActive = state === "true" || agentBtn.className.includes("bdRbOx");
      console.log(`[GenFlow] Found Agentic mode button, state attribute="${state}", active check=${isActive}`);
      if (isActive || state === "true") {
        console.log("[GenFlow] Agentic mode is active, disabling it...");
        agentBtn.click();
        // The toggle's aria state can lag the click — poll up to ~3s instead of
        // throwing after a fixed 600ms (which aborted the whole injection while
        // the mode was actually about to turn off).
        const getState = () => agentBtn.getAttribute("aria-checked") || agentBtn.getAttribute("aria-pressed") || "";
        let disabled = false;
        for (let i = 0; i < 20; i++) {
          await sleep(150);
          if (getState() !== "true") { disabled = true; break; }
          if (i === 3) {
            console.log("[GenFlow] direct click() didn't disable Agent yet, trying nativeClick fallback...");
            nativeClick(agentBtn);
          }
        }
        if (!disabled) {
          throw new Error("[GenFlow] CRITICAL: Could not disable Agentic mode. Aborting.");
        }
        console.log("[GenFlow] Agentic mode disabled.");
      } else {
        console.log("[GenFlow] Agentic mode is already disabled.");
      }
    } else {
      console.log("[GenFlow] Agent button not found.");
    }
  }
  var REFERENCE_VIRTUOSO_LIST_SEL = 'div[data-testid="virtuoso-item-list"]';
  function normalizeReferenceDisplayKey(name) {
    return name.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function findAdd2ReferenceButton() {
    const candidates = document.querySelectorAll('button[aria-haspopup="dialog"]');
    for (const btn of candidates) {
      const icon = btn.querySelector("i");
      if (!icon)
        continue;
      const iconText = (icon.textContent || "").trim();
      if (iconText !== "add_2")
        continue;
      const span = btn.querySelector("span");
      const spanText = (span?.textContent || "").trim();
      if (spanText !== "Create" && spanText !== "\u0421\u043E\u0437\u0434\u0430\u0442\u044C")
        continue;
      if (!isVisible2(btn))
        continue;
      return btn;
    }
    const allBtns = document.querySelectorAll("button");
    for (const btn of allBtns) {
      const icon = btn.querySelector("i");
      if (!icon)
        continue;
      if ((icon.textContent || "").trim() !== "add_2")
        continue;
      if (!isVisible2(btn))
        continue;
      return btn;
    }
    return null;
  }
  async function openReferenceImagePickerPopup(tabIcon = "drive_folder_upload") {
    let add2Btn = findAdd2ReferenceButton();
    if (!add2Btn) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && !add2Btn) {
        await sleep(100);
        add2Btn = findAdd2ReferenceButton();
      }
    }
    if (!add2Btn) {
      console.log("[GenFlow] Banana: add_2 button not found");
      return false;
    }
    nativeClick(add2Btn);
    console.log("[GenFlow] Banana: Opened reference image picker (add_2)");
    await sleep(1200);
    // Flow's resource picker now has tabs (Все/Изображения/Видео/Голоса/Персонажи/Загрузки) and
    // opens on the LAST-USED one. If that's "Voices" we'd read the voices virtuoso-list and attach
    // nothing (random result — the reported bug). Force the IMAGES tab by its Material icon "image"
    // (locale-proof; the label text is localized across 18 languages, the icon name isn't).
    try {
      const _dlg = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
      if (_dlg) {
        for (const _tb of _dlg.querySelectorAll('button[role="tab"]')) {
          const _ic = _tb.querySelector("i");
          if (_ic && (_ic.textContent || "").trim() === tabIcon) {
            if (_tb.getAttribute("aria-selected") !== "true") {
              nativeClick(_tb);
              await sleep(400);
            }
            break;
          }
        }
      }
    } catch (e) {
      console.warn("[GenFlow] Banana: picker image-tab select failed", e);
    }
    return true;
  }
  function findReferenceVirtuosoList() {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"][data-state="open"]'));
    for (const d of dialogs) {
      if (!isVisible2(d))
        continue;
      const l = d.querySelector(REFERENCE_VIRTUOSO_LIST_SEL);
      if (l)
        return l;
    }
    const lists = querySelectorAllIncludingShadowDom(document, REFERENCE_VIRTUOSO_LIST_SEL);
    for (const l of lists) {
      if (isVisible2(l))
        return l;
    }
    return null;
  }
  async function clickReferenceVirtuosoRowSafe(row) {
    // The selectable element is div[role="option"][aria-selected]; clicking the
    // right node toggles aria-selected, which is what enables "Добавить в запрос".
    const option = (row.closest && row.closest('[role="option"]')) || (row.querySelector && row.querySelector('[role="option"]')) || row;
    for (let attempt = 0; attempt < 3; attempt++) {
      nativeClick(option);
      await sleep(80);
      try { option.click(); } catch (_) {}
      await sleep(150);
      if (option.getAttribute && option.getAttribute("aria-selected") === "true")
        break;
    }
    // Selecting only toggles aria-selected; the reference is added to the prompt
    // only after clicking the "Добавить в запрос" confirm button.
    const dlg = (option.closest && option.closest('[role="dialog"]')) || document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
    if (dlg) {
      const cbtn = Array.from(dlg.querySelectorAll("button")).find((b) => {
        const t = (b.textContent || "").toLowerCase();
        const dis = b.disabled || b.getAttribute("aria-disabled") === "true";
        return !dis && (t.includes("добавить в запрос") || t.includes("add to prompt"));
      });
      if (cbtn) {
        nativeClick(cbtn);
        await sleep(80);
        try { cbtn.click(); } catch (_) {}
        await sleep(700);
      }
    }
  }
  function extractRefMediaNameFromVirtuosoItem(item) {
    const img = item.querySelector("img");
    if (!img)
      return null;
    const src = img.src || img.getAttribute("src") || "";
    return extractMediaNameFromUrl(src);
  }
  function segmentIsReferenceDisplayLabel(segment, displayName) {
    const seg = normalizeReferenceDisplayKey(segment);
    const name = normalizeReferenceDisplayKey(displayName);
    if (!name || !seg)
      return false;
    if (seg === name)
      return true;
    const m = /^(.+?)\.(png|jpg|jpeg|webp|gif)$/i.exec(seg);
    if (m) {
      const base = normalizeReferenceDisplayKey(m[1]);
      return base === name;
    }
    return false;
  }
  function collectVirtuosoRowLabelCandidates(item) {
    const out = [];
    const img = item.querySelector("img");
    for (const attr of ["alt", "title"]) {
      const v = img?.getAttribute(attr)?.trim();
      if (v)
        out.push(v);
    }
    const raw = (item.textContent || "").normalize("NFC");
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    out.push(...lines);
    for (const line of lines) {
      const byDoubleSpace = line.split(/\s{2,}/u).map((p) => p.trim()).filter(Boolean);
      out.push(...byDoubleSpace);
      const pieces = line.split(/\s*[·•|｜]\s*/u).map((p) => p.trim()).filter(Boolean);
      out.push(...pieces);
    }
    return out;
  }
  function virtuosoItemLabelMatchesDisplayName(item, displayName) {
    if (!displayName.trim())
      return false;
    for (const seg of collectVirtuosoRowLabelCandidates(item)) {
      if (segmentIsReferenceDisplayLabel(seg, displayName))
        return true;
    }
    return false;
  }
  async function trySelectExistingReferenceInPopup(opts, maxWaitMs = 15e3) {
    const deadline = Date.now() + maxWaitMs;
    const wantName = opts.displayName?.trim();
    const cached = opts.cachedMediaName?.trim() || null;
    const cachedFile = opts.cachedFilename?.trim() || null;
    let lastScrollTop = -1, stall = 0;
    while (Date.now() < deadline) {
      const list = findReferenceVirtuosoList();
      if (!list) {
        await sleep(400);
        continue;
      }
      const scrollContainer = document.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.closest('[data-testid="virtuoso-scroller"]')) || (list && list.parentElement) || list;
      const items = Array.from(list.querySelectorAll('[role="option"]'));
      if (items.length > 0) {
        if (items[0].getAttribute("data-index") !== null) {
          items.sort(
            (a, b) => parseInt(a.getAttribute("data-index") || "0", 10) - parseInt(b.getAttribute("data-index") || "0", 10)
          );
        }
        if (cachedFile) {
          for (const item of items) {
            if ((item.textContent || "").includes(cachedFile)) {
              const refName = extractRefMediaNameFromVirtuosoItem(item);
              console.log("[GenFlow] Banana: Picker — reused row by cached filename:", cachedFile);
              await clickReferenceVirtuosoRowSafe(item);
              return { selected: true, refMediaName: refName || cachedFile };
            }
          }
        }
        if (cached) {
          for (const item of items) {
            const img = item.querySelector("img");
            if (!img)
              continue;
            const src = img.src || img.getAttribute("src") || "";
            if (src.includes(cached)) {
              const refName = extractRefMediaNameFromVirtuosoItem(item);
              console.log("[GenFlow] Banana: Picker \u2014 reused row by cached media id:", cached);
              await clickReferenceVirtuosoRowSafe(item);
              return { selected: true, refMediaName: refName || cached };
            }
          }
        }
        if (wantName) {
          for (const item of items) {
            if (virtuosoItemLabelMatchesDisplayName(item, wantName)) {
              const refName = extractRefMediaNameFromVirtuosoItem(item);
              console.log("[GenFlow] Banana: Picker \u2014 matched existing row by exact label / filename:", wantName);
              await clickReferenceVirtuosoRowSafe(item);
              return { selected: true, refMediaName: refName };
            }
          }
        }
      }
      if (scrollContainer && items.length > 0) {
        const currentScroll = scrollContainer.scrollTop;
        if (lastScrollTop !== -1 && Math.abs(currentScroll - lastScrollTop) < 5) {
          stall++;
          if (stall > 4) {
            console.log("[GenFlow] Banana: Picker \u2014 reached bottom of reference library list");
            break;
          }
        } else {
          stall = 0;
        }
        lastScrollTop = currentScroll;
        scrollContainer.scrollTop += scrollContainer.clientHeight || 400;
        await sleep(350);
      } else {
        await sleep(300);
      }
    }
    return { selected: false, refMediaName: null };
  }
  async function uploadNewReferenceFileAndSelectInPopup(imageDataUrl, uniqueSuffix = "0", displayName = "") {
    console.log("[GenFlow] Banana: Reference mode \u2014 uploading new reference file...");
    const fileInput = document.querySelector('input[type="file"][accept*=".png"]') || document.querySelector('input[type="file"][accept*="image"]') || document.querySelector('input[type="file"]');
    if (!fileInput) {
      console.log("[GenFlow] Banana: No global file input found");
      return { ok: false, refMediaName: null };
    }
    let uploadedFilename = null;
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const safeName = (displayName || "").normalize("NFC").trim().replace(/[\\/:*?"<>|]+/g, "_").slice(0, 40);
      // Must start with "ref_" so selectReferenceImageInPopup's "scroll to top to
      // find the just-uploaded file" path runs. Timestamp keeps it unique so the
      // selection can never pick an older same-label file in the library.
      uploadedFilename = `ref_${safeName ? safeName + "_" : ""}${Date.now()}_${uniqueSuffix}.png`;
      const file = new File([blob], uploadedFilename, { type: "image/png" });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log(`[GenFlow] Banana: Reference image assigned to file input (${uploadedFilename})`);
    } catch (err) {
      console.error("[GenFlow] Banana: File upload failed:", err);
      return { ok: false, refMediaName: null };
    }
    await sleep(250);
    const opened = await openReferenceImagePickerPopup();
    if (!opened) {
      return { ok: false, refMediaName: null };
    }
    const result = await selectReferenceImageInPopup(uploadedFilename);
    if (result.selected) {
      console.log(`[GenFlow] Banana: New reference selected (mediaName: ${result.refMediaName})`);
    } else {
      console.log("[GenFlow] Banana: Could not confirm new reference selection");
    }
    await sleep(result.selected ? 500 : 600);
    return { ok: result.selected, refMediaName: result.refMediaName, filename: uploadedFilename };
  }
  function hashReferenceImage(dataUrl) {
    const s = dataUrl || "";
    // Cheap, stable content hash (FNV-1a over the full data URL string).
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "img_" + (h >>> 0).toString(36) + "_" + s.length;
  }
  async function attachReferenceImageForBanana(imageDataUrl, uniqueSuffix = "0", displayName) {
    // Dedup by image CONTENT, not by the label: the same photo is reused from
    // the library, but a different photo with the same label ("лена") is a
    // cache miss and gets uploaded fresh — so we never attach the wrong photo.
    const key = hashReferenceImage(imageDataUrl);
    // Cache maps content-hash -> the library FILENAME we uploaded it under.
    // The filename is the row's label, so reuse can find it by name at any
    // scroll position (a just-uploaded row's media-id is unreliable).
    const cachedFilename = key ? referenceDisplayNameToFlowMedia.get(key) ?? null : null;
    if (cachedFilename) {
      const opened = await openReferenceImagePickerPopup();
      if (opened) {
        const reused = await trySelectExistingReferenceInPopup({
          displayName: displayName || "",
          cachedFilename
        });
        if (reused.selected) {
          console.log("[GenFlow] Banana: Reference attached from library without new upload");
          await sleep(300);
          return { ok: true, refMediaName: reused.refMediaName, reused: true };
        }
        closeFlowDialogIfOpen();
        await sleep(300);
      }
    }
    // 1. Try to reuse from the pre-scanned library map by matching displayName!
    const normName = displayName ? gfNormName(displayName) : "";
    if (normName && gfLibraryObjectMap && gfLibraryObjectMap.has(normName)) {
      const cachedId = gfLibraryObjectMap.get(normName);
      console.log(`[GenFlow] Banana: Object "${displayName}" found in pre-scanned library (mediaId: ${cachedId}) — attaching directly`);
      const opened = await openReferenceImagePickerPopup();
      if (opened) {
        const reused = await trySelectExistingReferenceInPopup({
          displayName: displayName,
          cachedMediaName: cachedId
        });
        if (reused.selected) {
          if (reused.refMediaName && key) {
            referenceDisplayNameToFlowMedia.set(key, reused.refMediaName);
            saveReferenceDisplayNameToFlowMedia();
          }
          await sleep(300);
          return { ok: true, refMediaName: reused.refMediaName, reused: true };
        }
        closeFlowDialogIfOpen();
        await sleep(300);
      }
    }
    const uploaded = await uploadNewReferenceFileAndSelectInPopup(imageDataUrl, uniqueSuffix, displayName);
    if (uploaded.ok && uploaded.filename && key) {
      referenceDisplayNameToFlowMedia.set(key, uploaded.filename);
      saveReferenceDisplayNameToFlowMedia();
      if (uploaded.refMediaName && normName) {
        gfLibraryObjectMap.set(normName, uploaded.refMediaName);
      }
    }
    return uploaded;
  }
  function gfCharacterOptionName(optionEl) {
    const img = optionEl.querySelector("img");
    const alt = img ? (img.getAttribute("alt") || "").normalize("NFC").trim().toLowerCase() : "";
    if (alt)
      return alt;
    return (optionEl.textContent || "").normalize("NFC").trim().toLowerCase().replace(/(символ|character|изображение|image)$/i, "").trim();
  }
  // Clicks-mode native character capture: if a reference name matches a prepared
  // Flow character, attach the character ENTITY (via the picker's "Characters"
  // tab) instead of uploading the photo. Confirmed live: this yields
  // referenceEntities:[{entityId}] in the generation request (not imageInputs),
  // identical to the @-mention — with pure synthetic clicks (no chrome.debugger).
  // Returns {ok:true,isCharacter:true} on success, {ok:false} to fall back to photo.
  async function attachCharacterForBanana(displayName) {
    const want = (displayName || "").normalize("NFC").trim().toLowerCase();
    if (!want)
      return { ok: false };
    const opened = await openReferenceImagePickerPopup("accessibility_new");
    if (!opened)
      return { ok: false };
    const getDlg = () => document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
    let option = null;
    let lastScroll = -1;
    let stall = 0;
    const deadline = Date.now() + 15e3;
    while (Date.now() < deadline && !option) {
      const dlg = getDlg();
      if (dlg) {
        for (const o of dlg.querySelectorAll('[role="option"]')) {
          if (gfCharacterOptionName(o) === want) {
            option = o;
            break;
          }
        }
        if (!option) {
          // Virtualized list: scroll down progressively until the target renders.
          const list = dlg.querySelector(REFERENCE_VIRTUOSO_LIST_SEL);
          const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
          if (scroller && scroller.scrollTop !== lastScroll) {
            lastScroll = scroller.scrollTop;
            scroller.scrollTop += 600;
            stall = 0;
          } else {
            // Scroll stopped moving (list fully scanned, EMPTY picker, or no scroller at all):
            // the name is not there — bail after ~1.2s instead of burning the full 15s deadline.
            stall++;
            if (stall > 8) { console.log(`[GenFlow] Banana: picker scan exhausted — "${displayName}" not found, exiting early`); break; }
          }
        }
      }
      if (!option)
        await sleep(150);
    }
    if (!option) {
      console.log(`[GenFlow] Banana: no native character named "${displayName}" in picker — falling back to photo`);
      closeFlowDialogIfOpen();
      await sleep(200);
      return { ok: false };
    }
    await clickReferenceVirtuosoRowSafe(option);
    console.log(`[GenFlow] Banana: attached native character "${displayName}" (Characters tab, no photo upload)`);
    return { ok: true, isCharacter: true };
  }
  // Object names found in the Flow library, scanned from the picker's Images tab
  // ONCE per page load and kept in memory for the session. null = not scanned yet.
  // Reset naturally on page reload (e.g. after uploading new objects via Load
  // Images, which reloads the tab), so new uploads are picked up next session.
  var gfLibraryObjectNames = null;
  var gfLibraryObjectMap = null;
  window.__gfLibraryObjectMap = () => gfLibraryObjectMap;
  window.__gfCharacterEntities = () => gfCharacterEntities;
  // ===== Reference inventory via Flow API (Layer 1): objects + characters in ONE GET =====
  // Mirrors veo.js / flowApi.listProjectReferences. flow.projectInitialData (same-origin,
  // cookies) → uploaded OBJECTS (name -> mediaId) + CHARACTER entities. Cached per batch;
  // reset on RESET_CONTENT_STATE. ok=false → callers fall back to scrolling the picker.
  var gfRefInventory = null;
  async function gfFetchRefInventory() {
    if (gfRefInventory !== null) return gfRefInventory;
    let inv = { objects: [], characters: [], ok: false };
    try {
      const pid = currentFlowProjectId();
      if (pid) {
        const input = encodeURIComponent(JSON.stringify({ json: { projectId: pid } }));
        const r = await fetch("/fx/api/trpc/flow.projectInitialData?input=" + input, { credentials: "include" });
        if (r.ok) {
          const j = await r.json();
          const pc = (j && j.result && j.result.data && j.result.data.json && j.result.data.json.projectContents) || {};
          const objMap = /* @__PURE__ */ new Map(); // prefer original upload over ref_ copy for the same name
          for (const w of (Array.isArray(pc.workflows) ? pc.workflows : [])) {
            const md = w && w.metadata; if (!md) continue;
            if (w.parentEntityId) continue;             // character ref image, not a standalone object
            if (md.batchId) continue;                    // generated result, not an upload
            const dn = md.displayName || "";
            if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(dn)) continue;
            const mediaId = md.primaryMediaId; if (!mediaId) continue;
            const name = gfObjectBaseName(dn);
            if (!name) continue;
            const isRefCopy = /^ref[_-]/i.test(dn.normalize("NFC").trim());
            const existing = objMap.get(name);
            if (!existing || (existing._ref && !isRefCopy)) objMap.set(name, { name, mediaId, _ref: isRefCopy });
          }
          const objects = Array.from(objMap.values(), (o) => ({ name: o.name, mediaId: o.mediaId }));
          const characters = [], seenC = /* @__PURE__ */ new Set();
          for (const e of (Array.isArray(pc.entities) ? pc.entities : [])) {
            const info = e && e.entityInfo; if (!info) continue;
            if (info.entityType && info.entityType !== "CHARACTER") continue;
            const name = gfNormName(info.displayName);
            if (!name || seenC.has(name)) continue;
            seenC.add(name); characters.push({ name, entityId: e.entityId });
          }
          inv = { objects, characters, ok: true };
          console.log(`[GenFlow] Banana: reference inventory via API — ${objects.length} object(s), ${characters.length} character(s)`);
        }
      }
    } catch (e) { console.warn("[GenFlow] Banana: reference inventory fetch failed", e); }
    // Only memoize a SUCCESSFUL fetch. A failed/empty result must NOT be cached — otherwise a
    // single transient hiccup poisons library-object attach for the rest of the batch. Leaving
    // it null makes the next prompt retry. (Characters here already come from the persisted
    // gfCharacterEntities cache, so this only affects by-name object attach.)
    if (inv.ok) gfRefInventory = inv;
    return inv;
  }
  // Strip Flow's "ref_" prefix, trailing "_<timestamp>[_n]" and image extension so
  // "ref_диор_1782...png" and "диор.png" both reduce to the object name "диор".
  function gfObjectBaseName(s) {
    return gfNormName(s)
      .replace(/^ref[_-]/, "")
      .replace(/\.(png|jpe?g|webp|gif|avif)$/i, "")
      .replace(/[_-]\d{10,}(_\d+)?$/, "")
      .trim();
  }
  // CODE-mode helper: list uploaded library objects (base name -> media id) by
  // scanning the Images tab once. The background asks for this so code-mode can
  // reference library photos by name WITHOUT a cache (matches clicks behavior).
  async function listLibraryObjectsForCode() {
    if (gfLibraryObjectMap === null) {
      await gfScanLibraryAndCharacters();
    }
    const out = [];
    if (gfLibraryObjectMap !== null) {
      gfLibraryObjectMap.forEach((mediaId, name) => {
        out.push({ name, mediaId });
      });
    }
    console.log(`[GenFlow] Banana: listed ${out.length} library object(s) for code mode`);
    return out;
  }
  async function gfScanLibraryAndCharacters() {
    const pid = currentFlowProjectId();
    if (gfLibraryObjectMap !== null) return;
    // Layer-1: the API inventory already lists BOTH uploads (name+mediaId) and characters (real
    // entityIds). When it responds, seed the caches from it and SKIP the DOM picker enumeration
    // entirely — the picker open + scroll cost ~9s even on an EMPTY library. DOM scan below stays
    // as the fallback for when the API is unavailable.
    try {
      const inv = await gfFetchRefInventory();
      if (inv && inv.ok) {
        gfLibraryObjectMap = new Map();
        for (const o of inv.objects) { if (o && o.name && o.mediaId && !gfLibraryObjectMap.has(o.name)) gfLibraryObjectMap.set(o.name, o.mediaId); }
        if (pid && inv.characters && inv.characters.length) {
          const bucket = gfCharacterEntities[pid] || {};
          let added = 0;
          for (const c of inv.characters) { if (c && c.name && !bucket[c.name]) { bucket[c.name] = { displayName: c.name, entityId: c.entityId || ("imported_" + crypto.randomUUID()), photoHash: "", voice: "" }; added++; } }
          if (added) { gfCharacterEntities[pid] = bucket; await new Promise((r) => chrome.storage.local.set({ gfCharacterEntities }, () => r())); }
        }
        console.log(`[GenFlow] Banana: pre-scan via API inventory — ${gfLibraryObjectMap.size} object(s), ${inv.characters.length} character(s), picker skipped`);
        return;
      }
    } catch (e) {}
    console.log("[GenFlow] Banana: Starting session pre-scan of Uploads and Characters...");
    try {
      const opened = await openReferenceImagePickerPopup("drive_folder_upload");
      if (!opened) { closeFlowDialogIfOpen(); return; }
      const dlg = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
      if (!dlg) { closeFlowDialogIfOpen(); return; }
      
      // 1. Scan Library (Uploads)
      gfLibraryObjectMap = new Map();
      let lastScroll = -1, stall = 0, emptyTicks = 0;
      let deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const items = Array.from(dlg.querySelectorAll('[role="option"]'));
        for (const o of items) {
          const img = o.querySelector("img");
          if (!img) continue; // Only process cards with images (user uploads)
          const raw = (img.getAttribute("alt") || "").trim() || (o.textContent || "").trim();
          const bn = gfObjectBaseName(raw);
          if (!bn || gfLibraryObjectMap.has(bn)) continue;
          const mediaId = extractMediaNameFromUrl(img.src || img.getAttribute("src") || "");
          if (mediaId) {
            gfLibraryObjectMap.set(bn, mediaId);
          }
        }
        const list = dlg.querySelector(REFERENCE_VIRTUOSO_LIST_SEL);
        const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
        if (scroller && items.length > 0) {
          emptyTicks = 0;
          const currentScroll = scroller.scrollTop;
          if (lastScroll !== -1 && Math.abs(currentScroll - lastScroll) < 5) {
            stall++;
            if (stall > 6) break;
          } else {
            stall = 0;
          }
          lastScroll = currentScroll;
          scroller.scrollTop += 600;
          await sleep(200);
        } else {
          // EMPTY Uploads ("No results found"): the stall-break above never fires with 0 items,
          // so this used to burn the FULL 15s deadline. Give it ~2s to render, then bail.
          emptyTicks++;
          if (emptyTicks > 10) { console.log("[GenFlow] Banana: pre-scan — Uploads empty, exiting early"); break; }
          await sleep(200);
        }
      }
      console.log(`[GenFlow] Banana: Pre-scanned library, found ${gfLibraryObjectMap.size} objects`);
      
      // 2. Scan Characters
      let switched = false;
      for (const tb of dlg.querySelectorAll('button[role="tab"]')) {
        const ic = tb.querySelector("i");
        if (ic && (ic.textContent || "").trim() === "accessibility_new") {
          if (tb.getAttribute("aria-selected") !== "true") {
            nativeClick(tb);
            await sleep(500);
          }
          switched = true;
          break;
        }
      }
      if (switched) {
        const newChars = {};
        let lastScroll = -1, stall = 0, emptyTicks = 0;
        deadline = Date.now() + 15000;
        while (Date.now() < deadline) {
          const list = dlg.querySelector(REFERENCE_VIRTUOSO_LIST_SEL);
          const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
          const options = Array.from(dlg.querySelectorAll('[role="option"]'));
          for (const o of options) {
            const name = gfCharacterOptionName(o);
            if (name && !newChars[name]) {
              newChars[name] = {
                displayName: name,
                entityId: "imported_" + crypto.randomUUID(),
                photoHash: "",
                voice: ""
              };
            }
          }
          if (scroller && options.length > 0) {
            emptyTicks = 0;
            const currentScroll = scroller.scrollTop;
            if (lastScroll !== -1 && Math.abs(currentScroll - lastScroll) < 5) {
              stall++;
              if (stall > 6) break;
            } else {
              stall = 0;
            }
            lastScroll = currentScroll;
            scroller.scrollTop += 600;
            await sleep(200);
          } else {
            // EMPTY Characters tab: same no-exit flaw as the Uploads loop above — bail after ~2s.
            emptyTicks++;
            if (emptyTicks > 10) { console.log("[GenFlow] Banana: pre-scan — Characters empty, exiting early"); break; }
            await sleep(200);
          }
        }
        if (Object.keys(newChars).length > 0) {
          gfCharacterEntities[pid] = newChars;
          await new Promise((resolve) => {
            chrome.storage.local.set({ gfCharacterEntities }, () => resolve());
          });
          console.log(`[GenFlow] Banana: Auto-imported ${Object.keys(newChars).length} characters:`, Object.keys(newChars).join(", "));
        }
      }
    } catch (e) {
      console.warn("[GenFlow] Banana: pre-scan / auto-import failed:", e);
    } finally {
      closeFlowDialogIfOpen();
      await sleep(250);
    }
  }
  // Attach library objects (plain photos) mentioned in the prompt in a SINGLE
  // picker open: scroll the Images tab once, cache every object's base name (session
  // memory — so later prompts WITHOUT objects skip opening the picker entirely),
  // multi-select every matching unattached option (toggle aria-selected, no confirm
  // yet), then click "Add to prompt" ONCE. No cache file, no re-upload, no
  // double-open. `attached` = shared dedup Set vs characters.
  async function gfAttachLibraryObjectsByText(promptText, roomLeft, attached) {
    if (roomLeft <= 0) return 0;
    const norm = gfNormName(promptText);
    if (!norm) return 0;
    const wordHit = (name) => {
      if (!name) return false;
      try { return new RegExp("(^|[^\\p{L}\\p{N}])" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\p{L}\\p{N}]|$)", "u").test(norm); }
      catch (e) { return norm.includes(name); }
    };
    const getDlg = () => document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
    // Click the picker's "Add to prompt" once.
    const confirmAdd = async (dlg) => {
      if (!dlg) return false;
      const cbtn = Array.from(dlg.querySelectorAll("button")).find((b) => {
        const t = (b.textContent || "").toLowerCase();
        const dis = b.disabled || b.getAttribute("aria-disabled") === "true";
        return !dis && (t.includes("добавить в запрос") || t.includes("add to prompt"));
      });
      if (!cbtn) return false;
      nativeClick(cbtn); await sleep(80); try { cbtn.click(); } catch (e) {} await sleep(700);
      return true;
    };

    // ---- Layer-1 path: API inventory (complete object list, no enumeration scroll) ----
    const inv = await gfFetchRefInventory();
    if (inv && inv.ok) {
      gfLibraryObjectNames = /* @__PURE__ */ new Set(inv.objects.map((o) => o.name)); // authoritative complete set
      const wantNames = /* @__PURE__ */ new Set();
      const wantMediaIds = /* @__PURE__ */ new Set();
      for (const o of inv.objects) {
        if (wantNames.size >= roomLeft) break;
        if (attached.has(o.name) || wantNames.has(o.name)) continue;
        if (wordHit(o.name)) { wantNames.add(o.name); if (o.mediaId) wantMediaIds.add(o.mediaId); }
      }
      if (!wantNames.size) return 0;                 // nothing in this prompt → don't open the picker
      const chipBaseline = document.querySelectorAll('img[src*="getMediaUrlRedirect"]').length;
      const opened2 = await openReferenceImagePickerPopup("drive_folder_upload");
      if (!opened2) return 0;
      // The Uploads list can take >1s to render, especially when the picker was JUST
      // closed and reopened (a character was attached right before). We KNOW the
      // library is non-empty (the API inventory listed the objects) — wait for the
      // first option to render instead of bailing on an empty list ("picker showed
      // 0 option(s) — list did not render in time").
      {
        const renderDeadline = Date.now() + 5000;
        while (Date.now() < renderDeadline) {
          const dlg0 = getDlg();
          if (dlg0 && dlg0.querySelectorAll('[role="option"]').length > 0) break;
          await sleep(150);
        }
      }
      const selected = /* @__PURE__ */ new Set();
      const selectedMids = /* @__PURE__ */ new Set();
      const seenNames = /* @__PURE__ */ new Set();
      let lastScroll = -1, stall = 0;
      const deadline = Date.now() + 8e3;
      while (Date.now() < deadline && selected.size < wantNames.size) {
        const dlg = getDlg(); if (!dlg) break;
        for (const o of dlg.querySelectorAll('[role="option"]')) {
          const img = o.querySelector("img"); if (!img) continue;
          const mid = extractMediaNameFromUrl(img.src || img.getAttribute("src") || "");
          const bn = gfObjectBaseName((img.getAttribute("alt") || "").trim() || (o.textContent || "").trim());
          if (bn) seenNames.add(bn);
          const isWanted = (mid && wantMediaIds.has(mid)) || (bn && wantNames.has(bn));
          if (!isWanted) continue;
          const key = bn || mid;
          if (selected.has(key) || attached.has(bn)) continue;
          const opt = (o.closest && o.closest('[role="option"]')) || o;
          if (opt.getAttribute("aria-selected") !== "true") { nativeClick(opt); await sleep(70); try { opt.click(); } catch (e) {} await sleep(120); }
          if (opt.getAttribute("aria-selected") === "true") { selected.add(key); if (mid) selectedMids.add(mid); if (bn) attached.add(bn); }
        }
        const list = dlg.querySelector(REFERENCE_VIRTUOSO_LIST_SEL);
        const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
        if (scroller && scroller.scrollTop !== lastScroll) { lastScroll = scroller.scrollTop; scroller.scrollTop += 600; await sleep(150); }
        else { stall++; if (stall > 4) break; await sleep(150); }
      }
      if (!selected.size) {
        // Diagnostics: the object matched the prompt text but the picker never
        // yielded a clickable option for it. Log exactly what we saw so a rare
        // "added-on-the-fly prompt didn't attach" case is explainable.
        console.warn(`[GenFlow] Banana: library object attach — wanted [${Array.from(wantNames).join(", ")}] but NONE selectable; picker showed ${seenNames.size} option(s)${seenNames.size ? " (e.g. " + Array.from(seenNames).slice(0, 6).join(", ") + ")" : " — list did not render in time"}`);
        closeFlowDialogIfOpen(); await sleep(120); return 0;
      }
      if (!(await confirmAdd(getDlg()))) {
        console.warn(`[GenFlow] Banana: library object attach — selected [${Array.from(selected).join(", ")}] but "Add to prompt" button was not found or disabled`);
        closeFlowDialogIfOpen(); await sleep(120); return 0;
      }
      // DO NOT send Escape here. "Add to prompt" closes the picker itself; a forced
      // Escape races the attach and CANCELS it (regression: reference chip never
      // landed). Let the dialog close on its own — the verify loop waits for it.
      // VERIFY the chip actually landed. EXACT check: after the picker closes the
      // composer must contain an <img> carrying the object's mediaId. A global
      // getMediaUrlRedirect counter is unreliable (lazy gallery tiles inflate it),
      // so use it only as a fallback when the object had no mediaId.
      let confirmed = false, chipUp = 0;
      const chipDeadline = Date.now() + 2000;
      while (Date.now() < chipDeadline) {
        await sleep(150);
        if (getDlg()) continue;                        // wait until picker is fully gone
        if (selectedMids.size) {
          let hit = 0;
          for (const mid of selectedMids) { if (document.querySelector('img[src*="' + mid + '"]')) hit++; }
          if (hit >= selectedMids.size) { confirmed = true; break; }
        } else {
          chipUp = document.querySelectorAll('img[src*="getMediaUrlRedirect"]').length - chipBaseline;
          if (chipUp >= selected.size) { confirmed = true; break; }
        }
      }
      if (confirmed) {
        for (const k of selected) console.log(`[GenFlow] Banana: attached library object "${k}" (chip confirmed in composer)`);
      } else {
        console.warn(`[GenFlow] Banana: library object attach NOT confirmed — "Add to prompt" clicked but no reference chip for [${Array.from(selected).join(", ")}] appeared in composer; generating without it`);
      }
      await sleep(150);
      return confirmed ? selected.size : 0;
    }

    // ---- Fallback path: enumerate the Uploads tab by scroll (API unavailable) ----
    // Fast path: library already scanned this session and nothing in the prompt
    // matches a known object → don't open the picker at all.
    if (gfLibraryObjectNames !== null) {
      let any = false;
      for (const bn of gfLibraryObjectNames) { if (!attached.has(bn) && wordHit(bn)) { any = true; break; } }
      if (!any) return 0;
    }
    const chipBaseline2 = document.querySelectorAll('img[src*="getMediaUrlRedirect"]').length;
    const opened = await openReferenceImagePickerPopup("drive_folder_upload");
    if (!opened) return 0;
    const names = /* @__PURE__ */ new Set(gfLibraryObjectNames || []);
    const selected = /* @__PURE__ */ new Set();
    let lastScroll = -1, stall = 0;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && selected.size < roomLeft) {
      const dlg = getDlg();
      if (!dlg) break;
      for (const o of dlg.querySelectorAll('[role="option"]')) {
        const img = o.querySelector("img");
        if (!img) continue; // Only process cards with images (user uploads)
        const raw = (img.getAttribute("alt") || "").trim() || (o.textContent || "").trim();
        const bn = gfObjectBaseName(raw);
        if (!bn) continue;
        names.add(bn);
        if (selected.size < roomLeft && !attached.has(bn) && !selected.has(bn) && wordHit(bn)) {
          const opt = (o.closest && o.closest('[role="option"]')) || o;
          if (opt.getAttribute("aria-selected") !== "true") {
            nativeClick(opt); await sleep(70); try { opt.click(); } catch (e) {}
            await sleep(120);
          }
          if (opt.getAttribute("aria-selected") === "true") selected.add(bn);
        }
      }
      const list = dlg.querySelector(REFERENCE_VIRTUOSO_LIST_SEL);
      const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
      if (scroller && scroller.scrollTop !== lastScroll) { lastScroll = scroller.scrollTop; scroller.scrollTop += 600; stall = 0; await sleep(150); }
      else { stall++; if (stall > 5) break; await sleep(150); }
    }
    gfLibraryObjectNames = names; // session cache now complete (best-effort over the scroll)
    if (selected.size === 0) { closeFlowDialogIfOpen(); await sleep(120); return 0; }
    if (!(await confirmAdd(getDlg()))) { closeFlowDialogIfOpen(); await sleep(120); return 0; }
    // DO NOT send Escape here — it races and cancels the attach (see API-path note).
    // Verify the chip actually landed (see API-path note above).
    let chipUp2 = 0;
    const chipDeadline2 = Date.now() + 1800;
    while (Date.now() < chipDeadline2) {
      await sleep(150);
      chipUp2 = document.querySelectorAll('img[src*="getMediaUrlRedirect"]').length - chipBaseline2;
      if (chipUp2 >= selected.size) break;
    }
    if (chipUp2 >= 1) {
      for (const bn of selected) { attached.add(bn); console.log(`[GenFlow] Banana: attached library object "${bn}" (chip confirmed, scroll fallback, +${chipUp2})`); }
    } else {
      console.warn(`[GenFlow] Banana: library object attach NOT confirmed (scroll fallback) — no reference chip appeared in composer; generating without it`);
    }
    await sleep(150);
    return chipUp2 >= 1 ? selected.size : 0;
  }
  async function selectReferenceImageInPopup(filename, maxWaitMs = 15e3) {
    const listSel = REFERENCE_VIRTUOSO_LIST_SEL;
    const deadline = Date.now() + maxWaitMs;
    const fallbackDeadline = Date.now() + Math.floor(maxWaitMs * 0.6);
    const findMatchingImgInDialog = (dialog, fn) => {
      const f = fn.trim().toLowerCase();
      const imgs = dialog.querySelectorAll("img");
      const m = fn.match(/_(\d{10,})\.png$/i);
      const timestamp = m ? m[1] : null;
      for (const img of imgs) {
        const alt = (img.getAttribute("alt") || "").trim().toLowerCase();
        const src = (img.getAttribute("src") || "").trim().toLowerCase();
        if (alt && (alt === f || alt.includes(f) || f.includes(alt))) {
          return img;
        }
        if (timestamp && alt.includes(timestamp)) {
          return img;
        }
        if (src && (src.includes(f) || (timestamp && src.includes(timestamp)))) {
          return img;
        }
      }
      return null;
    };
    const clickRowSafe = async (row) => {
      // Click the actual selectable option (div[role="option"]); toggling its
      // aria-selected is what enables the "Добавить в запрос" confirm button.
      const target = (row.closest && row.closest('[role="option"]')) || (row.querySelector && row.querySelector('[role="option"]')) || row;
      let confirmBtn = null;
      const maxAttempts = 3;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`[GenFlow] Banana: Clicking image row (attempt ${attempt + 1}/${maxAttempts})`);
        try {
          nativeClick(target);
          await sleep(80);
          target.click();
        } catch {
          nativeClick(row);
          row.click();
        }
        const checkDeadline = Date.now() + 1500;
        while (Date.now() < checkDeadline) {
          const dialog = row.closest('[role="dialog"]') || document.querySelector('[role="dialog"]');
          if (dialog) {
            const buttons = Array.from(dialog.querySelectorAll("button"));
            const confirmBtnInfo = buttons.map((btn) => {
              const text = (btn.textContent || "").trim().toLowerCase();
              let score = 0;
              if (text.includes("добавить в запрос") || text.includes("add to prompt"))
                score = 10;
              else if (text.includes("добавить") && (text.includes("запрос") || text.includes("prompt")))
                score = 9;
              else if (text.includes("запрос") || text.includes("prompt"))
                score = 8;
              else if (text.includes("добавить") || text.includes("add"))
                score = 5;
              else if (text.includes("выбрать") || text.includes("select"))
                score = 4;
              return { btn, score, text };
            }).filter((x) => x.score > 0 && isVisible2(x.btn)).sort((a, b) => b.score - a.score)[0];
            if (confirmBtnInfo) {
              const btn = confirmBtnInfo.btn;
              const isBtnDisabled = btn.disabled || btn.getAttribute("aria-disabled") === "true" || btn.className.includes("disabled") || btn.getAttribute("disabled") !== null;
              if (!isBtnDisabled) {
                confirmBtn = btn;
                break;
              }
            }
          }
          await sleep(100);
        }
        if (confirmBtn) {
          break;
        }
      }
      if (confirmBtn) {
        console.log(`[GenFlow] Banana: Found enabled confirm button "${confirmBtn.textContent.trim()}", clicking it`);
        nativeClick(confirmBtn);
        await sleep(80);
        confirmBtn.click();
        await sleep(400);
        return true;
      } else {
        console.log("[GenFlow] Banana: Confirm button not found or remained disabled");
        return false;
      }
    };
    const findPopupList = () => {
      const dialogs = Array.from(document.querySelectorAll('[role="dialog"][data-state="open"]'));
      for (const d of dialogs) {
        if (!isVisible2(d))
          continue;
        const l = d.querySelector(listSel);
        if (l)
          return l;
      }
      const lists = querySelectorAllIncludingShadowDom(document, listSel);
      for (const l of lists) {
        if (isVisible2(l))
          return l;
      }
      return null;
    };
    let lastScrollTop = -1, stall = 0;
    let hasScrolledToTop = false;
    while (Date.now() < deadline) {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('[role="dialog"][data-state="open"]');
      if (dialog && isVisible2(dialog)) {
        const matchingImg = findMatchingImgInDialog(dialog, filename);
        if (matchingImg) {
          console.log(`[GenFlow] Banana: Found direct image match inside dialog (${filename})`);
          const refName = (matchingImg.src || matchingImg.getAttribute("src")) ? extractMediaNameFromUrl(matchingImg.src || matchingImg.getAttribute("src")) : null;
          const ok = await clickRowSafe(matchingImg);
          if (ok) return { selected: true, refMediaName: refName };
        }
      }
      const list = findPopupList();
      if (!list) {
        await sleep(400);
        continue;
      }
      const getScrollContainer = () => {
        let node = list.parentElement;
        for (let i = 0; i < 8 && node; i++) {
          const style = window.getComputedStyle(node);
          if (style.overflow === "auto" || style.overflow === "scroll" || style.overflowY === "auto" || style.overflowY === "scroll") {
            return node;
          }
          node = node.parentElement;
        }
        return null;
      };
      const scrollContainer = getScrollContainer();
      const items = Array.from(list.querySelectorAll('[role="option"]'));
      if (items.length > 0) {
        if (items[0].getAttribute("data-index") !== null) {
          items.sort(
            (a, b) => parseInt(a.getAttribute("data-index") || "0", 10) - parseInt(b.getAttribute("data-index") || "0", 10)
          );
        }
        const extractRefMediaNameFromItem = (item) => {
          const img = item.querySelector("img");
          if (!img)
            return null;
          const src = img.src || img.getAttribute("src") || "";
          return extractMediaNameFromUrl(src);
        };
        for (const item of items) {
          if ((item.textContent || "").includes(filename)) {
            console.log(`[GenFlow] Banana: Reference popup filename match at index ${item.getAttribute("data-index")}`);
            // This is our just-uploaded file (matched by name) — select it
            // immediately. aria-selected (set by the click) is what enables the
            // confirm button; do NOT block on the media-name (it only feeds the
            // reuse cache and can be re-read after selecting).
            const ok = await clickRowSafe(item);
            if (ok) return { selected: true, refMediaName: extractRefMediaNameFromItem(item) };
          }
        }
        if (filename.startsWith("ref_") && !hasScrolledToTop) {
          if (scrollContainer && scrollContainer.scrollTop > 0) {
            console.log("[GenFlow] Banana: Scrolling to top to find newly uploaded file:", filename);
            scrollContainer.scrollTop = 0;
            hasScrolledToTop = true;
            await sleep(250);
            continue;
          }
          hasScrolledToTop = true;
        }
        if (Date.now() > fallbackDeadline) {
          const newest = items[0];
          if (newest) {
            console.log(`[GenFlow] Banana: Reference popup fallback — newest item (index ${newest.getAttribute("data-index")})`);
            const refName = extractRefMediaNameFromItem(newest);
            const ok = await clickRowSafe(newest);
            if (ok) return { selected: true, refMediaName: refName };
          }
        }
      }
      if (scrollContainer && (!filename.startsWith("ref_") || hasScrolledToTop) && items.length > 0) {
        const currentScroll = scrollContainer.scrollTop;
        if (lastScrollTop !== -1 && Math.abs(currentScroll - lastScrollTop) < 5) {
          stall++;
          if (stall > 4) {
            console.log("[GenFlow] Banana: Reference popup reached bottom of list");
            break;
          }
        } else {
          stall = 0;
        }
        lastScrollTop = currentScroll;
        scrollContainer.scrollTop += scrollContainer.clientHeight || 400;
        await sleep(350);
      } else {
        await sleep(300);
      }
    }
    console.log("[GenFlow] Banana: Could not find reference image in popup:", filename);
    return { selected: false, refMediaName: null };
  }
  async function selectReferenceImageFromPopup(imageUrl) {
    const mediaName = extractMediaNameFromUrl(imageUrl);
    if (!mediaName) {
      console.log("[GenFlow] Banana: Could not extract media name from imageUrl");
      return false;
    }
    const addBtn = document.querySelector('button[aria-haspopup="dialog"]');
    let addButton = addBtn && (addBtn.querySelector("i")?.textContent?.includes("add") || (addBtn.textContent || "").toLowerCase().includes("add")) ? addBtn : null;
    if (!addButton) {
      const buttons = document.querySelectorAll("button");
      for (const btn of buttons) {
        const icon = btn.querySelector("i");
        if (icon?.textContent?.includes("add") && isVisible2(btn)) {
          addButton = btn;
          break;
        }
      }
    }
    if (!addButton || !isVisible2(addButton)) {
      console.log("[GenFlow] Banana: Add reference button not found");
      return false;
    }
    nativeClick(addButton);
    await sleep(2e3);
    const rowClass = "sc-dbfb6b4a-11";
    const deadline = Date.now() + 15e3;
    while (Date.now() < deadline) {
      const dialog = document.querySelector('[role="dialog"]') || document.querySelector('[role="dialog"][data-state="open"]');
      if (dialog && isVisible2(dialog)) {
        const imgs = dialog.querySelectorAll("img");
        for (const img of imgs) {
          const src = img.src || img.getAttribute("src") || "";
          if (src.includes(mediaName)) {
            const row = img.closest('button, [role="button"]') || img.closest(`div.${rowClass}`) || img.parentElement;
            if (row && isVisible2(row)) {
              row.scrollIntoView({ block: "center", behavior: "auto" });
              await sleep(120);
              const ok = await clickRowSafe(row);
              if (ok) {
                console.log("[GenFlow] Banana: Selected reference image in dialog list (direct match)");
                await sleep(1500);
                return true;
              }
            }
          }
        }
      }
      const lists = querySelectorAllIncludingShadowDom(document, REFERENCE_VIRTUOSO_LIST_SEL);
      for (const list of lists) {
        if (!isVisible2(list))
          continue;
        const items = list.querySelectorAll('[role="option"]');
        for (const item of items) {
          const img = item.querySelector("img");
          if (!img)
            continue;
          const src = img.src || img.getAttribute("src") || "";
          if (!src.includes(mediaName))
            continue;
          const row = item.querySelector(`div.${rowClass}`) || img.closest(`div.${rowClass}`) || img.parentElement;
          if (!row || !isVisible2(row))
            continue;
          const el = row;
          el.scrollIntoView({ block: "center", behavior: "auto" });
          await sleep(200);
          const ok = await clickRowSafe(el);
          if (ok) {
            console.log("[GenFlow] Banana: Selected reference image in popup (media:", mediaName, ")");
            await sleep(1500);
            return true;
          }
        }
      }
      const dialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
      for (const dialog of dialogs) {
        const list = dialog.querySelector(REFERENCE_VIRTUOSO_LIST_SEL);
        if (!list)
          continue;
        const items = list.querySelectorAll('[role="option"]');
        for (const item of items) {
          const img = item.querySelector("img");
          if (!img)
            continue;
          const src = img.src || img.getAttribute("src") || "";
          if (!src.includes(mediaName))
            continue;
          const row = item.querySelector(`div.${rowClass}`) || img.closest(`div.${rowClass}`) || img.parentElement;
          if (!row || !isVisible2(row))
            continue;
          const el = row;
          el.scrollIntoView({ block: "center", behavior: "auto" });
          await sleep(200);
          const ok = await clickRowSafe(el);
          if (ok) {
            console.log("[GenFlow] Banana: Selected reference image in dialog list");
            await sleep(1500);
            return true;
          }
        }
      }
      await sleep(300);
    }
    console.log("[GenFlow] Banana: Could not find reference image in popup");
    return false;
  }
  async function injectPrompt(payload) {
    const { prompt, settings, slotId, generationMode } = payload;
    __gfCurrentGenMode = generationMode || null;
    try {
      console.log(`[GenFlow] Banana: Starting injection for prompt #${prompt.number}`);
      console.log(`[GenFlow] Banana: Generation mode: ${generationMode || "single"}`);
      if (!isFlowHost()) {
        throw new Error("Banana content script should run on labs.google/fx");
      }
      if (prompt.failedTileIds && prompt.failedTileIds.length > 0) {
        console.log(`[GenFlow] Banana: Card-retry for prompt #${prompt.number}: tiles=${prompt.failedTileIds.join(",")}`);
        await ensureFlowProjectPage();
        await sleep(800);
        const _preTiles = new Set(Array.from(document.querySelectorAll("[data-tile-id]")).map((t) => t.getAttribute("data-tile-id")));
        let _clicked = 0;
        for (const _tid of prompt.failedTileIds) {
          const _card = document.querySelector(`[data-tile-id="${_tid}"]`);
          if (!_card) { console.warn(`[GenFlow] Banana: card-retry tile ${_tid} not found (evicted)`); continue; }
          const _r = _card.getBoundingClientRect();
          for (const _ev of ["pointerover", "pointerenter", "mouseover", "mousemove"]) _card.dispatchEvent(new MouseEvent(_ev, { bubbles: true, clientX: _r.left + _r.width / 2, clientY: _r.top + _r.height / 2 }));
          await sleep(250);
          const _btns = Array.from(_card.querySelectorAll("button"));
          const _btn = _btns.find((b) => (b.textContent || "").includes("Повторить"));
          if (_btn) {
            for (const _ev of ["pointerover", "mouseover", "mousemove"]) _card.dispatchEvent(new MouseEvent(_ev, { bubbles: true, clientX: _r.left + _r.width / 2, clientY: _r.top + _r.height / 2 }));
            _btn.setAttribute("data-w3a1", "true");
            const _res = await new Promise((resolve) => { chrome.runtime.sendMessage({ type: "CLICK_FLOW_CREATE" }, (r) => resolve(r)); });
            _clicked++;
            console.log(`[GenFlow] Banana: trusted Повторить click on ${_tid}: ${_res && _res.result ? JSON.stringify(_res.result) : "?"}`);
            await sleep(800);
          } else console.warn(`[GenFlow] Banana: Повторить button not found on ${_tid}`);
        }
        if (_clicked > 0) {
          let _watch = [];
          const _t0 = Date.now();
          while (Date.now() - _t0 < 15000) {
            _watch = Array.from(document.querySelectorAll("[data-tile-id]")).map((t) => t.getAttribute("data-tile-id")).filter((id) => id && !_preTiles.has(id));
            if (_watch.length >= _clicked) break;
            await sleep(500);
          }
          if (_watch.length === 0) _watch = prompt.failedTileIds.slice();
          console.log(`[GenFlow] Banana: card-retry now watching ${_watch.length} new tile(s): ${_watch.join(",")}`);
          const _preGen = snapshotImageSources();
          for (const _wt of _watch) { const _wc = document.querySelector(`[data-tile-id="${_wt}"]`); if (_wc) for (const _im of _wc.querySelectorAll("img")) { const _u = normalizeMediaUrl(_im.src); if (_u) _preGen.delete(_u); } }
          waitForImageGenerationComplete(prompt, slotId, 3 * 60 * 1e3, Date.now(), _preGen, /* @__PURE__ */ new Set(), _watch, settings).catch((err) => {
            console.error("[GenFlow] Banana: card-retry monitoring failed:", err);
          });
          return;
        }
        console.warn(`[GenFlow] Banana: card-retry found no live cards for prompt #${prompt.number}; falling back to full generation`);
      }
      if (prompt.onlyUpscale && prompt.resultUrl) {
        console.log(`[GenFlow] OnlyUpscale Mode: starting upscale for prompt #${prompt.number} using URL: ${prompt.resultUrl}`);
        await ensureFlowProjectPage();
        await sleep(1500);
        
        let card = await locateCardForPrompt(prompt);
        if (!card) {
          console.error(`[GenFlow] Card not found for URL: ${prompt.resultUrl} or prompt text: ${prompt.text}`);
          throw new Error("Card for upscale not found on the page");
        }
        
        console.log("[GenFlow] Card found. Triggering upscale...");
        const isVideo = !!card.querySelector('video');
        let res;
        if (settings.outputMethod === "code") {
          // Hybrid (synthetic input + code output): the base card is already generated.
          // Skip the synthetic upscale/download (2K-menu click) — background does the
          // upscale + download by API instead.
          chrome.runtime.sendMessage({ type: "CODE_OUTPUT", payload: { promptId: prompt.id, promptNumber: prompt.number, resultUrl: prompt.resultUrl, isVideo, text: prompt.text } });
          res = { success: true, downloadPending: true };
        } else if (isVideo) {
          res = await triggerFlowUpscaleDownload(card, settings.quality || "1080p", prompt);
        } else {
          res = await triggerFlowImageUpscaleDownload(card, settings.imageQuality || "1k", prompt);
        }
        
        let finalResultUrl = prompt.resultUrl;
        let downloadedFlag = false;
        let _downloadPending = false;
        if (res && res.success) {
          if (res.downloadPending) _downloadPending = true; else downloadedFlag = true;
          if (res.upscaledUrl) {
            finalResultUrl = getDownloadUrlForImage(res.upscaledUrl);
          }
        } else {
          throw new Error("Failed to upscale resolution");
        }

        chrome.runtime.sendMessage({
          type: "GENERATION_COMPLETE",
          payload: {
            promptId: prompt.id,
            resultUrl: finalResultUrl,
            downloaded: downloadedFlag,
            downloadPending: _downloadPending,
            promptNumber: prompt.number
          }
        });
        return;
      }
      
      if (prompt.text === lastInjectedPrompt && generationMode !== "film" && generationMode !== "reference") {
        console.log("[GenFlow] Banana: Duplicate prompt detected, skipping");
      }
      lastInjectedPrompt = prompt.text;
      await ensureFlowProjectPage();
      if (!isOnFlowProjectPage()) {
        throw new Error("\u041D\u0443\u0436\u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 Flow.");
      }
      await sleep(1500);
      
      // PRE-SCAN Flow library objects and auto-import native characters at start of first injection
      if (settings.gfApplyRefs !== false) {
        await gfScanLibraryAndCharacters(prompt);
      }

      await acquireFlowSubmissionLock(prompt.number);
      await __gfWaitCooldown(prompt.number);
      try {
        if (flowInjectionAborted) {
          console.log(`[GenFlow] Banana: injection aborted — skipping prompt #${prompt.number}`);
          return;
        }
        const _isFilmExtend = generationMode === "film" && !!prompt.imageUrl;
        // Settings (mode/aspect/count/model) are identical for every prompt in a run, so
        // after the first prompt applies them there's nothing to change — re-opening the
        // menu is pure no-op churn + the open-close-open flicker. Skip when the signature
        // matches what we already applied this run (reset at RESET_CONTENT_STATE).
        const _settingsSig = JSON.stringify({
          mode: generationMode,
          model: settings.imageModel ?? "nano-banana-pro",
          aspect: settings.aspectRatio ?? "",
          count: Math.min(4, Math.max(1, settings.imagesPerPrompt ?? 1))
        });
        if (_isFilmExtend) {
          // Film extend frames (2+) inherit mode/aspect/count/model from frame 1 — they
          // never change between chained frames, so the ~5s re-setup was pure "already
          // selected" no-ops. Skip it to speed up every chained frame.
          console.log(`[GenFlow] Banana: Film extend frame #${prompt.number} — skipping redundant mode/settings setup`);
        } else if (lastAppliedSettingsSig === _settingsSig) {
          console.log(`[GenFlow] Banana: settings unchanged this run — skipping mode/settings menu (no re-open flicker)`);
        } else {
          await selectImageMode();
          await sleep(800);
          await applyImageSettings(settings);
          await sleep(400);
          const modeTriggerBeforePrompt = findFlowModeMenuTrigger();
          if (modeTriggerBeforePrompt && modeTriggerBeforePrompt.getAttribute("data-state") === "open") {
            console.log("[GenFlow] Banana: Closing mode menu before prompt input...");
            nativeClick(modeTriggerBeforePrompt);
            await sleep(300);
          }
          lastAppliedSettingsSig = _settingsSig;
        }
        if (_isFilmExtend) {
          console.log("[GenFlow] Banana: Film mode - clicking on previous card to extend...");
          const prevCard = findCardByUrl(prompt.imageUrl);
          if (prevCard) {
            console.log("[GenFlow] Banana: Found previous card, clicking it to open extend view...");
            const clickable = prevCard.querySelector('img, video') || prevCard;
            nativeClick(clickable);
            await sleep(1500);
          } else {
            console.warn("[GenFlow] Banana: Film mode - previous card not found for URL:", prompt.imageUrl);
          }
        }
        // Tracks character names already attached (table loop + by-name pass) so a
        // prepared character is never attached twice in the same generation.
        const gfAttachedCharNames = /* @__PURE__ */ new Set();
        if (settings.gfApplyRefs !== false && (generationMode === "reference" || (prompt.referenceImageUrls && prompt.referenceImageUrls.length))) {
          const filteredUrls = [];
          const filteredNames = [];
          if (prompt.referenceImageUrls && prompt.referenceDisplayNames) {
            for (let i = 0; i < prompt.referenceImageUrls.length; i++) {
              const url = prompt.referenceImageUrls[i];
              const name = prompt.referenceDisplayNames[i];
              if (name && textContainsName(prompt.text, name)) {
                filteredUrls.push(url);
                filteredNames.push(name);
              }
            }
          }
          
          const hasCharacterNames = prompt.referenceDisplayNames && prompt.referenceDisplayNames.some(n => n && n.trim());
          let urls = [];
          if (hasCharacterNames) {
            urls = filteredUrls.slice(0, MAX_BANANA_REFERENCE_IMAGES);
            console.log(`[GenFlow] Banana: Reference mode - matched ${urls.length} of ${prompt.referenceImageUrls.length} reference image(s) by name in prompt.`);
          } else {
            const fromArray = prompt.referenceImageUrls && prompt.referenceImageUrls.length > 0 ? prompt.referenceImageUrls.slice(0, MAX_BANANA_REFERENCE_IMAGES) : [];
            urls = fromArray.length > 0 ? fromArray : prompt.imageUrl ? [prompt.imageUrl] : [];
          }
          
          if (urls.length > 0) {
            console.log(
              `[GenFlow] Banana: Reference mode - uploading and selecting ${urls.length} reference image(s)...`
            );
          }
          for (let ri = 0; ri < urls.length; ri++) {
            const dataUrl = urls[ri];
            const refLabel = hasCharacterNames ? filteredNames[ri]?.trim() : prompt.referenceDisplayNames?.[ri]?.trim();
            let uploadResult = null;
            let knownCharFailed = false;
            // Clicks-mode native character: if this reference name is a prepared
            // Flow character, attach the character entity (picker's "Characters"
            // tab) instead of the photo — yields referenceEntities, no imageInputs.
            if (refLabel && isPreparedCharacterName(refLabel)) {
              const charRes = await attachCharacterForBanana(refLabel);
              if (charRes.ok) {
                uploadResult = charRes;
                gfAttachedCharNames.add(gfNormName(refLabel));
              } else {
                // Entity is cached as prepared but isn't in THIS tab's picker
                // (stale page / wrong project / duplicate Flow tab). Do NOT fall
                // back to uploading the photo: a half-completed reference upload
                // leaves the composer broken and the Create click then makes no
                // card ("Own cards NOT detected" -> timeout). Skip it instead.
                knownCharFailed = true;
              }
            }
            if (!uploadResult && !knownCharFailed) {
              uploadResult = await attachReferenceImageForBanana(dataUrl, `${ri}`, refLabel);
            }
            if (!uploadResult || !uploadResult.ok) {
              // A failed attach must NEVER block generation. Close any half-open
              // picker / pending upload so the Create button stays usable, then
              // generate WITHOUT this reference rather than hanging at 0%.
              closeFlowDialogIfOpen();
              await sleep(150);
              console.warn(
                `[GenFlow] Banana: reference "${refLabel || ri}" not attached \u2014 generating without it`
              );
              continue;
            }
            if (refLabel) gfAttachedCharNames.add(gfNormName(refLabel));
            if (uploadResult.refMediaName) {
              globalReferenceMediaNames.add(uploadResult.refMediaName);
              console.log(`[GenFlow] Banana: Registered reference mediaName in global set: ${uploadResult.refMediaName}`);
            }
            // Attach is already confirmed (the "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432 \u0437\u0430\u043f\u0440\u043e\u0441" click), so this
            // is just a short settle wait for the reference thumbnail to render \u2014
            // it breaks early when a new thumbnail appears. 1.5s cap instead of 5s.
            // For a library reuse the thumbnail is already in the DOM, so skip
            // the appearance-wait entirely. For a fresh upload, wait briefly for
            // the new thumbnail (breaks early when it shows).
            const refWaitDeadline = Date.now() + (uploadResult.reused ? 0 : 900);
            const imgCountBefore = document.querySelectorAll('img[src*="getMediaUrlRedirect"]').length;
            while (Date.now() < refWaitDeadline) {
              await sleep(150);
              const imgCountNow = document.querySelectorAll('img[src*="getMediaUrlRedirect"]').length;
              if (imgCountNow > imgCountBefore) {
                console.log("[GenFlow] Banana: Reference thumbnail appeared in DOM \u2014 proceeding");
                break;
              }
            }
            await sleep(150);
            if (uploadResult.refMediaName) {
              const refImg = document.querySelector(
                `img[src*="${uploadResult.refMediaName}"]`
              );
              if (refImg) {
                globalReferenceImageUrls.add(normalizeMediaUrl(refImg.src));
              }
            }
            if (ri < urls.length - 1) {
              await sleep(500);
            }
          }
        }
        // Popup-table OBJECTS (objectDisplayNames) must NEVER be attached as
        // character entities — they are plain photos. Mark them so the by-name
        // character scan below skips them; gfAttachLibraryObjectsByText will
        // handle them from the library instead.
        const _popupObjNames = new Set(
          (Array.isArray(prompt.objectDisplayNames) ? prompt.objectDisplayNames : [])
            .map(n => gfNormName(n)).filter(Boolean)
        );
        // Native characters by NAME, straight from the persisted cache (table-
        // INDEPENDENT): attach any prepared Flow character mentioned in the prompt
        // that wasn't already attached above. This is what makes "анна гуляет"
        // apply анна in image-single even when the popup's Characters table is
        // empty (it isn't persisted across popup reopens) — exactly how video works.
        if (settings.gfApplyRefs !== false && ((generationMode === "single" && prompt.gfApplyChars) || generationMode === "reference")) {
          try {
            const _charNames = gfCharacterNamesInText(prompt.text);
            const _room = Math.max(0, MAX_BANANA_REFERENCE_IMAGES - gfAttachedCharNames.size);
            for (const _nm of _charNames.slice(0, _room)) {
              if (gfAttachedCharNames.has(_nm) || _popupObjNames.has(_nm)) continue;
              const _r = await attachCharacterForBanana(_nm);
              if (_r && _r.ok) {
                gfAttachedCharNames.add(_nm);
                console.log(`[GenFlow] Banana: attached native character "${_nm}" by name from prompt`);
              } else {
                // Not in this tab's picker — close any dialog and keep going; a
                // failed attach must never block the Create button.
                closeFlowDialogIfOpen();
                await sleep(120);
              }
              await sleep(250);
            }
          } catch (e) {
            console.warn("[GenFlow] Banana: character-by-name attach skipped", e);
          }
          // Library objects (plain photos) by NAME — CACHE-FREE live scan of the
          // Images tab; selects whatever's already in the library matching a word
          // in the prompt. Makes "анна держит бан" attach the library photo "бан"
          // without it being in the popup table and without re-uploading.
          try {
            const _objRoom = Math.max(0, MAX_BANANA_REFERENCE_IMAGES - gfAttachedCharNames.size);
            await gfAttachLibraryObjectsByText(prompt.text, _objRoom, gfAttachedCharNames);
          } catch (e) {
            console.warn("[GenFlow] Banana: object-by-name attach skipped", e);
          }
        }
        await waitForElement('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]', 15e3);
        await sleep(100);
        let input = findPromptInput();
        for (let retry = 0; !input && retry < 5; retry++) {
          await sleep(50);
          input = findPromptInput();
        }
        if (!input) {
          const fallback = document.querySelector('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
          if (fallback && (fallback.offsetWidth > 0 || fallback.offsetHeight > 0))
            input = fallback;
        }
        if (!input) {
          throw new Error("Could not find Flow prompt input (textarea or contenteditable).");
        }
        input.focus();
        await sleep(100);
        await fillPromptByPaste(input, prompt.text);
        const minLen = Math.max(1, Math.floor(prompt.text.trim().length * 0.6));
        await waitUntil(
          () => {
            const v = input.tagName === "TEXTAREA" ? input.value.trim() : (input.textContent || input.innerText || "").trim();
            return v.length >= minLen;
          },
          { pollIntervalMs: 25, maxWaitMs: 2e3 }
        );
        console.log(`[GenFlow] Banana: Prompt entered: "${prompt.text.slice(0, 50)}..."`);
        await sleep(400);
        closeFlowDialogIfOpen();
        await sleep(50);
        let createBtn = findFlowCreateButton();
        for (let i = 0; i < 10; i++) {
          createBtn = findFlowCreateButton();
          if (createBtn && !createBtn.disabled)
            break;
          await sleep(50);
        }
        if (!createBtn || createBtn.disabled) {
          throw new Error("\u041A\u043D\u043E\u043F\u043A\u0430 \xAB\u0421\u043E\u0437\u0434\u0430\u0442\u044C\xBB \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430");
        }
        const referenceImageUrls = /* @__PURE__ */ new Set();
        if (generationMode === "reference" || (prompt.referenceImageUrls && prompt.referenceImageUrls.length)) {
          const refImgs = document.querySelectorAll(
            'img[src*="getMediaUrlRedirect"], img[src*="googleusercontent"], img[src*="storage.googleapis"]'
          );
          refImgs.forEach((img) => {
            const src = img.src;
            if (src)
              referenceImageUrls.add(normalizeMediaUrl(src));
          });
          console.log(`[GenFlow] Banana: Collected ${referenceImageUrls.size} reference image URLs for preGen exclusion`);
        }
        const preGenerationImageSrcs = snapshotImageSources();
        for (const u of referenceImageUrls)
          preGenerationImageSrcs.add(u);
        ensureGlobalMediaObserver();
        console.log(`[GenFlow] Banana: Snapshotted ${preGenerationImageSrcs.size} pre-gen images for prompt #${prompt.number}`);
        const preClickTileIds = /* @__PURE__ */ new Set();
        document.querySelectorAll("[data-tile-id]").forEach((el) => {
          const tid = el.getAttribute("data-tile-id");
          if (tid)
            preClickTileIds.add(tid);
        });
        console.log(`[GenFlow] Banana: Pre-click tiles: ${preClickTileIds.size} for prompt #${prompt.number}`);
        createBtn.setAttribute('data-w3a1', 'true');
        await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "CLICK_FLOW_CREATE" }, (res) => {
            resolve(res);
          });
        });
        await sleep(300);
        const createButtonClickTime = Date.now();
        console.log(`[GenFlow] Banana: Create clicked for prompt #${prompt.number} (slotId: ${slotId})`);
        const ownCardTileIds = [];
        const expectedCount = Math.min(4, Math.max(1, settings?.imagesPerPrompt ?? 1));
        // Film EXTEND frames (clicking the previous card) render their new gallery
        // tile much later than a normal Create (~14s vs <1s), so a 3s window misses
        // them and the monitor falls into the (unreliable) no-tile fallback → timeout.
        // Give Film a generous window; the loop still breaks early once the tile shows.
        const cardDetectDeadline = Date.now() + (generationMode === "film" ? 45000 : 3000);
        while (Date.now() < cardDetectDeadline) {
          await sleep(80);
          for (const tile of Array.from(document.querySelectorAll("[data-tile-id]"))) {
            const tid = tile.getAttribute("data-tile-id");
            if (tid && !preClickTileIds.has(tid) && !ownCardTileIds.includes(tid)) {
              ownCardTileIds.push(tid);
            }
          }
          if (ownCardTileIds.length >= expectedCount)
            break;
        }
        if (ownCardTileIds.length > 0) {
          console.log(`[GenFlow] Banana: Own cards captured for prompt #${prompt.number}: tile-ids=${ownCardTileIds.join(",")}`);
        } else {
          console.log(`[GenFlow] Banana: Own cards NOT detected for prompt #${prompt.number} ➔ checking for error toast...`);
          const errMsg = findFlowErrorMessage();
          if (errMsg) {
            console.error(`[GenFlow] Banana: Error toast detected after Create for prompt #${prompt.number}: ${errMsg}`);
            throw new Error(errMsg);
          }
          console.log(`[GenFlow] Banana: No error toast, fallback active`);
        }
        await sleep(500);
        waitForImageGenerationComplete(prompt, slotId, 3 * 60 * 1e3, createButtonClickTime, preGenerationImageSrcs, referenceImageUrls, ownCardTileIds, settings).catch((err) => {
          console.error("[GenFlow] Banana: Generation monitoring failed:", err);
        });
      } finally {
        releaseFlowSubmissionLock();
        console.log(`[GenFlow] Banana: Released submission lock for prompt #${prompt.number}`);
      }
    } catch (error) {
      console.error("[GenFlow] Banana injection failed:", error);
      let previewUrl = null;
      try {
        const card = findCardByUrl(prompt.resultUrl);
        if (card) {
          const imgEl = card.querySelector('img');
          const videoEl = card.querySelector('video');
          const posterUrl = videoEl ? videoEl.getAttribute("poster") : null;
          const previewSrc = posterUrl || (imgEl ? imgEl.src : null) || (videoEl ? videoEl.src : null);
          if (previewSrc) {
            if (previewSrc.startsWith("blob:")) {
              previewUrl = await blobUrlToBase64(previewSrc);
            } else {
              previewUrl = previewSrc;
            }
          }
        }
        if (!previewUrl) {
          previewUrl = await extractInputReferenceImages();
        }
      } catch (e) {}
      chrome.runtime.sendMessage({
        type: "GENERATION_FAILED",
        payload: {
          promptId: prompt.id,
          promptNumber: prompt.number,
          promptText: prompt.text,
          error: error instanceof Error ? error.message : "Unknown error",
          errorType: prompt.onlyUpscale ? "UPSCALE_FAILED" : "GENERATION_FAILED",
          resultUrl: prompt.resultUrl,
          previewUrl: previewUrl || prompt.previewUrl
        }
      });
    }
  }
  var FLOW_IMAGE_IMG_SELECTOR = 'img[src*="googleusercontent"], img[src*="storage.googleapis"], img[src*="lh3.google"], img[src*="getMediaUrlRedirect"]';
  var FLOW_IMAGE_IMG_FALLBACK = 'img[src*="http"], img[src*="blob:"]';
  function snapshotImageSources() {
    const pre = /* @__PURE__ */ new Set();
    const imgs = querySelectorAllIncludingShadowDom(document, FLOW_IMAGE_IMG_SELECTOR);
    for (const img of imgs) {
      const src = img.src;
      if (src)
        pre.add(normalizeMediaUrl(src));
    }
    const fallbackImgs = querySelectorAllIncludingShadowDom(document, FLOW_IMAGE_IMG_FALLBACK);
    for (const img of fallbackImgs) {
      const src = img.src;
      if (src && (src.includes("storage") || src.includes("google") || src.includes("getMediaUrlRedirect") || src.startsWith("blob:"))) {
        pre.add(normalizeMediaUrl(src));
      }
    }
    return pre;
  }
  function collectNewImageUrlsInOrder(preGenUrls) {
    const entries = [];
    const seenNames = /* @__PURE__ */ new Set();
    const seenUrls = /* @__PURE__ */ new Set();
    const minW = 80;
    const minH = 60;
    const add = (el, rawUrl, relaxedSize = false) => {
      const url = normalizeMediaUrl(rawUrl);
      if (!url || preGenUrls.has(url) || seenUrls.has(url))
        return;
      if (!isVisible2(el))
        return;
      const rect = el.getBoundingClientRect();
      const w = el.naturalWidth || rect.width;
      const h = el.naturalHeight || rect.height;
      const thresholdW = relaxedSize ? 60 : 120;
      const thresholdH = relaxedSize ? 40 : 80;
      if (w < thresholdW || h < thresholdH)
        return;
      const name = extractMediaNameFromUrl(url);
      if (name) {
        if (seenNames.has(name))
          return;
        seenNames.add(name);
      }
      seenUrls.add(url);
      entries.push({ el, url });
    };
    let imgs = querySelectorAllIncludingShadowDom(document, FLOW_IMAGE_IMG_SELECTOR);
    for (const img of imgs) {
      if (isInVideoResultCard(img))
        continue;
      const raw = img.src;
      if (raw)
        add(img, raw, false);
    }
    if (entries.length === 0 && preGenUrls.size > 0) {
      imgs = querySelectorAllIncludingShadowDom(document, FLOW_IMAGE_IMG_FALLBACK);
      for (const img of imgs) {
        if (isInVideoResultCard(img))
          continue;
        const raw = img.src;
        if (!raw || raw.startsWith("data:"))
          continue;
        if (!raw.includes("storage") && !raw.includes("google") && !raw.includes("getMediaUrlRedirect") && !raw.startsWith("blob:"))
          continue;
        add(img, raw, true);
      }
    }
    entries.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING)
        return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING)
        return 1;
      return 0;
    });
    return entries.map((e) => e.url);
  }
  function checkGenerationStatusForSlot(slotId, settings = null) {
    const status = {
      isComplete: false,
      imageUrl: null,
      isGenerating: false,
      hasError: false,
      errorMessage: null
    };
    const instance = monitoringInstances.get(slotId);
    if (!instance)
      return status;
    const domError = detectDOMErrors();
    if (domError.type) {
      status.hasError = true;
      status.errorMessage = domError.message || "Generation error";
      return status;
    }
    status.isGenerating = checkLoadingIndicators(document.body);
    if (instance.isComplete) {
      status.isComplete = true;
      status.imageUrl = instance.claimedImageUrl;
      return status;
    }
    const setClaimed = (url) => {
      claimedImageUrls.set(url, slotId);
      const name = extractMediaNameFromUrl(url);
      if (name)
        claimedMediaNames.set(name, slotId);
      instance.claimedImageUrl = url;
      instance.isComplete = true;
    };
    const unionPreGen = /* @__PURE__ */ new Set();
    const unionPreGenNames = /* @__PURE__ */ new Set();
    for (const inst of monitoringInstances.values()) {
      for (const u of inst.preGenerationImageSrcs)
        unionPreGen.add(u);
      for (const n of inst.preGenerationMediaNames)
        unionPreGenNames.add(n);
    }
    for (const u of globalReferenceImageUrls)
      unionPreGen.add(u);
    for (const n of globalReferenceMediaNames)
      unionPreGenNames.add(n);
    const newImageUrls = collectNewImageUrlsInOrder(unionPreGen);
    if (instance.ownCardTileIds && instance.ownCardTileIds.length > 0) {
      let anyCardFound = false;
      let isAnyCardGenerating = false;
      let allCardsHaveImages = true;
      for (const tileId of instance.ownCardTileIds) {
        const card = document.querySelector(`[data-tile-id="${tileId}"]`);
        if (card) {
          anyCardFound = true;
          if (checkLoadingIndicators(card)) {
            isAnyCardGenerating = true;
            allCardsHaveImages = false;
            continue; // Skip scanning images for this card while it is still generating
          }
          // Card settled (not loading) — if it shows an explicit error tile with
          // no media and no progress, fail fast instead of waiting for timeout.
          const cardErr = getCardErrorMessage(card);
          if (cardErr) {
            if (!instance.failedTileIds) instance.failedTileIds = /* @__PURE__ */ new Set();
            instance.failedTileIds.add(tileId);
            instance.lastCardError = cardErr;
            allCardsHaveImages = false;
            continue;
          }
          let cardHasValidImg = false;
          const imgs = card.querySelectorAll("img");
          for (const img of Array.from(imgs)) {
            const src = img.src;
            if (!src)
              continue;
            const url = normalizeMediaUrl(src);
            const mediaName = extractMediaNameFromUrl(url);
            if (mediaName && unionPreGenNames.has(mediaName))
              continue;
            if (unionPreGen.has(url))
              continue;
            if (mediaName && globalReferenceMediaNames.has(mediaName))
              continue;
            if (mediaName && claimedMediaNames.has(mediaName) && claimedMediaNames.get(mediaName) !== slotId)
              continue;
            if (claimedImageUrls.has(url) && claimedImageUrls.get(url) !== slotId)
              continue;
            
            cardHasValidImg = true;
            claimedImageUrls.set(url, slotId);
            if (mediaName)
              claimedMediaNames.set(mediaName, slotId);
            if (!instance.claimedImageUrl) {
              instance.claimedImageUrl = url;
            }
            addUniqueUrlToSet(instance.detectedImageUrls, url);
          }
          if (!cardHasValidImg) {
            allCardsHaveImages = false;
          }
        } else {
          allCardsHaveImages = false;
        }
      }
      
      if (anyCardFound) {
        const expectedCount = (instance.ownCardTileIds && instance.ownCardTileIds.length > 0) ? instance.ownCardTileIds.length : Math.min(4, Math.max(1, settings?.imagesPerPrompt ?? 1));
        const isGenerating = isAnyCardGenerating || checkLoadingIndicators(document.body);
        
        const hasAnyImages = instance.detectedImageUrls.size > 0;
        const failedCount = instance.failedTileIds ? instance.failedTileIds.size : 0;
        if (failedCount >= expectedCount && instance.detectedImageUrls.size === 0) {
          status.hasError = true;
          status.errorMessage = instance.lastCardError || "Generation failed";
          return status;
        }
        const reachedExpected = instance.detectedImageUrls.size >= Math.max(1, expectedCount - failedCount);
        
        let waitExpired = false;
        if (!isGenerating) {
          if (!instance.generationFinishedTime) {
            instance.generationFinishedTime = Date.now();
          }
          // Fast settle delay (500ms) to let the DOM stabilize before finishing
          const timeSinceFinish = Date.now() - instance.generationFinishedTime;
          if (timeSinceFinish > 500) {
            waitExpired = true;
          }
          // If we haven't reached expected count, wait longer (10s) before giving up
          if (!reachedExpected && timeSinceFinish < 10000) {
            waitExpired = false;
          }
        } else {
          instance.generationFinishedTime = null;
        }
        
        if (reachedExpected || (!isGenerating && waitExpired && hasAnyImages)) {
          instance.isComplete = true;
          status.isComplete = true;
          status.imageUrl = instance.claimedImageUrl;
          console.log(`[GenFlow] Banana: Slot ${slotId} (prompt #${instance.promptNumber}) ownCard tile-scan complete. Claimed ${instance.detectedImageUrls.size} images.`);
          return status;
        }
      }
      return status;
    }
    const textMatchUrl = findResultCardForPrompt(instance.promptText, unionPreGen);
    if (textMatchUrl) {
      const mediaName = extractMediaNameFromUrl(textMatchUrl);
      if (mediaName && unionPreGenNames.has(mediaName)) {
        console.log(`[GenFlow] Banana: Slot ${slotId}: text-match URL is preGen (reference image), skipping`);
      } else {
        const alreadyClaimedByOther = mediaName ? claimedMediaNames.has(mediaName) && claimedMediaNames.get(mediaName) !== slotId : claimedImageUrls.has(textMatchUrl) && claimedImageUrls.get(textMatchUrl) !== slotId;
        if (!alreadyClaimedByOther) {
          setClaimed(textMatchUrl);
          addUniqueUrlToSet(instance.detectedImageUrls, textMatchUrl);
          status.isComplete = true;
          status.imageUrl = textMatchUrl;
          console.log(`[GenFlow] Banana: Slot ${slotId} (prompt #${instance.promptNumber}) text-matched result (polling): ${textMatchUrl.substring(0, 80)}...`);
        }
      }
    }
    if (!status.isComplete) {
      for (const url of newImageUrls) {
        if (unionPreGen.has(url))
          continue;
        const mediaName = extractMediaNameFromUrl(url);
        if (mediaName && unionPreGenNames.has(mediaName))
          continue;
        if (mediaName && claimedMediaNames.has(mediaName) && claimedMediaNames.get(mediaName) !== slotId)
          continue;
        const ownerSlot = claimedImageUrls.get(url);
        if (ownerSlot !== void 0 && ownerSlot !== slotId)
          continue;
        if (mediaName) {
          const candidateImg = document.querySelector(
            `img[src*="${mediaName}"]`
          );
          if (candidateImg) {
            const firstSeen = mediaFirstObservedAt.get(candidateImg);
            if (firstSeen !== void 0 && firstSeen < instance.createButtonClickTime - 2e3) {
              console.log(`[GenFlow] Banana: Slot ${slotId}: FIFO skip stale image (observed ${instance.createButtonClickTime - firstSeen}ms before Create): ${mediaName}`);
              continue;
            }
          }
        }
        const oldestUnclaimed = Array.from(monitoringInstances.values()).filter((inst) => !inst.claimedImageUrl).sort((a, b) => a.promptNumber - b.promptNumber)[0];
        if (!oldestUnclaimed || oldestUnclaimed.slotId !== slotId)
          break;
        setClaimed(url);
        addUniqueUrlToSet(instance.detectedImageUrls, url);
        status.isComplete = true;
        status.imageUrl = url;
        console.log(`[GenFlow] Banana: Slot ${slotId} (prompt #${instance.promptNumber}) FIFO fallback claim: ${url.substring(0, 80)}...`);
        break;
      }
    }
    if (!status.isComplete && monitoringInstances.size <= 1) {
      const downloadBtns = document.querySelectorAll('a[download], [aria-label*="download" i], [aria-label*="\u0441\u043A\u0430\u0447\u0430\u0442\u044C" i], button[aria-label*="\u0421\u043A\u0430\u0447\u0430\u0442\u044C"], button[aria-label*="Download"]');
      for (const btn of downloadBtns) {
        if (!isVisible2(btn))
          continue;
        const href = btn.getAttribute("href");
        if (href && href.startsWith("http")) {
          const url = normalizeMediaUrl(href);
          if (!unionPreGen.has(url)) {
            setClaimed(url);
            addUniqueUrlToSet(instance.detectedImageUrls, url);
            status.isComplete = true;
            status.imageUrl = url;
            console.log(`[GenFlow] Banana: Claimed image from download link: ${url.substring(0, 80)}...`);
            return status;
          }
        }
      }
    }
    if (monitoringInstances.size > 1 && !instance.claimedImageUrl) {
      status.isComplete = false;
    }
    return status;
  }
  async function ensureVideoMetadataLoaded(video) {
    if (video.readyState >= 1 && video.videoWidth > 0) {
      return;
    }
    console.log("[GenFlow] Video metadata not loaded yet. Waiting...");
    await new Promise((resolve) => {
      const handleMetadata = () => {
        cleanup();
        resolve();
      };
      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, 3000);
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", handleMetadata);
        video.removeEventListener("loadeddata", handleMetadata);
        clearTimeout(timeout);
      };
      video.addEventListener("loadedmetadata", handleMetadata);
      video.addEventListener("loadeddata", handleMetadata);
      if (video.readyState >= 1 && video.videoWidth > 0) {
        cleanup();
        resolve();
      }
    });
  }
  async function ensureImageLoaded(img) {
    if (img.complete && img.naturalWidth > 0) {
      return;
    }
    console.log("[GenFlow] Image not loaded yet. Waiting...");
    await new Promise((resolve) => {
      const handleLoad = () => {
        cleanup();
        resolve();
      };
      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, 3000);
      const cleanup = () => {
        img.removeEventListener("load", handleLoad);
        clearTimeout(timeout);
      };
      img.addEventListener("load", handleLoad);
      if (img.complete && img.naturalWidth > 0) {
        cleanup();
        resolve();
      }
    });
  }
  function findMainPreviewImage(card) {
    const imgs = Array.from(card.querySelectorAll("img"));
    if (imgs.length === 0) return null;
    return imgs.sort((a, b) => {
      const areaA = (a.offsetWidth || 0) * (a.offsetHeight || 0) || (a.naturalWidth || 0) * (a.naturalHeight || 0);
      const areaB = (b.offsetWidth || 0) * (b.offsetHeight || 0) || (b.naturalWidth || 0) * (b.naturalHeight || 0);
      return areaB - areaA;
    })[0];
  }
  // Serializes the Flow card menu (three-dots -> resolution). Flow renders ONE global
  // popup menu, so two cards opening menus at once close each other ("Download option
  // not found"). We lock only the quick open+click; the slow upscale runs in parallel.
  let _flowMenuLock = Promise.resolve();
  // 500ms cooldown after a card RELEASES the menu before the next card may open it. The
  // single global popup (and its nested resolution submenu with 2K/4K) tears down and
  // re-renders asynchronously; without this pause the next card grabs it mid-render and
  // the resolution submenu is missing ("No resolution submenu") or the menu is empty
  // ("Download option not found") — the race the user described.
  const FLOW_MENU_COOLDOWN_MS = 500;
  function acquireFlowMenu() {
    let release;
    const prev = _flowMenuLock;
    _flowMenuLock = new Promise((r) => { release = r; });
    const releaseWithCooldown = () => { setTimeout(release, FLOW_MENU_COOLDOWN_MS); };
    return prev.then(() => releaseWithCooldown);
  }
  async function triggerFlowImageUpscaleDownload(card, targetQuality, prompt, targetImg = null) {
    console.log(`[GenFlow] Starting Flow image upscale download for quality: ${targetQuality}`);

    // Capture a STABLE image key BEFORE the Escape below. For Film EXTEND frames the
    // card was captured inside the focused/extend view; pressing Escape returns to the
    // gallery, which re-renders the tile with a new id and DETACHES the original `card`
    // node. A detached card has no working three-dots menu ("Download option not found"),
    // so the first upscale attempt fails and the frame only succeeds later via the
    // OnlyUpscale retry (which re-finds the card fresh) — a wasteful ~30-40s detour.
    // We pre-empt that here by re-resolving a live card from this key after Escape.
    const _preImg = targetImg || findMainPreviewImage(card);
    const _stableKey = _preImg && _preImg.src ? getUniqueImageKey(_preImg.src) : null;

    // Close any existing full-screen modals from previous iterations
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    document.body.click();
    await sleep(200);

    // If Escape detached the original card (Film extend view → gallery re-render),
    // re-find it fresh in the current DOM by the stable key. No-op for normal frames
    // (their gallery card stays attached) → zero regression for single/reference modes.
    if (_stableKey && !document.contains(card)) {
      let liveCard = null, liveImg = null;
      for (let _r = 0; _r < 12 && !liveCard; _r++) {
        liveImg = Array.from(document.querySelectorAll('img')).find((i) => i.src && getUniqueImageKey(i.src) === _stableKey);
        liveCard = liveImg ? liveImg.closest('[data-tile-id]') : null;
        if (liveCard) break;
        await sleep(250);
      }
      if (liveCard) {
        console.log(`[GenFlow] Re-resolved live card after extend-view exit (no detour)`);
        card = liveCard;
        targetImg = liveImg;
      } else {
        console.warn(`[GenFlow] Could not re-resolve live card after extend-view exit`);
      }
    }

    let img = targetImg || findMainPreviewImage(card);
    if (!img) {
      console.error("[GenFlow] No img found inside card");
      return { success: false };
    }
    await ensureImageLoaded(img);
    // At 6 threads the page renders slowly and the card may still hold a 0x0 placeholder
    // here — clicking 2K on a 0x0 image fails silently (no toast, no file = the "not all
    // downloaded" gaps). Poll up to ~10s and RE-QUERY the card for a real rendered image
    // (the result often appears as a NEW <img>). If it never renders, fail for a retry
    // instead of upscaling an empty image.
    {
      const _imgDeadline = Date.now() + 1e4;
      while ((!img || img.naturalWidth === 0) && Date.now() < _imgDeadline) {
        await sleep(400);
        const _fresh = findMainPreviewImage(card);
        if (_fresh) img = _fresh;
      }
    }
    if (!img || img.naturalWidth === 0) {
      console.warn(`[GenFlow] Image never rendered (0x0) for prompt #${prompt && prompt.number} — failing for retry (not upscaling empty)`);
      return { success: false };
    }
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    console.log(`[GenFlow] Image dimensions: ${width}x${height}`);
    let isAlreadyTarget = false;
    const targetLower = targetQuality.toLowerCase();
    const maxDim = Math.max(width, height);
    if ((targetLower.includes("original") || targetLower.includes("720") || targetLower.includes("1k")) && maxDim >= 1024) {
      isAlreadyTarget = true;
    } else if ((targetLower.includes("1080") || targetLower.includes("2k")) && maxDim >= 2048) {
      isAlreadyTarget = true;
    } else if (targetLower.includes("4k") && maxDim >= 4096) {
      isAlreadyTarget = true;
    }
    if (isAlreadyTarget) {
      console.log(`[GenFlow] Image is already upscaled (${width}x${height}). Downloading directly...`);
      const upscaledUrl = img.src ? normalizeMediaUrl(img.src) : null;
      if (upscaledUrl) {
        const regRes = await chrome.runtime.sendMessage({
          type: "REGISTER_FILENAME_FOR_PROMPT",
          payload: {
            promptId: prompt.id,
            promptNumber: prompt.number,
            url: upscaledUrl,
            isVideo: false
          }
        }).catch(() => {});
        const filename = regRes?.filename;
        await chrome.runtime.sendMessage({
          type: "DOWNLOAD_RESULT",
          payload: { url: upscaledUrl, filename }
        }).catch(() => {});
        // Verify the file actually landed (the direct URL can be deduped/stale and
        // silently produce nothing). If not, fail so it goes to Failed(download) and
        // retries via OnlyUpscale — never a silent done.
        let _recd = false;
        for (let _t = 0; _t < 10 && !_recd; _t++) {
          try { const _r = await chrome.runtime.sendMessage({ type: "WAS_DOWNLOAD_RECEIVED", payload: { promptId: prompt.id } }); _recd = !!(_r && _r.received); } catch (e) {}
          if (_recd) break;
          await sleep(1000);
        }
        if (_recd) return { success: true, upscaledUrl };
        console.warn(`[GenFlow] prompt #${prompt.number}: already-2K direct download didn't land -> Failed(download)`);
        return { success: false };
      }
    }
    let downloadItemEl = null;
    const openAndGetSubmenu = async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      document.body.click();
      await sleep(200);

      // Bring the card into view first — Flow's three-dots/menu often won't open for cards
      // that are scrolled out of the interactable area ("Download option not found").
      try { card.scrollIntoView({ block: "center", inline: "center" }); } catch (e) {}
      await sleep(350);

      // Hover all container elements inside the card to reveal three-dots
      const containers = Array.from(card.querySelectorAll('div, a, button, span'));
      containers.push(card);
      for (const el of containers) {
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
      await sleep(400);

      // Find three-dots button
      let btn = null;
      if (targetImg) {
        let current = targetImg.parentElement;
        while (current && current !== card && current !== document.body) {
           const b = Array.from(current.querySelectorAll('button')).find(b => {
             const icon = b.querySelector('i');
             return (icon && icon.textContent.includes('more_vert')) || b.getAttribute('aria-haspopup') === 'menu';
           });
           if (b) { btn = b; break; }
           current = current.parentElement;
        }
      }
      if (!btn) {
        btn = Array.from(card.querySelectorAll('button')).find(b => {
          const icon = b.querySelector('i');
          return (icon && icon.textContent.includes('more_vert')) || b.getAttribute('aria-haspopup') === 'menu';
        });
      }

      if (!btn) {
        console.warn("[GenFlow] Three dots button not found after hover, falling back to contextmenu");
        const img = targetImg || findMainPreviewImage(card);
        if (!img) return null;
        const rect = img.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const opts = { bubbles: true, composed: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: x, clientY: y };
        img.dispatchEvent(new MouseEvent("contextmenu", opts));
        await sleep(600);
      } else {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const pointerOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, pointerId: 1, isPrimary: true };
        const clickOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy };
        btn.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
        btn.dispatchEvent(new MouseEvent('mousedown', clickOpts));
        btn.dispatchEvent(new PointerEvent('pointerup', pointerOpts));
        btn.dispatchEvent(new MouseEvent('mouseup', clickOpts));
        btn.dispatchEvent(new MouseEvent('click', clickOpts));
        await sleep(600);
      }

      const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [class*="menuitem" i]'));
      const downloadItem = menuItems.find(item => /скачать|download/i.test(item.textContent));
      if (!downloadItem) {
        console.error("[GenFlow] Download option not found in card menu");
        return null;
      }
      downloadItemEl = downloadItem;
      downloadItem.focus();
      downloadItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
      downloadItem.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
      await sleep(600);
      return Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [class*="menuitem" i]'));
    };
    const _releaseMenu = await acquireFlowMenu();
    let submenuItems = null;
    for (let _attempt = 0; _attempt < 5 && !submenuItems; _attempt++) {
      if (_attempt > 0) {
        console.log(`[GenFlow] Retry opening download menu (attempt ${_attempt + 1}/5)`);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
        document.body.click();
        await sleep(900);
      }
      submenuItems = await openAndGetSubmenu();
    }
    if (!submenuItems) {
      console.error("[GenFlow] Failed to open download submenu after retries");
      _releaseMenu();
      return { success: false };
    }
    const qPart = targetQuality.toLowerCase();
    const targetOption = submenuItems.find((item) => {
      const text = item.textContent.toLowerCase();
      return text.includes(qPart);
    });
    if (!targetOption) {
      // Requested resolution (e.g. 2K) is not in the submenu — under menu contention it
      // usually just hasn't rendered yet (the resolution submenu is a nested popup that
      // appears a beat after "Download"). NEVER download a substitute (1K) when the
      // requested quality is missing — fail so it retries via Failed(download). The retry
      // + the 500ms menu cooldown give the submenu time to appear. (User rule: if the
      // requested quality isn't there, don't grab a different one — retry for the real 2K.)
      console.warn(`[GenFlow] Requested quality ${targetQuality} not in submenu — failing for retry (NO 1K substitute)`);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      _releaseMenu();
      return { success: false };
    }
    // Мы объединили ветки: всегда кликаем на опцию качества.
    // Если появляется тост начала апскейла (на русском, английском или японском), мы ждем его завершения.
    // Если тоста нет (файл уже был апскейлен ранее или скачивается сразу), мы завершаем выполнение без ожидания.
    console.log(`[GenFlow] Clicking image quality option: ${targetOption.textContent.trim()}`);
    // Tell the upsample hook which prompt this source image belongs to, so the 2K
    // response it intercepts is saved under the correct filename.
    // Announce the claim to the MAIN-world hook BEFORE clicking 2K. We hold the menu lock,
    // so this claim maps to the very next upsampleImage request. The awaits below (START_
    // EXPECTING / ALLOW_NEXT) give the postMessage time to reach the hook before Flow's fetch.
    window.postMessage({ __gfClaim: true, promptId: prompt.id, promptNumber: prompt.number }, "*");
    console.log(`[GenFlow] upscale claim announced for prompt #${prompt.number}`);
    await chrome.runtime.sendMessage({ type: "START_EXPECTING_DOWNLOAD", payload: { promptId: prompt.id } }).catch(() => {});
    await chrome.runtime.sendMessage({ type: "ALLOW_NEXT_DOWNLOADS" }).catch(() => {});
    chrome.runtime.sendMessage({ type: "UPDATE_PROMPT_INFO", payload: { promptId: prompt.id, info: `Upscaling ${targetQuality.toUpperCase()}...` } }).catch(() => {});
    targetOption.click();
    await sleep(800);
    // Menu interaction done (menu closed after the click) — release so the next card
    // can open its menu while THIS card's upscale runs in parallel.
    _releaseMenu();
    // Check for immediate error BEFORE checking upscale toast
    const immediateErrMsg = findFlowErrorMessage();
    if (immediateErrMsg) {
      console.error("[GenFlow] Immediate Flow error after quality click:", immediateErrMsg);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      throw new Error(immediateErrMsg);
    }
    const getToast = () => {
      const all = document.querySelectorAll("*");
      for (const el of all) {
        if (el.children.length === 0) {
          const txt = el.textContent || "";
          // Поддерживаем тосты на русском, английском и японском языках
          if (/повышаем разрешение|повышаем|увеличение разрешения|increasing.*resolution|upscal|解像度|アップスケー|向上|高画質/i.test(txt) && isVisible2(el)) {
            return el;
          }
        }
      }
      return null;
    };
    let toast = getToast();
    if (toast) {
      // PIPELINE: the 2K upscale is running server-side and the MAIN-world hook will
      // deliver the file. Don't block the slot ~15s waiting for the toast to clear —
      // register the filename and hand off to the background pipeline (downloadPending)
      // so the slot frees NOW and the next prompt generates. completeGeneration forwards
      // downloadPending; background marks "completed" only when the file actually lands.
      console.log("[GenFlow] Upscaling started — pipelining (slot freed, hook delivers 2K).");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      const _pImg = targetImg || findMainPreviewImage(card);
      const _pUrl = _pImg ? normalizeMediaUrl(_pImg.src) : null;
      if (_pUrl) {
        await chrome.runtime.sendMessage({ type: "REGISTER_FILENAME_FOR_PROMPT", payload: { promptId: prompt.id, promptNumber: prompt.number, url: _pUrl, isVideo: false } }).catch(() => {});
      }
      // Brief poll — if the 2K is already cached it lands in ~1-2s; otherwise advance and
      // let the hook + background pipeline finish it (watchdog re-downloads if it never lands).
      let _rcv = false;
      for (let _t = 0; _t < 3; _t++) {
        try { const _r = await chrome.runtime.sendMessage({ type: "WAS_DOWNLOAD_RECEIVED", payload: { promptId: prompt.id } }); _rcv = !!(_r && _r.received); } catch (e) {}
        if (_rcv) break;
        await sleep(1000);
      }
      return _rcv ? { success: true, upscaledUrl: _pUrl } : { success: true, downloadPending: true, upscaledUrl: _pUrl };
    } else {
      // No upscale toast — wait a bit and re-check for delayed errors
      await sleep(1500);
      const delayedErrMsg = findFlowErrorMessage();
      if (delayedErrMsg) {
        console.error("[GenFlow] Delayed Flow error detected after quality click:", delayedErrMsg);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
        throw new Error(delayedErrMsg);
      }
      console.log("[GenFlow] No upscaling toast detected. Image was already upscaled or downloaded immediately.");
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    await sleep(1000);
    
    // Находим элемент изображения в карточке и нормализуем его URL для регистрации имени файла и скачивания
    const upscaledImg = targetImg || findMainPreviewImage(card);
    const upscaledUrl = upscaledImg ? normalizeMediaUrl(upscaledImg.src) : null;
    if (upscaledUrl) {
      const regRes = await chrome.runtime.sendMessage({
        type: "REGISTER_FILENAME_FOR_PROMPT",
        payload: {
          promptId: prompt.id,
          promptNumber: prompt.number,
          url: upscaledUrl,
          isVideo: false
        }
      }).catch(() => {});
      // The MAIN-world hook intercepts the upsampleImage response and saves the 2K via
      // UPSCALE_DOWNLOAD (which sets downloadReceivedForPrompt). Poll for that.
      // FILM PIPELINE: the upscale CLICK already fired and the menu lock is released, so
      // the page is free and the next chained frame (which only needs the *generated*
      // previous card, already in the gallery) can start NOW. Don't block the chain ~15s
      // waiting for the 2K bytes — poll briefly, then advance and let the download finish
      // in the background. The end-of-run checklist re-upscales any that never land
      // (downloadReceivedForPrompt is set only on a REAL download), so no silent loss.
      // PIPELINE (ALL modes, not just film): after the 2K click, poll briefly for an
      // already-cached file; if it hasn't landed yet, ADVANCE — free the slot and go to
      // the next prompt — and let the MAIN-world hook + background pipeline finish the
      // download. Background marks the prompt completed ONLY when the file truly arrives
      // (completeIfDownloading), or routes it to Failed(download) via the 45s watchdog.
      // So "move forward" never loses a file. This is what makes 6 threads actually fast:
      // the slot is held only for the ~quick click, not the whole download.
      const _maxTicks = 3;
      let received = false;
      for (let t = 0; t < _maxTicks; t++) {
        try {
          const r = await chrome.runtime.sendMessage({ type: "WAS_DOWNLOAD_RECEIVED", payload: { promptId: prompt.id } });
          received = !!(r && r.received);
        } catch (e) {}
        if (received) break;
        await sleep(1000);
      }
      if (!received) {
        console.log(`[GenFlow] prompt #${prompt.number}: 2K still downloading — advancing (slot freed, background completes on file arrival)`);
        return { success: true, downloadPending: true, upscaledUrl };
      }
    }
    return { success: true, upscaledUrl };
  }
  async function waitForImageGenerationComplete(prompt, slotId, timeoutMs = 3 * 60 * 1e3, createButtonClickTime = Date.now(), preGenerationImageSrcs = snapshotImageSources(), referenceImageUrls = /* @__PURE__ */ new Set(), ownCardTileIds, settings) {
    console.log(`[GenFlow] Banana: Starting generation monitoring for prompt #${prompt.number} (slotId: ${slotId})`);
    console.log(`[GenFlow] Banana: Pre-gen snapshot has ${preGenerationImageSrcs.size} images (includes reference URLs)`);
    ensureGlobalMediaObserver();
    const existingInstance = monitoringInstances.get(slotId);
    if (existingInstance) {
      if (existingInstance.checkInterval)
        clearInterval(existingInstance.checkInterval);
    }
    const mergedPreGenSrcs = new Set(preGenerationImageSrcs);
    for (const [, existingInst] of monitoringInstances) {
      existingInst.preGenerationImageSrcs.forEach((u) => mergedPreGenSrcs.add(u));
    }
    const mergedPreGenNames = /* @__PURE__ */ new Set();
    for (const u of mergedPreGenSrcs) {
      const n = extractMediaNameFromUrl(u);
      if (n)
        mergedPreGenNames.add(n);
    }
    const instance = {
      promptId: prompt.id,
      promptNumber: prompt.number,
      promptText: prompt.text || "",
      slotId,
      checkInterval: null,
      observer: null,
      preGenerationImageSrcs: mergedPreGenSrcs,
      preGenerationMediaNames: mergedPreGenNames,
      createButtonClickTime,
      detectedImageUrls: /* @__PURE__ */ new Set(),
      claimedImageUrl: null,
      ownCardTileIds: ownCardTileIds ?? [],
      isComplete: false
    };
    monitoringInstances.set(slotId, instance);
    return new Promise((resolve, reject) => {
      let resolved = false;
      const cleanup = (failed = false) => {
        if (instance.checkInterval) {
          clearInterval(instance.checkInterval);
          instance.checkInterval = null;
        }
        if (failed && instance.claimedImageUrl) {
          const claimedUrl = instance.claimedImageUrl;
          claimedImageUrls.delete(claimedUrl);
          const name = extractMediaNameFromUrl(claimedUrl);
          if (name)
            claimedMediaNames.delete(name);
          console.log(`[GenFlow] Banana: Slot ${slotId} (prompt #${instance.promptNumber}) released claim on failure`);
        }
        monitoringInstances.delete(slotId);
      };
      const completeGeneration = async (imageUrl) => {
        if (resolved || completedPromptIds.has(prompt.id)) {
          console.log(`[GenFlow] Banana: Prompt #${prompt.number} already completed, skipping`);
          return;
        }
        resolved = true;
        completedPromptIds.add(prompt.id);
        console.log("[GenFlow] Banana: Verifying completion...");
        await sleep(2e3);
        const recheck = checkGenerationStatusForSlot(slotId, settings);
        if (!recheck.isComplete) {
          console.log("[GenFlow] Banana: Double verification failed, continuing to monitor");
          resolved = false;
          completedPromptIds.delete(prompt.id);
          return;
        }
        const instanceForUrl = monitoringInstances.get(slotId);
        const finalUrl = instanceForUrl?.claimedImageUrl ?? recheck.imageUrl ?? imageUrl ?? null;
        if (monitoringInstances.size > 1 && !instanceForUrl?.claimedImageUrl) {
          console.log(`[GenFlow] Banana: Multi-slot: slot ${slotId} has no claimed image, ignoring completion`);
          resolved = false;
          completedPromptIds.delete(prompt.id);
          return;
        }
        let urlForSend = finalUrl;
        const isSingleSlot = monitoringInstances.size <= 1;
        const MAX_WAIT_MS = isSingleSlot ? 12e3 : 6e3;
        const POLL_MS = 1e3;
        const startWait = Date.now();
        while (urlForSend && !extractMediaNameFromUrl(urlForSend) && Date.now() - startWait < MAX_WAIT_MS) {
          await sleep(POLL_MS);
          const again = checkGenerationStatusForSlot(slotId, settings);
          urlForSend = again.imageUrl ?? urlForSend;
        }
        const promptNumberForFile = prompt.number;
        let resultUrlToSend = urlForSend ? getDownloadUrlForImage(urlForSend) : "";
        let downloadedFlag = false;
        let _downloadPending = false; // pipeline: 2K click fired, file lands async via the hook
        // Honor the auto-download toggle: when OFF, skip the whole upscale+download
        // block (Flow download click / CODE_OUTPUT) — just report the base result URL
        // so the user can download it manually. Mirrors the veo.js video gate.
        if (isFlowHost() && settings && settings.autoDownload !== false) {
          const cardsToProcess = [];
          if (instanceForUrl?.ownCardTileIds && instanceForUrl.ownCardTileIds.length > 0) {
            for (const tileId of instanceForUrl.ownCardTileIds) {
              const cardEl = document.querySelector(`[data-tile-id="${tileId}"]`);
              if (cardEl && !cardsToProcess.includes(cardEl)) {
                cardsToProcess.push(cardEl);
              }
            }
          }
          if (cardsToProcess.length === 0 && urlForSend) {
            const targetKey = getUniqueImageKey(urlForSend);
            let img = Array.from(document.querySelectorAll('img')).find(i => i.src && getUniqueImageKey(i.src) === targetKey);
            const cardEl = img ? img.closest('[data-tile-id]') : null;
            if (cardEl) {
              cardsToProcess.push(cardEl);
            }
          }
          
          console.log(`[GenFlow] Banana: Found ${cardsToProcess.length} cards to process.`);
          
          if (cardsToProcess.length > 0) {
            let upscaleFailed = false;
            let upscaleErrMsg = "Failed to upscale resolution";
            let upscaledUrls = [];
            
            for (let cIdx = 0; cIdx < cardsToProcess.length; cIdx++) {
              const card = cardsToProcess[cIdx];
              console.log(`[GenFlow] Banana: Processing card ${cIdx + 1}/${cardsToProcess.length}`);
              const getFreshCardImgs = () => {
                const uniqueKeys = new Set();
                const freshImgs = [];
                const rawImgs = Array.from(card.querySelectorAll('img'));
                for (const img of rawImgs) {
                  const src = img.src;
                  if (!src) continue;
                  const url = normalizeMediaUrl(src);
                  const name = extractMediaNameFromUrl(url);
                  
                  const key = name || url;
                  if (uniqueKeys.has(key)) continue;
                  
                  if (name && instance.preGenerationMediaNames.has(name)) continue;
                  if (instance.preGenerationImageSrcs.has(url)) continue;
                  if (name && globalReferenceMediaNames.has(name)) continue;
                  if (globalReferenceImageUrls.has(url)) continue;
                  
                  uniqueKeys.add(key);
                  freshImgs.push(img);
                }
                return freshImgs;
              };

              let cardImgs = getFreshCardImgs();
              // Orphan-sweep guard: a Banana card produces ONE image (x2 = separate cards).
              // After a big batch the page gallery holds many results whose URLs/names drift
              // from the pre-gen snapshot, so getFreshCardImgs can return dozens of "fresh"
              // images for one card — a retry would then download all of them under this
              // prompt's name (the 26-duplicate bug). Never download more than 1 per card.
              if (cardImgs.length > 1) {
                console.warn(`[GenFlow] Banana: ${cardImgs.length} fresh imgs in one card for prompt #${prompt.number} — capping to 1 (orphan-sweep guard)`);
                cardImgs = cardImgs.slice(0, 1);
              }
              const initialCardImgs = cardImgs;
              console.log(`[GenFlow] Found ${initialCardImgs.length} generated images in card to upscale/download`);

              if (initialCardImgs.length > 0) {
                for (let idx = 0; idx < initialCardImgs.length; idx++) {
                  const freshImgs = getFreshCardImgs();
                  const targetImg = freshImgs[idx] || initialCardImgs[idx];
                  console.log(`[GenFlow] Processing image ${idx + 1}/${initialCardImgs.length} in card`);
                  try {
                    if (settings.outputMethod === "code") {
                      // Hybrid: base image is in the card; upscale + download by API in background.
                      chrome.runtime.sendMessage({ type: "CODE_OUTPUT", payload: { promptId: prompt.id, promptNumber: prompt.number, resultUrl: (targetImg && targetImg.src) || prompt.resultUrl, isVideo: false, text: prompt.text, subIndex: (cIdx * initialCardImgs.length) + idx + 1 } });
                      _downloadPending = true;
                    } else {
                      const res = await triggerFlowImageUpscaleDownload(card, settings.imageQuality || "1k", prompt, targetImg);
                      if (res && res.success) {
                        if (res.downloadPending) _downloadPending = true; else downloadedFlag = true;
                        if (res.upscaledUrl) {
                          upscaledUrls.push(getDownloadUrlForImage(res.upscaledUrl));
                        }
                      } else {
                        upscaleFailed = true;
                      }
                    }
                  } catch (err) {
                    console.error(`[GenFlow] Error during Flow image upscale download for image ${idx + 1} in card:`, err);
                    upscaleFailed = true;
                    upscaleErrMsg = err.message || upscaleErrMsg;
                  }
                }
              } else {
                try {
                  if (settings.outputMethod === "code") {
                    chrome.runtime.sendMessage({ type: "CODE_OUTPUT", payload: { promptId: prompt.id, promptNumber: prompt.number, resultUrl: prompt.resultUrl, isVideo: false, text: prompt.text, subIndex: cIdx + 1 } });
                    _downloadPending = true;
                  } else {
                  const res = await triggerFlowImageUpscaleDownload(card, settings.imageQuality || "1k", prompt);
                  if (res && res.success) {
                    if (res.downloadPending) _downloadPending = true; else downloadedFlag = true;
                    if (res.upscaledUrl) {
                      upscaledUrls.push(getDownloadUrlForImage(res.upscaledUrl));
                    }
                  } else {
                    upscaleFailed = true;
                  }
                  }
                } catch (err) {
                  console.error("[GenFlow] Error during Flow image upscale download (fallback) in card:", err);
                  upscaleFailed = true;
                  upscaleErrMsg = err.message || upscaleErrMsg;
                }
              }
            }

            // Close any left-open modals after processing all cards
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
            document.body.click();

            if (upscaledUrls.length > 0) {
              resultUrlToSend = upscaledUrls.join(",");
            }

            if (upscaleFailed) {
              // 2K only — NEVER save a 1K native copy (that caused 1K+2K duplicates).
              // If Flow actually delivered the 2K download already, just complete (no
              // retry → no second 2K either). Otherwise fail so the 2K upscale retries.
              let received = false;
              try {
                const r = await chrome.runtime.sendMessage({ type: "WAS_DOWNLOAD_RECEIVED", payload: { promptId: prompt.id } });
                received = !!(r && r.received);
              } catch (e) {}
              if (received) {
                console.log(`[GenFlow] Banana: upscale flagged failure but 2K download already received for prompt #${promptNumberForFile}; completing without retry`);
                downloadedFlag = true;
              } else {
                let resultUrls = [resultUrlToSend];
                if (instanceForUrl?.detectedImageUrls && instanceForUrl.detectedImageUrls.size > 0) {
                  resultUrls = Array.from(instanceForUrl.detectedImageUrls).map(getDownloadUrlForImage);
                }
                const resultUrlStr = resultUrls.filter(Boolean).join(",");
                await failGeneration(upscaleErrMsg, "UPSCALE_FAILED", resultUrlStr);
                return;
              }
            }
          } else {
            // Card for upscale not found -> the prompt generated but we couldn't trigger
            // its 2K. Do NOT silently complete. Fail as a DOWNLOAD failure with the image
            // URL so it retries via OnlyUpscale (re-upscale existing image, NO re-generate)
            // and, if it still can't, shows in "Failed (download)".
            const _rs = resultUrlToSend || (urlForSend ? getDownloadUrlForImage(urlForSend) : "");
            console.warn(`[GenFlow] Banana: no card to upscale for prompt #${promptNumberForFile} -> Failed(download) (url=${_rs ? "yes" : "none"})`);
            await failGeneration("2K upscale could not be triggered", "UPSCALE_FAILED", _rs);
            return;
          }
        }
        // Silent-loss guard: on Flow, if NO file was downloaded for this image (the
        // upscale/download block was skipped — settings briefly unavailable, or a 6-thread
        // menu race) AND none arrived via the MAIN-world hook, do NOT complete silently —
        // that loses the prompt with no Failed entry (the "6/9" gap). Route to
        // Failed(download) with the image URL so it retries via OnlyUpscale (re-download).
        if (isFlowHost() && !downloadedFlag && !_downloadPending && settings && settings.autoDownload !== false) {
          let _rcv = false;
          try {
            const _r = await chrome.runtime.sendMessage({ type: "WAS_DOWNLOAD_RECEIVED", payload: { promptId: prompt.id } });
            _rcv = !!(_r && _r.received);
          } catch (e) {}
          if (!_rcv) {
            const _rs2 = resultUrlToSend || (urlForSend ? getDownloadUrlForImage(urlForSend) : "");
            console.warn(`[GenFlow] Banana: prompt #${promptNumberForFile} completed with NO downloaded file -> Failed(download) (silent-loss guard)`);
            await failGeneration("Download did not complete", "UPSCALE_FAILED", _rs2);
            return;
          }
        }
        cleanup(false);
        if (!resultUrlToSend || !extractMediaNameFromUrl(urlForSend ?? "")) {
          console.warn("[GenFlow] Banana: No valid redirect URL for download; completion will still be sent so queue advances");
        }
        console.log(`[GenFlow] Banana: Generation complete for prompt #${promptNumberForFile}`);
        let messageSent = false;
        for (let retry = 0; retry < 3; retry++) {
          try {
            await chrome.runtime.sendMessage({
              type: "GENERATION_COMPLETE",
              payload: {
                promptId: prompt.id,
                resultUrl: resultUrlToSend,
                downloaded: downloadedFlag,
                downloadPending: _downloadPending,
                promptNumber: promptNumberForFile,
                partial: (instance.failedTileIds && instance.failedTileIds.size > 0) ? { expected: (instance.ownCardTileIds ? instance.ownCardTileIds.length : 0), failed: instance.failedTileIds.size, suspicious: /подозрительн|suspicious/i.test(instance.lastCardError || ""), tileIds: Array.from(instance.failedTileIds) } : void 0
              }
            });
            messageSent = true;
            break;
          } catch (err) {
            console.error(`[GenFlow] Banana: Failed to send GENERATION_COMPLETE (attempt ${retry + 1}/3):`, err);
            if (retry < 2)
              await sleep(1e3 * (retry + 1));
          }
        }
        if (!messageSent) {
          console.error(`[GenFlow] Banana: CRITICAL: Failed to send GENERATION_COMPLETE after 3 attempts for prompt #${promptNumberForFile}`);
        }
        if (messageSent) {
          try {
            await chrome.runtime.sendMessage({ type: "REQUEST_NEXT_PROMPT" });
          } catch (_) {
          }
        }
        resolve();
      };
      const failGeneration = async (error, errorType, resultUrl) => {
        if (resolved && errorType !== "UPSCALE_FAILED")
          return;
        resolved = true;
        cleanup(true);
        console.log(`[GenFlow] Generation failed: ${error}`);
        const payload = { promptId: prompt.id, error };
        if (errorType) payload.errorType = errorType;
        if (resultUrl) payload.resultUrl = resultUrl;
        chrome.runtime.sendMessage({
          type: "GENERATION_FAILED",
          payload
        });
        reject(new Error(error));
      };
      const startTime = Date.now();
      // Watchdog helper: find a finished, unclaimed generated image anywhere in the
      // gallery. Used to rescue an orphaned slot whose card never got claimed (e.g.
      // identical prompts racing). Any unclaimed settled result is a valid match —
      // the filename uses THIS slot's own prompt number.
      const findUnclaimedFinishedImageUrl = () => {
        const unionPreGen = /* @__PURE__ */ new Set();
        const unionPreGenNames = /* @__PURE__ */ new Set();
        for (const inst of monitoringInstances.values()) {
          for (const u of inst.preGenerationImageSrcs) unionPreGen.add(u);
          for (const n of inst.preGenerationMediaNames) unionPreGenNames.add(n);
        }
        for (const u of globalReferenceImageUrls) unionPreGen.add(u);
        for (const n of globalReferenceMediaNames) unionPreGenNames.add(n);
        const candidates = collectNewImageUrlsInOrder(unionPreGen);
        for (const url of candidates) {
          if (unionPreGen.has(url)) continue;
          const name = extractMediaNameFromUrl(url);
          if (!name) continue;
          if (unionPreGenNames.has(name)) continue;
          if (globalReferenceMediaNames.has(name)) continue;
          if (claimedMediaNames.has(name)) continue;
          if (claimedImageUrls.has(url)) continue;
          // Only grab images whose card has settled (not still generating).
          const img = document.querySelector(`img[src*="${name}"]`);
          const card = img ? img.closest('[data-tile-id]') : null;
          if (card && checkLoadingIndicators(card)) continue;
          return url;
        }
        return null;
      };
      const initialDelay = async () => {
        const INITIAL_DELAY = 5e3;
        const CHECK_INTERVAL = 2e3;
        const start = Date.now();
        while (Date.now() - start < INITIAL_DELAY) {
          if (resolved)
            return;
          if (!monitoringInstances.has(slotId) || monitoringInstances.get(slotId)?.promptId !== prompt.id) {
            return;
          }
          const currentInst = monitoringInstances.get(slotId);
          if (currentInst?.isComplete) {
            await completeGeneration(currentInst.claimedImageUrl);
            return;
          }
          const early = checkGenerationStatusForSlot(slotId, settings);
          if (early.hasError) {
            await failGeneration(early.errorMessage || "Generation failed");
            return;
          }
          if (early.isComplete) {
            await completeGeneration(early.imageUrl || void 0);
            return;
          }
          await sleep(CHECK_INTERVAL);
        }
      };
      initialDelay().then(() => {
        if (resolved)
          return;
        if (!monitoringInstances.has(slotId) || monitoringInstances.get(slotId)?.promptId !== prompt.id) {
          return;
        }
        instance.checkInterval = setInterval(() => {
          if (resolved)
            return;
          if (!monitoringInstances.has(slotId) || monitoringInstances.get(slotId)?.promptId !== prompt.id) {
            console.log(`[GenFlow] Monitoring instance for prompt #${prompt.number} was cleaned up, stopping...`);
            clearInterval(instance.checkInterval);
            return;
          }
          const currentInst = monitoringInstances.get(slotId);
          if (currentInst?.isComplete) {
            completeGeneration(currentInst.claimedImageUrl);
            return;
          }
          const s = checkGenerationStatusForSlot(slotId, settings);
          if (s.hasError) {
            failGeneration(s.errorMessage || "Generation failed");
            return;
          }
          if (s.isComplete) {
            completeGeneration(s.imageUrl || void 0);
            return;
          }
          // Watchdog: slot has been monitoring a while with no claimed image (orphaned
          // by a claim race on identical prompts). If a finished, unclaimed result is
          // sitting in the gallery, grab it, mark complete and let completeGeneration
          // download the whole card. Prevents a prompt from hanging until timeout.
          const wdInst = monitoringInstances.get(slotId);
          if (wdInst && !wdInst.claimedImageUrl && Date.now() - startTime > 40000) {
            const grab = findUnclaimedFinishedImageUrl();
            if (grab) {
              console.warn(`[GenFlow] Banana: WATCHDOG rescued orphaned slot ${slotId} (prompt #${prompt.number}) -> ${grab.substring(0, 80)}`);
              claimedImageUrls.set(grab, slotId);
              const gname = extractMediaNameFromUrl(grab);
              if (gname) claimedMediaNames.set(gname, slotId);
              wdInst.claimedImageUrl = grab;
              wdInst.isComplete = true;
              addUniqueUrlToSet(wdInst.detectedImageUrls, grab);
              completeGeneration(grab);
              return;
            }
          }
          if (Date.now() - startTime > timeoutMs) {
            // Last-ditch before failing: the monitor timed out, but the prompt's OWN card
            // may actually hold a finished image (contention / claim race just blocked the
            // normal completion path — "ready photo in Failed"). If a real, unclaimed image
            // is on its own card, complete it (download the real photo) instead of failing,
            // so Retry never re-GENERATES a duplicate.
            const _toInst = monitoringInstances.get(slotId);
            let _ownU = null;
            if (_toInst && _toInst.ownCardTileIds && _toInst.ownCardTileIds.length) {
              for (const _tid of _toInst.ownCardTileIds) {
                const _cardEl = document.querySelector(`[data-tile-id="${_tid}"]`);
                const _img = _cardEl ? findMainPreviewImage(_cardEl) : null;
                if (_img && _img.naturalWidth > 0 && _img.src) {
                  const _u = normalizeMediaUrl(_img.src);
                  const _nm = extractMediaNameFromUrl(_u);
                  if (_u && !_toInst.preGenerationImageSrcs.has(_u) && !(_nm && _toInst.preGenerationMediaNames.has(_nm)) && !claimedImageUrls.has(_u)) {
                    _ownU = _u; break;
                  }
                }
              }
            }
            if (_ownU) {
              console.warn(`[GenFlow] Banana: timeout but prompt #${prompt.number} own card has a finished image — completing (download) instead of failing`);
              claimedImageUrls.set(_ownU, slotId);
              const _gn = extractMediaNameFromUrl(_ownU);
              if (_gn) claimedMediaNames.set(_gn, slotId);
              _toInst.claimedImageUrl = _ownU;
              _toInst.isComplete = true;
              addUniqueUrlToSet(_toInst.detectedImageUrls, _ownU);
              completeGeneration(_ownU);
              return;
            }
            failGeneration("Generation timed out");
          }
        }, 2e3);
      });
    });
  }
  let isDownloadingAll = false;

  async function triggerFlowUpscaleDownload(card, targetQuality, prompt) {
    console.log(`[GenFlow] Starting upscale/download for quality: ${targetQuality}`);
    const video = card.querySelector('video');
    if (!video) {
      console.error("[GenFlow] No video element found inside the card for download");
      return { success: false };
    }
    await ensureVideoMetadataLoaded(video);
    const width = video.videoWidth;
    const height = video.videoHeight;
    console.log(`[GenFlow] Video dimensions: ${width}x${height}`);
    let isAlreadyTarget = false;
    const targetLower = targetQuality.toLowerCase();
    if (targetLower.includes("720") && width >= 1280) {
      isAlreadyTarget = true;
    } else if (targetLower.includes("1080") && width >= 1920) {
      isAlreadyTarget = true;
    } else if (targetLower.includes("4k") && width >= 3840) {
      isAlreadyTarget = true;
    }
    if (isAlreadyTarget) {
      console.log(`[GenFlow] Video is already upscaled (${width}x${height}). Downloading directly...`);
      const rawUrl = video.src || video.querySelector('source')?.src;
      const upscaledUrl = rawUrl ? normalizeMediaUrl(rawUrl) : null;
      if (upscaledUrl) {
        const regRes = await chrome.runtime.sendMessage({
          type: "REGISTER_FILENAME_FOR_PROMPT",
          payload: {
            promptId: prompt.id,
            promptNumber: prompt.number,
            url: upscaledUrl,
            isVideo: true
          }
        }).catch(() => {});
        const filename = regRes?.filename;
        await chrome.runtime.sendMessage({
          type: "DOWNLOAD_RESULT",
          payload: { url: upscaledUrl, filename }
        }).catch(() => {});
        return { success: true, upscaledUrl };
      }
    }
    let downloadItemEl = null;
    const openAndGetSubmenu = async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', keyCode: 27, bubbles: true }));
      document.body.click();
      await sleep(300);

      // Hover all container elements inside the card to reveal three-dots
      const containers = Array.from(card.querySelectorAll('div, a, button, span'));
      containers.push(card);
      for (const el of containers) {
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
      await sleep(400);

      // Find three-dots button
      const btn = Array.from(card.querySelectorAll('button')).find(b => {
        const icon = b.querySelector('i');
        return (icon && icon.textContent.includes('more_vert')) || b.getAttribute('aria-haspopup') === 'menu';
      });

      if (!btn) {
        console.warn("[GenFlow] Three dots button not found after hover, falling back to contextmenu");
        const rect = video.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const opts = { bubbles: true, composed: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: x, clientY: y };
        video.dispatchEvent(new MouseEvent('contextmenu', opts));
        await sleep(600);
      } else {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const pointerOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, pointerId: 1, isPrimary: true };
        const clickOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy };
        btn.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
        btn.dispatchEvent(new MouseEvent('mousedown', clickOpts));
        btn.dispatchEvent(new PointerEvent('pointerup', pointerOpts));
        btn.dispatchEvent(new MouseEvent('mouseup', clickOpts));
        btn.dispatchEvent(new MouseEvent('click', clickOpts));
        await sleep(600);
      }

      const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [class*="menuitem" i]'));
      const downloadItem = menuItems.find(item => /download|скачать/i.test(item.textContent));
      if (!downloadItem) {
        console.error("[GenFlow] Download option not found in card menu");
        return null;
      }
      downloadItemEl = downloadItem;
      downloadItem.focus();
      downloadItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
      downloadItem.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
      await sleep(600);
      return Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [class*="menuitem" i]'));
    };
    let submenuItems = await openAndGetSubmenu();
    if (!submenuItems)
      return { success: false };
    const targetQStr = targetQuality.replace("p", "");
    let targetOption = submenuItems.find((item) => item.textContent.includes(targetQStr));
    if (!targetOption) {
      console.warn(`[GenFlow] Target quality ${targetQuality} not found in submenu, falling back to 720p`);
      targetOption = submenuItems.find((item) => item.textContent.includes("720"));
    }
    if (!targetOption) {
      const hasAnyResolution = submenuItems.some(item => /(720|1080|4k|2k|1k)/i.test(item.textContent));
      if (!hasAnyResolution && downloadItemEl) {
        console.log("[GenFlow] No resolution submenu found (compiled scene/film clip). Downloading directly...");
        await chrome.runtime.sendMessage({ type: "START_EXPECTING_DOWNLOAD", payload: { promptId: prompt.id } }).catch(() => {});
        await chrome.runtime.sendMessage({ type: "ALLOW_NEXT_DOWNLOADS" }).catch(() => {});
        downloadItemEl.click();
        await sleep(1000);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));

        const videoEl = card.querySelector('video');
        const upscaledUrl = videoEl ? normalizeMediaUrl(videoEl.src || videoEl.querySelector('source')?.src) : null;
        if (upscaledUrl) {
          await chrome.runtime.sendMessage({
            type: "REGISTER_FILENAME_FOR_PROMPT",
            payload: {
              promptId: prompt.id,
              promptNumber: prompt.number,
              url: upscaledUrl,
              isVideo: true
            }
          }).catch(() => {});
        }
        return { success: true, upscaledUrl };
      }
      console.error("[GenFlow] Neither target quality nor 720p fallback option found");
      return { success: false };
    }
    // Мы объединили ветки: всегда кликаем на опцию качества.
    // Если появляется тост начала апскейла (на русском, английском или японском), мы ждем его завершения.
    // Если тоста нет (файл уже был апскейлен ранее или скачивается сразу), мы завершаем выполнение без ожидания.
    console.log(`[GenFlow] Clicking quality option: ${targetOption.textContent.trim()}`);
    await chrome.runtime.sendMessage({ type: "START_EXPECTING_DOWNLOAD", payload: { promptId: prompt.id } }).catch(() => {});
    await chrome.runtime.sendMessage({ type: "ALLOW_NEXT_DOWNLOADS" }).catch(() => {});
    targetOption.click();
    await sleep(800);
    // Check for immediate error BEFORE checking upscale toast
    const immediateErrMsg2 = findFlowErrorMessage();
    if (immediateErrMsg2) {
      console.error("[GenFlow] Immediate Flow error after quality click:", immediateErrMsg2);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      throw new Error(immediateErrMsg2);
    }
    const getToast = () => {
      const all = document.querySelectorAll("*");
      for (const el of all) {
        if (el.children.length === 0) {
          const txt = el.textContent || "";
          // Поддерживаем тосты на русском, английском и японском языках
          if (/повышаем разрешение|повышаем|увеличение разрешения|increasing.*resolution|upscal|解像度|アップスケー|向上|高画質/i.test(txt) && isVisible2(el)) {
            return el;
          }
        }
      }
      return null;
    };
    let toast = getToast();
    if (toast) {
      console.log("[GenFlow] Upscaling started. Waiting for completion toast to disappear...");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      const maxWaitTime = 90 * 1000; // was 5 min — too long; a hung upscale left the task stuck "active"
      const pollInterval = 4000;
      const start = Date.now();
      while (Date.now() - start < maxWaitTime) {
        await sleep(pollInterval);
        let errMsg = null;
        try { errMsg = findFlowErrorMessage(); } catch (e) {}
        if (errMsg) {
          console.error("[GenFlow] Flow upscale error detected:", errMsg);
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
          throw new Error(errMsg);
        }
        toast = getToast();
        if (!toast) {
          console.log("[GenFlow] Upscaling toast disappeared. Video should be downloaded automatically.");
          break;
        }
      }
      await sleep(2500);
    } else {
      // No upscale toast — wait a bit and re-check for delayed errors
      await sleep(1500);
      const delayedErrMsg2 = findFlowErrorMessage();
      if (delayedErrMsg2) {
        console.error("[GenFlow] Delayed Flow error detected after quality click:", delayedErrMsg2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
        throw new Error(delayedErrMsg2);
      }
      console.log("[GenFlow] No upscaling toast detected. Video was already upscaled or downloaded immediately.");
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    
    const videoEl = card.querySelector('video');
    const upscaledUrl = videoEl ? normalizeMediaUrl(videoEl.src || videoEl.querySelector('source')?.src) : null;
    if (upscaledUrl) {
      await chrome.runtime.sendMessage({
        type: "REGISTER_FILENAME_FOR_PROMPT",
        payload: {
          promptId: prompt.id,
          promptNumber: prompt.number,
          url: upscaledUrl,
          isVideo: true
        }
      }).catch(() => {});
    }
    return { success: true, upscaledUrl };
  }

  async function blobUrlToBase64(blobUrl) {
    if (!blobUrl || !blobUrl.startsWith("blob:")) return blobUrl;
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("[GenFlow] Failed to convert blob URL to base64:", err);
      return null;
    }
  }

  async function extractInputReferenceImages() {
    try {
      const inputContainer = document.querySelector('[data-slate-editor="true"]')?.closest('div') || document.querySelector('textarea')?.parentElement || document.body;
      const imgs = Array.from(inputContainer.querySelectorAll('img')).filter(img => {
        return img.offsetWidth > 30 && img.offsetHeight > 30;
      });
      if (imgs.length > 0) {
        const urls = [];
        for (const img of imgs.slice(0, 2)) {
          const src = img.src;
          if (src) {
            if (src.startsWith("blob:")) {
              const b64 = await blobUrlToBase64(src);
              if (b64) urls.push(b64);
            } else {
              urls.push(src);
            }
          }
        }
        if (urls.length > 0) {
          return urls.join(",");
        }
      }
    } catch (e) {
      console.warn("[GenFlow] Failed to extract input reference images:", e);
    }
    return null;
  }

  async function elementToDataURL(el) {
    if (!el) return null;
    
    // 1. If it's an image and has a src, check if it's a blob
    const src = el.src || el.currentSrc || el.getAttribute("src");
    if (src && src.startsWith("blob:") && el.tagName === "IMG") {
      const b64 = await blobUrlToBase64(src);
      if (b64) return b64;
    }
    
    // 2. Try canvas extraction (works for local same-origin, videos, and same-origin/CORS images)
    try {
      const canvas = document.createElement("canvas");
      const w = el.naturalWidth || el.videoWidth || el.width || el.offsetWidth || 300;
      const h = el.naturalHeight || el.videoHeight || el.height || el.offsetHeight || 150;
      
      const maxDim = 120;
      let width = w;
      let height = h;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          width = maxDim;
          height = Math.round((h * maxDim) / w);
        } else {
          height = maxDim;
          width = Math.round((w * maxDim) / h);
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(el, 0, 0, width, height);
        return canvas.toDataURL("image/jpeg", 0.7);
      }
    } catch (err) {
      console.warn("[GenFlow] elementToDataURL canvas export failed:", err);
    }
    
    // 3. Fallback: if it's an img with a remote http/https url, just return the url itself
    if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
      return src;
    }

    // 4. Fallback for video blobs if canvas failed
    if (src && src.startsWith("blob:")) {
      const b64 = await blobUrlToBase64(src);
      if (b64) return b64;
    }
    
    return null;
  }

  async function downloadAllProjectMedia(settings) {
    if (isDownloadingAll) {
      console.log("[GenFlow] Download All is already running.");
      return;
    }
    isDownloadingAll = true;
    console.log("[GenFlow] Starting Download All Project Media...", settings);
    
    const processedTileIds = new Set();
    let consecutiveEmptyCycles = 0;
    let totalDownloaded = 0;
    
    let promptCounter = 1;
    
    try {
      // Scroll window and any scrollable containers to the top first
      window.scrollTo({ top: 0, behavior: 'instant' });
      const scrollContainers = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const isScrollable = (
          style.overflow === 'auto' || style.overflow === 'scroll' || style.overflow === 'overlay' ||
          style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay'
        );
        return isScrollable && el.scrollHeight > el.clientHeight;
      });
      for (const container of scrollContainers) {
        container.scrollTop = 0;
      }
      await sleep(1500);

      while (isDownloadingAll) {
        const tiles = Array.from(document.querySelectorAll('[data-tile-id]'))
          .filter(tile => {
            const parentTile = tile.parentElement?.closest('[data-tile-id]');
            return !parentTile;
          })
          .sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            if (Math.abs(rectA.top - rectB.top) > 15) {
              return rectA.top - rectB.top;
            }
            return rectA.left - rectB.left;
          });
        
        const unprocessedTiles = tiles.filter(tile => {
          const tid = tile.getAttribute('data-tile-id');
          return tid && !processedTileIds.has(tid);
        });
        
        if (unprocessedTiles.length === 0) {
          consecutiveEmptyCycles++;
          if (consecutiveEmptyCycles > 12) {
            console.log("[GenFlow] No new media items detected. Stopping Download All.");
            break;
          }
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          for (const container of scrollContainers) {
            container.scrollTop = container.scrollHeight;
          }
          await sleep(1500);
          continue;
        }
        
        consecutiveEmptyCycles = 0;
        
        for (const tile of unprocessedTiles) {
          if (!isDownloadingAll) break;
          
          const tileId = tile.getAttribute('data-tile-id');
          processedTileIds.add(tileId);
          
          const videoEl = tile.querySelector('video');
          const imgEl = tile.querySelector('img');
          
          if (!videoEl && !imgEl) {
            continue;
          }
          
          tile.scrollIntoView({ block: 'center', behavior: 'instant' });
          await sleep(200);
          
          const videoUrl = videoEl ? normalizeMediaUrl(videoEl.src || videoEl.querySelector('source')?.src) : null;
          const imgUrl = imgEl ? normalizeMediaUrl(imgEl.src) : null;
          const mediaUrl = videoUrl || imgUrl;
          // 1. PRIMARY: Extract displayName from React fiber memoizedState (works 100% without hover)
          let extractedPrompt = await extractPromptFromTileFiber(tile);
          // 2. Fallback: try extractPromptTextFromCard on media element
          if (!extractedPrompt) {
            extractedPrompt = videoEl ? extractPromptTextFromCard(videoEl) : (imgEl ? extractPromptTextFromCard(imgEl) : null);
          }
          // 3. Fallback: scan visible text nodes in tile
          if (!extractedPrompt) {
            const walker = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
            let bestText = "";
            let textNode;
            const IGNORED_TEXTS_DOWNLOAD = new Set([
              "favorite","redo","more_vert","play_circle","share","download","delete",
              "play_circle_outline","play_circle_filled","play_arrow","close","arrow_back",
              "info","help","settings","volume_up","volume_off","fullscreen","fullscreen_exit",
              "refresh","autoplay","content_copy","play","pause","preview",
              "добавить в избранное","сгенерировать повторно","ещё","удалить из избранного",
              "удалить","скачать","поделиться","add to favorites","regenerate","more"
            ]);
            while (textNode = walker.nextNode()) {
              const p = textNode.parentElement;
              if (!p) continue;
              const tag = p.tagName.toLowerCase();
              const cls = typeof p.className === 'string' ? p.className.toLowerCase() : '';
              if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'path' ||
                  tag === 'i' || cls.includes('material-icons') || cls.includes('material-symbols') || cls.includes('icon')) continue;
              const t = (textNode.textContent || '').trim();
              if (t.length > bestText.length && !IGNORED_TEXTS_DOWNLOAD.has(t.toLowerCase()) &&
                  !t.startsWith('fe_id_') && !/^[0-9a-fA-F-]{36}$/.test(t)) {
                bestText = t;
              }
            }
            if (bestText.length >= 3 && isValidPromptString(bestText)) {
              extractedPrompt = bestText;
              console.log("[GenFlow] Extracted prompt from tile text nodes:", bestText);
            }
          }
          // 4. Final fallback: tile ID
          if (!extractedPrompt) {
            extractedPrompt = videoEl ? `Video Tile ${tileId}` : `Image Tile ${tileId}`;
          }

          const prompt = {
            id: crypto.randomUUID(),
            number: promptCounter,
            text: extractedPrompt
          };
          
          const previewUrl = await elementToDataURL(videoEl || imgEl);

          let success = false;
          const quality = settings?.quality || "1080p";
          
          if (videoEl) {
            console.log(`[GenFlow] Downloading video in tile ${tileId} as Prompt #${promptCounter}`);
            try {
              const res = await triggerFlowUpscaleDownload(tile, quality, prompt);
              if (res && res.success) {
                success = true;
              } else {
                chrome.runtime.sendMessage({
                  type: "GENERATION_FAILED",
                  payload: {
                    promptId: prompt.id,
                    promptNumber: prompt.number,
                    promptText: prompt.text,
                    error: "Failed to upscale resolution",
                    errorType: "UPSCALE_FAILED",
                    resultUrl: mediaUrl,
                    previewUrl: previewUrl
                  }
                }).catch(() => {});
              }
            } catch (err) {
              console.error(`[GenFlow] Error downloading video in tile ${tileId}:`, err);
              chrome.runtime.sendMessage({
                type: "GENERATION_FAILED",
                payload: {
                  promptId: prompt.id,
                  promptNumber: prompt.number,
                  promptText: prompt.text,
                  error: err.message || "Failed to upscale resolution",
                  errorType: "UPSCALE_FAILED",
                  resultUrl: mediaUrl,
                  previewUrl: previewUrl
                }
              }).catch(() => {});
            }
          } else if (imgEl) {
            console.log(`[GenFlow] Downloading image in tile ${tileId} as Prompt #${promptCounter}`);
            try {
              const res = await triggerFlowImageUpscaleDownload(tile, quality, prompt);
              if (res && res.success) {
                success = true;
              } else {
                chrome.runtime.sendMessage({
                  type: "GENERATION_FAILED",
                  payload: {
                    promptId: prompt.id,
                    promptNumber: prompt.number,
                    promptText: prompt.text,
                    error: "Failed to upscale resolution",
                    errorType: "UPSCALE_FAILED",
                    resultUrl: mediaUrl,
                    previewUrl: previewUrl
                  }
                }).catch(() => {});
              }
            } catch (err) {
              console.error(`[GenFlow] Error downloading image in tile ${tileId}:`, err);
              chrome.runtime.sendMessage({
                type: "GENERATION_FAILED",
                payload: {
                  promptId: prompt.id,
                  promptNumber: prompt.number,
                  promptText: prompt.text,
                  error: err.message || "Failed to upscale resolution",
                  errorType: "UPSCALE_FAILED",
                  resultUrl: mediaUrl,
                  previewUrl: previewUrl
                }
              }).catch(() => {});
            }
          }
          
          if (success) {
            totalDownloaded++;
            promptCounter++;
          }
          
          await sleep(200);
        }
        
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(1500);
      }
    } catch (err) {
      console.error("[GenFlow] Critical error in downloadAllProjectMedia:", err);
    } finally {
      isDownloadingAll = false;
      console.log(`[GenFlow] Download All finished. Total files queued/downloaded: ${totalDownloaded}`);
      chrome.runtime.sendMessage({ type: "DOWNLOAD_ALL_FINISHED" }).catch(() => {});
    }
  }

  console.log("[GenFlow] Banana (Flow) content script loaded BUILD=gf-hardening-21");
})();
