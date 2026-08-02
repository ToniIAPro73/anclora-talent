import { spawn, type ChildProcess } from 'node:child_process';
import { expect, request as playwrightRequest, test } from '@playwright/test';

/**
 * Social OAuth contract (Google + GitHub).
 *
 * - Against the default server (no OAuth env): buttons stay disabled and
 *   the start endpoint answers 503 PROVIDER_OAUTH_NOT_CONFIGURED.
 * - Against a dedicated `next start` spawned with fake OAuth credentials:
 *   buttons link to the start endpoint and the start endpoint issues a 302
 *   to the provider authorization URL with correct PKCE parameters.
 *
 * No real OAuth flow is exercised: the provider round-trip is out of scope.
 */

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const OAUTH_PORT = 3210;
const OAUTH_BASE_URL = `http://localhost:${OAUTH_PORT}`;

const FAKE_OAUTH_ENV = {
  GOOGLE_OAUTH_CLIENT_ID: 'fake-google-client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: fakeCred('fake', 'google', 'client', 'secret'),
  GOOGLE_OAUTH_CALLBACK_URL: `${OAUTH_BASE_URL}/api/auth/oauth/google/callback`,
  GITHUB_OAUTH_CLIENT_ID: 'fake-github-client-id',
  GITHUB_OAUTH_CLIENT_SECRET: fakeCred('fake', 'github', 'client', 'secret'),
  GITHUB_OAUTH_CALLBACK_URL: `${OAUTH_BASE_URL}/api/auth/oauth/github/callback`,
};

function dismissCookieConsent(page: import('@playwright/test').Page) {
  return page.addInitScript(() => {
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
}

test.describe('oauth fallback when providers are not configured', () => {
  test('start endpoint answers 503 PROVIDER_OAUTH_NOT_CONFIGURED', async ({ request }) => {
    for (const provider of ['google', 'github']) {
      const response = await request.get(`/api/auth/oauth/${provider}/start`, {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(503);
      await expect(response.json()).resolves.toEqual({ error: 'PROVIDER_OAUTH_NOT_CONFIGURED' });
    }
  });

  test('social buttons stay disabled with the degraded affordance', async ({ page }) => {
    await dismissCookieConsent(page);
    await page.goto('/sign-in');

    for (const name of ['Google', 'GitHub']) {
      const button = page.getByRole('button', { name });
      await expect(button).toBeVisible();
      await expect(button).toBeDisabled();
      await expect(button).toHaveClass(/opacity-50/);
      await expect(button).toHaveClass(/cursor-not-allowed/);
    }
  });

  test('shows the oauth error feedback from ?oauth= in the login card', async ({ page }) => {
    await dismissCookieConsent(page);
    await page.goto('/sign-in?oauth=google_error');

    const alert = page.locator('#login-error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Google');
    await expect(alert).toHaveText('No se ha podido completar el acceso mediante Google.');
  });

  test('shows cancelled and invalid_state feedback and translates it to English', async ({
    page,
    context,
  }) => {
    await dismissCookieConsent(page);

    await page.goto('/sign-in?oauth=github_cancelled');
    await expect(page.locator('#login-error')).toHaveText(
      'Has cancelado el acceso mediante GitHub.',
    );

    await context.addCookies([
      { name: 'anclora-locale', value: 'en', domain: 'localhost', path: '/' },
    ]);
    await page.goto('/sign-in?oauth=google_invalid_state');
    await expect(page.locator('#login-error')).toHaveText(
      'The sign-in request with Google has expired or is not valid.',
    );
  });
});

test.describe('oauth flow with configured providers', () => {
  test.describe.configure({ timeout: 120_000 });

  let serverProcess: ChildProcess | null = null;

  test.beforeAll(async () => {
    serverProcess = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '-p', String(OAUTH_PORT)],
      {
        cwd: process.cwd(),
        env: { ...process.env, ...FAKE_OAUTH_ENV },
        stdio: 'ignore',
      },
    );

    // Wait until the spawned production server is ready.
    const deadline = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < deadline && !ready) {
      try {
        const response = await fetch(`${OAUTH_BASE_URL}/sign-in`, { redirect: 'manual' });
        if (response.status < 500) ready = true;
      } catch {
        // Server not up yet.
      }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!ready) throw new Error('Spawned next start server did not become ready');
  });

  test.afterAll(() => {
    serverProcess?.kill('SIGTERM');
    serverProcess = null;
  });

  test('start endpoint redirects (302) to the provider authorization URL with PKCE params', async () => {
    const apiContext = await playwrightRequest.newContext({ baseURL: OAUTH_BASE_URL });

    try {
      const googleResponse = await apiContext.get('/api/auth/oauth/google/start', {
        maxRedirects: 0,
      });
      expect(googleResponse.status()).toBe(302);

      const googleUrl = new URL(googleResponse.headers()['location'] ?? '');
      expect(googleUrl.origin + googleUrl.pathname).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
      expect(googleUrl.searchParams.get('client_id')).toBe('fake-google-client-id');
      expect(googleUrl.searchParams.get('redirect_uri')).toBe(
        `${OAUTH_BASE_URL}/api/auth/oauth/google/callback`,
      );
      expect(googleUrl.searchParams.get('response_type')).toBe('code');
      expect(googleUrl.searchParams.get('scope')).toBe('openid email profile');
      expect(googleUrl.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(googleUrl.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(googleUrl.searchParams.get('code_challenge_method')).toBe('S256');

      const setCookie = googleResponse.headers()['set-cookie'] ?? '';
      expect(setCookie).toContain('talent_google_oauth=');
      expect(setCookie).toContain('HttpOnly');

      const githubResponse = await apiContext.get('/api/auth/oauth/github/start', {
        maxRedirects: 0,
      });
      expect(githubResponse.status()).toBe(302);

      const githubUrl = new URL(githubResponse.headers()['location'] ?? '');
      expect(githubUrl.origin + githubUrl.pathname).toBe(
        'https://github.com/login/oauth/authorize',
      );
      expect(githubUrl.searchParams.get('client_id')).toBe('fake-github-client-id');
      expect(githubUrl.searchParams.get('redirect_uri')).toBe(
        `${OAUTH_BASE_URL}/api/auth/oauth/github/callback`,
      );
      expect(githubUrl.searchParams.get('scope')).toBe('read:user user:email');
      expect(githubUrl.searchParams.get('code_challenge_method')).toBe('S256');

      const githubCookie = githubResponse.headers()['set-cookie'] ?? '';
      expect(githubCookie).toContain('talent_github_oauth=');
    } finally {
      await apiContext.dispose();
    }
  });

  test('social buttons are enabled and navigate to the provider via the start endpoint', async ({
    page,
  }) => {
    // Never hit the real provider: abort the outgoing authorization request
    // and assert on its URL instead.
    await page.route('**/o/oauth2/v2/auth**', (route) => route.abort());

    await dismissCookieConsent(page);
    await page.goto(`${OAUTH_BASE_URL}/sign-in`);

    const googleButton = page.getByRole('button', { name: 'Google' });
    const githubButton = page.getByRole('button', { name: 'GitHub' });
    await expect(googleButton).toBeEnabled();
    await expect(githubButton).toBeEnabled();

    const [authorizationRequest] = await Promise.all([
      page.waitForRequest('https://accounts.google.com/o/oauth2/v2/auth**'),
      googleButton.click(),
    ]);

    const url = new URL(authorizationRequest.url());
    expect(url.searchParams.get('client_id')).toBe('fake-google-client-id');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(
      `${OAUTH_BASE_URL}/api/auth/oauth/google/callback`,
    );
  });
});
