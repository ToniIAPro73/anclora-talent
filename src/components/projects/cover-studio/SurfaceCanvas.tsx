'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  SurfaceFieldKey,
  SurfaceKind,
  SurfaceState,
} from '@/lib/projects/cover-surface';
import { COVER_SURFACE_CANVAS } from '@/lib/projects/cover-layout';
import { findSurfaceTextLayer } from '@/lib/projects/cover-layer-style';
import type { CoverDesign } from '@/lib/projects/types';
import {
  BACK_COVER_BACKGROUND,
  SURFACE_BACKGROUNDS,
  computeLayerStyle,
  layerStyleToCss,
  type LayerStyleContext,
} from './surface-layer-style';

const FIELD_RENDER_ORDER: Record<SurfaceKind, SurfaceFieldKey[]> = {
  cover: ['title', 'subtitle', 'author'],
  'back-cover': ['title', 'body', 'authorBio'],
};

type SurfaceCanvasProps = {
  surface: SurfaceKind;
  state: SurfaceState;
  palette: CoverDesign['palette'];
  accentColor?: string | null;
  backgroundImageUrl?: string | null;
  interactive?: boolean;
  selectedFieldKey?: SurfaceFieldKey | null;
  editingFieldKey?: SurfaceFieldKey | null;
  onSelectField?: (fieldKey: SurfaceFieldKey | null) => void;
  onEditField?: (fieldKey: SurfaceFieldKey | null) => void;
  onLayerGeometryChange?: (
    fieldKey: SurfaceFieldKey,
    geometry: { left: number; top: number },
  ) => void;
  onFieldTextChange?: (fieldKey: SurfaceFieldKey, value: string) => void;
};

/**
 * 100% DOM surface renderer. Text layers are absolutely positioned elements
 * laid out by the browser itself — no canvas text metrics involved — so a
 * long title can never be visually clipped: the element wraps and grows.
 * The same node is what `html-to-image` captures for the final export.
 */
export const SurfaceCanvas = forwardRef<HTMLDivElement, SurfaceCanvasProps>(
  function SurfaceCanvas(
    {
      surface,
      state,
      palette,
      accentColor,
      backgroundImageUrl,
      interactive = false,
      selectedFieldKey = null,
      editingFieldKey = null,
      onSelectField,
      onEditField,
      onLayerGeometryChange,
      onFieldTextChange,
    },
    surfaceRef,
  ) {
    const outerRef = useRef<HTMLDivElement>(null);
    const scalerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);
    const dragRef = useRef<{
      fieldKey: SurfaceFieldKey;
      pointerId: number;
      startX: number;
      startY: number;
      startLeft: number;
      startTop: number;
    } | null>(null);
    const [, setScaleVersion] = useState(0);

    const { width: canvasWidth, height: canvasHeight } = COVER_SURFACE_CANVAS;

    const applyScale = useCallback(
      (availableWidth: number) => {
        const scaler = scalerRef.current;
        const outer = outerRef.current;
        if (!scaler || !outer || availableWidth <= 0) return;
        const scale = availableWidth / canvasWidth;
        scaleRef.current = scale;
        scaler.style.transform = `scale(${scale})`;
        scaler.style.transformOrigin = 'top left';
        scaler.style.width = `${canvasWidth}px`;
        scaler.style.height = `${canvasHeight}px`;
        outer.style.height = `${canvasHeight * scale}px`;
        setScaleVersion((version) => version + 1);
      },
      [canvasWidth, canvasHeight],
    );

    useEffect(() => {
      const outer = outerRef.current;
      if (!outer) return;
      applyScale(outer.clientWidth);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) applyScale(entry.contentRect.width);
      });
      observer.observe(outer);
      return () => observer.disconnect();
    }, [applyScale]);

    const context: LayerStyleContext = { surface, palette, accentColor };
    const background =
      surface === 'cover' ? SURFACE_BACKGROUNDS[palette] : BACK_COVER_BACKGROUND;
    const opacity = state.opacity ?? (surface === 'back-cover' ? 0.24 : 1);

    const handlePointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
      fieldKey: SurfaceFieldKey,
      left: number,
      top: number,
    ) => {
      if (!interactive || editingFieldKey === fieldKey) return;
      onSelectField?.(fieldKey);
      dragRef.current = {
        fieldKey,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: left,
        startTop: top,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // jsdom and older browsers may not implement pointer capture.
      }
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const scale = scaleRef.current || 1;
      const nextLeft = drag.startLeft + (event.clientX - drag.startX) / scale;
      const nextTop = drag.startTop + (event.clientY - drag.startY) / scale;
      onLayerGeometryChange?.(drag.fieldKey, {
        left: Math.min(canvasWidth, Math.max(0, Math.round(nextLeft))),
        top: Math.min(canvasHeight, Math.max(0, Math.round(nextTop))),
      });
    };

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // jsdom and older browsers may not implement pointer capture.
      }
    };

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '680px',
          minWidth: 0,
        }}
      >
        <div
          ref={outerRef}
          style={{
            width: '100%',
            maxWidth: '420px',
            minWidth: 0,
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-strong)',
          }}
        >
          <div ref={scalerRef} style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
            <div
              ref={surfaceRef}
              data-testid={`${surface}-surface-canvas`}
              onPointerDown={() => onSelectField?.(null)}
              style={{
                position: 'relative',
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                overflow: 'hidden',
                background,
              }}
            >
              {backgroundImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={backgroundImageUrl}
                  alt=""
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity,
                  }}
                />
              ) : null}

              {surface === 'cover' ? (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: palette === 'sand' ? '#0b313f' : '#d4af37',
                  }}
                />
              ) : null}

              {FIELD_RENDER_ORDER[surface].map((fieldKey) => {
                const fieldState = state.fields[fieldKey];
                if (!fieldState?.visible || !fieldState.value.trim()) return null;

                const computed = computeLayerStyle(
                  fieldKey,
                  findSurfaceTextLayer(state.layers, fieldKey),
                  context,
                );
                if (!computed) return null;

                const isSelected = interactive && selectedFieldKey === fieldKey;
                const isEditing = interactive && editingFieldKey === fieldKey;
                const Tag = fieldKey === 'title' ? 'h1' : 'p';

                return (
                  <Tag
                    key={`${fieldKey}-${isEditing ? 'edit' : 'view'}`}
                    data-testid={`${surface}-layer-${fieldKey}`}
                    data-field-key={fieldKey}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    ref={(node: HTMLHeadingElement | HTMLParagraphElement | null) => {
                      if (node && isEditing) {
                        node.focus();
                      }
                    }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      handlePointerDown(event, fieldKey, computed.left, computed.top);
                    }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (interactive) {
                        onSelectField?.(fieldKey);
                        onEditField?.(fieldKey);
                      }
                    }}
                    onBlur={(event) => {
                      if (isEditing) {
                        onFieldTextChange?.(fieldKey, event.currentTarget.innerText);
                        onEditField?.(null);
                      }
                    }}
                    style={{
                      ...layerStyleToCss(computed),
                      cursor: interactive ? (isEditing ? 'text' : 'move') : 'default',
                      outline: isSelected
                        ? '1.5px solid var(--accent)'
                        : '1px solid transparent',
                      outlineOffset: '2px',
                      zIndex: isSelected ? 2 : 1,
                      touchAction: interactive ? 'none' : 'auto',
                    }}
                  >
                    {fieldState.value}
                  </Tag>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

SurfaceCanvas.displayName = 'SurfaceCanvas';
