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
    this.previousOutput = null; // Video Chainer state
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

      // Pass previous video end-frame output for video chaining if available
      if (this.previousOutput && item.fallbackLevel !== 2) {
        item.outputPreviousPrompt = this.previousOutput;
      } else if (item.fallbackLevel === 2) {
        // Fallback 2: Clear image to bypass policy!
        item.outputPreviousPrompt = undefined;
        item.images = []; 
      }

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

        // Update Video Chainer state for next prompt in queue
        if (result.outputPreviousPrompt) {
          this.previousOutput = result.outputPreviousPrompt;
          Logger.info('🎞️ Video Chainer: Stored video end-frame for next prompt');
        } else {
          this.previousOutput = null;
        }

        Logger.info(`✅ Prompt ${item.promptIndex}/${this.payloads.length} completed successfully`);

        // Handle prompt delay pacing matching user configuration & original extension
        if (i < this.payloads.length - 1 && !this.isCancelling) {
          const minDelay = item.promptDelaySecondsMin ?? 5;
          const maxDelay = item.promptDelaySecondsMax ?? 10;
          const delaySec = Math.floor(minDelay + Math.random() * (maxDelay - minDelay + 1));
          Logger.info(`⏳ Human pacing delay: Waiting ${delaySec}s before next prompt...`);
          
          const delayEnd = Date.now() + (delaySec * 1000);
          while (Date.now() < delayEnd) {
            if (this.isCancelling) break;
            while (this.isPaused && !this.isCancelling) {
              await new Promise(r => setTimeout(r, 300));
            }
            await new Promise(r => setTimeout(r, 500));
          }
        }
      } else {
        Logger.warn(`⚠️ Prompt execution did not complete cleanly: ${result.error || 'Unknown'}`);
        this.results.push({ index: i, promptIndex: item.promptIndex, success: false, error: result.error });
      }

      this.sendStatusUpdate();
    }

    if (this.isCancelling) {
      this.status = 'cancelled';
    } else if (this.completedIndexes.size > 0) {
      this.status = 'completed';
    } else {
      this.status = 'failed';
    }
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

      // Forward status to Python bridge if running an automated job
      if (this.id) {
        fetch('http://127.0.0.1:8102/api/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: this.id,
            status: this.status,
            completedCount: this.completedIndexes.size,
            totalCount: this.payloads.length
          })
        }).catch(() => {});
      }
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

// ═══════════════════════════════════════════════════════════════════
// PYTHON BRIDGE LIVE PROMPT INJECTOR & TAB HEARTBEAT
// ═══════════════════════════════════════════════════════════════════
let lastProcessedJobId = null;

// Send heartbeat to Python Bridge so Python knows Google Flow tab is 100% active and connected
function sendTabHeartbeat() {
  fetch('http://127.0.0.1:8102/api/tab_ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: window.location.href,
      title: document.title,
      isWorkspace: window.location.href.includes('/project/') || !!document.querySelector('[role="textbox"]'),
      status: activeBatchTask ? activeBatchTask.status : 'idle'
    })
  }).catch(() => {});
}
setInterval(sendTabHeartbeat, 2000);
sendTabHeartbeat();

async function checkPythonBridge() {
  if (activeBatchTask && activeBatchTask.status === 'running') {
    return;
  }

  try {
    const res = await fetch('http://127.0.0.1:8102/api/pending_prompt', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return;

    const data = await res.json();
    if (data && data.status === 'pending' && data.job_id && data.job_id !== lastProcessedJobId) {
      lastProcessedJobId = data.job_id;
      Logger.info(`⚡ [Python Bridge] Received pending prompt job: ${data.job_id}`);

      // Notify Python server that the job was picked up
      fetch('http://127.0.0.1:8102/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: data.job_id, status: 'started' })
      }).catch(() => {});

      const config = await chrome.runtime.sendMessage({ type: ACTIONS.GET_CONFIG });
      const selectors = config?.selectors ?? {};

      const payload = {
        promptIndex: 1,
        prompt: data.prompt,
        moderatePrompt: data.moderatePrompt,
        softPrompt: data.softPrompt,
        mode: data.mode || 'textToVideo',
        aspectRatio: data.aspectRatio || '9:16',
        outputCount: data.outputCount || 1,
        model: data.model || 'Veo 3.1 Lower Priority',
        duration: data.duration || '8s',
        omniFlashDuration: data.omniFlashDuration || 8,
        isConcat: false,
        images: data.images || [],
        folderName: data.folderName || 'FlowCraft_Outputs',
        filePrefix: data.filePrefix || '',
        autoDownloadResourceQuality: data.quality || '1080p',
        autoChangeFileName: true
      };

      const groupData = {
        id: data.job_id,
        payloads: [payload]
      };

      activeBatchTask = new BatchRunner(groupData);
      activeBatchTask.run(selectors).then(() => {
        const isSuccess = activeBatchTask.status === 'completed';
        Logger.info(`🎉 [Python Bridge] Job ${data.job_id} finished execution with status: ${activeBatchTask.status}`);
        if (isSuccess) {
          fetch('http://127.0.0.1:8102/api/completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: data.job_id, status: 'completed' })
          }).catch(() => {});
        } else {
          fetch('http://127.0.0.1:8102/api/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: data.job_id, status: 'failed', error: 'Prompt execution did not complete cleanly' })
          }).catch(() => {});
        }
      }).catch(err => {
        Logger.error(`❌ [Python Bridge] Job ${data.job_id} failed:`, err);
        fetch('http://127.0.0.1:8102/api/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: data.job_id, status: 'error', error: err.message })
        }).catch(() => {});
      });
    }
  } catch (err) {
    Logger.error('❌ [Python Bridge Poller Error]', err);
  }
}

// Start background poller for Python bridge
setInterval(checkPythonBridge, 2000);

Logger.info('FlowCraft content script initialized on Google Labs with Python Bridge and Heartbeat active');
