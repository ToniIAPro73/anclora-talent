import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Cover 08B/08C: no editor preview, multi-select, groups, alignment, smart guides, rulers, safe area, bleed, imported cover.
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-cover-08bc.spec.ts --reporter=list --workers=1

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover 08BC QA ${Date.now()}`;
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
}
async function openCover(page: Page) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  await gotoStep(page, 2);
  await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800);
}
const saved = (page: Page) => expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
type Geometry = Record<string, { x: number; y: number; width: number; height: number }>;
const geometry = async (page: Page): Promise<Geometry> => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry')) ?? '{}');
const paperBox = async (page: Page) => (await page.locator('.cover-canvas-paper canvas').last().boundingBox())!;
const zoomOf = async (page: Page) => Number(((await page.getByTestId('advanced-editor-zoom-value').textContent()) ?? '100').replace('%', '')) / 100;
async function applyFirstTemplate(page: Page) {
  const onDialog = (dialog: import('@playwright/test').Dialog) => void dialog.accept();
  page.on('dialog', onDialog);
  try {
    const value = await page.locator('[data-testid="cover-template-select"] option:not([value=""])').nth(0).getAttribute('value');
    await page.getByTestId('cover-template-select').selectOption(value!);
    await page.waitForTimeout(800);
  } finally {
    page.off('dialog', onDialog);
  }
}
const layerButton = (page: Page, id: string) => page.getByTestId(`layer-select-${id}`);
const textIds = async (page: Page) => Object.keys(await geometry(page));

test('A. no preview action in Portada or Contraportada; step 5 is the single preview', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await expect(page.getByTestId('cover-editor-preview-button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^vista previa$/i }).filter({ has: page.locator('[data-testid="cover-editor-preview-button"]') })).toHaveCount(0);

  await gotoStep(page, 3); // Contraportada
  await expect(page.locator('[data-testid="advanced-cover-editor"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('cover-editor-preview-button')).toHaveCount(0);

  await gotoStep(page, 4); // Vista previa
  await expect(page.locator('.ac-stepper__trigger').nth(4)).toHaveAttribute('aria-current', /step|true/);
  await expect(page.getByTestId('cover-preview-paper').first()).toBeVisible({ timeout: 30_000 });
});

test('B/C/D/E. multi-select, group (move + reload), ungroup, alignment', async ({ page }) => {
  test.setTimeout(240_000);
  await openCover(page);
  await applyFirstTemplate(page);
  const ids = await textIds(page);
  expect(ids.length).toBeGreaterThanOrEqual(3);
  const [a, b, c] = ids;

  // multi-selection from the Layers panel
  await layerButton(page, a).click();
  await layerButton(page, b).click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('properties-panel-multi')).toBeVisible();
  await expect(page.getByTestId('multi-selection-count')).toContainText('2');

  // alignment: left edges of the selection coincide
  await page.getByTestId('multi-align-left').click();
  await page.waitForTimeout(500);
  const aligned = await geometry(page);
  expect(aligned[a].x).toBeCloseTo(aligned[b].x, 1);

  // group, then drag one member on the canvas: both move by the same delta
  await page.getByTestId('multi-group-button').click();
  await expect(page.locator('[data-testid^="layer-group-"]:not([data-testid^="layer-group-select-"])')).toHaveCount(1);
  const before = await geometry(page);
  const box = await paperBox(page);
  const scale = box.width / 400;
  const target = before[a];
  const startX = box.x + (target.x + target.width / 2) * scale;
  const startY = box.y + (target.y + 12) * scale;
  await page.mouse.move(startX, startY);
  await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY + 20, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(700);
  const after = await geometry(page);
  const dxA = after[a].x - before[a].x;
  const dyA = after[a].y - before[a].y;
  expect(Math.abs(dxA)).toBeGreaterThan(5);
  expect(after[b].x - before[b].x).toBeCloseTo(dxA, 1);
  expect(after[b].y - before[b].y).toBeCloseTo(dyA, 1);
  expect(after[c].x).toBeCloseTo(before[c].x, 1); // outside the group: untouched
  expect(after[a].width).toBeCloseTo(before[a].width, 1);
  expect(after[b].width).toBeCloseTo(before[b].width, 1);

  await saved(page);
  await openCover(page);
  await expect(page.locator('[data-testid^="layer-group-"]:not([data-testid^="layer-group-select-"])')).toHaveCount(1);
  const reloaded = await geometry(page);
  expect(reloaded[a].x).toBeCloseTo(after[a].x, 0);
  expect(reloaded[b].y).toBeCloseTo(after[b].y, 0);

  // ungroup keeps geometry
  await layerButton(page, a).click();
  await expect(page.getByTestId('multi-selection-count')).toContainText('2');
  await page.getByTestId('multi-ungroup-button').click();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-testid^="layer-group-"]:not([data-testid^="layer-group-select-"])')).toHaveCount(0);
  const ungrouped = await geometry(page);
  expect(ungrouped[a].x).toBeCloseTo(reloaded[a].x, 1);
  expect(ungrouped[b].y).toBeCloseTo(reloaded[b].y, 1);
});

test('F. smart guides: an object snaps to the cover centre unless snapping is bypassed', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await page.getByTestId('cover-tool-button-shapes').click();
  await page.waitForTimeout(700);
  const ids = await textIds(page);
  const shapeId = ids[ids.length - 1];
  const start = (await geometry(page))[shapeId];
  expect(start.x + start.width / 2).toBeCloseTo(200, 0);
  const box = await paperBox(page);
  const scale = box.width / 400;
  const cx = box.x + (start.x + start.width / 2) * scale;
  const cy = box.y + (start.y + start.height / 2) * scale;

  // 3 logical px off the centre: the engine pulls it back onto x = 200
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 3 * scale, cy, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const snapped = (await geometry(page))[shapeId];
  expect(snapped.x + snapped.width / 2).toBeCloseTo(200, 0);

  // Alt bypasses snapping: the same gesture lands off-centre
  await page.mouse.move(cx, cy);
  await page.keyboard.down('Alt');
  await page.mouse.down();
  await page.mouse.move(cx + 3 * scale, cy, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await page.waitForTimeout(500);
  const free = (await geometry(page))[shapeId];
  expect(Math.abs(free.x + free.width / 2 - 200)).toBeGreaterThan(1);
});

test('G/H/I. rulers, safe area and bleed are view-only overlays aligned to the cover', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await applyFirstTemplate(page);
  const geometryBefore = await geometry(page);

  await page.getByTestId('advanced-editor-rulers-toggle').click();
  await page.getByTestId('advanced-editor-safe-area-toggle').click();
  await page.getByTestId('advanced-editor-bleed-toggle').click();
  await page.waitForTimeout(500);

  const zoom = await zoomOf(page);
  const box = await paperBox(page);
  const horizontal = (await page.getByTestId('canvas-ruler-horizontal').boundingBox())!;
  const vertical = (await page.getByTestId('canvas-ruler-vertical').boundingBox())!;
  // ruler 0 coincides with the paper's top-left corner and spans exactly the paper
  expect(Math.abs(horizontal.x - box.x)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(horizontal.width - box.width)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(horizontal.y + horizontal.height - box.y)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(vertical.y - box.y)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(vertical.height - box.height)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(vertical.x + vertical.width - box.x)).toBeLessThanOrEqual(1.5);
  const step = Number(await page.getByTestId('canvas-rulers').getAttribute('data-ruler-step'));
  expect(step * zoom).toBeGreaterThanOrEqual(47);

  // zoom change: ruler follows the paper and keeps a readable step
  await page.getByTestId('cover-canvas-zoom-out').click();
  await page.waitForTimeout(500);
  const zoom2 = await zoomOf(page);
  expect(zoom2).toBeLessThan(zoom);
  const box2 = await paperBox(page);
  const horizontal2 = (await page.getByTestId('canvas-ruler-horizontal').boundingBox())!;
  expect(Math.abs(horizontal2.width - box2.width)).toBeLessThanOrEqual(1.5);
  expect(Number(await page.getByTestId('canvas-rulers').getAttribute('data-ruler-step')) * zoom2).toBeGreaterThanOrEqual(47);

  // bleed: trim line sits 3mm (400/152.4 px per mm) inside the paper edge
  const trim = (await page.getByTestId('canvas-bleed-trim').boundingBox())!;
  const bleedPx = (3 * 400) / 152.4;
  expect(Math.abs(trim.x - box2.x - bleedPx * zoom2)).toBeLessThanOrEqual(2);
  expect(Math.abs(trim.y - box2.y - bleedPx * zoom2)).toBeLessThanOrEqual(2);
  // safe area: inside the trim line
  const safe = (await page.getByTestId('canvas-safe-area').boundingBox())!;
  expect(safe.x).toBeGreaterThan(trim.x);
  expect(safe.y).toBeGreaterThan(trim.y);

  // non-destructive: no object moved, overlays are DOM (not part of the Fabric canvas)
  expect(await geometry(page)).toEqual(geometryBefore);
  expect(await page.locator('.cover-canvas-paper canvas').evaluateAll((els) => els.every((el) => !el.closest('[data-testid="canvas-bleed-trim"]')))).toBe(true);

  await page.getByTestId('advanced-editor-rulers-toggle').click();
  await expect(page.getByTestId('canvas-rulers')).toHaveCount(0);
  await page.getByTestId('advanced-editor-bleed-toggle').click();
  await expect(page.getByTestId('canvas-bleed-trim')).toHaveCount(0);
});

test('J. imported full cover stays an editable framed background and persists', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2a6fdb';
    ctx.fillRect(0, 0, 1200, 1800);
    return canvas.toDataURL('image/png');
  });
  await page.getByTestId('cover-editor-import-file-input').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  await page.getByTestId('layer-select-background').click();
  await expect(page.getByTestId('background-image-x-input')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('background-image-scale-slider').focus();
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('ArrowRight');
  await page.getByTestId('background-image-x-input').fill('-60');
  await page.getByTestId('background-image-y-input').fill('-40');
  await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}').frame?.x).toBe(-60);
  const frame = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}').frame;
  expect(frame.width).toBeGreaterThan(400); // scaled above Rellenar: overflow is clipped by the cover
  const paper = await paperBox(page);
  const canvasBox = (await page.locator('.cover-canvas-paper canvas').first().boundingBox())!;
  expect(canvasBox.width).toBeLessThanOrEqual(paper.width + 1); // the canvas element is the clipping window
  await saved(page);

  await openCover(page);
  const reloaded = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}');
  expect(reloaded.frame).toEqual(frame);
});
