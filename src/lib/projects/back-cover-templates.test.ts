import { describe, expect, it } from 'vitest';
import { BACK_COVER_TEMPLATES, COVER_TEMPLATES, DEFAULT_BACK_COVER_TEMPLATE_ID, LEGACY_BACK_TEMPLATE_IDS, normalizeBackTemplateId } from './cover-templates';
import { BACK_ISBN_RESERVED, BACK_LAYOUTS } from './back-cover-layouts';
import { applyTemplateToSurface, buildDesignSurfaceFromTemplate } from './design-surface-templates';
import { createEmptyDesignSurface } from './design-surface';
import { buildSemanticBinding, getBackCoverDesign, getCoverDesign } from './design-surface-repository';
import { createDefaultSurfaceState } from './cover-surface';
import { getSelectableFontCatalog } from '@/lib/style-engine/font-registry';
import type { ProjectRecord } from './types';

const BINDING = { title: 'La atención deliberada', author: 'María Vega', body: 'Sinopsis real del libro.', authorBio: 'Biografía real de la autora.' };
const textOf = (surface: ReturnType<typeof buildDesignSurfaceFromTemplate>, role: string) => surface.layers.find((l) => l.type === 'text' && l.role === role);

describe('back-cover template registry', () => {
  it('has at least six namespaced templates that are not the front-cover ones', () => {
    expect(BACK_COVER_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    const frontIds = new Set(COVER_TEMPLATES.map((t) => t.id));
    for (const template of BACK_COVER_TEMPLATES) {
      expect(template.surface).toBe('back-cover');
      expect(template.id.startsWith('back-')).toBe(true);
      expect(frontIds.has(template.id)).toBe(false);
    }
    expect(new Set(BACK_COVER_TEMPLATES.map((t) => t.id)).size).toBe(BACK_COVER_TEMPLATES.length);
    expect(COVER_TEMPLATES.every((t) => t.surface === 'cover')).toBe(true);
    expect(BACK_COVER_TEMPLATES.map((t) => t.name)).toEqual(expect.arrayContaining(['Clásica editorial', 'Autor destacado', 'Ensayo premium', 'Negocio / liderazgo', 'Ficción literaria', 'Minimal']));
  });

  it('every template has its own layout (no two share the same composition) and every layout exists', () => {
    const signatures = BACK_COVER_TEMPLATES.map((template) => {
      const layout = BACK_LAYOUTS[template.layout.kind];
      expect(layout, template.id).toBeTruthy();
      return JSON.stringify(layout);
    });
    expect(new Set(signatures).size).toBe(BACK_COVER_TEMPLATES.length);
  });

  it('uses only fonts from the canonical registry', () => {
    const families = new Set(getSelectableFontCatalog().map((font) => font.family));
    for (const template of BACK_COVER_TEMPLATES) {
      for (const style of Object.values(template.layerStyles ?? {})) {
        expect(families.has(style.fontFamily as string), `${template.id}: ${style.fontFamily}`).toBe(true);
      }
    }
  });

  it('default template is part of the catalogue and legacy ids map into it', () => {
    expect(BACK_COVER_TEMPLATES.some((t) => t.id === DEFAULT_BACK_COVER_TEMPLATE_ID)).toBe(true);
    for (const target of Object.values(LEGACY_BACK_TEMPLATE_IDS)) expect(BACK_COVER_TEMPLATES.some((t) => t.id === target)).toBe(true);
    expect(normalizeBackTemplateId('essay-premium-back')).toBe('back-essay-premium');
    expect(normalizeBackTemplateId('back-business')).toBe('back-business');
    expect(normalizeBackTemplateId(undefined)).toBeNull();
  });
});

describe('back-cover materialization', () => {
  it('every template creates every semantic slot with the real content and its own template id', () => {
    for (const template of BACK_COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian', binding: BINDING });
      expect(surface.surface).toBe('back-cover');
      expect(surface.templateId).toBe(template.id);
      expect(textOf(surface, 'body')).toMatchObject({ content: BINDING.body, visible: true });
      expect(textOf(surface, 'author')).toMatchObject({ content: BINDING.author });
      expect(textOf(surface, 'authorBio')).toMatchObject({ content: BINDING.authorBio, visible: true });
      expect(textOf(surface, 'title')).toMatchObject({ content: BINDING.title, visible: template.visibility?.title !== false });
    }
  });

  it('switching templates keeps content and the role layer ids, and changes the layout', () => {
    const [a, b, c] = BACK_COVER_TEMPLATES;
    const first = buildDesignSurfaceFromTemplate(a, { palette: 'obsidian', binding: BINDING });
    const second = applyTemplateToSurface(first, b, { binding: BINDING });
    const third = applyTemplateToSurface(second, c, { binding: BINDING });
    for (const role of ['title', 'body', 'author', 'authorBio']) {
      expect(textOf(second, role)!.id).toBe(textOf(first, role)!.id);
      expect(textOf(third, role)!.id).toBe(textOf(first, role)!.id);
      expect((textOf(third, role) as { content: string }).content).toBe((textOf(first, role) as { content: string }).content);
    }
    expect(textOf(second, 'body')!.y).not.toBe(textOf(first, 'body')!.y === textOf(second, 'body')!.y ? -1 : textOf(first, 'body')!.y);
    const geometry = (surface: typeof first) => JSON.stringify(surface.layers.map((l) => [l.type, l.x, l.y, l.width, l.height]));
    expect(new Set([geometry(first), geometry(second), geometry(third)]).size).toBe(3);
    // a manual override survives a switch
    const edited = { ...first, layers: first.layers.map((l) => (l.type === 'text' && l.role === 'body' ? { ...l, content: 'Sinopsis propia', source: 'manual' as const } : l)) };
    expect((textOf(applyTemplateToSurface(edited, c, { binding: BINDING }), 'body') as { content: string }).content).toBe('Sinopsis propia');
  });

  it('empty bio and author are hidden slots, never visible empty blocks; the slots still exist', () => {
    for (const template of BACK_COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian', binding: { title: 'T', body: 'Sinopsis' } });
      expect(textOf(surface, 'authorBio')).toMatchObject({ content: '', visible: false });
      expect(textOf(surface, 'author')).toMatchObject({ content: '', visible: false });
    }
  });

  it('keeps every text slot inside the safe area and the body readable', () => {
    for (const template of BACK_COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian', binding: BINDING });
      for (const layer of surface.layers) {
        if (layer.type !== 'text') continue;
        expect(layer.x, `${template.id} ${layer.role} left`).toBeGreaterThanOrEqual(28);
        expect(layer.x + layer.width, `${template.id} ${layer.role} right`).toBeLessThanOrEqual(372);
        expect(layer.y, `${template.id} ${layer.role} top`).toBeGreaterThanOrEqual(28);
        expect(layer.y, `${template.id} ${layer.role} bottom`).toBeLessThanOrEqual(540);
        if (layer.role === 'body') {
          expect(layer.fontSize).toBeGreaterThanOrEqual(14);
          expect(layer.lineHeight).toBeGreaterThanOrEqual(1.45);
          expect(layer.width).toBeGreaterThanOrEqual(296);
        }
        if (layer.role === 'title') expect(layer.fontSize).toBeLessThanOrEqual(26); // a reference, not a hero title
      }
    }
  });

  it('left-aligned layouts keep the bottom-right corner free for a future ISBN block (nothing is rendered there)', () => {
    for (const template of BACK_COVER_TEMPLATES.filter((t) => ['classic-editorial', 'author-focus', 'essay-premium', 'business-band', 'guide-structured'].includes(t.layout.kind))) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian', binding: BINDING });
      for (const layer of surface.layers.filter((l) => l.type === 'text')) {
        const overlaps = layer.x < BACK_ISBN_RESERVED.x + BACK_ISBN_RESERVED.width && layer.x + layer.width > BACK_ISBN_RESERVED.x && layer.y + 14 > BACK_ISBN_RESERVED.y && layer.y < BACK_ISBN_RESERVED.y + BACK_ISBN_RESERVED.height;
        expect(overlaps, `${template.id} ${layer.type === 'text' ? layer.role : ''}`).toBe(false);
      }
      expect(surface.isbnArea).toBeUndefined();
    }
  });

  it('decoration is lowest in the stack and uses editable shape layers', () => {
    for (const template of BACK_COVER_TEMPLATES) {
      const surface = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian', binding: BINDING });
      const shapes = surface.layers.filter((l) => l.type === 'shape');
      const firstText = Math.min(...surface.layers.filter((l) => l.type === 'text').map((l) => l.zIndex));
      for (const shape of shapes) expect(shape.zIndex).toBeLessThan(firstText);
    }
  });
});

function makeProject(overrides: Partial<ProjectRecord['backCover']> = {}, surfaceState: unknown = createDefaultSurfaceState('back-cover')): ProjectRecord {
  return {
    id: 'p',
    title: 'La atención deliberada',
    document: { title: 'La atención deliberada', author: 'María Vega', metadata: { title: 'La atención deliberada', author: 'María Vega' }, chapters: [] },
    cover: { palette: 'obsidian', title: 'La atención deliberada', surfaceState: null },
    backCover: { title: '', body: 'Sinopsis real del libro.', authorBio: '', accentColor: null, backgroundImageUrl: null, surfaceState, ...overrides },
  } as unknown as ProjectRecord;
}

describe('first open and isolation', () => {
  it('an untouched back cover opens on the default template with real content and deterministic ids', () => {
    const first = getBackCoverDesign(makeProject());
    const second = getBackCoverDesign(makeProject());
    expect(first.templateId).toBe(DEFAULT_BACK_COVER_TEMPLATE_ID);
    expect(first.layers.map((l) => l.id)).toEqual(second.layers.map((l) => l.id)); // server and client render the same layers
    expect(textOf(first, 'body')).toMatchObject({ content: 'Sinopsis real del libro.' });
    expect(textOf(first, 'author')).toMatchObject({ content: 'María Vega' });
    expect(textOf(first, 'authorBio')).toMatchObject({ content: '', visible: false }); // no bio: no empty block
  });

  it('a stored design is never replaced by the default; old template ids move to the new namespace', () => {
    const stored = { ...createEmptyDesignSurface('back-cover'), templateId: 'essay-premium-back' };
    const design = getBackCoverDesign(makeProject({}, stored));
    expect(design.templateId).toBe('back-essay-premium');
    expect(design.layers).toHaveLength(0);
    expect(getBackCoverDesign(makeProject({}, { ...createEmptyDesignSurface('back-cover'), templateId: null })).templateId ?? null).toBeNull();
  });

  it('front and back designs are separate surfaces with separate template ids', () => {
    const project = makeProject();
    const back = getBackCoverDesign(project);
    const front = getCoverDesign(project);
    expect(back.surface).toBe('back-cover');
    expect(front.surface).toBe('cover');
    expect(front.templateId ?? null).toBeNull();
    expect(back.templateId).not.toBe(front.templateId);
  });

  it('the back-cover binding carries title, author, body and bio from the project', () => {
    expect(buildSemanticBinding(makeProject({ authorBio: 'Bio' }), 'back-cover')).toEqual({ title: 'La atención deliberada', author: 'María Vega', body: 'Sinopsis real del libro.', authorBio: 'Bio' });
  });
});
