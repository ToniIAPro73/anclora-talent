import { describe, expect, it } from 'vitest';
import { buildInitialSurfaceLayers, createSurfaceSnapshotFromProject } from './surface-snapshot';

function makeSurfaceProject(input: unknown) {
  return input as Parameters<typeof createSurfaceSnapshotFromProject>[1];
}

describe('advanced-surface-utils', () => {
  it('builds editable layers for both cover and back cover from the same engine', () => {
    const coverLayers = buildInitialSurfaceLayers('cover', {
      title: { value: 'Titulo', visible: true },
      subtitle: { value: 'Sub', visible: true },
    });
    const backLayers = buildInitialSurfaceLayers('back-cover', {
      title: { value: 'Contra', visible: true },
      body: { value: 'Texto', visible: true },
    });

    expect(coverLayers.some((layer) => layer.fieldKey === 'title')).toBe(true);
    expect(backLayers.some((layer) => layer.fieldKey === 'body')).toBe(true);
  });

  it('creates a back-cover surface snapshot from the same shared model contract', () => {
    const snapshot = createSurfaceSnapshotFromProject('back-cover', makeSurfaceProject({
      document: { author: 'Autor demo', title: 'Libro' },
      cover: { title: 'Portada', subtitle: 'Sub', surfaceState: undefined },
      backCover: {
        title: 'Contra',
        body: 'Texto de contra',
        authorBio: 'Bio',
        surfaceState: undefined,
      },
    }));

    expect(snapshot.surface).toBe('back-cover');
    expect(snapshot.fields.body?.value).toBe('Texto de contra');
    expect(snapshot.fields.authorBio?.value).toBe('Bio');
  });

  it('treats divergent persisted back-cover surface values as manual layer overrides (D.3)', () => {
    const snapshot = createSurfaceSnapshotFromProject('back-cover', makeSurfaceProject({
      document: { author: 'Antonio', title: 'Libro', subtitle: 'Resumen documento' },
      cover: { title: 'Portada', subtitle: 'Sub', surfaceState: undefined },
      backCover: {
        title: 'Antonio',
        body: 'Texto sincronizado',
        authorBio: 'Bio sincronizada',
        surfaceState: {
          surface: 'back-cover',
          layout: { kind: 'stacked-center' },
          fields: {
            title: { value: 'Autor viejo', visible: true },
            body: { value: 'Texto viejo', visible: true },
            authorBio: { value: 'Bio vieja', visible: true },
          },
          layers: [],
          opacity: 0.24,
        },
      },
    }));

    expect(snapshot.fields.title?.value).toBe('Autor viejo');
    expect(snapshot.fields.body?.value).toBe('Texto viejo');
    expect(snapshot.fields.authorBio?.value).toBe('Bio sincronizada');
  });

  it('rebuilds visible cover layers when a persisted surface state contains an empty layers array', () => {
    const snapshot = createSurfaceSnapshotFromProject('cover', makeSurfaceProject({
      document: { author: 'Toni', title: 'Libro' },
      cover: {
        title: 'Nunca mas en la sombra',
        subtitle: '',
        surfaceState: {
          surface: 'cover',
          layout: { kind: 'stacked-center' },
          fields: {
            title: { value: 'Nunca mas en la sombra', visible: true },
            subtitle: { value: '', visible: false },
            author: { value: 'Toni', visible: true },
          },
          layers: [],
          opacity: 0.47,
        },
      },
      backCover: {
        title: 'Contra',
        body: 'Texto de contra',
        authorBio: 'Bio',
        surfaceState: undefined,
      },
    }));

    expect(snapshot.layers?.some((layer) => layer.fieldKey === 'title')).toBe(true);
    expect(snapshot.layers?.some((layer) => layer.fieldKey === 'author')).toBe(true);
  });

  it('keeps a divergent persisted surface title as a manual override and syncs the author (D.3)', () => {
    const snapshot = createSurfaceSnapshotFromProject('cover', makeSurfaceProject({
      document: { author: 'Toni', title: 'Titulo documento' },
      cover: {
        title: 'NUNCA MAS EN LA SOMBRA',
        subtitle: 'Subtitulo cover viejo',
        showSubtitle: false,
        surfaceState: {
          surface: 'cover',
          layout: { kind: 'stacked-center' },
          fields: {
            title: { value: 'Titulo antiguo', visible: true },
            subtitle: { value: '', visible: false },
            author: { value: '', visible: false },
          },
          layers: [],
          opacity: 0.47,
        },
      },
      backCover: {
        title: 'Contra',
        body: 'Texto de contra',
        authorBio: 'Bio',
        surfaceState: undefined,
      },
    }));

    expect(snapshot.fields.title?.value).toBe('Titulo antiguo');
    expect(snapshot.fields.author?.value).toBe('Toni');
    expect(snapshot.fields.author?.visible).toBe(true);
  });

  it('uses the saved cover author from surface state so advanced editor reflects basic editor changes', () => {
    const snapshot = createSurfaceSnapshotFromProject('cover', makeSurfaceProject({
      document: { author: 'Toni', title: 'Titulo documento' },
      cover: {
        title: 'NUNCA MAS EN LA SOMBRA',
        subtitle: '',
        showSubtitle: false,
        surfaceState: {
          surface: 'cover',
          layout: { kind: 'stacked-center' },
          fields: {
            title: { value: 'NUNCA MAS EN LA SOMBRA', visible: true },
            subtitle: { value: '', visible: false },
            author: { value: 'Antonio', visible: true },
          },
          layers: [],
          opacity: 0.47,
        },
      },
      backCover: {
        title: 'Contra',
        body: 'Texto de contra',
        authorBio: 'Bio',
        surfaceState: undefined,
      },
    }));

    expect(snapshot.fields.author?.value).toBe('Antonio');
    expect(snapshot.fields.author?.visible).toBe(true);
  });

  it('keeps a divergent persisted surface subtitle as a manual override (D.3)', () => {
    const snapshot = createSurfaceSnapshotFromProject('cover', makeSurfaceProject({
      document: { author: 'Toni', title: 'Titulo documento', subtitle: 'Subtitulo documento' },
      cover: {
        title: 'Titulo actual de cover',
        subtitle: 'Subtitulo actual de cover',
        showSubtitle: true,
        surfaceState: {
          surface: 'cover',
          layout: { kind: 'stacked-center' },
          fields: {
            title: { value: 'Titulo viejo de surface', visible: true },
            subtitle: { value: 'Subtitulo viejo de surface', visible: true },
            author: { value: '', visible: false },
          },
          layers: [],
          opacity: 0.47,
        },
      },
      backCover: {
        title: 'Contra',
        body: 'Texto de contra',
        authorBio: 'Bio',
        surfaceState: undefined,
      },
    }));

    expect(snapshot.fields.subtitle?.value).toBe('Subtitulo viejo de surface');
    expect(snapshot.fields.subtitle?.visible).toBe(true);
  });

  it('rebuilds missing visible layers from persisted fields so author and subtitle still appear', () => {
    const snapshot = createSurfaceSnapshotFromProject('cover', makeSurfaceProject({
      document: {
        author: 'Toni',
        title: 'NUNCA MAS EN LA SOMBRA',
        subtitle: 'Subtitulo actual',
      },
      cover: {
        title: 'NUNCA MAS EN LA SOMBRA',
        subtitle: 'Subtitulo actual',
        showSubtitle: true,
        surfaceState: {
          surface: 'cover',
          layout: { kind: 'stacked-center' },
          fields: {
            title: { value: 'Texto viejo', visible: true },
            subtitle: { value: 'Otro subtitulo', visible: true },
            author: { value: 'Otro autor', visible: true },
          },
          layers: [{ id: 'cover-title', type: 'text', fieldKey: 'title' }],
          opacity: 0.47,
        },
      },
      backCover: {
        title: 'Contra',
        body: 'Texto de contra',
        authorBio: 'Bio',
        surfaceState: undefined,
      },
    }));

    expect(snapshot.layers?.map((layer) => layer.fieldKey)).toEqual(['title', 'subtitle', 'author']);
  });
});
