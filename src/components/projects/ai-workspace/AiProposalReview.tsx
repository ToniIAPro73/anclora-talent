'use client';

import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Loader2, X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { AiProposal } from '@/lib/ai/ast-diff-proposal';
import type { BlockChange, BlockChangeKind } from '@/lib/document/diff';
import type { AiProcessingMode } from '@/lib/ai/structural-assistant';
import { groupProposalChanges, plural, summarizeProposalImpact } from '@/lib/ai/workspace-model';

type Copy = AppMessages['project'];

export interface AiProposalReviewProps {
  proposal: AiProposal;
  /** Processing mode that generated the proposal (transparency rule: never hidden). */
  mode: AiProcessingMode;
  copy: Copy;
  pending: boolean;
  /** The last accept attempt reported the proposal as stale (document changed): it can no longer write. */
  stale?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate?: () => void;
  onDiscard?: () => void;
  /** What the proposal targets (chapter title / whole document). */
  targetLabel?: string;
  /** `compact` keeps the Step 1 health-panel wording; `full` is the Step 7 workspace review. */
  variant?: 'compact' | 'full';
}

const KIND_LABEL: Record<BlockChangeKind, keyof Copy> = {
  changed: 'aiWsKindChanged',
  added: 'aiWsKindAdded',
  removed: 'aiWsKindRemoved',
  moved: 'aiWsKindMoved',
};

const COMPACT_KIND_LABEL: Record<BlockChangeKind, keyof Copy> = {
  changed: 'aiChangeChanged',
  added: 'aiChangeAdded',
  removed: 'aiChangeRemoved',
  moved: 'aiChangeMoved',
};

function ChangeItem({ change, copy, compact }: { change: BlockChange; copy: Copy; compact: boolean }) {
  const label = String(copy[(compact ? COMPACT_KIND_LABEL : KIND_LABEL)[change.kind]]);
  return (
    <li className="aw-change" data-kind={change.kind} data-testid="ai-change">
      <span className="aw-change__kind">{label}</span>
      {change.kind === 'changed' && change.previousPreview !== undefined ? (
        <span className="aw-change__pair">
          <span className="aw-change__side aw-change__side--before">
            <span className="aw-change__label">{copy.aiDiffBefore}</span>
            <span className="aw-change__text aw-change__text--before">{change.previousPreview}</span>
          </span>
          <span className="aw-change__side aw-change__side--after">
            <span className="aw-change__label">{copy.aiDiffAfter}</span>
            <span className="aw-change__text">{change.preview}</span>
          </span>
        </span>
      ) : (
        <span className="aw-change__text">{change.preview}</span>
      )}
    </li>
  );
}

/**
 * One AI proposal, reviewed by the human: type, target, processing mode, impact summary derived from the diff,
 * changes grouped by chapter and kind (collapsible), and the accept / reject gate. A stale proposal never offers
 * a write: only regenerate / discard.
 */
export function AiProposalReview({
  proposal,
  mode,
  copy,
  pending,
  stale,
  onAccept,
  onReject,
  onRegenerate,
  onDiscard,
  targetLabel,
  variant = 'full',
}: AiProposalReviewProps) {
  const compact = variant === 'compact';
  const isAdvisory = proposal.operations.length === 0;
  const impact = summarizeProposalImpact(proposal);
  const groups = groupProposalChanges(proposal);
  const initiallyOpen = new Set(groups.filter((_, index) => impact.total <= 8 || index === 0).map((group) => group.id));
  const [open, setOpen] = useState<Set<string>>(initiallyOpen);
  const toggle = (id: string) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const impactParts = [
    impact.changed > 0 ? plural(impact.changed, copy.aiWsChangedOne, copy.aiWsChangedMany) : null,
    impact.added - impact.headingsAdded > 0 ? plural(impact.added - impact.headingsAdded, copy.aiWsAddedOne, copy.aiWsAddedMany) : null,
    impact.headingsAdded > 0 ? plural(impact.headingsAdded, copy.aiWsHeadingsOne, copy.aiWsHeadingsMany) : null,
    impact.removed > 0 ? plural(impact.removed, copy.aiWsRemovedOne, copy.aiWsRemovedMany) : null,
    impact.moved > 0 ? plural(impact.moved, copy.aiWsMovedOne, copy.aiWsMovedMany) : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <div className={compact ? 'aw-review aw-review--compact' : 'aw-review'} data-testid="ai-proposal-card" data-stale={stale ? 'true' : 'false'}>
      <div className="aw-review__badges">
        <span className="aw-badge aw-badge--ai">IA</span>
        <span className="aw-review__kind">{proposal.kind}</span>
        <span className="aw-badge" data-testid="ai-proposal-mode" data-mode={mode}>
          {mode === 'cloud' ? copy.aiModeCloud : copy.aiModeLocal}
        </span>
        {isAdvisory ? (
          <span className="aw-badge aw-badge--warn" data-testid="ai-proposal-advisory">{copy.aiAdvisoryBadge}</span>
        ) : null}
      </div>

      <p className="aw-review__summary">{proposal.summary}</p>
      {!compact ? (
        <dl className="aw-review__meta">
          {targetLabel ? (<div><dt>{copy.aiWsTargetLabel}</dt><dd data-testid="ai-proposal-target">{targetLabel}</dd></div>) : null}
          <div><dt>{copy.aiWsAffected}</dt><dd data-testid="ai-proposal-affected">{impact.total}</dd></div>
        </dl>
      ) : (
        <p className="aw-hint">{copy.aiEthicalCopy}</p>
      )}

      {impactParts.length > 0 ? (
        <ul className="aw-impact" data-testid="ai-proposal-impact" aria-label={copy.aiWsChangesTitle}>
          {impactParts.map((part) => (<li key={part}>{part}</li>))}
        </ul>
      ) : !isAdvisory && !compact ? (
        <p className="aw-hint">{copy.aiWsNoChanges}</p>
      ) : null}

      {groups.length > 0 ? (
        <div className="aw-groups" data-testid="ai-proposal-diff">
          {!compact ? <h4 className="aw-subtitle">{copy.aiWsChangesTitle}</h4> : null}
          {groups.map((group) => {
            const expanded = open.has(group.id);
            return (
              <section key={group.id} className="aw-group" data-testid="ai-change-group">
                <button
                  type="button"
                  className="aw-group__toggle"
                  data-testid="ai-group-toggle"
                  aria-expanded={expanded}
                  aria-label={copy.aiWsGroupToggle.replace('{title}', group.title || copy.aiWsFrontMatter)}
                  onClick={() => toggle(group.id)}
                >
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span className="aw-group__title">{group.title || copy.aiWsFrontMatter}</span>
                  <span className="aw-group__count">{group.count}</span>
                </button>
                {expanded ? (
                  <div className="aw-group__body">
                    {group.kinds.map((entry) => (
                      <ul key={entry.kind} className="aw-changes" aria-label={String(copy[KIND_LABEL[entry.kind]])}>
                        {entry.changes.map((change) => (
                          <ChangeItem key={`${change.blockId}-${change.kind}`} change={change} copy={copy} compact={compact} />
                        ))}
                      </ul>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {stale ? (
        <div role="alert" data-testid="ai-proposal-stale" className="aw-stale">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <div>
            <strong>{compact ? copy.aiProposalStale : copy.aiWsStaleTitle}</strong>
            {!compact ? <p>{copy.aiWsStaleBody}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="aw-review__actions">
        {stale && (onRegenerate || onDiscard) ? (
          <>
            {onDiscard ? (<button type="button" className="aw-button" data-testid="ai-proposal-discard" onClick={onDiscard}><X className="h-3.5 w-3.5" />{copy.aiWsDiscard}</button>) : null}
            {onRegenerate ? (<button type="button" className="aw-button aw-button--primary" data-testid="ai-proposal-regenerate" onClick={onRegenerate}>{copy.aiWsRegenerate}</button>) : null}
          </>
        ) : (
          <>
            <button type="button" className="aw-button" data-testid="ai-proposal-reject" onClick={onReject} disabled={pending}>
              {compact ? copy.aiProposalReject : copy.aiWsReject}
            </button>
            {!isAdvisory ? (
              <button type="button" className="aw-button aw-button--primary" data-testid="ai-proposal-accept" onClick={onAccept} disabled={pending} aria-busy={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {pending ? (compact ? copy.aiProposalApplying : copy.aiWsApplying) : compact ? copy.aiProposalAccept : copy.aiWsAccept}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
