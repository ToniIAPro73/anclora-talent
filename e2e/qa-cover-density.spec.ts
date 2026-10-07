import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Cover editor control density + font picker. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-cover-density.spec.ts --reporter=list --workers=1

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover Density QA ${Date.now()}`;
  projectId = await importFreshProject(page, projectTitle);
  await page.close();
});
test.afterAll(async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  await deleteProjectByTitle(page, projectTitle).catch(() => undefined);
  await page.close();
});

async function openCover(page: Page) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(2)).toBeVisible({ timeout: 30_000 });
  if (await triggers.nth(2).isDisabled()) await triggers.nth(1).click();
  await triggers.nth(2).click();
  await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}
const saved = (page: Page) => expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
const near = (value: number, target: number, tolerance = 2) => expect(Math.abs(value - target), `${value} ≈ ${target}`).toBeLessThanOrEqual(tolerance);
const heightOf = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!.height;

async function expectInspectorDense(page: Page) {
  const body = page.locator('.cover-properties-body');
  const [sw, cw] = await body.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(sw, 'no horizontal overflow').toBeLessThanOrEqual(cw + 1);
  const summaries = await page.locator('.cover-prop-section__summary').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(summaries.length).toBeGreaterThan(0);
  for (const height of summaries) near(height, 28);
  // Property actions are compact: never taller than 30px, never a full-width banner.
  const buttons = await page.locator('.cover-properties-body .cover-prop-button').evaluateAll((els) =>
    els.map((el) => ({ h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width, inGrid: Boolean(el.closest('.cover-prop-grid')) })),
  );
  const bodyWidth = cw;
  for (const button of buttons) {
    expect(button.h).toBeLessThanOrEqual(30);
    if (!button.inGrid) expect(button.w).toBeLessThan(bodyWidth * 0.75);
  }
}

test('A/B. left tools, import control and toolbar are dense', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);
  const tools = await page.locator('.cover-editor-tool').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(tools.length).toBe(7);
  for (const height of tools) near(height, 32);
  near(await heightOf(page, '[data-testid="cover-editor-import-button"]'), 32);
  near(await heightOf(page, '.cover-workspace-toolbar'), 44, 3);
  const controls = await page.locator('.cover-workspace-toolbar .cover-toolbar-button, .cover-workspace-toolbar .cover-workspace-toolbar__select').evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().height > 0).map((el) => el.getBoundingClientRect().height),
  );
  expect(controls.length).toBeGreaterThan(0);
  for (const height of controls) near(height, 30);
  const body = page.locator('.cover-tools-panel');
  const [sw, cw] = await body.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw + 1);
});

test('C. inspectors (text, shape, image, background) are compact with no horizontal overflow', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);

  // text
  await page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])').first().click();
  await expect(page.getByTestId('text-layer-properties')).toBeVisible();
  await expectInspectorDense(page);

  // shape
  await page.getByTestId('cover-tool-button-shapes').click();
  await expect(page.getByTestId('shape-layer-properties')).toBeVisible();
  await expectInspectorDense(page);

  // image (Sustituir imagen / Orden / Usar como fondo)
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('image-layer-properties')).toBeVisible({ timeout: 15_000 });
  await expectInspectorDense(page);
  for (const id of ['image-layer-replace-button', 'image-layer-use-as-background', 'image-layer-order-front', 'image-layer-order-up', 'image-layer-order-down', 'image-layer-order-back']) {
    near(await heightOf(page, `[data-testid="${id}"]`), 28);
  }
  const replace = (await page.getByTestId('image-layer-replace-button').boundingBox())!;
  const bodyBox = (await page.locator('.cover-properties-body').boundingBox())!;
  expect(replace.width, '"Sustituir imagen" is not a full-width banner').toBeLessThan(bodyBox.width * 0.6);

  // background (image mode shows the asset picker + framing)
  await page.getByTestId('image-layer-use-as-background').click();
  await expect(page.getByTestId('background-editor')).toBeVisible();
  await expect(page.getByTestId('background-image-upload-button')).toBeVisible();
  await expectInspectorDense(page);
  near(await heightOf(page, '[data-testid="background-image-upload-button"]'), 28);
  const pick = (await page.getByTestId('background-image-upload-button').boundingBox())!;
  expect(pick.width).toBeLessThan(bodyBox.width * 0.6);

  // layer rows
  const rows = await page.locator('[data-testid^="layer-row-"]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  for (const height of rows) near(height, 30, 1);
});

test('D. font picker: bounded, compact, scrollable to the last family, keyboard, quoting, persistence', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])').first().click();
  await page.getByTestId('font-selector-toggle').click();

  const dropdown = page.getByTestId('font-selector-dropdown');
  await expect(dropdown).toBeVisible();
  const box = (await dropdown.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(255);
  expect(box.width).toBeLessThanOrEqual(330);
  expect(box.height).toBeLessThanOrEqual(385);
  const viewport = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  await expect(page.getByTestId('font-selector-search-input')).toBeVisible();
  expect((await page.getByTestId('font-selector-categories').boundingBox())!.height).toBeLessThanOrEqual(40);

  // Search + header stay put while only the list scrolls.
  const searchBefore = (await page.getByTestId('font-selector-search-input').boundingBox())!;
  const list = page.getByTestId('font-selector-list');
  const last = await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    const options = [...el.querySelectorAll<HTMLElement>('[role="option"]')];
    const lastOption = options[options.length - 1];
    const rect = lastOption.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return { testId: lastOption.getAttribute('data-testid'), visible: rect.bottom <= box.bottom + 1 && rect.top >= box.top - 1, count: options.length, text: lastOption.textContent };
  });
  expect(last.visible).toBe(true);
  const searchAfter = (await page.getByTestId('font-selector-search-input').boundingBox())!;
  expect(searchAfter.y).toBe(searchBefore.y);
  // The last registry family is reachable AND selectable.
  await page.getByTestId(last.testId!).click();
  await expect(page.getByTestId('font-selector-toggle')).toContainText((last.text ?? '').replace(/(serif|sans-serif|display|handwriting|monospace|system)$/i, '').trim().slice(0, 6));

  // Keyboard: search, ArrowDown, Enter; Escape closes.
  await page.getByTestId('font-selector-toggle').click();
  await page.getByTestId('font-selector-search-input').fill('Source Serif');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('font-selector-toggle')).toContainText('Source Serif 4');
  await page.getByTestId('font-selector-toggle').click();
  await page.keyboard.press('Escape');
  await expect(dropdown).toHaveCount(0);

  // Quoting: names with digits must resolve (the unquoted declaration is dropped by browsers).
  const triggerFamily = await page.getByTestId('font-selector-toggle').locator('span').first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(triggerFamily).toContain('Source Serif 4');
  await page.getByTestId('font-selector-toggle').click();
  await page.getByTestId('font-selector-search-input').fill('Source Sans');
  const option = page.getByTestId('font-option-source-sans-3');
  expect(await option.locator('span').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Source Sans 3');
  await option.click();
  await expect(page.getByTestId('font-selector-toggle')).toContainText('Source Sans 3');
  await saved(page);

  await openCover(page);
  await page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])').first().click();
  await expect(page.getByTestId('font-selector-toggle')).toContainText('Source Sans 3');
});
