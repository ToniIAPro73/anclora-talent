'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileJson,
  FileText,
  Hash,
  Image as ImageIcon,
  List,
  RotateCcw,
  Rows3,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import type { DocumentStyleMap } from '@/lib/style-engine/model';
import type { ComposeViolation } from '@/lib/compose/compose';
import { DocumentRules, resolveDocumentRules } from '@/lib/compose/rules';
import { saveProjectCompositionAction, saveProjectRulesAction } from '@/lib/projects/actions';
import {
  parseCompositionSettings,
  serializeCompositionSettings,
  type CompositionMargins,
  type CompositionSettings,
} from '@/lib/projects/composition';
import { MARGIN_PRESETS, type MarginPreset } from '@/lib/projects/page-calculator';
import { PREFLIGHT_CHANNELS, type PreflightCheck } from '@/lib/preflight/preflight';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { extractStructureFromDocument } from '@/lib/structure-profile/extract-structure-profile';
import type { StructureConfidence } from '@/lib/structure-profile/model';
import { FontSelector } from '../../cover-studio/FontSelector';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import type { RecompositionTelemetry } from '../../useDocumentComposition';

type Copy = AppMessages['project'];
type Section = 'paginacion' | 'tipografia' | 'estructura' | 'numeracion' | 'exportacion';
type MarginPresetKey = MarginPreset | 'custom';

const MARGIN_PRESET_KEYS: MarginPreset[] = ['compact', 'normal', 'spacious', 'bookStyle', 'minimal'];

const PRESETS: Record<'print' | 'default' | 'digital', Partial<DocumentRules>> = {
  print: { chapterStartsOnOddPage: true, pageBreakBeforeChapter: true },
  default: {},
  digital: { chapterStartsOnOddPage: false, pageBreakBeforeChapter: true },
};

function detectPresetKey(rules: DocumentRules): keyof typeof PRESETS {
  if (rules.chapterStartsOnOddPage && rules.pageBreakBeforeChapter) return 'print';
  if (!rules.chapterStartsOnOddPage && rules.pageBreakBeforeChapter) return 'digital';
  return 'default';
}

function detectMarginPreset(margins: CompositionMargins): MarginPresetKey {
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

function confidenceLabel(confidence: StructureConfidence, copy: Copy): string {
  return confidence === 'verificado_en_fuente'
    ? copy.documentDataStructureVerified
    : copy.documentDataStructureInferred;
}

export function CompositionWorkspace({
  project,
  copy,
  documentViolations,
  preflightChecks,
  telemetry,
  styleMap,
  onNavigateStep,
}: {
  project: ProjectRecord;
  copy: Copy;
  documentViolations: ComposeViolation[];
  preflightChecks: PreflightCheck[];
  telemetry?: RecompositionTelemetry;
  styleMap?: DocumentStyleMap | null;
  onNavigateStep: (step: number) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('paginacion');
  const [tipDismissed, setTipDismissed] = useState(false);

  const [rules, setRules] = useState<DocumentRules>(() => resolveDocumentRules(project.document.rules));

  const baseComposition: CompositionSettings =
    parseCompositionSettings(project.document.metadata?.composition) ?? {};
  const baseMargins: CompositionMargins = baseComposition.margins ?? { ...MARGIN_PRESETS.normal };

  const resolvedFontFamily =
    baseComposition.fontFamily || styleMap?.body.fontFamily || '';
  const resolvedFontSizePt =
    baseComposition.fontSizePt !== undefined
      ? String(baseComposition.fontSizePt)
      : styleMap?.body.fontSizePt !== undefined
        ? String(styleMap.body.fontSizePt)
        : '';
  const resolvedLineHeight =
    baseComposition.lineHeight !== undefined
      ? String(baseComposition.lineHeight)
      : styleMap?.body.lineHeight !== undefined
        ? String(Math.round(styleMap.body.lineHeight * 100) / 100)
        : '';

  const [fontFamily, setFontFamily] = useState(() => resolvedFontFamily);
  const [fontSizePt, setFontSizePt] = useState(() => resolvedFontSizePt);
  const [lineHeight, setLineHeight] = useState(() => resolvedLineHeight);
  const [margins, setMargins] = useState<CompositionMargins>(() => baseMargins);
  const [marginPreset, setMarginPreset] = useState<MarginPresetKey>(() => detectMarginPreset(baseMargins));

  const { loadFont } = useGoogleFonts();

  const structureSchema = useMemo(() => {
    try {
      const { document } = projectToSemanticDocument(project);
      return extractStructureFromDocument(document);
    } catch {
      return null;
    }
  }, [project]);

  const markDirty = () => setSaved(false);

  const patch = (partial: Partial<DocumentRules>) => {
    markDirty();
    setRules((current) => resolveDocumentRules({ ...current, ...partial }));
  };
  const patchKeepTogether = (partial: Partial<DocumentRules['keepTogether']>) =>
    patch({ keepTogether: { ...rules.keepTogether, ...partial } });
  const patchNumbering = (partial: Partial<DocumentRules['numbering']>) =>
    patch({ numbering: { ...rules.numbering, ...partial } });

  const applyPreset = (preset: keyof typeof PRESETS) => {
    markDirty();
    setRules(resolveDocumentRules(PRESETS[preset]));
  };

  const handleMarginPresetChange = (key: MarginPresetKey) => {
    markDirty();
    setMarginPreset(key);
    if (key !== 'custom') {
      setMargins({ ...MARGIN_PRESETS[key] });
    }
  };

  const handleMarginChange = (side: keyof CompositionMargins, value: string) => {
    const parsed = Number.parseInt(value, 10);
    markDirty();
    setMargins((prev) => ({ ...prev, [side]: Number.isFinite(parsed) ? parsed : 0 }));
    setMarginPreset('custom');
  };

  const handleReset = () => {
    markDirty();
    setRules(resolveDocumentRules(PRESETS.default));
    setFontFamily('');
    setFontSizePt('');
    setLineHeight('');
    setMargins({ ...MARGIN_PRESETS.normal });
    setMarginPreset('normal');
  };

  const handleSave = () => {
    startTransition(async () => {
      const rulesFormData = new FormData();
      rulesFormData.set('projectId', project.id);
      rulesFormData.set('rules', JSON.stringify(rules));
      await saveProjectRulesAction(rulesFormData);

      const settings: CompositionSettings = { margins };
      if (fontFamily.trim()) settings.fontFamily = fontFamily.trim();
      const parsedSize = Number.parseFloat(fontSizePt);
      if (fontSizePt.trim() && Number.isFinite(parsedSize) && parsedSize > 0) settings.fontSizePt = parsedSize;
      const parsedLineHeight = Number.parseFloat(lineHeight);
      if (lineHeight.trim() && Number.isFinite(parsedLineHeight) && parsedLineHeight > 0) {
        settings.lineHeight = parsedLineHeight;
      }
      const compositionFormData = new FormData();
      compositionFormData.set('projectId', project.id);
      compositionFormData.set('composition', serializeCompositionSettings(settings));
      await saveProjectCompositionAction(compositionFormData);

      router.refresh();
      setSaved(true);
    });
  };

  const activePresetKey = detectPresetKey(rules);
  const violationCount = documentViolations.length;

  const channelLabels: Record<(typeof PREFLIGHT_CHANNELS)[number], string> = {
    kdp: copy.preflightChannelKdp,
    ingramspark: copy.preflightChannelIngramspark,
    kobo: copy.preflightChannelKobo,
  };

  const inputClass =
    'min-w-0 max-w-full rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]';
  const labelClass = 'text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]';

  const sections: { key: Section; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'paginacion', label: copy.compositionSectionPaginationLabel, desc: copy.compositionSectionPaginationDesc, icon: <FileText className="h-4 w-4" /> },
    { key: 'tipografia', label: copy.compositionSectionTypographyLabel, desc: copy.compositionSectionTypographyDesc, icon: <TypeIcon className="h-4 w-4" /> },
    { key: 'estructura', label: copy.compositionSectionStructureLabel, desc: copy.compositionSectionStructureDesc, icon: <List className="h-4 w-4" /> },
    { key: 'numeracion', label: copy.compositionSectionNumberingLabel, desc: copy.compositionSectionNumberingDesc, icon: <Hash className="h-4 w-4" /> },
    { key: 'exportacion', label: copy.compositionSectionExportLabel, desc: copy.compositionSectionExportDesc, icon: <FileJson className="h-4 w-4" /> },
  ];

  const sectionHeading: Record<Section, string> = {
    paginacion: copy.compositionSectionPaginationLabel,
    tipografia: copy.compositionSectionTypographyLabel,
    estructura: copy.compositionSectionStructureLabel,
    numeracion: copy.compositionSectionNumberingLabel,
    exportacion: copy.compositionSectionExportLabel,
  };

  return (
    <div className="talent-composition-workspace" data-testid="composition-workspace">
      {/* NAV COLUMN */}
      <div className="talent-composition-workspace__nav">
        <section className="ac-surface-panel ac-surface-panel--subtle">
          <p className="ac-surface-panel__eyebrow">{copy.compositionPresetsHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.compositionPresetsSubtitle}</p>
          <div className="talent-composition-workspace__presets">
            {(
              [
                ['print', copy.rulesPresetPrint, copy.rulesPresetPrintDesc],
                ['default', copy.rulesPresetDefault, copy.rulesPresetDefaultDesc],
                ['digital', copy.rulesPresetDigital, copy.rulesPresetDigitalDesc],
              ] as const
            ).map(([key, name, description]) => (
              <button
                type="button"
                key={key}
                data-testid={`composition-preset-${key}`}
                onClick={() => applyPreset(key)}
                data-active={activePresetKey === key}
                className="talent-composition-workspace__preset-card"
              >
                <span className="talent-composition-workspace__preset-name">
                  {name}
                  {activePresetKey === key && (
                    <span className="talent-composition-workspace__preset-badge">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </span>
                <span className="talent-composition-workspace__preset-desc">{description}</span>
              </button>
            ))}
          </div>
        </section>

        <nav className="talent-composition-workspace__section-nav" aria-label={copy.rulesPanelTitle}>
          {sections.map((section) => (
            <button
              type="button"
              key={section.key}
              data-testid={`composition-section-${section.key}`}
              onClick={() => setActiveSection(section.key)}
              data-active={activeSection === section.key}
              className="talent-composition-workspace__section-item"
            >
              {section.icon}
              <span>
                <span className="talent-composition-workspace__section-label">{section.label}</span>
                <span className="talent-composition-workspace__section-desc">{section.desc}</span>
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* MAIN COLUMN */}
      <div className="talent-composition-workspace__main">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="composition-main-panel">
          <div className="ac-surface-panel__meta">
            <div>
              <h3 className="ac-surface-panel__title">{sectionHeading[activeSection]}</h3>
            </div>
            <button
              type="button"
              data-testid="composition-reset-button"
              onClick={handleReset}
              className="ac-button ac-button--compact"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {copy.compositionResetAction}
            </button>
          </div>

          {activeSection === 'paginacion' && (
            <div className="mt-4 space-y-5">
              <div>
                <p className={labelClass}>{copy.compositionMarginsHeading}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-5">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelClass}>{copy.documentDataMarginPresetLabel}</span>
                    <select
                      data-testid="composition-margin-preset-select"
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
                        data-testid={`composition-margin-${side}-input`}
                        value={margins[side]}
                        min={0}
                        onChange={(event) => handleMarginChange(side, event.target.value)}
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-4">
                  <span className={labelClass}>{copy.rulesPageBreakBeforeChapter}</span>
                  <input
                    type="checkbox"
                    data-testid="composition-page-break-before-chapter-toggle"
                    checked={rules.pageBreakBeforeChapter}
                    onChange={(event) => patch({ pageBreakBeforeChapter: event.target.checked })}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className={labelClass}>{copy.rulesChapterOddPage}</span>
                  <input
                    type="checkbox"
                    data-testid="composition-chapter-odd-page-toggle"
                    checked={rules.chapterStartsOnOddPage}
                    onChange={(event) => patch({ chapterStartsOnOddPage: event.target.checked })}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className={labelClass}>{copy.rulesMinLinesAfter}</span>
                  <input
                    type="number"
                    data-testid="composition-min-lines-after-input"
                    min={1}
                    max={10}
                    value={rules.keepWithNext.minLinesAfter}
                    onChange={(event) =>
                      patch({ keepWithNext: { ...rules.keepWithNext, minLinesAfter: Math.max(1, Number(event.target.value) || 1) } })
                    }
                    className={`${inputClass} w-20`}
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span className={labelClass}>{copy.rulesWidowsOrphans}</span>
                  <input
                    type="number"
                    data-testid="composition-widows-orphans-input"
                    min={2}
                    max={10}
                    value={rules.widowsOrphans.minLines}
                    onChange={(event) => patch({ widowsOrphans: { minLines: Math.max(2, Number(event.target.value) || 2) } })}
                    className={`${inputClass} w-20`}
                  />
                </label>
              </div>

              <div>
                <p className={labelClass}>{copy.rulesPanelTitle}</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-4">
                    <span className={labelClass}>{copy.rulesKeepTable}</span>
                    <input
                      type="checkbox"
                      data-testid="composition-keep-table-toggle"
                      checked={rules.keepTogether.table}
                      onChange={(event) => patchKeepTogether({ table: event.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span className={labelClass}>{copy.rulesKeepQuote}</span>
                    <input
                      type="checkbox"
                      data-testid="composition-keep-quote-toggle"
                      checked={rules.keepTogether.quote}
                      onChange={(event) => patchKeepTogether({ quote: event.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span className={labelClass}>{copy.rulesKeepList}</span>
                    <input
                      type="number"
                      data-testid="composition-keep-list-input"
                      min={1}
                      max={20}
                      value={rules.keepTogether.list.maxItems}
                      onChange={(event) =>
                        patchKeepTogether({ list: { maxItems: Math.max(1, Number(event.target.value) || 1) } })
                      }
                      className={`${inputClass} w-20`}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span className={labelClass}>{copy.rulesKeepCallout}</span>
                    <input
                      type="checkbox"
                      data-testid="composition-keep-callout-toggle"
                      checked={rules.keepTogether.callout}
                      onChange={(event) => patchKeepTogether({ callout: event.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span className={labelClass}>{copy.rulesKeepCode}</span>
                    <input
                      type="checkbox"
                      data-testid="composition-keep-code-toggle"
                      checked={rules.keepTogether.code}
                      onChange={(event) => patchKeepTogether({ code: event.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span className={labelClass}>{copy.rulesKeepImageCaption}</span>
                    <input
                      type="checkbox"
                      data-testid="composition-keep-image-caption-toggle"
                      checked={rules.keepTogether.imageWithCaption}
                      onChange={(event) => patchKeepTogether({ imageWithCaption: event.target.checked })}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'tipografia' && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.documentDataFontFamilyLabel}</span>
                  <FontSelector
                    selectedFont={fontFamily}
                    onFontSelect={(value) => {
                      markDirty();
                      setFontFamily(value);
                      loadFont(value);
                    }}
                  />
                  <select
                    data-testid="composition-font-family-input"
                    aria-label={copy.documentDataFontFamilyLabel}
                    tabIndex={-1}
                    value={fontFamily}
                    onChange={(event) => {
                      markDirty();
                      setFontFamily(event.target.value);
                    }}
                    className="sr-only"
                  >
                    <option value={fontFamily}>{fontFamily}</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.documentDataFontSizeLabel}</span>
                  <input
                    type="number"
                    data-testid="composition-font-size-input"
                    value={fontSizePt}
                    min={6}
                    max={72}
                    step={0.5}
                    onChange={(event) => {
                      markDirty();
                      setFontSizePt(event.target.value);
                    }}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{copy.documentDataLineHeightLabel}</span>
                  <input
                    type="number"
                    data-testid="composition-line-height-input"
                    value={lineHeight}
                    min={1}
                    max={3}
                    step={0.05}
                    onChange={(event) => {
                      markDirty();
                      setLineHeight(event.target.value);
                    }}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="talent-composition-workspace__applied-typography" data-testid="composition-applied-typography">
                <div>
                  <p className={labelClass}>{copy.compositionAppliedTypographyHeading}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.compositionAppliedTypographySubtitle}</p>
                </div>
                <div className="talent-composition-workspace__applied-typography-preview">
                  <span style={{ fontFamily: fontFamily || resolvedFontFamily || undefined }}>Aa</span>
                  <span>{fontFamily || resolvedFontFamily || copy.documentDataFontFamilyLabel}</span>
                  <span>{fontSizePt || resolvedFontSizePt ? `${fontSizePt || resolvedFontSizePt} pt` : '—'}</span>
                  <span>{lineHeight || resolvedLineHeight || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'estructura' && (
            <div className="mt-4">
              {structureSchema ? (
                <div className="grid gap-3 sm:grid-cols-2" data-testid="composition-structure-section">
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className={labelClass}>{copy.documentDataStructureHierarchyLabel}</p>
                      <span className="talent-composition-workspace__confidence-badge" data-confidence={structureSchema.hierarchy.confianza}>
                        {confidenceLabel(structureSchema.hierarchy.confianza, copy)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">
                      {structureSchema.hierarchy.levels.join(' → ')} (
                      {structureSchema.hierarchy.levels
                        .map((level) => structureSchema.hierarchy.headingMap[level] ?? level)
                        .join(' / ')}
                      )
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{structureSchema.hierarchy.regla}</p>
                  </div>
                  <div className="ac-surface-panel ac-surface-panel--subtle gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className={labelClass}>{copy.documentDataStructureObservedLabel}</p>
                      <span className="talent-composition-workspace__confidence-badge" data-confidence={structureSchema.macroPattern.confianza}>
                        {confidenceLabel(structureSchema.macroPattern.confianza, copy)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">
                      {structureSchema.macroPattern.nombre ??
                        `${structureSchema.macroPattern.numPartes} · ${structureSchema.macroPattern.capitulosPorParte.join('-')}`}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">{structureSchema.macroPattern.regla}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">{copy.compositionStructureEmptyMessage}</p>
              )}
            </div>
          )}

          {activeSection === 'numeracion' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-4">
                <span className={labelClass}>{copy.rulesRestartFigures}</span>
                <input
                  type="checkbox"
                  data-testid="composition-restart-figures-toggle"
                  checked={rules.numbering.restartFiguresPerChapter}
                  onChange={(event) => patchNumbering({ restartFiguresPerChapter: event.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </label>
              <label className="flex items-center justify-between gap-4">
                <span className={labelClass}>{copy.rulesRestartTables}</span>
                <input
                  type="checkbox"
                  data-testid="composition-restart-tables-toggle"
                  checked={rules.numbering.restartTablesPerChapter}
                  onChange={(event) => patchNumbering({ restartTablesPerChapter: event.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </label>
              <label className="flex items-center justify-between gap-4">
                <span className={labelClass}>{copy.rulesPageNumberFormat}</span>
                <select
                  data-testid="composition-page-number-format-select"
                  value={rules.numbering.pageNumberFormat}
                  onChange={(event) =>
                    patchNumbering({ pageNumberFormat: event.target.value as DocumentRules['numbering']['pageNumberFormat'] })
                  }
                  className={inputClass}
                >
                  <option value="decimal">{copy.rulesFormatDecimal}</option>
                  <option value="lower-roman">{copy.rulesFormatLowerRoman}</option>
                  <option value="upper-roman">{copy.rulesFormatUpperRoman}</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-4">
                <span className={labelClass}>{copy.rulesTableFillGap}</span>
                <select
                  data-testid="composition-table-fill-gap-select"
                  value={rules.keepTogether.tableFillGap}
                  onChange={(event) => patchKeepTogether({ tableFillGap: event.target.value as 'next-float' | 'leave-space' })}
                  className={inputClass}
                >
                  <option value="leave-space">{copy.rulesFillGapLeaveSpace}</option>
                  <option value="next-float">{copy.rulesFillGapNextFloat}</option>
                </select>
              </label>
            </div>
          )}

          {activeSection === 'exportacion' && (
            <div className="mt-4">
              <label className="flex items-center justify-between gap-4">
                <span className={labelClass}>{copy.rulesExportGate}</span>
                <select
                  data-testid="composition-export-gate-select"
                  value={rules.exportGate}
                  onChange={(event) => patch({ exportGate: event.target.value as DocumentRules['exportGate'] })}
                  className={inputClass}
                >
                  <option value="off">{copy.rulesExportGateOff}</option>
                  <option value="warn">{copy.rulesExportGateWarn}</option>
                  <option value="block">{copy.rulesExportGateBlock}</option>
                </select>
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-4">
            {saved && (
              <span className="text-sm font-medium text-[var(--accent)]" role="status">
                {copy.compositionSaved}
              </span>
            )}
            <button
              type="button"
              data-testid="composition-save-button"
              onClick={handleSave}
              disabled={isPending}
              className="ac-button ac-button--compact ac-button--primary"
            >
              {copy.compositionSave}
            </button>
          </div>
        </section>
      </div>

      {/* SIDEBAR COLUMN */}
      <div className="talent-composition-workspace__sidebar">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="composition-health-panel">
          <p className="ac-surface-panel__eyebrow">{copy.healthPanelTitle}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.compositionHealthSubtitle}</p>

          <div className="talent-composition-workspace__health-stats">
            <div data-state={violationCount === 0 ? 'ok' : 'warn'}>
              {violationCount === 0 ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              <p>{violationCount}</p>
              <span>{copy.compositionStatViolationsLabel}</span>
            </div>
            {telemetry && (
              <div data-state="info">
                <Rows3 className="h-5 w-5" />
                <p>{telemetry.count}</p>
                <span>{copy.compositionStatRecompositionsLabel}</span>
              </div>
            )}
          </div>

          {telemetry && (
            <p className="mt-2 text-xs text-[var(--text-tertiary)]" data-testid="composition-telemetry">
              {copy.healthTelemetrySummary
                .replace('{count}', String(telemetry.count))
                .replace('{lastMs}', String(telemetry.lastMs))
                .replace('{avgMs}', String(telemetry.avgMs))}
            </p>
          )}

          <div
            className="talent-composition-workspace__health-banner"
            data-state={violationCount === 0 ? 'ok' : 'warn'}
          >
            {violationCount === 0
              ? copy.compositionHealthCleanMessage
              : copy.compositionHealthIssuesMessage.replace('{count}', String(violationCount))}
          </div>
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="composition-preflight-panel">
          <p className="ac-surface-panel__eyebrow">{copy.preflightTitle}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.compositionPreflightSubtitle}</p>

          <ul className="talent-composition-workspace__preflight-list">
            {PREFLIGHT_CHANNELS.map((channel) => {
              const channelChecks = preflightChecks.filter((check) => check.channel === channel);
              const channelReady = channelChecks.every((check) => check.severity !== 'error');
              return (
                <li key={channel} data-testid={`composition-preflight-${channel}`}>
                  <span>{channelLabels[channel]}</span>
                  <span className="talent-composition-workspace__preflight-count">
                    {copy.preflightIssueCount.replace('{count}', String(channelChecks.length))}
                  </span>
                  {channelReady ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="ac-surface-panel__footer">
            <button
              type="button"
              data-testid="composition-review-preview-button"
              onClick={() => onNavigateStep(5)}
              className="ac-button ac-button--compact"
            >
              {copy.compositionReviewInPreviewAction}
            </button>
          </div>
        </section>

        {!tipDismissed && (
          <section className="talent-composition-workspace__tip" data-testid="composition-tip">
            <ImageIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{copy.compositionTipTitle}</p>
              <p className="mt-1 text-[var(--text-secondary)]">{copy.compositionTipBody}</p>
            </div>
            <button
              type="button"
              data-testid="composition-tip-dismiss"
              aria-label={copy.compositionTipDismiss}
              onClick={() => setTipDismissed(true)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
