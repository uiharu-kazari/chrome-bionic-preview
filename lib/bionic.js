/**
 * Bionic Text Implementation
 * Applies bionic text effect to text content
 */

const BionicReader = {
  /**
   * Apply bionic text to a word
   * @param {string} word - The word to process
   * @param {number} fixationPoint - Fixation point (1-5)
   * @returns {string} HTML string with bionic formatting
   */
  processWord(word, fixationPoint = 3) {
    if (!word || word.trim().length === 0) {
      return word;
    }

    // Calculate how many characters to bold
    const boldLength = Math.max(1, Math.min(
      word.length,
      Math.ceil(word.length * (fixationPoint / 5))
    ));

    const boldPart = word.substring(0, boldLength);
    const dimPart = word.substring(boldLength);

    if (dimPart.length === 0) {
      return `<b class="bionic-bold">${this.escapeHtml(boldPart)}</b>`;
    }

    return `<b class="bionic-bold">${this.escapeHtml(boldPart)}</b><span class="bionic-dim">${this.escapeHtml(dimPart)}</span>`;
  },

  /**
   * Apply bionic text to text content
   * @param {string} text - Plain text to process
   * @param {number} fixationPoint - Fixation point (1-5)
   * @returns {string} HTML string with bionic formatting
   */
  processText(text, fixationPoint = 3) {
    if (!text) return '';

    // Split by whitespace while preserving the whitespace
    const parts = text.split(/(\s+)/);

    return parts.map(part => {
      // If it's whitespace, return as-is
      if (/^\s+$/.test(part)) {
        return part;
      }
      return this.processWord(part, fixationPoint);
    }).join('');
  },

  /**
   * Process an HTML element and apply bionic text to text nodes
   * @param {Element} element - DOM element to process
   * @param {number} fixationPoint - Fixation point (1-5)
   * @param {number} dimOpacity - Opacity for dimmed text (0-1)
   */
  processElement(element, fixationPoint = 3, dimOpacity = 0.5) {
    // Skip elements that shouldn't be processed
    const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'NOSCRIPT', 'SVG', 'MATH'];
    if (skipTags.includes(element.tagName)) {
      return;
    }

    // Set CSS variable for dim opacity
    element.style.setProperty('--bionic-dim-opacity', dimOpacity);

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Skip if parent is a skip tag
          if (skipTags.includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip if already processed
          if (parent.classList.contains('bionic-bold') || parent.classList.contains('bionic-dim')) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip if text is only whitespace
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

    // Process text nodes in reverse to avoid index issues
    textNodes.reverse().forEach(textNode => {
      const processedHtml = this.processText(textNode.textContent, fixationPoint);
      const wrapper = document.createElement('span');
      wrapper.className = 'bionic-wrapper';
      wrapper.innerHTML = processedHtml;
      textNode.parentNode.replaceChild(wrapper, textNode);
    });
  },

  /**
   * Remove bionic text from an element
   * @param {Element} element - DOM element to clean
   */
  removeFromElement(element) {
    // Remove all bionic wrappers
    const wrappers = element.querySelectorAll('.bionic-wrapper');
    wrappers.forEach(wrapper => {
      const text = document.createTextNode(wrapper.textContent);
      wrapper.parentNode.replaceChild(text, wrapper);
    });

    // Remove CSS variable
    element.style.removeProperty('--bionic-dim-opacity');
  },

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BionicReader;
}
