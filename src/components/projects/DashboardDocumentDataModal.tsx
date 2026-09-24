'use client';

import { X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectSummary } from '@/lib/projects/types';

export function DashboardDocumentDataModal({
  project,
  locale,
  copy,
  onClose,
}: {
  project: ProjectSummary;
  locale: 'es' | 'en';
  copy: AppMessages['project'];
  onClose: () => void;
}) {
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
  const composition = project.composition;
  const reference = project.referenceEditorialProfile;
  const fontFamily = reference?.body.resolvedFontFamily ?? reference?.body.fontFamily ?? composition?.fontFamily ?? '';
  const metadata = [
    [copy.documentDataTitleLabel, project.documentTitle || project.title],
    [copy.documentDataSubtitleLabel, project.documentSubtitle || '—'],
    [copy.documentDataAuthorLabel, project.documentAuthor || '—'],
    [copy.documentDataCreatedLabel, formatDate(project.createdAt)],
    [copy.documentDataPagesLabel, project.pageCount === null ? '—' : String(project.pageCount)],
    [copy.documentDataChaptersLabel, String(project.chapterCount)],
  ];

  return (
    <div className="ac-modal dashboard-document-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-document-data-title" data-testid="dashboard-document-data-modal">
      <button type="button" data-testid="dashboard-document-data-backdrop" className="ac-modal__backdrop" aria-label={copy.documentDataCloseLabel} onClick={onClose} />
      <section className="ac-modal__panel dashboard-document-modal__panel">
        <header className="dashboard-document-modal__header">
          <div>
            <p className="dashboard-document-modal__eyebrow">{copy.documentDataOpen}</p>
            <h2 id="dashboard-document-data-title">{project.title}</h2>
            <p>{copy.documentDataModalDescriptionProject}</p>
          </div>
          <button type="button" className="ac-button ac-button--ghost ac-button--compact ac-button--icon dashboard-modal-close" aria-label={copy.documentDataCloseLabel} data-testid="dashboard-document-data-close" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="dashboard-document-modal__body">
          <section><h3>{copy.documentDataSummaryHeading}</h3><dl className="dashboard-document-modal__metadata">{metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
          <section><h3>{copy.documentDataCompositionHeading}</h3><div className="dashboard-document-modal__cards"><article><strong>{copy.documentDataFontFamilyLabel}</strong><span style={fontFamily ? { fontFamily } : undefined}>{fontFamily || copy.documentDataUnavailableValue}</span></article><article><strong>{copy.documentDataMarginPresetLabel}</strong><span>{composition?.margins ? `${composition.margins.top} / ${composition.margins.bottom} / ${composition.margins.left} / ${composition.margins.right}` : copy.documentDataMarginPresetNormal}</span></article><article><strong>{copy.documentDataLineHeightLabel}</strong><span>{reference?.body.lineHeight ?? composition?.lineHeight ?? '1,5'}</span></article></div></section>
          <section><h3>{copy.documentDataStructureHeading}</h3><div className="dashboard-document-modal__cards"><article><strong>{copy.documentDataStructureHierarchyLabel}</strong><span>{project.chapterCount} capítulos</span></article><article><strong>{copy.documentDataReferenceLabel}</strong><span>{reference?.source.filename ?? copy.documentDataUnavailableValue}</span></article><article><strong>{copy.documentDataBrandHeading}</strong><span>{project.brandProfileName ?? copy.documentDataBrandNoneOption}</span></article></div></section>
        </div>
        <footer className="dashboard-document-modal__footer"><button type="button" data-testid="dashboard-document-data-cancel" className="ac-button ac-button--compact" onClick={onClose}>{copy.documentDataCancelLabel}</button><button type="button" data-testid="dashboard-document-data-save" className="ac-button ac-button--compact ac-button--primary" onClick={onClose}>{copy.documentDataSaveLabel}</button></footer>
      </section>
    </div>
  );
}
