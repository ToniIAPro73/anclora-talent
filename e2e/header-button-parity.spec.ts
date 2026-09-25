import { expect, test } from '@playwright/test';

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

test('workspace header actions use compact shared buttons and keep their behavior', async ({ page, request }) => {
  const pageErrors: Error[] = [];
  const unexpectedResponses: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('/favicon')) {
      unexpectedResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'anclora-cookie-consent-v1',
      JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false }),
    );
    window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
  });
  const registration = await request.post('/api/auth/register', { data: TEST_USER });
  expect([201, 409]).toContain(registration.status());
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByTestId('global-language-control')).toBeVisible();
  await expect(page.getByTestId('global-language-control')).toHaveClass(/global-language-control/);
  await expect(page.getByTestId('global-language-control').locator('svg')).toBeVisible();
  await expect(page.getByTestId('global-theme-control')).toBeVisible();
  await expect(page.getByTestId('global-theme-control')).toHaveClass(/global-theme-control/);
  await expect(page.getByTestId('global-theme-control').locator('svg')).toBeVisible();

  await page.goto('/projects/new');
  await expect(page.getByTestId('global-language-control')).toBeVisible();
  await expect(page.getByTestId('global-theme-control')).toBeVisible();
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Abrir editor' }).first().click();
  await expect(page.getByTestId('global-language-control')).toBeVisible();
  await expect(page.getByTestId('global-theme-control')).toBeVisible();

  const preview = page.getByTestId('content-workspace-preview-button');
  const documentData = page.getByTestId('document-data-open-button');
  const dashboard = page.getByTestId('workspace-dashboard-button');

  for (const button of [preview, documentData, dashboard]) {
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/\bac-button\b/);
    await expect(button).toHaveClass(/\bac-button--compact\b/);
    await expect(button).not.toHaveClass(/\bac-button--primary\b/);
    await expect(button.locator('svg')).toHaveCount(0);
    await button.hover();
    await button.focus();
  }

  await expect(preview).toHaveText('Vista previa');
  await preview.click();
  await expect(page.getByRole('navigation', { name: 'Progress' })).toBeVisible();

  await page.goto(page.url());
  await expect(documentData).toBeVisible();
  await documentData.click();
  await expect(page.getByTestId('document-data-modal')).toBeVisible();
  await page.getByTestId('document-data-close-button').click();

  await dashboard.click();
  await expect(page).toHaveURL(/\/dashboard/);
  expect(pageErrors).toHaveLength(0);
  expect(unexpectedResponses).toEqual([]);
});
