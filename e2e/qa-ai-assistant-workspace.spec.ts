import { expect, test, type Browser, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Step 7 — governed AI workspace. The local environment has no AI provider, so the cloud tasks are verified in the
// "unavailable" state; the proposal → accept / reject / stale / audit chain is exercised for real with the coherence
// agent (deterministic, local, same proposal engine, same accept/reject server actions).
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-ai-assistant-workspace.spec.ts --reporter=list --workers=1

test.describe.configure({ mode: 'serial' });

const STAMP = Date.now();
let projectId = '';
let projectTitle = '';
let mdPath = '';

async function session(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signInAsQaIdentity(page);
  return { context, page };
}

async function openAiStep(page: Page, id: string) {
  await page.goto(`/projects/${id}/editor`);
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(6)).toBeVisible({ timeout: 30_000 });
  for (let i = 1; i <= 6 && (await triggers.nth(6).isDisabled()); i += 1) await triggers.nth(i).click();
  await triggers.nth(6).click();
  await expect(page.getByTestId('ai-workspace')).toBeVisible({ timeout: 30_000 });
}

async function runCoherence(page: Page) {
  await page.getByTestId('ai-tool-coherence').click();
  await page.getByTestId('ai-run').click();
  await expect(page.getByTestId('ai-coherence')).toBeVisible({ timeout: 30_000 });
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  mdPath = path.join(os.tmpdir(), `ai-ws-${STAMP}.md`);
  fs.writeFileSync(mdPath, '# Mi libro\n\nIntroducción del libro con un texto suficientemente largo para ser un párrafo real.\n\n# Capítulo repetido\n\nPrimer texto del capítulo repetido, con contenido suficiente.\n\n# Capítulo repetido\n\nSegundo texto del capítulo repetido, con contenido suficiente.\n\n# Capítulo repetido\n\nTercer texto del capítulo repetido, con contenido suficiente.\n');
  const { context, page } = await session(browser);
  projectTitle = `AI WS ${STAMP}`;
  projectId = await importFreshProject(page, projectTitle, mdPath);
  await context.close();
});

test.afterAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const { context, page } = await session(browser);
  await deleteProjectByTitle(page, projectTitle).catch(() => undefined);
  await context.close();
  fs.rmSync(mdPath, { force: true });
});

test('A/H/I. shell without legacy rail; idle state; cloud tasks unavailable without a provider; no fake AI', async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await session(browser);
  await openAiStep(page, projectId);
  await expect(page.getByTestId('chapter-workflow-stepper')).toBeVisible();
  await expect(page.getByTestId('previous-step-button')).toHaveCount(0);
  await expect(page.getByTestId('next-step-button')).toHaveCount(0);
  await expect(page.getByText(/^Progreso$/)).toHaveCount(0);
  await expect(page.getByTestId('ai-step-workspace')).toBeVisible();
  await expect(page.getByTestId('ai-tagline')).toContainText('La IA propone. Tú decides qué se aplica.');
  await expect(page.getByTestId('ai-idle')).toContainText('Selecciona una tarea para generar una propuesta.');
  // The old mock is gone.
  await expect(page.getByText('Estrategias Editoriales para el Talento Moderno')).toHaveCount(0);
  await expect(page.getByTestId('ai-assistant-generate-button')).toHaveCount(0);
  // No provider locally: declared, cloud tasks off, coherence still available (local deterministic analysis).
  await expect(page.getByTestId('ai-unavailable')).toContainText('Asistente IA no disponible');
  for (const id of ['style', 'architecture', 'summary']) await expect(page.getByTestId(`ai-tool-${id}`)).toBeDisabled();
  await expect(page.getByTestId('ai-tool-coherence')).toBeEnabled();
  await expect(page.getByTestId('ai-context-processing')).toContainText('Sin proveedor de IA');
  await expect(page.getByTestId('ai-history-empty')).toBeVisible();
  const box = await page.getByTestId('ai-step-workspace').boundingBox();
  expect(box!.width).toBeGreaterThan(900);
  await page.screenshot({ path: 'test-results/ai-ws-01-idle-unavailable.png' });
  await context.close();
});

test('C/K. coherence runs locally on the real document and shows real issues; tool selection never runs it', async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await session(browser);
  await openAiStep(page, projectId);
  await page.getByTestId('ai-tool-coherence').click();
  await expect(page.getByTestId('ai-task')).toContainText('Detecta referencias rotas');
  await expect(page.getByTestId('ai-coherence')).toHaveCount(0); // not run by selecting
  await page.screenshot({ path: 'test-results/ai-ws-02-task-selected.png' });
  await page.getByTestId('ai-run').click();
  await expect(page.getByTestId('ai-coherence-issues')).toContainText('Encabezado duplicado', { timeout: 30_000 });
  await expect(page.getByTestId('ai-proposal-card').first()).toBeVisible();
  await expect(page.getByTestId('ai-proposal-mode').first()).toHaveAttribute('data-mode', 'local');
  await expect(page.getByTestId('ai-proposal-mode').first()).toContainText(/local/i);
  await expect(page.getByTestId('ai-proposal-diff').first()).toContainText('Antes');
  await expect(page.getByTestId('ai-proposal-diff').first()).toContainText('Después');
  await page.screenshot({ path: 'test-results/ai-ws-03-proposal.png' });
  await context.close();
});

test('F. reject: the document is unchanged (the issue is still detected afterwards)', async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await session(browser);
  await openAiStep(page, projectId);
  await runCoherence(page);
  const before = await page.getByTestId('ai-proposal-card').count();
  expect(before).toBeGreaterThan(0);
  await page.getByTestId('ai-proposal-reject').first().click();
  await expect(page.getByTestId('ai-proposal-rejected').first()).toContainText('El documento no ha cambiado.');
  await page.reload();
  await openAiStep(page, projectId);
  await runCoherence(page);
  expect(await page.getByTestId('ai-proposal-card').count()).toBe(before);
  await expect(page.getByTestId('ai-history-empty')).toBeVisible();
  await context.close();
});

test('G. stale: a proposal accepted elsewhere cannot be applied again and nothing is written', async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await session(browser);
  const b = await session(browser);
  await openAiStep(a.page, projectId);
  await runCoherence(a.page);
  await openAiStep(b.page, projectId);
  await runCoherence(b.page);

  // B accepts the first proposal for real (document changes).
  await b.page.getByTestId('ai-proposal-accept').first().click();
  await expect(b.page.getByTestId('ai-proposal-applied').first()).toBeVisible({ timeout: 30_000 });

  // A still holds the same (now stale) proposal: accepting is refused and the stale state is offered.
  await a.page.getByTestId('ai-proposal-accept').first().click();
  await expect(a.page.getByTestId('ai-proposal-stale').first()).toContainText('El documento ha cambiado desde que se generó esta propuesta.', { timeout: 30_000 });
  await expect(a.page.getByTestId('ai-proposal-regenerate').first()).toBeVisible();
  await expect(a.page.getByTestId('ai-proposal-discard').first()).toBeVisible();
  await a.page.screenshot({ path: 'test-results/ai-ws-05-stale.png' });
  await a.page.getByTestId('ai-proposal-discard').first().click();
  await a.context.close();
  await b.context.close();
});

test('E. accept: applied through the server, refreshed, logged in the AI history and in the KDP disclosure', async ({ browser }) => {
  test.setTimeout(180_000);
  const { context, page } = await session(browser);
  await openAiStep(page, projectId);
  // The previous test already applied one operation.
  await expect(page.getByTestId('ai-history-item')).toHaveCount(1);
  await runCoherence(page);
  const issuesBefore = await page.getByTestId('ai-coherence-issues').innerText();
  await page.getByTestId('ai-proposal-accept').first().click();
  await expect(page.getByTestId('ai-proposal-applied').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('ai-history-item')).toHaveCount(2, { timeout: 30_000 });
  await expect(page.getByTestId('ai-history-item').first()).toContainText('Aplicada');
  await expect(page.getByTestId('ai-history-item').first()).toContainText('local');
  await runCoherence(page);
  // Re-running analyses the CURRENT document: the heading the proposal renamed is reflected, so it really changed on the server.
  const issuesAfter = await page.getByTestId('ai-coherence-issues').innerText().catch(() => '');
  expect(issuesAfter).not.toBe(issuesBefore);
  await page.screenshot({ path: 'test-results/ai-ws-04-history.png' });

  // KDP disclosure regression: accepted AI operations make the declaration required (export step).
  const triggers = page.locator('.ac-stepper__trigger');
  await triggers.nth(7).click();
  await expect(page.getByTestId('kdp-disclosure-badge')).toHaveAttribute('data-required', 'true', { timeout: 30_000 });
  await context.close();
});

test('O/P. responsive without horizontal overflow; keyboard and ARIA', async ({ browser }) => {
  test.setTimeout(150_000);
  const { context, page } = await session(browser);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 900, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openAiStep(page, projectId);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `no horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    if (viewport.width <= 1060) {
      await page.getByTestId('ai-side-toggle').click();
      await expect(page.getByTestId('ai-tool-coherence')).toBeVisible();
    }
  }
  await page.screenshot({ path: 'test-results/ai-ws-06-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAiStep(page, projectId);
  await page.getByTestId('ai-tool-coherence').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ai-tool-coherence')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('ai-main')).toHaveAttribute('aria-busy', 'false');
  await context.close();
});
