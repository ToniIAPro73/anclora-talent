import { PDFDocument, StandardFonts, type PDFPage } from 'pdf-lib';

/**
 * Generates, at test time, a minimal synthetic PDF that reproduces the
 * structural conditions diagnosed in the pdf-import-structural-recovery
 * regression (see the SDD spec for the real-book root-cause analysis):
 * a blank cover, a two-line ALL-CAPS title glued to a two-line subtitle, a
 * copyright line naming the author, a dedication before the table of
 * contents, an explicit index with page numbers, letter-tracked chapter
 * markers with a title split onto the following line(s), a running header
 * and folio repeated on every content page, and an epilogue/appendix
 * closing unit — without embedding the real 122-page ebook as a fixture.
 */
export async function buildPdfRegressionFixture(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const PAGE_WIDTH = 420;
  const PAGE_HEIGHT = 640;
  const MARGIN_X = 48;
  const TOP_Y = 590;
  const LINE_HEIGHT = 16;
  const BODY_SIZE = 11;

  function addPage(lines: string[]): PDFPage {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = TOP_Y;
    for (const line of lines) {
      if (line.length > 0) {
        page.drawText(line, { x: MARGIN_X, y, size: BODY_SIZE, font });
      }
      y -= LINE_HEIGHT;
    }
    return page;
  }

  const runningHeader = 'MANUAL DE ESTRATEGIA PROFESIONAL';
  const folio = (n: number) => `— ${n} —`;

  // Page 1: blank cover (image-only in a real book — no extractable text).
  addPage([]);

  // Page 2: two-line ALL-CAPS title glued to a two-line mixed-case subtitle.
  addPage([
    'MANUAL DE ESTRATEGIA',
    'PROFESIONAL COMPLETA',
    'Cómo tomar mejores decisiones',
    'sin perder de vista lo importante',
  ]);

  // Page 3: disclaimer + copyright naming the author + edition line.
  addPage([
    'Este libro no sustituye el consejo de un profesional.',
    'Si necesitas ayuda, busca orientación especializada.',
    '© 2026 Antonio Ballesteros Alonso',
    'Todos los derechos reservados.',
    'Primera edición digital — 2026',
  ]);

  // Page 4: dedication (front matter with no heading of its own, before
  // the table of contents — regression case for the "front matter before
  // Índice must not become a fake Prólogo" fix).
  addPage(['A quienes se atreven a hacer las cosas de otra manera.', 'Gracias por seguir intentándolo.']);

  // Page 5: explicit table of contents with page numbers.
  addPage([
    '5',
    'ÍNDICE',
    'Prólogo 6',
    '1. El mapa antes del territorio 7',
    '2. Decisiones bajo presión 9',
    'Epílogo 11',
    'Apéndice: Herramientas y plantillas 12',
  ]);

  // Page 6: PRÓLOGO (short ALL-CAPS heading, no numeral, no lookahead needed).
  addPage([
    runningHeader,
    folio(6),
    'PRÓLOGO',
    'Si has llegado hasta aquí es porque algo en tu forma de decidir',
    'ya no te está funcionando como antes. Este libro no promete',
    'respuestas mágicas, solo un método más claro para pensar.',
  ]);

  // Page 7: letter-tracked chapter marker + split title (2 lines) + body.
  addPage([
    runningHeader,
    folio(7),
    'C A P Í T U L O 1',
    'El mapa antes del',
    'territorio',
    'La mayoría de decisiones importantes se toman con información',
    'incompleta. Aceptar esa incertidumbre desde el principio cambia',
    'por completo la forma en que te preparas para actuar.',
  ]);

  // Page 8: continuation of chapter 1, same running header/folio pattern —
  // exercises stripping across many consecutive pages, not just one.
  addPage([
    runningHeader,
    folio(8),
    'Un mapa útil no necesita ser perfecto, solo lo bastante bueno',
    'para orientar el siguiente paso. Ese es el estándar que vamos',
    'a usar en el resto de este capítulo.',
  ]);

  // Page 9: second letter-tracked chapter marker + split title + body.
  addPage([
    runningHeader,
    folio(9),
    'C A P Í T U L O 2',
    'Decisiones bajo',
    'presión',
    'Cuando el tiempo apremia, la calidad de una decisión depende',
    'menos de cuánto sabes y más de con cuánta claridad puedes',
    'descartar las opciones que no importan.',
  ]);

  // Page 10: EPÍLOGO.
  addPage([
    runningHeader,
    folio(10),
    'EPÍLOGO',
    'No existe una decisión perfecta, solo una decisión informada',
    'tomada con el método correcto. Eso es, al final, lo único que',
    'puedes controlar de verdad.',
  ]);

  // Page 11: APÉNDICE.
  addPage([
    runningHeader,
    folio(11),
    'APÉNDICE',
    'Herramientas y plantillas',
    'Aquí encontrarás las plantillas mencionadas a lo largo del libro,',
    'listas para usarse sin necesidad de buscarlas capítulo a capítulo.',
  ]);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
