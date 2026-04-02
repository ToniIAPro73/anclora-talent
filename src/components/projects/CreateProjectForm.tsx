import { createProjectAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { supportedImportAccept } from '@/lib/projects/import-config';
import type { AppMessages } from '@/lib/i18n/messages';

export function CreateProjectForm({ copy }: { copy: AppMessages['project'] }) {
  return (
    <form action={createProjectAction} className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-strong)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">{copy.createFormEyebrow}</p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--text-primary)]">{copy.createFormTitle}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
        {copy.createFormDescription}
      </p>
      <label htmlFor="project-title" className="mt-6 block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.titleLabel}</span>
        <input
          id="project-title"
          type="text"
          name="title"
          required
          placeholder={copy.titlePlaceholder}
          className="w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-mint)]"
        />
      </label>
      <label htmlFor="source-document" className="mt-5 block space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.sourceDocumentLabel}</span>
        <input
          id="source-document"
          data-testid="source-document-input"
          type="file"
          name="sourceDocument"
          accept={supportedImportAccept}
          className="block w-full rounded-[18px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--button-highlight-bg)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--button-highlight-fg)]"
        />
        <p className="text-xs leading-6 text-[var(--text-tertiary)]">
          {copy.sourceDocumentHint}
        </p>
      </label>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xs text-xs leading-6 text-[var(--text-tertiary)]">
          {copy.createProjectHint}
        </p>
        <button
          type="submit"
          className={premiumPrimaryDarkButton}
        >
          {copy.createProjectAction}
        </button>
      </div>
    </form>
  );
}
