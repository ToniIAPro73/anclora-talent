import { expect, test, type Page } from '@playwright/test';

const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

test.describe('P4 — physical mobile editor contract', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', { data: TEST_USER });
    expect([201, 409]).toContain(response.status());
  });

  async function login(page: Page, locale: 'es' | 'en') {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'anclora-cookie-consent-v1',
        JSON.stringify({ necessary: true, session: true, analytics: false, marketing: false }),
      );
    });
    await page.context().addCookies([
      { name: 'anclora-locale', value: locale, domain: 'localhost', path: '/' },
    ]);
    await page.goto('/sign-in');
    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /iniciar sesión|sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  }

  async function dismissOnboarding(page: Page) {
    const skip = page.getByRole('button', { name: /saltar introducción|skip introduction/i });
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      await expect(skip).toBeHidden();
    }
  }

  async function openChapterEditor(page: Page, title: string) {
    await page.goto('/projects/new');
    await page.getByTestId('create-project-title-input').fill(title);
    await page.getByTestId('create-project-submit-button').click();
    await expect(page).toHaveURL(/\/projects\/.+\/editor/, { timeout: 60_000 });
    await dismissOnboarding(page);

    const previous = page.getByTestId('previous-step-button');
    for (let index = 0; index < 8 && !(await previous.isDisabled()); index += 1) {
      await previous.click();
    }
    await page.getByTestId('next-step-button').click();
    await page.getByTestId('chapter-edit-button-1').click();
    await expect(page.getByTestId('chapter-editor-close-button')).toBeVisible();
    await expect(page.locator('.ac-editor-shell .ProseMirror').first()).toBeVisible();
  }

  async function assertFittedMobileEditor(page: Page) {
    const geometry = await page.evaluate(() => {
      const content = document.querySelector('.ac-editor-shell .ac-text-editor__content');
      const pageSurface = document.querySelector('.ac-editor-shell .relative.mx-auto');
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        contentScrollWidth: content instanceof HTMLElement ? content.scrollWidth : -1,
        contentClientWidth: content instanceof HTMLElement ? content.clientWidth : -1,
        surfaceWidth: pageSurface instanceof HTMLElement ? pageSurface.getBoundingClientRect().width : -1,
      };
    });

    expect(geometry.documentWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.contentScrollWidth).toBeLessThanOrEqual(geometry.contentClientWidth + 1);
    expect(geometry.surfaceWidth).toBeLessThanOrEqual(geometry.viewportWidth - 16);
    await expect(page.getByTestId('editor-toolbar-double-page-button')).toBeDisabled();
  }

  test('390px light ES fits one physical column without changing authoring controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, 'es');
    await openChapterEditor(page, `P4 mobile ES 390 ${Date.now()}`);
    await assertFittedMobileEditor(page);
    await page.getByTestId('chapter-editor-close-button').click();
  });

  test('430px dark EN fits one physical column and localizes editor controls', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await login(page, 'en');
    await openChapterEditor(page, `P4 mobile EN 430 ${Date.now()}`);
    await assertFittedMobileEditor(page);
    await expect(page.getByTestId('editor-toolbar-insert-page-break-button')).toHaveAttribute(
      'title',
      /Insert page break/i,
    );
    await page.getByTestId('chapter-editor-close-button').click();
  });
});
