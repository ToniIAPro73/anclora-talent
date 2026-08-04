/**
 * Exit-criteria test (F3, Capa 2): full pipeline "rewrite a chapter to make
 * it ~2 pages shorter while keeping the ideas" with an injected FAKE
 * provider that returns valid rewrites:
 *
 *   propose (fake provider) → AiProposal with diff → accept → the document
 *   changes through the EXISTING save route (projectRepository
 *   .saveDocumentExtras) → provenance marks the rewritten blocks as `ai` →
 *   the operations registry records the accepted operation → the KDP
 *   disclosure reflects it.
 *
 * The reject path must leave the document and the registry untouched.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ParagraphBlock, SemanticDocument } from '@/lib/document/model';
import type { ProjectRecord } from '@/lib/projects/types';
import type { ProvenanceMap } from './provenance';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

// Stateful fake repository: saveDocumentExtras persists like the real route.
let storedProject: ProjectRecord;
const getProjectByIdMock = vi.fn(() => Promise.resolve(storedProject));
const saveDocumentExtrasMock = vi.fn(
  (_userId: string, _projectId: string, input: { documentModel?: SemanticDocument; provenance?: ProvenanceMap }) => {
    storedProject = {
      ...storedProject,
      document: {
        ...storedProject.document,
        documentModel: input.documentModel ?? storedProject.document.documentModel,
        provenance: input.provenance ?? storedProject.document.provenance,
      },
    };
    return Promise.resolve(storedProject);
  },
);

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getProjectById: () => getProjectByIdMock(),
    saveDocumentExtras: (userId: string, projectId: string, input: { documentModel?: SemanticDocument; provenance?: ProvenanceMap }) =>
      saveDocumentExtrasMock(userId, projectId, input),
  },
}));

import { acceptAiProposalAction, rejectAiProposalAction } from './actions';
import { proposeStyleRewrite } from './co-author';
import { buildKdpDisclosure } from './kdp-disclosure';
import { aiOperationsLog } from './operations-log';
import type { AiProvider } from './provider';

const PROJECT_ID = 'proj-pipeline-1';

const LONG =
  'Esta es una versión extremadamente larga y repleta de circunloquios de la misma idea, redactada con palabras innecesarias que solo ocupan espacio en la página sin aportar nada nuevo al lector.';

function fixtureDocument(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      { id: 'h1', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo uno' }] },
      { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: `${LONG} Idea uno.` }] },
      { id: 'p2', type: 'paragraph', content: [{ type: 'text', text: `${LONG} Idea dos.` }] },
      { id: 'h2', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo dos' }] },
      { id: 'p3', type: 'paragraph', content: [{ type: 'text', text: 'Contenido del segundo capítulo.' }] },
    ],
  };
}

function fixtureProject(): ProjectRecord {
  return {
    id: PROJECT_ID,
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
      // Human-authored baseline: every block stamped human (as a human save does).
      provenance: { h1: 'human', p1: 'human', p2: 'human', h2: 'human', p3: 'human' },
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

/** Fake provider: valid, shorter rewrites that keep the ideas. */
function shorteningProvider(): AiProvider {
  return {
    kind: 'openai',
    completeJson: () =>
      Promise.resolve({
        rewrites: [
          { blockId: 'p1', text: 'Idea uno, dicha en una frase.' },
          { blockId: 'p2', text: 'Idea dos, igual de breve.' },
        ],
      }),
  };
}

function formData(data: Record<string, string>) {
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => fd.append(key, value));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  storedProject = fixtureProject();
  // Isolate the global in-memory operations store between tests.
  globalThis.__ancloraAiOperationsStore = new Map();
});

describe('exit criteria: chapter-shortening pipeline with a fake provider', () => {
  test('accept: document changes via the existing route, ai provenance, registry and disclosure', async () => {
    // 1. Propose with the fake provider (cloud-declared).
    const result = await proposeStyleRewrite(
      { document: storedProject.document.documentModel!, chapterKey: 'h1', locale: 'es' },
      shorteningProvider(),
    );
    expect(result.mode).toBe('cloud');
    expect(result.proposal).not.toBeNull();
    const proposal = result.proposal!;
    expect(proposal.kind).toBe('style-rewrite');
    expect(proposal.diff.chapters.some((chapter) => chapter.changes.length > 0)).toBe(true);

    // 2. Accept through the existing server action (same route as Capa 1).
    const accept = await acceptAiProposalAction(
      formData({ projectId: PROJECT_ID, proposal: JSON.stringify(proposal), mode: 'cloud' }),
    );
    expect(accept).toEqual({ ok: true });

    // 3. The document changed through the existing save route.
    expect(saveDocumentExtrasMock).toHaveBeenCalledTimes(1);
    const edited = storedProject.document.documentModel!;
    const p1 = edited.blocks.find((block) => block.id === 'p1') as ParagraphBlock;
    expect(p1.content).toEqual([{ type: 'text', text: 'Idea uno, dicha en una frase.' }]);
    // Untouched blocks keep their content.
    const p3 = edited.blocks.find((block) => block.id === 'p3') as ParagraphBlock;
    expect(p3.content).toEqual([{ type: 'text', text: 'Contenido del segundo capítulo.' }]);

    // 4. Provenance: rewritten blocks stamped ai, untouched stamped human.
    const provenance = storedProject.document.provenance!;
    expect(provenance.p1).toBe('ai');
    expect(provenance.p2).toBe('ai');
    expect(provenance.h1).toBe('human');
    expect(provenance.p3).toBe('human');

    // 5. The operations registry recorded the accepted operation (cloud).
    const records = await aiOperationsLog.list('user_123', PROJECT_ID);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      proposalId: proposal.id,
      kind: 'style-rewrite',
      mode: 'cloud',
    });

    // 6. The KDP disclosure reflects the operation.
    const disclosure = buildKdpDisclosure({ provenance, operations: records, locale: 'es' });
    expect(disclosure.required).toBe(true);
    expect(disclosure.text).toContain('asistencia de IA');
    expect(disclosure.text).toContain('reescritura de estilo');
  });

  test('reject: document and registry stay untouched', async () => {
    const result = await proposeStyleRewrite(
      { document: storedProject.document.documentModel!, chapterKey: 'h1', locale: 'es' },
      shorteningProvider(),
    );
    const proposal = result.proposal!;

    const reject = await rejectAiProposalAction(
      formData({ projectId: PROJECT_ID, proposalId: proposal.id }),
    );
    expect(reject.ok).toBe(true);

    // Document intact: no write through the save route.
    expect(saveDocumentExtrasMock).not.toHaveBeenCalled();
    expect(storedProject.document.documentModel).toEqual(fixtureDocument());
    expect(storedProject.document.provenance).toEqual({
      h1: 'human',
      p1: 'human',
      p2: 'human',
      h2: 'human',
      p3: 'human',
    });

    // Registry untouched: disclosure stays exempt.
    const records = await aiOperationsLog.list('user_123', PROJECT_ID);
    expect(records).toEqual([]);
    const disclosure = buildKdpDisclosure({
      provenance: storedProject.document.provenance,
      operations: records,
      locale: 'es',
    });
    expect(disclosure.required).toBe(false);
  });
});
