export type SurfaceKind = 'cover' | 'back-cover';

export type SurfaceFieldKey = 'title' | 'subtitle' | 'author' | 'body' | 'authorBio';

export interface SurfaceFieldState {
  value: string;
  visible: boolean;
}

export interface SurfaceTemplateDefinition {
  id: string;
  surface: SurfaceKind;
  visibility?: Partial<Record<SurfaceFieldKey, boolean>>;
  layout: { kind: string };
}

export interface SurfaceLayer {
  id: string;
  type: 'text' | 'image';
  fieldKey?: SurfaceFieldKey;
}

export interface SurfaceState {
  surface: SurfaceKind;
  fields: Partial<Record<SurfaceFieldKey, SurfaceFieldState>>;
  layout: { kind: string };
  layers?: SurfaceLayer[];
  opacity?: number;
}

const EMPTY_FIELD: SurfaceFieldState = { value: '', visible: false };

export function createDefaultSurfaceState(surface: SurfaceKind): SurfaceState {
  return {
    surface,
    layout: { kind: 'stacked-center' },
    fields: {
      title: { value: '', visible: true },
      subtitle: { value: '', visible: false },
      author: { value: '', visible: surface === 'cover' },
      body: { value: '', visible: surface === 'back-cover' },
      authorBio: { value: '', visible: surface === 'back-cover' },
    },
    opacity: surface === 'back-cover' ? 0.24 : 1,
  };
}

export function normalizeSurfaceState(
  input: Partial<SurfaceState> & { surface: SurfaceKind },
): SurfaceState {
  const base = createDefaultSurfaceState(input.surface);
  const fields = { ...base.fields, ...(input.fields ?? {}) };

  for (const key of Object.keys(fields) as SurfaceFieldKey[]) {
    const current = fields[key] ?? EMPTY_FIELD;
    const value = current.value ?? '';
    const trimmed = value.trim();

    fields[key] = {
      value,
      visible: Boolean(current.visible && trimmed),
    };
  }

  return {
    surface: input.surface,
    layout: input.layout ?? base.layout,
    fields,
    layers: input.layers ?? [],
    opacity: input.opacity ?? base.opacity ?? (input.surface === 'back-cover' ? 0.24 : 1),
  };
}

export function applySurfaceTemplate(
  state: SurfaceState,
  template: SurfaceTemplateDefinition,
): SurfaceState {
  const next = normalizeSurfaceState(state);
  const fields = { ...next.fields };

  for (const [key, visible] of Object.entries(template.visibility ?? {})) {
    const fieldKey = key as SurfaceFieldKey;
    const current = fields[fieldKey] ?? EMPTY_FIELD;

    fields[fieldKey] = {
      ...current,
      visible: Boolean(visible && current.value.trim()),
    };
  }

  return {
    ...next,
    layout: template.layout,
    fields,
  };
}

export function mergePartialSurfaceUpdate(
  previous: SurfaceState,
  partial: Partial<SurfaceState>,
): SurfaceState {
  return normalizeSurfaceState({
    ...previous,
    ...partial,
    fields: {
      ...previous.fields,
      ...(partial.fields ?? {}),
    },
    layers: partial.layers ?? previous.layers ?? [],
  });
}
