import { describe, expect, test } from 'vitest';
import { resolveDocumentStyles, SYSTEM_DEFAULTS } from './cascade-resolver';
import { compileDocument } from './document-compiler';
import { createProjectRecord } from '@/lib/projects/factories';

describe('Phase 10: Backward Compatibility & Legacy Project Hydration', () => {
  test('P10-T01: Falls back cleanly to SYSTEM_DEFAULTS when no profiles exist', () => {
    const styleMap = resolveDocumentStyles({});

    expect(styleMap).toBeDefined();
    expect(styleMap.body.fontFamily).toBe(SYSTEM_DEFAULTS.body.fontFamily);
    expect(styleMap.body.fontSizePt).toBe(SYSTEM_DEFAULTS.body.fontSizePt);
    expect(styleMap.headings.h1.fontSizePt).toBe(SYSTEM_DEFAULTS.h1.fontSizePt);
    expect(styleMap.page.marginsPt.top).toBe(SYSTEM_DEFAULTS.page.marginsPt.top);
    expect(styleMap.palette.paper).toBe(SYSTEM_DEFAULTS.palette.paper);
    expect(styleMap.palette.accent).toBe(SYSTEM_DEFAULTS.palette.accent);
  });

  test('P10-T01: Hydrates legacy composition settings when reference profile is missing', () => {
    const legacyComposition = {
      fontFamily: 'Crimson Text',
      lineHeight: 1.6,
      margins: { top: 40, bottom: 40, left: 45, right: 45 },
      displayFontFamily: 'Playfair Display',
      headingColor: '#8B0000',
    };

    const styleMap = resolveDocumentStyles({
      composition: legacyComposition,
    });

    expect(styleMap.body.fontFamily).toBe('Crimson Text');
    expect(styleMap.body.lineHeight).toBe(1.6);
    expect(styleMap.headings.h1.fontFamily).toBe('Playfair Display');
    expect(styleMap.headings.h1.color).toBe('#8B0000');
    expect(styleMap.page.marginsPt.left).toBe(45);
  });

  test('P10-T01: Compiles complete CompiledDocument for a legacy project record', () => {
    const legacyProject = createProjectRecord('legacy-user-1', { title: 'Legacy Book' });
    // Simulate legacy project lacking metadata
    delete legacyProject.document.metadata;

    const compiled = compileDocument({
      projectId: legacyProject.id,
      semanticDoc: {
        version: 1,
        title: legacyProject.document.title,
        blocks: [],
      },
      referenceProfile: null,
      brandProfile: null,
    });

    expect(compiled).toBeDefined();
    expect(compiled.styleMap).toBeDefined();
    expect(compiled.cssVariables['--talent-body-font']).toBeDefined();
    expect(compiled.cssVariables['--talent-body-size']).toBeDefined();
    expect(compiled.bindings.overridesCount).toBe(0);
  });
});
