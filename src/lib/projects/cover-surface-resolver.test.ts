import { describe, expect, it } from 'vitest';
import { resolveCoverSurfaceFields } from './cover-surface-resolver';
import { createDefaultSurfaceState } from './cover-surface';
import type { ProjectRecord } from './types';

type CoverSubset = Pick<ProjectRecord, 'document' | 'cover'>;

function makeProject(overrides?: {
  document?: Partial<CoverSubset['document']>;
  cover?: Partial<CoverSubset['cover']>;
}): CoverSubset {
  return {
    document: {
      id: 'doc-1',
      title: 'Título documento',
      subtitle: '',
      author: 'Toni',
      language: 'es',
      chapters: [],
      ...(overrides?.document ?? {}),
    } as CoverSubset['document'],
    cover: {
      id: 'cover-1',
      title: 'Título documento',
      subtitle: '',
      palette: 'teal',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      showSubtitle: true,
      surfaceState: null,
      ...(overrides?.cover ?? {}),
    } as CoverSubset['cover'],
  };
}

describe('resolveCoverSurfaceFields', () => {
  it('removes duplicated subtitle when it matches the author and keeps the author only once', () => {
    const state = createDefaultSurfaceState('cover');
    if (state.fields.title) state.fields.title = { value: 'NUNCA MÁS EN LA SOMBRA', visible: true };
    if (state.fields.subtitle) state.fields.subtitle = { value: 'Toni', visible: true };
    if (state.fields.author) state.fields.author = { value: 'Toni', visible: true };

    const fields = resolveCoverSurfaceFields(
      makeProject({
        document: { title: 'NUNCA MÁS EN LASOMBRA', author: 'Toni' },
        cover: { title: 'NUNCA MÁS EN LASOMBRA', subtitle: 'Toni', surfaceState: state },
      }),
      state,
    );

    // The divergent layer value is a de-facto manual override (D.3).
    expect(fields.title.value).toBe('NUNCA MÁS EN LA SOMBRA');
    expect(fields.author.value).toBe('Toni');
    expect(fields.subtitle.value).toBe('');
    expect(fields.subtitle.visible).toBe(false);
  });

  it('falls back to the synced document subtitle when the surface subtitle duplicates the author', () => {
    const state = createDefaultSurfaceState('cover');
    if (state.fields.title) state.fields.title = { value: 'Título', visible: true };
    if (state.fields.subtitle) state.fields.subtitle = { value: 'Toni', visible: true };
    if (state.fields.author) state.fields.author = { value: 'Toni', visible: true };

    const fields = resolveCoverSurfaceFields(
      makeProject({
        document: { title: 'Título documento', subtitle: 'Subtítulo documento', author: 'Toni' },
        cover: { title: 'Título corregido', subtitle: 'Subtítulo correcto', surfaceState: state },
      }),
      state,
    );

    expect(fields.subtitle.value).toBe('Subtítulo documento');
    expect(fields.subtitle.visible).toBe(true);
    expect(fields.subtitle.source).toBe('metadata');
  });

  it('prioritizes a saved cover author from surface state over the document author', () => {
    const state = createDefaultSurfaceState('cover');
    if (state.fields.author) state.fields.author = { value: 'Antonio', visible: true };

    const fields = resolveCoverSurfaceFields(
      makeProject({
        document: { title: 'Título documento', author: 'Toni' },
        cover: { title: 'Título portada', showSubtitle: false, surfaceState: state },
      }),
      state,
    );

    expect(fields.author.value).toBe('Antonio');
    expect(fields.author.visible).toBe(true);
    expect(fields.author.source).toBe('manual');
  });
});

describe('resolveCoverSurfaceFields — D.3 metadata chain', () => {
  it('feeds title/subtitle/author from the product metadata by default', () => {
    const project = makeProject({
      document: {
        title: 'Título doc',
        subtitle: 'Subtítulo doc',
        author: 'Autor doc',
        metadata: {
          title: 'Título metadato',
          subtitle: 'Subtítulo metadato',
          author: 'Autor metadato',
        },
      },
    });

    const fields = resolveCoverSurfaceFields(project);

    expect(fields.title).toEqual({ value: 'Título metadato', visible: true, source: 'metadata' });
    expect(fields.subtitle).toEqual({
      value: 'Subtítulo metadato',
      visible: true,
      source: 'metadata',
    });
    expect(fields.author).toEqual({ value: 'Autor metadato', visible: true, source: 'metadata' });
  });

  it('falls back to the document fields when no metadata was saved', () => {
    const project = makeProject({
      document: { title: 'Título doc', subtitle: 'Sub doc', author: 'Autor doc' },
    });

    const fields = resolveCoverSurfaceFields(project);

    expect(fields.title.value).toBe('Título doc');
    expect(fields.subtitle.value).toBe('Sub doc');
    expect(fields.author.value).toBe('Autor doc');
  });

  it('reflects a metadata change on the next resolution (single source)', () => {
    const base = makeProject({
      document: { metadata: { title: 'Título v1' } },
    });
    const updated = makeProject({
      document: { metadata: { title: 'Título v2' } },
    });

    expect(resolveCoverSurfaceFields(base).title.value).toBe('Título v1');
    expect(resolveCoverSurfaceFields(updated).title.value).toBe('Título v2');
  });

  it('keeps an explicit manual layer override above the metadata', () => {
    const state = createDefaultSurfaceState('cover');
    state.fields.title = { value: 'Título personalizado', visible: true, source: 'manual' };

    const fields = resolveCoverSurfaceFields(
      makeProject({
        document: { title: 'Título doc', metadata: { title: 'Título metadato' } },
        cover: { surfaceState: state },
      }),
      state,
    );

    expect(fields.title).toEqual({
      value: 'Título personalizado',
      visible: true,
      source: 'manual',
    });
  });
});
