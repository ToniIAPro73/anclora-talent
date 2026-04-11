import { describe, expect, test } from 'vitest';
import { getImageScaleForFit } from './canvas-utils';

describe('getImageScaleForFit', () => {
  test('returns contain scaling by default', () => {
    expect(
      getImageScaleForFit({
        imageWidth: 995,
        imageHeight: 1600,
        targetWidth: 360,
        targetHeight: 540,
      }),
    ).toBeCloseTo(0.3375, 5);
  });

  test('returns cover scaling when requested', () => {
    expect(
      getImageScaleForFit({
        imageWidth: 995,
        imageHeight: 1600,
        targetWidth: 400,
        targetHeight: 600,
        fit: 'cover',
      }),
    ).toBeCloseTo(400 / 995, 5);
  });
});
