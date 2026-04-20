'use client';

import { useState, useRef } from 'react';
import { X, Upload, Loader2, AlertCircle, Download } from 'lucide-react';
import { supportedImportAccept } from '@/lib/projects/import-config';
import type { DocumentChapter } from '@/lib/projects/types';

interface ImportChapterDialogProps {
  isOpen: boolean;
  projectId: string;
  chapters: DocumentChapter[];
  onClose: () => void;
  onChapterImported?: () => void;
}

type ImportState = 'idle' | 'analyzing' | 'ready' | 'importing' | 'error';

interface ImportAnalysis {
  title: string;
  contentPreview: string;
  sourceFileName: string;
  wordCount: number;
}

type ImportResponse = {
  error?: string;
  title?: string;
  subtitle?: string;
  chapterTitles?: string[];
};

type ImportPositionValue = 'end' | `before-${string}` | `after-${string}`;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export function ImportChapterDialog({ isOpen, projectId, chapters, onClose, onChapterImported }: ImportChapterDialogProps) {
  const [importState, setImportState] = useState<ImportState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [error, setError] = useState<string>('');
  const [position, setPosition] = useState<ImportPositionValue>('end');
  const [chapterTitle, setChapterTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const analyzeFile = async (file: File) => {
    setSelectedFile(file);
    setImportState('analyzing');
    setAnalysis(null);
    setError('');

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImportState('error');
      setError('El archivo es demasiado grande (máximo 50MB)');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('sourceDocument', file);
      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const data: ImportResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al analizar el archivo');
      }

      // Extract preview and word count
      const contentPreview = (data.chapterTitles?.[0] || 'Contenido importado').substring(0, 200);
      const wordCount = (data.title?.split(/\s+/).length || 0) + (data.subtitle?.split(/\s+/).length || 0);

      setAnalysis({
        title: data.title || file.name.replace(/\.[^.]+$/, ''),
        contentPreview: contentPreview || 'Contenido del archivo importado',
        sourceFileName: file.name,
        wordCount,
      });

      setChapterTitle(data.title || file.name.replace(/\.[^.]+$/, ''));
      setImportState('ready');
    } catch (err) {
      setImportState('error');
      setError(err instanceof Error ? err.message : 'Error al analizar el archivo');
      setSelectedFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      analyzeFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !analysis) return;

    setImportState('importing');
    setError('');

    try {
      const { importChapterAction } = await import('@/lib/projects/actions');
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('sourceDocument', selectedFile);
      formData.set('chapterTitle', chapterTitle);
      const [positionKind, targetChapterId] = position.split('-', 2);
      formData.set('position', positionKind);
      if (position !== 'end' && targetChapterId) {
        formData.set('targetChapterId', targetChapterId);
      }

      await importChapterAction(formData);

      onChapterImported?.();
      onClose();
    } catch (err) {
      setImportState('error');
      setError(err instanceof Error ? err.message : 'Error al importar el capítulo');
    }
  };

  const handleClose = () => {
    if (importState === 'importing') return;
    setImportState('idle');
    setSelectedFile(null);
    setAnalysis(null);
    setError('');
    setChapterTitle('');
    setPosition('end');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      onClick={handleClose}
    >
      <div className="ac-modal-backdrop min-h-screen p-4 sm:p-6">
        <div
          ref={dialogRef}
          className="ac-modal w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ac-modal__header mb-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ac-modal__meta">Capítulo</p>
                <h2 className="ac-modal__title text-[1.5rem]">Importar capítulo</h2>
                <p className="ac-modal__summary mt-1 text-xs">Importa contenido como nuevo capítulo</p>
              </div>
              <button
                onClick={handleClose}
                disabled={importState === 'importing'}
                className="ac-button ac-button--ghost ac-button--icon disabled:opacity-50"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!analysis && (
          <div className="mb-6 rounded-[20px] border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Upload className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Límite de tamaño de documento</h3>
                <p className="mt-1 text-sm text-blue-800">
                  El tamaño máximo permitido es de <strong>50 MB</strong>. Los archivos que excedan este límite no podrán ser importados.
                </p>
              </div>
            </div>
          </div>
        )}

        {!analysis && (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="mb-6 rounded-[24px] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--surface-soft)] p-8 text-center transition hover:border-[var(--accent-mint)] hover:bg-[var(--surface-soft)]"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept={supportedImportAccept}
              disabled={importState !== 'idle'}
              className="hidden"
              data-testid="import-file-input"
            />

            {importState === 'analyzing' && (
              <div className="space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--accent-mint)]" />
                <p className="text-sm text-[var(--text-secondary)]">Analizando archivo...</p>
              </div>
            )}

            {importState === 'idle' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ac-button ac-button--primary inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Seleccionar archivo
                </button>
                <p className="text-xs text-[var(--text-tertiary)]">o arrastra un archivo aquí</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Formatos: DOCX, PDF, Markdown, TXT
                </p>
              </div>
            )}
          </div>
        )}

        {analysis && (
          <div className="ac-modal__body mb-6 space-y-4">
            <div className="ac-surface-panel ac-surface-panel--subtle p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{analysis.sourceFileName}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {analysis.wordCount} palabras
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnalysis(null);
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={importState === 'importing'}
                  className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
                >
                  Cambiar archivo
                </button>
              </div>
              <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">{analysis.contentPreview}</p>
            </div>

            <label className="ac-form-field">
              <span className="ac-form-field__label">Título del capítulo</span>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                disabled={importState === 'importing'}
                placeholder={analysis.title}
                className="field-input disabled:opacity-50"
              />
            </label>

            <label className="ac-form-field">
              <span className="ac-form-field__label">Posición</span>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as ImportPositionValue)}
                disabled={importState === 'importing'}
                className="field-select disabled:opacity-50"
              >
                <option value="end">Al final</option>
                {chapters.map((ch) => (
                  <optgroup key={`before-${ch.id}`} label={`Antes de: ${ch.title}`}>
                    <option value={`before-${ch.id}`}>Antes de {ch.title}</option>
                  </optgroup>
                ))}
                {chapters.map((ch) => (
                  <optgroup key={`after-${ch.id}`} label={`Después de: ${ch.title}`}>
                    <option value={`after-${ch.id}`}>Después de {ch.title}</option>
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        )}

        {error && (
          <div className="mb-6 flex gap-3 rounded-lg bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="ac-modal__footer">
          <button
            onClick={handleClose}
            disabled={importState === 'importing'}
            className="ac-button ac-button--secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          {analysis && (
            <button
              onClick={handleImport}
              disabled={importState !== 'ready' || !chapterTitle.trim()}
              className="ac-button ac-button--primary inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importState === 'importing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Importar
                </>
              )}
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
