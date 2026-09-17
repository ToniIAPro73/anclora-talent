import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';

// Generated per run; never committed, logged or captured.
const qaUser = {
  fullName: 'Cover Studio Closure QA',
  email: `e2e.cover-closure.${Date.now()}@anclora-talent.test`,
  password: `Qa-${randomBytes(24).toString('base64url')}-Aa1!`,
};

const diagnostics = new WeakMap<Page, { pageErrors: number; consoleErrors: number; failedRequests: number; badResponses: number }>();

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/register', { data: qaUser });
  expect(response.status()).toBe(201);
});

test.beforeEach(async ({ page }) => {
  diagnostics.set(page, { pageErrors: 0, consoleErrors: 0, failedRequests: 0, badResponses: 0 });
  page.on('pageerror', () => { diagnostics.get(page)!.pageErrors += 1; });
  page.on('console', (message) => { if (message.type() === 'error') { diagnostics.get(page)!.consoleErrors += 1; console.log('QA console.error', message.text().replaceAll(qaUser.email, '[redacted]')); } });
  page.on('requestfailed', (request) => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') diagnostics.get(page)!.failedRequests += 1; });
  page.on('response', (response) => { if (response.status() >= 400) diagnostics.get(page)!.badResponses += 1; });
  await page.addInitScript(() => {
    window.localStorage.setItem('anclora-cookie-consent-v1', JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' }));
  });
});

test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page)).toEqual({ pageErrors: 0, consoleErrors: 0, failedRequests: 0, badResponses: 0 });
});

async function login(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.locator('#email').fill(qaUser.email);
  await page.locator('#password').fill(qaUser.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

async function createProject(page: Page, title: string): Promise<string> {
  await page.goto('/projects/new');
  await page.getByTestId('create-project-title-input').fill(title);
  await page.getByRole('button', { name: 'Crear proyecto y abrir editor' }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 15_000 });
  const projectId = page.url().match(/\/projects\/([^/]+)\/editor/)?.[1];
  if (!projectId) throw new Error('Project id was not present in editor URL');
  return projectId;
}

async function openCover(page: Page, projectId: string, advanced = false): Promise<void> {
  await page.goto(`/projects/${projectId}/cover${advanced ? '?mode=advanced' : ''}`);
  if (await page.getByTestId('cover-origin-prompt').isVisible().catch(() => false)) {
    await page.getByTestId('cover-origin-choose-template-button').click();
  }
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('basic-template-essay-premium-cover').click();
  await expect(page.getByTestId('basic-cover-editor')).toBeVisible();
}

async function advanced(page: Page): Promise<void> {
  await page.getByTestId('studio-mode-advanced-button').click();
  await expect(page.getByTestId('advanced-cover-editor')).toBeVisible();
  await expect(page.getByTestId('design-surface-canvas')).toBeVisible();
  await expect(page.getByTestId('design-surface-canvas')).toHaveAttribute('data-canvas-ready', 'true');
}

async function basic(page: Page): Promise<void> {
  await page.getByTestId('studio-mode-basic-button').click();
  await expect(page.getByTestId('basic-cover-editor')).toBeVisible();
}

async function saved(page: Page): Promise<void> {
  await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 10_000 });
}

async function ids(page: Page): Promise<string[]> {
  const value = await page.getByTestId('design-surface-canvas').getAttribute('data-object-ids');
  return value ? value.split(',').filter(Boolean) : [];
}

async function clickObject(page: Page, id: string, double = false): Promise<void> {
  const root = page.getByTestId('design-surface-canvas');
  const box = await root.locator('canvas.upper-canvas').boundingBox();
  if (!box) throw new Error('Fabric canvas did not have a bounding box');
  const geometry = JSON.parse((await root.getAttribute('data-object-geometry')) ?? '{}') as Record<string, { x: number; y: number; width: number; height: number }>;
  const [width, height] = (await root.getAttribute('data-surface-size'))!.split('x').map(Number);
  const item = geometry[id];
  if (!item) throw new Error(`No geometry exposed for ${id}`);
  const position = { x: ((item.x + item.width / 2) / width) * box.width, y: ((item.y + item.height / 2) / height) * box.height };
  const upperCanvas = root.locator('canvas.upper-canvas');
  if (double) await upperCanvas.dblclick({ position }); else await upperCanvas.click({ position });
}

async function assertSelected(page: Page, id: string): Promise<void> {
  await expect(page.getByTestId('design-surface-canvas')).toHaveAttribute('data-active-object-ids', id);
  await expect(page.getByTestId(`layer-row-${id}`)).toHaveAttribute('data-selected', 'true');
  const selected = await page.locator('[data-testid^="layer-row-"][data-selected="true"]').count();
  expect(selected).toBe(1);
}

async function clickLayer(page: Page, id: string): Promise<void> {
  await page.getByTestId(`layer-row-${id}`).evaluate((row) => (row.querySelector('button') as HTMLButtonElement).click());
}

test.describe('Cover Studio — Basic editor BASIC-01..10', () => {
  test('proves fields, live preview, saving, mode stability and reload persistence', async ({ page }) => {
    await login(page);
    const projectId = await createProject(page, `Closure Basic ${Date.now()}`);
    await openCover(page, projectId);
    await expect(page.getByTestId('basic-cover-editor')).toBeVisible(); // BASIC-01
    await expect(page.getByTestId('design-surface-renderer')).toBeVisible();
    const fields = {
      title: page.getByTestId('basic-field-title-content-input'),
      subtitle: page.getByTestId('basic-field-subtitle-content-input'),
      author: page.getByTestId('basic-field-author-content-input'),
    };
    await expect(fields.title).toHaveValue(/.+/); // BASIC-02
    await expect(fields.subtitle).toHaveValue(/.+/);
    await expect(fields.author).toHaveValue('');
    const values = { title: 'QA closure title', subtitle: 'QA closure subtitle', author: 'QA closure author' };
    for (const [key, value] of Object.entries(values)) {
      await fields[key as keyof typeof fields].fill(value);
      await expect(fields[key as keyof typeof fields]).toHaveValue(value);
      await expect(page.getByTestId('design-surface-renderer')).toContainText(key === 'author' ? value.toUpperCase() : value);
      await saved(page);
    }
    const template = page.getByTestId('basic-template-essay-premium-cover');
    await template.click(); // BASIC-06
    await expect(fields.title).toHaveValue(values.title); // BASIC-07
    await expect(fields.subtitle).toHaveValue(values.subtitle);
    await expect(fields.author).toHaveValue(values.author);
    await page.goto(`/projects/${projectId}/editor`); // BASIC-08
    await page.goto(`/projects/${projectId}/cover`);
    await expect(fields.title).toHaveValue(values.title);
    await expect(fields.subtitle).toHaveValue(values.subtitle);
    await expect(fields.author).toHaveValue(values.author);
    await page.reload(); // BASIC-09
    await expect(fields.title).toHaveValue(values.title);
    await expect(fields.subtitle).toHaveValue(values.subtitle);
    await expect(fields.author).toHaveValue(values.author);
    await advanced(page); // BASIC-10
    await basic(page);
    await expect(fields.title).toHaveValue(values.title);
    await expect(fields.subtitle).toHaveValue(values.subtitle);
    await expect(fields.author).toHaveValue(values.author);
  });
});

test('Cover Studio — exact canvas ↔ layers identity for title, subtitle, author and new text', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Closure Selection ${Date.now()}`);
  await openCover(page, projectId);
  await advanced(page);
  const before = await ids(page);
  expect(before.length).toBeGreaterThanOrEqual(3);
  for (const id of before.slice(0, 3)) {
    await clickObject(page, id);
    await assertSelected(page, id);
    await clickLayer(page, id);
    await assertSelected(page, id);
  }
  await page.getByTestId('advanced-editor-add-text-button').click();
  await expect.poll(() => ids(page)).toHaveLength(before.length + 1);
  const addedId = (await ids(page)).find((id) => !before.includes(id));
  if (!addedId) throw new Error('Added text layer ID was not exposed');
  await clickObject(page, addedId);
  await assertSelected(page, addedId);
  await clickLayer(page, addedId);
  await assertSelected(page, addedId);
});

test('Cover Studio — real text editing, exact deletes, no ghost or duplicate IDs', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Closure Editing ${Date.now()}`);
  await openCover(page, projectId);
  await advanced(page);
  const initialIds = await ids(page);
  for (const id of initialIds.slice(0, 2)) {
    await clickObject(page, id);
    await assertSelected(page, id);
    await clickObject(page, id, true);
    await page.waitForTimeout(100);
    await page.keyboard.press('Control+A');
    await page.keyboard.type(`QA edited ${id}`);
    await page.keyboard.press('Escape');
    await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content')) ?? '{}')[id]).toBe(`QA edited ${id}`);
    await page.waitForTimeout(1_500);
    await saved(page);
  }
  await page.getByTestId('advanced-editor-add-text-button').click();
  const withAdded = await ids(page);
  const canvasDeleteId = withAdded.find((id) => !initialIds.includes(id));
  if (!canvasDeleteId) throw new Error('No canvas-delete layer ID');
  await clickObject(page, canvasDeleteId);
  await assertSelected(page, canvasDeleteId);
  const countBeforeCanvasDelete = withAdded.length;
  await page.getByTestId('design-surface-canvas').focus();
  await page.keyboard.press('Delete');
  await expect.poll(() => ids(page)).toHaveLength(countBeforeCanvasDelete - 1);
  await expect(page.getByTestId(`layer-row-${canvasDeleteId}`)).toHaveCount(0);
  await page.getByTestId('advanced-editor-add-text-button').click();
  const withSecond = await ids(page);
  const layerDeleteId = withSecond.find((id) => !initialIds.includes(id));
  if (!layerDeleteId) throw new Error('No layer-delete layer ID');
  await page.getByTestId(`layer-delete-${layerDeleteId}`).click();
  await expect.poll(() => ids(page)).toHaveLength(countBeforeCanvasDelete - 1);
  await expect(page.getByTestId(`layer-row-${layerDeleteId}`)).toHaveCount(0);
  const finalIds = await ids(page);
  expect(new Set(finalIds).size).toBe(finalIds.length);
  const layerIds = await page.locator('[data-testid^="layer-row-"]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid')!.replace('layer-row-', '')));
  expect(layerIds.sort()).toEqual(finalIds.sort());
  await page.reload();
  await advanced(page);
  expect(new Set(await ids(page))).toEqual(new Set(finalIds));
});

test('Cover Studio — individual guides, clear-all, keyboard and dark/light assertions', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Closure Guides ${Date.now()}`);
  await openCover(page, projectId);
  await advanced(page);
  await page.getByTestId('add-horizontal-guide-button').click();
  await page.getByTestId('add-vertical-guide-button').click();
  const guides = page.locator('[data-testid^="design-guide-guide-"]');
  await expect(guides).toHaveCount(2);
  const guideIds = await guides.evaluateAll((items) => items.map((item) => item.getAttribute('data-testid')));
  expect(new Set(guideIds).size).toBe(2);
  await expect(page.getByTestId('canvas-rulers')).toBeVisible();
  await expect(page.getByTestId('clear-guides-button')).toHaveAccessibleName(/guía|guide/i);
  for (const guide of [page.locator('[data-testid^="design-guide-guide-y-"]').first(), page.locator('[data-testid^="design-guide-guide-x-"]').first()]) {
    await guide.scrollIntoViewIfNeeded();
    const beforeStyle = await guide.getAttribute('style');
    const box = await guide.boundingBox();
    if (!box) throw new Error('Guide did not have geometry');
    const horizontal = (await guide.getAttribute('data-testid'))?.includes('guide-y-');
    const start = horizontal ? { x: box.x + Math.min(100, box.width / 2), y: box.y + box.height / 2 } : { x: box.x + box.width / 2, y: box.y + Math.min(100, box.height / 2) };
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-testid'), start);
    expect(hit).toBe(await guide.getAttribute('data-testid'));
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + (horizontal ? 0 : 24), start.y + (horizontal ? 24 : 0));
    await page.mouse.up();
    await expect.poll(() => guide.getAttribute('style')).not.toBe(beforeStyle);
  }
  const horizontalId = await page.locator('[data-testid^="design-guide-guide-y-"]').getAttribute('data-testid');
  const verticalId = await page.locator('[data-testid^="design-guide-guide-x-"]').getAttribute('data-testid');
  if (!horizontalId || !verticalId) throw new Error('Both guide axis IDs were required');
  await page.getByTestId(horizontalId).dblclick({ position: { x: 100, y: 4 }, force: true });
  await expect(page.getByTestId(horizontalId)).toHaveCount(0);
  await expect(page.getByTestId(verticalId)).toHaveCount(1);
  await page.getByTestId('add-horizontal-guide-button').click();
  await expect(guides).toHaveCount(2);
  const currentVertical = await page.locator('[data-testid^="design-guide-guide-x-"]').getAttribute('data-testid');
  if (!currentVertical) throw new Error('Vertical guide did not persist');
  await page.getByTestId(currentVertical).dblclick({ position: { x: 4, y: 100 }, force: true });
  await expect(page.getByTestId(currentVertical)).toHaveCount(0);
  await expect(page.locator('[data-testid^="design-guide-guide-y-"]')).toHaveCount(1);
  await page.getByTestId('add-vertical-guide-button').click();
  await expect(guides).toHaveCount(2);
  await page.getByTestId('clear-guides-button').click();
  await expect(guides).toHaveCount(0);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  const dark = await page.getByTestId('advanced-cover-editor').evaluate((root) => [getComputedStyle(root).color, getComputedStyle(root).backgroundColor]);
  expect(dark[0]).not.toBe(dark[1]);
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  const light = await page.getByTestId('advanced-cover-editor').evaluate((root) => [getComputedStyle(root).color, getComputedStyle(root).backgroundColor]);
  expect(light[0]).not.toBe(light[1]);
  const selected = (await ids(page))[0];
  await clickObject(page, selected);
  await page.getByTestId('design-surface-canvas').focus();
  await page.keyboard.press('Backspace');
  await expect(page.getByTestId(`layer-row-${selected}`)).toHaveCount(0);
});

test('Cover Studio — back cover Basic/Advanced edit and reload persistence', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Closure Back Cover ${Date.now()}`);
  await page.goto(`/projects/${projectId}/back-cover`);
  if (await page.getByTestId('cover-origin-prompt').isVisible().catch(() => false)) {
    await page.getByTestId('cover-origin-choose-template-button').click();
  }
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('basic-template-essay-premium-back').click();
  await expect(page.getByTestId('basic-cover-editor')).toBeVisible();
  const title = page.getByTestId('basic-field-title-content-input');
  await title.fill('QA back cover edit');
  await saved(page);
  await advanced(page);
  const id = (await ids(page))[0];
  await clickObject(page, id);
  await assertSelected(page, id);
  await clickObject(page, id);
  await assertSelected(page, id);
  await clickObject(page, id, true);
  await page.waitForTimeout(100);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('QA back cover advanced edit');
  await page.keyboard.press('Escape');
  await expect.poll(async () => Object.values(JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content')) ?? '{}')).join(' ')).toContain('QA back cover advanced edit');
  await page.waitForTimeout(1_500);
  await saved(page);
  await page.reload();
  await advanced(page);
  await expect.poll(async () => Object.values(JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content')) ?? '{}')).join(' ')).toContain('QA back cover advanced edit');
  await basic(page);
  await expect(title).toHaveValue(/QA back cover/);
});

test('Guided workspace — canonical eight-step rail, next/previous, direct navigation and reload on steps 3/4', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Closure Wizard ${Date.now()}`);
  const labels = page.locator('.ac-stepper__label');
  if (await page.getByTestId('workspace-onboarding').isVisible().catch(() => false)) {
    await page.getByTestId('onboarding-skip-button').click();
  }
  await expect(labels).toHaveText(['Contenido', 'Capítulos', 'Portada', 'Contraportada', 'Vista previa', 'Colaborar', 'Asistente IA', 'Exportar']);
  await expect(page.getByText('de 8 pasos', { exact: true })).toBeVisible();
  await expect(page.getByText('Plantilla', { exact: true })).toHaveCount(0);
  await page.getByTestId('next-step-button').click();
  await expect(page.locator('[aria-current="step"]')).toBeVisible();
  await page.getByTestId('previous-step-button').click();
  await expect(page.locator('[aria-current="step"]')).toBeVisible();
  await page.getByTestId('next-step-button').click();
  await page.getByRole('navigation', { name: 'Progress' }).locator('li').nth(2).getByRole('button').click();
  await expect(page.locator('[aria-current="step"] .ac-stepper__dot')).toContainText('3');
  await page.waitForTimeout(1_500);
  await page.reload();
  await expect(page.locator('[aria-current="step"] .ac-stepper__dot')).toContainText('3');
  await page.getByRole('navigation', { name: 'Progress' }).locator('li').nth(3).getByRole('button').click();
  await expect(page.locator('[aria-current="step"] .ac-stepper__dot')).toContainText('4');
  await page.waitForTimeout(1_500);
  await page.reload();
  await expect(page.locator('[aria-current="step"] .ac-stepper__dot')).toContainText('4');
  expect(projectId).toMatch(/^[0-9a-f-]{36}$/);
});

for (const width of [1440, 1024, 768, 375]) {
  test(`Cover Studio — Basic responsive overflow guard ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await login(page);
    const projectId = await createProject(page, `Closure Responsive ${width} ${Date.now()}`);
    await openCover(page, projectId);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}
