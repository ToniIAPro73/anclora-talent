import { expect, test } from '@playwright/test';

/**
 * Auth-redirect contract.
 *
 * Unauthenticated users hitting protected routes must be redirected to
 * the sign-in page. This confirms the Clerk middleware is correctly
 * guarding the (app) route group.
 */
test.describe('auth redirect contract', () => {
  test('dashboard redirects unauthenticated visitors to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    // Clerk redirects to /sign-in (possibly with a redirect_url query param)
    await expect(page).toHaveURL(/sign-in/);
  });

  test('project editor redirects unauthenticated visitors to sign-in', async ({ page }) => {
    await page.goto('/projects/any-id/editor');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('cover studio redirects unauthenticated visitors to sign-in', async ({ page }) => {
    await page.goto('/projects/any-id/cover');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('preview page redirects unauthenticated visitors to sign-in', async ({ page }) => {
    await page.goto('/projects/any-id/preview');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('back cover page redirects unauthenticated visitors to sign-in', async ({ page }) => {
    await page.goto('/projects/any-id/back-cover');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('export API returns 401 or redirects for unauthenticated requests', async ({ page }) => {
    const response = await page.request.get('/api/projects/export?projectId=any-id');
    // Either a redirect to sign-in (3xx resolved) or a 401/403
    const status = response.status();
    const url = response.url();
    const isProtected = status === 401 || status === 403 || url.includes('sign-in');
    expect(isProtected).toBe(true);
  });
});
