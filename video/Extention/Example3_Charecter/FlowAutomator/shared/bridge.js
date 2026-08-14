(function () {
    var console = Object.freeze({
        log: function () {},
        info: function () {},
        debug: function () {},
        warn: function () {},
        error: function () {}
    });
    var BRIDGE_VERSION = 50;
    if (window.__FLOW_BRIDGE_VERSION__ && window.__FLOW_BRIDGE_VERSION__ >= BRIDGE_VERSION) return;
    // Upgrading from an older bridge already running on this page: tear down its
    // listeners first so action handlers (click submit / click element) are not
    // registered twice — duplicates would fire the same action twice.
    if (typeof window.__FLOW_BRIDGE_CLEANUP__ === 'function') {
        try { window.__FLOW_BRIDGE_CLEANUP__(); } catch (e) {}
    }
    window.__FLOW_BRIDGE_VERSION__ = BRIDGE_VERSION;
    window.__FLOW_BRIDGE_INIT__ = true;
    // DOM-readable marker: the content script runs in a separate world and cannot
    // read window.__FLOW_BRIDGE_VERSION__, so it checks this attribute to decide
    // whether a fresh bridge needs to be injected.
    try { document.documentElement.setAttribute('data-flow-bridge-version', String(BRIDGE_VERSION)); } catch (e) {}

    var __bridgeListeners = [];
    var __bridgeIntervals = [];
    function on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        __bridgeListeners.push([target, type, fn, opts]);
    }
    function every(fn, ms) {
        var id = setInterval(fn, ms);
        __bridgeIntervals.push(id);
        return id;
    }
    window.__FLOW_BRIDGE_CLEANUP__ = function () {
        __bridgeListeners.forEach(function (l) {
            try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) {}
        });
        __bridgeIntervals.forEach(function (id) { try { clearInterval(id); } catch (e) {} });
        __bridgeListeners = [];
        __bridgeIntervals = [];
    };

    function getSlateRoot() {
        return document.querySelector('[data-slate-editor="true"]');
    }

    function getSafeTarget(id) {
        if (id) {
            var el = document.querySelector('[data-flow-automator-id="' + id + '"]');
            if (el) return el;
        }
        var slateRoot = getSlateRoot();
        if (slateRoot) return slateRoot;
        var active = document.activeElement;
        if (active && (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            return active;
        }
        return null;
    }

    // Extract the Slate editor instance from React fiber.
    function getSlateEditor(slateRoot) {
        try {
            var fiberKey = Object.keys(slateRoot).find(function (k) { return k.startsWith('__reactFiber'); });
            if (!fiberKey) return null;
            var fiber = slateRoot[fiberKey];
            while (fiber) {
                try {
                    var state = fiber.memoizedState && fiber.memoizedState.memoizedState;
                    if (state && state.editor && typeof state.editor.insertText === 'function') {
                        return state.editor;
                    }
                    var props = fiber.memoizedProps;
                    if (props && props.editor && typeof props.editor.insertText === 'function') {
                        return props.editor;
                    }
                } catch (e) { }
                fiber = fiber.return;
                if (!fiber) break;
            }
        } catch (e) { }
        return null;
    }

    function generateUUID() {
        try {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
        } catch (e) {}
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function scanReactTreeForAssets() {
        var now = Date.now();
        if (window.__FLOW_KNOWN_ASSETS__ && window.__FLOW_KNOWN_ASSETS_AT__ && (now - window.__FLOW_KNOWN_ASSETS_AT__ <= 30000)) {
            return window.__FLOW_KNOWN_ASSETS__;
        }
        window.__FLOW_KNOWN_ASSETS__ = {};
        window.__FLOW_KNOWN_ASSETS_AT__ = now;
        var assetMap = window.__FLOW_KNOWN_ASSETS__;
        try {
            var seen = new Set();
            var allAssets = [];

            function findAssetIdsInObject(obj, depth) {
                if (depth > 8) return [];
                if (!obj || typeof obj !== 'object' || seen.has(obj)) return [];
                seen.add(obj);
                var results = [];
                
                // Check if this looks like a mention node or a library asset. Only trust
                // objects that carry an EXPLICIT character/ingredient server id field —
                // generic `id`/`assetId`/`serverId` props match ordinary UI components too
                // (e.g. a "More options" button has both a `title` and a Radix `id`), which
                // previously caused random buttons to be scanned in as fake "assets".
                var explicitChar = obj.characterServerId || null;
                var explicitIngred = obj.ingredientImageId || obj.imageServerId || null;
                if ((explicitChar || explicitIngred) && (obj.displayText || obj.name || obj.label || obj.title || obj.assetName || obj.assetTitle || obj.filename)) {
                    results.push({
                        displayText: obj.displayText || obj.name || obj.label || obj.title || obj.assetName || obj.assetTitle || obj.filename || '',
                        characterServerId: explicitChar,
                        ingredientImageId: explicitIngred,
                        id: obj.id || obj.assetId || null
                    });
                }
                
                for (var k in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, k)) {
                        try {
                            var sub = findAssetIdsInObject(obj[k], depth + 1);
                            if (sub.length) results = results.concat(sub);
                        } catch (e) {}
                    }
                }
                return results;
            }

            // Find the Next.js root element or document body
            var rootEl = document.querySelector('#__next') || document.querySelector('div[data-reactroot]') || document.body;
            var fiberKey = Object.keys(rootEl).find(function (k) { 
                return k.startsWith('__reactContainer') || k.startsWith('__reactFiber'); 
            });
            
            var rootFiber = null;
            if (fiberKey) {
                rootFiber = rootEl[fiberKey];
                if (rootFiber && rootFiber.current) {
                    rootFiber = rootFiber.current;
                }
            }

            if (!rootFiber) {
                // Fallback to editor slateRoot
                var slateRoot = getSlateRoot();
                if (slateRoot) {
                    var slateKey = Object.keys(slateRoot).find(function (k) { return k.startsWith('__reactFiber'); });
                    if (slateKey) rootFiber = slateRoot[slateKey];
                }
            }

            if (rootFiber) {
                // Iterative DFS to scan the entire React fiber tree safely and quickly
                var fiberStack = [rootFiber];
                var nodeCount = 0;
                while (fiberStack.length > 0 && nodeCount < 5000) {
                    var f = fiberStack.pop();
                    if (!f) continue;
                    nodeCount++;
                    
                    if (f.memoizedProps) {
                        allAssets = allAssets.concat(findAssetIdsInObject(f.memoizedProps, 0));
                    }
                    if (f.memoizedState) {
                        allAssets = allAssets.concat(findAssetIdsInObject(f.memoizedState, 0));
                    }
                    
                    if (f.sibling) fiberStack.push(f.sibling);
                    if (f.child) fiberStack.push(f.child);
                }
            }

            allAssets.forEach(function(item) {
                var rawLabel = String(item.displayText || '').trim();
                var normalizedLabel = rawLabel.toLowerCase().replace(/^@+/, '').trim();
                if (normalizedLabel) {
                    assetMap[normalizedLabel] = {
                        characterServerId: item.characterServerId || null,
                        ingredientImageId: item.ingredientImageId || null,
                        displayText: rawLabel.replace(/^@+/, '')
                    };
                }
            });
        } catch (e) {
            console.error('[FlowBridge] Error scanning React tree for assets:', e);
        }
        return assetMap;
    }

    function parsePromptToSlateNodes(text, assetMap) {
        if (!assetMap || Object.keys(assetMap).length === 0) {
            return [{ text: text }];
        }

        var assetNames = Object.keys(assetMap).sort(function(a, b) { return b.length - a.length; });
        var escapedNames = assetNames.map(function(name) {
            return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        });
        
        var regex = new RegExp('@(' + escapedNames.join('|') + ')(?!\\p{L}|\\p{N})', 'giu');
        
        var nodes = [];
        var lastIndex = 0;
        var match;
        
        while ((match = regex.exec(text)) !== null) {
            var matchIndex = match.index;
            var matchedText = match[0];
            var assetName = match[1].toLowerCase().trim();
            
            if (matchIndex > lastIndex) {
                nodes.push({ text: text.substring(lastIndex, matchIndex) });
            }
            
            var asset = assetMap[assetName];
            if (asset) {
                var dispText = asset.displayText || assetName;
                nodes.push({
                    id: generateUUID(),
                    type: "AT_TAG_TYPE",
                    children: [{ text: dispText }],
                    characterServerId: asset.characterServerId || null,
                    displayText: dispText,
                    ingredientImageId: asset.ingredientImageId || null
                });
            } else {
                nodes.push({ text: matchedText });
            }
            
            lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < text.length) {
            nodes.push({ text: text.substring(lastIndex) });
        }
        
        return nodes;
    }

    function isVoidSlateNode(node) {
        // AT_TAG_TYPE chips and similar inline voids must not be traversed into
        // when computing selection endpoints — Slate disallows selection inside voids.
        if (!node || typeof node !== 'object') return false;
        var t = String(node.type || '');
        return t === 'AT_TAG_TYPE' || t === 'mention' || t === 'inline-void' ||
            node['data-slate-void'] === true;
    }

    function findFirstTextLeaf(node, path, skipVoids) {
        if (!node) return null;
        if (typeof node.text === 'string') {
            return { path: path, node: node };
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
            if (skipVoids && (isVoidSlateNode(node) || isMediaSlateNode(node))) {
                return null;
            }
            for (var i = 0; i < node.children.length; i++) {
                var res = findFirstTextLeaf(node.children[i], path.concat(i), skipVoids);
                if (res) return res;
            }
        }
        return null;
    }

    function findLastTextLeaf(node, path, skipVoids) {
        if (!node) return null;
        if (typeof node.text === 'string') {
            return { path: path, node: node };
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
            if (skipVoids && (isVoidSlateNode(node) || isMediaSlateNode(node))) {
                return null;
            }
            for (var i = node.children.length - 1; i >= 0; i--) {
                var res = findLastTextLeaf(node.children[i], path.concat(i), skipVoids);
                if (res) return res;
            }
        }
        return null;
    }

    function getSlateRootOf(el) {
        if (!el) return null;
        if (el.getAttribute && el.getAttribute('data-slate-editor') === 'true') return el;
        if (typeof el.closest === 'function') {
            return el.closest('[data-slate-editor="true"]');
        }
        return null;
    }

    function clearEditor(editor) {
        try {
            if (!editor || !editor.children || editor.children.length === 0) return;

            // Find first/last text leaves (skipping void nodes for cursor endpoints)
            var firstLeaf = findFirstTextLeaf(editor, [], true);
            var lastLeaf = findLastTextLeaf(editor, [], true);

            // Fallback: search including void nodes if no non-void text nodes exist
            if (!firstLeaf) firstLeaf = findFirstTextLeaf(editor, [], false);
            if (!lastLeaf) lastLeaf = findLastTextLeaf(editor, [], false);

            var anchorPath = firstLeaf ? firstLeaf.path : [0, 0];
            var focusPath = lastLeaf ? lastLeaf.path : [0, 0];
            var focusOffset = lastLeaf && lastLeaf.node && typeof lastLeaf.node.text === 'string'
                ? lastLeaf.node.text.length
                : 0;

            editor.select({
                anchor: { path: anchorPath, offset: 0 },
                focus: { path: focusPath, offset: focusOffset }
            });
            editor.deleteFragment();
        } catch (e) {
            console.error('[FlowBridge] Slate-safe clearEditor failed:', e);
        }
    }

    function mergePassedAssetsIntoMap(assetMap, passedAssets) {
        if (!assetMap) assetMap = {};
        if (Array.isArray(passedAssets)) {
            passedAssets.forEach(function(item) {
                if (!item) return;
                var idStr = String(item.id || '');
                // Skip synthetic ids that are NOT real Flow asset IDs. Saved generated
                // images ("gen_…") and panel-search targets ("__MENTION__…") have no
                // valid Flow ingredientImageId, so building a Slate mention out of them
                // produces a broken/empty chip. These are attached via the reference
                // panel (by image src) instead — let them stay as plain @text here.
                if (idStr.indexOf('gen_') === 0 || idStr.indexOf('__MENTION__') === 0) return;
                var rawLabel = String(item.label || item.displayText || '').trim();
                var normalizedLabel = rawLabel.toLowerCase().replace(/^@+/, '').trim();
                if (normalizedLabel) {
                    var isChar = item.type === 'character';
                    assetMap[normalizedLabel] = {
                        characterServerId: isChar ? item.id : null,
                        ingredientImageId: !isChar ? item.id : null,
                        displayText: rawLabel.replace(/^@+/, '')
                    };
                }
            });
        }
        return assetMap;
    }

    function trySlateEditorInsert(slateRoot, value, passedAssets) {
        try {
            var editor = getSlateEditor(slateRoot);
            if (!editor) return false;

            // Full clear — wipe all existing content
            clearEditor(editor);

            // Ensure selection is collapsed at the start
            try {
                var firstLeaf = findFirstTextLeaf(editor, [], false);
                var startPath = firstLeaf ? firstLeaf.path : [0, 0];
                editor.select({
                    anchor: { path: startPath, offset: 0 },
                    focus: { path: startPath, offset: 0 }
                });
            } catch (selErr) {
                console.warn('[FlowBridge] Failed to set initial selection:', selErr);
            }

            // Only attempt @mention node insertion if prompt actually contains '@'
            if (value.indexOf('@') !== -1) {
                try {
                    var assetMap = scanReactTreeForAssets();
                    mergePassedAssetsIntoMap(assetMap, passedAssets);
                    var nodes = parsePromptToSlateNodes(value, assetMap);
                    var hasInline = nodes.some(function(n) { return n && n.type === 'AT_TAG_TYPE'; });

                    if (hasInline && typeof editor.insertFragment === 'function') {
                        var children = [];
                        for (var i = 0; i < nodes.length; i++) {
                            var n = nodes[i];
                            if (n && n.type === 'AT_TAG_TYPE') {
                                var prev = children[children.length - 1];
                                if (!prev || prev.type === 'AT_TAG_TYPE') {
                                    children.push({ text: '' });
                                }
                                children.push(n);
                            } else if (n && typeof n.text === 'string') {
                                children.push(n);
                            }
                        }
                        var last = children[children.length - 1];
                        if (last && last.type === 'AT_TAG_TYPE') {
                            children.push({ text: '' });
                        }
                        editor.insertFragment(children);
                        try {
                            var lastLeaf = findLastTextLeaf(editor, [], false);
                            if (lastLeaf && lastLeaf.node && typeof lastLeaf.node.text === 'string') {
                                editor.select({
                                    anchor: { path: lastLeaf.path, offset: lastLeaf.node.text.length },
                                    focus: { path: lastLeaf.path, offset: lastLeaf.node.text.length }
                                });
                            }
                        } catch (selErr) {}
                        return true;
                    }
                } catch (mentionErr) {
                    console.warn('[FlowBridge] Mention node insertion failed, falling back to plain text:', mentionErr);
                }
            }

            // Plain text path
            editor.insertText(value);
            try {
                var lastLeaf = findLastTextLeaf(editor, [], false);
                if (lastLeaf && lastLeaf.node && typeof lastLeaf.node.text === 'string') {
                    editor.select({
                        anchor: { path: lastLeaf.path, offset: lastLeaf.node.text.length },
                        focus: { path: lastLeaf.path, offset: lastLeaf.node.text.length }
                    });
                }
            } catch (selErr) {}
            return true;
        } catch (e) {
            console.error('[FlowBridge] trySlateEditorInsert failed:', e);
            return false;
        }
    }

    function trySlateEditorInsertAtCursor(slateRoot, value, passedAssets) {
        try {
            var editor = getSlateEditor(slateRoot);
            if (!editor) return false;

            // Only attempt @mention node insertion if prompt actually contains '@'
            if (value.indexOf('@') !== -1) {
                try {
                    var assetMap = scanReactTreeForAssets();
                    mergePassedAssetsIntoMap(assetMap, passedAssets);
                    var nodes = parsePromptToSlateNodes(value, assetMap);
                    var hasInline = nodes.some(function(n) { return n && n.type === 'AT_TAG_TYPE'; });

                    if (hasInline && typeof editor.insertFragment === 'function') {
                        var children = [];
                        for (var i = 0; i < nodes.length; i++) {
                            var n = nodes[i];
                            if (n && n.type === 'AT_TAG_TYPE') {
                                var prev = children[children.length - 1];
                                if (!prev || prev.type === 'AT_TAG_TYPE') {
                                    children.push({ text: '' });
                                }
                                children.push(n);
                            } else if (n && typeof n.text === 'string') {
                                children.push(n);
                            }
                        }
                        var last = children[children.length - 1];
                        if (last && last.type === 'AT_TAG_TYPE') {
                            children.push({ text: '' });
                        }
                        editor.insertFragment(children);
                        try {
                            var lastLeaf = findLastTextLeaf(editor, [], false);
                            if (lastLeaf && lastLeaf.node && typeof lastLeaf.node.text === 'string') {
                                editor.select({
                                    anchor: { path: lastLeaf.path, offset: lastLeaf.node.text.length },
                                    focus: { path: lastLeaf.path, offset: lastLeaf.node.text.length }
                                });
                            }
                        } catch (selErr) {}
                        return true;
                    }
                } catch (mentionErr) {
                    console.warn('[FlowBridge] Mention node insertion at cursor failed, falling back to plain text:', mentionErr);
                }
            }

            editor.insertText(value);
            try {
                var lastLeaf = findLastTextLeaf(editor, [], false);
                if (lastLeaf && lastLeaf.node && typeof lastLeaf.node.text === 'string') {
                    editor.select({
                        anchor: { path: lastLeaf.path, offset: lastLeaf.node.text.length },
                        focus: { path: lastLeaf.path, offset: lastLeaf.node.text.length }
                    });
                }
            } catch (selErr) {}
            return true;
        } catch (e) {
            console.error('[FlowBridge] trySlateEditorInsertAtCursor failed:', e);
            return false;
        }
    }

    function isMediaSlateNode(node) {
        if (!node || typeof node !== 'object') return false;
        var type = String(node.type || node.kind || '').toLowerCase();
        // Treat @mention chips (AT_TAG_TYPE or any inline-void with characterServerId)
        // as "media" so preserveMedia mode keeps them intact.
        if (type === 'at_tag_type' || type === 'attag' || type === 'mention' ||
            node.characterServerId || node.ingredientImageId) return true;
        return type.includes('image') ||
            type.includes('media') ||
            type.includes('asset') ||
            type.includes('attachment') ||
            !!node.url ||
            !!node.src ||
            !!node.assetId ||
            !!node.mediaId;
    }

    function collectEditableTextPaths(nodes, path, out, insideMedia) {
        if (!Array.isArray(nodes)) return;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var nextPath = path.concat(i);
            var inMedia = insideMedia || isMediaSlateNode(node);
            if (node && typeof node.text === 'string' && !inMedia) {
                out.push({ node: node, path: nextPath });
            }
            if (node && Array.isArray(node.children)) {
                collectEditableTextPaths(node.children, nextPath, out, inMedia);
            }
        }
    }

    function trySlateEditorInsertPreservingMedia(slateRoot, value, passedAssets) {
        try {
            var editor = getSlateEditor(slateRoot);
            if (!editor) return false;

            // 1. Scan React tree and merge passed assets to build assetMap
            var assetMap = scanReactTreeForAssets();
            mergePassedAssetsIntoMap(assetMap, passedAssets);

            // 2. Parse the target value into target nodes
            var targetNodes = parsePromptToSlateNodes(value, assetMap);

            // 3. Pool existing media/void nodes from the editor
            var mediaPool = [];
            function collectMediaNodes(nodes) {
                if (!Array.isArray(nodes)) return;
                nodes.forEach(function(node) {
                    if (isMediaSlateNode(node)) {
                        mediaPool.push(node);
                    } else if (node && Array.isArray(node.children)) {
                        collectMediaNodes(node.children);
                    }
                });
            }
            collectMediaNodes(editor.children || []);

            // Helper to match a target chip node with an existing pooled media node
            function findAndRemoveMatchingMedia(targetNode) {
                for (var i = 0; i < mediaPool.length; i++) {
                    var poolNode = mediaPool[i];
                    
                    // Match by characterServerId
                    if (targetNode.characterServerId && poolNode.characterServerId &&
                        String(targetNode.characterServerId) === String(poolNode.characterServerId)) {
                        return mediaPool.splice(i, 1)[0];
                    }
                    // Match by ingredientImageId
                    if (targetNode.ingredientImageId && poolNode.ingredientImageId &&
                        String(targetNode.ingredientImageId) === String(poolNode.ingredientImageId)) {
                        return mediaPool.splice(i, 1)[0];
                    }
                    // Match by displayText (normalize first)
                    var targetText = String(targetNode.displayText || '').trim().toLowerCase().replace(/^@+/, '');
                    var poolText = String(poolNode.displayText || '').trim().toLowerCase().replace(/^@+/, '');
                    if (!poolText && Array.isArray(poolNode.children) && poolNode.children[0]) {
                        poolText = String(poolNode.children[0].text || '').trim().toLowerCase().replace(/^@+/, '');
                    }
                    if (targetText && poolText && targetText === poolText) {
                        return mediaPool.splice(i, 1)[0];
                    }
                }
                return null;
            }

            // 4. Reconcile target nodes with the pooled media nodes
            var children = [];
            for (var i = 0; i < targetNodes.length; i++) {
                var node = targetNodes[i];
                if (node && node.type === 'AT_TAG_TYPE') {
                    var matched = findAndRemoveMatchingMedia(node);
                    if (matched) {
                        children.push(matched);
                    } else {
                        children.push(node);
                    }
                } else if (node && typeof node.text === 'string') {
                    children.push(node);
                }
            }

            // 5. Append any remaining media nodes in the pool (e.g. user-attached images) so they aren't lost
            mediaPool.forEach(function(remainingMedia) {
                children.push(remainingMedia);
            });

            // 6. Normalize children: merge adjacent text nodes, ensure no consecutive voids, and text nodes at start/end
            var normalizedChildren = [];
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (!child) continue;
                var isVoid = isVoidSlateNode(child) || isMediaSlateNode(child);
                if (isVoid) {
                    var prev = normalizedChildren[normalizedChildren.length - 1];
                    if (!prev || isVoidSlateNode(prev) || isMediaSlateNode(prev)) {
                        normalizedChildren.push({ text: '' });
                    }
                    normalizedChildren.push(child);
                } else if (typeof child.text === 'string') {
                    var prev = normalizedChildren[normalizedChildren.length - 1];
                    if (prev && typeof prev.text === 'string') {
                        prev.text += child.text;
                    } else {
                        normalizedChildren.push({ text: child.text });
                    }
                } else {
                    normalizedChildren.push(child);
                }
            }
            var last = normalizedChildren[normalizedChildren.length - 1];
            if (!last || isVoidSlateNode(last) || isMediaSlateNode(last)) {
                normalizedChildren.push({ text: '' });
            }

            // 7. Clear the editor and insert the normalized fragment
            clearEditor(editor);

            // Ensure selection is collapsed at the start
            try {
                var firstLeaf = findFirstTextLeaf(editor, [], false);
                var startPath = firstLeaf ? firstLeaf.path : [0, 0];
                editor.select({
                    anchor: { path: startPath, offset: 0 },
                    focus: { path: startPath, offset: 0 }
                });
            } catch (selErr) {
                console.warn('[FlowBridge] Failed to set initial selection:', selErr);
            }

            if (typeof editor.insertFragment === 'function') {
                editor.insertFragment(normalizedChildren);
                // Explicitly set cursor to the end
                try {
                    var lastLeaf = findLastTextLeaf(editor, [], false);
                    if (lastLeaf && lastLeaf.node && typeof lastLeaf.node.text === 'string') {
                        editor.select({
                            anchor: { path: lastLeaf.path, offset: lastLeaf.node.text.length },
                            focus: { path: lastLeaf.path, offset: lastLeaf.node.text.length }
                        });
                    }
                } catch (selErr) {
                    console.warn('[FlowBridge] Cursor alignment after insertFragment failed:', selErr);
                }
                return true;
            }

            // Fallback: no insertFragment - try plain text write
            if (typeof editor.insertText === 'function') {
                editor.insertText(value);
                try {
                    var lastLeaf = findLastTextLeaf(editor, [], false);
                    if (lastLeaf && lastLeaf.node && typeof lastLeaf.node.text === 'string') {
                        editor.select({
                            anchor: { path: lastLeaf.path, offset: lastLeaf.node.text.length },
                            focus: { path: lastLeaf.path, offset: lastLeaf.node.text.length }
                        });
                    }
                } catch (selErr) {}
                return true;
            }
            return false;
        } catch (e) {
            console.error('[FlowBridge] trySlateEditorInsertPreservingMedia failed:', e);
            return false;
        }
    }

    // ── NEW: React-fiber onClick caller ────────────────────────────────────────
    // Synthetic DOM events are isTrusted:false and React 17+ blocks them on
    // delegated root handlers. The only reliable approach is to walk the fiber
    // tree and call the onClick prop function directly — this completely bypasses
    // the DOM event system.
    function getReactProps(el) {
        if (!el) return null;
        try {
            var key = Object.keys(el).find(function (k) {
                return k.startsWith('__reactProps$') || k.startsWith('__reactEventHandlers$');
            });
            return key ? el[key] : null;
        } catch (e) { return null; }
    }

    function getReactHandlerProps(el) {
        if (!el) return [];
        var candidates = [];
        var add = function (props) {
            if (props && typeof props === 'object' && candidates.indexOf(props) === -1) {
                candidates.push(props);
            }
        };

        add(getReactProps(el));
        try {
            var fiberKey = Object.keys(el).find(function (k) {
                return k.startsWith('__reactFiber$')
                    || k.startsWith('__reactInternalInstance$');
            });
            var fiber = fiberKey ? el[fiberKey] : null;
            for (var depth = 0; fiber && depth < 12; depth += 1, fiber = fiber.return) {
                add(fiber.memoizedProps);
                add(fiber.pendingProps);
            }
        } catch (e) { }

        return candidates;
    }

    function makeFakeEvent(type, target) {
        // Libraries like Radix commonly gate their pointer/mouse handlers on
        // event.button === 0, ignore events with modifier keys held, and use
        // clientX/clientY to position submenus — a fake event missing these
        // fields silently no-ops the handler (it runs, throws nothing, but the
        // menu never opens) instead of throwing an error we could catch.
        var rect = (target && target.getBoundingClientRect) ? target.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var isPointer = type.indexOf('pointer') === 0;
        return {
            type: type,
            isTrusted: true,
            bubbles: true,
            cancelable: true,
            composed: true,
            defaultPrevented: false,
            timeStamp: Date.now(),
            eventPhase: 2,
            target: target,
            currentTarget: target,
            relatedTarget: null,
            button: 0,
            buttons: type.indexOf('up') > -1 || type === 'click' ? 0 : 1,
            detail: 1,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            clientX: cx,
            clientY: cy,
            pageX: cx,
            pageY: cy,
            screenX: cx,
            screenY: cy,
            movementX: 0,
            movementY: 0,
            pointerId: isPointer ? 1 : undefined,
            pointerType: isPointer ? 'mouse' : undefined,
            isPrimary: isPointer ? true : undefined,
            width: isPointer ? 1 : undefined,
            height: isPointer ? 1 : undefined,
            pressure: isPointer ? 0.5 : undefined,
            getModifierState: function () { return false; },
            preventDefault: function () {},
            stopPropagation: function () {},
            stopImmediatePropagation: function () {},
            nativeEvent: {
                type: type,
                isTrusted: true,
                bubbles: true,
                cancelable: true,
                target: target,
                currentTarget: target,
                defaultPrevented: false,
                button: 0,
                buttons: type.indexOf('up') > -1 || type === 'click' ? 0 : 1,
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false,
                clientX: cx,
                clientY: cy,
                pageX: cx,
                pageY: cy,
                pointerId: isPointer ? 1 : undefined,
                pointerType: isPointer ? 'mouse' : undefined,
                preventDefault: function () {},
                stopPropagation: function () {},
                stopImmediatePropagation: function () {},
                timeStamp: Date.now()
            }
        };
    }

    function setReactControlledInputValue(target, value) {
        if (!target) return { ok: false, info: 'no-target' };
        var previousValue = String(target.value || '');
        try {
            var prototype = target.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            var descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
            if (descriptor && typeof descriptor.set === 'function') {
                descriptor.set.call(target, value);
            } else {
                target.value = value;
            }
            if (target._valueTracker && typeof target._valueTracker.setValue === 'function') {
                target._valueTracker.setValue(previousValue);
            }
        } catch (e) {
            try { target.value = value; } catch (ignored) { }
        }

        var reactHandlerCalled = false;
        var propsCandidates = getReactHandlerProps(target);
        for (var p = 0; p < propsCandidates.length && !reactHandlerCalled; p += 1) {
            var props = propsCandidates[p];
            for (var h = 0; h < 2; h += 1) {
                var handlerName = h === 0 ? 'onChange' : 'onInput';
                if (typeof props[handlerName] !== 'function') continue;
                try {
                    var eventType = handlerName === 'onChange' ? 'change' : 'input';
                    var evt = makeFakeEvent(eventType, target);
                    evt.target = target;
                    evt.currentTarget = target;
                    evt.nativeEvent.target = target;
                    evt.nativeEvent.currentTarget = target;
                    props[handlerName](evt);
                    reactHandlerCalled = true;
                    break;
                } catch (e) { }
            }
        }

        try {
            target.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: value
            }));
        } catch (e) {
            try { target.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (ignored) { }
        }
        try { target.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })); } catch (e) { }

        return {
            ok: String(target.value || '') === value,
            info: reactHandlerCalled ? 'react-controlled-input' : 'native-input'
        };
    }

    // Runs the console-verified Flow media rename sequence entirely in the
    // page's main React world. Keeping hover, menu activation, controlled input
    // update, and Done activation in one world avoids the partial editor state
    // produced when those steps are split across an isolated content script.
    async function renameFlowMediaVerified(target, newName) {
        var sleep = function (ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); };
        var visible = function (el) {
            if (!el) return false;
            var rect = el.getBoundingClientRect();
            var style = window.getComputedStyle(el);
            return rect.width > 0 && rect.height > 0
                && style.display !== 'none'
                && style.visibility !== 'hidden'
                && style.opacity !== '0';
        };
        var textOf = function (el) {
            return [
                el && el.textContent,
                el && el.innerText,
                el && el.getAttribute && el.getAttribute('aria-label'),
                el && el.getAttribute && el.getAttribute('title')
            ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
        };
        var getVerifiedReactProps = function (el) {
            var output = [];
            var add = function (props) {
                if (props && typeof props === 'object' && output.indexOf(props) === -1) {
                    output.push(props);
                }
            };
            var node = el;
            for (var domDepth = 0; node && domDepth < 5; domDepth += 1, node = node.parentElement) {
                var candidates = getReactHandlerProps(node);
                for (var i = 0; i < candidates.length; i += 1) add(candidates[i]);
            }
            return output;
        };
        var callReactUntil = async function (el, handlerNames, successCheck) {
            var called = [];
            var propsCandidates = getVerifiedReactProps(el);
            for (var p = 0; p < propsCandidates.length; p += 1) {
                var props = propsCandidates[p];
                for (var h = 0; h < handlerNames.length; h += 1) {
                    var handler = props && props[handlerNames[h]];
                    if (typeof handler !== 'function' || called.indexOf(handler) !== -1) continue;
                    called.push(handler);
                    try {
                        handler(makeFakeEvent(handlerNames[h].slice(2).toLowerCase(), el));
                    } catch (e) { }
                    await sleep(120);
                    if (successCheck()) return true;
                }
            }
            return !!successCheck();
        };
        var findRenameInput = function () {
            return Array.from(document.querySelectorAll('input[aria-label="Editable text"]'))
                .find(function (el) {
                    return visible(el) && !el.closest('#flow-desktop-header');
                }) || null;
        };
        var findRenameMenu = function () {
            return Array.from(document.querySelectorAll('[role="menuitem"], button'))
                .find(function (el) {
                    return visible(el) && /\brename\b/i.test(textOf(el));
                }) || null;
        };
        var findDone = function (input) {
            var dialogButtons = input && input.closest('[role="dialog"]')
                ? Array.from(input.closest('[role="dialog"]').querySelectorAll('button, [role="button"]'))
                : [];
            var candidates = dialogButtons.concat(Array.from(document.querySelectorAll('button, [role="button"]')));
            return candidates.filter(function (el, index) {
                return candidates.indexOf(el) === index;
            }).find(function (el) {
                if (!visible(el) || el.disabled) return false;
                var text = textOf(el);
                var compact = text.replace(/[\s_-]/g, '');
                return /\bdone\b/i.test(text)
                    || compact.endsWith('donedone')
                    || compact.endsWith('checkdone');
            }) || null;
        };
        var setReactValue = async function (input, value) {
            var previousValue = String(input.value || '');
            try { input.focus(); input.select(); } catch (e) { }

            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
            if (!setter || typeof setter.set !== 'function') {
                return { ok: false, error: 'NATIVE_VALUE_SETTER_NOT_FOUND', input: input };
            }
            setter.set.call(input, value);
            if (input._valueTracker && typeof input._valueTracker.setValue === 'function') {
                input._valueTracker.setValue(previousValue);
            }

            var reactHandlerCalled = false;
            var propsCandidates = getVerifiedReactProps(input);
            for (var p = 0; p < propsCandidates.length && !reactHandlerCalled; p += 1) {
                var props = propsCandidates[p];
                for (var h = 0; h < 2; h += 1) {
                    var handlerName = h === 0 ? 'onChange' : 'onInput';
                    if (typeof props[handlerName] !== 'function') continue;
                    try {
                        props[handlerName](makeFakeEvent(handlerName === 'onChange' ? 'change' : 'input', input));
                        reactHandlerCalled = true;
                        break;
                    } catch (e) { }
                }
            }

            try {
                input.dispatchEvent(new InputEvent('beforeinput', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    inputType: 'insertReplacementText',
                    data: value
                }));
            } catch (e) { }
            try {
                input.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    inputType: 'insertReplacementText',
                    data: value
                }));
            } catch (e) {
                try { input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true })); } catch (ignored) { }
            }
            try { input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true, composed: true })); } catch (e) { }

            await sleep(400);
            var liveInput = findRenameInput();
            return {
                ok: !!liveInput && String(liveInput.value || '') === value,
                reactHandlerCalled: reactHandlerCalled,
                actualValue: liveInput ? liveInput.value : null,
                input: liveInput
            };
        };

        var input = findRenameInput();
        var media = target;
        var firstLink = media && media.closest ? media.closest('a[href*="/edit/"]') : null;
        if (!firstLink && media && media.querySelector) firstLink = media.querySelector('a[href*="/edit/"]');

        if (!input) {
            if (!media || !document.contains(media)) {
                return { ok: false, step: 'target-image', error: 'TARGET_IMAGE_NOT_FOUND' };
            }
            var tile = media.closest('[data-tile-id]')
                || media.closest('button')
                || (firstLink && (firstLink.closest('[data-tile-id]') || firstLink.closest('button')))
                || media.parentElement;
            if (!tile) return { ok: false, step: 'target-tile', error: 'TARGET_TILE_NOT_FOUND' };
            try { tile.scrollIntoView({ block: 'center', inline: 'center' }); } catch (e) { }

            ['pointerover', 'mouseover', 'pointermove', 'mousemove'].forEach(function (type) {
                try {
                    var EventClass = type.indexOf('pointer') === 0 ? PointerEvent : MouseEvent;
                    tile.dispatchEvent(new EventClass(type, {
                        bubbles: true,
                        composed: true,
                        pointerType: 'mouse'
                    }));
                } catch (e) { }
            });
            await callReactUntil(tile,
                ['onPointerEnter', 'onMouseEnter', 'onPointerMove', 'onMouseMove'],
                function () {
                    return Array.from(tile.querySelectorAll('button, [role="button"]'))
                        .some(function (el) { return visible(el) && textOf(el).indexOf('more') !== -1; });
                });
            await sleep(250);

            var moreButton = Array.from(tile.querySelectorAll('button, [role="button"]'))
                .find(function (el) {
                    var text = textOf(el);
                    return visible(el) && (
                        text.indexOf('more_vert') !== -1
                        || text === 'more'
                        || text.endsWith(' more')
                    );
                });
            if (!moreButton) return { ok: false, step: 'more-button', error: 'MORE_BUTTON_NOT_FOUND' };

            try { moreButton.click(); } catch (e) { }
            await sleep(200);
            if (!findRenameMenu()) {
                await callReactUntil(moreButton,
                    ['onPointerDown', 'onMouseDown', 'onClick', 'onPointerUp'],
                    function () { return !!findRenameMenu(); });
            }
            var renameItem = findRenameMenu();
            if (!renameItem) return { ok: false, step: 'rename-menu', error: 'RENAME_MENU_NOT_FOUND' };

            try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { }
            try { renameItem.click(); } catch (e) { }
            await sleep(250);
            input = findRenameInput();
            if (!input) {
                await callReactUntil(renameItem, ['onClick', 'onPointerUp'], function () { return !!findRenameInput(); });
                input = findRenameInput();
            }
            if (!input) return { ok: false, step: 'rename-editor', error: 'RENAME_INPUT_NOT_FOUND' };
        }

        try { input.click(); input.focus({ preventScroll: true }); } catch (e) { try { input.focus(); } catch (ignored) { } }
        await sleep(300);
        var doneButton = findDone(input);
        if (!doneButton) {
            await callReactUntil(input,
                ['onClick', 'onFocus', 'onPointerDown', 'onPointerUp'],
                function () { return !!findDone(findRenameInput()); });
            input = findRenameInput();
            doneButton = findDone(input);
        }
        if (!doneButton) return { ok: false, step: 'activate-input', error: 'DONE_BUTTON_NOT_FOUND' };

        var valueResult = await setReactValue(input, newName);
        if (!valueResult.ok) {
            return {
                ok: false,
                step: 'set-name',
                error: 'REACT_VALUE_NOT_UPDATED',
                reactHandlerCalled: valueResult.reactHandlerCalled,
                actualValue: valueResult.actualValue
            };
        }
        input = valueResult.input;
        doneButton = findDone(input);
        if (!doneButton) {
            return { ok: false, step: 'save', error: 'DONE_BUTTON_DISAPPEARED', actualValue: input && input.value };
        }

        try { doneButton.click(); } catch (e) { }
        await sleep(700);
        if (findRenameInput()) {
            var liveDone = findDone(findRenameInput());
            if (liveDone) {
                await callReactUntil(liveDone, ['onClick', 'onPointerUp'], function () { return !findRenameInput(); });
            }
        }
        await sleep(700);
        return {
            ok: !findRenameInput(),
            step: findRenameInput() ? 'save' : 'finished',
            error: findRenameInput() ? 'RENAME_EDITOR_STILL_OPEN' : '',
            renamedTo: newName
        };
    }

    function callReactOnClick(el, preferClick) {
        if (!el) return false;
        // Walk UP the DOM tree to find any ancestor with a React onClick handler.
        // The handler may be on the button, a child span, or a parent wrapper.
        var walkers = [el].concat(Array.from(el.querySelectorAll('*')));
        // Also walk up the DOM tree
        var parent = el.parentElement;
        for (var d = 0; d < 12 && parent && parent !== document.body; d++) {
            walkers.push(parent);
            parent = parent.parentElement;
        }

        for (var i = 0; i < walkers.length; i++) {
            var node = walkers[i];
            var propsCandidates = getReactHandlerProps(node);
            // Some dropdown/menu triggers open on onPointerDown rather than onClick,
            // so try onPointerDown first — but call only ONE handler per node. Calling
            // both in sequence (pointerdown immediately followed by a synthetic click,
            // an order that never happens in real user input) can desync a component's
            // internal press-state and crash the page's React tree.
            // Menu/tile controls often open on pointerdown, while confirmation
            // buttons (for example Flow's rename Done button) commit only from
            // onClick. Let callers explicitly prefer the commit handler without
            // changing the safer pointer-first behavior used by pickers/menus.
            var handlers = preferClick === true
                ? ['onClick', 'onPointerDown', 'onMouseDown']
                : ['onPointerDown', 'onClick', 'onMouseDown'];
            for (var p = 0; p < propsCandidates.length; p++) {
                var props = propsCandidates[p];
                for (var h = 0; h < handlers.length; h++) {
                    if (typeof props[handlers[h]] === 'function') {
                        try {
                            var evtType = handlers[h] === 'onClick' ? 'click'
                                : handlers[h] === 'onPointerDown' ? 'pointerdown' : 'mousedown';
                            props[handlers[h]](makeFakeEvent(evtType, node));
                            return true;
                        } catch (e) {
                            // Continue trying other handlers/props/nodes
                        }
                    }
                }
            }
        }
        return false;
    }


    // Find the submit button (arrow_forward icon, not add_2 icon) and click it
    // via React fiber. Returns true if the onClick was called.
    function findAndClickSubmitViaFiber(targetId) {
        var submitBtn = null;
        if (targetId) {
            submitBtn = document.querySelector('[data-flow-automator-id="' + targetId + '"]');
        }
        if (!submitBtn) {
            var btns = Array.from(document.querySelectorAll('button, [role="button"]'))
                .filter(function (b) { return b.offsetParent !== null; });

            for (var i = 0; i < btns.length; i++) {
                var btn = btns[i];
                // Collect all leaf text content
                var leaves = Array.from(btn.querySelectorAll('*'))
                    .filter(function (n) { return n.childElementCount === 0; })
                    .map(function (n) { return (n.innerText || n.textContent || '').trim(); })
                    .join(' ').toLowerCase();
                var hasArrow = leaves.includes('arrow_forward') || leaves.includes('arrow_upward') || leaves.includes('send');
                var isAdd = /\badd\b|\badd_\d/.test(leaves);
                if (hasArrow && !isAdd) {
                    submitBtn = btn;
                    break;
                }
            }
        }

        if (!submitBtn) return { ok: false, info: 'no-submit-button' };

        // Try React fiber onClick first (bypasses isTrusted)
        var fiberClicked = callReactOnClick(submitBtn);
        if (fiberClicked) return { ok: true, info: 'fiber-onclick' };

        // Fallback: native .click() — works if React isn't blocking it
        try { submitBtn.click(); } catch (e) {}
        return { ok: true, info: 'native-click-fallback' };
    }

    // ── Event Listeners ────────────────────────────────────────────────────────

    on(document, 'FLOW_AUTOMATOR_PASTE', function (e) {
        if (!e.detail || typeof e.detail.value !== 'string') return;
        try {
            var target = getSafeTarget(e.detail.targetId);
            if (!target) return;
            var slateRoot = getSlateRootOf(target);
            if (slateRoot) {
                trySlateEditorInsertAtCursor(slateRoot, e.detail.value);
                return;
            }
            var dt = new DataTransfer();
            dt.setData('text/plain', e.detail.value);
            target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        } catch (err) { }
    });

    on(document, 'FLOW_AUTOMATOR_FIBER_INJECT', function (e) {
        if (!e.detail || typeof e.detail.value !== 'string') return;
        try {
            var target = getSafeTarget(e.detail.targetId);
            if (!target) return;
            var slateRoot = getSlateRootOf(target);
            if (slateRoot) {
                trySlateEditorInsertAtCursor(slateRoot, e.detail.value);
                return;
            }
            var propsKey = Object.keys(target).find(function (k) { return k.startsWith('__reactProps$'); });
            if (propsKey && target[propsKey] && typeof target[propsKey].onChange === 'function') {
                target[propsKey].onChange({ target: { value: e.detail.value }, currentTarget: { value: e.detail.value }, type: 'change', bubbles: true });
            }
        } catch (err) { }
    });

    on(document, 'FLOW_AUTOMATOR_GET_ASSETS', function (e) {
        var detail = e && e.detail ? e.detail : {};
        var requestId = detail.requestId || '';
        var assetMap = scanReactTreeForAssets();
        try {
            window.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_GET_ASSETS_RESULT', {
                detail: { requestId: requestId, assetMap: assetMap }
            }));
        } catch (err) { }
    });

    on(document, 'FLOW_AUTOMATOR_RENAME_MEDIA', async function (e) {
        var detail = e && e.detail ? e.detail : {};
        var requestId = detail.requestId || '';
        var targetId = detail.targetId || '';
        var newName = typeof detail.newName === 'string' ? detail.newName.trim() : '';
        var result = { ok: false, step: 'request', error: 'INVALID_RENAME_REQUEST' };
        try {
            var target = getSafeTarget(targetId);
            if (!target) {
                result = { ok: false, step: 'target-image', error: 'TARGET_IMAGE_NOT_FOUND' };
            } else if (!newName) {
                result = { ok: false, step: 'set-name', error: 'EMPTY_RENAME_VALUE' };
            } else {
                result = await renameFlowMediaVerified(target, newName);
            }
        } catch (err) {
            result = {
                ok: false,
                step: 'exception',
                error: err && err.message ? err.message : String(err)
            };
        }
        try {
            window.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_RENAME_MEDIA_RESULT', {
                detail: Object.assign({ requestId: requestId }, result)
            }));
        } catch (err) { }
    });

    on(document, 'FLOW_AUTOMATOR_SET_TEXT', function (e) {
        var detail = e && e.detail ? e.detail : {};
        var requestId = detail.requestId;
        var value = typeof detail.value === 'string' ? detail.value : '';

        function emitResult(ok, info) {
            try {
                window.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_SET_TEXT_RESULT', {
                    detail: { requestId: requestId, ok: !!ok, info: info || '' }
                }));
            } catch (err) { }
        }

        try {
            var target = getSafeTarget(detail.targetId);
            if (!target) { emitResult(false, 'no-target'); return; }

            var slateRoot = getSlateRootOf(target);
            if (slateRoot) {
                var ok = detail.preserveMedia
                    ? trySlateEditorInsertPreservingMedia(slateRoot, value, detail.assets)
                    : trySlateEditorInsert(slateRoot, value, detail.assets);
                emitResult(ok, ok
                    ? (detail.preserveMedia ? 'slate-preserve-media-insert' : 'slate-editor-insert')
                    : (detail.preserveMedia ? 'slate-preserve-media-failed' : 'slate-editor-insert-failed'));
                return;
            }

            if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !target.isContentEditable) {
                var inputResult = setReactControlledInputValue(target, value);
                emitResult(inputResult.ok, inputResult.info);
                return;
            }

            try { target.focus(); } catch (fe) { }
            try {
                var sel = window.getSelection && window.getSelection();
                if (sel) {
                    var range = document.createRange();
                    range.selectNodeContents(target);
                    if (detail.preserveMedia) {
                        range.collapse(false);
                    }
                    sel.removeAllRanges();
                    sel.addRange(range);
                    if (!detail.preserveMedia) {
                        try { document.execCommand('delete', false, null); } catch (de) { }
                    }
                }
            } catch (se) { }
            var inserted = false;
            try { inserted = !!document.execCommand('insertText', false, value); } catch (ee) { }
            if (!inserted) { target.textContent = value; }
            try {
                target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
            } catch (ie) {
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
            target.dispatchEvent(new Event('change', { bubbles: true }));
            emitResult(true, inserted ? 'execCommand' : 'textContent');
        } catch (err) {
            emitResult(false, 'exception');
        }
    });

    // NEW: Click the submit button via React fiber (bypasses isTrusted restriction)
    on(document, 'FLOW_AUTOMATOR_CLICK_SUBMIT', function (e) {
        var requestId = (e && e.detail && e.detail.requestId) || '';
        var targetId = (e && e.detail && e.detail.targetId) || '';
        var result = findAndClickSubmitViaFiber(targetId);
        try {
            window.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_CLICK_SUBMIT_RESULT', {
                detail: { requestId: requestId, ok: result.ok, info: result.info }
            }));
        } catch (err) { }
    });

    // NEW: Click an arbitrary element via React fiber onClick (bypasses isTrusted).
    // Used for reference-image tile selection, where Flow's React tiles ignore the
    // synthetic pointer/mouse events a content script can dispatch.
    on(document, 'FLOW_AUTOMATOR_CLICK_ELEMENT', function (e) {
        var requestId = (e && e.detail && e.detail.requestId) || '';
        var targetId = (e && e.detail && e.detail.targetId) || '';
        var preferClick = !!(e && e.detail && e.detail.preferClick);
        var ok = false;
        var info = 'no-target';
        try {
            var el = targetId
                ? document.querySelector('[data-flow-automator-id="' + targetId + '"]')
                : null;
            if (el) {
                ok = callReactOnClick(el, preferClick);
                info = ok ? 'fiber-onclick' : 'no-react-handler';
                if (!ok) {
                    // Fallback: native click (works when React isn't blocking).
                    try { el.click(); ok = true; info = 'native-click-fallback'; } catch (err) {}
                }
            }
        } catch (err) { info = 'exception'; }
        try {
            window.dispatchEvent(new CustomEvent('FLOW_AUTOMATOR_CLICK_ELEMENT_RESULT', {
                detail: { requestId: requestId, ok: ok, info: info }
            }));
        } catch (err) { }
    });


})();
