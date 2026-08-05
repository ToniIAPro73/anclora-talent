'use client';

import { useId, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { supportedImportAccept } from '@/lib/projects/import-config';
import { ProcessingModeBadge } from '@/components/filestudio/ProcessingModeBadge';
import type { AppMessages } from '@/lib/i18n/messages';

type ImportState = 'idle' | 'analyzing' | 'ready' | 'error';

type FieldConfidence = 'high' | 'medium' | 'low';

type AnalysisResult = {
  title: string;
  subtitle?: string;
  author?: string;
  chapterCount: number;
  chapterTitles: string[];
  warnings: string[];
  sourceFileName: string;
  /** F2: declared processing mode when the scanned-PDF OCR ran (null otherwise). */
  ocrAppliedMode: 'local' | 'service' | null;
  /** M4: heuristic per-field detection confidence. */
  confidence?: { title: FieldConfidence; author: FieldConfidence; chapters: FieldConfidence };
};

function ConfidenceBadge({ level, copy, testId }: { level: FieldConfidence; copy: AppMessages['project']; testId: string }) {
  const label =
    level === 'high' ? copy.importConfidenceHigh : level === 'medium' ? copy.importConfidenceMedium : copy.importConfidenceLow;
  const toneClass =
    level === 'high'
      ? 'text-[var(--success)] border-[var(--success)]/40 bg-[var(--success)]/10'
      : level === 'medium'
        ? 'text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10'
        : 'text-[var(--text-tertiary)] border-[var(--border-subtle)] bg-transparent';
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export function DocumentImporter({ copy }: { copy: AppMessages['project'] }) {
  const inputId = useId();
  const [selectedFileName, setSelectedFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const analyzeFile = async (file: File) => {
    setSelectedFileName(file.name);
    setImportState('analyzing');
    setAnalysis(null);
    setErrorMessage('');

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImportState('error');
      setErrorMessage(copy.importFileTooLarge);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('sourceDocument', file);
      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const data: {
        ok?: boolean;
        error?: string;
        title?: string;
        subtitle?: string;
        author?: string;
        chapterCount?: number;
        chapterTitles?: string[];
        warnings?: string[];
        sourceFileName?: string;
        ocrAppliedMode?: 'local' | 'service' | null;
        confidence?: { title: FieldConfidence; author: FieldConfidence; chapters: FieldConfidence };
      } = await response.json();

      if (!response.ok) {
        const message =
          data.error === 'FILE_TOO_LARGE'
            ? copy.importFileTooLarge
            : data.error === 'FORMAT_UNSUPPORTED'
              ? copy.importFormatUnsupported
              : copy.importErrorGeneric;
        setImportState('error');
        setErrorMessage(message);
        return;
      }

      setAnalysis({
        title: data.title ?? file.name,
        subtitle: data.subtitle ?? '',
        author: data.author ?? '',
        chapterCount: data.chapterCount ?? 1,
        chapterTitles: data.chapterTitles ?? [],
        warnings: data.warnings ?? [],
        sourceFileName: data.sourceFileName ?? file.name,
        ocrAppliedMode: data.ocrAppliedMode ?? null,
        confidence: data.confidence,
      });
      setImportState('ready');
    } catch {
      setImportState('error');
      setErrorMessage(copy.importErrorGeneric);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzeFile(file);
    } else {
      setSelectedFileName('');
      setImportState('idle');
      setAnalysis(null);
    }
  };

  const handleDragEvent = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
      return;
    }
    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
    }

    analyzeFile(file);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      input?.click();
    }
  };

  const hasError = importState === 'error';

  const borderClass = hasError
    ? 'border-red-400 bg-red-50/5'
    : dragActive
      ? 'border-[var(--accent)] bg-[var(--surface-highlight)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-soft)]';

  const iconWrapClass = hasError
    ? 'bg-red-400/15 text-red-400'
    : importState === 'ready'
      ? 'bg-[var(--button-highlight-bg)]/15 text-[var(--accent-text)]'
      : 'bg-[var(--button-highlight-bg)]/15 text-[var(--button-highlight-fg)]';

  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-[20px] border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
        <div className="flex gap-3">
          <Upload className="h-5 w-5 flex-shrink-0 text-[var(--accent-text)] mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Límite de tamaño de documento</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              El tamaño máximo permitido es de <strong>50 MB</strong>. Los archivos que excedan este límite no podrán ser importados.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <span className="ac-form-field__label">{copy.sourceDocumentLabel}</span>
        <label
          htmlFor={inputId}
          data-testid="source-document-dropzone"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEvent}
          onDragLeave={handleDragEvent}
          onDragOver={handleDragEvent}
          onDrop={handleDrop}
          className={`block cursor-pointer rounded-[24px] border-2 border-dashed p-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${borderClass}`}
        >
          <input
            id={inputId}
            data-testid="source-document-input"
            type="file"
            name="sourceDocument"
            accept={supportedImportAccept}
            onChange={handleChange}
            className="sr-only"
          />

          <div className="flex flex-col items-center gap-4 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconWrapClass}`}>
              {importState === 'analyzing' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : importState === 'ready' ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : hasError ? (
                <AlertCircle className="h-6 w-6" />
              ) : selectedFileName ? (
                <FileText className="h-6 w-6" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>

            {importState === 'idle' && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Arrastra tu documento aquí</p>
                  <p className="text-xs leading-6 text-[var(--text-secondary)]">
                    O haz clic para seleccionar un archivo compatible.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {['DOCX', 'DOC', 'PDF', 'TXT', 'MD'].map((format) => (
                    <span
                      key={format}
                      className="ac-button ac-button--ghost ac-button--sm pointer-events-none"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </>
            )}

            {importState === 'analyzing' && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.importAnalyzing}</p>
                <p className="text-xs text-[var(--text-secondary)]">{selectedFileName}</p>
              </div>
            )}

            {importState === 'ready' && analysis && (
              <div className="w-full max-w-xl space-y-3 text-left" data-testid="import-analysis-panel">
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.importReady}</p>
                  <p className="text-xs text-[var(--text-secondary)]" data-testid="import-analysis-file-name">{selectedFileName}</p>
                  {analysis.ocrAppliedMode && (
                    <div className="flex flex-wrap items-center justify-center gap-2" data-testid="import-ocr-mode">
                      <p className="text-xs text-[var(--text-secondary)]">{copy.importOcrAppliedLabel}</p>
                      <ProcessingModeBadge
                        mode={analysis.ocrAppliedMode}
                        labels={{
                          local: copy.importOcrBadgeLocal,
                          service: copy.importOcrBadgeService,
                          browser: copy.importOcrBadgeBrowser,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {copy.importTitleDetected}
                      </p>
                      {analysis.confidence ? (
                        <ConfidenceBadge level={analysis.confidence.title} copy={copy} testId="import-analysis-title-confidence" />
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]" data-testid="import-analysis-title">
                      {analysis.title}
                    </p>
                    {analysis.subtitle ? (
                      <p className="text-xs leading-6 text-[var(--text-secondary)]" data-testid="import-analysis-subtitle">
                        {analysis.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {copy.importAuthorDetected}
                      </p>
                      {analysis.confidence ? (
                        <ConfidenceBadge level={analysis.confidence.author} copy={copy} testId="import-analysis-author-confidence" />
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]" data-testid="import-analysis-author">
                      {analysis.author || '—'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[var(--accent-text)]" data-testid="import-analysis-chapters">
                        {copy.importChaptersDetected.replace('{count}', String(analysis.chapterCount))}
                      </p>
                      {analysis.confidence ? (
                        <ConfidenceBadge level={analysis.confidence.chapters} copy={copy} testId="import-analysis-chapters-confidence" />
                      ) : null}
                    </div>
                  </div>
                </div>
                {analysis.chapterTitles.length > 0 ? (
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                      {copy.importChapterPreviewLabel}
                    </p>
                    <ul className="space-y-2 text-xs leading-6 text-[var(--text-secondary)]" data-testid="import-analysis-chapter-list">
                      {analysis.chapterTitles.map((chapterTitle, index) => (
                        <li key={`${chapterTitle}-${index}`} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                          <span>{chapterTitle}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {analysis.warnings.length > 0 ? (
                  <div className="ac-surface-panel gap-2 border-amber-400/40 bg-amber-400/10 p-4" data-testid="import-analysis-warnings">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                      {copy.importWarningsLabel}
                    </p>
                    <ul className="space-y-1 text-xs leading-6 text-amber-50/90">
                      {analysis.warnings.map((warning, index) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-xs text-center text-[var(--text-secondary)]">
                  El proyecto se creará con esta estructura y podrás afinar lo mínimo desde el editor.
                </p>
              </div>
            )}

            {hasError && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
                <p className="text-xs text-[var(--text-secondary)]">Haz clic para seleccionar otro archivo</p>
              </div>
            )}
          </div>
        </label>
      </div>
      <p className="text-xs leading-6 text-[var(--text-tertiary)]">{copy.sourceDocumentHint}</p>
    </div>
  );
}
