import { describe, expect, test } from 'vitest';

import { resolveEditorMargins } from './editor-margins';

describe('resolveEditorMargins', () => {
  const source = { top: 28, bottom: 28, left: 70, right: 62 };

  test('keeps source geometry before a user override exists', () => {
    expect(resolveEditorMargins({ sourceMargins: source, userMargins: { top: 24, bottom: 24, left: 24, right: 24 } })).toEqual(source);
  });

  test('restores a persisted non-default user preset after reload', () => {
    const book = { top: 36, bottom: 36, left: 48, right: 36 };
    expect(resolveEditorMargins({ sourceMargins: source, userMargins: book })).toEqual(book);
  });

  test('keeps project composition settings authoritative', () => {
    const composition = { top: 12, bottom: 12, left: 16, right: 16 };
    const book = { top: 36, bottom: 36, left: 48, right: 36 };
    expect(resolveEditorMargins({ compositionMargins: composition, sourceMargins: source, userMargins: book })).toEqual(composition);
  });
});
