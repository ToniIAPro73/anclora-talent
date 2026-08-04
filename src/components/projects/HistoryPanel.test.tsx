import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { saveMock, diffMock, restoreMock, refreshMock } = vi.hoisted(() => ({
  saveMock: vi.fn(),
  diffMock: vi.fn(),
  restoreMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/lib/snapshots/actions', () => ({
  saveDocumentSnapshotAction: saveMock,
  diffSnapshotsAction: diffMock,
  restoreSnapshotAction: restoreMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import type { DocumentDiff } from '@/lib/document/diff';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { DocumentSnapshotMeta, SnapshotSource } from '@/lib/snapshots/model';
import { HistoryPanel } from './HistoryPanel';

const COPY = resolveLocaleMessages('es').history;

function meta(version: number, source: SnapshotSource, label: string): DocumentSnapshotMeta {
  return {
    id: `snap-${version}`,
    projectId: 'p1',
    version,
    label,
    source,
    sourceHash: `hash-${version}`,
    createdBy: 'user-1',
    createdAt: `2026-08-0${version}T10:30:00.000Z`,
  };
}

function sampleDiff(): DocumentDiff {
  return {
    chapters: [
      {
        anchorId: 'h1',
        title: 'Capítulo 1',
        changes: [
          { kind: 'changed', blockId: 'p1', blockType: 'paragraph', preview: 'Hola editado', previousPreview: 'Hola' },
          { kind: 'added', blockId: 'p3', blockType: 'paragraph', preview: 'Nuevo' },
          { kind: 'removed', blockId: 'p2', blockType: 'paragraph', preview: 'Adiós' },
        ],
      },
      {
        anchorId: 'h2',
        title: 'Capítulo 2',
        changes: [{ kind: 'moved', blockId: 'p9', blockType: 'paragraph', preview: 'Movido' }],
      },
    ],
    counts: { added: 1, removed: 1, changed: 1, moved: 1 },
    metadataChanged: false,
  };
}

describe('HistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('empty state: only the save-version CTA and the empty copy', () => {
    render(<HistoryPanel copy={COPY} projectId="p1" snapshots={[]} />);

    expect(screen.getByTestId('history-panel')).toBeInTheDocument();
    expect(screen.getByText(COPY.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: COPY.saveVersionButton })).toBeInTheDocument();
    expect(screen.queryByTestId('history-snapshots')).not.toBeInTheDocument();
  });

  test('lists snapshots with version, label, origin badge and date', () => {
    render(
      <HistoryPanel
        copy={COPY}
        projectId="p1"
        snapshots={[meta(2, 'reimport', 'Reimportación 2'), meta(1, 'manual-save', 'Guardado 1')]}
      />,
    );

    expect(screen.getByTestId('history-snapshot-2')).toHaveTextContent('Versión 2');
    expect(screen.getByTestId('history-snapshot-2')).toHaveTextContent('Reimportación 2');
    expect(screen.getByTestId('history-snapshot-2')).toHaveTextContent(COPY.sourceReimport);
    expect(screen.getByTestId('history-snapshot-2')).toHaveTextContent('2026-08-02 10:30');
    expect(screen.getByTestId('history-snapshot-1')).toHaveTextContent(COPY.sourceManualSave);
    expect(screen.getByTestId('history-restore-1')).toBeInTheDocument();
  });

  test('save version runs the action and refreshes on success', async () => {
    saveMock.mockResolvedValue({ ok: true, version: 3 });
    render(<HistoryPanel copy={COPY} projectId="p1" snapshots={[]} />);

    fireEvent.click(screen.getByRole('button', { name: COPY.saveVersionButton }));

    await waitFor(() => expect(saveMock).toHaveBeenCalledWith({ projectId: 'p1' }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('save version surfaces the mapped error and does not refresh', async () => {
    saveMock.mockResolvedValue({ ok: false, error: 'unchanged' });
    render(<HistoryPanel copy={COPY} projectId="p1" snapshots={[]} />);

    fireEvent.click(screen.getByRole('button', { name: COPY.saveVersionButton }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(COPY.errors.unchanged));
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test('compare without two distinct versions shows the hint and skips the action', () => {
    render(
      <HistoryPanel copy={COPY} projectId="p1" snapshots={[meta(2, 'manual-save', 'B'), meta(1, 'manual-save', 'A')]} />,
    );

    fireEvent.click(screen.getByRole('button', { name: COPY.compareButton }));

    expect(screen.getByText(COPY.selectVersions)).toBeInTheDocument();
    expect(diffMock).not.toHaveBeenCalled();
  });

  test('compare renders the diff grouped by chapter with one row per change', async () => {
    diffMock.mockResolvedValue({ ok: true, diff: sampleDiff() });
    render(
      <HistoryPanel copy={COPY} projectId="p1" snapshots={[meta(2, 'manual-save', 'B'), meta(1, 'manual-save', 'A')]} />,
    );

    fireEvent.change(screen.getByTestId('history-compare-from'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('history-compare-to'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: COPY.compareButton }));

    await waitFor(() => expect(diffMock).toHaveBeenCalledWith({ projectId: 'p1', fromVersion: 1, toVersion: 2 }));
    expect(await screen.findByTestId('history-diff-summary')).toHaveTextContent(
      '1 añadidos · 1 eliminados · 1 modificados · 1 movidos',
    );
    expect(screen.getByTestId('history-diff-chapter-h1')).toHaveTextContent('Capítulo 1');
    expect(screen.getByTestId('history-diff-chapter-h2')).toHaveTextContent('Capítulo 2');
    // Changed rows show before → after previews; every row anchors its block id.
    expect(screen.getByTestId('history-change-changed-p1')).toHaveTextContent('Hola → Hola editado');
    expect(screen.getByTestId('history-change-added-p3')).toHaveTextContent('Nuevo');
    expect(screen.getByTestId('history-change-removed-p2')).toHaveTextContent('Adiós');
    expect(screen.getByTestId('history-change-moved-p9')).toHaveTextContent('Movido');
  });

  test('restore runs the action and refreshes on success', async () => {
    restoreMock.mockResolvedValue({ ok: true, version: 3 });
    render(<HistoryPanel copy={COPY} projectId="p1" snapshots={[meta(1, 'manual-save', 'Guardado 1')]} />);

    fireEvent.click(screen.getByTestId('history-restore-1'));

    await waitFor(() => expect(restoreMock).toHaveBeenCalledWith({ projectId: 'p1', version: 1 }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('restore failure surfaces the mapped error and does not refresh', async () => {
    restoreMock.mockResolvedValue({ ok: false, error: 'notFound' });
    render(<HistoryPanel copy={COPY} projectId="p1" snapshots={[meta(1, 'manual-save', 'Guardado 1')]} />);

    fireEvent.click(screen.getByTestId('history-restore-1'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(COPY.errors.notFound));
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test('EN copy renders (locale parity surface)', () => {
    const enCopy = resolveLocaleMessages('en').history;
    render(<HistoryPanel copy={enCopy} projectId="p1" snapshots={[meta(1, 'restore', 'Restore from v1')]} />);

    expect(screen.getByTestId('history-snapshot-1')).toHaveTextContent('Version 1');
    expect(screen.getByTestId('history-snapshot-1')).toHaveTextContent(enCopy.sourceRestore);
    expect(screen.getByRole('button', { name: enCopy.saveVersionButton })).toBeInTheDocument();
  });
});
