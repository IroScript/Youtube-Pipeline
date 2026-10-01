/**
 * Browser Environment Mock for Automated Failure-Injection Testing
 * Simulates Chrome extension APIs, DOM query tree, and window events for Google Flow canvas.
 */

export class MockStorage {
  constructor() {
    this.store = new Map();
  }
  async get(keys) {
    const res = {};
    if (typeof keys === 'string') keys = [keys];
    if (Array.isArray(keys)) {
      for (const k of keys) {
        if (this.store.has(k)) res[k] = JSON.parse(JSON.stringify(this.store.get(k)));
      }
    } else if (keys === null || keys === undefined) {
      for (const [k, v] of this.store.entries()) {
        res[k] = JSON.parse(JSON.stringify(v));
      }
    }
    return res;
  }
  async set(items) {
    for (const [k, v] of Object.entries(items)) {
      this.store.set(k, JSON.parse(JSON.stringify(v)));
    }
  }
  async remove(keys) {
    if (typeof keys === 'string') keys = [keys];
    for (const k of keys) this.store.delete(k);
  }
  async clear() {
    this.store.clear();
  }
}

export class MockElement {
  constructor(tagName = 'div', attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = { ...attributes };
    this.children = [];
    this.innerText = attributes.innerText || '';
    this.textContent = this.innerText;
    this.value = attributes.value || '';
    this.disabled = !!attributes.disabled;
    this.offsetParent = {};
  }
  get src() {
    return this.attributes['src'] || '';
  }
  set src(val) {
    this.attributes['src'] = val;
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }
  hasAttribute(name) {
    return name in this.attributes;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  querySelector(sel) {
    if (sel.includes('video') && this.tagName === 'VIDEO') return this;
    for (const child of this.children) {
      if (child.matches(sel)) return child;
      const sub = child.querySelector(sel);
      if (sub) return sub;
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    for (const child of this.children) {
      if (child.matches(sel)) res.push(child);
      res.push(...child.querySelectorAll(sel));
    }
    return res;
  }
  matches(sel) {
    const parts = sel.split(',').map(s => s.trim());
    for (const p of parts) {
      if (p.startsWith('[data-tile-id')) {
        const match = p.match(/\[data-tile-id="?([^"\]]+)"?\]/);
        if (match && this.getAttribute('data-tile-id') === match[1]) return true;
        if (!match && this.hasAttribute('data-tile-id')) return true;
      }
      if (p.includes('[role="progressbar"]') && this.getAttribute('role') === 'progressbar') return true;
      if (p.includes('video') && this.tagName === 'VIDEO') return true;
      if (p.includes('button') && this.tagName === 'BUTTON') return true;
      if (p.includes('textarea') && this.tagName === 'TEXTAREA') return true;
      if (p.includes('div') && this.tagName === 'DIV') return true;
      if (p.includes('span') && this.tagName === 'SPAN') return true;
      if (p.includes('p') && this.tagName === 'P') return true;
      if (p.toUpperCase() === this.tagName) return true;
    }
    return false;
  }
  dispatchEvent(evt) {
    return true;
  }
  click() {}
  focus() {}
  appendChild(child) {
    this.children.push(child);
  }
}

export class MockEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.bubbles = !!init.bubbles;
    this.cancelable = !!init.cancelable;
    this.composed = !!init.composed;
  }
}

export class MockMouseEvent extends MockEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.buttons = init.buttons || 0;
  }
}

export class MockPointerEvent extends MockMouseEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.pointerId = init.pointerId || 1;
    this.isPrimary = init.isPrimary ?? true;
  }
}

export class MockKeyboardEvent extends MockEvent {
  constructor(type, init = {}) {
    super(type, init);
    this.key = init.key || '';
    this.code = init.code || '';
    this.keyCode = init.keyCode || 0;
    this.ctrlKey = !!init.ctrlKey;
  }
}

export class MockDocument {
  constructor() {
    this.elements = [];
    this.body = new MockElement('body');
  }
  createElement(tag) {
    return new MockElement(tag);
  }
  querySelector(sel) {
    for (const el of this.elements) {
      if (el.matches(sel)) return el;
      const sub = el.querySelector(sel);
      if (sub) return sub;
    }
    return null;
  }
  querySelectorAll(sel) {
    const res = [];
    for (const el of this.elements) {
      if (el.matches(sel)) res.push(el);
      res.push(...el.querySelectorAll(sel));
    }
    return res;
  }
  dispatchEvent(evt) {
    return true;
  }
  addMockTile(tileId, status = 'rendering', isVideo = true, promptText = '') {
    const tile = new MockElement('div', {
      'data-tile-id': tileId,
      innerText: promptText ? `Tile ${tileId} ${promptText}` : `Tile ${tileId} generated video prompt`
    });
    if (status === 'rendering') {
      const spinner = new MockElement('div', {
        'role': 'progressbar',
        'aria-valuenow': '45',
        innerText: 'Generating... 45%'
      });
      tile.appendChild(spinner);
    } else if (status === 'completed') {
      const vid = new MockElement('video', {
        src: `https://flow.google.com/media/${tileId}.mp4`
      });
      tile.appendChild(vid);
    }
    this.elements.push(tile);
    return tile;
  }
  clear() {
    this.elements = [];
  }
}

export function setupMockBrowser() {
  const storage = new MockStorage();
  const mockDoc = new MockDocument();
  const listeners = new Map();

  const mockWindow = {
    location: { href: 'https://flow.google.com/project/test-proj-123' },
    document: mockDoc,
    addEventListener: (event, handler) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
    removeEventListener: (event, handler) => {
      if (listeners.has(event)) {
        listeners.set(event, listeners.get(event).filter(h => h !== handler));
      }
    },
    dispatchEvent: (event) => {
      const list = listeners.get(event.type) || [];
      for (const h of list) h(event);
    },
    simulateOffline: () => {
      mockWindow.dispatchEvent({ type: 'offline' });
    },
    simulateOnline: () => {
      mockWindow.dispatchEvent({ type: 'online' });
    },
    simulateMessage: (data) => {
      mockWindow.dispatchEvent({ type: 'message', data });
    }
  };

  globalThis.window = mockWindow;
  globalThis.document = mockDoc;
  globalThis.Event = MockEvent;
  globalThis.MouseEvent = MockMouseEvent;
  globalThis.PointerEvent = MockPointerEvent;
  globalThis.KeyboardEvent = MockKeyboardEvent;
  globalThis.chrome = {
    storage: {
      local: storage
    },
    runtime: {
      sendMessage: async (msg) => ({ success: true }),
      onMessage: { addListener: () => {} }
    }
  };

  return { storage, mockDoc, mockWindow };
}
