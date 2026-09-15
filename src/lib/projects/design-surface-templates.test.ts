import { describe, expect, test } from 'vitest';
import { buildDesignSurfaceFromTemplate } from './design-surface-templates';
import { COVER_TEMPLATES, BACK_COVER_TEMPLATES } from './cover-templates';

describe('buildDesignSurfaceFromTemplate', () => {
  test('every cover template produces at least a title layer, positioned inside the canvas', () => {
    for (const template of COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian' });
      const title = surface.layers.find((layer) => layer.type === 'text' && layer.role === 'title');
      expect(title, `template ${template.id} has no title layer`).toBeTruthy();
      expect(title!.x).toBeGreaterThanOrEqual(0);
      expect(title!.y).toBeGreaterThanOrEqual(0);
      expect(title!.x + title!.width).toBeLessThanOrEqual(surface.width);
    }
  });

  test('different layout kinds produce genuinely different title positions (the reported bug: templates only changed typography before)', () => {
    const stackedCenter = COVER_TEMPLATES.find((t) => t.layout.kind === 'stacked-center')!;
    const imageDominant = COVER_TEMPLATES.find((t) => t.layout.kind === 'image-dominant')!;
    const statementBold = COVER_TEMPLATES.find((t) => t.layout.kind === 'statement-bold')!;

    const centered = buildDesignSurfaceFromTemplate(stackedCenter, { palette: 'obsidian' });
    const dominant = buildDesignSurfaceFromTemplate(imageDominant, { palette: 'obsidian' });
    const statement = buildDesignSurfaceFromTemplate(statementBold, { palette: 'obsidian' });

    const centeredTitleY = centered.layers.find((l) => l.type === 'text' && l.role === 'title')!.y;
    const dominantTitleY = dominant.layers.find((l) => l.type === 'text' && l.role === 'title')!.y;
    const statementTitleY = statement.layers.find((l) => l.type === 'text' && l.role === 'title')!.y;

    // image-dominant pushes text to the bottom third; statement-bold (top
    // archetype) keeps it near the top; centered sits in between.
    expect(dominantTitleY).toBeGreaterThan(centeredTitleY);
    expect(statementTitleY).toBeLessThan(centeredTitleY);
  });

  test('every back-cover template produces a body layer, and a title layer unless the template explicitly hides it', () => {
    for (const template of BACK_COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian' });
      const title = surface.layers.find((layer) => layer.type === 'text' && layer.role === 'title');
      const body = surface.layers.find((layer) => layer.type === 'text' && layer.role === 'body');
      if (template.visibility?.title !== false) {
        expect(title, `template ${template.id} has no title layer`).toBeTruthy();
      }
      expect(body, `template ${template.id} has no body layer`).toBeTruthy();
    }
  });

  test('background uses the palette color', () => {
    const surface = buildDesignSurfaceFromTemplate(COVER_TEMPLATES[0], { palette: 'sand' });
    expect(surface.background).toEqual({ kind: 'solid', color: '#f2e3b3' });
  });

  test('a field hidden by the template visibility map never gets a layer', () => {
    const fictionCover = COVER_TEMPLATES.find((t) => t.id === 'fiction-cover')!;
    expect(fictionCover.visibility?.subtitle).toBe(false);
    const surface = buildDesignSurfaceFromTemplate(fictionCover, { palette: 'obsidian' });
    expect(surface.layers.some((layer) => layer.type === 'text' && layer.role === 'subtitle')).toBe(false);
  });
});
