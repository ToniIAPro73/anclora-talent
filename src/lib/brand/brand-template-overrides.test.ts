import { describe, expect, test } from 'vitest';
import { brandProfileToTemplateOverrides } from './brand-template-overrides';
import { createBrandProfileRecord } from './brand-profile';

const ANCLORA_PROFILE = createBrandProfileRecord('user_1', {
  name: 'Anclora Insights',
  status: 'active',
  palette: [
    { role: 'ink', hex: '#0F172A', name: 'Negro Tinta', usagePercent: 55, confidence: 'high' },
    { role: 'paper', hex: '#F8FAFC', name: 'Crema Papel', usagePercent: 30, confidence: 'high' },
    { role: 'accent', hex: '#F59E0B', name: 'Oro Metálico', usagePercent: 10, confidence: 'high' },
    { role: 'accentMuted', hex: '#D97706', name: 'Oro Mitigado', usagePercent: 5, confidence: 'high' },
  ],
  typography: {
    display: { family: 'Libre Baskerville', confidence: 'high' },
    body: { family: 'Inter', confidence: 'high' },
  },
  usageProportions: { ink: 55, paper: 30, accent: 10, accentMuted: 5 },
});

describe('brandProfileToTemplateOverrides', () => {
  test('maps a full profile to composer template overrides (R3)', () => {
    const overrides = brandProfileToTemplateOverrides(ANCLORA_PROFILE);

    expect(overrides.displayFontFamily).toBe('Libre Baskerville');
    expect(overrides.bodyFontFamily).toBe('Inter');
    // `fontFamily` is forwarded to canvas measurers: the body voice.
    expect(overrides.fontFamily).toBe('Inter');
    // Ink is the color of authority: headings and body text.
    expect(overrides.headingColor).toBe('#0F172A');
    expect(overrides.bodyColor).toBe('#0F172A');
    expect(overrides.inkColor).toBe('#0F172A');
    expect(overrides.paperColor).toBe('#F8FAFC');
    expect(overrides.accentColor).toBe('#F59E0B');
    expect(overrides.accentMutedColor).toBe('#D97706');
  });

  test('is pure: same profile produces an equal overrides object', () => {
    expect(brandProfileToTemplateOverrides(ANCLORA_PROFILE)).toEqual(
      brandProfileToTemplateOverrides(ANCLORA_PROFILE),
    );
  });

  test('partial profile only overrides declared fields (G1)', () => {
    const partial = createBrandProfileRecord('user_1', {
      name: 'Solo acento',
      palette: [
        { role: 'accent', hex: '#F59E0B', name: null, usagePercent: null, confidence: 'low' },
      ],
      typography: { display: null, body: null },
    });

    expect(brandProfileToTemplateOverrides(partial)).toEqual({ accentColor: '#F59E0B' });
  });

  test('empty profile produces no overrides', () => {
    const empty = createBrandProfileRecord('user_1', {
      name: 'Vacío',
      palette: [],
      typography: { display: null, body: null },
    });

    expect(brandProfileToTemplateOverrides(empty)).toEqual({});
  });
});
