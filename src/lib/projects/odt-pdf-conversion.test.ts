import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildImportedDocumentSeed } from './import-pipeline';
import { parseOdtSource, sourceModelToHtml } from './source-model';

const NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink"';

const spaced = (value: string) => value.split('').map((char) => (char === ' ' ? '<text:s text:c="2"/>' : `${char}<text:s/>`)).join('').replace(/<text:s\/>$/, '');

function frame(page: number, x: number, y: number, style: string, text: string, height = 17) {
  return `<draw:frame draw:style-name="Frame" text:anchor-type="page" text:anchor-page-number="${page}" svg:x="${x}pt" svg:y="${y}pt" svg:width="360pt" svg:height="${height}pt"><draw:text-box><text:p text:style-name="${style}">${text}</text:p></draw:text-box></draw:frame>`;
}

/** A PDF-converted ODT: one carrier paragraph per page, a page-sized SVG, one text frame per visual line. */
async function buildPdfConvertedOdt() {
  const page = (number: number, frames: string[]) =>
    `<text:p text:style-name="PageBreak"><draw:frame draw:style-name="Frame" text:anchor-type="page" text:anchor-page-number="${number}" svg:x="0pt" svg:y="0pt" svg:width="432pt" svg:height="648pt"><draw:image xlink:href="Pictures/page${number}.svg" xlink:type="simple"/></draw:frame>${frames.join('')}</text:p>`;
  const content = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}>
<office:automatic-styles>
<style:style style:name="PageBreak" style:family="paragraph"><style:paragraph-properties fo:line-height="1pt" fo:break-before="page"/><style:text-properties fo:font-size="1pt"/></style:style>
<style:style style:name="Cover" style:family="paragraph"><style:text-properties fo:font-size="48pt"/></style:style>
<style:style style:name="Kicker" style:family="paragraph"><style:text-properties fo:font-size="9pt" fo:font-weight="bold"/></style:style>
<style:style style:name="Author" style:family="paragraph"><style:text-properties fo:font-size="17pt" fo:font-weight="bold"/></style:style>
<style:style style:name="Chapter" style:family="paragraph"><style:text-properties fo:font-size="20pt" fo:font-weight="bold"/></style:style>
<style:style style:name="Body" style:family="paragraph"><style:text-properties fo:font-size="11.5pt"/></style:style>
</office:automatic-styles>
<office:body><office:text>
${page(1, [
    frame(1, 90, 120, 'Kicker', spaced('GUÍA PRÁCTICA'), 12),
    frame(1, 90, 200, 'Cover', 'Éxito sin compañía', 56),
    frame(1, 90, 300, 'Body', 'Cómo reconstruir relaciones auténticas'),
    frame(1, 90, 317, 'Body', 'cuando tu vida funciona por fuera.'),
    frame(1, 90, 400, 'Author', 'Antonio Ballesteros Alonso', 20),
  ])}
${page(2, [
    frame(2, 70, 80, 'Kicker', spaced('CAPÍTULO  UNO'), 12),
    frame(2, 70, 100, 'Chapter', 'La paradoja del éxito', 24),
    frame(2, 70, 160, 'Body', 'Hay un tipo de soledad que no sale en'),
    frame(2, 70, 177, 'Body', 'las películas. Es la del que ganó.'),
    frame(2, 70, 230, 'Body', 'Segundo párrafo, separado por un hueco.'),
    frame(2, 70, 600, 'Body', '— 2 —'),
  ])}
${page(3, [
    frame(3, 70, 160, 'Body', 'Tercera página con más texto de cuerpo para'),
    frame(3, 70, 177, 'Body', 'fijar el tamaño base del documento.'),
  ])}
</office:text></office:body></office:document-content>`;
  const zip = new JSZip();
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text');
  zip.file('content.xml', content);
  zip.file('styles.xml', `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}/>`);
  for (const number of [1, 2, 3]) zip.file(`Pictures/page${number}.svg`, '<svg xmlns="http://www.w3.org/2000/svg" width="432" height="648"/>');
  return zip.generateAsync({ type: 'uint8array' });
}

describe('ODT converted from a PDF (one positioned text frame per line)', () => {
  it('rebuilds a readable flow instead of one glued, 1pt-leaded block per page', async () => {
    const model = await parseOdtSource(await buildPdfConvertedOdt());
    const texts = model.blocks.map((block) => block.text);

    expect(texts).toEqual([
      'GUÍA PRÁCTICA',
      'Éxito sin compañía',
      'Cómo reconstruir relaciones auténticas cuando tu vida funciona por fuera.',
      'Antonio Ballesteros Alonso',
      'CAPÍTULO UNO',
      'La paradoja del éxito',
      'Hay un tipo de soledad que no sale en las películas. Es la del que ganó.',
      'Segundo párrafo, separado por un hueco.',
      'Tercera página con más texto de cuerpo para fijar el tamaño base del documento.',
    ]);
    // the page-sized SVG duplicates the text: it is not imported as a picture
    expect(model.blocks.some((block) => block.type === 'image')).toBe(false);
    // the carrier's 1pt line-height must not survive anywhere
    expect(sourceModelToHtml(model)).not.toMatch(/line-height:\s*1pt/);
    // headings by type size, kickers by letter-spacing, page breaks at page starts
    expect(model.blocks[1]).toMatchObject({ type: 'heading', level: 1 });
    expect(model.blocks[5]).toMatchObject({ type: 'heading', level: 2 });
    expect(model.blocks[0]).toMatchObject({ semanticRole: 'chapter-opener-kicker' });
    expect(model.blocks[0].paragraphProperties?.pageBreakBefore).toBeUndefined();
    expect(model.blocks[4].paragraphProperties?.pageBreakBefore).toBe('page');
    expect(model.blocks[8].paragraphProperties?.pageBreakBefore).toBe('page');
  });

  it('detects the real title, subtitle and author (a kicker above the title is neither)', async () => {
    const model = await parseOdtSource(await buildPdfConvertedOdt());
    const html = sourceModelToHtml(model);
    const seed = buildImportedDocumentSeed({
      fileName: 'libro.odt',
      mimeType: 'application/vnd.oasis.opendocument.text',
      text: model.blocks.map((block) => block.text ?? '').join('\n\n'),
      html,
      sourceModel: model,
    });
    expect(seed.title).toBe('Éxito sin compañía');
    expect(seed.subtitle).toBe('Cómo reconstruir relaciones auténticas cuando tu vida funciona por fuera.');
    expect(seed.author).toBe('Antonio Ballesteros Alonso');
    expect(seed.chapters?.some((chapter) => /paradoja/i.test(chapter.title))).toBe(true);
  });
});

describe('flowing ODT with letter-spaced labels and space-only spans', () => {
  it('collapses "C A P Í T U L O" to a kicker and keeps the space nodes between styled spans', async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/vnd.oasis.opendocument.text');
    zip.file(
      'content.xml',
      `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}><office:automatic-styles><style:style style:name="T1" style:family="text"><style:text-properties fo:font-size="10pt"/></style:style><style:style style:name="T2" style:family="text"><style:text-properties fo:font-size="11.5pt" fo:color="#2c2c2c"/></style:style></office:automatic-styles><office:body><office:text>` +
        `<text:p text:style-name="P1"><text:span text:style-name="T1">${spaced('CAPÍTULO  UNO')}</text:span></text:p>` +
        `<text:p text:style-name="P2"><text:span text:style-name="T2">No es la del</text:span> <text:span text:style-name="T2">personaje fracasado</text:span></text:p>` +
        `</office:text></office:body></office:document-content>`,
    );
    zip.file('styles.xml', `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}/>`);
    const model = await parseOdtSource(await zip.generateAsync({ type: 'uint8array' }));

    expect(model.blocks[0]).toMatchObject({ type: 'paragraph', text: 'CAPÍTULO UNO', semanticRole: 'chapter-opener-kicker' });
    expect(model.blocks[1].text).toBe('No es la del personaje fracasado');
    expect(sourceModelToHtml(model)).toContain('class="editorial-kicker"');
  });
});
