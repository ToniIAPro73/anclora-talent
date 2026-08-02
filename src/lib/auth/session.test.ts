import { describe, expect, test } from 'vitest';
import { generateSessionToken, hashSessionToken, SESSION_TTL_MS } from './session-helpers';

describe('session tokens', () => {
  test('generates opaque 32-byte tokens', () => {
    const token = generateSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(43); // base64url of 32 bytes
    expect(generateSessionToken()).not.toBe(token);
  });

  test('hashes tokens to a stable 64-char hex digest', () => {
    const hash = hashSessionToken('token-abc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken('token-abc')).toBe(hash);
    expect(hashSessionToken('token-xyz')).not.toBe(hash);
  });

  test('session lifetime is 30 days', () => {
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
