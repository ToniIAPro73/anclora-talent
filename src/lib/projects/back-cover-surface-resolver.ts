import {
  createDefaultSurfaceState,
  normalizeSurfaceState,
  type SurfaceFieldState,
  type SurfaceState,
} from './cover-surface';
import { syncedSurfaceValues } from './surface-metadata-sync';
import type { ProjectRecord } from './types';

type BackCoverProjectSubset = Pick<ProjectRecord, 'document' | 'backCover'>;

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

function syncedField(value: string, visible = true): SurfaceFieldState {
  return { ...field(value, visible), source: 'metadata' };
}

/**
 * Manual override resolution (D.3), same contract as the cover resolver:
 * explicit `source: 'manual'` wins; legacy values diverging from the synced
 * value count as de-facto manual overrides.
 */
function manualField(
  state: SurfaceFieldState | undefined,
  syncedValue: string,
): SurfaceFieldState | null {
  if (!state) return null;
  const value = normalizeValue(state.value);
  if (!value) return null;
  if (state.source === 'manual') {
    return { value: state.value, visible: state.visible, source: 'manual' };
  }
  if (state.source === 'metadata') return null;
  if (!sameText(value, syncedValue)) {
    return { value: state.value, visible: state.visible, source: 'manual' };
  }
  return null;
}

/**
 * Back-cover text fields. Priority per field (D.3):
 *   1. manual layer override (explicit or legacy-divergent)
 *   2. synced product-metadata value (title = document/metadata title,
 *      body = metadata description with document-subtitle fallback)
 * `authorBio` has no metadata counterpart and keeps its historical chain
 * (persisted design value over stale surface text).
 */
export function resolveBackCoverSurfaceFields(
  project: BackCoverProjectSubset,
  surfaceState?: SurfaceState | null,
) {
  const persistedState = surfaceState ?? project.backCover.surfaceState;
  const state = normalizeSurfaceState(
    persistedState ??
      {
        ...createDefaultSurfaceState('back-cover'),
      },
  );

  const synced = syncedSurfaceValues(project.document);

  const title =
    manualField(state.fields.title, synced.title) ??
    syncedField(synced.title || project.document.author || '');

  const bodyState = state.fields.body;
  // Same tombstone contract as the cover subtitle: only a persisted state
  // makes a hidden+empty body a deliberate removal (D.3).
  const bodyExplicitlyRemoved =
    Boolean(persistedState) &&
    bodyState?.visible === false &&
    !normalizeValue(bodyState.value);

  const body = bodyExplicitlyRemoved
    ? { value: '', visible: false, source: bodyState.source ?? ('manual' as const) }
    : (manualField(bodyState, synced.body) ??
      syncedField(
        synced.body,
        (persistedState ? (bodyState?.visible ?? true) : true) && Boolean(synced.body.trim()),
      ));

  const authorBioExplicitlyRemoved =
    state.fields.authorBio?.visible === false &&
    !normalizeValue(state.fields.authorBio?.value);

  const canonicalAuthorBio =
    project.backCover.authorBio ||
    state.fields.authorBio?.value ||
    '';

  return {
    title,
    body,
    authorBio: authorBioExplicitlyRemoved
      ? field('', false)
      : field(
          canonicalAuthorBio,
          state.fields.authorBio?.visible ?? Boolean(canonicalAuthorBio.trim()),
        ),
  };
}
