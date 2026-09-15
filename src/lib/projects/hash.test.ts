import { describe, expect, test } from 'vitest';
import { sha256Buffer } from './hash';

describe('sha256Buffer', () => {
  test('matches the known SHA-256 vector for an empty buffer', () => {
    expect(sha256Buffer(Buffer.from(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  test('matches the known SHA-256 vector for "abc"', () => {
    expect(sha256Buffer(Buffer.from('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  test('is deterministic for identical byte content', () => {
    const a = Buffer.from('hello world');
    const b = Buffer.from('hello world');
    expect(sha256Buffer(a)).toBe(sha256Buffer(b));
  });

  test('differs for different byte content', () => {
    expect(sha256Buffer(Buffer.from('hello'))).not.toBe(sha256Buffer(Buffer.from('world')));
  });
});
