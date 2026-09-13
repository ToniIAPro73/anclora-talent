import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = 'test-results/visual/landing-final';

mkdirSync(OUT_DIR, { recursive: true });

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    document.cookie = `anclora-theme=${t}; path=/; max-age=31536000; samesite=lax`;
  }, theme);
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'es', deviceScaleFactor: 2 });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'anclora-cookie-consent-v1',
      JSON.stringify({
        necessary: true,
        session: true,
        analytics: false,
        marketing: false,
        updatedAt: new Date().toISOString(),
        version: 'v1',
      })
    );
  });

  // Desktop captures (1440x900)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  // 1. Desktop Dark
  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT_DIR}/landing-desktop-dark-1440x900.png`, fullPage: true });

  // 2. Desktop Light
  await setTheme(page, 'light');
  await page.screenshot({ path: `${OUT_DIR}/landing-desktop-light-1440x900.png`, fullPage: true });

  // 3. Mobile captures (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

  // 3. Mobile Dark
  await setTheme(page, 'dark');
  await page.screenshot({ path: `${OUT_DIR}/landing-mobile-dark-390x844.png`, fullPage: true });

  // 4. Mobile Light
  await setTheme(page, 'light');
  await page.screenshot({ path: `${OUT_DIR}/landing-mobile-light-390x844.png`, fullPage: true });

  // Extract Quantitative Metrics
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    const allText = main ? main.innerText : document.body.innerText;
    const words = allText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    const sections = document.querySelectorAll('main > div > section');
    const cards = document.querySelectorAll(
      '[class*="rounded-3xl"], [class*="rounded-2xl"], [class*="rounded-xl"], .ac-card, article'
    );
    const listItems = document.querySelectorAll('main li');
    const ctas = document.querySelectorAll('main a[href*="sign"], main a[href^="#"], main button');

    return {
      sectionCount: sections.length,
      visibleWordCount: words.length,
      cardsCount: cards.length,
      bulletsCount: listItems.length,
      ctasCount: ctas.length,
      sectionsList: Array.from(sections).map((s) => ({
        id: s.id || 'hero',
        heading: s.querySelector('h1, h2, h3')?.innerText?.trim() || '',
      })),
    };
  });

  console.log('=== Landing Quantitative Metrics ===');
  console.log(JSON.stringify(metrics, null, 2));

  writeFileSync(`${OUT_DIR}/landing-metrics.json`, JSON.stringify(metrics, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
