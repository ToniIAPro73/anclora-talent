/**
 * Cover Studio v2 — non-interactive DOM/CSS preview renderer (Fase G,
 * mission §45-47). Same model the editor canvas and the structured server
 * renderer read (`DesignSurface`/`DesignLayer[]`), rendered as plain
 * absolutely-positioned DOM nodes scaled by percentage of the surface's own
 * pixel dimensions — no dependency on Fabric/canvas, so it drops into the
 * dashboard/preview-modal/PDF-preview React tree exactly like the legacy
 * `CoverPreview`/`BackCoverPreview` it sits alongside. Never renders guides,
 * safe area, or the ISBN helper area — those are editor-only overlays.
 */

import type { CSSProperties } from 'react';
import { fabricCharSpacingToCss, type BackgroundSpec, type DesignLayer, type DesignSurface } from '@/lib/projects/design-surface';

function backgroundStyle(background: BackgroundSpec): CSSProperties {
  if (background.kind === 'solid') {
    return { backgroundColor: background.color };
  }
  if (background.kind === 'gradient') {
    const stops = background.stops.map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`).join(', ');
    return { backgroundImage: `linear-gradient(${background.angle}deg, ${stops})` };
  }
  return {};
}

function BackgroundImageLayer({ background }: { background: Extract<BackgroundSpec, { kind: 'image' }> }) {
  if (!background.src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={background.src}
      alt=""
      className="absolute inset-0 h-full w-full"
      style={{
        objectFit: background.fit === 'contain' ? 'contain' : 'cover',
        opacity: background.opacity,
        filter: background.filters?.grayscale ? 'grayscale(1)' : undefined,
      }}
      data-testid="design-surface-renderer-background-image"
    />
  );
}

function layerBoxStyle(layer: DesignLayer, surface: DesignSurface): CSSProperties {
  return {
    position: 'absolute',
    left: `${(layer.x / surface.width) * 100}%`,
    top: `${(layer.y / surface.height) * 100}%`,
    width: `${(layer.width / surface.width) * 100}%`,
    height: `${(layer.height / surface.height) * 100}%`,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    transformOrigin: 'top left',
    opacity: layer.opacity,
  };
}

function TextLayerView({ layer, surface }: { layer: Extract<DesignLayer, { type: 'text' }>; surface: DesignSurface }) {
  const text =
    layer.textTransform === 'uppercase' ? layer.content.toUpperCase() : layer.textTransform === 'lowercase' ? layer.content.toLowerCase() : layer.content;

  return (
    <div
      style={{
        ...layerBoxStyle(layer, surface),
        color: layer.color,
        fontFamily: layer.fontFamily,
        fontSize: `${layer.fontSize}px`,
        fontWeight: layer.fontWeight,
        fontStyle: layer.fontStyle,
        textDecoration: layer.textDecoration,
        textAlign: layer.textAlign,
        lineHeight: layer.lineHeight,
        letterSpacing: `${fabricCharSpacingToCss(layer.letterSpacing, layer.fontSize)}px`,
        display: 'flex',
        alignItems: layer.verticalAlign === 'top' ? 'flex-start' : layer.verticalAlign === 'bottom' ? 'flex-end' : 'center',
        justifyContent: layer.textAlign === 'left' ? 'flex-start' : layer.textAlign === 'right' ? 'flex-end' : 'center',
        whiteSpace: 'pre-wrap',
      }}
      data-testid={`design-surface-renderer-text-${layer.id}`}
    >
      {text}
    </div>
  );
}

function ImageLayerView({ layer, surface }: { layer: Extract<DesignLayer, { type: 'image' }>; surface: DesignSurface }) {
  if (!layer.src) return null;
  return (
    <div style={{ ...layerBoxStyle(layer, surface), overflow: 'hidden' }} data-testid={`design-surface-renderer-image-${layer.id}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={layer.src}
        alt=""
        className="h-full w-full"
        style={{
          objectFit: layer.fit,
          filter: [layer.filters?.grayscale ? 'grayscale(1)' : '', typeof layer.filters?.brightness === 'number' ? `brightness(${1 + layer.filters.brightness})` : '', typeof layer.filters?.contrast === 'number' ? `contrast(${1 + layer.filters.contrast})` : '']
            .filter(Boolean)
            .join(' ') || undefined,
        }}
      />
    </div>
  );
}

function ShapeLayerView({ layer, surface }: { layer: Extract<DesignLayer, { type: 'shape' }>; surface: DesignSurface }) {
  return (
    <div
      style={{
        ...layerBoxStyle(layer, surface),
        backgroundColor: layer.fill,
        border: layer.stroke ? `${layer.strokeWidth ?? 1}px solid ${layer.stroke}` : undefined,
        borderRadius: layer.shape === 'ellipse' ? '50%' : undefined,
      }}
      data-testid={`design-surface-renderer-shape-${layer.id}`}
    />
  );
}

export function DesignSurfaceRenderer({ surface, className }: { surface: DesignSurface; className?: string }) {
  const sortedLayers = [...surface.layers].filter((layer) => layer.visible !== false).sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ aspectRatio: `${surface.width} / ${surface.height}`, ...backgroundStyle(surface.background) }}
      data-testid="design-surface-renderer"
    >
      {surface.background.kind === 'image' && <BackgroundImageLayer background={surface.background} />}
      {sortedLayers.map((layer) => {
        if (layer.type === 'text') return <TextLayerView key={layer.id} layer={layer} surface={surface} />;
        if (layer.type === 'image') return <ImageLayerView key={layer.id} layer={layer} surface={surface} />;
        return <ShapeLayerView key={layer.id} layer={layer} surface={surface} />;
      })}
    </div>
  );
}
