'use client';

import { useState, useRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { createChapterAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import type { DocumentChapter } from '@/lib/projects/types';

interface AddChapterDialogProps {
  isOpen: boolean;
  projectId: string;
  chapters: DocumentChapter[];
  onClose: () => void;
  onChapterAdded?: (chapter: DocumentChapter) => void;
}

type InsertPosition = 'end' | 'before' | 'after';

export function AddChapterDialog({ isOpen, projectId, chapters, onClose }: AddChapterDialogProps) {
  const [title, setTitle] = useState(`Capítulo ${chapters.length + 1}`);
  const [position, setPosition] = useState<InsertPosition>('end');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapters[0]?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('chapterTitle', title);
      formData.set('position', position);
      if (position !== 'end' && selectedChapterId) {
        formData.set('targetChapterId', selectedChapterId);
      }

      await createChapterAction(formData);
      setTitle(`Capítulo ${chapters.length + 1}`);
      setPosition('end');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el capítulo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    setTitle(`Capítulo ${chapters.length + 1}`);
    setPosition('end');
    setError(null);
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
        {/* Header */}
        <div className="ac-modal__header mb-1">
          <div className="flex items-start justify-between gap-4">
          <div>
            <p className="ac-modal__meta">Capítulo</p>
            <h2 className="ac-modal__title text-[1.5rem]">Agregar nuevo capítulo</h2>
            <p className="ac-modal__summary mt-1 text-xs">
              {chapters.length + 1} capítulos en total
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={`${premiumSecondaryLightButton} p-2`}
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="ac-modal__body space-y-4">
          {/* Title input */}
          <label className="ac-form-field">
            <span className="ac-form-field__label">Título del capítulo</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              placeholder="Ej: Introducción"
              className="field-input"
              autoFocus
            />
          </label>

          {/* Position selector */}
          <label className="ac-form-field">
            <span className="ac-form-field__label">Posición</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="end"
                  checked={position === 'end'}
                  onChange={(e) => setPosition(e.target.value as InsertPosition)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <span className="text-sm text-[var(--text-primary)]">Al final</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="before"
                  checked={position === 'before'}
                  onChange={(e) => setPosition(e.target.value as InsertPosition)}
                  disabled={isSaving || chapters.length === 0}
                  className="h-4 w-4"
                />
                <span className="text-sm text-[var(--text-primary)]">Antes de:</span>
              </label>

              {position === 'before' && chapters.length > 0 && (
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={isSaving}
                  className="field-select ml-6"
                >
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="after"
                  checked={position === 'after'}
                  onChange={(e) => setPosition(e.target.value as InsertPosition)}
                  disabled={isSaving || chapters.length === 0}
                  className="h-4 w-4"
                />
                <span className="text-sm text-[var(--text-primary)]">Después de:</span>
              </label>

              {position === 'after' && chapters.length > 0 && (
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  disabled={isSaving}
                  className="field-select ml-6"
                >
                  {chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </label>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-[var(--status-danger-surface)] p-3 text-sm text-[var(--status-danger-text)]">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="ac-modal__footer flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className={`${premiumSecondaryLightButton} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className={`${premiumPrimaryDarkButton} inline-flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Crear capítulo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
