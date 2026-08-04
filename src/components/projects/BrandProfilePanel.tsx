'use client';

import { useRef, useState, useTransition } from 'react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import type { BrandProfile, BrandProfileStatus } from '@/lib/brand/brand-profile';
import {
  createBrandProfileAction,
  setBrandProfileStatusAction,
  setProjectBrandProfileAction,
} from '@/lib/brand/actions';

type Copy = AppMessages['project'];

interface BrandProfilePanelProps {
  project: ProjectRecord;
  profiles: BrandProfile[];
  copy: Copy;
}

const inputClass =
  'rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]';
const labelClass = 'text-sm font-medium text-[var(--text-primary)]';

const STATUS_COPY_KEYS: Record<BrandProfileStatus, keyof Copy> = {
  draft: 'brandStatusDraft',
  active: 'brandStatusActive',
  deprecated: 'brandStatusDeprecated',
};

/**
 * "Perfil de marca" panel (FASE 2): applies an optional brand theme pack to
 * the project (G1 — brand and structure stay decoupled) and creates new
 * profiles by extracting an identity-manual PDF (draft status; activation is
 * an explicit step, G4).
 */
export function BrandProfilePanel({ project, profiles, copy }: BrandProfilePanelProps) {
  const [saved, setSaved] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (brandProfileId: string) => {
    setSaved(false);
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('brandProfileId', brandProfileId);
    startTransition(async () => {
      await setProjectBrandProfileAction(formData);
      setSaved(true);
    });
  };

  const handleActivate = (profileId: string) => {
    setSaved(false);
    const formData = new FormData();
    formData.set('profileId', profileId);
    formData.set('status', 'active');
    formData.set('projectId', project.id);
    startTransition(async () => {
      await setBrandProfileStatusAction(formData);
      setSaved(true);
    });
  };

  const handleUpload = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setSaved(false);
    setWarnings([]);
    const formData = new FormData();
    formData.set('manualPdf', file);
    formData.set('projectId', project.id);
    startTransition(async () => {
      const result = await createBrandProfileAction(formData);
      setWarnings(result.warnings);
      setSaved(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const selectedProfile = profiles.find((profile) => profile.id === project.brandProfileId) ?? null;

  return (
    <section
      data-testid="brand-profile-panel"
      className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]"
    >
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          {copy.brandPanelEyebrow}
        </p>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{copy.brandPanelTitle}</h3>
        <p className="text-sm text-[var(--text-muted)]">{copy.brandPanelDescription}</p>
      </header>

      <div className="mt-6 space-y-4">
        <label className="block space-y-2">
          <span className={labelClass}>{copy.brandSelectLabel}</span>
          <select
            data-testid="brand-profile-select"
            className={`${inputClass} w-full`}
            defaultValue={project.brandProfileId ?? ''}
            disabled={isPending}
            onChange={(event) => handleSelect(event.target.value)}
          >
            <option value="">{copy.brandNoneOption}</option>
            {profiles
              .filter((profile) => profile.status !== 'deprecated')
              .map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {copy.brandVersionLabel} {profile.version} ·{' '}
                  {copy[STATUS_COPY_KEYS[profile.status]]}
                </option>
              ))}
          </select>
        </label>

        {selectedProfile ? (
          <div className="flex flex-wrap items-center gap-3" data-testid="brand-profile-summary">
            {selectedProfile.palette.map((color) => (
              <span key={color.role} className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <span
                  className="inline-block h-4 w-4 rounded-full border border-[var(--border-subtle)]"
                  style={{ backgroundColor: color.hex }}
                />
                {color.name ?? color.hex}
              </span>
            ))}
            <span className="text-xs text-[var(--text-muted)]">
              {[selectedProfile.typography.display?.family, selectedProfile.typography.body?.family]
                .filter(Boolean)
                .join(' + ')}
            </span>
          </div>
        ) : null}

        {profiles.some((profile) => profile.status === 'draft') ? (
          <ul className="space-y-2">
            {profiles
              .filter((profile) => profile.status === 'draft')
              .map((profile) => (
                <li key={profile.id} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[var(--text-muted)]">
                    {profile.name} · {copy.brandVersionLabel} {profile.version} ·{' '}
                    {copy.brandStatusDraft}
                  </span>
                  <button
                    type="button"
                    className={`${inputClass} text-xs font-semibold`}
                    disabled={isPending}
                    onClick={() => handleActivate(profile.id)}
                  >
                    {copy.brandActivateAction}
                  </button>
                </li>
              ))}
          </ul>
        ) : null}

        <form onSubmit={handleUpload} className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
          <label className="block space-y-2">
            <span className={labelClass}>{copy.brandUploadLabel}</span>
            <input
              ref={fileInputRef}
              data-testid="brand-manual-input"
              type="file"
              name="manualPdf"
              accept="application/pdf"
              className="block w-full text-sm text-[var(--text-muted)]"
              disabled={isPending}
            />
          </label>
          <div className="flex items-center justify-end gap-3">
            {saved ? (
              <span className="text-xs font-medium text-[var(--accent)]">{copy.brandSaved}</span>
            ) : null}
            <button type="submit" className={`${inputClass} text-xs font-semibold`} disabled={isPending}>
              {isPending ? copy.brandUploading : copy.brandUploadAction}
            </button>
          </div>
        </form>

        {warnings.length > 0 ? (
          <ul className="space-y-1 text-xs text-[var(--text-muted)]" data-testid="brand-warnings">
            {warnings.map((warning) => (
              <li key={warning}>⚠ {warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
