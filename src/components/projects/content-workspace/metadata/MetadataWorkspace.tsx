'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookOpen, Check, Info, X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { saveProjectDocumentAction, saveProjectMetadataAction } from '@/lib/projects/actions';
import { computeMetadataCompleteness, type MetadataFieldKey } from '@/lib/projects/metadata-completeness';
import type { DocumentMetadata } from '@/lib/document/model';

type Copy = AppMessages['project'];

const MAX_KEYWORDS = 10;

export function MetadataWorkspace({
  project,
  activeChapter,
  copy,
  onNavigateStep,
}: {
  project: ProjectRecord;
  activeChapter: { id: string; title: string };
  copy: Copy;
  onNavigateStep: (step: number) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const existing = project.document.metadata;
  const [title, setTitle] = useState(project.document.title);
  const [subtitle, setSubtitle] = useState(project.document.subtitle ?? '');
  const [author, setAuthor] = useState(project.document.author ?? '');
  const [language, setLanguage] = useState(existing?.language ?? project.document.language ?? '');
  const [isbn, setIsbn] = useState(existing?.isbn ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [keywords, setKeywords] = useState<string[]>(existing?.keywords ?? []);
  const [keywordDraft, setKeywordDraft] = useState('');

  const completeness = useMemo(
    () => computeMetadataCompleteness({ title, author, language, isbn, keywords, description }),
    [title, author, language, isbn, keywords, description],
  );

  const statusLabel: Record<'complete' | 'missing' | 'recommended', string> = {
    complete: copy.metadataStatusComplete,
    missing: copy.metadataStatusMissing,
    recommended: copy.metadataStatusRecommended,
  };
  // ISBN reads "Pendiente" rather than the generic "Recomendado" when unset —
  // matches how publishing tools usually describe an ISBN that hasn't been
  // assigned yet.
  const fieldLabel: Record<MetadataFieldKey, string> = {
    title: copy.documentDataTitleLabel,
    author: copy.documentDataAuthorLabel,
    language: copy.metadataLanguageLabel,
    isbn: copy.metadataIsbnLabel,
    keywords: copy.metadataKeywordsLabel,
    description: copy.metadataDescriptionLabel,
  };

  const addKeyword = () => {
    const value = keywordDraft.trim();
    if (!value || keywords.length >= MAX_KEYWORDS || keywords.includes(value)) {
      setKeywordDraft('');
      return;
    }
    setKeywords((prev) => [...prev, value]);
    setKeywordDraft('');
    setSaved(false);
  };

  const removeKeyword = (value: string) => {
    setKeywords((prev) => prev.filter((k) => k !== value));
    setSaved(false);
  };

  const markDirty = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const docFormData = new FormData();
      docFormData.set('projectId', project.id);
      docFormData.set('chapterId', activeChapter.id);
      docFormData.set('chapterTitle', activeChapter.title);
      docFormData.set('title', title);
      docFormData.set('subtitle', subtitle);
      docFormData.set('author', author);
      await saveProjectDocumentAction(docFormData);

      const metadata: DocumentMetadata = {
        title,
        subtitle: subtitle || undefined,
        author: author || undefined,
        isbn: isbn.trim() || undefined,
        description: description.trim() || undefined,
        keywords,
        language: language.trim() || undefined,
      };
      const metaFormData = new FormData();
      metaFormData.set('projectId', project.id);
      metaFormData.set('metadata', JSON.stringify(metadata));
      await saveProjectMetadataAction(metaFormData);

      router.refresh();
      setSaved(true);
    });
  };

  const focusTitle = () => {
    titleInputRef.current?.focus();
    titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const inputClass =
    'w-full rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]';
  const labelClass = 'text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]';

  return (
    <div className="talent-metadata-workspace" data-testid="metadata-workspace">
      <div className="talent-metadata-workspace__main">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="metadata-identity-panel">
          <div className="ac-surface-panel__meta">
            <div>
              <h3 className="ac-surface-panel__title">{copy.metadataIdentityTitle}</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.metadataIdentitySubtitle}</p>
            </div>
            <span className="talent-metadata-workspace__sync-banner">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {copy.metadataSyncBanner}
            </span>
          </div>

          <div className="talent-metadata-identity__body">
            <div className="talent-metadata-identity__cover-column">
              <div className="dashboard-cover talent-content-summary__cover" data-palette={project.cover.palette}>
                {project.cover.thumbnailUrl || project.cover.renderedImageUrl ? (
                  <Image
                    src={(project.cover.thumbnailUrl || project.cover.renderedImageUrl) as string}
                    alt=""
                    fill
                    sizes="148px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <>
                    <BookOpen size={18} aria-hidden="true" />
                    <span>{title || project.document.title}</span>
                    <small>{author}</small>
                  </>
                )}
              </div>
              <button
                type="button"
                data-testid="metadata-change-cover"
                onClick={() => onNavigateStep(3)}
                className="ac-button ac-button--compact"
              >
                {copy.metadataChangeCoverAction}
              </button>
              <p className="talent-metadata-identity__cover-caption">{copy.metadataCoverSyncCaption}</p>
            </div>

            <div className="talent-metadata-identity__fields">
              <div className="talent-metadata-identity__grid">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.documentDataTitleLabel}</span>
                  <input
                    ref={titleInputRef}
                    data-testid="metadata-title-input"
                    className={inputClass}
                    value={title}
                    onChange={(e) => markDirty(setTitle)(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.documentDataSubtitleLabel}</span>
                  <input
                    data-testid="metadata-subtitle-input"
                    className={inputClass}
                    value={subtitle}
                    onChange={(e) => markDirty(setSubtitle)(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.documentDataAuthorLabel}</span>
                  <input
                    data-testid="metadata-author-input"
                    className={inputClass}
                    value={author}
                    onChange={(e) => markDirty(setAuthor)(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.metadataLanguageLabel}</span>
                  <input
                    data-testid="metadata-language-input"
                    className={inputClass}
                    value={language}
                    onChange={(e) => markDirty(setLanguage)(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.metadataIsbnLabel}</span>
                  <input
                    data-testid="metadata-isbn-input"
                    className={inputClass}
                    value={isbn}
                    onChange={(e) => markDirty(setIsbn)(e.target.value)}
                  />
                </label>
                <div className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.metadataKeywordsLabel}</span>
                  <div className="talent-metadata-chips" data-testid="metadata-keywords-chips">
                    {keywords.map((keyword) => (
                      <span key={keyword} className="talent-metadata-chip">
                        {keyword}
                        <button
                          type="button"
                          data-testid={`metadata-keyword-remove-${keyword}`}
                          aria-label={keyword}
                          onClick={() => removeKeyword(keyword)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {keywords.length < MAX_KEYWORDS && (
                      <input
                        data-testid="metadata-keyword-input"
                        className="talent-metadata-chip-input"
                        value={keywordDraft}
                        onChange={(e) => setKeywordDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addKeyword();
                          }
                        }}
                        onBlur={addKeyword}
                        placeholder="+"
                      />
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)]">{copy.metadataKeywordsChipHelper}</span>
                </div>
              </div>

              <label className="mt-4 flex flex-col gap-1.5">
                <span className={labelClass}>{copy.metadataDescriptionLabel}</span>
                <textarea
                  data-testid="metadata-description-input"
                  className={`${inputClass} min-h-28`}
                  value={description}
                  maxLength={1000}
                  onChange={(e) => markDirty(setDescription)(e.target.value)}
                />
                <span className="self-end text-[11px] text-[var(--text-tertiary)]">{description.length}/1000</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      <div className="talent-metadata-workspace__sidebar">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="metadata-completeness-panel">
          <p className="ac-surface-panel__eyebrow">{copy.metadataCompletenessTitle}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.metadataCompletenessSubtitle}</p>

          <p className="talent-metadata-completeness__value">{completeness.percent}%</p>
          <div className="talent-metadata-completeness__bar">
            <div className="talent-metadata-completeness__bar-fill" style={{ width: `${completeness.percent}%` }} />
          </div>

          <ul className="talent-metadata-completeness__list">
            {completeness.fields.map((f) => (
              <li key={f.key} data-state={f.status}>
                <span className="talent-metadata-completeness__dot" />
                <span className="flex-1">{fieldLabel[f.key]}</span>
                <span className="talent-metadata-completeness__status">
                  {f.key === 'isbn' && f.status === 'recommended' ? copy.metadataStatusPending : statusLabel[f.status]}
                </span>
              </li>
            ))}
          </ul>

          {completeness.recommendationCount > 0 && (
            <div className="talent-metadata-completeness__callout" data-testid="metadata-recommendations">
              <p className="font-semibold text-[var(--text-primary)]">
                {copy.metadataRecommendationsTitle.replace('{count}', String(completeness.recommendationCount))}
              </p>
              <p className="mt-1 text-[var(--text-secondary)]">{copy.metadataRecommendationsBody}</p>
            </div>
          )}
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="metadata-summary-panel">
          <div className="ac-surface-panel__meta">
            <p className="ac-surface-panel__eyebrow">{copy.metadataSummaryTitle}</p>
            <button type="button" data-testid="metadata-summary-edit" onClick={focusTitle} className="ac-button ac-button--compact">
              {copy.contentSummaryEditAction}
            </button>
          </div>

          <dl className="talent-content-summary__fields mt-3">
            <div>
              <dt>{copy.documentDataTitleLabel}</dt>
              <dd>{title || '—'}</dd>
            </div>
            <div>
              <dt>{copy.documentDataSubtitleLabel}</dt>
              <dd>{subtitle || '—'}</dd>
            </div>
            <div>
              <dt>{copy.documentDataAuthorLabel}</dt>
              <dd>{author || '—'}</dd>
            </div>
            <div>
              <dt>{copy.metadataLanguageLabel}</dt>
              <dd>{language || '—'}</dd>
            </div>
            <div>
              <dt>{copy.metadataKeywordsLabel}</dt>
              <dd>{keywords.length > 0 ? keywords.join(', ') : '—'}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              data-testid="metadata-save-button"
              onClick={handleSave}
              disabled={isPending}
              className="ac-button ac-button--compact ac-button--primary"
            >
              {isPending ? '…' : saved ? <Check className="h-4 w-4" /> : null}
              {copy.metadataSave}
            </button>
            <p className="text-[11px] text-[var(--text-tertiary)]">{copy.metadataSaveHelper}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
