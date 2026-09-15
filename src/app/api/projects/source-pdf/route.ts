import { type NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { fetchPrivateProjectDocument } from '@/lib/blob/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Serves the original, unmodified source PDF for a fixed-pdf project.
 * The private Blob path is never sent to the client — only this
 * authenticated, ownership-checked route can resolve it into bytes.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await projectRepository.getProjectById(userId, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const sourceAsset = project.assets.find((asset) => asset.usage === 'source-document');
    if (!sourceAsset?.blobUrl) {
      return NextResponse.json({ error: 'Source PDF not found' }, { status: 404 });
    }

    const blob = await fetchPrivateProjectDocument(
      sourceAsset.blobUrl,
      project.document.source?.sourceAccessLevel ?? 'private',
    );
    if (!blob || blob.statusCode !== 200) {
      return NextResponse.json({ error: 'Source PDF not found' }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get('download') === '1';
    const filename = sourceAsset.fileName || `${project.slug || 'documento'}.pdf`;

    return new NextResponse(blob.stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[source-pdf] failed', error);
    return NextResponse.json({ error: 'Source PDF could not be served' }, { status: 500 });
  }
}
