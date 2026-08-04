import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  buildSignatureHeader,
  deriveEventDedupeKey,
  parseWebhookEvent,
  processWebhookEventForUser,
  verifyWebhookSignature,
  WEBHOOK_TOLERANCE_SECONDS,
} from './webhook';

const SECRET = 'webhook-secret';
const NOW = 1_800_000_000;

function signedBody(body: string, timestamp = NOW, secret = SECRET) {
  return { body, header: buildSignatureHeader(secret, timestamp, body) };
}

describe('verifyWebhookSignature (HMAC-SHA256, X-Anclora-Signature)', () => {
  test('accepts a valid signature inside the tolerance window', () => {
    const { body, header } = signedBody('{"type":"job.completed","jobId":"j1"}');
    expect(verifyWebhookSignature(SECRET, header, body, NOW)).toBe(true);
  });

  test('rejects a signature computed with a different secret', () => {
    const { body, header } = signedBody('{"type":"job.completed","jobId":"j1"}', NOW, 'wrong');
    expect(verifyWebhookSignature(SECRET, header, body, NOW)).toBe(false);
  });

  test('rejects a tampered body', () => {
    const { header } = signedBody('{"type":"job.completed","jobId":"j1"}');
    expect(verifyWebhookSignature(SECRET, header, '{"type":"job.failed","jobId":"j1"}', NOW)).toBe(false);
  });

  test('rejects events outside the 300 s anti-replay window', () => {
    const body = '{"type":"job.completed","jobId":"j1"}';
    const old = buildSignatureHeader(SECRET, NOW - WEBHOOK_TOLERANCE_SECONDS - 1, body);
    expect(verifyWebhookSignature(SECRET, old, body, NOW)).toBe(false);

    const edge = buildSignatureHeader(SECRET, NOW - WEBHOOK_TOLERANCE_SECONDS, body);
    expect(verifyWebhookSignature(SECRET, edge, body, NOW)).toBe(true);
  });

  test('rejects missing or malformed headers', () => {
    const body = '{}';
    expect(verifyWebhookSignature(SECRET, null, body, NOW)).toBe(false);
    expect(verifyWebhookSignature(SECRET, 'garbage', body, NOW)).toBe(false);
    expect(verifyWebhookSignature(SECRET, 't=abc,v1=zzz', body, NOW)).toBe(false);
  });
});

describe('parseWebhookEvent', () => {
  test('parses the documented event types', () => {
    for (const type of ['job.completed', 'job.failed', 'job.cancelled']) {
      expect(parseWebhookEvent(JSON.stringify({ type, jobId: 'j1' }))).toMatchObject({
        type,
        jobId: 'j1',
      });
    }
  });

  test('rejects malformed payloads', () => {
    expect(parseWebhookEvent('not json')).toBeNull();
    expect(parseWebhookEvent('{"type":"job.unknown","jobId":"j1"}')).toBeNull();
    expect(parseWebhookEvent('{"type":"job.completed"}')).toBeNull();
  });
});

function createDbMock(opts: { inserted: boolean; updated: boolean }) {
  const returningInsert = vi.fn().mockResolvedValue(opts.inserted ? [{ id: 'evt-1' }] : []);
  const returningUpdate = vi.fn().mockResolvedValue(opts.updated ? [{ id: 'job-1' }] : []);
  const insertValues = vi.fn(() => ({
    onConflictDoNothing: vi.fn(() => ({ returning: returningInsert })),
  }));
  return {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: returningUpdate })),
      })),
    })),
    insertValues,
    returningInsert,
    returningUpdate,
  };
}

describe('processWebhookEventForUser (idempotency)', () => {
  test('persists the event and marks the job completed', async () => {
    const db = createDbMock({ inserted: true, updated: true });

    const result = await processWebhookEventForUser(
      db as never,
      { type: 'job.completed', jobId: 'j1' },
      'job.completed:j1:123',
    );

    expect(result).toEqual({ duplicate: false, jobUpdated: true });
    expect(db.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: 'job.completed:j1:123', eventType: 'job.completed' }),
    );
  });

  test('a re-delivered event answers as duplicate with no effects', async () => {
    const db = createDbMock({ inserted: false, updated: false });

    const result = await processWebhookEventForUser(
      db as never,
      { type: 'job.completed', jobId: 'j1' },
      'job.completed:j1:123',
    );

    expect(result).toEqual({ duplicate: true, jobUpdated: false });
    expect(db.update).not.toHaveBeenCalled();
  });

  test('stores the raw error code on job.failed for diagnostics', async () => {
    const db = createDbMock({ inserted: true, updated: true });

    await processWebhookEventForUser(
      db as never,
      { type: 'job.failed', jobId: 'j2', errorCode: 'OUTPUT_HASH_MISMATCH' },
      'job.failed:j2:456',
    );

    const setArg = (db.update.mock.results[0].value.set as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(setArg).toMatchObject({ status: 'failed', errorCode: 'OUTPUT_HASH_MISMATCH' });
  });
});

describe('deriveEventDedupeKey', () => {
  test('combines type, job id and signature timestamp (no event id in payload)', () => {
    expect(deriveEventDedupeKey({ type: 'job.cancelled', jobId: 'j9' }, 42)).toBe(
      'job.cancelled:j9:42',
    );
  });
});
