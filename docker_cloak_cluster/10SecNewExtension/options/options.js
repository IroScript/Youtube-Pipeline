/**
 * FlowCraft Options Page Logic
 */
import { STORAGE_KEYS, DEFAULT_SETTINGS, ACTIONS } from '../utils/constants.js';

class OptionsApp {
  constructor() {
    this.optFolder = document.getElementById('optFolder');
    this.optPrefix = document.getElementById('optPrefix');
    this.optDelayMin = document.getElementById('optDelayMin');
    this.optDelayMax = document.getElementById('optDelayMax');
    this.optRemoteConfig = document.getElementById('optRemoteConfig');
    this.saveBtn = document.getElementById('saveBtn');
    this.clearCacheBtn = document.getElementById('clearCacheBtn');
    this.saveStatus = document.getElementById('saveStatus');

    this.loadSettings();
    this.bindEvents();
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS, 'remoteConfigUrl']);
      const cfg = stored[STORAGE_KEYS.SETTINGS] ?? DEFAULT_SETTINGS;

      this.optFolder.value = cfg.downloadFolder ?? DEFAULT_SETTINGS.downloadFolder;
      this.optPrefix.value = cfg.filePrefix ?? '';
      this.optDelayMin.value = cfg.promptDelayMin ?? DEFAULT_SETTINGS.promptDelayMin;
      this.optDelayMax.value = cfg.promptDelayMax ?? DEFAULT_SETTINGS.promptDelayMax;
      this.optRemoteConfig.value = stored.remoteConfigUrl ?? '';
    } catch (err) {
      console.error('Error loading options settings:', err);
    }
  }

  async saveSettings() {
    const updated = {
      downloadFolder: this.optFolder.value || DEFAULT_SETTINGS.downloadFolder,
      filePrefix: this.optPrefix.value,
      promptDelayMin: parseInt(this.optDelayMin.value, 10) || 5,
      promptDelayMax: parseInt(this.optDelayMax.value, 10) || 10,
      autoChangeFileName: true
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: updated,
      remoteConfigUrl: this.optRemoteConfig.value.trim()
    });

    this.showSaveStatus();
  }

  async clearCache() {
    try {
      await chrome.runtime.sendMessage({ type: ACTIONS.INVALIDATE_CACHE });
      alert('Selector cache cleared successfully. Fresh defaults will be loaded.');
    } catch {
      alert('Cache cleared.');
    }
  }

  showSaveStatus() {
    this.saveStatus.classList.remove('hidden');
    setTimeout(() => {
      this.saveStatus.classList.add('hidden');
    }, 2500);
  }

  bindEvents() {
    this.saveBtn.addEventListener('click', () => this.saveSettings());
    this.clearCacheBtn.addEventListener('click', () => this.clearCache());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsApp();
});
