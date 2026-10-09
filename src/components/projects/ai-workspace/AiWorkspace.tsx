'use client';

/**
 * Step 7 — Asistente IA. A governed editorial AI workspace, not a chatbot:
 *   task → AiProposal (BlockOperation[] over the AST) → human review → accept / reject → server-side application → audit.
 *
 * It only calls the existing server actions (proposeCoAuthorAction, analyzeCoherenceAction,
 * proposeViolationFixAction, acceptAiProposalAction, rejectAiProposalAction). Nothing here applies a proposal
 * without an explicit click, and nothing simulates an AI answer: without a provider the cloud tasks are off.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import {
  acceptAiProposalAction,
  analyzeCoherenceAction,
  proposeCoAuthorAction,
  proposeViolationFixAction,
  rejectAiProposalAction,
} from '@/lib/ai/actions';
import type { AiProposal } from '@/lib/ai/ast-diff-proposal';
import type { CoAuthorChapterStats } from '@/lib/ai/co-author';
import type { CoherenceIssue } from '@/lib/ai/coherence-agent';
import type { AiLocale, AiProcessingMode } from '@/lib/ai/structural-assistant';
import { listFixCandidates, toolDefinition, type AiTool, type FixCandidate } from '@/lib/ai/workspace-model';
import type { ComposeViolation } from '@/lib/compose/compose';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import type { AppMessages } from '@/lib/i18n/messages';
import { AiProposalReview } from './AiProposalReview';
import { ActionsPanel, TargetPanel, TOOL_ICONS, toolDescription, toolLabel, type AiHistoryEntry } from './SidePanels';

type Copy = AppMessages['project'];

export interface AiWorkspaceProps {
  projectId: string;
  projectTitle: string;
  language: string;
  copy: Copy;
  locale: AiLocale;
  chapters: CoAuthorChapterStats[];
  totalWords: number;
  totalBlocks: number;
  cloudAvailable: boolean;
  /** False for fixed-layout PDF projects: there is no AST the AI could propose over. */
  editable: boolean;
  history: AiHistoryEntry[];
  voice: { active: boolean; name?: string };
  violations: ComposeViolation[];
  checks: PreflightCheck[];
}

type Run =
  | { status: 'idle' }
  | { status: 'loading'; tool: AiTool; targetLabel: string }
  | { status: 'error'; tool: AiTool }
  | { status: 'empty'; tool: AiTool }
  | { status: 'ready'; tool: AiTool; mode: AiProcessingMode; targetLabel: string; proposals: AiProposal[]; issues: CoherenceIssue[] };

type Decision = 'applied' | 'rejected' | 'stale' | 'discarded';
type FixRun = { status: 'loading' } | { status: 'error' } | { status: 'empty' } | { status: 'ready'; mode: AiProcessingMode; proposals: AiProposal[] };

function issueText(issue: CoherenceIssue, copy: Copy): string {
  if (issue.type === 'broken-ref') return copy.aiIssueBrokenRef.replace('{target}', issue.targetId ?? '');
  if (issue.type === 'duplicate-heading') return copy.aiIssueDuplicateHeading.replace('{text}', issue.headingText ?? '');
  return copy.aiIssueMissingChapterHeading;
}

export function AiWorkspace(props: AiWorkspaceProps) {
  const { copy, locale, chapters, cloudAvailable, editable } = props;
  const router = useRouter();
  const [, startRefresh] = useTransition();

  const [tool, setTool] = useState<AiTool | null>(null);
  const [targetKey, setTargetKey] = useState(chapters[0]?.key ?? '');
  const [run, setRun] = useState<Run>({ status: 'idle' });
  const [fixRuns, setFixRuns] = useState<Record<string, FixRun>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);

  const definition = tool ? toolDefinition(tool) : null;
  const chapterScoped = definition?.chapterScoped ?? true;
  const busy = run.status === 'loading' || applyingId !== null || Object.values(fixRuns).some((item) => item.status === 'loading');
  const targetChapter = chapters.find((chapter) => chapter.key === targetKey) ?? null;
  const targetLabel = !definition || !definition.chapterScoped ? copy.aiWsWholeDocument : targetChapter?.title ?? copy.aiWsWholeDocument;

  const candidates = useMemo(
    () => listFixCandidates(props.violations, props.checks, (check) => copy.preflightRules[check.rule]?.replace(/\{(\w+)\}/g, (_m, key: string) => check.params[key] ?? '') ?? check.rule),
    [copy.preflightRules, props.checks, props.violations],
  );

  const selectTool = (next: AiTool) => {
    setTool(next);
    setRun({ status: 'idle' });
    setDecisions({});
    setActionError(false);
    setSideOpen(false);
  };

  const runTool = async (selected: AiTool) => {
    const label = toolDefinition(selected).chapterScoped ? targetChapter?.title ?? '' : copy.aiWsWholeDocument;
    setDecisions({});
    setActionError(false);
    setRun({ status: 'loading', tool: selected, targetLabel: label });
    const formData = new FormData();
    formData.set('projectId', props.projectId);
    formData.set('locale', locale);
    try {
      if (selected === 'coherence') {
        const result = await analyzeCoherenceAction(formData);
        if (!result.ok) setRun({ status: 'error', tool: selected });
        else setRun({ status: 'ready', tool: selected, mode: result.mode, targetLabel: label, proposals: result.proposals, issues: result.issues });
        return;
      }
      formData.set('operation', selected);
      if (toolDefinition(selected).chapterScoped) formData.set('chapterKey', targetKey);
      const result = await proposeCoAuthorAction(formData);
      if (!result.ok || !result.available) setRun({ status: 'error', tool: selected });
      else if (!result.proposal) setRun({ status: 'empty', tool: selected });
      else setRun({ status: 'ready', tool: selected, mode: result.mode, targetLabel: label, proposals: [result.proposal], issues: [] });
    } catch {
      setRun({ status: 'error', tool: selected });
    }
  };

  const requestFix = async (candidate: FixCandidate) => {
    setFixRuns((current) => ({ ...current, [candidate.id]: { status: 'loading' } }));
    const formData = new FormData();
    formData.set('projectId', props.projectId);
    formData.set('locale', locale);
    formData.set('payload', JSON.stringify(candidate.source === 'violation' ? { violation: candidate.violation } : { check: candidate.check }));
    try {
      const result = await proposeViolationFixAction(formData);
      setFixRuns((current) => ({
        ...current,
        [candidate.id]: !result.ok ? { status: 'error' } : result.proposals.length === 0 ? { status: 'empty' } : { status: 'ready', mode: result.mode, proposals: result.proposals },
      }));
    } catch {
      setFixRuns((current) => ({ ...current, [candidate.id]: { status: 'error' } }));
    }
  };

  const accept = async (proposal: AiProposal, mode: AiProcessingMode) => {
    setApplyingId(proposal.id);
    setActionError(false);
    const formData = new FormData();
    formData.set('projectId', props.projectId);
    formData.set('proposal', JSON.stringify(proposal));
    formData.set('mode', mode);
    try {
      const result = await acceptAiProposalAction(formData);
      if (result.ok) {
        setDecisions((current) => ({ ...current, [proposal.id]: 'applied' }));
        startRefresh(() => router.refresh());
      } else if (result.error === 'stale') {
        setDecisions((current) => ({ ...current, [proposal.id]: 'stale' }));
      } else {
        setActionError(true);
      }
    } catch {
      setActionError(true);
    } finally {
      setApplyingId(null);
    }
  };

  const reject = (proposal: AiProposal) => {
    const formData = new FormData();
    formData.set('projectId', props.projectId);
    formData.set('proposalId', proposal.id);
    void rejectAiProposalAction(formData);
    setDecisions((current) => ({ ...current, [proposal.id]: 'rejected' }));
  };

  const discard = (proposal: AiProposal) => setDecisions((current) => ({ ...current, [proposal.id]: 'discarded' }));

  const renderProposal = (proposal: AiProposal, mode: AiProcessingMode, label: string, regenerate: () => void) => {
    const decision = decisions[proposal.id];
    if (decision === 'discarded') return null;
    if (decision === 'applied') {
      return (
        <p key={proposal.id} className="aw-note aw-note--ok" role="status" data-testid="ai-proposal-applied">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {copy.aiWsApplied} <span className="aw-hint">{proposal.summary}</span>
        </p>
      );
    }
    if (decision === 'rejected') {
      return (<p key={proposal.id} className="aw-note" role="status" data-testid="ai-proposal-rejected">{copy.aiWsRejected}</p>);
    }
    return (
      <AiProposalReview
        key={proposal.id}
        proposal={proposal}
        mode={mode}
        copy={copy}
        pending={applyingId === proposal.id}
        stale={decision === 'stale'}
        targetLabel={label}
        onAccept={() => void accept(proposal, mode)}
        onReject={() => reject(proposal)}
        onRegenerate={regenerate}
        onDiscard={() => discard(proposal)}
      />
    );
  };

  const liveMessage = run.status === 'loading' ? copy.aiWsLiveLoading : run.status === 'ready' ? copy.aiWsLiveReady : '';
  const Icon = tool ? TOOL_ICONS[tool] : null;

  return (
    <div className="aw" data-testid="ai-workspace" data-tool={tool ?? 'none'} data-run={run.status} data-cloud={cloudAvailable ? 'true' : 'false'}>
      <header className="aw-header">
        <div className="aw-header__title">
          <h2>{copy.aiWsTitle}</h2>
          <p className="aw-tagline" data-testid="ai-tagline"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {copy.aiWsTagline}</p>
        </div>
        <button type="button" className="aw-button aw-header__toggle" data-testid="ai-targets-toggle" aria-expanded={targetsOpen} onClick={() => setTargetsOpen((value) => !value)}>
          {copy.aiWsTargetsToggle}
        </button>
        <button type="button" className="aw-button aw-header__toggle" data-testid="ai-side-toggle" aria-expanded={sideOpen} onClick={() => setSideOpen((value) => !value)}>
          {copy.aiWsContextToggle}
        </button>
      </header>

      <div className="aw-grid">
        <aside className="aw-col aw-col--targets" data-open={targetsOpen} aria-label={copy.aiWsTargetsTitle}>
          <TargetPanel
            copy={copy}
            title={props.projectTitle}
            totalWords={props.totalWords}
            chapters={chapters}
            targetKey={targetKey}
            onTargetChange={(key) => { setTargetKey(key); setTargetsOpen(false); }}
            chapterTargetsActive={chapterScoped}
            busy={busy}
          />
        </aside>

        <main className="aw-col aw-col--main" aria-busy={run.status === 'loading'} data-testid="ai-main">
          <div className="aw-live" role="status" aria-live="polite" data-testid="ai-live">{liveMessage}</div>

          {!editable ? (
            <div className="aw-banner" data-testid="ai-fixed-pdf">
              <strong>{copy.aiWsFixedPdfTitle}</strong>
              <p>{copy.aiWsFixedPdfBody}</p>
              <p className="aw-hint">{copy.aiWsNeedsEditable}</p>
            </div>
          ) : !cloudAvailable ? (
            <div className="aw-banner" data-testid="ai-unavailable" role="note">
              <strong>{copy.aiWsUnavailableTitle}</strong>
              <p>{copy.aiWsUnavailableBody}</p>
            </div>
          ) : null}

          {tool && definition && Icon ? (
            <section className="aw-task" data-testid="ai-task">
              <header className="aw-task__header">
                <Icon className="h-5 w-5" aria-hidden="true" />
                <div>
                  <h3>{toolLabel(copy, tool)}</h3>
                  <p className="aw-hint">{toolDescription(copy, tool)}</p>
                </div>
              </header>
              {tool !== 'fixes' ? (
                <div className="aw-task__controls">
                  {definition.chapterScoped ? (
                    <label className="aw-field">
                      <span>{copy.aiWsApplyTo}</span>
                      <select
                        data-testid="co-author-chapter-select"
                        className="aw-select"
                        value={targetKey}
                        disabled={busy}
                        onChange={(event) => setTargetKey(event.target.value)}
                      >
                        {chapters.map((chapter) => (<option key={chapter.key} value={chapter.key}>{chapter.title}</option>))}
                      </select>
                    </label>
                  ) : (
                    <p className="aw-field aw-field--static"><span>{copy.aiWsApplyTo}</span><strong>{copy.aiWsWholeDocument}</strong></p>
                  )}
                  <button
                    type="button"
                    className="aw-button aw-button--primary"
                    data-testid="ai-run"
                    disabled={busy || (definition.chapterScoped && !targetKey)}
                    onClick={() => void runTool(tool)}
                  >
                    {run.status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {run.status === 'loading' ? copy.aiWsRunning : copy.aiWsRun}
                  </button>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="aw-idle" data-testid="ai-idle">
              <h3>{copy.aiWsIdleTitle}</h3>
              <p className="aw-hint">{copy.aiWsIdleBody}</p>
              <ul className="aw-cards" aria-label={copy.aiWsCapabilitiesTitle}>
                {(['style', 'architecture', 'summary', 'coherence'] as const).map((id) => {
                  const CardIcon = TOOL_ICONS[id];
                  return (
                    <li key={id} className="aw-card">
                      <CardIcon className="h-4 w-4" aria-hidden="true" />
                      <strong>{toolLabel(copy, id)}</strong>
                      <span>{toolDescription(copy, id)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="aw-hint">{copy.aiWsAuditNote}</p>
            </section>
          )}

          {run.status === 'loading' ? (
            <div className="aw-running" data-testid="ai-running">
              <div className="aw-progress" role="progressbar" aria-label={copy.aiWsRunning} aria-busy="true" />
              <strong>{copy.aiWsRunning}</strong>
              <span>{copy.aiWsRunningTarget.replace('{target}', run.targetLabel || copy.aiWsWholeDocument)}</span>
              <span className="aw-hint">{run.tool === 'coherence' ? copy.aiWsRunningLocal : copy.aiWsRunningCloud}</span>
            </div>
          ) : null}

          {run.status === 'error' ? (
            <p role="alert" data-testid="ai-error" className="aw-note aw-note--error">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {copy.aiWsErrorTitle}
              <button type="button" className="aw-link" data-testid="ai-retry" onClick={() => void runTool(run.tool)}>{copy.aiWsRetry}</button>
            </p>
          ) : null}
          {run.status === 'empty' ? (<p data-testid="co-author-empty" className="aw-note">{copy.aiWsEmpty}</p>) : null}
          {actionError ? (<p role="alert" data-testid="ai-action-error" className="aw-note aw-note--error">{copy.aiProposalError}</p>) : null}

          {run.status === 'ready' && run.tool === 'coherence' ? (
            <section className="aw-results" data-testid="ai-coherence">
              <h3 className="aw-subtitle">{copy.aiWsIssuesTitle}</h3>
              {run.issues.length === 0 ? (
                <p className="aw-note aw-note--ok" data-testid="ai-coherence-empty">{copy.aiWsIssuesNone}</p>
              ) : (
                <ul className="aw-issues" data-testid="ai-coherence-issues">
                  {run.issues.map((issue, index) => (
                    <li key={`${issue.type}-${issue.blockId}-${index}`} className="aw-issue">
                      <span className="aw-badge aw-badge--warn">{copy.aiWsIssueWarning}</span>
                      <span>{issueText(issue, copy)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {run.proposals.length > 0 ? <h3 className="aw-subtitle">{copy.aiWsIssueProposalsTitle}</h3> : null}
              {run.proposals.map((proposal) => renderProposal(proposal, run.mode, copy.aiWsWholeDocument, () => void runTool('coherence')))}
            </section>
          ) : null}

          {run.status === 'ready' && run.tool !== 'coherence'
            ? run.proposals.map((proposal) => renderProposal(proposal, run.mode, run.targetLabel, () => void runTool(run.tool)))
            : null}

          {tool === 'fixes' ? (
            <section className="aw-results" data-testid="ai-fixes">
              <h3 className="aw-subtitle">{copy.aiWsFixesTitle}</h3>
              {candidates.length === 0 ? (
                <p className="aw-note" data-testid="ai-fixes-empty">{copy.aiWsFixesEmpty}</p>
              ) : (
                <ul className="aw-issues">
                  {candidates.map((candidate) => {
                    const fixRun = fixRuns[candidate.id];
                    return (
                      <li key={candidate.id} className="aw-issue aw-issue--block" data-testid="ai-fix-candidate">
                        <div className="aw-issue__row">
                          <span className="aw-badge aw-badge--warn">{copy.aiWsIssueWarning}</span>
                          <span>{candidate.message}</span>
                          <button
                            type="button"
                            className="aw-button"
                            data-testid="ai-fix-propose"
                            disabled={busy || fixRun?.status === 'loading'}
                            onClick={() => void requestFix(candidate)}
                          >
                            {fixRun?.status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {copy.aiWsProposeFix}
                          </button>
                        </div>
                        {fixRun?.status === 'error' ? (<p role="alert" className="aw-note aw-note--error">{copy.aiWsErrorTitle}</p>) : null}
                        {fixRun?.status === 'empty' ? (<p className="aw-note">{copy.aiWsNoFixProposal}</p>) : null}
                        {fixRun?.status === 'ready'
                          ? fixRun.proposals.map((proposal) => renderProposal(proposal, fixRun.mode, copy.aiWsWholeDocument, () => void requestFix(candidate)))
                          : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </main>

        <aside className="aw-col aw-col--side" data-open={sideOpen} aria-label={copy.aiWsActionsTitle}>
          <ActionsPanel
            copy={copy}
            locale={locale}
            tool={tool}
            onSelectTool={selectTool}
            cloudAvailable={cloudAvailable}
            editable={editable}
            busy={busy}
            history={props.history}
            context={{
              project: props.projectTitle,
              target: targetLabel,
              words: props.totalWords,
              blocks: props.totalBlocks,
              chapters: chapters.length,
              language: props.language,
              voice: props.voice,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
