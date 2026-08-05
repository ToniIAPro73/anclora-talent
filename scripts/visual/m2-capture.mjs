import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3100';
const OUT = 'test-results/visual/M2';
const phase = process.argv[2] || 'after';
const USER = { fullName: 'E2E Auth Bot', email: 'e2e.auth@anclora-talent.test', password: 'E2ePassword123' };
const FIXTURE = path.resolve('fixtures/exito_sin_compania.docx');

mkdirSync(OUT, { recursive: true });

async function register() {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(USER),
  });
  if (!res.ok && res.status !== 409) throw new Error(`register failed: ${res.status}`);
}

async function login(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'anclora-cookie-consent-v1',
      JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' })
    );
  });
  await page.goto(`${BASE}/sign-in`);
  await page.locator('#email').fill(USER.email);
  await page.locator('#password').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 20000 });
}

async function dismissOnboarding(page) {
  const skipIntro = page.getByRole('button', { name: /Saltar introducción|Skip introduction/i });
  try {
    await skipIntro.waitFor({ state: 'visible', timeout: 4000 });
    await skipIntro.click();
    await skipIntro.waitFor({ state: 'hidden', timeout: 5000 });
  } catch { /* not shown */ }
}

async function resetToStepOne(page) {
  const prevButton = page.getByTestId('previous-step-button');
  for (let i = 0; i < 8; i += 1) {
    if (await prevButton.isDisabled().catch(() => true)) break;
    await prevButton.click();
    await page.waitForTimeout(250);
  }
}

async function goToStep(page, step) {
  await resetToStepOne(page);
  const nextButton = page.getByTestId('next-step-button');
  for (let i = 1; i < step; i += 1) {
    if (await nextButton.isDisabled().catch(() => false)) break;
    await nextButton.click();
    await page.waitForTimeout(300);
  }
}

// Content-node assertions (not the shell): imported tables/lists must not clip.
// Hidden measurement flows and offscreen surfaces are skipped (not clipping).
async function assertContent(page, rootSelector, label, results) {
  const r = await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return { error: `root ${selector} not found` };
    const clipped = [];
    let tables = 0;
    let lists = 0;
    for (const el of Array.from(root.querySelectorAll('table, ul, ol'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right < 0 || rect.left > window.innerWidth) continue;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
      if (el.tagName === 'TABLE') tables += 1;
      else lists += 1;
      const surface = el.closest('[data-testid="editable-page-surface"]') ?? root;
      const bounds = surface.getBoundingClientRect();
      const clippedX = el.scrollWidth > el.clientWidth + 1;
      const outsideX = rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
      if (clippedX || outsideX) clipped.push(`${el.tagName} clippedX=${clippedX} outsideX=${outsideX}`);
    }
    return { tables, lists, clipped: clipped.slice(0, 5) };
  }, rootSelector);
  results.push({ label, ...r, pass: !r.error && (r.clipped ?? []).length === 0 });
}

const browser = await chromium.launch();
await register();

// Import the fixture once (es, desktop).
const setupCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const setupPage = await setupCtx.newPage();
await login(setupPage);
await setupPage.goto(`${BASE}/projects/new`);
await setupPage.getByTestId('source-document-input').setInputFiles(FIXTURE);
await setupPage.getByTestId('import-analysis-panel').waitFor({ timeout: 60000 });
await setupPage.getByTestId('create-project-title-input').fill('M2 Visual Import');
await setupPage.getByTestId('create-project-submit-button').click();
await setupPage.waitForURL(/\/projects\/.+\/editor/, { timeout: 60000 });
const editorUrl = setupPage.url();
await setupCtx.close();

const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 667 } };
const results = [];

for (const [vpName, vp] of Object.entries(viewports)) {
  for (const theme of ['dark', 'light']) {
    for (const locale of ['es', 'en']) {
      const ctx = await browser.newContext({ viewport: vp, locale });
      await ctx.addCookies([
        { name: 'anclora-theme', value: theme, url: BASE },
        { name: 'anclora-locale', value: locale, url: BASE },
      ]);
      const page = await ctx.newPage();
      await login(page);

      // Surface 1: chapter editor with imported lists/REFLEXIÓN content.
      const editorLabel = `editor-chapter-${vpName}-${theme}-${locale}`;
      try {
        await page.goto(editorUrl, { waitUntil: 'networkidle', timeout: 45000 });
        await dismissOnboarding(page);
        await goToStep(page, 2);
        const edits = await page.locator('[data-testid^="chapter-edit-button-"]').count();
        let opened = false;
        for (let i = 1; i <= Math.min(edits, 15) && !opened; i += 1) {
          await page.getByTestId(`chapter-edit-button-${i}`).click();
          const root = page.locator('.ac-editor-shell .ProseMirror').first();
          await root.waitFor({ timeout: 15000 });
          const lists = await root.locator('ul, ol').count();
          const text = (await root.textContent()) ?? '';
          if (lists > 0 || text.includes('REFLEXIÓN')) opened = true;
          else await page.getByTestId('chapter-editor-close-button').first().click();
        }
        if (!opened) throw new Error('no chapter with imported content found');
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/${phase}-${editorLabel}.png` });
        await assertContent(page, '.ac-editor-shell', editorLabel, results);
        await page.getByTestId('chapter-editor-close-button').first().click();
      } catch (err) {
        results.push({ label: editorLabel, pass: false, error: String(err).slice(0, 160) });
      }

      // Surface 2: full preview on a page containing imported content.
      const previewLabel = `preview-modal-${vpName}-${theme}-${locale}`;
      try {
        await page.goto(editorUrl, { waitUntil: 'networkidle', timeout: 45000 });
        await dismissOnboarding(page);
        await goToStep(page, 6);
        await page.getByTestId('open-full-preview-button').click();
        const stage = page.getByTestId('preview-modal-stage');
        await stage.waitFor({ timeout: 30000 });
        // Advance until a page shows a table or list (cap 40 pages).
        for (let i = 0; i < 40; i += 1) {
          const has = await stage.evaluate((n) => n.querySelectorAll('table, ul, ol').length);
          if (has > 0 && i >= 2) break;
          const next = page.getByTestId('preview-modal-next-page-button');
          if (await next.isDisabled()) break;
          await next.click();
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${phase}-${previewLabel}.png` });
        await assertContent(page, '[data-testid="preview-modal-stage"]', previewLabel, results);
        await page.getByTestId('preview-modal-close-button').click();
      } catch (err) {
        results.push({ label: previewLabel, pass: false, error: String(err).slice(0, 160) });
      }

      await ctx.close();
    }
  }
}

writeFileSync(`${OUT}/${phase}-assertions.json`, JSON.stringify({ editorUrl, results }, null, 2));
const failed = results.filter((r) => !r.pass);
console.log(`captures: ${results.length}, failed: ${failed.length}`);
for (const f of failed) console.log('FAIL', JSON.stringify(f));
await browser.close();
