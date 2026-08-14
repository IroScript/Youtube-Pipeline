// Content script - Injects flexible chat interface into Veo3 page
console.log('Content script: Loading Veo3 Assistant...');

class Veo3Assistant {
  constructor() {
    // console.log('Content script: Veo3Assistant constructor called');
    this.panelOpen = false;
    this.currentPrompt = null;
    this.messages = [];
    this.clearingConversation = false;
    this.activeTab = 'chat'; // Track active tab
    this.bookmarkedPrompts = []; // Store bookmarked prompts
    this.filteredPrompts = []; // Store filtered prompts for search
    this.isEditing = false; // Track editing state
    this.editingIndex = -1; // Track which prompt is being edited
    this.hasApiKey = false; // Track if API key is configured
    this.isCheckingApiKey = true; // Track if we're still checking for API key
    // 1. Add these properties to the Veo3Assistant constructor (around line 13):
    this.shortcutActive = false;
    this.shortcutQuery = '';
    this.shortcutResults = [];
    this.selectedShortcutIndex = -1;
    this.shortcutStartPos = 0;
    this.userPromptGuidance = ''; // Track user's prompt guidance
    this.characters = []; // Store characters
    this.filteredCharacters = []; // Store filtered characters for search
    this.isEditingCharacter = false; // Track character editing state
    this.editingCharacterIndex = -1; // Track which character is being edited
    this.optimizedPrompt = null; // Store optimized prompt
    this.init();
  }

  async init() {
    await this.checkApiKey();
    await this.loadUserPromptGuidance(); // Add this line
    this.loadMessages();
    this.loadBookmarkedPrompts();
    await this.loadCharacters();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createSidePanelToggle());
    } else {
      this.createSidePanelToggle();
    }
    
  }

  async checkApiKey() {
    try {
      // Check if extension context is still valid
      if (!chrome.storage) {
        console.warn('Extension context invalidated, cannot check API key');
        this.hasApiKey = false;
        this.isCheckingApiKey = false;
        return;
      }
      const result = await chrome.storage.sync.get(['geminiApiKey']);
      this.hasApiKey = !!(result.geminiApiKey && result.geminiApiKey.trim());
      this.isCheckingApiKey = false;
      console.log('API key check:', this.hasApiKey ? 'Found' : 'Not found');
    } catch (error) {
      // Handle extension context invalidated error gracefully
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, please refresh the page');
        this.hasApiKey = false;
        this.isCheckingApiKey = false;
      } else {
        console.error('Error checking API key:', error);
        this.hasApiKey = false;
        this.isCheckingApiKey = false;
      }
    }
  }

  loadMessages() {
    try {
      const saved = localStorage.getItem('veo3-assistant-messages');
      if (saved) {
        this.messages = JSON.parse(saved);
      } else {
        this.messages = [{
          text: "Hi! I can help you with Veo3 video prompts. What would you like to create?",
          type: 'assistant',
          timestamp: Date.now()
        }];
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      this.messages = [{
        text: "Hi! I can help you with Veo3 video prompts. What would you like to create?",
        type: 'assistant',
        timestamp: Date.now()
      }];
    }
  }

  async loadBookmarkedPrompts() {
    try {
      // Check if extension context is still valid
      if (!chrome.storage) {
        console.warn('Extension context invalidated, cannot load bookmarked prompts');
        this.bookmarkedPrompts = [];
        this.filteredPrompts = [];
        return;
      }
      const result = await chrome.storage.local.get(['bookmarkedPrompts']);
      this.bookmarkedPrompts = result.bookmarkedPrompts || [];
      this.filteredPrompts = [...this.bookmarkedPrompts];
    } catch (error) {
      // Handle extension context invalidated error gracefully
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, please refresh the page');
        this.bookmarkedPrompts = [];
        this.filteredPrompts = [];
      } else {
        console.error('Error loading bookmarked prompts:', error);
        this.bookmarkedPrompts = [];
        this.filteredPrompts = [];
      }
    }
  }
  async loadUserPromptGuidance() {
    try {
      if (!chrome.storage) {
        console.warn('Extension context invalidated, cannot load user prompt guidance');
        this.userPromptGuidance = '';
        return;
      }
      const result = await chrome.storage.local.get(['userPromptGuidance']);
      this.userPromptGuidance = result.userPromptGuidance || '';
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, please refresh the page');
        this.userPromptGuidance = '';
      } else {
        console.error('Error loading user prompt guidance:', error);
        this.userPromptGuidance = '';
      }
    }
  }

  async saveUserPromptGuidance(guidance) {
    try {
      await chrome.storage.local.set({ userPromptGuidance: guidance });
      this.userPromptGuidance = guidance;
    } catch (error) {
      console.error('Error saving user prompt guidance:', error);
      throw error;
    }
  }

  async loadCharacters() {
    try {
      // Check if extension context is still valid
      if (!chrome.storage) {
        console.warn('Extension context invalidated, cannot load characters');
        this.characters = [];
        this.filteredCharacters = [];
        return;
      }
      const result = await chrome.storage.local.get(['characters']);
      this.characters = result.characters || [];
      this.filteredCharacters = [...this.characters];
    } catch (error) {
      // Handle extension context invalidated error gracefully
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, please refresh the page');
        this.characters = [];
        this.filteredCharacters = [];
      } else {
        console.error('Error loading characters:', error);
        this.characters = [];
        this.filteredCharacters = [];
      }
    }
  }

  async saveCharacter(name, prompt) {
    try {
      if (!chrome.storage) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }
      const newCharacter = {
        name: name.trim(),
        prompt: prompt.trim(),
        timestamp: Date.now()
      };
      this.characters.unshift(newCharacter);
      await chrome.storage.local.set({ characters: this.characters });
      this.filteredCharacters = [...this.characters];
      return true;
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }
      console.error('Error saving character:', error);
      throw error;
    }
  }

  async updateCharacter(index, name, prompt) {
    try {
      if (!chrome.storage) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }
      if (index < 0 || index >= this.characters.length) {
        throw new Error('Invalid character index');
      }
      this.characters[index] = {
        ...this.characters[index],
        name: name.trim(),
        prompt: prompt.trim(),
        timestamp: Date.now()
      };
      await chrome.storage.local.set({ characters: this.characters });
      this.filteredCharacters = [...this.characters];
      return true;
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }
      console.error('Error updating character:', error);
      throw error;
    }
  }

  async deleteCharacter(index) {
    try {
      if (!chrome.storage) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }
      if (index < 0 || index >= this.characters.length) {
        throw new Error('Invalid character index');
      }
      this.characters.splice(index, 1);
      await chrome.storage.local.set({ characters: this.characters });
      this.filteredCharacters = [...this.characters];
      return true;
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }
      console.error('Error deleting character:', error);
      throw error;
    }
  }

  findVeoInputField() {
    const selectors = [
      '#PINHOLE_TEXT_AREA_ELEMENT_ID',
      'textarea',
      'div[contenteditable="true"]',
      '[role="textbox"]',
      '[aria-label*="prompt" i]',
      '[aria-label*="Enter" i]',
      'textarea[placeholder]'
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) return el;
    }
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  injectCharacterToVeo(prompt) {
    let inputField = this.findVeoInputField();

    if (inputField) {
      const currentValue = inputField.contentEditable === 'true' 
        ? (inputField.textContent || '') 
        : (inputField.value || '');
      const newValue = currentValue.trim() 
        ? `${currentValue.trim()}, ${prompt.trim()}`
        : prompt.trim();
      
      if (inputField.contentEditable === 'true') {
        inputField.textContent = newValue;
        inputField.focus();
      } else {
        try {
          const tracker = inputField._valueTracker;
          if (tracker) tracker.setValue('');
          const nativeSetter = Object.getOwnPropertyDescriptor(
            inputField instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
            'value'
          )?.set;
          if (nativeSetter) {
            nativeSetter.call(inputField, newValue);
          } else {
            inputField.value = newValue;
          }
        } catch(e) {
          inputField.value = newValue;
        }
        inputField.focus();
      }
      
      const events = ['input', 'change', 'keydown', 'keyup', 'paste'];
      events.forEach(eventType => {
        inputField.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      try {
        inputField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' ' }));
      } catch(e) {}

      // Also copy to clipboard for user convenience
      try { navigator.clipboard.writeText(newValue); } catch(e) {}
      
      return true;
    } else {
      // Fallback: Copy character prompt to clipboard
      try {
        navigator.clipboard.writeText(prompt.trim());
        alert('Character prompt copied to clipboard! You can paste it (Ctrl+V) into the prompt box.');
        return true;
      } catch(e) {
        return false;
      }
    }
  }

  async optimizePrompt(userInput) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'OPTIMIZE_PROMPT',
        userInput: userInput
      });

      if (response.success) {
        this.optimizedPrompt = response.prompt;
        return { success: true, prompt: response.prompt };
      } else {
        return { success: false, error: response.error || 'Failed to optimize prompt' };
      }
    } catch (error) {
      console.error('Error optimizing prompt:', error);
      return { success: false, error: error.message };
    }
  }

  injectOptimizedPrompt() {
    if (!this.optimizedPrompt) {
      return false;
    }
    // Reuse usePrompt logic but with optimized prompt
    const originalPrompt = this.currentPrompt;
    this.currentPrompt = this.optimizedPrompt;
    this.usePrompt();
    this.currentPrompt = originalPrompt;
    return true;
  }

  saveMessages() {
    try {
      localStorage.setItem('veo3-assistant-messages', JSON.stringify(this.messages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }

  clearConversation() {
    if (!this.clearingConversation) {
      this.clearingConversation = true;
      this.updateClearButton();
    }
  }

  confirmClearConversation() {
    this.messages = [{
      text: "Hi! I can help you with Veo3 video prompts. What would you like to create?",
      type: 'assistant',
      timestamp: Date.now()
    }];
    this.currentPrompt = null;
    this.clearingConversation = false;
    this.saveMessages();
    this.renderMessages();
    this.updateClearButton();
  }

  cancelClearConversation() {
    this.clearingConversation = false;
    this.updateClearButton();
  }

  updateClearButton() {
    const clearBtn = document.getElementById('clear-conversation');
    if (!clearBtn) return;

    if (this.clearingConversation) {
      clearBtn.innerHTML = `
        <span style="text-decoration: none !important; cursor: default;">Are you sure you want to clear convo?</span>
        <a href="#" id="confirm-clear" style="color: #A78BFA; text-decoration: underline; margin-left: 5px; cursor: pointer;">Yes</a>
        <a href="#" id="cancel-clear" style="color: #ff7777; text-decoration: underline; margin-left: 10px; cursor: pointer;">No, cancel</a>
      `;
      clearBtn.style.background = 'none';
      clearBtn.style.border = 'none';
      clearBtn.style.cursor = 'default';
      clearBtn.style.textDecoration = 'none';
    } else {
      clearBtn.innerHTML = 'Clear conversation';
      clearBtn.style.background = '';
      clearBtn.style.border = '';
      clearBtn.style.cursor = 'pointer';
      clearBtn.style.textDecoration = '';
    }
  }

  formatMessageText(text) {
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(\d+\.\s)/g, '\n$1');
    text = text.replace(/([.!?:]["']?)\s+(?!\d)/g, '$1\n\n');
    text = text.replace(/(\d+\.)\s*\n+\s*/g, '$1 ');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/\s+(Here's|For example)/g, '\n\n$1');
    return text.trim();
  }

  createSidePanelToggle() {
    // Create the side panel toggle button that peeks from the right edge
    const toggleButton = document.createElement('div');
    toggleButton.id = 'veo3-assistant-toggle';
    toggleButton.innerHTML = `<span style="font-size: 24px; font-weight: bold; color: currentColor;">V</span>`;
    toggleButton.title = 'Toggle VEO3 Assistant';
    document.body.appendChild(toggleButton);
  
    toggleButton.addEventListener('click', () => this.togglePanel());
  }

  togglePanel() {
    if (this.panelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  renderChatContent() {
    if (this.isCheckingApiKey) {
      return `
        <div class="api-key-setup">
          <div class="setup-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <p class="setup-loading">Checking configuration...</p>
        </div>
      `;
    }

    if (!this.hasApiKey) {
      return `
        <div class="api-key-setup">
          <div class="setup-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <circle cx="12" cy="16" r="1"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3>Welcome to Veo3 Assistant!</h3>
          <p class="setup-description">To get started, add your Gemini API key.</p>
          
          <div class="input-group">
            <label for="inline-api-key">Gemini API Key:</label>
            <input type="password" id="inline-api-key" placeholder="Enter your Gemini API key">
          </div>
          
          <button id="save-inline-key" class="primary-btn">Save & Continue</button>
          
          <div id="inline-status"></div>
          
          <div class="setup-help">
            <strong>How to get a free API key:</strong>
            1. Go to <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a><br>
            2. Create a new API key<br>
            3. Paste it above
          </div>
        </div>
      `;
    }

    return `
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-footer">
        <div class="chat-footer-actions">
          <div id="clear-conversation" class="clear-btn">Clear conversation</div>
        </div>
        <div class="chat-input-container">
          <div class="input-wrapper">
            <textarea id="chat-input" placeholder="Ask anything or type / for shortcuts" rows="1"></textarea>
            <div class="input-controls">
              <button id="send-btn" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
                  <path d="m5 12 7-7 7 7"/>
                  <path d="m12 20 0-15"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="chat-actions">
          <button id="use-prompt-btn" disabled>Use Video Prompt</button>
        </div>
      </div>
    `;
  }

  openPanel() {
    // Create the side panel
    const sidePanel = document.createElement('div');
    sidePanel.id = 'veo3-assistant-panel';
    sidePanel.innerHTML = `
      <div class="panel-header">
        <h3>CoDirector</h3>
        <button id="close-panel">×</button>
      </div>
      
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button class="tab-btn active" data-tab="chat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>
        <button class="tab-btn" data-tab="optimizer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          Optimizer
        </button>
        <button class="tab-btn" data-tab="characters">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Characters
        </button>
      </div>

      <!-- Chat Tab Content -->
      <div id="chat-tab" class="tab-content active">
        ${this.renderChatContent()}
      </div>

      <!-- Optimizer Tab Content -->
      <div id="optimizer-tab" class="tab-content">
        <div class="optimizer-view">
          <div class="optimizer-header">
            <h3>Prompt Optimizer</h3>
            <p class="optimizer-description">
              Transform your simple ideas into cinematic, Veo 3.1-optimized prompts.
            </p>
          </div>
          
          <div class="optimizer-content">
            <div class="optimizer-input">
              <label for="optimizer-input">Your Idea:</label>
              <textarea 
                id="optimizer-input" 
                rows="4" 
                placeholder="Enter your idea in natural language, e.g., 'a man holding a sword'"
              ></textarea>
            </div>
            
            <div class="optimizer-actions">
              <button id="optimize-btn" class="primary-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                Optimize
              </button>
            </div>
            
            <div id="optimizer-result" class="optimizer-result" style="display: none;">
              <label>Optimized Prompt:</label>
              <div class="optimized-prompt-display" id="optimized-prompt-display"></div>
              <button id="use-optimized-btn" class="primary-btn" style="margin-top: 12px;">
                Use in Veo
              </button>
            </div>
            
            <div id="optimizer-status" class="optimizer-status"></div>
          </div>
        </div>
      </div>
      <!-- Characters Tab Content -->
      <div id="characters-tab" class="tab-content">
        <div class="characters-view">
          <div class="characters-header">
            <div class="characters-header-top">
              <h3>Character Library</h3>
              <button id="add-character-btn" class="add-character-btn" title="Add new character">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14m-7-7h14"/>
                </svg>
              </button>
            </div>
            <div class="characters-search">
              <div class="search-wrapper">
                <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text" id="character-search" placeholder="Search characters..." />
              </div>
            </div>
          </div>
          
          <div class="characters-content" id="characters-content">
            <div class="characters-empty" id="characters-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3>No Characters</h3>
              <p>Add characters to maintain consistency across your videos!</p>
            </div>
            <div class="characters-grid" id="characters-grid"></div>
          </div>
        </div>

        <!-- Character Edit View -->
        <div id="character-edit-view" class="character-edit-view" style="display: none;">
          <div class="character-edit-header">
            <button id="back-to-characters" class="back-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h3 id="character-edit-title">Add Character</h3>
          </div>
          <div class="character-edit-body">
            <div class="edit-field">
              <label for="character-name">Character Name:</label>
              <input type="text" id="character-name" placeholder="Enter character name">
            </div>
            <div class="edit-field">
              <label for="character-prompt">Consistency Prompt:</label>
              <textarea id="character-prompt" rows="8" placeholder="Enter the character description for consistency, e.g., 'a young, blonde caucasian woman in rugged green hiking gear, brown backpack, detailed face'"></textarea>
            </div>
          </div>
          <div class="character-edit-footer">
            <button class="modal-btn secondary" id="cancel-character-edit">Cancel</button>
            <button class="modal-btn primary" id="save-character-btn">Save Character</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(sidePanel);

    // Push the body content to the left
    document.body.style.marginRight = '400px';
    document.body.style.transition = 'margin-right 0.3s ease';

    // For sites where body margin doesn't work (like Gemini), try the viewport container
    setTimeout(() => {
      const bodyRect = document.body.getBoundingClientRect();
      if (bodyRect.right > window.innerWidth - 50) { // Body didn't move much
        const container = document.querySelector('[data-app], #root, main, [role="main"]');
        if (container) {
          container.style.marginRight = '400px';
          container.style.transition = 'margin-right 0.3s ease';
          this.fallbackContainer = container;
        }
      }
    }, 100);

    // Update toggle button state
    const toggleButton = document.getElementById('veo3-assistant-toggle');
    toggleButton.classList.add('panel-open');

    this.setupEventListeners();
    
    // Only render messages if we have an API key
    if (this.hasApiKey) {
      this.renderMessages();
    }
    
    this.panelOpen = true;
  }

  setupEventListeners() {
    // Close button
    document.getElementById('close-panel').addEventListener('click', () => this.closePanel());
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Setup API key inline form if visible
    if (!this.hasApiKey && !this.isCheckingApiKey) {
      this.setupInlineApiKeyForm();
    }

    // Setup chat functionality only if we have an API key
    if (this.hasApiKey) {
      this.setupChatListeners();
    }


    // Optimizer functionality
    this.setupOptimizerListeners();

    // Characters functionality
    this.setupCharacterListeners();
  }

  setupOptimizerListeners() {
    const optimizeBtn = document.getElementById('optimize-btn');
    const useOptimizedBtn = document.getElementById('use-optimized-btn');
    const optimizerInput = document.getElementById('optimizer-input');
    const optimizerResult = document.getElementById('optimizer-result');
    const optimizerStatus = document.getElementById('optimizer-status');

    if (optimizeBtn) {
      optimizeBtn.addEventListener('click', async () => {
        const userInput = optimizerInput?.value.trim();
        if (!userInput) {
          this.showOptimizerStatus('Please enter an idea to optimize', 'error');
          return;
        }

        optimizeBtn.disabled = true;
        optimizeBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          Optimizing...
        `;
        this.showOptimizerStatus('', '');

        try {
          const result = await this.optimizePrompt(userInput);
          if (result.success) {
            const display = document.getElementById('optimized-prompt-display');
            if (display) {
              display.textContent = result.prompt;
            }
            optimizerResult.style.display = 'block';
            this.showOptimizerStatus('✅ Prompt optimized successfully!', 'success');
          } else {
            this.showOptimizerStatus(`❌ ${result.error}`, 'error');
            optimizerResult.style.display = 'none';
          }
        } catch (error) {
          this.showOptimizerStatus(`❌ Error: ${error.message}`, 'error');
          optimizerResult.style.display = 'none';
        } finally {
          optimizeBtn.disabled = false;
          optimizeBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            Optimize
          `;
        }
      });
    }

    if (useOptimizedBtn) {
      useOptimizedBtn.addEventListener('click', () => {
        if (this.injectOptimizedPrompt()) {
          this.showOptimizerStatus('✅ Prompt injected to Veo!', 'success');
        } else {
          this.showOptimizerStatus('❌ Could not find Veo input field', 'error');
        }
      });
    }
  }

  showOptimizerStatus(message, type) {
    const status = document.getElementById('optimizer-status');
    if (!status) return;
    
    status.textContent = message;
    status.className = `optimizer-status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        status.textContent = '';
        status.className = 'optimizer-status';
      }, 3000);
    }
  }

  setupCharacterListeners() {
    const addCharacterBtn = document.getElementById('add-character-btn');
    const saveCharacterBtn = document.getElementById('save-character-btn');
    const cancelCharacterEdit = document.getElementById('cancel-character-edit');
    const backToCharacters = document.getElementById('back-to-characters');
    const characterSearch = document.getElementById('character-search');

    if (addCharacterBtn) {
      addCharacterBtn.addEventListener('click', () => {
        this.showCharacterEditView();
      });
    }

    if (saveCharacterBtn) {
      saveCharacterBtn.addEventListener('click', async () => {
        const name = document.getElementById('character-name')?.value.trim();
        const prompt = document.getElementById('character-prompt')?.value.trim();

        if (!name || !prompt) {
          alert('Please fill in both character name and prompt');
          return;
        }

        try {
          if (this.isEditingCharacter && this.editingCharacterIndex >= 0) {
            const originalIndex = this.characters.findIndex((c, i) => 
              i === this.editingCharacterIndex
            );
            if (originalIndex >= 0) {
              await this.updateCharacter(originalIndex, name, prompt);
            }
          } else {
            await this.saveCharacter(name, prompt);
          }
          this.showCharactersView();
          this.renderCharacters();
        } catch (error) {
          console.error('Error saving character:', error);
          alert('Error saving character. Please try again.');
        }
      });
    }

    if (cancelCharacterEdit) {
      cancelCharacterEdit.addEventListener('click', () => {
        this.showCharactersView();
      });
    }

    if (backToCharacters) {
      backToCharacters.addEventListener('click', () => {
        this.showCharactersView();
      });
    }

    if (characterSearch) {
      characterSearch.addEventListener('input', (e) => {
        this.searchCharacters(e.target.value);
      });
    }

    // Render characters on tab switch
    this.renderCharacters();
  }

  showCharacterEditView() {
    const editView = document.getElementById('character-edit-view');
    const charactersView = document.querySelector('.characters-view');
    
    if (editView && charactersView) {
      editView.style.display = 'block';
      charactersView.style.display = 'none';
      
      // Clear form
      document.getElementById('character-name').value = '';
      document.getElementById('character-prompt').value = '';
      document.getElementById('character-edit-title').textContent = 'Add Character';
      this.isEditingCharacter = false;
      this.editingCharacterIndex = -1;
    }
  }

  showCharactersView() {
    const editView = document.getElementById('character-edit-view');
    const charactersView = document.querySelector('.characters-view');
    
    if (editView && charactersView) {
      editView.style.display = 'none';
      charactersView.style.display = 'block';
    }
  }

  renderCharacters() {
    const charactersGrid = document.getElementById('characters-grid');
    const charactersEmpty = document.getElementById('characters-empty');
    const charactersContent = document.getElementById('characters-content');

    if (!charactersGrid || !charactersEmpty || !charactersContent) return;

    if (this.filteredCharacters.length === 0) {
      charactersEmpty.style.display = 'flex';
      charactersGrid.style.display = 'none';
    } else {
      charactersEmpty.style.display = 'none';
      charactersGrid.style.display = 'grid';
      charactersGrid.innerHTML = '';

      this.filteredCharacters.forEach((character, index) => {
        const originalIndex = this.characters.findIndex(c => 
          c.timestamp === character.timestamp
        );
        const card = this.createCharacterCard(character, originalIndex);
        charactersGrid.appendChild(card);
      });
    }
  }

  createCharacterCard(character, index) {
    const card = document.createElement('div');
    card.className = 'character-card';
    
    const truncatedPrompt = this.truncateText(character.prompt, 100);
    const date = new Date(character.timestamp).toLocaleDateString();

    card.innerHTML = `
      <div class="character-card-header">
        <h4 class="character-name" title="${character.name}">${character.name}</h4>
        <div class="character-actions">
          <button class="action-btn edit-character-btn" data-index="${index}" title="Edit character">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-btn delete-character-btn" data-index="${index}" title="Delete character">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="character-prompt">${truncatedPrompt}</div>
      <div class="character-meta">
        <span class="character-date">${date}</span>
        <button class="use-character-btn" data-index="${index}">
          Use
        </button>
      </div>
    `;

    card.querySelector('.edit-character-btn').addEventListener('click', () => {
      this.editCharacter(index);
    });

    card.querySelector('.delete-character-btn').addEventListener('click', () => {
      this.deleteCharacterConfirm(index);
    });

    card.querySelector('.use-character-btn').addEventListener('click', () => {
      this.useCharacter(index);
    });

    return card;
  }

  editCharacter(index) {
    if (index < 0 || index >= this.characters.length) return;

    const character = this.characters[index];
    this.isEditingCharacter = true;
    this.editingCharacterIndex = index;

    document.getElementById('character-name').value = character.name;
    document.getElementById('character-prompt').value = character.prompt;
    document.getElementById('character-edit-title').textContent = 'Edit Character';

    this.showCharacterEditView();
  }

  async deleteCharacterConfirm(index) {
    if (!confirm('Are you sure you want to delete this character?')) return;

    try {
      await this.deleteCharacter(index);
      this.renderCharacters();
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Error deleting character. Please try again.');
    }
  }

  useCharacter(index) {
    if (index < 0 || index >= this.characters.length) return;

    const character = this.characters[index];
    if (this.injectCharacterToVeo(character.prompt)) {
      // Show success feedback
      const btn = document.querySelector(`.use-character-btn[data-index="${index}"]`);
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Used';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2000);
      }
    } else {
      alert('Could not find Veo input field. Please make sure you are on a Veo page.');
    }
  }

  searchCharacters(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      this.filteredCharacters = [...this.characters];
    } else {
      this.filteredCharacters = this.characters.filter(character => 
        character.name.toLowerCase().includes(searchTerm) ||
        character.prompt.toLowerCase().includes(searchTerm)
      );
    }
    
    this.renderCharacters();
  }

  setupInlineApiKeyForm() {
    const apiKeyInput = document.getElementById('inline-api-key');
    const saveBtn = document.getElementById('save-inline-key');
    const status = document.getElementById('inline-status');

    if (!apiKeyInput || !saveBtn || !status) return;

    saveBtn.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      
      if (!apiKey) {
        this.showInlineStatus('Please enter an API key', 'error');
        return;
      }

      // Basic validation - Gemini API keys can start with 'AI' or 'AQ'
      if (apiKey.length < 15) {
        this.showInlineStatus('API key format looks incorrect', 'error');
        return;
      }

      try {
        await chrome.storage.sync.set({ geminiApiKey: apiKey });
        this.showInlineStatus('API key saved successfully!', 'success');
        
        // Update state and refresh UI
        this.hasApiKey = true;
        
        setTimeout(() => {
          this.refreshChatTab();
        }, 1500);
      } catch (error) {
        console.error('Error saving API key:', error);
        this.showInlineStatus('Error saving API key', 'error');
      }
    });

    // Allow Enter key to save
    apiKeyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      }
    });
  }

  showInlineStatus(message, type) {
    const status = document.getElementById('inline-status');
    if (!status) return;
    
    status.textContent = message;
    status.className = `inline-status ${type}`;
    status.style.display = 'block';
  }

  refreshChatTab() {
    const chatTab = document.getElementById('chat-tab');
    if (!chatTab) return;

    chatTab.innerHTML = this.renderChatContent();
    
    // Re-setup chat listeners
    this.setupChatListeners();
    
    // Render messages
    this.renderMessages();
  }

  setupChatListeners() {
    // Chat functionality
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendMessage());
    }

    const clearBtn = document.getElementById('clear-conversation');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.id === 'confirm-clear') {
          this.confirmClearConversation();
        } else if (e.target.id === 'cancel-clear') {
          this.cancelClearConversation();
        } else {
          this.clearConversation();
        }
      });
    }
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        if (this.shortcutActive) {
          this.handleShortcutKeydown(e);
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      chatInput.addEventListener('input', (e) => {
        this.autoExpandTextarea(e);
        this.handleShortcutInput(e);
        this.updateSendButtonState();
      });

      // Focus input and update send button state
      chatInput.focus();
      this.updateSendButtonState();
    }
    
    // const chatInput = document.getElementById('chat-input');
    // if (chatInput) {
    //   chatInput.addEventListener('keypress', (e) => {
    //     if (e.key === 'Enter' && !e.shiftKey) {
    //       e.preventDefault();
    //       this.sendMessage();
    //     }
    //   });
      
    //   chatInput.addEventListener('input', (e) => {
    //     this.autoExpandTextarea(e);
    //     this.updateSendButtonState();
    //   });

    //   // Focus input and update send button state
    //   chatInput.focus();
    //   this.updateSendButtonState();
    // }
    
    const useBtn = document.getElementById('use-prompt-btn');
    if (useBtn) {
      useBtn.addEventListener('click', () => this.usePrompt());
    }
  }
  // 3. Add these new methods after the setupChatListeners() method (around line 400):
  handleShortcutInput(e) {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Find the last "/" before or at cursor position
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      // Check if there's no space after the last "/"
      const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
      const hasSpaceAfterSlash = textAfterSlash.includes(' ');
      
      if (!hasSpaceAfterSlash) {
        if (!this.shortcutActive) {
          this.shortcutActive = true;
          this.shortcutStartPos = lastSlashIndex;
          this.showShortcutDropdown();
        }
        
        this.shortcutQuery = textAfterSlash.toLowerCase();
        this.filterShortcutResults();
        this.updateShortcutDropdown();
      } else if (this.shortcutActive) {
        this.hideShortcutDropdown();
      }
    } else if (this.shortcutActive) {
      this.hideShortcutDropdown();
    }
  }

  handleShortcutKeydown(e) {
    const dropdown = document.getElementById('shortcut-dropdown');
    if (!dropdown) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedShortcutIndex = Math.min(
          this.selectedShortcutIndex + 1, 
          this.shortcutResults.length - 1
        );
        this.updateShortcutSelection();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedShortcutIndex = Math.max(this.selectedShortcutIndex - 1, -1);
        this.updateShortcutSelection();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.selectedShortcutIndex >= 0) {
          this.selectShortcutPrompt(this.shortcutResults[this.selectedShortcutIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        this.hideShortcutDropdown();
        break;
    }
  }

  showShortcutDropdown() {
    const inputContainer = document.querySelector('.chat-input-container');
    if (!inputContainer) return;
    
    const dropdown = document.createElement('div');
    dropdown.id = 'shortcut-dropdown';
    dropdown.className = 'shortcut-dropdown';
    
    inputContainer.appendChild(dropdown);
  }

  filterShortcutResults() {
    if (!this.shortcutQuery) {
      this.shortcutResults = [...this.bookmarkedPrompts].slice(0, 8);
    } else {
      this.shortcutResults = this.bookmarkedPrompts
        .filter(prompt => {
          const titleMatch = prompt.title?.toLowerCase().includes(this.shortcutQuery);
          const textMatch = prompt.text.toLowerCase().includes(this.shortcutQuery);
          return titleMatch || textMatch;
        })
        .slice(0, 8);
    }
    
    this.selectedShortcutIndex = this.shortcutResults.length > 0 ? 0 : -1;
  }

  updateShortcutDropdown() {
    const dropdown = document.getElementById('shortcut-dropdown');
    if (!dropdown) return;
    
    if (this.shortcutResults.length === 0) {
      dropdown.innerHTML = `
        <div class="shortcut-item no-results">
          <div class="shortcut-text">No saved prompts found</div>
        </div>
      `;
      return;
    }
    
    dropdown.innerHTML = this.shortcutResults
      .map((prompt, index) => {
        const title = prompt.title || 'Untitled Prompt';
        const snippet = this.truncateText(prompt.text, 80);
        
        return `
          <div class="shortcut-item ${index === this.selectedShortcutIndex ? 'selected' : ''}" 
              data-index="${index}">
            <div class="shortcut-title">${this.escapeHtml(title)}</div>
            <div class="shortcut-text">${this.escapeHtml(snippet)}</div>
          </div>
        `;
      })
      .join('');
    
    // Add click listeners
    dropdown.querySelectorAll('.shortcut-item:not(.no-results)').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectShortcutPrompt(this.shortcutResults[index]);
      });
    });
  }

  updateShortcutSelection() {
    const dropdown = document.getElementById('shortcut-dropdown');
    if (!dropdown) return;
    
    dropdown.querySelectorAll('.shortcut-item').forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedShortcutIndex);
    });
    
    // Scroll selected item into view
    const selectedItem = dropdown.querySelector('.shortcut-item.selected');
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' });
    }
  }

  selectShortcutPrompt(prompt) {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput || !prompt) return;
    
    const currentValue = chatInput.value;
    const beforeShortcut = currentValue.substring(0, this.shortcutStartPos);
    const afterCursor = currentValue.substring(chatInput.selectionStart);
    
    const newValue = beforeShortcut + prompt.text + afterCursor;
    chatInput.value = newValue;
    
    // Set cursor position after the inserted prompt
    const newCursorPos = beforeShortcut.length + prompt.text.length;
    chatInput.setSelectionRange(newCursorPos, newCursorPos);
    chatInput.focus();
    
    // Auto-expand textarea
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 400) + 'px';
    
    this.hideShortcutDropdown();
    this.updateSendButtonState();
  }

  hideShortcutDropdown() {
    const dropdown = document.getElementById('shortcut-dropdown');
    if (dropdown) {
      dropdown.remove();
    }
    
    this.shortcutActive = false;
    this.shortcutQuery = '';
    this.shortcutResults = [];
    this.selectedShortcutIndex = -1;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    
    // Render characters when switching to characters tab
    if (tabName === 'characters') {
      setTimeout(() => {
        this.renderCharacters();
      }, 100);
    }
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

  }

  searchPrompts(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      this.filteredPrompts = [...this.bookmarkedPrompts];
    } else {
      this.filteredPrompts = this.bookmarkedPrompts.filter(prompt => 
        prompt.text.toLowerCase().includes(searchTerm) ||
        (prompt.title && prompt.title.toLowerCase().includes(searchTerm))
      );
    }
    
    this.renderLibrary();
  }

  async renderLibrary() {
    const libraryContent = document.getElementById('library-content');
    const emptyState = document.getElementById('library-empty');
    const promptsGrid = document.getElementById('prompts-grid');
    
    if (!libraryContent || !emptyState || !promptsGrid) return;
    
    if (this.filteredPrompts.length === 0) {
      emptyState.style.display = 'flex';
      promptsGrid.style.display = 'none';
      return;
    }
    
    emptyState.style.display = 'none';
    promptsGrid.style.display = 'block';
    
    promptsGrid.innerHTML = '';
    
    this.filteredPrompts.forEach((prompt, index) => {
      const promptCard = this.createPromptCard(prompt, index);
      promptsGrid.appendChild(promptCard);
    });
  }

  createPromptCard(prompt, index) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    
    const truncatedText = this.truncateText(prompt.text, 150);
    const title = prompt.title || 'Untitled Prompt';
    const date = new Date(prompt.timestamp).toLocaleDateString();
    
    card.innerHTML = `
      <div class="prompt-card-header">
        <h4 class="prompt-title" title="${title}">${title}</h4>
        <div class="prompt-actions">
          <button class="action-btn edit-btn" data-index="${index}" title="Edit prompt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-btn delete-btn" data-index="${index}" title="Delete prompt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="prompt-text">${truncatedText}</div>
      <div class="prompt-meta">
        <span class="prompt-date">${date}</span>
        <button class="use-library-prompt-btn" data-index="${index}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
          <path d="M15 4V2m0 16v-2m8-6h-2M3 12H1m2.22-6.78L4.64 6.64m12.72 0l1.42-1.42M6.64 17.36L5.22 18.78m12.72 0l-1.42-1.42"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Remix
      </button>
        
      </div>
    `;

    // Add event listeners
    card.querySelector('.edit-btn').addEventListener('click', () => this.editPrompt(index));
    card.querySelector('.delete-btn').addEventListener('click', () => this.deletePrompt(index));
    card.querySelector('.use-library-prompt-btn').addEventListener('click', () => this.remixLibraryPrompt(index));

    return card;
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength - 50) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  editPrompt(index) {
    const prompt = this.filteredPrompts[index];
    this.editingIndex = this.bookmarkedPrompts.findIndex(p => p.timestamp === prompt.timestamp);
    
    // Populate edit form
    document.getElementById('edit-title').value = prompt.title || '';
    document.getElementById('edit-text').value = prompt.text;
    
    this.showEditView();
  }
  addNewPrompt() {
    this.editingIndex = -1; // -1 indicates adding new prompt
    
    // Clear edit form
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-text').value = '';
    
    // Update header title
    document.getElementById('edit-view-title').textContent = 'Add New Prompt';
    
    this.showEditView();
  }

  showEditView() {
    this.isEditing = true;
    document.getElementById('library-view').style.display = 'none';
    document.getElementById('edit-view').style.display = 'flex';
  }

  showLibraryView() {
    this.isEditing = false;
    this.editingIndex = -1;
    
    // Reset header title
    document.getElementById('edit-view-title').textContent = 'Edit Prompt';
    
    document.getElementById('edit-view').style.display = 'none';
    document.getElementById('library-view').style.display = 'flex';
  }

  async saveEditedPrompt() {
    const newTitle = document.getElementById('edit-title').value.trim();
    const newText = document.getElementById('edit-text').value.trim();
    
    if (!newText) {
      alert('Prompt text cannot be empty');
      return;
    }
  
    if (this.editingIndex === -1) {
      // Adding new prompt
      const newPrompt = {
        title: newTitle || 'Untitled Prompt',
        text: newText,
        timestamp: Date.now(),
        url: location.href
      };
      
      this.bookmarkedPrompts.unshift(newPrompt);
    } else {
      // Editing existing prompt
      if (this.editingIndex >= this.bookmarkedPrompts.length) {
        alert('Error: Could not find prompt to edit');
        return;
      }
  
      this.bookmarkedPrompts[this.editingIndex] = {
        ...this.bookmarkedPrompts[this.editingIndex],
        title: newTitle || 'Untitled Prompt',
        text: newText
      };
    }
  
    try {
      await chrome.storage.local.set({ bookmarkedPrompts: this.bookmarkedPrompts });
      this.filteredPrompts = [...this.bookmarkedPrompts];
      this.renderLibrary();
      this.showLibraryView();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Error saving prompt. Please try again.');
    }
  }

  async deletePrompt(index) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    const prompt = this.filteredPrompts[index];
    const originalIndex = this.bookmarkedPrompts.findIndex(p => p.timestamp === prompt.timestamp);
    
    this.bookmarkedPrompts.splice(originalIndex, 1);
    
    try {
      await chrome.storage.local.set({ bookmarkedPrompts: this.bookmarkedPrompts });
      this.filteredPrompts = [...this.bookmarkedPrompts];
      this.renderLibrary();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Error deleting prompt. Please try again.');
    }
  }

  remixLibraryPrompt(index) {
    const prompt = this.filteredPrompts[index];
    
    // Switch to chat tab
    this.switchTab('chat');
    
    // Prepare the remix input text
    const remixText = `Create a new prompt by using the structure below, but for a new scene:\n- describe scene...\n\n${prompt.text}`;
    
    // Put the remix text in the input box
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      chatInput.value = remixText;
      chatInput.focus();
      
      // Auto-expand the textarea to fit the content
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
      
      // Scroll to the top of the textarea so user sees "Remix..." at the beginning
      chatInput.scrollTop = 0;
      
      // Position cursor at the end of "- describe scene..." line for easy editing
      const cursorPosition = remixText.indexOf('- describe scene...') + '- describe scene...'.length;
      chatInput.setSelectionRange(cursorPosition, cursorPosition);
      
      // Update send button state
      this.updateSendButtonState();
    }
  }
  loadGuidanceIntoForm() {
    const guidanceTextarea = document.getElementById('prompt-guidance');
    if (guidanceTextarea) {
      guidanceTextarea.value = this.userPromptGuidance;
    }
  }
  saveGuidance() {
    const status = document.getElementById('guidance-status');
    
    if (!status) return;
    
    this.showGuidanceStatus('Coming soon! For early access, please email me - linda@productlessons.xyz', 'error');
  }

  // async saveGuidance() {
  //   const guidanceTextarea = document.getElementById('prompt-guidance');
  //   const saveBtn = document.getElementById('save-guidance-btn');
  //   const status = document.getElementById('guidance-status');
    
  //   if (!guidanceTextarea || !saveBtn || !status) return;
    
  //   const guidance = guidanceTextarea.value.trim();
    
  //   // Update button state
  //   saveBtn.disabled = true;
  //   saveBtn.innerHTML = 'Saving...';
    
  //   try {
  //     await this.saveUserPromptGuidance(guidance);
      
  //     this.showGuidanceStatus(
  //       guidance ? 'Training saved successfully! 🎬' : 'Training cleared successfully!', 
  //       'success'
  //     );
      
  //   } catch (error) {
  //     console.error('Error saving guidance:', error);
  //     this.showGuidanceStatus('Error saving training. Please try again.', 'error');
  //   } finally {
  //     // Restore button state
  //     setTimeout(() => {
  //       saveBtn.disabled = false;
  //       saveBtn.innerHTML = `
  //         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
  //           <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
  //           <polyline points="17,21 17,13 7,13 7,21"/>
  //           <polyline points="7,3 7,8 15,8"/>
  //         </svg>
  //         Save Training
  //       `;
  //     }, 1000);
  //   }
  // }

  // clearGuidance() {
  //   const guidanceTextarea = document.getElementById('prompt-guidance');
  //   if (guidanceTextarea) {
  //     if (guidanceTextarea.value.trim() && !confirm('Are you sure you want to clear your training data?')) {
  //       return;
  //     }
  //     guidanceTextarea.value = '';
  //     guidanceTextarea.focus();
  //   }
  // }
  async clearGuidance() {
    const guidanceTextarea = document.getElementById('prompt-guidance');
    const clearBtn = document.getElementById('clear-guidance-btn');
    const status = document.getElementById('guidance-status');
    
    if (!guidanceTextarea || !clearBtn || !status) return;
    
    if (guidanceTextarea.value.trim() && !confirm('Are you sure you want to clear your training data?')) {
      return;
    }
    
    // Update button state
    clearBtn.disabled = true;
    clearBtn.innerHTML = 'Clearing...';
    
    try {
      // Clear the textarea
      guidanceTextarea.value = '';
      
      // Save the empty state to storage
      await this.saveUserPromptGuidance('');
      
      this.showGuidanceStatus('Training cleared successfully! 🗑️', 'success');
      
      guidanceTextarea.focus();
      
    } catch (error) {
      console.error('Error clearing guidance:', error);
      this.showGuidanceStatus('Error clearing training. Please try again.', 'error');
    } finally {
      // Restore button state
      setTimeout(() => {
        clearBtn.disabled = false;
        clearBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2-2v2"/>
          </svg>
          Clear
        `;
      }, 4000);
    }
  }

  showGuidanceStatus(message, type) {
    const status = document.getElementById('guidance-status');
    if (!status) return;
    
    status.textContent = message;
    status.className = `guidance-status ${type}`;
    status.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }

  updateSendButtonState() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    if (chatInput && sendBtn) {
      sendBtn.disabled = !chatInput.value.trim();
    }
  }

  renderMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    this.messages.forEach(msg => {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${msg.type}-message`;
      
      if (msg.isVeoPrompt) {
        messageDiv.classList.add('veo-prompt-message');
        const promptLabel = document.createElement('div');
        promptLabel.className = 'prompt-label';
        promptLabel.textContent = '🎬 Video Prompt:';
        messageDiv.appendChild(promptLabel);
      }
      
      const textDiv = document.createElement('div');
      const formattedText = this.formatMessageText(msg.text);
      textDiv.innerHTML = formattedText;
      textDiv.style.whiteSpace = 'pre-wrap';
      
      messageDiv.appendChild(textDiv);
      messagesContainer.appendChild(messageDiv);
    });
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    const useBtn = document.getElementById('use-prompt-btn');
    if (useBtn) {
      useBtn.disabled = !this.currentPrompt;
    }
  }

  autoExpandTextarea(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
  }

  closePanel() {
    const panel = document.getElementById('veo3-assistant-panel');
    if (panel) panel.remove();
    
    // Reset body margin
    document.body.style.marginRight = '0';

    // Reset fallback container if used
    if (this.fallbackContainer) {
      this.fallbackContainer.style.marginRight = '0';
      this.fallbackContainer = null;
    }
    
    // Update toggle button state
    const toggleButton = document.getElementById('veo3-assistant-toggle');
    toggleButton.classList.remove('panel-open');
    
    this.panelOpen = false;
    this.clearingConversation = false;
    this.hideShortcutDropdown();
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    // console.log('Content script: Sending message:', message);

    const userMessage = { text: message, type: 'user', timestamp: Date.now() };
    this.messages.push(userMessage);
    this.saveMessages();
    this.addMessage(message, 'user');
    
    input.value = '';
    input.style.height = 'auto';
    this.updateSendButtonState();

    const typingId = this.addMessage('Thinking...', 'assistant', true);

    try {
      // console.log('Content script: About to send message to background');
      
      const conversationHistory = this.messages.filter(msg => 
        msg.type === 'user' || 
        (msg.type === 'assistant' && !msg.text.includes('✅') && !msg.text.includes('❌') && !msg.text.includes('Error:'))
      );
      
    //   const response = await chrome.runtime.sendMessage({
    //     type: 'CHAT_MESSAGE',
    //     userInput: message,
    //     conversationHistory: conversationHistory
    //   });
    let response;
    try {
    response = await chrome.runtime.sendMessage({
        type: 'CHAT_MESSAGE',
        userInput: message,
        conversationHistory
    });

    if (!response) {
        throw new Error('No response from background script');
    }

    // console.log('Content script: Got response from background:', response);
    } catch (err) {
    console.error('Content script: Background script unavailable:', err);

    // Optional: show a user-facing message before refresh
    this.addMessage(
        '⏳ Reconnecting... refreshing the page because the extension was inactive.',
        'assistant error'
    );

    // Wait a short time so user can read the message
    setTimeout(() => {
        location.reload();
    }, 1500);

    return; // Exit early so the rest of the function doesn't run
    }


      // console.log('Content script: Got response from background:', response);

      const typingElement = document.getElementById(typingId);
      if (typingElement) {
        typingElement.remove();
      }

      if (response.success) {
        let displayMessage = response.message;
        // let isVeoPrompt = response.isVeoPrompt;
        // let veoPrompt = response.veoPrompt;
        // console.log('🔍 Original message:', response.message);
        // let displayMessage = this.removeDuplicateText(response.message);
        // console.log('🔍 After duplicate removal:', displayMessage);
        let isVeoPrompt = response.isVeoPrompt;
        let veoPrompt = response.veoPrompt;
        // let veoPrompt = response.veoPrompt ? this.removeDuplicateText(response.veoPrompt) : null;
        
        if (isVeoPrompt) {
          this.currentPrompt = (veoPrompt || displayMessage).replace(/\*\*(.*?)\*\*/g, '$1');
        }
        
        const assistantMessage = { 
          text: displayMessage, 
          type: 'assistant', 
          timestamp: Date.now(),
          isVeoPrompt: isVeoPrompt
        };
        this.messages.push(assistantMessage);
        this.saveMessages();
        
        this.addMessage(displayMessage, 'assistant', false, isVeoPrompt);
        
        const useBtn = document.getElementById('use-prompt-btn');
        if (useBtn) {
          useBtn.disabled = !this.currentPrompt;
        }
      } else {
        const errorMsg = 'Error: ' + response.error;
        const errorMessage = { text: errorMsg, type: 'assistant error', timestamp: Date.now() };
        this.messages.push(errorMessage);
        this.saveMessages();
        
        this.addMessage(errorMsg, 'assistant error');
        console.log('Content script: Full error response:', response);
        if (response.debugInfo) {
          console.log('Content script: Debug info:', response.debugInfo);
        }
      }
    } catch (error) {
      console.error('Content script: Error in sendMessage:', error);
      
      const typingElement = document.getElementById(typingId);
      if (typingElement) {
        typingElement.remove();
      }
      
      const errorMsg = 'Error connecting to AI service. Please check your API key.';
      const errorMessage = { text: errorMsg, type: 'assistant error', timestamp: Date.now() };
      this.messages.push(errorMessage);
      this.saveMessages();
      
      this.addMessage(errorMsg, 'assistant error');
    }
  }

  addMessage(text, type, isTyping = false, isVeoPrompt = false) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return null;
    
    const messageDiv = document.createElement('div');
    const messageId = 'msg-' + Date.now();
    messageDiv.id = messageId;
    
    messageDiv.className = `message ${type}-message ${isTyping ? 'typing' : ''} ${isVeoPrompt ? 'veo-prompt-message' : ''}`;
    
    if (isVeoPrompt && !isTyping) {
      const promptLabel = document.createElement('div');
      promptLabel.className = 'prompt-label';
      promptLabel.textContent = '🎬 Video Prompt:';
      messageDiv.appendChild(promptLabel);
    }
    
    const textDiv = document.createElement('div');
    
    if (!isTyping) {
      const formattedText = this.formatMessageText(text);
      textDiv.innerHTML = formattedText;
      textDiv.style.whiteSpace = 'pre-wrap';
    } else {
      textDiv.textContent = text;
    }
    
    messageDiv.appendChild(textDiv);
    
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
    return messageId;
  }

  usePrompt() {
    if (!this.currentPrompt) {
      const errorMsg = '❌ No video prompt available. Please ask for a video prompt first.';
      const errorMessage = { text: errorMsg, type: 'assistant error', timestamp: Date.now() };
      this.messages.push(errorMessage);
      this.saveMessages();
      this.addMessage(errorMsg, 'assistant error');
      return;
    }

    let inputField = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');

    if (!inputField) {
        inputField = document.querySelector('[aria-label="Enter a prompt here"]');
    }
    if (!inputField) {
      inputField = document.querySelector('textarea[placeholder*="8s video"]');
    }
    
    if (inputField) {
        if (inputField.contentEditable === 'true') {
          inputField.textContent = this.currentPrompt;
          inputField.focus();
        } else {
          inputField.value = this.currentPrompt;
          inputField.focus();
        }
      
      const events = ['input', 'change', 'keyup', 'paste'];
      events.forEach(eventType => {
        inputField.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      try {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        nativeInputValueSetter.call(inputField, this.currentPrompt);
      } catch (e) {
        // Ignore if the element doesn't support this method
      }
      
      const inputEvent = new Event('input', { bubbles: true });
      inputEvent.simulated = true;
      inputField.dispatchEvent(inputEvent);
      
      const successMsg = '✅ Video prompt pasted successfully!';
      const successMessage = { text: successMsg, type: 'assistant', timestamp: Date.now() };
      this.messages.push(successMessage);
      this.saveMessages();
      
      this.addMessage(successMsg, 'assistant');
      
    } else {
      const fallbackSelectors = [
        'textarea[placeholder*="Generate a video with text"]',
        'textarea[placeholder*="8s video"]',
        'textarea.sc-d49e2b8-0.ldIWJU',
        'textarea[placeholder*="video"]',
        'textarea[placeholder*="prompt"]'
      ];

      let foundField = null;
      for (const selector of fallbackSelectors) {
        foundField = document.querySelector(selector);
        if (foundField) break;
      }

      if (foundField) {
        foundField.value = this.currentPrompt;
        foundField.focus();
        foundField.dispatchEvent(new Event('input', { bubbles: true }));
        foundField.dispatchEvent(new Event('change', { bubbles: true }));
        
        const successMsg = '✅ Video prompt pasted using fallback method!';
        const successMessage = { text: successMsg, type: 'assistant', timestamp: Date.now() };
        this.messages.push(successMessage);
        this.saveMessages();
        
        this.addMessage(successMsg, 'assistant');
      } else {
        const errorMsg = '❌ Could not find Veo3 prompt input field. The page structure may have changed.';
        const errorMessage = { text: errorMsg, type: 'assistant error', timestamp: Date.now() };
        this.messages.push(errorMessage);
        this.saveMessages();
        
        this.addMessage(errorMsg, 'assistant error');
        
        navigator.clipboard.writeText(this.currentPrompt).then(() => {
          const clipboardMsg = '📋 Video prompt copied to clipboard as fallback. Please paste manually.';
          const clipboardMessage = { text: clipboardMsg, type: 'assistant', timestamp: Date.now() };
          this.messages.push(clipboardMessage);
          this.saveMessages();
          
          this.addMessage(clipboardMsg, 'assistant');
        }).catch(() => {
          console.error('Could not copy to clipboard');
        });
      }
    }
  }
}

// Initialize the assistant
new Veo3Assistant();

// PromptBookmarker class for bookmarking prompts found on the page
class PromptBookmarker {
    constructor() {
      this.bookmarkedPrompts = new Set();
      this.observer = null;
      this.init();
    }
  
    async init() {
      await this.loadBookmarkedPrompts();
      this.observeForPrompts();
      this.defer(() => this.processExistingPrompts(), 2000);
    }
  
    async loadBookmarkedPrompts() {
      try {
        const result = await chrome.storage.local.get(['bookmarkedPrompts']);
        if (Array.isArray(result.bookmarkedPrompts)) {
          this.bookmarkedPrompts = new Set(result.bookmarkedPrompts.map(p => p.text));
        }
      } catch (error) {
        console.error('🔖 Error loading bookmarks:', error);
      }
    }
  
    observeForPrompts() {
      this.observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.hasAttribute?.('data-index')) this.processPromptContainer(node);
              node.querySelectorAll?.('[data-index]').forEach(el => this.processPromptContainer(el));
            }
          }
        }
      });
  
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
  
    processExistingPrompts() {
      document.querySelectorAll('[data-index]').forEach(container => this.processPromptContainer(container));
    }
  
    processPromptContainer(container) {
      if (container.dataset.bookmarkerProcessed) return;
  
      const promptTextButton = this.findPromptTextButton(container);
      if (!promptTextButton) return;
  
      const promptText = promptTextButton.textContent.trim();
      if (this.findExistingBookmarkButton(promptTextButton)) return;
  
      this.injectBookmarkButtonNextToText(promptTextButton, promptText);
      container.dataset.bookmarkerProcessed = 'true';
    }
  
    findPromptTextButton(container) {
      return Array.from(container.querySelectorAll('button')).find(button => {
        const text = button.textContent.trim();
        return text.length > 50 && this.looksLikePrompt(text) && !this.isUIControlButton(button);
      });
    }
  
    isUIControlButton(button) {
      const uiButtonTexts = [
        'Reuse prompt', 'more options', 'Copy', 'Download', 
        'Flip card', 'Fullscreen', 'Add to scene'
      ];
      const text = button.textContent.trim();
      const spanText = button.querySelector('span')?.textContent.trim() || '';
      return uiButtonTexts.some(txt => text.includes(txt) || spanText === txt);
    }
  
    findExistingBookmarkButton(button) {
      let el = button;
      for (let i = 0; i < 3 && el; i++) {
        const found = el.querySelector('.prompt-bookmark-btn');
        if (found) return found;
        el = el.parentElement;
      }
      return null;
    }
  
    looksLikePrompt(text) {
      const keywords = ['shot', 'camera', 'video', 'scene', 'image', 'realistic', 'detail', 'view', 'background', 'lighting'];
      const lower = text.toLowerCase();
      return keywords.filter(k => lower.includes(k)).length >= 2 || text.length > 200;
    }
  
    injectBookmarkButtonNextToText(promptTextButton, promptText) {
      const isBookmarked = this.bookmarkedPrompts.has(promptText);
  
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.alignItems = 'flex-start';
      buttonContainer.style.gap = '8px';
      buttonContainer.style.width = '100%';
  
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'prompt-bookmark-btn';
      bookmarkBtn.title = isBookmarked ? 'Remove bookmark' : 'Bookmark prompt';
      bookmarkBtn.style.cssText = `
        background: transparent;
        border: 1px solid #444;
        border-radius: 8px;
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
        min-height: 40px;
        color: #ccc;
        flex-shrink: 0;
        transition: all 0.2s ease;
      `;
  
      bookmarkBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: ${isBookmarked ? '#8B5CF6' : '#ccc'};">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" ${isBookmarked ? 'fill="currentColor"' : ''}/>
        </svg>
        <span style="position:absolute;border:0;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);">
          ${isBookmarked ? 'Remove bookmark' : 'Bookmark prompt'}
        </span>
      `;
  
      bookmarkBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleBookmark(promptText, bookmarkBtn);
      });
  
      bookmarkBtn.addEventListener('mouseenter', () => {
        bookmarkBtn.style.backgroundColor = '#333';
        bookmarkBtn.style.borderColor = '#555';
      });
      bookmarkBtn.addEventListener('mouseleave', () => {
        bookmarkBtn.style.backgroundColor = 'transparent';
        bookmarkBtn.style.borderColor = '#444';
      });
  
      const parent = promptTextButton.parentElement;
      const next = promptTextButton.nextSibling;
  
      promptTextButton.remove();
      buttonContainer.appendChild(promptTextButton);
      buttonContainer.appendChild(bookmarkBtn);
  
      next ? parent.insertBefore(buttonContainer, next) : parent.appendChild(buttonContainer);
    }
  
    async toggleBookmark(promptText, buttonElement) {
      try {
        const result = await chrome.storage.local.get(['bookmarkedPrompts']);
        let bookmarks = result.bookmarkedPrompts || [];
        const index = bookmarks.findIndex(b => b.text === promptText);
        const isBookmarked = index !== -1;
  
        if (isBookmarked) {
          bookmarks.splice(index, 1);
          this.bookmarkedPrompts.delete(promptText);
        } else {
          bookmarks.unshift({
            text: promptText,
            timestamp: Date.now(),
            url: location.href,
            title: document.title || 'Prompt'
          });
          this.bookmarkedPrompts.add(promptText);
        }
  
        await chrome.storage.local.set({ bookmarkedPrompts: bookmarks });
        this.updateButtonState(buttonElement, !isBookmarked);
      } catch (error) {
        console.error('🔖 Bookmark toggle error:', error);
      }
    }
  
    updateButtonState(buttonElement, isBookmarked) {
      const svg = buttonElement.querySelector('svg');
      const path = svg.querySelector('path');
      const label = buttonElement.querySelector('span');
  
      svg.style.color = isBookmarked ? '#8B5CF6' : '#ccc';
      if (isBookmarked) {
        path.setAttribute('fill', 'currentColor');
      } else {
        path.removeAttribute('fill');
      }
      
      label.textContent = isBookmarked ? 'Remove bookmark' : 'Bookmark prompt';
      buttonElement.title = isBookmarked ? 'Remove bookmark' : 'Bookmark prompt';
    }
  
    defer(fn, delay) {
      setTimeout(fn, delay);
    }
  }
  
  // Initialize PromptBookmarker
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PromptBookmarker());
  } else {
    new PromptBookmarker();
  }