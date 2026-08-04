import { type NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { resolveDocumentRules } from '@/lib/compose/rules';
import { buildEpub } from '@/lib/epub';
import { resolveExportPaginationConfig } from '@/lib/projects/export-config';

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

    const exportConfig = resolveExportPaginationConfig(request.nextUrl.searchParams);
    // EPUB is reflowable: the pagination config only drives refs/numbering;
    // the engine TOC is forced to depth 3 (NAV + NCX carry real H1-H3 levels).
    const composed = composeProjectPreview(project, exportConfig, undefined, { tocDepth: 3 });

    // Server-side export gate (C4): same rules the client enforces in the UI.
    const exportGate = resolveDocumentRules(project.document.rules).exportGate;
    const violations = composed.result.violations;
    if (exportGate === 'block' && violations.length > 0) {
      return NextResponse.json(
        { error: 'Export blocked by document violations', violations },
        { status: 409 },
      );
    }

    const buffer = await buildEpub(project, composed);
    const slug = project.slug || 'proyecto';
    const filename = `${slug}.epub`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...(exportGate === 'warn' && violations.length > 0
          ? { 'x-anclora-gate': 'warn' }
          : {}),
      },
    });
  } catch (error) {
    console.error('[export/epub] failed', error);
    return NextResponse.json({ error: 'EPUB export failed' }, { status: 500 });
  }
}
