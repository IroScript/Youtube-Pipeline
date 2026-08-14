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
    // Human-like jitter to break the machine-even rhythm that trips Flow's anti-bot.
    const j = ms + Math.floor(Math.random() * Math.min(ms, 300));
    if (document.hidden && ms <= 2000) {
      const start = Date.now();
      while (Date.now() - start < j) {}
      return Promise.resolve();
    }
    return new Promise((resolve) => setTimeout(resolve, j));
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

  // src/content/whisk.ts
  var currentPromptId = null;
  var observer = null;
  var completionInterval = null;
  var WHISK = {
    promptTextarea: [
      "#nameInput",
      'textarea[placeholder*="Describe your idea"]',
      'textarea[placeholder*="roll the dice"]',
      "textarea.sc-da7d3cfd-2",
      "textarea"
    ],
    submitButton: [
      'button[aria-label="Submit prompt"]',
      'button[type="submit"]',
      "button.sc-bece3008-0"
    ]
  };
  console.log("[GenFlow] Whisk content script loaded:", window.location.href);
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PING") {
      if (message.service && message.service !== "whisk") return false;
      sendResponse({ pong: true, service: "whisk" });
      return false;
    }
    if (message.type === "INJECT_PROMPT") {
      const payload = message.payload;
      if (payload.settings?.service !== "whisk")
        return false;
      injectPrompt(payload);
      sendResponse({ success: true });
      return false;
    } else if (message.type === "UPLOAD_CONTEXT") {
      uploadContext(message.payload.context);
      sendResponse({ success: true });
      return false;
    }
    return false;
  });
  function isWhiskHost() {
    return /labs\.google(\.com)?\/fx\/tools\/whisk/i.test(window.location.href);
  }
  function isVisible2(el) {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && el.offsetWidth > 0 && el.offsetHeight > 0;
  }
  async function simulateTyping(element, text) {
    element.focus();
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    if (nativeValueSetter) {
      nativeValueSetter.call(element, "");
    } else {
      element.value = "";
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(300);
    const charsToType = Math.min(5, text.length);
    for (let i = 0; i < charsToType; i++) {
      const char = text[i];
      element.dispatchEvent(new KeyboardEvent("keydown", {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      }));
      if (nativeValueSetter) {
        nativeValueSetter.call(element, text.substring(0, i + 1));
      } else {
        element.value = text.substring(0, i + 1);
      }
      element.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: char
      }));
      element.dispatchEvent(new KeyboardEvent("keyup", {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true
      }));
      await sleep(300);
    }
    if (text.length > charsToType) {
      if (nativeValueSetter) {
        nativeValueSetter.call(element, text);
      } else {
        element.value = text;
      }
      element.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: text.substring(charsToType)
      }));
    }
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function findPromptInput() {
    for (const sel of WHISK.promptTextarea) {
      const el = document.querySelector(sel);
      if (el && el instanceof HTMLTextAreaElement && isVisible2(el)) {
        return el;
      }
    }
    return null;
  }
  function findSubmitButton() {
    for (const sel of WHISK.submitButton) {
      const el = document.querySelector(sel);
      if (el && isVisible2(el))
        return el;
    }
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const icon = btn.querySelector("i");
      if (icon && icon.textContent?.includes("arrow_forward"))
        return btn;
    }
    for (const btn of buttons) {
      const text = (btn.textContent || "").trim().toLowerCase();
      if ((text.includes("generate") || text.includes("submit") || text.includes("send") || text.includes("\u0441\u043E\u0437\u0434\u0430\u0442\u044C")) && isVisible2(btn) && !btn.disabled) {
        return btn;
      }
    }
    return null;
  }
  async function waitForPageReady() {
    for (let i = 0; i < 30; i++) {
      const textarea = findPromptInput();
      if (textarea)
        return;
      await sleep(500);
    }
    throw new Error("\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 Whisk \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0430\u0441\u044C.");
  }
  async function injectPrompt(payload) {
    const { prompt, settings, slotId, context, generationMode } = payload;
    currentPromptId = prompt.id;
    cleanupMonitors();
    try {
      console.log(`[GenFlow] Whisk: Starting injection for prompt #${prompt.number}`);
      console.log(`[GenFlow] Whisk: Generation mode: ${generationMode || "single"}`);
      if (!isWhiskHost()) {
        throw new Error("Whisk content script should run on labs.google/fx/tools/whisk");
      }
      await waitForPageReady();
      await sleep(1e3);
      if (generationMode === "context" && context) {
        console.log("[GenFlow] Whisk: Context mode \u2014 matching characters by keywords...");
        await handleContextMode(context, prompt.text);
        await sleep(500);
      } else if (context && (context.objects?.length || context.characters?.length || context.locations?.length)) {
        await uploadContext(context);
        await sleep(500);
      }
      const filmDialog = document.querySelector('div[role="dialog"][data-state="open"]');
      const filmTextarea = document.querySelector("textarea#prompt-editor, textarea.sc-fb72904e-12");
      if (prompt.imageUrl && filmDialog && filmTextarea && isVisible2(filmDialog)) {
        console.log("[GenFlow] Whisk: Film mode - found edit dialog");
        await handleFilmModeDialog(filmTextarea, prompt.text);
        const dialogGenerateBtn = filmDialog.querySelector('button.sc-fb72904e-18, button:has(div[data-type="button-overlay"])');
        if (dialogGenerateBtn) {
          nativeClick(dialogGenerateBtn);
          startCompletionMonitor(prompt, slotId);
          return;
        }
      }
      const textarea = findPromptInput();
      if (!textarea) {
        throw new Error("\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E\u043B\u0435 \u0434\u043B\u044F \u0432\u0432\u043E\u0434\u0430 \u043F\u0440\u043E\u043C\u043F\u0442\u0430");
      }
      await simulateTyping(textarea, prompt.text);
      console.log(`[GenFlow] Whisk: Prompt entered: "${prompt.text.slice(0, 50)}..."`);
      await sleep(800);
      let submitBtn = findSubmitButton();
      for (let i = 0; i < 30; i++) {
        submitBtn = findSubmitButton();
        if (submitBtn && !submitBtn.disabled)
          break;
        if (i % 5 === 4) {
          const ta = findPromptInput();
          if (ta) {
            ta.dispatchEvent(new Event("input", { bubbles: true }));
            ta.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        await sleep(300);
      }
      if (!submitBtn) {
        throw new Error("\u041A\u043D\u043E\u043F\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
      }
      if (submitBtn.disabled) {
        nativeClick(submitBtn);
        await sleep(300);
        submitBtn = findSubmitButton();
        if (submitBtn && submitBtn.disabled) {
          throw new Error("\u041A\u043D\u043E\u043F\u043A\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430.");
        }
      } else {
        nativeClick(submitBtn);
        await sleep(300);
      }
      console.log(`[GenFlow] Whisk: Started generation for prompt #${prompt.number}`);
      startCompletionMonitor(prompt, slotId);
    } catch (error) {
      console.error("[GenFlow] Whisk injection failed:", error);
      chrome.runtime.sendMessage({
        type: "GENERATION_FAILED",
        payload: {
          promptId: prompt.id,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  }
  async function handleContextMode(context, promptText) {
    const lowerPrompt = promptText.toLowerCase();
    const matchedCharacters = [];
    for (const char of context.characters || []) {
      const keywords = char.description.toLowerCase().split(/[\s,]+/).filter((k) => k.length > 2);
      const isMatch = keywords.some((keyword) => lowerPrompt.includes(keyword));
      if (isMatch) {
        matchedCharacters.push(char);
        if (matchedCharacters.length >= 3)
          break;
      }
    }
    if (matchedCharacters.length > 0) {
      console.log(`[GenFlow] Whisk: Matched ${matchedCharacters.length} characters by keywords`);
      const charSections = document.querySelectorAll('[class*="character"], [class*="subject"]');
      for (const section of charSections) {
        const checkboxes = section.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
        for (const checkbox of checkboxes) {
          const label = checkbox.closest("label") || checkbox.parentElement;
          if (!label)
            continue;
          const labelText = (label.textContent || "").toLowerCase();
          const shouldCheck = matchedCharacters.some(
            (char) => char.description.toLowerCase().split(/[\s,]+/).some((k) => labelText.includes(k))
          );
          if (shouldCheck) {
            const isChecked = checkbox.checked || checkbox.getAttribute("aria-checked") === "true";
            if (!isChecked) {
              nativeClick(checkbox);
              await sleep(300);
            }
          }
        }
      }
    } else {
      console.log("[GenFlow] Whisk: No character matches found in prompt");
    }
    for (const obj of context.objects || []) {
      await uploadImage(obj.imageUrl, "object");
    }
    for (const loc of context.locations || []) {
      await uploadImage(loc.imageUrl, "scene");
    }
  }
  async function uploadContext(context) {
    const addImagesBtn = document.querySelector("button.sc-63569c0e-0");
    if (addImagesBtn && isVisible2(addImagesBtn)) {
      nativeClick(addImagesBtn);
      await sleep(800);
    }
    for (const obj of context.objects || []) {
      await uploadImage(obj.imageUrl, "object");
    }
    for (const char of context.characters || []) {
      await uploadImage(char.imageUrl, "subject");
    }
    for (const loc of context.locations || []) {
      await uploadImage(loc.imageUrl, "scene");
    }
  }
  async function handleFilmModeDialog(textarea, promptText) {
    textarea.focus();
    await sleep(100);
    await simulateTyping(textarea, promptText);
    await sleep(300);
  }
  async function uploadImageToInput(fileInput, imageUrl) {
    try {
      let blob;
      if (imageUrl.startsWith("data:")) {
        const response = await fetch(imageUrl);
        blob = await response.blob();
      } else if (imageUrl.startsWith("http")) {
        try {
          const response = await fetch(imageUrl);
          blob = await response.blob();
        } catch {
          console.warn("[GenFlow] Whisk: Cannot fetch image URL directly, CORS issue");
          return;
        }
      } else {
        return;
      }
      const file = new File([blob], `whisk_image_${Date.now()}.png`, { type: blob.type || "image/png" });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(1e3);
    } catch (e) {
      console.warn("[GenFlow] Whisk: Failed to upload image:", e);
    }
  }
  async function uploadImage(imageUrl, _type) {
    try {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput && (imageUrl.startsWith("data:") || imageUrl.startsWith("http"))) {
        await uploadImageToInput(fileInput, imageUrl);
      }
      await sleep(1e3);
    } catch (e) {
      console.warn(`[GenFlow] Whisk: Failed to upload image:`, e);
    }
  }
  function cleanupMonitors() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (completionInterval) {
      clearInterval(completionInterval);
      completionInterval = null;
    }
  }
  function startCompletionMonitor(prompt, slotId) {
    cleanupMonitors();
    const startTime = Date.now();
    const timeout = 3 * 60 * 1e3;
    let checkCount = 0;
    let lastDialogState = false;
    let resolved = false;
    console.log("[GenFlow] Whisk: Starting completion monitor...");
    const complete = (resultUrl) => {
      if (resolved)
        return;
      resolved = true;
      cleanupMonitors();
      console.log(`[GenFlow] Whisk: Generation complete for prompt #${prompt.number}`);
      chrome.runtime.sendMessage({
        type: "GENERATION_COMPLETE",
        payload: { promptId: prompt.id, resultUrl, promptNumber: prompt.number }
      });
    };
    const fail = (error) => {
      if (resolved)
        return;
      resolved = true;
      cleanupMonitors();
      chrome.runtime.sendMessage({
        type: "GENERATION_FAILED",
        payload: { promptId: prompt.id, error }
      });
    };
    const checkCompletion = () => {
      checkCount++;
      if (currentPromptId !== prompt.id) {
        cleanupMonitors();
        return;
      }
      const domError = detectDOMErrors();
      if (domError.type) {
        fail(domError.message || "Generation error");
        return;
      }
      const resultDialog = document.querySelector('div[role="dialog"][data-state="open"]');
      const dialogImage = resultDialog?.querySelector('img[src^="blob:"], img[src*="http"]');
      const promptEditor = resultDialog?.querySelector("textarea#prompt-editor");
      if (resultDialog && dialogImage && promptEditor && isVisible2(resultDialog)) {
        const dialogJustAppeared = !lastDialogState;
        lastDialogState = true;
        if (dialogJustAppeared) {
          complete(dialogImage.src);
          return;
        }
      } else {
        lastDialogState = false;
      }
      const imgs = document.querySelectorAll('img[src*="http"]:not([src*="googleusercontent"])');
      for (const img of imgs) {
        const imgEl = img;
        const src = imgEl.src;
        if (!src || src.includes("profile") || src.includes("avatar"))
          continue;
        if (imgEl.closest('div[role="dialog"]'))
          continue;
        const w = imgEl.naturalWidth || imgEl.clientWidth;
        const h = imgEl.naturalHeight || imgEl.clientHeight;
        if (w > 256 && h > 256) {
          const rect = imgEl.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            complete(src);
            return;
          }
        }
      }
      const downloadBtn = document.querySelector('button[aria-label*="download" i], a[download]');
      if (downloadBtn && isVisible2(downloadBtn)) {
        const href = downloadBtn.getAttribute("href") || "";
        complete(href || window.location.href);
        return;
      }
      if (Date.now() - startTime > timeout) {
        fail("Generation timed out (3 min)");
      }
    };
    let initialDelayDone = false;
    const runInitialDelay = async () => {
      const INITIAL_DELAY = 1e4;
      const start = Date.now();
      while (Date.now() - start < INITIAL_DELAY) {
        if (resolved)
          return;
        await sleep(3e3);
        checkCompletion();
        if (resolved)
          return;
      }
      initialDelayDone = true;
    };
    observer = new MutationObserver(() => {
      if (!initialDelayDone)
        return;
      checkCompletion();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    runInitialDelay().then(() => {
      if (resolved)
        return;
      completionInterval = setInterval(() => {
        if (currentPromptId !== prompt.id || resolved) {
          if (completionInterval)
            clearInterval(completionInterval);
          return;
        }
        checkCompletion();
      }, 2e3);
    });
  }
  console.log("[GenFlow] Whisk content script ready");
})();
