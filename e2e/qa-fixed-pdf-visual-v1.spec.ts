import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * fixed-pdf visual QA (v1) — closes the visual-QA gap flagged in the
 * remediation report: the SHA-256 byte-identity check proves export
 * integrity, but does not by itself prove the viewer renders the original
 * pages correctly. This spec inspects the real viewer directly, across
 * viewports and themes, using the real mission fixture.
 *
 * Screenshots follow this repo's convention (see e2e/qa-uxui-audit-v1.spec.ts):
 * test-results/qa/fixedpdf-<surface>-<viewport>-<theme>.png
 */

const REAL_PDF_PATH = path.join(process.env.HOME ?? '', 'Downloads', 'El_Plan_de_Escape_EBOOK.pdf');
const REAL_PDF_AVAILABLE = fs.existsSync(REAL_PDF_PATH);

const TEST_USER = {
  fullName: 'E2E Fixed PDF Bot',
  email: 'e2e.fixedpdf@anclora-talent.test',
  password: 'E2ePassword123',
};

const SHOTS_DIR = path.resolve(__dirname, '../test-results/qa');
fs.mkdirSync(SHOTS_DIR, { recursive: true });
function shotPath(name: string) {
  return path.join(SHOTS_DIR, `${name}.png`);
}

const VIEWPORTS = [
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 375, height: 667, label: '375x667' },
] as const;

async function dismissCookieConsent(page: Page) {
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
}

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
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

async function resetToStepOne(page: Page) {
  const prevButton = page.getByTestId('previous-step-button');
  for (let i = 0; i < 10; i += 1) {
    if (await prevButton.isDisabled().catch(() => true)) break;
    await prevButton.click();
    await page.waitForTimeout(200);
  }
}

async function goToWorkspaceStep(page: Page, step: number) {
  await resetToStepOne(page);
  const nextButton = page.getByTestId('next-step-button');
  for (let current = 1; current < step; current += 1) {
    await nextButton.click();
    await page.waitForTimeout(200);
  }
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  test.info().annotations.push({ type: `overflow-${label}`, description: `${overflow}px` });
  expect(overflow, `${label}: horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(1);
}

async function waitForCanvasPaint(page: Page) {
  const canvas = page.getByTestId('fixed-pdf-canvas');
  await expect.poll(
    async () =>
      canvas.evaluate((element) => {
        const canvasElement = element as HTMLCanvasElement;
        if (canvasElement.width === 0 || canvasElement.height === 0) return false;

        const context = canvasElement.getContext('2d');
        if (!context) return false;

        // Sampling a grid makes this independent of where the PDF puts its
        // text. Before pdfjs finishes, resizing the canvas leaves it fully
        // transparent; after page.render() at least one sampled pixel is
        // painted.
        for (let row = 1; row <= 16; row += 1) {
          for (let column = 1; column <= 16; column += 1) {
            const x = Math.floor((canvasElement.width * column) / 17);
            const y = Math.floor((canvasElement.height * row) / 17);
            const alpha = context.getImageData(x, y, 1, 1).data[3];
            if (alpha > 0) return true;
          }
        }
        return false;
      }),
    { timeout: 20_000 },
  ).toBe(true);
}

async function scrollCanvasBottomIntoView(page: Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="fixed-pdf-canvas"]');
    if (!canvas) return;
    const bottom = canvas.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo(0, Math.max(0, bottom - window.innerHeight + 40));
  });
}

async function createFixedPdfProject(page: Page, title: string) {
  await page.goto('/projects/new');
  await page.getByTestId('source-document-input').setInputFiles(REAL_PDF_PATH);
  await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 60_000 });
  await dismissDocumentDataModal(page);
  await page.getByTestId('create-project-title-input').fill(title);
  await page.getByTestId('create-project-submit-button').click();
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
  await dismissOnboarding(page);
  await dismissDocumentDataModal(page);
}

test.describe('fixed-pdf visual QA (real PDF, v1)', () => {
  test.skip(!REAL_PDF_AVAILABLE, `Real PDF fixture not found at ${REAL_PDF_PATH} — NOT_RUN`);
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', { data: TEST_USER });
    expect([201, 409]).toContain(response.status());
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`mode selector renders correctly at every viewport (${theme})`, async ({ page, context }) => {
      test.setTimeout(120_000);
      await context.addCookies([{ name: 'anclora-theme', value: theme, domain: 'localhost', path: '/' }]);
      await dismissCookieConsent(page);
      await login(page);

      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.goto('/projects/new');
        await page.getByTestId('source-document-input').setInputFiles(REAL_PDF_PATH);
        await expect(page.getByTestId('document-mode-selector')).toBeVisible({ timeout: 60_000 });
        await expect(page.getByTestId('document-mode-fixed-pdf-radio')).toBeChecked();
        await dismissDocumentDataModal(page);
        await page.getByTestId('document-mode-selector').scrollIntoViewIfNeeded();
        await page.screenshot({ path: shotPath(`fixedpdf-mode-selector-${viewport.label}-${theme}`) });
        await expectNoHorizontalOverflow(page, `mode-selector-${viewport.label}-${theme}`);
      }
    });

    test(`workspace, viewer and export render correctly at every viewport (${theme})`, async ({ page, context }) => {
      test.setTimeout(240_000);
      await context.addCookies([{ name: 'anclora-theme', value: theme, domain: 'localhost', path: '/' }]);
      await dismissCookieConsent(page);
      await login(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await createFixedPdfProject(page, `QA Visual Fixed PDF ${theme} ${Date.now()}`);

      // Chapters step: never a forced editor, always the informational panel.
      await goToWorkspaceStep(page, 2);
      await expect(page.getByTestId('fixed-pdf-included-panel')).toBeVisible();
      await page.screenshot({ path: shotPath(`fixedpdf-included-panel-1440x900-${theme}`) });

      // Preview step, primary desktop viewport: inspect real pages directly
      // (cover, an early page, a mid-book page, and the last page) — the
      // SHA-256 check proves export integrity; this proves the *viewer*
      // renders the original content, not a reconstruction.
      await goToWorkspaceStep(page, 6);
      await expect(page.getByTestId('fixed-pdf-canvas')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('fixed-pdf-page-indicator')).toContainText('1 / 122');
      await waitForCanvasPaint(page);
      await page.screenshot({ path: shotPath(`fixedpdf-preview-cover-1440x900-${theme}`) });
      await expectNoHorizontalOverflow(page, `preview-1440x900-${theme}`);

      const nextPageButton = page.getByTestId('fixed-pdf-next-page');
      for (let i = 0; i < 5; i += 1) {
        await nextPageButton.click();
        await page.waitForTimeout(150);
      }
      await expect(page.getByTestId('fixed-pdf-page-indicator')).toContainText('6 / 122');
      await waitForCanvasPaint(page);
      await page.screenshot({ path: shotPath(`fixedpdf-preview-early-page6-1440x900-${theme}`) });

      for (let i = 0; i < 54; i += 1) {
        await nextPageButton.click();
        await page.waitForTimeout(120);
      }
      await expect(page.getByTestId('fixed-pdf-page-indicator')).toContainText('60 / 122');
      await waitForCanvasPaint(page);
      await page.screenshot({ path: shotPath(`fixedpdf-preview-content-page60-1440x900-${theme}`) });

      for (let i = 0; i < 62; i += 1) {
        await nextPageButton.click();
        await page.waitForTimeout(120);
      }
      await expect(page.getByTestId('fixed-pdf-page-indicator')).toContainText('122 / 122');
      await expect(nextPageButton).toBeDisabled();
      await waitForCanvasPaint(page);
      await scrollCanvasBottomIntoView(page);
      await page.screenshot({ path: shotPath(`fixedpdf-preview-lastpage122-1440x900-${theme}`) });
      // The application shell owns the vertical scroll area, so a viewport
      // screenshot can legitimately stop above the centered closing text.
      // Capture the rendered canvas itself as the unambiguous last-page
      // evidence as well.
      await page.getByTestId('fixed-pdf-canvas').screenshot({
        path: shotPath(`fixedpdf-preview-lastpage122-canvas-${theme}`),
      });

      // Export step: original-PDF download offered, DOCX/EPUB disabled —
      // check at every viewport (chrome-only, no page-hop needed here).
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await goToWorkspaceStep(page, 9);
        await expect(page.getByTestId('export-pdf-original-button')).toBeVisible();
        await expect(page.getByTestId('export-docx-button')).toBeDisabled();
        await expect(page.getByTestId('export-epub-button')).toBeDisabled();
        await page.screenshot({ path: shotPath(`fixedpdf-export-${viewport.label}-${theme}`) });
        await expectNoHorizontalOverflow(page, `export-${viewport.label}-${theme}`);
      }

      // Workspace step 1 (the shell most likely to overflow on mobile) at
      // every viewport too.
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await goToWorkspaceStep(page, 1);
        await page.screenshot({ path: shotPath(`fixedpdf-workspace-step1-${viewport.label}-${theme}`) });
        await expectNoHorizontalOverflow(page, `workspace-step1-${viewport.label}-${theme}`);
      }
    });
  }

  test('fixed-pdf preview shows a genuine loading state, then a genuine error state', async ({ page }) => {
    test.setTimeout(120_000);
    await page.context().addCookies([{ name: 'anclora-theme', value: 'light', domain: 'localhost', path: '/' }]);
    await dismissCookieConsent(page);
    await login(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await createFixedPdfProject(page, `QA Visual Loading/Error ${Date.now()}`);

    // Loading state: delay the source-pdf response so the loading UI has
    // time to paint before pdfjs gets any bytes. pdfjs can issue more than
    // one request for the same URL (range probing) — only delay the first.
    let delayed = false;
    await page.route('**/api/projects/source-pdf*', async (route) => {
      if (!delayed) {
        delayed = true;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
      await route.continue().catch(() => undefined);
    });
    await goToWorkspaceStep(page, 6);
    await expect(page.getByTestId('fixed-pdf-preview-loading')).toBeVisible();
    await page.screenshot({ path: shotPath('fixedpdf-preview-loading-1440x900-light') });
    await page.unroute('**/api/projects/source-pdf*');

    // Error state: make the same request fail outright.
    await page.route('**/api/projects/source-pdf*', (route) => route.fulfill({ status: 500, body: 'boom' }));
    await goToWorkspaceStep(page, 1);
    await goToWorkspaceStep(page, 6);
    await expect(page.getByTestId('fixed-pdf-preview-error')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: shotPath('fixedpdf-preview-error-1440x900-light') });
  });
});
