import { describe, it, expect, afterEach } from 'vitest';
import GradientReader from '../lib/gradient.js';

describe('GradientReader pure helpers', () => {
  it('hslToString formats an HSL triple', () => {
    expect(GradientReader.hslToString([200, 70, 50])).toBe('hsl(200, 70%, 50%)');
  });

  it('adjustForTheme lightens for dark mode and darkens for light mode', () => {
    const [, , lDark] = GradientReader.adjustForTheme([200, 60, 40], true);
    const [, , lLight] = GradientReader.adjustForTheme([200, 60, 40], false);
    expect(lDark).toBeGreaterThan(40); // +25, capped at 75
    expect(lLight).toBeLessThanOrEqual(40); // -10, floored at 25
  });

  it('getThemeNames includes none plus the colour themes', () => {
    const names = GradientReader.getThemeNames();
    expect(names).toContain('none');
    expect(names).toContain('ocean');
    expect(names.length).toBeGreaterThan(5);
  });

  it('getThemeDisplayName resolves known and falls back for unknown', () => {
    expect(GradientReader.getThemeDisplayName('ocean')).toBe('Ocean');
    expect(GradientReader.getThemeDisplayName('mystery')).toBe('mystery');
  });

  it('getPreviewColors returns hsl strings for a theme, empty for none', () => {
    const colors = GradientReader.getPreviewColors('ocean');
    expect(colors.length).toBeGreaterThan(0);
    expect(colors[0]).toMatch(/^hsl\(/);
    expect(GradientReader.getPreviewColors('none')).toEqual([]);
  });
});

describe('GradientReader.isDarkMode', () => {
  afterEach(() => {
    document.body.style.backgroundColor = '';
  });

  it('reports dark for a dark body background', () => {
    document.body.style.backgroundColor = 'rgb(20, 20, 20)';
    expect(GradientReader.isDarkMode()).toBe(true);
  });

  it('reports light for a light body background', () => {
    document.body.style.backgroundColor = 'rgb(250, 250, 250)';
    expect(GradientReader.isDarkMode()).toBe(false);
  });
});

describe('GradientReader.applyGradient / removeGradient', () => {
  function root(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    document.body.appendChild(d);
    return d;
  }
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.style.backgroundColor = '';
  });

  it('adds the gradient-text class and a colour variable to block elements', () => {
    const el = root('<p>one</p><p>two</p><h2>three</h2>');
    GradientReader.applyGradient(el, 'ocean');
    const colored = el.querySelectorAll('.gradient-text');
    expect(colored.length).toBe(3);
    colored.forEach((c) => {
      expect(c.style.getPropertyValue('--gradient-color')).toMatch(/^hsl\(/);
    });
  });

  it('skips empty elements and elements inside code blocks', () => {
    const el = root('<p>text</p><p></p><pre><code>code</code></pre>');
    GradientReader.applyGradient(el, 'ocean');
    // only the non-empty, non-code paragraph is coloured
    expect(el.querySelectorAll('.gradient-text').length).toBe(1);
    expect(el.querySelector('pre').classList.contains('gradient-text')).toBe(false);
  });

  it('theme "none" removes any gradient instead of applying one', () => {
    const el = root('<p>one</p>');
    GradientReader.applyGradient(el, 'ocean');
    expect(el.querySelectorAll('.gradient-text').length).toBe(1);
    GradientReader.applyGradient(el, 'none');
    expect(el.querySelectorAll('.gradient-text').length).toBe(0);
  });

  it('removeGradient clears the class and the colour variable', () => {
    const el = root('<p>one</p><p>two</p>');
    GradientReader.applyGradient(el, 'sunset');
    GradientReader.removeGradient(el);
    expect(el.querySelectorAll('.gradient-text').length).toBe(0);
    el.querySelectorAll('p').forEach((p) => {
      expect(p.style.getPropertyValue('--gradient-color')).toBe('');
    });
  });

  it('applies and removes a fallback colour on text-only layouts', () => {
    const el = root('<div>plain text</div>');
    GradientReader.applyGradient(el, 'ocean');
    expect(el.classList.contains('gradient-text')).toBe(true);
    expect(el.style.getPropertyValue('--gradient-color')).toMatch(/^hsl\(/);

    GradientReader.removeGradient(el);
    expect(el.classList.contains('gradient-text')).toBe(false);
    expect(el.style.getPropertyValue('--gradient-color')).toBe('');
  });
});
