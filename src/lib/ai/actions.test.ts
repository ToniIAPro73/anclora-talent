import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SemanticDocument } from '@/lib/document/model';
import type { ProjectRecord } from '@/lib/projects/types';
import { createProposal, type AiProposal, type ProposalIdentity } from './ast-diff-proposal';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

const getProjectByIdMock = vi.fn();
const saveDocumentExtrasMock = vi.fn();

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getProjectById: (...args: unknown[]) => getProjectByIdMock(...args),
    saveDocumentExtras: (...args: unknown[]) => saveDocumentExtrasMock(...args),
  },
}));

import {
  acceptAiProposalAction,
  analyzeCoherenceAction,
  proposeViolationFixAction,
  rejectAiProposalAction,
} from './actions';

const IDENTITY: ProposalIdentity = { id: 'ai-act-1', createdAt: '2026-01-01T00:00:00.000Z' };

function fixtureDocument(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      { id: 'h1', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo' }] },
      { id: 'h2', type: 'heading', level: 3, content: [{ type: 'text', text: 'Salto' }] },
      {
        id: 'p1',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Ver la ' },
          { type: 'ref', refKind: 'figure', targetId: 'fig-gone', fallback: 'figura 1' },
        ],
      },
    ],
  };
}

function fixtureProject(): ProjectRecord {
  return {
    id: 'proj_1',
    userId: 'user_123',
    workspaceId: null,
    slug: 'book',
    title: 'Book',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'doc_1',
      title: 'Book',
      subtitle: '',
      author: 'Anon',
      language: 'es',
      chapters: [],
      rules: null,
      documentModel: fixtureDocument(),
      provenance: { h1: 'human' },
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

function formData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => fd.append(key, value));
  return fd;
}

function headingJumpProposal(): AiProposal {
  const document = fixtureDocument();
  const heading = document.blocks[1];
  return createProposal(
    {
      kind: 'heading-level',
      summary: 'Corregir jerarquía',
      operations: [
        {
          type: 'update',
          blockId: 'h2',
          before: heading,
          after: { ...heading, level: 2 } as typeof heading,
        },
      ],
    },
    document,
    IDENTITY,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectByIdMock.mockResolvedValue(fixtureProject());
  saveDocumentExtrasMock.mockResolvedValue(undefined);
});

describe('proposeViolationFixAction', () => {
  test('returns heuristic proposals for a preflight heading jump (local mode, no key)', async () => {
    const result = await proposeViolationFixAction(
      formData({
        projectId: 'proj_1',
        locale: 'es',
        payload: JSON.stringify({
          check: {
            channel: 'kobo',
            severity: 'warning',
            rule: 'kobo.a11y.headingJump',
            params: { from: '1', to: '3' },
            blockId: 'h2',
          },
        }),
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.mode).toBe('local');
    expect(result.cloudAvailable).toBe(false);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].kind).toBe('heading-level');
    expect(result.proposals[0].provenance).toBe('ai');
  });

  test('fails cleanly with an invalid payload', async () => {
    const result = await proposeViolationFixAction(formData({ projectId: 'proj_1', payload: '{}' }));
    expect(result.ok).toBe(false);
    expect(result.proposals).toEqual([]);
  });
});

describe('acceptAiProposalAction', () => {
  test('applies the proposal via the existing save route and stamps ai provenance', async () => {
    const result = await acceptAiProposalAction(
      formData({ projectId: 'proj_1', proposal: JSON.stringify(headingJumpProposal()) }),
    );

    expect(result).toEqual({ ok: true });
    expect(saveDocumentExtrasMock).toHaveBeenCalledTimes(1);
    const [userId, projectId, input] = saveDocumentExtrasMock.mock.calls[0] as [
      string,
      string,
      { documentModel: SemanticDocument; provenance: Record<string, string> },
    ];
    expect(userId).toBe('user_123');
    expect(projectId).toBe('proj_1');
    const edited = input.documentModel;
    expect((edited.blocks[1] as { level: number }).level).toBe(2);
    // Touched block stamped 'ai'; untouched keeps its recorded origin.
    expect(input.provenance.h2).toBe('ai');
    expect(input.provenance.h1).toBe('human');
  });

  test('rejects a stale proposal without writing anything', async () => {
    const stale = headingJumpProposal();
    stale.operations = [
      {
        type: 'update',
        blockId: 'gone',
        before: fixtureDocument().blocks[0],
        after: fixtureDocument().blocks[0],
      },
    ];

    const result = await acceptAiProposalAction(
      formData({ projectId: 'proj_1', proposal: JSON.stringify(stale) }),
    );

    expect(result).toEqual({ ok: false, error: 'stale' });
    expect(saveDocumentExtrasMock).not.toHaveBeenCalled();
  });

  test('rejects payloads that are not ai proposals', async () => {
    const result = await acceptAiProposalAction(formData({ projectId: 'proj_1', proposal: '{}' }));
    expect(result.ok).toBe(false);
    expect(saveDocumentExtrasMock).not.toHaveBeenCalled();
  });
});

describe('analyzeCoherenceAction / rejectAiProposalAction', () => {
  test('detects the broken ref and proposes the plain-text fix', async () => {
    const result = await analyzeCoherenceAction(formData({ projectId: 'proj_1', locale: 'es' }));

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([{ type: 'broken-ref', blockId: 'p1', targetId: 'fig-gone' }]);
    expect(result.proposals.some((proposal) => proposal.kind === 'broken-ref')).toBe(true);
  });

  test('reject discards the proposal without touching the document', async () => {
    const result = await rejectAiProposalAction(formData({ projectId: 'proj_1', proposalId: 'ai-act-1' }));
    expect(result.ok).toBe(true);
    expect(saveDocumentExtrasMock).not.toHaveBeenCalled();
  });
});
