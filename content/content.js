/** Bionic Preview - reversible, user-invoked page transformation. */
(function () {
  'use strict';
  // A delayed/retried injection must not register another page listener.
  if (globalThis.__bionicPreviewInstalled) return;
  globalThis.__bionicPreviewInstalled = true;

  let isEnabled = false;
  let settings = { fixationPoint: 3, dimOpacity: 0.5, gradientTheme: 'none', autoMarkdown: true };
  let originalContent = null;
  let initializationPromise;
  let observer;
  let refreshTimer;
  const isMarkdownFile = /\.(md|markdown|mdown|mkd|mkdn)$/i.test(window.location.pathname) ||
    /text\/(?:x-)?markdown/.test(document.contentType || '');

  function validatedSettings(candidate = {}) {
    return {
      fixationPoint: Number.isFinite(candidate.fixationPoint) ? Math.min(5, Math.max(1, Math.round(candidate.fixationPoint))) : settings.fixationPoint,
      dimOpacity: Number.isFinite(candidate.dimOpacity) ? Math.min(0.9, Math.max(0.1, candidate.dimOpacity)) : settings.dimOpacity,
      gradientTheme: Object.hasOwn(GradientReader.themes, candidate.gradientTheme) ? candidate.gradientTheme : settings.gradientTheme,
      autoMarkdown: typeof candidate.autoMarkdown === 'boolean' ? candidate.autoMarkdown : settings.autoMarkdown
    };
  }

  function transformMarkdownFile() {
    const pre = document.querySelector('pre');
    const rawText = pre ? pre.textContent : document.body.textContent;
    if (!rawText) return;
    const container = document.createElement('div');
    container.className = 'bionic-markdown-container';
    const article = document.createElement('article');
    article.className = 'bionic-markdown-content';
    article.innerHTML = MarkdownParser.parse(rawText);
    container.appendChild(article);
    // Keep actual nodes so disabling preserves listeners, form state and identity.
    originalContent = document.createDocumentFragment();
    while (document.body.firstChild) originalContent.appendChild(document.body.firstChild);
    document.body.appendChild(container);
    document.body.classList.add('bionic-markdown-preview');
  }

  function processPage() {
    observer?.disconnect();
    const area = document.querySelector('.bionic-markdown-content') || document.body;
    BionicReader.processElement(area, settings.fixationPoint, settings.dimOpacity);
    GradientReader.applyGradient(area, settings.gradientTheme);
    if (isEnabled) observer?.observe(area, { childList: true, subtree: true, characterData: true });
  }

  function applyBionicReading() {
    if (isMarkdownFile && settings.autoMarkdown) transformMarkdownFile();
    document.body.classList.add('bionic-reading-enabled');
    observer = new MutationObserver(() => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(processPage, 50);
    });
    processPage();
  }

  function removeBionicReading() {
    clearTimeout(refreshTimer);
    observer?.disconnect();
    observer = null;
    const area = document.querySelector('.bionic-markdown-content') || document.body;
    BionicReader.removeFromElement(area);
    GradientReader.removeGradient(area);
    if (originalContent !== null) {
      document.body.replaceChildren(originalContent);
      originalContent = null;
      document.body.classList.remove('bionic-markdown-preview');
    }
    document.body.classList.remove('bionic-reading-enabled');
  }

  function toggle() {
    isEnabled = !isEnabled;
    if (isEnabled) applyBionicReading();
    else removeBionicReading();
    return isEnabled;
  }

  function updateSettings(candidate) {
    settings = validatedSettings({ ...settings, ...candidate });
    chrome.storage.local.set({ settings });
    if (isEnabled) {
      removeBionicReading();
      applyBionicReading();
    }
  }

  function init() {
    if (initializationPromise) return initializationPromise;
    initializationPromise = new Promise(resolve => {
      chrome.storage.local.get(['settings'], result => {
        settings = validatedSettings(result.settings);
        // Reading state belongs to this document. A toggle on one tab must not
        // silently enable another tab; only reading preferences are persisted.
        if (isMarkdownFile && settings.autoMarkdown) {
          isEnabled = true;
          applyBionicReading();
        }
        resolve();
      });
    });
    return initializationPromise;
  }

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (isEnabled) processPage();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    init().then(() => {
      switch (message?.type) {
        case 'toggle': sendResponse({ isEnabled: toggle() }); break;
        case 'updateSettings': updateSettings(message.settings); sendResponse({ success: true }); break;
        case 'getState': sendResponse({ isEnabled, settings, isMarkdownFile }); break;
        default: sendResponse({ error: 'Unknown message type' });
      }
    }).catch(() => sendResponse({ error: 'Could not update this page' }));
    return true;
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
