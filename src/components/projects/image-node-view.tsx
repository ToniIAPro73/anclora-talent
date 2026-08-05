'use client';

import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { X, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export const ImageNodeView = ({
  node,
  updateAttributes,
  selected,
  deleteNode,
}: NodeViewProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const width = node.attrs.width || '100%';
  const height = node.attrs.height || 'auto';
  const align = node.attrs.align || 'center';

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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const deltaX = e.clientX - startPosRef.current.x;
    const aspectRatio =
      startPosRef.current.width / startPosRef.current.height;

    const newWidth = Math.max(100, startPosRef.current.width + deltaX);
    const newHeight = newWidth / aspectRatio;

    updateAttributes({
      width: newWidth,
      height: newHeight,
    });
  }, [isResizing, updateAttributes]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const alignmentClasses = {
    left: 'float-left mr-6 mb-4',
    center: 'block mx-auto mb-4',
    right: 'float-right ml-6 mb-4',
  };

  return (
    <NodeViewWrapper as="div" className={`relative ${align === 'center' ? 'clear-both' : ''}`}>
      <div
        ref={containerRef}
        className={`relative inline-block group ${alignmentClasses[align as keyof typeof alignmentClasses]} ${
          selected ? 'ring-2 ring-[var(--accent)]' : ''
        }`}
        style={{
          width: typeof width === 'number' ? `${width}px` : 'auto',
          maxWidth: '100%',
          height: typeof height === 'number' ? `${height}px` : 'auto',
        }}
        onMouseDown={handleMouseDown}
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

        {/* Controls - visible when selected */}
        {selected && (
          <div className="absolute -top-10 left-0 right-0 flex items-center gap-1 bg-[#111C28] rounded-[6px] border border-[var(--border-subtle)] px-2 py-1.5 flex-wrap z-10">
            <button
              className={`p-1 rounded-[4px] transition text-sm ${
                align === 'left'
                  ? 'bg-[var(--accent)]/20 text-[var(--accent-text)]'
                  : 'hover:bg-[var(--surface-highlight)] text-[var(--text-secondary)]'
              }`}
              onClick={() => updateAttributes({ align: 'left' })}
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
              onClick={() => updateAttributes({ align: 'center' })}
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
              onClick={() => updateAttributes({ align: 'right' })}
              data-testid="image-node-align-right-button"
              title="Alinear derecha (texto fluye a la izquierda)"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
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
    </NodeViewWrapper>
  );
};
