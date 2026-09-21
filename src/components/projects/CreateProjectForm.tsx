'use client';

import { useState } from 'react';
import { BookOpen, Check, FileText, Palette, Sparkles, X } from 'lucide-react';
import { createProjectAction } from '@/lib/projects/actions';
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
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState(copy.productTemplates.standardBook.name);
  const [documentSummary, setDocumentSummary] = useState(copy.createOptionalManuscriptHint);
  const [brandSummary, setBrandSummary] = useState(copy.newProjectNoBrand);
  const [isImportingSource, setIsImportingSource] = useState(false);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [isAnalyzingBrand, setIsAnalyzingBrand] = useState(false);

  const isPreprocessing = isImportingSource || isAnalyzingReference || isAnalyzingBrand;

  return (
    <form
      action={createProjectAction}
      className={`ac-surface-panel talent-create-form talent-new-project-form ${variant === 'dashboard' ? 'talent-create-form--dashboard' : ''}`}
      data-testid="create-project-form"
    >
      <div className="talent-create-form__primary rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5">
        <div className="talent-create-form__intro">
          <p className="ac-surface-panel__eyebrow">{copy.createFormEyebrow}</p>
          <h1 className="ac-surface-panel__title">{copy.createFormTitle}</h1>
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
        <section className="talent-new-project-step" data-testid="new-project-project-section">
          <div className="talent-new-project-step__heading"><span className="talent-new-project-step__number">1</span><div><h2>Proyecto</h2><p>Define el nombre de tu nuevo proyecto editorial.</p></div></div>
          <label htmlFor="project-title" className="ac-form-field talent-new-project-title-field">
            <span className="ac-form-field__label">{copy.titleLabel}</span>
            <div className="talent-new-project-input-wrap"><input id="project-title" data-testid="create-project-title-input" type="text" name="title" required placeholder={copy.titlePlaceholder} className="field-input" /><X size={16} aria-hidden="true" /></div>
          </label>
        </section>
        <section className="talent-new-project-step" data-testid="new-project-base-document-section">
          <div className="mb-3">
            <div className="talent-new-project-step__heading"><span className="talent-new-project-step__number">2</span><div><h2>{copy.newProjectBaseDocumentTitle}</h2><p>{copy.newProjectBaseDocumentDescription}</p></div></div>
          </div>
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
          <div className="mt-5 talent-new-project-template-block">
            <ProductTemplateSelector copy={copy} onSelectionChange={setSelectedTemplateLabel} />
          </div>
        </section>
        <EditorialStyleSection
          copy={copy}
          profiles={structureProfiles}
          onSelectionChange={({ label }) => setSelectedStyleLabel(label)}
          onPreprocessingChange={setIsAnalyzingReference}
        />
        <section className="talent-new-project-step talent-new-project-step--brand rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-5" data-testid="brand-identity-section">
          <div className="talent-new-project-step__heading"><span className="talent-new-project-step__number">4</span><div><h2>{copy.newProjectBrandTitle}</h2><p>{copy.newProjectBrandDescription}</p></div></div>
          <BrandManualInput
            copy={copy}
            onFileChange={(fileName) => setBrandSummary(fileName || copy.newProjectNoBrand)}
            onPreprocessingChange={setIsAnalyzingBrand}
          />
        </section>
      </div>
      <div className="talent-create-form__optional space-y-5">
        <section className="talent-new-project-summary" data-testid="project-creation-summary">
          <div className="talent-new-project-summary__heading"><div><p className="ac-surface-panel__eyebrow">Resumen</p><h2>{copy.newProjectSummaryTitle}</h2><p>Revisa la configuración antes de abrir el editor.</p></div><Sparkles size={20} aria-hidden="true" /></div>
          <div className="talent-new-project-summary__items">
            <div><FileText size={16} aria-hidden="true" /><span><small>{copy.newProjectSummaryDocument}</small><strong>{documentSummary}</strong></span><Check size={15} aria-hidden="true" /></div>
            <div><BookOpen size={16} aria-hidden="true" /><span><small>Plantilla</small><strong>{selectedTemplateLabel}</strong></span><Check size={15} aria-hidden="true" /></div>
            <div><Sparkles size={16} aria-hidden="true" /><span><small>{copy.newProjectSummaryStyle}</small><strong>{selectedStyleLabel}</strong></span><Check size={15} aria-hidden="true" /></div>
            <div><Palette size={16} aria-hidden="true" /><span><small>{copy.newProjectSummaryBrand}</small><strong>{brandSummary}</strong></span><Check size={15} aria-hidden="true" /></div>
          </div>
          <div className="talent-new-project-summary__ready"><span className="talent-new-project-summary__ready-dot" /> <span>Listo para crear</span></div>
        </section>
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-6 text-[var(--text-tertiary)]">
            {copy.createProjectHint}
          </p>
          <SubmitButton
            className="ac-button ac-button--compact ac-button--primary w-full"
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
