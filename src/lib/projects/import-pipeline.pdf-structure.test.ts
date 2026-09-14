import { describe, expect, test, vi } from 'vitest';
import { buildImportedDocumentSeed, extractTextFromBuffer } from './import-pipeline';
import type { ImportedDocumentSeed } from './types';

/**
 * Regression suite for pdf-import-structural-recovery. Covers the
 * generalizable detection rules (never anything specific to the real
 * regression book, "El_Plan_de_Escape_EBOOK.pdf" — see
 * sdd/features/pdf-import-structural-recovery/ for the diagnosed root
 * causes and the real-PDF acceptance script).
 *
 * Front-matter titles in these fixtures deliberately avoid a bare 2-5-word
 * Title-Case shape ("Mi Libro") — that shape is indistinguishable from a
 * person's name (`isLikelyAuthorName`) by design, so a title built that way
 * is itself excluded as a title candidate. Real book titles almost always
 * break the shape with a lowercase connector ("de", "en", "para", ...),
 * which is what these fixtures use.
 */

/** Chapter titles with the product's auto-generated "Índice" entry (added
 *  whenever >= 2 outline entries exist and no explicit TOC chapter does)
 *  filtered out, so assertions can focus on the real structural units. */
function nonIndexTitles(seed: ImportedDocumentSeed): string[] {
  return (seed.chapters ?? [])
    .map((c) => c.title)
    .filter((title) => title.trim().toLowerCase() !== 'índice');
}

describe('pdf-import-structural-recovery: tracked heading normalization', () => {
  test('recognizes a letter-tracked Spanish chapter marker and pulls the following line(s) as the title', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'C A P Í T U L O 1',
      'Un título de capítulo real',
      'Primer párrafo del capítulo uno con contenido suficiente para no confundirse con un título de sección.',
      '',
      'C A P Í T U L O 2',
      'Otro título distinto',
      'Segundo párrafo del capítulo dos con más contenido de relleno para completar el cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(nonIndexTitles(result)).toEqual(['Un título de capítulo real', 'Otro título distinto']);
  });

  test('recognizes a letter-tracked English chapter marker', () => {
    const text = [
      'Complete Field Guide for Professionals',
      '',
      'C H A P T E R 1',
      'A real chapter title',
      'First paragraph of chapter one with enough filler content to read as ordinary body text.',
      '',
      'C H A P T E R 2',
      'Another distinct title',
      'Second paragraph of chapter two with more filler content for the body.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'book.pdf', mimeType: 'application/pdf', text });

    expect(nonIndexTitles(result)).toEqual(['A real chapter title', 'Another distinct title']);
  });

  test('a letter-tracked standalone heading with no numeral (PRÓLOGO/EPÍLOGO) still resolves', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'P R Ó L O G O',
      'Contenido del prólogo con longitud suficiente para ser un párrafo real y no un título.',
      '',
      'E P Í L O G O',
      'Contenido del epílogo con longitud suficiente para ser un párrafo real y no un título.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(nonIndexTitles(result)).toEqual(['Prólogo', 'Epílogo']);
  });

  test('an untracked "Capítulo N" marker also pulls its title from the following line (split chapter title)', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'Capítulo 1',
      'El suelo financiero',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
      '',
      'Capítulo 2: Título en línea',
      'Contenido del capítulo dos, cuyo título ya viene incluido en la misma línea del marcador.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(nonIndexTitles(result)).toEqual(['El suelo financiero', 'Capítulo 2: Título en línea']);
  });

  test('negative: ordinary short words are never merged by the tracked-heading heuristic', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'Capítulo 1',
      'Un título normal',
      'Fue un día y una noche de trabajo intenso, pero al final logramos completar el objetivo planteado.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    const body = result.chapters?.[0]?.blocks.map((b) => b.content).join(' ') ?? '';
    expect(body).toContain('Fue un día y una noche de trabajo intenso');
  });
});

describe('pdf-import-structural-recovery: heading false-positive guards', () => {
  test('a numeric sentence-starter line is not misread as a numbered heading', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'Capítulo 1',
      'Un título real',
      'La mayoría de personas subestima cuánto necesitan ahorrar. Con\n15 o 25 años de carrera por delante, es un tema que conviene planificar con calma.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.chapters).toHaveLength(1);
    const body = result.chapters?.[0]?.blocks.map((b) => b.content).join(' ') ?? '';
    expect(body).toContain('15 o 25 años de carrera');
  });

  test('a mid-sentence line-wrap starting with a heading keyword is not misread as a heading', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'Capítulo 1',
      'Un título real',
      'Completa el test del\ncapítulo dos. Identifica tu perfil con honestidad antes de continuar leyendo el resto de esta sección.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.chapters).toHaveLength(1);
  });

  test('an ambiguous generic-noun keyword ("después de", "recursos") only counts as a heading when short', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'PRÓLOGO',
      'El equipo ideal combina experiencia técnica y trato humano. Un profesional de\nrecursos humanos que además domina el análisis de datos ocupa un espacio que muy pocos pueden llenar en el mercado actual.',
      '',
      'Después de la Fase 1',
      'Contenido de una sección corta que sí es un encabezado genuino y corto.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(nonIndexTitles(result)).toEqual(['Prólogo', 'Después de la Fase 1']);
    const body = result.chapters?.[0]?.blocks.map((b) => b.content).join(' ') ?? '';
    expect(body).toContain('recursos humanos que además domina');
  });
});

describe('pdf-import-structural-recovery: multiline title/subtitle', () => {
  test('merges a two-line ALL-CAPS cover title glued to a two-line mixed-case subtitle', () => {
    const text = [
      'EL PLAN DE ESCAPE',
      'DE LA MEDIANA EDAD',
      'Cómo desatascarte profesionalmente',
      'sin dinamitar tu vida',
      '',
      '© 2026 Antonio Ballesteros Alonso',
      'Todos los derechos reservados.',
      '',
      'Capítulo 1',
      'Un título real',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.title).toBe('El Plan de Escape de la Mediana Edad');
    expect(result.subtitle).toBe('Cómo desatascarte profesionalmente sin dinamitar tu vida');
  });

  test('a single-line ALL-CAPS title is still converted to editorial title case', () => {
    const text = [
      'MANUAL DE ESTRATEGIA PROFESIONAL',
      '',
      'Capítulo 1',
      'Un título real',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.title).toBe('Manual de Estrategia Profesional');
  });

  test('an ordinary mixed-case front-matter title is left untouched', () => {
    const text = [
      'Un título perfectamente normal',
      '',
      'Capítulo 1',
      'Un título real',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.title).toBe('Un título perfectamente normal');
  });
});

describe('pdf-import-structural-recovery: author detection', () => {
  test('recovers the author from a "© YEAR Name" copyright line when no byline exists', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      '© 2026 Antonio Ballesteros Alonso',
      'Todos los derechos reservados.',
      '',
      'Capítulo 1',
      'Un título real',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.author).toBe('Antonio Ballesteros Alonso');
    expect(result.confidence?.author).toBe('medium');
  });

  test('recovers the author from an explicit "By Name" / "Por Name" byline', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'Por María López',
      '',
      'Capítulo 1',
      'Un título real',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.author).toBe('María López');
  });

  test('rejects a publisher/imprint that only looks name-shaped', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      '© 2026 Editorial Anagrama S.L.',
      'Todos los derechos reservados.',
      '',
      'Capítulo 1',
      'Un título real',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.author).toBe('');
  });

  test('rejects a URL that appears on the copyright line', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      '© 2026 www.example.com',
      'Todos los derechos reservados.',
      '',
      'Capítulo 1',
      'Un título real',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    expect(result.author).toBe('');
  });
});

describe('pdf-import-structural-recovery: table of contents', () => {
  test('TOC entries (with trailing page numbers) never spawn duplicate chapters alongside the real body headings', () => {
    const text = [
      'Manual de Estrategia Profesional',
      '',
      'ÍNDICE',
      'Prólogo 6',
      '1. El suelo financiero 12',
      '2. Ajustes, no saltos 22',
      'Epílogo 40',
      '',
      'PRÓLOGO',
      'Contenido del prólogo con longitud suficiente para ser un párrafo real y no un título.',
      '',
      'C A P Í T U L O 1',
      'El suelo financiero',
      'Contenido del capítulo uno con longitud suficiente para leerse como cuerpo del capítulo.',
      '',
      'C A P Í T U L O 2',
      'Ajustes, no saltos',
      'Contenido del capítulo dos con longitud suficiente para leerse como cuerpo del capítulo.',
      '',
      'EPÍLOGO',
      'Contenido del epílogo con longitud suficiente para ser un párrafo real y no un título.',
    ].join('\n');

    const result = buildImportedDocumentSeed({ fileName: 'libro.pdf', mimeType: 'application/pdf', text });

    const titles = result.chapters?.map((c) => c.title) ?? [];
    expect(titles).toEqual(['Índice', 'Prólogo', 'El suelo financiero', 'Ajustes, no saltos', 'Epílogo']);

    const lowerTitles = titles.map((t) => t.toLowerCase());
    expect(new Set(lowerTitles).size).toBe(lowerTitles.length); // no duplicates
  });
});

describe('pdf-import-structural-recovery: page-aware extraction (running headers and folios)', () => {
  function mockPageAwarePdfParse(pages: Array<{ num: number; text: string }>) {
    vi.doMock('server-only', () => ({}));
    vi.doMock('pdf-parse', () => ({
      PDFParse: class {
        getText = vi.fn(async () => ({
          text: pages.map((p) => p.text).join('\n\n-- garbage joiner --\n\n'),
          pages,
          total: pages.length,
          numpages: pages.length,
        }));
        destroy = vi.fn(async () => {});
      },
    }));
  }

  test('strips a running header and a folio repeated across pages without touching a one-off front-matter title', async () => {
    // The running header ("MANUAL — EDICIÓN DIGITAL") is deliberately
    // different text from the front-matter title (page 1) — as in a real
    // book, the cover title and the running header are rarely byte-for-byte
    // the same line, so this also exercises that a title is never removed
    // just because it superficially resembles the header.
    mockPageAwarePdfParse([
      { num: 1, text: 'Manual de Estrategia Profesional' },
      {
        num: 2,
        text: 'MANUAL — EDICIÓN DIGITAL\n— 2 —\nCapítulo 1\nUn título real\nContenido del capítulo uno con longitud suficiente para leerse como cuerpo.',
      },
      {
        num: 3,
        text: 'MANUAL — EDICIÓN DIGITAL\n— 3 —\nMás contenido del capítulo uno repartido en una segunda página con más texto de relleno.',
      },
      {
        num: 4,
        text: 'MANUAL — EDICIÓN DIGITAL\n— 4 —\nCapítulo 2\nOtro título real\nContenido del capítulo dos con longitud suficiente para leerse como cuerpo.',
      },
    ]);

    const extracted = await extractTextFromBuffer('libro.pdf', 'application/pdf', Buffer.from('%PDF-fake'));

    // The one-off front-matter title (page 1) survives untouched.
    expect(extracted.text).toContain('Manual de Estrategia Profesional');
    // The running header repeated at every subsequent page boundary is gone.
    expect(extracted.text).not.toContain('MANUAL — EDICIÓN DIGITAL');
    // Folios are gone.
    expect(extracted.text).not.toMatch(/—\s*\d+\s*—/);
    // No pdf-parse default page-joiner artifact leaks through.
    expect(extracted.text).not.toContain('garbage joiner');
    // Body content from every page is still present.
    expect(extracted.text).toContain('Un título real');
    expect(extracted.text).toContain('Más contenido del capítulo uno');
    expect(extracted.text).toContain('Otro título real');
  });
});

describe('pdf-import-structural-recovery: manuscript type calibration', () => {
  test('a long non-fiction text with only incidental exercise/reflection mentions stays non-fiction, not guide', async () => {
    vi.resetModules();
    vi.doMock('server-only', () => ({}));
    const { detectManuscriptType } = await import('./import-pipeline');

    const paragraphs = Array.from(
      { length: 40 },
      (_, i) => `Párrafo número ${i + 1} de contenido narrativo ordinario sin marcadores especiales.`,
    );
    // Only 3 of 40 paragraphs mention an exercise/reflection — well under the
    // density threshold for a genuine step-by-step guide.
    paragraphs[5] = 'Este capítulo incluye un ejercicio breve para practicar lo aprendido.';
    paragraphs[15] = 'Una reflexión final cierra esta sección del libro.';
    paragraphs[25] = 'El paso 1 de este proceso ya se explicó en el capítulo anterior.';

    expect(detectManuscriptType(paragraphs.join('\n\n'))).toBe('non-fiction');
  });
});
