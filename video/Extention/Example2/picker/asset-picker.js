import { storage } from '../shared/storage.js';

const availableGrid = document.getElementById('availableGrid');
const selectedGrid = document.getElementById('selectedGrid');
const availableCount = document.getElementById('availableCount');
const selectedCount = document.getElementById('selectedCount');
const selectedSummary = document.getElementById('selectedSummary');
const bulkPromptInput = document.getElementById('bulkPromptInput');
const reloadAssetsBtn = document.getElementById('reloadAssetsBtn');
const saveQueueBtn = document.getElementById('saveQueueBtn');
const closeWindowBtn = document.getElementById('closeWindowBtn');
const statusBanner = document.getElementById('statusBanner');

let pickerState = {
    assets: [],
    selected: []
};
let draggedSelectionKey = '';
const pickerUrl = new URL(window.location.href);
const pickerTabId = Number.parseInt(pickerUrl.searchParams.get('tabId') || '', 10);
const pickerMode = pickerUrl.searchParams.get('mode') || 'video';
const forceReloadOnOpen = pickerUrl.searchParams.get('forceReload') === '1';

function showStatus(message, isError = false) {
    if (!statusBanner) return;
    if (!message) {
        statusBanner.className = 'status-banner hidden';
        statusBanner.textContent = '';
        return;
    }
    statusBanner.className = `status-banner ${isError ? 'error' : 'info'}`;
    statusBanner.textContent = message;
}

function normalizeReferenceSelection(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = (raw.id || '').toString().trim();
    const src = (raw.src || '').toString().trim();
    const label = (raw.label || '').toString().trim();
    const sceneTag = (raw.sceneTag || '').toString().trim();
    const videoPrompt = (raw.videoPrompt || '').toString();
    if (!id && !src) return null;
    return { id: id || null, src: src || null, label: label || null, sceneTag: sceneTag || null, videoPrompt };
}

function tryParseAssetNameFromUrl(url = '') {
    try {
        const parsed = new URL(url, location.href);
        return parsed.searchParams.get('name') || null;
    } catch {
        return null;
    }
}

function extractProjectId(url = '') {
    const match = (url || '').match(/\/project\/([^/?#]+)/i);
    return match ? match[1] : null;
}

function getReferenceAssetKey(asset) {
    if (!asset || typeof asset !== 'object') return '';
    return asset.id || tryParseAssetNameFromUrl(asset.src || '') || '';
}

function dedupeReferenceSelections(selections = []) {
    const out = [];
    const seen = new Set();
    selections.forEach((item) => {
        const normalized = normalizeReferenceSelection(item);
        if (!normalized) return;
        const key = getReferenceAssetKey(normalized);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(normalized);
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
    if (asset.label && !asset.label.endsWith('...')) return asset.label.slice(0, 80);
    return key ? `Image ${index + 1} (${key.slice(0, 8)}...)` : `Image ${index + 1}`;
}

function createButton(label, className, onClick, disabled = false) {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
}

function buildBulkPromptValue(selections = []) {
    return selections.map((item) => (item.videoPrompt || '').trim()).join('\n');
}

function applyBulkPromptValue(value) {
    const lines = value
        .split('\n')
        .map((line) => line.trim());

    pickerState.selected = pickerState.selected.map((item, index) => ({
        ...item,
        videoPrompt: lines[index] || ''
    }));
}

function buildCard(asset, index, mode) {
    const card = document.createElement('article');
    card.className = 'asset-card';
    if (mode === 'selected') {
        card.classList.add('asset-card-selected');
        const cardKey = getReferenceAssetKey(asset);
        card.draggable = true;
        card.dataset.assetKey = cardKey;
        card.addEventListener('dragstart', (event) => {
            draggedSelectionKey = cardKey;
            card.classList.add('is-dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', cardKey);
        });
        card.addEventListener('dragend', () => {
            draggedSelectionKey = '';
            card.classList.remove('is-dragging');
            clearDropIndicators();
        });
        card.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (!draggedSelectionKey || draggedSelectionKey === cardKey) return;
            event.dataTransfer.dropEffect = 'move';
            card.classList.add('drop-target');
        });
        card.addEventListener('dragleave', () => {
            card.classList.remove('drop-target');
        });
        card.addEventListener('drop', (event) => {
            event.preventDefault();
            card.classList.remove('drop-target');
            moveSelectionToKey(draggedSelectionKey, cardKey);
        });
    }

    const thumb = document.createElement('img');
    thumb.className = 'asset-thumb';
    thumb.alt = getReferenceAssetDisplayName(asset, index);
    if (asset?.src) thumb.src = asset.src;

    card.appendChild(thumb);

    if (mode === 'selected') {
        const scene = document.createElement('div');
        scene.className = 'asset-scene';
        scene.textContent = `Scene ${String(index + 1).padStart(2, '0')}`;
        card.appendChild(scene);

        const actions = document.createElement('div');
        actions.className = 'asset-actions';
        actions.appendChild(createButton('Up', 'btn-secondary', () => moveSelection(index, -1), index === 0));
        actions.appendChild(createButton('Down', 'btn-secondary', () => moveSelection(index, 1), index === pickerState.selected.length - 1));
        actions.appendChild(createButton('Remove', 'btn-secondary', () => removeSelection(asset)));
        card.appendChild(actions);
        return card;
    }

    const title = document.createElement('div');
    title.className = 'asset-title';
    title.textContent = getReferenceAssetDisplayName(asset, index);

    const meta = document.createElement('div');
    meta.className = 'asset-meta';
    meta.textContent = asset.id || 'Flow asset';

    card.appendChild(title);
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'asset-actions';
    actions.appendChild(createButton('Add', 'btn-primary', () => addSelection(asset)));
    card.appendChild(actions);
    return card;
}

function renderGrid(target, items, mode) {
    if (!target) return;
    target.innerHTML = '';
    if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = mode === 'selected'
            ? 'Selected assets will appear here. Add assets from the left, then set a video prompt for each one.'
            : 'No assets are loaded yet. Click "Reload Assets" while a Flow project tab is open.';
        target.appendChild(empty);
        return;
    }
    items.forEach((asset, index) => target.appendChild(buildCard(asset, index, mode)));
}

function render() {
    const selected = dedupeReferenceSelections(pickerState.selected);
    const selectedKeys = new Set(selected.map(getReferenceAssetKey).filter(Boolean));
    const available = (Array.isArray(pickerState.assets) ? pickerState.assets : []).filter((asset) => {
        const key = getReferenceAssetKey(asset);
        return key && !selectedKeys.has(key);
    });

    if (availableCount) availableCount.textContent = String(available.length);
    if (selectedCount) selectedCount.textContent = String(selected.length);
    if (selectedSummary) {
        selectedSummary.textContent = selected.length
            ? `${selected.length} asset(s) selected. Prompts are assigned by line order.`
            : 'The order here becomes the queue order.';
    }
    if (bulkPromptInput && document.activeElement !== bulkPromptInput) {
        bulkPromptInput.value = buildBulkPromptValue(selected);
    }

    renderGrid(availableGrid, available, 'available');
    renderGrid(selectedGrid, selected, 'selected');
}

function addSelection(asset) {
    pickerState.selected = dedupeReferenceSelections([...pickerState.selected, asset]);
    render();
}

function removeSelection(asset) {
    const key = getReferenceAssetKey(asset);
    pickerState.selected = pickerState.selected.filter((item) => getReferenceAssetKey(item) !== key);
    render();
}

function moveSelection(index, delta) {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= pickerState.selected.length) return;
    const next = [...pickerState.selected];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    pickerState.selected = next;
    render();
}

function clearDropIndicators() {
    selectedGrid?.querySelectorAll('.drop-target, .is-dragging').forEach((element) => {
        element.classList.remove('drop-target');
        element.classList.remove('is-dragging');
    });
}

function moveSelectionToKey(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const current = [...pickerState.selected];
    const fromIndex = current.findIndex((item) => getReferenceAssetKey(item) === sourceKey);
    const toIndex = current.findIndex((item) => getReferenceAssetKey(item) === targetKey);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    pickerState.selected = current;
    render();
}

async function reloadAssetsFromFlow() {
    if (!Number.isInteger(pickerTabId) || pickerTabId <= 0) {
        showStatus('This picker was opened without a Flow project tab. Close it and reopen from the popup.', true);
        return;
    }

    reloadAssetsBtn.disabled = true;
    reloadAssetsBtn.textContent = 'Loading...';
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'LOAD_FLOW_REFERENCE_ASSETS', tabId: pickerTabId }, (res) => {
                if (chrome.runtime.lastError) {
                    resolve({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(res || { ok: false, error: 'No response' });
                }
            });
        });

        if (!response.ok) {
            showStatus(response.error || 'Failed to load assets from Flow.', true);
            return;
        }

        const assets = Array.isArray(response.assets) ? response.assets : [];
        const seen = new Set();
        pickerState.assets = assets.filter((asset) => {
            const key = getReferenceAssetKey(asset);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const currentSettings = await storage.getSettings();
        await storage.updateSettings({
            videoAvailableAssets: pickerState.assets,
            videoAssetProjectUrl: response.tabUrl || currentSettings.videoAssetProjectUrl || null,
            videoAssetQueue: sanitizeVideoAssetQueue(pickerState.selected, pickerState.assets)
        });

        pickerState.selected = sanitizeVideoAssetQueue(pickerState.selected, pickerState.assets);

        render();
        showStatus(`Loaded ${pickerState.assets.length} asset(s) from Flow.`);
    } catch (error) {
        console.error('reloadAssetsFromFlow error:', error);
        showStatus(`Failed to load assets: ${error.message}`, true);
    } finally {
        reloadAssetsBtn.disabled = false;
        reloadAssetsBtn.textContent = 'Reload Assets';
    }
}

async function saveQueue() {
    const settings = await storage.getSettings();
    const selected = sanitizeVideoAssetQueue(pickerState.selected, settings.videoAvailableAssets || pickerState.assets || []);
    await storage.updateSettings({
        videoAssetQueue: selected,
        videoAssetProjectUrl: settings.videoAssetProjectUrl || null
    });
    showStatus(`Saved ${selected.length} video queue item(s).`);
}

async function initialize() {
    const settings = await storage.getSettings();
    let targetTab = null;
    if (Number.isInteger(pickerTabId) && pickerTabId > 0) {
        try {
            targetTab = await chrome.tabs.get(pickerTabId);
        } catch {
            targetTab = null;
        }
    }

    const targetProjectId = extractProjectId(targetTab?.url || '');
    const cachedProjectId = extractProjectId(settings.videoAssetProjectUrl || '');
    const projectChanged = !!targetProjectId && targetProjectId !== cachedProjectId;
    const shouldIgnoreCachedAssets = pickerMode === 'video' && forceReloadOnOpen;

    pickerState.assets = (projectChanged || shouldIgnoreCachedAssets)
        ? []
        : (Array.isArray(settings.videoAvailableAssets) ? settings.videoAvailableAssets : []);
    pickerState.selected = projectChanged
        ? []
        : sanitizeVideoAssetQueue(settings.videoAssetQueue || [], pickerState.assets);
    render();

    reloadAssetsBtn?.addEventListener('click', reloadAssetsFromFlow);
    saveQueueBtn?.addEventListener('click', saveQueue);
    closeWindowBtn?.addEventListener('click', () => window.close());
    bulkPromptInput?.addEventListener('input', (event) => {
        applyBulkPromptValue(event.target.value);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes.flow_automator_settings?.newValue) return;
        const nextSettings = changes.flow_automator_settings.newValue;
        pickerState.assets = Array.isArray(nextSettings.videoAvailableAssets) ? nextSettings.videoAvailableAssets : [];
        pickerState.selected = sanitizeVideoAssetQueue(nextSettings.videoAssetQueue || [], pickerState.assets);
        render();
    });

    if (projectChanged || shouldIgnoreCachedAssets) {
        await storage.updateSettings({
            videoAvailableAssets: [],
            videoAssetProjectUrl: targetTab?.url || null
        });
    }

    if (Number.isInteger(pickerTabId) && pickerTabId > 0) {
        await reloadAssetsFromFlow();
    }
}

initialize();
