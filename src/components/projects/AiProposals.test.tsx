import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { SemanticDocument } from '@/lib/document/model';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createProposal, type AiProposal } from '@/lib/ai/ast-diff-proposal';
import { DocumentHealthPanel } from './DocumentHealthPanel';

const proposeFixMock = vi.fn();
const acceptProposalMock = vi.fn();
const rejectProposalMock = vi.fn();
const analyzeCoherenceMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock('@/lib/ai/actions', () => ({
  proposeViolationFixAction: (formData: FormData) => proposeFixMock(formData),
  acceptAiProposalAction: (formData: FormData) => acceptProposalMock(formData),
  rejectAiProposalAction: (formData: FormData) => rejectProposalMock(formData),
  analyzeCoherenceAction: (formData: FormData) => analyzeCoherenceMock(formData),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

import type { ComposeViolation } from '@/lib/compose/compose';

const copy = resolveLocaleMessages('es').project;

function proposalDocument(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Corto.' }] },
      { id: 'p2', type: 'paragraph', content: [{ type: 'text', text: 'Otro corto.' }] },
    ],
  };
}

function mergeProposal(): AiProposal {
  const document = proposalDocument();
  const [first, second] = document.blocks as [
    Extract<SemanticDocument['blocks'][number], { type: 'paragraph' }>,
    Extract<SemanticDocument['blocks'][number], { type: 'paragraph' }>,
  ];
  return createProposal(
    {
      kind: 'merge-paragraphs',
      summary: 'Unir párrafos cortos',
      operations: [
        {
          type: 'update',
          blockId: 'p1',
          before: first,
          after: { ...first, content: [{ type: 'text' as const, text: 'Corto. Otro corto.' }] },
        },
        { type: 'remove', block: second, previousBlockId: 'p1' },
      ],
    },
    document,
    { id: 'ai-ui-1', createdAt: '2026-01-01T00:00:00.000Z' },
  );
}

function advisoryProposal(): AiProposal {
  return createProposal(
    { kind: 'advisory', summary: 'Bloque demasiado grande: revísalo manualmente', operations: [] },
    proposalDocument(),
    { id: 'ai-ui-2', createdAt: '2026-01-01T00:00:00.000Z' },
  );
}

function fakeProject(provenance?: Record<string, 'human' | 'ai'>): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'book',
    title: 'Book',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'doc-1',
      title: 'Book',
      subtitle: '',
      author: 'Anon',
      language: 'es',
      chapters: [],
      rules: null,
      provenance: provenance ?? null,
    },
    cover: {
      id: 'c1',
      title: 'Book',
      subtitle: '',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'b1',
      title: 'Book',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

const VIOLATION: ComposeViolation = {
  page: 0,
  blockId: 'p1',
  rule: 'widowsOrphans',
  message: 'Paragraph split with fewer than 2 lines on one side of the boundary.',
};

beforeEach(() => {
  vi.clearAllMocks();
  proposeFixMock.mockResolvedValue({
    ok: true,
    mode: 'local',
    cloudAvailable: false,
    proposals: [mergeProposal()],
  });
  acceptProposalMock.mockResolvedValue({ ok: true });
  rejectProposalMock.mockResolvedValue({ ok: true });
  analyzeCoherenceMock.mockResolvedValue({
    ok: true,
    mode: 'local',
    cloudAvailable: false,
    issues: [{ type: 'broken-ref', blockId: 'p1', targetId: 'fig-gone' }],
    proposals: [mergeProposal()],
  });
});

describe('DocumentHealthPanel — propuestas IA', () => {
  it('proponer → tarjeta con diff legible, copy ético y aceptar/rechazar', async () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[VIOLATION]} copy={copy} />);

    fireEvent.click(screen.getByTestId('ai-propose-fix-v-0'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeInTheDocument());

    expect(proposeFixMock).toHaveBeenCalledTimes(1);
    const formData = proposeFixMock.mock.calls[0][0] as FormData;
    expect(formData.get('projectId')).toBe('proj-1');
    expect(JSON.parse(String(formData.get('payload'))).violation.rule).toBe('widowsOrphans');

    // Ethical copy + readable diff (before/after) + local mode badge.
    expect(screen.getAllByText(copy.aiEthicalCopy).length).toBeGreaterThan(0);
    expect(screen.getByTestId('ai-proposal-mode')).toHaveTextContent(copy.aiModeLocal);
    expect(screen.getByTestId('ai-proposal-diff')).toBeInTheDocument();
    expect(screen.getByTestId('ai-proposal-diff')).toHaveTextContent(copy.aiDiffBefore);
    expect(screen.getByTestId('ai-proposal-diff')).toHaveTextContent(copy.aiDiffAfter);
    expect(screen.getByTestId('ai-proposal-accept')).toBeInTheDocument();
    expect(screen.getByTestId('ai-proposal-reject')).toBeInTheDocument();
  });

  it('aceptar aplica por la ruta existente y refresca', async () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[VIOLATION]} copy={copy} />);
    fireEvent.click(screen.getByTestId('ai-propose-fix-v-0'));
    await waitFor(() => screen.getByTestId('ai-proposal-accept'));

    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    await waitFor(() => expect(acceptProposalMock).toHaveBeenCalledTimes(1));

    const formData = acceptProposalMock.mock.calls[0][0] as FormData;
    expect(formData.get('projectId')).toBe('proj-1');
    const proposal = JSON.parse(String(formData.get('proposal')));
    expect(proposal.provenance).toBe('ai');
    expect(proposal.kind).toBe('merge-paragraphs');
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalled());
  });

  it('rechazar descarta la propuesta sin aplicar', async () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[VIOLATION]} copy={copy} />);
    fireEvent.click(screen.getByTestId('ai-propose-fix-v-0'));
    await waitFor(() => screen.getByTestId('ai-proposal-reject'));

    fireEvent.click(screen.getByTestId('ai-proposal-reject'));
    await waitFor(() => expect(rejectProposalMock).toHaveBeenCalledTimes(1));
    expect(acceptProposalMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ai-proposal-card')).not.toBeInTheDocument();
  });

  it('declara el modo nube cuando la propuesta viene del LLM', async () => {
    proposeFixMock.mockResolvedValue({
      ok: true,
      mode: 'cloud',
      cloudAvailable: true,
      proposals: [mergeProposal()],
    });
    render(<DocumentHealthPanel project={fakeProject()} violations={[VIOLATION]} copy={copy} />);
    fireEvent.click(screen.getByTestId('ai-propose-fix-v-0'));
    await waitFor(() => screen.getByTestId('ai-proposal-mode'));

    expect(screen.getByTestId('ai-proposal-mode')).toHaveTextContent(copy.aiModeCloud);
    expect(screen.getByTestId('ai-proposal-mode')).toHaveAttribute('data-mode', 'cloud');
  });

  it('advisory (bloque oversized): sin botón aceptar', async () => {
    proposeFixMock.mockResolvedValue({
      ok: true,
      mode: 'local',
      cloudAvailable: false,
      proposals: [advisoryProposal()],
    });
    render(<DocumentHealthPanel project={fakeProject()} violations={[VIOLATION]} copy={copy} />);
    fireEvent.click(screen.getByTestId('ai-propose-fix-v-0'));
    await waitFor(() => screen.getByTestId('ai-proposal-card'));

    expect(screen.getByTestId('ai-proposal-advisory')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-proposal-accept')).not.toBeInTheDocument();
  });

  it('aceptar sobre documento cambiado muestra el aviso de propuesta obsoleta', async () => {
    acceptProposalMock.mockResolvedValue({ ok: false, error: 'stale' });
    render(<DocumentHealthPanel project={fakeProject()} violations={[VIOLATION]} copy={copy} />);
    fireEvent.click(screen.getByTestId('ai-propose-fix-v-0'));
    await waitFor(() => screen.getByTestId('ai-proposal-accept'));

    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    await waitFor(() => screen.getByTestId('ai-proposal-stale'));
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('agente de coherencia: lista incidencias y propone fixes', async () => {
    render(<DocumentHealthPanel project={fakeProject()} violations={[]} copy={copy} />);
    fireEvent.click(screen.getByTestId('ai-coherence-button'));

    await waitFor(() => expect(screen.getByTestId('ai-coherence-issues')).toBeInTheDocument());
    expect(analyzeCoherenceMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ai-coherence-issues')).toHaveTextContent(
      copy.aiIssueBrokenRef.replace('{target}', 'fig-gone'),
    );
    expect(screen.getByTestId('ai-proposal-card')).toBeInTheDocument();
  });

  it('muestra el resumen de procedencia con badge IA', () => {
    render(
      <DocumentHealthPanel
        project={fakeProject({ h1: 'human', p1: 'ai' })}
        violations={[]}
        copy={copy}
      />,
    );
    const summary = screen.getByTestId('ai-provenance-summary');
    expect(summary).toHaveTextContent(
      copy.aiProvenanceSummary.replace('{ai}', '1').replace('{human}', '1'),
    );
    expect(screen.getByTestId('ai-provenance-badge')).toBeInTheDocument();
  });

  it('violations no elegibles no muestran botón de fix', () => {
    render(
      <DocumentHealthPanel
        project={fakeProject()}
        violations={[{ page: 0, blockId: 'x', rule: 'numbering', message: 'otra' }]}
        copy={copy}
      />,
    );
    expect(screen.queryByTestId('ai-propose-fix-v-0')).not.toBeInTheDocument();
  });
});
