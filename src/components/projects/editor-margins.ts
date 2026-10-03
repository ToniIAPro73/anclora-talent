import { MARGIN_PRESETS } from '@/lib/projects/page-calculator';

export interface EditorMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const sameMargins = (left: EditorMargins, right: EditorMargins) =>
  left.top === right.top &&
  left.bottom === right.bottom &&
  left.left === right.left &&
  left.right === right.right;

/**
 * Source geometry is the initial baseline. Once the writer chooses a non-default
 * editor preset, the persisted user override must win on subsequent chapter opens.
 */
export function resolveEditorMargins({
  compositionMargins,
  sourceMargins,
  userMargins,
  fallback = MARGIN_PRESETS.normal,
}: {
  compositionMargins?: EditorMargins | null;
  sourceMargins?: EditorMargins;
  userMargins?: EditorMargins;
  fallback?: EditorMargins;
}): EditorMargins {
  if (compositionMargins) return compositionMargins;
  if (userMargins && !sameMargins(userMargins, MARGIN_PRESETS.normal)) return userMargins;
  return sourceMargins ?? userMargins ?? fallback;
}
