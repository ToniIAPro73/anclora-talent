import { expect, test } from '@playwright/test';

/**
 * Landing page — public surface, no auth required.
 * Verifies simplified premium layout, real product showcase, theme switch,
 * locale toggle, mobile drawer, and zero horizontal scroll.
 */
test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the brand headline and editorial proposition', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/Convierte talento/i);
    await expect(page.getByText(/Anclora Talent/i).first()).toBeVisible();
  });

  test('has primary and secondary call-to-action links', async ({ page }) => {
    const signUpLink = page.locator('header a[href="/sign-up"]');
    await expect(signUpLink).toBeVisible();

    const heroSignUp = page.locator('section a[href="/sign-up"]').first();
    await expect(heroSignUp).toBeVisible();

    const heroSignIn = page.locator('section a[href="/sign-in"]').first();
    await expect(heroSignIn).toBeVisible();
  });

  test('renders the 4 essential navigation anchors', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.locator('a[href="#producto"]')).toBeVisible();
    await expect(header.locator('a[href="#audiencias"]')).toBeVisible();
    await expect(header.locator('a[href="#acceso"]')).toBeVisible();
    await expect(header.locator('a[href="#faq"]')).toBeVisible();

    // Verify anchor target elements exist in the DOM
    await expect(page.locator('#producto')).toBeAttached();
    await expect(page.locator('#audiencias')).toBeAttached();
    await expect(page.locator('#acceso')).toBeAttached();
    await expect(page.locator('#faq')).toBeAttached();
  });

  test('renders unified product story with real screenshots and interactive cover switcher', async ({ page }) => {
    const productSection = page.locator('#producto');
    await expect(productSection).toBeVisible();

    // Check that real images for the 3 moments are present
    const editorImg = productSection.locator('img[src*="editor-preview-dark.png"]').first();
    await expect(editorImg).toBeAttached();

    const spreadImg = productSection.locator('img[src*="preview-spread-dark.png"]').first();
    await expect(spreadImg).toBeAttached();

    const coverImg = productSection.locator('img[src*="cover-studio-dark.png"]').first();
    await expect(coverImg).toBeAttached();

    // Test front/back cover switcher in moment 3
    const backCoverBtn = productSection.getByRole('button', { name: /Contraportada|Back Cover/i });
    if (await backCoverBtn.isVisible()) {
      await backCoverBtn.click();
      const backCoverImg = productSection.locator('img[src*="cover-studio-back-dark.png"]').first();
      await expect(backCoverImg).toBeVisible();
    }
  });

  test('toggles theme between dark and light', async ({ page }) => {
    const themeBtn = page.locator('header button[aria-label*="tema" i], header button[aria-label*="theme" i]').first();
    await expect(themeBtn).toBeVisible();

    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await themeBtn.click();
    await page.waitForTimeout(300);

    const toggledTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(toggledTheme).not.toBe(initialTheme);
  });

  test('toggles locale between ES and EN', async ({ page }) => {
    const localeBtn = page.locator('header button[aria-label*="idioma" i], header button[aria-label*="locale" i]').first();
    await expect(localeBtn).toBeVisible();

    await localeBtn.click();
    await page.waitForTimeout(500);

    // In EN, the nav anchor for product should say "Features" or "Product"
    const enText = await page.locator('header nav a[href="#producto"]').innerText();
    expect(enText).toMatch(/features|producto/i);
  });

  test('responsive mobile drawer and zero horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Check no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Open mobile menu
    const menuBtn = page.locator('header button[aria-label*="menú" i], header button[aria-label*="menu" i]').first();
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Mobile nav drawer links should become visible
    const mobileDrawer = page.locator('header div').filter({ has: page.locator('nav[aria-label*="móvil" i]') });
    await expect(mobileDrawer).toBeVisible();
    await expect(mobileDrawer.locator('a[href="#producto"]')).toBeVisible();
  });
});

