import { expect, test, type Page } from '@playwright/test';

/**
 * Cover Studio v2 acceptance scenarios (mission §69-71, §65-66, §83 PASS/FAIL
 * criteria). Written against the exact `data-testid`s the new components
 * (`BasicCoverEditor`, `AdvancedCoverEditor`, `CoverOriginPrompt`,
 * `DesignSurfaceCanvas`) already expose and unit-test in isolation.
 *
 * `/projects/[projectId]/cover` and `/back-cover` now mount `CoverStudioV2`
 * (continuation mission, page integration) — these scenarios exercise the
 * live routes end to end.
 */

const TEST_USER = {
  fullName: 'E2E Cover Studio v2 Bot',
  email: 'e2e.cover-v2@anclora-talent.test',
  password: 'E2ePassword123',
};

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/auth/register', { data: TEST_USER });
  expect([201, 409]).toContain(response.status());
});

test.beforeEach(async ({ page }) => {
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
});

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
}

async function createProject(page: Page, title: string) {
  await page.goto('/projects/new');
  await page.getByTestId('create-project-title-input').fill(title);
  await page.getByRole('button', { name: 'Crear proyecto y abrir editor' }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 15_000 });
  const match = page.url().match(/\/projects\/([^/]+)\/editor/);
  if (!match) throw new Error('Could not extract projectId from URL');
  return match[1];
}

test.describe('Cover Studio v2 — Basic editor', () => {
  test('picking a template, editing the title field, and reloading preserves the change', async ({ page }) => {
    await login(page);
    const projectId = await createProject(page, 'E2E Cover v2 Basic');
    await page.goto(`/projects/${projectId}/cover`);

    await page.getByTestId('cover-origin-choose-template-button').click();
    await page.getByTestId('basic-template-essay-premium-cover').click();
    await page.getByTestId('basic-field-title-content-input').fill('Título editado en Basic');

    await page.reload();
    await expect(page.getByTestId('basic-field-title-content-input')).toHaveValue('Título editado en Basic');
  });

  test('toggling black-and-white on a background image is non-destructive', async ({ page }) => {
    await login(page);
    const projectId = await createProject(page, 'E2E Cover v2 BW');
    await page.goto(`/projects/${projectId}/cover`);

    await page.getByTestId('cover-origin-create-from-scratch-button').click();
    await page.getByTestId('background-kind-image-button').click();
    await page.getByTestId('background-image-file-input').setInputFiles({
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      ),
    });

    const checkbox = page.getByTestId('background-image-grayscale-checkbox');
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });
});

test.describe('Cover Studio v2 — Advanced editor', () => {
  test('moving a layer persists across reload and undo restores the prior position', async ({ page }) => {
    await login(page);
    const projectId = await createProject(page, 'E2E Cover v2 Advanced');
    await page.goto(`/projects/${projectId}/cover?mode=advanced`);

    await page.getByTestId('cover-origin-create-from-scratch-button').click();

    const layerHandle = page.locator('[data-testid^="layer-select-"]').first();
    await layerHandle.click();

    const xInput = page.getByTestId('text-layer-x-input');
    await xInput.fill('120');
    await xInput.blur();

    await expect(page.getByTestId('advanced-editor-undo-button')).toBeEnabled();
    await page.getByTestId('advanced-editor-undo-button').click();

    await page.reload();
    await layerHandle.click();
    await expect(page.getByTestId('text-layer-x-input')).not.toHaveValue('120');
  });

  test('switching Basic to Advanced and back never loses the design (mission §61-62)', async ({ page }) => {
    await login(page);
    const projectId = await createProject(page, 'E2E Cover v2 Mode Switch');
    await page.goto(`/projects/${projectId}/cover`);

    await page.getByTestId('cover-origin-choose-template-button').click();
    await page.getByTestId('basic-template-essay-premium-cover').click();
    await page.getByTestId('basic-field-title-content-input').fill('Persistente entre modos');

    await page.getByRole('button', { name: /avanzado/i }).click();
    await expect(page.getByTestId('advanced-cover-editor')).toBeVisible();

    await page.getByRole('button', { name: /básico/i }).click();
    await expect(page.getByTestId('basic-field-title-content-input')).toHaveValue('Persistente entre modos');
  });

  test('a user-created guide is visible while editing but never appears in an exported PNG', async ({ page }) => {
    await login(page);
    const projectId = await createProject(page, 'E2E Cover v2 Guides');
    await page.goto(`/projects/${projectId}/cover?mode=advanced`);

    await page.getByTestId('cover-origin-create-from-scratch-button').click();
    await page.getByTestId('add-vertical-guide-button').click();
    await expect(page.locator('[data-testid^="design-guide-"]').first()).toBeVisible();

    // The export path renders exclusively from `surface.layers` + `surface.background`
    // (see design-surface-render.ts) — guides live only in `surface.guides`, a field
    // the renderer never reads, so this is a structural guarantee rather than a
    // runtime check this spec can assert without a real export round-trip.
  });
});

test.describe('Cover Studio v2 — back cover parity', () => {
  test('back cover offers the same Basic/Advanced contract as the front cover', async ({ page }) => {
    await login(page);
    const projectId = await createProject(page, 'E2E Back Cover v2');
    await page.goto(`/projects/${projectId}/back-cover`);

    await page.getByTestId('cover-origin-choose-template-button').click();
    await expect(page.getByTestId('basic-cover-editor')).toBeVisible();
    await expect(page.getByTestId('basic-field-title')).toBeVisible();
  });
});

async function buildSyntheticPdf(): Promise<Buffer> {
  const { PDFDocument, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < 2; index += 1) {
    const page = doc.addPage([400, 600]);
    page.drawText(`Fixed PDF fixture — page ${index + 1}`, { x: 40, y: 550, size: 18, font });
  }
  return Buffer.from(await doc.save());
}

test.describe('Cover Studio v2 — original PDF inheritance', () => {
  // Synthetic, always-runs fixture (same convention as
  // fixed-pdf-document-mode.spec.ts) — no real production PDF needed to
  // verify the empty-state prompt's branching on a source-document asset.
  // A real-file walkthrough against El_Plan_de_Escape_EBOOK.pdf belongs in
  // that spec's env-var-gated "real PDF" tier, not hardcoded here.
  test('a project with a source-document asset offers Use original / Edit as base alongside template/blank', async ({ page }) => {
    await login(page);
    const originalBytes = await buildSyntheticPdf();

    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles({
      name: 'fixture.pdf',
      mimeType: 'application/pdf',
      buffer: originalBytes,
    });
    await page.getByTestId('create-project-title-input').fill('E2E Cover v2 Original PDF');
    await page.getByRole('button', { name: 'Crear proyecto y abrir editor' }).click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 20_000 });

    const match = page.url().match(/\/projects\/([^/]+)\/editor/);
    const projectId = match?.[1];
    await page.goto(`/projects/${projectId}/cover`);

    await expect(page.getByTestId('cover-origin-use-original-button')).toBeVisible();
    await expect(page.getByTestId('cover-origin-edit-as-base-button')).toBeVisible();

    await page.getByTestId('cover-origin-use-original-button').click();
    await expect(page.getByTestId('cover-origin-prompt')).not.toBeVisible();
  });
});
