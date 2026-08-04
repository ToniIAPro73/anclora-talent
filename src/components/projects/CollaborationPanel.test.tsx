import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
import { CollaborationPanel } from './CollaborationPanel';

const COPY = resolveLocaleMessages('es').collaboration;
const ISO = '2026-08-04T12:00:00.000Z';

function viewFixture(viewerRole: CollaboratorRole): CollaborationView {
  return {
    viewerRole,
    collaborators: [
      {
        id: 'col-1',
        userId: 'user-2',
        role: 'editor',
        fullName: 'Editor Uno',
        email: 'editor@example.com',
        createdAt: ISO,
      },
    ],
    invitations: [
      { id: 'inv-1', email: 'disenador@example.com', role: 'designer', expiresAt: ISO, createdAt: ISO },
    ],
    commentGroups: [
      {
        chapterIndex: 0,
        chapterTitle: 'Capítulo uno',
        blocks: [
          {
            blockId: 'block-1',
            blockPreview: 'Texto del bloque',
            threads: [
              {
                root: {
                  id: 'thread-1',
                  blockId: 'block-1',
                  parentId: null,
                  authorId: 'user-2',
                  authorName: 'Editor Uno',
                  authorRole: 'editor',
                  body: 'Revisar este párrafo',
                  status: 'open',
                  resolvedByName: null,
                  resolvedAt: null,
                  createdAt: ISO,
                },
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
        id: 'sug-1',
        authorId: 'user-2',
        authorName: 'Editor Uno',
        summary: 'Errata del primer párrafo',
        affectedBlockIds: ['block-1'],
        status: 'pending',
        decidedByName: null,
        decidedAt: null,
        createdAt: ISO,
      },
    ],
  };
}

function renderPanel(role: CollaboratorRole) {
  return render(
    <CollaborationPanel copy={COPY} projectId="proj-1" view={viewFixture(role)} locale="es" />,
  );
}

describe('CollaborationPanel — UI por rol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inviteCollaboratorActionMock.mockResolvedValue({ ok: true, inviteUrl: '/invite/token-1' });
    resolveBlockCommentThreadActionMock.mockResolvedValue({ ok: true });
    decideEditorSuggestionActionMock.mockResolvedValue({ ok: true });
  });

  test('autor: invita, revoca, resuelve hilos y decide sugerencias', () => {
    renderPanel('author');

    expect(screen.getByTestId('collaboration-panel')).toBeTruthy();
    expect(screen.getByTestId('open-threads-badge').textContent).toContain('1');
    expect(screen.getByTestId('invite-form')).toBeTruthy();
    expect(screen.getByTestId('revoke-button')).toBeTruthy();
    expect(screen.getByTestId('cancel-invitation-button')).toBeTruthy();
    expect(screen.getByTestId('resolve-thread-button')).toBeTruthy();
    expect(screen.getByTestId('suggestion-accept-button')).toBeTruthy();
    expect(screen.getByTestId('suggestion-reject-button')).toBeTruthy();
    expect(screen.getAllByTestId('role-badge-editor').length).toBeGreaterThan(0);
  });

  test('corrector: comenta y propone correcciones; nunca invita ni decide', () => {
    renderPanel('editor');

    expect(screen.queryByTestId('invite-form')).toBeNull();
    expect(screen.queryByTestId('revoke-button')).toBeNull();
    expect(screen.queryByTestId('resolve-thread-button')).toBeNull();
    expect(screen.queryByTestId('suggestion-accept-button')).toBeNull();
    expect(screen.getByTestId('comment-input')).toBeTruthy();
    expect(screen.getByTestId('reply-input')).toBeTruthy();
    expect(screen.getByTestId('propose-open-button')).toBeTruthy();
  });

  test('maquetador: solo comenta (ni propuestas ni gestión de equipo)', () => {
    renderPanel('designer');

    expect(screen.queryByTestId('invite-form')).toBeNull();
    expect(screen.queryByTestId('propose-open-button')).toBeNull();
    expect(screen.queryByTestId('resolve-thread-button')).toBeNull();
    expect(screen.queryByTestId('suggestion-accept-button')).toBeNull();
    expect(screen.getByTestId('comment-input')).toBeTruthy();
    expect(screen.getByTestId('reply-input')).toBeTruthy();
  });

  test('invitar genera el enlace copiable (autor)', async () => {
    renderPanel('author');

    fireEvent.change(screen.getByTestId('invite-email-input'), {
      target: { value: 'corrector@example.com' },
    });
    fireEvent.click(screen.getByTestId('invite-submit'));

    await waitFor(() => expect(screen.getByTestId('invite-link-box')).toBeTruthy());
    expect(inviteCollaboratorActionMock).toHaveBeenCalledWith({
      projectId: 'proj-1',
      email: 'corrector@example.com',
      role: 'editor',
    });
  });

  test('resolver un hilo llama a la acción server-side (autor)', async () => {
    renderPanel('author');
    fireEvent.click(screen.getByTestId('resolve-thread-button'));

    await waitFor(() =>
      expect(resolveBlockCommentThreadActionMock).toHaveBeenCalledWith({
        projectId: 'proj-1',
        threadRootId: 'thread-1',
      }),
    );
  });

  test('aceptar una sugerencia llama a la acción con decision=accept (autor)', async () => {
    renderPanel('author');
    fireEvent.click(screen.getByTestId('suggestion-accept-button'));

    await waitFor(() =>
      expect(decideEditorSuggestionActionMock).toHaveBeenCalledWith({
        projectId: 'proj-1',
        suggestionId: 'sug-1',
        decision: 'accept',
      }),
    );
  });

  test('los errores de las acciones se muestran localizados', async () => {
    resolveBlockCommentThreadActionMock.mockResolvedValue({ ok: false, error: 'forbidden' });
    renderPanel('author');
    fireEvent.click(screen.getByTestId('resolve-thread-button'));

    await waitFor(() =>
      expect(screen.getByTestId('collaboration-error').textContent).toBe(COPY.errors.forbidden),
    );
  });
});
