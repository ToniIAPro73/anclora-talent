'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  FileJson,
  FileText,
  Hash,
  History as HistoryIcon,
  Image as ImageIcon,
  Layers,
  Rows3,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { isFixedPdfProject } from '@/lib/projects/types';
import type { BrandProfile } from '@/lib/brand/brand-profile';
import type { ComposeViolation } from '@/lib/compose/compose';
import type { DocumentRules } from '@/lib/compose/rules';
import { PREFLIGHT_CHANNELS, type PreflightCheck } from '@/lib/preflight/preflight';
import type { DocumentSnapshotMeta } from '@/lib/snapshots/model';
import { formatNumber, getDocumentStats } from '@/lib/projects/document-stats';

type Copy = AppMessages['project'];
type HistoryCopy = AppMessages['history'];

interface ContentSummaryProps {
  project: ProjectRecord;
  copy: Copy;
  historyCopy?: HistoryCopy;
  brandProfiles: BrandProfile[];
  violations: ComposeViolation[];
  preflightChecks: PreflightCheck[];
  rules: DocumentRules;
  snapshots?: DocumentSnapshotMeta[];
  isSavingVersion?: boolean;
  onEditMetadata: () => void;
  onOpenComposition: () => void;
  onOpenBrand: () => void;
  onOpenPreflight: () => void;
  onOpenVersions: () => void;
  onOpenAssistant: () => void;
  onOpenPreview: () => void;
  onSaveVersion?: () => void;
}

function formatSnapshotDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

export function ContentSummary({
  project,
  copy,
  historyCopy,
  brandProfiles,
  violations,
  preflightChecks,
  rules,
  snapshots,
  isSavingVersion = false,
  onEditMetadata,
  onOpenComposition,
  onOpenBrand,
  onOpenPreflight,
  onOpenVersions,
  onOpenAssistant,
  onOpenPreview,
  onSaveVersion,
}: ContentSummaryProps) {
  const fixedPdf = isFixedPdfProject(project);
  const [expandedChannel, setExpandedChannel] = useState<(typeof PREFLIGHT_CHANNELS)[number] | null>(
    PREFLIGHT_CHANNELS.find((channel) => preflightChecks.some((check) => check.channel === channel)) ?? null,
  );

  const stats = useMemo(() => getDocumentStats(project.document, 'laptop'), [project.document]);
  const selectedProfile = brandProfiles.find((profile) => profile.id === project.brandProfileId) ?? null;

  // A compact "4 min" / "1h 12m" form for the narrow stat strip — the
  // shared formatReadingTime() spells out "4 minutos"/"1 hora", which wraps
  // onto two lines in a 1/5-width cell.
  const readingTimeCompact = useMemo(() => {
    const minutes = stats.estimatedReadTime;
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = Math.round(minutes % 60);
    return remaining === 0 ? `${hours} h` : `${hours}h ${remaining}m`;
  }, [stats.estimatedReadTime]);

  const violationCount = violations.length;
  const metadataComplete = Boolean(
    project.document.title?.trim() && project.document.author?.trim() && project.document.subtitle?.trim(),
  );

  const paginationActive = [rules.chapterStartsOnOddPage, rules.pageBreakBeforeChapter].filter(Boolean).length;
  const structureActive = [
    rules.keepTogether.table,
    rules.keepTogether.code,
    rules.keepTogether.quote,
    rules.keepTogether.callout,
    rules.keepTogether.imageWithCaption,
  ].filter(Boolean).length;
  const mediaActive = [rules.numbering.restartFiguresPerChapter, rules.numbering.restartTablesPerChapter].filter(
    Boolean,
  ).length;

  // Matches the print/digital/default presets DocumentRulesPanel applies
  // (chapterStartsOnOddPage + pageBreakBeforeChapter); shown as a label only,
  // rules stay freely editable rather than locked to a preset.
  const activePreset = rules.chapterStartsOnOddPage && rules.pageBreakBeforeChapter
    ? { name: copy.rulesPresetPrint, description: copy.rulesPresetPrintDesc }
    : !rules.chapterStartsOnOddPage && rules.pageBreakBeforeChapter
      ? { name: copy.rulesPresetDigital, description: copy.rulesPresetDigitalDesc }
      : { name: copy.rulesPresetDefault, description: copy.rulesPresetDefaultDesc };

  const preflightErrorCount = preflightChecks.filter((check) => check.severity === 'error').length;
  const preflightReady = preflightErrorCount === 0;

  const latestSnapshot = snapshots?.[0] ?? null;

  const channelLabels: Record<(typeof PREFLIGHT_CHANNELS)[number], string> = {
    kdp: copy.preflightChannelKdp,
    ingramspark: copy.preflightChannelIngramspark,
    kobo: copy.preflightChannelKobo,
  };
  const severityLabels: Record<PreflightCheck['severity'], string> = {
    error: copy.preflightSeverityError,
    warning: copy.preflightSeverityWarning,
    info: copy.preflightSeverityInfo,
  };
  const renderCheckMessage = (check: PreflightCheck) => {
    const template = copy.preflightRules[check.rule];
    if (!template) return check.rule;
    return Object.entries(check.params).reduce(
      (message, [key, value]) => message.replaceAll(`{${key}}`, value),
      template,
    );
  };

  return (
    <div className="talent-content-summary" data-testid="content-summary">
      {/* LEFT COLUMN */}
      <div className="talent-content-summary__column">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="content-summary-document-state">
          <div className="ac-surface-panel__meta">
            <div>
              <p className="ac-surface-panel__eyebrow">{copy.contentSummaryDocumentStateTitle}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.contentSummaryDocumentStateDescription}</p>
            </div>
            <button
              type="button"
              data-testid="content-summary-edit-metadata"
              onClick={onEditMetadata}
              className="dashboard-button"
            >
              {copy.contentSummaryEditMetadataAction}
            </button>
          </div>

          <div className="talent-content-summary__identity">
            <div className="dashboard-cover talent-content-summary__cover" data-palette={project.cover.palette} data-testid="content-summary-cover">
              {project.cover.thumbnailUrl || project.cover.renderedImageUrl ? (
                <Image
                  src={(project.cover.thumbnailUrl || project.cover.renderedImageUrl) as string}
                  alt=""
                  fill
                  sizes="148px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <>
                  <BookOpen size={18} aria-hidden="true" />
                  <span>{project.document.title}</span>
                  <small>{project.document.author}</small>
                </>
              )}
            </div>

            <dl className="talent-content-summary__fields">
              <div>
                <dt>{copy.documentDataTitleLabel}</dt>
                <dd>{project.document.title || '—'}</dd>
              </div>
              <div>
                <dt>{copy.documentDataSubtitleLabel}</dt>
                <dd>{project.document.subtitle || '—'}</dd>
              </div>
              <div>
                <dt>{copy.documentDataAuthorLabel}</dt>
                <dd>{project.document.author || '—'}</dd>
              </div>
              <div>
                <dt>{copy.metadataLanguageLabel}</dt>
                <dd>{project.document.metadata?.language || project.document.language || '—'}</dd>
              </div>
              <div>
                <dt>{copy.metadataIsbnLabel}</dt>
                <dd>{project.document.metadata?.isbn || '—'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="ac-stat-strip" style={{ ['--ac-stat-columns' as string]: fixedPdf ? 1 : 5 }} data-testid="content-summary-stats">
          {fixedPdf ? (
            <div className="ac-stat-strip__item">
              <BookOpen className="h-4 w-4 text-[var(--accent-text)]" />
              <p className="ac-stat-strip__value">{project.document.source?.pageCount ?? '—'}</p>
              <p className="ac-stat-strip__label">{copy.contentSummaryStatsPages}</p>
            </div>
          ) : (
            <>
              <div className="ac-stat-strip__item">
                <BookOpen className="h-4 w-4 text-[var(--accent-text)]" />
                <p className="ac-stat-strip__value">{stats.chapterCount}</p>
                <p className="ac-stat-strip__label">
                  {stats.chapterCount === 1 ? copy.contentSummaryStatsChapter : copy.contentSummaryStatsChapters}
                </p>
              </div>
              <div className="ac-stat-strip__item">
                <FileText className="h-4 w-4 text-[var(--accent-text)]" />
                <p className="ac-stat-strip__value">{formatNumber(stats.wordCount)}</p>
                <p className="ac-stat-strip__label">{copy.contentSummaryStatsWords}</p>
              </div>
              <div className="ac-stat-strip__item">
                <Hash className="h-4 w-4 text-[var(--accent-text)]" />
                <p className="ac-stat-strip__value">{formatNumber(stats.characterCount)}</p>
                <p className="ac-stat-strip__label">{copy.contentSummaryStatsCharacters}</p>
              </div>
              <div className="ac-stat-strip__item">
                <Clock className="h-4 w-4 text-[var(--accent-text)]" />
                <p className="ac-stat-strip__value">{readingTimeCompact}</p>
                <p className="ac-stat-strip__label">{copy.contentSummaryStatsReadingTime}</p>
              </div>
              <div className="ac-stat-strip__item">
                <FileJson className="h-4 w-4 text-[var(--accent-text)]" />
                <p className="ac-stat-strip__value">~{stats.pageCount}</p>
                <p className="ac-stat-strip__label">{copy.contentSummaryStatsPages}</p>
              </div>
            </>
          )}
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="content-summary-activity">
          <div className="ac-surface-panel__meta">
            <div>
              <p className="ac-surface-panel__eyebrow">{copy.contentSummaryActivityTitle}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.contentSummaryActivitySubtitle}</p>
            </div>
            {snapshots && (
              <button
                type="button"
                data-testid="content-summary-view-history"
                onClick={onOpenVersions}
                className="dashboard-button"
              >
                <HistoryIcon className="h-3.5 w-3.5" />
                {copy.contentSummaryViewHistoryAction}
              </button>
            )}
          </div>
          {latestSnapshot ? (
            <p className="mt-3 text-sm text-[var(--text-primary)]">
              {historyCopy?.versionLabel.replace('{version}', String(latestSnapshot.version))} · {latestSnapshot.label}
              <span className="ml-2 text-xs text-[var(--text-tertiary)]">{formatSnapshotDate(latestSnapshot.createdAt)}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{copy.contentSummaryActivityEmpty}</p>
          )}
        </section>
      </div>

      {/* CENTER COLUMN */}
      <div className="talent-content-summary__column">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="content-summary-composition">
          <div className="ac-surface-panel__meta">
            <div>
              <p className="ac-surface-panel__eyebrow">{copy.rulesPanelEyebrow}</p>
              <h3 className="ac-surface-panel__title">{copy.rulesPanelTitle}</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.contentSummaryCompositionSubtitle}</p>
            </div>
            <button
              type="button"
              data-testid="content-summary-configure-composition"
              onClick={onOpenComposition}
              className="dashboard-button"
            >
              {copy.contentSummaryConfigureAction}
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenComposition}
            className="talent-content-summary__preset"
            data-testid="content-summary-active-preset"
          >
            <span className="talent-content-summary__preset-name">{activePreset.name}</span>
            <span className="talent-content-summary__preset-desc">{activePreset.description}</span>
          </button>

          <ul className="talent-content-summary__rule-list">
            <li>
              <Rows3 className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
              <span>{copy.contentSummaryRulePagination}</span>
              <span className="talent-content-summary__rule-count talent-content-summary__rule-count--ok">
                {copy.contentSummaryActiveCount.replace('{count}', String(paginationActive))}
              </span>
            </li>
            <li>
              <Layers className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
              <span>{copy.contentSummaryRuleStructure}</span>
              <span className="talent-content-summary__rule-count talent-content-summary__rule-count--ok">
                {copy.contentSummaryActiveCount.replace('{count}', String(structureActive))}
              </span>
            </li>
            <li>
              <ImageIcon className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
              <span>{copy.contentSummaryRuleMedia}</span>
              <span className="talent-content-summary__rule-count talent-content-summary__rule-count--ok">
                {copy.contentSummaryActiveCount.replace('{count}', String(mediaActive))}
              </span>
            </li>
            <li>
              <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent-text)]" />
              <span>{copy.contentSummaryRuleViolations}</span>
              <span
                className={`talent-content-summary__rule-count ${violationCount > 0 ? 'talent-content-summary__rule-count--warn' : 'talent-content-summary__rule-count--ok'}`}
              >
                {violationCount}
              </span>
            </li>
          </ul>

          <div className="ac-surface-panel__footer">
            <button
              type="button"
              data-testid="content-summary-review-rules"
              onClick={onOpenComposition}
              className="dashboard-button"
            >
              {copy.contentSummaryReviewRulesAction}
            </button>
          </div>
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="content-summary-brand">
          <div className="ac-surface-panel__meta">
            <div>
              <p className="ac-surface-panel__eyebrow">{copy.brandPanelEyebrow}</p>
              <h3 className="ac-surface-panel__title">{copy.brandPanelTitle}</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.contentSummaryBrandSubtitle}</p>
            </div>
            <button
              type="button"
              data-testid="content-summary-edit-brand"
              onClick={onOpenBrand}
              className="dashboard-button"
            >
              {copy.contentSummaryEditAction}
            </button>
          </div>

          {selectedProfile ? (
            <div className="mt-4 space-y-3" data-testid="content-summary-brand-applied">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedProfile.name}
                <span className="ml-2 text-xs font-normal text-[var(--text-tertiary)]">
                  {copy.brandVersionLabel} {selectedProfile.version} ·{' '}
                  {selectedProfile.status === 'active' ? copy.brandStatusActive : selectedProfile.status === 'draft' ? copy.brandStatusDraft : copy.brandStatusDeprecated}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {selectedProfile.palette.map((color) => (
                  <span key={color.role} className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <span
                      title={color.name ?? color.hex}
                      className="inline-block h-5 w-5 rounded-full border border-[var(--border-subtle)]"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.hex.toUpperCase()}
                  </span>
                ))}
              </div>
              {(selectedProfile.typography.display?.family || selectedProfile.typography.body?.family) && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {[selectedProfile.typography.display?.family, selectedProfile.typography.body?.family]
                    .filter(Boolean)
                    .join(' + ')}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4" data-testid="content-summary-brand-empty">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.contentSummaryBrandEmptyTitle}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.contentSummaryBrandEmptyBody}</p>
            </div>
          )}
        </section>
      </div>

      {/* RIGHT COLUMN */}
      <div className="talent-content-summary__column">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="content-summary-health">
          <div>
            <p className="ac-surface-panel__eyebrow">{copy.healthPanelEyebrow}</p>
            <h3 className="ac-surface-panel__title">{copy.healthPanelTitle}</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.contentSummaryHealthSubtitle}</p>
          </div>

          <ul className="talent-content-summary__health-list">
            <li data-state={metadataComplete ? 'ok' : 'warn'}>
              <span className="talent-content-summary__health-dot" />
              <div>
                <p>{metadataComplete ? copy.contentSummaryHealthMetadataOkTitle : copy.contentSummaryHealthMetadataWarnTitle}</p>
                <span>{metadataComplete ? copy.contentSummaryHealthMetadataOkBody : copy.contentSummaryHealthMetadataWarnBody}</span>
              </div>
            </li>
            <li data-state={violationCount === 0 ? 'ok' : 'warn'}>
              <span className="talent-content-summary__health-dot" />
              <div>
                <p>
                  {violationCount === 0
                    ? copy.contentSummaryHealthCompositionOkTitle
                    : copy.contentSummaryHealthCompositionWarnTitle.replace('{count}', String(violationCount))}
                </p>
                <span>{violationCount === 0 ? copy.contentSummaryHealthCompositionOkBody : copy.contentSummaryHealthCompositionWarnBody}</span>
              </div>
            </li>
            <li data-state={preflightReady ? 'ok' : 'warn'}>
              <span className="talent-content-summary__health-dot" />
              <div>
                <p>
                  {preflightReady
                    ? copy.contentSummaryHealthPreflightOkTitle
                    : copy.contentSummaryHealthPreflightWarnTitle.replace('{count}', String(preflightErrorCount))}
                </p>
                <span>{preflightReady ? copy.contentSummaryHealthPreflightOkBody : copy.contentSummaryHealthPreflightWarnBody}</span>
              </div>
            </li>
          </ul>
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="content-summary-preflight">
          <div>
            <p className="ac-surface-panel__eyebrow">{copy.preflightTitle}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.contentSummaryPreflightSubtitle}</p>
          </div>

          <ul className="talent-content-summary__preflight-list">
            {PREFLIGHT_CHANNELS.map((channel) => {
              const channelChecks = preflightChecks.filter((check) => check.channel === channel);
              const expanded = expandedChannel === channel;
              return (
                <li key={channel} data-testid={`content-summary-preflight-${channel}`}>
                  <button
                    type="button"
                    data-testid={`content-summary-preflight-toggle-${channel}`}
                    onClick={() => setExpandedChannel(expanded ? null : channel)}
                    className="talent-content-summary__preflight-header"
                    aria-expanded={expanded}
                  >
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span className="flex-1 text-left">{channelLabels[channel]}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {channelChecks.length > 0 ? copy.preflightIssueCount.replace('{count}', String(channelChecks.length)) : '—'}
                    </span>
                  </button>
                  {expanded && (
                    <ul className="talent-content-summary__preflight-checks">
                      {channelChecks.length === 0 ? (
                        <li className="text-xs text-[var(--text-secondary)]">{copy.preflightEmpty}</li>
                      ) : (
                        channelChecks.map((check, index) => (
                          <li key={`${check.rule}-${index}`} data-severity={check.severity}>
                            <span className="talent-content-summary__preflight-severity" data-severity={check.severity}>
                              {severityLabels[check.severity]}
                            </span>
                            <span className="talent-content-summary__preflight-rule">{check.rule}</span>
                            <p>{renderCheckMessage(check)}</p>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="ac-surface-panel__footer">
            <button
              type="button"
              onClick={onOpenPreflight}
              className="dashboard-button"
              data-testid="content-summary-open-preflight"
            >
              {copy.contentSummaryReviewRulesAction}
            </button>
          </div>
        </section>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="talent-content-summary__actions" data-testid="content-summary-actions">
        <div className="talent-content-summary__actions-secondary">
          <button type="button" onClick={onOpenAssistant} className="dashboard-button" data-testid="content-summary-open-assistant">
            {copy.contentSummaryBottomAssistant}
          </button>
          <button type="button" onClick={onOpenPreflight} className="dashboard-button" data-testid="content-summary-review-coherence">
            {copy.contentSummaryBottomCoherence}
          </button>
          {onSaveVersion && (
            <button
              type="button"
              onClick={onSaveVersion}
              disabled={isSavingVersion}
              className="dashboard-button"
              data-testid="content-summary-save-version"
            >
              {isSavingVersion ? historyCopy?.savingVersion : copy.contentSummarySaveVersionAction}
            </button>
          )}
          <button type="button" onClick={onOpenVersions} className="dashboard-button" data-testid="content-summary-open-versions">
            {copy.contentSummaryViewHistoryAction}
          </button>
        </div>
        <button type="button" onClick={onOpenPreview} className="dashboard-button dashboard-button--primary" data-testid="content-summary-open-preview">
          {copy.editorOpenPreview}
        </button>
      </div>
    </div>
  );
}
