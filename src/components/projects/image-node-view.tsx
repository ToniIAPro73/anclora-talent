'use client';

import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { X, AlignLeft, AlignCenter, AlignRight, Move, ArrowUp, ArrowDown, Anchor } from 'lucide-react';
import {
  alignedFloatingX,
  clampFloatingPosition,
  moveSelectedImage,
  type FloatingBox,
  type ImageAlign,
} from './image-position';

export const ImageNodeView = ({
  node,
  updateAttributes,
  selected,
  deleteNode,
  editor,
}: NodeViewProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  // Live values while a gesture is in progress; committed once on release so
  // each resize/move is a single undoable transaction.
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const moveStartRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });

  const mode = node.attrs.mode === 'floating' ? 'floating' : 'inline';
  const floating = mode === 'floating';
  const width = liveSize?.width ?? node.attrs.width ?? '100%';
  const height = liveSize?.height ?? node.attrs.height ?? 'auto';
  const align = (node.attrs.align || 'center') as ImageAlign;
  const x = livePos?.x ?? Number(node.attrs.x ?? 0);
  const y = livePos?.y ?? Number(node.attrs.y ?? 0);

  const measureBox = useCallback((): FloatingBox | null => {
    const root = rootRef.current;
    const box = containerRef.current;
    const surface = root?.closest('.ProseMirror') as HTMLElement | null;
    if (!root || !box || !surface) return null;
    const surfaceRect = surface.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    return {
      containerWidth: surface.clientWidth,
      containerHeight: surface.clientHeight,
      width: box.offsetWidth,
      height: box.offsetHeight,
      // The offset is applied to the inner box, so this wrapper always sits
      // at the image's natural (anchor) slot.
      naturalLeft: rootRect.left - surfaceRect.left,
      naturalTop: rootRect.top - surfaceRect.top,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      setIsResizing(true);
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: containerRef.current?.offsetWidth || 0,
        height: containerRef.current?.offsetHeight || 0,
      };
      e.preventDefault();
    }
  }, []);

  const handleMoveStart = useCallback((e: React.PointerEvent) => {
    if (!floating) return;
    setIsMoving(true);
    moveStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      x: Number(node.attrs.x ?? 0),
      y: Number(node.attrs.y ?? 0),
    };
    e.preventDefault();
    e.stopPropagation();
  }, [floating, node.attrs.x, node.attrs.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const deltaX = e.clientX - startPosRef.current.x;
      const aspectRatio = startPosRef.current.width / startPosRef.current.height;
      const newWidth = Math.max(100, startPosRef.current.width + deltaX);
      setLiveSize({ width: newWidth, height: newWidth / aspectRatio });
    } else if (isMoving) {
      const box = measureBox();
      const next = {
        x: moveStartRef.current.x + (e.clientX - moveStartRef.current.pointerX),
        y: moveStartRef.current.y + (e.clientY - moveStartRef.current.pointerY),
      };
      setLivePos(box ? clampFloatingPosition(next.x, next.y, box) : next);
    }
  }, [isResizing, isMoving, measureBox]);

  const handleMouseUp = useCallback(() => {
    if (isResizing && liveSize) updateAttributes(liveSize);
    if (isMoving && livePos) updateAttributes(livePos);
    setLiveSize(null);
    setLivePos(null);
    setIsResizing(false);
    setIsMoving(false);
  }, [isResizing, isMoving, liveSize, livePos, updateAttributes]);

  React.useEffect(() => {
    if (isResizing || isMoving) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('pointermove', handleMouseMove);
      document.addEventListener('pointerup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('pointermove', handleMouseMove);
        document.removeEventListener('pointerup', handleMouseUp);
      };
    }
  }, [isResizing, isMoving, handleMouseMove, handleMouseUp]);

  const setAlign = (next: ImageAlign) => {
    if (!floating) {
      updateAttributes({ align: next });
      return;
    }
    // Floating: alignment only sets the initial x offset (y is untouched).
    const box = measureBox();
    updateAttributes({ align: next, ...(box ? { x: alignedFloatingX(next, box) } : {}) });
  };

  const setMode = (next: 'inline' | 'floating') => {
    updateAttributes(next === 'floating' ? { mode: 'floating', x: 0, y: 0 } : { mode: 'inline', x: 0, y: 0 });
  };

  const alignmentClasses = {
    left: 'float-left mr-6 mb-4',
    center: 'block mx-auto mb-4',
    right: 'float-right ml-6 mb-4',
  };

  return (
    <NodeViewWrapper
      as="div"
      className={`relative ${!floating && align === 'center' ? 'clear-both' : ''}`}
      data-image-mode={mode}
      data-image-anchor={node.attrs.anchor || 'block'}
      data-image-align={align}
      data-image-x={floating ? x : undefined}
      data-image-y={floating ? y : undefined}
    >
      <div ref={rootRef} className="relative">
      <div
        ref={containerRef}
        className={`relative inline-block group ${
          floating ? 'mb-4' : alignmentClasses[align as keyof typeof alignmentClasses]
        } ${selected ? 'ring-2 ring-[var(--accent)]' : ''}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : 'auto',
          maxWidth: floating ? 'none' : '100%',
          height: typeof height === 'number' ? `${height}px` : 'auto',
          ...(floating ? { position: 'relative', left: `${x}px`, top: `${y}px`, zIndex: 1 } : {}),
        }}
        onMouseDown={handleMouseDown}
        data-testid="image-node-box"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiptap node view with dynamic data URLs and manual resize; next/image is not applicable here */}
        <img
          src={node.attrs.src}
          alt={node.attrs.alt}
          className="w-full h-full object-cover rounded-[8px]"
          draggable={false}
        />

        {/* Resize handle - visible on hover or when selected */}
        {selected && !isResizing && (
          <div
            className="resize-handle absolute bottom-0 right-0 w-5 h-5 bg-[var(--accent)] rounded-tl-[6px] cursor-se-resize opacity-80 hover:opacity-100 flex items-center justify-center text-[var(--button-highlight-fg)] text-xs font-bold"
            title="Arrastra para redimensionar"
          >
            ⤡
          </div>
        )}

        {/* Selection indicator */}
        {selected && (
          <div className="absolute inset-0 border-2 border-[var(--accent)] rounded-[8px] pointer-events-none" />
        )}

        {/* Drag handle: native drag/drop reorder (inline) or pointer move (floating) */}
        {selected && (
          <div
            {...(floating ? { onPointerDown: handleMoveStart } : { 'data-drag-handle': '' })}
            className={`absolute top-0 left-0 w-5 h-5 bg-[var(--accent)] rounded-br-[6px] flex items-center justify-center text-[var(--button-highlight-fg)] ${
              floating ? 'cursor-move touch-none' : 'cursor-grab'
            }`}
            data-testid="image-node-drag-handle"
            title={floating ? 'Arrastra para posicionar' : 'Arrastra para mover entre párrafos'}
          >
            <Move className="h-3 w-3" />
          </div>
        )}

        {/* Controls - visible when selected */}
        {selected && (
          <div className="absolute -top-10 left-0 right-0 flex items-center gap-1 bg-[#111C28] rounded-[6px] border border-[var(--border-subtle)] px-2 py-1.5 flex-wrap z-10">
            <button
              className={`p-1 rounded-[4px] transition text-sm ${
                align === 'left'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent-text)]'
                  : 'hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)]'
              }`}
              onClick={() => setAlign('left')}
              data-testid="image-node-align-left-button"
              title="Alinear izquierda (texto fluye a la derecha)"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              className={`p-1 rounded-[4px] transition text-sm ${
                align === 'center'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent-text)]'
                  : 'hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)]'
              }`}
              onClick={() => setAlign('center')}
              data-testid="image-node-align-center-button"
              title="Centrar (sin texto alrededor)"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              className={`p-1 rounded-[4px] transition text-sm ${
                align === 'right'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent-text)]'
                  : 'hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)]'
              }`}
              onClick={() => setAlign('right')}
              data-testid="image-node-align-right-button"
              title="Alinear derecha (texto fluye a la izquierda)"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <div className="h-4 w-px bg-[var(--border-subtle)] mx-0.5" />
            <button
              className={`p-1 rounded-[4px] transition text-sm ${
                floating
                  ? 'bg-[var(--accent)]/20 text-[var(--accent-text)]'
                  : 'hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)]'
              }`}
              onClick={() => setMode(floating ? 'inline' : 'floating')}
              data-testid="image-node-mode-toggle-button"
              aria-pressed={floating}
              title={floating ? 'Posicionada (anclada al bloque). Pulsa para volver al flujo' : 'En línea. Pulsa para posicionar libremente'}
            >
              <Anchor className="h-3.5 w-3.5" />
            </button>
            {!floating && (
              <>
                <button
                  className="p-1 rounded-[4px] transition text-sm hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)]"
                  onClick={() => moveSelectedImage(editor, -1)}
                  data-testid="image-node-move-up-button"
                  title="Mover antes del bloque anterior"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 rounded-[4px] transition text-sm hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)]"
                  onClick={() => moveSelectedImage(editor, 1)}
                  data-testid="image-node-move-down-button"
                  title="Mover después del bloque siguiente"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <div className="h-4 w-px bg-[var(--border-subtle)] mx-0.5" />
            <button
              className="p-1 hover:bg-red-500/20 rounded-[4px] transition text-red-500"
              onClick={deleteNode}
              data-testid="image-node-delete-button"
              title="Eliminar imagen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      </div>
    </NodeViewWrapper>
  );
};
