import {
  createDefaultSurfaceState,
  normalizeSurfaceState,
  type SurfaceFieldState,
  type SurfaceState,
} from './cover-surface';
import type { ProjectRecord } from './types';

type BackCoverProjectSubset = Pick<ProjectRecord, 'document' | 'backCover'>;

function normalizeValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

function field(value: string | null | undefined, visible = true): SurfaceFieldState {
  const nextValue = value ?? '';
  return {
    value: nextValue,
    visible: Boolean(visible && nextValue.trim()),
  };
}

export function resolveBackCoverSurfaceFields(
  project: BackCoverProjectSubset,
  surfaceState?: SurfaceState | null,
) {
  const state = normalizeSurfaceState(
    surfaceState ??
      project.backCover.surfaceState ??
      {
        ...createDefaultSurfaceState('back-cover'),
      },
  );

  const canonicalTitle =
    project.backCover.title ||
    state.fields.title?.value ||
    project.document.author ||
    '';

  const bodyExplicitlyRemoved =
    state.fields.body?.visible === false &&
    !normalizeValue(state.fields.body?.value);
  const authorBioExplicitlyRemoved =
    state.fields.authorBio?.visible === false &&
    !normalizeValue(state.fields.authorBio?.value);

  const canonicalBody =
    project.backCover.body ||
    state.fields.body?.value ||
    project.document.subtitle ||
    '';
  const canonicalAuthorBio =
    project.backCover.authorBio ||
    state.fields.authorBio?.value ||
    '';

  return {
    title: field(canonicalTitle, Boolean(canonicalTitle.trim())),
    body: bodyExplicitlyRemoved
      ? field('', false)
      : field(canonicalBody, state.fields.body?.visible ?? Boolean(canonicalBody.trim())),
    authorBio: authorBioExplicitlyRemoved
      ? field('', false)
      : field(
          canonicalAuthorBio,
          state.fields.authorBio?.visible ?? Boolean(canonicalAuthorBio.trim()),
        ),
  };
}
