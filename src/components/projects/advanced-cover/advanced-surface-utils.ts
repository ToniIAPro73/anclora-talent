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

    const fields = { ...state.fields };

    if (project.document.title && fields.title && fields.title.value !== project.document.title) {
      fields.title = { value: project.document.title, visible: true };
    }

    if (project.document.subtitle && fields.subtitle && fields.subtitle.value !== project.document.subtitle) {
      fields.subtitle = {
        value: project.document.subtitle,
        visible: Boolean((project.cover.showSubtitle ?? true) && project.document.subtitle.trim()),
      };
    }

    if (project.document.author && fields.author && fields.author.value !== project.document.author) {
      fields.author = { value: project.document.author, visible: true };
    }

    return {
      ...state,
      fields,
      layers: state.layers && state.layers.length > 0 ? state.layers : buildInitialSurfaceLayers('cover', fields),
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

  const fields = { ...state.fields };

  if (project.document.author && fields.title && fields.title.value !== project.document.author) {
    fields.title = { value: project.document.author, visible: true };
  }

  if (project.document.subtitle && fields.body && fields.body.value !== project.document.subtitle) {
    fields.body = { value: project.document.subtitle, visible: true };
  }

  if (project.backCover.authorBio && fields.authorBio && fields.authorBio.value !== project.backCover.authorBio) {
    fields.authorBio = { value: project.backCover.authorBio, visible: true };
  }

  return {
    ...state,
    fields,
    layers: state.layers && state.layers.length > 0 ? state.layers : buildInitialSurfaceLayers('back-cover', fields),
  };
}
