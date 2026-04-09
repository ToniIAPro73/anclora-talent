import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  test('renders a premium modal shell with visible header, stage, and footer regions', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: 'Nunca más en la sombra' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Nunca más en la sombra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.previewModalClose })).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: copy.previewModalPage })).toBeVisible();
    expect(screen.getByTestId('preview-modal-stage')).toBeVisible();
  });

  test('keeps the close action visible in the premium header', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: copy.previewModalClose })).toBeVisible();
  });

  test('keeps footer navigation visible while the preview body owns scrolling', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const pageInput = screen.getByRole('spinbutton', { name: copy.previewModalPage });

    expect(screen.getByRole('button', { name: copy.previewModalPrevious })).toBeVisible();
    expect(screen.getByRole('button', { name: copy.previewModalNext })).toBeVisible();
    expect(pageInput.closest('footer')).not.toBeNull();
    expect(screen.getByTestId('preview-document-scroll')).toBeInTheDocument();
  });

  test('groups editorial metadata in the header and keeps controls in a separate premium band', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const tocToggle = screen.getByRole('button', { name: copy.previewModalTocHide });

    expect(screen.getByRole('heading', { name: 'Nunca más en la sombra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.previewModalClose })).toBeVisible();
    expect(tocToggle).toHaveAttribute('aria-pressed', 'true');
    expect(tocToggle).toHaveAttribute('aria-expanded', 'true');
    expect(tocToggle).toHaveAttribute('aria-controls', 'preview-modal-sidebar');
    expect(screen.getByRole('button', { name: copy.previewModalSingleView })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: copy.previewModalSpreadView })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: copy.previewModalMobile })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: copy.previewModalTablet })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: copy.previewModalLaptop })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: copy.previewModalZoomOut })).toBeEnabled();
    expect(screen.getByRole('button', { name: copy.previewModalZoomIn })).toBeEnabled();
    expect(screen.getByRole('slider', { name: copy.previewModalZoomSlider })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: copy.previewModalTocHeading })).toBeInTheDocument();
  });

  test('toggles the editorial rail as an accessible complementary region', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const tocToggle = screen.getByRole('button', { name: copy.previewModalTocHide });
    const rail = screen.getByRole('complementary', { name: copy.previewModalTocHeading });

    expect(within(rail).getByRole('heading', { name: copy.previewModalTocHeading })).toBeInTheDocument();
    expect(within(rail).getAllByRole('button')).toHaveLength(2);

    fireEvent.click(tocToggle);

    expect(screen.queryByRole('complementary', { name: copy.previewModalTocHeading })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.previewModalTocShow })).toHaveAttribute('aria-expanded', 'false');
  });

  test('keeps footer actions reachable when the toc opens on mobile', () => {
    mockMatchMedia(false);

    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const mobileTocToggle = screen.getByRole('button', { name: copy.previewModalTocHide });
    const footer = screen.getByTestId('preview-modal-footer');
    const stage = screen.getByTestId('preview-modal-stage');
    const rail = screen.getByRole('complementary', { name: copy.previewModalTocHeading });

    expect(mobileTocToggle).toHaveAttribute('aria-expanded', 'true');
    expect(footer).toBeVisible();
    expect(stage).toContainElement(rail);
    expect(footer).not.toContainElement(rail);

    fireEvent.click(mobileTocToggle);

    expect(screen.queryByRole('complementary', { name: copy.previewModalTocHeading })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.previewModalTocShow })).toHaveAttribute('aria-expanded', 'false');
    expect(footer).toBeVisible();
  });

  test('keeps zoom controls out of the footer action area', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const zoomOutButton = screen.getByRole('button', { name: copy.previewModalZoomOut });
    const zoomInButton = screen.getByRole('button', { name: copy.previewModalZoomIn });
    const zoomSlider = screen.getByRole('slider', { name: copy.previewModalZoomSlider });

    expect(zoomOutButton.closest('footer')).toBeNull();
    expect(zoomInButton.closest('footer')).toBeNull();
    expect(zoomSlider.closest('footer')).toBeNull();
  });

  test('opens in laptop spread mode with fitted zoom', async () => {
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

  test('builds chapter navigation from rendered content pages instead of duplicating toc-page entries', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const toc = screen.getByRole('complementary', { name: copy.previewModalTocHeading });
    const chapterButtons = within(toc).getAllByRole('button');

    expect(chapterButtons).toHaveLength(2);
    expect(within(chapterButtons[0]).getByText('Índice')).toBeInTheDocument();
    expect(within(chapterButtons[1]).getByText('Introducción')).toBeInTheDocument();

    const introPageLabel = within(chapterButtons[1]).getByText(new RegExp(`${copy.previewModalPage}\\s*\\d+`, 'i')).textContent ?? '';
    const expectedPage = Number(introPageLabel.replace(/[^\d]/g, ''));

    fireEvent.click(chapterButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole('spinbutton')).toHaveValue(expectedPage);
    });
  });

  test('navigates one page at a time while spread mode stays active', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: copy.previewModalNext }));
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: copy.previewModalNext }));
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  test('renders content pages using the effective editor margins instead of format defaults', () => {
    window.localStorage.setItem(
      EDITOR_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        device: 'desktop',
        fontSize: '16px',
        margins: { top: 24, bottom: 24, left: 24, right: 24 },
      }),
    );

    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getAllByTestId('preview-page-shell')[0]).toHaveStyle({
      padding: '24px 24px 24px 24px',
    });
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
    const viewport = screen.getByTestId('preview-document-scroll');
    const frameWidth = Number.parseFloat(frame.style.width);
    const frameHeight = Number.parseFloat(frame.style.height);

    expect(stage).toContainElement(viewport);
    expect(viewport).toContainElement(frame);
    expect(frameWidth).toBeGreaterThan(0);
    expect(frameHeight).toBeGreaterThan(0);
    expect(frameWidth).toBeLessThan(1400);
    expect(frameHeight).toBeLessThanOrEqual(700);
    expect(frameWidth).toBeGreaterThan(frameHeight);
  });

  test('keeps the preview viewport non-scrollable until the user changes zoom manually', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByTestId('preview-document-scroll')).toHaveClass('overflow-hidden');
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

  test('renders imported document content inside the preview page content area', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: copy.previewModalNext }));

    expect(screen.getByRole('spinbutton', { name: copy.previewModalPage })).toHaveValue(2);
    expect(screen.getAllByText('Introducción').length).toBeGreaterThan(0);
  });
});
