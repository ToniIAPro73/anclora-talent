import { describe, expect, test } from 'vitest';
import { applyRenderedPageBreaks } from './source-page-breaks';

const p = (content: string) => ({ type: 'paragraph', content: `<p>${content}</p>` });

describe('applyRenderedPageBreaks', () => {
  test('puts a break where each rendered page starts and drops guessed breaks', () => {
    const chapters = [
      { blocks: [p('Capítulo Uno'), p('Primera página con texto suficiente.'), { type: 'pageBreak', content: '' }, p('Una frase que el autor corta aquí.'), p('Otro párrafo largo de la segunda página.'), p('<span>La decisión</span> cotidiana en una tabla')] },
      { blocks: [p('Capítulo Dos'), p('Texto del segundo capítulo aquí.')] },
    ];
    const pages = [
      'Capítulo Uno\nPrimera página con texto suficiente.\n  — 5 —',
      'Una frase que el autor cor-\nta aquí.\nOtro párrafo largo de la segunda página.',
      'La decisión cotidiana en una tabla',
      'Capítulo Dos\nTexto del segundo capítulo aquí.',
    ];
    const { chapters: result, alignment } = applyRenderedPageBreaks(chapters, pages);
    expect(result[0].blocks.map((block) => block.type === 'pageBreak' ? 'PB' : 'p')).toEqual(['p', 'p', 'PB', 'p', 'p', 'PB', 'p']);
    expect(result[1].blocks.some((block) => block.type === 'pageBreak')).toBe(false);
    expect(alignment.matchedPages).toBe(4);
  });

  test('a page that starts with a short block continues into the next ones', () => {
    const chapters = [{ blocks: [p('Intro'), p('PARTE I'), p('El diagnóstico'), p('Antes de reconstruir nada.')] }];
    const { chapters: result } = applyRenderedPageBreaks(chapters, ['Intro', 'PARTE I\nEl diagnóstico\nAntes de reconstruir']);
    expect(result[0].blocks.map((block) => block.type)).toEqual(['paragraph', 'pageBreak', 'paragraph', 'paragraph', 'paragraph']);
  });

  test('keeps the importer breaks when the rendered pages cannot be aligned', () => {
    const chapters = [{ blocks: [p('Hola mundo uno'), { type: 'pageBreak', content: '' }, p('Hola mundo dos')] }];
    const { chapters: result, alignment } = applyRenderedPageBreaks(chapters, ['texto que no existe en absoluto', 'otra cosa distinta del todo']);
    expect(result).toBe(chapters);
    expect(alignment.inserted).toBe(0);
  });
});
