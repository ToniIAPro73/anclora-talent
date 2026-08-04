import type { AppMessages } from '@/lib/i18n/messages';
import type { KdpDisclosure } from '@/lib/ai/kdp-disclosure';

type Copy = AppMessages['project'];

interface KdpDisclosurePanelProps {
  disclosure: KdpDisclosure;
  copy: Copy;
}

/**
 * KDP AI-content disclosure (F3, Capa 2 — governance), shown in the export
 * step: the ready-to-paste declaration for KDP's AI-generated content
 * question, derived from the provenance registry and the accepted-operations
 * log. Display only — the F4 launch-pack plan will embed it in the pack.
 */
export function KdpDisclosurePanel({ disclosure, copy }: KdpDisclosurePanelProps) {
  return (
    <div
      data-testid="kdp-disclosure-panel"
      className="mt-6 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          {copy.kdpDisclosureTitle}
        </p>
        <span
          data-testid="kdp-disclosure-badge"
          data-required={disclosure.required}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            disclosure.required
              ? 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300'
              : 'border-zinc-400/40 bg-zinc-400/10 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {disclosure.required ? copy.kdpDisclosureRequiredBadge : copy.kdpDisclosureExemptBadge}
        </span>
      </div>
      <p data-testid="kdp-disclosure-text" className="mt-2 text-sm text-[var(--text-primary)]">
        {disclosure.text}
      </p>
      <p className="mt-2 text-xs italic text-[var(--text-tertiary)]">{copy.kdpDisclosureHelper}</p>
    </div>
  );
}
