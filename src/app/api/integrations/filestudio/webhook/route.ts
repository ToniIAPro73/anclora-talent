import { after, NextResponse } from 'next/server';
import { getFileStudioConfig } from '@/lib/filestudio/config';
import { finalizeCompletedJobByExternalId } from '@/lib/filestudio/results';
import {
  deriveEventDedupeKey,
  parseWebhookEvent,
  processWebhookEvent,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '@/lib/filestudio/webhook';

export const runtime = 'nodejs';

/**
 * POST /api/integrations/filestudio/webhook
 *
 * FileStudio → Talent event receiver (sdd/integrations/filestudio/webhook-flow.md).
 * No user session: authentication is the HMAC signature. Verification order:
 * signature → timestamp freshness (±300 s) → idempotency. Any verification
 * failure answers 401/400 without touching the database. Success answers 200
 * fast; heavy work (result download with the single-use token) is deferred
 * outside this request.
 */
export async function POST(request: Request) {
  const config = getFileStudioConfig();
  if (!config) {
    return NextResponse.json({ error: 'integration_disabled' }, { status: 404 });
  }
  if (!config.webhookSecret) {
    console.error('[filestudio/webhook] FILESTUDIO_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!verifyWebhookSignature(config.webhookSecret, signature, rawBody, nowSeconds)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const event = parseWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: 'invalid_event' }, { status: 400 });
  }

  const timestamp = Number(signature?.match(/(?:^|,)t=(\d+)/)?.[1]);
  const result = await processWebhookEvent(event, deriveEventDedupeKey(event, timestamp));

  // Deferred reception: the result download (single-use token → Vercel Blob)
  // runs after the 200 response so FileStudio deliveries stay fast; the
  // polling fallback covers the failure path (results.ts is idempotent).
  if (event.type === 'job.completed' && result.jobUpdated) {
    after(() => finalizeCompletedJobByExternalId(event.jobId));
  }

  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}
