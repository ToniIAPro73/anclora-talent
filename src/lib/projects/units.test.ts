import { describe, expect, it } from 'vitest';
import {
  cssPixelsToPoints,
  halfPointsToPoints,
  inchesToPoints,
  mmToPoints,
  pointsToCssPixels,
  pointsToHalfPoints,
  pointsToInches,
  pointsToMm,
  pointsToTwips,
  twipsToPoints,
} from './units';

describe('units conversion', () => {
  it('converts twips to points and back', () => {
    expect(twipsToPoints(1440)).toBe(72); // 1 inch in twips = 72 pt
    expect(twipsToPoints(240)).toBe(12);
    expect(pointsToTwips(72)).toBe(1440);
    expect(pointsToTwips(12)).toBe(240);
  });

  it('converts half-points to points and back', () => {
    expect(halfPointsToPoints(24)).toBe(12);
    expect(halfPointsToPoints(21)).toBe(10.5);
    expect(pointsToHalfPoints(12)).toBe(24);
    expect(pointsToHalfPoints(10.5)).toBe(21);
  });

  it('converts inches to points and back', () => {
    expect(inchesToPoints(1)).toBe(72);
    expect(inchesToPoints(6)).toBe(432); // 6 in
    expect(inchesToPoints(9)).toBe(648); // 9 in
    expect(pointsToInches(432)).toBe(6);
    expect(pointsToInches(648)).toBe(9);
  });

  it('converts mm to points and back', () => {
    expect(Math.round(mmToPoints(25.4))).toBe(72);
    expect(Math.round(pointsToMm(72))).toBe(25);
  });

  it('converts points to CSS pixels and back', () => {
    expect(pointsToCssPixels(72)).toBe(96);
    expect(cssPixelsToPoints(96)).toBe(72);
    expect(pointsToCssPixels(12)).toBe(16);
    expect(cssPixelsToPoints(16)).toBe(12);
  });

  it('safely handles non-finite inputs', () => {
    expect(twipsToPoints(Number.NaN)).toBe(0);
    expect(pointsToTwips(Infinity)).toBe(0);
    expect(halfPointsToPoints(-Infinity)).toBe(0);
  });
});
