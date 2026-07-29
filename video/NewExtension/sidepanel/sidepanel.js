/**
 * FlowCraft AI Studio - SidePanel Controller
 */
import { ACTIONS, STORAGE_KEYS, DEFAULT_SETTINGS } from '../utils/constants.js';

class SidePanelApp {
  constructor() {
    this.attachedImages = [];
    this.initElements();
    this.bindEvents();
    this.loadSettings();
    this.setupMessageListener();
  }

  initElements() {
    // Navigation
    this.navBtns = document.querySelectorAll('.nav-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Form Controls
    this.promptInput = document.getElementById('promptInput');
    this.promptCountLabel = document.getElementById('promptCountLabel');
    this.modeSelect = document.getElementById('modeSelect');
    this.aspectSelect = document.getElementById('aspectSelect');
    this.outputCountSelect = document.getElementById('outputCountSelect');
    this.modelSelect = document.getElementById('modelSelect');
    this.durationSelect = document.getElementById('durationSelect');
    this.concatToggle = document.getElementById('concatToggle');

    // Image Uploads
    this.addImagesBtn = document.getElementById('addImagesBtn');
    this.imageFileInput = document.getElementById('imageFileInput');
    this.imagePreviewContainer = document.getElementById('imagePreviewContainer');

    // Downloads
    this.downloadFolder = document.getElementById('downloadFolder');
    this.filePrefix = document.getElementById('filePrefix');
    this.qualitySelect = document.getElementById('qualitySelect');
    this.autoRenameToggle = document.getElementById('autoRenameToggle');

    // Execution Controls
    this.startBatchBtn = document.getElementById('startBatchBtn');
    this.activeTaskControls = document.getElementById('activeTaskControls');
    this.pauseBatchBtn = document.getElementById('pauseBatchBtn');
    this.cancelBatchBtn = document.getElementById('cancelBatchBtn');

    // Status Card
    this.statusCard = document.getElementById('statusCard');
    this.statusBadge = document.getElementById('statusBadge');
    this.statusStep = document.getElementById('statusStep');
    this.progressBarFill = document.getElementById('progressBarFill');
    this.promptProgressLabel = document.getElementById('promptProgressLabel');
    this.percentLabel = document.getElementById('percentLabel');

    // Logs
    this.logTerminal = document.getElementById('logTerminal');
    this.clearLogsBtn = document.getElementById('clearLogsBtn');
    this.exportLogsBtn = document.getElementById('exportLogsBtn');
    this.openOptionsBtn = document.getElementById('openOptionsBtn');
  }

  bindEvents() {
    // Tab switching
    this.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this.navBtns.forEach(b => b.classList.remove('active'));
        this.tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
      });
    });

    // Prompt counting
    this.promptInput.addEventListener('input', () => this.updatePromptCount());

    // Image uploading
    this.addImagesBtn.addEventListener('click', () => this.imageFileInput.click());
    this.imageFileInput.addEventListener('change', (e) => this.handleImageSelect(e));

    // Batch Actions
    this.startBatchBtn.addEventListener('click', () => this.startBatchExecution());
    this.pauseBatchBtn.addEventListener('click', () => this.pauseBatchExecution());
    this.cancelBatchBtn.addEventListener('click', () => this.cancelBatchExecution());

    // Settings auto-save
    [this.downloadFolder, this.filePrefix, this.qualitySelect, this.autoRenameToggle].forEach(el => {
      el.addEventListener('change', () => this.saveSettings());
    });

    this.clearLogsBtn.addEventListener('click', () => {
      this.logTerminal.innerHTML = '<p class="log-line info">[System] Log cleared.</p>';
    });

    if (this.exportLogsBtn) {
      this.exportLogsBtn.addEventListener('click', () => this.exportLogsToFile());
    }

    this.openOptionsBtn.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      }
    });
  }

  exportLogsToFile() {
    const lines = Array.from(this.logTerminal.querySelectorAll('.log-line'))
      .map(el => el.textContent.trim());

    if (lines.length === 0) {
      alert('Execution log terminal is empty.');
      return;
    }

    const logText = lines.join('\r\n');
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const filename = `FlowCraft_Execution_Log_${timestamp}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.appendLog('info', `📥 Execution log exported to ${filename}`);
  }

  updatePromptCount() {
    let count = 0;
    try {
      const parsedJson = JSON.parse(this.promptInput.value);
      const scenes = parsedJson.scenes || (Array.isArray(parsedJson) ? parsedJson : []);
      count = scenes.length;
    } catch (e) {
      const lines = this.promptInput.value.split('\n').filter(l => l.trim().length > 0);
      count = lines.length;
    }
    this.promptCountLabel.textContent = `${count} Prompt${count === 1 ? '' : 's'}`;
  }

  async handleImageSelect(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    for (const file of files) {
      const base64 = await this.fileToBase64(file);
      this.attachedImages.push({ name: file.name, base64 });
    }

    this.renderImagePreviews();
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  renderImagePreviews() {
    this.imagePreviewContainer.innerHTML = '';
    if (!this.attachedImages.length) {
      this.imagePreviewContainer.innerHTML = '<p class="placeholder-text">No image assets attached</p>';
      return;
    }

    this.attachedImages.forEach((imgObj, idx) => {
      const imgEl = document.createElement('img');
      imgEl.src = imgObj.base64;
      imgEl.className = 'preview-thumb';
      imgEl.title = `${imgObj.name} (Click to remove)`;
      imgEl.addEventListener('click', () => {
        this.attachedImages.splice(idx, 1);
        this.renderImagePreviews();
      });
      this.imagePreviewContainer.appendChild(imgEl);
    });
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const cfg = stored[STORAGE_KEYS.SETTINGS] ?? DEFAULT_SETTINGS;

      this.downloadFolder.value = cfg.downloadFolder ?? DEFAULT_SETTINGS.downloadFolder;
      this.filePrefix.value = cfg.filePrefix ?? '';
      this.qualitySelect.value = cfg.autoDownloadQuality ?? DEFAULT_SETTINGS.autoDownloadQuality;
      this.autoRenameToggle.checked = cfg.autoChangeFileName ?? true;
    } catch {}
  }

  async saveSettings() {
    const cfg = {
      downloadFolder: this.downloadFolder.value,
      filePrefix: this.filePrefix.value,
      autoDownloadQuality: this.qualitySelect.value,
      autoChangeFileName: this.autoRenameToggle.checked
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: cfg });
  }

  async getActiveGoogleLabsTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let targetTab = tabs.find(t => t.url?.includes('labs.google'));
    if (!targetTab) {
      const allTabs = await chrome.tabs.query({ url: ['*://labs.google/*'] });
      targetTab = allTabs[0];
    }
    return targetTab;
  }

  async startBatchExecution() {
    let payloads = [];
    
    // First, try parsing the input as JSON (Veo Auto-Prompts)
    try {
      const parsedJson = JSON.parse(this.promptInput.value);
      const scenes = parsedJson.scenes || (Array.isArray(parsedJson) ? parsedJson : []);
      
      if (scenes.length > 0) {
        payloads = scenes.map((scene, idx) => {
          // Extract specific scene parameters from the JSON if available
          const promptContent = scene.full_combined_prompt || scene.prompt || JSON.stringify(scene);
          // If the JSON provides a specific duration (e.g. 4 or 6), use it. Otherwise fallback to UI.
          const dur = scene.veo_target_duration ? String(scene.veo_target_duration) : (this.durationSelect?.value || 'auto');
          const aspect = scene.aspect_ratio || this.aspectSelect.value;
          
          return {
            promptIndex: scene.scene_number || (idx + 1),
            prompt: promptContent,
            mode: this.modeSelect.value,
            aspectRatio: aspect,
            outputCount: parseInt(this.outputCountSelect.value, 10),
            model: this.modelSelect.value,
            duration: dur,
            isConcat: this.concatToggle.checked,
            images: [...this.attachedImages],
            folderName: this.downloadFolder.value,
            filePrefix: this.filePrefix.value,
            autoDownloadResourceQuality: this.qualitySelect.value,
            autoChangeFileName: this.autoRenameToggle.checked
          };
        });
      }
    } catch (e) {
      // Not JSON, fallback to standard line-by-line text parsing
      const rawPrompts = this.promptInput.value.split('\n').filter(l => l.trim().length > 0);
      
      if (rawPrompts.length > 0) {
        payloads = rawPrompts.map((promptText, idx) => ({
          promptIndex: idx + 1,
          prompt: promptText,
          mode: this.modeSelect.value,
          aspectRatio: this.aspectSelect.value,
          outputCount: parseInt(this.outputCountSelect.value, 10),
          model: this.modelSelect.value,
          duration: this.durationSelect?.value || 'auto',
          isConcat: this.concatToggle.checked,
          images: [...this.attachedImages],
          folderName: this.downloadFolder.value,
          filePrefix: this.filePrefix.value,
          autoDownloadResourceQuality: this.qualitySelect.value,
          autoChangeFileName: this.autoRenameToggle.checked
        }));
      }
    }

    if (!payloads || payloads.length === 0) {
      alert('Please enter at least one prompt (or valid JSON) in the queue.');
      return;
    }

    const tab = await this.getActiveGoogleLabsTab();
    if (!tab || !tab.id) {
      alert('Please navigate to Google Labs (labs.google) before starting automation.');
      return;
    }

    const groupData = {
      id: `group_${Date.now()}`,
      payloads: payloads
    };

    this.startBatchBtn.classList.add('hidden');
    this.activeTaskControls.classList.remove('hidden');
    this.statusCard.classList.remove('hidden');

    let resp;
    try {
      resp = await chrome.tabs.sendMessage(tab.id, {
        type: 'START_BATCH_RUN',
        groupData
      });
    } catch {
      // Auto-inject content script if receiving end does not exist yet
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-loader.js']
        });
        await new Promise(r => setTimeout(r, 500));
        resp = await chrome.tabs.sendMessage(tab.id, {
          type: 'START_BATCH_RUN',
          groupData
        });
      } catch (injectErr) {
        this.appendLog('error', `Tab communication failed: Please refresh the Google Labs tab (${tab.url})`);
        alert('Could not connect to Google Labs page. Please reload/refresh the Google Labs browser tab and try again.');
        this.resetExecutionUI();
        return;
      }
    }

    if (!resp?.success) {
      this.appendLog('error', `Failed to launch batch: ${resp?.error ?? 'Unknown error'}`);
      this.resetExecutionUI();
    } else {
      this.appendLog('info', `🚀 Batch run launched with ${rawPrompts.length} prompt(s).`);
    }
  }

  async pauseBatchExecution() {
    const tab = await this.getActiveGoogleLabsTab();
    if (tab?.id) {
      const isPausing = this.pauseBatchBtn.textContent === 'Pause';
      const actionType = isPausing ? 'PAUSE_BATCH_RUN' : 'RESUME_BATCH_RUN';
      await chrome.tabs.sendMessage(tab.id, { type: actionType });
      this.pauseBatchBtn.textContent = isPausing ? 'Resume' : 'Pause';
    }
  }

  async cancelBatchExecution() {
    const tab = await this.getActiveGoogleLabsTab();
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'CANCEL_BATCH_RUN' });
      this.resetExecutionUI();
    }
  }

  resetExecutionUI() {
    this.startBatchBtn.classList.remove('hidden');
    this.activeTaskControls.classList.add('hidden');
    this.pauseBatchBtn.textContent = 'Pause';
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === ACTIONS.PROGRESS_UPDATE && message.data) {
        const d = message.data;
        this.statusStep.textContent = d.status ? d.status.toUpperCase() : 'PROCESSING';
        this.progressBarFill.style.width = `${d.percentage ?? 0}%`;
        this.percentLabel.textContent = `${d.percentage ?? 0}%`;
        if (d.promptIndex) {
          this.promptProgressLabel.textContent = `Prompt #${d.promptIndex}`;
        }
      }

      if (message.type === ACTIONS.BATCH_STATUS && message.data) {
        const st = message.data;
        this.statusBadge.textContent = (st.status || 'RUNNING').toUpperCase();
        this.promptProgressLabel.textContent = `${st.completedCount} / ${st.totalCount} Done`;

        if (st.status === 'completed' || st.status === 'cancelled') {
          this.resetExecutionUI();
        }
      }

      if (message.type === ACTIONS.ACTION_LOG && message.data) {
        this.appendLog(message.data.level, message.data.message);
      }
    });
  }

  appendLog(level, text) {
    const p = document.createElement('p');
    p.className = `log-line ${level}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    p.textContent = `[${timeStr}] ${text}`;
    this.logTerminal.appendChild(p);
    this.logTerminal.scrollTop = this.logTerminal.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SidePanelApp();
});
