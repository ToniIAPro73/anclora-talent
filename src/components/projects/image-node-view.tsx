'use client';

import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { X, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

export const ImageNodeView = ({
  node,
  updateAttributes,
  selected,
  extension,
  deleteNode,
}: any) => {
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
    left: 'float-left mr-4',
    center: 'mx-auto',
    right: 'float-right ml-4',
  };

  return (
    <NodeViewWrapper as="div" className="my-4 clear-both">
      <div
        ref={containerRef}
        className={`relative inline-block group ${alignmentClasses[align as keyof typeof alignmentClasses]} ${
          selected ? 'ring-2 ring-[var(--accent-mint)]' : ''
        }`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
        onMouseDown={handleMouseDown}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt}
          className="w-full h-full object-cover rounded-[8px]"
          draggable={false}
        />

        {/* Resize handle - visible on hover or when selected */}
        {selected && !isResizing && (
          <div
            className="resize-handle absolute bottom-0 right-0 w-5 h-5 bg-[var(--accent-mint)] rounded-tl-[6px] cursor-se-resize opacity-80 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold"
            title="Arrastra para redimensionar"
          >
            ⤡
          </div>
        )}

        {/* Selection indicator */}
        {selected && (
          <div className="absolute inset-0 border-2 border-[var(--accent-mint)] rounded-[8px] pointer-events-none" />
        )}

        {/* Controls - visible when selected */}
        {selected && (
          <div className="absolute -top-10 left-0 right-0 flex items-center gap-1 bg-[#111C28] rounded-[6px] border border-[var(--border-subtle)] px-2 py-1.5">
            <button
              className="p-1 hover:bg-[var(--surface-highlight)] rounded-[4px] transition text-[var(--text-secondary)]"
              onClick={() => updateAttributes({ align: 'left' })}
              title="Alinear izquierda"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1 hover:bg-[var(--surface-highlight)] rounded-[4px] transition text-[var(--text-secondary)]"
              onClick={() => updateAttributes({ align: 'center' })}
              title="Centrar"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-1 hover:bg-[var(--surface-highlight)] rounded-[4px] transition text-[var(--text-secondary)]"
              onClick={() => updateAttributes({ align: 'right' })}
              title="Alinear derecha"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <div className="h-4 w-px bg-[var(--border-subtle)] mx-0.5" />
            <button
              className="p-1 hover:bg-red-500/20 rounded-[4px] transition text-red-500"
              onClick={deleteNode}
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
