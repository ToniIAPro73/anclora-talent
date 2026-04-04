import { expect, test } from '@playwright/test';

/**
 * Landing page — public surface, no auth required.
 * These tests verify the product promise is legible and CTAs are reachable.
 */
test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the brand headline', async ({ page }) => {
    // The headline is the main value proposition
    await expect(page.locator('h1')).toBeVisible();
  });

  test('renders Anclora Talent brand name somewhere in the page', async ({ page }) => {
    await expect(page.getByText(/Anclora Talent/i).first()).toBeVisible();
  });

  test('has at least one call-to-action link or button', async ({ page }) => {
    // At least one primary CTA must be visible (sign up / get started)
    const ctas = page.locator('a[href*="sign"], button');
    await expect(ctas.first()).toBeVisible();
  });

  test('page title is non-empty', async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
  });

  test('has no broken critical layout — hero section is visible', async ({ page }) => {
    // The main element must exist and have content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
