/**
 * FlowCraft Content Script Entry Point
 */
import { ACTIONS } from '../utils/constants.js';
import { ExecutionEngine } from './execution-engine.js';
import { Logger } from '../utils/logger.js';

let activeBatchTask = null;

class BatchRunner {
  constructor(groupData) {
    this.id = groupData.id || `batch_${Date.now()}`;
    this.payloads = groupData.payloads || [];
    this.completedIndexes = new Set(groupData.completedIndexes || []);
    this.currentPromptIndex = groupData.failedFromIndex || 0;
    this.status = 'running';
    this.isCancelling = false;
    this.isPaused = false;
    this.results = [];
  }

  async run(selectors) {
    Logger.info(`🚀 Starting batch runner [ID: ${this.id}] with ${this.payloads.length} prompt(s)...`);

    for (let i = this.currentPromptIndex; i < this.payloads.length; i++) {
      if (this.isCancelling) {
        this.status = 'cancelled';
        Logger.info('🛑 Batch task cancelled by user');
        break;
      }

      while (this.isPaused && !this.isCancelling) {
        this.status = 'paused';
        this.sendStatusUpdate();
        await new Promise(r => setTimeout(r, 500));
      }

      if (this.completedIndexes.has(i)) continue;

      const item = this.payloads[i];
      item.promptIndex = item.promptIndex ?? (i + 1);
      this.currentPromptIndex = i;

      this.status = 'running';
      this.sendStatusUpdate();

      // Execute automation pipeline for single prompt
      const result = await ExecutionEngine.executePromptItem(
        item,
        selectors,
        () => this.isCancelling,
        () => this.isPaused
      );

      if (result.success) {
        this.completedIndexes.add(i);
        this.results.push({ index: i, promptIndex: item.promptIndex, success: true });
        Logger.info(`✅ Prompt ${item.promptIndex}/${this.payloads.length} completed successfully`);

        // Handle prompt delay pacing
        if (i < this.payloads.length - 1 && !this.isCancelling) {
          const minDelay = item.promptDelaySecondsMin ?? 5;
          const maxDelay = item.promptDelaySecondsMax ?? 10;
          const delaySec = Math.floor(minDelay + Math.random() * (maxDelay - minDelay + 1));
          Logger.info(`⏳ Delaying ${delaySec}s before next prompt...`);
          await new Promise(r => setTimeout(r, delaySec * 1000));
        }
      } else {
        this.results.push({ index: i, promptIndex: item.promptIndex, success: false, error: result.error });
        Logger.warn(`⚠️ Prompt ${item.promptIndex} failed: ${result.error}`);
        if (!result.shouldRetry) {
          this.completedIndexes.add(i);
        }
      }

      this.sendStatusUpdate();
    }

    this.status = this.isCancelling ? 'cancelled' : 'completed';
    this.sendStatusUpdate();
    activeBatchTask = null;
  }

  sendStatusUpdate() {
    try {
      chrome.runtime.sendMessage({
        type: ACTIONS.BATCH_STATUS,
        data: {
          id: this.id,
          status: this.status,
          currentPromptIndex: this.currentPromptIndex,
          totalCount: this.payloads.length,
          completedCount: this.completedIndexes.size,
          isPaused: this.isPaused,
          isCancelling: this.isCancelling,
          results: this.results
        }
      }).catch(() => {});
    } catch {}
  }
}

// Listen for messages from SidePanel / Background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_BATCH_RUN': {
      if (activeBatchTask && activeBatchTask.status === 'running') {
        sendResponse({ success: false, error: 'A batch run is already active' });
        break;
      }

      chrome.runtime.sendMessage({ type: ACTIONS.GET_CONFIG }).then((config) => {
        const selectors = config?.selectors ?? {};
        activeBatchTask = new BatchRunner(message.groupData);
        activeBatchTask.run(selectors);
        sendResponse({ success: true, taskId: activeBatchTask.id });
      });
      return true;
    }

    case 'PAUSE_BATCH_RUN': {
      if (activeBatchTask) {
        activeBatchTask.isPaused = true;
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No active task to pause' });
      }
      break;
    }

    case 'RESUME_BATCH_RUN': {
      if (activeBatchTask) {
        activeBatchTask.isPaused = false;
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No active task to resume' });
      }
      break;
    }

    case 'CANCEL_BATCH_RUN': {
      if (activeBatchTask) {
        activeBatchTask.isCancelling = true;
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No active task to cancel' });
      }
      break;
    }

    default:
      break;
  }
  return false;
});

Logger.info('FlowCraft content script initialized on Google Labs');
