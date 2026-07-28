/**
 * Flow Prompt Automator - CSS Selectors
 * Updated for Google Flow Labs UI (v1.7.0)
 */

export const SELECTORS = {
    flow: {
        // Main UI
        PROMPT_INPUT: '[role="textbox"][aria-multiline="true"], [data-lexical-editor="true"], div[contenteditable="true"][aria-multiline="true"], div[contenteditable="plaintext-only"][aria-multiline="true"]',
        GENERATE_BUTTON: 'button[aria-label*="Generate"]:not([aria-label*="Download"]), button[aria-label*="Create"]:not([aria-label*="Download"]), button[aria-label*="Send"], button[aria-label*="Submit"], button[type="submit"], .sc-21faa80e-4',

        // Settings Popover (Trigger)
        SETTINGS_TRIGGER: 'button.sc-46973129-1, button[id^="radix-"], button[aria-haspopup="dialog"], button[aria-haspopup="true"], .sc-658f8892-0 button',

        // Inside Settings Popover
        RATIO_LANDSCAPE: 'button[id$="-trigger-LANDSCAPE"]',
        RATIO_PORTRAIT: 'button[id$="-trigger-PORTRAIT"]',

        QTY_1: 'button[id$="-trigger-1"]',
        QTY_2: 'button[id$="-trigger-2"]',
        QTY_3: 'button[id$="-trigger-3"]',
        QTY_4: 'button[id$="-trigger-4"]',

        MODEL_SELECT_TRIGGER: '.sc-658f8892-0 button, [aria-haspopup="menu"]',
        MODEL_ITEM: 'div[role="menuitem"], .sc-menu-item',

        // Signals
        // Generation signal: Flow uses div[role="status"] during generation
        GENERATION_SIGNAL: ['div[role="status"]', 'li[role="status"]', '.sc-generating-spinner', '[role="progressbar"]'],
        COMPLETION_SIGNALS: ['img', 'video', 'canvas', '.sc-result-media'],
        ERROR_SIGNALS: ['li[role="alert"]', '.sc-error-message'],
        PROMPT_TEXT: '[data-allow-text-selection="true"], .hxRvgy, .sc-prompt-text',
        DOWNLOAD_BUTTON: 'button[data-radix-collection-item] i.google-symbols, button[aria-label*="Download"], button[title*="Download"]',
        UPSCALED_DOWNLOAD_BUTTON: '[role="menuitem"], [data-radix-collection-item]',
        DISMISS_BUTTON: 'button[aria-label*="Dismiss"], .sc-toast-dismiss',
        HISTORY_TRIGGER: 'button[aria-label*="History"]',
        // Only select generated images (alt="Generated image" + data-tile-id)
        // Excludes reference assets (alt="A piece of media...") and profile images
        HISTORY_IMAGES: 'img[alt="Generated image"][src*="media.getMediaUrlRedirect"], video[alt="Generated image"][src*="media.getMediaUrlRedirect"], img[alt="Generated video"][src*="media.getMediaUrlRedirect"], video[alt="Generated video"][src*="media.getMediaUrlRedirect"], video[src*="media.getMediaUrlRedirect"]'
    }
};
