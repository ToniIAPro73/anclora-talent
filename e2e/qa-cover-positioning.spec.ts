import { expect, test, type Page } from '@playwright/test';
import { PNG, deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Cover (Portada) positioning gates. Run alone:
//   npx playwright test e2e/qa-cover-positioning.spec.ts --reporter=list --workers=1
// Needs the local PostgreSQL development database (see .anclora/PRODUCTION_RUNTIME.md).

const TITLE = 'migrated-cover-title';
const SUBTITLE = 'migrated-cover-subtitle';
const AUTHOR = 'migrated-cover-author';

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover Positioning QA ${Date.now()}`;
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

type Box = { x: number; y: number; width: number; height: number };

async function openCover(page: Page) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(2)).toBeVisible({ timeout: 30_000 });
  if (await triggers.nth(2).isDisabled()) await triggers.nth(1).click();
  await triggers.nth(2).click();
  await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(800); // auto-fit settles
}

async function geometry(page: Page): Promise<Record<string, Box>> {
  const raw = await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry');
  return JSON.parse(raw ?? '{}') as Record<string, Box>;
}

async function setSnap(page: Page, enabled: boolean) {
  const toggle = page.getByTestId('advanced-editor-snap-toggle');
  if (((await toggle.getAttribute('data-active')) === 'true') !== enabled) await toggle.click();
}

/** Drag a layer by (dx, dy) in CANVAS pixels, converting through the current zoom. */
async function dragLayer(page: Page, id: string, dx: number, dy: number) {
  const g = (await geometry(page))[id];
  const canvasBox = (await page.locator('[data-testid="design-surface-canvas"] canvas').first().boundingBox())!;
  const zoom = Number.parseInt((await page.getByTestId('advanced-editor-zoom-value').textContent()) ?? '100', 10) / 100;
  const startX = canvasBox.x + (g.x + g.width / 2) * zoom;
  const startY = canvasBox.y + (g.y + Math.min(g.height / 2, 14)) * zoom;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const steps = 6;
  for (let i = 1; i <= steps; i += 1) await page.mouse.move(startX + (dx * zoom * i) / steps, startY + (dy * zoom * i) / steps);
  await page.mouse.up();
  await page.waitForTimeout(250);
}

const near = (value: number, expected: number, tolerance = 1.5) => expect(Math.abs(value - expected)).toBeLessThanOrEqual(tolerance);

test('A. a text layer moves freely in X and Y, in both directions', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);
  await setSnap(page, false);

  const start = (await geometry(page))[TITLE];
  await dragLayer(page, TITLE, -60, -40);
  const first = (await geometry(page))[TITLE];
  near(first.x, start.x - 60);
  near(first.y, start.y - 40);

  await dragLayer(page, TITLE, 90, 70);
  const second = (await geometry(page))[TITLE];
  near(second.x, first.x + 90);
  near(second.y, first.y + 70);
});

test('B. moving the Subtitle never repositions the Title', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);
  await setSnap(page, false);

  await dragLayer(page, TITLE, -20, -60);
  const title = (await geometry(page))[TITLE];

  await dragLayer(page, SUBTITLE, 40, -50);
  const after = await geometry(page);
  expect(after[TITLE].x).toBe(title.x);
  expect(after[TITLE].y).toBe(title.y);
});

test('C. moving the Author leaves Title and Subtitle exactly where they were', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);
  await setSnap(page, false);

  // The author is empty (hidden) in a fresh import: give it text and show it, as a user would.
  await page.getByTestId(`layer-select-${AUTHOR}`).click();
  await page.getByTestId('text-layer-content-input').fill('María Vega');
  await page.getByTestId(`layer-visibility-${AUTHOR}`).click();
  await page.waitForTimeout(500);

  const before = await geometry(page);
  await dragLayer(page, AUTHOR, 25, -30);
  const after = await geometry(page);
  for (const id of [TITLE, SUBTITLE]) {
    expect(after[id].x).toBe(before[id].x);
    expect(after[id].y).toBe(before[id].y);
  }
  expect(after[AUTHOR].x).not.toBe(before[AUTHOR].x);
});

test('D. moving an image does not move any text layer', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);
  await setSnap(page, false);

  const textBefore = await geometry(page);
  await page.getByTestId('advanced-editor-image-file-input').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: PNG });
  await expect.poll(async () => Object.keys(await geometry(page)).length).toBe(Object.keys(textBefore).length + 1);
  const withImage = await geometry(page);
  const imageId = Object.keys(withImage).find((id) => !(id in textBefore))!;

  const imageStart = withImage[imageId];
  await dragLayer(page, imageId, 20, 30);
  const after = await geometry(page);
  near(after[imageId].x, imageStart.x + 20);
  near(after[imageId].y, imageStart.y + 30);
  for (const id of [TITLE, SUBTITLE, AUTHOR]) {
    expect(after[id].x).toBe(textBefore[id].x);
    expect(after[id].y).toBe(textBefore[id].y);
  }
});

test('E. positions of all three text layers survive autosave and reload', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await setSnap(page, false);

  await dragLayer(page, TITLE, -30, -70);
  await dragLayer(page, SUBTITLE, 45, -20);
  await dragLayer(page, AUTHOR, -15, -35);
  const moved = await geometry(page);

  await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 15_000 });
  await page.reload();
  await openCover(page);

  const reloaded = await geometry(page);
  for (const id of [TITLE, SUBTITLE, AUTHOR]) {
    near(reloaded[id].x, moved[id].x, 0.5);
    near(reloaded[id].y, moved[id].y, 0.5);
  }
});

test('F. editing X/Y in the properties form changes only the selected layer, and the canvas follows', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);

  const before = await geometry(page);
  await page.getByTestId(`layer-select-${TITLE}`).click();
  await page.getByTestId('text-layer-x-input').fill('-25');
  await page.getByTestId('text-layer-x-input').press('Tab');
  await expect.poll(async () => (await geometry(page))[TITLE].x).toBe(-25);
  await page.getByTestId('text-layer-y-input').fill('60');
  await page.getByTestId('text-layer-y-input').press('Tab');
  await expect.poll(async () => (await geometry(page))[TITLE].y).toBe(60);

  const after = await geometry(page);
  for (const id of [SUBTITLE, AUTHOR]) {
    expect(after[id].x).toBe(before[id].x);
    expect(after[id].y).toBe(before[id].y);
  }

  // drag afterwards and the form follows the canvas (single source of truth)
  await setSnap(page, false);
  await dragLayer(page, TITLE, 10, 0);
  const dragged = (await geometry(page))[TITLE];
  near(dragged.x, -15);
  near(Number(await page.getByTestId('text-layer-x-input').inputValue()), dragged.x, 1);
});

test('G. centre snap changes only the snapped axis (X snaps, Y is not reset)', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);
  await setSnap(page, true);

  // Centre the Title horizontally through the form (earlier tests left it elsewhere), then nudge it:
  // a small sideways move must snap back to centre while the vertical move is preserved.
  await page.getByTestId(`layer-select-${TITLE}`).click();
  const width = (await geometry(page))[TITLE].width;
  await page.getByTestId('text-layer-x-input').fill(String((400 - width) / 2));
  await page.getByTestId('text-layer-x-input').press('Tab');
  await page.getByTestId('text-layer-y-input').fill('143');
  await page.getByTestId('text-layer-y-input').press('Tab');
  await expect.poll(async () => (await geometry(page))[TITLE].y).toBe(143);
  const before = (await geometry(page))[TITLE];
  await dragLayer(page, TITLE, 4, 90);
  const after = (await geometry(page))[TITLE];
  near(after.x, before.x, 0.6);
  near(after.y, before.y + 90, 12); // Y may land on a guide, but is never reset to its start
  expect(after.y).toBeGreaterThan(before.y + 40);
});

test('H. undo/redo steps back one object move at a time without touching the other layers', async ({ page }) => {
  test.setTimeout(120_000);
  await openCover(page);
  await setSnap(page, false);

  const start = await geometry(page);
  await dragLayer(page, TITLE, -25, -45);
  const afterTitle = await geometry(page);
  await dragLayer(page, SUBTITLE, 35, -30);
  const afterSubtitle = await geometry(page);
  expect(afterSubtitle[TITLE]).toMatchObject({ x: afterTitle[TITLE].x, y: afterTitle[TITLE].y });

  await page.getByTestId('advanced-editor-undo-button').click(); // undoes the Subtitle move only
  await expect.poll(async () => (await geometry(page))[SUBTITLE].x).toBe(start[SUBTITLE].x);
  const undone = await geometry(page);
  expect(undone[TITLE].x).toBe(afterTitle[TITLE].x);
  expect(undone[TITLE].y).toBe(afterTitle[TITLE].y);

  await page.getByTestId('advanced-editor-undo-button').click(); // then the Title move
  await expect.poll(async () => (await geometry(page))[TITLE].x).toBe(start[TITLE].x);
  expect((await geometry(page))[SUBTITLE].x).toBe(start[SUBTITLE].x);

  await page.getByTestId('advanced-editor-redo-button').click();
  await expect.poll(async () => (await geometry(page))[TITLE].x).toBe(afterTitle[TITLE].x);
  expect((await geometry(page))[SUBTITLE].x).toBe(start[SUBTITLE].x);
});
