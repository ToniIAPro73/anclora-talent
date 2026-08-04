import { describe, expect, it } from 'vitest';
import { resolveDocumentRules } from '@/lib/compose/rules';
import { PRODUCT_TEMPLATES, getProductTemplate } from '@/lib/templates/product-templates';
import { createProjectRecord } from './factories';

describe('createProjectRecord — product templates (F2)', () => {
  it('seeds chapters and rules from every template', () => {
    for (const template of PRODUCT_TEMPLATES) {
      const project = createProjectRecord('user-1', { title: 'Producto', templateId: template.id });

      expect(project.document.chapters.map((chapter) => chapter.title)).toEqual(
        template.chapters.map((chapter) => chapter.title),
      );
      expect(project.document.rules).toEqual(resolveDocumentRules(template.rules));

      for (const chapter of project.document.chapters) {
        expect(chapter.blocks[0].type).toBe('heading');
        expect(chapter.blocks[0].content).toBe(chapter.title);
      }
    }
  });

  it('applies template-specific rules (standard-book vs technical-manual)', () => {
    const book = createProjectRecord('user-1', { title: 'Libro', templateId: 'standard-book' });
    expect(book.document.rules?.chapterStartsOnOddPage).toBe(true);

    const manual = createProjectRecord('user-1', { title: 'Manual', templateId: 'technical-manual' });
    expect(manual.document.rules?.chapterStartsOnOddPage).toBe(false);
    expect(manual.document.rules?.keepTogether.code).toBe(true);
    expect(manual.document.rules?.keepTogether.list.maxItems).toBe(8);
  });

  it('keeps the default seed when the template id is missing or unknown', () => {
    const withoutTemplate = createProjectRecord('user-1', { title: 'Libro' });
    const unknown = createProjectRecord('user-1', { title: 'Libro', templateId: 'nope' });

    for (const project of [withoutTemplate, unknown]) {
      expect(project.document.chapters).toHaveLength(1);
      expect(project.document.chapters[0].title).toBe('Capítulo 1');
      expect(project.document.rules ?? null).toBeNull();
    }
  });

  it('imported content wins over the template seed', () => {
    const project = createProjectRecord('user-1', {
      title: 'Importado',
      templateId: 'standard-book',
      importedDocument: {
        title: 'Doc importado',
        subtitle: '',
        author: '',
        chapterTitle: 'Capítulo importado',
        blocks: [{ type: 'heading', content: 'Capítulo importado' }],
        sourceFileName: 'doc.md',
        sourceMimeType: 'text/markdown',
      },
    });

    expect(project.document.chapters.map((chapter) => chapter.title)).not.toEqual(
      getProductTemplate('standard-book')?.chapters.map((chapter) => chapter.title),
    );
    expect(project.document.rules ?? null).toBeNull();
  });
});
