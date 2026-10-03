import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { getSelectableFontCatalog, resolveFont, type FontCatalogEntry } from '../src/lib/style-engine/font-registry';

const ODT_PATH = path.resolve(__dirname, '../docs/manuscritos/ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt');
const EXPECTED_ODT_SHA256 = '2bfe326db07b46a85e9c70fc27c1dc7ba8595952f2938675256c9d92255698e8';
const QA_EMAIL = 'e2e.auth@anclora-talent.test';
const EVIDENCE_ROOT = path.resolve(__dirname, '../tmp/qa-evidence/font-catalog');
const BODY_P1 = 'La mayoría de las personas no necesita';

const SELECTABLE: FontCatalogEntry[] = getSelectableFontCatalog();

type MatrixRow = {
  font: string;
  category: string;
  sourceType: string;
  license: string;
  selectable: boolean;
  loadStatus: string;
  requested: string;
  effective: string;
  resolution: string;
  toolbarSync: boolean;
  typeText: boolean;
  saveReload: boolean;
  undoRedo: boolean;
  status: string;
};

const matrix: MatrixRow[] = [];
let projectId = '';

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function slug(family: string): string {
  return family.replace(/\s+/g, '-').toLowerCase();
}

async function requireSingle(locator: Locator, label: string): Promise<Locator> {
  await expect(locator, `${label} must exist exactly once`).toHaveCount(1, { timeout: 15_000 });
  return locator;
}

async function signIn(page: Page) {
  const password = process.env.E2E_AUTH_PASSWORD;
  expect(password, 'E2E_AUTH_PASSWORD must be set in .env.local').toBeTruthy();
  await page.addInitScript(() => {
    window.localStorage.setItem('anclora-cookie-consent-v1', JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' }));
    window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
  });
  await page.goto('/sign-in');
  await page.locator('#email').fill(QA_EMAIL);
  await page.locator('#password').fill(password as string);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 20_000 });
}

async function importFreshProject(page: Page): Promise<string> {
  await page.goto('/projects/new');
  await (await requireSingle(page.locator('#project-title'), 'project title input')).fill(`Font Catalog QA ${Date.now()}`);
  await page.locator('[data-testid="source-document-input"]').setInputFiles(ODT_PATH);
  const docDataSave = await requireSingle(page.locator('[data-testid="document-data-save-button"]'), 'document data save');
  await docDataSave.click();
  await expect(docDataSave).toBeHidden({ timeout: 15_000 });
  await (await requireSingle(page.locator('[data-testid="create-project-submit-button"]'), 'create project submit')).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/editor/, { timeout: 60_000 });
  return page.url().match(/\/projects\/([a-f0-9-]+)\//)?.[1] ?? '';
}

async function openProloguEditor(page: Page): Promise<Locator> {
  await page.goto(`/projects/${projectId}/editor`);
  await (await requireSingle(page.locator('.ac-stepper__trigger').nth(1), 'chapters step')).click();
  const prologo = page.locator('[data-testid^="chapter-organizer-button-"]').filter({ hasText: /Prólogo/ });
  await expect(prologo, 'Prólogo must exist exactly once').toHaveCount(1, { timeout: 15_000 });
  const surface = page.locator('[data-testid="chapter-editor-workspace"] .ProseMirror');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await prologo.click();
    await (await requireSingle(page.locator('[data-testid="chapter-open-button"]'), 'open chapter editor')).click();
    if (await surface.count() === 1 || await surface.waitFor({ state: 'attached', timeout: 15_000 }).then(() => true, () => false)) {
      break;
    }
  }
  await expect(surface, 'editor surface must exist exactly once').toHaveCount(1, { timeout: 15_000 });
  return surface;
}

/** Real load check: width with the family differs from the generic fallback only when the face is actually available. */
async function familyRenders(page: Page, family: string): Promise<boolean> {
  return page.evaluate(async (fam) => {
    await document.fonts.load(`400 72px "${fam}"`).catch(() => undefined);
    const loadedFace = Array.from(document.fonts).some(
      (face) => face.family.replace(/["']/g, '') === fam && face.status === 'loaded',
    );
    return loadedFace;
  }, family);
}

async function systemFamilyAvailable(page: Page, family: string): Promise<boolean> {
  return page.evaluate((fam) => {
    const sample = 'Mmwwii0123456789 Aa Qq Gg';
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return false;
    ctx.font = '72px "__talent_missing_family__", monospace';
    const fallback = ctx.measureText(sample).width;
    ctx.font = `72px "${fam}", "__talent_missing_family__"`;
    return ctx.measureText(sample).width !== fallback;
  }, family);
}

async function waitForRender(page: Page, family: string, timeoutMs: number): Promise<boolean> {
  try {
    await expect.poll(() => familyRenders(page, family), { timeout: timeoutMs, intervals: [250, 500, 1000] }).toBe(true);
    return true;
  } catch {
    return false;
  }
}

async function computedFamilyOfMarkedSpan(paragraph: Locator): Promise<string> {
  return paragraph.evaluate((p) => {
    const span = Array.from(p.querySelectorAll('span')).find((s) => (s.getAttribute('style') ?? '').includes('font-family'));
    return span ? window.getComputedStyle(span).fontFamily : '';
  });
}

const SESSION_FILE = path.resolve(__dirname, '../tmp/qa-auth/font-matrix-storage.json');

async function loadSession(page: Page) {
  await page.context().addCookies(JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')).cookies);
  await page.addInitScript(() => {
    window.localStorage.setItem('anclora-cookie-consent-v1', JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' }));
    window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
  });
}

test.describe('Selectable font catalog — individual E2E matrix', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page);
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    await context.storageState({ path: SESSION_FILE });
    expect(sha256(ODT_PATH)).toBe(EXPECTED_ODT_SHA256);
    projectId = await importFreshProject(page);
    await context.close();
    fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  });

  test.afterAll(() => {
    fs.writeFileSync(path.join(EVIDENCE_ROOT, 'matrix.json'), JSON.stringify(matrix, null, 2));
    console.log(`[FONT-MATRIX] ${JSON.stringify(matrix)}`);
  });

  test.beforeEach(async ({ page }) => {
    await loadSession(page);
  });

  test('ODT fixture: body requested Liberation Serif resolves exact and renders', async ({ page }) => {
    const editor = await openProloguEditor(page);
    const body = await requireSingle(editor.locator('p').filter({ hasText: BODY_P1 }), 'body paragraph');
    const computed = await body.evaluate((p) => window.getComputedStyle(p).fontFamily);
    expect(computed).toContain('Liberation Serif');
    expect(resolveFont('Liberation Serif')).toMatchObject({ resolvedFamily: 'Liberation Serif', status: 'exact', delivery: 'bundled' });
    expect(await waitForRender(page, 'Liberation Serif', 15_000), 'Liberation Serif must actually render').toBe(true);
    expect(resolveFont('Calibri')).toMatchObject({ sourceFamily: 'Calibri', resolvedFamily: 'Carlito', status: 'compatible-substitute' });
    expect(resolveFont('Cambria')).toMatchObject({ sourceFamily: 'Cambria', resolvedFamily: 'Caladea', status: 'compatible-substitute' });
  });

  for (const font of SELECTABLE) {
    test(`font ${font.family} — ${font.category} — ${font.loadingStrategy}`, async ({ page }) => {
      test.setTimeout(90_000);
      const rowStarted = Date.now();
      const row: MatrixRow = {
        font: font.family,
        category: font.category,
        sourceType: font.loadingStrategy,
        license: font.license,
        selectable: font.selectable,
        loadStatus: 'NOT_RUN',
        requested: font.family,
        effective: '',
        resolution: resolveFont(font.family).status,
        toolbarSync: false,
        typeText: false,
        saveReload: false,
        undoRedo: false,
        status: 'FAIL',
      };
      matrix.push(row);

      const editor = await openProloguEditor(page);
      const body = await requireSingle(editor.locator('p').filter({ hasText: BODY_P1 }), 'body paragraph');
      await body.click({ clickCount: 3 });

      await (await requireSingle(page.getByTestId('editor-toolbar-font-family-button'), 'toolbar font button')).click();
      await (await requireSingle(page.getByTestId('editor-toolbar-font-search-input'), 'font search')).fill(font.family);
      await (await requireSingle(page.getByTestId(`font-option-${slug(font.family)}`), `font option ${font.family}`)).click();

      if (font.loadingStrategy === 'system') {
        row.loadStatus = (await systemFamilyAvailable(page, font.family)) ? 'SYSTEM_AVAILABLE' : 'SYSTEM_MISSING';
      } else {
        const rendered = await waitForRender(page, font.family, 40_000);
        row.loadStatus = rendered ? 'LOADED' : 'FALLBACK_USED';
      }
      row.toolbarSync = (await page.getByTestId('editor-toolbar-font-family-button').innerText()).includes(font.family);

      const marker = ` [${font.family}]`;
      await body.click();
      await page.keyboard.press('End');
      await page.keyboard.type(marker);
      row.typeText = (await body.textContent())?.includes(marker) ?? false;
      row.effective = await computedFamilyOfMarkedSpan(body);

      await page.keyboard.press('Control+z');
      row.undoRedo = !((await body.textContent()) ?? '').includes(marker);
      await page.keyboard.press('Control+Shift+z');
      row.undoRedo = row.undoRedo && (((await body.textContent()) ?? '').includes(marker));

      await (await requireSingle(page.locator('[data-testid="chapter-editor-header-save-button"]'), 'save button')).click();
      await page.waitForLoadState('networkidle');
      await page.reload();
      const reopened = await openProloguEditor(page);
      const reBody = await requireSingle(reopened.locator('p').filter({ hasText: marker.trim().slice(0, 12) }), 'reloaded paragraph');
      await expect.poll(async () => ((await reBody.textContent()) ?? '').includes(marker.trim()), { timeout: 20_000 }).toBe(true).catch(() => undefined);
      row.saveReload = ((await reBody.textContent()) ?? '').includes(marker.trim());
      row.effective = await computedFamilyOfMarkedSpan(reBody);

      const expectedFamily = font.family;
      const effectiveOk = row.effective.includes(expectedFamily);
      const pass = effectiveOk && row.toolbarSync && row.typeText && row.saveReload && row.undoRedo && ['LOADED', 'SYSTEM_AVAILABLE'].includes(row.loadStatus);
      const durationS = (Date.now() - rowStarted) / 1000;
      row.status = pass ? (durationS > 20 ? 'PASS_SLOW' : 'PASS') : 'FAIL';
      console.log(`[FONT-TIME] ${font.family} ${durationS.toFixed(1)}s ${row.status}`);
      await reopened.screenshot({ path: path.join(EVIDENCE_ROOT, `${slug(font.family)}.png`) });
      expect(row.loadStatus, `${font.family}: actual load status`).toMatch(/LOADED|SYSTEM_AVAILABLE/);
      expect(row.effective, `${font.family}: effective computed family`).toContain(expectedFamily);
      expect(row.toolbarSync, `${font.family}: toolbar sync`).toBe(true);
      expect(row.typeText, `${font.family}: typing`).toBe(true);
      expect(row.undoRedo, `${font.family}: undo/redo`).toBe(true);
      expect(row.saveReload, `${font.family}: save/reload persistence`).toBe(true);
    });
  }
});
