/**
 * Bionic Markdown Preview - Background Service Worker
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
    chrome.storage.local.set({
      settings: DEFAULT_SETTINGS,
      isEnabled: false
    });
  }
});

/**
 * Handle messages from content scripts or popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (message.type === 'saveSettings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  sendResponse({ error: 'Unknown message type' });
  return false;
});
