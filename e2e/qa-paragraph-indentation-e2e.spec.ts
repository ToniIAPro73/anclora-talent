import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ODT_PATH = path.resolve(__dirname, '../docs/manuscritos/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt');
const EXPECTED_ODT_SHA256 = '2bfe326db07b46a85e9c70fc27c1dc7ba8595952f2938675256c9d92255698e8';
const EXPECTED_ODT_SIZE = 57592;

// Source: style P10 inherits fo:text-indent 0.2362in from "Standard" (0.2362in = 17.0064pt).
const SOURCE_BODY_INDENT_PX = 17.0064 * (96 / 72);
const BIBLIO_HANG_PX = 0.2756 * 72 * (96 / 72);

const QA_EMAIL = 'e2e.auth@anclora-talent.test';
const EVIDENCE_ROOT = path.resolve(__dirname, '../tmp/qa-evidence/chapter-editor-paragraph-indentation');

const QA_PROJECT_TITLE_PREFIX = 'Indent QA ';

const PRESETS: Array<{ key: string; testId: string; label: RegExp }> = [
  { key: 'custom', testId: 'margin-preset-custom-button', label: /Personalizado/ },
  { key: 'bookStyle', testId: 'margin-preset-book-style-button', label: /Estilo libro/ },
  { key: 'normal', testId: 'margin-preset-normal-button', label: /Normal/ },
  { key: 'compact', testId: 'margin-preset-compact-button', label: /Compacto/ },
  { key: 'spacious', testId: 'margin-preset-spacious-button', label: /Espacioso/ },
  { key: 'minimal', testId: 'margin-preset-minimal-button', label: /Mínimo/ },
];

const CHAPTERS = {
  prologo: /Prólogo/,
  notaEditorial: /Nota editorial/,
  introduccion: /Introducción/,
  capitulo1: /Capítulo 1\./,
  bibliografia: /Bibliografía/,
} as const;

type ChapterKey = keyof typeof CHAPTERS;

type ParagraphSnapshot = {
  head: string;
  firstLine: string | null;
  left: string | null;
  right: string | null;
  sourceStyle: string | null;
  textIndent: number;
  marginLeft: number;
  marginRight: number;
};

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

async function textIndentPx(locator: Locator): Promise<number> {
  return locator.evaluate((el) => parseFloat(window.getComputedStyle(el).textIndent));
}

async function paragraphByText(scope: Locator, text: string): Promise<Locator> {
  return requireSingle(scope.locator('p, h1, h2, h3, h4').filter({ hasText: text }), `paragraph "${text}"`);
}

async function snapshotEditor(editor: Locator): Promise<ParagraphSnapshot[]> {
  return editor.locator('p, h1, h2, h3, h4').evaluateAll((els) =>
    els.map((el) => {
      const style = window.getComputedStyle(el);
      return {
        head: (el.textContent ?? '').slice(0, 30),
        firstLine: el.getAttribute('data-first-line-indent'),
        left: el.getAttribute('data-left-indent'),
        right: el.getAttribute('data-right-indent'),
        sourceStyle: el.getAttribute('data-source-style-id'),
        textIndent: parseFloat(style.textIndent),
        marginLeft: parseFloat(style.marginLeft),
        marginRight: parseFloat(style.marginRight),
      };
    }),
  );
}

function expectSameFormatting(actual: ParagraphSnapshot[], baseline: ParagraphSnapshot[], label: string) {
  expect(actual.length, `${label}: paragraph count`).toBe(baseline.length);
  actual.forEach((entry, index) => {
    const base = baseline[index];
    expect(entry.head, `${label}: paragraph ${index} identity`).toBe(base.head);
    expect(entry.firstLine, `${label}: ${base.head} data-first-line-indent`).toBe(base.firstLine);
    expect(entry.left, `${label}: ${base.head} data-left-indent`).toBe(base.left);
    expect(entry.right, `${label}: ${base.head} data-right-indent`).toBe(base.right);
    expect(entry.sourceStyle, `${label}: ${base.head} data-source-style-id`).toBe(base.sourceStyle);
    expect(entry.textIndent, `${label}: ${base.head} computed text-indent`).toBeCloseTo(base.textIndent, 2);
    expect(entry.marginLeft, `${label}: ${base.head} computed margin-left`).toBeCloseTo(base.marginLeft, 2);
    expect(entry.marginRight, `${label}: ${base.head} computed margin-right`).toBeCloseTo(base.marginRight, 2);
  });
}

function findHead(snapshot: ParagraphSnapshot[], prefix: string): ParagraphSnapshot {
  const entry = snapshot.find((p) => p.head.includes(prefix));
  if (!entry) throw new Error(`paragraph starting "${prefix}" not found in snapshot`);
  return entry;
}

function matrixRow(chapters: Record<ChapterKey, ParagraphSnapshot[]>) {
  const r = (s: ParagraphSnapshot) => Number(s.textIndent.toFixed(4));
  return {
    BODY_P1: r(findHead(chapters.prologo, 'La mayoría de las personas')),
    BODY_P2: r(findHead(chapters.prologo, 'Durante años se ha hablado')),
    KICKER: r(findHead(chapters.prologo, 'PRÓLOGO')),
    QUOTE: r(findHead(chapters.notaEditorial, 'Una herramienta editorial')),
    LIST: r(findHead(chapters.capitulo1, 'Cuenta cuántas veces')),
    TABLE_CELL: r(findHead(chapters.introduccion, 'Personas, llamadas')),
    BIBLIOGRAPHY_HANG: r(findHead(chapters.bibliografia, 'Csikszentmihalyi')),
  };
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

async function snapshotAllChapters(page: Page, projectId: string): Promise<Record<ChapterKey, ParagraphSnapshot[]>> {
  const result = {} as Record<ChapterKey, ParagraphSnapshot[]>;
  for (const key of Object.keys(CHAPTERS) as ChapterKey[]) {
    const editor = await openChapterEditor(page, projectId, CHAPTERS[key]);
    result[key] = await snapshotEditor(editor);
  }
  return result;
}

async function selectPresetAndSave(page: Page, projectId: string, preset: (typeof PRESETS)[number]) {
  await openChapterEditor(page, projectId, CHAPTERS.prologo);
  const toggle = await requireSingle(page.locator('[data-testid="margin-selector-toggle"]'), 'margin preset toggle');
  await toggle.click();
  await (await requireSingle(page.locator(`[data-testid="${preset.testId}"]`), `${preset.key} option`)).click();
  await expect(toggle).toContainText(preset.label);
  await page.waitForTimeout(500);
  await (await requireSingle(page.locator('[data-testid="chapter-editor-header-save-button"]'), 'chapter editor save button')).click();
  await page.waitForLoadState('networkidle');
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

test.describe('Imported paragraph format survives every composition preset', () => {
  test('fresh-import baseline is preserved through all real presets, save/reload and delete/reimport', async ({ page }) => {
    test.setTimeout(1_800_000);

    expect(fs.statSync(ODT_PATH).size).toBe(EXPECTED_ODT_SIZE);
    expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);

    await signInAsQaIdentity(page);

    const titleA = `${QA_PROJECT_TITLE_PREFIX}A ${Date.now()}`;
    const projectA = await importFreshProject(page, titleA);
    console.log(`[QA] fresh project A id=${projectA}`);

    const baseline = await snapshotAllChapters(page, projectA);
    const baselineRow = matrixRow(baseline);
    console.log(`[QA] MATRIX FRESH ${JSON.stringify(baselineRow)}`);
    expect(baselineRow.BODY_P1).toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);
    expect(baselineRow.BODY_P2).toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);
    expect(baselineRow.KICKER).toBe(0);
    expect(baselineRow.QUOTE).toBe(0);
    expect(baselineRow.LIST).toBe(0);
    expect(baselineRow.TABLE_CELL).toBe(0);
    expect(baselineRow.BIBLIOGRAPHY_HANG).toBeCloseTo(-BIBLIO_HANG_PX, 0);

    const prologoBaseline = baseline.prologo;
    expect(findHead(prologoBaseline, 'La mayoría de las personas').textIndent).toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);
    await (await openChapterEditor(page, projectA, CHAPTERS.prologo)).screenshot({ path: evidencePath('general-view', 'fresh-baseline-prologo.png') });

    const matrix: Array<{ preset: string; status: string; row: ReturnType<typeof matrixRow> }> = [];
    matrix.push({ preset: 'fresh-custom', status: 'BASELINE', row: baselineRow });

    for (const preset of PRESETS) {
      await selectPresetAndSave(page, projectA, preset);
      const snap = await snapshotAllChapters(page, projectA);
      for (const key of Object.keys(CHAPTERS) as ChapterKey[]) {
        expectSameFormatting(snap[key], baseline[key], `${preset.key} / ${key}`);
      }
      const row = matrixRow(snap);
      console.log(`[QA] MATRIX ${preset.key} ${JSON.stringify(row)}`);
      matrix.push({ preset: preset.key, status: 'PASS', row });
      const editor = await openChapterEditor(page, projectA, CHAPTERS.prologo);
      await editor.screenshot({ path: evidencePath('preset-cycle', `after-${preset.key}.png`) });
    }

    // Finish the matrix on Personalizado and verify the full baseline again
    await selectPresetAndSave(page, projectA, PRESETS[0]);
    const finalCustom = await snapshotAllChapters(page, projectA);
    for (const key of Object.keys(CHAPTERS) as ChapterKey[]) {
      expectSameFormatting(finalCustom[key], baseline[key], `final Personalizado / ${key}`);
    }
    matrix.push({ preset: 'final-custom', status: 'PASS', row: matrixRow(finalCustom) });

    // SAVE → REAL RELOAD → REOPEN (persisted state, all chapters)
    await page.reload();
    const afterReload = await snapshotAllChapters(page, projectA);
    for (const key of Object.keys(CHAPTERS) as ChapterKey[]) {
      expectSameFormatting(afterReload[key], baseline[key], `save/reload / ${key}`);
    }
    matrix.push({ preset: 'save-reload', status: 'PASS', row: matrixRow(afterReload) });
    await (await openChapterEditor(page, projectA, CHAPTERS.prologo)).screenshot({ path: evidencePath('save-reload', 'after-reload.png') });

    // DELETE → REIMPORT — same ODT must rebuild identical geometry from source
    await deleteProjectByTitle(page, titleA);
    const projectB = await importFreshProject(page, `${QA_PROJECT_TITLE_PREFIX}B ${Date.now()}`);
    console.log(`[QA] reimported project B id=${projectB}`);
    expect(projectB).not.toBe(projectA);
    const reimport = await snapshotAllChapters(page, projectB);
    for (const key of Object.keys(CHAPTERS) as ChapterKey[]) {
      expectSameFormatting(reimport[key], baseline[key], `reimport / ${key}`);
    }
    matrix.push({ preset: 'delete-reimport', status: 'PASS', row: matrixRow(reimport) });
    await (await openChapterEditor(page, projectB, CHAPTERS.prologo)).screenshot({ path: evidencePath('final', 'after-reimport.png') });

    console.log(`[QA] FINAL MATRIX ${JSON.stringify(matrix)}`);
    expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);
  });

  test('editing operations and semantic blocks keep their source formatting', async ({ page }) => {
    test.setTimeout(300_000);
    expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);

    await signInAsQaIdentity(page);
    const projectId = await importFreshProject(page, `${QA_PROJECT_TITLE_PREFIX}E ${Date.now()}`);
    const editor = await openChapterEditor(page, projectId, CHAPTERS.prologo);
    const body1 = await paragraphByText(editor, 'La mayoría de las personas');
    expect(await textIndentPx(body1)).toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);

    await body1.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' [QA]');
    await page.keyboard.press('Enter');
    const splitPx = await editor.locator('p').evaluateAll((ps) => {
      const i = ps.findIndex((p) => p.textContent?.includes('[QA]') ?? false);
      const next = ps[i + 1];
      return next ? parseFloat(window.getComputedStyle(next).textIndent) : NaN;
    });
    expect(splitPx, 'split: new paragraph keeps indent').toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);
    await page.keyboard.press('Backspace');
    expect(await textIndentPx(await paragraphByText(editor, 'La mayoría de las personas')), 'merge keeps indent').toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);
    await page.keyboard.press('Control+z');
    expect(await textIndentPx(await paragraphByText(editor, 'La mayoría de las personas')), 'undo keeps indent').toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);
    await page.keyboard.press('Control+Shift+z');
    expect(await textIndentPx(await paragraphByText(editor, 'La mayoría de las personas')), 'redo keeps indent').toBeCloseTo(SOURCE_BODY_INDENT_PX, 0);

    const quoteEditor = await openChapterEditor(page, projectId, CHAPTERS.notaEditorial);
    const quote = await paragraphByText(quoteEditor, 'Una herramienta editorial fiable');
    expect(await textIndentPx(quote), 'quote keeps source 0in').toBe(0);
    await quoteEditor.screenshot({ path: evidencePath('final', 'quote.png') });

    const listEditor = await openChapterEditor(page, projectId, CHAPTERS.capitulo1);
    const listItem = await requireSingle(listEditor.locator('li').filter({ hasText: 'Cuenta cuántas veces' }), 'list item');
    expect(await textIndentPx(listItem.locator('p').first()), 'list item text-indent').toBe(0);
    await listEditor.screenshot({ path: evidencePath('final', 'list.png') });

    const biblioEditor = await openChapterEditor(page, projectId, CHAPTERS.bibliografia);
    const biblio = await paragraphByText(biblioEditor, 'Csikszentmihalyi');
    const hang = await biblio.evaluate((el) => ({
      first: parseFloat(window.getComputedStyle(el).textIndent),
      left: parseFloat(window.getComputedStyle(el).marginLeft),
    }));
    expect(hang.first, 'hanging first line').toBeCloseTo(-BIBLIO_HANG_PX, 0);
    expect(hang.left, 'hanging left margin').toBeCloseTo(BIBLIO_HANG_PX, 0);
    await biblioEditor.screenshot({ path: evidencePath('final', 'bibliography-hanging.png') });

    expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);
  });
});
