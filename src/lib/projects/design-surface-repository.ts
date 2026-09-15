/**
 * Cover Studio v2 — capability contract (mission §60).
 *
 * The ONLY place that reads a project's cover/back-cover design. Every
 * consumer (editors, preview, export) must go through `getCoverDesign()`/
 * `getBackCoverDesign()` instead of touching `project.cover.surfaceState`
 * directly, so lazy v1→v2 migration and metadata-sync hydration happen
 * exactly once, consistently, everywhere.
 */

import {
  createEmptyDesignSurface,
  isDesignSurfaceV2,
  migrateLegacySurfaceState,
  resolveCoverText,
  type CoverTextField,
  type DesignLayer,
  type DesignSurface,
  type TextLayerProps,
} from './design-surface';
import type { SurfaceState } from './cover-surface';
import type { BackCoverDesign, CoverDesign, ProjectRecord } from './types';

function isTextLayer(layer: DesignLayer): layer is DesignLayer & TextLayerProps {
  return layer.type === 'text';
}

/**
 * Refreshes every non-manual role-tagged text layer's content from the
 * metadata precedence chain (mission §40-41). A `source: 'manual'` layer is
 * never touched here — it only changes through the explicit "Actualizar
 * desde metadatos" confirm action. A `source: 'metadata'` layer always
 * mirrors the live resolved value, becoming visible once it has real
 * content (mirrors the old resolver's `syncedField` behavior).
 */
function hydrateMetadataLayers(surface: DesignSurface, project: ProjectRecord): DesignSurface {
  const syncableRoles: CoverTextField[] = ['title', 'subtitle', 'author'];

  const layers = surface.layers.map((layer): DesignLayer => {
    if (!isTextLayer(layer) || layer.source === 'manual') return layer;
    if (!syncableRoles.includes(layer.role as CoverTextField)) return layer;

    const resolved = resolveCoverText(project, layer.role as CoverTextField, layer);
    if (resolved.source === 'cover-manual') {
      // resolveCoverText only returns this when the layer itself was
      // already manual, which is excluded above — defensive no-op.
      return layer;
    }

    return {
      ...layer,
      content: resolved.value,
      visible: Boolean(resolved.value.trim()),
    };
  });

  return { ...surface, layers };
}

function coverMigrationContext(cover: CoverDesign) {
  return {
    palette: cover.palette,
    accentColor: cover.accentColor,
    backgroundImageUrl: cover.backgroundImageUrl,
    backgroundOpacity: undefined,
  };
}

function backCoverMigrationContext(backCover: BackCoverDesign, palette: CoverDesign['palette']) {
  return {
    palette,
    accentColor: backCover.accentColor,
    backgroundImageUrl: backCover.backgroundImageUrl,
    backgroundOpacity: undefined,
  };
}

function resolveSurface(
  persisted: DesignSurface | SurfaceState | null | undefined,
  surfaceKind: 'cover' | 'back-cover',
  migrationContext: Parameters<typeof migrateLegacySurfaceState>[2],
): DesignSurface {
  if (isDesignSurfaceV2(persisted)) return persisted;
  if (!persisted) return createEmptyDesignSurface(surfaceKind);
  return migrateLegacySurfaceState(persisted, surfaceKind, migrationContext);
}

/** Reads the project's cover as a `DesignSurface` — migrates and hydrates metadata lazily, never mutates `project`. */
export function getCoverDesign(project: ProjectRecord): DesignSurface {
  const surface = resolveSurface(project.cover.surfaceState, 'cover', coverMigrationContext(project.cover));
  return hydrateMetadataLayers(surface, project);
}

/** Reads the project's back cover as a `DesignSurface` — migrates and hydrates metadata lazily, never mutates `project`. */
export function getBackCoverDesign(project: ProjectRecord): DesignSurface {
  const surface = resolveSurface(
    project.backCover.surfaceState,
    'back-cover',
    backCoverMigrationContext(project.backCover, project.cover.palette),
  );
  return hydrateMetadataLayers(surface, project);
}
