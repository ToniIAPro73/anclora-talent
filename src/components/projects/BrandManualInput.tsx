import type { AppMessages } from '@/lib/i18n/messages';

/**
 * U5 — optional brand-manual PDF input. The file travels in the creation
 * form as `brandManual`; createProjectAction extracts a BrandProfile
 * best-effort (its failure never blocks project creation).
 */
export function BrandManualInput({
  copy,
  onFileChange,
}: {
  copy: AppMessages['project'];
  onFileChange?: (fileName: string) => void;
}) {
  return (
    <div className="mt-5 space-y-2" data-testid="brand-manual-section">
      <label htmlFor="brand-manual-input" className="ac-form-field__label">{copy.brandManualLabel}</label>
      <input
        id="brand-manual-input"
        type="file"
        name="brandManual"
        accept=".pdf,application/pdf"
        data-testid="brand-manual-input"
        onChange={(event) => onFileChange?.(event.target.files?.[0]?.name ?? '')}
        className="block w-full rounded-[14px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-3 text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-[10px] file:border-0 file:bg-[var(--surface-highlight)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--text-primary)]"
      />
      <p className="text-xs leading-6 text-[var(--text-tertiary)]">{copy.brandManualHint}</p>
    </div>
  );
}
