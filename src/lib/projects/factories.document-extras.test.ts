import { describe, expect, it } from 'vitest';
import { resolveDocumentRules } from '@/lib/compose/rules';
import { createProjectRecord, updateProjectDocument, updateProjectDocumentExtras } from './factories';

describe('updateProjectDocumentExtras (FASE C persistence)', () => {
  const project = createProjectRecord('user-1', { title: 'Book' });

  it('stores composition rules on the document without touching chapters', () => {
    const rules = resolveDocumentRules({ chapterStartsOnOddPage: true });
    const next = updateProjectDocumentExtras(project, { rules });
    expect(next.document.rules?.chapterStartsOnOddPage).toBe(true);
    expect(next.document.chapters).toEqual(project.document.chapters);
    expect(next.document.title).toBe(project.document.title);
  });

  it('stores the semantic document model and product metadata', () => {
    const documentModel = {
      version: 1 as const,
      metadata: { title: 'Book' },
      blocks: [],
    };
    const metadata = {
      title: 'Book',
      isbn: '978-84-0000000-0-0',
      keywords: ['a', 'b'],
      language: 'es',
    };
    const next = updateProjectDocumentExtras(project, { documentModel, metadata });
    expect(next.document.documentModel).toEqual(documentModel);
    expect(next.document.metadata?.isbn).toBe('978-84-0000000-0-0');
  });

  it('partial updates preserve previously stored extras', () => {
    const withRules = updateProjectDocumentExtras(project, {
      rules: resolveDocumentRules(),
    });
    const withMetadata = updateProjectDocumentExtras(withRules, {
      metadata: { title: 'Book', author: 'Anon' },
    });
    expect(withMetadata.document.rules).not.toBeNull();
    expect(withMetadata.document.metadata?.author).toBe('Anon');
  });

  it('new projects start with null extras (defaults applied at compose time)', () => {
    expect(project.document.rules ?? null).toBeNull();
    expect(project.document.documentModel ?? null).toBeNull();
    expect(project.document.metadata ?? null).toBeNull();
  });
});

describe('updateProjectDocument — metadata mirror (D.3)', () => {
  const base = updateProjectDocumentExtras(createProjectRecord('user-1', { title: 'Book' }), {
    metadata: { title: 'Book', isbn: '978-84-0000000-0-0' },
  });

  function documentSaveInput(project: typeof base, title: string) {
    const chapter = project.document.chapters[0];
    return {
      title,
      subtitle: 'Subtítulo nuevo',
      author: 'Autor nuevo',
      chapterId: chapter?.id ?? '',
      chapterTitle: chapter?.title ?? '',
      blocks: (chapter?.blocks ?? []).map((block) => ({ id: block.id, content: block.content })),
    };
  }

  it('refreshes the mirrored title/subtitle/author on every document save', () => {
    const next = updateProjectDocument(base, documentSaveInput(base, 'Título nuevo'));
    expect(next.document.metadata).toEqual({
      title: 'Título nuevo',
      subtitle: 'Subtítulo nuevo',
      author: 'Autor nuevo',
      isbn: '978-84-0000000-0-0',
    });
  });

  it('leaves a project without metadata untouched', () => {
    const plain = createProjectRecord('user-1', { title: 'Book' });
    const next = updateProjectDocument(plain, documentSaveInput(plain, 'Otro título'));
    expect(next.document.metadata ?? null).toBeNull();
  });
});
