/**
 * AES-256-GCM encryption for FileStudio credentials at rest
 * (sdd/integrations/filestudio/authentication.md: tokens and private keys are
 * never logged and never stored in plaintext).
 *
 * Payload format: `v1:<base64 iv>:<base64 auth tag>:<base64 ciphertext>`.
 * The key comes from the `FILESTUDIO_CREDENTIALS_KEY` env var (64 hex chars =
 * 32 bytes) and is injected — never read at module scope.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const IV_BYTES = 12;

function parseKey(keyHex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error('FileStudio credentials key must be 64 hex chars (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encryptCredentials(plaintext: string, keyHex: string): string {
  const key = parseKey(keyHex);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptCredentials(payload: string, keyHex: string): string {
  const [version, ivB64, tagB64, ciphertextB64] = payload.split(':');
  if (version !== VERSION || !ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Malformed FileStudio credentials payload');
  }
  const key = parseKey(keyHex);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
