'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ComposeViolation, CompositionDiff } from '@/lib/compose/compose';
import {
  PREFLIGHT_CHANNELS,
  type PreflightChannel,
  type PreflightCheck,
  type PreflightSeverity,
} from '@/lib/preflight/preflight';
import type { RecompositionTelemetry } from './useDocumentComposition';

type Copy = AppMessages['project'];

interface DocumentHealthPanelProps {
  project: ProjectRecord;
  violations: ComposeViolation[];
  copy: Copy;
  /** F1: channel pre-flight checks (KDP, IngramSpark, Kobo). */
  checks?: PreflightCheck[];
  /** C5: structural diff vs. the previous composition (before/after banner). */
  diff?: CompositionDiff | null;
  /** C5: first printed page recomposed since the last edit (badge). */
  recomposedFromPage?: number;
  /** F0.2: rolling recomposition timings from the live composition hook. */
  telemetry?: RecompositionTelemetry;
  /**
   * F0.3: revert of the recomposition caused by the last chapter save of the
   * session. Null/absent when there is nothing revertible (banner hidden).
   */
  revert?: {
    chapterTitle: string;
    pending: boolean;
    onRevert: () => void;
  } | null;
}

/**
 * "Salud del documento" panel (C4): lists composition violations in near
 * real time with the affected page, plus an always-visible counter whose
 * goal is zero. Each item links to the preview.
 *
 * F1: the channel pre-flight section (KDP / IngramSpark / Kobo) groups the
 * pure `src/lib/preflight` checks under per-channel chips; checks anchored
 * to a composed page link to the preview like violations do.
 */
export function DocumentHealthPanel({ project, violations, copy, checks, diff, recomposedFromPage, telemetry, revert }: DocumentHealthPanelProps) {
  const count = violations.length;
  const signed = (value: number) => (value > 0 ? `+${value}` : String(value));
  const [preflightChannel, setPreflightChannel] = useState<PreflightChannel>('kdp');

  const channelLabels: Record<PreflightChannel, string> = {
    kdp: copy.preflightChannelKdp,
    ingramspark: copy.preflightChannelIngramspark,
    kobo: copy.preflightChannelKobo,
  };
  const severityLabels: Record<PreflightSeverity, string> = {
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
  const channelChecks = (checks ?? []).filter((check) => check.channel === preflightChannel);

  return (
    <section
      data-testid="document-health-panel"
      className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {copy.healthPanelEyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {copy.healthPanelTitle}
          </h3>
        </div>
        <span
          data-testid="document-health-counter"
          className={`rounded-full px-4 py-1.5 text-sm font-bold ${
            count === 0
              ? 'bg-[var(--accent)] text-white'
              : 'border border-[var(--accent)] text-[var(--accent)]'
          }`}
        >
          {count === 0 ? '0' : copy.healthViolationsCount.replace('{count}', String(count))}
        </span>
      </div>

      {recomposedFromPage !== undefined && (
        <p
          data-testid="document-health-recomposed-badge"
          className="mt-4 inline-block rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white"
        >
          {copy.healthRecomposedBadge.replace('{page}', String(recomposedFromPage))}
        </p>
      )}

      {telemetry && telemetry.count > 0 && telemetry.lastMs !== null && (
        <p
          data-testid="document-health-telemetry"
          className="mt-3 text-xs text-[var(--text-tertiary)]"
        >
          {copy.healthTelemetrySummary
            .replace('{count}', String(telemetry.count))
            .replace('{lastMs}', String(Math.round(telemetry.lastMs)))
            .replace('{avgMs}', String(Math.round(telemetry.avgMs ?? telemetry.lastMs)))}
        </p>
      )}

      {revert && (
        <div
          data-testid="document-health-revert"
          className="mt-4 flex items-center justify-between gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3"
        >
          <p className="text-sm text-[var(--text-primary)]">
            {copy.healthRevertLabel.replace('{chapter}', revert.chapterTitle)}
          </p>
          <button
            type="button"
            onClick={revert.onRevert}
            disabled={revert.pending}
            className="ac-button ac-button--secondary ac-button--sm shrink-0"
          >
            {revert.pending ? copy.healthReverting : copy.healthRevertAction}
          </button>
        </div>
      )}

      {diff && (diff.chapterShifts.length > 0 || diff.tocDelta !== 0 || diff.newViolations.length > 0) && (
        <div
          data-testid="document-health-diff"
          className="mt-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            {copy.healthDiffTitle}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--text-primary)]">
            {diff.chapterShifts.map((shift) => (
              <li key={shift.chapterId}>
                {copy.healthDiffShift
                  .replace('{title}', shift.title || shift.chapterId)
                  .replace('{from}', String(shift.fromPage))
                  .replace('{to}', String(shift.toPage))}
              </li>
            ))}
            {diff.tocDelta !== 0 && (
              <li>{copy.healthDiffToc.replace('{count}', signed(diff.tocDelta))}</li>
            )}
            {diff.newViolations.length > 0 && (
              <li>{copy.healthDiffViolations.replace('{count}', String(diff.newViolations.length))}</li>
            )}
          </ul>
        </div>
      )}

      {count === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">{copy.healthNoViolations}</p>
      ) : (
        <ul className="mt-4 space-y-2" data-testid="document-health-violations">
          {violations.map((violation, index) => (
            <li
              key={`${violation.blockId}-${index}`}
              className="flex items-start justify-between gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                  {violation.rule}
                </span>
                <p className="text-sm text-[var(--text-primary)]">{violation.message}</p>
              </div>
              <Link
                href={`/projects/${project.id}/preview`}
                className="shrink-0 text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                {copy.healthViolationPage.replace('{page}', String(violation.page + 1))}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {checks && (
        <div
          data-testid="document-preflight"
          className="mt-6 border-t border-[var(--border-subtle)] pt-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
            {copy.preflightTitle}
          </p>
          <div className="mt-3 flex flex-wrap gap-2" role="tablist">
            {PREFLIGHT_CHANNELS.map((channel) => {
              const channelCount = checks.filter((check) => check.channel === channel).length;
              const selected = channel === preflightChannel;
              return (
                <button
                  key={channel}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-testid={`preflight-tab-${channel}`}
                  onClick={() => setPreflightChannel(channel)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                    selected
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {channelLabels[channel]}
                  {channelCount > 0 && (
                    <span className="ml-2 text-xs font-bold">
                      {copy.preflightIssueCount.replace('{count}', String(channelCount))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {channelChecks.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{copy.preflightEmpty}</p>
          ) : (
            <ul className="mt-3 space-y-2" data-testid="document-preflight-checks">
              {channelChecks.map((check, index) => (
                <li
                  key={`${check.rule}-${check.blockId ?? index}`}
                  className="flex items-start justify-between gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3"
                >
                  <div>
                    <span
                      data-testid="preflight-check-severity"
                      className={`text-xs font-bold uppercase tracking-wide ${
                        check.severity === 'error'
                          ? 'text-red-600'
                          : check.severity === 'warning'
                            ? 'text-amber-600'
                            : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      {severityLabels[check.severity]}
                    </span>
                    <span className="ml-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                      {check.rule}
                    </span>
                    <p className="text-sm text-[var(--text-primary)]">{renderCheckMessage(check)}</p>
                  </div>
                  {check.page !== undefined && (
                    <Link
                      href={`/projects/${project.id}/preview`}
                      className="shrink-0 text-sm font-semibold text-[var(--accent)] hover:underline"
                    >
                      {copy.healthViolationPage.replace('{page}', String(check.page + 1))}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Link
          href={`/projects/${project.id}/preview`}
          className="text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          {copy.healthGoToPreview}
        </Link>
      </div>
    </section>
  );
}
