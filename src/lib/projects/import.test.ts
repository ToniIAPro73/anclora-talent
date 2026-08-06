import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

    expect(result.chapters).toHaveLength(3);
    expect(result.chapters?.[0].title).toBe('Índice');
    expect(result.chapters?.[1].title).toBe('Capitulo uno');
    expect(result.chapters?.[1].blocks[0]).toEqual({
      type: 'heading',
      content: 'Capitulo uno',
    });
    expect(result.chapters?.[1].blocks.some((block) => block.content.includes('Texto del primer capitulo.'))).toBe(true);
    expect(result.chapters?.[2].title).toBe('Capitulo dos');
    expect(result.warnings?.some((warning) => warning.includes('índice sintético editable'))).toBe(true);
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

    expect(result.chapters).toHaveLength(3);
    expect(result.chapters?.[0].title).toBe('Índice');
    expect(result.chapters?.[1].title).toBe('Capitulo uno');
    expect(result.chapters?.[2].title).toBe('Capitulo dos');
    expect(result.warnings?.some((warning) => warning.includes('índice sintético editable'))).toBe(true);
  });

  test('imports the exito_sin_compania DOCX fixture as a base document', async () => {
    vi.doMock('server-only', () => ({}));

    const { extractImportedDocumentSeed } = await import('./import');
    const bytes = readFileSync(resolve(process.cwd(), 'fixtures/exito_sin_compania.docx'));
    const file = new File([new Uint8Array(bytes)], 'exito_sin_compania.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const result = await extractImportedDocumentSeed(file);

    expect(result.parseFailed).toBe(false);
    expect(result.title).toBeTruthy();
    expect(result.chapters?.length ?? 0).toBeGreaterThan(0);
    expect(result.blocks.length).toBeGreaterThan(0);
  }, 20000);

  test('pdf parse failure degrades to an empty shell document instead of aborting', async () => {
    vi.doMock('server-only', () => ({}));
    vi.doMock('pdf-parse', () => ({
      PDFParse: class PDFParseMock {
        constructor() {
          throw new Error('corrupt pdf bytes');
        }
      },
    }));

    const { extractImportedDocumentSeed } = await import('./import');
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'roto.pdf', {
      type: 'application/pdf',
    });

    const result = await extractImportedDocumentSeed(file);

    expect(result.parseFailed).toBe(true);
    expect(result.title).toBe('roto');
    expect(result.chapters?.length).toBeGreaterThan(0);
  });

  test('docx parse failure (mammoth and word-extractor throwing) is non-blocking', async () => {
    vi.doMock('server-only', () => ({}));
    vi.doMock('mammoth', () => ({
      default: {
        convertToHtml: vi.fn(async () => {
          throw new Error('mammoth exploded');
        }),
      },
    }));
    vi.doMock('word-extractor', () => ({
      default: class WordExtractorMock {
        extract = vi.fn(async () => {
          throw new Error('word-extractor exploded');
        });
      },
    }));

    const { extractImportedDocumentSeed } = await import('./import');
    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'roto.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const result = await extractImportedDocumentSeed(file);

    expect(result.parseFailed).toBe(true);
    expect(result.title).toBe('roto');
    expect(result.chapters?.length).toBeGreaterThan(0);
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

  test('markdown without explicit index generates an editable synthetic index after prologue when chapters exist', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'ebook-estructurado.md',
      mimeType: 'text/markdown',
      text: [
        '# Ebook premium',
        '',
        'Introducción general.',
        '',
        '## Contexto del mercado',
        '',
        'Texto del contexto.',
        '',
        '## Dolores escondidos',
        '',
        '### Dolor 1',
        '',
        'Detalle 1.',
        '',
        '### Dolor 2',
        '',
        'Detalle 2.',
        '',
        '## Monetización',
        '',
        'Texto monetización.',
      ].join('\n'),
    });

    expect(result.chapters?.map((chapter) => chapter.title)).toEqual([
      'Índice',
      'Contexto del mercado',
      'Dolores escondidos',
      'Monetización',
    ]);
    expect(result.detectedOutline?.some((entry) => entry.title === 'Contexto del mercado')).toBe(true);
    expect(result.warnings?.some((warning) => warning.includes('índice sintético editable'))).toBe(true);
  });

  test('docx/rich html preserves soft line breaks as br tags', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'demo.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text: 'texto normalizado',
      html: '<h1>Capítulo uno</h1><p>Primera línea<br />Segunda línea</p><p>Texto</p>',
    });

    const chapterHtml = result.chapters?.[0].blocks.map((block) => block.content).join('\n') ?? '';
    expect(chapterHtml).toContain('<br');
  });

  test('docx/rich html ignores plain hr separators instead of importing them as visible rules', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'demo.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text: 'texto normalizado',
      html: '<h1>Capítulo uno</h1><p>Primera línea</p><hr /><p>Segunda línea</p>',
    });

    const chapterHtml = result.chapters?.[0].blocks.map((block) => block.content).join('\n') ?? '';
    expect(chapterHtml).not.toContain('<hr');
    expect(chapterHtml).toContain('Primera línea');
    expect(chapterHtml).toContain('Segunda línea');
  });

  test('docx explicit index strips imported page numbers until sync is requested', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'indice.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      text: 'texto normalizado',
      html: [
        '<h1>Índice</h1>',
        '<ul>',
        '<li>Introducción</li>',
        '<li>·········································5</li>',
        '<li>Fase 1: Percepción</li>',
        '<li>·········································9</li>',
        '</ul>',
        '<h1>Introducción</h1>',
        '<p>Texto de apertura</p>',
      ].join(''),
    });

    const indexHtml = result.chapters?.[0].blocks.map((block) => block.content).join('\n') ?? '';
    expect(indexHtml).toContain('data-toc-entry="true"');
    expect(indexHtml).not.toContain('data-toc-page=');
    expect(indexHtml).not.toContain('····');
    expect(indexHtml).not.toContain('>5<');
    expect(indexHtml).not.toContain('>9<');
  });

  test('markdown preserves explicit line breaks as br tags inside paragraphs', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'demo.md',
      mimeType: 'text/markdown',
      text: ['# Capítulo uno', '', 'Primera línea', 'Segunda línea'].join('\n'),
    });

    const chapterHtml = result.chapters?.[0].blocks.map((block) => block.content).join('\n') ?? '';
    expect(chapterHtml).toContain('<br');
  });

  test('txt preserves explicit line breaks inside imported paragraphs', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'demo.txt',
      mimeType: 'text/plain',
      text: ['Capítulo uno', '', 'Primera línea', 'Segunda línea'].join('\n'),
    });

    const chapterHtml = result.chapters?.[0].blocks.map((block) => block.content).join('\n') ?? '';
    expect(chapterHtml).toContain('<br');
  });

  test('pdf merges obvious visual wraps while preserving blank-line paragraphs', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'demo.pdf',
      mimeType: 'application/pdf',
      text: ['Capítulo uno', '', 'Primera línea cortada', 'por ancho de página', '', 'Nuevo párrafo'].join('\n'),
    });

    const chapterHtml = result.chapters?.[0].blocks.map((block) => block.content).join('\n') ?? '';
    expect(chapterHtml).toContain('Primera línea cortada por ancho de página');
    expect(chapterHtml).toContain('Nuevo párrafo');
  });

  test('M4 — confidence is low across the board with no usable structure', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    // A single paragraph over 140 chars: too long to be a title candidate
    // (findTitleCandidate) and over the 120-char rawTitle guess too, so both
    // fall back to the filename-derived title, with no author and one
    // conservative chapter.
    const result = buildImportedDocumentSeed({
      fileName: 'sin-estructura.txt',
      mimeType: 'text/plain',
      text: 'Un parrafo muy largo sin titulo claro ni capitulos detectables en el texto de entrada que supera con holgura el limite de ciento cuarenta caracteres fijado para candidatos de titulo.',
    });

    expect(result.confidence?.title).toBe('low');
    expect(result.confidence?.author).toBe('low');
    expect(result.confidence?.chapters).toBe('low');
  });

  test('M4 — confidence is high with clear front-matter title/author and multiple chapters', async () => {
    vi.doMock('server-only', () => ({}));

    const { buildImportedDocumentSeed } = await import('./import');
    const result = buildImportedDocumentSeed({
      fileName: 'libro.md',
      mimeType: 'text/markdown',
      text: [
        'Título del libro',
        '',
        'Nombre Autor Real',
        '',
        '# Capítulo uno',
        '',
        'Contenido uno.',
        '',
        '# Capítulo dos',
        '',
        'Contenido dos.',
        '',
        '# Capítulo tres',
        '',
        'Contenido tres.',
      ].join('\n'),
    });

    expect(result.confidence?.title).toBe('high');
    expect(result.confidence?.author).toBe('high');
    expect(result.confidence?.chapters).toBe('high');
  });

  test('M5 — detects a guide from step/exercise markers', async () => {
    vi.doMock('server-only', () => ({}));
    const { detectManuscriptType } = await import('./import-pipeline');

    const text = [
      'Paso 1: define tu objetivo.',
      '',
      'Ejercicio: escribe tres metas concretas para esta semana.',
      '',
      'Reflexión: qué te impide empezar hoy mismo.',
    ].join('\n');

    expect(detectManuscriptType(text)).toBe('guide');
  });

  test('M5 — detects a novel from dialogue-line density', async () => {
    vi.doMock('server-only', () => ({}));
    const { detectManuscriptType } = await import('./import-pipeline');

    const text = [
      '—¿Vienes? —preguntó ella.',
      '',
      '—Todavía no —respondió él.',
      '',
      '—Pues yo me voy —dijo ella, y cerró la puerta.',
      '',
      'El silencio se quedó solo en la habitación.',
    ].join('\n');

    expect(detectManuscriptType(text)).toBe('novel');
  });

  test('M5 — falls back to non-fiction with no strong signal', async () => {
    vi.doMock('server-only', () => ({}));
    const { detectManuscriptType } = await import('./import-pipeline');

    expect(detectManuscriptType('Un texto corto y directo sobre un tema cualquiera.')).toBe('non-fiction');
  });

  test('M5 — explicit override forces the guide chapter-boundary preset', async () => {
    vi.doMock('server-only', () => ({}));
    const { buildImportedDocumentSeed } = await import('./import');

    const text = [
      '# Parte uno',
      '',
      '## Tema A',
      '',
      'Contenido A.',
      '',
      '## Tema B',
      '',
      'Contenido B.',
      '',
      '# Parte dos',
      '',
      '## Tema C',
      '',
      'Contenido C.',
      '',
      '## Tema D',
      '',
      'Contenido D.',
    ].join('\n');

    const auto = buildImportedDocumentSeed({ fileName: 'g.md', mimeType: 'text/markdown', text });
    const guided = buildImportedDocumentSeed({
      fileName: 'g.md',
      mimeType: 'text/markdown',
      text,
      manuscriptTypeOverride: 'guide',
    });

    // Two H1 parts: auto-detection stays at the coarse H1 boundary (one
    // chapter per Parte, plus the synthesized index); the guide preset
    // forces the finer H2 boundary, splitting each Parte into its Temas.
    expect(auto.chapters?.length).toBe(3);
    expect(guided.chapters?.length).toBeGreaterThan(auto.chapters!.length);
    expect(guided.manuscriptType).toBe('guide');
    expect(guided.detectedManuscriptType).toBe(auto.manuscriptType);
  });
});
