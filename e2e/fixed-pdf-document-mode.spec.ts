import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

/**
 * fixed-pdf-document-mode — end-to-end coverage.
 *
 * Two tiers, mirroring pdf-import-structural-recovery.spec.ts:
 *
 * - Synthetic fixture (always runs, no real file needed): a 2-page PDF is
 *   generated at test time with pdf-lib. Covers the mode selector, workspace
 *   gating, preview, and byte-identical export/download.
 * - Real PDF walkthrough (gated, opt-in): exercises the actual mission
 *   fixture end-to-end, including login. Never committed, never hardcoded —
 *   point these env vars at a real environment to run it:
 *
 *     E2E_PROD_EMAIL=you@example.com \
 *     E2E_PROD_PASSWORD='...' \
 *     E2E_FIXED_PDF_PATH=/path/to/El_Plan_de_Escape_EBOOK.pdf \
 *     BASE_URL=https://talent.anclora.com \
 *       npx playwright test e2e/fixed-pdf-document-mode.spec.ts
 *
 *   Without these, the whole describe block is skipped — never a fabricated
 *   PASS.
 */

const TEST_USER = {
  fullName: 'E2E Fixed PDF Bot',
  email: 'e2e.fixedpdf@anclora-talent.test',
  password: 'E2ePassword123',
};

async function login(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
}

async function dismissDocumentDataModal(page: Page) {
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

function acceptCookies(page: Page) {
  return page.addInitScript(() => {
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
}

async function buildSyntheticPdf(): Promise<Buffer> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < 2; index += 1) {
    const page = doc.addPage([400, 600]);
    page.drawText(`Fixed PDF fixture — page ${index + 1}`, { x: 40, y: 550, size: 18, font });
  }
  return Buffer.from(await doc.save());
}

function extractProjectId(url: string): string {
  const match = url.match(/\/projects\/([^/]+)\/editor/);
  if (!match) throw new Error(`Could not extract projectId from ${url}`);
  return match[1];
}

test.describe('fixed-pdf document mode (synthetic fixture)', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1440, height: 900 } });

  const serverErrors: string[] = [];

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', { data: TEST_USER });
    expect([201, 409]).toContain(response.status());
  });

  test.beforeEach(async ({ page }) => {
    await acceptCookies(page);
    page.on('response', (response) => {
      if (response.status() === 500 && response.url().startsWith(page.url().split('/').slice(0, 3).join('/'))) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('mode selector defaults to fixed-pdf, workspace never forces cover/chapters, export is byte-identical', async ({ page }) => {
    test.setTimeout(120_000);
    const originalBytes = await buildSyntheticPdf();

    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles({
      name: 'fixture.pdf',
      mimeType: 'application/pdf',
      buffer: originalBytes,
    });

    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('document-mode-selector')).toBeVisible();
    await expect(page.getByTestId('document-mode-fixed-pdf-radio')).toBeChecked();

    await dismissDocumentDataModal(page);
    await page.getByTestId('create-project-title-input').fill('QA E2E Fixed PDF Fixture');
    await page.getByTestId('create-project-submit-button').click();

    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
    const projectId = extractProjectId(page.url());
    await dismissOnboarding(page);
    // Fixed-pdf mode still counts as an "imported" document, so the editor
    // reopens the document-data modal via `?documentData=open`.
    await dismissDocumentDataModal(page);
    await expect(page.locator('body')).not.toContainText(/Application error|500|Internal Server Error/i);

    // The private Blob URL is a server-only capability. It must not cross
    // into the RSC payload/client props; the viewer accesses it only through
    // the authenticated projectId route.
    const renderedDocument = await page.content();
    expect(renderedDocument).not.toContain('.private.blob.vercel-storage.com');
    expect(renderedDocument).not.toContain('gn3uhfhahfneij7r');

    // Chapters step (2): never forces the chapter organizer.
    await page.getByTestId('next-step-button').click();
    await expect(page.getByTestId('fixed-pdf-included-panel')).toBeVisible();
    await expect(page.getByTestId('reimport-open-button')).not.toBeVisible();

    // Template (3), Cover (4), Back Cover (5): same informational panel,
    // never CoverStudio.
    for (let step = 0; step < 3; step += 1) {
      await page.getByTestId('next-step-button').click();
      await expect(page.getByTestId('fixed-pdf-included-panel')).toBeVisible();
    }

    // Preview (6): the original-document viewer, not the composed preview.
    await page.getByTestId('next-step-button').click();
    await expect(page.getByTestId('fixed-pdf-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('fixed-pdf-canvas')).toBeVisible({ timeout: 20_000 });

    // Collaborate (7), AI (8), Export (9).
    await page.getByTestId('next-step-button').click();
    await page.getByTestId('next-step-button').click();
    await page.getByTestId('next-step-button').click();
    await expect(page.getByTestId('export-pdf-original-button')).toBeVisible();
    await expect(page.getByTestId('export-docx-button')).toBeDisabled();
    await expect(page.getByTestId('export-epub-button')).toBeDisabled();
    await expect(page.getByTestId('pdf-export-button')).toHaveCount(0);

    // Byte-identity: the export route must return the exact uploaded bytes.
    const exportResponse = await page.request.get(`/api/projects/export/pdf?projectId=${projectId}`);
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()['content-type']).toBe('application/pdf');
    const exportedBytes = Buffer.from(await exportResponse.body());
    expect(createHash('sha256').update(exportedBytes).digest('hex')).toBe(
      createHash('sha256').update(originalBytes).digest('hex'),
    );

    // Private source route also serves the exact same bytes.
    const sourceResponse = await page.request.get(`/api/projects/source-pdf?projectId=${projectId}`);
    expect(sourceResponse.status()).toBe(200);
    const sourceBytes = Buffer.from(await sourceResponse.body());
    expect(createHash('sha256').update(sourceBytes).digest('hex')).toBe(
      createHash('sha256').update(originalBytes).digest('hex'),
    );

    expect(serverErrors, `app-originated HTTP 500 responses: ${serverErrors.join(', ')}`).toEqual([]);
  });

  test('regression: choosing "convert to editable" for the same PDF still goes through the normal chapter flow', async ({ page }) => {
    test.setTimeout(60_000);
    const bytes = await buildSyntheticPdf();

    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles({
      name: 'fixture-editable.pdf',
      mimeType: 'application/pdf',
      buffer: bytes,
    });

    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 30_000 });
    await dismissDocumentDataModal(page);
    await page.getByTestId('document-mode-editable-radio').check();
    await expect(page.getByTestId('document-mode-hidden-input')).toHaveAttribute('value', 'editable');

    await page.getByTestId('create-project-title-input').fill('QA E2E Editable PDF Regression');
    await page.getByTestId('create-project-submit-button').click();

    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
    await dismissOnboarding(page);
    await dismissDocumentDataModal(page);

    await page.getByTestId('next-step-button').click();
    await expect(page.getByTestId('fixed-pdf-included-panel')).not.toBeVisible();
  });
});

const PROD_EMAIL = process.env.E2E_PROD_EMAIL;
const PROD_PASSWORD = process.env.E2E_PROD_PASSWORD;
const FIXED_PDF_PATH = process.env.E2E_FIXED_PDF_PATH;
const CAN_RUN_REAL_WALKTHROUGH = Boolean(
  PROD_EMAIL && PROD_PASSWORD && FIXED_PDF_PATH && fs.existsSync(FIXED_PDF_PATH),
);

test.describe('fixed-pdf document mode — real PDF walkthrough (gated, opt-in)', () => {
  test.skip(
    !CAN_RUN_REAL_WALKTHROUGH,
    'E2E_PROD_EMAIL / E2E_PROD_PASSWORD / E2E_FIXED_PDF_PATH not set or file missing — NOT_RUN',
  );
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1440, height: 900 } });

  test('login, upload, keep original PDF, preview, export — byte-identical to the source file', async ({ page }) => {
    test.setTimeout(180_000);
    await acceptCookies(page);
    await login(page, PROD_EMAIL!, PROD_PASSWORD!);

    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles(FIXED_PDF_PATH!);
    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('document-mode-fixed-pdf-radio')).toBeChecked();

    await dismissDocumentDataModal(page);
    await page.getByTestId('create-project-title-input').fill(`QA Fixed PDF — ${new Date().toISOString()}`);
    await page.getByTestId('create-project-submit-button').click();

    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
    const projectId = extractProjectId(page.url());
    await dismissOnboarding(page);
    await dismissDocumentDataModal(page);

    await page.getByTestId('next-step-button').click();
    await expect(page.getByTestId('fixed-pdf-included-panel')).toBeVisible();
    for (let step = 0; step < 4; step += 1) {
      await page.getByTestId('next-step-button').click();
    }
    await expect(page.getByTestId('fixed-pdf-preview')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('fixed-pdf-canvas')).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('next-step-button').click();
    await page.getByTestId('next-step-button').click();
    await page.getByTestId('next-step-button').click();
    await expect(page.getByTestId('export-pdf-original-button')).toBeVisible();

    const exportResponse = await page.request.get(`/api/projects/export/pdf?projectId=${projectId}`);
    expect(exportResponse.status()).toBe(200);
    const exportedBytes = Buffer.from(await exportResponse.body());
    const originalBytes = fs.readFileSync(FIXED_PDF_PATH!);

    const exportedHash = createHash('sha256').update(exportedBytes).digest('hex');
    const originalHash = createHash('sha256').update(originalBytes).digest('hex');
    expect(exportedHash).toBe(originalHash);
  });
});
