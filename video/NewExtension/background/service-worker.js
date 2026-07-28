/**
 * FlowCraft AI Studio - Central Service Worker (Manifest V3)
 */
import { ACTIONS } from '../utils/constants.js';
import { selectorStore } from './selector-store.js';
import { downloadManager } from './download-manager.js';
import { CDPController } from './cdp-controller.js';

// Initialize Download Manager listeners
downloadManager.init();

// Configure SidePanel behavior
async function setupSidePanel() {
  if (chrome.sidePanel) {
    try {
      await chrome.sidePanel.setOptions({
        path: 'sidepanel/sidepanel.html',
        enabled: true
      });
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true
      });
    } catch {
      // SidePanel API fallback
    }
  }
}

// Extension Lifecycle Listeners
chrome.runtime.onInstalled.addListener(async (details) => {
  await setupSidePanel();

  if (details.reason === 'install') {
    try {
      const tabs = await chrome.tabs.query({ url: ['*://labs.google/*'] });
      for (const tab of tabs) {
        if (tab.id && tab.url?.includes('flow')) {
          await chrome.tabs.reload(tab.id).catch(() => {});
        }
      }
    } catch {}
  }
});

// Action Click Listener (Fallback for sidepanel open)
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel && tab.id !== undefined) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {}
  }
});

// Main Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case ACTIONS.GET_CONFIG:
    case 'GET_REMOTE_CONFIG':
      selectorStore.getSelectors()
        .then(cfg => sendResponse(cfg))
        .catch(() => sendResponse(null));
      return true;

    case ACTIONS.INVALIDATE_CACHE:
    case 'INVALIDATE_CONFIG_CACHE':
      selectorStore.invalidateCache();
      sendResponse({ success: true });
      break;

    case ACTIONS.SET_DOWNLOAD_ROUTING:
    case 'SET_FOLDER_NAME':
      downloadManager.setRoutingConfig({
        folderName: message.folderName,
        prefix: message.prefix,
        autoChangeFileName: message.autoChangeFileName
      });
      sendResponse({ success: true });
      break;

    case ACTIONS.DOWNLOAD_MEDIA:
    case 'DOWNLOAD_VIDEO':
      downloadManager.downloadMedia({
        url: message.url,
        filename: message.filename,
        folder: message.folder,
        autoChangeFileName: message.autoChangeFileName
      }).then(res => sendResponse(res));
      return true;

    case ACTIONS.GET_DOWNLOAD_STATUS:
    case 'GET_DOWNLOAD_STATUS':
      sendResponse(downloadManager.getStatus());
      break;

    case ACTIONS.SET_ZOOM:
    case 'SET_ZOOM': {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        chrome.tabs.setZoom(tabId, message.zoomFactor ?? 1)
          .then(() => sendResponse({ success: true }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }
      sendResponse({ success: false, error: 'No active tab ID' });
      break;
    }

    case ACTIONS.CLICK_SUBMIT_CDP:
    case 'CLICK_SUBMIT_BUTTON': {
      const tabId = sender.tab?.id;
      CDPController.clickSubmitButton(tabId).then(res => sendResponse(res));
      return true;
    }

    case ACTIONS.TYPE_TEXT_MAIN:
    case 'TYPE_TEXT': {
      const tabId = sender.tab?.id;
      CDPController.typeTextMainWorld(tabId, message.text).then(res => sendResponse(res));
      return true;
    }

    default:
      // Pass-through unhandled messages
      break;
  }
  return false;
});
