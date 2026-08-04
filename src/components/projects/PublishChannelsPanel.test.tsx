import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  getLaunchKitActionMock,
  saveGumroadTokenActionMock,
  removeGumroadTokenActionMock,
  pushToGumroadActionMock,
  exportHotmartActionMock,
  refreshMock,
} = vi.hoisted(() => ({
  getLaunchKitActionMock: vi.fn(),
  saveGumroadTokenActionMock: vi.fn(),
  removeGumroadTokenActionMock: vi.fn(),
  pushToGumroadActionMock: vi.fn(),
  exportHotmartActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/lib/sales/actions', () => ({
  getLaunchKitAction: getLaunchKitActionMock,
  saveGumroadTokenAction: saveGumroadTokenActionMock,
  removeGumroadTokenAction: removeGumroadTokenActionMock,
  pushToGumroadAction: pushToGumroadActionMock,
  exportHotmartAction: exportHotmartActionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('jszip', () => ({
  default: class {
    files: Record<string, string> = {};
    file(name: string, content: string) {
      this.files[name] = content;
    }
    async generateAsync() {
      return new Blob(['zip']);
    }
  },
}));

import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { LaunchKit } from '@/lib/sales/launch-kit';
import { PublishChannelsPanel } from './PublishChannelsPanel';

const COPY = resolveLocaleMessages('es').publishChannels;

function kitFixture(): LaunchKit {
  return {
    sheet: {
      title: 'Éxito sin compañía',
      subtitle: 'Guía práctica',
      longDescription: 'Texto derivado del capítulo.',
      descriptionSource: 'first-chapter',
      descriptionIsDraft: true,
      bullets: ['El diagnóstico', 'La reconstrucción'],
      author: 'Autora',
      isbn: '978-84-000',
      keywords: ['ensayo'],
      language: 'es',
    },
    landing: {
      headline: 'Éxito sin compañía: Guía práctica',
      subheadline: 'El diagnóstico',
      benefitBullets: ['El diagnóstico', 'La reconstrucción'],
      cta: 'Consigue tu copia',
    },
    assets: [{ kind: 'epub', url: 'https://blob/l.epub' }],
    aiDisclosure: 'Declaración KDP de contenido IA.',
  };
}

function renderPanel(props: Partial<Parameters<typeof PublishChannelsPanel>[0]> = {}) {
  return render(
    <PublishChannelsPanel
      copy={COPY}
      projectId="p1"
      gumroadEnabled
      gumroadConnected={false}
      {...props}
    />,
  );
}

describe('PublishChannelsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    // jsdom lacks createObjectURL; the Hotmart flow needs it.
    URL.createObjectURL = vi.fn(() => 'blob:zip');
    URL.revokeObjectURL = vi.fn();
  });

  test('conditional Gumroad: disabled note without flag nor token; Hotmart always renders', () => {
    renderPanel({ gumroadEnabled: false, gumroadConnected: false });

    expect(screen.getByTestId('gumroad-disabled')).toBeInTheDocument();
    expect(screen.queryByTestId('gumroad-section')).not.toBeInTheDocument();
    expect(screen.getByTestId('hotmart-section')).toBeInTheDocument();
  });

  test('Gumroad section renders with a stored token even when the flag is off', () => {
    renderPanel({ gumroadEnabled: false, gumroadConnected: true });

    expect(screen.getByTestId('gumroad-section')).toBeInTheDocument();
    expect(screen.getByTestId('gumroad-connected')).toBeInTheDocument();
    expect(screen.queryByTestId('gumroad-disabled')).not.toBeInTheDocument();
  });

  test('connect: saves the token and shows the connected badge', async () => {
    saveGumroadTokenActionMock.mockResolvedValue({ ok: true, data: { connected: true } });
    renderPanel();

    fireEvent.change(screen.getByLabelText(COPY.tokenLabel), { target: { value: 'gr-token' } });
    fireEvent.click(screen.getByRole('button', { name: COPY.saveTokenButton }));

    await waitFor(() => expect(saveGumroadTokenActionMock).toHaveBeenCalledWith({ token: 'gr-token' }));
    await waitFor(() => expect(screen.getByTestId('gumroad-connected')).toBeInTheDocument());
  });

  test('a rejected token surfaces the mapped auth error', async () => {
    saveGumroadTokenActionMock.mockResolvedValue({ ok: false, error: 'auth' });
    renderPanel();

    fireEvent.change(screen.getByLabelText(COPY.tokenLabel), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: COPY.saveTokenButton }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(COPY.errors.auth));
    expect(screen.queryByTestId('gumroad-connected')).not.toBeInTheDocument();
  });

  test('kit preview: sheet with draft badge, landing tab and copy to clipboard', async () => {
    getLaunchKitActionMock.mockResolvedValue({ ok: true, data: kitFixture() });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: COPY.generateKitButton }));

    await waitFor(() => expect(screen.getByTestId('launch-kit-preview')).toBeInTheDocument());
    expect(screen.getByTestId('kit-sheet')).toHaveTextContent('Éxito sin compañía');
    expect(screen.getByTestId('kit-sheet')).toHaveTextContent('El diagnóstico');
    // Derived description → visible draft badge (never silent inventions).
    expect(screen.getByTestId('kit-description-draft')).toBeInTheDocument();
    expect(screen.getByTestId('kit-disclosure')).toHaveTextContent('Declaración KDP');
    expect(screen.getByTestId('kit-assets')).toHaveTextContent('EPUB');

    fireEvent.click(screen.getByRole('button', { name: COPY.landingTab }));
    expect(screen.getByTestId('kit-landing')).toHaveTextContent('Consigue tu copia');

    fireEvent.click(screen.getByRole('button', { name: COPY.copyButton }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Éxito sin compañía: Guía práctica'),
      ),
    );
  });

  test('push: creates the draft with the price and shows the success link', async () => {
    pushToGumroadActionMock.mockResolvedValue({
      ok: true,
      data: { productId: 'abc==', shortUrl: 'https://gum.co/l/exito', published: false },
    });
    renderPanel({ gumroadConnected: true });

    fireEvent.change(screen.getByLabelText(COPY.priceLabel), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: COPY.pushButton }));

    await waitFor(() =>
      expect(pushToGumroadActionMock).toHaveBeenCalledWith({ projectId: 'p1', priceCents: 900 }),
    );
    await waitFor(() => expect(screen.getByTestId('gumroad-push-success')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'https://gum.co/l/exito' })).toBeInTheDocument();
  });

  test('disconnect: drops the token and hides the connected state', async () => {
    removeGumroadTokenActionMock.mockResolvedValue({ ok: true, data: { connected: false } });
    renderPanel({ gumroadConnected: true });

    fireEvent.click(screen.getByRole('button', { name: COPY.removeTokenButton }));

    await waitFor(() => expect(removeGumroadTokenActionMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('gumroad-connected')).not.toBeInTheDocument());
  });

  test('hotmart export zips the package files returned by the action', async () => {
    exportHotmartActionMock.mockResolvedValue({
      ok: true,
      data: {
        channel: 'hotmart',
        instructions: ['paso'],
        files: [{ filename: 'ficha-producto.md', mimeType: 'text/markdown', content: '# Ficha' }],
      },
    });
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: COPY.exportButton }));

    await waitFor(() => expect(exportHotmartActionMock).toHaveBeenCalledWith({ projectId: 'p1' }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });

  test('EN copy renders (locale parity surface)', () => {
    const en = resolveLocaleMessages('en').publishChannels;
    render(
      <PublishChannelsPanel
        copy={en}
        projectId="p1"
        gumroadEnabled={false}
        gumroadConnected={false}
      />,
    );
    expect(screen.getByTestId('publish-channels-panel')).toBeInTheDocument();
    expect(screen.getByTestId('hotmart-section')).toHaveTextContent(en.modeExportBadge);
  });
});
