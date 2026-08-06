import { chromium } from '@playwright/test';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';

// U1/U2 visual validation: /dashboard sidebar (expanded + collapsed).
// Usage: node scripts/visual/u1-u2-capture.mjs [before|after]
const BASE = 'http://localhost:3000';
const phase = process.argv[2] || 'after';
const USER = { fullName: 'E2E Auth Bot', email: 'e2e.auth@anclora-talent.test', password: 'E2ePassword123' };
const OUT_DIRS = ['test-results/visual/U1', 'test-results/visual/U2'];
for (const dir of OUT_DIRS) mkdirSync(dir, { recursive: true });

const DESKTOP = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
];
const MOBILE = [{ name: '375x667', width: 375, height: 667 }];
const viewports = phase === 'before' ? DESKTOP : [...DESKTOP, ...MOBILE];
const themes = phase === 'before' ? ['dark'] : ['dark', 'light'];

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

function saveShot(page, label) {
  return page.screenshot({ path: `${OUT_DIRS[0]}/${label}.png` }).then(() => {
    for (const dir of OUT_DIRS.slice(1)) {
      copyFileSync(`${OUT_DIRS[0]}/${label}.png`, `${dir}/${label}.png`);
    }
  });
}

async function runAssertions(page, state, results) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const aside = document.querySelector('aside');
    const main = document.querySelector('.talent-shell-main');
    const rects = {};
    if (aside) rects.aside = aside.getBoundingClientRect().toJSON();
    if (main) rects.main = main.getBoundingClientRect().toJSON();
    let overlap = false;
    if (aside && main) {
      const a = aside.getBoundingClientRect();
      const b = main.getBoundingClientRect();
      overlap = !(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1);
    }
    const asideText = (aside?.textContent ?? '').toLowerCase();
    const bodyText = (document.body.textContent ?? '').toLowerCase();
    const removed = ['nuevo proyecto', 'new project', 'stack activo', 'active stack', 'premium app'];
    const inAside = removed.filter((s) => asideText.includes(s));
    const inBody = removed.filter((s) => bodyText.includes(s));
    const navItems = Array.from(document.querySelectorAll('aside nav .ac-sidebar-nav__item'));
    const tooltips = navItems.map((el) => el.getAttribute('title'));
    const labelSpans = document.querySelectorAll('aside .talent-shell-sidebar-link__label').length;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      noHorizontalOverflow: doc.scrollWidth <= doc.clientWidth,
      asideWidth: rects.aside?.width ?? null,
      overlapAsideMain: overlap,
      removedInAside: inAside,
      removedInBody: inBody,
      navTooltips: tooltips,
      labelSpanCount: labelSpans,
    };
  });
  results.push({ state, ...r });
}

const browser = await chromium.launch();
await register();
const results = [];

for (const vp of viewports) {
  for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await ctx.addCookies([{ name: 'anclora-theme', value: theme, url: BASE }]);
    const page = await ctx.newPage();
    try {
      await login(page);
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(500);

      // Expanded (localStorage seeded false in login init script).
      const expandedLabel = `${phase}-dashboard-expanded-${vp.name}-${theme}`;
      await saveShot(page, expandedLabel);
      await runAssertions(page, `expanded-${vp.name}-${theme}`, results);

      // Collapsed via the shell toggle.
      const toggle = page.getByRole('button', { name: /Contraer menú|Collapse menu/i });
      await toggle.click();
      await page.waitForTimeout(600); // grid-template-columns transition (300ms)
      const collapsedLabel = `${phase}-dashboard-collapsed-${vp.name}-${theme}`;
      await saveShot(page, collapsedLabel);
      await runAssertions(page, `collapsed-${vp.name}-${theme}`, results);
    } catch (err) {
      results.push({ state: `${vp.name}-${theme}`, pass: false, error: String(err).slice(0, 200) });
    }
    await ctx.close();
  }
}

writeFileSync(`${OUT_DIRS[0]}/${phase}-assertions.json`, JSON.stringify(results, null, 2));
copyFileSync(`${OUT_DIRS[0]}/${phase}-assertions.json`, `${OUT_DIRS[1]}/${phase}-assertions.json`);
console.log(JSON.stringify(results, null, 2));
await browser.close();
