/**
 * FlowCraft Status Tracker Module
 */
import { DOMQueryEngine } from './dom-query.js';

export class StatusTracker {
  /**
   * Checks if a tile element is still actively rendering (% progress visible or queued)
   */
  static isTileRendering(tileElement) {
    if (!tileElement) return false;
    const innerDivs = Array.from(tileElement.querySelectorAll('div'));
    
    // Check for progress percentage text (e.g., "15%", "65%")
    const hasPercent = innerDivs.some(d => /^\d+%$/.test((d.textContent ?? '').trim()));
    
    // Check for status keywords
    const text = (tileElement.textContent ?? '').toLowerCase();
    const isQueuedOrWorking = text.includes('queued') || text.includes('working on your request') || text.includes('generating');

    return hasPercent || isQueuedOrWorking;
  }

  /**
   * Checks if a tile element has completed video/image generation
   */
  static isTileComplete(tileElement, isVideoMode) {
    if (!tileElement) return false;

    // If still rendering or queued, it is NOT complete!
    if (this.isTileRendering(tileElement)) {
      return false;
    }

    const vids = tileElement.querySelectorAll('video');
    const imgs = tileElement.querySelectorAll('img');
    const hasMedia = isVideoMode ? vids.length > 0 : imgs.length > 0;
    
    // Safe DOM query using DOMQueryEngine for pseudo-selectors
    const hasDownloadBtn = DOMQueryEngine.queryAll(
      'button:has(i:contains("download")), button:has(i:contains("more_vert")), button:has(i:contains("more_horiz")), button[aria-haspopup="menu"]',
      tileElement
    ).length > 0;

    return hasMedia || hasDownloadBtn;
  }

  static checkUpscaleTextState() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? '').trim();
      if (text) {
        if (text.includes('Upscaling complete') || text.includes('has been downloaded')) {
          return 'complete';
        }
        if (/upscaling failed/i.test(text)) {
          return 'failed';
        }
        if (text.includes('Upscaling your image') || text.includes('Upscaling your video') || text.includes('download will start automatically')) {
          return 'in_progress';
        }
      }
    }
    return null;
  }

  static async waitForUpscale(isCancelled, isPaused, timeoutMs = 90000) {
    let deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (isCancelled()) return 'timeout';
      if (isPaused?.()) {
        await new Promise(r => setTimeout(r, 150));
        deadline += 150;
        continue;
      }
      const state = this.checkUpscaleTextState();
      if (state === 'complete') return 'complete';
      if (state === 'failed') return 'failed';
      if (state === 'in_progress') break;
      await new Promise(r => setTimeout(r, 300));
    }

    if (this.checkUpscaleTextState() === null) {
      return 'not_found';
    }

    let mainDeadline = Date.now() + timeoutMs;
    while (Date.now() < mainDeadline) {
      if (isCancelled()) return 'timeout';
      if (isPaused?.()) {
        await new Promise(r => setTimeout(r, 150));
        mainDeadline += 150;
        continue;
      }
      const state = this.checkUpscaleTextState();
      if (state === 'complete') return 'complete';
      if (state === 'failed') return 'failed';
      if (state === null) return 'complete';
      await new Promise(r => setTimeout(r, 500));
    }
    return 'timeout';
  }

  static checkGifTextState() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? '').trim();
      if (text) {
        if (text.includes('GIF generated')) return 'complete';
        if (text.includes('Working on your request')) return 'in_progress';
        if (/gif.*fail|fail.*gif|something went wrong/i.test(text)) return 'failed';
      }
    }
    return null;
  }

  static async waitForGif(isCancelled, isPaused) {
    const initDeadline = Date.now() + 5000;
    while (Date.now() < initDeadline) {
      if (isCancelled()) return { status: 'timeout' };
      if (isPaused?.()) {
        await new Promise(r => setTimeout(r, 150));
        continue;
      }
      if (this.checkGifTextState() !== null) break;
      await new Promise(r => setTimeout(r, 300));
    }

    if (this.checkGifTextState() === null) {
      return { status: 'not_found' };
    }

    const mainDeadline = Date.now() + 120000;
    while (Date.now() < mainDeadline) {
      if (isCancelled()) return { status: 'timeout' };
      if (isPaused?.()) {
        await new Promise(r => setTimeout(r, 150));
        continue;
      }
      const state = this.checkGifTextState();
      if (state === 'complete') {
        const downloadAnchor = Array.from(document.querySelectorAll('a')).find(a => (a.textContent ?? '').trim() === 'Download');
        if (downloadAnchor) downloadAnchor.click();
        const gifUrl = downloadAnchor?.href;
        return {
          status: 'complete',
          gifUrl: gifUrl && gifUrl !== location.href ? gifUrl : undefined
        };
      }
      if (state === 'failed') return { status: 'failed' };
      await new Promise(r => setTimeout(r, 500));
    }
    return { status: 'timeout' };
  }
}
