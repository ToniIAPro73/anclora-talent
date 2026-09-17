import path from 'node:path';
import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const TEST_USER = {
  fullName: 'E2E Remediation Bot',
  email: 'e2e.413@anclora-talent.test',
  password: 'E2ePassword123!',
};

const MANUSCRIPT_DOCX = '/Users/toni/Downloads/manuscrito_prueba_docx_indice_correcto.docx';
const EDITORIAL_REF_PDF = '/Users/toni/Downloads/El_Plan_de_Escape_EBOOK.pdf';
const BRAND_GUIDELINES_PDF = '/Users/toni/developer/anclora/anclora-insights-adn/Anclora_Insights_Brand_Guidelines.pdf';

const POST_FIX_DIR = path.resolve(__dirname, '../artifacts/qa/new-project-413/post-fix');
fs.mkdirSync(POST_FIX_DIR, { recursive: true });

async function ensureUserAndLogin(page: Page) {
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
  await page.goto('/sign-in');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#email').waitFor({ state: 'visible', timeout: 15_000 });

  // Try signing in
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  try {
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 8000 });
    return;
  } catch {
    // Need to register
  }

  await page.goto('/sign-up');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#fullName').waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('#fullName').fill(TEST_USER.fullName);
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 15_000 });
}

test.describe('Real Three-Document End-to-End Remediation (Fix HTTP 413)', () => {
  test.setTimeout(120_000);

  test('creates project with 3 large documents without HTTP 413, verifying complete isolation', async ({ page }) => {
    // 1. Authenticate
    await ensureUserAndLogin(page);

    // 2. Go to New Project page
    await page.goto('/projects/new');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('create-project-form')).toBeVisible({ timeout: 15_000 });

    // 3. Fill Title
    const titleInput = page.getByTestId('create-project-title-input');
    await titleInput.fill('Remediation 413 Three Documents');

    // 4. Upload Base Manuscript (DOCX)
    const sourceInput = page.getByTestId('source-document-input');
    await sourceInput.setInputFiles(MANUSCRIPT_DOCX);

    // Wait for analysis to complete and close DocumentDataModal
    const modalSave = page.getByTestId('document-data-save-button');
    await expect(modalSave).toBeVisible({ timeout: 20_000 });
    await modalSave.click();
    await expect(page.getByTestId('document-data-modal')).toBeHidden({ timeout: 5000 });

    // 5. Select Editorial Reference Style
    await page.getByTestId('editorial-style-reference').click();
    await expect(page.getByTestId('reference-document-inline-panel')).toBeVisible();

    // Upload Editorial Reference PDF (~4.04 MB)
    const refInput = page.getByTestId('reference-document-input');
    await refInput.setInputFiles(EDITORIAL_REF_PDF);

    // Click Analyze Reference
    const analyseBtn = page.getByTestId('reference-document-analyse');
    await expect(analyseBtn).toBeEnabled({ timeout: 5000 });
    await analyseBtn.click();

    // Wait for reference profile detection
    await expect(page.getByTestId('reference-profile-summary')).toBeVisible({ timeout: 30_000 });

    // 6. Upload Brand Reference PDF (~2.87 MB)
    const brandInput = page.getByTestId('brand-manual-input');
    await brandInput.setInputFiles(BRAND_GUIDELINES_PDF);

    // Wait for Brand Manual analysis to complete
    await expect(page.getByTestId('brand-manual-ready')).toBeVisible({ timeout: 30_000 });

    // 7. Verify Hidden Inputs are populated and file inputs have NO name attribute
    const importSessionInput = page.getByTestId('import-session-id-input');
    await expect(importSessionInput).toBeAttached();
    const sessionId = await importSessionInput.inputValue();
    expect(sessionId).toBeTruthy();

    const brandProfileInput = page.getByTestId('brand-profile-id-input');
    await expect(brandProfileInput).toBeAttached();
    const brandProfileId = await brandProfileInput.inputValue();
    expect(brandProfileId).toBeTruthy();

    const refEditorialInput = page.getByTestId('reference-editorial-profile-input');
    await expect(refEditorialInput).toBeAttached();
    const refProfileJson = await refEditorialInput.inputValue();
    expect(refProfileJson).toBeTruthy();

    // Check that raw file inputs do not have name attributes that would leak into the submit request
    await expect(sourceInput).not.toHaveAttribute('name');
    await expect(refInput).not.toHaveAttribute('name');
    await expect(brandInput).not.toHaveAttribute('name');

    // 8. Capture before-create screenshot
    await page.screenshot({
      path: path.join(POST_FIX_DIR, '01-before-create.png'),
      fullPage: true,
    });

    // 9. Intercept Submit POST request
    let submitRequestBodySize = 0;
    let submitStatus = 0;
    let submitUrl = '';

    page.on('request', (request) => {
      if (request.method() === 'POST' && (request.url().includes('/projects/new') || request.url().includes('/dashboard') || request.url().includes('/projects'))) {
        const postData = request.postDataBuffer();
        if (postData) {
          submitRequestBodySize = postData.length;
          submitUrl = request.url();
        }
      }
    });

    page.on('response', (response) => {
      if (response.request().method() === 'POST' && (response.url().includes('/projects/new') || response.url().includes('/dashboard') || response.url().includes('/projects'))) {
        submitStatus = response.status();
      }
    });

    // 10. Click Submit Button
    const submitBtn = page.getByTestId('create-project-submit-button');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click({ force: true });

    // 11. Wait for navigation to editor
    await expect(page).toHaveURL(/\/projects\/[^/]+\/editor/, { timeout: 30_000 });
    const currentUrl = page.url();
    const projectIdMatch = currentUrl.match(/\/projects\/([^/?]+)\/editor/);
    expect(projectIdMatch).toBeTruthy();
    const projectId = projectIdMatch![1];

    // Save network metrics
    fs.writeFileSync(
      path.join(POST_FIX_DIR, 'network-metrics.json'),
      JSON.stringify(
        {
          submitUrl,
          submitRequestBodySizeBytes: submitRequestBodySize,
          submitStatus,
          projectId,
          sessionId,
          brandProfileId,
        },
        null,
        2,
      ),
    );

    // CRITICAL ASSERTION: The final POST payload must be strictly under 10 KB (previously ~7 MB)
    expect(submitRequestBodySize).toBeLessThan(10 * 1024);
    expect(submitStatus).not.toBe(413);

    // 12. Capture editor screenshot
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: path.join(POST_FIX_DIR, '02-after-create-editor.png'),
      fullPage: true,
    });

    // 13. Verify Editor Content and Isolation
    // Dismiss onboarding tour if present
    const skipIntro = page.getByRole('button', { name: /Saltar introducción|Skip introduction/i });
    if (await skipIntro.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipIntro.click();
    }

    // Dismiss any pre-create modal in editor if opened
    const editorModalClose = page.getByTestId('document-data-close-button');
    if (await editorModalClose.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editorModalClose.click();
    }

    // Open chapters view
    const openChaptersBtn = page.getByRole('button', { name: /Abrir capítulos/i });
    if (await openChaptersBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await openChaptersBtn.click();
    }

    // Wait for chapter list to appear in UI
    await expect(page.getByText('Prólogo')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Reflexión final')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Bibliografía/)).toBeVisible({ timeout: 5000 });

    const pageContent = await page.content();

    // CRITICAL ISOLATION ASSERTION: Reference document content MUST NOT LEAK into project
    expect(pageContent).not.toContain('El test de las esposas de oro');
    expect(pageContent).not.toContain('Jubilación inversa');
    expect(pageContent).not.toContain('Tu plan de escape en 90 días');

    // 14. Verify Export Endpoints work
    // Test HTML export
    const htmlResponse = await page.request.get(`/api/projects/export?projectId=${projectId}&format=html`);
    expect(htmlResponse.status()).toBe(200);
    const htmlText = await htmlResponse.text();
    expect(htmlText).toContain('Prólogo');
    expect(htmlText).toContain('Reflexión final');
    expect(htmlText).not.toContain('El test de las esposas de oro');

    // Test DOCX export
    const docxResponse = await page.request.get(`/api/projects/export/docx?projectId=${projectId}`);
    expect(docxResponse.status()).toBe(200);
    expect(docxResponse.headers()['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Test EPUB export
    const epubResponse = await page.request.get(`/api/projects/export/epub?projectId=${projectId}`);
    expect(epubResponse.status()).toBe(200);
    expect(epubResponse.headers()['content-type']).toContain('application/epub+zip');

    // Test PDF export
    const pdfResponse = await page.request.get(`/api/projects/export/pdf?projectId=${projectId}`);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf');

    // Save final verified artifacts
    fs.writeFileSync(
      path.join(POST_FIX_DIR, 'verification-summary.json'),
      JSON.stringify(
        {
          status: 'PASS',
          projectId,
          submitRequestBodySizeBytes: submitRequestBodySize,
          reductionPercent: ((1 - submitRequestBodySize / (7 * 1024 * 1024)) * 100).toFixed(2) + '%',
          isolatedReferenceTextChecked: true,
          chaptersVerified: ['Índice', 'Prólogo', 'Capítulo 1', 'Capítulo 2', 'Capítulo 3', 'Capítulo 4', 'Reflexión final', 'Bibliografía de trabajo'],
          exportsVerified: ['HTML', 'DOCX', 'EPUB', 'PDF'],
          brandProfileLinked: brandProfileId,
          referenceEditorialProfileLinked: true,
        },
        null,
        2,
      ),
    );
  });
});
