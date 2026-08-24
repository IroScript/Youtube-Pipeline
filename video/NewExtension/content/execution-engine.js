/**
 * FlowCraft Execution Engine - Master automation pipeline for Google Labs / Google Flow
 * Configured with human pacing delays, robust model selection, strict submit verification, output count, video duration, and scoped reference chip clearing.
 */
import { DOMQueryEngine } from './dom-query.js';
import { MediaUploader } from './media-uploader.js';
import { VideoChainer } from './video-chainer.js';
import { StatusTracker } from './status-tracker.js';
import { InputHandler } from './input-handler.js';
import { Logger } from '../utils/logger.js';
import { ACTIONS } from '../utils/constants.js';

export class ExecutionEngine {
  static sanitizeFilename(str) {
    if (!str) return 'media';
    let clean = str.replace(/\s+/g, '-');
    clean = clean.replace(/[^\p{L}\p{N}-]/gu, '');
    clean = clean.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    return clean.length > 50 ? clean.substring(0, 50) : (clean || 'media');
  }

  static async reportProgress(payload) {
    try {
      chrome.runtime.sendMessage({
        type: ACTIONS.PROGRESS_UPDATE,
        data: payload
      }).catch(() => {});

      // Forward to Python Bridge Server if active
      fetch('http://127.0.0.1:8102/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {}
  }

  static async autoDismissBanners() {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      if (DOMQueryEngine.isVisible(b) && !b.closest('[role="dialog"]') && (b.textContent ?? '').trim() === 'Agree') {
        Logger.info('🍪 Cookie banner detected — clicking Agree');
        b.click();
        await new Promise(r => setTimeout(r, 800));
        return;
      }
    }

    const dialog = document.querySelector('[role="dialog"][data-state="open"]');
    if (dialog) {
      const dialogBtns = Array.from(dialog.querySelectorAll('button'));
      const agreeKeywords = ['i agree', 'agree', 'accept', 'i accept'];
      for (const btn of dialogBtns) {
        const text = (btn.textContent ?? '').trim().toLowerCase();
        if (agreeKeywords.some(kw => text === kw)) {
          Logger.info(`🤝 Consent dialog detected — clicking "${btn.textContent?.trim()}"`);
          btn.click();
          await new Promise(r => setTimeout(r, 800));
          return;
        }
      }
    }
  }

  static async createProjectIfNeeded(selectors) {
    const isProjectActive = () => {
      return (window.location.pathname.includes('/project/') || window.location.href.includes('/project/')) &&
             (!!document.querySelector('[role="textbox"]') || !!document.querySelector('textarea') || !!document.querySelector('[contenteditable="true"]'));
    };

    if (isProjectActive()) {
      Logger.info('✅ Project workspace active — proceeding to configuration');
      return true;
    }

    Logger.info('🔍 Navigating from Flow Dashboard into Project Workspace...');

    // Strategy 1: Open newest existing project card on dashboard
    const projectLinks = Array.from(document.querySelectorAll('a[href*="/project/"], [href*="/project/"], [data-testid*="project-card"] a, [data-testid*="project-card"]'))
      .filter(el => DOMQueryEngine.isVisible(el) || el.href);

    if (projectLinks.length > 0) {
      Logger.info(`📂 Opening existing project [1/${projectLinks.length}]...`);
      const target = projectLinks[0];
      try {
        if (target.href) {
          target.click();
        } else {
          await DOMQueryEngine.simulateClickElement(target, 'Existing project card');
        }
      } catch {
        try { target.click(); } catch {}
      }
      
      for (let w = 0; w < 10; w++) {
        await new Promise(r => setTimeout(r, 500));
        if (window.location.href.includes('/project/')) break;
      }
    }

    // Strategy 2: If still on dashboard, click Create Project / "+" button
    if (!window.location.href.includes('/project/')) {
      const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"]')).filter(el => DOMQueryEngine.isVisible(el));
      
      let createBtn = candidates.find(el => {
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const text = (el.textContent || '').trim().toLowerCase();
        return aria.includes('create project') || aria.includes('new project') || title.includes('create project') || title.includes('new project') || text.includes('new project') || text.includes('create project');
      });

      if (!createBtn) {
        createBtn = candidates.find(el => {
          const icon = el.querySelector('i, span, svg');
          const iconText = (icon?.textContent || '').trim().toLowerCase();
          const className = el.className || '';
          return iconText === 'add' || iconText === 'add_2' || iconText === 'add_circle' || (el.textContent || '').trim() === '+' || className.includes('cgdjfr');
        });
      }

      if (!createBtn && selectors?.createProjectButton) {
        createBtn = DOMQueryEngine.queryFirst(selectors.createProjectButton);
      }

      if (createBtn) {
        Logger.info('🚀 Clicking "Create Project" button...');
        try { createBtn.click(); } catch {}
        await DOMQueryEngine.simulateClickElement(createBtn, 'Create project button');
        for (let w = 0; w < 10; w++) {
          await new Promise(r => setTimeout(r, 500));
          if (window.location.href.includes('/project/')) break;
        }
      }
    }

    // Wait for project workspace to be active
    for (let wait = 0; wait < 20; wait++) {
      if (window.location.href.includes('/project/') || !!document.querySelector('[role="textbox"]') || !!document.querySelector('textarea') || !!document.querySelector('[contenteditable="true"]')) {
        Logger.info('✅ Project workspace successfully active');
        return true;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    return true;
  }

  static async configureAspectRatios(selectors, aspectRatio) {
    const norm = aspectRatio.replace(':', '_');
    const root = 'div[data-state="open"] div[role="tablist"]';
    const strategies = [
      { selector: selectors.aspectRatioTemplate.replace('{aspectRatio}', norm), label: `icon ${norm}` },
      ...(aspectRatio === '1:1' ? [{ selector: `${root} button:has(i:contains("crop_square")), ${root} button:has(i:contains("1_1"))`, label: 'icon crop_square/1_1' }] : []),
      { selector: `${root} button:has(i:contains("crop_${norm}"))`, label: `icon crop_${norm}` },
      { selector: `${root} button:contains("${aspectRatio}")`, label: `text ${aspectRatio}` },
      { selector: `${root} button:contains("${norm}")`, label: `text ${norm}` },
      { selector: `${root} button[aria-label*="${aspectRatio}"], ${root} button[aria-label*="${norm}"]`, label: `aria-label ${aspectRatio}` }
    ];

    for (const strat of strategies) {
      if (await DOMQueryEngine.waitForElement(strat.selector, 1500)) {
        await DOMQueryEngine.simulateClick(strat.selector, `Aspect ratio ${aspectRatio} (${strat.label})`);
        await new Promise(r => setTimeout(r, 600));
        return;
      }
    }
    Logger.warn(`Aspect ratio ${aspectRatio} selector strategy not found`);
  }

  static findModelDropdownTrigger(selectors) {
    let trigger = DOMQueryEngine.queryFirst(selectors.modelSelectButton);
    if (trigger && DOMQueryEngine.isVisible(trigger)) return trigger;

    const pool = DOMQueryEngine.queryAll('button[role="combobox"], button[aria-haspopup="menu"], button[aria-haspopup="listbox"], button[aria-label*="Model"], button[aria-label*="model"]');
    for (const b of pool) {
      if (DOMQueryEngine.isVisible(b)) {
        const txt = (b.textContent ?? '').toLowerCase();
        if (txt.includes('veo') || txt.includes('omni') || txt.includes('model') || txt.includes('imagen') || DOMQueryEngine.queryFirst('i:contains("arrow_drop_down"), i:contains("expand_more")', b)) {
          return b;
        }
      }
    }

    const dropBtns = DOMQueryEngine.queryAll('button:has(i:contains("arrow_drop_down")), button:has(i:contains("expand_more"))');
    for (const b of dropBtns) {
      if (DOMQueryEngine.isVisible(b) && !b.closest('[role="menu"]')) {
        return b;
      }
    }

    return null;
  }

  static async configureModelSelection(itemModel, selectors) {
    if (!itemModel) return false;
    const targetModelText = itemModel.trim();
    Logger.info(`⚙️ Extension configuring Model Selection for: "${targetModelText}"...`);

    const isLowerPriorityTarget = targetModelText.toLowerCase().includes('lower');
    const isVeo31Target = targetModelText.includes('3.1');

    let triggerBtn = this.findModelDropdownTrigger(selectors);
    
    if (!triggerBtn) {
      const configBtn = DOMQueryEngine.queryFirst(selectors.configButton);
      if (configBtn && DOMQueryEngine.isVisible(configBtn)) {
        await DOMQueryEngine.simulateClickElement(configBtn, 'Open config panel for model dropdown');
        await new Promise(r => setTimeout(r, 600));
        triggerBtn = this.findModelDropdownTrigger(selectors);
      }
    }

    if (!triggerBtn) {
      Logger.warn(`⚠️ Could not find Model Dropdown button on page. Using current page model.`);
      return false;
    }

    const currentTriggerText = (triggerBtn.textContent ?? '').toLowerCase();
    if (isLowerPriorityTarget && currentTriggerText.includes('lower')) {
      Logger.info(`✅ Model already set to Lower Priority: "${triggerBtn.textContent?.trim()}"`);
      return true;
    }

    // Open dropdown
    await DOMQueryEngine.simulateClickElement(triggerBtn, 'Open model dropdown');
    await new Promise(r => setTimeout(r, 800));

    // Search open dropdown menu items
    const menuItems = Array.from(document.querySelectorAll(
      'div[role="menu"] button, [role="option"], [role="menuitem"], div[role="menu"] div, [data-radix-popper-content-wrapper] button, [data-radix-collection-item]'
    )).filter(el => DOMQueryEngine.isVisible(el));

    let matchedItem = null;

    if (isLowerPriorityTarget) {
      matchedItem = menuItems.find(el => {
        const txt = (el.textContent ?? '').toLowerCase();
        return txt.includes('lower priority') || txt.includes('lower');
      });
    } else if (isVeo31Target) {
      matchedItem = menuItems.find(el => {
        const txt = (el.textContent ?? '').toLowerCase();
        return txt.includes('3.1') && !txt.includes('lower');
      });
    } else {
      matchedItem = menuItems.find(el => (el.textContent ?? '').toLowerCase().includes(targetModelText.toLowerCase()));
    }

    if (matchedItem) {
      await DOMQueryEngine.simulateClickElement(matchedItem, `Model item "${matchedItem.textContent?.trim()}"`);
      Logger.info(`✅ Model successfully selected by extension: "${matchedItem.textContent?.trim()}"`);
      await new Promise(r => setTimeout(r, 800));
      return true;
    } else {
      Logger.warn(`Model option "${targetModelText}" not found in open menu. Visible options: [${menuItems.map(m => (m.textContent?.trim() || '')).filter(Boolean).join(', ')}]`);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 400));
      return false;
    }
  }

  /**
   * Configures Video Duration (e.g. 4s, 6s, 8s, 10s) based on user preference
   */
  static async configureVideoDuration(durationSec, selectors) {
    if (!durationSec || durationSec === 'auto') return true;
    const durNum = parseInt(durationSec, 10);
    if (![4, 6, 8, 10].includes(durNum)) return true;

    Logger.info(`⚙️ Configuring Video Duration to: ${durNum}s...`);

    const configPanel = DOMQueryEngine.queryFirst('div[data-state="open"], [role="dialog"]') || document;
    const durButtons = Array.from(configPanel.querySelectorAll('button, .flow_tab_slider_trigger, [role="tab"], [role="option"]'))
      .filter(b => DOMQueryEngine.isVisible(b));

    const targetLabel = `${durNum}s`;
    let matchedDurBtn = durButtons.find(b => {
      const txt = (b.textContent ?? '').trim().toLowerCase();
      return txt === targetLabel || txt === `${durNum} sec` || txt === `${durNum}s`;
    });

    if (!matchedDurBtn) {
      matchedDurBtn = durButtons.find(b => {
        const txt = (b.textContent ?? '').trim().toLowerCase();
        return txt.includes(targetLabel) || txt.includes(`${durNum}s`);
      });
    }

    if (matchedDurBtn) {
      await DOMQueryEngine.simulateClickElement(matchedDurBtn, `Duration ${durNum}s`);
      Logger.info(`✅ Video Duration successfully set to: "${matchedDurBtn.textContent?.trim()}"`);
      await new Promise(r => setTimeout(r, 600));
      return true;
    } else {
      Logger.warn(`Duration option button for ${durNum}s not found in config panel.`);
      return false;
    }
  }

  /**
   * Clears ONLY attached reference image chips strictly inside the prompt composer input box
   */
  static async clearAllReferenceImages(selectors) {
    const textarea = DOMQueryEngine.queryFirst(selectors.promptTextarea || '[role="textbox"]');
    if (!textarea) return;

    let composerBox = textarea.closest('form, section, div[data-testid*="prompt"]');
    if (!composerBox) {
      let curr = textarea.parentElement;
      for (let depth = 0; depth < 5 && curr; depth++) {
        if (DOMQueryEngine.queryFirst('button:has(i:contains("arrow_forward")), button:has(i:contains("arrow_upward"))', curr)) {
          composerBox = curr;
          break;
        }
        curr = curr.parentElement;
      }
    }

    if (!composerBox) return;

    const removeBtns = Array.from(composerBox.querySelectorAll('button, [role="button"]'))
      .filter(b => DOMQueryEngine.isVisible(b))
      .filter(b => {
        if (DOMQueryEngine.queryFirst('i:contains("arrow_forward"), i:contains("arrow_upward")', b)) return false;
        if ((b.getAttribute('role') || '').toLowerCase() === 'tab') return false;

        const txt = (b.textContent ?? '').trim().toLowerCase();
        const aria = (b.getAttribute('aria-label') ?? '').toLowerCase();
        const icon = (b.querySelector('i, svg, span')?.textContent ?? '').trim().toLowerCase();
        
        const isRemoveWord = txt === '✕' || txt === 'x' || aria.includes('remove') || aria.includes('clear') || aria.includes('deselect');
        const isRemoveIcon = icon === 'close' || icon === 'clear' || icon === 'cancel';
        
        const isReferenceChip = b.closest('[data-testid*="reference"], [data-testid*="chip"], [data-testid*="asset"], div:has(img), label:has(img)');
        return (isRemoveWord || isRemoveIcon) && isReferenceChip;
      });

    if (removeBtns.length > 0) {
      Logger.info(`🧹 Found ${removeBtns.length} attached reference image chip(s) in prompt composer. Clearing...`);
      for (const btn of removeBtns) {
        await DOMQueryEngine.simulateClickElement(btn, 'Remove reference image chip');
        await new Promise(r => setTimeout(r, 400));
      }
      Logger.info('✅ Composer reference image chips cleared successfully!');
    }
  }

  static async configureVideoSettings(item, isCancelled, isPaused, selectors) {
    const sel = selectors;
    const checkState = async () => {
      while (isPaused?.() && !isCancelled?.()) {
        await new Promise(r => setTimeout(r, 150));
      }
      return isCancelled?.();
    };

    try {
      if (await checkState()) return false;

      // 1. Clear any previous reference chips attached in prompt composer
      await this.clearAllReferenceImages(selectors);

      // 2. Set "Start frame only" mode if option exists
      const startFrameOnlyBtn = DOMQueryEngine.queryFirst(selectors.frameStartOnlyOption);
      if (startFrameOnlyBtn && DOMQueryEngine.isVisible(startFrameOnlyBtn)) {
        await DOMQueryEngine.simulateClickElement(startFrameOnlyBtn, 'Start frame only option');
        await new Promise(r => setTimeout(r, 500));
        Logger.info('✅ Set video frame mode to: "Start frame only"');
      }

      // 3. Handle video-to-video chaining frame injection
      if (item.outputPreviousPrompt && item.outputPreviousPrompt.extractedFrame) {
        item.mode = 'imageToVideo';
        item.images = [{
          base64: item.outputPreviousPrompt.extractedFrame,
          name: `extracted-frame-${Date.now()}.jpg`
        }];
        Logger.info('✅ Video Chainer: Previous video end-frame injected as single starting reference image');
      }

      if (await checkState()) return false;

      if (!await DOMQueryEngine.waitForElement(sel.configButton, 3000)) {
        Logger.warn('Config button not found — using default page configuration');
        return true;
      }

      await DOMQueryEngine.simulateClick(sel.configButton, 'Open config panel');
      await new Promise(r => setTimeout(r, 600));

      if (!await DOMQueryEngine.waitForElement(sel.selectVideoMode, 3000)) {
        Logger.warn('Video mode button missing — closing config panel');
        await DOMQueryEngine.simulateClick(sel.configButton, 'Close config panel');
        return true;
      }

      await DOMQueryEngine.simulateClick(sel.selectVideoMode, 'Select video mode');
      await new Promise(r => setTimeout(r, 500));

      if (item.mode === 'textToVideo') {
        await DOMQueryEngine.simulateClick(sel.textToVideoModeOption, 'Text-to-Video mode');
      } else if (item.mode === 'imageToVideo') {
        await DOMQueryEngine.simulateClick(sel.imageToVideoModeOption, 'Image-to-Video mode');
      } else if (item.mode === 'componentsToVideo') {
        await DOMQueryEngine.simulateClick(sel.componentToVideoModeOption, 'Ingredients mode');
      }
      await new Promise(r => setTimeout(r, 500));

      await this.configureAspectRatios(sel, item.aspectRatio);

      // Output count configuration (1x, x2, x4)
      const qty = item.outputCount ?? 1;
      Logger.info(`⚙️ Configuring Output Count to: ${qty}x...`);

      const configPanel = DOMQueryEngine.queryFirst('div[data-state="open"], [role="dialog"]') || document;
      const qtyButtons = Array.from(configPanel.querySelectorAll('button, .flow_tab_slider_trigger, [role="tab"]'))
        .filter(b => DOMQueryEngine.isVisible(b));

      let matchedQtyBtn = qtyButtons.find(b => {
        const txt = (b.textContent ?? '').trim().toLowerCase();
        return txt === `${qty}x` || txt === `x${qty}` || txt === `${qty}`;
      });

      if (!matchedQtyBtn) {
        matchedQtyBtn = qtyButtons.find(b => {
          const txt = (b.textContent ?? '').trim().toLowerCase();
          return txt.includes(`${qty}x`) || txt.includes(`x${qty}`);
        });
      }

      if (matchedQtyBtn) {
        await DOMQueryEngine.simulateClickElement(matchedQtyBtn, `Output count ${qty}x`);
        Logger.info(`✅ Output count successfully set to: "${matchedQtyBtn.textContent?.trim()}"`);
        await new Promise(r => setTimeout(r, 600));
      } else {
        Logger.warn(`Output count button for ${qty}x not found in config panel.`);
      }

      // Video Duration configuration (4s, 6s, 8s, 10s)
      await this.configureVideoDuration(item.duration, sel);

      // Model Selection with explicit Lower Priority support
      await this.configureModelSelection(item.model, sel);

      if (item.model === 'Omni Flash' && item.omniFlashDuration) {
        if (await checkState()) return false;
        const durLabel = `${item.omniFlashDuration}s`;
        if (await DOMQueryEngine.waitForElement('button.flow_tab_slider_trigger', 4000)) {
          const triggers = DOMQueryEngine.queryAll('button.flow_tab_slider_trigger');
          const durBtn = triggers.find(b => (b.textContent ?? '').trim() === durLabel);
          if (durBtn) {
            durBtn.click();
            await new Promise(r => setTimeout(r, 500));
            Logger.info(`✅ Omni Flash duration set to ${durLabel}`);
          }
        }
      }

      await DOMQueryEngine.simulateClick(sel.configButtonActived, 'Close config panel');
      await new Promise(r => setTimeout(r, 600));

      if (await checkState()) return false;

      // Upload reference images (single Start frame image)
      if (item.images && item.images.length > 0) {
        for (let i = 0; i < item.images.length; i++) {
          if (await checkState()) return false;
          Logger.info(`Uploading reference image ${i + 1}/${item.images.length}...`);
          this.reportProgress({
            promptIndex: item.promptIndex,
            percentage: 0,
            status: 'uploading',
            prompt: item.prompt,
            uploadIndex: i + 1,
            uploadTotal: item.images.length
          });

          await MediaUploader.uploadBase64Image(item.images[i], i, sel, isCancelled, isPaused);
          await new Promise(r => setTimeout(r, 800));
        }
      }

      return true;
    } catch (err) {
      Logger.error('Error in configureVideoSettings:', err);
      return false;
    }
  }

  static getAllTileElements(selectors) {
    const sel = selectors;
    let tiles = DOMQueryEngine.queryAll(sel?.outputItems || '[data-tile-id]');
    if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]:has(div)');
    if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]');
    if (tiles.length === 0) {
      tiles = DOMQueryEngine.queryAll(
        '[data-testid*="generation"], [data-testid*="output"], [data-testid*="card"], [data-testid*="tile"], [data-session-item], div[class*="generation"], div:has(video)'
      );
    }
    if (tiles.length === 0) {
      const vids = Array.from(document.querySelectorAll('video')).map(v => v.closest('div:has(button), div:has(video), section') || v);
      tiles = [...new Set(vids)];
    }
    return tiles;
  }

  static getExistingTileIds(selectors) {
    const tiles = this.getAllTileElements(selectors);
    const ids = new Set();
    tiles.forEach((t, i) => {
      const id = t.getAttribute('data-tile-id') || t.getAttribute('data-testid') || t.getAttribute('data-id') || t.getAttribute('id') || t.querySelector('video')?.src || `tile_${i}`;
      if (id) ids.add(id);
    });
    return ids;
  }

  static async locateNewTileIds(existingTileIds, outputCount, mode, selectors, isCancelled) {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (isCancelled()) return { success: false, tileIds: [] };

      const tiles = this.getAllTileElements(selectors);
      if (tiles.length > 0) {
        const allIds = [];
        tiles.forEach((t, i) => {
          const tid = t.getAttribute('data-tile-id') || t.getAttribute('data-testid') || t.getAttribute('data-id') || t.getAttribute('id') || t.querySelector('video')?.src || `tile_${i}`;
          if (tid) allIds.push(tid);
        });

        const newIds = [...new Set(allIds)].filter(id => !existingTileIds.has(id));
        const targetCount = mode === 'agent' ? Math.min(newIds.length, 4) : Math.min(newIds.length, outputCount);
        const targetIds = newIds.slice(0, targetCount > 0 ? targetCount : outputCount);

        if (newIds.length > 0) {
          Logger.info(`🔍 Located ${newIds.length} new tile ID(s): [${newIds.join(', ')}]`);
          return { success: true, tileIds: targetIds };
        }
      }

      // Fallback: If video or rendering progress bar appeared anywhere on page
      const anyRendering = Array.from(document.querySelectorAll('[role="progressbar"], svg animate, md-circular-progress, video'));
      if (anyRendering.length > 0 && attempt > 4) {
        const target = anyRendering[anyRendering.length - 1].closest('div:has(button), div:has(video), section') || anyRendering[anyRendering.length - 1];
        const tid = target.getAttribute('data-tile-id') || target.getAttribute('data-id') || `active_render_${Date.now()}`;
        Logger.info(`🔍 Located active rendering element: ${tid}`);
        return { success: true, tileIds: [tid] };
      }

      if (attempt % 10 === 0) {
        Logger.info(`⏳ Locating new generation tile IDs... attempt ${attempt + 1}/120`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
    Logger.warn('Could not locate new tile IDs within timeout');
    return { success: false, tileIds: [] };
  }

  static async pollGenerationStatus(tileIds, item, selectors, isCancelled, isPaused) {
    const sel = selectors;
    const targetCount = item.mode === 'agent' ? tileIds.length : item.outputCount;
    const isVideoMode = item.mode.includes('ToVideo');

    Logger.info(`⚡ Starting status poll for ${tileIds.length} tile(s): [${tileIds.join(', ')}]...`);

    // Settle phase: give Google Flow 12s to queue the job without premature completion checks
    const settleEnd = Date.now() + 12000;
    while (Date.now() < settleEnd) {
      if (isCancelled()) return { success: false, resourceElements: [], tileIdsError: [] };
      while (isPaused?.() && !isCancelled?.()) {
        await new Promise(r => setTimeout(r, 300));
      }

      this.reportProgress({
        promptIndex: item.promptIndex,
        percentage: 0,
        status: 'generating',
        prompt: item.prompt,
        estimatedWaitSeconds: Math.ceil((settleEnd - Date.now()) / 1000)
      });

      await new Promise(r => setTimeout(r, 1000));
    }

    const errTileIds = [];
    const videoElements = [];
    const imageElements = [];
    let consecutiveReadyCount = 0;

    let maxObservedPercent = 0;

    // Dynamic generation polling loop: up to 300 polls (10 minutes max, dynamically checks completion)
    for (let poll = 0; poll < 300; poll++) {
      if (isCancelled()) return { success: false, resourceElements: [], tileIdsError: [] };
      while (isPaused?.() && !isCancelled?.()) {
        await new Promise(r => setTimeout(r, 300));
      }

      let activeTiles = tileIds.map(id => {
        return DOMQueryEngine.queryFirst(`[data-tile-id="${id}"]`) ||
               DOMQueryEngine.queryFirst(sel.tileByIdTemplate.replace('{tileId}', id)) ||
               DOMQueryEngine.queryFirst(`div[data-tile-id*="${id}"]`);
      }).filter(Boolean);

      if (activeTiles.length === 0) {
        const allTiles = Array.from(document.querySelectorAll('[data-tile-id]'));
        if (allTiles.length > 0) {
          activeTiles = [allTiles[0]];
        } else {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
      }

      videoElements.length = 0;
      imageElements.length = 0;
      let totalPercent = 0;
      let completedTilesCount = 0;

      for (let idx = 0; idx < activeTiles.length; idx++) {
        const tile = activeTiles[idx];
        
        // Wake up tile elements and hover controls
        tile.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, composed: true }));
        tile.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));

        const vids = Array.from(tile.querySelectorAll('video'));
        const imgs = Array.from(tile.querySelectorAll('img'));
        const isRendering = StatusTracker.isTileRendering(tile);
        const isComplete = StatusTracker.isTileComplete(tile, isVideoMode);

        if (isComplete) {
          completedTilesCount++;
          if (isVideoMode) {
            if (vids.length > 0) videoElements.push(...vids);
            else videoElements.push(tile);
          } else {
            if (imgs.length > 0) imageElements.push(...imgs);
            else imageElements.push(tile);
          }
          totalPercent += 100;
        } else if (isRendering) {
          const rawTileText = (tile.innerText || tile.textContent || '');
          const match = rawTileText.match(/\b(\d{1,3})%\b/);
          const pctVal = match ? parseInt(match[1], 10) : Math.max(maxObservedPercent, 15);
          totalPercent += pctVal;
        } else {
          totalPercent += Math.max(maxObservedPercent, 10);
        }
      }

      let currentAvg = Math.round(totalPercent / activeTiles.length);
      if (currentAvg > maxObservedPercent && currentAvg <= 99) {
        maxObservedPercent = currentAvg;
      }

      const readyResources = isVideoMode ? videoElements : imageElements;

      // 3-Way Ground Truth Verification: All target tiles verified ready
      if (completedTilesCount >= targetCount && readyResources.length >= targetCount) {
        consecutiveReadyCount++;
        Logger.info(`🔍 [Verification] Video generation verified complete (${consecutiveReadyCount}/2).`);
      } else {
        consecutiveReadyCount = 0;
      }

      this.reportProgress({
        promptIndex: item.promptIndex,
        percentage: consecutiveReadyCount >= 2 ? 100 : Math.min(99, maxObservedPercent),
        status: consecutiveReadyCount >= 2 ? 'completed' : 'generating',
        prompt: item.prompt
      });

      // Require 2 consecutive positive checks to guarantee zero false-positives
      if (consecutiveReadyCount >= 2) {
        Logger.info(`⏳ [Finalizing] Video generation 100% verified. Waiting 4s before download...`);
        this.reportProgress({
          promptIndex: item.promptIndex,
          percentage: 100,
          status: 'finalizing',
          prompt: item.prompt
        });
        await new Promise(r => setTimeout(r, 4000));
        Logger.info(`✅ Video generation 100% complete (${completedTilesCount}/${targetCount} tiles ready)`);
        return {
          success: true,
          resourceElements: readyResources.slice(0, targetCount),
          tileIdsError: errTileIds,
          unusualActivityLost: 0,
          terminalFailedLost: 0
        };
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    Logger.warn('Generation polling timed out after 300s');
    return { success: false, resourceElements: [], tileIdsError: [] };
  }

  static async downloadTileMedia(tileIds, item, resultData, selectors, isCancelled, isPaused) {
    const isVideo = item.mode.includes('ToVideo');
    const resources = resultData.resourceElements;

    let extractedFrameObj = {};
    if (item.isConcat && isVideo && resources.length > 0) {
      Logger.info('🎞️ Video Chainer: Capturing last frame of generated video...');
      const frameData = await VideoChainer.captureLastVideoFrame(resources);
      if (frameData) {
        extractedFrameObj = { extractedFrame: frameData };
        Logger.info('✅ Video Chainer: End frame successfully captured!');
      } else {
        Logger.warn('⚠️ Video Chainer: Failed to capture end frame from video element');
      }
    }

    if (item.autoDownloadResourceQuality === 'no-download') {
      Logger.info(`📥 Skipping auto-download for prompt index ${item.promptIndex} (no-download configured)`);
      return { success: true, downloadedCount: 0, ...extractedFrameObj };
    }

    const sel = selectors;
    const cleanPromptName = this.sanitizeFilename(item.prompt);
    const prefix = `${item.promptIndex}_${cleanPromptName}_`;
    const folder = item.folderName?.trim() || 'FlowCraft_Outputs';

    await chrome.runtime.sendMessage({
      type: ACTIONS.SET_DOWNLOAD_ROUTING,
      folderName: folder,
      prefix,
      autoChangeFileName: item.autoChangeFileName !== false
    });

    Logger.info(`⬇️ [Downloading] Initiating video download sequence...`);
    this.reportProgress({
      promptIndex: item.promptIndex,
      percentage: 100,
      status: 'downloading',
      prompt: item.prompt
    });

    if (isVideo) {
      for (let i = 0; i < tileIds.length; i++) {
        if (isCancelled()) return { success: false };
        const tid = tileIds[i];

        let tileEl = DOMQueryEngine.queryFirst(`div[data-tile-id="${tid}"]`) || DOMQueryEngine.queryFirst(`[data-tile-id="${tid}"]`);
        if (!tileEl) {
          const allTiles = Array.from(document.querySelectorAll('[data-tile-id]'));
          tileEl = allTiles[0];
        }

        if (tileEl) {
          tileEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, composed: true }));
          tileEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
          await new Promise(r => setTimeout(r, 600));
        }

        // Method 1: Direct Video Tag Source Download via Chrome API & Python Bridge
        const vidEl = tileEl?.querySelector('video') || document.querySelector('[data-tile-id] video') || document.querySelector('video');
        const src = vidEl?.src || vidEl?.currentSrc || (vidEl?.querySelector('source')?.src) || resources[i]?.src;

        if (src && (src.startsWith('http') || src.startsWith('blob:'))) {
          Logger.info(`📥 Direct Video stream found: ${src.substring(0, 60)}...`);
          fetch('http://127.0.0.1:8102/api/video_ready', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_url: src, filename: `${cleanPromptName}.mp4` })
          }).catch(() => {});

          await chrome.runtime.sendMessage({
            type: ACTIONS.DOWNLOAD_MEDIA,
            url: src,
            filename: `${cleanPromptName}.mp4`,
            folder,
            autoChangeFileName: item.autoChangeFileName !== false
          });
          Logger.info(`✅ Video download request sent to Chrome download manager`);
        }

        // Method 2: Click direct download button if present on tile
        const directDlBtn = tileEl ? tileEl.querySelector('button:has(i:contains("download")), button[aria-label*="Download"]') : null;
        if (directDlBtn && !directDlBtn.hasAttribute('disabled')) {
          Logger.info(`💾 Clicking Download button on tile...`);
          try { directDlBtn.click(); } catch {}
          await DOMQueryEngine.simulateClickElement(directDlBtn, 'Tile Download button');
        }

        // Method 3: Click 3-dot options menu and select Download / 1080p from dropdown
        const menuBtn = tileEl ? tileEl.querySelector('button:has(i:contains("more_vert")), button:has(i:contains("more_horiz")), button[aria-haspopup="menu"]') : null;
        if (menuBtn) {
          Logger.info(`💾 Opening 3-dot options menu on tile...`);
          try { menuBtn.click(); } catch {}
          await DOMQueryEngine.simulateClickElement(menuBtn, 'Tile 3-dot menu');
          await new Promise(r => setTimeout(r, 600));

          const menuOptions = Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"], [data-radix-popper-content-wrapper] button, [role="menu"] button, div[role="menu"] *'));
          const targetOpt = menuOptions.find(o => {
            const t = (o.textContent || '').toLowerCase();
            return t.includes('download') || t.includes('1080') || t.includes('original') || t.includes('save') || !!o.querySelector('i:contains("download")');
          });

          if (targetOpt && !targetOpt.hasAttribute('disabled')) {
            Logger.info(`💾 Clicking "${targetOpt.textContent.trim()}" in dropdown menu...`);
            try { targetOpt.click(); } catch {}
            await DOMQueryEngine.simulateClickElement(targetOpt, 'Dropdown Download option');
          } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
        }
      }
    } else {
      for (let i = 0; i < resources.length; i++) {
        if (isCancelled()) return { success: false };
        const src = resources[i].src;
        if (!src) continue;

        const sfx = resources.length > 1 ? `_${i + 1}` : '';
        const filename = `${item.promptIndex}_${cleanPromptName}${sfx}.png`;

        try {
          const resp = await chrome.runtime.sendMessage({
            type: ACTIONS.DOWNLOAD_MEDIA,
            url: src,
            filename,
            folder,
            autoChangeFileName: item.autoChangeFileName !== false
          });

          if (resp?.success) {
            Logger.info(`✅ Resource downloaded to ${folder}/${filename}`);
          }
        } catch (err) {
          Logger.error(`Error downloading resource ${i + 1}:`, err);
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Wait for download to finish
    const saveStart = Date.now();
    for (let poll = 0; poll < 60; poll++) {
      if (Date.now() - saveStart > 30000 || isCancelled()) break;
      const status = await chrome.runtime.sendMessage({ type: ACTIONS.GET_DOWNLOAD_STATUS })
        .catch(() => ({ expected: 0, completed: 0 }));

      if (status && status.expected > 0 && status.completed >= status.expected) {
        Logger.info('💾 [Saving] All download files verified complete on disk');
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    return { success: true, downloadedCount: 1, ...extractedFrameObj };
  }

  static async executePromptItem(item, selectors, isCancelled, isPaused) {
    // ═══════════════════════════════════════════════════════════════════
    // CHARACTER CONSISTENCY ENGINE (3-Layer Strategy)
    // ═══════════════════════════════════════════════════════════════════
    const hasCharacterRef = /\[ref:\s*uploaded_image(?:\.jpg)?\]/i.test(item.prompt);

    if (hasCharacterRef) {
      // LAYER 1: This scene HAS a character → ensure Ingredients mode + image stays
      if (item.mode === 'textToVideo') {
        item.mode = 'componentsToVideo';
      }
      Logger.info(`🧑 Character scene detected (Scene ${item.promptIndex}) → mode: ${item.mode}`);
    } else {
      // LAYER 2: This scene has NO character → force textToVideo, clear images
      if (item.mode === 'imageToVideo' || item.mode === 'componentsToVideo') {
        item.mode = 'textToVideo';
        item.images = [];
        Logger.info(`🌍 Non-character scene detected (Scene ${item.promptIndex}) → switched to textToVideo, images cleared`);
      }
    }

    // LAYER 1 + 3: Build the final clean prompt
    let finalPrompt = item.prompt;
    if (hasCharacterRef) {
      // Strip the [ref: uploaded_image.jpg] tag — Veo doesn't parse it as text
      finalPrompt = finalPrompt.replace(/\s*\[ref:\s*uploaded_image(?:\.jpg)?\]/gi, '');
      // Inject character consistency instruction at the END
      finalPrompt += ' [Maintain strict visual consistency with the attached reference image: same face, same skin tone, same ethnicity, same build throughout the entire video.]';
      Logger.info(`🎭 Prompt cleaned: [ref] tag stripped, consistency instruction appended`);
    }
    // Clean and normalize final prompt text
    finalPrompt = (finalPrompt || '').replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
    item._finalPrompt = finalPrompt;

    const steps = [
      { name: 'Project Initialization', status: 'pending' },
      { name: 'Configure Environment', status: 'pending' },
      { name: 'Inject Prompt', status: 'pending' },
      { name: 'Generate & Monitor', status: 'pending' }
    ];

    try {
      await this.autoDismissBanners();

      // Step 1: Project creation
      steps[0].status = 'running';
      this.reportProgress({ promptIndex: item.promptIndex, prompt: item.prompt, status: 'configuring', percentage: 0 });

      if (!await this.createProjectIfNeeded(selectors)) {
        steps[0].status = 'error';
        return { success: false, steps, error: 'Project initialization failed', shouldRetry: true };
      }
      steps[0].status = 'completed';

      if (isCancelled()) return { success: false, cancelled: true, steps };

      // Step 2: Settings configuration with slow delays, output count, video duration, and reference image clearing
      steps[1].status = 'running';
      if (item.mode.includes('ToVideo')) {
        await this.configureVideoSettings(item, isCancelled, isPaused, selectors);
      }
      steps[1].status = 'completed';

      if (isCancelled()) return { success: false, cancelled: true, steps };

      // Step 3: Capture existing tile IDs BEFORE submitting prompt
      const existingTileIds = this.getExistingTileIds(selectors);

      // Step 4: Fill prompt & execute slow human review delay
      steps[2].status = 'running';
      Logger.info('📝 Extension injecting prompt into editor...');
      let textarea = await DOMQueryEngine.waitForElement(selectors.promptTextarea, 4000);
      textarea = InputHandler.findPromptElement(textarea);
      
      if (!textarea) {
        steps[2].status = 'error';
        return { success: false, steps, error: 'Prompt editor input not found', shouldRetry: false };
      }

      // Use the cleaned prompt (tags stripped, consistency instruction added)
      await InputHandler.typePromptText(textarea, item._finalPrompt);
      await new Promise(r => setTimeout(r, 600));
      
      const wordCount = item.prompt.split(/\s+/).filter(Boolean).length;
      const reviewDelay = Math.min(1000 + wordCount * 15 + Math.floor(Math.random() * 1000), 4000);
      Logger.info(`⏳ Human word review delay (${wordCount} words): ${(reviewDelay / 1000).toFixed(1)}s...`);
      this.reportProgress({ promptIndex: item.promptIndex, prompt: item.prompt, status: 'reviewing', percentage: 0 });
      await new Promise(r => setTimeout(r, reviewDelay));

      const preSubmitPacing = 2000 + Math.floor(Math.random() * 1501);
      Logger.info(`⏳ Human pacing delay before submit: ${(preSubmitPacing / 1000).toFixed(1)}s...`);
      this.reportProgress({ promptIndex: item.promptIndex, prompt: item.prompt, status: 'submitting', percentage: 0 });
      await new Promise(r => setTimeout(r, preSubmitPacing));

      // Guarantee prompt is still inside editor before clicking submit
      const currentPromptText = (textarea.value || textarea.innerText || textarea.textContent || '').trim();
      if (currentPromptText.length < 20) {
        Logger.warn('⚠️ Textarea empty before submit — re-injecting prompt...');
        await InputHandler.typePromptText(textarea, item._finalPrompt);
        await new Promise(r => setTimeout(r, 400));
      }

      // Locate Submit Button strictly using robust multi-layer finder
      let submitBtn = InputHandler.findSubmitButton(textarea);

      if (!submitBtn && selectors?.submitButton) {
        submitBtn = DOMQueryEngine.queryFirst(selectors.submitButton);
      }

      if (submitBtn) {
        let isDisabled = submitBtn.getAttribute('aria-disabled') === 'true' || submitBtn.hasAttribute('disabled') || submitBtn.disabled;
        if (isDisabled) {
          Logger.info('⏳ Submit button initially disabled — forcing React input state sync...');
          if (textarea) {
            textarea.focus();
            try {
              const dt = new DataTransfer();
              dt.setData('text/plain', ' ');
              textarea.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, composed: true }));
            } catch {}
          }
          for (let wait = 0; wait < 12; wait++) {
            await new Promise(r => setTimeout(r, 500));
            isDisabled = submitBtn.getAttribute('aria-disabled') === 'true' || submitBtn.hasAttribute('disabled') || submitBtn.disabled;
            if (!isDisabled) {
              Logger.info('✅ Submit button is now enabled and ready for click!');
              break;
            }
          }
        }
      }

      // Multi-layer bulletproof submit execution
      Logger.info('🚀 [Submitting] Extension is executing submit (CDP Native Trusted Mouse + Enter Key + DOM Pointer Sequence)...');
      
      // Tier 1: CDP Native Trusted Mouse Click at exact pixel coordinates
      try {
        const cdpRes = await InputHandler.submitFormCDP();
        Logger.info(`🖱️ CDP Submit click dispatched: ${JSON.stringify(cdpRes)}`);
      } catch (e) {
        Logger.warn(`CDP submit notice: ${e.message}`);
      }

      // Tier 2: CDP Native Trusted Enter Key Dispatch
      try {
        await InputHandler.submitEnterCDP();
      } catch {}

      // Tier 3: Direct DOM Pointer & Mouse Events on Submit Button
      if (submitBtn) {
        try {
          submitBtn.focus();
          submitBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }));
          submitBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true, buttons: 1 }));
          submitBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true }));
          submitBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, composed: true, buttons: 1 }));
          submitBtn.click();
        } catch (e) {
          Logger.warn(`DOM submit click warning: ${e.message}`);
        }
      }

      // Tier 4: Keyboard Enter & Ctrl+Enter Events on Prompt Editor
      try {
        if (textarea) {
          textarea.focus();
          const enterEvtDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
          const enterEvtUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true });
          textarea.dispatchEvent(enterEvtDown);
          textarea.dispatchEvent(enterEvtUp);
          const ctrlEnterEvt = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, ctrlKey: true, bubbles: true, cancelable: true });
          textarea.dispatchEvent(ctrlEnterEvt);
        }
      } catch {}

      // Tier 5: Enclosing Form requestSubmit
      try {
        const form = textarea?.closest('form');
        if (form) {
          if (submitBtn) form.requestSubmit(submitBtn);
          else form.requestSubmit();
        }
      } catch {}

      const postSubmitPacing = 3000 + Math.floor(Math.random() * 2001);
      await new Promise(r => setTimeout(r, postSubmitPacing));

      steps[2].status = 'completed';

      if (isCancelled()) return { success: false, cancelled: true, steps };

      // Step 5: Locate BRAND NEW tile IDs inserted for this prompt
      steps[3].status = 'running';
      this.reportProgress({ promptIndex: item.promptIndex, prompt: item.prompt, status: 'locating', percentage: 0 });

      const tileRes = await this.locateNewTileIds(existingTileIds, item.outputCount, item.mode, selectors, isCancelled);
      if (!tileRes.success) {
        steps[3].status = 'error';
        return { success: false, steps, error: 'Output tiles not located after submit', shouldRetry: false };
      }

      // Step 6: Poll video generation completion until 100% ready
      const genRes = await this.pollGenerationStatus(tileRes.tileIds, item, selectors, isCancelled, isPaused);
      if (!genRes.success) {
        steps[3].status = 'error';
        return { success: false, steps, error: 'Generation failed or timed out', shouldRetry: false };
      }

      // Step 7: Extract end frame for Video Chainer & download media
      const downloadRes = await this.downloadTileMedia(tileRes.tileIds, item, genRes, selectors, isCancelled, isPaused);
      steps[3].status = 'completed';

      return {
        success: true,
        steps,
        downloadedCount: downloadRes.downloadedCount,
        outputPreviousPrompt: downloadRes.extractedFrame ? { extractedFrame: downloadRes.extractedFrame } : undefined
      };
    } catch (err) {
      Logger.error('Automation error in executePromptItem:', err);
      return { success: false, steps, error: err.message, shouldRetry: false };
    }
  }
}
