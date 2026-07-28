import { storage } from '../shared/storage.js';
import {
    FLOW_MODELS,
    FLOW_VIDEO_MODELS,
    FLOW_VIDEO_MODES,
    QUEUE_STATUS,
    sanitizeVideoSettings,
    autoBindAssetsByPromptMentions,
    autoAppendAssetMentionToPrompt,
    isVideoVoiceAllowed,
    normalizeVoiceReference,
    getSupportedVideoDurations
} from '../shared/model.js';

const storyboardTitle = document.getElementById('storyboardTitle');
const storyboardSubtitle = document.getElementById('storyboardSubtitle');
const storyboardMeta = document.getElementById('storyboardMeta');
const storyboardList = document.getElementById('storyboardList');
const refreshBtn = document.getElementById('refreshBtn');
const saveBtn = document.getElementById('saveBtn');
const closeBtn = document.getElementById('closeBtn');
const helpBtn = document.getElementById('helpBtn');
const storyboardInstructions = document.getElementById('storyboardInstructions');

const LABELS = {
    en: {
        title: 'Advanced Storyboard',
        subtitle: 'Review queued scenes before generation; completed results are not shown.',
        dragHint: 'Drag an asset onto a scene slot to save it.',
        help: 'Help',
        helpTitle: 'Storyboard Usage Guide',
        helpDragDrop: 'Drag an image from the "Available Assets" strip at the top and drop it into a slot (Start, End, Ingredient) on any scene below.',
        helpRemove: 'Click on any assigned image thumbnail inside a scene to immediately remove/clear it from that slot.',
        autoBind: 'Auto Binding',
        helpAutoBind: 'Type `@name` or `{{nickname}}` in the prompt to automatically bind that asset. Selecting/dropping an asset also appends its tag to the prompt.',
        helpSave: 'Click the "Save Changes" button at the top right to apply your asset assignments and name updates.',
        saved: 'Saved!',
        savedMessage: 'Changes saved successfully.',
        saveChanges: 'Save Changes',
        noChanges: 'No changes to save',
        refresh: 'Refresh',
        close: 'Close',
        noScenes: 'No scenes are ready yet.',
        scene: 'Scene {count}',
        imageScene: 'Image {count}',
        videoScene: 'Video {count}',
        prompt: 'Prompt',
        images: 'Images',
        settings: 'Settings',
        missing: 'No image selected',
        imageMode: 'Image',
        videoMode: 'Video',
        imageAssets: 'Image Assets',
        videoAssets: 'Video Assets',
        characters: 'Characters',
        references: 'References',
        referenceImages: 'Reference Images',
        character: 'Character {count}',
        reference: 'Reference {count}',
        start: 'Start',
        end: 'End',
        ingredient: 'Ingredient {count}',
        ingredientsMaxReached: 'Ingredients to Video supports up to 3 images per prompt.',
        frames: 'Frames',
        ingredients: 'Ingredients',
        queue: '{count} scene(s)',
        estimateNote: 'Estimate only',
        voice: 'Voice',
        warnings: 'Warnings',
        failed: 'Failed',
        availableAssets: 'Available Assets',
        noAvailableAssets: 'No image selected'
    },
    ko: {
        title: '어드밴스드 스토리보드',
        subtitle: '생성 전에 큐 씬을 확인하세요. 완료된 결과는 표시하지 않습니다.',
        dragHint: '에셋을 씬 슬롯에 드래그하면 저장됩니다.',
        help: '도움말',
        helpTitle: '스토리보드 사용 가이드',
        helpDragDrop: '상단 "사용 가능한 에셋" 영역에서 이미지를 드래그하여 하단 각 씬의 빈 슬롯(Start, End, Ingredient 등)에 드롭하여 할당할 수 있습니다.',
        helpRemove: '할당된 이미지 썸네일을 클릭하면 해당 슬롯에서 에셋이 즉시 해제(제거)됩니다.',
        autoBind: '자동 매핑',
        helpAutoBind: '프롬프트에 `@이름` 또는 `{{식별이름}}`을 작성하면 에셋이 자동 매핑됩니다. 반대로 에셋을 씬 슬롯에 드롭/선택하면 프롬프트 뒤에 태그가 자동 추가됩니다.',
        helpSave: '에셋 드롭 및 이름 변경 후 우측 상단의 "변경 저장" 버튼을 클릭하여 설정을 반영하세요.',
        saved: '저장 완료!',
        savedMessage: '변경 사항이 저장되었습니다.',
        saveChanges: '변경 저장',
        noChanges: '저장할 변경 없음',
        refresh: '새로고침',
        close: '닫기',
        noScenes: '준비된 씬이 없습니다.',
        scene: '씬 {count}',
        imageScene: '이미지 {count}',
        videoScene: '비디오 {count}',
        prompt: '프롬프트',
        images: '이미지',
        settings: '설정',
        missing: '선택된 이미지 없음',
        imageMode: '이미지',
        videoMode: '비디오',
        imageAssets: '이미지 에셋',
        videoAssets: '비디오 에셋',
        characters: '캐릭터',
        references: '레퍼런스',
        referenceImages: '레퍼런스 이미지',
        character: '캐릭터 {count}',
        reference: '레퍼런스 {count}',
        start: 'Start',
        end: 'End',
        ingredient: 'Ingredient {count}',
        ingredientsMaxReached: 'Ingredients to Video는 프롬프트당 최대 3장까지 지원합니다.',
        frames: 'Frames',
        ingredients: 'Ingredients',
        queue: '{count}개 씬',
        estimateNote: '예상치',
        voice: 'Voice',
        warnings: '경고',
        failed: '실패',
        availableAssets: '사용 가능한 에셋',
        noAvailableAssets: '선택된 이미지 없음'
    }
};

let currentLanguage = 'en';

function t(key) {
    return LABELS[currentLanguage]?.[key] || LABELS.en[key] || key;
}

function tFormat(key, values = {}) {
    return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

function isRunnableStatus(status) {
    return [
        QUEUE_STATUS.PENDING,
        QUEUE_STATUS.IN_PROGRESS,
        QUEUE_STATUS.FAILED
    ].includes(status);
}

function isVideoQueueItem(item = {}) {
    return Object.prototype.hasOwnProperty.call(item, 'videoMode')
        || Object.prototype.hasOwnProperty.call(item, 'videoModel')
        || Object.prototype.hasOwnProperty.call(item, 'videoIngredientSelections')
        || Object.prototype.hasOwnProperty.call(item, 'videoStartFrameSelection')
        || Object.prototype.hasOwnProperty.call(item, 'videoEndFrameSelection');
}

function queueItemMatchesFlowType(item = {}, settings = {}) {
    return true;
}

function normalizeReferenceSelection(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id ? String(raw.id) : '';
    const src = raw.src ? String(raw.src) : '';
    const label = raw.label ? String(raw.label) : '';
    const assetName = raw.assetName || raw.name || raw.title ? String(raw.assetName || raw.name || raw.title) : '';
    const title = raw.title || raw.assetName || raw.name ? String(raw.title || raw.assetName || raw.name) : '';
    const assetAlias = sanitizeAssetAlias(raw.assetAlias || raw.alias || '');
    if (!id && !src && !label) return null;
    return {
        ...raw,
        id,
        src,
        label,
        assetName,
        title,
        assetAlias
    };
}

function sanitizeAssetAlias(value = '') {
    return String(value || '')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60);
}

function cloneReferenceSelection(raw) {
    const normalized = normalizeReferenceSelection(raw);
    return normalized ? { ...normalized } : null;
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
    add(normalized.src);
    if (Array.isArray(normalized.assetIdentityKeys)) {
        normalized.assetIdentityKeys.forEach(add);
    }
    return keys;
}

function getReferenceAssetKey(raw) {
    return getReferenceAssetKeys(raw)[0] || '';
}

function dedupeReferenceSelections(selections = []) {
    const seen = new Set();
    return (Array.isArray(selections) ? selections : [])
        .map(cloneReferenceSelection)
        .filter(Boolean)
        .filter((selection) => {
            const key = getReferenceAssetKey(selection);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function filterSelectionsToPool(selections = [], allowedPool = []) {
    const allowedKeys = new Set(dedupeReferenceSelections(allowedPool).flatMap(getReferenceAssetKeys).filter(Boolean));
    if (!allowedKeys.size) return [];
    return dedupeReferenceSelections(selections).filter((selection) => (
        getReferenceAssetKeys(selection).some((key) => allowedKeys.has(key))
    ));
}

function assetSelectionsMatchWholePool(selections = [], allowedPool = []) {
    const selectedKeys = new Set(dedupeReferenceSelections(selections).map(getReferenceAssetKey).filter(Boolean));
    const allowedKeys = new Set(dedupeReferenceSelections(allowedPool).map(getReferenceAssetKey).filter(Boolean));
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
    if (!wasExplicitlyEdited && assetSelectionsMatchWholePool(filtered, allowedPool)) return [];
    if (rawSelections.length > filtered.length && assetSelectionsMatchWholePool(filtered, allowedPool)) return [];
    return filtered;
}

function getQueueItemCharacterSelections(item = {}, allowedPool = []) {
    const source = Array.isArray(item.characterAssetSelections) && item.characterAssetSelections.length
        ? item.characterAssetSelections
        : (item.characterAssetSelection ? [item.characterAssetSelection] : []);
    return filterSelectionsToPool(source, allowedPool);
}

function getSelectedCharacterPool(settings = {}) {
    const multi = dedupeReferenceSelections(settings.characterAssetSelections || []);
    if (multi.length) return multi;
    const single = cloneReferenceSelection(settings.characterAssetSelection || null);
    return single ? [single] : [];
}

function getQueueAssetPoolFromSettings(settings = {}, mode = 'image') {
    if (mode === 'character') return getSelectedCharacterPool(settings);
    if (mode === 'videoIngredient' || mode === 'videoStartFrame' || mode === 'videoEndFrame') {
        return dedupeReferenceSelections(settings.videoAssetQueue || []);
    }
    return dedupeReferenceSelections(settings.referenceAssetSelections || []);
}

function showStoryboardStatus(message = '', isSuccess = false) {
    if (!storyboardSubtitle || !message) return;
    storyboardSubtitle.textContent = message;
    window.clearTimeout(showStoryboardStatus.timer);
    showStoryboardStatus.timer = window.setTimeout(() => {
        storyboardSubtitle.textContent = t('subtitle');
    }, 2200);
    // Also show a prominent save toast
    if (isSuccess) {
        showSaveToast(message);
    }
}

function showSaveToast(message = '') {
    let toast = document.getElementById('storyboardSaveToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'storyboardSaveToast';
        toast.style.cssText = [
            'position:fixed',
            'bottom:28px',
            'left:50%',
            'transform:translateX(-50%) translateY(20px)',
            'background:#166534',
            'color:#fff',
            'padding:12px 24px',
            'border-radius:12px',
            'font-weight:800',
            'font-size:0.92rem',
            'z-index:9999',
            'box-shadow:0 8px 30px rgba(0,0,0,0.2)',
            'transition:opacity 0.3s, transform 0.3s',
            'opacity:0',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(toast);
    }
    toast.textContent = '✓ ' + message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    window.clearTimeout(showSaveToast.timer);
    showSaveToast.timer = window.setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2400);
}

function addUniqueSelection(list = [], asset) {
    const normalized = cloneReferenceSelection(asset);
    if (!normalized) return dedupeReferenceSelections(list);
    const current = dedupeReferenceSelections(list);
    const key = getReferenceAssetKey(normalized);
    if (current.some((item) => getReferenceAssetKey(item) === key)) return current;
    return [...current, normalized];
}

async function saveStoryboardChanges() {
    const promptInputs = Array.from(document.querySelectorAll('.storyboard-prompt-input[data-item-id]'));
    const promptByItemId = new Map();

    promptInputs.forEach((input) => {
        const itemId = input.dataset.itemId || '';
        if (itemId) promptByItemId.set(itemId, String(input.value || '').trim());
    });

    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    let changed = false;

    const nextQueue = (Array.isArray(queue) ? queue : []).map((item) => {
        let nextItem = { ...item };
        let itemPromptChanged = false;
        if (promptByItemId.has(item.id)) {
            const nextPrompt = promptByItemId.get(item.id);
            if (String(item.prompt || '').trim() !== nextPrompt) {
                nextItem = { ...nextItem, prompt: nextPrompt };
                itemPromptChanged = true;
                changed = true;
            }
        }

        if (itemPromptChanged) {
            nextItem = autoBindAssetsByPromptMentions(nextItem, settings);
        }

        if (JSON.stringify(nextItem) !== JSON.stringify(item)) {
            changed = true;
        }

        return nextItem;
    });

    if (!changed) {
        showStoryboardStatus(t('noChanges'));
        return;
    }

    await storage.setQueue(nextQueue);
    showStoryboardStatus(t('savedMessage'), true);
    await render();
}

async function applyStoryboardDrop(drop = {}, rawAsset = null) {
    const asset = cloneReferenceSelection(rawAsset);
    if (!asset || !drop.itemId || !drop.role) return;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === drop.itemId);
    if (idx === -1) return;
    const item = queue[idx];

    const nextPrompt = autoAppendAssetMentionToPrompt(item.prompt || '', asset);

    if (drop.role === 'videoIngredient') {
        const existingIngredients = item.videoIngredientSelections || [];
        const key = getReferenceAssetKey(asset);
        const alreadySelected = existingIngredients.some((selection) => getReferenceAssetKey(selection) === key);
        // If a slotIndex is provided (drop onto a filled slot), replace that index.
        // Otherwise append (empty slot drop).
        let nextIngredients;
        if (typeof drop.slotIndex === 'number' && drop.slotIndex < existingIngredients.length) {
            // Replace the specific slot — remove old item, insert new at same position
            nextIngredients = [...existingIngredients];
            nextIngredients[drop.slotIndex] = cloneReferenceSelection(asset);
        } else if (alreadySelected) {
            nextIngredients = existingIngredients;
        } else if (existingIngredients.length >= 3) {
            showStoryboardStatus(t('ingredientsMaxReached'));
            return;
        } else {
            nextIngredients = addUniqueSelection(existingIngredients, asset);
        }
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            videoMode: FLOW_VIDEO_MODES.INGREDIENTS,
            videoIngredientSelections: nextIngredients,
            videoStartFrameSelection: null,
            videoEndFrameSelection: null
        };
    } else if (drop.role === 'videoStart') {
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            videoMode: FLOW_VIDEO_MODES.FRAMES,
            videoStartFrameSelection: asset,
            videoIngredientSelections: []
        };
    } else if (drop.role === 'videoEnd') {
        const sanitized = sanitizeVideoSettings({
            videoMode: FLOW_VIDEO_MODES.FRAMES,
            videoModel: item.videoModel || settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
            videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
            videoEndFrameSelection: asset,
            videoVoiceReference: item.videoVoiceReference || '',
            prompt: item.prompt || ''
        });
        if (!sanitized.allowEndFrame) {
            showStoryboardStatus(sanitized.warnings[0] || t('warnings'));
            return;
        }
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            videoMode: FLOW_VIDEO_MODES.FRAMES,
            videoEndFrameSelection: asset,
            videoIngredientSelections: []
        };
    } else if (drop.role === 'character') {
        const existing = item.characterAssetSelections || (item.characterAssetSelection ? [item.characterAssetSelection] : []);
        let nextCharacters;
        if (typeof drop.slotIndex === 'number' && drop.slotIndex < existing.length) {
            nextCharacters = [...existing];
            nextCharacters[drop.slotIndex] = cloneReferenceSelection(asset);
        } else {
            nextCharacters = addUniqueSelection(existing, asset);
        }
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            characterAssetSelections: nextCharacters,
            characterAssetSelection: nextCharacters[0] || null,
            perPromptAssetsEdited: true,
            perPromptCharacterAssetsEdited: true
        };
    } else if (drop.role === 'reference') {
        const existing = item.referenceAssetSelections || [];
        let nextReferences;
        if (typeof drop.slotIndex === 'number' && drop.slotIndex < existing.length) {
            nextReferences = [...existing];
            nextReferences[drop.slotIndex] = cloneReferenceSelection(asset);
        } else {
            nextReferences = addUniqueSelection(existing, asset);
        }
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            referenceAssetSelections: nextReferences,
            perPromptAssetsEdited: true,
            perPromptReferenceAssetsEdited: true
        };
    } else {
        return;
    }

    await storage.setQueue(queue);
    showStoryboardStatus(t('savedMessage'), true);
    await render();
}

async function saveStoryboardPrompt(itemId, value) {
    const prompt = String(value || '').trim();
    if (!itemId) return;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx !== -1) {
        let updatedItem = { ...queue[idx], prompt };
        updatedItem = autoBindAssetsByPromptMentions(updatedItem, settings);
        queue[idx] = updatedItem;
        await storage.setQueue(queue);
        showStoryboardStatus(t('savedMessage'), true);
        await render();
    }
}

function createEl(tag, className, textContent = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}

function getAssetDisplayName(asset, fallback = '') {
    return asset?.assetAlias || asset?.assetName || asset?.title || asset?.label || asset?.id || fallback || t('images');
}

function createImageTile(asset, label, options = {}) {
    const tile = createEl('div', `storyboard-image-tile ${asset?.src ? '' : 'missing'}`);
    if (options.draggable && asset) {
        tile.draggable = true;
        tile.classList.add('draggable');
        tile.dataset.assetKey = getReferenceAssetKey(asset);
        tile.dataset.assetRole = options.assetRole || '';
        tile.addEventListener('dragstart', (event) => {
            const payload = {
                asset,
                assetRole: options.assetRole || '',
                assetKey: getReferenceAssetKey(asset)
            };
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/json', JSON.stringify(payload));
            event.dataTransfer.setData('text/plain', payload.assetKey || getAssetDisplayName(asset, label));
        });
    }
    if (options.drop) {
        tile.classList.add('drop-target');
        tile.dataset.dropRole = options.drop.role || '';
        tile.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            tile.classList.add('drag-over');
        });
        tile.addEventListener('dragleave', () => tile.classList.remove('drag-over'));
        tile.addEventListener('drop', async (event) => {
            event.preventDefault();
            tile.classList.remove('drag-over');
            const raw = event.dataTransfer.getData('application/json');
            if (!raw) return;
            try {
                const payload = JSON.parse(raw);
                await applyStoryboardDrop(options.drop, payload.asset);
            } catch (error) {
                console.warn('Storyboard drop failed:', error);
            }
        });
    }

    if (asset && options.drop) {
        tile.classList.add('removable');
        tile.title = currentLanguage === 'ko' ? '클릭하여 이미지 제거' : 'Click to remove image';
        tile.addEventListener('click', async (event) => {
            if (event.target.tagName === 'INPUT') return;
            event.preventDefault();
            event.stopPropagation();
            await removeStoryboardAsset(options.drop.itemId, options.drop.role, asset);
        });
    }

    if (asset?.src) {
        const img = document.createElement('img');
        img.src = asset.src;
        img.alt = getAssetDisplayName(asset, label);
        tile.appendChild(img);
    } else {
        tile.appendChild(createEl('div', 'storyboard-image-missing', t('missing')));
    }
    tile.appendChild(createEl('div', 'storyboard-image-caption', label || getAssetDisplayName(asset)));
    return tile;
}

function createAvailableAssetStrip(settings = {}) {
    const isVideo = settings.flowType === 'video';
    const section = createEl('section', `available-assets-section ${isVideo ? 'video' : 'image'}`);
    const header = createEl('div', 'available-assets-header');
    const titleWrap = createEl('div', 'available-assets-title-wrap');
    titleWrap.appendChild(createEl('span', `mode-badge ${isVideo ? 'video' : 'image'}`, isVideo ? t('videoMode') : t('imageMode')));
    titleWrap.appendChild(createEl('div', 'storyboard-section-label', isVideo ? t('videoAssets') : t('imageAssets')));
    header.appendChild(titleWrap);

    const groups = isVideo
        ? [{
            title: t('videoAssets'),
            className: 'video',
            assets: getQueueAssetPoolFromSettings(settings, 'videoIngredient').map((asset, index) => ({
                asset,
                label: tFormat('ingredient', { count: index + 1 })
            }))
        }]
        : [
            {
                title: t('characters'),
                className: 'character',
                assets: getQueueAssetPoolFromSettings(settings, 'character').map((asset, index) => ({
                    asset,
                    label: tFormat('character', { count: index + 1 })
                }))
            },
            {
                title: t('referenceImages'),
                className: 'reference',
                assets: getQueueAssetPoolFromSettings(settings, 'image').map((asset, index) => ({
                    asset,
                    label: tFormat('reference', { count: index + 1 })
                }))
            }
        ];
    const assetCount = groups.reduce((sum, group) => sum + group.assets.length, 0);

    header.appendChild(createEl('span', 'available-assets-count', String(assetCount)));
    section.appendChild(header);

    if (assetCount) {
        groups.forEach((group) => {
            const groupEl = createEl('div', `available-asset-group ${group.className}`);
            groupEl.appendChild(createEl('div', 'available-asset-group-title', `${group.title} (${group.assets.length})`));
            const grid = createEl('div', 'available-assets-grid');
            if (group.assets.length) {
                group.assets.forEach(({ asset, label }) => grid.appendChild(createImageTile(asset, label, {
                    draggable: true,
                    assetRole: group.className
                })));
            } else {
                grid.appendChild(createImageTile(null, t('missing')));
            }
            groupEl.appendChild(grid);
            section.appendChild(groupEl);
        });
    } else {
        const grid = createEl('div', 'available-assets-grid');
        grid.appendChild(createImageTile(null, t('missing')));
        section.appendChild(grid);
    }
    return section;
}

function getImageSceneAssets(item, settings) {
    const characterPool = getQueueAssetPoolFromSettings(settings, 'character');
    const imagePool = getQueueAssetPoolFromSettings(settings, 'image');
    const usePerPrompt = !!settings.perPromptAssetsEnabled || Array.isArray(item.characterAssetSelections) || Array.isArray(item.referenceAssetSelections);
    const characters = usePerPrompt
        ? getQueueItemCharacterSelections(item, characterPool)
        : characterPool;
    const references = usePerPrompt && Array.isArray(item.referenceAssetSelections)
        ? getPerPromptReferenceSelections(item, imagePool)
        : imagePool;

    return [
        ...characters.map((asset, index) => ({ asset, label: tFormat('character', { count: index + 1 }) })),
        ...references.map((asset, index) => ({ asset, label: tFormat('reference', { count: index + 1 }) }))
    ];
}

function getImageSceneAssetGroups(item, settings) {
    const characterPool = getQueueAssetPoolFromSettings(settings, 'character');
    const imagePool = getQueueAssetPoolFromSettings(settings, 'image');
    const usePerPrompt = !!settings.perPromptAssetsEnabled || Array.isArray(item.characterAssetSelections) || Array.isArray(item.referenceAssetSelections);
    const characters = usePerPrompt
        ? getQueueItemCharacterSelections(item, characterPool)
        : characterPool;
    const references = usePerPrompt && Array.isArray(item.referenceAssetSelections)
        ? getPerPromptReferenceSelections(item, imagePool)
        : imagePool;
    return [
        {
            title: t('characters'),
            className: 'character',
            assets: characters.map((asset, index) => ({ asset, label: tFormat('character', { count: index + 1 }) }))
        },
        {
            title: t('referenceImages'),
            className: 'reference',
            assets: references.map((asset, index) => ({ asset, label: tFormat('reference', { count: index + 1 }) }))
        }
    ];
}

function getVideoSceneAssets(item, settings) {
    const mode = item.videoMode || settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS;
    const sanitized = sanitizeVideoSettings({
        videoMode: mode,
        videoModel: item.videoModel || settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
        videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
        videoEndFrameSelection: item.videoEndFrameSelection,
        videoVoiceReference: item.videoVoiceReference || '',
        prompt: item.prompt || ''
    });
    const isFrames = mode === FLOW_VIDEO_MODES.FRAMES;
    if (isFrames) {
        return [
            { asset: item.videoStartFrameSelection || null, label: t('start') },
            ...(sanitized.allowEndFrame ? [{ asset: item.videoEndFrameSelection || null, label: t('end') }] : [])
        ];
    }
    const ingredients = filterSelectionsToPool(item.videoIngredientSelections || [], getQueueAssetPoolFromSettings(settings, 'videoIngredient'));
    return ingredients.map((asset, index) => ({ asset, label: tFormat('ingredient', { count: index + 1 }) }));
}

async function updateStoryboardVideoSetting(itemId, patch) {
    const queue = await storage.getQueue();
    const idx = queue.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const merged = { ...queue[idx], ...patch };
    const sanitized = sanitizeVideoSettings({
        videoMode: merged.videoMode,
        videoModel: merged.videoModel,
        videoDurationSeconds: merged.videoDurationSeconds,
        videoEndFrameSelection: merged.videoEndFrameSelection,
        videoVoiceReference: merged.videoVoiceReference || '',
        prompt: merged.prompt || ''
    });
    queue[idx] = {
        ...merged,
        videoMode: sanitized.videoMode,
        videoModel: sanitized.videoModel,
        videoDurationSeconds: sanitized.videoDurationSeconds,
        videoEndFrameSelection: sanitized.videoEndFrameSelection
    };
    await storage.setQueue(queue);
    await render();
}

function renderVideoSettingsControls(item, settings) {
    const mode = item.videoMode || settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS;
    const model = item.videoModel || settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST;
    const duration = item.videoDurationSeconds || settings.videoDurationSeconds;
    const supportedDurations = getSupportedVideoDurations(model, mode);

    const wrap = createEl('div', 'storyboard-video-controls');

    const modeToggle = createEl('div', 'mode-selector compact');
    [FLOW_VIDEO_MODES.INGREDIENTS, FLOW_VIDEO_MODES.FRAMES].forEach((m) => {
        const label = m === FLOW_VIDEO_MODES.FRAMES ? t('frames') : t('ingredients');
        const btn = createEl('button', `mode-btn ${mode === m ? 'active' : ''}`, label);
        btn.type = 'button';
        btn.addEventListener('click', () => updateStoryboardVideoSetting(item.id, { videoMode: m }));
        modeToggle.appendChild(btn);
    });
    wrap.appendChild(modeToggle);

    const modelSelect = document.createElement('select');
    modelSelect.className = 'input-select compact';
    [FLOW_VIDEO_MODELS.OMNI_FLASH, FLOW_VIDEO_MODELS.VEO_3_1_LITE, FLOW_VIDEO_MODELS.VEO_3_1_FAST, FLOW_VIDEO_MODELS.VEO_3_1_QUALITY]
        .forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            if (m === model) opt.selected = true;
            modelSelect.appendChild(opt);
        });
    modelSelect.addEventListener('change', () => updateStoryboardVideoSetting(item.id, { videoModel: modelSelect.value }));
    wrap.appendChild(modelSelect);

    // Only Omni Flash exposes a duration choice — Veo variants always run at
    // their single fixed duration regardless of mode, so no selector is shown
    // for them even when multiple values are technically valid per model.js.
    if (model === FLOW_VIDEO_MODELS.OMNI_FLASH && supportedDurations.length > 1) {
        const durationSelect = document.createElement('select');
        durationSelect.className = 'input-select compact';
        supportedDurations.forEach((d) => {
            const opt = document.createElement('option');
            opt.value = String(d);
            opt.textContent = `${d}s`;
            if (d === Number(duration)) opt.selected = true;
            durationSelect.appendChild(opt);
        });
        durationSelect.addEventListener('change', () => updateStoryboardVideoSetting(item.id, { videoDurationSeconds: Number(durationSelect.value) }));
        wrap.appendChild(durationSelect);
    }

    return wrap;
}

function getSceneSettings(item, settings, isVideo) {
    if (isVideo) {
        const mode = item.videoMode || settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS;
        const sanitized = sanitizeVideoSettings({
            videoMode: mode,
            videoModel: item.videoModel || settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
            videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
            videoEndFrameSelection: item.videoEndFrameSelection,
            videoVoiceReference: item.videoVoiceReference || '',
            prompt: item.prompt || ''
        });
        return [
            mode === FLOW_VIDEO_MODES.FRAMES ? t('frames') : t('ingredients'),
            sanitized.videoModel,
            sanitized.videoDurationSeconds ? `${sanitized.videoDurationSeconds}s` : '',
            sanitized.videoVoiceToken ? `${t('voice')}: ${sanitized.videoVoiceToken}` : ''
        ].filter(Boolean).join(' · ');
    }
    return [
        settings.flowModel || FLOW_MODELS.NANO_BANANA_2,
        settings.flowAspectRatio || '',
        settings.flowQuantity ? `${settings.flowQuantity}x` : ''
    ].filter(Boolean).join(' · ');
}

function renderScene(item, index, settings) {
    const isVideo = settings.flowType === 'video';
    const card = createEl('article', `storyboard-card ${isVideo ? 'video' : 'image'}`);
    const header = createEl('div', 'storyboard-card-header');
    const titleGroup = createEl('div', 'storyboard-title-group');
    titleGroup.appendChild(createEl('span', `mode-badge ${isVideo ? 'video' : 'image'}`, isVideo ? t('videoMode') : t('imageMode')));
    const title = createEl('div', 'storyboard-scene-title', tFormat(isVideo ? 'videoScene' : 'imageScene', { count: index + 1 }));
    titleGroup.appendChild(title);
    header.appendChild(titleGroup);
    if (isVideo && settings.videoPerPromptModelEnabled === true) {
        // Per-prompt overrides enabled → editable mode/model/duration controls.
        const settingsGroup = createEl('div', 'storyboard-settings-group');
        settingsGroup.appendChild(renderVideoSettingsControls(item, settings));
        if (item.status === QUEUE_STATUS.FAILED) {
            settingsGroup.appendChild(createEl('div', 'storyboard-settings-line status-failed', t('failed')));
        }
        header.appendChild(settingsGroup);
    } else {
        const settingsText = createEl('div', `storyboard-settings-line ${item.status === QUEUE_STATUS.FAILED ? 'status-failed' : ''}`);
        settingsText.textContent = [
            getSceneSettings(item, settings, isVideo),
            item.status === QUEUE_STATUS.FAILED ? t('failed') : ''
        ].filter(Boolean).join(' · ');
        header.appendChild(settingsText);
    }

    const body = createEl('div', 'storyboard-card-body');
    const prompt = createEl('div', 'storyboard-prompt');
    prompt.appendChild(createEl('div', 'storyboard-section-label', t('prompt')));
    const promptInput = document.createElement('textarea');
    promptInput.className = 'storyboard-prompt-input';
    promptInput.dataset.itemId = item.id;
    promptInput.value = item.prompt || '';
    promptInput.rows = 5;
    promptInput.addEventListener('blur', async () => {
        setTimeout(async () => {
            const dropdown = document.getElementById('global-mention-dropdown');
            if (dropdown && !dropdown.classList.contains('hidden') && dropdown.dataset.activeTextareaId === promptInput.id) {
                return;
            }
            if ((item.prompt || '').trim() !== promptInput.value.trim()) {
                await saveStoryboardPrompt(item.id, promptInput.value);
            }
        }, 180);
    });
    prompt.appendChild(promptInput);
    
    // Give textarea a unique ID to track active state
    promptInput.id = `textarea-${item.id}`;
    
    setupMentionAutocomplete(promptInput, settings, isVideo, item);

    const showImageAssets = isVideo || !!settings.perPromptAssetsEnabled;
    if (showImageAssets) {
        const images = createEl('div', 'storyboard-images-section');
        images.appendChild(createEl('div', 'storyboard-section-label', t('images')));
        if (isVideo) {
            const assets = getVideoSceneAssets(item, settings);
            const grid = createEl('div', `storyboard-image-grid ${(item.videoMode || settings.videoMode) === FLOW_VIDEO_MODES.FRAMES ? 'frames' : ''}`);
            const isFrames = (item.videoMode || settings.videoMode) === FLOW_VIDEO_MODES.FRAMES;
            if (assets.length) {
                assets.forEach(({ asset, label }, assetIdx) => {
                    const role = label === t('start')
                        ? 'videoStart'
                        : label === t('end')
                            ? 'videoEnd'
                            : 'videoIngredient';
                    // Pass slotIndex so drops onto filled ingredient tiles replace instead of append
                    const slotIndex = role === 'videoIngredient' ? assetIdx : undefined;
                    grid.appendChild(createImageTile(asset, label, {
                        drop: { itemId: item.id, role, slotIndex }
                    }));
                });
                if (!isFrames) {
                    // Show all remaining empty ingredient slots (up to 3 total)
                    const ingredientCount = assets.filter((_, i) => {
                        const a = assets[i];
                        return a.label !== t('start') && a.label !== t('end');
                    }).length;
                    for (let slotIdx = ingredientCount; slotIdx < 3; slotIdx++) {
                        grid.appendChild(createImageTile(null, t('ingredient'), {
                            drop: { itemId: item.id, role: 'videoIngredient' }
                        }));
                    }
                }
            } else {
                if (isFrames) {
                    grid.appendChild(createImageTile(null, t('start'), {
                        drop: { itemId: item.id, role: 'videoStart' }
                    }));
                } else {
                    // Show all 3 empty ingredient slots on fresh items
                    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
                        grid.appendChild(createImageTile(null, t('ingredient'), {
                            drop: { itemId: item.id, role: 'videoIngredient' }
                        }));
                    }
                }
            }
            images.appendChild(grid);
        } else {
            const groups = getImageSceneAssetGroups(item, settings);
            const assetCount = groups.reduce((sum, group) => sum + group.assets.length, 0);
            if (!assetCount) {
                groups.forEach((group) => {
                    const groupEl = createEl('div', `scene-asset-group ${group.className}`);
                    groupEl.appendChild(createEl('div', 'scene-asset-group-title', `${group.title} (0)`));
                    const grid = createEl('div', 'storyboard-image-grid');
                    grid.appendChild(createImageTile(null, group.title, {
                        drop: { itemId: item.id, role: group.className === 'character' ? 'character' : 'reference' }
                    }));
                    groupEl.appendChild(grid);
                    images.appendChild(groupEl);
                });
            } else {
                groups.forEach((group) => {
                    const groupEl = createEl('div', `scene-asset-group ${group.className}`);
                    groupEl.appendChild(createEl('div', 'scene-asset-group-title', `${group.title} (${group.assets.length})`));
                    const grid = createEl('div', 'storyboard-image-grid');
                    group.assets.forEach(({ asset, label }, assetIdx) => grid.appendChild(createImageTile(asset, label, {
                        drop: { itemId: item.id, role: group.className === 'character' ? 'character' : 'reference', slotIndex: assetIdx }
                    })));
                    grid.appendChild(createImageTile(null, group.title, {
                        drop: { itemId: item.id, role: group.className === 'character' ? 'character' : 'reference' }
                    }));
                    groupEl.appendChild(grid);
                    images.appendChild(groupEl);
                });
            }
        }
        body.appendChild(images);
    } else {
        body.classList.add('no-images');
    }

    body.appendChild(prompt);
    card.appendChild(header);
    card.appendChild(body);
    if (isVideo) {
        const sanitized = sanitizeVideoSettings({
            videoMode: item.videoMode || settings.videoMode || FLOW_VIDEO_MODES.INGREDIENTS,
            videoModel: item.videoModel || settings.videoModel || FLOW_VIDEO_MODELS.VEO_3_1_FAST,
            videoDurationSeconds: item.videoDurationSeconds || settings.videoDurationSeconds,
            videoEndFrameSelection: item.videoEndFrameSelection,
            videoVoiceReference: item.videoVoiceReference || '',
            prompt: item.prompt || ''
        });
        const warnings = [...new Set(sanitized.warnings || [])].filter(Boolean);
        if (warnings.length) {
            const warning = createEl('div', 'storyboard-warning', `${t('warnings')}: ${warnings[0]}`);
            card.appendChild(warning);
        }
    }
    return card;
}

function renderMeta(items, settings) {
    storyboardMeta.innerHTML = '';
    storyboardMeta.appendChild(createAvailableAssetStrip(settings));

    const chipRow = createEl('div', 'storyboard-meta-chips');
    const chips = [
        settings.flowType === 'video' ? t('videoMode') : t('imageMode'),
        tFormat('queue', { count: items.length }),
        t('dragHint')
    ];
    chips.filter(Boolean).forEach((text) => chipRow.appendChild(createEl('span', 'storyboard-meta-chip', text)));
    storyboardMeta.appendChild(chipRow);
}

async function render() {
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    currentLanguage = settings.uiLanguage === 'ko' ? 'ko' : 'en';
    document.documentElement.lang = currentLanguage;
    storyboardTitle.textContent = t('title');
    storyboardSubtitle.textContent = t('subtitle');
    helpBtn.textContent = t('help');
    refreshBtn.textContent = t('refresh');
    saveBtn.textContent = t('saveChanges');
    closeBtn.textContent = t('close');

    storyboardInstructions.innerHTML = `
        <h3>💡 ${t('helpTitle')}</h3>
        <ul>
            <li><strong>${t('availableAssets')}:</strong> ${t('helpDragDrop')}</li>
            <li><strong>${t('autoBind')}:</strong> ${t('helpAutoBind')}</li>
            <li><strong>${t('close')}:</strong> ${t('helpRemove')}</li>
            <li><strong>${t('saveChanges')}:</strong> ${t('helpSave')}</li>
        </ul>
    `;

    const items = queue.filter((item) => isRunnableStatus(item.status) && queueItemMatchesFlowType(item, settings));
    renderMeta(items, settings);
    storyboardList.innerHTML = '';
    if (!items.length) {
        storyboardList.appendChild(createEl('div', 'storyboard-empty', t('noScenes')));
        return;
    }
    items.forEach((item, index) => storyboardList.appendChild(renderScene(item, index, settings)));
}

helpBtn.addEventListener('click', () => {
    storyboardInstructions.classList.toggle('hidden');
});
refreshBtn.addEventListener('click', render);
saveBtn.addEventListener('click', saveStoryboardChanges);
closeBtn.addEventListener('click', () => window.close());
function shouldStoryboardReRender(oldQueue, newQueue) {
    if (!Array.isArray(oldQueue) || !Array.isArray(newQueue)) return true;
    if (oldQueue.length !== newQueue.length) return true;
    for (let i = 0; i < oldQueue.length; i++) {
        const a = oldQueue[i];
        const b = newQueue[i];
        if (!a || !b) return true;
        if (a.id !== b.id) return true;
        if (a.status !== b.status) return true;
        if (a.prompt !== b.prompt) return true;
        if (a.outputName !== b.outputName) return true;
        if (a.videoMode !== b.videoMode) return true;
        if (a.videoModel !== b.videoModel) return true;
        if (a.videoDurationSeconds !== b.videoDurationSeconds) return true;
        if (a.videoVoiceReference !== b.videoVoiceReference) return true;
        if (JSON.stringify(a.characterAssetSelections || null) !== JSON.stringify(b.characterAssetSelections || null)) return true;
        if (JSON.stringify(a.referenceAssetSelections || null) !== JSON.stringify(b.referenceAssetSelections || null)) return true;
        if (JSON.stringify(a.videoIngredientSelections || null) !== JSON.stringify(b.videoIngredientSelections || null)) return true;
        if (JSON.stringify(a.videoStartFrameSelection || null) !== JSON.stringify(b.videoStartFrameSelection || null)) return true;
        if (JSON.stringify(a.videoEndFrameSelection || null) !== JSON.stringify(b.videoEndFrameSelection || null)) return true;
    }
    return false;
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        let shouldRefresh = false;
        if (changes.flow_automator_settings) {
            shouldRefresh = true;
        }
        if (changes.flow_automator_queue) {
            const oldVal = changes.flow_automator_queue.oldValue;
            const newVal = changes.flow_automator_queue.newValue;
            if (shouldStoryboardReRender(oldVal, newVal)) {
                shouldRefresh = true;
            }
        }
        if (shouldRefresh) {
            render();
        }
    }
});

render();

function removeAssetMentionFromPrompt(promptText, asset) {
    let current = String(promptText || '');
    if (!asset) return current;
    
    const alias = asset.assetAlias;
    const label = asset.assetName || asset.name || asset.title || asset.label || '';
    const cleanLabel = String(label || '')
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/^@+/, '')
        .trim();
    
    const tokensToRemove = [];
    if (alias) {
        tokensToRemove.push(new RegExp(`\\{\\{\\s*${alias.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*\\}\\}`, 'gi'));
    }
    if (cleanLabel) {
        const escaped = cleanLabel.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        tokensToRemove.push(new RegExp(`(?:^|[^a-zA-Z0-9_\\uac00-\\ud7a3])@${escaped}(?:$|[^a-zA-Z0-9_\\uac00-\\ud7a3])`, 'gi'));
        tokensToRemove.push(new RegExp(`@(?:start|end)[\\s:]+${escaped}(?:$|[^a-zA-Z0-9_\\uac00-\\ud7a3])`, 'gi'));
    }
    
    for (const regex of tokensToRemove) {
        current = current.replace(regex, (match) => {
            const firstChar = match.charAt(0);
            return (firstChar !== '@' && firstChar !== '{') ? firstChar + ' ' : ' ';
        });
    }
    
    return current.replace(/\s+/g, ' ').trim();
}

async function removeStoryboardAsset(itemId, role, asset) {
    if (!itemId || !role || !asset) return;
    const [queue, settings] = await Promise.all([storage.getQueue(), storage.getSettings()]);
    const idx = queue.findIndex((item) => item.id === itemId);
    if (idx === -1) return;
    const item = queue[idx];
    
    const nextPrompt = removeAssetMentionFromPrompt(item.prompt || '', asset);
    
    if (role === 'videoStart') {
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            videoStartFrameSelection: null
        };
    } else if (role === 'videoEnd') {
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            videoEndFrameSelection: null
        };
    } else if (role === 'videoIngredient') {
        const currentList = item.videoIngredientSelections || [];
        const nextList = currentList.filter(a => getReferenceAssetKey(a) !== getReferenceAssetKey(asset));
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            videoIngredientSelections: nextList
        };
    } else if (role === 'character') {
        const currentList = item.characterAssetSelections || (item.characterAssetSelection ? [item.characterAssetSelection] : []);
        const nextList = currentList.filter(a => getReferenceAssetKey(a) !== getReferenceAssetKey(asset));
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            characterAssetSelections: nextList,
            characterAssetSelection: nextList[0] || null
        };
    } else if (role === 'reference') {
        const currentList = item.referenceAssetSelections || [];
        const nextList = currentList.filter(a => getReferenceAssetKey(a) !== getReferenceAssetKey(asset));
        queue[idx] = {
            ...item,
            prompt: nextPrompt,
            referenceAssetSelections: nextList
        };
    } else {
        return;
    }
    
    await storage.setQueue(queue);
    showStoryboardStatus(t('savedMessage'), true);
    await render();
}

function setupMentionAutocomplete(textarea, settings, isVideo, item) {
    const itemId = item.id;
    let pool = [];
    if (isVideo) {
        pool = Array.isArray(settings.videoAssetQueue) ? settings.videoAssetQueue : [];
    } else {
        const characters = Array.isArray(settings.characterAssetSelections) ? settings.characterAssetSelections : 
                           (settings.characterAssetSelection ? [settings.characterAssetSelection] : []);
        const references = Array.isArray(settings.referenceAssetSelections) ? settings.referenceAssetSelections : [];
        pool = [...characters, ...references];
    }
    
    const seenKeys = new Set();
    const cleanPool = [];
    pool.forEach(asset => {
        const key = getReferenceAssetKey(asset);
        if (key && !seenKeys.has(key)) {
            seenKeys.add(key);
            cleanPool.push(asset);
        }
    });

    const voiceAllowed = isVideo && isVideoVoiceAllowed(item.videoModel || settings.videoModel, item.videoMode || settings.videoMode);
    
    // Build voice suggestions if allowed
    const voiceSuggestions = [];
    if (voiceAllowed) {
        voiceSuggestions.push({
            isVoiceToken: true,
            token: '@Voice:',
            displayText: '@Voice:',
            alias: 'voice'
        });
        
        const savedVoice = item.videoVoiceReference || settings.videoVoiceReference || '';
        if (savedVoice) {
            const norm = normalizeVoiceReference(savedVoice);
            if (norm && norm !== '@Voice:') {
                voiceSuggestions.push({
                    isVoiceToken: true,
                    token: norm,
                    displayText: norm,
                    alias: 'voice'
                });
            }
        } else {
            voiceSuggestions.push({
                isVoiceToken: true,
                token: '@Voice: Andrew',
                displayText: '@Voice: Andrew',
                alias: 'voice'
            });
        }
    }

    if (!cleanPool.length && !voiceSuggestions.length) return;

    const getAssetMentionLabel = (asset) => {
        if (!asset || typeof asset !== 'object') return '';
        const raw = asset.assetName || asset.name || asset.title || asset.label || '';
        const label = String(raw || '')
            .replace(/\.[a-z0-9]{2,5}$/i, '')
            .replace(/^@+/, '')
            .trim();
        return label;
    };

    // Use global body-level dropdown
    let dropdown = document.getElementById('global-mention-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'global-mention-dropdown';
        dropdown.className = 'mention-dropdown hidden';
        document.body.appendChild(dropdown);
    }

    let activeIndex = -1;
    let filteredItems = [];

    const hideDropdown = () => {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        activeIndex = -1;
    };

    const showDropdown = (itemsList, query) => {
        filteredItems = itemsList;
        dropdown.innerHTML = '';
        dropdown.classList.remove('hidden');
        
        // Track which textarea is currently using the dropdown
        dropdown.dataset.activeTextareaId = textarea.id;
        dropdown.activeTextarea = textarea;

        // Position dropdown relative to textarea using viewport coordinates
        const rect = textarea.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Estimate height: pad: 8px, items: 60px max each. Let's cap at 200px.
        const dropdownHeight = Math.min(200, itemsList.length * 60 + 8);
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        dropdown.style.width = `${rect.width}px`;
        dropdown.style.left = `${rect.left + scrollLeft}px`;
        
        if (spaceBelow < 220 && spaceAbove > 220) {
            // Position above
            dropdown.style.top = `${rect.top + scrollTop - dropdownHeight - 6}px`;
        } else {
            // Position below
            dropdown.style.top = `${rect.bottom + scrollTop + 4}px`;
        }

        itemsList.forEach((itm, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `mention-dropdown-item ${idx === activeIndex ? 'active' : ''}`;
            
            if (itm.isVoiceToken) {
                // Voice Icon
                const icon = document.createElement('span');
                icon.className = 'mention-dropdown-voice-icon';
                icon.textContent = '🗣️';
                btn.appendChild(icon);
                
                const labelSpan = document.createElement('span');
                labelSpan.className = 'mention-dropdown-label';
                labelSpan.textContent = itm.displayText;
                btn.appendChild(labelSpan);
            } else {
                // Image Asset
                if (itm.src) {
                    const img = document.createElement('img');
                    img.className = 'mention-dropdown-thumb';
                    img.src = itm.src;
                    btn.appendChild(img);
                }
                
                const label = getAssetMentionLabel(itm);
                const labelSpan = document.createElement('span');
                labelSpan.className = 'mention-dropdown-label';
                
                if (label) {
                    labelSpan.textContent = `@${label}`;
                    if (itm.assetAlias) {
                        const aliasSpan = document.createElement('span');
                        aliasSpan.className = 'mention-dropdown-alias';
                        aliasSpan.textContent = `{{${itm.assetAlias}}}`;
                        btn.appendChild(aliasSpan);
                    }
                } else if (itm.assetAlias) {
                    labelSpan.textContent = `{{${itm.assetAlias}}}`;
                } else {
                    labelSpan.textContent = `@Asset_${itm.id ? itm.id.slice(0, 6) : 'unknown'}`;
                }
                
                btn.appendChild(labelSpan);
            }
            
            btn.addEventListener('mousedown', (e) => {
                // Use mousedown instead of click to prevent textarea blur before selection!
                e.preventDefault();
                e.stopPropagation();
                selectAsset(itm);
            });
            
            dropdown.appendChild(btn);
        });
    };

    const selectAsset = async (itm) => {
        const text = textarea.value;
        const caretPos = textarea.selectionStart;
        const textBeforeCaret = text.slice(0, caretPos);
        const match = textBeforeCaret.match(/@([\p{L}\p{N}\-:]*)$/u);
        if (!match) return;
        
        let token = '';
        if (itm.isVoiceToken) {
            token = itm.token;
        } else {
            const label = getAssetMentionLabel(itm);
            token = itm.assetAlias ? `{{${itm.assetAlias}}}` : `@${label}`;
        }
        
        const start = caretPos - match[0].length;
        const end = caretPos;
        
        textarea.value = text.slice(0, start) + token + text.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + token.length;
        
        hideDropdown();
        textarea.focus();
        
        await saveStoryboardPrompt(itemId, textarea.value);
    };

    textarea.addEventListener('input', () => {
        const text = textarea.value;
        const caretPos = textarea.selectionStart;
        const textBeforeCaret = text.slice(0, caretPos);
        const match = textBeforeCaret.match(/@([\p{L}\p{N}\-:]*)$/u);
        
        if (match) {
            const query = match[1].toLowerCase();
            const matchedAssets = cleanPool.filter(asset => {
                const name = (asset.assetName || asset.name || asset.title || asset.label || '').toLowerCase();
                const alias = (asset.assetAlias || '').toLowerCase();
                const label = getAssetMentionLabel(asset).toLowerCase();
                return name.includes(query) || alias.includes(query) || label.includes(query);
            });
            
            const matchedVoices = voiceSuggestions.filter(v => {
                return v.displayText.toLowerCase().includes(query) || v.alias.includes(query);
            });

            const matched = [...matchedAssets, ...matchedVoices];
            
            if (matched.length) {
                activeIndex = 0;
                showDropdown(matched, query);
            } else {
                hideDropdown();
            }
        } else {
            hideDropdown();
        }
    });

    textarea.addEventListener('keydown', (e) => {
        if (dropdown.classList.contains('hidden') || dropdown.dataset.activeTextareaId !== textarea.id) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % filteredItems.length;
            updateActiveItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + filteredItems.length) % filteredItems.length;
            updateActiveItem();
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (filteredItems[activeIndex]) {
                selectAsset(filteredItems[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            hideDropdown();
        }
    });

    const updateActiveItem = () => {
        const items = dropdown.querySelectorAll('.mention-dropdown-item');
        items.forEach((itemEl, idx) => {
            if (idx === activeIndex) {
                itemEl.classList.add('active');
                itemEl.scrollIntoView({ block: 'nearest' });
            } else {
                itemEl.classList.remove('active');
            }
        });
    };
}

// Single global document-level click listener to dismiss the global autocomplete dropdown
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('global-mention-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && e.target !== dropdown.activeTextarea) {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
        }
    }
});

