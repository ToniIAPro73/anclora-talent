import 'server-only';

/**
 * Sales channels configuration (F4).
 *
 * The Gumroad channel is feature-flagged by `GUMROAD_ENABLED` ("true") OR by
 * the presence of a per-user token (a stored credential implies intent; the
 * flag only gates the UI when no token exists yet). Hotmart needs no flag:
 * its channel is a manual export package, always available with a database.
 *
 * Credential encryption key: `SALES_CREDENTIALS_KEY` (64 hex chars = 32
 * bytes), falling back to `FILESTUDIO_CREDENTIALS_KEY` so deployments with a
 * single credentials key keep working. AES-256-GCM scheme of
 * filestudio/crypto.ts.
 */
export function isGumroadFlagEnabled(): boolean {
  return process.env.GUMROAD_ENABLED === 'true';
}

/** 64-char hex key (32 bytes) for AES-256-GCM credentials at rest. */
export function getSalesCredentialsKey(): string | null {
  const key = process.env.SALES_CREDENTIALS_KEY || process.env.FILESTUDIO_CREDENTIALS_KEY;
  return key || null;
}
