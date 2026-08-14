# FlowCraft AI Studio - Google Flow & Labs Automation Extension

**FlowCraft AI Studio** is a high-performance, modular Chrome Extension (Manifest V3) engineered for automating bulk video and image generation on Google Flow (`https://labs.google/*`).

---

## 🌟 Key Features

- **Batch Automation Pipeline**: Process dozens of prompts sequentially with customized mode (Text to Video, Image to Video, Ingredients, Text to Image, Image to Image, Agent).
- **Chrome SidePanel Integration**: Manage queues, configure aspect ratios, adjust output counts, attached reference images, and track real-time rendering progress in a modern UI.
- **Smart Video Chainer (`isConcat`)**: Automatically extracts the final frame of a generated video and feeds it as the start frame of the next prompt to seamlessly chain continuous story scenes.
- **CDP Input Handler**: Uses Chrome DevTools Protocol (`chrome.debugger`) to simulate low-level mouse click events, overcoming React synthetic event barriers and input locks.
- **Auto-Download Router**: Intercepts Chrome download events to organize generated videos & images into clean subfolders (`FlowCraft_Outputs`) with custom filename formatting.
- **Resolution Quality Selection**: Supports 4K, 2K, 1080p, 720p, and animated GIF upscale formats.
- **Dynamic Selector Store**: Caches DOM selectors and supports fetching remote selector updates if Google updates the Google Flow web app UI.
- **Console Log Terminal**: Real-time action log monitoring step execution, retry counts, and status updates.

---

## 📁 Directory & Architecture Overview

```
NewExtension/
├── manifest.json            # Manifest V3 setup & permissions
├── README.md                # Project documentation & installation guide
├── icons/                   # High-res extension icons (16, 32, 48, 128)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── utils/                   # Shared utility modules
│   ├── constants.js         # Action types, default selectors & configurations
│   ├── logger.js            # Centralized logging & UI broadcasting
│   └── messaging.js         # Chrome extension runtime messaging helper
├── background/              # Manifest V3 Service Worker modules
│   ├── service-worker.js    # Entry point & message routing
│   ├── selector-store.js    # Dynamic selector caching & remote endpoint store
│   ├── download-manager.js  # Download interceptor & subfolder routing
│   └── cdp-controller.js    # Chrome DevTools Protocol mouse & typing automation
├── content/                 # Content script modules injected into labs.google
│   ├── content-main.js      # Message listeners & task lifecycle runner
│   ├── dom-query.js         # Selector parser supporting :has, :contains, :eq, etc.
│   ├── input-handler.js     # Slate.js / React typing input injector
│   ├── media-uploader.js    # Base64 & Blob file input uploader
│   ├── video-chainer.js     # Video canvas frame extractor
│   ├── status-tracker.js    # Tile status, upscaling & GIF dialog tracker
│   └── execution-engine.js  # Automation pipeline step executor
├── sidepanel/               # SidePanel User Interface
│   ├── sidepanel.html       # Clean HTML5 structure
│   ├── sidepanel.css        # Dark theme styling with CSS custom variables
│   └── sidepanel.js         # Queue manager, image uploader & UI controller
└── options/                 # Extension Settings Page
    ├── options.html         # Settings UI HTML
    ├── options.css          # Options styling
    └── options.js           # Settings storage manager
```

---

## 🚀 Installation Guide

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner toggle.
3. Click **Load unpacked**.
4. Select the directory:
   `C:\Users\Irak\Desktop\Youtube Pipeline\video\NewExtension`
5. The **FlowCraft AI Studio** icon will appear in your Chrome toolbar.
6. Open `https://labs.google/` in your browser.
7. Click the extension icon to open the SidePanel and start generating!

---

## 🛠️ Technical Implementation & Security

- **Manifest V3 Compliant**: Uses background service worker ES modules (`"type": "module"`).
- **Pure Modern ES6+ JavaScript**: Zero heavy external bundle dependencies for maximum performance and instant load times.
- **Isolated Component Architecture**: Clear separation of concerns between Background, Content Script, SidePanel, and Options.
- **Secure Handling**: Local data processing with `chrome.storage.local` persistence.

---

## 📄 License
Independent original project engineered from scratch.
