import { describe, expect, it } from 'vitest';
import {
  applySurfaceTemplate,
  createDefaultSurfaceState,
  mergePartialSurfaceUpdate,
  normalizeSurfaceState,
} from './cover-surface';

describe('cover-surface', () => {
  it('preserves user content when applying a new template', () => {
    const state = createDefaultSurfaceState('cover');
    state.fields.title.value = 'Nunca mas en la sombra';
    state.fields.subtitle.value = 'Subtitulo real';
    state.fields.subtitle.visible = true;

    const next = applySurfaceTemplate(state, {
      id: 'minimal-editorial-cover',
      surface: 'cover',
      visibility: { subtitle: false },
      layout: { kind: 'stacked-center' },
    });

    expect(next.fields.title.value).toBe('Nunca mas en la sombra');
    expect(next.fields.subtitle.value).toBe('Subtitulo real');
    expect(next.fields.subtitle.visible).toBe(false);
  });

  it('normalizes empty fields as hidden content on render surfaces', () => {
    const state = normalizeSurfaceState({
      surface: 'back-cover',
      fields: {
        title: { value: '', visible: true },
        body: { value: 'Texto', visible: true },
      },
    });

    expect(state.fields.title.value).toBe('');
    expect(state.fields.title.visible).toBe(false);
    expect(state.fields.body.visible).toBe(true);
  });

  it('preserves advanced fields when a partial update changes only title and subtitle', () => {
    const next = mergePartialSurfaceUpdate(
      {
        surface: 'cover',
        layout: { kind: 'statement-bold' },
        layers: [{ id: 'title-layer', type: 'text', fieldKey: 'title' }],
        fields: {
          title: { value: 'Antes', visible: true },
          subtitle: { value: 'Sub', visible: true },
          author: { value: 'Autor', visible: true },
        },
      },
      {
        fields: {
          title: { value: 'Despues', visible: true },
          subtitle: { value: '', visible: false },
        },
      },
    );

    expect(next.layout.kind).toBe('statement-bold');
    expect(next.layers).toHaveLength(1);
    expect(next.fields.author?.value).toBe('Autor');
    expect(next.fields.subtitle?.visible).toBe(false);
  });
});
