'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { ProcessingMode, TalentJobStatus } from '@/lib/filestudio/client';
import type { ProjectFileStudioJob } from '@/lib/filestudio/emission';
import { optimizeCoverAction, syncFileStudioJobsAction } from '@/lib/filestudio/actions';
import { ProcessingModeBadge } from './ProcessingModeBadge';

type Copy = AppMessages['filestudio'];

interface DerivativeJob {
  id: string;
  width: number | null;
  mode: ProcessingMode;
  status: string;
  resultAssetUrl: string | null;
}

interface ConsentPrompt {
  operation: string;
  mode: ProcessingMode;
}

/** Time without a webhook before the polling fallback kicks in (api-flow.md). */
const FALLBACK_FIRST_SYNC_MS = 120_000;
const FALLBACK_INTERVAL_MS = 15_000;

function isActive(status: string): boolean {
  return status === 'queued' || status === 'processing';
}

/**
 * Cover optimization panel (F1b prototype): emits the 3-resolution
 * `image:resize` job set, asks for ask-always consent when Mode 1 requires
 * it, shows the REAL processing mode of every job (routing-policy.md) and
 * lists the generated derivatives. Rendered only when the feature flag and
 * the database are enabled (the page gates that).
 */
export function CoverOptimizePanel({
  copy,
  projectId,
  hasCover,
  initialJobs,
}: {
  copy: Copy;
  projectId: string;
  hasCover: boolean;
  initialJobs: ProjectFileStudioJob[];
}) {
  const [jobs, setJobs] = useState<DerivativeJob[]>(
    initialJobs.map((job) => ({
      id: job.id,
      width: job.width,
      mode: job.mode,
      status: job.status,
      resultAssetUrl: job.resultAssetUrl,
    })),
  );
  const [working, setWorking] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [consentPrompt, setConsentPrompt] = useState<ConsentPrompt | null>(null);

  const hasActiveJobs = jobs.some((job) => isActive(job.status));

  // Polling fallback: if no webhook arrived after 2 minutes, reconcile with
  // FileStudio directly and keep polling while jobs stay active.
  useEffect(() => {
    if (!hasActiveJobs) return;
    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const runSync = async () => {
      const result = await syncFileStudioJobsAction({ projectId });
      if (stopped || !result.ok) return;
      setJobs((previous) =>
        previous.map((job) => {
          const synced = result.synced.find((entry) => entry.id === job.id);
          return synced
            ? { ...job, status: synced.status, resultAssetUrl: synced.resultAssetUrl }
            : job;
        }),
      );
    };

    const timeoutId = setTimeout(() => {
      void runSync();
      intervalId = setInterval(() => void runSync(), FALLBACK_INTERVAL_MS);
    }, FALLBACK_FIRST_SYNC_MS);

    return () => {
      stopped = true;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [hasActiveJobs, projectId]);

  async function emit(consent?: 'granted' | 'denied') {
    setWorking(true);
    setErrorText(null);
    setSuccessText(null);
    try {
      const result = await optimizeCoverAction({ projectId, consent });
      if (!result.ok && 'requiresConsent' in result) {
        setConsentPrompt({ operation: result.operation, mode: result.mode });
        return;
      }
      if (!result.ok) {
        const key = result.error as keyof Copy['errors'];
        setErrorText(copy.errors[key] ?? copy.errors.unavailable);
        if (result.jobs?.length) {
          mergeEmitted(result.jobs, null);
        }
        return;
      }
      mergeEmitted(result.jobs, result.mode);
      setSuccessText(copy.optimizeSuccess);
    } catch {
      setErrorText(copy.errors.unavailable);
    } finally {
      setWorking(false);
    }
  }

  function mergeEmitted(
    emitted: Array<{ id: string; width: number }>,
    mode: ProcessingMode | null,
  ) {
    setJobs((previous) => {
      const known = new Set(previous.map((job) => job.id));
      const next = emitted
        .filter((job) => !known.has(job.id))
        .map((job) => ({
          id: job.id,
          width: job.width,
          mode: mode ?? ('service' as ProcessingMode),
          status: 'queued' as const,
          resultAssetUrl: null,
        }));
      return [...next, ...previous];
    });
  }

  async function answerConsent(decision: 'granted' | 'denied') {
    setConsentPrompt(null);
    await emit(decision);
  }

  const modeLabels = {
    local: copy.badgeLocal,
    service: copy.badgeService,
    browser: copy.badgeBrowser,
  };

  const statusLabel = (status: string) =>
    copy.jobStatus[status as TalentJobStatus] ?? status;

  const sortedJobs = [...jobs].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));

  return (
    <div className="ac-surface-panel overflow-hidden p-8 text-[var(--text-primary)]">
      <p className="ac-surface-panel__eyebrow">{copy.settingsEyebrow}</p>
      <h3 className="mt-3 text-2xl font-black tracking-tight">{copy.derivativesTitle}</h3>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          data-testid="cover-optimize-button"
          className="ac-button ac-button--primary"
          disabled={working || !hasCover}
          onClick={() => void emit()}
        >
          {working ? copy.optimizeWorking : copy.optimizeButton}
        </button>
        {!hasCover && (
          <p className="text-sm text-[var(--text-tertiary)]">{copy.optimizeNoCover}</p>
        )}
      </div>

      {errorText && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-500">
          {errorText}
        </p>
      )}
      {successText && (
        <p role="status" className="mt-4 text-sm font-semibold text-emerald-500">
          {successText}
        </p>
      )}

      {sortedJobs.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--text-secondary)]">{copy.derivativesEmpty}</p>
      ) : (
        <ul className="mt-6 space-y-3" data-testid="cover-derivatives">
          {sortedJobs.map((job) => (
            <li
              key={job.id}
              data-testid="cover-derivative"
              className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--border-subtle)] px-4 py-3"
            >
              <span className="text-sm font-bold">
                {job.width !== null ? `${job.width} px` : copy.operationResizeLabel}
              </span>
              <ProcessingModeBadge mode={job.mode} labels={modeLabels} />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {statusLabel(job.status)}
              </span>
              {job.status === 'completed' && job.resultAssetUrl && (
                <a
                  href={job.resultAssetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[var(--accent)]"
                >
                  {copy.derivativeView}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {consentPrompt && (
        <div className="ac-modal" role="dialog" aria-modal="true" data-testid="filestudio-consent-dialog">
          <div className="ac-modal__backdrop" onClick={() => setConsentPrompt(null)} />
          <div className="ac-modal__panel max-w-lg rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {copy.consentTitle}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {copy.consentDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConsentPrompt(null)}
                aria-label={copy.consentReject}
              >
                <X className="h-5 w-5 text-[var(--text-tertiary)]" />
              </button>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-semibold text-[var(--text-tertiary)]">
                  {copy.consentOperationLabel}
                </dt>
                <dd className="font-semibold text-[var(--text-primary)]">
                  {copy.operationResizeLabel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-semibold text-[var(--text-tertiary)]">{copy.consentModeLabel}</dt>
                <dd>
                  <ProcessingModeBadge mode={consentPrompt.mode} labels={modeLabels} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-semibold text-[var(--text-tertiary)]">{copy.consentFileLabel}</dt>
                <dd className="font-semibold text-[var(--text-primary)]">{copy.consentFileCover}</dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                data-testid="consent-reject"
                className="ac-button ac-button--secondary"
                onClick={() => void answerConsent('denied')}
              >
                {copy.consentReject}
              </button>
              <button
                type="button"
                data-testid="consent-confirm"
                className="ac-button ac-button--primary"
                onClick={() => void answerConsent('granted')}
              >
                {copy.consentConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
