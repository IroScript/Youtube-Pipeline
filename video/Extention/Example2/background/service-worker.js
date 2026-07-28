/**
 * Flow Prompt Automator - Background Service Worker
 * Manages the queue and orchestrates automation for Google Flow.
 */

import { storage } from '../shared/storage.js';
import { AUTOMATOR_STATE, QUEUE_STATUS, SUPPORTED_SERVICES, SERVICE_CONFIGS, createQueueItem, FLOW_VIDEO_MODELS, sanitizeVideoSettings, autoBindAssetsByPromptMentions } from '../shared/model.js';
import { SELECTORS } from '../shared/selectors.js';
import { firebaseConfig } from '../shared/firebase-config.js';
import {
    getUnusualActivityFailureTransition,
    UNUSUAL_ACTIVITY_POST_RELOAD_WAIT_MS,
    shouldPauseOnInitialWorkerSession
} from '../shared/queue-run-policy.js';

let isLooping = false;
const activeQueueItems = new Map(); // item.id → { item, startedAt }
const pendingResolves = new Map();
const activeHandshakes = new Set();
const activeTabToItem = new Map(); // tabId -> itemId
const executingItemIds = new Set(); // item.id -> true (in-memory lock)
const PROMPT_GENERATION_TIMEOUT_MS = 600000; // 10 minutes maximum generation timeout
const sessionSeenImages = new Set();
const SESSION_SEEN_MAX = 2000;
const SESSION_SEEN_TRIM = 500;
let lastPromptStartAt = 0;
let unusualActivityRecoveryOperation = Promise.resolve();
let unusualActivityRecoveryCancelRequested = false;
let workerSessionInitializationPromise = Promise.resolve();
const WORKER_SESSION_INITIALIZED_STORAGE_KEY = 'flow_worker_session_initialized';
// Automating from the very first use risks tripping Google Flow's own
// unusual-activity detection before the account has any organic history. The
// first two explicit Start clicks (ever) are required manually; only after
// that does an automatic resume (browser restart, keepalive restart) get
// allowed to skip the forced-Paused gate below.
const MANUAL_START_REQUIRED_COUNT = 2;
const MANUAL_START_COUNT_STORAGE_KEY = 'flow_manual_start_count';
const LAST_FLOW_PROJECT_URL_KEY = 'last_flow_project_url';
const FIREBASE_AUTH_STORAGE_KEY = 'flow_firebase_auth_state';
const FIRESTORE_GATE_CACHE_KEY = 'flow_firestore_gate_cache';
const FIRESTORE_BILLING_CONFIG_CACHE_KEY = 'flow_firestore_billing_config_cache';
const INSTALL_ID_STORAGE_KEY = 'flow_live_install_id';
const INSTALL_FUNCTIONS_BASE_URL = 'https://us-central1-youtubsubcheck.cloudfunctions.net';
const INSTALL_FUNCTIONS_ORIGIN_PATTERN = 'https://us-central1-youtubsubcheck.cloudfunctions.net/*';
const STARTER_POLICY_CACHE_TTL_MS = 60 * 1000;
const ACCOUNT_USAGE_STORAGE_KEY = 'flow_account_prompt_usage';
const ANALYTICS_CLIENT_ID_STORAGE_KEY = 'flow_ga4_client_id';
const ANALYTICS_DAILY_EVENTS_STORAGE_KEY = 'flow_ga4_daily_events';
// Exact-admin runtime policy may raise this for 2.1. Fifty remains the safe
// fallback and keeps every existing 2.0 client on its original allowance.
let STARTER_ACCOUNT_PROMPT_LIMIT = 50;
const MIN_PROMPT_DELAY_SECONDS = 10;
const MAX_PROMPT_DELAY_SECONDS = 300;
const DEFAULT_PROMPT_DELAY_SECONDS = 30;
const STARTER_FIXED_PROMPT_DELAY_SECONDS = 30;
// Jitter is always added on top of the base delay (never subtracted) so a
// 30s setting waits 30-60s, a 10s setting waits 10-40s, etc. A fixed,
// perfectly periodic gap between prompts is itself a bot-like signal.
const PROMPT_DELAY_JITTER_MAX_SECONDS = 30;
const UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY = 'flow_unusual_activity_recovery';
const UNUSUAL_ACTIVITY_RECOVERY_ALARM = 'queue-unusual-activity-recovery';
const UNUSUAL_ACTIVITY_COOLDOWN_MINUTES_KEY = 'flow_unusual_activity_cooldown_minutes';
const DEFAULT_UNUSUAL_ACTIVITY_COOLDOWN_MINUTES = 5;
// Batch break: default for every tier through Premium. Every 20 processed
// items (success or failure), pause for a random 4-5 minutes before
// continuing. Professional can override via randomizedDelayCustomEnabled.
const DEFAULT_QUEUE_BREAK_EVERY_COUNT = 20;
const QUEUE_BREAK_DEFAULT_MIN_MINUTES = 4;
const QUEUE_BREAK_DEFAULT_MAX_MINUTES = 5;
const QUEUE_BREAK_COUNTER_STORAGE_KEY = 'flow_queue_break_counter';
// Randomized Delay values (jitter seconds, break-every count, break min/max
// minutes) are fixed defaults for every tier through Premium. Only
// Professional can flip `randomizedDelayCustomEnabled` on and override them.
const RANDOMIZED_DELAY_JITTER_MAX_SECONDS_CAP = 60;
const RANDOMIZED_DELAY_BREAK_EVERY_COUNT_MIN = 2;
const RANDOMIZED_DELAY_BREAK_EVERY_COUNT_MAX = 50;
const POLICY_RETRY_MIN_MS = 8000;
const POLICY_RETRY_MAX_MS = 18000;
const MAX_PROMPT_ERROR_RETRIES = 2;
const PROMPT_ERROR_RETRY_DELAY_MS = 12000;
const MIN_FLOW_WINDOW_WIDTH_PX = 765;
const IN_PROGRESS_RECOVERY_GRACE_MS = 20 * 60 * 1000;
const FLOW_WINDOW_TOO_NARROW_MESSAGE = `Character and Reference Image features are not supported when the Google Flow panel is narrower than ${MIN_FLOW_WINDOW_WIDTH_PX}px. Please widen the Flow panel and run the prompt again.`;
const ACCOUNT_DISABLED_MESSAGE = 'Your trial has expired. Please upgrade to continue.';
const PREMIUM_FEATURE_LOCKED_MESSAGE = 'Premium Feature - Unlock Required';
const RUN_INSIDE_PROJECT_MESSAGE = 'Open a Google Flow project page first, then run prompts from inside the project.';
const STARTER_QUOTA_REACHED_MESSAGE = `Starter daily quota reached. You can run up to ${STARTER_ACCOUNT_PROMPT_LIMIT} prompts per day.`;
const STARTER_ACCESS_RESTRICTED_MESSAGE = 'Starter access is temporarily unavailable. Open the extension to see the Install ID or maintenance details.';

function safeSendMessage(message) {
    try {
        chrome.runtime.sendMessage(message).catch(() => {});
    } catch (e) {
        // Ignore context invalidated/closed errors
    }
}

function normalizePromptForMatch(text) {
    let normalized = (text || '').trim();
    normalized = normalized.replace(/^\[Model:\s*[^\]]+\]\s*/i, '');
    normalized = normalized.replace(/[\s.…]*(\.\.\.|…)$/, '');
    return normalized.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isAllowedAutomationUrl(url = '') {
    return url.includes('google.com/labs/flow') ||
        url.includes('labs.google/fx') ||
        url.includes('flow.google');
}

function isFlowProjectUrl(url = '') {
    return url.includes('google.com/labs/flow') ||
        url.includes('labs.google/fx') ||
        url.includes('flow.google');
}

function isFlowProjectPageUrl(url = '') {
    return isFlowProjectUrl(url) && /\/project\//i.test(url || '');
}

async function getActiveFlowProjectTabForPromptRun() {
    const focusedTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const activeTab = focusedTabs.find(t => t.url && t.url.startsWith('http'));
    if (activeTab?.url && isFlowProjectPageUrl(activeTab.url)) {
        await chrome.storage.local.set({ [LAST_FLOW_PROJECT_URL_KEY]: activeTab.url });
        return activeTab;
    }
    return null;
}

async function isImageDownloaderUnlocked() {
    const data = await chrome.storage.local.get([FIREBASE_AUTH_STORAGE_KEY, FIRESTORE_GATE_CACHE_KEY]);
    const auth = data[FIREBASE_AUTH_STORAGE_KEY] || {};
    const gate = data[FIRESTORE_GATE_CACHE_KEY] || {};
    const hasValidAuth = !!auth.uid && !!auth.idToken && (!auth.expiresAt || Number(auth.expiresAt) > Date.now());
    const installCheckValid = hasInstallExemptMembership(gate)
        || (gate.starterInstallAllowed === true
            && gate.starterInstallCheckedUid === auth.uid);
    // Starters get basic 1K auto-download just by being logged in (no ssoVerified required)
    return gate.disabled !== true && installCheckValid && hasValidAuth;
}

async function isPremiumImageDownloaderUnlocked() {
    // Image Downloader is now Professional/Supporter-tier only (no longer
    // unlocked by plain Premium or the Premium trial) — an intentional
    // tightening confirmed for existing Premium subscribers.
    const data = await chrome.storage.local.get([FIREBASE_AUTH_STORAGE_KEY, FIRESTORE_GATE_CACHE_KEY]);
    const auth = data[FIREBASE_AUTH_STORAGE_KEY] || {};
    const gate = data[FIRESTORE_GATE_CACHE_KEY] || {};
    const hasValidAuth = !!auth.uid && !!auth.idToken && (!auth.expiresAt || Number(auth.expiresAt) > Date.now());
    if (gate.disabled || !hasValidAuth) return false;
    if (isStripeSubscriptionLapsed(gate)) return false;
    return hasProfessionalTierAccess(gate);
}

async function isPerPromptAssetsUnlocked() {
    const data = await chrome.storage.local.get([FIREBASE_AUTH_STORAGE_KEY, FIRESTORE_GATE_CACHE_KEY, FIRESTORE_BILLING_CONFIG_CACHE_KEY]);
    const auth = data[FIREBASE_AUTH_STORAGE_KEY] || {};
    const gate = data[FIRESTORE_GATE_CACHE_KEY] || {};
    const billingCfg = data[FIRESTORE_BILLING_CONFIG_CACHE_KEY] || {};
    if (!auth.uid) return false;
    const gateUidMatches = !gate.uid || gate.uid === auth.uid;
    const installCheckValid = hasInstallExemptMembership(gate)
        || (gate.starterInstallAllowed === true
            && gate.starterInstallCheckedUid === auth.uid);
    if (isStripeSubscriptionLapsed(gate) && !isGateTrialActive(gate)) return false;
    return gateUidMatches
        && gate.disabled !== true
        && installCheckValid
        && !isTrialExpired(gate)
        && (
            hasEffectivePremiumAccess(gate, billingCfg)
            || hasProfessionalTierAccess(gate)
            || hasActivePaidMembership(gate)
            || hasRemotePremiumMembership(gate)
            || isGateTrialActive(gate)
        );
}

async function isSsoVerifiedForAssetBrowsing() {
    return isPerPromptAssetsUnlocked();
}

async function isUpscaledGeneratedDownloadUnlocked() {
    return isPerPromptAssetsUnlocked();
}

function isGateTrialActive(gate = {}, now = Date.now()) {
    const expiresAt = Number(gate.trialExpiresAt || 0);
    return gate.trial === true && Number.isFinite(expiresAt) && expiresAt > now;
}

// Keep in sync with popup.js — Stripe statuses that still grant access,
// terminal statuses that end it, and the post-period grace window that
// covers a missed renewal webhook.
const ACTIVE_PAYMENT_STATUSES = ['active', 'trialing', 'past_due'];
const LAPSED_PAYMENT_STATUSES = ['canceled', 'cancelled', 'unpaid', 'incomplete_expired', 'paused', 'refunded'];
const SUBSCRIPTION_PERIOD_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

function getSupporterEntitlementState(gate = {}, now = Date.now()) {
    const enabled = gate.supporter === true;
    const expiresAt = Number(gate.supporterExpiresAt || 0);
    return {
        active: enabled && (!expiresAt || expiresAt > now),
        expired: enabled && expiresAt > 0 && expiresAt <= now
    };
}

function hasActiveSupporterEntitlement(gate = {}, now = Date.now()) {
    return getSupporterEntitlementState(gate, now).active;
}

function isStripeSubscriptionLapsed(gate = {}, now = Date.now()) {
    if (String(gate.paymentProvider || '').toLowerCase() !== 'stripe') return false;
    if (gate.specialPermission === true || hasActiveSupporterEntitlement(gate, now)) return false;
    const status = String(gate.paymentStatus || '').toLowerCase();
    if (LAPSED_PAYMENT_STATUSES.includes(status)) return true;
    const periodEnd = Number(gate.currentPeriodEnd || 0);
    return Number.isFinite(periodEnd) && periodEnd > 0 && now > periodEnd + SUBSCRIPTION_PERIOD_GRACE_MS;
}

function hasActivePaidMembership(gate = {}) {
    return gate.paid === true
        && ACTIVE_PAYMENT_STATUSES.includes(String(gate.paymentStatus || '').toLowerCase())
        && gate.refunded !== true
        && gate.disabled !== true
        && !isStripeSubscriptionLapsed(gate);
}

function hasInstallExemptMembership(gate = {}) {
    if (gate.disabled === true) return false;
    if (hasActiveSupporterEntitlement(gate) || gate.specialPermission === true || gate.prePremium === true) return true;
    const status = String(gate.paymentStatus || gate.membershipStatus || '').toLowerCase();
    if (gate.refunded === true || ['refunded', 'canceled', 'cancelled', 'unpaid', 'incomplete_expired'].includes(status)) return false;
    if (gate.premium === true || gate.professional === true) return true;
    if (!getSupporterEntitlementState(gate).expired
        && ['premium', 'professional', 'pro', 'paid', 'active'].includes(String(gate.membershipTier || '').toLowerCase())) return true;
    return hasActivePaidMembership(gate);
}

function getNormalizedMembershipValue(gate = {}) {
    return String(gate.membershipTier || gate.membershipStatus || '')
        .trim()
        .toLowerCase();
}

function hasRemotePremiumMembership(gate = {}) {
    if (getSupporterEntitlementState(gate).expired
        && gate.specialPermission !== true
        && gate.premium !== true
        && gate.professional !== true
        && String(gate.paymentProvider || '').toLowerCase() !== 'stripe') return false;
    const membership = getNormalizedMembershipValue(gate);
    return membership === 'premium'
        || membership === 'professional'
        || membership === 'pro'
        || membership === 'paid'
        || membership === 'active';
}

function hasRemoteProfessionalMembership(gate = {}) {
    if (getSupporterEntitlementState(gate).expired
        && gate.specialPermission !== true
        && gate.professional !== true
        && String(gate.paymentProvider || '').toLowerCase() !== 'stripe') return false;
    const membership = getNormalizedMembershipValue(gate);
    return membership === 'professional' || membership === 'pro';
}

// Professional and the "Supporter" badge are the same access level — either
// the admin-only `professional` flag or the existing `supporter` flag grants
// it, plus the self-serve 24h professional trial below.
function isProfessionalTrialActive(gate = {}, now = Date.now()) {
    const expiresAt = Number(gate.professionalTrialExpiresAt || 0);
    return Number.isFinite(expiresAt) && expiresAt > now;
}

function hasProfessionalTierAccess(gate = {}, now = Date.now()) {
    if (gate.professional === true || hasActiveSupporterEntitlement(gate, now) || gate.specialPermission === true) return true;
    if (hasRemoteProfessionalMembership(gate)) return true;
    return isProfessionalTrialActive(gate, now);
}

// Pre-Premium grants Premium-equivalent access, but an admin can mass-
// downgrade the whole Pre-Premium cohort to Starter via the "Pre-Premium
// Access" toggle (appConfig/billing.pre_premium_access_enabled — ON = Premium
// features, OFF = Starter only) without touching real Premium subscribers.
// Defaults to enabled (true) when unset.
async function getCachedBillingConfig() {
    const data = await chrome.storage.local.get(FIRESTORE_BILLING_CONFIG_CACHE_KEY);
    return data[FIRESTORE_BILLING_CONFIG_CACHE_KEY] || {};
}

function isPrePremiumAccessEnabled(billingCfg = {}) {
    return billingCfg?.prePremiumAccessEnabled !== false;
}

function hasEffectivePremiumAccess(gate = {}, billingCfg = {}) {
    if (gate?.premium === true) return true;
    if (gate?.prePremium === true) return isPrePremiumAccessEnabled(billingCfg);
    return false;
}

function isTrialExpired(gate = {}, now = Date.now()) {
    const expiresAt = Number(gate.trialExpiresAt || 0);
    return gate.trialUsed === true
        && Number.isFinite(expiresAt)
        && expiresAt > 0
        && expiresAt <= now
        && !hasActivePaidMembership(gate)
        && gate.premium !== true
        && !hasActiveSupporterEntitlement(gate, now)
        && gate.professional !== true
        && gate.prePremium !== true
        && gate.specialPermission !== true
        && !hasRemotePremiumMembership(gate)
        && !isProfessionalTrialActive(gate, now);
}

async function getMembershipState() {
    const data = await chrome.storage.local.get([FIREBASE_AUTH_STORAGE_KEY, FIRESTORE_GATE_CACHE_KEY, FIRESTORE_BILLING_CONFIG_CACHE_KEY]);
    const auth = data[FIREBASE_AUTH_STORAGE_KEY] || {};
    const gate = data[FIRESTORE_GATE_CACHE_KEY] || {};
    const billingCfg = data[FIRESTORE_BILLING_CONFIG_CACHE_KEY] || {};
    const gateUidMatches = !gate.uid || gate.uid === auth.uid;
    const disabled = !!auth.uid && gateUidMatches && gate.disabled === true;
    // Existing 2.0 paid/manual users do not yet have the new Install-ID cache
    // fields. Their server-owned entitlement must remain usable immediately.
    const installCheckValid = hasInstallExemptMembership(gate)
        || (gate.starterInstallAllowed === true
            && gate.starterInstallCheckedUid === auth.uid);
    const installRestricted = !!auth.uid && gateUidMatches && !installCheckValid;
    const signedIn = !!auth.uid && gateUidMatches && gate.ssoVerified === true && !disabled && !installRestricted;
    const subscriptionLapsed = isStripeSubscriptionLapsed(gate);
    const professional = signedIn && !subscriptionLapsed && hasProfessionalTierAccess(gate);
    const premium = signedIn && !subscriptionLapsed && (hasEffectivePremiumAccess(gate, billingCfg) || hasRemotePremiumMembership(gate) || hasActivePaidMembership(gate));
    const tier = disabled ? 'disabled' : !signedIn ? 'signedOut' : professional ? 'professional' : premium ? 'premium' : isGateTrialActive(gate) ? 'trial' : 'starter';
    const membershipType = hasActiveSupporterEntitlement(gate) ? 'supporter'
        : gate.specialPermission === true ? 'special_permission'
            : gate.prePremium === true ? 'pre_premium'
                : tier === 'professional' ? 'professional'
                    : tier === 'premium' ? 'premium'
                        : tier === 'trial' ? 'trial'
                            : 'starter';
    return { uid: auth.uid || null, signedIn, disabled, installRestricted, professional, tier, membershipType };
}

async function getOrCreateAnalyticsClientId() {
    const stored = await chrome.storage.local.get(ANALYTICS_CLIENT_ID_STORAGE_KEY);
    const existing = String(stored[ANALYTICS_CLIENT_ID_STORAGE_KEY] || '');
    if (/^[A-Za-z0-9._-]{12,96}$/.test(existing)) return existing;
    const next = crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    await chrome.storage.local.set({ [ANALYTICS_CLIENT_ID_STORAGE_KEY]: next });
    return next;
}

function analyticsDevicePayload() {
    const userAgent = String(navigator.userAgent || '');
    const platform = String(navigator.userAgentData?.platform || navigator.platform || '');
    const chromeVersion = userAgent.match(/(?:Chrome|Chromium)\/(\d+(?:\.\d+){0,3})/i)?.[1] || '';
    return {
        category: 'desktop',
        language: String(navigator.language || '').slice(0, 16),
        operatingSystem: platform.slice(0, 24),
        browser: 'Chrome',
        browserVersion: chromeVersion.slice(0, 24)
    };
}

async function sendDailyAnalyticsEvent(eventName, { requireRunning = false } = {}) {
    if (!['panel_open', 'automation_active'].includes(eventName)) return false;
    if (requireRunning && (await storage.getState()) !== AUTOMATOR_STATE.RUNNING) return false;
    if (!(await hasInstallFunctionsHostPermission())) return false;
    const [membership, settings, validAuth, dailyData] = await Promise.all([
        getMembershipState(),
        storage.getSettings(),
        getValidFirebaseAuthState(),
        chrome.storage.local.get(ANALYTICS_DAILY_EVENTS_STORAGE_KEY)
    ]);
    if (!membership.signedIn || membership.disabled || !validAuth.idToken) return false;
    const dateKey = getLocalDateKey();
    const dailyEvents = dailyData[ANALYTICS_DAILY_EVENTS_STORAGE_KEY] || {};
    const dailyIdentity = `${membership.uid}:${dateKey}`;
    if (dailyEvents[eventName] === dailyIdentity) return true;
    const sessionId = Math.floor(Date.now() / 1000);
    const detailed = settings.detailedAnalyticsEnabled === true;
    const clientId = await getOrCreateAnalyticsClientId();
    const response = await fetch(`${INSTALL_FUNCTIONS_BASE_URL}/collectAnalyticsEvent`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${validAuth.idToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            clientId,
            sessionId,
            eventName,
            membershipType: membership.membershipType,
            detailed,
            ...(detailed ? {
                extensionVersion: chrome.runtime.getManifest()?.version || '',
                flowType: settings.flowType === 'video' ? 'video' : 'image',
                device: analyticsDevicePayload()
            } : {})
        })
    });
    if (!response.ok) return false;
    await chrome.storage.local.set({
        [ANALYTICS_DAILY_EVENTS_STORAGE_KEY]: {
            ...dailyEvents,
            [eventName]: dailyIdentity
        }
    });
    return true;
}

function getLocalDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getNextLocalMidnightMs(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
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

async function getValidFirebaseAuthState() {
    const data = await chrome.storage.local.get(FIREBASE_AUTH_STORAGE_KEY);
    const auth = data[FIREBASE_AUTH_STORAGE_KEY] || {};
    if (!auth.uid || !auth.refreshToken) return auth;
    if (auth.idToken && (!auth.expiresAt || Number(auth.expiresAt) > Date.now() + 30000)) return auth;

    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(firebaseConfig.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: auth.refreshToken
        }).toString()
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.warn('Failed to refresh Firebase token for quota sync:', json?.error?.message || res.statusText);
        return auth;
    }
    const next = {
        ...auth,
        idToken: json.id_token || auth.idToken || null,
        refreshToken: json.refresh_token || auth.refreshToken || null,
        expiresAt: Date.now() + (parseInt(json.expires_in || '3600', 10) - 30) * 1000
    };
    await chrome.storage.local.set({ [FIREBASE_AUTH_STORAGE_KEY]: next });
    return next;
}

async function hasInstallFunctionsHostPermission() {
    if (!chrome.permissions?.contains) return false;
    return chrome.permissions.contains({ origins: [INSTALL_FUNCTIONS_ORIGIN_PATTERN] });
}

async function storeFailedStarterAccessDecision(gate, uid, status = 'check_failed_free_tier') {
    const nextGate = {
        ...gate,
        starterInstallAllowed: false,
        starterInstallStatus: status,
        starterInstallResetAvailableAt: null,
        starterMaintenanceEndsAt: null,
        starterMaintenanceMessage: '',
        starterInstallCheckedAt: Date.now(),
        starterInstallCheckedUid: uid
    };
    await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: nextGate });
    return false;
}

async function getOrCreateBackgroundInstallId(localInstallId = '') {
    let installId = String(localInstallId || '');
    if (!installId) {
        try {
            const synced = await chrome.storage.sync.get(INSTALL_ID_STORAGE_KEY);
            installId = String(synced?.[INSTALL_ID_STORAGE_KEY] || '');
        } catch { /* sync can be unavailable for managed profiles */ }
    }
    if (!installId) {
        installId = crypto?.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    }
    const payload = { [INSTALL_ID_STORAGE_KEY]: installId };
    try { await chrome.storage.local.set(payload); } catch { /* ignore */ }
    try { await chrome.storage.sync.set(payload); } catch { /* ignore */ }
    return installId;
}

async function refreshStarterAccessDecision({ force = false } = {}) {
    const stored = await chrome.storage.local.get([
        FIREBASE_AUTH_STORAGE_KEY,
        FIRESTORE_GATE_CACHE_KEY,
        INSTALL_ID_STORAGE_KEY
    ]);
    const auth = stored[FIREBASE_AUTH_STORAGE_KEY] || {};
    const gate = stored[FIRESTORE_GATE_CACHE_KEY] || {};
    const cachedQuotaLimit = Number(gate.quotaLimit);
    if (Number.isInteger(cachedQuotaLimit) && cachedQuotaLimit >= 50 && cachedQuotaLimit <= 500) {
        STARTER_ACCOUNT_PROMPT_LIMIT = cachedQuotaLimit;
    }
    if (!auth.uid) return false;
    const installId = await getOrCreateBackgroundInstallId(stored[INSTALL_ID_STORAGE_KEY]);
    if (hasInstallExemptMembership(gate)) {
        // Paid/manual/legacy users are never blocked by tracking permission or
        // a transient Function failure. When permission exists, however, send
        // the same persistent ID so a future Starter downgrade is prepared.
        if (!(await hasInstallFunctionsHostPermission())) {
            await chrome.storage.local.set({
                [FIRESTORE_GATE_CACHE_KEY]: {
                    ...gate,
                    starterInstallAllowed: true,
                    starterInstallStatus: 'paid_tier_local',
                    starterInstallCheckedAt: Date.now(),
                    starterInstallCheckedUid: auth.uid
                }
            });
            return true;
        }
    }
    if (!(await hasInstallFunctionsHostPermission())) {
        return storeFailedStarterAccessDecision(gate, auth.uid, 'host_permission_required');
    }
    const fresh = gate.starterInstallCheckedUid === auth.uid
        && Number(gate.starterInstallCheckedAt || 0) > 0
        && Date.now() - Number(gate.starterInstallCheckedAt) < STARTER_POLICY_CACHE_TTL_MS;
    if (!force && fresh) return gate.starterInstallAllowed !== false;

    if (!installId) return storeFailedStarterAccessDecision(gate, auth.uid);
    try {
        const validAuth = await getValidFirebaseAuthState();
        if (!validAuth.idToken) return storeFailedStarterAccessDecision(gate, auth.uid);
        const response = await fetch(`${INSTALL_FUNCTIONS_BASE_URL}/registerInstallAndCheckAccess`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${validAuth.idToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ installId })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.error || 'Starter access check failed.');
        const reportedQuotaLimit = Number(result.quotaLimit);
        if (Number.isInteger(reportedQuotaLimit) && reportedQuotaLimit >= 50 && reportedQuotaLimit <= 500) {
            STARTER_ACCOUNT_PROMPT_LIMIT = reportedQuotaLimit;
        }
        const nextGate = {
            ...gate,
            starterInstallAllowed: result.allowed !== false,
            starterInstallStatus: String(result.status || (result.allowed === false ? 'locked' : 'allowed')),
            starterInstallResetAvailableAt: Number(result.resetAvailableAt || 0) || null,
            starterMaintenanceEndsAt: Number(result.maintenanceEndsAt || 0) || null,
            starterMaintenanceMessage: String(result.maintenanceMessage || ''),
            quotaLimit: STARTER_ACCOUNT_PROMPT_LIMIT,
            starterInstallCheckedAt: Date.now(),
            starterInstallCheckedUid: auth.uid
        };
        await chrome.storage.local.set({ [FIRESTORE_GATE_CACHE_KEY]: nextGate });
        return nextGate.starterInstallAllowed !== false;
    } catch (error) {
        // Elevated memberships fail open because Install ID is observational
        // for them. Starter/Trial must not inherit a cached allow decision
        // from another account when the server check is unavailable.
        if (hasInstallExemptMembership(gate)) {
            await chrome.storage.local.set({
                [FIRESTORE_GATE_CACHE_KEY]: {
                    ...gate,
                    starterInstallAllowed: true,
                    starterInstallStatus: 'paid_tier_tracking_deferred',
                    starterInstallCheckedAt: Date.now(),
                    starterInstallCheckedUid: auth.uid
                }
            });
            console.warn('Elevated install registration deferred:', error?.message || error);
            return true;
        }
        console.warn('Starter access refresh failed:', error?.message || error);
        return storeFailedStarterAccessDecision(gate, auth.uid);
    }
}

async function fetchRemoteAccountUsageForUid(uid) {
    const auth = await getValidFirebaseAuthState();
    if (!uid || auth.uid !== uid || !auth.idToken || !firebaseConfig.projectId) return null;

    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${uid}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${auth.idToken}` }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.warn('Quota fetch failed:', json?.error?.message || res.statusText);
        return null;
    }

    const fields = json.fields || {};
    const todayKey = getLocalDateKey();
    const dateKey = readFirestoreString(fields, 'quota_date_key', '');
    const resetAt = readFirestoreTimestampMs(fields, 'quota_reset_at') || getNextLocalMidnightMs();
    if (resetAt <= Date.now()) return null;

    return {
        uid,
        count: Math.max(0, readFirestoreNumber(fields, 'quota_used', 0)),
        limit: STARTER_ACCOUNT_PROMPT_LIMIT,
        dateKey: dateKey || todayKey,
        updatedAt: readFirestoreTimestampMs(fields, 'quota_updated_at') || Date.now(),
        resetAt,
        refundVersion: Math.max(0, readFirestoreNumber(fields, 'quota_refund_version', 0))
    };
}

async function patchRemoteAccountUsage(usage) {
    const auth = await getValidFirebaseAuthState();
    if (!usage?.uid || auth.uid !== usage.uid || !auth.idToken || !firebaseConfig.projectId) return false;

    const fieldPaths = ['quota_used', 'quota_limit', 'quota_date_key', 'quota_updated_at', 'quota_reset_at'];
    const fieldParams = fieldPaths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${usage.uid}?${fieldParams}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${auth.idToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                quota_used: { integerValue: String(Math.max(0, Number(usage.count) || 0)) },
                quota_limit: { integerValue: String(STARTER_ACCOUNT_PROMPT_LIMIT) },
                quota_date_key: { stringValue: usage.dateKey || getLocalDateKey() },
                quota_updated_at: { timestampValue: new Date(Number(usage.updatedAt) || Date.now()).toISOString() },
                quota_reset_at: { timestampValue: new Date(Number(usage.resetAt) || getNextLocalMidnightMs()).toISOString() }
            }
        })
    });
    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.warn('Quota patch failed:', json?.error?.message || res.statusText);
        return false;
    }
    return true;
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
    if (normalizedIncoming.refundVersion > existingRefundVersion) return normalizedIncoming;
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
        resetAt: Math.min(existingResetAt, incomingResetAt)
    };
}

function createStarterQuotaAttemptId(itemId = '') {
    const randomPart = crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${String(itemId || 'prompt').replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 80)}:${randomPart}`;
}

async function postStarterQuotaAction(functionName, body) {
    if (!(await hasInstallFunctionsHostPermission())) {
        throw new Error('Starter security-check permission is required.');
    }
    const auth = await getValidFirebaseAuthState();
    if (!auth.uid || !auth.idToken) throw new Error('Firebase sign-in is required for quota sync.');
    const response = await fetch(`${INSTALL_FUNCTIONS_BASE_URL}/${functionName}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${auth.idToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body || {})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(result?.error || `Quota service failed (${response.status}).`);
        error.status = response.status;
        error.code = result?.code || '';
        throw error;
    }
    return result;
}

async function cacheBackgroundAccountUsage(incoming, { authoritative = false } = {}) {
    if (!incoming?.uid) return null;
    const data = await chrome.storage.local.get(ACCOUNT_USAGE_STORAGE_KEY);
    const current = data[ACCOUNT_USAGE_STORAGE_KEY] || {};
    const usage = authoritative
        ? {
            ...incoming,
            count: Math.max(0, Number(incoming.count) || 0),
            limit: STARTER_ACCOUNT_PROMPT_LIMIT,
            updatedAt: Number(incoming.updatedAt) || Date.now(),
            resetAt: Number(incoming.resetAt) || getNextLocalMidnightMs(),
            refundVersion: Math.max(0, Number(incoming.refundVersion) || 0)
        }
        : mergeAccountUsageWithoutRollback(current, incoming);
    await chrome.storage.local.set({ [ACCOUNT_USAGE_STORAGE_KEY]: usage });
    safeSendMessage({ action: 'ACCOUNT_USAGE_UPDATED', usage });
    return usage;
}

const quotaChargeOperations = new Map();
const claimedQuotaProgressAttempts = new Set();

function claimQuotaProgressAttempt(attemptId) {
    const key = String(attemptId || '');
    if (!key || claimedQuotaProgressAttempts.has(key)) return false;
    claimedQuotaProgressAttempts.add(key);
    if (claimedQuotaProgressAttempts.size > 500) {
        claimedQuotaProgressAttempts.delete(claimedQuotaProgressAttempts.values().next().value);
    }
    return true;
}

async function chargeStarterQuotaForAttempt(uid, attemptId) {
    // This is the existing Starter quota write, not a Cloud Function call.
    // Track the in-flight PATCH only so an unusually fast failure cannot ask
    // the refund endpoint to decrement an older server value.
    const operation = incrementAccountUsageForUid(uid);
    quotaChargeOperations.set(attemptId, operation);
    try {
        return await operation;
    } finally {
        quotaChargeOperations.delete(attemptId);
    }
}

async function refundStarterQuotaForUnusualActivity(item = {}) {
    const attemptId = String(item.quotaAttemptId || '');
    if (!item.quotaCountedAt || !attemptId || item.quotaRefundedAt) return false;
    const pendingCharge = quotaChargeOperations.get(attemptId);
    if (pendingCharge) await pendingCharge.catch(() => null);
    try {
        const result = await postStarterQuotaAction('refundStarterQuotaForUnusualActivity', { attemptId });
        await cacheBackgroundAccountUsage({
            uid: result.uid,
            count: result.count,
            limit: result.limit,
            dateKey: result.dateKey,
            updatedAt: Date.now(),
            resetAt: result.resetAt,
            refundVersion: result.refundVersion
        }, { authoritative: true });
        item.quotaRefundedAt = Date.now();
        return true;
    } catch (error) {
        console.warn('Unusual-activity quota refund failed:', error?.message || error);
        return false;
    }
}

async function getAccountUsageForUid(uid, { forceRemote = false } = {}) {
    if (!uid) {
        return { uid: null, count: 0, dateKey: getLocalDateKey(), updatedAt: Date.now(), resetAt: getNextLocalMidnightMs() };
    }
    const data = await chrome.storage.local.get(ACCOUNT_USAGE_STORAGE_KEY);
    const usage = data[ACCOUNT_USAGE_STORAGE_KEY] || {};
    const todayKey = getLocalDateKey();

    if (!forceRemote && usage.uid === uid && Number(usage.resetAt || 0) > Date.now()) {
        return { uid, count: Math.max(0, Number(usage.count) || 0), limit: STARTER_ACCOUNT_PROMPT_LIMIT, dateKey: usage.dateKey || todayKey, resetAt: usage.resetAt || getNextLocalMidnightMs() };
    }

    const remoteUsage = await fetchRemoteAccountUsageForUid(uid);
    if (remoteUsage) {
        // The remote GET can finish after a local increment. Re-read storage
        // before merging so that late server data cannot win that race.
        const latestData = await chrome.storage.local.get(ACCOUNT_USAGE_STORAGE_KEY);
        const latestUsage = latestData[ACCOUNT_USAGE_STORAGE_KEY] || usage;
        const mergedUsage = mergeAccountUsageWithoutRollback(latestUsage, remoteUsage);
        await chrome.storage.local.set({ [ACCOUNT_USAGE_STORAGE_KEY]: mergedUsage });
        if (mergedUsage.count > remoteUsage.count) {
            patchRemoteAccountUsage(mergedUsage).catch((error) => {
                console.warn('Quota catch-up sync failed:', error);
            });
        }
        return mergedUsage;
    }

    if (usage.uid !== uid || Number(usage.resetAt || 0) <= Date.now()) {
        const resetUsage = { uid, count: 0, limit: STARTER_ACCOUNT_PROMPT_LIMIT, dateKey: todayKey, updatedAt: Date.now(), resetAt: getNextLocalMidnightMs() };
        await chrome.storage.local.set({ [ACCOUNT_USAGE_STORAGE_KEY]: resetUsage });
        return resetUsage;
    }
    return { uid, count: Math.max(0, Number(usage.count) || 0), limit: STARTER_ACCOUNT_PROMPT_LIMIT, dateKey: todayKey, resetAt: usage.resetAt || getNextLocalMidnightMs() };
}

async function incrementAccountUsageForUid(uid) {
    const usage = await getAccountUsageForUid(uid);
    const next = { ...usage, count: usage.count + 1, limit: STARTER_ACCOUNT_PROMPT_LIMIT, dateKey: getLocalDateKey(), updatedAt: Date.now(), resetAt: getNextLocalMidnightMs() };
    await chrome.storage.local.set({ [ACCOUNT_USAGE_STORAGE_KEY]: next });
    safeSendMessage({ action: 'ACCOUNT_USAGE_UPDATED', usage: next });
    // Mirror every increment to Firestore (up to the admin-configured daily
    // Starter limit), so
    // clearing local extension storage can't reset the daily counter — the
    // next remote fetch restores the true count, and rules only let it grow.
    const synced = await patchRemoteAccountUsage(next).catch((error) => {
        console.warn('Remote quota sync failed (will retry at next increment):', error);
        return false;
    });
    if (!synced) console.warn('Remote quota sync was not confirmed; local charge remains applied.');
    return next;
}

async function syncLocalAccountUsageToRemote() {
    const membership = await getMembershipState();
    if (membership.tier !== 'starter' || !membership.uid) return false;
    const data = await chrome.storage.local.get(ACCOUNT_USAGE_STORAGE_KEY);
    const usage = data[ACCOUNT_USAGE_STORAGE_KEY] || {};
    if (usage.uid !== membership.uid || Number(usage.resetAt || 0) <= Date.now()) return false;
    return patchRemoteAccountUsage({
        uid: membership.uid,
        count: Math.max(0, Number(usage.count) || 0),
        limit: STARTER_ACCOUNT_PROMPT_LIMIT,
        dateKey: usage.dateKey || getLocalDateKey(),
        updatedAt: Date.now(),
        resetAt: Number(usage.resetAt) || getNextLocalMidnightMs()
    });
}

async function assertCanRunPromptByMembership() {
    const membership = await getMembershipState();
    if (membership.disabled) return { allowed: false, error: ACCOUNT_DISABLED_MESSAGE, membership };
    if (!membership.signedIn) return { allowed: false, error: 'Sign in with Google is required before running prompts.' };
    return { allowed: true, membership };
}

function limitAssetsForPremiumPolicy(settings = {}, item = {}, { premiumUnlocked = false } = {}) {
    if (premiumUnlocked) {
        return {
            settings,
            item,
            changed: false
        };
    }

    const nextSettings = {
        ...settings,
        perPromptAssetsEnabled: false,
        characterAssetSelections: [],
        characterAssetSelection: null,
        referenceAssetSelections: []
    };
    const nextItem = stripPerPromptAssetsFromQueueItem(item);
    delete nextItem.referenceAssetSelections;
    delete nextItem.perPromptReferenceAssetsEdited;

    return {
        settings: nextSettings,
        item: nextItem,
        changed: true
    };
}

function runUsesCharacterOrReferenceAssets(settings = {}, queue = []) {
    const usePerPromptAssets = settings.perPromptAssetsEnabled === true;
    const characterPool = getSelectedCharacterPool(settings);
    const referencePool = Array.isArray(settings.referenceAssetSelections) ? settings.referenceAssetSelections : [];
    const hasGlobalCharacter = !usePerPromptAssets && characterPool.length > 0;
    const hasGlobalReferences = !usePerPromptAssets && referencePool.length > 0;
    const queueUsesAssets = (Array.isArray(queue) ? queue : []).some((item) => {
        return getQueueItemCharacterSelections(item, characterPool).length > 0
            || getPerPromptReferenceSelections(item, referencePool).length > 0;
    });
    return hasGlobalCharacter || hasGlobalReferences || queueUsesAssets;
}

function queueItemHasPerPromptAssets(item = {}) {
    return !!item.characterAssetSelection
        || (Array.isArray(item.characterAssetSelections) && item.characterAssetSelections.length > 0)
        || (Array.isArray(item.referenceAssetSelections) && item.referenceAssetSelections.length > 0);
}

function stripPerPromptAssetsFromQueueItem(item = {}) {
    const {
        characterAssetSelections,
        characterAssetSelection,
        referenceAssetSelections,
        ...rest
    } = item;
    return rest;
}

async function getFlowWindowWidth(tab) {
    if (tab?.id) {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id, frameIds: [0] },
                func: () => window.innerWidth || document.documentElement?.clientWidth || 0
            });
            const width = Number(result?.[0]?.result || 0);
            if (width > 0) return width;
        } catch {
            // Fall back to the outer Chrome window width if script execution is unavailable.
        }
    }
    if (!tab?.windowId) return 0;
    try {
        const win = await chrome.windows.get(tab.windowId);
        return Number(win?.width || 0);
    } catch {
        return 0;
    }
}

async function isFlowWindowWideEnoughForAssets(tab) {
    const width = await getFlowWindowWidth(tab);
    return width === 0 || width >= MIN_FLOW_WINDOW_WIDTH_PX;
}

async function showFlowWindowTooNarrowPopup(tab) {
    if (!tab?.id) return;
    try {
        await chrome.tabs.sendMessage(tab.id, {
            action: 'SHOW_FLOW_AUTOMATOR_POPUP',
            title: 'Panel Too Narrow',
            message: FLOW_WINDOW_TOO_NARROW_MESSAGE
        }, { frameId: 0 });
        return;
    } catch {
        // Fall back to a direct in-page popup when the content script is not ready yet.
    }

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id, frameIds: [0] },
            args: [FLOW_WINDOW_TOO_NARROW_MESSAGE],
            func: (message) => {
                const popupId = 'flow-automator-inline-popup';
                const existing = document.getElementById(popupId);
                if (existing) existing.remove();

                const overlay = document.createElement('div');
                overlay.id = popupId;
                overlay.setAttribute('role', 'alertdialog');
                overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.45);font-family:Google Sans,Arial,sans-serif;';

                const card = document.createElement('div');
                card.style.cssText = 'width:min(420px,calc(100vw - 48px));border-radius:22px;background:#fff;box-shadow:0 24px 80px rgba(15,23,42,.28);border:1px solid rgba(66,133,244,.22);padding:22px;color:#202124;';

                const title = document.createElement('div');
                title.textContent = 'Panel Too Narrow';
                title.style.cssText = 'font-size:18px;font-weight:800;margin-bottom:10px;color:#1a73e8;';

                const body = document.createElement('div');
                body.textContent = message;
                body.style.cssText = 'font-size:14px;line-height:1.55;color:#3c4043;margin-bottom:18px;';

                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = 'OK';
                button.style.cssText = 'width:100%;height:42px;border:0;border-radius:999px;background:#1a73e8;color:#fff;font-weight:800;font-size:14px;cursor:pointer;';
                button.addEventListener('click', () => overlay.remove(), { once: true });

                card.appendChild(title);
                card.appendChild(body);
                card.appendChild(button);
                overlay.appendChild(card);
                document.documentElement.appendChild(overlay);
                setTimeout(() => {
                    try { button.focus(); } catch { }
                }, 0);
            }
        });
    } catch {
        // Status/log updates still show the same error.
    }
}

async function blockImageDownloaderAction(actionName = 'Image Downloader') {
    const data = await chrome.storage.local.get(FIRESTORE_GATE_CACHE_KEY);
    const gate = data[FIRESTORE_GATE_CACHE_KEY] || {};
    const isDisabled = gate.disabled === true;
    const error = isDisabled ? ACCOUNT_DISABLED_MESSAGE : 'Premium Feature - Unlock Required for Image Downloader.';
    await storage.addLog(`${actionName} blocked: ${error}`, 'error');
    safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'image_downloader_gate', detail: error });
    return { success: false, error };
}

function clampPromptDelaySeconds(settings = {}) {
    let seconds = Number.parseInt(settings.promptDelaySeconds, 10);
    if (!Number.isFinite(seconds)) {
        const legacyMs = Number.parseInt(settings.randomPromptDelayMaxMs, 10);
        seconds = Number.isFinite(legacyMs)
            ? Math.ceil(legacyMs / 1000)
            : DEFAULT_PROMPT_DELAY_SECONDS;
    }
    return Math.min(MAX_PROMPT_DELAY_SECONDS, Math.max(MIN_PROMPT_DELAY_SECONDS, seconds));
}

// Only Professional, with the explicit opt-in toggle on, may override the
// Randomized Delay defaults (jitter seconds, break-every count, break
// min/max minutes). Every other tier always runs on the safe defaults below,
// regardless of whatever values happen to be sitting in storage.
function isRandomizedDelayCustomUnlocked(settings = {}, membership = null) {
    return membership?.tier === 'professional' && settings.randomizedDelayCustomEnabled === true;
}

function getRandomizedDelayJitterMaxSeconds(settings = {}, membership = null) {
    if (!isRandomizedDelayCustomUnlocked(settings, membership)) return PROMPT_DELAY_JITTER_MAX_SECONDS;
    const raw = Number.parseInt(settings.randomizedDelayJitterMaxSeconds, 10);
    return Number.isFinite(raw) ? Math.min(RANDOMIZED_DELAY_JITTER_MAX_SECONDS_CAP, Math.max(0, raw)) : PROMPT_DELAY_JITTER_MAX_SECONDS;
}

function getQueueBreakEveryCount(settings = {}, membership = null) {
    if (!isRandomizedDelayCustomUnlocked(settings, membership)) return DEFAULT_QUEUE_BREAK_EVERY_COUNT;
    const raw = Number.parseInt(settings.randomizedDelayBreakEveryCount, 10);
    return Number.isFinite(raw)
        ? Math.min(RANDOMIZED_DELAY_BREAK_EVERY_COUNT_MAX, Math.max(RANDOMIZED_DELAY_BREAK_EVERY_COUNT_MIN, raw))
        : DEFAULT_QUEUE_BREAK_EVERY_COUNT;
}

// Base delay is now part of the same Randomized Delay unlock as the +Random
// Delay/break values below: Professional with the toggle on can set a custom
// base, everyone else always gets the safe 30s default.
function getPromptDelayMs(settings, membership = null) {
    const baseSeconds = (() => {
        if (membership?.tier === 'starter') return STARTER_FIXED_PROMPT_DELAY_SECONDS;
        if (!isRandomizedDelayCustomUnlocked(settings, membership)) return DEFAULT_PROMPT_DELAY_SECONDS;
        return clampPromptDelaySeconds(settings);
    })();
    const randomDelaySeconds = Math.random() * getRandomizedDelayJitterMaxSeconds(settings, membership);
    return (baseSeconds + randomDelaySeconds) * 1000;
}

function getQueueBreakDurationMs(settings = {}, membership = null) {
    let minMinutes = QUEUE_BREAK_DEFAULT_MIN_MINUTES;
    let maxMinutes = QUEUE_BREAK_DEFAULT_MAX_MINUTES;
    if (isRandomizedDelayCustomUnlocked(settings, membership)) {
        const rawMin = Number.parseFloat(settings.randomizedDelayBreakMinMinutes);
        const rawMax = Number.parseFloat(settings.randomizedDelayBreakMaxMinutes);
        if (Number.isFinite(rawMin) && rawMin >= 0) minMinutes = rawMin;
        if (Number.isFinite(rawMax) && rawMax >= minMinutes) maxMinutes = rawMax;
    }
    const minMs = minMinutes * 60 * 1000;
    const maxMs = maxMinutes * 60 * 1000;
    return minMs + Math.random() * (maxMs - minMs);
}

async function readQueueBreakCounter() {
    const data = await chrome.storage.local.get(QUEUE_BREAK_COUNTER_STORAGE_KEY);
    return Math.max(0, Number(data[QUEUE_BREAK_COUNTER_STORAGE_KEY]) || 0);
}

async function incrementQueueBreakCounter() {
    const next = (await readQueueBreakCounter()) + 1;
    await chrome.storage.local.set({ [QUEUE_BREAK_COUNTER_STORAGE_KEY]: next });
    return next;
}

async function resetQueueBreakCounter() {
    await chrome.storage.local.remove(QUEUE_BREAK_COUNTER_STORAGE_KEY);
}

async function readManualStartCount() {
    const data = await chrome.storage.local.get(MANUAL_START_COUNT_STORAGE_KEY);
    return Math.max(0, Number(data[MANUAL_START_COUNT_STORAGE_KEY]) || 0);
}

async function recordManualStart() {
    const count = await readManualStartCount();
    if (count >= MANUAL_START_REQUIRED_COUNT) return count;
    const next = count + 1;
    await chrome.storage.local.set({ [MANUAL_START_COUNT_STORAGE_KEY]: next });
    return next;
}

// A browser start, extension reload, install, or update must never press
// Create merely because RUNNING was persisted. chrome.storage.session is
// cleared on a full browser restart but survives an MV3 worker being killed
// and restarted while the browser stays open, so it distinguishes "this is
// the very first wake of a new browser session" from "the worker just got
// suspended mid-queue" — only the former forces a manual Start, and only
// until the user has clicked Start manually MANUAL_START_REQUIRED_COUNT times.
async function initializeWorkerSessionQueueState() {
    const sessionState = await chrome.storage.session.get(WORKER_SESSION_INITIALIZED_STORAGE_KEY);
    if (sessionState[WORKER_SESSION_INITIALIZED_STORAGE_KEY] === true) {
        // Keepalive recovery runs only after this initialization promise has
        // settled, so it cannot race an explicit Start request.
        return false;
    }

    await chrome.storage.session.set({ [WORKER_SESSION_INITIALIZED_STORAGE_KEY]: true });
    const manualStartCount = await readManualStartCount();
    if (manualStartCount >= MANUAL_START_REQUIRED_COUNT) {
        // Trust has been established with two prior manual starts — a
        // persisted RUNNING state may resume automatically as normal.
        return false;
    }

    const [state, queue] = await Promise.all([
        storage.getState(),
        storage.getQueue()
    ]);
    if (!shouldPauseOnInitialWorkerSession({ sessionInitialized: false, state, queue })) return false;

    await storage.setState(AUTOMATOR_STATE.PAUSED);
    chrome.alarms.clear('queue-keepalive');
    await storage.addLog('Queue restored in Paused state after the browser or extension started. Click Start to continue.', 'info');
    return false;
}

// ---------------------------------------------------------------------------
// Unusual-activity recovery — when Google Flow blocks three consecutive
// generations, back off with escalating waits, then pause, refresh the Flow
// page once, wait 30s, and resume automatically.
// ---------------------------------------------------------------------------

async function readUnusualActivityRecoveryState() {
    const data = await chrome.storage.local.get(UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY);
    const state = data[UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY];
    return state && typeof state === 'object'
        ? state
        : { phase: 'idle', consecutiveFailures: 0 };
}

function normalizeUnusualActivityCooldownMinutes(value) {
    const minutes = Number(value);
    return Number.isInteger(minutes) && minutes >= 1 && minutes <= 60
        ? minutes
        : DEFAULT_UNUSUAL_ACTIVITY_COOLDOWN_MINUTES;
}

async function readUnusualActivityCooldownMinutes() {
    const data = await chrome.storage.local.get(UNUSUAL_ACTIVITY_COOLDOWN_MINUTES_KEY);
    return normalizeUnusualActivityCooldownMinutes(data[UNUSUAL_ACTIVITY_COOLDOWN_MINUTES_KEY]);
}

async function writeUnusualActivityRecoveryState(state) {
    await chrome.storage.local.set({ [UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY]: state });
}

async function clearUnusualActivityRecoveryState() {
    await chrome.alarms.clear(UNUSUAL_ACTIVITY_RECOVERY_ALARM);
    await chrome.storage.local.remove(UNUSUAL_ACTIVITY_RECOVERY_STORAGE_KEY);
}

function serializeUnusualActivityRecovery(task) {
    const operation = unusualActivityRecoveryOperation.then(task, task);
    unusualActivityRecoveryOperation = operation.catch(() => {});
    return operation;
}

async function cancelUnusualActivityRecovery() {
    const recovery = await readUnusualActivityRecoveryState();
    const wasActive = ['cooldown', 'post_reload', 'armed'].includes(recovery.phase);
    try {
        await clearUnusualActivityRecoveryState();
        if (!wasActive) return { canceled: false };

        // Cooldown recovery is intentionally non-destructive. Canceling resets
        // only its alarm/failure counter and leaves all pending queue items intact.
        await storage.setState(AUTOMATOR_STATE.PAUSED);
        chrome.alarms.clear('queue-keepalive');
        const detail = 'Automatic unusual-activity recovery canceled. Failure counter reset; queue remains paused.';
        safeSendMessage({
            action: 'UPDATE_PROGRESS',
            itemId: 'unusual_activity_recovery',
            detail,
            recoveryPhase: 'canceled'
        });
        await storage.addLog(detail, 'info');
        return { canceled: true };
    } finally {
        unusualActivityRecoveryCancelRequested = false;
    }
}

function unusualActivityRecoveryMessage(state = {}, now = Date.now()) {
    const remainingSeconds = Math.max(0, Math.ceil((Number(state.cooldownUntil || state.resumeAt || 0) - now) / 1000));
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingSecondPart = remainingSeconds % 60;
    const remainingText = `${remainingMinutes} min ${remainingSecondPart} sec`;
    if (state.phase === 'cooldown') {
        return `Waiting to restart. Flow refresh begins in ${remainingText}.`;
    }
    if (state.phase === 'post_reload') {
        return `Preparing to restart. Queue resumes in ${remainingText}.`;
    }
    return '';
}

async function handleUnusualActivityFailure(itemId = 'unusual_activity_recovery') {
    const current = await readUnusualActivityRecoveryState();
    if (current.phase === 'armed') {
        const detail = 'Google Flow failed again after the configured cooldown and page refresh. Queue stopped.';
        await storage.addLog(detail, 'error');
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId, detail });
        await stopQueue();
        return 'stopped';
    }

    const queue = await storage.getQueue();
    if (!queue.some((item) => item.status === QUEUE_STATUS.PENDING)) {
        await clearUnusualActivityRecoveryState();
        return 'no_pending_work';
    }

    const transition = getUnusualActivityFailureTransition(current, Date.now());
    if (transition.action === 'continue') {
        await writeUnusualActivityRecoveryState(transition.state);
        const waitSeconds = Math.max(0, Math.ceil((Number(transition.state.blockUntil || 0) - Date.now()) / 1000));
        await storage.addLog(
            `Google Flow unusual-activity failure ${transition.state.consecutiveFailures}/3. The item was marked failed; waiting ${waitSeconds}s before continuing.`,
            'error'
        );
        return 'continue';
    }

    if (transition.action === 'cooldown') {
        unusualActivityRecoveryCancelRequested = false;
        const cooldownMinutes = await readUnusualActivityCooldownMinutes();
        const recoveryState = {
            ...transition.state,
            recoveryId: crypto.randomUUID(),
            cooldownUntil: Date.now() + cooldownMinutes * 60 * 1000
        };
        await writeUnusualActivityRecoveryState(recoveryState);
        await storage.setState(AUTOMATOR_STATE.PAUSED);
        chrome.alarms.clear('queue-keepalive');
        chrome.alarms.create(UNUSUAL_ACTIVITY_RECOVERY_ALARM, { when: recoveryState.cooldownUntil });
        const detail = `Waiting to restart: three consecutive Google Flow unusual-activity failures were detected. No requests will be sent for ${cooldownMinutes} minute${cooldownMinutes === 1 ? '' : 's'}, then Flow will refresh once.`;
        safeSendMessage({
            action: 'UPDATE_PROGRESS',
            itemId,
            detail,
            recoveryPhase: 'cooldown',
            cooldownUntil: recoveryState.cooldownUntil
        });
        await storage.addLog(detail, 'error');
        return 'cooldown';
    }

    const detail = 'Google Flow failed again after the configured cooldown and page refresh. Queue stopped.';
    await storage.addLog(detail, 'error');
    safeSendMessage({ action: 'UPDATE_PROGRESS', itemId, detail });
    await stopQueue();
    return 'stopped';
}

async function handleUnusualActivityRecoveryAlarm() {
    if (unusualActivityRecoveryCancelRequested) return;
    const recovery = await readUnusualActivityRecoveryState();
    if (!['cooldown', 'post_reload'].includes(recovery.phase) || !recovery.recoveryId) return;

    const deadline = Number(recovery.cooldownUntil || recovery.resumeAt || 0);
    if (!Number.isFinite(deadline) || deadline <= 0) {
        await clearUnusualActivityRecoveryState();
        await storage.setState(AUTOMATOR_STATE.PAUSED);
        const detail = 'Invalid unusual-activity recovery state was cleared. Queue remains paused.';
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'unusual_activity_recovery', detail });
        await storage.addLog(detail, 'error');
        return;
    }
    if (Date.now() < deadline) {
        chrome.alarms.create(UNUSUAL_ACTIVITY_RECOVERY_ALARM, { when: deadline });
        return;
    }

    const queue = await storage.getQueue();
    if (!queue.some((item) => item.status === QUEUE_STATUS.PENDING)) {
        await clearUnusualActivityRecoveryState();
        if (await storage.getState() === AUTOMATOR_STATE.PAUSED) await storage.setState(AUTOMATOR_STATE.IDLE);
        return;
    }

    if (recovery.phase === 'cooldown') {
        const targetTab = await resolveQueueTargetFlowProjectTab();
        if (unusualActivityRecoveryCancelRequested) return;
        const nextState = {
            phase: 'post_reload',
            consecutiveFailures: Math.max(3, Number(recovery.consecutiveFailures) || 0),
            recoveryId: recovery.recoveryId,
            refreshedTabId: targetTab.id,
            resumeAt: Date.now() + UNUSUAL_ACTIVITY_POST_RELOAD_WAIT_MS
        };
        // Persist the one-shot refresh intent before issuing it. If the MV3
        // worker is suspended immediately afterwards, startup restores only
        // the 30-second restart alarm and never refreshes the page twice.
        await writeUnusualActivityRecoveryState(nextState);
        chrome.alarms.create(UNUSUAL_ACTIVITY_RECOVERY_ALARM, { when: nextState.resumeAt });
        const detail = 'Preparing to restart: Flow refreshed once after the configured cooldown. No requests will be sent for another 30 seconds.';
        safeSendMessage({
            action: 'UPDATE_PROGRESS',
            itemId: 'unusual_activity_recovery',
            detail,
            recoveryPhase: 'post_reload',
            resumeAt: nextState.resumeAt
        });
        await storage.addLog(detail, 'info');
        if (unusualActivityRecoveryCancelRequested) return;
        await chrome.tabs.reload(targetTab.id);
        return;
    }

    if (recovery.phase === 'post_reload') {
        if (unusualActivityRecoveryCancelRequested) return;
        await startQueue();
        const latest = await readUnusualActivityRecoveryState();
        if (unusualActivityRecoveryCancelRequested
            || latest.phase !== 'post_reload'
            || latest.recoveryId !== recovery.recoveryId) {
            await pauseQueue();
            return;
        }
        await writeUnusualActivityRecoveryState({
            phase: 'armed',
            consecutiveFailures: Math.max(3, Number(recovery.consecutiveFailures) || 0),
            recoveryId: recovery.recoveryId,
            refreshedTabId: recovery.refreshedTabId || null
        });
        safeSendMessage({
            action: 'UPDATE_PROGRESS',
            itemId: 'unusual_activity_recovery',
            detail: 'Cooldown complete. Queue restarted.',
            recoveryPhase: 'armed'
        });
        await storage.addLog('Queue restarted after the configured cooldown, one Flow refresh, and 30-second wait.', 'info');
    }
}

async function restoreUnusualActivityRecoveryAlarm() {
    const recovery = await readUnusualActivityRecoveryState();
    if (!['cooldown', 'post_reload'].includes(recovery.phase) || !recovery.recoveryId) return false;
    const deadline = Number(recovery.cooldownUntil || recovery.resumeAt || 0);
    if (!Number.isFinite(deadline) || deadline <= 0) {
        await clearUnusualActivityRecoveryState();
        await storage.setState(AUTOMATOR_STATE.PAUSED);
        await storage.addLog('Invalid unusual-activity recovery state was cleared. Queue remains paused.', 'error');
        return false;
    }
    const when = Math.max(Date.now() + 250, deadline);
    chrome.alarms.create(UNUSUAL_ACTIVITY_RECOVERY_ALARM, { when });
    return true;
}

function getMaxConcurrentCount(settings = {}) {
    return 1;
}

function getRetryAfterWaitMs(queue = []) {
    const now = Date.now();
    const retryTimes = queue
        .filter(item => item.status === QUEUE_STATUS.PENDING && Number(item.retryAfterAt || 0) > now)
        .map(item => Number(item.retryAfterAt));
    if (!retryTimes.length) return 0;
    return Math.max(250, Math.min(1000, Math.min(...retryTimes) - now));
}

function isRunnablePendingItem(item) {
    if (item.status !== QUEUE_STATUS.PENDING) return false;
    if (executingItemIds.has(item.id)) return false;
    const retryAfterAt = Number(item.retryAfterAt || 0);
    return !retryAfterAt || retryAfterAt <= Date.now();
}

function canRetryPromptItem(item) {
    return Math.max(0, Number(item.retries) || 0) < MAX_PROMPT_ERROR_RETRIES;
}

function schedulePromptRetry(item, errMsg, delayMs = PROMPT_ERROR_RETRY_DELAY_MS) {
    const retryNumber = Math.max(0, Number(item.retries) || 0) + 1;
    const waitMs = Math.max(3000, Number(delayMs) || PROMPT_ERROR_RETRY_DELAY_MS);
    item.status = QUEUE_STATUS.PENDING;
    item.retries = retryNumber;
    item.error = errMsg;
    item.retryAfterAt = Date.now() + waitMs;
    item.detail = `Retry ${retryNumber}/${MAX_PROMPT_ERROR_RETRIES} scheduled in ${Math.ceil(waitMs / 1000)}s.`;
    delete item.inProgressAt;
    delete item.promptSubmittedAt;
    delete item.quotaCountedAt;
}

function markPromptFailed(item, errMsg) {
    item.status = QUEUE_STATUS.FAILED;
    item.retries = Math.max(Number(item.retries) || 0, MAX_PROMPT_ERROR_RETRIES) + 1;
    item.error = errMsg;
    item.detail = '';
    delete item.retryAfterAt;
    delete item.inProgressAt;
    delete item.promptSubmittedAt;
    delete item.quotaCountedAt;
}

async function countStarterQuotaForSubmittedItem(item = {}) {
    // Idempotent per physical generation attempt. Normal completion, stop and
    // recovery paths all see the same receipt and cannot charge it twice.
    if (!item || item.quotaCountedAt) return false;
    const membership = await getMembershipState().catch(() => null);
    if (!membership || membership.tier !== 'starter' || !membership.uid) return false;
    const effectiveAttemptId = String(item.quotaAttemptId || createStarterQuotaAttemptId(item.id));
    if (!claimQuotaProgressAttempt(effectiveAttemptId)) return false;
    item.quotaCountedAt = Date.now();
    item.quotaAttemptId = effectiveAttemptId;
    await chargeStarterQuotaForAttempt(membership.uid, item.quotaAttemptId);
    return true;
}

async function isQueueStillRunning() {
    return (await storage.getState()) === AUTOMATOR_STATE.RUNNING;
}

async function stopActivePromptSubmissions(itemIds = []) {
    const ids = Array.isArray(itemIds) ? itemIds.filter(Boolean) : [];
    try {
        const tabs = await chrome.tabs.query({});
        const flowTabs = tabs.filter(tab => tab?.id && tab.url && tab.url.startsWith('http') && isAllowedAutomationUrl(tab.url));
        await Promise.all(flowTabs.map(tab => new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'STOP_PROMPT_SUBMISSION',
                itemIds: ids
            }, { frameId: 0 }, () => resolve());
        })));
    } catch {
        // Best effort only; executePrompt also checks the stopped state before submit.
    }
}

function getAssetKey(asset = {}) {
    return getAssetKeys(asset)[0] || '';
}

function getAssetKeys(asset = {}) {
    if (!asset) return [];
    const keys = [];
    const add = (value) => {
        const text = String(value || '').trim();
        if (text && !keys.includes(text)) keys.push(text);
    };
    add(asset.id);
    add(asset.label);
    if (!asset.src) return keys;
    add(asset.src);
    try {
        const url = new URL(asset.src);
        add(url.searchParams.get('name'));
        add(url.searchParams.get('assetId'));
        add(url.searchParams.get('id'));
        add(url.searchParams.get('mediaId'));
        add(url.searchParams.get('filename'));
    } catch {
        // Keep the raw src fallback above.
    }
    add(tryParseAssetNameFromUrl(asset.src));
    return keys;
}

function filterAssetsToAllowedPool(selections = [], allowedPool = []) {
    const allowedKeys = new Set((Array.isArray(allowedPool) ? allowedPool : [])
        .flatMap(getAssetKeys)
        .filter(Boolean));
    if (!allowedKeys.size) return [];
    return (Array.isArray(selections) ? selections : [])
        .filter((asset) => getAssetKeys(asset).some((key) => allowedKeys.has(key)))
        .map((asset) => ({ ...asset }));
}

function assetSelectionsMatchWholePool(selections = [], allowedPool = []) {
    const selectedKeys = new Set((Array.isArray(selections) ? selections : []).map(getAssetKey).filter(Boolean));
    const allowedKeys = new Set((Array.isArray(allowedPool) ? allowedPool : []).map(getAssetKey).filter(Boolean));
    if (!selectedKeys.size || selectedKeys.size !== allowedKeys.size) return false;
    for (const key of allowedKeys) {
        if (!selectedKeys.has(key)) return false;
    }
    return true;
}

function getPerPromptReferenceSelections(item = {}, allowedPool = []) {
    const rawSelections = Array.isArray(item.referenceAssetSelections) ? item.referenceAssetSelections : [];
    if (rawSelections.length > 0 && (!Array.isArray(allowedPool) || allowedPool.length === 0)) {
        return rawSelections.map((asset) => ({ ...asset }));
    }
    const filtered = filterAssetsToAllowedPool(rawSelections, allowedPool);
    const wasExplicitlyEdited = item.perPromptAssetsEdited === true || item.perPromptReferenceAssetsEdited === true;
    if (!wasExplicitlyEdited && assetSelectionsMatchWholePool(filtered, allowedPool)) {
        return [];
    }
    if (rawSelections.length > filtered.length && assetSelectionsMatchWholePool(filtered, allowedPool)) {
        return [];
    }
    return filtered;
}

function getSelectedCharacterPool(settings = {}) {
    const source = Array.isArray(settings.characterAssetSelections) && settings.characterAssetSelections.length
        ? settings.characterAssetSelections
        : (settings.characterAssetSelection ? [settings.characterAssetSelection] : []);
    const seen = new Set();
    const out = [];
    for (const asset of source) {
        const key = getAssetKey(asset);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({ ...asset });
    }
    return out;
}

function getQueueItemCharacterSelections(item = {}, allowedPool = []) {
    const source = Array.isArray(item.characterAssetSelections) && item.characterAssetSelections.length
        ? item.characterAssetSelections
        : (item.characterAssetSelection ? [item.characterAssetSelection] : []);
    if (source.length > 0 && (!Array.isArray(allowedPool) || allowedPool.length === 0)) {
        return source.map((asset) => ({ ...asset }));
    }
    const filtered = filterAssetsToAllowedPool(source, allowedPool);
    return filtered.length || source.length === 0
        ? filtered
        : source.map((asset) => ({ ...asset }));
}

function isRetryablePolicyError(message = '') {
    const text = (message || '').toLowerCase();
    return text.includes('might violate our polic')
        || text.includes('try a different prompt')
        || text.includes('violates our policies');
}

function getPolicyRetryDelayMs() {
    return POLICY_RETRY_MIN_MS
        + Math.floor(Math.random() * (POLICY_RETRY_MAX_MS - POLICY_RETRY_MIN_MS + 1));
}

async function ensureAutomationInjected(tabId, options = {}) {
    const { allFrames = false, retries = 3, delayMs = 500, force = false } = options;

    // A live top-frame handler already has the newest command channel for this
    // extension context. Re-injecting on every queue/download action used to
    // stack anonymous runtime listeners, so one SUBMIT_PROMPT was handled two
    // or three times by the same tab.
    if (!force) {
        const alreadyReady = await new Promise((resolve) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve(false);
            }, 1200);
            chrome.tabs.sendMessage(tabId, { action: 'PING' }, { frameId: 0 }, (response) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                const failed = !!chrome.runtime.lastError;
                resolve(!failed && response?.status === 'READY');
            });
        });
        if (alreadyReady) return true;
    }

    // automation.js tears down the previous copy's global listeners before a
    // replacement initializes. Never clear an init flag behind a live copy.
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId, allFrames },
                files: ['content/automation.js']
            });
            return true;
        } catch (error) {
            if (attempt === retries - 1) {
                throw error;
            }
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    return false;
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            chrome.tabs.onUpdated.removeListener(onUpdated);
            clearTimeout(timer);
            resolve();
        };
        const onUpdated = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                finish();
            }
        };
        const timer = setTimeout(finish, timeoutMs);
        chrome.tabs.onUpdated.addListener(onUpdated);
    });
}

async function resolveQueueTargetFlowProjectTab() {
    const allTabs = await chrome.tabs.query({});
    const flowProjectTabs = allTabs.filter(t => t.url && t.url.startsWith('http') && isFlowProjectPageUrl(t.url));

    if (flowProjectTabs.length > 0) {
        const activeProjectTab = flowProjectTabs.find(t => t.active);
        return activeProjectTab || flowProjectTabs[0];
    }

    const saved = await chrome.storage.local.get(LAST_FLOW_PROJECT_URL_KEY);
    const lastFlowProjectUrl = saved?.[LAST_FLOW_PROJECT_URL_KEY];
    if (lastFlowProjectUrl && isFlowProjectPageUrl(lastFlowProjectUrl)) {
        const reopened = await chrome.tabs.create({ url: lastFlowProjectUrl, active: true });
        await waitForTabComplete(reopened.id, 18000);
        const refreshed = await chrome.tabs.get(reopened.id);
        if (refreshed?.url && isFlowProjectPageUrl(refreshed.url)) {
            await storage.addLog(`Reopened last Flow project tab: ${refreshed.url}`, 'info');
            return refreshed;
        }
    }

    const flowTabs = allTabs.filter(t => t.url && t.url.startsWith('http') && isFlowProjectUrl(t.url));
    if (flowTabs.length > 0) {
        const candidate = flowTabs.find(t => t.active) || flowTabs[0];
        await chrome.tabs.update(candidate.id, { active: true });
        await waitForTabComplete(candidate.id, 8000);
        const refreshed = await chrome.tabs.get(candidate.id);
        if (refreshed?.url && isFlowProjectPageUrl(refreshed.url)) {
            return refreshed;
        }
        throw new Error('Opened Google Flow tab. Please open a project page (/project/<id>) once, then run queue again.');
    }

    const created = await chrome.tabs.create({ url: 'https://labs.google/fx/tools/flow', active: true });
    await waitForTabComplete(created.id, 18000);
    const refreshed = await chrome.tabs.get(created.id);
    if (refreshed?.url && isFlowProjectPageUrl(refreshed.url)) {
        return refreshed;
    }
    throw new Error('Opened Google Flow. Please open or create a project page (/project/<id>) and run queue again.');
}

function sanitizePathSegment(value, fallback = 'Flow_Exports') {
    const cleaned = (value || '')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\.+$/g, '')
        .substring(0, 80);
    return cleaned || fallback;
}

function tryParseAssetNameFromUrl(url = '') {
    try {
        const parsed = new URL(url);
        return parsed.searchParams.get('name') ||
               parsed.searchParams.get('assetId') ||
               parsed.searchParams.get('id') ||
               parsed.searchParams.get('mediaId') ||
               parsed.searchParams.get('filename') ||
               null;
    } catch {
        try {
            const parsed = new URL(url, 'https://labs.google');
            return parsed.searchParams.get('name') ||
                   parsed.searchParams.get('assetId') ||
                   parsed.searchParams.get('id') ||
                   parsed.searchParams.get('mediaId') ||
                   parsed.searchParams.get('filename') ||
                   null;
        } catch {
            return null;
        }
    }
}

function getReferenceAssetKey(asset) {
    if (!asset || typeof asset !== 'object') return '';
    return asset.id || tryParseAssetNameFromUrl(asset.src || '') || '';
}

function dedupeReferenceSelections(selections = []) {
    const out = [];
    const seen = new Set();
    for (const item of Array.isArray(selections) ? selections : []) {
        if (!item || typeof item !== 'object') continue;
        const normalized = {
            id: item.id || null,
            src: item.src || null,
            label: item.label || null,
            sceneTag: item.sceneTag || null,
            queuePrompt: item.queuePrompt || '',
            videoPrompt: item.videoPrompt || ''
        };
        const key = getReferenceAssetKey(normalized);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(normalized);
    }
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

function getProjectFolderName(message, sender) {
    const explicitName = sanitizePathSegment(message?.projectName || '', '');
    if (explicitName) return explicitName;

    const tabTitle = sender?.tab?.title || '';
    const normalizedTitle = tabTitle
        .replace(/\s*-\s*Google Flow.*$/i, '')
        .replace(/\s*-\s*Flow.*$/i, '')
        .replace(/\s*\|\s*Google Flow.*$/i, '')
        .trim();

    return sanitizePathSegment(normalizedTitle, 'Flow_Exports');
}

function inferExtensionFromContentType(contentType = '') {
    const ct = (contentType || '').toLowerCase();
    if (ct.includes('video/mp4')) return 'mp4';
    if (ct.includes('video/webm')) return 'webm';
    if (ct.includes('video/quicktime')) return 'mov';
    if (ct.includes('image/jpeg')) return 'jpg';
    if (ct.includes('image/png')) return 'png';
    if (ct.includes('image/webp')) return 'webp';
    if (ct.includes('image/gif')) return 'gif';
    return null;
}

function inferExtensionFromUrl(url = '') {
    if (!url) return null;
    if (url.startsWith('data:')) {
        const match = url.match(/^data:([^;]+);/i);
        if (match) {
            return inferExtensionFromContentType(match[1]);
        }
    }
    try {
        const parsed = new URL(url, 'https://labs.google');
        const path = parsed.pathname || '';
        const m = path.match(/\.([a-z0-9]{2,5})$/i);
        if (m) return m[1].toLowerCase();
    } catch {
        // Ignore URL parsing errors
    }
    return null;
}

function inferFileExtension(message) {
    const fromUrl = inferExtensionFromUrl(message?.url || message?.dataUrl || '');
    if (fromUrl) return fromUrl;
    const fromContentType = inferExtensionFromContentType(message?.contentType || '');
    if (fromContentType) return fromContentType;
    const mediaType = (message?.mediaType || '').toLowerCase();
    if (mediaType === 'video') return 'mp4';
    if (mediaType === 'image') return 'png';
    return 'png';
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

async function fetchMediaAsDataUrl(url) {
    const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`Fetch failed (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return {
        contentType,
        dataUrl: `data:${contentType};base64,${base64}`
    };
}

function parseSceneNumberFromPrompt(prompt = '') {
    const firstLine = (prompt || '').split(/\n/)[0].trim();
    const m = firstLine.match(/^\s*(?:scene\s*)?(\d{1,3})\s*[:.\-]/i);
    if (!m) return null;
    const num = parseInt(m[1], 10);
    if (!Number.isFinite(num) || num <= 0) return null;
    return num;
}

async function saveDownloadAndTrack(message, sender, defaultBaseName = 'flow_result', options = {}) {
    if (!message?.url && !message?.dataUrl) return;

    const projectFolder = getProjectFolderName(message, sender);
    const sequence = await storage.getNextDownloadNumber(projectFolder);
    const paddedSequence = String(sequence).padStart(3, '0');
    const ext = inferFileExtension(message);

    // Build filename:
    // - Prefer scene number from prompt prefix ("12: ...") or queueIndex
    // - Always include a global sequence to avoid collisions
    const mediaType = (message?.mediaType || '').toLowerCase();
    let filename;
    if (message.filename) {
        filename = message.filename;
    } else {
        const sceneNum =
            parseSceneNumberFromPrompt(message.prompt || '')
            ?? (message.queueIndex != null ? (message.queueIndex + 1) : null);
        const scenePad = sceneNum != null ? String(sceneNum).padStart(3, '0') : '000';
        filename = `${projectFolder}/${scenePad}_${paddedSequence}.${ext}`;
    }
    const downloadSource = message.dataUrl || message.url;

    const downloadId = await chrome.downloads.download({
        url: downloadSource,
        filename,
        conflictAction: 'uniquify',
        saveAs: false
    });

    const record = {
        id: `dl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        projectFolder,
        filename,
        sequence,
        sceneNumber: parseSceneNumberFromPrompt(message.prompt || '') ?? (message.queueIndex != null ? (message.queueIndex + 1) : null),
        downloadId: downloadId ?? null,
        url: message.url || null,
        prompt: message.prompt || defaultBaseName,
        mediaType: (message.mediaType || '').toLowerCase() || 'image',
        tileId: message.tileId || null,
        savedAt: Date.now()
    };

    if (message.dataUrl) {
        record.contentType = message.contentType || 'application/octet-stream';
        record.dataUrl = message.dataUrl;
    } else if (options.embedPayload) {
        const payload = await fetchMediaAsDataUrl(message.url);
        record.contentType = payload.contentType;
        record.dataUrl = payload.dataUrl;
    }

    await storage.addTempDownload(record);
    return record;
}

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Auto-open/close side panel based on URL detection
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
    if (!tab.url) return;

    const isFlow = isAllowedAutomationUrl(tab.url);

    if (isFlow) {
        // Enable side panel for this tab specifically
        await chrome.sidePanel.setOptions({
            tabId,
            path: 'popup/popup.html',
            enabled: true
        });
    } else {
        // Disable for other tabs to "close" it contextually
        await chrome.sidePanel.setOptions({
            tabId,
            enabled: false
        });
    }
});

chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Intercept native downloads (such as page-triggered upscale downloads)
// and rename them using the active queue item's custom outputName.
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    if (activeQueueItems.size > 0) {
        // Only act on downloads NOT initiated by this extension
        const isNative = !item.byExtensionId || item.byExtensionId !== chrome.runtime.id;
        if (isNative) {
            const referrer = (item.referrer || '').toLowerCase();
            const url = (item.url || '').toLowerCase();
            const isFlowDownload = referrer.includes('flow.google') ||
                                   referrer.includes('labs.google') ||
                                   url.includes('googleusercontent.com') ||
                                   url.includes('google.com/labs/flow') ||
                                   url.includes('labs.google.com') ||
                                   url.includes('flow.google.com') ||
                                   url.includes('googlevideo.com');

            if (isFlowDownload) {
                // Pick the best match:
                // 1. Look for recently completed items first (since they are in the grace period and most likely triggered the download)
                // 2. Fall back to the most recently started running/active item
                let bestEntry = null;
                let bestCompletedEntry = null;
                for (const entry of activeQueueItems.values()) {
                    if (entry.completed) {
                        if (!bestCompletedEntry || entry.completedAt > bestCompletedEntry.completedAt) {
                            bestCompletedEntry = entry;
                        }
                    } else {
                        if (!bestEntry || entry.startedAt > bestEntry.startedAt) {
                            bestEntry = entry;
                        }
                    }
                }
                const matchedEntry = bestCompletedEntry || bestEntry;
                const capturedItem = matchedEntry && matchedEntry.item;
                const outputName = capturedItem && String(capturedItem.outputName || '').trim();

                if (outputName) {
                    const originalFilename = item.filename || '';
                    const parts = originalFilename.split('.');
                    const ext = parts.length > 1 ? parts.pop().toLowerCase() : 'png';
                    const explicitFolder = sanitizePathSegment(capturedItem.projectName || '', '');
                    const projectFolder = explicitFolder || 'Flow_Exports';
                    const newFilename = `${projectFolder}/${outputName}.${ext}`;
                    console.log(`[Queue] Intercepted native download. Renaming to: ${newFilename}`);
                    suggest({ filename: newFilename, conflictAction: 'uniquify' });
                    return;
                }
            }
        }
    }
    suggest();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'START':
            // Wait for the one-time worker-session check to resolve first, so
            // a Start click cannot race the "force Paused on first boot" gate.
            workerSessionInitializationPromise
                .catch(() => {})
                .then(() => recordManualStart())
                .then(() => startQueue())
                .then(() => sendResponse({ ok: true }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            return true;
        case 'TRACK_PANEL_OPEN_ANALYTICS':
            sendDailyAnalyticsEvent('panel_open')
                .then((sent) => sendResponse({ ok: true, sent }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            return true;
        case 'PAUSE':
            pauseQueue()
                .then(() => sendResponse({ ok: true }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            return true;
        case 'CANCEL_UNUSUAL_ACTIVITY_RECOVERY':
            unusualActivityRecoveryCancelRequested = true;
            serializeUnusualActivityRecovery(() => cancelUnusualActivityRecovery())
                .then((result) => sendResponse({ ok: true, ...result }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            return true;
        case 'STOP':
            stopQueue()
                .then(() => sendResponse({ ok: true }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            return true;
        case 'SYNC_ACCOUNT_USAGE':
            syncLocalAccountUsageToRemote()
                .then((synced) => sendResponse({ ok: true, synced }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            return true;
        case 'DOWNLOAD_HISTORY':
            (async () => {
                try {
                    if (!(await isPremiumImageDownloaderUnlocked())) {
                        await blockImageDownloaderAction('History download');
                        sendResponse({ ok: false, error: PREMIUM_FEATURE_LOCKED_MESSAGE });
                        return;
                    }
                    startHistoryDownload(message.tabId);
                    sendResponse({ ok: true });
                } catch (error) {
                    sendResponse({ ok: false, error: error?.message || String(error) });
                }
            })();
            return true;
        case 'DOWNLOAD_PAGE':
            (async () => {
                try {
                    if (!(await isPremiumImageDownloaderUnlocked())) {
                        await blockImageDownloaderAction('Page download');
                        sendResponse({ ok: false, error: PREMIUM_FEATURE_LOCKED_MESSAGE });
                        return;
                    }
                    startPageDownload(message.tabId, {
                        selectedIds: message.selectedIds,
                        preferUpscaledDownload: message.preferUpscaledDownload,
                        upscaleQuality: message.upscaleQuality
                    });
                    sendResponse({ ok: true });
                } catch (error) {
                    sendResponse({ ok: false, error: error?.message || String(error) });
                }
            })();
            return true;
        case 'COLLECT_PAGE_IMAGES':
            (async () => {
                try {
                    if (!(await isPremiumImageDownloaderUnlocked())) {
                        sendResponse({ ok: false, error: PREMIUM_FEATURE_LOCKED_MESSAGE });
                        return;
                    }
                    const result = await collectPageDownloadImages(message.tabId);
                    sendResponse(result);
                } catch (error) {
                    sendResponse({ ok: false, error: error?.message || String(error) });
                }
            })();
            return true;
        case 'STOP_HISTORY_DOWNLOAD':
            stopHistoryDownload();
            break;
        case 'HANDSHAKE_ACK':
            if (message.itemId) {
                activeHandshakes.add(message.itemId);
            }
            break;
        case 'FORCE_REINJECT':
            forceReinject();
            break;
        case 'ADD_TO_QUEUE':
            (async () => {
                try {
                    const membership = await getMembershipState();
                    if (membership.disabled) {
                        await storage.addLog(ACCOUNT_DISABLED_MESSAGE, 'error');
                        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'account_disabled_gate', detail: ACCOUNT_DISABLED_MESSAGE });
                        sendResponse({ ok: false, error: ACCOUNT_DISABLED_MESSAGE });
                        return;
                    }
                    if (message.prompt) {
                        await storage.addToQueue(createQueueItem(message.prompt));
                    }
                    sendResponse({ ok: true });
                } catch (error) {
                    sendResponse({ ok: false, error: error?.message || String(error) });
                }
            })();
            return true;
        case 'UPDATE_PROGRESS':
            handleUpdateProgress(message.itemId, message.detail, message.quotaAttemptId)
                .then(() => sendResponse({ ok: true }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            // Keep the service worker alive until the generation-start charge
            // has been persisted and its existing Firestore PATCH completes.
            return true;
        case 'RECORD_DIAGNOSTIC_ERROR':
            storage.addDiagnosticError(message.diagnostic || {})
                .then(() => sendResponse({ ok: true }))
                .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
            return true;
        case 'PROMPT_FINISHED':
            const resolveFn = pendingResolves.get(message.id);
            if (resolveFn) {
                resolveFn(message.result);
                pendingResolves.delete(message.id);
            } else {
                // Fallback for detached/orphaned finished messages (e.g. after SW restart)
                (async () => {
                    const freshQueue = await storage.getQueue();
                    const freshItem = freshQueue.find(i => i.id === message.id);
                    let accountBlockDetected = false;
                    if (freshItem && freshItem.status === QUEUE_STATUS.IN_PROGRESS) {
                        await incrementQueueBreakCounter();
                        if (message.result?.success) {
                            freshItem.status = QUEUE_STATUS.COMPLETED;
                            freshItem.completedAt = Date.now();
                            freshItem.resultUrl = message.result.url || null;
                            freshItem.detail = '';
                            delete freshItem.retryAfterAt;
                            delete freshItem.inProgressAt;

                            const savedName = String(freshItem.outputName || '').trim();
                            if (savedName && freshItem.resultUrl) {
                                try {
                                    const storedSettings = await storage.getSettings();
                                    const existing = Array.isArray(storedSettings.referenceAssets) ? storedSettings.referenceAssets : [];
                                    const lowerName = savedName.toLowerCase();
                                    const filtered = existing.filter(a => String(a.label || '').toLowerCase() !== lowerName);
                                    filtered.push({ id: `gen_${freshItem.id}`, src: freshItem.resultUrl, label: savedName });
                                    await storage.updateSettings({ referenceAssets: filtered });
                                    await storage.addLog(`Saved generated image as reference "@${savedName}" (recovered)`, 'info');
                                } catch (e) {
                                    console.warn('[Queue Recovery] outputName save failed:', e);
                                }
                            }
                        } else {
                            const errMsg = message.result?.error || 'Unknown error';
                            if (message.result?.unusualActivityFailure === true) {
                                await refundStarterQuotaForUnusualActivity(freshItem);
                            }
                            if (message.result?.accountBlocked || message.result?.doNotRetry === true) {
                                markPromptFailed(freshItem, errMsg);
                                accountBlockDetected = message.result?.accountBlocked === true;
                            } else if (canRetryPromptItem(freshItem)) {
                                const retryDelayMs = message.result?.rateLimited
                                    ? Math.max(15000, Number(message.result.cooldownMs) || 45000)
                                    : PROMPT_ERROR_RETRY_DELAY_MS;
                                schedulePromptRetry(freshItem, errMsg, retryDelayMs);
                            } else {
                                markPromptFailed(freshItem, errMsg);
                            }
                        }
                        await storage.setQueue(freshQueue);
                        if (message.result?.success) await clearUnusualActivityRecoveryState();
                        if (accountBlockDetected) await handleUnusualActivityFailure(message.id);
                    }
                })();
            }
            break;
        case 'DOWNLOAD_RESULT':
            (async () => {
                try {
                    if (!(await isImageDownloaderUnlocked())) {
                        await blockImageDownloaderAction('Generated auto-download');
                        return;
                    }
                    if (message.url && !sessionSeenImages.has(message.url)) {
                        // Apply outputName from queue item as download filename
                        const dlMessage = { ...message };
                        if (message.queueIndex != null) {
                            const queue = await storage.getQueue();
                            const queueItem = queue[message.queueIndex];
                            const dlOutputName = String(queueItem?.outputName || '').trim();
                            if (dlOutputName) {
                                const dlExt = inferFileExtension(message);
                                const projectFolder = getProjectFolderName(message, sender);
                                dlMessage.filename = `${projectFolder}/${dlOutputName}.${dlExt}`;
                            }
                        }
                        saveDownloadAndTrack(dlMessage, sender, 'flow_result');
                        sessionSeenImages.add(message.url);
                    }
                } catch (e) {
                    console.error('DOWNLOAD_RESULT failed:', e);
                }
            })();
            break;
        case 'AUTO_COLLECT_DOWNLOAD':
            (async () => {
                try {
                    if (!(await isImageDownloaderUnlocked())) {
                        await blockImageDownloaderAction('Image Downloader');
                        return;
                    }
                    if (message.url && !sessionSeenImages.has(message.tileId || message.url)) {
                        // Match prompt to completed queue item for prompt-order filename
                        const queue = await storage.getQueue();
                        const targetMsgPrompt = normalizePromptForMatch(message.prompt);
                        const matchIdx = targetMsgPrompt
                            ? queue.findIndex(item => {
                                const itemPrompt = normalizePromptForMatch(item.prompt);
                                return itemPrompt.includes(targetMsgPrompt.slice(0, 30)) ||
                                       targetMsgPrompt.includes(itemPrompt.slice(0, 30));
                            })
                            : -1;
                        const enriched = matchIdx >= 0
                            ? { ...message, queueIndex: matchIdx }
                            : message;
                        // Apply outputName from matched queue item as download filename
                        if (matchIdx >= 0) {
                            const acOutputName = String(queue[matchIdx]?.outputName || '').trim();
                            if (acOutputName) {
                                const acExt = inferFileExtension(enriched);
                                const acProjectFolder = getProjectFolderName(enriched, sender);
                                enriched.filename = `${acProjectFolder}/${acOutputName}.${acExt}`;
                            }
                        }
                        saveDownloadAndTrack(enriched, sender, 'flow_gen');
                        sessionSeenImages.add(message.tileId || message.url);
                        if (sessionSeenImages.size > SESSION_SEEN_MAX) {
                            const entries = Array.from(sessionSeenImages);
                            entries.slice(0, SESSION_SEEN_TRIM).forEach(k => sessionSeenImages.delete(k));
                        }
                    }
                } catch (e) {
                    console.error('AUTO_COLLECT_DOWNLOAD failed:', e);
                }
            })();
            break;
        case 'OPEN_PROMPT_QUEUE':
            openPromptQueue(message.prompts || [], sender).then(result => sendResponse({ ok: true, ...result })).catch((error) => {
                sendResponse({ ok: false, error: error.message });
            });
            return true;
        case 'LOAD_FLOW_ASSETS':
            loadFlowAssets(message.tabId).then(result => sendResponse(result)).catch((error) => {
                sendResponse({ ok: false, error: error.message });
            });
            return true;
        case 'LOAD_FLOW_REFERENCE_ASSETS':
            loadFlowReferenceAssets(message.tabId).then(result => sendResponse(result)).catch((error) => {
                sendResponse({ ok: false, error: error.message });
            });
            return true;
        case 'LOAD_FLOW_CHARACTER_ASSETS':
            loadFlowCharacterAssets(message.tabId).then(result => sendResponse(result)).catch((error) => {
                sendResponse({ ok: false, error: error.message });
            });
            return true;
    }
});

async function openPromptQueue(prompts = [], sender = null) {
    const cleanPrompts = Array.isArray(prompts)
        ? prompts.map(p => (p || '').trim()).filter(Boolean)
        : [];

    if (cleanPrompts.length === 0) {
        throw new Error('No prompts provided.');
    }

    const senderTab = sender?.tab && sender.tab.id ? sender.tab : null;
    const allTabs = await chrome.tabs.query({});
    let targetTab = senderTab;
    if (!targetTab) {
        targetTab = allTabs.find(t => t.active && t.url && t.url.startsWith('http') && isAllowedAutomationUrl(t.url));
    }
    if (!targetTab) {
        targetTab = allTabs.find(t => t.url && t.url.startsWith('http') && isAllowedAutomationUrl(t.url));
    }
    if (!targetTab) {
        throw new Error('No compatible tab found for the extension side panel.');
    }

    await chrome.sidePanel.setOptions({
        tabId: targetTab.id,
        path: 'popup/popup.html',
        enabled: true
    });

    if (targetTab.windowId) {
        await chrome.sidePanel.open({ windowId: targetTab.windowId }).catch(() => { });
    }

    const queueItems = cleanPrompts.map(prompt => createQueueItem(prompt));
    await storage.addToQueue(queueItems);
    await storage.addLog(`Imported ${cleanPrompts.length} external prompt(s) into the Flow queue.`, 'info');

    await chrome.storage.local.set({
        flow_external_prompt_queue_request: {
            prompts: cleanPrompts,
            source: sender?.tab?.url || 'external',
            requestedAt: Date.now()
        }
    });

    return { count: cleanPrompts.length, tabId: targetTab.id, queued: true };
}


async function startQueue() {
    const state = await storage.getState();
    if (state === AUTOMATOR_STATE.RUNNING) return;
    await refreshStarterAccessDecision({ force: true }).catch(() => false);
    const settings = await storage.getSettings();
    const queue = await storage.getQueue();
    const membership = await getMembershipState();
    if (membership.disabled) {
        await storage.addLog(ACCOUNT_DISABLED_MESSAGE, 'error');
        await storage.setState(AUTOMATOR_STATE.STOPPED);
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'account_disabled_gate', detail: ACCOUNT_DISABLED_MESSAGE });
        return;
    }
    if (membership.installRestricted) {
        await storage.addLog(STARTER_ACCESS_RESTRICTED_MESSAGE, 'error');
        await storage.setState(AUTOMATOR_STATE.STOPPED);
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'starter_access_gate', detail: STARTER_ACCESS_RESTRICTED_MESSAGE });
        return;
    }
    if (!membership.signedIn) {
        await storage.addLog('Sign in with Google is required before running prompts.', 'error');
        await storage.setState(AUTOMATOR_STATE.STOPPED);
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'login_required_gate', detail: 'Sign in with Google is required before running prompts.' });
        return;
    }
    if (membership.tier === 'starter' && membership.uid) {
        // Enforce the limit before changing state to RUNNING. This is repeated
        // inside processLoop as defense in depth, but doing it here prevents a
        // rapid series of Run clicks from dispatching at the current limit.
        // The popup's Run gate has just refreshed this same user document.
        // Reuse the monotonic local cache here instead of issuing a duplicate
        // Firestore GET; a missing/expired cache still fetches remotely.
        const usage = await getAccountUsageForUid(membership.uid).catch(() => null);
        if (usage && usage.count >= STARTER_ACCOUNT_PROMPT_LIMIT) {
            await storage.addLog(STARTER_QUOTA_REACHED_MESSAGE, 'error');
            await storage.setState(AUTOMATOR_STATE.STOPPED);
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'starter_quota_gate', detail: STARTER_QUOTA_REACHED_MESSAGE });
            return;
        }
    }
    if (runUsesCharacterOrReferenceAssets(settings, queue)) {
        try {
            const targetTab = await resolveQueueTargetFlowProjectTab();
            if (!(await isFlowWindowWideEnoughForAssets(targetTab))) {
                await showFlowWindowTooNarrowPopup(targetTab);
                await storage.addLog(FLOW_WINDOW_TOO_NARROW_MESSAGE, 'error');
                safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'flow_window_width_gate', detail: FLOW_WINDOW_TOO_NARROW_MESSAGE });
                await storage.setState(AUTOMATOR_STATE.STOPPED);
                return;
            }
        } catch {
            // Existing queue execution will show the normal Flow tab error if no project tab exists.
        }
    }
    lastPromptStartAt = 0;
    await storage.setState(AUTOMATOR_STATE.RUNNING);
    await sendDailyAnalyticsEvent('automation_active', { requireRunning: true }).catch(() => false);
    // Keepalive alarm: fires every ~25 s to prevent the service worker from being
    // killed by Chrome between queue items. On each tick we check if the loop died
    // and restart it if needed.
    chrome.alarms.create('queue-keepalive', { periodInMinutes: 0.15 });
    if (!isLooping) processLoop();
}

async function pauseQueue() {
    await storage.setState(AUTOMATOR_STATE.PAUSED);
    chrome.alarms.clear('queue-keepalive');
}

async function stopQueue() {
    await storage.setState(AUTOMATOR_STATE.STOPPED);
    chrome.alarms.clear('queue-keepalive');
    isLooping = false;
    activeQueueItems.clear();
    lastPromptStartAt = 0;

    const pendingIds = Array.from(pendingResolves.keys());
    await stopActivePromptSubmissions(pendingIds);

    const queueBeforeReset = await storage.getQueue();
    const submittedActiveItems = queueBeforeReset.filter((item) =>
        item.status === QUEUE_STATUS.IN_PROGRESS
        && item.promptSubmittedAt
        && !item.quotaCountedAt
    );
    for (const item of submittedActiveItems) {
        await countStarterQuotaForSubmittedItem(item).catch((error) => {
            console.warn('Starter quota count on stop failed:', error);
        });
    }
    if (submittedActiveItems.length > 0) {
        await storage.setQueue(queueBeforeReset);
    }

    // Resolve any pending executePrompt promise so it ends immediately
    for (const [id, resolveFn] of pendingResolves.entries()) {
        resolveFn({ success: false, error: 'Stopped manually' });
    }
    pendingResolves.clear();

    // Explicitly reset any stuck IN_PROGRESS items to PENDING
    const queue = await storage.getQueue();
    let changed = false;
    queue.forEach(item => {
        if (item.status === QUEUE_STATUS.IN_PROGRESS) {
            item.status = QUEUE_STATUS.PENDING;
            item.detail = '';
            changed = true;
        }
    });
    if (changed) {
        await storage.setQueue(queue);
    }
}

// Keepalive alarm handler — restarts the loop if the SW was killed mid-queue
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === UNUSUAL_ACTIVITY_RECOVERY_ALARM) {
        try {
            await serializeUnusualActivityRecovery(() => handleUnusualActivityRecoveryAlarm());
        } catch (error) {
            await clearUnusualActivityRecoveryState().catch(() => {});
            await storage.setState(AUTOMATOR_STATE.STOPPED).catch(() => {});
            const detail = `Unusual-activity recovery failed. Queue stopped: ${error?.message || String(error)}`;
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'unusual_activity_recovery', detail });
            await storage.addLog(detail, 'error').catch(() => {});
        }
        return;
    }
    if (alarm.name !== 'queue-keepalive') return;
    await workerSessionInitializationPromise.catch((error) => {
        console.error('[Queue] worker session initialization failed:', error);
    });
    const state = await storage.getState();
    if (state === AUTOMATOR_STATE.RUNNING && !isLooping) {
        await storage.addLog('Service worker restarted by keepalive alarm — resuming loop.', 'info');
        processLoop();
    } else if (state !== AUTOMATOR_STATE.RUNNING) {
        chrome.alarms.clear('queue-keepalive');
    }
});
// The first worker boot of a browser/extension session restores unfinished
// work as PAUSED. Later MV3 worker wakes in the same session may resume it.
workerSessionInitializationPromise = initializeWorkerSessionQueueState().catch((error) => {
    console.error('[Queue] startup resume failed:', error);
    throw error;
});
restoreUnusualActivityRecoveryAlarm().catch((error) => {
    console.warn('[Queue] unusual-activity recovery restore failed:', error?.message || error);
});

async function startHistoryDownload(preferredTabId = null) {
    const opId = `history_download_${Date.now()}`;
    const settings = await storage.getSettings();
    const selectors = SELECTORS[SUPPORTED_SERVICES.FLOW];

    const allTabs = await chrome.tabs.query({});
    const preferredTab = preferredTabId ? allTabs.find(t => t.id === preferredTabId) : null;
    const preferredOk = preferredTab && preferredTab.url && preferredTab.url.startsWith('http') && isAllowedAutomationUrl(preferredTab.url);
    const targetTab = preferredOk ? preferredTab : allTabs.find(t => t.url && t.url.startsWith('http') && isAllowedAutomationUrl(t.url));

    if (!targetTab) {
        const error = 'No Flow tab found.';
        console.error(error);
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: error });
        safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error } });
        return;
    }

    const targetTabId = targetTab.id;
    await chrome.tabs.update(targetTabId, { active: true });

    try {
        await ensureAutomationInjected(targetTabId, { allFrames: false });
    } catch (error) {
        const message = `History download injection failed: ${error.message}`;
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: message });
        safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error: message } });
        return;
    }

    chrome.tabs.sendMessage(targetTabId, {
        action: 'DOWNLOAD_HISTORY',
        payload: { settings, selectors }
    }, (response) => {
        if (chrome.runtime.lastError) {
            const error = `History download fail: ${chrome.runtime.lastError.message}`;
            console.error(error);
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: error });
            safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error } });
        } else if (response && response.status === 'STARTED') {
            console.log('History download started in tab.');
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: 'History download started...' });
        } else {
            const error = 'History download did not start.';
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: error });
            safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error } });
        }
    });
}

async function collectPageDownloadImages(preferredTabId = null) {
    if (!(await isPremiumImageDownloaderUnlocked())) {
        return { ok: false, error: PREMIUM_FEATURE_LOCKED_MESSAGE };
    }
    const selectors = SELECTORS[SUPPORTED_SERVICES.FLOW];
    const allTabs = await chrome.tabs.query({});
    const preferredTab = preferredTabId ? allTabs.find(t => t.id === preferredTabId) : null;
    const preferredOk = preferredTab && preferredTab.url && preferredTab.url.startsWith('http') && isAllowedAutomationUrl(preferredTab.url);
    const targetTab = preferredOk ? preferredTab : allTabs.find(t => t.url && t.url.startsWith('http') && isAllowedAutomationUrl(t.url));

    if (!targetTab) {
        return { ok: false, error: 'No Flow tab found.' };
    }

    await chrome.tabs.update(targetTab.id, { active: true });
    await ensureAutomationInjected(targetTab.id, { allFrames: false });

    return new Promise((resolve) => {
        chrome.tabs.sendMessage(targetTab.id, {
            action: 'COLLECT_PAGE_IMAGES',
            payload: { selectors }
        }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message });
                return;
            }
            resolve(response?.success
                ? { ok: true, assets: response.assets || [] }
                : { ok: false, error: response?.error || 'Could not scan page images.' });
        });
    });
}

async function startPageDownload(preferredTabId = null, options = {}) {
    const opId = `page_download_${Date.now()}`;
    const settings = await storage.getSettings();
    const selectors = SELECTORS[SUPPORTED_SERVICES.FLOW];

    const allTabs = await chrome.tabs.query({});
    const preferredTab = preferredTabId ? allTabs.find(t => t.id === preferredTabId) : null;
    const preferredOk = preferredTab && preferredTab.url && preferredTab.url.startsWith('http') && isAllowedAutomationUrl(preferredTab.url);
    const targetTab = preferredOk ? preferredTab : allTabs.find(t => t.url && t.url.startsWith('http') && isAllowedAutomationUrl(t.url));

    if (!targetTab) {
        const error = 'No Flow tab found.';
        console.error(error);
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: error });
        safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error } });
        return;
    }

    const targetTabId = targetTab.id;
    await chrome.tabs.update(targetTabId, { active: true });

    try {
        await ensureAutomationInjected(targetTabId, { allFrames: false });
    } catch (error) {
        const message = `Page download injection failed: ${error.message}`;
        safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: message });
        safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error: message } });
        return;
    }

    chrome.tabs.sendMessage(targetTabId, {
        action: 'DOWNLOAD_PAGE',
        payload: {
            settings,
            selectors,
            selectedIds: Array.isArray(options.selectedIds) ? options.selectedIds : [],
            preferUpscaledDownload: options.preferUpscaledDownload === true,
            upscaleQuality: options.upscaleQuality === '2k' ? '2k' : '1k'
        }
    }, (response) => {
        if (chrome.runtime.lastError) {
            const error = `Page download fail: ${chrome.runtime.lastError.message}`;
            console.error(error);
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: error });
            safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error } });
        } else if (response && response.status === 'STARTED') {
            console.log('Page download started in tab.');
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: 'Page download started...' });
        } else {
            const error = 'Page download did not start.';
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: opId, detail: error });
            safeSendMessage({ action: 'PROMPT_FINISHED', id: opId, result: { success: false, error } });
        }
    });
}

async function stopHistoryDownload() {
    const allTabs = await chrome.tabs.query({});
    const targetTab = allTabs.find(t => t.url && t.url.startsWith('http') && isAllowedAutomationUrl(t.url));

    if (targetTab) {
        chrome.tabs.sendMessage(targetTab.id, { action: 'STOP_HISTORY_DOWNLOAD' });
    }
}

async function forceReinject() {
    const allTabs = await chrome.tabs.query({});
    const targetTab = allTabs.find(t => t.url && t.url.startsWith('http') && isAllowedAutomationUrl(t.url));

    if (targetTab) {
        try {
            await ensureAutomationInjected(targetTab.id, { allFrames: false, force: true });
            console.log('Forced re-injection of automation.js');
        } catch (e) {
            console.error('Force re-inject failed:', e);
        }
    }
}

async function handleUpdateProgress(itemId, detail, quotaAttemptId = '') {
    const safeDetail = String(detail || '');
    if (/character skipped|characters? tab not found|video settings failed|selection failed|asset.*not found/i.test(safeDetail)) {
        await storage.addDiagnosticError({ message: safeDetail, context: { source: 'progress' } }).catch(() => {});
    }
    const queue = await storage.getQueue();
    const idx = queue.findIndex(i => i.id === itemId);
    if (idx !== -1) {
        queue[idx].detail = detail;
        if (/prompt submitted/i.test(String(detail || ''))) {
            queue[idx].promptSubmittedAt = Date.now();
            if (!queue[idx].quotaCountedAt) {
                const effectiveAttemptId = String(quotaAttemptId || createStarterQuotaAttemptId(itemId));
                // Duplicate progress messages for the same physical request
                // must not both perform an optimistic local increment.
                if (!claimQuotaProgressAttempt(effectiveAttemptId)) return;
                const membership = await getMembershipState().catch(() => null);
                if (membership?.tier === 'starter' && membership.uid) {
                    queue[idx].quotaCountedAt = Date.now();
                    queue[idx].quotaAttemptId = effectiveAttemptId;
                    // Persist the receipt claim before the network call so a
                    // very fast completion/stop path cannot charge it twice.
                    await storage.setQueue(queue);
                    await chargeStarterQuotaForAttempt(membership.uid, queue[idx].quotaAttemptId);
                    return;
                }
            }
        }
        await storage.setQueue(queue);
    }
}

async function processLoop() {
    isLooping = true;

    // If the SW was killed while an item was IN_PROGRESS, avoid immediately
    // replaying it. A recent item may already have been submitted to Flow.
    const startQueue2 = await storage.getQueue();
    const stuckItems = startQueue2.filter(i => i.status === QUEUE_STATUS.IN_PROGRESS);
    const staleItems = stuckItems.filter((item) => {
        const startedAt = Number(item.inProgressAt || item.startedAt || 0);
        if (!startedAt || (Date.now() - startedAt) <= IN_PROGRESS_RECOVERY_GRACE_MS) return false;
        // If the prompt was actually submitted to Flow recently, give it more time
        // to avoid duplicate submissions when the SW restarts mid-generation.
        const submittedAt = Number(item.promptSubmittedAt || 0);
        if (submittedAt && (Date.now() - submittedAt) <= IN_PROGRESS_RECOVERY_GRACE_MS) return false;
        return true;
    });
    if (staleItems.length > 0 && pendingResolves.size === 0) {
        staleItems.forEach(i => { i.status = QUEUE_STATUS.PENDING; i.detail = ''; });
        await storage.setQueue(startQueue2);
    }

    while (true) {
        const state = await storage.getState();
        if (state !== AUTOMATOR_STATE.RUNNING) {
            isLooping = false;
            break;
        }

        const queue = await storage.getQueue();
        const settings = await storage.getSettings();
        const maxConcurrent = getMaxConcurrentCount(settings);

        // Count both the live promise map and queue state. The promise is only
        // registered after tab/auth setup, so queue state prevents prompt bursts.
        const queueInProgressCount = queue.filter(item => item.status === QUEUE_STATUS.IN_PROGRESS).length;
        const inProgressCount = Math.max(pendingResolves.size, queueInProgressCount);
        if (inProgressCount >= maxConcurrent) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        let currentIdx = queue.findIndex(isRunnablePendingItem);

        if (currentIdx === -1) {
            if (inProgressCount > 0) {
                // Wait for active ones to finish
                await new Promise(r => setTimeout(r, 1000));
                continue;
            } else if (getRetryAfterWaitMs(queue) > 0) {
                await new Promise(r => setTimeout(r, getRetryAfterWaitMs(queue)));
                continue;
            } else {
                await storage.setState(AUTOMATOR_STATE.IDLE);
                stopAutomationAnalyticsPulse();
                isLooping = false;
                break;
            }
        }

        const item = queue[currentIdx];
        await refreshStarterAccessDecision().catch(() => false);
        const membershipForDelay = await getMembershipState().catch(() => ({ tier: 'starter' }));

        if (membershipForDelay.installRestricted) {
            await storage.addLog(STARTER_ACCESS_RESTRICTED_MESSAGE, 'error');
            safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'starter_access_gate', detail: STARTER_ACCESS_RESTRICTED_MESSAGE });
            await storage.setState(AUTOMATOR_STATE.STOPPED);
            isLooping = false;
            break;
        }

        // Starter daily quota: block dispatch once the limit is hit. Paid tiers
        // and active trials skip this entirely.
        if (membershipForDelay.tier === 'starter' && membershipForDelay.uid) {
            const usage = await getAccountUsageForUid(membershipForDelay.uid).catch(() => null);
            if (usage && usage.count >= STARTER_ACCOUNT_PROMPT_LIMIT) {
                await storage.addLog(STARTER_QUOTA_REACHED_MESSAGE, 'error');
                safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'starter_quota_gate', detail: STARTER_QUOTA_REACHED_MESSAGE });
                await storage.setState(AUTOMATOR_STATE.STOPPED);
                isLooping = false;
                break;
            }
        }

        // Batch break: every N processed items (default 20, Professional-
        // customizable), pause a randomized stretch (longer than the normal
        // per-prompt delay), then resume automatically.
        const queueBreakEveryCount = getQueueBreakEveryCount(settings, membershipForDelay);
        const queueBreakCounter = await readQueueBreakCounter();
        if (queueBreakCounter > 0 && queueBreakCounter >= queueBreakEveryCount) {
            await resetQueueBreakCounter();
            const breakMs = getQueueBreakDurationMs(settings, membershipForDelay);
            const formatBreakLabel = (s) => `🛑 Batch break: resuming in ${Math.floor(s / 60)}m ${s % 60}s...`;
            await storage.addLog(
                `Batch break: ${queueBreakEveryCount} items processed, pausing for ${Math.round(breakMs / 1000)}s before continuing.`,
                'info'
            );
            let breakSecondsLeft = Math.ceil(breakMs / 1000);
            const sendBreakCountdown = (s) => safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: item.id, detail: formatBreakLabel(s) });
            sendBreakCountdown(breakSecondsLeft);
            await storage.updateQueueItem(item.id, { detail: formatBreakLabel(breakSecondsLeft) });
            const breakCountdownInterval = setInterval(() => {
                breakSecondsLeft--;
                if (breakSecondsLeft > 0) sendBreakCountdown(breakSecondsLeft);
                else clearInterval(breakCountdownInterval);
            }, 1000);
            await new Promise(r => setTimeout(r, breakMs));
            clearInterval(breakCountdownInterval);
            if ((await storage.getState()) !== AUTOMATOR_STATE.RUNNING) {
                await storage.updateQueueItem(item.id, { detail: '' }).catch(() => {});
                continue;
            }
        }

        const promptDelayMs = getPromptDelayMs(settings, membershipForDelay);
        // A recent unusual-activity failure (1/3 or 2/3) enforces its own
        // escalating minimum wait (1 min, then 2 min) on top of the normal
        // prompt delay, so the queue backs off harder after a Google block.
        const unusualActivityBlockUntil = Number((await readUnusualActivityRecoveryState())?.blockUntil || 0);
        if ((promptDelayMs > 0 && lastPromptStartAt > 0) || unusualActivityBlockUntil > Date.now()) {
            const normalRemainingMs = (promptDelayMs > 0 && lastPromptStartAt > 0)
                ? promptDelayMs - (Date.now() - lastPromptStartAt)
                : 0;
            const unusualActivityRemainingMs = Math.max(0, unusualActivityBlockUntil - Date.now());
            const remainingMs = Math.max(normalRemainingMs, unusualActivityRemainingMs);
            if (remainingMs > 0) {
                let secondsLeft = Math.ceil(remainingMs / 1000);
                await storage.addLog(`Prompt delay: waiting ${secondsLeft}s before the next prompt starts.`, 'info');
                const sendCountdown = (s) => safeSendMessage({ action: 'UPDATE_PROGRESS', itemId: 'prompt_delay', detail: `⏱ Next prompt in ${s}s...` });
                sendCountdown(secondsLeft);
                const countdownInterval = setInterval(() => {
                    secondsLeft--;
                    if (secondsLeft > 0) sendCountdown(secondsLeft);
                    else clearInterval(countdownInterval);
                }, 1000);
                await new Promise(r => setTimeout(r, remainingMs));
                clearInterval(countdownInterval);
                if ((await storage.getState()) !== AUTOMATOR_STATE.RUNNING) {
                    continue;
                }
            }
        }

        item.status = QUEUE_STATUS.IN_PROGRESS;
        item.inProgressAt = Date.now();
        item.detail = '';
        delete item.promptSubmittedAt;
        delete item.quotaCountedAt;
        delete item.quotaAttemptId;
        delete item.quotaRefundedAt;
        await storage.setQueue(queue);

        // Run concurrently (fire and continue loop)
        (async () => {
            const startedAt = Date.now();
            let accountBlockDetected = false;
            try {
                activeQueueItems.set(item.id, { item, startedAt });
                const result = await executePrompt(item, settings);

                const entry = activeQueueItems.get(item.id);
                if (entry) {
                    entry.completed = true;
                    entry.completedAt = Date.now();
                }

                // Critical check: If we were stopped while executePrompt was running,
                // do NOT update the queue item status as it might have been reset by stopQueue()
                const currentState = await storage.getState();
                if (currentState !== AUTOMATOR_STATE.RUNNING) {
                    return;
                }

                const freshQueue = await storage.getQueue();
                const freshItem = freshQueue.find(i => i.id === item.id);
                if (!freshItem) return;

                lastPromptStartAt = Date.now();
                // Every terminal item (success or failure) counts toward the
                // next batch break, regardless of which branch below is taken.
                await incrementQueueBreakCounter();
                if (result.success) {
                    freshItem.status = QUEUE_STATUS.COMPLETED;
                    freshItem.completedAt = Date.now();
                    freshItem.resultUrl = result.url || null;
                    freshItem.detail = '';
                    delete freshItem.retryAfterAt;
                    delete freshItem.inProgressAt;
                    await countStarterQuotaForSubmittedItem(freshItem).catch((error) => {
                        console.warn('Starter quota increment failed:', error);
                    });

                    // If the item has an outputName, register the generated image in the
                    // reference asset library so it can be @mentioned in future prompts.
                    const savedName = String(freshItem.outputName || '').trim();
                    if (savedName && freshItem.resultUrl) {
                        try {
                            const storedSettings = await storage.getSettings();
                            const existing = Array.isArray(storedSettings.referenceAssets) ? storedSettings.referenceAssets : [];
                            const lowerName = savedName.toLowerCase();
                            const filtered = existing.filter(a => String(a.label || '').toLowerCase() !== lowerName);
                            filtered.push({ id: `gen_${freshItem.id}`, src: freshItem.resultUrl, label: savedName });
                            await storage.updateSettings({ referenceAssets: filtered });
                            await storage.addLog(`Saved generated image as reference "@${savedName}"`, 'info');
                        } catch (e) {
                            console.warn('[Queue] outputName save failed:', e);
                        }
                    }
                } else {
                    const errMsg = result.error || 'Unknown error';

                    if (result.unusualActivityFailure === true) {
                        await refundStarterQuotaForUnusualActivity(freshItem);
                    }
                    if (result.accountBlocked || result.doNotRetry === true) {
                        markPromptFailed(freshItem, errMsg);
                        accountBlockDetected = result.accountBlocked === true;
                    } else if (canRetryPromptItem(freshItem)) {
                        const retryDelayMs = result.rateLimited
                            ? Math.max(15000, Number(result.cooldownMs) || 45000)
                            : (isRetryablePolicyError(errMsg) ? getPolicyRetryDelayMs() : PROMPT_ERROR_RETRY_DELAY_MS);
                        schedulePromptRetry(freshItem, errMsg, retryDelayMs);
                        await storage.addLog(
                            `Prompt failed: retry ${freshItem.retries}/${MAX_PROMPT_ERROR_RETRIES} scheduled for "${freshItem.prompt.substring(0, 30)}..." after ${Math.ceil(retryDelayMs / 1000)}s. ${errMsg}`,
                            'info'
                        );
                    } else {
                        markPromptFailed(freshItem, errMsg);
                        await storage.addLog(`Prompt failed after ${MAX_PROMPT_ERROR_RETRIES} retries: "${freshItem.prompt.substring(0, 30)}..." ${errMsg}`, 'error');
                    }
                }

                await storage.setQueue(freshQueue);
                if (result.success) await clearUnusualActivityRecoveryState();
                if (accountBlockDetected) await handleUnusualActivityFailure(item.id);
            } catch (err) {
                const freshQueue = await storage.getQueue();
                const idx = freshQueue.findIndex(i => i.id === item.id);
                if (idx !== -1) {
                    const errMsg = err?.message || 'Unknown error';
                    if (canRetryPromptItem(freshQueue[idx])) {
                        schedulePromptRetry(freshQueue[idx], errMsg, PROMPT_ERROR_RETRY_DELAY_MS);
                        await storage.addLog(
                            `Prompt error: retry ${freshQueue[idx].retries}/${MAX_PROMPT_ERROR_RETRIES} scheduled for "${freshQueue[idx].prompt.substring(0, 30)}..." after ${Math.ceil(PROMPT_ERROR_RETRY_DELAY_MS / 1000)}s. ${errMsg}`,
                            'info'
                        );
                    } else {
                        markPromptFailed(freshQueue[idx], errMsg);
                        await storage.addLog(`Prompt failed after ${MAX_PROMPT_ERROR_RETRIES} retries: "${freshQueue[idx].prompt.substring(0, 30)}..." ${errMsg}`, 'error');
                    }
                    await storage.setQueue(freshQueue);
                }
            } finally {
                const entry = activeQueueItems.get(item.id);
                if (entry && !entry.completed) {
                    entry.completed = true;
                    entry.completedAt = Date.now();
                }
                // Keep entry for a 12-second grace period so delayed native downloads can still be renamed
                setTimeout(() => { activeQueueItems.delete(item.id); }, 12000);
            }
        })();

        await new Promise(r => setTimeout(r, 250));
    }
}



async function loadFlowAssets(preferredTabId = null) {
    if (!preferredTabId) {
        return { ok: false, error: 'No target Flow project tab specified. Activate the correct project tab and try again.' };
    }

    let flowTab = null;
    try {
        flowTab = await chrome.tabs.get(preferredTabId);
    } catch {
        return { ok: false, error: 'The selected Flow project tab is no longer available. Activate it again and retry.' };
    }

    if (!flowTab?.url || !isFlowProjectPageUrl(flowTab.url)) {
        return { ok: false, error: 'The selected tab is not a Google Flow project page. Open the correct project tab and retry.' };
    }

    await chrome.storage.local.set({ [LAST_FLOW_PROJECT_URL_KEY]: flowTab.url });

    // Activate the tab so Flow's click handlers fire correctly
    await chrome.windows.update(flowTab.windowId, { focused: true });
    await chrome.tabs.update(flowTab.id, { active: true });
    // Brief pause to let the tab gain focus
    await new Promise(r => setTimeout(r, 100));

    const assetResult = await chrome.scripting.executeScript({
        target: { tabId: flowTab.id },
        func: () => new Promise((resolve) => {
            function isPanelOpen() {
                const visibleCollectionCards = Array.from(document.querySelectorAll('button'))
                    .filter((btn) => btn.offsetParent !== null)
                    .filter((btn) => {
                        const img = btn.querySelector('img[src*="getMediaUrlRedirect"]');
                        if (!img) return false;
                        const alt = (img.getAttribute('alt') || '').toLowerCase();
                        const text = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        return alt.includes('present in your collection') && (text.includes('add') || text.includes('cancel'));
                    });

                if (visibleCollectionCards.length > 0) return true;

                return Array.from(document.querySelectorAll('div')).some(d =>
                    Array.from(d.querySelectorAll('button')).some(b =>
                        (b.textContent || '').includes('Upload image')
                    )
                );
            }

            function clickAddMediaBtn() {
                const addBtn = Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]'))
                    .filter(b => b.offsetParent !== null)
                    .find(b => (b.querySelector('i')?.textContent || '').trim() === 'add_2')
                    || Array.from(document.querySelectorAll('button'))
                        .find(b => b.offsetParent !== null && (b.textContent || '').includes('Add Media'));
                if (!addBtn) return false;
                const rect = addBtn.getBoundingClientRect();
                const cx = rect.x + rect.width / 2;
                const cy = rect.y + rect.height / 2;
                addBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
                addBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
                addBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
                addBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
                addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
                return true;
            }

            function extractAssetsFromPanel() {
                const panel = Array.from(document.querySelectorAll('div')).find(d =>
                    Array.from(d.querySelectorAll('button')).some(b =>
                        (b.textContent || '').includes('Upload image')
                    )
                );
                const root = panel || document;

                // Only accept collection-media tiles that expose add/cancel buttons.
                // This excludes generated history tiles and video thumbnails, which cannot
                // be used as the video start image selection target.
                const tileButtons = Array.from(root.querySelectorAll('button'))
                    .filter(btn => btn.offsetParent !== null)
                    .filter((btn) => {
                        const img = btn.querySelector('img[src*="getMediaUrlRedirect"]');
                        if (!img) return false;
                        const alt = (img.getAttribute('alt') || '').toLowerCase();
                        const text = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        return alt.includes('present in your collection') && (text.includes('add') || text.includes('cancel'));
                    });

                function extractPromptFromContainer(img) {
                    // Walk up the DOM (max 7 levels) to find a container with prompt text
                    const IGNORE = /^(generated image|upload image|add media|none|\s*)$/i;
                    let node = img.parentElement;
                    for (let i = 0; i < 7 && node; i++, node = node.parentElement) {
                        // Check title / aria-label attributes first
                        const attrText = (node.getAttribute('title') || node.getAttribute('aria-label') || '').trim();
                        if (attrText && !IGNORE.test(attrText)) return attrText;

                        // Look for a direct child text element (e.g. a caption <p> or <span>)
                        for (const child of node.children) {
                            if (child === img) continue;
                            const t = (child.innerText || child.textContent || '').trim();
                            if (t && !IGNORE.test(t) && t.split(' ').length > 1) return t;
                        }
                    }
                    return null;
                }

                return tileButtons.map(btn => {
                    try {
                        const img = btn.querySelector('img[src*="getMediaUrlRedirect"]');
                        if (!img) return null;
                        const url = new URL(img.src, location.href);

                        // Match automation.js by checking all known asset-id parameters.
                        const id = url.searchParams.get('name') ||
                                   url.searchParams.get('assetId') ||
                                   url.searchParams.get('id') ||
                                   url.searchParams.get('mediaId') ||
                                   url.searchParams.get('filename');

                        if (!id) return null;
                        const promptText = extractPromptFromContainer(img);
                        const label = promptText
                            ? promptText.split(/\s+/).slice(0, 10).join(' ')
                            : (id.slice(0, 8) + '...');
                        return { id, src: img.src, label };
                    } catch (e) { return null; }
                }).filter(Boolean);
            }

            // If panel is already open, read it directly
            if (isPanelOpen()) {
                // Wait a tick for any lazy images to settle
                setTimeout(() => {
                    const assets = extractAssetsFromPanel();
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                    if (!assets || assets.length === 0) { resolve({ ok: false, error: 'No assets found in open panel' }); return; }
                    resolve({ ok: true, assets });
                }, 400);
                return;
            }

            // Click Add Media to open the panel
            if (!clickAddMediaBtn()) {
                resolve({ ok: false, error: 'Add Media button not found' });
                return;
            }

            // Poll for panel — retry click once at 2 s if panel still not open
            let tries = 0;
            let retriedClick = false;
            const findPanel = () => {
                if (isPanelOpen()) {
                    // Extra wait for images to finish loading in the panel
                    setTimeout(() => {
                        const assets = extractAssetsFromPanel();
                        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                        if (!assets || assets.length === 0) { resolve({ ok: false, error: 'No assets found' }); return; }
                        resolve({ ok: true, assets });
                    }, 400);
                    return;
                }

                tries++;
                // Retry the click once after ~2 s in case the first one was swallowed
                if (tries === 8 && !retriedClick) {
                    retriedClick = true;
                    clickAddMediaBtn();
                }
                if (tries >= 24) { resolve({ ok: false, error: 'Asset panel did not open (timeout)' }); return; }
                setTimeout(findPanel, 250);
            };
            setTimeout(findPanel, 400);
        })
    });

    if (!assetResult?.[0]?.result?.ok) {
        return { ok: false, error: assetResult?.[0]?.result?.error || 'Failed to read assets' };
    }

    return { ok: true, assets: assetResult[0].result.assets, tabUrl: flowTab.url };
}

async function loadFlowReferenceAssets(preferredTabId = null) {
    if (!preferredTabId) {
        return { ok: false, error: 'No target Flow project tab specified. Activate the correct project tab and try again.' };
    }

    let flowTab = null;
    try {
        flowTab = await chrome.tabs.get(preferredTabId);
    } catch {
        return { ok: false, error: 'The selected Flow project tab is no longer available. Activate it again and retry.' };
    }

    if (!flowTab?.url || !isFlowProjectPageUrl(flowTab.url)) {
        return { ok: false, error: 'The selected tab is not a Google Flow project page. Open the correct project tab and retry.' };
    }

    await chrome.storage.local.set({ [LAST_FLOW_PROJECT_URL_KEY]: flowTab.url });
    await chrome.windows.update(flowTab.windowId, { focused: true });
    await chrome.tabs.update(flowTab.id, { active: true });
    await new Promise(r => setTimeout(r, 250));

    const assetResult = await chrome.scripting.executeScript({
        target: { tabId: flowTab.id },
        func: async () => {
            const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

            function tryParseAssetNameFromUrl(url = '') {
                try {
                    const parsed = new URL(url, location.href);
                    return parsed.searchParams.get('name') ||
                           parsed.searchParams.get('assetId') ||
                           parsed.searchParams.get('id') ||
                           parsed.searchParams.get('mediaId') ||
                           parsed.searchParams.get('filename') ||
                           null;
                } catch {
                    return null;
                }
            }

            function cleanLabel(text = '') {
                const normalizeCandidate = (line) => (line || '')
                    .replace(/^\s*(?:img|image|scene)\s*[-_ ]?\s*\d{1,3}\s*[:\-]?\s*/i, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                const lines = (text || '')
                    .split('\n')
                    .map((line) => normalizeCandidate(line))
                    .filter(Boolean)
                    .filter((line) => !/^(image|stacks|play_circle|videocam|add|cancel)$/i.test(line));

                const isMetadataLike = (line) => {
                    const value = (line || '').trim();
                    if (!value) return true;
                    if (/^[a-f0-9-]{8,}$/i.test(value)) return true;
                    if (/^[a-z0-9_-]+\.(png|jpg|jpeg|webp|gif|mp4|mov)$/i.test(value)) return true;
                    if (/^(img|image|scene)[-_ ]?\d+$/i.test(value)) return true;
                    if (/^(title|prompt|description)\s*[:\-]?$/i.test(value)) return true;
                    if (/^(created|updated)\b/i.test(value)) return true;
                    if (/^(nano banana|imagen)\b/i.test(value)) return true;
                    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value)) return true;
                    return false;
                };

                const scored = lines
                    .filter((line) => !isMetadataLike(line))
                    .map((line) => {
                        const words = line.split(/\s+/).filter(Boolean);
                        const looksLikeSentence = /[,:;]/.test(line) || words.length >= 7;
                        const looksLikeShortTitle = words.length <= 5 && !/[,:;]/.test(line);
                        const score = words.length * 10
                            + Math.min(line.length, 120)
                            + (looksLikeSentence ? 35 : 0)
                            - (looksLikeShortTitle ? 25 : 0);
                        return { line, score };
                    })
                    .sort((a, b) => b.score - a.score);

                return scored[0]?.line || '';
            }

            function extractSceneTag(text = '') {
                const lines = (text || '')
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);

                for (const line of lines) {
                    const normalized = line.replace(/\s+/g, ' ').trim();
                    const match = normalized.match(/\b(?:img\s*[-_ ]?\s*\d{1,3}|image\s*[-_ ]?\s*\d{1,3}|scene\s*[-_ ]?\s*\d{1,3})\b/i)
                        || normalized.match(/\b(?:img|image|scene)\b\s*[:\-]?\s*(\d{1,3})\b/i);
                    if (match) {
                        if (match[1]) {
                            const prefix = normalized.match(/\b(img|image|scene)\b/i)?.[1] || 'Scene';
                            return `${prefix.replace(/^./, (c) => c.toUpperCase())} ${match[1]}`;
                        }
                        return match[0]
                            .replace(/\s+/g, ' ')
                            .replace(/\s*[-_]\s*/g, '-')
                            .trim();
                    }
                }
                return null;
            }

            function getImageViewButton() {
                return Array.from(document.querySelectorAll('button, [role="button"]'))
                    .filter((el) => el.offsetParent !== null)
                    .find((el) => {
                        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
                        return text === 'image view images'
                            || text.endsWith('view images')
                            || aria.includes('view images');
                    }) || null;
            }

            function countVisibleImageTiles() {
                return Array.from(document.querySelectorAll('a[href*="/edit/"] img[src*="getMediaUrlRedirect"]'))
                    .filter((img) => img.offsetParent !== null)
                    .filter((img) => {
                        const alt = (img.getAttribute('alt') || '').toLowerCase();
                        const tile = img.closest('div[role="button"], [data-tile-id], a[href*="/edit/"]');
                        const combined = `${alt} ${tile?.innerText || ''}`.toLowerCase();
                        return !combined.includes('video thumbnail')
                            && !combined.includes('videocam')
                            && !combined.includes('play_circle');
                    }).length;
            }

            async function ensureImageViewSelected() {
                if (countVisibleImageTiles() >= 2) return;
                const imageBtn = getImageViewButton();
                if (!imageBtn) return;

                imageBtn.click();
                for (let i = 0; i < 12; i++) {
                    await sleep(250);
                    if (countVisibleImageTiles() >= 2) return;
                }
            }

            const seen = new Set();
            const assets = [];

            function normalizeLooseText(text = '') {
                return String(text || '')
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            function extractTitleFromTile(tile, img) {
                const source = [
                    tile?.innerText || tile?.textContent || '',
                    img?.getAttribute?.('alt') || ''
                ].join('\n');

                const lines = source
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .filter((line) => !/^(image|stacks|generated image|download|undo|reuse prompt|delete|add)$/i.test(line));

                return lines[0] || '';
            }

            function extractPromptBlocksFromPage() {
                const source = document.body?.innerText || '';
                const blocks = [];
                const regex = /(?:^|\n)delete(?:_forever)?\s*\nDelete\s*\n([\s\S]*?)(?=(?:\nredo\s+Reuse text prompt|\nkeyboard_arrow_down\s+Expand prompt|\nadd\s+Created|\ndelete(?:_forever)?\s*\nDelete\s*\n|\nStart\s+swap_horiz|\nWhat do you want to create\?|$))/gi;

                let match;
                while ((match = regex.exec(source))) {
                    const prompt = String(match[1] || '').trim();
                    if (!prompt) continue;
                    blocks.push({
                        sceneTag: '',
                        prompt
                    });
                }

                console.log('[FlowPromptBlocks]', blocks);
                return blocks;
            }

            function buildTileContextText(tile, img) {
                const candidates = [];
                const pushCandidate = (value) => {
                    const text = (value || '').trim();
                    if (!text) return;
                    candidates.push(text);
                };

                pushCandidate(tile?.innerText || tile?.textContent || '');

                let node = tile;
                for (let depth = 0; depth < 4 && node; depth++, node = node.parentElement) {
                    pushCandidate(node?.getAttribute?.('aria-label') || '');
                    pushCandidate(node?.getAttribute?.('title') || '');
                    pushCandidate(node?.innerText || node?.textContent || '');

                    Array.from(node?.children || []).forEach((child) => {
                        if (child === tile) return;
                        pushCandidate(child.getAttribute?.('aria-label') || '');
                        pushCandidate(child.getAttribute?.('title') || '');
                        pushCandidate(child.innerText || child.textContent || '');
                    });
                }

                if (img) {
                    pushCandidate(img.getAttribute('alt') || '');
                    pushCandidate(img.getAttribute('aria-label') || '');
                    pushCandidate(img.getAttribute('title') || '');
                }

                return candidates.join('\n');
            }

            function extractLabelFromTile(tile, img) {
                return cleanLabel(buildTileContextText(tile, img));
            }

            function collectVisibleAssets() {
                const promptBlocks = extractPromptBlocksFromPage();
                const tileImages = Array.from(document.querySelectorAll('a[href*="/edit/"] img[src*="getMediaUrlRedirect"]'))
                    .filter((img) => img.offsetParent !== null);

                tileImages.forEach((img, index) => {
                    const id = tryParseAssetNameFromUrl(img.src);
                    if (!id || seen.has(id)) return;

                    const alt = (img.getAttribute('alt') || '').toLowerCase();
                    const tile = img.closest('div[role="button"], [data-tile-id], a[href*="/edit/"]');
                    const rawContextText = buildTileContextText(tile, img);
                    const title = extractTitleFromTile(tile, img);
                    const promptBlock = promptBlocks[index] || null;
                    const text = cleanLabel(rawContextText);
                    const sceneTag = promptBlock?.sceneTag || extractSceneTag(rawContextText);
                    const combined = `${alt} ${tile?.innerText || ''}`.toLowerCase();
                    if (combined.includes('video thumbnail') || combined.includes('videocam') || combined.includes('play_circle')) {
                        return;
                    }

                    seen.add(id);
                    assets.push({
                        id,
                        src: img.src,
                        label: promptBlock?.prompt || text || `${id.slice(0, 8)}...`,
                        sceneTag,
                        queuePrompt: promptBlock?.prompt || ''
                    });
                    console.log('[FlowAssetExtract]', {
                        id,
                        title: title || null,
                        sceneTag: sceneTag || null,
                        label: (promptBlock?.prompt || text) || null,
                        matchedPrompt: promptBlock?.prompt || null,
                        contextPreview: rawContextText.slice(0, 500)
                    });
                });
            }

            function getScrollContainers() {
                const containers = [];
                const all = Array.from(document.querySelectorAll('main, section, div'));

                all.forEach((el) => {
                    if (!(el instanceof HTMLElement)) return;
                    if (el.scrollHeight <= el.clientHeight + 80) return;
                    const style = window.getComputedStyle(el);
                    if (!/(auto|scroll)/.test(style.overflowY || '')) return;
                    const tileCount = el.querySelectorAll('a[href*="/edit/"] img[src*="getMediaUrlRedirect"]').length;
                    containers.push({ el, tileCount });
                });

                const docScroller = document.scrollingElement;
                if (docScroller && docScroller.scrollHeight > docScroller.clientHeight + 200) {
                    const docTileCount = document.querySelectorAll('a[href*="/edit/"] img[src*="getMediaUrlRedirect"]').length;
                    containers.push({ el: docScroller, tileCount: docTileCount + 1000 });
                }

                return containers
                    .sort((a, b) => b.tileCount - a.tileCount)
                    .filter((item, index, arr) => arr.findIndex((other) => other.el === item.el) === index)
                    .slice(0, 5)
                    .map((item) => item.el);
            }

            async function collectByScrolling(scroller) {
                const originalTop = scroller.scrollTop;
                const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
                const steps = Math.max(1, Math.min(40, Math.ceil(maxScroll / Math.max(220, scroller.clientHeight * 0.45))));

                scroller.scrollTop = 0;
                await sleep(320);
                collectVisibleAssets();

                for (let step = 1; step <= steps; step++) {
                    const nextTop = Math.round((maxScroll * step) / steps);
                    scroller.scrollTop = nextTop;
                    await sleep(320);
                    collectVisibleAssets();
                }

                scroller.scrollTop = originalTop;
                await sleep(180);
                collectVisibleAssets();
            }

            async function collectByWindowScrolling() {
                const docScroller = document.scrollingElement;
                if (!docScroller) return;

                const originalTop = window.scrollY || docScroller.scrollTop || 0;
                const maxScroll = Math.max(0, docScroller.scrollHeight - window.innerHeight);
                const steps = Math.max(1, Math.min(45, Math.ceil(maxScroll / 240)));

                window.scrollTo({ top: 0, behavior: 'instant' });
                await sleep(350);
                collectVisibleAssets();

                for (let step = 1; step <= steps; step++) {
                    const nextTop = Math.round((maxScroll * step) / steps);
                    window.scrollTo({ top: nextTop, behavior: 'instant' });
                    await sleep(340);
                    collectVisibleAssets();
                }

                window.scrollTo({ top: originalTop, behavior: 'instant' });
                await sleep(180);
                collectVisibleAssets();
            }

            await ensureImageViewSelected();
            collectVisibleAssets();
            await collectByWindowScrolling();
            const scrollers = getScrollContainers();
            for (const scroller of scrollers) {
                await collectByScrolling(scroller);
            }

            return { ok: true, assets };
        }
    });

    if (!assetResult?.[0]?.result?.ok) {
        return { ok: false, error: assetResult?.[0]?.result?.error || 'Failed to read current project images' };
    }

    return { ok: true, assets: assetResult[0].result.assets, tabUrl: flowTab.url };
}

async function loadFlowCharacterAssets(preferredTabId = null) {
    if (!preferredTabId) {
        return { ok: false, error: 'No target Flow project tab specified. Activate the correct project tab and try again.' };
    }

    let flowTab = null;
    try {
        flowTab = await chrome.tabs.get(preferredTabId);
    } catch {
        return { ok: false, error: 'The selected Flow project tab is no longer available. Activate it again and retry.' };
    }

    if (!flowTab?.url || !isFlowProjectPageUrl(flowTab.url)) {
        return { ok: false, error: 'The selected tab is not a Google Flow project page. Open the correct project tab and retry.' };
    }

    await chrome.storage.local.set({ [LAST_FLOW_PROJECT_URL_KEY]: flowTab.url });
    await chrome.windows.update(flowTab.windowId, { focused: true });
    await chrome.tabs.update(flowTab.id, { active: true });
    await new Promise(r => setTimeout(r, 250));

    const assetResult = await chrome.scripting.executeScript({
        target: { tabId: flowTab.id },
        func: async () => {
            const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
            const characterWords = ['character', 'characters', '캐릭터', 'キャラクター', '角色'];

            function norm(text = '') {
                return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
            }

            function tryParseAssetNameFromUrl(url = '') {
                try {
                    const parsed = new URL(url, location.href);
                    return parsed.searchParams.get('name') ||
                           parsed.searchParams.get('assetId') ||
                           parsed.searchParams.get('id') ||
                           parsed.searchParams.get('mediaId') ||
                           parsed.searchParams.get('filename') ||
                           null;
                } catch {
                    return null;
                }
            }

            function fireClick(el) {
                if (!el) return;
                try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch { }
                try { el.focus(); } catch { }
                const r = el.getBoundingClientRect();
                const x = r.left + r.width / 2;
                const y = r.top + r.height / 2;
                el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 1, pointerId: 1 }));
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 1 }));
                el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 0, pointerId: 1 }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 0 }));
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
            }

            function findAddMediaButton() {
                return Array.from(document.querySelectorAll('button[aria-haspopup="dialog"], button, [role="button"]'))
                    .filter((btn) => btn.offsetParent !== null)
                    .find((btn) => {
                        const text = norm(`${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`);
                        const icon = norm(btn.querySelector('i, .google-symbols, .material-icons')?.textContent || '');
                        return icon === 'add_2' || text.includes('add media') || text.includes('add image');
                    }) || null;
            }

            function findPanel() {
                const isMediaPanelCandidate = (el) => {
                    const text = norm(el.innerText || el.textContent || '');
                    const imageCount = el.querySelectorAll('img[src*="getMediaUrlRedirect"]').length;
                    const hasSearch = !!el.querySelector('input[placeholder*="Search" i], input[aria-label*="Search" i], textarea[placeholder*="Search" i]');
                    const hasUploadHints = text.includes('upload') || text.includes('add media') || text.includes('search assets');
                    const hasAssetControls = Array.from(el.querySelectorAll('button, [role="button"], [role="tab"]'))
                        .some((btn) => {
                            const btnText = norm(`${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`);
                            return btnText.includes('upload') || btnText.includes('add media') || btnText.includes('search') || btnText.includes('characters');
                        });
                    return imageCount > 0 || hasSearch || hasUploadHints || hasAssetControls;
                };

                const strongCandidates = Array.from(document.querySelectorAll('[role="dialog"], [data-radix-popper-content-wrapper]'))
                    .filter((el) => el.offsetParent !== null)
                    .filter((el) => {
                        const role = (el.getAttribute('role') || '').toLowerCase();
                        const isDropdownMenu = !!el.querySelector('[role="menuitem"]') && !el.querySelector('img[src*="getMediaUrlRedirect"]');
                        return role === 'dialog' || (!isDropdownMenu && isMediaPanelCandidate(el));
                    });
                const candidates = strongCandidates.length
                    ? strongCandidates
                    : Array.from(document.querySelectorAll('div'))
                        .filter((el) => el.offsetParent !== null)
                        .filter((el) => {
                            const text = norm(el.innerText || el.textContent || '');
                            const hasTabsOrButtons = !!el.querySelector?.('button, [role="tab"], [role="button"]');
                            return hasTabsOrButtons
                                && (text.includes('upload') || text.includes('add') || text.includes('media') || text.includes('character') || text.includes('캐릭터'));
                        });
                return candidates
                    .map((el) => {
                        const text = norm(el.innerText || el.textContent || '');
                        const imageCount = el.querySelectorAll('img[src*="getMediaUrlRedirect"]').length;
                        const controls = el.querySelectorAll('button, [role="tab"], [role="button"]').length;
                        const hasUploadHints = text.includes('upload') || text.includes('add media');
                        const hasCharacterHints = characterWords.some((word) => text.includes(word));
                        return {
                            el,
                            score: imageCount + controls + (hasUploadHints ? 4 : 0) + (hasCharacterHints ? 6 : 0)
                        };
                    })
                    .sort((a, b) => b.score - a.score)[0]?.el || null;
            }

            async function waitForPanel(timeoutMs = 7000) {
                const started = Date.now();
                while (Date.now() - started < timeoutMs) {
                    const panel = findPanel();
                    if (panel) return panel;
                    await sleep(250);
                }
                return null;
            }

            function isCharacterControl(el) {
                if (!el || el.querySelector?.('img')) return false;
                const text = norm(`${el.innerText || el.textContent || ''} ${el.getAttribute?.('aria-label') || ''}`);
                const compact = text.replace(/\s+/g, '');
                const icon = norm(el.querySelector?.('i, .google-symbols, .material-icons')?.textContent || '');
                return text === 'characters'
                    || text === 'character'
                    || icon === 'accessibility_new'
                    || compact === 'accessibility_newcharacters'
                    || compact === 'characterscharacters'
                    || text.includes('캐릭터')
                    || text.includes('キャラクター')
                    || text.includes('角色');
            }

            function isActiveCategoryControl(el) {
                if (!el) return false;
                return el.getAttribute('aria-selected') === 'true'
                    || el.getAttribute('aria-pressed') === 'true'
                    || el.getAttribute('data-state') === 'active'
                    || el.getAttribute('data-state') === 'checked'
                    || el.className?.toString?.().toLowerCase?.().includes('active');
            }

            function findCharacterTab(panel) {
                const scopes = [panel, document].filter(Boolean);
                for (const scope of scopes) {
                    const match = Array.from(scope.querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"], [role="menuitem"], [data-radix-collection-item]'))
                        .filter((btn) => btn.offsetParent !== null)
                        .find(isCharacterControl);
                    if (match) return match;
                }
                return null;
            }

            function findAssetCategoryDropdown(panel) {
                const scopes = [panel, document].filter(Boolean);
                const seen = new Set();
                const candidates = [];
                for (const scope of scopes) {
                    Array.from(scope.querySelectorAll('button[aria-haspopup="menu"], button[aria-haspopup="listbox"], button, [role="button"]'))
                        .forEach((btn) => {
                            if (!btn || seen.has(btn)) return;
                            seen.add(btn);
                            if (btn.offsetParent === null || btn.querySelector('img')) return;
                            if (btn.closest('[data-slate-editor="true"], [data-lexical-editor="true"], [role="textbox"][aria-multiline="true"]')) return;
                            candidates.push({
                                btn,
                                insidePanel: !!(panel && (btn === panel || panel.contains(btn)))
                            });
                        });
                }
                return candidates
                    .map(({ btn, insidePanel }) => {
                    const text = norm(`${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`);
                    const compact = text.replace(/\s+/g, '');
                    const icon = norm(btn.querySelector('i, .google-symbols, .material-icons')?.textContent || '');
                    const hasPopup = !!btn.getAttribute('aria-haspopup') || !!btn.getAttribute('aria-expanded');
                    const isAddMedia = text.includes('add media') || text.includes('add image') || icon === 'add_2';
                    const categoryScore =
                        (insidePanel ? 8 : 0) +
                        (hasPopup ? 4 : 0) +
                        (['all', 'images', 'videos', 'characters'].includes(text) ? 12 : 0) +
                        (['dashboard', 'image', 'videocam', 'accessibility_new'].includes(icon) ? 10 : 0) +
                        ([
                            'dashboardall',
                            'imageimages',
                            'videocamvideos',
                            'accessibility_newcharacters'
                        ].includes(compact) ? 12 : 0) -
                        (isAddMedia ? 40 : 0);
                    return { btn, score: categoryScore };
                })
                    .filter((item) => item.score >= 10)
                    .sort((a, b) => b.score - a.score)[0]?.btn || null;
            }

            function isCharactersCategoryActive(panel) {
                return Array.from((panel || document).querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"]'))
                    .filter((btn) => btn.offsetParent !== null)
                    .some((btn) => isCharacterControl(btn) && isActiveCategoryControl(btn));
            }

            function panelLooksLikeCharacters(panel) {
                const controls = Array.from((panel || document).querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"]'))
                    .filter((btn) => btn.offsetParent !== null && !btn.querySelector('img'));
                const characterControls = controls.filter(isCharacterControl);
                if (!characterControls.length) return false;

                // Wide Flow panels usually expose tabs with active state.
                if (characterControls.some(isActiveCategoryControl)) return true;

                // Compact Flow panels show the selected asset kind as a dropdown button.
                return characterControls.some((btn) => {
                    const ariaHasPopup = (btn.getAttribute('aria-haspopup') || '').toLowerCase();
                    const inTabList = !!btn.closest('[role="tablist"]');
                    return !inTabList && (ariaHasPopup === 'menu' || ariaHasPopup === 'listbox' || ariaHasPopup === 'dialog');
                });
            }

            async function openCharactersCategory(panel) {
                let characterTab = findCharacterTab(panel);
                if (characterTab) {
                    fireClick(characterTab);
                    await sleep(900);
                    return true;
                }

                const dropdown = findAssetCategoryDropdown(panel);
                if (!dropdown) return false;
                fireClick(dropdown);
                await sleep(350);

                characterTab = Array.from(document.querySelectorAll(
                    '[data-radix-popper-content-wrapper] [role="menuitem"], [data-radix-menu-content] [role="menuitem"], [role="menu"] [role="menuitem"], [role="option"], button, [role="button"], [data-radix-collection-item]'
                ))
                    .filter((el) => el.offsetParent !== null)
                    .find(isCharacterControl) || findCharacterTab(document);
                if (!characterTab) return false;
                fireClick(characterTab);
                await sleep(900);
                return true;
            }

            function getTileLabel(tile, img) {
                function cleanAssetLabelLine(value = '') {
                    return String(value || '')
                        .replace(/\b(?:accessibility_new|more_vert|check_circle|radio_button_unchecked|radio_button_checked|person_add|account_circle)\b/gi, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                }
                function isBadAssetLabel(value = '') {
                    const lower = cleanAssetLabelLine(value).toLowerCase();
                    if (!lower) return true;
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
                    return blockedLabels.has(lower)
                        || /^(?:accessibility|more|keyboard|chevron|arrow|add|check|close|delete|edit|image|photo|person|face)(?:_[a-z0-9]+){1,3}$/.test(lower);
                }
                const text = [
                    tile?.innerText || tile?.textContent || '',
                    tile?.getAttribute?.('aria-label') || '',
                    tile?.getAttribute?.('title') || '',
                    img?.getAttribute?.('alt') || ''
                ].join('\n');
                const lines = text
                    .split('\n')
                    .map((line) => cleanAssetLabelLine(line))
                    .filter(Boolean)
                    .filter((line) => !isBadAssetLabel(line))
                    .filter((line) => !/^(cancel)$/i.test(line));
                return lines[0] || '';
            }

            const trigger = findAddMediaButton();
            if (!trigger) return { ok: false, error: 'Add Media button not found.' };
            fireClick(trigger);

            let panel = await waitForPanel();
            if (!panel) return { ok: false, error: 'Asset panel did not open.' };

            const didOpenCharacters = await openCharactersCategory(panel);
            panel = findPanel() || panel;
            if (!didOpenCharacters) {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                return { ok: false, error: 'Characters tab not found. Create a Flow character first, then retry.' };
            }
            const seen = new Set();
            const assets = [];
            const collectCharacters = (scope) => {
                const imgs = Array.from((scope || panel || document).querySelectorAll('img[src*="getMediaUrlRedirect"]'))
                    .filter((img) => img.offsetParent !== null);

                imgs.forEach((img, index) => {
                    const id = tryParseAssetNameFromUrl(img.src);
                    if (!id || seen.has(id)) return;
                    const tile = img.closest('button, [role="button"], [role="option"], [role="gridcell"], li, article, div');
                    seen.add(id);
                    assets.push({
                        id,
                        src: img.src,
                        label: getTileLabel(tile, img) || `Character ${assets.length + index + 1}`,
                        assetType: 'character'
                    });
                });
            };

            const scrollContainers = Array.from((panel || document).querySelectorAll('div, ul, main, section'))
                .filter((el) => el.offsetParent !== null)
                .filter((el) => {
                    const style = window.getComputedStyle(el);
                    return el.scrollHeight > el.clientHeight + 40 && /(auto|scroll|overlay)/.test(style.overflowY || '');
                })
                .sort((a, b) => b.scrollHeight - a.scrollHeight)
                .slice(0, 3);

            collectCharacters(panel || document);
            for (const scroller of scrollContainers) {
                const originalTop = scroller.scrollTop;
                const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
                const steps = Math.max(1, Math.min(12, Math.ceil(maxScroll / Math.max(180, scroller.clientHeight * 0.6))));
                scroller.scrollTop = 0;
                await sleep(220);
                collectCharacters(panel || document);
                for (let step = 1; step <= steps; step++) {
                    scroller.scrollTop = Math.round((maxScroll * step) / steps);
                    await sleep(220);
                    collectCharacters(panel || document);
                }
                scroller.scrollTop = originalTop;
                await sleep(120);
            }


            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            await sleep(150);
            if (!assets.length) {
                return { ok: false, error: 'No characters found in the Characters category. Create a Flow character first, then retry.' };
            }
            return { ok: true, assets };
        }
    });

    if (!assetResult?.[0]?.result?.ok) {
        return { ok: false, error: assetResult?.[0]?.result?.error || 'Failed to read Flow characters' };
    }

    return { ok: true, assets: assetResult[0].result.assets, tabUrl: flowTab.url };
}

// Keep Flow tab active during generation to prevent browser throttling
// Returns a cleanup function to stop the interval
function keepTabActive(tabId) {
    const interval = setInterval(async () => {
        try {
            const state = await storage.getState();
            if (state !== 'running') { clearInterval(interval); return; }
            await chrome.tabs.update(tabId, { active: true });
        } catch (e) { clearInterval(interval); }
    }, 8000);
    return () => clearInterval(interval);
}

async function executePrompt(item, settings) {
    const targetTab = await resolveQueueTargetFlowProjectTab();
    if (!(await isQueueStillRunning())) {
        return { success: false, error: 'Stopped manually' };
    }

    const membershipRunGate = await assertCanRunPromptByMembership();
    if (!membershipRunGate.allowed) {
        await storage.addLog(membershipRunGate.error, 'error');
        return { success: false, error: membershipRunGate.error };
    }

    const membershipState = await getMembershipState();
    // Video mode is Professional-only — a stale/manually-set flowType:'video'
    // from before this gate existed (or from direct storage tampering) must not
    // bypass it.
    const wantsVideo = settings?.flowType === 'video' && membershipState.tier === 'professional';
    let effectiveSettings = {
        ...settings,
        flowType: wantsVideo ? 'video' : 'image',
        flowUpscaleQuality: membershipState.tier === 'professional' ? '4k' : '2k'
    };
    const downloaderUnlocked = await isImageDownloaderUnlocked();
    const perPromptAssetsUnlocked = await isPerPromptAssetsUnlocked();
    const upscaledGeneratedDownloadUnlocked = await isUpscaledGeneratedDownloadUnlocked();

    if (!perPromptAssetsUnlocked) {
        const limited = limitAssetsForPremiumPolicy(effectiveSettings, item, {
            premiumUnlocked: false
        });
        effectiveSettings = limited.settings;
        item = limited.item;
        if (limited.changed) {
            await storage.addLog('Premium not unlocked: character and reference image assets were removed.', 'info');
        }
    }
    effectiveSettings.referenceAssetSelections = perPromptAssetsUnlocked
        ? dedupeReferenceSelections(effectiveSettings.referenceAssetSelections || [])
        : [];
    if (!perPromptAssetsUnlocked) {
        effectiveSettings.characterAssetSelections = [];
        effectiveSettings.characterAssetSelection = null;
        effectiveSettings.perPromptAssetsEnabled = false;
    }

    // Resolve @name mentions in prompt → auto-attach matching assets. Auto
    // @mention is Professional-only.
    const autoMentionGateData = await chrome.storage.local.get([FIREBASE_AUTH_STORAGE_KEY, FIRESTORE_GATE_CACHE_KEY]);
    const autoMentionUnlocked = hasProfessionalTierAccess(autoMentionGateData[FIRESTORE_GATE_CACHE_KEY] || {});
    if (perPromptAssetsUnlocked && autoMentionUnlocked && effectiveSettings.autoMentionEnabled) {
        const promptText = String(item.prompt || '');
        const mentionMatches = [...promptText.matchAll(/@([\w]+)/g)]
            .filter(m => !/^voice$/i.test(m[1]));  // @Voice: is a voice token, not an asset name
        const promptHasMention = mentionMatches.length > 0;

        // First try library-based matching (for users who have pre-loaded assets)
        item = autoBindAssetsByPromptMentions(item, effectiveSettings);
        const matchedRefs = Array.isArray(item.referenceAssetSelections) ? item.referenceAssetSelections.length : 0;
        const matchedChars = Array.isArray(item.characterAssetSelections) ? item.characterAssetSelections.length : 0;

        if (promptHasMention && (matchedRefs > 0 || matchedChars > 0)) {
            await storage.addLog(`@mention: matched from library (ref=${matchedRefs}, char=${matchedChars})`, 'info');
        }

        // If library match found nothing, resolve each @name another way.
        if (promptHasMention && matchedRefs === 0) {
            const mentionNames = mentionMatches.map(m => m[1]);

            // Queue-based resolution: a generated image named via "Save as" is the
            // source of truth even when its referenceAssets registration failed. Look
            // for a completed queue item whose outputName matches the @name and reuse
            // its resultUrl as the reference src — this makes the saved image findable
            // in the panel by URL (reliable) instead of by name (impossible: Flow does
            // not know the user's name for it).
            let queueForMentions = [];
            try { queueForMentions = await storage.getQueue(); } catch (e) { queueForMentions = []; }
            const findSavedImage = (name) => {
                const lower = String(name).toLowerCase();
                const hit = (queueForMentions || []).find(qi =>
                    qi && qi.resultUrl &&
                    String(qi.outputName || '').trim().toLowerCase() === lower);
                return hit || null;
            };

            const resolvedTargets = [];
            const unresolvedNames = [];
            for (const name of mentionNames) {
                const saved = findSavedImage(name);
                if (saved) {
                    resolvedTargets.push({ id: `gen_${saved.id}`, src: saved.resultUrl, label: name });
                } else {
                    // No saved image — fall back to panel name-search (only works if the
                    // name is a Flow-native asset; otherwise it will honestly not attach).
                    resolvedTargets.push({ id: `__MENTION__${name}`, label: name, src: '' });
                    unresolvedNames.push(name);
                }
            }

            item.referenceAssetSelections = resolvedTargets;
            item.perPromptReferenceAssetsEdited = true;
            const resolvedFromQueue = mentionNames.filter(n => !unresolvedNames.includes(n));
            if (resolvedFromQueue.length) {
                await storage.addLog(`@mention: resolved from saved images → [${resolvedFromQueue.join(', ')}]`, 'info');
            }
            if (unresolvedNames.length) {
                await storage.addLog(`@mention: no saved image for [${unresolvedNames.join(', ')}] — searching panel by name`, 'info');
            }
        }

        // Expand the allowed pool so matched/mention assets survive the per-prompt filter.
        if (Array.isArray(item.referenceAssetSelections) && item.referenceAssetSelections.length) {
            effectiveSettings.referenceAssetSelections = dedupeReferenceSelections(item.referenceAssetSelections);
        } else {
            effectiveSettings.referenceAssetSelections = dedupeReferenceSelections(effectiveSettings.referenceAssetSelections || []);
        }
    }

    if (!upscaledGeneratedDownloadUnlocked && effectiveSettings?.flowUpscaledDownload) {
        effectiveSettings = {
            ...effectiveSettings,
            autoDownload: true,
            flowUpscaledDownload: false
        };
        await storage.updateSettings({ autoDownload: true, flowUpscaledDownload: false });
        await storage.addLog('Download 2K Upscaled requires premium access, so it was turned off. Continuing with normal 1K auto-download. If you are already premium, please contact us through the Request Access Form.', 'info');
    }

    if (runUsesCharacterOrReferenceAssets(effectiveSettings, [item]) && !(await isFlowWindowWideEnoughForAssets(targetTab))) {
        await showFlowWindowTooNarrowPopup(targetTab);
        await storage.addLog(FLOW_WINDOW_TOO_NARROW_MESSAGE, 'error');
        await storage.setState(AUTOMATOR_STATE.STOPPED);
        return { success: false, error: FLOW_WINDOW_TOO_NARROW_MESSAGE, windowTooNarrow: true };
    }

    if (!downloaderUnlocked && (effectiveSettings?.autoDownload || effectiveSettings?.flowUpscaledDownload)) {
        effectiveSettings = {
            ...effectiveSettings,
            autoDownload: false,
            flowUpscaledDownload: false
        };
        await storage.updateSettings({ autoDownload: false, flowUpscaledDownload: false });
        await storage.addLog('Auto-download blocked: Google SSO sign-in required for Image Downloader.', 'error');
    }

    if (effectiveSettings?.flowType === 'video') {
        const sanitizedVideoQueue = sanitizeVideoAssetQueue(effectiveSettings.videoAssetQueue || [], effectiveSettings.videoAvailableAssets || []);
        if (sanitizedVideoQueue.length !== dedupeReferenceSelections(effectiveSettings.videoAssetQueue || []).length) {
            effectiveSettings = { ...effectiveSettings, videoAssetQueue: sanitizedVideoQueue };
            await storage.updateSettings({ videoAssetQueue: sanitizedVideoQueue });
            await storage.addLog(`Sanitized video queue before run: ${sanitizedVideoQueue.length} valid asset(s) kept.`, 'info');
        }
    }

    await storage.addLog(`Queue run target tab: ${targetTab.url}`, 'info');
    await chrome.storage.local.set({ [LAST_FLOW_PROJECT_URL_KEY]: targetTab.url });

    const targetTabId = targetTab.id;
    if (!(await isQueueStillRunning())) {
        return { success: false, error: 'Stopped manually' };
    }
    await chrome.tabs.update(targetTabId, { active: true });

    const sendTabMessage = (tabId, message, frameId = undefined) => new Promise((resolve) => {
        const callback = (response) => {
            if (chrome.runtime.lastError) {
                resolve({ ok: false, error: chrome.runtime.lastError.message, response: null });
                return;
            }
            resolve({ ok: true, error: null, response });
        };
        if (typeof frameId === 'number') {
            chrome.tabs.sendMessage(tabId, message, { frameId }, callback);
        } else {
            chrome.tabs.sendMessage(tabId, message, callback);
        }
    });

    const sendTabMessageWithTimeout = (tabId, message, frameId = undefined, timeoutMs = 90000) => new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            resolve({ ok: false, error: 'Timed out waiting for Flow dry run response.', response: null });
        }, timeoutMs);
        sendTabMessage(tabId, message, frameId).then((result) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(result);
        });
    });

    const isVideoRun = effectiveSettings?.flowType === 'video';
    const pingAction = isVideoRun ? 'PING_VIDEO_V2' : 'PING';
    const submitAction = isVideoRun ? 'SUBMIT_VIDEO_PROMPT' : 'SUBMIT_PROMPT';

    if (isVideoRun) {
        await ensureAutomationInjected(targetTabId, { allFrames: false });
        await new Promise(r => setTimeout(r, 400));
    }

    const pingTab = (tabId, timeoutMs = 2200) => new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
            if (!done) resolve(false);
        }, timeoutMs);

        const finalize = (ready) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(ready);
        };

        chrome.tabs.sendMessage(tabId, { action: pingAction }, { frameId: 0 }, (topResp) => {
            if (!chrome.runtime.lastError && topResp?.status === 'READY') {
                finalize(true);
                return;
            }
            chrome.tabs.sendMessage(tabId, { action: pingAction }, (anyResp) => {
                if (chrome.runtime.lastError) {
                    finalize(false);
                    return;
                }
                finalize(!!anyResp && anyResp.status === 'READY');
            });
        });
    });

    let isReady = await pingTab(targetTabId);
    if (!(await isQueueStillRunning())) {
        return { success: false, error: 'Stopped manually' };
    }
    if (!isReady) {
        await ensureAutomationInjected(targetTabId, { allFrames: false });

        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 1000));
            if (!(await isQueueStillRunning())) {
                return { success: false, error: 'Stopped manually' };
            }
            isReady = await pingTab(targetTabId);
            if (isReady) break;
        }
    }

    if (!isReady) {
        return { success: false, error: 'Content script not responding. Reload the Flow tab and ensure the extension has access.' };
    }

    // Keep Flow tab active during generation to prevent throttling/stuck
    const stopKeepActive = keepTabActive(targetTabId);

    return new Promise((resolve) => {
        let handshakeTimeout = null;
        pendingResolves.set(item.id, (result) => {
            if (handshakeTimeout) {
                clearTimeout(handshakeTimeout);
                handshakeTimeout = null;
            }
            activeHandshakes.delete(item.id);
            stopKeepActive();
            resolve(result);
        });

        handshakeTimeout = setTimeout(() => {
            if (!activeHandshakes.has(item.id)) {
                const fn = pendingResolves.get(item.id);
                if (fn) {
                    pendingResolves.delete(item.id);
                    fn({ success: false, error: 'Handshake timeout: Tab is unresponsive.' });
                }
            }
        }, 15000);

        (async () => {
            if (!(await isQueueStillRunning()) || !pendingResolves.has(item.id)) {
                return;
            }

            // Find current queue index for this item (used for prompt-order filename)
            const currentQueue = await storage.getQueue();
            const queueIndex = currentQueue.findIndex(i => i.id === item.id);
            const usePerPromptAssets = effectiveSettings.perPromptAssetsEnabled === true;
            const selectedCharacterPool = getSelectedCharacterPool(effectiveSettings);
            const hasExplicitCharacterOverride = (Array.isArray(item.characterAssetSelections) && item.characterAssetSelections.length > 0)
                || item.perPromptCharacterAssetsEdited === true;
            const hasExplicitReferenceOverride = (Array.isArray(item.referenceAssetSelections) && item.referenceAssetSelections.length > 0)
                || item.perPromptReferenceAssetsEdited === true;
            const usePerPromptCharacters = usePerPromptAssets || hasExplicitCharacterOverride;
            const usePerPromptReferences = usePerPromptAssets || hasExplicitReferenceOverride;
            const perPromptCharacterSelections = usePerPromptCharacters
                ? getQueueItemCharacterSelections(item, selectedCharacterPool)
                : selectedCharacterPool;
            const perPromptCharacterSelection = perPromptCharacterSelections[0] || null;
            const perPromptReferenceSelections = usePerPromptReferences
                ? getPerPromptReferenceSelections(item, effectiveSettings.referenceAssetSelections || [])
                : effectiveSettings.referenceAssetSelections;
            if (hasExplicitCharacterOverride && (item.characterAssetSelections?.length || item.characterAssetSelection) && perPromptCharacterSelections.length === 0) {
                const error = 'Selected character assets could not be prepared for this prompt. The prompt was not sent as text-only.';
                await storage.addLog(error, 'error');
                const fn = pendingResolves.get(item.id);
                if (fn) {
                    pendingResolves.delete(item.id);
                    fn({ success: false, error });
                }
                return;
            }
            if (hasExplicitReferenceOverride && item.referenceAssetSelections?.length > 0 && perPromptReferenceSelections.length === 0) {
                const error = 'Selected reference images could not be prepared for this prompt. The prompt was not sent as text-only.';
                await storage.addLog(error, 'error');
                const fn = pendingResolves.get(item.id);
                if (fn) {
                    pendingResolves.delete(item.id);
                    fn({ success: false, error });
                }
                return;
            }
            if (perPromptCharacterSelections.length || perPromptReferenceSelections.length) {
                await storage.addLog(
                    `Submitting prompt with ${perPromptCharacterSelections.length} character asset(s) and ${perPromptReferenceSelections.length} reference image(s).`,
                    'info'
                );
            }
            const {
                referenceAssets,
                ...safeEffectiveSettings
            } = effectiveSettings;

            const usePerPromptModel = effectiveSettings.videoPerPromptModelEnabled === true;
            const sanitizedVideoSettings = isVideoRun ? sanitizeVideoSettings({
                videoMode: (usePerPromptModel && item.videoMode) || effectiveSettings.videoMode || null,
                videoModel: (usePerPromptModel && item.videoModel) || effectiveSettings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
                videoDurationSeconds: (usePerPromptModel && item.videoDurationSeconds) || effectiveSettings.videoDurationSeconds,
                videoEndFrameSelection: item.videoEndFrameSelection || null,
                videoVoiceReference: item.videoVoiceReference || effectiveSettings.videoVoiceReference || '',
                prompt: item.prompt || ''
            }) : null;
            const quotaAttemptId = createStarterQuotaAttemptId(item.id);
            await storage.updateQueueItem(item.id, { quotaAttemptId });

            const payload = {
                action: submitAction,
                payload: {
                    itemId: item.id,
                    quotaAttemptId,
                    prompt: item.prompt,
                    outputName: item.outputName || '',
                    settings: {
                        ...safeEffectiveSettings,
                        queueIndex,
                        // Explicit queue-item asset overrides must win over global assets.
                        characterAssetSelections: perPromptCharacterSelections,
                        characterAssetSelection: perPromptCharacterSelection,
                        referenceAssetSelections: perPromptReferenceSelections,
                        referenceAssetId: perPromptReferenceSelections?.[0]?.id || null,
                        referenceAssetSrc: perPromptReferenceSelections?.[0]?.src || null,
                        // Pass the per-queue video start image and original index through settings.
                        videoStartImage: item.videoStartImage || null,
                        videoOriginalIndex: item.videoOriginalIndex ?? null,
                        ...(isVideoRun && sanitizedVideoSettings ? {
                            videoMode: sanitizedVideoSettings.videoMode,
                            videoModel: sanitizedVideoSettings.videoModel,
                            videoDurationSeconds: sanitizedVideoSettings.videoDurationSeconds,
                            videoAspectRatio: effectiveSettings.videoAspectRatio || '9:16',
                            videoVoiceReference: sanitizedVideoSettings.videoVoiceReference,
                            videoVoiceToken: sanitizedVideoSettings.videoVoiceToken,
                            videoCapabilityWarnings: sanitizedVideoSettings.warnings,
                            videoIngredientSelections: item.videoIngredientSelections || [],
                            videoStartImage: item.videoStartImage || item.videoStartFrameSelection || null,
                            videoStartFrameSelection: item.videoStartFrameSelection || null,
                            videoEndFrameSelection: sanitizedVideoSettings.videoEndFrameSelection,
                            videoOriginalIndex: item.videoOriginalIndex ?? null,
                            dryRunVideoSetup: effectiveSettings.dryRunVideoSetup === true
                        } : {})
                    },
                    selectors: SELECTORS[SUPPORTED_SERVICES.FLOW]
                }
            };

            if (!(await isQueueStillRunning()) || !pendingResolves.has(item.id)) {
                return;
            }

            if (isVideoRun && payload.payload.settings?.dryRunVideoSetup === true) {
                await storage.addLog('Starting video dry run setup. Create will not be pressed.', 'info');
                const dryRunResult = await sendTabMessageWithTimeout(targetTabId, {
                    ...payload,
                    action: 'VIDEO_DRY_RUN'
                }, 0, 120000);
                const fn = pendingResolves.get(item.id);
                const dryRunSuccess = dryRunResult.ok && dryRunResult.response?.success;
                const dryRunError = !dryRunSuccess
                    ? (dryRunResult.response?.error || 'Video dry run did not complete.')
                    : null;
                if (fn) {
                    pendingResolves.delete(item.id);
                    fn(dryRunSuccess
                        ? { success: true, dryRun: true, result: dryRunResult.response?.result }
                        : { success: false, error: dryRunError });
                }
                return;
            }

            await sendTabMessage(targetTabId, { action: 'CLEAR_PROMPT_SUBMISSION_STOP', itemId: item.id }, 0);
            if (!(await isQueueStillRunning()) || !pendingResolves.has(item.id)) {
                return;
            }

            const topResult = await sendTabMessage(targetTabId, payload, 0);
            if (topResult.ok && topResult.response?.status === 'STARTED') {
                activeHandshakes.add(item.id);
                clearTimeout(handshakeTimeout);
                return;
            }

            const topError = topResult.ok
                ? (topResult.response?.error || 'Top-frame submit not started.')
                : topResult.error;
            await storage.addLog(`Submit retry in all frames: ${topError}`, 'info');

            if (!activeHandshakes.has(item.id)) {
                clearTimeout(handshakeTimeout);
                const finalError = topError || 'Submit rejected before start.';
                const fn = pendingResolves.get(item.id);
                if (fn) {
                    pendingResolves.delete(item.id);
                    fn({ success: false, error: finalError });
                } else {
                    stopKeepActive();
                    resolve({ success: false, error: finalError });
                }
            }
        })().catch((error) => {
            clearTimeout(handshakeTimeout);
            const finalError = error?.message || String(error || 'Prompt submission failed.');
            const fn = pendingResolves.get(item.id);
            if (fn) {
                pendingResolves.delete(item.id);
                fn({ success: false, error: finalError });
            } else {
                stopKeepActive();
                resolve({ success: false, error: finalError });
            }
        });
    });
}
