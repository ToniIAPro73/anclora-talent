import { expect, test, type Page } from '@playwright/test';

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

test.describe('P6 — editorial workspace hierarchy', () => {
  test.setTimeout(120_000);

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', { data: TEST_USER });
    expect([201, 409]).toContain(response.status());
  });

  async function login(page: Page) {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'anclora-cookie-consent-v1',
        JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false }),
      );
      window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
    });
    await page.goto('/sign-in');
    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /iniciar sesión|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  }

  test('puts writing first while preserving expert controls and responsive containment', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto('/projects/new');
    await page.getByTestId('create-project-title-input').fill(`P6 hierarchy ${Date.now()}`);
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });

    await expect(page.getByTestId('content-primary-panel')).toBeVisible();
    await expect(page.getByTestId('content-advanced-disclosure')).not.toHaveAttribute('open', '');
    const contentTop = await page.getByTestId('content-primary-panel').evaluate((element) => Math.round(element.getBoundingClientRect().top));
    expect(contentTop).toBeLessThan(400);

    await page.getByTestId('content-primary-action').click();
    await expect(page.getByTestId('chapter-organizer')).toBeVisible();
    const chapterTop = await page.getByTestId('chapter-organizer').evaluate((element) => Math.round(element.getBoundingClientRect().top));
    expect(chapterTop).toBeLessThan(500);

    await page.locator('.ac-stepper__trigger').first().click();
    await page.getByTestId('content-advanced-disclosure').locator('summary').click();
    await expect(page.getByTestId('document-rules-panel')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByTestId('content-primary-panel')).toBeVisible();
    const mobileGeometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(mobileGeometry.documentWidth).toBeLessThanOrEqual(mobileGeometry.viewport + 1);
  });
});
