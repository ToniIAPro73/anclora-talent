import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Cover template application, semantic binding and layers-panel stability. Run alone:
//   npx playwright test e2e/qa-cover-templates.spec.ts --reporter=list --workers=1
// Needs the local PostgreSQL development database.

const TITLE = 'migrated-cover-title';
const SUBTITLE = 'migrated-cover-subtitle';
const AUTHOR = 'migrated-cover-author';

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Cover Templates QA ${Date.now()}`;
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

async function contents(page: Page): Promise<Record<string, string>> {
  return JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content')) ?? '{}');
}
async function geometry(page: Page): Promise<Record<string, { x: number; y: number; width: number; height: number }>> {
  return JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry')) ?? '{}');
}
const cards = (page: Page) => page.locator('[data-testid^="cover-template-card-"]');
async function activeCardIds(page: Page): Promise<string[]> {
  return page.locator('[data-testid^="cover-template-card-"][data-active="true"]').evaluateAll((els) =>
    els.map((el) => (el.getAttribute('data-testid') ?? '').replace('cover-template-card-', '')),
  );
}
async function applyCard(page: Page, index: number, accept = true) {
  // Re-applying the active template asks nothing, so the handler must not outlive the click.
  const onDialog = (dialog: import('@playwright/test').Dialog) => void (accept ? dialog.accept() : dialog.dismiss());
  page.on('dialog', onDialog);
  try {
    await cards(page).nth(index).click();
    await page.waitForTimeout(700);
  } finally {
    page.off('dialog', onDialog);
  }
}
async function layerNames(page: Page): Promise<string[]> {
  return page.locator('[data-testid^="layer-name-"]').allTextContents();
}

test('A. every template materializes all slots with the manuscript content (no blank canvas)', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  const original = await contents(page);
  expect(original[TITLE].replace(/\s+/g, ' ')).toContain('La atención');

  const total = await cards(page).count();
  expect(total).toBeGreaterThanOrEqual(3);
  for (let index = 0; index < Math.min(total, 4); index += 1) {
    await applyCard(page, index);
    const after = await contents(page);
    expect(Object.keys(after).sort(), `template #${index} keeps all three text slots`).toEqual([AUTHOR, SUBTITLE, TITLE].sort());
    expect(after[TITLE].trim().length, 'title slot is bound').toBeGreaterThan(0);
    expect(after[TITLE].replace(/\s+/g, ' ')).toBe(original[TITLE].replace(/\s+/g, ' '));
    expect(after[SUBTITLE].replace(/\s+/g, ' ')).toBe(original[SUBTITLE].replace(/\s+/g, ' '));
    expect(await layerNames(page)).toEqual(expect.arrayContaining(['Título', 'Subtítulo', 'Autor']));
    expect(await activeCardIds(page)).toHaveLength(1);
  }
});

test('B. switching A -> B -> C -> A keeps the content; the active card follows; cancel changes nothing', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await applyCard(page, 0);
  const content = await contents(page);
  const activeA = await activeCardIds(page);

  await applyCard(page, 1);
  const activeB = await activeCardIds(page);
  expect(activeB).not.toEqual(activeA);
  expect(await contents(page)).toEqual(content);
  const geometryB = await geometry(page);

  await applyCard(page, 2);
  expect(await contents(page)).toEqual(content);
  await applyCard(page, 0);
  expect(await activeCardIds(page)).toEqual(activeA);

  // cancelling the confirmation leaves the composition and the active card as they were
  const before = await geometry(page);
  await applyCard(page, 1, false);
  expect(await activeCardIds(page)).toEqual(activeA);
  expect(await geometry(page)).toEqual(before);
  expect(geometryB[TITLE]).toBeTruthy();
});

test('C. a title edited on the cover survives a template change and a reload', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await applyCard(page, 0);

  await page.getByTestId(`layer-select-${TITLE}`).click();
  await page.getByTestId('text-layer-content-input').fill('Título de portada propio');
  await page.getByTestId('text-layer-content-input').press('Tab');
  await applyCard(page, 1);
  expect((await contents(page))[TITLE]).toBe('Título de portada propio');

  await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 15_000 });
  await page.reload();
  await openCover(page);
  expect((await contents(page))[TITLE]).toBe('Título de portada propio');
});

test('D. applied template, content, layers and positions survive save and reload', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  await applyCard(page, 2);
  const active = await activeCardIds(page);
  const content = await contents(page);
  const names = await layerNames(page);
  const positions = await geometry(page);
  await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 15_000 });

  await page.reload();
  await openCover(page);
  expect(await activeCardIds(page)).toEqual(active);
  expect(await contents(page)).toEqual(content);
  expect(await layerNames(page)).toEqual(names);
  const reloaded = await geometry(page);
  for (const id of Object.keys(positions)) {
    expect(Math.abs(reloaded[id].x - positions[id].x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(reloaded[id].y - positions[id].y)).toBeLessThanOrEqual(0.5);
  }
});

test('E. layers panel: selecting and renaming never moves rows or scroll, autosave never remounts them', async ({ page }) => {
  test.setTimeout(150_000);
  await openCover(page);
  for (let i = 0; i < 4; i += 1) await page.getByTestId('cover-tool-button-text').click(); // enough layers to scroll

  const list = page.getByTestId('layers-panel');
  const snapshot = () =>
    list.evaluate((el) => ({
      scrollTop: el.scrollTop,
      count: el.children.length,
      rows: [...el.children].map((row) => [Math.round(row.getBoundingClientRect().height), row.getAttribute('data-testid')]),
    }));
  const before = await snapshot();
  expect(before.count).toBeGreaterThanOrEqual(6);
  expect(new Set(before.rows.map((row) => row[0]))).toEqual(new Set([32]));

  // The structural background row is not a layer: it has no rename.
  const buttons = page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])');
  const count = await buttons.count();
  for (const index of [0, Math.floor(count / 2), count - 1, 0, count - 1]) {
    await buttons.nth(index).click();
    await page.waitForTimeout(200);
    const now = await snapshot();
    expect(now.count).toBe(before.count);
    expect(now.rows).toEqual(before.rows); // same order, same heights
  }

  // rename in place: the row keeps its height and no sibling moves
  const last = buttons.nth(count - 1);
  await last.click();
  const row = page.locator('[data-testid^="layer-row-"]:not([data-testid="layer-row-background"])').nth(count - 1);
  const rowBox = (await row.boundingBox())!;
  await page.locator('[data-testid^="layer-name-"]:not([data-testid="layer-name-background"])').nth(count - 1).dblclick();
  await expect(page.locator('[data-testid^="layer-rename-input-"]')).toBeVisible();
  const renaming = (await row.boundingBox())!;
  expect(renaming.height).toBe(rowBox.height);
  expect(renaming.y).toBe(rowBox.y);
  await page.locator('[data-testid^="layer-rename-input-"]').fill('Lema editado');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  expect((await snapshot()).rows.map((r) => r[0])).toEqual(before.rows.map((r) => r[0]));

  // autosave (and the refresh after it) must not remount the list
  await row.evaluate((el) => ((window as unknown as { __row: Element }).__row = el));
  await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 15_000 });
  await page.waitForTimeout(2000);
  expect(await row.evaluate((el) => (window as unknown as { __row: Element }).__row === el)).toBe(true);
});
