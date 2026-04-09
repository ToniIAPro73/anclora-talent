import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PreviewModal } from './PreviewModal';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';

const copy = resolveLocaleMessages('es').project;

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
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const element = this as HTMLElement;
      if (element.dataset.previewViewport === 'true') {
        return DOMRect.fromRect({ width: 1400, height: 700 });
      }

      return DOMRect.fromRect({ width: 320, height: 480 });
    });
  });

  test('opens in laptop spread mode with fitted zoom', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByTitle('Two page spread')).toHaveAttribute('data-state', 'active');
    expect(screen.getByTitle('Desktop')).toHaveAttribute('data-state', 'active');

    await waitFor(() => {
      expect(screen.getByText(/^\d+%$/)).not.toHaveTextContent('100%');
    });
  });

  test('keeps outer document scrolling and no page-internal vertical scroll', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByTestId('preview-document-scroll')).toHaveClass('overflow-auto');
    expect(screen.getAllByTestId('preview-page-shell')[0]).not.toHaveClass('overflow-y-auto');
  });

  test('renders all visible page shells without nested vertical scroll regions', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const pageShells = screen.getAllByTestId('preview-page-shell');
    expect(pageShells.length).toBeGreaterThan(0);

    pageShells.forEach((pageShell) => {
      expect(pageShell.className).not.toContain('overflow-y-auto');
    });

    expect(screen.getByTestId('preview-document-scroll').className).toContain('overflow-auto');
  });

  test('builds chapter navigation from rendered content pages instead of duplicating toc-page entries', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const tocList = screen.getByTestId('preview-sidebar-toc');
    const chapterButtons = within(tocList).getAllByRole('button');

    expect(chapterButtons).toHaveLength(2);
    expect(within(chapterButtons[0]).getByText('Índice')).toBeInTheDocument();
    expect(within(chapterButtons[1]).getByText('Introducción')).toBeInTheDocument();

    const introPageLabel = within(chapterButtons[1]).getByText(/p\.\s*\d+/i).textContent ?? '';
    const expectedPage = Number(introPageLabel.replace(/[^\d]/g, ''));

    fireEvent.click(chapterButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole('spinbutton')).toHaveValue(expectedPage);
    });
  });

  test('navigates one page at a time while spread mode stays active', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  test('renders cover and back cover from the built preview structure', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByAltText('Preview cover')).toHaveAttribute('src', 'https://example.com/cover-render.png');
  });

  test('uses a scaled spread frame so the fitted preview does not rely on transform-only layout', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId('preview-spread-frame')).toHaveStyle({ width: '905.52px' });
    });
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

  test('renders preview content with explicit paragraph spacing for imported documents', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    const content = screen.getAllByTestId('preview-page-content').at(-1);

    expect(content).toHaveClass('[&_p]:mb-4');
    expect(content).toHaveClass('[&_p:last-child]:mb-0');
  });
});
