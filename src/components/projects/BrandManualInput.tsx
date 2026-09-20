'use client';

import { useState, useTransition, type ChangeEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import { createBrandProfileAction } from '@/lib/brand/actions';

export function BrandManualInput({
  copy,
  onFileChange,
  onPreprocessingChange,
  onWarnings,
}: {
  copy: AppMessages['project'];
  onFileChange?: (fileName: string, profileId?: string) => void;
  onPreprocessingChange?: (isProcessing: boolean) => void;
  onWarnings?: (warnings: string[]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);
  const [brandProfileName, setBrandProfileName] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      handleRemove();
      return;
    }

    setStatus('analyzing');
    setErrorMsg('');
    onPreprocessingChange?.(true);
    onFileChange?.(file.name);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('manualPdf', file);
        const result = await createBrandProfileAction(formData);

        if (result.ok && result.profileId) {
          setBrandProfileId(result.profileId);
          setBrandProfileName(result.name || file.name);
          setStatus('ready');
          onFileChange?.(result.name || file.name, result.profileId);
          onWarnings?.(result.warnings);
        } else {
          setStatus('error');
          setErrorMsg(copy.brandManualError);
        }
      } catch (err) {
        console.warn('[BrandManualInput] extraction failed', err);
        setStatus('error');
        setErrorMsg(copy.brandManualError);
      } finally {
        onPreprocessingChange?.(false);
      }
    });
  };

  const handleRemove = () => {
    setBrandProfileId(null);
    setBrandProfileName('');
    setStatus('idle');
    setErrorMsg('');
    onFileChange?.('');
    onPreprocessingChange?.(false);
    onWarnings?.([]);
  };

  return (
    <div className="mt-5 space-y-3" data-testid="brand-manual-section">
      <label htmlFor="brand-manual-input" className="ac-form-field__label">
        {copy.brandManualLabel}
      </label>

      {/* Note: NO name attribute on the file input, so the raw PDF is NEVER submitted with createProjectAction */}
      <input
        id="brand-manual-input"
        type="file"
        accept=".pdf,application/pdf"
        data-testid="brand-manual-input"
        onChange={handleFileChange}
        disabled={isPending}
        className="block w-full rounded-[14px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--surface-highlight)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--text-primary)]"
      />

      {status === 'analyzing' && (
        <div
          className="flex items-center gap-2 text-xs text-[var(--accent-text)]"
          data-testid="brand-manual-analyzing"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{copy.brandManualAnalyzing}</span>
        </div>
      )}

      {status === 'ready' && brandProfileId && (
        <div
          className="flex items-center justify-between rounded-xl border border-[var(--success)]/40 bg-[var(--success)]/10 p-3 text-xs"
          data-testid="brand-manual-ready"
        >
          <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              {copy.brandManualReady}: {brandProfileName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            data-testid="brand-manual-remove"
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-2 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            <span>{copy.brandManualRemove}</span>
          </button>
          <input
            type="hidden"
            name="brandProfileId"
            value={brandProfileId}
            data-testid="brand-profile-id-input"
          />
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-xs text-[var(--danger)]"
          data-testid="brand-manual-error"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg || copy.brandManualError}</span>
        </div>
      )}

      <p className="text-xs leading-6 text-[var(--text-tertiary)]">{copy.brandManualHint}</p>
    </div>
  );
}
