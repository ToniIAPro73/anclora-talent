import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/guards';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as HandleUploadBody;
      if (
        body &&
        typeof body === 'object' &&
        'type' in body &&
        typeof body.type === 'string' &&
        body.type.startsWith('blob.')
      ) {
        const token =
          process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
        if (!token) {
          return NextResponse.json(
            { error: 'Private storage token not configured' },
            { status: 503 },
          );
        }

        const jsonResponse = await handleUpload({
          body,
          request,
          token,
          onBeforeGenerateToken: async (pathname) => {
            const ext = pathname.split('.').pop()?.toLowerCase() ?? '';
            const allowedExts = ['pdf', 'docx', 'doc', 'txt', 'md'];
            if (!allowedExts.includes(ext)) {
              throw new Error(`Unsupported file extension: .${ext}`);
            }

            const cleanFileName = pathname.replace(/[^\w.-]/g, '_');
            const safePathname = `${user.id}/source/${Date.now()}-${cleanFileName}`;

            return {
              allowedContentTypes: [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'text/plain',
                'text/markdown',
              ],
              maximumSizeInBytes: 50 * 1024 * 1024,
              pathname: safePathname,
              tokenPayload: JSON.stringify({ userId: user.id }),
            };
          },
          onUploadCompleted: async () => {},
        });

        return NextResponse.json(jsonResponse);
      }
    } catch (error) {
      console.warn('[blob-upload] handleUpload failure', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Upload failed' },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.SOURCE_DOCUMENT_READ_WRITE_TOKEN),
  });
}
