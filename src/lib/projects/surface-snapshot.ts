import {
  createDefaultSurfaceState,
  normalizeSurfaceState,
  type SurfaceFieldState,
  type SurfaceKind,
  type SurfaceLayer,
  type SurfaceState,
} from './cover-surface';
import { resolveBackCoverSurfaceFields } from './back-cover-surface-resolver';
import { resolveCoverSurfaceFields } from './cover-surface-resolver';
import { syncedSurfaceValues } from './surface-metadata-sync';
import type { ProjectRecord } from './types';

type SurfaceFields = SurfaceState['fields'];
const FIELD_ORDER: Record<SurfaceKind, Array<keyof SurfaceFields>> = {
  cover: ['title', 'subtitle', 'author'],
  'back-cover': ['title', 'body', 'authorBio'],
};

export function buildInitialSurfaceLayers(
  surface: SurfaceKind,
  fields: SurfaceFields,
): SurfaceLayer[] {
  const layers: SurfaceLayer[] = [];

  if (fields.title?.visible) layers.push({ id: `${surface}-title`, type: 'text', fieldKey: 'title' });
  if (fields.subtitle?.visible) layers.push({ id: `${surface}-subtitle`, type: 'text', fieldKey: 'subtitle' });
  if (fields.author?.visible) layers.push({ id: `${surface}-author`, type: 'text', fieldKey: 'author' });
  if (fields.body?.visible) layers.push({ id: `${surface}-body`, type: 'text', fieldKey: 'body' });
  if (fields.authorBio?.visible) layers.push({ id: `${surface}-author-bio`, type: 'text', fieldKey: 'authorBio' });

  return layers;
}

function field(value: string | null | undefined, visible = true): SurfaceFieldState {
  const nextValue = value ?? '';
  return {
    value: nextValue,
    visible: Boolean(visible && nextValue.trim()),
  };
}

function reconcileLayers(
  surface: SurfaceKind,
  fields: SurfaceFields,
  layers: SurfaceLayer[] | undefined,
): SurfaceLayer[] {
  const visibleKeys = new Set(
    FIELD_ORDER[surface].filter((key) => fields[key]?.visible),
  );

  const preserved = (layers ?? []).filter((layer) => {
    if (layer.type !== 'text' || !layer.fieldKey) return false;
    return visibleKeys.has(layer.fieldKey);
  });

  const seen = new Set(preserved.map((layer) => layer.fieldKey));
  const missing = FIELD_ORDER[surface]
    .filter((key) => visibleKeys.has(key) && !seen.has(key))
    .map((fieldKey) => ({
      id: `${surface}-${fieldKey}`,
      type: 'text' as const,
      fieldKey,
    }));

  return [...preserved, ...missing];
}

export function createSurfaceSnapshotFromProject(
  surface: SurfaceKind,
  project: Pick<ProjectRecord, 'document' | 'cover' | 'backCover'>,
): SurfaceState {
  const synced = syncedSurfaceValues(project.document);
  const metadata = project.document.metadata ?? null;

  if (surface === 'cover') {
    // D.3: when the product metadata exists it is the single source; the
    // design-level columns only seed legacy projects saved before the
    // metadata chain (divergent values fossilize as manual layer overrides).
    const legacyTitle = metadata?.title?.trim() ? synced.title : (project.cover.title || synced.title);
    const legacySubtitle = metadata?.subtitle?.trim()
      ? synced.subtitle
      : (project.cover.subtitle || synced.subtitle);

    const state = normalizeSurfaceState(
      project.cover.surfaceState ??
        {
          ...createDefaultSurfaceState('cover'),
          fields: {
            title: field(legacyTitle),
            subtitle: field(legacySubtitle, project.cover.showSubtitle ?? true),
            author: field(synced.author),
          },
        },
    );

    const fields = {
      ...state.fields,
      ...resolveCoverSurfaceFields(project, state),
    };

    return {
      ...state,
      fields,
      layers: reconcileLayers('cover', fields, state.layers),
    };
  }

  const legacyBackTitle = metadata?.title?.trim()
    ? synced.title
    : (project.backCover.title || synced.title);
  const legacyBody = metadata?.description?.trim()
    ? synced.body
    : (project.backCover.body || synced.body);

  const state = normalizeSurfaceState(
    project.backCover.surfaceState ??
      {
        ...createDefaultSurfaceState('back-cover'),
        fields: {
          title: field(legacyBackTitle),
          body: field(legacyBody),
          authorBio: field(project.backCover.authorBio),
        },
      },
  );

  const fields = {
    ...state.fields,
    ...resolveBackCoverSurfaceFields(project, state),
  };

  return {
    ...state,
    fields,
    layers: reconcileLayers('back-cover', fields, state.layers),
  };
}
