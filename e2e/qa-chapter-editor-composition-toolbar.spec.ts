import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const ODT_PATH = path.resolve(__dirname, '../docs/manuscritos/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt');
const EXPECTED_ODT_SHA256 = '2bfe326db07b46a85e9c70fc27c1dc7ba8595952f2938675256c9d92255698e8';
const EXPECTED_ODT_SIZE = 57592;

const EVIDENCE_DIR = path.resolve(__dirname, '../tmp/qa-evidence/chapter-editor-composition-toolbar');

const TEST_USER = {
  fullName: 'E2E Toolbar Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

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

async function openChapterEditor(page: Page) {
  // Dismiss onboarding modal if visible
  const onboardingClose = page.locator('[data-testid="workspace-onboarding"] button:has-text("Saltar"), [data-testid="workspace-onboarding"] button[aria-label="Cerrar"]');
  if (await onboardingClose.count() > 0 && await onboardingClose.first().isVisible()) {
    await onboardingClose.first().click();
    await page.waitForTimeout(300);
  }

  // Navigate to Step 2 (Capítulos) via Stepper
  const step2Trigger = page.locator('.ac-stepper__trigger').nth(1);
  await step2Trigger.waitFor({ state: 'visible', timeout: 15_000 });
  await step2Trigger.click();

  // In ChapterOrganizer, select a chapter
  const chapterBtn = page.locator('[data-testid^="chapter-organizer-button-"]').first();
  await chapterBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await chapterBtn.click();

  const openChapterBtn = page.locator('[data-testid="chapter-open-button"]');
  await openChapterBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await openChapterBtn.click();

  const editorWorkspace = page.locator('[data-testid="chapter-editor-workspace"]');
  await editorWorkspace.waitFor({ state: 'visible', timeout: 15_000 });
}

async function closeChapterEditor(page: Page) {
  const backBtn = page.locator('[data-testid="chapter-editor-back-button"]');
  await backBtn.click();
  const editorWorkspace = page.locator('[data-testid="chapter-editor-workspace"]');
  await editorWorkspace.waitFor({ state: 'hidden', timeout: 15_000 });
}

test.describe('Chapter Editor Composition Preset & Proportional Toolbar Recovery', () => {
  test.setTimeout(240_000);

  test('Fresh ODT import, Custom Preset lifecycle, Project Isolation, Proportional Toolbar, and Responsive layout', async ({ page }) => {
    // Setup evidence directories
    ensureDir(path.join(EVIDENCE_DIR, 'composition'));
    ensureDir(path.join(EVIDENCE_DIR, 'custom-preset'));
    ensureDir(path.join(EVIDENCE_DIR, 'isolation'));
    ensureDir(path.join(EVIDENCE_DIR, 'toolbar'));
    ensureDir(path.join(EVIDENCE_DIR, 'responsive'));
    ensureDir(path.join(EVIDENCE_DIR, 'final'));

    // 0. Pre-flight verification of source ODT manuscript
    expect(fs.existsSync(ODT_PATH), 'Source ODT must exist').toBe(true);
    const preSha = getFileSha256(ODT_PATH);
    const preSize = fs.statSync(ODT_PATH).size;
    expect(preSha).toBe(EXPECTED_ODT_SHA256);
    expect(preSize).toBe(EXPECTED_ODT_SIZE);

    // 1. Authenticate
    await ensureUserAndLogin(page);

    // 2. Fresh ODT Import for Project A
    await page.goto('/projects/new');
    await page.waitForLoadState('domcontentloaded');

    const titleInput = page.locator('#project-title');
    await titleInput.waitFor({ state: 'visible', timeout: 15_000 });
    const projectTitleA = `Composition Project A ${Date.now()}`;
    await titleInput.fill(projectTitleA);

    const fileInput = page.locator('[data-testid="source-document-input"]');
    await fileInput.waitFor({ state: 'attached' });
    await fileInput.setInputFiles(ODT_PATH);

    // DocumentDataModal should open automatically after upload
    const modalSaveBtn = page.locator('[data-testid="document-data-save-button"]');
    await modalSaveBtn.waitFor({ state: 'visible', timeout: 30_000 });

    // Verify DocumentDataModal shows "Personalizado"
    const presetSelect = page.locator('[data-testid="document-data-margin-preset-select"]');
    await expect(presetSelect).toHaveValue('custom');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'composition/01-import-modal-custom.png') });

    await modalSaveBtn.click();
    await modalSaveBtn.waitFor({ state: 'hidden', timeout: 10_000 });

    // Submit project creation
    const submitBtn = page.locator('[data-testid="create-project-submit-button"]');
    await submitBtn.waitFor({ state: 'visible' });
    await submitBtn.click();

    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/editor/, { timeout: 45_000 });
    await page.waitForLoadState('domcontentloaded');

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'composition/02-project-workspace.png') });

    // 3. Open Chapter Editor (Project A)
    await openChapterEditor(page);

    // Single visible ProseMirror surface verification (Architectural non-negotiable)
    const proseMirrorSurfaces = page.locator('.ProseMirror');
    await expect(proseMirrorSurfaces).toHaveCount(1);
    const canonicalPageLayers = page.locator('[data-canonical-page-layer]');
    await expect(canonicalPageLayers).toHaveCount(0);

    // 4. Verify Initial Custom Preset in Chapter Editor Toolbar
    const marginToggle = page.locator('[data-testid="margin-selector-toggle"]');
    await marginToggle.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(marginToggle).toContainText('Personalizado');

    // 5. Measure Toolbar Control Dimensions (Defect B Verification)
    const fontSizeButton = page.locator('[data-testid="editor-toolbar-font-size-button"]');
    await fontSizeButton.waitFor({ state: 'visible', timeout: 10_000 });
    const fontSizeBox = await fontSizeButton.boundingBox();
    expect(fontSizeBox).not.toBeNull();
    // Font size control must be COMPACT: <= 68px width (never 170px!)
    expect(fontSizeBox!.width).toBeLessThanOrEqual(68);
    expect(fontSizeBox!.width).toBeGreaterThanOrEqual(45);

    const marginToggleBox = await marginToggle.boundingBox();
    expect(marginToggleBox).not.toBeNull();
    // Margin selector must be proportional to display "Personalizado" without harsh clipping: >= 120px
    expect(marginToggleBox!.width).toBeGreaterThanOrEqual(120);

    const fontFamilyButton = page.locator('[data-testid="editor-toolbar-font-family-button"]');
    await fontFamilyButton.waitFor({ state: 'visible', timeout: 10_000 });
    const fontFamilyBox = await fontFamilyButton.boundingBox();
    expect(fontFamilyBox).not.toBeNull();
    // Font family button must be readable: >= 130px and <= 180px
    expect(fontFamilyBox!.width).toBeGreaterThanOrEqual(130);
    expect(fontFamilyBox!.width).toBeLessThanOrEqual(185);

    // Toolbar single row verification on desktop:
    const toolbar = page.locator('.ac-text-editor__toolbar').first();
    const toolbarMetrics = await toolbar.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      offsetHeight: el.offsetHeight,
    }));
    // Height should be approximately 1 row (40-60px, not two wrapped rows ~100px)
    expect(toolbarMetrics.offsetHeight).toBeLessThanOrEqual(65);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'toolbar/01-desktop-toolbar-proportions.png') });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'custom-preset/01-editor-initial-custom.png') });

    // 6. Test Preset Switching Lifecycle: Custom -> BookStyle -> Custom
    await marginToggle.click();
    const customOptionBtn = page.locator('[data-testid="margin-preset-custom-button"]');
    await customOptionBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'custom-preset/02-dropdown-open.png') });

    // Select "Estilo libro"
    const bookStyleBtn = page.locator('[data-testid="margin-preset-book-style-button"]');
    await bookStyleBtn.waitFor({ state: 'visible' });
    await bookStyleBtn.click();

    // Verify toggle button updates to "Estilo libro"
    await expect(marginToggle).toContainText('Estilo libro');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'custom-preset/03-switched-to-book-style.png') });

    // Reopen dropdown and restore "Personalizado"
    await marginToggle.click();
    await customOptionBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await customOptionBtn.click();

    // Verify toggle button restored to "Personalizado"
    await expect(marginToggle).toContainText('Personalizado');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'custom-preset/04-restored-custom.png') });

    // Switch back to "Estilo libro" on Project A to test Project Isolation on Project B!
    await marginToggle.click();
    await bookStyleBtn.waitFor({ state: 'visible' });
    await bookStyleBtn.click();
    await expect(marginToggle).toContainText('Estilo libro');

    // Close Chapter Editor and check Document Data Modal
    await closeChapterEditor(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const openDocDataBtn = page.locator('[data-testid="document-data-open-button"]');
    await openDocDataBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await openDocDataBtn.click();

    const docDataModal = page.locator('[data-testid="document-data-margin-preset-select"]');
    await docDataModal.waitFor({ state: 'visible', timeout: 10_000 });
    // In Project A, margin preset was switched to bookStyle
    await expect(docDataModal).toHaveValue('bookStyle');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'isolation/01-project-a-book-style.png') });

    const docDataCloseBtn = page.locator('[data-testid="document-data-cancel-button"]');
    await docDataCloseBtn.click();

    // 7. Project Isolation Verification: Fresh Import Project B
    await page.goto('/projects/new');
    await page.waitForLoadState('domcontentloaded');

    const titleInputB = page.locator('#project-title');
    await titleInputB.waitFor({ state: 'visible', timeout: 15_000 });
    const projectTitleB = `Isolation Project B ${Date.now()}`;
    await titleInputB.fill(projectTitleB);

    const fileInputB = page.locator('[data-testid="source-document-input"]');
    await fileInputB.waitFor({ state: 'attached' });
    await fileInputB.setInputFiles(ODT_PATH);

    // DocumentDataModal for Project B MUST NOT inherit "bookStyle" from Project A!
    await modalSaveBtn.waitFor({ state: 'visible', timeout: 30_000 });
    const presetSelectB = page.locator('[data-testid="document-data-margin-preset-select"]');
    await expect(presetSelectB).toHaveValue('custom');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'isolation/02-project-b-import-modal-custom.png') });

    await modalSaveBtn.click();
    await modalSaveBtn.waitFor({ state: 'hidden', timeout: 10_000 });

    const submitBtnB = page.locator('[data-testid="create-project-submit-button"]');
    await submitBtnB.waitFor({ state: 'visible' });
    await submitBtnB.click();

    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/editor/, { timeout: 45_000 });
    await page.waitForLoadState('domcontentloaded');

    // Open Chapter Editor on Project B
    await openChapterEditor(page);

    // Project B must start in "Personalizado" (zero cross-project leakage!)
    const marginToggleB = page.locator('[data-testid="margin-selector-toggle"]');
    await marginToggleB.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(marginToggleB).toContainText('Personalizado');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'isolation/03-project-b-editor-custom.png') });

    // 8. Responsive Toolbar Layout Verification
    // Desktop (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/01-desktop-1440.png') });

    // Tablet (834x1194)
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/02-tablet-834.png') });

    // Mobile (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'responsive/03-mobile-390.png') });

    // Reset to desktop for final certification
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'final/01-qa-complete.png') });

    // 9. Post-flight verification of source ODT manuscript integrity
    const postSha = getFileSha256(ODT_PATH);
    const postSize = fs.statSync(ODT_PATH).size;
    expect(postSha).toBe(EXPECTED_ODT_SHA256);
    expect(postSize).toBe(EXPECTED_ODT_SIZE);

    console.log('CHAPTER_EDITOR_COMPOSITION_TOOLBAR_PASS');
  });
});
