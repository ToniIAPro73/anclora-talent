import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { requireUserIdMock, hasDatabaseMock, getProjectByIdMock, saveDocumentExtrasMock } =
  vi.hoisted(() => ({
    requireUserIdMock: vi.fn(),
    hasDatabaseMock: vi.fn(() => true),
    getProjectByIdMock: vi.fn(),
    saveDocumentExtrasMock: vi.fn(),
  }));

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
  requireUser: vi.fn(),
}));

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getProjectById: getProjectByIdMock,
    saveDocumentExtras: saveDocumentExtrasMock,
  },
}));

const { adapterDocumentState } = vi.hoisted(() => ({
  adapterDocumentState: { current: null as import('@/lib/document/model').SemanticDocument | null },
}));

vi.mock('@/lib/compose/preview-adapter', () => ({
  projectToSemanticDocument: () => ({ document: adapterDocumentState.current }),
}));

import { editorSuggestions, projects, projectCollaborators } from '@/lib/db/schema';
import type { SemanticDocument } from '@/lib/document/model';
import { buildTextReplacementSuggestion } from './suggestions';

interface Seed {
  projects?: Array<{ userId: string }>;
  collaborators?: Array<{ projectId: string; userId: string; role: string }>;
  suggestions?: Array<Record<string, unknown>>;
}

/** Same fake-drizzle approach as comment-actions.test.ts (table-seeded rows). */
function fakeDb(seed: Seed = {}) {
  const tables = new Map<unknown, unknown[]>([
    [projects, [...(seed.projects ?? [])]],
    [projectCollaborators, [...(seed.collaborators ?? [])]],
    [editorSuggestions, [...(seed.suggestions ?? [])]],
  ]);
  const insertedInto: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updated: Array<{ table: unknown; patch: Record<string, unknown> }> = [];
  const rowsOf = (table: unknown) => tables.get(table) ?? [];

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => rowsOf(table).slice(0, 1),
          orderBy: async () => rowsOf(table),
          then: (resolve: (value: unknown) => void) => resolve(rowsOf(table)),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        insertedInto.push({ table, values });
        rowsOf(table).push(values);
        return {
          returning: async () => [values],
          then: (resolve: (value: unknown) => void) => resolve(undefined),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => ({
        where: async () => {
          updated.push({ table, patch });
        },
      }),
    }),
    delete: () => ({
      where: async () => undefined,
    }),
  };

  return { db, insertedInto, updated, rowsOf };
}

const { dbState } = vi.hoisted(() => ({
  dbState: { current: null as ReturnType<typeof fakeDb> | null },
}));

vi.mock('@/lib/db', () => ({
  hasDatabase: hasDatabaseMock,
  getDb: () => dbState.current?.db,
}));

import { decideEditorSuggestionAction, proposeEditorSuggestionAction } from './suggestion-actions';

function documentFixture(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Libro' },
    blocks: [
      { id: 'p-1', type: 'paragraph', content: [{ type: 'text', text: 'Texto con errata' }] },
    ],
  };
}

function suggestionFixture(overrides: Record<string, unknown> = {}) {
  const built = buildTextReplacementSuggestion(documentFixture(), {
    blockId: 'p-1',
    replacementText: 'Texto corregido',
  });
  if ('error' in built) throw new Error('fixture must build');
  return {
    id: 'sug-1',
    projectId: 'p',
    authorId: 'editor-1',
    summary: 'Errata del primer párrafo',
    operations: JSON.parse(JSON.stringify(built.operations)),
    diff: JSON.parse(JSON.stringify(built.diff)),
    status: 'pending',
    ...overrides,
  };
}

const OWNER_PROJECT: Seed = {
  projects: [{ userId: 'owner-1' }],
  collaborators: [
    { projectId: 'p', userId: 'editor-1', role: 'editor' },
    { projectId: 'p', userId: 'designer-1', role: 'designer' },
  ],
};

describe('editor suggestion actions — propose (editor) / decide (author)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasDatabaseMock.mockReturnValue(true);
    requireUserIdMock.mockResolvedValue('editor-1');
    dbState.current = fakeDb(OWNER_PROJECT);
    adapterDocumentState.current = documentFixture();
    getProjectByIdMock.mockResolvedValue({ document: { provenance: {} } });
  });

  test('the editor proposes; the server rebuilds the patch from the document', async () => {
    const result = await proposeEditorSuggestionAction({
      projectId: 'p',
      blockId: 'p-1',
      replacementText: 'Texto corregido',
      summary: 'Errata del primer párrafo',
    });

    expect(result.ok).toBe(true);
    expect(getProjectByIdMock).toHaveBeenCalledWith('owner-1', 'p');
    const inserted = dbState.current?.insertedInto[0];
    expect(inserted?.table).toBe(editorSuggestions);
    expect(inserted?.values).toMatchObject({ projectId: 'p', authorId: 'editor-1' });
    expect((inserted?.values.operations as unknown[]).length).toBe(1);
  });

  test('the designer cannot propose corrections (matrix: comment only + design)', async () => {
    requireUserIdMock.mockResolvedValue('designer-1');
    dbState.current = fakeDb({
      projects: [{ userId: 'owner-1' }],
      collaborators: [{ projectId: 'p', userId: 'designer-1', role: 'designer' }],
    });
    expect(
      await proposeEditorSuggestionAction({
        projectId: 'p',
        blockId: 'p-1',
        replacementText: 'x',
        summary: 's',
      }),
    ).toEqual({ ok: false, error: 'forbidden' });
    expect(dbState.current?.insertedInto).toHaveLength(0);
  });

  test('a suggestion over a missing block resolves to notFound', async () => {
    expect(
      await proposeEditorSuggestionAction({
        projectId: 'p',
        blockId: 'ghost',
        replacementText: 'x',
        summary: 's',
      }),
    ).toEqual({ ok: false, error: 'notFound' });
  });

  test('only the author decides; editor and designer are forbidden', async () => {
    dbState.current = fakeDb({ ...OWNER_PROJECT, suggestions: [suggestionFixture()] });

    requireUserIdMock.mockResolvedValue('editor-1');
    expect(
      await decideEditorSuggestionAction({ projectId: 'p', suggestionId: 'sug-1', decision: 'accept' }),
    ).toEqual({ ok: false, error: 'forbidden' });

    requireUserIdMock.mockResolvedValue('designer-1');
    expect(
      await decideEditorSuggestionAction({ projectId: 'p', suggestionId: 'sug-1', decision: 'reject' }),
    ).toEqual({ ok: false, error: 'forbidden' });

    expect(saveDocumentExtrasMock).not.toHaveBeenCalled();
  });

  test('accept applies the patch through the regular save route, provenance human', async () => {
    dbState.current = fakeDb({ ...OWNER_PROJECT, suggestions: [suggestionFixture()] });
    requireUserIdMock.mockResolvedValue('owner-1');

    const result = await decideEditorSuggestionAction({
      projectId: 'p',
      suggestionId: 'sug-1',
      decision: 'accept',
    });

    expect(result).toEqual({ ok: true });
    expect(saveDocumentExtrasMock).toHaveBeenCalledTimes(1);
    const [, projectId, extras] = saveDocumentExtrasMock.mock.calls[0] as [
      string,
      string,
      { documentModel: SemanticDocument; provenance: Record<string, string> },
    ];
    expect(projectId).toBe('p');
    expect(extras.documentModel.blocks[0]).toMatchObject({
      id: 'p-1',
      content: [{ type: 'text', text: 'Texto corregido' }],
    });
    expect(extras.provenance).toEqual({ 'p-1': 'human' });
    expect(dbState.current?.updated[0]).toMatchObject({
      table: editorSuggestions,
      patch: expect.objectContaining({ status: 'accepted', decidedBy: 'owner-1' }),
    });
  });

  test('reject marks the decision without touching the document', async () => {
    dbState.current = fakeDb({ ...OWNER_PROJECT, suggestions: [suggestionFixture()] });
    requireUserIdMock.mockResolvedValue('owner-1');

    expect(
      await decideEditorSuggestionAction({ projectId: 'p', suggestionId: 'sug-1', decision: 'reject' }),
    ).toEqual({ ok: true });
    expect(saveDocumentExtrasMock).not.toHaveBeenCalled();
    expect(dbState.current?.updated[0]).toMatchObject({
      table: editorSuggestions,
      patch: expect.objectContaining({ status: 'rejected' }),
    });
  });

  test('a stale patch (block edited away) is rejected and never writes', async () => {
    dbState.current = fakeDb({ ...OWNER_PROJECT, suggestions: [suggestionFixture()] });
    requireUserIdMock.mockResolvedValue('owner-1');
    adapterDocumentState.current = { ...documentFixture(), blocks: [] };

    expect(
      await decideEditorSuggestionAction({ projectId: 'p', suggestionId: 'sug-1', decision: 'accept' }),
    ).toEqual({ ok: false, error: 'stale' });
    expect(saveDocumentExtrasMock).not.toHaveBeenCalled();
  });

  test('an already-decided suggestion cannot be decided again', async () => {
    dbState.current = fakeDb({
      ...OWNER_PROJECT,
      suggestions: [suggestionFixture({ status: 'accepted' })],
    });
    requireUserIdMock.mockResolvedValue('owner-1');

    expect(
      await decideEditorSuggestionAction({ projectId: 'p', suggestionId: 'sug-1', decision: 'reject' }),
    ).toEqual({ ok: false, error: 'notFound' });
  });
});
