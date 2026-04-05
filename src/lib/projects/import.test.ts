import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('document import parser isolation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('docx import does not load the pdf parser', async () => {
    vi.doMock('server-only', () => ({}));
    vi.doMock('pdf-parse', () => {
      throw new Error('pdf parser should not load for docx imports');
    });

    const getBody = vi.fn(() => 'Titulo\n\nSubtitulo\n\nParrafo 1');
    const extract = vi.fn(async () => ({ getBody }));
    class WordExtractorMock {
      extract = extract;
    }

    vi.doMock('word-extractor', () => ({
      default: WordExtractorMock,
    }));

    const { extractImportedDocumentSeed } = await import('./import');
    const file = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x04])],
      'demo.docx',
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    );

    const result = await extractImportedDocumentSeed(file);

    expect(extract).toHaveBeenCalledTimes(1);
    expect(result.title).toBe('Titulo');
    expect(result.blocks.length).toBeGreaterThan(0);
  });

  test('builds multiple chapters from markdown headings', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'novela.md',
      mimeType: 'text/markdown',
      text: [
        'Nunca mas en la sombra',
        '',
        'Una historia editorial.',
        '',
        '# Capitulo uno',
        '',
        'Texto del primer capitulo.',
        '',
        '## Escena secundaria',
        '',
        'Mas contenido del primer capitulo.',
        '',
        '# Capitulo dos',
        '',
        'Texto del segundo capitulo.',
      ].join('\n'),
    });

    expect(result.chapters).toHaveLength(2);
    expect(result.chapters?.[0].title).toBe('Capitulo uno');
    expect(result.chapters?.[0].blocks.some((block) => block.content.includes('Texto del primer capitulo.'))).toBe(true);
    expect(result.chapters?.[1].title).toBe('Capitulo dos');
  });

  test('docx import prefers mammoth html extraction for chapter-aware parsing', async () => {
    vi.doMock('server-only', () => ({}));
    vi.doMock('pdf-parse', () => {
      throw new Error('pdf parser should not load for docx imports');
    });
    vi.doMock('mammoth', () => ({
      default: {
        convertToHtml: vi.fn(async () => ({
          value: '<h1>Capitulo uno</h1><p>Texto A</p><h1>Capitulo dos</h1><p>Texto B</p>',
          messages: [],
        })),
      },
    }));
    vi.doMock('word-extractor', () => ({
      default: class WordExtractorMock {
        extract = vi.fn(async () => ({
          getBody: () => 'fallback body that should not be used',
        }));
      },
    }));

    const { extractImportedDocumentSeed } = await import('./import');
    const file = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x04])],
      'demo.docx',
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    );

    const result = await extractImportedDocumentSeed(file);

    expect(result.chapters).toHaveLength(2);
    expect(result.chapters?.[0].title).toBe('Capitulo uno');
    expect(result.chapters?.[1].title).toBe('Capitulo dos');
  });

  test('structural h1 day headings become independent chapters while index entries do not', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'programa.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text: 'texto normalizado',
      html: [
        '<p><strong>Índice</strong></p>',
        '<p><strong>Día 1:</strong> Autoimagen.</p>',
        '<p><strong>Día 2:</strong> Fortalezas latentes.</p>',
        '<h1>Introducción</h1>',
        '<p>Texto de apertura</p>',
        '<h1>Fase 1: Percepción</h1>',
        '<p>Cómo te ves determina cómo te muestras.</p>',
        '<h1>Día 1: El espejo de la autoimagen</h1>',
        '<p>Texto del día 1.</p>',
        '<h1>Día 2: El inventario de fortalezas olvidadas</h1>',
        '<p>Texto del día 2.</p>',
      ].join(''),
    });

    expect(result.chapters?.map((chapter) => chapter.title)).toEqual([
      'Índice',
      'Introducción',
      'Fase 1: Percepción',
      'Día 1: El espejo de la autoimagen',
      'Día 2: El inventario de fortalezas olvidadas',
    ]);
  });
});
