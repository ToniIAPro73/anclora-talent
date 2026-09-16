'use client';

import { useState } from 'react';
import { createProjectAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { AppMessages } from '@/lib/i18n/messages';
import type { StructureProfile } from '@/lib/structure-profile/model';
import { DocumentImporter } from './DocumentImporter';
import { ProductTemplateSelector } from './ProductTemplateSelector';
import { EditorialStyleSection } from './EditorialStyleSection';
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
  const [selectedStyleLabel, setSelectedStyleLabel] = useState(copy.newProjectStyleNone);
  const [documentSummary, setDocumentSummary] = useState(copy.createOptionalManuscriptHint);
  const [brandSummary, setBrandSummary] = useState(copy.newProjectNoBrand);
  const [isImportingSource, setIsImportingSource] = useState(false);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [isAnalyzingBrand, setIsAnalyzingBrand] = useState(false);

  const isPreprocessing = isImportingSource || isAnalyzingReference || isAnalyzingBrand;

  return (
    <form
      action={createProjectAction}
      className={`ac-surface-panel talent-create-form ${variant === 'dashboard' ? 'talent-create-form--dashboard' : ''}`}
      data-testid="create-project-form"
    >
      <div className="talent-create-form__primary rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5">
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
        <section className="mt-5" data-testid="new-project-base-document-section">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">01</p>
            <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{copy.newProjectBaseDocumentTitle}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.newProjectBaseDocumentDescription}</p>
          </div>
          <label htmlFor="project-title" className="ac-form-field">
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
          <div className="mt-5" data-testid="create-optional-manuscript">
            <span className="ac-form-field__label block">{copy.createOptionalManuscriptLabel}</span>
            <DocumentImporter
              copy={copy}
              onAnalysisChange={(analysis) =>
                setDocumentSummary(analysis?.title || analysis?.fileName || copy.createOptionalManuscriptHint)
              }
              onPreprocessingChange={setIsImportingSource}
            />
            <p className="mt-1 text-xs leading-6 text-[var(--text-tertiary)]">{copy.createOptionalManuscriptHint}</p>
          </div>
          <div className="mt-5">
            <ProductTemplateSelector copy={copy} />
          </div>
        </section>
      </div>
      <div className="talent-create-form__optional space-y-5">
        <EditorialStyleSection
          copy={copy}
          profiles={structureProfiles}
          onSelectionChange={({ label }) => setSelectedStyleLabel(label)}
          onPreprocessingChange={setIsAnalyzingReference}
        />
        <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5" data-testid="brand-identity-section">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{copy.newProjectBrandTitle}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.newProjectBrandDescription}</p>
          <BrandManualInput
            copy={copy}
            onFileChange={(fileName) => setBrandSummary(fileName || copy.newProjectNoBrand)}
            onPreprocessingChange={setIsAnalyzingBrand}
          />
        </section>
        <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5" data-testid="project-creation-summary">
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{copy.newProjectSummaryTitle}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{copy.newProjectSummaryDocument}</p><p className="mt-1 text-sm text-[var(--text-primary)]">{documentSummary}</p></div>
            <div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{copy.newProjectSummaryStyle}</p><p className="mt-1 text-sm text-[var(--text-primary)]">{selectedStyleLabel}</p></div>
            <div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{copy.newProjectSummaryBrand}</p><p className="mt-1 text-sm text-[var(--text-primary)]">{brandSummary}</p></div>
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-6 text-[var(--text-tertiary)]">
            {copy.createProjectHint}
          </p>
          <SubmitButton
            className={`${premiumPrimaryDarkButton} w-full`}
            data-testid="create-project-submit-button"
            disabled={isPreprocessing}
          >
            {isPreprocessing ? copy.createProjectPreprocessingBlocked : copy.createProjectAction}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
