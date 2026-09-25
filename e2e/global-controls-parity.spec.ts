import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const evidenceDir = 'artifacts/qa/global-controls-parity';
const qaUser = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

test.describe('global header controls — TableExtractor parity', () => {
  test.beforeAll(async ({ playwright }) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    });
    try {
      const response = await api.post('/api/auth/register', { data: qaUser });
      expect([201, 409]).toContain(response.status());
    } finally {
      await api.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'anclora-cookie-consent-v1',
        JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false }),
      );
      window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
    });
    await page.goto('/sign-in');
    await page.locator('#email').fill(qaUser.email);
    await page.locator('#password').fill(qaUser.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('[data-testid="dashboard-project-row"]').first()).toBeVisible();
    mkdirSync(evidenceDir, { recursive: true });
  });

  test('LANG-01..06 / THEME-01..05: dimensions, accessible names, hover, focus and keyboard', async ({ page }) => {
    const language = page.locator('[data-testid="global-language-control"]:visible').first();
    const theme = page.locator('[data-testid="global-theme-control"]:visible').first();
    await expect(language).toBeVisible();
    await expect(language).toHaveText('ES');
    await expect(language).toHaveAccessibleName(/Idioma: ES/);
    await expect(language.locator('svg')).toBeVisible();
    await expect(theme).toHaveAccessibleName(/Oscuro|dark/i);
    await expect(theme.locator('svg')).toBeVisible();

    const languageStyle = await language.evaluate((el) => {
      const style = getComputedStyle(el);
      return { height: style.height, radius: style.borderRadius, borderWidth: style.borderTopWidth, gap: style.columnGap, padding: style.paddingLeft };
    });
    // Chrome quantizes the fractional reference border to 1 CSS px at DSF 1;
    // the source declaration remains the exact 1.5px TableExtractor value.
    expect(languageStyle).toEqual({ height: '36px', radius: '9999px', borderWidth: '1px', gap: '6px', padding: '12px' });
    const themeStyle = await theme.evaluate((el) => {
      const style = getComputedStyle(el);
      return { width: style.width, height: style.height, radius: style.borderRadius, borderWidth: style.borderTopWidth };
    });
    expect(themeStyle).toEqual({ width: '36px', height: '36px', radius: '9999px', borderWidth: '1px' });

    await language.hover();
    await expect.poll(() => language.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await page.screenshot({ path: `${evidenceDir}/07-talent-language-hover.png` });
    await theme.hover();
    await expect.poll(() => theme.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');
    await page.screenshot({ path: `${evidenceDir}/08-talent-theme-hover.png` });
    await language.hover();
    await page.mouse.down();
    await expect.poll(() => language.evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(0.96, 0, 0, 0.96, 0, 0)');
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await theme.hover();
    await page.mouse.down();
    await expect.poll(() => theme.evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(0.96, 0, 0, 0.96, 0, 0)');
    await page.mouse.move(0, 0);
    await page.mouse.up();

    await page.locator('.dashboard-header-create').focus();
    await page.keyboard.press('Tab');
    await expect(language).toBeFocused();
    await expect.poll(() => language.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.screenshot({ path: `${evidenceDir}/09-talent-language-focus.png` });
    await page.keyboard.press('Tab');
    await expect(theme).toBeFocused();
    await expect.poll(() => theme.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.screenshot({ path: `${evidenceDir}/10-talent-theme-focus.png` });

    await language.focus();
    await page.keyboard.press('Enter');
    await expect(language).toHaveText('EN');
    await theme.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(theme).toHaveAttribute('aria-pressed', 'true');
  });

  test('LANG-07..10 / THEME-06..10: ES/EN and dark/light state persist', async ({ page }) => {
    const language = page.locator('[data-testid="global-language-control"]:visible').first();
    const theme = page.locator('[data-testid="global-theme-control"]:visible').first();
    await language.click();
    await expect(language).toHaveText('EN');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('anclora-locale'))).toBe('en');
    await page.reload();
    await expect(page.locator('[data-testid="global-language-control"]:visible').first()).toHaveText('EN');

    await theme.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('anclora-theme'))).toBe('light');
    await page.screenshot({ path: `${evidenceDir}/11-talent-light-controls.png` });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('[data-testid="global-language-control"]:visible').first().click();
    await expect(page.locator('[data-testid="global-language-control"]:visible').first()).toHaveText('ES');
    await page.locator('[data-testid="global-theme-control"]:visible').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('dark control pair and component-only screenshots', async ({ page }) => {
    const language = page.locator('[data-testid="global-language-control"]:visible').first();
    const theme = page.locator('[data-testid="global-theme-control"]:visible').first();
    await page.screenshot({ path: `${evidenceDir}/02-talent-dark-controls.png` });
    await language.screenshot({ path: `${evidenceDir}/04-talent-language.png` });
    await theme.screenshot({ path: `${evidenceDir}/06-talent-theme.png` });
    await expect(language).toHaveCSS('background-color', 'rgb(11, 17, 30)');
  });

  for (const width of [1536, 1440, 1280, 1024, 768, 375]) {
    test(`global controls remain usable without horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('[data-testid="global-language-control"]:visible').first()).toBeVisible();
      await expect(page.locator('[data-testid="global-theme-control"]:visible').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
