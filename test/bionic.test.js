import { describe, it, expect } from 'vitest';
import BionicReader from '../lib/bionic.js';

describe('BionicReader.processWord', () => {
  it('bolds a leading portion and dims the remainder', () => {
    const out = BionicReader.processWord('reading', 3);
    expect(out).toMatch(/<b class="bionic-bold">/);
    expect(out).toContain('<span class="bionic-dim">');
  });

  it('bolds the whole of a single-character word', () => {
    const out = BionicReader.processWord('a', 3);
    expect(out).toBe('<b class="bionic-bold">a</b>');
  });

  it('bolds more characters at a higher fixation point', () => {
    const boldLen = (s) => (s.match(/<b class="bionic-bold">(.*?)<\/b>/)?.[1] ?? '').length;
    expect(boldLen(BionicReader.processWord('information', 5)))
      .toBeGreaterThanOrEqual(boldLen(BionicReader.processWord('information', 1)));
  });

  it('matches the production fixation formula at both slider extremes', () => {
    expect(BionicReader.getBoldLength(12, 1)).toBe(2);
    expect(BionicReader.getBoldLength(12, 5)).toBe(10);
  });

  it('does not wrap punctuation-only tokens as bionic text', () => {
    expect(BionicReader.processWord('...', 3)).toBe('...');
  });

  it('returns whitespace/empty input unchanged', () => {
    expect(BionicReader.processWord('   ', 3)).toBe('   ');
    expect(BionicReader.processWord('', 3)).toBe('');
  });

  it('escapes HTML in the word', () => {
    const out = BionicReader.processWord('<x>', 3);
    expect(out).toContain('&lt;');
    expect(out).not.toContain('<x>');
  });
});

describe('BionicReader.processText', () => {
  it('preserves the whitespace between words', () => {
    const out = BionicReader.processText('two words', 3);
    expect((out.match(/bionic-bold/g) || []).length).toBe(2);
    expect(out).toContain(' ');
  });

  it('returns empty string for empty input', () => {
    expect(BionicReader.processText('', 3)).toBe('');
  });
});

describe('BionicReader.processElement / removeFromElement', () => {
  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d;
  }

  it('wraps text nodes and sets the dim-opacity CSS variable', () => {
    const node = el('<p>hello world</p>');
    BionicReader.processElement(node, 3, 0.4);
    expect(node.querySelectorAll('.bionic-wrapper').length).toBeGreaterThan(0);
    expect(node.querySelectorAll('.bionic-bold').length).toBe(2);
    expect(node.style.getPropertyValue('--bionic-dim-opacity')).toBe('0.4');
  });

  it('does not process text inside code or pre', () => {
    const node = el('<pre><code>const x = 1;</code></pre>');
    BionicReader.processElement(node, 3, 0.5);
    expect(node.querySelectorAll('.bionic-bold').length).toBe(0);
    expect(node.querySelector('code').textContent).toBe('const x = 1;');
  });

  it('does not process keyboard, sample-output, or rendered-math content', () => {
    const node = el(`
      <kbd>Command K</kbd>
      <samp>done</samp>
      <span class="math-inline">x + y</span>
      <div class="math-display">z = 3</div>
    `);
    BionicReader.processElement(node, 3, 0.5);

    expect(node.querySelectorAll('.bionic-bold')).toHaveLength(0);
    expect(node.textContent).toContain('Command K');
    expect(node.textContent).toContain('x + y');
  });

  it('does not wrap already processed text a second time', () => {
    const node = el('<p>hello world</p>');
    BionicReader.processElement(node, 3, 0.5);
    BionicReader.processElement(node, 3, 0.5);

    expect(node.querySelectorAll('.bionic-wrapper')).toHaveLength(1);
    expect(node.querySelectorAll('.bionic-wrapper .bionic-wrapper')).toHaveLength(0);
  });

  it('round-trips: removeFromElement restores the original text', () => {
    const node = el('<p>quick brown fox</p>');
    const original = node.textContent;
    BionicReader.processElement(node, 3, 0.5);
    BionicReader.removeFromElement(node);
    expect(node.querySelectorAll('.bionic-wrapper').length).toBe(0);
    expect(node.textContent).toBe(original);
    expect(node.style.getPropertyValue('--bionic-dim-opacity')).toBe('');
  });

  it('returns early without wrapping when the root itself is a skip tag', () => {
    const pre = document.createElement('pre');
    pre.textContent = 'code here';
    BionicReader.processElement(pre, 3, 0.5);
    expect(pre.querySelectorAll('.bionic-bold').length).toBe(0);
  });
});


describe('BionicReader protected DOM ancestors', () => {
  it('leaves nested editable text, code children, SVG and MathML untouched', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div contenteditable="true"><p><span>draft text</span></p></div><pre><code><span>literal code</span></code></pre><svg><text>diagram text</text></svg><math><mtext>math label</mtext></math><p>reading text</p>';
    BionicReader.processElement(root);
    expect(root.querySelectorAll('[contenteditable] .bionic-wrapper, pre .bionic-wrapper, svg .bionic-wrapper, math .bionic-wrapper')).toHaveLength(0);
    expect(root.querySelectorAll('p:last-child .bionic-wrapper')).toHaveLength(1);
  });
});
