import { describe, expect, it } from 'vitest';
import {
  createDesignLayer,
  createEmptyDesignSurface,
  migrateLegacySurfaceState,
  resolveCoverText,
  type TextLayerProps,
} from './design-surface';
import { createDefaultSurfaceState, type SurfaceState } from './cover-surface';
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
      title: '',
      subtitle: '',
      author: '',
      language: 'es',
      chapters: [],
    },
    cover: {} as ProjectRecord['cover'],
    backCover: {} as ProjectRecord['backCover'],
    assets: [],
    ...overrides,
  } as ProjectRecord;
}

describe('createEmptyDesignSurface', () => {
  it('starts blank, draft, with the default canvas dimensions', () => {
    const surface = createEmptyDesignSurface('cover');
    expect(surface.version).toBe(2);
    expect(surface.layers).toEqual([]);
    expect(surface.width).toBe(400);
    expect(surface.height).toBe(600);
    expect(surface.status).toBe('draft');
    expect(surface.originMode).toBe('blank');
  });
});

describe('migrateLegacySurfaceState', () => {
  it('converts a v1 SurfaceState into role-tagged text layers with the same visibility/content', () => {
    const legacy = createDefaultSurfaceState('cover');
    legacy.fields.title = { value: 'El Plan de Escape de la Mediana Edad', visible: true, source: 'manual' };
    legacy.fields.subtitle = { value: 'Cómo desatascarte profesionalmente', visible: true, source: 'metadata' };
    legacy.fields.author = { value: 'Antonio Ballesteros Alonso', visible: true, source: 'metadata' };

    const surface = migrateLegacySurfaceState(legacy, 'cover', { palette: 'obsidian' });

    expect(surface.version).toBe(2);
    expect(surface.layers).toHaveLength(3);
    const title = surface.layers.find((l) => l.type === 'text' && l.role === 'title') as (typeof surface.layers)[number] & TextLayerProps;
    expect(title.content).toBe('El Plan de Escape de la Mediana Edad');
    expect(title.source).toBe('manual');
    expect(title.visible).toBe(true);
    // Top-left anchored now, converted from the legacy center-anchored geometry.
    expect(title.x).toBeLessThan(surface.width);
    expect(title.y).toBeGreaterThanOrEqual(0);
  });

  it('skips fields with no value (never invents a visible empty layer)', () => {
    const legacy = createDefaultSurfaceState('cover');
    legacy.fields.title = { value: '', visible: false };

    const surface = migrateLegacySurfaceState(legacy, 'cover', { palette: 'obsidian' });
    const title = surface.layers.find((l) => l.type === 'text' && l.role === 'title');
    expect(title?.visible).toBe(false);
  });

  it('uses the background image + opacity when the legacy design had one', () => {
    const legacy: SurfaceState = createDefaultSurfaceState('back-cover');
    const surface = migrateLegacySurfaceState(legacy, 'back-cover', {
      palette: 'teal',
      backgroundImageUrl: 'https://blob.example/bg.png',
      backgroundOpacity: 0.3,
    });

    expect(surface.background).toEqual({ kind: 'image', src: 'https://blob.example/bg.png', fit: 'cover', opacity: 0.3 });
  });

  it('falls back to a solid palette background with no image', () => {
    const surface = migrateLegacySurfaceState(null, 'cover', { palette: 'sand' });
    expect(surface.background).toEqual({ kind: 'solid', color: '#f2e3b3' });
  });
});

describe('createDesignLayer', () => {
  it('fills in sensible defaults for a free text layer', () => {
    const layer = createDesignLayer({ type: 'text' }, 1);
    expect(layer.type).toBe('text');
    expect(layer.zIndex).toBe(1);
    expect(layer.visible).toBe(true);
    expect(layer.locked).toBe(false);
    if (layer.type === 'text') {
      expect(layer.role).toBe('free');
      expect(layer.source).toBe('manual');
    }
  });

  it('fills in sensible defaults for an image layer', () => {
    const layer = createDesignLayer({ type: 'image', src: 'https://blob.example/a.png' }, 2);
    expect(layer.type).toBe('image');
    if (layer.type === 'image') {
      expect(layer.fit).toBe('cover');
      expect(layer.src).toBe('https://blob.example/a.png');
    }
  });
});

describe('resolveCoverText — metadata precedence (mission §40)', () => {
  it('the reported bug: an untouched "Mi proyecto" project title never wins over a confirmed document title', () => {
    const project = makeProject({
      title: 'Mi proyecto',
      document: {
        id: 'doc-1',
        title: 'El Plan de Escape de la Mediana Edad',
        subtitle: '',
        author: '',
        language: 'es',
        chapters: [],
      },
    });

    const resolved = resolveCoverText(project, 'title');
    expect(resolved.value).toBe('El Plan de Escape de la Mediana Edad');
    expect(resolved.source).toBe('document-field');
  });

  it('an existing manually-edited cover layer always wins, even over confirmed metadata', () => {
    const project = makeProject({
      document: {
        id: 'doc-1',
        title: 'El Plan de Escape de la Mediana Edad',
        subtitle: '',
        author: '',
        language: 'es',
        chapters: [],
      },
    });

    const resolved = resolveCoverText(project, 'title', { content: 'Título elegido a mano', source: 'manual' });
    expect(resolved.value).toBe('Título elegido a mano');
    expect(resolved.source).toBe('cover-manual');
  });

  it('confirmed document metadata outranks the plain document field', () => {
    const project = makeProject({
      document: {
        id: 'doc-1',
        title: 'Título provisional del documento',
        subtitle: '',
        author: '',
        language: 'es',
        chapters: [],
        metadata: { title: 'Título confirmado en metadatos' },
      },
    });

    const resolved = resolveCoverText(project, 'title');
    expect(resolved.value).toBe('Título confirmado en metadatos');
    expect(resolved.source).toBe('document-metadata');
  });

  it('a real, user-given project title is used when there is no document title at all', () => {
    const project = makeProject({ title: 'Guía definitiva del ahorro' });
    const resolved = resolveCoverText(project, 'title');
    expect(resolved.value).toBe('Guía definitiva del ahorro');
    expect(resolved.source).toBe('project-title');
  });

  it('falls back to a cleaned-up filename only as a last resort', () => {
    const project = makeProject({
      title: 'Mi proyecto',
      document: {
        id: 'doc-1',
        title: '',
        subtitle: '',
        author: '',
        language: 'es',
        chapters: [],
        source: { fileName: 'El_Plan_de_Escape_EBOOK.pdf', mimeType: 'application/pdf', importedAt: '2026-01-01T00:00:00Z' },
      },
    });

    const resolved = resolveCoverText(project, 'title');
    expect(resolved.value).toBe('El Plan de Escape EBOOK');
    expect(resolved.source).toBe('filename');
  });

  it('subtitle/author fields never fall back to project title or filename (title-only tiers)', () => {
    const project = makeProject({ title: 'Guía definitiva' });
    const resolved = resolveCoverText(project, 'subtitle');
    expect(resolved.value).toBe('');
    expect(resolved.source).toBe('none');
  });
});
