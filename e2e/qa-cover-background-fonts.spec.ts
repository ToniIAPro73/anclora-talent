import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Cover font picker, background selection, background-image layering, inspector layout. Run alone:
//   npx playwright test e2e/qa-cover-background-fonts.spec.ts --reporter=list --workers=1
// Needs the local PostgreSQL development database.

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover Background QA ${Date.now()}`;
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
const rowIds = (page: Page) => page.locator('[data-testid^="layer-row-"]').evaluateAll((els) => els.map((el) => (el.getAttribute('data-testid') ?? '').replace('layer-row-', '')));
async function noOverflow(page: Page) {
  const body = page.locator('.cover-properties-body');
  const [sw, cw] = await body.evaluate((el) => [el.scrollWidth, el.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw + 1);
}

test('A. font picker is compact, scrolls to the last family, applies and persists', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])').first().click();
  await page.getByTestId('font-selector-toggle').click();

  const dropdown = page.getByTestId('font-selector-dropdown');
  await expect(dropdown).toBeVisible();
  const box = (await dropdown.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(345);
  const viewport = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  const catBox = (await page.getByTestId('font-selector-categories').boundingBox())!;
  expect(catBox.height).toBeLessThanOrEqual(40); // one compact row, never wrapped chips

  const list = page.getByTestId('font-selector-list');
  const reached = await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    const options = el.querySelectorAll('[role="option"]');
    const last = options[options.length - 1].getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return { atBottom: Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 1, lastVisible: last.bottom <= rect.bottom + 1 && last.top >= rect.top - 1, count: options.length };
  });
  expect(reached.count).toBeGreaterThan(20);
  expect(reached.atBottom).toBe(true);
  expect(reached.lastVisible).toBe(true);

  await page.getByTestId('font-selector-search-input').fill('Lora');
  const option = page.getByTestId('font-option-lora');
  await option.click();
  await expect(page.getByTestId('font-selector-toggle')).toContainText('Lora');
  await saved(page);

  await openCover(page);
  await page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])').first().click();
  await expect(page.getByTestId('font-selector-toggle')).toContainText('Lora');
});

test('B. cover background is selectable (layers row + empty canvas click), editable and persists', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);

  await page.getByTestId('layer-select-background').click();
  await expect(page.getByTestId('background-editor')).toBeVisible();
  await noOverflow(page);
  await page.getByTestId('background-kind-gradient-button').click();
  await expect(page.getByTestId('background-kind-gradient-button')).toHaveAttribute('data-active', 'true');
  await saved(page);

  // Select a text layer, then click empty cover area: the background returns.
  await page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])').first().click();
  await expect(page.getByTestId('background-editor')).toHaveCount(0);
  const canvas = page.locator('.cover-canvas-paper canvas').last();
  const cb = (await canvas.boundingBox())!;
  await page.mouse.click(cb.x + cb.width - 6, cb.y + cb.height - 6);
  await expect(page.getByTestId('background-editor')).toBeVisible();

  await openCover(page);
  await page.getByTestId('layer-select-background').click();
  await expect(page.getByTestId('background-kind-gradient-button')).toHaveAttribute('data-active', 'true');
});

test('C/D/E. imported image lands behind the text, layering actions reorder, order persists, panels do not overflow', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  const before = (await rowIds(page)).filter((id) => id !== 'background');

  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByTestId('image-layer-properties')).toBeVisible({ timeout: 15_000 });
  await noOverflow(page);

  let ids = await rowIds(page);
  const imageId = ids.find((id) => !before.includes(id))!;
  // Panel lists highest zIndex first: the imported image sits below every text layer, above the cover background.
  expect(ids[ids.length - 1]).toBe('background');
  expect(ids[ids.length - 2]).toBe(imageId);

  await page.getByTestId('image-layer-order-front').click();
  ids = await rowIds(page);
  expect(ids[0]).toBe(imageId);
  await saved(page);
  await openCover(page);
  expect((await rowIds(page))[0]).toBe(imageId); // order survives reload

  await page.getByTestId(`layer-select-${imageId}`).click();
  await page.getByTestId('image-layer-order-back').click();
  ids = await rowIds(page);
  expect(ids[ids.length - 2]).toBe(imageId);
  await page.getByTestId('image-layer-order-front').click();
  await page.getByTestId('image-layer-order-down').click();
  ids = await rowIds(page);
  expect(ids.indexOf(imageId)).toBe(1);

  await page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])').filter({ hasNot: page.locator(`[data-testid="layer-select-${imageId}"]`) }).first().click();
  await noOverflow(page);

  await page.getByTestId(`layer-select-${imageId}`).click();
  await page.getByTestId('image-layer-use-as-background').click();
  await expect(page.getByTestId('background-editor')).toBeVisible();
  expect(await rowIds(page)).not.toContain(imageId);
  await saved(page);
  await openCover(page);
  await page.getByTestId('layer-select-background').click();
  await expect(page.getByTestId('background-kind-image-button')).toHaveAttribute('data-active', 'true');
});
