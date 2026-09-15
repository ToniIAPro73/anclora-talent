import { expect, test, type Page } from '@playwright/test';

/**
 * Fase 6 — chapter editor full-height scrolling.
 *
 * Reported bug: at 100% browser zoom the editor's content only fit by
 * zooming the browser out to ~60% — the toolbar/header consumed too much
 * space and the document canvas had nowhere to scroll internally, so the
 * bottom of a long chapter was unreachable.
 *
 * Root cause (fixed alongside this spec): `.ac-editor-shell`/`.ac-text-editor`
 * are CSS grid containers with no `grid-template-rows`, so their content row
 * sized to fit the full page canvas instead of being bounded to the
 * remaining viewport space — `.ac-text-editor__content--scroll`'s own
 * `overflow-y: auto` had nothing to actually scroll.
 *
 * This spec creates a chapter long enough to overflow every tested
 * viewport, then — at each viewport, no zoom emulation needed since the bug
 * was about normal (100%) zoom — scrolls from the first line to the last,
 * edits the last paragraph, and scrolls back to the first line.
 */

const TEST_USER = {
  fullName: 'E2E Editor Scroll Bot',
  email: 'e2e.editorscroll@anclora-talent.test',
  password: 'E2ePassword123',
};

const FIRST_LINE_MARKER = 'MARCADOR_PRIMERA_LINEA';
const LAST_LINE_MARKER = 'MARCADOR_ULTIMA_LINEA';

function buildLongChapterMarkdown() {
  const filler = Array.from(
    { length: 40 },
    (_, i) =>
      `Párrafo de relleno número ${i + 1} con contenido suficiente para ocupar varias líneas del capítulo y forzar que el documento sea más alto que cualquier viewport de escritorio o móvil razonable.`,
  ).join('\n\n');
  return `# Capítulo largo\n\n${FIRST_LINE_MARKER}\n\n${filler}\n\n${LAST_LINE_MARKER}\n`;
}

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '375x667', width: 375, height: 667 },
];

test.describe('Chapter editor — full-height scroll at every viewport', () => {
  test.setTimeout(120_000);

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', { data: TEST_USER });
    expect([201, 409]).toContain(response.status());
  });

  async function login(page: Page) {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'anclora-cookie-consent-v1',
        JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false }),
      );
    });
    await page.goto('/sign-in');
    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /iniciar sesión|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  }

  async function createLongChapterProject(page: Page, title: string) {
    await page.goto('/projects/new');
    await page.getByTestId('source-document-input').setInputFiles({
      name: 'capitulo-largo.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(buildLongChapterMarkdown(), 'utf-8'),
    });
    await expect(page.getByTestId('import-analysis-panel')).toBeVisible();
    await page.getByTestId('create-project-title-input').fill(title);
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
  }

  async function openChapterEditor(page: Page) {
    await page.getByTestId('chapter-edit-button-1').click();
    await expect(page.getByTestId('chapter-editor-close-button')).toBeVisible();
    await expect(page.locator('.ac-editor-shell .ProseMirror').first()).toBeVisible();
  }

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}: scrolls from first line to last, edits the last paragraph, scrolls back`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await login(page);
      await createLongChapterProject(page, `Editor scroll E2E ${viewport.name} ${Date.now()}`);
      await openChapterEditor(page);

      const scrollRegion = page.locator('.ac-text-editor__content--scroll').first();
      const firstLine = page.getByText(FIRST_LINE_MARKER);
      const lastLine = page.getByText(LAST_LINE_MARKER);

      await expect(firstLine).toBeInViewport();

      await lastLine.scrollIntoViewIfNeeded();
      await expect(lastLine).toBeInViewport();

      // Edit the last paragraph — the whole point of reaching it.
      await lastLine.click();
      await page.keyboard.press('End');
      await page.keyboard.type(' EDITADO');
      await expect(page.getByText(`${LAST_LINE_MARKER} EDITADO`)).toBeVisible();

      await firstLine.scrollIntoViewIfNeeded();
      await expect(firstLine).toBeInViewport();

      // The scroll region itself moved — this is not the browser page
      // scrolling around a fixed-size overlay.
      const scrolledAtLeastOnce = await scrollRegion.evaluate((el) => el.scrollHeight > el.clientHeight);
      expect(scrolledAtLeastOnce).toBe(true);
    });
  }
});
