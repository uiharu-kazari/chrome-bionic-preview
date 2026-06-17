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
    expect(MarkdownParser.parse('> quote')).toContain('<blockquote>quote</blockquote>');
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
