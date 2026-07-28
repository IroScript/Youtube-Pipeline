/**
 * Flow Prompt Automator - Automation Script
 * Premium Robust Mode (v1.0)
 * Optimized for Google Flow Labs UI.
 */
if (window.__FLOW_AUTOMATOR_ACTIVE_SUBMISSION__ === true) {
    console.warn('[FlowAutomator] Reinjection deferred while a submission is active.');
} else {
    if (typeof window.__FLOW_AUTOMATOR_TEARDOWN__ === 'function') {
        try { window.__FLOW_AUTOMATOR_TEARDOWN__(); } catch (e) { /* stale extension context */ }
        window.__FLOW_AUTOMATOR_TEARDOWN__ = null;
    }
    window.__FLOW_AUTOMATOR_INIT__ = true;
    (async () => {
        // Routine production diagnostics stay out of the host page console.
        // Warnings and errors remain visible; local debugging can opt in by
        // setting this isolated-world flag before initialization.
        const console = {
            log: (...args) => {
                if (window.__FLOW_AUTOMATOR_DEBUG__ === true) window.console.log(...args);
            },
            info: (...args) => {
                if (window.__FLOW_AUTOMATOR_DEBUG__ === true) window.console.info(...args);
            },
            debug: (...args) => {
                if (window.__FLOW_AUTOMATOR_DEBUG__ === true) window.console.debug(...args);
            },
            warn: (...args) => window.console.warn(...args),
            error: (...args) => window.console.error(...args)
        };

        function safeSendMessage(message) {
            try {
                if (chrome.runtime?.id) {
                    chrome.runtime.sendMessage(message).catch(() => {});
                }
            } catch (e) {
                // Ignore context invalidated errors silently
            }
        }

        let isSubmittingUI = false;
        const globallyClaimedMediaKeys = new Set();
        const canceledPromptSubmissionIds = new Set();
        let cancelAllPromptSubmissions = false;
        let latestFlowGenerationNetworkFailure = null;
        const MIN_FLOW_ASSET_WINDOW_WIDTH_PX = 765;
        const FLOW_ASSET_WINDOW_TOO_NARROW_MESSAGE = `Character and Reference Image features are not supported when the Google Flow panel is narrower than ${MIN_FLOW_ASSET_WINDOW_WIDTH_PX}px. Please widen the Flow panel and run the prompt again.`;


        const seenImages = new Set();
        // Stable media keys already handed to the background downloader in
        // the current page-download run. Flow refreshes signed media URLs while
        // scrolling, so element/src identity alone can otherwise duplicate work.
        const sentDownloadKeys = new Set();
        const onWindowBridgeMessage = (event) => {
            if (event.source !== window) return;
            const data = event.data || {};
            if (data.source !== 'flow-automator' || data.type !== 'FLOW_GENERATION_NETWORK_FAILURE') return;
            latestFlowGenerationNetworkFailure = {
                url: data.url || '',
                status: Number(data.status) || 0,
                statusText: data.statusText || '',
                body: data.body || '',
                at: Number(data.at) || Date.now()
            };
        };
        window.addEventListener('message', onWindowBridgeMessage, true);

        class PromptSubmissionCancelledError extends Error {
            constructor(message = 'Stopped manually') {
                super(message);
                this.name = 'PromptSubmissionCancelledError';
            }
        }

        function isPromptSubmissionCancelled(itemId) {
            return cancelAllPromptSubmissions || (!!itemId && canceledPromptSubmissionIds.has(itemId));
        }

        function assertPromptSubmissionActive(itemId) {
            if (isPromptSubmissionCancelled(itemId)) {
                throw new PromptSubmissionCancelledError();
            }
        }

        async function cancellableDelay(ms, itemId, stepMs = 120) {
            const endAt = Date.now() + Math.max(0, Number(ms) || 0);
            while (Date.now() < endAt) {
                assertPromptSubmissionActive(itemId);
                await new Promise((resolve) => setTimeout(resolve, Math.min(stepMs, Math.max(0, endAt - Date.now()))));
            }
            assertPromptSubmissionActive(itemId);
        }

        function showFlowAutomatorPopupMessage(message, title = 'Panel Too Narrow') {
            const popupId = 'flow-automator-inline-popup';
            const existing = document.getElementById(popupId);
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = popupId;
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-live', 'assertive');
            overlay.style.cssText = [
                'position: fixed',
                'inset: 0',
                'z-index: 2147483647',
                'display: flex',
                'align-items: center',
                'justify-content: center',
                'padding: 24px',
                'background: rgba(15, 23, 42, 0.45)',
                'font-family: Google Sans, Arial, sans-serif'
            ].join(';');

            const card = document.createElement('div');
            card.style.cssText = [
                'width: min(420px, calc(100vw - 48px))',
                'border-radius: 22px',
                'background: #fff',
                'box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28)',
                'border: 1px solid rgba(66, 133, 244, 0.22)',
                'padding: 22px',
                'color: #202124'
            ].join(';');

            const heading = document.createElement('div');
            heading.textContent = title;
            heading.style.cssText = 'font-size: 18px; font-weight: 800; margin-bottom: 10px; color: #1a73e8;';

            const body = document.createElement('div');
            body.textContent = message;
            body.style.cssText = 'font-size: 14px; line-height: 1.55; color: #3c4043; margin-bottom: 18px;';

            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'OK';
            button.style.cssText = [
                'width: 100%',
                'height: 42px',
                'border: 0',
                'border-radius: 999px',
                'background: #1a73e8',
                'color: #fff',
                'font-weight: 800',
                'font-size: 14px',
                'cursor: pointer'
            ].join(';');
            button.addEventListener('click', () => overlay.remove(), { once: true });

            card.appendChild(heading);
            card.appendChild(body);
            card.appendChild(button);
            overlay.appendChild(card);
            document.documentElement.appendChild(overlay);
            setTimeout(() => {
                try { button.focus(); } catch (e) { }
            }, 0);
        }

        function getFlowPanelWidth() {
            return window.innerWidth || document.documentElement?.clientWidth || 0;
        }

        function assertFlowPanelWideEnoughForAssets() {
            const width = getFlowPanelWidth();
            if (width > 0 && width < MIN_FLOW_ASSET_WINDOW_WIDTH_PX) {
                showFlowAutomatorPopupMessage(FLOW_ASSET_WINDOW_TOO_NARROW_MESSAGE);
                const error = new Error(FLOW_ASSET_WINDOW_TOO_NARROW_MESSAGE);
                error.windowTooNarrow = true;
                throw error;
            }
        }

        function safeQuerySelector(selector) {
            if (!selector || typeof selector !== 'string') return null;
            try {
                const parts = selector.split(',');
                for (let part of parts) {
                    part = part.trim();
                    if (!part) continue;

                    // Match selector followed by :contains('...') or :has-text('...')
                    const textMatch = part.match(/(.*?):(contains|has-text)\(['"]?(.*?)['"]?\)/);
                    if (textMatch) {
                        const baseSelector = textMatch[1].trim() || '*';
                        const textToFind = textMatch[3];
                        const candidates = Array.from(document.querySelectorAll(baseSelector));
                        const matched = candidates.find(el => {
                            const isVis = typeof isVisibleElement === 'function' ? isVisibleElement(el) : true;
                            return isVis && (el.textContent || el.innerText || '').toLowerCase().includes(textToFind.toLowerCase());
                        }) || candidates.find(el => (el.textContent || el.innerText || '').toLowerCase().includes(textToFind.toLowerCase()));
                        
                        if (matched) return matched;
                    } else {
                        const el = document.querySelector(part);
                        if (el) return el;
                    }
                }
                return null;
            } catch (e) {
                console.warn('safeQuerySelector error:', e, 'for selector:', selector);
                return null;
            }
        }

        function waitForElement(selector, timeout = 30000) {
            return new Promise((resolve, reject) => {
                const el = safeQuerySelector(selector);
                if (el) return resolve(el);

                let timeoutId = null;
                const observer = new MutationObserver(() => {
                    const el = safeQuerySelector(selector);
                    if (el) {
                        observer.disconnect();
                        if (timeoutId) clearTimeout(timeoutId);
                        resolve(el);
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });
                timeoutId = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error(`Timeout waiting for selector: ${selector}`));
                }, timeout);
            });
        }

        function isDisabledButton(btn) {
            if (!btn) return true;
            const ariaDisabled = btn.getAttribute('aria-disabled');
            const dataDisabled = btn.getAttribute('data-disabled');
            return !!(btn.disabled || ariaDisabled === 'true' || dataDisabled === 'true' || btn.classList.contains('disabled'));
        }

        function fireClick(el) {
            if (!el) return;
            try {
                if (typeof el.click === 'function') {
                    el.click();
                    return;
                }
            } catch (e) { }
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, buttons: 1 }));
        }

        // ── Bridge-based React fiber click ──────────────────────────────────────
        // Content script synthetic events are isTrusted:false and React 17+ event
        // delegation ignores them. The ONLY way to trigger a React onClick from a
        // content script is to call the __reactProps$.onClick function directly in
        // the main world — which the bridge.js script running in the page context can do.
        async function tryClickSubmitViaBridge(btn) {
            try {
                await injectBridgeScript();
            } catch (e) { }
            let btnId = '';
            if (btn) {
                btnId = btn.getAttribute('data-flow-automator-id');
                if (!btnId) {
                    btnId = 'btn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                    btn.setAttribute('data-flow-automator-id', btnId);
                }
            }
            return new Promise(function (resolve) {
                var reqId = 'click_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                var settled = false;
                function onResult(evt) {
                    if (!evt || !evt.detail || evt.detail.requestId !== reqId) return;
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('FLOW_AUTOMATOR_CLICK_SUBMIT_RESULT', onResult, true);
                    resolve(evt.detail.ok === true);
                }
                window.addEventListener('FLOW_AUTOMATOR_CLICK_SUBMIT_RESULT', onResult, true);
                try {
                    document.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_CLICK_SUBMIT', {
                        detail: { requestId: reqId, targetId: btnId }
                    }));
                } catch (e) {
                    settled = true;
                    resolve(false);
                }
                setTimeout(function () {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('FLOW_AUTOMATOR_CLICK_SUBMIT_RESULT', onResult, true);
                    resolve(false);
                }, 1500);
            });
        }

        // Click an arbitrary element via the bridge's React fiber onClick. Flow's
        // reference-image tiles ignore synthetic (isTrusted:false) pointer/mouse
        // events, so plain dispatchEvent clicks "find but don't select". This routes
        // the click through the page-context bridge which calls React's onClick prop.
        async function tryClickElementViaBridge(el) {
            if (!el) return false;
            try { await injectBridgeScript(); } catch (e) { }
            let elId = el.getAttribute('data-flow-automator-id');
            if (!elId) {
                elId = 'el_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                el.setAttribute('data-flow-automator-id', elId);
            }
            return new Promise(function (resolve) {
                const reqId = 'clickel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                let settled = false;
                function onResult(evt) {
                    if (!evt || !evt.detail || evt.detail.requestId !== reqId) return;
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('FLOW_AUTOMATOR_CLICK_ELEMENT_RESULT', onResult, true);
                    resolve(evt.detail.ok === true);
                }
                window.addEventListener('FLOW_AUTOMATOR_CLICK_ELEMENT_RESULT', onResult, true);
                try {
                    document.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_CLICK_ELEMENT', {
                        detail: { requestId: reqId, targetId: elId }
                    }));
                } catch (e) {
                    settled = true;
                    resolve(false);
                }
                setTimeout(function () {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('FLOW_AUTOMATOR_CLICK_ELEMENT_RESULT', onResult, true);
                    resolve(false);
                }, 1500);
            });
        }

        async function scanAssetsViaBridge() {
            try {
                await injectBridgeScript();
            } catch (e) { }
            return new Promise(function (resolve) {
                var reqId = 'scan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                var settled = false;
                function onResult(evt) {
                    if (!evt || !evt.detail || evt.detail.requestId !== reqId) return;
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('FLOW_AUTOMATOR_GET_ASSETS_RESULT', onResult, true);
                    resolve(evt.detail.assetMap || {});
                }
                window.addEventListener('FLOW_AUTOMATOR_GET_ASSETS_RESULT', onResult, true);
                try {
                    document.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_GET_ASSETS', {
                        detail: { requestId: reqId }
                    }));
                } catch (e) {
                    settled = true;
                    resolve({});
                }
                setTimeout(function () {
                    if (settled) return;
                    settled = true;
                    window.removeEventListener('FLOW_AUTOMATOR_GET_ASSETS_RESULT', onResult, true);
                    resolve({});
                }, 1500);
            });
        }

        function fireClickSequence(el) {
            if (!el) return;
            try {
                el.scrollIntoView({ block: 'center', inline: 'center' });
            } catch (e) { }
            try { el.focus(); } catch (e) { }

            try {
                const rect = el.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                const targets = [el];
                const innerIcon = el.querySelector('i, svg, img, span.google-symbols, span.material-icons');
                if (innerIcon) targets.push(innerIcon);

                targets.forEach(target => {
                    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, buttons: 1, pointerId: 1, clientX: x, clientY: y }));
                    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, buttons: 1, clientX: x, clientY: y }));
                    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, buttons: 0, pointerId: 1, clientX: x, clientY: y }));
                    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0, clientX: x, clientY: y }));
                    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, buttons: 1 }));
                });
                
                // Radix UI accessibility fallback
                el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
                el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
                el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ', code: 'Space', keyCode: 32 }));
                el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true, cancelable: true, key: ' ', code: 'Space', keyCode: 32 }));
            } catch (e) { }
            fireClick(el);
        }

        function fireHoverSequence(el) {
            if (!el) return;
            try {
                el.scrollIntoView({ block: 'center', inline: 'center' });
            } catch (e) { }
            try {
                const rect = el.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                const target = document.elementFromPoint(x, y)?.closest?.('button, [role="button"], [role="menuitem"], [data-radix-collection-item]') || el;
                const eventInit = {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    view: window,
                    clientX: x,
                    clientY: y,
                    screenX: x,
                    screenY: y,
                    pointerId: 1,
                    pointerType: 'mouse',
                    isPrimary: true,
                    buttons: 0
                };
                [target, el].filter(Boolean).forEach((node) => {
                    node.dispatchEvent(new PointerEvent('pointerover', eventInit));
                    node.dispatchEvent(new PointerEvent('pointerenter', eventInit));
                    node.dispatchEvent(new MouseEvent('mouseover', eventInit));
                    node.dispatchEvent(new MouseEvent('mouseenter', eventInit));
                    node.dispatchEvent(new PointerEvent('pointermove', eventInit));
                    node.dispatchEvent(new MouseEvent('mousemove', eventInit));
                });
                try { el.focus(); } catch (e) { }
            } catch (e) { }
        }

        function fireMouseClick(el) {
            if (!el) return;
            try {
                el.scrollIntoView({ block: 'center', inline: 'center' });
            } catch (e) { }
            try {
                const rect = el.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                const eventInit = { bubbles: true, cancelable: true, view: window, buttons: 1, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse' };
                el.dispatchEvent(new PointerEvent('pointerdown', eventInit));
                el.dispatchEvent(new MouseEvent('mousedown', eventInit));
                el.dispatchEvent(new PointerEvent('pointerup', { ...eventInit, buttons: 0 }));
                el.dispatchEvent(new MouseEvent('mouseup', { ...eventInit, buttons: 0 }));
                el.dispatchEvent(new MouseEvent('click', eventInit));
            } catch (e) { }
        }

        function fireMouseClickAt(x, y) {
            const target = document.elementFromPoint(x, y);
            if (!target) return null;
            const clickable = target.closest?.('button, [role="button"], [role="menuitem"], [data-radix-collection-item]') || target;
            fireMouseClick(clickable);
            return clickable;
        }


        function waitForEnabled(btn, timeout = 15000) {
            return new Promise((resolve, reject) => {
                if (!isDisabledButton(btn)) return resolve(true);

                let timeoutId = null;
                const observer = new MutationObserver(() => {
                    if (!isDisabledButton(btn)) {
                        observer.disconnect();
                        if (timeoutId) clearTimeout(timeoutId);
                        resolve(true);
                    }
                });

                observer.observe(btn, { attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'data-disabled', 'class'] });
                timeoutId = setTimeout(() => {
                    observer.disconnect();
                    reject(new Error('Button still disabled.'));
                }, timeout);
            });
        }

        function findButtonByText(selector, text) {
            try {
                const cleanSelector = selector.split(',')
                    .map(s => s.replace(/:contains\(['"]?.*?['"]?\)/g, ''))
                    .map(s => s.replace(/:has-text\(['"]?.*?['"]?\)/g, ''))
                    .filter(s => s.trim().length > 0)
                    .join(',')
                    .trim() || 'button';
                const buttons = Array.from(document.querySelectorAll(cleanSelector));
                const candidates = buttons.filter(b => (b.innerText || b.textContent || '').toLowerCase().includes(text.toLowerCase()));
                return candidates.find(b => typeof isVisibleElement === 'function' ? isVisibleElement(b) : true) || candidates[0] || null;
            } catch (e) {
                return null;
            }
        }

        function findButtonByIcon(iconText) {
            try {
                // Check common material icons/symbols
                const icons = Array.from(document.querySelectorAll('span, i, .material-icons, .google-symbols, .sc-icon'));
                const matchedIcons = icons.filter(icon => (icon.innerText || icon.textContent || '').trim().toLowerCase() === iconText.toLowerCase());
                const buttons = matchedIcons
                    .map(icon => icon.closest('button, [role="button"]'))
                    .filter(Boolean);
                const visibleBtn = buttons.find(btn => typeof isVisibleElement === 'function' ? isVisibleElement(btn) : true);
                if (visibleBtn) return visibleBtn;
                if (buttons.length > 0) return buttons[0];

                // Fallback for SVG based icons if iconText is 'download'
                if (iconText.toLowerCase() === 'download') {
                    const svgs = Array.from(document.querySelectorAll('svg'));
                    const downloadSvgs = svgs.filter(s => s.innerHTML.includes('download') || s.getAttribute('aria-label')?.includes('download'));
                    const svgButtons = downloadSvgs
                        .map(s => s.closest('button, [role="button"]'))
                        .filter(Boolean);
                    const visibleSvgBtn = svgButtons.find(btn => typeof isVisibleElement === 'function' ? isVisibleElement(btn) : true);
                    if (visibleSvgBtn) return visibleSvgBtn;
                    if (svgButtons.length > 0) return svgButtons[0];
                }
                return null;
            } catch (e) {
                return null;
            }
        }

        function isDownloadLikeButton(btn) {
            if (!btn) return false;
            const txt = (btn.innerText || btn.textContent || '').toLowerCase();
            const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
            const title = (btn.getAttribute('title') || '').toLowerCase();
            return txt.includes('download') || aria.includes('download') || title.includes('download') ||
                txt.includes('history') || aria.includes('history') || title.includes('history');
        }

        function normalizeText(text) {
            return (text || '')
                .toString()
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();
        }

        function textOf(el) {
            if (!el) return '';
            return normalizeText(`${el.innerText || ''} ${el.textContent || ''} ${el.getAttribute?.('aria-label') || ''} ${el.getAttribute?.('title') || ''}`);
        }

        function normalizeModelText(text) {
            return normalizeText(text)
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function getFlowContext() {
            const path = window.location.pathname || '';
            const parts = path.split('/').filter(Boolean);
            const projectIdx = parts.indexOf('project');
            const hasProjectId = projectIdx !== -1 && !!parts[projectIdx + 1];
            const hasSubId = hasProjectId && !!parts[projectIdx + 2];
            return {
                hasProjectId,
                isSubProject: hasSubId
            };
        }

        function getTargetModelLabel(modelValue) {
            const val = normalizeText(modelValue);
            if (val.includes('veo')) {
                if (val.includes('quality')) return 'veo 3 1 quality';
                if (val.includes('lite')) return 'veo 3 1 lite';
                if (val.includes('fast')) return 'veo 3 1 fast';
                return 'veo';
            }
            if (val.includes('omni flash')) {
                return 'omni flash';
            }
            if (val.includes('nano banana pro') || val.includes('nano pro')) {
                return 'nano banana pro';
            }
            return val || 'nano banana 2';
        }

        function findComposerModeChip() {
            const createBtn = Array.from(document.querySelectorAll('button, [role="button"]'))
                .filter(isVisibleElement)
                .find((el) => {
                    const txt = textOf(el);
                    return txt.includes('create') || txt.includes('arrow forward');
                });

            const isModeChip = (el) => {
                const txt = textOf(el);
                if (!txt) return false;
                if (txt.includes('view images') || txt.includes('view videos')) return false;
                return (txt.startsWith('video') || txt.startsWith('image') || txt.includes('video crop') || txt.includes('image crop'));
            };

            if (createBtn) {
                let scope = createBtn.closest('form, section, article, [role="main"], div') || createBtn.parentElement;
                for (let depth = 0; depth < 6 && scope; depth++) {
                    const buttons = Array.from(scope.querySelectorAll('button, [role="button"], [role="tab"]'))
                        .filter(isVisibleElement);
                    const match = buttons.find(isModeChip);
                    if (match) return match;
                    scope = scope.parentElement;
                }
            }

            const composerPair = findBestComposerPair();
            const composerScope = composerPair?.input?.closest('form, section, article, [role="main"], div') || null;
            return Array.from((composerScope || document).querySelectorAll('button, [role="button"], [role="tab"]'))
                .filter(isVisibleElement)
                .find(isModeChip) || null;
        }

        function findOutputTypeButton(targetType) {
            const wanted = normalizeText(targetType) === 'video' ? 'video' : 'image';

            // Helper checks for localized media types
            const isVideoText = (txt) => txt.includes('video') || txt.includes('videocam') || txt.includes('동영상') || txt.includes('비디오') || txt.includes('视频') || txt.includes('影片') || txt.includes('動画') || txt.includes('vidéo') || txt.includes('vídeo');
            const isImageText = (txt) => txt.includes('image') || txt.includes('이미지') || txt.includes('사진') || txt.includes('gallery') || txt.includes('图片') || txt.includes('画像') || txt.includes('bild') || txt.includes('imagen') || txt.includes('imagem') || txt.includes('immagine');

            // 1. Dynamic Tablist logic (New UI: Slider container above composer)
            const tablists = Array.from(document.querySelectorAll('[role="tablist"]')).filter(isVisibleElement);
            for (const tl of tablists) {
                const buttons = Array.from(tl.querySelectorAll('[role="tab"]')).filter(isVisibleElement);
                const hasImage = buttons.some(b => isImageText((b.textContent || '').toLowerCase()));
                const hasVideo = buttons.some(b => isVideoText((b.textContent || '').toLowerCase()));
                
                if (hasImage && hasVideo) {
                    const targetBtn = buttons.find(b => {
                        const txt = (b.textContent || '').toLowerCase();
                        if (wanted === 'video') return isVideoText(txt);
                        return isImageText(txt);
                    });
                    if (targetBtn) return targetBtn;
                }
            }

            // 2. Far-left sidebar navigation buttons
            const allNavButtons = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'))
                .filter(isVisibleElement);
            
            const sidebarCandidates = allNavButtons.filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= 0 && rect.left < 140 && rect.width > 0 && rect.height > 0;
            });

            const sidebarMatch = sidebarCandidates.find(el => {
                const txt = textOf(el);
                if (wanted === 'video') return isVideoText(txt);
                return isImageText(txt);
            });
            if (sidebarMatch) return sidebarMatch;

            // 3. Look inside the settings popover
            const popover = document.querySelector('[role="dialog"], [data-state="open"], .sc-658f8892-0');
            if (popover) {
                const buttons = Array.from(popover.querySelectorAll('button, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"]')).filter(isVisibleElement);
                const popoverMatch = buttons.find(el => {
                    const txt = textOf(el);
                    if (wanted === 'video') return txt === 'video' || txt.includes('single video') || txt.includes('videos') || isVideoText(txt);
                    return txt === 'image' || txt.includes('single image') || txt.includes('images') || isImageText(txt);
                });
                if (popoverMatch) return popoverMatch;
            }

            const modeChip = findComposerModeChip();
            if (modeChip) {
                const txt = textOf(modeChip);
                if (wanted === 'video' && (txt.startsWith('video') || txt.includes('video crop') || isVideoText(txt))) return modeChip;
                if (wanted === 'image' && (txt.startsWith('image') || txt.includes('image crop') || isImageText(txt))) return modeChip;
            }

            const exactSelectors = wanted === 'video'
                ? [
                    '[role="tab"][id$="-trigger-VIDEO"]',
                    '[role="tab"][aria-controls*="content-VIDEO"]',
                    '.flow_tab_slider_trigger[role="tab"][id*="trigger-VIDEO"]'
                ]
                : [
                    '[role="tab"][id$="-trigger-IMAGE"]',
                    '[role="tab"][id$="-trigger-IMAGES"]',
                    '[role="tab"][aria-controls*="content-IMAGE"]',
                    '[role="tab"][aria-controls*="content-IMAGES"]',
                    '.flow_tab_slider_trigger[role="tab"][id*="trigger-IMAGE"]'
                ];

            for (const sel of exactSelectors) {
                const el = safeQuerySelector(sel);
                if (el && isVisibleElement(el)) return el;
            }

            const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
                .filter(isVisibleElement);
            const tabMatch = tabs.find(el => {
                const txt = textOf(el);
                if (wanted === 'video') return txt === 'video' || txt.includes('single video') || txt.includes('videos') || isVideoText(txt);
                return txt === 'image' || txt.includes('single image') || txt.includes('images') || isImageText(txt);
            });
            if (tabMatch) return tabMatch;

            const all = Array.from(document.querySelectorAll('button, [role="button"], [role="menuitemradio"], [role="tab"], [role="combobox"]'))
                .filter(isVisibleElement);
            return all.find(el => {
                const txt = textOf(el);
                if (txt.includes('all media') || txt.includes('media')) return false;
                if (wanted === 'video') {
                    return txt.includes('video') || txt.includes('single video') || txt.includes('videos') || isVideoText(txt);
                }
                return txt.includes('image') || txt.includes('single image') || txt.includes('images') || isImageText(txt);
            });
        }

        function isOutputTypeChipActive(targetType) {
            const wanted = normalizeText(targetType) === 'video' ? 'video' : 'image';
            const btn = findOutputTypeButton(wanted);
            if (!btn) return false;
            const txt = textOf(btn);
            if (wanted === 'video') {
                return txt.startsWith('video') || txt.includes('video crop') || txt.includes('동영상') || txt.includes('비디오') || txt.includes('视频') || txt.includes('動画');
            }
            return txt.startsWith('image') || txt.includes('image crop') || txt.includes('이미지') || txt.includes('사진') || txt.includes('图片') || txt.includes('画像');
        }

        function scoreVideoSettingsPanelCandidate(node) {
            if (!node || !node.isConnected || !isVisibleElement(node)) return -1;
            if (node === document.body || node === document.documentElement) return -1;
            const rect = node.getBoundingClientRect?.();
            if (!rect || rect.width < 140 || rect.height < 80) return -1;
            const txt = textOf(node);

            // Relaxed keyword check: must contain at least one settings/video/image term (including localized ones)
            const keywords = [
                'image', 'video', 'frame', 'ingredient', 'model', 'veo', 'omni', 'flash', 'credits',
                'crop', 'ratio', 'quantity', 'aspect', 'seconds', 'duration', 'banana', 'imagen', 'pro', 'nano',
                '프레임', '재료', '동영상', '비디오', '이미지', '사진', '초', '秒', '视频', '图片', '動画', '画像'
            ];
            const hasKeyword = keywords.some(kw => txt.includes(kw));
            if (!hasKeyword) return -1;

            const hasOutputTypeControls = (txt.includes('image') || txt.includes('이미지') || txt.includes('图片') || txt.includes('画像')) && 
                (txt.includes('video') || txt.includes('동영상') || txt.includes('비디오') || txt.includes('视频') || txt.includes('動画'));
            const hasVideoPanelControls = (txt.includes('frames') || txt.includes('프레임') || txt.includes('秒') || txt.includes('動画')) && 
                (txt.includes('ingredients') || txt.includes('재료') || txt.includes('ingredient'));
            const hasVideoModelControls = txt.includes('veo') || txt.includes('omni') || txt.includes('credits') || txt.includes('banana') || txt.includes('nano');
            
            let score = 0;

            if (node.getAttribute('role') === 'dialog' || node.tagName === 'DIALOG') score += 18;
            if (node.matches?.('[data-state="open"], [data-radix-menu-content], [data-radix-dropdown-menu-content], [data-radix-popper-content-wrapper]')) score += 18;
            const style = window.getComputedStyle(node);
            const isFloatingPanel = node.getAttribute('role') === 'dialog'
                || node.tagName === 'DIALOG'
                || style.position === 'fixed'
                || style.position === 'absolute'
                || node.matches?.('[data-state="open"], [data-radix-menu-content], [data-radix-dropdown-menu-content], [data-radix-popper-content-wrapper]');
            if (!isFloatingPanel && rect.width > window.innerWidth * 0.92 && rect.height > window.innerHeight * 0.72) return -1;
            if (style.position === 'fixed' || style.position === 'absolute') score += 12;

            if (hasOutputTypeControls) score += 30;
            if (hasVideoPanelControls) score += 34;
            if (hasVideoModelControls) score += 18;
            if (txt.includes('credits')) score += 10;
            if (txt.includes('download') || txt.includes('upscale')) score -= 28;
            if (rect.width > window.innerWidth * 0.96 && rect.height > window.innerHeight * 0.9) score -= 18;

            return score;
        }

        function findVideoSettingsPanel() {
            const roots = [];
            const push = (node) => {
                if (!node || !node.isConnected || roots.includes(node)) return;
                roots.push(node);
            };

            Array.from(document.querySelectorAll(
                '[role="dialog"], dialog, [data-state="open"], [data-radix-menu-content], [data-radix-dropdown-menu-content], [data-radix-popper-content-wrapper]'
            )).forEach(push);

            const videoControls = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], [role="combobox"]'))
                .filter(isVisibleElement)
                .filter((el) => {
                    const txt = textOf(el);
                    return txt.includes('frames')
                        || txt.includes('ingredients')
                        || txt.includes('veo')
                        || txt.includes('omni flash')
                        || txt === 'image'
                        || txt === 'video'
                        || txt.includes('image ')
                        || txt.includes('video ');
                });

            for (const control of videoControls) {
                let node = control.parentElement;
                for (let depth = 0; depth < 10 && node && node !== document.body; depth++, node = node.parentElement) {
                    const rect = node.getBoundingClientRect?.();
                    if (!rect || rect.width < 160 || rect.height < 80) continue;
                    push(node);
                }
            }

            const scored = roots
                .map((node) => ({ node, score: scoreVideoSettingsPanelCandidate(node) }))
                .filter(({ score }) => score >= 32)
                .sort((a, b) => b.score - a.score);
            return scored[0]?.node || null;
        }

        async function waitForVideoSettingsPanel(timeoutMs = 4000) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                const panel = findVideoSettingsPanel();
                if (panel) return panel;
                await new Promise(r => setTimeout(r, 180));
            }
            return null;
        }

        function findVideoSettingsTrigger() {
            const composerPair = findBestComposerPair();
            const inputRect = composerPair?.input?.getBoundingClientRect?.() || null;
            const createBtn = Array.from(document.querySelectorAll('button, [role="button"]'))
                .filter(isVisibleElement)
                .map((el) => {
                    const txt = textOf(el);
                    const iconText = normalizeText(Array.from(el.querySelectorAll('i, .google-symbols, .material-icons'))
                        .map((icon) => icon.textContent || '')
                        .join(' '));
                    const rect = el.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
                    const score = (txt.includes('arrow forward') || iconText.includes('arrow forward') ? 90 : 0)
                        + (txt.includes('create') || txt === 'submit' ? 18 : 0)
                        + (iconText.includes('add 2') ? -80 : 0)
                        + (rect.left > window.innerWidth * 0.55 ? 12 : 0)
                        + (rect.top > window.innerHeight * 0.45 ? 12 : 0);
                    return { el, score };
                })
                .filter(({ score }) => score > 0)
                .sort((a, b) => b.score - a.score)[0]?.el || null;

            const createRect = createBtn?.getBoundingClientRect?.() || null;

            const exactFlowSummaryButton = Array.from(document.querySelectorAll('button[aria-haspopup], [role="button"][aria-haspopup], button[aria-controls][aria-haspopup]'))
                .filter(isVisibleElement)
                .map((el) => {
                    const popupVal = el.getAttribute('aria-haspopup');
                    if (popupVal !== 'menu' && popupVal !== 'dialog' && popupVal !== 'true') return { el, score: -999 };
                    const txt = textOf(el);
                    const iconText = normalizeText(Array.from(el.querySelectorAll('i, .google-symbols, .material-icons'))
                        .map((icon) => icon.textContent || '')
                        .join(' '));
                    const combined = `${txt} ${iconText}`.trim();
                    const hasType = combined.includes('video') || combined.includes('image') ||
                        combined.includes('동영상') || combined.includes('비디오') || combined.includes('이미지') || combined.includes('사진') ||
                        combined.includes('视频') || combined.includes('图片') || combined.includes('動画') || combined.includes('画像') ||
                        combined.includes('vidéo') || combined.includes('photo');
                    const hasQty = /\b[1-4]\s*x\b/.test(combined) || /\bx\s*[1-4]\b/.test(combined);
                    const hasCrop = combined.includes('crop') || /\b(9:16|16:9|1:1|4:3|3:4)\b/.test(combined);
                    const hasModelName = combined.includes('veo') || combined.includes('omni') || combined.includes('flash') || combined.includes('lite') || combined.includes('fast') || combined.includes('imagen');
                    const hasDuration = /\b\d+\s*(s|초|秒|sec|sek)\b/i.test(combined);
                    if (!hasType && !hasQty && !hasCrop && !hasModelName && !hasDuration) return { el, score: -999 };
                    if (combined.includes('agent') || combined.includes('create') || combined.includes('arrow forward') || combined.includes('add 2')) {
                        return { el, score: -999 };
                    }
                    // Exclude panel-internal mode option buttons that only say "Ingredients"/"Frames"
                    // with no model name or duration — they aren't the settings trigger chip.
                    const isModeWord = combined.includes('ingredients') || combined.includes('frames') ||
                        combined.includes('재료') || combined.includes('프레임') || combined.includes('秒') || combined.includes('動画');
                    if (!hasQty && !hasCrop && isModeWord) {
                        if (!hasModelName && !hasDuration) return { el, score: -999 };
                    }
                    const rect = el.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
                    const isLeftOfCreate = createRect ? rect.right <= createRect.left + 20 : false;
                    let score = 80;
                    if (hasType) score += 35;
                    if (hasQty) score += 30;
                    if (hasCrop) score += 20;
                    if (hasModelName) score += 25;
                    if (hasDuration) score += 15;
                    if (el.getAttribute('data-state') === 'open' || el.getAttribute('aria-expanded') === 'true') score += 18;
                    if (isLeftOfCreate) score += 45;
                    if (rect.top > window.innerHeight * 0.45) score += 12;
                    return { el, score };
                })
                .filter(({ score }) => score > 0)
                .sort((a, b) => b.score - a.score)[0]?.el || null;

            if (exactFlowSummaryButton) return exactFlowSummaryButton;

            const summaryChip = Array.from(document.querySelectorAll('button, [role="button"]'))
                .filter(isVisibleElement)
                .map((el) => {
                    const txt = textOf(el);
                    if (!txt || txt.includes('create') || txt.includes('arrow forward') || txt.includes('download')) {
                        return { el, score: -999 };
                    }
                    const hasType = txt.includes('video') || txt.includes('image') ||
                        txt.includes('동영상') || txt.includes('비디오') || txt.includes('이미지') || txt.includes('사진') ||
                        txt.includes('视频') || txt.includes('图片') || txt.includes('動画') || txt.includes('画像') ||
                        txt.includes('vidéo') || txt.includes('photo');
                    const hasQty = /\b[1-4]\s*x\b/.test(txt) || /\bx\s*[1-4]\b/.test(txt);
                    const hasModelName = txt.includes('veo') || txt.includes('omni') || txt.includes('flash') || txt.includes('lite') || txt.includes('fast') || txt.includes('imagen');
                    const hasDuration = /\b\d+\s*(s|초|秒|sec|sek)\b/i.test(txt);
                    // Exclude bare mode-option buttons (just "Ingredients"/"Frames" with no model or duration).
                    const isModeWordTxt = txt.includes('frames') || txt.includes('ingredients') || txt.includes('credits') ||
                        txt.includes('재료') || txt.includes('프레임') || txt.includes('秒') || txt.includes('動画');
                    if (isModeWordTxt) {
                        if (!hasModelName && !hasDuration) return { el, score: -999 };
                    }
                    const hasRatio = /\b(9:16|16:9|1:1|4:3|3:4)\b/.test(txt);
                    const hasDropdown = el.getAttribute('aria-haspopup') || el.querySelector?.('svg, .google-symbols, .material-icons');
                    if (!hasType && !hasQty && !hasRatio && !hasModelName && !hasDuration) return { el, score: -999 };

                    const rect = el.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const submitDistance = createRect
                        ? Math.abs(centerX - (createRect.left + createRect.width / 2)) + Math.abs(centerY - (createRect.top + createRect.height / 2))
                        : 9999;
                    const isLeftOfCreate = createRect ? rect.right <= createRect.left + 16 : false;

                    let score = 0;
                    if (hasType) score += 42;
                    if (hasQty) score += 34;
                    if (hasRatio) score += 24;
                    if (hasModelName) score += 25;
                    if (hasDuration) score += 15;
                    if (hasDropdown) score += 14;
                    if (isLeftOfCreate) score += 60;
                    if (submitDistance < 240) score += 46;
                    if (rect.top > window.innerHeight * 0.45) score += 20;
                    if (rect.width >= 48 && rect.width <= 220) score += 10;
                    return { el, score };
                })
                .filter(({ score }) => score > 0)
                .sort((a, b) => b.score - a.score)[0]?.el || null;

            if (summaryChip) return summaryChip;

            const scored = Array.from(document.querySelectorAll('button, [role="button"], [role="combobox"]'))
                .filter(isVisibleElement)
                .map((el) => {
                    const txt = textOf(el);
                    if (!txt || txt.includes('view videos') || txt.includes('view images') || txt.includes('download')) return { el, score: -999 };
                    const hasVideoText = txt === 'video' || /^video\b/.test(txt) || txt.includes('video crop') || txt.includes('video') ||
                        txt.includes('동영상') || txt.includes('비디오') || txt.includes('视频') || txt.includes('動画');
                    const hasImageText = txt === 'image' || /^image\b/.test(txt) || txt.includes('image crop') || txt.includes('image') ||
                        txt.includes('이미지') || txt.includes('사진') || txt.includes('图片') || txt.includes('画像');
                    const hasQty = /\b[1-4]\s*x\b/.test(txt) || /\bx\s*[1-4]\b/.test(txt);
                    const hasModelName = txt.includes('veo') || txt.includes('omni') || txt.includes('flash') || txt.includes('lite') || txt.includes('fast') || txt.includes('imagen');
                    const hasDuration = /\b\d+\s*(s|초|秒|sec|sek)\b/i.test(txt);
                    // Exclude bare mode-option buttons (just "Ingredients"/"Frames" with no model/duration).
                    const isModeWordTxt2 = txt.includes('frames') || txt.includes('ingredients') || txt.includes('credits') ||
                        txt.includes('재료') || txt.includes('프레임') || txt.includes('秒') || txt.includes('動画');
                    if (isModeWordTxt2) {
                        if (!hasModelName && !hasDuration) return { el, score: -999 };
                    }
                    const hasDropdown = el.getAttribute('aria-haspopup') || el.querySelector?.('svg, .google-symbols, .material-icons');
                    if (!hasVideoText && !hasImageText && !hasModelName && !hasDuration) return { el, score: -999 };

                    const rect = el.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const submitDistance = createRect
                        ? Math.abs(centerX - (createRect.left + createRect.width / 2)) + Math.abs(centerY - (createRect.top + createRect.height / 2))
                        : 9999;
                    const inputDistance = inputRect
                        ? Math.abs(centerX - (inputRect.left + inputRect.width / 2)) + Math.abs(centerY - (inputRect.bottom || inputRect.top))
                        : 9999;

                    let score = 0;
                    if (hasQty) score += 80;
                    if (hasModelName) score += 25;
                    if (hasDuration) score += 15;
                    const isVideoStart = txt.startsWith('video') || txt.startsWith('동영상') || txt.startsWith('비디오') || txt.startsWith('视频') || txt.startsWith('動画');
                    const isImageStart = txt.startsWith('image') || txt.startsWith('이미지') || txt.startsWith('사진') || txt.startsWith('图片') || txt.startsWith('画像');
                    if (isVideoStart) score += 35;
                    if (isImageStart) score += 28;
                    if (txt === 'video' || txt === '동영상') score -= 45;
                    if (txt === 'image' || txt === '이미지') score -= 35;
                    if (hasDropdown) score += 20;
                    if (createRect && submitDistance < 220) score += 55;
                    if (inputRect && inputDistance < 320) score += 35;
                    if (rect.top > window.innerHeight * 0.45) score += 15;
                    if (rect.left > window.innerWidth * 0.35) score += 8;
                    if (el.getAttribute('role') === 'tab') score -= 35;
                    if (txt.includes('single video') || txt.includes('videos')) score -= 25;
                    return { el, score };
                })
                .filter(({ score }) => score > 0)
                .sort((a, b) => b.score - a.score);

            return scored[0]?.el || findOutputTypeButton('video') || findOutputTypeButton('image') || findComposerModeChip();
        }

        async function ensureVideoSettingsPanelOpen() {
            let panel = findVideoSettingsPanel();
            if (panel) return panel;

            const trigger = findVideoSettingsTrigger();
            const outputVideo = findOutputTypeButton('video');
            const outputImage = findOutputTypeButton('image');
            const modeChip = findComposerModeChip();
            const candidates = [trigger, outputVideo, outputImage, modeChip].filter(Boolean);
            const seen = new Set();
            for (const trigger of candidates) {
                if (seen.has(trigger)) continue;
                seen.add(trigger);
                const bridgeOk = await tryClickElementViaBridge(trigger);
                if (!bridgeOk) {
                    fireMouseClick(trigger);
                    fireClickSequence(trigger);
                }
                panel = await waitForVideoSettingsPanel(5200);
                if (panel) return panel;
            }

            return null;
        }

        // Close the settings dropdown after applying options. The composer "+"
        // media picker can't be interacted with reliably while a Radix dropdown
        // is still open (outside-click/focus handling swallows events), so every
        // settings-apply path must leave the panel closed.
        async function closeVideoSettingsPanelIfOpen() {
            for (let attempt = 0; attempt < 3 && findVideoSettingsPanel(); attempt++) {
                const trigger = findVideoSettingsTrigger();
                if (trigger?.getAttribute?.('aria-expanded') === 'true') {
                    // Toggle the chip closed — the same interaction a user makes.
                    const bridgeOk = await tryClickElementViaBridge(trigger);
                    if (!bridgeOk) {
                        fireMouseClick(trigger);
                        fireClickSequence(trigger);
                    }
                } else {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
                }
                await new Promise(r => setTimeout(r, 400));
            }
            return !findVideoSettingsPanel();
        }

        function isOptionActive(el) {
            return el?.getAttribute?.('aria-pressed') === 'true'
                || el?.getAttribute?.('aria-selected') === 'true'
                || el?.getAttribute?.('aria-checked') === 'true'
                || el?.getAttribute?.('data-state') === 'active'
                || el?.getAttribute?.('data-state') === 'checked'
                || el?.classList?.contains('active');
        }

        async function clickVideoPanelOption(panel, matcher) {
            if (!panel) return false;
            let target = null;
            if (typeof matcher === 'string') {
                target = panel.querySelector(matcher);
            } else {
                const candidates = Array.from(panel.querySelectorAll('button, [role="button"], [role="tab"], [role="menuitemradio"]'))
                    .filter(isVisibleElement)
                    .map((el) => ({ el, txt: textOf(el) }))
                    .filter(({ txt }) => txt && txt.length <= 80 && matcher(txt));
                const active = candidates.find(({ el }) => isOptionActive(el));
                if (active) return true;
                target = candidates[0]?.el || null;
            }

            if (!target) return false;
            if (isOptionActive(target)) return true;

            // tryClickElementViaBridge() can report success via its native-click
            // fallback even when the click didn't actually register (confirmed for
            // Radix-style dropdown triggers) — always fire the full pointer
            // sequence too and verify the option actually became active instead of
            // trusting the bridge's report alone.
            await tryClickElementViaBridge(target);
            await new Promise(r => setTimeout(r, 250));
            if (isOptionActive(target)) return true;

            fireMouseClick(target);
            fireClickSequence(target);
            await new Promise(r => setTimeout(r, 700));
            return true;
        }

        // Ordered longest-first so ambiguous prefixes resolve correctly:
        // "nano banana 2" must NOT match a trigger currently showing
        // "Nano Banana 2 Lite" (or the switch would be silently skipped).
        const KNOWN_MODEL_LABELS = [
            'veo 3 1 quality',
            'veo 3 1 fast',
            'veo 3 1 lite',
            'nano banana 2 lite',
            'nano banana pro',
            'nano banana 2',
            'omni flash'
        ];

        function detectModelLabel(text) {
            const normalized = normalizeModelText(text);
            return KNOWN_MODEL_LABELS.find((label) => normalized.includes(label)) || null;
        }

        function textShowsModel(text, targetLabel) {
            const detected = detectModelLabel(text);
            // Unknown labels (future models) fall back to plain substring match.
            return detected ? detected === targetLabel : normalizeModelText(text).includes(targetLabel);
        }

        async function applyVideoPanelModelSelection(panel, modelValue) {
            if (!panel || !modelValue) return false;
            const targetLabel = getTargetModelLabel(modelValue);
            const panelText = normalizeModelText(textOf(panel));
            if (panelText.includes(targetLabel)) {
                const activeMatch = Array.from(panel.querySelectorAll('button, [role="button"], [role="combobox"]'))
                    .filter(isVisibleElement)
                    .find((el) => textShowsModel(textOf(el), targetLabel) && isOptionActive(el));
                if (activeMatch) return true;
                const triggerMatch = Array.from(panel.querySelectorAll('[role="combobox"], select'))
                    .filter(isVisibleElement)
                    .find((el) => textShowsModel(textOf(el), targetLabel));
                if (triggerMatch) return true;
            }


            let triggers = Array.from(panel.querySelectorAll('button[aria-haspopup="menu"]'))
                .filter(isVisibleElement);

            if (!triggers.length) {
                triggers = Array.from(panel.querySelectorAll('button, [role="button"], [role="combobox"]'))
                    .filter(isVisibleElement)
                    .filter((el) => {
                        const txt = normalizeModelText(textOf(el));
                        if (txt.includes(targetLabel)) return true;
                        return txt.includes('veo')
                            || txt.includes('omni flash')
                            || txt.includes('nano banana')
                            || txt.includes('imagen')
                            || el.getAttribute('aria-haspopup') === 'menu'
                            || el.getAttribute('aria-haspopup') === 'listbox'
                            || el.getAttribute('role') === 'combobox';
                    });
            }

            const scanForTargetOption = () => {
                // Scan the ENTIRE document (not just a specific "submenu" root) —
                // Radix appears to swap the open menu's content in place rather than
                // stacking a second, distinctly-identifiable node, so trying to single
                // out "the new menu" by excluding the previously-found panel is
                // unreliable. Searching the whole document for the option text is
                // simpler and correct as long as only one menu is open at a time.
                const options = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [data-radix-collection-item], button, [role="button"]'))
                    .filter(isVisibleElement);
                return options
                    .map((el) => ({ el, txt: normalizeModelText(textOf(el)) }))
                    .filter(({ el }) => textShowsModel(textOf(el), targetLabel))
                    .sort((a, b) => a.txt.length - b.txt.length)[0]?.el || null;
            };

            for (const trigger of triggers.slice(0, 6)) {
                const currentTxt = textOf(trigger);
                if (textShowsModel(currentTxt, targetLabel)) return true;

                // Try clicking the trigger itself, then progressively wider ancestors —
                // Radix sometimes attaches the actual interactive handler to a wrapping
                // element (e.g. the outer [role="menuitem"]) rather than the inner
                // decorative <button>, so a click confined to the innermost node can be
                // a no-op even though it looks like a normal button.
                const clickCandidates = [trigger];
                let anc = trigger.closest('[role="menuitem"]');
                if (anc && anc !== trigger) clickCandidates.push(anc);
                anc = trigger.parentElement;
                if (anc && !clickCandidates.includes(anc)) clickCandidates.push(anc);

                let target = null;
                for (const clickEl of clickCandidates) {
                    // This dropdown trigger only reacts to a genuine pointerdown/
                    // pointerup/click sequence — a bare React onClick prop call (what
                    // tryClickElementViaBridge does) or plain el.click() does NOT open
                    // it, but the bridge still reports success either way, which was
                    // masking the real click from ever running. Always fire the full
                    // native sequence here instead of trusting the bridge's result.
                    fireMouseClick(clickEl);
                    fireClickSequence(clickEl);
                    await new Promise(r => setTimeout(r, 550));
                    target = scanForTargetOption();
                    if (target) break;
                }

                if (target) {
                    fireMouseClick(target);
                    fireClickSequence(target);
                    await new Promise(r => setTimeout(r, 750));
                    const refreshedPanel = findVideoSettingsPanel() || panel;
                    if (normalizeModelText(textOf(refreshedPanel)).includes(targetLabel)) return true;
                    // Even if the summary text check above didn't match (e.g. panel
                    // closed after selection), verify by checking the trigger's own
                    // updated label directly.
                    if (textShowsModel(textOf(trigger), targetLabel)) return true;
                }
            }
            return false;
        }

        async function applyVideoDurationSelection(panel, durationSeconds) {
            const duration = Number(durationSeconds);
            if (![4, 6, 8, 10].includes(duration)) return true;
            const matcher = (txt) => {
                const normalized = normalizeText(txt).replace(/\s+/g, '');
                return normalized === `${duration}s`
                    || normalized === `${duration}sec`
                    || normalized === `${duration}seconds`
                    || normalized === `${duration}초`
                    || normalized === `${duration}秒`
                    || normalized.includes(`${duration}s`)
                    || normalized.includes(`${duration}sec`)
                    || normalized.includes(`${duration}초`)
                    || normalized.includes(`${duration}秒`);
            };
            let currentPanel = panel || findVideoSettingsPanel();
            if (currentPanel && await clickVideoPanelOption(currentPanel, matcher)) return true;

            const triggers = Array.from((currentPanel || document).querySelectorAll('button, [role="button"], [role="combobox"]'))
                .filter(isVisibleElement)
                .filter((el) => {
                    const txt = normalizeText(textOf(el));
                    return txt.includes('duration')
                        || txt.includes('seconds')
                        || txt.includes('sec')
                        || txt.includes('초')
                        || txt.includes('秒')
                        || txt.includes('길이')
                        || txt.includes('시간')
                        || txt.includes('再生時間')
                        || txt.includes('时长')
                        || /\b(4|6|8|10)\s*(s|초|秒)\b/i.test(txt)
                        || el.getAttribute('aria-haspopup') === 'menu'
                        || el.getAttribute('aria-haspopup') === 'listbox'
                        || el.getAttribute('role') === 'combobox';
                });
            for (const trigger of triggers.slice(0, 6)) {
                const bridgeOk = await tryClickElementViaBridge(trigger);
                if (!bridgeOk) {
                    fireMouseClick(trigger);
                    fireClickSequence(trigger);
                }
                await new Promise(r => setTimeout(r, 450));
                currentPanel = findVideoSettingsPanel() || currentPanel;
                const roots = [document, currentPanel].filter(Boolean);
                const options = roots.flatMap((root) =>
                    Array.from(root.querySelectorAll('[role="menuitem"], [role="option"], button, [role="button"]'))
                        .filter(isVisibleElement)
                );
                const target = options.find((el) => matcher(textOf(el)));
                if (target) {
                    const bridgeOk = await tryClickElementViaBridge(target);
                    if (!bridgeOk) {
                        fireMouseClick(target);
                        fireClickSequence(target);
                    }
                    await new Promise(r => setTimeout(r, 500));
                    return true;
                }
            }
            console.warn(`[VideoDuration] Duration option not found: ${duration}s`);
            return false;
        }

        async function applyVideoRatioSelection(panel, ratio) {
            const wanted = normalizeText(ratio) === '16:9' ? '16:9' : '9:16';
            // Tab text includes the crop icon ligature ("crop_16_9 16:9"), so
            // match by token instead of whole-string equality.
            const matcher = (txt) => normalizeText(txt).split(/\s+/).includes(wanted);
            let currentPanel = panel || findVideoSettingsPanel();
            return !!(currentPanel && await clickVideoPanelOption(currentPanel, matcher));
        }

        async function applyVideoCreationMode(modeValue, modelValue = '', durationSeconds = null, aspectRatio = '') {
            const wanted = normalizeText(modeValue).includes('frame') ? 'frames' : 'ingredients';
            const panel = await ensureVideoSettingsPanelOpen();
            if (!panel) {
                throw new Error('Video settings panel did not open. Open the Video panel in Flow, then retry.');
            }

            let videoSelected = await clickVideoPanelOption(panel, '[aria-controls*="-VIDEO"], [aria-controls*="content-VIDEO"]');
            if (!videoSelected) {
                videoSelected = await clickVideoPanelOption(panel, (txt) => {
                    const normalized = normalizeText(txt);
                    return normalized === 'video' || normalized.includes('video') || normalized.includes('동영상') || normalized.includes('비디오') || normalized.includes('视频') || normalized.includes('動画');
                });
            }

            if (!videoSelected && isOutputTypeChipActive('video')) {
                videoSelected = true;
            }
            if (!videoSelected) {
                const videoButton = findOutputTypeButton('video');
                if (videoButton && videoButton !== findVideoSettingsTrigger()) {
                    const bridgeOk = await tryClickElementViaBridge(videoButton);
                    if (!bridgeOk) {
                        fireMouseClick(videoButton);
                        fireClickSequence(videoButton);
                    }
                    await new Promise(r => setTimeout(r, 700));
                    const panelText = normalizeText(textOf(await waitForVideoSettingsPanel(1200) || findVideoSettingsPanel() || panel));
                    videoSelected = isOutputTypeChipActive('video')
                        || panelText.includes('video') || panelText.includes('동영상') || panelText.includes('비디오') || panelText.includes('视频') || panelText.includes('動画');
                }
            }
            const panelAfterVideoAttempt = await waitForVideoSettingsPanel(1200) || findVideoSettingsPanel() || panel;
            const panelTextAttempt = normalizeText(textOf(panelAfterVideoAttempt));
            const hasFramesWord = panelTextAttempt.includes('frames') || panelTextAttempt.includes('프레임') || panelTextAttempt.includes('秒') || panelTextAttempt.includes('動画');
            const hasIngredientsWord = panelTextAttempt.includes('ingredients') || panelTextAttempt.includes('재료') || panelTextAttempt.includes('ingredient');
            if (!videoSelected && hasFramesWord && hasIngredientsWord) {
                videoSelected = true;
            }
            if (!videoSelected) {
                throw new Error('Video tab was not found inside the video settings panel.');
            }

            const refreshedPanel = await ensureVideoSettingsPanelOpen() || panelAfterVideoAttempt;
            let modeSelected = await clickVideoPanelOption(refreshedPanel, wanted === 'frames' ? '[aria-controls*="-VIDEO_FRAMES"]' : '[aria-controls*="-VIDEO_REFERENCES"]');
            if (!modeSelected) {
                modeSelected = await clickVideoPanelOption(refreshedPanel, (txt) => {
                    if (wanted === 'frames') return txt.includes('frames') || txt === 'frame' || txt.includes('프레임');
                    return txt.includes('ingredients') || txt === 'ingredient' || txt.includes('재료') || txt.includes('인그리디언트');
                });
            }
            if (!modeSelected) {
                throw new Error(`${wanted === 'frames' ? 'Frames' : 'Ingredients'} option was not found inside the video settings panel.`);
            }

            if (modelValue) {
                const modelPanel = await ensureVideoSettingsPanelOpen() || refreshedPanel;
                const modelSelected = await applyVideoPanelModelSelection(modelPanel, modelValue);
                if (!modelSelected) {
                    // Model selection failed, but don't block the run — just log a warning
                    // and proceed with whatever model is currently active. This can happen if
                    // Flow's model dropdown structure changes or the option isn't available
                    // for this project/account tier.
                    console.warn(`[VideoSettings] Model "${modelValue}" not selectable; using current. This is non-fatal.`);
                }
            }
            if (durationSeconds) {
                const durationPanel = await ensureVideoSettingsPanelOpen() || findVideoSettingsPanel() || refreshedPanel;
                await applyVideoDurationSelection(durationPanel, durationSeconds);
            }

            if (aspectRatio) {
                const ratioPanel = await ensureVideoSettingsPanelOpen() || findVideoSettingsPanel() || refreshedPanel;
                await applyVideoRatioSelection(ratioPanel, aspectRatio);
            }

            // Video always generates a single output per prompt (batching x2-x4
            // isn't a supported/desired workflow here) — force the quantity tab
            // back to 1x regardless of whatever it was last left at.
            const qtyPanel = await ensureVideoSettingsPanelOpen() || findVideoSettingsPanel() || refreshedPanel;
            if (qtyPanel) {
                await clickVideoPanelOption(qtyPanel, (txt) => normalizeText(txt).trim() === '1x');
            }

            // Leave the dropdown closed so the media picker steps that follow
            // can interact with the composer "+" button.
            await closeVideoSettingsPanelIfOpen();

            return true;
        }

        // Applies Model / Ratio / Quantity for an IMAGE run. Uses the same
        // summary-chip + settings-dropdown helpers as the video path, since
        // Flow's image and video output-type panels share the same structure
        // (a button[aria-haspopup="menu"] chip that opens a role="menu" panel
        // with tab-based ratio/quantity controls and a model dropdown).
        // Tab labels in the settings dropdown include the icon-font ligature text
        // (e.g. "crop_16_9 16:9", "image Image"), so exact-equality on the full
        // text never matches. Compare against whitespace tokens instead.
        function panelOptionTokenMatcher(wanted) {
            const target = normalizeText(wanted).trim();
            return (txt) => normalizeText(txt).split(/\s+/).includes(target);
        }

        async function applyImageCreationSettings(modelValue = '', ratio = '', quantity = null) {
            console.log(`[FlowAutomator] applyImageCreationSettings: model="${modelValue}" ratio="${ratio}" quantity=${quantity}`);
            let panel = await ensureVideoSettingsPanelOpen();
            console.log(`[FlowAutomator] settings panel opened:`, !!panel, panel ? textOf(panel).substring(0, 150) : 'NONE');
            if (!panel) {
                throw new Error('Image settings panel did not open.');
            }

            // Make sure the IMAGE output type is selected first — if Flow was left
            // in Video mode, the panel is showing video controls and every lookup
            // below (ratio tabs, model dropdown) would hit the wrong widgets.
            let imageSelected = await clickVideoPanelOption(panel, '[aria-controls*="-IMAGE"]');
            if (!imageSelected) {
                imageSelected = await clickVideoPanelOption(panel, (txt) => {
                    const norm = normalizeText(txt);
                    return norm !== 'video' && !norm.includes('video') && /\bimage\b/.test(norm);
                });
            }
            console.log(`[FlowAutomator] Image output tab selected:`, imageSelected);
            if (imageSelected) {
                // Switching output type can rebuild the panel — re-resolve it.
                await new Promise(r => setTimeout(r, 400));
                panel = await waitForVideoSettingsPanel(3200) || findVideoSettingsPanel() || panel;
            }

            if (ratio) {
                const ratioApplied = await clickVideoPanelOption(panel, panelOptionTokenMatcher(ratio));
                console.log(`[FlowAutomator] Ratio "${ratio}" option found/clicked:`, ratioApplied);
            }

            if (quantity) {
                const qtyPanel = await ensureVideoSettingsPanelOpen() || findVideoSettingsPanel() || panel;
                // Flow quantity tabs read "1x", "x2", "x3", "x4" — match either form.
                const qty = Number(quantity);
                const qtyApplied = await clickVideoPanelOption(qtyPanel, (txt) => {
                    const tokens = normalizeText(txt).split(/\s+/);
                    return tokens.includes(`${qty}x`) || tokens.includes(`x${qty}`);
                });
                console.log(`[FlowAutomator] Quantity "${qty}x" option found/clicked:`, qtyApplied);
            }

            if (modelValue) {
                const modelPanel = await ensureVideoSettingsPanelOpen() || findVideoSettingsPanel() || panel;
                const modelSelected = await applyVideoPanelModelSelection(modelPanel, modelValue);
                console.log(`[FlowAutomator] Model "${modelValue}" option found/clicked:`, modelSelected);
                if (!modelSelected) {
                    throw new Error(`Image model option was not found: ${modelValue}`);
                }
            }

            // Leave the dropdown closed so the reference-picker steps that
            // follow can interact with the composer "+" button.
            await closeVideoSettingsPanelIfOpen();

            return true;
        }

        async function applyModelSelection(modelValue, selectors) {
            if (!modelValue) return false;
            const targetLabel = getTargetModelLabel(modelValue);
            const pool = [];
            const addTriggers = (selector) => {
                if (!selector) return;
                Array.from(document.querySelectorAll(selector))
                    .filter(el => el && el.offsetParent !== null)
                    .forEach(el => pool.push(el));
            };

            addTriggers(selectors.MODEL_SELECT_TRIGGER);
            addTriggers('button[role="combobox"]');
            addTriggers('button[aria-haspopup="listbox"]');
            addTriggers('button[aria-haspopup="menu"]');
            addTriggers('[aria-label*="Model"]');
            addTriggers('[aria-label*="model"]');

            if (pool.length === 0) {
                addTriggers('button, [role="button"]');
            }

            const triggerPool = pool.filter((el, idx, arr) => arr.indexOf(el) === idx).filter(b => {
                const txt = textOf(b);
                const hasPopupRole = b.getAttribute('aria-haspopup') === 'menu' || b.getAttribute('aria-haspopup') === 'listbox' || b.getAttribute('role') === 'combobox';
                const looksModel = txt.includes('model') || txt.includes('nano') || txt.includes('imagen');
                const insideOpenMenu = !!b.closest('[role="menu"][data-state="open"]');
                return (hasPopupRole || looksModel) && !insideOpenMenu;
            });

            for (const modelTrigger of triggerPool.slice(0, 8)) {
                const currentTxt = normalizeModelText(textOf(modelTrigger));
                if (currentTxt.includes(targetLabel)) return true;

                fireClick(modelTrigger);
                await new Promise(r => setTimeout(r, 600));

                const options = Array.from(document.querySelectorAll(
                    `${selectors.MODEL_ITEM || '[role="menuitem"], [role="option"], [data-radix-collection-item]'}, [role="menu"][data-state="open"] [role="menuitem"], [role="menu"][data-state="open"] button`
                )).filter(el => el.offsetParent !== null);

                const scored = options.map(opt => {
                    const txt = normalizeModelText(textOf(opt));
                    let score = 0;
                    if (txt === targetLabel) score = 100;
                    else if (txt.startsWith(targetLabel)) score = 90;
                    else if (txt.includes(targetLabel)) score = 80;
                    return { opt, score };
                }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

                const targetOption = scored[0]?.opt;

                if (targetOption) {
                    fireClick(targetOption);
                    await new Promise(r => setTimeout(r, 800));

                    const verifyText = normalizeModelText(textOf(modelTrigger));
                    if (verifyText.includes(targetLabel)) return true;
                }
            }
            return false;
        }

        function findPromptForImage(img) {
            // Strategy 1: Walk up from image to find .hxRvgy in same container
            let el = img;
            for (let depth = 0; depth < 10 && el; depth++) {
                const promptEl = el.querySelector('[data-allow-text-selection="true"], .hxRvgy');
                if (promptEl) {
                    return (promptEl.innerText || promptEl.textContent || '').trim();
                }
                el = el.parentElement;
            }
            // Strategy 2: Find by data-item-index — image and prompt share same index
            const itemContainer = img.closest('[data-item-index]');
            const itemIndex = itemContainer?.getAttribute('data-item-index');
            if (itemIndex !== null) {
                const allItems = Array.from(document.querySelectorAll('[data-item-index]'));
                const sameIndex = allItems.filter(el => el.getAttribute('data-item-index') === itemIndex);
                for (const item of sameIndex) {
                    const promptEl = item.querySelector('.hxRvgy, [data-allow-text-selection="true"]');
                    if (promptEl) return (promptEl.innerText || promptEl.textContent || '').trim();
                }
            }
            // Strategy 3: Find nearest .hxRvgy anywhere on page near this image
            const allPrompts = Array.from(document.querySelectorAll('.hxRvgy'));
            if (allPrompts.length > 0) {
                const imgRect = img.getBoundingClientRect();
                const nearest = allPrompts.reduce((best, p) => {
                    const r = p.getBoundingClientRect();
                    const dist = Math.abs(r.top - imgRect.top) + Math.abs(r.left - imgRect.left);
                    return (!best || dist < best.dist) ? { el: p, dist } : best;
                }, null);
                if (nearest) return (nearest.el.innerText || nearest.el.textContent || '').trim();
            }
            return '';
        }

        function getMediaSourceUrl(el) {
            if (!el) return null;
            if (el.tagName === 'IMG') return el.currentSrc || el.src || null;
            if (el.tagName === 'VIDEO') {
                return el.currentSrc || el.src || el.querySelector?.('source')?.src || el.getAttribute?.('src') || null;
            }
            if (el.tagName === 'SOURCE') {
                return el.currentSrc || el.src || el.getAttribute?.('src') || null;
            }
            return el.getAttribute?.('src') || el.getAttribute?.('href') || null;
        }

        function getStableMediaKey(url) {
            if (!url) return null;
            try {
                const parsed = new URL(url, window.location.href);
                const direct = parsed.searchParams.get('name');
                if (direct) return decodeURIComponent(direct);
                const input = parsed.searchParams.get('input');
                if (input) {
                    const match = decodeURIComponent(input).match(/"(?:name|mediaKey|mediaName|mediaId)"\s*:\s*"([^"]+)"/);
                    if (match) return match[1];
                }
            } catch { /* malformed URL — fall through to string parsing */ }
            const nameSplit = String(url).split(/[?&]name=/)[1];
            if (nameSplit) return decodeURIComponent(nameSplit.split('&')[0]);
            return null;
        }

        function getDownloadImageId(img) {
            const mediaUrl = getMediaSourceUrl(img) || '';
            const stableKey = getStableMediaKey(mediaUrl);
            if (stableKey) return stableKey;
            const itemContainer = img?.closest?.('[data-tile-id], [data-item-index], [data-test-id="media-tile"]');
            return itemContainer?.getAttribute('data-tile-id') ||
                itemContainer?.getAttribute('data-item-index') ||
                mediaUrl ||
                null;
        }

        function resolveVideoUrlFromContainer(container) {
            if (!container) return null;
            const video = container.querySelector('video');
            const videoUrl = getMediaSourceUrl(video);
            if (videoUrl) return videoUrl;
            const source = container.querySelector('source');
            const sourceUrl = getMediaSourceUrl(source);
            if (sourceUrl) return sourceUrl;
            const link = container.querySelector('a[href*="media.getMediaUrlRedirect"], a[href$=".mp4"], a[href$=".webm"], a[href$=".mov"]');
            if (link?.href) return link.href;
            return null;
        }

        // A broad virtualized row can contain unrelated videos. Only classify
        // this image as a video poster when the video actually overlaps it.
        function resolveVideoUrlForMedia(img, container) {
            if (!img || !container) return null;
            const imgRect = img.getBoundingClientRect?.();
            if (!imgRect || imgRect.width === 0 || imgRect.height === 0) return null;
            const overlapsImage = (el) => {
                const rect = el?.getBoundingClientRect?.();
                if (!rect || rect.width === 0 || rect.height === 0) return false;
                const overlapW = Math.min(imgRect.right, rect.right) - Math.max(imgRect.left, rect.left);
                const overlapH = Math.min(imgRect.bottom, rect.bottom) - Math.max(imgRect.top, rect.top);
                if (overlapW <= 0 || overlapH <= 0) return false;
                return (overlapW * overlapH) >= (imgRect.width * imgRect.height * 0.5);
            };
            for (const video of Array.from(container.querySelectorAll('video'))) {
                if (!overlapsImage(video)) continue;
                const url = getMediaSourceUrl(video);
                if (url) return url;
            }
            for (const source of Array.from(container.querySelectorAll('source'))) {
                const host = source.closest('video') || source;
                if (!overlapsImage(host)) continue;
                const url = getMediaSourceUrl(source);
                if (url) return url;
            }
            return null;
        }

        function isVisibleElement(el) {
            if (!el) return false;
            const rect = el.getBoundingClientRect?.();
            if (!rect) return false;
            const style = window.getComputedStyle(el);
            return rect.width > 0 &&
                rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0';
        }

        function getTileContainerForMedia(img) {
            if (!img) return null;
            const strong = img.closest('[data-tile-id], [data-item-index], [data-test-id="media-tile"], article, li');
            if (strong) return strong;

            let best = null;
            let node = img.parentElement;
            for (let depth = 0; depth < 10 && node; depth++, node = node.parentElement) {
                const buttons = Array.from(node.querySelectorAll?.('button, [role="button"]') || []);
                const hasMenuButton = buttons.some((btn) => {
                    const txt = getNodeText(btn);
                    return txt.includes('more') || txt.includes('more_vert') || txt.includes('more_horiz') || txt.includes('⋮') || txt.includes('…');
                });
                const mediaCount = node.querySelectorAll?.('img, video')?.length || 0;
                if (hasMenuButton && mediaCount <= 4) {
                    best = node;
                    break;
                }
                if (!best && buttons.length && mediaCount <= 6) {
                    best = node;
                }
            }
            return best || img.parentElement;
        }

        function getNodeText(el) {
            return normalizeText((el?.innerText || el?.textContent || '') + ' ' + (el?.getAttribute?.('aria-label') || '') + ' ' + (el?.getAttribute?.('title') || ''));
        }

        function normalizeUpscaleDownloadQuality(value) {
            return String(value || '').toLowerCase() === '4k' ? '4k' : '2k';
        }

        function findUpscaleButton(scope, targetQuality = '2k') {
            if (!scope) return null;
            const quality = normalizeUpscaleDownloadQuality(targetQuality);
            const upscaleKeywords = ['upscale', 'upscaled', 'enhance', '업스케일', '고해상도', '高解像度', '放大', '拡大', quality];
            const downloadKeywords = ['download', '다운로드', 'ダウンロード', '下载'];
            const candidateSelector = 'button, [role="button"], [role="menuitem"], [data-radix-collection-item]';
            const roots = Array.isArray(scope) ? scope : [scope];
            const candidates = Array.from(new Set(roots.flatMap((root) => {
                const matches = [];
                if (root?.matches?.(candidateSelector)) matches.push(root);
                matches.push(...Array.from(root?.querySelectorAll?.(candidateSelector) || []));
                return matches;
            })))
                .filter(isVisibleElement)
                .filter((el) => {
                    const txt = getNodeText(el);
                    return !isDisabledButton(el) && !txt.includes('upgrade') && !txt.includes('original size');
                });

            const preferredQuality = candidates.find((el) => {
                const txt = getNodeText(el);
                const otherQuality = quality === '2k' ? '4k' : '2k';
                if (txt.includes(otherQuality)) return false;
                return txt.includes(quality) && (txt.includes('upscaled') || txt.includes('upscale') || txt.includes('download') || txt.includes('quality') || txt.includes('resolution'));
            });
            if (preferredQuality) return preferredQuality;

            if (quality === '4k') {
                return null;
            }

            const strong = candidates.find((el) => {
                const txt = getNodeText(el);
                if (txt.includes('4k')) return false;
                return upscaleKeywords.some((kw) => txt.includes(kw));
            });
            if (strong) return strong;

            const upscaleDownload = candidates.find((el) => {
                const txt = getNodeText(el);
                if (txt.includes('4k')) return false;
                const hasRes = txt.includes('2k') || txt.includes('1080p') || txt.includes('upscale');
                const hasDl = downloadKeywords.some((kw) => txt.includes(kw));
                return hasRes && hasDl;
            });
            if (upscaleDownload) return upscaleDownload;

            return null;
        }

        function findDownloadMenuItem(scope = document) {
            const candidates = Array.from(scope.querySelectorAll('button, [role="button"], [role="menuitem"], [data-radix-collection-item]'))
                .filter(isVisibleElement)
                .map((el) => ({ el, txt: getNodeText(el), rect: el.getBoundingClientRect?.() || { width: 0 } }))
                .filter(({ txt }) => {
                    if (!txt.includes('download') && !txt.includes('다운로드') && !txt.includes('ダウンロード') && !txt.includes('下载')) return false;
                    if (txt.includes('upscale') || txt.includes('upscaled') || txt.includes('2k') || txt.includes('4k')) return false;
                    return true;
                });
            const subTrigger = candidates.find(({ el }) => el.getAttribute?.('aria-haspopup') === 'menu');
            if (subTrigger) return subTrigger.el;
            return candidates.sort((a, b) => (b.rect.width || 0) - (a.rect.width || 0))[0]?.el || null;
        }

        function getVisibleMenuEntries() {
            return Array.from(document.querySelectorAll('[role="menuitem"], [role="menu"] button, [data-radix-collection-item]'))
                .filter(isVisibleElement);
        }

        // Flow currently uses a Radix-style Download submenu. It commonly
        // opens on pointer hover rather than a synthetic click, so try the
        // supported interaction paths and return only newly-opened entries.
        async function openSubmenuAndGetNewEntries(trigger) {
            const baseline = new Set(getVisibleMenuEntries());
            const newEntries = () => getVisibleMenuEntries().filter((el) => !baseline.has(el));
            const rect = trigger.getBoundingClientRect?.() || { left: 0, top: 0, width: 0, height: 0 };
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const pointerInit = (dx = 0, dy = 0, extra = {}) => ({
                bubbles: true,
                cancelable: true,
                composed: true,
                view: window,
                clientX: cx + dx,
                clientY: cy + dy,
                screenX: cx + dx,
                screenY: cy + dy,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
                buttons: 0,
                ...extra
            });
            const waitForNewEntries = (timeoutMs) => waitForCondition(() => {
                const entries = newEntries();
                return entries.length ? entries : null;
            }, timeoutMs, 150);

            trigger.dispatchEvent(new PointerEvent('pointerover', pointerInit()));
            trigger.dispatchEvent(new PointerEvent('pointerenter', pointerInit()));
            trigger.dispatchEvent(new MouseEvent('mouseover', pointerInit()));
            trigger.dispatchEvent(new MouseEvent('mouseenter', pointerInit()));
            for (let i = 0; i < 4; i += 1) {
                trigger.dispatchEvent(new PointerEvent('pointermove', pointerInit(i, i)));
                trigger.dispatchEvent(new MouseEvent('mousemove', pointerInit(i, i)));
                await new Promise((resolve) => setTimeout(resolve, 90));
            }
            let entries = await waitForNewEntries(1800);
            if (entries) return entries;

            try { trigger.focus(); } catch { }
            for (const key of ['ArrowRight', 'Enter']) {
                trigger.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));
                entries = await waitForNewEntries(1200);
                if (entries) return entries;
            }

            fireMouseClick(trigger);
            entries = await waitForNewEntries(1500);
            return entries || [];
        }

        function hasOpenDownloadMenu() {
            return !!findDownloadMenuItem(document);
        }

        function findUpscaleOverflowByCoordinates(img) {
            const rect = img?.getBoundingClientRect?.();
            if (!rect) return null;
            const points = [
                [rect.right - 18, rect.bottom - 18],
                [rect.right - 28, rect.bottom - 24],
                [rect.right - 42, rect.bottom - 24],
                [rect.right - 18, rect.top + 24]
            ];
            for (const [x, y] of points) {
                const target = document.elementFromPoint(x, y);
                const btn = target?.closest?.('button, [role="button"]') || null;
                if (btn && isVisibleElement(btn)) return btn;
            }
            return null;
        }

        async function waitForCondition(check, timeoutMs = 2500, intervalMs = 150) {
            const deadline = Date.now() + timeoutMs;
            for (;;) {
                let result = null;
                try { result = check(); } catch { }
                if (result) return result;
                if (Date.now() >= deadline) return null;
                await new Promise((resolve) => setTimeout(resolve, intervalMs));
            }
        }

        async function openOverflowMenuForImage(img, tile, updateStatus, currentIndex) {
            const isMenuOpen = () => hasOpenDownloadMenu() || !!findRenameMenuItem(document);
            for (let attempt = 0; attempt < 3; attempt += 1) {
                if (typeof updateStatus === 'function') {
                    updateStatus(`Opening menu for ${currentIndex}...${attempt ? ` (retry ${attempt})` : ''}`);
                }
                fireHoverSequence(tile);
                fireHoverSequence(img);
                await waitForCondition(() => findOverflowMenuButton(tile), 1800, 150);

                const candidates = [];
                const coord = findUpscaleOverflowByCoordinates(img);
                if (coord) candidates.push(coord);
                const found = findOverflowMenuButton(tile);
                if (found && !candidates.includes(found)) candidates.push(found);

                for (const btn of candidates) {
                    fireHoverSequence(btn);
                    await new Promise((resolve) => setTimeout(resolve, 120));
                    fireMouseClick(btn);
                    if (await waitForCondition(isMenuOpen, 2500, 150)) return true;
                }

                const imgRect = img?.getBoundingClientRect?.();
                if (imgRect) {
                    if (typeof updateStatus === 'function') {
                        updateStatus(`Opening menu by position for ${currentIndex}...`);
                    }
                    fireMouseClickAt(imgRect.right - 18, imgRect.bottom - 18);
                    if (await waitForCondition(isMenuOpen, 2000, 150)) return true;
                }

                document.body?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
                await new Promise((resolve) => setTimeout(resolve, 400));
            }

            return false;
        }

        function findOverflowMenuButton(scope) {
            if (!scope) return null;
            const candidates = Array.from(scope.querySelectorAll('button, [role="button"]')).filter(isVisibleElement);
            const explicit = candidates.find((el) => {
                const txt = getNodeText(el);
                return txt.includes('more') || txt.includes('menu') || txt.includes('option') || txt.includes('더보기') || txt.includes('メニュー');
            });
            if (explicit) return explicit;

            const iconLike = candidates.filter((el) => {
                const txt = getNodeText(el);
                return txt.includes('more_vert') || txt.includes('more_horiz') || txt.includes('⋮') || txt.includes('…') || txt.includes('ellipsis');
            });
            if (iconLike[0]) return iconLike[0];

            const scopeRect = scope.getBoundingClientRect?.() || { right: 0, bottom: 0 };
            const iconButtons = candidates
                .filter((btn) => {
                    const txt = getNodeText(btn);
                    if (txt.includes('download') || txt.includes('animate') || txt.includes('rename') || txt.includes('share')) return false;
                    if (txt.includes('favorite') || txt.includes('like') || txt.includes('heart')) return false;
                    const rect = btn.getBoundingClientRect?.();
                    if (!rect) return false;
                    return rect.width <= 56 && rect.height <= 56;
                })
                .map((btn) => {
                    const rect = btn.getBoundingClientRect();
                    const rightBias = Math.abs((scopeRect.right || rect.right) - rect.right);
                    const bottomBias = Math.abs((scopeRect.bottom || rect.bottom) - rect.bottom);
                    return { btn, score: rightBias + bottomBias };
                })
                .sort((a, b) => a.score - b.score);

            return iconButtons[0]?.btn || null;
        }

        function getVisibleToastNotices() {
            return Array.from(document.querySelectorAll(
                '[role="alert"], [role="status"], [aria-live], .toast, .snackbar, [data-sonner-toast], .sc-toast'
            )).filter(isVisibleElement);
        }

        const consumedUpscaleNotices = new WeakSet();

        function isUpscaleDownloadCompletionText(text = '') {
            const completionRegexes = [
                /upscal(?:e|ing)\s+complete/i,
                /upscaled/i,
                /업스케일.*완료/i,
                /업스케일.*성공/i,
                /업스케일.*다운로드/i,
                /アップスケール.*完了/i,
                /高解像度.*完了/i,
                /放大.*完成/i
            ];
            const downloadedRegexes = [
                /downloaded/i,
                /다운로드/i,
                /ダウンロード/i,
                /已下载/i
            ];
            const hasCompletion = completionRegexes.some((regex) => regex.test(text));
            const hasDownloaded = downloadedRegexes.some((regex) => regex.test(text));
            const hasUpscaleTerm = text.toLowerCase().includes('upscal') || text.includes('업스케일') || text.includes('アップスケール') || text.includes('高解像度') || text.includes('放大');
            return hasCompletion || (hasUpscaleTerm && hasDownloaded);
        }

        function findDismissButtonForNotice(notice) {
            const dismissWords = ['dismiss', 'close', 'got it', 'ok', '닫기', '확인', '閉じる', '关闭'];
            const buttonSelector = 'button, [role="button"], [aria-label]';
            const isDismissButton = (btn) => {
                const text = getNodeText(btn);
                return dismissWords.some((word) => text.includes(word));
            };

            const local = Array.from(notice?.querySelectorAll?.(buttonSelector) || [])
                .filter(isVisibleElement)
                .find(isDismissButton);
            if (local) return local;

            let parent = notice?.parentElement || null;
            for (let depth = 0; depth < 4 && parent; depth++, parent = parent.parentElement) {
                const nearby = Array.from(parent.querySelectorAll(buttonSelector))
                    .filter(isVisibleElement)
                    .find(isDismissButton);
                if (nearby) return nearby;
            }

            const noticeRect = notice?.getBoundingClientRect?.();
            return Array.from(document.querySelectorAll(buttonSelector))
                .filter(isVisibleElement)
                .filter(isDismissButton)
                .map((btn) => {
                    const rect = btn.getBoundingClientRect?.() || { left: 0, top: 0 };
                    const distance = noticeRect
                        ? Math.abs(rect.left - noticeRect.right) + Math.abs(rect.top - noticeRect.top)
                        : 0;
                    return { btn, distance };
                })
                .sort((a, b) => a.distance - b.distance)[0]?.btn || null;
        }

        async function dismissUpscaleNotice(notice) {
            for (let attempt = 0; attempt < 4; attempt++) {
                const dismissBtn = findDismissButtonForNotice(notice);
                if (!dismissBtn) {
                    await new Promise((r) => setTimeout(r, 200));
                    continue;
                }

                fireMouseClick(dismissBtn);
                await new Promise((r) => setTimeout(r, 350));

                if (!isVisibleElement(notice) || !isUpscaleDownloadCompletionText(getNodeText(notice))) {
                    return true;
                }
            }
            return false;
        }

        function isUpscaleErrorText(text = '') {
            const errorRegexes = [
                /something went wrong/i,
                /error/i,
                /failed/i,
                /try again/i,
                /실패/i,
                /오류/i,
                /다시 시도/i,
                /エラー/i,
                /失敗/i,
                /错误/i,
            ];
            return errorRegexes.some((regex) => regex.test(text));
        }

        async function dismissErrorPopup() {
            // Dismiss any visible error dialog/modal blocking the UI
            const dialogSelectors = [
                '[role="dialog"]',
                '[role="alertdialog"]',
                '.modal',
                '[data-testid*="dialog"]',
                '[data-testid*="modal"]',
            ];
            const closeSelectors = [
                'button[aria-label*="close" i]',
                'button[aria-label*="dismiss" i]',
                'button[aria-label*="닫기" i]',
                'button[aria-label*="확인" i]',
                '[role="button"][aria-label*="close" i]',
                '[role="button"][aria-label*="닫기" i]',
            ];
            const closeWords = ['close', 'dismiss', 'ok', 'got it', 'retry', 'cancel', '닫기', '확인', '다시 시도', '취소'];

            // Try close buttons inside dialogs first
            for (const sel of dialogSelectors) {
                const dialog = document.querySelector(sel);
                if (!dialog || !isVisibleElement(dialog)) continue;
                const text = getNodeText(dialog);
                if (!isUpscaleErrorText(text)) continue;

                // Look for a close/dismiss button
                const btn = closeSelectors.map(s => dialog.querySelector(s)).find(b => b && isVisibleElement(b))
                    || Array.from(dialog.querySelectorAll('button, [role="button"]')).find(b => isVisibleElement(b) && closeWords.some(w => getNodeText(b).toLowerCase().includes(w)));
                if (btn) {
                    fireMouseClick(btn);
                    await new Promise(r => setTimeout(r, 400));
                    return true;
                }
            }

            // Also handle toast-style error notices
            for (const sel of ['[role="alert"]', '[role="status"]', '[aria-live]', '.toast', '.snackbar']) {
                const els = Array.from(document.querySelectorAll(sel)).filter(isVisibleElement);
                for (const el of els) {
                    if (!isUpscaleErrorText(getNodeText(el))) continue;
                    const btn = Array.from(el.querySelectorAll('button, [role="button"]')).find(b => isVisibleElement(b) && closeWords.some(w => getNodeText(b).toLowerCase().includes(w)));
                    if (btn) { fireMouseClick(btn); await new Promise(r => setTimeout(r, 300)); return true; }
                    // Press Escape as fallback
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                    await new Promise(r => setTimeout(r, 300));
                    return true;
                }
            }
            return false;
        }

        async function waitForUpscaleCompleteAndDismiss({ timeoutMs = 180000, baselineNotices = new Set() } = {}) {
            const started = Date.now();

            while ((Date.now() - started) < timeoutMs && !isHistoryDownloadStopped) {
                const notices = getVisibleToastNotices();

                for (const notice of notices) {
                    const text = getNodeText(notice);
                    if (!text) continue;
                    if (baselineNotices.has(notice)) continue;
                    if (consumedUpscaleNotices.has(notice)) continue;

                    if (isUpscaleDownloadCompletionText(text)) {
                        consumedUpscaleNotices.add(notice);
                        await dismissUpscaleNotice(notice);
                        return true;
                    }

                    // Server error (e.g. 500) — dismiss popup and fail fast
                    if (isUpscaleErrorText(text)) {
                        consumedUpscaleNotices.add(notice);
                        console.warn('[FlowAutomator] Upscale error detected:', text);
                        await dismissErrorPopup();
                        return false;
                    }
                }

                // Also check for error dialogs that may not be toast-style
                const dismissed = await dismissErrorPopup();
                if (dismissed) {
                    console.warn('[FlowAutomator] Upscale error dialog dismissed, skipping.');
                    return false;
                }

                await new Promise((r) => setTimeout(r, 800));
            }
            return false;
        }

        async function tryUpscaleThenAutoDownload(img, { updateStatus = null, currentIndex = 0, upscaleQuality = '2k' } = {}) {
            const quality = normalizeUpscaleDownloadQuality(upscaleQuality);
            const qualityLabel = quality.toUpperCase();
            const tile = getTileContainerForMedia(img);
            if (!tile) return false;
            // Clear any leftover error popup from a previous upscale before starting
            await dismissErrorPopup();
            const baselineNotices = new Set(getVisibleToastNotices());
            fireHoverSequence(tile);
            fireHoverSequence(img);
            await new Promise((r) => setTimeout(r, 250));

            let upscaleBtn = findUpscaleButton(tile, quality);
            let submenuEntries = [];
            if (!upscaleBtn) {
                // Slow frames can leave the root menu half-rendered. Rebuild
                // the menu once before giving up on its quality submenu.
                for (let attempt = 0; attempt < 2 && !submenuEntries.length; attempt += 1) {
                    if (attempt > 0) {
                        document.body?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
                        await new Promise((resolve) => setTimeout(resolve, 500));
                    }
                    const menuOpened = await openOverflowMenuForImage(img, tile, updateStatus, currentIndex);
                    if (!menuOpened) continue;
                    const downloadItem = await waitForCondition(() => findDownloadMenuItem(document), 2000, 150);
                    if (!downloadItem) continue;
                    if (typeof updateStatus === 'function') {
                        updateStatus(`Opening quality submenu for ${currentIndex}...`);
                    }
                    submenuEntries = await openSubmenuAndGetNewEntries(downloadItem);
                }
                if (!submenuEntries.length) {
                    if (typeof updateStatus === 'function') {
                        updateStatus(`Quality submenu did not open for ${currentIndex}.`);
                    }
                    return false;
                }
                // Select only from the submenu opened for THIS image. A stale
                // 2K item left elsewhere in the document can belong to the
                // previous tile and would download that image again.
                upscaleBtn = findUpscaleButton(submenuEntries, quality);
            }

            if (!upscaleBtn) {
                // Some generated images do not offer an upscale option. Use
                // the best available original download instead of losing the
                // selected file entirely.
                const fallbackBtn = submenuEntries.find((el) => {
                    const text = getNodeText(el);
                    if (text.includes('2k') || text.includes('4k') || text.includes('upscale')) return false;
                    return /1080|\b1k\b|1k\s|original|기본|원본/i.test(text) || text.includes('download') || text.includes('다운로드');
                }) || submenuEntries[0] || null;
                if (fallbackBtn && !isDisabledButton(fallbackBtn)) {
                    if (typeof updateStatus === 'function') {
                        updateStatus(`${qualityLabel} not offered for ${currentIndex} — downloading original quality instead.`);
                    }
                    fireHoverSequence(fallbackBtn);
                    await new Promise((resolve) => setTimeout(resolve, 120));
                    fireMouseClick(fallbackBtn);
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    return true;
                }
                if (typeof updateStatus === 'function') {
                    updateStatus(`${qualityLabel} upscaled option not found for ${currentIndex}.`);
                }
                return false;
            }
            fireHoverSequence(upscaleBtn);
            await new Promise((r) => setTimeout(r, 120));
            fireMouseClick(upscaleBtn);
            if (typeof updateStatus === 'function') {
                updateStatus(`Upscaling ${currentIndex} to ${qualityLabel}... waiting for auto-download`);
            }
            return await waitForUpscaleCompleteAndDismiss({ timeoutMs: 180000, baselineNotices });
        }

        async function directDownloadItem(img, itemId, { preferUpscaledDownload = false, updateStatus = null, currentIndex = 0, upscaleQuality = '2k' } = {}) {
            const mediaUrl = getMediaSourceUrl(img);
            if (!img || !mediaUrl) return false;

            const rawPrompt = findPromptForImage(img);
            // Use first 10 chars of prompt as filename hint
            const promptText = rawPrompt || 'flow_gen';
            const projectName = (document.title || '').trim();
            let isVideo = img.tagName?.toLowerCase() === 'video';
            let finalUrl = mediaUrl;
            const altText = (img.getAttribute?.('alt') || '').toLowerCase();
            const container = img.closest('[data-tile-id], [data-item-index], [data-test-id="media-tile"], article, li') || img.parentElement;
            const videoUrl = !isVideo ? resolveVideoUrlForMedia(img, container) : null;
            if (isVideo || altText.includes('video') || videoUrl) {
                finalUrl = videoUrl || mediaUrl;
                isVideo = true;
            }

            if (preferUpscaledDownload && !isVideo) {
                const upscaledDone = await tryUpscaleThenAutoDownload(img, { updateStatus, currentIndex, upscaleQuality });
                if (upscaledDone) {
                    seenImages.add(itemId);
                    return true;
                }
                if (typeof updateStatus === 'function') {
                    updateStatus(`Upscale failed for ${currentIndex}; skipped (no normal fallback).`);
                }
                return false;
            }

            if (preferUpscaledDownload && isVideo && typeof updateStatus === 'function') {
                updateStatus(`Downloading video ${currentIndex} in original quality.`);
            }

            const downloadKey = getStableMediaKey(finalUrl) || finalUrl;
            if (sentDownloadKeys.has(downloadKey)) {
                seenImages.add(itemId);
                return true;
            }
            sentDownloadKeys.add(downloadKey);

            safeSendMessage({
                action: 'AUTO_COLLECT_DOWNLOAD',
                url: finalUrl,
                tileId: itemId,
                prompt: promptText,
                projectName,
                mediaType: isVideo ? 'video' : 'image'
            });

            seenImages.add(itemId);
            return true;
        }

        function findActiveDialog() {
            // Find elements that are modals, dialogs, or popovers, excluding the main page containers.
            // Intentionally omits [data-state="open"] — it matches every Radix dropdown/tooltip/tab,
            // not just rename dialogs, and causes false positives.
            const selectors = [
                '[role="dialog"]',
                '[role="alertdialog"]',
                '.rt-DialogContent',
                '.rt-AlertDialogContent',
                '.rt-PopoverContent',
                '.modal-content',
                '.modal',
                '.dialog'
            ];
            for (const selector of selectors) {
                const elements = Array.from(document.querySelectorAll(selector));
                for (const el of elements) {
                    if (el && isVisibleElement(el)) {
                        const tag = el.tagName?.toUpperCase();
                        if (tag !== 'BODY' && tag !== 'HTML' && el.id !== 'root' && el.id !== '__next') {
                            return el;
                        }
                    }
                }
            }
            return null;
        }

        function findRenameMenuItem(scope = document) {
            const renameWords = [
                'rename', '이름 바꾸기', '이름 변경', '名前を変更', '名前の変更',
                '重命名', 'umbenennen', 'renommer', 'rename item', 'rename asset'
            ];

            // Method 1: standard selector
            const candidates = Array.from(scope.querySelectorAll('button, [role="button"], [role="menuitem"], [data-radix-collection-item], [role="menuitemradio"], [role="menuitemcheckbox"]'))
                .filter(isVisibleElement);
            const standardMatch = candidates.find(el => {
                const txt = getNodeText(el).toLowerCase();
                return renameWords.some(word => txt.includes(word));
            });
            if (standardMatch) return standardMatch;

            // Method 2: Broad text search for visible elements
            const allElements = Array.from(scope.querySelectorAll('*')).filter(isVisibleElement);
            const textMatch = allElements.find(el => {
                if (el.children.length > 3) return false; // leaf or near-leaf only
                const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
                return renameWords.some(word => txt === word || txt.includes(word));
            });

            if (textMatch) {
                // Find closest clickable ancestor
                const clickable = textMatch.closest('button, [role="button"], [role="menuitem"], [data-radix-collection-item], [tabindex="0"], li, a, div[class*="MenuItem"]') || textMatch;
                return clickable;
            }

            return null;
        }

        function findRenameInputField(img) {
            // 1. Check inside any active modal/dialog/popover container first (most common for dialog-based rename)
            const dialog = findActiveDialog();
            if (dialog) {
                console.log('[FlowAutomator] Searching for rename input inside active dialog:', dialog);
                const candidates = Array.from(dialog.querySelectorAll('input, textarea, [contenteditable="true"]'))
                    .filter(el => isVisibleElement(el));
                if (candidates.length > 0) {
                    console.log('[FlowAutomator] Found input candidate inside active dialog:', candidates[0]);
                    return candidates[0];
                }
            }
            
            // 2. Check inside the image's tile container (handles inline renaming on the card)
            if (img && document.body.contains(img)) {
                const tile = getTileContainerForMedia(img);
                if (tile) {
                    const inlineInput = Array.from(tile.querySelectorAll('input, textarea, [contenteditable="true"]'))
                        .filter(el => isVisibleElement(el))[0];
                    if (inlineInput) {
                        console.log('[FlowAutomator] Found inline input candidate inside tile:', inlineInput);
                        return inlineInput;
                    }
                }
            }
            
            // 3. Check active element as a fallback (excluding body/html/root)
            const active = document.activeElement;
            if (active && active !== document.body && active !== document.documentElement && active.id !== 'root') {
                const tag = active.tagName?.toLowerCase();
                const isEditable = tag === 'input' || tag === 'textarea' || active.getAttribute?.('contenteditable') === 'true';
                if (isEditable) {
                    console.log('[FlowAutomator] Using active element as input candidate:', active);
                    return active;
                }
            }

            // 4. Document-wide fallback: look for any visible input/textarea (excluding search/prompt inputs)
            const allInputs = Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'))
                .filter(el => {
                    if (!isVisibleElement(el)) return false;
                    // Exclude prompt input
                    const isPromptInput = el.matches('[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], div[contenteditable="true"][aria-multiline="true"], div[contenteditable="plaintext-only"][aria-multiline="true"]') ||
                                          (el.placeholder || '').toLowerCase().includes('prompt') ||
                                          (el.placeholder || '').toLowerCase().includes('describe') ||
                                          el.closest('.prompt-input, .editor-container');
                    if (isPromptInput) return false;
                    // Exclude search inputs
                    const isSearchInput = el.type === 'search' || 
                                          (el.placeholder || '').toLowerCase().includes('search') ||
                                          (el.placeholder || '').toLowerCase().includes('검색') ||
                                          (el.id || '').toLowerCase().includes('search');
                    if (isSearchInput) return false;
                    return true;
                });
            if (allInputs.length > 0) {
                console.log('[FlowAutomator] Found input candidate via document-wide search:', allInputs[0]);
                return allInputs[0];
            }
            
            console.warn('[FlowAutomator] Could not find any rename input field.');
            return null;
        }

        function findRenameSubmitButton(img, precomputedDialog, precomputedIsInline) {
            const dialog = precomputedDialog !== undefined ? precomputedDialog : findActiveDialog();
            const input = (precomputedIsInline !== undefined) ? null : findRenameInputField(img);
            
            let searchScope = dialog;
            if (!searchScope && input) {
                searchScope = input.closest('[role="dialog"], dialog, [role="alertdialog"], .rt-DialogContent, .rt-PopoverContent, [data-tile-id], [data-item-index], [data-test-id="media-tile"], article, li, form, .rt-Popover') || input.parentElement;
            }
            if (!searchScope) {
                searchScope = document;
            }

            console.log('[FlowAutomator] Searching for rename submit button in scope:', searchScope);
            
            const buttons = Array.from(searchScope.querySelectorAll('button, [role="button"], [type="submit"], .rt-Button, a'))
                .filter(el => {
                    if (!isVisibleElement(el)) return false;
                    if (searchScope === document) {
                        if (el.closest('[data-tile-id], [data-item-index], [data-test-id="media-tile"]')) return false;
                    }
                    return true;
                });

            // Filter out cancel, close, dismiss, or clear buttons
            const actionButtons = buttons.filter(btn => {
                const txt = getNodeText(btn).toLowerCase();
                const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                const title = (btn.getAttribute('title') || '').toLowerCase();
                const className = (btn.className || '').toLowerCase();
                
                const isCloseOrCancel = 
                    txt === 'cancel' || txt === 'close' || txt === '취소' || txt === '닫기' || txt === 'x' ||
                    txt.includes('cancel') || txt.includes('close') || txt.includes('dismiss') ||
                    ariaLabel.includes('close') || ariaLabel.includes('dismiss') || ariaLabel.includes('cancel') ||
                    title.includes('close') || title.includes('dismiss') || title.includes('cancel') ||
                    className.includes('close') || className.includes('cancel') || className.includes('dismiss');
                
                return !isCloseOrCancel;
            });

            // 1. Text match among action buttons
            const textMatch = actionButtons.find(btn => {
                const txt = getNodeText(btn).toLowerCase();
                return txt.includes('save') ||
                       txt.includes('ok') ||
                       txt.includes('confirm') ||
                       txt.includes('확인') ||
                       txt.includes('저장') ||
                       txt.includes('변경') ||
                       txt.includes('결정') ||
                       txt.includes('완료') ||
                       txt.includes('rename') ||
                       txt.includes('✓') ||
                       txt.includes('done');
            });
            if (textMatch) {
                console.log('[FlowAutomator] Found submit button by text match:', textMatch);
                return textMatch;
            }

            // 2. Type/class match among action buttons
            const primaryBtn = actionButtons.find(btn => {
                const className = (btn.className || '').toLowerCase();
                const type = (btn.getAttribute('type') || '').toLowerCase();
                return type === 'submit' || 
                       className.includes('primary') || 
                       className.includes('accent') || 
                       className.includes('submit') || 
                       className.includes('solid') || 
                       className.includes('high-contrast');
            });
            if (primaryBtn) {
                console.log('[FlowAutomator] Found submit button by type/class:', primaryBtn);
                return primaryBtn;
            }

            // 3. Fallback: last non-close button in actionButtons
            if (actionButtons.length > 0) {
                console.log('[FlowAutomator] Using fallback last action button:', actionButtons[actionButtons.length - 1]);
                return actionButtons[actionButtons.length - 1];
            }

            // 4. Ultimate fallback: last button overall
            if (buttons.length > 0) {
                console.log('[FlowAutomator] Using ultimate fallback button:', buttons[buttons.length - 1]);
                return buttons[buttons.length - 1];
            }

            console.warn('[FlowAutomator] Could not find any rename submit button.');
            return null;
        }

        async function writeTextToElement(element, text) {
            if (!element) return false;
            try {
                console.log('[FlowAutomator] Writing text to element:', element, 'Text:', text);
                element.focus();
                element.dispatchEvent(new Event('focus', { bubbles: true }));
                try { element.click(); } catch (e) {}
                await new Promise(r => setTimeout(r, 100));
                
                const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
                
                if (isInput) {
                    // 1. Select all text using native methods
                    element.select();
                    try {
                        element.setSelectionRange(0, element.value.length);
                    } catch (e) {}
                    
                    // 2. Explicitly delete the selected text to clear the old name
                    try {
                        document.execCommand('delete', false, null);
                    } catch (e) {}
                    
                    // 3. Clear using React prototype value setter bypass to ensure empty state is registered
                    setNativeObjectValue(element, '');
                    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                    await new Promise(r => setTimeout(r, 50));
                    
                    // 4. Try to insert new text via execCommand (simulates typing and updates React state perfectly)
                    let success = false;
                    try {
                        success = document.execCommand('insertText', false, text);
                    } catch (execErr) {
                        console.warn('[FlowAutomator] execCommand insertText failed:', execErr);
                    }
                    
                    // 5. If execCommand failed or value is incorrect, force set via setter
                    if (!success || element.value !== text) {
                        console.log('[FlowAutomator] execCommand failed or value mismatch. Forcing value setter...');
                        setNativeObjectValue(element, text);
                        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                        element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
                    } else {
                        // Success path: dispatch final events to ensure form state is updated
                        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                        console.log('[FlowAutomator] Successfully wrote text via execCommand.');
                    }
                    
                    element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                    await new Promise(r => setTimeout(r, 50));
                    return element.value === text;
                } else {
                    // For contenteditable elements
                    try {
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        const sel = window.getSelection();
                        if (sel) {
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                    } catch (e) {}
                    
                    let success = false;
                    try {
                        success = document.execCommand('insertText', false, text);
                    } catch (e) {}
                    
                    if (!success) {
                        element.innerHTML = '';
                        element.appendChild(document.createTextNode(text));
                    }
                    
                    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                    element.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
                    await new Promise(r => setTimeout(r, 50));
                    const actual = (element.innerText || element.textContent || '').trim();
                    const wrote = actual === text || actual.includes(text);
                    if (!wrote) console.warn('[FlowAutomator] writeTextToElement: contenteditable mismatch. Expected:', text, 'Got:', actual);
                    else console.log('[FlowAutomator] Wrote text to contenteditable element.');
                    return wrote;
                }
            } catch (e) {
                console.warn('[FlowAutomator] writeTextToElement failed:', e);
                return false;
            }
        }

        async function tryRenameFlowAssetOnPage(img, newName, updateStatus) {
            try {
                const tile = getTileContainerForMedia(img);
                if (!tile) return false;
                
                if (typeof updateStatus === 'function') {
                    updateStatus(`Renaming generated media on page to "${newName}"...`);
                }
                
                // 1. Open overflow menu
                const menuOpened = await openOverflowMenuForImage(img, tile, updateStatus, 'Rename');
                if (!menuOpened) {
                    console.warn('[FlowAutomator] Failed to open overflow menu for renaming.');
                    return false;
                }
                
                // 2. Find "Rename" button with a retry loop (to allow menu items to render)
                let renameBtn = null;
                for (let attempt = 0; attempt < 8; attempt++) {
                    renameBtn = findRenameMenuItem(document);
                    if (renameBtn) break;
                    await new Promise(r => setTimeout(r, 150));
                }
                
                if (!renameBtn) {
                    console.warn('[FlowAutomator] "Rename" option not found in overflow menu after retries.');
                    return false;
                }
                
                fireHoverSequence(renameBtn);
                await new Promise(r => setTimeout(r, 180));
                fireMouseClick(renameBtn);
                
                // 3. Find input field with retry loop
                let input = null;
                for (let attempt = 0; attempt < 10; attempt++) {
                    input = findRenameInputField(img);
                    if (input) break;
                    await new Promise(r => setTimeout(r, 200));
                }
                
                if (!input) {
                    console.warn('[FlowAutomator] Rename input field not found after retries.');
                    // SAFETY CLEANUP: Close the dialog if we can't find the input field
                    try {
                        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                    } catch (e) {}
                    return false;
                }
                
                // 4. Fill name using our ultra-robust writeTextToElement helper
                const written = await writeTextToElement(input, newName);
                if (!written) {
                    console.warn('[FlowAutomator] Failed to write new name. Aborting rename to avoid corrupt state.');
                    try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch (e) {}
                    return false;
                }
                await new Promise(r => setTimeout(r, 250));
                
                // 5. Find submit button with retry loop (waiting for it to be enabled).
                // Compute dialog once, but don't hard-code isInline to allow flexible layout switching
                const submitDialog = findActiveDialog();
                let submitBtn = null;
                for (let attempt = 0; attempt < 10; attempt++) {
                    submitBtn = findRenameSubmitButton(img, submitDialog);
                    if (submitBtn && !isDisabledButton(submitBtn)) {
                        break;
                    }
                    await new Promise(r => setTimeout(r, 150));
                }
                
                if (submitBtn) {
                    const isDisabled = isDisabledButton(submitBtn);
                    console.log('[FlowAutomator] Clicking rename submit button:', submitBtn, 'Disabled:', isDisabled);
                    fireHoverSequence(submitBtn);
                    await new Promise(r => setTimeout(r, 120));
                    fireMouseClick(submitBtn);
                    await new Promise(r => setTimeout(r, 1000)); // wait for save
                } else {
                    console.warn('[FlowAutomator] Rename submit button not found or disabled.');
                }
                
                // --- SAFETY CLEANUP ---
                // Check if the dialog is still open. If it is, close it to avoid blocking the UI for future prompts.
                const openDialog = findActiveDialog();
                if (openDialog) {
                    console.warn('[FlowAutomator] Rename dialog is still open. Closing it to prevent blocking the UI.');
                    // Try pressing Escape key to dismiss dialog
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
                    await new Promise(r => setTimeout(r, 500));
                    
                    // If Escape failed to close, find and click Cancel/Close button
                    const stillOpen = findActiveDialog();
                    if (stillOpen) {
                        const closeBtns = Array.from(stillOpen.querySelectorAll('button')).filter(isVisibleElement);
                        const cancelBtn = closeBtns.find(btn => {
                            const txt = getNodeText(btn).toLowerCase();
                            return txt.includes('cancel') || txt.includes('close') || txt.includes('취소') || txt.includes('닫기');
                        });
                        if (cancelBtn) {
                            fireMouseClick(cancelBtn);
                            await new Promise(r => setTimeout(r, 500));
                        }
                    }
                }
                
                if (typeof updateStatus === 'function') {
                    updateStatus(`Renamed media on page to "${newName}".`);
                }
                return true;
            } catch (err) {
                console.error('[FlowAutomator] tryRenameFlowAssetOnPage failed:', err);
                
                // Emergency cleanup on exception to restore UI state
                try {
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                } catch (e) {}
                return false;
            }
        }

        function normalizePromptForMatch(text) {
            let normalized = (text || '').trim();
            normalized = normalized.replace(/^\[Model:\s*[^\]]+\]\s*/i, '');
            normalized = normalized.replace(/[\s.…]*(\.\.\.|…)$/, '');
            const blocks = normalized.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean);
            normalized = blocks.length ? blocks[blocks.length - 1] : normalized;
            return normalizeText(normalized);
        }

        function promptMatchesCompletedQueue(promptText, completedPromptSet) {
            if (!completedPromptSet || completedPromptSet.size === 0) return true;
            const candidate = normalizePromptForMatch(promptText);
            if (!candidate) return false;

            for (const target of completedPromptSet) {
                if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
                    return true;
                }
            }
            return false;
        }

        function promptMatchesTarget(promptText, targetPrompt) {
            const candidate = normalizePromptForMatch(promptText);
            const target = normalizePromptForMatch(targetPrompt);
            if (!candidate || !target) return false;
            if (candidate === target || candidate.includes(target) || target.includes(candidate)) return true;

            const sharedLength = Math.min(candidate.length, target.length, 60);
            if (sharedLength < 16) return false;
            const candidateHead = candidate.slice(0, sharedLength);
            const targetHead = target.slice(0, sharedLength);
            return candidate.includes(targetHead) || target.includes(candidateHead);
        }


        function estimateTotalImages() {
            const scroller = document.querySelector('[data-testid="virtuoso-item-list"]');
            const firstItem = document.querySelector('[data-item-index="0"]');

            if (scroller && firstItem) {
                const totalHeight = scroller.scrollHeight;
                const itemHeight = firstItem.offsetHeight || 300; // Fallback height
                return Math.floor(totalHeight / itemHeight) || 0;
            }
            // Fallback: look at data-item-index of last child
            const items = document.querySelectorAll('[data-item-index]');
            if (items.length > 0) {
                const last = items[items.length - 1];
                return parseInt(last.getAttribute('data-item-index')) + 1;
            }
            return 0;
        }

        function updateProgressBar(current, total) {
            let bar = document.getElementById('flow-progress-bar-container');
            if (!bar) {
                const container = document.createElement('div');
                container.id = 'flow-progress-bar-container';
                container.style = "position: fixed; bottom: 80px; right: 20px; width: 240px; background: #1e293b; border: 1px solid #10b981; border-radius: 12px; z-index: 10000; padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: #f8fafc; font-family: 'Outfit', sans-serif;";
                container.innerHTML = `
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; display: flex; justify-content: space-between;">
                        <span>Collecting Images...</span>
                        <span id="flow-progress-percent">0%</span>
                    </div>
                    <div style="width: 100%; background: #0f172a; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                        <div id="flow-progress-fill" style="width: 0%; background: linear-gradient(90deg, #10b981, #059669); height: 100%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
                        <span id="flow-progress-text">0 / 0 Collected</span>
                        <button id="flow-close-progress" style="background: none; border: none; color: #f43f5e; cursor: pointer; padding: 0;">Stop</button>
                    </div>
                `;
                document.body.appendChild(container);
                document.getElementById('flow-close-progress').onclick = () => {
                    isHistoryDownloadStopped = true;
                    container.remove();
                };
            }

            const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
            const fill = document.getElementById('flow-progress-fill');
            const txt = document.getElementById('flow-progress-text');
            const pctText = document.getElementById('flow-progress-percent');

            if (fill) fill.style.width = `${percentage}%`;
            if (txt) txt.innerText = `${current} / ${total} Collected`;
            if (pctText) pctText.innerText = `${Math.round(percentage)}%`;

            if (current >= total && total > 0) {
                setTimeout(() => {
                    const container = document.getElementById('flow-progress-bar-container');
                    if (container) container.remove();
                }, 3000);
            }
        }

        function snapshotMedia(selectors) {
            const result = new Set();
            selectors.forEach(selector => {
                const els = Array.from(document.querySelectorAll(selector));
                els.forEach(el => {
                    if (el.tagName === 'IMG') result.add(`img:${getMediaSourceUrl(el) || ''}`);
                    else if (el.tagName === 'VIDEO') result.add(`video:${getMediaSourceUrl(el) || ''}`);
                    else if (el.tagName === 'CANVAS') result.add(`canvas:${el.width}x${el.height}`);
                    else result.add(`${el.tagName.toLowerCase()}:${el.getAttribute('src') || el.getAttribute('href') || ''}`);
                });
            });
            return result;
        }

        function getMediaCandidates(selectors) {
            const result = [];
            selectors.forEach(selector => {
                const els = Array.from(document.querySelectorAll(selector));
                els.forEach(el => {
                    let key = '';
                    let url = null;
                    let mediaType = 'other';
                    const stableId = getStableMediaIdentity(el);

                    if (el.tagName === 'IMG') {
                        url = getMediaSourceUrl(el);
                        key = `img:${url || ''}`;
                        mediaType = 'image';
                    } else if (el.tagName === 'VIDEO') {
                        url = getMediaSourceUrl(el);
                        key = `video:${url || ''}`;
                        mediaType = 'video';
                    } else if (el.tagName === 'SOURCE') {
                        url = getMediaSourceUrl(el);
                        key = `video:${url || ''}`;
                        mediaType = 'video';
                    } else if (el.tagName === 'CANVAS') {
                        key = `canvas:${el.width}x${el.height}`;
                        mediaType = 'image';
                    } else {
                        url = el.getAttribute('src') || el.getAttribute('href') || null;
                        key = `${el.tagName.toLowerCase()}:${url || ''}`;
                    }

                    result.push({ el, key, url, mediaType, stableId });
                });
            });
            return result;
        }

        function getStableMediaIdentity(el) {
            if (!el) return null;
            const tile = el.closest?.('[data-tile-id], [data-item-index], [data-test-id="media-tile"], article, li, [role="listitem"]');
            if (!tile) return null;

            const attrPairs = [
                ['data-tile-id', tile.getAttribute?.('data-tile-id')],
                ['data-item-index', tile.getAttribute?.('data-item-index')],
                ['data-testid', tile.getAttribute?.('data-testid')],
                ['aria-label', tile.getAttribute?.('aria-label')]
            ];
            const found = attrPairs.find(([, value]) => value);
            if (found) return `${found[0]}:${found[1]}`;

            const rect = tile.getBoundingClientRect?.();
            if (!rect) return null;
            return `pos:${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`;
        }

        function findLatestVideoCandidate(serviceSelectors) {
            const selectors = [];
            if (serviceSelectors?.HISTORY_IMAGES) selectors.push(serviceSelectors.HISTORY_IMAGES);
            selectors.push('video', 'source');
            const candidates = getMediaCandidates(selectors)
                .filter(item => item.mediaType === 'video' && item.url);
            return [...candidates].reverse().find(item => item.url) || null;
        }

        function findCompletionMediaCandidate(serviceSelectors, completionResult = {}) {
            const selectors = serviceSelectors?.HISTORY_IMAGES
                ? [serviceSelectors.HISTORY_IMAGES]
                : (serviceSelectors?.COMPLETION_SIGNALS || ['img', 'video', 'canvas']);
            const candidates = getMediaCandidates(selectors);

            if (completionResult.candidateKey) {
                const byKey = candidates.find(item => item.key === completionResult.candidateKey);
                if (byKey) return byKey;
            }

            if (completionResult.url) {
                const byUrl = candidates.find(item => item.url === completionResult.url);
                if (byUrl) return byUrl;
            }

            return [...candidates].reverse().find(item => item.url) || null;
        }

        function hasGenerationSignal(selectors) {
            if (!selectors || !selectors.GENERATION_SIGNAL) return false;
            const sigs = Array.isArray(selectors.GENERATION_SIGNAL) ? selectors.GENERATION_SIGNAL : [selectors.GENERATION_SIGNAL];
            return sigs.some(selector => {
                const el = safeQuerySelector(selector);
                return !!(el && el.offsetParent !== null);
            });
        }

        function readPromptInputValue(input) {
            if (!input) return '';
            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                return (input.value || '').trim();
            }

            const ownEditable = input.isContentEditable ||
                input.getAttribute?.('role') === 'textbox' ||
                ['true', 'plaintext-only'].includes((input.getAttribute?.('contenteditable') || '').toLowerCase());
            if (ownEditable) {
                return (input.innerText || input.textContent || '').trim();
            }

            const target = resolveEditableInput(input);
            if (!target) return '';
            if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
                return (target.value || '').trim();
            }
            return (target.innerText || target.textContent || '').trim();
        }

        function findDeepestEditableDescendant(root) {
            if (!root?.querySelectorAll) return null;
            const candidates = Array.from(root.querySelectorAll(
                '[data-lexical-editor="true"], textarea, input, [contenteditable="true"], [contenteditable="plaintext-only"]'
            )).filter(node => !!node);
            if (candidates.length === 0) return null;
            candidates.sort((a, b) => {
                const aLexical = a.getAttribute?.('data-lexical-editor') === 'true' ? 1 : 0;
                const bLexical = b.getAttribute?.('data-lexical-editor') === 'true' ? 1 : 0;
                if (aLexical !== bLexical) return bLexical - aLexical;
                const aMultiline = a.getAttribute?.('aria-multiline') === 'true' ? 1 : 0;
                const bMultiline = b.getAttribute?.('aria-multiline') === 'true' ? 1 : 0;
                if (aMultiline !== bMultiline) return bMultiline - aMultiline;
                const aDepth = (a.closest?.('[data-lexical-editor="true"]') ? 1 : 0) + (a.querySelector?.('[data-lexical-editor="true"]') ? 1 : 0);
                const bDepth = (b.closest?.('[data-lexical-editor="true"]') ? 1 : 0) + (b.querySelector?.('[data-lexical-editor="true"]') ? 1 : 0);
                if (aDepth !== bDepth) return bDepth - aDepth;
                return b.querySelectorAll?.('*').length - a.querySelectorAll?.('*').length;
            });
            return candidates[0] || null;
        }

        function findNearbyBoundNativeInput(input) {
            if (!input) return null;
            const scopes = [];
            let scope = input;
            for (let depth = 0; depth < 5 && scope; depth++) {
                scopes.push(scope);
                scope = scope.parentElement;
            }

            const candidates = [];
            for (const s of scopes) {
                const natives = Array.from(s.querySelectorAll('textarea, input[type="text"], input:not([type])'));
                for (const el of natives) {
                    if (!el || candidates.includes(el)) continue;
                    const type = (el.getAttribute('type') || '').toLowerCase();
                    if (type === 'hidden') continue;
                    if (el.disabled || el.readOnly) continue;
                    candidates.push(el);
                }
            }

            if (candidates.length === 0) return null;
            const inputRect = input.getBoundingClientRect?.() || { top: 0, left: 0, right: 0, bottom: 0 };
            candidates.sort((a, b) => {
                const ar = a.getBoundingClientRect?.() || { top: 0, left: 0 };
                const br = b.getBoundingClientRect?.() || { top: 0, left: 0 };
                const ad = Math.abs(ar.top - inputRect.top) + Math.abs(ar.left - inputRect.left);
                const bd = Math.abs(br.top - inputRect.top) + Math.abs(br.left - inputRect.left);
                return ad - bd;
            });
            return candidates[0] || null;
        }

        function isGenericTextboxWrapper(el) {
            if (!el) return false;
            const role = (el.getAttribute?.('role') || '').toLowerCase();
            const ce = (el.getAttribute?.('contenteditable') || '').toLowerCase();
            const lexical = (el.getAttribute?.('data-lexical-editor') || '').toLowerCase();
            const placeholder = (el.getAttribute?.('placeholder') || '').toLowerCase();
            const testId = (el.getAttribute?.('data-testid') || '').toLowerCase();
            return role === 'textbox' &&
                (ce === 'true' || ce === 'plaintext-only') &&
                lexical !== 'true' &&
                !placeholder &&
                !testId;
        }

        function findNearbyPreferredEditable(input) {
            if (!input) return null;
            const scopes = [];
            let scope = input;
            for (let depth = 0; depth < 8 && scope; depth++) {
                scopes.push(scope);
                scope = scope.parentElement;
            }

            const candidates = [];
            for (const s of scopes) {
                const found = Array.from(s.querySelectorAll(
                    '[data-lexical-editor="true"], textarea, input:not([type="hidden"]), [contenteditable="plaintext-only"], [contenteditable="true"]'
                ));
                for (const el of found) {
                    if (!el || el === input || candidates.includes(el)) continue;
                    candidates.push(el);
                }
            }

            if (candidates.length === 0) return null;
            const inputRect = input.getBoundingClientRect?.() || { top: 0, left: 0, right: 0, bottom: 0 };
            const ranked = candidates.map((el) => {
                const rect = el.getBoundingClientRect?.() || { top: 0, left: 0, width: 0, height: 0 };
                const placeholder = (el.getAttribute?.('placeholder') || '').toLowerCase();
                const aria = (el.getAttribute?.('aria-label') || '').toLowerCase();
                const testId = (el.getAttribute?.('data-testid') || '').toLowerCase();
                const type = (el.getAttribute?.('type') || '').toLowerCase();
                const distance = Math.abs(rect.top - inputRect.top) + Math.abs(rect.left - inputRect.left);
                let score = 0;
                if (el.getAttribute?.('data-lexical-editor') === 'true') score += 160;
                if (el.tagName === 'TEXTAREA') score += 90;
                if (el.tagName === 'INPUT') score += 70;
                if (el.getAttribute?.('role') === 'textbox') score += 35;
                if (el.getAttribute?.('aria-multiline') === 'true') score += 25;
                if (placeholder.includes('prompt') || placeholder.includes('create') || placeholder.includes('describe')) score += 35;
                if (aria.includes('prompt') || aria.includes('create') || aria.includes('describe')) score += 30;
                if (testId.includes('prompt') || testId.includes('input')) score += 20;
                if (type === 'search') score -= 120;
                if (el.disabled || el.readOnly) score -= 100;
                score -= Math.min(distance / 16, 80);
                return { el, score };
            }).sort((a, b) => b.score - a.score);

            return ranked[0]?.score > 10 ? ranked[0].el : null;
        }

        function resolveEditableInput(input) {
            if (!input) return null;
            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') return input;

            const active = document.activeElement;
            if (active && input.contains?.(active) && (active.isContentEditable || active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
                return active;
            }

            const selectionAnchor = window.getSelection?.()?.anchorNode?.parentElement || null;
            if (selectionAnchor && input.contains?.(selectionAnchor)) {
                const selectionEditable = selectionAnchor.closest?.('[contenteditable="true"], [contenteditable="plaintext-only"], textarea, input');
                if (selectionEditable) return selectionEditable;
            }

            if (isGenericTextboxWrapper(input)) {
                const lexicalDesc = input.querySelector?.('[data-lexical-editor="true"]');
                if (lexicalDesc) return lexicalDesc;
                return input;
            }

            const nestedEditable = findDeepestEditableDescendant(input);
            if (nestedEditable) {
                const nestedIsNative = nestedEditable.tagName === 'TEXTAREA' || nestedEditable.tagName === 'INPUT';
                if (nestedIsNative && isGenericTextboxWrapper(input)) {
                    const placeholder = (nestedEditable.getAttribute?.('placeholder') || '').toLowerCase();
                    const aria = (nestedEditable.getAttribute?.('aria-label') || '').toLowerCase();
                    const testId = (nestedEditable.getAttribute?.('data-testid') || '').toLowerCase();
                    const looksPrompt = placeholder.includes('prompt') || placeholder.includes('create') || placeholder.includes('describe') ||
                        aria.includes('prompt') || aria.includes('create') || aria.includes('describe') ||
                        testId.includes('prompt') || testId.includes('input');
                    if (!looksPrompt) {
                        return input;
                    }
                }
                return nestedEditable;
            }

            if (input.isContentEditable) return input;

            const contentEditableValue = (input.getAttribute?.('contenteditable') || '').toLowerCase();
            if (contentEditableValue === 'true' || contentEditableValue === 'plaintext-only') {
                return input;
            }

            return input;
        }

        function isEditableCandidate(el) {
            if (!el) return false;
            const target = resolveEditableInput(el);
            if (!target || target.offsetParent === null) return false;
            if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return true;
            const ce = (target.getAttribute?.('contenteditable') || '').toLowerCase();
            return ce === 'true' || ce === 'plaintext-only' || target.getAttribute?.('data-lexical-editor') === 'true';
        }

        function isStrongComposerCandidate(el) {
            if (!el) return false;
            const role = (el.getAttribute?.('role') || '').toLowerCase();
            const multiline = (el.getAttribute?.('aria-multiline') || '').toLowerCase() === 'true';
            const lexical = (el.getAttribute?.('data-lexical-editor') || '').toLowerCase() === 'true';
            const ce = (el.getAttribute?.('contenteditable') || '').toLowerCase();
            const placeholder = (el.getAttribute?.('placeholder') || '').toLowerCase();
            const aria = (el.getAttribute?.('aria-label') || '').toLowerCase();
            const testId = (el.getAttribute?.('data-testid') || '').toLowerCase();

            if (lexical) return true;
            if (role === 'textbox' && multiline) return true;
            if ((ce === 'true' || ce === 'plaintext-only') && multiline) return true;

            if (el.tagName === 'TEXTAREA') {
                const promptLike = placeholder.includes('prompt') || placeholder.includes('create') || placeholder.includes('describe') ||
                    aria.includes('prompt') || aria.includes('create') || aria.includes('describe') ||
                    testId.includes('prompt');
                return promptLike;
            }
            return false;
        }

        function isLikelySubmitButton(btn) {
            if (!btn || isDownloadLikeButton(btn)) return false;
            const txt = textOf(btn);
            const aria = normalizeText(btn.getAttribute?.('aria-label') || '');
            const title = normalizeText(btn.getAttribute?.('title') || '');
            if (txt.includes('history') || txt.includes('download') || txt.includes('settings') || txt.includes('add to queue')) return false;
            if (btn.getAttribute('aria-haspopup') === 'menu' || btn.getAttribute('aria-haspopup') === 'dialog') return false;

            // --- Icon-first approach ---
            // Read icon text from ALL leaf child nodes (catches any class name for Google Symbols)
            const allLeafText = normalizeText(
                Array.from(btn.querySelectorAll('*'))
                    .filter(n => n.childElementCount === 0)
                    .map(n => (n.innerText || n.textContent || ''))
                    .join(' ')
            );
            const iconText = getButtonIconText(btn) || allLeafText;

            const hasActionIcon = iconText.includes('arrow_forward') ||
                iconText.includes('arrow_upward') ||
                iconText.includes('send');

            // Hard-reject: icon is any variant of "add" (add, add_2, add_circle, add_photo etc.)
            // These are ALWAYS media attachment / upload buttons — never the submit button
            if (/\badd\b|\badd_\d/.test(iconText) && !hasActionIcon) return false;

            // Hard-reject: first visible word of raw text is "add" (e.g. "Add Media", "Add Image")
            const rawFirst = (btn.innerText || btn.textContent || '').trim().toLowerCase().split(/\s/)[0];
            if (rawFirst === 'add' && !hasActionIcon) return false;

            // The real Flow Create/Generate button ALWAYS has arrow_forward icon
            if (hasActionIcon) return true;

            // Fallback for buttons
            if (btn.getAttribute('type') === 'submit') return true;
            if (aria.includes('generate') || aria.includes('submit') || aria.includes('send') || aria.includes('create') || aria.includes('run') || aria.includes('생성') || aria.includes('전송') || aria.includes('실행')) return true;
            if (title.includes('generate') || title.includes('submit') || title.includes('send') || title.includes('create') || title.includes('run') || title.includes('생성') || title.includes('전송') || title.includes('실행')) return true;
            
            const hasIcon = !!btn.querySelector('svg, i, span.material-icons, span.google-symbols');
            if (txt.includes('generate') || txt.includes('submit') || txt.includes('send') || txt.includes('run') || txt.includes('create') || txt.includes('생성') || txt.includes('전송') || txt.includes('실행')) {
                return true;
            }
            if (!hasIcon) {
                return false;
            }
            // Icon button without an action icon or matching text → not a submit button
            return false;
        }

        function describeButton(btn) {
            if (!btn) return 'unknown button';
            const label = (btn.innerText || btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim();
            const cls = (btn.className || '').toString().trim().replace(/\s+/g, '.');
            return label || (cls ? `.${cls}` : btn.tagName.toLowerCase());
        }

        function describeInput(input) {
            if (!input) return 'unknown input';
            const placeholder = input.getAttribute?.('placeholder') || '';
            const testId = input.getAttribute?.('data-testid') || '';
            const role = input.getAttribute?.('role') || '';
            const cls = (input.className || '').toString().trim().replace(/\s+/g, '.');
            return [input.tagName?.toLowerCase(), role, testId, placeholder, cls].filter(Boolean).join(' | ');
        }

        function describeEditableState(input) {
            if (!input) return 'editable:unknown';
            return [
                `tag=${(input.tagName || '').toLowerCase()}`,
                `role=${input.getAttribute?.('role') || ''}`,
                `multi=${input.getAttribute?.('aria-multiline') || ''}`,
                `ce=${input.getAttribute?.('contenteditable') || ''}`,
                `lexical=${input.getAttribute?.('data-lexical-editor') || ''}`,
                `slate=${input.getAttribute?.('data-slate-editor') || ''}`,
                `placeholder=${input.getAttribute?.('placeholder') || ''}`,
                `testid=${input.getAttribute?.('data-testid') || ''}`
            ].join(' ');
        }

        function describeActiveEditableState() {
            const active = document.activeElement;
            if (!active) return 'active=none';
            return `active ${describeEditableState(active)}`;
        }

        function isLexicalEditable(input) {
            if (!input) return false;
            return input.getAttribute?.('data-lexical-editor') === 'true' ||
                !!input.closest?.('[data-lexical-editor="true"]');
        }

        function normalizeComparableText(text = '') {
            return (text || '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .replace(/\u200b/g, '')
                .trim();
        }

        function normalizeLoosePromptText(text = '') {
            return (text || '')
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function isPromptBoundEnough(actualText = '', expectedText = '') {
            const cleanActual = String(actualText || '').replace(/@/g, '');
            const cleanExpected = String(expectedText || '').replace(/@/g, '');
            const actual = normalizeComparableText(cleanActual);
            const expected = normalizeComparableText(cleanExpected);
            if (!actual || !expected) return false;

            if (expected.length <= 12) {
                return actual.includes(expected) || expected.includes(actual);
            }

            const headLen = Math.min(24, expected.length);
            if (headLen >= 8 && (actual.includes(expected.slice(0, headLen)) || expected.includes(actual.slice(0, Math.min(24, actual.length))))) {
                return true;
            }

            const looseActual = normalizeLoosePromptText(actualText);
            const looseExpected = normalizeLoosePromptText(expectedText);
            if (!looseActual || !looseExpected) return false;

            const expectedWords = looseExpected.split(' ').filter(word => word.length > 1).slice(0, 8);
            if (expectedWords.length === 0) return looseActual.length >= Math.min(3, looseExpected.length);

            const matched = expectedWords.filter(word => looseActual.includes(word)).length;
            if (matched >= Math.min(3, expectedWords.length)) return true;

            // Flow editors sometimes normalize content differently; allow weak bind
            // when enough text was inserted.
            const minLen = Math.min(14, Math.max(3, Math.floor(looseExpected.length * 0.22)));
            return looseActual.length >= minLen;
        }

        function getPromptRequiredAlertText() {
            const patterns = [
                'prompt must be provided',
                'prompt is required',
                'enter a prompt',
                'please provide a prompt'
            ];
            const isVisible = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect?.();
                if (!rect) return false;
                const style = window.getComputedStyle(el);
                return rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0';
            };

            const alertNodes = Array.from(document.querySelectorAll(
                '[role="alert"], [aria-live="assertive"], .toast, .snackbar, [data-sonner-toast]'
            )).filter(isVisible);
            const alertText = alertNodes.map(n => (n.innerText || n.textContent || '')).join(' ').toLowerCase();
            return patterns.some(p => alertText.includes(p)) ? alertText : '';
        }

        function getRateLimitAlertText() {
            const patterns = [
                'requesting generation too quickly',
                'too quickly',
                'try again later',
                'too many requests',
                'rate limit'
            ];
            const isVisible = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect?.();
                if (!rect) return false;
                const style = window.getComputedStyle(el);
                return rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0';
            };

            const alertNodes = Array.from(document.querySelectorAll(
                '[role="alert"], [aria-live="assertive"], .toast, .snackbar, [data-sonner-toast]'
            )).filter(isVisible);
            const alertText = alertNodes.map(n => (n.innerText || n.textContent || '')).join(' ').toLowerCase();
            return patterns.some(p => alertText.includes(p)) ? alertText : '';
        }

        function getUnusualActivityFailures() {
            const isVisible = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect?.();
                if (!rect) return false;
                const style = window.getComputedStyle(el);
                return rect.width > 0 && rect.height > 0 &&
                    style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            };
            return Array.from(document.querySelectorAll('div, section, article, [role="alert"]'))
                .filter(isVisible)
                .filter((el) => {
                    const text = String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
                    if (!/we noticed some unusual activity/i.test(text) || text.length >= 700) return false;
                    // Keep only the innermost matching node so one failure card
                    // is counted once instead of once per nested wrapper.
                    return !Array.from(el.children || []).some((child) =>
                        /we noticed some unusual activity/i.test(String(child.innerText || child.textContent || ''))
                    );
                })
                .map((el) => ({
                    el,
                    text: String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
                }));
        }

        function hasPromptRequiredValidation() {
            return !!getPromptRequiredAlertText();
        }

        function hasNewPromptRequiredValidation(previousAlertText = '') {
            const current = getPromptRequiredAlertText();
            if (!current) return false;
            return current !== (previousAlertText || '');
        }

        function dismissVisiblePromptAlerts() {
            const isVisible = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect?.();
                if (!rect) return false;
                const style = window.getComputedStyle(el);
                return rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0';
            };

            const dismissButtons = Array.from(document.querySelectorAll(
                'button[aria-label*="dismiss" i], button[aria-label*="close" i], .sc-toast-dismiss'
            )).filter(isVisible);

            dismissButtons.forEach((btn) => {
                try {
                    fireClick(btn);
                } catch (e) { }
            });
        }

        function rankPromptInputCandidates(candidates) {
            const viewportHeight = window.innerHeight || 1000;
            const viewportWidth = window.innerWidth || 1400;
            return candidates
                .filter(el => el && el.offsetParent !== null && isEditableCandidate(el) && isStrongComposerCandidate(el))
                .map(el => {
                    const rect = el.getBoundingClientRect?.() || { top: 0, bottom: 0, width: 0, height: 0 };
                    const placeholder = (el.getAttribute?.('placeholder') || '').toLowerCase();
                    const role = (el.getAttribute?.('role') || '').toLowerCase();
                    const parentText = textOf(el.parentElement || el);
                    const selfText = textOf(el);
                    const classText = (el.className || '').toString().toLowerCase();
                    const bottomBias = Math.max(0, viewportHeight - rect.bottom);
                    const visibleSize = (rect.width || 0) * (rect.height || 0);
                    const looksSearch = placeholder.includes('search') ||
                        selfText.includes('search') ||
                        parentText.includes('search for assets') ||
                        placeholder.includes('검색') ||
                        selfText.includes('검색') ||
                        parentText.includes('검색') ||
                        parentText.includes('recently used');
                    const bottomComposerZone = rect.bottom > viewportHeight * 0.62;
                    const wideEnough = rect.width > Math.min(320, viewportWidth * 0.35);
                    const tinyInput = rect.width < 160 || rect.height < 20;
                    const insideMenu = !!el.closest('[role="menu"], [data-radix-dropdown-menu-content], [data-radix-menu-content], [role="dialog"]');
                    const isMultiline = el.getAttribute?.('aria-multiline') === 'true';
                    const isRoleTextbox = role.includes('textbox');
                    const genericWrapper = isGenericTextboxWrapper(el);
                    const isContentEditableDiv = el.tagName === 'DIV' &&
                        (el.getAttribute?.('contenteditable') === 'true' || el.getAttribute?.('contenteditable') === 'plaintext-only');
                    const isLexical = el.getAttribute?.('data-lexical-editor') === 'true';
                    // Plain textareas without prompt-like placeholder are likely hidden backing elements
                    // that Flow does not bind for submit. Penalize them so the real contenteditable wins.
                    const isUnmarkedTextarea = el.tagName === 'TEXTAREA' && !placeholder &&
                        !(el.getAttribute?.('aria-label') || '').toLowerCase().includes('prompt') &&
                        !(el.getAttribute?.('data-testid') || '').toLowerCase().includes('prompt');
                    const score = [
                        placeholder.includes('prompt') || placeholder.includes('describe') || placeholder.includes('create') ? 50 : 0,
                        isRoleTextbox ? 20 : 0,
                        isMultiline ? 120 : 0,
                        (isRoleTextbox && !isMultiline) ? -70 : 0,
                        (el.getAttribute?.('contenteditable') === 'true' || el.getAttribute?.('contenteditable') === 'plaintext-only') ? 15 : 0,
                        classText.includes('lexical') ? 12 : 0,
                        classText.includes('prompt') ? 10 : 0,
                        genericWrapper ? -25 : 0,
                        parentText.includes('flow can make mistakes') ? 40 : 0,
                        parentText.includes('nano banana') ? 15 : 0,
                        bottomComposerZone ? 40 : -30,
                        wideEnough ? 12 : -20,
                        tinyInput ? -35 : 0,
                        insideMenu ? -100 : 0,
                        rect.bottom > viewportHeight * 0.55 ? 25 : 0,
                        Math.min(visibleSize / 5000, 20),
                        -bottomBias / 100,
                        looksSearch ? -80 : 0,
                        // Prefer real contenteditable editors (Lexical/ProseMirror) over bare textareas
                        isLexical ? 60 : 0,
                        isContentEditableDiv && isMultiline ? 30 : 0,
                        // Penalize unmarked textareas — they are often hidden backing fields
                        isUnmarkedTextarea ? -60 : 0
                    ].reduce((sum, val) => sum + val, 0);
                    return { el, score };
                })
                .sort((a, b) => b.score - a.score)
                .map(entry => entry.el);
        }

        function isPromptLikeElement(el) {
            if (!el) return false;
            const role = (el.getAttribute?.('role') || '').toLowerCase();
            const placeholder = (el.getAttribute?.('placeholder') || '').toLowerCase();
            const ariaLabel = (el.getAttribute?.('aria-label') || '').toLowerCase();
            const contentEditable = (el.getAttribute?.('contenteditable') || '').toLowerCase();
            const text = textOf(el);
            const multiline = (el.getAttribute?.('aria-multiline') || '').toLowerCase() === 'true';
            const lexical = (el.getAttribute?.('data-lexical-editor') || '').toLowerCase() === 'true';
            const promptLike = lexical ||
                (role === 'textbox' && multiline) ||
                el.tagName === 'TEXTAREA' ||
                ((contentEditable === 'true' || contentEditable === 'plaintext-only') && multiline) ||
                placeholder.includes('prompt') ||
                placeholder.includes('describe') ||
                ariaLabel.includes('prompt');
            const searchLike = placeholder.includes('search') || ariaLabel.includes('search') || text.includes('search for assets')
                || placeholder.includes('검색') || ariaLabel.includes('검색') || text.includes('검색');
            return promptLike && !searchLike;
        }

        function getActivePromptCandidate() {
            const active = document.activeElement;
            if (!active) return null;
            if (isPromptLikeElement(active) && isStrongComposerCandidate(active) && active.offsetParent !== null) return active;
            const near = active.closest?.('[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], textarea, [contenteditable="true"][aria-multiline="true"], [contenteditable="plaintext-only"][aria-multiline="true"]');
            if (near && isPromptLikeElement(near) && isStrongComposerCandidate(near) && near.offsetParent !== null) return near;
            return null;
        }

        async function findWorkingPromptInput(serviceSelectors = {}) {
            const collected = [];
            const pushIfVisible = (el) => {
                if (el && el.offsetParent !== null && !collected.includes(el)) {
                    collected.push(el);
                }
            };

            // Prioritize contenteditable divs (real Lexical/ProseMirror editors) BEFORE
            // falling back to textarea, to avoid binding text into a hidden textarea
            // that Flow does not read from for submit validation.
            pushIfVisible(document.querySelector('div[contenteditable="true"][data-lexical-editor="true"]'));
            pushIfVisible(document.querySelector('div[contenteditable="true"][role="textbox"][aria-multiline="true"]'));
            pushIfVisible(document.querySelector('div[contenteditable="true"][role="textbox"]'));
            pushIfVisible(safeQuerySelector(serviceSelectors.PROMPT_INPUT));

            Array.from(document.querySelectorAll('[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], div[contenteditable="true"][aria-multiline="true"]'))
                .filter(el => el.offsetParent !== null)
                .forEach(pushIfVisible);

            const ranked = rankPromptInputCandidates(collected);
            if (ranked.length > 0) {
                return ranked[0];
            }

            try {
                const waited = await waitForElement(
                    serviceSelectors.PROMPT_INPUT || '[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], div[contenteditable="true"][aria-multiline="true"]',
                    10000
                );
                if (!waited) return null;
                const waitedRanked = rankPromptInputCandidates([waited]);
                return waitedRanked[0] || waited;
            } catch (error) {
                return null;
            }
        }

        function getSubmitCandidates(input, currentButton = null) {
            const composerContainer = input?.closest('[data-testid*="prompt" i], form, section, article, div');
            const container = composerContainer || input?.parentElement || document.body;
            const allButtons = Array.from(container.querySelectorAll('button, [role="button"]'))
                .filter(btn => btn.offsetParent !== null && btn !== input && !isDownloadLikeButton(btn));

            const siblingButtons = input?.parentElement
                ? Array.from(input.parentElement.querySelectorAll('button, [role="button"]'))
                    .filter(btn => btn.offsetParent !== null && btn !== input && !isDownloadLikeButton(btn))
                : [];

            const ranked = allButtons
                .map(btn => {
                    const rect = btn.getBoundingClientRect?.() || { top: 0, left: 0, width: 0, height: 0 };
                    const inputRect = input?.getBoundingClientRect?.() || { bottom: 0, right: 0 };
                    const distance = Math.abs(rect.top - inputRect.bottom) + Math.abs(rect.left - inputRect.right);
                    const likely = isLikelySubmitButton(btn) ? 0 : 1;
                    const disabled = isDisabledButton(btn) ? 1 : 0;
                    const siblingBoost = siblingButtons.includes(btn) ? -1 : 0;
                    const rightSideBoost = rect.left >= (inputRect.right - 24) ? -1 : 0;
                    return { btn, distance, likely, disabled, siblingBoost, rightSideBoost };
                })
                .sort((a, b) => {
                    if (a.siblingBoost !== b.siblingBoost) return a.siblingBoost - b.siblingBoost;
                    if (a.rightSideBoost !== b.rightSideBoost) return a.rightSideBoost - b.rightSideBoost;
                    if (a.likely !== b.likely) return a.likely - b.likely;
                    if (a.disabled !== b.disabled) return a.disabled - b.disabled;
                    return a.distance - b.distance;
                })
                .map(entry => entry.btn);

            const unique = [];
            if (currentButton) unique.push(currentButton);
            ranked.forEach(btn => {
                if (!unique.includes(btn)) unique.push(btn);
            });
            return unique.slice(0, 6);
        }

        function findNearestPromptInputForButton(button, fallbackInput = null) {
            if (!button) return fallbackInput;
            const scope = button.closest('[data-testid*="prompt" i], form, section, article, div') || document.body;
            const candidates = Array.from(scope.querySelectorAll(
                '[data-testid*="prompt" i], textarea, div[contenteditable="true"], div[contenteditable="plaintext-only"], [role="textbox"]'
            )).filter(el => el && el.offsetParent !== null);

            if (candidates.length === 0) return fallbackInput;

            const buttonRect = button.getBoundingClientRect?.() || { top: 0, left: 0 };
            candidates.sort((a, b) => {
                const aRect = a.getBoundingClientRect?.() || { top: 0, left: 0 };
                const bRect = b.getBoundingClientRect?.() || { top: 0, left: 0 };
                const da = Math.abs(aRect.top - buttonRect.top) + Math.abs(aRect.left - buttonRect.left);
                const db = Math.abs(bRect.top - buttonRect.top) + Math.abs(bRect.left - buttonRect.left);
                return da - db;
            });
            return candidates[0] || fallbackInput;
        }

        async function ensurePromptInInput(input, promptText, options = {}) {
            const expected = promptText || '';
            if (!normalizeComparableText(expected)) return false;

            const current = readPromptInputValue(input);
            if (isPromptBoundEnough(current, expected)) {
                return true;
            }

            await fillPromptInput(input, promptText, options);
            await new Promise(r => setTimeout(r, 180));
            const afterFill = readPromptInputValue(input);
            if (isPromptBoundEnough(afterFill, expected)) {
                return true;
            }

            await fillPromptInput(input, promptText, options);
            await new Promise(r => setTimeout(r, 220));
            const second = readPromptInputValue(input);
            return isPromptBoundEnough(second, expected);
        }

        function findClosestSubmitButton(input, currentButton = null) {
            if (currentButton && currentButton.offsetParent !== null && isLikelySubmitButton(currentButton)) {
                return currentButton;
            }

            const siblingButtons = input?.parentElement
                ? Array.from(input.parentElement.querySelectorAll('button, [role="button"]'))
                    .filter(btn => btn.offsetParent !== null && isLikelySubmitButton(btn))
                : [];
            if (siblingButtons.length > 0) {
                return siblingButtons[siblingButtons.length - 1];
            }

            const container = input?.closest('[data-testid*="prompt" i], form, [role="main"], section, article, div') || document.body;
            const nearbyButtons = Array.from(container.querySelectorAll('button, [role="button"]'))
                .filter(btn => btn.offsetParent !== null && isLikelySubmitButton(btn));

            if (nearbyButtons.length === 0) {
                const geometricFallback = Array.from(container.querySelectorAll('button, [role="button"]'))
                    .filter(btn => btn.offsetParent !== null && !isDownloadLikeButton(btn) && btn !== input)
                    .filter(btn => btn.getAttribute('aria-haspopup') !== 'menu' && btn.getAttribute('aria-haspopup') !== 'dialog')
                    .filter(btn => {
                        const rect = btn.getBoundingClientRect?.();
                        if (!rect) return false;
                        return rect.width >= 28 && rect.height >= 28;
                    });

                if (geometricFallback.length === 0) return currentButton;

                if (!input?.getBoundingClientRect) return geometricFallback[geometricFallback.length - 1];
                const inputRect = input.getBoundingClientRect();
                geometricFallback.sort((a, b) => {
                    const aRect = a.getBoundingClientRect();
                    const bRect = b.getBoundingClientRect();
                    const aDistance = Math.abs(aRect.top - inputRect.bottom) + Math.abs(aRect.left - inputRect.right);
                    const bDistance = Math.abs(bRect.top - inputRect.bottom) + Math.abs(bRect.left - inputRect.right);
                    return aDistance - bDistance;
                });
                return geometricFallback[0] || currentButton;
            }

            if (!input?.getBoundingClientRect) return nearbyButtons[nearbyButtons.length - 1];

            const inputRect = input.getBoundingClientRect();
            nearbyButtons.sort((a, b) => {
                const aRect = a.getBoundingClientRect();
                const bRect = b.getBoundingClientRect();
                const aDistance = Math.abs(aRect.top - inputRect.bottom) + Math.abs(aRect.left - inputRect.right);
                const bDistance = Math.abs(bRect.top - inputRect.bottom) + Math.abs(bRect.left - inputRect.right);
                return aDistance - bDistance;
            });
            return nearbyButtons[0] || currentButton;
        }

        function getButtonIconText(btn) {
            if (!btn) return '';
            const iconNodes = Array.from(btn.querySelectorAll('i, span.material-icons, span.google-symbols, svg'));
            const iconText = iconNodes.map(node => (node.innerText || node.textContent || '')).join(' ');
            return normalizeText(iconText);
        }

        function findPrimaryComposerPairByArrowButton() {
            const vw = window.innerWidth || 1000;
            const vh = window.innerHeight || 1000;
            const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
                .filter(btn => btn && btn.offsetParent !== null)
                .filter(btn => !isDownloadLikeButton(btn))
                .filter(btn => !btn.closest('[role="menu"], [data-radix-dropdown-menu-content], [data-radix-menu-content]'));

            const ranked = buttons.map((btn) => {
                const icon = getButtonIconText(btn);
                const txt = textOf(btn);
                const rect = btn.getBoundingClientRect?.() || { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
                let score = 0;
                if (icon.includes('arrow_forward') || icon.includes('send') || icon.includes('arrow_upward')) score += 70;
                if (txt.includes('generate') || txt.includes('send')) score += 20;
                if (rect.bottom > vh * 0.55) score += 15;
                if (rect.left > vw * 0.45) score += 10;
                if (rect.width <= 80) score += 8;
                if (txt.includes('create')) score -= 10;
                if (isDisabledButton(btn)) score -= 10;
                return { btn, score };
            }).sort((a, b) => b.score - a.score);

            const topBtn = ranked[0]?.btn;
            if (!topBtn || ranked[0].score < 40) return null;

            let scope = topBtn.parentElement;
            for (let depth = 0; depth < 6 && scope; depth++) {
                const candidates = Array.from(scope.querySelectorAll(
                    '[data-lexical-editor="true"], [contenteditable="true"][aria-multiline="true"], [contenteditable="plaintext-only"][aria-multiline="true"], [role="textbox"][aria-multiline="true"]'
                )).filter(isEditableCandidate);
                if (candidates.length > 0) {
                    const bRect = topBtn.getBoundingClientRect?.() || { top: 0, left: 0 };
                    candidates.sort((a, b) => {
                        const ar = a.getBoundingClientRect?.() || { top: 0, left: 0 };
                        const br = b.getBoundingClientRect?.() || { top: 0, left: 0 };
                        const ad = Math.abs(ar.top - bRect.top) + Math.abs(ar.left - bRect.left);
                        const bd = Math.abs(br.top - bRect.top) + Math.abs(br.left - bRect.left);
                        return ad - bd;
                    });
                    return { input: candidates[0], submitButton: topBtn };
                }
                scope = scope.parentElement;
            }
            return null;
        }

        function findStrictFlowComposerPair() {
            const vw = window.innerWidth || 1000;
            const vh = window.innerHeight || 1000;

            const buttons = Array.from(document.querySelectorAll('button, [role="button"]'))
                .filter(btn => btn && btn.offsetParent !== null)
                .filter(btn => !isDownloadLikeButton(btn))
                .filter(btn => !btn.closest('[role="menu"], [data-radix-dropdown-menu-content], [data-radix-menu-content]'));

            const rankedButtons = buttons.map((btn) => {
                const iconTxt = getButtonIconText(btn);
                const txt = textOf(btn);
                const rect = btn.getBoundingClientRect?.() || { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
                let score = 0;
                if (iconTxt.includes('arrow_forward') || iconTxt.includes('send') || iconTxt.includes('arrow_upward')) score += 120;
                if (txt.includes('generate') || txt.includes('create') || txt.includes('send') || txt.includes('submit')) score += 50;
                if (rect.bottom > vh * 0.62) score += 35;
                if (rect.left > vw * 0.45) score += 20;
                if (rect.width <= 90) score += 10;
                if (isDisabledButton(btn)) score -= 8;
                if (txt.includes('history') || txt.includes('download') || txt.includes('settings') || txt.includes('queue')) score -= 100;
                return { btn, rect, score };
            }).sort((a, b) => b.score - a.score);

            for (const candidate of rankedButtons.slice(0, 8)) {
                if (candidate.score < 70) continue;
                let scope = candidate.btn.parentElement;
                for (let depth = 0; depth < 8 && scope; depth++) {
                    const inputs = Array.from(scope.querySelectorAll(
                        '[data-lexical-editor="true"], [contenteditable="true"][aria-multiline="true"], [contenteditable="plaintext-only"][aria-multiline="true"], [role="textbox"][aria-multiline="true"]'
                    )).filter(isEditableCandidate);
                    if (inputs.length > 0) {
                        const rankedInputs = rankPromptInputCandidates(inputs);
                        const input = rankedInputs[0] || inputs[0];
                        if (input) return { input, submitButton: candidate.btn };
                    }
                    scope = scope.parentElement;
                }
            }
            return null;
        }

        function findComposerPairByDisclaimer() {
            const disclaimerNodes = Array.from(document.querySelectorAll('div, span, p')).filter((node) => {
                const txt = (node.innerText || node.textContent || '').toLowerCase();
                return txt.includes('flow can make mistakes');
            });

            for (const node of disclaimerNodes) {
                let scope = node.parentElement;
                for (let depth = 0; depth < 8 && scope; depth++) {
                    const inputs = Array.from(scope.querySelectorAll(
                        '[data-lexical-editor="true"], [contenteditable="true"][aria-multiline="true"], [contenteditable="plaintext-only"][aria-multiline="true"], [role="textbox"][aria-multiline="true"]'
                    )).filter(isEditableCandidate);
                    if (inputs.length > 0) {
                        const rankedInputs = rankPromptInputCandidates(inputs);
                        const input = rankedInputs[0] || inputs[0];
                        const submitButton = findSubmitButtonInComposer(input);
                        if (input && submitButton) {
                            return { input, submitButton };
                        }
                    }
                    scope = scope.parentElement;
                }
            }
            return null;
        }

        function findSubmitButtonInComposer(input) {
            if (!input) return null;
            const inputRect = input.getBoundingClientRect?.() || { top: 0, left: 0, right: 0, bottom: 0 };
            let current = input;
            for (let depth = 0; depth < 6 && current; depth++) {
                current = current.parentElement;
                if (!current) break;

                const buttons = Array.from(current.querySelectorAll('button, [role="button"]'))
                    .filter(btn => btn && btn.offsetParent !== null)
                    .filter(btn => !isDownloadLikeButton(btn))
                    .filter(btn => (btn.getAttribute('role') || '').toLowerCase() !== 'tab')
                    .filter(btn => isLikelySubmitButton(btn))
                    .filter(btn => !btn.closest('[role="menu"], [data-radix-dropdown-menu-content], [data-radix-menu-content]'));

                if (buttons.length === 0) continue;

                const ranked = buttons.map((btn) => {
                    const txt = textOf(btn);
                    const iconTxt = getButtonIconText(btn);
                    const rect = btn.getBoundingClientRect?.() || { top: 0, left: 0, right: 0, bottom: 0 };
                    const distance = Math.abs(rect.top - inputRect.bottom) + Math.abs(rect.left - inputRect.right);
                    let score = 0;
                    if (txt.includes('generate') || txt.includes('send') || txt.includes('submit') || txt.includes('create') || txt.includes('run')) score += 40;
                    if (iconTxt.includes('arrow_forward') || iconTxt.includes('send') || iconTxt.includes('arrow_upward')) score += 45;
                    if (btn.getAttribute('type') === 'submit') score += 25;
                    if (rect.left >= (inputRect.right - 24)) score += 15;
                    if (rect.top >= (inputRect.top - 100) && rect.top <= (inputRect.bottom + 120)) score += 12;
                    if (isDisabledButton(btn)) score -= 20;
                    if (txt.includes('history') || txt.includes('download') || txt.includes('settings')) score -= 100;
                    score -= Math.min(distance / 40, 20);
                    return { btn, score };
                }).sort((a, b) => b.score - a.score);

                if (ranked[0]?.score > 5) {
                    return ranked[0].btn;
                }
            }
            return null;
        }

        function findStableFlowComposer() {
            const disclaimerNodes = Array.from(document.querySelectorAll('div, span, p')).filter((node) => {
                const txt = (node.innerText || node.textContent || '').toLowerCase();
                return txt.includes('flow can make mistakes');
            });

            for (const node of disclaimerNodes) {
                let scope = node.parentElement;
                for (let depth = 0; depth < 8 && scope; depth++) {
                    const inputs = rankPromptInputCandidates(Array.from(scope.querySelectorAll(
                        '[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], [contenteditable="true"][aria-multiline="true"], [contenteditable="plaintext-only"][aria-multiline="true"]'
                    )));
                    if (inputs.length > 0) {
                        const input = inputs[0];
                        const submitButton = findSubmitButtonInComposer(input) || findClosestSubmitButton(input, null);
                        if (input) {
                            return { input, submitButton };
                        }
                    }
                    scope = scope.parentElement;
                }
            }

            const fallbackInputs = rankPromptInputCandidates(Array.from(document.querySelectorAll(
                '[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], [contenteditable="true"][aria-multiline="true"], [contenteditable="plaintext-only"][aria-multiline="true"]'
            )));
            const fallbackInput = fallbackInputs[0] || null;
            return {
                input: fallbackInput,
                submitButton: fallbackInput ? (findSubmitButtonInComposer(fallbackInput) || findClosestSubmitButton(fallbackInput, null)) : null
            };
        }

        function findReferenceTriggerNearComposer(input, { allowGenericAddMedia = false } = {}) {
            if (!input) return null;

            // The video Ingredients "+" trigger lives INSIDE the open video settings
            // dropdown (a [data-radix-menu-content] panel). The general composer scan
            // below deliberately excludes buttons inside any open menu (to avoid
            // clicking into an unrelated stray dropdown), which also hides this
            // legitimate trigger. Search inside the currently open video settings
            // panel FIRST, before that exclusion ever applies.
            const openVideoPanel = typeof findVideoSettingsPanel === 'function' ? findVideoSettingsPanel() : null;
            if (openVideoPanel) {
                const panelBtn = Array.from(openVideoPanel.querySelectorAll('button, [role="button"]'))
                    .filter(isVisibleElement)
                    .find((btn) => {
                        const txt = normalizeText(`${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`);
                        const icon = getButtonIconText(btn);
                        if (txt.includes('create') || txt.includes('agent')) return false;
                        return icon === 'add' || icon === 'add_2' || icon === 'add_photo_alternate'
                            || txt.includes('add media') || txt.includes('add ingredient') || txt.includes('add reference');
                    });
                if (panelBtn) return panelBtn;
            }

            const getTriggerText = (btn) => `${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`.toLowerCase();
            const isDateOrTimePicker = (btn) => {
                const txt = getTriggerText(btn);
                const icon = getButtonIconText(btn);
                return txt.includes('date') ||
                    txt.includes('calendar') ||
                    txt.includes('schedule') ||
                    txt.includes('time') ||
                    txt.includes('날짜') ||
                    txt.includes('캘린더') ||
                    icon.includes('calendar') ||
                    icon.includes('event') ||
                    icon.includes('schedule') ||
                    icon.includes('today') ||
                    icon.includes('date_range');
            };

            // NOTE: the composer "+" button (icon add_2) carries the accessible name
            // "Create" with aria-haspopup="dialog", but it IS the media picker
            // trigger — clicking it opens the asset browser (All/Images/Videos/
            // Uploads tabs). Verified live on Flow; do not exclude it by label.
            const isReferenceTrigger = (btn) => {
                if (isDateOrTimePicker(btn)) return false;
                const txt = getTriggerText(btn);
                const icon = getButtonIconText(btn);
                return txt.includes('reference') ||
                    txt.includes('add reference') ||
                    txt.includes('reference image') ||
                    txt.includes('reference asset') ||
                    icon === 'add_photo_alternate' ||
                    icon === 'add_to_photos';
            };

            const isGenericAddMediaTrigger = (btn) => {
                if (isDateOrTimePicker(btn)) return false;
                const txt = getTriggerText(btn);
                const icon = getButtonIconText(btn);
                return icon === 'add_2' ||
                    txt.includes('add media') ||
                    txt.includes('upload media') ||
                    txt.includes('add image') ||
                    txt.includes('add reference') ||
                    txt.includes('reference image') ||
                    txt.includes('reference asset');
            };

            let scope = input.closest('form, section, article, [role="main"], div') || input.parentElement;
            for (let depth = 0; depth < 8 && scope; depth++) {
                const buttons = Array.from(scope.querySelectorAll('button'))
                    .filter(btn => btn && btn.offsetParent !== null)
                    .filter(btn => !btn.closest('[role="menu"], [data-radix-dropdown-menu-content], [data-radix-menu-content]'));

                const rankTriggers = (predicate) => buttons
                    .filter(predicate)
                    .map((btn) => {
                        const txt = getTriggerText(btn);
                        const icon = getButtonIconText(btn);
                        const inputRect = input.getBoundingClientRect?.() || { top: 0, left: 0, bottom: 0, right: 0 };
                        const rect = btn.getBoundingClientRect?.() || { top: 0, left: 0, bottom: 0, right: 0 };
                        let score = 0;
                        if (icon === 'add_2') score += 100;
                        if (txt.includes('add media')) score += 80;
                        if (txt.includes('reference')) score += 60;
                        if (txt.includes('upload media')) score += 35;
                        if (rect.top >= inputRect.top - 80 && rect.top <= inputRect.bottom + 120) score += 30;
                        score -= Math.min(60, (Math.abs(rect.top - inputRect.top) + Math.abs(rect.left - inputRect.left)) / 20);
                        return { btn, score };
                    })
                    .sort((a, b) => b.score - a.score);

                const explicit = rankTriggers(isReferenceTrigger)[0];
                if (explicit?.btn && explicit.score > 10) return explicit.btn;

                if (allowGenericAddMedia) {
                    const addMedia = rankTriggers(isGenericAddMediaTrigger)[0];
                    if (addMedia?.btn && addMedia.score > 10) return addMedia.btn;
                }

                scope = scope.parentElement;
            }

            return null;
        }

        function findVideoAddMediaTriggerNearComposer(input) {
            if (!input) return null;

            const isVideoAddMediaLike = (btn) => {
                const txt = (btn.innerText || btn.textContent || '').toLowerCase();
                const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
                const title = (btn.getAttribute('title') || '').toLowerCase();
                const icon = (btn.querySelector('i, .google-symbols, .material-icons')?.textContent || '').trim().toLowerCase();
                return txt.includes('add media') || aria.includes('add media') || title.includes('add media') || 
                       txt.includes('open picker') || aria.includes('open picker') || title.includes('open picker') || 
                       (icon === 'add' && txt.includes('add media'));
            };

            const createBtn = Array.from(document.querySelectorAll('button, [role="button"], div'))
                .filter(btn => btn && btn.offsetParent !== null)
                .find((btn) => {
                    const txt = textOf(btn);
                    return txt.includes('create') || txt.includes('arrow forward');
                }) || null;

            const candidates = Array.from(document.querySelectorAll('button, [role="button"], div'))
                .filter(btn => btn && btn.offsetParent !== null)
                .filter(btn => !btn.closest('[role="menu"], [data-radix-dropdown-menu-content], [data-radix-menu-content]'))
                .filter(isVideoAddMediaLike);

            if (!candidates.length) return null;

            const anchorRect = createBtn?.getBoundingClientRect?.()
                || input?.getBoundingClientRect?.()
                || { top: 0, left: 0 };

            return candidates
                .map((btn) => {
                    const rect = btn.getBoundingClientRect?.() || { top: 0, left: 0 };
                    const distance = Math.abs((rect.top || 0) - (anchorRect.top || 0))
                        + Math.abs((rect.left || 0) - (anchorRect.left || 0));
                    return { btn, distance };
                })
                .sort((a, b) => a.distance - b.distance)[0]?.btn || null;
        }

        function findVideoFrameSlotTriggerNearComposer(input, kind = 'start') {
            if (!input) return null;
            const wanted = kind === 'end' ? 'end' : 'start';

            const isFrameSlot = (btn) => {
                const txt = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const aria = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
                const title = (btn.getAttribute('title') || '').trim().toLowerCase();
                const full = `${txt} ${aria} ${title}`.trim();

                const isTabOrVideo = full.includes('video') || full.includes('tab') || full.includes('output') || 
                                     full.includes(' x1') || full.includes(' x4') || full.includes('settings');
                
                if (wanted === 'start') {
                    // Allow only exact Start-like controls or open picker/add media controls.
                    const isStart = full === 'start' || full.startsWith('start ') || full.includes('open picker') || full.includes('add media');
                    // Settings labels such as "Video x1" are never Start buttons.
                    return isStart && !isTabOrVideo;
                }
                const isEnd = full === 'end' || full.startsWith('end ');
                return isEnd && !isTabOrVideo;
            };

            const createBtn = Array.from(document.querySelectorAll('button, [role="button"], div'))
                .filter(btn => btn && btn.offsetParent !== null)
                .find((btn) => {
                    const txt = textOf(btn);
                    return txt.includes('create') || txt.includes('arrow forward');
                }) || null;

            const candidates = Array.from(document.querySelectorAll('button, [role="button"], div'))
                .filter(btn => btn && btn.offsetParent !== null)
                .filter(btn => !btn.closest('[role="menu"], [data-radix-dropdown-menu-content], [data-radix-menu-content]'))
                .filter(isFrameSlot);

            if (!candidates.length) return null;

            const anchorRect = createBtn?.getBoundingClientRect?.()
                || input?.getBoundingClientRect?.()
                || { top: 0, left: 0 };

            return candidates
                .map((btn) => {
                    const rect = btn.getBoundingClientRect?.() || { top: 0, left: 0 };
                    const distance = Math.abs((rect.top || 0) - (anchorRect.top || 0))
                        + Math.abs((rect.left || 0) - (anchorRect.left || 0));
                    const txt = (btn.innerText || btn.textContent || '').trim().toLowerCase();
                    // Exact single-word start/end matches get the highest priority.
                    const score = (txt === wanted) ? -1000 : txt.length;
                    return { btn, distance, score };
                })
                .sort((a, b) => a.score - b.score || a.distance - b.distance)[0]?.btn || null;
        }

        function collectDisclaimerScopedInputs() {
            const scoped = [];
            const seen = new Set();
            const disclaimerNodes = Array.from(document.querySelectorAll('div, span, p')).filter((node) => {
                const txt = (node.innerText || node.textContent || '').toLowerCase();
                return txt.includes('flow can make mistakes');
            });

            for (const node of disclaimerNodes) {
                let scope = node.parentElement;
                for (let depth = 0; depth < 8 && scope; depth++) {
                    const inputs = Array.from(scope.querySelectorAll(
                        '[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], [contenteditable="true"][aria-multiline="true"], [contenteditable="plaintext-only"][aria-multiline="true"]'
                    )).filter(isEditableCandidate);
                    for (const input of inputs) {
                        const key = describeInput(input);
                        if (seen.has(key)) continue;
                        seen.add(key);
                        scoped.push(input);
                    }
                    if (inputs.length > 0) break;
                    scope = scope.parentElement;
                }
            }
            return rankPromptInputCandidates(scoped);
        }

        function collectComposerPairs() {
            const strictPair = findStrictFlowComposerPair();
            const disclaimerPair = findComposerPairByDisclaimer();
            const primary = strictPair || disclaimerPair || findPrimaryComposerPairByArrowButton();
            const activeCandidate = getActivePromptCandidate();
            const disclaimerInputs = collectDisclaimerScopedInputs();
            const rankedInputs = rankPromptInputCandidates(Array.from(document.querySelectorAll(
                '[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], div[contenteditable="true"][aria-multiline="true"]'
            )));
            const mergedInputList = [...disclaimerInputs, ...rankedInputs].filter((input, idx, arr) => arr.indexOf(input) === idx);
            const inputs = (activeCandidate && isStrongComposerCandidate(activeCandidate) && !mergedInputList.includes(activeCandidate))
                ? [activeCandidate, ...mergedInputList]
                : mergedInputList;
            const trimmedInputs = inputs.slice(0, 8);

            const pairs = trimmedInputs.map((input) => {
                const btn = findSubmitButtonInComposer(input);
                if (!btn) return null;
                const inputRect = input.getBoundingClientRect?.() || { top: 0, left: 0 };
                const btnRect = btn.getBoundingClientRect?.() || { top: 0, left: 0 };
                const distance = Math.abs(inputRect.top - btnRect.top) + Math.abs(inputRect.left - btnRect.left);
                return { input, submitButton: btn, distance };
            }).filter(Boolean).sort((a, b) => a.distance - b.distance);

            const seen = new Set();
            const uniquePairs = pairs.filter((pair) => {
                const key = `${describeInput(pair.input)}|${describeButton(pair.submitButton)}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            if (primary) {
                const pKey = `${describeInput(primary.input)}|${describeButton(primary.submitButton)}`;
                if (!seen.has(pKey)) {
                    return [primary, ...uniquePairs];
                }
            }
            return uniquePairs;
        }

        function findBestComposerPair() {
            const pairs = collectComposerPairs();
            if (pairs.length > 0) return pairs[0];
            const inputCandidates = rankPromptInputCandidates(Array.from(document.querySelectorAll(
                '[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], div[contenteditable="true"][aria-multiline="true"]'
            )));
            const fallbackInput = inputCandidates[0] || null;
            return { input: fallbackInput, submitButton: findSubmitButtonInComposer(fallbackInput) };
        }

        function hasLikelyPromptComposer() {
            const pair = findBestComposerPair();
            return !!(pair && pair.input);
        }

        async function waitForGenerationStart(serviceSelectors, input, genBtn, timeoutMs = 12000) {
            const startedAt = Date.now();
            const initialInputValue = normalizeText(readPromptInputValue(input));

            while (Date.now() - startedAt < timeoutMs) {
                if (hasGenerationSignal(serviceSelectors)) return true;

                if (genBtn && isDisabledButton(genBtn)) return true;

                const currentValue = normalizeText(readPromptInputValue(input));
                if (initialInputValue && currentValue !== initialInputValue) return true;

                const failure = getFlowGenerationNetworkFailureSince(startedAt);
                if (failure) {
                    throw new Error(formatFlowGenerationNetworkFailure(failure));
                }

                await new Promise(r => setTimeout(r, 500));
            }

            return false;
        }

        function setNativeInputValue(input, value) {
            if (!input) return;
            const proto = input.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement?.prototype
                : window.HTMLInputElement?.prototype;
            const setter = proto && Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) {
                setter.call(input, value);
            } else {
                input.value = value;
            }
        }

        async function tryKeyboardSelectAll(targetInput) {
            if (!targetInput) return;
            try {
                targetInput.focus();
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const modifier = isMac ? { metaKey: true } : { ctrlKey: true };

                const keydown = new KeyboardEvent('keydown', {
                    key: 'a',
                    code: 'KeyA',
                    bubbles: true,
                    cancelable: true,
                    ...modifier
                });
                targetInput.dispatchEvent(keydown);

                // Also fire the select event just in case
                targetInput.dispatchEvent(new Event('select', { bubbles: true }));

                await new Promise(r => setTimeout(r, 60));
            } catch (e) { }
        }

        // Must match BRIDGE_VERSION in shared/bridge.js. Bump both when bridge
        // handlers change so an already-loaded page upgrades its bridge instead of
        // silently running stale code (the bridge persists across content-script
        // re-injections; only a fresh <script> re-runs it).
        const EXPECTED_BRIDGE_VERSION = 47;
        async function injectBridgeScript() {
            // The bridge runs in the page's MAIN world and writes its version to a
            // DOM attribute the content script can read across worlds. Re-inject when
            // the loaded bridge is older than expected (its IIFE tears down the old
            // listeners and registers the new ones).
            const loadedVersion = parseInt(
                document.documentElement.getAttribute('data-flow-bridge-version') || '0', 10);
            if (loadedVersion >= EXPECTED_BRIDGE_VERSION) return true;

            const existing = document.getElementById('flow-automator-bridge');
            if (existing) existing.remove();
            return new Promise(resolve => {
                const script = document.createElement('script');
                script.id = 'flow-automator-bridge';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                // Cache-bust so the browser re-fetches and the IIFE re-runs.
                script.src = chrome.runtime.getURL('shared/bridge.js') + '?v=' + EXPECTED_BRIDGE_VERSION;
                document.head.appendChild(script);
            });
        }

        async function injectFlowNetworkInterceptor() {
            if (document.getElementById('flow-automator-network-interceptor')) return true;
            return new Promise(resolve => {
                const script = document.createElement('script');
                script.id = 'flow-automator-network-interceptor';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                script.src = chrome.runtime.getURL('shared/flow-interceptor.js');
                document.head.appendChild(script);
            });
        }

        function clearFlowGenerationNetworkFailure() {
            latestFlowGenerationNetworkFailure = null;
        }

        function getFlowGenerationNetworkFailureSince(startedAt) {
            const failure = latestFlowGenerationNetworkFailure;
            if (!failure) return null;
            if (Number(failure.at) < Number(startedAt || 0)) return null;
            return failure;
        }

        function formatFlowGenerationNetworkFailure(failure) {
            if (!failure) return 'Flow generation request failed.';
            const statusLabel = failure.status ? `${failure.status} ${failure.statusText || ''}`.trim() : (failure.statusText || 'Network error');
            const body = String(failure.body || '').trim();
            return body
                ? `Flow generation request failed (${statusLabel}): ${body}`
                : `Flow generation request failed (${statusLabel}).`;
        }

        async function tryPasteText(targetInput, value) {
            if (!targetInput) return false;
            try {
                await injectBridgeScript();
                // We no longer mutate the target attribute to avoid Next.js crashes.
                // The bridge will primarily target document.activeElement which we focused.
                const event = new CustomEvent('FLOW_AUTOMATOR_PASTE', {
                    detail: { value: value }
                });
                document.dispatchEvent(event);
                return true;
            } catch (e) {
                return false;
            }
        }

        async function tryExecCommandInsertText(targetInput, value) {
            if (!targetInput) return false;
            if (typeof document.execCommand !== 'function') return false;

            try {
                // Use keyboard select all to keep the framework in sync
                await tryKeyboardSelectAll(targetInput);
                return !!document.execCommand('insertText', false, value);
            } catch (e) {
                return false;
            }
        }

        function setNativeObjectValue(element, value) {
            try {
                // Determine native setter (input or textarea)
                const prototype = Object.getPrototypeOf(element);
                const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
                    || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(prototype), 'value')
                    || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
                    || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');

                const lastValue = element.value;

                // Call the pure HTML setter
                if (descriptor && descriptor.set) {
                    descriptor.set.call(element, value);
                } else {
                    element.value = value;
                }

                // If there's a React 16+ value tracker attached, bypass it
                if (element._valueTracker) {
                    element._valueTracker.setValue(lastValue);
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        // Find Lexical nodes or React Input wrappers directly via fiber node lookup
        async function forceReactFiberUpdate(element, value) {
            if (!element) return false;
            try {
                await injectBridgeScript();
                const event = new CustomEvent('FLOW_AUTOMATOR_FIBER_INJECT', {
                    detail: { value: value }
                });
                document.dispatchEvent(event);
                return true;
            } catch (e) {
                return false;
            }
        }

        async function tryMainWorldSetText(targetInput, value) {
            if (!targetInput) return { ok: false, info: 'no-target' };
            const injected = await injectBridgeScript();
            if (!injected) return { ok: false, info: 'bridge-not-loaded' };

            const requestId = `set_text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            return await new Promise((resolve) => {
                let settled = false;
                const cleanup = () => {
                    window.removeEventListener('FLOW_AUTOMATOR_SET_TEXT_RESULT', onResult, true);
                };
                const done = (payload) => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(payload);
                };
                const onResult = (evt) => {
                    const detail = evt?.detail || {};
                    if (detail.requestId !== requestId) return;
                    done({ ok: !!detail.ok, info: detail.info || '' });
                };
                window.addEventListener('FLOW_AUTOMATOR_SET_TEXT_RESULT', onResult, true);
                try {
                    targetInput.focus?.();
                    targetInput.click?.();
                } catch (error) { }
                try {
                    document.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_SET_TEXT', {
                        detail: { requestId, value }
                    }));
                } catch (error) {
                    done({ ok: false, info: 'dispatch-failed' });
                    return;
                }
                setTimeout(() => done({ ok: false, info: 'timeout' }), 700);
            });
        }

        async function fillPromptInput(input, value, options = {}) {
            const preserveExistingMedia = !!options?.preserveExistingMedia;
            try {
                input?.scrollIntoView?.({ behavior: 'auto', block: 'center' });
            } catch (e) { }
            try {
                input?.focus?.();
                input?.click?.();
            } catch (e) { }
            await new Promise(r => setTimeout(r, 70));

            let targetInput = input;
            if (!(input?.tagName === 'TEXTAREA' || input?.tagName === 'INPUT')) {
                targetInput = resolveEditableInput(input);
            }
            if (!targetInput) {
                return { method: 'none', target: null, textLength: 0 };
            }

            if ((targetInput.tagName === 'TEXTAREA' || targetInput.tagName === 'INPUT') && isGenericTextboxWrapper(input)) {
                const placeholder = (targetInput.getAttribute?.('placeholder') || '').toLowerCase();
                const aria = (targetInput.getAttribute?.('aria-label') || '').toLowerCase();
                const testId = (targetInput.getAttribute?.('data-testid') || '').toLowerCase();
                const looksPrompt = placeholder.includes('prompt') || placeholder.includes('create') || placeholder.includes('describe') ||
                    aria.includes('prompt') || aria.includes('create') || aria.includes('describe') ||
                    testId.includes('prompt') || testId.includes('input');
                if (!looksPrompt) {
                    targetInput = input;
                }
            }

            // KEY FIX: if we resolved to a textarea/input but the actual focused element
            // is a contenteditable div (the real Lexical/ProseMirror editor), prefer that.
            // This is the root cause of "prompt must be provided": text goes into a hidden
            // textarea that Flow does not read, while the real editor is the active div.
            if (targetInput.tagName === 'TEXTAREA' || targetInput.tagName === 'INPUT') {
                const active = document.activeElement;
                if (active && active !== targetInput) {
                    const activeCe = (active.getAttribute?.('contenteditable') || '').toLowerCase();
                    const activeRole = (active.getAttribute?.('role') || '').toLowerCase();
                    const isActiveEditable = activeCe === 'true' || activeCe === 'plaintext-only';
                    // Only override if the active element is a visible contenteditable near our input
                    if (isActiveEditable && active.offsetParent !== null) {
                        const inputRect = targetInput.getBoundingClientRect?.() || {};
                        const activeRect = active.getBoundingClientRect?.() || {};
                        const proximity = Math.abs((activeRect.top || 0) - (inputRect.top || 0)) +
                            Math.abs((activeRect.left || 0) - (inputRect.left || 0));
                        // If the contenteditable is within 400px of our textarea, it's the real editor
                        if (proximity < 400) {
                            console.log('[FlowAutomator] Overriding textarea target with active contenteditable div (real editor).',
                                `textarea rect top=${Math.round(inputRect.top)}, active rect top=${Math.round(activeRect.top)}, role=${activeRole}`);
                            targetInput = active;
                        }
                    }
                }
            }

            // If targetInput is inside a Lexical editor but is NOT the Lexical root,
            // walk up to the root. execCommand and InputEvents must be dispatched on the
            // Lexical root element (data-lexical-editor="true") so Lexical's internal
            // EditorState updates — firing them on a child paragraph node is silently
            // ignored and leaves Flow's internal state empty despite visible DOM text.
            const lexicalRoot = targetInput.closest?.('[data-lexical-editor="true"]');
            if (lexicalRoot && lexicalRoot !== targetInput) {
                console.log('[FlowAutomator] Remapping targetInput from Lexical child to Lexical root.');
                targetInput = lexicalRoot;
            }

            try {
                targetInput.focus();
            } catch (e) { }

            // --- Slate-first path ---
            // Slate blocks all synthetic events (isTrusted:false).
            // document.execCommand('selectAll') + execCommand('insertText') is the only
            // method that bypasses isTrusted and correctly updates Slate's EditorState.
            const slateRoot = targetInput.getAttribute?.('data-slate-editor') === 'true'
                ? targetInput
                : targetInput.closest?.('[data-slate-editor="true"]') || null;
            if (slateRoot) {
                await injectBridgeScript();
                const slateRequestId = `slate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                const slateResult = await new Promise((resolve) => {
                    let settled = false;
                    const cleanup = () => window.removeEventListener('FLOW_AUTOMATOR_SET_TEXT_RESULT', onResult, true);
                    const done = (payload) => { if (settled) return; settled = true; cleanup(); resolve(payload); };
                    const onResult = (evt) => {
                        if (evt?.detail?.requestId !== slateRequestId) return;
                        done({ ok: !!evt.detail.ok, info: evt.detail.info || '' });
                    };
                    window.addEventListener('FLOW_AUTOMATOR_SET_TEXT_RESULT', onResult, true);
                    try {
                        slateRoot.focus?.();
                        document.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_SET_TEXT', {
                            detail: {
                                requestId: slateRequestId,
                                value,
                                preserveMedia: preserveExistingMedia,
                                assets: options?.assets || []
                            }
                        }));
                    } catch (err) {
                        done({ ok: false, info: 'dispatch-failed' });
                    }
                    setTimeout(() => done({ ok: false, info: 'timeout' }), 1200);
                });
                await new Promise(r => setTimeout(r, 200));
                const slateLen = readPromptInputValue(slateRoot).length || readPromptInputValue(input).length;
                if (!preserveExistingMedia || slateResult.ok) {
                    return {
                        method: `slate-${slateResult.info || 'execCommand'}`,
                        target: slateRoot,
                        textLength: slateLen || value.length
                    };
                }
                console.warn('[FlowAutomator] Slate preserve-media insert failed; trying DOM preserve-media fallback.');
            }

            if (preserveExistingMedia) {
                try {
                    targetInput.focus?.();
                    const range = document.createRange();
                    const sel = window.getSelection?.();
                    if (sel) {
                        range.selectNodeContents(targetInput);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    const inserted = typeof document.execCommand === 'function'
                        ? document.execCommand('insertText', false, value)
                        : false;
                    if (!inserted) {
                        targetInput.appendChild(document.createTextNode(value));
                    }
                    try {
                        targetInput.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
                    } catch (e) {
                        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                    return {
                        method: inserted ? 'preserve-media-insertText' : 'preserve-media-appendText',
                        target: targetInput,
                        textLength: readPromptInputValue(targetInput).length
                    };
                } catch (error) {
                    console.warn('[FlowAutomator] Preserve-media text insert failed; falling back to normal fill.', error);
                }
            }

            const mainWorldSet = await tryMainWorldSetText(targetInput, value);
            if (mainWorldSet.ok) {
                await new Promise(r => setTimeout(r, 140));
                const mainWorldLen = readPromptInputValue(input).length || readPromptInputValue(targetInput).length;
                if (mainWorldLen >= Math.max(3, Math.min(10, value.length - 1))) {
                    return {
                        method: `main-world-${mainWorldSet.info || 'set-text'}`,
                        target: targetInput,
                        textLength: mainWorldLen
                    };
                }
            }

            // If it's a real input/textarea, bypass React 16 value tracking
            if (targetInput.tagName === 'TEXTAREA' || targetInput.tagName === 'INPUT') {
                setNativeObjectValue(targetInput, value);
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                return {
                    method: 'native-bypass',
                    target: targetInput,
                    textLength: targetInput.value?.length || 0
                };
            }

            await tryKeyboardSelectAll(targetInput);
            const pasteTriggered = await tryPasteText(targetInput, value);
            if (pasteTriggered) {
                await new Promise(r => setTimeout(r, 160));
                const pastedLength = readPromptInputValue(input).length || readPromptInputValue(targetInput).length;
                const genericWrapper = isGenericTextboxWrapper(targetInput);
                const allowPasteSuccess = !genericWrapper || targetInput.getAttribute?.('data-lexical-editor') === 'true';
                if (allowPasteSuccess && pastedLength >= Math.max(3, Math.min(10, value.length - 1))) {
                    return {
                        method: 'paste-event',
                        target: targetInput,
                        textLength: pastedLength
                    };
                }
            }

            const fiberInvoked = await forceReactFiberUpdate(targetInput, value);
            if (fiberInvoked) {
                await new Promise(r => setTimeout(r, 150));
                const fiberLen = readPromptInputValue(input).length || readPromptInputValue(targetInput).length;
                if (fiberLen >= Math.max(3, Math.min(10, value.length - 1))) {
                    return {
                        method: 'fiber-inject',
                        target: targetInput,
                        textLength: fiberLen
                    };
                }
            }

            try {
                const range = document.createRange();
                const sel = window.getSelection();
                if (sel) {
                    range.selectNodeContents(targetInput);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    document.execCommand('delete', false, null);
                }
            } catch (e) { }

            let method = 'textContent-fallback';
            try {
                const range = document.createRange();
                const sel = window.getSelection();
                if (sel) {
                    range.selectNodeContents(targetInput);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }

                if (typeof document.execCommand === 'function' && (!document.queryCommandEnabled || document.queryCommandEnabled('insertText'))) {
                    const inserted = document.execCommand('insertText', false, value);
                    if (inserted) {
                        method = 'execCommand-insertText';
                    } else {
                        targetInput.textContent = value;
                    }
                } else {
                    targetInput.textContent = value;
                }
            } catch (error) {
                targetInput.textContent = value;
            }

            try {
                const dt = new DataTransfer();
                dt.setData('text/plain', value);
                targetInput.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: value, dataTransfer: dt, bubbles: true, cancelable: true }));
            } catch (e) {}

            targetInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            targetInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

            return {
                method,
                target: targetInput,
                textLength: readPromptInputValue(targetInput).length
            };
        }

        async function tryKeyboardSubmitVariants(input, serviceSelectors, genBtn, updateProgress) {
            const targetInput = resolveEditableInput(input) || input;
            const variants = [
                { key: 'Enter', code: 'Enter', ctrlKey: false, metaKey: false, label: 'Enter' },
                { key: 'Enter', code: 'Enter', ctrlKey: true, metaKey: false, label: 'Ctrl+Enter' },
                { key: 'Enter', code: 'Enter', ctrlKey: false, metaKey: true, label: 'Meta+Enter' }
            ];

            for (const variant of variants) {
                try {
                    targetInput.focus();
                } catch (e) { }

                updateProgress(`Submit did not start, retrying with ${variant.label}...`);
                const eventConfig = {
                    key: variant.key,
                    code: variant.code,
                    keyCode: 13,
                    which: 13,
                    charCode: 13,
                    ctrlKey: variant.ctrlKey,
                    metaKey: variant.metaKey,
                    bubbles: true,
                    cancelable: true
                };
                targetInput.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
                targetInput.dispatchEvent(new KeyboardEvent('keypress', eventConfig));
                targetInput.dispatchEvent(new KeyboardEvent('keyup', eventConfig));

                const started = await waitForGenerationStart(serviceSelectors, targetInput, genBtn, 1200);
                if (started) return true;
            }

            return false;
        }

        function tryFormSubmitFallback(input, submitButton = null) {
            return false;
        }

        let isHistoryDownloadStopped = false;

        // ── Reference Asset Selection ───────────────────────────────────────────
        function tryParseAssetNameFromUrl(src) {
            if (!src) return null;
            try {
                const url = new URL(src, location.href);
                // 1. Prefer known URL parameters such as name, assetId, id, filename, and mediaId.
                const name = url.searchParams.get('name') || 
                             url.searchParams.get('assetId') || 
                             url.searchParams.get('id') || 
                             url.searchParams.get('mediaId') ||
                             url.searchParams.get('filename');
                if (name) return name;

                // 2. Extract UUID-like or long hash patterns from the full URL.
                const fullMatch = src.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})|([a-f0-9]{32,64})/i);
                if (fullMatch) return fullMatch[0];

                return null;
            } catch {
                const fullMatch = src.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})|([a-f0-9]{32,64})/i);
                return fullMatch ? fullMatch[0] : null;
            }
        }

        function getAssetMentionLabel(asset) {
            if (!asset || typeof asset !== 'object') return '';
            const raw = asset.assetName || asset.name || asset.title || '';
            const label = String(raw || '')
                .replace(/\.[a-z0-9]{2,5}$/i, '')
                .replace(/^@+/, '')
                .trim();
            if (!label || /^https?:\/\//i.test(label) || label.length > 80) return '';
            return label;
        }

        function getAssetMentionToken(asset) {
            const label = getAssetMentionLabel(asset);
            return label ? `@${label}` : '';
        }

        function appendUniquePromptToken(tokens, token) {
            const normalized = String(token || '').trim();
            if (!normalized) return false;
            const tokenKey = normalizeText(normalized);
            if (tokens.some(existing => normalizeText(existing) === tokenKey)) return false;
            tokens.push(normalized);
            return true;
        }

        function appendAssetMentionFallbackTokens(tokens, assets = []) {
            let count = 0;
            for (const asset of assets) {
                if (appendUniquePromptToken(tokens, getAssetMentionToken(asset))) count++;
            }
            return count;
        }

        function getAssetAlias(asset) {
            if (!asset || typeof asset !== 'object') return '';
            return String(asset.assetAlias || asset.alias || '')
                .replace(/[{}]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function getAssetAliasPromptReplacement(asset) {
            const alias = getAssetAlias(asset);
            if (!alias) return '';
            const mentionToken = getAssetMentionToken(asset);
            if (mentionToken) return mentionToken;
            return `the image labeled "${alias}"`;
        }

        function applyPromptAssetAliases(promptText, assets = []) {
            const promptValue = String(promptText || '');
            if (!promptValue || !promptValue.includes('{{')) return promptText;

            const replacements = new Map();
            for (const asset of Array.isArray(assets) ? assets : []) {
                const alias = getAssetAlias(asset);
                const replacement = getAssetAliasPromptReplacement(asset);
                if (!alias || !replacement) continue;
                const key = normalizeText(alias);
                if (key && !replacements.has(key)) replacements.set(key, replacement);
            }
            if (!replacements.size) return promptText;

            return promptValue.replace(/\{\{\s*([^{}]{1,80})\s*\}\}/g, (match, rawAlias) => {
                const key = normalizeText(rawAlias);
                return replacements.get(key) || match;
            });
        }

        function buildPromptAssetNameGuide(assetGroups = []) {
            const parts = [];
            const seen = new Set();
            for (const group of Array.isArray(assetGroups) ? assetGroups : []) {
                const role = group?.role || 'Image';
                const assets = Array.isArray(group?.assets) ? group.assets : [];
                assets.forEach((asset, index) => {
                    const alias = getAssetAlias(asset);
                    const key = normalizeText(alias);
                    if (!alias || !key || seen.has(key)) return;
                    seen.add(key);
                    parts.push(`"${alias}" refers to selected ${role} ${index + 1}`);
                });
            }
            return parts.length ? `Use these selected image names in the prompt: ${parts.join('; ')}.` : '';
        }

        function mergePromptTokens(promptText, tokens = []) {
            const cleanPrompt = String(promptText || '').trim();
            const cleanPromptNormalized = normalizeText(cleanPrompt);
            const additions = tokens
                .map(token => String(token || '').trim())
                .filter(token => token && !cleanPromptNormalized.includes(normalizeText(token)));
            if (!additions.length) return cleanPrompt;
            const uniqueAdditions = additions.filter((token, idx, arr) => arr.indexOf(token) === idx);
            const extension = uniqueAdditions.join(' ');
            return cleanPrompt ? `${cleanPrompt} ${extension}` : extension;
        }


        function normalizeReferenceAssets(assets = []) {
            const list = Array.isArray(assets) ? assets : [];
            const seen = new Set();
            const out = [];

            for (const asset of list) {
                // Prefer videoStartImage when it is stored directly on the asset queue item.
                const effectiveAsset = asset?.videoStartImage || asset;
                const id = typeof effectiveAsset === 'string' ? effectiveAsset : (effectiveAsset?.id || '');
                const src = typeof effectiveAsset === 'object' ? (effectiveAsset?.src || '') : '';
                const key = id || tryParseAssetNameFromUrl(src) || src;
                if (!key || seen.has(key)) continue;
                seen.add(key);
                out.push(typeof effectiveAsset === 'string' ? { id, src: '' } : effectiveAsset);
            }

            return out;
        }

        function getCanonicalAssetUrl(src) {
            if (!src) return '';
            try {
                const url = new URL(src, location.href);
                // Strip all volatile/display params; keep only identity params
                const VOLATILE = ['token', 'authuser', 'cb', 't', '_', 'w', 'h', 'sz', 'rs', 'fife', 'ow', 'oh', 'ts', 'smh'];
                VOLATILE.forEach(p => url.searchParams.delete(p));
                const params = Array.from(url.searchParams.entries())
                    .sort(([a], [b]) => a.localeCompare(b));
                const sorted = new URL(url.origin + url.pathname);
                params.forEach(([key, value]) => sorted.searchParams.append(key, value));
                return sorted.toString();
            } catch {
                return String(src || '').trim();
            }
        }

        function extractUuidFromUrl(src) {
            if (!src) return null;
            // UUID format: 8-4-4-4-12 hex
            const uuidMatch = src.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
            if (uuidMatch) return uuidMatch[0].toLowerCase();
            // Long hex hash (32-64 chars)
            const hashMatch = src.match(/[a-f0-9]{32,64}/i);
            if (hashMatch) return hashMatch[0].toLowerCase();
            return null;
        }

        function isVisibleElement(el) {
            if (!el || !(el instanceof Element)) return false;
            if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
            const rect = el.getBoundingClientRect();
            if (!rect || rect.width < 8 || rect.height < 8) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }

        function getReferencePanelAssetImages(panel) {
            const scope = (panel && panel.isConnected) ? panel : document;
            // Get ALL visible images inside the panel that are large enough to be thumbnails (not icons)
            // Also include lazy-loaded images that have a src but may not be fully loaded yet
            const imgs = Array.from(scope.querySelectorAll('img'))
                .filter((img) => {
                    const src = img.currentSrc || img.src || img.getAttribute('src') || img.getAttribute('data-src') || '';
                    if (!src) return false;
                    // Accept all typical schema types (http, blob, data, chrome-extension) and relative paths
                    const isAllowedSchema = src.startsWith('http') 
                        || src.startsWith('blob:') 
                        || src.startsWith('data:')
                        || src.startsWith('/')
                        || src.startsWith('./')
                        || src.includes('getMediaUrlRedirect') 
                        || src.includes('/api/') 
                        || src.includes('/media/');
                    if (!isAllowedSchema) return false;

                    // For lazy-loaded images: check element size attributes if getBoundingClientRect not available
                    const rect = img.getBoundingClientRect();
                    const w = rect.width || img.width || parseInt(img.getAttribute('width') || '0');
                    const h = rect.height || img.height || parseInt(img.getAttribute('height') || '0');
                    if (w < 24 || h < 24) return false;

                    // Check DOM visibility style directly (offsetParent can be null in display:contents)
                    const style = window.getComputedStyle(img);
                    if (style.display === 'none' || style.visibility === 'hidden') return false;
                    // Never treat images already attached inside the prompt composer as
                    // picker candidates. In compact Flow UI this was causing selected
                    // prompt thumbnails to be found again and toggled/removed.
                    if (img.closest?.('[data-slate-editor="true"], [data-lexical-editor="true"], [role="textbox"][aria-multiline="true"]')) {
                        return false;
                    }
                    return true;
                });

            const seen = new Set();
            return imgs.filter((img) => {
                // Use the name param as key if available (more stable than full URL)
                const src = img.currentSrc || img.src || img.getAttribute('src') || '';
                const nameParam = getMediaNameParam(src);
                const key = nameParam || src || '';
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        function isPromptComposerAttachedImage(img) {
            return !!img?.closest?.('[data-slate-editor="true"], [data-lexical-editor="true"], [role="textbox"][aria-multiline="true"]');
        }

        function countPromptComposerAttachedImages() {
            return Array.from(document.querySelectorAll('img'))
                .filter(isPromptComposerAttachedImage)
                .length;
        }

        function getReferenceTileText(img) {
            if (!img) return '';
            // 1. Check label attributes on the image itself.
            const attrLabels = [
                img.getAttribute('alt'),
                img.getAttribute('aria-label'),
                img.getAttribute('title'),
                img.parentElement?.getAttribute('aria-label')
            ].filter(Boolean).join(' ');

            const parts = [attrLabels];
            let node = img.parentElement;
            for (let depth = 0; depth < 5 && node; depth++) {
                const text = (node.innerText || node.textContent || '').trim();
                if (text) parts.push(text);
                // Stop walking up if we reached a tile boundary. This must match
                // the same container patterns used elsewhere in this file
                // (isCollectionReferenceImage, getDirectReferenceTileButton) —
                // Flow's tiles are commonly wrapped in a <button>/<a>, and
                // omitting those here let the walk climb past the tile into the
                // surrounding grid, accumulating neighboring tiles' captions
                // into the same text blob and breaking exact-label matching.
                if (node.matches && (
                    node.matches('button')
                    || node.matches('[role="button"]')
                    || node.matches('a')
                    || node.matches('[data-tile-id]')
                    || node.matches('[role="gridcell"]')
                    || node.matches('[role="option"]')
                    || node.matches('li')
                    || node.matches('article')
                )) {
                    break;
                }
                node = node.parentElement;
            }
            return parts.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
        }

        function isCollectionReferenceImage(img) {
            const container = img?.closest?.('button, [role="button"], a, [data-tile-id], [role="gridcell"], [role="option"]');
            return !!container;
        }

        // The "All Media" picker tab mixes images and videos, and video tiles
        // still render their poster frame as a plain <img> — so a mention/label
        // search (e.g. "@macan") can match a similarly-named VIDEO tile instead
        // of the intended image when reference selection isn't restricted to
        // the Images tab. Flow marks video tiles with a duration badge
        // ("0:08") and/or a play icon near the thumbnail; images have neither.
        function isVideoReferenceTile(img) {
            if (!img) return false;
            const alt = (img.getAttribute('alt') || '').toLowerCase();
            if (alt.includes('video')) return true;
            const container = img.closest('button, [role="button"], a, [data-tile-id], [role="gridcell"], [role="option"]') || img.parentElement;
            if (!container) return false;
            if (container.querySelector('video')) return true;
            const txt = normalizeText(container.innerText || container.textContent || '');
            if (/\bplay_arrow\b|\bplay_circle\b|\bvideocam\b|\bsmart_display\b/.test(txt)) return true;
            // Duration badge like "0:08" / "1:23" only appears on video tiles.
            if (/\b\d{1,2}:\d{2}\b/.test(txt)) return true;
            return false;
        }

        function getDirectReferenceTileButton(img) {
            if (!img) return null;
            // Direct button ancestor
            const btn = img.closest('button, [role="button"]');
            if (btn) return btn;
            // Walk up to find a clickable tile container that has add/cancel/remove text
            let node = img.parentElement;
            for (let depth = 0; depth < 8 && node && node !== document.body; depth++, node = node.parentElement) {
                const txt = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const hasAction = txt.includes('add') || txt.includes('cancel') || txt.includes('remove') ||
                                  txt.includes('select') || txt.includes('deselect');
                const isClickable = node.getAttribute('role') === 'button' || node.getAttribute('role') === 'option' ||
                                    node.getAttribute('role') === 'gridcell' || node.getAttribute('tabindex') === '0' ||
                                    window.getComputedStyle(node).cursor === 'pointer';
                if (hasAction && isClickable) return node;
                // Also check for a child button with action text
                const childBtn = Array.from(node.querySelectorAll('button, [role="button"]')).find(b => {
                    const t = (b.innerText || b.textContent || '').toLowerCase();
                    return t.includes('add') || t.includes('cancel') || t.includes('remove') || t.includes('select');
                });
                if (childBtn) return childBtn;
            }
            // Last resort: return closest clickable ancestor
            return img.closest('[role="gridcell"], [role="option"], [tabindex="0"], a') || null;
        }

        function findAssetSelectionButtonUnderTile(img) {
            if (!img) return null;
            const hash = 'b73dfade-9ce';
            const container = img.closest('[role="gridcell"]') || img.parentElement?.parentElement || img.parentElement;
            if (!container) return null;

            // 1. Search buttons by a known hash such as b73dfade-9ce.
            const hashBtn = container.querySelector(`[class*="${hash}"], [id*="${hash}"]`);
            if (hashBtn && hashBtn.tagName !== 'IMG') return hashBtn;

            // 2. Fallback: search pointer-like elements with add/select text.
            return Array.from(container.querySelectorAll('button, [role="button"], div, span')).find(el => {
                const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                const isPointer = window.getComputedStyle(el).cursor === 'pointer';
                const keywords = ['add', 'select', '+', '추가', '선택'];
                const matches = keywords.some(k => txt.includes(k) || aria.includes(k));
                return matches && isPointer && el.tagName !== 'IMG';
            }) || getDirectReferenceTileButton(img);
        }

        function getReferenceTileAction(button) {
            if (!button) return '';
            const text = (button.innerText || button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
            const ariaPressed = button.getAttribute('aria-pressed');
            const ariaSelected = button.getAttribute('aria-selected');
            const dataState = button.getAttribute('data-state');
            const combined = `${text} ${ariaLabel}`;

            // Check child buttons too (tile container case)
            const childBtns = Array.from(button.querySelectorAll?.('button, [role="button"]') || []);
            const childText = childBtns.map(b => (b.innerText || b.textContent || '').toLowerCase()).join(' ');
            const allText = `${combined} ${childText}`;

            // Detect "selected/added" state
            if (allText.includes('cancel') || allText.includes('remove') || allText.includes('deselect') ||
                allText.includes('selected') || allText.includes('added') ||
                ariaPressed === 'true' || ariaSelected === 'true' || dataState === 'active' || dataState === 'checked') {
                return 'selected';
            }
            // Detect "available to add" state
            if (allText.includes('add') || allText.includes('select') || allText.includes('+') ||
                ariaPressed === 'false' || ariaSelected === 'false') {
                return 'add';
            }
            return '';
        }

        function sortReferenceImagesBySelectionState(images = []) {
            return [...images].sort((a, b) => {
                const aState = getReferenceTileAction(getDirectReferenceTileButton(a));
                const bState = getReferenceTileAction(getDirectReferenceTileButton(b));
                const rank = (state) => state === 'selected' ? 0 : state === 'add' ? 1 : 2;
                return rank(aState) - rank(bState);
            });
        }

        function getAnyVisibleSelectedReferenceButton(scope = document) {
            return Array.from(scope.querySelectorAll('button'))
                .filter(btn => btn && btn.offsetParent !== null)
                .find((btn) => {
                    const text = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                    if (!text.includes('cancel')) return false;
                    const img = btn.querySelector('img[src*="getMediaUrlRedirect"]');
                    const alt = (img?.getAttribute('alt') || '').toLowerCase();
                    return !!img && alt.includes('present in your collection');
                }) || null;
        }

        function hasSelectedReferenceTile(panel, normalizedTargetName, assetSrc = '', assetLabel = '', matchOptions = {}) {
            const imgs = getReferencePanelAssetImages(panel);
            return imgs.some((img) => {
                if (!referenceImageMatchesTarget(img, normalizedTargetName, assetSrc, assetLabel, matchOptions)) return false;
                const btn = getDirectReferenceTileButton(img);
                return getReferenceTileAction(btn) === 'selected';
            });
        }

        function getMatchingCollectionReferenceImages(panel, normalizedTargetName, assetSrc = '', assetLabel = '', matchOptions = {}) {
            const imgs = getReferencePanelAssetImages(panel).filter(isCollectionReferenceImage);
            return sortReferenceImagesBySelectionState(
                imgs.filter((img) => referenceImageMatchesTarget(img, normalizedTargetName, assetSrc, assetLabel, matchOptions))
            );
        }

        function filterExcludedReferenceImages(images = [], excludeImageKeys = new Set()) {
            if (!(excludeImageKeys instanceof Set) || excludeImageKeys.size === 0) return images;
            return images.filter((img) => {
                const key = getReferenceImageStableKey(img);
                return !key || !excludeImageKeys.has(key);
            });
        }

        function findAnySelectedReferenceTile(panel) {
            const scope = (panel && panel.isConnected) ? panel : document;
            const imgs = Array.from(scope.querySelectorAll('img')).filter(img =>
                img.src?.includes('getMediaUrlRedirect')
            );
            return imgs.find((img) => {
                const btn = getDirectReferenceTileButton(img);
                return getReferenceTileAction(btn) === 'selected';
            }) || null;
        }

        function findSelectedReferenceTileByTarget(targetName = '', assetSrc = '', scope = document, assetLabel = '', matchOptions = {}) {
            const imgs = Array.from(scope.querySelectorAll('img')).filter(img =>
                getImageRuntimeSrc(img).includes('getMediaUrlRedirect') && !isPromptComposerAttachedImage(img)
            );
            return imgs.find((img) => {
                if (!referenceImageMatchesTarget(img, targetName, assetSrc, assetLabel, matchOptions)) return false;
                const btn = getDirectReferenceTileButton(img);
                return getReferenceTileAction(btn) === 'selected';
            }) || null;
        }

        async function verifyReferenceAssetSelected(asset, timeoutMs = 2500, matchOptions = {}) {
            const assetId = typeof asset === 'string' ? asset : (asset?.id || '');
            const assetSrc = typeof asset === 'object' ? (asset?.src || '') : '';
            const normalizedTargetName = assetId || tryParseAssetNameFromUrl(assetSrc);
            const start = Date.now();

            while (Date.now() - start < timeoutMs) {
                const selected = findSelectedReferenceTileByTarget(normalizedTargetName, assetSrc, document, '', matchOptions);
                if (selected) {
                    return { ok: true, assetId: normalizedTargetName || assetId || null };
                }
                const matchingSelectedButton = Array.from(document.querySelectorAll('button'))
                    .filter(btn => btn && btn.offsetParent !== null)
                    .find((btn) => {
                        const text = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        if (!text.includes('cancel')) return false;
                        const img = btn.querySelector('img[src*="getMediaUrlRedirect"]');
                        const name = img ? tryParseAssetNameFromUrl(img.src) : null;
                        return !!img && name === normalizedTargetName;
                    });
                if (matchingSelectedButton) {
                    return { ok: true, assetId: normalizedTargetName || assetId || null };
                }
                await new Promise(r => setTimeout(r, 200));
            }

            const anySelected = getAnyVisibleSelectedReferenceButton(document);
            const selectedImg = anySelected?.querySelector?.('img[src*="getMediaUrlRedirect"]') || null;
            const selectedName = selectedImg ? tryParseAssetNameFromUrl(selectedImg.src) : null;
            return {
                ok: false,
                error: `Selected start image did not match target. target=${normalizedTargetName || assetId || 'unknown'} selected=${selectedName || 'none'}`
            };
        }

        function findMediaPanelFromUploadButton() {
            const uploadBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => {
                const txt = (b.textContent || b.innerText || '').toLowerCase();
                return txt.includes('upload image') || txt.includes('upload video') || txt.includes('upload media');
            });
            if (!uploadBtn) return null;

            let node = uploadBtn.parentElement;
            while (node && node !== document.body) {
                const hasMediaImages = node.querySelectorAll('img[src*="getMediaUrlRedirect"]').length > 0;
                if (hasMediaImages) return node;
                node = node.parentElement;
            }
            return null;
        }

        function getVisibleReferenceTabs(scope = document) {
            const tabKeywords = ['project', 'generation', 'recent', 'asset', 'assets', 'gallery', 'library', 'all'];
            return Array.from(scope.querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"]'))
                .filter((el) => isVisibleElement(el))
                .filter((el) => {
                    if (el.querySelector('img')) return false;
                    const txt = (el.textContent || el.innerText || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    if (!txt) return false;
                    return tabKeywords.some((k) => txt.includes(k));
                });
        }

        function findMediaPanelFromCollectionButtons() {
            const collectionButtons = Array.from(document.querySelectorAll('button'))
                .filter(btn => btn && btn.offsetParent !== null)
                .filter((btn) => {
                    const img = btn.querySelector('img[src*="getMediaUrlRedirect"]');
                    const alt = (img?.getAttribute('alt') || '').toLowerCase();
                    return !!img && alt.includes('present in your collection');
                });

            if (!collectionButtons.length) return null;

            const scopedAncestor = (btn) => {
                let node = btn.parentElement;
                while (node && node !== document.body) {
                    const mediaButtonCount = node.querySelectorAll('button img[src*="getMediaUrlRedirect"]').length;
                    if (mediaButtonCount >= 1) return node;
                    node = node.parentElement;
                }
                return null;
            };

            for (const btn of collectionButtons) {
                const ancestor = scopedAncestor(btn);
                if (ancestor) return ancestor;
            }

            return collectionButtons[0]?.parentElement || null;
        }

        function findMediaPanelFromTabs() {
            const tabBtn = getVisibleReferenceTabs(document)[0] || null;
            if (!tabBtn) return null;

            let node = tabBtn.parentElement;
            for (let depth = 0; depth < 12 && node && node !== document.body; depth++) {
                // If it contains a large scrollable area or image wrapper, it's likely the panel
                if (node.getAttribute('role') === 'dialog' || node.tagName === 'DIALOG' || window.getComputedStyle(node).position === 'fixed') {
                    return node;
                }
                node = node.parentElement;
            }
            
            // Fallback: Just return a close ancestor if no explicit dialog role is found
            return tabBtn.parentElement?.parentElement?.parentElement || null;
        }

        function getMediaPickerKindControls(scope = document) {
            return Array.from(scope.querySelectorAll('[role="menuitem"], [role="option"], button, [role="button"]'))
                .filter((el) => isVisibleElement(el))
                .filter((el) => !el.querySelector('img'))
                .filter((el) => {
                    const txt = normalizeText(`${el.innerText || el.textContent || ''} ${el.getAttribute?.('aria-label') || ''} ${el.getAttribute?.('title') || ''}`);
                    const icon = (el.querySelector('i, .material-icons, .google-symbols')?.textContent || '').trim().toLowerCase();
                    if (txt.includes('date') || txt.includes('calendar') || txt.includes('schedule') || icon.includes('calendar') || icon.includes('event')) {
                        return false;
                    }
                    return icon === 'dashboard' ||
                        icon === 'image' ||
                        icon === 'videocam' ||
                        icon === 'accessibility_new' ||
                        icon === 'drive_folder_upload' ||
                        txt === 'all' ||
                        txt === 'images' ||
                        txt === 'characters' ||
                        txt === 'uploads' ||
                        txt.includes('imageimages') ||
                        txt.includes('accessibility_newcharacters') ||
                        txt.includes('upload media') ||
                        txt.includes('upload image') ||
                        txt.includes('assets');
                });
        }

        function isAddToPromptMediaPanel(node) {
            if (!node || !node.isConnected || !isVisibleElement(node)) return false;
            const text = normalizeText(node.innerText || node.textContent || '');
            const role = (node.getAttribute('role') || '').toLowerCase();
            const hasPromptPanelTitle = text.includes('add to prompt') 
                || text.includes('list of media items to add to prompt')
                || text.includes('프롬프트에 추가')
                || text.includes('프롬프트 추가');
            const hasSearchAssets = !!node.querySelector(
                'input[aria-label*="search" i], input[placeholder*="search" i], input[aria-label*="검색" i], input[placeholder*="검색" i]'
            );
            const hasUploadMedia = Array.from(node.querySelectorAll('button, [role="button"]')).some((btn) => {
                const txt = normalizeText(`${btn.innerText || btn.textContent || ''} ${btn.getAttribute?.('aria-label') || ''}`);
                return txt.includes('upload media') 
                    || txt.includes('upload image')
                    || txt.includes('upload video')
                    || txt.includes('upload')
                    || txt.includes('업로드')
                    || txt.includes('미디어 추가')
                    || txt.includes('이미지 추가')
                    || txt.includes('미디어 업로드')
                    || txt.includes('이미지 업로드');
            });
            const hasKindDropdown = Array.from(node.querySelectorAll('button, [role="button"]')).some((btn) => {
                const txt = normalizeText(`${btn.innerText || btn.textContent || ''} ${btn.getAttribute?.('aria-label') || ''}`);
                const icon = (btn.querySelector('i, .material-icons, .google-symbols')?.textContent || '').trim().toLowerCase();
                return icon === 'dashboard' 
                    || txt.includes('all arrow_drop_down') 
                    || txt === 'all'
                    || txt === '전체'
                    || txt.includes('전체 arrow_drop_down');
            });
            const hasMediaOptions = node.querySelectorAll('[role="option"] img, [role="option"], img[src*="getMediaUrlRedirect"]').length > 0;
            const isDialogLike = role === 'dialog' || node.tagName === 'DIALOG' || window.getComputedStyle(node).position === 'fixed';

            // Do not allow the project gallery/sidebar to masquerade as the prompt picker.
            // The real compact picker has Add-to-Prompt wording, or Search assets + Upload media
            // controls inside a dialog-like container.
            return hasPromptPanelTitle ||
                (isDialogLike && hasSearchAssets && hasUploadMedia) ||
                (isDialogLike && hasKindDropdown && hasMediaOptions && (hasSearchAssets || hasUploadMedia));
        }

        function scoreMediaPanelCandidate(node) {
            if (!node || !node.isConnected || !isVisibleElement(node)) return -1;
            if (!isAddToPromptMediaPanel(node)) return -1;
            const text = (node.innerText || node.textContent || '').toLowerCase();
            const style = window.getComputedStyle(node);
            let score = 0;

            score += 100;
            if (node.getAttribute('role') === 'dialog' || node.tagName === 'DIALOG') score += 40;
            if (node.matches?.('[data-radix-menu-content], [data-radix-dropdown-menu-content], [data-radix-popper-content-wrapper]')) score += 30;
            if (style.position === 'fixed' || style.position === 'absolute') score += 12;

            const uploadBtns = Array.from(node.querySelectorAll('button, [role="button"]'))
                .filter((btn) => isVisibleElement(btn))
                .filter((btn) => {
                    const txt = (btn.innerText || btn.textContent || '').toLowerCase();
                    return txt.includes('upload image') || txt.includes('upload video') || txt.includes('upload media') || txt.includes('upload')
                        || txt.includes('업로드') || txt.includes('이미지 추가') || txt.includes('미디어 추가');
                });
            if (uploadBtns.length > 0) score += 28;

            const tabs = getVisibleReferenceTabs(node);
            if (tabs.length > 0) score += Math.min(28, tabs.length * 8);

            const mediaKindControls = getMediaPickerKindControls(node);
            if (mediaKindControls.length > 0) score += Math.min(36, mediaKindControls.length * 9);

            const collectionButtons = Array.from(node.querySelectorAll('button'))
                .filter((btn) => isVisibleElement(btn))
                .filter((btn) => {
                    const img = btn.querySelector('img[src*="getMediaUrlRedirect"]');
                    if (!img) return false;
                    const t = (btn.innerText || btn.textContent || '').toLowerCase();
                    return t.includes('add') || t.includes('cancel') || t.includes('select')
                        || t.includes('추가') || t.includes('취소') || t.includes('선택');
                });
            if (collectionButtons.length > 0) score += Math.min(40, collectionButtons.length * 4);

            const imgs = node.querySelectorAll('img[src*="getMediaUrlRedirect"]').length;
            if (imgs > 0) score += Math.min(20, imgs);

            if (text.includes('upload') && text.includes('asset')) score += 10;
            const hasMediaCue = uploadBtns.length > 0 ||
                tabs.length > 0 ||
                mediaKindControls.length > 0 ||
                collectionButtons.length > 0 ||
                imgs > 0 ||
                (text.includes('upload') && (text.includes('asset') || text.includes('media') || text.includes('image'))) ||
                (text.includes('업로드') && (text.includes('에셋') || text.includes('미디어') || text.includes('이미지')));
            if (!hasMediaCue) return -1;
            return score;
        }

        function findBestMediaPanelCandidate() {
            const roots = [];
            const push = (node) => {
                if (!node || !node.isConnected || roots.includes(node)) return;
                roots.push(node);
            };

            [
                findMediaPanelFromUploadButton(),
                findMediaPanelFromCollectionButtons(),
                findMediaPanelFromTabs()
            ].forEach(push);

            Array.from(document.querySelectorAll(
                '[role="dialog"], dialog, [data-radix-menu-content], [data-radix-dropdown-menu-content], [data-radix-popper-content-wrapper], [data-state="open"]'
            )).forEach(push);

            const tabButtons = getVisibleReferenceTabs(document);
            for (const tab of tabButtons) {
                let node = tab.parentElement;
                for (let depth = 0; depth < 10 && node && node !== document.body; depth++, node = node.parentElement) {
                    push(node);
                }
            }

            const scored = roots
                .map((node) => ({ node, score: scoreMediaPanelCandidate(node) }))
                .filter((item) => item.score >= 35)
                .sort((a, b) => b.score - a.score);

            return scored[0]?.node || null;
        }

        async function waitForMediaPanelOpen(timeoutMs = 5000) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                const panel = findBestMediaPanelCandidate();
                if (panel) return panel;
                await new Promise(r => setTimeout(r, 200));
            }
            return null;
        }

        async function waitForMatchingCollectionAssetButton(panel, normalizedTargetName, assetSrc, assetLabel = '', timeoutMs = 10000) {
            const start = Date.now();
            const normalizedLabel = normalizeText(assetLabel);
            const hasStrongIdentity = !!(normalizedTargetName || assetSrc);

            const findScrollable = () => {
                if (!panel || !panel.isConnected) return null;
                const candidates = Array.from(panel.querySelectorAll('div, ul, main')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.overflowY === 'auto' || style.overflowY === 'scroll';
                });
                candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
                return candidates[0] || panel;
            };

            let lastScrollTime = 0;
            let scrollStep = 0;

            while (Date.now() - start < timeoutMs) {
                const collectionImgs = sortReferenceImagesBySelectionState(
                    getReferencePanelAssetImages(panel).filter(isCollectionReferenceImage).filter((img) => !isVideoReferenceTile(img))
                );
                const matchingImgs = collectionImgs.filter((img) => {
                    const imgName = tryParseAssetNameFromUrl(img.src);
                    const imgSrc = getCanonicalAssetUrl(img.src);
                    const looseLabelMatch = !hasStrongIdentity && normalizedLabel
                        && strictLabelMatch(getReferenceTileText(img), assetLabel);
                    return (normalizedTargetName && imgName === normalizedTargetName)
                        || (assetSrc && imgSrc === getCanonicalAssetUrl(assetSrc))
                        || looseLabelMatch;
                }).sort((a, b) => {
                    // Exact tile-text match comes before partial/word-boundary matches.
                    // e.g. searching "tom": tile "tom" ranks before "tom is rick".
                    const norm = normalizedLabel;
                    const aExact = normalizeText(getReferenceTileText(a)) === norm ? 0 : 1;
                    const bExact = normalizeText(getReferenceTileText(b)) === norm ? 0 : 1;
                    return aExact - bExact;
                });

                if (matchingImgs.length > 0) {
                    const selectedImg = matchingImgs.find((img) => getReferenceTileAction(getDirectReferenceTileButton(img)) === 'selected');
                    if (selectedImg) {
                        return {
                            state: 'selected',
                            button: getDirectReferenceTileButton(selectedImg),
                            assetCount: collectionImgs.length
                        };
                    }

                    const addImg = matchingImgs.find((img) => getReferenceTileAction(getDirectReferenceTileButton(img)) === 'add');
                    if (addImg) {
                        return {
                            state: 'add',
                            button: getDirectReferenceTileButton(addImg),
                            assetCount: collectionImgs.length
                        };
                    }

                    return {
                        state: 'unknown',
                        button: getDirectReferenceTileButton(matchingImgs[0]),
                        assetCount: collectionImgs.length
                    };
                }

                const now = Date.now();
                if (now - lastScrollTime > 800) {
                    lastScrollTime = now;
                    const scrollEl = findScrollable();
                    if (scrollEl) {
                        scrollStep += 320;
                        scrollEl.scrollTop = scrollStep;
                    }
                }

                await new Promise(r => setTimeout(r, 220));
            }

            const lastSeen = getReferencePanelAssetImages(panel).filter(isCollectionReferenceImage);
            const availableNames = lastSeen
                .map(img => tryParseAssetNameFromUrl(img.src))
                .filter(Boolean)
                .slice(0, 8)
                .join(', ');
            return {
                state: 'missing',
                button: null,
                assetCount: lastSeen.length,
                debug: `Target=${normalizedTargetName || 'none'}; src=${getCanonicalAssetUrl(assetSrc) || 'none'}; available=${availableNames || 'none'}`
            };
        }

        async function waitForCollectionAssetSelected(panel, normalizedTargetName, assetSrc, timeoutMs = 4500) {
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                const match = await waitForMatchingCollectionAssetButton(panel, normalizedTargetName, assetSrc, '', 350);
                if (match.state === 'selected') return true;
                await new Promise(r => setTimeout(r, 180));
            }
            return false;
        }

        function stripFeId(str) {
            const s = String(str || '');
            if (s.startsWith('fe_id_')) return s.slice(6);
            if (s.startsWith('FE_ID_')) return s.slice(6);
            return s;
        }

        function getAssetIdentityTokens(value = '') {
            const raw = stripFeId(value).trim().toLowerCase();
            if (!raw) return [];
            const out = new Set([raw]);
            if (raw.length >= 12) out.add(raw.slice(0, 12));
            if (raw.length >= 12) out.add(raw.slice(-12));
            if (raw.length >= 8) out.add(raw.slice(0, 8));
            if (raw.length >= 8) out.add(raw.slice(-8));
            return Array.from(out);
        }

        function getReferenceImageIdentityCandidates(img) {
            const container = img?.closest?.('[data-tile-id], [data-item-index], [data-asset-id], [role="gridcell"], [data-id], [data-media-id], button, [role="button"], a');
            const imgSrcRaw = getImageRuntimeSrc(img);
            const candidates = [
                tryParseAssetNameFromUrl(imgSrcRaw),
                img?.getAttribute?.('data-asset-id') || '',
                img?.getAttribute?.('data-id') || '',
                img?.getAttribute?.('data-media-id') || '',
                img?.getAttribute?.('name') || '',
                img?.getAttribute?.('title') || '',
                container?.getAttribute?.('data-tile-id') || '',
                container?.getAttribute?.('data-id') || '',
                container?.getAttribute?.('data-asset-id') || '',
                container?.getAttribute?.('data-media-id') || '',
                container?.getAttribute?.('data-item-index') || ''
            ].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);

            const out = new Set();
            for (const val of candidates) {
                getAssetIdentityTokens(val).forEach((token) => out.add(token));
            }
            return Array.from(out);
        }

        function getReferenceImageStableKey(img) {
            if (!img) return '';
            const srcRaw = getImageRuntimeSrc(img);
            const parsedName = tryParseAssetNameFromUrl(srcRaw) || getMediaNameParam(srcRaw);
            if (parsedName) return `id:${String(parsedName).toLowerCase()}`;

            const canonicalSrc = getCanonicalAssetUrl(srcRaw);
            if (canonicalSrc) return `src:${String(canonicalSrc).toLowerCase()}`;

            const tokens = getReferenceImageIdentityCandidates(img);
            if (tokens.length > 0) return `tok:${tokens[0]}`;

            const fallbackText = normalizeText(getReferenceTileText(img)).slice(0, 80);
            return fallbackText ? `txt:${fallbackText}` : '';
        }

        function strictLabelMatch(tileText = '', assetLabel = '') {
            const normalizedLabel = normalizeText(assetLabel);
            if (!normalizedLabel || normalizedLabel.length < 2) return false;

            // getReferenceTileText() walks up to 5 ancestor levels, which for an
            // UN-named tile returns its full generation-prompt caption (e.g.
            // "porsche macan luxury commercial video") rather than a short name.
            // A plain "label appears as a whole word somewhere in the tile text"
            // check therefore matched ANY tile whose auto-generated prompt
            // happened to contain the searched name as an ordinary word (e.g.
            // searching a custom-named asset "macan" matched an unrelated
            // "Porsche Macan luxury commercial" video, since "macan" is a whole
            // word there too). A custom Save-As name is rendered as the tile's
            // *entire* caption, with only Flow's own "Image"/"Video" type badge
            // appended — so require the tile text to equal the label once that
            // trailing badge word is stripped, instead of merely containing it.
            // Also strip trailing tile-action words that the ancestor-walk in
            // getReferenceTileText() can pick up alongside the caption (e.g. an
            // "Add"/"Remove" button label within the same tile), so a real
            // custom-named tile still matches exactly despite that extra noise.
            let normalizedTile = normalizeText(tileText)
                .replace(/\s+(image|video)$/, '')
                .replace(/\s+(add|remove|cancel|select|deselect|selected)$/, '')
                .trim();
            // getReferenceTileText() collects the img's alt/aria-label/title
            // AND the container's own visible caption text, which for most
            // tiles are the same string rendered twice ("macan" alt + "macan"
            // caption) — producing "macan macan" after concatenation. Collapse
            // an exact "X X" self-repeat down to "X" before comparing.
            const half = normalizedTile.length > 0 && normalizedTile.length % 2 === 1
                ? (normalizedTile.length - 1) / 2
                : -1;
            if (half > 0 && normalizedTile[half] === ' '
                && normalizedTile.slice(0, half) === normalizedTile.slice(half + 1)) {
                normalizedTile = normalizedTile.slice(0, half);
            }
            return normalizedTile === normalizedLabel;
        }

        // Extract the ?name= param value from a getMediaUrlRedirect URL.
        function getMediaNameParam(url = '') {
            if (!url) return null;
            try {
                const parsed = new URL(url, location.href);
                return parsed.searchParams.get('name') || null;
            } catch { return null; }
        }

        function getImageRuntimeSrc(img) {
            return String(
                img?.currentSrc ||
                img?.src ||
                img?.getAttribute?.('src') ||
                img?.getAttribute?.('data-src') ||
                ''
            ).trim();
        }

        function hasStableReferenceTarget(targetName = '', assetSrc = '') {
            const target = String(targetName || '').trim();
            const src = String(assetSrc || '').trim();
            return !!(
                getMediaNameParam(src) ||
                tryParseAssetNameFromUrl(src) ||
                extractUuidFromUrl(src) ||
                extractUuidFromUrl(target) ||
                getCanonicalAssetUrl(src) ||
                (target.length >= 8 && /^[a-f0-9-]+$/i.test(target))
            );
        }

        function referenceImageMatchesTarget(img, targetName, assetSrc = '', assetLabel = '', options = {}) {
            targetName = stripFeId(targetName);
            assetSrc = stripFeId(assetSrc);
            const imgSrcRaw = getImageRuntimeSrc(img);
            const requireStrongIdentity = !!options?.requireStrongIdentity;
            const disableLabelFallback = !!options?.disableLabelFallback || requireStrongIdentity;

            if (requireStrongIdentity && !hasStableReferenceTarget(targetName, assetSrc)) {
                return false;
            }

            // 0. Direct ?name= param match (primary strategy for getMediaUrlRedirect URLs)
            //    Both sides must have a UUID-like name param for this to fire.
            const imgNameParam = getMediaNameParam(imgSrcRaw);
            if (imgNameParam) {
                // Build candidate IDs from the stored asset
                const candidateIds = [];
                if (targetName) candidateIds.push(targetName.toLowerCase());
                const storedNameParam = getMediaNameParam(assetSrc);
                if (storedNameParam) candidateIds.push(storedNameParam.toLowerCase());

                const imgNameLower = imgNameParam.toLowerCase();
                for (const cid of candidateIds) {
                    if (!cid || cid.length < 8) continue;
                    // Full match
                    if (imgNameLower === cid) return true;
                    // Prefix match (first 8 chars of UUID is enough to uniquely identify)
                    if (imgNameLower.startsWith(cid.slice(0, 8)) || cid.startsWith(imgNameLower.slice(0, 8))) return true;
                }
            }

            // Build the set of identity strings from the stored asset
            const identifiers = new Set();
            if (targetName && !targetName.startsWith('__MENTION__')) identifiers.add(targetName.toLowerCase());
            const parsedName = tryParseAssetNameFromUrl(assetSrc);
            if (parsedName) identifiers.add(parsedName.toLowerCase());
            const targetUuid = extractUuidFromUrl(assetSrc) || (targetName && !targetName.startsWith('__MENTION__') && extractUuidFromUrl(targetName));
            if (targetUuid) identifiers.add(targetUuid.toLowerCase());

            // 1. Raw URL substring check
            if (identifiers.size > 0) {
                const imgSrcLower = imgSrcRaw.toLowerCase();
                for (const id of identifiers) {
                    if (id.length >= 8 && imgSrcLower.includes(id)) return true;
                }
            }

            // 2. Token-based identity matching
            const targetTokens = new Set([
                ...getAssetIdentityTokens(targetName),
                ...getAssetIdentityTokens(parsedName || '')
            ]);
            const candidateTokens = getReferenceImageIdentityCandidates(img);
            if (targetTokens.size > 0 && candidateTokens.some((token) => targetTokens.has(token))) {
                return true;
            }

            // 3. Canonical URL comparison
            const normalizedSrc = getCanonicalAssetUrl(assetSrc);
            if (normalizedSrc) {
                const imgSrc = getCanonicalAssetUrl(imgSrcRaw);
                if (imgSrc && imgSrc === normalizedSrc) return true;
            }

            // 4. Label text fallback
            // Use label matching only when we do not have any stable identity token.
            if (identifiers.size > 0 || targetTokens.size > 0 || normalizedSrc) {
                return false;
            }
            return !disableLabelFallback && strictLabelMatch(getReferenceTileText(img), assetLabel);
        }

        async function waitForReferencePanelAsset(panel, targetName, assetSrc, assetLabel = '', timeoutMs = 120000, options = {}) {
            const start = Date.now();
            const normalizedLabel = normalizeText(assetLabel);
            const normalizedSrc = getCanonicalAssetUrl(assetSrc);
            const effectiveTarget = targetName || tryParseAssetNameFromUrl(assetSrc) || '';
            const targetTokens = getAssetIdentityTokens(effectiveTarget);
            const excludeImageKeys = options?.excludeImageKeys instanceof Set ? options.excludeImageKeys : new Set();
            const matchOptions = options?.matchOptions || options || {};

            console.log(`[AssetLook] Lookup start: id="${effectiveTarget || 'none'}", label="${assetLabel || 'none'}"`);

            const findScrollable = () => {
                const roots = Array.from(document.querySelectorAll(
                    'div, ul, main, section, [role="dialog"], [data-radix-popper-content-wrapper], [data-radix-dropdown-menu-content], [data-state="open"]'
                ));
                const docScroller = document.scrollingElement || document.documentElement || document.body;
                if (docScroller) roots.push(docScroller);
                if (panel && panel.isConnected) roots.push(panel);

                const panelRect = panel?.getBoundingClientRect?.() || null;
                const viewportCenter = { x: (window.innerWidth || 0) / 2, y: (window.innerHeight || 0) / 2 };
                const seen = new Set();
                const candidates = [];

                for (const el of roots) {
                    if (!el || seen.has(el) || !el.isConnected) continue;
                    seen.add(el);
                    if (el.closest?.('[data-slate-editor="true"], [data-lexical-editor="true"], [role="textbox"][aria-multiline="true"]')) continue;

                    const rect = el.getBoundingClientRect?.();
                    if (!rect || rect.width <= 0 || rect.height <= 0) continue;
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') continue;

                    const overflowY = style.overflowY;
                    const canScroll = el.scrollHeight > el.clientHeight + 20;
                    const mayWheelScroll = ['auto', 'scroll', 'overlay', 'hidden'].includes(overflowY) && rect.height > 120;
                    if (!canScroll && !mayWheelScroll) continue;

                    const containsPanel = !!(panel && (el === panel || el.contains(panel) || panel.contains(el)));
                    const overlapsPanel = !!(panelRect &&
                        rect.left <= panelRect.right &&
                        rect.right >= panelRect.left &&
                        rect.top <= panelRect.bottom &&
                        rect.bottom >= panelRect.top);
                    const mediaImages = getReferencePanelAssetImages(el).length;
                    const mediaControls = typeof getMediaPickerKindControls === 'function'
                        ? getMediaPickerKindControls(el).length
                        : 0;
                    const centerDistance = Math.abs((rect.left + rect.width / 2) - viewportCenter.x)
                        + Math.abs((rect.top + rect.height / 2) - viewportCenter.y);

                    // Flow's asset library is a virtualized list — scrolling the
                    // wrong container (e.g. the page) does nothing to it, since
                    // it only loads more rows in response to a scroll event on
                    // its own scroller element. Heavily favor that element so
                    // it always wins over generic overflow containers.
                    const isVirtuosoScroller = el.matches?.('[data-testid="virtuoso-item-list"], [data-virtuoso-scroller="true"], .virtuoso-scroller')
                        || !!el.closest?.('[data-testid="virtuoso-item-list"]');

                    let score = 0;
                    if (isVirtuosoScroller) score += 200;
                    if (containsPanel) score += 120;
                    if (overlapsPanel) score += 80;
                    if (mediaImages > 0) score += Math.min(80, mediaImages * 8);
                    if (mediaControls > 0) score += Math.min(60, mediaControls * 10);
                    if (canScroll) score += 50;
                    if (style.position === 'fixed' || style.position === 'absolute') score += 15;
                    score += Math.min(30, rect.height / 20);
                    score -= Math.min(60, centerDistance / 20);
                    candidates.push({ el, score, canScroll, mediaImages, mediaControls });
                }

                candidates.sort((a, b) => b.score - a.score);
                if (candidates[0]) {
                    const chosen = candidates[0];
                    console.log('[AssetLook] Scroll target selected:', {
                        tag: chosen.el.tagName,
                        score: Math.round(chosen.score),
                        scrollTop: Math.round(chosen.el.scrollTop || 0),
                        scrollHeight: chosen.el.scrollHeight,
                        clientHeight: chosen.el.clientHeight,
                        mediaImages: chosen.mediaImages,
                        mediaControls: chosen.mediaControls
                    });
                    return chosen.el;
                }

                if (docScroller && docScroller.scrollHeight > docScroller.clientHeight + 20) return docScroller;
                return panel && panel.isConnected ? panel : null;
            };

            const getScrollTop = (el) => {
                if (!el) return 0;
                if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
                    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
                }
                return el.scrollTop || 0;
            };

            const getScrollMetrics = (el) => {
                if (!el) return { top: 0, clientHeight: 0, scrollHeight: 0 };
                if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
                    const doc = document.scrollingElement || document.documentElement;
                    return {
                        top: getScrollTop(el),
                        clientHeight: window.innerHeight || doc.clientHeight || 0,
                        scrollHeight: doc.scrollHeight || 0
                    };
                }
                return {
                    top: el.scrollTop || 0,
                    clientHeight: el.clientHeight || 0,
                    scrollHeight: el.scrollHeight || 0
                };
            };

            const scrollDown = (el, delta) => {
                if (!el) return 0;
                const dispatchWheel = (target) => {
                    try {
                        target.dispatchEvent(new WheelEvent('wheel', {
                            bubbles: true,
                            cancelable: true,
                            deltaY: delta,
                            deltaMode: 0,
                            clientX: Math.min(window.innerWidth - 20, Math.max(20, (target.getBoundingClientRect?.().left || 0) + 20)),
                            clientY: Math.min(window.innerHeight - 20, Math.max(20, (target.getBoundingClientRect?.().top || 0) + 20))
                        }));
                    } catch (e) { }
                };
                dispatchWheel(el);
                if (el === document.scrollingElement || el === document.documentElement || el === document.body) {
                    window.scrollBy(0, delta);
                    return getScrollTop(el);
                }
                const before = el.scrollTop || 0;
                el.scrollTop = (el.scrollTop || 0) + delta;
                if ((el.scrollTop || 0) === before) {
                    try { el.scrollBy?.({ top: delta, left: 0, behavior: 'auto' }); } catch (e) { }
                    dispatchWheel(document.body);
                    window.scrollBy(0, delta);
                }
                return el.scrollTop || 0;
            };

            let lastScrollTime = 0;
            let hasScrolledOnce = false;
            let lastImgCount = -1;
            const SCROLL_STEP_PX = 400;
            const LAZY_LOAD_WAIT_MS = 900; // wait after scroll for lazy images to appear
            const adjustedTimeout = timeoutMs;

            // Initial wait for panel to populate
            await new Promise(r => setTimeout(r, 800));

            let lastLoggedCount = -1;
            while (Date.now() - start < adjustedTimeout) {
                if (!panel || !panel.isConnected) {
                    const refreshed = findBestMediaPanelCandidate();
                    if (refreshed) panel = refreshed;
                }
                const assetImgs = getReferencePanelAssetImages(panel);
                const currentImgCount = assetImgs.length;

                // Log panel state when image count changes (for debugging)
                if (currentImgCount !== lastLoggedCount) {
                    lastLoggedCount = currentImgCount;
                    console.log(`[AssetLook] Panel images found: ${currentImgCount}`, {
                        target: effectiveTarget || 'none',
                        assetSrc: assetSrc?.slice(0, 80) || 'none',
                        panelSrcs: assetImgs.slice(0, 5).map(i => i.src.slice(0, 80))
                    });
                }

                lastImgCount = currentImgCount;

                const searchPool = sortReferenceImagesBySelectionState(assetImgs)
                    .filter((img) => !isVideoReferenceTile(img))
                    .filter((img) => {
                        const imgKey = getReferenceImageStableKey(img);
                        if (!imgKey) return true;
                        return !excludeImageKeys.has(imgKey);
                    });
                const targetImg = searchPool.find((img) =>
                    referenceImageMatchesTarget(img, effectiveTarget, assetSrc, assetLabel, matchOptions)
                ) || null;

                if (targetImg) {
                    console.log(`[AssetLook] Found target tile. pool=${currentImgCount}, src=${targetImg.src.slice(0, 80)}`);
                    return { targetImg, assetCount: currentImgCount };
                }

                const now = Date.now();
                const scrollDelay = !hasScrolledOnce ? 500 : LAZY_LOAD_WAIT_MS;
                if (now - lastScrollTime > scrollDelay) {
                    lastScrollTime = now;
                    hasScrolledOnce = true;
                    const scrollEl = findScrollable();
                    if (scrollEl) {
                        const metrics = getScrollMetrics(scrollEl);
                        const isAtBottom = Math.ceil(metrics.top + metrics.clientHeight) >= metrics.scrollHeight - 30;
                        if (!isAtBottom) {
                            const nextTop = scrollDown(scrollEl, SCROLL_STEP_PX);
                            console.log(`[AssetLook] Scrolled to ${Math.round(nextTop)}px, waiting for lazy-load...`);
                            // Give lazy-load time to kick in before next scan
                            await new Promise(r => setTimeout(r, LAZY_LOAD_WAIT_MS));
                            continue;
                        }
                    }
                }
                await new Promise(r => setTimeout(r, 250));
            }

            const fallbackImgs = getReferencePanelAssetImages(panel);
            const availableNames = fallbackImgs
                .map(img => tryParseAssetNameFromUrl(img.src))
                .filter(Boolean)
                .slice(0, 12)
                .join(', ');
            console.warn(`[AssetLook] Search timed out. Pool size: ${fallbackImgs.length}.`);
            return {
                targetImg: null,
                assetCount: fallbackImgs.length,
                debug: `Target=${effectiveTarget || 'none'}; src=${normalizedSrc || 'none'}; label=${normalizedLabel || 'none'}; tokens=${targetTokens.join('|') || 'none'}; available=${availableNames || 'none'}`
            };
        }

        function findOpenReferenceMediaPanel() {
            return findBestMediaPanelCandidate();
        }

        async function closeReferenceMediaPanelIfOpen() {
            const panel = findOpenReferenceMediaPanel();
            if (!panel || !panel.isConnected) return false;

            const isVisible = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect?.();
                if (!rect || rect.width <= 0 || rect.height <= 0) return false;
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            };
            const panelRect = panel.getBoundingClientRect?.() || { top: 0, right: window.innerWidth || 0 };
            const candidates = Array.from(panel.querySelectorAll('button, [role="button"]'))
                .filter(isVisible)
                .map((btn) => {
                    const text = `${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`.toLowerCase();
                    const rect = btn.getBoundingClientRect?.() || { top: 9999, right: 0, width: 0, height: 0 };
                    const iconText = (btn.querySelector('i, .material-icons, .google-symbols')?.textContent || '').trim().toLowerCase();
                    const isClose = text.includes('close') || text.includes('닫기') || text.includes('閉じる') || text.includes('关闭') || iconText === 'close';
                    const isDanger = text.includes('clear prompt') || text.includes('remove') || text.includes('delete') || text.includes('trash');
                    const isNearPanelTop = rect.top <= (panelRect.top || 0) + 96;
                    const isNearPanelRight = rect.right >= ((panelRect.right || window.innerWidth) - 144);
                    const insidePromptComposer = !!btn.closest('[data-slate-editor="true"], [data-lexical-editor="true"], [role="textbox"][aria-multiline="true"]');
                    const topRightScore = Math.max(0, 160 - Math.abs(rect.top - panelRect.top)) + Math.max(0, 160 - Math.abs((panelRect.right || window.innerWidth) - rect.right));
                    return {
                        btn,
                        isClose,
                        isDanger,
                        isSafePanelClose: isClose && !isDanger && !insidePromptComposer && isNearPanelTop && isNearPanelRight,
                        score: (isClose ? 1000 : 0) + topRightScore - (isDanger ? 2000 : 0)
                    };
                })
                .filter((item) => item.isSafePanelClose)
                .sort((a, b) => b.score - a.score);

            const closeBtn = candidates[0]?.btn || null;
            if (!closeBtn) return false;

            try {
                closeBtn.scrollIntoView?.({ block: 'center', inline: 'center' });
            } catch { }
            try {
                closeBtn.click();
            } catch {
                const r = closeBtn.getBoundingClientRect();
                const cx = r.x + r.width / 2;
                const cy = r.y + r.height / 2;
                closeBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0 }));
                closeBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0 }));
                closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0 }));
            }
            await new Promise(r => setTimeout(r, 500));
            return true;
        }

        // Google Flow buttons often have the Material icon name prepended to the visible label
        // in their textContent (e.g. "selectSelect", "checkDone"). Use endsWith to match them.
        function btnTextMatches(btn, ...labels) {
            const txt = (btn.innerText || btn.textContent || '').replace(/\s+/g, '').trim().toLowerCase();
            const aria = (btn.getAttribute('aria-label') || '').replace(/\s+/g, '').trim().toLowerCase();
            // Match exact/end labels and labels contained in text, e.g. "Select image" -> "select".
            return labels.some(label => {
                const l = String(label || '').replace(/\s+/g, '').trim().toLowerCase();
                if (!l) return false;
                return (
                    txt === l || txt.endsWith(l) || txt.includes(l) ||
                    aria === l || aria.endsWith(l) || aria.includes(l)
                );
            });
        }

        // When the user clicks an image tile, React may unmount the panel node and mount a fresh
        // viewer node.  The stored `panel` reference becomes detached (offsetParent === null for
        // all its descendants).  Fall back to a document-wide search so we still detect the viewer.
        function viewerScope(panel) {
            if (panel && panel.isConnected) return panel;
            return document; // panel was replaced by the viewer in the DOM
        }

        // Returns true when the viewer overlay is visible (Select + Back/Done buttons present).
        function isPanelInViewerMode(panel) {
            const scope = viewerScope(panel);
            const btns = Array.from(scope.querySelectorAll('button, [role="button"]'))
                .filter(b => b && b.offsetParent !== null);
            // Video viewers may show Add or Use buttons, so keep this filter broad.
            const hasSelect = btns.some(b => btnTextMatches(b, 'select', 'add', 'use', 'apply', 'insert', 'confirm', 'upload', '선택', '추가', '사용', '적용', '업로드', '확인'));
            const hasBackOrDone = btns.some(b => btnTextMatches(b, 'back', 'done', 'close', 'cancel', '완료', '뒤로', '취소', '닫기'));
            return hasSelect && hasBackOrDone;
        }

        function findViewerSelectButton(panel) {
            const scope = viewerScope(panel);
            return Array.from(scope.querySelectorAll('button, [role="button"]'))
                .filter(btn => btn && btn.offsetParent !== null)
                .find(btn => btnTextMatches(btn, 'select', 'add', 'use', 'apply', 'insert', '선택', '추가', '사용', '적용', '완료')) || null;
        }

        function findAddReferenceToPromptButton(panel) {
            const scopes = [];
            if (panel && panel.isConnected) scopes.push(panel);
            scopes.push(document);

            const seen = new Set();
            for (const scope of scopes) {
                const candidates = Array.from(scope.querySelectorAll('button, [role="button"]'))
                    .filter((btn) => {
                        if (!btn || seen.has(btn)) return false;
                        seen.add(btn);
                        if (btn.offsetParent === null && window.getComputedStyle(btn).position !== 'fixed') return false;
                        if (btn.querySelector('img, video, canvas')) return false;
                        return true;
                    });

                const explicit = candidates.find((btn) =>
                    btnTextMatches(
                        btn,
                        'add to prompt',
                        'add selected to prompt',
                        'add images to prompt',
                        'add image to prompt',
                        'add media to prompt',
                        'insert into prompt',
                        'use in prompt',
                        '프롬프트에 추가',
                        '프롬프트 추가'
                    )
                );
                if (explicit) return explicit;

                const footerLike = candidates
                    .map((btn) => {
                        const rect = btn.getBoundingClientRect();
                        const text = `${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''}`.toLowerCase();
                        const score =
                            (text.includes('prompt') ? 6 : 0) +
                            (text.includes('add') || text.includes('insert') || text.includes('use') || text.includes('추가') ? 4 : 0) +
                            (rect.top > window.innerHeight * 0.55 ? 2 : 0);
                        return { btn, score };
                    })
                    .filter(({ score }) => score >= 8)
                    .sort((a, b) => b.score - a.score);
                if (footerLike[0]?.btn) return footerLike[0].btn;
            }

            return null;
        }

        async function commitReferenceSelectionToPrompt(panel, fireAt, { required = false } = {}) {
            for (let attempt = 0; attempt < 12; attempt++) {
                const button = findAddReferenceToPromptButton(panel);
                if (button) {
                    const disabled = button.disabled
                        || button.getAttribute('aria-disabled') === 'true'
                        || button.getAttribute('data-disabled') === 'true';
                    if (disabled) {
                        await new Promise(r => setTimeout(r, 250));
                        continue;
                    }

                    console.log(`[ReferenceAsset] Clicking "${(button.innerText || button.textContent || button.getAttribute('aria-label') || '').trim()}" to add reference to prompt.`);
                    // Flow's "Add to prompt" button is a React component that ignores
                    // synthetic (isTrusted:false) clicks, so a plain fireAt selects the
                    // tile but never commits it to the prompt. Click via the bridge's
                    // React onClick first; fall back to synthetic only if no handler.
                    const committedViaBridge = await tryClickElementViaBridge(button);
                    if (committedViaBridge) await new Promise(r => setTimeout(r, 700));
                    else await fireAt(button, 700);
                    return { ok: true, clicked: true };
                }
                await new Promise(r => setTimeout(r, 250));
            }

            return required
                ? { ok: false, clicked: false, error: 'Add to prompt button not found after selecting reference image.' }
                : { ok: true, clicked: false };
        }


        async function selectReferenceAsset(asset, options = {}) {
            const assetId = typeof asset === 'string' ? asset : (asset?.id || '');
            const assetSrc = typeof asset === 'object' ? (asset?.src || '') : '';
            const assetLabel = typeof asset === 'object' ? (asset?.label || '') : '';
            const isCharacterMode = options?.mode === 'character';
            const excludeImageKeys = options?.excludeImageKeys instanceof Set ? options.excludeImageKeys : new Set();
            if (!assetId && !assetSrc) return { ok: true, skipped: true };
            const usesCompactReferencePicker = () =>
                (window.innerWidth || document.documentElement?.clientWidth || 0) > 0
                && (window.innerWidth || document.documentElement?.clientWidth || 0) < MIN_FLOW_ASSET_WINDOW_WIDTH_PX;
            const compactPicker = usesCompactReferencePicker();
            if (compactPicker) {
                showFlowAutomatorPopupMessage(FLOW_ASSET_WINDOW_TOO_NARROW_MESSAGE);
                return {
                    ok: false,
                    error: FLOW_ASSET_WINDOW_TOO_NARROW_MESSAGE,
                    windowTooNarrow: true
                };
            }
            const matchOptions = compactPicker
                ? { requireStrongIdentity: true, disableLabelFallback: true }
                : {};

            const esc = () => document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
            );

            // Dispatch a full synthetic click sequence on an element.
            const fireAt = async (el, waitMs = 300) => {
                if (!el) return;
                try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) { }
                try { el.focus(); } catch (e) { }
                const r = el.getBoundingClientRect();
                const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
                for (const [type, Ctor] of [
                    ['pointerdown', PointerEvent], ['mousedown', MouseEvent]
                ]) {
                    el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 }));
                }
                for (const [type, Ctor] of [
                    ['pointerup', PointerEvent], ['mouseup', MouseEvent], ['click', MouseEvent]
                ]) {
                    el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 0 }));
                }
                await new Promise(r => setTimeout(r, waitMs));
            };

            // Helper: trigger hover events on the tile container to reveal hidden Add buttons
            const triggerHover = (el) => {
                if (!el) return;
                const r = el.getBoundingClientRect();
                const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
                const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy };
                el.dispatchEvent(new MouseEvent('mouseover', opts));
                el.dispatchEvent(new MouseEvent('mouseenter', { ...opts, bubbles: false }));
                el.dispatchEvent(new MouseEvent('mousemove', opts));
                el.dispatchEvent(new PointerEvent('pointerover', { ...opts, pointerId: 1 }));
                el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, pointerId: 1, bubbles: false }));
            };

            function isClickTargetLinkedToImage(clickEl, imgEl) {
                if (!clickEl || !imgEl) return false;
                if (clickEl === imgEl || clickEl.contains(imgEl) || imgEl.contains(clickEl)) return true;

                const tileRoot = imgEl.closest('[data-tile-id], [data-item-index], [role="gridcell"], [role="option"], li, article')
                    || imgEl.parentElement;
                if (!tileRoot || !tileRoot.contains(clickEl)) return false;

                const tr = clickEl.getBoundingClientRect();
                const ir = imgEl.getBoundingClientRect();
                const dx = Math.abs((tr.left + tr.width / 2) - (ir.left + ir.width / 2));
                const dy = Math.abs((tr.top + tr.height / 2) - (ir.top + ir.height / 2));
                const maxX = Math.max(ir.width * 2.2, 260);
                const maxY = Math.max(ir.height * 2.2, 220);
                return dx <= maxX && dy <= maxY;
            }

            // Helper: after hovering, find the add/select button that becomes visible
            const findHoverRevealedAddBtn = (img) => {
                const tileRoot = img?.closest?.('[data-tile-id], [data-item-index], [role="gridcell"], [role="option"], li, article')
                    || img?.parentElement
                    || null;
                const tileContainers = [];
                let node = tileRoot || img;
                for (let d = 0; d < 4 && node && node !== document.body; d++, node = node.parentElement) {
                    tileContainers.push(node);
                }

                for (const container of tileContainers) {
                    const candidates = Array.from(container.querySelectorAll('button, [role="button"], div[tabindex], span[tabindex]'));
                    const addBtn = candidates.find(el => {
                        if (el.tagName === 'IMG') return false;
                        if (!el.offsetParent && window.getComputedStyle(el).position !== 'fixed') return false;
                        if (!isClickTargetLinkedToImage(el, img)) return false;
                        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
                        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                        const combined = `${txt} ${aria}`;
                        // Must have add/select semantics, NOT cancel/remove (already selected)
                        const hasAdd = combined.includes('add') || combined.includes('select') ||
                            combined.includes('+') || combined.includes('추가') || combined.includes('선택');
                        const isSelected = combined.includes('cancel') || combined.includes('remove') ||
                            combined.includes('deselect') || combined.includes('selected') || combined.includes('added');
                        return hasAdd && !isSelected;
                    });
                    if (addBtn) return addBtn;
                }
                return null;
            };

            const isPickerPanelClosed = (panelRef) => {
                if (!panelRef || !panelRef.isConnected || !document.body.contains(panelRef)) return true;
                const rect = panelRef.getBoundingClientRect?.();
                if (!rect || rect.width <= 0 || rect.height <= 0) return true;
                const style = window.getComputedStyle(panelRef);
                return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
            };

            const finishReferenceSelection = async (panelRef, result = {}, { skipCommit = false, suppressEsc = false } = {}) => {
                const commitResult = skipCommit
                    ? { ok: true, clicked: false, compactAutoInserted: true }
                    : await commitReferenceSelectionToPrompt(panelRef, fireAt);
                if (!commitResult.ok) {
                    if (!suppressEsc) esc();
                    await new Promise(r => setTimeout(r, 250));
                    return { ok: false, error: commitResult.error };
                }
                if (!suppressEsc) esc();
                await new Promise(r => setTimeout(r, 300));
                return {
                    ok: true,
                    ...result,
                    addToPromptClicked: commitResult.clicked,
                    compactAutoInserted: !!commitResult.compactAutoInserted
                };
            };

            const finishCompactReferenceSelection = async (panelRef, result = {}) => {
                // Compact Flow picker attaches the asset on the tile click. There is no
                // "Add to prompt" state to verify. Do not press Escape here: in the
                // compact Flow UI Escape can remove the image that was just attached.
                await new Promise(r => setTimeout(r, 250));
                console.log('[ReferenceAsset] Compact picker click accepted as inserted.');
                return finishReferenceSelection(panelRef, result, {
                    skipCommit: true,
                    suppressEsc: true
                });
            };

            // 1. Find and click the Add Media trigger button.
            const flowContext = getFlowContext();
            const composerPair = findBestComposerPair();
            let panel = null;
            const triggerBtn = findReferenceTriggerNearComposer(composerPair?.input, {
                allowGenericAddMedia: true
            });
            if (!triggerBtn) {
                return {
                    ok: false,
                    error: flowContext.isSubProject
                        ? 'Reference image trigger not found near the sub-project composer.'
                        : 'Reference/Add Media button not found'
                };
            }
            console.log('[ReferenceAsset] Opening Add Media panel before searching assets.');
            await fireAt(triggerBtn, 500);

            // 2. Wait for the Add Media panel.
            //    Strategy: find the "Upload image" button, then walk UP the DOM to find the
            //    smallest ancestor that also contains media images.  This avoids the bug where
            //    querySelectorAll('div') returns a large page-wrapper div first (DOM order =
            //    parents before children), causing image searches to match page content.
            panel = await waitForMediaPanelOpen(5000);
            if (!panel) return { ok: false, error: 'Asset panel did not open' };

            const switchCompactPickerKind = async (wantedKind) => {
                if (!compactPicker) return false;
                const wanted = wantedKind === 'character' ? 'character' : 'image';
                const scope = panel && panel.isConnected ? panel : document;
                const visibleControls = Array.from(scope.querySelectorAll('button, [role="button"], [aria-haspopup="menu"], [aria-haspopup="listbox"]'))
                    .filter((el) => isVisibleElement(el))
                    .filter((el) => !el.querySelector('img'))
                    .filter((el) => !el.closest('[data-slate-editor="true"], [data-lexical-editor="true"], [role="textbox"][aria-multiline="true"]'));
                const controlText = (el) => normalizeText(`${el.innerText || el.textContent || ''} ${el.getAttribute?.('aria-label') || ''} ${el.getAttribute?.('title') || ''}`);
                const isAlreadyWanted = visibleControls.some((el) => {
                    const txt = controlText(el);
                    if (wanted === 'character') return txt.includes('character') || txt.includes('캐릭터') || txt.includes('キャラクター') || txt.includes('角色');
                    if (txt.includes('character') || txt.includes('video')) return false;
                    return txt === 'image' || txt.includes(' image') || txt.includes('images') || txt.includes('이미지') || txt.includes('画像') || txt.includes('图片');
                });
                if (isAlreadyWanted) return true;

                const dropdown = visibleControls.find((el) => {
                    const txt = controlText(el);
                    const icon = (el.querySelector('i, .material-icons, .google-symbols')?.textContent || '').trim().toLowerCase();
                    const hasPopup = !!el.getAttribute('aria-haspopup') || icon.includes('arrow_drop_down');
                    return hasPopup || txt.includes('all') || txt.includes('media') || txt.includes('asset') || txt.includes('character') || txt.includes('image');
                });
                if (!dropdown) return false;

                await fireAt(dropdown, 350);
                await new Promise(r => setTimeout(r, 150));
                const optionMatcher = (el) => {
                    if (!isVisibleElement(el) || el.querySelector('img')) return false;
                    if (el.closest('[data-slate-editor="true"], [data-lexical-editor="true"], [role="textbox"][aria-multiline="true"]')) return false;
                    const txt = controlText(el);
                    const icon = (el.querySelector('i, .material-icons, .google-symbols')?.textContent || '').trim().toLowerCase();
                    if (wanted === 'character') {
                        return icon === 'accessibility_new'
                            || txt === 'character'
                            || txt === 'characters'
                            || txt.includes('accessibility_newcharacters')
                            || txt.includes('characters')
                            || txt.includes('캐릭터')
                            || txt.includes('キャラクター')
                            || txt.includes('角色');
                    }
                    if (txt.includes('character') || txt.includes('video')) return false;
                    return icon === 'image'
                        || txt === 'image'
                        || txt === 'images'
                        || txt.includes('imageimages')
                        || txt.includes('images')
                        || txt.includes('이미지')
                        || txt.includes('画像')
                        || txt.includes('图片');
                };
                const option = Array.from(document.querySelectorAll(
                    '[data-radix-popper-content-wrapper] [role="menuitem"], [role="menu"] [role="menuitem"], [role="option"], button, [role="button"]'
                )).find(optionMatcher);
                if (!option) return false;

                await fireAt(option, 700);
                const refreshed = findBestMediaPanelCandidate();
                if (refreshed) panel = refreshed;
                return true;
            };

            const isMentionSearch = typeof assetId === 'string' && assetId.startsWith('__MENTION__');
            if (!isMentionSearch) {
                await switchCompactPickerKind(isCharacterMode ? 'character' : 'image');
            }

            // 2.5. Switch to a wide-scope tab (Project, Generations, or Recent) if present, otherwise fallback to Available Assets
            const tabBtns = Array.from(panel.querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"]'));
            const isTabActive = (btn) =>
                btn?.getAttribute('aria-selected') === 'true'
                || btn?.getAttribute('aria-pressed') === 'true'
                || btn?.getAttribute('data-state') === 'active';
            const tabText = (btn) => normalizeText(`${btn?.innerText || btn?.textContent || ''} ${btn?.getAttribute?.('aria-label') || ''}`);
            const isCharacterTab = (btn) => {
                const txt = tabText(btn);
                const compact = txt.replace(/\s+/g, '');
                return txt.includes('character') || compact.includes('charactercharacters') || txt.includes('캐릭터') || txt.includes('キャラクター') || txt.includes('角色');
            };
            const isVideoTab = (btn) => {
                const txt = tabText(btn);
                const compact = txt.replace(/\s+/g, '');
                return txt.includes('video') || txt.includes('videos') || compact.includes('videovideos') || txt.includes('동영상') || txt.includes('動画') || txt.includes('视频');
            };
            const isPickerTabControl = (btn) => {
                if (!btn || btn.querySelector('img')) return false;
                const role = btn.getAttribute('role');
                const ariaControls = (btn.getAttribute('aria-controls') || '').toLowerCase();
                const id = (btn.id || '').toLowerCase();
                return role === 'tab'
                    || !!btn.closest('[role="tablist"]')
                    || ariaControls.includes('image')
                    || ariaControls.includes('media')
                    || ariaControls.includes('character')
                    || id.includes('trigger-image')
                    || id.includes('trigger-media')
                    || id.includes('trigger-character');
            };
            const isExactImageTab = (btn) => {
                if (!isPickerTabControl(btn)) return false;
                const txt = tabText(btn);
                const compact = txt.replace(/\s+/g, '');
                if (isCharacterTab(btn) || isVideoTab(btn)) return false;
                return txt === 'image'
                    || txt === 'images'
                    || compact === 'imageimages'
                    || compact.includes('imageimages')
                    || txt.includes('view images')
                    || txt.includes('이미지')
                    || txt.includes('画像')
                    || txt.includes('图片');
            };
            const isAllMediaTab = (btn) => {
                if (!isPickerTabControl(btn)) return false;
                const txt = tabText(btn);
                const compact = txt.replace(/\s+/g, '');
                if (isCharacterTab(btn) || isVideoTab(btn)) return false;
                if (txt.includes('add media') || txt.includes('upload') || txt.includes('업로드')) return false;
                return txt.includes('all media')
                    || compact.includes('allmedia')
                    || txt === 'media'
                    || txt.includes('asset')
                    || txt.includes('project')
                    || txt.includes('generation')
                    || txt.includes('recent')
                    || txt.includes('library')
                    || txt.includes('전체')
                    || txt.includes('전체 미디어')
                    || txt.includes('프로젝트')
                    || txt.includes('라이브러리');
            };
            const isImageOrAllMediaTab = (btn) => {
                return isExactImageTab(btn) || isAllMediaTab(btn);
            };
            const bestTab = isCharacterMode
                ? tabBtns.find(b => {
                    if (!isPickerTabControl(b)) return false;
                    return isCharacterTab(b);
                })
                : (tabBtns.find(isExactImageTab) || tabBtns.find(isAllMediaTab));
            if (isCharacterMode && !bestTab) {
                safeSendMessage({
                    action: 'RECORD_DIAGNOSTIC_ERROR',
                    diagnostic: {
                        code: 'CHARACTER_TAB_NOT_FOUND',
                        stage: 'character-picker',
                        summary: 'The Characters control was not found.',
                        context: {
                            panelFound: !!panel,
                            characterControlFound: false,
                            candidateControlCount: tabBtns.length,
                            characterTextMatchCount: tabBtns.filter(isCharacterTab).length,
                            detectionAttempts: 1,
                            pickerType: compactPicker ? 'compact' : 'wide',
                            windowWidth: window.innerWidth || document.documentElement?.clientWidth || 0,
                            locale: document.documentElement?.lang || navigator.language || ''
                        }
                    }
                });
                esc();
                await new Promise(r => setTimeout(r, 250));
                return { ok: false, error: 'Characters tab not found. Create a Flow character first, then retry.' };
            }
            if (!isCharacterMode && !bestTab) {
                console.log('[MediaPicker] Images tab not found; continuing with the currently visible Add Media panel.');
            }
            if (!isMentionSearch && bestTab && !isTabActive(bestTab)) {
                console.log('[MediaPicker] Switching to primary gallery tab...');
                await fireAt(bestTab, 600);
                if (!panel || !panel.isConnected) {
                    const refreshed = findBestMediaPanelCandidate();
                    if (refreshed) panel = refreshed;
                }
            }

            // Also explicitly ensure we are looking at IMAGES for reference images.
            // Character mode must stay inside the Characters tab/filter.
            const newTabBtnsRef = Array.from(panel.querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"]'));
            const imagesOrAllMediaChip = newTabBtnsRef.find(isExactImageTab) || newTabBtnsRef.find(isAllMediaTab);
            if (!isMentionSearch && !isCharacterMode && imagesOrAllMediaChip && !isTabActive(imagesOrAllMediaChip)) {
                console.log('[MediaPicker] Switching to Images tab before reference selection...');
                await fireAt(imagesOrAllMediaChip, 650);
                if (!panel || !panel.isConnected) {
                    const refreshed = findBestMediaPanelCandidate();
                    if (refreshed) panel = refreshed;
                }
            }

            // 3. Find the target image inside the panel.
            const normalizedTargetName = assetId || tryParseAssetNameFromUrl(assetSrc);
            console.log(`[ReferenceAsset] Searching panel for: id=${assetId || 'none'} name=${normalizedTargetName || 'none'} label="${assetLabel || ''}"`);

            if (compactPicker && !hasStableReferenceTarget(normalizedTargetName, assetSrc)) {
                return {
                    ok: false,
                    error: 'Compact reference selection needs a stable image id or source URL. Label-only matching is disabled to avoid removing already attached images.'
                };
            }

            // 2.6. If panel has a search field, filter by target label/id first.
            const setPanelSearch = async (query, { allowEmpty = false } = {}) => {
                if (!panel || !panel.isConnected) {
                    const refreshed = findBestMediaPanelCandidate();
                    if (refreshed) panel = refreshed;
                }
                const q = String(query || '').trim();
                if (!q && !allowEmpty) return false;
                const isVisible = (el) => {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect?.();
                    if (!rect) return false;
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                };

                // Wait for the search field to render and become visible (up to 3000ms)
                let searchField = null;
                const searchStart = Date.now();
                while (Date.now() - searchStart < 3000) {
                    searchField = Array.from(panel.querySelectorAll(
                        'input, textarea, [role="textbox"], [contenteditable="true"], [contenteditable="plaintext-only"]'
                    )).filter(isVisible).find((el) => {
                        const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                        const txt = (el.innerText || el.textContent || '').toLowerCase();
                        return ph.includes('search') || aria.includes('search') || txt.includes('search for assets')
                            || ph.includes('검색') || aria.includes('검색') || txt.includes('검색');
                    });
                    if (searchField) break;
                    await new Promise(r => setTimeout(r, 150));
                }

                if (!searchField) {
                    // Try to find the All/전체 tab or Project tab to reveal the search input
                    const tabs = Array.from(panel.querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"]'));
                    const allTab = tabs.find(isAllMediaTab);
                    if (allTab && !isTabActive(allTab)) {
                        console.log(`[ReferenceAsset] Search input not found. Switching to All/전체 tab "${allTab.innerText.trim()}" to reveal search...`);
                        await fireAt(allTab, 800);
                        if (!panel || !panel.isConnected) {
                            const refreshed = findBestMediaPanelCandidate();
                            if (refreshed) panel = refreshed;
                        }
                        // Try finding search field one more time
                        const searchStart2 = Date.now();
                        while (Date.now() - searchStart2 < 1500) {
                            searchField = Array.from(panel.querySelectorAll(
                                'input, textarea, [role="textbox"], [contenteditable="true"], [contenteditable="plaintext-only"]'
                            )).filter(isVisible).find((el) => {
                                const ph = (el.getAttribute('placeholder') || '').toLowerCase();
                                const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                                const txt = (el.innerText || el.textContent || '').toLowerCase();
                                return ph.includes('search') || aria.includes('search') || txt.includes('search for assets')
                                    || ph.includes('검색') || aria.includes('검색') || txt.includes('검색');
                            });
                            if (searchField) break;
                            await new Promise(r => setTimeout(r, 150));
                        }
                    }
                }
                if (!searchField) return false;

                const tag = (searchField.tagName || '').toLowerCase();
                const isNative = tag === 'input' || tag === 'textarea';
                if (isNative) {
                    const proto = tag === 'textarea'
                        ? window.HTMLTextAreaElement?.prototype
                        : window.HTMLInputElement?.prototype;
                    const setter = proto && Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                    if (setter) setter.call(searchField, q);
                    else searchField.value = q;
                    searchField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                    searchField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                    if (q) {
                        searchField.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
                    }
                } else {
                    searchField.textContent = q;
                    searchField.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: q }));
                    searchField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                }
                await new Promise(r => setTimeout(r, 700));
                return true;
            };

            // Search skipped for UUID-based lookups: Flow's search doesn't understand UUIDs.
            // Exception: @mention targets (__MENTION__name) search by user-friendly name.
            let searchApplied = false;
            if (isMentionSearch && assetLabel) {
                console.log(`[ReferenceAsset] @mention search: querying panel for "${assetLabel}"…`);
                searchApplied = await setPanelSearch(assetLabel);
                if (searchApplied) {
                    await new Promise(r => setTimeout(r, 700));
                    const panelImgs = getReferencePanelAssetImages(panel).filter(isCollectionReferenceImage).filter((img) => !isVideoReferenceTile(img));

                    // Check if THIS asset's tile is ALREADY selected — meaning Flow's
                    // native @mention already attached it (e.g. the name was in the React
                    // asset map and resolved natively). Only skip if the selected tile
                    // actually matches the label; otherwise an unrelated selected tile (from
                    // a previous attach) was being misread as "already attached", causing the
                    // real target to be skipped and nothing to get attached.
                    const alreadySelected = panelImgs.find(img =>
                        getReferenceTileAction(getDirectReferenceTileButton(img)) === 'selected'
                        && referenceImageMatchesTarget(img, '', '', assetLabel, matchOptions));
                    if (alreadySelected) {
                        console.log(`[ReferenceAsset] @mention: "${assetLabel}" already attached (native resolve), committing.`);
                        return finishReferenceSelection(panel, { ok: true, assetId: assetLabel, alreadyAttached: true });
                    }

                    // Click the first tile in the search results.
                    // Use waitForMatchingCollectionAssetButton with label-only matching
                    // so we get the same hover+click path that works for regular selections.
                    const mentionMatch = await waitForMatchingCollectionAssetButton(panel, '', '', assetLabel, 5000);
                    if (mentionMatch.state === 'missing' || !mentionMatch.button) {
                        console.log(`[ReferenceAsset] @mention: no tile matched "${assetLabel}" by label. panel images: ${mentionMatch.assetCount}`);
                        esc();
                        await new Promise(r => setTimeout(r, 250));
                        return { ok: false, error: `@mention: no image found in panel for "${assetLabel}".` };
                    }
                    if (mentionMatch.state === 'selected') {
                        console.log(`[ReferenceAsset] @mention: "${assetLabel}" already selected (native resolve), committing.`);
                        return finishReferenceSelection(panel, { ok: true, assetId: assetLabel, alreadyAttached: true });
                    }
                    console.log(`[ReferenceAsset] @mention: clicking "${assetLabel}" tile (state="${mentionMatch.state}").`);
                    const mentionImg = mentionMatch.button.querySelector?.('img') || mentionMatch.button;

                    // Hover first to reveal any hover-gated buttons
                    const tileContainer = mentionMatch.button.closest('[role="gridcell"], [role="option"], li') || mentionMatch.button.parentElement;
                    if (tileContainer) triggerHover(tileContainer);
                    triggerHover(mentionImg || mentionMatch.button);
                    await new Promise(r => setTimeout(r, 300));

                    // Check whether "Add to Prompt" is now enabled — this is more reliable
                    // than aria-selected/pressed state which Flow often doesn't update.
                    const isAddToPromptEnabled = () => {
                        const btn = findAddReferenceToPromptButton(panel);
                        if (!btn) return false;
                        return !btn.disabled
                            && btn.getAttribute('aria-disabled') !== 'true'
                            && btn.getAttribute('data-disabled') !== 'true';
                    };

                    const tryViewerSelect = async () => {
                        if (!isPanelInViewerMode(panel)) return false;
                        const selectBtn = findViewerSelectButton(panel);
                        if (!selectBtn) return false;
                        console.log(`[ReferenceAsset] @mention: viewer opened, clicking Select for "${assetLabel}".`);
                        if (!(await tryClickElementViaBridge(selectBtn))) await fireAt(selectBtn, 500);
                        else await new Promise(r => setTimeout(r, 500));
                        return true;
                    };

                    // Click a target, handle viewer if it opened, then wait up to 1.5s for
                    // "Add to Prompt" to become enabled. Returns true when commit is possible.
                    const clickAndWait = async (target) => {
                        if (!(await tryClickElementViaBridge(target))) await fireAt(target, 300);
                        else await new Promise(r => setTimeout(r, 300));
                        await tryViewerSelect();
                        const deadline = Date.now() + 1500;
                        while (Date.now() < deadline) {
                            if (isAddToPromptEnabled()) return true;
                            await new Promise(r => setTimeout(r, 120));
                        }
                        return isAddToPromptEnabled();
                    };

                    // Strategy 1: React fiber click on the tile button.
                    let enabled = await clickAndWait(mentionMatch.button);

                    // Strategy 2: React fiber click on the image element inside the tile.
                    if (!enabled && mentionImg && mentionImg !== mentionMatch.button) {
                        console.log(`[ReferenceAsset] @mention: retrying with image element for "${assetLabel}".`);
                        enabled = await clickAndWait(mentionImg);
                    }

                    // Strategy 3: plain DOM events (fireAt) as last resort.
                    if (!enabled) {
                        console.log(`[ReferenceAsset] @mention: retrying with fireAt for "${assetLabel}".`);
                        await fireAt(mentionMatch.button, 400);
                        await tryViewerSelect();
                        await new Promise(r => setTimeout(r, 600));
                        enabled = isAddToPromptEnabled();
                    }

                    if (enabled) {
                        console.log(`[ReferenceAsset] @mention: Add to Prompt enabled for "${assetLabel}", committing.`);
                        return finishReferenceSelection(panel, { assetId: assetLabel });
                    }

                    // Last resort: click "Add to Prompt" even if disabled — Flow sometimes
                    // renders it disabled but still accepts the React fiber click.
                    const lastResortBtn = findAddReferenceToPromptButton(panel);
                    if (lastResortBtn) {
                        console.log(`[ReferenceAsset] @mention: last-resort commit click for "${assetLabel}".`);
                        if (!(await tryClickElementViaBridge(lastResortBtn))) await fireAt(lastResortBtn, 700);
                        else await new Promise(r => setTimeout(r, 700));
                        esc();
                        await new Promise(r => setTimeout(r, 300));
                        return { ok: true, assetId: assetLabel, directCommit: true };
                    }
                    esc();
                    await new Promise(r => setTimeout(r, 250));
                    return { ok: false, error: `@mention: tile clicked but Add to Prompt not enabled for "${assetLabel}".` };
                } else {
                    // No search box — fall through to normal tab-scroll matching
                    console.log(`[ReferenceAsset] @mention: panel has no search box, falling through for "${assetLabel}".`);
                }
            }

            const preselectedTargetImgRaw = findSelectedReferenceTileByTarget(normalizedTargetName, assetSrc, document, assetLabel, matchOptions);
            const preselectedTargetImg = preselectedTargetImgRaw && !filterExcludedReferenceImages([preselectedTargetImgRaw], excludeImageKeys).length
                ? null
                : preselectedTargetImgRaw;
            if (preselectedTargetImg) {
                console.warn(`[ReferenceAsset] Target ${normalizedTargetName || assetId || 'unknown'} is already selected in Flow UI. Proceeding.`);
                const selectedKey = getReferenceImageStableKey(preselectedTargetImg);
                if (compactPicker) {
                    return {
                        ok: true,
                        assetId: normalizedTargetName || assetId || null,
                        selectedKey,
                        warning: 'Reference image was already selected in compact Flow UI.'
                    };
                }
                return finishReferenceSelection(panel, {
                    assetId: normalizedTargetName || assetId || null,
                    selectedKey,
                    warning: 'Reference image was already selected in Flow UI.'
                });
            }

            const matchingCollectionImgs = filterExcludedReferenceImages(
                getMatchingCollectionReferenceImages(panel, normalizedTargetName, assetSrc, assetLabel, matchOptions),
                excludeImageKeys
            );
            if (matchingCollectionImgs.length > 0) {
                const selectedMatch = matchingCollectionImgs.find((img) => getReferenceTileAction(getDirectReferenceTileButton(img)) === 'selected');
                if (selectedMatch) {
                    const selectedKey = getReferenceImageStableKey(selectedMatch);
                    if (compactPicker) {
                        return {
                            ok: true,
                            assetId: normalizedTargetName || assetId || null,
                            selectedKey,
                            warning: 'Reference image was already selected in compact Flow UI.'
                        };
                    }
                    return finishReferenceSelection(panel, {
                        assetId: normalizedTargetName || assetId || null,
                        selectedKey
                    });
                }

                const addMatch = matchingCollectionImgs.find((img) => getReferenceTileAction(getDirectReferenceTileButton(img)) === 'add');
                if (addMatch) {
                    const addBtnCandidates = [
                        getDirectReferenceTileButton(addMatch),
                        findAssetSelectionButtonUnderTile(addMatch)
                    ].filter(Boolean);
                    const addBtn = addBtnCandidates.find((el) => getReferenceTileAction(el) === 'add') || addMatch;
                    const addBtnBridgeClicked = await tryClickElementViaBridge(addBtn);
                    if (!addBtnBridgeClicked) await fireAt(addBtn, 250);
                    else await new Promise(r => setTimeout(r, 250));
                    for (let i = 0; i < 20; i++) {
                        await new Promise(r => setTimeout(r, 400));
                        if (hasSelectedReferenceTile(panel, normalizedTargetName, assetSrc, assetLabel, matchOptions) || findSelectedReferenceTileByTarget(normalizedTargetName, assetSrc, document, assetLabel, matchOptions)) {
                            return finishReferenceSelection(panel, {
                                assetId: normalizedTargetName || assetId || null
                            });
                        }
                    }
                    esc();
                    await new Promise(r => setTimeout(r, 250));
                    return { ok: false, error: 'Reference collection tile did not switch from add to cancel.' };
                }

                esc();
                await new Promise(r => setTimeout(r, 250));
                return { ok: false, error: 'Reference collection tile was found, but no add/cancel state was detected.' };
            }

            const getTabPriority = (btn) => {
                const txt = (btn.textContent || btn.innerText || '').toLowerCase().replace(/\s+/g, ' ').trim();
                if (isCharacterMode && (txt.includes('character') || txt.includes('캐릭터') || txt.includes('キャラクター') || txt.includes('角色'))) return 0;
                if (!isCharacterMode && (txt === 'image' || txt === 'images' || txt.includes('all media') || txt.includes('view images'))) return 0;
                if (txt.includes('project')) return 0;
                if (txt.includes('generation')) return 1;
                if (txt.includes('recent')) return 2;
                if (txt.includes('asset') || txt.includes('gallery') || txt.includes('library') || txt.includes('all')) return 3;
                return 9;
            };

            const getPanelTabs = () => {
                const currentPanel = panel && panel.isConnected ? panel : findBestMediaPanelCandidate();
                if (currentPanel && currentPanel !== panel) panel = currentPanel;
                const seen = new Set();
                return getVisibleReferenceTabs(panel || document)
                    .filter((btn) => {
                        const txt = (btn.textContent || btn.innerText || '').toLowerCase().replace(/\s+/g, ' ').trim();
                        if (!txt) return false;
                        if (!isMentionSearch && !isCharacterMode && (isCharacterTab(btn) || isVideoTab(btn))) return false;
                        if (isCharacterMode && !isCharacterTab(btn)) return false;
                        if (seen.has(txt)) return false;
                        seen.add(txt);
                        return true;
                    })
                    .sort((a, b) => getTabPriority(a) - getTabPriority(b));
            };

            let assetLookup = await waitForReferencePanelAsset(
                panel,
                normalizedTargetName,
                assetSrc,
                assetLabel,
                searchApplied ? 25000 : 40000,
                { excludeImageKeys, matchOptions }
            );
            let targetImg = assetLookup.targetImg;

            if (!targetImg) {
                const visitedTabTexts = new Set();
                const tabs = getPanelTabs();
                for (const tab of tabs) {
                    const tabTxt = (tab.textContent || tab.innerText || '').toLowerCase().replace(/\s+/g, ' ').trim() || `tab-${visitedTabTexts.size + 1}`;
                    if (visitedTabTexts.has(tabTxt)) continue;
                    visitedTabTexts.add(tabTxt);

                    if (!isTabActive(tab)) {
                        await fireAt(tab, 650);
                    }

                    if (!panel || !panel.isConnected) {
                        const refreshed = findBestMediaPanelCandidate();
                        if (refreshed) panel = refreshed;
                    }

                    if (isMentionSearch && assetLabel) {
                        await setPanelSearch(assetLabel);
                    }

                    assetLookup = await waitForReferencePanelAsset(
                        panel,
                        normalizedTargetName,
                        assetSrc,
                        assetLabel,
                        15000,
                        { excludeImageKeys, matchOptions }
                    );
                    targetImg = assetLookup.targetImg;
                    if (targetImg) break;
                }
            }

            if (!targetImg) {
                esc(); await new Promise(r => setTimeout(r, 300));
                return {
                    ok: false,
                    error: `Reference asset not found in panel. ${assetLookup.debug || `Assets seen=${assetLookup.assetCount || 0}`}`
                };
            }

            const lateSelectedTargetImgRaw = findSelectedReferenceTileByTarget(normalizedTargetName, assetSrc, document, assetLabel, matchOptions);
            const lateSelectedTargetImg = lateSelectedTargetImgRaw && !filterExcludedReferenceImages([lateSelectedTargetImgRaw], excludeImageKeys).length
                ? null
                : lateSelectedTargetImgRaw;
            if (lateSelectedTargetImg) {
                const selectedKey = getReferenceImageStableKey(lateSelectedTargetImg);
                if (compactPicker) {
                    return {
                        ok: true,
                        assetId: normalizedTargetName || assetId || null,
                        selectedKey,
                        warning: 'Reference image became selected while waiting for compact Flow UI to settle.'
                    };
                }
                return finishReferenceSelection(panel, {
                    assetId: normalizedTargetName || assetId || null,
                    selectedKey,
                    warning: 'Reference image became selected while waiting for Flow UI to settle.'
                });
            }

            // Hover over the tile to reveal the Add button
            const tileContainer = targetImg.closest('[role="gridcell"], [role="option"], li') || targetImg.parentElement;
            triggerHover(tileContainer);
            triggerHover(targetImg);
            await new Promise(r => setTimeout(r, 350));

            // Prefer explicit add/selected controls; otherwise click image tile directly.
            const clickCandidates = [
                getDirectReferenceTileButton(targetImg),
                findAssetSelectionButtonUnderTile(targetImg),
                targetImg.closest('button, [role="button"], [role="option"], [role="gridcell"], a')
            ].filter(Boolean);
            let clickTarget = targetImg;
            let actionState = '';
            for (const candidate of clickCandidates) {
                const candidateAction = getReferenceTileAction(candidate);
                if (candidateAction === 'add' || candidateAction === 'selected') {
                    clickTarget = candidate;
                    actionState = candidateAction;
                    break;
                }
            }
            if (!actionState) {
                actionState = getReferenceTileAction(clickTarget);
            }
            if (compactPicker) {
                actionState = getReferenceTileAction(getDirectReferenceTileButton(targetImg))
                    || getReferenceTileAction(targetImg)
                    || actionState;
                clickTarget = targetImg;
            }
            console.log(`[ReferenceAsset] Clicking tile. target=${clickTarget.tagName} text="${(clickTarget.innerText||'').slice(0,40).trim()}" action=${actionState}`);

            // If already selected (cancel state), skip clicking to avoid deselecting
            if (actionState === 'selected') {
                console.log('[ReferenceAsset] Image tile already in selected state, skipping click.');
                const selectedKey = getReferenceImageStableKey(targetImg);
                if (compactPicker) {
                    return {
                        ok: true,
                        assetId: normalizedTargetName || assetId || null,
                        selectedKey,
                        warning: 'Already selected.'
                    };
                }
                return finishReferenceSelection(panel, {
                    assetId: normalizedTargetName || assetId || null,
                    selectedKey,
                    warning: 'Already selected.'
                });
            }

            const attachedBeforeClick = compactPicker ? countPromptComposerAttachedImages() : 0;
            if (compactPicker) {
                await fireAt(clickTarget, 700);
            } else {
                // Flow's reference tiles ignore synthetic (isTrusted:false) clicks, so
                // a plain dispatchEvent "finds but doesn't select". Route through the
                // bridge's React fiber onClick first; only fall back to synthetic if
                // the bridge could not find a React handler.
                const bridgeClicked = await tryClickElementViaBridge(clickTarget);
                if (bridgeClicked) {
                    await new Promise(r => setTimeout(r, 400));
                } else {
                    await fireAt(clickTarget, 400);
                }
            }

            if (compactPicker) {
                await new Promise(r => setTimeout(r, 500));
                const attachedAfterClick = countPromptComposerAttachedImages();
                if (attachedAfterClick < attachedBeforeClick) {
                    return {
                        ok: false,
                        error: 'Compact image selection toggled an already attached image off. Stopping to avoid removing prompt images.'
                    };
                }
                if (attachedAfterClick === attachedBeforeClick) {
                    return {
                        ok: false,
                        error: 'Compact image selection did not attach a new image. Stopping to avoid toggling selected images off.'
                    };
                }
                return finishCompactReferenceSelection(panel, {
                    assetId: normalizedTargetName || assetId || null,
                    selectedKey: getReferenceImageStableKey(targetImg)
                });
            }

            // Check if a viewer/detail overlay appeared (single-image viewer mode)
            await new Promise(r => setTimeout(r, 500));
            if (isPanelInViewerMode(panel)) {
                console.log('[ReferenceAsset] Viewer mode detected, clicking Select button...');
                const selectBtn = findViewerSelectButton(panel);
                if (selectBtn) {
                    await fireAt(selectBtn, 500);
                    if (compactPicker && isPickerPanelClosed(panel)) {
                        console.log('[ReferenceAsset] Compact picker inserted the asset from viewer mode.');
                        return finishReferenceSelection(panel, {
                            assetId: normalizedTargetName || assetId || null
                        }, { skipCommit: true });
                    }
                }
            }

            if (compactPicker && isPickerPanelClosed(panel)) {
                console.log('[ReferenceAsset] Compact picker closed after selection.');
                return finishReferenceSelection(panel, {
                    assetId: normalizedTargetName || assetId || null
                }, { skipCommit: true });
            }

            // 5. Verify selection was applied
            const verifyResult = await verifyReferenceAssetSelected(
                { id: normalizedTargetName || assetId, src: assetSrc },
                3500,
                matchOptions
            );

            if (verifyResult.ok) {
                return finishReferenceSelection(panel, {
                    assetId: verifyResult.assetId || normalizedTargetName || assetId || null
                });
            }

            // Retry with hover again — some UIs need a second hover to reveal buttons
            console.warn('[ReferenceAsset] First click did not confirm selection, retrying with hover...');
            triggerHover(tileContainer);
            triggerHover(targetImg);
            await new Promise(r => setTimeout(r, 400));

            const retryAddBtn = findHoverRevealedAddBtn(targetImg)
                || findAssetSelectionButtonUnderTile(targetImg)
                || getDirectReferenceTileButton(targetImg);

            const retryClickTarget = (retryAddBtn && getReferenceTileAction(retryAddBtn) === 'add')
                ? retryAddBtn
                : targetImg;

            if (retryClickTarget && getReferenceTileAction(retryClickTarget) !== 'selected') {
                if (compactPicker) {
                    await fireAt(retryClickTarget, 700);
                } else {
                    const retryBridgeClicked = await tryClickElementViaBridge(retryClickTarget);
                    if (retryBridgeClicked) await new Promise(r => setTimeout(r, 500));
                    else await fireAt(retryClickTarget, 500);
                }
                if (compactPicker && isPickerPanelClosed(panel)) {
                    console.log('[ReferenceAsset] Compact picker inserted the asset after retry click.');
                    return finishReferenceSelection(panel, {
                        assetId: normalizedTargetName || assetId || null
                    }, { skipCommit: true });
                }
                // Check viewer mode again
                if (isPanelInViewerMode(panel)) {
                    const selectBtn2 = findViewerSelectButton(panel);
                    if (selectBtn2) {
                        await fireAt(selectBtn2, 400);
                        if (compactPicker && isPickerPanelClosed(panel)) {
                            console.log('[ReferenceAsset] Compact picker inserted the asset after retry viewer select.');
                            return finishReferenceSelection(panel, {
                                assetId: normalizedTargetName || assetId || null
                            }, { skipCommit: true });
                        }
                    }
                }
                const retryResult = await verifyReferenceAssetSelected(
                    { id: normalizedTargetName || assetId, src: assetSrc },
                    2500,
                    matchOptions
                );
                if (retryResult.ok) {
                    return finishReferenceSelection(panel, {
                        assetId: retryResult.assetId || normalizedTargetName || assetId || null
                    });
                }
            }

            esc();
            await new Promise(r => setTimeout(r, 300));
            return { ok: false, error: verifyResult.error || 'Reference image click did not result in confirmed selection.' };
        }

        async function selectVideoStartImage(asset, options = {}) {
            const slot = options.slot === 'end' ? 'end' : 'start';
            const assetId = typeof asset === 'string' ? asset : (asset?.id || '');
            const assetSrc = typeof asset === 'object' ? (asset?.src || '') : '';
            const assetLabel = typeof asset === 'object' ? (asset?.label || '') : '';
            const assetIdentityKeys = typeof asset === 'object' && Array.isArray(asset?.assetIdentityKeys) ? asset.assetIdentityKeys : [];
            const targetVideoAssetIndex = typeof asset === 'object' && Number.isInteger(Number(asset?.videoAssetIndex))
                ? Number(asset.videoAssetIndex)
                : null;
            const normalizedTargetName = assetId || tryParseAssetNameFromUrl(assetSrc);

            if (!assetId && !assetSrc) {
                console.log('[VideoStartImage] No asset provided, skipping selection.');
                return { ok: true, skipped: true };
            }

            const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

            // 1. Trigger search: prefer video settings panel, then composer vicinity.
            const composerPair = findStableFlowComposer();
            const searchArea = findVideoSettingsPanel()
                || composerPair?.input?.closest('form, section, div[data-testid*="prompt"]')
                || document.body;
            console.log(`[VideoStartImage] Searching for ${slot} triggers.`);

            // Smart skip: avoid clicking if this image is already in the start slot.
            const existingInSlot = Array.from(searchArea.querySelectorAll('img')).find(img => {
                const src = img.src || "";
                const pTxt = (img.closest('div')?.innerText || img.closest('section')?.innerText || "").toLowerCase();
                const isTargetArea = slot === 'end'
                    ? (pTxt.includes('end') || pTxt.includes('끝') || pTxt.includes('frame 2') || pTxt.includes('image 2') || pTxt.includes('fin') || pTxt.includes('終了'))
                    : (pTxt.includes('start') || pTxt.includes('시작') || pTxt.includes('frame 1') || pTxt.includes('image 1') || pTxt.includes('début') || pTxt.includes('開始'));
                return isTargetArea && (normalizedTargetName && src.includes(normalizedTargetName)) && img.offsetParent !== null;
            });

            if (existingInSlot) {
                console.log(`%c[VideoStartImage] Skipping selection: ${normalizedTargetName} already in slot.`, 'color: #10b981; font-weight: bold;');
                return { ok: true, assetId: normalizedTargetName || assetId || null, skipped: true };
            }

            const addTriggerCandidate = findVideoAddMediaTriggerNearComposer(composerPair?.input);
            const slotTriggerCandidate = findVideoFrameSlotTriggerNearComposer(composerPair?.input, slot);
            const triggers = [
                slotTriggerCandidate,
                slot === 'start' ? addTriggerCandidate : null,
                ...Array.from(searchArea.querySelectorAll('button, [role="button"], div, span'))
                    .filter(el => {
                        const txt = (el.innerText || el.textContent || "").replace(/\s+/g, ' ').trim().toLowerCase();
                        const aria = (el.getAttribute?.('aria-label') || '').toLowerCase();
                        const title = (el.getAttribute?.('title') || '').toLowerCase();
                        const icon = getButtonIconText(el);
                        const full = `${txt} ${aria} ${title} ${icon}`.trim();
                        const rect = el.getBoundingClientRect?.();
                        const isVisible = el.offsetParent !== null && rect && rect.width > 8 && rect.height > 8;
                        if (!isVisible || full.includes('video 1x') || full.includes('image 1x') || full.includes('credits')) return false;
                        const hasPickerSignal = full.includes('open picker')
                            || full.includes('add media')
                            || full.includes('add image')
                            || full.includes('choose image')
                            || full.includes('select image')
                            || icon === 'add'
                            || icon === 'add_2'
                            || icon === 'add_photo_alternate'
                            || icon === 'image'
                            || icon === 'photo_library';
                        if (slot === 'end') {
                            return full === 'end'
                                || full.startsWith('end ')
                                || full.includes('end frame')
                                || full.includes('image 2')
                                || full.includes('frame 2')
                                || full.includes('끝')
                                || full.includes('終了')
                                || full.includes('fin')
                                || (hasPickerSignal && (full.includes('end') || full.includes('2') || full.includes('끝') || full.includes('終了') || full.includes('fin')));
                        }
                        return full === 'start'
                            || full.startsWith('start ')
                            || full.includes('start frame')
                            || full.includes('image 1')
                            || full.includes('frame 1')
                            || full.includes('시작')
                            || full.includes('開始')
                            || full.includes('début')
                            || hasPickerSignal;
                    })
                    .map((el) => {
                        const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                        const icon = getButtonIconText(el);
                        let score = 0;
                        if (txt === slot) score -= 100;
                        if (txt.includes(`${slot} frame`)) score -= 80;
                        if (txt.includes(slot)) score -= 50;
                        if (slot === 'start' && (txt.includes('image 1') || txt.includes('frame 1'))) score -= 45;
                        if (slot === 'end' && (txt.includes('image 2') || txt.includes('frame 2'))) score -= 45;
                        if (icon === 'add' || icon === 'add_2' || icon === 'add_photo_alternate') score -= 20;
                        score += Math.min(60, txt.length || 0);
                        return { el, score };
                    })
                    .sort((a, b) => a.score - b.score)
                    .map(({ el }) => el)
            ].filter(Boolean)
                .filter((el, idx, arr) => arr.indexOf(el) === idx);
            console.log(`[VideoStartImage] ${triggers.length} ${slot} trigger candidate(s) found.`);

            const tryOpenPanelSequentially = async () => {
                for (const btn of triggers) {
                    console.log(`[VideoStartImage] Selecting ${slot} trigger: "${(btn.innerText || btn.textContent || getButtonIconText(btn) || '').trim()}"`);
                    // Soft click: use .click() to stay close to manual interaction.
                    try { btn.scrollIntoView({ block: 'center' }); } catch(e) {}
                    await new Promise(r => setTimeout(r, 150));
                    fireMouseClick(btn);
                    try { btn.click(); } catch(e) {}
                    const opened = await waitForMediaPanelOpen(6500);
                    if (opened) return opened;
                }
                return null;
            };

            let panel = await tryOpenPanelSequentially();
            if (!panel) {
                return {
                    ok: false,
                    error: `${slot === 'end' ? 'End' : 'Start'} frame media panel did not open. Stopped to avoid selecting the wrong image.`
                };
            }

            // 2. Refined asset search with polling and broad matching.
            const getPanelMediaCandidates = () => {
                const scanRoot = panel && panel.isConnected ? panel : document;
                const usableImages = getReferencePanelAssetImages(scanRoot)
                    .filter(isCollectionReferenceImage)
                    .filter((img) => {
                        const btn = getDirectReferenceTileButton(img);
                        const action = getReferenceTileAction(btn);
                        if (action === 'add' || action === 'selected') return true;
                        const tile = img.closest('[role="gridcell"], [role="option"], [data-tile-id]');
                        return !!tile && !normalizeText(getReferenceTileText(img)).includes('swap');
                    });
                const candidates = usableImages.length
                    ? usableImages
                    : Array.from(scanRoot.querySelectorAll('img, canvas, [style*="background-image"], [data-asset-id]'));

                return candidates
                    .filter(el => {
                        const r = el.getBoundingClientRect();
                        return el.offsetParent !== null && r.width > 2 && r.height > 2;
                    })
                    .sort((a, b) => {
                        const ar = a.getBoundingClientRect();
                        const br = b.getBoundingClientRect();
                        return (ar.top - br.top) || (ar.left - br.left);
                    });
            };

            const normalizeStrictVideoToken = (value) => {
                const token = normalizeText(value);
                if (!token || token.length < 8) return '';
                if (['image', 'video', 'media', 'asset', 'start', 'end', 'frame'].includes(token)) return '';
                return token;
            };

            const getStrictVideoTokens = (data = {}) => {
                const tokens = new Set();
                const add = (value) => {
                    const token = normalizeStrictVideoToken(value);
                    if (token) tokens.add(token);
                };
                add(data.id);
                add(data.src);
                add(tryParseAssetNameFromUrl(data.src || ''));
                add(getCanonicalAssetUrl(data.src || ''));
                (Array.isArray(data.assetIdentityKeys) ? data.assetIdentityKeys : []).forEach(add);
                try {
                    const url = new URL(data.src || '', location.href);
                    ['name', 'assetId', 'id', 'mediaId', 'filename'].forEach((key) => add(url.searchParams.get(key)));
                } catch { }
                add(data.dataId);
                add(data.containerId);
                return tokens;
            };

            const strictVideoAssetMatch = (candidate) => {
                const targetTokens = getStrictVideoTokens({
                    id: normalizedTargetName,
                    src: assetSrc,
                    assetIdentityKeys
                });
                if (!targetTokens.size) return false;
                const candidateTokens = getStrictVideoTokens(candidate);
                for (const token of targetTokens) {
                    if (candidateTokens.has(token)) return true;
                }
                return false;
            };

            const findTargetInPanel = async () => {
                const collectionMatches = getMatchingCollectionReferenceImages(
                    panel,
                    normalizedTargetName,
                    assetSrc,
                    assetLabel,
                    { requireStrongIdentity: true, disableLabelFallback: true }
                );
                if (collectionMatches.length === 1) {
                    console.log(`%c[VideoStartImage] MATCH FOUND via collection tile. ID=${normalizedTargetName}`, 'background: #10b981; color: white; padding: 2px 4px;');
                    return collectionMatches[0];
                }
                if (collectionMatches.length > 1) {
                    console.error(`[VideoStartImage] Ambiguous target: ${collectionMatches.length} collection matches for ${normalizedTargetName || assetId || 'unknown'}.`);
                    return null;
                }

                const allMedia = getPanelMediaCandidates();
                console.log(`[VideoStartImage] Strict scan: ${allMedia.length} candidate(s).`);
                const strictMatches = [];
                for (const el of allMedia) {
                    const src = el.src || el.style.backgroundImage || "";
                    const dataId = el.getAttribute('data-asset-id') || "";
                    const container = el.closest('button, [role="button"], a, div[role="listitem"], [data-id]');
                    const cTxt = (container?.innerText || "").toLowerCase();
                    const cId = container?.getAttribute('data-id') || "";
                    const isMatch = strictVideoAssetMatch({
                        id: dataId || cId || tryParseAssetNameFromUrl(src),
                        src,
                        dataId,
                        containerId: cId
                    });

                    if (isMatch) {
                        strictMatches.push(el);
                    }
                }
                if (strictMatches.length === 1) {
                    console.log(`%c[VideoStartImage] MATCH FOUND via strict token. ID=${normalizedTargetName}`, 'background: #10b981; color: white; padding: 2px 4px;');
                    return strictMatches[0];
                }
                if (strictMatches.length > 1) {
                    console.error(`[VideoStartImage] Ambiguous strict target: ${strictMatches.length} matches for ${normalizedTargetName || assetId || 'unknown'}.`);
                }
                return null;
            };

            // Find the panel's own scrollable list, favoring Flow's virtualized
            // gallery container — without actively scrolling it, this loop only
            // ever sees whatever rows already happened to render, so a target
            // further down the list (below the initial viewport) is never found
            // no matter how long it polls.
            const findFrameScrollable = () => {
                if (!panel || !panel.isConnected) return null;
                const virtuosoEl = panel.querySelector('[data-testid="virtuoso-item-list"], [data-virtuoso-scroller="true"], .virtuoso-scroller');
                if (virtuosoEl) return virtuosoEl;
                const candidates = Array.from(panel.querySelectorAll('div, ul, main')).filter((el) => {
                    const style = window.getComputedStyle(el);
                    return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20;
                });
                candidates.sort((a, b) => b.scrollHeight - a.scrollHeight);
                return candidates[0] || null;
            };

            // Patient polling: wait up to 12 seconds for the gallery to fully load,
            // scrolling its own list periodically so lazy-loaded rows keep appearing.
            const waitForTargetInPanel = async (timeoutMs = 12000) => {
                const start = Date.now();
                let lastScrollTime = 0;
                while (Date.now() - start < timeoutMs) {
                    const found = await findTargetInPanel();
                    if (found) return found;
                    const now = Date.now();
                    if (now - lastScrollTime > 700) {
                        lastScrollTime = now;
                        const scrollEl = findFrameScrollable();
                        if (scrollEl) {
                            scrollEl.scrollTop = (scrollEl.scrollTop || 0) + 500;
                            scrollEl.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 500 }));
                        }
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
                return null;
            };

            let targetImg = await waitForTargetInPanel(4000); // First wait.
            if (!targetImg) {
                // Tab switching: scan every tab.
                const tabs = Array.from(document.querySelectorAll('button, [role="tab"], .tab-item'))
                    .filter(b => {
                        const t = (b.textContent || '').toLowerCase();
                        return (t.includes('project') || t.includes('generation') || t.includes('recent') || t.includes('최근') || t.includes('생성') || t.includes('library') || t.includes('asset') || t.includes('all'));
                    });

                for (const tab of tabs) {
                    const isSelected = tab.getAttribute('aria-selected') === 'true' || tab.getAttribute('data-state') === 'active' || tab.classList.contains('active');
                    if (isSelected) continue;

                    console.log(`[VideoStartImage] Checking Tab: "${tab.textContent.trim()}"`);
                    tab.click();
                    // After switching tabs, poll up to 8 seconds for the list to refresh.
                    targetImg = await waitForTargetInPanel(8000);
                    if (targetImg) break;
                }
            }

            if (!targetImg) {
                esc();
                const debugKeys = getAssetIdentityTokens({
                    id: normalizedTargetName,
                    src: assetSrc,
                    label: assetLabel,
                    assetIdentityKeys
                }, { includeLabel: false }).slice(0, 8).join(', ');
                console.error(`[VideoStartImage] FATAL: Target not found. id=${normalizedTargetName || 'none'} index=${targetVideoAssetIndex ?? 'none'} keys=${debugKeys || 'none'}`);
                return {
                    ok: false,
                    error: `Target ${normalizedTargetName || 'selected video asset'} not found in the video media panel. index=${targetVideoAssetIndex ?? 'none'} keys=${debugKeys || 'none'}. Stopped to avoid selecting the wrong image.`
                };
            }

            // 3. Enter the viewer and perform the final selection.
            console.log(`[VideoStartImage] Goal image found. Opening viewer...`);

            const assetBtn = findAssetSelectionButtonUnderTile(targetImg);
            // Open the viewer by clicking either the image or its dedicated select button.
            if (assetBtn || targetImg) {
                const el = assetBtn || targetImg;
                try { el.scrollIntoView({ block: 'center' }); } catch(e) {}
                await new Promise(r => setTimeout(r, 200));

                // Single sequence closest to a manual interaction signal.
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0 }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, button: 0 }));
                el.click();
            }

            let viewerOpen = false;
            for(let i = 0; i < 30; i++) {
                // Treat viewer mode or a visible Select button as successful entry.
                if (isPanelInViewerMode(panel) || findViewerSelectButton(panel)) {
                    viewerOpen = true;
                    break;
                }
                await new Promise(r => setTimeout(r, 250));
            }

            if (!viewerOpen) {
                console.warn("[VideoStartImage] Viewer detection timed out, but proceeding to check Select button anyway.");
            }

            const selectBtn = await (async () => {
                for(let i=0; i<30; i++) {
                    const b = findViewerSelectButton(panel);
                    const disabled = b?.disabled || b?.getAttribute('aria-disabled') === 'true';
                    if (b && !disabled && b.offsetParent !== null) return b;
                    await new Promise(r => setTimeout(r, 300));
                }
                return null;
            })();

            if (!selectBtn) { esc(); return { ok: false, error: "Select button missing or disabled." }; }

            console.log(`[VideoStartImage] Final selection click.`);
            selectBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            esc();

            if (slot === 'start' && options.cleanupEnd !== false) {
                console.log("[VideoStartImage] Post-selection cleanup: watching for auto-sync.");
                for (let i = 0; i < 5; i++) {
                    await new Promise(r => setTimeout(r, 1000));
                    const localSlots = Array.from(searchArea.querySelectorAll('div, section, article')).filter(el => {
                        const t = (el.innerText || '').toLowerCase();
                        const hasMedia = el.querySelector('img, canvas, [style*="background-image"]');
                        return (t.includes('image') || t.includes('frame') || t.includes('start') || t.includes('end'))
                            && hasMedia && el.offsetParent !== null && el.getBoundingClientRect().height > 30;
                    });

                    localSlots.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
                    if (localSlots.length > 1) {
                        const extraSlot = localSlots[1];
                        const xBtn = Array.from(extraSlot.querySelectorAll('button, span, div[role="button"], div')).find(b => {
                            const txt = (b.textContent || b.innerText || '').toLowerCase();
                            return txt.includes('✕') || txt.includes('삭제') || txt.includes('clear') || (b.querySelector('svg') && b.innerText.length < 5);
                        });
                        if (xBtn) {
                            console.warn(`[VideoStartImage] Auto-sync detected! Clearing 2nd slot (Attempt ${i + 1}).`);
                            try {
                                xBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, view: window, button: 0 }));
                                xBtn.click();
                            } catch (e) { console.error("Cleanup error:", e); }
                        }
                    }
                }
            }

            return { ok: true, assetId: normalizedTargetName || assetId || null };
        }


        async function selectReferenceAssets(assets = [], options = {}) {
            const list = Array.isArray(assets) ? assets : [];
            if (list.length === 0) return { ok: true, skipped: true, count: 0 };

            const dedupedList = [];
            const seenKeys = new Set();
            for (let i = 0; i < list.length; i++) {
                const asset = list[i];
                const assetId = typeof asset === 'string' ? asset : (asset?.id || '');
                const assetSrc = typeof asset === 'object' ? (asset?.src || '') : '';
                const assetLabel = typeof asset === 'object' ? (asset?.label || '') : '';
                const assetKey = String(
                    assetId
                    || tryParseAssetNameFromUrl(assetSrc)
                    || getCanonicalAssetUrl(assetSrc)
                    || normalizeText(assetLabel)
                    || `asset-${i}`
                );
                if (!assetKey || seenKeys.has(assetKey)) continue;
                seenKeys.add(assetKey);
                dedupedList.push(asset);
            }

            // Single asset: use the standard single-select flow
            if (dedupedList.length === 1) {
                const res = await selectReferenceAsset(dedupedList[0], options);
                return res.ok
                    ? { ok: true, count: 1, warning: res.warning || null }
                    : { ok: false, count: 0, error: res.error };
            }

            // Flow currently commits one reference image at a time. Keep the slower
            // open -> select -> Add to prompt -> close cycle so multiple references
            // are actually attached instead of only the first selected image.
            let seqOkCount = 0;
            const seqErrors = [];
            let firstWarning = null;
            const sequentialUsedImageKeys = new Set();

            for (let i = 0; i < dedupedList.length; i++) {
                const asset = dedupedList[i];
                const result = await selectReferenceAsset(asset, {
                    ...options,
                    excludeImageKeys: sequentialUsedImageKeys
                });
                if (result?.ok) {
                    if (!result?.skipped) seqOkCount++;
                    if (result?.selectedKey) sequentialUsedImageKeys.add(result.selectedKey);
                    if (!firstWarning && result?.warning) firstWarning = result.warning;
                } else {
                    seqErrors.push(result?.error || `Failed to select asset #${i + 1}`);
                }
                await new Promise(r => setTimeout(r, 350));
            }

            if (seqOkCount === 0 && seqErrors.length) {
                return { ok: false, count: 0, error: seqErrors[0] };
            }
            if (seqErrors.length) {
                return { ok: true, count: seqOkCount, warning: firstWarning || seqErrors[0] };
            }
            return { ok: true, count: seqOkCount, warning: firstWarning || null };

            // Multiple assets: open the panel ONCE, select all inside, close ONCE.
            // This avoids the open→ESC→reopen cycle which loses the first selection.
            const esc = () => document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
            );

            const fireAt = async (el, waitMs = 300) => {
                if (!el) return;
                try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) { }
                try { el.focus(); } catch (e) { }
                const r = el.getBoundingClientRect();
                const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
                for (const [type, Ctor] of [['pointerdown', PointerEvent], ['mousedown', MouseEvent]]) {
                    el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 }));
                }
                for (const [type, Ctor] of [['pointerup', PointerEvent], ['mouseup', MouseEvent], ['click', MouseEvent]]) {
                    el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 0 }));
                }
                await new Promise(r => setTimeout(r, waitMs));
            };

            // 1. Open the panel
            const composerPair = findBestComposerPair();
            const triggerBtn = findReferenceTriggerNearComposer(composerPair?.input, { allowGenericAddMedia: true });
            if (!triggerBtn) return { ok: false, count: 0, error: 'Reference/Add Media button not found' };
            await fireAt(triggerBtn, 500);

            let panel = await waitForMediaPanelOpen(6000);
            if (!panel) return { ok: false, count: 0, error: 'Asset panel did not open' };

            // 2. Switch to broadest tab (project/generations)
            const tabBtns = Array.from(panel.querySelectorAll('button[role="tab"], [role="tab"], button, [role="button"]'));
            const bestTab = tabBtns.find(b => {
                if (b.querySelector('img')) return false;
                const txt = (b.textContent || '').toLowerCase();
                return txt.includes('project') || txt.includes('generation') || txt.includes('recent');
            });
            if (bestTab && bestTab.getAttribute('aria-selected') !== 'true') {
                await fireAt(bestTab, 600);
            }

            // 3. Select each asset within the same open panel
            let okCount = 0;
            const errors = [];
            const usedImageKeys = new Set();
            const processedAssetKeys = new Set();

            // Helper: trigger hover events to reveal hidden Add buttons
            const triggerHover = (el) => {
                if (!el) return;
                const r = el.getBoundingClientRect();
                const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
                const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy };
                el.dispatchEvent(new MouseEvent('mouseover', opts));
                el.dispatchEvent(new MouseEvent('mouseenter', { ...opts, bubbles: false }));
                el.dispatchEvent(new MouseEvent('mousemove', opts));
                el.dispatchEvent(new PointerEvent('pointerover', { ...opts, pointerId: 1 }));
                el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, pointerId: 1, bubbles: false }));
            };

            function isClickTargetLinkedToImage(clickEl, imgEl) {
                if (!clickEl || !imgEl) return false;
                if (clickEl === imgEl || clickEl.contains(imgEl) || imgEl.contains(clickEl)) return true;

                const tileRoot = imgEl.closest('[data-tile-id], [data-item-index], [role="gridcell"], [role="option"], li, article')
                    || imgEl.parentElement;
                if (!tileRoot || !tileRoot.contains(clickEl)) return false;

                const tr = clickEl.getBoundingClientRect();
                const ir = imgEl.getBoundingClientRect();
                const dx = Math.abs((tr.left + tr.width / 2) - (ir.left + ir.width / 2));
                const dy = Math.abs((tr.top + tr.height / 2) - (ir.top + ir.height / 2));
                const maxX = Math.max(ir.width * 2.2, 260);
                const maxY = Math.max(ir.height * 2.2, 220);
                return dx <= maxX && dy <= maxY;
            }

            // Helper: find add/select button revealed by hover
            const findHoverAddBtn = (img) => {
                const tileRoot = img?.closest?.('[data-tile-id], [data-item-index], [role="gridcell"], [role="option"], li, article')
                    || img?.parentElement
                    || null;
                const containers = [];
                let node = tileRoot || img;
                for (let d = 0; d < 4 && node && node !== document.body; d++, node = node.parentElement) {
                    containers.push(node);
                }
                for (const container of containers) {
                    const candidates = Array.from(container.querySelectorAll('button, [role="button"], div[tabindex], span[tabindex]'));
                    const btn = candidates.find(el => {
                        if (el.tagName === 'IMG') return false;
                        if (!el.offsetParent && window.getComputedStyle(el).position !== 'fixed') return false;
                        if (!isClickTargetLinkedToImage(el, img)) return false;
                        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
                        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                        const combined = `${txt} ${aria}`;
                        const hasAdd = combined.includes('add') || combined.includes('select') ||
                            combined.includes('+') || combined.includes('추가') || combined.includes('선택');
                        const isAlreadySelected = combined.includes('cancel') || combined.includes('remove') ||
                            combined.includes('deselect') || combined.includes('selected');
                        return hasAdd && !isAlreadySelected;
                    });
                    if (btn) return btn;
                }
                return null;
            };

            // Helper: reset scroll to top so each asset search starts from beginning
            const resetPanelScroll = () => {
                if (!panel || !panel.isConnected) return;
                const scrollables = Array.from(panel.querySelectorAll('div, ul, main, section')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20;
                });
                scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight);
                if (scrollables[0]) scrollables[0].scrollTop = 0;
            };

            // Helper: ensure the picker is back in grid mode, not stuck in single-item viewer mode.
            const ensureGridMode = async () => {
                if (!panel || !panel.isConnected) {
                    const refreshed = findBestMediaPanelCandidate();
                    if (refreshed) panel = refreshed;
                }

                for (let attempt = 0; attempt < 4; attempt++) {
                    if (!isPanelInViewerMode(panel)) return true;

                    const selectBtn = findViewerSelectButton(panel);
                    if (selectBtn) {
                        await fireAt(selectBtn, 350);
                    }

                    const scope = viewerScope(panel);
                    const backBtn = Array.from(scope.querySelectorAll('button, [role="button"]'))
                        .filter((b) => b.offsetParent !== null)
                        .find((b) => btnTextMatches(b, 'back', 'done', 'close', 'cancel', 'x', '뒤로', '완료', '닫기', '취소'));

                    if (backBtn) {
                        await fireAt(backBtn, 450);
                    } else {
                        esc();
                        await new Promise((r) => setTimeout(r, 350));
                    }

                    await new Promise((r) => setTimeout(r, 280));
                    if (!panel || !panel.isConnected) {
                        const refreshed = findBestMediaPanelCandidate();
                        if (refreshed) panel = refreshed;
                    }
                }

                return !isPanelInViewerMode(panel);
            };

            const waitForAssetSelected = async (targetName, targetSrc, targetLabel, timeoutMs = 4500) => {
                const start = Date.now();
                while (Date.now() - start < timeoutMs) {
                    const selectedInPanel = hasSelectedReferenceTile(panel, targetName, targetSrc, targetLabel);
                    const selectedInDoc = findSelectedReferenceTileByTarget(targetName, targetSrc, document, targetLabel);
                    if (selectedInPanel || selectedInDoc) return true;
                    await new Promise((r) => setTimeout(r, 220));
                }
                return false;
            };

            for (let assetIdx = 0; assetIdx < list.length; assetIdx++) {
                const asset = list[assetIdx];
                const assetId = typeof asset === 'string' ? asset : (asset?.id || '');
                const assetSrc = typeof asset === 'object' ? (asset?.src || '') : '';
                const assetLabel = typeof asset === 'object' ? (asset?.label || '') : '';
                const normalizedTargetName = assetId || tryParseAssetNameFromUrl(assetSrc);
                const assetDedupKey = String(
                    normalizedTargetName
                    || getCanonicalAssetUrl(assetSrc)
                    || normalizeText(assetLabel)
                    || ''
                );

                if (assetDedupKey && processedAssetKeys.has(assetDedupKey)) {
                    console.log(`[RefAssets] Asset ${assetIdx + 1} is duplicate request, skipping.`);
                    continue;
                }
                if (assetDedupKey) processedAssetKeys.add(assetDedupKey);

                if (!panel || !panel.isConnected) {
                    const refreshed = findBestMediaPanelCandidate();
                    if (refreshed) panel = refreshed;
                }

                const gridReady = await ensureGridMode();
                if (!gridReady) {
                    errors.push(`Asset picker stuck in viewer mode before selecting item ${assetIdx + 1}.`);
                    continue;
                }

                // Reset scroll to top before searching for each asset (important for lazy-loading)
                resetPanelScroll();
                await new Promise(r => setTimeout(r, 300));

                console.log(`[RefAssets] Searching for asset ${assetIdx + 1}/${list.length}: id=${normalizedTargetName || 'none'} label="${assetLabel || ''}"`);

                // Check if already selected
                const preSelected = findSelectedReferenceTileByTarget(normalizedTargetName, assetSrc, document, assetLabel);
                if (preSelected) {
                    const preSelectedKey = getReferenceImageStableKey(preSelected);
                    if (preSelectedKey) usedImageKeys.add(preSelectedKey);
                    console.log(`[RefAssets] Asset ${assetIdx + 1} already selected, skipping.`);
                    okCount++;
                    continue;
                }

                // Find the image by scrolling (no search — UUIDs not searchable in Flow UI)
                const lookup = await waitForReferencePanelAsset(
                    panel,
                    normalizedTargetName,
                    assetSrc,
                    assetLabel,
                    40000,
                    { excludeImageKeys: usedImageKeys }
                );
                const targetImg = lookup.targetImg;

                if (!targetImg) {
                    errors.push(`Asset not found in panel: ${normalizedTargetName || assetLabel || 'unknown'}`);
                    continue;
                }

                // Scroll tile into view
                try { targetImg.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }); } catch (e) {}
                await new Promise(r => setTimeout(r, 500));

                // Hover to reveal hidden Add button
                const tileContainer = targetImg.closest('[data-tile-id], [role="gridcell"], [role="option"], li') || targetImg.parentElement;
                triggerHover(tileContainer);
                triggerHover(targetImg);
                await new Promise(r => setTimeout(r, 350));

                // Prefer explicit add/selected controls; otherwise click image tile directly.
                const clickCandidates = [
                    getDirectReferenceTileButton(targetImg),
                    findAssetSelectionButtonUnderTile(targetImg),
                    targetImg.closest('button, [role="button"], [role="option"], [role="gridcell"], a')
                ].filter(Boolean);
                let clickTarget = targetImg;
                let actionState = '';
                for (const candidate of clickCandidates) {
                    const candidateAction = getReferenceTileAction(candidate);
                    if (candidateAction === 'add' || candidateAction === 'selected') {
                        clickTarget = candidate;
                        actionState = candidateAction;
                        break;
                    }
                }
                if (!actionState) {
                    actionState = getReferenceTileAction(clickTarget);
                }
                console.log(`[RefAssets] Asset ${assetIdx + 1}: clickTarget=${clickTarget?.tagName || 'IMG'} text="${(clickTarget?.innerText||'').slice(0,30).trim()}" action=${actionState}`);

                // Skip if already selected
                if (actionState === 'selected') {
                    const selectedTileKey = getReferenceImageStableKey(targetImg);
                    if (selectedTileKey) usedImageKeys.add(selectedTileKey);
                    console.log(`[RefAssets] Asset ${assetIdx + 1} tile is already in selected state.`);
                    okCount++;
                    continue;
                }

                const elementToClick = clickTarget || targetImg;

                // Use the same physical click path as single-select for stability.
                await fireAt(elementToClick, 400);
                await new Promise(r => setTimeout(r, 500));

                // Check if viewer mode appeared (need to click Select then Back)
                if (isPanelInViewerMode(panel)) {
                    console.log(`[RefAssets] Asset ${assetIdx + 1}: Viewer mode detected, clicking Select...`);
                    const selectBtn = findViewerSelectButton(panel);
                    if (selectBtn) {
                        await fireAt(selectBtn, 500);
                    }
                    // Wait and go back to grid
                    await new Promise(r => setTimeout(r, 300));
                    const backBtn = Array.from((viewerScope(panel)).querySelectorAll('button, [role="button"]'))
                        .filter(b => b.offsetParent !== null)
                        .find(b => btnTextMatches(b, 'back', 'done', '뒤로', '완료'));
                    if (backBtn) {
                        await fireAt(backBtn, 400);
                    }
                }

                const selected = await waitForAssetSelected(normalizedTargetName, assetSrc, assetLabel, 4500);
                if (!selected) {
                    await fireAt(targetImg, 450);
                    if (isPanelInViewerMode(panel)) {
                        const selectBtnRetry = findViewerSelectButton(panel);
                        if (selectBtnRetry) await fireAt(selectBtnRetry, 450);
                    }
                    const selectedAfterFallback = await waitForAssetSelected(normalizedTargetName, assetSrc, assetLabel, 2200);
                    if (selectedAfterFallback) {
                        const selectedTargetImgRetry = findSelectedReferenceTileByTarget(normalizedTargetName, assetSrc, document, assetLabel) || targetImg;
                        const selectedKeyRetry = getReferenceImageStableKey(selectedTargetImgRetry);
                        if (selectedKeyRetry) usedImageKeys.add(selectedKeyRetry);
                        okCount++;
                        await ensureGridMode();
                        await new Promise(r => setTimeout(r, 350));
                        continue;
                    }
                    errors.push(`Asset click did not result in selected state: ${normalizedTargetName || assetLabel || 'unknown'}`);
                    await ensureGridMode();
                    continue;
                }

                const selectedTargetImg = findSelectedReferenceTileByTarget(normalizedTargetName, assetSrc, document, assetLabel) || targetImg;
                const selectedKey = getReferenceImageStableKey(selectedTargetImg);
                if (selectedKey) usedImageKeys.add(selectedKey);

                okCount++;

                // Brief pause before next asset
                await new Promise(r => setTimeout(r, 500));
            }

            // 4. Close panel once
            esc();
            await new Promise(r => setTimeout(r, 300));

            if (okCount > 0) {
                return { ok: true, count: okCount, warning: errors[0] || null };
            }
            return { ok: false, count: 0, error: errors[0] || 'No assets could be selected' };
        }

        // One live handler may receive a command only once. This also protects
        // against an accidental duplicate chrome.tabs.sendMessage while the
        // first delivery is still being processed.
        const activePromptSubmissionIds = new Set();
        function claimPromptSubmission(itemId) {
            const key = String(itemId || '');
            if (!key || activePromptSubmissionIds.has(key)) return false;
            activePromptSubmissionIds.add(key);
            return true;
        }
        function releasePromptSubmission(itemId) {
            activePromptSubmissionIds.delete(String(itemId || ''));
        }
        const activeDownloadOperations = new Set();
        function claimDownloadOperation(kind) {
            if (activeDownloadOperations.has(kind)) return false;
            activeDownloadOperations.add(kind);
            return true;
        }
        function releaseDownloadOperation(kind) {
            activeDownloadOperations.delete(kind);
        }

        // HANDSHAKE v1.6
        const onRuntimeMessage = (message, sender, sendResponse) => {
            if (message.action === 'PING') {
                if (!hasLikelyPromptComposer()) {
                    sendResponse({ status: 'NOT_READY', error: 'Prompt composer not found' });
                } else {
                    sendResponse({ status: 'READY' });
                }
                return;
            }

            if (message.action === 'PING_VIDEO_V2') {
                if (!hasLikelyPromptComposer()) {
                    sendResponse({ status: 'NOT_READY', error: 'Prompt composer not found' });
                } else {
                    sendResponse({ status: 'READY', video: true });
                }
                return;
            }

            if (message.action === 'STOP_HISTORY_DOWNLOAD') {
                isHistoryDownloadStopped = true;
                console.log('History download stop requested.');
                sendResponse?.({ success: true });
                return;
            }

            if (message.action === 'SHOW_FLOW_AUTOMATOR_POPUP') {
                showFlowAutomatorPopupMessage(
                    message.message || FLOW_ASSET_WINDOW_TOO_NARROW_MESSAGE,
                    message.title || 'Panel Too Narrow'
                );
                sendResponse?.({ success: true });
                return;
            }

            if (message.action === 'STOP_PROMPT_SUBMISSION') {
                const ids = Array.isArray(message.itemIds) ? message.itemIds.filter(Boolean) : [];
                if (ids.length) {
                    ids.forEach((id) => canceledPromptSubmissionIds.add(id));
                } else {
                    cancelAllPromptSubmissions = true;
                }
                isSubmittingUI = false;
                sendResponse?.({ success: true });
                return;
            }

            if (message.action === 'CLEAR_PROMPT_SUBMISSION_STOP') {
                if (message.itemId) {
                    canceledPromptSubmissionIds.delete(message.itemId);
                } else {
                    canceledPromptSubmissionIds.clear();
                    cancelAllPromptSubmissions = false;
                }
                if (canceledPromptSubmissionIds.size === 0) {
                    cancelAllPromptSubmissions = false;
                }
                sendResponse?.({ success: true });
                return;
            }

            if (message.action === 'SUBMIT_PROMPT') {
                if (!hasLikelyPromptComposer()) {
                    sendResponse({ success: false, error: 'Prompt composer not found in this frame.' });
                    return;
                }
                const itemId = message.payload.itemId;
                if (!claimPromptSubmission(itemId)) {
                    safeSendMessage({ action: 'HANDSHAKE_ACK', itemId });
                    sendResponse({ success: true, status: 'STARTED', duplicateIgnored: true });
                    return false;
                }
                safeSendMessage({ action: 'HANDSHAKE_ACK', itemId: itemId });
                sendResponse({ success: true, status: 'STARTED' });

                handlePromptSubmission(message.payload)
                    .then(result => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result });
                    })
                    .catch(err => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result: { success: false, error: err.message } });
                    })
                    .finally(() => releasePromptSubmission(itemId));
                return false;
            }
            if (message.action === 'SUBMIT_VIDEO_PROMPT') {
                if (!hasLikelyPromptComposer()) {
                    sendResponse({ success: false, error: 'Prompt composer not found in this frame.' });
                    return;
                }
                const itemId = message.payload.itemId;
                if (!claimPromptSubmission(itemId)) {
                    safeSendMessage({ action: 'HANDSHAKE_ACK', itemId });
                    sendResponse({ success: true, status: 'STARTED', duplicateIgnored: true });
                    return false;
                }
                safeSendMessage({ action: 'HANDSHAKE_ACK', itemId: itemId });
                sendResponse({ success: true, status: 'STARTED' });

                handlePromptSubmission(message.payload)
                    .then(result => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result });
                    })
                    .catch(err => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result: { success: false, error: err.message } });
                    })
                    .finally(() => releasePromptSubmission(itemId));
                return false;
            }
            if (message.action === 'VIDEO_DRY_RUN') {
                if (!hasLikelyPromptComposer()) {
                    sendResponse({ success: false, error: 'Prompt composer not found in this frame.' });
                    return;
                }
                handlePromptSubmission(message.payload)
                    .then((result) => {
                        if (!result?.success) {
                            sendResponse({ success: false, error: result?.error || 'Dry run did not complete.' });
                            return;
                        }
                        safeSendMessage({
                            action: 'UPDATE_PROGRESS',
                            itemId: message.payload.itemId,
                            detail: 'Dry run complete. Start image and prompt were prepared without pressing Create.'
                        });
                        sendResponse({ success: true, result: result || { success: true, dryRun: true } });
                    })
                    .catch((err) => {
                        safeSendMessage({
                            action: 'UPDATE_PROGRESS',
                            itemId: message.payload.itemId,
                            detail: `Dry run failed: ${err.message}`
                        });
                        sendResponse({ success: false, error: err.message });
                    });
                return true;
            }
            if (message.action === 'DOWNLOAD_HISTORY') {
                if (!claimDownloadOperation('history')) {
                    sendResponse({ success: true, status: 'STARTED', duplicateIgnored: true });
                    return false;
                }
                isHistoryDownloadStopped = false; // Reset stop flag
                const itemId = 'history_download_' + Date.now();
                safeSendMessage({ action: 'HANDSHAKE_ACK', itemId: itemId });
                sendResponse({ success: true, status: 'STARTED' });

                handleDownloadHistory({ ...message.payload, isHistoryMode: true })
                    .then(result => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result });
                    })
                    .catch(err => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result: { success: false, error: err.message } });
                    })
                    .finally(() => releaseDownloadOperation('history'));
                return false;
            }

            if (message.action === 'SET_SETTING') {
                const { setting, value, label } = message;
                console.log(`Dynamic Sync request: setting=${setting || 'label'} value=${value ?? label}`);

                (async () => {
                    try {
                        if (setting === 'flowType') {
                            const context = getFlowContext();
                            const targetType = context.isSubProject ? 'image' : value;
                            if (targetType === 'video') {
                                await applyVideoCreationMode('ingredients');
                            } else {
                                // The Image tab lives inside the settings dropdown —
                                // it has to be opened before the tab can be clicked.
                                const panel = await ensureVideoSettingsPanelOpen();
                                if (!panel) {
                                    throw new Error('Settings panel did not open for image mode switch.');
                                }
                                let imageSelected = await clickVideoPanelOption(panel, '[aria-controls*="-IMAGE"]');
                                if (!imageSelected) {
                                    imageSelected = await clickVideoPanelOption(panel, (txt) => {
                                        const norm = normalizeText(txt);
                                        return !norm.includes('video') && /\bimage\b/.test(norm);
                                    });
                                }
                                if (!imageSelected) {
                                    throw new Error('Image tab was not found inside the settings panel.');
                                }
                                await closeVideoSettingsPanelIfOpen();
                            }
                            sendResponse({ success: true });
                            return;
                        }

                        if (setting === 'flowModel') {
                            await applyImageCreationSettings(value, '', null);
                            sendResponse({ success: true });
                            return;
                        }

                        if (setting === 'videoModel') {
                            // Settings panel may not be open or reachable right now (e.g., user is
                            // in a different UI state). Don't block on validation — just accept the
                            // setting change. It will be applied during the next queue run when the
                            // panel is guaranteed to be available.
                            console.log('[SET_SETTING] videoModel set to:', value, '(validation skipped, will apply on next run)');
                            sendResponse({ success: true });
                            return;
                        }

                        if (setting === 'videoMode') {
                            await applyVideoCreationMode(value, '');
                            sendResponse({ success: true });
                            return;
                        }

                        if (setting === 'videoDurationSeconds') {
                            // Best-effort live sync: only meaningful when the settings panel
                            // happens to already be open (e.g. user is mid-way through the video
                            // panel on Flow's page). Don't block on it — the duration is always
                            // correctly re-applied from storage during the next actual run via
                            // applyVideoCreationMode(), regardless of whether this succeeds now.
                            try {
                                const panel = findVideoSettingsPanel();
                                if (panel) {
                                    await applyVideoDurationSelection(panel, value);
                                }
                            } catch (err) {
                                console.warn('[SET_SETTING] videoDurationSeconds live sync skipped:', err.message);
                            }
                            sendResponse({ success: true });
                            return;
                        }

                        if (setting === 'flowAspectRatio' || setting === 'flowQuantity' || setting === 'videoAspectRatio') {
                            // All three are tab options inside the same settings dropdown
                            // (opened via the summary chip). Reuse the verified panel path.
                            const panel = await ensureVideoSettingsPanelOpen();
                            if (!panel) {
                                throw new Error('Settings panel did not open.');
                            }
                            if (setting === 'flowAspectRatio' || setting === 'videoAspectRatio') {
                                await clickVideoPanelOption(panel, panelOptionTokenMatcher(value));
                            } else {
                                // Flow quantity tabs read "1x", "x2", "x3", "x4".
                                const qty = parseInt(value, 10);
                                await clickVideoPanelOption(panel, (txt) => {
                                    const tokens = normalizeText(txt).split(/\s+/);
                                    return tokens.includes(`${qty}x`) || tokens.includes(`x${qty}`);
                                });
                            }
                            await closeVideoSettingsPanelIfOpen();
                            sendResponse({ success: true });
                            return;
                        }

                        // Backward compatibility: old label-based sync
                        if (label) {
                            const btn = findButtonByText('button, [role="button"], [role="menuitem"], [data-radix-collection-item]', label);
                            if (btn) fireClick(btn);
                        }
                        sendResponse({ success: true });
                    } catch (e) {
                        console.warn('SET_SETTING sync failed:', e);
                        sendResponse({ success: false, error: e.message });
                    }
                })();
                return true;
            }

            if (message.action === 'DOWNLOAD_PAGE') {
                if (!claimDownloadOperation('page')) {
                    sendResponse({ success: true, status: 'STARTED', duplicateIgnored: true });
                    return false;
                }
                isHistoryDownloadStopped = false; // Reset stop flag
                const itemId = 'page_download_' + Date.now();
                safeSendMessage({ action: 'HANDSHAKE_ACK', itemId: itemId });
                sendResponse({ success: true, status: 'STARTED' });

                handleDownloadHistory({ ...message.payload, isHistoryMode: false })
                    .then(result => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result });
                    })
                    .catch(err => {
                        safeSendMessage({ action: 'PROMPT_FINISHED', id: itemId, result: { success: false, error: err.message } });
                    })
                    .finally(() => releaseDownloadOperation('page'));
                return false;
            }

            if (message.action === 'COLLECT_PAGE_IMAGES') {
                collectPageDownloadImages(message.payload || {})
                    .then((assets) => sendResponse({ success: true, assets }))
                    .catch((err) => sendResponse({ success: false, error: err.message }));
                return true;
            }

        };
        chrome.runtime.onMessage.addListener(onRuntimeMessage);

        // The next injected copy calls this before registering itself. Named
        // listeners are removable, unlike the previous anonymous callback.
        window.__FLOW_AUTOMATOR_TEARDOWN__ = () => {
            try { chrome.runtime.onMessage.removeListener(onRuntimeMessage); } catch (e) { }
            try { window.removeEventListener('message', onWindowBridgeMessage, true); } catch (e) { }
            isHistoryDownloadStopped = true;
        };

        async function collectPageDownloadImages({ selectors } = {}) {
            const serviceSelectors = selectors || {};
            const mediaSelector = [
                serviceSelectors.HISTORY_IMAGES || '',
                'img[src*="media.getMediaUrlRedirect"]',
                'video[src*="media.getMediaUrlRedirect"]',
                'source[src*="media.getMediaUrlRedirect"]'
            ].filter(Boolean).join(', ');
            const getScrollableContainers = () => {
                const candidates = [
                    document.querySelector('[data-testid="virtuoso-item-list"]')?.parentElement,
                    ...Array.from(document.querySelectorAll('[data-virtuoso-scroller="true"], .virtuoso-scroller, main, [role="main"]')),
                    document.scrollingElement,
                    document.documentElement
                ];
                const unique = [];
                candidates.forEach((el) => {
                    if (!el || unique.includes(el)) return;
                    const scrollHeight = Number(el.scrollHeight || 0);
                    const clientHeight = Number(el.clientHeight || window.innerHeight || 0);
                    if (scrollHeight <= clientHeight + 20 && el !== document.scrollingElement && el !== document.documentElement) return;
                    unique.push(el);
                });
                return unique.length ? unique : [document.documentElement];
            };
            const seen = new Set();
            const assets = [];
            const getMediaDownloadType = (el) => {
                if (!el) return null;
                const tag = el.tagName?.toLowerCase();
                const alt = (el.getAttribute('alt') || '').toLowerCase();
                const src = getMediaSourceUrl(el) || '';
                if (!src.includes('media.getMediaUrlRedirect')) return null;
                if (tag === 'video' || tag === 'source' || alt.includes('video')) return 'video';
                if (tag === 'img' && alt.includes('generated')) return 'image';
                return tag === 'img' ? 'image' : null;
            };
            const getMediaThumbnailSrc = (el, mediaType) => {
                if (!el) return '';
                if (mediaType === 'image') return getMediaSourceUrl(el) || '';
                const poster = el.getAttribute?.('poster') || '';
                if (poster) return poster;
                let parent = el.parentElement;
                for (let depth = 0; parent && depth < 7; depth += 1, parent = parent.parentElement) {
                    const thumbnail = parent.querySelector?.('img[src*="media.getMediaUrlRedirect"], img[src^="blob:"], img[src^="data:"]');
                    if (thumbnail && thumbnail !== el) {
                        return getMediaSourceUrl(thumbnail) || thumbnail.src || '';
                    }
                }
                return '';
            };
            const resetScroll = async () => {
                getScrollableContainers().forEach((el) => {
                    try { el.scrollTop = 0; } catch { }
                });
                try { window.scrollTo(0, 0); } catch { }
                await new Promise(r => setTimeout(r, 550));
            };
            const scrollStep = () => {
                let moved = false;
                getScrollableContainers().forEach((el) => {
                    try {
                        const before = el.scrollTop;
                        el.scrollTop = Math.min(Number(el.scrollHeight || 0), before + 720);
                        if (el.scrollTop !== before) moved = true;
                    } catch { }
                });
                try {
                    const beforeWindow = window.scrollY;
                    window.scrollBy(0, 720);
                    if (window.scrollY !== beforeWindow) moved = true;
                } catch { }
                return moved;
            };
            const collectVisible = () => {
                const mediaItems = Array.from(document.querySelectorAll(mediaSelector));
                mediaItems.forEach((img) => {
                    const mediaType = getMediaDownloadType(img);
                    if (!mediaType) return;
                    const id = getDownloadImageId(img);
                    const src = getMediaSourceUrl(img);
                    if (!id || !src || seen.has(id)) return;
                    seen.add(id);
                    assets.push({
                        id,
                        src,
                        thumbnailSrc: getMediaThumbnailSrc(img, mediaType),
                        prompt: findPromptForImage(img),
                        mediaType
                    });
                });
            };

            await resetScroll();

            let idleCount = 0;
            collectVisible();

            while (!isHistoryDownloadStopped && idleCount < 5) {
                const moved = scrollStep();
                await new Promise(r => setTimeout(r, 800));
                const before = assets.length;
                collectVisible();
                idleCount = moved || assets.length > before ? 0 : idleCount + 1;
            }

            return assets;
        }

        async function handleDownloadHistory({
            itemId,
            settings,
            selectors,
            isHistoryMode = true,
            selectedIds = [],
            preferUpscaledDownload = false,
            upscaleQuality = '1k'
        }) {
            isHistoryDownloadStopped = false;
            sentDownloadKeys.clear();
            const serviceSelectors = selectors || {};
            const selectedIdSet = new Set(Array.isArray(selectedIds) ? selectedIds : []);
            const wantsUpscaledDownload = preferUpscaledDownload === true;
            const selectedUpscaleQuality = upscaleQuality === '2k' ? '2k' : '1k';
            const log = (msg) => console.log(`[FlowAutomator] ${msg}`);
            const updateStatus = (detail) => {
                safeSendMessage({ action: 'UPDATE_PROGRESS', itemId, detail });
            };
            const processedItems = new Set();
            let upscaleFailures = 0;
            const getPageDownloadMediaType = (el) => {
                if (!el) return null;
                const tag = el.tagName?.toLowerCase();
                const alt = (el.getAttribute?.('alt') || '').toLowerCase();
                const src = getMediaSourceUrl(el) || '';
                if (!src.includes('media.getMediaUrlRedirect')) return null;
                if (tag === 'video' || tag === 'source' || alt.includes('video')) return 'video';
                if (tag === 'img' && alt.includes('generated')) return 'image';
                return tag === 'img' ? 'image' : null;
            };
            const pageMediaSelector = [
                serviceSelectors.HISTORY_IMAGES || '',
                'img[src*="media.getMediaUrlRedirect"]',
                'video[src*="media.getMediaUrlRedirect"]',
                'source[src*="media.getMediaUrlRedirect"]'
            ].filter(Boolean).join(', ');
            const isPageDownloadCandidate = (el) => {
                if (isHistoryMode) return true;
                return !!getPageDownloadMediaType(el);
            };
            const getDownloadScrollContainers = () => {
                const candidates = [
                    document.querySelector('[data-testid="virtuoso-item-list"]')?.parentElement,
                    ...Array.from(document.querySelectorAll('[data-virtuoso-scroller="true"], .virtuoso-scroller, main, [role="main"]')),
                    document.scrollingElement,
                    document.documentElement
                ];
                const unique = [];
                candidates.forEach((el) => {
                    if (!el || unique.includes(el)) return;
                    const scrollHeight = Number(el.scrollHeight || 0);
                    const clientHeight = Number(el.clientHeight || window.innerHeight || 0);
                    if (scrollHeight <= clientHeight + 20 && el !== document.scrollingElement && el !== document.documentElement) return;
                    unique.push(el);
                });
                return unique.length ? unique : [document.documentElement];
            };
            const resetDownloadScroll = async () => {
                getDownloadScrollContainers().forEach((el) => {
                    try { el.scrollTop = 0; } catch { }
                });
                try { window.scrollTo(0, 0); } catch { }
                await new Promise(r => setTimeout(r, 550));
            };
            const scrollDownloadStep = () => {
                let moved = false;
                getDownloadScrollContainers().forEach((el) => {
                    try {
                        const before = el.scrollTop;
                        el.scrollTop = Math.min(Number(el.scrollHeight || 0), before + 720);
                        if (el.scrollTop !== before) moved = true;
                    } catch { }
                });
                try {
                    const beforeWindow = window.scrollY;
                    window.scrollBy(0, 720);
                    if (window.scrollY !== beforeWindow) moved = true;
                } catch { }
                return moved;
            };

            try {
                const modeName = isHistoryMode ? 'History' : 'Page';
                log(`Starting Full ${modeName} Download...`);
                updateStatus(`Scanning ${modeName}...`);

                // 1. Check for images or the trigger
                let images = Array.from(document.querySelectorAll(pageMediaSelector))
                    .filter(isPageDownloadCandidate);

                // If none found and we are in history mode, try the trigger
                if (images.length === 0 && isHistoryMode) {
                    log('Tray might be closed, checking for "Show history" button...');
                    const trigger = findButtonByText('button, div', 'Show history') || findButtonByIcon('history');

                    if (trigger) {
                        log('Triggering history panel...');
                        fireClick(trigger);
                        await new Promise(r => setTimeout(r, 3000)); // Increased wait
                        images = Array.from(document.querySelectorAll(pageMediaSelector))
                            .filter(isPageDownloadCandidate);
                    } else {
                        log('STUCK: "Show history" button not found.');
                        return { success: false, error: 'Download history is only available in the each image with history' };
                    }
                }

                if (images.length === 0) {
                    log('STUCK: No history images visible.');
                    return { success: false, error: 'Download history is only available in the each image with history' };
                }

                log(`Starting exhaustive crawler...`);

                const totalEstimated = selectedIdSet.size || estimateTotalImages();
                let consecutiveNada = 0;
                // Downloading a specific selection can require scrolling much further
                // than a fresh top-to-bottom crawl (the selected items could be
                // anywhere in a long list), so it needs far more patience before
                // giving up than the generic "ran out of new items" cases below.
                const MAX_NADA = selectedIdSet.size ? 10 : (isHistoryMode ? 5 : 2);
                await resetDownloadScroll();

                while (!isHistoryDownloadStopped) {
                    if (selectedIdSet.size && processedItems.size >= selectedIdSet.size) {
                        log('Selected download targets completed.');
                        break;
                    }

                    const currentImages = Array.from(document.querySelectorAll(pageMediaSelector))
                        .filter(isPageDownloadCandidate);

                    // Find targets in current view
                    const viewTargets = currentImages.filter(img => {
                        const id = getDownloadImageId(img);
                        return id && !processedItems.has(id) && (!selectedIdSet.size || selectedIdSet.has(id));
                    });

                    if (viewTargets.length === 0) {
                        consecutiveNada++;
                        if (consecutiveNada >= MAX_NADA) {
                            log('Crawler: Exhausted all visible items.');
                            break;
                        }

                        // Smart scroll
                        const moved = scrollDownloadStep();
                        updateStatus('Scrolling for more...');
                        await new Promise(r => setTimeout(r, 1200));

                        // If we didn't actually move, we hit the bottom
                        if (!moved && consecutiveNada > 1) {
                            log('Bottom reached.');
                            break;
                        }
                        continue;
                    }

                    consecutiveNada = 0;

                    const targetsForThisPass = selectedIdSet.size ? viewTargets.slice(0, 1) : viewTargets;
                    for (const nextImage of targetsForThisPass) {
                        if (isHistoryDownloadStopped) break;

                        const itemId = getDownloadImageId(nextImage);

                        const currentShowing = processedItems.size + 1;
                        updateStatus(`Collecting: ${currentShowing} found...`);
                        updateProgressBar(currentShowing, Math.max(totalEstimated, currentShowing));

                        // Scroll to it for stability
                        nextImage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await new Promise(r => setTimeout(r, 400));

                        if (wantsUpscaledDownload) {
                            updateStatus(`Upscaling image ${currentShowing}...`);
                            const upscaledOk = await directDownloadItem(nextImage, itemId, {
                                preferUpscaledDownload: wantsUpscaledDownload,
                                updateStatus,
                                currentIndex: currentShowing,
                                upscaleQuality: selectedUpscaleQuality
                            }).catch((error) => {
                                log(`Upscale failed for ${itemId}: ${error.message}`);
                                return false;
                            });
                            if (!upscaledOk) {
                                upscaleFailures++;
                            }
                            processedItems.add(itemId);
                            await new Promise(r => setTimeout(r, 900));
                        } else {
                            if (await directDownloadItem(nextImage, itemId, {
                                preferUpscaledDownload: false,
                                updateStatus,
                                currentIndex: currentShowing
                            })) {
                                processedItems.add(itemId);
                            } else {
                                processedItems.add(itemId); // Skip on failure
                            }
                        }

                        if (selectedIdSet.size && processedItems.size >= selectedIdSet.size) {
                            break;
                        }
                    }

                    if (selectedIdSet.size && processedItems.size >= selectedIdSet.size) {
                        log('Selected download targets completed.');
                        break;
                    }

                    await new Promise(r => setTimeout(r, 200));
                }

                if (wantsUpscaledDownload && upscaleFailures > 0) {
                    return {
                        success: false,
                        error: `Upscale failed for ${upscaleFailures} item(s).`
                    };
                }

                // Cleanup progress bar
                const bar = document.getElementById('flow-progress-bar-container');
                if (bar) bar.remove();

                return { success: true, count: processedItems.size };
            } catch (err) {
                log(`CRITICAL ERROR: ${err.message}`);
                return { success: false, error: err.message };
            }
        }

        async function handlePromptSubmission({ itemId, quotaAttemptId = '', prompt, settings, selectors }) {
            while (isSubmittingUI) {
                await cancellableDelay(200, itemId);
            }
            assertPromptSubmissionActive(itemId);
            isSubmittingUI = true;
            window.__FLOW_AUTOMATOR_ACTIVE_SUBMISSION__ = true;
            const startedAt = Date.now();
            try {
                await injectFlowNetworkInterceptor();
                clearFlowGenerationNetworkFailure();
                assertPromptSubmissionActive(itemId);
            const serviceSelectors = selectors || {};
            const updateProgress = (detail) => {
                safeSendMessage({ action: 'UPDATE_PROGRESS', itemId, quotaAttemptId, detail });
            };

            console.log(`Starting Automation Flow (v${chrome.runtime.getManifest().version})...`);

                // 1. Prepare Prompt
                let targetPrompt = prompt;
                if (prompt.startsWith('[Model: ')) {
                    const modelMatch = prompt.match(/^\[Model: ([^\]]+)\]\s*(.*)$/);
                    if (modelMatch) targetPrompt = modelMatch[2];
                }
                const promptMentionTokens = [];
                const videoAssetQueue = Array.isArray(settings?.videoAssetQueue)
                    ? normalizeReferenceAssets(settings.videoAssetQueue)
                    : [];
                
                // Prefer each item's video start image, then fall back to originalIndex scene matching.
                const targetIndex = settings?.videoOriginalIndex ?? settings?.queueIndex ?? 0;
                const videoQueueEntry = settings?.videoStartImage || videoAssetQueue[targetIndex] || videoAssetQueue[0] || null;
                
                const isVideoRun = settings?.flowType === 'video';
                const rawVideoMode = normalizeText(settings?.videoMode);
                const videoMode = rawVideoMode.includes('frame')
                    ? 'frames'
                    : rawVideoMode.includes('ingredient')
                        ? 'ingredients'
                        : '';
                const videoModel = settings?.videoModel || settings?.flowModel || '';
                const videoDurationSeconds = Number(settings?.videoDurationSeconds) || null;
                if (isVideoRun && !videoMode) {
                    throw new Error('Choose Ingredients or Frames for this video prompt before running.');
                }
                if (isVideoRun && (videoQueueEntry?.videoPrompt || videoQueueEntry?.prompt)) {
                    targetPrompt = videoQueueEntry.videoPrompt || videoQueueEntry.prompt || targetPrompt;
                }
                if (isVideoRun && settings?.videoVoiceToken) {
                    appendUniquePromptToken(promptMentionTokens, settings.videoVoiceToken);
                }

                const isDownloadBtn = (btn) => isDownloadLikeButton(btn);

                updateProgress('Preparing submit control...');
                let genBtn = safeQuerySelector(serviceSelectors.GENERATE_BUTTON);

                // Validate if found by selector
                if (isDownloadBtn(genBtn)) genBtn = null;

                if (!genBtn) {
                    const fallbackBtns = [
                        findButtonByIcon('arrow_forward'),
                        findButtonByIcon('send'),
                        findButtonByIcon('arrow_upward'),
                        findButtonByText('button', 'Create'),
                        findButtonByText('button', 'Generate'),
                        findButtonByText('button', 'Send'),
                        findButtonByText('button', 'Run')
                    ];
                    genBtn = fallbackBtns.find(b => b && !isDownloadBtn(b));
                }

                if (!genBtn) {
                    // Search for any button with an arrow icon or specific text, excluding download/history
                    const allBtns = Array.from(document.querySelectorAll('button, [role="button"]'));
                    genBtn = allBtns.find(b => {
                        if (isDownloadBtn(b)) return false;
                        const txt = (b.innerText || b.textContent || '').toLowerCase();
                        const hasIcon = b.querySelector('svg, i, span.material-icons, span.google-symbols');
                        return /generate|create|send|run/i.test(txt) || (hasIcon && /arrow|send/i.test(hasIcon.innerText || hasIcon.innerHTML || ''));
                    });
                }

                // Extreme fallback: look for the button closest to the prompt input
                if (!genBtn) {
                    const input = safeQuerySelector(serviceSelectors.PROMPT_INPUT);
                    if (input) {
                        const parent = input.closest('div[role="main"], form, body');
                        const buttons = Array.from(parent.querySelectorAll('button'));
                        // Usually the generate button is the last button inside the input's container
                        genBtn = buttons[buttons.length - 1];
                    }
                }

                if (!genBtn) {
                    console.warn('Generate button not found, will submit with Enter fallback.');
                    updateProgress('Generate button not found, using Enter fallback...');
                }

                // 2. Apply Model / Ratio / Quantity for image runs (video settings
                // were already applied above via applyVideoCreationMode).
                const context = getFlowContext();
                const effectiveSettings = { ...settings };

                if (context.isSubProject) {
                    if (effectiveSettings.flowType === 'video') {
                        updateProgress('Sub-project mode: video is unavailable, using image.');
                    }
                    effectiveSettings.flowType = 'image';
                    effectiveSettings.flowQuantity = 1;
                }

                if (isVideoRun) {
                    updateProgress(videoMode === 'frames' ? 'Preparing Frames to Video...' : 'Preparing Ingredients to Video...');
                    try {
                        await applyVideoCreationMode(videoMode, videoModel, videoDurationSeconds, settings?.videoAspectRatio);
                    } catch (videoSettingsError) {
                        // Unlike the image path, a video model/duration mismatch can mean
                        // a completely different (and differently-priced) generation, so
                        // this must still fail the prompt rather than silently continue —
                        // but it must ALSO close the settings panel and re-throw through a
                        // normal error (not leave the panel open with the run stuck), so
                        // the outer handler can mark this item failed and move to the next.
                        console.warn('[FlowAutomator] Video settings could not be applied:', videoSettingsError.message);
                        updateProgress(`Video settings failed: ${videoSettingsError.message}`);
                        await closeVideoSettingsPanelIfOpen();
                        throw videoSettingsError;
                    }
                } else if (effectiveSettings.flowModel || effectiveSettings.flowAspectRatio || effectiveSettings.flowQuantity) {
                    updateProgress('Applying image settings...');
                    try {
                        await applyImageCreationSettings(
                            effectiveSettings.flowModel,
                            effectiveSettings.flowAspectRatio,
                            effectiveSettings.flowQuantity
                        );
                    } catch (settingsError) {
                        // Image generation itself works without touching the panel —
                        // Flow keeps whatever was last selected. Warn and continue
                        // instead of failing the whole prompt over a settings click.
                        console.warn('[FlowAutomator] Image settings could not be applied, continuing with current Flow settings:', settingsError.message);
                        updateProgress('Image settings unchanged (panel not reachable). Continuing...');
                        await closeVideoSettingsPanelIfOpen();
                    }
                }

                // Initial media snapshot. We refresh this again after submit starts so
                // reference/previous images cannot be mistaken for the generated result.
                const completionSelectors = serviceSelectors.HISTORY_IMAGES
                    ? [serviceSelectors.HISTORY_IMAGES]
                    : (serviceSelectors.COMPLETION_SIGNALS || ['img', 'video', 'canvas']);
                let completionBaselineSnapshot = snapshotMedia(completionSelectors);

                // 2.5. Select reference asset if configured
                const referenceAssetSelections = Array.isArray(settings?.referenceAssetSelections)
                    ? settings.referenceAssetSelections
                    : [];
                const legacyReferenceAsset = settings?.referenceAssetId || settings?.referenceAssetSrc
                    ? [{ id: settings.referenceAssetId || null, src: settings.referenceAssetSrc || null }]
                    : [];
                const referencePool = Array.isArray(settings?.referenceAssets) ? settings.referenceAssets : [];
                const assetsToApply = isVideoRun
                    ? (videoMode === 'ingredients'
                        ? normalizeReferenceAssets(settings?.videoIngredientSelections || [])
                        : [])
                    : normalizeReferenceAssets(referenceAssetSelections.length ? referenceAssetSelections : legacyReferenceAsset)
                        .map(a => {
                            const label = a.label || a.displayText
                                || referencePool.find(r => r.id === a.id || r.ingredientImageId === a.id)?.displayText
                                || '';
                            return label ? { ...a, label } : a;
                        });
                // Character pool has displayText; selections (normalized) may have empty label.
                // Enrich each selection with displayText from the full character pool.
                const characterPool = Array.isArray(settings?.characterAssets) ? settings.characterAssets : [];
                const characterAssetsToApply = !isVideoRun
                    ? normalizeReferenceAssets(
                        Array.isArray(settings?.characterAssetSelections) && settings.characterAssetSelections.length
                            ? settings.characterAssetSelections
                            : (settings?.characterAssetSelection ? [settings.characterAssetSelection] : [])
                    ).map(a => {
                        const label = a.label || a.displayText
                            || characterPool.find(c => c.id === a.id || c.characterServerId === a.id)?.displayText
                            || '';
                        return { ...a, label, type: 'character' };
                    })
                    : [];

                // Auto-detect mentions in prompt and apply them even if not explicitly selected
                const hasMentionInPrompt = /@([\p{L}\p{N}_]+)/u.test(targetPrompt);
                const mentionImageSearchEnabled = !!settings?.perPromptAssetsEnabled || (isVideoRun && videoMode === 'ingredients') || hasMentionInPrompt;
                if (!mentionImageSearchEnabled) {
                    // Mention image search is OFF → strip all @ from prompt, send as plain text
                    targetPrompt = targetPrompt.replace(/@/g, '');
                    console.log('[FlowAutomator] Auto-mention image search disabled. Stripped @ from prompt.');
                } else {
                    try {
                        updateProgress('Scanning project library for mentions...');
                        const scannedAssets = await scanAssetsViaBridge();
                        console.log('[FlowAutomator] Scanned assets for auto-mention:', JSON.stringify(scannedAssets));
                        
                        const promptLower = targetPrompt.toLowerCase();
                        const mentionedKeys = new Set();
                        
                        // 1. Identify which assets in the library are mentioned in the prompt
                        if (scannedAssets && Object.keys(scannedAssets).length > 0) {
                            for (const key of Object.keys(scannedAssets)) {
                                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                const regex = new RegExp('@' + escapedKey + '(?!\\p{L}|\\p{N})', 'iu');
                                if (regex.test(promptLower)) {
                                    mentionedKeys.add(key);
                                }
                            }
                        }

                        // 2. Add mentioned assets to manual selection lists
                        //    Keep @name in prompt for found assets → bridge.js will convert to AT_TAG_TYPE Slate node
                        for (const key of mentionedKeys) {
                            const asset = scannedAssets[key];
                            const assetName = asset.displayText || key;
                            
                            if (asset.characterServerId) {
                                const existingIdx = characterAssetsToApply.findIndex(a => stripFeId(a.id || '').toLowerCase() === stripFeId(asset.characterServerId).toLowerCase());
                                if (existingIdx === -1) {
                                    characterAssetsToApply.push({
                                        id: asset.characterServerId,
                                        src: '',
                                        label: assetName,
                                        type: 'character'
                                    });
                                    updateProgress(`Auto-selected character: @${key}`);
                                } else if (!characterAssetsToApply[existingIdx].label) {
                                    // Enrich empty-label entry with the name found by bridge scan
                                    characterAssetsToApply[existingIdx].label = assetName;
                                }
                            } else if (asset.ingredientImageId) {
                                const alreadyAdded = assetsToApply.some(a => stripFeId(a.id || '').toLowerCase() === stripFeId(asset.ingredientImageId).toLowerCase());
                                if (!alreadyAdded) {
                                    assetsToApply.push({
                                        id: asset.ingredientImageId,
                                        src: '',
                                        label: assetName
                                    });
                                    updateProgress(`Auto-selected image: @${key}`);
                                }
                            }
                        }

                        // 3. Check for any unmatched @mentions.
                        // First, strip all successfully matched mentions from a temp copy of the prompt.
                        // We sort the keys by length descending to replace longer names first (e.g. "@blue car" before "@blue").
                        let tempPrompt = targetPrompt;
                        const sortedKeys = Array.from(mentionedKeys).sort((a, b) => b.length - a.length);
                        for (const key of sortedKeys) {
                            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            // Match @key, ensuring it is preceded by start of line or non-word char, and followed by non-word/non-number char
                            const regex = new RegExp('(?:^|[^\\p{L}\\p{N}_])@' + escapedKey + '(?!\\p{L}|\\p{N})', 'giu');
                            tempPrompt = tempPrompt.replace(regex, (match) => {
                                const prefix = match.startsWith('@') ? '' : match[0];
                                return prefix;
                            });
                        }

                        // 3. Strip '@' from any remaining unmatched mentions (ensuring they are preceded by start of line or non-word characters to avoid emails)
                        const unmatchedRegex = /(?:^|[^\p{L}\p{N}_])@([\p{L}\p{N}_]+)/gu;
                        let match;
                        const unmatchedNames = new Set();
                        while ((match = unmatchedRegex.exec(tempPrompt)) !== null) {
                            unmatchedNames.add(match[1]);
                        }
                        for (const name of unmatchedNames) {
                            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const replaceRegex = new RegExp('(?:^|[^\\p{L}\\p{N}_])@(' + escapedName + ')(?!\\p{L}|\\p{N})', 'giu');
                            targetPrompt = targetPrompt.replace(replaceRegex, (fullMatch, group1) => {
                                const prefix = fullMatch.startsWith('@') ? '' : fullMatch[0];
                                return prefix + group1;
                            });
                        }
                    } catch (err) {
                        console.error('[FlowAutomator] Auto-mention detection and filtering failed:', err);
                        // On other errors, strip all @ to be safe
                        targetPrompt = targetPrompt.replace(/@/g, '');
                    }
                }

                if (isVideoRun && videoMode === 'ingredients' && assetsToApply.length === 0) {
                    // Ingredient images are optional — Flow can generate Ingredients-mode
                    // video from the text prompt alone, same as any other text-to-video run.
                    updateProgress('No ingredient image selected, continuing with text-only prompt...');
                }

                const compactAssetPickerMode = !isVideoRun
                    && (characterAssetsToApply.length || assetsToApply.length)
                    && (window.innerWidth || document.documentElement?.clientWidth || 0) > 0
                    && (window.innerWidth || document.documentElement?.clientWidth || 0) < MIN_FLOW_ASSET_WINDOW_WIDTH_PX;
                const runUsesAssets = !isVideoRun && (characterAssetsToApply.length || assetsToApply.length);
                if (runUsesAssets) {
                    assertFlowPanelWideEnoughForAssets();
                }
                const videoStartFrame = settings?.videoStartFrameSelection || settings?.videoStartImage || (videoMode === 'frames' ? videoQueueEntry : null);
                const videoEndFrame = settings?.videoEndFrameSelection || null;

                const resolvePromptComposer = async (phaseLabel = 'Resolving Flow composer') => {
                    updateProgress(phaseLabel);
                    dismissVisiblePromptAlerts();
                    let resolvedInput = null;
                    let resolvedButton = null;
                    for (let attempt = 0; attempt < 5; attempt++) {
                        try {
                            const pair = findStableFlowComposer();
                            resolvedInput = pair?.input || null;
                            resolvedButton = pair?.submitButton || null;
                            if (!resolvedInput) {
                                resolvedInput = await findWorkingPromptInput(serviceSelectors);
                            }
                            if (resolvedInput && !resolvedButton) {
                                resolvedButton = findClosestSubmitButton(resolvedInput, genBtn);
                            }
                            if (resolvedInput) break;
                        } catch (e) {
                            // Keep retrying while the page settles.
                        }
                        updateProgress(`Resolving composer... (${attempt + 1}/5)`);
                        await new Promise(r => setTimeout(r, 1200));
                    }
                    if (!resolvedInput) {
                        throw new Error('Prompt input field not found. Make sure you are in the project creation view.');
                    }
                    return { input: resolvedInput, submitButton: resolvedButton };
                };

                const focusPromptInput = async (input) => {
                    try {
                        input.focus();
                        await new Promise(r => setTimeout(r, 80));
                        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                        input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                        input.click();
                    } catch (e) { }
                    await new Promise(r => setTimeout(r, 150));
                };

                let compactPromptPrefilled = false;
                let compactPromptInput = null;
                let compactPromptButton = null;
                const promptFillOptions = {
                    // After pre-fill + asset panel selection, use preserveMedia so the
                    // final text write doesn't wipe chips that "Add to Prompt" created.
                    preserveExistingMedia: !!(compactAssetPickerMode || characterAssetsToApply.length || assetsToApply.length),
                    assets: [
                        ...characterAssetsToApply,
                        ...assetsToApply,
                        ...(videoStartFrame ? [videoStartFrame] : []),
                        ...(videoEndFrame ? [videoEndFrame] : [])
                    ]
                };

                let videoStartImageSelected = false;
                if (characterAssetsToApply.length) {
                    for (let characterIndex = 0; characterIndex < characterAssetsToApply.length; characterIndex += 1) {
                        assertPromptSubmissionActive(itemId);
                        assertFlowPanelWideEnoughForAssets();
                        updateProgress(characterAssetsToApply.length > 1
                            ? `Selecting character ${characterIndex + 1}/${characterAssetsToApply.length}...`
                            : 'Selecting character...');
                        const characterResult = await selectReferenceAsset(characterAssetsToApply[characterIndex], { mode: 'character' });
                        assertPromptSubmissionActive(itemId);
                        if (!characterResult.ok) {
                            console.warn(`[FlowAutomator] Character selection skipped (not found): ${characterResult.error}`);
                            updateProgress(`Character skipped (not found: ${characterResult.error})`);
                        }
                        await cancellableDelay(250, itemId);
                    }
                    updateProgress('Character ready.');
                    await cancellableDelay(350, itemId);
                }

                if (isVideoRun && videoMode === 'frames') {
                    if (!videoStartFrame) {
                        throw new Error('Frames to Video requires a start frame.');
                    }
                    assertPromptSubmissionActive(itemId);
                    updateProgress('Selecting video start frame...');
                    const startResult = await selectVideoStartImage(videoStartFrame, { slot: 'start', cleanupEnd: !videoEndFrame });
                    if (!startResult.ok) {
                        throw new Error(`Video start frame selection failed: ${startResult.error}`);
                    }
                    videoStartImageSelected = true;
                    if (videoEndFrame) {
                        updateProgress('Selecting video end frame...');
                        const endResult = await selectVideoStartImage(videoEndFrame, { slot: 'end' });
                        if (!endResult.ok) {
                            updateProgress(`Optional end frame skipped: ${endResult.error}`);
                            console.warn(`[VideoStartImage] Optional end frame skipped: ${endResult.error}`);
                        }
                    }
                    updateProgress('Video frames ready.');
                    await cancellableDelay(400, itemId);
                } else if (assetsToApply.length) {
                    assertPromptSubmissionActive(itemId);
                    if (!isVideoRun) {
                        assertFlowPanelWideEnoughForAssets();
                    }
                    updateProgress(isVideoRun ? 'Selecting video ingredients...' : 'Selecting reference image...');
                    console.log(`[ReferenceAsset] Applying ${assetsToApply.length} asset(s):`, JSON.stringify(assetsToApply.map(a => ({ id: a.id, label: a.label }))));
                    if (isVideoRun) {
                        console.log(`[FlowAutomator] Selecting ${assetsToApply.length} video ingredients:`, JSON.stringify(assetsToApply.map(a => ({id: a.id, label: a.label, src: (a.src||'').substring(0,50)}))));
                        const ingredientResult = await selectReferenceAssets(assetsToApply, { mode: 'videoIngredient' });
                        if (!ingredientResult.ok) {
                            console.warn(`[FlowAutomator] Video ingredient selection skipped (not found): ${ingredientResult.error}`);
                            updateProgress(`Ingredients skipped (not found)`);
                        } else if (ingredientResult.count < assetsToApply.length) {
                            console.warn(`[FlowAutomator] Only ${ingredientResult.count} of ${assetsToApply.length} ingredients were found.`);
                            updateProgress(`Some ingredients skipped (not found)`);
                        }
                        videoStartImageSelected = true;
                        updateProgress('Video ingredients ready.');
                    } else {
                        const assetResult = await selectReferenceAssets(assetsToApply, { mode: 'image' });
                        assertPromptSubmissionActive(itemId);
                        if (assetResult.ok && !assetResult.skipped) {
                            updateProgress('Reference image ready.');
                        } else if (!assetResult.ok) {
                            console.warn(`[FlowAutomator] Reference asset selection skipped (not found): ${assetResult.error}`);
                            updateProgress(`Reference image skipped (not found)`);
                        }
                    }
                    if (compactAssetPickerMode) {
                        const closedPanel = await closeReferenceMediaPanelIfOpen();
                        updateProgress(closedPanel ? 'Reference picker closed. Preparing submit...' : 'Preparing submit...');
                    }
                    // Re-focus the Slate editor after asset panel interaction
                    // (panel open/close steals focus from the composer)
                    await cancellableDelay(400, itemId);
                    try {
                        const slateRoot = document.querySelector('[data-slate-editor="true"]');
                        if (slateRoot) {
                            slateRoot.click();
                            slateRoot.focus();
                        }
                    } catch (e) { }
                    await cancellableDelay(300, itemId);
                }

                targetPrompt = applyPromptAssetAliases(targetPrompt, [
                    ...characterAssetsToApply,
                    ...assetsToApply,
                    ...(videoStartFrame ? [videoStartFrame] : []),
                    ...(videoEndFrame ? [videoEndFrame] : [])
                ]);
                appendUniquePromptToken(promptMentionTokens, buildPromptAssetNameGuide([
                    { role: 'Character', assets: characterAssetsToApply },
                    { role: isVideoRun ? 'Ingredient' : 'Reference image', assets: assetsToApply },
                    { role: 'Start frame', assets: videoStartFrame ? [videoStartFrame] : [] },
                    { role: 'End frame', assets: videoEndFrame ? [videoEndFrame] : [] }
                ]));
                targetPrompt = mergePromptTokens(targetPrompt, promptMentionTokens);

                // 3. Resolve prompt input + submit button as a composer pair
                assertPromptSubmissionActive(itemId);
                dismissVisiblePromptAlerts();
                const runValidationBaseline = getPromptRequiredAlertText();

                let input;
                let genBtnPair = null;
                if (compactPromptPrefilled && compactPromptInput?.isConnected) {
                    input = compactPromptInput;
                    genBtnPair = compactPromptButton || findClosestSubmitButton(input, genBtn);
                    updateProgress('Using compact pre-filled composer.');
                } else {
                    const resolvedPair = await resolvePromptComposer(compactPromptPrefilled
                        ? 'Resolving compact pre-filled composer after asset selection...'
                        : 'Resolving Flow composer...');
                    input = resolvedPair.input;
                    genBtnPair = resolvedPair.submitButton;
                }

                updateProgress(`Using prompt input: ${describeInput(input)}`);
                if (genBtnPair) {
                    updateProgress(`Using submit button: ${describeButton(genBtnPair)}`);
                }

                // Focus gently
                assertPromptSubmissionActive(itemId);
                await focusPromptInput(input);
                assertPromptSubmissionActive(itemId);

                const initialFill = compactPromptPrefilled
                    ? { target: input, method: 'compact-prefilled', textLength: readPromptInputValue(input).length }
                    : await fillPromptInput(input, targetPrompt, promptFillOptions);
                if (initialFill?.target) {
                    updateProgress(`Resolved editable: ${describeEditableState(initialFill.target)}`);
                    updateProgress(`Fill method: ${initialFill.method}, text=${initialFill.textLength}`);
                }
                const reflectedPrompt = normalizeText(readPromptInputValue(input));
                const cleanReflected = reflectedPrompt.replace(/@/g, '');
                const cleanTarget = normalizeText(targetPrompt).replace(/@/g, '');
                if (!compactPromptPrefilled && (!reflectedPrompt || !cleanReflected.includes(cleanTarget.slice(0, 20)))) {
                    await cancellableDelay(300, itemId);
                    assertPromptSubmissionActive(itemId);
                    const retryFill = await fillPromptInput(input, targetPrompt, promptFillOptions);
                    if (retryFill?.target) {
                        updateProgress(`Retry fill method: ${retryFill.method}, text=${retryFill.textLength}`);
                    }
                }

                const finalPromptText = readPromptInputValue(input);
                if (!finalPromptText || finalPromptText.trim().length < 3) {
                    updateProgress('Prompt reflection is delayed. Trying submit with validation guard...');
                }

                await cancellableDelay(50, itemId);

                genBtn = genBtnPair || findClosestSubmitButton(input, genBtn);
                if (genBtn) {
                    updateProgress(`Using submit button: ${describeButton(genBtn)}`);
                }

                // 4. Submit prompt on the resolved Flow composer only.
                let generationStarted = false;
                let validationTriggered = false;
                let lastFillDiagnostics = 'fill=unknown';
                updateProgress(`Prompt length: ${targetPrompt.length}`);
                updateProgress(`Candidate fields: ${describeInput(input)}`);
                const candidateInput = input;
                const candidateBtn = genBtn;
                const alertBefore = getPromptRequiredAlertText();
                const wasDisabled = candidateBtn ? isDisabledButton(candidateBtn) : true;

                try {
                    assertPromptSubmissionActive(itemId);
                    if (compactPromptPrefilled) {
                        const existingTextLength = readPromptInputValue(candidateInput).length;
                        lastFillDiagnostics = `fill=compact-prefilled; ${describeEditableState(candidateInput)}; ${describeActiveEditableState()}; text=${existingTextLength}`;
                        updateProgress(`Submit fill skipped: compact assets are already attached, text=${existingTextLength}`);
                    } else {
                        const submitFill = await fillPromptInput(candidateInput, targetPrompt, promptFillOptions);
                        await cancellableDelay(80, itemId);
                        if (submitFill?.target) {
                            lastFillDiagnostics = `fill=${submitFill.method}; ${describeEditableState(submitFill.target)}; ${describeActiveEditableState()}; text=${submitFill.textLength}`;
                            updateProgress(`Submit fill target: ${describeEditableState(submitFill.target)}`);
                            updateProgress(`Submit fill method: ${submitFill.method}, text=${submitFill.textLength}`);
                        }
                    }
                    updateProgress(`Field text length: ${readPromptInputValue(candidateInput).length}`);
                } catch (e) { }

                const promptBound = compactPromptPrefilled
                    ? isPromptBoundEnough(readPromptInputValue(candidateInput), targetPrompt)
                    : await ensurePromptInInput(candidateInput, targetPrompt, promptFillOptions);
                if (!promptBound) {
                    const weakTextLen = (readPromptInputValue(candidateInput) || '').trim().length;
                    const bindError = new Error(`Prompt was not inserted into the selected Flow composer (len=${weakTextLen}). Create was not pressed.`);
                    bindError.doNotRetry = true;
                    throw bindError;
                }

                if (settings?.dryRunVideoSetup === true) {
                    const finalPromptValue = readPromptInputValue(candidateInput) || '';
                    const promptVerified = isPromptBoundEnough(finalPromptValue, targetPrompt);
                    const modeVerified = isOutputTypeChipActive('video');
                    const imageVerified = videoMode === 'ingredients'
                        ? (assetsToApply.length === 0 || !!videoStartImageSelected)
                        : !!videoStartImageSelected;
                    if (!modeVerified) {
                        throw new Error('Dry run verification failed: video mode chip was not active.');
                    }
                    if (!imageVerified) {
                        throw new Error(videoMode === 'ingredients'
                            ? 'Dry run verification failed: ingredient images were not selected.'
                            : 'Dry run verification failed: start image was not selected.');
                    }
                    if (!promptVerified) {
                        throw new Error('Dry run verification failed: prompt was not bound to the composer.');
                    }
                    updateProgress('Dry run ready. Video settings, assets, and prompt are set. Create was not pressed.');
                    return {
                        success: true,
                        dryRun: true,
                        queued: false,
                        prompt: targetPrompt,
                        assetId: assetsToApply[0]?.id || null
                    };
                }

                if (candidateBtn && isDisabledButton(candidateBtn)) {
                    await cancellableDelay(550, itemId);
                    assertPromptSubmissionActive(itemId);
                    const refreshedBtn = findClosestSubmitButton(candidateInput, candidateBtn);
                    if (refreshedBtn && !isDisabledButton(refreshedBtn)) {
                        updateProgress(`Submit button enabled after wait: ${describeButton(refreshedBtn)}`);
                        try {
                            refreshedBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
                            await cancellableDelay(60, itemId);
                            assertPromptSubmissionActive(itemId);
                            // Try React fiber click first (bypasses isTrusted)
                            const bridgeClicked = await tryClickSubmitViaBridge(refreshedBtn);
                            assertPromptSubmissionActive(itemId);
                            updateProgress(`Bridge click result: ${bridgeClicked}`);
                            if (!bridgeClicked) {
                                assertPromptSubmissionActive(itemId);
                                fireClickSequence(refreshedBtn);
                            }
                        } catch (e) { }
                        generationStarted = await waitForGenerationStart(serviceSelectors, candidateInput, refreshedBtn, 4200);
                        if (generationStarted) {
                            genBtn = refreshedBtn;
                        }
                    }

                    if (!generationStarted) {
                        if (!wasDisabled) {
                            updateProgress('Submit button became disabled. Trying Enter fallback...');
                        } else {
                            updateProgress('Submit button is disabled. Trying Enter fallback...');
                        }
                        assertPromptSubmissionActive(itemId);
                        generationStarted = await tryKeyboardSubmitVariants(candidateInput, serviceSelectors, candidateBtn || genBtn, updateProgress);
                    }
                    if (!generationStarted && hasNewPromptRequiredValidation(alertBefore)) {
                        validationTriggered = true;
                        updateProgress('Prompt validation fired after Enter fallback.');
                    }
                } else if (candidateBtn) {
                    updateProgress(`Trying submit button: ${describeButton(candidateBtn)}`);
                    let bridgeOk = false;
                    try {
                        candidateBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
                        await cancellableDelay(60, itemId);
                        assertPromptSubmissionActive(itemId);
                        updateProgress('Attempting React fiber click via bridge...');
                        bridgeOk = await tryClickSubmitViaBridge(candidateBtn);
                        assertPromptSubmissionActive(itemId);
                        updateProgress(`Bridge click: ${bridgeOk ? 'success' : 'fallback to DOM events'}`);
                        if (!bridgeOk) {
                            assertPromptSubmissionActive(itemId);
                            fireClickSequence(candidateBtn);
                        }
                    } catch (e) { }

                    if (bridgeOk) {
                        updateProgress('Bridge click confirmed. Verifying generation start...');
                        generationStarted = await waitForGenerationStart(
                            serviceSelectors,
                            candidateInput,
                            candidateBtn,
                            settings?.flowUpscaledDownload ? 12000 : 5000
                        );
                        if (!generationStarted && !settings?.flowUpscaledDownload) {
                            // Non-upscale mode can keep the old permissive behavior.
                            // Upscale mode must be strict because it can download a previous image.
                            generationStarted = true;
                        }
                    } else {
                        // DOM event fallback — wait for a UI signal
                        generationStarted = await waitForGenerationStart(serviceSelectors, candidateInput, candidateBtn, 5000);
                        if (!generationStarted && hasNewPromptRequiredValidation(alertBefore)) {
                            validationTriggered = true;
                            updateProgress('Prompt validation fired after submit click.');
                        }
                    }
                }

                if (!generationStarted) {
                    updateProgress('Trying Enter submit...');
                    assertPromptSubmissionActive(itemId);
                    generationStarted = await tryKeyboardSubmitVariants(candidateInput, serviceSelectors, candidateBtn || genBtn, updateProgress);
                    if (!generationStarted && hasNewPromptRequiredValidation(alertBefore)) {
                        validationTriggered = true;
                        updateProgress('Prompt validation fired after Enter submit.');
                    }
                }

                if (!generationStarted) {
                    updateProgress('Composer-pair submit failed. Global fallback button is disabled for safety.');
                }

                if (!generationStarted && (validationTriggered || hasNewPromptRequiredValidation(runValidationBaseline))) {
                    const validationError = new Error(`Flow rejected submit: prompt must be provided. The selected Flow composer did not bind the prompt. ${lastFillDiagnostics}`);
                    validationError.doNotRetry = true;
                    throw validationError;
                }

                if (!generationStarted) {
                    const failure = getFlowGenerationNetworkFailureSince(startedAt);
                    if (failure) {
                        const networkError = new Error(formatFlowGenerationNetworkFailure(failure));
                        const status = Number(failure.status) || 0;
                        // Retrying a deterministic client rejection can create
                        // multiple billed generation attempts for one queue row.
                        networkError.doNotRetry = status >= 400 && status < 500 && status !== 429;
                        throw networkError;
                    }
                    throw new Error('Generation did not start. Check that the Flow prompt box is active and the Generate button is visible.');
                }

                updateProgress('Prompt submitted. Waiting for generated image...');

                const shouldWaitForImageResponse = settings?.waitForImageResponse !== false
                    || (!!settings?.autoDownload && !!settings?.flowUpscaledDownload);

                if (!shouldWaitForImageResponse) {
                    isSubmittingUI = false;
                    updateProgress('Prompt submitted. Moving to next queue item...');
                    return { success: true, skippedCompletionWait: true, queued: true };
                }

                // Re-baseline after Flow accepts the prompt. This prevents reference
                // images or old visible results from being downloaded as the new output.
                await new Promise(r => setTimeout(r, settings?.flowUpscaledDownload ? 1200 : 400));
                completionBaselineSnapshot = snapshotMedia(completionSelectors);

                // 5. Wait for Completion
                isSubmittingUI = false;
                updateProgress(settings?.flowUpscaledDownload
                    ? 'Waiting for the newly generated image before upscale download...'
                    : 'Waiting for result (2-4 min)...');
                const timeoutMs = (settings.timeoutSeconds || 5) * 60 * 1000;
                const completionResult = await waitForCompletion(serviceSelectors, timeoutMs, completionBaselineSnapshot, {
                    disableLatestFallback: !!settings?.flowUpscaledDownload,
                    minNewMediaDelayMs: settings?.flowUpscaledDownload ? 10000 : 0,
                    strictNewMedia: !!settings?.flowUpscaledDownload,
                    expectedPrompt: settings?.flowUpscaledDownload ? targetPrompt : ''
                });

                if (completionResult.success && settings?.flowType === 'video') {
                    const videoCandidate = findLatestVideoCandidate(serviceSelectors);
                    if (videoCandidate?.url) {
                        completionResult.url = videoCandidate.url;
                        completionResult.mediaType = 'video';
                    }
                }

                if (completionResult.success) {
                    const freshName = String(settings?.outputName || '').trim();
                    if (freshName) {
                        try {
                            const candidate = completionResult.candidateKey
                                ? findCompletionMediaCandidate(serviceSelectors, completionResult)
                                : null;
                            if (candidate && candidate.el) {
                                await tryRenameFlowAssetOnPage(candidate.el, freshName, updateProgress);
                            }
                        } catch (renameErr) {
                            console.error('Page renaming failed:', renameErr);
                        }
                    }
                }

                if (completionResult.success && settings.autoDownload) {
                    try {
                        const mediaType = completionResult.mediaType || (settings?.flowType === 'video' ? 'video' : 'image');

                        if (settings?.flowUpscaledDownload && mediaType !== 'video') {
                            updateProgress('Upscaling generated image before download...');
                            const candidate = completionResult.candidateKey
                                ? findCompletionMediaCandidate(serviceSelectors, completionResult)
                                : null;
                            const canUpscale = candidate?.el &&
                                candidate.key === completionResult.candidateKey &&
                                candidate.el.tagName?.toLowerCase() === 'img';
                            const upscaledDone = canUpscale
                                ? await directDownloadItem(candidate.el, completionResult.candidateKey || completionResult.url || `generated_${Date.now()}`, {
                                    preferUpscaledDownload: true,
                                    upscaleQuality: settings?.flowUpscaleQuality,
                                    updateStatus: updateProgress,
                                    currentIndex: (settings.queueIndex ?? 0) + 1
                                })
                                : false;

                            if (!upscaledDone) {
                                const upscaleQualityLabel = normalizeUpscaleDownloadQuality(settings?.flowUpscaleQuality).toUpperCase();
                                return {
                                    success: false,
                                    error: `Generated image finished, but the ${upscaleQualityLabel} upscaled download option was not completed.`
                                };
                            }

                            completionResult.upscaledDownloaded = true;
                            completionResult.downloaded = true;
                            updateProgress('Upscaled download complete. Moving to next prompt...');
                        } else if (completionResult.url) {
                            updateProgress('Downloading generated media...');
                            // Send to service-worker with queueIndex for prompt-order filename
                            safeSendMessage({
                                action: 'DOWNLOAD_RESULT',
                                url: completionResult.url,
                                queueIndex: settings.queueIndex ?? null,
                                prompt: targetPrompt,
                                mediaType
                            });
                            updateProgress('Download sent.');
                        }
                    } catch (e) {
                        console.error('Download flow failed:', e);
                    }
                }

                return completionResult;

            } catch (err) {
                if (err?.name === 'PromptSubmissionCancelledError') {
                    console.warn('Automation stopped before submit.');
                    return { success: false, error: err.message || 'Stopped manually', stopped: true };
                }
                console.error('Automation failed:', err);
                const error = err?.message || 'Prompt automation failed.';
                const unusualActivityFailure = /unusual activity/i.test(error);
                const accountBlocked = unusualActivityFailure || /generation request failed \(403|403 forbidden/i.test(error);
                return { success: false, error, accountBlocked, unusualActivityFailure, doNotRetry: err?.doNotRetry === true };
            } finally {
                isSubmittingUI = false;
                window.__FLOW_AUTOMATOR_ACTIVE_SUBMISSION__ = false;
            }
        }

        async function waitForCompletion(serviceSelectors, timeoutMs, preSnapshot = null, options = {}) {
            const start = Date.now();
            const completionSelectors = serviceSelectors.HISTORY_IMAGES
                ? [serviceSelectors.HISTORY_IMAGES]
                : (serviceSelectors.COMPLETION_SIGNALS || ['img', 'video', 'canvas']);
            // Use the caller's latest baseline so already-visible media is not
            // mistaken for the output generated by this prompt.
            const initialSnapshot = preSnapshot || snapshotMedia(completionSelectors);
            const initialStableIds = new Set(
                getMediaCandidates(completionSelectors)
                    .map(item => item.stableId)
                    .filter(Boolean)
            );
            const disableLatestFallback = !!options.disableLatestFallback;
            const minNewMediaDelayMs = Math.max(0, Number(options.minNewMediaDelayMs) || 0);
            const strictNewMedia = !!options.strictNewMedia;
            const expectedPrompt = options.expectedPrompt || '';
            let sawGenerationSignal = false;
            const unusualActivityBaselineElements = new Set(getUnusualActivityFailures().map((failure) => failure.el));

            return new Promise((resolve) => {
                const check = () => {
                    if (Date.now() - start > timeoutMs) return resolve({ success: false, error: 'Generation timed out.' });

                    const rateLimitText = getRateLimitAlertText();
                    if (rateLimitText) {
                        return resolve({
                            success: false,
                            error: `Flow rate limited this request: ${rateLimitText}`,
                            cooldownMs: 45000,
                            rateLimited: true
                        });
                    }

                    const unusualActivityFailures = getUnusualActivityFailures();
                    const newUnusualActivityFailure = unusualActivityFailures.find((failure) =>
                        !unusualActivityBaselineElements.has(failure.el)
                    );
                    if (newUnusualActivityFailure) {
                        const unusualActivityText = newUnusualActivityFailure.text || 'We noticed some unusual activity.';
                        return resolve({
                            success: false,
                            error: `Google Flow blocked this generation: ${unusualActivityText}`,
                            doNotRetry: true,
                            accountBlocked: true,
                            unusualActivityFailure: true
                        });
                    }

                    if (hasGenerationSignal(serviceSelectors)) {
                        sawGenerationSignal = true;
                    }

                    const currentSnapshot = snapshotMedia(completionSelectors);
                    const newKeys = Array.from(currentSnapshot).filter(key => 
                        !initialSnapshot.has(key) && !globallyClaimedMediaKeys.has(key)
                    );
                    const hasNewMedia = newKeys.length > 0;
                    const canAcceptNewMedia = (Date.now() - start) >= minNewMediaDelayMs || sawGenerationSignal;

                    if (hasNewMedia && canAcceptNewMedia) {
                        const candidates = getMediaCandidates(completionSelectors);
                        const newCandidate = candidates.find(item => {
                            if (!item.key || !newKeys.includes(item.key) || !item.url) return false;
                            if (strictNewMedia && expectedPrompt) {
                                const promptText = findPromptForImage(item.el);
                                const promptMatches = promptText && promptMatchesTarget(promptText, expectedPrompt);
                                if (item.stableId && initialStableIds.has(item.stableId) && !promptMatches) return false;
                                if (promptText && !promptMatchesTarget(promptText, expectedPrompt)) return false;
                                if (!promptText && !item.stableId) return false;
                            }
                            return true;
                        });
                        if (newCandidate) {
                            globallyClaimedMediaKeys.add(newCandidate.key);
                            return resolve({
                                success: true,
                                url: newCandidate.url || null,
                                mediaType: newCandidate.mediaType || 'image',
                                candidateKey: newCandidate.key || null
                            });
                        }
                    }

                    // Fallback: If generating signal was seen and is now gone, and we have media, it's probably done
                    if (!disableLatestFallback && sawGenerationSignal && !hasGenerationSignal(serviceSelectors) && currentSnapshot.size > 0) {
                        const candidates = getMediaCandidates(completionSelectors);
                        const latestCandidate = [...candidates].reverse().find(item => item.url && !globallyClaimedMediaKeys.has(item.key));
                        if (latestCandidate) {
                            globallyClaimedMediaKeys.add(latestCandidate.key);
                            return resolve({
                                success: true,
                                url: latestCandidate.url,
                                mediaType: latestCandidate.mediaType || 'image',
                                candidateKey: latestCandidate.key
                            });
                        }
                    }

                    setTimeout(check, 400);
                };
                check();
            });
        }
        // Smart Page Integration: Add "Add to Queue" button to visible prompts
        function injectQueueButtons() {
            const promptSelectors = ['[data-allow-text-selection="true"]', '.hxRvgy', '.sc-prompt-text'];
            const prompts = document.querySelectorAll(promptSelectors.join(','));

            prompts.forEach(el => {
                if (el.querySelector('.flow-add-to-queue-btn')) return; // Already injected

                const container = el.parentElement;
                if (!container) return;

                // Create float button
                const btn = document.createElement('button');
                btn.className = 'flow-add-to-queue-btn';
                btn.innerHTML = '✨ Re-Add to Queue to Regenerate';
                btn.style = `
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 2px 8px;
                    font-size: 10px;
                    font-weight: 600;
                    margin-left: 10px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    vertical-align: middle;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                `;

                btn.onmouseover = () => btn.style.opacity = '1';
                btn.onmouseout = () => btn.style.opacity = '0.8';

                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Clone to get text without button
                    const clone = el.cloneNode(true);
                    const btnInClone = clone.querySelector('.flow-add-to-queue-btn');
                    if (btnInClone) btnInClone.remove();

                    const promptText = clone.innerText || clone.textContent;
                    if (promptText) {
                        safeSendMessage({ action: 'ADD_TO_QUEUE', prompt: promptText.trim() });
                        btn.innerHTML = '✅ Added!';
                        btn.style.background = '#64748b';
                        setTimeout(() => {
                            btn.innerHTML = '✨ Add to Queue';
                            btn.style.background = '#10b981';
                        }, 2000);
                    }
                };

                el.appendChild(btn);
            });
        }

        // Auto-inject bridge script on content script load
        try {
            injectBridgeScript().then(ok => {
                console.log('[FlowAutomator] Bridge script auto-injected on load:', ok);
            }).catch(err => {
                console.error('[FlowAutomator] Bridge script auto-injection error:', err);
            });
        } catch (e) {}

        // Initial run
        // Re-add button injection is disabled by default because mutating Flow-managed
        // nodes can destabilize the app runtime during generation.
    })();
}
