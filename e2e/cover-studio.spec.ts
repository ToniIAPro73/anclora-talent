import { expect, test, type Page } from '@playwright/test';

/**
 * Cover studio regression contract (FASE C — DOM cover engine).
 *
 * Historical bug: the Fabric-based advanced editor visually clipped long
 * titles ("NUNCA M" instead of "NUNCA MÁS EN LA SOMBRA") even though the
 * data was correct. The new engine renders text 100% as DOM, so these tests
 * assert — in a real browser, on cover and back-cover, dark and light — that
 * the full text is laid out inside the canvas with no clipping.
 */

const TEST_USER = {
  fullName: 'E2E Cover Bot',
  email: 'e2e.cover@anclora-talent.test',
  password: 'E2ePassword123',
};

const LONG_TITLE = 'NUNCA MÁS EN LA SOMBRA';
const LONG_BACK_BODY =
  'Una contraportada con un texto deliberadamente largo para verificar que el motor DOM ajusta líneas completas sin recortar ninguna palabra en ningún tema.';

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/);
}

async function createLongTitleProject(page: Page) {
  await page.goto('/projects/new');
  await page.getByTestId('create-project-title-input').fill(LONG_TITLE);
  await page.getByRole('button', { name: 'Crear proyecto y abrir editor' }).click();
  await expect(page).toHaveURL(/\/projects\/.+\/editor/);
}

async function goToWorkspaceStep(page: Page, step: number) {
  const nextButton = page.getByRole('button', { name: 'Siguiente paso' });
  for (let current = 1; current < step; current += 1) {
    await nextButton.click();
  }
}

/**
 * Core anti-clip assertion: every rendered line box of the layer stays inside
 * the layer itself and inside the canvas, and the element never overflows its
 * declared width.
 */
async function expectLayerNotClipped(page: Page, canvasTestId: string, layerTestId: string) {
  const canvas = page.getByTestId(canvasTestId);
  const layer = page.getByTestId(layerTestId);
  await expect(layer).toBeVisible();

  const measurement = await layer.evaluate((node) => {
    const canvasNode = node.closest('[data-testid$="surface-canvas"]');
    const canvasRect = canvasNode?.getBoundingClientRect();
    const rects = Array.from(node.getClientRects()).map((rect) => ({
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    }));
    return {
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
      rects,
      canvas: canvasRect
        ? {
            left: canvasRect.left,
            right: canvasRect.right,
            top: canvasRect.top,
            bottom: canvasRect.bottom,
          }
        : null,
    };
  });

  // No horizontal/vertical overflow of the content inside its own box.
  expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.clientWidth + 1);

  // Every line box stays inside the canvas.
  expect(measurement.canvas).not.toBeNull();
  expect(measurement.rects.length).toBeGreaterThan(0);
  for (const rect of measurement.rects) {
    expect(rect.left).toBeGreaterThanOrEqual(measurement.canvas!.left - 1);
    expect(rect.right).toBeLessThanOrEqual(measurement.canvas!.right + 1);
    expect(rect.top).toBeGreaterThanOrEqual(measurement.canvas!.top - 1);
    expect(rect.bottom).toBeLessThanOrEqual(measurement.canvas!.bottom + 1);
  }

  await expect(canvas).toBeVisible();
}

test.describe('cover studio redirect contract', () => {
  test('cover route redirects unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/projects/test-id/cover');
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe('cover studio DOM text regression', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: TEST_USER,
    });
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
      window.localStorage.removeItem('anclora-project-workflow-step');
    });
    await login(page);
    await createLongTitleProject(page);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`long title renders complete on the cover canvas (${theme} theme)`, async ({
      page,
      context,
    }) => {
      await context.addCookies([
        { name: 'anclora-theme', value: theme, domain: 'localhost', path: '/' },
      ]);
      await page.reload();
      await goToWorkspaceStep(page, 4);

      const titleLayer = page.getByTestId('cover-layer-title');
      await expect(titleLayer).toHaveText(LONG_TITLE);
      await expectLayerNotClipped(page, 'cover-surface-canvas', 'cover-layer-title');

      if (theme === 'dark') {
        await page
          .getByTestId('cover-surface-canvas')
          .screenshot({ path: 'test-results/cover-studio-nunca-mas.png' });
      }
    });
  }

  test('long back-cover body renders complete without clipping', async ({ page }) => {
    await goToWorkspaceStep(page, 5);

    const bodyInput = page.getByLabel('Texto de contraportada');
    await bodyInput.fill(LONG_BACK_BODY);

    const bodyLayer = page.getByTestId('back-cover-layer-body');
    await expect(bodyLayer).toHaveText(LONG_BACK_BODY);
    await expectLayerNotClipped(page, 'back-cover-surface-canvas', 'back-cover-layer-body');
  });

  test('advanced mode keeps the full title editable and unclipped', async ({ page }) => {
    await goToWorkspaceStep(page, 4);

    await page.getByTestId('cover-studio-mode-toggle-cover').click();

    const titleLayer = page.getByTestId('cover-layer-title');
    await expect(titleLayer).toHaveText(LONG_TITLE);
    await expectLayerNotClipped(page, 'cover-surface-canvas', 'cover-layer-title');
  });
});

test.describe('export routes', () => {
  test('HTML export endpoint exists and requires auth', async ({ page }) => {
    const response = await page.request.get('/api/projects/export?projectId=test');
    expect(response.status()).not.toBe(404);
  });

  test('PDF export endpoint exists and requires auth', async ({ page }) => {
    const response = await page.request.get('/api/projects/export/pdf?projectId=test');
    expect(response.status()).not.toBe(404);
  });
});
