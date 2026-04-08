import { describe, expect, test } from 'vitest';
import {
  findWordRange,
  hasUsableParagraphAtCursor,
  hasUsableWordAtCursor,
} from './editor-selection-utils';

describe('editor selection utils', () => {
  test('finds the current word around a collapsed cursor inside text', () => {
    expect(findWordRange('hola mundo', 1)).toEqual({ from: 0, to: 4 });
    expect(findWordRange('hola mundo', 6)).toEqual({ from: 5, to: 10 });
  });

  test('resolves a word when the caret sits at end of text', () => {
    expect(findWordRange('hola', 4)).toEqual({ from: 0, to: 4 });
  });

  test('resolves the preceding word when the caret sits at its boundary before whitespace or punctuation', () => {
    expect(findWordRange('hola mundo', 10)).toEqual({ from: 5, to: 10 });
    expect(findWordRange('hola, mundo', 4)).toEqual({ from: 0, to: 4 });
  });

  test('returns null for true empty-space contexts', () => {
    expect(findWordRange('   ', 1)).toBeNull();
    expect(findWordRange('hola, mundo', 5)).toBeNull();
  });

  test('keeps punctuation-only runs out while allowing apostrophes, hyphens, and decomposed accents', () => {
    expect(findWordRange('--', 2)).toBeNull();
    expect(findWordRange("l'année", 7)).toEqual({ from: 0, to: 7 });
    expect(findWordRange('rock-n-roll', 11)).toEqual({ from: 0, to: 11 });
    expect(findWordRange('cafe\u0301', 5)).toEqual({ from: 0, to: 5 });
  });

  test('recognizes non-BMP letters as words', () => {
    expect(findWordRange('𐐷', 0)).toEqual({ from: 0, to: 2 });
  });

  test('detects usable word and paragraph contexts', () => {
    expect(hasUsableWordAtCursor('capitulo', 3)).toBe(true);
    expect(hasUsableWordAtCursor('   ', 1)).toBe(false);
    expect(hasUsableParagraphAtCursor('texto del parrafo')).toBe(true);
    expect(hasUsableParagraphAtCursor('   ')).toBe(false);
  });
});
