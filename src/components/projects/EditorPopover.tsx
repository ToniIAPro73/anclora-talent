'use client';

import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Portal } from '@/components/ui/Portal';

interface EditorPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  className?: string;
  children: React.ReactNode;
  role?: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
}

export function EditorPopover({
  anchorRef,
  isOpen,
  onClose,
  width,
  minWidth,
  maxWidth = 'min(92vw, 360px)',
  className = '',
  children,
  role = 'dialog',
  ariaLabel,
  align = 'left',
}: EditorPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popoverEl = popoverRef.current;
    const popoverWidth = popoverEl ? popoverEl.offsetWidth : (typeof width === 'number' ? width : 240);
    const popoverHeight = popoverEl ? popoverEl.offsetHeight : 200;

    // Viewport collision handling for vertical axis
    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight - 12 && rect.top - 6 > popoverHeight) {
      top = Math.max(12, rect.top - popoverHeight - 6);
    }

    // Horizontal positioning & collision handling
    let left = align === 'right' ? rect.right - popoverWidth : rect.left;
    left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12));

    setCoords({ top, left });
  }, [anchorRef, width, align]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleMousedown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleMousedown);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleMousedown);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, onClose, updatePosition, anchorRef]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        ref={popoverRef}
        role={role}
        aria-label={ariaLabel}
        style={{
          position: 'fixed',
          top: coords ? `${coords.top}px` : '-9999px',
          left: coords ? `${coords.left}px` : '-9999px',
          zIndex: 150,
          width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          minWidth: minWidth ? (typeof minWidth === 'number' ? `${minWidth}px` : minWidth) : undefined,
          maxWidth: maxWidth ? (typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth) : undefined,
        }}
        className={`rounded-xl border border-[var(--border-strong)] bg-[var(--surface-panel)] text-[var(--text-primary)] p-2.5 shadow-[var(--shadow-lg)] animate-in fade-in zoom-in duration-150 ${className}`}
      >
        {children}
      </div>
    </Portal>
  );
}
