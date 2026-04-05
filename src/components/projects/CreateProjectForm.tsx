import { createProjectAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { AppMessages } from '@/lib/i18n/messages';
import { DocumentImporter } from './DocumentImporter';

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
      <DocumentImporter copy={copy} />
      <div className="mt-6 flex flex-col gap-4">
        <p className="text-xs leading-6 text-[var(--text-tertiary)]">
          {copy.createProjectHint}
        </p>
        <SubmitButton className={`${premiumPrimaryDarkButton} w-full`}>
          {copy.createProjectAction}
        </SubmitButton>
      </div>
    </form>
  );
}
