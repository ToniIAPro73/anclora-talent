import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Editable cover background image: select, move, scale, fit modes, reset, persistence, zoom. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-cover-background-image.spec.ts --reporter=list --workers=1

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover Bg Image QA ${Date.now()}`;
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
type Frame = { x: number; y: number; width: number; height: number; rotation: number } | null;
async function bg(page: Page): Promise<{ kind: string; fit?: string; frame?: Frame }> {
  return JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}');
}
const num = async (page: Page, testId: string) => Number(await page.getByTestId(testId).inputValue());
async function paperBox(page: Page) {
  return (await page.locator('.cover-canvas-paper canvas').last().boundingBox())!;
}
async function zoomFactor(page: Page) {
  const text = (await page.getByTestId('advanced-editor-zoom-value').textContent()) ?? '100%';
  return Number(text.replace('%', '')) / 100;
}

// A wide picture (1200x800) so Rellenar, Ajustar and Original all differ.
async function makeWidePng(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#d94f30');
    gradient.addColorStop(1, '#2a6fdb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);
    return canvas.toDataURL('image/png');
  });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function importAsBackground(page: Page) {
  const before = (await rowIds(page)).filter((id) => id !== 'background');
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: await makeWidePng(page) });
  await expect(page.getByTestId('image-layer-properties')).toBeVisible({ timeout: 15_000 });
  const imageId = (await rowIds(page)).find((id) => id !== 'background' && !before.includes(id))!;
  await page.getByTestId('image-layer-use-as-background').click();
  await expect(page.getByTestId('background-editor')).toBeVisible();
  expect(await rowIds(page)).not.toContain(imageId); // BG_17: structural, out of the normal z-order
  await expect(page.getByTestId('background-image-x-input')).toBeVisible({ timeout: 15_000 });
  return imageId;
}

test('A/G/H. use as background keeps it editable; click selects background, click on text selects text', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await importAsBackground(page);
  expect((await bg(page)).kind).toBe('image');
  // Wide image, Rellenar: height fills the cover, width overflows (X < 0).
  expect(await num(page, 'background-image-x-input')).toBeLessThan(0);

  // Pick a title position and click it: the layer above wins.
  const geometry = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry')) ?? '{}') as Record<string, { x: number; y: number; width: number; height: number }>;
  const titleId = Object.keys(geometry)[0];
  const box = await paperBox(page);
  const scale = box.width / 400;
  const g = geometry[titleId];
  await page.mouse.click(box.x + (g.x + g.width / 2) * scale, box.y + (g.y + g.height / 2) * scale);
  await expect(page.getByTestId('background-editor')).toHaveCount(0);
  await expect(page.getByTestId(`layer-row-${titleId}`)).toHaveAttribute('data-selected', 'true');

  // Click the top-right corner, where only the background is: the background is selected.
  await page.mouse.click(box.x + box.width - 8, box.y + 10);
  await expect(page.getByTestId('background-editor')).toBeVisible();
  await expect(page.getByTestId('layer-row-background')).toHaveAttribute('data-selected', 'true');
  // Background row stays last: text and layers are above it.
  const ids = await rowIds(page);
  expect(ids[ids.length - 1]).toBe('background');
});

test('B/C/D/E/I. drag moves it, scale changes framing, fit modes, reset recovers an off-canvas image', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await importAsBackground(page);
  const box = await paperBox(page);

  // Rellenar: 100%, X = -250 (900px wide image on a 400px cover).
  await page.getByTestId('background-image-fit-cover-button').click();
  expect(await num(page, 'background-image-x-input')).toBeCloseTo(-250, 0);

  // Drag (only the background is under the pointer there).
  const zoom = await zoomFactor(page);
  const startX = box.x + box.width - 8;
  const startY = box.y + 10;
  await page.mouse.move(startX, startY);
  await page.keyboard.down('Alt'); // Alt disables snapping so the delta is exact
  await page.mouse.down();
  await page.mouse.move(startX - 40, startY + 30, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Alt');
  await expect.poll(async () => (await bg(page)).frame?.x ?? 0).not.toBe(0);
  const moved = (await bg(page)).frame!;
  expect(moved.x).toBeCloseTo(-250 - 40 / zoom, 0);
  expect(moved.y).toBeCloseTo(30 / zoom, 0);

  // Free positioning: the panel can push it further out; the canvas does not clamp it.
  await page.getByTestId('background-image-x-input').fill('-400');
  await expect.poll(async () => (await bg(page)).frame?.x).toBe(-400);

  // Scale (aspect ratio preserved): +10 steps.
  const widthBefore = (await bg(page)).frame!.width;
  const heightBefore = (await bg(page)).frame!.height;
  await page.getByTestId('background-image-scale-slider').focus();
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await bg(page)).frame!.width).toBeGreaterThan(widthBefore);
  const scaled = (await bg(page)).frame!;
  expect(scaled.width / scaled.height).toBeCloseTo(widthBefore / heightBefore, 2);

  // Ajustar: whole image inside the cover (width 400, 44% of Rellenar).
  await page.getByTestId('background-image-fit-contain-button').click();
  expect((await bg(page)).fit).toBe('contain');
  await expect(page.getByTestId('background-image-scale-slider')).toHaveValue('44');
  expect(await num(page, 'background-image-x-input')).toBeCloseTo(0, 0);

  // Off the cover entirely -> hint -> Restablecer encuadre.
  await page.getByTestId('background-image-x-input').fill('2000');
  await expect(page.getByTestId('background-image-off-canvas-hint')).toBeVisible();
  await page.getByTestId('background-image-reset-button').click();
  await expect(page.getByTestId('background-image-off-canvas-hint')).toHaveCount(0);
  expect((await bg(page)).fit).toBe('cover');
  expect((await bg(page)).frame).toBeNull();
  expect(await num(page, 'background-image-x-input')).toBeCloseTo(-250, 0);
});

test('F. framing (move + scale) persists exactly through save and reload', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await importAsBackground(page);
  await page.getByTestId('background-image-x-input').fill('-120');
  await page.getByTestId('background-image-y-input').fill('30');
  await page.getByTestId('background-image-scale-slider').focus();
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await bg(page)).frame?.width).toBeGreaterThan(900);
  const before = (await bg(page)).frame!;
  await saved(page);

  await openCover(page);
  const after = (await bg(page)).frame!;
  expect(after).toEqual(before);
  await page.getByTestId('layer-select-background').click();
  expect(await num(page, 'background-image-x-input')).toBeCloseTo(before.x, 1);
  expect(await num(page, 'background-image-y-input')).toBeCloseTo(before.y, 1);
});

test('J. drag respects canvas zoom (no coordinate drift at a non-default zoom)', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await importAsBackground(page);
  await page.getByTestId('cover-canvas-zoom-out').click();
  await page.waitForTimeout(400);
  const zoom = await zoomFactor(page);
  expect(zoom).toBeLessThan(1);
  const box = await paperBox(page);
  const startX = box.x + box.width - 8;
  const startY = box.y + 10;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 30, startY, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await bg(page)).frame?.x ?? 0).not.toBe(0);
  const frame = (await bg(page)).frame!;
  expect(frame.x).toBeCloseTo(-250 - 30 / zoom, 0);
});

test('K. convert back to a normal image layer keeps the asset and framing', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await importAsBackground(page);
  await page.getByTestId('background-image-convert-button').click();
  await expect(page.getByTestId('image-layer-properties')).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await bg(page)).kind).toBe('solid');
  const ids = await rowIds(page);
  expect(ids[ids.length - 1]).toBe('background');
  expect(ids.length).toBeGreaterThan(4); // 3 text layers + the converted image + background row
});
