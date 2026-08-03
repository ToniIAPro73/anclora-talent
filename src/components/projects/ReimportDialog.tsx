'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Upload, Loader2 } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DocumentChapter } from '@/lib/projects/types';
import { supportedImportAccept } from '@/lib/projects/import-config';
import { summarizeReimport, type ReimportPreviewSummary } from '@/lib/projects/reimport';
import { reimportProjectAction } from '@/lib/projects/actions';

type Copy = AppMessages['project'];

interface ReimportDialogProps {
  isOpen: boolean;
  projectId: string;
  chapters: DocumentChapter[];
  copy: Copy;
  onClose: () => void;
}

type ReimportState = 'idle' | 'analyzing' | 'ready' | 'importing' | 'done' | 'error';

interface MergeResult {
  changedChapterIds: string[];
  addedChapterTitles: string[];
  keptStaleChapterTitles: string[];
}

type ImportResponse = { error?: string; chapterTitles?: string[] };

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Reimport dialog (C6): upload a revised DOCX, preview the structural diff
 * (updated / added / kept chapters), confirm, and merge — preserving cover,
 * back cover, rules and manual tweaks.
 */
export function ReimportDialog({ isOpen, projectId, chapters, copy, onClose }: ReimportDialogProps) {
  const router = useRouter();
  const [state, setState] = useState<ReimportState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ReimportPreviewSummary | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setState('idle');
    setFile(null);
    setSummary(null);
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    if (state === 'done') router.refresh();
    reset();
    onClose();
  };

  const analyzeFile = async (selected: File) => {
    setFile(selected);
    setState('analyzing');
    setError('');

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setState('error');
      setError(copy.reimportError);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('sourceDocument', selected);
      const response = await fetch('/api/projects/import', { method: 'POST', body: formData });
      const data: ImportResponse = await response.json();
      if (!response.ok) throw new Error(data.error || copy.reimportError);

      setSummary(
        summarizeReimport(
          chapters.map((chapter) => chapter.title),
          data.chapterTitles ?? [],
        ),
      );
      setState('ready');
    } catch {
      setState('error');
      setError(copy.reimportError);
    }
  };

  const confirmReimport = () => {
    if (!file) return;
    setState('importing');
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('projectId', projectId);
        formData.set('sourceDocument', file);
        const mergeResult = await reimportProjectAction(formData);
        setResult({
          changedChapterIds: mergeResult.changedChapterIds,
          addedChapterTitles: mergeResult.addedChapterTitles,
          keptStaleChapterTitles: mergeResult.keptStaleChapterTitles,
        });
        setState('done');
      } catch {
        setState('error');
        setError(copy.reimportError);
      }
    });
  };

  const count = (template: string, value: number) => template.replace('{count}', String(value));

  return (
    <div className="ac-modal" role="dialog" aria-modal="true" data-testid="reimport-dialog">
      <div className="ac-modal__backdrop" onClick={handleClose} />
      <div className="ac-modal__panel max-w-lg rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {copy.reimportDialogTitle}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {copy.reimportDialogDescription}
            </p>
          </div>
          <button type="button" onClick={handleClose} aria-label={copy.reimportCancelLabel}>
            <X className="h-5 w-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {state === 'idle' && (
          <label
            className="mt-6 flex cursor-pointer flex-col items-center gap-3 rounded-[18px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-soft)] px-6 py-8 text-center"
          >
            <Upload className="h-6 w-6 text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--accent)]">{copy.reimportButton}</span>
            <input
              ref={fileInputRef}
              data-testid="reimport-file-input"
              type="file"
              accept={supportedImportAccept}
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void analyzeFile(selected);
              }}
            />
          </label>
        )}

        {(state === 'analyzing' || state === 'importing') && (
          <div className="mt-6 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.reimportAnalyzing}
          </div>
        )}

        {state === 'ready' && summary && (
          <div className="mt-6 space-y-3" data-testid="reimport-diff-preview">
            <p className="text-sm text-[var(--text-primary)]">
              {count(copy.reimportSummaryUpdate, summary.matchedTitles.length)}
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              {count(copy.reimportSummaryAdd, summary.addedTitles.length)}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {count(copy.reimportSummaryKeep, summary.keptTitles.length)}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={handleClose} className="ac-button ac-button--secondary">
                {copy.reimportCancelLabel}
              </button>
              <button
                type="button"
                data-testid="reimport-confirm-button"
                onClick={confirmReimport}
                className="ac-button ac-button--primary"
              >
                {copy.reimportConfirmLabel}
              </button>
            </div>
          </div>
        )}

        {state === 'done' && result && (
          <div className="mt-6 space-y-3" data-testid="reimport-result">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">{copy.reimportResultTitle}</h4>
            <p className="text-sm text-[var(--text-primary)]">
              {count(copy.reimportSummaryUpdate, result.changedChapterIds.length)}
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              {count(copy.reimportSummaryAdd, result.addedChapterTitles.length)}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {count(copy.reimportSummaryKeep, result.keptStaleChapterTitles.length)}
            </p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                data-testid="reimport-done-button"
                onClick={handleClose}
                className="ac-button ac-button--primary"
              >
                {copy.reimportDone}
              </button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <p role="alert" className="mt-6 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
