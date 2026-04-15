import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { buildProjectPdfWithConfig } from '@/lib/projects/export-builder';
import { resolveExportPaginationConfig } from '@/lib/projects/export-config';

export const runtime = 'nodejs';

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

    const exportConfig = resolveExportPaginationConfig(request.nextUrl.searchParams);
    const pdfDoc = await buildProjectPdfWithConfig(project, exportConfig);
    const buffer = await renderToBuffer(pdfDoc);

    const slug = project.slug || 'proyecto';
    const filename = `${slug}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[export/pdf] failed', error);
    return NextResponse.json({ error: 'PDF export failed' }, { status: 500 });
  }
}
