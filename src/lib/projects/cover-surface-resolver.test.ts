import { describe, expect, it } from 'vitest';
import { resolveCoverSurfaceFields } from './cover-surface-resolver';
import { createDefaultSurfaceState } from './cover-surface';

describe('resolveCoverSurfaceFields', () => {
  it('removes duplicated subtitle when it matches the author and keeps the author only once', () => {
    const state = createDefaultSurfaceState('cover');
    if (state.fields.title) state.fields.title = { value: 'NUNCA MÁS EN LA SOMBRA', visible: true };
    if (state.fields.subtitle) state.fields.subtitle = { value: 'Toni', visible: true };
    if (state.fields.author) state.fields.author = { value: 'Toni', visible: true };

    const fields = resolveCoverSurfaceFields(
      {
        document: {
          id: 'doc-1',
          title: 'NUNCA MÁS EN LASOMBRA',
          subtitle: '',
          author: 'Toni',
          language: 'es',
          chapters: [],
        },
        cover: {
          id: 'cover-1',
          title: 'NUNCA MÁS EN LASOMBRA',
          subtitle: 'Toni',
          palette: 'teal',
          backgroundImageUrl: null,
          thumbnailUrl: null,
          showSubtitle: true,
          surfaceState: state,
        },
      },
      state,
    );

    expect(fields.title.value).toBe('NUNCA MÁS EN LASOMBRA');
    expect(fields.author.value).toBe('Toni');
    expect(fields.subtitle.value).toBe('');
    expect(fields.subtitle.visible).toBe(false);
  });

  it('falls back to a non-duplicated persisted subtitle when surface state subtitle equals the author', () => {
    const state = createDefaultSurfaceState('cover');
    if (state.fields.title) state.fields.title = { value: 'Título', visible: true };
    if (state.fields.subtitle) state.fields.subtitle = { value: 'Toni', visible: true };
    if (state.fields.author) state.fields.author = { value: 'Toni', visible: true };

    const fields = resolveCoverSurfaceFields(
      {
        document: {
          id: 'doc-1',
          title: 'Título documento',
          subtitle: 'Subtítulo documento',
          author: 'Toni',
          language: 'es',
          chapters: [],
        },
        cover: {
          id: 'cover-1',
          title: 'Título corregido',
          subtitle: 'Subtítulo correcto',
          palette: 'teal',
          backgroundImageUrl: null,
          thumbnailUrl: null,
          showSubtitle: true,
          surfaceState: state,
        },
      },
      state,
    );

    expect(fields.subtitle.value).toBe('Subtítulo correcto');
    expect(fields.subtitle.visible).toBe(true);
  });

  it('prioritizes a saved cover author from surface state over the document author', () => {
    const state = createDefaultSurfaceState('cover');
    if (state.fields.author) state.fields.author = { value: 'Antonio', visible: true };

    const fields = resolveCoverSurfaceFields(
      {
        document: {
          id: 'doc-1',
          title: 'Título documento',
          subtitle: '',
          author: 'Toni',
          language: 'es',
          chapters: [],
        },
        cover: {
          id: 'cover-1',
          title: 'Título portada',
          subtitle: '',
          palette: 'teal',
          backgroundImageUrl: null,
          thumbnailUrl: null,
          showSubtitle: false,
          surfaceState: state,
        },
      },
      state,
    );

    expect(fields.author.value).toBe('Antonio');
    expect(fields.author.visible).toBe(true);
  });
});
