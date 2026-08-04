import type { ProcessingMode } from '@/lib/filestudio/client';

/**
 * Processing mode indicator — non-negotiable product rule
 * (sdd/integrations/filestudio/routing-policy.md): every operation declares
 * to the user in which mode it was processed. Reusable across workspace,
 * settings and job lists.
 */

export interface ProcessingModeBadgeLabels {
  local: string;
  service: string;
  browser: string;
}

const MODE_STYLES: Record<ProcessingMode, { dot: string; ring: string }> = {
  local: {
    dot: 'bg-emerald-400',
    ring: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300',
  },
  service: {
    dot: 'bg-sky-400',
    ring: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300',
  },
  browser: {
    dot: 'bg-zinc-400',
    ring: 'border-zinc-400/40 bg-zinc-400/10 text-zinc-700 dark:text-zinc-300',
  },
};

export function ProcessingModeBadge({
  mode,
  labels,
  className = '',
}: {
  mode: ProcessingMode;
  labels: ProcessingModeBadgeLabels;
  className?: string;
}) {
  const styles = MODE_STYLES[mode];
  return (
    <span
      data-testid="processing-mode-badge"
      data-mode={mode}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles.ring} ${className}`.trim()}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${styles.dot}`} />
      {labels[mode]}
    </span>
  );
}
