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
  /**
   * Per-field typography/composition presets applied when the template is
   * selected. Merged over the field layers; layers missing from the state
   * are created for visible fields.
   */
  layerStyles?: Partial<Record<SurfaceFieldKey, Partial<SurfaceLayer>>>;
}

export interface SurfaceLayer {
  id: string;
  type: 'text' | 'image';
  fieldKey?: SurfaceFieldKey;
  left?: number;
  top?: number;
  width?: number;
  fill?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  charSpacing?: number;
  originX?: string;
  originY?: string;
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

  // Reconcile layers with the template: keep the user's custom geometry for
  // layers that still exist, create layers for newly visible fields and merge
  // the template typography presets on top.
  const layerStyles = template.layerStyles ?? {};
  const layersByField = new Map(
    (next.layers ?? [])
      .filter((layer) => layer.type === 'text' && layer.fieldKey)
      .map((layer) => [layer.fieldKey as SurfaceFieldKey, layer]),
  );

  const preservedExtra = (next.layers ?? []).filter(
    (layer) => !(layer.type === 'text' && layer.fieldKey),
  );

  const layers: SurfaceLayer[] = [...preservedExtra];
  for (const [fieldKey, fieldState] of Object.entries(fields) as Array<
    [SurfaceFieldKey, SurfaceFieldState]
  >) {
    if (!fieldState.visible) continue;
    const existing = layersByField.get(fieldKey);
    const base: SurfaceLayer =
      existing ?? { id: `${next.surface}-${fieldKey}`, type: 'text', fieldKey };
    layers.push({ ...base, ...(layerStyles[fieldKey] ?? {}), fieldKey });
  }

  return {
    ...next,
    layout: template.layout,
    fields,
    layers,
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
