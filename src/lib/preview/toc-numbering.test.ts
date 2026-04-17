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
  test('wraps clean entries in the semantic .toc-entry structure with page numbers', () => {
    const project = makeProject();
    const synced = buildSyncedTocChapterContent(project, DEVICE_PAGINATION_CONFIGS.laptop);

    expect(synced).not.toBeNull();
    expect(synced?.html).toContain(
      '<p class="toc-entry" data-toc-entry="true" data-toc-level="2"><span class="toc-title">Introducción</span><span class="toc-leader" aria-hidden="true"></span><span class="toc-page">3</span></p>',
    );
    expect(synced?.html).toContain(
      '<p class="toc-entry" data-toc-entry="true" data-toc-level="2"><span class="toc-title">Capítulo 1</span><span class="toc-leader" aria-hidden="true"></span><span class="toc-page">4</span></p>',
    );
    // No se introducen `·` como texto; el relleno visual lo hace CSS.
    expect(synced?.html).not.toContain('····');
    expect(synced?.html).not.toContain('.....');
  });

  test('legacy text dots ("······5") get stripped and replaced by the semantic structure', () => {
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
                // Formato heredado con puntos textuales "·····5" al final del párrafo.
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

    expect(synced?.html).toContain('<span class="toc-title">Introducción</span>');
    expect(synced?.html).toContain('<span class="toc-page">3</span>');
    expect(synced?.html).toContain('<span class="toc-title">Capítulo 1</span>');
    expect(synced?.html).toContain('<span class="toc-page">4</span>');
    // Los puntos textuales legacy quedan fuera del HTML final.
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

    expect(synced?.html).toContain('<span class="toc-title">Capítulo 2</span>');
    expect(synced?.html).toContain('<span class="toc-page">5</span>');

    // Las entradas originales siguen presentes con sus números actualizados.
    expect(synced?.html).toContain('<span class="toc-title">Introducción</span>');
    expect(synced?.html).toContain('<span class="toc-title">Capítulo 1</span>');
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
                  '<p class="toc-entry" data-toc-entry="true" data-toc-level="2"><span class="toc-title">Introducción</span><span class="toc-leader" aria-hidden="true"></span><span class="toc-page">3</span></p>' +
                  '<p class="toc-entry" data-toc-entry="true" data-toc-level="2"><span class="toc-title">Capítulo 1</span><span class="toc-leader" aria-hidden="true"></span><span class="toc-page">4</span></p>',
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

    expect(synced?.html).toContain('<span class="toc-title">Introducción</span>');
    expect(synced?.html).toContain('<span class="toc-page">3</span>');

    // Tras borrar el capítulo, al quedarse su entrada sin página calculada, no se
    // re-inyecta con nuevo número (la numeración refleja solo capítulos existentes).
    const pageNumbers = Array.from(
      (synced?.html ?? '').matchAll(/<span class="toc-page">(\d+)<\/span>/g),
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

  test('removes textual "·····5" suffix when present without wrapping spans', () => {
    const html = '<p>Introducción·········································5</p>';
    const stripped = stripExistingTocPageNumbers(html);
    expect(stripped).toBe('<p>Introducción</p>');
  });
});
