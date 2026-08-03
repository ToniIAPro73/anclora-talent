import { describe, expect, it } from 'vitest';
import type { ProjectRecord } from '@/lib/projects/types';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { resolveDocumentRules } from './rules';
import {
  buildComposedFlowHtml,
  buildGeneratedTocHtml,
  composeProjectPreview,
  composeProjectPreviewIncremental,
  findChangedChapterStartId,
  projectToSemanticDocument,
  templateFromPaginationConfig,
} from './preview-adapter';

const config = DEVICE_PAGINATION_CONFIGS.laptop;

function createProject(overrides?: {
  chapters?: ProjectRecord['document']['chapters'];
  rules?: ProjectRecord['document']['rules'];
}): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'book',
    title: 'Book',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'doc-1',
      title: 'Book',
      subtitle: 'Sub',
      author: 'Anon',
      language: 'es',
      rules: overrides?.rules ?? null,
      chapters: overrides?.chapters ?? [
        {
          id: 'ch1',
          order: 1,
          title: 'Capítulo 1',
          blocks: [
            { id: 'b1', type: 'paragraph', order: 1, content: '<h1>Capítulo 1</h1><p>Contenido del capítulo uno.</p>' },
          ],
        },
        {
          id: 'ch2',
          order: 2,
          title: 'Capítulo 2',
          blocks: [
            { id: 'b2', type: 'paragraph', order: 1, content: '<h1>Capítulo 2</h1><p>Contenido del capítulo dos.</p>' },
          ],
        },
      ],
    },
    cover: {
      id: 'cov-1',
      title: 'Book',
      subtitle: 'Sub',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      surfaceState: createDefaultSurfaceState('cover'),
    },
    backCover: {
      id: 'bc-1',
      title: 'Book',
      body: 'Contraportada',
      authorBio: 'Bio',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
      surfaceState: createDefaultSurfaceState('back-cover'),
    },
    assets: [],
  };
}

describe('composeProjectPreview — PreviewPage[] contract', () => {
  it('keeps the stable contract: cover first (page 1), content 2+, back-cover last', () => {
    const { pages } = composeProjectPreview(createProject(), config);
    expect(pages[0].type).toBe('cover');
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].coverData?.author).toBe('Anon');
    const last = pages[pages.length - 1];
    expect(last.type).toBe('back-cover');
    const content = pages.filter((p) => p.type === 'content');
    expect(content[0].pageNumber).toBe(2);
    expect(content.map((p) => p.pageNumber)).toEqual(
      content.map((_, i) => i + 2),
    );
  });

  it('never mixes two project chapters on the same page', () => {
    const { pages } = composeProjectPreview(createProject(), config);
    const content = pages.filter((p) => p.type === 'content');
    const ch1Pages = content.filter((p) => p.chapterId === 'ch1');
    const ch2Pages = content.filter((p) => p.chapterId === 'ch2');
    expect(ch1Pages.length).toBeGreaterThan(0);
    expect(ch2Pages.length).toBeGreaterThan(0);
    for (const page of content) {
      expect(['ch1', 'ch2']).toContain(page.chapterId);
    }
    expect(ch1Pages[0].content).toContain('Capítulo 1');
    expect(ch1Pages[0].content).not.toContain('Capítulo 2');
  });

  it('replaces the TOC chapter with the generated index (data-toc-* contract)', () => {
    const project = createProject({
      chapters: [
        {
          id: 'toc',
          order: 1,
          title: 'Índice',
          blocks: [{ id: 'btoc', type: 'paragraph', order: 1, content: '<p>obsolete</p>' }],
        },
        {
          id: 'ch1',
          order: 2,
          title: 'Capítulo 1',
          blocks: [
            { id: 'b1', type: 'paragraph', order: 1, content: '<h1>Capítulo 1</h1><p>Texto.</p>' },
          ],
        },
      ],
    });
    const { pages, result } = composeProjectPreview(project, config);
    const tocPage = pages.find((p) => p.chapterId === 'toc');
    expect(tocPage).toBeDefined();
    expect(tocPage!.content).toContain('data-toc-entry="true"');
    expect(tocPage!.content).toContain('class="toc-title"');
    expect(tocPage!.content).not.toContain('obsolete');
    // The TOC entry points at the global page number of the chapter start.
    const ch1First = pages.find((p) => p.chapterId === 'ch1');
    expect(tocPage!.content).toContain(`data-toc-page="${ch1First!.pageNumber}"`);
    expect(result.toc.length).toBeGreaterThan(0);
  });

  it('applies project rules: a table never splits across pages', () => {
    const rows = Array.from({ length: 40 }, (_, i) => `<tr><td>fila ${i}</td></tr>`).join('');
    const filler = `<p>${'palabra '.repeat(400)}</p>`;
    const project = createProject({
      chapters: [
        {
          id: 'ch1',
          order: 1,
          title: 'Capítulo 1',
          blocks: [
            { id: 'b1', type: 'paragraph', order: 1, content: `<h1>Capítulo 1</h1>${filler}<table>${rows}</table>` },
          ],
        },
      ],
    });
    const { pages } = composeProjectPreview(project, config);
    const tablePages = pages.filter((p) => p.content?.includes('<table>'));
    expect(tablePages).toHaveLength(1);
    expect(tablePages[0].content).toContain('fila 39');
    expect(tablePages[0].content).toContain('fila 0');
  });

  it('materializes ref tokens with resolved labels', () => {
    const project = createProject({
      chapters: [
        {
          id: 'ch1',
          order: 1,
          title: 'Capítulo 1',
          blocks: [
            {
              id: 'b1',
              type: 'paragraph',
              order: 1,
              content:
                '<h1>Capítulo 1</h1>' +
                '<figure id="fig-x"><img src="https://example.test/f.png"/><figcaption>Fig</figcaption></figure>' +
                '<p>Ver <span data-ref-kind="figure" data-ref-target="fig-x">?</span>.</p>',
            },
          ],
        },
      ],
    });
    // htmlToBlocks assigns ids; find the figure id via the composed refs.
    const { pages, result } = composeProjectPreview(project, config);
    const figureIds = Object.keys(result.figures);
    expect(figureIds).toHaveLength(1);
    const html = pages.map((p) => p.content ?? '').join('');
    expect(html).toContain(`data-ref-target="${figureIds[0]}"`);
    expect(html).toContain(`>${result.figures[figureIds[0]]}</span>`);
  });

  it('pads blank pages when chapterStartsOnOddPage is enabled', () => {
    const project = createProject({
      rules: resolveDocumentRules({ chapterStartsOnOddPage: true }),
    });
    const { pages } = composeProjectPreview(project, config);
    const ch2First = pages.find((p) => p.chapterId === 'ch2');
    expect(ch2First!.pageNumber % 2).toBe(1); // odd page number (content numbering includes cover offset)
  });
});

describe('buildComposedFlowHtml', () => {
  it('joins content pages with manual page-break markers', () => {
    const { pages } = composeProjectPreview(createProject(), config);
    const flow = buildComposedFlowHtml(pages);
    expect(flow).toContain('<hr data-page-break="manual">');
    expect(flow).toContain('Capítulo 1');
    expect(flow).toContain('Capítulo 2');
  });
});

describe('projectToSemanticDocument / templateFromPaginationConfig', () => {
  it('anchors chapter starts on the first block of each chapter', () => {
    const { chapterStartIds, document } = projectToSemanticDocument(createProject());
    expect(chapterStartIds).toHaveLength(2);
    expect(document.blocks[0].id).toBe(chapterStartIds[0]);
  });

  it('maps PaginationConfig 1:1 into a ComposeTemplate', () => {
    const template = templateFromPaginationConfig(config);
    expect(template.pageWidth).toBe(config.pageWidth);
    expect(template.margins.top).toBe(config.marginTop);
    expect(template.baseFontSize).toBe(config.fontSize);
    expect(template.lineHeight).toBe(config.lineHeight);
  });

  it('generates TOC html only when entries exist', () => {
    const { result } = composeProjectPreview(createProject(), config);
    const html = buildGeneratedTocHtml(result, 2);
    expect(html).toContain('data-toc-level="1"');
  });
});

describe('composeProjectPreview — metadata injection (C7)', () => {
  function projectWithMetadata(): ProjectRecord {
    const project = createProject({
      chapters: [
        {
          id: 'toc',
          order: 1,
          title: 'Índice',
          blocks: [{ id: 'btoc', type: 'paragraph', order: 1, content: '<p>x</p>' }],
        },
        {
          id: 'ch1',
          order: 2,
          title: 'Capítulo 1',
          blocks: [
            { id: 'b1', type: 'paragraph', order: 1, content: '<h1>Capítulo 1</h1><p>Texto.</p>' },
          ],
        },
      ],
    });
    project.document.metadata = {
      title: 'Libro',
      subtitle: 'Subtítulo',
      author: 'Autora',
      isbn: '978-84-0000000-0-0',
      description: 'Descripción del libro',
      keywords: ['novela', 'ensayo'],
      language: 'es',
    };
    return project;
  }

  it('injects title page and legal page from DocumentMetadata after the cover', () => {
    const { pages } = composeProjectPreview(projectWithMetadata(), config);
    expect(pages[1].content).toContain('class="title-page"');
    expect(pages[1].content).toContain('Autora');
    expect(pages[2].content).toContain('class="legal-page"');
    expect(pages[2].content).toContain('ISBN: 978-84-0000000-0-0');
    expect(pages[2].content).toContain('novela, ensayo');
  });

  it('shifts generated TOC page numbers past the injected front matter', () => {
    const { pages } = composeProjectPreview(projectWithMetadata(), config);
    const tocPage = pages.find((p) => p.chapterId === 'toc');
    const ch1First = pages.find((p) => p.chapterId === 'ch1');
    expect(tocPage!.content).toContain(`data-toc-page="${ch1First!.pageNumber}"`);
    // cover (1) + title page (2) + legal (3) + toc (4) + ch1 (5)
    expect(ch1First!.pageNumber).toBe(5);
  });

  it('does not inject front matter when no extended metadata exists', () => {
    const { pages } = composeProjectPreview(createProject(), config);
    expect(pages.some((p) => p.content?.includes('title-page'))).toBe(false);
    expect(pages.some((p) => p.content?.includes('legal-page'))).toBe(false);
  });
});

describe('composeProjectPreviewIncremental (C5)', () => {
  it('recomposes only from the changed chapter and equals a full compose', () => {
    const longText = `<p>${'palabra '.repeat(300)}</p>`;
    const project = createProject({
      chapters: [
        { id: 'ch1', order: 1, title: 'Capítulo 1', blocks: [{ id: 'b1', type: 'paragraph', order: 1, content: '<h1>Capítulo 1</h1><p>Uno.</p>' }] },
        { id: 'ch2', order: 2, title: 'Capítulo 2', blocks: [{ id: 'b2', type: 'paragraph', order: 1, content: '<h1>Capítulo 2</h1><p>Dos.</p>' }] },
        { id: 'ch3', order: 3, title: 'Capítulo 3', blocks: [{ id: 'b3', type: 'paragraph', order: 1, content: '<h1>Capítulo 3</h1><p>Tres.</p>' }] },
      ],
    });
    const prev = composeProjectPreview(project, config);

    const edited = createProject({
      chapters: [
        { id: 'ch1', order: 1, title: 'Capítulo 1', blocks: [{ id: 'b1', type: 'paragraph', order: 1, content: '<h1>Capítulo 1</h1><p>Uno.</p>' }] },
        { id: 'ch2', order: 2, title: 'Capítulo 2', blocks: [{ id: 'b2', type: 'paragraph', order: 1, content: `<h1>Capítulo 2</h1>${longText}` }] },
        { id: 'ch3', order: 3, title: 'Capítulo 3', blocks: [{ id: 'b3', type: 'paragraph', order: 1, content: '<h1>Capítulo 3</h1><p>Tres.</p>' }] },
      ],
    });

    const changedStartId = findChangedChapterStartId(project, edited);
    expect(changedStartId).not.toBeNull();

    const incremental = composeProjectPreviewIncremental(prev, edited, changedStartId!, config);
    const full = composeProjectPreview(edited, config);

    expect(incremental.pages).toEqual(full.pages);
    expect(incremental.result).toEqual(full.result);
    expect(incremental.recomposedFromPage).toBeDefined();
    // The badge points at the first page of chapter 2.
    const ch2First = full.pages.find((p) => p.chapterId === 'ch2');
    expect(incremental.recomposedFromPage).toBe(ch2First!.pageNumber);
  });

  it('findChangedChapterStartId returns null when nothing changed or structure changed', () => {
    const project = createProject();
    expect(findChangedChapterStartId(project, createProject())).toBeNull();
    const withExtra = createProject();
    withExtra.document.chapters.push({ id: 'chX', order: 3, title: 'Extra', blocks: [] });
    expect(findChangedChapterStartId(project, withExtra)).toBeNull();
  });
});
