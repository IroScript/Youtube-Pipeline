/**
 * Download Recovery Engine for FlowCraft AI Studio
 * Manages multi-layer download strategies, file verification, and fault-tolerant retries without re-generating media.
 */

import { DOMQueryEngine } from './dom-query.js';
import { Logger } from '../utils/logger.js';
import { ACTIONS } from '../utils/constants.js';
import { CheckpointManager } from '../utils/checkpoint-manager.js';
import { JOB_STATES } from '../utils/state-machine.js';

export class DownloadRecoveryEngine {
  /**
   * Validates downloaded file integrity: rejects 0-byte, partial (.crdownload/.part), and corrupted files.
   */
  static validateDownloadIntegrity(fileInfo) {
    if (!fileInfo) return { valid: false, reason: 'NO_FILE_INFO' };
    if (fileInfo.size !== undefined && fileInfo.size <= 0) {
      return { valid: false, reason: 'ZERO_BYTE_FILE' };
    }
    const name = fileInfo.filename || fileInfo.name || '';
    if (name.endsWith('.crdownload') || name.endsWith('.part') || name.endsWith('.tmp')) {
      return { valid: false, reason: 'PARTIAL_DOWNLOAD_INCOMPLETE' };
    }
    if (fileInfo.corrupted) {
      return { valid: false, reason: 'CORRUPTED_FILE_DATA' };
    }
    return { valid: true, filename: name };
  }

  /**
   * Executes multi-layer download pipeline for generated tile media.
   */
  static async recoverAndDownload(tileElement, item, checkpoint = null, isCancelled = () => false) {
    Logger.info(`⬇️ [Download Recovery] Initiating multi-layer download for job "${item.job_id || item.promptIndex}"...`);

    const cleanPromptName = (item.prompt || 'media')
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '')
      .substring(0, 45);

    const folder = item.folderName?.trim() || 'FlowCraft_Outputs';
    const targetFilename = `${item.promptIndex || 1}_${cleanPromptName}.mp4`;

    // Checkpoint: DOWNLOAD_STARTED
    if (checkpoint) {
      checkpoint.state = JOB_STATES.DOWNLOADING;
      checkpoint.download_status = 'downloading';
      checkpoint.last_verified_action = 'Download pipeline started';
      await CheckpointManager.saveCheckpoint(checkpoint);
    }

    // Wake up hover states
    if (tileElement) {
      tileElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, composed: true }));
      tileElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, composed: true }));
      await new Promise(r => setTimeout(r, 600));
    }

    let downloadSuccess = false;
    let streamUrl = null;

    // ── LAYER 1: Direct Video Tag Source Capture & Dual-Route Download ──
    try {
      const vidEl = tileElement?.querySelector('video') || document.querySelector('[data-tile-id] video') || document.querySelector('video');
      const src = vidEl?.src || vidEl?.currentSrc || (vidEl?.querySelector('source')?.src);

      if (src && (src.startsWith('http') || src.startsWith('blob:'))) {
        streamUrl = src;
        Logger.info(`🎯 [Download Layer 1] Direct video stream captured: ${src.substring(0, 65)}...`);

        // Notify Python Bridge directly
        fetch('http://127.0.0.1:8102/api/video_ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_url: src,
            filename: targetFilename,
            job_id: item.job_id
          })
        }).catch(() => {});

        // Dispatch Chrome Native Download
        const resp = await chrome.runtime.sendMessage({
          type: ACTIONS.DOWNLOAD_MEDIA,
          url: src,
          filename: targetFilename,
          folder: folder,
          autoChangeFileName: true
        });

        if (resp && resp.success) {
          Logger.info(`✅ [Download Layer 1] Chrome download manager dispatched successfully`);
          downloadSuccess = true;
        }
      }
    } catch (e) {
      Logger.warn(`⚠️ [Download Layer 1] Stream capture notice: ${e.message}`);
    }

    // ── LAYER 2: Direct Tile Download Button Click ──
    if (!downloadSuccess && tileElement) {
      Logger.info(`💾 [Download Layer 2] Attempting direct download button on tile...`);
      const directDlBtn = tileElement.querySelector('button:has(i:contains("download")), button[aria-label*="Download"]');
      if (directDlBtn && !directDlBtn.hasAttribute('disabled')) {
        try {
          directDlBtn.click();
          await DOMQueryEngine.simulateClickElement(directDlBtn, 'Tile Download Button');
          downloadSuccess = true;
          Logger.info(`✅ [Download Layer 2] Direct download button triggered`);
        } catch {}
      }
    }

    // ── LAYER 3: 3-Dot Dropdown Menu Options ──
    if (!downloadSuccess && tileElement) {
      Logger.info(`💾 [Download Layer 3] Opening 3-dot dropdown menu for download option...`);
      const menuBtn = tileElement.querySelector('button:has(i:contains("more_vert")), button:has(i:contains("more_horiz")), button[aria-haspopup="menu"]');
      if (menuBtn) {
        try {
          menuBtn.click();
          await DOMQueryEngine.simulateClickElement(menuBtn, 'Tile Menu');
          await new Promise(r => setTimeout(r, 600));

          const menuItems = Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"], [role="menu"] button, div[role="menu"] *'));
          const dlItem = menuItems.find(o => {
            const t = (o.textContent || '').toLowerCase();
            return t.includes('download') || t.includes('1080') || t.includes('save') || !!o.querySelector('i:contains("download")');
          });

          if (dlItem && !dlItem.hasAttribute('disabled')) {
            dlItem.click();
            await DOMQueryEngine.simulateClickElement(dlItem, 'Dropdown Download Item');
            downloadSuccess = true;
            Logger.info(`✅ [Download Layer 3] Menu item "${dlItem.textContent?.trim()}" triggered`);
          } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
        } catch {}
      }
    }

    if (downloadSuccess || streamUrl) {
      // Checkpoint: VERIFYING / COMPLETED
      if (checkpoint) {
        checkpoint.state = JOB_STATES.VERIFYING;
        checkpoint.download_status = 'completed';
        checkpoint.video_url = streamUrl;
        checkpoint.filename = targetFilename;
        checkpoint.last_verified_action = 'Video stream routed to downloader';
        await CheckpointManager.saveCheckpoint(checkpoint);
      }
      return {
        success: true,
        videoUrl: streamUrl,
        filename: targetFilename
      };
    }

    // Download failed but generation remains intact!
    if (checkpoint) {
      checkpoint.state = JOB_STATES.DOWNLOAD_FAILED;
      checkpoint.download_status = 'failed';
      checkpoint.last_verified_action = 'Download layers failed to trigger';
      await CheckpointManager.saveCheckpoint(checkpoint);
    }

    return {
      success: false,
      error: 'All download layers failed to capture or trigger video download'
    };
  }
}
