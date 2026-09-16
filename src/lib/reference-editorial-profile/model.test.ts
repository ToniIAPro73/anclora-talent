import { describe, expect, test } from 'vitest';
import {
  hasUsableEditorialEvidence,
  type ReferenceEditorialProfile,
} from './model';

function profile(overrides: Partial<ReferenceEditorialProfile> = {}): ReferenceEditorialProfile {
  return {
    version: 1,
    profileType: 'editorial',
    source: {
      sourceAssetId: null,
      format: 'pdf',
      filename: 'reference.pdf',
      hash: null,
      analysedAt: '2026-09-16T00:00:00.000Z',
      parserVersion: 'test',
    },
    page: {
      width: 595,
      height: 842,
      unit: 'pt',
      orientation: 'portrait',
      margins: { top: 72, right: 72, bottom: 72, left: 72 },
      contentWidth: 451,
      contentHeight: 698,
      columns: 1,
      gutter: 0,
    },
    body: {
      fontFamily: 'Garamond Pro',
      resolvedFontFamily: 'EB Garamond',
      fontSize: 11,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#222222',
      lineHeight: 1.4,
      textAlign: 'justify',
      firstLineIndent: 14,
      paragraphSpacingBefore: 0,
      paragraphSpacingAfter: 6,
    },
    headings: { h1: null, h2: null, h3: null, h4: null },
    chapterOpening: {
      detected: false,
      labelStyle: null,
      titleStyle: null,
      subtitleStyle: null,
      alignment: 'unknown',
      spacingBefore: null,
      spacingAfter: null,
      pageBreakBefore: null,
      startOnOddPage: null,
    },
    quote: null,
    lists: { unordered: null, ordered: null },
    captions: null,
    header: { enabled: false, position: 'top', style: null, alignment: 'unknown' },
    footer: { enabled: false, position: 'bottom', style: null, alignment: 'unknown' },
    pageNumber: { enabled: false, position: 'footer', style: null, alignment: 'unknown' },
    toc: { detected: false, titleStyle: null, entryStyle: null, pageNumberStyle: null, leaderStyle: null },
    separators: null,
    palette: [],
    confidence: {
      overall: 'low',
      pageGeometry: 'unknown',
      bodyTypography: 'unknown',
      headings: 'unknown',
      chapterOpening: 'unknown',
      headers: 'unknown',
      footers: 'unknown',
      toc: 'unknown',
    },
    observedStructure: {
      optional: true,
      frontMatter: false,
      chapterCount: null,
      headingDepth: null,
      backMatter: false,
    },
    ...overrides,
  };
}

describe('ReferenceEditorialProfile quality gate', () => {
  test('accepts visual evidence without semantic chapter observations', () => {
    const result = profile({
      observedStructure: {
        optional: true,
        frontMatter: false,
        chapterCount: 0,
        headingDepth: 0,
        backMatter: false,
      },
      confidence: {
        ...profile().confidence,
        overall: 'medium',
        pageGeometry: 'high',
        bodyTypography: 'high',
        headings: 'low',
      },
    });
    expect(hasUsableEditorialEvidence(result)).toBe(true);
  });

  test('rejects profile with no geometry and no body typography', () => {
    const result = profile({
      page: { ...profile().page, width: null, height: null, contentWidth: null, contentHeight: null },
      body: { ...profile().body, fontFamily: null, resolvedFontFamily: null, fontSize: null },
    });
    expect(hasUsableEditorialEvidence(result)).toBe(false);
  });
});
