'use client';

import { Trash2 } from 'lucide-react';
import { deleteProjectAction } from '@/lib/projects/actions';

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
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[rgba(173,53,69,0.18)] bg-[rgba(173,53,69,0.08)] px-4 py-2 text-sm font-semibold text-[#8a2434] transition hover:bg-[rgba(173,53,69,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a2434] focus-visible:ring-offset-2"
      >
        <Trash2 className="h-4 w-4" />
        {label}
      </button>
    </form>
  );
}
