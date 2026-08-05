import {
  createDefaultSurfaceState,
  normalizeSurfaceState,
  type SurfaceFieldState,
  type SurfaceState,
} from './cover-surface';
import { condenseSubtitle, syncedSurfaceValues } from './surface-metadata-sync';
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

function syncedField(value: string, visible = true): SurfaceFieldState {
  return { ...field(value, visible), source: 'metadata' };
}

/**
 * Manual override resolution (D.3). A layer counts as manual when it was
 * explicitly marked `source: 'manual'` (edited by hand) or — for legacy
 * states without provenance — when its stored value diverges from the synced
 * metadata value. Legacy values duplicating another field (e.g. a stale
 * subtitle equal to the author) are ignored instead of fossilized.
 */
function manualField(
  state: SurfaceFieldState | undefined,
  syncedValue: string,
  ignoreIfSameAs?: string,
): SurfaceFieldState | null {
  if (!state) return null;
  const value = normalizeValue(state.value);
  if (!value) return null;
  if (state.source === 'manual') {
    return { value: state.value, visible: state.visible, source: 'manual' };
  }
  if (state.source === 'metadata') return null;
  if (ignoreIfSameAs && sameText(value, ignoreIfSameAs)) return null;
  if (!sameText(value, syncedValue)) {
    return { value: state.value, visible: state.visible, source: 'manual' };
  }
  return null;
}

/**
 * Cover text fields. Priority per field (D.3):
 *   1. manual layer override (explicit or legacy-divergent)
 *   2. synced product-metadata value (document title/subtitle/author mirror)
 * Design-level columns (`cover.title`/`cover.subtitle`) are persistence
 * mirrors refreshed by `updateProjectDocument`; they no longer outrank the
 * metadata chain, so editing the document/metadata updates the cover.
 */
export function resolveCoverSurfaceFields(
  project: CoverProjectSubset,
  surfaceState?: SurfaceState | null,
) {
  const persistedState = surfaceState ?? project.cover.surfaceState;
  const state = normalizeSurfaceState(
    persistedState ??
      {
        ...createDefaultSurfaceState('cover'),
      },
  );

  const synced = syncedSurfaceValues(project.document);

  const title =
    manualField(state.fields.title, synced.title) ?? syncedField(synced.title);

  const author =
    manualField(state.fields.author, synced.author) ?? syncedField(synced.author);

  const subtitleState = state.fields.subtitle;
  // A hidden+empty tombstone only counts as a deliberate removal when it
  // comes from a persisted state; the fresh default state stays syncable so
  // the metadata subtitle feeds the cover by default (D.3).
  const subtitleExplicitlyRemoved =
    Boolean(persistedState) &&
    subtitleState?.visible === false &&
    !normalizeValue(subtitleState.value);

  if (subtitleExplicitlyRemoved) {
    return {
      title,
      subtitle: { value: '', visible: false, source: subtitleState.source ?? 'manual' },
      author,
    };
  }

  const syncedSubtitle = sameText(synced.subtitle, author.value)
    ? ''
    : condenseSubtitle(synced.subtitle);
  const subtitleVisibilityBase = persistedState
    ? (subtitleState?.visible ?? (project.cover.showSubtitle ?? true))
    : (project.cover.showSubtitle ?? true);
  const subtitle =
    manualField(subtitleState, syncedSubtitle, author.value) ??
    syncedField(syncedSubtitle, subtitleVisibilityBase && Boolean(syncedSubtitle.trim()));

  return { title, subtitle, author };
}
