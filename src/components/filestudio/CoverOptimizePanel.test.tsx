import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { CoverOptimizePanel } from './CoverOptimizePanel';

const optimizeCoverAction = vi.fn();
const syncFileStudioJobsAction = vi.fn().mockResolvedValue({ ok: true, synced: [] });

vi.mock('@/lib/filestudio/actions', () => ({
  optimizeCoverAction: (input: unknown) => optimizeCoverAction(input),
  syncFileStudioJobsAction: (input: unknown) => syncFileStudioJobsAction(input),
}));

const copy = resolveLocaleMessages('es').filestudio;
const PROJECT = '11111111-1111-1111-1111-111111111111';

function renderPanel(overrides: Partial<Parameters<typeof CoverOptimizePanel>[0]> = {}) {
  return render(
    <CoverOptimizePanel
      copy={copy}
      projectId={PROJECT}
      hasCover
      initialJobs={[]}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  optimizeCoverAction.mockReset();
  syncFileStudioJobsAction.mockClear();
});

describe('CoverOptimizePanel — conditional rendering', () => {
  test('disables the button and explains why when the project has no cover', () => {
    renderPanel({ hasCover: false });

    expect(screen.getByTestId('cover-optimize-button')).toBeDisabled();
    expect(screen.getByText(copy.optimizeNoCover)).toBeInTheDocument();
  });

  test('shows the empty state when there are no derivatives yet', () => {
    renderPanel();
    expect(screen.getByText(copy.derivativesEmpty)).toBeInTheDocument();
  });

  test('lists existing derivatives with their REAL processing mode (routing-policy.md)', () => {
    renderPanel({
      initialJobs: [
        {
          id: 'row-1',
          operation: 'image:resize',
          mode: 'local',
          status: 'completed',
          width: 1600,
          resultAssetUrl: 'https://blob.example/cover-1600.jpg',
          createdAt: '2026-08-04T00:00:00Z',
        },
        {
          id: 'row-2',
          operation: 'image:resize',
          mode: 'service',
          status: 'queued',
          width: 800,
          resultAssetUrl: null,
          createdAt: '2026-08-04T00:00:01Z',
        },
      ],
    });

    const rows = screen.getAllByTestId('cover-derivative');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('1600 px');
    expect(screen.getAllByTestId('processing-mode-badge')[0]).toHaveAttribute('data-mode', 'local');
    expect(screen.getAllByTestId('processing-mode-badge')[1]).toHaveAttribute('data-mode', 'service');
    expect(screen.getByRole('link', { name: copy.derivativeView })).toHaveAttribute(
      'href',
      'https://blob.example/cover-1600.jpg',
    );
  });
});

describe('CoverOptimizePanel — emission flow', () => {
  test('emits the job set and lists the queued derivatives with the declared mode', async () => {
    optimizeCoverAction.mockResolvedValue({
      ok: true,
      mode: 'service',
      jobs: [
        { id: 'row-1', externalJobId: 'job_1600', width: 1600 },
        { id: 'row-2', externalJobId: 'job_800', width: 800 },
        { id: 'row-3', externalJobId: 'job_400', width: 400 },
      ],
    });
    renderPanel();

    fireEvent.click(screen.getByTestId('cover-optimize-button'));

    await waitFor(() => expect(screen.getAllByTestId('cover-derivative')).toHaveLength(3));
    expect(optimizeCoverAction).toHaveBeenCalledWith({ projectId: PROJECT, consent: undefined });
    expect(screen.getByRole('status')).toHaveTextContent(copy.optimizeSuccess);
    for (const badge of screen.getAllByTestId('processing-mode-badge')) {
      expect(badge).toHaveAttribute('data-mode', 'service');
    }
  });

  test('maps product errors to localized messages, never FileStudio codes', async () => {
    optimizeCoverAction.mockResolvedValue({ ok: false, error: 'limitDaily' });
    renderPanel();

    fireEvent.click(screen.getByTestId('cover-optimize-button'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(copy.errors.limitDaily),
    );
  });
});

describe('CoverOptimizePanel — ask-always consent (Mode 1)', () => {
  test('asks for consent declaring operation/mode/file, then emits with the granted decision', async () => {
    optimizeCoverAction
      .mockResolvedValueOnce({
        ok: false,
        requiresConsent: true,
        operation: 'image:resize',
        mode: 'local',
        fileName: 'cover',
      })
      .mockResolvedValueOnce({
        ok: true,
        mode: 'local',
        jobs: [{ id: 'row-1', externalJobId: 'ajob_1600', width: 1600 }],
      });
    renderPanel();

    fireEvent.click(screen.getByTestId('cover-optimize-button'));

    const dialog = await screen.findByTestId('filestudio-consent-dialog');
    expect(dialog).toHaveTextContent(copy.operationResizeLabel);
    expect(dialog).toHaveTextContent(copy.consentFileCover);
    expect(dialog.querySelector('[data-testid="processing-mode-badge"]')).toHaveAttribute(
      'data-mode',
      'local',
    );

    fireEvent.click(screen.getByTestId('consent-confirm'));

    await waitFor(() =>
      expect(optimizeCoverAction).toHaveBeenLastCalledWith({ projectId: PROJECT, consent: 'granted' }),
    );
    await waitFor(() => expect(screen.getAllByTestId('cover-derivative')).toHaveLength(1));
  });

  test('a rejection is sent to the action and the dialog closes', async () => {
    optimizeCoverAction
      .mockResolvedValueOnce({
        ok: false,
        requiresConsent: true,
        operation: 'image:resize',
        mode: 'local',
        fileName: 'cover',
      })
      .mockResolvedValueOnce({ ok: false, error: 'consentRejected' });
    renderPanel();

    fireEvent.click(screen.getByTestId('cover-optimize-button'));
    await screen.findByTestId('filestudio-consent-dialog');
    fireEvent.click(screen.getByTestId('consent-reject'));

    await waitFor(() =>
      expect(optimizeCoverAction).toHaveBeenLastCalledWith({ projectId: PROJECT, consent: 'denied' }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('filestudio-consent-dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(copy.errors.consentRejected),
    );
  });
});
