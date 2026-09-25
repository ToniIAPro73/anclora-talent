import { describe, expect, it } from 'vitest';
import { loadTestPackBuffers } from '@/lib/test-fixtures/compilation-corpus';
import { extractBrandProfileFromPdf } from './extract-brand-profile';
import { brandProfileToTemplateOverrides } from './brand-template-overrides';

describe('Phase 3 — Brand Profile Token Integration (P3-T01)', () => {
  it('extracts brand tokens and maps them to canonical style overrides', async () => {
    const { brandPdf } = loadTestPackBuffers();
    const result = await extractBrandProfileFromPdf(brandPdf);
    const { profile } = result;

    expect(profile.name).toBeDefined();
    expect(profile.palette.length).toBeGreaterThan(0);

    const overrides = brandProfileToTemplateOverrides(profile);

    // Ink, paper, accent roles mapped
    if (overrides.inkColor) {
      expect(overrides.headingColor).toBe(overrides.inkColor);
      expect(overrides.bodyColor).toBe(overrides.inkColor);
    }

    console.log('Extracted Brand Profile:');
    console.log('Palette:', profile.palette);
    console.log('Typography:', profile.typography);
    console.log('Overrides:', overrides);
  });
});
