import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { generateLaunchPackActionMock, refreshMock } = vi.hoisted(() => ({
  generateLaunchPackActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/lib/manifest/actions', () => ({
  generateLaunchPackAction: generateLaunchPackActionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { LaunchPackView } from '@/lib/manifest/view';
import { LaunchPackPanel } from './LaunchPackPanel';

const COPY = resolveLocaleMessages('es').launchPack;

function manifestView(): LaunchPackView {
  return {
    version: 3,
    createdAt: '2026-08-04T10:00:00.000Z',
    items: [
      {
        assetId: 'epub',
        kind: 'epub',
        url: 'https://blob.example/mi-libro.epub',
        blobKey: 'p/1.epub',
        provenance: 'compositor',
        sourceHash: 'hash-current',
        createdAt: '2026-08-04T10:00:00.000Z',
        stale: false,
      },
      {
        assetId: 'markdown',
        kind: 'markdown',
        url: 'https://blob.example/mi-libro.md',
        blobKey: 'p/1.md',
        provenance: 'compositor',
        sourceHash: 'hash-old',
        createdAt: '2026-08-04T10:00:00.000Z',
        stale: true,
      },
      {
        assetId: 'mobi',
        kind: 'mobi',
        url: null,
        blobKey: null,
        provenance: 'filestudio-service',
        sourceHash: 'hash-current',
        createdAt: '2026-08-04T10:00:00.000Z',
        jobId: 'job-1',
        stale: false,
      },
    ],
  };
}

describe('LaunchPackPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('empty state without manifest: only the generate CTA', () => {
    render(<LaunchPackPanel copy={COPY} projectId="p1" view={null} />);

    expect(screen.getByTestId('launch-pack-panel')).toBeInTheDocument();
    expect(screen.getByText(COPY.empty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: COPY.generateButton })).toBeInTheDocument();
    expect(screen.queryByTestId('launch-pack-assets')).not.toBeInTheDocument();
  });

  test('lists assets with kind, provenance badge, stale mark and pending state', () => {
    render(<LaunchPackPanel copy={COPY} projectId="p1" view={manifestView()} />);

    expect(screen.getByTestId('launch-pack-version')).toHaveTextContent('Versión 3');
    expect(screen.getByTestId('launch-pack-asset-epub')).toHaveTextContent('EPUB');
    expect(screen.getByTestId('launch-pack-asset-epub')).toHaveTextContent(COPY.provenanceCompositor);
    expect(screen.getByTestId('launch-pack-asset-mobi')).toHaveTextContent(COPY.provenanceService);
    // Stale only on the markdown asset (document changed after it was generated).
    expect(screen.getByTestId('launch-pack-asset-markdown')).toHaveTextContent(COPY.staleBadge);
    expect(screen.getByTestId('launch-pack-asset-epub')).not.toHaveTextContent(COPY.staleBadge);
    // Delegated asset without url → pending, no open link.
    expect(screen.getByTestId('launch-pack-asset-mobi')).toHaveTextContent(COPY.pendingBadge);
    expect(screen.getAllByRole('link', { name: COPY.viewAsset })).toHaveLength(2);
  });

  test('generate runs the action and refreshes the page data on success', async () => {
    generateLaunchPackActionMock.mockResolvedValue({ ok: true, manifest: {}, generated: ['epub'], failed: [] });
    render(<LaunchPackPanel copy={COPY} projectId="p1" view={null} />);

    fireEvent.click(screen.getByRole('button', { name: COPY.generateButton }));

    await waitFor(() => expect(generateLaunchPackActionMock).toHaveBeenCalledWith({ projectId: 'p1' }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('a failed generation surfaces the mapped error and does not refresh', async () => {
    generateLaunchPackActionMock.mockResolvedValue({ ok: false, error: 'unavailable' });
    render(<LaunchPackPanel copy={COPY} projectId="p1" view={null} />);

    fireEvent.click(screen.getByRole('button', { name: COPY.generateButton }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(COPY.errors.unavailable));
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test('with a manifest the button regenerates the pack', () => {
    render(<LaunchPackPanel copy={COPY} projectId="p1" view={manifestView()} />);
    expect(screen.getByRole('button', { name: COPY.regenerateButton })).toBeInTheDocument();
  });

  test('EN copy renders (locale parity surface)', () => {
    const enCopy = resolveLocaleMessages('en').launchPack;
    render(<LaunchPackPanel copy={enCopy} projectId="p1" view={manifestView()} />);
    expect(screen.getByTestId('launch-pack-asset-markdown')).toHaveTextContent(enCopy.staleBadge);
    expect(screen.getByTestId('launch-pack-version')).toHaveTextContent('Version 3');
  });
});
