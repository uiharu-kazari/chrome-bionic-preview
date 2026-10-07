import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import BionicReader from '../lib/bionic.js';
import GradientReader from '../lib/gradient.js';
import MarkdownParser from '../lib/markdown.js';

const contentScript = readFileSync(resolve(process.cwd(), 'content/content.js'), 'utf8');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadContentScript({
  storage,
  storageDelay = 0,
  html = '<div>reading</div>',
  path = '/',
  enableFixture = Boolean(storage.isEnabled)
}) {
  window.history.replaceState({}, '', path);
  document.body.innerHTML = html;
  const messageListeners = [];

  window.chrome = {
    storage: {
      local: {
        get(keys, callback) {
          const result = Object.fromEntries(
            keys.filter((key) => key in storage).map((key) => [key, clone(storage[key])])
          );
          setTimeout(() => callback(result), storageDelay);
        },
        set(values, callback) {
          Object.assign(storage, clone(values));
          callback?.();
        }
      }
    },
    runtime: {
      onMessage: {
        addListener(listener) {
          messageListeners.push(listener);
        }
      }
    }
  };
  globalThis.chrome = window.chrome;
  window.BionicReader = BionicReader;
  window.GradientReader = GradientReader;
  window.MarkdownParser = MarkdownParser;
  window.eval(contentScript);
  let fixtureInitialized = false;

  return {
    async send(message) {
      const deliver = message => new Promise(resolveResponse => {
        const handledAsync = messageListeners[0](message, {}, resolveResponse);
        expect(handledAsync).toBe(true);
      });
      if (!fixtureInitialized) {
        fixtureInitialized = true;
        const initialState = await deliver({ type: 'getState' });
        if (enableFixture && !initialState.isEnabled) await deliver({ type: 'toggle' });
      }
      return deliver(message);
    }
  };
}

function boldLength() {
  return document.querySelector('.bionic-bold')?.textContent.length;
}

afterEach(() => {
  window.history.replaceState({}, '', '/');
  document.body.innerHTML = '';
  delete window.__bionicPreviewInstalled;
  delete window.chrome;
  delete globalThis.chrome;
});

describe('content-script settings updates', () => {
  it('waits for stored settings before applying an immediate control update', async () => {
    const page = loadContentScript({
      storage: {
        isEnabled: true,
        settings: { fixationPoint: 1, dimOpacity: 0.5, gradientTheme: 'none', autoMarkdown: true }
      },
      storageDelay: 25
    });

    await page.send({
      type: 'updateSettings',
      settings: { fixationPoint: 5, dimOpacity: 0.5, gradientTheme: 'none', autoMarkdown: true }
    });

    expect(boldLength()).toBe(5);
  });

  it('shows a selected theme on text-only page layouts', async () => {
    const page = loadContentScript({
      storage: {
        isEnabled: true,
        settings: { fixationPoint: 3, dimOpacity: 0.5, gradientTheme: 'none', autoMarkdown: true }
      }
    });

    await page.send({
      type: 'updateSettings',
      settings: { fixationPoint: 3, dimOpacity: 0.5, gradientTheme: 'ocean', autoMarkdown: true }
    });

    expect(document.body.classList.contains('gradient-text')).toBe(true);
    expect(document.body.style.getPropertyValue('--gradient-color')).toMatch(/^hsl\(/);
  });

  it('removes a fallback theme when the selection returns to none', async () => {
    const page = loadContentScript({
      storage: {
        isEnabled: true,
        settings: { fixationPoint: 3, dimOpacity: 0.5, gradientTheme: 'none', autoMarkdown: true }
      }
    });

    await page.send({
      type: 'updateSettings',
      settings: { fixationPoint: 3, dimOpacity: 0.5, gradientTheme: 'ocean', autoMarkdown: true }
    });
    await page.send({
      type: 'updateSettings',
      settings: { fixationPoint: 3, dimOpacity: 0.5, gradientTheme: 'none', autoMarkdown: true }
    });

    expect(document.body.classList.contains('gradient-text')).toBe(false);
    expect(document.body.style.getPropertyValue('--gradient-color')).toBe('');
  });

  it('sanitizes executable markup and unsafe URLs in rendered Markdown', async () => {
    const page = loadContentScript({
      path: '/unsafe.md',
      html: `<pre># Safe title
&lt;img src="https://example.com/image.png" onerror="window.pwned = true"&gt;
&lt;script&gt;window.pwned = true&lt;/script&gt;
&lt;a href="https://example.com/raw" target="_blank"&gt;raw link&lt;/a&gt;

[unsafe](javascript:window.pwned=true)
[safe](https://example.com/docs)</pre>`,
      storage: {
        isEnabled: false,
        settings: { fixationPoint: 3, dimOpacity: 0.5, gradientTheme: 'none', autoMarkdown: true }
      }
    });

    await page.send({ type: 'getState' });

    expect(document.querySelector('.bionic-markdown-content')).not.toBeNull();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')?.hasAttribute('onerror')).toBe(false);
    expect(document.querySelector('a:not([href])')?.textContent).toContain('unsafe');
    expect(document.querySelector('a[href="https://example.com/docs"]')).not.toBeNull();
    expect(document.querySelector('a[href="https://example.com/raw"]')?.getAttribute('rel'))
      .toBe('noopener noreferrer');
    expect(window.pwned).toBeUndefined();
  });
});


describe('document state and settings bounds', () => {
  it('ignores a legacy persisted enable state on a different ordinary page', async () => {
    const page = loadContentScript({ storage: { isEnabled: true }, enableFixture: false });
    const state = await page.send({ type: 'getState' });
    expect(state.isEnabled).toBe(false);
    expect(document.querySelector('.bionic-wrapper')).toBeNull();
  });
  it('clamps corrupt stored settings before applying them', async () => {
    const page = loadContentScript({ storage: { settings: { fixationPoint: 99, dimOpacity: -10, gradientTheme: 'missing', autoMarkdown: 'yes' } } });
    const state = await page.send({ type: 'getState' });
    expect(state.settings).toEqual({ fixationPoint: 5, dimOpacity: 0.1, gradientTheme: 'none', autoMarkdown: true });
  });
});
