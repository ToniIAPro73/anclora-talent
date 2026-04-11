import {
  createDefaultSurfaceState,
  normalizeSurfaceState,
  type SurfaceFieldState,
  type SurfaceKind,
  type SurfaceLayer,
  type SurfaceState,
} from '@/lib/projects/cover-surface';
import type { ProjectRecord } from '@/lib/projects/types';

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
  if (surface === 'cover') {
    const state = normalizeSurfaceState(
      project.cover.surfaceState ??
        {
          ...createDefaultSurfaceState('cover'),
          fields: {
            title: field(project.cover.title || project.document.title),
            subtitle: field(project.cover.subtitle || project.document.subtitle, project.cover.showSubtitle ?? true),
            author: field(project.document.author),
          },
        },
    );

    const canonicalTitle = project.cover.title || project.document.title || state.fields.title?.value || '';
    const canonicalSubtitle = project.cover.subtitle || project.document.subtitle || state.fields.subtitle?.value || '';
    const canonicalAuthor = project.document.author || state.fields.author?.value || '';
    const fields = {
      ...state.fields,
      title: field(canonicalTitle, state.fields.title?.visible ?? true),
      subtitle: field(
        canonicalSubtitle,
        state.fields.subtitle?.visible ?? (project.cover.showSubtitle ?? true),
      ),
      author: field(canonicalAuthor, Boolean(canonicalAuthor.trim())),
    };

    return {
      ...state,
      fields,
      layers: reconcileLayers('cover', fields, state.layers),
    };
  }

  const state = normalizeSurfaceState(
    project.backCover.surfaceState ??
      {
        ...createDefaultSurfaceState('back-cover'),
        fields: {
          title: field(project.backCover.title),
          body: field(project.backCover.body),
          authorBio: field(project.backCover.authorBio),
        },
      },
  );

  const canonicalTitle = project.backCover.title || project.document.author || state.fields.title?.value || '';
  const canonicalBody = project.backCover.body || project.document.subtitle || state.fields.body?.value || '';
  const canonicalAuthorBio = project.backCover.authorBio || state.fields.authorBio?.value || '';
  const fields = {
    ...state.fields,
    title: field(canonicalTitle, state.fields.title?.visible ?? Boolean(canonicalTitle.trim())),
    body: field(canonicalBody, state.fields.body?.visible ?? Boolean(canonicalBody.trim())),
    authorBio: field(
      canonicalAuthorBio,
      Boolean(canonicalAuthorBio.trim()),
    ),
  };

  return {
    ...state,
    fields,
    layers: reconcileLayers('back-cover', fields, state.layers),
  };
}
