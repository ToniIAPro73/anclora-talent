import { expect, test, type Page } from '@playwright/test';

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

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
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/dashboard/);
}

test('keeps the workflow rail in Chapters and removes it from the editor workspace', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Abrir editor' }).first().click();
  const skipOnboarding = page.getByTestId('onboarding-skip-button');
  if (await skipOnboarding.isVisible().catch(() => false)) {
    await skipOnboarding.click();
  }
  await expect(page.getByRole('navigation', { name: 'Progress' })).toBeVisible();

  const stepper = page.getByTestId('chapter-workflow-stepper');
  await expect(stepper).toBeVisible();

  await stepper.getByRole('button').nth(1).click();
  await page.getByTestId('chapter-open-button').click();

  await expect(page.getByTestId('chapter-editor-workspace')).toBeVisible();
  await expect(page.getByTestId('chapter-workflow-stepper')).toHaveCount(0);
  await expect(page.getByTestId('chapter-organizer')).toHaveCount(0);
  await expect(page.locator('.ac-editor-shell .ac-stepper')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const route = document.querySelector('[data-testid="chapter-editor-workspace"]');
    const toolbar = document.querySelector('.ac-editor-shell .ac-text-editor__toolbar');
    const routeBox = route?.getBoundingClientRect();
    const toolbarBox = toolbar?.getBoundingClientRect();
    return {
      viewportHeight: window.innerHeight,
      routeHeight: routeBox?.height ?? 0,
      routeTop: routeBox?.top ?? 0,
      toolbarTop: toolbarBox?.top ?? 0,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(geometry.routeHeight).toBeGreaterThan(geometry.viewportHeight - 90);
  expect(geometry.toolbarTop - geometry.routeTop).toBeLessThan(100);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

  await page.getByTestId('chapter-editor-back-button').click();
  await expect(page.getByTestId('chapter-workflow-stepper')).toBeVisible();
  await expect(page.getByTestId('chapter-editor-workspace')).toHaveCount(0);
});
