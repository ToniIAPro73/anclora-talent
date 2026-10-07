import { describe, expect, test } from 'vitest';
import { applyTemplateToSurface, buildDesignSurfaceFromTemplate } from './design-surface-templates';
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

  test('a slot hidden by the template design still gets its layer (hidden, never missing)', () => {
    const fictionCover = COVER_TEMPLATES.find((t) => t.id === 'fiction-cover')!;
    expect(fictionCover.visibility?.subtitle).toBe(false);
    const surface = buildDesignSurfaceFromTemplate(fictionCover, {
      palette: 'obsidian',
      binding: { title: 'La atención deliberada', subtitle: 'Un subtítulo real', author: 'María Vega' },
    });
    const subtitle = surface.layers.find((layer) => layer.type === 'text' && layer.role === 'subtitle');
    expect(subtitle).toMatchObject({ visible: false, content: 'Un subtítulo real' });
  });
});

const BINDING = { title: 'La atención deliberada', subtitle: 'Sistemas para pensar', author: 'María Vega' } as const;

function role(surface: ReturnType<typeof buildDesignSurfaceFromTemplate>, name: string) {
  return surface.layers.find((layer) => layer.type === 'text' && layer.role === name);
}

describe('template slots are bound to the manuscript', () => {
  test('every cover template materializes title, subtitle and author with the real content', () => {
    for (const template of COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian', binding: BINDING });
      expect(surface.layers.map((l) => l.type === 'text' && l.role), template.id).toEqual(['title', 'subtitle', 'author']);
      expect(role(surface, 'title')).toMatchObject({ content: BINDING.title, visible: true });
      expect(role(surface, 'subtitle')).toMatchObject({ content: BINDING.subtitle });
      expect(role(surface, 'author')).toMatchObject({ content: BINDING.author });
      expect(surface.templateId).toBe(template.id);
    }
  });

  test('every back-cover template materializes title, body and bio slots', () => {
    for (const template of BACK_COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, {
        palette: 'obsidian',
        binding: { title: 'T', body: 'Sinopsis', authorBio: 'Bio' },
      });
      expect(surface.layers.map((l) => l.type === 'text' && l.role), template.id).toEqual(['title', 'body', 'authorBio']);
      expect(role(surface, 'body')).toMatchObject({ content: 'Sinopsis' });
    }
  });

  test('an empty manuscript field keeps an (invisible) layer instead of dropping it', () => {
    const surface = buildDesignSurfaceFromTemplate(COVER_TEMPLATES[0], { palette: 'obsidian', binding: { title: 'Solo título' } });
    expect(surface.layers).toHaveLength(3);
    expect(role(surface, 'subtitle')).toMatchObject({ content: '', visible: false });
    expect(role(surface, 'author')).toMatchObject({ content: '', visible: false });
  });

  test('a surface built with no binding at all is still a complete (never blank-by-pruning) composition', () => {
    for (const template of COVER_TEMPLATES) {
      expect(buildDesignSurfaceFromTemplate(template, { palette: 'obsidian' }).layers).toHaveLength(3);
    }
  });
});

describe('cover override beats the manuscript value', () => {
  const [templateA, templateB, templateC] = COVER_TEMPLATES;

  test('a manual cover title survives applying another template; the others follow the manuscript', () => {
    const first = buildDesignSurfaceFromTemplate(templateA, { palette: 'obsidian', binding: BINDING });
    const edited = {
      ...first,
      layers: first.layers.map((l) => (l.type === 'text' && l.role === 'title' ? { ...l, content: 'Título de portada', source: 'manual' as const } : l)),
    };

    const second = applyTemplateToSurface(edited, templateB, { binding: { ...BINDING, title: 'Nuevo título del documento' } });
    expect(role(second, 'title')).toMatchObject({ content: 'Título de portada', source: 'manual' });
    expect(role(second, 'subtitle')).toMatchObject({ content: BINDING.subtitle, source: 'metadata' });
  });

  test('metadata-sourced content is refreshed from the manuscript on template change', () => {
    const first = buildDesignSurfaceFromTemplate(templateA, { palette: 'obsidian', binding: BINDING });
    const second = applyTemplateToSurface(first, templateB, { binding: { ...BINDING, title: 'Título renombrado' } });
    expect(role(second, 'title')).toMatchObject({ content: 'Título renombrado', source: 'metadata' });
  });

  test('A -> B -> C keeps content and role layer ids, only layout/style change', () => {
    const a = buildDesignSurfaceFromTemplate(templateA, { palette: 'obsidian', binding: BINDING });
    const b = applyTemplateToSurface(a, templateB, { binding: BINDING });
    const c = applyTemplateToSurface(b, templateC, { binding: BINDING });

    for (const name of ['title', 'subtitle', 'author']) {
      expect(role(b, name)!.id).toBe(role(a, name)!.id); // stable identity across templates
      expect(role(c, name)!.id).toBe(role(a, name)!.id);
      expect((role(c, name) as { content: string }).content).toBe((role(a, name) as { content: string }).content);
    }
    expect([b.templateId, c.templateId]).toEqual([templateB.id, templateC.id]);
  });

  test('guides and safe area survive a template change', () => {
    const current = { ...buildDesignSurfaceFromTemplate(templateA, { palette: 'obsidian' }), guides: [{ id: 'g', axis: 'x' as const, position: 100 }] };
    expect(applyTemplateToSurface(current, templateB).guides).toEqual(current.guides);
  });
});

describe('template change keeps the user background image', () => {
  it('an image background (and its framing) survives applying another template; colour backgrounds follow the template', () => {
    const [templateA, templateB] = COVER_TEMPLATES;
    const first = buildDesignSurfaceFromTemplate(templateA, { palette: 'obsidian', binding: BINDING });
    const withImage = {
      ...first,
      background: { kind: 'image' as const, src: 'https://example.com/bg.jpg', fit: 'cover' as const, opacity: 1, frame: { x: -80, y: 24, width: 600, height: 900, rotation: 0 } },
    };
    expect(applyTemplateToSurface(withImage, templateB, { binding: BINDING }).background).toEqual(withImage.background);
    expect(applyTemplateToSurface(first, templateB, { binding: BINDING }).background.kind).toBe('solid');
  });
});
