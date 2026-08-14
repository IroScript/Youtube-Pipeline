"use strict";
(() => {
  if (window.__veoLoaded) { console.log("[GenFlow] Veo script already loaded, skipping re-init"); return; }
  window.__veoLoaded = true;
  console.log("[GenFlow] veo.js BUILD=dlnote-v24 loaded");
  // src/utils/readiness.ts
  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && el.offsetWidth > 0 && el.offsetHeight > 0;
  }
  // Обновленная функция sleep: если вкладка неактивна (фоновая или свернута)
  // и задержка небольшая (до 2 секунд), мы используем синхронный busy-wait.
  // Это предотвращает зависание/блокировку setTimeout со стороны Chrome при фоновой работе.
  function sleep(ms) {
    // Human-like jitter to break the machine-even rhythm that trips Flow's anti-bot.
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
    // NOTE: do NOT match the "подозрительная активность" bot-detect banner here in the
    // GLOBAL body scan — it's a PER-CARD error, but a global match makes EVERY active slot
    // fail when just one card shows it, killing slots whose video already generated. (That
    // is exactly what this collateral guard avoids.) A proper per-card detection + a
    // separate cooldown signal is the right way; see FLOW_MAP §11.
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
      if (flowErr) {
        return { type: "failed", message: flowErr };
      }
    } catch (e) {}
    return { type: null };
  }
  // Detect an error rendered INSIDE a specific generation card (Google's
  // "Ошибка ..." tile). Strongly gated to avoid false-failing: a still-
  // generating card shows a "%" progress and a finished one shows a
  // video/image — in both cases we bail. Error text bleeding in from a
  // neighbouring card is ignored because this card still has progress/media.
  function getCardErrorMessage(card) {
    if (!card) return null;
    const txt = (card.textContent || "");
    const t = txt.toLowerCase();
    // Flow shows an error tile WITH a (broken) <video> player, so the img/video
    // and % checks below would wrongly treat it as a result/in-progress. An
    // explicit failure phrase is authoritative regardless.
    const hardError = t.includes("что-то пошло не так") || t.includes("something went wrong") || t.includes("audio generation failed") || t.includes("not been charged") || t.includes("violate") || t.includes("наруш");
    if (!hardError && card.querySelector("img[src], video")) return null;  // already produced a result
    if (!hardError && /\d+\s*%/.test(txt)) return null;                    // generation in progress (e.g. "6%")
    if (!hardError && !t.includes("ошибка") && !t.includes("error")) return null;  // no error label
    // Rare failure: the VIDEO rendered but the AUDIO track failed. Flow's card reads "Audio
    // generation failed … You have not been charged … update your settings to return silent videos."
    // It has NO "error"/"ошибка" word, so it used to slip past the guard above and never reach Failed.
    if (t.includes("audio generation failed") || t.includes("not been charged")) {
      return "Generation failed: audio generation failed";
    }
    if (t.includes("violate") || t.includes("наруш")) {
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
  function findVideosIncludingShadowDom(root = document) {
    const videos = [];
    function traverse(node) {
      if (node instanceof Element && node.tagName === "VIDEO") {
        videos.push(node);
      }
      if (node instanceof Element && node.shadowRoot) {
        traverse(node.shadowRoot);
      }
      const children = node instanceof Document || node instanceof ShadowRoot ? node.querySelectorAll("*") : node.children;
      for (const child of children) {
        if (child instanceof Element) {
          if (child.tagName === "VIDEO") {
            videos.push(child);
          }
          if (child.shadowRoot) {
            traverse(child.shadowRoot);
          }
        }
      }
    }
    traverse(root);
    return videos;
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
  async function waitForNoOverlays(timeoutMs = 1e4) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const overlays = document.querySelectorAll(
        '[role="dialog"][data-state="open"], .modal:not(.modal-hidden), [class*="overlay"]:not([class*="button-overlay"]), [class*="backdrop"]'
      );
      let hasVisibleOverlay = false;
      for (const overlay of overlays) {
        if (isVisible(overlay)) {
          hasVisibleOverlay = true;
          break;
        }
      }
      if (!hasVisibleOverlay)
        return;
      await sleep(300);
    }
  }
  function nativeClick(el) {
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

  // src/content/veo.ts
  var monitoringInstances = /* @__PURE__ */ new Map();
  var claimedVideoUrls = /* @__PURE__ */ new Map();
  var claimedMediaNames = /* @__PURE__ */ new Map();
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
          el.querySelectorAll?.("video, source, img").forEach((c) => {
            recordFirstObserved(c);
          });
          tryClaimMediaFromElement(el);
          el.querySelectorAll?.("video, source, img").forEach((c) => tryClaimMediaFromElement(c));
        }
        if (mutation.type === "attributes") {
          recordFirstObserved(mutation.target);
          tryClaimMediaFromElement(mutation.target);
        }
      }
    });
    globalMediaObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "poster"]
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

  function extractPromptTextFromCard(mediaEl) {
    if (!mediaEl) return null;
    try {
      const reactPrompt = findPromptInReactTree(mediaEl);
      if (reactPrompt) {
        console.log("[GenFlow] Extracted prompt from React fiber:", reactPrompt);
        return reactPrompt;
      }
    } catch(err) {
      console.warn("[GenFlow] Error searching React tree for prompt:", err);
    }

    let tileContainer = null;
    let node = mediaEl.parentElement;
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
      if (inst.claimedVideoUrl)
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
        if (promptWords.length > 0 && overlap >= 3 && overlap / promptWords.length >= 0.7) {
          score = Math.round(overlap / promptWords.length * normPrompt.length);
        }
      }
      const minRequired = Math.min(normCard.length, normPrompt.length) * 0.4;
      if (score >= minRequired && score > bestScore) {
        bestScore = score;
        bestInst = inst;
      }
    }
    return bestInst;
  }
  function tryClaimMediaFromElement(el) {
    const urls = [];
    const tag = el.tagName;
    if (tag === "VIDEO") {
      const v = el;
      if (v.src)
        urls.push(v.src);
      if (v.poster)
        urls.push(v.poster);
    } else if (tag === "SOURCE") {
      const src = el.src;
      if (src)
        urls.push(src);
    } else if (tag === "IMG") {
      // A VIDEO result is NEVER an <img>. Claiming an image's src as claimedVideoUrl is exactly
      // how a blocked/failed generation ended up "downloading" a stray photo (or a poster) as
      // the video: with no real video card, the FIFO fallback grabbed a random <img>. Video
      // results come only from <video>/<source> — never claim images here.
      return;
    }
    for (const raw of urls) {
      const url = normalizeMediaUrl(raw);
      const name = extractMediaNameFromUrl(url);
      if (name && !claimedMediaNames.has(name)) {
        claimMediaToSlot(name, url, el);
      }
    }
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
  function claimMediaToSlot(mediaName, url, mediaEl) {
    if (claimedMediaNames.has(mediaName))
      return;
    for (const inst of monitoringInstances.values()) {
      if (inst.preGenerationVideoSrcs.has(url))
        return;
      if (inst.preGenerationMediaNames.has(mediaName))
        return;
    }
    if (mediaEl) {
      const firstSeen = mediaFirstObservedAt.get(mediaEl);
      if (firstSeen !== void 0 && monitoringInstances.size > 0) {
        const earliestClickTime = Math.min(
          ...Array.from(monitoringInstances.values()).map((i) => i.createButtonClickTime)
        );
        if (firstSeen < earliestClickTime - 2e3) {
          console.log(`[GenFlow] GlobalTracker: skipping pre-existing media (first seen ${Date.now() - firstSeen}ms ago, before Create click): ${mediaName}`);
          return;
        }
      }
    }
    if (mediaEl) {
      const isVideoEl = mediaEl.tagName === "VIDEO" || mediaEl.tagName === "SOURCE";
      const mediaTile = mediaEl.closest ? mediaEl.closest("[data-tile-id]") : null;
      const mediaTileId = mediaTile ? mediaTile.getAttribute("data-tile-id") : null;
      for (const inst of monitoringInstances.values()) {
        if (inst.claimedVideoUrl)
          continue;
        // The captured own-card node goes stale when React re-renders the gallery
        // (e.g. sibling film segments completing) \u2014 a detached node makes contains()
        // false forever and an i2v slot can then NEVER be claimed, because the FIFO
        // fallback is blocked for i2v. Re-resolve by the stable tile-id, exactly like
        // the download path does (see the cardId recovery further down this file).
        if (inst.ownCardElement && !inst.ownCardElement.isConnected && inst.cardId) {
          const live = document.querySelector(`[data-tile-id="${inst.cardId}"]`);
          if (live) inst.ownCardElement = live;
        }
        // Match by stable tile-id first: the gallery renders twin nodes sharing one
        // tile-id, and the video can land in the twin that is NOT the captured node.
        const idHit = !!(mediaTileId && inst.cardId && mediaTileId === inst.cardId);
        if (idHit) {
          // Cross-check against a MIS-CAPTURED card: if the tile's own prompt text
          // matches a DIFFERENT unclaimed instance, this cardId was stolen at capture
          // time (late-rendering neighbour tile) — don't cement the wrong claim here;
          // fall through so text-match routes the video to its true owner (the x35
          // self-heal this tile-id shortcut would otherwise bypass).
          const tileText = extractPromptTextFromCard(mediaEl);
          if (tileText) {
            const byText = findInstanceByPromptText(tileText);
            if (byText && byText.slotId !== inst.slotId) continue;
          }
        }
        if (!idHit) {
          if (!inst.ownCardElement || !inst.ownCardElement.isConnected)
            continue;
          if (!inst.ownCardElement.contains(mediaEl))
            continue;
        }
        if (inst.generationType === "image-to-video" && !isVideoEl) {
          console.log(`[GenFlow] GlobalTracker: own-card skip img for image-to-video slot ${inst.slotId} (prompt #${inst.promptNumber})`);
          return;
        }
        claimedMediaNames.set(mediaName, inst.slotId);
        claimedVideoUrls.set(url, inst.slotId);
        inst.claimedVideoUrl = url;
        inst.detectedVideoUrls.add(url);
        console.log(`[GenFlow] GlobalTracker: own-card \u2192 slot ${inst.slotId} (prompt #${inst.promptNumber}) claimed ${mediaName}${idHit ? " (tile-id match)" : ""}`);
        return;
      }
    }
    if (mediaEl) {
      const cardText = extractPromptTextFromCard(mediaEl);
      if (cardText) {
        const matched = findInstanceByPromptText(cardText);
        if (matched) {
          if (i2vSlotHasOwnCard(matched)) {
            return;
          }
          claimedMediaNames.set(mediaName, matched.slotId);
          claimedVideoUrls.set(url, matched.slotId);
          matched.claimedVideoUrl = url;
          matched.detectedVideoUrls.add(url);
          console.log(`[GenFlow] GlobalTracker: text-match \u2192 slot ${matched.slotId} (prompt #${matched.promptNumber}) for "${cardText.slice(0, 50)}"`);
          return;
        }
      }
    }
    const hasImageToVideoUnclaimed = Array.from(monitoringInstances.values()).some((inst) => !inst.claimedVideoUrl && inst.generationType === "image-to-video");
    if (hasImageToVideoUnclaimed) {
      console.log(`[GenFlow] GlobalTracker: FIFO skipped \u2014 image-to-video slot active, waiting for own-card video`);
      return;
    }
    const candidate = Array.from(monitoringInstances.values()).filter((inst) => !inst.claimedVideoUrl).sort((a, b) => a.promptNumber - b.promptNumber)[0];
    if (!candidate)
      return;
    claimedMediaNames.set(mediaName, candidate.slotId);
    claimedVideoUrls.set(url, candidate.slotId);
    candidate.claimedVideoUrl = url;
    candidate.detectedVideoUrls.add(url);
    console.log(`[GenFlow] GlobalTracker: FIFO fallback \u2192 slot ${candidate.slotId} (prompt #${candidate.promptNumber}) claimed ${mediaName}`);
  }
  var lastApiCallTime = 0;
  var MIN_API_CALL_INTERVAL = 2e3;
  var modeSelectionLock = false;
  var lastAppliedGenerationType = null;
  var modeMenuConfiguredOnce = false;
  var flowSubmissionLockHeld = false;
  var flowSubmissionLockQueue = [];
  var flowInjectionAborted = false;
  var gfComposerDirtyReload = false; // half-attached i2v frames -> reload after failure report
  function abortFlowInjections() {
    flowInjectionAborted = true;
    flowSubmissionLockHeld = false;
    const waiters = flowSubmissionLockQueue.splice(0);
    // Unblock queued waiters so they proceed to the abort check and bail out
    // cleanly instead of submitting after the user pressed Stop.
    for (const w of waiters) { try { w(); } catch (_) {} }
  }
  // Hold a placement while the background has an active rate-limit / suspicious-activity cooldown.
  // Called under the submission lock, so a held prompt also stalls the rest of the queue = full pause.
  // Returns true if it's OK to proceed with placement, false if the run was stopped
  // (Stop / hard-stop) — caller must NOT submit in that case.
  async function __gfWaitCooldown(promptNumber) {
    for (let i = 0; i < 1200; i++) {
      let st;
      try { st = await chrome.runtime.sendMessage({ type: "CHECK_COOLDOWN" }); }
      catch (e) { return true; } // background unreachable -> don't block forever
      if (!st) return true;
      if (st.isRunning === false) return false; // stopped -> caller bails, no submit
      const until = st.cooldownUntil || 0;
      const now = Date.now();
      if (!until || now >= until) return true; // no active cooldown -> proceed
      if (i === 0) console.log(`[GenFlow] prompt #${promptNumber}: holding placement — cooldown active (${Math.ceil((until - now) / 1000)}s)`);
      await new Promise((r) => setTimeout(r, Math.min(1500, until - now + 50)));
    }
    return true;
  }
  async function acquireFlowSubmissionLock(promptNumber) {
    if (!flowSubmissionLockHeld) {
      flowSubmissionLockHeld = true;
      return;
    }
    return new Promise((resolve, reject) => {
      console.log(`[GenFlow] Prompt #${promptNumber} queued for submission lock (queue length: ${flowSubmissionLockQueue.length + 1})`);
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
  var completedPromptIds = /* @__PURE__ */ new Set();
  var FLOW_SELECTORS = {
    promptTextarea: "#PINHOLE_TEXT_AREA_ELEMENT_ID",
    promptTextareaFallbacks: [
      'textarea[placeholder*="\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435"]',
      'textarea[placeholder*="\u0442\u0435\u043A\u0441\u0442\u043E\u0432\u043E\u043C\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u0443"]',
      'textarea[placeholder*="Generate"]',
      'textarea[placeholder*="text prompt"]',
      "textarea"
    ],
    // Create button identified by text content at runtime; selector kept as last-resort fallback only
    createButton: 'button[type="submit"]',
    createButtonOverlay: 'div[data-type="button-overlay"]',
    createProjectButton: 'button[aria-label*="Create project" i], button[aria-label*="\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442" i]',
    modeDropdown: 'button[aria-haspopup="menu"], button[aria-haspopup="listbox"]',
    modelButton: 'button[aria-label*="model" i], button[data-testid*="model"]',
    settingsButton: 'button[aria-label*="settings" i], button[aria-label*="\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" i]',
    videoPreview: "video[src], video source[src]",
    downloadButton: 'a[download], button[aria-label*="download" i], button[aria-label*="\u0441\u043A\u0430\u0447\u0430\u0442\u044C" i]'
  };
  var FLOW_TEXTS = {
    createProject: ["\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442", "Create project", "Create Project", "New project", "プロジェクトを作成", "プロジェクトの作成", "新規プロジェクト", "作成"],
    createButton: ["\u0421\u043E\u0437\u0434\u0430\u0442\u044C", "Create", "Generate"],
    videoTab: ["\u0412\u0438\u0434\u0435\u043E", "Video"],
    imageTab: ["\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F", "Images"],
    modes: {
      "text-to-video": ["\u0412\u0438\u0434\u0435\u043E \u043F\u043E \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044E", "Text to Video", "Video from text", "Text-to-Video", "テキストから動画", "テキストから動画を作成"],
      "image-to-video": ["\u0412\u0438\u0434\u0435\u043E \u043F\u043E \u043A\u0430\u0434\u0440\u0430\u043C", "Frames to Video", "Video from frames", "Image to Video", "Frames-to-Video", "\u0412\u0438\u0434\u0435\u043E \u0438\u0437 \u043A\u0430\u0434\u0440\u043E\u0432", "フレームから動画", "画像から動画", "フレームから動画を作成"]
    }
  };
  // Server-overridable selectors/texts (mirrors banana). Merged from chrome.storage.local
  // .flowSelectors over the bundled defaults IN PLACE; storage empty = no-op = unchanged.
  function applyServerFlowSelectors(fs) {
    try {
      const v = fs && fs.veo;
      if (!v) return;
      for (const k of Object.keys(FLOW_SELECTORS)) {
        if (typeof v[k] === "string") FLOW_SELECTORS[k] = v[k];
        else if (Array.isArray(v[k]) && v[k].length) FLOW_SELECTORS[k] = v[k];
      }
      const tx = v.texts || {};
      for (const k of ["createProject", "createButton", "videoTab", "imageTab"]) {
        if (Array.isArray(tx[k]) && tx[k].length) FLOW_TEXTS[k] = tx[k];
      }
      if (tx.modes && typeof tx.modes === "object") {
        for (const mk of Object.keys(tx.modes)) if (Array.isArray(tx.modes[mk])) FLOW_TEXTS.modes[mk] = tx.modes[mk];
      }
      console.log("[GenFlow] Veo: applied server selector overrides");
    } catch (e) { console.warn("[GenFlow] Veo: applyServerFlowSelectors failed", e); }
  }
  // RAM-only: pull selectors from the background's in-memory copy (NEVER from disk/storage).
  try {
    chrome.runtime.sendMessage({ type: "GET_FLOW_SELECTORS" }, (resp) => {
      if (chrome.runtime.lastError) return;
      if (resp && resp.selectors) applyServerFlowSelectors(resp.selectors);
    });
  } catch (e) {}
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "FLOW_SELECTORS_UPDATED" && msg.selectors) applyServerFlowSelectors(msg.selectors);
  });
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
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "REMOVE_COMPLETED_PROMPT") {
      completedPromptIds.delete(message.payload?.promptId);
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "START_DOWNLOAD_ALL") {
      // veo.js owns Download All for ALL services (it handles both video and image
      // tiles). banana.js's handler is disabled so the two don't run in parallel
      // (which caused top-down order + blob/Flow-named duplicates).
      downloadAllProjectMedia(message.payload.settings).catch(err => {
        console.error("[GenFlow] START_DOWNLOAD_ALL execution failed:", err);
      });
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "STOP_DOWNLOAD_ALL") {
      isDownloadingAll = false;
      console.log("[GenFlow] Received STOP_DOWNLOAD_ALL signal");
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "PING") {
      if (message.service && message.service !== "veo3") return false;
      sendResponse({ pong: true, service: "veo3" });
      return false;
    }
    if (message.type === "CREATE_PROJECT") {
      console.log("[GenFlow] Veo: Received CREATE_PROJECT command");
      ensureFlowProjectPage().catch(err => console.error("[GenFlow] Veo: CREATE_PROJECT error:", err));
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "INJECT_PROMPT") {
      const payload = message.payload;
      if (isFlowHost() && payload.settings?.service !== "veo3")
        return false;
      // A new inject request from the background means generation is wanted —
      // clear any stale abort flag so a previous Stop can't block this run.
      flowInjectionAborted = false;
      const __pid = payload.prompt?.id;
      if (!window.__veoInjectingIds) window.__veoInjectingIds = /* @__PURE__ */ new Set();
      if (__pid && window.__veoInjectingIds.has(__pid)) {
        // Same prompt already injecting -> idempotent drop (guards re-sends).
        // A DIFFERENT prompt must NOT be blocked: with maxVideoThreads>1 the
        // background dispatches several prompts at once; they serialize safely
        // at acquireFlowSubmissionLock. The old global __veoInjecting flag
        // silently dropped the 2nd prompt, leaving it stuck "processing" and
        // stalling the whole queue.
        sendResponse({ success: true });
        return false;
      }
      if (__pid) window.__veoInjectingIds.add(__pid);
      injectPrompt(payload).finally(() => { if (__pid) window.__veoInjectingIds.delete(__pid); });
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "CHECK_GENERATION_STATUS") {
      const status = checkGenerationStatusForSlot(0);
      sendResponse(status);
      return false;
    }
    if (message.type === "ABORT_INJECTIONS") {
      // Stop only NEW/queued submissions. Keep in-progress monitors so generations already
      // running finish and still download (Stop halts new prompts, not work in flight).
      // Leftover monitoring is cleared on the next START via RESET_CONTENT_STATE.
      abortFlowInjections();
      console.log("[GenFlow] Veo: new injections aborted (stop) — in-progress kept for download");
      sendResponse({ success: true });
      return false;
    }
    if (message.type === "RESET_CONTENT_STATE") {
      flowInjectionAborted = false;
      // Release the submission lock too — an aborted in-flight injection can leave it
      // held, and then every new INJECT_PROMPT waits on it forever (queue stalls, no
      // generation, looks like "won't start").
      flowSubmissionLockHeld = false;
      flowSubmissionLockQueue = [];
      if (window.__veoInjectingIds) window.__veoInjectingIds.clear();
      for (const inst of monitoringInstances.values()) {
        if (inst.checkInterval)
          clearInterval(inst.checkInterval);
      }
      monitoringInstances.clear();
      claimedVideoUrls.clear();
      claimedMediaNames.clear();
      completedPromptIds.clear();
      if (globalMediaObserver) {
        globalMediaObserver.disconnect();
        globalMediaObserver = null;
      }
      modeMenuConfiguredOnce = false;
      lastAppliedGenerationType = null;
      gfRefInventory = null;            // refresh API reference inventory next batch
      gfVideoLibraryObjectNames = null; // and the object-name session cache (scroll fallback)
      console.log("[GenFlow] Veo: content state reset");
      sendResponse({ success: true });
      return false;
    }
    return false;
  });
  function findFlowErrorMessage() {
    const elements = document.querySelectorAll('[role="alert"], [role="status"], [class*="alert" i], [class*="error" i], [class*="toast" i], [class*="snackbar" i], [data-sonner-toast]');
    for (const el of elements) {
      if (el.textContent && el.offsetWidth > 0 && el.offsetHeight > 0) {
        const text = el.textContent.trim();
        const textLower = text.toLowerCase();
        
        const isExplicitError = textLower.includes("error") || 
                                 textLower.includes("fail") || 
                                 textLower.includes("unable") || 
                                 textLower.includes("не удалось") || 
                                 textLower.includes("ошибка") || 
                                 textLower.includes("сбой") ||
                                 textLower.includes("лимит") ||
                                 textLower.includes("limit");

        // 1. Check if the element is explicitly marked as success or status via HTML attributes or classes
        // but ONLY if it doesn't contain explicit error keywords
        const isSuccessOrStatus = 
          !isExplicitError && (
            el.getAttribute("role") === "status" ||
            (el.hasAttribute("data-type") && ["success", "info", "loading"].includes(el.getAttribute("data-type"))) ||
            Array.from(el.classList || []).some(cls => /success|info|status|progress|loading|loader|spinner|completed/i.test(cls))
          );
        
        if (isSuccessOrStatus) {
          continue;
        }

        // 2. Check if it is a Sonner error toast
        const isSonnerError = el.hasAttribute("data-sonner-toast") && 
                              ["error", "warning"].includes(el.getAttribute("data-type"));

        // 3. Check if the element has explicit error/alert classes
        const hasErrorClass = Array.from(el.classList || []).some(cls => 
          /error|fail|danger|warning|alert/i.test(cls)
        );

        // Only treat as an error if the TEXT actually contains an error marker,
        // or it is a genuine sonner error/warning toast. A bare role="alert" is
        // NOT enough: Google Flow has a visually-hidden <p role="alert"> live
        // region holding the page title ("Google Flow: …"), which previously
        // produced a false "generation failed" → retry loop.
        void hasErrorClass;
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
  function dismissExistingFlowErrors() {
    const elements = document.querySelectorAll('[role="alert"], [role="status"], [class*="alert" i], [class*="error" i], [class*="toast" i], [class*="snackbar" i], [data-sonner-toast]');
    for (const el of elements) {
      if (el.textContent && el.offsetWidth > 0 && el.offsetHeight > 0) {
        const closeBtn = el.querySelector('button, [role="button"], [class*="close" i]');
        if (closeBtn) {
          console.log("[GenFlow] Dismissing existing error toast via button click");
          closeBtn.click();
        } else {
          const subButtons = Array.from(el.querySelectorAll("*")).filter(sub => {
            const txt = (sub.textContent || "").trim();
            return txt === "Закрыть" || txt === "Close" || txt === "×";
          });
          if (subButtons.length > 0) {
            console.log("[GenFlow] Dismissing existing error toast via text match click");
            subButtons[0].click();
          }
        }
      }
    }
  }
  function isFlowHost() {
    return /labs\.google(\.com)?\/fx/i.test(window.location.href);
  }
  function findCardByUrl(url) {
    if (!url) return null;
    const name = extractMediaNameFromUrl(url.split(",")[0]);
    if (!name) return null;
    const videoEl = document.querySelector(`video[src*="${name}"], video source[src*="${name}"]`);
    if (videoEl) {
      return videoEl.closest('[class*="card"], [class*="tile"], [data-tile-id]') || videoEl.parentElement;
    }
    const imgEl = document.querySelector(`img[src*="${name}"]`);
    if (imgEl) {
      return imgEl.closest('[class*="card"], [class*="tile"], [data-tile-id]') || imgEl.parentElement;
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
  function findElementByText(texts, tagName = "button") {
    const elements = document.querySelectorAll(tagName);
    for (const el of elements) {
      const text = (el.textContent || "").trim();
      if (texts.some((t) => text.includes(t))) {
        return el;
      }
    }
    return null;
  }
  function findPromptTextarea() {
    const byId = document.querySelector(FLOW_SELECTORS.promptTextarea);
    if (byId && isVisible2(byId))
      return byId;
    for (const sel of FLOW_SELECTORS.promptTextareaFallbacks) {
      const el = document.querySelector(sel);
      if (el && isVisible2(el))
        return el;
    }
    return null;
  }
  function findPromptInput() {
    const textarea = findPromptTextarea();
    if (textarea)
      return textarea;
    const contenteditables = document.querySelectorAll('[contenteditable="true"], [contenteditable="plaintext-only"]');
    for (const el of contenteditables) {
      if (isVisible2(el)) {
        const htmlEl = el;
        const className = htmlEl.className || "";
        if (className.includes("sc-f60f777e-0") || className.includes("sc-c70e41ad-5") || className.includes("dmGLuZ") || className.includes("OPdYX") || htmlEl.offsetWidth > 300 && htmlEl.offsetHeight > 15) {
          console.log("[GenFlow] Found contenteditable prompt input:", className);
          return htmlEl;
        }
      }
    }
    const textboxes = document.querySelectorAll('[role="textbox"]');
    for (const tb of textboxes) {
      if (isVisible2(tb)) {
        const htmlEl = tb;
        const className = htmlEl.className || "";
        if (className.includes("sc-f60f777e-0") || className.includes("sc-c70e41ad-5") || htmlEl.offsetWidth > 300) {
          console.log("[GenFlow] Found textbox prompt input:", className);
          return htmlEl;
        }
      }
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
  function findCreateButton(scope) {
    if (!isOnFlowProjectPage()) {
      return null;
    }
    const root = scope && scope.isConnected ? scope : document;
    const allButtons = root.querySelectorAll("button");
    for (const btn of allButtons) {
      if (btn.disabled || !isVisible2(btn))
        continue;
      if (isInVideoResultCard && isInVideoResultCard(btn))
        continue;
      const text = (btn.textContent || "").trim();
      const className = btn.className || "";
      if (text.includes("search") || text.includes("Найти") || text.includes("Find") || text.includes("検索"))
        continue;
      
      const hasArrowText = text.includes("arrow_forward") || btn.querySelector("i")?.textContent?.trim() === "arrow_forward" || btn.querySelector("span")?.textContent?.trim() === "arrow_forward";
      const hasCreateClass = className.includes("sc-c70e41ad-4") || className.includes("dmINsZ");
      const hasSearchClass = className.includes("sc-a58e6e82-2") || className.includes("eomRxu");
      if (hasSearchClass)
        continue;
      if (hasArrowText) {
        console.log("[GenFlow] Found Create button by arrow_forward icon/text:", text, scope ? "(scoped)" : "", className);
        return btn;
      }
      if (hasCreateClass) {
        console.log("[GenFlow] Found Create button by className:", text, scope ? "(scoped)" : "", className);
        return btn;
      }
    }
    
    // Check by type="submit" which is highly language-independent
    const submitBtn = root.querySelector('button[type="submit"]');
    if (submitBtn && !submitBtn.disabled && isVisible2(submitBtn)) {
      return submitBtn;
    }
    
    if (scope) {
      return null;
    }
    const selectors = FLOW_SELECTORS.createButton.split(", ");
    for (const sel of selectors) {
      const el = document.querySelector(sel.trim());
      if (el && !el.disabled && isVisible2(el)) {
        const text = (el.textContent || "").trim();
        const hasArrow = text.includes("arrow_forward") || el.querySelector("i")?.textContent?.trim() === "arrow_forward";
        if (hasArrow && !text.includes("search")) {
          console.log("[GenFlow] Found Create button by selector:", sel, text);
          return el;
        }
      }
    }
    console.log("[GenFlow] Create button not found");
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
        console.log("[GenFlow] Found Create Project button structurally:", btn);
        return btn;
      }
    }
    
    // Class-based fallback
    const fallbackEl = document.querySelector('button[class*="cgdjfr"]');
    if (fallbackEl && isVisible2(fallbackEl)) {
      console.log("[GenFlow] Found Create Project button by class fallback:", fallbackEl);
      return fallbackEl;
    }
    
    // Traditional fallback
    const selectors = FLOW_SELECTORS.createProjectButton.split(", ");
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible2(el)) {
        return el;
      }
    }
    const byText = findElementByText(FLOW_TEXTS.createProject, "button") ||
                   findElementByText(FLOW_TEXTS.createProject, "a") ||
                   findElementByText(FLOW_TEXTS.createProject, "div") ||
                   findElementByText(FLOW_TEXTS.createProject, "span");
    return byText;
  }
  function isOnFlowProjectPage() {
    return /\/project\/[a-f0-9-]+/i.test(window.location.pathname);
  }
  function normalizeMediaUrl(url) {
    if (!url || typeof url !== "string")
      return "";
    const t = url.trim();
    if (t.startsWith("http://") || t.startsWith("https://"))
      return t;
    try {
      return new URL(t, window.location.origin).href;
    } catch {
      return t;
    }
  }
  function snapshotVideoSources() {
    const urls = /* @__PURE__ */ new Set();
    const names = /* @__PURE__ */ new Set();
    const addUrl = (raw) => {
      const url = normalizeMediaUrl(raw);
      if (!url)
        return;
      urls.add(url);
      const name = extractMediaNameFromUrl(url);
      if (name)
        names.add(name);
    };
    const videos = findVideosIncludingShadowDom(document);
    for (const v of videos) {
      if (v.src)
        addUrl(v.src);
      if (v.currentSrc)
        addUrl(v.currentSrc);
      if (v.poster)
        addUrl(v.poster);
      const sources = v.querySelectorAll("source");
      for (const s of sources) {
        if (s.src)
          addUrl(s.src);
      }
    }
    document.querySelectorAll('img[src*="googleusercontent"], img[src*="storage.googleapis"], img[src*="ai-sandbox"], img[src*="getMediaUrlRedirect"]').forEach((img) => {
      const u = img.src;
      if (u)
        addUrl(u);
    });
    return { urls, names };
  }
  function collectNewVideoUrlsInOrder(preGenUrls) {
    const seenUrls = /* @__PURE__ */ new Set();
    const seenNames = /* @__PURE__ */ new Set();
    const entries = [];
    const add = (el, rawUrl) => {
      const url = normalizeMediaUrl(rawUrl);
      if (!url)
        return;
      if (preGenUrls.has(url))
        return;
      const name = extractMediaNameFromUrl(url);
      if (!name)
        return;
      if (seenNames.has(name))
        return;
      seenNames.add(name);
      seenUrls.add(url);
      entries.push({ el, url });
    };
    const videos = findVideosIncludingShadowDom(document);
    for (const v of videos) {
      const s = v.src || v.currentSrc || "";
      const poster = v.poster || "";
      for (const url of [s, poster]) {
        if (url)
          add(v, url);
      }
      v.querySelectorAll("source").forEach((src) => {
        const u = src.src || src.getAttribute("src") || "";
        if (u)
          add(src, u);
      });
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
  function findResultCardForPrompt(promptText, preGenUrls, preGenNames) {
    if (!promptText)
      return null;
    const normalise = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const normTarget = normalise(promptText);
    if (!normTarget)
      return null;
    const targetWords = normTarget.split(/\s+/).filter((w) => w.length > 3);
    const seenNames = /* @__PURE__ */ new Set();
    const tryMatch = (el, rawUrl) => {
      const url = normalizeMediaUrl(rawUrl);
      if (preGenUrls.has(url))
        return null;
      const name = extractMediaNameFromUrl(url);
      if (!name)
        return null;
      if (preGenNames.has(name))
        return null;
      if (seenNames.has(name))
        return null;
      seenNames.add(name);
      const cardText = extractPromptTextFromCard(el);
      if (!cardText)
        return null;
      const normCard = normalise(cardText);
      if (normCard.includes(normTarget) || normTarget.includes(normCard))
        return url;
      if (targetWords.length >= 3) {
        const cardWords = new Set(normCard.split(/\s+/).filter((w) => w.length > 3));
        const overlap = targetWords.filter((w) => cardWords.has(w)).length;
        if (overlap >= 3 && overlap / targetWords.length >= 0.7)
          return url;
      }
      return null;
    };
    const videos = findVideosIncludingShadowDom(document);
    for (const v of videos) {
      const srcs = [v.src, v.currentSrc, v.poster].filter(Boolean);
      v.querySelectorAll("source").forEach((s) => {
        const u = s.src;
        if (u)
          srcs.push(u);
      });
      for (const raw of srcs) {
        if (!raw)
          continue;
        const hit = tryMatch(v, raw);
        if (hit)
          return hit;
      }
    }
    const imgSelector = 'img[src*="getMediaUrlRedirect"], img[src*="storage.googleapis"], img[src*="googleusercontent"]';
    const imgs = querySelectorAllIncludingShadowDom(document, imgSelector);
    for (const img of imgs) {
      const raw = img.src;
      if (!raw)
        continue;
      const hit = tryMatch(img, raw);
      if (hit)
        return hit;
    }
    return null;
  }
  async function ensureFlowProjectPage() {
    if (isOnFlowProjectPage()) {
      console.log("[GenFlow] Already on project page, checking Agentic mode...");
      await disableAgenticModeIfActive();
      await waitForPageReady();
      return;
    }
    console.log("[GenFlow] Not on project page, navigating...");
    await sleep(2e3);
    const existingProjects = document.querySelectorAll('a[href*="/project/"], [href*="/project/"]');
    if (existingProjects.length > 0) {
      console.log("[GenFlow] Found existing project, opening...");
      existingProjects[0].click();
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
      throw new Error("Кнопка «Создать проект» не найдена. Откройте https://labs.google/fx/ru/tools/flow и нажмите её вручную.");
    }
    console.log("[GenFlow] Clicking Create project button:", createProjectBtn.textContent.trim());
    nativeClick(createProjectBtn);
    for (let i = 0; i < 50; i++) {
      await sleep(500);
      if (isOnFlowProjectPage())
        break;
    }
    if (!isOnFlowProjectPage()) {
      throw new Error("Не удалось перейти на страницу проекта.");
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
  async function waitForPageReady() {
    for (let i = 0; i < 60; i++) {
      const input = findPromptInput();
      if (input) {
        await sleep(500);
        return;
      }
      await sleep(500);
    }
    throw new Error("\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043F\u0440\u043E\u0435\u043A\u0442\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C.");
  }
  async function selectFlowMode(generationType) {
    console.log(`[GenFlow] Selecting mode: ${generationType}`);
    let dropdownBtn = null;
    
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
            if (hasChevron || /veo|video|видео|фото|image|text|frame/i.test(text)) {
              dropdownBtn = btn;
              break;
            }
          }
        }
        if (dropdownBtn) break;
        parent = parent.parentElement;
      }
    }
    
    // 2. Traditional text/class lookup fallback
    if (!dropdownBtn) {
      const allButtons = document.querySelectorAll("button");
      for (const btn of allButtons) {
        const text = (btn.textContent || "").trim();
        const textLower = text.toLowerCase();
        const isCreateOrSubmitBtn = textLower.includes("arrow_forward") || textLower.includes("arrow_back") || textLower.includes("назад") || textLower.includes("back");
        if (isCreateOrSubmitBtn) continue;
        
        if ((text.includes("Видео") || text.includes("Создать") || text.includes("Video") || text.includes("動画") || text.includes("作成") || /veo|video/i.test(text)) && isVisible2(btn)) {
          const hasArrow = btn.querySelector("svg") || text.includes("arrow") || btn.querySelector('[class*="chevron"]');
          if (hasArrow) {
            dropdownBtn = btn;
            break;
          }
        }
      }
    }
    if (!dropdownBtn) {
      const selectors = FLOW_SELECTORS.modeDropdown.split(", ");
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && isVisible2(el)) {
          dropdownBtn = el;
          break;
        }
      }
    }
    if (!dropdownBtn) {
      console.log("[GenFlow] Mode dropdown not found, continuing with default mode");
      return;
    }

    let waitCount = 0;
    while (modeSelectionLock && waitCount < 20) {
      await sleep(500);
      waitCount++;
    }
    if (modeSelectionLock) {
      console.log("[GenFlow] Mode selection lock timeout, skipping mode change");
      return;
    }
    modeSelectionLock = true;
    try {
      const isMenuOpen = () => {
        const menu = document.querySelector('[role="menu"][data-state="open"]');
        return !!menu && isVisible2(menu);
      };
      
      if (!isMenuOpen()) {
        console.log("[GenFlow] Opening settings/mode dropdown...");
        nativeClick(dropdownBtn);
        await sleep(1000);
      }
      
      if (!isMenuOpen()) {
        console.log("[GenFlow] Failed to open settings/mode dropdown");
        return;
      }
      
      // Select "Video" tab in first group if not active
      const videoTab = findTabByIconAndText("play_circle", ["видео", "video", "動画", "ビデオ"]);
      if (videoTab) {
        if (videoTab.getAttribute("aria-selected") !== "true") {
          console.log("[GenFlow] Selecting Video tab...");
          nativeClick(videoTab);
          await sleep(600);
        } else {
          console.log("[GenFlow] Video tab is already active");
        }
      } else {
        console.log("[GenFlow] WARNING: Video tab not found in dropdown menu");
      }
      
      // Select "Frames" (for image-to-video) or "Prompts" (for text-to-video) in second group
      if (generationType === "image-to-video") {
        const framesTab = findTabByIconAndText("crop_free", ["кадр", "frame", "frames", "кадры", "кадрам", "フレーム"]);
        if (framesTab) {
          if (framesTab.getAttribute("aria-selected") !== "true") {
            console.log("[GenFlow] Selecting Frames tab...");
            nativeClick(framesTab);
            await sleep(600);
          } else {
            console.log("[GenFlow] Frames tab is already active");
          }
        } else {
          console.log("[GenFlow] WARNING: Frames tab not found in dropdown menu");
        }
      } else {
        const promptsTab = findTabByIconAndText("chrome_extension", ["образец", "prompt", "template", "шаблон"]);
        if (promptsTab) {
          if (promptsTab.getAttribute("aria-selected") !== "true") {
            console.log("[GenFlow] Selecting Prompts tab...");
            nativeClick(promptsTab);
            await sleep(600);
          } else {
            console.log("[GenFlow] Prompts tab is already active");
          }
        } else {
          console.log("[GenFlow] WARNING: Prompts tab not found in dropdown menu");
        }
      }
      
      // Close the menu
      if (isMenuOpen()) {
        console.log("[GenFlow] Closing settings/mode dropdown...");
        nativeClick(dropdownBtn);
        await sleep(400);
      }
    } finally {
      setTimeout(() => {
        modeSelectionLock = false;
      }, 2e3);
    }
  }
  function getVirtuosoScrollParent(listRoot) {
    const dialog = listRoot.closest('[role="dialog"]');
    let el = listRoot;
    while (el) {
      const st = window.getComputedStyle(el);
      const oy = st.overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight + 2) {
        return el;
      }
      el = el.parentElement;
      if (dialog && el && !dialog.contains(el))
        break;
    }
    return null;
  }
  function scrollVirtuosoMediaListToEnd(listRoot) {
    const sp = getVirtuosoScrollParent(listRoot);
    if (sp)
      sp.scrollTop = sp.scrollHeight;
    else
      listRoot.scrollTop = listRoot.scrollHeight;
  }
  function scrollFlowMediaPickerItemIntoView(row) {
    const dialog = row.closest('[role="dialog"]');
    const boundary = dialog ?? document.documentElement;
    const margin = 8;
    const maxIterations = 12;
    for (let iter = 0; iter < maxIterations; iter++) {
      const rowRect = row.getBoundingClientRect();
      if (rowRect.height < 4 || rowRect.width < 4)
        return;
      const bounds = boundary.getBoundingClientRect();
      if (rowRect.top >= bounds.top - margin && rowRect.bottom <= bounds.bottom + margin) {
        return;
      }
      let scroller = row.parentElement;
      let scrollHost = null;
      while (scroller && boundary.contains(scroller)) {
        const st = window.getComputedStyle(scroller);
        const oy = st.overflowY;
        if ((oy === "auto" || oy === "scroll" || oy === "overlay") && scroller.scrollHeight > scroller.clientHeight + 2) {
          scrollHost = scroller;
          break;
        }
        scroller = scroller.parentElement;
      }
      if (!scrollHost)
        break;
      const sr = scrollHost.getBoundingClientRect();
      const rr = row.getBoundingClientRect();
      if (rr.bottom > sr.bottom - margin) {
        scrollHost.scrollTop += Math.ceil(rr.bottom - sr.bottom + margin);
      } else if (rr.top < sr.top + margin) {
        scrollHost.scrollTop -= Math.ceil(sr.top + margin - rr.top);
      } else {
        break;
      }
    }
  }
  async function uploadImageForVideo(imageUrl, endImageUrl) {
    console.log("[GenFlow] Uploading image(s) for video generation...");
    await waitForNoOverlays(5e3);
    const findImageSlotButtons = () => {
      const startTerms = ["первый кадр", "первый", "start", "first", "最初", "ファースト"];
      const endTerms = ["последний кадр", "последний", "end", "last", "最後", "ラスト"];
      const isSlotButton = (el) => {
        const text = (el.textContent || "").trim().toLowerCase();
        return startTerms.some((t) => text.includes(t)) || endTerms.some((t) => text.includes(t));
      };
      let allSlotButtons = [];
      const byAttr = document.querySelectorAll('div[type="button"][aria-haspopup="dialog"]');
      byAttr.forEach((el) => {
        if (isVisible2(el) && isSlotButton(el) && !allSlotButtons.includes(el)) {
          allSlotButtons.push(el);
        }
      });
      if (allSlotButtons.length < 2) {
        const byClass = document.querySelectorAll("div.sc-8f31d1ba-1, div.iaqyKN");
        byClass.forEach((el) => {
          if (isVisible2(el) && isSlotButton(el) && !allSlotButtons.includes(el)) {
            allSlotButtons.push(el);
          }
        });
      }
      allSlotButtons.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      let start = null;
      let end = null;
      for (const el of allSlotButtons) {
        const text = (el.textContent || "").trim().toLowerCase();
        if (!start && startTerms.some((t) => text.includes(t)))
          start = el;
        else if (!end && endTerms.some((t) => text.includes(t)))
          end = el;
      }
      // A FILLED start slot loses its "первый кадр" label, so this fallback used to
      // hand the END slot over as "start" and the next prompt attached its start
      // frame into the end slot. Never let the fallback return the end slot.
      if (!start && allSlotButtons.length > 0 && allSlotButtons[0] !== end)
        start = allSlotButtons[0];
      if (!end && allSlotButtons.length > 1)
        end = allSlotButtons[1];
      console.log(`[GenFlow] Found ${allSlotButtons.length} image slot buttons (new UI)`);
      return { start, end };
    };
    // Slots can lag behind page-ready (not yet rendered, or page busy with a
    // parallel generation in multi mode), so findImageSlotButtons() returns
    // 0/1/2 inconsistently. Poll until the slots we actually need are present
    // instead of grabbing whatever happens to exist on the first scan.
    const waitForImageSlotButtons = async (needEnd, timeoutMs = 8e3) => {
      const t0 = Date.now();
      let b = findImageSlotButtons();
      while (Date.now() - t0 < timeoutMs) {
        if (b.start && (!needEnd || b.end))
          return b;
        await sleep(300);
        b = findImageSlotButtons();
      }
      return b;
    };
    // After the start frame is filled its "первый кадр" label disappears, so a
    // re-scan must find the end slot by its own label. Poll for it rather than
    // ever falling back to the start slot (that would overwrite frame 1).
    const waitForEndSlot = async (timeoutMs = 6e3) => {
      const t0 = Date.now();
      let b = findImageSlotButtons();
      while (Date.now() - t0 < timeoutMs && !b.end) {
        await sleep(300);
        b = findImageSlotButtons();
      }
      return b.end;
    };
    const countRemainingAddButtons = () => {
      const startTerms = ["первый кадр", "первый", "start", "first", "最初", "ファースト"];
      const endTerms = ["последний кадр", "последний", "end", "last", "最後", "ラスト"];
      let count = 0;
      const candidates = document.querySelectorAll('div[type="button"][aria-haspopup="dialog"], div.sc-8f31d1ba-1, div.iaqyKN');
      candidates.forEach((el) => {
        if (!isVisible2(el))
          return;
        const text = (el.textContent || "").trim().toLowerCase();
        if (startTerms.some((t) => text.includes(t)) || endTerms.some((t) => text.includes(t)))
          count++;
      });
      return count;
    };
    const uploadToFileInput = async (dataUrl, name, retryCount = 3) => {
      const pickFileInput = () => {
        const sel = 'input[type="file"][accept*=".png"], input[type="file"][accept*="image"], input[type="file"][accept*="png"]';
        const all = Array.from(document.querySelectorAll(sel));
        if (all.length === 0)
          return null;
        const visible = all.filter((inp) => {
          const r = inp.getBoundingClientRect();
          const st = window.getComputedStyle(inp);
          return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
        });
        return (visible[visible.length - 1] ?? all[all.length - 1]) || null;
      };
      for (let attempt = 0; attempt < retryCount; attempt++) {
        const fileInput = pickFileInput();
        if (!fileInput) {
          console.log(`[GenFlow] No file input found (attempt ${attempt + 1})`);
          await sleep(1e3);
          continue;
        }
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const filename = `${name}_${Date.now()}.png`;
          const file = new File([blob], filename, { type: "image/png" });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          console.log(`[GenFlow] ${name} image uploaded successfully (${filename})`);
          return { ok: true, filename };
        } catch (error) {
          console.error(`[GenFlow] ${name} upload attempt ${attempt + 1} failed:`, error);
          await sleep(1e3);
        }
      }
      return { ok: false };
    };
    const selectUploadedImageInPopup = async (filename, maxWaitMs = 4e3) => {
      const listSel = 'div[data-testid="virtuoso-item-list"]';
      // Flow's resource picker opens on the LAST-USED tab (Все/Изображения/Видео/Голоса/Персонажи/
      // Загрузки). If that's "Voices" we'd read the wrong virtuoso-list and attach nothing. Force the
      // IMAGES tab by its Material icon "image" (locale-proof) before searching. Same fix as banana.js.
      try {
        const _dlg = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
        if (_dlg) {
          for (const _tb of _dlg.querySelectorAll('button[role="tab"]')) {
            const _ic = _tb.querySelector("i");
            if (_ic && (_ic.textContent || "").trim() === "image") {
              if (_tb.getAttribute("aria-selected") !== "true") { nativeClick(_tb); await sleep(400); }
              break;
            }
          }
        }
      } catch (e) {}
      const t0 = Date.now();
      const deadline = t0 + maxWaitMs;
      const fallbackScrollAt = t0 + 2000;
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
      const rowMatchesUploadedFile = (row, fn) => {
        const f = fn.trim().toLowerCase();
        const text = (row.textContent || "").trim().toLowerCase();
        if (f && text.includes(f))
          return true;
        const img = row.querySelector("img");
        if (img) {
          const alt = (img.getAttribute("alt") || "").trim().toLowerCase();
          if (alt && (alt === f || alt.includes(f) || f.includes(alt)))
            return true;
        }
        const m = fn.match(/_(\d{10,})\.png$/i);
        if (m && text.includes(m[1]))
          return true;
        if (m && img?.getAttribute("alt")?.includes(m[1]))
          return true;
        return false;
      };
      const gatherVisibleLists = () => {
        const out = [];
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const d of Array.from(dialogs)) {
          if (!isVisible2(d))
            continue;
          const st = d.getAttribute("data-state");
          if (st === "closed")
            continue;
          const inner = d.querySelector(listSel);
          if (inner && isVisible2(inner))
            out.push(inner);
        }
        if (out.length > 0)
          return out;
        for (const list of querySelectorAllIncludingShadowDom(document, listSel)) {
          if (isVisible2(list))
            out.push(list);
        }
        return out;
      };
      const sortItemsByIndexAsc = (nodes) => {
        if (nodes.length > 0 && nodes[0].getAttribute("data-index") === null) return [...nodes];
        return [...nodes].sort(
          (a, b) => parseInt(a.getAttribute("data-index") || "0", 10) - parseInt(b.getAttribute("data-index") || "0", 10)
        );
      };
      const sortItemsByIndexDesc = (nodes) => {
        if (nodes.length > 0 && nodes[0].getAttribute("data-index") === null) return [...nodes];
        return [...nodes].sort(
          (a, b) => parseInt(b.getAttribute("data-index") || "0", 10) - parseInt(a.getAttribute("data-index") || "0", 10)
        );
      };
      const clickRow = async (row) => {
        // Click the actual selectable option (div[role="option"]); toggling its
        // aria-selected is what enables the "Добавить в запрос" confirm button.
        // Same picker/bug as the banana reference flow.
        const target = (row.closest && row.closest('[role="option"]')) || (row.querySelector && row.querySelector('[role="option"]')) || row;
        let confirmBtn = null;
        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          console.log(`[GenFlow] selectUploadedImageInPopup: clicking image row (attempt ${attempt + 1}/${maxAttempts})`);
          try {
            scrollFlowMediaPickerItemIntoView(target);
            await sleep(120);
            nativeClick(target);
            await sleep(80);
            target.click();
          } catch {
            scrollFlowMediaPickerItemIntoView(row);
            await sleep(80);
            nativeClick(row);
            row.click();
          }
          const checkDeadline = Date.now() + 1500;
          while (Date.now() < checkDeadline) {
            // Frame slots fill on click and close the picker (there is no
            // "Добавить в запрос" confirm button). A closed picker = the frame
            // was attached, so return success immediately instead of waiting out
            // the 35s timeout looking for a confirm button that never appears.
            if (!document.querySelector('[role="dialog"][data-state="open"]')) {
              console.log("[GenFlow] selectUploadedImageInPopup: picker closed after click — frame attached");
              return true;
            }
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
          console.log(`[GenFlow] selectUploadedImageInPopup: found enabled confirm button "${confirmBtn.textContent.trim()}", clicking it`);
          nativeClick(confirmBtn);
          await sleep(80);
          confirmBtn.click();
          await sleep(800);
          return true;
        } else {
          console.log("[GenFlow] selectUploadedImageInPopup: confirm button not found or remained disabled");
          return false;
        }
      };
      while (Date.now() < deadline) {
        const dialog = document.querySelector('[role="dialog"]') || document.querySelector('[role="dialog"][data-state="open"]');
        if (dialog && isVisible2(dialog)) {
          const matchingImg = findMatchingImgInDialog(dialog, filename);
          if (matchingImg) {
            console.log(`[GenFlow] selectUploadedImageInPopup: found direct image match inside dialog (${filename})`);
            const ok = await clickRow(matchingImg);
            if (ok) return true;
          }
        }
        const lists = gatherVisibleLists();
        for (const list of lists) {
          const listEl = list;
          let items = sortItemsByIndexAsc(Array.from(listEl.querySelectorAll('[role="option"]')));
          if (items.length === 0)
            continue;
          for (const item of items) {
            if (rowMatchesUploadedFile(item, filename)) {
              console.log(`[GenFlow] selectUploadedImageInPopup: file match at data-index ${item.getAttribute("data-index")} (${filename})`);
              const ok = await clickRow(item);
              if (ok) return true;
            }
          }
          if (Date.now() >= fallbackScrollAt) {
            // The just-uploaded file is the newest and sits at the TOP of the
            // recency-sorted list — scroll UP to find it (the old code scrolled
            // DOWN, away from it, then force-clicked a wrong row). Match by exact
            // filename only, so a different frame can never be selected.
            const sc = (() => {
              let n = listEl.parentElement;
              for (let i = 0; i < 8 && n; i++) {
                const st = window.getComputedStyle(n);
                if (st.overflowY === "auto" || st.overflowY === "scroll" || st.overflow === "auto" || st.overflow === "scroll") return n;
                n = n.parentElement;
              }
              return null;
            })();
            if (sc) { sc.scrollTop = 0; await sleep(350); }
            items = sortItemsByIndexAsc(Array.from(listEl.querySelectorAll('[role="option"]')));
            for (const item of items) {
              if (rowMatchesUploadedFile(item, filename)) {
                console.log(`[GenFlow] selectUploadedImageInPopup: file match after scroll-to-top at data-index ${item.getAttribute("data-index")}`);
                const ok = await clickRow(item);
                if (ok) return true;
              }
            }
          }
        }
        await sleep(400);
      }
      console.log("[GenFlow] Could not find uploaded image in popup:", filename);
      return false;
    };
    const buttons = await waitForImageSlotButtons(!!endImageUrl);
    console.log(`[GenFlow] Image slot buttons found: start=${!!buttons.start}, end=${!!buttons.end}`);
    const uploadImageToSlot = async (slotBtn, dataUrl, label) => {
      console.log(`[GenFlow] ${label}: uploading file...`);
      const result = await uploadToFileInput(dataUrl, label);
      if (!result.ok || !result.filename) {
        console.log(`[GenFlow] ${label}: upload failed`);
        return false;
      }
      console.log(`[GenFlow] ${label}: file uploaded as ${result.filename}`);
      await sleep(400);
      nativeClick(slotBtn);
      await sleep(1600);
      let selected = await selectUploadedImageInPopup(result.filename);
      if (!selected) {
        // One retry with a FRESH picker: right after a previous run in the same
        // composer the first open can show a stale list without the just-uploaded
        // file (film auto-retry case). Escape is safe here — nothing is pending
        // confirmation, we just close and reopen.
        console.log(`[GenFlow] ${label}: not found on first open — reopening picker for one retry`);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
        await sleep(800);
        nativeClick(slotBtn);
        await sleep(1600);
        selected = await selectUploadedImageInPopup(result.filename);
      }
      if (selected) {
        console.log(`[GenFlow] ${label}: image selected in popup`);
      } else {
        console.log(`[GenFlow] ${label}: could not confirm selection`);
      }
      await sleep(selected ? 1500 : 800);
      await waitForNoOverlays(3e3);
      if (!selected) {
        // Ground truth: a filled slot renders a thumbnail on the slot button itself —
        // trust it over the popup search (Flow can auto-attach the fresh upload).
        try {
          if (slotBtn.isConnected && slotBtn.querySelector("img[src]")) {
            console.log(`[GenFlow] ${label}: slot shows a thumbnail — attach confirmed by slot state`);
            return true;
          }
        } catch (e) {}
      }
      return selected;
    };
    let allConfirmed = true;
    if (buttons.start) {
      console.log("[GenFlow] Uploading START frame...");
      if (!(await uploadImageToSlot(buttons.start, imageUrl, "start"))) allConfirmed = false;
      await sleep(600);
    } else {
      console.log("[GenFlow] WARNING: start slot button not found, attempting direct upload...");
      await uploadToFileInput(imageUrl, "start");
      await sleep(2e3);
    }
    if (endImageUrl) {
      console.log("[GenFlow] Uploading END frame...");
      await waitForNoOverlays(3e3);
      const endBtn = await waitForEndSlot();
      if (endBtn) {
        if (!(await uploadImageToSlot(endBtn, endImageUrl, "end"))) allConfirmed = false;
        await sleep(600);
      } else {
        console.log("[GenFlow] WARNING: end slot button not found, attempting direct upload...");
        await uploadToFileInput(endImageUrl, "end");
        await sleep(2e3);
      }
    }
    console.log("[GenFlow] Image upload process completed");
    // false ONLY when a slot button existed and its frame could not be confirmed
    // (popup select + retry + slot-thumbnail all failed). The legacy direct-upload
    // fallbacks (no slot button) stay non-blocking as before.
    return allConfirmed;
  }
  function i2vSlotHasOwnCard(instance) {
    return instance.generationType === "image-to-video" && !!instance.ownCardElement && instance.ownCardElement.isConnected;
  }
  function checkGenerationStatusForSlot(slotId) {
    const instance = monitoringInstances.get(slotId);
    if (!instance) {
      return { isGenerating: false, isComplete: false, hasError: false };
    }
    if (instance.claimedVideoUrl) {
      return {
        isGenerating: false,
        isComplete: true,
        hasError: false,
        videoUrl: instance.claimedVideoUrl
      };
    }
    const preGenerationVideoSrcs = instance.preGenerationVideoSrcs;
    const detectedVideoUrls = instance.detectedVideoUrls;
    const status = {
      isGenerating: false,
      isComplete: false,
      hasError: false
    };
    const loadingNow = checkLoadingIndicators(document.body);
    if (loadingNow) {
      status.isGenerating = true;
    }
    const domError = detectDOMErrors();
    if (domError.type === "429") {
      status.hasError = true;
      status.errorMessage = domError.message;
      return status;
    }
    if (!loadingNow) {
      if (domError.type === "failed") {
        status.hasError = true;
        status.errorMessage = domError.message;
        return status;
      }
      if (domError.type === "network") {
        status.hasError = true;
        status.errorMessage = domError.message;
        return status;
      }
    }
    // Only trust in-card error detection with a SINGLE active slot. In multi
    // (several parallel slots) instance.ownCardElement can span a container that
    // also holds a neighbouring failed card, so "Ошибка" bleeds in and falsely
    // fails a card that is actually still generating. With multiple slots, rely
    // on normal completion / timeout instead.
    if (instance.ownCardElement && instance.ownCardElement.isConnected) {
      const cardErr = getCardErrorMessage(instance.ownCardElement);
      if (cardErr) {
        // Generic "Ошибка" can bleed in from a neighbour card in multi, so only
        // trust it with a single slot. A hard failure phrase ("что-то пошло не
        // так") is this card's own explicit error and is safe to act on even in
        // multi. Either way require it to PERSIST >6s (it can flash briefly right
        // after Create before the % appears).
        const cardText = (instance.ownCardElement.textContent || "").toLowerCase();
        const isHardError = cardText.includes("что-то пошло не так") || cardText.includes("something went wrong") || cardText.includes("audio generation failed") || cardText.includes("not been charged") || cardText.includes("violate") || cardText.includes("наруш");
        if (monitoringInstances.size <= 1 || isHardError || /suspicious|подозрительн/i.test(cardErr)) {
          if (!instance.cardErrorFirstSeen) instance.cardErrorFirstSeen = Date.now();
          // Suspicious activity is a real rate-limit signal — confirm fast (1.5s) so the
          // cooldown kicks in on the FIRST occurrence, not after several cards. A 1.5s guard
          // still ignores the brief flash that can appear right after Create. Other errors keep 6s.
          const _need = /suspicious|подозрительн/i.test(cardErr) ? 1500 : 6000;
          if (Date.now() - instance.cardErrorFirstSeen > _need) {
            status.hasError = true;
            status.errorMessage = cardErr;
            return status;
          }
        }
      } else {
        instance.cardErrorFirstSeen = null;
      }
    }
    const setClaimed = (url) => {
      claimedVideoUrls.set(url, slotId);
      const name = extractMediaNameFromUrl(url);
      if (name)
        claimedMediaNames.set(name, slotId);
      instance.claimedVideoUrl = url;
    };
    const unionPreGen = /* @__PURE__ */ new Set();
    const unionPreGenNames = /* @__PURE__ */ new Set();
    for (const [, inst] of monitoringInstances) {
      inst.preGenerationVideoSrcs.forEach((s) => unionPreGen.add(s));
      inst.preGenerationMediaNames.forEach((n) => unionPreGenNames.add(n));
    }
    if (instance.ownCardElement && instance.ownCardElement.isConnected) {
      const card = instance.ownCardElement;
      const isImageToVideo = instance.generationType === "image-to-video";
      const scanCard = () => {
        for (const v of Array.from(card.querySelectorAll("video, source"))) {
          const src = v.src || v.src || v.currentSrc || v.getAttribute("src") || "";
          if (!src)
            continue;
          const url = normalizeMediaUrl(src);
          const name = extractMediaNameFromUrl(url);
          if (name && !unionPreGenNames.has(name))
            return url;
          const poster = v.poster || "";
          if (poster) {
            const pu = normalizeMediaUrl(poster);
            const pn = extractMediaNameFromUrl(pu);
            if (pn && !unionPreGenNames.has(pn))
              return pu;
          }
        }
        if (!isImageToVideo) {
          for (const img of Array.from(card.querySelectorAll('img[src*="getMediaUrlRedirect"], img[src*="storage.googleapis"], img[src*="googleusercontent"]'))) {
            const src = img.src;
            if (!src)
              continue;
            const url = normalizeMediaUrl(src);
            const name = extractMediaNameFromUrl(url);
            if (name && !unionPreGenNames.has(name))
              return url;
          }
        }
        return null;
      };
      const cardUrl = scanCard();
      if (cardUrl) {
        const mediaName = extractMediaNameFromUrl(cardUrl);
        const alreadyOther = mediaName ? claimedMediaNames.has(mediaName) && claimedMediaNames.get(mediaName) !== slotId : claimedVideoUrls.has(cardUrl) && claimedVideoUrls.get(cardUrl) !== slotId;
        if (!alreadyOther) {
          setClaimed(cardUrl);
          instance.detectedVideoUrls.add(cardUrl);
          status.isComplete = true;
          status.videoUrl = cardUrl;
          console.log(`[GenFlow] Slot ${slotId} (prompt #${instance.promptNumber}) own-card scan hit: ${cardUrl.substring(0, 80)}...`);
          return status;
        }
      }
    }
    if (!i2vSlotHasOwnCard(instance)) {
      const textMatchUrl = findResultCardForPrompt(instance.promptText, unionPreGen, unionPreGenNames);
      if (textMatchUrl) {
        const mediaName = extractMediaNameFromUrl(textMatchUrl);
        const alreadyClaimedByOther = mediaName ? claimedMediaNames.has(mediaName) && claimedMediaNames.get(mediaName) !== slotId : claimedVideoUrls.has(textMatchUrl) && claimedVideoUrls.get(textMatchUrl) !== slotId;
        if (!alreadyClaimedByOther) {
          setClaimed(textMatchUrl);
          detectedVideoUrls.add(textMatchUrl);
          status.isComplete = true;
          status.videoUrl = textMatchUrl;
          console.log(`[GenFlow] Slot ${slotId} (prompt #${instance.promptNumber}) text-matched result (polling): ${textMatchUrl.substring(0, 80)}...`);
        }
      }
    }
    const isImageToVideoSlot = instance.generationType === "image-to-video";
    if (!status.isComplete && !isImageToVideoSlot) {
      const seenNames = /* @__PURE__ */ new Set();
      const candidates = [];
      for (const rawUrl of collectNewVideoUrlsInOrder(unionPreGen)) {
        const url = normalizeMediaUrl(rawUrl);
        const name = extractMediaNameFromUrl(url);
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          candidates.push(url);
        }
      }
      const imgSel = 'img[src*="getMediaUrlRedirect"], img[src*="storage.googleapis"], img[src*="googleusercontent"]';
      for (const img of querySelectorAllIncludingShadowDom(document, imgSel)) {
        const raw = img.src;
        if (!raw)
          continue;
        const url = normalizeMediaUrl(raw);
        if (unionPreGen.has(url))
          continue;
        const name = extractMediaNameFromUrl(url);
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          candidates.push(url);
        }
      }
      candidates.reverse();
      for (const url of candidates) {
        if (preGenerationVideoSrcs.has(url))
          continue;
        const mediaName = extractMediaNameFromUrl(url);
        if (!mediaName)
          continue;
        if (instance.preGenerationMediaNames.has(mediaName))
          continue;
        if (claimedMediaNames.has(mediaName) && claimedMediaNames.get(mediaName) !== slotId)
          continue;
        const ownerSlot = claimedVideoUrls.get(url);
        if (ownerSlot !== void 0 && ownerSlot !== slotId)
          continue;
        const oldestUnclaimed = Array.from(monitoringInstances.values()).filter((inst) => !inst.claimedVideoUrl).sort((a, b) => a.promptNumber - b.promptNumber)[0];
        if (!oldestUnclaimed || oldestUnclaimed.slotId !== slotId)
          break;
        setClaimed(url);
        detectedVideoUrls.add(url);
        status.isComplete = true;
        status.videoUrl = url;
        console.log(`[GenFlow] Slot ${slotId} (prompt #${instance.promptNumber}) FIFO fallback claim: ${url.substring(0, 80)}...`);
        break;
      }
    }
    if (!status.isComplete && monitoringInstances.size <= 1) {
      const downloadBtns = document.querySelectorAll('a[download], [aria-label*="download" i], [aria-label*="\u0441\u043A\u0430\u0447\u0430\u0442\u044C" i]');
      for (const btn of downloadBtns) {
        if (isVisible2(btn)) {
          status.isComplete = true;
          const href = btn.getAttribute("href");
          if (href)
            status.videoUrl = href;
          break;
        }
      }
    }
    if (monitoringInstances.size > 1 && status.isComplete && !instance.claimedVideoUrl) {
      status.isComplete = false;
      status.videoUrl = void 0;
    }
    const POLICY_KEYWORDS = [
      "policy",
      "violation",
      "violates",
      "\u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435",
      "\u043F\u043E\u043B\u0438\u0442\u0438\u043A",
      "inappropriate",
      "harmful",
      "not allowed",
      "\u0437\u0430\u043F\u0440\u0435\u0449",
      "\u043D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C",
      "content policy",
      "safety",
      "\u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442",
      "blocked"
    ];
    const GENERATION_FAIL_PHRASES = [
      "generation failed",
      "failed generation",
      "couldn't generate",
      "failed to generate",
      "generation error",
      "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
      "\u043E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438"
    ];
    if (!loadingNow) {
      const errors = document.querySelectorAll('[role="alert"], [role="dialog"]');
      for (const error of errors) {
        if (!isVisible2(error))
          continue;
        const text = (error.textContent || "").toLowerCase();
        const isPolicyError = POLICY_KEYWORDS.some((kw) => text.includes(kw));
        if (isPolicyError) {
          status.hasError = true;
          status.isPolicyError = true;
          status.errorMessage = `Policy: ${error.textContent?.slice(0, 200)}`;
          break;
        }
        if (GENERATION_FAIL_PHRASES.some((p) => text.includes(p))) {
          status.hasError = true;
          status.errorMessage = error.textContent?.slice(0, 200);
          break;
        }
      }
    }
    return status;
  }
  function extractMediaNameFromUrl(url) {
    const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = url.match(uuidPattern);
    if (match) {
      return match[1];
    }
    const nameMatch = url.match(/[?&]name=([0-9a-f-]+)(?=&|$)/i);
    if (nameMatch) {
      return nameMatch[1];
    }
    return null;
  }
  function getDownloadUrlForVideo(videoUrl) {
    if (!videoUrl || !videoUrl.startsWith("http"))
      return videoUrl || "";
    const mediaName = extractMediaNameFromUrl(videoUrl);
    if (mediaName) {
      return `${window.location.origin}/fx/api/trpc/media.getMediaUrlRedirect?name=${mediaName}`;
    }
    return videoUrl;
  }
  function isValidRedirectUrl(url) {
    return !!(url && url.startsWith("http") && url.includes("getMediaUrlRedirect") && url.includes("name="));
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
  // Serializes the Flow download menu across parallel video slots. Flow renders ONE
  // global popup menu, so two videos opening it at once close each other and one video's
  // download silently never fires (no onCreated → false "no file" → needless re-generate).
  // Generation stays parallel; only the quick open + quality-click is locked.
  let _veoMenuLock = Promise.resolve();
  function acquireVeoMenu() {
    let release;
    const prev = _veoMenuLock;
    _veoMenuLock = new Promise((r) => { release = r; });
    return prev.then(() => release);
  }
  async function triggerFlowUpscaleDownload(card, targetQuality, prompt) {
    console.log(`[GenFlow] Starting upscale/download for quality: ${targetQuality}`);
    dismissExistingFlowErrors();
    await sleep(300);
    let video = card.querySelector('video');
    if (!video) {
      console.error("[GenFlow] No video element found inside the card for download");
      return { success: false };
    }
    const rawUrl = video.src || video.querySelector('source')?.src;
    const initialUrl = rawUrl ? normalizeMediaUrl(rawUrl) : null;
    if (initialUrl) {
      await chrome.runtime.sendMessage({
        type: "REGISTER_FILENAME_FOR_PROMPT",
        payload: {
          promptId: prompt.id,
          promptNumber: prompt.number,
          url: initialUrl,
          isVideo: true
        }
      }).catch(() => {});
    }
    // Wait until the video is actually RENDERED in the card (non-zero dimensions), not
    // just "claimed" by the monitor. Opening the quality menu while the card is still a
    // 0x0 placeholder fails ("Failed to upscale resolution") and burns a retry. Re-query
    // the <video> each tick — the card can swap its node as it finishes rendering.
    let width = 0;
    let height = 0;
    const _readyDeadline = Date.now() + 20000;
    while (Date.now() < _readyDeadline) {
      const v = card.querySelector('video');
      if (v) video = v;
      if (video) {
        width = video.videoWidth;
        height = video.videoHeight;
        if (width > 0 && height > 0) break;
        // The monitor already claimed the video URL before this call, so a present src means
        // the card is past the 0x0 placeholder and ready to download. Flow videos use an
        // API-redirect src whose <video> never reports dimensions, so waiting for
        // videoWidth>0 always burned the full 20s deadline. Break on a valid src instead.
        const _src = video.src || video.querySelector('source')?.src;
        if (_src && /getMediaUrlRedirect|\.mp4/i.test(_src)) break;
        if (video.readyState < 1 || video.videoWidth === 0) {
          await ensureVideoMetadataLoaded(video);
      }
      }
      await sleep(400);
    }
    console.log(`[GenFlow] Video dimensions: ${width}x${height}`);
    if (!(width > 0)) {
      console.warn(`[GenFlow] Video still 0x0 after readiness wait — proceeding (may retry)`);
    }
    let isAlreadyTarget = false;
    const targetLower = targetQuality.toLowerCase();
    if (targetLower.includes("1080") && width >= 1920) {
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
        return { success: true, upscaledUrl, downloaded: true };
      }
    }
    let downloadItemEl = null;
    const openAndGetSubmenu = async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', keyCode: 27, bubbles: true }));
      document.body.click();
      await sleep(150);

      // Hover all container elements inside the card to reveal three-dots
      const containers = Array.from(card.querySelectorAll('div, a, button, span'));
      containers.push(card);
      for (const el of containers) {
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
      await sleep(150);

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
        await sleep(300);
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
        await sleep(200);
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
      
      // Wait for submenu to open
      await sleep(200);
      const submenuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [class*="menuitem" i]')).filter(item => !menuItems.includes(item));
      return submenuItems.length > 0 ? submenuItems : null;
    };
    const _releaseVeoMenu = await acquireVeoMenu();
    let _veoMenuDone = false;
    const releaseVeoMenu = () => { if (!_veoMenuDone) { _veoMenuDone = true; _releaseVeoMenu(); } };
    let submenuItems = await openAndGetSubmenu();
    for (let _a = 0; _a < 3 && !submenuItems; _a++) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      document.body.click();
      await sleep(500);
      submenuItems = await openAndGetSubmenu();
    }
    if (!submenuItems) {
      releaseVeoMenu();
      return { success: false };
    }
    const targetQStr = targetQuality.replace("p", "").toLowerCase();
    // Log what Flow actually offers — Veo's video submenu differs from the image one and
    // may not expose every resolution (e.g. only 720p/1080p for some clips).
    console.log(`[GenFlow] Video quality submenu options: ${submenuItems.map((i) => JSON.stringify((i.textContent || "").trim())).join(", ")}`);
    // Case-INSENSITIVE match — Flow labels it "4K"/"2K", but the requested value is "4k"/"2k".
    // (The old `.includes("4k")` never matched "4K" and silently dropped to 720p.) 4K is
    // also written "2160", 2K as "1440" in some locales.
    const _matchRes = (item, q) => {
      const t = (item.textContent || "").toLowerCase();
      if (t.includes(q)) return true;
      if (q === "4k" && t.includes("2160")) return true;
      if (q === "2k" && t.includes("1440")) return true;
      return false;
    };
    // Exact resolution match only. Never substitute a different one: a LOWER res shortchanges
    // the order, and a HIGHER one (e.g. 4K) burns bonus credits the user didn't ask for. If the
    // requested resolution isn't offered, targetOption stays null → fail for retry below.
    let targetOption = submenuItems.find((item) => _matchRes(item, targetQStr));
    if (!targetOption) {
      const hasAnyResolution = submenuItems.some(item => /(720|1080|4k|2k|1k)/i.test(item.textContent));
      if (!hasAnyResolution && downloadItemEl) {
        console.log("[GenFlow] No resolution submenu found (compiled scene/film clip). Downloading directly...");
        await chrome.runtime.sendMessage({
          type: "START_EXPECTING_DOWNLOAD",
          payload: { promptId: prompt.id }
        }).catch(() => {});
        await chrome.runtime.sendMessage({ type: "ALLOW_NEXT_DOWNLOADS" }).catch(() => {});
        downloadItemEl.click();
        await sleep(350);
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
        releaseVeoMenu();
        return { success: true, upscaledUrl };
      }
      console.error(`[GenFlow] Requested quality ${targetQuality} not offered — failing for retry (exact resolution only, no substitute)`);
      releaseVeoMenu();
      return { success: false };
    }
    // Get visible errors BEFORE clicking the quality option
    const preClickErrors = new Set();
    const findErrorsRaw = () => {
      const errs = [];
      const elements = document.querySelectorAll('[role="alert"], [role="status"], [class*="alert" i], [class*="error" i], [class*="toast" i], [class*="snackbar" i], [data-sonner-toast]');
      for (const el of elements) {
        if (el.textContent && el.offsetWidth > 0 && el.offsetHeight > 0) {
          errs.push(el.textContent.trim());
        }
      }
      return errs;
    };
    findErrorsRaw().forEach(e => preClickErrors.add(e));

    console.log(`[GenFlow] Clicking quality option: ${targetOption.textContent.trim()}`);
    await chrome.runtime.sendMessage({
      type: "START_EXPECTING_DOWNLOAD",
      payload: { promptId: prompt.id }
    }).catch(() => {});
    await chrome.runtime.sendMessage({ type: "ALLOW_NEXT_DOWNLOADS" }).catch(() => {});
    chrome.runtime.sendMessage({ type: "UPDATE_PROMPT_INFO", payload: { promptId: prompt.id, info: `Upscaling ${targetQuality.toUpperCase()}...` } }).catch(() => {});
    targetOption.click();
    await sleep(400);
    // Download has fired — release the menu so the next parallel video can open its own
    // (its toast/download finishes below in parallel, outside the lock).
    releaseVeoMenu();

    const findNewFlowErrorMessage = () => {
      const errMsg = findFlowErrorMessage();
      if (errMsg && !preClickErrors.has(errMsg)) {
        return errMsg;
      }
      return null;
    };

    // Check for immediate error BEFORE checking upscale toast
    const immediateErrMsg = findNewFlowErrorMessage();
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
          if (/повышаем разрешение|повышаем|увеличение разрешения|increasing.*resolution|upscal|解像度|アップсケー|向上|高画質/i.test(txt) && isVisible2(el)) {
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
      const maxWaitTime = 5 * 60 * 1e3;
      const pollInterval = 4e3;
      const start = Date.now();
      while (Date.now() - start < maxWaitTime) {
        await sleep(pollInterval);
        const errMsg = findNewFlowErrorMessage();
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
      const delayedErrMsg = findNewFlowErrorMessage();
      if (delayedErrMsg) {
        console.error("[GenFlow] Delayed Flow error detected after quality click:", delayedErrMsg);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
        throw new Error(delayedErrMsg);
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
  async function waitForGenerationComplete(prompt, slotId, timeoutMs = 5 * 60 * 1e3, createButtonClickTime = Date.now(), generationType, preGenerationSnapshot, ownCard, settings) {
    const startTime = Date.now();
    let checkCount = 0;
    const snapshot = preGenerationSnapshot ?? snapshotVideoSources();
    const preGenerationVideoSrcs = snapshot.urls;
    const preGenerationMediaNames = snapshot.names;
    console.log(`[GenFlow] Starting generation monitoring for prompt #${prompt.number} (slotId: ${slotId})`);
    console.log(`[GenFlow] Snapshotted ${preGenerationVideoSrcs.size} existing video sources (${preGenerationMediaNames.size} UUIDs)`);
    const existingInstance = monitoringInstances.get(slotId);
    if (existingInstance) {
      if (existingInstance.checkInterval) {
        clearInterval(existingInstance.checkInterval);
      }
    }
    const mergedPreGenUrls = new Set(preGenerationVideoSrcs);
    const mergedPreGenNames = new Set(preGenerationMediaNames);
    for (const [, existingInst] of monitoringInstances) {
      existingInst.preGenerationVideoSrcs.forEach((u) => mergedPreGenUrls.add(u));
      existingInst.preGenerationMediaNames.forEach((n) => mergedPreGenNames.add(n));
    }
    const instance = {
      promptId: prompt.id,
      promptNumber: prompt.number,
      promptText: prompt.text || "",
      slotId,
      generationType,
      checkInterval: null,
      observer: null,
      preGenerationVideoSrcs: mergedPreGenUrls,
      preGenerationMediaNames: mergedPreGenNames,
      createButtonClickTime,
      detectedVideoUrls: /* @__PURE__ */ new Set(),
      claimedVideoUrl: null,
      ownCardElement: ownCard ?? null,
      cardId: ownCard ? ownCard.getAttribute("data-tile-id") : null,
      settings: settings || null
    };
    monitoringInstances.set(slotId, instance);
    return new Promise((resolve, reject) => {
      let resolved = false;
      const cleanup = (failed = false) => {
        if (instance.checkInterval) {
          clearInterval(instance.checkInterval);
          instance.checkInterval = null;
        }
        if (failed && instance.claimedVideoUrl) {
          const claimedUrl = instance.claimedVideoUrl;
          claimedVideoUrls.delete(claimedUrl);
          const name = extractMediaNameFromUrl(claimedUrl);
          if (name)
            claimedMediaNames.delete(name);
          console.log(`[GenFlow] Slot ${slotId} (prompt #${instance.promptNumber}) released claim on failure`);
        }
        monitoringInstances.delete(slotId);
      };
      let multiSlotRejectCount = 0;
      const completeGeneration = async (videoUrl) => {
        if (resolved || completedPromptIds.has(prompt.id)) {
          console.log(`[GenFlow] Prompt #${prompt.number} already completed, skipping...`);
          return;
        }
        resolved = true;
        completedPromptIds.add(prompt.id);
        const instanceForUrl = monitoringInstances.get(slotId);
        if (!instanceForUrl?.claimedVideoUrl) {
          console.log("[GenFlow] Verifying completion (no claimed URL yet)...");
          await sleep(2e3);
          const recheck = checkGenerationStatusForSlot(slotId);
          if (!recheck.isComplete) {
            console.log("[GenFlow] Double verification failed, continuing to monitor...");
            resolved = false;
            completedPromptIds.delete(prompt.id);
            return;
          }
        } else {
          console.log(`[GenFlow] Skipping double verification \u2014 claimedVideoUrl already set: ${instanceForUrl.claimedVideoUrl.substring(0, 60)}`);
        }
        const finalUrl = instanceForUrl?.claimedVideoUrl ?? videoUrl;
        const promptNumberForFile = prompt.number;
        // Claimed-card readiness guard. Was image-to-video ONLY, but text-to-video hits
        // the same race: the own-card can be a connected-but-empty PLACEHOLDER (the video
        // rendered into a different tile), so the clicks download finds no <video> and the
        // prompt hard-fails ("No video element found" → "Failed to upscale resolution").
        // Apply for ANY video type — but ONLY when we actually need the card, i.e. clicks
        // output. With code output the file is downloaded by API from finalUrl (no card at
        // all), so waiting on a card here would needlessly stall it.
        if (finalUrl && !(settings && settings.outputMethod === "code")) {
          const claimedName = extractMediaNameFromUrl(finalUrl);
          let card = instanceForUrl?.ownCardElement;
          // The own-card reference goes stale when the tile element is replaced
          // on completion, so a detached node reports no <video> forever and the
          // slot hangs in "processing". Re-resolve it by its stable tile-id (the
          // same recovery the download path does below) before gating.
          if (card && !card.isConnected && instanceForUrl?.cardId) {
            const live = document.querySelector(`[data-tile-id="${instanceForUrl.cardId}"]`);
            if (live) {
              card = live;
              if (instanceForUrl)
                instanceForUrl.ownCardElement = live;
            }
          }
          // If the card is gone and cannot be re-resolved, do not gate on a dead
          // node (that hangs forever) — let completion proceed via the URL-based
          // card lookup in the download path below.
          if (card && !card.isConnected)
            card = null;
          if (card && claimedName) {
            const hasVideo = !!card.querySelector("video");
            if (!hasVideo) {
              console.log(`[GenFlow] claimed URL has no <video> in card yet, waiting... (prompt #${promptNumberForFile})`);
              resolved = false;
              completedPromptIds.delete(prompt.id);
              if (instanceForUrl) {
                claimedVideoUrls.delete(finalUrl);
                if (claimedName)
                  claimedMediaNames.delete(claimedName);
                instanceForUrl.claimedVideoUrl = null;
              }
              return;
            }
          }
        }
        if (monitoringInstances.size > 1 && !instanceForUrl?.claimedVideoUrl) {
          multiSlotRejectCount++;
          if (multiSlotRejectCount < 3) {
            console.log(`[GenFlow] Multi-slot: slot ${slotId} has no claimed video, rejecting (${multiSlotRejectCount}/3)`);
            resolved = false;
            completedPromptIds.delete(prompt.id);
            return;
          }
          console.log(`[GenFlow] Multi-slot: slot ${slotId} forced completion after ${multiSlotRejectCount} rejections`);
        }
        let resultUrlToSend = getDownloadUrlForVideo(finalUrl || null);
        let downloadedFlag = false;
        let _downloadPending = false; // code-output: background (handleCodeOutput) owns the download
        // Honor the auto-download toggle: when it's OFF, do NOT trigger Flow's
        // upscale+download (it clicks Flow's own download button). Previously this
        // ran whenever a quality was set, so videos downloaded regardless of the
        // setting — and a mismatched card could even download an old video. The
        // base result URL is still sent so the user can download it manually.
        if (isFlowHost() && settings && settings.outputMethod === "code" && settings.autoDownload !== false && finalUrl) {
          // Hybrid: clicks-input + code-output for VIDEO (mirrors banana.js image path). The
          // video is generated and its base URL is already claimed — hand it to the background,
          // which upscales (1080p/4K) and downloads by API (handleCodeOutput). No <video>/card/
          // menu dependency, so the empty-placeholder-card race can no longer fail a good video.
          // This is exactly the "default path (clicks-input + code-output)" the background
          // already implements; veo.js just never called it before.
          try {
            chrome.runtime.sendMessage({ type: "CODE_OUTPUT", payload: { promptId: prompt.id, promptNumber: promptNumberForFile, resultUrl: finalUrl, isVideo: true, text: prompt.text } });
          } catch (e) {}
          // Hand completion to the pipeline: GENERATION_COMPLETE below carries downloadPending,
          // so the background sets "downloading" + watchdog and handleCodeOutput completes it via
          // completeIfDownloading. Without this, completeGeneration marked it done AND re-downloaded
          // the base URL (double download + wrong res), and completeIfDownloading no-op'd -> stuck.
          _downloadPending = true;
        } else if (isFlowHost() && settings && settings.quality && settings.autoDownload !== false) {
          let card = instanceForUrl?.ownCardElement;
          if (card && !card.isConnected && instanceForUrl?.cardId) {
            card = document.querySelector(`[data-tile-id="${instanceForUrl.cardId}"]`);
          }
          if (!card && finalUrl) {
            const name = extractMediaNameFromUrl(finalUrl);
            let videoEl = null;
            if (name) {
              videoEl = document.querySelector(`video[src*="${name}"], video source[src*="${name}"]`);
            }
            if (!videoEl) {
              const normSend = normalizeMediaUrl(finalUrl);
              videoEl = Array.from(document.querySelectorAll('video')).find(v => {
                const src = v.src || v.querySelector('source')?.src;
                return src && normalizeMediaUrl(src) === normSend;
              });
            }
            if (!videoEl) {
              const basePart = finalUrl.split(/[?#]/)[0];
              if (basePart && basePart.length > 20) {
                videoEl = Array.from(document.querySelectorAll('video')).find(v => {
                  const src = v.src || v.querySelector('source')?.src;
                  return src && src.includes(basePart);
                });
              }
            }
            card = videoEl ? videoEl.closest('[data-tile-id]') : null;
          }
          if (card) {
            let upscaleFailed = false;
            let upscaleErrMsg = "Failed to upscale resolution";
            try {
              const res = await triggerFlowUpscaleDownload(card, settings.quality, prompt);
              if (res && res.success) {
                downloadedFlag = true;
                if (res.upscaledUrl) {
                  resultUrlToSend = getDownloadUrlForVideo(res.upscaledUrl);
                }
              } else {
                upscaleFailed = true;
              }
            } catch (err) {
              console.error("[GenFlow] Error during Flow upscale download:", err);
              upscaleFailed = true;
              upscaleErrMsg = err.message || upscaleErrMsg;
            }
            if (upscaleFailed) {
              let resultUrls = [resultUrlToSend];
              if (instanceForUrl?.detectedVideoUrls && instanceForUrl.detectedVideoUrls.size > 0) {
                resultUrls = Array.from(instanceForUrl.detectedVideoUrls).map(getDownloadUrlForVideo);
              }
              const uniqueUrls = Array.from(new Set(resultUrls.filter(Boolean)));
              const resultUrlStr = uniqueUrls.join(",");
              await failGeneration(upscaleErrMsg, "UPSCALE_FAILED", resultUrlStr);
              return;
            }
          }
        }
        cleanup(false);
        if (!isValidRedirectUrl(resultUrlToSend)) {
          resultUrlToSend = "";
          console.warn(`[GenFlow] No valid redirect URL for prompt #${promptNumberForFile}, sending empty (queue will still advance)`);
        }
        console.log(`[GenFlow] Generation complete for prompt #${promptNumberForFile}`);
        let messageSent = false;
        for (let retry = 0; retry < 5; retry++) {
          try {
            await chrome.runtime.sendMessage({
              type: "GENERATION_COMPLETE",
              payload: {
                promptId: prompt.id,
                resultUrl: resultUrlToSend,
                downloaded: downloadedFlag,
                downloadPending: _downloadPending,
                promptNumber: promptNumberForFile
              }
            });
            messageSent = true;
            break;
          } catch (err) {
            console.error(`[GenFlow] Failed to send GENERATION_COMPLETE (attempt ${retry + 1}/5):`, err);
            if (retry < 4)
              await sleep(1500 * (retry + 1));
          }
        }
        if (!messageSent) {
          console.error(`[GenFlow] CRITICAL: Failed to send GENERATION_COMPLETE after 5 attempts for prompt #${promptNumberForFile}`);
        }
        for (let retry = 0; retry < 3; retry++) {
          try {
            await chrome.runtime.sendMessage({ type: "REQUEST_NEXT_PROMPT" });
            break;
          } catch (_) {
            if (retry < 2)
              await sleep(800);
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
        try {
          await chrome.runtime.sendMessage({
            type: "GENERATION_FAILED",
            payload
          });
        } catch (err) {
          console.error("[GenFlow] Failed to send GENERATION_FAILED, retrying once:", err);
          await sleep(800);
          try {
            await chrome.runtime.sendMessage({
              type: "GENERATION_FAILED",
              payload
            });
          } catch (err2) {
            console.error(`[GenFlow] CRITICAL: GENERATION_FAILED lost for prompt #${prompt.number}:`, err2);
          }
        }
        reject(new Error(error));
      };
      ensureGlobalMediaObserver();
      let initialDelayDone = false;
      let initialDelayErrorStreak = 0;
      const initialDelay = async () => {
        const INITIAL_DELAY = 3e4;
        const CHECK_INTERVAL = 5e3;
        const start = Date.now();
        while (Date.now() - start < INITIAL_DELAY) {
          if (resolved)
            return;
          if (!monitoringInstances.has(slotId) || monitoringInstances.get(slotId)?.promptId !== prompt.id) {
            return;
          }
          const earlyStatus = checkGenerationStatusForSlot(slotId);
          if (earlyStatus.isComplete) {
            console.log("[GenFlow] Early completion during initial delay");
            initialDelayDone = true;
            completeGeneration(earlyStatus.videoUrl);
            return;
          }
          if (earlyStatus.hasError) {
            if (earlyStatus.isPolicyError) {
              resolved = true;
              cleanup(true);
              chrome.runtime.sendMessage({
                type: "POLICY_ERROR",
                payload: { promptId: prompt.id }
              });
              resolve();
              return;
            }
            initialDelayErrorStreak++;
            if (initialDelayErrorStreak >= 2) {
              initialDelayDone = true;
              failGeneration(earlyStatus.errorMessage || "Generation failed");
              return;
            }
          } else {
            initialDelayErrorStreak = 0;
          }
          await sleep(CHECK_INTERVAL);
        }
        initialDelayDone = true;
        console.log("[GenFlow] Initial delay complete, starting intensive polling");
      };
      initialDelay().then(() => {
        if (resolved)
          return;
        if (!monitoringInstances.has(slotId) || monitoringInstances.get(slotId)?.promptId !== prompt.id) {
          return;
        }
        let consecutiveDomFailurePolls = 0;
        let consecutive429Polls = 0;
        instance.checkInterval = setInterval(() => {
          if (resolved)
            return;
          checkCount++;
          if (!monitoringInstances.has(slotId) || monitoringInstances.get(slotId)?.promptId !== prompt.id) {
            console.log(`[GenFlow] Monitoring instance for prompt #${prompt.number} was cleaned up, stopping...`);
            clearInterval(instance.checkInterval);
            return;
          }
          // Check OUR OWN completion BEFORE any page-wide error. Google's 429 toast is
          // page-wide, so a single rate-limit must not kill a slot whose video is already
          // claimed/done — that caused a finished video to be marked failed + re-generated.
          const currentInst = monitoringInstances.get(slotId);
          if (currentInst?.claimedVideoUrl) {
            if (checkCount % 5 === 0 || checkCount === 1) {
              console.log(`[GenFlow] Poll #${checkCount}: GlobalTracker claimed ${currentInst.claimedVideoUrl.substring(0, 60)}...`);
            }
            consecutiveDomFailurePolls = 0;
            completeGeneration(currentInst.claimedVideoUrl);
            return;
          }
          const dom429 = detectDOMErrors();
          if (dom429.type === "429") {
            // Don't fail instantly on a page-wide 429 — it may belong to OTHER slots, and
            // our video may be one poll away from being claimed (the check above completes
            // it next tick). Only give up after a few sustained 429 polls.
            consecutive429Polls++;
            if (consecutive429Polls < 4) return;
            failGeneration(dom429.message || "Rate limited (429)");
            return;
          }
          consecutive429Polls = 0;
          const status = checkGenerationStatusForSlot(slotId);
          if (checkCount % 5 === 0) {
            console.log(`[GenFlow] Poll #${checkCount}: generating=${status.isGenerating}, complete=${status.isComplete}`);
          }
          if (status.isComplete) {
            consecutiveDomFailurePolls = 0;
            completeGeneration(status.videoUrl);
            return;
          }
          if (status.hasError) {
            if (status.isPolicyError) {
              consecutiveDomFailurePolls = 0;
              resolved = true;
              cleanup(true);
              chrome.runtime.sendMessage({
                type: "POLICY_ERROR",
                payload: { promptId: prompt.id }
              });
              resolve();
              return;
            }
            consecutiveDomFailurePolls++;
            if (consecutiveDomFailurePolls < 3) {
              return;
            }
            consecutiveDomFailurePolls = 0;
            failGeneration(status.errorMessage || "Generation failed");
            return;
          }
          consecutiveDomFailurePolls = 0;
          if (checkCount >= 45 && monitoringInstances.size <= 1 && instance.detectedVideoUrls.size === 0 && !instance.claimedVideoUrl) {
            failGeneration("No video claimed (single slot, 90s)");
            return;
          }
          if (Date.now() - startTime > timeoutMs) {
            failGeneration("Generation timed out (5 min)");
            return;
          }
        }, 2e3);
      });
    });
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
              console.log("[GenFlow] Veo: Found mode dropdown trigger structurally:", btn);
              return btn;
            }
          }
        }
        parent = parent.parentElement;
      }
    }

    // 2. Fallback: traditional query by model names or keywords
    const buttons = document.querySelectorAll('button[aria-haspopup="menu"]');
    for (const btn of buttons) {
      if (!isVisible2(btn)) continue;
      const text = (btn.textContent || "").trim().toLowerCase();
      // Settings trigger button contains model name/type and configuration (crop or xCount)
      const hasModel = /nano banana|banana|imagen|veo|video|видео|image|изображ|фото/i.test(text);
      const hasConfig = /crop|x\d|\dx/i.test(text);
      if (hasModel && hasConfig) {
        return btn;
      }
      if (hasModel && (btn.querySelector('svg') || text.includes('arrow') || text.includes('chevron'))) {
        return btn;
      }
    }
    return null;
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
  function clickFlowTabVideo() {
    const tab = findTabByIconAndText("play_circle", ["видео", "video", "動画", "ビデオ"]);
    if (tab) {
      if (tab.getAttribute("aria-selected") === "true") {
        console.log("[GenFlow] Video tab already selected");
        return true;
      }
      console.log("[GenFlow] Clicking Video tab:", tab.textContent.trim());
      nativeClick(tab);
      return true;
    }
    console.log("[GenFlow] Video tab not found");
    return false;
  }
  function selectVideoCount(count = 1) {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      const text = (tab.textContent || "").trim();
      const ariaSelected = tab.getAttribute("aria-selected");
      if (text === `x${count}` || text === `${count}x` || text === count.toString()) {
        if (ariaSelected === "true") {
          console.log(`[GenFlow] x${count} already selected`);
          return true;
        }
        console.log(`[GenFlow] Clicking x${count} tab`);
        nativeClick(tab);
        return true;
      }
    }
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = (btn.textContent || "").trim();
      if (text === `x${count}` || text === `${count}x` || text === count.toString()) {
        const ariaSelected = btn.getAttribute("aria-selected");
        if (ariaSelected === "true") {
          console.log(`[GenFlow] x${count} already selected`);
          return true;
        }
        console.log(`[GenFlow] Clicking x${count} button`);
        nativeClick(btn);
        return true;
      }
    }
    console.log(`[GenFlow] x${count} not found`);
    return false;
  }
  function clickFlowTabFrames() {
    const tab = findTabByIconAndText("crop_free", ["кадр", "frame", "frames", "кадры", "кадрам", "フレーム"]);
    if (tab) {
      if (tab.getAttribute("aria-selected") === "true") {
        console.log("[GenFlow] Frames tab already selected");
        return true;
      }
      console.log("[GenFlow] Clicking Frames tab:", tab.textContent.trim());
      nativeClick(tab);
      return true;
    }
    console.log("[GenFlow] Frames tab/button not found");
    return false;
  }
  function clickFlowTabSamples() {
    // Video sub-modes in the settings menu are «Кадры» (crop_free) and «Образцы»
    // (chrome_extension) — there is NO «Текст» tab; icons verified on the live menu.
    // The menu REMEMBERS the last sub-mode: after a film/i2v run it stays on «Кадры»,
    // where the reference (add_2) button does not exist. Reference t2v prompts need
    // the «Образцы» sub-mode selected.
    const tab = findTabByIconAndText("chrome_extension", ["образц", "sample", "ingredient", "ингредиент"]);
    if (tab) {
      if (tab.getAttribute("aria-selected") === "true") {
        console.log("[GenFlow] Samples tab already selected");
        return true;
      }
      console.log("[GenFlow] Clicking Samples tab:", tab.textContent.trim());
      nativeClick(tab);
      return true;
    }
    console.log("[GenFlow] Samples tab/button not found");
    return false;
  }
  function clickFlowScale(settings) {
    const targetRatio = settings.aspectRatio; // e.g. "16:9"
    const candidates = document.querySelectorAll('button, [role="tab"], [role="radio"], [role="menuitem"]');
    for (const el of candidates) {
      if (!isVisible2(el)) continue;
      const text = (el.textContent || "").trim();
      if (text.includes(targetRatio)) {
        const ariaSelected = el.getAttribute("aria-selected");
        if (ariaSelected === "true") {
          console.log(`[GenFlow] Scale ${targetRatio} already selected`);
          return true;
        }
        console.log(`[GenFlow] Clicking scale:`, text.slice(0, 40));
        nativeClick(el);
        return true;
      }
    }
    console.log(`[GenFlow] Scale ${targetRatio} not found`);
    return false;
  }
  async function clickFlowModelInMenu(settings) {
    // tier = fast | quality | lite (any value containing "lite" -> lite). "lower priority" is its own
    // Flow menu row; only target it when the user picked the lower-priority model, otherwise skip it.
    const _m = String(settings.model || "veo3.1-fast").toLowerCase();
    const targetModel = _m.indexOf("lite") >= 0 ? "lite" : _m.indexOf("fast") >= 0 ? "fast" : "quality";
    const wantLower = _m.indexOf("lower") >= 0;
    const tryClick = () => {
      const candidates = document.querySelectorAll('button, [role="option"], [role="menuitem"], [data-radix-collection-item]');
      let fallback = null;
      for (const el of candidates) {
        if (!isVisible2(el)) continue;
        const text = (el.textContent || "").trim().toLowerCase();
        if (!text) continue;
        if (text.includes("lower priority") !== wantLower) continue; // pick the lower-priority row ONLY when it's the selected model
        if (!text.includes(targetModel)) continue;
        // Prefer the exact "Veo 3.1 - <tier>" row (the picker also has Omni Flash / Lite, so a bare
        // tier match could land elsewhere). Keep a looser tier-only match as a fallback.
        if (text.includes("veo 3.1") || text.includes("veo3.1")) { console.log(`[GenFlow] Clicking model: ${text}`); nativeClick(el); return true; }
        if (!fallback) fallback = el;
      }
      if (fallback) { console.log(`[GenFlow] Clicking model (fallback): ${(fallback.textContent || "").trim()}`); nativeClick(fallback); return true; }
      return false;
    };
    // Direct attempt (works if the model picker is already open).
    if (tryClick()) return true;
    // The model picker is its OWN dropdown — options aren't in the DOM until it's opened. Find the
    // trigger (it shows the current model name, e.g. "Omni Flash" / "Veo 3.1 - …"), open it, then poll.
    const isModelName = (t) => t.includes("omni flash") || (t.includes("veo 3.1") && (t.includes("fast") || t.includes("quality") || t.includes("lite")));
    let trigger = null;
    for (const tr of document.querySelectorAll('button, [role="combobox"], [aria-haspopup="listbox"], [aria-haspopup="menu"], [aria-haspopup="true"]')) {
      if (isVisible2(tr) && isModelName((tr.textContent || "").trim().toLowerCase())) { trigger = tr; break; }
    }
    if (trigger) {
      console.log("[GenFlow] Opening model picker via trigger…");
      nativeClick(trigger);
      for (let i = 0; i < 16; i++) { await sleep(150); if (tryClick()) return true; }
    }
    console.log(`[GenFlow] Model (${targetModel}) not found in menu`);
    return false;
  }
  function closeFlowDialogIfOpen() {
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    const backdrop = document.querySelector('[data-state="open"] + [data-radix-portal], .backdrop, [class*="overlay"]');
    if (backdrop) {
      backdrop.click();
    }
  }
  // ===== GenFlow native characters (video, clicks-mode) =====
  // Mirrors banana.js: attach a prepared Flow CHARACTER via the "+" reference
  // picker's "Characters" tab (yields referenceEntities, no chrome.debugger).
  // The video path has no per-prompt reference data, so we match prepared
  // character names that appear in the prompt TEXT against the gfCharacterEntities
  // cache (written by the PREPARE_CHARACTERS background handler).
  const GF_REFERENCE_VIRTUOSO_LIST_SEL = 'div[data-testid="virtuoso-item-list"]';
  var gfCharacterEntities = {};
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["gfCharacterEntities"], (r) => {
      if (r && r.gfCharacterEntities && typeof r.gfCharacterEntities === "object") gfCharacterEntities = r.gfCharacterEntities;
    });
    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((c, area) => {
        if (area === "local" && c.gfCharacterEntities && c.gfCharacterEntities.newValue) gfCharacterEntities = c.gfCharacterEntities.newValue;
      });
    }
  }
  function gfNormName(s) { return String(s || "").normalize("NFC").trim().toLowerCase(); }
  function gfCurrentProjectId() { const m = (location.pathname || "").match(/\/project\/([0-9a-fA-F-]{8,})/); return m ? m[1] : null; }
  // ===== Reference inventory via Flow API (Layer 1): objects + characters in ONE GET =====
  // flow.projectInitialData returns the whole project; we derive uploaded OBJECTS
  // (name -> mediaId) and CHARACTER entities (name) from it. Same-origin fetch carries the
  // session cookies. Cached for the batch; reset on RESET_CONTENT_STATE. ok=false → callers
  // fall back to scrolling the picker. Mirrors flowApi.listProjectReferences (code mode).
  var gfRefInventory = null;
  function gfMediaIdFromUrl(url) {
    if (!url || url.startsWith("blob:")) return null;
    const m = url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return m ? m[1] : null;
  }
  async function gfFetchRefInventory() {
    if (gfRefInventory !== null) return gfRefInventory;
    let inv = { objects: [], characters: [], ok: false };
    try {
      const pid = gfCurrentProjectId();
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
          // Persist characters into the SHARED gfCharacterEntities cache (same shape as
          // banana's auto-import at banana.js ~2618) so video no longer depends on a live
          // API call to know its characters — parity with photo, which reads this cache.
          // Once any successful fetch has run, `gfCharacterNamesInText` finds the names even
          // if the API later fails. Merge-only: never clobber banana's richer entries.
          try {
            if (pid && characters.length) {
              const bucket = gfCharacterEntities[pid] || {};
              let added = 0;
              for (const c of characters) {
                if (!c.name || bucket[c.name]) continue;
                bucket[c.name] = { displayName: c.name, entityId: c.entityId || ("imported_" + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()))), photoHash: "", voice: "" };
                added++;
              }
              if (added) { gfCharacterEntities[pid] = bucket; chrome.storage.local.set({ gfCharacterEntities }); }
            }
          } catch (e) {}
          console.log(`[GenFlow] Veo: reference inventory via API — ${objects.length} object(s), ${characters.length} character(s)`);
        }
      }
    } catch (e) { console.warn("[GenFlow] Veo: reference inventory fetch failed", e); }
    // Only memoize a SUCCESSFUL fetch. A failed/empty result must NOT be cached — otherwise a
    // single transient hiccup poisons every remaining prompt in the batch (characters silently
    // stop attaching). Leaving it null makes the next prompt retry.
    if (inv.ok) gfRefInventory = inv;
    return inv;
  }
  function gfCharacterNamesInText(text) {
    const norm = gfNormName(text);
    if (!norm) return [];
    const pid = gfCurrentProjectId();
    const buckets = [];
    if (pid && gfCharacterEntities[pid]) buckets.push(gfCharacterEntities[pid]);
    for (const p in gfCharacterEntities) { if (p !== pid && gfCharacterEntities[p]) buckets.push(gfCharacterEntities[p]); }
    const found = [], seen = new Set();
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
  function gfFindAddReferenceButton() {
    for (const btn of document.querySelectorAll('button[aria-haspopup="dialog"]')) {
      const icon = btn.querySelector("i");
      if (!icon || (icon.textContent || "").trim() !== "add_2") continue;
      const span = btn.querySelector("span");
      const spanText = (span?.textContent || "").trim();
      if (spanText !== "Create" && spanText !== "Создать") continue;
      if (!isVisible2(btn)) continue;
      return btn;
    }
    for (const btn of document.querySelectorAll("button")) {
      const icon = btn.querySelector("i");
      if (icon && (icon.textContent || "").trim() === "add_2" && isVisible2(btn)) return btn;
    }
    return null;
  }
  async function gfOpenCharacterPicker(tabIcon = "accessibility_new") {
    let btn = gfFindAddReferenceButton();
    if (!btn) {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && !btn) {
        await sleep(100);
        btn = gfFindAddReferenceButton();
      }
    }
    if (!btn) {
      // Never fail silently: the add_2 button simply doesn't exist when the composer
      // sub-mode is «Кадры» (not «Образцы») or the selected model doesn't support references.
      console.warn("[GenFlow] Veo: reference button (add_2) not found in composer — sub-mode is not «Образцы»/Samples, or the current model does not support references; attach skipped");
      return false;
    }
    nativeClick(btn);
    await sleep(1200);
    try {
      const dlg = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
      if (dlg) {
        for (const tb of dlg.querySelectorAll('button[role="tab"]')) {
          const ic = tb.querySelector("i");
          if (ic && (ic.textContent || "").trim() === tabIcon) {
            if (tb.getAttribute("aria-selected") !== "true") { nativeClick(tb); await sleep(400); }
            break;
          }
        }
      }
    } catch (e) {}
    return true;
  }
  function gfOptionName(optionEl) {
    const img = optionEl.querySelector("img");
    const alt = img ? gfNormName(img.getAttribute("alt") || "") : "";
    if (alt) return alt;
    return gfNormName(optionEl.textContent || "").replace(/(символ|character|изображение|image)$/i, "").trim();
  }
  async function gfAttachCharacterVeo(displayName) {
    const want = gfNormName(displayName);
    if (!want) return false;
    const opened = await gfOpenCharacterPicker();
    if (!opened) return false;
    const getDlg = () => document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
    let option = null, lastScroll = -1;
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline && !option) {
      const dlg = getDlg();
      if (dlg) {
        for (const o of dlg.querySelectorAll('[role="option"]')) { if (gfOptionName(o) === want) { option = o; break; } }
        if (!option) {
          const list = dlg.querySelector(GF_REFERENCE_VIRTUOSO_LIST_SEL);
          const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
          if (scroller && scroller.scrollTop !== lastScroll) { lastScroll = scroller.scrollTop; scroller.scrollTop += 600; }
        }
      }
      if (!option) await sleep(150);
    }
    if (!option) { console.log(`[GenFlow] Veo: no native character "${displayName}" in picker — skipping`); closeFlowDialogIfOpen(); await sleep(200); return false; }
    const target = (option.closest && option.closest('[role="option"]')) || option;
    for (let a = 0; a < 3; a++) { nativeClick(target); await sleep(80); try { target.click(); } catch (e) {} await sleep(150); if (target.getAttribute("aria-selected") === "true") break; }
    const dlg = (target.closest && target.closest('[role="dialog"]')) || getDlg();
    if (dlg) {
      const cbtn = Array.from(dlg.querySelectorAll("button")).find((b) => { const t = (b.textContent || "").toLowerCase(); const dis = b.disabled || b.getAttribute("aria-disabled") === "true"; return !dis && (t.includes("добавить в запрос") || t.includes("add to prompt")); });
      if (cbtn) { nativeClick(cbtn); await sleep(80); try { cbtn.click(); } catch (e) {} await sleep(700); }
    }
    console.log(`[GenFlow] Veo: attached native character "${displayName}" (Characters tab)`);
    return true;
  }
  async function gfAttachVideoCharacters(promptText, maxChars, attached) {
    let names = [];
    try { names = gfCharacterNamesInText(promptText); } catch (e) {}
    // Augment with characters from the API inventory: video has no background-prepared cache
    // for library-imported characters, so the entities[] list is the reliable source.
    try {
      const inv = await gfFetchRefInventory();
      if (inv && inv.ok && inv.characters.length) {
        const norm = gfNormName(promptText);
        const seen = /* @__PURE__ */ new Set(names.map(gfNormName));
        for (const c of inv.characters) {
          if (seen.has(c.name)) continue;
          let hit = false;
          try { hit = new RegExp("(^|[^\\p{L}\\p{N}])" + c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\p{L}\\p{N}]|$)", "u").test(norm); }
          catch (e) { hit = norm.includes(c.name); }
          if (hit) { names.push(c.name); seen.add(c.name); }
        }
      }
    } catch (e) {}
    if (!names.length) return 0;
    let n = 0;
    for (const name of names.slice(0, maxChars || 3)) {
      try {
        if (await gfAttachCharacterVeo(name)) {
          n++;
          // Record the attached character name so the object pass below does NOT
          // also attach a library photo with the same name (the "character + its
          // picture" double-attach bug).
          if (attached) attached.add(gfNormName(name));
        }
      } catch (e) { console.warn("[GenFlow] Veo: character attach failed", e); }
      await sleep(300);
    }
    if (n) console.log(`[GenFlow] Veo: attached ${n}/${names.length} native character(s) for video`);
    else {
      // Expected character(s) (names matched known/library entities) but attached NONE -> the reference
      // picker / character library likely didn't load = stale Flow session. Signal it for the reset hint.
      console.warn(`[GenFlow] Veo: expected ${names.length} character(s), attached 0 — possible stale Flow session`);
      try { chrome.runtime.sendMessage({ type: "GF_STALL", payload: { reason: "characters" } }).catch(() => {}); } catch (e) {}
    }
    return n;
  }
  // Library objects (plain photos) for VIDEO — mirror of banana.js: ONE picker open,
  // scroll the Uploads tab once, cache base names in session memory, multi-select
  // matching unattached options, then "Add to prompt" once. No cache file, no
  // re-upload, no double-open. Reset on page reload (Load Images reloads the tab).
  var gfVideoLibraryObjectNames = null;
  function gfObjectBaseName(s) {
    return gfNormName(s).replace(/^ref[_-]/, "").replace(/\.(png|jpe?g|webp|gif|avif)$/i, "").replace(/[_-]\d{10,}(_\d+)?$/, "").trim();
  }
  // Click the picker's "Add to prompt" / "Добавить в запрос" once. Returns true if clicked.
  async function gfConfirmAddToPrompt(dlg) {
    if (!dlg) return false;
    const cbtn = Array.from(dlg.querySelectorAll("button")).find((b) => {
      const t = (b.textContent || "").toLowerCase();
      const dis = b.disabled || b.getAttribute("aria-disabled") === "true";
      return !dis && (t.includes("добавить в запрос") || t.includes("add to prompt"));
    });
    if (!cbtn) return false;
    nativeClick(cbtn); await sleep(80); try { cbtn.click(); } catch (e) {} await sleep(700);
    return true;
  }
  async function gfAttachVideoObjectsByText(promptText, roomLeft, attached) {
    if (roomLeft <= 0) return 0;
    const norm = gfNormName(promptText);
    if (!norm) return 0;
    if (!attached) attached = /* @__PURE__ */ new Set();
    const wordHit = (name) => {
      if (!name) return false;
      try { return new RegExp("(^|[^\\p{L}\\p{N}])" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\p{L}\\p{N}]|$)", "u").test(norm); }
      catch (e) { return norm.includes(name); }
    };
    const getDlg = () => document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');

    // ---- Layer-1 path: API inventory (complete object list, no enumeration scroll) ----
    const inv = await gfFetchRefInventory();
    if (inv && inv.ok) {
      // Authoritative complete name set → correct fast-path skip for every later prompt.
      gfVideoLibraryObjectNames = /* @__PURE__ */ new Set(inv.objects.map((o) => o.name));
      const wantNames = /* @__PURE__ */ new Set();
      const wantMediaIds = /* @__PURE__ */ new Set();
      for (const o of inv.objects) {
        if (wantNames.size >= roomLeft) break;
        if (attached.has(o.name) || wantNames.has(o.name)) continue;
        if (wordHit(o.name)) { wantNames.add(o.name); if (o.mediaId) wantMediaIds.add(o.mediaId); }
      }
      if (!wantNames.size) return 0;                 // nothing in this prompt → don't open the picker
      const opened = await gfOpenCharacterPicker("drive_folder_upload");
      if (!opened) return 0;
      // Same render-wait as banana: the Uploads list can take >1s to render after a
      // close/reopen, and we KNOW the library is non-empty (API inventory) — wait for
      // the first option instead of scanning an empty list.
      {
        const renderDeadline = Date.now() + 5000;
        while (Date.now() < renderDeadline) {
          const dlg0 = getDlg();
          if (dlg0 && dlg0.querySelectorAll('[role="option"]').length > 0) break;
          await sleep(150);
        }
      }
      const selected = /* @__PURE__ */ new Set();
      let lastScroll = -1, stall = 0;
      const deadline = Date.now() + 8e3;
      while (Date.now() < deadline && selected.size < wantNames.size) {
        const dlg = getDlg(); if (!dlg) break;
        for (const o of dlg.querySelectorAll('[role="option"]')) {
          const img = o.querySelector("img"); if (!img) continue;
          const mid = gfMediaIdFromUrl(img.src || img.getAttribute("src") || "");
          const bn = gfObjectBaseName((img.getAttribute("alt") || "").trim() || (o.textContent || "").trim());
          const isWanted = (mid && wantMediaIds.has(mid)) || (bn && wantNames.has(bn));
          if (!isWanted) continue;
          const key = bn || mid;
          if (selected.has(key) || attached.has(bn)) continue;
          const opt = (o.closest && o.closest('[role="option"]')) || o;
          if (opt.getAttribute("aria-selected") !== "true") { nativeClick(opt); await sleep(70); try { opt.click(); } catch (e) {} await sleep(120); }
          if (opt.getAttribute("aria-selected") === "true") { selected.add(key); if (bn) attached.add(bn); }
        }
        const list = dlg.querySelector(GF_REFERENCE_VIRTUOSO_LIST_SEL);
        const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
        if (scroller && scroller.scrollTop !== lastScroll) { lastScroll = scroller.scrollTop; scroller.scrollTop += 600; await sleep(150); }
        else { stall++; if (stall > 3) break; await sleep(150); }
      }
      if (!selected.size) { closeFlowDialogIfOpen(); await sleep(120); return 0; }
      if (!(await gfConfirmAddToPrompt(getDlg()))) { closeFlowDialogIfOpen(); await sleep(120); return 0; }
      for (const k of selected) console.log(`[GenFlow] Veo: attached library object "${k}" by mediaId (API inventory)`);
      await sleep(150);
      return selected.size;
    }

    // ---- Fallback path: enumerate the Uploads tab by scroll (API unavailable) ----
    if (gfVideoLibraryObjectNames !== null) {
      let any = false;
      for (const bn of gfVideoLibraryObjectNames) { if (!attached.has(bn) && wordHit(bn)) { any = true; break; } }
      if (!any) return 0;
    }
    const opened = await gfOpenCharacterPicker("drive_folder_upload");
    if (!opened) return 0;
    const names = /* @__PURE__ */ new Set(gfVideoLibraryObjectNames || []);
    const selected = /* @__PURE__ */ new Set();
    let lastScroll = -1, stall = 0;
    const deadline = Date.now() + 6e3;
    while (Date.now() < deadline && selected.size < roomLeft) {
      const dlg = getDlg();
      if (!dlg) break;
      for (const o of dlg.querySelectorAll('[role="option"]')) {
        const img = o.querySelector("img");
        if (!img) continue; // Uploads tab: only user-uploaded cards have an <img>
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
      const list = dlg.querySelector(GF_REFERENCE_VIRTUOSO_LIST_SEL);
      const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
      if (scroller && scroller.scrollTop !== lastScroll) { lastScroll = scroller.scrollTop; scroller.scrollTop += 600; await sleep(150); }
      else { stall++; if (stall > 2) break; await sleep(150); }
    }
    gfVideoLibraryObjectNames = names;
    if (selected.size === 0) { closeFlowDialogIfOpen(); await sleep(120); return 0; }
    if (!(await gfConfirmAddToPrompt(getDlg()))) { closeFlowDialogIfOpen(); await sleep(120); return 0; }
    for (const bn of selected) { attached.add(bn); console.log(`[GenFlow] Veo: attached library object "${bn}" by name (scroll fallback)`); }
    await sleep(150);
    return selected.size;
  }
  // Once-per-project character PRE-SCAN — mirror of banana.js gfScanLibraryAndCharacters
  // (characters portion). Open the picker's Characters tab, scroll every option and persist
  // the names into the SHARED gfCharacterEntities cache. Gives video an API-INDEPENDENT way
  // to learn characters (incl. newly added ones): after this runs, gfCharacterNamesInText
  // finds them from the local cache even if the live API is failing — parity with photo.
  // Uses gfOptionName (the same matcher gfAttachCharacterVeo uses) so the stored keys round-
  // trip cleanly. In a full cookie-stall the picker won't open and this no-ops (nothing DOM-
  // based works there — that's the case that still needs a cookie reset).
  var gfVideoCharScannedPids = /* @__PURE__ */ new Set();
  async function gfScanCharactersVeo() {
    const pid = gfCurrentProjectId();
    if (!pid || gfVideoCharScannedPids.has(pid)) return;
    try {
      const opened = await gfOpenCharacterPicker("accessibility_new");
      if (!opened) { closeFlowDialogIfOpen(); return; }              // don't mark — retry next prompt
      const dlg = document.querySelector('[role="dialog"][data-state="open"]') || document.querySelector('[role="dialog"]');
      if (!dlg) { closeFlowDialogIfOpen(); return; }                 // don't mark — retry next prompt
      gfVideoCharScannedPids.add(pid);                               // picker opened OK → scan is authoritative for this load
      const found = /* @__PURE__ */ Object.create(null);
      let lastScroll = -1, stall = 0, emptyTicks = 0;
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const options = dlg.querySelectorAll('[role="option"]');
        for (const o of options) {
          const name = gfOptionName(o);
          if (name && !found[name]) found[name] = { displayName: name, entityId: "imported_" + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), photoHash: "", voice: "" };
        }
        const list = dlg.querySelector(GF_REFERENCE_VIRTUOSO_LIST_SEL);
        const scroller = dlg.querySelector('[data-testid="virtuoso-scroller"]') || (list && list.parentElement) || list;
        if (scroller && options.length > 0) {
          emptyTicks = 0;
          const cur = scroller.scrollTop;
          if (lastScroll !== -1 && Math.abs(cur - lastScroll) < 5) { stall++; if (stall > 6) break; }
          else stall = 0;
          lastScroll = cur; scroller.scrollTop += 600; await sleep(200);
        } else {
          // EMPTY library: the stall-break above lives only in the options>0 branch, so an empty
          // picker used to spin the FULL 15s deadline here. Give it ~2s to render, then bail.
          emptyTicks++;
          if (emptyTicks > 10) { console.log("[GenFlow] Veo: character pre-scan — picker empty, exiting early"); break; }
          await sleep(200);
        }
      }
      const names = Object.keys(found);
      if (names.length) {
        const bucket = gfCharacterEntities[pid] || {};
        let added = 0;
        for (const nm of names) { if (!bucket[nm]) { bucket[nm] = found[nm]; added++; } }
        if (added) { gfCharacterEntities[pid] = bucket; chrome.storage.local.set({ gfCharacterEntities }); }
        console.log(`[GenFlow] Veo: character pre-scan — ${added} new imported (${names.length} in picker)`);
      }
    } catch (e) { console.warn("[GenFlow] Veo: character pre-scan failed", e); }
    finally { closeFlowDialogIfOpen(); await sleep(200); }
  }
  async function injectPrompt(payload) {
    const { prompt, settings, slotId, generationMode } = payload;
    try {
      if (isFlowHost()) {
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
            // Hybrid clicks-input + code-output: the base media already exists; the background
            // upscales + downloads by API. Skip the synthetic menu-download (mirrors banana.js).
            chrome.runtime.sendMessage({ type: "CODE_OUTPUT", payload: { promptId: prompt.id, promptNumber: prompt.number, resultUrl: prompt.resultUrl, isVideo, text: prompt.text } });
            res = { success: true, downloadPending: true };
          } else if (isVideo) {
            res = await triggerFlowUpscaleDownload(card, settings.quality || "1080p", prompt);
          } else {
            res = await triggerFlowImageUpscaleDownload(card, settings.imageQuality || "1k", prompt);
          }

          let finalResultUrl = prompt.resultUrl;
          let downloadedFlag = false;
          if (res && res.success) {
            if (!res.downloadPending) downloadedFlag = true;
            if (res.upscaledUrl) {
              finalResultUrl = getDownloadUrlForVideo(res.upscaledUrl);
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
              promptNumber: prompt.number
            }
          });
          return;
        }
        await acquireFlowSubmissionLock(prompt.number);
        await __gfWaitCooldown(prompt.number);
        console.log(`[GenFlow] Starting Veo 3 generation for prompt #${prompt.number} (lock acquired)`);
        console.log(`[GenFlow] Generation mode: ${generationMode || "single"}`);
        try {
          if (flowInjectionAborted) {
            console.log(`[GenFlow] Veo: injection aborted — skipping prompt #${prompt.number}`);
            return;
          }
          await ensureFlowProjectPage();
          if (!modeMenuConfiguredOnce) {
            const modeTrigger = findFlowModeMenuTrigger();
            if (modeTrigger) {
              console.log("[GenFlow] First run: opening mode menu and applying settings...");
              modeTrigger.scrollIntoView({
                block: "nearest",
                inline: "nearest",
                behavior: "auto"
              });
              await sleep(200);
              nativeClick(modeTrigger);
              await sleep(1200);
              const menuOpen = () => {
                const menu = document.querySelector('[role="menu"][data-state="open"]');
                return !!menu?.querySelector('[role="tablist"]');
              };
              for (let i = 0; i < 20 && !menuOpen(); i++)
                await sleep(150);
              if (!menuOpen())
                console.log("[GenFlow] Mode menu may not have opened, continuing...");
              clickFlowTabVideo();
              await sleep(800);
              if (settings.generationType === "image-to-video") {
                clickFlowTabFrames();
                await sleep(500);
              } else if (settings.generationType === "text-to-video" && settings.gfApplyRefs !== false) {
                // Reference t2v: the menu remembers the last sub-mode («Кадры» after a
                // film/i2v run), and add_2 exists only under «Образцы». Plain t2v with
                // refs OFF keeps the legacy behavior (no sub-mode click, as in x35).
                clickFlowTabSamples();
                await sleep(500);
              }
              const pollSettingsDeadline = Date.now() + 2000;
              while (Date.now() < pollSettingsDeadline) {
                const candidates = document.querySelectorAll('[role="tab"]');
                let hasRatio = false;
                let hasCount = false;
                for (const el of candidates) {
                  const txt = el.textContent || "";
                  if (txt.includes(settings.aspectRatio)) hasRatio = true;
                  if (txt.includes("x") || txt.includes("1x")) hasCount = true;
                }
                if (hasRatio && hasCount) break;
                await sleep(100);
              }
              clickFlowScale(settings);
              await sleep(400);
              const count = Math.min(4, Math.max(1, settings.generationsPerPrompt || 1));
              const countSelected = selectVideoCount(count);
              if (!countSelected) {
                console.log(`[GenFlow] x${count} tab not found, continuing anyway...`);
              }
              await sleep(500);
              await clickFlowModelInMenu(settings);
              await sleep(400);
              if (modeTrigger.getAttribute("data-state") === "open") {
                nativeClick(modeTrigger);
                await sleep(300);
              }
            } else {
              console.log("[GenFlow] Mode menu trigger not found, skipping menu config");
            }
            modeMenuConfiguredOnce = true;
            lastAppliedGenerationType = settings.generationType;
          } else {
            console.log("[GenFlow] Mode menu already configured, skipping");
          }
          await waitForPageReady();
          if (lastAppliedGenerationType !== settings.generationType) {
            await selectFlowMode(settings.generationType);
            lastAppliedGenerationType = settings.generationType;
            await sleep(1500);
          } else {
            console.log(`[GenFlow] Mode already applied (${settings.generationType}), skipping mode re-selection`);
          }
          if (settings.generationType === "image-to-video" && prompt.imageUrl) {
            const framesOk = await uploadImageForVideo(prompt.imageUrl, prompt.endImageUrl);
            if (framesOk === false) {
              // Do NOT click Create without confirmed frames — that burns a credit on
              // a frame-less duplicate (film retry case). Fail the prompt honestly.
              // The composer may hold a half-attached frame set (e.g. start landed,
              // end didn't). x35 never left this state (Create always consumed the
              // frames), so mark it dirty — the injection catch reloads the page
              // AFTER reporting the failure, or the NEXT prompt would inherit the
              // stale start frame and put its own start into the END slot.
              gfComposerDirtyReload = true;
              throw new Error("Image-to-video frames not attached (start/end not confirmed in picker)");
            }
          }
          // GenFlow native characters/objects (video): only when the Reference
          // toggle is ON (settings.gfApplyRefs, spread into every START payload) and
          // only in single mode (multi/film/reference handle refs their own way).
          // NOTE: we deliberately do NOT require prompt.gfApplyChars here — that flag
          // is set only by the IMAGE editor's gfEnrich (popup ~12979); video prompts
          // are built by the video editor and never carry it, so requiring it left
          // the picker permanently closed for video. gfApplyRefs alone respects the
          // toggle (it is false only when the user turns Reference off).
          if (settings.gfApplyRefs !== false && (generationMode || "single") === "single") {
            // Seed the shared character cache from the picker (API-independent), once per
            // project. After this, gfCharacterNamesInText finds characters — incl. newly
            // added ones — from the local cache even when the live inventory API is failing.
            try { await gfScanCharactersVeo(); } catch (e) { console.warn("[GenFlow] Veo: character pre-scan skipped", e); }
            // Shared dedup set: a name attached as a CHARACTER must not also be
            // attached as a library PHOTO with the same name (the double-attach bug).
            const _vAttached = /* @__PURE__ */ new Set();
            try { await gfAttachVideoCharacters(prompt.text, 3, _vAttached); } catch (e) { console.warn("[GenFlow] Veo: video character attach skipped", e); }
            // Same for plain library objects (photos) mentioned in the prompt —
            // select them from the Uploads ("Загрузки") tab so they attach in video too.
            try { await gfAttachVideoObjectsByText(prompt.text, 3, _vAttached); } catch (e) { console.warn("[GenFlow] Veo: video object attach skipped", e); }
          }
          const input = findPromptInput();
          if (!input) {
            throw new Error("\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E\u043B\u0435 \u0434\u043B\u044F \u0432\u0432\u043E\u0434\u0430 \u043F\u0440\u043E\u043C\u043F\u0442\u0430.");
          }
          input.focus();
          await sleep(200);
          await fillPromptByPaste(input, prompt.text);
          const minLen = Math.max(1, Math.floor(prompt.text.trim().length * 0.6));
          await waitUntil(
            () => {
              const v = input.tagName === "TEXTAREA" ? input.value.trim() : (input.textContent || input.innerText || "").trim();
              return v.length >= minLen;
            },
            { pollIntervalMs: 25, maxWaitMs: 2e3 }
          );
          const currentText = input.tagName === "TEXTAREA" ? input.value.trim() : (input.textContent || input.innerText || "").trim();
          if (!currentText || currentText.length < minLen) {
            throw new Error("Prompt input verification failed (paste may not have been applied).");
          }
          console.log(`[GenFlow] Prompt entered (paste): "${prompt.text.slice(0, 50)}..."`);
          // Final cooldown gate right before the irreversible Create click. A prompt that cleared
          // the lock-time check can sit here a couple seconds while typing; if a pause armed in that
          // window, hold NOW instead of submitting into the wall (closes the last "1 slips" gap).
          const _cdOk = await __gfWaitCooldown(prompt.number);
          // __gfWaitCooldown returns false when the run was stopped (Stop / hard-stop). Either that
          // or the abort flag means: don't submit — bail so a stopped run can't fire one extra Create.
          if (!_cdOk || flowInjectionAborted) {
            console.log(`[GenFlow] Veo: aborted before Create — skipping prompt #${prompt.number}`);
            return;
          }
          const createBtn = findCreateButton();
          if (!createBtn) {
            throw new Error("\u041A\u043D\u043E\u043F\u043A\u0430 \xAB\u0421\u043E\u0437\u0434\u0430\u0442\u044C\xBB \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.");
          }
          const timeSinceLastCall = Date.now() - lastApiCallTime;
          if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
            const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
            console.log(`[GenFlow] Waiting ${waitTime}ms before API call to avoid rate limits...`);
            await sleep(waitTime);
          }
          const preGenerationSnapshot = snapshotVideoSources();
          const preClickTileIds = /* @__PURE__ */ new Set();
          document.querySelectorAll("[data-tile-id]").forEach((el) => {
            const tid = el.getAttribute("data-tile-id");
            if (tid)
              preClickTileIds.add(tid);
          });
          console.log(`[GenFlow] Pre-click tiles: ${preClickTileIds.size} for prompt #${prompt.number}`);
          ensureGlobalMediaObserver();
          createBtn.setAttribute('data-w3a1', 'true');
          await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "CLICK_FLOW_CREATE" }, (res) => {
              resolve(res);
            });
          });
          await sleep(300);
          const createButtonClickTime = Date.now();
          lastApiCallTime = createButtonClickTime;
          console.log("[GenFlow] Create clicked");
          let ownCard;
          const cardDetectDeadline = Date.now() + 1e4;
          while (Date.now() < cardDetectDeadline) {
            await sleep(80);
            // In rapid film/multi submission, a previous prompt's card can still
            // be rendering and show up as "new" here, so the middle prompts grab
            // a sibling's card. Skip any tile already claimed as another active
            // slot's own card so each prompt captures its own.
            const claimedCardIds = /* @__PURE__ */ new Set();
            for (const inst of monitoringInstances.values()) {
              if (inst.cardId)
                claimedCardIds.add(inst.cardId);
            }
            for (const tile of Array.from(document.querySelectorAll("[data-tile-id]"))) {
              const tid = tile.getAttribute("data-tile-id");
              if (tid && !preClickTileIds.has(tid) && !claimedCardIds.has(tid)) {
                ownCard = tile;
                break;
              }
            }
            if (ownCard)
              break;
          }
          if (ownCard) {
            console.log(`[GenFlow] Own card captured for prompt #${prompt.number}: tile-id=${ownCard.getAttribute("data-tile-id")}`);
          } else {
            console.log(`[GenFlow] Own card NOT detected for prompt #${prompt.number} \u2014 media-scan fallback active`);
          }
          await sleep(800);
          if (checkLoadingIndicators(document.body)) {
            console.log("[GenFlow] Create click: loading started");
          }
          await sleep(400);
          const bodyText = document.body.innerText.toLowerCase();
          const has403Error = bodyText.includes("403") || bodyText.includes("forbidden");
          const immediateError = detectDOMErrors();
          if (immediateError.type === "429" || has403Error) {
            const errorMsg = immediateError.message || "API rate limit (403/429) - too many requests. Please wait and retry.";
            console.error(`[GenFlow] ${errorMsg} for prompt #${prompt.number}`);
            chrome.runtime.sendMessage({
              type: "GENERATION_FAILED",
              payload: {
                promptId: prompt.id,
                error: errorMsg
              }
            });
            return;
          }
          console.log(`[GenFlow] Veo 3: Started ${settings.generationType} generation for prompt #${prompt.number}`);
          waitForGenerationComplete(prompt, slotId, 5 * 60 * 1e3, createButtonClickTime, settings.generationType, preGenerationSnapshot, ownCard, settings).catch((err) => {
            console.error("[GenFlow] Generation monitoring failed:", err);
          });
        } finally {
          releaseFlowSubmissionLock();
          console.log(`[GenFlow] Released submission lock for prompt #${prompt.number}`);
        }
      } else {
        await waitForElement('textarea, [contenteditable="true"]', 15e3);
        await sleep(1e3);
        const inputEl = findPromptInput();
        if (!inputEl) {
          throw new Error("Could not find prompt input field");
        }
        if (inputEl.tagName === "TEXTAREA") {
          inputEl.value = "";
          inputEl.value = prompt.text;
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
          inputEl.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          inputEl.innerHTML = "";
          inputEl.textContent = prompt.text;
          inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, data: prompt.text }));
        }
        inputEl.focus();
        await applySettings(settings);
        await sleep(800);
        const generateButton = findGenerateButton();
        if (!generateButton) {
          throw new Error("Could not find generate button");
        }
        generateButton.click();
        waitForGenerationComplete(prompt, slotId, 5 * 60 * 1e3, Date.now(), undefined, undefined, undefined, settings).catch((err) => {
          console.error("[GenFlow] AI Studio generation monitoring failed:", err);
        });
      }
    } catch (error) {
      console.error("[GenFlow] Veo injection failed:", error);
      let previewUrl = null;
      try {
        const card = findCardByUrl(prompt.resultUrl);
        if (card) {
          previewUrl = await elementToDataURL(card.querySelector('video') || card.querySelector('img'));
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
      if (gfComposerDirtyReload) {
        // Half-attached i2v frames in the composer (see uploadImageForVideo gate):
        // reload AFTER the failure has been reported so the next prompt starts clean.
        gfComposerDirtyReload = false;
        setTimeout(() => { try { location.reload(); } catch (e2) {} }, 800);
      }
    }
  }
  async function applySettings(settings) {
    const qualitySelectors = document.querySelectorAll('[role="listbox"], select');
    for (const selector of qualitySelectors) {
      const text = selector.textContent?.toLowerCase() || "";
      if (text.includes("quality") || text.includes("resolution")) {
        const options = selector.querySelectorAll('[role="option"], option');
        for (const option of options) {
          const optionText = option.textContent?.toLowerCase() || "";
          if (optionText.includes(settings.quality.replace("p", ""))) {
            option.click();
            break;
          }
        }
      }
    }
    const ratioButtons = document.querySelectorAll('button, [role="radio"]');
    for (const button of ratioButtons) {
      const text = button.textContent || "";
      if (text.includes(settings.aspectRatio)) {
        button.click();
        break;
      }
    }
    for (const button of ratioButtons) {
      const text = button.textContent?.toLowerCase() || "";
      const _lm = String(settings.model || "veo3.1-fast").toLowerCase();
      const targetModel = _lm.indexOf("lite") >= 0 ? "lite" : _lm.indexOf("fast") >= 0 ? "fast" : "quality";
      if (text.includes(targetModel)) {
        button.click();
        break;
      }
    }
  }
  function findGenerateButton() {
    const selectors = [
      'button[aria-label*="Run" i]',
      'button[aria-label*="Generate" i]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Submit" i]',
      'button[data-testid*="run"]',
      'button[data-testid*="generate"]',
      'button[data-testid*="send"]',
      "button.mdc-button--raised",
      "button.mat-raised-button",
      "button.mat-flat-button",
      'button[type="submit"]',
      ".generate-btn",
      "button.primary"
    ];
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const btn = el;
          if (!btn.disabled && isVisible2(btn))
            return btn;
        }
      } catch {
      }
    }
    const buttons = document.querySelectorAll("button");
    for (const button of buttons) {
      const text = button.textContent?.toLowerCase().trim() || "";
      const ariaLabel = button.getAttribute("aria-label")?.toLowerCase() || "";
      const keywords = ["generate", "run", "create", "send", "submit", "go"];
      const hasKeyword = keywords.some((k) => text.includes(k) || ariaLabel.includes(k));
      if (hasKeyword && !button.disabled && isVisible2(button))
        return button;
    }
    for (const button of buttons) {
      if (!button.disabled && isVisible2(button)) {
        const svg = button.querySelector("svg");
        if (svg) {
          const paths = svg.querySelectorAll("path");
          for (const path of paths) {
            const d = path.getAttribute("d") || "";
            if (d.includes("M2") && d.includes("l") || d.includes("arrow") || d.includes("send")) {
              return button;
            }
          }
        }
      }
    }
    return null;
  }
  function waitForElement(selector, timeout) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      const observer = new MutationObserver(() => {
        const element2 = document.querySelector(selector);
        if (element2) {
          observer.disconnect();
          resolve(element2);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
  let isDownloadingAll = false;

  async function triggerFlowImageUpscaleDownload(card, targetQuality, prompt) {
    console.log(`[GenFlow] Starting Flow image upscale download for quality: ${targetQuality}`);
    dismissExistingFlowErrors();
    await sleep(300);
    const img = card.querySelector("img");
    if (!img) {
      console.error("[GenFlow] No img found inside card");
      return { success: false };
    }
    const rawUrl = img.src;
    const initialUrl = rawUrl ? normalizeMediaUrl(rawUrl) : null;
    if (initialUrl) {
      await chrome.runtime.sendMessage({
        type: "REGISTER_FILENAME_FOR_PROMPT",
        payload: {
          promptId: prompt.id,
          promptNumber: prompt.number,
          url: initialUrl,
          isVideo: false
        }
      }).catch(() => {});
    }
    await ensureImageLoaded(img);
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
        return { success: true, upscaledUrl, downloaded: true };
      }
    }
    const openAndGetSubmenu = async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      document.body.click();
      await sleep(150);

      // Hover all container elements inside the card to reveal three-dots
      const containers = Array.from(card.querySelectorAll('div, a, button, span'));
      containers.push(card);
      for (const el of containers) {
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, composed: true }));
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
      await sleep(150);

      // Find three-dots button
      const btn = Array.from(card.querySelectorAll('button')).find(b => {
        const icon = b.querySelector('i');
        return (icon && icon.textContent.includes('more_vert')) || b.getAttribute('aria-haspopup') === 'menu';
      });

      if (!btn) {
        console.warn("[GenFlow] Three dots button not found after hover, falling back to contextmenu");
        const img = card.querySelector("img");
        if (!img) return null;
        const rect = img.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const opts = { bubbles: true, composed: true, cancelable: true, view: window, button: 2, buttons: 2, clientX: x, clientY: y };
        img.dispatchEvent(new MouseEvent("contextmenu", opts));
        await sleep(300);
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
        await sleep(200);
      }

      const menuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [class*="menuitem" i]'));
      const downloadItem = menuItems.find(item => /download|скачать/i.test(item.textContent));
      if (!downloadItem) {
        console.error("[GenFlow] Download option not found in card menu");
        return null;
      }
      downloadItem.focus();
      downloadItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
      downloadItem.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, bubbles: true }));
      await sleep(200);
      const submenuItems = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [class*="menuitem" i]')).filter(item => !menuItems.includes(item));
      return submenuItems.length > 0 ? submenuItems : null;
    };
    let submenuItems = await openAndGetSubmenu();
    if (!submenuItems) {
      console.error("[GenFlow] Failed to open download submenu");
      return { success: false };
    }
    
    let qPart = targetQuality.toLowerCase();
    if (qPart.includes("720")) qPart = "1k";
    else if (qPart.includes("1080")) qPart = "2k";

    let targetOption = submenuItems.find((item) => {
      const text = item.textContent.toLowerCase();
      return text.includes(qPart);
    });
    if (!targetOption) {
      console.warn(`[GenFlow] Target quality ${targetQuality} (mapped to ${qPart}) not found, falling back to any available option`);
      targetOption = submenuItems.find(item => {
        const text = item.textContent.toLowerCase();
        return text.includes("1k") || text.includes("2k") || text.includes("4k") || text.includes("download") || text.includes("original");
      });
    }
    if (!targetOption && submenuItems.length > 0) {
      targetOption = submenuItems[0];
    }
    if (!targetOption) {
      console.error(`[GenFlow] Submenu item for quality ${targetQuality} not found and fallback failed`);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      return { success: false };
    }
    
    // Get visible errors BEFORE clicking the quality option
    const preClickErrors = new Set();
    const findErrorsRaw = () => {
      const errs = [];
      const elements = document.querySelectorAll('[role="alert"], [role="status"], [class*="alert" i], [class*="error" i], [class*="toast" i], [class*="snackbar" i], [data-sonner-toast]');
      for (const el of elements) {
        if (el.textContent && el.offsetWidth > 0 && el.offsetHeight > 0) {
          errs.push(el.textContent.trim());
        }
      }
      return errs;
    };
    findErrorsRaw().forEach(e => preClickErrors.add(e));

    console.log(`[GenFlow] Clicking image quality option: ${targetOption.textContent.trim()}`);
    await chrome.runtime.sendMessage({ type: "ALLOW_NEXT_DOWNLOADS" }).catch(() => {});
    chrome.runtime.sendMessage({ type: "UPDATE_PROMPT_INFO", payload: { promptId: prompt.id, info: `Upscaling ${targetQuality.toUpperCase()}...` } }).catch(() => {});
    targetOption.click();
    await sleep(400);

    const findNewFlowErrorMessage = () => {
      const errMsg = findFlowErrorMessage();
      if (errMsg && !preClickErrors.has(errMsg)) {
        return errMsg;
      }
      return null;
    };

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
      const maxWaitTime = 5 * 60 * 1000;
      const pollInterval = 4000;
      const start = Date.now();
      while (Date.now() - start < maxWaitTime) {
        await sleep(pollInterval);
        let errMsg = null;
        try { errMsg = findNewFlowErrorMessage(); } catch (e) {}
        if (errMsg) {
          console.error("[GenFlow] Flow upscale error detected:", errMsg);
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
          throw new Error(errMsg);
        }
        toast = getToast();
        if (!toast) {
          console.log("[GenFlow] Upscaling toast disappeared. Image should be downloaded automatically.");
          break;
        }
      }
      await sleep(2500);
    } else {
      console.log("[GenFlow] No upscaling toast detected. Image was already upscaled or downloaded immediately.");
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    
    // Находим элемент изображения в карточке и нормализуем его URL для регистрации имени файла и скачивания
    const upscaledImg = card.querySelector("img");
    const upscaledUrl = upscaledImg ? normalizeMediaUrl(upscaledImg.src) : null;
    if (upscaledUrl) {
      await chrome.runtime.sendMessage({
        type: "REGISTER_FILENAME_FOR_PROMPT",
        payload: {
          promptId: prompt.id,
          promptNumber: prompt.number,
          url: upscaledUrl,
          isVideo: false
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
    // mediaIds THIS session generated (passed by the background). When set, only these tiles are
    // downloaded — pre-existing page media is skipped. Empty = no session data -> all (safe fallback).
    const _genIdSet = new Set((settings && Array.isArray(settings.genIds) ? settings.genIds : []).map((s) => String(s).toLowerCase()));
    let consecutiveEmptyCycles = 0;
    let totalDownloaded = 0;
    
    let promptCounter = 0;       // becomes 1 on the first (bottom-most) group
    let lastGroupText = null;    // consecutive same-text tiles share one number

    try {
      // Process bottom -> top so Promt_1 = the oldest item (gallery shows newest
      // on top). The gallery is virtualized, so one scroll won't reach the real
      // bottom — scroll down repeatedly until the height stops growing.
      const scrollContainers = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const isScrollable = (
          style.overflow === 'auto' || style.overflow === 'scroll' || style.overflow === 'overlay' ||
          style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay'
        );
        return isScrollable && el.scrollHeight > el.clientHeight;
      });
      console.log("[GenFlow] Download All: scrolling to bottom for oldest-first order (a few seconds)...");
      let _prevBottom = -1, _stable = 0;
      for (let _k = 0; _k < 40 && isDownloadingAll; _k++) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
        for (const c of scrollContainers) c.scrollTop = c.scrollHeight;
        await sleep(350);
        let _h = document.body.scrollHeight;
        for (const c of scrollContainers) _h = Math.max(_h, c.scrollHeight);
        if (_h === _prevBottom) { if (++_stable >= 2) break; } else { _stable = 0; }
        _prevBottom = _h;
      }
      console.log("[GenFlow] Download All: reached bottom, starting downloads (oldest first)");
      await sleep(800);

      while (isDownloadingAll) {
        const tiles = Array.from(document.querySelectorAll('[data-tile-id]'))
          .filter(tile => {
            const parentTile = tile.parentElement?.closest('[data-tile-id]');
            return !parentTile;
          })
          .sort((a, b) => {
            // bottom -> top (and right -> left within a row) for oldest-first order
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            if (Math.abs(rectA.top - rectB.top) > 15) {
              return rectB.top - rectA.top;
            }
            return rectB.left - rectA.left;
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
          window.scrollTo({ top: 0, behavior: 'smooth' });
          for (const container of scrollContainers) {
            container.scrollTop = 0;
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
          // Download All filter: "video" = only videos, "photo" = only images.
          const _dlFilter = settings?.downloadAllFilter || "all";
          if (_dlFilter === "video" && !videoEl) continue;
          if (_dlFilter === "photo" && videoEl) continue;
          // Generated-only: skip tiles NOT produced this session (mediaId not in the set from the
          // background). Empty set = no session data -> process all (safe fallback).
          if (_genIdSet.size) {
            const _gsrc = (videoEl && (videoEl.src || (videoEl.querySelector('source') && videoEl.querySelector('source').src))) || (imgEl && imgEl.src) || "";
            const _gm = String(_gsrc).match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (!_gm || !_genIdSet.has(_gm[1].toLowerCase())) continue;
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
          // Skip uploaded source frames: their name (from the React fiber) is the
          // upload filename — start_<ts>.png / end_<ts>.png — unlike generated
          // results whose name is the prompt text. (Sources share alt
          // "Сгенерированное изображение", so we can't tell them apart by alt.)
          if (extractedPrompt && (/^(start|end)_\d{6,}/i.test(extractedPrompt.trim()) || /\.(png|jpe?g|webp|gif|mp4)\b/i.test(extractedPrompt.trim()))) {
            console.log("[GenFlow] Download All: skipping uploaded source:", extractedPrompt);
            continue;
          }
          // 4. Final fallback: tile ID
          if (!extractedPrompt) {
            extractedPrompt = videoEl ? `Video Tile ${tileId}` : `Image Tile ${tileId}`;
          }

          // Each tile gets its own number. (No text grouping: Flow gives
          // different prompts the same short title, e.g. "Sherman tank underwater
          // corrosion", so grouping by it wrongly merged distinct prompts.)
          promptCounter++;
          const prompt = {
            id: crypto.randomUUID(),
            number: promptCounter,
            text: extractedPrompt
          };

          const previewUrl = await elementToDataURL(videoEl || imgEl);

          let success = false;
          // Videos use the video quality (720p/1080p/4K); images use the image
          // quality (1k/2k/4k). Passing the video quality to an image upscale
          // made photos save at 2K instead of the chosen 1K.
          const quality = videoEl ? (settings?.quality || "1080p") : (settings?.imageQuality || "1k");

          if (videoEl) {
            // Native direct download (Flow's bulk video upscale is minutes per
            // clip and unreliable). The gallery preview's videoWidth is unreliable
            // (reports 1920 for 720p clips), so label with the chosen video quality
            // setting instead of guessing from the element.
            console.log(`[GenFlow] Downloading video in tile ${tileId} as Prompt #${promptCounter} (native 720p)`);
            try {
              const regRes = await chrome.runtime.sendMessage({
                type: "REGISTER_FILENAME_FOR_PROMPT",
                payload: { promptId: prompt.id, promptNumber: prompt.number, promptText: prompt.text, url: mediaUrl, isVideo: true, resLabel: "720p" }
              }).catch(() => null);
              await chrome.runtime.sendMessage({ type: "DOWNLOAD_RESULT", payload: { url: mediaUrl, filename: regRes && regRes.filename } }).catch(() => {});
              success = true;
            } catch (err) {
              console.error(`[GenFlow] Error downloading video in tile ${tileId}:`, err);
              chrome.runtime.sendMessage({
                type: "GENERATION_FAILED",
                payload: { promptId: prompt.id, promptNumber: prompt.number, promptText: prompt.text, error: err.message || "Download failed", errorType: "GENERATION_FAILED", resultUrl: mediaUrl, previewUrl: previewUrl }
              }).catch(() => {});
            }
          } else if (imgEl) {
            // Native direct download (reliable). Download All always saves the
            // generated image natively; quality selectors apply to generation only.
            console.log(`[GenFlow] Downloading image in tile ${tileId} as Prompt #${promptCounter} (native 1080p)`);
            try {
              const regRes = await chrome.runtime.sendMessage({
                type: "REGISTER_FILENAME_FOR_PROMPT",
                payload: { promptId: prompt.id, promptNumber: prompt.number, promptText: prompt.text, url: mediaUrl, isVideo: false, resLabel: "1080p" }
              }).catch(() => null);
              await chrome.runtime.sendMessage({ type: "DOWNLOAD_RESULT", payload: { url: mediaUrl, filename: regRes && regRes.filename } }).catch(() => {});
              success = true;
            } catch (err) {
              console.error(`[GenFlow] Error downloading image in tile ${tileId}:`, err);
              chrome.runtime.sendMessage({
                type: "GENERATION_FAILED",
                payload: { promptId: prompt.id, promptNumber: prompt.number, promptText: prompt.text, error: err.message || "Download failed", errorType: "GENERATION_FAILED", resultUrl: mediaUrl, previewUrl: previewUrl }
              }).catch(() => {});
            }
          }
          
          if (success) {
            totalDownloaded++;
          }

          await sleep(200);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
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

  console.log("[GenFlow] Veo content script loaded for:", window.location.hostname);
  if (window.location.href.includes("labs.google")) {
    setTimeout(() => {
      console.log("[GenFlow] Page videos:", document.querySelectorAll("video").length);
      console.log("[GenFlow] Page images:", document.querySelectorAll("img").length);
      console.log("[GenFlow] Page buttons:", document.querySelectorAll("button").length);
    }, 3e3);
  }
})();
