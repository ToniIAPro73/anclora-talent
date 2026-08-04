'use client';

import { useState, useTransition } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import { supportedImportAccept } from '@/lib/projects/import-config';
import type { InferredStructureSchema, StructureProfile } from '@/lib/structure-profile/model';
import {
  extractStructureProfileAction,
  saveStructureProfileAction,
} from '@/lib/structure-profile/actions';

type Copy = AppMessages['project'];

interface StructureScaffoldingDialogProps {
  isOpen: boolean;
  /** Saved structure profiles of the user (G4: versioned, source registered). */
  profiles: StructureProfile[];
  copy: Copy;
  /** Called ONLY when the human confirms the inferred schema (G2). */
  onConfirm: (schema: InferredStructureSchema) => void;
  onClose: () => void;
}

type DialogState = 'idle' | 'analyzing' | 'confirm' | 'saving' | 'error';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Governed structure wizard (FASE 3): upload a reference document or pick a
 * saved profile → the inferred schema is shown for review (hierarchy, parts
 * with their rhetorical function, per-field confidence) → the scaffold is
 * handed to the creation form ONLY after the human presses "Confirm" (G2).
 * "Discard" closes the flow without producing anything.
 */
export function StructureScaffoldingDialog({
  isOpen,
  profiles,
  copy,
  onConfirm,
  onClose,
}: StructureScaffoldingDialogProps) {
  const [state, setState] = useState<DialogState>('idle');
  const [schema, setSchema] = useState<InferredStructureSchema | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState('');
  const [saveProfile, setSaveProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  if (!isOpen) return null;

  const reset = () => {
    setState('idle');
    setSchema(null);
    setSourceFileName(null);
    setSuggestedName('');
    setSaveProfile(false);
    setProfileName('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const showConfirmation = (
    inferred: InferredStructureSchema,
    source: string | null,
    nameSuggestion: string,
  ) => {
    setSchema(inferred);
    setSourceFileName(source);
    setSuggestedName(nameSuggestion);
    setProfileName(nameSuggestion);
    setState('confirm');
  };

  const analyzeFile = (selected: File) => {
    setError('');
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setState('error');
      setError(copy.structureError);
      return;
    }

    setState('analyzing');
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('referenceDocument', selected);
        const result = await extractStructureProfileAction(formData);
        showConfirmation(result.schema, result.sourceFileName, result.suggestedName);
      } catch {
        setState('error');
        setError(copy.structureError);
      }
    });
  };

  const chooseSavedProfile = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;
    // Even a saved profile goes through the confirmation screen (G2: no
    // silent application, ever).
    showConfirmation(profile.schema, profile.sourceFileName, profile.name);
  };

  // G2: this is the single governance gate — the scaffold only exists after
  // an explicit human confirmation of the inferred schema.
  const confirmSchema = () => {
    if (!schema) return;

    if (!saveProfile) {
      onConfirm(schema);
      handleClose();
      return;
    }

    setState('saving');
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('name', profileName.trim() || suggestedName);
        formData.set('schema', JSON.stringify(schema));
        formData.set('sourceFileName', sourceFileName ?? '');
        await saveStructureProfileAction(formData);
        onConfirm(schema);
        handleClose();
      } catch {
        setState('error');
        setError(copy.structureError);
      }
    });
  };

  const interpolate = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce(
      (text, [key, value]) => text.replace(`{${key}}`, String(value)),
      template,
    );

  return (
    <div className="ac-modal" role="dialog" aria-modal="true" data-testid="structure-dialog">
      <div className="ac-modal__backdrop" onClick={handleClose} />
      <div className="ac-modal__panel max-w-lg rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {copy.structureDialogTitle}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {copy.structureDialogDescription}
            </p>
          </div>
          <button type="button" onClick={handleClose} aria-label={copy.structureDiscardAction}>
            <X className="h-5 w-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {state === 'idle' && (
          <div className="mt-6 space-y-5">
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-[18px] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-soft)] px-6 py-8 text-center">
              <Upload className="h-6 w-6 text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--accent)]">
                {copy.structureSourceUploadLabel}
              </span>
              <input
                data-testid="structure-file-input"
                type="file"
                accept={supportedImportAccept}
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) analyzeFile(selected);
                }}
              />
            </label>

            <div>
              <p className="ac-form-field__label">{copy.structureSourceSavedLabel}</p>
              {profiles.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                  {copy.structureNoSavedProfiles}
                </p>
              ) : (
                <select
                  data-testid="structure-profile-select"
                  className="field-input mt-1 w-full"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) chooseSavedProfile(event.target.value);
                  }}
                >
                  <option value="" disabled>
                    {copy.structureSourceSavedLabel}
                  </option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · v{profile.version}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {(state === 'analyzing' || state === 'saving') && (
          <div className="mt-6 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.structureAnalyzing}
          </div>
        )}

        {state === 'confirm' && schema && (
          <div className="mt-6 space-y-4" data-testid="structure-confirm-screen">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              {copy.structureConfirmTitle}
            </h4>

            <p className="text-sm text-[var(--text-primary)]" data-testid="structure-hierarchy-line">
              {interpolate(copy.structureHierarchyLine, {
                levels: schema.hierarchy.levels.join(' → '),
                depth: schema.hierarchy.depth,
              })}{' '}
              <span className="text-xs text-[var(--text-tertiary)]">
                ({copy.structureConfidencePrefix} {schema.hierarchy.confianza})
              </span>
            </p>

            <p className="text-sm text-[var(--text-primary)]" data-testid="structure-summary-line">
              {interpolate(copy.structureSummaryLine, {
                parts: schema.metrics.desglose.h1Partes,
                chapters: schema.metrics.desglose.h2Capitulos,
                subsections: schema.metrics.desglose.h3Subsecciones,
              })}
            </p>

            <ul className="space-y-1" data-testid="structure-parts-list">
              {schema.macroPattern.secuencia.map((parte, index) => (
                <li key={index} className="text-sm text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {parte.parte}
                  </span>
                  {' — '}
                  {parte.funcionRetorica ?? copy.structureFunctionMissing}
                </li>
              ))}
            </ul>

            <p className="text-xs leading-5 text-[var(--text-tertiary)]">
              {schema.voiceScopeNote}
            </p>

            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                data-testid="structure-save-profile-checkbox"
                checked={saveProfile}
                onChange={(event) => setSaveProfile(event.target.checked)}
              />
              {copy.structureSaveProfileLabel}
            </label>
            {saveProfile && (
              <input
                type="text"
                data-testid="structure-profile-name-input"
                className="field-input w-full"
                placeholder={copy.structureProfileNamePlaceholder}
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="structure-discard-button"
                onClick={handleClose}
                className="ac-button ac-button--secondary"
              >
                {copy.structureDiscardAction}
              </button>
              <button
                type="button"
                data-testid="structure-confirm-button"
                onClick={confirmSchema}
                className="ac-button ac-button--primary"
              >
                {copy.structureConfirmAction}
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
