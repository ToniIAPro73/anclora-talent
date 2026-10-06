import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ODT_PATH = path.resolve(__dirname, '../docs/manuscritos/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt');
const EXPECTED_ODT_SHA256 = '2bfe326db07b46a85e9c70fc27c1dc7ba8595952f2938675256c9d92255698e8';

// Source: style P10 inherits fo:text-indent 0.2362in from "Standard" (0.2362in = 17.0064pt).

const QA_EMAIL = 'e2e.auth@anclora-talent.test';

const QA_PROJECT_TITLE_PREFIX = 'Image Numbering QA ';

const CHAPTERS = {
  notaEditorial: /Nota editorial/,
  indice: /Índice/,
} as const;

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function requireSingle(locator: Locator, label: string): Promise<Locator> {
  await expect(locator, `${label} must exist exactly once`).toHaveCount(1, { timeout: 15_000 });
  return locator;
}

async function signInAsQaIdentity(page: Page) {
  const password = process.env.E2E_AUTH_PASSWORD;
  expect(password, 'E2E_AUTH_PASSWORD must be set in .env.local').toBeTruthy();

  await page.addInitScript(() => {
    window.localStorage.setItem(
      'anclora-cookie-consent-v1',
      JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' }),
    );
    window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
  });

  await page.goto('/sign-in');
  await page.locator('#email').fill(QA_EMAIL);
  await page.locator('#password').fill(password as string);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 20_000 });
}

async function importFreshProject(page: Page, title: string): Promise<string> {
  await page.goto('/projects/new');
  await (await requireSingle(page.locator('#project-title'), 'project title input')).fill(title);
  await page.locator('[data-testid="source-document-input"]').setInputFiles(ODT_PATH);
  const docDataSave = await requireSingle(page.locator('[data-testid="document-data-save-button"]'), 'document data save');
  await docDataSave.click();
  await expect(docDataSave).toBeHidden({ timeout: 15_000 });
  await (await requireSingle(page.locator('[data-testid="create-project-submit-button"]'), 'create project submit')).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/editor/, { timeout: 60_000 });
  const projectId = page.url().match(/\/projects\/([a-f0-9-]+)\//)?.[1] ?? '';
  expect(projectId).not.toBe('');
  return projectId;
}

async function openChapterEditor(page: Page, projectId: string, chapter: RegExp): Promise<Locator> {
  await page.goto(`/projects/${projectId}/editor`);
  await (await requireSingle(page.locator('.ac-stepper__trigger').nth(1), 'chapters step')).click();
  await (await requireSingle(page.locator('[data-testid^="chapter-organizer-button-"]').filter({ hasText: chapter }), `chapter ${chapter}`)).click();
  await (await requireSingle(page.locator('[data-testid="chapter-open-button"]'), 'open chapter editor')).click();
  return requireSingle(page.locator('[data-testid="chapter-editor-workspace"] .ProseMirror'), 'editor surface');
}

async function deleteProjectByTitle(page: Page, title: string) {
  await page.goto('/dashboard');
  await page.getByPlaceholder('Buscar proyectos').fill(title);
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('project-card-menu').first().click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('delete-project-button').first().click();
  await expect(page.getByText(title, { exact: false })).toHaveCount(0, { timeout: 30_000 });
}



// 8x8 red PNG; the node view stretches it to the configured width.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP8z8Dwn4EIwDiqkL4KAEEXAxHsGZz9AAAAAElFTkSuQmCC',
  'base64',
);
const SYNC = '[data-testid="sync-page-numbers-button"]';

async function imageAttrs(editor: Locator) {
  return editor.locator('[data-image-mode]').first().evaluate((el) => ({
    mode: el.getAttribute('data-image-mode'),
    x: el.getAttribute('data-image-x'),
    y: el.getAttribute('data-image-y'),
    anchor: el.getAttribute('data-image-anchor'),
    align: el.getAttribute('data-image-align'),
  }));
}

async function saveChapter(page: Page) {
  await (await requireSingle(page.locator('[data-testid="chapter-editor-header-save-button"]'), 'save')).click();
  await expect(page.locator('.ac-editor-shell__status')).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

async function tocSnapshot(page: Page, projectId: string) {
  const editor = await openChapterEditor(page, projectId, CHAPTERS.indice);
  await page.waitForTimeout(2000);
  return editor.locator('p[data-toc-entry]').evaluateAll((els) =>
    els.map((el) => `${el.textContent?.trim()}|${el.getAttribute('data-toc-page') ?? ''}`),
  );
}

test.describe('Chapter editor images + existing numbering action', () => {
  test('image: insert, select, floating move, inline reorder, undo/redo, save/reload', async ({ page }) => {
    test.setTimeout(600_000);
    expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);
    await signInAsQaIdentity(page);
    const title = `${QA_PROJECT_TITLE_PREFIX}${Date.now()}`;
    const projectId = await importFreshProject(page, title);
    console.log(`[QA] fresh project id=${projectId}`);

    let editor = await openChapterEditor(page, projectId, CHAPTERS.notaEditorial);
    await page.waitForTimeout(3000);
    await editor.locator('p').first().click();
    await page.locator('[data-testid="editor-toolbar-image-file-input"]').setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: PNG });
    await expect(editor.locator('img')).toHaveCount(1, { timeout: 15_000 });

    // Select: node view shows the drag handle and controls
    await editor.locator('img').first().click();
    await expect(page.locator('[data-testid="image-node-drag-handle"]')).toBeVisible();
    const inline = await imageAttrs(editor);
    expect(inline.mode).toBe('inline');
    expect(inline.x).toBeNull();

    // Inline reorder via toolbar move-down: image moves after the next block
    const indexOfImage = () => editor.evaluate((root) => Array.from(root.children).findIndex((c) => c.querySelector('img')));
    await page.waitForTimeout(700); // keep the move out of the insert's history group
    const startIndex = await indexOfImage();
    await page.locator('[data-testid="image-node-move-down-button"]').click();
    expect(await indexOfImage()).toBe(startIndex + 1);
    await editor.locator('p').first().click();
    await page.keyboard.press('Control+z');
    expect(await indexOfImage(), 'undo restores slot').toBe(startIndex);
    await page.keyboard.press('Control+Shift+z');
    expect(await indexOfImage(), 'redo moves again').toBe(startIndex + 1);

    // Floating: switch mode and drag the handle
    await page.waitForTimeout(700);
    await editor.locator('img').first().click();
    await page.locator('[data-testid="image-node-mode-toggle-button"]').click();
    await page.waitForTimeout(700);
    const handle = page.locator('[data-testid="image-node-drag-handle"]');
    const box = await handle.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + 6, box!.y + 6);
    await page.mouse.down();
    await page.mouse.move(box!.x + 66, box!.y + 46, { steps: 6 });
    await page.mouse.up();
    const floating = await imageAttrs(editor);
    console.log(`[QA] FLOATING ${JSON.stringify(floating)}`);
    expect(floating.mode).toBe('floating');
    expect(Number(floating.x)).toBeGreaterThan(30);
    expect(Number(floating.y)).toBeGreaterThan(20);
    expect(floating.anchor).toBe('block');

    // Drag far outside: clamped to the editable area
    await page.waitForTimeout(700);
    const box2 = await handle.boundingBox();
    await page.mouse.move(box2!.x + 6, box2!.y + 6);
    await page.mouse.down();
    await page.mouse.move(box2!.x + 6 + 5000, box2!.y + 6, { steps: 4 });
    await page.mouse.up();
    const imgBox = await editor.locator('img').first().boundingBox();
    const surface = await editor.boundingBox();
    expect(imgBox!.x + imgBox!.width).toBeLessThanOrEqual(surface!.x + surface!.width + 2);

    // Undo the last move
    await page.waitForTimeout(100);
    await editor.locator('p').first().click();
    await page.keyboard.press('Control+z');
    const afterUndo = await imageAttrs(editor);
    expect(Number(afterUndo.x)).toBeCloseTo(Number(floating.x), 0);

    // Save -> reload -> reopen keeps mode/position
    await saveChapter(page);
    await page.reload();
    editor = await openChapterEditor(page, projectId, CHAPTERS.notaEditorial);
    const reloaded = await imageAttrs(editor);
    console.log(`[QA] RELOADED ${JSON.stringify(reloaded)}`);
    expect(reloaded).toMatchObject({ mode: 'floating', x: afterUndo.x, y: afterUndo.y, anchor: 'block' });
    await expect(page.locator('[data-testid="chapter-editor-workspace"] [contenteditable="true"]')).toHaveCount(1);

    await deleteProjectByTitle(page, title).catch((error) => console.warn('[QA] cleanup skipped', String(error).slice(0, 120)));
  });

  test('numbering: existing "Actualizar numeración" action before/after', async ({ page }) => {
    test.setTimeout(400_000);
    await signInAsQaIdentity(page);
    const title = `${QA_PROJECT_TITLE_PREFIX}num ${Date.now()}`;
    const projectId = await importFreshProject(page, title);
    const before = await tocSnapshot(page, projectId);
    console.log(`[QA] TOC BEFORE ${JSON.stringify(before)}`);

    await page.goto(`/projects/${projectId}/editor`);
    await (await requireSingle(page.locator('.ac-stepper__trigger').nth(1), 'chapters step')).click();
    const button = await requireSingle(page.locator(SYNC), 'sync numbering button');
    const stateBefore = await button.getAttribute('data-stale');
    await button.click();
    await expect(page.locator(SYNC)).toHaveAttribute('data-sync-state', /synced|idle/, { timeout: 60_000 });
    await page.waitForTimeout(3000);
    const after = await tocSnapshot(page, projectId);
    console.log(`[QA] TOC AFTER ${JSON.stringify(after)} stale-before=${stateBefore}`);
    expect(after.length).toBeGreaterThan(0);

    await deleteProjectByTitle(page, title).catch((error) => console.warn('[QA] cleanup skipped', String(error).slice(0, 120)));
  });
});
