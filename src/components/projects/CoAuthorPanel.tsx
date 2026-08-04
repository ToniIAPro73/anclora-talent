'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppMessages } from '@/lib/i18n/messages';
import type { AiProposal } from '@/lib/ai/ast-diff-proposal';
import type { CoAuthorChapter, CoAuthorOperation } from '@/lib/ai/co-author';
import type { AiLocale, AiProcessingMode } from '@/lib/ai/structural-assistant';
import {
  acceptAiProposalAction,
  proposeCoAuthorAction,
  rejectAiProposalAction,
} from '@/lib/ai/actions';
import { AiProposalCard } from './AiProposalCard';

type Copy = AppMessages['project'];

interface CoAuthorPanelProps {
  projectId: string;
  /** Chapters of the document AST (level-1 slices), computed server-side. */
  chapters: CoAuthorChapter[];
  /** Without a cloud provider the whole panel stays hidden (LLM-obligatory). */
  cloudAvailable: boolean;
  copy: Copy;
  locale?: AiLocale;
}

type CoAuthorRequest =
  | { status: 'loading'; operation: CoAuthorOperation }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; mode: AiProcessingMode; proposal: AiProposal };

/**
 * Co-author panel (F3, Capa 2): pick a chapter, run one of the three
 * LLM operations (style rewrite / content architecture / derived summary)
 * and decide over the proposal with the shared AiProposalCard — the human
 * always accepts or rejects; the AI never writes directly. Ethical copy:
 * "editorial assistant, not a ghostwriter". Hidden without a cloud provider.
 */
export function CoAuthorPanel({ projectId, chapters, cloudAvailable, copy, locale = 'es' }: CoAuthorPanelProps) {
  const router = useRouter();
  const [chapterKey, setChapterKey] = useState(chapters[0]?.key ?? '');
  const [request, setRequest] = useState<CoAuthorRequest | null>(null);
  const [pending, setPending] = useState(false);
  const [stale, setStale] = useState(false);

  if (!cloudAvailable) return null;

  const handlePropose = (operation: CoAuthorOperation) => {
    setStale(false);
    setRequest({ status: 'loading', operation });
    const formData = new FormData();
    formData.set('projectId', projectId);
    formData.set('operation', operation);
    formData.set('chapterKey', chapterKey);
    formData.set('locale', locale);
    void proposeCoAuthorAction(formData).then((result) => {
      if (!result.ok) {
        setRequest({ status: 'error' });
      } else if (!result.proposal) {
        setRequest({ status: 'empty' });
      } else {
        setRequest({ status: 'ready', mode: result.mode, proposal: result.proposal });
      }
    });
  };

  const handleAccept = (proposal: AiProposal, mode: AiProcessingMode) => {
    setPending(true);
    const formData = new FormData();
    formData.set('projectId', projectId);
    formData.set('proposal', JSON.stringify(proposal));
    formData.set('mode', mode);
    void acceptAiProposalAction(formData).then((result) => {
      setPending(false);
      if (result.ok) {
        setRequest(null);
        router.refresh();
      } else if (result.error === 'stale') {
        setStale(true);
      }
    });
  };

  const handleReject = (proposal: AiProposal) => {
    const formData = new FormData();
    formData.set('projectId', projectId);
    formData.set('proposalId', proposal.id);
    void rejectAiProposalAction(formData);
    setRequest(null);
  };

  const loading = request?.status === 'loading';

  return (
    <section
      data-testid="co-author-panel"
      className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
        {copy.aiCoAuthorEyebrow}
      </p>
      <p className="mt-2 text-xs italic text-[var(--text-tertiary)]">{copy.aiCoAuthorEthicalCopy}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          {copy.aiCoAuthorChapterLabel}
          <select
            data-testid="co-author-chapter-select"
            value={chapterKey}
            onChange={(event) => setChapterKey(event.target.value)}
            className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {chapters.map((chapter) => (
              <option key={chapter.key} value={chapter.key}>
                {chapter.title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="co-author-action-style"
            onClick={() => handlePropose('style')}
            disabled={loading || !chapterKey}
            className="ac-button ac-button--secondary ac-button--sm"
          >
            {copy.aiCoAuthorStyleAction}
          </button>
          <button
            type="button"
            data-testid="co-author-action-architecture"
            onClick={() => handlePropose('architecture')}
            disabled={loading || !chapterKey}
            className="ac-button ac-button--secondary ac-button--sm"
          >
            {copy.aiCoAuthorArchitectureAction}
          </button>
          <button
            type="button"
            data-testid="co-author-action-summary"
            onClick={() => handlePropose('summary')}
            disabled={loading}
            className="ac-button ac-button--secondary ac-button--sm"
          >
            {copy.aiCoAuthorSummaryAction}
          </button>
        </div>
      </div>

      {loading && <p className="mt-3 text-xs text-[var(--text-tertiary)]">{copy.aiProposalLoading}</p>}
      {request?.status === 'error' && (
        <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
          {copy.aiProposalError}
        </p>
      )}
      {request?.status === 'empty' && (
        <p data-testid="co-author-empty" className="mt-3 text-xs text-[var(--text-secondary)]">
          {copy.aiCoAuthorNoProposal}
        </p>
      )}
      {request?.status === 'ready' && (
        <AiProposalCard
          proposal={request.proposal}
          mode={request.mode}
          copy={copy}
          pending={pending}
          stale={stale}
          onAccept={() => handleAccept(request.proposal, request.mode)}
          onReject={() => handleReject(request.proposal)}
        />
      )}
    </section>
  );
}
