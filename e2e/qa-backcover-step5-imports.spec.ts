import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Step 5 shows the Talent-designed Contraportada for imported ODT / DOCX / DOC projects without touching the
// source manuscript pagination. Run alone:
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-backcover-step5-imports.spec.ts --reporter=list --workers=1

const MANUSCRIPTS = path.resolve(__dirname, '../docs/manuscritos');
const SOURCES = [
  { format: 'ODT', file: path.join(MANUSCRIPTS, 'ANCLORA_TALENT_MANUSCRIPT_EXTENDED.odt') },
  { format: 'DOCX', file: path.join(MANUSCRIPTS, 'ANCLORA_TALENT_TEST_MANUSCRIPT.docx') },
  { format: 'DOC', file: path.join(MANUSCRIPTS, 'ANCLORA_TALENT_MANUSCRIPT_EXTENDED.doc') },
] as const;

async function gotoStep(page: Page, index: number) {
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(index)).toBeVisible({ timeout: 30_000 });
  for (let i = 1; i <= index && (await triggers.nth(index).isDisabled()); i += 1) await triggers.nth(i).click();
  await triggers.nth(index).click();
  await page.waitForTimeout(800);
}
const options = (page: Page) => page.locator('[data-testid="cover-template-select"] option:not([value=""])');
type Live = Record<string, { x: number; y: number; width: number; height: number; lines?: number; fontSize?: number }>;

async function openFullPreview(page: Page, projectId: string) {
  await signInAsQaIdentity(page);
  await page.goto(`/projects/${projectId}/editor`);
  await gotoStep(page, 4);
  await page.getByTestId('open-full-preview-button').click();
  await expect(page.getByTestId('preview-modal-stage')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500); // the manuscript flow measures its page count asynchronously
}
const total = async (page: Page) => Number(((await page.getByTestId('preview-modal-footer').innerText()).match(/de\s+(\d+)/) ?? [])[1]);
async function goToBack(page: Page) {
  await page.getByTestId('preview-modal-stage').focus();
  await page.keyboard.press('End');
  await expect(page.getByTestId('preview-modal-surface-label')).toHaveText(/Contraportada/, { timeout: 15_000 });
}

for (const source of SOURCES) {
  test(`${source.format}: Contraportada is shown in step 5, source pagination untouched, survives reload`, async ({ page, browser }) => {
    test.setTimeout(420_000);
    await signInAsQaIdentity(page);
    const title = `Back Step5 ${source.format} ${Date.now()}`;
    const projectId = await importFreshProject(page, title, source.file);
    try {
      // 1. design the Contraportada
      await gotoStep(page, 3);
      await expect(page.locator('[data-testid="cover-studio-v2"][data-surface-kind="back-cover"]')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[data-testid="design-surface-canvas"][data-canvas-ready="true"]')).toBeVisible({ timeout: 30_000 });
      const onDialog = (dialog: import('@playwright/test').Dialog) => void dialog.accept();
      page.on('dialog', onDialog);
      await page.getByTestId('cover-template-select').selectOption((await options(page).nth(0).getAttribute('value'))!);
      page.off('dialog', onDialog);
      await page.waitForTimeout(800);
      const contents: Record<string, string> = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-object-content')) ?? '{}');
      const titleId = Object.keys(contents).find((id) => id.endsWith('-title'))!;
      const bodyId = Object.keys(contents).find((id) => id.endsWith('-body'))!;
      await page.getByTestId(`layer-select-${bodyId}`).click();
      await page.getByTestId('text-layer-content-input').fill(`Sinopsis de prueba ${source.format}`);
      await page.getByTestId('text-layer-content-input').press('Tab');
      await expect(page.getByTestId('canvas-isbn-area')).toHaveCount(0); // no ISBN block is part of the back-cover data path
      await page.waitForTimeout(1600);
      await expect(page.getByTestId('studio-save-status')).toHaveAttribute('data-status', 'saved', { timeout: 20_000 });
      const editor: Live = JSON.parse((await page.getByTestId('design-surface-canvas').getAttribute('data-live-geometry')) ?? '{}');
      expect(Object.keys(editor)).toEqual(expect.arrayContaining([titleId, bodyId]));

      // 2. step 5: the manuscript pages are the source's, the back cover comes after them
      for (const reload of [false, true]) {
        const view = reload ? await (await browser.newContext()).newPage() : page;
        await openFullPreview(view, projectId);
        const count = await total(view);
        expect(count).toBeGreaterThanOrEqual(3);
        // cover + manuscript + back cover: the back cover is its own surface, not one more source page
        await expect(view.getByTestId('preview-modal-surface-label')).toHaveText(/Portada/);
        await goToBack(view);
        expect(await total(view)).toBe(count);

        const paper = view.getByTestId('cover-preview-paper').last();
        await expect(paper).toBeVisible({ timeout: 30_000 });
        await expect.poll(async () => Object.keys(JSON.parse((await paper.getAttribute('data-preview-geometry')) ?? '{}')).length).toBeGreaterThan(0);
        const preview: Live = JSON.parse((await paper.getAttribute('data-preview-geometry')) ?? '{}');
        expect(Object.keys(preview).sort()).toEqual(Object.keys(editor).sort());
        for (const id of Object.keys(editor)) {
          expect(Math.abs(editor[id].x - preview[id].x)).toBeLessThan(0.5);
          expect(Math.abs(editor[id].y - preview[id].y)).toBeLessThan(0.5);
          expect(Math.abs(editor[id].width - preview[id].width)).toBeLessThan(0.5);
          expect(Math.abs(editor[id].height - preview[id].height)).toBeLessThan(1);
          expect(preview[id].lines).toBe(editor[id].lines);
        }
        expect(preview[titleId]).toBeTruthy(); // the Contraportada title is rendered
        expect(await view.getByTestId('canvas-isbn-area').count()).toBe(0);

        // the manuscript pages before it keep their source numbering: page 2 is still the first manuscript page
        await view.getByTestId('preview-modal-stage').focus();
        await view.keyboard.press('Home');
        await expect(view.getByTestId('preview-modal-surface-label')).toHaveText(/Portada/);
        await view.getByTestId('preview-modal-next-page-button').click();
        await expect(view.getByTestId('preview-modal-surface-label')).toHaveCount(0);
        await expect(view.getByTestId('preview-modal-page-input')).toHaveValue('2');
        if (reload) await view.context().close();
      }
    } finally {
      await signInAsQaIdentity(page);
      await deleteProjectByTitle(page, title).catch(() => undefined);
    }
  });
}
