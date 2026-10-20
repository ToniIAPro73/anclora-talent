import type { DesignSurface, DesignSurfaceKind } from './design-surface';

export interface CoverProofCheckpoint {
  id: string;
  name: string;
  createdAt: string;
  surface: DesignSurface;
}

export interface CollectionLayoutProfile {
  id: string;
  name: string;
  createdAt: string;
  layouts: Record<DesignSurfaceKind, {
    guides: Array<{ axis: 'x' | 'y'; position: number }>;
    safeArea?: { top: number; right: number; bottom: number; left: number };
    isbnArea?: { x: number; y: number; width: number; height: number };
    anchors: Array<{ role: 'title' | 'subtitle' | 'author'; x: number; y: number; width: number; height: number }>;
  }>;
}

const CHECKPOINT_LIMIT = 10;

export function checkpointStorageKey(projectId: string, surface: DesignSurfaceKind): string {
  return `anclora-talent:cover-checkpoints:v1:${projectId}:${surface}`;
}

export function profileStorageKey(): string {
  return 'anclora-talent:collection-layout-profiles:v1';
}

export function createCoverProofCheckpoint(name: string, surface: DesignSurface, now = new Date()): CoverProofCheckpoint {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Enter a name for this checkpoint.');
  return { id: crypto.randomUUID(), name: cleanName, createdAt: now.toISOString(), surface: structuredClone(surface) };
}

export function appendCoverProofCheckpoint(checkpoints: CoverProofCheckpoint[], checkpoint: CoverProofCheckpoint): CoverProofCheckpoint[] {
  return [checkpoint, ...checkpoints].slice(0, CHECKPOINT_LIMIT);
}

function normalizedSurfaceLayout(surface: DesignSurface): CollectionLayoutProfile['layouts'][DesignSurfaceKind] {
  const roleLayers = surface.layers.filter((layer): layer is typeof layer & { type: 'text'; role: 'title' | 'subtitle' | 'author' } =>
    layer.type === 'text' && ['title', 'subtitle', 'author'].includes(layer.role),
  );
  return {
    guides: (surface.guides ?? []).map(({ axis, position }) => ({ axis, position: position / (axis === 'x' ? surface.width : surface.height) })),
    ...(surface.safeArea ? { safeArea: {
      top: surface.safeArea.top / surface.height,
      right: surface.safeArea.right / surface.width,
      bottom: surface.safeArea.bottom / surface.height,
      left: surface.safeArea.left / surface.width,
    } } : {}),
    ...(surface.isbnArea ? { isbnArea: {
      x: surface.isbnArea.x / surface.width,
      y: surface.isbnArea.y / surface.height,
      width: surface.isbnArea.width / surface.width,
      height: surface.isbnArea.height / surface.height,
    } } : {}),
    anchors: roleLayers.map((layer) => ({
      role: layer.role,
      x: layer.x / surface.width,
      y: layer.y / surface.height,
      width: layer.width / surface.width,
      height: layer.height / surface.height,
    })),
  };
}

export function createCollectionLayoutProfile(name: string, cover: DesignSurface, backCover: DesignSurface, now = new Date()): CollectionLayoutProfile {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Enter a name for this collection profile.');
  return {
    id: crypto.randomUUID(), name: cleanName, createdAt: now.toISOString(),
    layouts: { cover: normalizedSurfaceLayout(cover), 'back-cover': normalizedSurfaceLayout(backCover) },
  };
}

export function applyCollectionLayoutProfile(profile: CollectionLayoutProfile, surface: DesignSurface): DesignSurface {
  const layout = profile.layouts[surface.surface];
  const axisSize = (axis: 'x' | 'y') => axis === 'x' ? surface.width : surface.height;
  const guides = layout.guides.map((guide) => ({ ...guide, id: crypto.randomUUID(), position: Math.round(guide.position * axisSize(guide.axis)) }));
  const safeArea = layout.safeArea ? {
    top: Math.round(layout.safeArea.top * surface.height), right: Math.round(layout.safeArea.right * surface.width),
    bottom: Math.round(layout.safeArea.bottom * surface.height), left: Math.round(layout.safeArea.left * surface.width),
  } : undefined;
  const isbnArea = layout.isbnArea ? {
    x: Math.round(layout.isbnArea.x * surface.width), y: Math.round(layout.isbnArea.y * surface.height),
    width: Math.round(layout.isbnArea.width * surface.width), height: Math.round(layout.isbnArea.height * surface.height),
  } : undefined;
  const anchors = new Map(layout.anchors.map((anchor) => [anchor.role, anchor]));
  const layers = surface.layers.map((layer) => {
    if (layer.type !== 'text' || !['title', 'subtitle', 'author'].includes(layer.role)) return layer;
    const anchor = anchors.get(layer.role as 'title' | 'subtitle' | 'author');
    return anchor ? {
      ...layer, x: Math.round(anchor.x * surface.width), y: Math.round(anchor.y * surface.height),
      width: Math.round(anchor.width * surface.width), height: Math.round(anchor.height * surface.height),
    } : layer;
  });
  return { ...surface, guides, ...(safeArea ? { safeArea } : {}), ...(isbnArea ? { isbnArea } : {}), layers };
}

export function resizeDesignSurface(surface: DesignSurface, width: number, height: number, mode: 'scale' | 'stretch' | 'anchor', anchorX: 'left' | 'center' | 'right' = 'center', anchorY: 'top' | 'center' | 'bottom' = 'center'): DesignSurface {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 100 || height < 100 || width > 10000 || height > 10000) {
    throw new Error('Canvas dimensions must be whole numbers between 100 and 10,000 pixels.');
  }
  const scaleX = width / surface.width;
  const scaleY = height / surface.height;
  const sx = mode === 'scale' ? Math.min(scaleX, scaleY) : mode === 'stretch' ? scaleX : 1;
  const sy = mode === 'scale' ? Math.min(scaleX, scaleY) : mode === 'stretch' ? scaleY : 1;
  const horizontalDelta = width - surface.width;
  const verticalDelta = height - surface.height;
  const dx = mode === 'scale' ? (width - surface.width * sx) / 2 : mode === 'anchor' ? (anchorX === 'right' ? horizontalDelta : anchorX === 'center' ? horizontalDelta / 2 : 0) : 0;
  const dy = mode === 'scale' ? (height - surface.height * sy) / 2 : mode === 'anchor' ? (anchorY === 'bottom' ? verticalDelta : anchorY === 'center' ? verticalDelta / 2 : 0) : 0;
  return {
    ...surface, width, height,
    layers: surface.layers.map((layer) => ({ ...layer, x: Math.round(layer.x * sx + dx), y: Math.round(layer.y * sy + dy), width: Math.round(layer.width * sx), height: Math.round(layer.height * sy) })),
    guides: (surface.guides ?? []).map((guide) => ({ ...guide, position: Math.round(guide.position * (guide.axis === 'x' ? sx : sy) + (guide.axis === 'x' ? dx : dy)) })),
    ...(surface.safeArea ? { safeArea: { top: Math.round(surface.safeArea.top * sy), right: Math.round(surface.safeArea.right * sx), bottom: Math.round(surface.safeArea.bottom * sy), left: Math.round(surface.safeArea.left * sx) } } : {}),
    ...(surface.isbnArea ? { isbnArea: { x: Math.round(surface.isbnArea.x * sx + dx), y: Math.round(surface.isbnArea.y * sy + dy), width: Math.round(surface.isbnArea.width * sx), height: Math.round(surface.isbnArea.height * sy) } } : {}),
  };
}

export function findDesignSurfaceOverflows(surface: DesignSurface): string[] {
  return surface.layers.filter((layer) => layer.visible && (layer.x < 0 || layer.y < 0 || layer.x + layer.width > surface.width || layer.y + layer.height > surface.height)).map((layer) => layer.name || layer.id);
}
