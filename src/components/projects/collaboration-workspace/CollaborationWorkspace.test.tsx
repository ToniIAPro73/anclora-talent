import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const {
  inviteCollaboratorActionMock,
  revokeCollaboratorActionMock,
  cancelInvitationActionMock,
  addBlockCommentActionMock,
  replyBlockCommentActionMock,
  resolveBlockCommentThreadActionMock,
  proposeEditorSuggestionActionMock,
  decideEditorSuggestionActionMock,
  refreshMock,
} = vi.hoisted(() => ({
  inviteCollaboratorActionMock: vi.fn(),
  revokeCollaboratorActionMock: vi.fn(),
  cancelInvitationActionMock: vi.fn(),
  addBlockCommentActionMock: vi.fn(),
  replyBlockCommentActionMock: vi.fn(),
  resolveBlockCommentThreadActionMock: vi.fn(),
  proposeEditorSuggestionActionMock: vi.fn(),
  decideEditorSuggestionActionMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/lib/collaboration/actions', () => ({
  inviteCollaboratorAction: inviteCollaboratorActionMock,
  revokeCollaboratorAction: revokeCollaboratorActionMock,
  cancelInvitationAction: cancelInvitationActionMock,
  addBlockCommentAction: addBlockCommentActionMock,
  replyBlockCommentAction: replyBlockCommentActionMock,
  resolveBlockCommentThreadAction: resolveBlockCommentThreadActionMock,
  acceptInvitationAction: vi.fn(),
}));

vi.mock('@/lib/collaboration/suggestion-actions', () => ({
  proposeEditorSuggestionAction: proposeEditorSuggestionActionMock,
  decideEditorSuggestionAction: decideEditorSuggestionActionMock,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { CollaborationView } from '@/lib/collaboration/view';
import type { CollaboratorRole } from '@/lib/collaboration/model';
import { CollaborationWorkspace } from './CollaborationWorkspace';

const COPY = resolveLocaleMessages('es').collaboration;
const COPY_EN = resolveLocaleMessages('en').collaboration;
const ISO = '2026-08-04T12:00:00.000Z';

function viewFixture(viewerRole: CollaboratorRole, overrides: Partial<CollaborationView> = {}): CollaborationView {
  return {
    viewerRole,
    viewerId: 'viewer',
    owner: { id: 'owner', fullName: 'Autora Principal', email: 'autora@example.com' },
    collaborators: [
      { id: 'col-1', userId: 'user-2', role: 'editor', fullName: 'Editor Uno', email: 'editor@example.com', createdAt: ISO },
    ],
    invitations: [{ id: 'inv-1', email: 'disenador@example.com', role: 'designer', expiresAt: ISO, createdAt: ISO }],
    blockAnchoring: true,
    outline: [
      {
        index: 0,
        title: 'Capítulo uno',
        blocks: [
          { blockId: 'block-1', kind: 'paragraph', text: 'Texto del bloque con errata' },
          { blockId: 'block-2', kind: 'paragraph', text: 'Segundo párrafo sin comentarios' },
        ],
      },
      { index: 1, title: 'Capítulo dos', blocks: [{ blockId: 'block-9', kind: 'paragraph', text: 'Párrafo del capítulo dos' }] },
    ],
    commentGroups: [
      {
        chapterIndex: 0,
        chapterTitle: 'Capítulo uno',
        blocks: [
          {
            blockId: 'block-1',
            blockPreview: 'Texto del bloque con errata',
            threads: [
              {
                root: { id: 'thread-1', blockId: 'block-1', parentId: null, authorId: 'user-2', authorName: 'Editor Uno', authorRole: 'editor', body: 'Revisar este párrafo', status: 'open', resolvedByName: null, resolvedAt: null, createdAt: ISO },
                replies: [],
              },
              {
                root: { id: 'thread-2', blockId: 'block-1', parentId: null, authorId: 'user-2', authorName: 'Editor Uno', authorRole: 'editor', body: 'Ya corregido', status: 'resolved', resolvedByName: 'Autora Principal', resolvedAt: ISO, createdAt: ISO },
                replies: [],
              },
            ],
          },
        ],
      },
    ],
    openThreadCount: 1,
    suggestions: [
      {
        id: 'sug-1', authorId: 'user-2', authorName: 'Editor Uno', authorRole: 'editor', summary: 'Errata del primer párrafo',
        affectedBlockIds: ['block-1'], status: 'pending', decidedByName: null, decidedAt: null, createdAt: ISO, stale: false,
        chapterIndex: 0, chapterTitle: 'Capítulo uno',
        changes: [{ blockId: 'block-1', kind: 'update', before: 'Texto del bloque con errata', after: 'Texto del bloque corregido' }],
      },
    ],
    ...overrides,
  };
}

function renderWorkspace(role: CollaboratorRole, overrides: Partial<CollaborationView> = {}, copy = COPY) {
  return render(<CollaborationWorkspace copy={copy} projectId="proj-1" view={viewFixture(role, overrides)} locale="es" />);
}

describe('CollaborationWorkspace — UI por rol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inviteCollaboratorActionMock.mockResolvedValue({ ok: true, inviteUrl: '/invite/token-1' });
    resolveBlockCommentThreadActionMock.mockResolvedValue({ ok: true });
    decideEditorSuggestionActionMock.mockResolvedValue({ ok: true });
    addBlockCommentActionMock.mockResolvedValue({ ok: true, commentId: 'c-new' });
    replyBlockCommentActionMock.mockResolvedValue({ ok: true, commentId: 'c-reply' });
    proposeEditorSuggestionActionMock.mockResolvedValue({ ok: true, suggestionId: 's-new' });
    revokeCollaboratorActionMock.mockResolvedValue({ ok: true });
    cancelInvitationActionMock.mockResolvedValue({ ok: true });
  });

  test('autor: ve el equipo con propietario, invita, revoca, cancela, resuelve y decide', async () => {
    renderWorkspace('author');
    expect(screen.getByTestId('collaboration-panel')).toHaveAttribute('data-viewer-role', 'author');
    expect(screen.getAllByTestId('collaborator-row')).toHaveLength(2);
    expect(within(screen.getAllByTestId('collaborator-row')[0]).getByText('Autora Principal')).toBeInTheDocument();
    expect(screen.getByTestId('invite-open-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-invitation-button')).toBeInTheDocument();
    expect(screen.getByTestId('resolve-thread-button')).toBeInTheDocument();
    expect(screen.getByTestId('decision-queue')).toHaveTextContent('Pendientes de tu decisión');
    expect(screen.getByTestId('open-threads-badge')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('member-menu-button'));
    fireEvent.click(screen.getByTestId('revoke-button'));
    await waitFor(() => expect(revokeCollaboratorActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', collaboratorId: 'col-1' }));
    await waitFor(() => expect(screen.getByTestId('cancel-invitation-button')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('cancel-invitation-button'));
    await waitFor(() => expect(cancelInvitationActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', invitationId: 'inv-1' }));

    fireEvent.click(screen.getByTestId('tab-suggestions'));
    expect(screen.getByTestId('suggestion-accept-button')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-reject-button')).toBeInTheDocument();
  });

  test('corrector: comenta, responde y propone; no ve gestión de equipo ni resolver ni decidir', async () => {
    renderWorkspace('editor');
    expect(screen.queryByTestId('invite-open-button')).toBeNull();
    expect(screen.queryByTestId('member-menu-button')).toBeNull();
    expect(screen.queryByTestId('cancel-invitation-button')).toBeNull();
    expect(screen.queryByTestId('invitations-section')).toBeNull();
    expect(screen.queryByTestId('resolve-thread-button')).toBeNull();
    expect(screen.queryByTestId('decision-queue')).toBeNull();
    expect(screen.getByTestId('reply-input')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Segundo párrafo sin comentarios' })[0]);
    expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    expect(screen.getByTestId('propose-open-button')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-suggestions'));
    expect(screen.queryByTestId('suggestion-accept-button')).toBeNull();
    expect(screen.queryByTestId('suggestion-reject-button')).toBeNull();
    expect(screen.getByTestId('suggestion-status-pending')).toBeInTheDocument();
  });

  test('maquetador: solo comentarios y respuestas', () => {
    renderWorkspace('designer');
    expect(screen.queryByTestId('invite-open-button')).toBeNull();
    expect(screen.queryByTestId('resolve-thread-button')).toBeNull();
    expect(screen.getByTestId('reply-input')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Segundo párrafo sin comentarios' })[0]);
    expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    expect(screen.queryByTestId('propose-open-button')).toBeNull();
    fireEvent.click(screen.getByTestId('tab-suggestions'));
    expect(screen.queryByTestId('suggestion-accept-button')).toBeNull();
  });

  test('abrir un hilo nuevo en un bloque sin comentarios usa el id de bloque del AST', async () => {
    renderWorkspace('author');
    fireEvent.click(screen.getAllByRole('button', { name: 'Segundo párrafo sin comentarios' })[0]);
    fireEvent.change(screen.getByTestId('comment-input'), { target: { value: 'Nuevo comentario' } });
    fireEvent.click(screen.getByTestId('comment-submit'));
    await waitFor(() => expect(addBlockCommentActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', blockId: 'block-2', body: 'Nuevo comentario' }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  test('responder y resolver llaman a las acciones server-side', async () => {
    renderWorkspace('author');
    fireEvent.change(screen.getByTestId('reply-input'), { target: { value: 'Gracias' } });
    fireEvent.click(screen.getByTestId('reply-submit'));
    await waitFor(() => expect(replyBlockCommentActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', threadRootId: 'thread-1', body: 'Gracias' }));
    // Controls stay disabled while the previous write and the refresh are in flight.
    await waitFor(() => expect(screen.getByTestId('resolve-thread-button')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('resolve-thread-button'));
    await waitFor(() => expect(resolveBlockCommentThreadActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', threadRootId: 'thread-1' }));
  });

  test('aceptar y rechazar sugerencias llaman a la acción con la decisión correcta', async () => {
    renderWorkspace('author');
    fireEvent.click(screen.getByTestId('tab-suggestions'));
    expect(screen.getByTestId('diff-before')).toHaveTextContent('Texto del bloque con errata');
    expect(screen.getByTestId('diff-after')).toHaveTextContent('Texto del bloque corregido');
    fireEvent.click(screen.getByTestId('suggestion-accept-button'));
    await waitFor(() => expect(decideEditorSuggestionActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', suggestionId: 'sug-1', decision: 'accept' }));
    await waitFor(() => expect(screen.getByTestId('suggestion-reject-button')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('suggestion-reject-button'));
    await waitFor(() => expect(decideEditorSuggestionActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', suggestionId: 'sug-1', decision: 'reject' }));
  });

  test('una sugerencia obsoleta avisa y no permite aceptar', () => {
    renderWorkspace('author', {
      suggestions: [{ ...viewFixture('author').suggestions[0], stale: true }],
    });
    fireEvent.click(screen.getByTestId('tab-suggestions'));
    expect(screen.getByTestId('suggestion-stale')).toHaveTextContent('El contenido ha cambiado');
    expect(screen.getByTestId('suggestion-accept-button')).toBeDisabled();
    expect(screen.getByTestId('suggestion-reject-button')).not.toBeDisabled();
  });

  test('el corrector propone una corrección sobre el bloque seleccionado', async () => {
    renderWorkspace('editor');
    fireEvent.click(screen.getAllByRole('button', { name: 'Segundo párrafo sin comentarios' })[0]);
    fireEvent.click(screen.getByTestId('propose-open-button'));
    fireEvent.change(screen.getByTestId('propose-summary-input'), { target: { value: 'Mejor redacción' } });
    fireEvent.change(screen.getByTestId('propose-text-input'), { target: { value: 'Segundo párrafo corregido' } });
    fireEvent.click(screen.getByTestId('propose-submit'));
    await waitFor(() => expect(proposeEditorSuggestionActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', blockId: 'block-2', summary: 'Mejor redacción', replacementText: 'Segundo párrafo corregido' }));
  });

  test('filtros: abiertos / resueltos / todos y capítulo', () => {
    renderWorkspace('author');
    expect(screen.getAllByTestId('comment-thread')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('filter-resolved'));
    expect(screen.getAllByTestId('comment-thread').map((node) => node.getAttribute('data-status'))).toEqual(['resolved']);
    fireEvent.click(screen.getByTestId('filter-all'));
    expect(screen.getAllByTestId('comment-thread')).toHaveLength(2);
    fireEvent.change(screen.getByTestId('chapter-filter'), { target: { value: '1' } });
    expect(screen.queryAllByTestId('comment-thread')).toHaveLength(0);
    expect(screen.getByTestId('comments-empty')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('chapter-filter'), { target: { value: 'all' } });
    expect(screen.getAllByTestId('comment-thread')).toHaveLength(2);
  });

  test('"Ver en capítulo" selecciona el capítulo y el bloque', () => {
    renderWorkspace('author');
    fireEvent.change(screen.getByTestId('chapter-filter'), { target: { value: 'all' } });
    fireEvent.click(screen.getAllByTestId('view-in-chapter')[0]);
    expect((screen.getByTestId('chapter-filter') as HTMLSelectElement).value).toBe('0');
    expect(screen.getByTestId('selected-block')).toHaveTextContent('Texto del bloque con errata');
  });

  test('diálogo de invitación: valida el correo, invoca la acción y muestra el enlace copiable', async () => {
    renderWorkspace('author');
    fireEvent.click(screen.getByTestId('invite-open-button'));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    fireEvent.change(screen.getByTestId('invite-email-input'), { target: { value: 'no-es-correo' } });
    fireEvent.click(screen.getByTestId('invite-submit'));
    expect(inviteCollaboratorActionMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('correo electrónico válido');

    fireEvent.change(screen.getByTestId('invite-email-input'), { target: { value: 'corrector@example.com' } });
    fireEvent.click(screen.getByTestId('invite-role-designer'));
    fireEvent.click(screen.getByTestId('invite-submit'));
    await waitFor(() => expect(screen.getByTestId('invite-link-box')).toBeInTheDocument());
    expect(inviteCollaboratorActionMock).toHaveBeenCalledWith({ projectId: 'proj-1', email: 'corrector@example.com', role: 'designer' });
    expect((screen.getByTestId('invite-url-input') as HTMLInputElement).value).toContain('/invite/token-1');
  });

  test('diálogo: Escape lo cierra y el foco vuelve al botón que lo abrió', async () => {
    renderWorkspace('author');
    const opener = screen.getByTestId('invite-open-button');
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('invite-email-input')).toHaveFocus();
    await act(async () => { fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  test('estados vacíos: sin equipo, sin comentarios, sin sugerencias', () => {
    renderWorkspace('author', { collaborators: [], invitations: [], commentGroups: [], suggestions: [], openThreadCount: 0 });
    expect(screen.getByTestId('team-empty')).toHaveTextContent('Trabajas solo en este proyecto.');
    expect(screen.getByTestId('invite-open-empty')).toBeInTheDocument();
    expect(screen.getByTestId('comments-empty')).toHaveTextContent('No hay comentarios abiertos.');
    expect(screen.queryByTestId('invitations-section')).toBeNull();
    fireEvent.click(screen.getByTestId('tab-suggestions'));
    expect(screen.getByTestId('suggestions-empty')).toHaveTextContent('No hay sugerencias pendientes.');
  });

  test('PDF de diseño fijo: sin anclas de bloque, el equipo sigue disponible', () => {
    renderWorkspace('author', { blockAnchoring: false, outline: [], commentGroups: [], suggestions: [] });
    expect(screen.getAllByTestId('fixed-pdf-notice-reader').length + screen.getAllByTestId('fixed-pdf-notice').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('chapter-reader')).toBeNull();
    expect(screen.getByTestId('invite-open-button')).toBeInTheDocument();
  });

  test('los errores de las acciones se muestran localizados', async () => {
    resolveBlockCommentThreadActionMock.mockResolvedValue({ ok: false, error: 'forbidden' });
    renderWorkspace('author');
    fireEvent.click(screen.getByTestId('resolve-thread-button'));
    await waitFor(() => expect(screen.getByTestId('collaboration-error').textContent).toBe(COPY.errors.forbidden));
  });

  test('pestañas accesibles: tablist, aria-selected y flechas', () => {
    renderWorkspace('author');
    const tabs = screen.getByRole('tablist');
    expect(within(tabs).getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByTestId('tab-comments')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByTestId('tab-comments'), { key: 'ArrowRight' });
    expect(screen.getByTestId('tab-suggestions')).toHaveAttribute('aria-selected', 'true');
  });

  test('textos en inglés', () => {
    renderWorkspace('author', {}, COPY_EN);
    expect(screen.getByTestId('invite-open-button')).toHaveTextContent('Invite collaborator');
    expect(screen.getByTestId('tab-suggestions')).toHaveTextContent('Suggestions');
    expect(screen.getByTestId('filter-resolved')).toHaveTextContent('Resolved');
  });
});
