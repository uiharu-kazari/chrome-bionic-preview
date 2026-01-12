/**
 * Bionic Preview - Content Script
 * Handles page transformation with bionic preview and gradient effects
 */

// Import libraries by injecting scripts
(function() {
  'use strict';

  // State
  let isEnabled = false;
  let settings = {
    fixationPoint: 3,
    dimOpacity: 0.5,
    gradientTheme: 'none',
    autoMarkdown: true
  };
  let originalContent = null;
  let isMarkdownFile = false;

  /**
   * Check if the current page is a raw markdown file
   */
  function checkIfMarkdownFile() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // Check file extension
    if (/\.(md|markdown|mdown|mkd|mkdn)$/i.test(pathname)) {
      return true;
    }

    // Check GitHub raw files
    if (url.includes('raw.githubusercontent.com') && /\.(md|markdown)$/i.test(pathname)) {
      return true;
    }

    // Check content type (for raw file views)
    const contentType = document.contentType;
    if (contentType && (contentType.includes('text/markdown') || contentType.includes('text/x-markdown'))) {
      return true;
    }

    return false;
  }

  /**
   * Calculate how many characters to bold based on word length and fixation point
   * Uses exact text-vide algorithm from https://github.com/Gumball12/text-vide
   *
   * UI fixationPoint: 1-5 (higher = more bold)
   * Formula: max(1, floor(wordLength * fixationPoint / 6))
   */
  function getBoldLength(wordLength, fixationPoint) {
    // Minimum 1 character for very short words
    if (wordLength <= 1) return 1;

    // text-vide formula: max(1, floor(length * fixationPoint / 6))
    const boldLen = Math.floor(wordLength * fixationPoint / 6);

    // Ensure at least 1 and at most word length
    return Math.max(1, Math.min(boldLen, wordLength));
  }

  /**
   * Apply bionic preview to a word
   */
  function processWord(word, fixationPoint) {
    if (!word || word.trim().length === 0) {
      return word;
    }

    // Skip if word is just punctuation
    if (/^[^\w]+$/.test(word)) {
      return escapeHtml(word);
    }

    const boldLength = getBoldLength(word.length, fixationPoint);

    const boldPart = word.substring(0, boldLength);
    const dimPart = word.substring(boldLength);

    if (dimPart.length === 0) {
      return `<b class="bionic-bold">${escapeHtml(boldPart)}</b>`;
    }

    return `<b class="bionic-bold">${escapeHtml(boldPart)}</b><span class="bionic-dim">${escapeHtml(dimPart)}</span>`;
  }

  /**
   * Apply bionic preview to text content
   */
  function processText(text, fixationPoint) {
    if (!text) return '';

    const parts = text.split(/(\s+)/);
    return parts.map(part => {
      if (/^\s+$/.test(part)) {
        return part;
      }
      return processWord(part, fixationPoint);
    }).join('');
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Process an element with bionic preview
   */
  function processBionicElement(element, fixationPoint, dimOpacity) {
    const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'SVG', 'MATH', 'KBD', 'SAMP'];

    if (skipTags.includes(element.tagName)) {
      return;
    }

    element.style.setProperty('--bionic-dim-opacity', dimOpacity);

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          if (skipTags.includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.classList.contains('bionic-bold') || parent.classList.contains('bionic-dim')) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.closest('.bionic-wrapper')) {
            return NodeFilter.FILTER_REJECT;
          }

          if (!node.textContent.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    textNodes.reverse().forEach(textNode => {
      const processedHtml = processText(textNode.textContent, fixationPoint);
      const wrapper = document.createElement('span');
      wrapper.className = 'bionic-wrapper';
      wrapper.innerHTML = processedHtml;
      textNode.parentNode.replaceChild(wrapper, textNode);
    });
  }

  /**
   * Remove bionic preview from an element
   */
  function removeBionicFromElement(element) {
    const wrappers = element.querySelectorAll('.bionic-wrapper');
    wrappers.forEach(wrapper => {
      const text = document.createTextNode(wrapper.textContent);
      wrapper.parentNode.replaceChild(text, wrapper);
    });

    element.style.removeProperty('--bionic-dim-opacity');
  }

  // Gradient themes
  const gradientThemes = {
    none: { name: 'None', colors: [] },
    ocean: {
      name: 'Ocean',
      colors: [[200, 70, 50], [180, 60, 45], [190, 65, 48], [210, 75, 52], [170, 55, 42]]
    },
    sunset: {
      name: 'Sunset',
      colors: [[0, 70, 55], [20, 80, 55], [35, 85, 50], [45, 90, 52], [55, 75, 48]]
    },
    forest: {
      name: 'Forest',
      colors: [[120, 45, 40], [90, 50, 42], [140, 40, 38], [100, 55, 44], [80, 35, 36]]
    },
    berry: {
      name: 'Berry',
      colors: [[330, 60, 50], [300, 50, 45], [280, 55, 48], [320, 65, 52], [340, 58, 47]]
    },
    lavender: {
      name: 'Lavender',
      colors: [[260, 50, 55], [270, 45, 52], [250, 55, 58], [280, 40, 50], [240, 48, 54]]
    },
    autumn: {
      name: 'Autumn',
      colors: [[25, 75, 45], [35, 80, 48], [15, 70, 42], [45, 65, 50], [5, 60, 40]]
    },
    mint: {
      name: 'Mint',
      colors: [[160, 50, 48], [150, 45, 45], [170, 55, 50], [140, 40, 42], [180, 48, 46]]
    },
    twilight: {
      name: 'Twilight',
      colors: [[250, 50, 45], [270, 45, 48], [290, 40, 42], [230, 55, 50], [310, 35, 46]]
    },
    coffee: {
      name: 'Coffee',
      colors: [[30, 40, 35], [25, 35, 38], [35, 45, 40], [20, 30, 32], [40, 50, 42]]
    },
    monochrome: {
      name: 'Monochrome',
      colors: [[0, 0, 30], [0, 0, 40], [0, 0, 50], [0, 0, 45], [0, 0, 35]]
    }
  };

  /**
   * Detect if dark mode is active
   */
  function isDarkMode() {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    if (!bodyBg || bodyBg === 'transparent') return false;

    const match = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return false;

    const [, r, g, b] = match.map(Number);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  /**
   * Adjust color for theme
   */
  function adjustForTheme(hsl, isDark) {
    const [h, s, l] = hsl;
    if (isDark) {
      return [h, Math.min(s + 10, 100), Math.min(l + 25, 75)];
    }
    return [h, s, Math.max(l - 10, 25)];
  }

  /**
   * Convert HSL to CSS string
   */
  function hslToString(hsl) {
    return `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;
  }

  /**
   * Apply gradient reading to an element
   */
  function applyGradient(element, themeName) {
    const theme = gradientThemes[themeName];
    if (!theme || theme.colors.length === 0) {
      removeGradient(element);
      return;
    }

    const isDark = isDarkMode();
    const colors = theme.colors.map(color => adjustForTheme(color, isDark));

    const selectors = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, dt, dd';
    const elements = element.querySelectorAll(selectors);

    let colorIndex = 0;
    elements.forEach(el => {
      if (!el.textContent.trim()) return;
      if (el.closest('pre, code')) return;

      const color = colors[colorIndex % colors.length];
      el.style.setProperty('--gradient-color', hslToString(color));
      el.classList.add('gradient-text');
      colorIndex++;
    });
  }

  /**
   * Remove gradient from element
   */
  function removeGradient(element) {
    const gradientElements = element.querySelectorAll('.gradient-text');
    gradientElements.forEach(el => {
      el.style.removeProperty('--gradient-color');
      el.classList.remove('gradient-text');
    });
  }

  /**
   * Parse markdown to HTML
   */
  function parseMarkdown(markdown) {
    if (!markdown) return '';

    let html = markdown;
    html = html.replace(/\r\n/g, '\n');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const escapedCode = escapeHtml(code.trim());
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${escapedCode}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      return `<code>${escapeHtml(code)}</code>`;
    });

    // Headers
    html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Lists
    html = processLists(html);

    // Paragraphs
    html = wrapParagraphs(html);

    return html;
  }

  /**
   * Process lists in markdown
   */
  function processLists(html) {
    const lines = html.split('\n');
    const result = [];
    let inUl = false;
    let inOl = false;

    for (const line of lines) {
      const ulMatch = line.match(/^[\*\-\+]\s+(.+)$/);
      const olMatch = line.match(/^\d+\.\s+(.+)$/);

      if (ulMatch) {
        if (inOl) { result.push('</ol>'); inOl = false; }
        if (!inUl) { result.push('<ul>'); inUl = true; }
        result.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (!inOl) { result.push('<ol>'); inOl = true; }
        result.push(`<li>${olMatch[1]}</li>`);
      } else {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        result.push(line);
      }
    }

    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('\n');
  }

  /**
   * Wrap text in paragraphs
   */
  function wrapParagraphs(html) {
    const blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'pre', 'code', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'];
    const blockPattern = new RegExp(`^<(${blockTags.join('|')})[\\s>]`, 'i');
    const closingPattern = new RegExp(`^</(${blockTags.join('|')})>`, 'i');

    const lines = html.split('\n');
    const result = [];
    let paragraphLines = [];

    const flushParagraph = () => {
      if (paragraphLines.length > 0) {
        const content = paragraphLines.join(' ').trim();
        if (content) {
          result.push(`<p>${content}</p>`);
        }
        paragraphLines = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        continue;
      }

      if (blockPattern.test(trimmed) || closingPattern.test(trimmed)) {
        flushParagraph();
        result.push(line);
      } else {
        paragraphLines.push(trimmed);
      }
    }

    flushParagraph();
    return result.join('\n');
  }

  /**
   * Save original content before transformation
   */
  function saveOriginalContent() {
    if (!originalContent) {
      originalContent = document.body.innerHTML;
    }
  }

  /**
   * Restore original content
   */
  function restoreOriginalContent() {
    if (originalContent) {
      document.body.innerHTML = originalContent;
      document.body.classList.remove('bionic-reading-enabled', 'bionic-markdown-preview');
    }
  }

  /**
   * Transform markdown file into rendered preview
   */
  function transformMarkdownFile() {
    // Get the raw text content
    const preElement = document.querySelector('pre');
    const rawText = preElement ? preElement.textContent : document.body.textContent;

    if (!rawText) return;

    // Parse markdown to HTML
    const htmlContent = parseMarkdown(rawText);

    // Create container
    const container = document.createElement('div');
    container.className = 'bionic-markdown-container';
    container.innerHTML = `
      <article class="bionic-markdown-content">
        ${htmlContent}
      </article>
    `;

    // Replace body content
    document.body.innerHTML = '';
    document.body.appendChild(container);
    document.body.classList.add('bionic-markdown-preview');
  }

  /**
   * Apply bionic preview to the page
   */
  function applyBionicReading() {
    saveOriginalContent();

    // Check if this is a markdown file
    if (isMarkdownFile && settings.autoMarkdown) {
      transformMarkdownFile();
    }

    // Get the main content area
    const contentArea = document.querySelector('.bionic-markdown-content') || document.body;

    // Apply bionic preview
    processBionicElement(contentArea, settings.fixationPoint, settings.dimOpacity);

    // Apply gradient if set
    if (settings.gradientTheme && settings.gradientTheme !== 'none') {
      applyGradient(contentArea, settings.gradientTheme);
    }

    document.body.classList.add('bionic-reading-enabled');
  }

  /**
   * Remove bionic preview from the page
   */
  function removeBionicReading() {
    const contentArea = document.querySelector('.bionic-markdown-content') || document.body;

    removeBionicFromElement(contentArea);
    removeGradient(contentArea);

    // If this was a markdown file, restore original
    if (isMarkdownFile) {
      restoreOriginalContent();
    }

    document.body.classList.remove('bionic-reading-enabled');
  }

  /**
   * Toggle bionic preview on/off
   */
  function toggle() {
    isEnabled = !isEnabled;

    if (isEnabled) {
      applyBionicReading();
    } else {
      removeBionicReading();
    }

    // Save state
    chrome.storage.local.set({ isEnabled });

    return isEnabled;
  }

  /**
   * Update settings and re-apply if enabled
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };

    // Save settings
    chrome.storage.local.set({ settings });

    // Re-apply if enabled
    if (isEnabled) {
      removeBionicReading();
      applyBionicReading();
    }
  }

  // Initialize
  function init() {
    isMarkdownFile = checkIfMarkdownFile();

    // Load saved state and settings
    chrome.storage.local.get(['isEnabled', 'settings'], (result) => {
      if (result.settings) {
        settings = { ...settings, ...result.settings };
      }

      // Auto-enable for markdown files if setting is on
      if (isMarkdownFile && settings.autoMarkdown) {
        isEnabled = true;
        applyBionicReading();
      } else if (result.isEnabled) {
        isEnabled = true;
        applyBionicReading();
      }
    });
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'toggle':
        const newState = toggle();
        sendResponse({ isEnabled: newState });
        break;

      case 'updateSettings':
        updateSettings(message.settings);
        sendResponse({ success: true });
        break;

      case 'getState':
        sendResponse({
          isEnabled,
          settings,
          isMarkdownFile
        });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }

    return true; // Keep channel open for async response
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
