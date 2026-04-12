import { describe, expect, it } from 'vitest';
import { buildInitialSurfaceLayers, createSurfaceSnapshotFromProject } from './advanced-surface-utils';

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

  it('syncs cover text fields with persisted flat cover values so advanced editor matches the basic editor', () => {
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

    expect(snapshot.fields.title?.value).toBe('NUNCA MAS EN LA SOMBRA');
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

  it('matches the basic cover editor by prioritizing persisted cover subtitle over stale surface subtitle', () => {
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

    expect(snapshot.fields.subtitle?.value).toBe('Subtitulo actual de cover');
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
