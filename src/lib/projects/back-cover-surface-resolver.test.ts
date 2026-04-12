import { describe, expect, it } from 'vitest';
import { createDefaultSurfaceState } from './cover-surface';
import { resolveBackCoverSurfaceFields } from './back-cover-surface-resolver';

describe('resolveBackCoverSurfaceFields', () => {
  it('prioritizes saved back-cover content over stale surface text so advanced and basic stay in sync', () => {
    const state = createDefaultSurfaceState('back-cover');
    if (state.fields.title) state.fields.title = { value: 'Autor antiguo', visible: true };
    if (state.fields.body) state.fields.body = { value: 'Texto antiguo', visible: true };
    if (state.fields.authorBio) state.fields.authorBio = { value: 'Bio antigua', visible: true };

    const fields = resolveBackCoverSurfaceFields(
      {
        document: {
          id: 'doc-1',
          title: 'Libro',
          subtitle: 'Subtitulo documento',
          author: 'Antonio',
          language: 'es',
          chapters: [],
        },
        backCover: {
          id: 'bc-1',
          title: 'Antonio',
          body: 'Texto definitivo',
          authorBio: 'Bio definitiva',
          accentColor: null,
          backgroundImageUrl: null,
          renderedImageUrl: null,
          surfaceState: state,
        },
      },
      state,
    );

    expect(fields.title.value).toBe('Antonio');
    expect(fields.body.value).toBe('Texto definitivo');
    expect(fields.authorBio.value).toBe('Bio definitiva');
  });

  it('keeps body and bio hidden when advanced state explicitly removed them', () => {
    const state = createDefaultSurfaceState('back-cover');
    if (state.fields.body) state.fields.body = { value: '', visible: false };
    if (state.fields.authorBio) state.fields.authorBio = { value: '', visible: false };

    const fields = resolveBackCoverSurfaceFields(
      {
        document: {
          id: 'doc-1',
          title: 'Libro',
          subtitle: 'Subtitulo documento',
          author: 'Antonio',
          language: 'es',
          chapters: [],
        },
        backCover: {
          id: 'bc-1',
          title: 'Antonio',
          body: 'Texto que no debe reaparecer',
          authorBio: 'Bio que no debe reaparecer',
          accentColor: null,
          backgroundImageUrl: null,
          renderedImageUrl: null,
          surfaceState: state,
        },
      },
      state,
    );

    expect(fields.body.value).toBe('');
    expect(fields.body.visible).toBe(false);
    expect(fields.authorBio.value).toBe('');
    expect(fields.authorBio.visible).toBe(false);
  });
});
