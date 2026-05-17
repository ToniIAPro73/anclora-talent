import { createProjectAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { AppMessages } from '@/lib/i18n/messages';
import { DocumentImporter } from './DocumentImporter';

export function CreateProjectForm({ copy }: { copy: AppMessages['project'] }) {
  return (
    <form action={createProjectAction} className="ac-surface-panel" data-testid="create-project-form">
      <p className="ac-surface-panel__eyebrow">{copy.createFormEyebrow}</p>
      <h2 className="ac-surface-panel__title text-2xl">{copy.createFormTitle}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
        {copy.createFormDescription}
      </p>
      <label htmlFor="project-title" className="ac-form-field mt-2">
        <span className="ac-form-field__label">{copy.titleLabel}</span>
        <input
          id="project-title"
          data-testid="create-project-title-input"
          type="text"
          name="title"
          required
          placeholder={copy.titlePlaceholder}
          className="field-input"
        />
      </label>
      <DocumentImporter copy={copy} />
      <div className="mt-6 flex flex-col gap-4">
        <p className="text-xs leading-6 text-[var(--text-tertiary)]">
          {copy.createProjectHint}
        </p>
        <SubmitButton className={`${premiumPrimaryDarkButton} w-full`} data-testid="create-project-submit-button">
          {copy.createProjectAction}
        </SubmitButton>
      </div>
    </form>
  );
}
