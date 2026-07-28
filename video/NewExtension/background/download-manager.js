/**
 * FlowCraft Download Manager - Manages file downloading & subfolder routing
 */

class DownloadManager {
  constructor() {
    this.customSubfolder = '';
    this.filePrefix = '';
    this.autoFilenameRouting = true;
    this.urlFilenameMap = new Map();
    this.urlFolderMap = new Map();
    this.expectedCount = 0;
    this.completedCount = 0;
    this.listenerActive = false;

    this.onDeterminingFilenameHandler = this.handleDeterminingFilename.bind(this);
    this.onChangedHandler = this.handleDownloadChanged.bind(this);
  }

  init() {
    chrome.downloads.onChanged.addListener(this.onChangedHandler);
  }

  setRoutingConfig({ folderName, prefix, autoChangeFileName }) {
    if (typeof folderName === 'string') {
      const sanitized = this.sanitizePath(folderName);
      this.customSubfolder = sanitized ? `${sanitized}/` : '';
    }
    if (typeof prefix === 'string') {
      this.filePrefix = prefix.trim();
    }
    if (typeof autoChangeFileName === 'boolean') {
      this.autoFilenameRouting = autoChangeFileName;
    }

    this.expectedCount = 0;
    this.completedCount = 0;

    if (this.autoFilenameRouting) {
      this.enableFilenameListener();
    } else {
      this.disableFilenameListener();
    }
  }

  sanitizePath(path) {
    let clean = path.trim().replace(/\\/g, '/');
    if (/^[A-Za-z]:\//.test(clean) || clean.startsWith('/')) {
      const parts = clean.split('/').filter(Boolean);
      clean = parts[parts.length - 1] ?? '';
    }
    return clean;
  }

  enableFilenameListener() {
    if (!chrome.downloads.onDeterminingFilename.hasListener(this.onDeterminingFilenameHandler)) {
      chrome.downloads.onDeterminingFilename.addListener(this.onDeterminingFilenameHandler);
      this.listenerActive = true;
    }
  }

  disableFilenameListener() {
    if (chrome.downloads.onDeterminingFilename.hasListener(this.onDeterminingFilenameHandler)) {
      chrome.downloads.onDeterminingFilename.removeListener(this.onDeterminingFilenameHandler);
      this.listenerActive = false;
    }
  }

  handleDeterminingFilename(item, suggest) {
    if (this.urlFilenameMap.has(item.url)) {
      const filename = this.urlFilenameMap.get(item.url);
      this.urlFilenameMap.delete(item.url);
      suggest({ filename });
      return;
    }

    if (this.urlFolderMap.has(item.url)) {
      const folder = this.urlFolderMap.get(item.url);
      this.urlFolderMap.delete(item.url);
      let filename = (item.filename || '').split(/[\\/]/).pop() || `download_${Date.now()}`;
      if (!/\.[a-zA-Z0-9]{2,5}$/.test(filename)) filename += '.png';
      suggest({ filename: `${folder}/${filename}` });
      return;
    }

    if (!this.autoFilenameRouting || !this.customSubfolder) return;

    const rawName = item.filename || item.url || '';
    const isVideo = /\.(mp4)$/i.test(rawName) || item.mime === 'video/mp4';

    if (/\.(pdf|zip|docx?|xlsx?|pptx?|txt|js|css|json|exe|msi|dmg|apk|tar|gz|7z)$/i.test(rawName)) return;

    let leafName = (item.filename || '').split('/').pop() || `download_${Date.now()}`;
    if (!/\.[a-zA-Z0-9]{2,5}$/.test(leafName)) {
      leafName += isVideo ? '.mp4' : '.png';
    }

    suggest({ filename: `${this.customSubfolder}${this.filePrefix}${leafName}` });
    this.expectedCount++;
  }

  handleDownloadChanged(delta) {
    if (delta.state?.current === 'complete' || delta.state?.current === 'interrupted') {
      this.completedCount++;
    }
  }

  async downloadMedia({ url, filename, folder, autoChangeFileName }) {
    return new Promise((resolve) => {
      if (autoChangeFileName !== false) {
        const cleanFolder = this.sanitizePath(folder ?? '');
        const targetPath = cleanFolder ? `${cleanFolder}/${filename}` : filename;
        this.urlFilenameMap.set(url, targetPath);

        chrome.downloads.download({ url, filename: targetPath, saveAs: false }, (downloadId) => {
          const err = chrome.runtime.lastError;
          if (err || downloadId === undefined) {
            resolve({ success: false, error: err?.message ?? 'Download failed' });
          } else {
            resolve({ success: true, downloadId });
          }
        });
      } else {
        const cleanFolder = this.sanitizePath(folder ?? '');
        if (cleanFolder) {
          this.urlFolderMap.set(url, cleanFolder);
          this.enableFilenameListener();
        }

        chrome.downloads.download({ url, saveAs: false }, (downloadId) => {
          const err = chrome.runtime.lastError;
          if (err || downloadId === undefined) {
            resolve({ success: false, error: err?.message ?? 'Download failed' });
          } else {
            resolve({ success: true, downloadId });
          }
        });
      }
    });
  }

  getStatus() {
    return { expected: this.expectedCount, completed: this.completedCount };
  }
}

export const downloadManager = new DownloadManager();
