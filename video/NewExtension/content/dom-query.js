/**
 * FlowCraft DOM Query Engine - Supports custom pseudo-selectors (:has, :contains, :eq, :first, :last)
 */

export class DOMQueryEngine {
  static isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return !(
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      rect.bottom < 0 ||
      rect.top > (window.innerHeight || document.documentElement.clientHeight)
    );
  }

  static findMatchingGroupEnd(str, startIdx) {
    let depth = 1;
    for (let i = startIdx + 1; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')' && --depth === 0) return i;
    }
    return -1;
  }

  static splitByComma(str, delimiter = ',') {
    const parts = [];
    let depth = 0;
    let lastIdx = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '(' || char === '[') depth++;
      else if (char === ')' || char === ']') depth--;
      else if (str.startsWith(delimiter, i) && depth === 0) {
        parts.push(str.slice(lastIdx, i).trim());
        lastIdx = i + delimiter.length;
      }
    }
    parts.push(str.slice(lastIdx).trim());
    return parts.filter(Boolean);
  }

  static parsePseudo(selector) {
    let depth = 0;
    for (let i = 0; i < selector.length; i++) {
      const char = selector[i];
      if (char === '(') { depth++; continue; }
      if (char === ')') { depth--; continue; }
      if (char !== ':' || depth !== 0) continue;

      const pre = selector.slice(0, i);
      const post = selector.slice(i + 1);

      if (post.startsWith('has(')) {
        const end = this.findMatchingGroupEnd(post, 3);
        if (end !== -1) {
          return { pre, name: 'has', arg: post.slice(4, end), post: post.slice(end + 1) };
        }
      }

      if (post.startsWith('contains(')) {
        const match = /^contains\(["']?([^"']+)["']?\)(.*)$/.exec(post);
        if (match) {
          return { pre, name: 'contains', arg: match[1].trim(), post: match[2] };
        }
      }

      const eqMatch = /^eq\((\d+)\)(.*)$/.exec(post);
      if (eqMatch) {
        return { pre, name: 'eq', arg: eqMatch[1], post: eqMatch[2] };
      }

      if (/^first(?![a-z-])/.test(post)) {
        return { pre, name: 'first', arg: '', post: post.replace(/^first/, '') };
      }

      if (post.startsWith('last()')) {
        return { pre, name: 'last', arg: '', post: post.slice(6) };
      }
    }
    return null;
  }

  static queryAll(selector, root = document) {
    const trimmed = selector.trim();
    if (!trimmed) return [];

    if (!/:(has|contains|eq|first(?![a-z-])|last\()/.test(trimmed)) {
      try {
        return Array.from(root.querySelectorAll(trimmed));
      } catch {
        return [];
      }
    }

    const commaParts = this.splitByComma(trimmed, ',');
    if (commaParts.length > 1) {
      const seen = new Set();
      const results = [];
      for (const part of commaParts) {
        for (const el of this.queryAll(part, root)) {
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        }
      }
      return results;
    }

    const pseudo = this.parsePseudo(trimmed);
    if (!pseudo) {
      try {
        return Array.from(root.querySelectorAll(trimmed));
      } catch {
        return [];
      }
    }

    const { pre, name, arg, post } = pseudo;
    const baseSelector = pre.trim() || '*';

    switch (name) {
      case 'has': {
        let candidates = [];
        if (!arg.includes(':contains')) {
          try {
            candidates = Array.from(root.querySelectorAll(`${baseSelector}:has(${arg})`));
          } catch {}
        }
        if (!candidates.length) {
          try { candidates = Array.from(root.querySelectorAll(baseSelector)); } catch {}
          candidates = candidates.filter(el => this.queryAll(arg, el).length > 0);
        }

        const remaining = post.trim();
        if (!remaining) return candidates;
        if (remaining === ':first') return candidates.slice(0, 1);
        if (remaining === ':last()') return candidates.slice(-1);
        const eqM = /^:eq\((\d+)\)$/.exec(remaining);
        if (eqM) {
          const idx = parseInt(eqM[1], 10);
          return candidates[idx] ? [candidates[idx]] : [];
        }
        return candidates.flatMap(el => this.queryAll(remaining, el));
      }

      case 'contains': {
        let elements = [];
        try { elements = Array.from(root.querySelectorAll(baseSelector)); } catch {}
        elements = elements.filter(el => (el.textContent ?? '').includes(arg));
        const remaining = post.trim();
        if (!remaining) return elements;
        if (remaining === ':first') return elements.slice(0, 1);
        return elements.flatMap(el => this.queryAll(remaining, el));
      }

      case 'eq': {
        const matches = this.queryAll(baseSelector, root);
        const idx = parseInt(arg, 10);
        const el = matches[idx];
        return el ? (post.trim() ? this.queryAll(post, el) : [el]) : [];
      }

      case 'first': {
        const matches = this.queryAll(baseSelector, root);
        const el = matches[0];
        return el ? (post.trim() ? this.queryAll(post, el) : [el]) : [];
      }

      case 'last': {
        const matches = this.queryAll(baseSelector, root);
        const el = matches[matches.length - 1];
        return el ? (post.trim() ? this.queryAll(post, el) : [el]) : [];
      }

      default:
        return [];
    }
  }

  static queryFirst(selector, root = document) {
    return this.queryAll(selector, root)[0] ?? null;
  }

  static async waitForElement(selector, timeoutMs = 5000, pollIntervalMs = 100, requireVisible = true) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const el = this.queryFirst(selector);
      if (el && (!requireVisible || this.isVisible(el))) {
        await new Promise(r => setTimeout(r, 150));
        return el;
      }
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
    return null;
  }

  static async simulateClick(selector, label = 'element', timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
      const el = this.queryFirst(selector);
      if (el && this.isVisible(el)) {
        const mouseEvents = ['pointerover', 'mouseover', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        for (const evtName of mouseEvents) {
          el.dispatchEvent(new MouseEvent(evtName, {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            detail: 1
          }));
        }
        await new Promise(r => setTimeout(r, 250));
        return true;
      }
    }
    throw new Error(`Element "${label}" [${selector}] not found or not interactable within ${timeoutMs}ms`);
  }
}
