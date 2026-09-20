'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Book,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Send,
  Target,
  XCircle,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import type { ComposeViolation } from '@/lib/compose/compose';
import {
  PREFLIGHT_CHANNELS,
  type PreflightChannel,
  type PreflightCheck,
  type PreflightSeverity,
} from '@/lib/preflight/preflight';
import type { AiProposal } from '@/lib/ai/ast-diff-proposal';
import { isAiFixEligible, type AiLocale, type AiProcessingMode } from '@/lib/ai/structural-assistant';
import { acceptAiProposalAction, proposeViolationFixAction, rejectAiProposalAction } from '@/lib/ai/actions';
import { AiProposalCard } from '../../AiProposalCard';

type Copy = AppMessages['project'];
type Area = 'metadata' | 'structure' | 'accessibility';
type SeverityFilter = 'all' | PreflightSeverity;

type FixRequest =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; mode: AiProcessingMode; proposals: AiProposal[] };

function checkArea(rule: string): Area {
  if (rule.includes('.metadata.')) return 'metadata';
  if (rule.includes('.fonts.')) return 'structure';
  return 'accessibility';
}

const CHANNEL_ICONS: Record<PreflightChannel, string> = {
  kdp: 'a',
  ingramspark: 'IS',
  kobo: 'R',
};

export function PreflightWorkspace({
  project,
  copy,
  documentViolations,
  preflightChecks,
  locale = 'es',
  onOpenMetadata,
  onOpenComposition,
  onNavigateStep,
}: {
  project: ProjectRecord;
  copy: Copy;
  documentViolations: ComposeViolation[];
  preflightChecks: PreflightCheck[];
  locale?: AiLocale;
  onOpenMetadata: () => void;
  onOpenComposition: () => void;
  onNavigateStep: (step: number) => void;
}) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<PreflightChannel>('kdp');
  const [activeSeverity, setActiveSeverity] = useState<SeverityFilter>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [fixRequests, setFixRequests] = useState<Record<string, FixRequest>>({});
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
  const [staleProposalIds, setStaleProposalIds] = useState<string[]>([]);

  const areaLabel: Record<Area, string> = {
    metadata: copy.preflightWorkspaceAreaMetadata,
    structure: copy.preflightWorkspaceAreaStructure,
    accessibility: copy.preflightWorkspaceAreaAccessibility,
  };
  const channelLabels: Record<PreflightChannel, string> = {
    kdp: copy.preflightChannelKdp,
    ingramspark: copy.preflightChannelIngramspark,
    kobo: copy.preflightChannelKobo,
  };
  const channelDescriptions: Record<PreflightChannel, string> = {
    kdp: copy.preflightWorkspaceChannelKdpDesc,
    ingramspark: copy.preflightWorkspaceChannelIngramDesc,
    kobo: copy.preflightWorkspaceChannelKoboDesc,
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

  const channelCounts = useMemo(() => {
    const counts: Record<PreflightChannel, number> = { kdp: 0, ingramspark: 0, kobo: 0 };
    for (const check of preflightChecks) counts[check.channel] += 1;
    return counts;
  }, [preflightChecks]);

  const severityCounts = useMemo(() => {
    const counts = { error: 0, warning: 0, info: 0 };
    for (const check of preflightChecks) counts[check.severity] += 1;
    return counts;
  }, [preflightChecks]);

  const readinessPercent = useMemo(() => {
    const channelsWithErrors = new Set(
      preflightChecks.filter((check) => check.severity === 'error').map((check) => check.channel),
    );
    const ready = PREFLIGHT_CHANNELS.length - channelsWithErrors.size;
    return Math.round((ready / PREFLIGHT_CHANNELS.length) * 100);
  }, [preflightChecks]);

  const areaCounts = useMemo(() => {
    const counts: Record<Area, number> = { metadata: 0, structure: 0, accessibility: 0 };
    for (const check of preflightChecks) counts[checkArea(check.rule)] += 1;
    counts.structure += documentViolations.length;
    return counts;
  }, [preflightChecks, documentViolations]);

  const nextAction = useMemo(() => {
    for (const channel of PREFLIGHT_CHANNELS) {
      const check = preflightChecks.find((c) => c.channel === channel && c.severity === 'error');
      if (check) return { channel, check, area: checkArea(check.rule) };
    }
    return null;
  }, [preflightChecks]);

  const channelChecks = preflightChecks.filter((check) => check.channel === activeChannel);
  const filteredChecks =
    activeSeverity === 'all' ? channelChecks : channelChecks.filter((check) => check.severity === activeSeverity);

  const handleProposeFix = (key: string, check: PreflightCheck) => {
    setFixRequests((prev) => ({ ...prev, [key]: { status: 'loading' } }));
    const formData = new FormData();
    formData.set('projectId', project.id);
    formData.set('locale', locale);
    formData.set('payload', JSON.stringify({ check }));
    void proposeViolationFixAction(formData).then((result) => {
      setFixRequests((prev) => ({
        ...prev,
        [key]: result.ok ? { status: 'ready', mode: result.mode, proposals: result.proposals } : { status: 'error' },
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

  const renderFixRequest = (key: string) => {
    const request = fixRequests[key];
    if (!request) return null;
    if (request.status === 'loading') return <p className="mt-2 text-xs text-[var(--text-tertiary)]">{copy.aiProposalLoading}</p>;
    if (request.status === 'error') return <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{copy.aiProposalError}</p>;
    if (request.proposals.length === 0) return <p className="mt-2 text-xs text-[var(--text-secondary)]">{copy.aiNoProposals}</p>;
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

  const severityIcon = (severity: PreflightSeverity) => {
    if (severity === 'error') return <XCircle className="h-4 w-4 text-[var(--danger)]" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />;
    return <Info className="h-4 w-4 text-[var(--text-tertiary)]" />;
  };

  const checklistRows: { area: Area; onOpen?: () => void }[] = [
    { area: 'metadata', onOpen: onOpenMetadata },
    { area: 'structure', onOpen: onOpenComposition },
    { area: 'accessibility' },
  ];

  return (
    <div className="talent-preflight-workspace" data-testid="preflight-workspace">
      {/* CHANNELS COLUMN */}
      <div className="talent-preflight-workspace__channels">
        <section className="ac-surface-panel ac-surface-panel--subtle">
          <p className="ac-surface-panel__eyebrow">{copy.preflightWorkspaceChannelsHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.preflightWorkspaceChannelsSubtitle}</p>

          <div className="talent-preflight-workspace__channel-list">
            {PREFLIGHT_CHANNELS.map((channel) => (
              <button
                type="button"
                key={channel}
                data-testid={`preflight-channel-${channel}`}
                onClick={() => {
                  setActiveChannel(channel);
                  setActiveSeverity('all');
                  setExpandedKey(null);
                }}
                data-active={activeChannel === channel}
                className="talent-preflight-workspace__channel-card"
              >
                <span className="talent-preflight-workspace__channel-icon">{CHANNEL_ICONS[channel]}</span>
                <span className="flex-1">
                  <span className="talent-preflight-workspace__channel-name">{channelLabels[channel]}</span>
                  <span className="talent-preflight-workspace__channel-desc">{channelDescriptions[channel]}</span>
                </span>
                <span
                  className="talent-preflight-workspace__channel-count"
                  data-state={channelCounts[channel] === 0 ? 'ok' : 'warn'}
                >
                  {channelCounts[channel] === 0
                    ? copy.preflightWorkspaceStatusReady
                    : copy.preflightIssueCount.replace('{count}', String(channelCounts[channel]))}
                </span>
              </button>
            ))}

            <a href="#document-health-panel" className="talent-preflight-workspace__channel-card">
              <span className="talent-preflight-workspace__channel-icon">
                <FileText className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="talent-preflight-workspace__channel-name">{copy.preflightWorkspaceGenericChannelLabel}</span>
                <span className="talent-preflight-workspace__channel-desc">{copy.preflightWorkspaceGenericChannelDesc}</span>
              </span>
              <span
                className="talent-preflight-workspace__channel-count"
                data-state={documentViolations.length === 0 ? 'ok' : 'warn'}
              >
                {documentViolations.length === 0
                  ? copy.preflightWorkspaceStatusReady
                  : copy.preflightIssueCount.replace('{count}', String(documentViolations.length))}
              </span>
            </a>
          </div>
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle">
          <p className="ac-surface-panel__eyebrow">{copy.preflightWorkspaceSummaryHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.preflightWorkspaceSummarySubtitle}</p>
          <div className="talent-preflight-workspace__summary-stats">
            <div data-state={severityCounts.error > 0 ? 'error' : 'ok'}>
              <p>{severityCounts.error}</p>
              <span>{copy.preflightWorkspaceStatBlocking}</span>
            </div>
            <div data-state={severityCounts.warning > 0 ? 'warn' : 'ok'}>
              <p>{severityCounts.warning}</p>
              <span>{copy.preflightWorkspaceStatWarnings}</span>
            </div>
            <div data-state="info">
              <p>{severityCounts.info}</p>
              <span>{copy.preflightWorkspaceStatInfo}</span>
            </div>
          </div>
        </section>

        <p className="talent-preflight-workspace__note">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          {copy.preflightWorkspaceInfoNote}
        </p>
      </div>

      {/* INCIDENCES COLUMN */}
      <div className="talent-preflight-workspace__incidences">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="preflight-incidences-panel">
          <div className="ac-surface-panel__meta">
            <div>
              <h3 className="ac-surface-panel__title">
                {copy.preflightWorkspaceIncidencesHeading.replace('{channel}', channelLabels[activeChannel])}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {copy.preflightWorkspaceIncidencesSubtitle.replace('{channel}', channelLabels[activeChannel])}
              </p>
            </div>
          </div>

          <div className="talent-preflight-workspace__filters" role="tablist">
            {(
              [
                ['all', copy.preflightWorkspaceFilterAll, channelChecks.length],
                ['error', copy.preflightWorkspaceFilterErrors, channelChecks.filter((c) => c.severity === 'error').length],
                ['warning', copy.preflightWorkspaceFilterWarnings, channelChecks.filter((c) => c.severity === 'warning').length],
                ['info', copy.preflightWorkspaceFilterInfo, channelChecks.filter((c) => c.severity === 'info').length],
              ] as const
            ).map(([severity, label, count]) => (
              <button
                type="button"
                role="tab"
                key={severity}
                data-testid={`preflight-filter-${severity}`}
                onClick={() => setActiveSeverity(severity)}
                aria-selected={activeSeverity === severity}
                data-active={activeSeverity === severity}
                className="talent-preflight-workspace__filter"
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {filteredChecks.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">{copy.preflightEmpty}</p>
          ) : (
            <ul className="talent-preflight-workspace__incidence-list" data-testid="preflight-incidence-list">
              {filteredChecks.map((check, index) => {
                const key = `${check.channel}-${check.rule}-${check.blockId ?? index}`;
                const expanded = expandedKey === key;
                const area = checkArea(check.rule);
                const eligible = isAiFixEligible(check.rule);
                return (
                  <li key={key} className="talent-preflight-workspace__incidence" data-severity={check.severity}>
                    <button
                      type="button"
                      data-testid={`preflight-incidence-toggle-${key}`}
                      onClick={() => setExpandedKey(expanded ? null : key)}
                      className="talent-preflight-workspace__incidence-header"
                      aria-expanded={expanded}
                    >
                      {severityIcon(check.severity)}
                      <span className="talent-preflight-workspace__incidence-severity">{severityLabels[check.severity]}</span>
                      <span className="talent-preflight-workspace__incidence-rule">{check.rule}</span>
                      <span className="talent-preflight-workspace__incidence-message">{renderCheckMessage(check)}</span>
                      {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    </button>

                    {expanded && (
                      <div className="talent-preflight-workspace__incidence-body">
                        <div className="talent-preflight-workspace__incidence-meta">
                          <div>
                            <p className="talent-preflight-workspace__incidence-meta-label">{copy.preflightWorkspaceAreaLabel}</p>
                            <span className="talent-preflight-workspace__chip">{areaLabel[area]}</span>
                          </div>
                          <div>
                            <p className="talent-preflight-workspace__incidence-meta-label">{copy.preflightWorkspaceImpactLabel}</p>
                            <span
                              className="talent-preflight-workspace__chip"
                              data-tone={check.severity === 'error' ? 'error' : 'neutral'}
                            >
                              {check.severity === 'error'
                                ? copy.preflightWorkspaceImpactBlocking.replace('{channel}', channelLabels[check.channel])
                                : check.severity === 'warning'
                                  ? copy.preflightWorkspaceImpactWarning
                                  : copy.preflightWorkspaceImpactInfo}
                            </span>
                          </div>
                        </div>

                        <div className="talent-preflight-workspace__incidence-actions">
                          {area === 'metadata' && (
                            <button type="button" onClick={onOpenMetadata} className="dashboard-button" data-testid={`preflight-action-metadata-${key}`}>
                              {copy.preflightWorkspaceGoToMetadataAction}
                            </button>
                          )}
                          {area === 'structure' && (
                            <button type="button" onClick={onOpenComposition} className="dashboard-button" data-testid={`preflight-action-composition-${key}`}>
                              {copy.preflightWorkspaceGoToCompositionAction}
                            </button>
                          )}
                          {check.page !== undefined && (
                            <button type="button" onClick={() => onNavigateStep(5)} className="dashboard-button" data-testid={`preflight-action-preview-${key}`}>
                              {copy.preflightWorkspaceViewInPreviewAction}
                            </button>
                          )}
                          {check.blockId && eligible && !fixRequests[key] && (
                            <button
                              type="button"
                              data-testid={`ai-propose-fix-${key}`}
                              onClick={() => handleProposeFix(key, check)}
                              className="dashboard-button"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {copy.aiProposeFix}
                            </button>
                          )}
                        </div>
                        {check.blockId && renderFixRequest(key)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* READINESS COLUMN */}
      <div className="talent-preflight-workspace__readiness">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="preflight-readiness-panel">
          <p className="ac-surface-panel__eyebrow">{copy.preflightWorkspaceReadyHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.preflightWorkspaceReadySubtitle}</p>

          <p className="talent-preflight-workspace__readiness-value">{readinessPercent}%</p>
          <p className="text-xs text-[var(--text-tertiary)]">{copy.preflightWorkspaceReadyLabel}</p>
          <div className="talent-preflight-workspace__readiness-bar">
            <div className="talent-preflight-workspace__readiness-bar-fill" style={{ width: `${readinessPercent}%` }} />
          </div>

          <div className="talent-preflight-workspace__readiness-stats">
            <div data-state={severityCounts.error > 0 ? 'error' : 'ok'}>
              <XCircle className="h-4 w-4" />
              <p>{severityCounts.error}</p>
              <span>{copy.preflightWorkspaceStatBlocking}</span>
            </div>
            <div data-state={severityCounts.warning > 0 ? 'warn' : 'ok'}>
              <AlertTriangle className="h-4 w-4" />
              <p>{severityCounts.warning}</p>
              <span>{copy.preflightWorkspaceStatWarnings}</span>
            </div>
            <div data-state="info">
              <Info className="h-4 w-4" />
              <p>{severityCounts.info}</p>
              <span>{copy.preflightWorkspaceStatInfo}</span>
            </div>
          </div>
        </section>

        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="preflight-checklist-panel">
          <p className="ac-surface-panel__eyebrow">{copy.preflightWorkspaceChecklistHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.preflightWorkspaceChecklistSubtitle}</p>

          <ul className="talent-preflight-workspace__checklist">
            {checklistRows.map(({ area, onOpen }) => {
              const count = areaCounts[area];
              const ok = count === 0;
              return (
                <li key={area}>
                  <button
                    type="button"
                    disabled={!onOpen}
                    onClick={onOpen}
                    data-testid={`preflight-checklist-${area}`}
                    className="talent-preflight-workspace__checklist-row"
                  >
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                    )}
                    <span className="flex-1 text-left">{areaLabel[area]}</span>
                    <span className={ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                      {ok ? copy.preflightWorkspaceChecklistOk : copy.preflightIssueCount.replace('{count}', String(count))}
                    </span>
                    {onOpen && <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="talent-preflight-workspace__next-action" data-testid="preflight-next-action">
          {nextAction ? (
            <>
              <div className="talent-preflight-workspace__next-action-header">
                <Target className="h-5 w-5" />
                <div>
                  <p className="ac-surface-panel__eyebrow">{copy.preflightWorkspaceNextActionHeading}</p>
                  <p className="font-semibold text-[var(--text-primary)]">
                    {nextAction.area === 'metadata'
                      ? copy.preflightWorkspaceNextActionMetadata
                      : nextAction.area === 'structure'
                        ? copy.preflightWorkspaceNextActionStructure
                        : copy.preflightWorkspaceNextActionAccessibility}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {copy.preflightWorkspaceNextActionBody
                  .replace('{area}', areaLabel[nextAction.area])
                  .replace('{channel}', channelLabels[nextAction.channel])}
              </p>
              <button
                type="button"
                data-testid="preflight-next-action-button"
                onClick={() => {
                  if (nextAction.area === 'metadata') onOpenMetadata();
                  else if (nextAction.area === 'structure') onOpenComposition();
                  else {
                    setActiveChannel(nextAction.channel);
                    setActiveSeverity('error');
                    setExpandedKey(null);
                  }
                }}
                className="dashboard-button dashboard-button--primary mt-3 w-full justify-center"
              >
                {nextAction.area === 'metadata'
                  ? copy.preflightWorkspaceNextActionMetadata
                  : nextAction.area === 'structure'
                    ? copy.preflightWorkspaceNextActionStructure
                    : copy.preflightWorkspaceNextActionAccessibility}
              </button>
            </>
          ) : (
            <>
              <div className="talent-preflight-workspace__next-action-header">
                <Book className="h-5 w-5 text-[var(--success)]" />
                <p className="font-semibold text-[var(--text-primary)]">{copy.preflightWorkspaceNextActionEmptyTitle}</p>
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{copy.preflightWorkspaceNextActionEmptyBody}</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
