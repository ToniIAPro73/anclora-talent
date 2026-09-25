import { describe, expect, it } from 'vitest';
import { getTestPackPaths, loadTestPackBuffers } from './compilation-corpus';

describe('Compilation Pipeline Test Harness & Fixtures (P0-T01)', () => {
  it('locates and reads all canonical test pack files', () => {
    const paths = getTestPackPaths();
    expect(paths.manuscriptDocx).toContain('ANCLORA_TALENT_TEST_MANUSCRIPT.docx');
    expect(paths.manuscriptMd).toContain('ANCLORA_TALENT_TEST_MANUSCRIPT.md');
    expect(paths.referenceDocx).toContain('ANCLORA_TALENT_REFERENCE_STYLE.docx');
    expect(paths.brandPdf).toContain('ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf');

    const buffers = loadTestPackBuffers();
    expect(buffers.manuscriptDocx.length).toBeGreaterThan(10000);
    expect(buffers.manuscriptMd.length).toBeGreaterThan(5000);
    expect(buffers.referenceDocx.length).toBeGreaterThan(10000);
    expect(buffers.brandPdf.length).toBeGreaterThan(50000);
  });
});
