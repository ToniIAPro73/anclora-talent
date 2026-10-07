import type { DesignLayer } from '@/lib/projects/design-surface';

/**
 * Normalizes a patch coming from the canvas or the properties form before it is applied.
 *
 * - Fabric reports `content` on EVERY move/resize (it reads `object.text`), and for a layer with a
 *   text transform that string is the transformed one ("MARÍA VEGA"). Those are not edits: the
 *   content is dropped from the patch unless the user really changed it.
 * - A real edit of a role slot (title/subtitle/author/...) becomes a cover-specific override
 *   (`source: 'manual'`): it outranks the manuscript value, so changing template or reloading never
 *   resets it. "Sync from metadata" passes `source: 'metadata'` explicitly and is left alone.
 */
export function normalizeLayerPatch(layer: DesignLayer, patch: Partial<DesignLayer>): Partial<DesignLayer> {
  if (layer.type !== 'text' || !('content' in patch) || typeof patch.content !== 'string') return patch;

  const content = patch.content;
  const isTransformArtifact =
    content === layer.content ||
    (layer.textTransform === 'uppercase' && content === layer.content.toUpperCase()) ||
    (layer.textTransform === 'lowercase' && content === layer.content.toLowerCase());

  const rest = { ...patch } as Record<string, unknown>;
  if (isTransformArtifact) {
    delete rest.content;
    return rest as Partial<DesignLayer>;
  }
  if (layer.role !== 'free' && !('source' in patch)) rest.source = 'manual';
  return rest as Partial<DesignLayer>;
}
