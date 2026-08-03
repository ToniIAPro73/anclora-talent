import { expect, test, type Page } from '@playwright/test';

/**
 * Composition engine UI contract (FASE C — rules panel, document health,
 * reimport flow). Exercises the real browser against a production build:
 * creates a project from a markdown source, edits declarative rules, checks
 * the health counter, and runs a full reimport with structural diff preview.
 */

const TEST_USER = {
  fullName: 'E2E Composition Bot',
  email: 'e2e.composition@anclora-talent.test',
  password: 'E2ePassword123',
};

const SOURCE_MD = `# Capítulo 1: Orígenes

Primer párrafo del capítulo uno con contenido suficiente para existir.

# Capítulo 2: Desarrollo

Primer párrafo del capítulo dos con contenido suficiente para existir.
`;

const REIMPORT_MD = `# Capítulo 1: Orígenes

Primer párrafo del capítulo uno, ahora revisado durante la reimportación.

# Capítulo 2: Desarrollo

Primer párrafo del capítulo dos con contenido suficiente para existir.

# Capítulo 3: Cierre

Un capítulo completamente nuevo añadido en la segunda versión del documento.
`;

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/);
}

async function createProjectFromMarkdown(page: Page, title: string, markdown: string) {
  await page.goto('/projects/new');
  await page.getByTestId('source-document-input').setInputFiles({
    name: 'manuscrito.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(markdown, 'utf-8'),
  });
  await expect(page.getByTestId('import-analysis-panel')).toBeVisible();
  await page.getByTestId('create-project-title-input').fill(title);
  await page.getByRole('button', { name: 'Crear proyecto y abrir editor' }).click();
  // Generous budget: the first creation of a run can hit a cold Neon wake-up
  // and the redirect lands after the default 5s expect timeout.
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 15_000 });
}

async function goToWorkspaceStep(page: Page, step: number) {
  const nextButton = page.getByRole('button', { name: 'Siguiente paso' });
  for (let current = 1; current < step; current += 1) {
    await nextButton.click();
  }
}

test.describe('composition engine UI', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: TEST_USER,
    });
    expect([201, 409]).toContain(response.status());
  });

  test.beforeEach(async ({ page }) => {
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
        }),
      );
      window.localStorage.removeItem('anclora-project-workflow-step');
    });
    await login(page);
  });

  test('rules panel edits and persists declarative composition rules', async ({ page }) => {
    await createProjectFromMarkdown(page, 'Reglas E2E', SOURCE_MD);

    const panel = page.getByTestId('document-rules-panel');
    await expect(panel).toBeVisible();

    const keepTable = page.getByTestId('rules-keep-table');
    await expect(keepTable).toBeChecked();
    await keepTable.click();
    await expect(keepTable).not.toBeChecked();

    await page.getByTestId('rules-save-button').click();
    await expect(panel.getByRole('status')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('rules-keep-table')).not.toBeChecked();
  });

  test('document health panel shows the violations counter', async ({ page }) => {
    await createProjectFromMarkdown(page, 'Salud E2E', SOURCE_MD);

    await expect(page.getByTestId('document-health-panel')).toBeVisible();
    await expect(page.getByTestId('document-health-counter')).toBeVisible();
  });

  test('reimport dialog previews the structural diff and merges', async ({ page }) => {
    await createProjectFromMarkdown(page, 'Reimport E2E', SOURCE_MD);

    await goToWorkspaceStep(page, 2);
    await page.getByTestId('reimport-open-button').click();

    const dialog = page.getByTestId('reimport-dialog');
    await expect(dialog).toBeVisible();

    await page.getByTestId('reimport-file-input').setInputFiles({
      name: 'manuscrito-v2.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(REIMPORT_MD, 'utf-8'),
    });
    await expect(page.getByTestId('reimport-diff-preview')).toBeVisible();

    await page.getByTestId('reimport-confirm-button').click();
    await expect(page.getByTestId('reimport-result')).toBeVisible();

    await page.getByTestId('reimport-done-button').click();
    await expect(dialog).not.toBeVisible();
  });
});
