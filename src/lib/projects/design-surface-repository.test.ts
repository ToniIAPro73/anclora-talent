import { describe, expect, it } from 'vitest';
import { buildSemanticBinding, getBackCoverDesign, getCoverDesign } from './design-surface-repository';
import { createEmptyDesignSurface, createDesignLayer, type TextLayerProps } from './design-surface';
import { createDefaultSurfaceState } from './cover-surface';
import type { ProjectRecord } from './types';

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'proyecto-1',
    title: 'Mi proyecto',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      id: 'doc-1',
      title: 'El Plan de Escape de la Mediana Edad',
      subtitle: '',
      author: 'Antonio Ballesteros Alonso',
      language: 'es',
      chapters: [],
    },
    cover: { id: 'cov-1', title: '', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null },
    backCover: { id: 'bc-1', title: '', body: '', authorBio: '', accentColor: null, backgroundImageUrl: null, renderedImageUrl: null },
    assets: [],
    ...overrides,
  } as ProjectRecord;
}

function titleLayer(surface: ReturnType<typeof getCoverDesign>) {
  return surface.layers.find((l): l is typeof l & TextLayerProps => l.type === 'text' && l.role === 'title');
}

describe('getCoverDesign', () => {
  it('a project with no cover design yet gets an empty v2 surface, then metadata hydration fills in the title', () => {
    const project = makeProject();
    const surface = getCoverDesign(project);

    expect(surface.version).toBe(2);
    // createEmptyDesignSurface starts with zero layers — metadata hydration
    // only refreshes EXISTING role-tagged layers, it never invents new ones.
    // A brand-new project therefore stays layer-less until a template/basic
    // editor action seeds the title/subtitle/author layers (Fase E).
    expect(surface.layers).toEqual([]);
  });

  it('migrates a legacy v1 SurfaceState and hydrates the title from confirmed document metadata, never "Mi proyecto"', () => {
    const legacy = createDefaultSurfaceState('cover');
    legacy.fields.title = { value: '', visible: false };
    const project = makeProject({
      cover: { id: 'cov-1', title: '', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null, surfaceState: legacy },
    });

    const surface = getCoverDesign(project);
    const title = titleLayer(surface);
    expect(title?.content).toBe('El Plan de Escape de la Mediana Edad');
    expect(title?.visible).toBe(true);
    expect(title?.content).not.toBe('Mi proyecto');
  });

  it('never overwrites a manually-edited title layer, even when metadata changes', () => {
    const v2 = createEmptyDesignSurface('cover');
    v2.layers = [
      createDesignLayer(
        { type: 'text', role: 'title', source: 'manual', content: 'Título elegido a mano' },
        1,
      ),
    ];
    const project = makeProject({
      cover: { id: 'cov-1', title: '', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null, surfaceState: v2 },
    });

    const surface = getCoverDesign(project);
    expect(titleLayer(surface)?.content).toBe('Título elegido a mano');
  });

  it('refreshes a metadata-sourced title layer when the document title changes', () => {
    const v2 = createEmptyDesignSurface('cover');
    v2.layers = [
      createDesignLayer({ type: 'text', role: 'title', source: 'metadata', content: 'Título antiguo' }, 1),
    ];
    const project = makeProject({
      document: { id: 'doc-1', title: 'Título nuevo confirmado', subtitle: '', author: '', language: 'es', chapters: [] },
      cover: { id: 'cov-1', title: '', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null, surfaceState: v2 },
    });

    const surface = getCoverDesign(project);
    expect(titleLayer(surface)?.content).toBe('Título nuevo confirmado');
  });

  it('passes an already-v2 surface through unchanged in shape (only content/visibility hydration applies)', () => {
    const v2 = createEmptyDesignSurface('cover');
    v2.background = { kind: 'solid', color: '#123456' };
    const project = makeProject({
      cover: { id: 'cov-1', title: '', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null, surfaceState: v2 },
    });

    const surface = getCoverDesign(project);
    expect(surface.background).toEqual({ kind: 'solid', color: '#123456' });
  });
});

describe('getBackCoverDesign', () => {
  it('migrates a legacy back-cover state independently of the cover', () => {
    const project = makeProject({
      backCover: {
        id: 'bc-1',
        title: '',
        body: '',
        authorBio: '',
        accentColor: null,
        backgroundImageUrl: null,
        renderedImageUrl: null,
        surfaceState: createDefaultSurfaceState('back-cover'),
      },
    });

    const surface = getBackCoverDesign(project);
    expect(surface.version).toBe(2);
    expect(surface.surface).toBe('back-cover');
  });
});

describe('getCoverDesign keeps user positions', () => {
  it('metadata hydration refreshes content/visibility but never repositions a moved layer', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [
      createDesignLayer({ type: 'text', role: 'title', source: 'metadata', content: 'viejo', x: -70, y: 100, width: 352, height: 76 }, 1),
      createDesignLayer({ type: 'text', role: 'subtitle', source: 'metadata', content: 'viejo', x: 82, y: 262, width: 328, height: 32 }, 2),
      createDesignLayer({ type: 'text', role: 'author', source: 'metadata', content: '', x: 5, y: 580, width: 328, height: 23 }, 3),
    ];
    const project = makeProject({ cover: { id: 'cov-1', title: '', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null, surfaceState: surface } as never });

    const hydrated = getCoverDesign(project);
    const at = (role: string) => hydrated.layers.find((l) => l.type === 'text' && l.role === role);

    expect(at('title')).toMatchObject({ x: -70, y: 100 });
    expect(at('subtitle')).toMatchObject({ x: 82, y: 262 });
    expect(at('author')).toMatchObject({ x: 5, y: 580 });
    expect(titleLayer(hydrated)?.content).toBe('El Plan de Escape de la Mediana Edad'); // content still hydrated
  });

  it('x/y survive JSON serialization (what save/reload does) with sub-pixel precision', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [createDesignLayer({ type: 'text', content: 'x', x: -30.99615912240978, y: 143.36 }, 1)];
    const roundTripped = JSON.parse(JSON.stringify(surface));
    expect(roundTripped.layers[0]).toMatchObject({ x: -30.99615912240978, y: 143.36 });
  });
});

describe('buildSemanticBinding', () => {
  it('cover: title/subtitle/author come from the same precedence chain as hydration', () => {
    const project = makeProject({
      document: { ...makeProject().document, title: 'Doc', subtitle: 'Sub del documento', author: 'Autora Real', metadata: { title: 'Título confirmado' } } as never,
    });
    expect(buildSemanticBinding(project, 'cover')).toEqual({
      title: 'Título confirmado',
      subtitle: 'Sub del documento',
      author: 'Autora Real',
    });
  });

  it('never surfaces the provisional "Mi proyecto" title', () => {
    const project = makeProject({ title: 'Mi proyecto', document: { ...makeProject().document, title: '' } as never });
    expect(buildSemanticBinding(project, 'cover').title).toBe('');
  });

  it('back cover: title plus the back-cover body and author bio', () => {
    const project = makeProject({
      backCover: { id: 'bc', title: '', body: ' Sinopsis ', authorBio: 'Bio del autor', accentColor: null, backgroundImageUrl: null, renderedImageUrl: null } as never,
    });
    expect(buildSemanticBinding(project, 'back-cover')).toMatchObject({ body: 'Sinopsis', authorBio: 'Bio del autor' });
  });
});

describe('hydration visibility', () => {
  it('a slot hidden on purpose stays hidden when the manuscript has content; an empty slot that gains content shows', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [
      createDesignLayer({ type: 'text', role: 'subtitle', source: 'metadata', content: 'ya tenía texto', visible: false }, 1),
      createDesignLayer({ type: 'text', role: 'author', source: 'metadata', content: '', visible: false }, 2),
    ];
    const project = makeProject({
      document: { ...makeProject().document, subtitle: 'Sub', author: 'Autor' } as never,
      cover: { id: 'c', title: '', subtitle: '', palette: 'obsidian', backgroundImageUrl: null, thumbnailUrl: null, surfaceState: surface } as never,
    });
    const hydrated = getCoverDesign(project);
    const find = (r: string) => hydrated.layers.find((l) => l.type === 'text' && l.role === r);
    expect(find('subtitle')).toMatchObject({ content: 'Sub', visible: false });
    expect(find('author')).toMatchObject({ content: 'Autor', visible: true });
  });
});
