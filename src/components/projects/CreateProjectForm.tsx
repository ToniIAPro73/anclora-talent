import { createProjectAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { AppMessages } from '@/lib/i18n/messages';
import type { StructureProfile } from '@/lib/structure-profile/model';
import { DocumentImporter } from './DocumentImporter';
import { ProductTemplateSelector } from './ProductTemplateSelector';
import { StructureReferenceSection } from './StructureReferenceSection';
import { BrandManualInput } from './BrandManualInput';

export function CreateProjectForm({
  copy,
  structureProfiles = [],
  variant = 'default',
}: {
  copy: AppMessages['project'];
  structureProfiles?: StructureProfile[];
  variant?: 'default' | 'dashboard';
}) {
  return (
    <form
      action={createProjectAction}
      className={`ac-surface-panel talent-create-form ${variant === 'dashboard' ? 'talent-create-form--dashboard' : ''}`}
      data-testid="create-project-form"
    >
      <div className="talent-create-form__primary">
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
        <ProductTemplateSelector copy={copy} />
      </div>
      <div className="talent-create-form__optional">
        <div data-testid="create-optional-manuscript">
          <span className="ac-form-field__label mt-5 block">{copy.createOptionalManuscriptLabel}</span>
          <DocumentImporter copy={copy} />
          <p className="mt-1 text-xs leading-6 text-[var(--text-tertiary)]">{copy.createOptionalManuscriptHint}</p>
        </div>
        <div data-testid="create-optional-structure">
          <span className="ac-form-field__label mt-5 block">{copy.createOptionalStructureLabel}</span>
          <StructureReferenceSection copy={copy} profiles={structureProfiles} />
        </div>
        <BrandManualInput copy={copy} />
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-xs leading-6 text-[var(--text-tertiary)]">
            {copy.createProjectHint}
          </p>
          <SubmitButton className={`${premiumPrimaryDarkButton} w-full`} data-testid="create-project-submit-button">
            {copy.createProjectAction}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
