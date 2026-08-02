import { createHash } from 'node:crypto';

/**
 * Audit-safe representation of an email address: a stable SHA-256 hex
 * digest. Logs must never contain plain-text emails.
 */
export function hashEmailForAudit(email: string): string {
  return createHash('sha256').update(email, 'utf8').digest('hex');
}
