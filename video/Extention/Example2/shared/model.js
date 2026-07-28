/**
 * Flow Prompt Automator - Data Models
 */

export const QUEUE_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

export const AUTOMATOR_STATE = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPED: 'stopped'
};

export const SUPPORTED_SERVICES = {
    FLOW: 'flow'
};

export const SERVICE_CONFIGS = {
    [SUPPORTED_SERVICES.FLOW]: {
        name: 'Google Flow',
        url: 'labs.google/fx/tools/flow',
        altUrl: 'flow.google'
    }
};

export const FLOW_MODELS = {
    NANO_BANANA_PRO: 'Nano Banana Pro',
    NANO_BANANA_2: 'Nano Banana 2',
    NANO_BANANA_2_LITE: 'Nano Banana 2 Lite'
};

export const FLOW_VIDEO_MODES = {
    FRAMES: 'frames',
    INGREDIENTS: 'ingredients'
};

export const FLOW_VIDEO_MODELS = {
    OMNI_FLASH: 'Omni Flash',
    VEO_3_1_LITE: 'Veo 3.1 - Lite',
    VEO_3_1_FAST: 'Veo 3.1 - Fast',
    VEO_3_1_QUALITY: 'Veo 3.1 - Quality'
};

export const FLOW_VIDEO_DURATIONS = [4, 6, 8, 10];

export const FLOW_VIDEO_CAPABILITIES = {
    [FLOW_VIDEO_MODELS.OMNI_FLASH]: {
        modes: [FLOW_VIDEO_MODES.INGREDIENTS, FLOW_VIDEO_MODES.FRAMES],
        durationsByMode: {
            [FLOW_VIDEO_MODES.INGREDIENTS]: [4, 6, 8, 10],
            [FLOW_VIDEO_MODES.FRAMES]: [4, 6, 8, 10]
        },
        allowEndFrame: false,
        voiceModes: [FLOW_VIDEO_MODES.INGREDIENTS]
    },
    [FLOW_VIDEO_MODELS.VEO_3_1_LITE]: {
        modes: [FLOW_VIDEO_MODES.INGREDIENTS, FLOW_VIDEO_MODES.FRAMES],
        durationsByMode: {
            [FLOW_VIDEO_MODES.INGREDIENTS]: [8],
            [FLOW_VIDEO_MODES.FRAMES]: [4, 6, 8]
        },
        allowEndFrame: true,
        voiceModes: []
    },
    [FLOW_VIDEO_MODELS.VEO_3_1_FAST]: {
        modes: [FLOW_VIDEO_MODES.INGREDIENTS, FLOW_VIDEO_MODES.FRAMES],
        durationsByMode: {
            [FLOW_VIDEO_MODES.INGREDIENTS]: [8],
            [FLOW_VIDEO_MODES.FRAMES]: [4, 6, 8]
        },
        allowEndFrame: true,
        voiceModes: []
    },
    [FLOW_VIDEO_MODELS.VEO_3_1_QUALITY]: {
        modes: [FLOW_VIDEO_MODES.FRAMES],
        durationsByMode: {
            [FLOW_VIDEO_MODES.FRAMES]: [8]
        },
        allowEndFrame: true,
        voiceModes: []
    }
};

export const FLOW_CREDIT_ESTIMATES = {
    [FLOW_VIDEO_MODELS.OMNI_FLASH]: {
        byDuration: { 4: 15, 6: 20, 8: 25, 10: 30 }
    },
    [FLOW_VIDEO_MODELS.VEO_3_1_LITE]: { perOutput: 10 },
    [FLOW_VIDEO_MODELS.VEO_3_1_FAST]: { perOutput: 20 },
    [FLOW_VIDEO_MODELS.VEO_3_1_QUALITY]: { perOutput: 100 }
};

export function isOmniFlashVideoModel(model) {
    return String(model || '').trim().toLowerCase() === FLOW_VIDEO_MODELS.OMNI_FLASH.toLowerCase();
}

export function getVideoCapabilities(model) {
    return FLOW_VIDEO_CAPABILITIES[model] || FLOW_VIDEO_CAPABILITIES[FLOW_VIDEO_MODELS.VEO_3_1_FAST];
}

export function getSupportedVideoDurations(model, mode = FLOW_VIDEO_MODES.INGREDIENTS) {
    const capabilities = getVideoCapabilities(model);
    return capabilities.durationsByMode?.[mode] || capabilities.durationsByMode?.[FLOW_VIDEO_MODES.INGREDIENTS] || [8];
}

function chooseSupportedVideoDuration(requestedDuration, supportedDurations = []) {
    const durations = supportedDurations.length ? supportedDurations : [8];
    const requested = Number(requestedDuration);
    if (durations.includes(requested)) return requested;
    if (durations.includes(8)) return 8;
    if (Number.isFinite(requested)) {
        return durations
            .slice()
            .sort((a, b) => Math.abs(a - requested) - Math.abs(b - requested))[0];
    }
    return durations[0];
}

export function normalizeVoiceReference(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return '';
    }
    const colonMatch = raw.match(/^@voice\s*:\s*(.*)$/i);
    if (colonMatch) {
        return `@Voice: ${colonMatch[1].trim()}`;
    }
    if (/^@voice$/i.test(raw)) {
        return '@Voice';
    }
    return `@Voice: ${raw.replace(/^@voice\s*/i, '').replace(/^@+/, '').trim()}`;
}

export function isVideoVoiceAllowed(model, mode) {
    const capabilities = getVideoCapabilities(model);
    return Boolean(capabilities.voiceModes?.includes(mode));
}

export function sanitizeVideoSettings(settings = {}) {
    const warnings = [];
    const requestedModel = settings.videoModel || settings.model || FLOW_VIDEO_MODELS.VEO_3_1_FAST;
    const videoModel = FLOW_VIDEO_CAPABILITIES[requestedModel] ? requestedModel : FLOW_VIDEO_MODELS.VEO_3_1_FAST;
    if (videoModel !== requestedModel) {
        warnings.push(`Unsupported video model "${requestedModel}" was changed to ${videoModel}.`);
    }

    const capabilities = getVideoCapabilities(videoModel);
    const requestedMode = settings.videoMode || settings.mode || FLOW_VIDEO_MODES.INGREDIENTS;
    const videoMode = capabilities.modes.includes(requestedMode) ? requestedMode : capabilities.modes[0];
    if (videoMode !== requestedMode) {
        warnings.push(`Unsupported video mode "${requestedMode}" was changed to ${videoMode}.`);
    }

    const durations = getSupportedVideoDurations(videoModel, videoMode);
    const defaultDuration = durations.includes(8) ? 8 : durations[0];
    const requestedDuration = Number(settings.videoDurationSeconds || settings.durationSeconds || defaultDuration);
    const videoDurationSeconds = chooseSupportedVideoDuration(requestedDuration, durations);
    if (requestedDuration && videoDurationSeconds !== requestedDuration) {
        warnings.push(`${videoModel} ${videoMode} supports ${durations.join('/')}s only. Duration was changed to ${videoDurationSeconds}s.`);
    }

    let videoEndFrameSelection = settings.videoEndFrameSelection || settings.endFrameSelection || null;
    if (!capabilities.allowEndFrame && videoEndFrameSelection) {
        warnings.push(`${videoModel} does not support an end frame. End frame will be ignored.`);
        videoEndFrameSelection = null;
    }

    const rawVoiceReference = settings.videoVoiceReference || settings.voiceReference || '';
    const videoVoiceToken = normalizeVoiceReference(rawVoiceReference);
    const voiceAllowed = isVideoVoiceAllowed(videoModel, videoMode);
    const videoVoiceReference = voiceAllowed ? videoVoiceToken : rawVoiceReference;
    if (videoVoiceToken && !voiceAllowed) {
        warnings.push('Voice references are supported only for Omni Flash Ingredients. Saved voice will be ignored for this item.');
    }

    // Check prompt text for voice mentions if voice is NOT allowed
    const promptText = String(settings.prompt || settings.videoPrompt || '');
    if (promptText && !voiceAllowed && /(?:^|[^a-zA-Z0-9_])@voice/i.test(promptText)) {
        warnings.push('Voice references (@Voice) are supported only for Omni Flash Ingredients. Using it with this model/mode will cause an error.');
    }

    const dynamicWarning = capabilities.dynamicWarnings?.[videoMode];
    if (dynamicWarning) {
        warnings.push(dynamicWarning);
    }

    return {
        videoMode,
        videoModel,
        videoDurationSeconds,
        videoEndFrameSelection,
        videoVoiceReference,
        videoVoiceToken: voiceAllowed ? videoVoiceToken : '',
        voiceAllowed,
        allowEndFrame: capabilities.allowEndFrame,
        supportedDurations: durations,
        warnings
    };
}

export function estimateVideoCredits(settings = {}) {
    const sanitized = sanitizeVideoSettings(settings);
    const estimate = FLOW_CREDIT_ESTIMATES[sanitized.videoModel] || null;
    if (!estimate) {
        return { credits: null, perOutput: null, isEstimate: true, warnings: sanitized.warnings };
    }
    const perOutput = estimate.byDuration
        ? estimate.byDuration[sanitized.videoDurationSeconds] || null
        : estimate.perOutput;
    const quantity = Math.max(1, Number(settings.flowQuantity || settings.quantity || 1) || 1);
    return {
        credits: perOutput == null ? null : perOutput * quantity,
        perOutput,
        outputs: quantity,
        isEstimate: true,
        warnings: sanitized.warnings
    };
}

export function estimateImageCredits(settings = {}) {
    const model = settings.flowModel || FLOW_MODELS.NANO_BANANA_2;
    const perOutput = MODEL_SPECS[model]?.cost ?? 0;
    const quantity = Math.max(1, Number(settings.flowQuantity || settings.quantity || 1) || 1);
    return {
        credits: perOutput * quantity,
        perOutput,
        outputs: quantity,
        isEstimate: true,
        warnings: []
    };
}

export function estimateQueueItemCredits(item = {}, settings = {}) {
    const isVideoItem = item.videoPrompt
        || item.videoMode
        || item.videoModel
        || item.videoIngredientSelections?.length
        || item.videoStartFrameSelection
        || item.videoEndFrameSelection;
    if (isVideoItem) {
        return estimateVideoCredits({
            ...settings,
            videoMode: item.videoMode || settings.videoMode,
            videoModel: item.videoModel || settings.videoModel,
            videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
            videoEndFrameSelection: item.videoEndFrameSelection || null,
            videoVoiceReference: item.videoVoiceReference || ''
        });
    }
    return estimateImageCredits(settings);
}

export function estimateQueueCredits(queue = [], settings = {}) {
    const activeStatuses = new Set([QUEUE_STATUS.PENDING, QUEUE_STATUS.FAILED, QUEUE_STATUS.IN_PROGRESS]);
    const items = Array.isArray(queue) ? queue.filter(item => activeStatuses.has(item?.status || QUEUE_STATUS.PENDING)) : [];
    return items.reduce((summary, item) => {
        const itemEstimate = estimateQueueItemCredits(item, settings);
        summary.items.push({ id: item.id, ...itemEstimate });
        if (itemEstimate.credits == null) {
            summary.unknown = true;
        } else {
            summary.credits += itemEstimate.credits;
        }
        summary.outputs += itemEstimate.outputs || 1;
        summary.warnings.push(...(itemEstimate.warnings || []));
        return summary;
    }, { credits: 0, outputs: 0, unknown: false, isEstimate: true, items: [], warnings: [] });
}

export const MODEL_SPECS = {
    [FLOW_MODELS.NANO_BANANA_PRO]: { name: 'Nano Banana Pro', cost: 1, badge: 'Credits Required', badgeType: 'warning' },
    [FLOW_MODELS.NANO_BANANA_2]: { name: 'Nano Banana 2', cost: 0, badge: 'Free', badgeType: 'success' },
    [FLOW_MODELS.NANO_BANANA_2_LITE]: { name: 'Nano Banana 2 Lite', cost: 0, badge: 'Free', badgeType: 'success' }
};

export const STORAGE_KEYS = {
    QUEUE: 'flow_automator_queue',
    STATE: 'flow_automator_state',
    SETTINGS: 'flow_automator_settings',
    CURRENT_INDEX: 'flow_automator_current_index',
    LOGS: 'flow_automator_logs',
    DIAGNOSTIC_ERRORS: 'flow_automator_diagnostic_errors',
    DOWNLOAD_COUNTERS: 'flow_automator_download_counters',
    ACCOUNT_USAGE: 'flow_account_prompt_usage'
};

export const DEFAULT_SETTINGS = {
    service: SUPPORTED_SERVICES.FLOW,
    flowType: 'image',
    syncFlowSettings: true,
    delaySeconds: 0,
    promptDelayEnabled: false,
    promptDelaySeconds: 3,
    timeoutSeconds: 5, // minutes
    retryCount: 2,
    // Basic generated-image auto-download is available to every eligible
    // signed-in account, so new profiles should start with it enabled.
    autoDownload: true,
    flowUpscaledDownload: false,
    waitForImageResponse: true,
    googleSsoVerified: false,
    youtubeSubscribed: false,
    concurrentCount: 1,
    uiLanguage: 'en',
    uiTheme: 'default',
    // Core operational measurement (Run state + membership type) is always
    // collected while the automation is running. This user-controlled setting
    // enables the additional country/device/diagnostic analytics by default.
    detailedAnalyticsEnabled: true,
    // Flow Specific Defaults
    flowModel: FLOW_MODELS.NANO_BANANA_2,
    videoMode: FLOW_VIDEO_MODES.INGREDIENTS,
    videoModel: FLOW_VIDEO_MODELS.VEO_3_1_FAST,
    videoDurationSeconds: 8,
    videoMultilinePrompt: false,
    videoVoiceReference: '',
    videoFramePrompt: '',
    videoStartFrameSelection: null,
    videoEndFrameSelection: null,
    flowAspectRatio: 'landscape',
    flowQuantity: 1,
    perPromptAssetsEnabled: false,
    autoMentionEnabled: true,
    characterAssets: [],
    characterAssetSelections: [],
    characterAssetSelection: null,
    characterAssetProjectUrl: null,
    videoAssetQueue: [],
    videoAvailableAssets: [],
    videoAssetProjectUrl: null
};

/**
 * Creates a new queue item
 * @param {string} prompt 
 * @param {object} metadata Optional additional metadata (e.g. videoStartImage)
 */
export function createQueueItem(prompt, metadata = {}) {
    return {
        id: `qi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        prompt: prompt.trim(),
        outputName: '',
        status: QUEUE_STATUS.PENDING,
        retries: 0,
        error: null,
        detail: '',
        addedAt: Date.now(),
        completedAt: null,
        resultUrl: null,
        // Include additional metadata such as video asset info.
        ...metadata
    };
}

/**
 * Automatically bind assets to queue item based on prompt mentions (@name or {{alias}}).
 */
export function autoBindAssetsByPromptMentions(item, settings) {
    if (!item || typeof item !== 'object') return item;
    
    const promptText = String(item.prompt || '').trim();
    // flowType (image vs video) is a global-only setting — there is no
    // per-prompt image/video override — so it alone decides which asset
    // pool a mention should resolve against. Checking for leftover
    // videoMode/videoModel/etc. keys on the item was unreliable: an item
    // created while video mode was active keeps those keys forever (they're
    // only cleared when per-prompt overrides are off AND the mode is
    // switched again), so a scene the user now treats as an image scene
    // could still resolve @mentions against the video asset pool and
    // silently attach an unrelated video instead of the intended image.
    const isVideo = settings?.flowType === 'video';

    const getAssetMentionLabel = (asset) => {
        if (!asset || typeof asset !== 'object') return '';
        const raw = asset.assetName || asset.name || asset.title || asset.label || '';
        const label = String(raw || '')
            .replace(/\.[a-z0-9]{2,5}$/i, '')
            .replace(/^@+/, '')
            .trim();
        if (!label || /^https?:\/\//i.test(label) || label.length > 80) return '';
        return label;
    };

    const getAssetPromptIndex = (prompt, asset) => {
        if (!prompt || !asset) return -1;
        const names = [];
        if (asset.assetAlias) names.push(asset.assetAlias.toLowerCase());
        const label = getAssetMentionLabel(asset);
        if (label) names.push(label.toLowerCase());
        if (asset.assetName) names.push(asset.assetName.toLowerCase());
        if (asset.name) names.push(asset.name.toLowerCase());
        if (asset.title) names.push(asset.title.toLowerCase());
        if (asset.label) names.push(asset.label.toLowerCase());
        
        const uniqueNames = [...new Set(names)].filter(Boolean);
        let minIdx = -1;
        for (const name of uniqueNames) {
            const escaped = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regexes = [
                new RegExp(`(?:^|[^a-zA-Z0-9_\\uac00-\\ud7a3])@${escaped}(?:$|[^a-zA-Z0-9_\\uac00-\\ud7a3])`, 'i'),
                new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'i'),
                new RegExp(`@(?:start|end)[\\s:]+${escaped}(?:$|[^a-zA-Z0-9_\\uac00-\\ud7a3])`, 'i')
            ];
            for (const regex of regexes) {
                const match = prompt.match(regex);
                if (match && match.index !== undefined) {
                    if (minIdx === -1 || match.index < minIdx) {
                        minIdx = match.index;
                    }
                }
            }
        }
        return minIdx;
    };

    const getFrameRoleForAssetInPrompt = (prompt, asset) => {
        if (!prompt || !asset) return null;
        const names = [];
        if (asset.assetAlias) names.push(asset.assetAlias.toLowerCase());
        const label = getAssetMentionLabel(asset);
        if (label) names.push(label.toLowerCase());
        if (asset.assetName) names.push(asset.assetName.toLowerCase());
        if (asset.name) names.push(asset.name.toLowerCase());
        if (asset.title) names.push(asset.title.toLowerCase());
        if (asset.label) names.push(asset.label.toLowerCase());
        
        const uniqueNames = [...new Set(names)].filter(Boolean);
        for (const name of uniqueNames) {
            const escaped = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            if (new RegExp(`@start[\\s:]+${escaped}(?:$|[^a-zA-Z0-9_\\uac00-\\ud7a3])`, 'i').test(prompt)) return 'start';
            if (new RegExp(`@end[\\s:]+${escaped}(?:$|[^a-zA-Z0-9_\\uac00-\\ud7a3])`, 'i').test(prompt)) return 'end';
        }
        return null;
    };

    if (isVideo) {
        const pool = Array.isArray(settings.videoAssetQueue) ? settings.videoAssetQueue : [];
        
        // Extract voice from promptText
        const voiceMatch = promptText.match(/(?:^|[^a-zA-Z0-9_])@voice(?:\s*:\s*([^@\r\n\t,.;()]+))?/i);
        let extractedVoice = item.videoVoiceReference || '';
        if (voiceMatch) {
            const voiceVal = voiceMatch[1] ? voiceMatch[1].trim() : '';
            extractedVoice = voiceVal ? `@Voice: ${voiceVal}` : '@Voice';
        }

        if (!pool.length) {
            if (voiceMatch) {
                return {
                    ...item,
                    videoVoiceReference: extractedVoice
                };
            }
            return item;
        }

        const matched = pool
            .map(asset => ({ asset, index: getAssetPromptIndex(promptText, asset) }))
            .filter(m => m.index !== -1)
            .sort((a, b) => a.index - b.index)
            .map(m => m.asset);

        const hasMentionSyntax = /@|\{\{/.test(promptText);
        if (!hasMentionSyntax && promptText !== '') {
            if (voiceMatch) {
                return {
                    ...item,
                    videoVoiceReference: extractedVoice
                };
            }
            return item;
        }

        const mode = item.videoMode || settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS;
        if (mode === FLOW_VIDEO_MODES.FRAMES) {
            let startFrame = null;
            let endFrame = null;
            
            matched.forEach(asset => {
                const role = getFrameRoleForAssetInPrompt(promptText, asset);
                if (role === 'start') startFrame = asset;
                else if (role === 'end') endFrame = asset;
            });

            matched.forEach(asset => {
                const role = getFrameRoleForAssetInPrompt(promptText, asset);
                if (!role) {
                    if (!startFrame) startFrame = asset;
                    else if (!endFrame) endFrame = asset;
                }
            });

            return {
                ...item,
                videoStartFrameSelection: startFrame,
                videoEndFrameSelection: endFrame,
                videoIngredientSelections: [],
                videoVoiceReference: extractedVoice
            };
        } else {
            return {
                ...item,
                videoIngredientSelections: matched,
                videoStartFrameSelection: null,
                videoEndFrameSelection: null,
                videoVoiceReference: extractedVoice
            };
        }
    } else {
        const hasMentionSyntax = /@|\{\{/.test(promptText);
        // Skip if neither per-prompt asset mode is active nor the prompt has @mention syntax
        if (!settings.perPromptAssetsEnabled && !item.perPromptAssetsEdited && !hasMentionSyntax) {
            return item;
        }

        // Search against the full loaded libraries so @name works without pre-selecting assets
        const characterPool = Array.isArray(settings.characterAssets) && settings.characterAssets.length
            ? settings.characterAssets
            : (Array.isArray(settings.characterAssetSelections) ? settings.characterAssetSelections
                : (settings.characterAssetSelection ? [settings.characterAssetSelection] : []));
        const imagePool = Array.isArray(settings.referenceAssets) && settings.referenceAssets.length
            ? settings.referenceAssets
            : (Array.isArray(settings.referenceAssetSelections) ? settings.referenceAssetSelections : []);

        if (!hasMentionSyntax && promptText !== '') {
            return item;
        }

        const matchedCharacters = characterPool
            .map(asset => ({ asset, index: getAssetPromptIndex(promptText, asset) }))
            .filter(m => m.index !== -1)
            .sort((a, b) => a.index - b.index)
            .map(m => m.asset);

        const matchedReferences = imagePool
            .map(asset => ({ asset, index: getAssetPromptIndex(promptText, asset) }))
            .filter(m => m.index !== -1)
            .sort((a, b) => a.index - b.index)
            .map(m => m.asset);

        // Merge with whatever reference images are already on the item
        // (e.g. manually attached via the picker/drag-drop) instead of
        // replacing them outright — otherwise adding an @mention to the
        // prompt silently drops a manually-added reference image that
        // wasn't itself named in the prompt text.
        const assetKey = (asset) => asset?.id || asset?.src || asset?.label || '';
        const existingReferences = Array.isArray(item.referenceAssetSelections) ? item.referenceAssetSelections : [];
        const mergedReferences = [];
        const seenKeys = new Set();
        [...existingReferences, ...matchedReferences].forEach((asset) => {
            const key = assetKey(asset);
            if (!key || seenKeys.has(key)) return;
            seenKeys.add(key);
            mergedReferences.push(asset);
        });

        return {
            ...item,
            characterAssetSelections: matchedCharacters,
            characterAssetSelection: matchedCharacters[0] || null,
            referenceAssetSelections: mergedReferences,
            perPromptAssetsEdited: true
        };
    }
}

/**
 * Automatically append asset mention token to prompt text.
 */
export function autoAppendAssetMentionToPrompt(promptText, asset) {
    // Return original prompt unchanged to disable automatic insertion of names.
    // Explicit autocomplete and drag-drop will not force append asset names to the prompt.
    return String(promptText || '');
}
