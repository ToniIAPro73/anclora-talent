import { describe, expect, it } from 'vitest';
import { cssPxToPt, formatPointSize, ptToCssPx } from './units';

describe('editorial point units', () => {
  it('preserves fractional point sizes through CSS conversion', () => {
    expect(ptToCssPx(11.5)).toBeCloseTo(15.333333, 5);
    expect(cssPxToPt('15.333333333333334px')).toBeCloseTo(11.5, 5);
    expect(cssPxToPt('11.5pt')).toBe(11.5);
    expect(formatPointSize(11.5)).toBe('11.5 pt');
  });
});
