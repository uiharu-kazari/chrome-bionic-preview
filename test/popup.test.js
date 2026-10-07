import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const popupScript = readFileSync(resolve(process.cwd(), 'popup/popup.js'), 'utf8');

describe('popup content-script handshake', () => {
  it('injects the page renderer before sending a control update', async () => {
    document.body.innerHTML = `
      <p class="footer-text"></p>
      <input id="enableToggle" type="checkbox">
      <input id="fixationPoint" type="range">
      <span id="fixationValue"></span>
      <input id="dimOpacity" type="range">
      <span id="opacityValue"></span>
      <select id="gradientTheme"><option value="none">None</option></select>
      <div id="gradientPreview"></div>
      <input id="autoMarkdown" type="checkbox">
      <p id="markdownIndicator"></p>
    `;

    let contentScriptLoaded = false;
    const messages = [];
    const deliveredMessages = [];
    const injections = [];
    const cssInjections = [];
    const events = [];
    const runtime = { lastError: null };
    const settings = {
      fixationPoint: 3,
      dimOpacity: 0.5,
      gradientTheme: 'none',
      autoMarkdown: true
    };

    window.chrome = {
      runtime,
      tabs: {
        query(queryInfo, callback) {
          callback([{ id: 99, url: 'https://example.com/article' }]);
        },
        sendMessage(tabId, message, callback) {
          messages.push(message);
          events.push(`message:${message.type}`);
          if (!contentScriptLoaded) {
            runtime.lastError = { message: 'Could not establish connection.' };
            callback();
            runtime.lastError = null;
            return;
          }

          deliveredMessages.push(message);
          callback({
            isEnabled: false,
            isMarkdownFile: false,
            settings
          });
        }
      },
      scripting: {
        executeScript(details) {
          injections.push(details);
          contentScriptLoaded = true;
          return Promise.resolve();
        },
        insertCSS(details) {
          cssInjections.push(details);
          return Promise.resolve();
        }
      },
      storage: {
        local: {
          get(keys, callback) {
            callback({ settings, isEnabled: false });
          },
          set() {}
        }
      }
    };
    globalThis.chrome = window.chrome;

    window.eval(popupScript);
    window.chrome.storage.local.set = () => events.push('storage:set');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Change a setting while the popup's initial injection is still pending.
    // Both callers must share the same injection and the setting must still win.
    const fixationPoint = document.getElementById('fixationPoint');
    fixationPoint.value = '5';
    fixationPoint.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      expect(deliveredMessages.some(message => message.type === 'updateSettings')).toBe(true);
    });

    expect(injections).toEqual([{
      target: { tabId: 99 },
      files: ['lib/katex.min.js', 'lib/marked.umd.js', 'lib/purify.min.js', 'lib/markdown.js', 'lib/bionic.js', 'lib/gradient.js', 'content/content.js']
    }]);
    expect(cssInjections).toEqual([{
      target: { tabId: 99 },
      files: ['content/content.css']
    }]);

    const updateMessage = deliveredMessages.find(message => message.type === 'updateSettings');
    expect(updateMessage).toEqual({
      type: 'updateSettings',
      settings: { ...settings, fixationPoint: 5 }
    });
    expect(events.indexOf('storage:set')).toBeLessThan(events.lastIndexOf('message:updateSettings'));

    delete window.chrome;
    delete globalThis.chrome;
  });
});


describe('popup unavailable-page state', () => {
  it('keeps the toggle off on a restricted page even with a legacy enabled preference', () => {
    const html = readFileSync(resolve(process.cwd(), 'popup/popup.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.com' });
    dom.window.chrome = {
      tabs: { query: (query, callback) => callback([{ id: 1, url: 'chrome://extensions/' }]) },
      storage: { local: { get: (keys, callback) => callback({ isEnabled: true, settings: { fixationPoint: 4 } }) } }
    };
    dom.window.eval(popupScript);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const toggle = dom.window.document.getElementById('enableToggle');
    expect(toggle.disabled).toBe(true);
    expect(toggle.checked).toBe(false);
    expect(dom.window.document.querySelector('.footer-text').textContent).toBe('Not available on this page');
    expect(dom.window.isRestrictedUrl('https://chromewebstore.google.com/detail/example')).toBe(true);
    expect(dom.window.isRestrictedUrl('https://example.com/article')).toBe(false);
    expect(dom.window.isRestrictedUrl('data:text/html,example')).toBe(true);
    dom.window.close();
  });
  it('shows a recovery message when file access is not granted', async () => {
    const html = readFileSync(resolve(process.cwd(), 'popup/popup.html'), 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.com' });
    dom.window.chrome = {
      runtime: { lastError: { message: 'No listener' } },
      tabs: {
        query: (query, callback) => callback([{ id: 1, url: 'file:///example.md' }]),
        sendMessage: (tab, message, callback) => callback()
      },
      scripting: { executeScript: () => Promise.reject(new Error('File access denied')) },
      storage: { local: { get: (keys, callback) => callback({ settings: { fixationPoint: 4 } }) } }
    };
    dom.window.eval(popupScript);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    await vi.waitFor(() => {
      expect(dom.window.document.querySelector('.footer-text').textContent).toContain('allow file access');
    });
    expect(dom.window.document.getElementById('enableToggle').disabled).toBe(true);
    dom.window.close();
  });
});
