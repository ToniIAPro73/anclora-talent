'use client';

import { useId, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react';
import { FileText, Upload } from 'lucide-react';
import { supportedImportAccept } from '@/lib/projects/import-config';
import type { AppMessages } from '@/lib/i18n/messages';

export function DocumentImporter({ copy }: { copy: AppMessages['project'] }) {
  const inputId = useId();
  const [selectedFileName, setSelectedFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const updateSelectedFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    setSelectedFileName(file?.name ?? '');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSelectedFile(event.target.files);
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
    updateSelectedFile(event.dataTransfer.files);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      input?.click();
    }
  };

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
          className={`block cursor-pointer rounded-[24px] border-2 border-dashed p-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] ${
            dragActive
              ? 'border-[var(--accent-mint)] bg-[var(--surface-highlight)]'
              : 'border-[var(--border-strong)] bg-[var(--surface-soft)]'
          }`}
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
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--button-highlight-bg)]/15 text-[var(--button-highlight-fg)]">
              {selectedFileName ? <FileText className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
            </div>
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
            {selectedFileName ? (
              <p className="text-sm font-semibold text-[var(--text-primary)]">Archivo listo: {selectedFileName}</p>
            ) : null}
          </div>
        </label>
      </div>
      <p className="text-xs leading-6 text-[var(--text-tertiary)]">{copy.sourceDocumentHint}</p>
    </div>
  );
}
