import { describe, expect, it } from 'vitest';
import { resolveDocumentStyles, SYSTEM_DEFAULTS } from './cascade-resolver';
import type { ReferenceEditorialProfile } from '@/lib/reference-editorial-profile/model';
import type { BrandProfile } from '@/lib/brand/brand-profile';
import type { UserStyleOverride } from './model';

describe('Phase 4 — Deterministic Style Cascade Resolver (P4-T01)', () => {
  it('falls back cleanly to system defaults when no profiles are provided', () => {
    const styleMap = resolveDocumentStyles({});

    expect(styleMap.body.fontFamily).toBe(SYSTEM_DEFAULTS.body.fontFamily);
    expect(styleMap.body.fontSizePt).toBe(SYSTEM_DEFAULTS.body.fontSizePt);
    expect(styleMap.headings.h1.fontSizePt).toBe(SYSTEM_DEFAULTS.h1.fontSizePt);
    expect(styleMap.page.widthPt).toBe(SYSTEM_DEFAULTS.page.widthPt);
    expect(styleMap.version).toBe(1);
  });

  it('applies reference editorial profile layout, geometry, and typography', () => {
    const mockRef: Partial<ReferenceEditorialProfile> = {
      version: 1,
      profileType: 'editorial',
      page: {
        width: 500,
        height: 750,
        unit: 'pt',
        orientation: 'portrait',
        margins: { top: 40, bottom: 40, left: 35, right: 35 },
        contentWidth: 430,
        contentHeight: 670,
        columns: 1,
        gutter: 0,
      },
      body: {
        fontFamily: 'Noto Serif',
        resolvedFontFamily: 'Noto Serif',
        fontSize: 10.5,
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#222222',
        lineHeight: 1.5,
        textAlign: 'justify',
        firstLineIndent: 14,
        paragraphSpacingBefore: 0,
        paragraphSpacingAfter: 4,
      },
      headings: {
        h1: {
          fontFamily: 'Noto Sans',
          resolvedFontFamily: 'Noto Sans',
          fontSize: 24,
          fontWeight: 'bold',
          fontStyle: 'normal',
          color: '#111111',
          lineHeight: 1.2,
          textAlign: 'left',
          firstLineIndent: 0,
          paragraphSpacingBefore: 30,
          paragraphSpacingAfter: 15,
        },
        h2: null,
        h3: null,
        h4: null,
      },
      chapterOpening: {
        detected: true,
        labelStyle: null,
        titleStyle: null,
        subtitleStyle: null,
        alignment: 'left',
        spacingBefore: 30,
        spacingAfter: 15,
        pageBreakBefore: true,
        startOnOddPage: true,
      },
      quote: null,
      lists: { unordered: null, ordered: null },
      captions: null,
      header: { enabled: true, position: 'top', style: null, alignment: 'left' },
      footer: { enabled: true, position: 'bottom', style: null, alignment: 'center' },
      pageNumber: { enabled: true, position: 'footer', style: null, alignment: 'center' },
      toc: { detected: false, titleStyle: null, entryStyle: null, pageNumberStyle: null, leaderStyle: 'unknown' },
      separators: null,
      palette: ['#222222', '#111111'],
      source: { format: 'docx', filename: 'ref.docx', analysedAt: '', parserVersion: 'v1' },
      metrics: { totalHeadings: 1, desglose: { h1Partes: 0, h2Capitulos: 1, h3Subsecciones: 0 }, tablas: 0, imagenes: 0 },
      confidence: { overall: 'high', pageGeometry: 'high', bodyTypography: 'high', headings: 'high', chapterOpening: 'high', headers: 'high', footers: 'high', toc: 'unknown' },
    };

    const styleMap = resolveDocumentStyles({
      referenceProfile: mockRef as ReferenceEditorialProfile,
    });

    expect(styleMap.page.widthPt).toBe(500);
    expect(styleMap.page.marginsPt.left).toBe(35);
    expect(styleMap.body.fontFamily).toBe('Noto Serif');
    expect(styleMap.body.fontSizePt).toBe(10.5);
    expect(styleMap.body.firstLineIndentPt).toBe(14);
    expect(styleMap.headings.h1.fontFamily).toBe('Noto Sans');
    expect(styleMap.headings.h1.fontSizePt).toBe(24);
    expect(styleMap.headings.h1.spacingBeforePt).toBe(30);
    expect(styleMap.header.borderBottom).toBe(true);
  });

  it('blends Brand Profile colors with Reference typography without losing reference scale', () => {
    const mockRef: Partial<ReferenceEditorialProfile> = {
      version: 1,
      profileType: 'editorial',
      body: {
        fontFamily: 'Noto Serif',
        resolvedFontFamily: 'Noto Serif',
        fontSize: 11,
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: null,
        lineHeight: 1.4,
        textAlign: 'justify',
        firstLineIndent: 12,
        paragraphSpacingBefore: 0,
        paragraphSpacingAfter: 5,
      },
      headings: {
        h1: {
          fontFamily: 'Noto Sans',
          resolvedFontFamily: 'Noto Sans',
          fontSize: 26,
          fontWeight: 'bold',
          fontStyle: 'normal',
          color: null,
          lineHeight: 1.2,
          textAlign: 'left',
          firstLineIndent: 0,
          paragraphSpacingBefore: 28,
          paragraphSpacingAfter: 14,
        },
        h2: null,
        h3: null,
        h4: null,
      },
    };

    const mockBrand: BrandProfile = {
      id: 'brand-1',
      userId: 'user-1',
      name: 'Anclora Insights',
      slug: 'anclora-insights',
      palette: [
        { name: 'Carbón', hex: '#1C242B', role: 'ink', isPrimary: true },
        { name: 'Oro', hex: '#D4AF37', role: 'accent', isPrimary: false },
        { name: 'Crema', hex: '#FDFBF7', role: 'paper', isPrimary: false },
      ],
      typography: {
        display: { family: 'Cinzel', fallback: 'serif' },
        body: { family: 'Source Serif Pro', fallback: 'serif' },
      },
      visualStyle: { borderStyle: 'clean', cornerRadius: 'none', shadowIntensity: 'none', density: 'comfortable' },
      rules: { alwaysUppercaseHeadings: false, centerAlignTitles: false, accentColorDividers: true, enableDropCaps: false, quoteMarksStyle: 'guillemets' },
      assets: {},
      isDefault: false,
      createdAt: '',
      updatedAt: '',
    };

    const styleMap = resolveDocumentStyles({
      referenceProfile: mockRef as ReferenceEditorialProfile,
      brandProfile: mockBrand,
    });

    // Typography comes from Reference
    expect(styleMap.body.fontFamily).toBe('Noto Serif');
    expect(styleMap.headings.h1.fontFamily).toBe('Noto Sans');
    expect(styleMap.headings.h1.fontSizePt).toBe(26);

    // Color comes from Brand
    expect(styleMap.body.color).toBe('#1C242B'); // Brand Ink
    expect(styleMap.headings.h1.color).toBe('#D4AF37'); // Brand Accent
    expect(styleMap.decorations.accentColor).toBe('#D4AF37');
    expect(styleMap.quote.borderLeftColor).toBe('#D4AF37');
  });

  it('guarantees User Overrides take highest precedence over both reference and brand', () => {
    const mockRef: Partial<ReferenceEditorialProfile> = {
      body: {
        fontFamily: 'Noto Serif',
        resolvedFontFamily: 'Noto Serif',
        fontSize: 11,
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#333333',
        lineHeight: 1.4,
        textAlign: 'justify',
        firstLineIndent: 12,
        paragraphSpacingBefore: 0,
        paragraphSpacingAfter: 5,
      },
      headings: {
        h1: {
          fontFamily: 'Noto Serif',
          resolvedFontFamily: 'Noto Serif',
          fontSize: 24,
          fontWeight: 'bold',
          fontStyle: 'normal',
          color: '#333333',
          lineHeight: 1.2,
          textAlign: 'left',
          firstLineIndent: 0,
          paragraphSpacingBefore: 24,
          paragraphSpacingAfter: 12,
        },
        h2: null,
        h3: null,
        h4: null,
      },
    };

    const mockBrand: BrandProfile = {
      id: 'brand-1',
      userId: 'user-1',
      name: 'Anclora Insights',
      version: 1,
      status: 'active',
      palette: [
        { name: 'Carbón', hex: '#1C242B', role: 'ink', usagePercent: 55, confidence: 'high' },
        { name: 'Oro', hex: '#D4AF37', role: 'accent', usagePercent: 10, confidence: 'high' },
      ],
      typography: { display: null, body: null },
      proportions: { ink: 55, paper: 30, accent: 10, accentMuted: 5 },
      rules: [],
      voicePairs: [],
      createdAt: '',
      updatedAt: '',
    };

    const userOverrides: UserStyleOverride[] = [
      {
        scope: 'role',
        targetRole: 'h1',
        styles: {
          fontSizePt: 32,
          color: '#FF0055',
          fontFamily: 'Custom Title Font',
        },
        updatedAt: new Date().toISOString(),
      },
    ];

    const styleMap = resolveDocumentStyles({
      referenceProfile: mockRef as ReferenceEditorialProfile,
      brandProfile: mockBrand,
      userOverrides,
    });

    // H1 overridden by User
    expect(styleMap.headings.h1.fontSizePt).toBe(32);
    expect(styleMap.headings.h1.color).toBe('#FF0055');
    expect(styleMap.headings.h1.fontFamily).toBe('Custom Title Font');

    // Body still follows cascade (Noto Serif + Brand ink)
    expect(styleMap.body.fontFamily).toBe('Noto Serif');
    expect(styleMap.body.color).toBe('#1C242B');
  });
});
