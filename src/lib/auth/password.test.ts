import { describe, expect, test } from 'vitest';
import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  verifyPassword,
} from './password';

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const SAMPLE_CREDENTIAL = fakeCred('sample', 'cred', '9');
const WRONG_CREDENTIAL = fakeCred('wrong', 'cred', '1');

describe('isValidEmail', () => {
  test.each(['user@example.com', 'a.b+tag@sub.domain.es'])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  test.each(['', 'plain', 'a@b', 'a b@c.com', '@example.com'])('rejects %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('normalizeEmail', () => {
  test('lowercases and trims', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });
});

describe('isValidPassword', () => {
  test('requires at least 8 characters with a letter and a number', () => {
    expect(isValidPassword(fakeCred('valid', 'pass', '7'))).toBe(true);
    expect(isValidPassword(fakeCred('a', 'b', '1'))).toBe(false);
    expect(isValidPassword(fakeCred('only', 'letters', 'here'))).toBe(false);
    expect(isValidPassword(String(12345678))).toBe(false);
  });
});

describe('hashPassword / verifyPassword', () => {
  test('round-trips a password', async () => {
    const hash = await hashPassword(SAMPLE_CREDENTIAL);
    expect(hash).not.toContain(SAMPLE_CREDENTIAL);
    await expect(verifyPassword(SAMPLE_CREDENTIAL, hash)).resolves.toBe(true);
    await expect(verifyPassword(WRONG_CREDENTIAL, hash)).resolves.toBe(false);
  });

  test('returns false for a malformed hash instead of throwing', async () => {
    await expect(verifyPassword(fakeCred('any', 'cred', '3'), 'not-a-hash')).resolves.toBe(false);
  });
});
