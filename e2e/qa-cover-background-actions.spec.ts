import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Background inspector actions: labels, fit/proportion of the buttons, and behaviour. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-cover-background-actions.spec.ts --reporter=list --workers=1

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover Bg Actions QA ${Date.now()}`;
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
type Frame = { x: number; y: number; width: number; height: number; rotation: number };
const background = async (page: Page): Promise<{ kind: string; fit?: string; opacity?: number; frame?: Frame | null }> =>
  JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-background')) ?? '{}');
const num = async (page: Page, testId: string) => Number(await page.getByTestId(testId).inputValue());

async function backgroundWithImage(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2a6fdb';
    ctx.fillRect(0, 0, 1200, 800);
    return canvas.toDataURL('image/png');
  });
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  await expect(page.getByTestId('image-layer-use-as-background')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('image-layer-use-as-background').click();
  await expect(page.getByTestId('background-image-x-input')).toBeVisible({ timeout: 15_000 });
}

const ACTIONS = [
  ['background-image-center-button', 'Centrar imagen'],
  ['background-image-reset-button', 'Restablecer fondo'],
  ['background-image-convert-button', 'Convertir en capa'],
] as const;

async function measure(page: Page, testId: string) {
  return page.getByTestId(testId).evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const text = range.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      width: box.width,
      height: box.height,
      textWidth: text.width,
      freeLeft: text.left - box.left,
      freeRight: box.right - text.right,
      fontSize: parseFloat(style.fontSize),
      lines: range.getClientRects().length,
      overflow: el.scrollWidth > el.clientWidth + 0.5,
      whiteSpace: style.whiteSpace,
    };
  });
}

test('labels, fit and proportions of the three actions at the real panel width, at two zooms', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await backgroundWithImage(page);

  const panel = page.locator('.cover-properties-body');
  const widths: Record<string, number> = {};
  for (const zoomSteps of [0, 1]) {
    if (zoomSteps) {
      await page.getByTestId('cover-canvas-zoom-out').click();
      await page.waitForTimeout(400);
    }
    for (const [testId, label] of ACTIONS) {
      const button = page.getByTestId(testId);
      await expect(button).toBeVisible();
      await expect(button).toHaveText(label);
      await expect(button).toHaveAttribute('title', /.{20,}/);
      const m = await measure(page, testId);
      console.log('MEASURE', testId, JSON.stringify(m));
      expect(m.lines, `${label} on one line`).toBe(1);
      expect(m.overflow, `${label} not clipped`).toBe(false);
      expect(m.whiteSpace).toBe('nowrap');
      expect(m.height).toBeGreaterThanOrEqual(28);
      expect(m.height).toBeLessThanOrEqual(30);
      expect(m.fontSize).toBeGreaterThanOrEqual(11);
      expect(m.fontSize).toBeLessThanOrEqual(12);
      expect(m.freeLeft, `${label} left padding`).toBeGreaterThanOrEqual(10);
      expect(m.freeRight, `${label} right padding`).toBeGreaterThanOrEqual(10);
      expect(m.textWidth / m.width).toBeLessThan(0.85);
      expect(m.textWidth / m.width).toBeGreaterThan(0.5);
      if (zoomSteps === 0) widths[testId] = m.width;
      else expect(Math.abs(m.width - widths[testId]), 'editor zoom does not change inspector geometry').toBeLessThanOrEqual(0.5);
    }
    const [sw, cw] = await panel.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(sw).toBeLessThanOrEqual(cw + 1);
  }

  const center = (await page.getByTestId('background-image-center-button').boundingBox())!;
  const reset = (await page.getByTestId('background-image-reset-button').boundingBox())!;
  const convert = (await page.getByTestId('background-image-convert-button').boundingBox())!;
  expect(Math.abs(center.y - reset.y)).toBeLessThanOrEqual(1);
  expect(center.x + center.width).toBeLessThan(reset.x);
  expect(convert.y).toBeGreaterThan(center.y + center.height + 20);
  await expect(page.getByTestId('background-image-layer-section').getByTestId('background-image-convert-button')).toBeVisible();
  await expect(page.getByTestId('background-image-framing-actions').getByTestId('background-image-convert-button')).toHaveCount(0);
});

test('Centrar imagen only moves the image: scale and rotation are kept', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await backgroundWithImage(page);
  await page.getByTestId('background-image-scale-slider').focus();
  for (let i = 0; i < 15; i += 1) await page.keyboard.press('ArrowRight');
  await page.getByTestId('background-image-rotation-input').fill('12');
  await page.getByTestId('background-image-x-input').fill('-500');
  await page.getByTestId('background-image-y-input').fill('90');
  await expect.poll(async () => (await background(page)).frame?.x).toBe(-500);
  const before = (await background(page)).frame!;

  await page.getByTestId('background-image-center-button').click();
  await expect.poll(async () => (await background(page)).frame?.x).not.toBe(-500);
  const after = (await background(page)).frame!;
  expect(after.width).toBeCloseTo(before.width, 1);
  expect(after.height).toBeCloseTo(before.height, 1);
  expect(after.rotation).toBe(12);
  expect(after.x).toBeCloseTo((400 - before.width) / 2, 1);
  expect(after.y).toBeCloseTo((600 - before.height) / 2, 1);
});

test('Restablecer fondo restores position, scale and rotation to Rellenar; opacity is kept', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await backgroundWithImage(page);
  await page.getByTestId('background-image-fit-contain-button').click();
  await page.getByTestId('background-image-rotation-input').fill('20');
  await page.getByTestId('background-image-x-input').fill('-150');
  await page.getByTestId('background-image-scale-slider').focus();
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');
  await page.getByTestId('background-image-opacity-slider').focus();
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('ArrowLeft');
  const opacity = (await background(page)).opacity!;
  expect(opacity).toBeLessThan(1);

  await page.getByTestId('background-image-reset-button').click();
  await expect.poll(async () => (await background(page)).frame).toBeNull();
  const reset = await background(page);
  expect(reset.fit).toBe('cover');
  expect(reset.opacity).toBe(opacity);
  expect(await num(page, 'background-image-rotation-input')).toBe(0);
  expect(await num(page, 'background-image-x-input')).toBeCloseTo(-250, 0);
  await expect(page.getByTestId('background-image-scale-slider')).toHaveValue('100');
});

test('Convertir en capa creates a normal image layer with the same framing, and survives save and reload', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await backgroundWithImage(page);
  await page.getByTestId('background-image-x-input').fill('-120');
  await page.getByTestId('background-image-y-input').fill('30');
  await expect.poll(async () => (await background(page)).frame?.x).toBe(-120);
  const frame = (await background(page)).frame!;
  const idsBefore = (await page.getByTestId('design-surface-canvas').getAttribute('data-object-ids'))!.split(',').filter(Boolean);

  await page.getByTestId('background-image-convert-button').click();
  await expect(page.getByTestId('image-layer-properties')).toBeVisible({ timeout: 15_000 });
  expect((await background(page)).kind).toBe('solid');
  const idsAfter = (await page.getByTestId('design-surface-canvas').getAttribute('data-object-ids'))!.split(',').filter(Boolean);
  const layerId = idsAfter.find((id) => !idsBefore.includes(id))!;
  expect(layerId).toBeTruthy();
  const geometry = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry')) ?? '{}');
  expect(geometry[layerId]).toMatchObject({ x: frame.x, y: frame.y });
  expect(geometry[layerId].width).toBeCloseTo(frame.width, 1);
  expect(geometry[layerId].height).toBeCloseTo(frame.height, 1);

  const rows = await page.locator('[data-testid^="layer-row-"]').evaluateAll((els) => els.map((el) => (el.getAttribute('data-testid') ?? '').replace('layer-row-', '')));
  expect(rows[rows.length - 1]).toBe('background');
  expect(rows[rows.length - 2]).toBe(layerId);
  await expect(page.getByTestId('image-layer-order-front')).toBeVisible();

  await saved(page);
  await openCover(page);
  expect((await background(page)).kind).toBe('solid');
  const reloaded = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry')) ?? '{}');
  expect(reloaded[layerId]).toMatchObject({ x: frame.x, y: frame.y });
});
