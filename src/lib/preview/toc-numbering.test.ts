/**
 * Unit tests for the TOC (índice) numbering pipeline — `buildSyncedTocChapterContent`.
 * Covers the contract exposed by the "Actualizar numeración" button:
 *   - clean import → numbers injected with semantic `.toc-entry` structure
 *   - legacy text dots (`·····` or `.....`) are stripped before re-injecting
 *   - idempotency: running twice with no changes produces the same HTML
 *   - chapter added after import → new entry appended
 *   - chapter removed → its orphan entry is cleared on the next run
 */

import { describe, test, expect } from 'vitest';
import { buildSyncedTocChapterContent, stripExistingTocPageNumbers } from './preview-builder';
import { DEVICE_PAGINATION_CONFIGS } from './device-configs';
import type { ProjectRecord } from '@/lib/projects/types';

function makeProject(overrides?: Partial<ProjectRecord>): ProjectRecord {
  const base: ProjectRecord = {
    id: 'p1',
    userId: 'u1',
    workspaceId: null,
    slug: 'test',
    title: 'Test',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'd1',
      title: 'Doc',
      subtitle: '',
      author: 'Autor',
      language: 'es',
      chapters: [
        {
          id: 'toc',
          order: 0,
          title: 'Índice',
          blocks: [
            {
              id: 'toc-b1',
              type: 'paragraph',
              order: 0,
              content: '<h2>Índice</h2><p>Introducción</p><p>Capítulo 1</p>',
            },
          ],
        },
        {
          id: 'intro',
          order: 1,
          title: 'Introducción',
          blocks: [{ id: 'i-b1', type: 'paragraph', order: 0, content: '<h2>Introducción</h2><p>Texto</p>' }],
        },
        {
          id: 'c1',
          order: 2,
          title: 'Capítulo 1',
          blocks: [{ id: 'c1-b1', type: 'paragraph', order: 0, content: '<h2>Capítulo 1</h2><p>Texto</p>' }],
        },
      ],
    },
    cover: {
      id: 'cov',
      title: 'Doc',
      subtitle: '',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      layout: 'centered',
      showSubtitle: false,
    },
    backCover: {
      id: 'bc',
      title: 'Doc',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };

  return { ...base, ...overrides };
}

describe('buildSyncedTocChapterContent — Actualizar numeración', () => {
  test('adds data-toc-page on each entry paragraph (with title span)', () => {
    const project = makeProject();
    const synced = buildSyncedTocChapterContent(project, DEVICE_PAGINATION_CONFIGS.laptop);

    expect(synced).not.toBeNull();
    expect(synced?.html).toContain(
      '<p data-toc-entry="true" data-toc-level="2" data-toc-page="3"><span class="toc-title">Introducción</span></p>',
    );
    expect(synced?.html).toContain(
      '<p data-toc-entry="true" data-toc-level="2" data-toc-page="4"><span class="toc-title">Capítulo 1</span></p>',
    );
    // No se introducen `·` como texto ni otros spans anidados; el CSS pinta los `·` y el número.
    expect(synced?.html).not.toContain('····');
    expect(synced?.html).not.toContain('.....');
    expect(synced?.html).not.toContain('<span class="toc-page"');
  });

  test('legacy text dots ("······5") get stripped and replaced by data-toc-page', () => {
    const project = makeProject({
      document: {
        ...makeProject().document,
        chapters: [
          {
            id: 'toc',
            order: 0,
            title: 'Índice',
            blocks: [
              {
                id: 'b',
                type: 'paragraph',
                order: 0,
                content:
                  '<h2>Índice</h2><p>Introducción·········································5</p><p>Capítulo 1·········································9</p>',
              },
            ],
          },
          ...makeProject().document.chapters.slice(1),
        ],
      },
    });

    const synced = buildSyncedTocChapterContent(project, DEVICE_PAGINATION_CONFIGS.laptop);

    expect(synced?.html).toContain(
      '<p data-toc-entry="true" data-toc-level="2" data-toc-page="3"><span class="toc-title">Introducción</span></p>',
    );
    expect(synced?.html).toContain(
      '<p data-toc-entry="true" data-toc-level="2" data-toc-page="4"><span class="toc-title">Capítulo 1</span></p>',
    );
    expect(synced?.html).not.toContain('·········································5');
    expect(synced?.html).not.toContain('·········································9');
  });

  test('is idempotent: running sync twice produces byte-identical HTML', () => {
    const project = makeProject();
    const first = buildSyncedTocChapterContent(project, DEVICE_PAGINATION_CONFIGS.laptop);
    expect(first).not.toBeNull();

    // Feed the synced HTML back as the persisted HTML and re-run.
    const project2 = makeProject({
      document: {
        ...project.document,
        chapters: [
          {
            id: 'toc',
            order: 0,
            title: 'Índice',
            blocks: [{ id: 'b', type: 'paragraph', order: 0, content: first!.html }],
          },
          ...project.document.chapters.slice(1),
        ],
      },
    });

    const second = buildSyncedTocChapterContent(project2, DEVICE_PAGINATION_CONFIGS.laptop);
    expect(second?.html).toBe(first?.html);
  });

  test('adds a new TOC entry when a chapter is added after import', () => {
    // The stored TOC only lists 2 chapters; the document has 3.
    const baseChapters = makeProject().document.chapters;
    const project = makeProject({
      document: {
        ...makeProject().document,
        chapters: [
          ...baseChapters,
          {
            id: 'c2',
            order: 3,
            title: 'Capítulo 2',
            blocks: [{ id: 'c2-b1', type: 'paragraph', order: 0, content: '<h2>Capítulo 2</h2><p>Nuevo</p>' }],
          },
        ],
      },
    });

    const synced = buildSyncedTocChapterContent(project, DEVICE_PAGINATION_CONFIGS.laptop);

    expect(synced?.html).toMatch(/data-toc-page="5"[^>]*><span class="toc-title">Capítulo 2<\/span>/);
    expect(synced?.html).toMatch(/data-toc-page="3"[^>]*><span class="toc-title">Introducción<\/span>/);
    expect(synced?.html).toMatch(/data-toc-page="4"[^>]*><span class="toc-title">Capítulo 1<\/span>/);
  });

  test('renumbers remaining entries when a chapter is deleted', () => {
    // El índice inicial tenía Introducción + Capítulo 1, pero ahora solo existe Introducción.
    const project = makeProject({
      document: {
        ...makeProject().document,
        chapters: [
          {
            id: 'toc',
            order: 0,
            title: 'Índice',
            blocks: [
              {
                id: 'b',
                type: 'paragraph',
                order: 0,
                content:
                  '<h2>Índice</h2>' +
                  '<p data-toc-entry="true" data-toc-level="2" data-toc-page="3"><span class="toc-title">Introducción</span></p>' +
                  '<p data-toc-entry="true" data-toc-level="2" data-toc-page="4"><span class="toc-title">Capítulo 1</span></p>',
              },
            ],
          },
          {
            id: 'intro',
            order: 1,
            title: 'Introducción',
            blocks: [{ id: 'i-b1', type: 'paragraph', order: 0, content: '<h2>Introducción</h2><p>Texto</p>' }],
          },
        ],
      },
    });

    const synced = buildSyncedTocChapterContent(project, DEVICE_PAGINATION_CONFIGS.laptop);

    expect(synced?.html).toMatch(/data-toc-page="3"[^>]*><span class="toc-title">Introducción<\/span>/);

    // Tras borrar el capítulo, al quedarse su entrada sin página calculada, no se
    // re-inyecta con nuevo número (la numeración refleja solo capítulos existentes).
    const pageNumbers = Array.from(
      (synced?.html ?? '').matchAll(/data-toc-page="(\d+)"/g),
    ).map((m) => m[1]);
    expect(pageNumbers).toEqual(['3']);
  });
});

describe('stripExistingTocPageNumbers', () => {
  test('removes legacy data-toc-* spans and returns plain text content', () => {
    const html =
      '<p data-toc-entry="true" data-toc-level="2">' +
      '<span data-toc-title="true">Introducción</span>' +
      '<span data-toc-leader="true" aria-hidden="true">····</span>' +
      '<span data-toc-page="true">5</span>' +
      '</p>';
    const stripped = stripExistingTocPageNumbers(html);
    expect(stripped).toBe('<p>Introducción</p>');
  });

  test('removes new class-based .toc-* spans and preserves plain title', () => {
    const html =
      '<p class="toc-entry" data-toc-entry="true" data-toc-level="2">' +
      '<span class="toc-title">Introducción</span>' +
      '<span class="toc-leader" aria-hidden="true"></span>' +
      '<span class="toc-page">5</span>' +
      '</p>';
    const stripped = stripExistingTocPageNumbers(html);
    expect(stripped).toBe('<p>Introducción</p>');
  });

  test('removes new data-toc-page attribute on the paragraph', () => {
    const html =
      '<p data-toc-entry="true" data-toc-level="2" data-toc-page="5">Introducción</p>';
    const stripped = stripExistingTocPageNumbers(html);
    expect(stripped).toBe('<p>Introducción</p>');
  });

  test('removes textual "·····5" suffix when present without wrapping spans', () => {
    const html = '<p>Introducción·········································5</p>';
    const stripped = stripExistingTocPageNumbers(html);
    expect(stripped).toBe('<p>Introducción</p>');
  });

  test('audit: a chapter that grows to extra pages shifts every later TOC page number', () => {
    // Documents the current (heuristic content-paginator) behaviour that a future
    // real-layout page map must preserve: 1 page -> N pages pushes the next ones.
    const base = makeProject();
    const grown = makeProject({
      document: {
        ...base.document,
        chapters: base.document.chapters.map((chapter) =>
          chapter.id === 'intro'
            ? {
                ...chapter,
                blocks: [
                  {
                    id: 'i-b1',
                    type: 'paragraph' as const,
                    order: 0,
                    content:
                      '<h2>Introducción</h2>' +
                      Array.from({ length: 40 }, () => `<p>${'palabra '.repeat(120)}</p>`).join(''),
                  },
                ],
              }
            : chapter,
        ),
      },
    });

    const pageOf = (html: string | undefined, title: string) =>
      Number(html?.match(new RegExp(`data-toc-page="(\\d+)"[^>]*><span class="toc-title">${title}</span>`))?.[1]);

    const before = buildSyncedTocChapterContent(base, DEVICE_PAGINATION_CONFIGS.laptop)?.html;
    const after = buildSyncedTocChapterContent(grown, DEVICE_PAGINATION_CONFIGS.laptop)?.html;

    expect(pageOf(before, 'Introducción')).toBe(pageOf(after, 'Introducción'));
    expect(pageOf(after, 'Capítulo 1')).toBeGreaterThan(pageOf(before, 'Capítulo 1'));
  });
});
