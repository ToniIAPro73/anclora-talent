import { describe, expect, it } from 'vitest';
import type { ImportedDocumentSeed, ProjectRecord } from './types';
import { chapterMatchKey, mergeReimportedSeed, summarizeReimport } from './reimport';

function baseProject(): ProjectRecord {
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
      author: 'Autora',
      language: 'es',
      rules: { keepTogether: { table: true } } as ProjectRecord['document']['rules'],
      metadata: { title: 'Book', isbn: '978-84-0000000-0-0' },
      chapters: [
        {
          id: 'ch1',
          order: 1,
          title: 'Introducción',
          blocks: [{ id: 'b1', type: 'paragraph', order: 0, content: '<p>Hola</p>' }],
        },
        {
          id: 'ch2',
          order: 2,
          title: 'Capítulo 2',
          blocks: [{ id: 'b2', type: 'paragraph', order: 0, content: '<p>Dos</p>' }],
        },
        {
          id: 'ch3',
          order: 3,
          title: 'Apéndice manual',
          blocks: [{ id: 'b3', type: 'paragraph', order: 0, content: '<p>Manual</p>' }],
        },
      ],
    },
    cover: {
      id: 'c1',
      title: 'Cover',
      subtitle: '',
      palette: 'teal',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'bc1',
      title: 'Back',
      body: 'Body',
      authorBio: 'Bio',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

function seed(overrides?: Partial<ImportedDocumentSeed>): ImportedDocumentSeed {
  return {
    title: 'Book',
    subtitle: 'Sub',
    author: 'Autora',
    chapterTitle: 'Introducción',
    blocks: [],
    chapters: [
      {
        title: 'Introducción',
        blocks: [{ type: 'paragraph', content: '<p>Hola revisado</p>' }],
      },
      {
        title: 'Capítulo 2',
        blocks: [{ type: 'paragraph', content: '<p>Dos</p>' }],
      },
      {
        title: 'Capítulo nuevo',
        blocks: [{ type: 'paragraph', content: '<p>Nuevo</p>' }],
      },
    ],
    sourceFileName: 'book-v2.docx',
    sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ...overrides,
  };
}

describe('mergeReimportedSeed (C6)', () => {
  it('updates only changed chapters, preserving their ids and positions', () => {
    const result = mergeReimportedSeed(baseProject(), seed());
    const chapters = result.project.document.chapters;
    expect(chapters[0].id).toBe('ch1');
    expect(chapters[0].blocks[0].content).toBe('<p>Hola revisado</p>');
    expect(chapters[1].id).toBe('ch2');
    expect(result.changedChapterIds).toEqual(['ch1']);
  });

  it('appends new chapters and keeps existing chapters missing from the file', () => {
    const result = mergeReimportedSeed(baseProject(), seed());
    const titles = result.project.document.chapters.map((c) => c.title);
    expect(titles).toContain('Capítulo nuevo');
    expect(titles).toContain('Apéndice manual');
    expect(result.addedChapterTitles).toEqual(['Capítulo nuevo']);
    expect(result.keptStaleChapterTitles).toEqual(['Apéndice manual']);
  });

  it('preserves cover, back cover, rules and metadata', () => {
    const project = baseProject();
    const result = mergeReimportedSeed(project, seed());
    expect(result.project.cover).toEqual(project.cover);
    expect(result.project.backCover).toEqual(project.backCover);
    expect(result.project.document.rules).toEqual(project.document.rules);
    expect(result.project.document.metadata).toEqual(project.document.metadata);
    expect(result.project.document.source?.fileName).toBe('book-v2.docx');
  });

  it('is idempotent: reimporting the same file twice changes nothing the second time', () => {
    const first = mergeReimportedSeed(baseProject(), seed());
    const second = mergeReimportedSeed(first.project, seed());
    expect(second.changedChapterIds).toEqual([]);
    expect(second.project.document.chapters.map((c) => c.title)).toEqual(
      first.project.document.chapters.map((c) => c.title),
    );
    // Content-derived block ids are stable across reimports.
    expect(second.project.document.chapters[0].blocks[0].id).toBe(
      first.project.document.chapters[0].blocks[0].id,
    );
  });

  it('generates uuid-shaped ids for new chapters and rebuilt blocks (regression: document_blocks uuid columns)', () => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/;
    const result = mergeReimportedSeed(baseProject(), seed());
    const added = result.project.document.chapters.find((c) => c.title === 'Capítulo nuevo');
    expect(added).toBeDefined();
    expect(added!.id).toMatch(UUID_RE);
    added!.blocks.forEach((block) => expect(block.id).toMatch(UUID_RE));
    // Rebuilt blocks of matched chapters are also persisted: uuid shape required.
    result.project.document.chapters[0].blocks.forEach((block) =>
      expect(block.id).toMatch(UUID_RE),
    );
  });

  it('matches chapter titles ignoring case, accents and extra whitespace', () => {
    expect(chapterMatchKey('  Introducción ')).toBe(chapterMatchKey('introduccion'));
    const accented = seed({
      chapters: [
        { title: 'introduccion', blocks: [{ type: 'paragraph', content: '<p>X</p>' }] },
      ],
    });
    const result = mergeReimportedSeed(baseProject(), accented);
    expect(result.changedChapterIds).toEqual(['ch1']);
    expect(result.addedChapterTitles).toEqual([]);
  });
});

describe('summarizeReimport (reimport diff preview)', () => {
  it('classifies detected titles into updated / added / kept', () => {
    const summary = summarizeReimport(
      ['Introducción', 'Capítulo 2', 'Apéndice manual'],
      ['introduccion', 'Capítulo 2', 'Capítulo nuevo'],
    );
    expect(summary.matchedTitles).toEqual(['Introducción', 'Capítulo 2']);
    expect(summary.addedTitles).toEqual(['Capítulo nuevo']);
    expect(summary.keptTitles).toEqual(['Apéndice manual']);
  });

  it('handles an empty incoming file gracefully', () => {
    const summary = summarizeReimport(['A', 'B'], []);
    expect(summary.matchedTitles).toEqual([]);
    expect(summary.keptTitles).toEqual(['A', 'B']);
  });
});
