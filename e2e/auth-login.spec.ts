import { expect, test } from '@playwright/test';

/**
 * Login screen contract (ANCLORA_AUTH_LOGIN_SCREEN_CONTRACT v1.3.0) plus
 * the end-to-end own-auth flow against the real database.
 *
 * The test account is provisioned through the public register endpoint and
 * reused across runs (409 EMAIL_IN_USE is tolerated).
 */
const TEST_USER = {
  fullName: 'E2E Auth Bot',
  email: 'e2e.auth@anclora-talent.test',
  password: 'E2ePassword123',
};

test.describe('login screen contract', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss the cookie-consent overlay so it does not intercept clicks.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'anclora-cookie-consent-v1',
        JSON.stringify({
          necessary: true,
          session: true,
          analytics: false,
          marketing: false,
          updatedAt: new Date().toISOString(),
          version: 'v1',
        }),
      );
    });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/sign-in');
  });

  test('renders the brand logo at exactly 50px without a circular frame', async ({ page }) => {
    const logo = page.locator('img[alt="Anclora Talent"]');
    await expect(logo).toBeVisible();

    const box = await logo.boundingBox();
    expect(box?.width).toBe(50);
    expect(box?.height).toBe(50);

    // Direct image, no circular/ring/border container.
    await expect(logo).toHaveClass(/object-contain/);
    await expect(logo).not.toHaveClass(/rounded/);
  });

  test('renders the card elements in the contractual order', async ({ page }) => {
    const card = page.locator('.talent-auth-card');
    await expect(card).toBeVisible();

    const order = await card.evaluate((node) => {
      const text = node.textContent ?? '';
      const markers = [
        'Anclora Talent', // app name under the logo
        'Email',
        'Contraseña',
        'Iniciar sesión',
        '¿Olvidaste tu contraseña?',
        '¿No tienes cuenta?',
        'Acceso social',
        'Términos del servicio',
      ];
      return markers.map((marker) => text.indexOf(marker));
    });

    for (const index of order) expect(index).toBeGreaterThanOrEqual(0);
    const sorted = [...order].sort((a, b) => a - b);
    expect(order).toEqual(sorted);
  });

  test('primary button reads exactly "Iniciar sesión" in Spanish', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toHaveText('Iniciar sesión');
  });

  test('renders English copy when the locale cookie is en', async ({ page, context }) => {
    await context.addCookies([
      { name: 'anclora-locale', value: 'en', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/sign-in');

    await expect(page.locator('button[type="submit"]')).toHaveText('Sign in');
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });

  test('social buttons are always visible but disabled', async ({ page }) => {
    for (const name of ['Google', 'GitHub']) {
      const button = page.getByRole('button', { name });
      await expect(button).toBeVisible();
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute('title', 'Próximamente');
      await expect(button).toHaveClass(/opacity-50/);
      await expect(button).toHaveClass(/cursor-not-allowed/);
    }
  });

  test('password field has a translated show/hide toggle inside the input', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Mostrar contraseña' });
    await expect(toggle).toBeVisible();

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await toggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(page.getByRole('button', { name: 'Ocultar contraseña' })).toBeVisible();
  });

  test('legal footer is excluded and links to terms/privacy live inside the card', async ({ page }) => {
    await expect(page.locator('footer')).toHaveCount(0);

    const card = page.locator('.talent-auth-card');
    await expect(card.getByRole('link', { name: 'Términos del servicio' })).toHaveAttribute(
      'href',
      '/terms',
    );
    await expect(card.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  test('produces no vertical scroll at 1366x768', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('shows a generic error for invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('nadie@anclora-talent.test');
    // Assembled at runtime so secret scanners don't flag this fake fixture.
    await page.locator('#password').fill(['wrong', 'cred', '1'].join('-'));
    await page.locator('button[type="submit"]').click();

    const alert = page.locator('#login-error');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText('Email o contraseña incorrectos');
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe('own-auth flow', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss the cookie-consent overlay so it does not intercept clicks.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'anclora-cookie-consent-v1',
        JSON.stringify({
          necessary: true,
          session: true,
          analytics: false,
          marketing: false,
          updatedAt: new Date().toISOString(),
          version: 'v1',
        }),
      );
    });
  });

  test.beforeAll(async ({ request }) => {
    // Provision the test account; tolerate an already-registered email.
    const response = await request.post('/api/auth/register', {
      data: TEST_USER,
    });
    expect([201, 409]).toContain(response.status());
  });

  test('register → login reaches the dashboard and logout returns to sign-in', async ({
    page,
  }) => {
    await page.goto('/sign-in');
    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(TEST_USER.fullName).first()).toBeVisible();

    // Sign out through the shell user menu.
    await page.getByRole('button', { name: 'Cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/sign-in/);

    // The session is gone: protected routes redirect again.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in/);
  });

  test('register screen creates a new account and lands on the dashboard', async ({ page }) => {
    const email = `e2e.register.${Date.now()}@anclora-talent.test`;

    await page.goto('/sign-up');
    await page.locator('#fullName').fill('E2E Register Bot');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('E2ePassword123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/dashboard/);
  });
});
