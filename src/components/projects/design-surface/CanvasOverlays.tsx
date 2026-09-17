'use client';

/**
 * Cover Studio v2 — guides, safe area and grid (mission §14, §17-18). Pure
 * DOM/CSS overlay on top of the canvas element, deliberately never touching
 * the Fabric canvas itself — this is what makes "guides/safe-area/grid are
 * never exported" true by construction rather than by an export-time filter
 * that could regress.
 */

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { DesignGuide, DesignSurface, SafeAreaSpec } from '@/lib/projects/design-surface';

export type GridDensity = 'none' | 'fine' | 'medium';

const GRID_SPACING: Record<Exclude<GridDensity, 'none'>, number> = {
  fine: 10,
  medium: 25,
};

export interface CanvasOverlaysCopy {
  addVerticalGuideLabel: string;
  addHorizontalGuideLabel: string;
  removeGuideLabel: string;
  clearGuidesLabel?: string;
}

export interface CanvasOverlaysProps {
  width: number;
  height: number;
  zoom: number;
  guides: DesignGuide[];
  onGuidesChange: (guides: DesignGuide[]) => void;
  safeArea?: SafeAreaSpec;
  showSafeArea: boolean;
  /** Back-cover only, helper (mission §39) — never rendered on export. */
  isbnArea?: DesignSurface['isbnArea'];
  grid: GridDensity;
  copy: CanvasOverlaysCopy;
}

function GuideLine({
  guide,
  length,
  zoom,
  onMove,
  onRemove,
  removeLabel,
}: {
  guide: DesignGuide;
  length: number;
  zoom: number;
  onMove: (position: number) => void;
  onRemove: () => void;
  removeLabel: string;
}) {
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const raw = guide.axis === 'x' ? event.clientX - rect.left : event.clientY - rect.top;
    onMove(Math.round(raw / zoom));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  const isVertical = guide.axis === 'x';

  return (
    <div
      data-testid={`design-guide-${guide.id}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={onRemove}
      title={removeLabel}
      className="group absolute cursor-move"
      style={
        isVertical
          ? { left: guide.position * zoom - 4, top: 0, width: 9, height: length * zoom }
          : { top: guide.position * zoom - 4, left: 0, height: 9, width: length * zoom }
      }
    >
      {/* Visual 1px guide line */}
      <div
        className="pointer-events-none absolute bg-[#a855f7] group-hover:bg-[#c084fc]"
        style={
          isVertical
            ? { left: 4, top: 0, width: 1, height: '100%' }
            : { top: 4, left: 0, height: 1, width: '100%' }
        }
      />
      <button
        type="button"
        data-testid={`design-guide-remove-${guide.id}`}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        aria-label={removeLabel}
        className="pointer-events-auto absolute -left-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-[#a855f7] text-white shadow-md group-hover:flex hover:bg-red-500"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function CanvasOverlays({ width, height, zoom, guides, onGuidesChange, safeArea, showSafeArea, isbnArea, grid, copy }: CanvasOverlaysProps) {
  const addGuide = (axis: 'x' | 'y') => {
    const id = `guide-${axis}-${Date.now()}`;
    const position = axis === 'x' ? Math.round(width / 2) : Math.round(height / 2);
    onGuidesChange([...guides, { id, axis, position }]);
  };

  const moveGuide = (id: string, position: number) => {
    onGuidesChange(guides.map((guide) => (guide.id === id ? { ...guide, position } : guide)));
  };

  const removeGuide = (id: string) => {
    onGuidesChange(guides.filter((guide) => guide.id !== id));
  };

  return (
    <div className="pointer-events-none absolute inset-0" style={{ width: width * zoom, height: height * zoom }}>
      {grid !== 'none' && (
        <div
          data-testid={`canvas-grid-${grid}`}
          className="absolute inset-0"
          style={{
            backgroundSize: `${GRID_SPACING[grid] * zoom}px ${GRID_SPACING[grid] * zoom}px`,
            backgroundImage:
              'linear-gradient(to right, color-mix(in srgb, var(--border-subtle) 60%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border-subtle) 60%, transparent) 1px, transparent 1px)',
          }}
        />
      )}

      {showSafeArea && safeArea && (
        <div
          data-testid="canvas-safe-area"
          className="absolute border border-dashed border-[var(--warning)]"
          style={{
            left: safeArea.left * zoom,
            top: safeArea.top * zoom,
            right: safeArea.right * zoom,
            bottom: safeArea.bottom * zoom,
          }}
        />
      )}

      {isbnArea && (
        <div
          data-testid="canvas-isbn-area"
          className="absolute flex items-center justify-center border border-dashed border-[var(--text-tertiary)] bg-[color-mix(in_srgb,var(--surface-soft)_70%,transparent)] text-[9px] uppercase tracking-wide text-[var(--text-tertiary)]"
          style={{
            left: isbnArea.x * zoom,
            top: isbnArea.y * zoom,
            width: isbnArea.width * zoom,
            height: isbnArea.height * zoom,
          }}
        >
          ISBN
        </div>
      )}

      <div className="pointer-events-auto absolute inset-0">
        {guides.map((guide) => (
          <GuideLine
            key={guide.id}
            guide={guide}
            length={guide.axis === 'x' ? height : width}
            zoom={zoom}
            onMove={(position) => moveGuide(guide.id, position)}
            onRemove={() => removeGuide(guide.id)}
            removeLabel={copy.removeGuideLabel}
          />
        ))}
      </div>

      <div className="pointer-events-auto absolute -top-9 right-0 flex items-center gap-1.5">
        {guides.length > 0 && (
          <button
            type="button"
            data-testid="clear-guides-button"
            onClick={() => onGuidesChange([])}
            title={copy.clearGuidesLabel || 'Limpiar guías'}
            aria-label={copy.clearGuidesLabel || 'Limpiar guías'}
            className="ac-button ac-button--ghost ac-button--sm text-xs px-2"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {copy.clearGuidesLabel || 'Limpiar guías'}
          </button>
        )}
        <button
          type="button"
          data-testid="add-vertical-guide-button"
          onClick={() => addGuide('x')}
          title={copy.addVerticalGuideLabel}
          aria-label={copy.addVerticalGuideLabel}
          className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
        >
          <Plus className="h-3.5 w-3.5" />|
        </button>
        <button
          type="button"
          data-testid="add-horizontal-guide-button"
          onClick={() => addGuide('y')}
          title={copy.addHorizontalGuideLabel}
          aria-label={copy.addHorizontalGuideLabel}
          className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
        >
          <Plus className="h-3.5 w-3.5" />—
        </button>
      </div>
    </div>
  );
}
