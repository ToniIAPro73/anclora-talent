'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, GitCompareArrows, Loader2, RotateCcw, Save } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { BlockChangeKind, DocumentDiff } from '@/lib/document/diff';
import { diffSnapshotsAction, restoreSnapshotAction, saveDocumentSnapshotAction } from '@/lib/snapshots/actions';
import type { DocumentSnapshotMeta, SnapshotSource } from '@/lib/snapshots/model';

type Copy = AppMessages['history'];
type ErrorKey = keyof Copy['errors'];

const SOURCE_LABEL: Record<SnapshotSource, keyof Pick<Copy, 'sourceManualSave' | 'sourceReimport' | 'sourceRestore'>> = {
  'manual-save': 'sourceManualSave',
  reimport: 'sourceReimport',
  restore: 'sourceRestore',
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

type AsyncDiff =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; diff: DocumentDiff };

function DiffView({ copy, state }: { copy: Copy; state: AsyncDiff }) {
  if (state.status === 'idle') return null;
  if (state.status === 'loading') {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {copy.comparing}
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <p role="alert" className="mt-3 text-xs font-semibold text-red-600">
        {copy.errors.unavailable}
      </p>
    );
  }
  const { diff } = state;
  return (
    <div className="mt-3" data-testid="versions-diff">
      <p className="text-xs font-semibold text-[var(--text-tertiary)]" data-testid="versions-diff-summary">
        {diffSummaryText(copy, diff)}
      </p>
      {diff.metadataChanged && (
        <span className="talent-versions-workspace__badge talent-versions-workspace__badge--warn mt-2 inline-block">
          {copy.metadataChangedBadge}
        </span>
      )}
      {diff.chapters.length === 0 && !diff.metadataChanged && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{copy.diffEmpty}</p>
      )}
      {diff.chapters.map((chapter) => (
        <section key={chapter.anchorId} className="mt-4" data-testid={`versions-diff-chapter-${chapter.anchorId}`}>
          <h6 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            {chapter.title || copy.unchaptered}
          </h6>
          <ul className="mt-2 space-y-1.5">
            {chapter.changes.map((change) => (
              <li
                key={`${change.kind}-${change.blockId}`}
                data-block-id={change.blockId}
                data-testid={`versions-change-${change.kind}-${change.blockId}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
              >
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHANGE_CLASSES[change.kind]}`}>
                  {copy[CHANGE_LABEL[change.kind]]}
                </span>
                <span className="text-[var(--text-primary)]">
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
  );
}

export function VersionsWorkspace({
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
  const [selectedVersion, setSelectedVersion] = useState<number | null>(snapshots[0]?.version ?? null);
  const [autoDiff, setAutoDiff] = useState<AsyncDiff>({ status: 'idle' });
  const [saveError, setSaveError] = useState<ErrorKey | null>(null);
  const [restoreError, setRestoreError] = useState<ErrorKey | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareFrom, setCompareFrom] = useState<number | null>(null);
  const [compareTo, setCompareTo] = useState<number | null>(null);
  const [compareHint, setCompareHint] = useState(false);
  const [customDiff, setCustomDiff] = useState<AsyncDiff>({ status: 'idle' });
  const requestId = useRef(0);

  const sorted = [...snapshots].sort((a, b) => b.version - a.version);
  const latestVersion = sorted[0]?.version ?? null;
  const selectedIndex = sorted.findIndex((snapshot) => snapshot.version === selectedVersion);
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : null;
  const previousVersion = selectedIndex >= 0 ? (sorted[selectedIndex + 1]?.version ?? null) : null;

  useEffect(() => {
    // No predecessor to diff against (initial version, or nothing selected
    // yet) — the JSX below branches on `previousVersion === null` before it
    // ever reads `autoDiff`, so leaving the prior result in place here is
    // harmless.
    if (selectedVersion === null || previousVersion === null) return;
    const id = ++requestId.current;
    // The 'loading' status is set synchronously by `selectVersion` (a click
    // handler) for every interactive selection; this effect only owns the
    // async fetch + its resolution, so it never calls setState synchronously
    // in the effect body itself — only from the awaited `.then()`.
    void diffSnapshotsAction({ projectId, fromVersion: previousVersion, toVersion: selectedVersion }).then((result) => {
      if (requestId.current !== id) return;
      setAutoDiff(result.ok ? { status: 'ready', diff: result.diff } : { status: 'error' });
    });
  }, [selectedVersion, previousVersion, projectId]);

  const selectVersion = (version: number) => {
    setSelectedVersion(version);
    setAutoDiff({ status: 'loading' });
    setCompareOpen(false);
    setCustomDiff({ status: 'idle' });
    setRestoreError(null);
  };

  const handleSaveVersion = () => {
    setSaveError(null);
    startTransition(async () => {
      const result = await saveDocumentSnapshotAction({ projectId });
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setSelectedVersion(result.version);
      router.refresh();
    });
  };

  const handleRestore = () => {
    if (selected === null) return;
    setRestoreError(null);
    startTransition(async () => {
      const result = await restoreSnapshotAction({ projectId, version: selected.version });
      if (!result.ok) {
        setRestoreError(result.error);
        return;
      }
      setSelectedVersion(result.version);
      router.refresh();
    });
  };

  const handleCustomCompare = () => {
    setCompareHint(false);
    if (compareFrom === null || compareTo === null || compareFrom === compareTo) {
      setCompareHint(true);
      setCustomDiff({ status: 'idle' });
      return;
    }
    setCustomDiff({ status: 'loading' });
    void diffSnapshotsAction({ projectId, fromVersion: compareFrom, toVersion: compareTo }).then((result) => {
      setCustomDiff(result.ok ? { status: 'ready', diff: result.diff } : { status: 'error' });
    });
  };

  if (snapshots.length === 0) {
    return (
      <div className="ac-surface-panel ac-surface-panel--subtle" data-testid="versions-workspace-empty">
        <p className="ac-surface-panel__eyebrow">{copy.title}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{copy.empty}</p>
        <div className="mt-4 flex items-center gap-3">
          {saveError && (
            <span role="alert" className="text-sm font-semibold text-red-600">
              {copy.errors[saveError]}
            </span>
          )}
          <button
            type="button"
            data-testid="versions-save-button"
            onClick={handleSaveVersion}
            disabled={isPending}
            className="ac-button ac-button--compact ac-button--primary"
          >
            <Save className="h-4 w-4" />
            {isPending ? copy.savingVersion : copy.saveVersionButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="talent-versions-workspace" data-testid="versions-workspace">
      {/* TIMELINE COLUMN */}
      <div className="talent-versions-workspace__timeline">
        <section className="ac-surface-panel ac-surface-panel--subtle">
          <p className="ac-surface-panel__eyebrow">{copy.title}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.description}</p>

          <ol className="talent-versions-workspace__list" data-testid="versions-list">
            {sorted.map((snapshot) => (
              <li key={snapshot.id}>
                <button
                  type="button"
                  data-testid={`versions-item-${snapshot.version}`}
                  onClick={() => selectVersion(snapshot.version)}
                  data-active={snapshot.version === selectedVersion}
                  className="talent-versions-workspace__item"
                >
                  <div className="talent-versions-workspace__item-head">
                    <span className="talent-versions-workspace__item-version">v{snapshot.version}</span>
                    {snapshot.version === latestVersion && (
                      <span className="talent-versions-workspace__badge talent-versions-workspace__badge--current">
                        {copy.currentBadge}
                      </span>
                    )}
                    <span className="talent-versions-workspace__item-date">{formatSnapshotDate(snapshot.createdAt)}</span>
                  </div>
                  <p className="talent-versions-workspace__item-label">{snapshot.label}</p>
                  <span
                    data-testid={`versions-source-${snapshot.source}`}
                    className="talent-versions-workspace__badge talent-versions-workspace__badge--neutral"
                  >
                    {copy[SOURCE_LABEL[snapshot.source]]}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* DETAIL COLUMN */}
      <div className="talent-versions-workspace__detail">
        {selected && (
          <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="versions-detail-panel">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="ac-surface-panel__title">
                v{selected.version} · {selected.label}
              </h3>
              {selected.version === latestVersion && (
                <span className="talent-versions-workspace__badge talent-versions-workspace__badge--current">
                  {copy.currentBadge}
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <Clock className="h-3.5 w-3.5" />
              {formatSnapshotDate(selected.createdAt)} · {copy[SOURCE_LABEL[selected.source]]}
            </p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {copy.summaryHeading}
              </p>

              {previousVersion === null ? (
                <p className="mt-2 text-sm text-[var(--text-secondary)]" data-testid="versions-initial-note">
                  {copy.initialVersionNote}
                </p>
              ) : autoDiff.status === 'ready' ? (
                <ul className="talent-versions-workspace__summary-list">
                  <li>
                    <FileText className="h-4 w-4 text-[var(--accent-text)]" />
                    <span className="flex-1">{copy.chaptersLabel}</span>
                    <span>
                      {autoDiff.diff.counts.added + autoDiff.diff.counts.removed + autoDiff.diff.counts.changed + autoDiff.diff.counts.moved === 0
                        ? copy.noChanges
                        : diffSummaryText(copy, autoDiff.diff)}
                    </span>
                  </li>
                  <li>
                    <FileText className="h-4 w-4 text-[var(--accent-text)]" />
                    <span className="flex-1">{copy.metadataLabel}</span>
                    <span>{autoDiff.diff.metadataChanged ? copy.metadataChangedBadge : copy.metadataUnchanged}</span>
                  </li>
                </ul>
              ) : (
                <DiffView copy={copy} state={autoDiff} />
              )}
            </div>

            {!compareOpen && previousVersion !== null && autoDiff.status === 'ready' && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {copy.comparisonHeading}
                </p>
                <DiffView copy={copy} state={autoDiff} />
              </div>
            )}

            {compareOpen && (
              <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {copy.compareWithOtherAction}
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  <label className="block space-y-1 text-xs font-semibold text-[var(--text-tertiary)]">
                    {copy.compareFrom}
                    <select
                      data-testid="versions-compare-from"
                      value={compareFrom ?? ''}
                      onChange={(event) => setCompareFrom(event.target.value ? Number(event.target.value) : null)}
                      className="block rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                    >
                      <option value="">—</option>
                      {sorted.map((snapshot) => (
                        <option key={snapshot.id} value={snapshot.version}>
                          v{snapshot.version}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-xs font-semibold text-[var(--text-tertiary)]">
                    {copy.compareTo}
                    <select
                      data-testid="versions-compare-to"
                      value={compareTo ?? ''}
                      onChange={(event) => setCompareTo(event.target.value ? Number(event.target.value) : null)}
                      className="block rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                    >
                      <option value="">—</option>
                      {sorted.map((snapshot) => (
                        <option key={snapshot.id} value={snapshot.version}>
                          v{snapshot.version}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    data-testid="versions-compare-button"
                    onClick={handleCustomCompare}
                    className="ac-button ac-button--compact"
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    {copy.compareButton}
                  </button>
                </div>
                {compareHint && <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.selectVersions}</p>}
                <DiffView copy={copy} state={customDiff} />
              </div>
            )}
          </section>
        )}
      </div>

      {/* ACTIONS COLUMN */}
      <div className="talent-versions-workspace__actions">
        <section className="ac-surface-panel ac-surface-panel--subtle" data-testid="versions-actions-panel">
          <p className="ac-surface-panel__eyebrow">{copy.actionsHeading}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.actionsSubtitle}</p>

          <div className="talent-versions-workspace__action-list">
            <button
              type="button"
              data-testid="versions-compare-toggle"
              onClick={() => setCompareOpen((prev) => !prev)}
              className="talent-versions-workspace__action"
            >
              <GitCompareArrows className="h-4 w-4" />
              <span>
                <span className="talent-versions-workspace__action-title">{copy.compareWithOtherAction}</span>
                <span className="talent-versions-workspace__action-desc">{copy.compareWithOtherDesc}</span>
              </span>
            </button>

            {selected && selected.version !== latestVersion ? (
              <button
                type="button"
                data-testid="versions-restore-button"
                onClick={handleRestore}
                disabled={isPending}
                className="talent-versions-workspace__action"
              >
                <RotateCcw className="h-4 w-4" />
                <span>
                  <span className="talent-versions-workspace__action-title">
                    {isPending ? copy.restoring : copy.restoreButton}
                  </span>
                  <span className="talent-versions-workspace__action-desc">{copy.restoreDesc}</span>
                </span>
              </button>
            ) : (
              <p className="talent-versions-workspace__note">{copy.currentVersionNote}</p>
            )}

            <button
              type="button"
              data-testid="versions-save-button"
              onClick={handleSaveVersion}
              disabled={isPending}
              className="talent-versions-workspace__action talent-versions-workspace__action--primary"
            >
              <Save className="h-4 w-4" />
              <span>
                <span className="talent-versions-workspace__action-title">
                  {isPending ? copy.savingVersion : copy.saveVersionButton}
                </span>
                <span className="talent-versions-workspace__action-desc">{copy.saveDesc}</span>
              </span>
            </button>
          </div>

          {(saveError || restoreError) && (
            <p role="alert" className="mt-3 text-sm font-semibold text-red-600">
              {copy.errors[(saveError ?? restoreError) as ErrorKey]}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
