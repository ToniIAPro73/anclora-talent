import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SemanticDocument } from '@/lib/document/model';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createProposal } from '@/lib/ai/ast-diff-proposal';
import { CoAuthorPanel } from './CoAuthorPanel';
import { KdpDisclosurePanel } from './KdpDisclosurePanel';

const proposeCoAuthorMock = vi.fn();
const acceptProposalMock = vi.fn();
const rejectProposalMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock('@/lib/ai/actions', () => ({
  proposeCoAuthorAction: (formData: FormData) => proposeCoAuthorMock(formData),
  acceptAiProposalAction: (formData: FormData) => acceptProposalMock(formData),
  rejectAiProposalAction: (formData: FormData) => rejectProposalMock(formData),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

const copy = resolveLocaleMessages('es').project;

const CHAPTERS = [
  { key: 'h1', title: 'Capítulo uno' },
  { key: 'h2', title: 'Capítulo dos' },
];

function fixtureProposal() {
  const document: SemanticDocument = {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      { id: 'h1', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo uno' }] },
      { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Texto original.' }] },
    ],
  };
  const paragraph = document.blocks[1] as Extract<SemanticDocument['blocks'][number], { type: 'paragraph' }>;
  return createProposal(
    {
      kind: 'style-rewrite',
      summary: 'Reescribir 1 párrafo(s) de «Capítulo uno» manteniendo las ideas (estilo editorial).',
      operations: [
        {
          type: 'update',
          blockId: 'p1',
          before: paragraph,
          after: { ...paragraph, content: [{ type: 'text' as const, text: 'Texto reescrito.' }] },
        },
      ],
    },
    document,
    { id: 'ai-co-ui-1', createdAt: '2026-01-01T00:00:00.000Z' },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CoAuthorPanel', () => {
  it('stays hidden without a cloud provider (LLM-obligatory, no fake fallback)', () => {
    const { container } = render(
      <CoAuthorPanel projectId="proj-1" chapters={CHAPTERS} cloudAvailable={false} copy={copy} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the chapter selector, the three actions and the ethical copy with a provider', () => {
    render(<CoAuthorPanel projectId="proj-1" chapters={CHAPTERS} cloudAvailable copy={copy} />);

    expect(screen.getByTestId('co-author-panel')).toBeTruthy();
    expect(screen.getByTestId('co-author-chapter-select')).toBeTruthy();
    expect(screen.getByTestId('co-author-action-style')).toBeTruthy();
    expect(screen.getByTestId('co-author-action-architecture')).toBeTruthy();
    expect(screen.getByTestId('co-author-action-summary')).toBeTruthy();
    expect(screen.getByText(/no escritor fantasma/)).toBeTruthy();
  });

  it('proposes with the selected chapter and renders the proposal as an accept/reject card', async () => {
    proposeCoAuthorMock.mockResolvedValue({
      ok: true,
      available: true,
      mode: 'cloud',
      cloudAvailable: true,
      proposal: fixtureProposal(),
    });

    render(<CoAuthorPanel projectId="proj-1" chapters={CHAPTERS} cloudAvailable copy={copy} />);
    fireEvent.change(screen.getByTestId('co-author-chapter-select'), { target: { value: 'h2' } });
    fireEvent.click(screen.getByTestId('co-author-action-style'));

    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeTruthy());
    const formData = proposeCoAuthorMock.mock.calls[0][0] as FormData;
    expect(formData.get('projectId')).toBe('proj-1');
    expect(formData.get('operation')).toBe('style');
    expect(formData.get('chapterKey')).toBe('h2');
    expect(screen.getByTestId('ai-proposal-mode').getAttribute('data-mode')).toBe('cloud');
  });

  it('accepts through the existing action declaring the cloud mode, then refreshes', async () => {
    proposeCoAuthorMock.mockResolvedValue({
      ok: true,
      available: true,
      mode: 'cloud',
      cloudAvailable: true,
      proposal: fixtureProposal(),
    });
    acceptProposalMock.mockResolvedValue({ ok: true });

    render(<CoAuthorPanel projectId="proj-1" chapters={CHAPTERS} cloudAvailable copy={copy} />);
    fireEvent.click(screen.getByTestId('co-author-action-summary'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeTruthy());

    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalled());
    const formData = acceptProposalMock.mock.calls[0][0] as FormData;
    expect(formData.get('mode')).toBe('cloud');
    expect(JSON.parse(String(formData.get('proposal'))).id).toBe('ai-co-ui-1');
  });

  it('rejects without writing and clears the proposal', async () => {
    proposeCoAuthorMock.mockResolvedValue({
      ok: true,
      available: true,
      mode: 'cloud',
      cloudAvailable: true,
      proposal: fixtureProposal(),
    });
    rejectProposalMock.mockResolvedValue({ ok: true });

    render(<CoAuthorPanel projectId="proj-1" chapters={CHAPTERS} cloudAvailable copy={copy} />);
    fireEvent.click(screen.getByTestId('co-author-action-style'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeTruthy());

    fireEvent.click(screen.getByTestId('ai-proposal-reject'));
    expect(rejectProposalMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('ai-proposal-card')).toBeNull());
    expect(acceptProposalMock).not.toHaveBeenCalled();
  });

  it('declares when the LLM returned no valid proposal', async () => {
    proposeCoAuthorMock.mockResolvedValue({
      ok: true,
      available: true,
      mode: 'cloud',
      cloudAvailable: true,
      proposal: null,
    });

    render(<CoAuthorPanel projectId="proj-1" chapters={CHAPTERS} cloudAvailable copy={copy} />);
    fireEvent.click(screen.getByTestId('co-author-action-architecture'));
    await waitFor(() => expect(screen.getByTestId('co-author-empty')).toBeTruthy());
  });
});

describe('KdpDisclosurePanel', () => {
  it('shows the required badge and the AI-assisted declaration text', () => {
    render(
      <KdpDisclosurePanel
        copy={copy}
        disclosure={{
          required: true,
          aiBlockCount: 2,
          humanBlockCount: 5,
          text: 'Declaración de contenido generado con IA (Amazon KDP): este libro contiene contenido creado con asistencia de IA.',
        }}
      />,
    );

    expect(screen.getByTestId('kdp-disclosure-badge').getAttribute('data-required')).toBe('true');
    expect(screen.getByTestId('kdp-disclosure-text').textContent).toContain('asistencia de IA');
  });

  it('shows the exempt badge for 100% human content', () => {
    render(
      <KdpDisclosurePanel
        copy={copy}
        disclosure={{
          required: false,
          aiBlockCount: 0,
          humanBlockCount: 7,
          text: 'Declaración de contenido generado con IA (Amazon KDP): no requerida.',
        }}
      />,
    );

    expect(screen.getByTestId('kdp-disclosure-badge').getAttribute('data-required')).toBe('false');
    expect(screen.getByTestId('kdp-disclosure-badge').textContent).toContain('Exenta');
  });
});
