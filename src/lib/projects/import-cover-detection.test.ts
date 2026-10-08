import { describe, expect, it } from 'vitest';
import { buildImportedDocumentSeed } from './import-pipeline';

const seedFrom = (html: string) =>
  buildImportedDocumentSeed({
    fileName: 'libro.odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    html,
  });

const kicker = (text: string) => `<p class="editorial-kicker"><span style="font-size:9pt">${text}</span></p>`;
const display = (text: string, size = 48) => `<p style="text-align:center"><span style="font-size:${size}pt">${text}</span></p>`;
const body = (text: string) => `<p><span style="font-size:11.5pt">${text}</span></p>`;

const COVER = `${kicker('GUÍA PRÁCTICA · DESARROLLO PERSONAL')}<p><img src="data:image/png;base64,AAAA" alt="Picture 1" /></p>${display('Éxito')}${display('sin compañía', 44)}${body('Cómo reconstruir relaciones auténticas cuando tu vida funciona por fuera.')}${kicker('ESCRITO POR')}${body('Antonio Ballesteros Alonso')}`;
const CHAPTER = '<h1>Introducción</h1><p>Es domingo por la tarde y la casa está en silencio.</p>';

describe('cover detection for an ODT made of loose paragraphs', () => {
  it('reads a title set in several display-size lines as one title, and a kicker is never the title', () => {
    const seed = seedFrom(`${COVER}${CHAPTER}`);
    expect(seed.title).toBe('Éxito sin compañía');
    expect(seed.subtitle).toBe('Cómo reconstruir relaciones auténticas cuando tu vida funciona por fuera.');
    expect(seed.author).toBe('Antonio Ballesteros Alonso');
    expect(seed.subtitle).not.toMatch(/\[Imagen\]|ESCRITO/);
  });

  it('keeps colophon lines of the copyright page out of the chapter that follows', () => {
    const credits = `${body('© 2026 Antonio Ballesteros Alonso Publicado bajo el sello editorial Anclora Insights')}${body('Todos los derechos reservados. Ninguna parte de esta publicación puede ser reproducida.')}${body('Primera edición: 2026')}${body('ISBN: 9798184523026')}${body('Diseño de cubierta e interior: Anclora Insights Palma de Mallorca, España')}${body('Anclora Insights')}${body('“La soledad no es la ausencia de personas. Es la ausencia de personas que te conozcan de verdad.”')}`;
    const seed = seedFrom(`${COVER}${credits}<h1>Índice</h1><p>Introducción 5</p><h1>Introducción</h1><p>Texto del capítulo.</p>`);
    const first = seed.chapters?.[0];
    const text = (first?.blocks ?? []).map((block) => block.content.replace(/<[^>]+>/g, '')).join(' | ');
    // The epigraph is its own front-matter page, followed by the Índice.
    expect(first?.title).toBe('Prólogo');
    expect(seed.chapters?.[1]?.title).toMatch(/ndice/i);
    expect(text).toContain('La soledad no es la ausencia');
    expect(text).not.toMatch(/ISBN|Primera edición|Todos los derechos|Diseño de cubierta/);
  });
});
