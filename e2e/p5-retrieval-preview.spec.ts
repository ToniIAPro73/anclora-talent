import { expect, test, type Page } from '@playwright/test';

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

test.describe('P5 — shared retrieval and immediate preview', () => {
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
  }

  test('finds duplicate titles through the same retrieval contract on page and quick switcher', async ({ page }) => {
    await login(page);
    const title = `P5 shared retrieval ${Date.now()}`;
    await createProject(page, title);
    await createProject(page, title);

    await page.goto('/projects');
    await page.getByTestId('projects-search-input').fill(title);
    await expect(page.getByTestId('projects-result-count')).toHaveText(/2 resultados|2 results/);
    await expect(page.getByTestId('duplicate-project-title')).toHaveCount(2);
    const inventoryIds = await page.getByRole('link', { name: /Abrir editor|Open editor/ }).evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    );

    await page.goto('/dashboard?projects=1');
    await page.getByTestId('projects-search-input').fill(title);
    await expect(page.getByTestId('projects-result-count')).toHaveText(/2 resultados|2 results/);
    const modalIds = await page.getByTestId('projects-table-edit-action').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    );
    expect(modalIds).toEqual(inventoryIds);
  });

  test('shows useful preview content before opening the full preview modal', async ({ page }) => {
    await login(page);
    const title = `P5 immediate preview ${Date.now()}`;
    await createProject(page, title);
    const projectId = page.url().match(/\/projects\/([^/]+)\/editor/)?.[1];
    expect(projectId).toBeTruthy();

    await page.goto(`/projects/${projectId}/preview`);
    await expect(page.getByTestId('preview-inline-document')).toBeVisible();
    await expect(page.getByTestId('preview-inline-cover')).toBeVisible();
    await expect(page.getByTestId('preview-inline-content')).toContainText(/Portadilla|Esta primera versión|This first version/);
    await page.getByTestId('open-full-preview-button').click();
    await expect(page.getByTestId('preview-modal-stage')).toBeVisible();
  });
});
