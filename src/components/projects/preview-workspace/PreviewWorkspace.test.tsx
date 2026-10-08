import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PreviewWorkspace } from './PreviewWorkspace';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

vi.mock('server-only', () => ({}));
// The cover renders through the canonical Fabric preview (not available in jsdom): stand in with its contract.
vi.mock('../design-surface/DesignSurfaceStaticPreview', () => ({
  DesignSurfaceStaticPreview: () => <div data-testid="cover-preview-surface" />,
}));

const copy = resolveLocaleMessages('es').project;
const copyEn = resolveLocaleMessages('en').project;

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


function renderWorkspace(project = makeProject(), messages = copy) {
  return render(<PreviewWorkspace project={project} copy={messages} onExport={vi.fn()} />);
}

describe('PreviewWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  });

  test('renders the shell: rail, toolbar, stage and composition panel; no legacy progress rail', () => {
    renderWorkspace();
    expect(screen.getByTestId('preview-page-rail')).toBeInTheDocument();
    expect(screen.getByTestId('preview-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('preview-stage')).toBeInTheDocument();
    expect(screen.getByTestId('preview-composition-panel')).toBeInTheDocument();
    expect(screen.queryByText('Progreso')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-full-preview-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('preview-mode-document')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('preview-thumb-0')).toHaveAttribute('aria-current', 'page');
  });

  test('metrics come from the composition and the cover/back cover are named, not numbered', () => {
    renderWorkspace();
    const total = Number(screen.getByTestId('preview-metric-total').textContent);
    const content = Number(screen.getByTestId('preview-metric-content').textContent);
    expect(total).toBe(content + 2);
    expect(screen.getByTestId('preview-thumb-0')).toHaveTextContent('Portada');
    expect(screen.getByTestId(`preview-thumb-${total - 1}`)).toHaveTextContent('Contraportada');
    expect(screen.getByTestId('preview-metric-cover')).toHaveTextContent('Incluida');
  });

  test('keyboard: ArrowRight / ArrowLeft / End / Home move through the sequence', () => {
    renderWorkspace();
    const workspace = screen.getByTestId('preview-workspace');
    const total = Number(screen.getByTestId('preview-metric-total').textContent);
    fireEvent.keyDown(workspace, { key: 'ArrowRight' });
    expect(screen.getByTestId('preview-thumb-1')).toHaveAttribute('aria-current', 'page');
    fireEvent.keyDown(workspace, { key: 'ArrowLeft' });
    expect(screen.getByTestId('preview-thumb-0')).toHaveAttribute('aria-current', 'page');
    fireEvent.keyDown(workspace, { key: 'End' });
    expect(screen.getByTestId(`preview-thumb-${total - 1}`)).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('preview-surface-label')).toHaveTextContent('Contraportada');
    fireEvent.keyDown(workspace, { key: 'Home' });
    expect(screen.getByTestId('preview-surface-label')).toHaveTextContent('Portada');
  });

  test('clicking a thumbnail navigates and updates the counter', () => {
    renderWorkspace();
    fireEvent.click(screen.getByTestId('preview-thumb-1'));
    expect(screen.getByTestId('preview-page-input')).toHaveValue(2);
    expect(screen.getByTestId('preview-thumb-1')).toHaveAttribute('aria-selected', 'true');
  });

  test('cover mode shows the canonical cover and back cover surfaces', () => {
    renderWorkspace();
    fireEvent.click(screen.getByTestId('preview-mode-cover'));
    expect(within(screen.getByTestId('preview-sheet')).getByTestId('preview-surface-cover')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('preview-cover-back'));
    expect(within(screen.getByTestId('preview-sheet')).getByTestId('preview-surface-back-cover')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('preview-cover-front'));
    expect(within(screen.getByTestId('preview-sheet')).getByTestId('preview-surface-cover')).toBeInTheDocument();
  });

  test('destinations recompose reflowable content with the device and spreads are unavailable on tablet', async () => {
    renderWorkspace();
    const select = screen.getByTestId('preview-destination');
    await act(async () => { fireEvent.change(select, { target: { value: 'tablet' } }); });
    expect(screen.getByTestId('preview-workspace')).toHaveAttribute('data-destination', 'tablet');
    expect(screen.getByTestId('preview-sheet')).toHaveAttribute('data-page-width', '528');
    expect(screen.getByTestId('preview-mode-spread')).toBeDisabled();
    await act(async () => { fireEvent.change(select, { target: { value: 'ereader' } }); });
    expect(screen.getByTestId('preview-sheet')).toHaveAttribute('data-page-width', '480');
    expect(screen.getByTestId('preview-notice')).toHaveAttribute('data-notice-kind', 'recomposed');
  });

  test('cycling destinations never mutates the project', async () => {
    const project = makeProject();
    const snapshot = JSON.stringify(project);
    renderWorkspace(project);
    const select = screen.getByTestId('preview-destination');
    for (const value of ['desktop', 'tablet', 'ereader', 'desktop', 'print']) {
      await act(async () => { fireEvent.change(select, { target: { value } }); });
    }
    expect(JSON.stringify(project)).toBe(snapshot);
  });

  test('the safe-area check is reported as not checked, never as a pass', () => {
    renderWorkspace();
    const row = screen.getByTestId('preview-preflight-safeArea');
    expect(row).toHaveAttribute('data-status', 'unchecked');
    expect(row).toHaveTextContent('No comprobado');
  });

  test('zoom is bounded and fit restores the fitted value', () => {
    renderWorkspace();
    for (let i = 0; i < 20; i += 1) fireEvent.click(screen.getByTestId('preview-zoom-out'));
    expect(screen.getByTestId('preview-zoom-value')).toHaveTextContent('50%');
    for (let i = 0; i < 20; i += 1) fireEvent.click(screen.getByTestId('preview-zoom-in'));
    expect(screen.getByTestId('preview-zoom-value')).toHaveTextContent('150%');
    fireEvent.click(screen.getByTestId('preview-fit'));
    expect(screen.getByTestId('preview-workspace')).toHaveAttribute('data-fit', 'true');
  });

  test('strings are localized (EN)', () => {
    renderWorkspace(makeProject(), copyEn);
    expect(screen.getByTestId('preview-mode-spread')).toHaveTextContent('Spread');
    expect(screen.getByTestId('preview-fit')).toHaveAttribute('aria-label', 'Fit to area');
    expect(screen.getByTestId('preview-thumb-0')).toHaveTextContent('Front cover');
  });
});
