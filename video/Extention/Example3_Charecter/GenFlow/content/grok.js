"use strict";
(() => {
  // src/utils/readiness.ts
  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && el.offsetWidth > 0 && el.offsetHeight > 0;
  }
  // Обновленная функция sleep: если вкладка неактивна (фоновая или свернута)
  // и задержка небольшая (до 2 секунд), мы используем синхронный busy-wait.
  // Это предотвращает зависание/блокировку setTimeout со стороны Chrome при фоновой работе.
  function sleep(ms) {
    if (document.hidden && ms <= 2000) {
      const start = Date.now();
      while (Date.now() - start < ms) {}
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      "generation error"
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
    return { type: null };
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

  // src/content/grok.ts
  var currentPromptId = null;
  var monitorInterval = null;
  console.log("[GenFlow] Grok content script loaded:", window.location.href);
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PING") {
      if (message.service && message.service !== "grok") return false;
      sendResponse({ pong: true, service: "grok" });
      return false;
    }
    if (message.type === "INJECT_PROMPT") {
      const payload = message.payload;
      if (payload.settings.generationType !== "image-to-video") {
        chrome.runtime.sendMessage({
          type: "GENERATION_FAILED",
          payload: { promptId: payload.prompt.id, error: "Grok supports only Image to Video mode" }
        });
        sendResponse({ success: false });
        return false;
      }
      if (!payload.prompt.imageUrl) {
        chrome.runtime.sendMessage({
          type: "GENERATION_FAILED",
          payload: { promptId: payload.prompt.id, error: "Image is required for Grok" }
        });
        sendResponse({ success: false });
        return false;
      }
      injectPrompt(payload);
      sendResponse({ success: true });
      return false;
    }
    return false;
  });
  function isElementInteractable(el) {
    if (!el)
      return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    if (document.hidden) {
      return true;
    }
    return el.offsetWidth > 0 && el.offsetHeight > 0;
  }
  function sleepOrUntilVisible(ms) {
    return new Promise((resolve) => {
      const done = () => {
        document.removeEventListener("visibilitychange", onVis);
        clearTimeout(timer);
        resolve();
      };
      const onVis = () => {
        if (!document.hidden)
          done();
      };
      document.addEventListener("visibilitychange", onVis);
      const timer = window.setTimeout(done, ms);
    });
  }
  async function waitForInjectionSurface(timeoutMs = 12e4) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (findImagineInput())
        return;
      await sleepOrUntilVisible(400);
    }
    throw new Error("Imagine composer did not become ready in time");
  }
  function isOnImaginePage() {
    return window.location.pathname.startsWith("/imagine") && !window.location.pathname.includes("/imagine/post/");
  }
  function isOnResultPage() {
    return window.location.pathname.includes("/imagine/post/");
  }
  async function ensureOnImaginePage() {
    if (isOnImaginePage()) {
      console.log("[GenFlow] Grok: Already on /imagine");
      return;
    }
    if (isOnResultPage()) {
      console.log("[GenFlow] Grok: On result page, navigating to /imagine...");
      window.location.href = "https://grok.com/imagine";
      await waitForPageLoad();
      return;
    }
    console.log("[GenFlow] Grok: Not on /imagine, navigating...");
    window.location.href = "https://grok.com/imagine";
    await waitForPageLoad();
  }
  async function waitForPageLoad() {
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      if (isOnImaginePage()) {
        await sleep(1500);
        return;
      }
    }
    throw new Error("Failed to navigate to /imagine");
  }
  function findImagineInput() {
    const textareas = document.querySelectorAll("textarea");
    for (const ta of textareas) {
      if (isElementInteractable(ta)) {
        return ta;
      }
    }
    const pm = document.querySelector(".tiptap.ProseMirror, .ProseMirror");
    if (pm && isElementInteractable(pm))
      return pm;
    const ce = document.querySelector('[contenteditable="true"]');
    if (ce && isElementInteractable(ce))
      return ce;
    return null;
  }
  async function uploadImageToImagine(imageUrl) {
    console.log("[GenFlow] Grok: Uploading image...");
    let fileInput = document.querySelector('input[type="file"][accept*="image"]');
    if (!fileInput) {
      fileInput = document.querySelector('input[type="file"]');
    }
    if (!fileInput) {
      const uploadBtns = document.querySelectorAll("button");
      for (const btn of uploadBtns) {
        const label = btn.getAttribute("aria-label") || "";
        const text = (btn.textContent || "").toLowerCase();
        if ((label.includes("upload") || label.includes("\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C") || label.includes("attach") || label.includes("\u043F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C") || text.includes("upload") || text.includes("\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C")) && isElementInteractable(btn)) {
          nativeClick(btn);
          await sleep(1e3);
          break;
        }
      }
      fileInput = document.querySelector('input[type="file"]');
    }
    if (!fileInput) {
      throw new Error("File input not found on /imagine");
    }
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], `grok_image_${Date.now()}.png`, { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    console.log("[GenFlow] Grok: Image dispatched, waiting for upload to settle...");
    const uploadStart = Date.now();
    const uploadTimeout = 1e4;
    while (Date.now() - uploadStart < uploadTimeout) {
      const previewImgs = document.querySelectorAll('img[src^="blob:"], img[src^="data:image"]');
      if (previewImgs.length > 0) {
        console.log("[GenFlow] Grok: Image preview detected, settling 500ms");
        await sleep(500);
        return;
      }
      await sleep(300);
    }
    console.log("[GenFlow] Grok: Image preview not detected \u2014 waiting 3 s as fallback");
    await sleep(3e3);
  }
  function enterPromptText(inputEl, text) {
    const promptText = `Create a video: ${text}`;
    if (inputEl.tagName === "TEXTAREA") {
      const ta = inputEl;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      if (setter) {
        setter.call(ta, promptText);
      } else {
        ta.value = promptText;
      }
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (inputEl.getAttribute("contenteditable") === "true") {
      nativeClick(inputEl);
      inputEl.focus();
      document.execCommand("selectAll", false, "");
      document.execCommand("insertText", false, promptText);
    } else {
      inputEl.value = promptText;
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    }
    inputEl.focus();
  }
  function findSendButton() {
    const labels = [
      "\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u0438\u0434\u0435\u043E",
      "Make video",
      "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0432\u0438\u0434\u0435\u043E",
      "Generate",
      "Submit",
      "Send",
      "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C"
    ];
    for (const label of labels) {
      const btn = document.querySelector(`button[aria-label="${label}"]`);
      if (btn && isElementInteractable(btn) && !btn.disabled)
        return btn;
    }
    const allBtns = document.querySelectorAll("button");
    for (const btn of allBtns) {
      const text = (btn.textContent || "").trim();
      if (labels.some((l) => text.includes(l)) && isElementInteractable(btn) && !btn.disabled) {
        return btn;
      }
    }
    const submit = document.querySelector('button[type="submit"]');
    if (submit && isElementInteractable(submit) && !submit.disabled)
      return submit;
    return null;
  }
  var GROK_MODE_GROUP_LABELS = ["Generation mode", "\u0420\u0435\u0436\u0438\u043C \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438"];
  var GROK_RESOLUTION_GROUP_LABELS = ["Video resolution", "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0432\u0438\u0434\u0435\u043E"];
  var GROK_DURATION_GROUP_LABELS = ["Video duration", "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0432\u0438\u0434\u0435\u043E"];
  var GROK_ASPECT_RATIO_TRIGGER_LABELS = ["Aspect Ratio", "\u0421\u043E\u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0435 \u0441\u0442\u043E\u0440\u043E\u043D"];
  function findRadiogroupByLabels(labels) {
    const set = new Set(labels);
    const groups = document.querySelectorAll('[role="radiogroup"]');
    for (const g of groups) {
      const al = g.getAttribute("aria-label");
      if (al && set.has(al))
        return g;
    }
    return null;
  }
  function findButtonByAriaLabels(labels) {
    for (const label of labels) {
      const btn = document.querySelector(`button[aria-label="${label}"]`);
      if (btn && isElementInteractable(btn))
        return btn;
    }
    return null;
  }
  async function selectVideoMode() {
    console.log("[GenFlow] Grok: Selecting Video mode");
    const group = findRadiogroupByLabels(GROK_MODE_GROUP_LABELS);
    if (!group) {
      console.log("[GenFlow] Grok: Generation mode radiogroup not found");
      return;
    }
    const buttons = group.querySelectorAll('button[role="radio"]');
    for (const btn of buttons) {
      const text = (btn.textContent || "").trim();
      if ((text === "Video" || text === "\u0412\u0438\u0434\u0435\u043E") && isElementInteractable(btn)) {
        if (btn.getAttribute("aria-checked") === "true") {
          console.log("[GenFlow] Grok: Video mode already selected");
          return;
        }
        nativeClick(btn);
        await sleep(300);
        return;
      }
    }
    console.log("[GenFlow] Grok: Video mode button not found");
  }
  async function selectResolution(quality) {
    console.log(`[GenFlow] Grok: Selecting resolution: ${quality}`);
    const group = findRadiogroupByLabels(GROK_RESOLUTION_GROUP_LABELS);
    if (!group) {
      console.log("[GenFlow] Grok: Video resolution radiogroup not found");
      return;
    }
    const buttons = group.querySelectorAll('button[role="radio"]');
    for (const btn of buttons) {
      const text = (btn.textContent || "").trim();
      if (text === quality && isElementInteractable(btn)) {
        if (btn.getAttribute("aria-checked") === "true") {
          console.log(`[GenFlow] Grok: ${quality} already selected`);
          return;
        }
        nativeClick(btn);
        await sleep(300);
        return;
      }
    }
    console.log(`[GenFlow] Grok: Resolution ${quality} not found`);
  }
  async function selectAspectRatio(ratio) {
    console.log(`[GenFlow] Grok: Selecting aspect ratio: ${ratio}`);
    const trigger = findButtonByAriaLabels(GROK_ASPECT_RATIO_TRIGGER_LABELS);
    if (!trigger) {
      console.log("[GenFlow] Grok: Aspect Ratio button not found");
      return;
    }
    nativeClick(trigger);
    await sleep(400);
    const menu = document.querySelector('[role="menu"]');
    if (!menu) {
      console.log("[GenFlow] Grok: Aspect ratio menu not found");
      return;
    }
    const items = menu.querySelectorAll('[role="menuitem"]');
    for (const item of items) {
      const text = (item.textContent || "").trim();
      if (text === ratio && isElementInteractable(item)) {
        nativeClick(item);
        await sleep(300);
        return;
      }
    }
    console.log(`[GenFlow] Grok: Aspect ratio "${ratio}" not found in menu`);
  }
  async function selectDuration(duration) {
    const durationValue = duration === "10s" ? "10" : "6";
    console.log(`[GenFlow] Grok: Selecting duration: ${durationValue}s`);
    const group = findRadiogroupByLabels(GROK_DURATION_GROUP_LABELS);
    if (group) {
      const buttons = group.querySelectorAll('button[role="radio"]');
      for (const btn of buttons) {
        const text = (btn.textContent || "").trim();
        if ((text === `${durationValue}s` || text === durationValue) && isElementInteractable(btn)) {
          if (btn.getAttribute("aria-checked") === "true") {
            console.log(`[GenFlow] Grok: Duration ${durationValue}s already selected`);
            return;
          }
          nativeClick(btn);
          await sleep(300);
          return;
        }
      }
    }
    const allButtons = document.querySelectorAll('button, [role="radio"], [role="option"]');
    for (const btn of allButtons) {
      const text = (btn.textContent || "").trim();
      if ((text.includes(`${durationValue}s`) || text.includes(`${durationValue} sec`) || text === durationValue) && isElementInteractable(btn)) {
        nativeClick(btn);
        console.log(`[GenFlow] Grok: Selected duration: ${text}`);
        await sleep(300);
        return;
      }
    }
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const radio of radios) {
      const label = radio.closest("label") || radio.parentElement;
      if (label) {
        const text = (label.textContent || "").trim();
        if (text.includes(durationValue)) {
          nativeClick(radio);
          await sleep(300);
          return;
        }
      }
    }
    console.log("[GenFlow] Grok: Duration selector not found");
  }
  async function injectPrompt(payload) {
    const { prompt, settings, slotId } = payload;
    currentPromptId = prompt.id;
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    try {
      console.log(`[GenFlow] Grok: Starting prompt #${prompt.number}`);
      await ensureOnImaginePage();
      await sleep(500);
      await waitForInjectionSurface();
      await selectVideoMode();
      await sleep(300);
      if (settings.grokAspectRatio) {
        await selectAspectRatio(settings.grokAspectRatio);
      }
      if (settings.grokQuality) {
        await selectResolution(settings.grokQuality);
      }
      if (settings.grokVideoDuration) {
        await selectDuration(settings.grokVideoDuration);
      }
      await sleep(300);
      await uploadImageToImagine(prompt.imageUrl);
      let sendBtn = null;
      for (let i = 0; i < 20; i++) {
        sendBtn = findSendButton();
        if (sendBtn)
          break;
        await sleep(500);
      }
      if (!sendBtn) {
        throw new Error("Send/Generate button not found or still disabled after 10 s");
      }
      console.log("[GenFlow] Grok: Send button ready");
      const inputEl = findImagineInput();
      if (!inputEl) {
        throw new Error("Prompt input not found on /imagine");
      }
      const expectedFragment = prompt.text.trim().substring(0, 20);
      let promptCommitted = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        enterPromptText(inputEl, prompt.text);
        await sleep(500);
        const currentText = (inputEl.textContent || inputEl.value || "").trim();
        if (currentText.length > 0 && (expectedFragment === "" || currentText.includes(expectedFragment))) {
          promptCommitted = true;
          break;
        }
        console.warn(`[GenFlow] Grok: prompt text not committed after attempt ${attempt + 1}, retrying`);
        await sleep(500);
      }
      if (!promptCommitted) {
        console.warn("[GenFlow] Grok: could not verify prompt text \u2014 proceeding anyway");
      }
      await sleep(300);
      sendBtn = findSendButton() || sendBtn;
      const urlBeforeClick = window.location.href;
      const knownVideoSrcs = new Set(
        Array.from(document.querySelectorAll("video")).map((v) => v.getAttribute("src") || "").filter((s) => s.includes(".mp4"))
      );
      console.log(`[GenFlow] Grok: Snapshot ${knownVideoSrcs.size} pre-existing video(s) before click`);
      nativeClick(sendBtn);
      await sleep(600);
      chrome.runtime.sendMessage({
        type: "GROK_CREATE_STARTED",
        payload: { promptId: prompt.id, slotId }
      }).catch(() => {
      });
      console.log(`[GenFlow] Grok: Generation started for prompt #${prompt.number}`);
      startCompletionMonitor(prompt, slotId, urlBeforeClick, knownVideoSrcs);
    } catch (error) {
      console.error("[GenFlow] Grok injection failed:", error);
      chrome.runtime.sendMessage({
        type: "GENERATION_FAILED",
        payload: { promptId: prompt.id, error: error instanceof Error ? error.message : "Injection failed" }
      });
    }
  }
  function startCompletionMonitor(prompt, slotId, urlBeforeClick, knownVideoSrcs = /* @__PURE__ */ new Set()) {
    const startTime = Date.now();
    const timeout = 10 * 60 * 1e3;
    let checkCount = 0;
    let lastVideoSrc = "";
    let resolved = false;
    let initialCooldown = true;
    setTimeout(() => {
      initialCooldown = false;
    }, 5e3);
    console.log("[GenFlow] Grok: Starting completion monitor");
    monitorInterval = setInterval(async () => {
      checkCount++;
      if (currentPromptId !== prompt.id || resolved) {
        if (monitorInterval)
          clearInterval(monitorInterval);
        monitorInterval = null;
        return;
      }
      const domError = detectDOMErrors();
      if (domError.type === "429") {
        resolved = true;
        if (monitorInterval) {
          clearInterval(monitorInterval);
          monitorInterval = null;
        }
        chrome.runtime.sendMessage({
          type: "GENERATION_FAILED",
          payload: { promptId: prompt.id, error: domError.message || "Rate limited (429)" }
        });
        return;
      }
      const progressEls = document.querySelectorAll('.tabular-nums, [class*="progress"]');
      for (const el of progressEls) {
        const text = (el.textContent || "").trim();
        const match = text.match(/(\d+)%/);
        if (match) {
          const pct = parseInt(match[1]);
          if (pct > 0 && pct < 100) {
            if (checkCount % 5 === 0) {
              console.log(`[GenFlow] Grok: Progress ${pct}%`);
            }
            return;
          }
        }
      }
      const allVideos = Array.from(document.querySelectorAll("video"));
      const sdVideo = document.getElementById("sd-video");
      const videosToCheck = sdVideo ? [sdVideo, ...allVideos.filter((v) => v !== sdVideo)] : allVideos;
      if (initialCooldown) {
        if (checkCount % 3 === 0)
          console.log("[GenFlow] Grok: Cooldown active, skipping video check");
        return;
      }
      for (const video of videosToCheck) {
        const src = video.getAttribute("src") || "";
        if (!src || !src.includes(".mp4") || src === lastVideoSrc)
          continue;
        if (video.id === "hd-video" && !video.getAttribute("src"))
          continue;
        if (knownVideoSrcs.has(src)) {
          console.log(`[GenFlow] Grok: Skipping pre-existing video src (id=${video.id || "no-id"})`);
          continue;
        }
        lastVideoSrc = src;
        console.log(`[GenFlow] Grok: Video src detected (id=${video.id || "no-id"}): ${src.substring(0, 80)}`);
        resolved = true;
        if (monitorInterval) {
          clearInterval(monitorInterval);
          monitorInterval = null;
        }
        console.log(`[GenFlow] Grok: Video complete for prompt #${prompt.number}`);
        chrome.runtime.sendMessage({
          type: "GENERATION_COMPLETE",
          payload: { promptId: prompt.id, resultUrl: src, promptNumber: prompt.number }
        }).then(() => {
          chrome.runtime.sendMessage({ type: "REQUEST_NEXT_PROMPT" }).catch(() => {
          });
        }).catch(() => {
        });
        return;
      }
      const retryBtns = document.querySelectorAll("button");
      for (const btn of retryBtns) {
        const text = (btn.textContent || "").trim();
        if ((text.includes("\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C") || text.includes("Retry")) && isElementInteractable(btn)) {
          if (lastVideoSrc) {
            resolved = true;
            if (monitorInterval) {
              clearInterval(monitorInterval);
              monitorInterval = null;
            }
            chrome.runtime.sendMessage({
              type: "GENERATION_COMPLETE",
              payload: { promptId: prompt.id, resultUrl: lastVideoSrc, promptNumber: prompt.number }
            }).then(() => {
              chrome.runtime.sendMessage({ type: "REQUEST_NEXT_PROMPT" }).catch(() => {
              });
            }).catch(() => {
            });
            return;
          }
        }
      }
      if (checkCount % 10 === 0) {
        console.log(`[GenFlow] Grok: Check #${checkCount}, waiting...`);
      }
      if (Date.now() - startTime > timeout) {
        resolved = true;
        if (monitorInterval) {
          clearInterval(monitorInterval);
          monitorInterval = null;
        }
        chrome.runtime.sendMessage({
          type: "GENERATION_FAILED",
          payload: { promptId: prompt.id, error: "Generation timed out (10 min)" }
        });
      }
    }, 3e3);
  }
  console.log("[GenFlow] Grok Imagine script ready");
})();
