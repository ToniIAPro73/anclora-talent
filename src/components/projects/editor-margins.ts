import { MARGIN_PRESETS } from '@/lib/projects/page-calculator';

export interface EditorMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const sameMargins = (left: EditorMargins, right: EditorMargins) =>
  left.top === right.top &&
  left.bottom === right.bottom &&
  left.left === right.left &&
  left.right === right.right;

/**
 * Strict precedence:
 * 1. Current project user override / active composition margins
 * 2. Current project custom snapshot margins
 * 3. Current project imported source margins
 * 4. Global user preferences (only if no project-specific composition/source exists)
 * 5. Talent system default
 */
export function resolveEditorMargins({
  compositionMargins,
  customSnapshotMargins,
  sourceMargins,
  userMargins,
  fallback = MARGIN_PRESETS.normal,
}: {
  compositionMargins?: EditorMargins | null;
  customSnapshotMargins?: EditorMargins | null;
  sourceMargins?: EditorMargins | null;
  userMargins?: EditorMargins | null;
  fallback?: EditorMargins;
}): EditorMargins {
  if (compositionMargins) return compositionMargins;
  if (customSnapshotMargins) return customSnapshotMargins;
  if (sourceMargins) return sourceMargins;
  if (userMargins && !sameMargins(userMargins, MARGIN_PRESETS.normal)) return userMargins;
  return fallback;
}
