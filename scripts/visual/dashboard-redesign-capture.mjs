import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Attach to the canonical shared agent-browser runtime; never launch a separate engine.
const cdp = execFileSync('agent-browser', ['--session', 'talent-dashboard', 'get', 'cdp-url'], { encoding: 'utf8' }).trim();
const browser = await chromium.connectOverCDP(cdp);
const context = browser.contexts()[0];
const page = context.pages()[0];
const cdpSession = await context.newCDPSession(page);
await cdpSession.send('Network.clearBrowserCache');
await cdpSession.send('Network.setCacheDisabled', { cacheDisabled: true });
const base = process.env.BASE_URL || 'http://localhost:3000';
const out = process.env.OUT_DIR || 'artifacts/qa/dashboard-redesign';
mkdirSync(out, { recursive: true });
const errors = [];
const failures = [];
const checks = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', (response) => { if (response.status() >= 400) failures.push({ status: response.status(), url: response.url().split('?')[0] }); });
async function dashboard() {
  await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
  await page.locator('.dashboard-project-row').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function check(name) {
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    content: document.body.innerText.trim().length > 0,
    overlay: !!document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay'),
  }));
  assert.equal(state.overflow, false, `${name}: horizontal overflow`);
  assert.equal(state.content, true, `${name}: blank page`);
  assert.equal(state.overlay, false, `${name}: error overlay`);
  checks.push({ name, ...state });
}
await dashboard();
if (await page.locator('html').getAttribute('data-theme') !== 'dark') await page.getByTestId('theme-toggle').click();
if ((await page.getByTestId('locale-toggle').textContent()).trim() !== 'ES') { await page.getByTestId('locale-toggle').click(); await page.getByRole('heading', { name: 'Mis proyectos', exact: true }).waitFor(); }
for (const [width, name] of [[1440, '01-dashboard-dark-1440'], [1280, 'dashboard-1280'], [1024, '04-dashboard-1024'], [768, '05-dashboard-768'], [375, '06-dashboard-mobile']]) {
  await page.setViewportSize({ width, height: 900 });
  await check(name);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.locator('.dashboard-project-row').first().screenshot({ path: `${out}/02-dashboard-dark-projects.png` });
await page.getByRole('button', { name: 'Vista de cuadrícula' }).click();
await check('grid');
await page.screenshot({ path: `${out}/dashboard-grid.png` });
await page.getByRole('button', { name: 'Vista de lista' }).click();
await page.getByTestId('theme-toggle').click();
assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
await check('light');
await page.screenshot({ path: `${out}/03-dashboard-light-1440.png` });
await page.getByTestId('locale-toggle').click();
await page.getByRole('heading', { name: 'My projects', exact: true }).waitFor();
await check('english');
await page.screenshot({ path: `${out}/dashboard-english.png` });
await page.getByRole('searchbox').fill('no-such-project-dashboard-qa');
await page.getByText('No matching projects', { exact: true }).waitFor();
await check('no-results');
await page.getByRole('searchbox').fill('');
await page.getByRole('searchbox').focus();
await page.keyboard.press('Tab');
assert.equal(await page.locator(':focus').getAttribute('aria-label'), 'Sort by');
const focus = await page.locator(':focus').evaluate((element) => getComputedStyle(element).outlineStyle);
assert.notEqual(focus, 'none');
checks.push({ name: 'keyboard-visible-focus', pass: true });
const editorLink = page.locator('.dashboard-project-actions a').first();
const target = await editorLink.getAttribute('href');
await editorLink.click();
await page.waitForURL(`**${target}`);
await page.waitForLoadState('networkidle');
await check('open-editor');
await dashboard();
await page.locator('.dashboard-header-create').click();
await page.waitForURL('**/projects/new');
await page.getByTestId('create-project-title-input').waitFor();
await check('new-project');
await dashboard();
await page.locator('nav a[href="/dashboard?projects=1"]').click();
await page.getByRole('dialog').waitFor();
await check('my-projects-modal');
await page.keyboard.press('Escape');
await page.waitForURL('**/dashboard');
await check('modal-close');
writeFileSync(`${out}/browser-report.json`, JSON.stringify({ checks, errors, failures }, null, 2));
assert.deepEqual(errors, [], 'Browser errors');
assert.deepEqual(failures, [], 'Unexpected HTTP failures');
console.log(JSON.stringify({ checks: checks.length, errors: errors.length, failures: failures.length }));
await browser.close();
