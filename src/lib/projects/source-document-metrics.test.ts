import { describe, expect, test } from 'vitest';

import { getSourceDocumentMetrics } from './source-document-metrics';
import type { ProjectRecord } from './types';

describe('source-document-metrics', () => {
  test('prefers the imported source page count over a word-based estimate', () => {
    const project: ProjectRecord = {
      id: 'project-1',
      userId: 'user-1',
      workspaceId: null,
      slug: 'demo',
      title: 'Demo',
      status: 'draft',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
      document: {
        id: 'document-1',
        title: 'Demo',
        subtitle: '',
        author: 'Autor',
        language: 'es',
        source: {
          fileName: 'demo.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          importedAt: '2026-04-08T00:00:00.000Z',
          pageCount: 43,
        },
        chapters: [
          {
            id: 'chapter-1',
            order: 1,
            title: 'Capítulo 1',
            blocks: [{ id: 'block-1', order: 1, type: 'paragraph', content: '<p>Texto corto</p>' }],
          },
        ],
      },
      cover: {
        id: 'cover-1',
        title: 'Demo',
        subtitle: '',
        palette: 'obsidian',
        backgroundImageUrl: null,
        thumbnailUrl: null,
      },
      backCover: {
        id: 'back-cover-1',
        title: 'Demo',
        body: '',
        authorBio: '',
        accentColor: null,
        backgroundImageUrl: null,
        renderedImageUrl: null,
      },
      assets: [],
    };

    const metrics = getSourceDocumentMetrics(project);

    expect(metrics?.estimatedSourcePages).toBe(43);
  });
});
