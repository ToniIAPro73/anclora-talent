'use client';

/**
 * Version history panel (F2) — workspace content step.
 *
 * Lists the document snapshots (version, label, origin badge, date) and
 * offers:
 * - "Guardar versión": explicit snapshot of the current AST;
 * - compare two versions: structural diff by stable block ids, grouped by
 *   chapter; every change anchors its block id (`data-block-id`);
 * - restore: re-saves the old AST through the regular document save route
 *   and captures it as a NEW version — history is never rewritten.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GitCompareArrows, History, Loader2, RotateCcw, Save } from 'lucide-react';
import type { BlockChangeKind, DocumentDiff } from '@/lib/document/diff';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  diffSnapshotsAction,
  restoreSnapshotAction,
  saveDocumentSnapshotAction,
} from '@/lib/snapshots/actions';
import type { DocumentSnapshotMeta, SnapshotSource } from '@/lib/snapshots/model';

type Copy = AppMessages['history'];

const SOURCE_LABEL: Record<SnapshotSource, keyof Pick<Copy, 'sourceManualSave' | 'sourceReimport' | 'sourceRestore'>> = {
  'manual-save': 'sourceManualSave',
  reimport: 'sourceReimport',
  restore: 'sourceRestore',
};

const SOURCE_CLASSES: Record<SnapshotSource, string> = {
  'manual-save': 'bg-zinc-100 text-zinc-700',
  reimport: 'bg-sky-100 text-sky-800',
  restore: 'bg-violet-100 text-violet-800',
};

const CHANGE_LABEL: Record<BlockChangeKind, keyof Pick<Copy, 'changeAdded' | 'changeRemoved' | 'changeChanged' | 'changeMoved'>> = {
  added: 'changeAdded',
  removed: 'changeRemoved',
  changed: 'changeChanged',
  moved: 'changeMoved',
};

const CHANGE_CLASSES: Record<BlockChangeKind, string> = {
  added: 'bg-emerald-100 text-emerald-800',
  removed: 'bg-red-100 text-red-800',
  changed: 'bg-amber-100 text-amber-800',
  moved: 'bg-sky-100 text-sky-800',
};

/** Deterministic, locale-independent date rendering: `YYYY-MM-DD HH:mm`. */
function formatSnapshotDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

function diffSummaryText(copy: Copy, diff: DocumentDiff): string {
  return copy.diffSummary
    .replace('{added}', String(diff.counts.added))
    .replace('{removed}', String(diff.counts.removed))
    .replace('{changed}', String(diff.counts.changed))
    .replace('{moved}', String(diff.counts.moved));
}

export function HistoryPanel({
  copy,
  projectId,
  snapshots,
}: {
  copy: Copy;
  projectId: string;
  /** Snapshot metadata, newest first. */
  snapshots: DocumentSnapshotMeta[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<keyof Copy['errors'] | null>(null);
  const [fromVersion, setFromVersion] = useState<number | null>(null);
  const [toVersion, setToVersion] = useState<number | null>(null);
  const [diff, setDiff] = useState<DocumentDiff | null>(null);
  const [compareHint, setCompareHint] = useState(false);

  const handleSaveVersion = () => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await saveDocumentSnapshotAction({ projectId });
      if (!result.ok) {
        setErrorKey(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleCompare = () => {
    setErrorKey(null);
    setCompareHint(false);
    if (fromVersion === null || toVersion === null || fromVersion === toVersion) {
      setCompareHint(true);
      setDiff(null);
      return;
    }
    startTransition(async () => {
      const result = await diffSnapshotsAction({ projectId, fromVersion, toVersion });
      if (!result.ok) {
        setErrorKey(result.error === 'notFound' ? 'notFound' : 'unavailable');
        setDiff(null);
        return;
      }
      setDiff(result.diff);
    });
  };

  const handleRestore = (version: number) => {
    setErrorKey(null);
    startTransition(async () => {
      const result = await restoreSnapshotAction({ projectId, version });
      if (!result.ok) {
        setErrorKey(result.error === 'notFound' ? 'notFound' : 'unavailable');
        return;
      }
      router.refresh();
    });
  };

  return (
    <section
      aria-label={copy.title}
      data-testid="history-panel"
      className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <History className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">{copy.title}</h4>
            <p className="mt-1 text-xs text-[var(--muted)]">{copy.description}</p>
          </div>
        </div>
        <button
          type="button"
          data-testid="history-save-version-button"
          onClick={handleSaveVersion}
          disabled={isPending}
          className="ac-button ac-button--primary inline-flex items-center gap-2"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? copy.savingVersion : copy.saveVersionButton}
        </button>
      </div>

      {errorKey && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
          {copy.errors[errorKey]}
        </p>
      )}

      {snapshots.length === 0 && <p className="mt-4 text-sm text-[var(--muted)]">{copy.empty}</p>}

      {snapshots.length > 0 && (
        <ul className="mt-4 space-y-2" data-testid="history-snapshots">
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              data-testid={`history-snapshot-${snapshot.version}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <span className="font-medium text-[var(--foreground)]">
                {copy.versionLabel.replace('{version}', String(snapshot.version))}
              </span>
              <span className="text-[var(--muted)]">{snapshot.label}</span>
              <span
                data-testid={`history-source-${snapshot.source}`}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SOURCE_CLASSES[snapshot.source]}`}
              >
                {copy[SOURCE_LABEL[snapshot.source]]}
              </span>
              <span className="text-xs text-[var(--muted)]">{formatSnapshotDate(snapshot.createdAt)}</span>
              <button
                type="button"
                onClick={() => handleRestore(snapshot.version)}
                disabled={isPending}
                data-testid={`history-restore-${snapshot.version}`}
                className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] underline"
              >
                <RotateCcw className="h-3 w-3" />
                {copy.restoreButton}
              </button>
            </li>
          ))}
        </ul>
      )}

      {snapshots.length > 1 && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block space-y-1 text-xs font-semibold text-[var(--text-tertiary)]">
              {copy.compareFrom}
              <select
                data-testid="history-compare-from"
                value={fromVersion ?? ''}
                onChange={(event) => setFromVersion(event.target.value ? Number(event.target.value) : null)}
                className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--foreground)]"
              >
                <option value="">—</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.version}>
                    {copy.versionLabel.replace('{version}', String(snapshot.version))}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-[var(--text-tertiary)]">
              {copy.compareTo}
              <select
                data-testid="history-compare-to"
                value={toVersion ?? ''}
                onChange={(event) => setToVersion(event.target.value ? Number(event.target.value) : null)}
                className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--foreground)]"
              >
                <option value="">—</option>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.version}>
                    {copy.versionLabel.replace('{version}', String(snapshot.version))}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              data-testid="history-compare-button"
              onClick={handleCompare}
              disabled={isPending}
              className="ac-button ac-button--secondary inline-flex items-center gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
              {isPending ? copy.comparing : copy.compareButton}
            </button>
          </div>

          {compareHint && <p className="mt-3 text-sm text-[var(--muted)]">{copy.selectVersions}</p>}

          {diff && (
            <div className="mt-4" data-testid="history-diff">
              <p className="text-xs font-semibold text-[var(--text-tertiary)]" data-testid="history-diff-summary">
                {diffSummaryText(copy, diff)}
              </p>
              {diff.metadataChanged && (
                <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {copy.metadataChangedBadge}
                </span>
              )}
              {diff.chapters.length === 0 && !diff.metadataChanged && (
                <p className="mt-3 text-sm text-[var(--muted)]">{copy.diffEmpty}</p>
              )}
              {diff.chapters.map((chapter) => (
                <section key={chapter.anchorId} className="mt-4" data-testid={`history-diff-chapter-${chapter.anchorId}`}>
                  <h6 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {chapter.title || copy.unchaptered}
                  </h6>
                  <ul className="mt-2 space-y-1.5">
                    {chapter.changes.map((change) => (
                      <li
                        key={`${change.kind}-${change.blockId}`}
                        data-block-id={change.blockId}
                        data-testid={`history-change-${change.kind}-${change.blockId}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                      >
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHANGE_CLASSES[change.kind]}`}>
                          {copy[CHANGE_LABEL[change.kind]]}
                        </span>
                        <span className="text-[var(--foreground)]">
                          {change.kind === 'changed' && change.previousPreview
                            ? `${change.previousPreview} → ${change.preview}`
                            : change.preview}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
