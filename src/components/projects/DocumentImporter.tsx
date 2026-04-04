'use client';

import { useId, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { supportedImportAccept } from '@/lib/projects/import-config';
import type { AppMessages } from '@/lib/i18n/messages';

type ImportState = 'idle' | 'analyzing' | 'ready' | 'error';

type AnalysisResult = {
  title: string;
  chapterCount: number;
  sourceFileName: string;
};

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

      const data: { ok?: boolean; error?: string; title?: string; chapterCount?: number; sourceFileName?: string } =
        await response.json();

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
        chapterCount: data.chapterCount ?? 1,
        sourceFileName: data.sourceFileName ?? file.name,
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
      ? 'border-[var(--accent-mint)] bg-[var(--surface-highlight)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-soft)]';

  const iconWrapClass = hasError
    ? 'bg-red-400/15 text-red-400'
    : importState === 'ready'
      ? 'bg-[var(--button-highlight-bg)]/15 text-[var(--accent-mint)]'
      : 'bg-[var(--button-highlight-bg)]/15 text-[var(--button-highlight-fg)]';

  return (
    <div className="mt-5 space-y-3">
      <div className="space-y-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{copy.sourceDocumentLabel}</span>
        <label
          htmlFor={inputId}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEvent}
          onDragLeave={handleDragEvent}
          onDragOver={handleDragEvent}
          onDrop={handleDrop}
          className={`block cursor-pointer rounded-[24px] border-2 border-dashed p-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] ${borderClass}`}
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
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--page-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]"
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
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.importReady}</p>
                <p className="text-xs text-[var(--text-secondary)]">{selectedFileName}</p>
                <p className="text-xs font-semibold text-[var(--accent-mint)]">
                  {copy.importChaptersDetected.replace('{count}', String(analysis.chapterCount))}
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
