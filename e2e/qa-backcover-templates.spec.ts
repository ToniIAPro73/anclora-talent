import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Contraportada: full-width workspace (no legacy progress rail) and its own template catalogue. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-backcover-templates.spec.ts --reporter=list --workers=1

let projectId = '';
let projectTitle = '';

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  projectTitle = `Back Templates QA ${Date.now()}`;
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
  await page.waitForTimeout(800);
}
async function openStep(page: Page, index: 2 | 3) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  await gotoStep(page, index);
  await expect(page.locator(`[data-testid="cover-studio-v2"][data-surface-kind="${index === 2 ? 'cover' : 'back-cover'}"]`)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
}
const select = (page: Page) => page.getByTestId('cover-template-select');
const options = (page: Page) => page.locator('[data-testid="cover-template-select"] option:not([value=""])');
const saved = (page: Page) => expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
type Live = Record<string, { x: number; y: number; width: number; height: number; lines?: number; fontSize?: number }>;
const live = async (page: Page): Promise<Live> => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-live-geometry')) ?? '{}');
const geometry = async (page: Page) => (await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry')) ?? '{}';
const contents = async (page: Page): Promise<Record<string, string>> => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content')) ?? '{}');
async function choose(page: Page, id: string, accept = true) {
  const onDialog = (dialog: import('@playwright/test').Dialog) => void (accept ? dialog.accept() : dialog.dismiss());
  page.on('dialog', onDialog);
  try {
    await select(page).selectOption(id);
    await page.waitForTimeout(900);
  } finally {
    page.off('dialog', onDialog);
  }
}

test('A. no legacy progress rail on Contraportada; the workspace uses the same full width as Portada', async ({ page }) => {
  test.setTimeout(150_000);
  await openStep(page, 2);
  const front = (await page.getByTestId('cover-workspace-toolbar').boundingBox())!;
  const frontBody = await page.locator('body').innerText();
  expect(frontBody).not.toMatch(/PROGRESO|Siguiente paso/i);

  await gotoStep(page, 3);
  await expect(page.locator('[data-testid="cover-studio-v2"][data-surface-kind="back-cover"]')).toBeVisible({ timeout: 30_000 });
  const body = await page.locator('body').innerText();
  for (const legacy of [/progreso/i, /\b4\s*de 8 pasos/i, /de 8 pasos/i, /paso anterior/i, /siguiente paso/i]) expect(body).not.toMatch(legacy);
  await expect(page.getByTestId('previous-step-button')).toHaveCount(0);
  await expect(page.getByTestId('next-step-button')).toHaveCount(0);
  await expect(page.getByTestId('cover-step-workspace')).toBeVisible();

  const back = (await page.getByTestId('cover-workspace-toolbar').boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(back.x - front.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(back.width - front.width)).toBeLessThanOrEqual(1);
  expect(back.width).toBeGreaterThan(viewport.width * 0.9); // no reserved empty column
  const properties = (await page.getByTestId('advanced-editor-properties-column').boundingBox())!;
  expect(properties.x + properties.width).toBeGreaterThan(viewport.width - 40);
});

test('B/C. the catalogue is back-cover only; first open applies the default template consistently; one active card', async ({ page }) => {
  test.setTimeout(150_000);
  await openStep(page, 3);
  const entries = await options(page).evaluateAll((els) => els.map((el) => [el.getAttribute('value'), el.textContent]));
  expect(entries.length).toBeGreaterThanOrEqual(6);
  expect(entries.every(([id]) => id?.startsWith('back-'))).toBe(true);
  expect(entries.map(([, name]) => name)).toEqual(expect.arrayContaining(['Clásica editorial', 'Autor destacado', 'Ensayo premium', 'Negocio / liderazgo', 'Ficción literaria', 'Minimal']));

  // first open: selector, card and canvas all say the same thing
  expect(await select(page).inputValue()).toBe('back-classic-editorial');
  await expect(page.getByTestId('cover-template-active-card')).toHaveCount(1);
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', 'back-classic-editorial');
  await expect(page.getByTestId('cover-template-active-name')).toHaveText('Clásica editorial');
  await expect(page.locator('[data-testid^="cover-template-thumb-"]')).toHaveCount(1);
  await expect(page.getByTestId('cover-templates-view-all-button')).toHaveCount(0);
  expect(Object.keys(await contents(page)).length).toBeGreaterThanOrEqual(3);

  // the front cover has its own, different catalogue
  await gotoStep(page, 2);
  await expect(page.locator('[data-testid="cover-studio-v2"][data-surface-kind="cover"]')).toBeVisible({ timeout: 30_000 });
  const frontIds = await options(page).evaluateAll((els) => els.map((el) => el.getAttribute('value')));
  expect(frontIds.some((id) => id?.startsWith('back-'))).toBe(false);
});

test('D/E/F. switching templates changes the layout, keeps the content and hides an empty bio', async ({ page }) => {
  test.setTimeout(240_000);
  await openStep(page, 3);
  const content = await contents(page);
  const order = ['back-classic-editorial', 'back-author-focus', 'back-business', 'back-minimal', 'back-literary', 'back-essay-premium', 'back-guide'];
  const seen = new Set<string>();
  for (const id of order) {
    await choose(page, id);
    expect(await select(page).inputValue()).toBe(id);
    await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', id);
    await expect(page.locator('[data-testid^="cover-template-thumb-"]')).toHaveCount(1);
    expect(await contents(page)).toEqual(content); // the same words, a different composition
    const layout = await live(page);
    seen.add(JSON.stringify(layout));
    // every visible text block stays inside the safe area
    for (const block of Object.values(layout)) {
      if (block.fontSize === undefined) continue;
      expect(block.x).toBeGreaterThanOrEqual(28);
      expect(block.x + block.width).toBeLessThanOrEqual(372);
      expect(block.y).toBeGreaterThanOrEqual(28);
    }
    // this project has no biography: the slot exists but is hidden (no empty visible block)
    const bioRow = page.locator('[data-testid^="layer-row-"]').filter({ hasText: 'Biografía del autor' });
    await expect(bioRow).toHaveAttribute('data-hidden', 'true');
    const bioId = Object.keys(content).find((key) => key.endsWith('-authorBio'))!;
    expect(Object.keys(layout)).not.toContain(bioId);
  }
  expect(seen.size).toBe(order.length); // seven different compositions
  // back to the first one: no stale layers
  await choose(page, 'back-classic-editorial');
  const layerCount = await page.locator('[data-testid^="layer-row-"]').count();
  await choose(page, 'back-author-focus');
  await choose(page, 'back-classic-editorial');
  expect(await page.locator('[data-testid^="layer-row-"]').count()).toBe(layerCount);
});

test('H/I/J. cancel keeps everything; save and reload keep the back template; the front is untouched; step 5 shows it', async ({ page }) => {
  test.setTimeout(300_000);
  await openStep(page, 2);
  const frontTemplate = await select(page).inputValue();
  const frontGeometry = await geometry(page);

  await openStep(page, 3);
  await choose(page, 'back-business');
  const live1 = await live(page);
  // cancel: nothing changes
  await choose(page, 'back-literary', false);
  expect(await select(page).inputValue()).toBe('back-business');
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', 'back-business');
  expect(await live(page)).toEqual(live1);
  await page.waitForTimeout(1600);
  await saved(page);

  await openStep(page, 3);
  expect(await select(page).inputValue()).toBe('back-business');
  await expect(page.getByTestId('cover-template-active-card')).toHaveAttribute('data-template-id', 'back-business');
  expect(await live(page)).toEqual(live1);

  await openStep(page, 2);
  expect(await select(page).inputValue()).toBe(frontTemplate);
  expect(await geometry(page)).toEqual(frontGeometry);

  // step 5: the selected back template renders through the canonical preview with the editor's geometry
  await gotoStep(page, 4);
  await expect(page.getByTestId('preview-stage')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  await page.getByTestId('preview-workspace').focus();
  await page.keyboard.press('End');
  await expect(page.getByTestId('preview-surface-label')).toHaveText(/Contraportada/, { timeout: 15_000 });
  const paper = page.getByTestId('cover-preview-paper').last();
  await expect.poll(async () => Object.keys(JSON.parse((await paper.getAttribute('data-preview-geometry')) ?? '{}')).length, { timeout: 15_000 }).toBe(Object.keys(live1).length);
  const preview: Live = JSON.parse((await paper.getAttribute('data-preview-geometry')) ?? '{}');
  for (const id of Object.keys(live1)) {
    expect(Math.abs(live1[id].x - preview[id].x)).toBeLessThan(0.5);
    expect(Math.abs(live1[id].y - preview[id].y)).toBeLessThan(0.5);
    expect(Math.abs(live1[id].width - preview[id].width)).toBeLessThan(0.5);
    expect(preview[id].lines).toBe(live1[id].lines);
  }
});
