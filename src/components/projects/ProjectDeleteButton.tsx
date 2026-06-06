'use client';

import { Trash2 } from 'lucide-react';
import { deleteProjectAction } from '@/lib/projects/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function ProjectDeleteButton({
  projectId,
  label,
  confirmMessage,
}: {
  projectId: string;
  label: string;
  confirmMessage: string;
}) {
  return (
    <form
      action={deleteProjectAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton className="ac-button ac-button--destructive ac-button--lg talent-action-button talent-action-button--destructive">
        <Trash2 className="h-4 w-4" />
        {label}
      </SubmitButton>
    </form>
  );
}
