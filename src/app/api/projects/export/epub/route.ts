import { type NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { resolveDocumentRules } from '@/lib/compose/rules';
import { buildEpub } from '@/lib/epub';
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

    // Fixed-PDF document mode: EPUB is inherently reflowable, which
    // contradicts the whole point of a fixed, laid-out PDF.
    if (isFixedPdfProject(project)) {
      return NextResponse.json(
        { error: 'EPUB export is not available for a fixed PDF document' },
        { status: 409 },
      );
    }

    const exportConfig = resolveExportPaginationConfig(request.nextUrl.searchParams);
    // F2: optional brand theme — the same overrides feed the composition and
    // the EPUB stylesheet (R3: one canonical model).
    const brandOverrides = (await resolveProjectBrandTemplateOverrides(userId, project)) ?? {};
    // EPUB is reflowable: the pagination config only drives refs/numbering;
    // the engine TOC is forced to depth 3 (NAV + NCX carry real H1-H3 levels).
    const composed = composeProjectPreview(project, exportConfig, undefined, {
      tocDepth: 3,
      ...brandOverrides,
    });

    // Server-side export gate (C4): same rules the client enforces in the UI.
    const exportGate = resolveDocumentRules(project.document.rules).exportGate;
    const violations = composed.result.violations;
    if (exportGate === 'block' && violations.length > 0) {
      return NextResponse.json(
        { error: 'Export blocked by document violations', violations },
        { status: 409 },
      );
    }

    const buffer = await buildEpub(project, composed, { template: brandOverrides });
    const slug = project.slug || 'proyecto';
    const filename = `${slug}.epub`;

    return new NextResponse(new Uint8Array(buffer), {
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
