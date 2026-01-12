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
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://');
}

/**
 * Get current state from content script
 */
function getCurrentState() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const url = tabs[0].url || '';

      // Check if on restricted page
      if (isRestrictedUrl(url)) {
        enableToggle.checked = false;
        enableToggle.disabled = true;
        document.querySelector('.footer-text').textContent = 'Not available on this page';
        loadStoredSettings();
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'getState' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, use stored settings
          loadStoredSettings();
          return;
        }

        if (response) {
          currentState = {
            isEnabled: response.isEnabled || false,
            isMarkdownFile: response.isMarkdownFile || false,
            settings: response.settings || currentState.settings
          };
          updateUI();
        }
      });
    }
  });
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
      const url = tabs[0].url || '';

      // Safety check for restricted URLs
      if (isRestrictedUrl(url)) {
        enableToggle.checked = false;
        enableToggle.disabled = true;
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, inject it first
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content/content.js']
          }).then(() => {
            chrome.scripting.insertCSS({
              target: { tabId: tabs[0].id },
              files: ['content/content.css']
            });
            // After injection, toggle again
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle' }, (res) => {
                if (res) {
                  currentState.isEnabled = res.isEnabled;
                  enableToggle.checked = res.isEnabled;
                }
              });
            }, 100);
          }).catch(err => {
            // Silently fail - likely a restricted page
            enableToggle.checked = false;
          });
          return;
        }

        if (response) {
          currentState.isEnabled = response.isEnabled;
          // Sync toggle visual with actual state
          enableToggle.checked = response.isEnabled;
        }
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
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'updateSettings',
        settings: currentState.settings
      }, (response) => {
        if (chrome.runtime.lastError) {
          // Just save to storage if content script not available
          chrome.storage.local.set({ settings: currentState.settings });
        }
      });
    }
  });

  // Also save to storage
  chrome.storage.local.set({ settings: currentState.settings });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
