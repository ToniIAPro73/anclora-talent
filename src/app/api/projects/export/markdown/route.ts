import { type NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { documentToMarkdown } from '@/lib/document/to-markdown';
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

    // Fixed-PDF document mode: there is no semantic document to flatten into
    // Markdown — the original PDF is the canonical visual source.
    if (isFixedPdfProject(project)) {
      return NextResponse.json(
        { error: 'Markdown export is not available for a fixed PDF document' },
        { status: 409 },
      );
    }

    const markdown = documentToMarkdown(projectToSemanticDocument(project).document);
    const slug = project.slug || 'proyecto';
    const filename = `${slug}.md`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[export/markdown] failed', error);
    return NextResponse.json({ error: 'Markdown export failed' }, { status: 500 });
  }
}
