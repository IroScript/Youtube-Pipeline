/**
 * Idempotent Reconciliation Engine for FlowCraft AI Studio
 * Inspects observable UI, canvas tiles, and local filesystem before taking any mutation action to prevent duplicate submits and duplicate renders.
 */

import { StatusTracker } from './status-tracker.js';
import { DOMQueryEngine } from './dom-query.js';
import { CheckpointManager } from '../utils/checkpoint-manager.js';
import { Logger } from '../utils/logger.js';

export class Reconciler {
  /**
   * Validates browser environment and prevents blind clicks on corrupted / wrong pages.
   */
  static validatePageEnvironment() {
    try {
      const url = typeof window !== 'undefined' && window.location ? window.location.href : '';
      if (!url.includes('/project/') && !url.includes('/fx/tools/flow')) {
        return {
          valid: false,
          reason: `WRONG_PAGE: Current URL (${url}) is not a Google Flow project workspace`
        };
      }
      if (typeof document === 'undefined' || !document.body) {
        return {
          valid: false,
          reason: 'STALE_DOM: Document body is unmounted or missing'
        };
      }
      return { valid: true };
    } catch (e) {
      return { valid: false, reason: `EXCEPTION: ${e.message}` };
    }
  }

  /**
   * Reconciles job against current live UI and cached checkpoints.
   * @param {object} item Prompt item / job configuration
   * @param {object} checkpoint Last known checkpoint (if any)
   * @returns {object} Action verdict: { action, tileId, element, reason }
   */
  static async reconcile(item, checkpoint = null) {
    Logger.info(`🔍 [Reconciler] Reconciling job "${item.job_id || item.promptIndex}" with live Flow UI...`);

    // 0. Safety Guard: Validate page environment before any DOM query to prevent blind clicks
    const envCheck = this.validatePageEnvironment();
    if (!envCheck.valid) {
      Logger.warn(`🛑 [Reconciler] Environment validation failed: ${envCheck.reason}`);
      return {
        action: 'PAGE_INVALID',
        reason: envCheck.reason
      };
    }

    const promptText = (item.prompt || '').trim();
    const promptHash = CheckpointManager.hashPrompt(promptText);
    const isVideoMode = (item.mode || 'textToVideo').includes('ToVideo');

    // 1. Check if video already exists on disk / completed in checkpoint
    if (checkpoint && checkpoint.video_url && checkpoint.download_status === 'completed') {
      Logger.info(`🎯 [Reconciler] Checkpoint indicates video already downloaded: ${checkpoint.filename || checkpoint.video_url}`);
      return {
        action: 'ALREADY_COMPLETED',
        videoUrl: checkpoint.video_url,
        filename: checkpoint.filename,
        reason: 'Video already downloaded and verified in checkpoint'
      };
    }

    // 2. Query all existing canvas tiles
    const allTiles = Array.from(document.querySelectorAll('[data-tile-id]'));
    Logger.info(`🔍 [Reconciler] Found ${allTiles.length} existing tile(s) on Google Flow canvas`);

    // Strategy A: Match by exact tile_id from checkpoint
    if (checkpoint && checkpoint.tile_id) {
      const matchTile = allTiles.find(t => t.getAttribute('data-tile-id') === checkpoint.tile_id);
      if (matchTile) {
        return this._evaluateTileMatch(matchTile, checkpoint.tile_id, isVideoMode, 'Exact checkpoint tile_id match');
      }
    }

    // Strategy B: Match tile by semantic content or prompt snippet
    const words = promptText.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5);
    for (const tile of allTiles) {
      const tileText = (tile.innerText || tile.textContent || '').toLowerCase();
      const tileId = tile.getAttribute('data-tile-id') || 'unknown';

      // Check if tile contains prompt snippet
      const matchesSnippet = words.length > 0 && words.filter(w => tileText.includes(w)).length >= Math.min(3, words.length);
      if (matchesSnippet) {
        return this._evaluateTileMatch(tile, tileId, isVideoMode, 'Tile text matches prompt snippet');
      }
    }

    // Strategy C: Check latest tile if created very recently (< 180 seconds ago)
    if (allTiles.length > 0 && checkpoint && (Date.now() - (checkpoint.timestamp || 0)) < 180000) {
      const newestTile = allTiles[0];
      const tileId = newestTile.getAttribute('data-tile-id') || 'unknown';
      if (StatusTracker.isTileRendering(newestTile) && (checkpoint.state === 'SUBMITTED' || checkpoint.state === 'SUBMITTING')) {
        return this._evaluateTileMatch(newestTile, tileId, isVideoMode, 'Newest tile actively rendering for recent submitted checkpoint');
      }
    }

    // Default: Not submitted or no match found
    Logger.info('✨ [Reconciler] No active or existing tile found — safe to proceed with new submission');
    return {
      action: 'PROCEED_TO_SUBMIT',
      reason: 'No existing tile matched on canvas'
    };
  }

  static _evaluateTileMatch(tile, tileId, isVideoMode, matchReason) {
    const isRendering = StatusTracker.isTileRendering(tile);
    const isComplete = StatusTracker.isTileComplete(tile, isVideoMode);

    if (isComplete) {
      Logger.info(`🏆 [Reconciler] Target tile [ID: ${tileId}] is ALREADY COMPLETE! (${matchReason}) -> Skipping generation, moving directly to download.`);
      return {
        action: 'SKIP_TO_DOWNLOAD',
        tileId: tileId,
        element: tile,
        reason: `${matchReason} — Tile is already finished generating`
      };
    }

    if (isRendering) {
      Logger.info(`⏳ [Reconciler] Target tile [ID: ${tileId}] is CURRENTLY RENDERING! (${matchReason}) -> Attaching generation watcher without duplicate submission.`);
      return {
        action: 'ATTACH_GENERATION_MONITOR',
        tileId: tileId,
        element: tile,
        reason: `${matchReason} — Tile is actively rendering`
      };
    }

    // Tile exists but has no active progress or completion (e.g. error tile)
    return {
      action: 'TILE_ERROR_OR_STALE',
      tileId: tileId,
      element: tile,
      reason: `${matchReason} — Tile exists in uncertain state`
    };
  }
}
