import { describe, expect, it } from 'vitest';
import { buildInitialSurfaceLayers, createSurfaceSnapshotFromProject } from './advanced-surface-utils';

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
    const snapshot = createSurfaceSnapshotFromProject('back-cover', {
      document: { author: 'Autor demo', title: 'Libro' },
      cover: { title: 'Portada', subtitle: 'Sub', surfaceState: undefined },
      backCover: {
        title: 'Contra',
        body: 'Texto de contra',
        authorBio: 'Bio',
        surfaceState: undefined,
      },
    });

    expect(snapshot.surface).toBe('back-cover');
    expect(snapshot.fields.body?.value).toBe('Texto de contra');
    expect(snapshot.fields.authorBio?.value).toBe('Bio');
  });

  it('rebuilds visible cover layers when a persisted surface state contains an empty layers array', () => {
    const snapshot = createSurfaceSnapshotFromProject('cover', {
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
    });

    expect(snapshot.layers?.some((layer) => layer.fieldKey === 'title')).toBe(true);
    expect(snapshot.layers?.some((layer) => layer.fieldKey === 'author')).toBe(true);
  });
});
