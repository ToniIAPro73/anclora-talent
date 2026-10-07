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
import { BACK_COVER_TEMPLATES, DEFAULT_BACK_COVER_TEMPLATE_ID, normalizeBackTemplateId } from './cover-templates';
import { buildDesignSurfaceFromTemplate } from './design-surface-templates';
import type { SemanticBinding } from './design-surface-templates';
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
      // An empty slot is hidden; a slot that gains content shows. A slot that already had
      // content keeps the visibility the template/user gave it (a template may hide it on purpose).
      visible: resolved.value.trim() ? (layer.content.trim() ? layer.visible : true) : false,
    };
  });

  return { ...surface, layers };
}

/**
 * The manuscript content behind each semantic slot of a surface — the single input a
 * template needs to fill its Title/Subtitle/Author (cover) or Title/Body/Bio (back
 * cover) slots. Reuses the same precedence chain as hydration (`resolveCoverText`),
 * so applying a template and reloading the page can never disagree.
 */
export function buildSemanticBinding(project: ProjectRecord, surfaceKind: 'cover' | 'back-cover'): SemanticBinding {
  const title = resolveCoverText(project, 'title').value;
  if (surfaceKind === 'cover') {
    return {
      title,
      subtitle: resolveCoverText(project, 'subtitle').value,
      author: resolveCoverText(project, 'author').value,
    };
  }
  return {
    title,
    author: resolveCoverText(project, 'author').value,
    body: project.backCover?.body?.trim() ?? '',
    authorBio: project.backCover?.authorBio?.trim() ?? '',
  };
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

/**
 * A back cover nobody has designed yet: no stored v2 design, and no layers or manual field values in a legacy one.
 * Opening it must not show "no template" next to a ready-made composition, so it starts on the default back-cover template.
 */
function isUntouchedBackCover(persisted: DesignSurface | SurfaceState | null | undefined): boolean {
  if (isDesignSurfaceV2(persisted)) return false;
  if (!persisted) return true;
  const hasLayers = (persisted.layers ?? []).length > 0;
  const hasManualField = Object.values(persisted.fields ?? {}).some((field) => field?.source === 'manual');
  return !hasLayers && !hasManualField;
}

/** The default back-cover composition, with deterministic ids (server and client must render the very same layers). */
function buildDefaultBackCoverDesign(project: ProjectRecord): DesignSurface {
  const template = BACK_COVER_TEMPLATES.find((candidate) => candidate.id === DEFAULT_BACK_COVER_TEMPLATE_ID) ?? BACK_COVER_TEMPLATES[0];
  const built = buildDesignSurfaceFromTemplate(template, {
    palette: template.previewTone as 'obsidian' | 'teal' | 'sand',
    accentColor: project.backCover.accentColor,
    binding: buildSemanticBinding(project, 'back-cover'),
  });
  let decor = 0;
  return {
    ...built,
    layers: built.layers.map((layer) => ({
      ...layer,
      id: layer.type === 'text' ? `migrated-back-cover-${layer.role}` : `migrated-back-cover-decor-${decor++}`,
    })),
  };
}

/** Reads the project's back cover as a `DesignSurface` — migrates and hydrates metadata lazily, never mutates `project`. */
export function getBackCoverDesign(project: ProjectRecord): DesignSurface {
  const persisted = project.backCover.surfaceState;
  if (isUntouchedBackCover(persisted)) {
    return hydrateMetadataLayers(buildDefaultBackCoverDesign(project), project);
  }
  const surface = resolveSurface(persisted, 'back-cover', backCoverMigrationContext(project.backCover, project.cover.palette));
  // Designs saved with the first back-cover catalogue keep their layout; only their template id moves to the new namespace.
  const templateId = normalizeBackTemplateId(surface.templateId);
  return hydrateMetadataLayers(templateId === (surface.templateId ?? null) ? surface : { ...surface, templateId }, project);
}
