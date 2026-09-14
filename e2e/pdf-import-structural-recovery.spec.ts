import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * pdf-import-structural-recovery — end-to-end regression.
 *
 * Level B acceptance (see sdd/features/pdf-import-structural-recovery):
 * exercises the real regression PDF, never committed to the repo. Point
 * `REAL_PDF_FIXTURE` at a local copy to run it:
 *
 *   REAL_PDF_FIXTURE=/path/to/El_Plan_de_Escape_EBOOK.pdf \
 *     BASE_URL=http://localhost:3100 npx playwright test e2e/pdf-import-structural-recovery.spec.ts
 *
 * Without the env var, every test in this file is skipped — this must
 * never be reported as a fabricated PASS (REAL_PDF_ACCEPTANCE = NOT_RUN).
 */

const REAL_PDF_PATH = process.env.REAL_PDF_FIXTURE;
const REAL_PDF_AVAILABLE = Boolean(REAL_PDF_PATH && fs.existsSync(REAL_PDF_PATH));

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

const EXPECTED = {
  title: 'El Plan de Escape de la Mediana Edad',
  subtitle: 'Cómo desatascarte profesionalmente sin dinamitar tu vida',
  author: 'Antonio Ballesteros Alonso',
  primaryStructuralUnits: 14,
};

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/);
}

async function dismissDocumentDataModal(page: Page) {
  // U6: a fresh analysis auto-opens the pre-create composition-review
  // modal; closing it (equivalent to a user skipping that optional step)
  // is required before the create-project submit button is clickable.
  const closeButton = page.getByTestId('document-data-close-button');
  try {
    await closeButton.waitFor({ state: 'visible', timeout: 4000 });
    await closeButton.click();
    await closeButton.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // modal not shown
  }
}

async function dismissOnboarding(page: Page) {
  const skipIntro = page.getByRole('button', { name: /Saltar introducción|Skip introduction/i });
  try {
    await skipIntro.waitFor({ state: 'visible', timeout: 4000 });
    await skipIntro.click();
    await skipIntro.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // onboarding not shown
  }
}

test.describe('pdf-import-structural-recovery (real PDF, Level B)', () => {
  test.skip(!REAL_PDF_AVAILABLE, 'REAL_PDF_FIXTURE not set or file not found — REAL_PDF_ACCEPTANCE = NOT_RUN');
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1440, height: 900 } });

  let editorUrl = '';
  const serverErrors: string[] = [];

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', { data: TEST_USER });
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
    });
    // App-originated HTTP 500s only — filter out anything that isn't this
    // origin (e.g. a browser extension's own request) per task §11.
    page.on('response', (response) => {
      if (response.status() === 500 && response.url().startsWith(page.url().split('/').slice(0, 3).join('/'))) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    await login(page);
  });

  test('uploads the real PDF and the analysis panel shows correct metadata and structure', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles(REAL_PDF_PATH!);
    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 60_000 });

    await expect(page.getByTestId('import-analysis-title')).toContainText(EXPECTED.title);
    await expect(page.getByTestId('import-analysis-subtitle')).toContainText(EXPECTED.subtitle);
    await expect(page.getByTestId('import-analysis-author')).toContainText(EXPECTED.author);

    const chaptersText = (await page.getByTestId('import-analysis-chapters').textContent()) ?? '';
    const chapterCount = Number(chaptersText.match(/\d+/)?.[0] ?? '0');
    expect(chapterCount).toBeGreaterThan(1);

    // No stale "could not analyze" warning when the analysis genuinely
    // succeeded (task §10) — the warnings panel, if present at all, must
    // only ever mention the synthetic-index note, never a parse failure.
    const warningsPanel = page.getByTestId('import-analysis-warnings');
    if (await warningsPanel.isVisible().catch(() => false)) {
      const warningsText = (await warningsPanel.textContent()) ?? '';
      expect(warningsText).not.toMatch(/no se pudo analizar|couldn't analyze|análisis fall/i);
    }
  });

  test('confirms the import, creates the project, and opens the editor with no HTTP 500', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles(REAL_PDF_PATH!);
    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('import-analysis-chapters')).toBeVisible();
    await dismissDocumentDataModal(page);

    await page.getByTestId('create-project-title-input').fill(EXPECTED.title);
    await page.getByTestId('create-project-submit-button').click();

    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
    editorUrl = page.url();
    await dismissOnboarding(page);

    // The editor shell itself must render — not a Next.js error boundary.
    await expect(page.locator('body')).not.toContainText(/Application error|500|Internal Server Error/i);

    expect(serverErrors, `app-originated HTTP 500 responses: ${serverErrors.join(', ')}`).toEqual([]);
  });

  test('chapter content is accessible after import', async ({ page }) => {
    test.setTimeout(60_000);
    expect(editorUrl, 'previous test must have set the editor URL').not.toBe('');
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await dismissDocumentDataModal(page);
    // Chapter edit buttons live on the workspace's chapter-editing step.
    await page.getByTestId('next-step-button').click();
    await page.waitForTimeout(300);

    const chapterCount = await page.locator('[data-testid^="chapter-edit-button-"]').count();
    expect(chapterCount).toBeGreaterThan(1);

    await page.locator('[data-testid^="chapter-edit-button-"]').first().click();
    const editorRoot = page.locator('.ac-editor-shell .ProseMirror').first();
    await expect(editorRoot).toBeVisible({ timeout: 15_000 });
    const text = (await editorRoot.textContent()) ?? '';
    expect(text.trim().length).toBeGreaterThan(0);

    expect(serverErrors, `app-originated HTTP 500 responses: ${serverErrors.join(', ')}`).toEqual([]);
  });
});
