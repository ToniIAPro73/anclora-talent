import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('createProjectAction — fixed-pdf document mode', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function setupMocks() {
    const redirectMock = vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
    const createProject = vi.fn(async (_userId: string, input: unknown) => ({
      id: 'p-1',
      slug: 'p-1',
      importedDocument: (input as { importedDocument: unknown }).importedDocument,
    }));
    const uploadProjectBlob = vi.fn(async () => null);
    const uploadPrivateProjectDocument = vi.fn(async () => ({
      url: 'https://blob.example/random-key/source/1700000000000-el-plan.pdf',
      accessLevel: 'private' as const,
    }));
    const extractImportedDocumentSeed = vi.fn(async () => ({
      title: 'El Plan de Escape de la Mediana Edad',
      subtitle: 'Cómo desatascarte profesionalmente sin dinamitar tu vida',
      author: 'Antonio Ballesteros Alonso',
      chapterTitle: 'Capítulo 1',
      blocks: [{ type: 'heading', content: 'Capítulo 1' }],
      sourceFileName: 'El_Plan_de_Escape_EBOOK.pdf',
      sourceMimeType: 'application/pdf',
    }));

    vi.doMock('server-only', () => ({}));
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
    vi.doMock('next/navigation', () => ({ redirect: redirectMock }));
    vi.doMock('@/lib/auth/guards', () => ({ requireUserId: vi.fn(async () => 'u-1') }));
    vi.doMock('@/lib/db/repositories', () => ({
      projectRepository: {
        createProject,
        saveDocument: vi.fn(),
        saveCover: vi.fn(),
      },
    }));
    vi.doMock('@/lib/blob/client', () => ({ uploadProjectBlob, uploadPrivateProjectDocument }));
    vi.doMock('./import', () => ({ extractImportedDocumentSeed }));

    return { redirectMock, createProject, uploadPrivateProjectDocument, extractImportedDocumentSeed };
  }

  function formWithPdf(documentMode: string) {
    const formData = new FormData();
    formData.append('title', 'El Plan de Escape');
    formData.append('documentMode', documentMode);
    formData.append(
      'sourceDocument',
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'El_Plan_de_Escape_EBOOK.pdf', {
        type: 'application/pdf',
      }),
    );
    return formData;
  }

  test('uploads the PDF privately and passes mode/hash/blobUrl into the seed', async () => {
    const mocks = setupMocks();
    const { createProjectAction } = await import('./actions');

    await expect(createProjectAction(formWithPdf('fixed-pdf'))).rejects.toThrow(
      'NEXT_REDIRECT:/projects/p-1/editor',
    );

    expect(mocks.uploadPrivateProjectDocument).toHaveBeenCalledTimes(1);
    const [, createInput] = mocks.createProject.mock.calls[0] as [string, { importedDocument: Record<string, unknown> }];
    expect(createInput.importedDocument?.mode).toBe('fixed-pdf');
    expect(createInput.importedDocument?.sourceBlobUrl).toBe(
      'https://blob.example/random-key/source/1700000000000-el-plan.pdf',
    );
    expect(createInput.importedDocument?.sourceAccessLevel).toBe('private');
    expect(typeof createInput.importedDocument?.sourceSha256).toBe('string');
    expect((createInput.importedDocument?.sourceSha256 as string).length).toBe(64);
    expect(createInput.importedDocument?.sourceSizeBytes).toBe(4);
  });

  test('regression: documentMode absent never uploads privately, mode stays editable', async () => {
    const mocks = setupMocks();
    const { createProjectAction } = await import('./actions');

    const formData = formWithPdf('fixed-pdf');
    formData.delete('documentMode');

    await expect(createProjectAction(formData)).rejects.toThrow('NEXT_REDIRECT:/projects/p-1/editor');

    expect(mocks.uploadPrivateProjectDocument).not.toHaveBeenCalled();
    const [, createInput] = mocks.createProject.mock.calls[0] as [string, { importedDocument: Record<string, unknown> }];
    expect(createInput.importedDocument?.mode).toBe('editable');
    expect(createInput.importedDocument?.sourceBlobUrl).toBeNull();
  });

  test('falls back to editable when the private upload fails', async () => {
    const mocks = setupMocks();
    mocks.uploadPrivateProjectDocument.mockResolvedValueOnce(null as never);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { createProjectAction } = await import('./actions');

    await expect(createProjectAction(formWithPdf('fixed-pdf'))).rejects.toThrow(
      'NEXT_REDIRECT:/projects/p-1/editor',
    );

    const [, createInput] = mocks.createProject.mock.calls[0] as [string, { importedDocument: Record<string, unknown> }];
    expect(createInput.importedDocument?.mode).toBe('editable');
    expect(createInput.importedDocument?.sourceBlobUrl).toBeNull();
    consoleSpy.mockRestore();
  });
});
