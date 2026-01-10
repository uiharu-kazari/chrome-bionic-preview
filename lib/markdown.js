/**
 * Markdown Parser Implementation
 * Converts markdown text to HTML
 */

const MarkdownParser = {
  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  },

  /**
   * Parse markdown text to HTML
   * @param {string} markdown - Markdown text
   * @returns {string} HTML string
   */
  parse(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Normalize line endings
    html = html.replace(/\r\n/g, '\n');

    // Code blocks (must be processed first to avoid other transformations)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const escapedCode = this.escapeHtml(code.trim());
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${escapedCode}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      return `<code>${this.escapeHtml(code)}</code>`;
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

    // Images (before links)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Unordered lists
    html = this.processLists(html, /^[\*\-\+]\s+(.+)$/gm, 'ul');

    // Ordered lists
    html = this.processLists(html, /^\d+\.\s+(.+)$/gm, 'ol');

    // Tables
    html = this.processTables(html);

    // Paragraphs - wrap remaining text blocks
    html = this.wrapParagraphs(html);

    return html;
  },

  /**
   * Process lists in markdown
   * @param {string} html - HTML string
   * @param {RegExp} pattern - List item pattern
   * @param {string} listTag - List tag (ul or ol)
   * @returns {string} Processed HTML
   */
  processLists(html, pattern, listTag) {
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    const listPattern = listTag === 'ul' ? /^[\*\-\+]\s+(.+)$/ : /^\d+\.\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(listPattern);

      if (match) {
        if (!inList) {
          result.push(`<${listTag}>`);
          inList = true;
        }
        result.push(`<li>${match[1]}</li>`);
      } else {
        if (inList) {
          result.push(`</${listTag}>`);
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push(`</${listTag}>`);
    }

    return result.join('\n');
  },

  /**
   * Process tables in markdown
   * @param {string} html - HTML string
   * @returns {string} Processed HTML
   */
  processTables(html) {
    const lines = html.split('\n');
    const result = [];
    let inTable = false;
    let headerProcessed = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this is a table row (contains pipes)
      if (line.startsWith('|') && line.endsWith('|')) {
        // Check if it's a separator row (|---|---|)
        if (/^\|[\s\-:|]+\|$/.test(line)) {
          continue; // Skip separator rows
        }

        if (!inTable) {
          result.push('<table>');
          inTable = true;
          headerProcessed = false;
        }

        const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
        const tag = !headerProcessed ? 'th' : 'td';
        const rowTag = !headerProcessed ? 'thead' : 'tbody';

        if (!headerProcessed) {
          result.push('<thead>');
        } else if (headerProcessed && result[result.length - 1] === '</thead>') {
          result.push('<tbody>');
        }

        result.push('<tr>');
        cells.forEach(cell => {
          result.push(`<${tag}>${cell}</${tag}>`);
        });
        result.push('</tr>');

        if (!headerProcessed) {
          result.push('</thead>');
          headerProcessed = true;
        }
      } else {
        if (inTable) {
          if (headerProcessed) {
            result.push('</tbody>');
          }
          result.push('</table>');
          inTable = false;
        }
        result.push(lines[i]);
      }
    }

    if (inTable) {
      if (headerProcessed) {
        result.push('</tbody>');
      }
      result.push('</table>');
    }

    return result.join('\n');
  },

  /**
   * Wrap text blocks in paragraphs
   * @param {string} html - HTML string
   * @returns {string} Processed HTML
   */
  wrapParagraphs(html) {
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
  },

  /**
   * Check if text is markdown
   * @param {string} text - Text to check
   * @returns {boolean} True if text appears to be markdown
   */
  isMarkdown(text) {
    if (!text) return false;

    const markdownPatterns = [
      /^#{1,6}\s+/m,           // Headers
      /\*\*[^*]+\*\*/,         // Bold
      /\*[^*]+\*/,             // Italic
      /\[.+\]\(.+\)/,          // Links
      /!\[.*\]\(.+\)/,         // Images
      /^[\*\-\+]\s+/m,         // Unordered lists
      /^\d+\.\s+/m,            // Ordered lists
      /^>\s+/m,                // Blockquotes
      /```[\s\S]*```/,         // Code blocks
      /`[^`]+`/,               // Inline code
      /^\|.+\|$/m              // Tables
    ];

    return markdownPatterns.some(pattern => pattern.test(text));
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownParser;
}
