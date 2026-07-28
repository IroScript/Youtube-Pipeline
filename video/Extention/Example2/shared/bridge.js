(function () {
    var BRIDGE_VERSION = 47;
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

    function callReactOnClick(el) {
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
            var pk = Object.keys(node).find(function (k) { return k.startsWith('__reactProps$'); });
            if (!pk) continue;
            var props = node[pk];
            // Some dropdown/menu triggers open on onPointerDown rather than onClick,
            // so try onPointerDown first — but call only ONE handler per node. Calling
            // both in sequence (pointerdown immediately followed by a synthetic click,
            // an order that never happens in real user input) can desync a component's
            // internal press-state and crash the page's React tree.
            var handlers = ['onPointerDown', 'onClick', 'onMouseDown'];
            for (var h = 0; h < handlers.length; h++) {
                if (typeof props[handlers[h]] === 'function') {
                    try {
                        var evtType = handlers[h] === 'onClick' ? 'click'
                            : handlers[h] === 'onPointerDown' ? 'pointerdown' : 'mousedown';
                        props[handlers[h]](makeFakeEvent(evtType, node));
                        return true;
                    } catch (e) {
                        // Continue trying other handlers/nodes
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
                target.value = value;
                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
                emitResult(true, 'native-input');
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
        var ok = false;
        var info = 'no-target';
        try {
            var el = targetId
                ? document.querySelector('[data-flow-automator-id="' + targetId + '"]')
                : null;
            if (el) {
                ok = callReactOnClick(el);
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

