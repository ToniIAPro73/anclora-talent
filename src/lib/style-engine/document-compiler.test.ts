import { describe, expect, it } from 'vitest';
import { compileDocument, generateCssVariables } from './document-compiler';
import { resolveDocumentStyles } from './cascade-resolver';
import type { SemanticDocument } from '@/lib/document/model';
import type { ReferenceEditorialProfile } from '@/lib/reference-editorial-profile/model';
import type { BrandProfile } from '@/lib/brand/brand-profile';

describe('Phase 5 — Document Style Compiler & CSS Variable Generator (P5-T01)', () => {
  const sampleDoc: SemanticDocument = {
    version: 1,
    schemaVersion: 1,
    metadata: {
      title: 'El Test Editorial',
      author: 'Anclora Author',
    },
    blocks: [
      {
        id: 'block-1',
        type: 'heading',
        level: 1,
        content: [{ type: 'text', text: 'Capítulo 1' }],
      },
      {
        id: 'block-2',
        type: 'paragraph',
        content: [{ type: 'text', text: 'Este es el texto del capítulo con estilo de referencia.' }],
      },
    ],
  };

  it('generates a complete dictionary of CSS custom properties', () => {
    const styleMap = resolveDocumentStyles({});
    const cssVars = generateCssVariables(styleMap);

    expect(cssVars['--talent-body-font']).toBeDefined();
    expect(cssVars['--talent-body-size']).toBe('11pt');
    expect(cssVars['--talent-h1-size']).toBe('22pt');
    expect(cssVars['--talent-accent-color']).toBeDefined();
    expect(cssVars['--talent-page-width']).toBe('432pt');
  });

  it('compiles document in under 20ms meeting the performance criterion', () => {
    const start = performance.now();
    const compiled = compileDocument({
      projectId: 'proj-123',
      document: sampleDoc,
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(20);
    expect(compiled.version).toBe(1);
    expect(compiled.projectId).toBe('proj-123');
    expect(compiled.document.blocks).toHaveLength(2);
    expect(compiled.cssVariables['--talent-body-font']).toBeDefined();
    expect(compiled.styleMap.body.fontSizePt).toBe(11);
  });

  it('tracks bindings and metadata for reference and brand profiles', () => {
    const mockRef: Partial<ReferenceEditorialProfile> = {
      source: {
        sourceAssetId: 'asset-ref-1',
        filename: 'reference.docx',
        hash: 'hash-abc-123',
        format: 'docx',
        analysedAt: new Date().toISOString(),
        parserVersion: 'v1',
      },
      body: {
        fontFamily: 'Noto Serif',
        resolvedFontFamily: 'Noto Serif',
        fontSize: 10,
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#111',
        lineHeight: 1.4,
        textAlign: 'justify',
        firstLineIndent: 10,
        paragraphSpacingBefore: 0,
        paragraphSpacingAfter: 4,
      },
      headings: { h1: null, h2: null, h3: null, h4: null },
    };

    const mockBrand: Partial<BrandProfile> = {
      id: 'brand-999',
      name: 'Test Brand',
      palette: [
        { name: 'Ink', hex: '#1C242B', role: 'ink', usagePercent: 55, confidence: 'high' },
      ],
      typography: { display: null, body: null },
    };

    const compiled = compileDocument({
      projectId: 'proj-456',
      semanticDoc: sampleDoc,
      referenceProfile: mockRef as ReferenceEditorialProfile,
      brandProfile: mockBrand as BrandProfile,
      userOverrides: [
        {
          scope: 'role',
          targetRole: 'h1',
          styles: { fontSizePt: 28 },
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(compiled.bindings.referenceProfileId).toBe('asset-ref-1');
    expect(compiled.bindings.referenceSourceHash).toBe('hash-abc-123');
    expect(compiled.bindings.brandProfileId).toBe('brand-999');
    expect(compiled.bindings.overridesCount).toBe(1);
    expect(compiled.styleMap.headings.h1.fontSizePt).toBe(28);
    expect(compiled.cssVariables['--talent-h1-size']).toBe('28pt');
  });
});
