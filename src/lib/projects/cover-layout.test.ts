import { describe, expect, test } from 'vitest';
import {
  COVER_PRINT_GEOMETRY,
  COVER_SURFACE_CANVAS,
  computeFullCoverSpreadWidthMm,
  computeSpineWidthMm,
} from './cover-layout';

describe('cover print geometry', () => {
  test('surface canvas keeps the 2:3 editorial ratio', () => {
    expect(COVER_SURFACE_CANVAS.width).toBe(400);
    expect(COVER_SURFACE_CANVAS.height).toBe(600);
  });

  test('spine width grows linearly with the page count', () => {
    expect(computeSpineWidthMm(0)).toBe(0);
    expect(computeSpineWidthMm(100)).toBe(
      Number((100 * COVER_PRINT_GEOMETRY.paperThicknessMmPerPage).toFixed(2)),
    );
    expect(computeSpineWidthMm(300)).toBeGreaterThan(computeSpineWidthMm(100));
  });

  test('full spread width includes both covers, spine and bleed', () => {
    const { trimWidthMm, bleedMm } = COVER_PRINT_GEOMETRY;
    const expected = trimWidthMm * 2 + computeSpineWidthMm(200) + bleedMm * 2;
    expect(computeFullCoverSpreadWidthMm(200)).toBe(Number(expected.toFixed(2)));
  });
});
