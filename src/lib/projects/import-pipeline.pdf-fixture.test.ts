import { describe, expect, test } from 'vitest';
import { buildPdfRegressionFixture } from './__fixtures__/pdf-regression-fixture';
import { buildImportedDocumentSeed, extractTextFromBuffer } from './import-pipeline';

/**
 * Level A regression (see sdd/features/pdf-import-structural-recovery):
 * a synthetic PDF generated at test time — not the real, uncommitted
 * regression book — exercising the same structural conditions through the
 * REAL `pdf-parse` extraction path (no mocks): a blank cover, a two-line
 * ALL-CAPS title glued to a two-line subtitle, a copyright line naming the
 * author, a dedication before the table of contents, an explicit index
 * with page numbers, two letter-tracked chapter markers with a title split
 * onto the following line(s), a running header + folio repeated on every
 * content page, and an epilogue/appendix closing unit.
 */
describe('pdf-import-structural-recovery: synthetic fixture (Level A)', () => {
  async function importFixture() {
    const buffer = await buildPdfRegressionFixture();
    const extracted = await extractTextFromBuffer('fixture.pdf', 'application/pdf', buffer);
    const seed = buildImportedDocumentSeed({
      fileName: 'fixture.pdf',
      mimeType: 'application/pdf',
      text: extracted.text,
      html: extracted.html,
      sourcePageCount: extracted.pageCount,
    });
    return { extracted, seed };
  }

  test('recovers title, subtitle and author from front matter', async () => {
    const { seed } = await importFixture();

    expect(seed.title).toBe('Manual de Estrategia Profesional Completa');
    expect(seed.subtitle).toBe('Cómo tomar mejores decisiones sin perder de vista lo importante');
    expect(seed.author).toBe('Antonio Ballesteros Alonso');
    expect(seed.confidence?.title).toBe('high');
    expect(seed.confidence?.author).toBe('medium');
  });

  test('detects the full structure: index, prólogo, two chapters, epílogo, apéndice — no duplicates', async () => {
    const { seed } = await importFixture();

    const titles = seed.chapters?.map((c) => c.title) ?? [];
    expect(titles).toEqual([
      'Índice',
      'Prólogo',
      'El mapa antes del territorio',
      'Decisiones bajo presión',
      'Epílogo',
      'Apéndice',
    ]);

    const nonIndexCount = titles.filter((t) => t.toLowerCase() !== 'índice').length;
    expect(nonIndexCount).toBe(5); // primary structural units, excluding the generated index

    const lowerTitles = titles.map((t) => t.toLowerCase());
    expect(new Set(lowerTitles).size).toBe(lowerTitles.length);
    expect(seed.confidence?.chapters).toBe('high');
  });

  test('strips the running header and folio from every content page without losing real content', async () => {
    const { extracted } = await importFixture();

    expect(extracted.text).not.toContain('MANUAL DE ESTRATEGIA PROFESIONAL');
    expect(extracted.text).not.toMatch(/—\s*\d+\s*—/);
    // The front-matter title (a different, one-off string) is untouched.
    expect(extracted.text).toContain('MANUAL DE ESTRATEGIA');
  });

  test('content integrity: every page contributes real content, nothing significant is lost', async () => {
    const { seed } = await importFixture();

    const allContent = seed.chapters?.map((c) => c.blocks.map((b) => b.content).join(' ')).join(' ') ?? '';
    const plain = allContent.replace(/<[^>]+>/g, ' ');

    const mustContain = [
      'A quienes se atreven a hacer las cosas de otra manera', // dedication, folded into Índice
      'Si has llegado hasta aquí es porque algo en tu forma de decidir', // Prólogo opening
      'La mayoría de decisiones importantes se toman con información', // Chapter 1 opening
      'Un mapa útil no necesita ser perfecto', // Chapter 1, page 2 of 2
      'Cuando el tiempo apremia, la calidad de una decisión depende', // Chapter 2 opening
      'No existe una decisión perfecta', // Epílogo opening
      'Aquí encontrarás las plantillas mencionadas', // Apéndice opening
    ];
    for (const needle of mustContain) {
      expect(plain).toContain(needle);
    }
  });

  test('the dedication (front matter before the table of contents) is preserved, not mislabeled as a fake Prólogo', async () => {
    const { seed } = await importFixture();

    const indexChapter = seed.chapters?.find((c) => c.title.toLowerCase() === 'índice');
    const indexContent = indexChapter?.blocks.map((b) => b.content).join(' ') ?? '';
    expect(indexContent).toContain('A quienes se atreven a hacer las cosas de otra manera');

    // The real Prólogo chapter holds only its own content, not the dedication.
    const prologoChapter = seed.chapters?.find((c) => c.title === 'Prólogo');
    const prologoContent = prologoChapter?.blocks.map((b) => b.content).join(' ') ?? '';
    expect(prologoContent).not.toContain('A quienes se atreven');
  });

  test('runs in reasonable time for an 11-page document (no quadratic blowup)', async () => {
    const start = Date.now();
    await importFixture();
    expect(Date.now() - start).toBeLessThan(5000);
  });
});
