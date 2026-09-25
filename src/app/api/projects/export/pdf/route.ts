import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { fetchPrivateProjectDocument } from '@/lib/blob/client';
import { buildProjectPdfWithConfig } from '@/lib/projects/export-builder';
import { resolveExportPaginationConfig } from '@/lib/projects/export-config';
import { resolveProjectBrandTemplateOverrides } from '@/lib/brand/resolve';
import { isFixedPdfProject } from '@/lib/projects/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

    // Fixed-PDF document mode: the original PDF is the canonical visual
    // source. Export returns the exact uploaded bytes and never invokes the
    // normal composer/builder pipeline below.
    if (isFixedPdfProject(project)) {
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

      const originalFilename = sourceAsset.fileName || `${project.slug || 'proyecto'}.pdf`;
      return new NextResponse(blob.stream, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': `attachment; filename="${originalFilename}"`,
        },
      });
    }

    const exportConfig = resolveExportPaginationConfig(request.nextUrl.searchParams);
    // F2: optional brand theme, applied as composer template overrides (R3).
    const brandOverrides = await resolveProjectBrandTemplateOverrides(userId, project);
    const pdfDoc = await buildProjectPdfWithConfig(project, exportConfig, brandOverrides);
    const buffer = await renderToBuffer(pdfDoc);

    const slug = project.slug || 'proyecto';
    const filename = `${slug}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[export/pdf] failed', error);
    const message = error instanceof Error ? error.message : 'PDF export failed';
    const details =
      process.env.VERCEL_ENV === 'preview'
        ? {
            name: error instanceof Error ? error.name : typeof error,
            message,
            stack: error instanceof Error ? error.stack : undefined,
          }
        : undefined;

    return NextResponse.json({ error: 'PDF export failed', details }, { status: 500 });
  }
}
