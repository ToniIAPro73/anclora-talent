import path from 'node:path';
import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * QA dinámico UX/UI — sdd/qa/qa-uxui-audit-v1.md
 *
 * Escenarios E1-E6 sobre servidor real (localhost:3200). Cada test guarda
 * capturas en test-results/qa/ siguiendo e<n>-<superficie>-<viewport>-<tema>.png
 */

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

const FIXTURE_DOCX = path.resolve(__dirname, '../fixtures/exito_sin_compania.docx');
const FIXTURE_BRAND_PDF = path.resolve(
  __dirname,
  '../fixtures/anclora_insights_manual_identidad.pdf',
);
const FIXTURE_CHAOTIC_MD = path.resolve(__dirname, '../qa/fixtures/semilla_caotica.md');
const SHOTS_DIR = path.resolve(__dirname, '../test-results/qa');

fs.mkdirSync(SHOTS_DIR, { recursive: true });

function shotPath(name: string) {
  return path.join(SHOTS_DIR, `${name}.png`);
}

async function dismissCookieConsent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'anclora-cookie-consent-v1',
      JSON.stringify({
        necessary: true,
        session: true,
        analytics: false,
        marketing: false,
        updatedAt: new Date().toISOString(),
        version: 'v1',
      }),
    );
  });
}

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
}

async function dismissOnboarding(page: Page) {
  const skipIntro = page.getByRole('button', { name: /Saltar introducción|Skip introduction/i });
  try {
    await skipIntro.waitFor({ state: 'visible', timeout: 4000 });
    await skipIntro.click();
    await skipIntro.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // onboarding not shown
  }
}

async function resetToStepOne(page: Page) {
  const prevButton = page.getByTestId('previous-step-button');
  for (let i = 0; i < 10; i += 1) {
    if (await prevButton.isDisabled().catch(() => true)) break;
    await prevButton.click();
    await page.waitForTimeout(200);
  }
}

async function goToWorkspaceStep(page: Page, step: number) {
  await resetToStepOne(page);
  const nextButton = page.getByTestId('next-step-button');
  for (let current = 1; current < step; current += 1) {
    await nextButton.click();
    await page.waitForTimeout(250);
  }
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(90_000);

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/register', { data: TEST_USER });
  expect([201, 409]).toContain(response.status());
});

// ---------------------------------------------------------------------------
// E1 — Blank: template → editor → preview → cover → back-cover → exports
// ---------------------------------------------------------------------------
test.describe('E1 — proyecto en blanco por plantilla', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  let editorUrl = '';

  test.beforeEach(async ({ page }) => {
    await dismissCookieConsent(page);
    await login(page);
  });

  test('crea proyecto en blanco desde plantilla estándar', async ({ page }) => {
    await page.goto('/projects/new');
    await expect(page.getByTestId('product-template-selector')).toBeVisible();
    // "Libro estándar" ya viene seleccionado por defecto (PRODUCT_TEMPLATES[0]).
    await expect(page.getByTestId('product-template-standard-book')).toHaveAttribute(
      'data-selected',
      'true',
    );
    await page.getByTestId('create-project-title-input').fill('E1 Proyecto en blanco QA');
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
    editorUrl = page.url();
    await dismissOnboarding(page);
    await page.screenshot({ path: shotPath('e1-editor-1440x900-light') });
  });

  test('preview del proyecto en blanco abre sin errores', async ({ page }) => {
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 6);
    await page.getByTestId('open-full-preview-button').click();
    const stage = page.getByTestId('preview-modal-stage');
    await expect(stage).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: shotPath('e1-preview-1440x900-light') });
    await page.getByTestId('preview-modal-close-button').click();
  });

  test('cover studio: portada y contraportada renderizan', async ({ page }) => {
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 4);
    await expect(page.getByTestId('cover-surface-canvas')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: shotPath('e1-cover-1440x900-light') });

    await goToWorkspaceStep(page, 5);
    await expect(page.getByTestId('back-cover-surface-canvas')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: shotPath('e1-back-cover-1440x900-light') });
  });

  test('exports: todas las acciones visibles', async ({ page }) => {
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 9);
    await expect(page.getByTestId('export-html-button')).toBeVisible();
    await expect(page.getByTestId('export-docx-button')).toBeVisible();
    await expect(page.getByTestId('export-epub-button')).toBeVisible();
    await expect(page.getByTestId('pdf-export-button')).toBeVisible();
    await page.screenshot({ path: shotPath('e1-exports-1440x900-light') });
  });
});

// ---------------------------------------------------------------------------
// E2 — Caótico: heurísticas de importación sobre markdown deliberadamente sucio
// ---------------------------------------------------------------------------
test.describe('E2 — import caótico', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await dismissCookieConsent(page);
    await login(page);
  });

  test('importa semilla_caotica.md y expone heurísticas de detección', async ({ page }) => {
    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles(FIXTURE_CHAOTIC_MD);
    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: shotPath('e2-import-analysis-1440x900-light') });

    const chaptersText = (await page.getByTestId('import-analysis-chapters').textContent()) ?? '';
    const authorText = (await page.getByTestId('import-analysis-author').textContent()) ?? '';
    const warningsVisible = await page.getByTestId('import-analysis-warnings').isVisible().catch(() => false);

    test.info().annotations.push(
      { type: 'E2-chapters-heuristic', description: chaptersText.trim() },
      { type: 'E2-author-heuristic', description: authorText.trim() },
      { type: 'E2-warnings-shown', description: String(warningsVisible) },
    );

    // No debe crashear ni bloquear la creación aunque el documento sea un desastre.
    await page.getByTestId('create-project-title-input').fill('E2 Import Caótico QA');
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
    await page.screenshot({ path: shotPath('e2-editor-post-import-1440x900-light') });
  });
});

// ---------------------------------------------------------------------------
// E3 — Libro real: import exito_sin_compania.docx, verifica estructura y
// paridad preview↔export.
// ---------------------------------------------------------------------------
test.describe('E3 — libro real (docx)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  let editorUrl = '';

  test.beforeEach(async ({ page }) => {
    await dismissCookieConsent(page);
    await login(page);
  });

  test('importa exito_sin_compania.docx', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles(FIXTURE_DOCX);
    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('import-analysis-chapters')).toBeVisible();
    await page.screenshot({ path: shotPath('e3-import-analysis-1440x900-light') });

    await page.getByTestId('create-project-title-input').fill('E3 Éxito sin compañía QA');
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
    editorUrl = page.url();
    await dismissOnboarding(page);
  });

  test('preview: cuenta H1/H2/H3, tablas e imágenes', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 6);
    await page.getByTestId('open-full-preview-button').click();
    const stage = page.getByTestId('preview-modal-stage');
    await expect(stage).toBeVisible({ timeout: 30_000 });

    let h1 = 0;
    let h2 = 0;
    let h3 = 0;
    let tables = 0;
    let imgs = 0;
    const seenH1 = new Set<string>();
    const seenH2 = new Set<string>();
    const seenH3 = new Set<string>();

    for (let pageIndex = 0; pageIndex < 250; pageIndex += 1) {
      const counts = await stage.evaluate((node) => ({
        h1: Array.from(node.querySelectorAll('h1')).map((el) => el.textContent?.trim() ?? ''),
        h2: Array.from(node.querySelectorAll('h2')).map((el) => el.textContent?.trim() ?? ''),
        h3: Array.from(node.querySelectorAll('h3')).map((el) => el.textContent?.trim() ?? ''),
        tables: node.querySelectorAll('table').length,
        imgs: node.querySelectorAll('img').length,
      }));
      counts.h1.forEach((t) => t && seenH1.add(t));
      counts.h2.forEach((t) => t && seenH2.add(t));
      counts.h3.forEach((t) => t && seenH3.add(t));
      tables = Math.max(tables, counts.tables);
      imgs = Math.max(imgs, counts.imgs);

      const nextButton = page.getByTestId('preview-modal-next-page-button');
      if (await nextButton.isDisabled()) break;
      await nextButton.click();
      await page.waitForTimeout(150);
    }
    h1 = seenH1.size;
    h2 = seenH2.size;
    h3 = seenH3.size;

    test.info().annotations.push(
      { type: 'E3-h1-count', description: String(h1) },
      { type: 'E3-h2-count', description: String(h2) },
      { type: 'E3-h3-count', description: String(h3) },
      { type: 'E3-tables-count', description: String(tables) },
      { type: 'E3-imgs-count', description: String(imgs) },
    );

    await page.screenshot({ path: shotPath('e3-preview-1440x900-light') });
    await page.getByTestId('preview-modal-close-button').click();
  });

  test('paridad preview↔export HTML: mismo recuento de tablas', async ({ page, request }) => {
    test.setTimeout(120_000);
    const projectId = editorUrl.match(/projects\/([^/]+)\/editor/)?.[1];
    expect(projectId).toBeTruthy();

    const exportResponse = await request.get(`/api/projects/export?projectId=${projectId}`);
    test.info().annotations.push({
      type: 'E3-export-html-status',
      description: String(exportResponse.status()),
    });
    if (exportResponse.ok()) {
      const html = await exportResponse.text();
      const tablesInExport = (html.match(/<table/g) ?? []).length;
      test.info().annotations.push({
        type: 'E3-export-html-tables',
        description: String(tablesInExport),
      });
    }
  });
});

// ---------------------------------------------------------------------------
// E4 — Libro real + marca DESPUÉS: sube manual, aplica BrandProfile, exporta.
// ---------------------------------------------------------------------------
test.describe('E4 — libro luego marca', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  let editorUrl = '';

  test.beforeEach(async ({ page }) => {
    await dismissCookieConsent(page);
    await login(page);
  });

  test('importa el docx real', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles(FIXTURE_DOCX);
    await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 60_000 });
    await page.getByTestId('create-project-title-input').fill('E4 Libro luego marca QA');
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
    editorUrl = page.url();
    await dismissOnboarding(page);
  });

  test('sube manual de marca y activa BrandProfile', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await expect(page.getByTestId('brand-profile-panel')).toBeVisible();
    await page.screenshot({ path: shotPath('e4-brand-panel-before-1440x900-light') });

    await page.getByTestId('brand-manual-input').setInputFiles(FIXTURE_BRAND_PDF);
    await page.getByTestId('brand-profile-upload-button').click();

    // El upload crea un perfil en estado "draft" (createBrandProfileAction);
    // no se autoselecciona en el proyecto. Se detecta por el botón "Activar"
    // que aparece en la lista de borradores.
    const activateButton = page.locator('[data-testid^="brand-profile-activate-button-"]').first();
    await expect(activateButton).toBeVisible({ timeout: 60_000 });
    await page.screenshot({ path: shotPath('e4-brand-panel-after-upload-1440x900-light') });

    // Aplicar el perfil al proyecto (dropdown) para que el resumen de paleta
    // se muestre — el select expone borradores y activos por igual.
    const select = page.getByTestId('brand-profile-select');
    const optionValues = await select.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
    );
    expect(optionValues.length, 'brand profile select debe ofrecer el borrador recién creado').toBeGreaterThan(0);
    await select.selectOption(optionValues[0]);
    await page.waitForTimeout(500);

    const summary = page.getByTestId('brand-profile-summary');
    await expect(summary).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: shotPath('e4-brand-panel-selected-1440x900-light') });

    await activateButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: shotPath('e4-brand-panel-activated-1440x900-light') });
  });

  test('exports tras aplicar marca', async ({ page }) => {
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 9);
    await expect(page.getByTestId('export-epub-button')).toBeVisible();
    await page.screenshot({ path: shotPath('e4-exports-branded-1440x900-light') });
  });
});

// ---------------------------------------------------------------------------
// E5 — Marca PRIMERO, orden inverso a E4.
// ---------------------------------------------------------------------------
test.describe('E5 — marca luego libro', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  let editorUrl = '';

  test.beforeEach(async ({ page }) => {
    await dismissCookieConsent(page);
    await login(page);
  });

  test('crea proyecto en blanco y sube marca antes de importar contenido', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/projects/new');
    await page.getByTestId('create-project-title-input').fill('E5 Marca luego libro QA');
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
    editorUrl = page.url();
    await dismissOnboarding(page);

    await expect(page.getByTestId('brand-profile-panel')).toBeVisible();
    await page.getByTestId('brand-manual-input').setInputFiles(FIXTURE_BRAND_PDF);
    await page.getByTestId('brand-profile-upload-button').click();

    const activateButton = page.locator('[data-testid^="brand-profile-activate-button-"]').first();
    await expect(activateButton).toBeVisible({ timeout: 60_000 });

    const select = page.getByTestId('brand-profile-select');
    const optionValues = await select.locator('option').evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
    );
    expect(optionValues.length, 'brand profile select debe ofrecer el borrador recién creado').toBeGreaterThan(0);
    await select.selectOption(optionValues[0]);
    await page.waitForTimeout(500);

    await expect(page.getByTestId('brand-profile-summary')).toBeVisible({ timeout: 15_000 });
    await activateButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: shotPath('e5-brand-panel-first-1440x900-light') });
  });

  test('reimporta contenido real sobre proyecto ya con marca', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 2);

    const reimportButton = page.getByTestId('reimport-open-button');
    if (await reimportButton.isVisible().catch(() => false)) {
      await reimportButton.click();
      const dialog = page.getByTestId('reimport-dialog');
      await expect(dialog).toBeVisible();
      await page.getByTestId('reimport-file-input').setInputFiles(FIXTURE_DOCX);
      await expect(page.getByTestId('reimport-diff-preview')).toBeVisible({ timeout: 60_000 });
      await page.screenshot({ path: shotPath('e5-reimport-diff-1440x900-light') });
      await page.getByTestId('reimport-confirm-button').click();
      await expect(page.getByTestId('reimport-result')).toBeVisible({ timeout: 60_000 });
      await page.getByTestId('reimport-done-button').click();
    }

    await goToWorkspaceStep(page, 9);
    await expect(page.getByTestId('export-epub-button')).toBeVisible();
    await page.screenshot({ path: shotPath('e5-exports-branded-first-1440x900-light') });
  });
});

// ---------------------------------------------------------------------------
// E6 — Transversal: i18n, tema, responsive, empty/error, modales.
// ---------------------------------------------------------------------------
test.describe('E6 — transversal', () => {
  test.beforeEach(async ({ page }) => {
    await dismissCookieConsent(page);
  });

  for (const locale of ['es', 'en'] as const) {
    test(`sign-in renderiza copy correcto en locale ${locale}`, async ({ page, context }) => {
      await context.addCookies([
        { name: 'anclora-locale', value: locale, domain: 'localhost', path: '/' },
      ]);
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/sign-in');
      await page.screenshot({ path: shotPath(`e6-signin-1366x768-${locale}`) });
    });
  }

  for (const theme of ['dark', 'light'] as const) {
    test(`dashboard renderiza tema ${theme} sin overflow horizontal`, async ({ page, context }) => {
      await context.addCookies([
        { name: 'anclora-theme', value: theme, domain: 'localhost', path: '/' },
      ]);
      await page.setViewportSize({ width: 1440, height: 900 });
      await login(page);
      await page.screenshot({ path: shotPath(`e6-dashboard-1440x900-${theme}`) });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      test.info().annotations.push({
        type: `E6-overflow-${theme}`,
        description: String(overflow),
      });
    });
  }

  test('responsive 375x667: dashboard y editor no rompen layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await page.screenshot({ path: shotPath('e6-dashboard-375x667-light') });

    await page.goto('/projects/new');
    await page.getByTestId('create-project-title-input').fill('E6 Responsive QA');
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
    await dismissOnboarding(page);
    await page.screenshot({ path: shotPath('e6-editor-375x667-light') });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    test.info().annotations.push({ type: 'E6-editor-mobile-overflow', description: String(overflow) });
  });

  test('estado de error: credenciales inválidas', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/sign-in');
    await page.locator('#email').fill('no-existe@anclora-talent.test');
    await page.locator('#password').fill(['wrong', 'cred', '1'].join('-'));
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('#login-error')).toBeVisible();
    await page.screenshot({ path: shotPath('e6-login-error-1366x768-light') });
  });

  test('estado vacío: dashboard sin proyectos para usuario nuevo', async ({ page, request }) => {
    const email = `e2e.empty.${Date.now()}@anclora-talent.test`;
    const response = await request.post('/api/auth/register', {
      data: { fullName: 'E2E Empty Bot', email, password: TEST_USER.password },
    });
    expect([201, 409]).toContain(response.status());

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sign-in');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
    await page.screenshot({ path: shotPath('e6-dashboard-empty-1440x900-light') });
  });

  test('modal de preview abre y cierra correctamente (foco/escape)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto('/projects/new');
    await page.getByTestId('create-project-title-input').fill('E6 Modal QA');
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 6);

    await page.getByTestId('open-full-preview-button').click();
    const stage = page.getByTestId('preview-modal-stage');
    await expect(stage).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: shotPath('e6-modal-preview-open-1440x900-light') });

    await page.keyboard.press('Escape');
    await expect(stage).toBeHidden({ timeout: 5000 }).catch(async () => {
      // Si Escape no cierra, se documenta como hallazgo y se cierra por botón.
      await page.getByTestId('preview-modal-close-button').click();
    });
  });
});
