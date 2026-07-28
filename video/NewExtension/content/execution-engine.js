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
    if (window.location.href.includes('/project/') || DOMQueryEngine.queryFirst('[role="textbox"]')) {
      Logger.info('✅ Project workspace active — proceeding to configuration');
      return true;
    }

    const sel = selectors;
    try {
      const btn = await DOMQueryEngine.waitForElement(sel.createProjectButton, 5000);
      if (!btn) {
        Logger.warn('Create project button not found — assuming project workspace active');
        return true;
      }

      await DOMQueryEngine.simulateClick(sel.createProjectButton, 'Create project button');
      await new Promise(r => setTimeout(r, 4000));
      return true;
    } catch (err) {
      Logger.error('Failed to create project:', err);
      return true;
    }
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

  static getExistingTileIds(selectors) {
    const sel = selectors;
    let tiles = DOMQueryEngine.queryAll(sel.outputItems);
    if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]:has(div)');
    if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]');

    const ids = new Set();
    tiles.forEach(t => {
      const id = t.getAttribute('data-tile-id');
      if (id) ids.add(id);
    });
    return ids;
  }

  static async locateNewTileIds(existingTileIds, outputCount, mode, selectors, isCancelled) {
    const sel = selectors;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (isCancelled()) return { success: false, tileIds: [] };

      let tiles = DOMQueryEngine.queryAll(sel.outputItems);
      if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]:has(div)');
      if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]');

      if (tiles.length > 0) {
        const allIds = [];
        tiles.forEach(t => {
          const tid = t.getAttribute('data-tile-id');
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

    const settleEnd = Date.now() + 25000;
    while (Date.now() < settleEnd) {
      if (isCancelled()) return { success: false, resourceElements: [], tileIdsError: [] };
      while (isPaused?.() && !isCancelled?.()) {
        await new Promise(r => setTimeout(r, 300));
      }

      const activeTiles = tileIds.map(id => DOMQueryEngine.queryFirst(sel.tileByIdTemplate.replace('{tileId}', id))).filter(Boolean);
      if (activeTiles.length > 0) {
        const completeTiles = activeTiles.filter(t => StatusTracker.isTileComplete(t, isVideoMode));
        if (completeTiles.length >= Math.min(targetCount, activeTiles.length)) {
          Logger.info('⚡ All tiles completed early during settle phase!');
          break;
        }
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

    for (let poll = 0; poll < 150; poll++) {
      if (isCancelled()) return { success: false, resourceElements: [], tileIdsError: [] };
      while (isPaused?.() && !isCancelled?.()) {
        await new Promise(r => setTimeout(r, 300));
      }

      const activeTiles = tileIds.map(id => DOMQueryEngine.queryFirst(sel.tileByIdTemplate.replace('{tileId}', id))).filter(Boolean);
      if (activeTiles.length === 0) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      videoElements.length = 0;
      imageElements.length = 0;
      let totalPercent = 0;
      let completedTilesCount = 0;

      for (let idx = 0; idx < activeTiles.length; idx++) {
        const tile = activeTiles[idx];
        const vids = Array.from(tile.querySelectorAll('video'));
        const imgs = Array.from(tile.querySelectorAll('img'));
        const isRendering = StatusTracker.isTileRendering(tile);
        const isComplete = StatusTracker.isTileComplete(tile, isVideoMode);

        if (isComplete) {
          completedTilesCount++;
          if (isVideoMode) videoElements.push(...vids);
          else imageElements.push(...imgs);
          totalPercent += 100;
        } else if (isRendering) {
          const innerDivs = Array.from(tile.querySelectorAll('div'));
          const pctDiv = innerDivs.find(d => /^\d+%$/.test((d.textContent ?? '').trim()));
          const pctVal = pctDiv ? parseInt(pctDiv.textContent.trim(), 10) : 10;
          totalPercent += pctVal;
        } else {
          totalPercent += 0;
        }
      }

      const avgPercent = Math.round(totalPercent / activeTiles.length);
      const readyResources = isVideoMode ? videoElements : imageElements;

      this.reportProgress({
        promptIndex: item.promptIndex,
        percentage: completedTilesCount >= targetCount ? 100 : avgPercent,
        status: completedTilesCount >= targetCount ? 'completed' : 'generating',
        prompt: item.prompt
      });

      if (completedTilesCount >= targetCount && readyResources.length >= targetCount) {
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
    const quality = item.autoDownloadResourceQuality || '1080p';

    await chrome.runtime.sendMessage({
      type: ACTIONS.SET_DOWNLOAD_ROUTING,
      folderName: folder,
      prefix,
      autoChangeFileName: item.autoChangeFileName !== false
    });

    const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');

    Logger.info(`⬇️ [Downloading] Quality: ${quality.toUpperCase()} for ${tileIds.length} tile(s)...`);
    this.reportProgress({
      promptIndex: item.promptIndex,
      percentage: 100,
      status: 'downloading',
      prompt: item.prompt
    });

    if (quality !== 'default' && isVideo) {
      for (let i = 0; i < tileIds.length; i++) {
        if (isCancelled()) return { success: false };
        const tid = tileIds[i];

        const tileEl = DOMQueryEngine.queryFirst(`div[data-tile-id="${tid}"]`);
        const vidBtn = DOMQueryEngine.queryFirst(`div[data-tile-id="${tid}"] button:has(video)`);
        if (tileEl) {
          tileEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, composed: true }));
          tileEl.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
        }
        if (vidBtn) {
          vidBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, composed: true }));
          vidBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
        }
        await new Promise(r => setTimeout(r, 400));

        const menuBtnSel = sel.tileMenuButtonTemplate.replace('{tileId}', tid);
        let menuBtn = await DOMQueryEngine.waitForElement(menuBtnSel, 3000);
        if (!menuBtn && tileEl) {
          menuBtn = DOMQueryEngine.queryFirst('button:has(i:contains("more_vert")), button:has(i:contains("more_horiz")), button[aria-haspopup="menu"]', tileEl);
        }

        if (menuBtn) {
          await DOMQueryEngine.simulateClickElement(menuBtn, `Tile ${i + 1} options menu`);
          await new Promise(r => setTimeout(r, 500));

          let qualitySel = sel.quality1080Option;
          if (quality === '4k') qualitySel = sel.quality4KOption;
          else if (quality === '2k') qualitySel = sel.quality2KOption;
          else if (quality === '720p') qualitySel = sel.quality720Option;
          else if (quality === 'gif') qualitySel = sel.qualityGifOption;

          const opt = await DOMQueryEngine.waitForElement(qualitySel, 2500);
          if (opt && !opt.hasAttribute('disabled') && opt.getAttribute('aria-disabled') !== 'true') {
            await DOMQueryEngine.simulateClickElement(opt, `Quality ${quality}`);
            Logger.info(`🔼 [Upscaling] Tile ${i + 1}: ${quality.toUpperCase()} download requested`);

            if (quality === 'gif') {
              await StatusTracker.waitForGif(isCancelled, isPaused);
            } else {
              await StatusTracker.waitForUpscale(isCancelled, isPaused);
            }
            await new Promise(r => setTimeout(r, 1000));
            continue;
          } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await new Promise(r => setTimeout(r, 300));
          }
        }

        const src = resources[i]?.src;
        if (src) {
          const sfx = suffixes[i] ?? `_${i + 1}`;
          const filename = `${item.promptIndex}_${cleanPromptName}${tileIds.length > 1 ? `_${sfx}` : ''}.mp4`;
          await chrome.runtime.sendMessage({
            type: ACTIONS.DOWNLOAD_MEDIA,
            url: src,
            filename,
            folder,
            autoChangeFileName: item.autoChangeFileName !== false
          });
        }
      }
    } else {
      for (let i = 0; i < resources.length; i++) {
        if (isCancelled()) return { success: false };
        const src = resources[i].src;
        if (!src) continue;

        const sfx = suffixes[i] ?? `_${i + 1}`;
        const ext = isVideo ? 'mp4' : 'png';
        const filename = `${item.promptIndex}_${cleanPromptName}${resources.length > 1 ? `_${sfx}` : ''}.${ext}`;

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

    const saveStart = Date.now();
    for (let poll = 0; poll < 60; poll++) {
      if (Date.now() - saveStart > 30000 || isCancelled()) break;

      const status = await chrome.runtime.sendMessage({ type: ACTIONS.GET_DOWNLOAD_STATUS })
        .catch(() => ({ expected: 0, completed: 0 }));

      if (!status || status.expected === 0 || status.completed >= status.expected) {
        Logger.info('💾 [Saving] All download files verified complete on disk');
        break;
      }

      const remaining = status.expected - status.completed;
      Logger.info(`💾 [Saving] Waiting for ${remaining} file(s) to finish saving...`);
      
      this.reportProgress({
        promptIndex: item.promptIndex,
        percentage: 100,
        status: 'saving',
        prompt: item.prompt
      });

      await new Promise(r => setTimeout(r, 500));
    }

    return { success: true, downloadedCount: tileIds.length, ...extractedFrameObj };
  }

  static async executePromptItem(item, selectors, isCancelled, isPaused) {
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
      const textarea = await DOMQueryEngine.waitForElement(selectors.promptTextarea, 8000);
      if (!textarea) {
        steps[2].status = 'error';
        return { success: false, steps, error: 'Prompt editor input not found', shouldRetry: false };
      }

      await InputHandler.typePromptText(textarea, item.prompt);
      
      const wordCount = item.prompt.split(/\s+/).filter(Boolean).length;
      const reviewDelay = Math.min(1500 + wordCount * 30 + Math.floor(Math.random() * 1500), 18000);
      Logger.info(`⏳ Slow word review delay (${wordCount} words): ${(reviewDelay / 1000).toFixed(1)}s...`);
      this.reportProgress({ promptIndex: item.promptIndex, prompt: item.prompt, status: 'reviewing', percentage: 0 });
      await new Promise(r => setTimeout(r, reviewDelay));

      const preSubmitPacing = 5000 + Math.floor(Math.random() * 5001);
      Logger.info(`⏳ Human pacing delay before submit: ${(preSubmitPacing / 1000).toFixed(1)}s...`);
      this.reportProgress({ promptIndex: item.promptIndex, prompt: item.prompt, status: 'submitting', percentage: 0 });
      await new Promise(r => setTimeout(r, preSubmitPacing));

      // Locate Submit Button near composer
      let submitBtn = DOMQueryEngine.queryFirst('button[aria-disabled="false"]:has(i:contains("arrow_forward")), button[aria-disabled="false"]:has(i:contains("arrow_upward"))');
      if (!submitBtn) {
        submitBtn = DOMQueryEngine.queryFirst('button:has(i:contains("arrow_forward")), button:has(i:contains("arrow_upward")), button[type="submit"]');
      }

      if (!submitBtn) {
        Logger.error(`❌ Submit button not found near prompt editor!`);
        steps[2].status = 'error';
        return {
          success: false,
          steps,
          error: 'Submit button not found near prompt editor.',
          shouldRetry: false
        };
      }

      let isDisabled = submitBtn.getAttribute('aria-disabled') === 'true' || submitBtn.hasAttribute('disabled');
      if (isDisabled) {
        Logger.info('⏳ Submit button initially disabled — waiting 4s for React state to register input & model...');
        for (let wait = 0; wait < 8; wait++) {
          await new Promise(r => setTimeout(r, 500));
          isDisabled = submitBtn.getAttribute('aria-disabled') === 'true' || submitBtn.hasAttribute('disabled');
          if (!isDisabled) break;
        }
      }

      // Extension triggers CDP submit click
      Logger.info('🚀 [Submitting] Extension is automatically clicking submit button via CDP...');
      const cdpRes = await InputHandler.submitFormCDP();
      await new Promise(r => setTimeout(r, 1200));

      if (isDisabled && (!cdpRes || !cdpRes.success)) {
        Logger.error(`❌ Submit button remained disabled! (Selected model "${item.model}" is not permitted for your account)`);
        steps[2].status = 'error';
        return {
          success: false,
          steps,
          error: `Submit button is disabled for Model "${item.model}". Extension cannot submit. Please ensure "Veo 3.1 Lower Priority" or an accessible model is selected.`,
          shouldRetry: false
        };
      }

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
