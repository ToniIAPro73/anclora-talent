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
});
