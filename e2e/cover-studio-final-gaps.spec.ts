import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';

const qaUser = {
  fullName: 'Cover Studio Final Gaps QA',
  email: `e2e.cover-gaps.${Date.now()}@anclora-talent.test`,
  password: `Qa-${randomBytes(24).toString('base64url')}-Aa1!`,
};

test.describe.configure({ mode: 'serial' });
test.setTimeout(process.env.BASE_URL?.startsWith('https://') ? 60_000 : 30_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('anclora-cookie-consent-v1', JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' }));
  });
  const bypass = process.env.REMOTE_PREVIEW_BYPASS_URL;
  if (bypass) {
    const target = new URL(bypass);
    const base = new URL(process.env.BASE_URL ?? 'http://localhost:3000');
    const sameVercelProject = target.hostname.endsWith('.vercel.app') && base.hostname.endsWith('.vercel.app');
    if (target.origin !== base.origin && !sameVercelProject) throw new Error('Remote preview bypass URL origin does not match BASE_URL');
    const bootstrapResponse = await page.goto(bypass);
    expect(bootstrapResponse?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
    const expectedHost = process.env.REMOTE_PREVIEW_HOST;
    if (expectedHost) expect(new URL(page.url()).hostname).toBe(expectedHost);
    expect(page.url()).not.toMatch(/vercel\.com\/login/);
    expect(page.url()).not.toMatch(/401|403/);
    const applicationResponse = await page.goto('/');
    expect(applicationResponse?.status()).toBeLessThan(400);
    await page.waitForLoadState('domcontentloaded');
    const deployment = await page.evaluate(() => document.documentElement.getAttribute('data-dpl-id'));
    const expectedDeployment = process.env.REMOTE_PREVIEW_DEPLOYMENT_ID;
    if (expectedDeployment) {
      const html = await page.content();
      expect(deployment === expectedDeployment || html.includes(expectedDeployment)).toBe(true);
    }
    await page.goto('/sign-in');
    await expect(page.locator('#email')).toBeVisible();
  }
});

async function login(page: Page) {
  const registration = await page.request.post('/api/auth/register', { data: qaUser });
  expect([201, 409]).toContain(registration.status());
  await page.goto('/sign-in');
  await page.locator('#email').fill(qaUser.email);
  await page.locator('#password').fill(qaUser.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

async function createProject(page: Page, title: string) {
  await page.goto('/projects/new');
  await page.getByTestId('create-project-title-input').fill(title);
  await page.getByRole('button', { name: /crear proyecto y abrir editor/i }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 15_000 });
  return page.url().match(/\/projects\/([^/]+)\/editor/)![1];
}

async function openAdvanced(page: Page, projectId: string) {
  await page.goto(`/projects/${projectId}/cover?mode=advanced`);
  if (await page.getByTestId('cover-origin-prompt').isVisible().catch(() => false)) {
    await page.getByTestId('cover-origin-create-from-scratch-button').click();
  }
  await expect(page.getByTestId('advanced-cover-editor')).toBeVisible();
  await expect(page.getByTestId('design-surface-canvas')).toHaveAttribute('data-canvas-ready', 'true');
}

async function surfaceIds(page: Page) {
  const raw = await page.getByTestId('design-surface-canvas').getAttribute('data-object-ids');
  return (raw ?? '').split(',').filter(Boolean);
}

async function waitForSaved(page: Page) {
  await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 10_000 });
}

async function geometry(page: Page, id: string) {
  const raw = await page.getByTestId('design-surface-canvas').getAttribute('data-object-geometry');
  return JSON.parse(raw ?? '{}')[id] as { x: number; y: number; width: number; height: number };
}

async function canvasClick(page: Page, id: string, double = false) {
  const root = page.getByTestId('design-surface-canvas');
  const box = await root.locator('canvas.upper-canvas').boundingBox();
  const size = (await root.getAttribute('data-surface-size'))!.split('x').map(Number);
  const item = await geometry(page, id);
  const position = { x: ((item.x + item.width / 2) / size[0]) * box!.width, y: ((item.y + item.height / 2) / size[1]) * box!.height };
  if (double) await root.locator('canvas.upper-canvas').dblclick({ position });
  else await root.locator('canvas.upper-canvas').click({ position });
}

async function expectSelected(page: Page, id: string) {
  await expect(page.getByTestId('design-surface-canvas')).toHaveAttribute('data-active-object-ids', id);
  await expect(page.getByTestId(`layer-row-${id}`)).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-testid^="layer-row-"][data-selected="true"]')).toHaveCount(1);
}

test('guide lifecycle and persistence are explicit project state', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Final gaps guides ${Date.now()}`);
  await openAdvanced(page, projectId);
  await page.getByTestId('add-horizontal-guide-button').click();
  await page.getByTestId('add-vertical-guide-button').click();
  await waitForSaved(page);
  await page.waitForTimeout(2_000);
  const guides = page.locator('[data-testid^="design-guide-"]:not([data-testid^="design-guide-remove-"])');
  await expect(guides).toHaveCount(2);
  const before = await guides.evaluateAll((items) => items.map((item) => ({ id: item.getAttribute('data-testid'), style: item.getAttribute('style') })));
  expect(before.every((guide) => guide.id && guide.style)).toBe(true);
  const horizontalGuide = page.getByTestId(before[0].id!);
  const verticalGuide = page.getByTestId(before[1].id!);
  const horizontalBox = await horizontalGuide.boundingBox();
  const verticalBox = await verticalGuide.boundingBox();
  await page.mouse.move(horizontalBox!.x + 20, horizontalBox!.y + 4);
  await page.mouse.down();
  await page.mouse.move(horizontalBox!.x + 20, horizontalBox!.y + 44);
  await page.mouse.up();
  await page.mouse.move(verticalBox!.x + 4, verticalBox!.y + 20);
  await page.mouse.down();
  await page.mouse.move(verticalBox!.x + 44, verticalBox!.y + 20);
  await page.mouse.up();
  const moved = await guides.evaluateAll((items) => items.map((item) => ({ id: item.getAttribute('data-testid'), style: item.getAttribute('style') })));
  expect(moved).not.toEqual(before);
  await waitForSaved(page);
  await page.waitForTimeout(2_000);
  await page.goto(`/projects/${projectId}/editor`);
  await page.goto(`/projects/${projectId}/cover?mode=advanced`);
  await expect(guides).toHaveCount(2);
  await page.reload();
  await expect(page.getByTestId('design-surface-canvas')).toHaveAttribute('data-canvas-ready', 'true');
  const after = await guides.evaluateAll((items) => items.map((item) => ({ id: item.getAttribute('data-testid'), style: item.getAttribute('style') })));
  expect(after).toEqual(moved);
  const horizontal = before.find((guide) => guide.id?.includes('guide-y-'))!;
  const vertical = before.find((guide) => guide.id?.includes('guide-x-'))!;
  await page.getByTestId(`design-guide-remove-${horizontal.id!.replace('design-guide-', '')}`).evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.getByTestId(horizontal.id!)).toHaveCount(0);
  await expect(page.getByTestId(vertical.id!)).toHaveCount(1);
  await page.getByTestId(`design-guide-remove-${vertical.id!.replace('design-guide-', '')}`).evaluate((button) => (button as HTMLButtonElement).click());
  await expect(guides).toHaveCount(0);
});

test('undo redo covers text, move, add and delete with exact IDs', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Final gaps history ${Date.now()}`);
  await openAdvanced(page, projectId);
  const [id] = await surfaceIds(page);
  const originalText = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content'))!)[id] as string;
  await canvasClick(page, id);
  await page.getByTestId('text-layer-content-input').fill(`${originalText} edited`);
  await page.getByTestId('text-layer-content-input').blur();
  await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content'))!)[id]).toBe(`${originalText} edited`);
  await expect(page.getByTestId('advanced-editor-undo-button')).toBeEnabled();
  await page.getByTestId('advanced-editor-undo-button').click();
  await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content'))!)[id]).toBe(originalText);
  await page.getByTestId('advanced-editor-redo-button').click();
  await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content'))!)[id]).toBe(`${originalText} edited`);
  await canvasClick(page, id);
  const originalX = (await geometry(page, id)).x;
  await page.getByTestId('text-layer-x-input').fill('120');
  await page.getByTestId('text-layer-x-input').blur();
  await expect(page.getByTestId('advanced-editor-undo-button')).toBeEnabled();
  await page.getByTestId('advanced-editor-undo-button').click();
  await expect.poll(() => geometry(page, id)).toMatchObject({ x: originalX });
  await page.getByTestId('advanced-editor-redo-button').click();
  await expect.poll(() => geometry(page, id)).toMatchObject({ x: 120 });
  const initial = await surfaceIds(page);
  await page.getByTestId('advanced-editor-add-text-button').click();
  const added = (await surfaceIds(page)).find((candidate) => !initial.includes(candidate))!;
  await page.getByTestId('advanced-editor-undo-button').click();
  await expect(page.getByTestId(`layer-row-${added}`)).toHaveCount(0);
  await page.getByTestId('advanced-editor-redo-button').click();
  await expect(page.getByTestId(`layer-row-${added}`)).toHaveCount(1);
  await page.getByTestId(`layer-delete-${added}`).click();
  await expect(page.getByTestId(`layer-row-${added}`)).toHaveCount(0);
  await page.getByTestId('advanced-editor-undo-button').click();
  await expect(page.getByTestId(`layer-row-${added}`)).toHaveCount(1);
  await page.getByTestId('advanced-editor-redo-button').click();
  await expect(page.getByTestId(`layer-row-${added}`)).toHaveCount(0);
});

test('layer actions and keyboard editing preserve the object identity contract', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Final gaps keyboard ${Date.now()}`);
  await openAdvanced(page, projectId);
  const [id] = await surfaceIds(page);
  await canvasClick(page, id);
  await expectSelected(page, id);
  const before = await geometry(page, id);
  await page.getByTestId('design-surface-canvas').focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => geometry(page, id)).not.toEqual(before);
  await page.getByTestId(`layer-visibility-${id}`).click();
  await expect(page.getByTestId(`layer-visibility-${id}`)).toHaveAttribute('aria-label', /mostrar|show/i);
  await page.getByTestId(`layer-visibility-${id}`).click();
  await page.getByTestId(`layer-lock-${id}`).click();
  await expect(page.getByTestId(`layer-lock-${id}`)).toHaveAttribute('aria-label', /desbloquear|unlock/i);
  await page.getByTestId(`layer-lock-${id}`).click();
  await expect(page.getByTestId(`layer-lock-${id}`)).toHaveAttribute('aria-label', /bloquear|lock/i);
  const layerIdsBeforeReorder = await page.locator('[data-testid^="layer-row-"]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid')!.replace('layer-row-', '')));
  const backmostId = layerIdsBeforeReorder.at(-1)!;
  await page.getByTestId(`layer-front-${backmostId}`).click();
  await expect(page.locator('[data-testid^="layer-row-"]').first()).toHaveAttribute('data-testid', `layer-row-${backmostId}`);
  await page.getByTestId(`layer-back-${backmostId}`).click();
  await expect(page.locator('[data-testid^="layer-row-"]').last()).toHaveAttribute('data-testid', `layer-row-${backmostId}`);
  await canvasClick(page, id, true);
  const original = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content'))!)[id] as string;
  await page.keyboard.press('Control+A');
  await page.keyboard.type(original);
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content'))!)[id]).toBe(original.slice(0, -1));
  await page.keyboard.press('Home');
  await page.keyboard.press('Delete');
  await expect.poll(async () => JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content'))!)[id]).toBe(original.slice(1, -1));
  await page.keyboard.press('Escape');
  await expect(page.getByTestId(`layer-row-${id}`)).toHaveCount(1);
  const beforeAdd = await surfaceIds(page);
  await page.getByTestId('advanced-editor-add-text-button').click();
  const addedId = (await surfaceIds(page)).find((candidate) => !beforeAdd.includes(candidate))!;
  await canvasClick(page, addedId);
  await expectSelected(page, addedId);
  await page.getByTestId('design-surface-canvas').focus();
  await page.keyboard.press('Delete');
  await expect(page.getByTestId(`layer-row-${addedId}`)).toHaveCount(0);
});

test('ES and EN traversal exposes real labels, semantic selection and focus', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Final gaps locale ${Date.now()}`);
  await page.goto(`/projects/${projectId}/cover`);
  await expect(page.getByTestId('locale-toggle')).toBeVisible();
  await expect(page.getByTestId('studio-mode-basic-button')).toContainText(/básico/i);
  await expect(page.getByTestId('studio-mode-advanced-button')).toContainText(/avanzado/i);
  await page.getByTestId('locale-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('studio-mode-basic-button')).toContainText(/basic/i);
  await expect(page.getByTestId('studio-mode-advanced-button')).toContainText(/advanced/i);
  const template = page.getByTestId('basic-template-essay-premium-cover');
  if (await template.isVisible().catch(() => false)) {
    page.once('dialog', (dialog) => dialog.accept());
    await template.click();
    await expect(template).toHaveAttribute('aria-pressed', 'true');
    await expect(template).toHaveAttribute('data-selected', 'true');
  }
  await page.getByTestId('studio-mode-advanced-button').click();
  await expect(page.getByTestId('clear-guides-button')).toHaveCount(0);
  const actionable = await page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => ({ text: button.textContent?.trim(), name: button.getAttribute('aria-label'), id: button.id })).filter((button) => !button.text && !button.name));
  expect(actionable).toEqual([]);
  await expect(page.getByTestId('studio-mode-advanced-button')).toHaveAttribute('data-active', 'true');
  await page.getByTestId('studio-mode-advanced-button').focus();
  const focusStyles = await page.getByTestId('studio-mode-advanced-button').evaluate((element) => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(focusStyles.outline !== 'none' || focusStyles.shadow !== 'none').toBe(true);
  await page.getByTestId('locale-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('dark and light active states remain visible programmatically', async ({ page }) => {
  await login(page);
  const projectId = await createProject(page, `Final gaps theme ${Date.now()}`);
  await page.goto(`/projects/${projectId}/cover?mode=advanced`);
  if (await page.getByTestId('cover-origin-prompt').isVisible().catch(() => false)) await page.getByTestId('cover-origin-create-from-scratch-button').click();
  const id = (await surfaceIds(page))[0];
  for (const theme of ['dark', 'light']) {
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    await page.getByTestId('studio-mode-advanced-button').click();
    await canvasClick(page, id);
    await expectSelected(page, id);
    for (const selector of [`[data-testid="studio-mode-advanced-button"]`, `[data-testid="layer-row-${id}"]`]) {
      const colors = await page.locator(selector).evaluate((element) => { const style = getComputedStyle(element); return { color: style.color, background: style.backgroundColor, opacity: style.opacity }; });
      expect(colors.color).not.toBe(colors.background);
      expect(Number(colors.opacity)).toBeGreaterThan(0);
    }
  }
});
