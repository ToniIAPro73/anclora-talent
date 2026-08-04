import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/guards';
import { isFileStudioEnabled } from '@/lib/filestudio/config';
import { requestPairing } from '@/lib/filestudio/pairing';

export const runtime = 'nodejs';

const requestSchema = z.object({
  deviceName: z.string().min(1).max(255).optional(),
});

/**
 * POST /api/integrations/filestudio/pairing/request
 *
 * Registers the user's intent to pair a Local Agent. The agent itself
 * requests the 6-digit code from FileStudio; this endpoint only resets the
 * per-user connection row to `pending`.
 */
export async function POST(request: Request) {
  if (!isFileStudioEnabled()) {
    return NextResponse.json({ error: 'integration_disabled' }, { status: 404 });
  }

  const userId = await requireUserId();

  const body = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const connection = await requestPairing(userId, body.data.deviceName);
  return NextResponse.json({ status: connection.status });
}
