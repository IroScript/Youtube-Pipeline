/**
 * FlowCraft AI Studio - Shared Constants & Configuration Defaults
 */

export const STORAGE_KEYS = {
  SETTINGS: 'flowcraft_settings',
  RUN_STATE: 'flowcraft_active_run',
  SELECTOR_CACHE: 'flowcraft_selectors',
  LOGS: 'flowcraft_logs'
};

export const ACTIONS = {
  // Background -> Content / Sidepanel
  GET_CONFIG: 'FLOWCRAFT_GET_CONFIG',
  INVALIDATE_CACHE: 'FLOWCRAFT_INVALIDATE_CACHE',
  SET_ZOOM: 'FLOWCRAFT_SET_ZOOM',
  DOWNLOAD_MEDIA: 'FLOWCRAFT_DOWNLOAD_MEDIA',
  SET_DOWNLOAD_ROUTING: 'FLOWCRAFT_SET_DOWNLOAD_ROUTING',
  GET_DOWNLOAD_STATUS: 'FLOWCRAFT_GET_DOWNLOAD_STATUS',
  CLICK_SUBMIT_CDP: 'FLOWCRAFT_CLICK_SUBMIT_CDP',
  TYPE_TEXT_MAIN: 'FLOWCRAFT_TYPE_TEXT_MAIN',
  
  // Progress & Status Reporting
  PROGRESS_UPDATE: 'FLOWCRAFT_PROGRESS_UPDATE',
  BATCH_STATUS: 'FLOWCRAFT_BATCH_STATUS',
  ACTION_LOG: 'FLOWCRAFT_ACTION_LOG',
  COOLDOWN_ALERT: 'FLOWCRAFT_COOLDOWN_ALERT',
  RECOVERY_SIGNAL: 'FLOWCRAFT_RECOVERY_SIGNAL'
};

export const DEFAULT_SELECTORS = {
  version: '1.0.0',
  selectors: {
    createProjectButton: 'button:has(i:contains("add_2")):first',
    configureUIModeButton: 'button:has(i:contains(settings_2))',
    closeConfigureUIModeButton: 'button:has(i:contains(settings_2))',
    selectGridModeOption: 'div[role="menu"] > div[data-orientation="horizontal"]:eq(0) button:eq(0)',
    selectSizeGridModeOption: 'div[role="menu"] > div[data-orientation="horizontal"]:eq(1) button:eq(0)',
    selectShowTextModeOption: 'div[role="menu"] > div:has(i:contains(visibility)) button:eq(1)',
    selectClearPromptModeOption: 'div[role="menu"] > div:has(i:contains(ink_eraser)) button:eq(1)',
    configButton: 'button:has(i:contains("crop"))',
    configButtonActived: 'button:has(i:contains("crop"))',
    selectVideoMode: 'div[data-state="open"] div[role="tablist"]:eq(0) button:eq(1)',
    selectImageMode: 'div[data-state="open"] div[role="tablist"]:eq(0) button:eq(0)',
    textToVideoModeOption: 'div[data-state="open"] div[role="tablist"]:eq(1) button:eq(1)',
    imageToVideoModeOption: 'div[data-state="open"] div[role="tablist"]:eq(1) button:eq(0)',
    componentToVideoModeOption: 'div[data-state="open"] div[role="tablist"] button:has(i:contains("chrome_extension")), div[data-state="open"] button.flow_tab_slider_trigger:contains("Ingredients")',
    aspectRatioTemplate: 'div[data-state="open"] div[role="tablist"] button:has(i:contains("{aspectRatio}"))',
    outputCountTemplate: 'button.flow_tab_slider_trigger:contains("{outputCount}")',
    modelSelectButton: 'div[data-state="open"] button:has(i:contains("arrow_drop_down"))',
    modelTemplate: 'div[role="menu"] button:has(span:contains("{model}"))',
    promptTextarea: 'div[role="textbox"]',
    submitButton: 'button:has(i:contains("arrow_forward"))',
    outputItems: 'div > div > div[data-tile-id]:has(div)',
    tileByIdTemplate: 'div[data-tile-id="{tileId}"]:has(div)',
    downloadDoneButton: 'button:has(i:contains("check")), button:has(span:contains("Done"))',
    tileEditLinkTemplate: 'div[data-tile-id="{tileId}"] a[href*="/edit/"]',
    downloadButtonInTile: 'button:has(i:contains("download"))',
    tileMenuButtonTemplate: 'div[data-tile-id="{tileId}"] button:has(i:contains("more_vert")), div[data-tile-id="{tileId}"] button:has(i:contains("more_horiz"))',
    menuDownloadItem: '[role="menu"] [role="menuitem"]:has(i:contains("download")), [data-context-menu-content="true"] [role="menuitem"]:has(i:contains("download"))',
    quality720Option: 'button:has(span:contains("720p")), [role="menuitem"]:has(span:contains("720p")), [role="menuitem"]:contains("720p")',
    quality1080Option: 'button:has(span:contains("1080p")), button:has(span:contains("1K")), button:has(span:contains("1080")), [role="menuitem"]:has(span:contains("1080p")), [role="menuitem"]:contains("1080p")',
    quality2KOption: 'button:has(span:contains("2K")), [role="menuitem"]:has(span:contains("2K")), [role="menuitem"]:contains("2K")',
    quality4KOption: 'button:has(span:contains("4K")), [role="menuitem"]:has(span:contains("4K")), [role="menuitem"]:contains("4K")',
    qualityGifOption: 'button:has(span:contains("270p")), button:has(span:contains("GIF")), button:has(span:contains("Animated")), [role="menuitem"]:has(span:contains("270p")), [role="menuitem"]:contains("270p")',
    addFrameButton: 'div[aria-haspopup="dialog"][data-state="closed"], button:has(i:contains("add_2"))',
    addImageButton: 'div[aria-haspopup="dialog"][data-state="closed"], button:has(i:contains("add_2"))',
    sortOptionsButton: 'div[data-side="top"] button[aria-haspopup="menu"]:last()',
    sortLatestOption: 'div[role="menu"] > button:eq(2)',
    searchUploadedImage: 'div[data-side="top"] input[type="text"]',
    virtuosoItemList: 'div[data-side="top"] div[data-testid="virtuoso-item-list"] > div:has(img)',
    fileInput: 'input[type="file"]',
    frameStartOnlyOption: '[role="radio"]:contains("Start frame only"), button:contains("Start frame only"), label:contains("Start frame only")',
    frameStartAndEndOption: '[role="radio"]:contains("Start frame and End"), button:contains("Start frame and End"), label:contains("Start frame and End")'
  }
};

export const DEFAULT_SETTINGS = {
  downloadFolder: 'FlowCraft_Outputs',
  filePrefix: '',
  autoChangeFileName: true,
  autoDownloadQuality: '1080p',
  promptDelayMin: 5,
  promptDelayMax: 10,
  maxRetryAttempts: 3,
  cooldownPeriodSec: 25,
  remoteConfigUrl: ''
};
