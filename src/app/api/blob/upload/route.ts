import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/guards';

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}
