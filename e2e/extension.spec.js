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

  await popupPage.locator('#enableToggle').evaluate(toggle => toggle.click());
  await expect(articlePage.locator('#target .bionic-wrapper')).toHaveCount(0);
  await expect(articlePage.locator('#target')).toHaveText(
    'Readability controls update this paragraph immediately.'
  );
});
