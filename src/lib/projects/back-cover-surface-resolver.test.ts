import { describe, expect, it } from 'vitest';
import { createDefaultSurfaceState } from './cover-surface';
import { resolveBackCoverSurfaceFields } from './back-cover-surface-resolver';
import type { ProjectRecord } from './types';

type BackCoverSubset = Pick<ProjectRecord, 'document' | 'backCover'>;

function makeProject(overrides?: {
  document?: Partial<BackCoverSubset['document']>;
  backCover?: Partial<BackCoverSubset['backCover']>;
}): BackCoverSubset {
  return {
    document: {
      id: 'doc-1',
      title: 'Libro',
      subtitle: 'Subtitulo documento',
      author: 'Antonio',
      language: 'es',
      chapters: [],
      ...(overrides?.document ?? {}),
    } as BackCoverSubset['document'],
    backCover: {
      id: 'bc-1',
      title: 'Antonio',
      body: 'Texto definitivo',
      authorBio: 'Bio definitiva',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
      surfaceState: null,
      ...(overrides?.backCover ?? {}),
    } as BackCoverSubset['backCover'],
  };
}

describe('resolveBackCoverSurfaceFields', () => {
  it('treats divergent surface values as manual layer overrides (D.3)', () => {
    const state = createDefaultSurfaceState('back-cover');
    if (state.fields.title) state.fields.title = { value: 'Autor antiguo', visible: true };
    if (state.fields.body) state.fields.body = { value: 'Texto antiguo', visible: true };
    if (state.fields.authorBio) state.fields.authorBio = { value: 'Bio antigua', visible: true };

    const fields = resolveBackCoverSurfaceFields(
      makeProject({ backCover: { surfaceState: state } }),
      state,
    );

    expect(fields.title).toEqual({ value: 'Autor antiguo', visible: true, source: 'manual' });
    expect(fields.body).toEqual({ value: 'Texto antiguo', visible: true, source: 'manual' });
    // authorBio has no metadata chain: persisted design value still wins.
    expect(fields.authorBio.value).toBe('Bio definitiva');
  });

  it('keeps body and bio hidden when the persisted state explicitly removed them', () => {
    const state = createDefaultSurfaceState('back-cover');
    if (state.fields.body) state.fields.body = { value: '', visible: false };
    if (state.fields.authorBio) state.fields.authorBio = { value: '', visible: false };

    const fields = resolveBackCoverSurfaceFields(
      makeProject({ backCover: { surfaceState: state } }),
      state,
    );

    expect(fields.body.value).toBe('');
    expect(fields.body.visible).toBe(false);
    expect(fields.authorBio.value).toBe('');
    expect(fields.authorBio.visible).toBe(false);
  });
});

describe('resolveBackCoverSurfaceFields — D.3 metadata chain', () => {
  it('feeds title from the metadata title and body from the metadata description', () => {
    const fields = resolveBackCoverSurfaceFields(
      makeProject({
        document: {
          metadata: { title: 'Título metadato', description: 'Sinopsis del producto' },
        },
      }),
    );

    expect(fields.title).toEqual({ value: 'Título metadato', visible: true, source: 'metadata' });
    expect(fields.body).toEqual({
      value: 'Sinopsis del producto',
      visible: true,
      source: 'metadata',
    });
  });

  it('falls back to the document title/subtitle when no metadata was saved', () => {
    const fields = resolveBackCoverSurfaceFields(makeProject());

    expect(fields.title.value).toBe('Libro');
    expect(fields.body.value).toBe('Subtitulo documento');
    expect(fields.body.source).toBe('metadata');
  });

  it('reflects a metadata description change on the next resolution', () => {
    const v1 = resolveBackCoverSurfaceFields(
      makeProject({ document: { metadata: { title: 'T', description: 'Sinopsis v1' } } }),
    );
    const v2 = resolveBackCoverSurfaceFields(
      makeProject({ document: { metadata: { title: 'T', description: 'Sinopsis v2' } } }),
    );

    expect(v1.body.value).toBe('Sinopsis v1');
    expect(v2.body.value).toBe('Sinopsis v2');
  });
});
