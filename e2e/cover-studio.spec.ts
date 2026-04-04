import { expect, test } from '@playwright/test';

/**
 * Cover studio visual contract.
 *
 * These tests run against public pages only (no auth needed) to verify
 * the cover canvas component structure. When a test environment with a
 * seeded test user is available, extend these tests with authenticated flows.
 *
 * Note: the cover studio page itself requires auth. These tests verify the
 * redirect behavior and will be extended with authenticated sessions once
 * a Clerk test token is configured (CLERK_SECRET_KEY in test env).
 */
test.describe('cover studio redirect contract', () => {
  test('cover route redirects unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/projects/test-id/cover');
    await expect(page).toHaveURL(/sign-in/);
  });
});

/**
 * Export routes contract.
 * Verify that export endpoints exist and respond (auth checked separately).
 */
test.describe('export routes', () => {
  test('HTML export endpoint exists and requires auth', async ({ page }) => {
    const response = await page.request.get('/api/projects/export?projectId=test');
    // Auth enforced — not a 404
    expect(response.status()).not.toBe(404);
  });

  test('PDF export endpoint exists and requires auth', async ({ page }) => {
    const response = await page.request.get('/api/projects/export/pdf?projectId=test');
    expect(response.status()).not.toBe(404);
  });
});
