import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PreviewModal } from './PreviewModal';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';
import { EDITOR_PREFERENCES_STORAGE_KEY } from '@/lib/ui-preferences/preferences';

const copy = resolveLocaleMessages('es').project;

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(min-width: 768px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function makeProject(): ProjectRecord {
  return {
    id: 'proj-preview-modal',
    userId: 'user-1',
    workspaceId: null,
    slug: 'preview-modal',
    title: 'Nunca más en la sombra',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    document: {
      id: 'doc-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica',
      author: 'Antonio Ballesteros Alonso',
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 0,
          title: 'Índice',
          blocks: [
            {
              id: 'b-1',
              type: 'paragraph',
              order: 0,
              content: '<h2>Índice</h2><p>Introducción</p>',
            },
          ],
        },
        {
          id: 'ch-2',
          order: 1,
          title: 'Introducción',
          blocks: [
            {
              id: 'b-2',
              type: 'paragraph',
              order: 0,
              content:
                '<h2>Introducción</h2><p>Texto suficientemente largo para ocupar varias líneas sin scroll interno.</p>',
            },
          ],
        },
      ],
      source: null,
    },
    cover: {
      id: 'cover-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      renderedImageUrl: 'https://example.com/cover-render.png',
    },
    backCover: {
      id: 'back-1',
      title: 'Nunca más en la sombra',
      body: 'Texto de contraportada',
      authorBio: 'Bio del autor',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: 'https://example.com/back-cover-render.png',
    },
    assets: [],
  };
}

describe('PreviewModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    mockMatchMedia(true);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const element = this as HTMLElement;
      if (element.dataset.previewViewport === 'true') {
        return DOMRect.fromRect({ width: 1400, height: 700 });
      }

      return DOMRect.fromRect({ width: 320, height: 480 });
    });
  });

  test('renders a compact preview shell with header, stage, and footer navigation', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'Nunca más en la sombra' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Nunca más en la sombra' })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.previewModalClose })).toBeVisible();
    expect(screen.getByTestId('preview-modal-stage')).toBeVisible();
    expect(screen.getByTestId('preview-modal-footer')).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: copy.previewModalPage })).toHaveValue(1);
  });

  test('keeps compact view, format and zoom controls in the top bar only', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const zoomOutButton = screen.getByRole('button', { name: copy.previewModalZoomOut });
    const zoomInButton = screen.getByRole('button', { name: copy.previewModalZoomIn });
    const singleViewButton = screen.getByRole('button', { name: copy.previewModalSingleView });
    const spreadViewButton = screen.getByRole('button', { name: copy.previewModalSpreadView });
    const mobileButton = screen.getByRole('button', { name: copy.previewModalMobile });
    const tabletButton = screen.getByRole('button', { name: copy.previewModalTablet });
    const laptopButton = screen.getByRole('button', { name: copy.previewModalLaptop });

    expect(singleViewButton).toHaveAttribute('aria-pressed', 'false');
    expect(spreadViewButton).toHaveAttribute('aria-pressed', 'true');
    expect(mobileButton).toHaveAttribute('aria-pressed', 'false');
    expect(tabletButton).toHaveAttribute('aria-pressed', 'false');
    expect(laptopButton).toHaveAttribute('aria-pressed', 'true');
    expect(zoomOutButton.closest('footer')).toBeNull();
    expect(zoomInButton.closest('footer')).toBeNull();
  });

  test('opens in laptop spread mode with fitted zoom and allows switching to single page mode', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: copy.previewModalSpreadView })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: copy.previewModalLaptop })).toHaveAttribute('aria-pressed', 'true');

    await waitFor(() => {
      expect(screen.getByText(/^\d+%$/)).not.toHaveTextContent('100%');
    });

    fireEvent.click(screen.getByRole('button', { name: copy.previewModalSingleView }));

    expect(screen.getByRole('button', { name: copy.previewModalSingleView })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: copy.previewModalSpreadView })).toHaveAttribute('aria-pressed', 'false');
  });

  test('initializes preview format from saved editor preferences', () => {
    window.localStorage.setItem(
      EDITOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        device: 'tablet',
        fontSize: '16px',
        margins: { top: 24, bottom: 24, left: 24, right: 24 },
      }),
    );

    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: copy.previewModalTablet })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: copy.previewModalLaptop })).toHaveAttribute('aria-pressed', 'false');
  });

  test('allows editing the current page number and clamps it to the valid range', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const pageInput = screen.getByRole('spinbutton', { name: copy.previewModalPage });
    const maxPage = Number(pageInput.getAttribute('max'));

    fireEvent.change(pageInput, { target: { value: '999' } });
    fireEvent.blur(pageInput);

    await waitFor(() => {
      expect(pageInput).toHaveValue(maxPage);
    });

    fireEvent.change(pageInput, { target: { value: '0' } });
    fireEvent.keyDown(pageInput, { key: 'Enter' });

    await waitFor(() => {
      expect(pageInput).toHaveValue(1);
    });
  });

  test('uses compact navigation buttons to move through the preview and supports returning back', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const previousButton = screen.getByRole('button', { name: copy.previewModalPrevious });
    const nextButton = screen.getByRole('button', { name: copy.previewModalNext });
    const pageInput = screen.getByRole('spinbutton', { name: copy.previewModalPage });

    expect(previousButton).toBeDisabled();

    fireEvent.click(nextButton);
    await waitFor(() => expect(pageInput).toHaveValue(2));

    fireEvent.click(nextButton);
    await waitFor(() => expect(pageInput).toHaveValue(3));

    fireEvent.click(previousButton);
    await waitFor(() => expect(pageInput).toHaveValue(1));
  });

  test('renders cover and back cover from the built preview structure', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByAltText(copy.previewModalCoverAlt)).toHaveAttribute('src', 'https://example.com/cover-render.png');
  });

  test('uses a scaled spread frame so the fitted preview does not rely on transform-only layout', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-spread-frame')).toBeInTheDocument();
    });

    const stage = screen.getByTestId('preview-modal-stage');
    const frame = screen.getByTestId('preview-spread-frame');
    const frameWidth = Number.parseFloat(frame.style.width);
    const frameHeight = Number.parseFloat(frame.style.height);

    expect(stage).toContainElement(frame);
    expect(frameWidth).toBeGreaterThan(0);
    expect(frameHeight).toBeGreaterThan(0);
    expect(frameWidth).toBeLessThan(1400);
    expect(frameHeight).toBeLessThanOrEqual(700);
    expect(frameHeight).toBeGreaterThan(frameWidth);
  });

  test('does not re-render a hidden subtitle from saved cover surface state', () => {
    const project = makeProject();
    const coverSurface = createDefaultSurfaceState('cover');
    coverSurface.fields.title.value = 'Nunca mas en la sombra';
    coverSurface.fields.title.visible = true;
    coverSurface.fields.subtitle.value = '';
    coverSurface.fields.subtitle.visible = false;
    coverSurface.fields.author.value = 'Antonio Ballesteros Alonso';
    coverSurface.fields.author.visible = true;

    render(
      <PreviewModal
        project={{
          ...project,
          cover: {
            ...project.cover,
            subtitle: 'Subtitulo antiguo',
            renderedImageUrl: null,
            surfaceState: coverSurface,
          },
        }}
        copy={copy}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByText('Subtitulo antiguo')).not.toBeInTheDocument();
  });

  test('renders imported document content inside the preview page content area', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: copy.previewModalNext }));

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: copy.previewModalPage })).toHaveValue(2);
    });

    expect(screen.getAllByText('Introducción').length).toBeGreaterThan(0);
  });
});
