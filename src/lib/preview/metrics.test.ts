import { describe, expect, it } from 'vitest';
import { computeChapterPageMetrics } from './metrics';
import type { ProjectRecord } from '@/lib/projects/types';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { countRenderablePages, paginateContent } from './content-paginator';
import { DEVICE_PAGINATION_CONFIGS } from './device-configs';
import { normalizeHtmlContent } from './html-normalize';
import { reconcileOverflowBreaks } from './editor-page-layout';

function createProject(overrides?: Partial<ProjectRecord>): ProjectRecord {
  const baseProject: ProjectRecord = {
    id: 'proj-metrics',
    userId: 'user-1',
    workspaceId: null,
    slug: 'metrics',
    title: 'Metrics',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    document: {
      id: 'doc-1',
      title: 'Documento',
      subtitle: '',
      author: 'Autor',
      language: 'es',
      chapters: [
        {
          id: 'chapter-1',
          order: 1,
          title: 'Introducción',
          blocks: [
            {
              id: 'block-1',
              type: 'paragraph',
              order: 1,
              content: '<p>Primer párrafo real.</p>',
            },
            {
              id: 'block-2',
              type: 'paragraph',
              order: 2,
              content: '<hr data-page-break="manual" />',
            },
            {
              id: 'block-3',
              type: 'paragraph',
              order: 3,
              content: '<p>Segundo párrafo real.</p>',
            },
          ],
        },
      ],
      source: null,
    },
    cover: {
      id: 'cover-1',
      title: 'Cover',
      subtitle: '',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'back-1',
      title: 'Back',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };

  return { ...baseProject, ...overrides };
}

describe('metrics', () => {
  it('computes chapter page counts from canonical chapter html without synthetic headings', () => {
    const project = createProject();
    const chapter = project.document.chapters[0];
    const chapterHtml = chapterBlocksToHtml(chapter.blocks);
    const expectedLaptopPages = countRenderablePages(
      paginateContent(
        normalizeHtmlContent(
          reconcileOverflowBreaks(chapterHtml, DEVICE_PAGINATION_CONFIGS.laptop),
        ),
        DEVICE_PAGINATION_CONFIGS.laptop,
      ),
    );

    const metrics = computeChapterPageMetrics(project);

    expect(metrics).toHaveLength(1);
    expect(metrics[0].chapterId).toBe(chapter.id);
    expect(metrics[0].pagesByFormat.laptop).toBe(expectedLaptopPages);
  });
});
