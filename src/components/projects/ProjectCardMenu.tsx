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
  documentDataLabel,
  onDocumentData,
}: {
  projectId: string;
  menuLabel: string;
  deleteLabel: string;
  confirmMessage: string;
  documentDataLabel: string;
  onDocumentData?: () => void;
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
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={menuLabel}
        data-testid="project-card-menu"
        className="ac-button ac-button--secondary ac-button--compact ac-button--icon talent-button--secondary"
      >
        <span className="ac-button__icon">
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={menuLabel}
          className="project-card-menu absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl"
        >
          <button
            type="button"
            role="menuitem"
            data-testid="project-card-document-data-button"
            onClick={() => { setOpen(false); onDocumentData?.(); }}
            className="project-card-menu__item"
          >
            {documentDataLabel}
          </button>
          <div role="menuitem" className="project-card-menu__item project-card-menu__item--destructive">
            <ProjectDeleteButton projectId={projectId} label={deleteLabel} confirmMessage={confirmMessage} />
          </div>
        </div>
      )}
    </div>
  );
}
