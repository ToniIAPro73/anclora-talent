import { describe, expect, it } from 'vitest';
import {
  buildImportedDocumentSeed,
  inferSectionSemantics,
  promoteDocxChapterMarkerParagraphs,
  splitConcatenatedTocParagraph,
} from './import-pipeline';

/**
 * Regression coverage for a real-world failure mode: DOCX files
 * reconstructed from a PDF (e.g. by a "PDF to editable DOCX" conversion
 * tool) commonly have every paragraph styled "Normal" — no named Word
 * heading style at all — with the chapter/part marker and its title on one
 * paragraph, separated by a line break ("CAPÍTULO UNO<br/>La paradoja del
 * éxito solitario"). Before this fix, `buildImportedDocumentSeed` collapsed
 * such a document into a single chapter with zero detected structure.
 *
 * `promoteDocxChapterMarkerParagraphs`/`splitConcatenatedTocParagraph` run
 * inside `extractDocxRichContent`/`buildImportedDocumentSeed` on HTML that
 * has already been promoted — real imports exercise them through Mammoth
 * (see `import-pipeline.test-manuscript.test.ts` for a full-file case).
 * These tests call them directly on hand-built HTML that mirrors the exact
 * shape Mammoth produces for this corpus (confirmed against the real file
 * during diagnosis), feeding the promoted HTML into
 * `buildImportedDocumentSeed` to assert on the resulting chapters — short
 * excerpts of the same sample title text already used elsewhere in this
 * suite (see odt-layout-flow.test.ts).
 */

const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function seedFromDocxHtml(rawMammothHtml: string, fileName = 'manuscrito.docx') {
  const promoted = splitConcatenatedTocParagraph(promoteDocxChapterMarkerParagraphs(rawMammothHtml));
  return buildImportedDocumentSeed({
    fileName,
    mimeType: MIME,
    text: promoted.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    html: promoted,
  });
}

describe('promoteDocxChapterMarkerParagraphs — Normal-only DOCX marker recovery', () => {
  it('recovers spelled-out Spanish chapter markers ("CAPÍTULO UNO") sharing one <p> with their title via <br/>', () => {
    const html = [
      '<p><strong>CAPÍTULO UNO </strong><br/><strong>La paradoja del éxito solitario</strong></p>',
      '<p>Es domingo por la tarde y el silencio no calma.</p>',
      '<p><strong>CAPÍTULO DOS </strong><br/><strong>Cómo se construye una vida llena y vacía a la vez</strong></p>',
      '<p>Optimizaste cada parte de tu vida hasta agotarla.</p>',
    ].join('');

    const seed = seedFromDocxHtml(html);
    const titles = seed.chapters?.map((chapter) => chapter.title) ?? [];
    expect(titles).toContain('Capítulo Uno. La paradoja del éxito solitario');
    expect(titles).toContain('Capítulo Dos. Cómo se construye una vida llena y vacía a la vez');

    const chapterOne = seed.chapters?.find((chapter) => chapter.title.startsWith('Capítulo Uno'));
    expect(chapterOne?.semanticType).toBe('chapter');
    expect(chapterOne?.chapterNumber).toBe(1);
  });

  it('recovers Roman-numeral part markers ("PARTE II") and keeps parts distinct from chapters', () => {
    const html = [
      '<p><strong>PARTE I </strong><br/><strong>El diagnóstico</strong></p>',
      '<p><strong>CAPÍTULO UNO </strong><br/><strong>La paradoja del éxito solitario</strong></p>',
      '<p>Cuerpo del capítulo uno.</p>',
      '<p><strong>PARTE II </strong><br/><strong>Los mecanismos invisibles</strong></p>',
      '<p><strong>CAPÍTULO DOS </strong><br/><strong>Cómo se construye una vida llena y vacía a la vez</strong></p>',
      '<p>Cuerpo del capítulo dos.</p>',
    ].join('');

    const seed = seedFromDocxHtml(html);
    const partOne = seed.chapters?.find((chapter) => chapter.title.startsWith('Parte I.'));
    const partTwo = seed.chapters?.find((chapter) => chapter.title.startsWith('Parte II.'));
    expect(partOne?.semanticType).toBe('part');
    expect(partOne?.chapterNumber).toBe(1);
    // Regression: Roman numerals were previously mangled by word-by-word
    // title-casing ("PARTE II" -> "Parte Ii" instead of "Parte II").
    expect(partTwo?.title).toBe('Parte II. Los mecanismos invisibles');
    expect(partTwo?.semanticType).toBe('part');
    expect(partTwo?.chapterNumber).toBe(2);

    const chapterTwo = seed.chapters?.find((chapter) => chapter.title.startsWith('Capítulo Dos'));
    expect(chapterTwo?.semanticType).toBe('chapter');
  });

  it('recovers marker and title as two separate bare <p> paragraphs (no shared <br/>)', () => {
    const html = [
      '<p>CAPÍTULO TRES</p>',
      '<p>Las cuatro corazas del alto rendimiento</p>',
      '<p>Cuerpo del capítulo.</p>',
    ].join('');

    const seed = seedFromDocxHtml(html);
    const chapter = seed.chapters?.find((c) => c.semanticType === 'chapter');
    expect(chapter?.title).toBe('Capítulo Tres. Las cuatro corazas del alto rendimiento');
    expect(chapter?.chapterNumber).toBe(3);
  });

  it('recovers bare front-matter markers ("INTRODUCCIÓN", "CONCLUSIÓN") sharing one <p> with their title', () => {
    const html = [
      '<p><strong>INTRODUCCIÓN </strong><br/><strong>Lo tienes todo, entonces ¿por qué te sientes así?</strong></p>',
      '<p>Es domingo por la tarde.</p>',
      '<p><strong>CAPÍTULO UNO </strong><br/><strong>La paradoja del éxito solitario</strong></p>',
      '<p>Cuerpo.</p>',
      '<p><strong>CONCLUSIÓN </strong><br/><strong>El regreso a lo esencial</strong></p>',
      '<p>No naciste para vivir blindado.</p>',
    ].join('');

    const seed = seedFromDocxHtml(html);
    const titles = seed.chapters?.map((chapter) => chapter.title) ?? [];
    expect(titles).toContain('Introducción: Lo tienes todo, entonces ¿por qué te sientes así?');
    expect(titles).toContain('Conclusión: El regreso a lo esencial');

    const intro = seed.chapters?.find((chapter) => chapter.title.startsWith('Introducción:'));
    expect(intro?.semanticType).toBe('introduction');
    const conclusion = seed.chapters?.find((chapter) => chapter.title.startsWith('Conclusión:'));
    expect(conclusion?.semanticType).toBe('epilogue');
  });

  it('never promotes a paragraph already classified by the Mammoth styleMap (has a class attribute)', () => {
    const html = [
      '<p class="docx-title">CAPÍTULO UNO</p><p class="docx-subtitle">La paradoja del éxito solitario</p>',
      '<p>Cuerpo.</p>',
    ].join('');

    const promoted = promoteDocxChapterMarkerParagraphs(html);
    expect(promoted).toBe(html);
  });

  it('does not promote a two-paragraph run where the second paragraph is itself another marker (no real title between them)', () => {
    const html = ['<p>CAPÍTULO UNO</p>', '<p>CAPÍTULO DOS</p>', '<p>Cuerpo.</p>'].join('');
    const promoted = promoteDocxChapterMarkerParagraphs(html);
    expect(promoted).not.toContain('<h');
  });
});

describe('buildImportedDocumentSeed — real two-level heading hierarchy with Editorial Kicker style', () => {
  it('splits BOTH part (H1) and chapter (H2) headings into separate chapters when each has its own Editorial Kicker paragraph', () => {
    // This is the shape a *properly* reconstructed DOCX produces (real
    // named Heading 1/Heading 2/Editorial Kicker styles, kicker and title
    // as two separate paragraphs) — distinct from the "Normal-only, bare
    // marker" shape covered above. Before this fix, `determineChapterBoundaryLevel`
    // picked ONE level (parts) as the chapter-splitting boundary and
    // silently absorbed every chapter heading as plain content of its
    // enclosing part — confirmed when importing the skill's own
    // regenerated DOCX, which has exactly this two-level shape.
    const html = [
      '<p class="editorial-kicker">PARTE I</p><h1>El diagnóstico</h1>',
      '<p class="editorial-kicker">CAPÍTULO UNO</p><h2>La paradoja del éxito solitario</h2>',
      '<p>Cuerpo del capítulo uno.</p>',
      '<p class="editorial-kicker">CAPÍTULO DOS</p><h2>Cómo se construye una vida llena y vacía a la vez</h2>',
      '<p>Cuerpo del capítulo dos.</p>',
      '<p class="editorial-kicker">PARTE II</p><h1>Los mecanismos invisibles</h1>',
      '<p class="editorial-kicker">CAPÍTULO TRES</p><h2>Las cuatro corazas del alto rendimiento</h2>',
      '<p>Cuerpo del capítulo tres.</p>',
    ].join('');

    const seed = buildImportedDocumentSeed({
      fileName: 'manuscrito.docx',
      mimeType: MIME,
      text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      html,
    });

    const titles = seed.chapters?.map((chapter) => chapter.title) ?? [];
    expect(titles).toContain('Parte I. El diagnóstico');
    expect(titles).toContain('Capítulo Uno. La paradoja del éxito solitario');
    expect(titles).toContain('Capítulo Dos. Cómo se construye una vida llena y vacía a la vez');
    expect(titles).toContain('Parte II. Los mecanismos invisibles');
    expect(titles).toContain('Capítulo Tres. Las cuatro corazas del alto rendimiento');

    const chapterOne = seed.chapters?.find((chapter) => chapter.title.startsWith('Capítulo Uno'));
    expect(chapterOne?.semanticType).toBe('chapter');
    expect(chapterOne?.chapterNumber).toBe(1);
    // The chapter's own body text must stay with it, not with its part.
    expect(chapterOne?.blocks.some((block) => block.content.includes('Cuerpo del capítulo uno'))).toBe(true);

    const partOne = seed.chapters?.find((chapter) => chapter.title.startsWith('Parte I.'));
    expect(partOne?.semanticType).toBe('part');
    // The part's own blocks must NOT swallow its chapters' content.
    expect(partOne?.blocks.some((block) => block.content.includes('Cuerpo del capítulo uno'))).toBe(false);
  });
});

describe('splitConcatenatedTocParagraph — concatenated dot-leader TOC recovery', () => {
  it('splits a concatenated table of contents (one paragraph, many dot-leader entries) into separate entries', () => {
    const html =
      '<p>Introducción.............................5 El diagnóstico....................8 La paradoja del éxito solitario....................9</p>';

    const split = splitConcatenatedTocParagraph(html);
    expect(split).toContain('data-toc-page="5"');
    expect(split).toContain('data-toc-page="8"');
    expect(split).toContain('data-toc-page="9"');
    expect((split.match(/data-toc-entry="true"/g) ?? []).length).toBe(3);
  });

  it('leaves an ordinary paragraph with one dotted abbreviation untouched (not mistaken for a concatenated TOC)', () => {
    const html =
      '<p>Según el informe del Dr. A. B. García..................la cifra sorprendió a todos en la reunión de ayer por la tarde.</p>';
    expect(splitConcatenatedTocParagraph(html)).toBe(html);
  });
});

describe('inferSectionSemantics — spelled-out, Roman and Arabic chapter/part numbers', () => {
  it.each([
    ['Capítulo 1. Título', 'chapter', 1],
    ['Capítulo Uno. Título', 'chapter', 1],
    ['Capítulo Diez. Título', 'chapter', 10],
    ['Chapter One. Title', 'chapter', 1],
    ['Capítulo IV. Título', 'chapter', 4],
    ['Parte I. Título', 'part', 1],
    ['Parte Dos. Título', 'part', 2],
    ['Parte III. Título', 'part', 3],
  ] as const)('%s -> %s #%i', (title, expectedType, expectedNumber) => {
    const result = inferSectionSemantics(title);
    expect(result.semanticType).toBe(expectedType);
    expect(result.chapterNumber).toBe(expectedNumber);
  });

  it('does not misread ordinary prose starting with "parte"/"fase" as a heading keyword', () => {
    // Guarded via AMBIGUOUS_MAJOR_HEADING_PREFIX_RE's word-count cap — this
    // is exercised indirectly through buildImportedDocumentSeed, since
    // inferSectionSemantics itself only classifies titles already chosen as
    // headings elsewhere.
    const html = '<p>Esto forma parte de la vida que decidiste construir con esfuerzo durante años de trabajo constante y disciplina diaria sostenida.</p>';
    const seed = seedFromDocxHtml(html);
    const titles = seed.chapters?.map((chapter) => chapter.title) ?? [];
    expect(titles.some((title) => /^parte\b/i.test(title))).toBe(false);
  });
});
