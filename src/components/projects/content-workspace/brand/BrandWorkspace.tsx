'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Info, Palette, XCircle } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import {
  BRAND_COLOR_ROLES,
  type BrandColorRole,
  type BrandConfidence,
  type BrandProfile,
} from '@/lib/brand/brand-profile';
import { brandProfileToTemplateOverrides } from '@/lib/brand/brand-template-overrides';
import {
  setBrandProfileStatusAction,
  setProjectBrandProfileAction,
} from '@/lib/brand/actions';
import { BrandManualInput } from '../../BrandManualInput';

type Copy = AppMessages['project'];

const STATUS_COPY_KEYS: Record<BrandProfile['status'], 'brandStatusDraft' | 'brandStatusActive' | 'brandStatusDeprecated'> = {
  draft: 'brandStatusDraft',
  active: 'brandStatusActive',
  deprecated: 'brandStatusDeprecated',
};

const CONFIDENCE_COPY_KEYS: Record<BrandConfidence, 'brandConfidenceHigh' | 'brandConfidenceMedium' | 'brandConfidenceLow'> = {
  high: 'brandConfidenceHigh',
  medium: 'brandConfidenceMedium',
  low: 'brandConfidenceLow',
};

function paletteRoleLabel(role: BrandColorRole, copy: Copy): string {
  switch (role) {
    case 'ink':
      return copy.brandWorkspacePaletteRoleInk;
    case 'paper':
      return copy.brandWorkspacePaletteRolePaper;
    case 'accent':
      return copy.brandWorkspacePaletteRoleAccent;
    case 'accentMuted':
      return copy.brandWorkspacePaletteRoleAccentMuted;
  }
}

function formatDate(iso: string, locale: 'es' | 'en'): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function BrandWorkspace({
  project,
  profiles,
  copy,
  locale,
}: {
  project: ProjectRecord;
  profiles: BrandProfile[];
  copy: Copy;
  locale: 'es' | 'en';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const selectedProfile = profiles.find((profile) => profile.id === project.brandProfileId) ?? null;
  const applicableProfiles = profiles.filter((profile) => profile.status !== 'deprecated');

  const tokens = useMemo(
    () => (selectedProfile ? brandProfileToTemplateOverrides(selectedProfile) : null),
    [selectedProfile],
  );

  const handleApply = (brandProfileId: string) => {
    setSaved(false);
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('brandProfileId', brandProfileId);
    startTransition(async () => {
      await setProjectBrandProfileAction(formData);
      router.refresh();
      setSaved(true);
    });
  };

  const handleActivate = (profileId: string) => {
    const formData = new FormData();
    formData.set('profileId', profileId);
    formData.set('status', 'active');
    formData.set('projectId', project.id);
    startTransition(async () => {
      await setBrandProfileStatusAction(formData);
      router.refresh();
    });
  };

  const handleDisconnect = () => handleApply('');

  const surfaceRows = [
    {
      key: 'document',
      label: copy.brandWorkspaceSurfaceDocument,
      connected: true,
      desc: copy.brandWorkspaceDocumentAppliedDesc,
    },
    {
      key: 'export',
      label: copy.brandWorkspaceSurfaceExport,
      connected: true,
      desc: copy.brandWorkspaceExportAppliedDesc,
    },
    {
      key: 'cover',
      label: copy.brandWorkspaceSurfaceCover,
      connected: false,
      desc: copy.brandWorkspaceCoverNotConnectedDesc,
    },
    {
      key: 'backcover',
      label: copy.brandWorkspaceSurfaceBackCover,
      connected: false,
      desc: copy.brandWorkspaceBackCoverNotConnectedDesc,
    },
  ] as const;

  const linkedSurfaceCount = surfaceRows.filter((row) => row.connected).length;

  return (
    <div className="talent-brand-workspace" data-testid="brand-workspace">
      {/* MAIN VISUAL & EDITORIAL COLUMN */}
      <div className="talent-brand-workspace__main talent-brand-workspace__visual">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="brand-visual-system-panel">
          <p className="ac-surface-panel__eyebrow">{copy.brandWorkspaceVisualSystemHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.brandWorkspaceVisualSystemSubtitle}</p>

          {selectedProfile ? (
            <>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {copy.brandWorkspacePaletteHeading}
                </p>
                {selectedProfile.palette.length > 0 ? (
                  <div className="talent-brand-workspace__palette">
                    {BRAND_COLOR_ROLES.map((role) => {
                      const color = selectedProfile.palette.find((entry) => entry.role === role);
                      if (!color) return null;
                      return (
                        <div key={role} className="talent-brand-workspace__swatch" data-testid={`brand-palette-${role}`}>
                          <span className="talent-brand-workspace__swatch-color" style={{ backgroundColor: color.hex }} />
                          <p className="talent-brand-workspace__swatch-hex">{color.hex}</p>
                          <p className="talent-brand-workspace__swatch-role">{color.name ?? paletteRoleLabel(role, copy)}</p>
                          <p className="talent-brand-workspace__swatch-meta">
                            {color.usagePercent !== null && copy.brandWorkspaceUsageLabel.replace('{percent}', String(color.usagePercent))}
                            {color.usagePercent !== null && ' · '}
                            {copy[CONFIDENCE_COPY_KEYS[color.confidence]]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.brandWorkspacePaletteEmpty}</p>
                )}
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {copy.brandWorkspaceTypographyHeading}
                </p>
                <div className="talent-brand-workspace__typefaces">
                  {(
                    [
                      ['display', selectedProfile.typography.display, copy.brandWorkspaceTypographyDisplayCaption],
                      ['body', selectedProfile.typography.body, copy.brandWorkspaceTypographyBodyCaption],
                    ] as const
                  ).map(([key, typeface, caption]) => (
                    <div key={key} className="talent-brand-workspace__typeface-card" data-testid={`brand-typeface-${key}`}>
                      {typeface ? (
                        <>
                          <span className="talent-brand-workspace__typeface-specimen" style={{ fontFamily: typeface.family }}>
                            Aa
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--text-primary)] truncate" title={typeface.family}>
                              {typeface.family}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{caption}</p>
                            <span className="talent-brand-workspace__confidence-pill mt-1.5">
                              {copy[CONFIDENCE_COPY_KEYS[typeface.confidence]]}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-[var(--text-secondary)]">{copy.brandWorkspaceTypefaceEmpty}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {tokens && (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    {copy.brandWorkspaceTokensHeading}
                  </p>
                  <ul className="talent-brand-workspace__tokens" data-testid="brand-tokens">
                    {(
                      [
                        [tokens.accentColor, copy.brandWorkspaceTokenAccent],
                        [tokens.paperColor, copy.brandWorkspaceTokenSurface],
                        [tokens.bodyColor, copy.brandWorkspaceTokenText],
                        [tokens.accentMutedColor, copy.brandWorkspaceTokenAccentMuted],
                      ] as const
                    )
                      .filter(([hex]) => Boolean(hex))
                      .map(([hex, label]) => (
                        <li key={label}>
                          <span className="talent-brand-workspace__token-dot" style={{ backgroundColor: hex }} />
                          <span className="talent-brand-workspace__token-label">{label}</span>
                          <span className="talent-brand-workspace__token-hex">{hex}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">{copy.brandWorkspaceNoProfileBody}</p>
          )}
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="brand-application-panel">
          <p className="ac-surface-panel__eyebrow">{copy.brandWorkspaceApplicationHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.brandWorkspaceApplicationSubtitle}</p>

          <ul className="talent-brand-workspace__surfaces">
            {surfaceRows.map((row) => {
              const applied = selectedProfile && row.connected;
              return (
                <li key={row.key} data-testid={`brand-surface-${row.key}`}>
                  <div className="talent-brand-workspace__surface-header">
                    <div className="talent-brand-workspace__surface-title">
                      {applied ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                      ) : row.connected ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                      )}
                      <span className="truncate">{row.label}</span>
                    </div>
                    <span
                      className={`talent-brand-workspace__surface-badge talent-brand-workspace__surface-badge--${
                        applied ? 'applied' : row.connected ? 'warning' : 'unconnected'
                      }`}
                    >
                      {applied
                        ? copy.brandWorkspaceStatusApplied
                        : row.connected
                          ? copy.brandWorkspaceStatusNone
                          : copy.brandWorkspaceStatusNotConnected}
                    </span>
                  </div>
                  <p className="talent-brand-workspace__surface-desc">
                    {applied
                      ? row.desc
                      : row.connected
                        ? copy.brandWorkspaceStatusNone
                        : row.desc}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* SIDEBAR / CONTROL PANEL COLUMN */}
      <div className="talent-brand-workspace__sidebar">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="brand-identity-panel">
          <p className="ac-surface-panel__eyebrow">{copy.brandWorkspaceIdentityHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.brandWorkspaceIdentitySubtitle}</p>

          {selectedProfile ? (
            <>
              <div className="talent-brand-workspace__profile-card" data-testid="brand-active-profile-card">
                <div className="talent-brand-workspace__profile-icon">
                  <Palette className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text-primary)] truncate" title={selectedProfile.name}>
                    {selectedProfile.name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {copy.brandVersionLabel} {selectedProfile.version}
                  </p>
                  <span className={`talent-brand-workspace__status-pill talent-brand-workspace__status-pill--${selectedProfile.status}`}>
                    {copy[STATUS_COPY_KEYS[selectedProfile.status]]}
                  </span>
                </div>
              </div>

              <dl className="talent-brand-workspace__meta">
                {selectedProfile.sourceFileName && (
                  <div>
                    <dt>{copy.brandWorkspaceSourceLabel}</dt>
                    <dd title={selectedProfile.sourceFileName}>{selectedProfile.sourceFileName}</dd>
                  </div>
                )}
                <div>
                  <dt>{copy.brandWorkspaceUploadDateLabel}</dt>
                  <dd>{formatDate(selectedProfile.createdAt, locale)}</dd>
                </div>
              </dl>

              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {copy.brandWorkspaceChangeProfileAction}
                </span>
                <select
                  data-testid="brand-profile-select"
                  className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  value={project.brandProfileId ?? ''}
                  disabled={isPending}
                  onChange={(event) => handleApply(event.target.value)}
                >
                  <option value="">{copy.brandNoneOption}</option>
                  {applicableProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} · {copy.brandVersionLabel} {profile.version} · {copy[STATUS_COPY_KEYS[profile.status]]}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                data-testid="brand-disconnect-button"
                onClick={handleDisconnect}
                disabled={isPending}
                className="ac-button ac-button--compact mt-2 w-full justify-center"
              >
                {copy.brandWorkspaceDisconnectAction}
              </button>

              <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {copy.brandWorkspaceAboutHeading}
                </p>
                {selectedProfile.governanceRules.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]" data-testid="brand-governance-rules">
                    {selectedProfile.governanceRules.map((rule, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-[var(--accent-text)]">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.brandWorkspaceAboutEmpty}</p>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4" data-testid="brand-no-profile">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.brandWorkspaceNoProfileTitle}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.brandWorkspaceNoProfileBody}</p>
              {applicableProfiles.length > 0 && (
                <label className="mt-4 flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    {copy.brandSelectLabel}
                  </span>
                  <select
                    data-testid="brand-profile-select"
                    className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                    value=""
                    disabled={isPending}
                    onChange={(event) => handleApply(event.target.value)}
                  >
                    <option value="">{copy.brandNoneOption}</option>
                    {applicableProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name} · {copy.brandVersionLabel} {profile.version} · {copy[STATUS_COPY_KEYS[profile.status]]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {saved && (
            <span className="mt-3 block text-xs font-medium text-[var(--accent)]" role="status">
              {copy.brandSaved}
            </span>
          )}
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="brand-status-panel">
          <p className="ac-surface-panel__eyebrow">{copy.brandWorkspaceStatusHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.brandWorkspaceStatusSubtitle}</p>

          {selectedProfile ? (
            <ul className="talent-brand-workspace__checklist">
              {selectedProfile.sourceFileName && (
                <li>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                  <div>
                    <p>{copy.brandWorkspaceCheckManualTitle}</p>
                    <span>{copy.brandWorkspaceCheckManualBody.replace('{fileName}', selectedProfile.sourceFileName)}</span>
                  </div>
                </li>
              )}
              <li>
                {selectedProfile.status === 'active' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                )}
                <div>
                  <p>{copy.brandWorkspaceCheckActiveTitle}</p>
                  <span>{selectedProfile.status === 'active' ? copy.brandWorkspaceCheckActiveBodyOk : copy.brandWorkspaceCheckActiveBodyWarn}</span>
                </div>
              </li>
              <li>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                <div>
                  <p>{copy.brandWorkspaceCheckSurfacesTitle.replace('{count}', String(linkedSurfaceCount))}</p>
                  <span>{copy.brandWorkspaceCheckSurfacesBody}</span>
                </div>
              </li>
              <li>
                <Info className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
                <div>
                  <p>{copy.brandWorkspaceCheckDecoupledTitle}</p>
                  <span>{copy.brandWorkspaceCheckDecoupledBody}</span>
                </div>
              </li>
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">{copy.brandWorkspaceNoProfileBody}</p>
          )}
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="brand-tools-panel">
          <p className="ac-surface-panel__eyebrow">{copy.brandWorkspaceToolsHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.brandWorkspaceToolsSubtitle}</p>

          <BrandManualInput
            copy={copy}
            onFileChange={(_name, profileId) => {
              if (profileId) router.refresh();
            }}
            onWarnings={setWarnings}
          />
          {warnings.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-[var(--text-tertiary)]" data-testid="brand-warnings">
              {warnings.map((warning) => (
                <li key={warning}>⚠ {warning}</li>
              ))}
            </ul>
          )}

          <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {copy.brandWorkspaceManageHeading}
            </p>
            {profiles.length > 0 ? (
              <ul className="talent-brand-workspace__manage-list" data-testid="brand-manage-list">
                {profiles.map((profile) => (
                  <li key={profile.id} data-testid={`brand-manage-item-${profile.id}`}>
                    <div className="talent-brand-workspace__manage-item-info">
                      <p className="font-semibold text-sm text-[var(--text-primary)] truncate" title={profile.name}>
                        {profile.name}
                      </p>
                      <span className={`talent-brand-workspace__status-pill talent-brand-workspace__status-pill--${profile.status}`}>
                        {copy[STATUS_COPY_KEYS[profile.status]]}
                      </span>
                    </div>
                    <div className="talent-brand-workspace__manage-item-actions">
                      {profile.status === 'draft' && (
                        <button
                          type="button"
                          data-testid={`brand-activate-button-${profile.id}`}
                          onClick={() => handleActivate(profile.id)}
                          disabled={isPending}
                          className="ac-button ac-button--compact"
                        >
                          {copy.brandActivateAction}
                        </button>
                      )}
                      {profile.status !== 'deprecated' && profile.id !== project.brandProfileId && (
                        <button
                          type="button"
                          data-testid={`brand-apply-button-${profile.id}`}
                          onClick={() => handleApply(profile.id)}
                          disabled={isPending}
                          className="ac-button ac-button--compact"
                        >
                          {copy.brandWorkspaceApplyAction}
                        </button>
                      )}
                      {profile.id === project.brandProfileId && (
                        <span className="talent-brand-workspace__applied-badge">{copy.brandWorkspaceAppliedBadge}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.brandWorkspaceManageEmpty}</p>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[var(--text-tertiary)]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {copy.brandWorkspaceInfoNote}
          </p>
        </section>
      </div>
    </div>
  );
}
