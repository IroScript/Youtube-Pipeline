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

// Extension Lifecycle Listeners - Auto-reload Flow tabs on install/update/reload
chrome.runtime.onInstalled.addListener(async (details) => {
  await setupSidePanel();

  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && (tab.url.includes('labs.google/fx/tools/flow') || tab.url.includes('labs.google'))) {
        await chrome.tabs.reload(tab.id).catch(() => {});
      }
    }
  } catch {}
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

    case 'WRITE_SLATE_PROMPT':
    case 'TYPE_PROMPT_SLATE':
    case ACTIONS.TYPE_TEXT_MAIN:
    case 'TYPE_TEXT': {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No sender tab ID' });
        break;
      }
      const textToInsert = message.text || message.payload?.text || '';
      CDPController.typeTextMainWorld(tabId, textToInsert).then(res => sendResponse(res));
      return true;
    }

    case 'CLICK_FLOW_CREATE':
    case ACTIONS.CLICK_SUBMIT_CDP:
    case 'CLICK_SUBMIT_BUTTON': {
      const tabId = sender.tab?.id;
      CDPController.clickSubmitButton(tabId).then(res => sendResponse(res));
      return true;
    }

    case ACTIONS.SUBMIT_ENTER_CDP:
    case 'SUBMIT_ENTER': {
      const tabId = sender.tab?.id;
      CDPController.sendEnterKey(tabId).then(res => sendResponse(res));
      return true;
    }

    default:
      // Pass-through unhandled messages
      break;
  }
  return false;
});

// ═══════════════════════════════════════════════════════════════════
// BACKGROUND NATIVE TAB NAVIGATION & BRIDGE HEARTBEAT
// ═══════════════════════════════════════════════════════════════════
let lastNavigatedJobId = null;

function sendServiceWorkerHeartbeat() {
  fetch('http://127.0.0.1:8102/api/tab_ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'service_worker',
      title: 'FlowCraft Service Worker',
      isWorkspace: true,
      status: 'active'
    })
  }).catch(() => {});
}
setInterval(sendServiceWorkerHeartbeat, 2000);
sendServiceWorkerHeartbeat();

async function checkBackgroundBridgeNavigation() {
  try {
    const res = await fetch('http://127.0.0.1:8102/api/pending_prompt', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return;

    const data = await res.json();
    if (data && data.status === 'pending' && data.job_id && data.job_id !== lastNavigatedJobId) {
      lastNavigatedJobId = data.job_id;

      const tabs = await chrome.tabs.query({});
      const flowTab = tabs.find(t => t.url && (t.url.includes('labs.google/fx/tools/flow') || t.url.includes('labs.google')));

      if (!flowTab) {
        // Reuse blank / newtab or open clean new tab internally via Chrome API
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const cur = activeTabs[0];
        if (cur && (!cur.url || cur.url.startsWith('chrome://') || cur.url === 'about:blank')) {
          await chrome.tabs.update(cur.id, { url: 'https://labs.google/fx/tools/flow', active: true });
        } else {
          await chrome.tabs.create({ url: 'https://labs.google/fx/tools/flow', active: true });
        }
      } else {
        await chrome.tabs.update(flowTab.id, { active: true });
      }
    }
  } catch {}
}

setInterval(checkBackgroundBridgeNavigation, 2000);

