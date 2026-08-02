import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { createOAuthTransaction, oauthStatesMatch } from './pkce';

describe('createOAuthTransaction', () => {
  test('generates state and code verifier as 32-byte base64url values', () => {
    const transaction = createOAuthTransaction();

    expect(transaction.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(transaction.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  test('derives the code challenge as base64url(SHA256(codeVerifier))', () => {
    const transaction = createOAuthTransaction();
    const expectedChallenge = createHash('sha256')
      .update(transaction.codeVerifier)
      .digest('base64url');

    expect(transaction.codeChallenge).toBe(expectedChallenge);
  });

  test('generates unique transactions', () => {
    const first = createOAuthTransaction();
    const second = createOAuthTransaction();

    expect(first.state).not.toBe(second.state);
    expect(first.codeVerifier).not.toBe(second.codeVerifier);
  });
});

describe('oauthStatesMatch', () => {
  test('accepts identical states', () => {
    expect(oauthStatesMatch('state-abc', 'state-abc')).toBe(true);
  });

  test('rejects different states', () => {
    expect(oauthStatesMatch('state-abc', 'state-abd')).toBe(false);
  });

  test('rejects states of different length without throwing', () => {
    expect(oauthStatesMatch('state-abc', 'state-abc-longer')).toBe(false);
  });

  test('rejects a missing state', () => {
    expect(oauthStatesMatch('state-abc', undefined)).toBe(false);
  });
});
