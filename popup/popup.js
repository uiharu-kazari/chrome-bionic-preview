/**
 * Bionic Preview - Popup Script
 */

// Gradient theme colors for preview
const gradientColors = {
  none: [],
  ocean: ['#4da6cc', '#5ca8b8', '#52b0b8', '#5cb8cc', '#4a9999'],
  sunset: ['#cc5c5c', '#cc704d', '#cc8533', '#ccab3d', '#b89940'],
  forest: ['#5c8f5c', '#6b8f52', '#528a52', '#6b996b', '#5c7352'],
  berry: ['#cc5c99', '#995c80', '#8a5c99', '#cc6699', '#b85c80'],
  lavender: ['#8a7acc', '#8f7ab8', '#8a8acc', '#8a6699', '#7a80b8'],
  autumn: ['#b87333', '#cc8f40', '#994d33', '#b89940', '#803333'],
  mint: ['#5cb88f', '#5ca87a', '#5cc2a8', '#5c996b', '#5cb8b8'],
  twilight: ['#6666b3', '#7a66a8', '#73528f', '#5c80cc', '#8a5280'],
  coffee: ['#6b5c4d', '#5c4d40', '#736652', '#4d3d33', '#806b52'],
  monochrome: ['#4d4d4d', '#666666', '#808080', '#737373', '#595959']
};

// DOM Elements
let enableToggle;
let fixationPoint;
let fixationValue;
let dimOpacity;
let opacityValue;
let gradientTheme;
let gradientPreview;
let autoMarkdown;
let markdownIndicator;
let contentScriptInjection;

// Current state
let currentState = {
  isEnabled: false,
  isMarkdownFile: false,
  settings: {
    fixationPoint: 3,
    dimOpacity: 0.5,
    gradientTheme: 'none',
    autoMarkdown: true
  }
};

/**
 * Initialize popup
 */
function init() {
  // Get DOM elements
  enableToggle = document.getElementById('enableToggle');
  fixationPoint = document.getElementById('fixationPoint');
  fixationValue = document.getElementById('fixationValue');
  dimOpacity = document.getElementById('dimOpacity');
  opacityValue = document.getElementById('opacityValue');
  gradientTheme = document.getElementById('gradientTheme');
  gradientPreview = document.getElementById('gradientPreview');
  autoMarkdown = document.getElementById('autoMarkdown');
  markdownIndicator = document.getElementById('markdownIndicator');

  // Disable toggle initially until we confirm the page is accessible
  enableToggle.disabled = true;

  // Add event listeners
  enableToggle.addEventListener('change', handleToggle);
  fixationPoint.addEventListener('input', handleFixationChange);
  dimOpacity.addEventListener('input', handleOpacityChange);
  gradientTheme.addEventListener('change', handleGradientChange);
  autoMarkdown.addEventListener('change', handleAutoMarkdownChange);

  // Get current state from content script
  getCurrentState();
}

/**
 * Check if URL is restricted
 */
function isRestrictedUrl(url) {
  // Treat empty, undefined, or null URLs as restricted (fail-safe)
  if (!url) return true;
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://');
}

/**
 * Get current state from content script
 */
function getCurrentState() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url;

      // Check if on restricted page
      if (isRestrictedUrl(url)) {
        enableToggle.checked = false;
        enableToggle.disabled = true;
        document.querySelector('.footer-text').textContent = 'Not available on this page';
        loadStoredSettings();
        return;
      }

      // Page is accessible, enable the toggle
      enableToggle.disabled = false;

      ensureContentScript(tabs[0].id)
        .then(updateCurrentState)
        .catch(() => {
          // The active tab may have become restricted while the popup was open.
          loadStoredSettings();
        });
    }
  });
}

/**
 * Send a message to the active page and surface the missing-listener error.
 */
function sendMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(response);
    });
  });
}

/**
 * Inject the content script on demand, then wait until it can return state.
 *
 * The extension uses activeTab instead of a persistent all-pages content
 * script. Without this handshake, the popup can display saved settings while
 * there is no listener in the newly opened page to apply them.
 */
function ensureContentScript(tabId) {
  return sendMessage(tabId, { type: 'getState' }).catch(() => {
    if (!contentScriptInjection) {
      contentScriptInjection = chrome.scripting.executeScript({
        target: { tabId },
        files: ['lib/katex.min.js', 'content/content.js']
      }).then(() => chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/content.css']
      })).finally(() => {
        contentScriptInjection = null;
      });
    }

    return contentScriptInjection.then(() => sendMessage(tabId, { type: 'getState' }));
  });
}

/**
 * Reflect the content script's actual state in the popup.
 */
function updateCurrentState(response) {
  if (!response) return;

  currentState = {
    isEnabled: response.isEnabled || false,
    isMarkdownFile: response.isMarkdownFile || false,
    settings: response.settings || currentState.settings
  };
  updateUI();
}

/**
 * Load settings from storage
 */
function loadStoredSettings() {
  chrome.storage.local.get(['isEnabled', 'settings'], (result) => {
    if (result.settings) {
      currentState.settings = { ...currentState.settings, ...result.settings };
    }
    if (result.isEnabled !== undefined) {
      currentState.isEnabled = result.isEnabled;
    }
    updateUI();
  });
}

/**
 * Update UI with current state
 */
function updateUI() {
  enableToggle.checked = currentState.isEnabled;

  const settings = currentState.settings;
  fixationPoint.value = settings.fixationPoint;
  fixationValue.textContent = settings.fixationPoint;

  const opacityPercent = Math.round(settings.dimOpacity * 100);
  dimOpacity.value = opacityPercent;
  opacityValue.textContent = `${opacityPercent}%`;

  gradientTheme.value = settings.gradientTheme;
  updateGradientPreview(settings.gradientTheme);

  autoMarkdown.checked = settings.autoMarkdown;

  // Show markdown indicator if applicable
  if (currentState.isMarkdownFile) {
    markdownIndicator.style.display = 'block';
  }
}

/**
 * Update gradient preview dots
 */
function updateGradientPreview(theme) {
  const colors = gradientColors[theme] || [];
  gradientPreview.innerHTML = '';

  colors.forEach(color => {
    const dot = document.createElement('div');
    dot.className = 'color-dot';
    dot.style.backgroundColor = color;
    gradientPreview.appendChild(dot);
  });
}

/**
 * Handle toggle change
 */
function handleToggle() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url;

      // Safety check for restricted URLs
      if (isRestrictedUrl(url)) {
        enableToggle.checked = false;
        enableToggle.disabled = true;
        return;
      }

      sendMessage(tabs[0].id, { type: 'toggle' })
        .catch(() => ensureContentScript(tabs[0].id)
          .then(() => sendMessage(tabs[0].id, { type: 'toggle' })))
        .then((response) => {
          if (response) {
            currentState.isEnabled = response.isEnabled;
            // Sync toggle visual with actual state
            enableToggle.checked = response.isEnabled;
          }
        })
        .catch(() => {
          // Silently fail if the tab became restricted or was closed.
          enableToggle.checked = false;
        });
    }
  });
}

/**
 * Handle fixation point change
 */
function handleFixationChange() {
  const value = parseInt(fixationPoint.value);
  fixationValue.textContent = value;
  currentState.settings.fixationPoint = value;
  sendSettingsUpdate();
}

/**
 * Handle opacity change
 */
function handleOpacityChange() {
  const value = parseInt(dimOpacity.value);
  opacityValue.textContent = `${value}%`;
  currentState.settings.dimOpacity = value / 100;
  sendSettingsUpdate();
}

/**
 * Handle gradient theme change
 */
function handleGradientChange() {
  const value = gradientTheme.value;
  currentState.settings.gradientTheme = value;
  updateGradientPreview(value);
  sendSettingsUpdate();
}

/**
 * Handle auto markdown change
 */
function handleAutoMarkdownChange() {
  currentState.settings.autoMarkdown = autoMarkdown.checked;
  sendSettingsUpdate();
}

/**
 * Send settings update to content script
 */
function sendSettingsUpdate() {
  // Persist first so a just-injected content script initializes with this value.
  chrome.storage.local.set({ settings: currentState.settings });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const updateMessage = {
        type: 'updateSettings',
        settings: currentState.settings
      };

      sendMessage(tabs[0].id, updateMessage)
        .catch(() => ensureContentScript(tabs[0].id)
          .then(() => sendMessage(tabs[0].id, updateMessage)))
        .catch(() => {
          // Storage already contains the setting for a tab that cannot be injected.
        });
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
