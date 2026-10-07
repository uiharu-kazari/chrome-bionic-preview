/** Shared, locally bundled Markdown parser. No remote scripts or evaluation. */
(function (root) {
  const commonJS = typeof module !== 'undefined' && module.exports;
  const markedLibrary = commonJS ? require('./marked.umd.js') : root.marked;
  const purifier = commonJS ? require('./purify.min.js') : root.DOMPurify;
  const mathRenderer = commonJS ? require('./katex.min.js') : root.katex;
  const parser = new markedLibrary.Marked({ gfm: true });

  function escapeHtml(text) {
    const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return text.replace(/[&<>"']/g, character => escapes[character]);
  }

  function renderMath(math, display) {
    const tag = display ? 'div' : 'span';
    try {
      return `<${tag} class="math-${display ? 'display' : 'inline'}">${mathRenderer.renderToString(math, {
        displayMode: display, throwOnError: false, output: 'mathml', trust: false,
        maxExpand: 1000, maxSize: 20,
        macros: { '\\R': '\\mathbb{R}', '\\N': '\\mathbb{N}', '\\Z': '\\mathbb{Z}', '\\Q': '\\mathbb{Q}', '\\C': '\\mathbb{C}' }
      })}</${tag}>`;
    } catch {
      return `<code>${escapeHtml(math)}</code>`;
    }
  }

  parser.use({ extensions: [
    {
      name: 'displayMath', level: 'block',
      start(source) { return source.search(/\$\$|\\\[|\\begin\{/); },
      tokenizer(source) {
        const match = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|(\\begin\{([^}]+)\}[\s\S]*?\\end\{\4\}))(?:[ \t]*(?:\n|$))/.exec(source);
        if (match) return { type: 'displayMath', raw: match[0], math: match[1] || match[2] || match[3] };
      },
      renderer(token) { return renderMath(token.math.trim(), true); }
    },
    {
      name: 'inlineMath', level: 'inline',
      start(source) { return source.search(/\$|\\\(/); },
      tokenizer(source) {
        const match = /^(?:\\\(([^\n]+?)\\\)|\$(?![\s$])([^$\n]*[a-zA-Z\\][^$\n]*?)(?<!\s)\$(?!\$))/.exec(source);
        if (match) return { type: 'inlineMath', raw: match[0], math: match[1] || match[2] };
      },
      renderer(token) { return renderMath(token.math.trim(), false); }
    }
  ] });

  const MarkdownParser = {
    escapeHtml,
    parse(markdown) {
      if (!markdown) return '';
      const html = parser.parse(markdown);
      const clean = purifier.sanitize(html, {
        USE_PROFILES: { html: true, mathMl: true },
        FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'style'],
        FORBID_ATTR: ['style', 'srcset', 'id', 'name'],
        ALLOW_DATA_ATTR: false
      });
      const template = document.createElement('template');
      template.innerHTML = clean;
      template.content.querySelectorAll('[href], [src]').forEach(element => {
        for (const attribute of ['href', 'src']) {
          if (!element.hasAttribute(attribute)) continue;
          try {
            const url = new URL(element.getAttribute(attribute), document.baseURI);
            const allowed = attribute === 'href' ? ['https:', 'http:', 'mailto:', 'tel:'] : ['https:', 'http:'];
            if (!allowed.includes(url.protocol)) element.removeAttribute(attribute);
          } catch { element.removeAttribute(attribute); }
        }
        if (element.tagName === 'A') {
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        }
      });
      return template.innerHTML;
    },
    isMarkdown(text) {
      return Boolean(text && /(^#{1,6}\s|\*[^*]+\*|\[.*\]\(.+\)|^[*+\-]\s|^\d+\.\s|^>\s|`|^\|.+\|$)/m.test(text));
    }
  };
  if (commonJS) module.exports = MarkdownParser;
  else root.MarkdownParser = MarkdownParser;
})(globalThis);
