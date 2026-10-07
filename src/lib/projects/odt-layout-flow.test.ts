import { describe, expect, it } from 'vitest';
import { collapseLetterSpacing, reconstructLayoutFlow, type LayoutLine } from './odt-layout-flow';

const line = (page: number, y: number, text: string, extra: Partial<LayoutLine> = {}): LayoutLine => ({ page, x: 70, y, width: 300, height: 14, text, fontSizePt: 11.5, ...extra });
/** Body filler so the dominant type size is 11.5pt with a 17pt line pitch. */
const body = (page: number, startY: number, texts: string[]) => texts.map((text, index) => line(page, startY + index * 17, text));

describe('letter-spaced kickers', () => {
  it('collapses single-spaced letters and keeps the word gaps, whatever the gap width (2 or 3 spaces)', () => {
    expect(collapseLetterSpacing('G U Í A   P R Á C T I C A   ·   D E S A R R O L L O')).toBe('GUÍA PRÁCTICA · DESARROLLO');
    expect(collapseLetterSpacing('P A R T E  I')).toBe('PARTE I');
    expect(collapseLetterSpacing('C A P Í T U L O  U N O')).toBe('CAPÍTULO UNO');
    expect(collapseLetterSpacing('I N T R O D U C C I Ó N')).toBe('INTRODUCCIÓN');
  });

  it('never touches ordinary text', () => {
    expect(collapseLetterSpacing('Es domingo por la tarde.')).toBe('Es domingo por la tarde.');
    expect(collapseLetterSpacing('A B')).toBe('A B');
    expect(collapseLetterSpacing('Capítulo  1')).toBe('Capítulo  1');
  });
});

describe('reconstructLayoutFlow', () => {
  it('turns one frame per line into paragraphs separated by the vertical gap, with a space between lines', () => {
    const blocks = reconstructLayoutFlow([
      ...body(1, 100, ['Es domingo por la tarde. Tu casa está', 'en silencio y el silencio, por una', 'vez, no te calma.']),
      ...body(1, 190, ['Si has abierto este libro es porque', 'no necesitas que nadie te motive.']),
    ]);
    expect(blocks.map((block) => block.text)).toEqual([
      'Es domingo por la tarde. Tu casa está en silencio y el silencio, por una vez, no te calma.',
      'Si has abierto este libro es porque no necesitas que nadie te motive.',
    ]);
    expect(blocks.every((block) => block.kind === 'paragraph')).toBe(true);
  });

  it('undoes a hyphenated line break but keeps real compounds', () => {
    const [block] = reconstructLayoutFlow(body(1, 100, ['una conclusión evi-', 'dente para todos', 'los socio-', 'Económicos']));
    expect(block.text).toBe('una conclusión evidente para todos los socio- Económicos');
  });

  it('merges frames on one baseline in x order, even when an emphasised word has a different top', () => {
    const blocks = reconstructLayoutFlow([
      line(1, 100, 'Quiero ser claro sobre lo que este libro', { x: 70, width: 220 }),
      line(1, 97, 'no', { x: 292, width: 14, fontSizePt: 11.5, bold: true, height: 17 }),
      line(1, 100, 'es. Ni una invitación.', { x: 310, width: 90 }),
      ...body(1, 117, ['Segunda línea del mismo párrafo.']),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe('Quiero ser claro sobre lo que este libro no es. Ni una invitación. Segunda línea del mismo párrafo.');
  });

  it('makes only the title-sized type a level-1 heading; chapter titles are level 2, so there is one title and many chapters', () => {
    const blocks = reconstructLayoutFlow([
      line(1, 150, 'Éxito', { fontSizePt: 48, height: 56 }),
      line(1, 210, 'sin compañía', { fontSizePt: 44, italic: true, height: 52 }),
      line(1, 300, 'Antonio Ballesteros Alonso', { fontSizePt: 17, bold: true, height: 20 }), // the cover's author line: not a chapter
      ...body(2, 100, ['Texto de la página dos que ocupa espacio.', 'Segunda línea de texto.']),
      line(3, 90, 'La paradoja del éxito solitario', { fontSizePt: 20, bold: true, height: 24 }),
      ...body(3, 140, ['Hay un tipo de soledad que no sale.', 'Es la del que ganó.']),
      ...body(4, 100, Array.from({ length: 10 }, (_, index) => `Línea de cuerpo número ${index} para fijar el tamaño base.`)),
    ]);
    const headings = blocks.filter((block) => block.kind === 'heading');
    expect(headings.map((block) => [block.kind === 'heading' && block.level, block.text])).toEqual([
      [1, 'Éxito sin compañía'], // two display lines of the title are one heading, whatever their emphasis
      [2, 'La paradoja del éxito solitario'],
    ]);
    expect(blocks.find((block) => block.text === 'Antonio Ballesteros Alonso')?.kind).toBe('paragraph');
  });

  it('turns letter-spaced lines into kickers, short bold lines into sub-headings, and joins a wrapped sub-heading', () => {
    const blocks = reconstructLayoutFlow([
      ...body(2, 60, Array.from({ length: 8 }, (_, index) => `Texto de cuerpo ${index} suficientemente largo para el tamaño base.`)),
      line(3, 80, 'C A P Í T U L O  U N O', { fontSizePt: 10, bold: true }),
      line(3, 105, 'La única cosa que no se puede optimizar a', { fontSizePt: 11.5, bold: true }),
      line(3, 121, 'solas', { fontSizePt: 11.5, bold: true }),
      ...body(3, 150, ['Has aprendido a optimizar casi todo.', 'Pero hay una sola cosa.']),
    ]);
    const kicker = blocks.find((block) => block.text === 'CAPÍTULO UNO');
    expect(kicker).toMatchObject({ kind: 'paragraph', kicker: true });
    const sub = blocks.find((block) => block.kind === 'heading');
    expect(sub).toMatchObject({ kind: 'heading', level: 3, text: 'La única cosa que no se puede optimizar a solas' });
  });

  it('drops running page numbers, flags the first block of every page and keeps page order', () => {
    const blocks = reconstructLayoutFlow([
      ...body(1, 100, ['Primera página con texto suficiente.', 'Segunda línea.']),
      line(1, 600, '— 3 —'),
      ...body(2, 100, ['Segunda página con texto suficiente.', 'Otra línea más.']),
    ]);
    expect(blocks.map((block) => [block.page, block.first])).toEqual([[1, true], [2, true]]);
    expect(blocks.some((block) => /3/.test(block.text))).toBe(false);
  });
});
