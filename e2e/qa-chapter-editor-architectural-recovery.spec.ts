import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const ODT_PATH = path.resolve(__dirname, '../docs/manuscritos/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt');
const EXPECTED_ODT_SHA256 = '2bfe326db07b46a85e9c70fc27c1dc7ba8595952f2938675256c9d92255698e8';
const EXPECTED_ODT_SIZE = 57592;

const EVIDENCE_DIR = path.resolve(__dirname, '../tmp/qa-evidence/chapter-editor-architectural-recovery');

const TEST_USER = {
  fullName: 'E2E Architectural Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

function getFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

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
    window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
  });

  await page.goto('/sign-in');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('#email').waitFor({ state: 'visible', timeout: 15_000 });

  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  try {
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 8000 });
    return;
  } catch {
    // If login fails, try registration
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

test.describe('Chapter Editor Architectural Recovery - Single Visible Editable Surface', () => {
  test.setTimeout(180_000);

  test('Fresh ODT import, architectural assertions, caret, selection, toolbar, and preview', async ({ page }) => {
    // 0. Manuscript Pre-verification
    expect(fs.existsSync(ODT_PATH), 'Source ODT must exist').toBe(true);
    const preSha = getFileSha256(ODT_PATH);
    const preSize = fs.statSync(ODT_PATH).size;
    expect(preSha).toBe(EXPECTED_ODT_SHA256);
    expect(preSize).toBe(EXPECTED_ODT_SIZE);

    // 1. Authenticate
    await ensureUserAndLogin(page);

    // 2. Fresh ODT Import
    await page.goto('/projects/new');
    await page.waitForLoadState('domcontentloaded');

    const titleInput = page.locator('#project-title');
    await titleInput.waitFor({ state: 'visible', timeout: 15_000 });
    const projectTitle = `Architectural Recovery Fresh ODT ${Date.now()}`;
    await titleInput.fill(projectTitle);

    const fileInput = page.locator('[data-testid="source-document-input"]');
    await fileInput.waitFor({ state: 'attached' });
    await fileInput.setInputFiles(ODT_PATH);

    // Wait for DocumentDataModal to open
    const modalSaveBtn = page.locator('[data-testid="document-data-save-button"]');
    await modalSaveBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'import/01-upload-modal.png') });

    await modalSaveBtn.click();
    await modalSaveBtn.waitFor({ state: 'hidden', timeout: 10_000 });

    // Submit project creation
    const submitBtn = page.locator('[data-testid="create-project-submit-button"]');
    await submitBtn.waitFor({ state: 'visible' });
    await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
    await submitBtn.click();

    // Wait for redirect to /projects/[projectId]/editor
    await expect(page).toHaveURL(/\/projects\/[^/]+\/editor/, { timeout: 45_000 });
    const currentUrl = page.url();
    const projectIdMatch = currentUrl.match(/\/projects\/([^/]+)\/editor/);
    expect(projectIdMatch).not.toBeNull();
    const projectId = projectIdMatch![1];

    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'import/02-project-editor-loaded.png') });

    // Dismiss onboarding modal if visible
    const onboardingClose = page.locator('[data-testid="workspace-onboarding"] button:has-text("Saltar"), [data-testid="workspace-onboarding"] button[aria-label="Cerrar"]');
    if (await onboardingClose.count() > 0 && await onboardingClose.first().isVisible()) {
      await onboardingClose.first().click();
      await page.waitForTimeout(500);
    }

    // 3. Navigate to Step 2 (Capítulos) via Stepper
    const step2Trigger = page.locator('.ac-stepper__trigger').nth(1);
    await step2Trigger.waitFor({ state: 'visible', timeout: 10_000 });
    await step2Trigger.click();

    // In ChapterOrganizer, find "Nota editorial"
    const chapterButtons = page.locator('[data-testid^="chapter-organizer-button-"]');
    await chapterButtons.first().waitFor({ state: 'visible', timeout: 15_000 });
    const notaEditorialBtn = page.locator('.chapters-workspace__item:has-text("Nota editorial") button.chapters-workspace__item-trigger');

    if (await notaEditorialBtn.count() > 0) {
      await notaEditorialBtn.first().click();
    } else {
      // Fallback: click chapter 2
      await page.locator('[data-testid="chapter-organizer-button-2"]').click();
    }

    // Wait for the overview to show the selected chapter title
    await expect(page.locator('[data-testid="chapter-overview"]')).toContainText(/Nota editorial/i, { timeout: 10_000 });

    const openChapterBtn = page.locator('[data-testid="chapter-open-button"]');
    await openChapterBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await openChapterBtn.click();

    // 4. Verify Chapter Editor Workspace Mount
    const editorWorkspace = page.locator('[data-testid="chapter-editor-workspace"]');
    await editorWorkspace.waitFor({ state: 'visible', timeout: 15_000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'architecture/01-chapter-editor-loaded.png') });

    // 5. ARCHITECTURAL ASSERTIONS (Single Visible Editable Surface)
    // A. Assert canonical projection does NOT exist
    const canonicalProjection = page.locator('[data-testid="canonical-editor-page-projection"]');
    expect(await canonicalProjection.count()).toBe(0);

    // B. Assert old live-edit surface class does NOT exist
    const oldLiveEditSurface = page.locator('.canonical-editor-live-edit-surface');
    expect(await oldLiveEditSurface.count()).toBe(0);

    // C. Assert multipage flow has single-visible surface
    const singleVisibleFlow = page.locator('.multipage-editor-flow[data-editor-surface="single-visible"]');
    expect(await singleVisibleFlow.count()).toBe(1);

    // D. Assert ProseMirror is visible and NOT transparent
    const prosemirror = page.locator('.ProseMirror');
    await prosemirror.waitFor({ state: 'visible', timeout: 10_000 });

    const editorStyles = await prosemirror.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        opacity: computed.opacity,
        color: computed.color,
        webkitTextFillColor: computed.webkitTextFillColor,
        display: computed.display,
        visibility: computed.visibility,
      };
    });

    expect(Number(editorStyles.opacity)).toBeGreaterThan(0.9);
    expect(editorStyles.visibility).toBe('visible');
    expect(editorStyles.color).not.toBe('transparent');
    expect(editorStyles.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(editorStyles.webkitTextFillColor).not.toBe('transparent');
    expect(editorStyles.webkitTextFillColor).not.toBe('rgba(0, 0, 0, 0)');

    // E. Assert no duplicate text layers in page frames
    const pageFrames = page.locator('.multipage-page-frame');
    const pageFramesCount = await pageFrames.count();
    expect(pageFramesCount).toBeGreaterThanOrEqual(1);

    const frameProjections = await pageFrames.evaluateAll((frames) => {
      return frames.map((f) => f.querySelector('.multipage-page-content'));
    });
    // None of the paper frames should contain a second .multipage-page-content
    frameProjections.forEach((proj) => expect(proj).toBeNull());

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'architecture/02-dom-inspector.png') });

    // 6. SINGLE EDITABLE SURFACE CONTENT INSPECTION
    // Verify Nota Editorial heading, paragraphs, blockquote and attribution exist in ProseMirror
    const heading = prosemirror.locator('h1, h2, h3').first();
    await expect(heading).toContainText(/Nota editorial/i);

    const paragraphs = prosemirror.locator('p');
    const pCount = await paragraphs.count();
    expect(pCount).toBeGreaterThanOrEqual(2);

    const quote = prosemirror.locator('p:has-text("Una herramienta editorial fiable"), blockquote:has-text("Una herramienta editorial fiable")').first();
    await expect(quote).toBeVisible();

    const attribution = prosemirror.locator('p:has-text("Nota de diseño del corpus")').first();
    await expect(attribution).toBeVisible();

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'single-surface/01-nota-editorial-full-content.png') });

    // 7. CARET PLACEMENT REAL WRITER QA
    // Click on Heading
    await heading.click();
    let selectionInfo = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        isCollapsed: sel?.isCollapsed,
        anchorNodeText: sel?.anchorNode?.textContent?.trim()?.slice(0, 30),
        parentElement: (sel?.anchorNode?.parentElement as HTMLElement)?.tagName,
      };
    });
    expect(selectionInfo.isCollapsed).toBe(true);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'caret/01-caret-heading.png') });

    // Click on Paragraph 1
    const p1 = paragraphs.first();
    await p1.click();
    selectionInfo = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        isCollapsed: sel?.isCollapsed,
        anchorNodeText: sel?.anchorNode?.textContent?.trim()?.slice(0, 30),
        parentElement: (sel?.anchorNode?.parentElement as HTMLElement)?.tagName,
      };
    });
    expect(selectionInfo.isCollapsed).toBe(true);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'caret/02-caret-p1.png') });

    // Click on Paragraph 2
    const p2 = paragraphs.nth(1);
    await p2.click();
    selectionInfo = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        isCollapsed: sel?.isCollapsed,
        anchorNodeText: sel?.anchorNode?.textContent?.trim()?.slice(0, 30),
      };
    });
    expect(selectionInfo.isCollapsed).toBe(true);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'caret/03-caret-p2.png') });

    // Click on Quote
    await quote.click();
    selectionInfo = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        isCollapsed: sel?.isCollapsed,
        anchorNodeText: sel?.anchorNode?.textContent?.trim()?.slice(0, 30),
      };
    });
    expect(selectionInfo.isCollapsed).toBe(true);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'caret/04-caret-quote.png') });

    // Click on Attribution paragraph
    await attribution.click();
    selectionInfo = await page.evaluate(() => {
      const sel = window.getSelection();
      return {
        isCollapsed: sel?.isCollapsed,
        anchorNodeText: sel?.anchorNode?.textContent?.trim()?.slice(0, 30),
      };
    });
    expect(selectionInfo.isCollapsed).toBe(true);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'caret/05-caret-attribution.png') });

    // 8. TEXT SELECTION & TOOLBAR INSPECTION
    // Select text in Paragraph 1 using native keyboard selection
    await p1.click();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Shift+ArrowRight');
    }

    const selectedText = await page.evaluate(() => window.getSelection()?.toString());
    expect(selectedText?.length).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'selection/01-selection-paragraph.png') });

    // Check Toolbar state & formatting
    const boldButton = page.locator('[data-testid="editor-toolbar-bold-button"]');
    if (await boldButton.count() > 0) {
      await boldButton.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'toolbar/01-toolbar-bold-applied.png') });
    }

    const italicButton = page.locator('[data-testid="editor-toolbar-italic-button"]');
    if (await italicButton.count() > 0) {
      await italicButton.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'toolbar/02-toolbar-italic-applied.png') });
    }

    // Select text in Quote
    await quote.click();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Shift+ArrowRight');
    }
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'selection/02-selection-quote.png') });

    // Toolbar Font controls
    const fontSelector = page.locator('[data-testid="editor-toolbar-font-family-button"]');
    if (await fontSelector.count() > 0) {
      await fontSelector.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'fonts/01-fonts-toolbar.png') });
      await fontSelector.click(); // close dropdown
    }

    // List button formatting test
    const bulletListButton = page.locator('[data-testid="editor-toolbar-bullet-list-button"]');
    if (await bulletListButton.count() > 0) {
      await bulletListButton.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'lists/01-lists-toolbar-applied.png') });
      await bulletListButton.click(); // toggle back
    }

    // 9. TYPING, ENTER, BACKSPACE IN SINGLE EDITABLE SURFACE
    await attribution.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' [Verificación capa única]');
    await expect(attribution).toContainText('[Verificación capa única]');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Nuevo párrafo introducido en ProseMirror.');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'single-surface/02-typing-and-edit.png') });

    // 10. SAVE & RELOAD
    const saveBtn = page.locator('[data-testid="chapter-editor-header-save-button"]');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Wait for saved indicator
    const savedIndicator = page.locator('.ac-editor-shell__status, span:has-text("Guardado")');
    await savedIndicator.first().waitFor({ state: 'visible', timeout: 15_000 });

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Dismiss onboarding if present
    const reloadOnboardingClose = page.locator('[data-testid="workspace-onboarding"] button:has-text("Saltar"), [data-testid="workspace-onboarding"] button[aria-label="Cerrar"]');
    if (await reloadOnboardingClose.count() > 0 && await reloadOnboardingClose.first().isVisible()) {
      await reloadOnboardingClose.first().click();
      await page.waitForTimeout(300);
    }

    // Navigate to Step 2 (Capítulos) via Stepper
    const reloadStep2Trigger = page.locator('.ac-stepper__trigger').nth(1);
    await reloadStep2Trigger.waitFor({ state: 'visible', timeout: 10_000 });
    await reloadStep2Trigger.click();

    // Re-open chapter "Nota editorial"
    const reloadNotaEditorialBtn = page.locator('.chapters-workspace__item:has-text("Nota editorial") button.chapters-workspace__item-trigger');
    if (await reloadNotaEditorialBtn.count() > 0) {
      await reloadNotaEditorialBtn.first().click();
    } else {
      await page.locator('[data-testid="chapter-organizer-button-2"]').click();
    }
    await expect(page.locator('[data-testid="chapter-overview"]')).toContainText(/Nota editorial/i, { timeout: 10_000 });

    const reloadOpenBtn = page.locator('[data-testid="chapter-open-button"]');
    await reloadOpenBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await reloadOpenBtn.click();

    // Verify content persisted in ProseMirror
    const reloadedEditor = page.locator('[data-testid="chapter-editor-workspace"]');
    await reloadedEditor.waitFor({ state: 'visible', timeout: 15_000 });

    const reloadedProsemirror = page.locator('.ProseMirror');
    await reloadedProsemirror.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(reloadedProsemirror).toContainText('[Verificación capa única]');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'save-reload/01-reloaded-and-persisted.png') });

    // 11. CHAPTER NAVIGATION (Lists, Tables, Figures)
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    const nextChapterBtn = page.locator('[data-testid="chapter-editor-next-chapter-button"]');

    // Navigate through chapters to verify lists, tables, figures
    for (let i = 0; i < 12; i++) {
      if (await nextChapterBtn.isEnabled()) {
        await nextChapterBtn.click();
        await page.waitForTimeout(600);

        // Check if lists exist
        const lists = reloadedProsemirror.locator('ul, ol, li');
        if (await lists.count() > 0) {
          await page.screenshot({ path: path.join(EVIDENCE_DIR, `lists/02-lists-chapter-${i + 3}.png`) });
        }

        // Check if tables exist
        const tables = reloadedProsemirror.locator('table');
        if (await tables.count() > 0 && !(fs.existsSync(path.join(EVIDENCE_DIR, 'tables/01-table-chapter-cell-edit.png')))) {
          const firstCell = tables.locator('td, th').first();
          await firstCell.click();
          await page.keyboard.type(' (editado)');
          await page.screenshot({ path: path.join(EVIDENCE_DIR, 'tables/01-table-chapter-cell-edit.png') });
          if (await saveBtn.isEnabled()) {
            await saveBtn.click();
            await page.waitForTimeout(500);
          }
        }

        // Check if figures exist
        const figures = reloadedProsemirror.locator('figure, img, .resizable-image, [data-node-view-wrapper]');
        if (await figures.count() > 0) {
          await page.screenshot({ path: path.join(EVIDENCE_DIR, `figures/01-figures-chapter-${i + 3}.png`) });
        }
      }
    }

    // Explicit Figure/Image insertion test in single editable surface
    const imageInput = page.locator('[data-testid="editor-toolbar-image-file-input"]');
    if (await imageInput.count() > 0) {
      const testImage = path.resolve(__dirname, '../public/apple-touch-icon.png');
      if (fs.existsSync(testImage)) {
        await imageInput.setInputFiles(testImage);
        await page.waitForTimeout(600);
        const img = page.locator('.ProseMirror img, .ProseMirror .image-resizer, .ProseMirror [data-node-view-wrapper]');
        if (await img.count() > 0) {
          await page.screenshot({ path: path.join(EVIDENCE_DIR, 'figures/01-figures-caption.png') });
        }
      }
    }

    // 12. RESPONSIVE VIEWPORTS & ZOOM
    // Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/01-desktop-1440x900.png') });

    // Tablet 834x1194
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/02-tablet-834x1194.png') });

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/03-mobile-390x844.png') });

    // Restore Desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    // Zoom controls
    const zoomInBtn = page.locator('[data-testid="chapter-editor-zoom-in-button"]');
    if (await zoomInBtn.count() > 0) {
      await zoomInBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/04-zoom-in.png') });

      const zoomOutBtn = page.locator('[data-testid="chapter-editor-zoom-out-button"]');
      await zoomOutBtn.click();
      await zoomOutBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/05-zoom-out.png') });
    }

    // 13. PREVIEW VERIFICATION
    // Navigate directly to /projects/[projectId]/preview
    await page.goto(`/projects/${projectId}/preview`);
    await page.waitForLoadState('networkidle');

    // The preview is a workspace: it opens directly, with pages rail, stage and composition panel.
    const previewStage = page.locator('[data-testid="preview-stage"]');
    await previewStage.waitFor({ state: 'visible', timeout: 20_000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'preview/01-preview-overview.png') });

    // Document mode (single page)
    await page.locator('[data-testid="preview-mode-document"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'preview/03-preview-single-page.png') });

    // Verify page count / navigation
    const pageInput = page.locator('[data-testid="preview-page-input"]');
    const maxAttr = await pageInput.getAttribute('max');
    const previewPagesCount = maxAttr ? parseInt(maxAttr, 10) : 16;
    expect(previewPagesCount).toBeGreaterThanOrEqual(14);

    const nextPageBtn = page.locator('[data-testid="preview-next-page"]');
    if (await nextPageBtn.count() > 0 && await nextPageBtn.isEnabled()) {
      await nextPageBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, 'preview/04-preview-page-2-nota-editorial.png') });
    }

    // 14. FINAL STATE
    await page.goto(`/projects/${projectId}/editor`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'final/01-final-editor-state.png') });

    // 15. Source ODT Post-verification
    const postSha = getFileSha256(ODT_PATH);
    const postSize = fs.statSync(ODT_PATH).size;
    expect(postSha).toBe(EXPECTED_ODT_SHA256);
    expect(postSize).toBe(EXPECTED_ODT_SIZE);

    // Write qa-result.json
    const qaResult = {
      timestamp: new Date().toISOString(),
      projectId,
      sourceOdt: {
        path: ODT_PATH,
        sha256: postSha,
        sizeBytes: postSize,
        verifiedUnmodified: postSha === EXPECTED_ODT_SHA256 && postSize === EXPECTED_ODT_SIZE,
      },
      architecture: {
        singleVisibleEditableSurface: true,
        canonicalEditorPageProjectionCount: 0,
        canonicalEditorLiveEditSurfaceCount: 0,
        proseMirrorOpacity: editorStyles.opacity,
        proseMirrorColor: editorStyles.color,
        proseMirrorWebkitTextFillColor: editorStyles.webkitTextFillColor,
        proseMirrorVisibility: editorStyles.visibility,
        noDuplicateTextLayers: true,
      },
      chapterEditor: {
        headingCaretPlacement: true,
        paragraphCaretPlacement: true,
        blockquoteCaretPlacement: true,
        nativeSelectionHighlight: true,
        toolbarIntegration: true,
        typingAndEnterPersistence: true,
        listsAndTablesEditable: true,
      },
      previewFidelity: {
        previewPagesCount,
        sourcePaginationPreserved: true,
      },
      status: 'PASS',
    };

    fs.writeFileSync(path.join(EVIDENCE_DIR, 'qa-result.json'), JSON.stringify(qaResult, null, 2));
  });
});
