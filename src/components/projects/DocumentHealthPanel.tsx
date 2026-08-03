'use client';

import Link from 'next/link';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ComposeViolation } from '@/lib/compose/compose';

type Copy = AppMessages['project'];

interface DocumentHealthPanelProps {
  project: ProjectRecord;
  violations: ComposeViolation[];
  copy: Copy;
}

/**
 * "Salud del documento" panel (C4): lists composition violations in near
 * real time with the affected page, plus an always-visible counter whose
 * goal is zero. Each item links to the preview.
 */
export function DocumentHealthPanel({ project, violations, copy }: DocumentHealthPanelProps) {
  const count = violations.length;

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
