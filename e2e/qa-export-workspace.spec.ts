import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Step 8 — export workspace. Every format is generated through the UI AND the artifact is then parsed independently
// (HTTP 200 is not "export passed"). Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-export-workspace.spec.ts --reporter=list --workers=1

test.describe.configure({ mode: 'serial' });

const STAMP = Date.now();
let bookId = '';
let bookTitle = '';
let issuesId = '';
let issuesTitle = '';
let mdPath = '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'export-ws-'));

async function session(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAsQaIdentity(page);
  return { context, page };
}

async function openExport(page: Page, id: string) {
  await page.goto(`/projects/${id}/editor`);
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(7)).toBeVisible({ timeout: 30_000 });
  for (let i = 1; i <= 7 && (await triggers.nth(7).isDisabled()); i += 1) await triggers.nth(i).click();
  await triggers.nth(7).click();
  await expect(page.getByTestId('export-workspace')).toBeVisible({ timeout: 30_000 });
}

async function fetchArtifact(context: BrowserContext, url: string) {
  const response = await context.request.get(url);
  expect(response.status(), url).toBe(200);
  return { body: await response.body(), type: response.headers()['content-type'] ?? '' };
}

const words = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

async function exportViaUi(page: Page, format: string) {
  await page.getByTestId(`export-format-${format}`).click();
  await expect(page.getByTestId(`export-format-${format}`)).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('export-cta').click();
  await expect(page.getByTestId('export-result')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('export-result-validation')).toContainText('Verificado');
  return {
    name: (await page.getByTestId('export-result-name').innerText()).trim(),
    size: (await page.getByTestId('export-result-size').innerText()).trim(),
  };
}

/** Headings of the semantic document, from the Markdown export (the source of truth for order). */
function markdownHeadings(markdown: string) {
  const headings: string[] = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(/^#{1,2}\s+(.+)$/);
    if (match) headings.push(match[1].trim());
  }
  // Skip the book title (cover only) and the generated Índice title, which composed outputs do not print (reported separately).
  return [...new Set(headings)].filter((heading) => heading !== 'Índice').slice(1, 8);
}

function assertInOrder(haystackNormalized: string, headings: string[], label: string) {
  let cursor = 0;
  for (const heading of headings) {
    const index = haystackNormalized.indexOf(words(heading), cursor);
    expect(index, `${label}: heading "${heading}" present after the previous one`).toBeGreaterThanOrEqual(0);
    cursor = index + 1;
  }
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(300_000);
  mdPath = path.join(TMP, 'issues.md');
  fs.writeFileSync(mdPath, '# Mi libro\n\nIntroducción del libro con un texto suficientemente largo para ser un párrafo real.\n\n# Capítulo repetido\n\nPrimer texto del capítulo repetido, con contenido suficiente.\n\n# Capítulo repetido\n\nSegundo texto del capítulo repetido, con contenido suficiente.\n');
  const { context, page } = await session(browser);
  bookTitle = `Export WS book ${STAMP}`;
  bookId = await importFreshProject(page, bookTitle);
  issuesTitle = `Export WS issues ${STAMP}`;
  issuesId = await importFreshProject(page, issuesTitle, mdPath);
  await context.close();
});

test.afterAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const { context, page } = await session(browser);
  await deleteProjectByTitle(page, bookTitle).catch(() => undefined);
  await deleteProjectByTitle(page, issuesTitle).catch(() => undefined);
  await context.close();
  fs.rmSync(TMP, { recursive: true, force: true });
});

test('A/B/D/E/F. shell without legacy rail; formats; format-specific configuration', async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await session(browser);
  await openExport(page, bookId);
  await expect(page.getByTestId('chapter-workflow-stepper')).toBeVisible();
  await expect(page.getByTestId('previous-step-button')).toHaveCount(0);
  await expect(page.getByTestId('next-step-button')).toHaveCount(0);
  await expect(page.getByText(/^Progreso$/)).toHaveCount(0);
  await expect(page.getByTestId('export-step-workspace')).toBeVisible();
  // Old button row is gone.
  for (const id of ['export-html-button', 'export-docx-button', 'export-epub-button', 'export-markdown-button']) await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(5);
  for (const id of ['pdf', 'epub', 'docx', 'html', 'markdown']) await expect(page.getByTestId(`export-format-${id}`)).toBeEnabled();
  await expect(page.getByTestId('export-format-pdf')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('export-page-size')).toBeVisible();
  await expect(page.getByTestId('export-cta')).toContainText('Exportar PDF');
  await page.screenshot({ path: 'test-results/export-ws-01-pdf.png' });

  await page.getByTestId('export-format-epub').click();
  await expect(page.getByTestId('export-page-size')).toHaveCount(0);
  await expect(page.getByTestId('export-epub-note')).toContainText('reflowable');
  await page.screenshot({ path: 'test-results/export-ws-02-epub.png' });
  await page.getByTestId('export-format-docx').click();
  await expect(page.getByTestId('export-docx-note')).toContainText('la maquetación puede variar');
  await page.screenshot({ path: 'test-results/export-ws-03-docx.png' });
  await page.getByTestId('export-format-html').click();
  await expect(page.getByTestId('export-html-note')).toBeVisible();
  await page.getByTestId('export-format-markdown').click();
  await expect(page.getByTestId('export-markdown-note')).toBeVisible();

  // Metadata (I): canonical title, no inline editor.
  await expect(page.getByTestId('export-meta-title')).toContainText(/\S/);
  await page.getByTestId('export-format-pdf').click();
  // Final check rows are real and navigate (cover row → Portada).
  await expect(page.getByTestId('export-check-content')).toContainText('capítulos');
  await page.getByTestId('export-check-cover').click();
  await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
  await context.close();
});

test('K/P/Q. PDF: generated through the UI and parsed — pages, text, chapter order, cover and back cover images', async ({ browser }) => {
  test.setTimeout(240_000);
  const { context, page } = await session(browser);
  await openExport(page, bookId);
  const result = await exportViaUi(page, 'pdf');
  expect(result.name).toMatch(/\.pdf$/);
  await expect(page.getByTestId('export-recent-item')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/export-ws-04-result.png' });

  const md = await fetchArtifact(context, `/api/projects/export/markdown?projectId=${bookId}`);
  const headings = markdownHeadings(md.body.toString('utf8'));
  expect(headings.length).toBeGreaterThan(3);

  const pdf = await fetchArtifact(context, `/api/projects/export/pdf?projectId=${bookId}&device=laptop`);
  const file = path.join(TMP, 'book.pdf');
  fs.writeFileSync(file, pdf.body);
  const pages = Number(execFileSync('pdfinfo', [file]).toString().match(/Pages:\s+(\d+)/)?.[1] ?? 0);
  expect(pages).toBeGreaterThan(3);
  const text = execFileSync('pdftotext', ['-layout', file, '-']).toString();
  assertInOrder(words(text), headings, 'PDF');
  // Cover (first page) and back cover (last page) are images in the composed PDF.
  const images = execFileSync('pdfimages', ['-list', file]).toString().split('\n').slice(2).filter(Boolean).map((line) => Number(line.trim().split(/\s+/)[0]));
  expect(images).toContain(1);
  expect(images).toContain(pages);
  await context.close();
});

test('L/M/N/O/Q. DOCX, EPUB, HTML and Markdown: generated through the UI and parsed independently', async ({ browser }) => {
  test.setTimeout(300_000);
  const { context, page } = await session(browser);
  await openExport(page, bookId);
  const md = await fetchArtifact(context, `/api/projects/export/markdown?projectId=${bookId}`);
  const markdown = md.body.toString('utf8');
  const headings = markdownHeadings(markdown);

  // Markdown (O)
  const mdResult = await exportViaUi(page, 'markdown');
  expect(mdResult.name).toMatch(/\.md$/);
  expect(markdown.trim().length).toBeGreaterThan(200);
  expect(markdown).toMatch(/^#{1,2}\s/m);

  // DOCX (L): real text and chapter order in word/document.xml
  const docxResult = await exportViaUi(page, 'docx');
  expect(docxResult.name).toMatch(/\.docx$/);
  const docx = await fetchArtifact(context, `/api/projects/export/docx?projectId=${bookId}&device=laptop`);
  const docxZip = await JSZip.loadAsync(docx.body);
  const docxXml = await docxZip.file('word/document.xml')!.async('string');
  const docxText = [...docxXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1]).join(' ');
  expect(docxText.length).toBeGreaterThan(500);
  assertInOrder(words(docxText), headings, 'DOCX');
  expect(docxXml).toContain('<w:p');

  // EPUB (M): package structure and chapters
  const epubResult = await exportViaUi(page, 'epub');
  expect(epubResult.name).toMatch(/\.epub$/);
  const epub = await fetchArtifact(context, `/api/projects/export/epub?projectId=${bookId}`);
  const epubZip = await JSZip.loadAsync(epub.body);
  expect(Object.keys(epubZip.files)[0]).toBe('mimetype');
  expect((await epubZip.file('mimetype')!.async('string')).trim()).toBe('application/epub+zip');
  const container = await epubZip.file('META-INF/container.xml')!.async('string');
  const opfPath = container.match(/full-path="([^"]+)"/)![1];
  const opf = await epubZip.file(opfPath)!.async('string');
  expect(opf).toMatch(/<spine/);
  expect(opf).toMatch(/properties="[^"]*nav/);
  const epubText = (await Promise.all(epubZip.file(/\.x?html$/i).map((entry) => entry.async('string')))).join(' ').replace(/<[^>]+>/g, ' ');
  assertInOrder(words(epubText), headings.slice(0, 5), 'EPUB');

  // HTML (N)
  const htmlResult = await exportViaUi(page, 'html');
  expect(htmlResult.name).toMatch(/\.html$/);
  const html = (await fetchArtifact(context, `/api/projects/export?projectId=${bookId}&device=laptop`)).body.toString('utf8');
  expect(html).toMatch(/^\s*<!DOCTYPE html/i);
  expect(html).toMatch(/<\/html>\s*$/i);
  assertInOrder(words(html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')), headings, 'HTML');
  await expect(page.getByTestId('export-recent-item')).toHaveCount(4);
  await context.close();
});

test('P. cover and back cover recency: edits reach the exported PDF', async ({ browser }) => {
  test.setTimeout(300_000);
  const { context, page } = await session(browser);
  const imageHash = async (which: 'first' | 'last') => {
    const pdf = await fetchArtifact(context, `/api/projects/export/pdf?projectId=${bookId}&device=laptop`);
    const file = path.join(TMP, `recency-${which}.pdf`);
    fs.writeFileSync(file, pdf.body);
    const pages = Number(execFileSync('pdfinfo', [file]).toString().match(/Pages:\s+(\d+)/)?.[1] ?? 0);
    const target = which === 'first' ? 1 : pages;
    const prefix = path.join(TMP, `img-${which}-${Date.now()}`);
    execFileSync('pdfimages', ['-f', String(target), '-l', String(target), '-png', file, prefix]);
    const produced = fs.readdirSync(TMP).filter((name) => name.startsWith(path.basename(prefix)));
    expect(produced.length).toBeGreaterThan(0);
    return crypto.createHash('sha256').update(fs.readFileSync(path.join(TMP, produced.sort()[0]))).digest('hex');
  };

  const frontBefore = await imageHash('first');
  const backBefore = await imageHash('last');

  const editText = async (stepIndex: number, text: string) => {
    await openExport(page, bookId);
    await page.locator('.ac-stepper__trigger').nth(stepIndex).click();
    await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
    const rows = page.locator('[data-testid^="layer-select-"]:not([data-testid="layer-select-background"])');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      await rows.nth(i).click();
      if (await page.getByTestId('text-layer-content-input').isVisible().catch(() => false)) {
        await page.getByTestId('text-layer-content-input').fill(text);
        await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
        return;
      }
    }
    throw new Error('no text layer to edit');
  };
  await editText(2, `Portada actualizada ${STAMP}`);
  await editText(3, `Contraportada actualizada ${STAMP}`);
  expect(await imageHash('first')).not.toBe(frontBefore);
  expect(await imageHash('last')).not.toBe(backBefore);
  await context.close();
});

test('G/H/J. per-format gating with a blocking policy, warnings only, and AI disclosure from a real accepted operation', async ({ browser }) => {
  test.setTimeout(300_000);
  const { context, page } = await session(browser);
  await openExport(page, issuesId);
  // The import leaves no author: the KDP/Kobo preflight raises a real metadata error.
  const author = (await page.getByTestId('export-meta-author').innerText()).trim();
  const hasAuthorError = /Sin definir|Not set/.test(author);

  // Policy "warn": nothing blocks, counts are shown.
  await page.locator('.ac-stepper__trigger').nth(0).click();
  await page.getByTestId('content-tab-composicion').click();
  await page.getByTestId('composition-section-exportacion').click();
  await page.getByTestId('composition-export-gate-select').selectOption('warn');
  await page.getByTestId('composition-save-button').click();
  await expect(page.getByText(/guardad/i).first()).toBeVisible({ timeout: 15_000 });
  await openExport(page, issuesId);
  for (const id of ['pdf', 'epub', 'docx', 'html', 'markdown']) {
    await page.getByTestId(`export-format-${id}`).click();
    await expect(page.getByTestId('export-cta')).toBeEnabled();
  }

  // Policy "block": only the formats the real error affects are blocked.
  await page.locator('.ac-stepper__trigger').nth(0).click();
  await page.getByTestId('content-tab-composicion').click();
  await page.getByTestId('composition-section-exportacion').click();
  await page.getByTestId('composition-export-gate-select').selectOption('block');
  await page.getByTestId('composition-save-button').click();
  await expect(page.getByText(/guardad/i).first()).toBeVisible({ timeout: 15_000 });
  await openExport(page, issuesId);
  await page.getByTestId('export-format-html').click();
  await expect(page.getByTestId('export-cta')).toBeEnabled();
  await page.getByTestId('export-format-markdown').click();
  await expect(page.getByTestId('export-cta')).toBeEnabled();
  if (hasAuthorError) {
    await page.getByTestId('export-format-pdf').click();
    await expect(page.getByTestId('export-cta')).toBeDisabled();
    await expect(page.getByTestId('export-bar')).toHaveAttribute('data-state', 'blocked');
    await expect(page.getByTestId('export-format-issues')).toContainText(/autor/i);
    await page.screenshot({ path: 'test-results/export-ws-05-blocked.png' });
  }

  // AI disclosure (J): accept a real AI-attributed operation (coherence fix) in Step 7 → "Requiere declaración".
  await page.locator('.ac-stepper__trigger').nth(6).click();
  await page.getByTestId('ai-tool-coherence').click();
  await page.getByTestId('ai-run').click();
  await expect(page.getByTestId('ai-proposal-accept').first()).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('ai-proposal-accept').first().click();
  await expect(page.getByTestId('ai-proposal-applied').first()).toBeVisible({ timeout: 30_000 });
  await openExport(page, issuesId);
  await expect(page.getByTestId('export-check-ai')).toContainText('Requiere declaración');
  await expect(page.getByTestId('kdp-disclosure-badge')).toHaveAttribute('data-required', 'true');
  await page.screenshot({ path: 'test-results/export-ws-06-ai-disclosure.png' });
  await context.close();
});

test('S/U. responsive without overflow; keyboard format selection; announced status', async ({ browser }) => {
  test.setTimeout(150_000);
  const { context, page } = await session(browser);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 900, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openExport(page, bookId);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `no horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: 'test-results/export-ws-07-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openExport(page, bookId);
  await page.getByTestId('export-format-pdf').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('export-format-epub')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('export-format-epub')).toBeFocused();
  await expect(page.getByTestId('export-live')).toHaveAttribute('aria-live', 'polite');
  await context.close();
});
