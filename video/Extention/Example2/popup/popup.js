/**
 * Flow Prompt Automator - Popup Script
 * Premium UI focusing on Google Flow.
 */

import { storage } from '../shared/storage.js';
import {
    AUTOMATOR_STATE,
    QUEUE_STATUS,
    createQueueItem,
    SUPPORTED_SERVICES,
    MODEL_SPECS,
    FLOW_MODELS,
    FLOW_VIDEO_MODES,
    FLOW_VIDEO_MODELS,
    getSupportedVideoDurations,
    getVideoCapabilities,
    isVideoVoiceAllowed,
    normalizeVoiceReference,
    sanitizeVideoSettings,
    autoBindAssetsByPromptMentions,
    autoAppendAssetMentionToPrompt
} from '../shared/model.js';
import { SELECTORS } from '../shared/selectors.js';
import { firebaseConfig } from '../shared/firebase-config.js';

// DOM Elements
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const rerunUnfinishedBtn = document.getElementById('rerunUnfinishedBtn');
const sendBugReportBtn = document.getElementById('sendBugReportBtn');
const bugReportStatus = document.getElementById('bugReportStatus');
const promptInput = document.getElementById('promptInput');
const csvGuideBtn = document.getElementById('csvGuideBtn');
const csvUploadBtn = document.getElementById('csvUploadBtn');
const queueList = document.getElementById('queueList');
const queueFailedList = document.getElementById('queueFailedList');
const queueCompletedList = document.getElementById('queueCompletedList');
const emptyQueueMsg = document.getElementById('emptyQueueMsg');
const activeCount = document.getElementById('activeCount');
const queueStatusBadge = document.getElementById('queueStatusBadge');
const csvImport = document.getElementById('csvImport');
const concurrentCount = document.getElementById('concurrentCount');
const previewList = document.getElementById('previewList');
const previewCount = document.getElementById('previewCount');
const promptPreviewContainer = document.getElementById('promptPreviewContainer');
const statusBar = document.getElementById('statusBar');
const headerStopBtn = document.getElementById('headerStopBtn');
const forceRefreshBtn = document.getElementById('forceRefreshBtn');
const userGuideBtn = document.getElementById('userGuideBtn');
const premiumFeatureBtn = document.getElementById('premiumFeatureBtn');
const premiumUpsellCard = document.getElementById('premiumUpsellCard');
const premiumUpsellBtn = document.getElementById('premiumUpsellBtn');
const professionalTrialCard = document.getElementById('professionalTrialCard');
const professionalTrialBtn = document.getElementById('professionalTrialBtn');
const trialExpiredBanner = document.getElementById('trialExpiredBanner');
const authLandingPanel = document.getElementById('authLandingPanel');
const authLandingNotice = document.getElementById('authLandingNotice');
const authGoogleBtn = document.getElementById('authGoogleBtn');
const authEmailInput = document.getElementById('authEmailInput');
const authPasswordInput = document.getElementById('authPasswordInput');
const authEmailSubmitBtn = document.getElementById('authEmailSubmitBtn');
const authAccessDeniedResetBtn = document.getElementById('authAccessDeniedResetBtn');
const authAccessDeniedUpgradeBtn = document.getElementById('authAccessDeniedUpgradeBtn');
const authAccessDeniedSignOutBtn = document.getElementById('authAccessDeniedSignOutBtn');
const authModeToggleBtn = document.getElementById('authModeToggleBtn');
const authForgotPasswordBtn = document.getElementById('authForgotPasswordBtn');
const authTogglePasswordBtn = document.getElementById('authTogglePasswordBtn');
const storyboardBtn = document.getElementById('storyboardBtn');
const storyboardLockBadge = document.getElementById('storyboardLockBadge');
const storyboardOverviewModal = document.getElementById('storyboardOverviewModal');
const storyboardOverviewTitle = document.getElementById('storyboardOverviewTitle');
const storyboardOverviewSubtitle = document.getElementById('storyboardOverviewSubtitle');
const storyboardOverviewList = document.getElementById('storyboardOverviewList');
const storyboardOverviewCloseBtn = document.getElementById('storyboardOverviewCloseBtn');
const profileAvatarBtn = document.getElementById('profileAvatarBtn');
const profileAvatarImg = document.getElementById('profileAvatarImg');
const profileAvatarFallback = document.getElementById('profileAvatarFallback');
const downloadPageBtn = document.getElementById('downloadPageBtn');
const openDownloadPickerBtn = document.getElementById('openDownloadPickerBtn');
const imageDownloaderLockBadge = document.getElementById('imageDownloaderLockBadge');
const downloadQualityBtns = document.querySelectorAll('[data-download-quality]');
const downloadPickerModal = document.getElementById('downloadPickerModal');
const downloadPickerTitle = document.getElementById('downloadPickerTitle');
const downloadPickerSubtitle = document.getElementById('downloadPickerSubtitle');
const downloadPickerCloseBtn = document.getElementById('downloadPickerCloseBtn');
const downloadPickerSelectAllBtn = document.getElementById('downloadPickerSelectAllBtn');
const downloadPickerClearBtn = document.getElementById('downloadPickerClearBtn');
const downloadPickerRescanBtn = document.getElementById('downloadPickerRescanBtn');
const downloadPickerCount = document.getElementById('downloadPickerCount');
const downloadPickerGrid = document.getElementById('downloadPickerGrid');
const downloadPickerDownloadBtn = document.getElementById('downloadPickerDownloadBtn');
const downloadPickerImagesOnlyNote = document.getElementById('downloadPickerImagesOnlyNote');
const downloadPickerPremiumOverlay = document.getElementById('downloadPickerPremiumOverlay');
const downloadPickerPremiumTitle = document.getElementById('downloadPickerPremiumTitle');
const downloadToolsArea = document.getElementById('downloadToolsArea');
const imageDownloaderGateShell = document.getElementById('imageDownloaderGateShell');
const imageDownloaderSignedInMsg = document.getElementById('imageDownloaderSignedInMsg');
const imageDownloaderSignedInText = document.getElementById('imageDownloaderSignedInText');
const imageDownloaderSignOutBtn = document.getElementById('imageDownloaderSignOutBtn');
const stopDownloadBtn = document.getElementById('stopDownloadBtn');
const modelStatus = document.getElementById('modelStatus');
const subscribeYoutubeBtn = document.getElementById('subscribeYoutubeBtn');
const unlockSubscribeBtn = document.getElementById('unlockSubscribeBtn');
const subscribeGateCard = document.getElementById('subscribeGateCard');
const ssoGateCard = document.getElementById('ssoGateCard');
const googleSsoBtn = document.getElementById('googleSsoBtn');
const premiumLoginBanner = document.getElementById('premiumLoginBanner');
const premiumLoginBtn = document.getElementById('premiumLoginBtn');
const loginRequiredGate = document.getElementById('loginRequiredGate');
const loginRequiredBtn = document.getElementById('loginRequiredBtn');
const labelLoginRequiredTitle = document.getElementById('labelLoginRequiredTitle');
const labelLoginRequiredBody = document.getElementById('labelLoginRequiredBody');
const membershipUsageCard = document.getElementById('membershipUsageCard');
const labelMembershipUsageBody = document.getElementById('labelMembershipUsageBody');
const membershipUsageTier = document.getElementById('membershipUsageTier');
const extensionVersionBadge = document.getElementById('extensionVersionBadge');
const firebaseUidRow = document.getElementById('firebaseUidRow');
const labelFirebaseUid = document.getElementById('labelFirebaseUid');
const firebaseUidValue = document.getElementById('firebaseUidValue');
const copyFirebaseUidBtn = document.getElementById('copyFirebaseUidBtn');
const assetPremiumLockBanner = document.getElementById('assetPremiumLockBanner');
const labelAssetPremiumLocked = document.getElementById('labelAssetPremiumLocked');
const characterAssetHelpText = document.getElementById('characterAssetHelpText');
const referenceAssetHelpText = document.getElementById('referenceAssetHelpText');
const characterAssetLockBadge = document.getElementById('characterAssetLockBadge');
const referenceAssetLockBadge = document.getElementById('referenceAssetLockBadge');
const unlockSsoBtn = document.getElementById('unlockSsoBtn');
const quickSignInBtn = document.getElementById('quickSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authStatusText = document.getElementById('authStatusText');
const settingsSignInBtn = document.getElementById('settingsSignInBtn');
const settingsSignOutBtn = document.getElementById('settingsSignOutBtn');
const authStatusTextSettings = document.getElementById('authStatusTextSettings');
const gateLockNote = document.getElementById('gateLockNote');
const downloadToolsLockedMsg = document.getElementById('downloadToolsLockedMsg');
const upscaleDownloadToolsDisabledMsg = document.getElementById('upscaleDownloadToolsDisabledMsg');
const labelDownloadTools = document.getElementById('labelDownloadTools');
const labelDownloadHint = document.getElementById('labelDownloadHint');
const labelUpscaleDownload = document.getElementById('labelUpscaleDownload');
const labelUpscaleDownloadNote = document.getElementById('labelUpscaleDownloadNote');
const upscaleDownloadQualityPill = document.getElementById('upscaleDownloadQualityPill');
const donateBtn = document.getElementById('donateBtn');
const settingsSubscribeYoutubeBtn = document.getElementById('settingsSubscribeYoutubeBtn');
const subscriberConfirmedStatus = document.getElementById('subscriberConfirmedStatus');
const uploadStatus = document.getElementById('uploadStatus');

// Queue tab switching
document.getElementById('queueTabOpen')?.addEventListener('click', () => setQueueTab('open'));
document.getElementById('queueTabFailed')?.addEventListener('click', () => setQueueTab('failed'));
document.getElementById('queueTabCompleted')?.addEventListener('click', () => setQueueTab('completed'));



// Reference Asset
const loadAssetsBtn = document.getElementById('loadAssetsBtn');
const referenceAssetSelect = document.getElementById('referenceAssetSelect');
const referenceAssetPreview = document.getElementById('referenceAssetPreview');
const referenceAssetImg = document.getElementById('referenceAssetImg');
const referenceAssetName = document.getElementById('referenceAssetName');
const referenceAssetWarning = document.getElementById('referenceAssetWarning');
const resetReferenceAssetBtn = document.getElementById('resetReferenceAssetBtn');
const addReferenceAssetBtn = document.getElementById('addReferenceAssetBtn');
const openReferenceAssetPickerBtn = document.getElementById('openReferenceAssetPickerBtn');
const openReferenceAssetFullPickerBtn = document.getElementById('openReferenceAssetFullPickerBtn');
const referenceAssetSelectedList = document.getElementById('referenceAssetSelectedList');
const videoAssetQueueList = document.getElementById('videoAssetQueueList');
const videoPromptModalBtn = document.getElementById('videoPromptModalBtn');
const videoAutoAddBtn = document.getElementById('videoAutoAddBtn');
const videoClearQueueBtn = document.getElementById('videoClearQueueBtn');
const videoDryRunBtn = document.getElementById('videoDryRunBtn');
const referenceAssetPickerModal = document.getElementById('referenceAssetPickerModal');
const referenceAssetPickerReloadBtn = document.getElementById('referenceAssetPickerReloadBtn');
const referenceAssetPickerCancelBtn = document.getElementById('referenceAssetPickerCancelBtn');
const referenceAssetPickerApplyBtn = document.getElementById('referenceAssetPickerApplyBtn');
const referenceAssetAvailableGrid = document.getElementById('referenceAssetAvailableGrid');
const referenceAssetSelectedGrid = document.getElementById('referenceAssetSelectedGrid');
const referenceAssetAvailableCount = document.getElementById('referenceAssetAvailableCount');
const referenceAssetSelectedCount = document.getElementById('referenceAssetSelectedCount');
const referenceAssetPickerSummary = document.getElementById('referenceAssetPickerSummary');
const referenceAssetPickerLockBadge = document.getElementById('referenceAssetPickerLockBadge');
const referenceAssetPickerTitle = document.getElementById('referenceAssetPickerTitle');
const referenceAssetAvailableTitle = document.getElementById('referenceAssetAvailableTitle');
const referenceAssetSelectedTitle = document.getElementById('referenceAssetSelectedTitle');
const videoPromptBatchModal = document.getElementById('videoPromptBatchModal');
const videoPromptBatchInput = document.getElementById('videoPromptBatchInput');
const videoPromptBatchSaveBtn = document.getElementById('videoPromptBatchSaveBtn');
const videoPromptBatchCancelBtn = document.getElementById('videoPromptBatchCancelBtn');

// Edit Modal
const editModal = document.getElementById('editModal');
const editModalInput = document.getElementById('editModalInput');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const labelEditPrompt = document.getElementById('labelEditPrompt');
const csvValidationModal = document.getElementById('csvValidationModal');
const csvValidationSummary = document.getElementById('csvValidationSummary');
const csvValidationList = document.getElementById('csvValidationList');
const csvValidationApplyBtn = document.getElementById('csvValidationApplyBtn');
const csvValidationCancelBtn = document.getElementById('csvValidationCancelBtn');
const promoBanner = document.getElementById('promoBanner');
const promoBannerLink = document.getElementById('promoBannerLink');
const promoBannerLabel = document.getElementById('promoBannerLabel');
const remoteNotificationModal = document.getElementById('remoteNotificationModal');
const remoteNotificationTitle = document.getElementById('remoteNotificationTitle');
const remoteNotificationMessage = document.getElementById('remoteNotificationMessage');
const remoteNotificationVersion = document.getElementById('remoteNotificationVersion');
const remoteNotificationConfirmBtn = document.getElementById('remoteNotificationConfirmBtn');
const errorPopupModal = document.getElementById('errorPopupModal');
const errorPopupTitle = document.getElementById('errorPopupTitle');
const errorPopupMessage = document.getElementById('errorPopupMessage');
const errorPopupCloseBtn = document.getElementById('errorPopupCloseBtn');
const errorPopupCountdown = document.getElementById('errorPopupCountdown');
const errorPopupCountdownLabel = document.getElementById('errorPopupCountdownLabel');
const errorPopupCountdownValue = document.getElementById('errorPopupCountdownValue');
const errorPopupRecoveryHelp = document.getElementById('errorPopupRecoveryHelp');
const errorPopupRecoveryCause = document.getElementById('errorPopupRecoveryCause');
const errorPopupRecoveryLink = document.getElementById('errorPopupRecoveryLink');
const errorPopupRecoveryAccountTip = document.getElementById('errorPopupRecoveryAccountTip');
const premiumFeatureModal = document.getElementById('premiumFeatureModal');
const premiumYoutubeBtn = document.getElementById('premiumYoutubeBtn');
const premiumReviewBtn = document.getElementById('premiumReviewBtn');
const premiumFormBtn = document.getElementById('premiumFormBtn');
const premiumFeatureCloseBtn = document.getElementById('premiumFeatureCloseBtn');
const queueAssetPickerModal = document.getElementById('queueAssetPickerModal');
const queueAssetPickerTitle = document.getElementById('queueAssetPickerTitle');
const queueAssetPickerSubtitle = document.getElementById('queueAssetPickerSubtitle');
const queueAssetPickerGrid = document.getElementById('queueAssetPickerGrid');
const queueAssetPickerCloseBtn = document.getElementById('queueAssetPickerCloseBtn');
const perPromptAssetsLockOverlay = document.getElementById('perPromptAssetsLockOverlay');
const profileModal = document.getElementById('profileModal');
const profileCloseBtn = document.getElementById('profileCloseBtn');
const profileModalAvatarImg = document.getElementById('profileModalAvatarImg');
const profileModalAvatarFallback = document.getElementById('profileModalAvatarFallback');
const profileEmailText = document.getElementById('profileEmailText');
const profileUserIdValue = document.getElementById('profileUserIdValue');
const profileCopyUidBtn = document.getElementById('profileCopyUidBtn');
const profileLanguageSelect = document.getElementById('profileLanguageSelect');
const profileMembershipValue = document.getElementById('profileMembershipValue');
const profileQuotaValue = document.getElementById('profileQuotaValue');
const profileSignOutBtn = document.getElementById('profileSignOutBtn');
const starterInstallResetBtn = document.getElementById('starterInstallResetBtn');
const starterInstallAccessNotice = document.getElementById('starterInstallAccessNotice');
const starterFeatureList = document.getElementById('starterFeatureList');
const premiumFeatureList = document.getElementById('premiumFeatureList');
const professionalFeatureList = document.getElementById('professionalFeatureList');
const professionalTrialFeatureList = document.getElementById('professionalTrialFeatureList');
let currentlyEditingId = null;
let currentlyEditingVideoAssetKey = null;
let currentEditModalMode = 'single';

// Nav Tabs
const navTabs = document.querySelectorAll('.nav-tab');
const controlPanel = document.getElementById('controlPanel');
const settingsPanel = document.getElementById('settingsPanel');

// Settings Elements
const delaySeconds = document.getElementById('delaySeconds');
const delayInc = document.getElementById('delayInc');
const delayDec = document.getElementById('delayDec');
const uiLanguageSelect = document.getElementById('uiLanguage');
const uiThemeSelect = document.getElementById('uiTheme');
const darkModeToggleBtn = document.getElementById('darkModeToggleBtn');
const uiThemeDarkOption = document.getElementById('uiThemeDarkOption');
const logsConfigCard = document.getElementById('logsConfigCard');
const devMembershipSwitcherCard = document.getElementById('devMembershipSwitcherCard');
const devSetStarterBtn = document.getElementById('devSetStarterBtn');
const devSetPremiumBtn = document.getElementById('devSetPremiumBtn');
const devSetProfessionalBtn = document.getElementById('devSetProfessionalBtn');
const devResetTrialBtn = document.getElementById('devResetTrialBtn');
const timeoutSeconds = document.getElementById('timeoutSeconds');
const retryCount = document.getElementById('retryCount');
const autoDownload = document.getElementById('autoDownload');
const flowUpscaledDownload = document.getElementById('flowUpscaledDownload');
const upscaleDownloadLockBadge = document.getElementById('upscaleDownloadLockBadge');
const waitForImageResponse = document.getElementById('waitForImageResponse');
const randomizedDelayCard = document.getElementById('randomizedDelayCard');
const randomizedDelayDetails = document.getElementById('randomizedDelayDetails');
const promptDelaySeconds = document.getElementById('promptDelaySeconds');
const randomizedDelayCustomEnabled = document.getElementById('randomizedDelayCustomEnabled');
const randomizedDelayJitterMaxSeconds = document.getElementById('randomizedDelayJitterMaxSeconds');
const randomizedDelayBreakEveryCount = document.getElementById('randomizedDelayBreakEveryCount');
const randomizedDelayBreakMinMinutes = document.getElementById('randomizedDelayBreakMinMinutes');
const randomizedDelayBreakMaxMinutes = document.getElementById('randomizedDelayBreakMaxMinutes');
const detailedAnalyticsEnabled = document.getElementById('detailedAnalyticsEnabled');
const perPromptAssetsEnabled = document.getElementById('perPromptAssetsEnabled');
const autoMentionEnabled = document.getElementById('autoMentionEnabled');
const autoMentionRow = document.getElementById('autoMentionRow');
const videoMultilinePromptRow = document.getElementById('videoMultilinePromptRow');
const videoMultilinePromptToggle = document.getElementById('videoMultilinePromptToggle');
const videoMultilinePromptLockOverlay = document.getElementById('videoMultilinePromptLockOverlay');
const modelSelect = document.getElementById('modelSelect');
const premiumAssetsGroup = document.getElementById('premiumAssetsGroup');
const premiumAssetsGroupOverlay = document.getElementById('premiumAssetsGroupOverlay');
const labelPremiumAssetsLockedTitle = document.getElementById('labelPremiumAssetsLockedTitle');
const labelPremiumAssetsLockedBody = document.getElementById('labelPremiumAssetsLockedBody');
const characterAssetSection = document.getElementById('characterAssetSection');
const openCharacterAssetPickerBtn = document.getElementById('openCharacterAssetPickerBtn');
const resetCharacterAssetBtn = document.getElementById('resetCharacterAssetBtn');
const characterAssetSelectedList = document.getElementById('characterAssetSelectedList');
const labelCharacterPremiumLocked = document.getElementById('labelCharacterPremiumLocked');
const promptQueueCard = document.getElementById('promptQueueCard');
const referenceAssetSection = document.getElementById('referenceAssetSection');
const labelReferencePremiumLocked = document.getElementById('labelReferencePremiumLocked');
const videoAssetQueueSection = document.getElementById('videoAssetQueueSection');
const videoOptionsPanel = document.getElementById('videoOptionsPanel');
const imageOptionsPanel = document.getElementById('imageOptionsPanel');
const videoModelSelect = document.getElementById('videoModelSelect');
const videoPerPromptModelToggle = document.getElementById('videoPerPromptModelToggle');
const videoOmniEndFrameWarning = document.getElementById('videoOmniEndFrameWarning');
const videoDurationField = document.getElementById('videoDurationField');
const videoDurationBtns = document.getElementById('videoDurationBtns');
const flowTypeVideoBtn = document.getElementById('flowTypeVideoBtn');
const controlOutputTypeCard = document.getElementById('controlOutputTypeCard');

let currentLanguage = 'en';
let lastErrorPopup = { message: '', at: 0 };
let errorPopupCountdownTimer = null;
let activeErrorPopupRecoveryPhase = '';
const UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY = 'flow_unusual_activity_recovery';
let selectedDownloadQuality = '1k';
let downloadPickerAssets = [];
let downloadPickerSelectedIds = new Set();
let downloadPickerCacheKey = '';
const DOWNLOAD_PICKER_SESSION_KEY = 'downloadPickerScanCache';

// The picker's cache normally only lives in this module's memory, so simply
// closing and reopening the side panel (a fresh document/JS context) looked
// like "rescans every time you open it" even though nothing on the page
// changed. Persist the last scan to chrome.storage.session so it survives
// panel reloads within the same browser session; only chrome.storage.session
// (cleared on browser restart) is used, never chrome.storage.local, so stale
// scans never leak across days.
async function hydrateDownloadPickerCacheFromSession() {
    try {
        const data = await chrome.storage.session.get(DOWNLOAD_PICKER_SESSION_KEY);
        const cached = data?.[DOWNLOAD_PICKER_SESSION_KEY];
        if (cached && cached.cacheKey && Array.isArray(cached.assets)) {
            downloadPickerCacheKey = cached.cacheKey;
            downloadPickerAssets = cached.assets;
        }
    } catch { /* chrome.storage.session unavailable — fall back to in-memory only */ }
}

async function persistDownloadPickerCacheToSession() {
    try {
        await chrome.storage.session.set({
            [DOWNLOAD_PICKER_SESSION_KEY]: { cacheKey: downloadPickerCacheKey, assets: downloadPickerAssets }
        });
    } catch { /* ignore */ }
}
let currentFlowContext = { isSubProject: false, isSupported: false };
let referenceAssetPickerDraft = [];
let referenceAssetPickerMode = 'image';
let queueAssetEditTarget = null;
// Draft state for the multi-select ingredient picker (itemId → Set<assetKey>).
// Populated when the picker opens, flushed to storage on Done.
let ingredientPickerDraft = null;
let pendingCsvEntries = [];
let pendingCsvOutputNames = new Map(); // prompt text → outputName, cleared after Add to Queue
let lastUiState = AUTOMATOR_STATE.IDLE;
let lastUiSettings = null;
const YOUTUBE_SUBSCRIBE_URL = 'https://www.youtube.com/channel/UCxwjW4UGkw5bUjmABb0Cnqw?sub_confirmation=1';
const DONATION_URL = 'https://buymeacoffee.com/littleaiplanner';
const USER_GUIDE_URL = 'https://googleautomator.com/user-guide';
const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/google-flow-automator/jincmbkbdocdfgljlmoididhodhenbgm';
const PREMIUM_ACCESS_FORM_URL = 'https://forms.gle/rHvBezk8cTPke2hi8';
const FIREBASE_AUTH_STORAGE_KEY = 'flow_firebase_auth_state';
const FIRESTORE_GATE_CACHE_KEY = 'flow_firestore_gate_cache';
const FIRESTORE_BILLING_CONFIG_CACHE_KEY = 'flow_firestore_billing_config_cache';
const FIRESTORE_PREMIUM_MODAL_CACHE_KEY = 'flow_firestore_premium_modal_cache';
const INSTALL_ID_STORAGE_KEY = 'flow_live_install_id';
const STARTER_INSTALL_ACCESS_CACHE_KEY = 'flow_live_starter_install_access_cache';
const INSTALL_FUNCTIONS_BASE_URL = 'https://us-central1-youtubsubcheck.cloudfunctions.net';
const INSTALL_FUNCTIONS_ORIGIN_PATTERN = 'https://us-central1-youtubsubcheck.cloudfunctions.net/*';
const PRIVATE_LOG_VIEWER_UID = '4vUwl6mdl4TTs6jpBGD1oiZIGSL2';
const PREMIUM_MODAL_CACHE_TTL_MS = 60 * 60 * 1000;
const ACCOUNT_USAGE_STORAGE_KEY = 'flow_account_prompt_usage';
// Production can override this through the exact-admin Starter runtime
// policy. Fifty remains the safe fallback and the unchanged 2.0 limit.
let STARTER_ACCOUNT_PROMPT_LIMIT = 50;
let accountUsageCacheWriteChain = Promise.resolve();
const STARTER_FIXED_PROMPT_DELAY_SECONDS = 30;
const AUTH_DIAGNOSTIC_LOG_KEY = 'flow_auth_diag_last_logged';
const REMOTE_NOTIFICATION_ACK_KEY = 'flow_remote_notification_ack';
const REMOTE_NOTIFICATION_CACHE_KEY = 'flow_remote_notification_cache';
const PROMO_BANNER_CACHE_KEY = 'flow_promo_banner_cache';
const PROMO_BANNER_CACHE_TTL_MS = 60 * 60 * 1000;
const BILLING_CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FIRESTORE_GATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Starter operational policy changes (including maintenance) must take effect
// promptly even though the broader membership profile remains safely cached.
const STARTER_POLICY_CACHE_TTL_MS = 60 * 1000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 60 * 1000;
const EDGE_WEB_AUTH_MAX_ATTEMPTS = 2;
const EDGE_WEB_AUTH_RETRY_DELAY_MS = 800;
const REMOTE_NOTIFICATION_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TRIAL_DAYS = 3;
const DEFAULT_PROFESSIONAL_TRIAL_HOURS = 24;
const TRIAL_RESET_VERSION = '1.6';
const CLOCK_WATERMARK_KEY = 'flow_clock_watermark';
const CLOCK_REWIND_TOLERANCE_MS = 30 * 1000;

let isSigningOut = false;
let gateRefreshInFlight = null;
let gateRemoteCheckedThisPopup = false;
let clockWatermark = 0;
let authRateLimitUntil = 0;
let authRateLimitMessage = '';
let authEmailMode = 'signIn';
let authLandingNoticeTimer = null;


let firebaseAuthState = {
    uid: null,
    email: null,
    displayName: null,
    photoUrl: null,
    emailVerified: false,
    providerId: null,
    idToken: null,
    refreshToken: null,
    expiresAt: 0
};

let gateState = {
    ssoVerified: false,
    subscribed: false,
    subscriberConfirmed: false,
    premium: false,
    supporter: false,
    supporterExpiresAt: null,
    trial: false,
    trialStartedAt: null,
    trialExpiresAt: null,
    disabled: false,
    specialPermission: false,
    professional: false,
    bmcPremium: false,
    bmcHasPaidMembershipMonth: false,
    paid: false,
    refunded: false,
    trialUsed: false,
    trialResetVersion: '',
    membershipTier: 'starter',
    membershipStatus: 'starter',
    paymentProvider: 'none',
    paymentStatus: 'none',
    quotaUsed: 0,
    quotaLimit: STARTER_ACCOUNT_PROMPT_LIMIT,
    quotaUpdatedAt: null,
    quotaResetAt: null,
    starterInstallAllowed: true,
    starterInstallStatus: 'unknown',
    starterInstallResetAvailableAt: null,
    starterMaintenanceEndsAt: null,
    starterMaintenanceMessage: '',
    starterInstallCheckedAt: null,
    starterInstallCheckedUid: null,
    loaded: false,
    source: 'local'
};

let billingConfig = {
    paymentRequired: false,
    trialDays: DEFAULT_TRIAL_DAYS,
    professionalTrialHours: DEFAULT_PROFESSIONAL_TRIAL_HOURS,
    prePremiumAccessEnabled: true,
    loaded: false,
    source: 'default'
};

let premiumModalConfig = {
    message: null,           // null = use default translated text
    showFormBtn: true,       // false = hide Request Access Form button
    formUrl: null,           // null = use PREMIUM_ACCESS_FORM_URL
    showSupporterBtn: true,  // false = hide Become a Supporter button
    supporterUrl: null,      // null = falls back to PREMIUM_ACCESS_FORM_URL
    supporterLabel: null,    // null = use default label
    loaded: false
};

let devSwitcherAllowedCached = false;

async function updateDevSwitcherAllowedCache() {
    const uid = firebaseAuthState.uid;
    if (!uid) {
        devSwitcherAllowedCached = false;
        return;
    }
    try {
        const msgBuffer = new TextEncoder().encode(uid);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        devSwitcherAllowedCached = hashHex === '8bea09443c8d01aa9b2daa4b2b6bfbe96195c4455799d523fa8e0193ec74643c';
    } catch (e) {
        devSwitcherAllowedCached = false;
    }
}

async function loadFirebaseAuthState() {
    const data = await chrome.storage.local.get(FIREBASE_AUTH_STORAGE_KEY);
    const raw = data[FIREBASE_AUTH_STORAGE_KEY];
    if (raw && typeof raw === 'object') {
        firebaseAuthState = {
            uid: raw.uid || null,
            email: raw.email || null,
            displayName: raw.displayName || null,
            photoUrl: raw.photoUrl || null,
            emailVerified: raw.emailVerified === true,
            providerId: raw.providerId || null,
            idToken: raw.idToken || null,
            refreshToken: raw.refreshToken || null,
            expiresAt: raw.expiresAt || 0
        };
    }
    await updateDevSwitcherAllowedCache();
}

async function saveFirebaseAuthState() {
    if (isSigningOut) return;
    await updateDevSwitcherAllowedCache();
    await chrome.storage.local.set({ [FIREBASE_AUTH_STORAGE_KEY]: firebaseAuthState });
}

async function clearFirebaseAuthState() {
    firebaseAuthState = { uid: null, email: null, displayName: null, photoUrl: null, emailVerified: false, providerId: null, idToken: null, refreshToken: null, expiresAt: 0 };
    devSwitcherAllowedCached = false;
    await chrome.storage.local.remove(FIREBASE_AUTH_STORAGE_KEY);
}

async function clearGateStateCache() {
    gateState = {
        ssoVerified: false,
        subscribed: false,
        premium: false,
        trial: false,
        trialStartedAt: null,
        trialExpiresAt: null,
        disabled: false,
        specialPermission: false,
        loaded: true,
        source: 'local'
    };
    await chrome.storage.local.remove(FIRESTORE_GATE_CACHE_KEY);
}

function parseRetryAfterMs(headerValue) {
    if (!headerValue) return DEFAULT_RATE_LIMIT_BACKOFF_MS;

    const seconds = parseInt(headerValue, 10);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return seconds * 1000;
    }

    const retryAt = Date.parse(headerValue);
    if (Number.isFinite(retryAt)) {
        return Math.max(retryAt - Date.now(), DEFAULT_RATE_LIMIT_BACKOFF_MS);
    }

    return DEFAULT_RATE_LIMIT_BACKOFF_MS;
}

function markAuthRateLimited(response, fallbackMessage) {
    const retryAfterMs = parseRetryAfterMs(response?.headers?.get('retry-after'));
    authRateLimitUntil = Date.now() + retryAfterMs;
    authRateLimitMessage = fallbackMessage || 'Rate limited by Google. Please wait a minute and try again.';
    return authRateLimitMessage;
}

function getActiveAuthRateLimitMessage() {
    if (Date.now() < authRateLimitUntil) {
        return authRateLimitMessage || 'Rate limited by Google. Please wait a minute and try again.';
    }

    authRateLimitUntil = 0;
    authRateLimitMessage = '';
    return '';
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createOAuthState() {
    const fallback = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
        const values = new Uint32Array(2);
        crypto.getRandomValues(values);
        return `${Date.now()}-${values[0].toString(36)}${values[1].toString(36)}`;
    } catch (_) {
        return fallback;
    }
}

function isRetryableEdgeOAuthError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    if (!message) return false;
    if (message.includes('cancel') || message.includes('access_denied') || message.includes('denied')) {
        return false;
    }
    return [
        'redirect_uri',
        'redirect uri',
        'redirect_uri_mismatch',
        'invalid request',
        'request is invalid',
        'authorization page could not be loaded',
        'authorization flow failed',
        'oauth2 policy',
        'could not load'
    ].some(pattern => message.includes(pattern));
}

async function getChromeGoogleAccessToken(interactive = true, scopes = null, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
            if (finished) return;
            finished = true;
            reject(new Error('Google auth request timed out. Please try again.'));
        }, timeoutMs);

        const details = scopes?.length ? { interactive, scopes } : { interactive };
        chrome.identity.getAuthToken(details, (token) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (!token) {
                reject(new Error('No Google access token returned.'));
                return;
            }
            resolve(token);
        });
    });
}

function launchGoogleWebAuthFlow(authUrl, timeoutMs) {
    return new Promise((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
            if (finished) return;
            finished = true;
            reject(new Error('Google web auth request timed out. Please try again.'));
        }, timeoutMs);

        chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, (redirectedTo) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);

            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (!redirectedTo) {
                reject(new Error('No Google auth redirect returned.'));
                return;
            }

            const parsed = new URL(redirectedTo);
            const params = new URLSearchParams(parsed.hash.replace(/^#/, '') || parsed.search.replace(/^\?/, ''));
            const token = params.get('access_token');
            const error = params.get('error');

            if (error) {
                reject(new Error(`Google OAuth error: ${error}`));
                return;
            }
            if (!token) {
                reject(new Error('No Google access token returned from web auth flow.'));
                return;
            }
            resolve(token);
        });
    });
}

async function getGoogleAccessTokenViaWebAuthFlow(scopes = ['openid', 'email', 'profile'], timeoutMs = 120000) {
    const clientId = getGoogleOAuthWebClientId();
    const redirectUri = getGoogleOAuthRedirectUri();
    if (!clientId) {
        throw new Error(`Google SSO web fallback is not configured. In Google Cloud, create an OAuth client of type "Web application", add this exact Authorized redirect URI: ${redirectUri}, then paste that Web client ID into shared/firebase-config.js as firebaseConfig.googleOAuthWebClientId.`);
    }

    for (let attempt = 1; attempt <= EDGE_WEB_AUTH_MAX_ATTEMPTS; attempt += 1) {
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scopes.join(' '));
        authUrl.searchParams.set('prompt', 'select_account');
        authUrl.searchParams.set('state', createOAuthState());

        try {
            return await launchGoogleWebAuthFlow(authUrl, timeoutMs);
        } catch (error) {
            const shouldRetry = attempt < EDGE_WEB_AUTH_MAX_ATTEMPTS && isRetryableEdgeOAuthError(error);
            if (!shouldRetry) {
                throw error;
            }
            await storage.addLog(`SSO: web auth retry ${attempt}/${EDGE_WEB_AUTH_MAX_ATTEMPTS} after transient error (${error.message})`, 'info');
            showGateStatus(t('signingInGoogle'));
            await wait(EDGE_WEB_AUTH_RETRY_DELAY_MS);
        }
    }

    throw new Error('Google web auth failed after retry.');
}

async function getGoogleAccessToken(interactive = true, scopes = ['openid', 'email', 'profile']) {
    try {
        return await getChromeGoogleAccessToken(interactive, scopes);
    } catch (error) {
        const browserLabel = isMicrosoftEdge() ? 'Edge' : 'Chrome';
        await storage.addLog(`SSO: ${browserLabel} getAuthToken fallback to web auth flow (${error.message})`, 'info');
        return await getGoogleAccessTokenViaWebAuthFlow(scopes);
    }
}

async function signInFirebaseWithGoogleAccessToken(googleAccessToken) {
    const activeRateLimitMessage = getActiveAuthRateLimitMessage();
    if (activeRateLimitMessage) {
        throw new Error(activeRateLimitMessage);
    }

    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`;
    const authRequestUri = `https://${firebaseConfig.authDomain}/__/auth/handler`;
    const body = {
        postBody: `access_token=${encodeURIComponent(googleAccessToken)}&providerId=google.com`,
        requestUri: authRequestUri,
        returnSecureToken: true,
        returnIdpCredential: true
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) {
        if (res.status === 429) {
            throw new Error(markAuthRateLimited(res, json?.error?.message || 'Google sign-in is temporarily rate limited.'));
        }
        throw new Error(getFriendlyEmailAuthError(json?.error?.message || 'Firebase sign-in failed.'));
    }

    firebaseAuthState.uid = json.localId || null;
    firebaseAuthState.email = json.email || firebaseAuthState.email || null;
    firebaseAuthState.displayName = json.displayName || firebaseAuthState.displayName || null;
    firebaseAuthState.photoUrl = json.photoUrl || firebaseAuthState.photoUrl || null;
    firebaseAuthState.emailVerified = true;
    firebaseAuthState.providerId = 'google.com';
    firebaseAuthState.idToken = json.idToken || null;
    firebaseAuthState.refreshToken = json.refreshToken || null;
    firebaseAuthState.expiresAt = Date.now() + (parseInt(json.expiresIn || '3600', 10) - 30) * 1000;
    await saveFirebaseAuthState();
    return firebaseAuthState.uid;
}

async function signInFirebaseWithEmailPassword(email, password, { createAccount = false } = {}) {
    const activeRateLimitMessage = getActiveAuthRateLimitMessage();
    if (activeRateLimitMessage) {
        throw new Error(activeRateLimitMessage);
    }

    const endpoint = createAccount ? 'accounts:signUp' : 'accounts:signInWithPassword';
    const url = `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
        })
    });
    const json = await res.json();
    if (!res.ok) {
        if (res.status === 429) {
            throw new Error(markAuthRateLimited(res, json?.error?.message || 'Email sign-in is temporarily rate limited.'));
        }
        throw new Error(getFriendlyEmailAuthError(json?.error?.message || 'Email sign-in failed.'));
    }

    firebaseAuthState.uid = json.localId || null;
    firebaseAuthState.email = json.email || email || null;
    firebaseAuthState.displayName = json.displayName || firebaseAuthState.email?.split('@')[0] || null;
    firebaseAuthState.photoUrl = null;
    firebaseAuthState.emailVerified = json.emailVerified === true;
    firebaseAuthState.providerId = 'password';
    firebaseAuthState.idToken = json.idToken || null;
    firebaseAuthState.refreshToken = json.refreshToken || null;
    firebaseAuthState.expiresAt = Date.now() + (parseInt(json.expiresIn || '3600', 10) - 30) * 1000;
    await saveFirebaseAuthState();
    return firebaseAuthState.uid;
}

async function sendFirebasePasswordReset(email) {
    const trimmedEmail = String(email || '').trim();
    if (!trimmedEmail) {
        throw new Error(t('emailRequired'));
    }
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: trimmedEmail
        })
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(getFriendlyEmailAuthError(json?.error?.message || 'Password reset failed.'));
    }
}

async function sendFirebaseEmailVerification() {
    const ok = await refreshFirebaseIdTokenIfNeeded();
    if (!ok || !firebaseAuthState.idToken) {
        throw new Error(t('emailVerificationSignInAgain'));
    }
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requestType: 'VERIFY_EMAIL',
            idToken: firebaseAuthState.idToken
        })
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(getFriendlyEmailAuthError(json?.error?.message || 'Email verification failed.'));
    }
}

async function refreshFirebaseEmailVerificationStatus() {
    const ok = await refreshFirebaseIdTokenIfNeeded();
    if (!ok || !firebaseAuthState.idToken) return false;
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebaseAuthState.idToken })
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(getFriendlyEmailAuthError(json?.error?.message || 'Email verification lookup failed.'));
    }
    const user = Array.isArray(json.users) ? json.users[0] : null;
    firebaseAuthState.emailVerified = user?.emailVerified === true;
    firebaseAuthState.email = user?.email || firebaseAuthState.email || null;
    firebaseAuthState.displayName = user?.displayName || firebaseAuthState.displayName || null;
    firebaseAuthState.photoUrl = user?.photoUrl || firebaseAuthState.photoUrl || null;
    await saveFirebaseAuthState();
    return firebaseAuthState.emailVerified === true;
}

async function requireVerifiedEmailForPasswordAuth({ resend = false } = {}) {
    if (firebaseAuthState.providerId !== 'password') return true;
    const verified = await refreshFirebaseEmailVerificationStatus();
    if (verified) return true;
    if (resend) {
        await sendFirebaseEmailVerification();
    }
    await clearGateStateCache();
    await refreshUI();
    showGateStatus(resend ? t('emailVerificationSent') : t('emailVerificationRequired'), true);
    return false;
}

async function refreshFirebaseIdTokenIfNeeded() {
    if (isSigningOut) return false;
    if (!firebaseAuthState.refreshToken) return false;
    if (firebaseAuthState.idToken && Date.now() < firebaseAuthState.expiresAt) return true;

    const activeRateLimitMessage = getActiveAuthRateLimitMessage();
    if (activeRateLimitMessage) {
        console.warn('Skipping Firebase token refresh during cooldown:', activeRateLimitMessage);
        return false;
    }

    const url = `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`;
    const form = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: firebaseAuthState.refreshToken
    });

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString()
    });
    const json = await res.json();
    if (!res.ok) {
        if (res.status === 429) {
            markAuthRateLimited(res, json?.error?.message || 'Token refresh is temporarily rate limited.');
        }
        return false;
    }
    if (isSigningOut) return false;

    firebaseAuthState.idToken = json.id_token || null;
    firebaseAuthState.refreshToken = json.refresh_token || firebaseAuthState.refreshToken;
    firebaseAuthState.uid = json.user_id || firebaseAuthState.uid;
    firebaseAuthState.expiresAt = Date.now() + (parseInt(json.expires_in || '3600', 10) - 30) * 1000;
    await saveFirebaseAuthState();
    return true;
}

function readFirestoreBoolean(fields, key) {
    const val = fields?.[key];
    if (!val) return false;
    if (typeof val.booleanValue === 'boolean') return val.booleanValue;
    if (val.booleanValue === 'true') return true;
    return false;
}

function readFirestoreNumber(fields, key, fallback = 0) {
    const val = fields?.[key];
    if (!val) return fallback;
    const raw = val.integerValue ?? val.doubleValue ?? val.stringValue;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function readFirestoreString(fields, key, fallback = '') {
    const val = fields?.[key];
    if (!val) return fallback;
    return String(val.stringValue || val.integerValue || val.doubleValue || fallback);
}

function readFirestoreTimestampMs(fields, key) {
    const value = fields?.[key];
    if (!value) return null;
    const raw = value.timestampValue || value.stringValue || value.integerValue || null;
    if (!raw) return null;
    const parsed = /^\d+$/.test(String(raw)) ? Number(raw) : Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function hasFirestoreField(fields, key) {
    return Object.prototype.hasOwnProperty.call(fields || {}, key);
}

function getNextLocalMidnightMs(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

function mergeAccountUsageWithoutRollback(existing = {}, incoming = {}, now = Date.now()) {
    const normalizedIncoming = {
        ...incoming,
        uid: incoming.uid || null,
        count: Math.max(0, Number(incoming.count) || 0),
        limit: STARTER_ACCOUNT_PROMPT_LIMIT,
        dateKey: incoming.dateKey || getLocalDateKey(),
        updatedAt: Number(incoming.updatedAt) || now,
        resetAt: Number(incoming.resetAt) || getNextLocalMidnightMs(),
        refundVersion: Math.max(0, Number(incoming.refundVersion) || 0)
    };
    const existingResetAt = Number(existing.resetAt) || 0;
    const incomingResetAt = Number(normalizedIncoming.resetAt) || 0;
    const sameWindow = !!normalizedIncoming.uid
        && existing.uid === normalizedIncoming.uid
        && existingResetAt > now
        && incomingResetAt > now;
    if (!sameWindow) return normalizedIncoming;

    const existingRefundVersion = Math.max(0, Number(existing.refundVersion) || 0);
    if (normalizedIncoming.refundVersion > existingRefundVersion) {
        // A newer server-issued refund receipt is the only authority allowed
        // to lower same-window usage.
        return normalizedIncoming;
    }
    if (normalizedIncoming.refundVersion < existingRefundVersion) {
        return {
            ...normalizedIncoming,
            count: Math.max(0, Number(existing.count) || 0),
            dateKey: existing.dateKey || normalizedIncoming.dateKey,
            updatedAt: Math.max(Number(existing.updatedAt) || 0, normalizedIncoming.updatedAt),
            resetAt: Math.min(existingResetAt, incomingResetAt),
            refundVersion: existingRefundVersion
        };
    }

    return {
        ...normalizedIncoming,
        count: Math.max(Math.max(0, Number(existing.count) || 0), normalizedIncoming.count),
        dateKey: normalizedIncoming.dateKey || existing.dateKey || getLocalDateKey(),
        updatedAt: Math.max(Number(existing.updatedAt) || 0, normalizedIncoming.updatedAt),
        // Never let a stale response extend the current quota window.
        resetAt: Math.min(existingResetAt, incomingResetAt)
    };
}

async function cacheAccountUsage({ uid = firebaseAuthState.uid, count = 0, limit = STARTER_ACCOUNT_PROMPT_LIMIT, updatedAt = Date.now(), resetAt = null, dateKey = getLocalDateKey(), refundVersion = 0 } = {}) {
    if (!uid) return;
    const incoming = {
        uid,
        count: Math.max(0, Number(count) || 0),
        limit: STARTER_ACCOUNT_PROMPT_LIMIT,
        dateKey: dateKey || getLocalDateKey(),
        updatedAt: Number(updatedAt) || Date.now(),
        resetAt: Number(resetAt) || getNextLocalMidnightMs(),
        refundVersion: Math.max(0, Number(refundVersion) || 0)
    };
    const writeTask = accountUsageCacheWriteChain.catch(() => {}).then(async () => {
        const stored = await chrome.storage.local.get(ACCOUNT_USAGE_STORAGE_KEY);
        const usage = mergeAccountUsageWithoutRollback(stored[ACCOUNT_USAGE_STORAGE_KEY] || {}, incoming);
        await chrome.storage.local.set({ [ACCOUNT_USAGE_STORAGE_KEY]: usage });
        if (usage.count > incoming.count) {
            // The server response arrived before the latest local increment was
            // mirrored. Keep the higher local count and heal Firestore in the
            // background; Run is blocked immediately from the local value.
            patchFirestoreQuota({ used: usage.count, resetAt: usage.resetAt }).catch(() => false);
        }
        return usage;
    });
    accountUsageCacheWriteChain = writeTask.then(() => undefined, () => undefined);
    return writeTask;
}

async function patchFirestoreQuota({ used, limit = STARTER_ACCOUNT_PROMPT_LIMIT, resetAt = null } = {}) {
    const ok = await refreshFirebaseIdTokenIfNeeded();
    if (!ok || !firebaseAuthState.uid || !firebaseAuthState.idToken) return false;

    const fieldPaths = ['quota_used', 'quota_limit', 'quota_date_key', 'quota_updated_at'];
    const fields = {
        quota_used: { integerValue: String(Math.max(0, Number(used) || 0)) },
        quota_limit: { integerValue: String(STARTER_ACCOUNT_PROMPT_LIMIT) },
        quota_date_key: { stringValue: getLocalDateKey() },
        quota_updated_at: { timestampValue: new Date().toISOString() }
    };
    if (resetAt) {
        fieldPaths.push('quota_reset_at');
        fields.quota_reset_at = { timestampValue: new Date(resetAt).toISOString() };
    }

    const fieldParams = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${firebaseAuthState.uid}?${fieldParams}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${firebaseAuthState.idToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });
    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.warn('Quota sync failed:', json?.error?.message || res.statusText);
        return false;
    }
    return true;
}

function toFirestoreTimestamp(ms) {
    const time = Number(ms);
    if (!Number.isFinite(time) || time <= 0) return null;
    return new Date(time).toISOString();
}

async function loadClockWatermark() {
    const stored = await chrome.storage.local.get(CLOCK_WATERMARK_KEY);
    clockWatermark = Number(stored[CLOCK_WATERMARK_KEY] || 0);
}

async function updateClockWatermark() {
    const now = Date.now();
    if (now > clockWatermark) {
        clockWatermark = now;
        await chrome.storage.local.set({ [CLOCK_WATERMARK_KEY]: clockWatermark });
    }
}

function isClockRewound() {
    return clockWatermark > 0 && Date.now() < clockWatermark - CLOCK_REWIND_TOLERANCE_MS;
}

// Returns an estimated server-side "now" using the server time captured at the
// last Firestore fetch plus elapsed local time. If the local clock is rewound,
// elapsed is clamped to 0 so the estimate only moves forward.
function getEstimatedServerNow() {
    const serverBase = Number(gateState?.serverTimeAtFetch || 0);
    const localBase = Number(gateState?.localTimeAtFetch || 0);
    if (!serverBase || !localBase) return Date.now();
    const elapsed = Math.max(0, Date.now() - localBase);
    return serverBase + elapsed;
}

function getDefaultTrialWindow(now = Date.now()) {
    const days = Math.max(1, Math.min(30, Number(billingConfig.trialDays) || DEFAULT_TRIAL_DAYS));
    // Buffer for Firestore server clock skew:
    // - startedAt: 2 min in the past so it passes the ">= request.time - 5min" rule check
    // - expiresAt: 10 min short of 72h so it stays under the "<= request.time + 72h" ceiling
    const startBuffer = 2 * 60 * 1000;
    const endBuffer = 10 * 60 * 1000;
    return {
        startedAt: now - startBuffer,
        expiresAt: now + days * 24 * 60 * 60 * 1000 - endBuffer
    };
}

function getDefaultProfessionalTrialWindow(now = Date.now()) {
    const hours = Math.max(1, Math.min(720, Number(billingConfig.professionalTrialHours) || DEFAULT_PROFESSIONAL_TRIAL_HOURS));
    // Same clock-skew buffer pattern as the Premium trial.
    const startBuffer = 2 * 60 * 1000;
    const endBuffer = 10 * 60 * 1000;
    return {
        startedAt: now - startBuffer,
        expiresAt: now + hours * 60 * 60 * 1000 - endBuffer
    };
}

function getTrialCtaLabel(tier) {
    const professional = tier === 'professional';
    const amount = professional
        ? Math.max(1, Math.min(720, Number(billingConfig.professionalTrialHours) || DEFAULT_PROFESSIONAL_TRIAL_HOURS))
        : Math.max(1, Math.min(30, Number(billingConfig.trialDays) || DEFAULT_TRIAL_DAYS));
    const language = String(currentLanguage || 'en').toLowerCase();
    const plan = professional ? 'Professional' : 'Premium';
    const unit = professional ? 'hours' : 'days';
    if (language.startsWith('ko')) return `${amount}${professional ? '시간' : '일'} ${plan} 체험하기`;
    if (language.startsWith('ja')) return `${plan} を${amount}${professional ? '時間' : '日間'}試す`;
    if (language.startsWith('zh')) return `试用 ${plan} ${amount} ${professional ? '小时' : '天'}`;
    if (language.startsWith('de')) return `${plan} ${amount} ${professional ? `Stunde${amount === 1 ? '' : 'n'}` : `Tag${amount === 1 ? '' : 'e'}`} testen`;
    if (language.startsWith('fr')) return `Essayer ${plan} pendant ${amount} ${professional ? `heure${amount === 1 ? '' : 's'}` : `jour${amount === 1 ? '' : 's'}`}`;
    if (language.startsWith('hi')) return `${plan} को ${amount} ${professional ? 'घंटे' : 'दिन'} के लिए आज़माएँ`;
    const label = unit === 'hours' ? `Hour${amount === 1 ? '' : 's'}` : `Day${amount === 1 ? '' : 's'}`;
    return `Try ${plan} for ${amount} ${label}`;
}

function isGateTrialActive(gate = gateState, now = getEstimatedServerNow()) {
    const expiresAt = Number(gate?.trialExpiresAt || 0);
    return gate?.trial === true && Number.isFinite(expiresAt) && expiresAt > now;
}

function getSupporterEntitlementState(gate = gateState, now = getEstimatedServerNow()) {
    const enabled = gate?.supporter === true;
    const expiresAt = Number(gate?.supporterExpiresAt || 0);
    return {
        enabled,
        expiresAt,
        // Legacy Supporters have no expiry field and remain active until an
        // administrator assigns one.
        active: enabled && (!expiresAt || expiresAt > now),
        expired: enabled && expiresAt > 0 && expiresAt <= now
    };
}

function hasActiveSupporterEntitlement(gate = gateState, now = getEstimatedServerNow()) {
    return getSupporterEntitlementState(gate, now).active;
}

function isTrialExpired(gate = gateState, now = getEstimatedServerNow()) {
    return gate?.trialUsed === true
        && !isGateTrialActive(gate, now)
        && !hasActivePaidMembership(gate)
        && gate?.premium !== true
        && !hasActiveSupporterEntitlement(gate, now)
        && gate?.professional !== true
        && gate?.prePremium !== true
        && gate?.specialPermission !== true
        && !hasRemotePremiumMembership(gate)
        && !isProfessionalTrialActive(gate, now);
}

// Stripe subscription statuses that still grant access: 'active' and
// 'trialing' are self-explanatory; 'past_due' is kept as a payment-retry
// grace window (Stripe retries the charge for days before cancelling).
const ACTIVE_PAYMENT_STATUSES = ['active', 'trialing', 'past_due'];
// Terminal Stripe statuses — access must end even if boolean flags linger.
const LAPSED_PAYMENT_STATUSES = ['canceled', 'cancelled', 'unpaid', 'incomplete_expired', 'paused', 'refunded'];
// Grace period past current_period_end before a missed webhook locks the user
// out anyway (renewal webhooks normally extend the period well before this).
const SUBSCRIPTION_PERIOD_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

function hasActivePaidMembership(gate = gateState) {
    return gate?.paid === true
        && ACTIVE_PAYMENT_STATUSES.includes(String(gate?.paymentStatus || '').toLowerCase())
        && gate?.refunded !== true
        && gate?.disabled !== true
        && !isStripeSubscriptionLapsed(gate);
}

function canSubmitPaidBugReport(gate = gateState) {
    const signedInUid = firebaseAuthState.uid || gate?.uid || null;
    if (!signedInUid) return false;
    // Show the owner a test control as soon as the verified Firebase UID is
    // restored, even if a stale membership cache still carries a terminal
    // payment flag. The server remains the security boundary and still
    // requires the exact UID, verified email and non-revoked ID token before
    // accepting the report.
    const exactAdminTestAccess = signedInUid === PRIVATE_LOG_VIEWER_UID;
    if (exactAdminTestAccess) return true;
    if (gate?.disabled === true || gate?.refunded === true) return false;
    // Admin-granted Professional access and active Supporter access are valid
    // independently of an old Stripe cancellation status that may still be
    // present on the account document.
    if (gate?.professional === true
        || gate?.specialPermission === true
        || hasActiveSupporterEntitlement(gate)) return true;
    const paymentStatus = String(gate?.paymentStatus || '').toLowerCase();
    if (['refunded', 'canceled', 'cancelled', 'unpaid', 'incomplete_expired', 'paused'].includes(paymentStatus)) {
        return false;
    }
    const periodEnd = Number(gate?.currentPeriodEnd || 0);
    const stripePaid = String(gate?.paymentProvider || '').toLowerCase() === 'stripe'
        && gate?.paid === true
        && ['active', 'past_due'].includes(paymentStatus)
        && Number.isFinite(periodEnd)
        && periodEnd > getEstimatedServerNow();
    const buyMeACoffeePaid = gate?.bmcPremium === true || gate?.bmcHasPaidMembershipMonth === true;
    const membershipTier = String(gate?.membershipTier || '').trim().toLowerCase();
    const remotePaidTier = !getSupporterEntitlementState(gate).expired
        && gate?.prePremium !== true
        && !isGateTrialActive(gate)
        && !isProfessionalTrialActive(gate)
        && ['premium', 'professional', 'pro'].includes(membershipTier);
    // Production already has server-managed Premium/Professional/Supporter
    // users created before provider evidence fields existed. Their paid tier
    // remains valid; Pre-Premium and both trial types use separate fields and
    // are deliberately not included here.
    const existingPaidTier = gate?.premium === true
        || gate?.professional === true
        || hasActiveSupporterEntitlement(gate)
        || remotePaidTier;
    return stripePaid || buyMeACoffeePaid || existingPaidTier;
}

// Defense-in-depth for Stripe: even if a cancellation/expiry webhook never
// lands (server down, event dropped), a subscription whose status is terminal
// or whose paid period ended more than the grace window ago stops unlocking
// features. Admin-granted access should use special_permission / supporter,
// which are exempt here.
function isStripeSubscriptionLapsed(gate = gateState, now = getEstimatedServerNow()) {
    if (String(gate?.paymentProvider || '').toLowerCase() !== 'stripe') return false;
    if (gate?.specialPermission === true || hasActiveSupporterEntitlement(gate, now)) return false;
    const status = String(gate?.paymentStatus || '').toLowerCase();
    if (LAPSED_PAYMENT_STATUSES.includes(status)) return true;
    const periodEnd = Number(gate?.currentPeriodEnd || 0);
    return Number.isFinite(periodEnd) && periodEnd > 0 && now > periodEnd + SUBSCRIPTION_PERIOD_GRACE_MS;
}

function getNormalizedMembershipValue(gate = gateState) {
    return String(gate?.membershipTier || gate?.membershipStatus || '')
        .trim()
        .toLowerCase();
}

function hasRemotePremiumMembership(gate = gateState) {
    if (getSupporterEntitlementState(gate).expired
        && gate?.specialPermission !== true
        && gate?.premium !== true
        && gate?.professional !== true
        && String(gate?.paymentProvider || '').toLowerCase() !== 'stripe') return false;
    const membership = getNormalizedMembershipValue(gate);
    return membership === 'premium'
        || membership === 'professional'
        || membership === 'pro'
        || membership === 'paid'
        || membership === 'active';
}

function hasRemoteProfessionalMembership(gate = gateState) {
    if (getSupporterEntitlementState(gate).expired
        && gate?.specialPermission !== true
        && gate?.professional !== true
        && String(gate?.paymentProvider || '').toLowerCase() !== 'stripe') return false;
    const membership = getNormalizedMembershipValue(gate);
    return membership === 'professional' || membership === 'pro';
}

// Professional and the "Supporter" badge are the same access level — either
// the admin-only `professional` flag or the existing `supporter` flag grants
// it, plus the self-serve 24h professional trial below.
function isProfessionalTrialActive(gate = gateState, now = getEstimatedServerNow()) {
    const expiresAt = Number(gate?.professionalTrialExpiresAt || 0);
    return Number.isFinite(expiresAt) && expiresAt > now;
}

function hasProfessionalTierAccess(gate = gateState, now = getEstimatedServerNow()) {
    if (gate?.professional === true || hasActiveSupporterEntitlement(gate, now) || gate?.specialPermission === true) return true;
    if (hasRemoteProfessionalMembership(gate)) return true;
    return isProfessionalTrialActive(gate, now);
}

// Pre-Premium grants Premium-equivalent access, but an admin can mass-
// downgrade the whole Pre-Premium cohort to Starter via the "Pre-Premium
// Access" toggle (ON = Pre-Premium gets Premium features, OFF = Starter
// only) without touching real Premium subscribers. Defaults to enabled
// (true) when unset, so nothing changes unless an admin explicitly turns
// it off.
function isPrePremiumAccessEnabled(billingCfg = billingConfig) {
    return billingCfg?.prePremiumAccessEnabled !== false;
}

function hasEffectivePremiumAccess(gate = gateState, billingCfg = billingConfig) {
    if (gate?.premium === true) return true;
    if (gate?.prePremium === true) return isPrePremiumAccessEnabled(billingCfg);
    return false;
}

function canUsePremiumOnlyTools(gate = gateState) {
    if (isStripeSubscriptionLapsed(gate) && !isGateTrialActive(gate)) return false;
    return !!firebaseAuthState.uid
        && (hasEffectivePremiumAccess(gate) || hasProfessionalTierAccess(gate) || hasActivePaidMembership(gate) || hasRemotePremiumMembership(gate) || isGateTrialActive(gate))
        && gate?.disabled !== true
        && !isTrialExpired(gate)
        && gate?.refunded !== true
        && gate?.paymentStatus !== 'refunded';
}

function canUsePerPromptAssets(gate = gateState) {
    return canUsePremiumOnlyTools(gate);
}

function canBrowseCharacterReferenceAssets(gate = gateState) {
    return !!firebaseAuthState.uid && canUsePerPromptAssets(gate);
}

function canUseUpscaledGeneratedDownload(gate = gateState) {
    return canUsePremiumOnlyTools(gate);
}

function canUseBasicImageDownloader(gate = gateState) {
    // Starters get basic auto-download (1K) just by being logged in
    return !!firebaseAuthState.uid
        && gate?.disabled !== true;
}

function canPreviewPremiumLockedTools(gate = gateState) {
    return !!firebaseAuthState.uid
        && gate?.ssoVerified === true
        && gate?.disabled !== true;
}

function isAccountDisabled(gate = gateState) {
    return !!firebaseAuthState.uid && gate?.disabled === true;
}

function getAccountDisabledMessage() {
    return t('trialExpiredDisabled');
}

function getStarterInstallRestrictionMessage(gate = gateState) {
    const status = String(gate?.starterInstallStatus || 'locked');
    if (status === 'host_permission_required') {
        return t('starterSecurityPermissionRequired');
    }
    if (status === 'starter_maintenance') {
        const endsAt = Number(gate?.starterMaintenanceEndsAt || 0);
        const resumeText = endsAt > Date.now() ? new Date(endsAt).toLocaleString('en-AU') : 'the scheduled end time';
        const reason = String(gate?.starterMaintenanceMessage || '').trim()
            || 'Starter access is temporarily paused due to server maintenance or high demand.';
        return `${reason} Starter access will resume automatically at ${resumeText}. Supporter and Pro memberships are unaffected.`;
    }
    if (status === 'install_account_limit') {
        return currentLanguage === 'ko'
            ? '이 브라우저는 이미 다른 Starter(무료) 계정에 등록되어 있습니다. Starter는 브라우저당 한 계정만 사용할 수 있어 현재 계정으로는 앱에 접속할 수 없습니다. 등록된 계정을 사용하거나 현재 계정을 Premium으로 업그레이드하세요.'
            : 'This browser is already registered to a different Starter (Free) account. Starter allows only one account per browser, so this account cannot access the app. Use the registered account or upgrade this account to Premium.';
    }
    if (status === 'needs_reset') {
        return currentLanguage === 'ko'
            ? '48시간 보안 대기가 끝났습니다. 이제 Starter 권한을 이 브라우저로 옮길 수 있습니다.'
            : 'The 48-hour security wait is complete. Starter access can now be moved to this browser.';
    }
    const availableAt = Number(gate?.starterInstallResetAvailableAt || 0);
    if (availableAt > Date.now()) {
        const date = new Date(availableAt).toLocaleString(currentLanguage === 'ko' ? 'ko-KR' : 'en-US');
        return currentLanguage === 'ko'
            ? `이 브라우저는 이미 다른 Starter(무료) 계정에 등록되어 있습니다. Starter는 브라우저당 한 계정만 사용할 수 있어 현재 계정으로는 아직 앱에 접속할 수 없습니다. 등록된 계정을 사용하거나 현재 계정을 Premium으로 업그레이드하세요. 또는 ${date} 이후 Starter 권한을 이 브라우저로 옮길 수 있습니다.`
            : `This browser is already registered to a different Starter (Free) account. Starter allows only one account per browser, so this account cannot access the app yet. Use the registered account, upgrade this account to Premium, or move Starter access to this browser after ${date}.`;
    }
    return currentLanguage === 'ko'
        ? '이 브라우저는 이미 다른 Starter(무료) 계정에 등록되어 있어 현재 계정으로는 앱에 접속할 수 없습니다. 등록된 계정을 사용하거나 현재 계정을 Premium으로 업그레이드하세요.'
        : 'This browser is already registered to a different Starter (Free) account, so this account cannot access the app. Use the registered account or upgrade this account to Premium.';
}

function getUpscaleDownloadQuality(gate = gateState) {
    return getMembershipTier(gate) === 'professional' ? '4k' : '2k';
}

function applyUpscaleDownloadCopy() {
    const quality = getUpscaleDownloadQuality().toUpperCase();
    const replaceQuality = (value) => String(value || '').replace(/2K|2k/g, quality);
    if (labelUpscaleDownload) {
        labelUpscaleDownload.textContent = replaceQuality(t('upscaleDownload'));
    }
    if (labelUpscaleDownloadNote) {
        labelUpscaleDownloadNote.textContent = replaceQuality(t('upscaleDownloadNote'));
    }
    if (upscaleDownloadQualityPill) {
        const isProfessional = quality === '4K';
        upscaleDownloadQualityPill.textContent = t(isProfessional ? 'upscaleQualityProfessional' : 'upscaleQualityPremium');
        upscaleDownloadQualityPill.classList.toggle('professional', isProfessional);
    }
}

function isFreeAccessTier(tier) {
    return tier === 'starter' || tier === 'trial';
}

function hasFinalStarterInstallDecision(gate = gateState) {
    const uid = firebaseAuthState.uid || null;
    if (!uid || !isFreeAccessTier(getMembershipTier(gate))) return true;
    const status = String(gate?.starterInstallStatus || 'unknown');
    return gate?.starterInstallCheckedUid === uid
        && Number(gate?.starterInstallCheckedAt || 0) > 0
        && !['unknown', 'unchecked', 'check_unavailable', 'check_failed_free_tier'].includes(status);
}

function isStarterInstallRestricted(gate = gateState) {
    const uid = firebaseAuthState.uid || null;
    if (!uid || !isFreeAccessTier(getMembershipTier(gate))) return false;
    return hasFinalStarterInstallDecision(gate)
        && gate?.starterInstallAllowed === false;
}

function isSignedInForFeatures() {
    return !!firebaseAuthState.uid
        && gateState.ssoVerified === true
        && !isAccountDisabled()
        && hasFinalStarterInstallDecision()
        && !isStarterInstallRestricted();
}

function getMembershipTier(gate = gateState) {
    if (!firebaseAuthState.uid || gate?.ssoVerified !== true) return 'signedOut';
    if (gate?.disabled === true) return 'disabled';
    if (gate?.refunded === true || gate?.paymentStatus === 'refunded') return 'starter';
    if (isStripeSubscriptionLapsed(gate)) return isGateTrialActive(gate) ? 'trial' : 'starter';
    if (hasProfessionalTierAccess(gate)) return 'professional';
    if (hasEffectivePremiumAccess(gate) || hasActivePaidMembership(gate) || hasRemotePremiumMembership(gate)) return 'premium';
    if (isGateTrialActive(gate)) return 'trial';
    return 'starter';
}

function hasInstallExemptMembership(gate = gateState) {
    if (gate?.disabled === true) return false;
    if (hasActiveSupporterEntitlement(gate) || gate?.specialPermission === true || gate?.prePremium === true) return true;
    const status = String(gate?.paymentStatus || gate?.membershipStatus || '').toLowerCase();
    if (gate?.refunded === true || ['refunded', 'canceled', 'cancelled', 'unpaid', 'incomplete_expired'].includes(status)) {
        return false;
    }
    if (gate?.premium === true || gate?.professional === true) return true;
    if (['premium', 'professional', 'pro', 'paid', 'active'].includes(String(gate?.membershipTier || '').toLowerCase())) {
        return true;
    }
    return hasActivePaidMembership(gate);
}

function getMembershipLabel(tier = getMembershipTier(), gate = gateState) {
    if (tier === 'professional') {
        // Distinguish the self-serve 24h trial from actual paid/admin-granted
        // Professional access, so it's clear this is time-boxed.
        const viaTrialOnly = gate?.professional !== true && !hasActiveSupporterEntitlement(gate)
            && gate?.specialPermission !== true && !hasRemoteProfessionalMembership(gate)
            && isProfessionalTrialActive(gate);
        return viaTrialOnly ? 'Professional Trial' : 'Professional';
    }
    if (tier === 'premium') return 'Premium';
    if (tier === 'trial') return 'Premium Trial';
    if (tier === 'disabled') return 'Disabled';
    if (tier === 'signedOut') return 'Signed out';
    return 'Starter';
}

function getSignedInProviderLabel() {
    if (firebaseAuthState.providerId === 'password') return t('emailSignedIn');
    return t('ssoSignedIn');
}

function getLocalDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

async function getAccountUsage() {
    const uid = firebaseAuthState.uid || null;
    const data = await chrome.storage.local.get(ACCOUNT_USAGE_STORAGE_KEY);
    const usage = data[ACCOUNT_USAGE_STORAGE_KEY] || {};
    const todayKey = getLocalDateKey();

    if (!uid) {
        return {
            uid: null,
            count: 0,
            limit: STARTER_ACCOUNT_PROMPT_LIMIT,
            dateKey: todayKey,
            resetAt: getNextLocalMidnightMs()
        };
    }

    if (usage.uid !== uid || Number(usage.resetAt || 0) <= Date.now()) {
        const resetUsage = {
            uid,
            count: 0,
            limit: STARTER_ACCOUNT_PROMPT_LIMIT,
            dateKey: todayKey,
            updatedAt: Date.now(),
            resetAt: getNextLocalMidnightMs()
        };
        await chrome.storage.local.set({ [ACCOUNT_USAGE_STORAGE_KEY]: resetUsage });
        return resetUsage;
    }
    return {
        uid,
        count: Math.max(0, Number(usage.count) || 0),
        limit: STARTER_ACCOUNT_PROMPT_LIMIT,
        dateKey: todayKey,
        resetAt: Number(usage.resetAt) || getNextLocalMidnightMs()
    };
}

async function ensureStarterQuotaBeforeRun(queue = []) {
    // Paid tiers and active trials have no daily cap.
    if (getMembershipTier() !== 'starter') return true;
    const pendingCount = (Array.isArray(queue) ? queue : [])
        .filter((i) => i.status === QUEUE_STATUS.PENDING || i.status === QUEUE_STATUS.IN_PROGRESS)
        .length;
    if (!pendingCount) return true;
    // A forced gate refresh and the generation-start increment can finish in
    // either order. Wait for queued cache merges before deciding whether Run
    // is allowed, so a late stale response cannot reopen an exhausted account.
    await accountUsageCacheWriteChain.catch(() => {});
    const usage = await getAccountUsage();
    const remaining = Math.max(0, (usage.limit || STARTER_ACCOUNT_PROMPT_LIMIT) - usage.count);
    if (remaining <= 0) {
        showGateStatus(tFormat('starterQuotaNotEnough', { remaining, limit: usage.limit }), true);
        return false;
    }
    if (remaining < pendingCount) {
        // Let the run start; the background quota gate stops it at the limit.
        showGateStatus(tFormat('starterQuotaNotEnough', { remaining, limit: usage.limit }), true);
    }
    return true;
}

function requireSignedInForFeature() {
    if (isAccountDisabled()) {
        loginRequiredGate?.classList.remove('hidden');
        loginRequiredGate?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showGateStatus(getAccountDisabledMessage(), true);
        return false;
    }
    if (isStarterInstallRestricted()) {
        clearAuthLandingNotice({ force: true });
        syncAuthLandingVisibility();
        showGateStatus(getStarterInstallRestrictionMessage(), true);
        return false;
    }
    if (isSignedInForFeatures()) return true;
    loginRequiredGate?.classList.remove('hidden');
    loginRequiredGate?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showGateStatus(
        gateState.starterInstallAllowed === false
            ? getStarterInstallRestrictionMessage()
            : t('loginRequiredToUse'),
        true
    );
    return false;
}

function getPremiumLockMessage() {
    return t('premiumFeatureLocked');
}

function showPremiumAssetLimitMessage(mode = 'image') {
    const key = mode === 'character'
        ? 'premiumRequiredForCharacters'
        : 'premiumRequiredForMultipleReferences';
    showGateStatus(t(key), true);
}

function queueItemHasPerPromptAssets(item = {}) {
    return !!item.characterAssetSelection
        || (Array.isArray(item.characterAssetSelections) && item.characterAssetSelections.length > 0)
        || (Array.isArray(item.referenceAssetSelections) && item.referenceAssetSelections.length > 0);
}

function stripPremiumAssetsFromQueueItem(item = {}) {
    const next = { ...item };
    delete next.characterAssetSelection;
    delete next.characterAssetSelections;
    delete next.referenceAssetSelections;
    delete next.perPromptAssetsEdited;
    delete next.perPromptCharacterAssetsEdited;
    delete next.perPromptReferenceAssetsEdited;
    return next;
}

async function resetPremiumAssetSelections({ stripQueueAssets = false, preserveSingleReference = false } = {}) {
    if (stripQueueAssets) {
        const queue = await storage.getQueue();
        if (queue.some(queueItemHasPerPromptAssets)) {
            await storage.setQueue(queue.map(stripPremiumAssetsFromQueueItem));
        }
    }

    const current = await storage.getSettings();
    const referenceAssetSelections = preserveSingleReference && canBrowseCharacterReferenceAssets()
        ? dedupeReferenceSelections(current.referenceAssetSelections || []).slice(0, 1)
        : [];

    const updated = await storage.updateSettings({
        perPromptAssetsEnabled: false,
        characterAssetSelections: [],
        characterAssetSelection: null,
        characterAssetProjectUrl: null,
        referenceAssetSelections,
        referenceAssetId: null,
        referenceAssetSrc: null,
        referenceAssetProjectUrl: referenceAssetSelections.length ? (current.referenceAssetProjectUrl || null) : null,
        flowUpscaledDownload: false
    });

    if (perPromptAssetsEnabled) perPromptAssetsEnabled.checked = false;
    if (flowUpscaledDownload) flowUpscaledDownload.checked = false;
    if (lastUiSettings) lastUiSettings = { ...lastUiSettings, ...updated };
    renderSelectedCharacterAsset([]);
    renderSelectedReferenceAssets(referenceAssetSelections);
    populateAssetDropdown(updated.referenceAssets || [], referenceAssetSelections);
    syncPerPromptAssetsUi(updated);
    syncUpscaleDownloadAvailability();
    return updated;
}

async function loadBillingConfigCache() {
    const data = await chrome.storage.local.get(FIRESTORE_BILLING_CONFIG_CACHE_KEY);
    if (data[FIRESTORE_BILLING_CONFIG_CACHE_KEY]) {
        billingConfig = {
            ...billingConfig,
            ...data[FIRESTORE_BILLING_CONFIG_CACHE_KEY],
            loaded: true
        };
    }
}

async function fetchBillingConfig({ forceRemote = false } = {}) {
    if (!firebaseConfig.projectId) return billingConfig;
    if (
        !forceRemote
        && billingConfig.loaded
        && billingConfig.checkedAt
        && (Date.now() - Number(billingConfig.checkedAt)) < BILLING_CONFIG_CACHE_TTL_MS
    ) {
        return billingConfig;
    }
    const apiKeyParam = firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/appConfig/billing${apiKeyParam}`;
    const headers = firebaseAuthState.idToken
        ? { Authorization: `Bearer ${firebaseAuthState.idToken}` }
        : {};

    try {
        const res = await fetch(url, { method: 'GET', headers });
        if (res.status === 404) {
            billingConfig = { paymentRequired: false, trialDays: DEFAULT_TRIAL_DAYS, professionalTrialHours: DEFAULT_PROFESSIONAL_TRIAL_HOURS, prePremiumAccessEnabled: true, loaded: true, source: 'default', checkedAt: Date.now() };
            await chrome.storage.local.set({ [FIRESTORE_BILLING_CONFIG_CACHE_KEY]: billingConfig });
            return billingConfig;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to read billing config.');
        const fields = json.fields || {};
        // Defaults to enabled (true) when the field hasn't been set by an admin
        // yet — Pre-Premium users should get Premium access out of the box.
        const prePremiumAccessEnabled = Object.prototype.hasOwnProperty.call(fields, 'pre_premium_access_enabled')
            ? readFirestoreBoolean(fields, 'pre_premium_access_enabled')
            : true;
        billingConfig = {
            paymentRequired: readFirestoreBoolean(fields, 'payment_required'),
            trialDays: Math.max(1, Math.min(30, readFirestoreNumber(fields, 'trial_days', DEFAULT_TRIAL_DAYS))),
            professionalTrialHours: Math.max(1, Math.min(720, readFirestoreNumber(
                fields,
                'professional_trial_hours',
                readFirestoreNumber(fields, 'professional_trial_days', 1) * 24
            ))),
            prePremiumAccessEnabled,
            loaded: true,
            source: 'firestore',
            checkedAt: Date.now()
        };
        await chrome.storage.local.set({ [FIRESTORE_BILLING_CONFIG_CACHE_KEY]: billingConfig });
        return billingConfig;
    } catch (error) {
        console.debug('Billing config refresh skipped; using cached/default config:', error?.message || error);
        billingConfig = { ...billingConfig, loaded: true, checkedAt: Date.now() };
        await chrome.storage.local.set({ [FIRESTORE_BILLING_CONFIG_CACHE_KEY]: billingConfig });
        return billingConfig;
    }
}

async function loadPremiumModalConfigCache() {
    const data = await chrome.storage.local.get(FIRESTORE_PREMIUM_MODAL_CACHE_KEY);
    if (data[FIRESTORE_PREMIUM_MODAL_CACHE_KEY]) {
        premiumModalConfig = { ...premiumModalConfig, ...data[FIRESTORE_PREMIUM_MODAL_CACHE_KEY] };
    }
}

async function fetchPremiumModalConfig() {
    if (!firebaseConfig.projectId) return premiumModalConfig;
    if (
        premiumModalConfig.loaded
        && premiumModalConfig.checkedAt
        && (Date.now() - Number(premiumModalConfig.checkedAt)) < PREMIUM_MODAL_CACHE_TTL_MS
    ) return premiumModalConfig;

    const apiKeyParam = firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/appConfig/premiumModal${apiKeyParam}`;
    const headers = firebaseAuthState.idToken ? { Authorization: `Bearer ${firebaseAuthState.idToken}` } : {};

    try {
        const res = await fetch(url, { method: 'GET', headers });
        if (res.status === 404) {
            premiumModalConfig = { ...premiumModalConfig, loaded: true, checkedAt: Date.now() };
            await chrome.storage.local.set({ [FIRESTORE_PREMIUM_MODAL_CACHE_KEY]: premiumModalConfig });
            return premiumModalConfig;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to read premium modal config.');
        const fields = json.fields || {};
        premiumModalConfig = {
            message: readFirestoreString(fields, 'message') || null,
            showFormBtn: fields.show_form_btn ? readFirestoreBoolean(fields, 'show_form_btn') : true,
            formUrl: readFirestoreString(fields, 'form_url') || null,
            showSupporterBtn: fields.show_supporter_btn ? readFirestoreBoolean(fields, 'show_supporter_btn') : true,
            supporterUrl: readFirestoreString(fields, 'supporter_url') || null,
            supporterLabel: readFirestoreString(fields, 'supporter_label') || null,
            loaded: true,
            checkedAt: Date.now()
        };
        await chrome.storage.local.set({ [FIRESTORE_PREMIUM_MODAL_CACHE_KEY]: premiumModalConfig });
        return premiumModalConfig;
    } catch (error) {
        console.debug('Premium modal config fetch skipped:', error?.message || error);
        premiumModalConfig = { ...premiumModalConfig, loaded: true, checkedAt: Date.now() };
        await chrome.storage.local.set({ [FIRESTORE_PREMIUM_MODAL_CACHE_KEY]: premiumModalConfig });
        return premiumModalConfig;
    }
}

async function fetchFirestoreGateState({ forceRemote = false } = {}) {
    if (isSigningOut) {
        gateState = { ssoVerified: false, subscribed: false, subscriberConfirmed: false, premium: false, supporter: false, trial: false, trialStartedAt: null, trialExpiresAt: null, disabled: false, specialPermission: false, professional: false, loaded: true, source: 'local' };
        return gateState;
    }

    const activeRateLimitMessage = getActiveAuthRateLimitMessage();
    if (activeRateLimitMessage) {
        console.warn('Skipping Firestore gate refresh during cooldown:', activeRateLimitMessage);
        return { ...gateState, loaded: true };
    }

    const gateCacheFresh = gateState.checkedAt
        && (Date.now() - Number(gateState.checkedAt)) < FIRESTORE_GATE_CACHE_TTL_MS;
    // Force remote check if clock was rewound (anti-cheat for trial expiry bypass).
    const clockTampered = isClockRewound();
    if (
        firebaseAuthState.uid
        && gateState.loaded
        && gateState.uid === firebaseAuthState.uid
        && !forceRemote
        && !clockTampered
        && gateCacheFresh
    ) {
        return gateState;
    }
    const ok = await refreshFirebaseIdTokenIfNeeded();
    if (!ok || !firebaseAuthState.uid || !firebaseAuthState.idToken) {
        gateState = { ssoVerified: false, subscribed: false, subscriberConfirmed: false, premium: false, supporter: false, trial: false, trialStartedAt: null, trialExpiresAt: null, disabled: false, specialPermission: false, professional: false, loaded: true, source: 'local' };
        return gateState;
    }

    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${firebaseAuthState.uid}`;
    const localTimeAtFetch = Date.now();
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${firebaseAuthState.idToken}`
        }
    });
    const serverDateHeader = res.headers.get('Date');
    const serverTimeAtFetch = serverDateHeader ? new Date(serverDateHeader).getTime() : localTimeAtFetch;
    await updateClockWatermark();

    if (res.status === 404) {
        gateState = { ssoVerified: false, subscribed: false, subscriberConfirmed: false, premium: false, supporter: false, trial: false, trialStartedAt: null, trialExpiresAt: null, disabled: false, specialPermission: false, professional: false, loaded: true, source: 'firestore_missing', uid: firebaseAuthState.uid, checkedAt: Date.now() };
        gateRemoteCheckedThisPopup = true;
        await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: gateState });
        return gateState;
    }

    const json = await res.json();
    if (!res.ok) {
        if (res.status === 429) {
            const message = markAuthRateLimited(res, json?.error?.message || 'Gate state refresh is temporarily rate limited.');
            console.warn('Firestore gate refresh rate limited:', message);
            return { ...gateState, loaded: true };
        }
        throw new Error(json?.error?.message || 'Failed to read Firestore gate state.');
    }

    const fields = json.fields || {};
    const hasTrialField = Object.prototype.hasOwnProperty.call(fields, 'trial');
    const hasDisabledField = Object.prototype.hasOwnProperty.call(fields, 'disabled');
    const existingTrialStartedAt = readFirestoreTimestampMs(fields, 'trial_started_at');
    const existingTrialExpiresAt = readFirestoreTimestampMs(fields, 'trial_expires_at');
    const existingProfessionalTrialStartedAt = readFirestoreTimestampMs(fields, 'professional_trial_started_at');
    const existingProfessionalTrialExpiresAt = readFirestoreTimestampMs(fields, 'professional_trial_expires_at');
    const remoteQuotaDateKey = readFirestoreString(fields, 'quota_date_key', '');
    const remoteQuotaResetAt = readFirestoreTimestampMs(fields, 'quota_reset_at');
    const remoteQuotaUpdatedAt = readFirestoreTimestampMs(fields, 'quota_updated_at');
    const remoteQuotaRefundVersion = readFirestoreNumber(fields, 'quota_refund_version', 0);
    const remoteQuotaUsage = {
        uid: firebaseAuthState.uid,
        count: Math.max(0, readFirestoreNumber(fields, 'quota_used', 0)),
        limit: STARTER_ACCOUNT_PROMPT_LIMIT,
        dateKey: remoteQuotaDateKey,
        updatedAt: remoteQuotaUpdatedAt || Date.now(),
        resetAt: remoteQuotaResetAt || getNextLocalMidnightMs(),
        refundVersion: Math.max(0, remoteQuotaRefundVersion)
    };
    const effectiveQuotaUsage = remoteQuotaUsage.resetAt > Date.now()
        ? await cacheAccountUsage(remoteQuotaUsage)
        : remoteQuotaUsage;
    const previousInstallDecision = {
        starterInstallAllowed: gateState.starterInstallAllowed !== false,
        starterInstallStatus: gateState.starterInstallStatus || 'unknown',
        starterInstallResetAvailableAt: gateState.starterInstallResetAvailableAt || null,
        starterMaintenanceEndsAt: gateState.starterMaintenanceEndsAt || null,
        starterMaintenanceMessage: gateState.starterMaintenanceMessage || '',
        starterInstallCheckedAt: gateState.starterInstallCheckedAt || null,
        starterInstallCheckedUid: gateState.starterInstallCheckedUid || null
    };
    gateState = {
        ssoVerified: readFirestoreBoolean(fields, 'sso_verified'),
        subscribed: readFirestoreBoolean(fields, 'subscribed'),
        subscriberConfirmed: readFirestoreBoolean(fields, 'subscriber_confirmed'),
        premium: readFirestoreBoolean(fields, 'premium'),
        supporter: readFirestoreBoolean(fields, 'supporter'),
        supporterExpiresAt: readFirestoreTimestampMs(fields, 'supporter_expires_at'),
        trial: hasTrialField ? readFirestoreBoolean(fields, 'trial') : false,
        trialStartedAt: existingTrialStartedAt,
        trialExpiresAt: existingTrialExpiresAt,
        disabled: hasDisabledField ? readFirestoreBoolean(fields, 'disabled') : false,
        specialPermission: readFirestoreBoolean(fields, 'special_permission'),
        professional: readFirestoreBoolean(fields, 'professional'),
        prePremium: readFirestoreBoolean(fields, 'pre_premium'),
        bmcPremium: readFirestoreBoolean(fields, 'bmc_premium'),
        bmcHasPaidMembershipMonth: readFirestoreBoolean(fields, 'bmc_has_paid_membership_month'),
        professionalTrialStartedAt: existingProfessionalTrialStartedAt,
        professionalTrialExpiresAt: existingProfessionalTrialExpiresAt,
        professionalTrialUsed: readFirestoreBoolean(fields, 'professional_trial_used'),
        paid: readFirestoreBoolean(fields, 'paid'),
        refunded: readFirestoreBoolean(fields, 'refunded'),
        trialUsed: readFirestoreBoolean(fields, 'trial_used'),
        trialResetVersion: readFirestoreString(fields, 'trial_reset_version', ''),
        membershipTier: readFirestoreString(fields, 'membership_tier', 'starter'),
        membershipStatus: readFirestoreString(fields, 'membership_status', 'starter'),
        paymentProvider: readFirestoreString(fields, 'payment_provider', 'none'),
        paymentStatus: readFirestoreString(fields, 'payment_status', 'none'),
        currentPeriodEnd: readFirestoreTimestampMs(fields, 'current_period_end'),
        quotaUsed: effectiveQuotaUsage.count,
        quotaLimit: effectiveQuotaUsage.limit,
        quotaDateKey: effectiveQuotaUsage.dateKey,
        quotaUpdatedAt: effectiveQuotaUsage.updatedAt,
        quotaResetAt: effectiveQuotaUsage.resetAt,
        quotaRefundVersion: effectiveQuotaUsage.refundVersion,
        ...previousInstallDecision,
        loaded: true,
        source: 'firestore',
        uid: firebaseAuthState.uid,
        checkedAt: Date.now(),
        serverTimeAtFetch,
        localTimeAtFetch
    };
    gateRemoteCheckedThisPopup = true;
    await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: gateState });
    return gateState;
}

async function loadGateStateCache() {
    const data = await chrome.storage.local.get(FIRESTORE_GATE_CACHE_KEY);
    if (data[FIRESTORE_GATE_CACHE_KEY]) {
        gateState = { ...gateState, ...data[FIRESTORE_GATE_CACHE_KEY], loaded: true };
    }
}

async function invalidateFirestoreGateCache() {
    gateRemoteCheckedThisPopup = false;
    gateState = {
        ...gateState,
        checkedAt: 0
    };
    billingConfig = {
        ...billingConfig,
        checkedAt: 0
    };
    premiumModalConfig = {
        ...premiumModalConfig,
        checkedAt: 0
    };
    await chrome.storage.local.set({
        [FIRESTORE_GATE_CACHE_KEY]: gateState,
        [FIRESTORE_BILLING_CONFIG_CACHE_KEY]: billingConfig,
        [FIRESTORE_PREMIUM_MODAL_CACHE_KEY]: premiumModalConfig
    });
}

async function getOrCreateInstallId() {
    const keys = [INSTALL_ID_STORAGE_KEY];
    let localId = '';
    let syncId = '';
    try {
        const local = await chrome.storage.local.get(keys);
        localId = String(local?.[INSTALL_ID_STORAGE_KEY] || '');
    } catch { /* storage may be unavailable briefly during extension updates */ }
    try {
        const synced = await chrome.storage.sync.get(keys);
        syncId = String(synced?.[INSTALL_ID_STORAGE_KEY] || '');
    } catch { /* sync can be unavailable for managed profiles */ }
    const installId = localId || syncId || (crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`);
    const payload = { [INSTALL_ID_STORAGE_KEY]: installId };
    try { await chrome.storage.local.set(payload); } catch { /* ignore */ }
    try { await chrome.storage.sync.set(payload); } catch { /* ignore */ }
    return installId;
}

async function hasInstallFunctionsHostPermission() {
    if (!chrome.permissions?.contains) return false;
    return chrome.permissions.contains({ origins: [INSTALL_FUNCTIONS_ORIGIN_PATTERN] });
}

async function requestInstallFunctionsHostPermission() {
    if (!chrome.permissions?.request) return false;
    return chrome.permissions.request({ origins: [INSTALL_FUNCTIONS_ORIGIN_PATTERN] });
}

function applyStarterInstallResult(result = {}) {
    const reportedQuotaLimit = Number(result.quotaLimit);
    if (Number.isInteger(reportedQuotaLimit) && reportedQuotaLimit >= 50 && reportedQuotaLimit <= 500) {
        STARTER_ACCOUNT_PROMPT_LIMIT = reportedQuotaLimit;
    }
    const normalized = {
        starterInstallAllowed: result.allowed !== false,
        starterInstallStatus: String(result.status || (result.allowed === false ? 'locked' : 'allowed')),
        starterInstallResetAvailableAt: Number(result.resetAvailableAt || 0) || null,
        starterMaintenanceEndsAt: Number(result.maintenanceEndsAt || 0) || null,
        starterMaintenanceMessage: String(result.maintenanceMessage || ''),
        quotaLimit: STARTER_ACCOUNT_PROMPT_LIMIT,
        starterInstallCheckedAt: firebaseAuthState.uid ? Date.now() : null,
        starterInstallCheckedUid: firebaseAuthState.uid || null
    };
    gateState = { ...gateState, ...normalized };
    return normalized;
}

async function callInstallAccessFunction(name, body) {
    if (!(await hasInstallFunctionsHostPermission())) {
        const error = new Error(t('starterSecurityPermissionRequired'));
        error.code = 'host_permission_required';
        throw error;
    }
    const ok = await refreshFirebaseIdTokenIfNeeded();
    if (!ok || !firebaseAuthState.idToken) throw new Error('Not signed in to Firebase.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(`${INSTALL_FUNCTIONS_BASE_URL}/${name}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${firebaseAuthState.idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body || {}),
            signal: controller.signal
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json?.error || 'Install access check failed.');
        return json;
    } finally {
        clearTimeout(timeout);
    }
}

function setBugReportStatus(message = '', isError = false) {
    if (!bugReportStatus) return;
    bugReportStatus.textContent = String(message || '');
    bugReportStatus.classList.toggle('hidden', !message);
    bugReportStatus.classList.toggle('error', !!isError);
}

async function submitRecentBugReport() {
    const confirmed = confirm(
        'Send privacy-safe error diagnostics from the last 10 minutes to the developer?\n\n' +
        'Your signed-in account email/ID, membership, app version, queue status counts, structured errors, and a sanitized operational timeline will be sent. ' +
        'Prompts, image prompts, images, asset names, URLs, and authentication tokens will not be sent.'
    );
    if (!confirmed) return;

    if (!(await hasInstallFunctionsHostPermission())) {
        const granted = await requestInstallFunctionsHostPermission().catch(() => false);
        if (!granted) {
            setBugReportStatus('Permission is required to send the report securely.', true);
            return;
        }
    }

    sendBugReportBtn.disabled = true;
    setBugReportStatus('Preparing the report…');
    try {
        await refreshGateState({ forceRemote: true });

        const sinceMs = Date.now() - 10 * 60 * 1000;
        const [diagnostics, operationalDiagnostics, queue, settings, automatorState] = await Promise.all([
            storage.getDiagnosticErrors({ sinceMs }),
            storage.getSafeOperationalDiagnostics({ sinceMs }),
            storage.getQueue(),
            storage.getSettings(),
            storage.getState()
        ]);
        const safeDiagnostics = [...diagnostics, ...operationalDiagnostics]
          .sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0))
          .slice(-50)
          .map((entry) => ({
            timestamp: Number(entry.timestamp || Date.now()),
            code: String(entry.code || 'RUNTIME_ERROR').slice(0, 64),
            stage: String(entry.stage || 'runtime').slice(0, 64),
            summary: String(entry.summary || 'An automation error was recorded.').slice(0, 200),
            context: entry.context && typeof entry.context === 'object' ? entry.context : {}
        }));
        if (!safeDiagnostics.length) {
            safeDiagnostics.push({
                timestamp: Date.now(),
                code: 'NO_RECENT_DIAGNOSTIC',
                stage: 'report',
                summary: 'No structured error was captured during the previous 10 minutes.',
                context: { source: 'manual-report' }
            });
        }

        const statusCounts = (Array.isArray(queue) ? queue : []).reduce((counts, item) => {
            const status = ['pending', 'in_progress', 'completed', 'failed'].includes(item?.status)
                ? item.status
                : 'other';
            counts[status] = (counts[status] || 0) + 1;
            return counts;
        }, {});
        safeDiagnostics.push({
            timestamp: Date.now(),
            code: 'REPORT_SNAPSHOT',
            stage: 'report',
            summary: 'A privacy-safe runtime snapshot was captured when the user sent this report.',
            context: {
                recordType: 'activity',
                automatorState: String(automatorState || 'unknown').slice(0, 80),
                queueTotal: Array.isArray(queue) ? queue.length : 0,
                queuePending: Number(statusCounts.pending || 0),
                queueInProgress: Number(statusCounts.in_progress || 0),
                queueCompleted: Number(statusCounts.completed || 0),
                queueFailed: Number(statusCounts.failed || 0)
            }
        });
        const result = await callInstallAccessFunction('submitBugReport', {
            diagnostics: safeDiagnostics,
            client: {
                extensionVersion: chrome.runtime.getManifest().version,
                locale: currentLanguage || navigator.language || 'en',
                flowType: settings.flowType === 'video' ? 'video' : 'image',
                videoMode: String(settings.videoMode || '').slice(0, 32),
                queueStatusCounts: statusCounts
            }
        });
        setBugReportStatus(`Bug report sent. ${Number(result.remainingToday ?? 0)} report(s) remaining in the current 24-hour window.`);
    } catch (error) {
        setBugReportStatus(error?.message || 'The bug report could not be sent.', true);
    } finally {
        sendBugReportBtn.disabled = false;
        applyPremiumFeatureLocks();
    }
}

async function syncStarterInstallAccess({ forceRemote = false } = {}) {
    if (!firebaseAuthState.uid || isAccountDisabled()) return true;
    // Generate the persistent ID for every membership. Elevated accounts are
    // registered by the server but remain exempt from Starter ownership and
    // maintenance restrictions. If optional host access has not been granted
    // yet, they stay usable and registration is retried after a user gesture.
    const installId = await getOrCreateInstallId();
    const sameUser = gateState.starterInstallCheckedUid === firebaseAuthState.uid;
    const fresh = sameUser
        && Number(gateState.starterInstallCheckedAt || 0) > 0
        && Date.now() - Number(gateState.starterInstallCheckedAt) < STARTER_POLICY_CACHE_TTL_MS;
    if (hasInstallExemptMembership()) {
        if (!forceRemote && fresh && ['paid_tier', 'admin_exception'].includes(gateState.starterInstallStatus)) {
            return true;
        }
        let result = { allowed: true, status: 'paid_tier_local' };
        if (await hasInstallFunctionsHostPermission()) {
            try {
                result = await callInstallAccessFunction('registerInstallAndCheckAccess', { installId });
            } catch (error) {
                console.warn('Elevated install registration deferred:', error?.message || error);
            }
        }
        const normalized = applyStarterInstallResult(result);
        await chrome.storage.local.set({
            [STARTER_INSTALL_ACCESS_CACHE_KEY]: normalized,
            [FIRESTORE_GATE_CACHE_KEY]: gateState
        });
        return true;
    }
    if (!(await hasInstallFunctionsHostPermission())) {
        const normalized = applyStarterInstallResult({ allowed: false, status: 'host_permission_required' });
        await chrome.storage.local.set({
            [STARTER_INSTALL_ACCESS_CACHE_KEY]: normalized,
            [FIRESTORE_GATE_CACHE_KEY]: gateState
        });
        return false;
    }
    // Allowed decisions may be cached briefly. Denials always re-check so an
    // administrator exception takes effect on the next refresh.
    if (!forceRemote && fresh && gateState.starterInstallAllowed === true) return true;

    try {
        const result = await callInstallAccessFunction('registerInstallAndCheckAccess', {
            installId
        });
        const normalized = applyStarterInstallResult(result);
        await chrome.storage.local.set({
            [STARTER_INSTALL_ACCESS_CACHE_KEY]: normalized,
            [FIRESTORE_GATE_CACHE_KEY]: gateState
        });
        return normalized.starterInstallAllowed !== false;
    } catch (error) {
        // Paid/manual tiers returned above before making the request. A free
        // Starter/Trial must have a final server decision before the app shell
        // is exposed; otherwise an outage or CORS error becomes an account-
        // switching bypass.
        console.warn('Starter install access check failed:', error?.message || error);
        const normalized = applyStarterInstallResult({ allowed: false, status: 'check_failed_free_tier' });
        await chrome.storage.local.set({
            [STARTER_INSTALL_ACCESS_CACHE_KEY]: normalized,
            [FIRESTORE_GATE_CACHE_KEY]: gateState
        });
        return false;
    }
}

async function resetStarterInstallAccessHere() {
    const result = await callInstallAccessFunction('resetStarterInstall', {
        installId: await getOrCreateInstallId()
    });
    const normalized = applyStarterInstallResult(result);
    await chrome.storage.local.set({
        [STARTER_INSTALL_ACCESS_CACHE_KEY]: normalized,
        [FIRESTORE_GATE_CACHE_KEY]: gateState
    });
    applySubscriptionGate();
    updateProfileModalUi();
    return result;
}

async function refreshGateState(options = {}) {
    if (gateRefreshInFlight) {
        return gateRefreshInFlight;
    }

    gateRefreshInFlight = (async () => {
    try {
        await fetchBillingConfig({ forceRemote: options.forceRemote === true });
        await fetchPremiumModalConfig();
        await fetchFirestoreGateState(options);
        await syncStarterInstallAccess({ forceRemote: options.forceRemote === true });
        return true;
    } catch (e) {
        console.warn('Gate state refresh failed:', e);
        return false;
    }
    })();

    try {
        const refreshed = await gateRefreshInFlight;
        await enforceStrictPremiumFeatureAccess();
        return refreshed;
    } finally {
        gateRefreshInFlight = null;
    }
}

async function enforceStrictPremiumFeatureAccess(settings = lastUiSettings || null) {
    const currentSettings = settings || await storage.getSettings();
    const updates = {};

    if (!canUseUpscaledGeneratedDownload() && currentSettings?.flowUpscaledDownload) {
        updates.flowUpscaledDownload = false;
    }

    if (!canUsePerPromptAssets()) {
        if (currentSettings?.perPromptAssetsEnabled) updates.perPromptAssetsEnabled = false;
        if (currentSettings?.characterAssetSelection) updates.characterAssetSelection = null;
        if (Array.isArray(currentSettings?.characterAssetSelections) && currentSettings.characterAssetSelections.length) {
            updates.characterAssetSelections = [];
        }
        if (currentSettings?.characterAssetProjectUrl) updates.characterAssetProjectUrl = null;
        const currentReferences = dedupeReferenceSelections(currentSettings?.referenceAssetSelections || []);
        const allowedReferences = canUsePerPromptAssets() ? currentReferences : [];
        if (currentReferences.length !== allowedReferences.length) {
            updates.referenceAssetSelections = allowedReferences;
        }
        if (currentSettings?.referenceAssetId) updates.referenceAssetId = null;
        if (currentSettings?.referenceAssetSrc) updates.referenceAssetSrc = null;
        if (!allowedReferences.length && currentSettings?.referenceAssetProjectUrl) updates.referenceAssetProjectUrl = null;
    }

    if (!Object.keys(updates).length) return currentSettings;

    await storage.updateSettings(updates);
    if (lastUiSettings) {
        lastUiSettings = { ...lastUiSettings, ...updates };
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'perPromptAssetsEnabled') && perPromptAssetsEnabled) {
        perPromptAssetsEnabled.checked = false;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'flowUpscaledDownload') && flowUpscaledDownload) {
        flowUpscaledDownload.checked = false;
    }
    if (
        Object.prototype.hasOwnProperty.call(updates, 'characterAssetSelections')
        || Object.prototype.hasOwnProperty.call(updates, 'characterAssetSelection')
    ) {
        renderSelectedCharacterAsset([]);
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'referenceAssetSelections')) {
        renderSelectedReferenceAssets([]);
        populateAssetDropdown((currentSettings.referenceAssets || []), []);
    }
    syncUpscaleDownloadAvailability();
    return { ...currentSettings, ...updates };
}

async function refreshPremiumGateBeforePromptRun() {
    const requestedSettings = await storage.getSettings();
    const requestedLockedUpscaleDownload = !!requestedSettings?.flowUpscaledDownload;
    // Runs consume quota/credits and are the moment payment status matters most —
    // always verify against Firestore instead of the (up to 24h old) cache, so a
    // cancelled/refunded Stripe subscription can't keep running on stale state.
    // Rate-limit cooldown handling inside fetchFirestoreGateState still applies.
    const refreshed = await refreshGateState({ forceRemote: true });
    if (!refreshed) {
        await storage.updateSettings({
            flowUpscaledDownload: false
        });
        if (flowUpscaledDownload) flowUpscaledDownload.checked = false;
        showGateStatus(t('premiumAccessCheckFailedBeforeRun'), true);
    }
    if (requestedLockedUpscaleDownload && !canUseUpscaledGeneratedDownload()) {
        await storage.updateSettings({
            autoDownload: true,
            flowUpscaledDownload: false
        });
        if (autoDownload) autoDownload.checked = true;
        if (flowUpscaledDownload) flowUpscaledDownload.checked = false;
        showGateStatus(t('upscaledDownloadFallbackBeforeRun'));
    }
    const currentSettings = await storage.getSettings();
    const enforcedSettings = await enforceStrictPremiumFeatureAccess(currentSettings);
    applySubscriptionGate();
    syncPerPromptAssetsUi(enforcedSettings);
    syncUpscaleDownloadAvailability();
    return enforcedSettings;
}

async function removeLockedPerPromptAssetsBeforeRun(settings = {}) {
    if (canUsePerPromptAssets()) return settings;

    const queue = await storage.getQueue();
    const hasQueueAssets = queue.some(queueItemHasPerPromptAssets);
    if (!hasQueueAssets && !settings?.perPromptAssetsEnabled) return settings;

    await resetPremiumAssetSelections({ stripQueueAssets: true, preserveSingleReference: true });
    showGateStatus(t('perPromptAssetsRemovedBeforeRun'), true);
    return storage.getSettings();
}

async function upsertFirestoreGateState({
    ssoVerified,
    subscribed,
    includeDefaultPremium = false,
    includeDefaultSubscriberConfirmed = false,
    includeDefaultDisabled = false,
    includeDefaultProfessional = false,
    includeDefaultMembership = false,
    trialWindow = null,
    professionalTrialWindow = null
}) {
    const activeRateLimitMessage = getActiveAuthRateLimitMessage();
    if (activeRateLimitMessage) {
        throw new Error(activeRateLimitMessage);
    }

    const ok = await refreshFirebaseIdTokenIfNeeded();
    if (!ok || !firebaseAuthState.uid || !firebaseAuthState.idToken) {
        throw new Error('Not signed in to Firebase.');
    }

    const fieldPaths = [
        'sso_verified',
        'subscribed',
        'last_login_at'
    ];
    const email = (firebaseAuthState.email || '').trim();
    const displayName = (firebaseAuthState.displayName || '').trim();
    const photoUrl = (firebaseAuthState.photoUrl || '').trim();
    if (email) fieldPaths.push('email', 'email_lower');
    if (displayName) fieldPaths.push('display_name');
    if (photoUrl) fieldPaths.push('photo_url');
    if (includeDefaultPremium) fieldPaths.push('premium');
    if (includeDefaultSubscriberConfirmed) fieldPaths.push('subscriber_confirmed');
    if (includeDefaultDisabled) fieldPaths.push('disabled');
    if (includeDefaultProfessional) fieldPaths.push('professional');
    if (trialWindow) fieldPaths.push('trial', 'trial_used', 'trial_started_at', 'trial_expires_at', 'trial_reset_version', 'membership_status');
    if (professionalTrialWindow) fieldPaths.push('professional_trial_used', 'professional_trial_started_at', 'professional_trial_expires_at');
    if (includeDefaultMembership) {
        fieldPaths.push(
            'membership_tier',
            'membership_status',
            'payment_provider',
            'payment_status',
            'paid',
            'refunded'
        );
    }
    const fieldParams = Array.from(new Set(fieldPaths)).map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${firebaseAuthState.uid}?${fieldParams}`;
    const body = {
        fields: {
            sso_verified: { booleanValue: !!ssoVerified },
            subscribed: { booleanValue: !!subscribed },
            last_login_at: { timestampValue: new Date().toISOString() }
        }
    };
    if (email) {
        body.fields.email = { stringValue: email };
        body.fields.email_lower = { stringValue: email.toLowerCase() };
    }
    if (displayName) body.fields.display_name = { stringValue: displayName };
    if (photoUrl) body.fields.photo_url = { stringValue: photoUrl };
    if (includeDefaultPremium) body.fields.premium = { booleanValue: false };
    if (includeDefaultSubscriberConfirmed) body.fields.subscriber_confirmed = { booleanValue: false };
    if (includeDefaultDisabled) body.fields.disabled = { booleanValue: false };
    if (includeDefaultProfessional) body.fields.professional = { booleanValue: false };
    if (trialWindow) {
        body.fields.trial = { booleanValue: true };
        body.fields.trial_used = { booleanValue: true };
        body.fields.trial_started_at = { timestampValue: toFirestoreTimestamp(trialWindow.startedAt) };
        body.fields.trial_expires_at = { timestampValue: toFirestoreTimestamp(trialWindow.expiresAt) };
        body.fields.trial_reset_version = { stringValue: TRIAL_RESET_VERSION };
        body.fields.membership_status = { stringValue: 'trialing' };
    }
    if (professionalTrialWindow) {
        // Additive overlay — deliberately does NOT touch membership_status,
        // unlike the 3-day trial above, since it must coexist with whatever
        // Premium state the user already has.
        body.fields.professional_trial_used = { booleanValue: true };
        body.fields.professional_trial_started_at = { timestampValue: toFirestoreTimestamp(professionalTrialWindow.startedAt) };
        body.fields.professional_trial_expires_at = { timestampValue: toFirestoreTimestamp(professionalTrialWindow.expiresAt) };
    }
    if (includeDefaultMembership) {
        body.fields.membership_tier = { stringValue: 'starter' };
        body.fields.membership_status = { stringValue: trialWindow ? 'trialing' : 'starter' };
        body.fields.payment_provider = { stringValue: 'none' };
        body.fields.payment_status = { stringValue: 'none' };
        body.fields.paid = { booleanValue: false };
        body.fields.refunded = { booleanValue: false };
    }

    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${firebaseAuthState.idToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const json = await res.json();
    if (!res.ok) {
        if (res.status === 429) {
            throw new Error(markAuthRateLimited(res, json?.error?.message || 'Gate update is temporarily rate limited.'));
        }
        throw new Error(json?.error?.message || 'Failed to update Firestore gate state.');
    }
}

function shouldStartFiveDayTrial(gate = gateState) {
    if (!firebaseAuthState.uid) return false;
    if (gate.disabled === true) return false;
    const supporterExpiry = Number(gate.supporterExpiresAt || 0);
    const activeSupporter = gate.supporter === true && (!supporterExpiry || supporterExpiry > getEstimatedServerNow());
    if (gate.premium === true || activeSupporter || gate.professional === true || gate.specialPermission === true || hasActivePaidMembership(gate) || hasRemotePremiumMembership(gate)) return false;
    if (gate.trialUsed === true && gate.trialResetVersion === TRIAL_RESET_VERSION) return false;
    return true;
}

async function ensureFiveDayTrialStarted() {
    if (!shouldStartFiveDayTrial()) return false;
    const trialWindow = getDefaultTrialWindow();
    const shouldSeedGateDefaults = gateState.source === 'firestore_missing';

    // If the Firestore document doesn't exist yet, create it first without trial
    // fields (safeStarterCreateDefaults blocks trial on create). Then activate
    // trial in a separate update so allow update rules apply.
    if (shouldSeedGateDefaults) {
        await upsertFirestoreGateState({
            ssoVerified: true,
            subscribed: false,
            includeDefaultPremium: true,
            includeDefaultSubscriberConfirmed: true,
            includeDefaultDisabled: true,
            includeDefaultProfessional: true,
            includeDefaultMembership: true,
            trialWindow: null
        });
        gateState = { ...gateState, source: 'firestore', loaded: true, uid: firebaseAuthState.uid };
    }

    await upsertFirestoreGateState({
        ssoVerified: true,
        subscribed: gateState.subscribed === true,
        trialWindow
    });
    gateState = {
        ...gateState,
        ssoVerified: true,
        trial: true,
        trialUsed: true,
        trialResetVersion: TRIAL_RESET_VERSION,
        trialStartedAt: trialWindow.startedAt,
        trialExpiresAt: trialWindow.expiresAt,
        membershipStatus: 'trialing',
        uid: firebaseAuthState.uid,
        checkedAt: Date.now(),
        loaded: true,
        source: shouldSeedGateDefaults ? 'firestore' : gateState.source
    };
    await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: gateState });
    return true;
}

async function handlePremiumTrialActivation() {
    if (!firebaseAuthState.uid) {
        showGateStatus(t('loginRequiredToUse'), true);
        return;
    }
    if (!shouldStartFiveDayTrial() || isTrialExpired()) {
        openPremiumFeatureModal();
        return;
    }
    await fetchBillingConfig({ forceRemote: true });
    const trialWindow = getDefaultTrialWindow();
    const endDate = new Date(trialWindow.expiresAt).toLocaleDateString(currentLanguage === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
    const confirmed = window.confirm(tFormat('confirmTrialActivation', { date: endDate }));
    if (!confirmed) return;
    try {
        if (premiumUpsellBtn) {
            premiumUpsellBtn.disabled = true;
            premiumUpsellBtn.textContent = t('loading');
        }
        await ensureFiveDayTrialStarted();
        await refreshGateState({ forceRemote: true });
        applySubscriptionGate();
        await refreshUI();
        showGateStatus(tFormat('premiumTrialActivated', { date: formatTrialEndDate() }));
    } catch (error) {
        console.error('Premium trial activation failed:', error);
        showGateStatus(tFormat('premiumTrialActivationFailed', { message: error.message || String(error) }), true);
    } finally {
        if (premiumUpsellBtn) {
            premiumUpsellBtn.disabled = false;
            premiumUpsellBtn.textContent = getTrialCtaLabel('premium');
        }
    }
}

// Self-serve Professional trial — additive overlay independent from the
// Premium trial: works whether or not the user already has Premium,
// and once it expires the user simply falls back to whatever Premium access
// they still have (an emergent property of hasProfessionalTierAccess()'s
// boolean-OR check, not a separate fallback state).
function shouldStartProfessionalTrial(gate = gateState) {
    if (!firebaseAuthState.uid) return false;
    if (gate.disabled === true) return false;
    if (hasProfessionalTierAccess(gate)) return false;
    if (gate.professionalTrialUsed === true) return false;
    return true;
}

async function ensureProfessionalTrialStarted() {
    if (!shouldStartProfessionalTrial()) return false;
    const professionalTrialWindow = getDefaultProfessionalTrialWindow();
    await upsertFirestoreGateState({
        ssoVerified: true,
        subscribed: gateState.subscribed === true,
        professionalTrialWindow
    });
    gateState = {
        ...gateState,
        ssoVerified: true,
        professionalTrialUsed: true,
        professionalTrialStartedAt: professionalTrialWindow.startedAt,
        professionalTrialExpiresAt: professionalTrialWindow.expiresAt,
        uid: firebaseAuthState.uid,
        checkedAt: Date.now(),
        loaded: true
    };
    await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: gateState });
    return true;
}

async function handleProfessionalTrialActivation() {
    if (!firebaseAuthState.uid) {
        showGateStatus(t('loginRequiredToUse'), true);
        return;
    }
    if (!shouldStartProfessionalTrial()) {
        showGateStatus(t('professionalTrialUnavailable'), true);
        return;
    }
    await fetchBillingConfig({ forceRemote: true });
    const professionalTrialWindow = getDefaultProfessionalTrialWindow();
    const endTime = new Date(professionalTrialWindow.expiresAt).toLocaleString(currentLanguage === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const confirmed = window.confirm(tFormat('confirmProfessionalTrialActivation', { date: endTime }));
    if (!confirmed) return;
    try {
        if (professionalTrialBtn) {
            professionalTrialBtn.disabled = true;
            professionalTrialBtn.textContent = t('loading');
        }
        await ensureProfessionalTrialStarted();
        await refreshGateState({ forceRemote: true });
        applySubscriptionGate();
        await refreshUI();
        showGateStatus(tFormat('professionalTrialActivated', { date: endTime }));
    } catch (error) {
        console.error('Professional trial activation failed:', error);
        showGateStatus(tFormat('professionalTrialActivationFailed', { message: error.message || String(error) }), true);
    } finally {
        if (professionalTrialBtn) {
            professionalTrialBtn.disabled = false;
            professionalTrialBtn.textContent = getTrialCtaLabel('professional');
        }
    }
}

// Pre-deployment testing only: lets the app owner instantly flip their own
// account between tiers. This only works because rick.jung.au@gmail.com's
// uid matches the hardcoded admin UID in firestore.rules — admin writes to
// /users/{uid} bypass userSafeUpdateFields(), so this direct PATCH can set
// premium/professional/etc that a normal user's own write would be rejected
// for. Gated in the UI to only render for that exact signed-in email.
function isDevMembershipSwitcherAllowed() {
    return devSwitcherAllowedCached;
}

async function devSetMembershipTier(tier) {
    if (!isDevMembershipSwitcherAllowed()) return;
    const ok = await refreshFirebaseIdTokenIfNeeded();
    if (!ok || !firebaseAuthState.uid || !firebaseAuthState.idToken) {
        showGateStatus('Not signed in to Firebase.', true);
        return;
    }

    const buttons = [devSetStarterBtn, devSetPremiumBtn, devSetProfessionalBtn, devResetTrialBtn].filter(Boolean);
    buttons.forEach((button) => { button.disabled = true; });
    showGateStatus(`Dev: applying "${tier}"...`);

    let fieldPaths = [];
    const fields = {};
    if (tier === 'starter') {
        fieldPaths = ['premium', 'professional', 'supporter', 'supporter_expires_at', 'pre_premium', 'special_permission', 'membership_tier', 'membership_status'];
        fields.premium = { booleanValue: false };
        fields.professional = { booleanValue: false };
        fields.supporter = { booleanValue: false };
        fields.pre_premium = { booleanValue: false };
        fields.special_permission = { booleanValue: false };
        fields.membership_tier = { stringValue: 'starter' };
        fields.membership_status = { stringValue: 'starter' };
    } else if (tier === 'premium') {
        fieldPaths = ['premium', 'professional', 'supporter', 'supporter_expires_at', 'membership_tier', 'membership_status'];
        fields.premium = { booleanValue: true };
        fields.professional = { booleanValue: false };
        fields.supporter = { booleanValue: false };
        fields.membership_tier = { stringValue: 'premium' };
        fields.membership_status = { stringValue: 'active' };
    } else if (tier === 'professional') {
        fieldPaths = ['professional', 'membership_tier', 'membership_status'];
        fields.professional = { booleanValue: true };
        fields.membership_tier = { stringValue: 'professional' };
        fields.membership_status = { stringValue: 'active' };
    } else if (tier === 'reset_trial') {
        fieldPaths = ['trial', 'trial_used', 'trial_reset_version', 'professional_trial_used'];
        fields.trial = { booleanValue: false };
        fields.trial_used = { booleanValue: false };
        fields.trial_reset_version = { stringValue: '' };
        fields.professional_trial_used = { booleanValue: false };
    } else {
        return;
    }

    try {
        try {
            await callInstallAccessFunction('adminSetOwnMembershipTier', { tier });
        } catch (serverError) {
            // Compatibility fallback while the narrowly-scoped QA endpoint is
            // rolling out. Released 2.0 rules permit only this exact admin UID
            // to write the legacy switcher fields.
            const fieldParams = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
            const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${firebaseAuthState.uid}?${fieldParams}`;
            const res = await fetch(url, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${firebaseAuthState.idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fields })
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json?.error?.message || serverError?.message || 'Failed to update membership.');
            }
        }
        // A startup refresh may already be in flight. The second forced pass
        // guarantees that the just-written state wins that race.
        await refreshGateState({ forceRemote: true });
        await refreshGateState({ forceRemote: true });
        applySubscriptionGate();
        await refreshUI();
        showGateStatus(`Dev: membership set to "${tier}".`);
    } catch (error) {
        console.error('Dev membership switch failed:', error);
        showGateStatus(`Dev switch failed: ${error.message || String(error)}`, true);
    } finally {
        buttons.forEach((button) => { button.disabled = false; });
    }
}

async function clearChromeAuthTokens() {
    return new Promise((resolve) => {
        chrome.identity.clearAllCachedAuthTokens(() => resolve());
    });
}

function isAuthLandingVisible() {
    return !!authLandingPanel && !authLandingPanel.classList.contains('hidden');
}

function isPersistentAuthLandingNotice(message) {
    return [
        t('accountCreatedVerifyEmail'),
        t('emailVerificationRequired'),
        t('emailVerificationSent')
    ].includes(message);
}

function isSuccessAuthLandingNotice(message) {
    return [
        t('accountCreatedVerifyEmail'),
        t('emailVerificationSent'),
        t('passwordResetSent')
    ].includes(message);
}

function showAuthLandingNotice(message, isError = false) {
    if (!authLandingNotice || !message || !isAuthLandingVisible()) return;
    clearTimeout(authLandingNoticeTimer);
    const persistent = isPersistentAuthLandingNotice(message);
    const isSuccess = !isError && isSuccessAuthLandingNotice(message);
    authLandingNotice.textContent = message;
    authLandingNotice.classList.toggle('error', !!isError);
    authLandingNotice.classList.toggle('success', isSuccess);
    authLandingNotice.dataset.persistent = persistent ? 'true' : 'false';
    authLandingNotice.classList.remove('hidden');
    if (persistent) return;
    authLandingNoticeTimer = setTimeout(() => {
        if (authLandingNotice.textContent === message) {
            authLandingNotice.classList.add('hidden');
            authLandingNotice.classList.remove('error');
            authLandingNotice.classList.remove('success');
            authLandingNotice.dataset.persistent = 'false';
        }
    }, isError ? 10000 : 8000);
}

function clearAuthLandingNotice({ force = false } = {}) {
    clearTimeout(authLandingNoticeTimer);
    if (!authLandingNotice) return;
    if (!force && authLandingNotice.dataset.persistent === 'true') return;
    authLandingNotice.textContent = '';
    authLandingNotice.classList.add('hidden');
    authLandingNotice.classList.remove('error');
    authLandingNotice.classList.remove('success');
    authLandingNotice.dataset.persistent = 'false';
}

function isUnusualActivityRecoveryPhase(phase = '') {
    return phase === 'cooldown' || phase === 'post_reload';
}

function formatRecoveryCountdown(remainingMs = 0) {
    const totalSeconds = Math.max(0, Math.ceil((Number(remainingMs) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return currentLanguage === 'ko'
        ? `${minutes}분 ${seconds}초`
        : `${minutes} min ${seconds} sec`;
}

function stopErrorPopupCountdown({ hide = true, clearPhase = true } = {}) {
    if (errorPopupCountdownTimer) {
        clearInterval(errorPopupCountdownTimer);
        errorPopupCountdownTimer = null;
    }
    if (hide) errorPopupCountdown?.classList.add('hidden');
    if (clearPhase) activeErrorPopupRecoveryPhase = '';
}

function startErrorPopupCountdown(deadline, recoveryPhase) {
    stopErrorPopupCountdown({ hide: false, clearPhase: false });
    activeErrorPopupRecoveryPhase = recoveryPhase;
    errorPopupCountdown?.classList.remove('hidden');
    if (errorPopupCountdownLabel) {
        errorPopupCountdownLabel.textContent = recoveryPhase === 'post_reload'
            ? t('recoveryPostReloadLabel')
            : t('recoveryCooldownLabel');
    }

    const expiresAt = Number(deadline) || Date.now();
    const render = () => {
        const remaining = Math.max(0, expiresAt - Date.now());
        if (errorPopupCountdownValue) {
            errorPopupCountdownValue.textContent = formatRecoveryCountdown(remaining);
        }
        if (remaining <= 0 && errorPopupCountdownTimer) {
            clearInterval(errorPopupCountdownTimer);
            errorPopupCountdownTimer = null;
        }
    };
    render();
    if (expiresAt > Date.now()) errorPopupCountdownTimer = setInterval(render, 1000);
}

function closeErrorPopup() {
    stopErrorPopupCountdown();
    errorPopupRecoveryHelp?.classList.add('hidden');
    errorPopupModal?.classList.add('hidden');
}

function renderErrorPopupRecoveryHelp(isRecovery) {
    errorPopupRecoveryHelp?.classList.toggle('hidden', !isRecovery);
    if (!isRecovery) return;
    if (errorPopupRecoveryCause) errorPopupRecoveryCause.textContent = t('recoveryCauseExplanation');
    if (errorPopupRecoveryLink) {
        errorPopupRecoveryLink.textContent = t('recoveryGoogleHelpLink');
        errorPopupRecoveryLink.href = `https://support.google.com/flow/answer/16353333?hl=${currentLanguage === 'ko' ? 'ko' : 'en'}`;
    }
    if (errorPopupRecoveryAccountTip) errorPopupRecoveryAccountTip.textContent = t('recoveryOtherAccountTip');
}

function getRecoveryPopupMessage(recoveryPhase) {
    return recoveryPhase === 'post_reload'
        ? t('recoveryPostReloadMessage')
        : t('recoveryCooldownMessage');
}

function showErrorPopup(message, {
    force = false,
    recoveryPhase = '',
    countdownUntil = 0
} = {}) {
    // The Install ID denial screen is the highest-priority access state. Do not
    // cover it with trial-expired, queue, or recovery dialogs.
    if (isStarterInstallRestricted()) return;
    if (!errorPopupModal || !message || message === t('ready')) return;
    const isRecovery = isUnusualActivityRecoveryPhase(recoveryPhase);
    const normalized = String(isRecovery ? getRecoveryPopupMessage(recoveryPhase) : message).trim();
    if (!normalized) return;
    const now = Date.now();
    if (!force && !isRecovery && lastErrorPopup.message === normalized && now - lastErrorPopup.at < 2500) return;
    lastErrorPopup = { message: normalized, at: now };
    if (!isRecovery) stopErrorPopupCountdown();
    if (errorPopupTitle) {
        errorPopupTitle.textContent = isRecovery
            ? (recoveryPhase === 'post_reload' ? t('recoveryPostReloadTitle') : t('recoveryCooldownTitle'))
            : t('errorPopupTitle');
    }
    if (errorPopupMessage) errorPopupMessage.textContent = normalized;
    if (errorPopupCloseBtn) errorPopupCloseBtn.textContent = isRecovery ? t('recoveryCancel') : t('errorPopupClose');
    renderErrorPopupRecoveryHelp(isRecovery);
    if (isRecovery) startErrorPopupCountdown(countdownUntil, recoveryPhase);
    errorPopupModal.classList.remove('hidden');
}

async function restoreUnusualActivityRecoveryPopup() {
    if (isStarterInstallRestricted()) {
        closeErrorPopup();
        return false;
    }
    const data = await chrome.storage.local.get(UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY);
    const recovery = data?.[UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY];
    if (!isUnusualActivityRecoveryPhase(recovery?.phase)) {
        if (activeErrorPopupRecoveryPhase) closeErrorPopup();
        return false;
    }
    const countdownUntil = recovery.phase === 'post_reload'
        ? recovery.resumeAt
        : recovery.cooldownUntil;
    showErrorPopup(getRecoveryPopupMessage(recovery.phase), {
        force: true,
        recoveryPhase: recovery.phase,
        countdownUntil
    });
    if (statusBar) {
        statusBar.classList.remove('hidden');
        statusBar.textContent = recovery.phase === 'post_reload'
            ? t('recoveryPostReloadTitle')
            : t('recoveryCooldownTitle');
        statusBar.dataset.state = 'warning';
    }
    return true;
}

async function handleErrorPopupClose() {
    if (!activeErrorPopupRecoveryPhase) {
        closeErrorPopup();
        return;
    }
    const result = await sendCommand('CANCEL_UNUSUAL_ACTIVITY_RECOVERY');
    if (!result?.ok) {
        showErrorPopup(result?.error || 'Could not cancel automatic recovery.', { force: true });
        return;
    }
    closeErrorPopup();
    if (statusBar) {
        statusBar.classList.remove('hidden');
        statusBar.textContent = t('recoveryCanceledMessage');
        statusBar.dataset.state = 'paused';
    }
}

function looksLikeErrorProgress(message = '') {
    const text = String(message || '').toLowerCase();
    if (!text) return false;
    return [
        'fail',
        'failed',
        'error',
        'not found',
        'required',
        'blocked',
        'too narrow',
        'expired',
        'limit reached',
        'could not',
        'unable',
        'no target',
        'not supported',
        'sign in'
    ].some(token => text.includes(token));
}

function showGateStatus(message, isError = false) {
    if (isAuthLandingVisible() && message && message !== t('ready')) {
        showAuthLandingNotice(message, isError);
    }
    if (isError) {
        showErrorPopup(message);
    }
    if (!statusBar) return;
    statusBar.classList.remove('hidden');
    statusBar.textContent = message;
    statusBar.dataset.state = isError ? 'error' : 'info';
    if (isError) {
        statusBar.style.color = '#fda4af';
    } else {
        statusBar.style.color = '';
    }
    setTimeout(() => {
        if (statusBar.textContent === message) {
            statusBar.style.color = '';
            statusBar.textContent = t('ready');
            statusBar.dataset.state = 'idle';
        }
    }, 3500);
}

function hasConfiguredOAuthClient() {
    const clientId = chrome.runtime.getManifest()?.oauth2?.client_id || '';
    const webClientId = getGoogleOAuthWebClientId();
    return (clientId && !clientId.startsWith('REPLACE_WITH_')) || !!webClientId;
}

function getGoogleOAuthRedirectUri() {
    return chrome.identity.getRedirectURL('google');
}

function getGoogleOAuthWebClientId() {
    return (firebaseConfig.googleOAuthWebClientId || firebaseConfig.edgeGoogleOAuthClientId || '').trim();
}

function isMicrosoftEdge() {
    const ua = navigator?.userAgent || '';
    return ua.includes('Edg/');
}

async function logAuthError(message, detail = '') {
    const suffix = detail ? ` (${detail})` : '';
    await storage.addLog(`SSO: ${message}${suffix}`, 'error');
}

async function logAuthConfigDiagnostics() {
    try {
        const manifest = chrome.runtime.getManifest();
        const oauthClientId = manifest?.oauth2?.client_id || '';
        const firebaseProjectId = firebaseConfig.projectId || '';

        const today = new Date().toISOString().slice(0, 10);
        const signature = `${today}|${oauthClientId}|${firebaseProjectId}`;
        const data = await chrome.storage.local.get(AUTH_DIAGNOSTIC_LOG_KEY);
        if (data[AUTH_DIAGNOSTIC_LOG_KEY] === signature) return;

        await storage.addLog(`SSO Config: firebase project=${firebaseProjectId}, oauth client=${oauthClientId || 'missing'}`, 'info');
        if (!oauthClientId || oauthClientId.startsWith('REPLACE_WITH_')) {
            await storage.addLog('SSO Config: oauth2.client_id is missing/placeholder in manifest.json', 'error');
        } else {
            await storage.addLog('SSO Config: ensure OAuth client was created in the same GCP project as Firebase', 'info');
        }

        await chrome.storage.local.set({ [AUTH_DIAGNOSTIC_LOG_KEY]: signature });
    } catch (error) {
        console.warn('Failed to log auth diagnostics:', error);
    }
}

function getFriendlyEmailAuthError(message = '') {
    const code = String(message || '').toUpperCase();
    if (code.includes('USER_DISABLED')) return t('trialExpiredDisabled');
    if (code.includes('EMAIL_EXISTS')) return t('emailAlreadyExists');
    if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
        return t('emailSignInInvalid');
    }
    if (code.includes('WEAK_PASSWORD')) return t('emailWeakPassword');
    if (code.includes('INVALID_EMAIL')) return t('emailInvalid');
    if (code.includes('PASSWORD_LOGIN_DISABLED')) return t('emailPasswordDisabled');
    return message || t('emailSignInFailed');
}

async function finalizeFirebaseSignInSession() {
    applySubscriptionGate();
    let firestoreWriteFailed = false;

    try {
        await refreshGateState({ forceRemote: true });
        const shouldSeedGateDefaults = gateState.source === 'firestore_missing';
        const trialWindow = null;
        if (shouldSeedGateDefaults || gateState.ssoVerified !== true) {
            await upsertFirestoreGateState({
                ssoVerified: true,
                subscribed: false,
                includeDefaultPremium: shouldSeedGateDefaults,
                includeDefaultSubscriberConfirmed: shouldSeedGateDefaults,
                includeDefaultDisabled: shouldSeedGateDefaults,
                includeDefaultProfessional: shouldSeedGateDefaults,
                includeDefaultMembership: shouldSeedGateDefaults,
                trialWindow
            });
            gateState = {
                ...gateState,
                ssoVerified: true,
                subscribed: false,
                trial: trialWindow ? true : gateState.trial === true,
                trialUsed: trialWindow ? true : gateState.trialUsed === true,
                trialResetVersion: trialWindow ? TRIAL_RESET_VERSION : gateState.trialResetVersion || '',
                trialStartedAt: trialWindow?.startedAt || gateState.trialStartedAt || null,
                trialExpiresAt: trialWindow?.expiresAt || gateState.trialExpiresAt || null,
                membershipStatus: trialWindow ? 'trialing' : gateState.membershipStatus,
                uid: firebaseAuthState.uid,
                checkedAt: Date.now(),
                loaded: true
            };
            await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: gateState });
        } else if (trialWindow) {
            await upsertFirestoreGateState({
                ssoVerified: true,
                subscribed: gateState.subscribed === true,
                trialWindow
            });
            gateState = {
                ...gateState,
                trial: true,
                trialUsed: true,
                trialResetVersion: TRIAL_RESET_VERSION,
                trialStartedAt: trialWindow.startedAt,
                trialExpiresAt: trialWindow.expiresAt,
                membershipStatus: 'trialing',
                uid: firebaseAuthState.uid,
                checkedAt: Date.now(),
                loaded: true
            };
            await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: gateState });
        }
    } catch (error) {
        console.warn('Firestore gate write failed:', error);
        firestoreWriteFailed = true;
        gateState = {
            ...gateState,
            ssoVerified: true,
            subscribed: false,
            subscriberConfirmed: false,
            premium: false,
            trial: gateState.trial === true,
            disabled: false,
            specialPermission: false,
            loaded: true,
            source: 'local_firestore_unavailable',
            uid: firebaseAuthState.uid,
            checkedAt: Date.now()
        };
        await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: gateState });
        await logAuthError('Firestore update failed (check Firestore rules for users/{uid})', error?.message || 'unknown error');
    }

    await refreshUI();
    await chrome.storage.local.remove(REMOTE_NOTIFICATION_CACHE_KEY);
    maybeShowRemoteNotification();
    return { firestoreWriteFailed };
}

async function handleGoogleSignIn() {
    if (!hasConfiguredOAuthClient()) {
        showGateStatus(t('oauthClientIdMissing'), true);
        await logAuthError('oauth2.client_id is not configured in manifest.json');
        return;
    }
    // This call starts directly from the click gesture. It is independent of
    // Google/Firebase authentication and is used to register the persistent
    // Install ID for every membership after sign-in.
    const installPermissionPromise = requestInstallFunctionsHostPermission().catch(() => false);
    try {
        storage.addLog('SSO: Sign-in button clicked', 'info').catch(() => { });
        if (quickSignInBtn) quickSignInBtn.disabled = true;
        if (settingsSignInBtn) settingsSignInBtn.disabled = true;
        if (googleSsoBtn) googleSsoBtn.disabled = true;
        if (premiumLoginBtn) premiumLoginBtn.disabled = true;
        if (authGoogleBtn) authGoogleBtn.disabled = true;
        if (authEmailSubmitBtn) authEmailSubmitBtn.disabled = true;
        if (authStatusText) authStatusText.textContent = t('signingInShortStatus');
        if (authStatusTextSettings) authStatusTextSettings.textContent = t('signingInShortStatus');
        showGateStatus(t('signingInGoogle'));
        await installPermissionPromise;
        const scopes = ['openid', 'email', 'profile'];
        const token = await getGoogleAccessToken(true, scopes);
        await signInFirebaseWithGoogleAccessToken(token);
        const { firestoreWriteFailed } = await finalizeFirebaseSignInSession();
        if (firestoreWriteFailed) {
            showGateStatus(t('signedInFirestoreFailed'), true);
            return;
        }
        if (isAccountDisabled()) {
            applySubscriptionGate();
            showGateStatus(getAccountDisabledMessage(), true);
            return;
        }
        showGateStatus(t('ready'));
    } catch (error) {
        console.error('Google sign-in failed:', error);
        await logAuthError('Google sign-in failed', error?.message || 'unknown error');
        showGateStatus(tFormat('signInFailed', { message: error.message }), true);
    } finally {
        if (quickSignInBtn) quickSignInBtn.disabled = false;
        if (settingsSignInBtn) settingsSignInBtn.disabled = false;
        if (googleSsoBtn) googleSsoBtn.disabled = false;
        if (premiumLoginBtn) premiumLoginBtn.disabled = false;
        if (authGoogleBtn) authGoogleBtn.disabled = false;
        if (authEmailSubmitBtn) authEmailSubmitBtn.disabled = false;
    }
}

function syncAuthEmailMode() {
    const createMode = authEmailMode === 'create';
    setText('authLandingTitle', createMode ? t('createAccountTitle') : t('welcomeBackTitle'));
    setText('authLandingSubtitle', createMode ? t('createAccountSubtitle') : t('welcomeBackSubtitle'));
    setText('authEmailSubmitBtn', createMode ? t('createAccount') : t('signIn'));
    setText('authSwitchPrompt', createMode ? t('alreadyHaveAccount') : t('dontHaveAccount'));
    setText('authModeToggleBtn', createMode ? t('signIn') : t('createAccount'));
    if (authPasswordInput) authPasswordInput.autocomplete = createMode ? 'new-password' : 'current-password';
}

function setAuthLandingBusy(isBusy) {
    [authGoogleBtn, authEmailSubmitBtn, authModeToggleBtn, authForgotPasswordBtn].forEach((btn) => {
        if (btn) btn.disabled = !!isBusy;
    });
}

async function handleEmailAuthSubmit() {
    const email = String(authEmailInput?.value || '').trim();
    const password = String(authPasswordInput?.value || '');
    if (!email) {
        showGateStatus(t('emailRequired'), true);
        authEmailInput?.focus();
        return;
    }
    if (!password) {
        showGateStatus(t('passwordRequired'), true);
        authPasswordInput?.focus();
        return;
    }
    const installPermissionPromise = requestInstallFunctionsHostPermission().catch(() => false);
    try {
        setAuthLandingBusy(true);
        showGateStatus(authEmailMode === 'create' ? t('creatingAccount') : t('signingInEmail'));
        await installPermissionPromise;
        const createdAccount = authEmailMode === 'create';
        await signInFirebaseWithEmailPassword(email, password, { createAccount: createdAccount });
        if (createdAccount) {
            await sendFirebaseEmailVerification();
            await clearFirebaseAuthState();
            await clearGateStateCache();
            await refreshUI();
            authEmailMode = 'signIn';
            syncAuthEmailMode();
            showGateStatus(t('accountCreatedVerifyEmail'));
            return;
        }
        const verified = await requireVerifiedEmailForPasswordAuth({ resend: false });
        if (!verified) {
            return;
        }
        const { firestoreWriteFailed } = await finalizeFirebaseSignInSession();
        if (firestoreWriteFailed) {
            showGateStatus(t('signedInFirestoreFailed'), true);
            return;
        }
        if (isAccountDisabled()) {
            applySubscriptionGate();
            showGateStatus(getAccountDisabledMessage(), true);
            return;
        }
        showGateStatus(t('ready'));
    } catch (error) {
        console.error('Email auth failed:', error);
        showGateStatus(tFormat('signInFailed', { message: error.message }), true);
    } finally {
        setAuthLandingBusy(false);
    }
}

async function handlePasswordReset() {
    const email = String(authEmailInput?.value || '').trim();
    try {
        setAuthLandingBusy(true);
        await sendFirebasePasswordReset(email);
        showGateStatus(t('passwordResetSent'));
    } catch (error) {
        showGateStatus(tFormat('passwordResetFailed', { message: error.message }), true);
    } finally {
        setAuthLandingBusy(false);
    }
}

async function handleGoogleSignOut() {
    let tokenClearError = null;
    isSigningOut = true;
    firebaseAuthState = { uid: null, email: null, displayName: null, photoUrl: null, emailVerified: false, providerId: null, idToken: null, refreshToken: null, expiresAt: 0 };
    gateState = { ssoVerified: false, subscribed: false, subscriberConfirmed: false, premium: false, trial: false, trialStartedAt: null, trialExpiresAt: null, disabled: false, specialPermission: false, professional: false, loaded: true, source: 'local' };
    try {
        await clearChromeAuthTokens();
    } catch (error) {
        tokenClearError = error;
        console.warn('Token clear failed during sign-out:', error);
    }

    try {
        await clearFirebaseAuthState();
        await clearGateStateCache();
        await storage.updateSettings({ autoDownload: false });
        await resetPremiumAssetSelections({ stripQueueAssets: true });
        applySubscriptionGate();
        await refreshUI();
        if (tokenClearError) {
            showGateStatus(t('signedOutTokenClearFailed'), true);
            return;
        }
        showGateStatus(t('signedOut'));
    } catch (error) {
        console.error('Sign-out failed:', error);
        showGateStatus(tFormat('signOutFailed', { message: error.message }), true);
    } finally {
        isSigningOut = false;
    }
}

const I18N = {
    en: {
        stop: 'Stop',
        run: 'Run',
        forceRefresh: 'Force Refresh',
        refreshConnection: 'Refresh Connection',
        userGuide: 'User Guide',
        premiumFeature: 'Premium Feature',
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        premiumFeatureKicker: 'Premium Access',
        premiumFeatureTitle: 'Premium Feature',
        premiumFeatureMessage: 'Premium features are available to eligible registered users or active subscribers.',
        premiumFeatureFeedback: 'Google Flow Automator is a free tool, and your support helps us continue improving it. If you enjoy using the tool, we would really appreciate your honest feedback or review on the Chrome Web Store. Honest reviews help more users discover the tool and keep this project growing.',
        premiumFeatureYoutube: 'You may also subscribe to the YouTube channel to support this tool and follow updates.',
        premiumFeatureManual: 'Leaving a review is completely optional and does not guarantee premium access. Eligibility will be checked automatically, and premium access may be updated or revoked if the requirements are no longer met.',
        premiumFeatureSupporter: 'Become a Supporter to unlock Dedicated Premium User status — you\'ll keep full access to all premium features with no interruptions.',
        premiumFeatureForm: 'Request Access Form',
        premiumFeatureReview: 'Open Chrome Web Store',
        premiumFeatureClose: 'Close',
        tryPremiumTrial: 'Try Premium for 3 Days',
        confirmTrialActivation: 'Start your Premium trial? All premium features will be unlocked until {date}.',
        requestPremiumAccess: 'Request Premium Access',
        trialExpiredLabel: 'Trial expired',
        premiumTrialActivated: 'Premium Trial activated. Premium access is available until {date}.',
        premiumTrialActivationFailed: 'Premium Trial activation failed: {message}',
        tryProfessionalTrial: 'Try Professional for 24 Hours',
        confirmProfessionalTrialActivation: 'Start your Professional (Supporter) trial? Access is available until {date}.',
        professionalTrialActivated: 'Professional Trial activated. Access is available until {date}.',
        professionalTrialActivationFailed: 'Professional Trial activation failed: {message}',
        professionalTrialUnavailable: 'Professional Trial is not available for this account.',
        storyboard: 'Advanced Storyboard',
        loginRequiredTitle: 'Sign in required',
        loginRequiredBody: 'Sign in with Google to use Google Flow Automator.',
        loginRequiredToUse: 'Please sign in with Google before using this feature.',
        trialExpiredDisabled: 'Your trial has been expired.',
        trialExpiredUpgrade: 'Your trial has expired. Please upgrade to continue.',
        membershipUsageTitle: 'Membership',
        starterUsageBody: '{used}/{limit} prompts used today',
        unlimitedUsageBody: 'Unlimited prompts available',
        unlimited: 'Unlimited',
        trialEndsAt: 'Trial ends {date}',
        trialUnlimitedUntil: 'Unlimited until {date}',
        starterQuotaReached: 'Starter daily prompt limit reached ({limit} prompts/day).',
        starterQuotaNotEnough: 'Starter has {remaining} prompt(s) left today out of {limit}. Reduce the queue or upgrade.',
        profileTitle: 'User Profile',
        profileUserId: 'User ID',
        profileLanguage: 'Language',
        profileMembership: 'Membership',
        profileQuota: 'Prompt access',
        profileTrialAccess: 'Trial access',
        starterTier: 'Starter',
        premiumTier: 'Premium',
        premiumRequiredMembership: 'Premium Required',
        professionalTier: 'Professional',
        upgrade: 'Upgrade',
        upgraded: 'Upgraded',
        starterFeatures: ['Google SSO or email login access', 'Prompt queue and CSV import', 'Basic prompt automation', '1K auto-download after generation'],
        premiumFeatures: ['Everything in Starter', 'Reference images up to 3', 'Characters up to 2', 'Different assets per prompt', 'Download 2K Upscaled beta', 'Storyboard planning'],
        professionalFeatures: ['Everything in Premium', 'Unlimited reference images and characters', 'Image/Video Mode switching', 'Video workflow support: Ingredients, Frames, Start/End frame, model selection', 'Storyboard and advanced planning tools', 'Image Downloader (batch download + 2K/4K upscaled)', 'Dark Mode', 'Priority access to new beta features'],
        premiumFormNotConfigured: 'Google Form URL is not configured yet.',
        settingsAccount: 'Account',
        supportProject: 'Support this project',
        supportDescription: 'If this tool saves you time, you can support future updates.',
        donate: 'Donate',
        subscribeSupportTitle: 'Support this tool',
        subscribeSupportNote: 'Please subscribe to my channel to support this tool.',
        subscribeOnYoutube: 'Subscribe on YouTube',
        subscriptionConfirmed: 'Subscription status: Confirmed',
        tempTransferTitle: 'Temp Image Transfer',
        tempTransferDescription: 'Prepare all visible images or videos from the current page for transfer to the receiver site.',
        prepareTempImages: 'Prepare Temp Images',
        openReceiverSite: 'Open Receiver Site',
        bulkDownloaderTitle: 'Image Downloader',
        bulkDownloaderNote: "Premium unlock is required to use Image Downloader. We don't use your login data; it is only used to verify login.",
        imageDownloaderFeatures: 'Includes Page Image Downloader + 2K Upscaled Auto Downloader for generated images.',
        subscriberConfirmed: 'Confirmed Subscriber: Yes/No (Coming Soon)',
        subscriberVerifyNote: 'Verification will run regularly and disable Download features if you are unsubscribed.',
        ssoGate: 'Please sign in with Google SSO to use Image Downloader',
        ssoFeaturePreview: 'Includes 2K Upscaled Auto Downloader',
        signInGoogle: 'Sign in with Google',
        signInShort: 'Sign in with Google',
        signOut: 'Sign out',
    ssoSignedIn: 'Google SSO: Signed in',
        emailSignedIn: 'Email: Signed in',
        ssoSignedOut: 'Google SSO: Signed out',
        firebaseUid: 'User ID',
        copyFirebaseUid: 'Copy',
        firebaseUidCopied: 'User ID copied.',
        firebaseUidCopyFailed: 'Could not copy User ID. Please select and copy it manually.',
        unlockSsoBtn: 'I Signed In - Continue',
        subscribeGate: 'Please subscribe my channel to support my tool. This app will be only allowed for my subscribers, which is still free to use :)',
        subscribeBtn: 'Subscribe',
        unlockBtn: 'I Subscribed - Unlock',
        lockNote: 'Unlock the feature by Google SSO.',
        ssoLocked: 'Sign in with Google SSO to continue.',
        premiumLoginBanner: 'Login to unlock features',
        premiumFeatureLocked: 'Premium Feature - Unlock Required',
        professionalFeatureLocked: 'Professional Only',
        premiumAssetsLockedBody: 'Locked features: Character Assets and Reference Images.',
        assetPremiumLocked: 'Premium Feature - Unlock Required',
        flowWindowTooNarrow: 'Browser window is too narrow. Please widen the Google Flow window to at least {width}px, then try again.',
        subscribeLocked: 'Please subscribe my channel to support my tool. This app will be only allowed for my subscribers, which is still free to use :)',
        downloadToolsLocked: 'Premium Feature - Unlock Required for Image Downloader.',
        unlocked: 'Unlocked',
        control: 'Control',
        settings: 'Setting',
        comingSoon: 'Coming Soon',
        outputType: 'Output Type',
        image: 'Image',
        video: 'Video',
        formFactor: 'Form Factor',
        landscape: 'Landscape',
        portrait: 'Portrait',
        batchSize: 'Batch Size',
        generationModel: 'Generation Model',
        characterId: 'Character ID',
        characterPlaceholder: 'Describe a character to stay consistent...',
        promptQueue: 'Prompt Queue',
        addToQueue: 'Add to Queue',
        queueAction: 'Queue & Select',
        promptPlaceholder: 'Paste your prompts here, separated by empty lines...',
        promptPlaceholderVideoMultiline: 'Paste your video prompts here, separated by @@@NEXT@@@...',
        detectedPrompts: 'Detected Prompts',
        generationAutoDownloadTitle: 'Generation Auto-Download',
        autoDownload: 'Auto-download after image generation',
        upscaleDownload: 'Download 2K Upscaled',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        upscaleDownloadLocked: 'Premium Feature - Unlock Required',
        upscaleDownloadNote: 'Beta: downloads the 2K upscaled version after each generated image, waits for it to finish, then sends the next prompt. It is slower, not used by Download Page Images, and may not be perfect if Flow changes.',
        upscaleDownloadToolsDisabled: 'Not Support for Upscaled images',
        waitForImageResponse: 'Wait for image response',
        waitForImageResponseNote: 'When off, the queue moves to the next prompt right after submit.',
        promptDelay: 'Prompt delay',
        promptDelayNote: 'When on, waits the selected seconds before sending the next prompt. Allowed range: 10-90 seconds (in steps of 10). Premium only.',
        promptDelayPremiumOnly: 'Delay customization is available for Premium users only.',
        promptDelaySeconds: 'Delay seconds (10-300)',        currentQueue: 'Current Queue',
        tasks: 'tasks',
        noActiveTasks: 'No active tasks.',
        startAutomation: 'Start Automation',
        retryUnfinished: 'Retry Unfinished',
        retryUnfinishedConfirm: 'Retry unfinished prompts? Completed prompts will stay completed.',
        retryUnfinishedReady: 'Unfinished prompts are ready to run again.',
        noUnfinishedToRetry: 'No unfinished prompts to retry.',
        reuseCompletedPrompt: 'Reuse',
        reuseCompletedPromptTitle: 'Reuse this completed prompt',
        completedPromptReused: 'Completed prompt was copied to the queue.',
        queuedWhileRunning: 'Added to the queue. The current generation will continue.',
        queueCompletedAddMore: 'Queue completed. Add new prompts or clear the queue.',
        clearQueue: 'Clear Queue',
        stopActiveTask: 'Stop Active Task',
        downloadTools: 'Download Tools',
        downloadHint: '',
        downloadPageImages: 'Download Page Images',
        language: 'Language',
        theme: 'Theme',
        themeDefault: 'Default',
        themeLogo: 'Logo',
        themeDark: 'Dark',
        concurrentProcessing: 'Concurrent Processing',
        staggerDelay: 'Stagger Delay',
        generationTimeout: 'Generation Timeout (m)',
        retryCount: 'Retry Count',
        importCsvSoon: 'Import CSV (Coming Soon)',
        disabled: 'Disabled',
        failedLog: 'Failed Tasks Log (Last 24h)',
        noRecentErrors: 'No recent errors.',
        editPrompt: 'Edit Prompt',
        saveChanges: 'Save Changes',
        cancel: 'Cancel',
        restrictedText: 'This automator only works on Google Flow project pages.',
        restrictedFooter: 'Please open or create a project to start.',
        goToFlow: 'Go to Google Flow',
        pleaseEnterPrompts: 'Please enter some prompts first.',
        confirmClearQueue: 'Clear entire queue and reset state?',
        onlyProjectPage: 'Download Page Images is only available inside a Flow Project page.',
        confirmDeleteTask: 'Delete this task?',
        runningQueue: 'Running Queue...',
        queueFinished: 'Queue Finished.',
        stopping: 'Stopping...',
        stopped: 'Stopped.',
        finished: 'Finished.',
        refreshingConnectionMsg: 'Refreshing connection...',
        ready: 'Ready.',
        remoteNotificationDefaultTitle: 'Extension Notice',
        remoteNotificationConfirm: 'Got it',
        remoteNotificationVersion: 'Version {version}',
        queueAssetsTitle: 'Per-Prompt Assets',
        queueAssetsInherited: 'Current assets are copied into each queue item.',
        perPromptAssets: 'Use different assets per prompt',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
        perPromptAssetsUnlockRequired: 'Unlock Required',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        perPromptAssetsLockedDetail: 'Use different character/reference images for each prompt.',
        videoMultilinePromptUnlockRequired: 'Unlock Required',
        videoMultilinePromptLocked: 'Professional Feature - Unlock Required',
        videoMultilinePromptLockedDetail: 'Use multi-line prompts separated by @@@NEXT@@@.',
        videoMultilinePrompt: 'Use multi-line prompt',
        videoMultilinePromptNote: 'Allows writing multi-line prompts for video mode, separating queue items with @@@NEXT@@@.',
        promptAssetsHint: 'Current character and reference images are copied into each prompt when added. Use the queue buttons to edit assets per prompt before running.',
        reviewPromptAssetsBeforeStart: 'Prompts added. Review per-prompt assets below, then click Start again.',
        queueCharacterButton: 'Edit Character',
        queueImagesButton: 'Edit Images',
        queueAddCharacterButton: '+ Character',
        queueAddImagesButton: '+ Images',
        queueNoCharacter: 'No character',
        queueNoImages: 'No images',
        queueSelectTopCharacterFirst: 'Select a character at the top first.',
        queueSelectTopImagesFirst: 'Select reference images at the top first.',
        queueAssetPickerCharacterTitle: 'Select Character for This Prompt',
        queueAssetPickerImagesTitle: 'Select Images for This Prompt',
        queueAssetPickerSubtitle: 'Choose from the assets selected at the top. Click thumbnails to select or remove.',
        queueVideoIngredientPickerSubtitle: '{selected} / {max} selected — click thumbnails to toggle, then tap Done.',
        queueVideoIngredientPickerMax: 'Maximum {max} ingredients reached.',  
        queueAssetPickerDone: 'Done',
        queueCharacterSet: 'Character: {name}',
        queueCharactersSet: 'Characters: {count}',
        queueImagesSet: 'Images: {count}',
        premiumRequiredForVideoMode: 'Premium Feature Unlocked is required to change video Mode.',
        videoAssetQueueTitle: 'Video Assets',
        videoAssetQueueHelpText: 'Select images to use for video prompts. Each queued prompt can use Ingredients or Frames.',
        videoModeFrames: 'Frames',
        videoModeIngredients: 'Ingredients',
        videoModeHelp: 'Choose the video model here. Each queued prompt chooses either Ingredients or Frames separately.',
        videoModel: 'Video Model',
        videoVoiceLabel: 'Voice',
        videoVoicePlaceholder: 'Andrew or @Voice: Andrew',
        videoVoiceIncompatible: 'Voice is used only with Omni Flash Ingredients.',
        videoOmniEndFrameWarning: 'Omni Flash does not support an end frame. End frame selection is disabled.',
        videoModeUnsupportedByModel: 'The selected video model does not support this mode.',
        videoCreditsConfirm: 'Video generation will use Flow credits. Please confirm before running.',
        videoFrameStartRequired: 'Select a start frame before running Frames to Video.',
        videoIngredientsRequired: 'Select at least one ingredient image before running Ingredients to Video.',
        videoIngredientsMaxReached: 'Ingredients to Video supports up to 3 images per prompt.',
        videoModeRequired: 'Choose Ingredients or Frames for each video prompt before running.',
        videoSelectAssetsFirst: 'Select video assets above first.',
        queueVideoIngredientsTitle: 'Select Ingredients for This Prompt',
        queueVideoStartFrameTitle: 'Select Start Frame for This Prompt',
        queueVideoEndFrameTitle: 'Select End Frame for This Prompt',
        queueVideoIngredientsButton: '+ Ingredients',
        queueVideoStartButton: 'Start Image',
        queueVideoEndButton: 'End Image',
        videoThumbIngredientLabel: 'Ingredient',
        videoThumbStartLabel: 'Start',
        videoThumbEndLabel: 'End',
        queueVideoModeLabel: 'Mode',
        queueVideoDurationLabel: 'Duration',
        queueChooseVideoMode: 'Choose Ingredients or Frames',
        noStartFrame: 'No start frame',
        active: 'active',
        idle: 'Idle',
        running: 'Running',
        paused: 'Paused',
        pendingStatus: 'pending',
        inProgressStatus: 'in progress',
        completedStatus: 'completed',
        failedStatus: 'failed',
        failedPrefix: 'FAILED',
        justNow: 'Just now',
        minAgo: 'm ago',
        freeBadge: 'Free',
        creditsRequiredBadge: 'Credits Required',
        atATime: 'at a time'
    },
    ko: {
        stop: '중지',
        run: '실행',
        forceRefresh: '강제 새로고침',
        refreshConnection: '연결 새로고침',
        userGuide: '사용 가이드',
        supportProject: '프로젝트 후원',
        supportDescription: '이 도구가 시간을 절약해 준다면 업데이트를 후원해 주세요.',
        donate: '후원하기',
        ssoGate: 'Image Downloader를 사용하려면 Google SSO로 로그인하세요',
        signInGoogle: 'Google 로그인',
        signInShort: '로그인',
        signOut: '로그아웃',
        ssoSignedIn: 'SSO: 로그인됨',
        emailSignedIn: 'Email: 로그인됨',
        ssoSignedOut: 'SSO: 로그아웃됨',
        firebaseUid: 'User ID',
        copyFirebaseUid: '복사',
        firebaseUidCopied: 'User ID를 복사했습니다.',
        firebaseUidCopyFailed: 'User ID 복사에 실패했습니다. 직접 선택해서 복사해주세요.',
        unlockSsoBtn: '로그인 완료 - 계속',
        subscribeGate: '다운로드 도구 얼리 액세스를 위해 구독하세요',
        subscribeBtn: '구독',
        unlockBtn: '구독 완료 - 잠금 해제',
        lockNote: 'Google SSO 로그인과 구독 완료 전까지 잠겨 있습니다.',
        ssoLocked: '계속하려면 Google SSO로 로그인하세요.',
        subscribeLocked: '다운로드 도구를 사용하려면 구독하세요.',
        downloadToolsLocked: 'Image Downloader를 사용하려면 Google SSO로 로그인하세요.',
        premiumAssetsLockedBody: '잠긴 기능: 캐릭터 에셋 및 레퍼런스 이미지.',
        unlocked: '잠금 해제됨',
        control: '제어',
        settings: '설정',
        comingSoon: '곧 제공',
        outputType: '출력 타입',
        image: '이미지',
        video: '비디오',
        formFactor: '화면 비율',
        landscape: '가로형',
        portrait: '세로형',
        batchSize: '배치 수량',
        generationModel: '생성 모델',
        characterId: '캐릭터 ID',
        characterPlaceholder: '일관된 캐릭터를 위해 설명을 입력하세요...',
        promptQueue: '프롬프트 대기열',
        addToQueue: '대기열에 추가',
        promptPlaceholder: '빈 줄로 구분하여 프롬프트를 붙여넣으세요...',
        promptPlaceholderVideoMultiline: '비디오 프롬프트를 입력하세요. 각 대기열 항목은 @@@NEXT@@@으로 구분됩니다...',
        detectedPrompts: '감지된 프롬프트',
        generationAutoDownloadTitle: '생성 후 자동 다운로드',
        autoDownload: '결과 자동 다운로드',
        upscaleDownload: 'Download 2K Upscaled',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        upscaleDownloadNote: '베타 기능: 생성된 이미지마다 2K 업스케일 버전을 다운로드하고 완료 후 다음 프롬프트를 보냅니다. 느리며, Download Page Images에는 적용되지 않고 Flow UI 변경 시 완벽하지 않을 수 있습니다.',
        upscaleDownloadToolsDisabled: 'Not Support for Upscaled images',
        promptDelay: '프롬프트 지연',
        promptDelayNote: '켜면 다음 프롬프트를 보내기 전에 설정한 초만큼 대기합니다. 허용 범위: 10-90초 (10초 단위). 프리미엄 전용.',
        promptDelayPremiumOnly: '지연 시간 변경은 프리미엄 유저만 가능합니다.',
        promptDelaySeconds: '지연 시간 초 (10-300)',        currentQueue: '현재 대기열',
        tasks: '작업',
        noActiveTasks: '활성 작업이 없습니다.',
        startAutomation: '자동화 시작',
        retryUnfinished: '미완료 프롬프트 재실행',
        retryUnfinishedConfirm: '완료하지 못한 프롬프트를 다시 실행할까요? 완료된 프롬프트는 그대로 유지됩니다.',
        retryUnfinishedReady: '미완료 프롬프트를 다시 실행할 준비가 되었습니다.',
        noUnfinishedToRetry: '다시 실행할 미완료 프롬프트가 없습니다.',
        reuseCompletedPrompt: '재사용',
        reuseCompletedPromptTitle: '완료된 프롬프트를 다시 사용',
        completedPromptReused: '완료된 프롬프트를 대기열에 복사했습니다.',
        queuedWhileRunning: '대기열에 추가했습니다. 현재 생성은 계속 진행됩니다.',
        queueCompletedAddMore: '대기열이 완료되었습니다. 새 프롬프트를 추가하거나 대기열을 비워주세요.',
        clearQueue: '대기열 비우기',
        stopActiveTask: '실행 작업 중지',
        downloadTools: '다운로드 도구',
        downloadHint: '',
        downloadPageImages: '현재 페이지 이미지 다운로드',
        language: '언어',
        theme: '테마',
        themeDefault: '기본',
        themeLogo: '로고',
        themeDark: '다크',
        concurrentProcessing: '동시 처리',
        staggerDelay: '지연 시간',
        generationTimeout: '생성 제한 시간 (분)',
        retryCount: '재시도 횟수',
        importCsvSoon: 'CSV 가져오기 (곧 제공)',
        disabled: '비활성화',
        failedLog: '실패 작업 로그 (최근 24시간)',
        noRecentErrors: '최근 오류가 없습니다.',
        editPrompt: '프롬프트 편집',
        saveChanges: '변경 저장',
        cancel: '취소',
        restrictedText: '이 자동화 도구는 Google Flow 프로젝트 페이지에서만 동작합니다.',
        restrictedFooter: '시작하려면 프로젝트를 열거나 생성하세요.',
        goToFlow: 'Google Flow로 이동',
        pleaseEnterPrompts: '먼저 프롬프트를 입력하세요.',
        confirmClearQueue: '전체 대기열을 비우고 상태를 초기화할까요?',
        onlyProjectPage: '페이지 이미지 다운로드는 Flow 프로젝트 페이지에서만 사용할 수 있습니다.',
        confirmDeleteTask: '이 작업을 삭제할까요?',
        runningQueue: '대기열 실행 중...',
        queueFinished: '대기열 완료.',
        stopping: '중지 중...',
        stopped: '중지됨.',
        finished: '완료됨.',
        refreshingConnectionMsg: '연결 새로고침 중...',
        ready: '준비됨.',
        active: '활성',
        idle: '대기',
        running: '실행 중',
        paused: '일시 중지',
        pendingStatus: '대기 중',
        inProgressStatus: '진행 중',
        completedStatus: '완료',
        failedStatus: '실패',
        failedPrefix: '실패',
        justNow: '방금',
        minAgo: '분 전',
        freeBadge: '무료',
        creditsRequiredBadge: '크레딧 필요',
        atATime: '개씩'
    },
    ja: {
        stop: '停止',
        run: '実行',
        forceRefresh: '強制更新',
        refreshConnection: '接続を更新',
        userGuide: 'ユーザーガイド',
        supportProject: 'このプロジェクトを支援',
        supportDescription: 'このツールが役立ったら、今後の更新を支援してください。',
        donate: '寄付する',
        ssoGate: 'ダウンロードツールを有効化するにはGoogle SSOでサインイン',
        signInGoogle: 'Googleでサインイン',
        signInShort: 'サインイン',
        signOut: 'サインアウト',
        ssoSignedIn: 'SSO: サインイン済み',
        emailSignedIn: 'メール: サインイン済み',
        ssoSignedOut: 'SSO: 未サインイン',
        unlockSsoBtn: 'サインイン済み - 続行',
        subscribeGate: 'ダウンロードツール先行アクセスのためチャンネル登録',
        subscribeBtn: '登録する',
        unlockBtn: '登録済み - 解除',
        lockNote: 'Google SSOとチャンネル登録完了までロックされています。',
        ssoLocked: '続行するにはGoogle SSOでサインインしてください。',
        subscribeLocked: 'ダウンロードツールの利用には登録が必要です。',
        downloadToolsLocked: 'Image Downloaderを使用するにはGoogle SSOでサインインしてください。',
        unlocked: '解除済み',
        control: 'コントロール',
        settings: '設定',
        comingSoon: '近日対応',
        outputType: '出力タイプ',
        image: '画像',
        video: '動画',
        formFactor: 'アスペクト',
        landscape: '横長',
        portrait: '縦長',
        batchSize: 'バッチ数',
        generationModel: '生成モデル',
        characterId: 'キャラクターID',
        characterPlaceholder: '一貫性のあるキャラクター説明を入力...',
        promptQueue: 'プロンプトキュー',
        addToQueue: 'キューに追加',
        queueAction: 'Queue & Select',
        perPromptAssets: 'プロンプトごとに別のアセットを使う',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
                perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        promptPlaceholder: '空行区切りでプロンプトを貼り付け...',
        detectedPrompts: '検出されたプロンプト',
        autoDownload: '結果を自動ダウンロード',
        currentQueue: '現在のキュー',
        tasks: 'タスク',
        noActiveTasks: 'アクティブなタスクはありません。',
        startAutomation: '自動化を開始',
        retryUnfinished: '未完了を再実行',
        retryUnfinishedConfirm: '未完了のプロンプトを再実行しますか？完了済みのプロンプトはそのまま残ります。',
        retryUnfinishedReady: '未完了のプロンプトを再実行できるようにしました。',
        noUnfinishedToRetry: '再実行できる未完了のプロンプトはありません。',
        reuseCompletedPrompt: '再利用',
        reuseCompletedPromptTitle: 'この完了済みプロンプトを再利用',
        completedPromptReused: '完了済みプロンプトをキューにコピーしました。',
        clearQueue: 'キューをクリア',
        stopActiveTask: '実行中タスクを停止',
        downloadTools: 'ダウンロードツール',
        downloadHint: '* ダウンロード中に新しい画像が見つかると件数が増える場合があります。',
        downloadPageImages: 'ページ画像をダウンロード',
        language: '言語',
        concurrentProcessing: '同時処理',
        staggerDelay: '遅延',
        generationTimeout: '生成タイムアウト (分)',
        retryCount: '再試行回数',
        importCsvSoon: 'CSVインポート（近日対応）',
        disabled: '無効',
        failedLog: '失敗タスクログ（24時間）',
        noRecentErrors: '最近のエラーはありません。',
        editPrompt: 'プロンプトを編集',
        saveChanges: '保存',
        cancel: 'キャンセル',
        restrictedText: 'この自動化ツールはGoogle Flowのプロジェクトページでのみ動作します。',
        restrictedFooter: '開始するにはプロジェクトを開くか作成してください。',
        goToFlow: 'Google Flowへ移動',
        pleaseEnterPrompts: '先にプロンプトを入力してください。',
        confirmClearQueue: 'キューをすべて削除して状態をリセットしますか？',
        onlyProjectPage: 'ページ画像ダウンロードはFlowプロジェクトページでのみ利用できます。',
        confirmDeleteTask: 'このタスクを削除しますか？',
        runningQueue: 'キュー実行中...',
        queueFinished: 'キュー完了。',
        stopping: '停止中...',
        stopped: '停止しました。',
        finished: '完了。',
        refreshingConnectionMsg: '接続を更新中...',
        ready: '準備完了。',
        active: '稼働中',
        idle: '待機',
        running: '実行中',
        paused: '一時停止',
        pendingStatus: '待機中',
        inProgressStatus: '進行中',
        completedStatus: '完了',
        failedStatus: '失敗',
        failedPrefix: '失敗',
        justNow: 'たった今',
        minAgo: '分前',
        freeBadge: '無料',
        creditsRequiredBadge: 'クレジット必要',
        atATime: '件ずつ'
    },
    zh: {
        stop: '停止',
        run: '运行',
        forceRefresh: '强制刷新',
        refreshConnection: '刷新连接',
        userGuide: '使用指南',
        supportProject: '支持这个项目',
        supportDescription: '如果这个工具帮你节省了时间，欢迎支持后续更新。',
        donate: '捐赠',
        ssoGate: '请先使用 Google SSO 登录以启用下载工具',
        signInGoogle: 'Google 登录',
        signInShort: '登录',
        signOut: '退出',
        ssoSignedIn: 'SSO：已登录',
        emailSignedIn: '邮箱：已登录',
        ssoSignedOut: 'SSO：未登录',
        unlockSsoBtn: '我已登录 - 继续',
        subscribeGate: '订阅即可抢先使用下载工具',
        subscribeBtn: '去订阅',
        unlockBtn: '我已订阅 - 解锁',
        lockNote: '完成 Google SSO 登录和订阅前功能已锁定。',
        ssoLocked: '请先使用 Google SSO 登录。',
        subscribeLocked: '订阅后可解锁下载工具。',
        downloadToolsLocked: '请使用 Google SSO 登录以解锁 Image Downloader。',
        unlocked: '已解锁',
        control: '控制',
        settings: '设置',
        comingSoon: '即将推出',
        outputType: '输出类型',
        image: '图片',
        video: '视频',
        formFactor: '比例',
        landscape: '横向',
        portrait: '纵向',
        batchSize: '批量数量',
        generationModel: '生成模型',
        characterId: '角色ID',
        characterPlaceholder: '描述角色以保持一致性...',
        promptQueue: '提示词队列',
        addToQueue: '加入队列',
        queueAction: 'Queue & Select',
        perPromptAssets: '每个提示词使用不同素材',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
                perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        promptPlaceholder: '按空行分隔粘贴提示词...',
        detectedPrompts: '已识别提示词',
        autoDownload: '自动下载结果',
        currentQueue: '当前队列',
        tasks: '任务',
        noActiveTasks: '没有活动任务。',
        startAutomation: '开始自动化',
        retryUnfinished: '重试未完成',
        retryUnfinishedConfirm: '要重新运行未完成的提示词吗？已完成的提示词会保持完成状态。',
        retryUnfinishedReady: '未完成的提示词已准备好重新运行。',
        noUnfinishedToRetry: '没有可重试的未完成提示词。',
        reuseCompletedPrompt: '重用',
        reuseCompletedPromptTitle: '重用这个已完成的提示词',
        completedPromptReused: '已将完成的提示词复制到队列。',
        clearQueue: '清空队列',
        stopActiveTask: '停止当前任务',
        downloadTools: '下载工具',
        downloadHint: '* 下载过程中如发现更多图片，数量可能会增加。',
        downloadPageImages: '下载本页图片',
        language: '语言',
        concurrentProcessing: '并发处理',
        staggerDelay: '间隔延迟',
        generationTimeout: '生成超时（分钟）',
        retryCount: '重试次数',
        importCsvSoon: '导入 CSV（即将支持）',
        disabled: '已禁用',
        failedLog: '失败任务日志（24小时）',
        noRecentErrors: '最近没有错误。',
        editPrompt: '编辑提示词',
        saveChanges: '保存更改',
        cancel: '取消',
        restrictedText: '此自动化工具仅适用于 Google Flow 项目页面。',
        restrictedFooter: '请先打开或创建项目。',
        goToFlow: '前往 Google Flow',
        pleaseEnterPrompts: '请先输入提示词。',
        confirmClearQueue: '要清空整个队列并重置状态吗？',
        onlyProjectPage: '仅在 Flow 项目页面可下载当前页图片。',
        confirmDeleteTask: '要删除此任务吗？',
        runningQueue: '队列运行中...',
        queueFinished: '队列已完成。',
        stopping: '正在停止...',
        stopped: '已停止。',
        finished: '已完成。',
        refreshingConnectionMsg: '正在刷新连接...',
        ready: '就绪。',
        active: '活动',
        idle: '空闲',
        running: '运行中',
        paused: '已暂停',
        pendingStatus: '等待中',
        inProgressStatus: '进行中',
        completedStatus: '已完成',
        failedStatus: '失败',
        failedPrefix: '失败',
        justNow: '刚刚',
        minAgo: '分钟前',
        freeBadge: '免费',
        creditsRequiredBadge: '需要积分',
        atATime: '个/次'
    },
    de: {
        stop: 'Stopp',
        run: 'Start',
        forceRefresh: 'Neu verbinden',
        refreshConnection: 'Verbindung aktualisieren',
        userGuide: 'Anleitung',
        supportProject: 'Dieses Projekt unterstützen',
        supportDescription: 'Wenn dir dieses Tool Zeit spart, unterstütze gern weitere Updates.',
        donate: 'Spenden',
        ssoGate: 'Mit Google SSO anmelden, um Download-Tools zu aktivieren',
        signInGoogle: 'Mit Google anmelden',
        signInShort: 'Anmelden',
        signOut: 'Abmelden',
        ssoSignedIn: 'SSO: Angemeldet',
        emailSignedIn: 'E-Mail: Angemeldet',
        ssoSignedOut: 'SSO: Abgemeldet',
        unlockSsoBtn: 'Ich bin angemeldet - Weiter',
        subscribeGate: 'Für frühen Zugriff auf Download-Tools abonnieren',
        subscribeBtn: 'Abonnieren',
        unlockBtn: 'Ich habe abonniert - Entsperren',
        lockNote: 'Gesperrt bis Google SSO + Abo abgeschlossen sind.',
        ssoLocked: 'Bitte zuerst mit Google SSO anmelden.',
        subscribeLocked: 'Abonnieren, um Download-Tools freizuschalten.',
        downloadToolsLocked: 'Mit Google SSO anmelden, um Image Downloader freizuschalten.',
        unlocked: 'Freigeschaltet',
        control: 'Steuerung',
        settings: 'Einstellungen',
        comingSoon: 'Demnächst',
        outputType: 'Ausgabetyp',
        image: 'Bild',
        video: 'Video',
        formFactor: 'Format',
        landscape: 'Querformat',
        portrait: 'Hochformat',
        batchSize: 'Batch-Größe',
        generationModel: 'Generierungsmodell',
        characterId: 'Charakter-ID',
        characterPlaceholder: 'Charakterbeschreibung für Konsistenz...',
        promptQueue: 'Prompt-Warteschlange',
        addToQueue: 'Zur Warteschlange',
        queueAction: 'Queue & Select',
        perPromptAssets: 'Unterschiedliche Assets pro Prompt verwenden',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
                perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        promptPlaceholder: 'Prompts mit Leerzeilen getrennt einfügen...',
        detectedPrompts: 'Erkannte Prompts',
        autoDownload: 'Ergebnisse automatisch herunterladen',
        currentQueue: 'Aktuelle Warteschlange',
        tasks: 'Aufgaben',
        noActiveTasks: 'Keine aktiven Aufgaben.',
        startAutomation: 'Automatisierung starten',
        retryUnfinished: 'Unfertige erneut starten',
        retryUnfinishedConfirm: 'Unfertige Prompts erneut starten? Abgeschlossene Prompts bleiben abgeschlossen.',
        retryUnfinishedReady: 'Unfertige Prompts können erneut gestartet werden.',
        noUnfinishedToRetry: 'Keine unfertigen Prompts zum erneuten Starten.',
        reuseCompletedPrompt: 'Wiederverwenden',
        reuseCompletedPromptTitle: 'Diesen abgeschlossenen Prompt wiederverwenden',
        completedPromptReused: 'Abgeschlossener Prompt wurde in die Warteschlange kopiert.',
        clearQueue: 'Warteschlange leeren',
        stopActiveTask: 'Aktive Aufgabe stoppen',
        downloadTools: 'Download-Tools',
        downloadHint: '* Während des Downloads kann die Anzahl steigen, wenn neue Bilder gefunden werden.',
        downloadPageImages: 'Bilder dieser Seite herunterladen',
        language: 'Sprache',
        concurrentProcessing: 'Parallele Verarbeitung',
        staggerDelay: 'Verzögerung',
        generationTimeout: 'Timeout (Min.)',
        retryCount: 'Wiederholungen',
        importCsvSoon: 'CSV-Import (demnächst)',
        disabled: 'Deaktiviert',
        failedLog: 'Fehlerprotokoll (24h)',
        noRecentErrors: 'Keine aktuellen Fehler.',
        editPrompt: 'Prompt bearbeiten',
        saveChanges: 'Änderungen speichern',
        cancel: 'Abbrechen',
        restrictedText: 'Dieses Tool funktioniert nur auf Google Flow-Projektseiten.',
        restrictedFooter: 'Bitte ein Projekt öffnen oder erstellen.',
        goToFlow: 'Zu Google Flow',
        pleaseEnterPrompts: 'Bitte zuerst Prompts eingeben.',
        confirmClearQueue: 'Gesamte Warteschlange leeren und Status zurücksetzen?',
        onlyProjectPage: 'Seiten-Download ist nur in einer Flow-Projektseite verfügbar.',
        confirmDeleteTask: 'Diese Aufgabe löschen?',
        runningQueue: 'Warteschlange läuft...',
        queueFinished: 'Warteschlange abgeschlossen.',
        stopping: 'Wird gestoppt...',
        stopped: 'Gestoppt.',
        finished: 'Fertig.',
        refreshingConnectionMsg: 'Verbindung wird aktualisiert...',
        ready: 'Bereit.',
        active: 'aktiv',
        idle: 'Leerlauf',
        running: 'Läuft',
        paused: 'Pausiert',
        pendingStatus: 'ausstehend',
        inProgressStatus: 'in Bearbeitung',
        completedStatus: 'abgeschlossen',
        failedStatus: 'fehlgeschlagen',
        failedPrefix: 'FEHLER',
        justNow: 'Gerade eben',
        minAgo: 'Min. her',
        freeBadge: 'Kostenlos',
        creditsRequiredBadge: 'Credits erforderlich',
        atATime: 'gleichzeitig'
    },
    fr: {
        stop: 'Arrêter',
        run: 'Lancer',
        forceRefresh: 'Forcer actualisation',
        refreshConnection: 'Rafraîchir la connexion',
        userGuide: 'Guide utilisateur',
        supportProject: 'Soutenir ce projet',
        supportDescription: 'Si cet outil vous fait gagner du temps, vous pouvez soutenir les prochaines mises à jour.',
        donate: 'Faire un don',
        ssoGate: 'Connectez-vous avec Google SSO pour activer les outils de téléchargement',
        signInGoogle: 'Connexion Google',
        signInShort: 'Connexion',
        signOut: 'Déconnexion',
        ssoSignedIn: 'SSO : Connecté',
        emailSignedIn: 'E-mail : connecté',
        ssoSignedOut: 'SSO : Déconnecté',
        unlockSsoBtn: 'Je suis connecté - Continuer',
        subscribeGate: 'Abonnez-vous pour un accès anticipé aux outils de téléchargement',
        subscribeBtn: 'S’abonner',
        unlockBtn: 'Je me suis abonné - Déverrouiller',
        lockNote: 'Verrouillé jusqu’à la connexion Google SSO et l’abonnement.',
        ssoLocked: 'Veuillez vous connecter avec Google SSO pour continuer.',
        subscribeLocked: 'Abonnez-vous pour débloquer les outils de téléchargement.',
        downloadToolsLocked: 'Connectez-vous avec Google SSO pour débloquer Image Downloader.',
        unlocked: 'Déverrouillé',
        control: 'Contrôle',
        settings: 'Paramètres',
        comingSoon: 'Bientôt',
        outputType: 'Type de sortie',
        image: 'Image',
        video: 'Vidéo',
        formFactor: 'Format',
        landscape: 'Paysage',
        portrait: 'Portrait',
        batchSize: 'Taille du lot',
        generationModel: 'Modèle de génération',
        characterId: 'ID personnage',
        characterPlaceholder: 'Décrivez un personnage pour garder la cohérence...',
        promptQueue: 'File de prompts',
        addToQueue: 'Ajouter à la file',
        queueAction: 'Queue & Select',
        perPromptAssets: 'Utiliser des assets différents par prompt',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
                perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        promptPlaceholder: 'Collez les prompts séparés par des lignes vides...',
        detectedPrompts: 'Prompts détectés',
        autoDownload: 'Téléchargement automatique',
        currentQueue: 'File actuelle',
        tasks: 'tâches',
        noActiveTasks: 'Aucune tâche active.',
        startAutomation: 'Démarrer l’automatisation',
        retryUnfinished: 'Relancer les non terminés',
        retryUnfinishedConfirm: 'Relancer les prompts non terminés ? Les prompts terminés resteront terminés.',
        retryUnfinishedReady: 'Les prompts non terminés sont prêts à être relancés.',
        noUnfinishedToRetry: 'Aucun prompt non terminé à relancer.',
        reuseCompletedPrompt: 'Réutiliser',
        reuseCompletedPromptTitle: 'Réutiliser ce prompt terminé',
        completedPromptReused: 'Le prompt terminé a été copié dans la file.',
        clearQueue: 'Vider la file',
        stopActiveTask: 'Arrêter la tâche active',
        downloadTools: 'Outils de téléchargement',
        downloadHint: '* Pendant le téléchargement, le nombre peut augmenter si d’autres images sont découvertes.',
        downloadPageImages: 'Télécharger les images de la page',
        language: 'Langue',
        concurrentProcessing: 'Traitement parallèle',
        staggerDelay: 'Délai',
        generationTimeout: 'Délai max (min)',
        retryCount: 'Nombre de tentatives',
        importCsvSoon: 'Import CSV (bientôt)',
        disabled: 'Désactivé',
        failedLog: 'Journal des échecs (24h)',
        noRecentErrors: 'Aucune erreur récente.',
        editPrompt: 'Modifier le prompt',
        saveChanges: 'Enregistrer',
        cancel: 'Annuler',
        restrictedText: 'Cet outil fonctionne uniquement sur les pages projet Google Flow.',
        restrictedFooter: 'Ouvrez ou créez un projet pour commencer.',
        goToFlow: 'Aller à Google Flow',
        pleaseEnterPrompts: 'Veuillez saisir des prompts d’abord.',
        confirmClearQueue: 'Vider toute la file et réinitialiser l’état ?',
        onlyProjectPage: 'Le téléchargement de page est disponible uniquement dans une page projet Flow.',
        confirmDeleteTask: 'Supprimer cette tâche ?',
        runningQueue: 'File en cours...',
        queueFinished: 'File terminée.',
        stopping: 'Arrêt en cours...',
        stopped: 'Arrêté.',
        finished: 'Terminé.',
        refreshingConnectionMsg: 'Actualisation de la connexion...',
        ready: 'Prêt.',
        active: 'actives',
        idle: 'Inactif',
        running: 'En cours',
        paused: 'En pause',
        pendingStatus: 'en attente',
        inProgressStatus: 'en cours',
        completedStatus: 'terminée',
        failedStatus: 'échec',
        failedPrefix: 'ÉCHEC',
        justNow: 'À l’instant',
        minAgo: 'min',
        freeBadge: 'Gratuit',
        creditsRequiredBadge: 'Crédits requis',
        atATime: 'à la fois'
    }
};

const I18N_PATCH = {
    en: {
        languageHindi: 'Hindi',
        uploadCsv: 'Upload CSV',
        csvGuideBtn: 'CSV Guide',
        openPicker: 'Open Picker',
        openFullPicker: 'Open Full Picker',
        reset: 'Reset',
        remove: 'Remove',
        add: 'Add',
        dryRun: 'Dry Run',
        reloadAssets: 'Reload Assets',
        characterTitle: 'Character',
        characterHelpText: 'Pick one or more created Flow characters. Per-prompt mode can choose from these selected characters.',
        characterPremiumRequiredHelp: 'Premium unlock required to add characters. You can view characters, but adding them to prompts requires Premium.',
        referenceAssetTitle: 'Reference Asset',
        referenceAssetHelpText: 'Pick one or more reference images for image mode. This stays separate from the video queue.',
        referenceAssetSingleImageLimit: 'Reference images require Premium unlock.',
        referenceAssetTwoImageNote: 'Please use 2 images as of now. If an image fails to be found, you may have too many images in the project. Please use a new project.',
        csvUploadHint: 'Upload a CSV to load prompt rows into the editor, review/fix them, then add them to queue.',
        queueAutoResetNote: 'Note: The queue is automatically reset every 24 hours.',
        bulkDownloaderTitle: 'Image Downloader',
        bulkDownloaderNote: "Premium unlock is required to use Image Downloader. We don't use your login data; it is only used to verify login.",
        imageDownloaderFeatures: 'Includes Page Image Downloader + 2K Upscaled Auto Downloader for generated images.',
        ssoFeaturePreview: 'Includes 2K Upscaled Auto Downloader',
        generationAutoDownloadTitle: 'Generation Auto-Download',
        upscaleDownload: 'Download 2K Upscaled',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        upscaleDownloadNote: 'Beta: downloads the 2K upscaled version after each generated image, waits for it to finish, then sends the next prompt. It is slower, not used by Download Page Images, and may not be perfect if Flow changes.',
        upscaleDownloadToolsDisabled: 'Not Support for Upscaled images',
        upscaledDownloadFallbackBeforeRun: 'Download 2K Upscaled requires premium access, so it was turned off. The prompt will continue with normal 1K auto-download. If you are already premium, please contact us through the Request Access Form.',
        premiumAccessCheckFailedBeforeRun: 'Premium access check failed. Premium-only features were turned off before running.',
        theme: 'Theme',
        themeDefault: 'Default',
        themeLogo: 'Logo',
        themeDark: 'Dark',
        promptDelay: 'Prompt delay',
        promptDelayNote: 'When on, waits the selected seconds before sending the next prompt. Allowed range: 10-90 seconds (in steps of 10). Premium only.',
        promptDelaySeconds: 'Delay seconds (10-300)',        remoteNotificationDefaultTitle: 'Extension Notice',
        remoteNotificationConfirm: 'Got it',
        remoteNotificationVersion: 'Version {version}',
        queueAssetsTitle: 'Per-Prompt Assets',
        queueAssetsInherited: 'Current assets are copied into each queue item.',
        perPromptAssets: 'Use different assets per prompt',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        premiumRequiredForCharacters: 'Premium unlock is required to add characters.',
        premiumRequiredForMultipleReferences: 'Reference images require Premium unlock.',
        perPromptAssetsRemovedBeforeRun: 'Per-prompt image assets require premium access. Selected premium images were removed, and this run will continue with text only.',
        promptAssetsHint: 'Current character and reference images are copied into each prompt when added. Use the queue buttons to edit assets per prompt before running.',
        reviewPromptAssetsBeforeStart: 'Prompts added. Review per-prompt assets below, then click Start again.',
        queueCharacterButton: 'Edit Character',
        queueImagesButton: 'Edit Images',
        queueAddCharacterButton: '+ Character',
        queueAddImagesButton: '+ Images',
        queueNoCharacter: 'No character',
        queueNoImages: 'No images',
        queueSelectTopCharacterFirst: 'Select a character at the top first.',
        queueSelectTopImagesFirst: 'Select reference images at the top first.',
        queueAssetPickerCharacterTitle: 'Select Character for This Prompt',
        queueAssetPickerImagesTitle: 'Select Images for This Prompt',
        queueAssetPickerSubtitle: 'Choose from the assets selected at the top. Click thumbnails to select or remove.',
        queueVideoIngredientPickerSubtitle: '{selected} / {max} selected — click thumbnails to toggle, then tap Done.',
        queueVideoIngredientPickerMax: 'Maximum {max} ingredients reached.',
        queueAssetPickerDone: 'Done',
        queueCharacterSet: 'Character: {name}',
        queueCharactersSet: 'Characters: {count}',
        queueImagesSet: 'Images: {count}',
        premiumRequiredForVideoMode: 'Premium Feature Unlocked is required to change video Mode.',
        videoAssetQueueTitle: 'Video Assets',
        videoAssetQueueHelpText: 'Select images to use for video prompts. Each queued prompt can use Ingredients or Frames.',
        videoModeFrames: 'Frames',
        videoModeIngredients: 'Ingredients',
        videoModeHelp: 'Choose the video model here. Each queued prompt chooses either Ingredients or Frames separately.',
        videoModel: 'Video Model',
        videoVoiceLabel: 'Voice',
        videoVoicePlaceholder: 'Andrew or @Voice: Andrew',
        videoVoiceIncompatible: 'Voice is used only with Omni Flash Ingredients.',
        videoOmniEndFrameWarning: 'Omni Flash does not support an end frame. End frame selection is disabled.',
        videoModeUnsupportedByModel: 'The selected video model does not support this mode.',
        videoCreditsConfirm: 'Video generation will use Flow credits. Please confirm before running.',
        videoFrameStartRequired: 'Select a start frame before running Frames to Video.',
        videoIngredientsRequired: 'Select at least one ingredient image before running Ingredients to Video.',
        videoIngredientsMaxReached: 'Ingredients to Video supports up to 3 images per prompt.',
        videoModeRequired: 'Choose Ingredients or Frames for each video prompt before running.',
        videoSelectAssetsFirst: 'Select video assets above first.',
        queueVideoIngredientsTitle: 'Select Ingredients for This Prompt',
        queueVideoStartFrameTitle: 'Select Start Frame for This Prompt',
        queueVideoEndFrameTitle: 'Select End Frame for This Prompt',
        queueVideoIngredientsButton: '+ Ingredients',
        queueVideoStartButton: 'Start Image',
        queueVideoEndButton: 'End Image',
        videoThumbIngredientLabel: 'Ingredient',
        videoThumbStartLabel: 'Start',
        videoThumbEndLabel: 'End',
        queueVideoModeLabel: 'Mode',
        queueVideoDurationLabel: 'Duration',
        queueChooseVideoMode: 'Choose Ingredients or Frames',
        noStartFrame: 'No start frame',
        csvGuideMessage: 'CSV Guide\n\nCSV upload reads prompt rows into the editor first. It does not auto-queue.\n\nUse CSV when:\n- You have many prompts to add quickly.\n- You want scene-by-scene rows managed in a spreadsheet.\n\nSimple format:\n- One prompt per row.\n- Use a prompt header if possible (for example: prompt / image prompt / text prompt).\n- UTF-8 is recommended, but other encodings are also detected.\n\nQuick steps:\n1. Prepare your prompts in a CSV file.\n2. Import the CSV into the extension.\n3. Fix highlighted prompt rows if any issues are found.\n4. Review detected prompts in the editor.\n5. Click \"Add to Queue\" and start automation.\n\nNotes:\n- The selected CSV file is discarded right after import.\n- If rows are broken, leave a problematic row empty to skip it.',
        cleanupStaleItemsConfirm: '{count} completed/failed item(s) are stored. Remove them now?',
        noQueueItemsToRun: 'Please enter prompts or add items to the queue first.',
        retryUnfinished: 'Retry Unfinished',
        retryUnfinishedConfirm: 'Retry unfinished prompts? Completed prompts will stay completed.',
        retryUnfinishedReady: 'Unfinished prompts are ready to run again.',
        noUnfinishedToRetry: 'No unfinished prompts to retry.',
        promptNotFound: 'Prompt not found',
        flowCharacter: 'Flow character',
        flowAsset: 'Flow asset',
        orderLabel: 'Order {count}',
        characterN: 'Character {count}',
        pickerVideoTitle: 'Video Asset Picker',
        pickerCharacterTitle: 'Character Picker',
        pickerReferenceTitle: 'Reference Asset Picker',
        pickerAvailableVideoAssets: 'Available Video Assets',
        pickerAvailableCharacters: 'Available Characters',
        pickerAvailableAssets: 'Available Assets',
        pickerSelectedVideoAssets: 'Selected Video Assets',
        pickerSelectedCharacter: 'Selected Character',
        pickerSelectedCharacters: 'Selected Characters',
        pickerSelectedReferenceImages: 'Selected Reference Images',
        pickerSaveVideoQueue: 'Save Video Queue',
        pickerUseCharacter: 'Use Character',
        pickerUseSelected: 'Use Selected',
        pickerVideoSummarySelected: '{count} video asset(s) selected.',
        pickerVideoSummaryEmpty: 'Move video assets from the left into the queue on the right.',
        pickerCharacterSummarySelected: '{count} character(s) selected.',
        pickerCharacterSummaryEmpty: 'Move one or more created characters from the left into the selected list on the right.',
        pickerReferenceSummarySelected: '{count} reference image(s) selected.',
        pickerReferenceSummaryEmpty: 'Move reference images from the left into the selected list on the right.',
        pickerNoAssetsAvailable: 'No available assets. Use \"Reload Assets\" to fetch them.',
        pickerSelectedVideoEmpty: 'Selected video assets will appear here.',
        pickerSelectedCharacterEmpty: 'Selected characters will appear here.',
        pickerSelectedReferenceEmpty: 'Selected reference images will appear here.',
        openProjectTabFirst: 'Open the target Google Flow project tab first, then try Open Picker again.',
        csvImportCanceled: 'CSV import canceled. No prompts were queued.',
        csvNoValidPrompts: 'No valid prompts to import. Add at least one prompt or cancel.',
        csvLoadedReady: 'CSV loaded: {count} prompt(s) ready. Review, then click \"Add to Queue\".{details}',
        csvLoadedWithIssues: 'CSV loaded with {count} issue(s). Fix highlighted prompts and apply.',
        csvEmptyUnreadable: 'CSV is empty or unreadable.',
        csvNoValidRows: 'No valid prompt rows were found in this CSV.',
        csvLoadedReplacement: 'CSV loaded ({count} prompt(s), {encoding}). Some characters may need review.',
        csvLoadedDetail: 'CSV loaded: {count} prompt(s) ready (delimiter: {delimiter}, encoding: {encoding}). Review, then click \"Add to Queue\".',
        csvImportFailed: 'CSV import failed: {message}',
        csvImportCompleteTitle: 'CSV import complete.',
        csvFoundPrompts: 'Found prompts: {count}',
        csvRowsNeedFixes: 'Rows needing fixes: {count}',
        csvReviewFixRows: 'Please review and fix the highlighted rows.',
        csvLoadedToEditor: 'Loaded to editor: {count}',
        csvReviewAddQueue: 'Review and click \"Add to Queue\" when ready.',
        reloadAssetsReselectVideoStart: 'Reload Flow assets and re-select the video start image first.',
        noCharactersFoundCreateFirst: 'No characters found. Create a Flow character first, then reload.',
        clearedVideoQueue: 'Cleared video asset queue.',
        importedFromReceiver: 'Imported {count} prompts from receiver page.',
        selectVideoAssetsFirst: 'Select video assets first.',
        setVideoPromptScene01: 'Set a video prompt for Scene 01 first.',
        openFlowProjectTabFirst: 'Open a Google Flow project tab first.',
        dryRunComplete: 'Dry run complete. Start image and prompt were prepared without pressing Create.',
        dryRunFailed: 'Dry run failed: {message}',
        reloadVideoAssetsFirst: 'Reload video assets first.',
        noSceneAssetsFound: 'No scene/image-numbered assets found in the current project.',
        autoAddedVideoAssets: 'Auto-added {count} numbered video asset(s).',
        openFlowProjectTabWithPath: 'Open a Google Flow project tab first (labs.google/fx/tools/flow/project/…).',
        failedToLoadAssets: 'Failed to load assets.',
        noAssetsFoundOpenAddMedia: 'No assets found. Open Add Media panel first.',
        loadedFreshAssetsCleared: 'Loaded {count} fresh asset(s). Previous reference selection cleared.',
        failedToLoadAssetsWithError: 'Failed to load assets: {message}',
        failedToLoadCharacters: 'Failed to load characters.',
        loadedCharacters: 'Loaded {count} character(s).',
        failedToLoadCharactersWithError: 'Failed to load characters: {message}',
        failedToLoadVideoAssets: 'Failed to load video assets.',
        loadedVideoAssets: 'Loaded {count} video asset(s).',
        failedToLoadVideoAssetsWithError: 'Failed to load video assets: {message}',
        buttonsOnlyInFlowProject: 'These buttons are only available inside a Google Flow project.',
        runInsideProjectRequired: 'Open a Google Flow project page first, then run prompts from inside the project.',
        removedReferenceSelectedNow: 'Removed reference image. Selected now: {count}.',
        oauthClientIdMissing: 'Set oauth2.client_id in manifest.json first.',
        signingInGoogle: 'Signing in with Google...',
        signedInFirestoreFailed: 'Signed in, but Firestore update failed (check rules).',
        signInCompleteSupport: 'Sign-in complete. Image Downloader is unlocked.',
        signedOutTokenClearFailed: 'Signed out locally. Browser token cache clear failed.',
        signedOut: 'Signed out.',
        signInFailed: 'Sign-in failed: {message}',
        signOutFailed: 'Sign-out failed: {message}',
        flowButtonSyncFailed: 'Flow {flowType} button sync failed. Reload the Flow tab and try again.',
        moveUp: 'Up',
        moveDown: 'Down',
        edit: 'Edit',
        editVideoPrompt: 'Edit Video Prompt',
        noPromptSpecified: 'No prompt specified',
        unknownAsset: 'Unknown Asset',
        signingInShortStatus: 'Google SSO: Signing in...',
        downloading: 'Downloading...',
        loading: 'Loading...',
        reloading: 'Reloading...',
        loadFromFlow: 'Load from Flow'
    },
    ko: {
        languageHindi: '힌디어',
        bulkDownloaderTitle: 'Image Downloader',
        uploadCsv: 'CSV 업로드',
        csvGuideBtn: 'CSV 가이드',
        openPicker: '픽커 열기',
        openFullPicker: '전체 픽커 열기',
        reset: '초기화',
        remove: '제거',
        add: '추가',
        dryRun: '드라이 런',
        reloadAssets: '에셋 다시 불러오기',
        characterTitle: '캐릭터',
        characterHelpText: '생성된 Flow 캐릭터를 하나 이상 선택하세요. 프롬프트별 모드에서는 여기서 선택한 캐릭터 중에서 고릅니다.',
        characterPremiumRequiredHelp: '캐릭터 추가는 Premium unlock이 필요합니다. 캐릭터는 볼 수 있지만 프롬프트에 추가하려면 Premium이 필요합니다.',
        referenceAssetTitle: '레퍼런스 에셋',
        referenceAssetHelpText: '이미지 모드용 레퍼런스 이미지를 하나 이상 선택하세요. 비디오 큐와는 별도로 동작합니다.',
        referenceAssetSingleImageLimit: '레퍼런스 이미지는 Premium unlock이 필요합니다.',
        premiumAssetsLockedBody: '잠긴 기능: 캐릭터 에셋 및 레퍼런스 이미지.',
        referenceAssetTwoImageNote: '현재는 이미지 2장을 사용해주세요. 이미지를 찾지 못하면 프로젝트 내 이미지가 너무 많을 수 있으니 새 프로젝트를 사용해주세요.',
        csvUploadHint: 'CSV를 업로드하면 프롬프트를 에디터에 불러오고, 검토/수정 후 큐에 추가할 수 있습니다.',
        queueAutoResetNote: '참고: 큐는 24시간마다 자동 초기화됩니다.',
        bulkDownloaderNote: 'Image Downloader를 사용하려면 Google SSO로 로그인하세요. 로그인 데이터는 저장하지 않고 로그인 확인에만 사용합니다.',
        imageDownloaderFeatures: 'Page Image Downloader와 생성 이미지용 2K Upscaled Auto Downloader가 포함되어 있습니다.',
        premiumLoginBanner: '기능을 사용하려면 로그인하세요',
        premiumFeatureLocked: 'Premium Feature - Unlock Required',
        professionalFeatureLocked: 'Professional Only',
        premiumFeature: 'Premium Feature',
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        premiumFeatureKicker: 'Premium 액세스',
        premiumFeatureTitle: 'Premium 기능',
        premiumFeatureMessage: 'Premium 기능은 조건을 충족한 등록 유저 또는 활성 구독자에게 제공됩니다.',
        premiumFeatureFeedback: 'Google Flow Automator는 무료 도구이며, 여러분의 지원은 도구를 계속 개선하는 데 도움이 됩니다. 도구가 마음에 드신다면 Chrome Web Store에 정직한 피드백이나 리뷰를 남겨주시면 감사하겠습니다. 정직한 리뷰는 더 많은 유저가 도구를 발견하고 프로젝트가 계속 성장하는 데 도움이 됩니다.',
        premiumFeatureYoutube: 'YouTube 채널을 구독하면 이 도구를 지원하고 업데이트를 확인할 수 있습니다.',
        premiumFeatureManual: '리뷰 작성은 완전히 선택 사항이며 Premium 액세스를 보장하지 않습니다. 자격 조건은 자동으로 확인되며, 요구 조건을 더 이상 충족하지 않으면 Premium 액세스가 변경되거나 취소될 수 있습니다.',
        premiumFeatureSupporter: 'Supporter가 되면 Dedicated Premium User 자격을 얻게 됩니다 — 무료 플랜의 쿼타가 초과되어도 모든 프리미엄 기능을 중단 없이 계속 사용할 수 있습니다.',
        premiumFeatureForm: '액세스 요청 폼',
        premiumFeatureReview: 'Chrome Web Store 열기',
        premiumFeatureClose: '닫기',
        tryPremiumTrial: 'Premium 체험 시작',
        confirmTrialActivation: 'Premium 체험을 시작하시겠습니까? {date}까지 모든 프리미엄 기능이 잠금 해제됩니다.',
        requestPremiumAccess: 'Premium 액세스 요청',
        trialExpiredLabel: '체험 기간 만료',
        premiumTrialActivated: 'Premium Trial이 활성화되었습니다. {date}까지 Premium 기능을 사용할 수 있습니다.',
        premiumTrialActivationFailed: 'Premium Trial 활성화 실패: {message}',
        tryProfessionalTrial: 'Professional 체험하기',
        confirmProfessionalTrialActivation: 'Professional(서포터) 체험을 시작하시겠습니까? {date}까지 사용할 수 있습니다.',
        professionalTrialActivated: 'Professional Trial이 활성화되었습니다. {date}까지 사용할 수 있습니다.',
        professionalTrialActivationFailed: 'Professional Trial 활성화 실패: {message}',
        professionalTrialUnavailable: '이 계정은 Professional Trial을 사용할 수 없습니다.',
        storyboard: '어드밴스드 스토리보드',
        loginRequiredTitle: '로그인이 필요합니다',
        loginRequiredBody: 'Google Flow Automator를 사용하려면 Google로 로그인하세요.',
        loginRequiredToUse: '이 기능을 사용하려면 먼저 Google로 로그인하세요.',
        membershipUsageTitle: '멤버십',
        starterUsageBody: '오늘 {limit}개 중 {used}개 사용',
        unlimitedUsageBody: '무제한 프롬프트 사용 가능',
        unlimited: '무제한',
        trialEndsAt: '트라이얼 종료: {date}',
        trialUnlimitedUntil: '{date}까지 무제한',
        starterQuotaReached: 'Starter daily prompt limit reached ({limit} prompts/day).',
        starterQuotaNotEnough: 'Starter는 오늘 {remaining}개만 더 보낼 수 있습니다. 큐를 줄이거나 업그레이드하세요.',
        profileTitle: '유저 프로필',
        profileUserId: '유저 ID',
        profileLanguage: '언어',
        profileMembership: '멤버십',
        profileQuota: '프롬프트 이용',
        profileTrialAccess: '트라이얼 이용',
        starterTier: 'Starter',
        premiumTier: 'Premium',
        premiumRequiredMembership: 'Premium 필요',
        professionalTier: 'Professional',
        upgrade: '업그레이드',
        upgraded: '업그레이드됨',
        starterFeatures: ['Google SSO 또는 이메일 로그인 이용', '프롬프트 큐 및 CSV 가져오기', '기본 프롬프트 자동화', '생성 후 1K 자동 다운로드'],
        premiumFeatures: ['Starter의 모든 기능', '레퍼런스 이미지 최대 3장', '캐릭터 최대 2명', '프롬프트별 다른 에셋', 'Download 2K Upscaled 베타', '스토리보드 플래닝'],
        professionalFeatures: ['Premium의 모든 기능', '레퍼런스 이미지와 캐릭터 무제한', '이미지/비디오 모드 전환', '비디오 워크플로우 지원: Ingredients, Frames, Start/End frame, 모델 선택', '스토리보드 및 고급 플래닝 도구', '이미지 다운로더 (일괄 다운로드 + 2K/4K 업스케일)', '다크 모드', '새 베타 기능 우선 액세스'],
        premiumFormNotConfigured: 'Google Form URL이 아직 설정되지 않았습니다.',
        settingsAccount: '계정',
        assetPremiumLocked: 'Premium Feature - Unlock Required',
        flowWindowTooNarrow: '브라우저 창이 너무 좁아서 Google Flow 패널을 찾을 수 없습니다. 창 너비를 최소 {width}px 이상으로 넓힌 뒤 다시 시도해주세요.',
        ssoFeaturePreview: '2K Upscaled Auto Downloader 포함',
        generationAutoDownloadTitle: '생성 후 자동 다운로드',
        upscaleDownload: 'Download 2K Upscaled',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        upscaleDownloadNote: '베타 기능: 생성된 이미지마다 2K 업스케일 버전을 다운로드하고 완료 후 다음 프롬프트를 보냅니다. 느리며, Download Page Images에는 적용되지 않고 Flow UI 변경 시 완벽하지 않을 수 있습니다.',
        upscaleDownloadToolsDisabled: 'Not Support for Upscaled images',
        upscaledDownloadFallbackBeforeRun: 'Download 2K Upscaled는 premium access가 필요해서 꺼졌습니다. 프롬프트는 일반 1K 자동 다운로드로 계속 진행됩니다. 이미 premium 유저라면 Request Access Form으로 연락해주세요.',
        premiumAccessCheckFailedBeforeRun: 'Premium access 확인에 실패했습니다. 실행 전에 premium 전용 기능을 껐습니다.',
        theme: '테마',
        themeDefault: '기본',
        themeLogo: '로고',
        themeDark: '다크',
        promptDelay: '프롬프트 지연',
        promptDelayNote: '켜면 다음 프롬프트를 보내기 전에 설정한 초만큼 대기합니다. 허용 범위: 10-90초 (10초 단위). 프리미엄 전용.',
        promptDelaySeconds: '지연 시간 초 (10-300)',        remoteNotificationDefaultTitle: '확장 프로그램 공지',
        remoteNotificationConfirm: '확인',
        remoteNotificationVersion: '버전 {version}',
        queueAssetsTitle: '프롬프트별 에셋',
        queueAssetsInherited: '큐에 추가할 때 현재 에셋 선택을 각 항목에 복사합니다.',
        perPromptAssets: '프롬프트마다 다른 에셋 사용',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        videoMultilinePromptUnlockRequired: '잠금 해제 필요',
        videoMultilinePromptLocked: 'Professional 기능 - 잠금 해제 필요',
        videoMultilinePromptLockedDetail: '@@@NEXT@@@으로 구분된 멀티 라인 프롬프트를 사용합니다.',
        videoMultilinePrompt: '멀티 라인 프롬프트 사용',
        videoMultilinePromptNote: '비디오 모드에서 한 프롬프트를 여러 줄로 쓰고, 각 대기열 항목을 @@@NEXT@@@으로 구분하여 추가할 수 있게 합니다.',
        premiumRequiredForCharacters: '캐릭터 추가는 Premium unlock이 필요합니다.',
        premiumRequiredForMultipleReferences: '레퍼런스 이미지는 Premium unlock이 필요합니다.',
        perPromptAssetsRemovedBeforeRun: '프롬프트별 이미지 에셋은 premium access가 필요합니다. 선택된 premium 이미지를 제거했고, 이번 실행은 텍스트만으로 진행됩니다.',
        queueAction: 'Queue & Select',
        promptAssetsHint: '현재 캐릭터와 레퍼런스 이미지는 큐에 추가되는 각 프롬프트에 복사됩니다. 실행 전에 큐 버튼으로 프롬프트별 에셋을 따로 수정할 수 있습니다.',
        reviewPromptAssetsBeforeStart: '프롬프트를 큐에 추가했습니다. 아래에서 프롬프트별 에셋을 확인한 뒤 Start를 다시 눌러 실행하세요.',
        queueCharacterButton: '캐릭터 수정',
        queueImagesButton: '이미지 수정',
        queueAddCharacterButton: '+ 캐릭터',
        queueAddImagesButton: '+ 이미지',
        queueNoCharacter: '캐릭터 없음',
        queueNoImages: '이미지 없음',
        queueSelectTopCharacterFirst: '먼저 위에서 캐릭터를 선택하세요.',
        queueSelectTopImagesFirst: '먼저 위에서 레퍼런스 이미지를 선택하세요.',
        queueAssetPickerCharacterTitle: '이 프롬프트 캐릭터 선택',
        queueAssetPickerImagesTitle: '이 프롬프트 이미지 선택',
        queueAssetPickerSubtitle: '위에서 선택한 에셋 중에서만 고를 수 있습니다. 썸네일을 눌러 선택/해제하세요.',
        queueVideoIngredientPickerSubtitle: '{selected} / {max} 선택됨 — 썸네일을 눌러 선택/해제 후 Done을 누르세요.',
        queueVideoIngredientPickerMax: '최대 {max}개 ingredient를 선택할 수 있습니다.',  
        queueAssetPickerDone: '완료',
        queueCharacterSet: '캐릭터: {name}',
        queueCharactersSet: '캐릭터: {count}개',
        queueImagesSet: '이미지: {count}장',
        premiumRequiredForVideoMode: '비디오 Mode 변경은 Premium Feature Unlocked가 필요합니다.',
        videoAssetQueueTitle: '비디오 에셋',
        videoAssetQueueHelpText: '비디오 프롬프트에 사용할 이미지를 선택하세요. 각 큐 프롬프트에서 Ingredients 또는 Frames를 사용할 수 있습니다.',
        videoModeFrames: 'Frames',
        videoModeIngredients: 'Ingredients',
        videoModeHelp: '여기서는 비디오 모델만 선택하세요. 각 큐 프롬프트에서 Ingredients 또는 Frames를 따로 선택합니다.',
        videoModel: '비디오 모델',
        videoVoiceLabel: 'Voice',
        videoVoicePlaceholder: 'Andrew 또는 @Voice: Andrew',
        videoVoiceIncompatible: 'Voice는 Omni Flash Ingredients에서만 사용됩니다.',
        videoOmniEndFrameWarning: 'Omni Flash는 end frame을 지원하지 않습니다. End frame 선택은 비활성화됩니다.',
        videoModeUnsupportedByModel: '선택한 비디오 모델은 이 모드를 지원하지 않습니다.',
        videoCreditsConfirm: '비디오 생성은 Flow 크레딧을 사용합니다. 실행 전에 다시 확인해주세요.',
        videoFrameStartRequired: 'Frames to Video를 실행하기 전에 start frame을 선택하세요.',
        videoIngredientsRequired: 'Ingredients to Video를 실행하기 전에 최소 1개의 ingredient 이미지를 선택하세요.',
        videoIngredientsMaxReached: 'Ingredients to Video는 프롬프트당 최대 3장까지 지원합니다.',
        videoModeRequired: '실행 전에 각 비디오 프롬프트에서 Ingredients 또는 Frames를 선택하세요.',
        videoSelectAssetsFirst: '먼저 위에서 비디오 에셋을 선택하세요.',
        queueVideoIngredientsTitle: '이 프롬프트 Ingredients 선택',
        queueVideoStartFrameTitle: '이 프롬프트 Start Frame 선택',
        queueVideoEndFrameTitle: '이 프롬프트 End Frame 선택',
        queueVideoIngredientsButton: '+ Ingredients',
        queueVideoStartButton: 'Start Image',
        queueVideoEndButton: 'End Image',
        videoThumbIngredientLabel: 'Ingredient',
        videoThumbStartLabel: 'Start',
        videoThumbEndLabel: 'End',
        queueVideoModeLabel: 'Mode',
        queueVideoDurationLabel: 'Duration',
        queueChooseVideoMode: 'Ingredients 또는 Frames 선택',
        noStartFrame: 'Start frame 없음',
        csvGuideMessage: 'CSV 가이드\n\nCSV 업로드는 프롬프트 행을 먼저 에디터에 불러옵니다. 자동으로 큐에 추가되지는 않습니다.\n\nCSV 사용이 좋은 경우:\n- 많은 프롬프트를 빠르게 추가할 때\n- 스프레드시트에서 장면별 행을 관리할 때\n\n기본 형식:\n- 한 행에 프롬프트 하나\n- 가능하면 헤더 사용 (예: prompt / image prompt / text prompt)\n- UTF-8 권장 (다른 인코딩도 자동 감지)\n\n빠른 순서:\n1. CSV 파일 준비\n2. 확장 프로그램으로 가져오기\n3. 문제 행이 있으면 수정\n4. 에디터에서 확인\n5. \"Add to Queue\" 클릭 후 자동화 시작\n\n참고:\n- 선택한 CSV 파일 참조는 가져오기 직후 폐기됩니다.\n- 깨진 행은 비워두면 스킵됩니다.',
        cleanupStaleItemsConfirm: '완료/실패 항목이 {count}개 쌓여 있습니다. 지금 정리할까요?',
        noQueueItemsToRun: '먼저 프롬프트를 입력하거나 큐에 항목을 추가하세요.',
        retryUnfinished: '미완료 프롬프트 재실행',
        retryUnfinishedConfirm: '완료하지 못한 프롬프트를 다시 실행할까요? 완료된 프롬프트는 그대로 유지됩니다.',
        retryUnfinishedReady: '미완료 프롬프트를 다시 실행할 준비가 되었습니다.',
        noUnfinishedToRetry: '다시 실행할 미완료 프롬프트가 없습니다.',
        promptNotFound: '프롬프트를 찾을 수 없음',
        flowCharacter: 'Flow 캐릭터',
        flowAsset: 'Flow 에셋',
        orderLabel: '순서 {count}',
        characterN: '캐릭터 {count}',
        pickerVideoTitle: '비디오 에셋 픽커',
        pickerCharacterTitle: '캐릭터 픽커',
        pickerReferenceTitle: '레퍼런스 에셋 픽커',
        pickerAvailableVideoAssets: '사용 가능한 비디오 에셋',
        pickerAvailableCharacters: '사용 가능한 캐릭터',
        pickerAvailableAssets: '사용 가능한 에셋',
        pickerSelectedVideoAssets: '선택된 비디오 에셋',
        pickerSelectedCharacter: '선택된 캐릭터',
        pickerSelectedCharacters: '선택된 캐릭터',
        pickerSelectedReferenceImages: '선택된 레퍼런스 이미지',
        pickerSaveVideoQueue: '비디오 큐 저장',
        pickerUseCharacter: '캐릭터 사용',
        pickerUseSelected: '선택 사용',
        pickerVideoSummarySelected: '비디오 에셋 {count}개 선택됨.',
        pickerVideoSummaryEmpty: '왼쪽 비디오 에셋을 오른쪽 큐로 이동하세요.',
        pickerCharacterSummarySelected: '캐릭터 {count}개 선택됨.',
        pickerCharacterSummaryEmpty: '왼쪽에서 생성된 캐릭터를 하나 이상 오른쪽 선택 목록으로 이동하세요.',
        pickerReferenceSummarySelected: '레퍼런스 이미지 {count}개 선택됨.',
        pickerReferenceSummaryEmpty: '왼쪽 레퍼런스 이미지를 오른쪽 선택 목록으로 이동하세요.',
        pickerNoAssetsAvailable: '사용 가능한 에셋이 없습니다. "에셋 다시 불러오기"를 사용하세요.',
        pickerSelectedVideoEmpty: '선택한 비디오 에셋이 여기에 표시됩니다.',
        pickerSelectedCharacterEmpty: '선택한 캐릭터들이 여기에 표시됩니다.',
        pickerSelectedReferenceEmpty: '선택한 레퍼런스 이미지가 여기에 표시됩니다.',
        openProjectTabFirst: '대상 Google Flow 프로젝트 탭을 먼저 열고 다시 시도하세요.',
        csvImportCanceled: 'CSV 가져오기가 취소되었습니다. 큐에는 추가되지 않았습니다.',
        csvNoValidPrompts: '가져올 유효한 프롬프트가 없습니다. 하나 이상 입력하거나 취소하세요.',
        csvLoadedReady: 'CSV 로드 완료: 프롬프트 {count}개 준비됨. 검토 후 "Add to Queue"를 클릭하세요.{details}',
        csvLoadedWithIssues: 'CSV 로드됨: 문제 {count}개 발견. 강조된 행을 수정 후 적용하세요.',
        csvEmptyUnreadable: 'CSV가 비어 있거나 읽을 수 없습니다.',
        csvNoValidRows: 'CSV에서 유효한 프롬프트 행을 찾지 못했습니다.',
        csvLoadedReplacement: 'CSV 로드됨 ({count}개, {encoding}). 일부 문자를 확인하세요.',
        csvLoadedDetail: 'CSV 로드 완료: {count}개 준비됨 (구분자: {delimiter}, 인코딩: {encoding}). 검토 후 "Add to Queue"를 클릭하세요.',
        csvImportFailed: 'CSV 가져오기 실패: {message}',
        csvImportCompleteTitle: 'CSV 가져오기 완료.',
        csvFoundPrompts: '찾은 프롬프트: {count}',
        csvRowsNeedFixes: '수정 필요한 행: {count}',
        csvReviewFixRows: '강조된 행을 검토하고 수정하세요.',
        csvLoadedToEditor: '에디터에 로드됨: {count}',
        csvReviewAddQueue: '검토 후 준비되면 "Add to Queue"를 클릭하세요.',
        reloadAssetsReselectVideoStart: 'Flow 에셋을 다시 불러온 뒤 비디오 시작 이미지를 다시 선택하세요.',
        noCharactersFoundCreateFirst: '캐릭터를 찾을 수 없습니다. 먼저 Flow 캐릭터를 생성한 뒤 다시 불러오세요.',
        clearedVideoQueue: '비디오 에셋 큐를 비웠습니다.',
        importedFromReceiver: '수신 페이지에서 프롬프트 {count}개를 가져왔습니다.',
        selectVideoAssetsFirst: '먼저 비디오 에셋을 선택하세요.',
        setVideoPromptScene01: '먼저 Scene 01 비디오 프롬프트를 설정하세요.',
        openFlowProjectTabFirst: '먼저 Google Flow 프로젝트 탭을 여세요.',
        dryRunComplete: '드라이 런 완료. Create 클릭 없이 시작 이미지와 프롬프트만 준비했습니다.',
        dryRunFailed: '드라이 런 실패: {message}',
        reloadVideoAssetsFirst: '먼저 비디오 에셋을 다시 불러오세요.',
        noSceneAssetsFound: '현재 프로젝트에서 scene/image 번호 에셋을 찾지 못했습니다.',
        autoAddedVideoAssets: '번호가 있는 비디오 에셋 {count}개를 자동 추가했습니다.',
        openFlowProjectTabWithPath: '먼저 Google Flow 프로젝트 탭을 여세요 (labs.google/fx/tools/flow/project/…).',
        failedToLoadAssets: '에셋 불러오기에 실패했습니다.',
        noAssetsFoundOpenAddMedia: '에셋을 찾지 못했습니다. 먼저 Add Media 패널을 여세요.',
        loadedFreshAssetsCleared: '새 에셋 {count}개를 불러왔고 기존 레퍼런스 선택을 초기화했습니다.',
        failedToLoadAssetsWithError: '에셋 불러오기 실패: {message}',
        failedToLoadCharacters: '캐릭터 불러오기에 실패했습니다.',
        loadedCharacters: '캐릭터 {count}개를 불러왔습니다.',
        failedToLoadCharactersWithError: '캐릭터 불러오기 실패: {message}',
        failedToLoadVideoAssets: '비디오 에셋 불러오기에 실패했습니다.',
        loadedVideoAssets: '비디오 에셋 {count}개를 불러왔습니다.',
        failedToLoadVideoAssetsWithError: '비디오 에셋 불러오기 실패: {message}',
        buttonsOnlyInFlowProject: '이 버튼은 Google Flow 프로젝트 안에서만 사용할 수 있습니다.',
        removedReferenceSelectedNow: '레퍼런스 이미지를 제거했습니다. 현재 선택: {count}.',
        oauthClientIdMissing: '먼저 manifest.json의 oauth2.client_id를 설정하세요.',
        signingInGoogle: 'Google 로그인 중...',
        signedInFirestoreFailed: '로그인은 완료됐지만 Firestore 업데이트에 실패했습니다(규칙 확인 필요).',
        signInCompleteSupport: '로그인 완료. Image Downloader가 잠금 해제되었습니다.',
        signedOutTokenClearFailed: '로컬 로그아웃 완료. 브라우저 토큰 캐시는 지우지 못했습니다.',
        signedOut: '로그아웃되었습니다.',
        signInFailed: '로그인 실패: {message}',
        signOutFailed: '로그아웃 실패: {message}',
        flowButtonSyncFailed: 'Flow {flowType} 버튼 동기화에 실패했습니다. Flow 탭을 새로고침하고 다시 시도하세요.',
        moveUp: '위로',
        moveDown: '아래로',
        edit: '편집',
        editVideoPrompt: '비디오 프롬프트 편집',
        noPromptSpecified: '프롬프트 없음',
        unknownAsset: '알 수 없는 에셋',
        signingInShortStatus: 'Google SSO: 로그인 중...',
        downloading: '다운로드 중...',
        loading: '불러오는 중...',
        reloading: '다시 불러오는 중...',
        loadFromFlow: 'Flow에서 불러오기'
    },
    ja: {
        languageHindi: 'ヒンディー語',
        characterPremiumRequiredHelp: 'キャラクターの追加にはプレミアム解除が必要です。キャラクターの閲覧はできますが、プロンプトに追加するにはプレミアムが必要です。',
        referenceAssetSingleImageLimit: '参照画像には Premium 解除が必要です。',
        premiumFeature: 'プレミアム機能',
        premiumFeatureUnlockedHeader: 'プレミアム機能が有効です',
        premiumFeatureKicker: 'プレミアムアクセス',
        premiumFeatureTitle: 'プレミアム機能',
        premiumFeatureMessage: 'プレミアム機能は、対象の登録ユーザーまたは有効なサブスクライバーに提供されます。',
        premiumFeatureFeedback: 'Google Flow Automator は無料ツールです。継続的な改善のため、もし便利だと感じたら Chrome ウェブストアで正直なフィードバックやレビューをいただけると助かります。レビューはより多くのユーザーがこのツールを見つけ、プロジェクトを成長させる助けになります。',
        premiumFeatureYoutube: 'YouTube チャンネルを登録すると、このツールを支援し、更新情報を受け取れます。',
        premiumFeatureManual: 'レビューの投稿は任意であり、プレミアムアクセスを保証するものではありません。利用資格は自動的に確認され、条件を満たさなくなった場合はアクセスが更新または取り消されることがあります。',
        premiumFeatureForm: 'アクセス申請フォーム',
        premiumFeatureReview: 'Chrome ウェブストアを開く',
        premiumFeatureClose: '閉じる',
        storyboard: 'アドバンスドストーリーボード',
        loginRequiredTitle: 'サインインが必要です',
        loginRequiredBody: 'Google Flow Automator を使用するには Google でサインインしてください。',
        loginRequiredToUse: 'この機能を使う前に Google でサインインしてください。',
        membershipUsageTitle: 'メンバーシップ',
        starterUsageBody: '本日 {limit} 件中 {used} 件使用',
        unlimitedUsageBody: '無制限のプロンプトを利用できます',
        unlimited: '無制限',
        trialEndsAt: 'Trial ends {date}',
        trialUnlimitedUntil: 'Unlimited until {date}',
        starterQuotaReached: 'Starter daily prompt limit reached ({limit} prompts/day).',
        starterQuotaNotEnough: 'Starter は本日あと {remaining} 件までです。キューを減らすかアップグレードしてください。',
        profileTitle: 'ユーザープロフィール',
        profileUserId: 'ユーザー ID',
        profileLanguage: '言語',
        profileMembership: 'メンバーシップ',
        profileQuota: 'プロンプト利用',
        starterTier: 'Starter',
        premiumTier: 'Premium',
        premiumRequiredMembership: 'Premium が必要',
        professionalTier: 'Professional',
        upgrade: 'アップグレード',
        upgraded: 'アップグレード済み',
        starterFeatures: ['Google SSO またはメールログイン', 'プロンプトキューと CSV インポート', '基本的なプロンプト自動化', '生成後の1K自動ダウンロード'],
        premiumFeatures: ['Starter の全機能', '参照画像は最大3枚', 'キャラクターは最大2人', 'プロンプトごとに異なるアセット', 'Download 2K Upscaled ベータ', 'Storyboard 計画'],
        professionalFeatures: ['Premium の全機能', '参照画像とキャラクター無制限', '画像/動画モード切替', '動画ワークフロー対応: Ingredients, Frames, Start/End frame, モデル選択', 'Storyboard と高度な計画ツール', '画像ダウンローダー（一括ダウンロード + 2K/4K アップスケール）', 'ダークモード', '新しいベータ機能への優先アクセス'],        subscribeOnYoutube: 'YouTube を登録',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        premiumRequiredForCharacters: 'キャラクターの追加にはプレミアム解除が必要です。',
        premiumRequiredForMultipleReferences: '参照画像には Premium 解除が必要です。',
        premiumAssetsLockedBody: 'ロック中の機能: キャラクターアセットとリファレンス画像。',
        upscaledDownloadFallbackBeforeRun: 'Download 2K Upscaled はプレミアムアクセスが必要なためオフにしました。プロンプトは通常の 1K 自動ダウンロードで続行します。すでにプレミアムの場合は Request Access Form からご連絡ください。',
        premiumAccessCheckFailedBeforeRun: 'プレミアムアクセスの確認に失敗しました。実行前にプレミアム専用機能をオフにしました。',
        perPromptAssetsRemovedBeforeRun: 'プロンプトごとの画像アセットにはプレミアムアクセスが必要です。選択したプレミアム画像を削除し、この実行はテキストのみで続行します。'
    },
    zh: {
        languageHindi: '印地语',
        characterPremiumRequiredHelp: '添加角色需要解锁高级功能。你可以查看角色，但将角色添加到提示词需要高级权限。',
        referenceAssetSingleImageLimit: '参考图需要解锁 Premium。',
        premiumFeature: '高级功能',
        premiumFeatureUnlockedHeader: '高级功能已解锁',
        premiumFeatureKicker: '高级访问',
        premiumFeatureTitle: '高级功能',
        premiumFeatureMessage: '高级功能提供给符合条件的注册用户或有效订阅用户。',
        premiumFeatureFeedback: 'Google Flow Automator 是免费工具，你的支持能帮助我们持续改进。如果你觉得这个工具有帮助，欢迎在 Chrome Web Store 留下真实反馈或评价。评价可以帮助更多用户发现这个工具，并支持项目继续成长。',
        premiumFeatureYoutube: '你也可以订阅 YouTube 频道来支持这个工具并关注更新。',
        premiumFeatureManual: '留下评价完全是自愿的，并不保证获得高级访问权限。资格会自动检查，如果不再符合要求，访问权限可能会更新或撤销。',
        premiumFeatureForm: '访问申请表',
        premiumFeatureReview: '打开 Chrome Web Store',
        premiumFeatureClose: '关闭',
        storyboard: '高级故事板',
        loginRequiredTitle: '需要登录',
        loginRequiredBody: '请使用 Google 登录以使用 Google Flow Automator。',
        loginRequiredToUse: '使用此功能前请先使用 Google 登录。',
        membershipUsageTitle: '会员',
        starterUsageBody: '今天已使用 {used}/{limit} 个提示词',
        unlimitedUsageBody: '可使用无限提示词',
        unlimited: '无限',
        trialEndsAt: 'Trial ends {date}',
        trialUnlimitedUntil: 'Unlimited until {date}',
        starterQuotaReached: 'Starter daily prompt limit reached ({limit} prompts/day).',
        starterQuotaNotEnough: 'Starter 今天还剩 {remaining} 个提示词。请减少队列或升级。',
        profileTitle: '用户资料',
        profileUserId: '用户 ID',
        profileLanguage: '语言',
        profileMembership: '会员等级',
        profileQuota: '提示词使用权限',
        starterTier: 'Starter',
        premiumTier: 'Premium',
        premiumRequiredMembership: '需要 Premium',
        professionalTier: 'Professional',
        upgrade: '升级',
        upgraded: '已升级',
        starterFeatures: ['Google SSO 或邮箱登录', '提示词队列和 CSV 导入', '基础提示词自动化', '生成后自动下载 1K'],
        premiumFeatures: ['Starter 的所有功能', '参考图最多 3 张', '角色最多 2 个', '每个提示词使用不同素材', 'Download 2K Upscaled Beta', 'Storyboard 规划'],
        professionalFeatures: ['Premium 的所有功能', '参考图和角色无限制', '图片/视频模式切换', '视频工作流支持：Ingredients、Frames、Start/End frame、模型选择', 'Storyboard 和高级规划工具', '图片下载器（批量下载 + 2K/4K 高清放大）', '深色模式', '优先体验新的 Beta 功能'],        subscribeOnYoutube: '订阅 YouTube',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        premiumRequiredForCharacters: '添加角色需要解锁高级功能。',
        premiumRequiredForMultipleReferences: '参考图需要解锁 Premium。',
        premiumAssetsLockedBody: '已锁定功能：角色素材和参考图。',
        upscaledDownloadFallbackBeforeRun: 'Download 2K Upscaled 需要高级访问权限，因此已关闭。提示词将继续使用普通 1K 自动下载。如果你已经是高级用户，请通过 Request Access Form 联系我们。',
        premiumAccessCheckFailedBeforeRun: '高级访问权限检查失败。运行前已关闭高级专用功能。',
        perPromptAssetsRemovedBeforeRun: '每个提示词单独使用图片资产需要高级访问权限。已移除所选高级图片，本次运行将仅使用文本继续。'
    },
    de: {
        languageHindi: 'Hindi',
        characterPremiumRequiredHelp: 'Zum Hinzufügen von Charakteren ist Premium-Freischaltung erforderlich. Du kannst Charaktere ansehen, aber zum Hinzufügen zu Prompts ist Premium nötig.',
        referenceAssetSingleImageLimit: 'Referenzbilder erfordern Premium-Freischaltung.',
        premiumFeature: 'Premium-Funktion',
        premiumFeatureUnlockedHeader: 'Premium-Funktion freigeschaltet',
        premiumFeatureKicker: 'Premium-Zugang',
        premiumFeatureTitle: 'Premium-Funktion',
        premiumFeatureMessage: 'Premium-Funktionen sind für berechtigte registrierte Nutzer oder aktive Abonnenten verfügbar.',
        premiumFeatureFeedback: 'Google Flow Automator ist ein kostenloses Tool, und deine Unterstützung hilft uns, es weiter zu verbessern. Wenn dir das Tool gefällt, freuen wir uns über ehrliches Feedback oder eine Bewertung im Chrome Web Store. Bewertungen helfen mehr Nutzern, das Tool zu entdecken, und unterstützen das Wachstum des Projekts.',
        premiumFeatureYoutube: 'Du kannst auch den YouTube-Kanal abonnieren, um dieses Tool zu unterstützen und Updates zu verfolgen.',
        premiumFeatureManual: 'Eine Bewertung ist völlig freiwillig und garantiert keinen Premium-Zugang. Die Berechtigung wird automatisch geprüft, und der Premium-Zugang kann aktualisiert oder entzogen werden, wenn die Anforderungen nicht mehr erfüllt sind.',
        premiumFeatureForm: 'Zugriff beantragen',
        premiumFeatureReview: 'Chrome Web Store öffnen',
        premiumFeatureClose: 'Schließen',
        storyboard: 'Advanced Storyboard',
        loginRequiredTitle: 'Anmeldung erforderlich',
        loginRequiredBody: 'Melde dich mit Google an, um Google Flow Automator zu verwenden.',
        loginRequiredToUse: 'Bitte melde dich mit Google an, bevor du diese Funktion verwendest.',
        membershipUsageTitle: 'Mitgliedschaft',
        starterUsageBody: 'Heute {used}/{limit} Prompts verwendet',
        unlimitedUsageBody: 'Unbegrenzte Prompts verfügbar',
        unlimited: 'Unbegrenzt',
        trialEndsAt: 'Trial ends {date}',
        trialUnlimitedUntil: 'Unlimited until {date}',
        starterQuotaReached: 'Starter daily prompt limit reached ({limit} prompts/day).',
        starterQuotaNotEnough: 'Starter hat heute noch {remaining} Prompt(s). Reduziere die Queue oder upgrade.',
        profileTitle: 'Benutzerprofil',
        profileUserId: 'Benutzer-ID',
        profileLanguage: 'Sprache',
        profileMembership: 'Mitgliedschaft',
        profileQuota: 'Prompt-Zugriff',
        starterTier: 'Starter',
        premiumTier: 'Premium',
        premiumRequiredMembership: 'Premium erforderlich',
        professionalTier: 'Professional',
        upgrade: 'Upgrade',
        upgraded: 'Upgraded',
        starterFeatures: ['Google SSO- oder E-Mail-Login', 'Prompt-Queue und CSV-Import', 'Grundlegende Prompt-Automatisierung', '1K-Auto-Download nach der Generierung'],
        premiumFeatures: ['Alles in Starter', 'Bis zu 3 Referenzbilder', 'Bis zu 2 Charaktere', 'Unterschiedliche Assets pro Prompt', 'Download 2K Upscaled Beta', 'Storyboard-Planung'],
        professionalFeatures: ['Alles in Premium', 'Unbegrenzte Referenzbilder und Charaktere', 'Bild-/Video-Moduswechsel', 'Video-Workflow-Support: Ingredients, Frames, Start/End frame, Modellauswahl', 'Storyboard und erweiterte Planung', 'Bild-Downloader (Stapel-Download + 2K/4K-Upscale)', 'Dunkelmodus', 'Prioritätszugang zu neuen Beta-Funktionen'],        subscribeOnYoutube: 'YouTube abonnieren',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        premiumRequiredForCharacters: 'Zum Hinzufügen von Charakteren ist Premium-Freischaltung erforderlich.',
        premiumRequiredForMultipleReferences: 'Referenzbilder erfordern Premium-Freischaltung.',
        premiumAssetsLockedBody: 'Gesperrte Funktionen: Charakter-Assets und Referenzbilder.',
        upscaledDownloadFallbackBeforeRun: 'Download 2K Upscaled erfordert Premium-Zugriff und wurde deaktiviert. Der Prompt läuft mit dem normalen 1K-Auto-Download weiter. Wenn du bereits Premium hast, kontaktiere uns bitte über das Request Access Form.',
        premiumAccessCheckFailedBeforeRun: 'Die Premium-Zugriffsprüfung ist fehlgeschlagen. Premium-Funktionen wurden vor dem Start deaktiviert.',
        perPromptAssetsRemovedBeforeRun: 'Bild-Assets pro Prompt erfordern Premium-Zugriff. Ausgewählte Premium-Bilder wurden entfernt, und dieser Lauf wird nur mit Text fortgesetzt.'
    },
    fr: {
        languageHindi: 'Hindi',
        characterPremiumRequiredHelp: 'L’ajout de personnages nécessite le déverrouillage premium. Vous pouvez voir les personnages, mais les ajouter aux prompts nécessite Premium.',
        referenceAssetSingleImageLimit: 'Les images de référence nécessitent le déverrouillage Premium.',
        premiumFeature: 'Fonction premium',
        premiumFeatureUnlockedHeader: 'Fonction premium déverrouillée',
        premiumFeatureKicker: 'Accès premium',
        premiumFeatureTitle: 'Fonction premium',
        premiumFeatureMessage: 'Les fonctions premium sont disponibles pour les utilisateurs inscrits éligibles ou les abonnés actifs.',
        premiumFeatureFeedback: 'Google Flow Automator est un outil gratuit, et votre soutien nous aide à continuer à l’améliorer. Si l’outil vous plaît, nous apprécierions un retour honnête ou un avis sur le Chrome Web Store. Les avis aident davantage d’utilisateurs à découvrir l’outil et soutiennent la croissance du projet.',
        premiumFeatureYoutube: 'Vous pouvez aussi vous abonner à la chaîne YouTube pour soutenir cet outil et suivre les mises à jour.',
        premiumFeatureManual: 'Laisser un avis est entièrement facultatif et ne garantit pas l’accès premium. L’éligibilité sera vérifiée automatiquement, et l’accès premium peut être mis à jour ou révoqué si les conditions ne sont plus remplies.',
        premiumFeatureForm: 'Formulaire de demande d’accès',
        premiumFeatureReview: 'Ouvrir le Chrome Web Store',
        premiumFeatureClose: 'Fermer',
        storyboard: 'Advanced Storyboard',
        loginRequiredTitle: 'Connexion requise',
        loginRequiredBody: 'Connectez-vous avec Google pour utiliser Google Flow Automator.',
        loginRequiredToUse: 'Veuillez vous connecter avec Google avant d’utiliser cette fonctionnalité.',
        membershipUsageTitle: 'Abonnement',
        starterUsageBody: '{used}/{limit} prompts utilisés aujourd’hui',
        unlimitedUsageBody: 'Prompts illimités disponibles',
        unlimited: 'Illimité',
        trialEndsAt: 'Trial ends {date}',
        trialUnlimitedUntil: 'Unlimited until {date}',
        starterQuotaReached: 'Starter daily prompt limit reached ({limit} prompts/day).',
        starterQuotaNotEnough: 'Starter dispose encore de {remaining} prompt(s) aujourd’hui. Réduisez la file ou passez à une offre supérieure.',
        profileTitle: 'Profil utilisateur',
        profileUserId: 'ID utilisateur',
        profileLanguage: 'Langue',
        profileMembership: 'Abonnement',
        profileQuota: 'Accès aux prompts',
        starterTier: 'Starter',
        premiumTier: 'Premium',
        premiumRequiredMembership: 'Premium requis',
        professionalTier: 'Professional',
        upgrade: 'Mettre à niveau',
        upgraded: 'Mis à niveau',
        starterFeatures: ['Connexion Google SSO ou e-mail', 'File de prompts et import CSV', 'Automatisation de base des prompts', 'Téléchargement automatique 1K après génération'],
        premiumFeatures: ['Tout Starter', 'Jusqu’à 3 images de référence', 'Jusqu’à 2 personnages', 'Assets différents par prompt', 'Download 2K Upscaled bêta', 'Planification Storyboard'],
        professionalFeatures: ['Tout Premium', 'Images de référence et personnages illimités', 'Basculement Image/Vidéo', 'Support vidéo: Ingredients, Frames, Start/End frame, sélection du modèle', 'Storyboard et outils de planification avancés', 'Téléchargeur d\'images (téléchargement groupé + upscale 2K/4K)', 'Mode sombre', 'Accès prioritaire aux nouvelles fonctionnalités bêta'],        subscribeOnYoutube: 'S’abonner sur YouTube',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        premiumRequiredForCharacters: 'L’ajout de personnages nécessite le déverrouillage premium.',
        premiumRequiredForMultipleReferences: 'Les images de référence nécessitent le déverrouillage Premium.',
        premiumAssetsLockedBody: 'Fonctionnalités verrouillées : personnages et images de référence.',
        upscaledDownloadFallbackBeforeRun: 'Download 2K Upscaled nécessite un accès premium et a été désactivé. Le prompt continuera avec le téléchargement automatique 1K normal. Si vous êtes déjà premium, contactez-nous via le Request Access Form.',
        premiumAccessCheckFailedBeforeRun: 'La vérification de l’accès premium a échoué. Les fonctionnalités premium ont été désactivées avant le lancement.',
        perPromptAssetsRemovedBeforeRun: 'Les images par prompt nécessitent un accès premium. Les images premium sélectionnées ont été retirées, et cette exécution continuera avec le texte uniquement.'
    },
    hi: {
        storyboard: 'एडवांस्ड स्टोरीबोर्ड',
        loginRequiredTitle: 'साइन इन आवश्यक है',
        loginRequiredBody: 'Google Flow Automator का उपयोग करने के लिए Google से साइन इन करें।',
        loginRequiredToUse: 'इस फीचर का उपयोग करने से पहले Google से साइन इन करें।',
        membershipUsageTitle: 'मेंबरशिप',
        starterUsageBody: 'आज {used}/{limit} prompts उपयोग हुए',
        unlimitedUsageBody: 'अनलिमिटेड प्रॉम्प्ट उपलब्ध हैं',
        unlimited: 'अनलिमिटेड',
        trialEndsAt: 'Trial ends {date}',
        trialUnlimitedUntil: 'Unlimited until {date}',
        starterQuotaReached: 'Starter daily prompt limit reached ({limit} prompts/day).',
        starterQuotaNotEnough: 'Starter में आज {remaining} prompts बचे हैं। Queue कम करें या अपग्रेड करें।',
        profileTitle: 'यूज़र प्रोफ़ाइल',
        profileUserId: 'यूज़र ID',
        profileLanguage: 'भाषा',
        profileMembership: 'मेंबरशिप',
        profileQuota: 'Prompt access',
        starterTier: 'Starter',
        premiumTier: 'Premium',
        premiumRequiredMembership: 'Premium Required',
        professionalTier: 'Professional',
        upgrade: 'Upgrade',
        upgraded: 'Upgraded',
        starterFeatures: ['Google SSO या email login', 'Prompt queue और CSV import', 'Basic prompt automation', 'Generation के बाद 1K auto-download'],
        premiumFeatures: ['Starter की सभी सुविधाएँ', '3 तक reference images', '2 तक characters', 'हर prompt के लिए अलग assets', 'Download 2K Upscaled beta', 'Storyboard planning'],
        professionalFeatures: ['Premium की सभी सुविधाएँ', 'Unlimited reference images और characters', 'Image/Video Mode switching', 'Video workflow support: Ingredients, Frames, Start/End frame, model selection', 'Storyboard और advanced planning tools', 'Image Downloader (batch download + 2K/4K upscaled)', 'Dark Mode', 'नए beta features का priority access'],        stop: 'रोकें',
        run: 'चलाएँ',
        forceRefresh: 'फोर्स रिफ्रेश',
        refreshConnection: 'कनेक्शन रिफ्रेश करें',
        userGuide: 'यूज़र गाइड',
        supportProject: 'इस प्रोजेक्ट को सपोर्ट करें',
        supportDescription: 'यदि यह टूल आपका समय बचाता है, तो आप आगे के अपडेट को सपोर्ट कर सकते हैं।',
        donate: 'डोनेट करें',
        control: 'कंट्रोल',
        settings: 'सेटिंग',
        image: 'इमेज',
        video: 'वीडियो',
        promptQueue: 'प्रॉम्प्ट क्यू',
        addToQueue: 'क्यू में जोड़ें',
        detectedPrompts: 'डिटेक्टेड प्रॉम्प्ट',
        currentQueue: 'वर्तमान क्यू',
        startAutomation: 'ऑटोमेशन शुरू करें',
        retryUnfinished: 'अधूरे फिर चलाएँ',
        retryUnfinishedConfirm: 'अधूरे prompts फिर चलाएँ? Completed prompts completed ही रहेंगे।',
        retryUnfinishedReady: 'अधूरे prompts फिर चलाने के लिए तैयार हैं।',
        noUnfinishedToRetry: 'फिर चलाने के लिए कोई अधूरा prompt नहीं है।',
        reuseCompletedPrompt: 'फिर उपयोग करें',
        reuseCompletedPromptTitle: 'इस completed prompt को फिर उपयोग करें',
        completedPromptReused: 'Completed prompt को queue में copy कर दिया गया।',
        clearQueue: 'क्यू साफ़ करें',
        language: 'भाषा',
        uploadCsv: 'CSV अपलोड करें',
        csvGuideBtn: 'CSV गाइड',
        characterTitle: 'कैरेक्टर',
        characterPremiumRequiredHelp: 'Characters add करने के लिए Premium unlock चाहिए। आप characters देख सकते हैं, लेकिन prompt में add करने के लिए Premium चाहिए।',
        referenceAssetTitle: 'रेफरेंस एसेट',
        referenceAssetSingleImageLimit: 'Reference images के लिए Premium unlock चाहिए।',
        queueAutoResetNote: 'नोट: क्यू हर 24 घंटे में अपने आप रीसेट होती है।',
        bulkDownloaderTitle: 'Image Downloader',
        bulkDownloaderNote: 'Image Downloader इस्तेमाल करने के लिए Google SSO से साइन इन करें। आपका login data सेव नहीं किया जाता; यह केवल login verification के लिए है।',
        imageDownloaderFeatures: 'Page Image Downloader और generated images के लिए 2K Upscaled Auto Downloader शामिल हैं।',
        ssoFeaturePreview: '2K Upscaled Auto Downloader शामिल है',
        generationAutoDownloadTitle: 'जेनरेशन ऑटो-डाउनलोड',
        upscaleDownload: '2K Upscaled डाउनलोड करें (Beta)',
        upscaleQualityPremium: 'Premium: 2K',
        upscaleQualityProfessional: 'Professional: 4K',
        upscaleDownloadNote: 'Beta: हर जनरेटेड इमेज के बाद 2K upscaled version डाउनलोड करता है, पूरा होने पर अगला prompt भेजता है। यह धीमा है, Download Page Images में उपयोग नहीं होता, और Flow UI बदलने पर परफेक्ट नहीं हो सकता।',
        upscaleDownloadToolsDisabled: 'Not Support for Upscaled images',
        upscaledDownloadFallbackBeforeRun: 'Download 2K Upscaled के लिए premium access चाहिए, इसलिए इसे बंद कर दिया गया। Prompt सामान्य 1K auto-download के साथ जारी रहेगा। अगर आप पहले से premium हैं, तो Request Access Form से संपर्क करें।',
        premiumAccessCheckFailedBeforeRun: 'Premium access check fail हुआ। Run करने से पहले premium-only features बंद कर दिए गए।',
        theme: 'थीम',
        themeDefault: 'Default',
        themeLogo: 'Logo',
        themeDark: 'Dark',
        promptDelay: 'प्रॉम्प्ट डिले',
        promptDelayNote: 'चालू होने पर अगला prompt भेजने से पहले चुने गए seconds तक इंतज़ार करता है। सीमा: 30-90 seconds (10 के अंतराल में).',
        promptDelaySeconds: 'Delay seconds (10-90)',        remoteNotificationDefaultTitle: 'Extension Notice',
        remoteNotificationConfirm: 'Got it',
        remoteNotificationVersion: 'Version {version}',
        queueAssetsTitle: 'Per-Prompt Assets',
        queueAssetsInherited: 'Current assets are copied into each queue item.',
        perPromptAssets: 'Use different assets per prompt',
        perPromptAssetsNote: 'Premium unlock required. Select character/reference images above, turn this on, click Queue & Select, then choose assets for each prompt.',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        perPromptAssetsLocked: 'Premium Feature - Unlock Required',
        premiumRequiredForCharacters: 'Characters add करने के लिए Premium unlock चाहिए।',
        premiumRequiredForMultipleReferences: 'Reference images के लिए Premium unlock चाहिए।',
        premiumAssetsLockedBody: 'Locked features: Character Assets और Reference Images.',
        perPromptAssetsRemovedBeforeRun: 'Per-prompt image assets के लिए premium access चाहिए। चुनी गई premium images हटा दी गई हैं, और यह run सिर्फ text के साथ जारी रहेगा।',
        promptAssetsHint: 'Current character and reference images are copied into each prompt when added. Use the queue buttons to edit assets per prompt before running.',
        reviewPromptAssetsBeforeStart: 'Prompts added. Review per-prompt assets below, then click Start again.',
        queueCharacterButton: 'Edit Character',
        queueImagesButton: 'Edit Images',
        queueAddCharacterButton: '+ Character',
        queueAddImagesButton: '+ Images',
        queueNoCharacter: 'No character',
        queueNoImages: 'No images',
        queueSelectTopCharacterFirst: 'Select a character at the top first.',
        queueSelectTopImagesFirst: 'Select reference images at the top first.',
        queueAssetPickerCharacterTitle: 'Select Character for This Prompt',
        queueAssetPickerImagesTitle: 'Select Images for This Prompt',
        queueAssetPickerSubtitle: 'Choose from the assets selected at the top. Click thumbnails to select or remove.',
        queueVideoIngredientPickerSubtitle: '{selected} / {max} selected — click thumbnails to toggle, then tap Done.',
        queueVideoIngredientPickerMax: 'Maximum {max} ingredients reached.',
        queueAssetPickerDone: 'Done',
        queueCharacterSet: 'Character: {name}',
        queueCharactersSet: 'Characters: {count}',
        queueImagesSet: 'Images: {count}',
        ready: 'तैयार'
    }
};

for (const [lang, patch] of Object.entries(I18N_PATCH)) {
    const base = lang === 'hi' ? (I18N.hi || I18N.en) : (I18N[lang] || I18N.en);
    I18N[lang] = { ...base, ...patch };
}

const AUTH_STORYBOARD_I18N_PATCH = {
    en: {
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        storyboard: 'Advanced Storyboard',
        welcomeBackTitle: 'Welcome Back',
        welcomeBackSubtitle: 'Sign in to your account',
        continueWithGoogle: 'Continue with Google',
        continueWithEmail: 'or continue with email',
        emailAddress: 'Email Address',
        password: 'Password',
        forgotPassword: 'Forgot Password?',
        signIn: 'Sign In',
        createAccount: 'Create account',
        dontHaveAccount: "Don't have an account?",
        alreadyHaveAccount: 'Already have an account?',
        createAccountTitle: 'Create Account',
        createAccountSubtitle: 'Start with your email',
        authTermsPrefix: 'By continuing, you agree to our',
        emailRequired: 'Enter your email address.',
        passwordRequired: 'Enter your password.',
        signingInEmail: 'Signing in with email...',
        creatingAccount: 'Creating account...',
        accountCreated: 'Account created. You are signed in.',
        accountCreatedVerifyEmail: 'Account created. We sent a verification email. Please verify your email, then sign in.',
        emailVerificationRequired: 'Please verify your email before signing in. Check your inbox, then try again.',
        emailVerificationSent: 'Verification email sent. Please verify your email, then sign in again.',
        emailVerificationSignInAgain: 'Please sign in again to send a verification email.',
        passwordResetSent: 'Password reset email sent.',
        passwordResetFailed: 'Password reset failed: {message}',
        emailAlreadyExists: 'This email already has an account. Please sign in instead.',
        emailSignInInvalid: 'Email or password is incorrect.',
        emailWeakPassword: 'Password should be at least 6 characters.',
        emailInvalid: 'Enter a valid email address.',
        emailPasswordDisabled: 'Email/password login is not enabled in Firebase Authentication.',
        emailSignInFailed: 'Email sign-in failed.',
        storyboardOverviewTitle: 'Storyboard',
        storyboardOverviewSubtitle: 'Preview queued image scenes before generation.',
        storyboardNoScenes: 'No queued scenes yet.',
        storyboardScene: 'Image {count}',
        storyboardPrompt: 'Prompt',
        storyboardCharacters: 'Characters',
        storyboardReferences: 'Reference Images',
        storyboardNoImage: 'No image selected',
        storyboardImage: 'Image',
        storyboardReferenceN: 'Reference {count}'
    },
    ko: {
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        storyboard: 'Advanced Storyboard',
        welcomeBackTitle: '다시 오신 것을 환영합니다',
        welcomeBackSubtitle: '계정에 로그인하세요',
        continueWithGoogle: 'Google로 계속하기',
        continueWithEmail: '또는 이메일로 계속하기',
        emailAddress: '이메일 주소',
        password: '비밀번호',
        forgotPassword: '비밀번호를 잊으셨나요?',
        signIn: '로그인',
        createAccount: '계정 만들기',
        dontHaveAccount: '계정이 없나요?',
        alreadyHaveAccount: '이미 계정이 있나요?',
        createAccountTitle: '계정 만들기',
        createAccountSubtitle: '이메일로 시작하세요',
        authTermsPrefix: '계속하면 다음 약관에 동의하는 것입니다',
        emailRequired: '이메일 주소를 입력하세요.',
        passwordRequired: '비밀번호를 입력하세요.',
        signingInEmail: '이메일로 로그인 중...',
        creatingAccount: '계정 생성 중...',
        accountCreated: '계정이 생성되었고 로그인되었습니다.',
        accountCreatedVerifyEmail: '계정이 생성되었습니다. 인증 이메일을 보냈습니다. 이메일 인증 후 다시 로그인하세요.',
        emailVerificationRequired: '로그인 전에 이메일 인증이 필요합니다. 받은 편지함을 확인한 뒤 다시 로그인하세요.',
        emailVerificationSent: '인증 이메일을 보냈습니다. 이메일 인증 후 다시 로그인하세요.',
        emailVerificationSignInAgain: '인증 이메일을 보내려면 다시 로그인하세요.',
        passwordResetSent: '비밀번호 재설정 이메일을 보냈습니다.',
        passwordResetFailed: '비밀번호 재설정 실패: {message}',
        emailAlreadyExists: '이미 계정이 있는 이메일입니다. 로그인하세요.',
        emailSignInInvalid: '이메일 또는 비밀번호가 올바르지 않습니다.',
        emailWeakPassword: '비밀번호는 최소 6자 이상이어야 합니다.',
        emailInvalid: '올바른 이메일 주소를 입력하세요.',
        emailPasswordDisabled: 'Firebase Authentication에서 이메일/비밀번호 로그인이 활성화되어 있지 않습니다.',
        emailSignInFailed: '이메일 로그인에 실패했습니다.',
        storyboardOverviewTitle: 'Storyboard',
        storyboardOverviewSubtitle: '생성 전에 큐의 이미지 씬을 미리 확인하세요.',
        storyboardNoScenes: '큐에 준비된 씬이 없습니다.',
        storyboardScene: '이미지 {count}',
        storyboardPrompt: '프롬프트',
        storyboardCharacters: '캐릭터',
        storyboardReferences: '레퍼런스 이미지',
        storyboardNoImage: '선택된 이미지 없음',
        storyboardImage: '이미지',
        storyboardReferenceN: '레퍼런스 {count}'
    },
    ja: {
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        storyboard: 'Advanced Storyboard',
        welcomeBackTitle: 'おかえりなさい',
        welcomeBackSubtitle: 'アカウントにサインイン',
        continueWithGoogle: 'Googleで続行',
        continueWithEmail: 'またはメールで続行',
        emailAddress: 'メールアドレス',
        password: 'パスワード',
        forgotPassword: 'パスワードをお忘れですか？',
        signIn: 'サインイン',
        createAccount: 'アカウント作成',
        dontHaveAccount: 'アカウントがありませんか？',
        alreadyHaveAccount: 'すでにアカウントがありますか？',
        createAccountTitle: 'アカウント作成',
        createAccountSubtitle: 'メールで開始',
        authTermsPrefix: '続行すると、次に同意したことになります',
        emailRequired: 'メールアドレスを入力してください。',
        passwordRequired: 'パスワードを入力してください。',
        signingInEmail: 'メールでサインイン中...',
        creatingAccount: 'アカウントを作成中...',
        accountCreated: 'アカウントを作成し、サインインしました。',
        accountCreatedVerifyEmail: 'アカウントを作成しました。確認メールを送信しました。メール確認後に再度サインインしてください。',
        emailVerificationRequired: 'サインイン前にメール確認が必要です。受信箱を確認してから再度お試しください。',
        emailVerificationSent: '確認メールを送信しました。メール確認後に再度サインインしてください。',
        emailVerificationSignInAgain: '確認メールを送信するには再度サインインしてください。',
        passwordResetSent: 'パスワード再設定メールを送信しました。',
        passwordResetFailed: 'パスワード再設定に失敗しました: {message}',
        emailAlreadyExists: 'このメールには既にアカウントがあります。サインインしてください。',
        emailSignInInvalid: 'メールまたはパスワードが正しくありません。',
        emailWeakPassword: 'パスワードは6文字以上にしてください。',
        emailInvalid: '有効なメールアドレスを入力してください。',
        emailPasswordDisabled: 'Firebase Authenticationでメール/パスワードログインが有効になっていません。',
        emailSignInFailed: 'メールサインインに失敗しました。',
        storyboardOverviewTitle: 'Storyboard',
        storyboardOverviewSubtitle: '生成前にキュー内の画像シーンを確認します。',
        storyboardNoScenes: 'キューにシーンがありません。',
        storyboardScene: '画像 {count}',
        storyboardPrompt: 'プロンプト',
        storyboardCharacters: 'キャラクター',
        storyboardReferences: '参照画像',
        storyboardNoImage: '画像が選択されていません',
        storyboardImage: '画像',
        storyboardReferenceN: '参照 {count}'
    },
    zh: {
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        storyboard: 'Advanced Storyboard',
        welcomeBackTitle: '欢迎回来',
        welcomeBackSubtitle: '登录你的账号',
        continueWithGoogle: '使用 Google 继续',
        continueWithEmail: '或使用邮箱继续',
        emailAddress: '邮箱地址',
        password: '密码',
        forgotPassword: '忘记密码？',
        signIn: '登录',
        createAccount: '创建账号',
        dontHaveAccount: '还没有账号？',
        alreadyHaveAccount: '已有账号？',
        createAccountTitle: '创建账号',
        createAccountSubtitle: '使用邮箱开始',
        authTermsPrefix: '继续即表示你同意我们的',
        emailRequired: '请输入邮箱地址。',
        passwordRequired: '请输入密码。',
        signingInEmail: '正在使用邮箱登录...',
        creatingAccount: '正在创建账号...',
        accountCreated: '账号已创建并登录。',
        accountCreatedVerifyEmail: '账号已创建。我们已发送验证邮件。请验证邮箱后再登录。',
        emailVerificationRequired: '登录前请先验证邮箱。请检查收件箱后重试。',
        emailVerificationSent: '验证邮件已发送。请验证邮箱后重新登录。',
        emailVerificationSignInAgain: '请重新登录以发送验证邮件。',
        passwordResetSent: '密码重置邮件已发送。',
        passwordResetFailed: '密码重置失败：{message}',
        emailAlreadyExists: '此邮箱已有账号，请直接登录。',
        emailSignInInvalid: '邮箱或密码不正确。',
        emailWeakPassword: '密码至少需要 6 个字符。',
        emailInvalid: '请输入有效的邮箱地址。',
        emailPasswordDisabled: 'Firebase Authentication 尚未启用邮箱/密码登录。',
        emailSignInFailed: '邮箱登录失败。',
        storyboardOverviewTitle: 'Storyboard',
        storyboardOverviewSubtitle: '生成前预览队列中的图片场景。',
        storyboardNoScenes: '队列中还没有场景。',
        storyboardScene: '图片 {count}',
        storyboardPrompt: '提示词',
        storyboardCharacters: '角色',
        storyboardReferences: '参考图片',
        storyboardNoImage: '未选择图片',
        storyboardImage: '图片',
        storyboardReferenceN: '参考 {count}'
    },
    de: {
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        storyboard: 'Advanced Storyboard',
        welcomeBackTitle: 'Willkommen zurück',
        welcomeBackSubtitle: 'Melde dich bei deinem Konto an',
        continueWithGoogle: 'Mit Google fortfahren',
        continueWithEmail: 'oder mit E-Mail fortfahren',
        emailAddress: 'E-Mail-Adresse',
        password: 'Passwort',
        forgotPassword: 'Passwort vergessen?',
        signIn: 'Anmelden',
        createAccount: 'Konto erstellen',
        dontHaveAccount: 'Noch kein Konto?',
        alreadyHaveAccount: 'Schon ein Konto?',
        createAccountTitle: 'Konto erstellen',
        createAccountSubtitle: 'Mit E-Mail starten',
        authTermsPrefix: 'Wenn du fortfährst, stimmst du zu:',
        emailRequired: 'Gib deine E-Mail-Adresse ein.',
        passwordRequired: 'Gib dein Passwort ein.',
        signingInEmail: 'Anmeldung per E-Mail...',
        creatingAccount: 'Konto wird erstellt...',
        accountCreated: 'Konto erstellt. Du bist angemeldet.',
        accountCreatedVerifyEmail: 'Konto erstellt. Wir haben eine Bestätigungs-E-Mail gesendet. Bitte bestätige deine E-Mail und melde dich dann an.',
        emailVerificationRequired: 'Bitte bestätige deine E-Mail, bevor du dich anmeldest. Prüfe deinen Posteingang und versuche es erneut.',
        emailVerificationSent: 'Bestätigungs-E-Mail gesendet. Bitte bestätige deine E-Mail und melde dich erneut an.',
        emailVerificationSignInAgain: 'Bitte melde dich erneut an, um eine Bestätigungs-E-Mail zu senden.',
        passwordResetSent: 'E-Mail zum Zurücksetzen des Passworts gesendet.',
        passwordResetFailed: 'Passwort-Reset fehlgeschlagen: {message}',
        emailAlreadyExists: 'Für diese E-Mail existiert bereits ein Konto. Bitte anmelden.',
        emailSignInInvalid: 'E-Mail oder Passwort ist falsch.',
        emailWeakPassword: 'Das Passwort muss mindestens 6 Zeichen haben.',
        emailInvalid: 'Gib eine gültige E-Mail-Adresse ein.',
        emailPasswordDisabled: 'E-Mail/Passwort-Login ist in Firebase Authentication nicht aktiviert.',
        emailSignInFailed: 'E-Mail-Anmeldung fehlgeschlagen.',
        storyboardOverviewTitle: 'Storyboard',
        storyboardOverviewSubtitle: 'Vorschau der Bildszenen in der Queue vor der Generierung.',
        storyboardNoScenes: 'Noch keine Szenen in der Queue.',
        storyboardScene: 'Bild {count}',
        storyboardPrompt: 'Prompt',
        storyboardCharacters: 'Charaktere',
        storyboardReferences: 'Referenzbilder',
        storyboardNoImage: 'Kein Bild ausgewählt',
        storyboardImage: 'Bild',
        storyboardReferenceN: 'Referenz {count}'
    },
    fr: {
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        storyboard: 'Advanced Storyboard',
        welcomeBackTitle: 'Bon retour',
        welcomeBackSubtitle: 'Connectez-vous à votre compte',
        continueWithGoogle: 'Continuer avec Google',
        continueWithEmail: 'ou continuer avec l’e-mail',
        emailAddress: 'Adresse e-mail',
        password: 'Mot de passe',
        forgotPassword: 'Mot de passe oublié ?',
        signIn: 'Se connecter',
        createAccount: 'Créer un compte',
        dontHaveAccount: 'Pas encore de compte ?',
        alreadyHaveAccount: 'Vous avez déjà un compte ?',
        createAccountTitle: 'Créer un compte',
        createAccountSubtitle: 'Commencez avec votre e-mail',
        authTermsPrefix: 'En continuant, vous acceptez nos',
        emailRequired: 'Entrez votre adresse e-mail.',
        passwordRequired: 'Entrez votre mot de passe.',
        signingInEmail: 'Connexion par e-mail...',
        creatingAccount: 'Création du compte...',
        accountCreated: 'Compte créé. Vous êtes connecté.',
        accountCreatedVerifyEmail: 'Compte créé. Nous avons envoyé un e-mail de vérification. Vérifiez votre e-mail, puis connectez-vous.',
        emailVerificationRequired: 'Veuillez vérifier votre e-mail avant de vous connecter. Consultez votre boîte de réception, puis réessayez.',
        emailVerificationSent: 'E-mail de vérification envoyé. Vérifiez votre e-mail, puis reconnectez-vous.',
        emailVerificationSignInAgain: 'Veuillez vous reconnecter pour envoyer un e-mail de vérification.',
        passwordResetSent: 'E-mail de réinitialisation envoyé.',
        passwordResetFailed: 'Échec de la réinitialisation: {message}',
        emailAlreadyExists: 'Un compte existe déjà avec cet e-mail. Connectez-vous.',
        emailSignInInvalid: 'E-mail ou mot de passe incorrect.',
        emailWeakPassword: 'Le mot de passe doit contenir au moins 6 caractères.',
        emailInvalid: 'Entrez une adresse e-mail valide.',
        emailPasswordDisabled: 'La connexion e-mail/mot de passe n’est pas activée dans Firebase Authentication.',
        emailSignInFailed: 'Échec de la connexion par e-mail.',
        storyboardOverviewTitle: 'Storyboard',
        storyboardOverviewSubtitle: 'Prévisualisez les scènes image en file avant génération.',
        storyboardNoScenes: 'Aucune scène en file.',
        storyboardScene: 'Image {count}',
        storyboardPrompt: 'Prompt',
        storyboardCharacters: 'Personnages',
        storyboardReferences: 'Images de référence',
        storyboardNoImage: 'Aucune image sélectionnée',
        storyboardImage: 'Image',
        storyboardReferenceN: 'Référence {count}'
    },
    hi: {
        premiumFeatureUnlockedHeader: 'Premium Unlocked',
        perPromptAssetsUnlocked: 'Premium Unlocked',
        storyboard: 'Advanced Storyboard',
        welcomeBackTitle: 'वापसी पर स्वागत है',
        welcomeBackSubtitle: 'अपने खाते में साइन इन करें',
        continueWithGoogle: 'Google से जारी रखें',
        continueWithEmail: 'या ईमेल से जारी रखें',
        emailAddress: 'ईमेल पता',
        password: 'पासवर्ड',
        forgotPassword: 'पासवर्ड भूल गए?',
        signIn: 'साइन इन',
        createAccount: 'खाता बनाएँ',
        dontHaveAccount: 'खाता नहीं है?',
        alreadyHaveAccount: 'पहले से खाता है?',
        createAccountTitle: 'खाता बनाएँ',
        createAccountSubtitle: 'ईमेल से शुरू करें',
        authTermsPrefix: 'जारी रखने पर आप सहमत हैं',
        emailRequired: 'अपना ईमेल पता दर्ज करें।',
        passwordRequired: 'अपना पासवर्ड दर्ज करें।',
        signingInEmail: 'ईमेल से साइन इन हो रहा है...',
        creatingAccount: 'खाता बनाया जा रहा है...',
        accountCreated: 'खाता बन गया। आप साइन इन हैं।',
        accountCreatedVerifyEmail: 'खाता बन गया। हमने verification email भेजा है। Email verify करके फिर sign in करें।',
        emailVerificationRequired: 'Sign in करने से पहले email verify करें। Inbox check करके फिर कोशिश करें।',
        emailVerificationSent: 'Verification email भेजा गया। Email verify करके फिर sign in करें।',
        emailVerificationSignInAgain: 'Verification email भेजने के लिए फिर sign in करें।',
        passwordResetSent: 'पासवर्ड रीसेट ईमेल भेजा गया।',
        passwordResetFailed: 'पासवर्ड रीसेट विफल: {message}',
        emailAlreadyExists: 'इस ईमेल से खाता पहले से है। कृपया साइन इन करें।',
        emailSignInInvalid: 'ईमेल या पासवर्ड गलत है।',
        emailWeakPassword: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।',
        emailInvalid: 'मान्य ईमेल पता दर्ज करें।',
        emailPasswordDisabled: 'Firebase Authentication में ईमेल/पासवर्ड लॉगिन सक्षम नहीं है।',
        emailSignInFailed: 'ईमेल साइन इन विफल।',
        storyboardOverviewTitle: 'स्टोरीबोर्ड',
        storyboardOverviewSubtitle: 'जेनरेशन से पहले queue की image scenes देखें।',
        storyboardNoScenes: 'Queue में कोई scene नहीं है।',
        storyboardScene: 'इमेज {count}',
        storyboardPrompt: 'प्रॉम्प्ट',
        storyboardCharacters: 'कैरेक्टर',
        storyboardReferences: 'रेफरेंस इमेज',
        storyboardNoImage: 'कोई image selected नहीं',
        storyboardImage: 'इमेज',
        storyboardReferenceN: 'रेफरेंस {count}'
    }
};

for (const [lang, patch] of Object.entries(AUTH_STORYBOARD_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

const DOWNLOAD_PICKER_I18N_PATCH = {
    en: {
        bulkDownloaderNote: "Premium unlock is required to use Image Downloader. We don't use your login data; it is only used to verify login.",
        imageDownloaderFeatures: 'Includes Page Image Downloader + 2K Upscaled Auto Downloader for generated images.',
        ssoGate: 'Premium Feature - Unlock Required for Image Downloader',
        ssoFeaturePreview: 'Includes 2K Upscaled Auto Downloader',
        downloadToolsLocked: 'Premium Feature - Unlock Required for Image Downloader.',
        openImageDownloader: 'Open Image Downloader',
        downloadAllPageImages: 'Download All Page Images',
        downloadPickerTitle: 'Select Images',
        downloadPickerSubtitle: 'Choose images or videos, then download. 2K Upscaled applies to images only.',
        downloadPickerImagesOnly: 'Images and videos are supported. Videos download in original quality.',
        downloadPickerScanning: 'Scanning page images...',
        downloadPickerScanFailed: 'Could not scan page images.',
        downloadPickerNoImages: 'No page images found.',
        logViewerTitle: 'Logs',
        logViewerRefresh: 'Refresh',
        logViewerCopy: 'Copy',
        logViewerCopied: 'Logs copied to clipboard.',
        logViewerCopyFailed: 'Could not copy logs.',
        logViewerEmpty: 'No logs yet.',
        downloadPickerSelectedCount: '{selected}/{total} selected',
        downloadPickerPremiumTitle: 'Premium Feature - Unlock Required',
        selectAll: 'Select all',
        clearSelection: 'Clear',
        rescan: 'Rescan',
        downloadSelected: 'Download Selected',
        close: 'Close',
        errorPopupTitle: 'Action needed',
        errorPopupClose: 'OK',
        recoveryCooldownTitle: 'Waiting to restart',
        recoveryPostReloadTitle: 'Preparing to restart',
        recoveryCooldownLabel: 'Page refresh in',
        recoveryPostReloadLabel: 'Queue restart in',
        recoveryCancel: 'Cancel',
        recoveryCooldownMessage: 'Google Flow blocked three consecutive generations. No new requests will be sent during this 5-minute safety wait. Google recommends turning off any VPN or proxy.',
        recoveryPostReloadMessage: 'Flow was refreshed once. No new request will be sent until the 30-second preparation wait finishes.',
        recoveryCauseExplanation: 'This is a server-side unusual-activity restriction returned by Google Flow, not an internal app error. Request frequency, VPNs, proxies, or Google account activity can contribute to it.',
        recoveryGoogleHelpLink: 'Open the official Google Flow Help Center',
        recoveryOtherAccountTip: 'If it continues, signing out of the Google Flow page and signing in with another Google account may help. Use only an account you own and follow Google\'s terms.',
        recoveryCanceledMessage: 'Automatic recovery canceled. The failure counter was reset and the queue remains paused.'
    },
    ko: {
        bulkDownloaderNote: 'Image Downloader를 사용하려면 Premium unlock이 필요합니다. 로그인 데이터는 저장하지 않고 로그인 확인에만 사용합니다.',
        imageDownloaderFeatures: 'Page Image Downloader와 생성 이미지용 2K Upscaled Auto Downloader가 포함되어 있습니다.',
        ssoGate: 'Image Downloader는 Premium Feature - Unlock Required입니다',
        ssoFeaturePreview: '2K Upscaled Auto Downloader 포함',
        downloadToolsLocked: 'Image Downloader는 Premium Feature - Unlock Required입니다.',
        openImageDownloader: 'Image Downloader 열기',
        downloadAllPageImages: '페이지 이미지 전체 다운로드',
        downloadPickerTitle: '이미지 선택',
        downloadPickerSubtitle: '이미지 또는 비디오를 선택해 다운로드하세요. 2K 업스케일은 이미지에만 적용됩니다.',
        downloadPickerImagesOnly: '이미지와 비디오를 지원합니다. 비디오는 원본 화질로 다운로드됩니다.',
        downloadPickerScanning: '페이지 이미지를 스캔 중...',
        downloadPickerScanFailed: '페이지 이미지를 스캔하지 못했습니다.',
        downloadPickerNoImages: '페이지 이미지를 찾지 못했습니다.',
        logViewerTitle: '로그',
        logViewerRefresh: '새로고침',
        logViewerCopy: '복사',
        logViewerCopied: '로그를 클립보드에 복사했습니다.',
        logViewerCopyFailed: '로그를 복사하지 못했습니다.',
        logViewerEmpty: '로그가 없습니다.',
        downloadPickerSelectedCount: '{selected}/{total}개 선택됨',
        downloadPickerPremiumTitle: 'Premium Feature - Unlock Required',
        selectAll: '전체 선택',
        clearSelection: '선택 해제',
        rescan: '다시 스캔',
        downloadSelected: '선택 다운로드',
        close: '닫기',
        errorPopupTitle: '확인이 필요합니다',
        errorPopupClose: '확인',
        recoveryCooldownTitle: '재시작 대기 중',
        recoveryPostReloadTitle: '재시작 준비 중',
        recoveryCooldownLabel: '페이지 새로고침까지',
        recoveryPostReloadLabel: '큐 재시작까지',
        recoveryCancel: '취소',
        recoveryCooldownMessage: 'Google Flow에서 생성이 3회 연속 차단되었습니다. 5분의 안전 대기 동안 새 요청을 보내지 않습니다. Google은 VPN 또는 프록시를 끄도록 안내합니다.',
        recoveryPostReloadMessage: 'Flow 페이지를 한 번 새로고침했습니다. 30초 준비 시간이 끝날 때까지 새 요청을 보내지 않습니다.',
        recoveryCauseExplanation: '이 메시지는 앱 내부 오류가 아니라 Google Flow 서버가 반환한 unusual activity 이용 제한입니다. 요청 빈도, VPN·프록시 또는 Google 계정 활동이 영향을 줄 수 있습니다.',
        recoveryGoogleHelpLink: 'Google Flow 공식 도움말 열기',
        recoveryOtherAccountTip: '문제가 계속되면 Google Flow 페이지에서 로그아웃한 뒤 본인이 소유한 다른 Google 계정으로 로그인하는 것도 방법입니다. Google 이용약관을 준수해 주세요.',
        recoveryCanceledMessage: '자동 복구를 취소했습니다. 실패 횟수는 초기화했고 큐는 일시정지 상태로 유지합니다.'
    },
    ja: {
        bulkDownloaderNote: 'Image Downloader を使用するには Premium unlock が必要です。ログインデータは保存せず、ログイン確認にのみ使用します。',
        imageDownloaderFeatures: 'Page Image Downloader と生成画像用 2K Upscaled Auto Downloader を含みます。',
        ssoGate: 'Image Downloader は Premium Feature - Unlock Required です',
        ssoFeaturePreview: '2K Upscaled Auto Downloader を含みます',
        downloadToolsLocked: 'Image Downloader は Premium Feature - Unlock Required です。',
        openImageDownloader: 'Image Downloader を開く',
        downloadAllPageImages: 'ページ画像をすべてダウンロード',
        downloadPickerTitle: '画像を選択',
        downloadPickerSubtitle: '画像または動画を選択してダウンロードします。2K Upscaled は画像のみに適用されます。',
        downloadPickerImagesOnly: '画像と動画に対応しています。動画は元の品質でダウンロードされます。',
        downloadPickerScanning: 'ページ画像をスキャン中...',
        downloadPickerScanFailed: 'ページ画像をスキャンできませんでした。',
        downloadPickerNoImages: 'ページ画像が見つかりません。',
        downloadPickerSelectedCount: '{selected}/{total} 選択済み',
        downloadPickerPremiumTitle: 'Premium Feature - Unlock Required',
        selectAll: 'すべて選択',
        clearSelection: 'クリア',
        rescan: '再スキャン',
        downloadSelected: '選択をダウンロード',
        close: '閉じる',
        errorPopupTitle: '確認が必要です',
        errorPopupClose: 'OK'
    },
    zh: {
        bulkDownloaderNote: '使用 Image Downloader 需要解锁 Premium。我们不会保存你的登录数据，只用于验证登录。',
        imageDownloaderFeatures: '包含 Page Image Downloader 和生成图片的 2K Upscaled Auto Downloader。',
        ssoGate: 'Image Downloader 需要 Premium 解锁',
        ssoFeaturePreview: '包含 2K Upscaled Auto Downloader',
        downloadToolsLocked: 'Image Downloader 需要 Premium 解锁。',
        openImageDownloader: '打开 Image Downloader',
        downloadAllPageImages: '下载全部页面图片',
        downloadPickerTitle: '选择图片',
        downloadPickerSubtitle: '选择图片或视频下载。2K 放大仅适用于图片。',
        downloadPickerImagesOnly: '支持图片和视频。视频将以原始质量下载。',
        downloadPickerScanning: '正在扫描页面图片...',
        downloadPickerScanFailed: '无法扫描页面图片。',
        downloadPickerNoImages: '未找到页面图片。',
        downloadPickerSelectedCount: '已选择 {selected}/{total}',
        downloadPickerPremiumTitle: 'Premium Feature - Unlock Required',
        selectAll: '全选',
        clearSelection: '清除',
        rescan: '重新扫描',
        downloadSelected: '下载所选',
        close: '关闭',
        errorPopupTitle: '需要确认',
        errorPopupClose: '确定'
    },
    de: {
        bulkDownloaderNote: 'Für Image Downloader ist Premium-Freischaltung erforderlich. Login-Daten werden nicht gespeichert, sondern nur zur Verifizierung genutzt.',
        imageDownloaderFeatures: 'Enthält Page Image Downloader und 2K Upscaled Auto Downloader für generierte Bilder.',
        ssoGate: 'Image Downloader erfordert Premium-Freischaltung',
        ssoFeaturePreview: 'Enthält 2K Upscaled Auto Downloader',
        downloadToolsLocked: 'Image Downloader erfordert Premium-Freischaltung.',
        openImageDownloader: 'Image Downloader öffnen',
        downloadAllPageImages: 'Alle Seitenbilder herunterladen',
        downloadPickerTitle: 'Bilder auswählen',
        downloadPickerSubtitle: 'Wähle Bilder oder Videos zum Download aus. 2K Upscaled gilt nur für Bilder.',
        downloadPickerImagesOnly: 'Bilder und Videos werden unterstützt. Videos werden in Originalqualität heruntergeladen.',
        downloadPickerScanning: 'Seitenbilder werden gescannt...',
        downloadPickerScanFailed: 'Seitenbilder konnten nicht gescannt werden.',
        downloadPickerNoImages: 'Keine Seitenbilder gefunden.',
        downloadPickerSelectedCount: '{selected}/{total} ausgewählt',
        downloadPickerPremiumTitle: 'Premium Feature - Unlock Required',
        selectAll: 'Alle auswählen',
        clearSelection: 'Leeren',
        rescan: 'Erneut scannen',
        downloadSelected: 'Auswahl herunterladen',
        close: 'Schließen',
        errorPopupTitle: 'Aktion erforderlich',
        errorPopupClose: 'OK'
    },
    fr: {
        bulkDownloaderNote: 'Le déverrouillage Premium est requis pour utiliser Image Downloader. Les données de connexion ne sont pas stockées et servent uniquement à vérifier la connexion.',
        imageDownloaderFeatures: 'Inclut Page Image Downloader et 2K Upscaled Auto Downloader pour les images générées.',
        ssoGate: 'Image Downloader nécessite le déverrouillage Premium',
        ssoFeaturePreview: 'Inclut 2K Upscaled Auto Downloader',
        downloadToolsLocked: 'Image Downloader nécessite le déverrouillage Premium.',
        openImageDownloader: 'Ouvrir Image Downloader',
        downloadAllPageImages: 'Télécharger toutes les images',
        downloadPickerTitle: 'Sélectionner les images',
        downloadPickerSubtitle: 'Choisissez des images ou vidéos à télécharger. 2K Upscaled s’applique uniquement aux images.',
        downloadPickerImagesOnly: 'Images et vidéos prises en charge. Les vidéos sont téléchargées en qualité originale.',
        downloadPickerScanning: 'Analyse des images de la page...',
        downloadPickerScanFailed: 'Impossible d’analyser les images de la page.',
        downloadPickerNoImages: 'Aucune image trouvée.',
        downloadPickerSelectedCount: '{selected}/{total} sélectionnées',
        downloadPickerPremiumTitle: 'Premium Feature - Unlock Required',
        selectAll: 'Tout sélectionner',
        clearSelection: 'Effacer',
        rescan: 'Réanalyser',
        downloadSelected: 'Télécharger la sélection',
        close: 'Fermer',
        errorPopupTitle: 'Action requise',
        errorPopupClose: 'OK'
    },
    hi: {
        bulkDownloaderNote: 'Image Downloader इस्तेमाल करने के लिए Premium unlock चाहिए। आपका login data सेव नहीं किया जाता; यह केवल login verification के लिए है।',
        imageDownloaderFeatures: 'Generated images के लिए Page Image Downloader और 2K Upscaled Auto Downloader शामिल हैं।',
        ssoGate: 'Image Downloader के लिए Premium Feature - Unlock Required',
        ssoFeaturePreview: '2K Upscaled Auto Downloader शामिल है',
        downloadToolsLocked: 'Image Downloader के लिए Premium Feature - Unlock Required.',
        openImageDownloader: 'Image Downloader खोलें',
        downloadAllPageImages: 'सभी page images डाउनलोड करें',
        downloadPickerTitle: 'Images चुनें',
        downloadPickerSubtitle: 'Images या videos चुनें, फिर डाउनलोड करें। 2K Upscaled केवल images पर लागू होता है।',
        downloadPickerImagesOnly: 'Images और videos supported हैं। Videos original quality में डाउनलोड होंगे।',
        downloadPickerScanning: 'Page images scan हो रही हैं...',
        downloadPickerScanFailed: 'Page images scan नहीं हो सकीं।',
        downloadPickerNoImages: 'कोई page image नहीं मिली।',
        downloadPickerSelectedCount: '{selected}/{total} selected',
        downloadPickerPremiumTitle: 'Premium Feature - Unlock Required',
        selectAll: 'सब चुनें',
        clearSelection: 'Clear',
        rescan: 'Rescan',
        downloadSelected: 'Selected डाउनलोड करें',
        close: 'बंद करें',
        errorPopupTitle: 'Action needed',
        errorPopupClose: 'OK'
    }
};

for (const [lang, patch] of Object.entries(DOWNLOAD_PICKER_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

// Friendly auth error messages (spam hint) + missing trial translations for all languages.
// Applied last so these override any earlier values.
const FRIENDLY_AUTH_TRIAL_I18N_PATCH = {
    en: {
        accountCreatedVerifyEmail: 'Account created! We sent you a verification email. Check your inbox — or spam/junk folder — then sign in.',
        emailVerificationRequired: 'Please verify your email before signing in. Check your inbox or spam/junk folder, then try again.',
        emailVerificationSent: 'Verification email sent. Check your inbox or spam/junk folder, then sign in again.',
        passwordResetSent: 'Password reset email sent. Check your inbox or spam/junk folder if you don\'t see it.',
        emailSignInInvalid: 'Email or password is incorrect. Use "Forgot Password?" if needed.',
        signedInFirestoreFailed: 'Signed in! If features are not visible yet, reload the extension.'
    },
    ko: {
        accountCreatedVerifyEmail: '계정이 생성되었습니다. 인증 이메일을 보냈습니다. 받은 편지함 또는 스팸/정크 메일함을 확인한 뒤 로그인하세요.',
        emailVerificationRequired: '로그인 전에 이메일 인증이 필요합니다. 받은 편지함 또는 스팸/정크 메일함을 확인한 뒤 다시 시도하세요.',
        emailVerificationSent: '인증 이메일을 보냈습니다. 받은 편지함 또는 스팸/정크 메일함을 확인한 뒤 다시 로그인하세요.',
        passwordResetSent: '비밀번호 재설정 이메일을 보냈습니다. 받은 편지함 또는 스팸/정크 메일함을 확인하세요.',
        emailSignInInvalid: '이메일 또는 비밀번호가 올바르지 않습니다. 필요하시면 "비밀번호를 잊으셨나요?"를 이용하세요.',
        signedInFirestoreFailed: '로그인 완료! 기능이 보이지 않으면 확장 프로그램을 다시 로드하세요.'
    },
    ja: {
        accountCreatedVerifyEmail: 'アカウントを作成しました。確認メールを送信しました。受信箱または迷惑メールフォルダを確認してからサインインしてください。',
        emailVerificationRequired: 'サインイン前にメール確認が必要です。受信箱または迷惑メールフォルダを確認してから再度お試しください。',
        emailVerificationSent: '確認メールを送信しました。受信箱または迷惑メールフォルダを確認してから再度サインインしてください。',
        passwordResetSent: 'パスワード再設定メールを送信しました。受信箱または迷惑メールフォルダをご確認ください。',
        emailSignInInvalid: 'メールまたはパスワードが正しくありません。「パスワードをお忘れですか？」をご利用ください。',
        signedInFirestoreFailed: 'サインイン完了！機能が表示されない場合は拡張機能を再読み込みしてください。',
        tryPremiumTrial: 'Premium トライアルを開始',
        confirmTrialActivation: 'Premium トライアルを開始しますか？{date} までプレミアム機能が全て解放されます。',
        requestPremiumAccess: 'Premium アクセスを申請',
        trialExpiredLabel: 'トライアル終了',
        premiumTrialActivated: 'Premium トライアルが有効になりました。{date} まで Premium 機能をご利用いただけます。',
        premiumTrialActivationFailed: 'Premium トライアルの有効化に失敗しました: {message}',
        trialExpiredDisabled: 'トライアル期間が終了しました。',
        trialExpiredUpgrade: 'トライアルが終了しました。継続するにはアップグレードしてください。',
        trialEndsAt: 'トライアル終了: {date}',
        trialUnlimitedUntil: '{date} まで無制限',
        starterQuotaReached: 'Starter の1日のプロンプト制限に達しました（{limit}回/日）。',
        profileTrialAccess: 'トライアル利用',
        settingsAccount: 'アカウント',
        premiumFormNotConfigured: 'Google フォームの URL がまだ設定されていません。',
        flowWindowTooNarrow: 'ブラウザウィンドウが狭すぎます。Google Flow ウィンドウを少なくとも {width}px に広げてから再度お試しください。'
    },
    zh: {
        accountCreatedVerifyEmail: '账号已创建！我们已发送验证邮件。请检查收件箱或垃圾邮件文件夹，验证后再登录。',
        emailVerificationRequired: '登录前请先验证邮箱。检查收件箱或垃圾邮件文件夹，然后重试。',
        emailVerificationSent: '验证邮件已发送。检查收件箱或垃圾邮件文件夹，然后重新登录。',
        passwordResetSent: '密码重置邮件已发送。如未收到，请检查垃圾邮件文件夹。',
        emailSignInInvalid: '邮箱或密码不正确。如有需要，请使用"忘记密码？"。',
        signedInFirestoreFailed: '登录成功！如果功能未显示，请重新加载扩展程序。',
        tryPremiumTrial: '免费试用 Premium 3 天',
        confirmTrialActivation: '开始 3 天 Premium 试用？所有高级功能将解锁至 {date}。',
        requestPremiumAccess: '申请 Premium 访问',
        trialExpiredLabel: '试用已过期',
        premiumTrialActivated: 'Premium 试用已激活。Premium 功能可用至 {date}。',
        premiumTrialActivationFailed: 'Premium 试用激活失败：{message}',
        trialExpiredDisabled: '试用期已结束。',
        trialExpiredUpgrade: '试用已过期，请升级以继续使用。',
        trialEndsAt: '试用结束：{date}',
        trialUnlimitedUntil: '{date} 前无限制',
        starterQuotaReached: 'Starter 每日提示词限额已用完（{limit} 次/天）。',
        profileTrialAccess: '试用权限',
        settingsAccount: '账号',
        premiumFormNotConfigured: 'Google 表单 URL 尚未配置。',
        flowWindowTooNarrow: '浏览器窗口太窄。请将 Google Flow 窗口至少拓宽至 {width}px，然后重试。'
    },
    de: {
        accountCreatedVerifyEmail: 'Konto erstellt! Wir haben dir eine Bestätigungs-E-Mail gesendet. Prüfe deinen Posteingang oder Spam-/Junk-Ordner und melde dich dann an.',
        emailVerificationRequired: 'Bitte bestätige deine E-Mail, bevor du dich anmeldest. Prüfe deinen Posteingang oder Spam-/Junk-Ordner und versuche es erneut.',
        emailVerificationSent: 'Bestätigungs-E-Mail gesendet. Prüfe deinen Posteingang oder Spam-/Junk-Ordner und melde dich dann erneut an.',
        passwordResetSent: 'E-Mail zum Zurücksetzen des Passworts gesendet. Prüfe deinen Spam-/Junk-Ordner, falls du sie nicht siehst.',
        emailSignInInvalid: 'E-Mail oder Passwort ist falsch. Nutze „Passwort vergessen?", falls nötig.',
        signedInFirestoreFailed: 'Angemeldet! Falls Funktionen nicht erscheinen, bitte die Erweiterung neu laden.',
        tryPremiumTrial: 'Premium-Testphase starten',
        confirmTrialActivation: '3-tägigen Premium-Testzugang starten? Alle Premium-Funktionen werden bis {date} freigeschaltet.',
        requestPremiumAccess: 'Premium-Zugang beantragen',
        trialExpiredLabel: 'Testphase abgelaufen',
        premiumTrialActivated: 'Premium-Testphase aktiviert. Premium-Zugang ist bis {date} verfügbar.',
        premiumTrialActivationFailed: 'Aktivierung der Premium-Testphase fehlgeschlagen: {message}',
        trialExpiredDisabled: 'Die Testphase ist abgelaufen.',
        trialExpiredUpgrade: 'Die Testphase ist abgelaufen. Bitte upgraden, um fortzufahren.',
        trialEndsAt: 'Testphase endet: {date}',
        trialUnlimitedUntil: 'Unbegrenzt bis {date}',
        starterQuotaReached: 'Starter-Tageslimit für Prompts erreicht ({limit} Prompts/Tag).',
        profileTrialAccess: 'Testzugang',
        settingsAccount: 'Konto',
        premiumFormNotConfigured: 'Google-Formular-URL ist noch nicht konfiguriert.',
        flowWindowTooNarrow: 'Das Browser-Fenster ist zu schmal. Bitte das Google Flow-Fenster auf mindestens {width}px verbreitern und es erneut versuchen.'
    },
    fr: {
        accountCreatedVerifyEmail: 'Compte créé ! Nous vous avons envoyé un e-mail de vérification. Consultez votre boîte de réception ou dossier spam/indésirables, puis connectez-vous.',
        emailVerificationRequired: 'Veuillez vérifier votre e-mail avant de vous connecter. Consultez votre boîte de réception ou dossier spam/indésirables, puis réessayez.',
        emailVerificationSent: 'E-mail de vérification envoyé. Consultez votre boîte de réception ou dossier spam/indésirables, puis reconnectez-vous.',
        passwordResetSent: 'E-mail de réinitialisation envoyé. Vérifiez votre dossier spam/indésirables si vous ne le voyez pas.',
        emailSignInInvalid: 'E-mail ou mot de passe incorrect. Utilisez « Mot de passe oublié ? » si nécessaire.',
        signedInFirestoreFailed: 'Connecté ! Si les fonctionnalités ne s\'affichent pas, rechargez l\'extension.',
        tryPremiumTrial: 'Démarrer l\'essai Premium',
        confirmTrialActivation: 'Démarrer l\'essai Premium ? Toutes les fonctionnalités premium seront débloquées jusqu\'au {date}.',
        requestPremiumAccess: 'Demander un accès premium',
        trialExpiredLabel: 'Essai expiré',
        premiumTrialActivated: 'Essai Premium activé. L\'accès premium est disponible jusqu\'au {date}.',
        premiumTrialActivationFailed: 'Échec de l\'activation de l\'essai Premium : {message}',
        trialExpiredDisabled: 'Votre essai a expiré.',
        trialExpiredUpgrade: 'Votre essai a expiré. Passez à une offre supérieure pour continuer.',
        trialEndsAt: 'Essai se termine le {date}',
        trialUnlimitedUntil: 'Illimité jusqu\'au {date}',
        starterQuotaReached: 'Limite quotidienne de prompts Starter atteinte ({limit} prompts/jour).',
        profileTrialAccess: 'Accès essai',
        settingsAccount: 'Compte',
        premiumFormNotConfigured: 'L\'URL du formulaire Google n\'est pas encore configurée.',
        flowWindowTooNarrow: 'La fenêtre du navigateur est trop étroite. Veuillez élargir la fenêtre Google Flow à au moins {width}px, puis réessayez.'
    },
    hi: {
        accountCreatedVerifyEmail: 'Account बन गया! हमने verification email भेजा है। अपना inbox या spam/junk folder देखें, फिर sign in करें।',
        emailVerificationRequired: 'Sign in करने से पहले email verify करें। Inbox या spam/junk folder देखें, फिर कोशिश करें।',
        emailVerificationSent: 'Verification email भेजा गया। Inbox या spam/junk folder देखें, फिर sign in करें।',
        passwordResetSent: 'Password reset email भेजा गया। अगर नहीं मिला तो spam/junk folder देखें।',
        emailSignInInvalid: 'Email या password गलत है। ज़रूरत हो तो "Forgot Password?" इस्तेमाल करें।',
        signedInFirestoreFailed: 'Sign in हो गया! अगर features दिख नहीं रहे तो extension reload करें।',
        tryPremiumTrial: '3 दिन के लिए Premium आज़माएँ',
        confirmTrialActivation: '3-दिन का Premium trial शुरू करें? {date} तक सभी premium features unlock हो जाएंगे।',
        requestPremiumAccess: 'Premium access के लिए request करें',
        trialExpiredLabel: 'Trial समाप्त',
        premiumTrialActivated: 'Premium Trial activate हो गया। {date} तक Premium access उपलब्ध है।',
        premiumTrialActivationFailed: 'Premium Trial activate करने में विफल: {message}',
        trialExpiredDisabled: 'आपका trial समाप्त हो गया है।',
        trialExpiredUpgrade: 'Trial समाप्त हो गया। जारी रखने के लिए upgrade करें।',
        trialEndsAt: 'Trial {date} को समाप्त होगा',
        trialUnlimitedUntil: '{date} तक unlimited',
        starterQuotaReached: 'Starter की daily prompt limit पूरी हो गई ({limit} prompts/day)।',
        profileTrialAccess: 'Trial access',
        settingsAccount: 'Account',
        premiumFormNotConfigured: 'Google Form URL अभी configure नहीं है।',
        flowWindowTooNarrow: 'Browser window बहुत संकरी है। Google Flow window को कम से कम {width}px चौड़ा करें, फिर try करें।'
    }
};

for (const [lang, patch] of Object.entries(FRIENDLY_AUTH_TRIAL_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

// Full translations (all supported languages) for strings added this session
// that previously only had en/ko — professional trial, log viewer, and the
// professional-tier lock badge.
const PROFESSIONAL_TRIAL_AND_LOGVIEWER_I18N_PATCH = {
    en: {
        logViewerTitle: 'Logs',
        logViewerRefresh: 'Refresh',
        logViewerCopy: 'Copy',
        logViewerCopied: 'Logs copied to clipboard.',
        logViewerCopyFailed: 'Could not copy logs.',
        logViewerEmpty: 'No logs yet.',
        tryProfessionalTrial: 'Try Professional for 24 Hours',
        confirmProfessionalTrialActivation: 'Start your Professional (Supporter) trial? Access is available until {date}.',
        professionalTrialActivated: 'Professional Trial activated. Access is available until {date}.',
        professionalTrialActivationFailed: 'Professional Trial activation failed: {message}',
        professionalTrialUnavailable: 'Professional Trial is not available for this account.',
        professionalFeatureLocked: 'Professional Only',
        darkModeProfessionalOnly: 'Dark Mode is a Professional-only feature.',
        professionalFeatureUnlockedHeader: 'Professional Unlocked'
    },
    ko: {
        logViewerTitle: '로그',
        logViewerRefresh: '새로고침',
        logViewerCopy: '복사',
        logViewerCopied: '로그를 클립보드에 복사했습니다.',
        logViewerCopyFailed: '로그를 복사하지 못했습니다.',
        logViewerEmpty: '로그가 없습니다.',
        tryProfessionalTrial: 'Professional 체험하기',
        confirmProfessionalTrialActivation: 'Professional(서포터) 체험을 시작하시겠습니까? {date}까지 사용할 수 있습니다.',
        professionalTrialActivated: 'Professional Trial이 활성화되었습니다. {date}까지 사용할 수 있습니다.',
        professionalTrialActivationFailed: 'Professional Trial 활성화 실패: {message}',
        professionalTrialUnavailable: '이 계정은 Professional Trial을 사용할 수 없습니다.',
        professionalFeatureLocked: 'Professional Only',
        darkModeProfessionalOnly: '다크 모드는 Professional 전용 기능입니다.',
        professionalFeatureUnlockedHeader: 'Professional 잠금 해제됨'
    },
    ja: {
        logViewerTitle: 'ログ',
        logViewerRefresh: '更新',
        logViewerCopy: 'コピー',
        logViewerCopied: 'ログをクリップボードにコピーしました。',
        logViewerCopyFailed: 'ログをコピーできませんでした。',
        logViewerEmpty: 'ログはまだありません。',
        tryProfessionalTrial: 'Professional トライアルを開始',
        confirmProfessionalTrialActivation: 'Professional（サポーター）トライアルを開始しますか？{date} までご利用いただけます。',
        professionalTrialActivated: 'Professional トライアルが有効になりました。{date} までご利用いただけます。',
        professionalTrialActivationFailed: 'Professional トライアルの有効化に失敗しました: {message}',
        professionalTrialUnavailable: 'このアカウントでは Professional トライアルを利用できません。',
        professionalFeatureLocked: 'Professional Only',
        darkModeProfessionalOnly: 'ダークモードは Professional 専用機能です。',
        professionalFeatureUnlockedHeader: 'Professional アンロック済み'
    },
    zh: {
        logViewerTitle: '日志',
        logViewerRefresh: '刷新',
        logViewerCopy: '复制',
        logViewerCopied: '日志已复制到剪贴板。',
        logViewerCopyFailed: '无法复制日志。',
        logViewerEmpty: '暂无日志。',
        tryProfessionalTrial: '开始 Professional 试用',
        confirmProfessionalTrialActivation: '开始 Professional（支持者）试用？可使用至 {date}。',
        professionalTrialActivated: 'Professional 试用已激活。可使用至 {date}。',
        professionalTrialActivationFailed: 'Professional 试用激活失败：{message}',
        professionalTrialUnavailable: '此账户无法使用 Professional 试用。',
        professionalFeatureLocked: 'Professional Only',
        darkModeProfessionalOnly: '深色模式仅限 Professional 用户使用。',
        professionalFeatureUnlockedHeader: 'Professional 已解锁'
    },
    de: {
        logViewerTitle: 'Protokolle',
        logViewerRefresh: 'Aktualisieren',
        logViewerCopy: 'Kopieren',
        logViewerCopied: 'Protokolle in die Zwischenablage kopiert.',
        logViewerCopyFailed: 'Protokolle konnten nicht kopiert werden.',
        logViewerEmpty: 'Noch keine Protokolle.',
        tryProfessionalTrial: 'Professional-Testphase starten',
        confirmProfessionalTrialActivation: '24-stündige Professional-(Supporter-)Testphase starten? Zugang ist bis {date} verfügbar.',
        professionalTrialActivated: 'Professional-Testphase aktiviert. Zugang ist bis {date} verfügbar.',
        professionalTrialActivationFailed: 'Aktivierung der Professional-Testphase fehlgeschlagen: {message}',
        professionalTrialUnavailable: 'Die Professional-Testphase ist für dieses Konto nicht verfügbar.',
        professionalFeatureLocked: 'Professional Only',
        darkModeProfessionalOnly: 'Der Dunkelmodus ist eine Professional-exklusive Funktion.',
        professionalFeatureUnlockedHeader: 'Professional freigeschaltet'
    },
    fr: {
        logViewerTitle: 'Journaux',
        logViewerRefresh: 'Actualiser',
        logViewerCopy: 'Copier',
        logViewerCopied: 'Journaux copiés dans le presse-papiers.',
        logViewerCopyFailed: 'Impossible de copier les journaux.',
        logViewerEmpty: 'Aucun journal pour le moment.',
        tryProfessionalTrial: "Démarrer l'essai Professional",
        confirmProfessionalTrialActivation: "Démarrer votre essai Professional (Supporter) ? L'accès est disponible jusqu'au {date}.",
        professionalTrialActivated: "Essai Professional activé. L'accès est disponible jusqu'au {date}.",
        professionalTrialActivationFailed: "Échec de l'activation de l'essai Professional : {message}",
        professionalTrialUnavailable: "L'essai Professional n'est pas disponible pour ce compte.",
        professionalFeatureLocked: 'Professional Only',
        darkModeProfessionalOnly: 'Le mode sombre est une fonctionnalité réservée à Professional.',
        professionalFeatureUnlockedHeader: 'Professional débloqué'
    },
    hi: {
        logViewerTitle: 'लॉग',
        logViewerRefresh: 'रीफ़्रेश करें',
        logViewerCopy: 'कॉपी करें',
        logViewerCopied: 'लॉग क्लिपबोर्ड में कॉपी किए गए।',
        logViewerCopyFailed: 'लॉग कॉपी नहीं हो सके।',
        logViewerEmpty: 'अभी तक कोई लॉग नहीं।',
        tryProfessionalTrial: '24-घंटे का Professional Trial शुरू करें',
        confirmProfessionalTrialActivation: 'अपना 24-घंटे का Professional (Supporter) trial शुरू करें? {date} तक access उपलब्ध रहेगा।',
        professionalTrialActivated: 'Professional Trial activate हो गया। {date} तक access उपलब्ध है।',
        professionalTrialActivationFailed: 'Professional Trial activate करने में विफल: {message}',
        professionalTrialUnavailable: 'इस account के लिए Professional Trial उपलब्ध नहीं है।',
        professionalFeatureLocked: 'Professional Only',
        darkModeProfessionalOnly: 'Dark Mode केवल Professional के लिए उपलब्ध है।',
        professionalFeatureUnlockedHeader: 'Professional Unlocked'
    }
};

for (const [lang, patch] of Object.entries(PROFESSIONAL_TRIAL_AND_LOGVIEWER_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

// EN + KO only; other languages fall back to English via t()'s I18N.en lookup.
const RANDOMIZED_DELAY_I18N_PATCH = {
    en: {
        randomizedDelay: 'Randomized Delay',
        randomizedDelayNote: "Waits between prompts, plus a Random Delay added on top of that (0-30s default) so requests don't look perfectly automated. Also pauses every 20 prompts for a random 4-5 minutes. Premium and below always use these safe defaults. Professional can unlock and customize the values below.",
        randomizedDelayJitter: '+Random Delay (seconds)',
        randomizedDelayBreakEvery: 'Break every (prompts)',
        randomizedDelayBreakMin: 'Break min (minutes)',
        randomizedDelayBreakMax: 'Break max (minutes)',
        randomizedDelayProfessionalOnly: 'Professional Only — upgrade to customize these values.'
    },
    ko: {
        randomizedDelay: '랜덤 지연',
        randomizedDelayNote: '프롬프트 사이에 지연 시간만큼 대기하고, 그 위에 +Random Delay(기본 0-30초)를 추가로 더해 요청이 자동화된 것처럼 보이지 않게 합니다. 20개마다 4-5분 랜덤 휴식도 들어갑니다. 프리미엄 이하는 항상 이 안전한 기본값을 사용합니다. 프로페셔널은 아래 값을 직접 설정할 수 있습니다.',
        randomizedDelayJitter: '+Random Delay (초)',
        randomizedDelayBreakEvery: '휴식 주기 (프롬프트 수)',
        randomizedDelayBreakMin: '최소 휴식 (분)',
        randomizedDelayBreakMax: '최대 휴식 (분)',
        randomizedDelayProfessionalOnly: 'Professional 전용 — 값을 변경하려면 업그레이드하세요.'
    }
};

for (const [lang, patch] of Object.entries(RANDOMIZED_DELAY_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

const ANALYTICS_I18N_PATCH = {
    en: {
        detailedAnalytics: 'Share detailed analytics',
        detailedAnalyticsNote: 'Panel open and first Run are measured once per day with membership type. Turn this on to additionally share approximate country, device, app version, and privacy-safe diagnostics.'
    },
    ko: {
        detailedAnalytics: '상세 분석 공유',
        detailedAnalyticsNote: '패널 열기와 첫 Run은 멤버십 종류와 함께 하루 한 번씩 집계됩니다. 이 옵션을 켜면 대략적인 국가, 기기, 앱 버전 및 개인정보가 제거된 진단 정보가 추가로 전송됩니다.'
    }
};

for (const lang of Object.keys(I18N)) {
    I18N[lang] = {
        ...I18N[lang],
        detailedAnalytics: ANALYTICS_I18N_PATCH[lang]?.detailedAnalytics
            || ANALYTICS_I18N_PATCH.en.detailedAnalytics,
        detailedAnalyticsNote: ANALYTICS_I18N_PATCH[lang]?.detailedAnalyticsNote
            || ANALYTICS_I18N_PATCH.en.detailedAnalyticsNote
    };
}

// EN + KO only; other languages fall back to English via t()'s I18N.en lookup.
const STARTER_QUOTA_DISPLAY_I18N_PATCH = {
    en: {
        starterUsageBody: '{count}/{limit} prompts used today',
        starterQuotaValue: '{count}/{limit} today',
        starterQuotaResetHoursMinutes: 'Resets in {hours}h {minutes}m',
        starterQuotaResetHours: 'Resets in {hours}h',
        starterQuotaResetMinutes: 'Resets in {minutes}m',
        starterQuotaResetting: 'Resetting…'
    },
    ko: {
        starterUsageBody: '오늘 {count}/{limit} 프롬프트 사용함',
        starterQuotaValue: '오늘 {count}/{limit}',
        starterQuotaResetHoursMinutes: '{hours}시간 {minutes}분 후 리셋',
        starterQuotaResetHours: '{hours}시간 후 리셋',
        starterQuotaResetMinutes: '{minutes}분 후 리셋',
        starterQuotaResetting: '리셋 중…'
    }
};

for (const [lang, patch] of Object.entries(STARTER_QUOTA_DISPLAY_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

const FLOW_ACCOUNT_DIAGNOSTIC_I18N_PATCH = {
    en: {
        flowAccountDiagnostic: 'Google account compatibility',
        flowAccountDiagnosticNote: 'Compares the Chrome profile account with the account currently open in Google Flow. This is diagnostic only and never changes access.',
        flowAccountDiagnosticButton: 'Check accounts'
    },
    ko: {
        flowAccountDiagnostic: 'Google 계정 호환성',
        flowAccountDiagnosticNote: 'Chrome 프로필 계정과 현재 Google Flow 계정을 비교합니다. 진단 참고용이며 이용 권한에는 영향을 주지 않습니다.',
        flowAccountDiagnosticButton: '계정 확인'
    }
};

for (const [lang, patch] of Object.entries(FLOW_ACCOUNT_DIAGNOSTIC_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

const ACCESS_DENIED_I18N_PATCH = {
    en: {
        accessDeniedTitle: 'NOT ALLOWED',
        moveStarterAccessHere: 'Move Starter access here',
        moveStarterAccessConfirm: 'Move Starter access to this browser? The previously registered Starter account will no longer be able to use Starter on this browser.',
        moveStarterAccessSuccess: 'Starter access moved to this browser.',
        moveStarterAccessFailed: 'Starter access could not be moved.',
        upgradeToPremium: 'Upgrade to Premium',
        useDifferentAccount: 'Use a different account'
    },
    ko: {
        accessDeniedTitle: '접속할 수 없음',
        moveStarterAccessHere: 'Starter 권한을 여기로 이동',
        moveStarterAccessConfirm: 'Starter 권한을 이 브라우저로 옮기시겠습니까? 이전에 등록된 Starter 계정은 이 브라우저에서 더 이상 Starter를 사용할 수 없습니다.',
        moveStarterAccessSuccess: 'Starter 권한을 이 브라우저로 옮겼습니다.',
        moveStarterAccessFailed: 'Starter 권한을 옮기지 못했습니다.',
        upgradeToPremium: 'Premium으로 업그레이드',
        useDifferentAccount: '다른 계정 사용'
    }
};

for (const [lang, patch] of Object.entries(ACCESS_DENIED_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

// Complete language coverage for strings added after the original translation
// tables. Existing human translations stay intact; this patch fills missing,
// English-copy and placeholder-incompatible entries only.
const COMPLETE_LANGUAGE_COVERAGE_I18N_PATCH = {
    "ko": {
        "premiumFeature": "프리미엄 기능",
        "premiumFeatureUnlockedHeader": "프리미엄 잠금 해제",
        "storyboard": "고급 스토리보드",
        "trialExpiredDisabled": "평가판이 만료되었습니다.",
        "trialExpiredUpgrade": "평가판이 만료되었습니다. 계속하려면 업그레이드하세요.",
        "starterQuotaReached": "스타터 일일 프롬프트 한도에 도달했습니다({limit} 프롬프트/일).",
        "starterQuotaNotEnough": "Starter에는 오늘 {limit} 중 {remaining} 프롬프트가 남아 있습니다. 대기열을 줄이거나 업그레이드하세요.",
        "starterTier": "기동기",
        "premiumTier": "프리미엄",
        "professionalTier": "전문적인",
        "subscribeSupportTitle": "이 도구를 지원하세요",
        "subscribeSupportNote": "이 도구를 지원하려면 내 채널을 구독하세요.",
        "subscribeOnYoutube": "YouTube 구독",
        "subscriptionConfirmed": "구독 상태: 확인됨",
        "tempTransferTitle": "임시 이미지 전송",
        "tempTransferDescription": "수신자 사이트로 전송하기 위해 현재 페이지에서 보이는 모든 이미지 또는 비디오를 준비합니다.",
        "prepareTempImages": "임시 이미지 준비",
        "openReceiverSite": "수신자 사이트 열기",
        "bulkDownloaderTitle": "이미지 다운로더",
        "subscriberConfirmed": "확인된 구독자: 예/아니요(출시 예정)",
        "subscriberVerifyNote": "확인은 정기적으로 실행되며 구독을 취소하면 다운로드 기능이 비활성화됩니다.",
        "firebaseUid": "사용자 ID",
        "premiumFeatureLocked": "프리미엄 기능 - 잠금 해제 필요",
        "professionalFeatureLocked": "전문가 전용",
        "assetPremiumLocked": "프리미엄 기능 - 잠금 해제 필요",
        "queueAction": "대기열 및 선택",
        "upscaleDownload": "2K 업스케일 다운로드",
        "upscaleQualityPremium": "프리미엄: 2K",
        "upscaleQualityProfessional": "전문가용: 4K",
        "upscaleDownloadLocked": "프리미엄 기능 - 잠금 해제 필요",
        "upscaleDownloadToolsDisabled": "확대된 이미지는 지원되지 않습니다.",
        "waitForImageResponse": "이미지 응답을 기다립니다",
        "waitForImageResponseNote": "끄면 대기열은 제출 직후 다음 프롬프트로 이동합니다.",
        "perPromptAssetsNote": "프리미엄 잠금 해제가 필요합니다. 위에서 캐릭터/참조 이미지를 선택하고 이 기능을 켜고 대기열 및 선택을 클릭한 다음 각 프롬프트에 대한 자산을 선택하세요.",
        "perPromptAssetsUnlockRequired": "잠금 해제 필요",
        "perPromptAssetsUnlocked": "프리미엄 잠금 해제",
        "perPromptAssetsLocked": "프리미엄 기능 - 잠금 해제 필요",
        "perPromptAssetsLockedDetail": "각 프롬프트마다 다른 문자/참조 이미지를 사용하세요.",
        "videoModeFrames": "프레임",
        "videoModeIngredients": "재료",
        "videoVoiceLabel": "목소리",
        "queueVideoIngredientsButton": "+ 성분",
        "queueVideoStartButton": "이미지 시작",
        "queueVideoEndButton": "종료 이미지",
        "videoThumbIngredientLabel": "재료",
        "videoThumbStartLabel": "시작",
        "videoThumbEndLabel": "끝",
        "queueVideoModeLabel": "방법",
        "queueVideoDurationLabel": "지속",
        "runInsideProjectRequired": "먼저 Google Flow 프로젝트 페이지를 연 다음 프로젝트 내부에서 프롬프트를 실행하세요.",
        "storyboardOverviewTitle": "스토리보드",
        "downloadPickerPremiumTitle": "프리미엄 기능 - 잠금 해제 필요"
    },
    "ja": {
        "premiumFeatureUnlockedHeader": "プレミアムのロックが解除されました",
        "premiumFeatureSupporter": "サポーターになると専用プレミアム ユーザー ステータスのロックが解除され、すべてのプレミアム機能に中断することなく完全にアクセスできるようになります。",
        "storyboard": "高度なストーリーボード",
        "starterUsageBody": "今日使用された {count}/{limit} プロンプト",
        "starterQuotaNotEnough": "スターターには、今日 {limit} のうち {remaining} プロンプトが残っています。キューを減らすかアップグレードしてください。",
        "starterTier": "スターター",
        "premiumTier": "プレミアム",
        "professionalTier": "プロ",
        "subscribeSupportTitle": "このツールをサポートする",
        "subscribeSupportNote": "このツールをサポートするには、私のチャンネルを購読してください。",
        "subscriptionConfirmed": "購読ステータス: 確認済み",
        "tempTransferTitle": "一時的な画像転送",
        "tempTransferDescription": "現在のページに表示されているすべての画像またはビデオを受信側サイトに転送する準備をします。",
        "prepareTempImages": "一時イメージの準備",
        "openReceiverSite": "レシーバーサイトを開く",
        "bulkDownloaderTitle": "画像ダウンローダー",
        "subscriberConfirmed": "確認済みの購読者: はい/いいえ (近日公開予定)",
        "subscriberVerifyNote": "検証は定期的に実行され、購読を解除している場合はダウンロード機能が無効になります。",
        "firebaseUid": "ユーザーID",
        "copyFirebaseUid": "コピー",
        "firebaseUidCopied": "ユーザーIDがコピーされました。",
        "firebaseUidCopyFailed": "ユーザーIDをコピーできませんでした。手動で選択してコピーしてください。",
        "premiumLoginBanner": "ログインして機能のロックを解除します",
        "premiumFeatureLocked": "プレミアム機能 - ロック解除が必要です",
        "professionalFeatureLocked": "プロフェッショナルのみ",
        "assetPremiumLocked": "プレミアム機能 - ロック解除が必要です",
        "queueAction": "キューと選択",
        "promptPlaceholderVideoMultiline": "ビデオ プロンプトを @@@NEXT@@@ で区切ってここに貼り付けます...",
        "generationAutoDownloadTitle": "世代の自動ダウンロード",
        "upscaleDownload": "2K アップスケールをダウンロード",
        "upscaleQualityPremium": "プレミアム: 2K",
        "upscaleQualityProfessional": "プロフェッショナル: 4K",
        "upscaleDownloadLocked": "プレミアム機能 - ロック解除が必要です",
        "upscaleDownloadNote": "ベータ版: イメージが生成されるたびに 2K アップスケール バージョンをダウンロードし、完了するのを待ってから、次のプロンプトを送信します。これは低速であり、ダウンロード ページの画像では使用されず、フローが変更された場合には完璧ではない可能性があります。",
        "upscaleDownloadToolsDisabled": "アップスケールされた画像はサポートされていません",
        "waitForImageResponse": "画像の応答を待ちます",
        "waitForImageResponseNote": "オフの場合、キューは送信直後に次のプロンプトに移動します。",
        "promptDelay": "即時遅延",
        "promptDelayNote": "オンにすると、次のプロンプトを送信する前に、選択した秒数待機します。許容範囲: 10 ～ 90 秒 (10 ステップ)。プレミアムのみ。",
        "promptDelayPremiumOnly": "遅延のカスタマイズはプレミアム ユーザーのみが利用できます。",
        "promptDelaySeconds": "遅延秒 (10 ～ 300)",
        "queuedWhileRunning": "キューに追加されました。今の世代も続いていきます。",
        "queueCompletedAddMore": "キューが完了しました。新しいプロンプトを追加するか、キューをクリアします。",
        "theme": "テーマ",
        "themeDefault": "デフォルト",
        "themeLogo": "ロゴ",
        "themeDark": "暗い",
        "remoteNotificationDefaultTitle": "延長のお知らせ",
        "remoteNotificationConfirm": "わかった",
        "remoteNotificationVersion": "バージョン {version}",
        "queueAssetsTitle": "プロンプトごとのアセット",
        "queueAssetsInherited": "現在のアセットが各キュー項目にコピーされます。",
        "perPromptAssetsNote": "プレミアムのロック解除が必要です。上でキャラクター/参照画像を選択し、これをオンにし、[キューと選択] をクリックして、各プロンプトに対してアセットを選択します。",
        "perPromptAssetsUnlockRequired": "ロック解除が必要です",
        "perPromptAssetsUnlocked": "プレミアムのロックが解除されました",
        "perPromptAssetsLocked": "プレミアム機能 - ロック解除が必要です",
        "perPromptAssetsLockedDetail": "プロンプトごとに異なる文字/参照画像を使用します。",
        "videoMultilinePromptUnlockRequired": "ロック解除が必要です",
        "videoMultilinePromptLocked": "プロフェッショナル機能 - ロック解除が必要です",
        "videoMultilinePromptLockedDetail": "@@@NEXT@@@ で区切られた複数行のプロンプトを使用します。",
        "videoMultilinePrompt": "複数行のプロンプトを使用する",
        "videoMultilinePromptNote": "@@@NEXT@@@ でキュー項目を区切って、ビデオ モードの複数行のプロンプトを記述できるようにします。",
        "promptAssetsHint": "現在のキャラクターと参照イメージは、追加時に各プロンプトにコピーされます。キュー ボタンを使用して、実行前にプロンプ​​トごとにアセットを編集します。",
        "reviewPromptAssetsBeforeStart": "プロンプトが追加されました。以下のプロンプトごとのアセットを確認し、もう一度「開始」をクリックします。",
        "queueCharacterButton": "キャラクターの編集",
        "queueImagesButton": "画像の編集",
        "queueAddCharacterButton": "+キャラクター",
        "queueAddImagesButton": "+ 画像",
        "queueNoCharacter": "キャラクターなし",
        "queueNoImages": "画像がありません",
        "queueSelectTopCharacterFirst": "まず上部の文字を選択します。",
        "queueSelectTopImagesFirst": "まず上部の参照画像を選択します。",
        "queueAssetPickerCharacterTitle": "このプロンプトの文字を選択してください",
        "queueAssetPickerImagesTitle": "このプロンプトの画像を選択してください",
        "queueAssetPickerSubtitle": "上部で選択したアセットから選択します。サムネイルをクリックして選択または削除します。",
        "queueVideoIngredientPickerSubtitle": "{selected} / {max} が選択されています — サムネイルをクリックして切り替え、[完了] をタップします。",
        "queueVideoIngredientPickerMax": "最大 {max} 成分に達しました。",
        "queueAssetPickerDone": "終わり",
        "queueCharacterSet": "キャラクター: {name}",
        "queueCharactersSet": "文字: {count}",
        "queueImagesSet": "画像: {count}",
        "premiumRequiredForVideoMode": "ビデオモードを変更するには、プレミアム機能のロックが解除されている必要があります。",
        "videoAssetQueueTitle": "ビデオアセット",
        "videoAssetQueueHelpText": "ビデオプロンプトに使用する画像を選択します。キューに入れられた各プロンプトは、材料またはフレームを使用できます。",
        "videoModeFrames": "フレーム",
        "videoModeIngredients": "材料",
        "videoModeHelp": "ここでビデオモデルを選択します。キューに入れられた各プロンプトは、材料またはフレームのいずれかを個別に選択します。",
        "videoModel": "ビデオモデル",
        "videoVoiceLabel": "声",
        "videoVoicePlaceholder": "アンドリューまたは @Voice: アンドリュー",
        "videoVoiceIncompatible": "音声は Omni Flash Elements でのみ使用されます。",
        "videoOmniEndFrameWarning": "Omni Flash は終了フレームをサポートしていません。終了フレームの選択は無効になります。",
        "videoModeUnsupportedByModel": "選択したビデオ モデルはこのモードをサポートしていません。",
        "videoCreditsConfirm": "ビデオの生成には Flow クレジットが使用されます。走行前にご確認ください。",
        "videoFrameStartRequired": "Frames to Video を実行する前に開始フレームを選択します。",
        "videoIngredientsRequired": "材料をビデオに変換する前に、少なくとも 1 つの材料画像を選択してください。",
        "videoIngredientsMaxReached": "Elements to Video は、プロンプトごとに最大 3 つの画像をサポートします。",
        "videoModeRequired": "実行する前に、各ビデオ プロンプトの成分またはフレームを選択します。",
        "videoSelectAssetsFirst": "まず上のビデオアセットを選択してください。",
        "queueVideoIngredientsTitle": "このプロンプトの材料を選択してください",
        "queueVideoStartFrameTitle": "このプロンプトの開始フレームを選択してください",
        "queueVideoEndFrameTitle": "このプロンプトの終了フレームを選択してください",
        "queueVideoIngredientsButton": "+ 材料",
        "queueVideoStartButton": "開始画像",
        "queueVideoEndButton": "終了画像",
        "videoThumbIngredientLabel": "材料",
        "videoThumbStartLabel": "始める",
        "videoThumbEndLabel": "終わり",
        "queueVideoModeLabel": "モード",
        "queueVideoDurationLabel": "間隔",
        "queueChooseVideoMode": "材料またはフレームを選択してください",
        "noStartFrame": "開始フレームがありません",
        "uploadCsv": "CSVのアップロード",
        "csvGuideBtn": "CSVガイド",
        "openPicker": "ピッカーを開く",
        "openFullPicker": "フルピッカーを開く",
        "reset": "リセット",
        "remove": "取り除く",
        "add": "追加",
        "dryRun": "ドライラン",
        "reloadAssets": "アセットのリロード",
        "characterTitle": "キャラクター",
        "characterHelpText": "作成した 1 つ以上のフロー キャラクターを選択します。プロンプトごとのモードでは、これらの選択された文字から選択できます。",
        "referenceAssetTitle": "参照アセット",
        "referenceAssetHelpText": "画像モードの参照画像を 1 つ以上選択します。これはビデオキューとは別に残ります。",
        "referenceAssetTwoImageNote": "現時点では2枚の画像を使用してください。画像が見つからない場合は、プロジェクト内の画像が多すぎる可能性があります。新しいプロジェクトを使用してください。",
        "csvUploadHint": "CSV をアップロードしてプロンプト行をエディターにロードし、レビュー/修正してキューに追加します。",
        "queueAutoResetNote": "注: キューは 24 時間ごとに自動的にリセットされます。",
        "csvGuideMessage": "CSVガイド\n\nCSV アップロードでは、最初にプロンプト行がエディターに読み込まれます。自動キューには入りません。\n\n次の場合に CSV を使用します。\n- すぐに追加しなければならないプロンプトがたくさんあります。\n- シーンごとの行をスプレッドシートで管理したい。\n\n単純な形式:\n- 行ごとに 1 つのプロンプト。\n- 可能であれば、プロンプト ヘッダーを使用します (例: プロンプト / 画像プロンプト / テキスト プロンプト)。\n- UTF-8 が推奨されますが、他のエンコーディングも検出されます。\n\n簡単な手順:\n1. CSV ファイルでプロンプトを準備します。\n2. CSV を拡張機能にインポートします。\n3. 問題が見つかった場合は、強調表示されたプロンプト行を修正します。\n4. エディターで検出されたプロンプトを確認します。\n5. [キューに追加] をクリックして自動化を開始します。\n\n注:\n・選択したCSVファイルはインポート直後に破棄されます。\n- 行が壊れている場合は、問題のある行を空のままにしてスキップします。",
        "cleanupStaleItemsConfirm": "{count} の完了/失敗アイテムが保存されます。今すぐ削除しますか?",
        "noQueueItemsToRun": "まずプロンプトを入力するか、キューに項目を追加してください。",
        "promptNotFound": "プロンプトが見つかりません",
        "flowCharacter": "フローキャラクター",
        "flowAsset": "フローアセット",
        "orderLabel": "{count} を注文する",
        "characterN": "キャラクター {count}",
        "pickerVideoTitle": "ビデオ アセット ピッカー",
        "pickerCharacterTitle": "キャラクターピッカー",
        "pickerReferenceTitle": "参照アセットピッカー",
        "pickerAvailableVideoAssets": "利用可能なビデオアセット",
        "pickerAvailableCharacters": "使用可能なキャラクター",
        "pickerAvailableAssets": "利用可能なアセット",
        "pickerSelectedVideoAssets": "選択されたビデオアセット",
        "pickerSelectedCharacter": "選択したキャラクター",
        "pickerSelectedCharacters": "選択されたキャラクター",
        "pickerSelectedReferenceImages": "選択した参照画像",
        "pickerSaveVideoQueue": "ビデオキューの保存",
        "pickerUseCharacter": "キャラクターを使用する",
        "pickerUseSelected": "選択したものを使用",
        "pickerVideoSummarySelected": "{count} ビデオ アセットが選択されました。",
        "pickerVideoSummaryEmpty": "ビデオ アセットを左側のキューに右側のキューに移動します。",
        "pickerCharacterSummarySelected": "{count} 文字が選択されました。",
        "pickerCharacterSummaryEmpty": "作成した 1 つまたは複数のキャラクターを左側から右側の選択したリストに移動します。",
        "pickerReferenceSummarySelected": "{count} 参照画像が選択されました。",
        "pickerReferenceSummaryEmpty": "参照画像を左側から右側の選択されたリストに移動します。",
        "pickerNoAssetsAvailable": "利用可能なアセットがありません。 「Reload Assets」を使用してそれらを取得します。",
        "pickerSelectedVideoEmpty": "選択したビデオアセットがここに表示されます。",
        "pickerSelectedCharacterEmpty": "選択した文字がここに表示されます。",
        "pickerSelectedReferenceEmpty": "選択した参照画像がここに表示されます。",
        "openProjectTabFirst": "まずターゲットの Google Flow プロジェクト タブを開いてから、もう一度 Open Picker を試してください。",
        "csvImportCanceled": "CSVインポートがキャンセルされました。プロンプトはキューに入れられませんでした。",
        "csvNoValidPrompts": "インポートする有効なプロンプトがありません。少なくとも 1 つのプロンプトを追加するか、キャンセルします。",
        "csvLoadedReady": "CSV がロードされました: {count} プロンプトが準備されました。内容を確認して、[キューに追加] をクリックします。{details}",
        "csvLoadedWithIssues": "CSV には {count} の問題がロードされました。強調表示されたプロンプトを修正して適用します。",
        "csvEmptyUnreadable": "CSV が空であるか、読み取ることができません。",
        "csvNoValidRows": "この CSV には有効なプロンプト行が見つかりませんでした。",
        "csvLoadedReplacement": "CSV がロードされました ({count} プロンプト、{encoding})。一部のキャラクターには見直しが必要な場合があります。",
        "csvLoadedDetail": "CSV がロードされました: {count} プロンプトが準備されました (区切り文字: {delimiter}、エンコーディング: {encoding})。内容を確認して、「キューに追加」をクリックします。",
        "csvImportFailed": "CSV インポートに失敗しました: {message}",
        "csvImportCompleteTitle": "CSVインポートが完了しました。",
        "csvFoundPrompts": "見つかったプロンプト: {count}",
        "csvRowsNeedFixes": "修正が必要な行: {count}",
        "csvReviewFixRows": "強調表示された行を確認して修正してください。",
        "csvLoadedToEditor": "エディタにロードされました: {count}",
        "csvReviewAddQueue": "内容を確認し、準備ができたら「キューに追加」をクリックします。",
        "reloadAssetsReselectVideoStart": "フロー アセットを再ロードし、最初にビデオ開始画像を再選択します。",
        "noCharactersFoundCreateFirst": "文字が見つかりません。まずフロー キャラクターを作成してからリロードします。",
        "clearedVideoQueue": "ビデオアセットキューをクリアしました。",
        "importedFromReceiver": "受信者ページから {count} プロンプトをインポートしました。",
        "selectVideoAssetsFirst": "最初にビデオ アセットを選択します。",
        "setVideoPromptScene01": "最初にシーン 01 のビデオ プロンプトを設定します。",
        "openFlowProjectTabFirst": "まず、Google Flow プロジェクト タブを開きます。",
        "dryRunComplete": "ドライランが完了しました。 「作成」を押さなくても、開始イメージとプロンプトが準備されました。",
        "dryRunFailed": "ドライランが失敗しました: {message}",
        "reloadVideoAssetsFirst": "最初にビデオ アセットをリロードします。",
        "noSceneAssetsFound": "現在のプロジェクトにはシーン/イメージ番号の付いたアセットが見つかりません。",
        "autoAddedVideoAssets": "自動追加された {count} 番号付きビデオ アセット。",
        "openFlowProjectTabWithPath": "まず、Google Flow プロジェクト タブを開きます (labs.google/fx/tools/flow/project/…)。",
        "failedToLoadAssets": "アセットのロードに失敗しました。",
        "noAssetsFoundOpenAddMedia": "アセットが見つかりませんでした。まず「メディアの追加」パネルを開きます。",
        "loadedFreshAssetsCleared": "{count} の新しいアセットがロードされました。以前の参照選択がクリアされました。",
        "failedToLoadAssetsWithError": "アセットのロードに失敗しました: {message}",
        "failedToLoadCharacters": "文字の読み込みに失敗しました。",
        "loadedCharacters": "{count} 文字をロードしました。",
        "failedToLoadCharactersWithError": "文字のロードに失敗しました: {message}",
        "failedToLoadVideoAssets": "ビデオアセットのロードに失敗しました。",
        "loadedVideoAssets": "{count} ビデオ アセットがロードされました。",
        "failedToLoadVideoAssetsWithError": "ビデオアセットのロードに失敗しました: {message}",
        "buttonsOnlyInFlowProject": "これらのボタンは、Google Flow プロジェクト内でのみ使用できます。",
        "runInsideProjectRequired": "まず Google Flow プロジェクト ページを開き、次にプロジェクト内からプロンプトを実行します。",
        "removedReferenceSelectedNow": "参考画像を削除しました。現在選択されています: {count}。",
        "oauthClientIdMissing": "まず、manifest.json に oauth2.client_id を設定します。",
        "signingInGoogle": "Google でサインインしています...",
        "signInCompleteSupport": "サインインが完了しました。画像ダウンローダーのロックが解除されました。",
        "signedOutTokenClearFailed": "ローカルでサインアウトしました。ブラウザトークンキャッシュのクリアに失敗しました。",
        "signedOut": "サインアウトしました。",
        "signInFailed": "サインインに失敗しました: {message}",
        "signOutFailed": "サインアウトに失敗しました: {message}",
        "flowButtonSyncFailed": "フロー {flowType} ボタンの同期に失敗しました。 「フロー」タブをリロードして、再試行してください。",
        "moveUp": "上",
        "moveDown": "下",
        "edit": "編集",
        "editVideoPrompt": "ビデオプロンプトの編集",
        "noPromptSpecified": "プロンプトが指定されていません",
        "unknownAsset": "未知の資産",
        "signingInShortStatus": "Google SSO: サインイン中...",
        "downloading": "ダウンロード中...",
        "loading": "読み込み中...",
        "reloading": "再読み込み中...",
        "loadFromFlow": "フローからのロード",
        "storyboardOverviewTitle": "絵コンテ",
        "downloadPickerPremiumTitle": "プレミアム機能 - ロック解除が必要です",
        "recoveryCooldownTitle": "再起動を待っています",
        "recoveryPostReloadTitle": "再起動の準備中",
        "recoveryCooldownLabel": "ページ更新中",
        "recoveryPostReloadLabel": "キューの再開",
        "recoveryCancel": "キャンセル",
        "recoveryCooldownMessage": "Google Flow で生成が3回連続してブロックされました。この5分間の安全待機中は、新しいリクエストを送信しません。Google は VPN またはプロキシを無効にすることを推奨しています。",
        "recoveryPostReloadMessage": "フローが一度リフレッシュされました。 30 秒の準備待機が終了するまで、新しいリクエストは送信されません。",
        "recoveryCauseExplanation": "これは、Google Flow によって返されるサーバー側の異常なアクティビティの制限であり、アプリの内部エラーではありません。リクエストの頻度、VPN、プロキシ、または Google アカウントのアクティビティが影響する可能性があります。",
        "recoveryGoogleHelpLink": "公式の Google Flow ヘルプセンターを開く",
        "recoveryOtherAccountTip": "問題が続く場合は、Google Flow ページからサインアウトし、別の Google アカウントでサインインすると解決する可能性があります。自分が所有するアカウントのみを使用し、Google の規約に従ってください。",
        "recoveryCanceledMessage": "自動回復がキャンセルされました。失敗カウンタがリセットされ、キューは一時停止されたままになります。",
        "randomizedDelay": "ランダム化された遅延",
        "randomizedDelayNote": "プロンプト間で待機し、それに加えてランダム遅延 (デフォルトは 0 ～ 30 秒) が追加されるため、リクエストは完全に自動化されているようには見えません。また、20 プロンプトごとにランダムな 4 ～ 5 分間一時停止します。プレミアム以下では、常にこれらの安全なデフォルトを使用します。プロフェッショナルは、以下の値のロックを解除してカスタマイズできます。",
        "randomizedDelayJitter": "+ランダム遅延 (秒)",
        "randomizedDelayBreakEvery": "休憩ごと (プロンプト)",
        "randomizedDelayBreakMin": "休憩分 (分)",
        "randomizedDelayBreakMax": "最大休憩時間 (分)",
        "randomizedDelayProfessionalOnly": "プロフェッショナルのみ — アップグレードしてこれらの値をカスタマイズします。",
        "starterQuotaValue": "今日は{count}/{limit}",
        "starterQuotaResetHoursMinutes": "{hours}時間{minutes}分後にリセット",
        "starterQuotaResetHours": "{hours}時間後にリセット",
        "starterQuotaResetMinutes": "{minutes}分後にリセット",
        "starterQuotaResetting": "リセット中…",
        "flowAccountDiagnostic": "Googleアカウントの互換性",
        "flowAccountDiagnosticNote": "Chrome プロファイル アカウントと、現在 Google Flow で開いているアカウントを比較します。これは診断のみであり、アクセスが変更されることはありません。",
        "flowAccountDiagnosticButton": "小切手口座",
        "accessDeniedTitle": "許可されていません",
        "moveStarterAccessHere": "スターターアクセスをここに移動します",
        "moveStarterAccessConfirm": "スターター アクセスをこのブラウザに移動しますか?以前に登録した Starter アカウントは、このブラウザで Starter を使用できなくなります。",
        "moveStarterAccessSuccess": "スターター アクセスはこのブラウザに移動されました。",
        "moveStarterAccessFailed": "スターター アクセスを移動できませんでした。",
        "upgradeToPremium": "プレミアムにアップグレード",
        "useDifferentAccount": "別のアカウントを使用する"
    },
    "zh": {
        "premiumFeatureUnlockedHeader": "高级解锁",
        "premiumFeatureSupporter": "成为支持者即可解锁专用高级用户状态 - 您将可以不受干扰地完全访问所有高级功能。",
        "storyboard": "高级故事板",
        "starterUsageBody": "今天使用的 {count}/{limit} 提示",
        "starterQuotaNotEnough": "Starter 今天在 {limit} 中留下了 {remaining} 提示。减少排队或升级。",
        "starterTier": "起动机",
        "premiumTier": "优质的",
        "professionalTier": "专业的",
        "subscribeSupportTitle": "支持这个工具",
        "subscribeSupportNote": "请订阅我的频道来支持这个工具。",
        "subscriptionConfirmed": "订阅状态：已确认",
        "tempTransferTitle": "临时图像传输",
        "tempTransferDescription": "准备当前页面中的所有可见图像或视频，以便传输到接收方站点。",
        "prepareTempImages": "准备临时图像",
        "openReceiverSite": "开放接收站点",
        "bulkDownloaderTitle": "图片下载器",
        "subscriberConfirmed": "确认订阅者：是/否（即将推出）",
        "subscriberVerifyNote": "如果您取消订阅，验证将定期运行并禁用下载功能。",
        "firebaseUid": "用户身份",
        "copyFirebaseUid": "复制",
        "firebaseUidCopied": "已复制用户 ID。",
        "firebaseUidCopyFailed": "无法复制用户 ID。请手动选择并复制。",
        "premiumLoginBanner": "登录以解锁功能",
        "premiumFeatureLocked": "高级功能 - 需要解锁",
        "professionalFeatureLocked": "仅限专业人士",
        "assetPremiumLocked": "高级功能 - 需要解锁",
        "queueAction": "排队和选择",
        "promptPlaceholderVideoMultiline": "将您的视频提示粘贴到此处，并用 @@@NEXT@@@ 分隔...",
        "generationAutoDownloadTitle": "生成自动下载",
        "upscaleDownload": "下载 2K 升级版",
        "upscaleQualityPremium": "高级：2K",
        "upscaleQualityProfessional": "专业：4K",
        "upscaleDownloadLocked": "高级功能 - 需要解锁",
        "upscaleDownloadNote": "Beta：每次生成图像后下载 2K 放大版本，等待其完成，然后发送下一个提示。它速度较慢，不被下载页面图像使用，并且如果流量发生变化，可能不完美。",
        "upscaleDownloadToolsDisabled": "不支持放大图像",
        "waitForImageResponse": "等待图像响应",
        "waitForImageResponseNote": "关闭时，队列在提交后立即移至下一个提示。",
        "promptDelay": "及时延迟",
        "promptDelayNote": "启用后，在发送下一个提示之前等待选定的秒数。允许的范围：10-90 秒（步长为 10）。仅限高级版。",
        "promptDelayPremiumOnly": "延迟自定义仅适用于高级用户。",
        "promptDelaySeconds": "延迟秒数（10-300）",
        "queuedWhileRunning": "添加到队列中。当前这一代将继续下去。",
        "queueCompletedAddMore": "队列完成。添加新提示或清除队列。",
        "theme": "主题",
        "themeDefault": "默认",
        "themeLogo": "标识",
        "themeDark": "黑暗的",
        "remoteNotificationDefaultTitle": "延期通知",
        "remoteNotificationConfirm": "知道了",
        "remoteNotificationVersion": "版本 {version}",
        "queueAssetsTitle": "每个提示资产",
        "queueAssetsInherited": "当前资产被复制到每个队列项目中。",
        "perPromptAssetsNote": "需要高级解锁。选择上面的角色/参考图像，将其打开，单击“队列和选择”，然后为每个提示选择资源。",
        "perPromptAssetsUnlockRequired": "需要解锁",
        "perPromptAssetsUnlocked": "高级解锁",
        "perPromptAssetsLocked": "高级功能 - 需要解锁",
        "perPromptAssetsLockedDetail": "为每个提示使用不同的字符/参考图像。",
        "videoMultilinePromptUnlockRequired": "需要解锁",
        "videoMultilinePromptLocked": "专业功能 - 需要解锁",
        "videoMultilinePromptLockedDetail": "使用以@@@NEXT@@@分隔的多行提示。",
        "videoMultilinePrompt": "使用多行提示符",
        "videoMultilinePromptNote": "允许为视频模式编写多行提示，用@@@NEXT@@@分隔队列项目。",
        "promptAssetsHint": "添加时，当前角色和参考图像将复制到每个提示中。在运行之前，使用队列按钮根据提示编辑资产。",
        "reviewPromptAssetsBeforeStart": "已添加提示。查看下面的每个提示资产，然后再次单击“开始”。",
        "queueCharacterButton": "编辑角色",
        "queueImagesButton": "编辑图像",
        "queueAddCharacterButton": "+ 人物",
        "queueAddImagesButton": "+ 图片",
        "queueNoCharacter": "没有字符",
        "queueNoImages": "没有图片",
        "queueSelectTopCharacterFirst": "首先选择顶部的一个字符。",
        "queueSelectTopImagesFirst": "首先选择顶部的参考图像。",
        "queueAssetPickerCharacterTitle": "为此提示选择字符",
        "queueAssetPickerImagesTitle": "为此提示选择图像",
        "queueAssetPickerSubtitle": "从顶部选择的资产中进行选择。单击缩略图以选择或删除。",
        "queueVideoIngredientPickerSubtitle": "已选择 {selected} / {max} — 单击缩略图进行切换，然后点击“完成”。",
        "queueVideoIngredientPickerMax": "已达到最大 {max} 成分。",
        "queueAssetPickerDone": "完毕",
        "queueCharacterSet": "角色：{name}",
        "queueCharactersSet": "人物：{count}",
        "queueImagesSet": "图片：{count}",
        "premiumRequiredForVideoMode": "需要解锁高级功能才能更改视频模式。",
        "videoAssetQueueTitle": "视频资产",
        "videoAssetQueueHelpText": "选择用于视频提示的图像。每个排队的提示都可以使用成分或框架。",
        "videoModeFrames": "镜框",
        "videoModeIngredients": "原料",
        "videoModeHelp": "在这里选择视频模型。每个排队的提示分别选择成分或框架。",
        "videoModel": "视频模型",
        "videoVoiceLabel": "嗓音",
        "videoVoicePlaceholder": "安德鲁或@Voice：安德鲁",
        "videoVoiceIncompatible": "语音仅与 Omni Flash 成分一起使用。",
        "videoOmniEndFrameWarning": "Omni Flash 不支持结束帧。结束帧选择已禁用。",
        "videoModeUnsupportedByModel": "所选视频型号不支持该模式。",
        "videoCreditsConfirm": "视频生成将使用 Flow 积分。运行前请确认。",
        "videoFrameStartRequired": "在运行“帧到视频”之前选择一个起始帧。",
        "videoIngredientsRequired": "在运行“成分到视频”之前，至少选择一张成分图像。",
        "videoIngredientsMaxReached": "视频成分支持每个提示最多 3 个图像。",
        "videoModeRequired": "运行前为每个视频提示选择成分或框架。",
        "videoSelectAssetsFirst": "首先选择上面的视频资源。",
        "queueVideoIngredientsTitle": "为此提示选择成分",
        "queueVideoStartFrameTitle": "为此提示选择开始帧",
        "queueVideoEndFrameTitle": "为此提示选择结束帧",
        "queueVideoIngredientsButton": "+ 成分",
        "queueVideoStartButton": "起始图像",
        "queueVideoEndButton": "结束图像",
        "videoThumbIngredientLabel": "成分",
        "videoThumbStartLabel": "开始",
        "videoThumbEndLabel": "结尾",
        "queueVideoModeLabel": "模式",
        "queueVideoDurationLabel": "期间",
        "queueChooseVideoMode": "选择成分或框架",
        "noStartFrame": "无起始帧",
        "uploadCsv": "上传 CSV",
        "csvGuideBtn": "CSV 指南",
        "openPicker": "打开选择器",
        "openFullPicker": "打开完整选择器",
        "reset": "重置",
        "remove": "消除",
        "add": "添加",
        "dryRun": "试运行",
        "reloadAssets": "重新加载资产",
        "characterTitle": "特点",
        "characterHelpText": "选择一个或多个已创建的 Flow 角色。每个提示模式可以从这些选定的字符中进行选择。",
        "referenceAssetTitle": "参考资产",
        "referenceAssetHelpText": "为图像模式选择一张或多张参考图像。这与视频队列分开。",
        "referenceAssetTwoImageNote": "目前请使用 2 张图片。如果找不到图像，则项目中的图像可能过多。请使用新项目。",
        "csvUploadHint": "上传 CSV 以将提示行加载到编辑器中，检查/修复它们，然后将它们添加到队列中。",
        "queueAutoResetNote": "注意：队列每 24 小时自动重置一次。",
        "csvGuideMessage": "CSV 指南\n\nCSV 上传首先将提示行读取到编辑器中。它不会自动排队。\n\n在以下情况下使用 CSV：\n- 有很多提示可以快速添加。\n- 您希望在电子表格中管理逐个场景的行。\n\n简单格式：\n- 每行一个提示。\n- 如果可能，使用提示标题（例如：提示/图像提示/文本提示）。\n- 建议使用 UTF-8，但也会检测其他编码。\n\n快速步骤：\n1. 在 CSV 文件中准备提示。\n2. 将 CSV 导入扩展程序。\n3. 如果发现任何问题，请修复突出显示的提示行。\n4. 在编辑器中查看检测到的提示。\n5. 单击“添加到队列”并开始自动化。\n\n注意事项：\n- 所选的 CSV 文件在导入后立即被丢弃。\n- 如果行已损坏，请将有问题的行留空以跳过它。",
        "cleanupStaleItemsConfirm": "{count} 已完成/失败的项目被存储。现在删除它们吗？",
        "noQueueItemsToRun": "请先输入提示或将项目添加到队列中。",
        "promptNotFound": "提示未找到",
        "flowCharacter": "流动特性",
        "flowAsset": "流量资产",
        "orderLabel": "订单 {count}",
        "characterN": "角色 {count}",
        "pickerVideoTitle": "视频资产选择器",
        "pickerCharacterTitle": "角色选择器",
        "pickerReferenceTitle": "参考资产选择器",
        "pickerAvailableVideoAssets": "可用的视频资源",
        "pickerAvailableCharacters": "可用角色",
        "pickerAvailableAssets": "可用资产",
        "pickerSelectedVideoAssets": "选定的视频资产",
        "pickerSelectedCharacter": "选定的角色",
        "pickerSelectedCharacters": "选定的角色",
        "pickerSelectedReferenceImages": "选定的参考图像",
        "pickerSaveVideoQueue": "保存视频队列",
        "pickerUseCharacter": "使用字符",
        "pickerUseSelected": "使用选定的",
        "pickerVideoSummarySelected": "已选择 {count} 视频资源。",
        "pickerVideoSummaryEmpty": "将视频资源从左侧移动到右侧的队列中。",
        "pickerCharacterSummarySelected": "已选择 {count} 个字符。",
        "pickerCharacterSummaryEmpty": "将左侧的一个或多个创建的角色移动到右侧选定的列表中。",
        "pickerReferenceSummarySelected": "已选择 {count} 参考图像。",
        "pickerReferenceSummaryEmpty": "将参考图像从左侧移动到右侧的选定列表中。",
        "pickerNoAssetsAvailable": "没有可用资产。使用“重新加载资产”来获取它们。",
        "pickerSelectedVideoEmpty": "选定的视频资源将显示在此处。",
        "pickerSelectedCharacterEmpty": "选定的字符将出现在此处。",
        "pickerSelectedReferenceEmpty": "选定的参考图像将出现在此处。",
        "openProjectTabFirst": "首先打开目标 Google Flow 项目选项卡，然后再次尝试打开选取器。",
        "csvImportCanceled": "CSV 导入已取消。没有提示排队。",
        "csvNoValidPrompts": "没有有效的导入提示。添加至少一个提示或取消。",
        "csvLoadedReady": "CSV 已加载：{count} 提示已准备就绪。查看，然后单击“添加到队列”.{details}",
        "csvLoadedWithIssues": "加载了 {count} 问题的 CSV。修复突出显示的提示并应用。",
        "csvEmptyUnreadable": "CSV 为空或不可读。",
        "csvNoValidRows": "在此 CSV 中找不到有效的提示行。",
        "csvLoadedReplacement": "已加载 CSV（{count} 提示、{encoding}）。有些角色可能需要审查。",
        "csvLoadedDetail": "CSV 已加载：{count} 提示已准备就绪（分隔符：{delimiter}，编码：{encoding}）。查看，然后单击“添加到队列”。",
        "csvImportFailed": "CSV 导入失败：{message}",
        "csvImportCompleteTitle": "CSV 导入完成。",
        "csvFoundPrompts": "发现提示：{count}",
        "csvRowsNeedFixes": "需要修复的行：{count}",
        "csvReviewFixRows": "请检查并修复突出显示的行。",
        "csvLoadedToEditor": "加载到编辑器：{count}",
        "csvReviewAddQueue": "准备好后，进行检查并单击“添加到队列”。",
        "reloadAssetsReselectVideoStart": "重新加载 Flow 资源并首先重新选择视频起始图像。",
        "noCharactersFoundCreateFirst": "未找到任何字符。首先创建一个 Flow 角色，然后重新加载。",
        "clearedVideoQueue": "已清除视频资源队列。",
        "importedFromReceiver": "从接收器页面导入 {count} 提示。",
        "selectVideoAssetsFirst": "首先选择视频资源。",
        "setVideoPromptScene01": "首先为场景01设置视频提示。",
        "openFlowProjectTabFirst": "首先打开 Google Flow 项目选项卡。",
        "dryRunComplete": "试运行完成。无需按“创建”即可准备开始图像和提示。",
        "dryRunFailed": "试运行失败：{message}",
        "reloadVideoAssetsFirst": "首先重新加载视频资源。",
        "noSceneAssetsFound": "在当前项目中找不到场景/图像编号的资源。",
        "autoAddedVideoAssets": "自动添加 {count} 编号的视频资源。",
        "openFlowProjectTabWithPath": "首先打开 Google Flow 项目选项卡 (labs.google/fx/tools/flow/project/...)。",
        "failedToLoadAssets": "无法加载资源。",
        "noAssetsFoundOpenAddMedia": "未找到资产。首先打开添加媒体面板。",
        "loadedFreshAssetsCleared": "已加载 {count} 新资源。先前的参考选择被清除。",
        "failedToLoadAssetsWithError": "无法加载资源：{message}",
        "failedToLoadCharacters": "加载字符失败。",
        "loadedCharacters": "已加载 {count} 字符。",
        "failedToLoadCharactersWithError": "无法加载字符：{message}",
        "failedToLoadVideoAssets": "无法加载视频资源。",
        "loadedVideoAssets": "已加载 {count} 视频资源。",
        "failedToLoadVideoAssetsWithError": "无法加载视频资源：{message}",
        "buttonsOnlyInFlowProject": "这些按钮仅在 Google Flow 项目内可用。",
        "runInsideProjectRequired": "首先打开 Google Flow 项目页面，然后从项目内部运行提示。",
        "removedReferenceSelectedNow": "删除了参考图像。现在选择：{count}。",
        "oauthClientIdMissing": "首先在manifest.json中设置oauth2.client_id。",
        "signingInGoogle": "正在使用 Google 登录...",
        "signInCompleteSupport": "登录完成。图像下载器已解锁。",
        "signedOutTokenClearFailed": "在本地注销。浏览器令牌缓存清除失败。",
        "signedOut": "已退出。",
        "signInFailed": "登录失败：{message}",
        "signOutFailed": "注销失败：{message}",
        "flowButtonSyncFailed": "流 {flowType} 按钮同步失败。重新加载 Flow 选项卡并重试。",
        "moveUp": "向上",
        "moveDown": "向下",
        "edit": "编辑",
        "editVideoPrompt": "编辑视频提示",
        "noPromptSpecified": "未指定提示",
        "unknownAsset": "未知资产",
        "signingInShortStatus": "Google SSO：正在登录...",
        "downloading": "正在下载...",
        "loading": "加载中...",
        "reloading": "正在重新加载...",
        "loadFromFlow": "流量负载",
        "storyboardOverviewTitle": "故事板",
        "downloadPickerPremiumTitle": "高级功能 - 需要解锁",
        "recoveryCooldownTitle": "等待重启",
        "recoveryPostReloadTitle": "准备重启",
        "recoveryCooldownLabel": "页面刷新于",
        "recoveryPostReloadLabel": "队列重新启动于",
        "recoveryCancel": "取消",
        "recoveryCooldownMessage": "Google Flow 已连续三次阻止生成。在这5分钟的安全等待期间，不会发送新的请求。Google 建议关闭 VPN 或代理。",
        "recoveryPostReloadMessage": "流量刷新了一次。在 30 秒的准备等待完成之前，不会发送新请求。",
        "recoveryCauseExplanation": "这是 Google Flow 返回的服务器端异常活动限制，而不是内部应用程序错误。请求频率、VPN、代理或 Google 帐户活动可能会造成影响。",
        "recoveryGoogleHelpLink": "打开官方 Google Flow 帮助中心",
        "recoveryOtherAccountTip": "如果问题仍然存在，退出 Google Flow 页面并使用另一个 Google 帐户登录可能会有所帮助。仅使用您拥有的帐户并遵守 Google 的条款。",
        "recoveryCanceledMessage": "自动恢复已取消。失败计数器已重置并且队列保持暂停状态。",
        "randomizedDelay": "随机延迟",
        "randomizedDelayNote": "在提示之间等待，并额外添加随机延迟（默认0-30秒），避免请求看起来完全自动化。每20个提示还会随机暂停4-5分钟。Premium 及以下方案始终使用这些安全默认值，Professional 用户可以解锁并自定义以下数值。",
        "randomizedDelayJitter": "+随机延迟（秒）",
        "randomizedDelayBreakEvery": "打破每一个（提示）",
        "randomizedDelayBreakMin": "休息时间（分钟）",
        "randomizedDelayBreakMax": "最长休息时间（分钟）",
        "randomizedDelayProfessionalOnly": "仅限专业人士 — 升级以自定义这些值。",
        "starterQuotaValue": "今天{count}/{limit}",
        "starterQuotaResetHoursMinutes": "{hours}小时{minutes}分钟后重置",
        "starterQuotaResetHours": "{hours}小时后重置",
        "starterQuotaResetMinutes": "{minutes}分钟后重置",
        "starterQuotaResetting": "正在重置...",
        "flowAccountDiagnostic": "谷歌帐户兼容性",
        "flowAccountDiagnosticNote": "将 Chrome 个人资料帐户与当前在 Google Flow 中打开的帐户进行比较。这仅用于诊断，并且永远不会更改访问权限。",
        "flowAccountDiagnosticButton": "检查账户",
        "accessDeniedTitle": "不允许",
        "moveStarterAccessHere": "将入门访问权限移至此处",
        "moveStarterAccessConfirm": "将 Starter 访问权限移至此浏览器？之前注册的 Starter 帐户将无法再在此浏览器上使用 Starter。",
        "moveStarterAccessSuccess": "初学者访问已移至此浏览器。",
        "moveStarterAccessFailed": "无法移动启动器访问权限。",
        "upgradeToPremium": "升级至高级版",
        "useDifferentAccount": "使用不同的帐户"
    },
    "de": {
        "premiumFeatureUnlockedHeader": "Premium freigeschaltet",
        "premiumFeatureSupporter": "Werden Sie Unterstützer, um den Status eines dedizierten Premium-Benutzers freizuschalten – Sie behalten uneingeschränkten Zugriff auf alle Premium-Funktionen ohne Unterbrechungen.",
        "storyboard": "Erweitertes Storyboard",
        "starterUsageBody": "Heute verwendete Eingabeaufforderungen {count}/{limit}",
        "starterQuotaNotEnough": "Starter hat heute noch {remaining} Eingabeaufforderung(en) von {limit} übrig. Reduzieren Sie die Warteschlange oder führen Sie ein Upgrade durch.",
        "starterTier": "Anlasser",
        "premiumTier": "Prämie",
        "professionalTier": "Professional",
        "upgrade": "Upgrade",
        "upgraded": "Aktualisiert",
        "subscribeSupportTitle": "Unterstützen Sie dieses Tool",
        "subscribeSupportNote": "Bitte abonnieren Sie meinen Kanal, um dieses Tool zu unterstützen.",
        "subscriptionConfirmed": "Abonnementstatus: Bestätigt",
        "tempTransferTitle": "Temporäre Bildübertragung",
        "tempTransferDescription": "Bereiten Sie alle sichtbaren Bilder oder Videos der aktuellen Seite für die Übertragung an die Empfängerseite vor.",
        "prepareTempImages": "Bereiten Sie temporäre Bilder vor",
        "openReceiverSite": "Öffnen Sie die Empfängerseite",
        "bulkDownloaderTitle": "Bild-Downloader",
        "subscriberConfirmed": "Bestätigter Abonnent: Ja/Nein (in Kürze erhältlich)",
        "subscriberVerifyNote": "Die Überprüfung wird regelmäßig durchgeführt und die Download-Funktionen werden deaktiviert, wenn Sie sich abgemeldet haben.",
        "firebaseUid": "Benutzer-ID",
        "copyFirebaseUid": "Kopie",
        "firebaseUidCopied": "Benutzer-ID kopiert.",
        "firebaseUidCopyFailed": "Benutzer-ID konnte nicht kopiert werden. Bitte wählen Sie es manuell aus und kopieren Sie es.",
        "premiumLoginBanner": "Melden Sie sich an, um Funktionen freizuschalten",
        "premiumFeatureLocked": "Premium-Funktion – Freischaltung erforderlich",
        "professionalFeatureLocked": "Nur für Profis",
        "assetPremiumLocked": "Premium-Funktion – Freischaltung erforderlich",
        "video": "Video",
        "queueAction": "Warteschlange und Auswahl",
        "promptPlaceholderVideoMultiline": "Fügen Sie hier Ihre Videoaufforderungen ein, getrennt durch @@@NEXT@@@...",
        "generationAutoDownloadTitle": "Automatischer Download der Generation",
        "upscaleDownload": "Laden Sie 2K Upscaled herunter",
        "upscaleQualityPremium": "Prämie: 2K",
        "upscaleQualityProfessional": "Professionell: 4K",
        "upscaleDownloadLocked": "Premium-Funktion – Freischaltung erforderlich",
        "upscaleDownloadNote": "Beta: Lädt nach jedem generierten Bild die hochskalierte 2K-Version herunter, wartet, bis der Vorgang abgeschlossen ist, und sendet dann die nächste Eingabeaufforderung. Es ist langsamer, wird von Seitenbildern herunterladen nicht verwendet und ist möglicherweise nicht perfekt, wenn sich der Fluss ändert.",
        "upscaleDownloadToolsDisabled": "Keine Unterstützung für hochskalierte Bilder",
        "waitForImageResponse": "Warten Sie auf die Bildantwort",
        "waitForImageResponseNote": "Wenn diese Option deaktiviert ist, bewegt sich die Warteschlange direkt nach dem Absenden zur nächsten Eingabeaufforderung.",
        "promptDelay": "Pünktliche Verzögerung",
        "promptDelayNote": "Wenn diese Option aktiviert ist, wird die ausgewählte Sekunde gewartet, bevor die nächste Aufforderung gesendet wird. Zulässiger Bereich: 10–90 Sekunden (in 10er-Schritten). Nur Premium.",
        "promptDelayPremiumOnly": "Die Anpassung der Verzögerung ist nur für Premium-Benutzer verfügbar.",
        "promptDelaySeconds": "Verzögerungssekunden (10-300)",
        "queuedWhileRunning": "Zur Warteschlange hinzugefügt. Die aktuelle Generation wird weitergeführt.",
        "queueCompletedAddMore": "Warteschlange abgeschlossen. Fügen Sie neue Eingabeaufforderungen hinzu oder leeren Sie die Warteschlange.",
        "theme": "Thema",
        "themeDefault": "Standard",
        "themeLogo": "Logo",
        "themeDark": "Dunkel",
        "remoteNotificationDefaultTitle": "Verlängerungsmitteilung",
        "remoteNotificationConfirm": "Habe es",
        "remoteNotificationVersion": "Version {version}",
        "queueAssetsTitle": "Pro-Prompt-Assets",
        "queueAssetsInherited": "Aktuelle Assets werden in jedes Warteschlangenelement kopiert.",
        "perPromptAssetsNote": "Premium-Freischaltung erforderlich. Wählen Sie oben Zeichen-/Referenzbilder aus, aktivieren Sie diese Option, klicken Sie auf „Warteschlange & Auswählen“ und wählen Sie dann Assets für jede Eingabeaufforderung aus.",
        "perPromptAssetsUnlockRequired": "Entsperren erforderlich",
        "perPromptAssetsUnlocked": "Premium freigeschaltet",
        "perPromptAssetsLocked": "Premium-Funktion – Freischaltung erforderlich",
        "perPromptAssetsLockedDetail": "Verwenden Sie für jede Eingabeaufforderung unterschiedliche Zeichen-/Referenzbilder.",
        "videoMultilinePromptUnlockRequired": "Entsperren erforderlich",
        "videoMultilinePromptLocked": "Professionelle Funktion – Freischaltung erforderlich",
        "videoMultilinePromptLockedDetail": "Verwenden Sie mehrzeilige Eingabeaufforderungen, getrennt durch @@@NEXT@@@.",
        "videoMultilinePrompt": "Verwenden Sie eine mehrzeilige Eingabeaufforderung",
        "videoMultilinePromptNote": "Ermöglicht das Schreiben mehrzeiliger Eingabeaufforderungen für den Videomodus und trennt Warteschlangenelemente durch @@@NEXT@@@.",
        "promptAssetsHint": "Aktuelle Zeichen- und Referenzbilder werden beim Hinzufügen in jede Eingabeaufforderung kopiert. Verwenden Sie die Warteschlangenschaltflächen, um Assets vor der Ausführung per Eingabeaufforderung zu bearbeiten.",
        "reviewPromptAssetsBeforeStart": "Eingabeaufforderungen hinzugefügt. Sehen Sie sich unten die Assets pro Eingabeaufforderung an und klicken Sie dann erneut auf „Starten“.",
        "queueCharacterButton": "Charakter bearbeiten",
        "queueImagesButton": "Bilder bearbeiten",
        "queueAddCharacterButton": "+ Charakter",
        "queueAddImagesButton": "+ Bilder",
        "queueNoCharacter": "Kein Charakter",
        "queueNoImages": "Keine Bilder",
        "queueSelectTopCharacterFirst": "Wählen Sie zunächst oben ein Zeichen aus.",
        "queueSelectTopImagesFirst": "Wählen Sie zuerst oben Referenzbilder aus.",
        "queueAssetPickerCharacterTitle": "Wählen Sie das Zeichen für diese Eingabeaufforderung aus",
        "queueAssetPickerImagesTitle": "Wählen Sie Bilder für diese Eingabeaufforderung aus",
        "queueAssetPickerSubtitle": "Wählen Sie aus den oben ausgewählten Assets. Klicken Sie auf die Miniaturansichten, um sie auszuwählen oder zu entfernen.",
        "queueVideoIngredientPickerSubtitle": "{selected} / {max} ausgewählt – klicken Sie zum Umschalten auf die Miniaturansichten und tippen Sie dann auf „Fertig“.",
        "queueVideoIngredientPickerMax": "Maximale {max} Zutaten erreicht.",
        "queueAssetPickerDone": "Erledigt",
        "queueCharacterSet": "Charakter: {name}",
        "queueCharactersSet": "Zeichen: {count}",
        "queueImagesSet": "Bilder: {count}",
        "premiumRequiredForVideoMode": "Zum Ändern des Videomodus ist die freigeschaltete Premium-Funktion erforderlich.",
        "videoAssetQueueTitle": "Video-Assets",
        "videoAssetQueueHelpText": "Wählen Sie Bilder aus, die Sie für Videoaufforderungen verwenden möchten. Jede Eingabeaufforderung in der Warteschlange kann Zutaten oder Rahmen verwenden.",
        "videoModeFrames": "Rahmen",
        "videoModeIngredients": "Zutaten",
        "videoModeHelp": "Wählen Sie hier das Videomodell aus. Jede Eingabeaufforderung in der Warteschlange wählt entweder „Zutaten“ oder „Rahmen“ separat aus.",
        "videoModel": "Videomodell",
        "videoVoiceLabel": "Stimme",
        "videoVoicePlaceholder": "Andrew oder @Voice: Andrew",
        "videoVoiceIncompatible": "Sprache wird nur mit Omni Flash Ingredients verwendet.",
        "videoOmniEndFrameWarning": "Omni Flash unterstützt keinen Endrahmen. Die Auswahl des Endbilds ist deaktiviert.",
        "videoModeUnsupportedByModel": "Das ausgewählte Videomodell unterstützt diesen Modus nicht.",
        "videoCreditsConfirm": "Für die Videoerstellung werden Flow-Credits verwendet. Bitte bestätigen Sie vor dem Ausführen.",
        "videoFrameStartRequired": "Wählen Sie ein Startbild aus, bevor Sie „Frames to Video“ ausführen.",
        "videoIngredientsRequired": "Wählen Sie mindestens ein Zutatenbild aus, bevor Sie „Zutaten zum Video“ ausführen.",
        "videoIngredientsMaxReached": "Ingredients to Video unterstützt bis zu 3 Bilder pro Eingabeaufforderung.",
        "videoModeRequired": "Wählen Sie vor der Ausführung für jede Videoaufforderung „Zutaten“ oder „Frames“.",
        "videoSelectAssetsFirst": "Wählen Sie oben zuerst die Video-Assets aus.",
        "queueVideoIngredientsTitle": "Wählen Sie Zutaten für diese Eingabeaufforderung aus",
        "queueVideoStartFrameTitle": "Wählen Sie „Startframe für diese Eingabeaufforderung“.",
        "queueVideoEndFrameTitle": "Wählen Sie „Endframe für diese Aufforderung“ aus",
        "queueVideoIngredientsButton": "+ Zutaten",
        "queueVideoStartButton": "Bild starten",
        "queueVideoEndButton": "Bild beenden",
        "videoThumbIngredientLabel": "Bestandteil",
        "videoThumbStartLabel": "Start",
        "videoThumbEndLabel": "Ende",
        "queueVideoModeLabel": "Modus",
        "queueVideoDurationLabel": "Dauer",
        "queueChooseVideoMode": "Wählen Sie Zutaten oder Rahmen",
        "noStartFrame": "Kein Startframe",
        "languageHindi": "Hindi",
        "uploadCsv": "CSV hochladen",
        "csvGuideBtn": "CSV-Leitfaden",
        "openPicker": "Öffnen Sie die Auswahl",
        "openFullPicker": "Öffnen Sie die vollständige Auswahl",
        "reset": "Zurücksetzen",
        "remove": "Entfernen",
        "add": "Hinzufügen",
        "dryRun": "Trockenlauf",
        "reloadAssets": "Assets neu laden",
        "characterTitle": "Charakter",
        "characterHelpText": "Wählen Sie einen oder mehrere erstellte Flow-Charaktere aus. Der Per-Prompt-Modus kann aus diesen ausgewählten Zeichen auswählen.",
        "referenceAssetTitle": "Referenzwert",
        "referenceAssetHelpText": "Wählen Sie ein oder mehrere Referenzbilder für den Bildmodus aus. Dies bleibt von der Videowarteschlange getrennt.",
        "referenceAssetTwoImageNote": "Bitte verwenden Sie ab sofort 2 Bilder. Wenn ein Bild nicht gefunden wird, befinden sich möglicherweise zu viele Bilder im Projekt. Bitte verwenden Sie ein neues Projekt.",
        "csvUploadHint": "Laden Sie eine CSV-Datei hoch, um Eingabeaufforderungszeilen in den Editor zu laden, sie zu überprüfen/zu korrigieren und sie dann zur Warteschlange hinzuzufügen.",
        "queueAutoResetNote": "Hinweis: Die Warteschlange wird alle 24 Stunden automatisch zurückgesetzt.",
        "csvGuideMessage": "CSV-Leitfaden\n\nBeim CSV-Upload werden Eingabeaufforderungszeilen zunächst in den Editor eingelesen. Es erfolgt keine automatische Warteschlange.\n\nVerwenden Sie CSV, wenn:\n- Sie haben viele Eingabeaufforderungen, die Sie schnell hinzufügen können.\n- Sie möchten, dass die Zeilen Szene für Szene in einer Tabelle verwaltet werden.\n\nEinfaches Format:\n- Eine Eingabeaufforderung pro Zeile.\n- Verwenden Sie nach Möglichkeit einen Eingabeaufforderungsheader (z. B. Eingabeaufforderung / Bildeingabeaufforderung / Texteingabeaufforderung).\n- UTF-8 wird empfohlen, aber auch andere Kodierungen werden erkannt.\n\nSchnelle Schritte:\n1. Bereiten Sie Ihre Eingabeaufforderungen in einer CSV-Datei vor.\n2. Importieren Sie die CSV-Datei in die Erweiterung.\n3. Korrigieren Sie hervorgehobene Eingabeaufforderungszeilen, wenn Probleme gefunden werden.\n4. Überprüfen Sie die erkannten Eingabeaufforderungen im Editor.\n5. Klicken Sie auf „Zur Warteschlange hinzufügen“ und starten Sie die Automatisierung.\n\nHinweise:\n- Die ausgewählte CSV-Datei wird direkt nach dem Import verworfen.\n- Wenn Zeilen unterbrochen sind, lassen Sie eine problematische Zeile leer, um sie zu überspringen.",
        "cleanupStaleItemsConfirm": "{count} abgeschlossene/fehlgeschlagene Elemente werden gespeichert. Jetzt entfernen?",
        "noQueueItemsToRun": "Bitte geben Sie zuerst Eingabeaufforderungen ein oder fügen Sie Elemente zur Warteschlange hinzu.",
        "promptNotFound": "Eingabeaufforderung nicht gefunden",
        "flowCharacter": "Flow-Charakter",
        "flowAsset": "Flow-Asset",
        "orderLabel": "Bestellen Sie {count}",
        "characterN": "Charakter {count}",
        "pickerVideoTitle": "Video-Asset-Auswahl",
        "pickerCharacterTitle": "Charakterauswahl",
        "pickerReferenceTitle": "Referenz-Asset-Auswahl",
        "pickerAvailableVideoAssets": "Verfügbare Video-Assets",
        "pickerAvailableCharacters": "Verfügbare Charaktere",
        "pickerAvailableAssets": "Verfügbare Vermögenswerte",
        "pickerSelectedVideoAssets": "Ausgewählte Video-Assets",
        "pickerSelectedCharacter": "Ausgewählter Charakter",
        "pickerSelectedCharacters": "Ausgewählte Charaktere",
        "pickerSelectedReferenceImages": "Ausgewählte Referenzbilder",
        "pickerSaveVideoQueue": "Videowarteschlange speichern",
        "pickerUseCharacter": "Verwenden Sie Charakter",
        "pickerUseSelected": "Ausgewählte verwenden",
        "pickerVideoSummarySelected": "{count} Video-Asset(s) ausgewählt.",
        "pickerVideoSummaryEmpty": "Verschieben Sie Video-Assets von links in die Warteschlange rechts.",
        "pickerCharacterSummarySelected": "{count} Zeichen ausgewählt.",
        "pickerCharacterSummaryEmpty": "Verschieben Sie einen oder mehrere erstellte Charaktere von links in die ausgewählte Liste rechts.",
        "pickerReferenceSummarySelected": "{count} Referenzbild(er) ausgewählt.",
        "pickerReferenceSummaryEmpty": "Referenzbilder von links in die ausgewählte Liste rechts verschieben.",
        "pickerNoAssetsAvailable": "Keine verfügbaren Vermögenswerte. Verwenden Sie „Assets neu laden“, um sie abzurufen.",
        "pickerSelectedVideoEmpty": "Ausgewählte Video-Assets werden hier angezeigt.",
        "pickerSelectedCharacterEmpty": "Ausgewählte Charaktere werden hier angezeigt.",
        "pickerSelectedReferenceEmpty": "Ausgewählte Referenzbilder werden hier angezeigt.",
        "openProjectTabFirst": "Öffnen Sie zuerst die Registerkarte des Ziel-Google Flow-Projekts und versuchen Sie dann erneut, die Auswahl zu öffnen.",
        "csvImportCanceled": "CSV-Import abgebrochen. Es befanden sich keine Eingabeaufforderungen in der Warteschlange.",
        "csvNoValidPrompts": "Keine gültigen Aufforderungen zum Importieren. Fügen Sie mindestens eine Aufforderung hinzu oder brechen Sie ab.",
        "csvLoadedReady": "CSV geladen: {count} Eingabeaufforderung(en) bereit. Überprüfen Sie es und klicken Sie dann auf „Zur Warteschlange hinzufügen“.{details}",
        "csvLoadedWithIssues": "CSV mit {count}-Problem(en) geladen. Korrigieren Sie hervorgehobene Eingabeaufforderungen und wenden Sie sie an.",
        "csvEmptyUnreadable": "CSV ist leer oder nicht lesbar.",
        "csvNoValidRows": "In dieser CSV-Datei wurden keine gültigen Eingabeaufforderungszeilen gefunden.",
        "csvLoadedReplacement": "CSV geladen ({count} Eingabeaufforderung(en), {encoding}). Einige Charaktere müssen möglicherweise überprüft werden.",
        "csvLoadedDetail": "CSV geladen: {count} Eingabeaufforderung(en) bereit (Trennzeichen: {delimiter}, Kodierung: {encoding}). Überprüfen Sie es und klicken Sie dann auf „Zur Warteschlange hinzufügen“.",
        "csvImportFailed": "CSV-Import fehlgeschlagen: {message}",
        "csvImportCompleteTitle": "CSV-Import abgeschlossen.",
        "csvFoundPrompts": "Eingabeaufforderungen gefunden: {count}",
        "csvRowsNeedFixes": "Zeilen, die Korrekturen benötigen: {count}",
        "csvReviewFixRows": "Bitte überprüfen und korrigieren Sie die hervorgehobenen Zeilen.",
        "csvLoadedToEditor": "In Editor geladen: {count}",
        "csvReviewAddQueue": "Überprüfen Sie den Vorgang und klicken Sie auf „Zur Warteschlange hinzufügen“, wenn Sie fertig sind.",
        "reloadAssetsReselectVideoStart": "Laden Sie Flow-Assets neu und wählen Sie zunächst das Video-Startbild erneut aus.",
        "noCharactersFoundCreateFirst": "Keine Zeichen gefunden. Erstellen Sie zuerst einen Flow-Charakter und laden Sie ihn dann neu.",
        "clearedVideoQueue": "Video-Asset-Warteschlange gelöscht.",
        "importedFromReceiver": "Importierte {count}-Eingabeaufforderungen von der Empfängerseite.",
        "selectVideoAssetsFirst": "Wählen Sie zuerst Video-Assets aus.",
        "setVideoPromptScene01": "Legen Sie zunächst eine Videoansage für Szene 01 fest.",
        "openFlowProjectTabFirst": "Öffnen Sie zunächst einen Google Flow-Projekt-Tab.",
        "dryRunComplete": "Trockenlauf abgeschlossen. Startbild und Eingabeaufforderung wurden vorbereitet, ohne auf „Erstellen“ zu klicken.",
        "dryRunFailed": "Probelauf fehlgeschlagen: {message}",
        "reloadVideoAssetsFirst": "Laden Sie zuerst die Video-Assets neu.",
        "noSceneAssetsFound": "Im aktuellen Projekt wurden keine Assets mit Szenen-/Bildnummer gefunden.",
        "autoAddedVideoAssets": "Automatisch hinzugefügte {count} nummerierte Video-Assets.",
        "openFlowProjectTabWithPath": "Öffnen Sie zunächst einen Google Flow-Projekt-Tab (labs.google/fx/tools/flow/project/…).",
        "failedToLoadAssets": "Assets konnten nicht geladen werden.",
        "noAssetsFoundOpenAddMedia": "Keine Vermögenswerte gefunden. Öffnen Sie zunächst das Bedienfeld „Medien hinzufügen“.",
        "loadedFreshAssetsCleared": "{count} neue Assets geladen. Vorherige Referenzauswahl gelöscht.",
        "failedToLoadAssetsWithError": "Assets konnten nicht geladen werden: {message}",
        "failedToLoadCharacters": "Zeichen konnten nicht geladen werden.",
        "loadedCharacters": "{count} Zeichen geladen.",
        "failedToLoadCharactersWithError": "Zeichen konnten nicht geladen werden: {message}",
        "failedToLoadVideoAssets": "Video-Assets konnten nicht geladen werden.",
        "loadedVideoAssets": "{count} Video-Asset(s) geladen.",
        "failedToLoadVideoAssetsWithError": "Video-Assets konnten nicht geladen werden: {message}",
        "buttonsOnlyInFlowProject": "Diese Schaltflächen sind nur innerhalb eines Google Flow-Projekts verfügbar.",
        "runInsideProjectRequired": "Öffnen Sie zunächst eine Google Flow-Projektseite und führen Sie dann Eingabeaufforderungen innerhalb des Projekts aus.",
        "removedReferenceSelectedNow": "Referenzbild entfernt. Jetzt ausgewählt: {count}.",
        "oauthClientIdMissing": "Legen Sie zuerst oauth2.client_id in manifest.json fest.",
        "signingInGoogle": "Mit Google anmelden...",
        "signInCompleteSupport": "Anmeldung abgeschlossen. Der Bild-Downloader ist entsperrt.",
        "signedOutTokenClearFailed": "Vor Ort abgemeldet. Das Löschen des Browser-Token-Cache ist fehlgeschlagen.",
        "signedOut": "Abgemeldet.",
        "signInFailed": "Anmeldung fehlgeschlagen: {message}",
        "signOutFailed": "Abmeldung fehlgeschlagen: {message}",
        "flowButtonSyncFailed": "Die Synchronisierung der Schaltfläche „Flow {flowType}“ ist fehlgeschlagen. Laden Sie die Registerkarte „Flow“ neu und versuchen Sie es erneut.",
        "moveUp": "Hoch",
        "moveDown": "Runter",
        "edit": "Bearbeiten",
        "editVideoPrompt": "Videoaufforderung bearbeiten",
        "noPromptSpecified": "Keine Eingabeaufforderung angegeben",
        "unknownAsset": "Unbekannter Vermögenswert",
        "signingInShortStatus": "Google SSO: Anmelden...",
        "downloading": "Herunterladen...",
        "loading": "Laden...",
        "reloading": "Neuladen...",
        "loadFromFlow": "Aus Flow laden",
        "storyboardOverviewTitle": "Storyboard",
        "storyboardPrompt": "Prompt",
        "downloadPickerPremiumTitle": "Premium-Funktion – Freischaltung erforderlich",
        "recoveryCooldownTitle": "Warten auf Neustart",
        "recoveryPostReloadTitle": "Vorbereitung zum Neustart",
        "recoveryCooldownLabel": "Seitenaktualisierung in",
        "recoveryPostReloadLabel": "Warteschlangenneustart in",
        "recoveryCancel": "Stornieren",
        "recoveryCooldownMessage": "Google Flow hat drei aufeinanderfolgende Generationen blockiert. Während dieser 5-minütigen Sicherheitswartezeit werden keine neuen Anfragen gesendet. Google empfiehlt, alle VPNs oder Proxys auszuschalten.",
        "recoveryPostReloadMessage": "Flow wurde einmal aktualisiert. Es wird keine neue Anfrage gesendet, bis die 30-sekündige Vorbereitungswartezeit abgelaufen ist.",
        "recoveryCauseExplanation": "Hierbei handelt es sich um eine von Google Flow zurückgegebene serverseitige Einschränkung ungewöhnlicher Aktivitäten und nicht um einen internen App-Fehler. Die Häufigkeit der Anfragen, VPNs, Proxys oder die Aktivität des Google-Kontos können dazu beitragen.",
        "recoveryGoogleHelpLink": "Öffnen Sie das offizielle Google Flow-Hilfecenter",
        "recoveryOtherAccountTip": "Wenn das Problem weiterhin besteht, kann es hilfreich sein, sich von der Google Flow-Seite abzumelden und sich mit einem anderen Google-Konto anzumelden. Verwenden Sie nur ein Konto, das Sie besitzen, und befolgen Sie die Bedingungen von Google.",
        "recoveryCanceledMessage": "Automatische Wiederherstellung abgebrochen. Der Fehlerzähler wurde zurückgesetzt und die Warteschlange bleibt pausiert.",
        "randomizedDelay": "Zufällige Verzögerung",
        "randomizedDelayNote": "Wartet zwischen den Eingabeaufforderungen und zusätzlich wird eine zufällige Verzögerung hinzugefügt (Standardeinstellung 0–30 Sekunden), sodass Anfragen nicht perfekt automatisiert aussehen. Pausiert außerdem alle 20 Aufforderungen für zufällige 4–5 Minuten. Premium und darunter verwenden immer diese sicheren Standardeinstellungen. Profis können die folgenden Werte freischalten und anpassen.",
        "randomizedDelayJitter": "+Zufällige Verzögerung (Sekunden)",
        "randomizedDelayBreakEvery": "Unterbrechen Sie alle (Eingabeaufforderungen)",
        "randomizedDelayBreakMin": "Pause min (Minuten)",
        "randomizedDelayBreakMax": "Maximale Pause (Minuten)",
        "randomizedDelayProfessionalOnly": "Nur Professional – führen Sie ein Upgrade durch, um diese Werte anzupassen.",
        "starterQuotaValue": "{count}/{limit} heute",
        "starterQuotaResetHoursMinutes": "Wird in {hours}h {minutes}m zurückgesetzt",
        "starterQuotaResetHours": "Wird in {hours}h zurückgesetzt",
        "starterQuotaResetMinutes": "Wird in {minutes}m zurückgesetzt",
        "starterQuotaResetting": "Zurücksetzen…",
        "flowAccountDiagnostic": "Kompatibilität mit Google-Konten",
        "flowAccountDiagnosticNote": "Vergleicht das Chrome-Profilkonto mit dem aktuell in Google Flow geöffneten Konto. Dies dient nur der Diagnose und ändert nie den Zugriff.",
        "flowAccountDiagnosticButton": "Konten prüfen",
        "accessDeniedTitle": "NICHT ERLAUBT",
        "moveStarterAccessHere": "Starter-Zugriff hierher verschieben",
        "moveStarterAccessConfirm": "Starter-Zugriff auf diesen Browser verschieben? Das zuvor registrierte Starter-Konto kann Starter in diesem Browser nicht mehr verwenden.",
        "moveStarterAccessSuccess": "Der Starter-Zugriff wurde auf diesen Browser verschoben.",
        "moveStarterAccessFailed": "Der Starterzugang konnte nicht verschoben werden.",
        "upgradeToPremium": "Upgrade auf Premium",
        "useDifferentAccount": "Verwenden Sie ein anderes Konto"
    },
    "fr": {
        "premiumFeatureUnlockedHeader": "Premium débloqué",
        "premiumFeatureSupporter": "Devenez Supporter pour débloquer le statut d’Utilisateur Premium Dédié : vous conserverez un accès complet à toutes les fonctionnalités premium sans interruption.",
        "storyboard": "Storyboard avancé",
        "starterUsageBody": "Invites {count}/{limit} utilisées aujourd'hui",
        "starterQuotaNotEnough": "Il reste {remaining} à Starter aujourd'hui sur {limit}. Réduisez la file d’attente ou effectuez une mise à niveau.",
        "starterTier": "Démarreur",
        "premiumTier": "Prime",
        "professionalTier": "Professionnel",
        "subscribeSupportTitle": "Soutenez cet outil",
        "subscribeSupportNote": "Veuillez vous abonner à ma chaîne pour soutenir cet outil.",
        "subscriptionConfirmed": "Statut de l'abonnement : Confirmé",
        "tempTransferTitle": "Transfert d'image temporaire",
        "tempTransferDescription": "Préparez toutes les images ou vidéos visibles de la page actuelle pour le transfert vers le site récepteur.",
        "prepareTempImages": "Préparer des images temporaires",
        "openReceiverSite": "Ouvrir le site du récepteur",
        "bulkDownloaderTitle": "Téléchargeur d'images",
        "subscriberConfirmed": "Abonné confirmé : Oui/Non (à venir)",
        "subscriberVerifyNote": "La vérification s'exécutera régulièrement et désactivera les fonctionnalités de téléchargement si vous êtes désabonné.",
        "firebaseUid": "ID de l'utilisateur",
        "copyFirebaseUid": "Copie",
        "firebaseUidCopied": "ID utilisateur copié.",
        "firebaseUidCopyFailed": "Impossible de copier l'ID utilisateur. Veuillez le sélectionner et le copier manuellement.",
        "premiumLoginBanner": "Connectez-vous pour débloquer des fonctionnalités",
        "premiumFeatureLocked": "Fonctionnalité Premium - Déverrouillage requis",
        "professionalFeatureLocked": "Professionnel uniquement",
        "assetPremiumLocked": "Fonctionnalité Premium - Déverrouillage requis",
        "image": "Image",
        "portrait": "Portrait",
        "queueAction": "File d'attente et sélection",
        "promptPlaceholderVideoMultiline": "Collez vos invites vidéo ici, séparées par @@@NEXT@@@...",
        "generationAutoDownloadTitle": "Téléchargement automatique de génération",
        "upscaleDownload": "Télécharger 2K amélioré",
        "upscaleQualityPremium": "Prime : 2K",
        "upscaleQualityProfessional": "Professionnel : 4K",
        "upscaleDownloadLocked": "Fonctionnalité Premium - Déverrouillage requis",
        "upscaleDownloadNote": "Bêta : télécharge la version mise à l'échelle 2K après chaque image générée, attend qu'elle se termine, puis envoie l'invite suivante. Il est plus lent, n'est pas utilisé par les images de page de téléchargement et peut ne pas être parfait si Flow change.",
        "upscaleDownloadToolsDisabled": "Pas de prise en charge des images mises à l'échelle",
        "waitForImageResponse": "Attendez la réponse de l'image",
        "waitForImageResponseNote": "Lorsqu'elle est désactivée, la file d'attente passe à l'invite suivante juste après la soumission.",
        "promptDelay": "Retard rapide",
        "promptDelayNote": "Lorsqu'il est activé, attend les secondes sélectionnées avant d'envoyer l'invite suivante. Plage autorisée : 10 à 90 secondes (par pas de 10). Prime uniquement.",
        "promptDelayPremiumOnly": "La personnalisation du délai est disponible uniquement pour les utilisateurs Premium.",
        "promptDelaySeconds": "Secondes de retard (10-300)",
        "queuedWhileRunning": "Ajouté à la file d'attente. La génération actuelle continuera.",
        "queueCompletedAddMore": "File d'attente terminée. Ajoutez de nouvelles invites ou effacez la file d'attente.",
        "theme": "Thème",
        "themeDefault": "Défaut",
        "themeLogo": "Logo",
        "themeDark": "Sombre",
        "remoteNotificationDefaultTitle": "Avis de prolongation",
        "remoteNotificationConfirm": "J'ai compris",
        "remoteNotificationVersion": "Version {version}",
        "queueAssetsTitle": "Actifs par invite",
        "queueAssetsInherited": "Les actifs actuels sont copiés dans chaque élément de file d'attente.",
        "perPromptAssetsNote": "Déverrouillage Premium requis. Sélectionnez les images de caractères/de référence ci-dessus, activez cette option, cliquez sur File d'attente et sélection, puis choisissez les ressources pour chaque invite.",
        "perPromptAssetsUnlockRequired": "Déverrouillage requis",
        "perPromptAssetsUnlocked": "Premium débloqué",
        "perPromptAssetsLocked": "Fonctionnalité Premium - Déverrouillage requis",
        "perPromptAssetsLockedDetail": "Utilisez des images de caractères/de référence différentes pour chaque invite.",
        "videoMultilinePromptUnlockRequired": "Déverrouillage requis",
        "videoMultilinePromptLocked": "Fonctionnalité professionnelle – Déverrouillage requis",
        "videoMultilinePromptLockedDetail": "Utilisez des invites multilignes séparées par @@@NEXT@@@.",
        "videoMultilinePrompt": "Utiliser une invite multiligne",
        "videoMultilinePromptNote": "Permet d'écrire des invites multilignes pour le mode vidéo, en séparant les éléments de la file d'attente par @@@NEXT@@@.",
        "promptAssetsHint": "Le personnage actuel et les images de référence sont copiés dans chaque invite une fois ajoutés. Utilisez les boutons de file d'attente pour modifier les ressources par invite avant de les exécuter.",
        "reviewPromptAssetsBeforeStart": "Invites ajoutées. Examinez les ressources par invite ci-dessous, puis cliquez à nouveau sur Démarrer.",
        "queueCharacterButton": "Modifier le personnage",
        "queueImagesButton": "Modifier les images",
        "queueAddCharacterButton": "+ Caractère",
        "queueAddImagesButton": "+ Images",
        "queueNoCharacter": "Aucun personnage",
        "queueNoImages": "Aucune image",
        "queueSelectTopCharacterFirst": "Sélectionnez d'abord un personnage en haut.",
        "queueSelectTopImagesFirst": "Sélectionnez d'abord les images de référence en haut.",
        "queueAssetPickerCharacterTitle": "Sélectionnez un caractère pour cette invite",
        "queueAssetPickerImagesTitle": "Sélectionnez des images pour cette invite",
        "queueAssetPickerSubtitle": "Choisissez parmi les actifs sélectionnés en haut. Cliquez sur les vignettes pour les sélectionner ou les supprimer.",
        "queueVideoIngredientPickerSubtitle": "{selected} / {max} sélectionné : cliquez sur les vignettes pour basculer, puis appuyez sur Terminé.",
        "queueVideoIngredientPickerMax": "Maximum {max} ingrédients atteint.",
        "queueAssetPickerDone": "Fait",
        "queueCharacterSet": "Caractère : {name}",
        "queueCharactersSet": "Caractères : {count}",
        "queueImagesSet": "Images : {count}",
        "premiumRequiredForVideoMode": "La fonctionnalité Premium déverrouillée est requise pour changer de mode vidéo.",
        "videoAssetQueueTitle": "Actifs vidéo",
        "videoAssetQueueHelpText": "Sélectionnez les images à utiliser pour les invites vidéo. Chaque invite en file d'attente peut utiliser des ingrédients ou des images.",
        "videoModeFrames": "Cadres",
        "videoModeIngredients": "Ingrédients",
        "videoModeHelp": "Choisissez le modèle vidéo ici. Chaque invite en file d'attente choisit séparément les ingrédients ou les images.",
        "videoModel": "Modèle vidéo",
        "videoVoiceLabel": "Voix",
        "videoVoicePlaceholder": "Andrew ou @Voice : Andrew",
        "videoVoiceIncompatible": "La voix est utilisée uniquement avec Omni Flash Ingredients.",
        "videoOmniEndFrameWarning": "Omni Flash ne prend pas en charge une image de fin. La sélection de l’image de fin est désactivée.",
        "videoModeUnsupportedByModel": "Le modèle vidéo sélectionné ne prend pas en charge ce mode.",
        "videoCreditsConfirm": "La génération vidéo utilisera les crédits Flow. Veuillez confirmer avant de courir.",
        "videoFrameStartRequired": "Sélectionnez une image de départ avant d’exécuter Frames to Video.",
        "videoIngredientsRequired": "Sélectionnez au moins une image d'ingrédient avant d'exécuter Ingrédients vers vidéo.",
        "videoIngredientsMaxReached": "Ingrédients to Video prend en charge jusqu'à 3 images par invite.",
        "videoModeRequired": "Choisissez Ingrédients ou Images pour chaque invite vidéo avant de l'exécuter.",
        "videoSelectAssetsFirst": "Sélectionnez d'abord les ressources vidéo ci-dessus.",
        "queueVideoIngredientsTitle": "Sélectionnez les ingrédients pour cette invite",
        "queueVideoStartFrameTitle": "Sélectionnez l'image de début pour cette invite",
        "queueVideoEndFrameTitle": "Sélectionnez l'image de fin pour cette invite",
        "queueVideoIngredientsButton": "+ Ingrédients",
        "queueVideoStartButton": "Image de départ",
        "queueVideoEndButton": "Image de fin",
        "videoThumbIngredientLabel": "Ingrédient",
        "videoThumbStartLabel": "Commencer",
        "videoThumbEndLabel": "Fin",
        "queueVideoModeLabel": "Mode",
        "queueVideoDurationLabel": "Durée",
        "queueChooseVideoMode": "Choisissez des ingrédients ou des cadres",
        "noStartFrame": "Pas de trame de départ",
        "languageHindi": "hindi",
        "uploadCsv": "Télécharger un fichier CSV",
        "csvGuideBtn": "Guide CSV",
        "openPicker": "Ouvrir le sélecteur",
        "openFullPicker": "Ouvrir le sélecteur complet",
        "reset": "Réinitialiser",
        "remove": "Retirer",
        "add": "Ajouter",
        "dryRun": "Essai à sec",
        "reloadAssets": "Recharger les actifs",
        "characterTitle": "Personnage",
        "characterHelpText": "Choisissez un ou plusieurs personnages Flow créés. Le mode par invite peut choisir parmi ces caractères sélectionnés.",
        "referenceAssetTitle": "Actif de référence",
        "referenceAssetHelpText": "Choisissez une ou plusieurs images de référence pour le mode image. Cela reste séparé de la file d'attente vidéo.",
        "referenceAssetTwoImageNote": "Veuillez utiliser 2 images dès maintenant. Si une image ne peut pas être trouvée, il se peut que le projet contienne trop d'images. Veuillez utiliser un nouveau projet.",
        "csvUploadHint": "Téléchargez un CSV pour charger les lignes d'invite dans l'éditeur, examinez-les/corrigez-les, puis ajoutez-les à la file d'attente.",
        "queueAutoResetNote": "Remarque : La file d'attente est automatiquement réinitialisée toutes les 24 heures.",
        "csvGuideMessage": "Guide CSV\n\nLe téléchargement CSV lit d'abord les lignes d'invite dans l'éditeur. Il ne se met pas automatiquement en file d'attente.\n\nUtilisez CSV lorsque :\n- Vous disposez de nombreuses invites à ajouter rapidement.\n- Vous souhaitez que les lignes scène par scène soient gérées dans une feuille de calcul.\n\nFormat simple :\n- Une invite par ligne.\n- Utilisez un en-tête d'invite si possible (par exemple : invite / invite d'image / invite de texte).\n- UTF-8 est recommandé, mais d'autres encodages sont également détectés.\n\nÉtapes rapides :\n1. Préparez vos invites dans un fichier CSV.\n2. Importez le CSV dans l'extension.\n3. Corrigez les lignes d'invite en surbrillance si des problèmes sont détectés.\n4. Examinez les invites détectées dans l'éditeur.\n5. Cliquez sur \"Ajouter à la file d'attente\" et démarrez l'automatisation.\n\nRemarques :\n- Le fichier CSV sélectionné est supprimé juste après l'importation.\n- Si des lignes sont brisées, laissez une ligne problématique vide pour l'ignorer.",
        "cleanupStaleItemsConfirm": "{count} les éléments terminés/échoués sont stockés. Les supprimer maintenant ?",
        "noQueueItemsToRun": "Veuillez d'abord saisir des invites ou ajouter des éléments à la file d'attente.",
        "promptNotFound": "Invite introuvable",
        "flowCharacter": "Caractère de flux",
        "flowAsset": "Actif de flux",
        "orderLabel": "Commande {count}",
        "characterN": "Caractère {count}",
        "pickerVideoTitle": "Sélecteur de ressources vidéo",
        "pickerCharacterTitle": "Sélecteur de personnage",
        "pickerReferenceTitle": "Sélecteur d'actifs de référence",
        "pickerAvailableVideoAssets": "Ressources vidéo disponibles",
        "pickerAvailableCharacters": "Caractères disponibles",
        "pickerAvailableAssets": "Actifs disponibles",
        "pickerSelectedVideoAssets": "Actifs vidéo sélectionnés",
        "pickerSelectedCharacter": "Caractère sélectionné",
        "pickerSelectedCharacters": "Personnages sélectionnés",
        "pickerSelectedReferenceImages": "Images de référence sélectionnées",
        "pickerSaveVideoQueue": "Enregistrer la file d'attente vidéo",
        "pickerUseCharacter": "Utiliser le personnage",
        "pickerUseSelected": "Utiliser la sélection",
        "pickerVideoSummarySelected": "{count} élément(s) vidéo sélectionné(s).",
        "pickerVideoSummaryEmpty": "Déplacez les ressources vidéo de la gauche vers la file d’attente de droite.",
        "pickerCharacterSummarySelected": "{count} caractère(s) sélectionné(s).",
        "pickerCharacterSummaryEmpty": "Déplacez un ou plusieurs personnages créés de la gauche vers la liste sélectionnée à droite.",
        "pickerReferenceSummarySelected": "{count} image(s) de référence sélectionnée(s).",
        "pickerReferenceSummaryEmpty": "Déplacez les images de référence de la gauche vers la liste sélectionnée à droite.",
        "pickerNoAssetsAvailable": "Aucun actif disponible. Utilisez « Recharger les actifs » pour les récupérer.",
        "pickerSelectedVideoEmpty": "Les ressources vidéo sélectionnées apparaîtront ici.",
        "pickerSelectedCharacterEmpty": "Les caractères sélectionnés apparaîtront ici.",
        "pickerSelectedReferenceEmpty": "Les images de référence sélectionnées apparaîtront ici.",
        "openProjectTabFirst": "Ouvrez d'abord l'onglet du projet Google Flow cible, puis réessayez Ouvrir le sélecteur.",
        "csvImportCanceled": "Importation CSV annulée. Aucune invite n'a été mise en file d'attente.",
        "csvNoValidPrompts": "Aucune invite valide à importer. Ajoutez au moins une invite ou annulez.",
        "csvLoadedReady": "CSV chargé : invite(s) {count} prête(s). Vérifiez, puis cliquez sur \"Ajouter à la file d'attente\".{details}",
        "csvLoadedWithIssues": "CSV chargé avec le(s) problème(s) {count}. Corrigez les invites en surbrillance et appliquez.",
        "csvEmptyUnreadable": "Le CSV est vide ou illisible.",
        "csvNoValidRows": "Aucune ligne d'invite valide n'a été trouvée dans ce CSV.",
        "csvLoadedReplacement": "CSV chargé (invite(s) {count}, {encoding}). Certains personnages peuvent avoir besoin d'être révisés.",
        "csvLoadedDetail": "CSV chargé : invite(s) {count} prête(s) (délimiteur : {delimiter}, encodage : {encoding}). Vérifiez, puis cliquez sur \"Ajouter à la file d'attente\".",
        "csvImportFailed": "Échec de l'importation CSV : {message}",
        "csvImportCompleteTitle": "Importation CSV terminée.",
        "csvFoundPrompts": "Invites trouvées : {count}",
        "csvRowsNeedFixes": "Lignes nécessitant des correctifs : {count}",
        "csvReviewFixRows": "Veuillez examiner et corriger les lignes en surbrillance.",
        "csvLoadedToEditor": "Chargé dans l'éditeur : {count}",
        "csvReviewAddQueue": "Vérifiez et cliquez sur \"Ajouter à la file d'attente\" lorsque vous êtes prêt.",
        "reloadAssetsReselectVideoStart": "Rechargez les ressources Flow et resélectionnez d'abord l'image de démarrage de la vidéo.",
        "noCharactersFoundCreateFirst": "Aucun personnage trouvé. Créez d’abord un personnage Flow, puis rechargez.",
        "clearedVideoQueue": "File d’attente des ressources vidéo effacée.",
        "importedFromReceiver": "Invites {count} importées à partir de la page du récepteur.",
        "selectVideoAssetsFirst": "Sélectionnez d'abord les ressources vidéo.",
        "setVideoPromptScene01": "Définissez d'abord une invite vidéo pour la scène 01.",
        "openFlowProjectTabFirst": "Ouvrez d'abord un onglet de projet Google Flow.",
        "dryRunComplete": "Essai à sec terminé. L'image de démarrage et l'invite ont été préparées sans appuyer sur Créer.",
        "dryRunFailed": "Échec de l'exécution à sec : {message}",
        "reloadVideoAssetsFirst": "Rechargez d’abord les ressources vidéo.",
        "noSceneAssetsFound": "Aucune ressource numérotée de scène/image trouvée dans le projet actuel.",
        "autoAddedVideoAssets": "Éléments vidéo numérotés {count} ajoutés automatiquement.",
        "openFlowProjectTabWithPath": "Ouvrez d'abord un onglet de projet Google Flow (labs.google/fx/tools/flow/project/…).",
        "failedToLoadAssets": "Échec du chargement des ressources.",
        "noAssetsFoundOpenAddMedia": "Aucun élément trouvé. Ouvrez d'abord le panneau Ajouter un média.",
        "loadedFreshAssetsCleared": "Chargé de nouveaux actifs {count}. Sélection de référence précédente effacée.",
        "failedToLoadAssetsWithError": "Échec du chargement des éléments : {message}",
        "failedToLoadCharacters": "Échec du chargement des caractères.",
        "loadedCharacters": "Caractère(s) {count} chargé(s).",
        "failedToLoadCharactersWithError": "Échec du chargement des caractères : {message}",
        "failedToLoadVideoAssets": "Échec du chargement des ressources vidéo.",
        "loadedVideoAssets": "Ressource(s) vidéo {count} chargée(s).",
        "failedToLoadVideoAssetsWithError": "Échec du chargement des éléments vidéo : {message}",
        "buttonsOnlyInFlowProject": "Ces boutons ne sont disponibles que dans un projet Google Flow.",
        "runInsideProjectRequired": "Ouvrez d'abord une page de projet Google Flow, puis exécutez des invites depuis le projet.",
        "removedReferenceSelectedNow": "Image de référence supprimée. Sélectionné maintenant : {count}.",
        "oauthClientIdMissing": "Définissez d'abord oauth2.client_id dans manifest.json.",
        "signingInGoogle": "Connexion avec Google...",
        "signInCompleteSupport": "Connexion terminée. Le téléchargeur d'images est déverrouillé.",
        "signedOutTokenClearFailed": "Déconnecté localement. Échec de la suppression du cache des jetons du navigateur.",
        "signedOut": "Déconnecté.",
        "signInFailed": "Échec de la connexion : {message}",
        "signOutFailed": "Échec de la déconnexion : {message}",
        "flowButtonSyncFailed": "La synchronisation du bouton Flow {flowType} a échoué. Rechargez l'onglet Flux et réessayez.",
        "moveUp": "En haut",
        "moveDown": "Vers le bas",
        "edit": "Modifier",
        "editVideoPrompt": "Modifier l'invite vidéo",
        "noPromptSpecified": "Aucune invite spécifiée",
        "unknownAsset": "Actif inconnu",
        "signingInShortStatus": "Google SSO : connexion...",
        "downloading": "Téléchargement...",
        "loading": "Chargement...",
        "reloading": "Rechargement...",
        "loadFromFlow": "Charger à partir du flux",
        "storyboardOverviewTitle": "Scénario",
        "storyboardScene": "Image {count}",
        "storyboardPrompt": "Rapide",
        "storyboardImage": "Image",
        "downloadPickerPremiumTitle": "Fonctionnalité Premium - Déverrouillage requis",
        "recoveryCooldownTitle": "En attente de redémarrage",
        "recoveryPostReloadTitle": "Préparation du redémarrage",
        "recoveryCooldownLabel": "Actualisation de la page dans",
        "recoveryPostReloadLabel": "Redémarrage de la file d'attente dans",
        "recoveryCancel": "Annuler",
        "recoveryCooldownMessage": "Google Flow a bloqué trois générations consécutives. Aucune nouvelle demande ne sera envoyée pendant cette attente de sécurité de 5 minutes. Google recommande de désactiver tout VPN ou proxy.",
        "recoveryPostReloadMessage": "Flow a été actualisé une fois. Aucune nouvelle demande ne sera envoyée avant la fin du délai de préparation de 30 secondes.",
        "recoveryCauseExplanation": "Il s'agit d'une restriction d'activité inhabituelle côté serveur renvoyée par Google Flow, et non d'une erreur interne de l'application. La fréquence des requêtes, les VPN, les proxys ou l'activité du compte Google peuvent y contribuer.",
        "recoveryGoogleHelpLink": "Ouvrez le centre d'aide officiel de Google Flow",
        "recoveryOtherAccountTip": "Si le problème persiste, vous pouvez vous déconnecter de la page Google Flow et vous connecter avec un autre compte Google. Utilisez uniquement un compte que vous possédez et suivez les conditions de Google.",
        "recoveryCanceledMessage": "Récupération automatique annulée. Le compteur d'échecs a été réinitialisé et la file d'attente reste en pause.",
        "randomizedDelay": "Délai randomisé",
        "randomizedDelayNote": "Attend entre les invites, plus un délai aléatoire ajouté en plus (0 à 30 secondes par défaut) afin que les demandes ne semblent pas parfaitement automatisées. Met également en pause toutes les 20 invites pendant 4 à 5 minutes aléatoires. Premium et inférieur utilisent toujours ces valeurs par défaut sûres. Le professionnel peut déverrouiller et personnaliser les valeurs ci-dessous.",
        "randomizedDelayJitter": "+Délai aléatoire (secondes)",
        "randomizedDelayBreakEvery": "Casser chaque (invites)",
        "randomizedDelayBreakMin": "Pause min (minutes)",
        "randomizedDelayBreakMax": "Pause maximale (minutes)",
        "randomizedDelayProfessionalOnly": "Professionnel uniquement : effectuez une mise à niveau pour personnaliser ces valeurs.",
        "starterQuotaValue": "{count}/{limit} aujourd'hui",
        "starterQuotaResetHoursMinutes": "Réinitialisation dans {hours}h {minutes}m",
        "starterQuotaResetHours": "Réinitialisation dans {hours}h",
        "starterQuotaResetMinutes": "Réinitialisation dans {minutes}m",
        "starterQuotaResetting": "Réinitialisation…",
        "flowAccountDiagnostic": "Compatibilité des comptes Google",
        "flowAccountDiagnosticNote": "Compare le compte de profil Chrome avec le compte actuellement ouvert dans Google Flow. Il s'agit uniquement d'un diagnostic et ne modifie jamais l'accès.",
        "flowAccountDiagnosticButton": "Chèques comptes",
        "accessDeniedTitle": "NON AUTORISÉ",
        "moveStarterAccessHere": "Déplacer l'accès Starter ici",
        "moveStarterAccessConfirm": "Déplacer l'accès Starter vers ce navigateur ? Le compte Starter précédemment enregistré ne pourra plus utiliser Starter sur ce navigateur.",
        "moveStarterAccessSuccess": "L'accès Starter a été déplacé vers ce navigateur.",
        "moveStarterAccessFailed": "L'accès au démarreur n'a pas pu être déplacé.",
        "upgradeToPremium": "Passer à Premium",
        "useDifferentAccount": "Utiliser un autre compte"
    },
    "hi": {
        "premiumFeature": "प्रीमियम सुविधा",
        "premiumFeatureUnlockedHeader": "प्रीमियम अनलॉक",
        "premiumFeatureKicker": "प्रीमियम एक्सेस",
        "premiumFeatureTitle": "प्रीमियम सुविधा",
        "premiumFeatureMessage": "पात्र पंजीकृत उपयोगकर्ताओं या सक्रिय ग्राहकों के लिए प्रीमियम सुविधाएँ उपलब्ध हैं।",
        "premiumFeatureFeedback": "Google Flow Automator एक मुफ़्त टूल है, और आपका समर्थन हमें इसे बेहतर बनाने में मदद करता है। यदि आप टूल का उपयोग करने का आनंद लेते हैं, तो हम Chrome वेब स्टोर पर आपकी ईमानदार प्रतिक्रिया या समीक्षा की वास्तव में सराहना करेंगे। ईमानदार समीक्षाएँ अधिक उपयोगकर्ताओं को टूल खोजने और इस प्रोजेक्ट को आगे बढ़ाने में मदद करती हैं।",
        "premiumFeatureYoutube": "आप इस टूल का समर्थन करने और अपडेट का पालन करने के लिए यूट्यूब चैनल की सदस्यता भी ले सकते हैं।",
        "premiumFeatureManual": "समीक्षा छोड़ना पूरी तरह से वैकल्पिक है और प्रीमियम पहुंच की गारंटी नहीं देता है। पात्रता की स्वचालित रूप से जांच की जाएगी, और यदि आवश्यकताएं पूरी नहीं होती हैं तो प्रीमियम पहुंच को अद्यतन या रद्द किया जा सकता है।",
        "premiumFeatureSupporter": "समर्पित प्रीमियम उपयोगकर्ता स्थिति को अनलॉक करने के लिए एक समर्थक बनें - आप बिना किसी रुकावट के सभी प्रीमियम सुविधाओं तक पूर्ण पहुंच बनाए रखेंगे।",
        "premiumFeatureForm": "एक्सेस फॉर्म का अनुरोध करें",
        "premiumFeatureReview": "Chrome वेब स्टोर खोलें",
        "premiumFeatureClose": "बंद करना",
        "storyboard": "उन्नत स्टोरीबोर्ड",
        "starterUsageBody": "{count}/{limit} संकेत आज उपयोग किए जाते हैं",
        "starterQuotaNotEnough": "स्टार्टर के पास आज {limit} में से {remaining} प्रॉम्प्ट बचे हैं। कतार कम करें या अपग्रेड करें.",
        "profileQuota": "शीघ्र पहुंच",
        "profileTrialAccess": "परीक्षण पहुंच",
        "starterTier": "स्टार्टर",
        "premiumTier": "अधिमूल्य",
        "premiumRequiredMembership": "प्रीमियम आवश्यक",
        "professionalTier": "पेशेवर",
        "upgrade": "उन्नत करना",
        "upgraded": "उन्नत",
        "settingsAccount": "खाता",
        "subscribeSupportTitle": "इस टूल का समर्थन करें",
        "subscribeSupportNote": "कृपया इस टूल का समर्थन करने के लिए मेरे चैनल को सब्सक्राइब करें।",
        "subscribeOnYoutube": "यूट्यूब पर सदस्यता लें",
        "subscriptionConfirmed": "सदस्यता स्थिति: पुष्टि की गई",
        "tempTransferTitle": "अस्थायी छवि स्थानांतरण",
        "tempTransferDescription": "रिसीवर साइट पर स्थानांतरण के लिए वर्तमान पृष्ठ से सभी दृश्यमान छवियां या वीडियो तैयार करें।",
        "prepareTempImages": "अस्थायी छवियाँ तैयार करें",
        "openReceiverSite": "रिसीवर साइट खोलें",
        "bulkDownloaderTitle": "छवि डाउनलोडर",
        "subscriberConfirmed": "पुष्टिकृत ग्राहक: हाँ/नहीं (जल्द ही आ रहा है)",
        "subscriberVerifyNote": "यदि आपने सदस्यता समाप्त कर दी है तो सत्यापन नियमित रूप से चलेगा और डाउनलोड सुविधाएँ अक्षम कर देगा।",
        "signInGoogle": "Google से साइन इन करें",
        "signInShort": "Google से साइन इन करें",
        "signOut": "साइन आउट",
        "ssoSignedIn": "Google SSO: साइन इन किया गया",
        "emailSignedIn": "ईमेल: साइन इन किया गया",
        "ssoSignedOut": "Google SSO: साइन आउट हो गया",
        "firebaseUid": "उपयोगकर्ता पहचान",
        "copyFirebaseUid": "प्रतिलिपि",
        "firebaseUidCopied": "उपयोगकर्ता आईडी की प्रतिलिपि बनाई गई.",
        "firebaseUidCopyFailed": "उपयोगकर्ता आईडी की प्रतिलिपि नहीं बनाई जा सकी. कृपया इसे मैन्युअल रूप से चुनें और कॉपी करें।",
        "unlockSsoBtn": "मैंने साइन इन किया - जारी रखें",
        "subscribeGate": "कृपया मेरे टूल का समर्थन करने के लिए मेरे चैनल को सब्सक्राइब करें। इस ऐप की अनुमति केवल मेरे ग्राहकों के लिए होगी, जो अभी भी उपयोग के लिए निःशुल्क है :)",
        "subscribeBtn": "सदस्यता लें",
        "unlockBtn": "मैंने सदस्यता ली - अनलॉक",
        "lockNote": "Google SSO द्वारा सुविधा को अनलॉक करें।",
        "ssoLocked": "जारी रखने के लिए Google SSO के साथ साइन इन करें।",
        "premiumLoginBanner": "सुविधाओं को अनलॉक करने के लिए लॉगिन करें",
        "premiumFeatureLocked": "प्रीमियम सुविधा - अनलॉक आवश्यक",
        "professionalFeatureLocked": "केवल पेशेवर",
        "assetPremiumLocked": "प्रीमियम सुविधा - अनलॉक आवश्यक",
        "subscribeLocked": "कृपया मेरे टूल का समर्थन करने के लिए मेरे चैनल को सब्सक्राइब करें। इस ऐप की अनुमति केवल मेरे ग्राहकों के लिए होगी, जो अभी भी उपयोग के लिए निःशुल्क है :)",
        "unlocked": "अनलॉक किया",
        "comingSoon": "जल्द आ रहा है",
        "outputType": "उत्पादन का प्रकार",
        "formFactor": "बनाने का कारक",
        "landscape": "परिदृश्य",
        "portrait": "चित्र",
        "batchSize": "बैच का आकार",
        "generationModel": "जनरेशन मॉडल",
        "characterId": "चरित्र पहचान",
        "characterPlaceholder": "लगातार बने रहने के लिए किसी चरित्र का वर्णन करें...",
        "queueAction": "कतारबद्ध करें और चुनें",
        "promptPlaceholder": "खाली पंक्तियों से अलग करके अपने संकेत यहां चिपकाएं...",
        "promptPlaceholderVideoMultiline": "अपना वीडियो संकेत यहां @@@NEXT@@@ से अलग करके चिपकाएं...",
        "autoDownload": "छवि निर्माण के बाद स्वतः डाउनलोड",
        "upscaleQualityPremium": "प्रीमियम: 2K",
        "upscaleQualityProfessional": "पेशेवर: 4K",
        "upscaleDownloadLocked": "प्रीमियम सुविधा - अनलॉक आवश्यक",
        "upscaleDownloadToolsDisabled": "उन्नत छवियों के लिए समर्थन नहीं",
        "waitForImageResponse": "छवि प्रतिक्रिया की प्रतीक्षा करें",
        "waitForImageResponseNote": "बंद होने पर, कतार सबमिट करने के ठीक बाद अगले प्रॉम्प्ट पर चली जाती है।",
        "promptDelayPremiumOnly": "विलंब अनुकूलन केवल प्रीमियम उपयोगकर्ताओं के लिए उपलब्ध है।",
        "tasks": "कार्य",
        "noActiveTasks": "कोई सक्रिय कार्य नहीं.",
        "queuedWhileRunning": "कतार में जोड़ा गया. वर्तमान पीढ़ी जारी रहेगी.",
        "queueCompletedAddMore": "कतार पूरी हुई. नए संकेत जोड़ें या कतार साफ़ करें.",
        "stopActiveTask": "सक्रिय कार्य बंद करें",
        "downloadTools": "उपकरण डाउनलोड करें",
        "downloadPageImages": "पेज छवियाँ डाउनलोड करें",
        "themeDefault": "गलती करना",
        "themeLogo": "प्रतीक चिन्ह",
        "themeDark": "अँधेरा",
        "concurrentProcessing": "समवर्ती प्रसंस्करण",
        "staggerDelay": "लड़खड़ाती देरी",
        "generationTimeout": "जनरेशन टाइमआउट (एम)",
        "retryCount": "गिनती पुनः प्रयास करें",
        "importCsvSoon": "सीएसवी आयात करें (जल्द ही आ रहा है)",
        "disabled": "अक्षम",
        "failedLog": "विफल कार्य लॉग (पिछले 24 घंटे)",
        "noRecentErrors": "कोई हालिया त्रुटि नहीं.",
        "editPrompt": "शीघ्र संपादित करें",
        "saveChanges": "परिवर्तनों को सुरक्षित करें",
        "cancel": "रद्द करना",
        "restrictedText": "यह ऑटोमेटर केवल Google Flow प्रोजेक्ट पेजों पर काम करता है।",
        "restrictedFooter": "कृपया शुरू करने के लिए एक प्रोजेक्ट खोलें या बनाएं।",
        "goToFlow": "गूगल फ़्लो पर जाएँ",
        "pleaseEnterPrompts": "कृपया पहले कुछ संकेत दर्ज करें.",
        "confirmClearQueue": "संपूर्ण कतार साफ़ करें और स्थिति रीसेट करें?",
        "onlyProjectPage": "डाउनलोड पेज छवियाँ केवल फ़्लो प्रोजेक्ट पेज के अंदर ही उपलब्ध है।",
        "confirmDeleteTask": "यह कार्य हटाएं?",
        "runningQueue": "चल रही कतार...",
        "queueFinished": "कतार ख़त्म.",
        "stopping": "रुकना...",
        "stopped": "रुक गया.",
        "finished": "खत्म।",
        "refreshingConnectionMsg": "ताज़ा कनेक्शन...",
        "remoteNotificationDefaultTitle": "विस्तार सूचना",
        "remoteNotificationConfirm": "समझ गया",
        "remoteNotificationVersion": "संस्करण {version}",
        "queueAssetsTitle": "प्रति-प्रॉम्प्ट संपत्ति",
        "queueAssetsInherited": "वर्तमान संपत्तियों को प्रत्येक कतार आइटम में कॉपी किया जाता है।",
        "perPromptAssets": "प्रति संकेत विभिन्न परिसंपत्तियों का उपयोग करें",
        "perPromptAssetsNote": "प्रीमियम अनलॉक आवश्यक है. ऊपर वर्ण/संदर्भ छवियों का चयन करें, इसे चालू करें, कतार और चयन पर क्लिक करें, फिर प्रत्येक संकेत के लिए संपत्ति चुनें।",
        "perPromptAssetsUnlockRequired": "अनलॉक आवश्यक",
        "perPromptAssetsUnlocked": "प्रीमियम अनलॉक",
        "perPromptAssetsLocked": "प्रीमियम सुविधा - अनलॉक आवश्यक",
        "perPromptAssetsLockedDetail": "प्रत्येक प्रॉम्प्ट के लिए अलग-अलग वर्ण/संदर्भ छवियों का उपयोग करें।",
        "videoMultilinePromptUnlockRequired": "अनलॉक आवश्यक",
        "videoMultilinePromptLocked": "व्यावसायिक विशेषता - अनलॉक आवश्यक",
        "videoMultilinePromptLockedDetail": "@@@NEXT@@@ द्वारा अलग किए गए बहु-पंक्ति संकेतों का उपयोग करें।",
        "videoMultilinePrompt": "मल्टी-लाइन प्रॉम्प्ट का उपयोग करें",
        "videoMultilinePromptNote": "वीडियो मोड के लिए मल्टी-लाइन संकेत लिखने की अनुमति देता है, कतार आइटम को @@@NEXT@@@ से अलग करता है।",
        "promptAssetsHint": "जोड़े जाने पर वर्तमान चरित्र और संदर्भ छवियों को प्रत्येक प्रॉम्प्ट में कॉपी किया जाता है। चलने से पहले प्रति प्रॉम्प्ट संपत्तियों को संपादित करने के लिए कतार बटन का उपयोग करें।",
        "reviewPromptAssetsBeforeStart": "संकेत जोड़े गए. नीचे प्रति-संकेत संपत्तियों की समीक्षा करें, फिर दोबारा प्रारंभ करें पर क्लिक करें।",
        "queueCharacterButton": "चरित्र संपादित करें",
        "queueImagesButton": "छवियाँ संपादित करें",
        "queueAddCharacterButton": "+ चरित्र",
        "queueAddImagesButton": "+ छवियाँ",
        "queueNoCharacter": "कोई चरित्र नहीं",
        "queueNoImages": "कोई चित्र नहीं",
        "queueSelectTopCharacterFirst": "सबसे पहले शीर्ष पर एक वर्ण चुनें.",
        "queueSelectTopImagesFirst": "सबसे पहले शीर्ष पर संदर्भ छवियों का चयन करें।",
        "queueAssetPickerCharacterTitle": "इस संकेत के लिए चरित्र का चयन करें",
        "queueAssetPickerImagesTitle": "इस संकेत के लिए छवियाँ चुनें",
        "queueAssetPickerSubtitle": "शीर्ष पर चयनित संपत्तियों में से चुनें। चुनने या हटाने के लिए थंबनेल पर क्लिक करें।",
        "queueVideoIngredientPickerSubtitle": "{selected} / {max} चयनित - टॉगल करने के लिए थंबनेल पर क्लिक करें, फिर पूर्ण पर टैप करें।",
        "queueVideoIngredientPickerMax": "अधिकतम {max} सामग्रियां पहुंच गईं.",
        "queueAssetPickerDone": "हो गया",
        "queueCharacterSet": "चरित्र: {name}",
        "queueCharactersSet": "पात्र: {count}",
        "queueImagesSet": "छवियाँ: {count}",
        "premiumRequiredForVideoMode": "वीडियो मोड बदलने के लिए प्रीमियम फ़ीचर अनलॉक की आवश्यकता है।",
        "videoAssetQueueTitle": "वीडियो संपत्ति",
        "videoAssetQueueHelpText": "वीडियो संकेतों के लिए उपयोग करने के लिए छवियों का चयन करें। प्रत्येक पंक्तिबद्ध प्रॉम्प्ट सामग्री या फ़्रेम का उपयोग कर सकता है।",
        "videoModeFrames": "फ्रेम्स",
        "videoModeIngredients": "सामग्री",
        "videoModeHelp": "यहां वीडियो मॉडल चुनें. प्रत्येक कतारबद्ध संकेत या तो सामग्री या फ़्रेम को अलग से चुनता है।",
        "videoModel": "वीडियो मॉडल",
        "videoVoiceLabel": "आवाज़",
        "videoVoicePlaceholder": "एंड्रयू या @आवाज़: एंड्रयू",
        "videoVoiceIncompatible": "वॉयस का उपयोग केवल ओमनी फ्लैश सामग्री के साथ किया जाता है।",
        "videoOmniEndFrameWarning": "ओमनी फ़्लैश किसी अंतिम फ़्रेम का समर्थन नहीं करता है. अंतिम फ़्रेम चयन अक्षम है.",
        "videoModeUnsupportedByModel": "चयनित वीडियो मॉडल इस मोड का समर्थन नहीं करता है.",
        "videoCreditsConfirm": "वीडियो जेनरेशन फ़्लो क्रेडिट का उपयोग करेगा. कृपया चलाने से पहले पुष्टि करें.",
        "videoFrameStartRequired": "फ्रेम्स टू वीडियो चलाने से पहले एक स्टार्ट फ्रेम का चयन करें।",
        "videoIngredientsRequired": "सामग्री को वीडियो में चलाने से पहले कम से कम एक घटक छवि का चयन करें।",
        "videoIngredientsMaxReached": "वीडियो की सामग्री प्रति प्रॉम्प्ट 3 छवियों तक का समर्थन करती है।",
        "videoModeRequired": "चलाने से पहले प्रत्येक वीडियो संकेत के लिए सामग्री या फ़्रेम चुनें।",
        "videoSelectAssetsFirst": "सबसे पहले ऊपर वीडियो एसेट चुनें।",
        "queueVideoIngredientsTitle": "इस संकेत के लिए सामग्री का चयन करें",
        "queueVideoStartFrameTitle": "इस प्रॉम्प्ट के लिए स्टार्ट फ़्रेम का चयन करें",
        "queueVideoEndFrameTitle": "इस प्रॉम्प्ट के लिए अंतिम फ़्रेम का चयन करें",
        "queueVideoIngredientsButton": "+ सामग्री",
        "queueVideoStartButton": "छवि प्रारंभ करें",
        "queueVideoEndButton": "अंतिम छवि",
        "videoThumbIngredientLabel": "घटक",
        "videoThumbStartLabel": "शुरू",
        "videoThumbEndLabel": "अंत",
        "queueVideoModeLabel": "तरीका",
        "queueVideoDurationLabel": "अवधि",
        "queueChooseVideoMode": "सामग्री या फ़्रेम चुनें",
        "noStartFrame": "कोई प्रारंभ फ़्रेम नहीं",
        "active": "सक्रिय",
        "idle": "निठल्ला",
        "running": "दौड़ना",
        "paused": "रुका हुआ",
        "pendingStatus": "लंबित",
        "inProgressStatus": "प्रगति पर है",
        "completedStatus": "पुरा होना",
        "failedStatus": "असफल",
        "failedPrefix": "असफल",
        "justNow": "बस अब",
        "minAgo": "मी पहले",
        "freeBadge": "मुक्त",
        "creditsRequiredBadge": "क्रेडिट आवश्यक",
        "atATime": "एक ही समय पर",
        "languageHindi": "हिंदी",
        "openPicker": "पिकर खोलें",
        "openFullPicker": "पूर्ण पिकर खोलें",
        "reset": "रीसेट करें",
        "remove": "निकालना",
        "add": "जोड़ना",
        "dryRun": "पूर्वाभ्यास",
        "reloadAssets": "संपत्ति पुनः लोड करें",
        "characterHelpText": "एक या अधिक निर्मित फ़्लो वर्ण चुनें. प्रति-प्रॉम्प्ट मोड इन चयनित वर्णों में से चुन सकता है।",
        "referenceAssetHelpText": "छवि मोड के लिए एक या अधिक संदर्भ छवियाँ चुनें। यह वीडियो कतार से अलग रहता है.",
        "referenceAssetTwoImageNote": "कृपया अभी तक 2 छवियों का उपयोग करें। यदि कोई छवि नहीं मिल पाती है, तो आपके पास प्रोजेक्ट में बहुत सारी छवियां हो सकती हैं। कृपया किसी नये प्रोजेक्ट का उपयोग करें.",
        "csvUploadHint": "संपादक में त्वरित पंक्तियों को लोड करने, उनकी समीक्षा/ठीक करने, फिर उन्हें कतार में जोड़ने के लिए एक सीएसवी अपलोड करें।",
        "csvGuideMessage": "सीएसवी गाइड\n\nसीएसवी अपलोड पहले संपादक में शीघ्र पंक्तियों को पढ़ता है। यह स्वतः कतारबद्ध नहीं होता.\n\nCSV का उपयोग तब करें जब:\n- आपके पास जल्दी से जोड़ने के लिए कई संकेत हैं।\n- आप चाहते हैं कि दृश्य-दर-दृश्य पंक्तियाँ एक स्प्रेडशीट में प्रबंधित हों।\n\nसरल प्रारूप:\n- प्रति पंक्ति एक संकेत.\n- यदि संभव हो तो प्रॉम्प्ट हेडर का उपयोग करें (उदाहरण के लिए: प्रॉम्प्ट / इमेज प्रॉम्प्ट / टेक्स्ट प्रॉम्प्ट)।\n- UTF-8 की अनुशंसा की जाती है, लेकिन अन्य एन्कोडिंग का भी पता लगाया जाता है।\n\nत्वरित कदम:\n1. अपने संकेत CSV फ़ाइल में तैयार करें.\n2. सीएसवी को एक्सटेंशन में आयात करें।\n3. यदि कोई समस्या पाई जाती है तो हाइलाइट की गई शीघ्र पंक्तियों को ठीक करें।\n4. संपादक में पाए गए संकेतों की समीक्षा करें।\n5. \"कतार में जोड़ें\" पर क्लिक करें और स्वचालन प्रारंभ करें।\n\nटिप्पणियाँ:\n- आयात के तुरंत बाद चयनित CSV फ़ाइल को हटा दिया जाता है।\n- यदि पंक्तियाँ टूटी हुई हैं, तो समस्याग्रस्त पंक्ति को छोड़ने के लिए उसे खाली छोड़ दें।",
        "cleanupStaleItemsConfirm": "{count} पूर्ण/विफल आइटम संग्रहीत हैं। अब उन्हें हटा दें?",
        "noQueueItemsToRun": "कृपया पहले संकेत दर्ज करें या कतार में आइटम जोड़ें।",
        "promptNotFound": "संकेत नहीं मिला",
        "flowCharacter": "प्रवाह चरित्र",
        "flowAsset": "प्रवाह संपत्ति",
        "orderLabel": "ऑर्डर {count}",
        "characterN": "चरित्र {count}",
        "pickerVideoTitle": "वीडियो एसेट पिकर",
        "pickerCharacterTitle": "चरित्र चयनकर्ता",
        "pickerReferenceTitle": "संदर्भ संपत्ति पिकर",
        "pickerAvailableVideoAssets": "उपलब्ध वीडियो संपत्ति",
        "pickerAvailableCharacters": "उपलब्ध पात्र",
        "pickerAvailableAssets": "उपलब्ध संपत्ति",
        "pickerSelectedVideoAssets": "चयनित वीडियो परिसंपत्तियाँ",
        "pickerSelectedCharacter": "चयनित पात्र",
        "pickerSelectedCharacters": "चयनित पात्र",
        "pickerSelectedReferenceImages": "चयनित संदर्भ छवियाँ",
        "pickerSaveVideoQueue": "वीडियो कतार सहेजें",
        "pickerUseCharacter": "चरित्र का प्रयोग करें",
        "pickerUseSelected": "चयनित का प्रयोग करें",
        "pickerVideoSummarySelected": "{count} वीडियो संपत्ति चयनित।",
        "pickerVideoSummaryEmpty": "वीडियो संपत्तियों को बाईं ओर से दाईं ओर कतार में ले जाएं।",
        "pickerCharacterSummarySelected": "{count} वर्ण चयनित।",
        "pickerCharacterSummaryEmpty": "एक या अधिक बनाए गए वर्णों को बाईं ओर से दाईं ओर चयनित सूची में ले जाएँ।",
        "pickerReferenceSummarySelected": "{count} संदर्भ छवि चयनित।",
        "pickerReferenceSummaryEmpty": "संदर्भ छवियों को बाईं ओर से दाईं ओर चयनित सूची में ले जाएं।",
        "pickerNoAssetsAvailable": "कोई उपलब्ध संपत्ति नहीं. उन्हें लाने के लिए \"रीलोड एसेट्स\" का उपयोग करें।",
        "pickerSelectedVideoEmpty": "चयनित वीडियो संपत्तियां यहां दिखाई देंगी.",
        "pickerSelectedCharacterEmpty": "चयनित अक्षर यहां दिखाई देंगे.",
        "pickerSelectedReferenceEmpty": "चयनित संदर्भ छवियां यहां दिखाई देंगी.",
        "openProjectTabFirst": "पहले लक्ष्य Google फ़्लो प्रोजेक्ट टैब खोलें, फिर ओपन पिकर का पुनः प्रयास करें।",
        "csvImportCanceled": "सीएसवी आयात रद्द कर दिया गया. कोई संकेत कतारबद्ध नहीं थे.",
        "csvNoValidPrompts": "आयात करने के लिए कोई वैध संकेत नहीं. कम से कम एक संकेत जोड़ें या रद्द करें.",
        "csvLoadedReady": "सीएसवी लोड किया गया: {count} प्रॉम्प्ट तैयार। समीक्षा करें, फिर \"कतार में जोड़ें\" पर क्लिक करें.{details}",
        "csvLoadedWithIssues": "CSV {count} मुद्दे से भरा हुआ है। हाइलाइट किए गए संकेतों को ठीक करें और लागू करें।",
        "csvEmptyUnreadable": "सीएसवी खाली या अपठनीय है.",
        "csvNoValidRows": "इस CSV में कोई वैध संकेत पंक्तियाँ नहीं मिलीं।",
        "csvLoadedReplacement": "CSV लोड किया गया ({count} प्रॉम्प्ट, {encoding})। कुछ पात्रों की समीक्षा की आवश्यकता हो सकती है.",
        "csvLoadedDetail": "CSV लोड किया गया: {count} प्रॉम्प्ट तैयार (सीमांकक: {delimiter}, एन्कोडिंग: {encoding})। समीक्षा करें, फिर \"कतार में जोड़ें\" पर क्लिक करें।",
        "csvImportFailed": "CSV आयात विफल: {message}",
        "csvImportCompleteTitle": "सीएसवी आयात पूर्ण.",
        "csvFoundPrompts": "मिले संकेत: {count}",
        "csvRowsNeedFixes": "पंक्तियाँ जिन्हें सुधार की आवश्यकता है: {count}",
        "csvReviewFixRows": "कृपया हाइलाइट की गई पंक्तियों की समीक्षा करें और उन्हें ठीक करें।",
        "csvLoadedToEditor": "संपादक पर लोड किया गया: {count}",
        "csvReviewAddQueue": "समीक्षा करें और तैयार होने पर \"कतार में जोड़ें\" पर क्लिक करें।",
        "reloadAssetsReselectVideoStart": "फ़्लो संपत्तियों को पुनः लोड करें और पहले वीडियो प्रारंभ छवि को पुनः चुनें।",
        "noCharactersFoundCreateFirst": "कोई पात्र नहीं मिला. पहले एक फ़्लो कैरेक्टर बनाएं, फिर पुनः लोड करें।",
        "clearedVideoQueue": "वीडियो परिसंपत्ति कतार साफ़ की गई.",
        "importedFromReceiver": "रिसीवर पृष्ठ से आयातित {count} संकेत।",
        "selectVideoAssetsFirst": "सबसे पहले वीडियो एसेट चुनें.",
        "setVideoPromptScene01": "पहले दृश्य 01 के लिए एक वीडियो प्रॉम्प्ट सेट करें।",
        "openFlowProjectTabFirst": "सबसे पहले Google Flow प्रोजेक्ट टैब खोलें।",
        "dryRunComplete": "ड्राई रन पूरा। स्टार्ट इमेज और प्रॉम्प्ट क्रिएट दबाए बिना तैयार किए गए थे।",
        "dryRunFailed": "ड्राई रन विफल: {message}",
        "reloadVideoAssetsFirst": "पहले वीडियो संपत्तियों को पुनः लोड करें।",
        "noSceneAssetsFound": "वर्तमान प्रोजेक्ट में कोई दृश्य/छवि-क्रमांकित संपत्ति नहीं मिली।",
        "autoAddedVideoAssets": "स्वतः जोड़ा गया {count} क्रमांकित वीडियो संपत्ति।",
        "openFlowProjectTabWithPath": "सबसे पहले Google Flow प्रोजेक्ट टैब खोलें (labs.google/fx/tools/flow/project/…)।",
        "failedToLoadAssets": "परिसंपत्तियाँ लोड करने में विफल.",
        "noAssetsFoundOpenAddMedia": "कोई संपत्ति नहीं मिली. सबसे पहले मीडिया पैनल जोड़ें खोलें.",
        "loadedFreshAssetsCleared": "लोड की गई {count} ताज़ा संपत्ति। पिछला संदर्भ चयन साफ़ कर दिया गया.",
        "failedToLoadAssetsWithError": "संपत्ति लोड करने में विफल: {message}",
        "failedToLoadCharacters": "अक्षर लोड करने में विफल.",
        "loadedCharacters": "लोड किया गया {count} वर्ण।",
        "failedToLoadCharactersWithError": "अक्षर लोड करने में विफल: {message}",
        "failedToLoadVideoAssets": "वीडियो परिसंपत्तियाँ लोड करने में विफल.",
        "loadedVideoAssets": "लोड की गई {count} वीडियो परिसंपत्तियाँ।",
        "failedToLoadVideoAssetsWithError": "वीडियो एसेट लोड करने में विफल: {message}",
        "buttonsOnlyInFlowProject": "ये बटन केवल Google Flow प्रोजेक्ट के अंदर उपलब्ध हैं।",
        "runInsideProjectRequired": "पहले Google Flow प्रोजेक्ट पृष्ठ खोलें, फिर प्रोजेक्ट के अंदर से संकेत चलाएँ।",
        "removedReferenceSelectedNow": "संदर्भ छवि हटा दी गई. अभी चयनित: {count}।",
        "oauthClientIdMissing": "पहले manifest.json में oauth2.client_id सेट करें।",
        "signingInGoogle": "Google से साइन इन किया जा रहा है...",
        "signInCompleteSupport": "साइन-इन पूर्ण. छवि डाउनलोडर अनलॉक है.",
        "signedOutTokenClearFailed": "स्थानीय रूप से साइन आउट किया गया. ब्राउज़र टोकन कैश साफ़ करने में विफल रहा.",
        "signedOut": "साइन आउट कर दिया गया.",
        "signInFailed": "साइन-इन विफल: {message}",
        "signOutFailed": "साइन-आउट विफल: {message}",
        "flowButtonSyncFailed": "प्रवाह {flowType} बटन सिंक विफल रहा। फ़्लो टैब पुनः लोड करें और पुनः प्रयास करें।",
        "moveDown": "नीचे",
        "edit": "संपादन करना",
        "editVideoPrompt": "वीडियो प्रॉम्प्ट संपादित करें",
        "noPromptSpecified": "कोई संकेत निर्दिष्ट नहीं",
        "unknownAsset": "अज्ञात संपत्ति",
        "signingInShortStatus": "Google SSO: साइन इन हो रहा है...",
        "downloading": "डाउनलोड हो रहा है...",
        "loading": "लोड हो रहा है...",
        "reloading": "पुनः लोड हो रहा है...",
        "loadFromFlow": "प्रवाह से लोड करें",
        "downloadPickerSelectedCount": "{selected}/{total} चयनित",
        "downloadPickerPremiumTitle": "प्रीमियम सुविधा - अनलॉक आवश्यक",
        "clearSelection": "स्पष्ट",
        "rescan": "पुन: स्कैन",
        "errorPopupTitle": "कार्रवाई आवश्यक",
        "recoveryCooldownTitle": "पुनः आरंभ होने की प्रतीक्षा की जा रही है",
        "recoveryPostReloadTitle": "पुनः प्रारंभ करने की तैयारी है",
        "recoveryCooldownLabel": "पेज रीफ़्रेश करें",
        "recoveryPostReloadLabel": "कतार पुनः आरंभ करें",
        "recoveryCancel": "रद्द करना",
        "recoveryCooldownMessage": "Google Flow ने लगातार तीन जनरेशन रोक दिए हैं। इस 5 मिनट की सुरक्षा अवधि में कोई नया अनुरोध नहीं भेजा जाएगा। Google VPN या प्रॉक्सी बंद करने की सलाह देता है।",
        "recoveryPostReloadMessage": "प्रवाह एक बार ताज़ा किया गया था. 30 सेकंड की तैयारी प्रतीक्षा समाप्त होने तक कोई नया अनुरोध नहीं भेजा जाएगा।",
        "recoveryCauseExplanation": "यह Google Flow द्वारा लौटाया गया सर्वर-साइड असामान्य-गतिविधि प्रतिबंध है, कोई आंतरिक ऐप त्रुटि नहीं है। अनुरोध आवृत्ति, वीपीएन, प्रॉक्सी या Google खाता गतिविधि इसमें योगदान दे सकती है।",
        "recoveryGoogleHelpLink": "आधिकारिक Google फ़्लो सहायता केंद्र खोलें",
        "recoveryOtherAccountTip": "यदि यह जारी रहता है, तो Google प्रवाह पृष्ठ से साइन आउट करने और किसी अन्य Google खाते से साइन इन करने से मदद मिल सकती है। केवल अपने स्वामित्व वाले खाते का उपयोग करें और Google की शर्तों का पालन करें।",
        "recoveryCanceledMessage": "स्वचालित पुनर्प्राप्ति रद्द कर दी गई. विफलता काउंटर रीसेट कर दिया गया और कतार रुकी हुई है।",
        "professionalFeatureUnlockedHeader": "प्रोफेशनल अनलॉक",
        "randomizedDelay": "यादृच्छिक विलंब",
        "randomizedDelayNote": "संकेतों के बीच प्रतीक्षा करता है, साथ ही उसके ऊपर एक रैंडम विलंब जोड़ा जाता है (0-30s डिफ़ॉल्ट) ताकि अनुरोध पूरी तरह से स्वचालित न दिखें। साथ ही हर 20 संकेतों पर यादृच्छिक 4-5 मिनट के लिए रुक जाता है। प्रीमियम और नीचे हमेशा इन सुरक्षित डिफ़ॉल्ट का उपयोग करें। पेशेवर नीचे दिए गए मानों को अनलॉक और अनुकूलित कर सकते हैं।",
        "randomizedDelayJitter": "+यादृच्छिक विलंब (सेकंड)",
        "randomizedDelayBreakEvery": "हर एक को तोड़ो (संकेत)",
        "randomizedDelayBreakMin": "ब्रेक मिनट (मिनट)",
        "randomizedDelayBreakMax": "ब्रेक अधिकतम (मिनट)",
        "randomizedDelayProfessionalOnly": "केवल व्यावसायिक - इन मानों को अनुकूलित करने के लिए अपग्रेड करें।",
        "starterQuotaValue": "{count}/{limit} आज",
        "starterQuotaResetHoursMinutes": "{hours} घंटे {minutes} मिनट में रीसेट",
        "starterQuotaResetHours": "{hours} घंटे में रीसेट",
        "starterQuotaResetMinutes": "{minutes} मिनट में रीसेट",
        "starterQuotaResetting": "रीसेट किया जा रहा है...",
        "flowAccountDiagnostic": "Google खाता अनुकूलता",
        "flowAccountDiagnosticNote": "Chrome प्रोफ़ाइल खाते की तुलना Google Flow में वर्तमान में खुले खाते से करता है। यह केवल डायग्नोस्टिक है और कभी भी पहुंच नहीं बदलता है।",
        "flowAccountDiagnosticButton": "खातों की जाँच करें",
        "accessDeniedTitle": "अनुमति नहीं",
        "moveStarterAccessHere": "स्टार्टर एक्सेस को यहां ले जाएं",
        "moveStarterAccessConfirm": "स्टार्टर एक्सेस को इस ब्राउज़र पर ले जाएँ? पहले से पंजीकृत स्टार्टर खाता अब इस ब्राउज़र पर स्टार्टर का उपयोग नहीं कर पाएगा।",
        "moveStarterAccessSuccess": "स्टार्टर एक्सेस इस ब्राउज़र पर ले जाया गया।",
        "moveStarterAccessFailed": "स्टार्टर एक्सेस को स्थानांतरित नहीं किया जा सका.",
        "upgradeToPremium": "प्रीमियम में अपग्रेड करें",
        "useDifferentAccount": "किसी भिन्न खाते का उपयोग करें"
    }
};

for (const [lang, patch] of Object.entries(COMPLETE_LANGUAGE_COVERAGE_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

const RANDOMIZED_DELAY_VISIBILITY_I18N_PATCH = {
    en: {
        randomizedDelayDefaultActive: 'Randomized Delay stays active with safe default settings on this membership.',
        randomizedDelayDefaultsLocked: 'Default protection is running. The switch is off and detailed values are hidden; Professional members can customize them.'
    },
    ko: {
        randomizedDelayDefaultActive: '이 멤버십에서도 랜덤 지연은 안전한 기본값으로 계속 작동합니다.',
        randomizedDelayDefaultsLocked: '기본 보호 설정이 적용 중입니다. 토글은 꺼져 있고 상세 값은 숨겨지며, Professional에서만 직접 설정할 수 있습니다.'
    },
    ja: {
        randomizedDelayDefaultActive: 'このメンバーシップでも、ランダム遅延は安全なデフォルト設定で動作します。',
        randomizedDelayDefaultsLocked: 'デフォルト保護は有効です。スイッチはオフで詳細値は非表示になり、Professional のみカスタマイズできます。'
    },
    zh: {
        randomizedDelayDefaultActive: '此会员级别仍会使用安全默认设置运行随机延迟。',
        randomizedDelayDefaultsLocked: '默认保护正在生效。开关保持关闭且详细数值隐藏；仅 Professional 可自定义。'
    },
    de: {
        randomizedDelayDefaultActive: 'Die zufällige Verzögerung bleibt in dieser Mitgliedschaft mit sicheren Standardwerten aktiv.',
        randomizedDelayDefaultsLocked: 'Der Standardschutz ist aktiv. Der Schalter ist aus und Detailwerte sind ausgeblendet; nur Professional kann sie anpassen.'
    },
    fr: {
        randomizedDelayDefaultActive: 'Le délai aléatoire reste actif avec des valeurs sûres par défaut pour cet abonnement.',
        randomizedDelayDefaultsLocked: 'La protection par défaut est active. Le bouton reste désactivé et les valeurs détaillées sont masquées ; seuls les membres Professional peuvent les personnaliser.'
    },
    hi: {
        randomizedDelayDefaultActive: 'इस सदस्यता में भी रैंडम विलंब सुरक्षित डिफ़ॉल्ट सेटिंग्स के साथ सक्रिय रहता है।',
        randomizedDelayDefaultsLocked: 'डिफ़ॉल्ट सुरक्षा चालू है। टॉगल बंद है और विस्तृत मान छिपे हैं; केवल Professional सदस्य इन्हें बदल सकते हैं।'
    }
};

for (const [lang, patch] of Object.entries(RANDOMIZED_DELAY_VISIBILITY_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}


const STARTER_HOST_PERMISSION_I18N_PATCH = {
    en: {
        enableStarterSecurityCheck: 'Enable Starter security check',
        starterSecurityPermissionRequired: 'Starter needs permission to contact the secure account-check service before free access can be verified.',
        starterSecurityPermissionDenied: 'Permission was not granted. Starter access cannot be verified.'
    },
    ko: {
        enableStarterSecurityCheck: 'Starter 보안 확인 사용',
        starterSecurityPermissionRequired: '무료 이용을 확인하려면 Starter 계정 보안 확인 서비스에 연결할 권한이 필요합니다.',
        starterSecurityPermissionDenied: '권한이 허용되지 않아 Starter 이용을 확인할 수 없습니다.'
    },
    ja: {
        enableStarterSecurityCheck: 'Starter のセキュリティ確認を有効にする',
        starterSecurityPermissionRequired: '無料利用を確認するには、Starter アカウントのセキュリティ確認サービスへの接続許可が必要です。',
        starterSecurityPermissionDenied: '許可されなかったため、Starter の利用を確認できません。'
    },
    zh: {
        enableStarterSecurityCheck: '启用 Starter 安全检查',
        starterSecurityPermissionRequired: '验证免费使用权限前，需要允许连接 Starter 账户安全检查服务。',
        starterSecurityPermissionDenied: '未授予权限，无法验证 Starter 使用资格。'
    },
    de: {
        enableStarterSecurityCheck: 'Starter-Sicherheitsprüfung aktivieren',
        starterSecurityPermissionRequired: 'Zur Prüfung des kostenlosen Zugriffs benötigt Starter die Berechtigung, den sicheren Kontoprüfdienst zu kontaktieren.',
        starterSecurityPermissionDenied: 'Die Berechtigung wurde nicht erteilt. Der Starter-Zugriff kann nicht geprüft werden.'
    },
    fr: {
        enableStarterSecurityCheck: 'Activer la vérification de sécurité Starter',
        starterSecurityPermissionRequired: 'Pour vérifier l’accès gratuit, Starter doit être autorisé à contacter le service sécurisé de vérification du compte.',
        starterSecurityPermissionDenied: 'L’autorisation n’a pas été accordée. L’accès Starter ne peut pas être vérifié.'
    },
    hi: {
        enableStarterSecurityCheck: 'Starter सुरक्षा जांच सक्षम करें',
        starterSecurityPermissionRequired: 'मुफ़्त पहुंच सत्यापित करने से पहले Starter को सुरक्षित खाता-जांच सेवा से संपर्क करने की अनुमति चाहिए।',
        starterSecurityPermissionDenied: 'अनुमति नहीं दी गई। Starter पहुंच सत्यापित नहीं की जा सकती।'
    }
};

for (const [lang, patch] of Object.entries(STARTER_HOST_PERMISSION_I18N_PATCH)) {
    I18N[lang] = { ...(I18N[lang] || I18N.en), ...patch };
}

function t(key) {
    return I18N[currentLanguage]?.[key] || I18N.en[key] || key;
}

function tFormat(key, params = {}) {
    return t(key).replace(/\{(\w+)\}/g, (_, name) => {
        const value = params[name];
        return value === undefined || value === null ? '' : String(value);
    });
}

function formatStarterQuotaResetCountdown(resetAt, now = Date.now()) {
    const resetAtMs = Number(resetAt) || 0;
    const nowMs = Number(now) || Date.now();
    if (!resetAtMs) return '';
    const remainingMs = resetAtMs - nowMs;
    if (remainingMs <= 0) return t('starterQuotaResetting');
    const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) {
        return tFormat('starterQuotaResetHoursMinutes', { hours, minutes });
    }
    if (hours > 0) return tFormat('starterQuotaResetHours', { hours });
    return tFormat('starterQuotaResetMinutes', { minutes });
}

function formatTrialEndDate(ms = gateState.trialExpiresAt) {
    const date = new Date(Number(ms) || 0);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) return '';
    return new Intl.DateTimeFormat(currentLanguage || 'en', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(date);
}


function tList(key) {
    const list = I18N[currentLanguage]?.[key] || I18N.en[key] || [];
    return Array.isArray(list) ? list : [];
}

function simpleHash(input = '') {
    let hash = 5381;
    const text = String(input);
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

function compareVersions(a = '0', b = '0') {
    const left = String(a).split('.').map(part => Number.parseInt(part, 10) || 0);
    const right = String(b).split('.').map(part => Number.parseInt(part, 10) || 0);
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i += 1) {
        const diff = (left[i] || 0) - (right[i] || 0);
        if (diff !== 0) return diff > 0 ? 1 : -1;
    }
    return 0;
}

function firestoreValueToJs(value) {
    if (!value || typeof value !== 'object') return null;
    if ('stringValue' in value) return value.stringValue;
    if ('booleanValue' in value) return !!value.booleanValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('timestampValue' in value) return value.timestampValue;
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(firestoreValueToJs);
    if ('mapValue' in value) return firestoreFieldsToJs(value.mapValue.fields || {});
    return null;
}

function firestoreFieldsToJs(fields = {}) {
    return Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [key, firestoreValueToJs(value)])
    );
}

function getCurrentExtensionVersion() {
    return chrome.runtime.getManifest()?.version || '0';
}

function getLocalizedRemoteNotificationText(notification, fieldName, fallback = '') {
    const localized = notification?.localized || notification?.locales || null;
    const languageEntry = localized?.[currentLanguage] || localized?.[currentLanguage?.split('-')?.[0]];
    return languageEntry?.[fieldName] || notification?.[fieldName] || fallback;
}

function remoteNotificationMatchesVersion(notification) {
    const version = getCurrentExtensionVersion();
    if (!notification) {
        console.info('Remote notification skipped: no notification document.');
        return false;
    }
    if (notification.active === false) {
        console.debug('Remote notification skipped: active is false.');
        return false;
    }

    const targetVersions = Array.isArray(notification.targetVersions)
        ? notification.targetVersions.map(String).filter(Boolean)
        : [];
    if (targetVersions.length > 0 && !targetVersions.includes(version)) {
        console.info(`Remote notification skipped: version ${version} is not in targetVersions.`);
        return false;
    }

    const excludedVersions = Array.isArray(notification.excludedVersions)
        ? notification.excludedVersions.map(String).filter(Boolean)
        : [];
    if (excludedVersions.includes(version)) {
        console.info(`Remote notification skipped: version ${version} is excluded.`);
        return false;
    }

    if (notification.minVersion && compareVersions(version, notification.minVersion) < 0) {
        console.info(`Remote notification skipped: version ${version} is below minVersion ${notification.minVersion}.`);
        return false;
    }
    if (notification.maxVersion && compareVersions(version, notification.maxVersion) > 0) {
        console.info(`Remote notification skipped: version ${version} is above maxVersion ${notification.maxVersion}.`);
        return false;
    }
    return true;
}

// Tier-targeted remote notifications. Empty/missing `audience` = shown to
// everyone (back-compat with notices that predate this field). Checks both
// the user's effective tier (starter/premium/professional/trial) and a
// synthetic 'pre_premium' tag, since Pre-Premium collapses into premium or
// starter for tier purposes but admins may want to target it specifically
// (e.g. before Quota Control flips it to starter).
function remoteNotificationMatchesAudience(notification) {
    const audience = Array.isArray(notification?.audience)
        ? notification.audience.map(String).filter(Boolean)
        : [];
    if (audience.length === 0) return true;
    const tags = [getMembershipTier()];
    if (gateState?.prePremium === true) tags.push('pre_premium');
    return audience.some((tag) => tags.includes(tag));
}

function getRemoteNotificationAckId(notification) {
    const title = getLocalizedRemoteNotificationText(notification, 'title', '');
    const message = getLocalizedRemoteNotificationText(notification, 'message', '');
    const seed = [
        notification?.id || 'latest',
        title,
        message,
        getCurrentExtensionVersion()
    ].join('|');
    return `${notification?.id || 'latest'}_${simpleHash(seed)}`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setTitle(id, value) {
    const el = document.getElementById(id);
    if (el) el.title = value;
}

async function getRemoteNotificationAckMap() {
    const data = await chrome.storage.local.get(REMOTE_NOTIFICATION_ACK_KEY);
    return data[REMOTE_NOTIFICATION_ACK_KEY] || {};
}

async function acknowledgeRemoteNotification(notification) {
    const ackId = getRemoteNotificationAckId(notification);
    const ackMap = await getRemoteNotificationAckMap();
    ackMap[ackId] = {
        acknowledgedAt: Date.now(),
        version: getCurrentExtensionVersion()
    };
    await chrome.storage.local.set({ [REMOTE_NOTIFICATION_ACK_KEY]: ackMap });
}

async function hasAcknowledgedRemoteNotification(notification) {
    const ackId = getRemoteNotificationAckId(notification);
    const ackMap = await getRemoteNotificationAckMap();
    return !!ackMap[ackId];
}

function showRemoteNotification(notification) {
    if (!remoteNotificationModal || !notification) return;
    const title = getLocalizedRemoteNotificationText(notification, 'title', t('remoteNotificationDefaultTitle'));
    const message = getLocalizedRemoteNotificationText(notification, 'message', '');
    const confirmText = getLocalizedRemoteNotificationText(notification, 'confirmText', t('remoteNotificationConfirm'));

    if (!message.trim()) {
        console.info('Remote notification skipped: message is empty.');
        return;
    }

    if (remoteNotificationTitle) remoteNotificationTitle.textContent = title;
    if (remoteNotificationMessage) remoteNotificationMessage.textContent = message;
    if (remoteNotificationVersion) {
        remoteNotificationVersion.textContent = tFormat('remoteNotificationVersion', {
            version: getCurrentExtensionVersion()
        });
    }
    if (remoteNotificationConfirmBtn) {
        remoteNotificationConfirmBtn.textContent = confirmText;
        remoteNotificationConfirmBtn.onclick = async () => {
            await acknowledgeRemoteNotification(notification);
            remoteNotificationModal.classList.add('hidden');
        };
    }
    remoteNotificationModal.classList.remove('hidden');
}

async function fetchRemoteNotificationFromFirebase() {
    if (!firebaseConfig.projectId) return null;
    await refreshFirebaseIdTokenIfNeeded().catch(() => false);

    const apiKeyParam = firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : '';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/extensionNotifications/latest${apiKeyParam}`;
    const headers = firebaseAuthState.idToken
        ? { Authorization: `Bearer ${firebaseAuthState.idToken}` }
        : {};
    const response = await fetch(url, {
        headers
    });

    if (response.status === 404 || response.status === 403) {
        console.warn(`Remote notification unavailable (${response.status}). Check Firestore document and rules.`);
        return null;
    }
    if (!response.ok) throw new Error(`Remote notification fetch failed (${response.status})`);

    const json = await response.json();
    const notification = firestoreFieldsToJs(json.fields || {});
    console.info('Remote notification fetched:', notification);
    return notification;
}

async function getCachedRemoteNotification({ forceFetch = false } = {}) {
    if (forceFetch) {
        return { fresh: false, notification: null };
    }
    const data = await chrome.storage.local.get(REMOTE_NOTIFICATION_CACHE_KEY);
    const cache = data[REMOTE_NOTIFICATION_CACHE_KEY] || {};
    if (cache.version !== getCurrentExtensionVersion()) {
        return { fresh: false, notification: null };
    }
    if (!cache.checkedAt || (Date.now() - cache.checkedAt) > REMOTE_NOTIFICATION_CHECK_INTERVAL_MS) {
        return { fresh: false, notification: null };
    }
    return { fresh: true, notification: cache.notification || null };
}

async function maybeShowRemoteNotification(options = {}) {
    try {
        let { fresh, notification } = await getCachedRemoteNotification(options);
        if (!fresh) {
            notification = await fetchRemoteNotificationFromFirebase();
            await chrome.storage.local.set({
                [REMOTE_NOTIFICATION_CACHE_KEY]: {
                    checkedAt: Date.now(),
                    version: getCurrentExtensionVersion(),
                    notification
                }
            });
        }

        if (!remoteNotificationMatchesVersion(notification)) return;
        if (!remoteNotificationMatchesAudience(notification)) {
            console.info('Remote notification skipped: audience does not match current tier.');
            return;
        }
        if (await hasAcknowledgedRemoteNotification(notification)) {
            console.info('Remote notification skipped: already acknowledged.');
            return;
        }
        showRemoteNotification(notification);
    } catch (error) {
        console.warn('Remote notification check failed:', error);
    }
}

async function fetchPromoBannerFromFirestore() {
    if (!firebaseConfig.projectId || !firebaseConfig.apiKey) return null;
    const apiKeyParam = `?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/appConfig/promoBanner${apiKeyParam}`;
    const res = await fetch(url);
    if (res.status === 404 || res.status === 403) return null;
    if (!res.ok) throw new Error(`Promo banner fetch failed (${res.status})`);
    const json = await res.json();
    return firestoreFieldsToJs(json.fields || {});
}

async function maybeShowPromoBanner() {
    if (!promoBanner || !promoBannerLink) return;

    // Always show banner with default URL; Firestore can override
    promoBannerLink.href = YOUTUBE_SUBSCRIBE_URL;
    promoBanner.classList.remove('hidden');

    try {
        const cached = await chrome.storage.local.get(PROMO_BANNER_CACHE_KEY);
        const cache = cached[PROMO_BANNER_CACHE_KEY] || {};
        let data = null;
        const hasCachedData = cache.data?.youtubeUrl;
        const fresh = hasCachedData && cache.checkedAt && (Date.now() - cache.checkedAt) < PROMO_BANNER_CACHE_TTL_MS;
        if (fresh) {
            data = cache.data;
        } else {
            data = await fetchPromoBannerFromFirestore();
            if (data?.youtubeUrl) {
                await chrome.storage.local.set({
                    [PROMO_BANNER_CACHE_KEY]: { checkedAt: Date.now(), data }
                });
            }
        }
        if (data?.active === false) { promoBanner.classList.add('hidden'); return; }
        if (!data.youtubeUrl) return;
        promoBannerLink.href = String(data.youtubeUrl);
        if (promoBannerLabel && data.label) promoBannerLabel.textContent = String(data.label);
    } catch (err) {
        console.warn('Promo banner fetch failed, using default URL:', err);
    }
}

function normalizeUiTheme(theme = 'default') {
    if (theme === 'dark') return 'dark';
    if (theme === 'logo') return 'logo';
    return 'default';
}

function applyTheme(theme = 'default') {
    const normalized = normalizeUiTheme(theme);
    document.documentElement.classList.toggle('theme-logo', normalized === 'logo');
    document.documentElement.classList.toggle('theme-dark', normalized === 'dark');
    document.documentElement.dataset.theme = normalized;
    syncDarkModeToggleIcon(normalized);
}

function syncDarkModeToggleIcon(theme = 'default') {
    if (!darkModeToggleBtn) return;
    const isDark = normalizeUiTheme(theme) === 'dark';
    darkModeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    darkModeToggleBtn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

function applyPremiumModalConfig() {
    // Message
    const msgEl = document.getElementById('labelPremiumFeatureMessage');
    if (msgEl && premiumModalConfig.message) {
        msgEl.textContent = premiumModalConfig.message;
    }

    // Request Access Form button
    if (premiumFormBtn) {
        premiumFormBtn.classList.toggle('hidden', !premiumModalConfig.showFormBtn);
    }

    // Become a Supporter button — visible by default; admin can hide via show_supporter_btn: false
    const supporterBtn = document.getElementById('premiumSupporterBtn');
    if (supporterBtn) {
        const hidden = premiumModalConfig.showSupporterBtn === false;
        supporterBtn.classList.toggle('hidden', hidden);
        if (premiumModalConfig.supporterLabel) supporterBtn.textContent = premiumModalConfig.supporterLabel;
        supporterBtn.onclick = () => {
            let url = premiumModalConfig.supporterUrl || DONATION_URL;
            // Stripe Payment Links accept client_reference_id as a query param —
            // it lands on the Checkout Session and lets the webhook map the
            // payment back to this Firebase account. Also prefill the email so
            // the customer record matches the Firebase account for fallback lookup.
            if (/(?:buy\.stripe\.com|checkout\.stripe\.com)/.test(url) && firebaseAuthState.uid) {
                try {
                    const parsed = new URL(url);
                    parsed.searchParams.set('client_reference_id', firebaseAuthState.uid);
                    if (firebaseAuthState.email) {
                        parsed.searchParams.set('prefilled_email', firebaseAuthState.email);
                    }
                    url = parsed.toString();
                } catch (e) { /* malformed config URL — open as-is */ }
            }
            chrome.tabs.create({ url });
        };
    }
}

function openPremiumFeatureModal({ allowWhileInstallRestricted = false } = {}) {
    // Automatic trial-expired nudges must never cover the dedicated Install ID
    // denial screen. The explicit Upgrade button on that screen opts in below.
    if (isStarterInstallRestricted() && !allowWhileInstallRestricted) return;
    applyPremiumModalConfig();
    premiumFeatureModal?.classList.remove('hidden');
    // Refresh config in background so next open has fresh data
    fetchPremiumModalConfig().catch(() => {});
}

function closePremiumFeatureModal() {
    premiumFeatureModal?.classList.add('hidden');
}

function openPremiumAccessForm() {
    if (!PREMIUM_ACCESS_FORM_URL || PREMIUM_ACCESS_FORM_URL.includes('REPLACE_WITH_GOOGLE_FORM_ID')) {
        showGateStatus(t('premiumFormNotConfigured'), true);
        return;
    }
    chrome.tabs.create({ url: PREMIUM_ACCESS_FORM_URL });
}

function applyTranslations(lang) {
    currentLanguage = I18N[lang] ? lang : 'en';

    document.documentElement.lang = currentLanguage;
    setText('headerStopBtn', t('stop'));
    setText('forceRefreshBtn', t('forceRefresh'));
    setTitle('forceRefreshBtn', t('refreshConnection'));
    setText('userGuideBtn', t('userGuide'));
    setTitle('userGuideBtn', t('userGuide'));
    setText('premiumFeatureBtn', t('premiumFeature'));
    setText('storyboardBtn', t('storyboard'));
    setText('storyboardLockBadge', t('premiumFeatureLocked'));
    setTitle('premiumFeatureBtn', t('premiumFeature'));
    setText('authLandingTitle', t('welcomeBackTitle'));
    setText('authLandingSubtitle', t('welcomeBackSubtitle'));
    setText('authGoogleBtnText', t('continueWithGoogle'));
    setText('authEmailDividerText', t('continueWithEmail'));
    setText('authEmailLabel', t('emailAddress'));
    setText('authPasswordLabel', t('password'));
    setText('authForgotPasswordBtn', t('forgotPassword'));
    setText('authAccessDeniedUpgradeBtn', t('upgradeToPremium'));
    setText('authAccessDeniedSignOutBtn', t('useDifferentAccount'));
    setText('authTermsPrefix', t('authTermsPrefix'));
    setText('storyboardOverviewTitle', t('storyboardOverviewTitle'));
    setText('storyboardOverviewSubtitle', t('storyboardOverviewSubtitle'));
    setText('storyboardOverviewCloseBtn', t('premiumFeatureClose'));
    setText('labelPremiumFeatureKicker', t('premiumFeatureKicker'));
    setText('labelPremiumFeatureTitle', t('premiumFeatureTitle'));
    setText('labelPremiumFeatureMessage', t('premiumFeatureMessage'));
    setText('labelPremiumFeatureFeedback', t('premiumFeatureFeedback'));
    setText('labelPremiumFeatureYoutube', t('premiumFeatureYoutube'));
    setText('labelPremiumFeatureManual', t('premiumFeatureManual'));
    setText('labelPremiumFeatureSupporter', t('premiumFeatureSupporter'));
    setText('premiumYoutubeBtn', t('subscribeOnYoutube'));
    setText('premiumReviewBtn', t('premiumFeatureReview'));
    setText('premiumFormBtn', t('premiumFeatureForm'));
    setText('premiumFeatureCloseBtn', t('premiumFeatureClose'));
    syncAuthEmailMode();
    setText('labelSettingsAccount', t('settingsAccount'));
    setText('labelSupportProject', t('supportProject'));
    setText('labelSupportDescription', t('supportDescription'));
    setText('labelSubscribeSupportTitle', t('subscribeSupportTitle'));
    setText('labelSubscribeSupportNote', t('subscribeSupportNote'));
    setText('settingsSubscribeYoutubeBtn', t('subscribeOnYoutube'));
    setText('labelBulkDownloaderTitle', t('bulkDownloaderTitle'));
    setText('labelBulkDownloaderNote', t('bulkDownloaderNote'));
    setText('labelImageDownloaderFeatures', t('imageDownloaderFeatures'));
    setText('labelSsoFeaturePreview', t('ssoFeaturePreview'));
    setText('imageDownloaderSignedInText', getSignedInProviderLabel());
    setText('imageDownloaderSignOutBtn', t('signOut'));
    setText('labelPremiumLoginBanner', t('premiumLoginBanner'));
    setText('labelLoginRequiredTitle', t('loginRequiredTitle'));
    setText('labelLoginRequiredBody', t('loginRequiredBody'));
    setText('loginRequiredBtn', t('signInShort'));
    setText('labelMembershipUsageTitle', t('membershipUsageTitle'));
    setText('labelProfileTitle', t('profileTitle'));
    setText('labelProfileUserId', t('profileUserId'));
    setText('labelProfileLanguage', t('profileLanguage'));
    setText('labelProfileMembership', t('profileMembership'));
    setText('labelProfileQuota', t('profileQuota'));
    setText('profileCopyUidBtn', t('copyFirebaseUid'));
    setText('profileSignOutBtn', t('signOut'));
    setText('labelStarterTier', t('starterTier'));
    setText('labelPremiumTier', t('premiumTier'));
    setText('labelProfessionalTier', t('professionalTier'));
    setText('premiumLoginBtn', t('signInShort'));
    setText('labelFirebaseUid', t('firebaseUid'));
    setText('copyFirebaseUidBtn', t('copyFirebaseUid'));
    setText('labelAssetPremiumLocked', t('assetPremiumLocked'));
    setText('labelPremiumAssetsLockedTitle', t('premiumFeatureLocked'));
    setText('labelPremiumAssetsLockedBody', t('premiumAssetsLockedBody'));
    setText('labelCharacterPremiumLocked', t('premiumFeatureLocked'));
    setText('labelReferencePremiumLocked', t('premiumFeatureLocked'));
    setText('donateBtn', t('donate'));
    setText('navControlTab', t('control'));
    setText('navSettingsTab', t('settings'));
    setText('labelOutputType', t('outputType'));
    setText('flowTypeImageBtn', t('image'));
    setText('flowTypeVideoBtn', t('video'));
    setText('videoModeHelpText', t('videoModeHelp'));
    setText('labelVideoModel', t('videoModel'));
    setText('videoOmniEndFrameWarning', t('videoOmniEndFrameWarning'));
    setText('labelFormFactor', t('formFactor'));
    setText('ratioLandscapeBtn', t('landscape'));
    setText('ratioPortraitBtn', t('portrait'));
    setText('labelBatchSize', `${t('batchSize')} (${t('comingSoon')})`);
    setText('labelGenerationModel', `${t('generationModel')} (${t('comingSoon')})`);
    setText('labelPromptQueue', t('promptQueue'));
    setText('labelPerPromptAssets', t('perPromptAssets'));
    setText('labelPerPromptAssetsNote', t('perPromptAssetsNote'));
    setText('labelPerPromptAssetsUnlockRequired', t('perPromptAssetsUnlockRequired'));
    setText('labelPerPromptAssetsLocked', t('perPromptAssetsLocked'));
    setText('labelPerPromptAssetsLockedDetail', t('perPromptAssetsLockedDetail'));
    setText('labelVideoMultilinePrompt', t('videoMultilinePrompt'));
    setText('labelVideoMultilinePromptNote', t('videoMultilinePromptNote'));
    setText('labelVideoMultilinePromptUnlockRequired', t('videoMultilinePromptUnlockRequired'));
    setText('labelVideoMultilinePromptLocked', t('videoMultilinePromptLocked'));
    setText('labelVideoMultilinePromptLockedDetail', t('videoMultilinePromptLockedDetail'));
    setText('csvUploadBtn', t('uploadCsv'));
    setText('csvGuideBtn', t('csvGuideBtn'));
    setText('addPromptsBtn', t('addToQueue'));
    setText('promptAssetsHint', t('promptAssetsHint'));
    setText('labelCharacterTitle', t('characterTitle'));
    setText('characterAssetHelpText', t('characterHelpText'));
    setText('characterAssetLockBadge', t('premiumFeatureLocked'));
    setText('labelReferenceAssetTitle', t('referenceAssetTitle'));
    setText('referenceAssetHelpText', t('referenceAssetHelpText'));
    setText('referenceAssetLockBadge', t('premiumFeatureLocked'));
    setText('referenceAssetTwoImageNote', t('referenceAssetTwoImageNote'));
    setText('csvUploadHint', t('csvUploadHint'));
    setText('queueAutoResetNote', t('queueAutoResetNote'));
    setText('openCharacterAssetPickerBtn', t('openPicker'));
    setText('openReferenceAssetPickerBtn', t('openPicker'));
    setText('resetCharacterAssetBtn', t('reset'));
    setText('resetReferenceAssetBtn', t('reset'));
    setText('referenceAssetPickerReloadBtn', t('reloadAssets'));
    setText('referenceAssetPickerCancelBtn', t('cancel'));
    setText('referenceAssetPickerLockBadge', t('premiumFeatureLocked'));
    setText('labelGenerationAutoDownloadTitle', t('generationAutoDownloadTitle'));
    setText('labelAutoDownload', t('autoDownload'));
    setText('labelUpscaleDownload', t('upscaleDownload'));
    setText('upscaleDownloadLockBadge', t('upscaleDownloadLocked'));
    setText('labelUpscaleDownloadNote', t('upscaleDownloadNote'));
    applyUpscaleDownloadCopy();
    setText('upscaleDownloadToolsDisabledMsg', t('upscaleDownloadToolsDisabled'));
    setText('labelWaitForImageResponse', t('waitForImageResponse'));
    setText('labelWaitForImageResponseNote', t('waitForImageResponseNote'));
    setText('labelPromptDelaySeconds', t('promptDelaySeconds'));
    setText('labelRandomizedDelay', t('randomizedDelay'));
    setText('labelRandomizedDelayNote', getMembershipTier() === 'professional'
        ? t('randomizedDelayNote')
        : t('randomizedDelayDefaultActive'));
    setText('labelRandomizedDelayJitter', t('randomizedDelayJitter'));
    setText('labelRandomizedDelayBreakEvery', t('randomizedDelayBreakEvery'));
    setText('labelRandomizedDelayBreakMin', t('randomizedDelayBreakMin'));
    setText('labelRandomizedDelayBreakMax', t('randomizedDelayBreakMax'));
    setText('labelDetailedAnalytics', t('detailedAnalytics'));
    setText('labelDetailedAnalyticsNote', t('detailedAnalyticsNote'));
    setText('labelLogViewer', t('logViewerTitle'));
    setText('logViewerRefreshBtn', t('logViewerRefresh'));
    setText('logViewerCopyBtn', t('logViewerCopy'));
    setText('labelCurrentQueue', t('currentQueue'));
    setText('labelTasksSuffix', t('tasks'));
    setText('emptyQueueMsg', t('noActiveTasks'));
    setText('startBtn', t('startAutomation'));
    setText('rerunUnfinishedBtn', t('retryUnfinished'));
    setText('resetBtn', t('clearQueue'));
    setText('stopHistoryBtn', t('stopActiveTask'));
    setText('labelDownloadTools', t('downloadTools'));
    setText('labelDownloadHint', t('downloadHint'));
    setText('downloadPageBtn', t('downloadAllPageImages'));
    setText('openDownloadPickerBtn', t('openImageDownloader'));
    setText('imageDownloaderLockBadge', t('premiumFeatureLocked'));
    setText('downloadPickerTitle', t('downloadPickerTitle'));
    setText('downloadPickerSubtitle', t('downloadPickerSubtitle'));
    setText('downloadPickerImagesOnlyNote', t('downloadPickerImagesOnly'));
    setText('downloadPickerCloseBtn', t('close'));
    setText('downloadPickerSelectAllBtn', t('selectAll'));
    setText('downloadPickerClearBtn', t('clearSelection'));
    setText('downloadPickerRescanBtn', t('rescan'));
    setText('downloadPickerDownloadBtn', t('downloadSelected'));
    setText('downloadPickerPremiumTitle', t('downloadPickerPremiumTitle'));
    setText('labelUiLanguage', t('language'));
    setText('labelUiTheme', t('theme'));
    setText('uiThemeDefaultOption', t('themeDefault'));
    setText('uiThemeLogoOption', t('themeLogo'));
    setText('uiThemeDarkOption', t('themeDark'));
    setText('labelConcurrentProcessing', t('concurrentProcessing'));
    setText('labelStaggerDelay', t('staggerDelay'));
    setText('labelGenerationTimeout', t('generationTimeout'));
    setText('labelRetryCount', t('retryCount'));
    setText('labelImportCsvSoon', t('importCsvSoon'));
    setText('csvDisabledBtn', t('disabled'));

    setText('labelEditPrompt', t('editPrompt'));
    setText('saveEditBtn', t('saveChanges'));
    setText('cancelEditBtn', t('cancel'));
    setText('labelRestrictedText', t('restrictedText'));
    setText('labelRestrictedFooter', t('restrictedFooter'));
    const detected = document.getElementById('labelDetectedPrompts');
    if (detected) detected.innerHTML = `${t('detectedPrompts')} (<span id="previewCount">${previewCount?.textContent || '0'}</span>)`;
    setText('goToFlowBtn', t('goToFlow'));

    if (promptInput) {
        const isVideo = lastUiSettings?.flowType === 'video';
        const isMultiline = isVideo && lastUiSettings?.videoMultilinePrompt === true;
        promptInput.placeholder = isMultiline ? t('promptPlaceholderVideoMultiline') : t('promptPlaceholder');
    }
    if (concurrentCount) {
        concurrentCount.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = '1';
        opt.textContent = `1 ${t('atATime')}`;
        concurrentCount.appendChild(opt);
        concurrentCount.value = '1';
        concurrentCount.disabled = true;
    }
    if (uiLanguageSelect) {
        const languageOptionMap = {
            en: 'English',
            ko: 'Korean',
            ja: 'Japanese',
            zh: 'Chinese',
            de: 'German',
            fr: 'French',
            hi: t('languageHindi')
        };
        Array.from(uiLanguageSelect.options).forEach((opt) => {
            if (languageOptionMap[opt.value]) {
                opt.textContent = languageOptionMap[opt.value];
            }
        });
    }
}

function parseFlowContext(url) {
    const safeUrl = url || '';
    const isSupported = safeUrl.includes('google.com/labs/flow') ||
        safeUrl.includes('labs.google/fx') ||
        safeUrl.includes('flow.google');
    if (!isSupported) return { isSupported: false, isSubProject: false };
    try {
        const path = new URL(safeUrl).pathname;
        const parts = path.split('/').filter(Boolean);
        const projectIdx = parts.indexOf('project');
        const hasProjectId = projectIdx !== -1 && !!parts[projectIdx + 1];
        const hasSubId = hasProjectId && !!parts[projectIdx + 2];
        return { isSupported: true, isSubProject: hasSubId };
    } catch {
        return { isSupported: true, isSubProject: false };
    }
}

function updateRestrictedOverlay(isSupported) {
    const overlay = document.getElementById('restrictedAccessOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', isSupported);
    }
}

function applyContextUiLocks() {
    const isSub = currentFlowContext.isSubProject;
    const videoBtn = document.querySelector('[data-flow-type="video"]');
    const imageBtn = document.querySelector('[data-flow-type="image"]');
    const qtyBtns = document.querySelectorAll('[data-qty]');

    if (videoBtn) {
        videoBtn.disabled = isSub;
        videoBtn.style.opacity = isSub ? '0.45' : '';
        videoBtn.title = isSub ? 'Video is not available in sub-project mode.' : '';
    }

    qtyBtns.forEach(btn => {
        const isOne = parseInt(btn.dataset.qty, 10) === 1;
        btn.disabled = isSub && !isOne;
        btn.style.opacity = (isSub && !isOne) ? '0.45' : '';
        btn.title = (isSub && !isOne) ? 'Batch options are not available in sub-project mode.' : '';
        if (isSub) {
            btn.classList.toggle('active', isOne);
        }
    });

    if (isSub && imageBtn) {
        imageBtn.classList.add('active');
    }
}

function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function cleanupEmptySettingCards() {
    if (!settingsPanel) return;
    const cards = Array.from(settingsPanel.querySelectorAll('.config-card'));
    cards.forEach(card => {
        const directChildren = Array.from(card.children);
        if (directChildren.length === 0) return;

        // A card hidden by the membership gate must stay hidden even when it
        // contains otherwise-visible controls. This cleanup only owns empty
        // card layout; it must never undo an entitlement decision.
        if (card.dataset.tierLocked === 'true') {
            card.style.display = 'none';
            return;
        }

        const hasVisibleChild = directChildren.some(child => isElementVisible(child));
        card.style.display = hasVisibleChild ? '' : 'none';
    });
}

function isImageDownloaderUnlocked() {
    return canUseBasicImageDownloader();
}

function isPremiumImageDownloaderUnlocked() {
    // Image Downloader is now Professional/Supporter-tier only (no longer
    // unlocked by plain Premium or the Premium trial) — an intentional
    // tightening confirmed for existing Premium subscribers.
    if (isStripeSubscriptionLapsed()) return false;
    return !!firebaseAuthState.uid && gateState?.disabled !== true && hasProfessionalTierAccess();
}

async function refreshGateIfPremiumLocked(checkFn = canUsePremiumOnlyTools) {
    if (checkFn()) return true;
    const refreshed = await refreshGateState({ forceRemote: true });
    if (refreshed) {
        applySubscriptionGate();
    }
    return checkFn();
}

function syncAuthLandingVisibility() {
    const disabled = isAccountDisabled();
    const accessDenied = !!firebaseAuthState.uid && isStarterInstallRestricted();
    const signedIn = isSignedInForFeatures();
    const showAuthLanding = !signedIn && !disabled;
    document.body.classList.toggle('signed-out-auth-view', showAuthLanding);
    document.body.classList.toggle('account-disabled-view', disabled);
    document.body.classList.toggle('access-denied-view', accessDenied);
    if (authLandingPanel) authLandingPanel.classList.toggle('hidden', !showAuthLanding);
    if (signedIn) clearAuthLandingNotice({ force: true });
    if (controlPanel) controlPanel.classList.toggle('auth-hidden-while-signed-out', showAuthLanding);
    if (settingsPanel) settingsPanel.classList.toggle('auth-hidden-while-signed-out', showAuthLanding);
    if (disabled) {
        navTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.nav === 'control'));
        if (controlPanel) controlPanel.classList.remove('hidden');
        if (settingsPanel) settingsPanel.classList.add('hidden');
    }
    if (premiumLoginBanner) premiumLoginBanner.classList.add('hidden');
    syncAuthEmailMode();
    if (accessDenied) {
        closePremiumFeatureModal();
        closeErrorPopup();
        profileModal?.classList.add('hidden');
        setText('authLandingTitle', t('accessDeniedTitle'));
        setText('authLandingSubtitle', getStarterInstallRestrictionMessage());
        const authIcon = authLandingPanel?.querySelector('.auth-icon');
        if (authIcon) authIcon.textContent = '🔒';
    } else {
        const authIcon = authLandingPanel?.querySelector('.auth-icon');
        if (authIcon) authIcon.textContent = '⌾';
    }
    const needsHostPermission = accessDenied && gateState.starterInstallStatus === 'host_permission_required';
    const canMoveStarterHere = accessDenied && gateState.starterInstallStatus === 'needs_reset';
    authAccessDeniedResetBtn?.classList.toggle('hidden', !canMoveStarterHere && !needsHostPermission);
    if (authAccessDeniedResetBtn) {
        authAccessDeniedResetBtn.disabled = false;
        authAccessDeniedResetBtn.textContent = needsHostPermission
            ? t('enableStarterSecurityCheck')
            : t('moveStarterAccessHere');
    }
    authAccessDeniedSignOutBtn?.classList.toggle('hidden', !accessDenied);
    authAccessDeniedUpgradeBtn?.classList.toggle('hidden', !accessDenied);
}

function applyPremiumFeatureLocks() {
    const assetAccess = canBrowseCharacterReferenceAssets();
    const signedIn = !!firebaseAuthState.uid;
    const professionalAccess = hasProfessionalTierAccess();
    const installRestricted = isStarterInstallRestricted();

    if (sendBugReportBtn) {
        sendBugReportBtn.classList.toggle('hidden', !canSubmitPaidBugReport());
    }

    // Starters see the upsell card; premium/trial users see the premium sections instead.
    const trialExpired = !installRestricted && isTrialExpired();
    const showUpsellCard = signedIn && !installRestricted && !assetAccess && !isAccountDisabled();
    if (premiumUpsellCard) premiumUpsellCard.classList.toggle('hidden', !showUpsellCard);

    // Professional trial upsell — visible whenever the user isn't already
    // professional-tier and hasn't used the one-time 24h trial yet, regardless
    // of their current Premium status (this trial can be used alongside Premium).
    const showProfessionalTrialCard = signedIn && !installRestricted && !isAccountDisabled() && shouldStartProfessionalTrial();
    if (professionalTrialCard) professionalTrialCard.classList.toggle('hidden', !showProfessionalTrialCard);
    if (professionalTrialFeatureList) setFeatureList(professionalTrialFeatureList, tList('professionalFeatures'));

    // Video/Image mode toggle — professional only
    if (controlOutputTypeCard) {
        controlOutputTypeCard.dataset.tierLocked = professionalAccess ? 'false' : 'true';
        controlOutputTypeCard.style.display = professionalAccess ? '' : 'none';
    }

    // Diagnostic logs may contain implementation and authentication details.
    // Keep the viewer private to the app owner's exact Firebase account.
    if (logsConfigCard) {
        const canViewPrivateLogs = firebaseAuthState.uid === PRIVATE_LOG_VIEWER_UID;
        logsConfigCard.dataset.tierLocked = canViewPrivateLogs ? 'false' : 'true';
        logsConfigCard.classList.toggle('hidden', !canViewPrivateLogs);
        logsConfigCard.style.display = canViewPrivateLogs ? '' : 'none';
    }

    // Dark mode is a Professional-tier perk, but the toggle button stays
    // visible for everyone — clicking it while not professional shows a
    // locked message instead of hiding the button outright.
    if (darkModeToggleBtn) {
        darkModeToggleBtn.title = professionalAccess
            ? darkModeToggleBtn.title
            : t('darkModeProfessionalOnly');
    }
    if (uiThemeDarkOption) uiThemeDarkOption.disabled = !professionalAccess;
    // Auto-turn-off dark mode on a real downgrade (Professional trial/membership
    // → Starter or Premium). Gated on gateState.loaded to avoid acting on the
    // default/unfetched gate state during the brief window before the first
    // real gate fetch completes at startup (that transient false-negative was
    // the earlier bug that caused this to fire incorrectly for professional
    // users — it's not a staleness issue with gateState itself once loaded).
    if (gateState?.loaded === true && !professionalAccess && normalizeUiTheme(lastUiSettings?.uiTheme) === 'dark') {
        applyTheme('default');
        if (uiThemeSelect) uiThemeSelect.value = 'default';
        storage.updateSettings({ uiTheme: 'default' });
        if (lastUiSettings) lastUiSettings = { ...lastUiSettings, uiTheme: 'default' };
    }

    if (devMembershipSwitcherCard) {
        devMembershipSwitcherCard.classList.toggle('hidden', !isDevMembershipSwitcherAllowed());
    }

    // Trial expired banner — shown above the feature list when trial ran out
    if (trialExpiredBanner) {
        trialExpiredBanner.classList.toggle('hidden', !trialExpired);
        const label = trialExpiredBanner.querySelector('#labelTrialExpired');
        if (label) label.textContent = t('trialExpiredLabel');
    }

    // Button: after the trial ran out this becomes the primary "Upgrade" CTA
    // (opens the premium modal, whose subscribe button carries the Stripe
    // checkout link). Before/without a trial it offers the 3-day trial.
    if (premiumUpsellBtn) {
        if (trialExpired) {
            premiumUpsellBtn.textContent = t('upgrade');
            premiumUpsellBtn.classList.add('btn-primary');
            premiumUpsellBtn.classList.remove('btn-secondary');
        } else {
            premiumUpsellBtn.textContent = getTrialCtaLabel('premium');
            premiumUpsellBtn.classList.add('btn-primary');
            premiumUpsellBtn.classList.remove('btn-secondary');
        }
    }

    if (professionalTrialBtn) professionalTrialBtn.textContent = getTrialCtaLabel('professional');

    // Trial expiry is explained by the inline banner and Upgrade button.
    // Never open an upsell or error modal merely because the popup launched;
    // modals must follow an explicit user action.
    if (installRestricted) {
        closePremiumFeatureModal();
        closeErrorPopup();
    }
    if (premiumAssetsGroup) {
        premiumAssetsGroup.classList.toggle('hidden', !assetAccess);
        premiumAssetsGroup.classList.remove('premium-assets-locked');
    }

    if (premiumLoginBanner) premiumLoginBanner.classList.add('hidden');
    if (labelPremiumLoginBanner) {
        labelPremiumLoginBanner.textContent = signedIn ? getSignedInProviderLabel() : t('premiumLoginBanner');
    }
    if (loginRequiredBtn) {
        loginRequiredBtn.addEventListener('click', async () => {
            await handleGoogleSignIn();
        });
    }
    if (premiumLoginBtn) {
        premiumLoginBtn.textContent = t('signInShort');
        premiumLoginBtn.style.display = signedIn ? 'none' : '';
    }
    if (authStatusTextSettings) {
        authStatusTextSettings.textContent = signedIn ? getSignedInProviderLabel() : t('ssoSignedOut');
        authStatusTextSettings.style.display = '';
    }
    if (settingsSignInBtn) {
        settingsSignInBtn.textContent = t('signInShort');
        settingsSignInBtn.style.display = signedIn ? 'none' : '';
    }
    if (settingsSignOutBtn) {
        settingsSignOutBtn.textContent = t('signOut');
        settingsSignOutBtn.style.display = signedIn ? '' : 'none';
    }
    if (premiumFeatureBtn) {
        const premiumUnlocked = canUsePremiumOnlyTools();
        const unlockedLabel = hasProfessionalTierAccess() ? t('professionalFeatureUnlockedHeader') : t('premiumFeatureUnlockedHeader');
        premiumFeatureBtn.textContent = premiumUnlocked ? unlockedLabel : t('premiumFeature');
        premiumFeatureBtn.title = premiumUnlocked ? unlockedLabel : t('premiumFeature');
        premiumFeatureBtn.classList.toggle('unlocked', premiumUnlocked);
    }
    if (assetPremiumLockBanner) assetPremiumLockBanner.classList.add('hidden');
    if (characterAssetHelpText) characterAssetHelpText.textContent = t('characterHelpText');
    if (referenceAssetHelpText) referenceAssetHelpText.textContent = t('referenceAssetHelpText');
    updateFirebaseUidDisplay();
    updateProfileAvatarUi();
    updateMembershipUsageDisplay();
    updateProfileModalUi();
    syncAuthLandingVisibility();
}


async function updateMembershipUsageDisplay() {
    const tier = getMembershipTier();
    const hasAccount = !!firebaseAuthState.uid;
    const authenticated = hasAccount && gateState.ssoVerified === true;
    const installRestricted = authenticated && gateState.starterInstallAllowed === false;
    const disabled = isAccountDisabled();
    if (loginRequiredGate) {
        loginRequiredGate.classList.toggle('hidden', authenticated && !disabled && !installRestricted);
        loginRequiredGate.classList.toggle('account-disabled-gate', disabled);
    }
    if (labelLoginRequiredTitle) {
        labelLoginRequiredTitle.textContent = disabled
            ? getAccountDisabledMessage()
            : installRestricted
                ? (gateState.starterInstallStatus === 'starter_maintenance'
                    ? 'Server maintenance'
                    : (currentLanguage === 'ko' ? 'Starter 접속 제한' : 'Starter access restricted'))
                : t('loginRequiredTitle');
    }
    if (labelLoginRequiredBody) {
        labelLoginRequiredBody.textContent = disabled
            ? getAccountDisabledMessage()
            : installRestricted
                ? getStarterInstallRestrictionMessage()
                : t('loginRequiredBody');
    }
    if (loginRequiredBtn) loginRequiredBtn.classList.toggle('hidden', disabled || authenticated);
    if (membershipUsageCard) membershipUsageCard.classList.toggle('hidden', !hasAccount);
    const usage = await getAccountUsage();
    if (membershipUsageTier) membershipUsageTier.textContent = getMembershipLabel(tier);
    if (labelProfileQuota) labelProfileQuota.textContent = t('profileQuota');
    const starterUsageParams = { count: usage.count, limit: usage.limit || STARTER_ACCOUNT_PROMPT_LIMIT };
    const starterResetCountdown = tier === 'starter'
        ? formatStarterQuotaResetCountdown(usage.resetAt)
        : '';
    const starterUsageText = tFormat('starterUsageBody', starterUsageParams)
        + (starterResetCountdown ? ` · ${starterResetCountdown}` : '');
    const starterQuotaText = tFormat('starterQuotaValue', starterUsageParams)
        + (starterResetCountdown ? ` · ${starterResetCountdown}` : '');
    if (labelMembershipUsageBody) {
        labelMembershipUsageBody.textContent = tier === 'disabled'
            ? 'NONE'
            : tier === 'trial'
            ? tFormat('trialEndsAt', { date: formatTrialEndDate() })
            : tier === 'starter'
            ? starterUsageText
            : t('unlimitedUsageBody');
    }
    if (profileQuotaValue) {
        profileQuotaValue.textContent = tier === 'disabled'
            ? 'NONE'
            : tier === 'trial'
                ? tFormat('trialUnlimitedUntil', { date: formatTrialEndDate() })
            : tier === 'starter'
                ? starterQuotaText
                : t('unlimited');
    }
}

function updateProfileAvatarUi() {
    // A blocked Starter is authenticated but must not look successfully
    // signed in while the dedicated NOT ALLOWED screen is visible.
    const signedIn = !!firebaseAuthState.uid && !isStarterInstallRestricted();
    const photo = firebaseAuthState.photoUrl || '';
    profileAvatarBtn?.classList.toggle('hidden', !signedIn);
    [profileAvatarImg, profileModalAvatarImg].forEach((img) => {
        if (!img) return;
        img.classList.toggle('hidden', !photo);
        if (photo) img.src = photo;
    });
    const fallback = (firebaseAuthState.displayName || firebaseAuthState.email || 'G').trim().charAt(0).toUpperCase() || 'G';
    if (profileAvatarFallback) profileAvatarFallback.textContent = fallback;
    if (profileModalAvatarFallback) profileModalAvatarFallback.textContent = fallback;
}

function setFeatureList(listEl, items = []) {
    if (!listEl) return;
    listEl.innerHTML = '';
    items.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        listEl.appendChild(li);
    });
}

function hasStoryboardQueueItems(queue = []) {
    return (Array.isArray(queue) ? queue : []).some((item) => item.status !== QUEUE_STATUS.COMPLETED);
}

function updateProfileModalUi() {
    const tier = getMembershipTier();
    updateProfileAvatarUi();
    if (profileEmailText) profileEmailText.textContent = firebaseAuthState.email || t('ssoSignedOut');
    if (profileUserIdValue) profileUserIdValue.textContent = firebaseAuthState.uid || '-';
    if (profileMembershipValue) profileMembershipValue.textContent = getMembershipLabel(tier);
    if (profileLanguageSelect) profileLanguageSelect.value = currentLanguage;
    setFeatureList(starterFeatureList, tList('starterFeatures'));
    setFeatureList(premiumFeatureList, tList('premiumFeatures'));
    setFeatureList(professionalFeatureList, tList('professionalFeatures'));
    document.querySelectorAll('.profile-tier-card').forEach((card) => card.classList.remove('active'));
    const activeTier = tier;
    document.querySelector('.profile-tier-card.' + activeTier)?.classList.add('active');
    const installRestricted = gateState.starterInstallAllowed === false;
    if (starterInstallAccessNotice) {
        starterInstallAccessNotice.classList.toggle('hidden', !installRestricted);
        if (installRestricted) {
            starterInstallAccessNotice.textContent = getStarterInstallRestrictionMessage();
        }
    }
    if (starterInstallResetBtn) {
        const accountLimit = gateState.starterInstallStatus === 'install_account_limit';
        const maintenance = gateState.starterInstallStatus === 'starter_maintenance';
        const canReset = installRestricted && gateState.starterInstallStatus === 'needs_reset';
        starterInstallResetBtn.classList.toggle('hidden', !installRestricted || accountLimit || maintenance);
        starterInstallResetBtn.disabled = !canReset;
        starterInstallResetBtn.textContent = currentLanguage === 'ko'
            ? (canReset ? 'Starter 권한을 여기로 이동' : '48시간 보안 대기 중')
            : (canReset ? 'Move Starter access here' : '48-hour security wait');
    }
}

function updateFirebaseUidDisplay() {
    const uid = firebaseAuthState.uid || '';
    const signedIn = !!uid;
    if (firebaseUidRow) {
        firebaseUidRow.classList.toggle('hidden', !signedIn);
    }
    if (firebaseUidValue) {
        firebaseUidValue.textContent = signedIn ? uid : '';
        firebaseUidValue.title = signedIn ? uid : '';
    }
    if (copyFirebaseUidBtn) {
        copyFirebaseUidBtn.disabled = !signedIn;
        copyFirebaseUidBtn.textContent = t('copyFirebaseUid');
    }
}

function updateSubscriberConfirmedStatus() {
    if (!subscriberConfirmedStatus) return;
    const confirmed = gateState.subscriberConfirmed === true;
    subscriberConfirmedStatus.classList.toggle('hidden', !confirmed);
    subscriberConfirmedStatus.textContent = t('subscriptionConfirmed');
    subscriberConfirmedStatus.classList.toggle('confirmed', confirmed);
    subscriberConfirmedStatus.classList.remove('subscribed', 'not-confirmed');
}

function applySubscriptionGate() {
    const basicUnlocked = isImageDownloaderUnlocked();
    const canPreviewLockedTools = canPreviewPremiumLockedTools();
    // The 2K/4K auto-download upscale toggle is Premium-or-above (quality itself
    // is capped to 2K vs 4K by getUpscaleDownloadQuality() based on tier) — this
    // must stay separate from the standalone "Image Downloader" batch tool below,
    // which is Professional-only. Conflating the two previously force-unchecked
    // and hid the 2K upscale option for Premium users.
    const upscaleUnlocked = canUseUpscaledGeneratedDownload();
    const downloaderToolUnlocked = isPremiumImageDownloaderUnlocked();
    applyPremiumFeatureLocks();
    updateSubscriberConfirmedStatus();

    if (!basicUnlocked) {
        if (autoDownload) autoDownload.checked = false;
        if (flowUpscaledDownload) flowUpscaledDownload.checked = false;
        // Keep the saved basic-download preference while signed out/locked.
        // The control remains off in the UI and execution is gated separately,
        // but a new eligible account can still receive the enabled-by-default
        // setting after signing in.
        storage.updateSettings({ flowUpscaledDownload: false }).catch(() => { });
    } else if (!upscaleUnlocked && flowUpscaledDownload?.checked) {
        flowUpscaledDownload.checked = false;
        storage.updateSettings({ flowUpscaledDownload: false }).catch(() => { });
    }

    // Show shell for all logged-in users; premium-only parts are toggled within
    if (imageDownloaderGateShell) {
        imageDownloaderGateShell.classList.toggle('hidden', !basicUnlocked);
        imageDownloaderGateShell.classList.remove('locked');
    }

    if (basicUnlocked) {
        // Auto-download (1K) — available to all logged-in users including starters
        if (autoDownload) {
            autoDownload.disabled = false;
            autoDownload.style.opacity = '';
        }

        // 2K/4K upscale row — premium or above (quality capped by tier)
        const upscaleRow = flowUpscaledDownload?.closest('.upscale-download-row');
        if (upscaleRow) upscaleRow.classList.toggle('hidden', !upscaleUnlocked);

        // Page/picker downloader — professional only
        const downloadToolsSection = openDownloadPickerBtn?.closest('div');
        if (downloadToolsSection) downloadToolsSection.classList.toggle('hidden', !downloaderToolUnlocked);

        if (imageDownloaderLockBadge) imageDownloaderLockBadge.classList.add('hidden');
        if (ssoGateCard) ssoGateCard.classList.add('hidden');
        if (imageDownloaderSignedInMsg) imageDownloaderSignedInMsg.classList.add('hidden');
    }

    if (downloadToolsLockedMsg) downloadToolsLockedMsg.style.display = 'none';
    if (gateLockNote) gateLockNote.style.display = 'none';
    if (subscribeGateCard) subscribeGateCard.style.display = 'none';
    if (quickSignInBtn) quickSignInBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (authStatusText) authStatusText.style.display = 'none';
    if (unlockSsoBtn) unlockSsoBtn.style.display = 'none';
    if (unlockSubscribeBtn) unlockSubscribeBtn.style.display = 'none';
    const professionalUnlocked = hasProfessionalTierAccess();
    if (videoMultilinePromptLockOverlay) {
        videoMultilinePromptLockOverlay.classList.toggle('hidden', professionalUnlocked);
    }
    if (!professionalUnlocked && videoMultilinePromptToggle?.checked) {
        videoMultilinePromptToggle.checked = false;
        storage.updateSettings({ videoMultilinePrompt: false }).catch(() => { });
    }
    // Auto-reset video mode on a real downgrade (Professional trial/membership
    // → Starter or Premium). Video mode is Professional-only; leaving the stored
    // flowType as 'video' would keep the UI in a broken/locked state where the
    // output-type card is hidden but video mode is still technically "selected".
    // Gated on gateState.loaded (same guard as the dark-mode reset above) to
    // avoid acting on the default/unfetched gate state during startup.
    if (gateState?.loaded === true && !professionalUnlocked && lastUiSettings?.flowType === 'video') {
        storage.updateSettings({ flowType: 'image', syncFlowSettings: true }).catch(() => { });
        applyFlowTypeUi('image');
        document.querySelectorAll('[data-flow-type]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.flowType === 'image');
        });
        if (lastUiSettings) lastUiSettings = { ...lastUiSettings, flowType: 'image' };
    }
    syncUpscaleDownloadAvailability();
}

async function refreshFlowContextAndApply(settingsForFix = null) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url || '';
    currentFlowContext = parseFlowContext(url);
    updateRestrictedOverlay(currentFlowContext.isSupported);
    applyContextUiLocks();

    if (isFlowProjectTabUrl(url)) {
        try {
            await chrome.storage.local.set({ last_flow_project_url: url });
        } catch { }
    }

    const settings = settingsForFix || await storage.getSettings();
    const patch = {};
    if (currentFlowContext.isSubProject && settings.flowQuantity && parseInt(settings.flowQuantity, 10) !== 1) {
        patch.flowQuantity = 1;
    }
    if (Object.keys(patch).length > 0) {
        await storage.updateSettings(patch);
    }
}

/**
 * Sync a setting directly with the Google Flow page by clicking the matching button
 */
async function syncSettingWithPage(setting, value, label) {
    const allTabs = await chrome.tabs.query({});
    const targetTab = allTabs.find(t => t.active && t.url && isFlowProjectTabUrl(t.url))
        || allTabs.find(t => t.url && isFlowProjectTabUrl(t.url))
        || allTabs.find(t => t.active && t.url && (t.url.includes('google.com/labs/flow') || t.url.includes('labs.google/fx') || t.url.includes('flow.google')))
        || null;

    if (!targetTab?.id) return false;

    const payload = {
        action: 'SET_SETTING',
        setting,
        value,
        label
    };

    const sendToTab = () => new Promise((resolve) => {
        chrome.tabs.sendMessage(targetTab.id, payload, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve({ ok: true, response });
        });
    });

    let result = await sendToTab();
    if (!result.ok) {
        safeSendMessage({ action: 'FORCE_REINJECT' });
        await new Promise((resolve) => setTimeout(resolve, 700));
        result = await sendToTab();
    }

    if (!result.ok) {
        console.warn(`SET_SETTING sync failed for ${setting}:`, result.error);
        return false;
    }
    return true;
}

/**
 * Initialize the popup UI
 */
async function init() {
    await logAuthConfigDiagnostics();
    if (extensionVersionBadge) {
        extensionVersionBadge.textContent = `v${getCurrentExtensionVersion()}`;
    }
    const [queue, state, loadedSettings, initialLogs] = await Promise.all([
        storage.getQueue(),
        storage.getState(),
        storage.getSettings(),
        storage.getLogs()
    ]);
    let settings = loadedSettings;

    applyTranslations(settings?.uiLanguage || 'en');
    if (uiLanguageSelect) uiLanguageSelect.value = currentLanguage;
    applyTheme(settings?.uiTheme || 'default');
    if (uiThemeSelect) uiThemeSelect.value = normalizeUiTheme(settings?.uiTheme || 'default');
    await refreshFlowContextAndApply(settings);
    await loadClockWatermark();
    await loadFirebaseAuthState();
    await loadBillingConfigCache();
    await loadPremiumModalConfigCache();
    await loadGateStateCache();
    await refreshGateState({ forceRemote: true });
    chrome.runtime.sendMessage({ action: 'TRACK_PANEL_OPEN_ANALYTICS' }).catch(() => {});
    // A long-lived preview/popup also picks up an administrator's Starter
    // maintenance switch within one minute. Normal Chrome popups are destroyed
    // when closed, so this does not create background polling traffic.
    setInterval(() => {
        if (document.hidden || !firebaseAuthState.uid || isAccountDisabled()) return;
        // Keep the visible quota countdown moving even if the policy refresh
        // is slow or temporarily unavailable.
        void updateMembershipUsageDisplay();
        void syncStarterInstallAccess({ forceRemote: true }).then(() => {
            applySubscriptionGate();
            void updateMembershipUsageDisplay();
            updateProfileModalUi();
        });
    }, STARTER_POLICY_CACHE_TTL_MS);
    settings = await enforceStrictPremiumFeatureAccess(settings);
    applySubscriptionGate();
    maybeShowRemoteNotification();
    maybeShowPromoBanner();
    cleanupEmptySettingCards();

    updateUI(queue, state, settings, initialLogs);
    await restoreUnusualActivityRecoveryPopup();
    await consumeExternalPromptQueueRequest();
    await initReferenceAsset();

    // Nav Tab switching
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (isAccountDisabled()) {
                navTabs.forEach(t => t.classList.toggle('active', t.dataset.nav === 'control'));
                controlPanel.classList.remove('hidden');
                settingsPanel.classList.add('hidden');
                return;
            }
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.dataset.nav === 'control') {
                controlPanel.classList.remove('hidden');
                settingsPanel.classList.add('hidden');
            } else {
                controlPanel.classList.add('hidden');
                settingsPanel.classList.remove('hidden');
            }
        });
    });

    // Delay Buttons
    delayInc.addEventListener('click', () => {
        delaySeconds.value = parseInt(delaySeconds.value) + 1;
        saveSettings();
    });

    delayDec.addEventListener('click', () => {
        if (parseInt(delaySeconds.value) > 1) {
            delaySeconds.value = parseInt(delaySeconds.value) - 1;
            saveSettings();
        }
    });

    // Flow Specific Selectors (Ratio / Quantity / Model)
    const ratioBtns = document.querySelectorAll('[data-ratio]');
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            storage.updateSettings({ flowAspectRatio: btn.dataset.ratio });
            syncSettingWithPage('flowAspectRatio', btn.dataset.ratio, btn.innerText.trim());
        });
    });

    const qtyBtns = document.querySelectorAll('[data-qty]');
    qtyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            qtyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            storage.updateSettings({ flowQuantity: parseInt(btn.dataset.qty) });
            syncSettingWithPage('flowQuantity', parseInt(btn.dataset.qty), btn.innerText.trim());
        });
    });

    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            storage.updateSettings({ flowModel: modelSelect.value });
            const selectedText = modelSelect.options[modelSelect.selectedIndex].text;
            syncSettingWithPage('flowModel', modelSelect.value, selectedText);
        });
    }

    if (videoModelSelect) {
        videoModelSelect.addEventListener('change', async () => {
            const sanitized = sanitizeVideoSettings({
                videoModel: videoModelSelect.value || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
                videoMode: lastUiSettings?.videoMode,
                videoDurationSeconds: lastUiSettings?.videoDurationSeconds,
                videoEndFrameSelection: lastUiSettings?.videoEndFrameSelection,
                videoVoiceReference: lastUiSettings?.videoVoiceReference
            });
            await storage.updateSettings({
                videoModel: sanitized.videoModel,
                videoMode: sanitized.videoMode,
                videoDurationSeconds: sanitized.videoDurationSeconds,
                videoEndFrameSelection: sanitized.videoEndFrameSelection,
                videoVoiceReference: sanitized.videoVoiceReference
            });
            await syncSettingWithPage('videoModel', sanitized.videoModel, sanitized.videoModel);
            if (sanitized.warnings.length) {
                showGateStatus(sanitized.warnings[0], true);
            }
            await refreshUI();
        });
    }

    const videoModeBtns = document.querySelectorAll('[data-video-mode]');
    videoModeBtns.forEach((btn) => {
        btn.addEventListener('click', async () => {
            videoModeBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const sanitized = sanitizeVideoSettings({
                videoMode: btn.dataset.videoMode || FLOW_VIDEO_MODES.INGREDIENTS,
                videoModel: lastUiSettings?.videoModel,
                videoDurationSeconds: lastUiSettings?.videoDurationSeconds,
                videoEndFrameSelection: lastUiSettings?.videoEndFrameSelection,
                videoVoiceReference: lastUiSettings?.videoVoiceReference
            });
            await storage.updateSettings({
                videoMode: sanitized.videoMode,
                videoDurationSeconds: sanitized.videoDurationSeconds,
                videoEndFrameSelection: sanitized.videoEndFrameSelection,
                videoVoiceReference: sanitized.videoVoiceReference
            });
            if (sanitized.videoMode !== (btn.dataset.videoMode || FLOW_VIDEO_MODES.INGREDIENTS)) {
                // The selected model doesn't support the clicked mode, so
                // sanitizeVideoSettings silently reverted it — surface that
                // instead of leaving the click looking like a no-op.
                showGateStatus(sanitized.warnings[0] || t('videoModeUnsupportedByModel'), true);
            }

            // Prompts that follow the global default now switch mode with it.
            // While per-prompt overrides are OFF, no item should carry its own
            // fixed videoMode/videoModel/videoDurationSeconds at all — clear
            // those fields so every prompt reads the live global setting
            // instead of whatever value happened to be baked in when it was
            // added to the queue. Also drop image selections from the mode
            // being switched away from so stale ingredient/frame images don't
            // linger unused.
            const perPromptOverridesOn = (await storage.getSettings()).videoPerPromptModelEnabled === true;
            const queue = await storage.getQueue();
            let queueChanged = false;
            const nextQueue = queue.map((item) => {
                if (perPromptOverridesOn && item.videoMode) return item; // explicit per-prompt override — leave alone
                let next = item;
                if (!perPromptOverridesOn && (item.videoMode || item.videoModel || item.videoDurationSeconds)) {
                    queueChanged = true;
                    next = { ...next, videoMode: null, videoModel: null, videoDurationSeconds: null };
                }
                if (sanitized.videoMode === FLOW_VIDEO_MODES.FRAMES) {
                    if (next.videoIngredientSelections?.length) {
                        queueChanged = true;
                        next = { ...next, videoIngredientSelections: [] };
                    }
                } else if (next.videoStartFrameSelection || next.videoEndFrameSelection) {
                    queueChanged = true;
                    next = { ...next, videoStartFrameSelection: null, videoEndFrameSelection: null };
                }
                return next;
            });
            if (queueChanged) await storage.setQueue(nextQueue);

            await syncSettingWithPage('videoMode', sanitized.videoMode, sanitized.videoMode);
            await refreshUI();
        });
    });

    if (videoPerPromptModelToggle) {
        videoPerPromptModelToggle.addEventListener('change', async () => {
            await storage.updateSettings({ videoPerPromptModelEnabled: videoPerPromptModelToggle.checked });
            await refreshUI();
        });
    }

    // Video aspect ratio (9:16 / 16:9) — video always generates a single
    // output per prompt, so there's no quantity control to wire here.
    const videoRatioBtns = document.querySelectorAll('[data-video-ratio]');
    videoRatioBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            videoRatioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await storage.updateSettings({ videoAspectRatio: btn.dataset.videoRatio });
            await syncSettingWithPage('videoAspectRatio', btn.dataset.videoRatio, btn.innerText.trim());
        });
    });

    // Flow Type (Image/Video)
    const flowTypeBtns = document.querySelectorAll('[data-flow-type]');
    flowTypeBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            flowTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await storage.updateSettings({ flowType: btn.dataset.flowType, syncFlowSettings: true });
            applyFlowTypeUi(btn.dataset.flowType);
            // Best-effort sync: Flow tab may not be open yet; automation will apply the mode on next run.
            syncSettingWithPage('flowType', btn.dataset.flowType, btn.innerText.trim()).catch(() => {});
        });
    });

    // Force Refresh / Re-inject
    if (forceRefreshBtn) {
        forceRefreshBtn.addEventListener('click', async () => {
            const installPermissionPromise = requestInstallFunctionsHostPermission().catch(() => false);
            await chrome.storage.local.remove(REMOTE_NOTIFICATION_CACHE_KEY);
            await invalidateFirestoreGateCache();
            if (statusBar) {
                statusBar.classList.remove('hidden');
                statusBar.textContent = 'Checking notices...';
            }
            maybeShowRemoteNotification({ forceFetch: true });
            await installPermissionPromise;
            await refreshGateState({ forceRemote: true });
            await refreshUI();
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                statusBar.classList.remove('hidden');
                statusBar.textContent = t('refreshingConnectionMsg');
                safeSendMessage({ action: 'FORCE_REINJECT' });
                setTimeout(() => {
                    statusBar.textContent = t('ready');
                }, 1000);
            }
        });
    }

    if (userGuideBtn) {
        userGuideBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: USER_GUIDE_URL });
        });
    }

    if (premiumFeatureBtn) {
        premiumFeatureBtn.addEventListener('click', openPremiumFeatureModal);
    }
    if (premiumUpsellBtn) {
        premiumUpsellBtn.addEventListener('click', handlePremiumTrialActivation);
    }
    if (professionalTrialBtn) {
        professionalTrialBtn.addEventListener('click', handleProfessionalTrialActivation);
    }
    if (devSetStarterBtn) devSetStarterBtn.addEventListener('click', () => devSetMembershipTier('starter'));
    if (devSetPremiumBtn) devSetPremiumBtn.addEventListener('click', () => devSetMembershipTier('premium'));
    if (devSetProfessionalBtn) devSetProfessionalBtn.addEventListener('click', () => devSetMembershipTier('professional'));
    if (devResetTrialBtn) devResetTrialBtn.addEventListener('click', () => devSetMembershipTier('reset_trial'));
    if (storyboardBtn) {
        storyboardBtn.addEventListener('click', openStoryboardOverview);
    }
    if (storyboardOverviewCloseBtn) {
        storyboardOverviewCloseBtn.addEventListener('click', closeStoryboardOverview);
    }
    if (storyboardOverviewModal) {
        storyboardOverviewModal.addEventListener('click', (event) => {
            if (event.target === storyboardOverviewModal) closeStoryboardOverview();
        });
    }
    if (authGoogleBtn) {
        authGoogleBtn.addEventListener('click', handleGoogleSignIn);
    }
    if (authEmailSubmitBtn) {
        authEmailSubmitBtn.addEventListener('click', handleEmailAuthSubmit);
    }
    if (authAccessDeniedUpgradeBtn) {
        authAccessDeniedUpgradeBtn.addEventListener('click', () => {
            openPremiumFeatureModal({ allowWhileInstallRestricted: true });
        });
    }
    if (authAccessDeniedResetBtn) {
        authAccessDeniedResetBtn.addEventListener('click', async () => {
            if (gateState.starterInstallStatus === 'host_permission_required') {
                try {
                    authAccessDeniedResetBtn.disabled = true;
                    const granted = await requestInstallFunctionsHostPermission();
                    if (!granted) {
                        showAuthLandingNotice(t('starterSecurityPermissionDenied'), true, false, true);
                        return;
                    }
                    await syncStarterInstallAccess({ forceRemote: true });
                    applySubscriptionGate();
                    syncAuthLandingVisibility();
                } catch (error) {
                    showAuthLandingNotice(error?.message || t('starterSecurityPermissionDenied'), true, false, true);
                } finally {
                    authAccessDeniedResetBtn.disabled = false;
                }
                return;
            }
            if (gateState.starterInstallStatus !== 'needs_reset') return;
            if (!window.confirm(t('moveStarterAccessConfirm'))) return;
            try {
                authAccessDeniedResetBtn.disabled = true;
                await resetStarterInstallAccessHere();
                showAuthLandingNotice(t('moveStarterAccessSuccess'), false, true, true);
                syncAuthLandingVisibility();
            } catch (error) {
                authAccessDeniedResetBtn.disabled = false;
                showAuthLandingNotice(error?.message || t('moveStarterAccessFailed'), true, false, true);
                await refreshGateState({ forceRemote: true });
                syncAuthLandingVisibility();
            }
        });
    }
    if (authAccessDeniedSignOutBtn) {
        authAccessDeniedSignOutBtn.addEventListener('click', handleGoogleSignOut);
    }
    if (authPasswordInput) {
        authPasswordInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') handleEmailAuthSubmit();
        });
    }
    if (authModeToggleBtn) {
        authModeToggleBtn.addEventListener('click', () => {
            authEmailMode = authEmailMode === 'create' ? 'signIn' : 'create';
            clearAuthLandingNotice();
            syncAuthEmailMode();
        });
    }
    if (authForgotPasswordBtn) {
        authForgotPasswordBtn.addEventListener('click', handlePasswordReset);
    }
    if (authTogglePasswordBtn) {
        authTogglePasswordBtn.addEventListener('click', () => {
            if (!authPasswordInput) return;
            authPasswordInput.type = authPasswordInput.type === 'password' ? 'text' : 'password';
        });
    }
    if (profileAvatarBtn) {
        profileAvatarBtn.addEventListener('click', async () => {
            updateProfileModalUi();
            await updateMembershipUsageDisplay();
            profileModal?.classList.remove('hidden');
        });
    }
    if (membershipUsageCard) {
        const openMembershipProfile = async () => {
            updateProfileModalUi();
            await updateMembershipUsageDisplay();
            profileModal?.classList.remove('hidden');
        };
        membershipUsageCard.addEventListener('click', openMembershipProfile);
        membershipUsageCard.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openMembershipProfile();
        });
    }
    if (profileCloseBtn) profileCloseBtn.addEventListener('click', () => profileModal?.classList.add('hidden'));
    if (profileModal) profileModal.addEventListener('click', (event) => { if (event.target === profileModal) profileModal.classList.add('hidden'); });
    if (profileCopyUidBtn) profileCopyUidBtn.addEventListener('click', async () => {
        const uid = firebaseAuthState.uid || '';
        if (!uid) return;
        try { await navigator.clipboard.writeText(uid); showGateStatus(t('firebaseUidCopied')); } catch { showGateStatus(t('firebaseUidCopyFailed'), true); }
    });
    if (profileLanguageSelect) profileLanguageSelect.addEventListener('change', async () => {
        const lang = profileLanguageSelect.value || 'en';
        applyTranslations(lang);
        await storage.updateSettings({ uiLanguage: lang });
        if (uiLanguageSelect) uiLanguageSelect.value = lang;
        updateProfileModalUi();
    });
    if (starterInstallResetBtn) starterInstallResetBtn.addEventListener('click', async () => {
        try {
            starterInstallResetBtn.disabled = true;
            await resetStarterInstallAccessHere();
            showGateStatus(currentLanguage === 'ko' ? 'Starter 권한을 이 브라우저로 옮겼습니다.' : 'Starter access moved to this browser.');
        } catch (error) {
            showGateStatus(error?.message || 'Starter access could not be moved.', true);
        } finally {
            updateProfileModalUi();
        }
    });
    if (profileSignOutBtn) profileSignOutBtn.addEventListener('click', async () => { profileModal?.classList.add('hidden'); await handleGoogleSignOut(); });
    if (premiumFeatureCloseBtn) {
        premiumFeatureCloseBtn.addEventListener('click', closePremiumFeatureModal);
    }
    if (premiumFeatureModal) {
        premiumFeatureModal.addEventListener('click', (event) => {
            if (event.target === premiumFeatureModal) {
                closePremiumFeatureModal();
            }
        });
    }
    if (premiumYoutubeBtn) {
        premiumYoutubeBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: YOUTUBE_SUBSCRIBE_URL });
        });
    }
    if (premiumReviewBtn) {
        premiumReviewBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: CHROME_WEB_STORE_URL });
        });
    }
    if (premiumFormBtn) {
        premiumFormBtn.addEventListener('click', openPremiumAccessForm);
    }

    if (subscribeYoutubeBtn) {
        subscribeYoutubeBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: YOUTUBE_SUBSCRIBE_URL });
        });
    }
    if (settingsSubscribeYoutubeBtn) {
        settingsSubscribeYoutubeBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: YOUTUBE_SUBSCRIBE_URL });
        });
    }

    if (unlockSubscribeBtn) {
        unlockSubscribeBtn.addEventListener('click', async () => {
            await invalidateFirestoreGateCache();
            await refreshGateState({ forceRemote: true });
            await refreshUI();
        });
    }

    if (googleSsoBtn) {
        googleSsoBtn.addEventListener('click', async () => {
            await handleGoogleSignIn();
        });
    }
    if (premiumLoginBtn) {
        premiumLoginBtn.addEventListener('click', async () => {
            if (firebaseAuthState.uid && gateState.ssoVerified === true) {
                await handleGoogleSignOut();
                return;
            }
            await handleGoogleSignIn();
        });
    }
    if (copyFirebaseUidBtn) {
        copyFirebaseUidBtn.addEventListener('click', async () => {
            const uid = firebaseAuthState.uid || '';
            if (!uid) return;
            try {
                await navigator.clipboard.writeText(uid);
                showGateStatus(t('firebaseUidCopied'));
            } catch {
                showGateStatus(t('firebaseUidCopyFailed'), true);
            }
        });
    }
    if (quickSignInBtn) {
        quickSignInBtn.addEventListener('click', async () => {
            await handleGoogleSignIn();
        });
    }
    if (settingsSignInBtn) {
        settingsSignInBtn.addEventListener('click', async () => {
            await handleGoogleSignIn();
        });
    }

    if (unlockSsoBtn) {
        unlockSsoBtn.addEventListener('click', async () => {
            await invalidateFirestoreGateCache();
            await refreshGateState({ forceRemote: true });
            await refreshUI();
        });
    }
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            await handleGoogleSignOut();
        });
    }
    if (settingsSignOutBtn) {
        settingsSignOutBtn.addEventListener('click', async () => {
            await handleGoogleSignOut();
        });
    }
    if (imageDownloaderSignOutBtn) {
        imageDownloaderSignOutBtn.addEventListener('click', async () => {
            await handleGoogleSignOut();
        });
    }

    if (donateBtn) {
        donateBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: DONATION_URL });
        });
    }



    // Modal Events
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', async () => {
            const newPrompt = editModalInput.value.trim();
            if (currentlyEditingId && newPrompt) {
                const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
                const idx = queue.findIndex(item => item.id === currentlyEditingId);
                if (idx !== -1) {
                    let updatedItem = { ...queue[idx], prompt: newPrompt };
                    updatedItem = autoBindAssetsByPromptMentions(updatedItem, settings);
                    queue[idx] = updatedItem;
                    await storage.setQueue(queue);
                }
                editModal.classList.add('hidden');
                resetEditModalState();
                refreshUI();
                return;
            }
            if (currentlyEditingVideoAssetKey !== null) {
                const settings = await storage.getSettings();
                const current = dedupeReferenceSelections(settings.videoAssetQueue || []);
                const next = reindexVideoAssetQueue(current.map((item) => {
                    if (getReferenceAssetKey(item) !== currentlyEditingVideoAssetKey) return item;
                    return { ...item, videoPrompt: newPrompt };
                }));
                await storage.updateSettings({ videoAssetQueue: next });
                renderVideoAssetQueue(next);
                editModal.classList.add('hidden');
                resetEditModalState();
                return;
            }
            editModal.classList.add('hidden');
            resetEditModalState();
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editModal.classList.add('hidden');
            resetEditModalState();
        });
    }

    // Prompt Input Preview
    promptInput.addEventListener('input', () => {
        updatePromptPreview();
        syncStartButtonMode();
    });
    updatePromptPreview();

    // Add Prompts Button (Manual Stage)
    const addPromptsBtn = document.getElementById('addPromptsBtn');
    if (addPromptsBtn) {
        addPromptsBtn.addEventListener('click', async () => {
            if (!requireSignedInForFeature()) return;
            if (!(await requireActiveFlowProjectForPrompts())) return;
            const text = promptInput.value.trim();
            if (text) {
                const settings = await storage.getSettings();
                const shouldUsePerPromptAssets = settings.flowType === 'video'
                    ? false
                    : canUsePerPromptAssets() && !!settings.perPromptAssetsEnabled;
                if (settings.flowType !== 'video' && !!settings.perPromptAssetsEnabled && !shouldUsePerPromptAssets) {
                    showGateStatus(t('perPromptAssetsLocked'), true);
                }
                await handleAddPrompts({ perPromptAssets: shouldUsePerPromptAssets });
                await refreshUI();
                if (settings.flowType === 'video' || shouldUsePerPromptAssets) {
                    revealQueueAssetReview();
                    showGateStatus(settings.flowType === 'video' ? t('queueChooseVideoMode') : t('reviewPromptAssetsBeforeStart'));
                }
            } else {
                alert(t('pleaseEnterPrompts'));
            }
        });
    }

    if (csvGuideBtn) {
        csvGuideBtn.addEventListener('click', () => {
            alert(t('csvGuideMessage'));
        });
    }

    // Start Queue
    startBtn.addEventListener('click', async () => {
        // Existing signed-in 2.0 users keep their session. Their first 2.1 Run
        // click supplies the user gesture Chrome requires for the optional
        // Function host permission. Refusal never blocks elevated membership.
        const installPermissionPromise = lastUiState === AUTOMATOR_STATE.RUNNING
            ? Promise.resolve(false)
            : requestInstallFunctionsHostPermission().catch(() => false);
        if (!requireSignedInForFeature()) return;
        const installPermissionGranted = await installPermissionPromise;
        if (installPermissionGranted && hasInstallExemptMembership()) {
            await syncStarterInstallAccess({ forceRemote: true });
        }
        await refreshFlowContextAndApply();
        const state = await storage.getState();
        let settings = await storage.getSettings();
        if (state === AUTOMATOR_STATE.RUNNING) {
            const text = promptInput.value.trim();
            if (text) {
                if (!(await requireActiveFlowProjectForPrompts())) return;
                const shouldQueueForAssets = settings.flowType === 'video'
                    ? false
                    : canUsePerPromptAssets() && !!settings.perPromptAssetsEnabled;
                if (settings.flowType !== 'video' && !!settings.perPromptAssetsEnabled && !shouldQueueForAssets) {
                    showGateStatus(t('perPromptAssetsLocked'), true);
                    return;
                }
                await handleAddPrompts({ perPromptAssets: shouldQueueForAssets });
                await refreshUI();
                if (settings.flowType === 'video' || shouldQueueForAssets) {
                    revealQueueAssetReview();
                }
                showGateStatus(t('queuedWhileRunning'));
                return;
            }
            await sendCommand('STOP');
        } else {
            if (!(await requireActiveFlowProjectForPrompts())) return;
            settings = await refreshPremiumGateBeforePromptRun();
            settings = await removeLockedPerPromptAssetsBeforeRun(settings);

            const text = promptInput.value.trim();
            // Only add from input if there's something typed
            if (text) {
                const shouldQueueForAssets = settings.flowType === 'video'
                    ? false
                    : canUsePerPromptAssets() && !!settings.perPromptAssetsEnabled;
                if (settings.flowType !== 'video' && !!settings.perPromptAssetsEnabled && !shouldQueueForAssets) {
                    showGateStatus(t('perPromptAssetsLocked'), true);
                    return;
                }
                await handleAddPrompts({ perPromptAssets: shouldQueueForAssets });
                await refreshUI();
                if (settings.flowType === 'video' || shouldQueueForAssets) {
                    revealQueueAssetReview();
                    showGateStatus(settings.flowType === 'video' ? t('queueChooseVideoMode') : t('reviewPromptAssetsBeforeStart'));
                    return;
                }
            }
            // Only ask to clean up if stale items are piling up (10+)
            const existingQueue = await storage.getQueue();
            const staleCount = existingQueue.filter(i =>
                i.status === QUEUE_STATUS.COMPLETED || i.status === QUEUE_STATUS.FAILED
            ).length;
            if (staleCount >= 20) {
                if (confirm(tFormat('cleanupStaleItemsConfirm', { count: staleCount }))) {
                    const cleanedQueue = existingQueue.filter(i =>
                        i.status !== QUEUE_STATUS.COMPLETED && i.status !== QUEUE_STATUS.FAILED
                    );
                    await storage.setQueue(cleanedQueue);
                }
            }
            // Check we actually have something to process
            let finalQueue = await storage.getQueue();
            if (!finalQueue.some(i => i.status === QUEUE_STATUS.PENDING || i.status === QUEUE_STATUS.IN_PROGRESS)) {
                const reusableCompletedItem = finalQueue.find(i => i.status === QUEUE_STATUS.COMPLETED);
                if (reusableCompletedItem) {
                    await reuseCompletedQueueItem(reusableCompletedItem.id, { silent: true });
                    finalQueue = await storage.getQueue();
                }
            }
            if (!finalQueue.some(i => i.status === QUEUE_STATUS.PENDING || i.status === QUEUE_STATUS.IN_PROGRESS)) {
                alert(t('noQueueItemsToRun'));
                return;
            }
            if (settings.flowType === 'video') {
                const runnableVideoItems = finalQueue.filter(i => i.status === QUEUE_STATUS.PENDING || i.status === QUEUE_STATUS.IN_PROGRESS);
                for (const item of runnableVideoItems) {
                    const sanitized = sanitizeVideoSettings({
                        videoMode: item.videoMode || settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS,
                        videoModel: item.videoModel || settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
                        videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
                        videoEndFrameSelection: item.videoEndFrameSelection || null,
                        videoVoiceReference: item.videoVoiceReference || '',
                        prompt: item.prompt || ''
                    });
                    await storage.updateQueueItem(item.id, {
                        videoMode: sanitized.videoMode,
                        videoModel: sanitized.videoModel,
                        videoDurationSeconds: sanitized.videoDurationSeconds,
                        videoEndFrameSelection: sanitized.videoEndFrameSelection,
                        videoVoiceReference: sanitized.videoVoiceReference
                    });
                    if (sanitized.warnings.length) {
                        showGateStatus(sanitized.warnings[0], true);
                    }
                    const mode = sanitized.videoMode;
                    if (!mode) {
                        showGateStatus(t('videoModeRequired'), true);
                        revealQueueAssetReview();
                        return;
                    }
                    if (mode === FLOW_VIDEO_MODES.FRAMES) {
                        if (!item.videoStartFrameSelection) {
                            showGateStatus(t('videoFrameStartRequired'), true);
                            revealQueueAssetReview();
                            return;
                        }
                    }
                    // Ingredients mode's image(s) are optional — Flow can generate from
                    // the text prompt alone, so no image selection is required here.
                }
            }
            if (!(await ensureStarterQuotaBeforeRun(finalQueue))) {
                return;
            }
            const startResult = await sendCommand('START');
            if (!startResult?.ok) {
                showGateStatus(startResult?.error || 'Failed to start queue.', true);
            }
            await refreshUI();
        }
    });

    // Reset Queue
    resetBtn.addEventListener('click', async () => {
        if (confirm(t('confirmClearQueue'))) {
            // Stop the worker first so it cannot write an in-flight item back
            // after the local queue has been cleared.
            await sendCommand('STOP').catch(() => null);
            await storage.resetFlow();
            setQueueTab('open');
            await refreshUI();
        }
    });

    sendBugReportBtn?.addEventListener('click', submitRecentBugReport);

    if (rerunUnfinishedBtn) {
        rerunUnfinishedBtn.addEventListener('click', async () => {
            const state = await storage.getState();
            if (state === AUTOMATOR_STATE.RUNNING) return;
            const queue = await storage.getQueue();
            let changed = 0;
            const nextQueue = queue.map((item) => {
                if (item.status === QUEUE_STATUS.COMPLETED || item.status === QUEUE_STATUS.PENDING) {
                    return item;
                }
                if (item.status === QUEUE_STATUS.FAILED || item.status === QUEUE_STATUS.IN_PROGRESS) {
                    changed++;
                    return {
                        ...item,
                        status: QUEUE_STATUS.PENDING,
                        retries: 0,
                        error: null,
                        detail: '',
                        completedAt: null,
                        resultUrl: null
                    };
                }
                return item;
            });

            if (!changed) {
                showGateStatus(t('noUnfinishedToRetry'));
                return;
            }

            if (!confirm(t('retryUnfinishedConfirm'))) return;
            await storage.setQueue(nextQueue);
            await storage.setState(AUTOMATOR_STATE.STOPPED);
            showGateStatus(t('retryUnfinishedReady'));
            refreshUI();
        });
    }

    // Download Page Button Actions
    if (downloadPageBtn) {
        downloadPageBtn.addEventListener('click', () => {
            startPageImageDownload();
        });
    }
    if (openDownloadPickerBtn) {
        openDownloadPickerBtn.addEventListener('click', (event) => {
            event.preventDefault();
            openDownloadPicker();
        });
    }
    downloadQualityBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            selectedDownloadQuality = btn.dataset.downloadQuality === '2k' ? '2k' : '1k';
            downloadQualityBtns.forEach((other) => {
                other.classList.toggle('active', other === btn);
            });
        });
    });
    if (downloadPickerCloseBtn) {
        downloadPickerCloseBtn.addEventListener('click', closeDownloadPicker);
    }
    if (downloadPickerModal) {
        downloadPickerModal.addEventListener('click', (event) => {
            if (event.target === downloadPickerModal) closeDownloadPicker();
        });
    }
    if (downloadPickerSelectAllBtn) {
        downloadPickerSelectAllBtn.addEventListener('click', () => {
            if (!isPremiumImageDownloaderUnlocked()) {
                showGateStatus(t('downloadToolsLocked'));
                return;
            }
            downloadPickerSelectedIds = new Set(downloadPickerAssets.map(asset => asset.id));
            renderDownloadPicker();
        });
    }
    if (downloadPickerClearBtn) {
        downloadPickerClearBtn.addEventListener('click', () => {
            downloadPickerSelectedIds.clear();
            renderDownloadPicker();
        });
    }
    if (downloadPickerRescanBtn) {
        downloadPickerRescanBtn.addEventListener('click', () => {
            openDownloadPicker({ forceRescan: true });
        });
    }
    if (downloadPickerDownloadBtn) {
        downloadPickerDownloadBtn.addEventListener('click', () => {
            startPageImageDownload({ selectedIds: Array.from(downloadPickerSelectedIds) });
        });
    }
    if (promoBannerLink) {
        promoBannerLink.addEventListener('click', (e) => {
            e.preventDefault();
            const url = promoBannerLink.href;
            if (!url || url.endsWith('#')) return;
            chrome.tabs.create({ url });
        });
    }
    if (errorPopupCloseBtn) {
        errorPopupCloseBtn.addEventListener('click', () => { handleErrorPopupClose().catch(() => {}); });
    }
    if (errorPopupModal) {
        errorPopupModal.addEventListener('click', (event) => {
            if (event.target === errorPopupModal) closeErrorPopup();
        });
    }

    if (stopDownloadBtn) stopDownloadBtn.addEventListener('click', triggerStop);
    if (headerStopBtn) headerStopBtn.addEventListener('click', triggerStop);
    // Dry Run temporarily disabled while debugging the real Run flow.
    if (videoDryRunBtn) {
        videoDryRunBtn.classList.add('hidden');
    }
    if (videoAutoAddBtn) {
        videoAutoAddBtn.addEventListener('click', autoAddVideoAssetsByScene);
    }
    if (videoPromptModalBtn) {
        videoPromptModalBtn.addEventListener('click', openVideoPromptModal);
    }
    if (videoPromptBatchSaveBtn) {
        videoPromptBatchSaveBtn.addEventListener('click', saveVideoPromptModal);
    }
    if (videoPromptBatchCancelBtn) {
        videoPromptBatchCancelBtn.addEventListener('click', closeVideoPromptModal);
    }
    if (videoPromptBatchModal) {
        videoPromptBatchModal.addEventListener('click', (event) => {
            if (event.target === videoPromptBatchModal) {
                closeVideoPromptModal();
            }
        });
    }
    if (videoClearQueueBtn) {
        videoClearQueueBtn.addEventListener('click', async () => {
            await storage.updateSettings({ videoAssetQueue: [] });
            renderVideoAssetQueue([]);
            if (referenceAssetPickerMode === 'video' && referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
                const settings = await storage.getSettings();
                referenceAssetPickerDraft = [];
                renderReferenceAssetPicker(settings.videoAvailableAssets || [], [], 'video');
            }
            showGateStatus(t('clearedVideoQueue'));
        });
    }

    // Listen for completion and progress
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'PROMPT_FINISHED' && (message.id?.startsWith('history_download_') || message.id?.startsWith('page_download_'))) {
            resetDownloadBtns();
            if (statusBar) {
                statusBar.textContent = t('finished');
                setTimeout(() => {
                    if (statusBar.textContent === t('finished')) {
                        statusBar.textContent = t('ready');
                    }
                }, 4000);
            }
        }

        if (message.action === 'UPDATE_PROGRESS') {
            if (statusBar && message.detail) {
                statusBar.classList.remove('hidden');
                statusBar.textContent = message.detail;
                const errorProgress = looksLikeErrorProgress(message.detail);
                statusBar.dataset.state = errorProgress
                    ? 'error'
                    : (/cooldown|waiting 5 minutes|waiting 30 seconds|resumes in/i.test(message.detail) ? 'warning' : 'running');
                if (isUnusualActivityRecoveryPhase(message.recoveryPhase)) {
                    showErrorPopup(message.detail, {
                        force: true,
                        recoveryPhase: message.recoveryPhase,
                        countdownUntil: message.recoveryPhase === 'post_reload'
                            ? message.resumeAt
                            : message.cooldownUntil
                    });
                    statusBar.textContent = message.recoveryPhase === 'post_reload'
                        ? t('recoveryPostReloadTitle')
                        : t('recoveryCooldownTitle');
                    statusBar.dataset.state = 'warning';
                } else if (message.recoveryPhase === 'armed') {
                    if (activeErrorPopupRecoveryPhase) closeErrorPopup();
                    statusBar.dataset.state = 'running';
                } else if (message.recoveryPhase === 'canceled') {
                    if (activeErrorPopupRecoveryPhase) closeErrorPopup();
                    statusBar.textContent = t('recoveryCanceledMessage');
                    statusBar.dataset.state = 'paused';
                } else if (errorProgress) {
                    showErrorPopup(message.detail);
                }
                if (headerStopBtn && headerStopBtn.classList.contains('hidden')) {
                    headerStopBtn.classList.remove('hidden');
                }
            }
        }

        if (message.action === 'ACCOUNT_USAGE_UPDATED' && message.usage) {
            cacheAccountUsage(message.usage)
                .then(() => updateMembershipUsageDisplay())
                .catch((error) => console.warn('Account usage UI refresh failed:', error));
        }
    });

    // CSV Import
    if (csvUploadBtn && csvImport) {
        csvUploadBtn.addEventListener('click', () => {
            if (!requireSignedInForFeature()) return;
            csvImport.click();
        });
    }
    if (csvImport) csvImport.addEventListener('change', handleCsvImport);
    if (csvValidationApplyBtn) {
        csvValidationApplyBtn.addEventListener('click', applyCsvValidationFixes);
    }
    if (csvValidationCancelBtn) {
        csvValidationCancelBtn.addEventListener('click', cancelCsvValidationModal);
    }
    if (csvValidationModal) {
        csvValidationModal.addEventListener('click', (event) => {
            if (event.target === csvValidationModal) {
                cancelCsvValidationModal();
            }
        });
    }

    // Settings change listeners
    [timeoutSeconds, retryCount, waitForImageResponse, perPromptAssetsEnabled, concurrentCount, detailedAnalyticsEnabled].forEach(el => {
        if (el) el.addEventListener('change', saveSettings);
    });
    if (randomizedDelayCustomEnabled) {
        randomizedDelayCustomEnabled.addEventListener('change', () => {
            syncRandomizedDelayInputs();
            saveSettings();
        });
    }
    [randomizedDelayJitterMaxSeconds, randomizedDelayBreakEveryCount, randomizedDelayBreakMinMinutes, randomizedDelayBreakMaxMinutes].forEach(el => {
        if (el) el.addEventListener('change', saveSettings);
    });
    if (autoDownload) {
        autoDownload.addEventListener('change', () => {
            if (!autoDownload.checked && flowUpscaledDownload) {
                flowUpscaledDownload.checked = false;
            }
            syncUpscaleDownloadAvailability();
            saveSettings();
        });
    }
    if (flowUpscaledDownload) {
        flowUpscaledDownload.addEventListener('change', () => {
            if (flowUpscaledDownload.checked && autoDownload) {
                autoDownload.checked = true;
            }
            syncUpscaleDownloadAvailability();
            saveSettings();
        });
    }
    promptDelaySeconds?.addEventListener('blur', () => {
        syncRandomizedDelayInputs();
        saveSettings();
    });
    if (autoMentionEnabled) {
        autoMentionEnabled.addEventListener('change', saveSettings);
    }
    if (videoMultilinePromptToggle) {
        videoMultilinePromptToggle.addEventListener('change', async () => {
            saveSettings();
            await refreshUI();
        });
    }

    if (uiLanguageSelect) {
        uiLanguageSelect.addEventListener('change', async () => {
            currentLanguage = uiLanguageSelect.value;
            applyTranslations(currentLanguage);
            await storage.updateSettings({ uiLanguage: currentLanguage });
            refreshUI();
        });
    }
    if (uiThemeSelect) {
        uiThemeSelect.addEventListener('change', async () => {
            const theme = normalizeUiTheme(uiThemeSelect.value);
            applyTheme(theme);
            await storage.updateSettings({ uiTheme: theme });
            refreshUI();
        });
    }
    if (darkModeToggleBtn) {
        darkModeToggleBtn.addEventListener('click', async () => {
            if (!hasProfessionalTierAccess()) {
                showGateStatus(t('darkModeProfessionalOnly'), true);
                return;
            }
            const current = normalizeUiTheme(lastUiSettings?.uiTheme || 'default');
            const next = current === 'dark' ? 'default' : 'dark';
            applyTheme(next);
            syncDarkModeToggleIcon(next);
            if (uiThemeSelect) uiThemeSelect.value = next;
            await storage.updateSettings({ uiTheme: next });
            if (lastUiSettings) lastUiSettings = { ...lastUiSettings, uiTheme: next };
        });
    }

    // Storage change listener
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        refreshUI();
        if (changes.flow_external_prompt_queue_request) {
            consumeExternalPromptQueueRequest().catch((error) => {
                console.warn('Failed to consume external prompt queue request:', error);
            });
        }
    });

    // Keep overlay/context state in sync while popup remains open
    chrome.tabs.onActivated.addListener(() => {
        refreshFlowContextAndApply().catch(() => { });
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.url || changeInfo.status === 'complete') {
            refreshFlowContextAndApply().catch(() => { });
        }
    });
    chrome.windows.onFocusChanged.addListener(() => {
        refreshFlowContextAndApply().catch(() => { });
    });
}

// Helper functions (moved outside init)
const startDownload = (action, payload = {}) => {
    sendCommand(action, payload);
    if (downloadPageBtn) {
        downloadPageBtn.disabled = true;
        downloadPageBtn.textContent = t('downloading');
        downloadPageBtn.style.opacity = '0.65';
    }
    if (openDownloadPickerBtn) {
        openDownloadPickerBtn.disabled = true;
        openDownloadPickerBtn.style.opacity = '0.65';
    }
    if (stopDownloadBtn) stopDownloadBtn.classList.remove('hidden');
    if (headerStopBtn) headerStopBtn.classList.remove('hidden');
};

const resetDownloadBtns = () => {
    const basicUnlocked = isImageDownloaderUnlocked();
    const canPreviewLockedTools = canPreviewPremiumLockedTools();
    const premiumUnlocked = isPremiumImageDownloaderUnlocked();
    if (downloadPageBtn) {
        downloadPageBtn.disabled = !premiumUnlocked;
        downloadPageBtn.textContent = t('downloadAllPageImages');
        downloadPageBtn.style.opacity = premiumUnlocked ? '' : '0.55';
    }
    if (openDownloadPickerBtn) {
        openDownloadPickerBtn.disabled = !canPreviewLockedTools;
        openDownloadPickerBtn.textContent = t('openImageDownloader');
        openDownloadPickerBtn.style.opacity = canPreviewLockedTools ? '' : '0.55';
    }
    syncDownloadToolsForUpscale();
    if (stopDownloadBtn) stopDownloadBtn.classList.add('hidden');
    if (headerStopBtn) headerStopBtn.classList.add('hidden');
};

function clampPromptDelaySeconds(value, fallback = 30) {
    let seconds = Number.parseInt(value, 10);
    if (!Number.isFinite(seconds)) seconds = fallback;
    seconds = Math.round(seconds / 10) * 10;
    return Math.min(300, Math.max(10, seconds));
}

function getLegacyPromptDelaySeconds(settings = {}) {
    if (Number.isFinite(Number(settings.promptDelaySeconds))) {
        return clampPromptDelaySeconds(settings.promptDelaySeconds);
    }
    const legacyMs = Number.parseInt(settings.randomPromptDelayMaxMs, 10);
    if (Number.isFinite(legacyMs)) {
        return clampPromptDelaySeconds(Math.ceil(legacyMs / 1000));
    }
    return 3;
}

// Randomized Delay customization is a Professional-only control. Lower tiers
// still see that the protection is active, while the detailed values stay
// hidden and fixed to the safe defaults enforced by the background worker.
function syncRandomizedDelayInputs() {
    const tier = getMembershipTier();
    const isStarter = tier === 'starter';
    const isProfessional = tier === 'professional';
    randomizedDelayCard?.classList.remove('hidden');
    randomizedDelayDetails?.classList.toggle('hidden', !isProfessional);
    const noteEl = document.getElementById('labelRandomizedDelayNote');
    if (noteEl) {
        noteEl.textContent = isProfessional ? t('randomizedDelayNote') : t('randomizedDelayDefaultActive');
    }
    if (randomizedDelayCustomEnabled) {
        randomizedDelayCustomEnabled.disabled = !isProfessional;
        if (!isProfessional) randomizedDelayCustomEnabled.checked = false;
    }
    const customUnlocked = isProfessional && !!randomizedDelayCustomEnabled?.checked;
    if (promptDelaySeconds) {
        if (isStarter) {
            promptDelaySeconds.min = String(STARTER_FIXED_PROMPT_DELAY_SECONDS);
            promptDelaySeconds.max = String(STARTER_FIXED_PROMPT_DELAY_SECONDS);
            promptDelaySeconds.value = String(STARTER_FIXED_PROMPT_DELAY_SECONDS);
        } else if (!customUnlocked) {
            promptDelaySeconds.min = '10';
            promptDelaySeconds.max = '300';
            promptDelaySeconds.step = '10';
            promptDelaySeconds.value = '30';
        } else {
            promptDelaySeconds.min = '10';
            promptDelaySeconds.max = '300';
            promptDelaySeconds.step = '10';
            promptDelaySeconds.value = String(clampPromptDelaySeconds(promptDelaySeconds.value));
        }
        promptDelaySeconds.disabled = isStarter || !customUnlocked;
    }
    const inputs = [randomizedDelayJitterMaxSeconds, randomizedDelayBreakEveryCount, randomizedDelayBreakMinMinutes, randomizedDelayBreakMaxMinutes];
    if (!customUnlocked) {
        if (randomizedDelayJitterMaxSeconds) randomizedDelayJitterMaxSeconds.value = '30';
        if (randomizedDelayBreakEveryCount) randomizedDelayBreakEveryCount.value = '20';
        if (randomizedDelayBreakMinMinutes) randomizedDelayBreakMinMinutes.value = '4';
        if (randomizedDelayBreakMaxMinutes) randomizedDelayBreakMaxMinutes.value = '5';
    }
    inputs.forEach((el) => { if (el) el.disabled = !customUnlocked; });
    const professionalOnlyEl = document.getElementById('labelRandomizedDelayProfessionalOnly');
    if (professionalOnlyEl) {
        professionalOnlyEl.textContent = isProfessional ? '' : t('randomizedDelayDefaultsLocked');
        professionalOnlyEl.style.display = isProfessional ? 'none' : '';
    }
}

function syncUpscaleDownloadAvailability() {
    if (!flowUpscaledDownload) return;
    applyUpscaleDownloadCopy();
    const enabled = canUseUpscaledGeneratedDownload();
    if (!enabled) {
        flowUpscaledDownload.checked = false;
    }
    flowUpscaledDownload.disabled = !enabled;
    const row = flowUpscaledDownload.closest('.config-row');
    if (row) {
        row.classList.toggle('premium-locked-row', !enabled);
        row.style.opacity = enabled ? '' : '0.72';
    }
    if (upscaleDownloadLockBadge) {
        upscaleDownloadLockBadge.classList.toggle('hidden', enabled);
    }
    syncDownloadToolsForUpscale();
}

function syncDownloadToolsForUpscale() {
    const lockedForSso = !canPreviewPremiumLockedTools();
    const premiumLocked = !isPremiumImageDownloaderUnlocked();
    const disabled = lockedForSso || premiumLocked;
    if (upscaleDownloadToolsDisabledMsg) {
        upscaleDownloadToolsDisabledMsg.style.display = 'none';
    }
    [labelDownloadTools, labelDownloadHint].forEach((el) => {
        if (!el) return;
        el.style.opacity = disabled ? '0.35' : '';
        el.style.filter = disabled ? 'grayscale(1)' : '';
    });
    if (downloadPageBtn) {
        downloadPageBtn.disabled = lockedForSso;
        downloadPageBtn.style.opacity = disabled ? '0.35' : '';
        downloadPageBtn.style.cursor = lockedForSso ? 'not-allowed' : '';
        downloadPageBtn.style.filter = disabled ? 'grayscale(1)' : '';
        downloadPageBtn.title = disabled ? (lockedForSso ? t('ssoLocked') : t('downloadToolsLocked')) : '';
    }
    if (openDownloadPickerBtn) {
        openDownloadPickerBtn.disabled = lockedForSso;
        openDownloadPickerBtn.style.opacity = lockedForSso ? '0.35' : '';
        openDownloadPickerBtn.style.cursor = lockedForSso ? 'not-allowed' : '';
        openDownloadPickerBtn.style.filter = lockedForSso ? 'grayscale(1)' : '';
        openDownloadPickerBtn.title = lockedForSso ? t('ssoLocked') : (premiumLocked ? t('downloadToolsLocked') : '');
    }
}

function getDownloadQualityOptions() {
    return {
        preferUpscaledDownload: selectedDownloadQuality === '2k',
        upscaleQuality: '2k'
    };
}

async function getActiveProjectTabForDownload() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    if (!tab || !tab.url || !tab.url.includes('/project/')) {
        showGateStatus(t('onlyProjectPage'), true);
        return null;
    }
    return tab;
}

function closeDownloadPicker() {
    downloadPickerModal?.classList.add('hidden');
}

function setDownloadPickerPremiumPreview(locked) {
    const modalContent = downloadPickerModal?.querySelector('.download-picker-modal');
    modalContent?.classList.toggle('locked-preview', !!locked);
    downloadPickerPremiumOverlay?.classList.toggle('hidden', !locked);
    if (downloadPickerPremiumTitle) downloadPickerPremiumTitle.textContent = t('downloadPickerPremiumTitle');
}

function setDownloadPickerLoading() {
    downloadPickerAssets = [];
    downloadPickerSelectedIds = new Set();
    downloadPickerModal?.classList.remove('hidden');
    setDownloadPickerPremiumPreview(false);
    if (downloadPickerCount) {
        downloadPickerCount.textContent = t('downloadPickerScanning');
    }
    if (downloadPickerDownloadBtn) {
        downloadPickerDownloadBtn.disabled = true;
    }
    if (downloadPageBtn) {
        downloadPageBtn.disabled = true;
    }
    if (downloadPickerGrid) {
        downloadPickerGrid.innerHTML = '';
        const loading = document.createElement('div');
        loading.className = 'download-picker-empty download-picker-loading';
        loading.textContent = t('downloadPickerScanning');
        downloadPickerGrid.appendChild(loading);
    }
}

function renderDownloadPicker() {
    if (!downloadPickerGrid) return;
    downloadPickerGrid.innerHTML = '';
    const premiumUnlocked = isPremiumImageDownloaderUnlocked();
    setDownloadPickerPremiumPreview(!premiumUnlocked);
    const selectedCount = downloadPickerSelectedIds.size;
    if (downloadPickerCount) {
        downloadPickerCount.textContent = tFormat('downloadPickerSelectedCount', {
            selected: selectedCount,
            total: downloadPickerAssets.length
        });
    }
    if (downloadPickerDownloadBtn) {
        downloadPickerDownloadBtn.disabled = !premiumUnlocked || selectedCount === 0;
    }
    if (downloadPageBtn) {
        downloadPageBtn.disabled = !premiumUnlocked || downloadPickerAssets.length === 0;
    }
    if (downloadPickerSelectAllBtn) {
        downloadPickerSelectAllBtn.disabled = !premiumUnlocked || downloadPickerAssets.length === 0;
    }
    if (downloadPickerClearBtn) {
        downloadPickerClearBtn.disabled = !premiumUnlocked || selectedCount === 0;
    }
    if (downloadPickerRescanBtn) {
        downloadPickerRescanBtn.disabled = !premiumUnlocked;
        downloadPickerRescanBtn.title = premiumUnlocked ? '' : t('downloadToolsLocked');
    }
    if (!downloadPickerAssets.length) {
        const empty = document.createElement('div');
        empty.className = 'download-picker-empty';
        empty.textContent = t('downloadPickerNoImages');
        downloadPickerGrid.appendChild(empty);
        return;
    }
    downloadPickerAssets.forEach((asset, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'download-picker-card';
        card.classList.toggle('selected', downloadPickerSelectedIds.has(asset.id));
        card.title = asset.prompt || asset.id || '';
        const img = document.createElement('img');
        img.src = asset.thumbnailSrc || asset.src;
        const label = document.createElement('span');
        const mediaLabel = asset.mediaType === 'video' ? 'Video' : 'Image';
        img.alt = `${mediaLabel} ${index + 1}`;
        img.addEventListener('error', () => {
            img.remove();
            const fallback = document.createElement('div');
            fallback.className = 'download-picker-thumb-fallback';
            fallback.textContent = mediaLabel;
            card.insertBefore(fallback, label);
        }, { once: true });
        label.textContent = `${mediaLabel} ${index + 1}`;
        card.appendChild(img);
        card.appendChild(label);
        card.addEventListener('click', () => {
            if (!isPremiumImageDownloaderUnlocked()) {
                showGateStatus(t('downloadToolsLocked'));
                return;
            }
            if (downloadPickerSelectedIds.has(asset.id)) {
                downloadPickerSelectedIds.delete(asset.id);
            } else {
                downloadPickerSelectedIds.add(asset.id);
            }
            renderDownloadPicker();
        });
        downloadPickerGrid.appendChild(card);
    });
}

async function openDownloadPicker({ forceRescan = false } = {}) {
    if (!canPreviewPremiumLockedTools()) {
        showGateStatus(t('ssoLocked'), true);
        return;
    }
    downloadPickerSelectedIds.clear();
    downloadPickerModal?.classList.remove('hidden');
    renderDownloadPicker();
    showGateStatus(t('refreshingConnectionMsg'));
    if (!(await refreshGateIfPremiumLocked(isPremiumImageDownloaderUnlocked))) {
        renderDownloadPicker();
        showGateStatus(t('downloadToolsLocked'));
        return;
    }
    const tab = await getActiveProjectTabForDownload();
    if (!tab) return;
    const cacheKey = `${tab.id}:${tab.url || ''}`;
    if (!forceRescan && (!downloadPickerAssets.length || downloadPickerCacheKey !== cacheKey)) {
        await hydrateDownloadPickerCacheFromSession();
    }
    if (!forceRescan && downloadPickerCacheKey === cacheKey && downloadPickerAssets.length) {
        downloadPickerSelectedIds.clear();
        downloadPickerModal?.classList.remove('hidden');
        renderDownloadPicker();
        return;
    }
    setDownloadPickerLoading();
    showGateStatus(t('downloadPickerScanning'));
    const result = await sendCommand('COLLECT_PAGE_IMAGES', { tabId: tab.id });
    if (!result?.ok) {
        showGateStatus(result?.error || t('downloadPickerScanFailed'), true);
        closeDownloadPicker();
        return;
    }
    downloadPickerAssets = (Array.isArray(result.assets) ? result.assets : [])
        .filter(asset => asset && asset.src);
    downloadPickerCacheKey = cacheKey;
    downloadPickerSelectedIds.clear();
    renderDownloadPicker();
    await persistDownloadPickerCacheToSession();
}

async function startPageImageDownload({ selectedIds = null } = {}) {
    if (!canPreviewPremiumLockedTools()) {
        showGateStatus(t('ssoLocked'), true);
        return;
    }
    if (!(await refreshGateIfPremiumLocked(isPremiumImageDownloaderUnlocked))) {
        showGateStatus(t('downloadToolsLocked'));
        downloadPickerModal?.classList.remove('hidden');
        renderDownloadPicker();
        return;
    }
    const tab = await getActiveProjectTabForDownload();
    if (!tab) return;
    const options = getDownloadQualityOptions();
    const payload = {
        tabId: tab.id,
        ...options
    };
    if (Array.isArray(selectedIds) && selectedIds.length) {
        payload.selectedIds = selectedIds;
    }
    startDownload('DOWNLOAD_PAGE', payload);
    closeDownloadPicker();
}

const triggerStop = () => {
    sendCommand('STOP_HISTORY_DOWNLOAD');
    sendCommand('STOP');
    resetDownloadBtns();
    if (statusBar) {
        statusBar.textContent = t('stopping');
        setTimeout(() => {
            if (statusBar.textContent === t('stopping')) {
                statusBar.textContent = t('stopped');
                setTimeout(() => {
                    if (statusBar.textContent === t('stopped')) {
                        statusBar.textContent = t('ready');
                    }
                }, 2000);
            }
        }, 1000);
    }
};

/**
 * Save all settings items
 */
async function saveSettings() {
    const unlocked = isImageDownloaderUnlocked();
    const upscaleUnlocked = canUseUpscaledGeneratedDownload();
    const perPromptUnlocked = canUsePerPromptAssets();
    const wantsUpscaledDownload = unlocked && upscaleUnlocked && !!flowUpscaledDownload?.checked;
    const shouldAutoDownload = unlocked ? (!!autoDownload?.checked || wantsUpscaledDownload) : false;
    const promptDelayValue = clampPromptDelaySeconds(promptDelaySeconds?.value);
    const shouldUsePerPromptAssets = !!perPromptAssetsEnabled?.checked;
    const shouldWaitForImage = waitForImageResponse
        ? (!!waitForImageResponse.checked || (shouldAutoDownload && !!flowUpscaledDownload?.checked))
        : true;
    if ((!shouldAutoDownload || !upscaleUnlocked) && flowUpscaledDownload) {
        flowUpscaledDownload.checked = false;
    }
    if (shouldAutoDownload && wantsUpscaledDownload && autoDownload) {
        autoDownload.checked = true;
    }
    const updatedSettings = {
        flowType: document.querySelector('[data-flow-type].active')?.dataset.flowType || 'image',
        syncFlowSettings: true,
        delaySeconds: 0,
        promptDelaySeconds: promptDelayValue,
        timeoutSeconds: parseInt(timeoutSeconds?.value || 5),
        retryCount: parseInt(retryCount?.value || 2),
        autoDownload: shouldAutoDownload,
        flowUpscaledDownload: shouldAutoDownload ? wantsUpscaledDownload : false,
        flowUpscaleQuality: getUpscaleDownloadQuality(),
        waitForImageResponse: shouldWaitForImage,
        concurrentCount: 1,
        perPromptAssetsEnabled: shouldUsePerPromptAssets,
        autoMentionEnabled: !!autoMentionEnabled?.checked,
        videoMultilinePrompt: !!videoMultilinePromptToggle?.checked,
        uiLanguage: uiLanguageSelect?.value || currentLanguage || 'en',
        // Randomized Delay: the toggle only ever reads true for Professional
        // (syncRandomizedDelayInputs forces it off/disabled for every other
        // tier), so the values below are inert unless that toggle is on.
        randomizedDelayCustomEnabled: !!randomizedDelayCustomEnabled?.checked,
        randomizedDelayJitterMaxSeconds: parseInt(randomizedDelayJitterMaxSeconds?.value, 10) || 30,
        randomizedDelayBreakEveryCount: parseInt(randomizedDelayBreakEveryCount?.value, 10) || 20,
        randomizedDelayBreakMinMinutes: parseFloat(randomizedDelayBreakMinMinutes?.value) || 4,
        randomizedDelayBreakMaxMinutes: parseFloat(randomizedDelayBreakMaxMinutes?.value) || 5,
        detailedAnalyticsEnabled: detailedAnalyticsEnabled?.checked === true
        // uiTheme deliberately NOT included here — it's saved directly by the
        // theme dropdown's own change handler and the dark-mode toggle button.
        // Re-saving it from uiThemeSelect.value on every unrelated toggle here
        // was overwriting a correctly-set 'dark' theme with a stale value.
    };
    if (waitForImageResponse) waitForImageResponse.checked = shouldWaitForImage;
    syncRandomizedDelayInputs();
    syncUpscaleDownloadAvailability();
    await storage.updateSettings(updatedSettings);
    lastUiSettings = { ...(lastUiSettings || {}), ...updatedSettings };
    syncPerPromptAssetsUi(lastUiSettings);
}

/**
 * Refresh UI from storage
 */
async function refreshUI() {
    await loadFirebaseAuthState();
    const [queue, state, settings, logs] = await Promise.all([
        storage.getQueue(),
        storage.getState(),
        storage.getSettings(),
        storage.getLogs()
    ]);
    const migratedSettings = await migrateLegacyReferenceAssetIfNeeded(settings);
    updateUI(queue, state, migratedSettings, logs);
}

function scrollQueueToBottom({ smooth = true } = {}) {
    const queueViewport = document.querySelector('.queue-viewport');
    const lastQueueItem = queueList?.lastElementChild;
    const behavior = smooth ? 'smooth' : 'auto';

    requestAnimationFrame(() => {
        try {
            queueViewport?.scrollTo({
                top: queueViewport.scrollHeight,
                behavior
            });
        } catch {
            if (queueViewport) queueViewport.scrollTop = queueViewport.scrollHeight;
        }
        try {
            lastQueueItem?.scrollIntoView({ behavior, block: 'nearest' });
        } catch { }
    });
}

async function consumeExternalPromptQueueRequest() {
    const data = await chrome.storage.local.get('flow_external_prompt_queue_request');
    const request = data.flow_external_prompt_queue_request;
    if (!request || !Array.isArray(request.prompts) || request.prompts.length === 0) return;

    navTabs.forEach(tab => tab.classList.remove('active'));
    document.querySelector('[data-nav="control"]')?.classList.add('active');
    controlPanel.classList.remove('hidden');
    settingsPanel.classList.add('hidden');

    promptInput.value = request.prompts.join('\n\n');
    updatePromptPreview();

    await chrome.storage.local.remove('flow_external_prompt_queue_request');

    const queueCard = document.querySelector('.queue-card');
    if (queueCard) {
        queueCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showGateStatus(tFormat('importedFromReceiver', { count: request.prompts.length }));
}

function syncPerPromptAssetsUi(settings = lastUiSettings || {}) {
    const unlocked = canUsePerPromptAssets();
    const enabled = !!settings.perPromptAssetsEnabled;
    const hint = document.getElementById('promptAssetsHint');
    const unlockBadge = document.getElementById('labelPerPromptAssetsUnlockRequired');
    if (hint) {
        hint.style.display = enabled ? '' : 'none';
    }
    if (unlockBadge) {
        // Hide badge entirely when unlocked — no need to show "Premium Unlocked"
        unlockBadge.classList.toggle('hidden', unlocked);
        if (!unlocked) unlockBadge.textContent = t('perPromptAssetsUnlockRequired');
    }
    if (perPromptAssetsEnabled) {
        perPromptAssetsEnabled.disabled = !unlocked;
        perPromptAssetsEnabled.checked = unlocked && enabled;
        perPromptAssetsEnabled.title = unlocked ? '' : t('perPromptAssetsLocked');
    }
    const row = perPromptAssetsEnabled?.closest('.per-prompt-assets-toggle-row');
    if (row) {
        // Hide the entire row for starters instead of showing a lock overlay
        row.classList.toggle('hidden', !unlocked);
        row.classList.remove('locked');
    }
    if (perPromptAssetsLockOverlay) {
        perPromptAssetsLockOverlay.classList.add('hidden');
    }
    syncStartButtonMode();
}

function syncStartButtonMode() {
    if (!startBtn) return;
    const isRunning = lastUiState === AUTOMATOR_STATE.RUNNING;
    if (isRunning) {
        startBtn.textContent = `■ ${t('stop')}`;
        return;
    }

    const settings = lastUiSettings || {};
    if (settings.flowType === 'video') {
        startBtn.textContent = promptInput?.value.trim() ? `➕ ${t('addToQueue')}` : `▶ ${t('run')}`;
        return;
    }
    const hasPromptText = !!promptInput?.value.trim();
    const shouldQueueFirst = hasPromptText
        && (
            settings.flowType === 'video'
            || (
                settings.flowType !== 'video'
                && canUsePerPromptAssets()
                && !!settings.perPromptAssetsEnabled
            )
        );
    startBtn.textContent = shouldQueueFirst ? `➕ ${t('queueAction')}` : `▶ ${t('run')}`;
}

function createStoryboardImageTile(asset, label) {
    const tile = document.createElement('div');
    tile.className = 'storyboard-image-tile';
    if (asset?.src) {
        const img = document.createElement('img');
        img.src = asset.src;
        img.alt = label || asset.label || asset.id || t('storyboardImage');
        tile.appendChild(img);
    }

    const caption = document.createElement('div');
    caption.className = 'storyboard-image-caption';
    caption.textContent = label || asset?.label || asset?.id || t('storyboardImage');
    tile.appendChild(caption);
    return tile;
}

function createStoryboardEmptyText() {
    const empty = document.createElement('div');
    empty.className = 'storyboard-empty-text';
    empty.textContent = t('storyboardNoImage');
    return empty;
}

function getStoryboardSceneAssets(item = {}, settings = {}) {
    const characterPool = getQueueAssetPoolFromSettings(settings, 'character');
    const referencePool = getQueueAssetPoolFromSettings(settings, 'image');
    const usePerPromptAssets = !!settings.perPromptAssetsEnabled
        || Array.isArray(item.characterAssetSelections)
        || Array.isArray(item.referenceAssetSelections)
        || !!item.characterAssetSelection;
    return {
        characters: usePerPromptAssets ? getQueueItemCharacterSelections(item, characterPool) : characterPool,
        references: usePerPromptAssets && Array.isArray(item.referenceAssetSelections)
            ? getPerPromptReferenceSelections(item, referencePool)
            : referencePool
    };
}

function renderStoryboardAssetSection(card, title, assets, type) {
    const section = document.createElement('div');
    section.className = 'storyboard-images-section';

    const label = document.createElement('div');
    label.className = 'storyboard-section-label';
    label.textContent = `${title} (${assets.length})`;
    section.appendChild(label);

    if (!assets.length) {
        section.appendChild(createStoryboardEmptyText());
        card.appendChild(section);
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'storyboard-image-grid';
    assets.forEach((asset, index) => {
        const itemLabel = type === 'character'
            ? getCharacterDisplayName(asset, index)
            : tFormat('storyboardReferenceN', { count: index + 1 });
        grid.appendChild(createStoryboardImageTile(asset, itemLabel));
    });
    section.appendChild(grid);
    card.appendChild(section);
}

function renderStoryboardOverview(queue = [], settings = {}) {
    if (!storyboardOverviewList) return;
    storyboardOverviewList.innerHTML = '';
    storyboardOverviewModal?.querySelector('.storyboard-overview-modal')?.classList.remove('locked-preview');
    storyboardOverviewModal?.querySelector('.storyboard-lock-preview-overlay')?.remove();

    const scenes = (Array.isArray(queue) ? queue : []).filter((item) => item.status !== QUEUE_STATUS.COMPLETED);
    if (!scenes.length) {
        const empty = document.createElement('div');
        empty.className = 'storyboard-empty-state';
        empty.textContent = t('storyboardNoScenes');
        storyboardOverviewList.appendChild(empty);
        return;
    }

    scenes.forEach((item, index) => {
        const card = document.createElement('article');
        card.className = 'storyboard-card';

        const header = document.createElement('div');
        header.className = 'storyboard-card-header';

        const titleWrap = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'storyboard-scene-title';
        title.textContent = tFormat('storyboardScene', { count: index + 1 });

        const settingsLine = document.createElement('div');
        settingsLine.className = 'storyboard-settings-line';
        settingsLine.textContent = [
            settings.flowModel,
            settings.flowAspectRatio,
            settings.flowQuantity ? `${settings.flowQuantity}x` : ''
        ].filter(Boolean).join(' • ') || t('image');

        titleWrap.appendChild(title);
        titleWrap.appendChild(settingsLine);

        const status = document.createElement('span');
        status.className = `storyboard-status ${item.status || QUEUE_STATUS.PENDING}`;
        status.textContent = item.status === QUEUE_STATUS.FAILED ? t('failedStatus') : t('pendingStatus');

        header.appendChild(titleWrap);
        header.appendChild(status);
        card.appendChild(header);

        const promptBlock = document.createElement('div');
        promptBlock.className = 'storyboard-prompt';
        const promptLabel = document.createElement('div');
        promptLabel.className = 'storyboard-section-label';
        promptLabel.textContent = t('storyboardPrompt');
        const promptText = document.createElement('p');
        promptText.textContent = (item.prompt || t('noPromptSpecified')).replace(/^\[Model: [^\]]+\]\s*/, '');
        promptBlock.appendChild(promptLabel);
        promptBlock.appendChild(promptText);
        card.appendChild(promptBlock);

        const { characters, references } = getStoryboardSceneAssets(item, settings);
        renderStoryboardAssetSection(card, t('storyboardCharacters'), characters, 'character');
        renderStoryboardAssetSection(card, t('storyboardReferences'), references, 'image');

        storyboardOverviewList.appendChild(card);
    });
}

function renderLockedStoryboardPreview() {
    if (!storyboardOverviewList) return;
    storyboardOverviewList.innerHTML = '';
    const modalContent = storyboardOverviewModal?.querySelector('.storyboard-overview-modal');
    modalContent?.classList.add('locked-preview');
    modalContent?.querySelector('.storyboard-lock-preview-overlay')?.remove();

    for (let index = 0; index < 3; index += 1) {
        const card = document.createElement('article');
        card.className = 'storyboard-card';

        const header = document.createElement('div');
        header.className = 'storyboard-card-header';

        const titleWrap = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'storyboard-scene-title';
        title.textContent = tFormat('storyboardScene', { count: index + 1 });
        const settingsLine = document.createElement('div');
        settingsLine.className = 'storyboard-settings-line';
        settingsLine.textContent = t('storyboard');
        titleWrap.appendChild(title);
        titleWrap.appendChild(settingsLine);

        const status = document.createElement('span');
        status.className = 'storyboard-status';
        status.textContent = t('pendingStatus');

        header.appendChild(titleWrap);
        header.appendChild(status);
        card.appendChild(header);

        const promptBlock = document.createElement('div');
        promptBlock.className = 'storyboard-prompt';
        const promptLabel = document.createElement('div');
        promptLabel.className = 'storyboard-section-label';
        promptLabel.textContent = t('storyboardPrompt');
        const promptText = document.createElement('p');
        promptText.textContent = 'Storyboard preview';
        promptBlock.appendChild(promptLabel);
        promptBlock.appendChild(promptText);
        card.appendChild(promptBlock);

        const imageSection = document.createElement('div');
        imageSection.className = 'storyboard-images-section';
        const label = document.createElement('div');
        label.className = 'storyboard-section-label';
        label.textContent = t('storyboardReferences');
        const empty = createStoryboardEmptyText();
        imageSection.appendChild(label);
        imageSection.appendChild(empty);
        card.appendChild(imageSection);

        storyboardOverviewList.appendChild(card);
    }

    const overlay = document.createElement('div');
    overlay.className = 'storyboard-lock-preview-overlay';
    const lockCard = document.createElement('div');
    lockCard.className = 'premium-feature-lock-card';
    const icon = document.createElement('span');
    icon.className = 'premium-feature-lock-icon';
    icon.textContent = '🔒';
    const text = document.createElement('span');
    text.textContent = t('premiumFeatureLocked');
    lockCard.appendChild(icon);
    lockCard.appendChild(text);
    overlay.appendChild(lockCard);
    modalContent?.appendChild(overlay);
}

async function openStoryboardOverview() {
    if (!requireSignedInForFeature()) return;
    if (!(await refreshGateIfPremiumLocked(canUsePremiumOnlyTools))) {
        renderLockedStoryboardPreview();
        storyboardOverviewModal?.classList.remove('hidden');
        showGateStatus(t('premiumFeatureLocked'));
        return;
    }

    const url = chrome.runtime.getURL('storyboard/storyboard.html');
    const openWindows = await chrome.windows.getAll({ populate: true });
    const existingTab = openWindows
        .flatMap((win) => (win.tabs || []).map((tab) => ({ win, tab })))
        .find(({ tab }) => tab.url === url);
    if (existingTab?.tab?.id && existingTab?.win?.id) {
        await chrome.tabs.update(existingTab.tab.id, { active: true });
        await chrome.windows.update(existingTab.win.id, { focused: true });
        return;
    }

    const width = Math.min(Math.max(1180, Math.floor((screen?.availWidth || 1280) * 0.86)), (screen?.availWidth || 1280) - 40);
    const height = Math.min(Math.max(860, Math.floor((screen?.availHeight || 900) * 0.86)), (screen?.availHeight || 900) - 40);
    const left = Math.max(0, Math.floor(((screen?.availWidth || width) - width) / 2));
    const top = Math.max(0, Math.floor(((screen?.availHeight || height) - height) / 2));

    if (chrome.windows?.create) {
        await chrome.windows.create({
            url,
            type: 'popup',
            width,
            height,
            left,
            top,
            focused: true
        });
        return;
    }
    window.open(url, '_blank', `width=${width},height=${height},left=${left},top=${top}`);
}

function closeStoryboardOverview() {
    storyboardOverviewModal?.querySelector('.storyboard-overview-modal')?.classList.remove('locked-preview');
    storyboardOverviewModal?.querySelector('.storyboard-lock-preview-overlay')?.remove();
    storyboardOverviewModal?.classList.add('hidden');
}

function createQueueAssetPickerCard(asset, selected = false, type = 'image') {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `queue-asset-picker-card ${selected ? 'selected' : ''} ${type === 'character' ? 'character' : ''}`;

    const thumb = document.createElement('div');
    thumb.className = 'queue-asset-picker-card-thumb';
    if (asset?.src) {
        const img = document.createElement('img');
        img.src = asset.src;
        img.alt = type === 'character' ? getCharacterDisplayName(asset, 0) : (asset.label || asset.id || '');
        thumb.appendChild(img);
    } else {
        thumb.textContent = type === 'character' ? 'C' : 'I';
    }

    const label = document.createElement('div');
    label.className = 'queue-asset-picker-card-label';
    label.textContent = type === 'character' ? getCharacterDisplayName(asset, 0) : (asset?.label || asset?.id || '');

    const marker = document.createElement('div');
    marker.className = 'queue-asset-picker-card-marker';
    marker.textContent = selected ? 'Selected' : 'Select';

    card.appendChild(thumb);
    card.appendChild(label);
    card.appendChild(marker);
    return card;
}

async function toggleQueueItemCharacterAsset(itemId, asset) {
    if (!canUsePerPromptAssets()) {
        showPremiumAssetLimitMessage('character');
        return;
    }
    const normalized = cloneReferenceSelection(asset);
    if (!normalized) return;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const allowedPool = getQueueAssetPoolFromSettings(settings, 'character');
    const current = getQueueItemCharacterSelections(queue[idx], allowedPool);
    const nextKey = getReferenceAssetKey(normalized);
    const exists = current.some((selection) => getReferenceAssetKey(selection) === nextKey);
    const next = exists
        ? current.filter((selection) => getReferenceAssetKey(selection) !== nextKey)
        : [...current, normalized];

    let newPrompt = queue[idx].prompt || '';
    if (!exists) {
        newPrompt = autoAppendAssetMentionToPrompt(newPrompt, asset);
    }

    queue[idx] = {
        ...queue[idx],
        prompt: newPrompt,
        characterAssetSelections: next,
        characterAssetSelection: next[0] || null,
        perPromptAssetsEdited: true,
        perPromptCharacterAssetsEdited: true
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function toggleQueueItemReferenceAsset(itemId, asset) {
    if (!canUsePerPromptAssets()) {
        showPremiumAssetLimitMessage('image');
        return;
    }
    const normalized = cloneReferenceSelection(asset);
    if (!normalized) return;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const key = getReferenceAssetKey(normalized);
    const allowedPool = getQueueAssetPoolFromSettings(settings, 'image');
    const current = getPerPromptReferenceSelections(queue[idx], allowedPool);
    const exists = current.some((selection) => getReferenceAssetKey(selection) === key);
    const nextSelections = exists
        ? current.filter((selection) => getReferenceAssetKey(selection) !== key)
        : [...current, normalized];

    let newPrompt = queue[idx].prompt || '';
    if (!exists) {
        newPrompt = autoAppendAssetMentionToPrompt(newPrompt, asset);
    }

    queue[idx] = {
        ...queue[idx],
        prompt: newPrompt,
        referenceAssetSelections: nextSelections,
        perPromptAssetsEdited: true,
        perPromptReferenceAssetsEdited: true
    };
    await storage.setQueue(queue);
    await refreshUI();
}

const MAX_VIDEO_INGREDIENT_IMAGES = 3;

async function toggleQueueItemVideoIngredientAsset(itemId, asset) {
    const normalized = cloneReferenceSelection(asset);
    if (!normalized) return;
    const queue = await storage.getQueue();
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const key = getReferenceAssetKey(normalized);
    const current = cloneReferenceSelections(queue[idx].videoIngredientSelections || []);
    const exists = current.some((selection) => getReferenceAssetKey(selection) === key);

    if (!exists && current.length >= MAX_VIDEO_INGREDIENT_IMAGES) {
        showGateStatus(t('videoIngredientsMaxReached'), true);
        return;
    }

    let newPrompt = queue[idx].prompt || '';
    if (!exists) {
        newPrompt = autoAppendAssetMentionToPrompt(newPrompt, asset);
    }

    queue[idx] = {
        ...queue[idx],
        prompt: newPrompt,
        videoMode: FLOW_VIDEO_MODES.INGREDIENTS,
        videoIngredientSelections: exists
            ? current.filter((selection) => getReferenceAssetKey(selection) !== key)
            : [...current, normalized]
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function setQueueItemVideoFrameAsset(itemId, asset, frameKey) {
    const normalized = cloneReferenceSelection(asset);
    if (!normalized) return;
    const settings = await storage.getSettings();
    const queue = await storage.getQueue();
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const sanitized = sanitizeVideoSettings({
        videoModel: queue[idx].videoModel || settings.videoModel,
        videoMode: queue[idx].videoMode || settings.videoMode,
        videoDurationSeconds: queue[idx].videoDurationSeconds || settings.videoDurationSeconds,
        videoEndFrameSelection: frameKey === 'end' ? normalized : queue[idx].videoEndFrameSelection,
        videoVoiceReference: queue[idx].videoVoiceReference,
        prompt: queue[idx].prompt || ''
    });
    if (frameKey === 'end' && !sanitized.allowEndFrame) {
        showGateStatus(t('videoOmniEndFrameWarning'), true);
        return;
    }
    const field = frameKey === 'end' ? 'videoEndFrameSelection' : 'videoStartFrameSelection';
    const currentKey = getReferenceAssetKey(queue[idx][field] || {});
    const nextKey = getReferenceAssetKey(normalized);

    let newPrompt = queue[idx].prompt || '';
    if (currentKey !== nextKey) {
        newPrompt = autoAppendAssetMentionToPrompt(newPrompt, asset);
    }

    queue[idx] = {
        ...queue[idx],
        prompt: newPrompt,
        videoMode: FLOW_VIDEO_MODES.FRAMES,
        [field]: currentKey === nextKey ? null : normalized
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function clearQueueItemVideoFrameAsset(itemId, frameKey) {
    const queue = await storage.getQueue();
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const field = frameKey === 'end' ? 'videoEndFrameSelection' : 'videoStartFrameSelection';
    queue[idx] = {
        ...queue[idx],
        [field]: null
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function updateQueueItemVideoMode(itemId, nextMode) {
    const mode = nextMode === FLOW_VIDEO_MODES.FRAMES ? FLOW_VIDEO_MODES.FRAMES : FLOW_VIDEO_MODES.INGREDIENTS;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const item = queue[idx];
    const sanitized = sanitizeVideoSettings({
        videoModel: item.videoModel || settings.videoModel,
        videoMode: mode,
        videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
        videoEndFrameSelection: mode === FLOW_VIDEO_MODES.FRAMES ? item.videoEndFrameSelection : null,
        videoVoiceReference: item.videoVoiceReference,
        prompt: item.prompt || ''
    });
    queue[idx] = {
        ...item,
        videoMode: sanitized.videoMode,
        videoModel: sanitized.videoModel,
        videoDurationSeconds: sanitized.videoDurationSeconds,
        videoVoiceReference: sanitized.videoVoiceReference,
        videoIngredientSelections: sanitized.videoMode === FLOW_VIDEO_MODES.INGREDIENTS ? (item.videoIngredientSelections || []) : [],
        videoStartFrameSelection: sanitized.videoMode === FLOW_VIDEO_MODES.FRAMES ? (item.videoStartFrameSelection || null) : null,
        videoEndFrameSelection: sanitized.videoMode === FLOW_VIDEO_MODES.FRAMES ? sanitized.videoEndFrameSelection : null
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function updateQueueItemVideoDuration(itemId, seconds) {
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const sanitized = sanitizeVideoSettings({
        videoModel: queue[idx].videoModel || settings.videoModel,
        videoMode: queue[idx].videoMode || settings.videoMode,
        videoDurationSeconds: Number(seconds),
        videoEndFrameSelection: queue[idx].videoEndFrameSelection,
        videoVoiceReference: queue[idx].videoVoiceReference,
        prompt: queue[idx].prompt || ''
    });
    queue[idx] = {
        ...queue[idx],
        videoDurationSeconds: sanitized.videoDurationSeconds
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function updateQueueItemVideoModel(itemId, modelValue) {
    const model = Object.values(FLOW_VIDEO_MODELS).includes(modelValue)
        ? modelValue
        : FLOW_VIDEO_MODELS.VEO_3_1_FAST;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const sanitized = sanitizeVideoSettings({
        videoModel: model,
        videoMode: queue[idx].videoMode || settings.videoMode,
        videoDurationSeconds: queue[idx].videoDurationSeconds || settings.videoDurationSeconds,
        videoEndFrameSelection: queue[idx].videoEndFrameSelection,
        videoVoiceReference: queue[idx].videoVoiceReference,
        prompt: queue[idx].prompt || ''
    });
    queue[idx] = {
        ...queue[idx],
        videoModel: sanitized.videoModel,
        videoDurationSeconds: sanitized.videoDurationSeconds,
        videoEndFrameSelection: sanitized.videoEndFrameSelection,
        videoVoiceReference: sanitized.videoVoiceReference
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function updateQueueItemVideoVoiceReference(itemId, value) {
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const sanitized = sanitizeVideoSettings({
        videoModel: queue[idx].videoModel || settings.videoModel,
        videoMode: queue[idx].videoMode || settings.videoMode,
        videoDurationSeconds: queue[idx].videoDurationSeconds || settings.videoDurationSeconds,
        videoEndFrameSelection: queue[idx].videoEndFrameSelection,
        videoVoiceReference: value,
        prompt: queue[idx].prompt || ''
    });
    queue[idx] = {
        ...queue[idx],
        videoVoiceReference: sanitized.voiceAllowed ? normalizeVoiceReference(value) : value
    };
    await storage.setQueue(queue);
    await refreshUI();
}

async function renderQueueAssetCustomPicker() {
    if (!queueAssetEditTarget?.itemId || !queueAssetPickerGrid) return;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const item = queue.find((entry) => entry.id === queueAssetEditTarget.itemId);
    if (!item) {
        closeQueueAssetCustomPicker();
        return;
    }

    const mode = queueAssetEditTarget.mode || 'image';
    const allowedPool = getQueueAssetPoolFromSettings(settings, mode);
    const isIngredientMode = mode === 'videoIngredient';

    // For ingredient mode: initialise the draft from current item data on first render,
    // then let subsequent renders use the draft as the source of truth.
    if (isIngredientMode) {
        if (!ingredientPickerDraft) {
            const current = filterSelectionsToPool(item.videoIngredientSelections || [], allowedPool);
            ingredientPickerDraft = { itemId: item.id, keys: new Set(current.map(getReferenceAssetKey).filter(Boolean)), assets: [...current] };
        }
    } else {
        ingredientPickerDraft = null;
    }

    const selected = isIngredientMode
        ? (ingredientPickerDraft?.assets || [])
        : mode === 'character'
            ? getQueueItemCharacterSelections(item, allowedPool)
            : mode === 'videoStartFrame'
                ? filterSelectionsToPool(item.videoStartFrameSelection ? [item.videoStartFrameSelection] : [], allowedPool)
                : mode === 'videoEndFrame'
                    ? filterSelectionsToPool(item.videoEndFrameSelection ? [item.videoEndFrameSelection] : [], allowedPool)
                    : getPerPromptReferenceSelections(item, allowedPool);
    const selectedKeys = isIngredientMode
        ? ingredientPickerDraft.keys
        : new Set(selected.map(getReferenceAssetKey).filter(Boolean));

    if (queueAssetPickerTitle) {
        queueAssetPickerTitle.textContent = mode === 'character'
            ? t('queueAssetPickerCharacterTitle')
            : isIngredientMode
                ? t('queueVideoIngredientsTitle')
                : mode === 'videoStartFrame'
                    ? t('queueVideoStartFrameTitle')
                    : mode === 'videoEndFrame'
                        ? t('queueVideoEndFrameTitle')
                        : t('queueAssetPickerImagesTitle');
    }
    if (queueAssetPickerSubtitle) {
        queueAssetPickerSubtitle.textContent = isIngredientMode
            ? tFormat('queueVideoIngredientPickerSubtitle', { selected: selectedKeys.size, max: MAX_VIDEO_INGREDIENT_IMAGES })
            : t('queueAssetPickerSubtitle');
    }
    if (queueAssetPickerCloseBtn) queueAssetPickerCloseBtn.textContent = t('queueAssetPickerDone');

    queueAssetPickerGrid.innerHTML = '';
    allowedPool.forEach((asset) => {
        const key = getReferenceAssetKey(asset);
        const isSelected = selectedKeys.has(key);
        const card = createQueueAssetPickerCard(asset, isSelected, mode);
        card.addEventListener('click', async () => {
            if (isIngredientMode) {
                // Multi-select: toggle in draft, save on Done.
                if (isSelected) {
                    ingredientPickerDraft.keys.delete(key);
                    ingredientPickerDraft.assets = ingredientPickerDraft.assets.filter(
                        (a) => getReferenceAssetKey(a) !== key
                    );
                } else if (ingredientPickerDraft.keys.size < MAX_VIDEO_INGREDIENT_IMAGES) {
                    ingredientPickerDraft.keys.add(key);
                    ingredientPickerDraft.assets = [...ingredientPickerDraft.assets, cloneReferenceSelection(asset)];
                } else {
                    showGateStatus(tFormat('queueVideoIngredientPickerMax', { max: MAX_VIDEO_INGREDIENT_IMAGES }), true);
                    return;
                }
                await renderQueueAssetCustomPicker();
                return;
            }
            if (mode === 'character') {
                await toggleQueueItemCharacterAsset(item.id, asset);
            } else if (mode === 'videoStartFrame') {
                await setQueueItemVideoFrameAsset(item.id, asset, 'start');
            } else if (mode === 'videoEndFrame') {
                await setQueueItemVideoFrameAsset(item.id, asset, 'end');
            } else {
                await toggleQueueItemReferenceAsset(item.id, asset);
            }
            await renderQueueAssetCustomPicker();
        });
        queueAssetPickerGrid.appendChild(card);
    });
}

async function flushIngredientPickerDraft() {
    if (!ingredientPickerDraft?.itemId) return;
    const { itemId, assets } = ingredientPickerDraft;
    ingredientPickerDraft = null;
    const queue = await storage.getQueue();
    const idx = queue.findIndex((entry) => entry.id === itemId);
    if (idx === -1) return;
    const settings = await storage.getSettings();
    const allowedPool = getQueueAssetPoolFromSettings(settings, 'videoIngredient');
    const filtered = filterSelectionsToPool(assets, allowedPool);
    queue[idx] = {
        ...queue[idx],
        videoMode: FLOW_VIDEO_MODES.INGREDIENTS,
        videoIngredientSelections: filtered
    };
    await storage.setQueue(queue);
    await refreshUI();
}

function closeQueueAssetCustomPicker() {
    // Flush any pending ingredient draft before closing so the selection is saved.
    if (ingredientPickerDraft) {
        flushIngredientPickerDraft().catch(() => {});
    }
    queueAssetEditTarget = null;
    ingredientPickerDraft = null;
    queueAssetPickerModal?.classList.add('hidden');
}

/**
 * Update UI state based on data
 */
// Maps known failure substrings to a short code + generic one-line summary,
// so the log shown to the user stays minimal (no raw stack traces / internal
// selector details) while still being immediately identifiable when a user
// pastes just the code back to us. Add new patterns here as new failure
// modes are diagnosed — this list IS the code→meaning reference.
const LOG_ERROR_CODE_PATTERNS = [
    [/video model option was not found/i, 'E-VIDMODEL', 'Video model could not be applied'],
    [/video settings panel did not open/i, 'E-VIDPANEL', 'Video settings panel did not open'],
    [/video tab was not found/i, 'E-VIDPANEL', 'Video settings panel did not open'],
    [/frames to video requires a start frame/i, 'E-VIDFRAME', 'Video start frame is missing'],
    [/video start frame selection failed/i, 'E-VIDFRAME', 'Video start frame could not be selected'],
    [/not found in the video media panel/i, 'E-ASSET', 'Selected asset could not be found on the page'],
    [/video ingredient selection failed/i, 'E-ASSET', 'Selected asset could not be found on the page'],
    [/character selection failed/i, 'E-ASSET', 'Selected asset could not be found on the page'],
    [/reference images? could not be (found|prepared)/i, 'E-ASSET', 'Selected asset could not be found on the page'],
    [/handshake timeout/i, 'E-CONN', 'Lost connection to the Flow tab'],
    [/tab is unresponsive/i, 'E-CONN', 'Lost connection to the Flow tab'],
    [/no flow tab found/i, 'E-CONN', 'No Google Flow tab found'],
    [/flow panel (is|was) narrower/i, 'E-NARROW', 'Flow window is too narrow for this feature'],
    [/starter daily quota reached/i, 'E-QUOTA', 'Daily quota reached'],
    [/premium feature|unlock required/i, 'E-LOCKED', 'Feature requires a higher membership tier'],
    [/stopped manually/i, 'E-STOPPED', 'Run was stopped manually']
];

function classifyLogMessage(message = '') {
    const text = String(message || '');
    for (const [pattern, code, summary] of LOG_ERROR_CODE_PATTERNS) {
        if (pattern.test(text)) return `[${code}] ${summary}`;
    }
    return text;
}

function renderLogViewer(logs) {
    const list = document.getElementById('logViewerList');
    if (!list) return;
    const entries = Array.isArray(logs) ? logs.slice(-30) : [];
    if (!entries.length) {
        list.innerHTML = `<div class="log-viewer-empty">${t('logViewerEmpty') || 'No logs yet.'}</div>`;
        return;
    }
    list.innerHTML = entries.slice().reverse().map((log) => {
        const time = new Date(log.timestamp || Date.now()).toLocaleTimeString();
        const type = (log.type || 'info').toLowerCase();
        const message = classifyLogMessage(log.message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<div class="log-viewer-entry log-type-${type}"><span class="log-viewer-time">${time}</span><span class="log-viewer-message">${message}</span></div>`;
    }).join('');
}

document.getElementById('logViewerRefreshBtn')?.addEventListener('click', async () => {
    const logs = await storage.getLogs();
    renderLogViewer(logs);
});

document.getElementById('logViewerCopyBtn')?.addEventListener('click', async () => {
    const logs = await storage.getLogs();
    const entries = Array.isArray(logs) ? logs.slice(-30) : [];
    const text = entries.slice().reverse().map((log) => {
        const time = new Date(log.timestamp || Date.now()).toLocaleString();
        return `[${time}] ${classifyLogMessage(log.message)}`;
    }).join('\n');
    try {
        await navigator.clipboard.writeText(text || t('logViewerEmpty') || 'No logs yet.');
        showGateStatus(t('logViewerCopied'));
    } catch (error) {
        console.warn('Copy logs failed:', error);
        showGateStatus(t('logViewerCopyFailed'), true);
    }
});

function updateUI(queue, state, settings, logs) {
    renderLogViewer(logs);
    const isRunning = state === AUTOMATOR_STATE.RUNNING;
    const hasRunnableItems = queue.some(item =>
        item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.IN_PROGRESS
    );
    const hasStoredItems = queue.length > 0;
    const queueOnlyCompleted = hasStoredItems && !hasRunnableItems && queue.every(item => item.status === QUEUE_STATUS.COMPLETED);
    const hasStoryboardItems = hasStoryboardQueueItems(queue);
    lastUiState = state;
    lastUiSettings = settings || lastUiSettings;
    syncStartButtonMode();
    startBtn.style.background = isRunning ? 'var(--danger)' : 'var(--button-primary-bg)';
    startBtn.style.color = isRunning ? 'white' : 'black';
    startBtn.disabled = !isSignedInForFeatures();
    startBtn.title = !isRunning && queueOnlyCompleted && !promptInput.value.trim()
        ? t('reuseCompletedPromptTitle')
        : '';
    if (storyboardBtn) {
        const storyboardUnlocked = canUsePremiumOnlyTools();
        storyboardBtn.disabled = !isSignedInForFeatures();
        storyboardBtn.title = isAccountDisabled()
            ? getAccountDisabledMessage()
            : (!storyboardUnlocked ? t('premiumFeatureLocked') : (hasStoryboardItems ? t('storyboard') : t('storyboardNoScenes')));
    }
    // Hide storyboard lock badge — button title conveys the locked state
    if (storyboardLockBadge) storyboardLockBadge.classList.add('hidden');
    
    // Sync header stop button in fixed footer
    headerStopBtn?.classList.toggle('hidden', !isRunning);

    // Update Status Badge
    queueStatusBadge.className = `status-badge ${state}`;
    if (state === AUTOMATOR_STATE.IDLE) queueStatusBadge.textContent = t('idle');
    else if (state === AUTOMATOR_STATE.RUNNING) queueStatusBadge.textContent = t('running');
    else if (state === AUTOMATOR_STATE.PAUSED) queueStatusBadge.textContent = t('paused');
    else queueStatusBadge.textContent = state.charAt(0).toUpperCase() + state.slice(1);

    // Update Global Status Bar
    if (statusBar) {
        statusBar.dataset.state = isAccountDisabled() ? 'error' : state;
        if (!isAccountDisabled()) statusBar.style.color = '';
    }
    if (state !== AUTOMATOR_STATE.IDLE) {
        statusBar?.classList.remove('hidden');
        if (state === AUTOMATOR_STATE.RUNNING) {
            // Match the detail of the currently active item
            const activeItem = queue.find(item => item.status === QUEUE_STATUS.IN_PROGRESS);
            if (activeItem && activeItem.detail) {
                statusBar.textContent = activeItem.detail;
            } else {
                // No item is IN_PROGRESS right now — either between items or starting up
                statusBar.textContent = t('runningQueue');
            }
        } else {
            statusBar.textContent = queueStatusBadge.textContent;
        }
    } else {
        // If IDLE, check if we just finished a queue
        const hasFinishedItems = queue.some(item => item.status === QUEUE_STATUS.COMPLETED || item.status === QUEUE_STATUS.FAILED);
        const hasPendingItems = queue.some(item => item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.IN_PROGRESS);

        if (hasFinishedItems && !hasPendingItems) {
            // Only show "Finished" if it was recently RUNNING or manually stopped
            if (statusBar.textContent !== t('ready')) {
                statusBar.classList.remove('hidden');
                statusBar.textContent = t('queueFinished');
                // Keep result briefly, then return to ready state
                setTimeout(() => {
                    storage.getState().then(s => {
                        if (s === AUTOMATOR_STATE.IDLE && statusBar.textContent === t('queueFinished')) {
                            statusBar.textContent = t('ready');
                        }
                    });
                }, 8000);
            } else {
                statusBar.textContent = t('ready');
            }
        } else {
            statusBar.textContent = t('ready');
        }
    }
    if (isAccountDisabled() && statusBar) {
        statusBar.classList.remove('hidden');
        statusBar.textContent = getAccountDisabledMessage();
        statusBar.style.color = '#b91c1c';
    }

    // Update Counter
    const active = queue.filter(item => item.status === QUEUE_STATUS.IN_PROGRESS || item.status === QUEUE_STATUS.PENDING).length;
    activeCount.textContent = active;
    if (rerunUnfinishedBtn) {
        const hasUnfinishedToRetry = queue.some(item =>
            item.status === QUEUE_STATUS.FAILED || item.status === QUEUE_STATUS.IN_PROGRESS
        );
        rerunUnfinishedBtn.style.display = !isRunning && hasUnfinishedToRetry ? '' : 'none';
    }

    // Update Settings and Selects
    if (settings) {
        if (promptDelaySeconds) promptDelaySeconds.value = getLegacyPromptDelaySeconds(settings);
        if (perPromptAssetsEnabled) perPromptAssetsEnabled.checked = canUsePerPromptAssets() && !!settings.perPromptAssetsEnabled;
        if (autoMentionEnabled) autoMentionEnabled.checked = !!settings.autoMentionEnabled;
        if (videoMultilinePromptToggle) videoMultilinePromptToggle.checked = !!settings.videoMultilinePrompt;
        if (randomizedDelayCustomEnabled) randomizedDelayCustomEnabled.checked = !!settings.randomizedDelayCustomEnabled;
        if (randomizedDelayJitterMaxSeconds) randomizedDelayJitterMaxSeconds.value = settings.randomizedDelayJitterMaxSeconds || 30;
        if (randomizedDelayBreakEveryCount) randomizedDelayBreakEveryCount.value = settings.randomizedDelayBreakEveryCount || 20;
        if (randomizedDelayBreakMinMinutes) randomizedDelayBreakMinMinutes.value = settings.randomizedDelayBreakMinMinutes || 4;
        if (randomizedDelayBreakMaxMinutes) randomizedDelayBreakMaxMinutes.value = settings.randomizedDelayBreakMaxMinutes || 5;
        if (detailedAnalyticsEnabled) detailedAnalyticsEnabled.checked = settings.detailedAnalyticsEnabled === true;
        syncPerPromptAssetsUi(settings);
        syncRandomizedDelayInputs();
        if (timeoutSeconds) timeoutSeconds.value = settings.timeoutSeconds || 5;
        if (retryCount) retryCount.value = settings.retryCount || 2;
        if (autoDownload) autoDownload.checked = settings.autoDownload !== false;
        if (flowUpscaledDownload) flowUpscaledDownload.checked = !!settings.flowUpscaledDownload;
        syncUpscaleDownloadAvailability();
        if (waitForImageResponse) waitForImageResponse.checked = settings.waitForImageResponse !== false;
        if (uiLanguageSelect) uiLanguageSelect.value = settings.uiLanguage || currentLanguage || 'en';
        if (uiThemeSelect) uiThemeSelect.value = normalizeUiTheme(settings.uiTheme || 'default');
        applyTheme(settings.uiTheme || 'default');
        applySubscriptionGate();

        // Migrate legacy stored model labels (pre-rename) to the current Flow labels
        // so the select doesn't end up pointing at a non-existent option.
        const legacyModelMap = {
            'Nano Banana 2 (Fast)': FLOW_MODELS.NANO_BANANA_2,
            'Nano Banana Pro (Quality)': FLOW_MODELS.NANO_BANANA_PRO
        };
        const currentModel = legacyModelMap[settings.flowModel] || settings.flowModel || FLOW_MODELS.NANO_BANANA_PRO;
        if (modelSelect) modelSelect.value = currentModel;

        // Update model status badge
        if (modelStatus) {
            const spec = MODEL_SPECS[currentModel] || { badge: 'Free', badgeType: 'success' };
            modelStatus.textContent = spec.badgeType === 'warning' ? t('creditsRequiredBadge') : t('freeBadge');
            modelStatus.className = `status-badge ${spec.badgeType}`;
            modelStatus.classList.remove('hidden');
        }

        if (concurrentCount) {
            concurrentCount.value = '1';
            concurrentCount.disabled = true;
        }
        // Reference assets (multi-select)
        renderSelectedCharacterAsset(getSelectedCharacterPool(settings));
        const selectedRefs = dedupeReferenceSelections(settings.referenceAssetSelections || []);
        renderSelectedReferenceAssets(selectedRefs);
        renderVideoAssetQueue(dedupeReferenceSelections(settings.videoAssetQueue || []));
        // Keep dropdown in sync: removed items should re-appear.
        populateAssetDropdown(settings.referenceAssets || [], selectedRefs);
        applyFlowTypeUi(settings.flowType || 'image');
        syncVideoOptionsUi(settings);

        // Sync mini buttons
        document.querySelectorAll('[data-ratio]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ratio === settings.flowAspectRatio);
        });
        document.querySelectorAll('[data-qty]').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.qty) === settings.flowQuantity);
        });
        document.querySelectorAll('[data-flow-type]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.flowType === settings.flowType);
        });
    }



    // Render Queue Items
    renderQueue(queue, settings);
    updateMembershipUsageDisplay();
    cleanupEmptySettingCards();
}





let activeQueueTab = 'open';

function setQueueTab(tab) {
    activeQueueTab = tab;
    document.getElementById('queueTabOpen')?.classList.toggle('active', tab === 'open');
    document.getElementById('queueTabFailed')?.classList.toggle('active', tab === 'failed');
    document.getElementById('queueTabCompleted')?.classList.toggle('active', tab === 'completed');
    if (queueList) queueList.classList.toggle('hidden', tab !== 'open');
    if (queueFailedList) queueFailedList.classList.toggle('hidden', tab !== 'failed');
    if (queueCompletedList) queueCompletedList.classList.toggle('hidden', tab !== 'completed');
    const activeListEl = tab === 'open' ? queueList : tab === 'failed' ? queueFailedList : queueCompletedList;
    if (emptyQueueMsg) emptyQueueMsg.style.display = (!activeListEl || activeListEl.children.length === 0) ? 'block' : 'none';
}

function renderQueue(queue, settings = {}) {

    if (!queueList) return;
    const showPerPromptAssets = !!settings?.perPromptAssetsEnabled;
    const queueCharacterPool = getQueueAssetPoolFromSettings(settings, 'character');
    const queueImagePool = getQueueAssetPoolFromSettings(settings, 'image');

    if (queue.length === 0) {
        queueList.innerHTML = '';
        if (queueFailedList) queueFailedList.innerHTML = '';
        if (queueCompletedList) queueCompletedList.innerHTML = '';
        const openCountEl = document.getElementById('queueTabOpenCount');
        const failedCountEl = document.getElementById('queueTabFailedCount');
        const completedCountEl = document.getElementById('queueTabCompletedCount');
        if (openCountEl) openCountEl.textContent = '';
        if (failedCountEl) failedCountEl.textContent = '';
        if (completedCountEl) completedCountEl.textContent = '';
        setQueueTab('open');
        emptyQueueMsg.style.display = 'block';
    } else {
        emptyQueueMsg.style.display = 'none';

        const buildQueueItemEl = (item, originalIndex) => {
            const li = document.createElement('li');
            li.className = `queue-item ${item.status}`;
            li.dataset.itemId = item.id;
            if (item.status === QUEUE_STATUS.PENDING) {
                li.setAttribute('draggable', 'true');
            }

            const itemRow = document.createElement('div');
            itemRow.className = 'item-row';

            if (item.status === QUEUE_STATUS.PENDING) {
                const handle = document.createElement('span');
                handle.className = 'drag-handle';
                handle.innerHTML = '⠿';
                handle.title = 'Drag to reorder';
                itemRow.appendChild(handle);
            }

            const textSpan = document.createElement('span');
            textSpan.className = 'item-text';
            textSpan.textContent = settings.flowType === 'video'
                ? `Video ${originalIndex + 1}`
                : `Image ${originalIndex + 1}`;

            const statusSpan = document.createElement('span');
            statusSpan.className = 'item-status';

            if (item.status === QUEUE_STATUS.FAILED && item.error) {
                const errorSnippet = item.error.length > 25 ? item.error.substring(0, 22) + '...' : item.error;
                statusSpan.textContent = `${t('failedPrefix')}: ${errorSnippet}`;
                statusSpan.title = item.error;
            } else if (item.status === QUEUE_STATUS.IN_PROGRESS && item.detail) {
                statusSpan.textContent = item.detail.length > 46 ? `${item.detail.slice(0, 43)}...` : item.detail;
                statusSpan.title = item.detail;
            } else {
                if (item.status === QUEUE_STATUS.PENDING) statusSpan.textContent = t('pendingStatus');
                else if (item.status === QUEUE_STATUS.IN_PROGRESS) statusSpan.textContent = t('inProgressStatus');
                else if (item.status === QUEUE_STATUS.COMPLETED) statusSpan.textContent = t('completedStatus');
                else if (item.status === QUEUE_STATUS.FAILED) statusSpan.textContent = t('failedStatus');
                else statusSpan.textContent = item.status.replace('_', ' ');
                statusSpan.title = statusSpan.textContent;
            }

            itemRow.appendChild(textSpan);
            itemRow.appendChild(statusSpan);
            li.appendChild(itemRow);

            // Item actions (Edit/Delete)
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'item-actions';

            const isCompletedItem = item.status === QUEUE_STATUS.COMPLETED;
            const isFailedItem = item.status === QUEUE_STATUS.FAILED;

            // Completed prompts are immutable history; reuse creates a new runnable copy.
            const editBtn = document.createElement('button');
            if (isCompletedItem || isFailedItem) {
                editBtn.className = 'action-icon reuse';
                editBtn.title = t('reuseCompletedPromptTitle');
                editBtn.textContent = t('reuseCompletedPrompt');
                editBtn.onclick = async (e) => {
                    e.stopPropagation();
                    // Guard against a single click producing multiple queue
                    // copies (e.g. a fast double-fire, or the click landing
                    // again before refreshUI() finishes re-rendering and
                    // replacing this button).
                    if (editBtn.disabled) return;
                    editBtn.disabled = true;
                    try {
                        await reuseCompletedQueueItem(item.id);
                    } finally {
                        editBtn.disabled = false;
                    }
                };
            } else {
                editBtn.className = 'action-icon edit';
                editBtn.title = t('editPrompt');
                editBtn.innerHTML = '✎';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    currentlyEditingId = item.id;
                    currentEditModalMode = 'single';
                    editModalInput.value = item.prompt;
                    editModalInput.placeholder = '';
                    if (labelEditPrompt) labelEditPrompt.textContent = t('editPrompt');
                    editModal.classList.remove('hidden');
                    editModalInput.focus();
                };
            }

            // Delete Button
            const delBtn = document.createElement('button');
            delBtn.className = 'action-icon delete';
            delBtn.title = t('confirmDeleteTask');
            delBtn.innerHTML = '✕';
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(t('confirmDeleteTask'))) {
                    await storage.removeFromQueue(item.id);
                    refreshUI(); // Immediate feedback
                }
            };

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(delBtn);
            itemRow.appendChild(actionsDiv);

            // Add prompt preview
            const promptDiv = document.createElement('div');
            promptDiv.className = 'item-prompt';
            promptDiv.textContent = item.prompt.replace(/^\[Model: [^\]]+\]\s*/, '');
            li.appendChild(promptDiv);

            if (settings.flowType === 'video') {
                const videoMode = item.videoMode || null;
                const effectiveVideoMode = videoMode || settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS;
                const isFrames = effectiveVideoMode === FLOW_VIDEO_MODES.FRAMES;
                const isIngredients = effectiveVideoMode === FLOW_VIDEO_MODES.INGREDIENTS;
                const sanitizedVideo = sanitizeVideoSettings({
                    videoMode: effectiveVideoMode,
                    videoModel: item.videoModel || settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
                    videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
                    videoEndFrameSelection: item.videoEndFrameSelection,
                    videoVoiceReference: item.videoVoiceReference || '',
                    prompt: item.prompt || ''
                });
                const model = sanitizedVideo.videoModel;
                const durationSeconds = sanitizedVideo.videoDurationSeconds;
                const voiceAllowed = isVideoVoiceAllowed(model, effectiveVideoMode);
                const savedVoice = item.videoVoiceReference || '';
                const ingredients = filterSelectionsToPool(item.videoIngredientSelections || [], getQueueAssetPoolFromSettings(settings, 'videoIngredient'));
                const startFrame = item.videoStartFrameSelection || null;
                const endFrame = sanitizedVideo.allowEndFrame ? (item.videoEndFrameSelection || null) : null;
                const videoRow = document.createElement('div');
                videoRow.className = `queue-asset-row video-queue-options ${isFrames ? 'frames' : isIngredients ? 'ingredients' : 'unset'}`;

                const info = document.createElement('div');
                info.className = 'queue-asset-info';

                const queueModelSelect = document.createElement('select');
                queueModelSelect.className = 'queue-video-model-select';
                queueModelSelect.setAttribute('aria-label', t('videoModel'));
                Object.values(FLOW_VIDEO_MODELS).forEach((value) => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    option.selected = value === model;
                    queueModelSelect.appendChild(option);
                });
                queueModelSelect.disabled = isCompletedItem;
                queueModelSelect.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
                queueModelSelect.addEventListener('change', async (event) => {
                    event.stopPropagation();
                    if (!isCompletedItem) await updateQueueItemVideoModel(item.id, queueModelSelect.value);
                });

                const thumbs = document.createElement('div');
                thumbs.className = 'queue-asset-thumbs video-selected-thumbs';
                const thumbAssets = isFrames
                    ? [
                        ...(startFrame ? [{ asset: startFrame, type: 'start' }] : []),
                        ...(endFrame ? [{ asset: endFrame, type: 'end' }] : [])
                    ]
                    : isIngredients
                        ? ingredients.map((asset) => ({ asset, type: 'ingredient' }))
                        : [];
                const getVideoThumbLabel = (type, index) => {
                    if (type === 'start') return t('videoThumbStartLabel');
                    if (type === 'end') return t('videoThumbEndLabel');
                    return `${t('videoThumbIngredientLabel')} ${index + 1}`;
                };
                thumbAssets.slice(0, 5).forEach(({ asset, type }, index) => {
                    const thumb = document.createElement('div');
                    thumb.className = `queue-asset-thumb selected video-role-thumb ${type}`;
                    const roleLabel = getVideoThumbLabel(type, index);
                    thumb.title = roleLabel;
                    if (asset?.src) {
                        const img = document.createElement('img');
                        img.src = asset.src;
                        img.alt = asset.label || asset.id || type;
                        thumb.appendChild(img);
                    } else {
                        thumb.textContent = type === 'start' ? 'S' : type === 'end' ? 'E' : 'I';
                    }
                    if (type !== 'ingredient') {
                        const badge = document.createElement('span');
                        badge.className = `video-thumb-role-badge ${type}`;
                        badge.textContent = roleLabel;
                        thumb.appendChild(badge);
                    }
                    if (isCompletedItem) {
                        thumb.classList.add('readonly');
                    } else {
                        thumb.addEventListener('click', async (event) => {
                            event.stopPropagation();
                            if (type === 'ingredient') {
                                await toggleQueueItemVideoIngredientAsset(item.id, asset);
                            } else {
                                await clearQueueItemVideoFrameAsset(item.id, type === 'end' ? 'end' : 'start');
                            }
                        });
                    }
                    thumbs.appendChild(thumb);
                });
                // Empty slots render as dashed boxes (matching the Storyboard look) —
                // clicking one opens the picker directly instead of a separate
                // "+ Ingredients"/"Start Image"/"End Image" text button.
                const addEmptySlotBox = (type, roleLabel, pickerMode) => {
                    const box = document.createElement('div');
                    box.className = `video-slot-box ${isCompletedItem ? 'disabled' : ''}`;
                    box.textContent = '+';
                    box.title = roleLabel;
                    if (type !== 'ingredient') {
                        const badge = document.createElement('span');
                        badge.className = `video-thumb-role-badge ${type}`;
                        badge.textContent = roleLabel;
                        box.appendChild(badge);
                    }
                    if (!isCompletedItem) {
                        box.addEventListener('click', (event) => {
                            event.stopPropagation();
                            openQueueItemAssetPicker(item.id, pickerMode);
                        });
                    }
                    thumbs.appendChild(box);
                };
                if (effectiveVideoMode) {
                    if (isFrames) {
                        if (!startFrame) addEmptySlotBox('start', t('videoThumbStartLabel'), 'videoStartFrame');
                        if (sanitizedVideo.allowEndFrame && !endFrame) addEmptySlotBox('end', t('videoThumbEndLabel'), 'videoEndFrame');
                    } else if (isIngredients) {
                        // Render all remaining empty slots so users can see all available spots
                        // and click any of them to open the picker.
                        for (let slotIdx = ingredients.length; slotIdx < MAX_VIDEO_INGREDIENT_IMAGES; slotIdx++) {
                            addEmptySlotBox('ingredient', `${t('videoThumbIngredientLabel')} ${slotIdx + 1}`, 'videoIngredient');
                        }
                    }
                }
                if (!thumbAssets.length && !effectiveVideoMode) {
                    const empty = document.createElement('span');
                    empty.className = 'queue-asset-more';
                    empty.textContent = t('queueChooseVideoMode');
                    thumbs.appendChild(empty);
                }

                const actions = document.createElement('div');
                actions.className = 'queue-asset-actions video-settings-actions';

                // Per-prompt mode/model/duration overrides only apply when the
                // global "Use different model per prompt" toggle is on. When
                // it's off, every queued video prompt just uses the top-level
                // default (videoMode/videoModel/videoDurationSeconds) and none
                // of these per-item controls are shown.
                const perPromptModelEnabled = settings.videoPerPromptModelEnabled === true;
                if (perPromptModelEnabled) {
                    const canChangeVideoMode = canUsePerPromptAssets();
                    const modeSelect = document.createElement('select');
                    modeSelect.className = `input-select queue-video-mode-select ${isFrames ? 'frames' : isIngredients ? 'ingredients' : 'unset'} ${canChangeVideoMode ? '' : 'locked'}`;
                    [
                        { value: FLOW_VIDEO_MODES.INGREDIENTS, label: t('videoModeIngredients') },
                        { value: FLOW_VIDEO_MODES.FRAMES, label: t('videoModeFrames') }
                    ].forEach(({ value, label }) => {
                        const opt = document.createElement('option');
                        opt.value = value;
                        opt.textContent = label;
                        if (value === effectiveVideoMode) opt.selected = true;
                        modeSelect.appendChild(opt);
                    });
                    modeSelect.title = canChangeVideoMode ? '' : t('premiumRequiredForVideoMode');
                    modeSelect.disabled = isCompletedItem || !canChangeVideoMode;
                    modeSelect.addEventListener('click', (event) => event.stopPropagation());
                    modeSelect.addEventListener('change', async (event) => {
                        event.stopPropagation();
                        if (isCompletedItem) return;
                        if (!canChangeVideoMode) {
                            showGateStatus(t('premiumRequiredForVideoMode'), true);
                            return;
                        }
                        await updateQueueItemVideoMode(item.id, modeSelect.value);
                    });

                    actions.appendChild(modeSelect);
                    actions.appendChild(queueModelSelect);
                    const supportedDurations = getSupportedVideoDurations(model, effectiveVideoMode);
                    // Only Omni Flash exposes a duration choice — Veo variants always
                    // run at their single fixed duration regardless of mode, so no
                    // selector is shown for them even when multiple values are
                    // technically valid per model.js capabilities.
                    if (model === FLOW_VIDEO_MODELS.OMNI_FLASH && supportedDurations.length > 1) {
                        const durationGroup = document.createElement('div');
                        durationGroup.className = 'queue-video-duration-group';
                        durationGroup.setAttribute('aria-label', t('queueVideoDurationLabel'));
                        supportedDurations.forEach((seconds) => {
                            const durationBtn = document.createElement('button');
                            durationBtn.type = 'button';
                            durationBtn.className = `queue-video-duration-btn ${durationSeconds === seconds ? 'active' : ''}`;
                            durationBtn.textContent = `${seconds}s`;
                            durationBtn.disabled = isCompletedItem || supportedDurations.length === 1;
                            durationBtn.addEventListener('click', async (event) => {
                                event.stopPropagation();
                                if (!isCompletedItem) await updateQueueItemVideoDuration(item.id, seconds);
                            });
                            durationGroup.appendChild(durationBtn);
                        });
                        actions.appendChild(durationGroup);
                    }
                }

                videoRow.appendChild(info);
                videoRow.appendChild(actions);
                videoRow.appendChild(thumbs);
                const uniqueWarnings = [...new Set(sanitizedVideo.warnings || [])];
                if (uniqueWarnings.length) {
                    const warning = document.createElement('div');
                    warning.className = 'queue-video-warning';
                    warning.textContent = uniqueWarnings[0];
                    videoRow.appendChild(warning);
                }
                li.appendChild(videoRow);
            } else if (showPerPromptAssets) {
                const itemRefs = Array.isArray(item.referenceAssetSelections)
                    ? getPerPromptReferenceSelections(item, queueImagePool)
                    : [];
                const itemCharacters = getQueueItemCharacterSelections(item, queueCharacterPool);
                const assetRow = document.createElement('div');
                assetRow.className = 'queue-asset-row';

                const assetInfo = document.createElement('div');
                assetInfo.className = 'queue-asset-info';

                const assetMeta = document.createElement('div');
                assetMeta.className = 'queue-asset-meta';
                const characterLabel = itemCharacters.length > 1
                    ? tFormat('queueCharactersSet', { count: itemCharacters.length })
                    : itemCharacters.length === 1
                    ? tFormat('queueCharacterSet', { name: getCharacterDisplayName(itemCharacters[0], 0).slice(0, 18) })
                    : t('queueNoCharacter');
                const imageLabel = itemRefs.length
                    ? tFormat('queueImagesSet', { count: itemRefs.length })
                    : t('queueNoImages');
                assetMeta.textContent = `${characterLabel} • ${imageLabel}`;

                const assetThumbs = document.createElement('div');
                assetThumbs.className = 'queue-asset-thumbs';
                const selectedThumbAssets = [
                    ...itemCharacters.map((asset) => ({ asset, type: 'character' })),
                    ...itemRefs.map((asset) => ({ asset, type: 'image' }))
                ];
                selectedThumbAssets.slice(0, 5).forEach(({ asset, type }, index) => {
                    const thumb = document.createElement('div');
                    thumb.className = `queue-asset-thumb selected ${type === 'character' ? 'character' : ''}`;
                    thumb.title = type === 'character' ? t('queueCharacterButton') : t('queueImagesButton');
                    if (asset.src) {
                        const img = document.createElement('img');
                        img.src = asset.src;
                        img.alt = type === 'character' ? getCharacterDisplayName(asset, index) : (asset.label || asset.id || '');
                        thumb.appendChild(img);
                    } else {
                        thumb.textContent = type === 'character' ? 'C' : 'I';
                    }
                    if (isCompletedItem) {
                        thumb.classList.add('readonly');
                    } else {
                        thumb.addEventListener('click', async (event) => {
                            event.stopPropagation();
                            if (type === 'character') {
                                await toggleQueueItemCharacterAsset(item.id, asset);
                            } else {
                                await toggleQueueItemReferenceAsset(item.id, asset);
                            }
                        });
                    }
                    assetThumbs.appendChild(thumb);
                });
                if (selectedThumbAssets.length > 5) {
                    const more = document.createElement('span');
                    more.className = 'queue-asset-more';
                    more.textContent = `+${selectedThumbAssets.length - 5}`;
                    assetThumbs.appendChild(more);
                }

                assetInfo.appendChild(assetMeta);
                assetInfo.appendChild(assetThumbs);

                const assetActions = document.createElement('div');
                assetActions.className = 'queue-asset-actions';

                const characterBtn = document.createElement('button');
                characterBtn.className = 'queue-asset-btn queue-asset-add-btn';
                characterBtn.textContent = t('queueAddCharacterButton');
                characterBtn.disabled = isCompletedItem;
                if (isCompletedItem) {
                    characterBtn.classList.add('readonly');
                    characterBtn.title = t('completedStatus');
                } else {
                    characterBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        openQueueItemAssetPicker(item.id, 'character');
                    });
                }

                const imageBtn = document.createElement('button');
                imageBtn.className = 'queue-asset-btn queue-asset-add-btn';
                imageBtn.textContent = t('queueAddImagesButton');
                imageBtn.disabled = isCompletedItem;
                if (isCompletedItem) {
                    imageBtn.classList.add('readonly');
                    imageBtn.title = t('completedStatus');
                } else {
                    imageBtn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        openQueueItemAssetPicker(item.id, 'image');
                    });
                }

                assetActions.appendChild(characterBtn);
                assetActions.appendChild(imageBtn);
                assetRow.appendChild(assetInfo);
                assetRow.appendChild(assetActions);
                li.appendChild(assetRow);
            }

            if (item.status === QUEUE_STATUS.FAILED && item.error) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-detail';
                errorDiv.textContent = item.error;
                li.appendChild(errorDiv);
            }

            return li;
        };

        const openItems = queue.filter(i => i.status === QUEUE_STATUS.PENDING || i.status === QUEUE_STATUS.IN_PROGRESS);
        const failedItems = queue.filter(i => i.status === QUEUE_STATUS.FAILED);
        const completedItems = queue.filter(i => i.status === QUEUE_STATUS.COMPLETED);

        const openCountEl = document.getElementById('queueTabOpenCount');
        const failedCountEl = document.getElementById('queueTabFailedCount');
        const completedCountEl = document.getElementById('queueTabCompletedCount');
        if (openCountEl) openCountEl.textContent = openItems.length || '';
        if (failedCountEl) failedCountEl.textContent = failedItems.length || '';
        if (completedCountEl) completedCountEl.textContent = completedItems.length || '';

        if (failedItems.length > 0 && activeQueueTab === 'open' && openItems.length === 0) {
            setQueueTab('failed');
        }

        {
            const fragment = document.createDocumentFragment();
            openItems.slice(0, 200).forEach((item) => {
                const originalIndex = queue.findIndex(i => i.id === item.id);
                fragment.appendChild(buildQueueItemEl(item, originalIndex));
            });
            queueList.innerHTML = '';
            queueList.appendChild(fragment);
            setupQueueDragDrop(queueList, openItems, queue);
            const hasActive = openItems.some(i => i.status === QUEUE_STATUS.IN_PROGRESS);
            const viewport = document.querySelector('.queue-viewport');
            if (viewport && hasActive) viewport.scrollTop = viewport.scrollHeight;
        }

        if (queueFailedList) {
            const fragment = document.createDocumentFragment();
            failedItems.slice(0, 200).forEach((item) => {
                const originalIndex = queue.findIndex(i => i.id === item.id);
                fragment.appendChild(buildQueueItemEl(item, originalIndex));
            });
            queueFailedList.innerHTML = '';
            queueFailedList.appendChild(fragment);
        }

        if (queueCompletedList) {
            const fragment = document.createDocumentFragment();
            completedItems.slice(0, 200).forEach((item) => {
                const originalIndex = queue.findIndex(i => i.id === item.id);
                fragment.appendChild(buildQueueItemEl(item, originalIndex));
            });
            queueCompletedList.innerHTML = '';
            queueCompletedList.appendChild(fragment);
        }

        if (queueList) queueList.classList.toggle('hidden', activeQueueTab !== 'open');
        if (queueFailedList) queueFailedList.classList.toggle('hidden', activeQueueTab !== 'failed');
        if (queueCompletedList) queueCompletedList.classList.toggle('hidden', activeQueueTab !== 'completed');
        const activeListItems = activeQueueTab === 'open' ? openItems : activeQueueTab === 'failed' ? failedItems : completedItems;
        if (emptyQueueMsg) emptyQueueMsg.style.display = activeListItems.length === 0 ? 'block' : 'none';
    }
}

function setupQueueDragDrop(listEl, openItems, fullQueue) {
    let dragSrcId = null;

    listEl.querySelectorAll('li[draggable="true"]').forEach(li => {
        li.addEventListener('dragstart', (e) => {
            dragSrcId = li.dataset.itemId;
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            listEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            if (li.dataset.itemId !== dragSrcId) li.classList.add('drag-over');
        });
        li.addEventListener('drop', async (e) => {
            e.preventDefault();
            const targetId = li.dataset.itemId;
            if (!dragSrcId || dragSrcId === targetId) return;

            const pendingIds = openItems.filter(i => i.status === QUEUE_STATUS.PENDING).map(i => i.id);
            if (!pendingIds.includes(dragSrcId) || !pendingIds.includes(targetId)) return;

            const srcIdx = pendingIds.indexOf(dragSrcId);
            const tgtIdx = pendingIds.indexOf(targetId);
            pendingIds.splice(srcIdx, 1);
            pendingIds.splice(tgtIdx, 0, dragSrcId);

            const pendingOrder = new Map(pendingIds.map((id, i) => [id, i]));
            const nonPending = fullQueue.filter(i => i.status !== QUEUE_STATUS.PENDING);
            const reordered = [
                ...fullQueue.filter(i => i.status === QUEUE_STATUS.PENDING).sort((a, b) => pendingOrder.get(a.id) - pendingOrder.get(b.id)),
                ...nonPending
            ];
            await storage.setQueue(reordered);
            refreshUI();
        });
    });
}

async function handleAddPrompts(options = {}) {
    const text = promptInput.value.trim();
    if (!text) return;
    const sequences = parsePromptSequences(text);
    const settings = await storage.getSettings();
    const shouldCopyAssets = options.perPromptAssets ?? !!settings.perPromptAssetsEnabled;

    const newItems = sequences.map((seq, idx) => {
        const metadata = settings.flowType === 'video'
            ? {
                // Only bake a fixed mode/model/duration into the item when
                // per-prompt overrides are enabled. Otherwise leave these unset
                // so the item always follows whatever the global default is at
                // run time (item.videoMode || settings.videoMode, etc.) instead
                // of freezing in whatever the global value happened to be when
                // this prompt was added to the queue.
                ...(settings.videoPerPromptModelEnabled === true
                    ? {
                        videoMode: settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS,
                        videoModel: settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
                        videoDurationSeconds: settings.videoDurationSeconds || 8
                    }
                    : {}),
                videoVoiceReference: settings.videoVoiceReference || '',
                videoIngredientSelections: [],
                videoStartFrameSelection: null,
                videoEndFrameSelection: null
            }
            : shouldCopyAssets
            ? {
                characterAssetSelections: [],
                characterAssetSelection: null,
                referenceAssetSelections: [],
                perPromptAssetsEdited: false,
                perPromptCharacterAssetsEdited: false,
                perPromptReferenceAssetsEdited: false
            }
            : {};
        let item = createQueueItem(seq.trim(), metadata);
        // Apply outputName from CSV if present
        const csvName = pendingCsvOutputNames.get(seq.trim()) || '';
        if (csvName) item.outputName = csvName;
        item = autoBindAssetsByPromptMentions(item, settings);
        return item;
    });
    pendingCsvOutputNames = new Map(); // consumed

    await storage.addToQueue(newItems);
    promptInput.value = '';
    updatePromptPreview();
    console.log(`Added ${newItems.length} prompts to queue.`);
}

async function reuseCompletedQueueItem(itemId, options = {}) {
    const queue = await storage.getQueue();
    const sourceItem = queue.find((item) => item.id === itemId);
    if (!sourceItem || (sourceItem.status !== QUEUE_STATUS.COMPLETED && sourceItem.status !== QUEUE_STATUS.FAILED)) return;

    const metadata = {};
    if (Object.prototype.hasOwnProperty.call(sourceItem, 'characterAssetSelections')) {
        metadata.characterAssetSelections = cloneReferenceSelections(sourceItem.characterAssetSelections || []);
    }
    if (Object.prototype.hasOwnProperty.call(sourceItem, 'characterAssetSelection')) {
        metadata.characterAssetSelection = sourceItem.characterAssetSelection
            ? cloneReferenceSelection(sourceItem.characterAssetSelection)
            : null;
    }
    if (Object.prototype.hasOwnProperty.call(sourceItem, 'referenceAssetSelections')) {
        metadata.referenceAssetSelections = cloneReferenceSelections(sourceItem.referenceAssetSelections || []);
    }
    if (Object.prototype.hasOwnProperty.call(sourceItem, 'videoMode')) {
        metadata.videoMode = sourceItem.videoMode || null;
        metadata.videoModel = sourceItem.videoModel || lastUiSettings?.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST;
        metadata.videoDurationSeconds = sourceItem.videoDurationSeconds || lastUiSettings?.videoDurationSeconds || 8;
        metadata.videoVoiceReference = sourceItem.videoVoiceReference || '';
        metadata.videoIngredientSelections = cloneReferenceSelections(sourceItem.videoIngredientSelections || []);
        metadata.videoStartFrameSelection = sourceItem.videoStartFrameSelection ? cloneReferenceSelection(sourceItem.videoStartFrameSelection) : null;
        metadata.videoEndFrameSelection = sourceItem.videoEndFrameSelection ? cloneReferenceSelection(sourceItem.videoEndFrameSelection) : null;
    }

    const reusedItem = createQueueItem(sourceItem.prompt || '', metadata);
    await storage.addToQueue(reusedItem);
    // A completed item is kept as history, but a failed one is being replaced
    // by the fresh retry copy — leaving it in the Failed tab is just clutter.
    if (sourceItem.status === QUEUE_STATUS.FAILED) {
        await storage.removeFromQueue(sourceItem.id);
    }
    if (!options.silent) {
        showGateStatus(t('completedPromptReused'));
        // The reused copy is a new PENDING item, so it lives in the "Open"
        // tab — switch there so the user actually sees it instead of staying
        // on "Failed"/"Completed" where nothing changed.
        setQueueTab('open');
        await refreshUI();
        scrollQueueToBottom();
    }
}

function revealQueueAssetReview() {
    const firstAssetRow = document.querySelector('.queue-asset-row');
    const firstAssetButton = document.querySelector('.queue-asset-btn');
    const queueViewport = document.querySelector('.queue-viewport');

    if (queueViewport) {
        queueViewport.scrollTop = 0;
    }
    try {
        (firstAssetRow || queueList)?.scrollIntoView({ block: 'nearest' });
    } catch { }
    try {
        firstAssetButton?.focus({ preventScroll: true });
    } catch { }
}

function updatePromptPreview() {
    const text = promptInput.value.trim();
    if (!promptPreviewContainer || !previewList) return;

    if (!text) {
        promptPreviewContainer.classList.add('hidden');
        return;
    }

    promptPreviewContainer.classList.remove('hidden');
    const sequences = parsePromptSequences(text);

    const livePreviewCount = document.getElementById('previewCount');
    if (livePreviewCount) livePreviewCount.textContent = sequences.length;
    previewList.innerHTML = '';

    sequences.forEach((seq, idx) => {
        const li = document.createElement('li');
        li.className = 'preview-item';
        const content = seq.trim();
        const displayContent = content.replace(/\s*\n+\s*/g, ' ').trim();
        const charCount = content.length;

        const number = document.createElement('div');
        number.className = 'preview-number';
        number.textContent = String(idx + 1);

        const contentWrap = document.createElement('div');
        contentWrap.className = 'preview-content';

        const text = document.createElement('span');
        text.className = 'preview-text';
        text.textContent = displayContent;

        const meta = document.createElement('span');
        meta.className = 'preview-meta';
        meta.textContent = `${charCount} characters`;

        contentWrap.append(text, meta);
        li.append(number, contentWrap);
        previewList.appendChild(li);
    });
}

function parsePromptSequences(text) {
    const isVideo = lastUiSettings?.flowType === 'video';
    const isMultiline = isVideo && lastUiSettings?.videoMultilinePrompt === true;
    if (isMultiline) {
        return (text || '')
            .split(/\s*@@@NEXT@@@\s*/)
            .map(seq => seq.trim())
            .filter(Boolean);
    }
    // Prompts are separated by blank lines only.
    // Single newlines stay inside the same prompt (e.g. "1 : ...").
    return (text || '')
        .split(/\n\s*\n/)
        .map(seq => normalizePromptBlock(seq))
        .filter(Boolean);
}

function normalizePromptBlock(seq) {
    return (seq || '')
        // If user writes "1" then newline then ":" then text, merge into one line.
        .replace(/(^|\n)(\d+)\s*\n+\s*:\s*/g, '$1$2: ')
        // If user writes "1 :" then newline then text, keep it on one line.
        .replace(/(^|\n)(\d+)\s*:\s*\n+\s*/g, '$1$2: ')
        .trim();
}

function clearCsvInputSelection() {
    if (csvImport) csvImport.value = '';
}

function countCharsByRegex(text = '', regex) {
    const matches = String(text || '').match(regex);
    return matches ? matches.length : 0;
}

async function decodeCsvFile(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    const hasUtf16LeBom = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe;
    const hasUtf16BeBom = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff;

    const preferredEncodings = hasUtf16LeBom
        ? ['utf-16le', 'utf-8', 'euc-kr', 'shift_jis', 'gb18030']
        : hasUtf16BeBom
            ? ['utf-16be', 'utf-8', 'euc-kr', 'shift_jis', 'gb18030']
            : hasUtf8Bom
                ? ['utf-8', 'euc-kr', 'shift_jis', 'gb18030']
                : ['utf-8', 'euc-kr', 'shift_jis', 'gb18030', 'windows-1252', 'utf-16le', 'utf-16be'];

    let best = null;
    for (const encoding of preferredEncodings) {
        try {
            const decoder = new TextDecoder(encoding, { fatal: false });
            const text = decoder.decode(bytes);
            const replacementCount = countCharsByRegex(text, /\uFFFD/g);
            const controlCount = countCharsByRegex(text, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g);
            const score = replacementCount * 10 + controlCount * 4;

            if (!best || score < best.score) {
                best = { encoding, text, score, replacementCount, controlCount };
            }
        } catch {
            // Unsupported decoder on this runtime; skip.
        }
    }

    if (!best) {
        throw new Error('Could not decode CSV file.');
    }

    return {
        encoding: best.encoding,
        text: best.text.replace(/^\uFEFF/, ''),
        hadReplacement: best.replacementCount > 0
    };
}

function detectCsvDelimiter(csvText = '') {
    const text = String(csvText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const sampleLines = text.split('\n').filter((line) => line.trim()).slice(0, 20);
    if (!sampleLines.length) return ',';

    const delimiters = [',', ';', '\t'];
    const scores = new Map(delimiters.map((delimiter) => [delimiter, 0]));

    sampleLines.forEach((line) => {
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    i++;
                    continue;
                }
                inQuotes = !inQuotes;
                continue;
            }
            if (!inQuotes && scores.has(ch)) {
                scores.set(ch, scores.get(ch) + 1);
            }
        }
    });

    let bestDelimiter = ',';
    let bestScore = -1;
    delimiters.forEach((delimiter) => {
        const score = scores.get(delimiter) || 0;
        if (score > bestScore) {
            bestScore = score;
            bestDelimiter = delimiter;
        }
    });

    return bestScore > 0 ? bestDelimiter : ',';
}

function parseCsvRows(csvText = '', delimiter = ',') {
    const text = String(csvText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            continue;
        }
        if (ch === delimiter) {
            row.push(cell);
            cell = '';
            continue;
        }
        if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            continue;
        }
        cell += ch;
    }

    row.push(cell);
    rows.push(row);

    while (rows.length && rows[rows.length - 1].every((value) => !String(value || '').trim())) {
        rows.pop();
    }

    return rows;
}

function detectPromptColumn(rows = []) {
    if (!rows.length) return { promptCol: 0, nameCol: -1, startRow: 0, headerDetected: false };
    const firstRow = rows[0].map((v) => String(v || '').trim().toLowerCase());
    const headerKeywords = [
        'prompt',
        'image prompt',
        'text prompt',
        '프롬프트',
        'プロンプト',
        '提示词',
        '提示詞'
    ];
    const nameKeywords = ['name', 'output name', 'save as', '이름', '출력 이름', '名前'];
    const promptCol = firstRow.findIndex((cell) => headerKeywords.some((keyword) => cell === keyword || cell.includes(keyword)));
    const nameCol = firstRow.findIndex((cell) => nameKeywords.some((kw) => cell === kw || cell.includes(kw)));
    if (promptCol !== -1) return { promptCol, nameCol, startRow: 1, headerDetected: true };

    // Language-agnostic fallback: select the most populated column.
    let bestCol = 0;
    let bestNonEmpty = -1;
    let bestLength = -1;
    const maxCols = rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);

    for (let col = 0; col < maxCols; col++) {
        let nonEmptyCount = 0;
        let totalLength = 0;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const value = String((rows[rowIndex] && rows[rowIndex][col]) || '').trim();
            if (!value) continue;
            nonEmptyCount++;
            totalLength += value.length;
        }
        if (
            nonEmptyCount > bestNonEmpty ||
            (nonEmptyCount === bestNonEmpty && totalLength > bestLength)
        ) {
            bestCol = col;
            bestNonEmpty = nonEmptyCount;
            bestLength = totalLength;
        }
    }

    return { promptCol: bestCol, nameCol: -1, startRow: 0, headerDetected: false };
}

function sanitizeCsvPrompt(raw = '') {
    const cleaned = String(raw || '')
        .replace(/^\uFEFF/, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalizePromptBlock(cleaned).normalize('NFC');
}

function buildCsvPromptEntries(rows = []) {
    const { promptCol, nameCol, startRow } = detectPromptColumn(rows);
    const entries = [];

    for (let rowIndex = startRow; rowIndex < rows.length; rowIndex++) {
        const cells = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
        const allEmpty = cells.every((value) => !String(value || '').trim());
        if (allEmpty) continue;

        let rawPrompt = String(cells[promptCol] || '');
        if (!rawPrompt.trim() && promptCol !== 0) {
            rawPrompt = String(cells.find((value) => String(value || '').trim()) || '');
        }

        const outputName = nameCol !== -1
            ? String(cells[nameCol] || '').trim().replace(/[^\w\s\-_.]/g, '').trim().substring(0, 60)
            : '';

        const issues = [];
        if (/\uFFFD/.test(rawPrompt)) {
            issues.push('Possible encoding issue detected (�).');
        }
        if (!String(rawPrompt || '').trim()) {
            issues.push('Prompt is empty.');
        }

        const prompt = sanitizeCsvPrompt(rawPrompt);
        if (!prompt) {
            if (!issues.includes('Prompt is empty.')) issues.push('Prompt is empty.');
        }

        entries.push({
            rowNumber: rowIndex + 1,
            prompt,
            outputName,
            issues
        });
    }

    return entries;
}

function closeCsvValidationModal() {
    if (csvValidationModal) csvValidationModal.classList.add('hidden');
}

function cancelCsvValidationModal() {
    pendingCsvEntries = [];
    closeCsvValidationModal();
    showGateStatus(t('csvImportCanceled'));
}

function applyCsvEntriesToPromptInput(entries = []) {
    const validEntries = entries
        .map((entry) => ({ prompt: sanitizeCsvPrompt(entry?.prompt || ''), outputName: entry?.outputName || '' }))
        .filter((e) => e.prompt);

    // Stash outputName associations so handleAddPrompts can pick them up
    pendingCsvOutputNames = new Map();
    validEntries.forEach((e) => {
        if (e.outputName) pendingCsvOutputNames.set(e.prompt, e.outputName);
    });

    promptInput.value = validEntries.map((e) => e.prompt).join('\n\n');
    updatePromptPreview();
    return validEntries.length;
}

function showCsvImportCountPopup({ foundCount = 0, loadedCount = null, issueCount = 0 } = {}) {
    const found = Number.isFinite(foundCount) ? foundCount : 0;
    const loaded = Number.isFinite(loadedCount) ? loadedCount : null;
    const issues = Number.isFinite(issueCount) ? issueCount : 0;

    if (issues > 0) {
        alert(
            `${t('csvImportCompleteTitle')}\n\n` +
            `${tFormat('csvFoundPrompts', { count: found })}\n` +
            `${tFormat('csvRowsNeedFixes', { count: issues })}\n\n` +
            `${t('csvReviewFixRows')}`
        );
        return;
    }

    alert(
        `${t('csvImportCompleteTitle')}\n\n` +
        `${tFormat('csvFoundPrompts', { count: found })}\n` +
        `${loaded !== null ? `${tFormat('csvLoadedToEditor', { count: loaded })}\n` : ''}` +
        `${t('csvReviewAddQueue')}`
    );
}

function openCsvValidationModal(entries = []) {
    if (!csvValidationModal || !csvValidationList || !csvValidationSummary) return;
    pendingCsvEntries = entries.map((entry) => ({ ...entry }));
    const issueEntries = pendingCsvEntries.filter((entry) => Array.isArray(entry.issues) && entry.issues.length > 0);

    csvValidationSummary.textContent =
        `${issueEntries.length} problematic prompt(s) found. Fix them below, then click Apply.`;
    csvValidationList.innerHTML = '';

    issueEntries.forEach((entry, issueIndex) => {
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid var(--border); border-radius:10px; padding:8px; background:rgba(255,255,255,0.02);';

        const title = document.createElement('div');
        title.style.cssText = 'font-size:0.72rem; color:var(--warning); margin-bottom:6px;';
        title.textContent = `Row ${entry.rowNumber}: ${entry.issues.join(' ')}`;

        const textarea = document.createElement('textarea');
        textarea.value = entry.prompt || '';
        textarea.dataset.entryIndex = String(pendingCsvEntries.indexOf(entry));
        textarea.dataset.issueIndex = String(issueIndex);
        textarea.style.cssText = 'width:100%; min-height:70px; resize:vertical;';
        textarea.placeholder = 'Edit this prompt (leave empty to skip this row)';

        card.appendChild(title);
        card.appendChild(textarea);
        csvValidationList.appendChild(card);
    });

    csvValidationModal.classList.remove('hidden');
}

function applyCsvValidationFixes() {
    if (!csvValidationList) return;
    const textareas = Array.from(csvValidationList.querySelectorAll('textarea[data-entry-index]'));
    let changedCount = 0;
    let skippedCount = 0;

    textareas.forEach((textarea) => {
        const entryIndex = Number(textarea.dataset.entryIndex);
        if (!Number.isFinite(entryIndex) || !pendingCsvEntries[entryIndex]) return;
        const nextPrompt = sanitizeCsvPrompt(textarea.value || '');
        const previousPrompt = sanitizeCsvPrompt(pendingCsvEntries[entryIndex].prompt || '');
        pendingCsvEntries[entryIndex].prompt = nextPrompt;
        pendingCsvEntries[entryIndex].issues = [];
        if (!nextPrompt) skippedCount++;

        textarea.style.borderColor = '';
        if (nextPrompt !== previousPrompt) {
            changedCount++;
        }
    });

    const importedCount = applyCsvEntriesToPromptInput(pendingCsvEntries);
    if (importedCount <= 0) {
        showGateStatus(t('csvNoValidPrompts'), true);
        return;
    }

    closeCsvValidationModal();
    pendingCsvEntries = [];
    const details = [];
    if (changedCount > 0) details.push(`${changedCount} edited`);
    if (skippedCount > 0) details.push(`${skippedCount} skipped`);
    const detailSuffix = details.length ? ` (${details.join(', ')})` : '';
    showGateStatus(tFormat('csvLoadedReady', { count: importedCount, details: detailSuffix }));
    showCsvImportCountPopup({
        foundCount: importedCount,
        loadedCount: importedCount,
        issueCount: 0
    });
}

async function handleCsvImport(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;

    try {
        const decoded = await decodeCsvFile(file);
        const delimiter = detectCsvDelimiter(decoded.text);
        const rows = parseCsvRows(decoded.text, delimiter);
        if (!rows.length) {
            showGateStatus(t('csvEmptyUnreadable'), true);
            return;
        }

        const entries = buildCsvPromptEntries(rows);
        if (!entries.length) {
            showGateStatus(t('csvNoValidRows'), true);
            return;
        }

        const issueEntries = entries.filter((entry) => entry.issues.length > 0);
        if (issueEntries.length > 0) {
            openCsvValidationModal(entries);
            showGateStatus(
                tFormat('csvLoadedWithIssues', { count: issueEntries.length }),
                true
            );
            showCsvImportCountPopup({
                foundCount: entries.length,
                loadedCount: null,
                issueCount: issueEntries.length
            });
            return;
        }

        const importedCount = applyCsvEntriesToPromptInput(entries);
        if (decoded.hadReplacement) {
            showGateStatus(
                tFormat('csvLoadedReplacement', { count: importedCount, encoding: decoded.encoding }),
                true
            );
        } else {
            const delimiterLabel = delimiter === '\t' ? 'TAB' : delimiter;
            showGateStatus(
                tFormat('csvLoadedDetail', {
                    count: importedCount,
                    delimiter: delimiterLabel,
                    encoding: decoded.encoding
                })
            );
        }
        showCsvImportCountPopup({
            foundCount: entries.length,
            loadedCount: importedCount,
            issueCount: 0
        });
    } catch (error) {
        console.error('CSV import failed:', error);
        showGateStatus(tFormat('csvImportFailed', { message: error.message }), true);
    } finally {
        // Dispose file reference immediately after parsing/importing.
        clearCsvInputSelection();
    }
}

function safeSendMessage(message) {
    try {
        chrome.runtime.sendMessage(message).catch(() => {});
    } catch (e) {
        // Ignore extension context errors
    }
}

function sendCommand(action, payload = {}) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action, ...payload }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(response || { ok: true });
        });
    });
}

function syncAccountUsageBeforeClose() {
    return;
}

window.addEventListener('pagehide', syncAccountUsageBeforeClose);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncAccountUsageBeforeClose();
});

// ── Reference Asset Logic ──────────────────────────────────────────────────

function sanitizeAssetLabel(label = '') {
    const value = String(label || '')
        .replace(/\b(?:accessibility_new|more_vert|check_circle|radio_button_unchecked|radio_button_checked|person_add|account_circle)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!value) return '';
    const lower = value.toLowerCase();
    const blockedLabels = new Set([
        'accessibility_new',
        'accessibility',
        'material symbols',
        'more_vert',
        'check',
        'done',
        'select',
        'selected',
        'close',
        'add',
        'image',
        'generated image',
        'character',
        'characters'
    ]);
    if (blockedLabels.has(lower)) return '';
    if (/^(?:accessibility|more|keyboard|chevron|arrow|add|check|close|delete|edit|image|photo|person|face)(?:_[a-z0-9]+){1,3}$/.test(lower)) return '';
    return value;
}

function normalizeReferenceSelection(raw) {
    if (!raw) return null;
    const id = (raw.id || '').toString().trim();
    const src = (raw.src || '').toString().trim();
    const label = sanitizeAssetLabel(raw.label || '');
    const sceneTag = (raw.sceneTag || '').toString().trim();
    const queuePrompt = (raw.queuePrompt || '').toString();
    const videoPrompt = (raw.videoPrompt || '').toString();
    if (!id && !src) return null;
    return { id: id || null, src: src || null, label: label || null, sceneTag: sceneTag || null, queuePrompt, videoPrompt };
}

function cloneReferenceSelection(raw) {
    const normalized = normalizeReferenceSelection(raw);
    return normalized ? { ...normalized } : null;
}

function cloneReferenceSelections(selections = []) {
    return dedupeReferenceSelections(selections)
        .map((selection) => cloneReferenceSelection(selection))
        .filter(Boolean);
}

function filterSelectionsToPool(selections = [], allowedPool = []) {
    const allowedKeys = new Set(cloneReferenceSelections(allowedPool).flatMap(getReferenceAssetKeys).filter(Boolean));
    if (!allowedKeys.size) return [];
    return cloneReferenceSelections(selections).filter((selection) => (
        getReferenceAssetKeys(selection).some((key) => allowedKeys.has(key))
    ));
}

function assetSelectionsMatchWholePool(selections = [], allowedPool = []) {
    const selectedKeys = new Set(cloneReferenceSelections(selections).map(getReferenceAssetKey).filter(Boolean));
    const allowedKeys = new Set(cloneReferenceSelections(allowedPool).map(getReferenceAssetKey).filter(Boolean));
    if (!selectedKeys.size || selectedKeys.size !== allowedKeys.size) return false;
    for (const key of allowedKeys) {
        if (!selectedKeys.has(key)) return false;
    }
    return true;
}

function getPerPromptReferenceSelections(item = {}, allowedPool = []) {
    const rawSelections = Array.isArray(item.referenceAssetSelections) ? item.referenceAssetSelections : [];
    const filtered = filterSelectionsToPool(rawSelections, allowedPool);
    const wasExplicitlyEdited = item.perPromptAssetsEdited === true || item.perPromptReferenceAssetsEdited === true;
    if (!wasExplicitlyEdited && assetSelectionsMatchWholePool(filtered, allowedPool)) {
        return [];
    }
    if (rawSelections.length > filtered.length && assetSelectionsMatchWholePool(filtered, allowedPool)) {
        return [];
    }
    return filtered;
}

function getQueueItemCharacterSelections(item = {}, allowedPool = []) {
    const source = Array.isArray(item.characterAssetSelections) && item.characterAssetSelections.length
        ? item.characterAssetSelections
        : (item.characterAssetSelection ? [item.characterAssetSelection] : []);
    return filterSelectionsToPool(source, allowedPool);
}

function getSelectedCharacterPool(settings = {}) {
    const multi = cloneReferenceSelections(settings.characterAssetSelections || []);
    if (multi.length) return multi;
    const single = cloneReferenceSelection(settings.characterAssetSelection || null);
    return single ? [single] : [];
}

function getQueueAssetPoolFromSettings(settings = {}, mode = 'image') {
    if (mode === 'character') {
        return getSelectedCharacterPool(settings);
    }
    if (mode === 'videoIngredient' || mode === 'videoStartFrame' || mode === 'videoEndFrame') {
        return cloneReferenceSelections(settings.videoAssetQueue || []);
    }
    return cloneReferenceSelections(settings.referenceAssetSelections || []);
}

function getReferenceAssetKey(raw) {
    return getReferenceAssetKeys(raw)[0] || '';
}

function getReferenceAssetKeys(raw) {
    const normalized = normalizeReferenceSelection(raw);
    if (!normalized) return [];
    const keys = [];
    const add = (value) => {
        const text = String(value || '').trim();
        if (text && !keys.includes(text)) keys.push(text);
    };
    add(normalized.id);
    add(normalized.assetName);
    add(normalized.title);
    add(normalized.label);
    (normalized.assetIdentityKeys || []).forEach(add);
    if (!normalized.src) return keys;
    add(normalized.src);
    try {
        const url = new URL(normalized.src, window.location.href);
        add(url.searchParams.get('name'));
        add(url.searchParams.get('assetId'));
        add(url.searchParams.get('id'));
        add(url.searchParams.get('mediaId'));
        add(url.searchParams.get('filename'));
    } catch {
        // Keep the raw src fallback above.
    }
    return keys;
}

function dedupeReferenceSelections(selections = []) {
    const out = [];
    const seen = new Set();
    selections.forEach((s) => {
        const n = normalizeReferenceSelection(s);
        if (!n) return;
        const key = getReferenceAssetKey(n);
        if (!key) return;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(n);
    });
    return out;
}

function sanitizeVideoAssetQueue(queue = [], availableAssets = []) {
    const availableByKey = new Map(
        dedupeReferenceSelections(availableAssets)
            .map((asset) => [getReferenceAssetKey(asset), asset])
            .filter(([key]) => !!key)
    );

    return dedupeReferenceSelections(queue)
        .map((item) => {
            const key = getReferenceAssetKey(item);
            const canonical = availableByKey.get(key);
            if (!canonical) return null;
            return {
                ...canonical,
                videoPrompt: item.videoPrompt || ''
            };
        })
        .filter(Boolean);
}

function getReferenceAssetDisplayName(asset, index = 0) {
    if (!asset) return `Image ${index + 1}`;
    const key = getReferenceAssetKey(asset);
    if (asset.label && !asset.label.endsWith('...')) return asset.label.slice(0, 60);
    return key ? `Image ${index + 1} (${key.slice(0, 8)}...)` : `Image ${index + 1}`;
}

function getCharacterDisplayName(asset, index = 0) {
    const label = sanitizeAssetLabel(asset?.label || '');
    if (label) return label.slice(0, 60);
    return tFormat('characterN', { count: index + 1 });
}

function getVideoPromptPreview(prompt = '', maxWords = 3) {
    const words = (prompt || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const preview = words.slice(0, maxWords).join(' ');
    return words.length > maxWords ? `${preview}...` : preview;
}

function getPromptPreviewAfterScene(prompt = '', maxWords = 3) {
    const stripped = String(prompt || '')
        .replace(/^\s*[A-Za-z][A-Za-z0-9 _-]*?\d{1,3}\s*:\s*/i, '')
        .trim();
    return getVideoPromptPreview(stripped, maxWords);
}

function getPromptPrefixRaw(prompt = '') {
    const value = String(prompt || '').trim();
    if (!value) return '';
    const colonIndex = value.indexOf(':');
    if (colonIndex === -1) return '';
    return value.slice(0, colonIndex).trim();
}

function getAssetLabelPreview(asset, maxWords = 10) {
    const label = (asset?.label || '').trim();
    if (!label) return '';
    if (/^[a-f0-9-]{8,}$/i.test(label)) return '';
    const normalized = label
        .replace(/^\s*(?:scene|image|img)\s*[-_ ]?\s*\d{1,3}\s*[:\-]?\s*/i, '')
        .trim();
    if (!normalized) return '';
    const words = normalized.split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const preview = words.slice(0, maxWords).join(' ');
    return words.length > maxWords ? `${preview}...` : preview;
}

function getAssetPromptLead(asset, maxChars = 10) {
    const label = (asset?.label || '').trim();
    if (!label) return '';
    if (/^[a-f0-9-]{8,}$/i.test(label)) return '';
    const normalized = label
        .replace(/^\s*(?:scene|image|img)\s*[-_ ]?\s*\d{1,3}\s*[:\-]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalized) return '';
    return normalized.length > maxChars ? `${normalized.slice(0, maxChars)}...` : normalized;
}

function getSceneTagDisplay(asset, fallbackIndex = null) {
    const explicit = (asset?.sceneTag || '').trim();
    if (explicit) return explicit;
    const label = (asset?.label || '').trim();
    const match = label.match(/\b(?:img\s*[-_ ]?\s*\d{1,3}|image\s*[-_ ]?\s*\d{1,3}|scene\s*[-_ ]?\s*\d{1,3})\b/i)
        || label.match(/\b(?:img|image|scene)\b\s*[:\-]?\s*(\d{1,3})\b/i);
    if (match) {
        if (match[1]) {
            const prefix = label.match(/\b(img|image|scene)\b/i)?.[1] || 'Scene';
            return `${prefix.replace(/^./, (c) => c.toUpperCase())} ${match[1]}`;
        }
        return match[0].replace(/\s+/g, ' ').replace(/\s*[-_]\s*/g, '-').trim();
    }
    if (fallbackIndex != null) {
        return `Scene ${String(fallbackIndex + 1).padStart(2, '0')}`;
    }
    return '';
}

function getShortAssetId(asset) {
    const key = getReferenceAssetKey(asset);
    return key ? key.slice(0, 12) : '';
}

function getVideoQueueSceneLabel(index = 0) {
    return `Video Scene ${index + 1}`;
}

function reindexVideoAssetQueue(items = []) {
    return dedupeReferenceSelections(items).map((item, index) => ({
        ...item,
        sceneTag: getVideoQueueSceneLabel(index)
    }));
}

function stripScenePrefix(text = '') {
    return String(text || '')
        .replace(/^\s*(?:scene|image|img)\s*[-_ ]?\s*\d{1,3}\s*[:\-]?\s*/i, '')
        .replace(/^\s*\d{1,3}\s*[:\-]\s*/i, '')
        .trim();
}

function enrichAssetsWithQueueSceneTags(assets = [], queueItems = []) {
    const promptByScene = new Map();
    queueItems.forEach((item) => {
        const prompt = (item?.prompt || '').trim();
        const sceneNumber = parseSequenceNumberFromText(prompt);
        if (!sceneNumber || promptByScene.has(sceneNumber)) return;
        promptByScene.set(sceneNumber, prompt);
    });

    return dedupeReferenceSelections(assets).map((asset) => {
        const sceneNumber = parseSequenceNumberFromText(`${asset?.sceneTag || ''}\n${asset?.label || ''}`);
        const sceneTag = (asset?.sceneTag || '').trim() || (sceneNumber ? `Scene ${String(sceneNumber).padStart(2, '0')}` : null);
        const queuePrompt = (asset?.queuePrompt || '').trim() || (sceneNumber ? (promptByScene.get(sceneNumber) || '') : '');
        return {
            ...asset,
            sceneTag: sceneTag || null,
            queuePrompt
        };
    });
}

function buildVideoPromptEditorValue(items = []) {
    const isVideo = lastUiSettings?.flowType === 'video';
    const isMultiline = isVideo && lastUiSettings?.videoMultilinePrompt === true;
    const delimiter = isMultiline ? '\n\n@@@NEXT@@@\n\n' : '\n\n';
    return items.map((item) => (item.videoPrompt || '').trim()).join(delimiter);
}

function applyVideoPromptEditorValue(value) {
    const lines = parsePromptSequences(value || '');
    referenceAssetPickerDraft = reindexVideoAssetQueue(referenceAssetPickerDraft).map((item, index) => ({
        ...item,
        videoPrompt: lines[index] || ''
    }));
}

function resetEditModalState() {
    currentlyEditingId = null;
    currentlyEditingVideoAssetKey = null;
    currentEditModalMode = 'single';
    if (labelEditPrompt) {
        labelEditPrompt.textContent = t('editPrompt');
    }
}

function openVideoPromptModal() {
    if (!referenceAssetPickerDraft.length) {
        showGateStatus(t('selectVideoAssetsFirst'), true);
        return;
    }
    if (videoPromptBatchInput) {
        videoPromptBatchInput.value = buildVideoPromptEditorValue(referenceAssetPickerDraft);
    }
    videoPromptBatchModal?.classList.remove('hidden');
    videoPromptBatchInput?.focus();
}

function closeVideoPromptModal() {
    videoPromptBatchModal?.classList.add('hidden');
}

async function saveVideoPromptModal() {
    applyVideoPromptEditorValue(videoPromptBatchInput?.value || '');
    const settings = await storage.getSettings();
    const nextQueue = reindexVideoAssetQueue(referenceAssetPickerDraft);
    referenceAssetPickerDraft = nextQueue;
    await storage.updateSettings({ videoAssetQueue: nextQueue });
    renderVideoAssetQueue(nextQueue);
    renderReferenceAssetPicker(settings.videoAvailableAssets || [], nextQueue, 'video');
    closeVideoPromptModal();
}

function createReferenceAssetCard(asset, index, { mode = 'available', onAdd = null, onRemove = null, onMoveUp = null, onMoveDown = null, onPromptChange = null, canMoveDown = true, actionText = null } = {}) {
    const card = document.createElement('div');
    const isVideoCard = referenceAssetPickerMode === 'video';
    const isCharacterCard = referenceAssetPickerMode === 'character';
    const isSelectedCard = mode === 'selected';
    const isSelectedVideoCard = isVideoCard && mode === 'selected';
    card.className = `asset-picker-card ${isSelectedCard ? 'selected-card' : 'available-card'} ${isVideoCard ? 'video-card' : ''} ${isCharacterCard ? 'character-card' : ''}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const labelPreview = getAssetLabelPreview(asset);
    const queuePromptPreview = getVideoPromptPreview(asset?.queuePrompt || '', 3);
    const promptTag = getPromptPrefixRaw(asset?.queuePrompt || '');
    const sceneTag = isSelectedVideoCard
        ? getVideoQueueSceneLabel(index)
        : (promptTag || getSceneTagDisplay(asset, isVideoCard && mode === 'selected' ? index : null));
    const shortAssetId = getShortAssetId(asset);

    const thumb = document.createElement('img');
    if (asset?.src) thumb.src = asset.src;
    thumb.alt = isCharacterCard ? getCharacterDisplayName(asset, index) : getReferenceAssetDisplayName(asset, index);

    const title = document.createElement('div');
    title.className = 'asset-picker-card-title';
    if (isSelectedVideoCard) {
        title.textContent = sceneTag;
    } else if (isVideoCard) {
        title.textContent = queuePromptPreview || t('promptNotFound');
    } else if (isCharacterCard) {
        title.textContent = getCharacterDisplayName(asset, index);
    } else {
        title.textContent = getReferenceAssetDisplayName(asset, index);
    }

    const meta = document.createElement('div');
    meta.className = 'asset-picker-card-meta';
    if (isVideoCard) {
        meta.textContent = isSelectedVideoCard
            ? (getVideoPromptPreview(asset?.videoPrompt || asset?.queuePrompt || '', 3) || t('promptNotFound'))
            : (shortAssetId || '');
    } else if (isCharacterCard) {
        meta.textContent = t('flowCharacter');
    } else {
        meta.textContent = mode === 'selected'
            ? tFormat('orderLabel', { count: index + 1 })
            : (asset?.id ? asset.id.slice(0, 12) : t('flowAsset'));
    }

    const actions = document.createElement('div');
    actions.className = 'asset-picker-card-actions';
    const actionLabel = document.createElement('span');
    actionLabel.className = 'asset-picker-card-marker';
    actionLabel.textContent = actionText || (mode === 'available' ? t('add') : t('remove'));
    actions.appendChild(actionLabel);

    const triggerCardAction = () => {
        if (mode === 'available') {
            onAdd?.(asset);
        } else {
            onRemove?.(asset);
        }
    };
    const cardLabel = title.textContent || thumb.alt || '';
    card.title = cardLabel;
    card.setAttribute('aria-label', `${mode === 'available' ? t('add') : t('remove')} ${cardLabel}`);
    card.addEventListener('click', triggerCardAction);
    card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        triggerCardAction();
    });

    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(actions);
    return card;
}

function updateReferenceAssetPickerChrome(mode = 'image') {
    const isVideo = mode === 'video';
    const isCharacter = mode === 'character';
    if (referenceAssetPickerModal) {
        referenceAssetPickerModal.dataset.pickerMode = mode;
    }
    if (referenceAssetPickerTitle) {
        referenceAssetPickerTitle.textContent = isVideo ? t('pickerVideoTitle') : (isCharacter ? t('pickerCharacterTitle') : t('pickerReferenceTitle'));
    }
    if (referenceAssetAvailableTitle) {
        referenceAssetAvailableTitle.textContent = isVideo ? t('pickerAvailableVideoAssets') : (isCharacter ? t('pickerAvailableCharacters') : t('pickerAvailableAssets'));
    }
    if (referenceAssetSelectedTitle) {
        referenceAssetSelectedTitle.textContent = isVideo ? t('pickerSelectedVideoAssets') : (isCharacter ? t('pickerSelectedCharacters') : t('pickerSelectedReferenceImages'));
    }
    if (referenceAssetPickerApplyBtn) {
        const lockedCharacterPicker = isCharacter && !canUsePerPromptAssets();
        referenceAssetPickerApplyBtn.textContent = lockedCharacterPicker
            ? t('premiumFeatureLocked')
            : (isVideo ? t('pickerSaveVideoQueue') : (isCharacter ? t('pickerUseCharacter') : t('pickerUseSelected')));
        referenceAssetPickerApplyBtn.disabled = lockedCharacterPicker;
        referenceAssetPickerApplyBtn.style.opacity = lockedCharacterPicker ? '0.55' : '';
        referenceAssetPickerApplyBtn.style.cursor = lockedCharacterPicker ? 'not-allowed' : '';
    }
    if (referenceAssetPickerLockBadge) {
        const showPremiumBadge = !isVideo && !canUsePerPromptAssets();
        referenceAssetPickerLockBadge.classList.toggle('hidden', !showPremiumBadge);
        referenceAssetPickerLockBadge.textContent = t('premiumFeatureLocked');
    }
    if (videoPromptModalBtn) {
        videoPromptModalBtn.style.display = isVideo ? '' : 'none';
    }
    if (videoAutoAddBtn) {
        videoAutoAddBtn.style.display = isVideo ? '' : 'none';
    }
    if (videoClearQueueBtn) {
        videoClearQueueBtn.style.display = 'none';
    }
}

function renderReferenceAssetPicker(assets = [], selected = [], mode = referenceAssetPickerMode) {
    if (!referenceAssetAvailableGrid || !referenceAssetSelectedGrid) return;
    updateReferenceAssetPickerChrome(mode);
    referenceAssetAvailableGrid.classList.remove('selected-list', 'available-list');
    referenceAssetSelectedGrid.classList.add('selected-list');
    if (mode === 'video') {
        referenceAssetAvailableGrid.classList.add('available-list');
    }

    const cleanSelected = dedupeReferenceSelections(selected);
    const selectedKeys = new Set(cleanSelected.map(getReferenceAssetKey).filter(Boolean));
    const available = (Array.isArray(assets) ? assets : []).filter((asset) => {
        const key = getReferenceAssetKey(asset);
        return key && !selectedKeys.has(key);
    });

    referenceAssetAvailableGrid.innerHTML = '';
    referenceAssetSelectedGrid.innerHTML = '';

    if (referenceAssetAvailableCount) {
        referenceAssetAvailableCount.textContent = `${available.length}`;
    }
    if (referenceAssetSelectedCount) {
        referenceAssetSelectedCount.textContent = `${cleanSelected.length}`;
    }
    if (referenceAssetPickerSummary) {
        if (mode === 'character' && !canUsePerPromptAssets()) {
            referenceAssetPickerSummary.textContent = t('characterPremiumRequiredHelp');
        } else if (mode === 'image' && !canUsePerPromptAssets()) {
            referenceAssetPickerSummary.textContent = t('premiumRequiredForMultipleReferences');
        } else if (mode === 'video') {
            referenceAssetPickerSummary.textContent = cleanSelected.length
                ? tFormat('pickerVideoSummarySelected', { count: cleanSelected.length })
                : t('pickerVideoSummaryEmpty');
        } else if (mode === 'character') {
            referenceAssetPickerSummary.textContent = cleanSelected.length
                ? tFormat('pickerCharacterSummarySelected', { count: cleanSelected.length })
                : t('pickerCharacterSummaryEmpty');
        } else {
            referenceAssetPickerSummary.textContent = cleanSelected.length
                ? tFormat('pickerReferenceSummarySelected', { count: cleanSelected.length })
                : t('pickerReferenceSummaryEmpty');
        }
    }
    if (available.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'asset-picker-empty';
        empty.textContent = t('pickerNoAssetsAvailable');
        referenceAssetAvailableGrid.appendChild(empty);
    } else {
        available.forEach((asset, index) => {
            const premiumActionRequired = mode === 'character'
                ? !canUsePerPromptAssets()
                : (mode === 'image' && !canUsePerPromptAssets());
            referenceAssetAvailableGrid.appendChild(createReferenceAssetCard(asset, index, {
                mode: 'available',
                actionText: premiumActionRequired ? t('premiumFeatureLocked') : null,
                onAdd: (target) => {
                    if (mode === 'video') {
                        referenceAssetPickerDraft = reindexVideoAssetQueue([...referenceAssetPickerDraft, target]);
                    } else if (mode === 'character') {
                        if (!canUsePerPromptAssets()) {
                            showPremiumAssetLimitMessage('character');
                            return;
                        }
                        referenceAssetPickerDraft = dedupeReferenceSelections([...referenceAssetPickerDraft, target]);
                    } else {
                        if (!canUsePerPromptAssets()) {
                            showPremiumAssetLimitMessage('image');
                            return;
                        }
                        referenceAssetPickerDraft = dedupeReferenceSelections([...referenceAssetPickerDraft, target]);
                    }
                    renderReferenceAssetPicker(assets, referenceAssetPickerDraft, mode);
                }
            }));
        });
    }

    if (cleanSelected.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'asset-picker-empty';
        empty.textContent = mode === 'video'
            ? t('pickerSelectedVideoEmpty')
            : (mode === 'character' ? t('pickerSelectedCharacterEmpty') : t('pickerSelectedReferenceEmpty'));
        referenceAssetSelectedGrid.appendChild(empty);
    } else {
        cleanSelected.forEach((asset, index) => {
            referenceAssetSelectedGrid.appendChild(createReferenceAssetCard(asset, index, {
                mode: 'selected',
                onRemove: (target) => {
                    const key = getReferenceAssetKey(target);
                    const filtered = referenceAssetPickerDraft.filter((item) => getReferenceAssetKey(item) !== key);
                    referenceAssetPickerDraft = mode === 'video'
                        ? reindexVideoAssetQueue(filtered)
                        : dedupeReferenceSelections(filtered);
                    renderReferenceAssetPicker(assets, referenceAssetPickerDraft, mode);
                }
            }));
        });
    }
}

async function openReferenceAssetPicker() {
    if (!requireSignedInForFeature()) return;
    queueAssetEditTarget = null;
    referenceAssetPickerMode = 'image';
    const flowTab = await findFlowProjectTab();
    if (!flowTab?.id) {
        showGateStatus(t('openProjectTabFirst'), true);
        return;
    }


    let settings = await storage.getSettings();
    const activeProjectId = extractProjectId(flowTab.url || '');
    const cachedProjectId = extractProjectId(settings.referenceAssetProjectUrl || '');
    const projectChanged = !!activeProjectId && activeProjectId !== cachedProjectId;

    if (projectChanged) {
        await storage.updateSettings({
            referenceAssets: [],
            referenceAssetSelections: [],
            referenceAssetId: null,
            referenceAssetSrc: null,
            referenceAssetProjectUrl: flowTab.url || null
        });
        referenceAssetPickerDraft = [];
        renderSelectedReferenceAssets([]);
        populateAssetDropdown([], []);
        settings = await storage.getSettings();
    }

    if (projectChanged || !Array.isArray(settings.referenceAssets) || settings.referenceAssets.length === 0) {
        await loadAssetsFromFlowTab();
        settings = await storage.getSettings();
    }
    referenceAssetPickerDraft = dedupeReferenceSelections(settings.referenceAssetSelections || []);
    renderReferenceAssetPicker(settings.referenceAssets || [], referenceAssetPickerDraft, 'image');
    referenceAssetPickerModal?.classList.remove('hidden');
}

async function openCharacterAssetPicker() {
    if (!requireSignedInForFeature()) return;
    queueAssetEditTarget = null;
    referenceAssetPickerMode = 'character';
    const flowTab = await findFlowProjectTab();
    if (!flowTab?.id) {
        showGateStatus(t('openProjectTabFirst'), true);
        return;
    }


    let settings = await storage.getSettings();
    const activeProjectId = extractProjectId(flowTab.url || '');
    const cachedProjectId = extractProjectId(settings.characterAssetProjectUrl || '');
    const projectChanged = !!activeProjectId && activeProjectId !== cachedProjectId;

    if (projectChanged) {
        await storage.updateSettings({
            characterAssets: [],
            characterAssetSelections: [],
            characterAssetSelection: null,
            characterAssetProjectUrl: flowTab.url || null
        });
        renderSelectedCharacterAsset([]);
        settings = await storage.getSettings();
    }

    const needsCharacterLoaderRefresh = settings.characterAssetLoadVersion !== 2;
    if (projectChanged || needsCharacterLoaderRefresh || !Array.isArray(settings.characterAssets) || settings.characterAssets.length === 0) {
        await loadCharacterAssetsFromFlowTab();
        settings = await storage.getSettings();
    }

    referenceAssetPickerDraft = getSelectedCharacterPool(settings);
    renderReferenceAssetPicker(settings.characterAssets || [], referenceAssetPickerDraft, 'character');
    referenceAssetPickerModal?.classList.remove('hidden');
}

async function openReferenceAssetFullPicker() {
    queueAssetEditTarget = null;
    const flowTab = await findFlowProjectTab();
    if (!flowTab?.id) {
        showGateStatus(t('openProjectTabFirst'), true);
        return;
    }

    referenceAssetPickerMode = 'video';

    let settings = await storage.getSettings();
    const activeProjectId = extractProjectId(flowTab.url || '');
    const cachedProjectId = extractProjectId(settings.videoAssetProjectUrl || '');
    const projectChanged = !!activeProjectId && activeProjectId !== cachedProjectId;

    if (projectChanged) {
        await storage.updateSettings({
            videoAvailableAssets: [],
            videoAssetQueue: [],
            videoAssetProjectUrl: flowTab.url || null
        });
        settings = await storage.getSettings();
    }

    if (projectChanged || !Array.isArray(settings.videoAvailableAssets) || settings.videoAvailableAssets.length === 0) {
        await loadVideoAssetsFromFlowTab();
        settings = await storage.getSettings();
    }

    referenceAssetPickerDraft = reindexVideoAssetQueue(settings.videoAssetQueue || []);
    renderReferenceAssetPicker(settings.videoAvailableAssets || [], referenceAssetPickerDraft, 'video');
    referenceAssetPickerModal?.classList.remove('hidden');
}

function closeReferenceAssetPicker() {
    queueAssetEditTarget = null;
    referenceAssetPickerModal?.classList.add('hidden');
}

async function openQueueItemAssetPicker(itemId, mode = 'image') {
    const queue = await storage.getQueue();
    const item = queue.find((entry) => entry.id === itemId);
    if (!item) return;

    const settings = await storage.getSettings();
    queueAssetEditTarget = { itemId, mode };
    referenceAssetPickerMode = mode === 'character' ? 'character' : mode;

    const allowedPool = getQueueAssetPoolFromSettings(settings, mode);
    if (!allowedPool.length) {
        queueAssetEditTarget = null;
        if (String(mode).startsWith('video')) {
            showGateStatus(t('videoSelectAssetsFirst'), true);
            return;
        }
        showGateStatus(
            referenceAssetPickerMode === 'character'
                ? t('queueSelectTopCharacterFirst')
                : t('queueSelectTopImagesFirst'),
            true
        );
        return;
    }

    await renderQueueAssetCustomPicker();
    queueAssetPickerModal?.classList.remove('hidden');
}

async function applyReferenceAssetPicker() {
    const next = referenceAssetPickerMode === 'video'
        ? reindexVideoAssetQueue(referenceAssetPickerDraft)
        : dedupeReferenceSelections(referenceAssetPickerDraft);
    const settings = await storage.getSettings();

    if (queueAssetEditTarget?.itemId) {
        const queue = await storage.getQueue();
        const idx = queue.findIndex((item) => item.id === queueAssetEditTarget.itemId);
        if (idx !== -1) {
            const allowedPool = getQueueAssetPoolFromSettings(settings, queueAssetEditTarget.mode);
            if (queueAssetEditTarget.mode === 'videoIngredient') {
                queue[idx] = {
                    ...queue[idx],
                    videoMode: FLOW_VIDEO_MODES.INGREDIENTS,
                    videoIngredientSelections: filterSelectionsToPool(next, allowedPool)
                };
            } else if (queueAssetEditTarget.mode === 'videoStartFrame') {
                const selected = filterSelectionsToPool(next, allowedPool)[0] || null;
                queue[idx] = {
                    ...queue[idx],
                    videoMode: FLOW_VIDEO_MODES.FRAMES,
                    videoStartFrameSelection: selected
                };
            } else if (queueAssetEditTarget.mode === 'videoEndFrame') {
                const capability = sanitizeVideoSettings({
                    videoModel: queue[idx].videoModel || settings.videoModel,
                    videoMode: FLOW_VIDEO_MODES.FRAMES,
                    videoDurationSeconds: queue[idx].videoDurationSeconds || settings.videoDurationSeconds,
                    videoEndFrameSelection: filterSelectionsToPool(next, allowedPool)[0] || null,
                    videoVoiceReference: queue[idx].videoVoiceReference,
                    prompt: queue[idx].prompt || ''
                });
                const selected = capability.allowEndFrame ? (filterSelectionsToPool(next, allowedPool)[0] || null) : null;
                if (!capability.allowEndFrame && next.length) {
                    showGateStatus(t('videoOmniEndFrameWarning'), true);
                }
                queue[idx] = {
                    ...queue[idx],
                    videoMode: FLOW_VIDEO_MODES.FRAMES,
                    videoEndFrameSelection: selected
                };
            } else if (queueAssetEditTarget.mode === 'character') {
                const filtered = canUsePerPromptAssets()
                    ? filterSelectionsToPool(next, allowedPool)
                    : [];
                if (!canUsePerPromptAssets() && next.length) {
                    showPremiumAssetLimitMessage('character');
                }
                queue[idx] = {
                    ...queue[idx],
                    characterAssetSelections: filtered,
                    characterAssetSelection: filtered[0] ? cloneReferenceSelection(filtered[0]) : null,
                    perPromptAssetsEdited: true,
                    perPromptCharacterAssetsEdited: true
                };
            } else {
                const filtered = filterSelectionsToPool(next, allowedPool);
                const limited = canUsePerPromptAssets() ? filtered : [];
                if (!canUsePerPromptAssets() && filtered.length) {
                    showPremiumAssetLimitMessage('image');
                }
                queue[idx] = {
                    ...queue[idx],
                    referenceAssetSelections: limited,
                    perPromptAssetsEdited: true,
                    perPromptReferenceAssetsEdited: true
                };
            }
            await storage.setQueue(queue);
        }
        queueAssetEditTarget = null;
        await refreshUI();
        closeReferenceAssetPicker();
        return;
    }

    if (referenceAssetPickerMode === 'video') {
        await storage.updateSettings({
            videoAssetQueue: next,
            videoAssetProjectUrl: settings.videoAssetProjectUrl || null
        });
        renderVideoAssetQueue(next);
    } else if (referenceAssetPickerMode === 'character') {
        const selectedCharacters = canUsePerPromptAssets() ? cloneReferenceSelections(next) : [];
        if (!canUsePerPromptAssets() && next.length) {
            showPremiumAssetLimitMessage('character');
        }
        const selectedCharacter = selectedCharacters[0] || null;
        await storage.updateSettings({
            characterAssetSelections: selectedCharacters,
            characterAssetSelection: selectedCharacter,
            characterAssetProjectUrl: settings.characterAssetProjectUrl || null
        });
        renderSelectedCharacterAsset(selectedCharacters);
    } else {
        const selectedReferences = canUsePerPromptAssets() ? next : [];
        if (!canUsePerPromptAssets() && next.length) {
            showPremiumAssetLimitMessage('image');
        }
        await storage.updateSettings({
            referenceAssetSelections: selectedReferences,
            referenceAssetId: null,
            referenceAssetSrc: null,
            referenceAssetProjectUrl: settings.referenceAssetProjectUrl || null
        });
        renderSelectedReferenceAssets(selectedReferences);
        populateAssetDropdown(settings.referenceAssets || [], selectedReferences);
        await checkReferenceAssetMismatch();
    }

    await refreshUI();
    closeReferenceAssetPicker();
}

async function removeSelectedCharacterAsset(selection) {
    const targetKey = getReferenceAssetKey(selection);
    if (!targetKey) return;
    const settings = await storage.getSettings();
    const current = getSelectedCharacterPool(settings);
    const next = current.filter((item) => getReferenceAssetKey(item) !== targetKey);
    await storage.updateSettings({
        characterAssetSelections: next,
        characterAssetSelection: next[0] || null
    });
    renderSelectedCharacterAsset(next);
    await refreshUI();
}

function renderSelectedCharacterAsset(selection = null) {
    if (!characterAssetSelectedList) return;
    const selectedList = Array.isArray(selection)
        ? cloneReferenceSelections(selection)
        : (normalizeReferenceSelection(selection) ? [normalizeReferenceSelection(selection)] : []);
    if (!selectedList.length) {
        characterAssetSelectedList.style.display = 'none';
        characterAssetSelectedList.innerHTML = '';
        if (resetCharacterAssetBtn) {
            resetCharacterAssetBtn.disabled = true;
            resetCharacterAssetBtn.style.opacity = '0.45';
        }
        return;
    }

    characterAssetSelectedList.style.display = 'block';
    characterAssetSelectedList.innerHTML = '';
    characterAssetSelectedList.className = 'selected-asset-strip';
    if (resetCharacterAssetBtn) {
        resetCharacterAssetBtn.disabled = false;
        resetCharacterAssetBtn.style.opacity = '';
    }

    selectedList.forEach((selected, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'selected-asset-thumb-card character';
        const displayName = getCharacterDisplayName(selected, index);
        card.title = displayName;
        card.setAttribute('aria-label', `${t('remove')} ${displayName}`);

        const thumb = document.createElement('img');
        if (selected.src) thumb.src = selected.src;
        thumb.alt = displayName;

        const removeMark = document.createElement('span');
        removeMark.className = 'selected-asset-remove-mark';
        removeMark.textContent = '×';

        card.addEventListener('click', async () => {
            await removeSelectedCharacterAsset(selected);
        });

        card.appendChild(thumb);
        card.appendChild(removeMark);
        characterAssetSelectedList.appendChild(card);
    });
}

function renderSelectedReferenceAssets(selections = []) {
    if (!referenceAssetSelectedList) return;
    const list = Array.isArray(selections) ? selections : [];
    if (list.length === 0) {
        referenceAssetSelectedList.style.display = 'none';
        referenceAssetSelectedList.innerHTML = '';
        if (resetReferenceAssetBtn) {
            resetReferenceAssetBtn.disabled = true;
            resetReferenceAssetBtn.style.opacity = '0.45';
        }
        return;
    }

    referenceAssetSelectedList.style.display = 'block';
    referenceAssetSelectedList.innerHTML = '';
    referenceAssetSelectedList.className = 'selected-asset-strip';
    if (resetReferenceAssetBtn) {
        resetReferenceAssetBtn.disabled = false;
        resetReferenceAssetBtn.style.opacity = '';
    }

    list.forEach((sel) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'selected-asset-thumb-card';
        const rawDisplay = sel.label || sel.id || t('pickerSelectedReferenceImages');
        card.title = rawDisplay;
        card.setAttribute('aria-label', `${t('remove')} ${rawDisplay}`);

        const thumb = document.createElement('img');
        if (sel.src) thumb.src = sel.src;
        thumb.alt = rawDisplay;

        const removeMark = document.createElement('span');
        removeMark.className = 'selected-asset-remove-mark';
        removeMark.textContent = '×';

        card.addEventListener('click', async () => {
            const settings = await storage.getSettings();
            const current = dedupeReferenceSelections(settings.referenceAssetSelections || []);
            const targetKey = getReferenceAssetKey(sel);
            const next = current.filter((x) => {
                return getReferenceAssetKey(x) !== targetKey;
            });
            await storage.updateSettings({
                referenceAssetSelections: next,
                // Multi-select is the source of truth now.
                referenceAssetId: null,
                referenceAssetSrc: null
            });
            renderSelectedReferenceAssets(next);
            if (referenceAssetWarning && next.length === 0) {
                referenceAssetWarning.style.display = 'none';
            }
            try {
                const refreshed = await storage.getSettings();
                populateAssetDropdown(refreshed.referenceAssets || [], refreshed.referenceAssetSelections || []);
                showGateStatus(tFormat('removedReferenceSelectedNow', { count: next.length }));
            } catch { }
            await refreshUI();
        });

        card.appendChild(thumb);
        card.appendChild(removeMark);
        referenceAssetSelectedList.appendChild(card);
    });
}

function renderVideoAssetQueue(items = []) {
    if (!videoAssetQueueList) return;
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) {
        videoAssetQueueList.style.display = 'none';
        videoAssetQueueList.innerHTML = '';
        return;
    }

    videoAssetQueueList.style.display = 'block';
    videoAssetQueueList.innerHTML = '';
    videoAssetQueueList.className = 'selected-asset-strip video-asset-strip';

    list.forEach((sel, idx) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'selected-asset-thumb-card video';
        const displayName = sel.label || sel.id || getVideoQueueSceneLabel(idx);
        card.title = displayName;
        card.setAttribute('aria-label', `${t('remove')} ${displayName}`);

        const thumb = document.createElement('img');
        if (sel.src) thumb.src = sel.src;
        thumb.alt = displayName;

        const removeMark = document.createElement('span');
        removeMark.className = 'selected-asset-remove-mark';
        removeMark.textContent = '×';

        card.addEventListener('click', async () => {
            const settings = await storage.getSettings();
            const current = dedupeReferenceSelections(settings.videoAssetQueue || []);
            const targetKey = getReferenceAssetKey(sel);
            const next = current.filter((item) => getReferenceAssetKey(item) !== targetKey);
            const nextQueue = reindexVideoAssetQueue(next);
            await storage.updateSettings({ videoAssetQueue: nextQueue });
            renderVideoAssetQueue(nextQueue);
        });

        card.appendChild(thumb);
        card.appendChild(removeMark);
        videoAssetQueueList.appendChild(card);
    });
}

function syncVideoOptionsUi(settings = {}) {
    const sanitized = sanitizeVideoSettings(settings);
    const model = sanitized.videoModel;
    if (videoOptionsPanel) videoOptionsPanel.classList.toggle('hidden', settings.flowType !== 'video');
    if (imageOptionsPanel) imageOptionsPanel.classList.toggle('hidden', settings.flowType === 'video');
    const supportedModes = getVideoCapabilities(model).modes || [];
    document.querySelectorAll('[data-video-mode]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.videoMode === sanitized.videoMode);
        const supported = supportedModes.includes(btn.dataset.videoMode);
        btn.disabled = !supported;
        btn.classList.toggle('mode-unsupported', !supported);
        btn.title = supported ? '' : t('videoModeUnsupportedByModel');
    });
    if (videoModelSelect) videoModelSelect.value = model;
    // Duration is only ever meaningful for Omni Flash (the only model with
    // more than one supported duration) — same rule already applied to the
    // per-prompt video controls in the queue list and Storyboard.
    const supportedDurations = getSupportedVideoDurations(model, sanitized.videoMode);
    const showDuration = model === FLOW_VIDEO_MODELS.OMNI_FLASH && supportedDurations.length > 1;
    if (videoDurationField) videoDurationField.classList.toggle('hidden', !showDuration);
    if (videoDurationBtns) {
        videoDurationBtns.innerHTML = '';
        if (showDuration) {
            supportedDurations.forEach((seconds) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `mode-btn ${sanitized.videoDurationSeconds === seconds ? 'active' : ''}`;
                btn.textContent = `${seconds}s`;
                btn.addEventListener('click', async () => {
                    await storage.updateSettings({ videoDurationSeconds: seconds });
                    await syncSettingWithPage('videoDurationSeconds', seconds, `${seconds}s`);
                    await refreshUI();
                });
                videoDurationBtns.appendChild(btn);
            });
        }
    }
    if (videoPerPromptModelToggle) videoPerPromptModelToggle.checked = settings.videoPerPromptModelEnabled === true;
    if (videoOmniEndFrameWarning) {
        videoOmniEndFrameWarning.classList.toggle('hidden', sanitized.allowEndFrame);
    }
    const currentRatio = settings.videoAspectRatio || '9:16';
    document.querySelectorAll('[data-video-ratio]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.videoRatio === currentRatio);
    });
    if (modelSelect) modelSelect.value = settings.flowModel || FLOW_MODELS.NANO_BANANA_PRO;
    document.querySelectorAll('[data-ratio]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.ratio === (settings.flowAspectRatio || '9:16'));
    });
    document.querySelectorAll('[data-qty]').forEach((btn) => {
        btn.classList.toggle('active', parseInt(btn.dataset.qty, 10) === (settings.flowQuantity || 1));
    });
}

function applyFlowTypeUi(flowType = 'image') {
    const isVideo = flowType === 'video';
    if (characterAssetSection) characterAssetSection.style.display = isVideo ? 'none' : '';
    if (referenceAssetSection) referenceAssetSection.style.display = isVideo ? 'none' : '';
    if (promptQueueCard) promptQueueCard.style.display = '';
    // Auto @mention resolves references from the image reference/character
    // library — video's per-prompt asset selection (Ingredients/Frames) is a
    // separate, unrelated mechanism, so this toggle only makes sense in image
    // mode. It's also a Professional-only feature.
    if (autoMentionRow) autoMentionRow.style.display = (isVideo || !hasProfessionalTierAccess()) ? 'none' : '';
    if (videoMultilinePromptRow) videoMultilinePromptRow.style.display = (isVideo && hasProfessionalTierAccess()) ? '' : 'none';
    if (videoAssetQueueSection) videoAssetQueueSection.style.display = isVideo ? '' : 'none';
    if (waitForImageResponse?.closest('.config-card')) {
        waitForImageResponse.closest('.config-card').style.display = isVideo ? 'none' : '';
    }
    if (videoOptionsPanel) videoOptionsPanel.classList.toggle('hidden', !isVideo);
    if (imageOptionsPanel) imageOptionsPanel.classList.toggle('hidden', isVideo);
    if (videoDryRunBtn) videoDryRunBtn.classList.add('hidden');
}

async function runVideoDryRun() {
    const settings = await storage.getSettings();
    const queue = sanitizeVideoAssetQueue(settings.videoAssetQueue || [], settings.videoAvailableAssets || []);
    if (queue.length !== dedupeReferenceSelections(settings.videoAssetQueue || []).length) {
        await storage.updateSettings({ videoAssetQueue: queue });
        renderVideoAssetQueue(queue);
    }
    if (!queue.length) {
        showGateStatus(t('reloadAssetsReselectVideoStart'), true);
        return;
    }
    const target = queue[0];
    const prompt = (target.videoPrompt || '').trim();
    if (!prompt) {
        showGateStatus(t('setVideoPromptScene01'), true);
        return;
    }

    const flowTab = await findFlowProjectTab();
    if (!flowTab?.id) {
        showGateStatus(t('openFlowProjectTabFirst'), true);
        return;
    }

    const payload = {
        action: 'VIDEO_DRY_RUN',
        payload: {
            itemId: `video_dry_run_${Date.now()}`,
            prompt,
            videoStartImage: target.videoStartImage || null,
            settings: { ...settings, flowType: 'video', syncFlowSettings: true, videoAssetQueue: queue, dryRunVideoSetup: true },
            selectors: SELECTORS[SUPPORTED_SERVICES.FLOW]
        }
    };

    safeSendMessage({ action: 'FORCE_REINJECT' });
    await new Promise((resolve) => setTimeout(resolve, 700));

    const trySendDryRun = () => new Promise((resolve) => {
        chrome.tabs.sendMessage(flowTab.id, payload, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve({ ok: !!response?.success, response, error: response?.error || null });
        });
    });

    let result = await trySendDryRun();
    if (!result.ok && /establish connection/i.test(result.error || '')) {
        safeSendMessage({ action: 'FORCE_REINJECT' });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        result = await trySendDryRun();
    }

    if (result.ok && result.response?.success) {
        showGateStatus(t('dryRunComplete'));
        return;
    }
    showGateStatus(
        tFormat('dryRunFailed', { message: result.error || result.response?.error || 'No response from Flow tab.' }),
        true
    );
}

async function autoAddVideoAssetsByScene() {
    let settings = await storage.getSettings();
    let availableAssets = dedupeReferenceSelections(settings.videoAvailableAssets || []);

    if (!availableAssets.length) {
        await loadVideoAssetsFromFlowTab();
        settings = await storage.getSettings();
        availableAssets = dedupeReferenceSelections(settings.videoAvailableAssets || []);
    }

    if (!availableAssets.length) {
        showGateStatus(t('reloadVideoAssetsFirst'), true);
        return;
    }

    const queueItems = await storage.getQueue();
    const promptByScene = new Map();
    queueItems.forEach((item) => {
        const scene = parseSequenceNumberFromText(item?.prompt || '');
        if (!scene || promptByScene.has(scene)) return;
        promptByScene.set(scene, (item?.prompt || '').trim());
    });

    const matchedAssets = availableAssets
        .map((asset) => ({
            ...asset,
            sceneNumber: parseSequenceNumberFromText(`${asset.sceneTag || ''}\n${asset.label || ''}`)
        }))
        .filter((asset) => asset.sceneNumber != null)
        .sort((a, b) => a.sceneNumber - b.sceneNumber)
        .map((asset) => ({
            id: asset.id || null,
            src: asset.src || null,
            label: asset.label || null,
            sceneTag: asset.sceneTag || null,
            videoPrompt: promptByScene.get(asset.sceneNumber) || asset.videoPrompt || ''
        }));

    if (!matchedAssets.length) {
        showGateStatus(t('noSceneAssetsFound'), true);
        return;
    }

    const nextQueue = reindexVideoAssetQueue(matchedAssets);
    await storage.updateSettings({ videoAssetQueue: nextQueue });
    renderVideoAssetQueue(nextQueue);

    if (referenceAssetPickerMode === 'video' && referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
        referenceAssetPickerDraft = nextQueue;
        renderReferenceAssetPicker(availableAssets, nextQueue, 'video');
    }

    showGateStatus(tFormat('autoAddedVideoAssets', { count: nextQueue.length }));
}

async function migrateLegacyReferenceAssetIfNeeded(settings) {
    const legacyId = settings?.referenceAssetId || null;
    const legacySrc = settings?.referenceAssetSrc || null;
    const current = dedupeReferenceSelections(settings?.referenceAssetSelections || []);
    if ((legacyId || legacySrc) && current.length === 0) {
        const migrated = dedupeReferenceSelections([{ id: legacyId, src: legacySrc, label: null }]);
        await storage.updateSettings({ referenceAssetSelections: migrated });
        return { ...settings, referenceAssetSelections: migrated };
    }
    return settings;
}

async function loadAssetsFromFlowTab() {
    // Guard: require a Flow project tab to be open
    const flowTab = await findFlowProjectTab();
    if (!flowTab) {
        showGateStatus(t('openFlowProjectTabWithPath'), true);
        return;
    }

    const currentSettings = await storage.getSettings();
    const previousReferenceSelections = cloneReferenceSelections(currentSettings.referenceAssetSelections || []);
    const activeProjectId = extractProjectId(flowTab.url || '');
    const cachedProjectId = extractProjectId(currentSettings.referenceAssetProjectUrl || '');
    const projectChanged = !!activeProjectId && activeProjectId !== cachedProjectId;

    await storage.updateSettings({
        referenceAssets: [],
        referenceAssetProjectUrl: flowTab.url || currentSettings.referenceAssetProjectUrl || null
    });
    referenceAssetPickerDraft = previousReferenceSelections;
    renderSelectedReferenceAssets(previousReferenceSelections);
    populateAssetDropdown([], []);
    if (referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
        renderReferenceAssetPicker([], previousReferenceSelections, 'image');
    }

    if (loadAssetsBtn) {
        loadAssetsBtn.textContent = t('loading');
        loadAssetsBtn.disabled = true;
    }
    if (referenceAssetPickerReloadBtn) {
        referenceAssetPickerReloadBtn.textContent = t('reloading');
        referenceAssetPickerReloadBtn.disabled = true;
    }
    try {
        // Ask service-worker to do the scripting (popup lacks scripting permission in all contexts)
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'LOAD_FLOW_REFERENCE_ASSETS', tabId: flowTab.id }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res || { ok: false, error: 'No response' });
                }
            });
        });

        if (!response.ok) {
            showGateStatus(response.error || t('failedToLoadAssets'), true);
            return;
        }

        const assets = response.assets || [];
        if (assets.length === 0) {
            showGateStatus(t('noAssetsFoundOpenAddMedia'), true);
            return;
        }

        // Preserve user-named generated images (Save as → id "gen_…") so a library
        // re-scan does not wipe out @mention-able names.
        const prevSettings = await storage.getSettings();
        const savedGeneratedAssets = (Array.isArray(prevSettings.referenceAssets) ? prevSettings.referenceAssets : [])
            .filter(a => String(a?.id || '').startsWith('gen_') && String(a?.label || '').trim());

        // Deduplicate by canonical asset key (saved named assets take priority).
        const seen = new Set();
        const uniqueAssets = [...savedGeneratedAssets, ...assets].filter(a => {
            const key = getReferenceAssetKey(a);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Reset the legacy single-select preview; multi-selection is preserved below.
        if (referenceAssetSelect) {
            referenceAssetSelect.value = '';
            updateAssetPreview();
        }

        const preservedSelections = projectChanged ? [] : filterSelectionsToPool(previousReferenceSelections, uniqueAssets);
        const primarySelection = preservedSelections[0] || null;
        populateAssetDropdown(uniqueAssets, preservedSelections);
        await storage.updateSettings({ 
            referenceAssets: uniqueAssets, 
            referenceAssetSelections: preservedSelections,
            referenceAssetId: primarySelection?.id || null,
            referenceAssetSrc: primarySelection?.src || null,
            referenceAssetProjectUrl: response.tabUrl || null 
        });
        referenceAssetPickerDraft = preservedSelections;
        renderSelectedReferenceAssets(preservedSelections);
        populateAssetDropdown(uniqueAssets, preservedSelections);
        if (referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
            renderReferenceAssetPicker(uniqueAssets, preservedSelections, 'image');
        }
        await checkReferenceAssetMismatch();
        showGateStatus(tFormat('loadedFreshAssetsCleared', { count: assets.length }));
    } catch (e) {
        console.error('loadAssetsFromFlowTab error:', e);
        showGateStatus(tFormat('failedToLoadAssetsWithError', { message: e.message }), true);
    } finally {
        if (loadAssetsBtn) {
            loadAssetsBtn.textContent = t('loadFromFlow');
            loadAssetsBtn.disabled = false;
        }
        if (referenceAssetPickerReloadBtn) {
            referenceAssetPickerReloadBtn.textContent = t('reloadAssets');
            referenceAssetPickerReloadBtn.disabled = false;
        }
    }
}

async function loadCharacterAssetsFromFlowTab() {
    const flowTab = await findFlowProjectTab();
    if (!flowTab) {
        showGateStatus(t('openFlowProjectTabWithPath'), true);
        return;
    }

    if (referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
        const currentSettings = await storage.getSettings();
        renderReferenceAssetPicker(currentSettings.characterAssets || [], getSelectedCharacterPool(currentSettings), 'character');
    }

    if (referenceAssetPickerReloadBtn) {
        referenceAssetPickerReloadBtn.textContent = t('reloading');
        referenceAssetPickerReloadBtn.disabled = true;
    }

    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'LOAD_FLOW_CHARACTER_ASSETS', tabId: flowTab.id }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res || { ok: false, error: 'No response' });
                }
            });
        });

        if (!response.ok) {
            showGateStatus(response.error || t('failedToLoadCharacters'), true);
            return;
        }

        const seen = new Set();
        const uniqueCharacters = (Array.isArray(response.assets) ? response.assets : []).filter((asset) => {
            const key = getReferenceAssetKey(asset);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        if (uniqueCharacters.length === 0) {
            showGateStatus(t('noCharactersFoundCreateFirst'), true);
            return;
        }

        const currentSettings = await storage.getSettings();
        const previousSelections = getSelectedCharacterPool(currentSettings);
        const preservedSelections = filterSelectionsToPool(previousSelections, uniqueCharacters);

        await storage.updateSettings({
            characterAssets: uniqueCharacters,
            characterAssetSelections: preservedSelections,
            characterAssetSelection: preservedSelections[0] || null,
            characterAssetProjectUrl: response.tabUrl || flowTab.url || null,
            characterAssetLoadVersion: 2
        });
        referenceAssetPickerDraft = preservedSelections;
        renderSelectedCharacterAsset(preservedSelections);
        renderReferenceAssetPicker(uniqueCharacters, referenceAssetPickerDraft, 'character');
        showGateStatus(tFormat('loadedCharacters', { count: uniqueCharacters.length }));
    } catch (e) {
        console.error('loadCharacterAssetsFromFlowTab error:', e);
        showGateStatus(tFormat('failedToLoadCharactersWithError', { message: e.message }), true);
    } finally {
        if (referenceAssetPickerReloadBtn) {
            referenceAssetPickerReloadBtn.textContent = t('reloadAssets');
            referenceAssetPickerReloadBtn.disabled = false;
        }
    }
}

async function loadVideoAssetsFromFlowTab() {
    const flowTab = await findFlowProjectTab();
    if (!flowTab) {
        showGateStatus(t('openFlowProjectTabWithPath'), true);
        return;
    }


    const currentSettings = await storage.getSettings();
    const activeProjectId = extractProjectId(flowTab.url || '');
    const cachedProjectId = extractProjectId(currentSettings.videoAssetProjectUrl || '');
    const projectChanged = !!activeProjectId && activeProjectId !== cachedProjectId;

    await storage.updateSettings({
        videoAvailableAssets: [],
        videoAssetQueue: [],
        videoAssetProjectUrl: flowTab.url || currentSettings.videoAssetProjectUrl || null
    });
    referenceAssetPickerDraft = [];
    renderVideoAssetQueue([]);
    if (referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
        renderReferenceAssetPicker([], [], 'video');
    }

    if (referenceAssetPickerReloadBtn) {
        referenceAssetPickerReloadBtn.textContent = t('reloading');
        referenceAssetPickerReloadBtn.disabled = true;
    }

    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'LOAD_FLOW_REFERENCE_ASSETS', tabId: flowTab.id }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res || { ok: false, error: 'No response' });
                }
            });
        });

        if (!response.ok) {
            showGateStatus(response.error || t('failedToLoadVideoAssets'), true);
            return;
        }

        const assets = Array.isArray(response.assets) ? response.assets : [];
        const seen = new Set();
        const dedupedAssets = assets.filter((asset) => {
            const key = getReferenceAssetKey(asset);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const queueItems = await storage.getQueue();
        const uniqueAssets = enrichAssetsWithQueueSceneTags(dedupedAssets, queueItems);

        const latestSettings = await storage.getSettings();
        const nextQueue = reindexVideoAssetQueue(sanitizeVideoAssetQueue(
            referenceAssetPickerDraft.length ? referenceAssetPickerDraft : (latestSettings.videoAssetQueue || []),
            uniqueAssets
        ));

        await storage.updateSettings({
            videoAvailableAssets: uniqueAssets,
            videoAssetQueue: nextQueue,
            videoAssetProjectUrl: response.tabUrl || null
        });

        referenceAssetPickerDraft = nextQueue;
        renderVideoAssetQueue(nextQueue);
        if (referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
            renderReferenceAssetPicker(uniqueAssets, nextQueue, 'video');
        }
        showGateStatus(tFormat('loadedVideoAssets', { count: uniqueAssets.length }));
    } catch (e) {
        console.error('loadVideoAssetsFromFlowTab error:', e);
        showGateStatus(tFormat('failedToLoadVideoAssetsWithError', { message: e.message }), true);
    } finally {
        if (referenceAssetPickerReloadBtn) {
            referenceAssetPickerReloadBtn.textContent = t('reloadAssets');
            referenceAssetPickerReloadBtn.disabled = false;
        }
    }
}

function populateAssetDropdown(assets, selectedRefs = []) {
    if (!referenceAssetSelect) return;
    const currentVal = referenceAssetSelect.value;
    referenceAssetSelect.innerHTML = '<option value="">None (no reference image)</option>';
    // Deduplicate by id
    const seen = new Set();
    const unique = assets.filter(a => {
        const key = getReferenceAssetKey(a);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const selectedKeys = new Set(
        dedupeReferenceSelections(selectedRefs)
            .map(r => getReferenceAssetKey(r))
            .filter(Boolean)
    );

    unique.forEach((asset, i) => {
        const assetKey = getReferenceAssetKey(asset);
        if (!assetKey || selectedKeys.has(assetKey)) return;
        const opt = document.createElement('option');
        opt.value = assetKey;
        const displayName = asset.label && !asset.label.endsWith('...')
            ? asset.label.slice(0, 50)
            : `Image ${i + 1} (${assetKey.slice(0, 8)}...)`;
        opt.textContent = displayName;
        opt.dataset.src = asset.src;
        opt.dataset.assetId = asset.id || assetKey;
        referenceAssetSelect.appendChild(opt);
    });
    // Restore previous selection if still valid
    if (currentVal && Array.from(referenceAssetSelect.options).some(o => o.value === currentVal)) {
        referenceAssetSelect.value = currentVal;
    } else {
        referenceAssetSelect.value = '';
    }
    updateAssetPreview();
}

function updateAssetPreview() {
    if (!referenceAssetSelect || !referenceAssetPreview) return;
    const selected = referenceAssetSelect.options[referenceAssetSelect.selectedIndex];
    if (!selected || !selected.value) {
        referenceAssetPreview.style.display = 'none';
        return;
    }
    const src = selected.dataset?.src || '';
    if (src && referenceAssetImg) {
        referenceAssetImg.src = src;
        referenceAssetPreview.style.display = 'flex';
        referenceAssetPreview.style.alignItems = 'center';
    }
    if (referenceAssetName) {
        referenceAssetName.textContent = selected.textContent;
    }
}

async function saveReferenceAssetSetting() {
    if (!referenceAssetSelect) return;
    const selectedId = referenceAssetSelect.value || '';
    const selectedOpt = referenceAssetSelect.options[referenceAssetSelect.selectedIndex];
    const selectedSrc = selectedOpt?.dataset?.src || null;
    console.log('[ReferenceAsset] Saving:', selectedId, selectedSrc?.slice(0, 60));
    await storage.updateSettings({
        referenceAssetId: selectedId || null,
        referenceAssetSrc: selectedSrc || null
    });
}

async function addSelectedReferenceAsset() {
    if (!canUsePerPromptAssets()) {
        showPremiumAssetLimitMessage('image');
        return;
    }
    if (!referenceAssetSelect) return;
    const selectedOpt = referenceAssetSelect.options[referenceAssetSelect.selectedIndex];
    const selectedId = selectedOpt?.dataset?.assetId || referenceAssetSelect.value || '';
    const selectedSrc = selectedOpt?.dataset?.src || null;
    const selectedLabel = (selectedOpt?.textContent || '').trim();

    if (!selectedId && !selectedSrc) return;

    const settings = await storage.getSettings();
    const current = dedupeReferenceSelections(settings.referenceAssetSelections || []);
    const next = dedupeReferenceSelections([
        ...current,
        { id: selectedId || null, src: selectedSrc || null, label: selectedLabel || null }
    ]);

    await storage.updateSettings({
        referenceAssetSelections: next,
        // Clear legacy single-select fields so queue execution only uses multi-select state.
        referenceAssetId: null,
        referenceAssetSrc: null,
        // Keep project URL if we have one (used by older mismatch logic / debugging).
        referenceAssetProjectUrl: settings.referenceAssetProjectUrl || null
    });
    await checkReferenceAssetMismatch();
    // Hide newly-added asset from dropdown immediately.
    populateAssetDropdown(settings.referenceAssets || [], next);
    await refreshUI();
}

function extractProjectId(url) {
    const match = url?.match(/\/project\/([^/?#]+)/i);
    return match ? match[1] : null;
}

function parseSequenceNumberFromText(text = '') {
    const firstLine = (text || '')
        .split('\n')
        .map((line) => line.trim())
        .find(Boolean) || '';
    const normalized = firstLine.replace(/\s+/g, ' ').trim();
    const match = normalized.match(/^\s*(?:scene|image|img)\s*[-_ ]?(\d{1,3})(?:\s*[:.\-_)])?/i)
        || normalized.match(/^\s*(\d{1,3})\s*[:.\-_)]/i)
        || normalized.match(/\b(?:scene|image|img)\s*[-_ ]?(\d{1,3})\b/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    return Number.isFinite(value) && value > 0 ? value : null;
}

function isFlowProjectTabUrl(url = '') {
    return (url.includes('labs.google/fx') || url.includes('flow.google') || url.includes('google.com/labs/flow'))
        && /\/project\//i.test(url);
}

async function findFlowProjectTab() {
    const focusedTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const activeProjectTab = focusedTabs.find(t => t.url && isFlowProjectTabUrl(t.url));
    if (!activeProjectTab) return null;

    await chrome.storage.local.set({ last_flow_project_url: activeProjectTab.url });
    return activeProjectTab;
}

async function requireActiveFlowProjectForPrompts() {
    const projectTab = await findFlowProjectTab();
    if (projectTab) return true;
    showGateStatus(t('runInsideProjectRequired'), true);
    return false;
}

async function checkReferenceAssetMismatch() {
    if (!referenceAssetWarning || !resetReferenceAssetBtn) {
        return { hasSelections: false, missing: [] };
    }

    const settings = await storage.getSettings();
    const selections = dedupeReferenceSelections(settings.referenceAssetSelections || []);
    const hasSelections = selections.length > 0;

    // Reset should be available whenever something is selected.
    resetReferenceAssetBtn.disabled = !hasSelections;
    resetReferenceAssetBtn.style.opacity = hasSelections ? '1' : '0.45';

    if (!hasSelections) {
        referenceAssetWarning.style.display = 'none';
        return { hasSelections: false, missing: [] };
    }

    // Validate the selected items are present in the currently loaded asset list.
    const available = Array.isArray(settings.referenceAssets) ? settings.referenceAssets : [];
    const availableIds = new Set(available.map(a => getReferenceAssetKey(a)).filter(Boolean));

    const missing = selections.filter(sel => {
        const key = getReferenceAssetKey(sel);
        return key && !availableIds.has(key);
    });
    if (missing.length > 0) {
        const missingLabels = missing
            .map((sel) => sel.label || (getReferenceAssetKey(sel) || '').slice(0, 8))
            .filter(Boolean)
            .slice(0, 4)
            .join(', ');
        referenceAssetWarning.style.display = 'block';
        referenceAssetWarning.textContent = `⚠ Missing reference image(s): ${missingLabels}${missing.length > 4 ? ', ...' : ''}. They will not be imported. Click Reset to clear.`;
        return { hasSelections: true, missing };
    }

    referenceAssetWarning.style.display = 'none';
    return { hasSelections: true, missing: [] };
}

async function resetReferenceAsset() {
    const flowTab = await findFlowProjectTab();
    if (!flowTab) {
        showGateStatus(t('buttonsOnlyInFlowProject'), true);
        return;
    }
    if (referenceAssetSelect) {
        referenceAssetSelect.value = '';
        updateAssetPreview();
    }
    await storage.updateSettings({
        referenceAssetSelections: [],
        referenceAssetId: null,
        referenceAssetSrc: null,
        referenceAssetProjectUrl: null
    });
    if (referenceAssetWarning) referenceAssetWarning.style.display = 'none';
    if (resetReferenceAssetBtn) {
        resetReferenceAssetBtn.disabled = true;
        resetReferenceAssetBtn.style.opacity = '0.45';
    }
    renderSelectedReferenceAssets([]);
    const refreshed = await storage.getSettings();
    populateAssetDropdown(refreshed.referenceAssets || [], refreshed.referenceAssetSelections || []);
}

async function resetCharacterAsset() {
    await storage.updateSettings({
        characterAssetSelections: [],
        characterAssetSelection: null,
        characterAssetProjectUrl: null
    });
    renderSelectedCharacterAsset([]);
    if (referenceAssetPickerMode === 'character') {
        const settings = await storage.getSettings();
        referenceAssetPickerDraft = [];
        renderReferenceAssetPicker(settings.characterAssets || [], [], 'character');
    }
    await refreshUI();
}

async function initReferenceAsset() {
    const settings = await storage.getSettings();
    const migratedSettings = await migrateLegacyReferenceAssetIfNeeded(settings);
    // Deduplicate saved assets on load
    let assets = migratedSettings.referenceAssets || [];
    const seen = new Set();
    assets = assets.filter(a => {
        const key = getReferenceAssetKey(a);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    if (assets.length !== (migratedSettings.referenceAssets?.length || 0)) {
        await storage.updateSettings({ referenceAssets: assets });
    }
    if (assets.length) {
        populateAssetDropdown(assets, migratedSettings.referenceAssetSelections || []);
    }

    // Render selected reference list
    renderSelectedCharacterAsset(getSelectedCharacterPool(migratedSettings));
    renderSelectedReferenceAssets(dedupeReferenceSelections(migratedSettings.referenceAssetSelections || []));

    updateAssetPreview();
    // Event listeners
    if (loadAssetsBtn) {
        loadAssetsBtn.addEventListener('click', loadAssetsFromFlowTab);
    }
    if (addReferenceAssetBtn) {
        addReferenceAssetBtn.addEventListener('click', addSelectedReferenceAsset);
    }
    if (openReferenceAssetPickerBtn) {
        openReferenceAssetPickerBtn.addEventListener('click', openReferenceAssetPicker);
    }
    if (openCharacterAssetPickerBtn) {
        openCharacterAssetPickerBtn.addEventListener('click', openCharacterAssetPicker);
    }
    if (resetCharacterAssetBtn) {
        resetCharacterAssetBtn.addEventListener('click', resetCharacterAsset);
    }
    if (openReferenceAssetFullPickerBtn) {
        openReferenceAssetFullPickerBtn.addEventListener('click', openReferenceAssetFullPicker);
    }
    if (referenceAssetSelect) {
        referenceAssetSelect.addEventListener('change', async () => {
            updateAssetPreview();
        });
    }
    if (resetReferenceAssetBtn) {
        resetReferenceAssetBtn.addEventListener('click', resetReferenceAsset);
    }
    if (referenceAssetPickerReloadBtn) {
        referenceAssetPickerReloadBtn.addEventListener('click', async () => {
            if (referenceAssetPickerMode === 'video') {
                await loadVideoAssetsFromFlowTab();
            } else if (referenceAssetPickerMode === 'character') {
                await loadCharacterAssetsFromFlowTab();
            } else {
                await loadAssetsFromFlowTab();
            }
        });
    }
    if (referenceAssetPickerCancelBtn) {
        referenceAssetPickerCancelBtn.addEventListener('click', closeReferenceAssetPicker);
    }
    if (referenceAssetPickerApplyBtn) {
        referenceAssetPickerApplyBtn.addEventListener('click', applyReferenceAssetPicker);
    }
    if (queueAssetPickerCloseBtn) {
        queueAssetPickerCloseBtn.addEventListener('click', closeQueueAssetCustomPicker);
    }
    if (queueAssetPickerModal) {
        queueAssetPickerModal.addEventListener('click', (event) => {
            if (event.target === queueAssetPickerModal) {
                closeQueueAssetCustomPicker();
            }
        });
    }
    if (referenceAssetPickerModal) {
        referenceAssetPickerModal.addEventListener('click', (event) => {
            if (event.target === referenceAssetPickerModal) {
                closeReferenceAssetPicker();
            }
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && queueAssetPickerModal && !queueAssetPickerModal.classList.contains('hidden')) {
            closeQueueAssetCustomPicker();
            return;
        }
        if (event.key === 'Escape' && referenceAssetPickerModal && !referenceAssetPickerModal.classList.contains('hidden')) {
            closeReferenceAssetPicker();
        }
    });
    // Check on init and whenever the panel becomes visible
    await checkReferenceAssetMismatch();
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) checkReferenceAssetMismatch();
    });
    // Re-check whenever the user switches tabs or navigates within a tab
    chrome.tabs.onActivated.addListener(() => checkReferenceAssetMismatch());
    chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
        if (changeInfo.url) checkReferenceAssetMismatch();
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes.flow_automator_settings?.newValue) return;
        const nextSettings = changes.flow_automator_settings.newValue;
    });
}

init();
