import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// U3 visual validation: /dashboard redesign (compact hero, active-count chip,
// two-column projects grid). Usage: node scripts/visual/u3-capture.mjs [before|after]
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const phase = process.argv[2] || 'after';
const USER = { fullName: 'E2E Auth Bot', email: 'e2e.auth@anclora-talent.test', password: 'E2ePassword123' };
const OUT_DIR = process.env.OUT_DIR || 'test-results/visual/U3';
mkdirSync(OUT_DIR, { recursive: true });

const DESKTOP = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
];
const MOBILE = [{ name: '375x667', width: 375, height: 667 }];
const viewports = phase === 'before' ? DESKTOP : [...DESKTOP, ...MOBILE];
const themes = ['dark', 'light'];

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
    window.localStorage.setItem('anclora-sidebar-collapsed', 'false');
  });
  await page.goto(`${BASE}/sign-in`);
  await page.locator('#email').fill(USER.email);
  await page.locator('#password').fill(USER.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
}

// The chip (dashboard-active-count) only renders when the account has >0
// projects, so seed one through the UI when the dashboard is empty.
async function ensureProject(page) {
  await page.waitForSelector('.talent-project-card, .ac-empty-state', { timeout: 30000 });
  const count = await page.locator('.talent-project-card').count();
  if (count > 0) return count;
  await page.locator('[data-testid="create-project-title-input"]').fill(`U3 Visual Project ${Date.now()}`);
  await page.locator('[data-testid="create-project-submit-button"]').click();
  await page.waitForURL(/projects\//, { timeout: 30000 }).catch(() => {});
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('.talent-project-card, .ac-empty-state', { timeout: 30000 });
  return page.locator('.talent-project-card').count();
}

async function runAssertions(page, state, results) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const bodyText = document.body.textContent ?? '';
    const hero = document.querySelector('main section');
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      metricCards: document.querySelectorAll('.ac-metric-card').length,
      heroCtaLinks: hero ? hero.querySelectorAll('a[href="/projects/new"]').length : null,
      descriptionPresent:
        bodyText.includes('Auth, documento, preview y portada') ||
        bodyText.includes('Auth, document, preview'),
      chipPresent: !!document.querySelector('[data-testid="dashboard-active-count"]'),
      chipText: document.querySelector('[data-testid="dashboard-active-count"]')?.textContent ?? null,
      projectCount: document.querySelectorAll('.talent-project-card').length,
      createFormPresent: !!document.querySelector('[data-testid="create-project-form"]'),
    };
  });
  results.push({ state, ...r });
}

const browser = await chromium.launch();
// Registration is best-effort: the E2E account usually already exists, and
// register may answer 409 or 500 in that case. Login is the real gate.
await register().catch((err) => console.warn(`register skipped: ${err.message}`));
const results = [];

for (const vp of viewports) {
  for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await ctx.addCookies([{ name: 'anclora-theme', value: theme, url: BASE }]);
    const page = await ctx.newPage();
    try {
      await login(page);
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 });
      await ensureProject(page);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT_DIR}/${phase}-dashboard-${vp.name}-${theme}.png`, fullPage: true });
      await runAssertions(page, `${vp.name}-${theme}`, results);
    } catch (err) {
      results.push({ state: `${vp.name}-${theme}`, pass: false, error: String(err).slice(0, 200) });
    }
    await ctx.close();
  }
}

writeFileSync(`${OUT_DIR}/${phase}-assertions.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();
