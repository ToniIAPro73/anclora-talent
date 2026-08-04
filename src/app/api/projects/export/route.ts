import { type NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { renderProjectExportHtml } from '@/lib/projects/export-builder';
import { resolveExportPaginationConfig } from '@/lib/projects/export-config';
import { resolveProjectBrandTemplateOverrides } from '@/lib/brand/resolve';

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

    const slug = project.slug || 'proyecto';
    const filename = `${slug}.html`;
    // HTML shell starts with <!DOCTYPE html>, includes <html> and </html> tags in the generated payload.
    const exportConfig = resolveExportPaginationConfig(request.nextUrl.searchParams);
    // F2: optional brand theme, applied as composer template overrides (R3).
    const brandOverrides = await resolveProjectBrandTemplateOverrides(userId, project);
    const html = await renderProjectExportHtml(project, exportConfig, brandOverrides);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[export] failed', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
