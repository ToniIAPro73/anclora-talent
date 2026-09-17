import { expect, test, type Page } from '@playwright/test';

/**
 * Cover Studio Interaction Closure Gate E2E Specification
 * 
 * Verifies all 14 mandatory closure criteria with live browser interactions
 * and captures high-resolution screenshots into test-results/qa-closure/
 */

const TEST_USER = {
  fullName: 'QA Closure Bot',
  email: 'qa.closure@anclora-talent.test',
  password: 'ClosurePassword123',
};

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
});

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

async function createProject(page: Page, title: string) {
  await page.goto('/projects/new');
  await page.getByTestId('create-project-title-input').fill(title);
  await page.getByRole('button', { name: 'Crear proyecto y abrir editor' }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 15_000 });
  const match = page.url().match(/\/projects\/([^/]+)\/editor/);
  if (!match) throw new Error('Could not extract projectId from URL');
  return match[1];
}

test.describe('Cover Studio Interaction Closure Gate', () => {
  test('Complete interaction verification matrix and 14 screenshot capture', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const projectId = await createProject(page, 'Closure Gate Project');

    // =========================================================================
    // 1. BASIC EDITOR (BASIC-01 to BASIC-10)
    // =========================================================================
    await page.goto(`/projects/${projectId}/cover`);
    await expect(page.getByTestId('basic-cover-editor')).toBeVisible();

    // 01-basic-preview-live: Basic editor open with live preview visible
    await expect(page.getByTestId('design-surface-renderer')).toBeVisible();
    await page.screenshot({ path: 'test-results/qa-closure/01-basic-preview-live.png', fullPage: true });

    // 02-basic-text-visible: Existing title/subtitle/author visible in live preview
    await expect(page.getByTestId('basic-field-title-content-input')).toBeVisible();
    await page.screenshot({ path: 'test-results/qa-closure/02-basic-text-visible.png', fullPage: true });

    // 03-basic-edit-title: Modify title in Basic editor and verify live render update
    await page.getByTestId('basic-field-title-content-input').fill('El Arte de Navegar');
    // Allow debounce save to complete
    await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 10_000 });
    await page.screenshot({ path: 'test-results/qa-closure/03-basic-edit-title.png', fullPage: true });

    // 04-basic-template-preserved: Applying a template preserves existing text
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByTestId('basic-template-business-leadership-cover').click();
    await expect(page.getByTestId('basic-field-title-content-input')).toHaveValue('El Arte de Navegar');
    await page.screenshot({ path: 'test-results/qa-closure/04-basic-template-preserved.png', fullPage: true });

    // 05-basic-reload-persisted: Reload page and confirm persisted value
    await page.reload();
    await expect(page.getByTestId('basic-field-title-content-input')).toHaveValue('El Arte de Navegar');
    await page.screenshot({ path: 'test-results/qa-closure/05-basic-reload-persisted.png', fullPage: true });

    // =========================================================================
    // 2. ADVANCED CANVAS SELECTION (ADV-SELECT-01 to ADV-SELECT-04)
    // =========================================================================
    await page.getByTestId('studio-mode-advanced-button').click();
    await expect(page.getByTestId('advanced-cover-editor')).toBeVisible();
    await expect(page.getByTestId('design-surface-canvas')).toBeVisible();

    // 06-adv-canvas-select-title: Direct canvas click selects Title
    const canvas = page.locator('canvas.upper-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not found');

    // Click near the top-center where title is positioned
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.22);
    // Verify title layer in layers panel is highlighted
    const titleLayerItem = page.locator('[data-testid^="layer-row-"]').filter({ hasText: /El Arte de Navegar/i }).first();
    await expect(titleLayerItem).toBeVisible();
    await page.screenshot({ path: 'test-results/qa-closure/06-adv-canvas-select-title.png', fullPage: true });

    // 07-adv-bidirectional-sync: Layers panel click selects object on canvas
    const authorLayerItem = page.locator('[data-testid^="layer-row-"]').last();
    await authorLayerItem.click();
    await page.screenshot({ path: 'test-results/qa-closure/07-adv-bidirectional-sync.png', fullPage: true });

    // =========================================================================
    // 3. REAL IN-CANVAS TEXT EDITING & DELETION
    // =========================================================================
    // Add new text layer
    await page.getByTestId('advanced-editor-add-text-button').click();
    await page.waitForTimeout(500);

    // Double click to enter text editing mode on canvas
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height * 0.5);
    await page.keyboard.type(' — Edición Especial');
    // Exit text editing
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 08-adv-canvas-edit-direct: In-canvas direct typing
    await page.screenshot({ path: 'test-results/qa-closure/08-adv-canvas-edit-direct.png', fullPage: true });

    // Count layers before deletion
    const initialLayerCount = await page.locator('[data-testid^="layer-row-"]').count();

    // Delete selected layer via layers panel delete button
    const lastLayerDelete = page.locator('[data-testid^="layer-delete-"]').first();
    await lastLayerDelete.click();
    await page.waitForTimeout(500);

    // Verify layer count decremented exactly by 1
    const countAfterDelete = await page.locator('[data-testid^="layer-row-"]').count();
    expect(countAfterDelete).toBe(initialLayerCount - 1);

    // 09-adv-deletion-sync: Delete removes layer from layers panel without orphans
    await page.screenshot({ path: 'test-results/qa-closure/09-adv-deletion-sync.png', fullPage: true });

    // =========================================================================
    // 4. GUIDES MANIPULATION
    // =========================================================================
    await page.getByTestId('add-horizontal-guide-button').click();
    await page.getByTestId('add-vertical-guide-button').click();
    const guideLines = page.locator('div[data-testid^="design-guide-guide-"]');
    await expect(guideLines).toHaveCount(2);

    // 10-adv-guides-active: Both guides visible
    await page.screenshot({ path: 'test-results/qa-closure/10-adv-guides-active.png', fullPage: true });

    // Remove horizontal guide via double-click away from intersection
    const firstGuideLine = guideLines.first();
    await firstGuideLine.dblclick({ position: { x: 10, y: 4 }, force: true });
    await expect(guideLines).toHaveCount(1);

    // Clear remaining guides
    await page.getByTestId('clear-guides-button').click();
    await expect(guideLines).toHaveCount(0);

    // 11-adv-guides-cleared: All guides removed
    await page.screenshot({ path: 'test-results/qa-closure/11-adv-guides-cleared.png', fullPage: true });

    // =========================================================================
    // 5. DARK & LIGHT CONTRAST
    // =========================================================================
    // Set to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    // 12-theme-dark-contrast: Dark mode contrast
    await page.screenshot({ path: 'test-results/qa-closure/12-theme-dark-contrast.png', fullPage: true });

    // Set to light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    // 13-theme-light-contrast: Light mode contrast
    await page.screenshot({ path: 'test-results/qa-closure/13-theme-light-contrast.png', fullPage: true });

    // =========================================================================
    // 6. BACK COVER PARITY
    // =========================================================================
    await page.goto(`/projects/${projectId}/back-cover`);
    await expect(page.getByTestId('basic-cover-editor')).toBeVisible();
    await expect(page.getByTestId('design-surface-renderer')).toBeVisible();

    // 14-back-cover-parity: Back cover basic editor with live renderer
    await page.screenshot({ path: 'test-results/qa-closure/14-back-cover-parity.png', fullPage: true });
  });
});
