'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import type { AiProposal } from '@/lib/ai/ast-diff-proposal';
import type { CoherenceIssue } from '@/lib/ai/coherence-agent';
import { countProvenance } from '@/lib/ai/provenance';
import { isAiFixEligible, type AiLocale, type AiProcessingMode } from '@/lib/ai/structural-assistant';
import {
  acceptAiProposalAction,
  analyzeCoherenceAction,
  proposeViolationFixAction,
  rejectAiProposalAction,
} from '@/lib/ai/actions';
import { AiProposalCard } from './AiProposalCard';

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
  /** F3: UI locale for the AI assistant (proposal summaries). Default 'es'. */
  locale?: AiLocale;
}

type FixRequest =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; mode: AiProcessingMode; proposals: AiProposal[] };

type CoherenceRequest =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; mode: AiProcessingMode; issues: CoherenceIssue[]; proposals: AiProposal[] };

/**
 * "Salud del documento" panel (C4): lists composition violations in near
 * real time with the affected page, plus an always-visible counter whose
 * goal is zero. Each item links to the preview.
 *
 * F1: the channel pre-flight section (KDP / IngramSpark / Kobo) groups the
 * pure `src/lib/preflight` checks under per-channel chips; checks anchored
 * to a composed page link to the preview like violations do.
 *
 * F3: the governed-AI section. Eligible violations/checks offer a
 * "Proponer fix" button that returns proposals as readable AST diffs with
 * accept/reject (the AI never writes directly); the coherence agent scans
 * live refs/TOC on demand. Cloud processing is always declared (mode badge)
 * and accepted blocks are stamped in the provenance summary.
 */
export function DocumentHealthPanel({ project, violations, copy, checks, diff, recomposedFromPage, telemetry, revert, locale = 'es' }: DocumentHealthPanelProps) {
  const count = violations.length;
  const signed = (value: number) => (value > 0 ? `+${value}` : String(value));
  const [preflightChannel, setPreflightChannel] = useState<PreflightChannel>('kdp');
  const router = useRouter();
  const [fixRequests, setFixRequests] = useState<Record<string, FixRequest>>({});
  const [coherence, setCoherence] = useState<CoherenceRequest | null>(null);
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
  const [staleProposalIds, setStaleProposalIds] = useState<string[]>([]);
  const provenanceCounts = countProvenance(project.document.provenance);

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

  // --- F3: governed AI (proposals as accept/rejectable AST diffs) ---
  const handleProposeFix = (key: string, payload: { violation?: ComposeViolation; check?: PreflightCheck }) => {
    setFixRequests((prev) => ({ ...prev, [key]: { status: 'loading' } }));
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('locale', locale);
    formData.set('payload', JSON.stringify(payload));
    void proposeViolationFixAction(formData).then((result) => {
      setFixRequests((prev) => ({
        ...prev,
        [key]: result.ok
          ? { status: 'ready', mode: result.mode, proposals: result.proposals }
          : { status: 'error' },
      }));
    });
  };

  const dismissFixRequest = (key: string) => {
    setFixRequests((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAcceptProposal = (proposal: AiProposal, onDone: () => void) => {
    setPendingProposalId(proposal.id);
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('proposal', JSON.stringify(proposal));
    void acceptAiProposalAction(formData).then((result) => {
      setPendingProposalId(null);
      if (result.ok) {
        onDone();
        router.refresh();
      } else if (result.error === 'stale') {
        setStaleProposalIds((prev) => [...prev, proposal.id]);
      }
    });
  };

  const handleRejectProposal = (proposal: AiProposal, onDone: () => void) => {
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('proposalId', proposal.id);
    void rejectAiProposalAction(formData);
    onDone();
  };

  const handleAnalyzeCoherence = () => {
    setCoherence({ status: 'loading' });
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('locale', locale);
    void analyzeCoherenceAction(formData).then((result) => {
      setCoherence(
        result.ok
          ? { status: 'ready', mode: result.mode, issues: result.issues, proposals: result.proposals }
          : { status: 'error' },
      );
    });
  };

  const renderIssueText = (issue: CoherenceIssue): string => {
    if (issue.type === 'broken-ref') return copy.aiIssueBrokenRef.replace('{target}', issue.targetId ?? '');
    if (issue.type === 'duplicate-heading') return copy.aiIssueDuplicateHeading.replace('{text}', issue.headingText ?? '');
    return copy.aiIssueMissingChapterHeading;
  };

  const renderFixRequest = (key: string) => {
    const request = fixRequests[key];
    if (!request) return null;
    if (request.status === 'loading') {
      return <p className="mt-2 text-xs text-[var(--text-tertiary)]">{copy.aiProposalLoading}</p>;
    }
    if (request.status === 'error') {
      return <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{copy.aiProposalError}</p>;
    }
    if (request.proposals.length === 0) {
      return <p className="mt-2 text-xs text-[var(--text-secondary)]">{copy.aiNoProposals}</p>;
    }
    return request.proposals.map((proposal) => (
      <AiProposalCard
        key={proposal.id}
        proposal={proposal}
        mode={request.mode}
        copy={copy}
        pending={pendingProposalId === proposal.id}
        stale={staleProposalIds.includes(proposal.id)}
        onAccept={() => handleAcceptProposal(proposal, () => dismissFixRequest(key))}
        onReject={() => handleRejectProposal(proposal, () => dismissFixRequest(key))}
      />
    ));
  };

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
            data-testid="document-health-revert-button"
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
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                    {violation.rule}
                  </span>
                  <p className="text-sm text-[var(--text-primary)]">{violation.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {isAiFixEligible(violation.rule) && !fixRequests[`v-${violation.blockId}-${index}`] && (
                    <button
                      type="button"
                      data-testid={`ai-propose-fix-v-${index}`}
                      onClick={() =>
                        handleProposeFix(`v-${violation.blockId}-${index}`, { violation })
                      }
                      className="text-sm font-semibold text-[var(--accent)] hover:underline"
                    >
                      {copy.aiProposeFix}
                    </button>
                  )}
                  <Link
                    href={`/projects/${project.id}/preview`}
                    className="text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    {copy.healthViolationPage.replace('{page}', String(violation.page + 1))}
                  </Link>
                </div>
              </div>
              {renderFixRequest(`v-${violation.blockId}-${index}`)}
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
                  className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-4">
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
                    <div className="flex shrink-0 items-center gap-3">
                      {check.blockId && isAiFixEligible(check.rule) && !fixRequests[`c-${check.rule}-${check.blockId}`] && (
                        <button
                          type="button"
                          data-testid={`ai-propose-fix-c-${index}`}
                          onClick={() =>
                            handleProposeFix(`c-${check.rule}-${check.blockId}`, { check })
                          }
                          className="text-sm font-semibold text-[var(--accent)] hover:underline"
                        >
                          {copy.aiProposeFix}
                        </button>
                      )}
                      {check.page !== undefined && (
                        <Link
                          href={`/projects/${project.id}/preview`}
                          className="text-sm font-semibold text-[var(--accent)] hover:underline"
                        >
                          {copy.healthViolationPage.replace('{page}', String(check.page + 1))}
                        </Link>
                      )}
                    </div>
                  </div>
                  {check.blockId && renderFixRequest(`c-${check.rule}-${check.blockId}`)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        data-testid="ai-assistant-section"
        className="mt-6 border-t border-[var(--border-subtle)] pt-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          {copy.aiAssistantEyebrow}
        </p>
        <p className="mt-2 text-xs italic text-[var(--text-tertiary)]">{copy.aiEthicalCopy}</p>
        <div className="mt-3">
          <button
            type="button"
            data-testid="ai-coherence-button"
            onClick={handleAnalyzeCoherence}
            disabled={coherence?.status === 'loading'}
            className="ac-button ac-button--secondary ac-button--sm"
          >
            {coherence?.status === 'loading' ? copy.aiCoherenceLoading : copy.aiCoherenceButton}
          </button>
        </div>
        {coherence?.status === 'error' && (
          <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
            {copy.aiProposalError}
          </p>
        )}
        {coherence?.status === 'ready' && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.aiCoherenceTitle}</p>
            {coherence.issues.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.aiCoherenceEmpty}</p>
            ) : (
              <>
                <ul className="mt-2 space-y-1" data-testid="ai-coherence-issues">
                  {coherence.issues.map((issue, index) => (
                    <li key={`${issue.type}-${issue.blockId}-${issue.targetId ?? index}`} className="text-sm text-[var(--text-primary)]">
                      {renderIssueText(issue)}
                    </li>
                  ))}
                </ul>
                {coherence.proposals.map((proposal) => (
                  <AiProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    mode={coherence.mode}
                    copy={copy}
                    pending={pendingProposalId === proposal.id}
                    stale={staleProposalIds.includes(proposal.id)}
                    onAccept={() =>
                      handleAcceptProposal(proposal, () =>
                        setCoherence((prev) =>
                          prev?.status === 'ready'
                            ? { ...prev, proposals: prev.proposals.filter((item) => item.id !== proposal.id) }
                            : prev,
                        ),
                      )
                    }
                    onReject={() =>
                      handleRejectProposal(proposal, () =>
                        setCoherence((prev) =>
                          prev?.status === 'ready'
                            ? { ...prev, proposals: prev.proposals.filter((item) => item.id !== proposal.id) }
                            : prev,
                        ),
                      )
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {provenanceCounts.ai + provenanceCounts.human > 0 && (
        <p
          data-testid="ai-provenance-summary"
          className="mt-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]"
        >
          <span className="font-semibold uppercase tracking-wide">{copy.aiProvenanceTitle}:</span>
          {copy.aiProvenanceSummary
            .replace('{ai}', String(provenanceCounts.ai))
            .replace('{human}', String(provenanceCounts.human))}
          {provenanceCounts.ai > 0 && (
            <span
              data-testid="ai-provenance-badge"
              className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            >
              IA
            </span>
          )}
        </p>
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
