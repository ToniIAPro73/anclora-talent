import { describe, expect, it } from 'vitest';
import { loadTestPackBuffers } from '@/lib/test-fixtures/compilation-corpus';
import { extractEditorialProfileFromDocx } from './docx';

describe('Phase 2 — Reference Style Extractor', () => {
  it('extracts complete editorial styling from ANCLORA_TALENT_REFERENCE_STYLE.docx', async () => {
    const { referenceDocx } = loadTestPackBuffers();
    const result = await extractEditorialProfileFromDocx(referenceDocx, {
      filename: 'ANCLORA_TALENT_REFERENCE_STYLE.docx',
    });

    const { profile } = result;

    // Body styling
    expect(profile.body.fontFamily).toBeDefined();
    expect(profile.body.fontSize).toBeGreaterThan(8);
    expect(profile.body.lineHeight).toBeDefined();

    // Exact font resolution (P2-T02)
    expect(profile.body.fontFamily).toBe('Noto Serif');
    expect(profile.body.resolvedFontFamily).toBe('Noto Serif');
    expect(profile.headings.h1?.fontFamily).toBe('Noto Sans');
    expect(profile.headings.h1?.resolvedFontFamily).toBe('Noto Sans');
    expect(profile.headings.h1?.color).toBe('#0D3F4A');
    expect(profile.headings.h1?.paragraphSpacingBefore).toBe(24);
    expect(profile.headings.h2?.color).toBe('#CC6530');
    expect(profile.headings.h2?.paragraphSpacingBefore).toBe(10);
    expect(profile.palette).toContain('#0D3F4A');
    expect(profile.palette).toContain('#CC6530');

    // Page Geometry
    expect(profile.page.width).toBeGreaterThan(300);
    expect(profile.page.height).toBeGreaterThan(400);
    expect(profile.page.margins.top).toBeDefined();
    expect(profile.page.margins.left).toBeDefined();

    console.log('Extracted Reference Profile:');
    console.log('Body:', profile.body);
    console.log('H1:', profile.headings.h1);
    console.log('H2:', profile.headings.h2);
    console.log('Page:', profile.page);
  });
});
