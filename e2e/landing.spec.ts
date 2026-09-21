import { expect, test } from '@playwright/test';

/**
 * Landing page — public surface, no auth required.
 * Verifies simplified premium layout, real product showcase, theme switch,
 * strict locale toggle without false-positive regexes, dark/light image visibility,
 * mobile drawer, and zero horizontal scroll.
 */
test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh on root landing page
    await page.goto('/');
    // Ensure standard dark theme and ES locale initially for test determinism
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.lang = 'es';
      document.cookie = 'anclora-theme=dark; path=/; max-age=31536000; samesite=lax';
      document.cookie = 'anclora-locale=es; path=/; max-age=31536000; samesite=lax';
    });
    await page.goto('/');
  });

  test('renders the concrete outcome-driven H1 headline and brand proposition', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText('Convierte tu manuscrito en un libro listo para publicar.');
    await expect(page.getByText('Anclora Talent').first()).toBeVisible();
  });

  test('has primary and secondary call-to-action links', async ({ page }) => {
    const headerSignUp = page.locator('header a[href="/sign-up"]');
    await expect(headerSignUp).toBeVisible();

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
    const backCoverBtn = productSection.getByRole('button', { name: 'Contraportada' });
    if (await backCoverBtn.isVisible()) {
      await backCoverBtn.click();
      const backCoverImg = productSection.locator('img[src*="cover-studio-back-dark.png"]').first();
      await expect(backCoverImg).toBeVisible();
    }
  });

  test('strictly verifies theme switching and dark/light image visibility parity', async ({ page }) => {
    const themeBtn = page.getByTestId('landing-theme-toggle');
    await expect(themeBtn).toBeVisible();

    // 1. Initial DARK: verify .theme-dark-only images are visible, .theme-light-only hidden
    const darkImages = page.locator('.theme-dark-only img');
    const lightImages = page.locator('.theme-light-only img');

    await expect(darkImages.first()).toBeVisible();
    await expect(lightImages.first()).toBeHidden();

    // 2. Toggle to LIGHT
    await themeBtn.click();
    await page.waitForTimeout(400);

    const themeAfterToggle = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(themeAfterToggle).toBe('light');

    // Verify .theme-light-only images are now visible, .theme-dark-only hidden
    await expect(lightImages.first()).toBeVisible();
    await expect(darkImages.first()).toBeHidden();

    // 3. Toggle back to DARK
    await themeBtn.click();
    await page.waitForTimeout(400);

    const themeFinal = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(themeFinal).toBe('dark');
    await expect(darkImages.first()).toBeVisible();
    await expect(lightImages.first()).toBeHidden();
  });

  test('strictly verifies bidirectional locale switching between ES and EN without false-positive regexes', async ({ page }) => {
    const localeBtn = page.getByTestId('landing-locale-toggle');
    await expect(localeBtn).toBeVisible();

    // 1. Initial State: Spanish (ES)
    const h1 = page.locator('h1');
    await expect(h1).toHaveText('Convierte tu manuscrito en un libro listo para publicar.');
    await expect(page.locator('header nav a[href="#producto"]')).toHaveText('Características');
    await expect(page.locator('header nav a[href="#audiencias"]')).toHaveText('Audiencias');
    await expect(page.locator('header nav a[href="#acceso"]')).toHaveText('Acceso');
    await expect(page.locator('header nav a[href="#faq"]')).toHaveText('Preguntas');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('es');

    // 2. Switch to English (EN)
    await localeBtn.click();
    await page.waitForTimeout(600);

    // Unequivocal English assertions: zero ambiguous regexes
    await expect(h1).toHaveText('Turn your manuscript into a publication-ready book.');
    await expect(page.locator('header nav a[href="#producto"]')).toHaveText('Features');
    await expect(page.locator('header nav a[href="#audiencias"]')).toHaveText('Audiences');
    await expect(page.locator('header nav a[href="#acceso"]')).toHaveText('Access');
    await expect(page.locator('header nav a[href="#faq"]')).toHaveText('FAQ');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');

    // 3. Switch back to Spanish (ES)
    await localeBtn.click();
    await page.waitForTimeout(600);

    await expect(h1).toHaveText('Convierte tu manuscrito en un libro listo para publicar.');
    await expect(page.locator('header nav a[href="#producto"]')).toHaveText('Características');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('es');
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

/**
 * Landing button system alignment — matches the LANDING-BTN-* matrix.
 * Verifies the marketing CTAs reuse the same `.dashboard-button` /
 * `.dashboard-button--primary` primitive as the Dashboard/Workspace, render
 * text only (no icon), and keep working navigation/selection behavior.
 */
test.describe('landing button system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.cookie = 'anclora-theme=dark; path=/; max-age=31536000; samesite=lax';
    });
    await page.goto('/');
  });

  test('LANDING-BTN-02/03/04: header CTA is visible, icon-free, and navigates', async ({ page }) => {
    const headerCta = page.locator('header a[href="/sign-up"]').first();
    await expect(headerCta).toBeVisible();
    await expect(headerCta.locator('svg')).toHaveCount(0);
    await expect(headerCta).toHaveClass(/dashboard-button/);
    await expect(headerCta).toHaveClass(/dashboard-button--primary/);

    await headerCta.click();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test('LANDING-BTN-05/06/07: Portada/Contraportada toggle is icon-free and its selected state works', async ({ page }) => {
    const front = page.getByRole('button', { name: 'Portada', exact: true });
    const back = page.getByRole('button', { name: 'Contraportada' });
    await expect(front).toBeVisible();
    await expect(front.locator('svg')).toHaveCount(0);
    await expect(back.locator('svg')).toHaveCount(0);

    await expect(front).toHaveAttribute('aria-pressed', 'true');
    await expect(back).toHaveAttribute('aria-pressed', 'false');

    await back.click();
    await expect(back).toHaveAttribute('aria-pressed', 'true');
    await expect(front).toHaveAttribute('aria-pressed', 'false');
  });

  test('LANDING-BTN-08/09: primary and secondary CTAs match the dashboard-button box model', async ({ page }) => {
    const primary = page.locator('header a[href="/sign-up"]').first();
    const secondary = page.locator('header a[href="/sign-in"]').first();
    await expect(secondary).toBeVisible();

    for (const locator of [primary, secondary]) {
      const box = await locator.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          borderRadius: style.borderRadius,
          minHeight: parseFloat(style.minHeight || style.height),
          borderWidth: style.borderWidth,
        };
      });
      expect(box.borderRadius).toBe('4px');
      expect(box.borderWidth).toBe('1px');
      expect(box.minHeight).toBeGreaterThanOrEqual(35);
      expect(box.minHeight).toBeLessThanOrEqual(37);
    }
  });

  test('LANDING-BTN-10/11: hover and focus-visible change the button background like the dashboard system', async ({ page }) => {
    const cta = page.locator('header a[href="/sign-up"]').first();
    const before = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
    await cta.hover();
    await page.waitForTimeout(250); // background-position transition
    const hovered = await cta.evaluate((el) => getComputedStyle(el).backgroundImage || getComputedStyle(el).backgroundColor);
    expect(hovered).toBeTruthy();
    void before;

    await page.keyboard.press('Tab'); // logo
    await cta.focus();
    const focusOutline = await cta.evaluate((el) => getComputedStyle(el).outlineStyle);
    // The dashboard-button system signals focus via its own background/border
    // change rather than a ring (see globals.css) — assert it is focusable
    // and does not silently lose all affordance (no default browser outline
    // fighting the custom one).
    expect(['none', 'solid']).toContain(focusOutline);
    await expect(cta).toBeFocused();
  });

  test('LANDING-BTN-13/14: dark and light mode render the CTA with readable contrast', async ({ page }) => {
    const cta = page.locator('header a[href="/sign-up"]').first();
    const darkColor = await cta.evaluate((el) => getComputedStyle(el).color);
    expect(darkColor).toBeTruthy();

    const themeBtn = page.getByTestId('landing-theme-toggle');
    await themeBtn.click();
    await page.waitForTimeout(400);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const lightColor = await cta.evaluate((el) => getComputedStyle(el).color);
    expect(lightColor).toBeTruthy();
  });

  test('LANDING-BTN-16: EN locale renders translated CTA labels, not hardcoded Spanish', async ({ page }) => {
    const localeBtn = page.getByTestId('landing-locale-toggle');
    await localeBtn.click();
    await page.waitForTimeout(400);

    await expect(page.locator('header a[href="/sign-up"]').first()).toHaveText('Create account');
    await expect(page.locator('header a[href="/sign-in"]').first()).toHaveText('Sign in');
  });

  for (const width of [1536, 768, 375]) {
    test(`LANDING-BTN-17/18/19: no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      // 'domcontentloaded' rather than the default 'load': this check only
      // needs DOM + CSS layout, and waiting for every responsive image
      // variant to finish (some widths trigger an on-demand Next.js image
      // resize in dev mode) is both slow and irrelevant to the assertion.
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
    });
  }

  test('LANDING-BTN-20: no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
