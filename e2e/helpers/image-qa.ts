import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect, type Locator, type Page } from '@playwright/test';

export const ODT_PATH = path.resolve(__dirname, '../../docs/manuscritos/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt');
export const EXPECTED_ODT_SHA256 = '2bfe326db07b46a85e9c70fc27c1dc7ba8595952f2938675256c9d92255698e8';

// Source: style P10 inherits fo:text-indent 0.2362in from "Standard" (0.2362in = 17.0064pt).

const QA_EMAIL = 'e2e.auth@anclora-talent.test';

export const QA_PROJECT_TITLE_PREFIX = 'Image CrossPage QA ';

export const CHAPTERS = {
  notaEditorial: /Nota editorial/,
  capitulo1: /Capítulo 1\./,
  notaEditorial: /Nota editorial/,
} as const;

export function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export async function requireSingle(locator: Locator, label: string): Promise<Locator> {
  await expect(locator, `${label} must exist exactly once`).toHaveCount(1, { timeout: 15_000 });
  return locator;
}

export async function signInAsQaIdentity(page: Page) {
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

export async function importFreshProject(page: Page, title: string, sourcePath: string = ODT_PATH): Promise<string> {
  await page.goto('/projects/new');
  await (await requireSingle(page.locator('#project-title'), 'project title input')).fill(title);
  await page.locator('[data-testid="source-document-input"]').setInputFiles(sourcePath);
  const docDataSave = await requireSingle(page.locator('[data-testid="document-data-save-button"]'), 'document data save');
  await docDataSave.click();
  await expect(docDataSave).toBeHidden({ timeout: 15_000 });
  await (await requireSingle(page.locator('[data-testid="create-project-submit-button"]'), 'create project submit')).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/editor/, { timeout: 60_000 });
  const projectId = page.url().match(/\/projects\/([a-f0-9-]+)\//)?.[1] ?? '';
  expect(projectId).not.toBe('');
  return projectId;
}

export async function openChapterEditor(page: Page, projectId: string, chapter: RegExp): Promise<Locator> {
  await page.goto(`/projects/${projectId}/editor`);
  await (await requireSingle(page.locator('.ac-stepper__trigger').nth(1), 'chapters step')).click();
  await (await requireSingle(page.locator('[data-testid^="chapter-organizer-button-"]').filter({ hasText: chapter }), `chapter ${chapter}`)).click();
  await (await requireSingle(page.locator('[data-testid="chapter-open-button"]'), 'open chapter editor')).click();
  return requireSingle(page.locator('[data-testid="chapter-editor-workspace"] .ProseMirror'), 'editor surface');
}

export async function deleteProjectByTitle(page: Page, title: string) {
  await page.goto('/dashboard');
  await page.getByPlaceholder('Buscar proyectos').fill(title);
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('project-card-menu').first().click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByTestId('delete-project-button').first().click();
  await expect(page.getByText(title, { exact: false })).toHaveCount(0, { timeout: 30_000 });
}




// 8x8 PNG; the node view stretches it to the configured width.
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP8z8Dwn4EIwDiqkL4KAEEXAxHsGZz9AAAAAElFTkSuQmCC',
  'base64',
);
// The selected image is the only one that renders its controls.
export const BOX = '[data-testid="image-node-box"]:has([data-testid="image-node-controls"])';
export const CONTROLS = '[data-testid="image-node-controls"]';
export const HANDLE = '[data-testid="image-node-drag-handle"]';
export const MODE_TOGGLE = '[data-testid="image-node-mode-toggle-button"]';

export type Rect = { x: number; y: number; w: number; h: number };

export async function flowGeometry(page: Page) {
  return page.evaluate(() => {
    const flow = document.querySelector('.multipage-editor-flow') as HTMLElement;
    const pm = flow.querySelector('.ProseMirror') as HTMLElement;
    const cs = getComputedStyle(pm);
    const stride = (parseFloat(cs.columnWidth) || pm.clientWidth) + (parseFloat(cs.columnGap) || 0);
    const f = flow.getBoundingClientRect();
    const p = pm.getBoundingClientRect();
    // The canvas is CSS-scaled (zoom / fit-to-width); rects are screen px.
    const scale = pm.offsetWidth > 0 ? p.width / pm.offsetWidth : 1;
    const columnWidth = (parseFloat(cs.columnWidth) || pm.clientWidth) * scale;
    return {
      flow: { x: f.left, y: f.top, w: f.width, h: f.height },
      pmLeft: p.left,
      pmTop: p.top,
      pmHeight: pm.clientHeight * scale,
      columnWidth,
      stride: stride * scale,
      scale,
    };
  });
}

export async function rectOf(page: Page, selector: string): Promise<Rect | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, selector);
}

/** Text-block rects plus every transform that could carry a drag offset. */
export async function siblingSnapshot(page: Page) {
  return page.evaluate(() => {
    const flow = document.querySelector('.multipage-editor-flow') as HTMLElement;
    const pm = flow.querySelector('.ProseMirror') as HTMLElement;
    const track = flow.querySelector('.multipage-editor-flow-track') as HTMLElement;
    const blocks = Array.from(pm.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3')).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent ?? '').slice(0, 24),
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        transform: getComputedStyle(el).transform,
      };
    });
    return {
      blocks,
      pmTransform: getComputedStyle(pm).transform,
      trackTransform: getComputedStyle(track).transform,
      wrapperTransforms: Array.from(pm.querySelectorAll('[data-image-mode]')).map((el) => getComputedStyle(el).transform),
    };
  });
}

export async function imageColumn(page: Page): Promise<number> {
  const g = await flowGeometry(page);
  const box = await rectOf(page, BOX);
  return Math.floor((box!.x + box!.w / 2 - g.pmLeft) / g.stride);
}

export async function chapterTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const pm = document.querySelector('.multipage-editor-flow .ProseMirror') as HTMLElement;
    return Array.from(pm.querySelectorAll(':scope > p, :scope > h1, :scope > h2, :scope > h3'))
      .map((el) => (el.textContent ?? '').trim())
      .filter(Boolean);
  });
}

export async function imageAttrs(page: Page) {
  return page.locator('[data-image-mode]:has([data-testid="image-node-controls"])').first().evaluate((el) => ({
    mode: el.getAttribute('data-image-mode'),
    x: el.getAttribute('data-image-x'),
    y: el.getAttribute('data-image-y'),
  }));
}

export async function dragHandle(page: Page, dx: number, dy: number, onMove?: () => Promise<void>, steps = 6) {
  const handle = await rectOf(page, HANDLE);
  expect(handle, 'drag handle visible').not.toBeNull();
  await page.mouse.move(handle!.x + 6, handle!.y + 6);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(handle!.x + 6 + (dx * i) / steps, handle!.y + 6 + (dy * i) / steps);
    if (onMove) await onMove();
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
}

/** Put the caret at the end of the nth top-level paragraph without a mouse click (floated images can cover it). */
export async function placeCaretAtEnd(editor: Locator, nthParagraph: number) {
  await editor.focus();
  await editor.evaluate((root, index) => {
    const paragraph = root.querySelectorAll(':scope > p')[index] as HTMLElement;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let node: Node | null = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) node = n;
    const range = document.createRange();
    if (node) range.setStart(node, (node as Text).length);
    else range.setStart(paragraph, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, nthParagraph);
}

export async function insertImage(page: Page, editor: Locator, nthParagraph: number) {
  const before = await editor.locator('img').count();
  await placeCaretAtEnd(editor, nthParagraph);
  await page.locator('[data-testid="editor-toolbar-image-file-input"]').setInputFiles({ name: 'qa.png', mimeType: 'image/png', buffer: PNG });
  await expect(editor.locator('img')).toHaveCount(before + 1);
  await page.waitForTimeout(500);
}

/** Select the first image and switch it to positioned (floating) mode. */
export async function makeFirstImageFloating(page: Page, editor: Locator) {
  await editor.locator('img').first().click();
  await page.locator(MODE_TOGGLE).click();
  await page.waitForTimeout(500);
}

/**
 * QA project shared by the focused specs. Set QA_IMAGE_PROJECT_ID to skip the
 * (slow) ODT import; the specs never save, so the chapter stays pristine.
 */
export async function ensureProject(page: Page): Promise<{ projectId: string; created: boolean; title: string }> {
  const existing = process.env.QA_IMAGE_PROJECT_ID;
  if (existing) return { projectId: existing, created: false, title: '' };
  expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);
  const title = `${QA_PROJECT_TITLE_PREFIX}${Date.now()}`;
  const projectId = await importFreshProject(page, title);
  console.log(`[QA] created project ${projectId} (reuse with QA_IMAGE_PROJECT_ID=${projectId})`);
  return { projectId, created: true, title };
}

export async function openChapterReady(page: Page, projectId: string, chapter: RegExp): Promise<Locator> {
  const editor = await openChapterEditor(page, projectId, chapter);
  // The editor re-syncs content right after mount; interacting earlier loses the caret.
  await page.waitForTimeout(2500);
  return editor;
}

export const GUIDE_V = '[data-testid="image-guide-vertical"]';
export const GUIDE_H = '[data-testid="image-guide-horizontal"]';

/** Centre of the editable content box of page column `column`, in screen px. */
export async function pageCenter(page: Page, column: number) {
  const g = await flowGeometry(page);
  return { x: g.pmLeft + column * g.stride + g.columnWidth / 2, y: g.pmTop + g.pmHeight / 2 };
}

export async function imageCenter(page: Page) {
  const box = (await rectOf(page, BOX))!;
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export async function guideCount(page: Page) {
  return { v: await page.locator(GUIDE_V).count(), h: await page.locator(GUIDE_H).count() };
}

/**
 * Hold the drag handle and walk the image centre to `target` (screen px, either
 * axis optional). Returns after the last move; the caller releases the mouse.
 */
export async function dragCenterTo(page: Page, target: { x?: number; y?: number }, grab: { x: number; y: number }) {
  const center = await imageCenter(page);
  const dx = target.x === undefined ? 0 : target.x - center.x;
  const dy = target.y === undefined ? 0 : target.y - center.y;
  const steps = 5;
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(grab.x + (dx * i) / steps, grab.y + (dy * i) / steps);
  }
}

export async function grabHandle(page: Page) {
  const handle = await rectOf(page, HANDLE);
  expect(handle, 'drag handle visible').not.toBeNull();
  const grab = { x: handle!.x + 6, y: handle!.y + 6 };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  return grab;
}
