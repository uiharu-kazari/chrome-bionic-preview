/**
 * Bionic Markdown Preview - Background Service Worker
 * Handles extension installation and keyboard shortcuts
 */

// Default settings
const DEFAULT_SETTINGS = {
  fixationPoint: 3,
  dimOpacity: 0.5,
  gradientTheme: 'none',
  autoMarkdown: true
};

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      settings: DEFAULT_SETTINGS,
      isEnabled: false
    });

    // Open welcome page (optional)
    // chrome.tabs.create({ url: 'welcome.html' });
  }
});

/**
 * Handle keyboard shortcut commands
 */
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-bionic') {
    // Toggle bionic reading on active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle' }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script not loaded, inject it first
            injectContentScript(tabs[0].id);
          }
        });
      }
    });
  }
});

/**
 * Inject content script into tab
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css']
    });

    // Send toggle after injection
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: 'toggle' });
    }, 100);
  } catch (err) {
    console.error('Failed to inject content script:', err);
  }
}

/**
 * Handle messages from content scripts or popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'getSettings':
      chrome.storage.local.get(['settings'], (result) => {
        sendResponse(result.settings || DEFAULT_SETTINGS);
      });
      return true;

    case 'saveSettings':
      chrome.storage.local.set({ settings: message.settings }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'injectContent':
      if (sender.tab) {
        injectContentScript(sender.tab.id);
      }
      sendResponse({ success: true });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return false;
});

/**
 * Handle action click (when popup is disabled)
 * This allows clicking the extension icon to toggle bionic reading
 */
chrome.action.onClicked.addListener((tab) => {
  // This only fires if popup is not set
  // Since we have a popup, this won't fire by default
  // But we keep it here for future flexibility
  chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
});
