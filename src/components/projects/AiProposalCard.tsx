'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import type { AiProposal } from '@/lib/ai/ast-diff-proposal';
import type { BlockChange } from '@/lib/document/diff';
import type { AiProcessingMode } from '@/lib/ai/structural-assistant';

type Copy = AppMessages['project'];

interface AiProposalCardProps {
  proposal: AiProposal;
  /** Processing mode that generated the proposal (transparency rule). */
  mode: AiProcessingMode;
  copy: Copy;
  pending: boolean;
  /** True when the last accept attempt reported the proposal as stale. */
  stale?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

function changeKindLabel(change: BlockChange, copy: Copy): string {
  switch (change.kind) {
    case 'added':
      return copy.aiChangeAdded;
    case 'removed':
      return copy.aiChangeRemoved;
    case 'changed':
      return copy.aiChangeChanged;
    case 'moved':
      return copy.aiChangeMoved;
  }
}

/**
 * Card for one AI proposal (F3): readable before/after diff per block,
 * provenance ("IA") and processing-mode badges (cloud is always declared),
 * and the accept/reject decision — the human always has the last word.
 * Advisory proposals (no operations) render without an accept button.
 */
export function AiProposalCard({ proposal, mode, copy, pending, stale, onAccept, onReject }: AiProposalCardProps) {
  const isAdvisory = proposal.operations.length === 0;

  return (
    <div
      data-testid="ai-proposal-card"
      className="mt-3 rounded-[14px] border border-[var(--accent)] bg-[var(--page-surface)] px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          IA
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
          {proposal.kind}
        </span>
        <span
          data-testid="ai-proposal-mode"
          data-mode={mode}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            mode === 'cloud'
              ? 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300'
              : 'border-zinc-400/40 bg-zinc-400/10 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          {mode === 'cloud' ? copy.aiModeCloud : copy.aiModeLocal}
        </span>
        {isAdvisory && (
          <span
            data-testid="ai-proposal-advisory"
            className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
          >
            {copy.aiAdvisoryBadge}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{proposal.summary}</p>
      <p className="mt-1 text-xs italic text-[var(--text-tertiary)]">{copy.aiEthicalCopy}</p>

      {proposal.diff.chapters.some((chapter) => chapter.changes.length > 0) && (
        <ul className="mt-3 space-y-2" data-testid="ai-proposal-diff">
          {proposal.diff.chapters.flatMap((chapter) =>
            chapter.changes.map((change) => (
              <li
                key={`${change.blockId}-${change.kind}`}
                className="rounded-[10px] bg-[var(--surface-soft)] px-3 py-2 text-xs"
              >
                <span className="font-bold uppercase tracking-wide text-[var(--accent)]">
                  {changeKindLabel(change, copy)}
                </span>
                {change.kind === 'changed' && change.previousPreview !== undefined ? (
                  <span className="mt-1 block">
                    <span className="font-semibold text-[var(--text-tertiary)]">{copy.aiDiffBefore}: </span>
                    <span className="text-[var(--text-secondary)] line-through">{change.previousPreview}</span>
                    <span className="mt-0.5 block">
                      <span className="font-semibold text-[var(--text-tertiary)]">{copy.aiDiffAfter}: </span>
                      <span className="text-[var(--text-primary)]">{change.preview}</span>
                    </span>
                  </span>
                ) : (
                  <span className="mt-1 block text-[var(--text-primary)]">{change.preview}</span>
                )}
              </li>
            )),
          )}
        </ul>
      )}

      {stale && (
        <p role="alert" data-testid="ai-proposal-stale" className="mt-2 text-xs font-semibold text-red-600">
          {copy.aiProposalStale}
        </p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          data-testid="ai-proposal-reject"
          onClick={onReject}
          disabled={pending}
          className="ac-button ac-button--secondary ac-button--sm"
        >
          {copy.aiProposalReject}
        </button>
        {!isAdvisory && (
          <button
            type="button"
            data-testid="ai-proposal-accept"
            onClick={onAccept}
            disabled={pending}
            className="ac-button ac-button--primary ac-button--sm"
          >
            {pending ? copy.aiProposalApplying : copy.aiProposalAccept}
          </button>
        )}
      </div>
    </div>
  );
}
