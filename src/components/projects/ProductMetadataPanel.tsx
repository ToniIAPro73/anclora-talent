'use client';

import { useState, useTransition } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { DocumentMetadata } from '@/lib/document/model';
import type { AppMessages } from '@/lib/i18n/messages';
import { saveProjectMetadataAction } from '@/lib/projects/actions';

type Copy = AppMessages['project'];

interface ProductMetadataPanelProps {
  project: ProjectRecord;
  copy: Copy;
}

const inputClass =
  'w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]';
const labelClass = 'text-sm font-semibold text-[var(--text-primary)]';

/**
 * Digital product metadata panel (C7): ISBN, description, keywords and
 * language. Title/subtitle/author stay in the main metadata form and are
 * carried over here so DocumentMetadata remains the single source injected
 * into title page, legal page, TOC and export (and later cover-studio).
 */
export function ProductMetadataPanel({ project, copy }: ProductMetadataPanelProps) {
  const existing = project.document.metadata;
  const [isbn, setIsbn] = useState(existing?.isbn ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [keywords, setKeywords] = useState((existing?.keywords ?? []).join(', '));
  const [language, setLanguage] = useState(existing?.language ?? project.document.language ?? 'es');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const metadata: DocumentMetadata = {
      title: project.document.title,
      subtitle: project.document.subtitle || undefined,
      author: project.document.author || undefined,
      isbn: isbn.trim() || undefined,
      description: description.trim() || undefined,
      keywords: keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      language: language.trim() || undefined,
    };
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('metadata', JSON.stringify(metadata));
    startTransition(async () => {
      await saveProjectMetadataAction(formData);
      setSaved(true);
    });
  };

  return (
    <section
      data-testid="product-metadata-panel"
      className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
        {copy.metadataPanelEyebrow}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
        {copy.metadataPanelTitle}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.metadataPanelDescription}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className={labelClass}>{copy.metadataIsbnLabel}</span>
            <input
              data-testid="metadata-isbn-input"
              value={isbn}
              onChange={(event) => {
                setIsbn(event.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>{copy.metadataLanguageLabel}</span>
            <input
              data-testid="metadata-language-input"
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block space-y-2">
          <span className={labelClass}>{copy.metadataDescriptionLabel}</span>
          <textarea
            data-testid="metadata-description-input"
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setSaved(false);
            }}
            className={`${inputClass} min-h-24`}
          />
        </label>
        <label className="block space-y-2">
          <span className={labelClass}>{copy.metadataKeywordsLabel}</span>
          <input
            data-testid="metadata-keywords-input"
            value={keywords}
            onChange={(event) => {
              setKeywords(event.target.value);
              setSaved(false);
            }}
            placeholder={copy.metadataKeywordsHelper}
            className={inputClass}
          />
        </label>
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <span className="text-sm font-medium text-[var(--accent)]" role="status">
              {copy.metadataSaved}
            </span>
          )}
          <button
            type="submit"
            data-testid="metadata-save-button"
            disabled={isPending}
            className="ac-button ac-button--primary"
          >
            {copy.metadataSave}
          </button>
        </div>
      </form>
    </section>
  );
}
