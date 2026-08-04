'use client';

import Link from 'next/link';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ComposeViolation, CompositionDiff } from '@/lib/compose/compose';
import type { RecompositionTelemetry } from './useDocumentComposition';

type Copy = AppMessages['project'];

interface DocumentHealthPanelProps {
  project: ProjectRecord;
  violations: ComposeViolation[];
  copy: Copy;
  /** C5: structural diff vs. the previous composition (before/after banner). */
  diff?: CompositionDiff | null;
  /** C5: first printed page recomposed since the last edit (badge). */
  recomposedFromPage?: number;
  /** F0.2: rolling recomposition timings from the live composition hook. */
  telemetry?: RecompositionTelemetry;
}

/**
 * "Salud del documento" panel (C4): lists composition violations in near
 * real time with the affected page, plus an always-visible counter whose
 * goal is zero. Each item links to the preview.
 */
export function DocumentHealthPanel({ project, violations, copy, diff, recomposedFromPage, telemetry }: DocumentHealthPanelProps) {
  const count = violations.length;
  const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

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
