import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * M2 — visual e2e with real imported content.
 *
 * Imports fixtures/exito_sin_compania.docx (14 tables, 39 list items,
 * 11 REFLEXIÓN / 10 EJERCICIO blocks) and verifies the imported content
 * renders correctly through editor → preview → export with no clipping
 * or overlap on content nodes. Runs against a production build:
 *   BASE_URL=http://localhost:3100 npx playwright test e2e/visual-import.spec.ts
 */

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

const FIXTURE_DOCX = path.resolve(__dirname, '../fixtures/exito_sin_compania.docx');

async function login(page: Page) {
  await page.goto('/sign-in');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/dashboard/);
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

async function importFixtureProject(page: Page) {
  await page.goto('/projects/new');
  await page.getByTestId('source-document-input').setInputFiles(FIXTURE_DOCX);
  await expect(page.getByTestId('import-analysis-panel')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('import-analysis-chapters')).toBeVisible();
  await page.getByTestId('create-project-title-input').fill('M2 Éxito sin compañía');
  await page.getByTestId('create-project-submit-button').click();
  // First import of a run can hit a cold Neon wake-up.
  await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 30_000 });
  await dismissOnboarding(page);
  return page.url();
}

async function resetToStepOne(page: Page) {
  const prevButton = page.getByTestId('previous-step-button');
  for (let i = 0; i < 8; i += 1) {
    if (await prevButton.isDisabled().catch(() => true)) break;
    await prevButton.click();
    await page.waitForTimeout(250);
  }
}

async function goToWorkspaceStep(page: Page, step: number) {
  await resetToStepOne(page);
  const nextButton = page.getByTestId('next-step-button');
  for (let current = 1; current < step; current += 1) {
    await nextButton.click();
    await page.waitForTimeout(300);
  }
}

/** Every table/list under `rootSelector` must fit horizontally inside its page surface. */
async function expectContentNodesNotClipped(page: Page, rootSelector: string) {
  const clipped = await page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return [`root ${selector} not found`];
    const rootRect = root.getBoundingClientRect();
    const offenders: string[] = [];
    for (const el of Array.from(root.querySelectorAll('table, ul, ol'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Offscreen page surfaces (kept mounted while navigating) are not clipping.
      if (rect.right < 0 || rect.left > window.innerWidth) continue;
      // Hidden measurement flows (visibility:hidden) are not clipping either.
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkVisibilityCSS: true })) continue;
      // Horizontal fit only: vertical extent inside a scroll container is not clipping.
      // MultipageFlow mounts every flowed page in one wide CSS-column track and
      // relies on `.multipage-flow-container{overflow:hidden}` to show only the
      // current page — content outside that container's bounds is off-page by
      // design, not a rendering clip.
      const surface =
        el.closest('[data-testid="editable-page-surface"]') ??
        el.closest('.multipage-flow-container') ??
        root;
      const surfaceRect = surface.getBoundingClientRect();
      const bounds = surface === root ? rootRect : surfaceRect;
      // A node with zero overlap with its clip container is off-page (mounted
      // for measurement, hidden by the container's overflow:hidden) — not
      // rendered to the user. Only a *partial* overlap is a genuine bleed.
      const noOverlap = rect.right <= bounds.left || rect.left >= bounds.right;
      if (noOverlap) continue;
      const selfClipped = el.scrollWidth > el.clientWidth + 1;
      const outsideX = rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
      if (selfClipped || outsideX) {
        offenders.push(`${el.tagName} selfClipped=${selfClipped} outsideX=${outsideX}`);
      }
    }
    return offenders.slice(0, 5);
  }, rootSelector);
  expect(clipped, `clipped content under ${rootSelector}`).toEqual([]);
}

test.describe('M2 visual import', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ viewport: { width: 1440, height: 900 } });

  let editorUrl = '';

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
    await login(page);
  });

  test('imports the real docx and lands in the editor', async ({ page }) => {
    test.setTimeout(120_000);
    editorUrl = await importFixtureProject(page);
    expect(editorUrl).toMatch(/\/projects\/.+\/editor/);
  });

  test('chapter editor renders imported lists and REFLEXIÓN text without clipping', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 2);

    const chapterCount = await page.locator('[data-testid^="chapter-edit-button-"]').count();
    expect(chapterCount).toBeGreaterThan(0);

    // R8: the editor schema (TipTap) does not render <table> nodes; tables are
    // asserted in the preview surface, which renders the raw imported HTML.
    let foundList = false;
    let foundReflexion = false;
    const maxChapters = Math.min(chapterCount, 15);
    for (let index = 1; index <= maxChapters && (!foundList || !foundReflexion); index += 1) {
      await page.getByTestId(`chapter-edit-button-${index}`).click();
      const editorRoot = page.locator('.ac-editor-shell .ProseMirror').first();
      await expect(editorRoot).toBeVisible({ timeout: 15_000 });
      const lists = await editorRoot.locator('ul, ol').count();
      const text = (await editorRoot.textContent()) ?? '';
      if (lists > 0) {
        foundList = true;
        await expectContentNodesNotClipped(page, '.ac-editor-shell');
      }
      if (text.includes('REFLEXIÓN')) foundReflexion = true;
      await page.getByTestId('chapter-editor-close-button').first().click();
      await expect(editorRoot).toBeHidden({ timeout: 10_000 });
    }

    expect(foundList, 'at least one chapter renders imported lists').toBe(true);
    expect(foundReflexion, 'at least one chapter renders REFLEXIÓN content').toBe(true);
  });

  test('preview renders tables, lists and REFLEXIÓN/EJERCICIO blocks with no clipping', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 6);

    await page.getByTestId('open-full-preview-button').click();
    const stage = page.getByTestId('preview-modal-stage');
    await expect(stage).toBeVisible({ timeout: 30_000 });

    let tables = 0;
    let lists = 0;
    let reflexion = 0;
    let ejercicio = 0;
    const visitedTexts = new Set<string>();

    for (let pageIndex = 0; pageIndex < 200; pageIndex += 1) {
      const counts = await stage.evaluate((node) => ({
        tables: node.querySelectorAll('table').length,
        lists: node.querySelectorAll('ul, ol').length,
        text: node.textContent ?? '',
      }));
      tables = Math.max(tables, counts.tables);
      lists = Math.max(lists, counts.lists);
      reflexion += (counts.text.match(/REFLEXIÓN/g) ?? []).length;
      ejercicio += (counts.text.match(/EJERCICIO/g) ?? []).length;
      visitedTexts.add(counts.text.slice(0, 200));
      await expectContentNodesNotClipped(page, '[data-testid="preview-modal-stage"]');

      const nextButton = page.getByTestId('preview-modal-next-page-button');
      if (await nextButton.isDisabled()) break;
      await nextButton.click();
      await page.waitForTimeout(150);
    }

    expect(tables, 'preview renders imported tables').toBeGreaterThan(0);
    expect(lists, 'preview renders imported lists').toBeGreaterThan(0);
    expect(reflexion, 'preview renders REFLEXIÓN blocks').toBeGreaterThan(0);
    expect(ejercicio, 'preview renders EJERCICIO blocks').toBeGreaterThan(0);
    expect(visitedTexts.size, 'preview advances through distinct pages').toBeGreaterThan(3);

    await page.getByTestId('preview-modal-close-button').click();
  });

  test('export surface exposes every export action', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(editorUrl);
    await dismissOnboarding(page);
    await goToWorkspaceStep(page, 9);

    await expect(page.getByTestId('export-html-button')).toBeVisible();
    await expect(page.getByTestId('export-docx-button')).toBeVisible();
    await expect(page.getByTestId('export-epub-button')).toBeVisible();
    await expect(page.getByTestId('pdf-export-button')).toBeVisible();
  });
});
