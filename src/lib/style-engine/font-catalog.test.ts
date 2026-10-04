import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTROLLED_FONT_CATALOG, cssFontFamily, exportCategoryForFamily, getSelectableFontCatalog, resolveFont } from './font-registry';

const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

describe('controlled font catalog', () => {
  it('exposes exactly 50 selectable families with unique names', () => {
    const selectable = getSelectableFontCatalog();
    const names = selectable.map((entry) => entry.family);
    expect(selectable).toHaveLength(50);
    expect(new Set(names).size).toBe(names.length);
  });

  it('declares bundled only for entries with shipped WOFF2 files that exist on disk', () => {
    const bundled = CONTROLLED_FONT_CATALOG.filter((entry) => entry.loadingStrategy === 'bundled');
    expect(bundled.map((entry) => entry.family).sort()).toEqual(['Liberation Mono', 'Liberation Sans', 'Liberation Serif']);
    for (const entry of bundled) {
      expect(entry.bundledFiles).toHaveLength(4);
      for (const file of entry.bundledFiles ?? []) {
        expect(fs.existsSync(path.join(PUBLIC_DIR, file.url)), `${file.url} must exist`).toBe(true);
      }
    }
  });

  it('never declares a google-webfont entry without a bundled file list being required', () => {
    for (const entry of CONTROLLED_FONT_CATALOG.filter((item) => item.loadingStrategy === 'google-webfont')) {
      expect(entry.bundledFiles).toBeUndefined();
      expect(entry.license).toBe('SIL-OFL-1.1');
    }
  });
});

describe('compatibility resolution keeps source provenance', () => {
  it('resolves Liberation families exactly, not as substitutes', () => {
    expect(resolveFont('Liberation Serif')).toMatchObject({ sourceFamily: 'Liberation Serif', resolvedFamily: 'Liberation Serif', status: 'exact', delivery: 'bundled' });
    expect(resolveFont('Liberation Sans')).toMatchObject({ resolvedFamily: 'Liberation Sans', status: 'exact', delivery: 'bundled' });
    expect(resolveFont('Liberation Mono')).toMatchObject({ resolvedFamily: 'Liberation Mono', status: 'exact', delivery: 'bundled' });
  });

  it.each([
    ['Calibri', 'Carlito'],
    ['Cambria', 'Caladea'],
    ['Arial', 'Arimo'],
    ['Courier New', 'Cousine'],
    ['Times New Roman', 'Liberation Serif'],
  ])('maps %s to %s as compatible-substitute', (source, resolved) => {
    expect(resolveFont(source)).toMatchObject({ sourceFamily: source, resolvedFamily: resolved, status: 'compatible-substitute', available: false });
  });

  it('keeps the Times New Roman source name while rendering the upstream-declared Liberation Serif substitute', () => {
    const resolution = resolveFont('Times New Roman');
    expect(resolution.sourceFamily).toBe('Times New Roman');
    expect(resolution.resolvedFamily).toBe('Liberation Serif');
    expect(resolution.status).toBe('compatible-substitute');
    expect(resolution.delivery).toBe('bundled');
  });

  it('keeps Georgia as a system family with system delivery', () => {
    expect(resolveFont('Georgia')).toMatchObject({ resolvedFamily: 'Georgia', status: 'exact', delivery: 'system' });
  });
});

describe('CSS font-family serialization', () => {
  it('quotes family names so digits such as "Source Serif 4" survive in a style attribute', () => {
    expect(cssFontFamily('Source Serif 4')).toBe("'Source Serif 4'");
    expect(cssFontFamily(' Lora ')).toBe("'Lora'");
  });
});

describe('export classification derives from the registry', () => {
  it('classifies registry families by category', () => {
    expect(exportCategoryForFamily('Liberation Sans')).toBe('sans-serif');
    expect(exportCategoryForFamily('Liberation Mono')).toBe('monospace');
    expect(exportCategoryForFamily('EB Garamond')).toBe('serif');
  });
});
