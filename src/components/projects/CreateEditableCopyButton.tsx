'use client';

import { FilePenLine } from 'lucide-react';
import { createEditableCopyAction } from '@/lib/projects/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * Fase 3: the shared CTA offered wherever a fixed-pdf export is disabled
 * (EPUB/HTML/Markdown/DOCX) — creates an independent editable project
 * seeded from the same original PDF, never mutating the source project.
 */
export function CreateEditableCopyButton({
  projectId,
  label,
  className,
}: {
  projectId: string;
  label: string;
  className?: string;
}) {
  return (
    <form action={createEditableCopyAction}>
      <input type="hidden" name="projectId" value={projectId} data-testid="create-editable-copy-project-id-input" />
      <SubmitButton
        data-testid="create-editable-copy-button"
        className={className ?? 'ac-button ac-button--secondary'}
      >
        <FilePenLine className="h-4 w-4" />
        {label}
      </SubmitButton>
    </form>
  );
}
