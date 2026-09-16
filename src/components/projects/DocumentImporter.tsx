'use client';

import { useId, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { supportedImportAccept } from '@/lib/projects/import-config';
import { ProcessingModeBadge } from '@/components/filestudio/ProcessingModeBadge';
import type { AppMessages } from '@/lib/i18n/messages';
import { Portal } from '@/components/ui/Portal';
import { DocumentDataModal } from './DocumentDataModal';
import {
  serializeCompositionSettings,
  type CompositionSettings,
  type CompositionSource,
} from '@/lib/projects/composition';

type ImportState = 'idle' | 'analyzing' | 'ready' | 'error';

type FieldConfidence = 'high' | 'medium' | 'low';

type ManuscriptType = 'essay' | 'guide' | 'novel' | 'non-fiction';

const MANUSCRIPT_TYPES: ManuscriptType[] = ['non-fiction', 'essay', 'guide', 'novel'];

function manuscriptTypeLabel(type: ManuscriptType, copy: AppMessages['project']) {
  switch (type) {
    case 'essay':
      return copy.importManuscriptTypeEssay;
    case 'guide':
      return copy.importManuscriptTypeGuide;
    case 'novel':
      return copy.importManuscriptTypeNovel;
    case 'non-fiction':
      return copy.importManuscriptTypeNonFiction;
  }
}

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
  /** M5: effective type (override if set) and the auto-detected baseline. */
  manuscriptType?: ManuscriptType;
  detectedManuscriptType?: ManuscriptType;
  /** U6: composition detected from the source file (DOCX Normal style). */
  composition?: { settings: CompositionSettings; source: CompositionSource };
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
      className={`inline-flex items-center shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function isDocxFile(file: File) {
  return (
    file.name.toLowerCase().endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
}

function isPdfFile(file: File) {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
}

type DocumentMode = 'fixed-pdf' | 'editable';

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textFromHtml(html: string) {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ');
  }
  const document = new DOMParser().parseFromString(html, 'text/html');
  return document.body.textContent ?? '';
}

function compositionFromDocxNormalStyle(
  normalStyle: { fontFamily?: string; fontSizePt?: number } | null,
): AnalysisResult['composition'] {
  if (!normalStyle) return undefined;
  const settings: CompositionSettings = {};
  if (normalStyle.fontFamily) settings.fontFamily = normalStyle.fontFamily;
  if (normalStyle.fontSizePt !== undefined) settings.fontSizePt = normalStyle.fontSizePt;
  return Object.keys(settings).length > 0 ? { settings, source: 'docx-styles' } : undefined;
}

async function analyzeDocxLocally(file: File, copy: AppMessages['project']): Promise<AnalysisResult | null> {
  if (!isDocxFile(file)) return null;

  try {
    const [{ extractDocxNormalStyle }, mammoth] = await Promise.all([
      import('@/lib/projects/docx-styles'),
      import('mammoth'),
    ]);
    const arrayBuffer = await file.arrayBuffer();
    const [result, normalStyle] = await Promise.all([
      mammoth.convertToHtml({ arrayBuffer }),
      extractDocxNormalStyle(arrayBuffer),
    ]);
    const html = result.value ?? '';
    const plainText = textFromHtml(html).replace(/\s+/g, ' ').trim();
    const title =
      (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() ||
      plainText.split(/[.!?\n]/).find(Boolean)?.trim() ||
      titleFromFileName(file.name);
    const chapterTitles = Array.from(html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi))
      .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 4);

    return {
      title,
      subtitle: '',
      author: '',
      chapterCount: Math.max(chapterTitles.length, 1),
      chapterTitles,
      warnings: [copy.importLocalFallbackWarning],
      sourceFileName: file.name,
      ocrAppliedMode: null,
      manuscriptType: 'non-fiction',
      detectedManuscriptType: 'non-fiction',
      composition: compositionFromDocxNormalStyle(normalStyle),
    };
  } catch {
    return null;
  }
}

export function DocumentImporter({
  copy,
  onAnalysisChange,
  onPreprocessingChange,
}: {
  copy: AppMessages['project'];
  onAnalysisChange?: (analysis: { fileName: string; title: string } | null) => void;
  onPreprocessingChange?: (isProcessing: boolean) => void;
}) {
  const inputId = useId();
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  // U6: composition reviewed in the pre-create document-data modal; written
  // as a hidden `composition` form field once confirmed.
  const [confirmedComposition, setConfirmedComposition] = useState<CompositionSettings | null>(null);
  const [isDocumentDataOpen, setIsDocumentDataOpen] = useState(false);
  // Fixed-PDF document mode: only meaningful for a PDF upload. 'fixed-pdf'
  // is the recommended default — the original PDF's design is preserved.
  const [documentMode, setDocumentMode] = useState<DocumentMode>('fixed-pdf');

  const analyzeFile = async (file: File, manuscriptTypeOverride?: ManuscriptType) => {
    setSelectedFileName(file.name);
    setSelectedFile(file);
    setImportSessionId(null);
    onPreprocessingChange?.(true);
    if (isPdfFile(file)) {
      setDocumentMode('fixed-pdf');
    }
    setImportState('analyzing');
    setAnalysis(null);
    setErrorMessage('');
    onAnalysisChange?.(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImportState('error');
      setErrorMessage(copy.importFileTooLarge);
      onPreprocessingChange?.(false);
      return;
    }

    try {
      let response: Response;
      let blobUrl: string | null = null;
      if (file.size > 4 * 1024 * 1024) {
        try {
          const { upload } = await import('@vercel/blob/client');
          const blob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/blob/upload',
          });
          blobUrl = blob.url;
        } catch (blobErr) {
          console.warn('[DocumentImporter] direct blob upload failed or skipped, falling back to multipart', blobErr);
        }
      }

      if (blobUrl) {
        response = await fetch('/api/projects/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceBlobUrl: blobUrl,
            sourceFileName: file.name,
            sourceMimeType: file.type,
            sourceSizeBytes: file.size,
            documentMode: isPdfFile(file) ? 'fixed-pdf' : 'editable',
            manuscriptType: manuscriptTypeOverride,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('sourceDocument', file);
        if (manuscriptTypeOverride) formData.append('manuscriptType', manuscriptTypeOverride);
        if (isPdfFile(file)) formData.append('documentMode', 'fixed-pdf');
        response = await fetch('/api/projects/import', {
          method: 'POST',
          body: formData,
        });
      }

      const data: {
        ok?: boolean;
        importSessionId?: string;
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
        manuscriptType?: ManuscriptType;
        detectedManuscriptType?: ManuscriptType;
        /** U4: true when the source parser failed and the import degraded to
         *  an empty shell document — surfaced as a non-blocking warning. */
        parseWarning?: boolean;
        /** U6: composition detected from the source file. */
        composition?: { settings: CompositionSettings; source: CompositionSource };
      } = await response.json().catch(() => ({
        error: response.status === 413 ? 'FILE_TOO_LARGE' : 'IMPORT_FAILED',
      }));

      if (!response.ok) {
        const localAnalysis = await analyzeDocxLocally(file, copy);
        if (localAnalysis) {
          setAnalysis(localAnalysis);
          setConfirmedComposition(null);
          setIsDocumentDataOpen(true);
          setImportState('ready');
          onAnalysisChange?.({ fileName: localAnalysis.sourceFileName, title: localAnalysis.title });
          onPreprocessingChange?.(false);
          return;
        }

        const message =
          data.error === 'FILE_TOO_LARGE'
            ? copy.importFileTooLarge
            : data.error === 'FORMAT_UNSUPPORTED'
              ? copy.importFormatUnsupported
              : copy.importErrorGeneric;
        setImportState('error');
        setErrorMessage(message);
        onPreprocessingChange?.(false);
        return;
      }

      setImportSessionId(data.importSessionId ?? null);
      const nextAnalysis: AnalysisResult = {
        title: data.title ?? file.name,
        subtitle: data.subtitle ?? '',
        author: data.author ?? '',
        chapterCount: data.chapterCount ?? 1,
        chapterTitles: data.chapterTitles ?? [],
        warnings: data.parseWarning
          ? [copy.importParseWarning, ...(data.warnings ?? [])]
          : data.warnings ?? [],
        sourceFileName: data.sourceFileName ?? file.name,
        ocrAppliedMode: data.ocrAppliedMode ?? null,
        confidence: data.confidence,
        manuscriptType: data.manuscriptType,
        detectedManuscriptType: data.detectedManuscriptType,
        composition: data.composition,
      };
      setAnalysis(nextAnalysis);
      onAnalysisChange?.({ fileName: nextAnalysis.sourceFileName, title: nextAnalysis.title });
      // U6: a fresh analysis resets any previously confirmed composition and
      // auto-opens the pre-create document-data modal.
      setConfirmedComposition(null);
      setIsDocumentDataOpen(true);
      setImportState('ready');
      onPreprocessingChange?.(false);
    } catch {
      const localAnalysis = await analyzeDocxLocally(file, copy);
      if (localAnalysis) {
        setAnalysis(localAnalysis);
        setConfirmedComposition(null);
        setIsDocumentDataOpen(true);
        setImportState('ready');
        onAnalysisChange?.({ fileName: localAnalysis.sourceFileName, title: localAnalysis.title });
        onPreprocessingChange?.(false);
        return;
      }
      setImportState('error');
      setErrorMessage(copy.importErrorGeneric);
      onPreprocessingChange?.(false);
    }
  };

  const handleManuscriptTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!selectedFile) return;
    analyzeFile(selectedFile, event.target.value as ManuscriptType);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      analyzeFile(file);
    } else {
      setSelectedFileName('');
      setImportSessionId(null);
      setImportState('idle');
      setAnalysis(null);
      onAnalysisChange?.(null);
      onPreprocessingChange?.(false);
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{copy.importSizeLimitTitle}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {copy.importSizeLimitDescription}
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
          {/* Note: NO name attribute so the raw file is not submitted with createProjectAction */}
          <input
            id={inputId}
            data-testid="source-document-input"
            type="file"
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
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.importDropTitle}</p>
                  <p className="text-xs leading-6 text-[var(--text-secondary)]">
                    {copy.importDropHint}
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
                {selectedFile && isPdfFile(selectedFile) ? (
                  <div
                    role="radiogroup"
                    aria-label={copy.documentModeLabel}
                    data-testid="document-mode-selector"
                    // Fase 4: this selector renders inside containers of very
                    // different widths (a full-width /projects/new page vs.
                    // the narrow dashboard sidebar column) — a viewport-width
                    // breakpoint (`sm:grid-cols-2`) doesn't know which one it
                    // is in and forced two columns even when the container
                    // itself had no room, compressing and overlapping the
                    // radio card content. Single column always fits.
                    className="grid gap-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                      {copy.documentModeLabel}
                    </p>
                    {(
                      [
                        {
                          value: 'fixed-pdf' as const,
                          title: copy.documentModeFixedPdfTitle,
                          desc: copy.documentModeFixedPdfDesc,
                          testId: 'document-mode-fixed-pdf',
                          badge: copy.documentModeFixedPdfRecommended,
                        },
                        {
                          value: 'editable' as const,
                          title: copy.documentModeEditableTitle,
                          desc: copy.documentModeEditableDesc,
                          testId: 'document-mode-editable',
                          badge: null,
                        },
                      ]
                    ).map((option) => (
                      <label
                        key={option.value}
                        data-testid={option.testId}
                        className={`ac-surface-panel ac-surface-panel--subtle flex cursor-pointer flex-col gap-2 p-4 text-left transition ${
                          documentMode === option.value ? 'border-[var(--accent)]' : ''
                        }`}
                      >
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <input
                              type="radio"
                              data-testid={`${option.testId}-radio`}
                              name="document-mode-choice"
                              value={option.value}
                              checked={documentMode === option.value}
                              onChange={() => setDocumentMode(option.value)}
                              className="h-4 w-4 shrink-0"
                            />
                            <span className="text-sm font-semibold text-[var(--text-primary)]">
                              {option.title}
                            </span>
                          </span>
                          {option.badge ? (
                            <span className="ac-button ac-button--ghost ac-button--sm pointer-events-none shrink-0 text-[10px] uppercase tracking-[0.1em]">
                              {option.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs leading-6 text-[var(--text-secondary)]">{option.desc}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-1 p-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] shrink-0">
                        {copy.importTitleDetected}
                      </p>
                      {analysis.confidence ? (
                        <ConfidenceBadge level={analysis.confidence.title} copy={copy} testId="import-analysis-title-confidence" />
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate" data-testid="import-analysis-title">
                      {analysis.title}
                    </p>
                    {analysis.subtitle ? (
                      <p className="text-xs leading-6 text-[var(--text-secondary)] truncate" data-testid="import-analysis-subtitle">
                        {analysis.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-1 p-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] shrink-0">
                        {copy.importAuthorDetected}
                      </p>
                      {analysis.confidence ? (
                        <ConfidenceBadge level={analysis.confidence.author} copy={copy} testId="import-analysis-author-confidence" />
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate" data-testid="import-analysis-author">
                      {analysis.author || '—'}
                    </p>
                  </div>
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-1 p-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] shrink-0">
                        {copy.importStructureDetected}
                      </p>
                      {analysis.confidence ? (
                        <ConfidenceBadge level={analysis.confidence.chapters} copy={copy} testId="import-analysis-structure-confidence" />
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-[var(--accent-text)]" data-testid="import-analysis-chapters">
                      {analysis.chapterCount === 1 ? copy.importChapterDetected : copy.importChaptersDetected.replace('{count}', String(analysis.chapterCount))}
                    </p>
                  </div>
                </div>
                {analysis.manuscriptType ? (
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-2 p-4">
                    <label
                      htmlFor={`${inputId}-manuscript-type`}
                      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]"
                    >
                      {copy.importManuscriptTypeLabel}
                    </label>
                    <select
                      id={`${inputId}-manuscript-type`}
                      data-testid="import-analysis-manuscript-type"
                      value={analysis.manuscriptType}
                      onChange={handleManuscriptTypeChange}
                      className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    >
                      {MANUSCRIPT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {manuscriptTypeLabel(type, copy)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
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
                  <div className="ac-surface-panel gap-2 border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4" data-testid="import-analysis-warnings">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--warning)]">
                      {copy.importWarningsLabel}
                    </p>
                    <ul className="space-y-1 text-xs leading-6 text-[var(--warning)]/90">
                      {analysis.warnings.map((warning, index) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="text-xs text-center text-[var(--text-secondary)]">
                  {copy.importStructureHint}
                </p>
                <button
                  type="button"
                  data-testid="document-data-reopen-button"
                  onClick={(event) => {
                    event.preventDefault();
                    setIsDocumentDataOpen(true);
                  }}
                  className="ac-button ac-button--secondary ac-button--sm"
                >
                  {copy.documentDataReopenButton}
                </button>
              </div>
            )}

            {hasError && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-400">{errorMessage}</p>
                <p className="text-xs text-[var(--text-secondary)]">{copy.importChooseAnother}</p>
              </div>
            )}
          </div>
        </label>
      </div>
      <p className="text-xs leading-6 text-[var(--text-tertiary)]">{copy.sourceDocumentHint}</p>

      {confirmedComposition && (
        <input
          type="hidden"
          name="composition"
          data-testid="composition-hidden-input"
          value={serializeCompositionSettings(confirmedComposition)}
        />
      )}

      {importSessionId && (
        <input
          type="hidden"
          name="importSessionId"
          data-testid="import-session-id-input"
          value={importSessionId}
        />
      )}

      {selectedFile && isPdfFile(selectedFile) && (
        <input
          type="hidden"
          name="documentMode"
          data-testid="document-mode-hidden-input"
          value={documentMode}
        />
      )}

      <Portal>
        <DocumentDataModal
          isOpen={isDocumentDataOpen}
          mode="pre-create"
          copy={copy}
          initialSettings={analysis?.composition?.settings}
          source={analysis?.composition?.source ?? 'not-extracted'}
          onConfirm={(settings) => setConfirmedComposition(settings)}
          onClose={() => setIsDocumentDataOpen(false)}
          documentMode={selectedFile && isPdfFile(selectedFile) ? documentMode : undefined}
        />
      </Portal>
    </div>
  );
}
