/**
 * Cover Studio v2 — canonical layered design model (Fase A).
 *
 * Replaces the fixed 3-5 field map (`SurfaceState`/`SurfaceLayer` in
 * `cover-surface.ts`) with a real, arbitrary, ordered layer array shared by
 * both Basic and Advanced editors (they edit the SAME `DesignSurface` —
 * never two models, see mission §3-4). `SurfaceState` keeps existing purely
 * as the legacy-on-disk shape `migrateLegacySurfaceState` reads from; no new
 * DB column/migration is introduced — the v2 shape is stored in the same
 * `cover_layers` JSON payload column (see `design-surface-repository.ts`).
 *
 * Coordinate space: layers are positioned in the surface's own logical
 * pixel space (`width`/`height`, default `COVER_SURFACE_CANVAS` = 400x600),
 * top-left anchored (`x`,`y` = top-left corner of the unrotated bounding
 * box), matching Fabric.js's default object origin — the interactive
 * engine (Fase B) hydrates Fabric objects directly from these fields with
 * no coordinate translation.
 */

import { randomUUID } from 'node:crypto';
import {
  normalizeSurfaceState,
  type SurfaceFieldKey,
  type SurfaceKind,
  type SurfaceLayer,
  type SurfaceState,
} from './cover-surface';
import { BACK_COVER_TEXT_LAYOUT, COVER_SURFACE_CANVAS, COVER_TEXT_LAYOUT } from './cover-layout';
import { fabricCharSpacingToCss } from './cover-layer-style';
import type { CoverDesign, ProjectRecord } from './types';

export type DesignSurfaceKind = SurfaceKind;

export interface DesignLayerBase {
  id: string;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  name?: string;
}

export type TextLayerRole = 'title' | 'subtitle' | 'author' | 'body' | 'authorBio' | 'free';

export interface TextLayerProps {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  textTransform: 'none' | 'uppercase' | 'lowercase';
  /** Ties a layer back to a synced metadata field; 'free' = user text box, never auto-synced (mission §6, §40-41). */
  role: TextLayerRole;
  /** Provenance for the sync-with-metadata confirm flow (mission §41). Only meaningful when role !== 'free'. */
  source: 'metadata' | 'manual';
}

export interface ImageLayerFilters {
  brightness?: number; // -1..1, 0 = unchanged (Fabric filters.Brightness convention)
  contrast?: number; // -1..1
  saturation?: number; // -1..1
  grayscale?: boolean;
  blur?: number; // 0..1
  sepia?: boolean;
}

export interface ImageLayerProps {
  type: 'image';
  src: string;
  fit: 'cover' | 'contain' | 'fill';
  crop?: { x: number; y: number; width: number; height: number };
  filters?: ImageLayerFilters;
  /** True for a layer seeded from an inherited original PDF page (mission §34-36) — never has a Talent overlay unless the user explicitly adds one. */
  isOriginalSource?: boolean;
}

export interface ShapeLayerProps {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'line';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type DesignLayer =
  | (DesignLayerBase & TextLayerProps)
  | (DesignLayerBase & ImageLayerProps)
  | (DesignLayerBase & ShapeLayerProps);

export type BackgroundSpec =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; angle: number; stops: Array<{ color: string; offset: number }> }
  | {
      kind: 'image';
      src: string;
      fit: 'cover' | 'contain';
      opacity: number;
      /** True when this is an inherited original-PDF page, never cropped/overlaid unless the user opts in (mission §34). */
      originalUncropped?: boolean;
    };

export interface SafeAreaSpec {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DesignGuide {
  id: string;
  axis: 'x' | 'y';
  position: number;
}

export type SurfaceOriginMode = 'blank' | 'use-original' | 'edit-original';

export interface DesignSurface {
  version: 2;
  surface: DesignSurfaceKind;
  width: number;
  height: number;
  background: BackgroundSpec;
  layers: DesignLayer[];
  safeArea?: SafeAreaSpec;
  /** Back-cover only, helper overlay — never rendered on export (mission §39). */
  isbnArea?: { x: number; y: number; width: number; height: number };
  /** User-created alignment guides — never exported (mission §14, §64). */
  guides?: DesignGuide[];
  /** Fase F: provenance when this surface can offer/uses an inherited original PDF page. */
  originAssetId?: string | null;
  originMode?: SurfaceOriginMode;
  /** Marks a design the user explicitly finalized (mission §43) — informational only, never blocks further edits. */
  status?: 'draft' | 'final';
}

const DEFAULT_PALETTE_COLORS: Record<CoverDesign['palette'], { primary: string; secondary: string; background: string }> = {
  obsidian: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)', background: '#0b133f' },
  teal: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)', background: '#124a50' },
  sand: { primary: '#0b313f', secondary: 'rgba(11,49,63,0.72)', background: '#f2e3b3' },
};

function newLayerId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

export function isDesignSurfaceV2(value: unknown): value is DesignSurface {
  return Boolean(value) && typeof value === 'object' && (value as { version?: unknown }).version === 2;
}

/** True width/height a fresh, empty surface should use — dimension presets (mission §48) pass a different size. */
export function defaultSurfaceDimensions(): { width: number; height: number } {
  return { width: COVER_SURFACE_CANVAS.width, height: COVER_SURFACE_CANVAS.height };
}

export function createEmptyDesignSurface(
  surface: DesignSurfaceKind,
  dimensions: { width: number; height: number } = defaultSurfaceDimensions(),
): DesignSurface {
  const palette = DEFAULT_PALETTE_COLORS.obsidian;
  return {
    version: 2,
    surface,
    width: dimensions.width,
    height: dimensions.height,
    background: { kind: 'solid', color: palette.background },
    layers: [],
    guides: [],
    originMode: 'blank',
    status: 'draft',
  };
}

/**
 * Converts a legacy `SurfaceState` (fixed field map) into a `DesignSurface`
 * (arbitrary layer array), reusing the exact geometry math
 * `surface-layer-style.ts#defaultFieldGeometry` already used for the DOM
 * renderer, so a migrated design lands in the same visual position a user
 * last saw it in. Applied lazily on read (mirrors `normalizeSurfaceState`'s
 * own lazy-normalize convention) — callers never need to migrate eagerly.
 */
export function migrateLegacySurfaceState(
  legacy: SurfaceState | Partial<SurfaceState> | null | undefined,
  surface: DesignSurfaceKind,
  context: { palette: CoverDesign['palette']; accentColor?: string | null; backgroundImageUrl?: string | null; backgroundOpacity?: number },
): DesignSurface {
  const state = normalizeSurfaceState({ surface, ...(legacy ?? {}) });
  const { width: canvasWidth, height: canvasHeight } = COVER_SURFACE_CANVAS;
  const palette = DEFAULT_PALETTE_COLORS[context.palette] ?? DEFAULT_PALETTE_COLORS.obsidian;

  const background: BackgroundSpec = context.backgroundImageUrl
    ? { kind: 'image', src: context.backgroundImageUrl, fit: 'cover', opacity: context.backgroundOpacity ?? state.opacity ?? 1 }
    : { kind: 'solid', color: palette.background };

  const fieldOrder: SurfaceFieldKey[] =
    surface === 'cover' ? ['title', 'subtitle', 'author'] : ['title', 'body', 'authorBio'];

  const layers: DesignLayer[] = [];
  let zIndex = 1;
  for (const fieldKey of fieldOrder) {
    const fieldState = state.fields[fieldKey];
    if (!fieldState) continue;

    const legacyLayer = (state.layers ?? []).find(
      (candidate): candidate is SurfaceLayer => candidate.type === 'text' && candidate.fieldKey === fieldKey,
    );
    const geometry = legacyFieldGeometry(fieldKey, surface, context.palette, context.accentColor);
    if (!geometry) continue;

    const fontSize = typeof legacyLayer?.fontSize === 'number' ? legacyLayer.fontSize : geometry.fontSize;
    const left = typeof legacyLayer?.left === 'number' ? legacyLayer.left : geometry.left;
    const top = typeof legacyLayer?.top === 'number' ? legacyLayer.top : geometry.top;
    const width = typeof legacyLayer?.width === 'number' ? legacyLayer.width : geometry.width;
    const originX = legacyLayer?.originX === 'left' ? 'left' : geometry.originX;
    // Legacy geometry anchors both axes at the vertical/horizontal CENTER of
    // the box (translate(-50%,-50%) in `layerStyleToCss`); the new model is
    // top-left anchored, so convert once here.
    const estimatedHeight = Math.max(fontSize * (legacyLayer?.lineHeight ?? geometry.lineHeight) * 1.4, fontSize * 1.4);
    const x = originX === 'center' ? left - width / 2 : left;
    const y = top - estimatedHeight / 2;

    layers.push({
      id: legacyLayer?.id || newLayerId(fieldKey),
      type: 'text',
      zIndex: zIndex++,
      x,
      y,
      width,
      height: estimatedHeight,
      rotation: 0,
      opacity: typeof legacyLayer?.opacity === 'number' ? legacyLayer.opacity : 1,
      visible: fieldState.visible,
      locked: false,
      content: fieldState.value,
      fontFamily: legacyLayer?.fontFamily?.trim() || 'DM Sans',
      fontSize,
      fontWeight: legacyLayer?.fontWeight ?? geometry.fontWeight,
      fontStyle: (legacyLayer?.fontStyle as 'normal' | 'italic') ?? 'normal',
      textDecoration: 'none',
      color: legacyLayer?.fill?.trim() || geometry.fill,
      letterSpacing: legacyLayer?.charSpacing ?? 0,
      lineHeight: legacyLayer?.lineHeight ?? geometry.lineHeight,
      textAlign: legacyLayer?.textAlign ?? geometry.textAlign,
      verticalAlign: 'middle',
      textTransform: geometry.uppercase ? 'uppercase' : 'none',
      role: fieldKey,
      source: fieldState.source ?? 'metadata',
    });
  }

  return {
    version: 2,
    surface,
    width: canvasWidth,
    height: canvasHeight,
    background,
    layers,
    guides: [],
    originMode: 'blank',
    status: 'draft',
  };
}

interface LegacyFieldGeometry {
  top: number;
  left: number;
  width: number;
  originX: 'left' | 'center';
  textAlign: 'left' | 'center' | 'right';
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  fill: string;
  uppercase?: boolean;
}

/** Ported 1:1 from `surface-layer-style.ts#defaultFieldGeometry` (kept private there) so migration lands in the same spot a user last saw their design. */
function legacyFieldGeometry(
  fieldKey: SurfaceFieldKey,
  surface: DesignSurfaceKind,
  palette: CoverDesign['palette'],
  accentColor?: string | null,
): LegacyFieldGeometry | null {
  const { width: canvasWidth, height: canvasHeight } = COVER_SURFACE_CANVAS;
  const colors = DEFAULT_PALETTE_COLORS[palette] ?? DEFAULT_PALETTE_COLORS.obsidian;

  if (surface === 'cover') {
    switch (fieldKey) {
      case 'title':
        return {
          top: COVER_TEXT_LAYOUT.titleTop * canvasHeight,
          left: canvasWidth / 2,
          width: COVER_TEXT_LAYOUT.titleWidth * canvasWidth,
          originX: 'center',
          textAlign: 'center',
          fontSize: COVER_TEXT_LAYOUT.titleFontSize,
          fontWeight: 900,
          lineHeight: COVER_TEXT_LAYOUT.titleLineHeight,
          fill: colors.primary,
        };
      case 'subtitle':
        return {
          top: COVER_TEXT_LAYOUT.subtitleTop * canvasHeight,
          left: canvasWidth / 2,
          width: COVER_TEXT_LAYOUT.subtitleWidth * canvasWidth,
          originX: 'center',
          textAlign: 'center',
          fontSize: COVER_TEXT_LAYOUT.subtitleFontSize,
          fontWeight: 500,
          lineHeight: 1.45,
          fill: colors.secondary,
        };
      case 'author':
        return {
          top: COVER_TEXT_LAYOUT.authorTop * canvasHeight,
          left: canvasWidth / 2,
          width: COVER_TEXT_LAYOUT.authorWidth * canvasWidth,
          originX: 'center',
          textAlign: 'center',
          fontSize: COVER_TEXT_LAYOUT.authorFontSize,
          fontWeight: 500,
          lineHeight: COVER_TEXT_LAYOUT.titleLineHeight,
          fill: colors.primary,
          uppercase: true,
        };
      default:
        return null;
    }
  }

  const accent = accentColor?.trim() || '#f2e3b3';
  switch (fieldKey) {
    case 'title':
      return {
        top: BACK_COVER_TEXT_LAYOUT.titleTop * canvasHeight,
        left: BACK_COVER_TEXT_LAYOUT.titleLeft * canvasWidth,
        width: BACK_COVER_TEXT_LAYOUT.titleWidth * canvasWidth,
        originX: 'left',
        textAlign: 'left',
        fontSize: BACK_COVER_TEXT_LAYOUT.titleFontSize,
        fontWeight: 900,
        lineHeight: BACK_COVER_TEXT_LAYOUT.titleLineHeight,
        fill: accent,
      };
    case 'body':
      return {
        top: BACK_COVER_TEXT_LAYOUT.bodyTop * canvasHeight,
        left: BACK_COVER_TEXT_LAYOUT.bodyLeft * canvasWidth,
        width: BACK_COVER_TEXT_LAYOUT.bodyWidth * canvasWidth,
        originX: 'left',
        textAlign: 'left',
        fontSize: BACK_COVER_TEXT_LAYOUT.bodyFontSize,
        fontWeight: 500,
        lineHeight: BACK_COVER_TEXT_LAYOUT.bodyLineHeight,
        fill: accent,
      };
    case 'authorBio':
      return {
        top: BACK_COVER_TEXT_LAYOUT.authorBioTop * canvasHeight,
        left: BACK_COVER_TEXT_LAYOUT.authorBioLeft * canvasWidth,
        width: BACK_COVER_TEXT_LAYOUT.authorBioWidth * canvasWidth,
        originX: 'left',
        textAlign: 'left',
        fontSize: BACK_COVER_TEXT_LAYOUT.authorBioFontSize,
        fontWeight: 400,
        lineHeight: BACK_COVER_TEXT_LAYOUT.authorBioLineHeight,
        fill: 'rgba(242,227,179,0.78)',
      };
    default:
      return null;
  }
}

/** letterSpacing is stored in fabric's thousandths-of-em convention throughout this codebase (see `cover-layer-style.ts`); re-exported here so consumers never need to import both modules for one concern. */
export { fabricCharSpacingToCss };

export function createDesignLayer(partial: Partial<DesignLayer> & Pick<DesignLayer, 'type'>, zIndex: number): DesignLayer {
  const base: DesignLayerBase = {
    id: newLayerId(partial.type),
    zIndex,
    x: partial.x ?? 40,
    y: partial.y ?? 40,
    width: partial.width ?? 200,
    height: partial.height ?? 60,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    name: partial.name,
  };

  if (partial.type === 'text') {
    return {
      ...base,
      type: 'text',
      content: partial.content ?? '',
      fontFamily: partial.fontFamily ?? 'DM Sans',
      fontSize: partial.fontSize ?? 24,
      fontWeight: partial.fontWeight ?? 500,
      fontStyle: partial.fontStyle ?? 'normal',
      textDecoration: partial.textDecoration ?? 'none',
      color: partial.color ?? '#f2e3b3',
      letterSpacing: partial.letterSpacing ?? 0,
      lineHeight: partial.lineHeight ?? 1.3,
      textAlign: partial.textAlign ?? 'left',
      verticalAlign: partial.verticalAlign ?? 'top',
      textTransform: partial.textTransform ?? 'none',
      role: partial.role ?? 'free',
      source: partial.source ?? 'manual',
    };
  }

  if (partial.type === 'image') {
    return {
      ...base,
      type: 'image',
      src: partial.src ?? '',
      fit: partial.fit ?? 'cover',
      crop: partial.crop,
      filters: partial.filters,
      isOriginalSource: partial.isOriginalSource,
    };
  }

  return {
    ...base,
    type: 'shape',
    shape: partial.shape ?? 'rect',
    fill: partial.fill,
    stroke: partial.stroke,
    strokeWidth: partial.strokeWidth,
  };
}

export type CoverTextField = 'title' | 'subtitle' | 'author';

export interface ResolvedCoverText {
  value: string;
  /**
   * Which tier of the precedence chain produced this value (mission §40):
   * user-confirmed cover data > confirmed document metadata > project
   * document field > project title > filename. 'none' when every tier was
   * empty (the field should stay blank, never a placeholder string).
   */
  source: 'cover-manual' | 'document-metadata' | 'document-field' | 'project-title' | 'filename' | 'none';
}

/**
 * Resolves the precedence chain for a cover text field. `existingLayer`,
 * when passed, represents a title/subtitle/author layer the surface
 * ALREADY has — if the user hand-edited it (`source: 'manual'`), that
 * value always wins and nothing below it is even consulted (mission §41:
 * never silently overwrite a manual edit). This is the single place that
 * decides "Mi proyecto" (an untouched `project.title`) must never win over
 * a confirmed document title — the concrete bug mission §40 reports.
 */
export function resolveCoverText(
  project: ProjectRecord,
  field: CoverTextField,
  existingLayer?: Pick<TextLayerProps, 'content' | 'source'> | null,
): ResolvedCoverText {
  if (existingLayer && existingLayer.source === 'manual' && existingLayer.content.trim()) {
    return { value: existingLayer.content, source: 'cover-manual' };
  }

  const metadataValue = project.document.metadata?.[field]?.trim();
  if (metadataValue) {
    return { value: metadataValue, source: 'document-metadata' };
  }

  const documentFieldValue = project.document[field]?.trim();
  if (documentFieldValue) {
    return { value: documentFieldValue, source: 'document-field' };
  }

  if (field === 'title') {
    const projectTitle = project.title?.trim();
    // A never-renamed project keeps Talent's own placeholder ("Mi
    // proyecto"/"Untitled project" etc.) as its title — that placeholder
    // must never surface as a cover title, only a real user-given title.
    if (projectTitle && !isProvisionalProjectTitle(projectTitle)) {
      return { value: projectTitle, source: 'project-title' };
    }

    const fileName = project.document.source?.fileName?.trim();
    if (fileName) {
      return { value: stripFileExtension(fileName), source: 'filename' };
    }
  }

  return { value: '', source: 'none' };
}

const PROVISIONAL_PROJECT_TITLE_RE = /^(mi proyecto|nuevo proyecto|untitled project|new project)$/i;

function isProvisionalProjectTitle(title: string): boolean {
  return PROVISIONAL_PROJECT_TITLE_RE.test(title.trim());
}

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
