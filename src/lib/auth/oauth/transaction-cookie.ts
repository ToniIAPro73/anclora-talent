import { z } from 'zod';
import type { OAuthTransaction } from './pkce';

export const OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000; // 10 minutes

const transactionPayloadSchema = z.object({
  state: z.string().min(1),
  codeVerifier: z.string().min(1),
  expiresAt: z.number().int().positive(),
});

export type OAuthTransactionPayload = z.infer<typeof transactionPayloadSchema>;

export const OAUTH_TRANSACTION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: OAUTH_TRANSACTION_TTL_MS / 1000,
} as const;

export function oauthTransactionCookieName(provider: 'google' | 'github'): string {
  return `talent_${provider}_oauth`;
}

export function encodeOAuthTransaction(
  transaction: Pick<OAuthTransaction, 'state' | 'codeVerifier'>,
  now: number = Date.now(),
): string {
  const payload: OAuthTransactionPayload = {
    state: transaction.state,
    codeVerifier: transaction.codeVerifier,
    expiresAt: now + OAUTH_TRANSACTION_TTL_MS,
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * Decodes and validates the transaction cookie. Returns `null` for any
 * malformed or expired payload — the caller treats that as an invalid
 * OAuth state and bounces the user back to sign-in.
 */
export function decodeOAuthTransaction(
  value: string | undefined,
  now: number = Date.now(),
): OAuthTransactionPayload | null {
  if (!value) return null;

  try {
    const parsed = transactionPayloadSchema.safeParse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
    );

    if (!parsed.success || parsed.data.expiresAt <= now) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}
