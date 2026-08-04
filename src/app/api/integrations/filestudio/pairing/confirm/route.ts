import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUserId } from '@/lib/auth/guards';
import { FileStudioApiError } from '@/lib/filestudio/client';
import { isFileStudioEnabled } from '@/lib/filestudio/config';
import { confirmPairing } from '@/lib/filestudio/pairing';

export const runtime = 'nodejs';

const confirmSchema = z.object({
  // Shown by the Local Agent next to the code (no approve-by-code endpoint
  // exists in FileStudio — documented contract gap).
  requestId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

/**
 * POST /api/integrations/filestudio/pairing/confirm
 *
 * Approves a Local Agent pairing with the 6-digit code (TTL 10 min, max
 * 20 attempts in FileStudio) and stores the issued credentials encrypted.
 * Error responses carry the mapped i18n message key, never FileStudio codes.
 */
export async function POST(request: Request) {
  if (!isFileStudioEnabled()) {
    return NextResponse.json({ error: 'integration_disabled' }, { status: 404 });
  }

  const userId = await requireUserId();

  const body = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const connection = await confirmPairing(userId, body.data);
    return NextResponse.json({ status: connection.status, deviceId: connection.deviceId });
  } catch (error) {
    if (error instanceof FileStudioApiError) {
      const mapped = error.mapped;
      return NextResponse.json(
        { error: mapped.messageKey ?? 'unavailable', action: mapped.action },
        { status: error.status === 409 ? 400 : 502 },
      );
    }
    console.error('[filestudio/pairing/confirm] failed', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
}
