'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { ProjectDeleteButton } from './ProjectDeleteButton';

/**
 * Follow-up: the destructive "Eliminar" action no longer sits exposed in the
 * card footer; it lives inside this actions menu (the delete itself keeps its
 * window.confirm guard inside ProjectDeleteButton).
 */
export function ProjectCardMenu({
  projectId,
  menuLabel,
  deleteLabel,
  confirmMessage,
}: {
  projectId: string;
  menuLabel: string;
  deleteLabel: string;
  confirmMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={menuLabel}
        data-testid="project-card-menu"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-soft)] text-[var(--text-secondary)] transition hover:border-[var(--accent-border)] hover:text-[var(--text-primary)]"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={menuLabel}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-3 shadow-[var(--shadow-lg)] backdrop-blur-xl"
        >
          <ProjectDeleteButton
            projectId={projectId}
            label={deleteLabel}
            confirmMessage={confirmMessage}
          />
        </div>
      )}
    </div>
  );
}
