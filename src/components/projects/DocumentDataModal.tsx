'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { BrandProfile } from '@/lib/brand/brand-profile';
import type { ProjectRecord } from '@/lib/projects/types';
import {
  parseCompositionSettings,
  serializeCompositionSettings,
  type CompositionMargins,
  type CompositionSettings,
  type CompositionSource,
} from '@/lib/projects/composition';
import { MARGIN_PRESETS, type MarginPreset } from '@/lib/projects/page-calculator';
import {
  saveProjectCompositionAction,
  saveUserCompositionDefaultsAction,
  setBrandForAllProjectsAction,
} from '@/lib/projects/actions';
import { setProjectBrandProfileAction } from '@/lib/brand/actions';
import { extractStructureFromDocument } from '@/lib/structure-profile/extract-structure-profile';
import type { StructureConfidence } from '@/lib/structure-profile/model';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';

type Copy = AppMessages['project'];

type ModalMode = 'pre-create' | 'project';

interface DocumentDataModalProps {
  isOpen: boolean;
  mode: ModalMode;
  copy: Copy;
  onClose: () => void;
  /** Pre-create mode: settings extracted from the uploaded file. */
  initialSettings?: CompositionSettings;
  /** Pre-create mode: provenance of the extracted settings (source badge). */
  source?: CompositionSource;
  /** Pre-create mode: confirm handler receiving the edited settings. */
  onConfirm?: (settings: CompositionSettings) => void;
  /** Project mode: the project being edited. */
  project?: ProjectRecord;
  /** Project mode: brand profiles available to the user. */
  brandProfiles?: BrandProfile[];
}

type MarginPresetKey = MarginPreset | 'custom';

const MARGIN_PRESET_KEYS: MarginPreset[] = ['compact', 'normal', 'spacious', 'bookStyle', 'minimal'];

function presetLabel(key: MarginPresetKey, copy: Copy): string {
  switch (key) {
    case 'compact':
      return copy.documentDataMarginPresetCompact;
    case 'normal':
      return copy.documentDataMarginPresetNormal;
    case 'spacious':
      return copy.documentDataMarginPresetSpacious;
    case 'bookStyle':
      return copy.documentDataMarginPresetBookStyle;
    case 'minimal':
      return copy.documentDataMarginPresetMinimal;
    case 'custom':
      return copy.documentDataMarginPresetCustom;
  }
}

function detectPreset(margins: CompositionMargins): MarginPresetKey {
  for (const key of MARGIN_PRESET_KEYS) {
    const preset = MARGIN_PRESETS[key];
    if (
      preset.top === margins.top &&
      preset.bottom === margins.bottom &&
      preset.left === margins.left &&
      preset.right === margins.right
    ) {
      return key;
    }
  }
  return 'custom';
}

function confidenceLabel(confidence: StructureConfidence, copy: Copy): string {
  return confidence === 'verificado_en_fuente'
    ? copy.documentDataStructureVerified
    : copy.documentDataStructureInferred;
}

function ConfidenceBadge({ confidence, copy }: { confidence: StructureConfidence; copy: Copy }) {
  const toneClass =
    confidence === 'verificado_en_fuente'
      ? 'text-[var(--success)] border-[var(--success)]/40 bg-[var(--success)]/10'
      : 'text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${toneClass}`}
    >
      {confidenceLabel(confidence, copy)}
    </span>
  );
}

/**
 * U6: "Document data" modal. Two modes:
 *
 * - `pre-create` (inside DocumentImporter): edits the composition extracted
 *   from the uploaded file; confirm hands the settings back so the importer
 *   writes them as a hidden `composition` form field.
 * - `project` (workspace): edits composition (project or user-default scope),
 *   shows the read-only detected structure with confidence badges, and
 *   applies the brand profile (this product or all projects).
 */
export function DocumentDataModal(props: DocumentDataModalProps) {
  // Remount-on-open: while closed the form is unmounted and its state is
  // destroyed, so each open re-initializes lazily from props (no
  // set-state-in-effect).
  if (!props.isOpen) return null;
  return <DocumentDataModalForm {...props} />;
}

function DocumentDataModalForm({
  mode,
  copy,
  onClose,
  initialSettings,
  source,
  onConfirm,
  project,
  brandProfiles = [],
}: DocumentDataModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Lazy initial state (component remounts on every open).
  const base: CompositionSettings =
    mode === 'pre-create'
      ? (initialSettings ?? {})
      : (parseCompositionSettings(project?.document.metadata?.composition) ?? {});
  const baseMargins: CompositionMargins = base.margins ?? { ...MARGIN_PRESETS.normal };

  const [fontFamily, setFontFamily] = useState(() => base.fontFamily ?? '');
  const [fontSizePt, setFontSizePt] = useState(() =>
    base.fontSizePt !== undefined ? String(base.fontSizePt) : '',
  );
  const [lineHeight, setLineHeight] = useState(() =>
    base.lineHeight !== undefined ? String(base.lineHeight) : '',
  );
  const [margins, setMargins] = useState<CompositionMargins>(() => baseMargins);
  const [marginPreset, setMarginPreset] = useState<MarginPresetKey>(() => detectPreset(baseMargins));
  const [scope, setScope] = useState<'project' | 'global'>('project');
  const [overwriteCustom, setOverwriteCustom] = useState(false);
  const [brandProfileId, setBrandProfileId] = useState(() => project?.brandProfileId ?? '');
  const [brandScope, setBrandScope] = useState<'product' | 'all'>('product');

  // Project mode: detected structure, read-only, computed on demand.
  const structureSchema = useMemo(() => {
    if (mode !== 'project' || !project) return null;
    try {
      const { document } = projectToSemanticDocument(project);
      return extractStructureFromDocument(document);
    } catch {
      return null;
    }
  }, [mode, project]);

  const buildSettings = (): CompositionSettings => {
    const settings: CompositionSettings = {};
    if (fontFamily.trim()) settings.fontFamily = fontFamily.trim();
    const parsedSize = Number.parseFloat(fontSizePt);
    if (fontSizePt.trim() && Number.isFinite(parsedSize) && parsedSize > 0) {
      settings.fontSizePt = parsedSize;
    }
    const parsedLineHeight = Number.parseFloat(lineHeight);
    if (lineHeight.trim() && Number.isFinite(parsedLineHeight) && parsedLineHeight > 0) {
      settings.lineHeight = parsedLineHeight;
    }
    settings.margins = margins;
    return settings;
  };

  const handleMarginPresetChange = (key: MarginPresetKey) => {
    setMarginPreset(key);
    if (key !== 'custom') {
      setMargins({ ...MARGIN_PRESETS[key] });
    }
  };

  const handleMarginChange = (side: keyof CompositionMargins, value: string) => {
    const parsed = Number.parseInt(value, 10);
    setMargins((prev) => ({ ...prev, [side]: Number.isFinite(parsed) ? parsed : 0 }));
    setMarginPreset('custom');
  };

  const handlePreCreateConfirm = () => {
    onConfirm?.(buildSettings());
    onClose();
  };

  const handleProjectSave = () => {
    if (!project) return;
    setError('');
    startTransition(async () => {
      try {
        // Composition + explicit "no brand" marker share the metadata writer.
        if (scope === 'project' || brandScope === 'product') {
          const formData = new FormData();
          formData.set('projectId', project.id);
          if (scope === 'project') {
            formData.set('composition', serializeCompositionSettings(buildSettings()));
          }
          if (brandScope === 'product') {
            formData.set('brandChoice', brandProfileId === '' ? 'none' : 'clear');
          }
          await saveProjectCompositionAction(formData);
        }
        if (scope === 'global') {
          const formData = new FormData();
          formData.set('defaults', serializeCompositionSettings(buildSettings()));
          formData.set('overwriteCustom', String(overwriteCustom));
          await saveUserCompositionDefaultsAction(formData);
        }
        if (brandScope === 'product') {
          const formData = new FormData();
          formData.set('projectId', project.id);
          formData.set('brandProfileId', brandProfileId);
          await setProjectBrandProfileAction(formData);
        } else {
          const formData = new FormData();
          formData.set('brandProfileId', brandProfileId);
          await setBrandForAllProjectsAction(formData);
        }
        router.refresh();
        onClose();
      } catch {
        setError(copy.documentDataSaveError);
      }
    });
  };

  const inputClass =
    'rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]';
  const labelClass =
    'text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]';

  return (
    <div className="ac-modal" role="dialog" aria-modal="true" data-testid="document-data-modal">
      <div className="ac-modal__backdrop" onClick={onClose} />
      <div className="ac-modal__panel max-w-3xl rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {copy.documentDataModalTitle}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {mode === 'pre-create'
                ? copy.documentDataModalDescriptionPreCreate
                : copy.documentDataModalDescriptionProject}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {source ? (
              <span
                data-testid="document-data-source-badge"
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  source === 'docx-styles'
                    ? 'text-[var(--success)] border-[var(--success)]/40 bg-[var(--success)]/10'
                    : 'text-[var(--text-tertiary)] border-[var(--border-subtle)] bg-transparent'
                }`}
              >
                {source === 'docx-styles'
                  ? copy.documentDataSourceBadgeVerified
                  : copy.documentDataSourceBadgeNotExtracted}
              </span>
            ) : null}
            <button
              type="button"
              data-testid="document-data-close-button"
              onClick={onClose}
              aria-label={copy.documentDataCloseLabel}
            >
              <X className="h-5 w-5 text-[var(--text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="mt-6 max-h-[calc(100vh-16rem)] space-y-6 overflow-y-auto pr-1">
          {/* Composition */}
          <section className="space-y-4">
            <h4 className={labelClass}>{copy.documentDataCompositionHeading}</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{copy.documentDataFontFamilyLabel}</span>
                <input
                  type="text"
                  data-testid="document-data-font-family-input"
                  value={fontFamily}
                  onChange={(event) => setFontFamily(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{copy.documentDataFontSizeLabel}</span>
                <input
                  type="number"
                  data-testid="document-data-font-size-input"
                  value={fontSizePt}
                  min={6}
                  max={72}
                  step={0.5}
                  onChange={(event) => setFontSizePt(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{copy.documentDataLineHeightLabel}</span>
                <input
                  type="number"
                  data-testid="document-data-line-height-input"
                  value={lineHeight}
                  min={1}
                  max={3}
                  step={0.05}
                  onChange={(event) => setLineHeight(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{copy.documentDataMarginPresetLabel}</span>
                <select
                  data-testid="document-data-margin-preset-select"
                  value={marginPreset}
                  onChange={(event) => handleMarginPresetChange(event.target.value as MarginPresetKey)}
                  className={inputClass}
                >
                  {[...MARGIN_PRESET_KEYS, 'custom' as const].map((key) => (
                    <option key={key} value={key}>
                      {presetLabel(key, copy)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ['top', copy.documentDataMarginTopLabel],
                    ['bottom', copy.documentDataMarginBottomLabel],
                    ['left', copy.documentDataMarginLeftLabel],
                    ['right', copy.documentDataMarginRightLabel],
                  ] as const
                ).map(([side, label]) => (
                  <label key={side} className="flex flex-col gap-1.5">
                    <span className={labelClass}>{label}</span>
                    <input
                      type="number"
                      data-testid={`document-data-margin-${side}-input`}
                      value={margins[side]}
                      min={0}
                      onChange={(event) => handleMarginChange(side, event.target.value)}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

          {mode === 'project' && (
            <>
              {/* Composition scope */}
              <section className="space-y-3">
                <h4 className={labelClass}>{copy.documentDataScopeHeading}</h4>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <input
                      type="radio"
                      name="document-data-scope"
                      data-testid="document-data-scope-project"
                      checked={scope === 'project'}
                      onChange={() => setScope('project')}
                    />
                    {copy.documentDataScopeProjectLabel}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <input
                      type="radio"
                      name="document-data-scope"
                      data-testid="document-data-scope-global"
                      checked={scope === 'global'}
                      onChange={() => setScope('global')}
                    />
                    {copy.documentDataScopeGlobalLabel}
                  </label>
                </div>
                {scope === 'global' && (
                  <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      data-testid="document-data-overwrite-checkbox"
                      checked={overwriteCustom}
                      onChange={(event) => setOverwriteCustom(event.target.checked)}
                    />
                    {copy.documentDataOverwriteLabel}
                  </label>
                )}
              </section>

              {/* Detected structure (read-only) */}
              {structureSchema && (
                <section className="space-y-3" data-testid="document-data-structure-section">
                  <h4 className={labelClass}>{copy.documentDataStructureHeading}</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="ac-surface-panel ac-surface-panel--subtle gap-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className={labelClass}>{copy.documentDataStructureHierarchyLabel}</p>
                        <ConfidenceBadge confidence={structureSchema.hierarchy.confianza} copy={copy} />
                      </div>
                      <p className="text-sm text-[var(--text-primary)]">
                        {structureSchema.hierarchy.levels.join(' → ')} (
                        {structureSchema.hierarchy.levels
                          .map((level) => structureSchema.hierarchy.headingMap[level] ?? level)
                          .join(' / ')}
                        )
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {structureSchema.hierarchy.regla}
                      </p>
                    </div>
                    <div className="ac-surface-panel ac-surface-panel--subtle gap-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className={labelClass}>{copy.documentDataStructureMacroLabel}</p>
                        <ConfidenceBadge confidence={structureSchema.macroPattern.confianza} copy={copy} />
                      </div>
                      <p className="text-sm text-[var(--text-primary)]">
                        {structureSchema.macroPattern.nombre ??
                          `${structureSchema.macroPattern.numPartes} · ${structureSchema.macroPattern.capitulosPorParte.join('-')}`}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {structureSchema.macroPattern.regla}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Brand */}
              <section className="space-y-3">
                <h4 className={labelClass}>{copy.documentDataBrandHeading}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{copy.documentDataBrandProfileLabel}</span>
                    <select
                      data-testid="document-data-brand-select"
                      value={brandProfileId}
                      onChange={(event) => setBrandProfileId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">{copy.documentDataBrandNoneOption}</option>
                      {brandProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-col gap-2">
                    <span className={labelClass}>{copy.documentDataBrandScopeHeading}</span>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                        <input
                          type="radio"
                          name="document-data-brand-scope"
                          data-testid="document-data-brand-scope-product"
                          checked={brandScope === 'product'}
                          onChange={() => setBrandScope('product')}
                        />
                        {copy.documentDataBrandScopeProductLabel}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                        <input
                          type="radio"
                          name="document-data-brand-scope"
                          data-testid="document-data-brand-scope-all"
                          checked={brandScope === 'all'}
                          onChange={() => setBrandScope('all')}
                        />
                        {copy.documentDataBrandScopeAllLabel}
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          <p className="text-xs leading-6 text-[var(--text-tertiary)]">
            {copy.documentDataHierarchyHint}
          </p>

          {error && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            data-testid="document-data-cancel-button"
            onClick={onClose}
            className="ac-button ac-button--secondary"
          >
            {copy.documentDataCancelLabel}
          </button>
          {mode === 'pre-create' ? (
            <button
              type="button"
              data-testid="document-data-save-button"
              onClick={handlePreCreateConfirm}
              className="ac-button ac-button--primary"
            >
              {copy.documentDataConfirmLabel}
            </button>
          ) : (
            <button
              type="button"
              data-testid="document-data-save-button"
              onClick={handleProjectSave}
              disabled={isPending}
              className="ac-button ac-button--primary"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.documentDataSavingLabel}
                </span>
              ) : (
                copy.documentDataSaveLabel
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
