import { describe, expect, test } from 'vitest';
import { decryptCredentials, encryptCredentials } from './crypto';

const KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);

describe('FileStudio credentials encryption (AES-256-GCM)', () => {
  test('round-trips plaintext credentials', () => {
    const secret = JSON.stringify({ accessToken: 'at', refreshToken: 'rt' });
    const payload = encryptCredentials(secret, KEY);

    expect(payload).not.toContain(secret);
    expect(payload.startsWith('v1:')).toBe(true);
    expect(decryptCredentials(payload, KEY)).toBe(secret);
  });

  test('produces a fresh IV per encryption (no deterministic ciphertext)', () => {
    const a = encryptCredentials('same', KEY);
    const b = encryptCredentials('same', KEY);
    expect(a).not.toBe(b);
  });

  test('rejects decryption with a different key (GCM auth tag)', () => {
    const payload = encryptCredentials('secret', KEY);
    expect(() => decryptCredentials(payload, OTHER_KEY)).toThrow();
  });

  test('rejects malformed payloads and bad keys', () => {
    expect(() => decryptCredentials('not-a-payload', KEY)).toThrow('Malformed');
    expect(() => encryptCredentials('x', 'short')).toThrow('64 hex chars');
  });
});
