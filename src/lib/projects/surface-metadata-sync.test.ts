import { describe, expect, it } from 'vitest';
import { condenseSubtitle } from './surface-metadata-sync';

describe('condenseSubtitle', () => {
  it('returns short subtitles unchanged', () => {
    expect(condenseSubtitle('Un subtítulo corto.')).toBe('Un subtítulo corto.');
  });

  it('keeps whole sentences and appends an ellipsis when over the limit', () => {
    const subtitle =
      'Cómo reconstruir relaciones auténticas cuando tu vida funciona por fuera, ' +
      'pero se siente vacía por dentro, incluso cuando todo parece ir bien en el trabajo. ' +
      'Una guía práctica para el alto rendimiento. ' +
      'Con ejercicios y reflexiones en cada capítulo.';
    const condensed = condenseSubtitle(subtitle);

    expect(condensed.length).toBeLessThanOrEqual(221); // limit + ellipsis char
    expect(condensed.endsWith('…')).toBe(true);
    expect(condensed).not.toContain('. .');
    // First sentence is kept whole, not cut mid-word.
    expect(condensed.startsWith('Cómo reconstruir relaciones auténticas')).toBe(true);
  });

  it('falls back to a word-boundary cut when a single sentence exceeds the limit', () => {
    const longSentence = `${'palabra '.repeat(40).trim()} sinpuntofinal`;
    const condensed = condenseSubtitle(longSentence);

    expect(condensed.endsWith('…')).toBe(true);
    expect(condensed.length).toBeLessThanOrEqual(221);
    expect(longSentence.startsWith(condensed.slice(0, -1))).toBe(true);
  });

  it('never mutates the original string', () => {
    const original = 'X'.repeat(300);
    condenseSubtitle(original);
    expect(original).toHaveLength(300);
  });

  it('respects a custom limit', () => {
    const subtitle = 'Frase uno. Frase dos. Frase tres.';
    expect(condenseSubtitle(subtitle, 10)).toBe('Frase uno…');
  });
});
