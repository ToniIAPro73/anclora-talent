'use client';

import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

export const ImageNodeView = ({
  node,
  updateAttributes,
  selected,
  extension,
}: any) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const width = node.attrs.width || '100%';
  const height = node.attrs.height || 'auto';

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

  return (
    <NodeViewWrapper as="div" className="inline-block my-4">
      <div
        ref={containerRef}
        className={`relative inline-block group ${
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
        />

        {/* Resize handle - visible on hover or when selected */}
        {(selected || isDragging || isResizing) && (
          <div
            className="resize-handle absolute bottom-0 right-0 w-6 h-6 bg-[var(--accent-mint)] rounded-tl-[8px] cursor-se-resize opacity-75 hover:opacity-100"
            title="Arrastra para redimensionar"
          />
        )}

        {/* Selection indicator */}
        {selected && (
          <div className="absolute inset-0 border-2 border-[var(--accent-mint)] rounded-[8px] pointer-events-none" />
        )}
      </div>
    </NodeViewWrapper>
  );
};
