const { test, expect, chromium } = require('@playwright/test');
const { createServer } = require('node:http');
const {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, join, relative, resolve, sep } = require('node:path');

const sourceExtension = resolve(__dirname, '..');
const excludedTopLevel = new Set([
  '.git',
  'e2e',
  'node_modules',
  'playwright-report',
  'test',
  'test-results'
]);

let browserContext;
let fixtureServer;
let fixtureUrl;
let temporaryRoot;
let extensionId;

function createTestExtension() {
  temporaryRoot = mkdtempSync(join(tmpdir(), 'bionic-preview-e2e-'));
  const extensionPath = join(temporaryRoot, 'extension');
  mkdirSync(extensionPath);

  cpSync(sourceExtension, extensionPath, {
    recursive: true,
    filter(sourcePath) {
      const pathFromRoot = relative(sourceExtension, sourcePath);
      const topLevelName = pathFromRoot.split(sep)[0];
      return !excludedTopLevel.has(topLevelName) &&
        ![
          'package.json',
          'package-lock.json',
          'playwright.config.cjs',
          'vitest.config.js',
          'vitest.config.mjs'
        ].includes(basename(sourcePath));
    }
  });

  // Opening the popup URL directly does not grant activeTab as a toolbar click
  // would. This test-only host grant reproduces that permission for localhost.
  const manifestPath = join(extensionPath, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return extensionPath;
}

test.beforeAll(async () => {
  fixtureServer = createServer((request, response) => {
    if (request.url === '/example.md') {
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('# Markdown fixture\n\n| Name | Value |\n| --- | --- |\n| Reader | ready |\n\n~~~text\n**literal**\n$x$\n~~~\n\nInline $x^2$.\n\n<svg><a href="https://example.com"><animate attributeName="href" values="javascript:alert(1)" /></a></svg>');
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html>
      <html>
        <body>
          <main>
            <h1>Extension fixture</h1>
            <p id="target">Readability controls update this paragraph immediately.</p>
          </main>
        </body>
      </html>`);
  });

  await new Promise(resolveListen => fixtureServer.listen(0, '127.0.0.1', resolveListen));
  const address = fixtureServer.address();
  fixtureUrl = `http://127.0.0.1:${address.port}/article`;

  const extensionPath = createTestExtension();
  const profilePath = join(temporaryRoot, 'profile');
  browserContext = await chromium.launchPersistentContext(profilePath, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  let serviceWorker = browserContext.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await browserContext.waitForEvent('serviceworker');
  }
  extensionId = new URL(serviceWorker.url()).host;
});

test.afterAll(async () => {
  await browserContext?.close();
  await new Promise(resolveClose => fixtureServer?.close(resolveClose));

  if (temporaryRoot?.startsWith(join(tmpdir(), 'bionic-preview-e2e-'))) {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('popup controls update the active page and restore it when disabled', async () => {
  const articlePage = await browserContext.newPage();
  await articlePage.goto(fixtureUrl);

  const popupPage = await browserContext.newPage();
  await popupPage.setViewportSize({ width: 340, height: 640 });
  await popupPage.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);

  // Keep the fixture tab active while the background popup page initializes.
  await articlePage.bringToFront();
  await popupPage.reload();
  await expect(popupPage.locator('#enableToggle')).toBeEnabled();

  await popupPage.locator('#enableToggle').evaluate(toggle => toggle.click());
  await expect(articlePage.locator('#target .bionic-bold')).not.toHaveCount(0);

  await popupPage.locator('#fixationPoint').evaluate(slider => {
    slider.value = '5';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(async () => articlePage.locator('#target .bionic-bold').first().textContent())
    .toBe('Readabili');

  await popupPage.locator('#dimOpacity').evaluate(slider => {
    slider.value = '80';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(async () => articlePage.locator('#target .bionic-dim').first()
    .evaluate(element => getComputedStyle(element).opacity))
    .toBe('0.8');

  await popupPage.locator('#gradientTheme').evaluate(select => {
    select.value = 'ocean';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(articlePage.locator('#target')).toHaveClass(/gradient-text/);
  await expect.poll(async () => articlePage.locator('#target')
    .evaluate(element => element.style.getPropertyValue('--gradient-color')))
    .toMatch(/^hsl\(/);

  mkdirSync(resolve('test-results/qa'), { recursive: true });
  await popupPage.screenshot({ path: resolve('test-results/qa/chrome-popup-light.png'), fullPage: true });
  await articlePage.screenshot({ path: resolve('test-results/qa/chrome-article-light.png'), fullPage: true });
  await popupPage.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await popupPage.screenshot({ path: resolve('test-results/qa/chrome-popup-dark.png'), fullPage: true });

  await popupPage.locator('#enableToggle').evaluate(toggle => toggle.click());
  await expect(articlePage.locator('#target .bionic-wrapper')).toHaveCount(0);
  await expect(articlePage.locator('#target')).toHaveText(
    'Readability controls update this paragraph immediately.'
  );
});


test('effects protect editors and diagrams, include new content, and stay scoped to a page', async () => {
  const page = await browserContext.newPage();
  await page.goto(fixtureUrl);
  await page.evaluate(() => {
    const protectedContent = document.createElement('div');
    protectedContent.innerHTML = '<div contenteditable="true"><p>editable draft</p></div><pre><code><span>literal code</span></code></pre><svg><text>diagram text</text></svg><math><mtext>formula label</mtext></math>';
    document.body.appendChild(protectedContent);
  });
  const popup = await browserContext.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await page.bringToFront();
  await popup.reload();
  await expect(popup.getByRole('checkbox', { name: 'Enable reading effects on this page' })).toBeEnabled();
  await popup.locator('#enableToggle').evaluate(toggle => toggle.click());
  await expect(page.locator('#target .bionic-wrapper')).not.toHaveCount(0);
  await expect(page.locator('[contenteditable] .bionic-wrapper, pre .bionic-wrapper, svg .bionic-wrapper, math .bionic-wrapper')).toHaveCount(0);
  await page.evaluate(() => {
    const paragraph = document.createElement('p');
    paragraph.id = 'dynamic';
    paragraph.textContent = 'Newly inserted readable content';
    document.body.appendChild(paragraph);
  });
  await expect(page.locator('#dynamic .bionic-bold')).not.toHaveCount(0);

  const secondPage = await browserContext.newPage();
  await secondPage.goto(fixtureUrl);
  await secondPage.bringToFront();
  await popup.reload();
  await expect(popup.locator('#enableToggle')).toBeEnabled();
  await expect(popup.locator('#enableToggle')).not.toBeChecked();
  await expect(secondPage.locator('.bionic-wrapper')).toHaveCount(0);
  await expect(page.locator('#dynamic .bionic-bold')).not.toHaveCount(0);
  await page.close();
  await secondPage.close();
  await popup.close();
});

test('raw Markdown renders tables and math safely and restores original node identity', async () => {
  const page = await browserContext.newPage();
  await page.goto(fixtureUrl.replace('/article', '/example.md'));
  await page.evaluate(() => {
    window.originalPre = document.querySelector('pre');
    window.originalPre.addEventListener('click', () => { window.originalClicked = true; });
  });
  const popup = await browserContext.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  await page.bringToFront();
  await popup.reload();
  await expect(popup.locator('#enableToggle')).toBeEnabled();
  await expect(popup.locator('#enableToggle')).toBeChecked();
  await expect(page.locator('.bionic-markdown-content table td')).toHaveCount(2);
  await expect(page.locator('pre code')).toHaveText('**literal**\n$x$\n');
  await expect(page.locator('.math-inline math')).toHaveCount(1);
  await expect(page.locator('svg, script')).toHaveCount(0);
  await page.setViewportSize({ width: 960, height: 900 });
  await page.screenshot({ path: resolve('test-results/qa/chrome-markdown-light.png'), fullPage: true });
  const lightColor = await page.locator('.bionic-markdown-content h1').evaluate(el => el.style.getPropertyValue('--gradient-color'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => page.locator('.bionic-markdown-content h1').evaluate(el => el.style.getPropertyValue('--gradient-color'))).not.toBe(lightColor);
  await page.screenshot({ path: resolve('test-results/qa/chrome-markdown-dark.png'), fullPage: true });
  await popup.locator('#enableToggle').evaluate(toggle => toggle.click());
  await expect(page.locator('.bionic-markdown-container')).toHaveCount(0);
  expect(await page.evaluate(() => document.querySelector('pre') === window.originalPre)).toBe(true);
  await page.locator('pre').click();
  expect(await page.evaluate(() => window.originalClicked)).toBe(true);
  await page.close();
  await popup.close();
});
