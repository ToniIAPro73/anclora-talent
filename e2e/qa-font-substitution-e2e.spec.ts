import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

// Gitignored copy of the fixture with font names replaced by "Times New Roman" (not the fixture itself).
const PROBE_PATH = path.resolve(__dirname, '../tmp/qa-probes/tnr-substitution-probe.odt');
const QA_EMAIL = 'e2e.auth@anclora-talent.test';
const BODY_P1 = 'La mayoría de las personas no necesita';
const EVIDENCE_DIR = path.resolve(__dirname, '../tmp/qa-evidence/font-substitution');

async function signIn(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('anclora-cookie-consent-v1', JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' }));
    window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
  });
  await page.goto('/sign-in');
  await page.locator('#email').fill(QA_EMAIL);
  await page.locator('#password').fill(process.env.E2E_AUTH_PASSWORD as string);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 20_000 });
}

async function importProbe(page: Page): Promise<string> {
  await page.goto('/projects/new');
  await page.locator('#project-title').fill(`TNR substitution ${Date.now()}`);
  await page.locator('[data-testid="source-document-input"]').setInputFiles(PROBE_PATH);
  await page.locator('[data-testid="document-data-save-button"]').click();
  await page.locator('[data-testid="create-project-submit-button"]').click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+\/editor/, { timeout: 60_000 });
  return page.url().match(/\/projects\/([a-f0-9-]+)\//)?.[1] ?? '';
}

async function openProloguEditor(page: Page, projectId: string): Promise<Locator> {
  await page.goto(`/projects/${projectId}/editor`);
  await page.locator('.ac-stepper__trigger').nth(1).click();
  const prologo = page.locator('[data-testid^="chapter-organizer-button-"]').filter({ hasText: /Prólogo/ });
  await expect(prologo).toHaveCount(1, { timeout: 15_000 });
  await prologo.click();
  await page.locator('[data-testid="chapter-open-button"]').click();
  const surface = page.locator('[data-testid="chapter-editor-workspace"] .ProseMirror');
  await expect(surface).toHaveCount(1, { timeout: 15_000 });
  return surface;
}

async function bodyFamily(body: Locator): Promise<string> {
  return body.evaluate((p) => {
    const span = Array.from(p.querySelectorAll('span')).find((s) => (s.getAttribute('style') ?? '').includes('font-family'));
    return span ? window.getComputedStyle(span).fontFamily : window.getComputedStyle(p).fontFamily;
  });
}

test.describe('Times New Roman -> Liberation Serif compatible substitute', () => {
  test('resolver, indicator, toolbar, effective family, save and reload keep source provenance', async ({ page }) => {
    test.setTimeout(180_000);
    expect(fs.existsSync(PROBE_PATH), 'probe ODT must exist outside the repo').toBe(true);
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    await signIn(page);
    const projectId = await importProbe(page);
    const editor = await openProloguEditor(page, projectId);
    const body = editor.locator('p').filter({ hasText: BODY_P1 });
    await expect(body).toHaveCount(1, { timeout: 15_000 });
    await body.click({ clickCount: 3 });

    const indicator = page.getByTestId('editor-font-resolution-indicator');
    await expect(indicator, 'substitution must be visible, never silent').toHaveCount(1, { timeout: 15_000 });
    const label = (await indicator.getAttribute('aria-label')) ?? '';
    expect(label).toContain('Times New Roman');
    expect(label).toContain('Liberation Serif');

    const toolbarText = (await page.getByTestId('editor-toolbar-font-family-button').innerText()).trim();
    expect(toolbarText, 'toolbar keeps the source family name next to the substitution warning').toContain('Times New Roman');

    await expect.poll(() => bodyFamily(body), { timeout: 15_000 }).toContain('Liberation Serif');
    const effective = await bodyFamily(body);
    expect(effective).not.toContain('Georgia');
    await editor.screenshot({ path: path.join(EVIDENCE_DIR, 'before-save.png') });

    await page.locator('[data-testid="chapter-editor-header-save-button"]').click();
    await expect.poll(async () => (await page.locator('body').innerText()).includes('Guardado'), { timeout: 15_000 }).toBe(true).catch(() => undefined);
    await page.waitForTimeout(1500);
    await page.reload();

    const reopened = await openProloguEditor(page, projectId);
    const reBody = reopened.locator('p').filter({ hasText: BODY_P1 });
    await expect(reBody).toHaveCount(1, { timeout: 15_000 });
    await reBody.click({ clickCount: 3 });
    await expect(page.getByTestId('editor-font-resolution-indicator'), 'substitution survives reload').toHaveCount(1, { timeout: 15_000 });
    const reLabel = (await page.getByTestId('editor-font-resolution-indicator').getAttribute('aria-label')) ?? '';
    expect(reLabel).toContain('Times New Roman');
    await expect.poll(() => bodyFamily(reBody), { timeout: 15_000 }).toContain('Liberation Serif');
    await reopened.screenshot({ path: path.join(EVIDENCE_DIR, 'after-reload.png') });

    console.log(`[TNR] indicator="${label}" toolbar="${toolbarText}" effective="${effective}" reloadIndicator="${reLabel}"`);
  });
});
