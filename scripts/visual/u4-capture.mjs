import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// U4 visual validation (lightweight): project-creation/upload surface
// (/projects/new) at 1440x900 dark, before/after, plus an import-result state
// using the real DOCX fixture when UPLOAD_FIXTURE=1.
// Usage: node scripts/visual/u4-capture.mjs [before|after]
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const phase = process.argv[2] || 'after';
const USER = { fullName: 'E2E Auth Bot', email: 'e2e.auth@anclora-talent.test', password: 'E2ePassword123' };
const OUT_DIR = process.env.OUT_DIR || '/tmp/u4-visual';
const FIXTURE = process.env.FIXTURE_PATH || 'fixtures/exito_sin_compania.docx';
mkdirSync(OUT_DIR, { recursive: true });

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
  await page.waitForURL(/dashboard/, { timeout: 30000 });
}

const browser = await chromium.launch();
await register().catch((err) => console.warn(`register skipped: ${err.message}`));
const results = [];

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'anclora-theme', value: 'dark', url: BASE }]);
const page = await ctx.newPage();
try {
  await login(page);
  await page.goto(`${BASE}/projects/new`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('[data-testid="source-document-input"]', { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/${phase}-projects-new-1440x900-dark.png`, fullPage: true });

  const accept = await page.locator('[data-testid="source-document-input"]').getAttribute('accept');
  results.push({ state: 'projects-new-1440x900-dark', accept });

  if (process.env.UPLOAD_FIXTURE === '1') {
    await page.locator('[data-testid="source-document-input"]').setInputFiles(FIXTURE);
    // Analysis of a 9.2MB DOCX can take a while on a dev server. The ready
    // panel is the success path; on failure the error copy renders instead.
    await page.waitForSelector('[data-testid="import-analysis-panel"]', { timeout: 120000 })
      .catch(() => page.waitForSelector('text=No se pudo analizar', { timeout: 10000 }));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT_DIR}/${phase}-projects-new-import-result-1440x900-dark.png`, fullPage: true });
    const state = await page.evaluate(() => ({
      ready: !!document.querySelector('[data-testid="import-analysis-panel"]'),
      warnings: document.querySelector('[data-testid="import-analysis-warnings"]')?.textContent ?? null,
      chapters: document.querySelector('[data-testid="import-analysis-chapters"]')?.textContent ?? null,
    }));
    results.push({ state: 'import-result', ...state });
  }
} catch (err) {
  results.push({ state: 'projects-new-1440x900-dark', pass: false, error: String(err).slice(0, 300) });
}

writeFileSync(`${OUT_DIR}/${phase}-assertions.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await ctx.close();
await browser.close();
