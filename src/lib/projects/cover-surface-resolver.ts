import {
  createDefaultSurfaceState,
  normalizeSurfaceState,
  type SurfaceFieldState,
  type SurfaceState,
} from './cover-surface';
import type { ProjectRecord } from './types';

type CoverProjectSubset = Pick<ProjectRecord, 'document' | 'cover'>;

function normalizeValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

function sameText(left: string | null | undefined, right: string | null | undefined) {
  return normalizeValue(left).toLocaleLowerCase() === normalizeValue(right).toLocaleLowerCase();
}

function field(value: string | null | undefined, visible = true): SurfaceFieldState {
  const nextValue = value ?? '';
  return {
    value: nextValue,
    visible: Boolean(visible && nextValue.trim()),
  };
}

export function resolveCoverSurfaceFields(
  project: CoverProjectSubset,
  surfaceState?: SurfaceState | null,
) {
  const state = normalizeSurfaceState(
    surfaceState ??
      project.cover.surfaceState ??
      {
        ...createDefaultSurfaceState('cover'),
      },
  );

  const canonicalTitle =
    project.cover.title ||
    state.fields.title?.value ||
    project.document.title ||
    '';

  const canonicalAuthor =
    state.fields.author?.value ||
    project.document.author ||
    '';

  const subtitleExplicitlyRemoved =
    state.fields.subtitle?.visible === false &&
    !normalizeValue(state.fields.subtitle?.value);

  if (subtitleExplicitlyRemoved) {
    return {
      title: field(canonicalTitle, Boolean(canonicalTitle.trim())),
      subtitle: field('', false),
      author: field(canonicalAuthor, Boolean(canonicalAuthor.trim())),
    };
  }

  const subtitleCandidates = [
    project.cover.subtitle,
    state.fields.subtitle?.value,
    project.document.subtitle,
  ];

  const canonicalSubtitle =
    subtitleCandidates.find((candidate) => {
      const normalized = normalizeValue(candidate);
      if (!normalized) return false;
      if (sameText(candidate, canonicalAuthor)) return false;
      return true;
    }) ?? '';

  const subtitleShouldBeVisible =
    (state.fields.subtitle?.visible ?? (project.cover.showSubtitle ?? true)) &&
    Boolean(canonicalSubtitle.trim());

  return {
    title: field(canonicalTitle, Boolean(canonicalTitle.trim())),
    subtitle: field(canonicalSubtitle, subtitleShouldBeVisible),
    author: field(canonicalAuthor, Boolean(canonicalAuthor.trim())),
  };
}
