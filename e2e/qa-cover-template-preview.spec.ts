import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Single active template card + faithful (Fabric-rendered) cover preview. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-cover-template-preview.spec.ts --reporter=list --workers=1

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover Preview QA ${Date.now()}`;
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
const select = (page: Page) => page.getByTestId('cover-template-select');
const options = (page: Page) => page.locator('[data-testid="cover-template-select"] option:not([value=""])');

async function chooseTemplate(page: Page, index: number, accept = true) {
  const onDialog = (dialog: import('@playwright/test').Dialog) => void (accept ? dialog.accept() : dialog.dismiss());
  page.on('dialog', onDialog);
  try {
    const value = await options(page).nth(index).getAttribute('value');
    await select(page).selectOption(value!);
    await page.waitForTimeout(800);
  } finally {
    page.off('dialog', onDialog);
  }
}

type Live = Record<string, { x: number; y: number; width: number; height: number; rotation: number; fontSize?: number; fontFamily?: string; lines?: number }>;
const editorLive = async (page: Page): Promise<Live> => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-live-geometry')) ?? '{}');
async function previewLive(page: Page): Promise<Live> {
  await expect.poll(async () => Object.keys(JSON.parse((await page.getByTestId('cover-preview-paper').getAttribute('data-preview-geometry')) ?? '{}')).length).toBeGreaterThan(0);
  return JSON.parse((await page.getByTestId('cover-preview-paper').getAttribute('data-preview-geometry')) ?? '{}');
}
async function enterPreview(page: Page) {
  await page.getByTestId('cover-editor-preview-button').click();
  await expect(page.getByTestId('cover-preview-paper')).toBeVisible();
  await page.waitForTimeout(600);
}
const textIds = (live: Live) => Object.keys(live).filter((id) => live[id].fontSize !== undefined);

async function expectParity(editor: Live, preview: Live) {
  expect(Object.keys(preview).sort()).toEqual(Object.keys(editor).sort());
  for (const id of Object.keys(editor)) {
    const e = editor[id];
    const p = preview[id];
    // normalized to the 400x600 surface
    expect(Math.abs(e.x - p.x) / 400, `${id} x`).toBeLessThan(0.002);
    expect(Math.abs(e.y - p.y) / 600, `${id} y`).toBeLessThan(0.002);
    expect(Math.abs(e.width - p.width) / 400, `${id} width`).toBeLessThan(0.002);
    expect(Math.abs(e.height - p.height) / 600, `${id} height`).toBeLessThan(0.004);
    expect(e.rotation).toBeCloseTo(p.rotation, 1);
    expect(p.fontSize).toBe(e.fontSize);
    expect(p.fontFamily).toBe(e.fontFamily);
    expect(p.lines).toBe(e.lines);
  }
}

test('A/B/C. sidebar shows only the applied template; the top select drives it; cancel changes nothing', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await chooseTemplate(page, 0);
  const first = await select(page).inputValue();

  await expect(page.getByTestId('cover-template-active-card')).toHaveCount(1);
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', first);
  await expect(page.getByTestId('cover-templates-view-all-button')).toHaveCount(0);
  await expect(page.locator('[data-testid^="cover-template-card-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="cover-template-thumb-"]')).toHaveCount(1);
  // Larger than the old 84px miniature.
  expect((await page.locator('[data-testid^="cover-template-thumb-"]').boundingBox())!.width).toBeGreaterThanOrEqual(150);

  await chooseTemplate(page, 1);
  const second = await select(page).inputValue();
  expect(second).not.toBe(first);
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', second);
  await expect(page.locator('[data-testid^="cover-template-thumb-"]')).toHaveCount(1);

  const before = await editorLive(page);
  await chooseTemplate(page, 2, false); // cancel the confirmation
  expect(await select(page).inputValue()).toBe(second);
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', second);
  expect(await editorLive(page)).toEqual(before);
});

test('D/E/F/I. preview renders the same objects as the editor (geometry, wrap, fonts), is large and centred, and ignores editor zoom', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await chooseTemplate(page, 0);

  const editor100 = await editorLive(page);
  expect(textIds(editor100).length).toBeGreaterThanOrEqual(2); // visible text layers (this template hides the author)
  await enterPreview(page);

  const paper = (await page.getByTestId('cover-preview-paper').boundingBox())!;
  expect(paper.width / paper.height).toBeCloseTo(400 / 600, 2); // uniform scale, 2:3
  expect(paper.height).toBeGreaterThanOrEqual(430); // fills the stage instead of a 380px thumbnail
  const stage = (await page.getByTestId('cover-preview-surface').boundingBox())!;
  expect(Math.abs(paper.x + paper.width / 2 - (stage.x + stage.width / 2))).toBeLessThanOrEqual(2);

  const preview = await previewLive(page);
  await expectParity(editor100, preview);
  console.log('PARITY editor', JSON.stringify(editor100), 'preview', JSON.stringify(preview));

  // Title bottom must clear the subtitle top in the preview exactly when it does in the editor.
  const roleOrder = textIds(editor100).sort((a, b) => editor100[a].y - editor100[b].y);
  for (let i = 0; i < roleOrder.length - 1; i += 1) {
    const [upper, lower] = [roleOrder[i], roleOrder[i + 1]];
    const editorOverlaps = editor100[upper].y + editor100[upper].height > editor100[lower].y + 0.5;
    const previewOverlaps = preview[upper].y + preview[upper].height > preview[lower].y + 0.5;
    expect(previewOverlaps).toBe(editorOverlaps);
  }

  // Editor zoom is view state: change it, preview geometry is identical.
  await page.getByTestId('cover-editor-preview-exit-button').click();
  await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible();
  await page.getByTestId('cover-canvas-zoom-out').click();
  await page.waitForTimeout(400);
  const editorZoomed = await editorLive(page);
  await enterPreview(page);
  const previewZoomed = await previewLive(page);
  await expectParity(editorZoomed, previewZoomed);
  expect(previewZoomed).toEqual(preview);
});

test('G/image. a positioned image and a framed background image keep their geometry and framing in the preview', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await chooseTemplate(page, 0);

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  // portrait-like image layer, placed and sized through the inspector
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('image-layer-properties')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('image-layer-width-input').fill('120');
  await page.getByTestId('image-layer-height-input').fill('160');
  await page.getByTestId('image-layer-x-input').fill('140');
  await page.getByTestId('image-layer-y-input').fill('330');
  await page.waitForTimeout(500);
  // a second image becomes a framed background
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'bg.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('image-layer-use-as-background')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('image-layer-use-as-background').click();
  await expect(page.getByTestId('background-image-x-input')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('background-image-x-input').fill('-80');
  await page.getByTestId('background-image-y-input').fill('24');
  await page.waitForTimeout(500);

  const editorBackground = await page.getByTestId('design-surface-canvas').getAttribute('data-background');
  const editor = await editorLive(page);
  await enterPreview(page);
  const preview = await previewLive(page);
  await expectParity(editor, preview);
  const imageId = Object.keys(editor).find((id) => editor[id].fontSize === undefined)!;
  expect(preview[imageId]).toMatchObject({ x: 140, y: 330, width: 120, height: 160 });
  console.log('IMAGE editor', JSON.stringify(editor[imageId]), 'preview', JSON.stringify(preview[imageId]));

  const previewBackground = JSON.parse((await page.getByTestId('cover-preview-paper').getAttribute('data-background')) ?? '{}');
  const edBackground = JSON.parse(editorBackground ?? '{}');
  expect(previewBackground.kind).toBe('image');
  expect(previewBackground.frame).toEqual(edBackground.frame);
  expect(previewBackground.frame).toMatchObject({ x: -80, y: 24 });
});

test('H. template and geometry survive save and reload, in editor and preview', async ({ page }) => {
  test.setTimeout(180_000);
  await openCover(page);
  await chooseTemplate(page, 1);
  const chosen = await select(page).inputValue();
  const editor = await editorLive(page);
  await saved(page);

  await openCover(page);
  expect(await select(page).inputValue()).toBe(chosen);
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', chosen);
  await enterPreview(page);
  await expectParity(editor, await previewLive(page));
});
