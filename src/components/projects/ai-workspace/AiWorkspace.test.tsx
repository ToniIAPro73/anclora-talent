import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { SemanticDocument } from '@/lib/document/model';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createProposal } from '@/lib/ai/ast-diff-proposal';
import { AiWorkspace, type AiWorkspaceProps } from './AiWorkspace';

vi.mock('server-only', () => ({}));

const proposeCoAuthorMock = vi.fn();
const analyzeCoherenceMock = vi.fn();
const proposeViolationFixMock = vi.fn();
const acceptProposalMock = vi.fn();
const rejectProposalMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock('@/lib/ai/actions', () => ({
  proposeCoAuthorAction: (formData: FormData) => proposeCoAuthorMock(formData),
  analyzeCoherenceAction: (formData: FormData) => analyzeCoherenceMock(formData),
  proposeViolationFixAction: (formData: FormData) => proposeViolationFixMock(formData),
  acceptAiProposalAction: (formData: FormData) => acceptProposalMock(formData),
  rejectAiProposalAction: (formData: FormData) => rejectProposalMock(formData),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

const copy = resolveLocaleMessages('es').project;
const copyEn = resolveLocaleMessages('en').project;

const CHAPTERS = [
  { key: 'h1', title: 'Capítulo uno', words: 120, blocks: 6 },
  { key: 'h2', title: 'Capítulo dos', words: 80, blocks: 4 },
];

function documentWith(paragraphs: number): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      { id: 'h1', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo uno' }] },
      ...Array.from({ length: paragraphs }, (_, index) => ({ id: `p${index + 1}`, type: 'paragraph' as const, content: [{ type: 'text' as const, text: `Texto original ${index + 1}.` }] })),
    ],
  };
}

function proposalFixture(updates = 1, id = 'ai-co-ui-1') {
  const document = documentWith(updates);
  const operations = document.blocks.slice(1).map((block) => {
    const paragraph = block as Extract<SemanticDocument['blocks'][number], { type: 'paragraph' }>;
    return {
      type: 'update' as const,
      blockId: paragraph.id,
      before: paragraph,
      after: { ...paragraph, content: [{ type: 'text' as const, text: `Texto reescrito ${paragraph.id}.` }] },
    };
  });
  return createProposal(
    { kind: 'style-rewrite', summary: 'Reescribir párrafos de «Capítulo uno» manteniendo las ideas.', operations },
    document,
    { id, createdAt: '2026-01-01T00:00:00.000Z' },
  );
}

function renderWorkspace(overrides: Partial<AiWorkspaceProps> = {}, messages = copy) {
  return render(
    <AiWorkspace
      projectId="proj-1"
      projectTitle="El mapa de las formas"
      language="es"
      copy={messages}
      locale="es"
      chapters={CHAPTERS}
      totalWords={200}
      totalBlocks={10}
      cloudAvailable
      editable
      history={[]}
      voice={{ active: false }}
      violations={[]}
      checks={[]}
      {...overrides}
    />,
  );
}

const coAuthorReady = (proposal = proposalFixture()) => ({ ok: true, available: true, mode: 'cloud', cloudAvailable: true, proposal });

beforeEach(() => {
  vi.clearAllMocks();
  rejectProposalMock.mockResolvedValue({ ok: true });
});

describe('AiWorkspace — shell and idle state', () => {
  it('is a task workspace: real operations only, the human-control tagline, no mock content', () => {
    renderWorkspace();
    expect(screen.getByTestId('ai-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('ai-tagline')).toHaveTextContent('La IA propone. Tú decides qué se aplica.');
    for (const id of ['style', 'architecture', 'summary', 'coherence', 'fixes']) expect(screen.getByTestId(`ai-tool-${id}`)).toBeInTheDocument();
    expect(screen.getByTestId('ai-idle')).toHaveTextContent('Selecciona una tarea para generar una propuesta.');
    expect(screen.queryByText(/Estrategias Editoriales para el Talento Moderno/)).toBeNull();
    expect(screen.queryByTestId('ai-assistant-generate-button')).toBeNull();
    // Not a chat: no free prompt field.
    expect(screen.queryByPlaceholderText(/Pregunta|Escribe/i)).toBeNull();
  });

  it('shows the context with real numbers and the editorial voice indicator', () => {
    renderWorkspace({ voice: { active: true, name: 'Voz Anclora' } });
    expect(screen.getByTestId('ai-context-voice')).toHaveTextContent('Voz editorial aplicada · Voz Anclora');
    expect(screen.getByTestId('ai-context-processing')).toHaveTextContent('En la nube');
    expect(screen.getByTestId('ai-context')).toHaveTextContent('200 palabras');
    expect(screen.getByTestId('ai-context')).toHaveTextContent('10 bloques');
  });
});

describe('AiWorkspace — co-author tasks', () => {
  it('style: runs the style operation on the selected chapter and renders a reviewable proposal', async () => {
    proposeCoAuthorMock.mockResolvedValue(coAuthorReady());
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-style'));
    expect(screen.getByTestId('ai-task')).toHaveTextContent('Mejora claridad y fluidez manteniendo las ideas originales.');
    fireEvent.change(screen.getByTestId('co-author-chapter-select'), { target: { value: 'h2' } });
    fireEvent.click(screen.getByTestId('ai-run'));

    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeInTheDocument());
    const formData = proposeCoAuthorMock.mock.calls[0][0] as FormData;
    expect(formData.get('projectId')).toBe('proj-1');
    expect(formData.get('operation')).toBe('style');
    expect(formData.get('chapterKey')).toBe('h2');
    expect(screen.getByTestId('ai-proposal-mode')).toHaveAttribute('data-mode', 'cloud');
    expect(screen.getByTestId('ai-proposal-mode')).toHaveTextContent('Operación procesada en la nube');
    expect(screen.getByTestId('ai-proposal-target')).toHaveTextContent('Capítulo dos');
    expect(screen.getByTestId('ai-proposal-impact')).toHaveTextContent('1 bloque modificado');
    expect(screen.getByTestId('ai-proposal-diff')).toHaveTextContent('Antes');
    expect(screen.getByTestId('ai-proposal-diff')).toHaveTextContent('Después');
    expect(screen.getByTestId('ai-proposal-diff')).toHaveTextContent('Modificado');
  });

  it('architecture: runs on the chapter; summary: document-wide, without a chapter key', async () => {
    proposeCoAuthorMock.mockResolvedValue(coAuthorReady());
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-architecture'));
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(proposeCoAuthorMock).toHaveBeenCalledTimes(1));
    expect((proposeCoAuthorMock.mock.calls[0][0] as FormData).get('operation')).toBe('architecture');
    expect((proposeCoAuthorMock.mock.calls[0][0] as FormData).get('chapterKey')).toBe('h1');

    fireEvent.click(screen.getByTestId('ai-tool-summary'));
    expect(screen.getByTestId('ai-task')).toHaveTextContent('Documento completo');
    expect(screen.queryByTestId('co-author-chapter-select')).toBeNull();
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(proposeCoAuthorMock).toHaveBeenCalledTimes(2));
    const summaryForm = proposeCoAuthorMock.mock.calls[1][0] as FormData;
    expect(summaryForm.get('operation')).toBe('summary');
    expect(summaryForm.get('chapterKey')).toBeNull();
  });

  it('never runs by itself: selecting a task only describes it', () => {
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-style'));
    expect(proposeCoAuthorMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('ai-main')).toHaveAttribute('aria-busy', 'false');
  });

  it('shows an indeterminate running state with the target and the cloud indicator, and blocks duplicate runs', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    proposeCoAuthorMock.mockReturnValue(new Promise((done) => { resolve = done; }));
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-style'));
    fireEvent.click(screen.getByTestId('ai-run'));
    expect(await screen.findByTestId('ai-running')).toHaveTextContent('Trabajando sobre Capítulo uno');
    expect(screen.getByTestId('ai-running')).toHaveTextContent('Procesamiento en la nube');
    expect(screen.getByTestId('ai-main')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('ai-live')).toHaveTextContent('Generando propuesta.');
    expect(screen.getByTestId('ai-run')).toBeDisabled();
    expect(screen.getByTestId('ai-tool-summary')).toBeDisabled();
    await act(async () => { resolve(coAuthorReady()); });
    await waitFor(() => expect(screen.getByTestId('ai-live')).toHaveTextContent('Propuesta lista para revisar.'));
  });

  it('declares when the LLM returned no valid proposal, and failures', async () => {
    proposeCoAuthorMock.mockResolvedValueOnce({ ok: true, available: true, mode: 'cloud', cloudAvailable: true, proposal: null });
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-architecture'));
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(screen.getByTestId('co-author-empty')).toBeInTheDocument());

    proposeCoAuthorMock.mockRejectedValueOnce(new Error('network'));
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(screen.getByTestId('ai-error')).toHaveTextContent('No se pudo generar la propuesta.'));
  });
});

describe('AiWorkspace — governance gate', () => {
  async function ready() {
    proposeCoAuthorMock.mockResolvedValue(coAuthorReady());
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-style'));
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeInTheDocument());
  }

  it('does not write anything until the human accepts', async () => {
    await ready();
    expect(acceptProposalMock).not.toHaveBeenCalled();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('accept: goes through the server action declaring the cloud mode, then refreshes', async () => {
    acceptProposalMock.mockResolvedValue({ ok: true });
    await ready();
    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    await waitFor(() => expect(routerRefreshMock).toHaveBeenCalled());
    const formData = acceptProposalMock.mock.calls[0][0] as FormData;
    expect(formData.get('mode')).toBe('cloud');
    expect(formData.get('projectId')).toBe('proj-1');
    expect(JSON.parse(String(formData.get('proposal'))).id).toBe('ai-co-ui-1');
    expect(screen.getByTestId('ai-proposal-applied')).toHaveTextContent('Cambios aplicados al documento.');
    expect(screen.queryByTestId('ai-proposal-accept')).toBeNull();
  });

  it('applying: disables duplicate decisions and announces busy state', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    acceptProposalMock.mockReturnValue(new Promise((done) => { resolve = done; }));
    await ready();
    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-accept')).toBeDisabled());
    expect(screen.getByTestId('ai-proposal-accept')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('ai-proposal-reject')).toBeDisabled();
    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    expect(acceptProposalMock).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ ok: true }); });
  });

  it('reject: discards without writing', async () => {
    await ready();
    fireEvent.click(screen.getByTestId('ai-proposal-reject'));
    expect(rejectProposalMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ai-proposal-rejected')).toHaveTextContent('El documento no ha cambiado.');
    expect(screen.queryByTestId('ai-proposal-card')).toBeNull();
    expect(acceptProposalMock).not.toHaveBeenCalled();
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('stale: the write is refused, the user can only regenerate or discard', async () => {
    acceptProposalMock.mockResolvedValue({ ok: false, error: 'stale' });
    await ready();
    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-stale')).toBeInTheDocument());
    expect(screen.getByTestId('ai-proposal-stale')).toHaveTextContent('El documento ha cambiado desde que se generó esta propuesta.');
    expect(screen.queryByTestId('ai-proposal-accept')).toBeNull();
    expect(routerRefreshMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('ai-proposal-regenerate'));
    await waitFor(() => expect(proposeCoAuthorMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-accept')).toBeInTheDocument());
  });

  it('stale → discard removes the proposal', async () => {
    acceptProposalMock.mockResolvedValue({ ok: false, error: 'stale' });
    await ready();
    fireEvent.click(screen.getByTestId('ai-proposal-accept'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-discard')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('ai-proposal-discard'));
    expect(screen.queryByTestId('ai-proposal-card')).toBeNull();
  });
});

describe('AiWorkspace — large proposals', () => {
  it('groups by chapter, summarises the impact and collapses long diffs', async () => {
    proposeCoAuthorMock.mockResolvedValue(coAuthorReady(proposalFixture(30, 'ai-big')));
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-style'));
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeInTheDocument());
    expect(screen.getByTestId('ai-proposal-impact')).toHaveTextContent('30 bloques modificados');
    expect(screen.getByTestId('ai-proposal-affected')).toHaveTextContent('30');
    const toggle = within(screen.getByTestId('ai-change-group')).getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByTestId('ai-change')).toHaveLength(0);
    fireEvent.click(toggle);
    expect(screen.getAllByTestId('ai-change')).toHaveLength(30);
  });
});

describe('AiWorkspace — availability', () => {
  it('without a provider: declares it, keeps cloud tasks off and offers no fake output', () => {
    renderWorkspace({ cloudAvailable: false });
    expect(screen.getByTestId('ai-unavailable')).toHaveTextContent('Asistente IA no disponible');
    expect(screen.getByTestId('ai-tool-style')).toBeDisabled();
    expect(screen.getByTestId('ai-tool-architecture')).toBeDisabled();
    expect(screen.getByTestId('ai-tool-summary')).toBeDisabled();
    expect(screen.getByTestId('ai-tool-coherence')).not.toBeDisabled();
    expect(screen.getByTestId('ai-context-processing')).toHaveTextContent('Sin proveedor de IA');
    expect(proposeCoAuthorMock).not.toHaveBeenCalled();
  });

  it('fixed-layout PDF: every operation is off and explained', () => {
    renderWorkspace({ editable: false, chapters: [] });
    expect(screen.getByTestId('ai-fixed-pdf')).toHaveTextContent('Esta operación requiere un documento editable.');
    for (const id of ['style', 'architecture', 'summary', 'coherence', 'fixes']) expect(screen.getByTestId(`ai-tool-${id}`)).toBeDisabled();
  });
});

describe('AiWorkspace — coherence and document problems', () => {
  it('coherence: local analysis with real issues and a reviewable fix proposal', async () => {
    analyzeCoherenceMock.mockResolvedValue({
      ok: true,
      mode: 'local',
      cloudAvailable: false,
      issues: [{ type: 'broken-ref', blockId: 'p1', targetId: 'fig-9' }],
      proposals: [proposalFixture(1, 'ai-coh-1')],
    });
    renderWorkspace({ cloudAvailable: false });
    fireEvent.click(screen.getByTestId('ai-tool-coherence'));
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(screen.getByTestId('ai-coherence-issues')).toBeInTheDocument());
    expect(screen.getByTestId('ai-coherence-issues')).toHaveTextContent('Referencia rota a «fig-9»');
    expect(screen.getByTestId('ai-proposal-mode')).toHaveAttribute('data-mode', 'local');
  });

  it('coherence without issues says so', async () => {
    analyzeCoherenceMock.mockResolvedValue({ ok: true, mode: 'local', cloudAvailable: false, issues: [], proposals: [] });
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-coherence'));
    fireEvent.click(screen.getByTestId('ai-run'));
    await waitFor(() => expect(screen.getByTestId('ai-coherence-empty')).toBeInTheDocument());
  });

  it('fixes: lists only fixable warnings and proposes per item through the structural assistant', async () => {
    proposeViolationFixMock.mockResolvedValue({ ok: true, mode: 'local', cloudAvailable: false, proposals: [proposalFixture(1, 'ai-fix-1')] });
    renderWorkspace({ violations: [{ page: 1, blockId: 'p1', rule: 'widowsOrphans', message: 'Línea viuda en la página 2' }, { page: 1, blockId: 'p2', rule: 'other.rule', message: 'No corregible' }] });
    fireEvent.click(screen.getByTestId('ai-tool-fixes'));
    expect(screen.getAllByTestId('ai-fix-candidate')).toHaveLength(1);
    expect(screen.getByTestId('ai-fixes')).toHaveTextContent('Línea viuda en la página 2');
    expect(screen.getByTestId('ai-fixes')).not.toHaveTextContent('No corregible');
    fireEvent.click(screen.getByTestId('ai-fix-propose'));
    await waitFor(() => expect(screen.getByTestId('ai-proposal-card')).toBeInTheDocument());
    const formData = proposeViolationFixMock.mock.calls[0][0] as FormData;
    expect(JSON.parse(String(formData.get('payload'))).violation.rule).toBe('widowsOrphans');
  });

  it('fixes: empty state when nothing is fixable', () => {
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-fixes'));
    expect(screen.getByTestId('ai-fixes-empty')).toBeInTheDocument();
  });
});

describe('AiWorkspace — history and i18n', () => {
  it('history is an audit of accepted operations, not a conversation', () => {
    renderWorkspace({
      history: [{ id: 'a1', kind: 'style-rewrite', summary: 'Reescritura de estilo de «Capítulo uno»', mode: 'cloud', affectedBlocks: 3, createdAt: '2026-01-02T10:00:00.000Z' }],
    });
    const item = screen.getByTestId('ai-history-item');
    expect(item).toHaveTextContent('Reescritura de estilo');
    expect(item).toHaveTextContent('Aplicada');
    expect(item).toHaveTextContent('3 bloques');
    expect(screen.getByTestId('ai-history')).toHaveTextContent('Solo constan las operaciones aceptadas.');
  });

  it('history empty state does not fabricate records', () => {
    renderWorkspace();
    expect(screen.getByTestId('ai-history-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-history-item')).toBeNull();
  });

  it('is fully localized (EN)', () => {
    renderWorkspace({}, copyEn);
    expect(screen.getByTestId('ai-tagline')).toHaveTextContent('AI proposes. You decide what gets applied.');
    expect(screen.getByTestId('ai-tool-style')).toHaveTextContent('Improve style');
    expect(screen.getByTestId('ai-idle')).toHaveTextContent('Select a task to generate a proposal.');
  });

  it('keyboard/ARIA: tools are pressable buttons and targets are a listbox with selection', () => {
    renderWorkspace();
    fireEvent.click(screen.getByTestId('ai-tool-style'));
    expect(screen.getByTestId('ai-tool-style')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const options = screen.getAllByTestId('ai-target-chapter');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(options[1]);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect((screen.getByTestId('co-author-chapter-select') as HTMLSelectElement).value).toBe('h2');
  });
});
