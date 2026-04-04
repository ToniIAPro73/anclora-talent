import { type NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth/guards';
import { projectRepository } from '@/lib/db/repositories';
import type { DocumentBlock, DocumentChapter } from '@/lib/projects/types';

function blockToHtml(block: DocumentBlock): string {
  const isHtml = block.content.trimStart().startsWith('<');
  if (isHtml) return block.content;

  if (block.type === 'heading') {
    return `<h2>${escapeHtml(block.content)}</h2>`;
  }
  if (block.type === 'quote') {
    return `<blockquote><p>${escapeHtml(block.content)}</p></blockquote>`;
  }
  return `<p>${escapeHtml(block.content)}</p>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chapterToHtml(chapter: DocumentChapter, showTitle: boolean): string {
  const titleHtml = showTitle ? `<h1>${escapeHtml(chapter.title)}</h1>` : '';
  const blocksHtml = chapter.blocks.map(blockToHtml).join('\n');
  return `${titleHtml}\n${blocksHtml}`;
}

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

    const { document, cover } = project;
    const multiChapter = document.chapters.length > 1;

    const chaptersHtml = document.chapters
      .map((chapter) => chapterToHtml(chapter, multiChapter))
      .join('\n<hr />\n');

    const slug = project.slug || 'proyecto';
    const filename = `${slug}.html`;

    const html = `<!DOCTYPE html>
<html lang="${document.language ?? 'es'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(document.title)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 2rem; color: #1a1a1a; line-height: 1.7; }
    h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    h2 { font-size: 1.4rem; font-weight: 700; margin-top: 2rem; }
    blockquote { border-left: 4px solid #d4af37; margin-left: 0; padding-left: 1.25rem; color: #555; font-style: italic; }
    p { margin: 1rem 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
    .cover-meta { color: #666; font-size: 0.9rem; margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 2px solid #d4af37; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(cover.title || document.title)}</h1>
    <div class="cover-meta">${escapeHtml(cover.subtitle || document.subtitle)}</div>
  </header>
  <main>
    ${chaptersHtml}
  </main>
</body>
</html>`;

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
