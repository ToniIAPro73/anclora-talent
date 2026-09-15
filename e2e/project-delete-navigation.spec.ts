import { expect, test, type Page } from '@playwright/test';

/**
 * Fase 9 / 26 — delete-project navigation contract.
 *
 * Reported bug: open project -> delete -> redirected to /dashboard -> the
 * project is correctly deleted, but the "Mis proyectos" nav link is left in
 * a permanently pending/busy state (its own `data-navigation-state` never
 * settles back to "idle"), so the first click after landing back on
 * /dashboard does nothing and a second click is needed to open the modal.
 *
 * Root cause (fixed alongside this spec): NavigatingLink only cleared its
 * pending state when `usePathname()` changed. The "Mis proyectos" link only
 * changes the query string (/dashboard -> /dashboard?projects=1), so the
 * pathname never changes and the pending state was never cleared.
 */

const TEST_USER = {
  fullName: 'E2E Delete Nav Bot',
  email: 'e2e.deletenav@anclora-talent.test',
  password: 'E2ePassword123',
};

test.describe('Delete project — dashboard navigation stays idle', () => {
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
    });
    await page.goto('/sign-in');
    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /iniciar sesión|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  }

  async function createProject(page: Page, title: string) {
    await page.goto('/projects/new');
    await page.getByTestId('create-project-title-input').fill(title);
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
    return page.url().match(/\/projects\/([^/]+)\/editor/)?.[1];
  }

  test('redirect -> pending clears -> first click reopens the modal -> deleted project absent', async ({ page }) => {
    await login(page);

    const title = `Delete nav E2E ${Date.now()}`;
    const projectId = await createProject(page, title);
    expect(projectId).toBeTruthy();

    // Open "Mis proyectos" — this is the click whose pending state must not
    // get stuck once the delete below redirects back to the same /dashboard
    // pathname.
    const projectsLink = page.getByRole('link', { name: 'Mis proyectos' });
    await projectsLink.click();
    await expect(page).toHaveURL(/dashboard\?projects=1/);
    await expect(page.getByTestId('projects-modal-backdrop')).toBeVisible();

    await page.getByTestId('projects-search-input').fill(title);
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByTestId('projects-table-delete-action').click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByTestId('projects-modal-backdrop')).toHaveCount(0);

    await expect(projectsLink).toHaveAttribute('data-navigation-state', 'idle');

    // Contract: the very first click reopens the modal — no second click.
    await projectsLink.click();
    await expect(page).toHaveURL(/dashboard\?projects=1/);
    await expect(page.getByTestId('projects-modal-backdrop')).toBeVisible();

    await page.getByTestId('projects-search-input').fill(title);
    await expect(page.getByTestId('projects-table')).not.toContainText(title);
  });
});
