import { type NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { buildProjectDocxBuffer } from '@/lib/projects/export-builder';
import { resolveExportPaginationConfig } from '@/lib/projects/export-config';
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

    // Fixed-PDF document mode: DOCX export reflows the composed document,
    // which contradicts the whole point of a fixed, laid-out PDF.
    if (isFixedPdfProject(project)) {
      return NextResponse.json(
        { error: 'DOCX export is not available for a fixed PDF document' },
        { status: 409 },
      );
    }

    const exportConfig = resolveExportPaginationConfig(request.nextUrl.searchParams);
    const buffer = await buildProjectDocxBuffer(project, exportConfig);
    const slug = project.slug || 'proyecto';
    const filename = `${slug}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[export/docx] failed', error);
    return NextResponse.json({ error: 'DOCX export failed' }, { status: 500 });
  }
}
