'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import type { AiProposal } from '@/lib/ai/ast-diff-proposal';
import type { AiProcessingMode } from '@/lib/ai/structural-assistant';
import { AiProposalReview } from './ai-workspace/AiProposalReview';

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

/**
 * Compact card used by the Step 1 health panels (violation / coherence fixes). It is the same review component as
 * the Step 7 workspace — one diff renderer for every AI proposal — with the compact wording.
 */
export function AiProposalCard(props: AiProposalCardProps) {
  return <AiProposalReview {...props} variant="compact" />;
}
