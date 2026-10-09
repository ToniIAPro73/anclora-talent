/**
 * Pure helpers of the Step 7 AI workspace: how a proposal is summarised and grouped for review, and which
 * document problems the AI can be asked to fix. Nothing here calls the AI or touches the document.
 */

import type { ComposeViolation } from '@/lib/compose/compose';
import type { BlockChange, BlockChangeKind } from '@/lib/document/diff';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import type { AiProposal } from './ast-diff-proposal';
import { isAiFixEligible } from './structural-assistant';

export type AiTool = 'style' | 'architecture' | 'summary' | 'coherence' | 'fixes';

export interface ToolDefinition {
  id: AiTool;
  group: 'writing' | 'document' | 'fixes';
  /** Needs a chapter target (otherwise the whole document). */
  chapterScoped: boolean;
  /** Requires the cloud provider (co-author operations are LLM-obligatory). */
  needsCloud: boolean;
  /** Needs an editable AST (not available for fixed-layout PDF projects). */
  needsEditable: boolean;
}

export const AI_TOOLS: readonly ToolDefinition[] = [
  { id: 'style', group: 'writing', chapterScoped: true, needsCloud: true, needsEditable: true },
  { id: 'architecture', group: 'writing', chapterScoped: true, needsCloud: true, needsEditable: true },
  { id: 'summary', group: 'document', chapterScoped: false, needsCloud: true, needsEditable: true },
  { id: 'coherence', group: 'document', chapterScoped: false, needsCloud: false, needsEditable: true },
  { id: 'fixes', group: 'fixes', chapterScoped: false, needsCloud: false, needsEditable: true },
];

export function toolDefinition(id: AiTool): ToolDefinition {
  return AI_TOOLS.find((tool) => tool.id === id) as ToolDefinition;
}

export interface ProposalImpact {
  changed: number;
  added: number;
  removed: number;
  moved: number;
  /** Added blocks that are headings (subtitles / chapter titles). */
  headingsAdded: number;
  /** Blocks touched in total. */
  total: number;
}

/** Impact derived from the proposal's own semantic diff — no estimates. */
export function summarizeProposalImpact(proposal: AiProposal): ProposalImpact {
  let headingsAdded = 0;
  for (const chapter of proposal.diff.chapters) {
    for (const change of chapter.changes) {
      if (change.kind === 'added' && change.blockType === 'heading') headingsAdded += 1;
    }
  }
  const { changed, added, removed, moved } = proposal.diff.counts;
  return { changed, added, removed, moved, headingsAdded, total: changed + added + removed + moved };
}

export interface ChangeGroup {
  id: string;
  /** '' for front matter — localized by the UI. */
  title: string;
  kinds: Array<{ kind: BlockChangeKind; changes: BlockChange[] }>;
  count: number;
}

const KIND_ORDER: BlockChangeKind[] = ['changed', 'added', 'removed', 'moved'];

/** Groups the diff by chapter, then by operation kind, in a stable reading order. */
export function groupProposalChanges(proposal: AiProposal): ChangeGroup[] {
  return proposal.diff.chapters
    .filter((chapter) => chapter.changes.length > 0)
    .map((chapter) => ({
      id: chapter.anchorId,
      title: chapter.title,
      count: chapter.changes.length,
      kinds: KIND_ORDER.flatMap((kind) => {
        const changes = chapter.changes.filter((change) => change.kind === kind);
        return changes.length ? [{ kind, changes }] : [];
      }),
    }));
}

export type FixCandidate =
  | { id: string; source: 'violation'; rule: string; message: string; page: number; violation: ComposeViolation }
  | { id: string; source: 'check'; rule: string; message: string; page?: number; check: PreflightCheck };

/** Document problems the existing structural assistant can propose a fix for (same eligibility as Step 1). */
export function listFixCandidates(
  violations: ComposeViolation[],
  checks: PreflightCheck[],
  renderCheck: (check: PreflightCheck) => string,
): FixCandidate[] {
  const fromViolations: FixCandidate[] = violations
    .filter((violation) => isAiFixEligible(violation.rule))
    .map((violation, index) => ({
      id: `violation:${violation.rule}:${violation.blockId}:${index}`,
      source: 'violation' as const,
      rule: violation.rule,
      message: violation.message,
      page: violation.page,
      violation,
    }));
  const seen = new Set<string>();
  const fromChecks: FixCandidate[] = [];
  checks.forEach((check, index) => {
    if (!isAiFixEligible(check.rule)) return;
    const key = `${check.rule.split('.').slice(1).join('.')}|${check.blockId ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    fromChecks.push({
      id: `check:${check.rule}:${check.blockId ?? index}`,
      source: 'check',
      rule: check.rule,
      message: renderCheck(check),
      page: check.page,
      check,
    });
  });
  return [...fromViolations, ...fromChecks];
}

export function plural(count: number, one: string, many: string): string {
  return (count === 1 ? one : many).replaceAll('{count}', String(count));
}
