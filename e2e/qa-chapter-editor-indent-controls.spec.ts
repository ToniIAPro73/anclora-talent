import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ODT_PATH = path.resolve(__dirname, '../docs/manuscritos/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt');
const EXPECTED_ODT_SHA256 = '2bfe326db07b46a85e9c70fc27c1dc7ba8595952f2938675256c9d92255698e8';

// Source: style P10 inherits fo:text-indent 0.2362in from "Standard" (0.2362in = 17.0064pt).

const QA_EMAIL = 'e2e.auth@anclora-talent.test';
const EVIDENCE_ROOT = path.resolve(__dirname, '../tmp/qa-evidence/chapter-editor-indent-controls');

const QA_PROJECT_TITLE_PREFIX = 'Indent Controls QA ';

const CHAPTERS = {
  notaEditorial: /Nota editorial/,
} as const;

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function evidencePath(sub: string, name: string): string {
  const dir = path.join(EVIDENCE_ROOT, sub);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
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


const OUTDENT = '[data-testid="editor-toolbar-outdent-button"]';
const INDENT = '[data-testid="editor-toolbar-indent-button"]';

type IndentSnapshot = { text: string; first: string | null; left: string | null; right: string | null; textIndent: number; marginLeft: number; marginRight: number };

async function lastParagraphSnapshot(editor: Locator): Promise<IndentSnapshot> {
  return editor.locator('p').last().evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      text: (el.textContent ?? '').slice(-20),
      first: el.getAttribute('data-first-line-indent'),
      left: el.getAttribute('data-left-indent'),
      right: el.getAttribute('data-right-indent'),
      textIndent: parseFloat(s.textIndent),
      marginLeft: parseFloat(s.marginLeft),
      marginRight: parseFloat(s.marginRight),
    };
  });
}

async function paragraphLeftEdge(editor: Locator): Promise<number> {
  // Visual left edge of the first rendered line of the last paragraph.
  return editor.locator('p').last().evaluate((el) => {
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return r.left + parseFloat(s.marginLeft) + parseFloat(s.textIndent);
  });
}

async function saveChapter(page: Page) {
  await (await requireSingle(page.locator('[data-testid="chapter-editor-header-save-button"]'), 'save')).click();
  await expect(page.locator('.ac-editor-shell__status')).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('Chapter editor indent controls', () => {
  test('Enter inherits indent; increase/decrease move the paragraph; persists; presets and undo/redo', async ({ page }) => {
    test.setTimeout(600_000);
    expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);
    await signInAsQaIdentity(page);
    const title = `${QA_PROJECT_TITLE_PREFIX}${Date.now()}`;
    const projectId = await importFreshProject(page, title);
    console.log(`[QA] fresh project id=${projectId}`);

    let editor = await openChapterEditor(page, projectId, CHAPTERS.notaEditorial);
    const lastBefore = await lastParagraphSnapshot(editor);
    console.log(`[QA] last imported paragraph ${JSON.stringify(lastBefore)}`);
    await editor.screenshot({ path: evidencePath('.', '01-imported-paragraph-before.png') });

    // The editor re-syncs content right after mount; interacting earlier loses the caret.
    await page.waitForTimeout(3000);
    // The last paragraph is quote + <br> + attribution: click the attribution line, then End.
    await editor.locator('p').last().getByText('Nota de diseño del corpus').click();
    await expect(editor).toBeFocused();
    // Meta/End shortcuts are platform- and app-specific (Cmd+Arrow switches chapters); place the caret via the DOM selection.
    await editor.evaluate((root) => {
      const last = root.querySelector('p:last-of-type') ?? root.lastElementChild;
      const walker = document.createTreeWalker(last as Node, NodeFilter.SHOW_TEXT);
      let node: Node | null = null;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) node = n;
      const range = document.createRange();
      range.setStart(node as Node, (node as Text).length);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.keyboard.press('Enter');
    await page.keyboard.type('Hola');
    await expect(editor.locator('p').last()).toHaveText('Hola');
    const afterEnter = await lastParagraphSnapshot(editor);
    console.log(`[QA] NEW_PARAGRAPH_ATTRS ${JSON.stringify(afterEnter)}`);
    expect(afterEnter.text).toContain('Hola');
    expect(afterEnter.first, 'Enter inherits firstLineIndent').toBe(lastBefore.first);
    expect(afterEnter.left, 'Enter inherits leftIndent').toBe(lastBefore.left);
    expect(afterEnter.right, 'Enter inherits rightIndent').toBe(lastBefore.right);
    expect(afterEnter.textIndent).toBeCloseTo(lastBefore.textIndent, 1);
    await editor.screenshot({ path: evidencePath('.', '02-new-paragraph-after-enter.png') });

    // Increase -> moves right
    const edge0 = await paragraphLeftEdge(editor);
    await page.locator(INDENT).click();
    const afterIncrease = await lastParagraphSnapshot(editor);
    const edgeInc = await paragraphLeftEdge(editor);
    console.log(`[QA] AFTER INCREASE ${JSON.stringify(afterIncrease)}`);
    expect(edgeInc).toBeGreaterThan(edge0 + 20);
    expect(afterIncrease.marginLeft).toBeGreaterThan(afterEnter.marginLeft + 20);
    await editor.screenshot({ path: evidencePath('.', '04-increase-indent-applied.png') });

    // Undo / redo
    await editor.locator('p').last().click();
    await page.keyboard.press('Control+z');
    expect(await paragraphLeftEdge(editor), 'undo restores').toBeCloseTo(edge0, 0);
    await page.keyboard.press('Control+Shift+z');
    expect(await paragraphLeftEdge(editor), 'redo reapplies').toBeCloseTo(edgeInc, 0);
    await editor.screenshot({ path: evidencePath('.', '07-undo-redo.png') });

    // Decrease until the margin is reached; the button must then be disabled
    for (let i = 0; i < 10 && (await page.locator(OUTDENT).isEnabled()); i += 1) {
      await page.locator(OUTDENT).click();
    }
    const atMargin = await lastParagraphSnapshot(editor);
    console.log(`[QA] AT MARGIN ${JSON.stringify(atMargin)}`);
    await expect(page.locator(OUTDENT)).toBeDisabled();
    expect(atMargin.marginLeft).toBeCloseTo(0, 1);
    expect(atMargin.textIndent).toBeCloseTo(0, 1);
    expect(await paragraphLeftEdge(editor)).toBeLessThanOrEqual(edge0);
    if (lastBefore.textIndent > 0) expect(await paragraphLeftEdge(editor)).toBeLessThan(edge0 - 10);
    await editor.screenshot({ path: evidencePath('.', '03-decrease-indent-applied.png') });

    // Preset cycle must not rewrite the manual indent
    const toggle = await requireSingle(page.locator('[data-testid="margin-selector-toggle"]'), 'preset toggle');
    for (const id of ['margin-preset-book-style-button', 'margin-preset-normal-button', 'margin-preset-custom-button']) {
      await toggle.click();
      await page.locator(`[data-testid="${id}"]`).click();
      await page.waitForTimeout(400);
      const snap = await lastParagraphSnapshot(page.locator('[data-testid="chapter-editor-workspace"] .ProseMirror'));
      expect(snap.marginLeft, `${id} keeps manual margin`).toBeCloseTo(0, 1);
      expect(snap.textIndent, `${id} keeps manual first-line`).toBeCloseTo(0, 1);
    }
    await page.locator('[data-testid="chapter-editor-workspace"] .ProseMirror').screenshot({ path: evidencePath('.', '06-after-preset-cycle.png') });

    // Save -> reload -> reopen
    await saveChapter(page);
    await page.reload();
    editor = await openChapterEditor(page, projectId, CHAPTERS.notaEditorial);
    const reloaded = await lastParagraphSnapshot(editor);
    console.log(`[QA] AFTER RELOAD ${JSON.stringify(reloaded)}`);
    expect(reloaded.text).toContain('Hola');
    expect(reloaded.textIndent).toBeCloseTo(0, 1);
    expect(reloaded.marginLeft).toBeCloseTo(0, 1);
    await editor.screenshot({ path: evidencePath('.', '05-after-save-reload.png') });

    // Increase, save, reload
    await editor.locator('p').last().click();
    await page.locator(INDENT).click();
    const inc = await lastParagraphSnapshot(editor);
    expect(inc.marginLeft).toBeGreaterThan(20);
    await saveChapter(page);
    await page.reload();
    editor = await openChapterEditor(page, projectId, CHAPTERS.notaEditorial);
    expect((await lastParagraphSnapshot(editor)).marginLeft).toBeCloseTo(inc.marginLeft, 1);

    // Single surface
    await expect(page.locator('[data-testid="chapter-editor-workspace"] [contenteditable="true"]')).toHaveCount(1);

    await deleteProjectByTitle(page, title).catch((error) => console.warn('[QA] cleanup skipped', String(error).slice(0, 120)));
  });

  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`viewport smoke ${vp.name}: indent buttons reachable and paragraph shifts`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await signInAsQaIdentity(page);
      const title = `${QA_PROJECT_TITLE_PREFIX}${vp.name} ${Date.now()}`;
      const projectId = await importFreshProject(page, title);
      const editor = await openChapterEditor(page, projectId, CHAPTERS.notaEditorial);
      // The editor re-syncs content right after mount; interacting earlier loses the caret.
      await page.waitForTimeout(3000);
      // The sticky toolbar overlays the page on small viewports, so focus via the keyboard instead of a click.
      await editor.focus();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End');
      const before = await paragraphLeftEdge(editor);
      const btn = page.locator(INDENT);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      expect(await paragraphLeftEdge(editor)).toBeGreaterThan(before + 10);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      await page.screenshot({ path: evidencePath('viewports', `${vp.name}.png`) });
      await deleteProjectByTitle(page, title).catch((error) => console.warn('[QA] cleanup skipped', String(error).slice(0, 120)));
    });
  }
});
