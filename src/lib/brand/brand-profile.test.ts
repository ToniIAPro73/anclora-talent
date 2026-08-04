import { describe, expect, test } from 'vitest';
import {
  createBrandProfileRecord,
  getBrandColor,
  normalizeHexColor,
  type BrandProfile,
} from './brand-profile';

describe('brand profile model', () => {
  test('normalizes hex colors to #RRGGBB uppercase', () => {
    expect(normalizeHexColor('#0f172a')).toBe('#0F172A');
    expect(normalizeHexColor('f59e0b')).toBe('#F59E0B');
    expect(normalizeHexColor('  #D97706 ')).toBe('#D97706');
    expect(normalizeHexColor('#fff')).toBeNull();
    expect(normalizeHexColor('not-a-color')).toBeNull();
  });

  test('creates a versioned draft profile by default', () => {
    const profile = createBrandProfileRecord('user_1', {
      name: 'Anclora Insights',
      palette: [
        { role: 'ink', hex: '#0F172A', name: 'Negro Tinta', usagePercent: 55, confidence: 'high' },
      ],
      typography: { display: { family: 'Libre Baskerville', confidence: 'high' }, body: null },
    });

    expect(profile.version).toBe(1);
    expect(profile.status).toBe('draft');
    expect(profile.userId).toBe('user_1');
    expect(profile.id).toBeTruthy();
    expect(profile.governanceRules).toEqual([]);
    expect(profile.voicePairs).toEqual([]);
  });

  test('looks up palette colors by role', () => {
    const profile: Pick<BrandProfile, 'palette'> = {
      palette: [
        { role: 'ink', hex: '#0F172A', name: null, usagePercent: null, confidence: 'low' },
        { role: 'accent', hex: '#F59E0B', name: null, usagePercent: null, confidence: 'low' },
      ],
    };

    expect(getBrandColor(profile, 'accent')?.hex).toBe('#F59E0B');
    expect(getBrandColor(profile, 'paper')).toBeNull();
  });
});
