/**
 * Webhook receiver primitives — FileStudio → Talent.
 *
 * Implements sdd/integrations/filestudio/webhook-flow.md against the real
 * FileStudio signature scheme (apps/api/src/services/webhook-delivery.ts):
 *
 * - Header `X-Anclora-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256>`.
 * - Signing input: `${t}.${rawBody}`.
 * - Anti-replay window: ±300 s.
 * - Constant-time comparison.
 *
 * Idempotency: FileStudio retries deliveries on non-2xx, so every event is
 * persisted with a dedupe key and re-deliveries answer 200 with no effects.
 * The current payload carries no event id, so the dedupe key is derived as
 * `type:externalJobId:signature-timestamp` (documented contract gap); once
 * the versioned contract adds an event id it becomes the key directly.
 */

import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { filestudioJobs, filestudioWebhookEvents } from '@/lib/db/schema';

export const WEBHOOK_SIGNATURE_HEADER = 'X-Anclora-Signature';
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export type FileStudioWebhookEventType = 'job.completed' | 'job.failed' | 'job.cancelled';

export interface FileStudioWebhookEvent {
  type: FileStudioWebhookEventType;
  jobId: string;
  /** FileStudio error code on job.failed; mapped before reaching the UI. */
  errorCode?: string;
  [key: string]: unknown;
}

export function signWebhookPayload(secret: string, timestamp: number, rawBody: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
}

export function buildSignatureHeader(secret: string, timestamp: number, rawBody: string): string {
  return `t=${timestamp},v1=${signWebhookPayload(secret, timestamp, rawBody)}`;
}

/**
 * Verifies the signature header against the raw body. Order matters
 * (webhook-flow.md): HMAC freshness first, then constant-time compare.
 */
export function verifyWebhookSignature(
  secret: string,
  signatureHeader: string | null,
  rawBody: string,
  nowSeconds: number,
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const eqIndex = part.indexOf('=');
      return [part.slice(0, eqIndex), part.slice(eqIndex + 1)];
    }),
  );
  const timestamp = Number(parts['t']);
  const signature = parts['v1'];
  if (!Number.isFinite(timestamp) || !signature) return false;

  // Anti-replay: reject events older than the tolerance window.
  if (Math.abs(nowSeconds - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signWebhookPayload(secret, timestamp, rawBody), 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

/** Derives the idempotency key documented above. */
export function deriveEventDedupeKey(event: FileStudioWebhookEvent, signatureTimestamp: number): string {
  return `${event.type}:${event.jobId}:${signatureTimestamp}`;
}

/** Parses and validates the event body; returns null when malformed. */
export function parseWebhookEvent(rawBody: string): FileStudioWebhookEvent | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const { type, jobId, errorCode } = body as Record<string, unknown>;
  if (type !== 'job.completed' && type !== 'job.failed' && type !== 'job.cancelled') return null;
  if (typeof jobId !== 'string' || jobId.length === 0) return null;
  return {
    type,
    jobId,
    ...(typeof errorCode === 'string' ? { errorCode } : {}),
  };
}

type WebhookStore = Pick<ReturnType<typeof getDb>, 'insert' | 'update'>;

export interface ProcessWebhookResult {
  duplicate: boolean;
  jobUpdated: boolean;
}

/**
 * Persists the event (dedupe) and applies the Talent state mutation. Both
 * paths (webhook and polling fallback) converge on this idempotent mutation.
 * Heavy work (downloading the result with the single-use token) is deferred
 * outside the request by the caller — the handler must answer fast.
 */
export async function processWebhookEventForUser(
  db: WebhookStore,
  event: FileStudioWebhookEvent,
  dedupeKey: string,
): Promise<ProcessWebhookResult> {
  const inserted = await db
    .insert(filestudioWebhookEvents)
    .values({
      dedupeKey,
      eventType: event.type,
      externalJobId: event.jobId,
      payload: event as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: filestudioWebhookEvents.dedupeKey })
    .returning({ id: filestudioWebhookEvents.id });

  if (inserted.length === 0) {
    return { duplicate: true, jobUpdated: false };
  }

  const now = new Date();
  const update =
    event.type === 'job.completed'
      ? { status: 'completed', updatedAt: now }
      : event.type === 'job.cancelled'
        ? { status: 'cancelled', updatedAt: now }
        : {
            status: 'failed',
            // Raw code stored for diagnostics only; the UI maps it through
            // errors.ts before showing anything (error-mapping.md).
            errorCode: event.errorCode ?? null,
            updatedAt: now,
          };

  const updated = await db
    .update(filestudioJobs)
    .set(update)
    .where(eq(filestudioJobs.externalJobId, event.jobId))
    .returning({ id: filestudioJobs.id });

  return { duplicate: false, jobUpdated: updated.length > 0 };
}

// ── Server wrapper (lazy DB) ────────────────────────────────────────────────

export async function processWebhookEvent(
  event: FileStudioWebhookEvent,
  dedupeKey: string,
): Promise<ProcessWebhookResult> {
  return processWebhookEventForUser(getDb(), event, dedupeKey);
}
