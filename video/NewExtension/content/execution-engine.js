/**
 * FlowCraft Execution Engine - Master automation pipeline for Google Labs / Google Flow
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
    // Cookie banner
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      if (DOMQueryEngine.isVisible(b) && !b.closest('[role="dialog"]') && (b.textContent ?? '').trim() === 'Agree') {
        Logger.info('🍪 Cookie banner detected — clicking Agree');
        b.click();
        await new Promise(r => setTimeout(r, 800));
        return;
      }
    }

    // Consent dialog
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
        // If create project button isn't visible, but we are on Google Flow, proceed anyway
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
        return;
      }
    }
    Logger.warn(`Aspect ratio ${aspectRatio} selector strategy not found`);
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

      // Handle video-to-video chaining frame injection if available
      if (item.outputPreviousPrompt?.extractedFrame) {
        item.mode = 'imageToVideo';
        item.images = item.images ?? [];
        item.images.unshift({
          base64: item.outputPreviousPrompt.extractedFrame,
          name: `extracted-frame-${Date.now()}.jpg`
        });
        Logger.info('✅ Previous video frame injected as start frame image');
      }

      if (await checkState()) return false;

      if (!await DOMQueryEngine.waitForElement(sel.configButton, 3000)) {
        Logger.warn('Config button not found — using default page configuration');
        return true;
      }

      await DOMQueryEngine.simulateClick(sel.configButton, 'Open config panel');
      if (!await DOMQueryEngine.waitForElement(sel.selectVideoMode, 3000)) {
        Logger.warn('Video mode button missing — closing config panel');
        await DOMQueryEngine.simulateClick(sel.configButton, 'Close config panel');
        return true;
      }

      await DOMQueryEngine.simulateClick(sel.selectVideoMode, 'Select video mode');

      if (item.mode === 'textToVideo') {
        await DOMQueryEngine.simulateClick(sel.textToVideoModeOption, 'Text-to-Video mode');
      } else if (item.mode === 'imageToVideo') {
        await DOMQueryEngine.simulateClick(sel.imageToVideoModeOption, 'Image-to-Video mode');
      } else if (item.mode === 'componentsToVideo') {
        await DOMQueryEngine.simulateClick(sel.componentToVideoModeOption, 'Ingredients mode');
        await new Promise(r => setTimeout(r, 300));
      }

      await this.configureAspectRatios(sel, item.aspectRatio);

      // Output count
      const countLabel = item.outputCount === 1 ? '1x' : `x${item.outputCount}`;
      const countSel = sel.outputCountTemplate.replace('{outputCount}', countLabel);
      if (await DOMQueryEngine.waitForElement(countSel, 3000)) {
        await DOMQueryEngine.simulateClick(countSel, `Count ${countLabel}`);
      }

      // Model selection
      await DOMQueryEngine.simulateClick(sel.modelSelectButton, 'Open model dropdown');
      const modelSel = sel.modelTemplate.replace('{model}', item.model);
      if (await DOMQueryEngine.waitForElement(modelSel, 2500)) {
        await DOMQueryEngine.simulateClick(modelSel, `Model ${item.model}`);
      } else {
        // Fallback search for model variants (e.g., "Veo 3.1", "Lower Priority", "3.1")
        const menuButtons = DOMQueryEngine.queryAll('div[role="menu"] button');
        let matchedBtn = menuButtons.find(b => (b.textContent ?? '').includes(item.model));
        if (!matchedBtn && item.model.includes('3.1')) {
          matchedBtn = menuButtons.find(b => (b.textContent ?? '').includes('3.1'));
        }
        if (!matchedBtn && item.model.toLowerCase().includes('lower')) {
          matchedBtn = menuButtons.find(b => (b.textContent ?? '').toLowerCase().includes('lower'));
        }
        if (matchedBtn) {
          matchedBtn.click();
          await new Promise(r => setTimeout(r, 300));
          Logger.info(`✅ Model selected via fallback matcher: ${matchedBtn.textContent?.trim()}`);
        } else {
          Logger.warn(`Model "${item.model}" not found in dropdown options`);
        }
      }

      // Omni Flash Duration
      if (item.model === 'Omni Flash' && item.omniFlashDuration) {
        if (await checkState()) return false;
        const durLabel = `${item.omniFlashDuration}s`;
        if (await DOMQueryEngine.waitForElement('button.flow_tab_slider_trigger', 4000)) {
          const triggers = DOMQueryEngine.queryAll('button.flow_tab_slider_trigger');
          const durBtn = triggers.find(b => (b.textContent ?? '').trim() === durLabel);
          if (durBtn) {
            durBtn.click();
            await new Promise(r => setTimeout(r, 300));
            Logger.info(`✅ Omni Flash duration set to ${durLabel}`);
          }
        }
      }

      await DOMQueryEngine.simulateClick(sel.configButtonActived, 'Close config panel');

      if (await checkState()) return false;

      // Upload reference images
      if (item.images && item.images.length > 0) {
        for (let i = 0; i < item.images.length; i++) {
          if (await checkState()) return false;
          Logger.info(`Uploading image ${i + 1}/${item.images.length}...`);
          this.reportProgress({
            promptIndex: item.promptIndex,
            percentage: 0,
            status: 'uploading',
            prompt: item.prompt,
            uploadIndex: i + 1,
            uploadTotal: item.images.length
          });

          await MediaUploader.uploadBase64Image(item.images[i], i, sel, isCancelled, isPaused);
        }
      }

      return true;
    } catch (err) {
      Logger.error('Error in configureVideoSettings:', err);
      return false;
    }
  }

  static async locateTileIds(outputCount, mode, selectors, isCancelled) {
    const sel = selectors;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (isCancelled()) return { success: false, tileIds: [] };

      let tiles = DOMQueryEngine.queryAll(sel.outputItems);
      if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]:has(div)');
      if (tiles.length === 0) tiles = DOMQueryEngine.queryAll('[data-tile-id]');

      if (tiles.length > 0) {
        const ids = [];
        tiles.forEach(t => {
          const tid = t.getAttribute('data-tile-id');
          if (tid) ids.push(tid);
        });

        const unique = [...new Set(ids)];
        const count = mode === 'agent' ? Math.min(unique.length, 4) : Math.min(unique.length, outputCount);
        const targetIds = unique.slice(0, count);

        if (targetIds.length > 0) {
          return { success: true, tileIds: targetIds };
        }
      }

      if (attempt % 10 === 0) {
        Logger.info(`⏳ Waiting for output tiles... attempt ${attempt + 1}/120`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return { success: false, tileIds: [] };
  }

  static async pollGenerationStatus(tileIds, item, selectors, isCancelled, isPaused) {
    const sel = selectors;
    const targetCount = item.mode === 'agent' ? tileIds.length : item.outputCount;

    Logger.info('⚡ Letting generation settle for 25s before initial progress poll...');
    const settleEnd = Date.now() + 25000;

    while (Date.now() < settleEnd) {
      if (isCancelled()) return { success: false, resourceElements: [], tileIdsError: [] };
      while (isPaused?.() && !isCancelled?.()) {
        await new Promise(r => setTimeout(r, 300));
      }

      const foundTiles = tileIds.map(id => DOMQueryEngine.queryFirst(sel.tileByIdTemplate.replace('{tileId}', id))).filter(Boolean);
      if (foundTiles.length > 0) {
        const readyTiles = foundTiles.filter(t => t.querySelectorAll('video, img').length > 0 || DOMQueryEngine.queryAll(sel.downloadButtonInTile, t).length > 0);
        if (readyTiles.length >= Math.min(targetCount, foundTiles.length)) {
          Logger.info('⚡ Generation finished early during settle phase!');
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

      await new Promise(r => setTimeout(r, 500));
    }

    const isVideoMode = item.mode.includes('ToVideo');
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

      for (let idx = 0; idx < activeTiles.length; idx++) {
        const tile = activeTiles[idx];
        const vids = Array.from(tile.querySelectorAll('video'));
        const imgs = Array.from(tile.querySelectorAll('img'));

        if (vids.length || imgs.length) {
          if (isVideoMode) videoElements.push(...vids);
          else imageElements.push(...imgs);
          totalPercent += 100;
        } else {
          totalPercent += 0;
        }
      }

      const avgPercent = Math.round(totalPercent / activeTiles.length);
      const readyResources = isVideoMode ? videoElements : imageElements;

      this.reportProgress({
        promptIndex: item.promptIndex,
        percentage: readyResources.length >= targetCount ? 100 : avgPercent,
        status: readyResources.length >= targetCount ? 'completed' : 'generating',
        prompt: item.prompt
      });

      if (readyResources.length >= targetCount) {
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

    return { success: false, resourceElements: [], tileIdsError: [] };
  }

  static async downloadTileMedia(tileIds, item, resultData, selectors, isCancelled, isPaused) {
    if (item.autoDownloadResourceQuality === 'no-download') {
      Logger.info(`📥 Skipping auto-download for prompt index ${item.promptIndex} (no-download configured)`);
      return { success: true, downloadedCount: 0 };
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

    const resources = resultData.resourceElements;
    const isVideo = item.mode.includes('ToVideo');
    const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');

    Logger.info(`⬇️ [Downloading] ${resources.length} media resource(s) for prompt ${item.promptIndex}...`);
    this.reportProgress({
      promptIndex: item.promptIndex,
      percentage: 100,
      status: 'downloading',
      prompt: item.prompt
    });

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
        } else {
          Logger.warn(`Download failed for resource ${i + 1}: ${resp?.error}`);
        }
      } catch (err) {
        Logger.error(`Error initiating download for resource ${i + 1}:`, err);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    // Video chaining end frame extraction if requested
    let extractedFrameObj = {};
    if (item.isConcat && isVideo) {
      const frameData = await VideoChainer.captureLastVideoFrame(resources);
      if (frameData) {
        extractedFrameObj = { extractedFrame: frameData };
      }
    }

    return { success: true, downloadedCount: resources.length, ...extractedFrameObj };
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

      // Step 2: Settings configuration
      steps[1].status = 'running';
      if (item.mode.includes('ToVideo')) {
        await this.configureVideoSettings(item, isCancelled, isPaused, selectors);
      }
      steps[1].status = 'completed';

      if (isCancelled()) return { success: false, cancelled: true, steps };

      // Step 3: Fill & submit prompt
      steps[2].status = 'running';
      Logger.info('📝 Injecting prompt into editor...');
      const textarea = await DOMQueryEngine.waitForElement(selectors.promptTextarea, 8000);
      if (!textarea) {
        steps[2].status = 'error';
        return { success: false, steps, error: 'Prompt editor input not found', shouldRetry: true };
      }

      await InputHandler.typePromptText(textarea, item.prompt);
      await new Promise(r => setTimeout(r, 500));

      const submitBtn = await DOMQueryEngine.waitForElement('button[aria-disabled="false"]:has(i:contains("arrow_forward"))', 8000);
      if (!submitBtn) {
        Logger.warn('Submit button not active after prompt entry');
        steps[2].status = 'error';
        return { success: false, steps, error: 'Submit button not enabled', shouldRetry: true };
      }

      await InputHandler.submitFormCDP();
      steps[2].status = 'completed';

      if (isCancelled()) return { success: false, cancelled: true, steps };

      // Step 4: Locating tile IDs & monitoring generation
      steps[3].status = 'running';
      this.reportProgress({ promptIndex: item.promptIndex, prompt: item.prompt, status: 'locating', percentage: 0 });

      const tileRes = await this.locateTileIds(item.outputCount, item.mode, selectors, isCancelled);
      if (!tileRes.success) {
        steps[3].status = 'error';
        return { success: false, steps, error: 'Output tiles not located', shouldRetry: true };
      }

      const genRes = await this.pollGenerationStatus(tileRes.tileIds, item, selectors, isCancelled, isPaused);
      if (!genRes.success) {
        steps[3].status = 'error';
        return { success: false, steps, error: 'Generation failed', shouldRetry: true };
      }

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
      return { success: false, steps, error: err.message, shouldRetry: true };
    }
  }
}
