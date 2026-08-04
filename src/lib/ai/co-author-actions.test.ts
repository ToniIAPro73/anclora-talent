import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SemanticDocument } from '@/lib/document/model';
import type { ProjectRecord } from '@/lib/projects/types';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(() => Promise.resolve('user_123')) }));

const getProjectByIdMock = vi.fn();
const getBrandProfileByIdMock = vi.fn();

vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getProjectById: (...args: unknown[]) => getProjectByIdMock(...args),
    saveDocumentExtras: vi.fn(),
  },
}));

vi.mock('@/lib/brand/repository', () => ({
  brandProfileRepository: {
    getBrandProfileById: (...args: unknown[]) => getBrandProfileByIdMock(...args),
  },
}));

import { proposeCoAuthorAction } from './actions';

function fixtureDocument(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      { id: 'h1', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo uno' }] },
      { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Texto del capítulo.' }] },
    ],
  };
}

function fixtureProject(): ProjectRecord {
  return {
    id: 'proj_ca_1',
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
      provenance: null,
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

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OPENAI_API_KEY;
  getProjectByIdMock.mockResolvedValue(fixtureProject());
  getBrandProfileByIdMock.mockResolvedValue(null);
});

describe('proposeCoAuthorAction', () => {
  test('without the cloud flag the operation is unavailable (UI keeps it hidden)', async () => {
    const result = await proposeCoAuthorAction(
      formData({ projectId: 'proj_ca_1', operation: 'style', chapterKey: 'h1' }),
    );

    expect(result.ok).toBe(true);
    expect(result.available).toBe(false);
    expect(result.cloudAvailable).toBe(false);
    expect(result.proposal).toBeNull();
  });

  test('invalid operation fails cleanly', async () => {
    const result = await proposeCoAuthorAction(
      formData({ projectId: 'proj_ca_1', operation: 'nope' }),
    );
    expect(result.ok).toBe(false);
    expect(result.proposal).toBeNull();
  });

  test('unknown project fails cleanly', async () => {
    getProjectByIdMock.mockResolvedValue(null);
    const result = await proposeCoAuthorAction(
      formData({ projectId: 'proj_ca_1', operation: 'summary' }),
    );
    expect(result.ok).toBe(false);
  });

  test('with the cloud flag it returns a cloud-declared proposal and reads the active brand voice', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    getBrandProfileByIdMock.mockResolvedValue({
      status: 'active',
      voicePairs: [{ soundsLike: 'Directo.', doesntSoundLike: 'Ampuloso.' }],
    });
    let capturedBody = '';
    const fetchMock = vi.fn((_: unknown, init?: RequestInit) => {
      capturedBody = String(init?.body ?? '');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    rewrites: [{ blockId: 'p1', text: 'Texto reescrito por la nube.' }],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const project = fixtureProject();
    project.brandProfileId = 'brand-1';
    getProjectByIdMock.mockResolvedValue(project);

    const result = await proposeCoAuthorAction(
      formData({ projectId: 'proj_ca_1', operation: 'style', chapterKey: 'h1', locale: 'es' }),
    );

    expect(result.ok).toBe(true);
    expect(result.available).toBe(true);
    expect(result.mode).toBe('cloud');
    expect(result.cloudAvailable).toBe(true);
    expect(result.proposal).not.toBeNull();
    expect(result.proposal!.kind).toBe('style-rewrite');
    expect(result.proposal!.operations).toHaveLength(1);
    // Active profile voice pairs reached the prompt as few-shot examples.
    expect(capturedBody).toContain('Directo.');
    expect(capturedBody).toContain('Ampuloso.');

    vi.unstubAllGlobals();
  });
});
