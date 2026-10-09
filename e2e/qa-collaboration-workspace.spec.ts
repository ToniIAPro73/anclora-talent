import { expect, test, type Browser, type Page } from '@playwright/test';
import { deleteProjectByTitle, importFreshProject, signInAsQaIdentity } from './helpers/image-qa';

// Step 6 — Collaboration workspace with three real accounts (author, corrector, maquetador).
//   set -a && . ./.env.local && set +a && npx playwright test e2e/qa-collaboration-workspace.spec.ts --reporter=list --workers=1

test.describe.configure({ mode: 'serial' });

const PASSWORD = process.env.E2E_AUTH_PASSWORD ?? '';
const STAMP = Date.now();
const CORRECTOR = { fullName: 'E2E Corrector', email: `e2e.corrector.${STAMP}@anclora-talent.test` };
const DESIGNER = { fullName: 'E2E Maquetador', email: `e2e.designer.${STAMP}@anclora-talent.test` };

let projectId = '';
let projectTitle = '';
let emptyProjectId = '';
let emptyProjectTitle = '';
let correctorLink = '';
let designerLink = '';

async function newSession(browser: Browser, user: { fullName: string; email: string } | 'author') {
  const context = await browser.newContext();
  const page = await context.newPage();
  if (user === 'author') {
    await signInAsQaIdentity(page);
  } else {
    await page.addInitScript(() => {
      window.localStorage.setItem('anclora-cookie-consent-v1', JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 'v1' }));
      window.localStorage.setItem('anclora-workspace-onboarding-v1', 'seen');
    });
    await page.goto('/sign-in');
    await page.locator('#email').fill(user.email);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 20_000 });
  }
  return { context, page };
}

async function openAuthorCollaboration(page: Page, id: string) {
  await page.goto(`/projects/${id}/editor`);
  const triggers = page.locator('.ac-stepper__trigger');
  await expect(triggers.nth(5)).toBeVisible({ timeout: 30_000 });
  for (let i = 1; i <= 5 && (await triggers.nth(5).isDisabled()); i += 1) await triggers.nth(i).click();
  await triggers.nth(5).click();
  await expect(page.getByTestId('collaboration-panel')).toBeVisible({ timeout: 30_000 });
}

async function openCollaboratorPage(page: Page, id: string) {
  await page.goto(`/projects/${id}/collaborate`);
  await expect(page.getByTestId('collaboration-panel')).toBeVisible({ timeout: 30_000 });
  await selectChapterWithBlocks(page);
}

/** The template's first chapters are one-liners: pick the first chapter that has enough paragraphs to comment on. */
async function selectChapterWithBlocks(page: Page, minimum = 3) {
  const select = page.getByTestId('chapter-filter');
  const values = await select.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter((value) => value !== 'all'));
  for (const value of values) {
    await select.selectOption(value);
    if ((await page.getByTestId('reader-block').count()) >= minimum) return;
  }
  throw new Error('no chapter with enough blocks');
}

async function inviteViaDialog(page: Page, email: string, role: 'editor' | 'designer') {
  await page.getByTestId('invite-open-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('invite-email-input').fill(email);
  await page.getByTestId(`invite-role-${role}`).check();
  await page.getByTestId('invite-submit').click();
  const input = page.getByTestId('invite-url-input');
  await expect(input).toBeVisible({ timeout: 20_000 });
  const url = await input.inputValue();
  await page.getByTestId('invite-dialog-close').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  return url;
}

async function acceptInvitation(browser: Browser, user: { fullName: string; email: string }, link: string) {
  const { context, page } = await newSession(browser, user);
  await page.goto(new URL(link).pathname);
  await page.getByTestId('accept-invitation-button').click();
  await expect(page.getByTestId('open-project-button')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('open-project-button').click();
  await expect(page.getByTestId('collaboration-panel')).toBeVisible({ timeout: 30_000 });
  return { context, page };
}

test.beforeAll(async ({ browser, request }) => {
  test.setTimeout(240_000);
  for (const user of [CORRECTOR, DESIGNER]) {
    const response = await request.post('/api/auth/register', { data: { ...user, password: PASSWORD } });
    expect([201, 409]).toContain(response.status());
  }
  const { context, page } = await newSession(browser, 'author');
  const create = async (title: string) => {
    await page.goto('/projects/new');
    await page.getByTestId('create-project-title-input').fill(title);
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
    return page.url().match(/\/projects\/([a-f0-9-]+)\//)?.[1] ?? '';
  };
  projectTitle = `Collab WS ${STAMP}`;
  projectId = await importFreshProject(page, projectTitle);
  emptyProjectTitle = `Collab WS empty ${STAMP}`;
  emptyProjectId = await create(emptyProjectTitle);
  await context.close();
});

test.afterAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const { context, page } = await newSession(browser, 'author');
  await deleteProjectByTitle(page, projectTitle).catch(() => undefined);
  await deleteProjectByTitle(page, emptyProjectTitle).catch(() => undefined);
  await context.close();
});

test('A. author workspace: shell without legacy rail, team, invite CTA, tabs, no fake activity', async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await newSession(browser, 'author');
  await openAuthorCollaboration(page, projectId);
  await expect(page.getByTestId('chapter-workflow-stepper')).toBeVisible();
  await expect(page.getByTestId('previous-step-button')).toHaveCount(0);
  await expect(page.getByTestId('next-step-button')).toHaveCount(0);
  await expect(page.getByText(/^Progreso$/)).toHaveCount(0);
  await expect(page.getByTestId('collab-step-workspace')).toBeVisible();
  await expect(page.getByTestId('team-section')).toBeVisible();
  await expect(page.getByTestId('collaborator-row')).toHaveCount(1);
  await expect(page.getByTestId('collaborator-row').first()).toHaveAttribute('data-member-role', 'author');
  await expect(page.getByTestId('invite-open-button')).toBeVisible();
  await expect(page.getByTestId('chapter-reader')).toBeVisible();
  await expect(page.getByTestId('tab-comments')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('tab-suggestions')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Actividad|Activity/ })).toHaveCount(0);
  const box = await page.getByTestId('collab-step-workspace').boundingBox();
  expect(box!.width).toBeGreaterThan(900);
  await page.screenshot({ path: 'test-results/collab-ws-01-author-comments.png' });
  await context.close();
});

test('D/E. invite corrector and maquetador through the dialog; copy link; cancel an invitation', async ({ browser }) => {
  test.setTimeout(180_000);
  const { context, page } = await newSession(browser, 'author');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openAuthorCollaboration(page, projectId);

  // Keyboard/dialog contract: Escape closes and returns focus to the opener.
  await page.getByTestId('invite-open-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('invite-email-input')).toBeFocused();
  await page.screenshot({ path: 'test-results/collab-ws-04-invite-dialog.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('invite-open-button')).toBeFocused();

  correctorLink = await inviteViaDialog(page, CORRECTOR.email, 'editor');
  designerLink = await inviteViaDialog(page, DESIGNER.email, 'designer');
  expect(correctorLink).toMatch(/\/invite\//);
  await expect(page.getByTestId('invitation-row')).toHaveCount(2, { timeout: 20_000 });

  // Copy link works (feedback "Enlace copiado").
  await page.getByTestId('invite-open-button').click();
  await page.getByTestId('invite-email-input').fill(`temp.${STAMP}@anclora-talent.test`);
  await page.getByTestId('invite-submit').click();
  await expect(page.getByTestId('invite-url-input')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('invite-copy-button').click();
  await expect(page.getByTestId('invite-copy-button')).toContainText(/Enlace copiado|Link copied/);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/invite\//);
  await page.getByTestId('invite-dialog-close').click();
  await expect(page.getByTestId('invitation-row')).toHaveCount(3, { timeout: 20_000 });

  // E. cancel the temporary invitation.
  await page.getByTestId('invitation-row').filter({ hasText: `temp.${STAMP}` }).getByTestId('cancel-invitation-button').click();
  await expect(page.getByTestId('invitation-row')).toHaveCount(2, { timeout: 20_000 });
  await page.screenshot({ path: 'test-results/collab-ws-03-author-team.png' });
  await context.close();
});

test('B/C. corrector and maquetador accept, land on the collaboration workspace and see only their actions', async ({ browser }) => {
  test.setTimeout(240_000);
  const corrector = await acceptInvitation(browser, CORRECTOR, correctorLink);
  await expect(corrector.page.getByTestId('collaboration-panel')).toHaveAttribute('data-viewer-role', 'editor');
  await expect(corrector.page.getByTestId('invite-open-button')).toHaveCount(0);
  await expect(corrector.page.getByTestId('member-menu-button')).toHaveCount(0);
  await expect(corrector.page.getByTestId('invitations-section')).toHaveCount(0);
  await expect(corrector.page.getByTestId('resolve-thread-button')).toHaveCount(0);
  await expect(corrector.page.getByTestId('decision-queue')).toHaveCount(0);
  await corrector.page.getByTestId('block-comment-button').first().click({ force: true });
  await expect(corrector.page.getByTestId('comment-input')).toBeVisible();
  await expect(corrector.page.getByTestId('propose-open-button')).toBeVisible();
  await corrector.page.screenshot({ path: 'test-results/collab-ws-05-corrector.png' });
  await corrector.context.close();

  const designer = await acceptInvitation(browser, DESIGNER, designerLink);
  await expect(designer.page.getByTestId('collaboration-panel')).toHaveAttribute('data-viewer-role', 'designer');
  await expect(designer.page.getByTestId('invite-open-button')).toHaveCount(0);
  await designer.page.getByTestId('block-comment-button').first().click({ force: true });
  await expect(designer.page.getByTestId('comment-input')).toBeVisible();
  await expect(designer.page.getByTestId('propose-open-button')).toHaveCount(0);
  await expect(designer.page.getByTestId('resolve-thread-button')).toHaveCount(0);
  await designer.page.screenshot({ path: 'test-results/collab-ws-06-designer.png' });
  await designer.context.close();
});

test('G/H/I/N/O. comment on a block, reply, resolve; chapter and status filters', async ({ browser }) => {
  test.setTimeout(240_000);
  const corrector = await newSession(browser, CORRECTOR);
  await openCollaboratorPage(corrector.page, projectId);
  const blocks = corrector.page.getByTestId('reader-block');
  const target = blocks.nth(1);
  const blockId = await target.getAttribute('data-block-id');
  expect(blockId).toBeTruthy();
  await target.getByRole('button').first().click();
  await corrector.page.getByTestId('comment-input').fill('Revisa la redacción de este párrafo');
  await corrector.page.getByTestId('comment-submit').click();
  await expect(corrector.page.getByTestId('comment-thread')).toHaveCount(1, { timeout: 20_000 });
  await expect(corrector.page.getByTestId('reader-block').nth(1)).toHaveAttribute('data-has-threads', 'true');
  await expect(corrector.page.getByTestId('reader-block').nth(1)).toHaveAttribute('data-block-id', blockId!);
  await corrector.context.close();

  const author = await newSession(browser, 'author');
  await openAuthorCollaboration(author.page, projectId);
  await selectChapterWithBlocks(author.page);
  await expect(author.page.getByTestId('open-threads-badge')).toContainText('1');
  await expect(author.page.getByTestId('comment-thread')).toHaveCount(1);
  await expect(author.page.getByTestId('thread-excerpt')).toBeVisible();
  // Reply (H)
  await author.page.getByTestId('reply-input').fill('Gracias, lo reviso hoy');
  await author.page.getByTestId('reply-submit').click();
  await expect(author.page.getByTestId('comment-reply')).toHaveCount(1, { timeout: 20_000 });
  await author.page.screenshot({ path: 'test-results/collab-ws-02-author-thread.png' });
  // Resolve (I) → leaves the open filter, appears under resolved (O)
  await author.page.getByTestId('resolve-thread-button').click();
  await expect(author.page.getByTestId('comment-thread')).toHaveCount(0, { timeout: 20_000 });
  await expect(author.page.getByTestId('comments-empty')).toContainText(/No hay comentarios abiertos|There are no open comments/);
  await author.page.getByTestId('filter-resolved').click();
  await expect(author.page.getByTestId('comment-thread')).toHaveCount(1);
  await expect(author.page.getByTestId('comment-thread')).toHaveAttribute('data-status', 'resolved');
  await author.page.getByTestId('filter-all').click();
  await expect(author.page.getByTestId('comment-thread')).toHaveCount(1);
  // Chapter filter (N): "Todos" lists commented blocks across chapters; a chapter without comments is empty.
  const select = author.page.getByTestId('chapter-filter');
  const values = await select.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(values[0]).toBe('all');
  await select.selectOption('all');
  await expect(author.page.getByTestId('comment-thread')).toHaveCount(1);
  await author.context.close();
});

test('J/K/L. corrector proposes; author sees the diff, accepts one and rejects another', async ({ browser }) => {
  test.setTimeout(300_000);
  const corrector = await newSession(browser, CORRECTOR);
  await openCollaboratorPage(corrector.page, projectId);
  const proposals: Array<{ blockId: string; original: string; replacement: string }> = [];
  for (const index of [1, 2]) {
    const block = corrector.page.getByTestId('reader-block').nth(index);
    const blockId = (await block.getAttribute('data-block-id'))!;
    const original = ((await block.getByRole('button').first().innerText()) ?? '').trim();
    await block.getByRole('button').first().click();
    await corrector.page.getByTestId('propose-open-button').click();
    const replacement = `${original} (corregido ${index})`;
    await corrector.page.getByTestId('propose-summary-input').fill(`Corrección ${index}`);
    await corrector.page.getByTestId('propose-text-input').fill(replacement);
    await corrector.page.getByTestId('propose-submit').click();
    await expect(corrector.page.getByTestId('propose-area')).toHaveCount(0, { timeout: 20_000 });
    proposals.push({ blockId, original, replacement });
  }
  await corrector.page.getByTestId('tab-suggestions').click();
  await expect(corrector.page.getByTestId('suggestion-row')).toHaveCount(2, { timeout: 20_000 });
  await expect(corrector.page.getByTestId('suggestion-accept-button')).toHaveCount(0);
  await corrector.context.close();

  const author = await newSession(browser, 'author');
  await openAuthorCollaboration(author.page, projectId);
  await selectChapterWithBlocks(author.page);
  await expect(author.page.getByTestId('decision-queue')).toContainText('2');
  await author.page.getByTestId('tab-suggestions').click();
  await expect(author.page.getByTestId('suggestion-row')).toHaveCount(2);
  await expect(author.page.getByTestId('diff-before').first()).toBeVisible();
  await expect(author.page.getByTestId('diff-after').first()).toBeVisible();
  await author.page.screenshot({ path: 'test-results/collab-ws-07-author-suggestions.png' });

  // Reject the second proposal: canonical content stays untouched.
  const secondRow = author.page.getByTestId('suggestion-row').filter({ hasText: 'Corrección 2' });
  await secondRow.getByTestId('suggestion-reject-button').click();
  await expect(author.page.getByTestId('suggestion-row')).toHaveCount(1, { timeout: 20_000 });
  // Accept the first one: the patch is applied through the server action.
  await author.page.getByTestId('suggestion-accept-button').click();
  await expect(author.page.getByTestId('suggestion-row')).toHaveCount(0, { timeout: 20_000 });
  await author.page.getByTestId('suggestion-filter-decided').click();
  await expect(author.page.getByTestId('suggestion-status-accepted')).toHaveCount(1);
  await expect(author.page.getByTestId('suggestion-status-rejected')).toHaveCount(1);
  await author.page.getByTestId('tab-comments').click();
  await selectChapterWithBlocks(author.page);
  const textOf = async (id: string) => (await author.page.locator(`[data-block-id="${id}"]`).first().innerText()).trim();
  await expect.poll(() => textOf(proposals[0].blockId)).toContain('(corregido 1)');
  expect(await textOf(proposals[1].blockId)).not.toContain('(corregido 2)');
  await author.context.close();
});

test('F/M. author revokes the maquetador; the revoked account loses access (server 404)', async ({ browser }) => {
  test.setTimeout(240_000);
  const author = await newSession(browser, 'author');
  await openAuthorCollaboration(author.page, projectId);
  await expect(author.page.getByTestId('collaborator-row')).toHaveCount(3);
  const row = author.page.getByTestId('collaborator-row').filter({ hasText: DESIGNER.fullName });
  await row.getByTestId('member-menu-button').click();
  await author.page.getByTestId('revoke-button').click();
  await expect(author.page.getByTestId('collaborator-row')).toHaveCount(2, { timeout: 20_000 });
  await author.context.close();

  const designer = await newSession(browser, DESIGNER);
  const response = await designer.page.goto(`/projects/${projectId}/collaborate`);
  expect(response?.status()).toBe(404);
  await designer.context.close();

  // An account that never joined cannot read it either.
  const outsider = await newSession(browser, DESIGNER);
  const second = await outsider.page.goto(`/projects/${emptyProjectId}/collaborate`);
  expect(second?.status()).toBe(404);
  await outsider.context.close();
});

test('P. empty states for a project worked alone', async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await newSession(browser, 'author');
  await openAuthorCollaboration(page, emptyProjectId);
  await expect(page.getByTestId('team-empty')).toContainText('Trabajas solo en este proyecto.');
  await expect(page.getByTestId('invitations-section')).toHaveCount(0);
  await expect(page.getByTestId('comments-empty')).toContainText('No hay comentarios abiertos.');
  await page.getByTestId('tab-suggestions').click();
  await expect(page.getByTestId('suggestions-empty')).toContainText('No hay sugerencias pendientes.');
  await page.screenshot({ path: 'test-results/collab-ws-08-empty.png' });
  await context.close();
});

test('Q/S. responsive without horizontal overflow, keyboard tabs', async ({ browser }) => {
  test.setTimeout(150_000);
  const { context, page } = await newSession(browser, 'author');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 900, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openAuthorCollaboration(page, projectId);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `no horizontal page overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
    if (viewport.width <= 1060) {
      await expect(page.getByTestId('team-toggle')).toBeVisible();
      await page.getByTestId('team-toggle').click();
      await expect(page.getByTestId('team-section')).toBeVisible();
    }
  }
  await page.screenshot({ path: 'test-results/collab-ws-09-mobile.png', fullPage: false });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openAuthorCollaboration(page, projectId);
  await page.getByTestId('tab-comments').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tab-suggestions')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('tab-suggestions')).toBeFocused();
  await context.close();
});
