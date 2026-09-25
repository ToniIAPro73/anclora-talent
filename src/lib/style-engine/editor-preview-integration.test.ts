import { describe, expect, it } from 'vitest';
import { compileDocument } from './document-compiler';
import { resolveDocumentStyles } from './cascade-resolver';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import type { ProjectRecord } from '@/lib/projects/types';
import type { ReferenceEditorialProfile } from '@/lib/reference-editorial-profile/model';
import type { BrandProfile } from '@/lib/brand/brand-profile';

describe('Phase 6 & Phase 7 — Chapter Editor & Preview Engine Style Integration', () => {
  const mockRef: Partial<ReferenceEditorialProfile> = {
    page: {
      width: 450,
      height: 650,
      unit: 'pt',
      orientation: 'portrait',
      margins: { top: 48, bottom: 48, left: 42, right: 42 },
      contentWidth: 366,
      contentHeight: 554,
      columns: 1,
      gutter: 0,
    },
    body: {
      fontFamily: 'Noto Serif',
      resolvedFontFamily: 'Noto Serif',
      fontSize: 11,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#1A1A1A',
      lineHeight: 1.45,
      textAlign: 'justify',
      firstLineIndent: 12,
      paragraphSpacingBefore: 0,
      paragraphSpacingAfter: 6,
    },
    headings: {
      h1: {
        fontFamily: 'Noto Sans',
        resolvedFontFamily: 'Noto Sans',
        fontSize: 24,
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#0D3F4A',
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
    slug: 'anclora-insights',
    palette: [
      { name: 'Carbón', hex: '#1C242B', role: 'ink', isPrimary: true },
      { name: 'Oro', hex: '#D4AF37', role: 'accent', isPrimary: false },
    ],
    typography: { display: null, body: null },
    visualStyle: { borderStyle: 'clean', cornerRadius: 'none', shadowIntensity: 'none', density: 'comfortable' },
    rules: { alwaysUppercaseHeadings: false, centerAlignTitles: false, accentColorDividers: true, enableDropCaps: false, quoteMarksStyle: 'guillemets' },
    assets: {},
    isDefault: false,
    createdAt: '',
    updatedAt: '',
  };

  it('compiles document and binds CSS variables for the Chapter Editor shell (P6-T01)', () => {
    const compiled = compileDocument({
      projectId: 'proj-editor-1',
      document: {
        version: 1,
        metadata: { title: 'Test Book' },
        blocks: [
          { id: 'b1', type: 'heading', level: 1, content: 'Introducción' },
          { id: 'b2', type: 'paragraph', content: 'Texto del capítulo.' },
        ],
      },
      referenceProfile: mockRef as ReferenceEditorialProfile,
      brandProfile: mockBrand,
    });

    expect(compiled.cssVariables['--talent-body-font']).toBe('Noto Serif');
    expect(compiled.cssVariables['--talent-h1-font']).toBe('Noto Sans');
    expect(compiled.cssVariables['--talent-h1-size']).toBe('24pt');
    expect(compiled.cssVariables['--talent-accent-color']).toBe('#D4AF37');
    expect(compiled.cssVariables['--talent-body-color']).toBe('#1C242B');
  });

  it('unifies composeProjectPreview layout metrics with DocumentStyleMap (P7-T02)', () => {
    const mockProject: Partial<ProjectRecord> = {
      id: 'proj-preview-1',
      title: 'Libro de Prueba',
      cover: {
        id: 'cov-1',
        title: 'Libro de Prueba',
        subtitle: 'Subtítulo',
        palette: 'obsidian',
        backgroundImageUrl: null,
      },
      document: {
        id: 'doc-1',
        title: 'Libro de Prueba',
        subtitle: '',
        author: 'Autor Anclora',
        language: 'es',
        chapters: [
          {
            id: 'ch-1',
            order: 1,
            title: 'Capítulo 1',
            blocks: [
              { id: 'blk-1', type: 'paragraph', order: 1, content: 'Párrafo de prueba.' },
            ],
          },
        ],
        metadata: {
          title: 'Libro de Prueba',
          referenceEditorialProfile: mockRef as ReferenceEditorialProfile,
          userOverrides: [],
        },
      },
    };

    const composed = composeProjectPreview(mockProject as ProjectRecord, {
      pageWidth: 450,
      pageHeight: 650,
      marginTop: 48,
      marginBottom: 48,
      marginLeft: 42,
      marginRight: 42,
      fontSize: 11,
      lineHeight: 1.45,
    });

    expect(composed.pages.length).toBeGreaterThan(0);
    expect(composed.result).toBeDefined();
  });
});
