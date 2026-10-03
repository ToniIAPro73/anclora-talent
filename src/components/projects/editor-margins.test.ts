import { describe, expect, test } from 'vitest';

import { resolveEditorMargins } from './editor-margins';

describe('resolveEditorMargins', () => {
  const source = { top: 28, bottom: 28, left: 70, right: 62 };

  test('keeps source geometry before a project override exists, isolating from global user preferences', () => {
    const book = { top: 36, bottom: 36, left: 48, right: 36 };
    expect(resolveEditorMargins({ sourceMargins: source, userMargins: book })).toEqual(source);
  });

  test('restores a persisted project composition override over source geometry', () => {
    const book = { top: 36, bottom: 36, left: 48, right: 36 };
    expect(resolveEditorMargins({ compositionMargins: book, sourceMargins: source })).toEqual(book);
  });

  test('restores custom snapshot margins over source geometry when active', () => {
    const customSnapshot = { top: 40, bottom: 40, left: 80, right: 80 };
    expect(resolveEditorMargins({ customSnapshotMargins: customSnapshot, sourceMargins: source })).toEqual(customSnapshot);
  });

  test('keeps project composition override authoritative over custom snapshot and source', () => {
    const composition = { top: 12, bottom: 12, left: 16, right: 16 };
    const customSnapshot = { top: 40, bottom: 40, left: 80, right: 80 };
    expect(resolveEditorMargins({ compositionMargins: composition, customSnapshotMargins: customSnapshot, sourceMargins: source })).toEqual(composition);
  });

  test('falls back to global user margins only when no source or project composition exists', () => {
    const book = { top: 36, bottom: 36, left: 48, right: 36 };
    expect(resolveEditorMargins({ userMargins: book })).toEqual(book);
  });
});
