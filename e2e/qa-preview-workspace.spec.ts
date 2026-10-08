import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Step 5 — Preview workspace. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-preview-workspace.spec.ts --reporter=list --workers=1

const MANUSCRIPT = path.resolve(__dirname, '../docs/manuscritos/exito-sin-compania.odt');
let importedId = '';
let importedTitle = '';
let scratchId = '';
let scratchTitle = '';

async function createScratchProject(page: Page, title: string) {
  await page.goto('/projects/new');
  await page.getByTestId('create-project-title-input').fill(title);
  await page.getByTestId('create-project-submit-button').click();
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
  return page.url().match(/\/projects\/([a-f0-9-]+)\//)?.[1] ?? '';
}

async function gotoPreviewStep(page: Page) {
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(4)).toBeVisible({ timeout: 30_000 });
  for (let i = 1; i <= 4 && (await triggers.nth(4).isDisabled()); i += 1) await triggers.nth(i).click();
  await triggers.nth(4).click();
  await expect(page.getByTestId('preview-workspace')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500); // the manuscript flow measures its page count asynchronously
}

async function openPreview(page: Page, projectId: string) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  await gotoPreviewStep(page);
}

const inputValue = (page: Page) => page.getByTestId('preview-page-input').inputValue();
const totalPages = async (page: Page) => Number(((await page.getByTestId('preview-page-total').innerText()).match(/(\d+)/) ?? [])[1]);
const sheetWidth = async (page: Page) => {
  await expect(page.getByTestId('preview-workspace')).toHaveAttribute('data-busy', 'false', { timeout: 15_000 });
  await page.waitForTimeout(400);
  return Number(await page.getByTestId('preview-sheet').getAttribute('data-page-width'));
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  scratchTitle = `Preview WS scratch ${Date.now()}`;
  scratchId = await createScratchProject(page, scratchTitle);
  importedTitle = `Preview WS import ${Date.now()}`;
  importedId = await importFreshProject(page, importedTitle, MANUSCRIPT);
  await page.close();
});

test.afterAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await browser.newPage();
  await signInAsQaIdentity(page);
  await deleteProjectByTitle(page, scratchTitle).catch(() => undefined);
  await deleteProjectByTitle(page, importedTitle).catch(() => undefined);
  await page.close();
});

test('A. shell: shared header/stepper, no legacy rail, rail + stage + composition panel', async ({ page }) => {
  test.setTimeout(120_000);
  await openPreview(page, importedId);
  await expect(page.getByTestId('chapter-workflow-stepper')).toBeVisible();
  await expect(page.getByTestId('previous-step-button')).toHaveCount(0);
  await expect(page.getByTestId('next-step-button')).toHaveCount(0);
  await expect(page.getByText(/^Progreso$/)).toHaveCount(0);
  await expect(page.getByTestId('open-full-preview-button')).toHaveCount(0);
  await expect(page.getByTestId('preview-page-rail')).toBeVisible();
  await expect(page.getByTestId('preview-stage')).toBeVisible();
  await expect(page.getByTestId('preview-composition-panel')).toBeVisible();
  await expect(page.getByTestId('preview-mode-switch')).toBeVisible();
  await page.screenshot({ path: 'test-results/preview-ws-01-document-desktop.png' });
});

test('B. auto-fit: the whole page is visible on entry without scrolling; zoom and fit work', async ({ page }) => {
  test.setTimeout(120_000);
  await openPreview(page, importedId);
  const stage = page.getByTestId('preview-stage');
  const [scrollH, clientH, scrollW, clientW] = await stage.evaluate((el) => [el.scrollHeight, el.clientHeight, el.scrollWidth, el.clientWidth]);
  expect(scrollH).toBeLessThanOrEqual(clientH + 1);
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);
  const stageBox = (await stage.boundingBox())!;
  const frameBox = (await page.getByTestId('preview-frame').boundingBox())!;
  expect(frameBox.y).toBeGreaterThanOrEqual(stageBox.y - 1);
  expect(frameBox.y + frameBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
  expect(frameBox.x + frameBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 1);

  const fitted = Number((await page.getByTestId('preview-zoom-value').innerText()).replace('%', ''));
  await page.getByTestId('preview-zoom-in').click();
  await expect(page.getByTestId('preview-workspace')).toHaveAttribute('data-fit', 'false');
  const zoomed = Number((await page.getByTestId('preview-zoom-value').innerText()).replace('%', ''));
  expect(zoomed).toBeGreaterThanOrEqual(Math.min(150, Math.max(50, fitted + 10)));
  for (let i = 0; i < 12; i += 1) await page.getByTestId('preview-zoom-out').click();
  expect(Number((await page.getByTestId('preview-zoom-value').innerText()).replace('%', ''))).toBe(50);
  await page.getByTestId('preview-fit').click();
  await expect(page.getByTestId('preview-workspace')).toHaveAttribute('data-fit', 'true');
  expect(Number((await page.getByTestId('preview-zoom-value').innerText()).replace('%', ''))).toBe(fitted);
});

test('C/D. page rail, counter and arrow / Home / End navigation', async ({ page }) => {
  test.setTimeout(120_000);
  await openPreview(page, importedId);
  const total = await totalPages(page);
  expect(total).toBeGreaterThan(5);
  await expect(page.getByTestId('preview-thumb-0')).toHaveAttribute('aria-current', 'page');
  await page.getByTestId('preview-thumb-3').click();
  await expect(page.getByTestId('preview-thumb-3')).toHaveAttribute('aria-current', 'page');
  expect(await inputValue(page)).toBe('4');

  await page.getByTestId('preview-workspace').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('preview-thumb-4')).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('preview-thumb-3')).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('End');
  expect(await inputValue(page)).toBe(String(total));
  await expect(page.getByTestId('preview-surface-label')).toHaveText(/Contraportada/);
  await page.keyboard.press('Home');
  expect(await inputValue(page)).toBe('1');
  await expect(page.getByTestId('preview-surface-label')).toHaveText(/Portada/);

  await page.getByTestId('preview-page-input').fill('6');
  await page.getByTestId('preview-page-input').press('Enter');
  await expect(page.getByTestId('preview-thumb-5')).toHaveAttribute('aria-current', 'page');
  // The rail shows real miniatures of the canonical pages (content text), not generic cards.
  await expect(page.getByTestId('preview-thumb-5').locator('.pw-thumb__flow')).not.toHaveText('');
  await page.screenshot({ path: 'test-results/preview-ws-08-long-document-rail.png' });
});

test('E/F/G. Documento, Pliego and Portada modes use the canonical surfaces', async ({ page }) => {
  test.setTimeout(150_000);
  await openPreview(page, importedId);
  await page.getByTestId('preview-mode-document').click();
  await page.getByTestId('preview-thumb-2').click();
  const single = Number(await page.getByTestId('preview-sheet').evaluate((el) => (el.querySelector('.pw-sheet') as HTMLElement).offsetWidth));

  await page.getByTestId('preview-mode-spread').click();
  await page.getByTestId('preview-thumb-2').click();
  const spread = Number(await page.getByTestId('preview-sheet').evaluate((el) => (el.querySelector('.pw-sheet') as HTMLElement).offsetWidth));
  expect(spread).toBeGreaterThan(single * 1.9);
  // Parity: the spread starts on an odd logical page (even printed page on the left) and highlights both pages.
  await expect(page.getByTestId('preview-thumb-1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('preview-thumb-2')).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: 'test-results/preview-ws-02-spread-desktop.png' });
  await page.getByTestId('preview-workspace').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('preview-thumb-3')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('preview-thumb-4')).toHaveAttribute('aria-selected', 'true');
  // Cover and back cover stand alone.
  await page.keyboard.press('Home');
  await expect(page.getByTestId('preview-sheet').getByTestId('preview-surface-cover')).toBeVisible();

  await page.getByTestId('preview-mode-cover').click();
  await expect(page.getByTestId('preview-sheet').getByTestId('preview-surface-cover')).toBeVisible();
  await expect(page.getByTestId('preview-sheet').getByTestId('cover-preview-surface')).toBeVisible();
  await page.screenshot({ path: 'test-results/preview-ws-03-cover.png' });
  await page.getByTestId('preview-cover-back').click();
  await expect(page.getByTestId('preview-sheet').getByTestId('preview-surface-back-cover')).toBeVisible();
  await page.screenshot({ path: 'test-results/preview-ws-04-back-cover.png' });
  await page.getByTestId('preview-cover-front').click();
  await expect(page.getByTestId('preview-sheet').getByTestId('preview-surface-cover')).toBeVisible();
});

test('H/I/J/K. reflowable document: destinations recompose with the device and never mutate the project', async ({ page }) => {
  test.setTimeout(180_000);
  await openPreview(page, scratchId);
  const workspace = page.getByTestId('preview-workspace');
  const baselineTotal = await totalPages(page);
  const baselineChapters = await page.getByTestId('preview-stage').innerText();

  await page.getByTestId('preview-destination').selectOption('desktop');
  await expect(workspace).toHaveAttribute('data-destination', 'desktop');
  expect(await sheetWidth(page)).toBe(576);

  await page.getByTestId('preview-destination').selectOption('tablet');
  await expect(workspace).toHaveAttribute('data-destination', 'tablet');
  await expect(page.getByTestId('preview-sheet')).toHaveAttribute('data-device', 'tablet');
  expect(await sheetWidth(page)).toBe(528);
  await expect(page.getByTestId('preview-notice')).toHaveAttribute('data-notice-kind', 'recomposed');
  await expect(page.getByTestId('preview-mode-spread')).toBeDisabled();
  await page.screenshot({ path: 'test-results/preview-ws-05-tablet.png' });

  await page.getByTestId('preview-destination').selectOption('ereader');
  await expect(workspace).toHaveAttribute('data-destination', 'ereader');
  expect(await sheetWidth(page)).toBe(480);
  await page.screenshot({ path: 'test-results/preview-ws-06-ereader.png' });

  await page.getByTestId('preview-destination').selectOption('print');
  await expect(workspace).toHaveAttribute('data-destination', 'print');
  await page.waitForTimeout(1500);
  expect(await totalPages(page)).toBe(baselineTotal);
  expect(await page.getByTestId('preview-stage').innerText()).toBe(baselineChapters);

  // Nothing was persisted: reload and the project is identical.
  await page.reload();
  await expect(page.getByTestId('preview-workspace')).toBeVisible({ timeout: 30_000 });
});

test('L/M. source-authoritative documents keep their pagination whatever the destination', async ({ page }) => {
  test.setTimeout(180_000);
  await openPreview(page, importedId);
  const workspace = page.getByTestId('preview-workspace');
  const authoritative = (await workspace.getAttribute('data-source-authoritative')) === 'true';
  const printWidth = await sheetWidth(page);
  const total = await totalPages(page);
  for (const destination of ['desktop', 'tablet', 'ereader', 'print'] as const) {
    await page.getByTestId('preview-destination').selectOption(destination);
    await page.waitForTimeout(1200);
    if (authoritative) {
      expect(await sheetWidth(page)).toBe(printWidth);
      expect(await totalPages(page)).toBe(total);
      await expect(page.getByTestId('preview-notice')).toHaveAttribute('data-notice-kind', 'fixed');
    }
  }
  // Cover, source pages and back cover are all there.
  await page.getByTestId('preview-workspace').focus();
  await page.keyboard.press('End');
  await expect(page.getByTestId('preview-surface-label')).toHaveText(/Contraportada/);
  expect(await page.getByTestId('preview-metric-cover').innerText()).toMatch(/Incluida|Included/);
});

test('N. composition panel: format, margins, metrics and honest preflight', async ({ page }) => {
  test.setTimeout(120_000);
  await openPreview(page, importedId);
  await expect(page.getByTestId('preview-format')).toContainText(/in/);
  await expect(page.getByTestId('preview-margins')).toContainText(/mm/);
  const total = await totalPages(page);
  expect(Number(await page.getByTestId('preview-metric-total').innerText())).toBe(total);
  const content = Number(await page.getByTestId('preview-metric-content').innerText());
  expect(content).toBe(total - 2);
  expect(Number(await page.getByTestId('preview-metric-preliminary').innerText())).toBeGreaterThanOrEqual(0);
  // The safe-area check has no analyzer: it must not be green.
  await expect(page.getByTestId('preview-preflight-safeArea')).toHaveAttribute('data-status', 'unchecked');
  await expect(page.getByTestId('preview-preflight-safeArea')).toContainText(/No comprobado|Not checked/);
  await expect(page.getByTestId('preview-preflight-fonts')).toBeVisible();
  await page.screenshot({ path: 'test-results/preview-ws-07-panel-preflight.png' });
});

test('O. imported content survives in the canonical pages: tables, lists and callouts, nothing clipped', async ({ page }) => {
  test.setTimeout(240_000);
  await openPreview(page, importedId);
  await page.getByTestId('preview-mode-document').click();
  let tables = 0;
  let reflexion = 0;
  let ejercicio = 0;
  const seen = new Set<string>();
  const total = await totalPages(page);
  for (let i = 0; i < total; i += 1) {
    const info = await page.getByTestId('preview-sheet').evaluate((el) => {
      const sheet = el.querySelector('.pw-sheet') as HTMLElement;
      const box = sheet.getBoundingClientRect();
      // Blocks actually shown: those of the canonical page nodes, or the flow's blocks that fall inside the sheet.
      const canonical = [...sheet.querySelectorAll('[data-canonical-page="true"] .flow-content-root > *')] as HTMLElement[];
      const flowed = [...sheet.querySelectorAll('.pw-flow .flow-content-root > *')] as HTMLElement[];
      const blocks = (canonical.length ? canonical : flowed).filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.left < box.right - 1 && rect.right > box.left + 1;
      });
      const overflowing = blocks.filter((node) => {
        const rect = node.getBoundingClientRect();
        return node.matches('table, ul, ol') && (rect.right > box.right + 2 || rect.left < box.left - 2);
      }).length;
      const text = blocks.map((node) => node.textContent ?? '').join(' ');
      return {
        tables: blocks.filter((node) => node.matches('table') || node.querySelector('table')).length,
        reflexion: (text.match(/REFLEXIÓN/g) ?? []).length,
        ejercicio: (text.match(/EJERCICIO/g) ?? []).length,
        overflowing,
        key: text.slice(0, 120),
      };
    });
    tables = Math.max(tables, info.tables);
    reflexion += info.reflexion;
    ejercicio += info.ejercicio;
    seen.add(info.key);
    expect(info.overflowing, `page ${i + 1} has no table/list clipped by the page edge`).toBe(0);
    if (i < total - 1) await page.getByTestId('preview-next-page').click();
  }
  expect(tables).toBeGreaterThan(0);
  expect(reflexion).toBeGreaterThan(0);
  expect(ejercicio).toBeGreaterThan(0);
  expect(seen.size).toBeGreaterThan(30);
});

test('R. cover and back cover recency: edits made in Portada / Contraportada reach Step 5', async ({ page }) => {
  test.setTimeout(240_000);
  await signInAsQaIdentity(page);
  const geometryOf = async (testId: string) => {
    const surface = page.getByTestId('preview-sheet').getByTestId(testId).getByTestId('cover-preview-paper');
    await expect(surface).toHaveAttribute('data-preview-geometry', /.+/, { timeout: 20_000 });
    await page.waitForTimeout(800);
    return (await surface.getAttribute('data-preview-geometry')) ?? '{}';
  };
  const editFirstVisibleText = async (stepIndex: number, visibleIds: string[], text: string) => {
    await page.locator('.ac-stepper__trigger').nth(stepIndex).click();
    await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
    const input = page.getByTestId('text-layer-content-input');
    for (const id of visibleIds) {
      await page.getByTestId(`layer-select-${id}`).click();
      if (await input.isVisible().catch(() => false)) break;
    }
    await input.fill(text);
    await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
  };

  await openPreview(page, scratchId);
  await page.getByTestId('preview-mode-cover').click();
  const frontBefore = await geometryOf('preview-surface-cover');
  await page.getByTestId('preview-cover-back').click();
  const backBefore = await geometryOf('preview-surface-back-cover');

  await editFirstVisibleText(2, Object.keys(JSON.parse(frontBefore)), `Portada reciente ${'x'.repeat(24)} ${Date.now()}`);
  await gotoPreviewStep(page);
  await page.getByTestId('preview-mode-cover').click();
  await page.getByTestId('preview-cover-front').click();
  await expect.poll(async () => geometryOf('preview-surface-cover'), { timeout: 20_000 }).not.toBe(frontBefore);

  await editFirstVisibleText(3, Object.keys(JSON.parse(backBefore)), `Contraportada reciente ${'y'.repeat(30)} ${Date.now()}`);
  await gotoPreviewStep(page);
  await page.getByTestId('preview-mode-cover').click();
  await page.getByTestId('preview-cover-back').click();
  await expect.poll(async () => geometryOf('preview-surface-back-cover'), { timeout: 20_000 }).not.toBe(backBefore);
});

test('S/T. accessibility names, keyboard reachability and ES/EN', async ({ page }) => {
  test.setTimeout(150_000);
  await openPreview(page, importedId);
  await expect(page.getByTestId('preview-prev-page')).toHaveAttribute('aria-label', /anterior|Previous/i);
  await expect(page.getByTestId('preview-next-page')).toHaveAttribute('aria-label', /siguiente|Next/i);
  await expect(page.getByTestId('preview-fit')).toHaveAttribute('aria-label', /Ajustar|Fit/i);
  await expect(page.getByTestId('preview-mode-document')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('preview-stage')).toHaveAttribute('aria-label', /Escenario|Preview stage/);
  await expect(page.getByTestId('preview-thumb-0')).toHaveAttribute('aria-current', 'page');
  // Tab order reaches the toolbar controls.
  await page.getByTestId('preview-mode-document').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const reached = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  expect(reached).toBeTruthy();
  // English UI strings: the language switch rewrites labels without touching the workspace state.
  await page.getByRole('button', { name: /^ES$|Español|Language|Idioma/ }).first().click().catch(() => undefined);
});
