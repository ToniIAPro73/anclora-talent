type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOGIN_MAX_ATTEMPTS = 5;
const MAX_TRACKED_KEYS = 1000;

const attempts = new Map<string, RateLimitEntry>();

function pruneExpired(now: number) {
  if (attempts.size <= MAX_TRACKED_KEYS) return;
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginAttempt(key: string): void {
  const now = Date.now();
  pruneExpired(now);

  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  entry.count += 1;
}

export function resetLoginAttempts(key: string): void {
  attempts.delete(key);
}

// OAuth start/callback endpoints: 10 requests per 15 minutes per IP.
const OAUTH_WINDOW_MS = 15 * 60 * 1000;
const OAUTH_MAX_ATTEMPTS = 10;

const oauthAttempts = new Map<string, RateLimitEntry>();

function pruneOAuthExpired(now: number) {
  if (oauthAttempts.size <= MAX_TRACKED_KEYS) return;
  for (const [key, entry] of oauthAttempts) {
    if (entry.resetAt <= now) oauthAttempts.delete(key);
  }
}

export function checkOAuthRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = oauthAttempts.get(key);

  if (!entry || entry.resetAt <= now) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= OAUTH_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordOAuthAttempt(key: string): void {
  const now = Date.now();
  pruneOAuthExpired(now);

  const entry = oauthAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    oauthAttempts.set(key, { count: 1, resetAt: now + OAUTH_WINDOW_MS });
    return;
  }

  entry.count += 1;
}
