import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Contraportada: same workspace as Portada, independent surface state. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-backcover.spec.ts --reporter=list --workers=1

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Back Cover QA ${Date.now()}`;
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

async function gotoStep(page: Page, index: number) {
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(index)).toBeVisible({ timeout: 30_000 });
  for (let i = 1; i <= index && (await triggers.nth(index).isDisabled()); i += 1) await triggers.nth(i).click();
  await triggers.nth(index).click();
  await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]').or(page.getByTestId('cover-preview-paper').first())).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}
async function openBack(page: Page) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  await gotoStep(page, 3);
  await expect(page.locator('[data-testid="cover-studio-v2"][data-surface-kind="back-cover"]')).toBeVisible();
}
async function openFront(page: Page) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  await gotoStep(page, 2);
  await expect(page.locator('[data-testid="cover-studio-v2"][data-surface-kind="cover"]')).toBeVisible();
}
const saved = (page: Page) => expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
type Geometry = Record<string, { x: number; y: number; width: number; height: number }>;
const geometry = async (page: Page): Promise<Geometry> => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry')) ?? '{}');
const contents = async (page: Page): Promise<Record<string, string>> => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content')) ?? '{}');
const layerNames = (page: Page) => page.locator('[data-testid^="layer-name-"]').allTextContents();
const options = (page: Page) => page.locator('[data-testid="cover-template-select"] option:not([value=""])');
async function chooseTemplate(page: Page, index: number, accept = true) {
  const onDialog = (dialog: import('@playwright/test').Dialog) => void (accept ? dialog.accept() : dialog.dismiss());
  page.on('dialog', onDialog);
  try {
    const value = await options(page).nth(index).getAttribute('value');
    await page.getByTestId('cover-template-select').selectOption(value!);
    await page.waitForTimeout(800);
  } finally {
    page.off('dialog', onDialog);
  }
}

test('A/J. step 4 is the same workspace as Portada, with back-cover context labels', async ({ page }) => {
  test.setTimeout(150_000);
  await openBack(page);
  for (const id of ['cover-workspace-toolbar', 'advanced-editor-layers-column', 'advanced-editor-canvas-column', 'advanced-editor-properties-column', 'cover-template-select', 'advanced-editor-rulers-toggle', 'advanced-editor-bleed-toggle', 'advanced-editor-safe-area-toggle', 'cover-editor-import-button']) {
    await expect(page.getByTestId(id), id).toBeVisible();
  }
  await expect(page.getByTestId('cover-editor-preview-button')).toHaveCount(0);
  await expect(page.getByText('Lienzo de contraportada')).toBeVisible();
  await expect(page.getByText('Lienzo de portada')).toHaveCount(0);
  await expect(page.getByTestId('layer-name-background')).toHaveText('Fondo de contraportada');
  await page.getByTestId('layer-select-background').click();
  await expect(page.getByTestId('cover-properties-selection')).toContainText('Fondo de contraportada');
  // the back-cover template catalogue, not the front-cover one
  const values = await options(page).evaluateAll((els) => els.map((el) => el.getAttribute('value')));
  expect(values.length).toBeGreaterThanOrEqual(3);
  expect(values.every((value) => value?.startsWith('back-'))).toBe(true);
});

test('B. switching back-cover template keeps content, shows one template card and survives reload', async ({ page }) => {
  test.setTimeout(180_000);
  await openBack(page);
  await chooseTemplate(page, 0);
  const content = await contents(page);
  const first = await page.getByTestId('cover-template-select').inputValue();
  await expect(page.getByTestId('cover-template-active-card')).toHaveCount(1);
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', first);
  await expect(page.getByTestId('cover-templates-view-all-button')).toHaveCount(0);
  console.log('BACK CONTENT', JSON.stringify(content), JSON.stringify(await layerNames(page)));
  expect(Object.keys(content).length).toBeGreaterThanOrEqual(2); // title + body slots are materialized (never a blank canvas)

  await chooseTemplate(page, 1);
  const second = await page.getByTestId('cover-template-select').inputValue();
  expect(second).not.toBe(first);
  expect(await contents(page)).toEqual(content); // content stays, layout/style change
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', second);
  await saved(page);
  await openBack(page);
  expect(await page.getByTestId('cover-template-select').inputValue()).toBe(second);
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', second);
  expect(await contents(page)).toEqual(content);
});

test('C. editing the back-cover body: text, font, size and alignment persist; manual copy survives a template switch', async ({ page }) => {
  test.setTimeout(180_000);
  await openBack(page);
  await chooseTemplate(page, 0);
  const ids = Object.keys(await contents(page));
  const bodyId = ids.find((id) => id.endsWith('-body')) ?? ids[1];
  await page.getByTestId(`layer-select-${bodyId}`).click();
  await expect(page.getByTestId('text-layer-properties')).toBeVisible();
  const copyText = 'Un libro sobre atención.\nSegunda línea de la sinopsis.';
  await page.getByTestId('text-layer-content-input').fill(copyText);
  await page.getByTestId('text-layer-content-input').press('Tab');
  await page.getByTestId('text-layer-font-size-input').fill('19');
  await page.getByTestId('text-layer-align-center-button').click();
  await page.getByTestId('font-selector-toggle').click();
  await page.getByTestId('font-selector-search-input').fill('Lora');
  await page.getByTestId('font-option-lora').click();
  await expect(page.getByTestId('font-selector-toggle')).toContainText('Lora');
  await saved(page);

  await chooseTemplate(page, 1);
  expect((await contents(page))[bodyId]).toBe(copyText);
  await saved(page);

  await openBack(page);
  expect((await contents(page))[bodyId]).toBe(copyText);
  await page.getByTestId(`layer-select-${bodyId}`).click();
  await expect(page.getByTestId('text-layer-font-size-input')).toHaveValue('19');
  await expect(page.getByTestId('font-selector-toggle')).toContainText('Lora');
  await expect(page.getByTestId('text-layer-align-center-button')).toHaveAttribute('data-active', 'true');
});

test('D/F. images and multi-selection: move/resize/rotate, align, group, reload', async ({ page }) => {
  test.setTimeout(240_000);
  await openBack(page);
  await chooseTemplate(page, 0);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'author.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('image-layer-properties')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('image-layer-width-input').fill('90');
  await page.getByTestId('image-layer-height-input').fill('90');
  await page.getByTestId('image-layer-x-input').fill('40');
  await page.getByTestId('image-layer-y-input').fill('400');
  await page.getByTestId('image-layer-rotation-input').fill('15');
  await page.waitForTimeout(500);
  const before = await geometry(page);
  const imageId = Object.keys(before).find((id) => id.startsWith('image-'))!;
  expect(before[imageId]).toMatchObject({ x: 40, y: 400, width: 90, height: 90 });

  // multi-select the image and the title, align, group
  const titleId = Object.keys(before).find((id) => id.endsWith('-title'))!;
  await page.getByTestId(`layer-select-${imageId}`).click();
  await page.getByTestId(`layer-select-${titleId}`).click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('multi-selection-count')).toContainText('2');
  await page.getByTestId('multi-align-left').click();
  await page.getByTestId('multi-group-button').click();
  await expect(page.locator('[data-testid^="layer-group-"]:not([data-testid^="layer-group-select-"])')).toHaveCount(1);
  await page.waitForTimeout(500);
  const aligned = await geometry(page);
  expect(aligned[imageId].x).toBeCloseTo(aligned[titleId].x, 1);
  await saved(page);

  await openBack(page);
  await expect(page.locator('[data-testid^="layer-group-"]:not([data-testid^="layer-group-select-"])')).toHaveCount(1);
  const reloaded = await geometry(page);
  expect(reloaded[imageId]).toMatchObject({ x: aligned[imageId].x, y: aligned[imageId].y, width: 90, height: 90 });
  await page.getByTestId(`layer-select-${imageId}`).click();
  await page.getByTestId('multi-ungroup-button').click();
  await expect(page.locator('[data-testid^="layer-group-"]:not([data-testid^="layer-group-select-"])')).toHaveCount(0);
});

test('E. back-cover background image is editable, clipped and persists', async ({ page }) => {
  test.setTimeout(180_000);
  await openBack(page);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2a6fdb';
    ctx.fillRect(0, 0, 1200, 800);
    return canvas.toDataURL('image/png');
  });
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  await expect(page.getByTestId('image-layer-use-as-background')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('image-layer-use-as-background').click();
  await expect(page.getByTestId('background-image-x-input')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('background-image-x-input').fill('-90');
  await page.getByTestId('background-image-y-input').fill('20');
  await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}').frame?.x).toBe(-90);
  const bg = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}');
  const paper = (await page.locator('.cover-canvas-paper canvas').first().boundingBox())!;
  expect(paper.width / paper.height).toBeCloseTo(400 / 600, 2); // the canvas element is the clipping window
  await expect(page.getByTestId('background-image-center-button')).toHaveText('Centrar imagen');
  await expect(page.getByTestId('background-image-reset-button')).toHaveText('Restablecer fondo');
  await expect(page.getByTestId('background-image-convert-button')).toHaveText('Convertir en capa');
  await saved(page);
  await openBack(page);
  expect(JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}').frame).toEqual(bg.frame);
});

test('G. rulers, safe area and bleed are view-only overlays on the back cover', async ({ page }) => {
  test.setTimeout(150_000);
  await openBack(page);
  await chooseTemplate(page, 0);
  const before = await geometry(page);
  for (const id of ['advanced-editor-rulers-toggle', 'advanced-editor-safe-area-toggle', 'advanced-editor-bleed-toggle']) await page.getByTestId(id).click();
  await page.waitForTimeout(500);
  const box = (await page.locator('.cover-canvas-paper canvas').last().boundingBox())!;
  const ruler = (await page.getByTestId('canvas-ruler-horizontal').boundingBox())!;
  expect(Math.abs(ruler.x - box.x)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(ruler.width - box.width)).toBeLessThanOrEqual(1.5);
  const trim = (await page.getByTestId('canvas-bleed-trim').boundingBox())!;
  const safe = (await page.getByTestId('canvas-safe-area').boundingBox())!;
  expect(trim.x).toBeGreaterThan(box.x);
  expect(safe.x).toBeGreaterThan(trim.x);
  expect(await geometry(page)).toEqual(before);
});

test('H. front and back surfaces are saved independently', async ({ page }) => {
  test.setTimeout(240_000);
  await openFront(page);
  const frontBefore = await contents(page);
  const frontGeometry = await geometry(page);

  await gotoStep(page, 3);
  await expect(page.locator('[data-testid="cover-studio-v2"][data-surface-kind="back-cover"]')).toBeVisible();
  await chooseTemplate(page, 2);
  const backTemplate = await page.getByTestId('cover-template-select').inputValue();
  await page.getByTestId('cover-tool-button-shapes').click(); // a back-only object
  await page.waitForTimeout(700);
  const backGeometry = await geometry(page);
  await saved(page);

  // the front cover is untouched
  await gotoStep(page, 2);
  expect(await contents(page)).toEqual(frontBefore);
  expect(await geometry(page)).toEqual(frontGeometry);

  // edit the front differently, reload, both restore independently
  await chooseTemplate(page, 1);
  const frontTemplate = await page.getByTestId('cover-template-select').inputValue();
  expect(frontTemplate).not.toMatch(/-back$/);
  await saved(page);
  await openBack(page);
  expect(await page.getByTestId('cover-template-select').inputValue()).toBe(backTemplate);
  expect(await geometry(page)).toEqual(backGeometry);
  await openFront(page);
  expect(await page.getByTestId('cover-template-select').inputValue()).toBe(frontTemplate);
});
