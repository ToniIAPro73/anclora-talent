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
  fixedPdfError = false,
}: {
  copy: AppMessages['project'];
  structureProfiles?: StructureProfile[];
  variant?: 'default' | 'dashboard';
  /** Fixed-PDF document mode, fail-closed: private storage failed on the
   *  previous submit, no project was created — the user stays on this
   *  same creation form and re-attempts the upload. */
  fixedPdfError?: boolean;
}) {
  return (
    <form
      action={createProjectAction}
      className={`ac-surface-panel talent-create-form ${variant === 'dashboard' ? 'talent-create-form--dashboard' : ''}`}
      data-testid="create-project-form"
    >
      <div className="talent-create-form__primary">
        <div className="talent-create-form__intro">
          <p className="ac-surface-panel__eyebrow">{copy.createFormEyebrow}</p>
          <h2 className="ac-surface-panel__title">{copy.createFormTitle}</h2>
          <p>{copy.createFormDescription}</p>
        </div>
        {fixedPdfError && (
          <div
            role="alert"
            data-testid="fixed-pdf-storage-error"
            className="mt-4 rounded-[16px] border border-red-400/40 bg-red-400/10 p-4"
          >
            <p className="text-sm font-semibold text-red-400">{copy.fixedPdfStorageErrorTitle}</p>
            <p className="mt-1 text-xs leading-6 text-red-400/90">{copy.fixedPdfStorageErrorBody}</p>
          </div>
        )}
        <label htmlFor="project-title" className="ac-form-field mt-5">
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
