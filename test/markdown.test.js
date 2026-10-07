import { describe, it, expect } from 'vitest';
import MarkdownParser from '../lib/markdown.js';

describe('MarkdownParser.parse — tables', () => {
  const TABLE = [
    '| Name | Age |',
    '| --- | --- |',
    '| Alice | 30 |',
    '| Bob | 25 |',
  ].join('\n');

  it('renders a pipe table with thead/tbody and th/td cells', () => {
    const html = MarkdownParser.parse(TABLE);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<th>Age</th>');
    expect(html).toContain('<td>Alice</td>');
    expect(html).toContain('<td>25</td>');
  });

  it('skips the alignment separator row', () => {
    const html = MarkdownParser.parse(TABLE);
    expect(html).not.toContain('<td>---</td>');
  });

  it('closes the table and resumes normal content afterwards', () => {
    const html = MarkdownParser.parse(TABLE + '\n\nAfter.');
    expect(html).toContain('</table>');
    expect(html).toContain('After.');
  });
});

describe('MarkdownParser.parse — core syntax', () => {
  it('renders headings', () => {
    expect(MarkdownParser.parse('# Title')).toContain('<h1>Title</h1>');
    expect(MarkdownParser.parse('### Sub')).toContain('<h3>Sub</h3>');
  });

  it('renders bold, italic, strikethrough', () => {
    expect(MarkdownParser.parse('**b**')).toContain('<strong>b</strong>');
    expect(MarkdownParser.parse('*i*')).toContain('<em>i</em>');
    expect(MarkdownParser.parse('~~s~~')).toContain('<del>s</del>');
  });

  it('renders fenced code blocks with escaped content', () => {
    const html = MarkdownParser.parse('```js\nconst x = 1 < 2;\n```');
    expect(html).toContain('<pre><code');
    expect(html).toContain('language-js');
    expect(html).toContain('1 &lt; 2');
  });

  it('renders inline code', () => {
    expect(MarkdownParser.parse('use `code`')).toContain('<code>code</code>');
  });

  it('renders unordered and ordered lists', () => {
    expect(MarkdownParser.parse('- a\n- b')).toContain('<ul>');
    expect(MarkdownParser.parse('1. a\n2. b')).toContain('<ol>');
  });

  it('renders links (with safe rel) and images', () => {
    const link = MarkdownParser.parse('[t](http://x)');
    expect(link).toContain('<a href="http://x"');
    expect(link).toContain('rel="noopener noreferrer"');
    expect(MarkdownParser.parse('![alt](http://i)')).toContain('<img src="http://i" alt="alt">');
  });

  it('renders blockquotes', () => {
    const root = document.createElement('div');
    root.innerHTML = MarkdownParser.parse('> quote');
    expect(root.querySelector('blockquote').textContent.trim()).toBe('quote');
  });

  it('returns empty string for empty input', () => {
    expect(MarkdownParser.parse('')).toBe('');
  });
});

describe('MarkdownParser.escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(MarkdownParser.escapeHtml('<a> & "b" \'c\'')).toBe(
      '&lt;a&gt; &amp; &quot;b&quot; &#39;c&#39;'
    );
  });
});

describe('MarkdownParser.isMarkdown', () => {
  it('detects common markdown constructs', () => {
    expect(MarkdownParser.isMarkdown('# heading')).toBe(true);
    expect(MarkdownParser.isMarkdown('**bold**')).toBe(true);
    expect(MarkdownParser.isMarkdown('| a | b |')).toBe(true);
    expect(MarkdownParser.isMarkdown('- item')).toBe(true);
  });

  it('returns false for plain prose and empty input', () => {
    expect(MarkdownParser.isMarkdown('just a normal sentence')).toBe(false);
    expect(MarkdownParser.isMarkdown('')).toBe(false);
  });
});


describe('Markdown correctness and security regression corpus', () => {
  it('keeps Markdown symbols, newlines, indentation and math literal inside fenced code', () => {
    const code = '  **literal**\n# not a heading\n- not a list\n$x$\n';
    const root = document.createElement('div');
    root.innerHTML = MarkdownParser.parse('~~~text\n' + code + '~~~');
    expect(root.querySelector('pre code').textContent).toBe(code);
    expect(root.querySelector('pre strong, pre h1, pre li, pre math')).toBeNull();
  });
  it('renders nested lists, reference links and aligned tables', () => {
    const root = document.createElement('div');
    root.innerHTML = MarkdownParser.parse('- parent\n  - child\n\n[reference][docs]\n\n[docs]: https://example.com/docs\n\n|left|right|\n|:---|---:|\n|a|b|');
    expect(root.querySelector('li ul li').textContent).toBe('child');
    expect(root.querySelector('a').getAttribute('href')).toBe('https://example.com/docs');
    expect(root.querySelectorAll('td')).toHaveLength(2);
  });
  it('preserves inline/display math and keeps inline code literal', () => {
    const root = document.createElement('div');
    root.innerHTML = MarkdownParser.parse('Inline $x^2$ and `$x$`.\n\n$$\nx+y\n$$');
    expect(root.querySelectorAll('math')).toHaveLength(2);
    expect(root.querySelector('code').textContent).toBe('$x$');
  });
  it('removes SVG mutation, executable HTML, event handlers, dangerous URLs and CSS', () => {
    const root = document.createElement('div');
    root.innerHTML = MarkdownParser.parse('<svg><a href="https://safe.test"><animate attributeName="href" values="javascript:alert(1)"/></a></svg>\n\n<script>alert(1)</script>\n\n<a href="javascript:alert(1)" onclick="alert(1)" style="background:url(https://tracking.test)">unsafe</a>\n\n<img src="data:image/svg+xml,bad" onerror="alert(1)">');
    expect(root.querySelector('svg, script, [onclick], [onerror], [style], [src]')).toBeNull();
    expect(root.querySelector('a').hasAttribute('href')).toBe(false);
  });
  it('does not trust HTML-producing math commands', () => {
    const root = document.createElement('div');
    root.innerHTML = MarkdownParser.parse('$\\href{javascript:alert(1)}{unsafe}$');
    expect(root.querySelector('a[href]')).toBeNull();
  });
});
